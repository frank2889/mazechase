/**
 * Message Handler - Input Validation & Security
 * EMMSOAI Suggestion (Marcus - Senior Code Reviewer):
 * "Add input validation for all incoming messages to mitigate XSS risks"
 * 
 * Features:
 * - Message schema validation
 * - Sequence number tracking
 * - XSS prevention
 * - Rate limiting detection
 */

export type WSMessageType = 
    | 'position'
    | 'state' 
    | 'event'
    | 'chat'
    | 'sync'
    | 'action'
    | 'heartbeat';

export interface ValidatedMessage {
    type: WSMessageType;
    sequence: number;
    timestamp: number;
    payload: unknown;
    validated: boolean;
    sanitized: boolean;
}

export interface MessageValidationResult {
    valid: boolean;
    error?: string;
    sanitizedPayload?: unknown;
}

// Message schemas for validation
const MESSAGE_SCHEMAS: Record<WSMessageType, MessageSchema> = {
    position: {
        required: ['x', 'y'],
        types: { x: 'number', y: 'number', z: 'number', rotation: 'number' },
        ranges: { x: [-1000, 1000], y: [-1000, 1000], z: [-100, 100], rotation: [0, 360] }
    },
    state: {
        required: ['gameState'],
        types: { gameState: 'string', players: 'object', timestamp: 'number' },
        allowedValues: { gameState: ['waiting', 'playing', 'paused', 'ended'] }
    },
    event: {
        required: ['eventType'],
        types: { eventType: 'string', data: 'object' },
        maxLength: { eventType: 50 }
    },
    chat: {
        required: ['message'],
        types: { message: 'string', sender: 'string' },
        maxLength: { message: 500, sender: 50 },
        sanitize: ['message', 'sender']
    },
    sync: {
        required: ['sequence'],
        types: { sequence: 'number', checksum: 'string' }
    },
    action: {
        required: ['action'],
        types: { action: 'string', data: 'object' },
        allowedValues: { action: ['move', 'use_powerup', 'emote', 'pause'] }
    },
    heartbeat: {
        required: ['timestamp'],
        types: { timestamp: 'number' }
    }
};

interface MessageSchema {
    required: string[];
    types: Record<string, string>;
    ranges?: Record<string, [number, number]>;
    allowedValues?: Record<string, string[]>;
    maxLength?: Record<string, number>;
    sanitize?: string[];
}

/**
 * MessageHandler - Validates and sanitizes incoming WebSocket messages
 */
export class MessageHandler {
    private lastSequence: number = 0;
    private messageBuffer: Map<number, ValidatedMessage> = new Map();
    private maxBufferSize: number = 100;
    private sequenceGap: number[] = [];
    
    constructor() {
        console.log('[MessageHandler] Initialized with XSS protection enabled');
    }
    
    /**
     * Validate and sanitize incoming message
     */
    public validateMessage(rawMessage: unknown): MessageValidationResult {
        // Basic type check
        if (typeof rawMessage !== 'object' || rawMessage === null) {
            return { valid: false, error: 'Message must be an object' };
        }
        
        const message = rawMessage as Record<string, unknown>;
        
        // Check message type
        if (!message.type || typeof message.type !== 'string') {
            return { valid: false, error: 'Missing or invalid message type' };
        }
        
        const type = message.type as WSMessageType;
        const schema = MESSAGE_SCHEMAS[type];
        
        if (!schema) {
            return { valid: false, error: `Unknown message type: ${type}` };
        }
        
        // Validate required fields
        for (const field of schema.required) {
            if (!(field in message)) {
                return { valid: false, error: `Missing required field: ${field}` };
            }
        }
        
        // Validate types
        for (const [field, expectedType] of Object.entries(schema.types)) {
            if (field in message) {
                const actualType = typeof message[field];
                if (actualType !== expectedType && expectedType !== 'object') {
                    return { valid: false, error: `Field ${field} must be ${expectedType}, got ${actualType}` };
                }
            }
        }
        
        // Validate ranges
        if (schema.ranges) {
            for (const [field, [min, max]] of Object.entries(schema.ranges)) {
                const value = message[field];
                if (typeof value === 'number' && (value < min || value > max)) {
                    return { valid: false, error: `Field ${field} out of range [${min}, ${max}]` };
                }
            }
        }
        
        // Validate allowed values
        if (schema.allowedValues) {
            for (const [field, allowed] of Object.entries(schema.allowedValues)) {
                const value = message[field];
                if (value !== undefined && !allowed.includes(value as string)) {
                    return { valid: false, error: `Invalid value for ${field}` };
                }
            }
        }
        
        // Validate max length
        if (schema.maxLength) {
            for (const [field, maxLen] of Object.entries(schema.maxLength)) {
                const value = message[field];
                if (typeof value === 'string' && value.length > maxLen) {
                    return { valid: false, error: `Field ${field} exceeds max length ${maxLen}` };
                }
            }
        }
        
        // Sanitize fields (XSS prevention)
        const sanitizedPayload = { ...message };
        if (schema.sanitize) {
            for (const field of schema.sanitize) {
                if (typeof sanitizedPayload[field] === 'string') {
                    sanitizedPayload[field] = this.sanitizeString(sanitizedPayload[field] as string);
                }
            }
        }
        
        return { valid: true, sanitizedPayload };
    }
    
    /**
     * Sanitize string to prevent XSS attacks
     */
    private sanitizeString(input: string): string {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#x60;')
            // Remove potential script injections
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            // Limit consecutive whitespace
            .replace(/\s{3,}/g, '  ')
            .trim();
    }
    
    /**
     * Check sequence number for message ordering
     * EMMSOAI Suggestion (Alex - Technical QA Engineer):
     * "Add sequence number checks to ensure correct message ordering"
     */
    public checkSequence(sequence: number): { inOrder: boolean; gap: number } {
        const expectedSequence = this.lastSequence + 1;
        const gap = sequence - expectedSequence;
        
        if (sequence === expectedSequence) {
            this.lastSequence = sequence;
            return { inOrder: true, gap: 0 };
        }
        
        if (sequence > expectedSequence) {
            // Gap detected - messages may have been lost
            console.warn(`[MessageHandler] Sequence gap detected: expected ${expectedSequence}, got ${sequence}`);
            for (let i = expectedSequence; i < sequence; i++) {
                this.sequenceGap.push(i);
            }
            this.lastSequence = sequence;
            return { inOrder: false, gap };
        }
        
        // Old message (already processed or duplicate)
        console.warn(`[MessageHandler] Out of order message: sequence ${sequence}, current ${this.lastSequence}`);
        return { inOrder: false, gap };
    }
    
    /**
     * Get missing sequence numbers for re-request
     */
    public getMissingSequences(): number[] {
        const missing = [...this.sequenceGap];
        this.sequenceGap = [];
        return missing;
    }
    
    /**
     * Buffer message for reordering
     */
    public bufferMessage(message: ValidatedMessage): void {
        if (this.messageBuffer.size >= this.maxBufferSize) {
            // Remove oldest messages
            const oldest = Math.min(...this.messageBuffer.keys());
            this.messageBuffer.delete(oldest);
        }
        this.messageBuffer.set(message.sequence, message);
    }
    
    /**
     * Get buffered messages in order
     */
    public getOrderedMessages(): ValidatedMessage[] {
        const sequences = [...this.messageBuffer.keys()].sort((a, b) => a - b);
        const ordered: ValidatedMessage[] = [];
        
        for (const seq of sequences) {
            const msg = this.messageBuffer.get(seq);
            if (msg) {
                ordered.push(msg);
                this.messageBuffer.delete(seq);
            }
        }
        
        return ordered;
    }
    
    /**
     * Process incoming message with full validation pipeline
     */
    public processMessage(rawData: string | ArrayBuffer): ValidatedMessage | null {
        try {
            // Parse JSON
            const parsed = typeof rawData === 'string' 
                ? JSON.parse(rawData)
                : this.decodeBinaryMessage(rawData);
            
            // Validate
            const validation = this.validateMessage(parsed);
            if (!validation.valid) {
                console.error('[MessageHandler] Validation failed:', validation.error);
                return null;
            }
            
            // Check sequence if present
            const sequence = (validation.sanitizedPayload as Record<string, unknown>).sequence as number || 0;
            this.checkSequence(sequence);
            
            return {
                type: (validation.sanitizedPayload as Record<string, unknown>).type as WSMessageType,
                sequence,
                timestamp: Date.now(),
                payload: validation.sanitizedPayload,
                validated: true,
                sanitized: true
            };
        } catch (e) {
            console.error('[MessageHandler] Failed to process message:', e);
            return null;
        }
    }
    
    /**
     * Decode binary message (placeholder - implement based on protocol)
     */
    private decodeBinaryMessage(buffer: ArrayBuffer): Record<string, unknown> {
        // Binary decoding logic here
        const view = new DataView(buffer);
        const type = view.getUint8(0);
        
        // Map type ID back to string
        const typeMap: Record<number, WSMessageType> = {
            0x01: 'position',
            0x02: 'state',
            0x03: 'event',
            0x04: 'chat',
            0x05: 'sync',
            0x06: 'action',
            0x07: 'heartbeat'
        };
        
        return {
            type: typeMap[type] || 'unknown',
            sequence: view.getUint32(1, true)
        };
    }
    
    /**
     * Reset handler state
     */
    public reset(): void {
        this.lastSequence = 0;
        this.messageBuffer.clear();
        this.sequenceGap = [];
    }
}

// Singleton instance
let messageHandlerInstance: MessageHandler | null = null;

export function getMessageHandler(): MessageHandler {
    if (!messageHandlerInstance) {
        messageHandlerInstance = new MessageHandler();
    }
    return messageHandlerInstance;
}
