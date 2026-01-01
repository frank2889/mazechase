/**
 * Input Manager - Debouncing and Throttling System
 * 
 * AI Tester Suggestion (Alex - Technical QA Engineer):
 * "Implement input debouncing and throttling to prevent overflow.
 * Rapid inputs can cause desynchronized game state updates."
 * 
 * Features:
 * - Input debouncing for UI actions
 * - Throttling for movement inputs
 * - Input queue for network-synced actions
 * - Touch gesture handling with dead zones
 */

export type InputAction = 
    | 'move_up' | 'move_down' | 'move_left' | 'move_right'
    | 'use_powerup' | 'pause' | 'chat' | 'emote'
    | 'ui_click' | 'ui_submit';

export interface InputConfig {
    movementThrottleMs: number;      // Min time between movement inputs
    actionDebounceMs: number;        // Debounce for UI actions
    touchDeadZone: number;           // Pixels before touch registers as move
    maxQueuedInputs: number;         // Max inputs in queue
    networkSyncInterval: number;     // Batch network sends
}

interface QueuedInput {
    action: InputAction;
    timestamp: number;
    data?: any;
}

const DEFAULT_CONFIG: InputConfig = {
    movementThrottleMs: 16,          // ~60fps max
    actionDebounceMs: 200,           // 200ms debounce for clicks
    touchDeadZone: 10,               // 10px dead zone
    maxQueuedInputs: 10,             // Buffer 10 inputs max
    networkSyncInterval: 50          // Send every 50ms
};

/**
 * InputManager - Handles all game input with debouncing/throttling
 */
export class InputManager {
    private config: InputConfig;
    private lastInputTime: Map<InputAction, number> = new Map();
    private inputQueue: QueuedInput[] = [];
    private pendingCallbacks: Map<InputAction, number> = new Map(); // debounce timers
    private listeners: Map<InputAction, Set<(data?: any) => void>> = new Map();
    
    // Touch state
    private touchStartPos: { x: number; y: number } | null = null;
    private lastTouchDirection: string | null = null;
    
    // Network sync
    private networkBuffer: QueuedInput[] = [];
    private networkSyncTimer: number | null = null;
    private onNetworkSync?: (inputs: QueuedInput[]) => void;

    constructor(config: Partial<InputConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize keyboard and touch listeners
     */
    initialize(element: HTMLElement): void {
        // Keyboard input
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Touch input
        element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Start network sync loop
        this.startNetworkSync();
        
        console.log('[InputManager] Initialized with throttle:', this.config.movementThrottleMs, 'ms');
    }

    /**
     * Handle keyboard input
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // Ignore if typing in an input field
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }

        let action: InputAction | null = null;

        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                action = 'move_up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                action = 'move_down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                action = 'move_left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                action = 'move_right';
                break;
            case ' ':
                action = 'use_powerup';
                break;
            case 'Escape':
                action = 'pause';
                break;
            case 'Enter':
                action = 'chat';
                break;
        }

        if (action) {
            event.preventDefault();
            this.processInput(action);
        }
    }

    private handleKeyUp(_event: KeyboardEvent): void {
        // Can be used for hold-based mechanics
    }

    /**
     * Handle touch input
     */
    private handleTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            if (!touch) return;
            this.touchStartPos = { x: touch.clientX, y: touch.clientY };
            this.lastTouchDirection = null;
        }
    }

    private handleTouchMove(event: TouchEvent): void {
        if (!this.touchStartPos || event.touches.length !== 1) return;

        const touch = event.touches[0];
        if (!touch) return;
        const dx = touch.clientX - this.touchStartPos.x;
        const dy = touch.clientY - this.touchStartPos.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only process if outside dead zone
        if (distance < this.config.touchDeadZone) return;

        // Determine direction
        let action: InputAction;
        if (Math.abs(dx) > Math.abs(dy)) {
            action = dx > 0 ? 'move_right' : 'move_left';
        } else {
            action = dy > 0 ? 'move_down' : 'move_up';
        }

        // Prevent same direction spam
        const dirKey = action;
        if (this.lastTouchDirection !== dirKey) {
            this.lastTouchDirection = dirKey;
            this.processInput(action);
            
            // Reset start position for continuous swiping
            this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        }

        event.preventDefault();
    }

    private handleTouchEnd(_event: TouchEvent): void {
        this.touchStartPos = null;
        this.lastTouchDirection = null;
    }

    /**
     * Process an input action with throttling/debouncing
     */
    processInput(action: InputAction, data?: any): boolean {
        const now = Date.now();
        const lastTime = this.lastInputTime.get(action) || 0;
        
        // Movement actions use throttling
        if (action.startsWith('move_')) {
            if (now - lastTime < this.config.movementThrottleMs) {
                // Throttled - skip this input
                return false;
            }
            
            this.lastInputTime.set(action, now);
            this.emitInput(action, data);
            this.queueForNetwork(action, data);
            return true;
        }
        
        // UI/action inputs use debouncing
        const pendingTimer = this.pendingCallbacks.get(action);
        if (pendingTimer) {
            clearTimeout(pendingTimer);
        }
        
        const timer = window.setTimeout(() => {
            this.pendingCallbacks.delete(action);
            this.lastInputTime.set(action, Date.now());
            this.emitInput(action, data);
            this.queueForNetwork(action, data);
        }, this.config.actionDebounceMs);
        
        this.pendingCallbacks.set(action, timer);
        return true;
    }

    /**
     * Queue input for network synchronization
     */
    private queueForNetwork(action: InputAction, data?: any): void {
        if (this.networkBuffer.length >= this.config.maxQueuedInputs) {
            // Drop oldest input
            this.networkBuffer.shift();
        }
        
        this.networkBuffer.push({
            action,
            timestamp: Date.now(),
            data
        });
    }

    /**
     * Start network sync loop
     */
    private startNetworkSync(): void {
        if (this.networkSyncTimer) return;
        
        this.networkSyncTimer = window.setInterval(() => {
            if (this.networkBuffer.length > 0 && this.onNetworkSync) {
                this.onNetworkSync([...this.networkBuffer]);
                this.networkBuffer = [];
            }
        }, this.config.networkSyncInterval);
    }

    /**
     * Stop network sync loop
     */
    private stopNetworkSync(): void {
        if (this.networkSyncTimer) {
            clearInterval(this.networkSyncTimer);
            this.networkSyncTimer = null;
        }
    }

    /**
     * Emit input to listeners
     */
    private emitInput(action: InputAction, data?: any): void {
        const callbacks = this.listeners.get(action);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error('[InputManager] Callback error:', e);
                }
            });
        }
    }

    /**
     * Register listener for an action
     */
    on(action: InputAction, callback: (data?: any) => void): () => void {
        if (!this.listeners.has(action)) {
            this.listeners.set(action, new Set());
        }
        this.listeners.get(action)!.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(action)?.delete(callback);
        };
    }

    /**
     * Register callback for batched network sync
     */
    onNetworkBatch(callback: (inputs: QueuedInput[]) => void): void {
        this.onNetworkSync = callback;
    }

    /**
     * Get input stats for debugging
     */
    getStats(): {
        queuedInputs: number;
        networkBufferSize: number;
        lastInputTimes: Record<string, number>;
    } {
        const lastInputTimes: Record<string, number> = {};
        this.lastInputTime.forEach((time, action) => {
            lastInputTimes[action] = Date.now() - time;
        });
        
        return {
            queuedInputs: this.inputQueue.length,
            networkBufferSize: this.networkBuffer.length,
            lastInputTimes
        };
    }

    /**
     * Clean up
     */
    destroy(): void {
        this.stopNetworkSync();
        this.pendingCallbacks.forEach(timer => clearTimeout(timer));
        this.pendingCallbacks.clear();
        this.listeners.clear();
        this.inputQueue = [];
        this.networkBuffer = [];
    }
}

// Singleton
let inputManager: InputManager | null = null;

export function getInputManager(): InputManager {
    if (!inputManager) {
        inputManager = new InputManager();
    }
    return inputManager;
}

/**
 * Utility: Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = window.setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}

/**
 * Utility: Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Enhanced Touch Input System
 * 
 * AI Tester Suggestion (Alex - Tech Lead):
 * "Verbeter touch responsiveness voor mobiele spelers.
 * Huidige touch input heeft merkbare latency."
 * 
 * Features improved touch handling with:
 * - Predictive touch
 * - Gesture recognition
 * - Haptic feedback
 * - Adaptive dead zones
 */
export interface TouchConfig {
    deadZone: number;
    swipeThreshold: number;
    tapTimeout: number;
    doubleTapTimeout: number;
    longPressTimeout: number;
    velocityTracking: boolean;
    predictiveInput: boolean;
    hapticEnabled: boolean;
}

export interface TouchGesture {
    type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pan';
    direction?: 'up' | 'down' | 'left' | 'right';
    position: { x: number; y: number };
    velocity?: { x: number; y: number };
    distance?: number;
    duration: number;
}

interface TouchState {
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    velocityX: number;
    velocityY: number;
    isActive: boolean;
}

const DEFAULT_TOUCH_CONFIG: TouchConfig = {
    deadZone: 15,
    swipeThreshold: 50,
    tapTimeout: 200,
    doubleTapTimeout: 300,
    longPressTimeout: 500,
    velocityTracking: true,
    predictiveInput: true,
    hapticEnabled: true
};

/**
 * EnhancedTouchInput - Improved mobile touch handling
 */
export class EnhancedTouchInput {
    private config: TouchConfig;
    private touchState: TouchState | null = null;
    private lastTapTime: number = 0;
    private longPressTimer: number | null = null;
    private onGestureCallbacks: ((gesture: TouchGesture) => void)[] = [];

    constructor(config: Partial<TouchConfig> = {}) {
        this.config = { ...DEFAULT_TOUCH_CONFIG, ...config };
    }

    /**
     * Initialize touch handling on element
     */
    initialize(element: HTMLElement): void {
        // Bind touch events to the provided element

        element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

        console.log('[EnhancedTouchInput] Initialized with deadZone:', this.config.deadZone);
    }

    /**
     * Handle touch start
     */
    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault();

        const touch = event.touches[0];
        if (!touch) return;
        const now = performance.now();

        this.touchState = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: now,
            lastX: touch.clientX,
            lastY: touch.clientY,
            lastTime: now,
            velocityX: 0,
            velocityY: 0,
            isActive: true
        };

        // Start long press timer
        this.longPressTimer = window.setTimeout(() => {
            if (this.touchState?.isActive) {
                const gesture: TouchGesture = {
                    type: 'long-press',
                    position: { x: this.touchState.startX, y: this.touchState.startY },
                    duration: performance.now() - this.touchState.startTime
                };
                this.emitGesture(gesture);
                this.hapticFeedback('heavy');
            }
        }, this.config.longPressTimeout);
    }

    /**
     * Handle touch move
     */
    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();

        if (!this.touchState?.isActive) return;

        const touch = event.touches[0];
        if (!touch) return;
        const now = performance.now();
        const dt = now - this.touchState.lastTime;

        // Calculate velocity
        if (this.config.velocityTracking && dt > 0) {
            this.touchState.velocityX = (touch.clientX - this.touchState.lastX) / dt;
            this.touchState.velocityY = (touch.clientY - this.touchState.lastY) / dt;
        }

        // Update last position
        this.touchState.lastX = touch.clientX;
        this.touchState.lastY = touch.clientY;
        this.touchState.lastTime = now;

        // Check for swipe during move (for continuous pan)
        const dx = touch.clientX - this.touchState.startX;
        const dy = touch.clientY - this.touchState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Cancel long press if moved beyond dead zone
        if (distance > this.config.deadZone && this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        // Emit pan gesture for continuous movement
        if (distance > this.config.deadZone) {
            const direction = this.getSwipeDirection(dx, dy);
            const gesture: TouchGesture = {
                type: 'pan',
                direction,
                position: { x: touch.clientX, y: touch.clientY },
                velocity: { x: this.touchState.velocityX, y: this.touchState.velocityY },
                distance,
                duration: now - this.touchState.startTime
            };
            this.emitGesture(gesture);
        }
    }

    /**
     * Handle touch end
     */
    private handleTouchEnd(event: TouchEvent): void {
        event.preventDefault();

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (!this.touchState) return;

        const now = performance.now();
        const duration = now - this.touchState.startTime;
        const dx = this.touchState.lastX - this.touchState.startX;
        const dy = this.touchState.lastY - this.touchState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Determine gesture type
        if (distance < this.config.deadZone) {
            // Tap or double-tap
            if (now - this.lastTapTime < this.config.doubleTapTimeout) {
                const gesture: TouchGesture = {
                    type: 'double-tap',
                    position: { x: this.touchState.startX, y: this.touchState.startY },
                    duration
                };
                this.emitGesture(gesture);
                this.hapticFeedback('medium');
                this.lastTapTime = 0;
            } else if (duration < this.config.tapTimeout) {
                const gesture: TouchGesture = {
                    type: 'tap',
                    position: { x: this.touchState.startX, y: this.touchState.startY },
                    duration
                };
                this.emitGesture(gesture);
                this.hapticFeedback('light');
                this.lastTapTime = now;
            }
        } else if (distance >= this.config.swipeThreshold) {
            // Swipe
            const direction = this.getSwipeDirection(dx, dy);
            
            // Predictive input: apply velocity for smoother feel
            let predictedDirection = direction;
            if (this.config.predictiveInput) {
                const predictedDx = dx + this.touchState.velocityX * 50;
                const predictedDy = dy + this.touchState.velocityY * 50;
                predictedDirection = this.getSwipeDirection(predictedDx, predictedDy);
            }

            const gesture: TouchGesture = {
                type: 'swipe',
                direction: predictedDirection,
                position: { x: this.touchState.lastX, y: this.touchState.lastY },
                velocity: { x: this.touchState.velocityX, y: this.touchState.velocityY },
                distance,
                duration
            };
            this.emitGesture(gesture);
            this.hapticFeedback('light');
        }

        this.touchState.isActive = false;
    }

    /**
     * Handle touch cancel
     */
    private handleTouchCancel(_event: TouchEvent): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        if (this.touchState) {
            this.touchState.isActive = false;
        }
    }

    /**
     * Get swipe direction from delta
     */
    private getSwipeDirection(dx: number, dy: number): 'up' | 'down' | 'left' | 'right' {
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * Trigger haptic feedback
     */
    private hapticFeedback(intensity: 'light' | 'medium' | 'heavy'): void {
        if (!this.config.hapticEnabled) return;

        if ('vibrate' in navigator) {
            const durations: Record<string, number> = {
                light: 10,
                medium: 25,
                heavy: 50
            };
            const duration = durations[intensity] ?? 25;
            navigator.vibrate(duration);
        }
    }

    /**
     * Emit gesture to listeners
     */
    private emitGesture(gesture: TouchGesture): void {
        this.onGestureCallbacks.forEach(cb => cb(gesture));
    }

    /**
     * Subscribe to gestures
     */
    onGesture(callback: (gesture: TouchGesture) => void): () => void {
        this.onGestureCallbacks.push(callback);
        return () => {
            this.onGestureCallbacks = this.onGestureCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Update config
     */
    updateConfig(config: Partial<TouchConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current config
     */
    getConfig(): TouchConfig {
        return { ...this.config };
    }
}

// Singleton
let enhancedTouchInput: EnhancedTouchInput | null = null;

export function getEnhancedTouchInput(): EnhancedTouchInput {
    if (!enhancedTouchInput) {
        enhancedTouchInput = new EnhancedTouchInput();
    }
    return enhancedTouchInput;
}
