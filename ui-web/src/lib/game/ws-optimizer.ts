/**
 * WebSocket Connection Optimizer
 * Sprint 4 - Performance & Network
 * 
 * Based on Alex's Technical QA feedback:
 * - Exponential backoff reconnection
 * - Message batching to reduce overhead
 * - Connection health monitoring
 * - Graceful degradation
 */

export interface ReconnectionConfig {
    initialDelay: number;      // Starting delay in ms
    maxDelay: number;          // Maximum delay in ms
    maxAttempts: number;       // Max reconnection attempts
    backoffMultiplier: number; // Exponential backoff factor
}

export interface BatchConfig {
    enabled: boolean;
    maxBatchSize: number;      // Max messages per batch
    batchInterval: number;     // ms between batch sends
}

const DEFAULT_RECONNECT_CONFIG: ReconnectionConfig = {
    initialDelay: 1000,
    maxDelay: 30000,
    maxAttempts: 10,
    backoffMultiplier: 1.5
};

const DEFAULT_BATCH_CONFIG: BatchConfig = {
    enabled: true,
    maxBatchSize: 10,
    batchInterval: 50  // 50ms batching window
};

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

export interface ConnectionStats {
    state: ConnectionState;
    latency: number;
    reconnectAttempts: number;
    messagesSent: number;
    messagesReceived: number;
    bytesReceived: number;
    lastPingTime: number;
}

/**
 * Enhanced WebSocket manager with reconnection and batching
 */
export class WebSocketOptimizer {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectConfig: ReconnectionConfig;
    private batchConfig: BatchConfig;
    
    private state: ConnectionState = 'disconnected';
    private reconnectAttempt = 0;
    private reconnectTimeout: number | null = null;
    
    private messageQueue: any[] = [];
    private batchTimeout: number | null = null;
    
    private stats: ConnectionStats = {
        state: 'disconnected',
        latency: 0,
        reconnectAttempts: 0,
        messagesSent: 0,
        messagesReceived: 0,
        bytesReceived: 0,
        lastPingTime: 0
    };
    
    private pingInterval: number | null = null;
    private lastPongTime = 0;
    
    // Event handlers
    private onMessage?: (data: any) => void;
    private onStateChange?: (state: ConnectionState) => void;
    private onError?: (error: Event) => void;

    constructor(
        url: string,
        reconnectConfig: Partial<ReconnectionConfig> = {},
        batchConfig: Partial<BatchConfig> = {}
    ) {
        this.url = url;
        this.reconnectConfig = { ...DEFAULT_RECONNECT_CONFIG, ...reconnectConfig };
        this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...batchConfig };
    }

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.setState('connecting');
            
            try {
                this.ws = new WebSocket(this.url);
                
                this.ws.onopen = () => {
                    this.setState('connected');
                    this.reconnectAttempt = 0;
                    this.startPingMonitor();
                    resolve();
                };
                
                this.ws.onclose = (event) => {
                    this.stopPingMonitor();
                    
                    if (!event.wasClean && this.state !== 'failed') {
                        this.handleDisconnect();
                    } else {
                        this.setState('disconnected');
                    }
                };
                
                this.ws.onerror = (error) => {
                    if (this.onError) {
                        this.onError(error);
                    }
                    reject(error);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };
            } catch (e) {
                this.setState('failed');
                reject(e);
            }
        });
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        this.stopReconnect();
        this.stopPingMonitor();
        this.flushMessageQueue();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        
        this.setState('disconnected');
    }

    /**
     * Send a message (with optional batching)
     */
    send(message: any): void {
        if (this.batchConfig.enabled) {
            this.queueMessage(message);
        } else {
            this.sendImmediate(message);
        }
    }

    /**
     * Send message immediately without batching
     */
    sendImmediate(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, queuing message');
            this.messageQueue.push(message);
            return;
        }
        
        try {
            const data = typeof message === 'string' ? message : JSON.stringify(message);
            this.ws.send(data);
            this.stats.messagesSent++;
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }

    /**
     * Queue message for batching
     */
    private queueMessage(message: any): void {
        this.messageQueue.push(message);
        
        // Start batch timer if not already running
        if (!this.batchTimeout) {
            this.batchTimeout = window.setTimeout(() => {
                this.flushMessageQueue();
            }, this.batchConfig.batchInterval);
        }
        
        // Flush immediately if batch is full
        if (this.messageQueue.length >= this.batchConfig.maxBatchSize) {
            this.flushMessageQueue();
        }
    }

    /**
     * Send all queued messages
     */
    private flushMessageQueue(): void {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        
        if (this.messageQueue.length === 0) return;
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return; // Keep messages queued for reconnect
        }
        
        // Send as batch if multiple messages
        if (this.messageQueue.length > 1) {
            const batch = {
                type: 'batch',
                messages: this.messageQueue
            };
            this.sendImmediate(batch);
        } else {
            this.sendImmediate(this.messageQueue[0]);
        }
        
        this.messageQueue = [];
    }

    /**
     * Handle incoming message
     */
    private handleMessage(event: MessageEvent): void {
        this.stats.messagesReceived++;
        this.stats.bytesReceived += event.data.length;
        
        try {
            const data = JSON.parse(event.data);
            
            // Handle pong
            if (data.type === 'pong') {
                this.lastPongTime = Date.now();
                this.stats.latency = this.lastPongTime - this.stats.lastPingTime;
                return;
            }
            
            // Handle batched messages
            if (data.type === 'batch' && Array.isArray(data.messages)) {
                data.messages.forEach((msg: any) => {
                    if (this.onMessage) {
                        this.onMessage(msg);
                    }
                });
                return;
            }
            
            if (this.onMessage) {
                this.onMessage(data);
            }
        } catch (e) {
            // Not JSON, pass raw data
            if (this.onMessage) {
                this.onMessage(event.data);
            }
        }
    }

    /**
     * Handle disconnection with exponential backoff
     */
    private handleDisconnect(): void {
        if (this.reconnectAttempt >= this.reconnectConfig.maxAttempts) {
            this.setState('failed');
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.setState('reconnecting');
        this.reconnectAttempt++;
        this.stats.reconnectAttempts = this.reconnectAttempt;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.reconnectConfig.initialDelay * 
            Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempt - 1),
            this.reconnectConfig.maxDelay
        );
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.reconnectConfig.maxAttempts})`);
        
        this.reconnectTimeout = window.setTimeout(async () => {
            try {
                await this.connect();
                // Flush queued messages after reconnect
                this.flushMessageQueue();
            } catch (e) {
                this.handleDisconnect();
            }
        }, delay);
    }

    /**
     * Stop reconnection attempts
     */
    private stopReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Start ping/pong monitoring
     */
    private startPingMonitor(): void {
        this.pingInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.stats.lastPingTime = Date.now();
                this.sendImmediate({ type: 'ping', t: this.stats.lastPingTime });
            }
        }, 5000); // Ping every 5 seconds
    }

    /**
     * Stop ping monitor
     */
    private stopPingMonitor(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Update connection state
     */
    private setState(state: ConnectionState): void {
        this.state = state;
        this.stats.state = state;
        
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }

    /**
     * Set message handler
     */
    setOnMessage(handler: (data: any) => void): void {
        this.onMessage = handler;
    }

    /**
     * Set state change handler
     */
    setOnStateChange(handler: (state: ConnectionState) => void): void {
        this.onStateChange = handler;
    }

    /**
     * Set error handler
     */
    setOnError(handler: (error: Event) => void): void {
        this.onError = handler;
    }

    /**
     * Get current connection state
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Get connection statistics
     */
    getStats(): ConnectionStats {
        return { ...this.stats };
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.state === 'connected' && 
               this.ws !== null && 
               this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get current latency
     */
    getLatency(): number {
        return this.stats.latency;
    }
}

/**
 * Connection quality indicator
 */
export function getConnectionQuality(latency: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (latency < 50) return 'excellent';
    if (latency < 100) return 'good';
    if (latency < 200) return 'fair';
    return 'poor';
}

/**
 * Format latency for display
 */
export function formatLatency(latency: number): string {
    return `${Math.round(latency)}ms`;
}
