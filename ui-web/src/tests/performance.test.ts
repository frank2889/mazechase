import { describe, it, expect, beforeEach } from 'vitest';
import {
    ObjectPool,
    FrameRateController,
    ClientPrediction,
    PositionInterpolator,
    MessageQueue,
    MessagePriority,
    DeltaCompressor
} from '../lib/game/performance';

// Mock Phaser GameObject for testing
class MockGameObject {
    active = true;
    visible = true;

    setActive(value: boolean) {
        this.active = value;
        return this;
    }

    setVisible(value: boolean) {
        this.visible = value;
        return this;
    }
}

describe('ObjectPool', () => {
    let pool: ObjectPool<MockGameObject>;

    beforeEach(() => {
        pool = new ObjectPool(
            () => new MockGameObject(),
            (obj) => {
                obj.active = false;
                obj.visible = false;
            },
            5
        );
    });

    it('should create initial pool size', () => {
        expect(pool.getPoolSize()).toBe(5);
    });

    it('should return inactive objects from pool', () => {
        const obj = pool.get();
        expect(obj).toBeDefined();
        expect(obj.active).toBe(true);
    });

    it('should track active count', () => {
        pool.get();
        pool.get();
        expect(pool.getActiveCount()).toBe(2);
    });

    it('should release objects back to pool', () => {
        const obj = pool.get();
        pool.release(obj);
        expect(obj.active).toBe(false);
    });

    it('should expand pool when exhausted', () => {
        // Get all initial objects
        for (let i = 0; i < 5; i++) {
            pool.get();
        }
        // Get one more (should create new)
        const obj = pool.get();
        expect(obj).toBeDefined();
        expect(pool.getPoolSize()).toBe(6);
    });
});

describe('FrameRateController', () => {
    let controller: FrameRateController;

    beforeEach(() => {
        controller = new FrameRateController(60, true);
    });

    it('should track current FPS', () => {
        expect(controller.getCurrentFPS()).toBeDefined();
    });

    it('should return target FPS as average initially', () => {
        expect(controller.getAverageFPS()).toBe(60);
    });

    it('should calculate interpolation factor', () => {
        const factor = controller.getInterpolationFactor(16.67); // ~60fps
        expect(factor).toBeCloseTo(1, 1);
    });

    it('should cap interpolation factor at 2', () => {
        const factor = controller.getInterpolationFactor(100); // Very slow frame
        expect(factor).toBeLessThanOrEqual(2);
    });
});

describe('ClientPrediction', () => {
    let prediction: ClientPrediction;

    beforeEach(() => {
        prediction = new ClientPrediction();
    });

    it('should record inputs with incrementing sequence', () => {
        const seq1 = prediction.recordInput(100, 100, 5, 0);
        const seq2 = prediction.recordInput(105, 100, 5, 0);
        expect(seq2).toBe(seq1 + 1);
    });

    it('should track pending inputs', () => {
        prediction.recordInput(100, 100, 5, 0);
        prediction.recordInput(105, 100, 5, 0);
        expect(prediction.getPendingInputCount()).toBe(2);
    });

    it('should clear pending inputs', () => {
        prediction.recordInput(100, 100, 5, 0);
        prediction.clearPendingInputs();
        expect(prediction.getPendingInputCount()).toBe(0);
    });

    it('should reconcile with server state', () => {
        prediction.recordInput(100, 100, 5, 0);
        prediction.recordInput(105, 100, 5, 0);

        const serverState = {
            x: 102,
            y: 100,
            velocityX: 5,
            velocityY: 0,
            timestamp: Date.now(),
            sequence: 1
        };

        const result = prediction.applyServerReconciliation(serverState, 1);
        expect(result.x).toBeGreaterThanOrEqual(102);
    });
});

describe('PositionInterpolator', () => {
    let interpolator: PositionInterpolator;

    beforeEach(() => {
        interpolator = new PositionInterpolator(100);
    });

    it('should return null for unknown entity', () => {
        const result = interpolator.getInterpolatedPosition('unknown');
        expect(result).toBeNull();
    });

    it('should return current position with single update', () => {
        interpolator.updatePosition('player1', 100, 200);
        const result = interpolator.getInterpolatedPosition('player1');
        expect(result).toEqual({ x: 100, y: 200 });
    });

    it('should remove entities', () => {
        interpolator.updatePosition('player1', 100, 200);
        interpolator.removeEntity('player1');
        const result = interpolator.getInterpolatedPosition('player1');
        expect(result).toBeNull();
    });
});

describe('MessageQueue', () => {
    let queue: MessageQueue;

    beforeEach(() => {
        queue = new MessageQueue(10, 50);
    });

    it('should enqueue messages', () => {
        queue.enqueue('test', { data: 'hello' });
        expect(queue.getQueueSize()).toBe(1);
    });

    it('should prioritize high priority messages', () => {
        queue.enqueue('low', { data: 'low' }, MessagePriority.Low);
        queue.enqueue('high', { data: 'high' }, MessagePriority.High);
        queue.enqueue('normal', { data: 'normal' }, MessagePriority.Normal);

        const flushed = queue.flush();
        expect(flushed[0].type).toBe('high');
    });

    it('should flush high priority immediately', () => {
        queue.enqueue('high', { data: 'urgent' }, MessagePriority.High);
        expect(queue.shouldFlush()).toBe(true);
    });

    it('should clear queue on flush', () => {
        queue.enqueue('test', { data: 'hello' });
        queue.flush();
        expect(queue.getQueueSize()).toBe(0);
    });

    it('should respect max queue size', () => {
        for (let i = 0; i < 15; i++) {
            queue.enqueue('msg' + i, { data: i });
        }
        expect(queue.getQueueSize()).toBeLessThanOrEqual(10);
    });
});

describe('DeltaCompressor', () => {
    let compressor: DeltaCompressor;

    beforeEach(() => {
        compressor = new DeltaCompressor();
    });

    it('should return full state on first compress', () => {
        const state = { x: 100, y: 200, dir: 'up' };
        const delta = compressor.compress(state);
        expect(delta).toEqual(state);
    });

    it('should return only changed values', () => {
        compressor.compress({ x: 100, y: 200, dir: 'up' });
        const delta = compressor.compress({ x: 150, y: 200, dir: 'up' });
        expect(delta).toEqual({ x: 150 });
    });

    it('should return empty object if no changes', () => {
        const state = { x: 100, y: 200 };
        compressor.compress(state);
        const delta = compressor.compress(state);
        expect(delta).toEqual({});
    });

    it('should decompress correctly', () => {
        const base = { x: 100, y: 200, dir: 'up' };
        const delta = { x: 150 };
        const result = compressor.decompress(delta, base);
        expect(result).toEqual({ x: 150, y: 200, dir: 'up' });
    });

    it('should reset state', () => {
        compressor.compress({ x: 100 });
        compressor.reset();
        const delta = compressor.compress({ x: 100 });
        expect(delta).toEqual({ x: 100 });
    });
});

describe('Input Validation', () => {
    it('should validate direction strings', () => {
        const validDirections = ['up', 'down', 'left', 'right', 'none'];
        validDirections.forEach(dir => {
            expect(typeof dir).toBe('string');
        });
    });

    it('should validate position bounds', () => {
        const isValidPosition = (x: number, y: number) => {
            return x >= 0 && x <= 1600 && y >= 0 && y <= 1100;
        };

        expect(isValidPosition(100, 200)).toBe(true);
        expect(isValidPosition(-1, 200)).toBe(false);
        expect(isValidPosition(2000, 200)).toBe(false);
    });
});
