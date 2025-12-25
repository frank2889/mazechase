// Performance optimizations for Phaser game
import Phaser from 'phaser';

/**
 * Object Pool for reusable game objects
 * Reduces garbage collection by reusing objects instead of creating new ones
 */
export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
    private pool: T[] = [];
    private createFn: () => T;
    private resetFn: (obj: T) => void;

    constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;

        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            const obj = this.createFn();
            obj.setActive(false);
            (obj as any).setVisible?.(false);
            this.pool.push(obj);
        }
    }

    get(): T {
        // Find inactive object
        const obj = this.pool.find(o => !o.active);
        if (obj) {
            obj.setActive(true);
            (obj as any).setVisible?.(true);
            return obj;
        }

        // Create new object if pool exhausted
        const newObj = this.createFn();
        this.pool.push(newObj);
        return newObj;
    }

    release(obj: T): void {
        this.resetFn(obj);
        obj.setActive(false);
        (obj as any).setVisible?.(false);
    }

    releaseAll(): void {
        this.pool.forEach(obj => this.release(obj));
    }

    getActiveCount(): number {
        return this.pool.filter(o => o.active).length;
    }

    getPoolSize(): number {
        return this.pool.length;
    }
}

/**
 * Frame Rate Controller
 * Manages adaptive frame rate and tick synchronization
 */
export class FrameRateController {
    private targetFPS: number;
    private currentFPS: number = 60;
    private fpsHistory: number[] = [];
    private historySize: number = 30;
    private lastTime: number = 0;
    private frameCount: number = 0;
    private adaptiveEnabled: boolean;

    constructor(targetFPS = 60, adaptiveEnabled = true) {
        this.targetFPS = targetFPS;
        this.adaptiveEnabled = adaptiveEnabled;
    }

    update(time: number): void {
        this.frameCount++;

        if (time - this.lastTime >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastTime = time;

            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > this.historySize) {
                this.fpsHistory.shift();
            }
        }
    }

    getCurrentFPS(): number {
        return this.currentFPS;
    }

    getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return this.targetFPS;
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }

    shouldSkipFrame(): boolean {
        if (!this.adaptiveEnabled) return false;

        // Skip frames if FPS is too low to maintain smooth gameplay
        const avgFPS = this.getAverageFPS();
        return avgFPS < 30 && Math.random() > 0.5;
    }

    getInterpolationFactor(delta: number): number {
        // Calculate interpolation factor for smooth movement
        return Math.min(delta / (1000 / this.targetFPS), 2);
    }
}

/**
 * Client-Side Prediction
 * Predicts player movement locally for smoother gameplay
 */
export interface PredictedState {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    timestamp: number;
    sequence: number;
}

export class ClientPrediction {
    private pendingInputs: PredictedState[] = [];
    private lastServerState: PredictedState | null = null;
    private sequenceNumber: number = 0;

    recordInput(x: number, y: number, vx: number, vy: number): number {
        const input: PredictedState = {
            x, y,
            velocityX: vx,
            velocityY: vy,
            timestamp: Date.now(),
            sequence: ++this.sequenceNumber
        };
        this.pendingInputs.push(input);
        return this.sequenceNumber;
    }

    applyServerReconciliation(serverState: PredictedState, serverSequence: number): PredictedState {
        this.lastServerState = serverState;

        // Remove acknowledged inputs
        this.pendingInputs = this.pendingInputs.filter(
            input => input.sequence > serverSequence
        );

        // Re-apply pending inputs
        let reconciledState = { ...serverState };
        for (const input of this.pendingInputs) {
            reconciledState = this.applyInput(reconciledState, input);
        }

        return reconciledState;
    }

    private applyInput(state: PredictedState, input: PredictedState): PredictedState {
        // Simple physics prediction
        const dt = 1 / 60; // Assume 60fps
        return {
            ...state,
            x: state.x + input.velocityX * dt,
            y: state.y + input.velocityY * dt,
            velocityX: input.velocityX,
            velocityY: input.velocityY,
            timestamp: input.timestamp,
            sequence: input.sequence
        };
    }

    getPendingInputCount(): number {
        return this.pendingInputs.length;
    }

    clearPendingInputs(): void {
        this.pendingInputs = [];
    }
}

/**
 * Position Interpolation
 * Smoothly interpolates between network updates
 */
export class PositionInterpolator {
    private positions: Map<string, InterpolationData> = new Map();
    private interpolationDelay: number;

    constructor(interpolationDelay = 100) {
        this.interpolationDelay = interpolationDelay;
    }

    updatePosition(id: string, x: number, y: number, timestamp: number = Date.now()): void {
        let data = this.positions.get(id);
        if (!data) {
            data = {
                buffer: [],
                currentX: x,
                currentY: y
            };
            this.positions.set(id, data);
        }

        data.buffer.push({ x, y, timestamp });

        // Keep only recent positions
        const cutoff = timestamp - 1000;
        data.buffer = data.buffer.filter(p => p.timestamp > cutoff);
    }

    getInterpolatedPosition(id: string): { x: number; y: number } | null {
        const data = this.positions.get(id);
        if (!data || data.buffer.length < 2) {
            return data ? { x: data.currentX, y: data.currentY } : null;
        }

        const renderTime = Date.now() - this.interpolationDelay;
        const buffer = data.buffer;

        // Find surrounding positions
        let before = buffer[0];
        let after = buffer[buffer.length - 1];

        for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
                before = buffer[i];
                after = buffer[i + 1];
                break;
            }
        }

        // Interpolate
        const total = after.timestamp - before.timestamp;
        const progress = total > 0 ? (renderTime - before.timestamp) / total : 0;
        const t = Math.max(0, Math.min(1, progress));

        return {
            x: before.x + (after.x - before.x) * t,
            y: before.y + (after.y - before.y) * t
        };
    }

    removeEntity(id: string): void {
        this.positions.delete(id);
    }
}

interface InterpolationData {
    buffer: { x: number; y: number; timestamp: number }[];
    currentX: number;
    currentY: number;
}

/**
 * Sprite Batch Renderer
 * Optimizes rendering by batching similar sprites
 */
export class SpriteBatchRenderer {
    private scene: Phaser.Scene;
    private batches: Map<string, Phaser.GameObjects.Group> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    createBatch(key: string, texture: string): Phaser.GameObjects.Group {
        const group = this.scene.add.group({
            defaultKey: texture,
            maxSize: 100
        });
        this.batches.set(key, group);
        return group;
    }

    getBatch(key: string): Phaser.GameObjects.Group | undefined {
        return this.batches.get(key);
    }

    addToBatch(key: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
        const batch = this.batches.get(key);
        if (!batch) return null;

        const sprite = batch.get(x, y) as Phaser.GameObjects.Sprite;
        if (sprite) {
            sprite.setActive(true).setVisible(true);
        }
        return sprite;
    }

    removeFromBatch(key: string, sprite: Phaser.GameObjects.Sprite): void {
        const batch = this.batches.get(key);
        if (batch) {
            batch.killAndHide(sprite);
        }
    }
}

/**
 * Network Message Queue
 * Batches and prioritizes network messages
 */
export class MessageQueue {
    private queue: QueuedMessage[] = [];
    private maxQueueSize: number;
    private flushInterval: number;
    private lastFlush: number = 0;

    constructor(maxQueueSize = 10, flushInterval = 50) {
        this.maxQueueSize = maxQueueSize;
        this.flushInterval = flushInterval;
    }

    enqueue(type: string, data: any, priority: MessagePriority = MessagePriority.Normal): void {
        this.queue.push({
            type,
            data,
            priority,
            timestamp: Date.now()
        });

        // Sort by priority
        this.queue.sort((a, b) => b.priority - a.priority);

        // Trim if too large
        if (this.queue.length > this.maxQueueSize) {
            this.queue = this.queue.slice(0, this.maxQueueSize);
        }
    }

    shouldFlush(): boolean {
        if (this.queue.length === 0) return false;

        // Flush high priority immediately
        if (this.queue.some(m => m.priority === MessagePriority.High)) {
            return true;
        }

        // Flush based on interval
        return Date.now() - this.lastFlush >= this.flushInterval;
    }

    flush(): QueuedMessage[] {
        const messages = [...this.queue];
        this.queue = [];
        this.lastFlush = Date.now();
        return messages;
    }

    getQueueSize(): number {
        return this.queue.length;
    }
}

export enum MessagePriority {
    Low = 0,
    Normal = 1,
    High = 2
}

interface QueuedMessage {
    type: string;
    data: any;
    priority: MessagePriority;
    timestamp: number;
}

/**
 * Delta Compression for state updates
 */
export class DeltaCompressor {
    private lastState: Record<string, any> = {};

    compress(state: Record<string, any>): Record<string, any> {
        const delta: Record<string, any> = {};
        let hasChanges = false;

        for (const key in state) {
            if (state[key] !== this.lastState[key]) {
                delta[key] = state[key];
                hasChanges = true;
            }
        }

        this.lastState = { ...state };
        return hasChanges ? delta : {};
    }

    decompress(delta: Record<string, any>, baseState: Record<string, any>): Record<string, any> {
        return { ...baseState, ...delta };
    }

    reset(): void {
        this.lastState = {};
    }
}
