/**
 * Socket Handler - Binary Protocol
 * 
 * AI Tester Suggestion (Elena - Performance Engineer):
 * "Switch position updates to binary format.
 * To reduce WebSocket payload size and increase network efficiency."
 * 
 * Features:
 * - Binary encoding for position updates
 * - Message compression
 * - Efficient serialization/deserialization
 * - Backward compatible with JSON fallback
 */

export type MessageType = 
    | 'position'
    | 'state'
    | 'event'
    | 'chat'
    | 'sync';

// Binary message type IDs
const MESSAGE_TYPE_IDS: Record<MessageType, number> = {
    position: 0x01,
    state: 0x02,
    event: 0x03,
    chat: 0x04,
    sync: 0x05
};

export interface PositionUpdate {
    playerId: number;
    x: number;
    y: number;
    z: number;
    rotation: number;
    timestamp: number;
}

export interface BatchPositionUpdate {
    updates: PositionUpdate[];
    serverTime: number;
}

export interface SocketHandlerConfig {
    useBinaryProtocol: boolean;
    compressionThreshold: number;  // bytes
    batchInterval: number;         // ms
    maxBatchSize: number;
}

const DEFAULT_CONFIG: SocketHandlerConfig = {
    useBinaryProtocol: true,
    compressionThreshold: 100,
    batchInterval: 16,  // ~60fps
    maxBatchSize: 10
};

/**
 * BinaryEncoder - Efficient binary message encoding
 */
class BinaryEncoder {
    private buffer: ArrayBuffer;
    private view: DataView;
    private offset = 0;

    constructor(size: number = 256) {
        this.buffer = new ArrayBuffer(size);
        this.view = new DataView(this.buffer);
    }

    reset(): void {
        this.offset = 0;
    }

    writeUint8(value: number): void {
        this.view.setUint8(this.offset++, value);
    }

    writeUint16(value: number): void {
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }

    writeUint32(value: number): void {
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }

    writeFloat32(value: number): void {
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
    }

    writeFloat64(value: number): void {
        this.view.setFloat64(this.offset, value, true);
        this.offset += 8;
    }

    getBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.offset);
    }
}

/**
 * BinaryDecoder - Efficient binary message decoding
 */
class BinaryDecoder {
    private view: DataView;
    private offset = 0;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    readUint8(): number {
        return this.view.getUint8(this.offset++);
    }

    readUint16(): number {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readUint32(): number {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readFloat32(): number {
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readFloat64(): number {
        const value = this.view.getFloat64(this.offset, true);
        this.offset += 8;
        return value;
    }

    hasMore(): boolean {
        return this.offset < this.view.byteLength;
    }
}

/**
 * SocketHandler - Optimized WebSocket communication
 */
export class SocketHandler {
    private config: SocketHandlerConfig;
    private encoder: BinaryEncoder;
    private pendingPositions: PositionUpdate[] = [];
    private batchTimer: ReturnType<typeof setInterval> | null = null;
    private onSendCallback: ((data: ArrayBuffer | string) => void) | null = null;

    constructor(config: Partial<SocketHandlerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.encoder = new BinaryEncoder(512);
    }

    /**
     * Set send callback (connects to actual WebSocket)
     */
    onSend(callback: (data: ArrayBuffer | string) => void): void {
        this.onSendCallback = callback;
    }

    /**
     * Start batch sending
     */
    startBatching(): void {
        if (this.batchTimer) return;

        this.batchTimer = setInterval(() => {
            this.flushPositionBatch();
        }, this.config.batchInterval);
    }

    /**
     * Stop batch sending
     */
    stopBatching(): void {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Queue a position update for batching
     */
    queuePositionUpdate(update: PositionUpdate): void {
        this.pendingPositions.push(update);

        // Flush if batch is full
        if (this.pendingPositions.length >= this.config.maxBatchSize) {
            this.flushPositionBatch();
        }
    }

    /**
     * Flush pending position updates
     */
    private flushPositionBatch(): void {
        if (this.pendingPositions.length === 0) return;

        if (this.config.useBinaryProtocol) {
            this.sendBinaryPositions(this.pendingPositions);
        } else {
            this.sendJsonPositions(this.pendingPositions);
        }

        this.pendingPositions = [];
    }

    /**
     * Encode and send positions in binary format
     * 
     * Binary format per position (21 bytes):
     * - type: 1 byte
     * - playerId: 2 bytes
     * - x: 4 bytes (float32)
     * - y: 4 bytes (float32)
     * - z: 4 bytes (float32)
     * - rotation: 2 bytes (uint16, 0-65535 mapped to 0-2π)
     * - timestamp: 4 bytes (uint32, relative ms)
     */
    private sendBinaryPositions(positions: PositionUpdate[]): void {
        this.encoder.reset();

        // Header
        this.encoder.writeUint8(MESSAGE_TYPE_IDS.position);
        this.encoder.writeUint8(positions.length);
        this.encoder.writeUint32(Date.now() & 0xFFFFFFFF); // Server time

        // Positions
        for (const pos of positions) {
            this.encoder.writeUint16(pos.playerId);
            this.encoder.writeFloat32(pos.x);
            this.encoder.writeFloat32(pos.y);
            this.encoder.writeFloat32(pos.z);
            // Encode rotation as uint16 (0-65535 -> 0-2π)
            this.encoder.writeUint16(Math.round((pos.rotation / (Math.PI * 2)) * 65535) & 0xFFFF);
            this.encoder.writeUint32(pos.timestamp & 0xFFFFFFFF);
        }

        const buffer = this.encoder.getBuffer();
        
        if (this.onSendCallback) {
            this.onSendCallback(buffer);
        }
    }

    /**
     * Send positions as JSON (fallback)
     */
    private sendJsonPositions(positions: PositionUpdate[]): void {
        const message = JSON.stringify({
            type: 'position',
            positions,
            serverTime: Date.now()
        });

        if (this.onSendCallback) {
            this.onSendCallback(message);
        }
    }

    /**
     * Decode received binary message
     */
    decodeBinaryMessage(buffer: ArrayBuffer): {
        type: MessageType;
        data: any;
    } | null {
        try {
            const decoder = new BinaryDecoder(buffer);
            const typeId = decoder.readUint8();

            // Find message type
            const type = Object.entries(MESSAGE_TYPE_IDS)
                .find(([_, id]) => id === typeId)?.[0] as MessageType;

            if (!type) {
                console.warn('[SocketHandler] Unknown message type:', typeId);
                return null;
            }

            switch (type) {
                case 'position':
                    return {
                        type,
                        data: this.decodePositionBatch(decoder)
                    };
                default:
                    return null;
            }
        } catch (e) {
            console.error('[SocketHandler] Failed to decode binary message:', e);
            return null;
        }
    }

    /**
     * Decode position batch from binary
     */
    private decodePositionBatch(decoder: BinaryDecoder): BatchPositionUpdate {
        const count = decoder.readUint8();
        const serverTime = decoder.readUint32();

        const updates: PositionUpdate[] = [];
        for (let i = 0; i < count; i++) {
            updates.push({
                playerId: decoder.readUint16(),
                x: decoder.readFloat32(),
                y: decoder.readFloat32(),
                z: decoder.readFloat32(),
                rotation: (decoder.readUint16() / 65535) * Math.PI * 2,
                timestamp: decoder.readUint32()
            });
        }

        return { updates, serverTime };
    }

    /**
     * Calculate message size (for stats)
     */
    calculateBinarySize(positions: PositionUpdate[]): number {
        // Header (6 bytes) + per-position (20 bytes each)
        return 6 + (positions.length * 20);
    }

    calculateJsonSize(positions: PositionUpdate[]): number {
        return JSON.stringify({ type: 'position', positions }).length;
    }

    /**
     * Get compression ratio
     */
    getCompressionRatio(sampleSize: number = 5): number {
        const samplePositions: PositionUpdate[] = Array(sampleSize).fill(null).map((_, i) => ({
            playerId: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            z: Math.random() * 10,
            rotation: Math.random() * Math.PI * 2,
            timestamp: Date.now()
        }));

        const binarySize = this.calculateBinarySize(samplePositions);
        const jsonSize = this.calculateJsonSize(samplePositions);

        return jsonSize / binarySize;
    }

    /**
     * Send immediate (non-batched) message
     */
    sendImmediate(type: MessageType, data: any): void {
        if (this.config.useBinaryProtocol && type === 'position') {
            // Use binary for position updates
            if (Array.isArray(data)) {
                this.sendBinaryPositions(data);
            } else {
                this.sendBinaryPositions([data]);
            }
        } else {
            // Use JSON for other types
            const message = JSON.stringify({ type, ...data });
            if (this.onSendCallback) {
                this.onSendCallback(message);
            }
        }
    }

    /**
     * Clean up
     */
    destroy(): void {
        this.stopBatching();
        this.pendingPositions = [];
    }
}

// Singleton
let socketHandler: SocketHandler | null = null;

export function getSocketHandler(): SocketHandler {
    if (!socketHandler) {
        socketHandler = new SocketHandler();
    }
    return socketHandler;
}
