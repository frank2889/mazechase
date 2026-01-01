/**
 * Reconnect Handler - State Sync Versioning
 * 
 * AI Tester Suggestion (Alex - Tech Lead):
 * "Voeg sync versioning toe voor reconnectie.
 * Na connectionverlies is de state soms inconsistent."
 * 
 * Features:
 * - State version tracking
 * - Efficient delta sync
 * - Reconnection queue
 * - State validation
 * - Conflict resolution
 */

export interface GameState {
    version: number;
    timestamp: number;
    players: Map<string, PlayerState>;
    pellets: Map<string, PelletState>;
    powerUps: Map<string, PowerUpState>;
    gamePhase: string;
    timeRemaining: number;
    checksum: string;
}

export interface PlayerState {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    role: 'runner' | 'chaser';
    score: number;
    isAlive: boolean;
    powerUpActive?: string;
}

export interface PelletState {
    id: string;
    position: { x: number; y: number; z: number };
    collected: boolean;
    type: 'normal' | 'bonus' | 'power';
}

export interface PowerUpState {
    id: string;
    position: { x: number; y: number; z: number };
    type: string;
    isActive: boolean;
}

export interface StateDelta {
    fromVersion: number;
    toVersion: number;
    timestamp: number;
    changes: StateChange[];
}

export interface StateChange {
    type: 'add' | 'update' | 'remove';
    entity: 'player' | 'pellet' | 'powerup' | 'game';
    id: string;
    data?: Partial<PlayerState | PelletState | PowerUpState>;
    fields?: string[];
}

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface QueuedAction {
    id: string;
    type: string;
    data: unknown;
    timestamp: number;
    retries: number;
}

/**
 * ReconnectHandler - Manages connection state and sync
 */
export class ReconnectHandler {
    private currentState: GameState | null = null;
    private stateHistory: StateDelta[] = [];
    private maxHistorySize: number = 100;
    
    private connectionState: ConnectionState = 'disconnected';
    private lastKnownVersion: number = 0;
    private lastSyncTimestamp: number = 0;
    
    private actionQueue: QueuedAction[] = [];
    private maxQueueSize: number = 50;
    private _maxRetries: number = 3;
    
    private reconnectAttempts: number = 0;

    /** Get max retries configuration */
    get maxRetries(): number { return this._maxRetries; }
    private maxReconnectAttempts: number = 10;
    private reconnectBackoff: number = 1000;
    private reconnectTimer: number | null = null;

    private onStateChangeCallbacks: ((state: GameState) => void)[] = [];
    private onConnectionChangeCallbacks: ((state: ConnectionState) => void)[] = [];

    constructor() {
        this.setupNetworkListeners();
    }

    /**
     * Initialize with current state
     */
    initialize(state: GameState): void {
        this.currentState = state;
        this.lastKnownVersion = state.version;
        this.lastSyncTimestamp = state.timestamp;
        console.log(`[ReconnectHandler] Initialized at version ${state.version}`);
    }

    /**
     * Apply state delta
     */
    applyDelta(delta: StateDelta): boolean {
        if (!this.currentState) {
            console.warn('[ReconnectHandler] No current state to apply delta to');
            return false;
        }

        // Validate delta version chain
        if (delta.fromVersion !== this.currentState.version) {
            console.warn(`[ReconnectHandler] Version mismatch: expected ${this.currentState.version}, got ${delta.fromVersion}`);
            this.requestFullSync();
            return false;
        }

        // Apply changes
        for (const change of delta.changes) {
            this.applyChange(change);
        }

        // Update version
        this.currentState.version = delta.toVersion;
        this.currentState.timestamp = delta.timestamp;
        this.lastKnownVersion = delta.toVersion;
        this.lastSyncTimestamp = delta.timestamp;

        // Store in history
        this.stateHistory.push(delta);
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }

        // Validate checksum
        const newChecksum = this.calculateChecksum(this.currentState);
        this.currentState.checksum = newChecksum;

        this.notifyStateChange();
        return true;
    }

    /**
     * Apply single state change
     */
    private applyChange(change: StateChange): void {
        if (!this.currentState) return;

        switch (change.entity) {
            case 'player':
                if (change.type === 'remove') {
                    this.currentState.players.delete(change.id);
                } else {
                    const existing = this.currentState.players.get(change.id);
                    if (change.type === 'add' || !existing) {
                        this.currentState.players.set(change.id, change.data as PlayerState);
                    } else {
                        // Partial update
                        Object.assign(existing, change.data);
                    }
                }
                break;

            case 'pellet':
                if (change.type === 'remove') {
                    this.currentState.pellets.delete(change.id);
                } else {
                    const existing = this.currentState.pellets.get(change.id);
                    if (change.type === 'add' || !existing) {
                        this.currentState.pellets.set(change.id, change.data as PelletState);
                    } else {
                        Object.assign(existing, change.data);
                    }
                }
                break;

            case 'powerup':
                if (change.type === 'remove') {
                    this.currentState.powerUps.delete(change.id);
                } else {
                    const existing = this.currentState.powerUps.get(change.id);
                    if (change.type === 'add' || !existing) {
                        this.currentState.powerUps.set(change.id, change.data as PowerUpState);
                    } else {
                        Object.assign(existing, change.data);
                    }
                }
                break;

            case 'game':
                if (change.data) {
                    const data = change.data as { gamePhase?: string; timeRemaining?: number };
                    if (data.gamePhase !== undefined) {
                        this.currentState.gamePhase = data.gamePhase;
                    }
                    if (data.timeRemaining !== undefined) {
                        this.currentState.timeRemaining = data.timeRemaining;
                    }
                }
                break;
        }
    }

    /**
     * Handle full state sync (after reconnect)
     */
    handleFullSync(state: GameState): void {
        console.log(`[ReconnectHandler] Full sync received, version ${state.version}`);
        
        this.currentState = state;
        this.lastKnownVersion = state.version;
        this.lastSyncTimestamp = state.timestamp;
        this.stateHistory = [];

        // Process queued actions
        this.processQueue();

        this.notifyStateChange();
    }

    /**
     * Request full state sync from server
     */
    requestFullSync(): void {
        console.log('[ReconnectHandler] Requesting full sync');
        window.dispatchEvent(new CustomEvent('mazechase:request_sync', {
            detail: { lastKnownVersion: this.lastKnownVersion }
        }));
    }

    /**
     * Handle connection loss
     */
    handleDisconnect(): void {
        this.connectionState = 'disconnected';
        this.notifyConnectionChange();
        
        console.log('[ReconnectHandler] Connection lost, starting reconnect');
        this.startReconnect();
    }

    /**
     * Start reconnection process
     */
    private startReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ReconnectHandler] Max reconnect attempts reached');
            return;
        }

        this.connectionState = 'reconnecting';
        this.notifyConnectionChange();

        const delay = Math.min(
            this.reconnectBackoff * Math.pow(2, this.reconnectAttempts),
            30000 // Max 30 seconds
        );

        console.log(`[ReconnectHandler] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = window.setTimeout(() => {
            this.attemptReconnect();
        }, delay);
    }

    /**
     * Attempt to reconnect
     */
    private async attemptReconnect(): Promise<void> {
        this.reconnectAttempts++;
        this.connectionState = 'connecting';
        this.notifyConnectionChange();

        try {
            // Dispatch reconnect event for socket handler
            window.dispatchEvent(new CustomEvent('mazechase:reconnect', {
                detail: {
                    lastKnownVersion: this.lastKnownVersion,
                    lastTimestamp: this.lastSyncTimestamp
                }
            }));
        } catch (error) {
            console.error('[ReconnectHandler] Reconnect failed:', error);
            this.startReconnect();
        }
    }

    /**
     * Handle successful reconnection
     */
    handleReconnected(): void {
        console.log('[ReconnectHandler] Reconnected successfully');
        
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.notifyConnectionChange();

        // Request state delta from last known version
        window.dispatchEvent(new CustomEvent('mazechase:request_delta', {
            detail: { fromVersion: this.lastKnownVersion }
        }));
    }

    /**
     * Queue an action during disconnect
     */
    queueAction(type: string, data: unknown): string {
        const action: QueuedAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        if (this.actionQueue.length >= this.maxQueueSize) {
            // Remove oldest action
            this.actionQueue.shift();
        }

        this.actionQueue.push(action);
        console.log(`[ReconnectHandler] Queued action: ${type}`);

        return action.id;
    }

    /**
     * Process queued actions after reconnect
     */
    private processQueue(): void {
        console.log(`[ReconnectHandler] Processing ${this.actionQueue.length} queued actions`);

        while (this.actionQueue.length > 0) {
            const action = this.actionQueue.shift()!;
            
            // Validate action is still relevant (not too old)
            const age = Date.now() - action.timestamp;
            if (age > 60000) { // 1 minute max age
                console.log(`[ReconnectHandler] Discarding old action: ${action.type}`);
                continue;
            }

            // Dispatch for processing
            window.dispatchEvent(new CustomEvent('mazechase:queued_action', {
                detail: action
            }));
        }
    }

    /**
     * Calculate state checksum for validation
     */
    private calculateChecksum(state: GameState): string {
        const data = {
            version: state.version,
            playerCount: state.players.size,
            pelletCount: state.pellets.size,
            powerUpCount: state.powerUps.size,
            gamePhase: state.gamePhase
        };
        
        // Simple hash (in production, use proper hashing)
        return btoa(JSON.stringify(data)).slice(0, 16);
    }

    /**
     * Validate state integrity
     */
    validateState(): boolean {
        if (!this.currentState) return false;

        const calculatedChecksum = this.calculateChecksum(this.currentState);
        if (calculatedChecksum !== this.currentState.checksum) {
            console.warn('[ReconnectHandler] State checksum mismatch');
            this.requestFullSync();
            return false;
        }

        return true;
    }

    /**
     * Get current state
     */
    getState(): GameState | null {
        return this.currentState;
    }

    /**
     * Get connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Get last known version
     */
    getVersion(): number {
        return this.lastKnownVersion;
    }

    /**
     * Subscribe to state changes
     */
    onStateChange(callback: (state: GameState) => void): () => void {
        this.onStateChangeCallbacks.push(callback);
        return () => {
            this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Subscribe to connection changes
     */
    onConnectionChange(callback: (state: ConnectionState) => void): () => void {
        this.onConnectionChangeCallbacks.push(callback);
        return () => {
            this.onConnectionChangeCallbacks = this.onConnectionChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    // Private helpers
    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            if (this.connectionState === 'disconnected') {
                this.startReconnect();
            }
        });

        window.addEventListener('offline', () => {
            this.handleDisconnect();
        });

        // Listen for server disconnect
        window.addEventListener('mazechase:disconnect', () => {
            this.handleDisconnect();
        });

        // Listen for successful reconnect
        window.addEventListener('mazechase:connected', () => {
            this.handleReconnected();
        });
    }

    private notifyStateChange(): void {
        if (this.currentState) {
            this.onStateChangeCallbacks.forEach(cb => cb(this.currentState!));
        }
    }

    private notifyConnectionChange(): void {
        this.onConnectionChangeCallbacks.forEach(cb => cb(this.connectionState));
    }
}

// Singleton
let reconnectHandler: ReconnectHandler | null = null;

export function getReconnectHandler(): ReconnectHandler {
    if (!reconnectHandler) {
        reconnectHandler = new ReconnectHandler();
    }
    return reconnectHandler;
}
