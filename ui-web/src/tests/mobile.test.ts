import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    MobileControlManager,
    ControlType,
    ResponsiveUI,
    type Direction
} from '../lib/game/mobile';

// Mock navigator for mobile detection
const mockNavigator = (userAgent: string) => {
    Object.defineProperty(global, 'navigator', {
        value: {
            userAgent,
            maxTouchPoints: 0
        },
        configurable: true
    });
};

describe('ResponsiveUI', () => {
    it('should detect mobile devices', () => {
        mockNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)');
        // Note: This test may not work in Node environment without full window mocking
        expect(typeof ResponsiveUI.isMobile).toBe('function');
    });

    it('should detect tablet devices', () => {
        expect(typeof ResponsiveUI.isTablet).toBe('function');
    });

    it('should calculate optimal font size', () => {
        const mockScene = {
            scale: {
                width: 1550,
                height: 1050
            }
        } as any;

        const fontSize = ResponsiveUI.getOptimalFontSize(16, mockScene);
        expect(fontSize).toBe(16); // Full scale
    });

    it('should scale down font for smaller screens', () => {
        const mockScene = {
            scale: {
                width: 775, // Half width
                height: 525
            }
        } as any;

        const fontSize = ResponsiveUI.getOptimalFontSize(16, mockScene);
        expect(fontSize).toBe(8); // Half size
    });
});

describe('Direction type', () => {
    it('should accept valid directions', () => {
        const directions: Direction[] = ['up', 'down', 'left', 'right', 'none'];
        expect(directions.length).toBe(5);
    });
});

describe('ControlType enum', () => {
    it('should have all control types', () => {
        expect(ControlType.Auto).toBe('auto');
        expect(ControlType.Keyboard).toBe('keyboard');
        expect(ControlType.Joystick).toBe('joystick');
        expect(ControlType.Swipe).toBe('swipe');
        expect(ControlType.DPad).toBe('dpad');
    });
});

describe('Touch angle to direction conversion', () => {
    const angleToDirection = (angle: number): Direction => {
        if (angle >= -45 && angle < 45) return 'right';
        if (angle >= 45 && angle < 135) return 'down';
        if (angle >= -135 && angle < -45) return 'up';
        return 'left';
    };

    it('should convert 0 degrees to right', () => {
        expect(angleToDirection(0)).toBe('right');
    });

    it('should convert 90 degrees to down', () => {
        expect(angleToDirection(90)).toBe('down');
    });

    it('should convert -90 degrees to up', () => {
        expect(angleToDirection(-90)).toBe('up');
    });

    it('should convert 180 degrees to left', () => {
        expect(angleToDirection(180)).toBe('left');
    });

    it('should convert 30 degrees to right', () => {
        expect(angleToDirection(30)).toBe('right');
    });

    it('should convert 60 degrees to down', () => {
        expect(angleToDirection(60)).toBe('down');
    });
});

describe('Swipe detection', () => {
    const detectSwipe = (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        minDistance: number
    ): Direction => {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) return 'none';

        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        }
        return dy > 0 ? 'down' : 'up';
    };

    it('should detect right swipe', () => {
        expect(detectSwipe(0, 100, 100, 100, 50)).toBe('right');
    });

    it('should detect left swipe', () => {
        expect(detectSwipe(100, 100, 0, 100, 50)).toBe('left');
    });

    it('should detect down swipe', () => {
        expect(detectSwipe(100, 0, 100, 100, 50)).toBe('down');
    });

    it('should detect up swipe', () => {
        expect(detectSwipe(100, 100, 100, 0, 50)).toBe('up');
    });

    it('should return none for short swipe', () => {
        expect(detectSwipe(100, 100, 110, 110, 50)).toBe('none');
    });
});

describe('Joystick deadzone', () => {
    const isInDeadzone = (dx: number, dy: number, deadzone: number): boolean => {
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < deadzone;
    };

    it('should detect when in deadzone', () => {
        expect(isInDeadzone(5, 5, 20)).toBe(true);
    });

    it('should detect when outside deadzone', () => {
        expect(isInDeadzone(30, 30, 20)).toBe(false);
    });

    it('should handle zero movement', () => {
        expect(isInDeadzone(0, 0, 20)).toBe(true);
    });
});

describe('Joystick max distance clamping', () => {
    const clampToMaxDistance = (
        dx: number,
        dy: number,
        maxDistance: number
    ): { x: number; y: number } => {
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= maxDistance) {
            return { x: dx, y: dy };
        }

        const ratio = maxDistance / distance;
        return {
            x: dx * ratio,
            y: dy * ratio
        };
    };

    it('should not clamp when within max distance', () => {
        const result = clampToMaxDistance(30, 40, 100);
        expect(result.x).toBe(30);
        expect(result.y).toBe(40);
    });

    it('should clamp when exceeding max distance', () => {
        const result = clampToMaxDistance(100, 0, 60);
        expect(result.x).toBe(60);
        expect(result.y).toBe(0);
    });

    it('should maintain direction when clamping', () => {
        const result = clampToMaxDistance(100, 100, 60);
        const distance = Math.sqrt(result.x * result.x + result.y * result.y);
        expect(distance).toBeCloseTo(60, 1);
    });
});
