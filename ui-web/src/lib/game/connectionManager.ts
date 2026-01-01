/**
 * Connection Manager with Auto-Reconnect
 * EMMSOAI Suggestion (Alex - Core Gameplay & UX Designer):
 * "Verbeter disconnectie-herstel met automatische reconnect en state sync"
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state persistence
 * - Game state synchronization on reconnect
 * - Player feedback during connection issues
 */

export type ConnectionState = 
    | 'disconnected' 
    | 'connecting' 
    | 'connected' 
    | 'reconnecting' 
    | 'failed';

export interface ConnectionConfig {
    url: string;
    maxReconnectAttempts: number;
    baseReconnectDelay: number;  // ms
    maxReconnectDelay: number;   // ms
    heartbeatInterval: number;   // ms
    heartbeatTimeout: number;    // ms
}

export interface GameStateSnapshot {
    playerId: string;
    position: { x: number; y: number; z: number };
    score: number;
    pelletsCollected: number;
    timestamp: number;
}

const DEFAULT_CONFIG: ConnectionConfig = {
    url: '',
    maxReconnectAttempts: 10,
    baseReconnectDelay: 1000,
    maxReconnectDelay: 30000,
    heartbeatInterval: 5000,
    heartbeatTimeout: 10000
};

type MessageHandler = (data: unknown) => void;
type StateChangeHandler = (state: ConnectionState, previousState: ConnectionState) => void;

/**
 * WebSocket Connection Manager with auto-reconnect
 */
export class ConnectionManager {
    private config: ConnectionConfig;
    private socket: WebSocket | null = null;
    private state: ConnectionState = 'disconnected';
    private reconnectAttempts = 0;
    private reconnectTimeout: number | null = null;
    private heartbeatInterval: number | null = null;
    private lastHeartbeat = 0;
    private lastSnapshot: GameStateSnapshot | null = null;

    // Event handlers
    private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
    private stateChangeHandlers: Set<StateChangeHandler> = new Set();

    // Session tracking
    private sessionId: string | null = null;
    private playerId: string | null = null;

    constructor(config: Partial<ConnectionConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Connect to the game server
     */
    connect(url: string, playerId?: string): Promise<void> {
        this.config.url = url;
        this.playerId = playerId ?? null;

        return new Promise((resolve, reject) => {
            this.setState('connecting');

            try {
                this.socket = new WebSocket(url);

                this.socket.onopen = () => {
                    console.log('[Connection] Connected');
                    this.setState('connected');
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();

                    // Send session restore request if we have a previous session
                    if (this.sessionId && this.lastSnapshot) {
                        this.sendRestoreSession();
                    }

                    resolve();
                };

                this.socket.onclose = (event) => {
                    console.log(`[Connection] Closed: ${event.code} ${event.reason}`);
                    this.handleDisconnect();
                };

                this.socket.onerror = (error) => {
                    console.error('[Connection] Error:', error);
                    if (this.state === 'connecting') {
                        reject(error);
                    }
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event);
                };

            } catch (e) {
                console.error('[Connection] Failed to create WebSocket:', e);
                this.setState('failed');
                reject(e);
            }
        });
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);
            
            // Handle heartbeat response
            if (data.type === 'pong') {
                this.lastHeartbeat = Date.now();
                return;
            }

            // Handle session ID assignment
            if (data.type === 'session' && data.sessionId) {
                this.sessionId = data.sessionId;
                console.log(`[Connection] Session: ${this.sessionId}`);
            }

            // Handle state sync response
            if (data.type === 'state_sync') {
                console.log('[Connection] State synchronized');
            }

            // Dispatch to registered handlers
            const handlers = this.messageHandlers.get(data.type);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }

            // Also dispatch to wildcard handlers
            const wildcardHandlers = this.messageHandlers.get('*');
            if (wildcardHandlers) {
                wildcardHandlers.forEach(handler => handler(data));
            }

        } catch (e) {
            console.warn('[Connection] Failed to parse message:', e);
        }
    }

    /**
     * Handle disconnection
     */
    private handleDisconnect(): void {
        this.stopHeartbeat();

        if (this.state === 'connected' || this.state === 'reconnecting') {
            if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
                this.scheduleReconnect();
            } else {
                console.error('[Connection] Max reconnect attempts reached');
                this.setState('failed');
            }
        }
    }

    /**
     * Schedule a reconnection attempt
     */
    private scheduleReconnect(): void {
        this.setState('reconnecting');

        // Exponential backoff with jitter
        const delay = Math.min(
            this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
            this.config.maxReconnectDelay
        );

        console.log(`[Connection] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`);

        this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.config.url, this.playerId ?? undefined).catch(() => {
                // Error handling is done in connect()
            });
        }, delay);
    }

    /**
     * Send session restore request
     */
    private sendRestoreSession(): void {
        this.send('restore_session', {
            sessionId: this.sessionId,
            playerId: this.playerId,
            lastSnapshot: this.lastSnapshot
        });
    }

    /**
     * Start heartbeat to detect connection issues
     */
    private startHeartbeat(): void {
        this.lastHeartbeat = Date.now();

        this.heartbeatInterval = window.setInterval(() => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

            // Check if we've missed heartbeats
            if (Date.now() - this.lastHeartbeat > this.config.heartbeatTimeout) {
                console.warn('[Connection] Heartbeat timeout');
                this.socket.close();
                return;
            }

            // Send ping
            this.send('ping', { timestamp: Date.now() });
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Send a message
     */
    send(type: string, payload: Record<string, unknown> = {}): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('[Connection] Cannot send - not connected');
            return false;
        }

        const message = JSON.stringify({ type, ...payload });
        this.socket.send(message);
        return true;
    }

    /**
     * Save game state snapshot for reconnection
     */
    saveSnapshot(snapshot: GameStateSnapshot): void {
        this.lastSnapshot = snapshot;
    }

    /**
     * Subscribe to message type
     */
    on(type: string, handler: MessageHandler): () => void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.get(type)?.delete(handler);
        };
    }

    /**
     * Subscribe to state changes
     */
    onStateChange(handler: StateChangeHandler): () => void {
        this.stateChangeHandlers.add(handler);
        return () => this.stateChangeHandlers.delete(handler);
    }

    /**
     * Update and broadcast state
     */
    private setState(newState: ConnectionState): void {
        const previousState = this.state;
        if (newState === previousState) return;

        this.state = newState;
        this.stateChangeHandlers.forEach(handler => handler(newState, previousState));
    }

    /**
     * Get current state
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Get connection quality info
     */
    getConnectionInfo(): { state: ConnectionState; latency: number; reconnectAttempts: number } {
        return {
            state: this.state,
            latency: Date.now() - this.lastHeartbeat,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Force reconnect
     */
    forceReconnect(): void {
        if (this.socket) {
            this.socket.close();
        }
        this.reconnectAttempts = 0;
        this.connect(this.config.url, this.playerId ?? undefined);
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        this.stopHeartbeat();

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.setState('disconnected');
        this.reconnectAttempts = 0;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.state === 'connected';
    }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
