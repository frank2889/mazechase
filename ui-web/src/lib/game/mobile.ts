// Mobile touch controls for MazeChase game
import Phaser from 'phaser';

/**
 * Touch Control Types
 */
export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export interface TouchState {
    direction: Direction;
    isActive: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

/**
 * Virtual Joystick for mobile control
 */
export class VirtualJoystick {
    private scene: Phaser.Scene;
    private base: Phaser.GameObjects.Arc;
    private thumb: Phaser.GameObjects.Arc;
    private isActive: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private direction: Direction = 'none';
    private deadzone: number;
    private maxDistance: number;

    constructor(scene: Phaser.Scene, options: JoystickOptions = {}) {
        this.scene = scene;
        this.deadzone = options.deadzone ?? 20;
        this.maxDistance = options.maxDistance ?? 60;

        const baseX = options.x ?? 150;
        const baseY = options.y ?? scene.scale.height - 150;

        // Create joystick base
        this.base = scene.add.circle(baseX, baseY, 70, 0x333333, 0.5);
        this.base.setScrollFactor(0);
        this.base.setDepth(1000);

        // Create joystick thumb
        this.thumb = scene.add.circle(baseX, baseY, 35, 0x666666, 0.8);
        this.thumb.setScrollFactor(0);
        this.thumb.setDepth(1001);

        this.setupInput();
    }

    private setupInput(): void {
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isInJoystickArea(pointer.x, pointer.y)) {
                this.isActive = true;
                this.startX = pointer.x;
                this.startY = pointer.y;
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isActive) {
                this.updateThumbPosition(pointer.x, pointer.y);
            }
        });

        this.scene.input.on('pointerup', () => {
            this.resetJoystick();
        });
    }

    private isInJoystickArea(x: number, y: number): boolean {
        const dx = x - this.base.x;
        const dy = y - this.base.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.base.radius * 2;
    }

    private updateThumbPosition(x: number, y: number): void {
        let dx = x - this.base.x;
        let dy = y - this.base.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max distance
        if (distance > this.maxDistance) {
            dx = (dx / distance) * this.maxDistance;
            dy = (dy / distance) * this.maxDistance;
        }

        this.thumb.x = this.base.x + dx;
        this.thumb.y = this.base.y + dy;

        // Calculate direction
        if (distance > this.deadzone) {
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            this.direction = this.angleToDirection(angle);
        } else {
            this.direction = 'none';
        }
    }

    private angleToDirection(angle: number): Direction {
        if (angle >= -45 && angle < 45) return 'right';
        if (angle >= 45 && angle < 135) return 'down';
        if (angle >= -135 && angle < -45) return 'up';
        return 'left';
    }

    private resetJoystick(): void {
        this.isActive = false;
        this.direction = 'none';
        this.thumb.x = this.base.x;
        this.thumb.y = this.base.y;
    }

    getDirection(): Direction {
        return this.direction;
    }

    isPressed(): boolean {
        return this.isActive && this.direction !== 'none';
    }

    destroy(): void {
        this.base.destroy();
        this.thumb.destroy();
    }

    setVisible(visible: boolean): void {
        this.base.setVisible(visible);
        this.thumb.setVisible(visible);
    }

    setPosition(x: number, y: number): void {
        this.base.x = x;
        this.base.y = y;
        this.thumb.x = x;
        this.thumb.y = y;
    }
}

interface JoystickOptions {
    x?: number;
    y?: number;
    deadzone?: number;
    maxDistance?: number;
}

/**
 * Swipe Controls for mobile
 */
export class SwipeControls {
    private scene: Phaser.Scene;
    private startX: number = 0;
    private startY: number = 0;
    private direction: Direction = 'none';
    private minSwipeDistance: number;
    private swipeTimeout: number;
    private lastSwipeTime: number = 0;

    constructor(scene: Phaser.Scene, options: SwipeOptions = {}) {
        this.scene = scene;
        this.minSwipeDistance = options.minSwipeDistance ?? 50;
        this.swipeTimeout = options.swipeTimeout ?? 300;

        this.setupInput();
    }

    private setupInput(): void {
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.startX = pointer.x;
            this.startY = pointer.y;
            this.lastSwipeTime = Date.now();
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const elapsed = Date.now() - this.lastSwipeTime;
            if (elapsed <= this.swipeTimeout) {
                this.detectSwipe(pointer.x, pointer.y);
            }
        });
    }

    private detectSwipe(endX: number, endY: number): void {
        const dx = endX - this.startX;
        const dy = endY - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= this.minSwipeDistance) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }
        }
    }

    getDirection(): Direction {
        const dir = this.direction;
        this.direction = 'none'; // Clear after reading
        return dir;
    }

    hasSwipe(): boolean {
        return this.direction !== 'none';
    }
}

interface SwipeOptions {
    minSwipeDistance?: number;
    swipeTimeout?: number;
}

/**
 * D-Pad Touch Controls
 */
export class DPadControls {
    private scene: Phaser.Scene;
    private buttons: Map<Direction, Phaser.GameObjects.Arc> = new Map();
    private activeDirection: Direction = 'none';
    private container: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, options: DPadOptions = {}) {
        this.scene = scene;

        const x = options.x ?? 120;
        const y = options.y ?? scene.scale.height - 120;
        const size = options.size ?? 40;
        const spacing = options.spacing ?? 10;

        this.container = scene.add.container(x, y);
        this.container.setScrollFactor(0);
        this.container.setDepth(1000);

        // Create D-pad buttons
        this.createButton('up', 0, -(size + spacing), size);
        this.createButton('down', 0, size + spacing, size);
        this.createButton('left', -(size + spacing), 0, size);
        this.createButton('right', size + spacing, 0, size);

        // Center button (optional visual)
        const center = scene.add.circle(0, 0, size * 0.7, 0x222222, 0.5);
        this.container.add(center);
    }

    private createButton(direction: Direction, x: number, y: number, size: number): void {
        const button = this.scene.add.circle(x, y, size, 0x444444, 0.7);
        button.setInteractive();

        // Add direction indicator
        const arrowMap: Record<Direction, string> = {
            up: '▲',
            down: '▼',
            left: '◄',
            right: '►',
            none: ''
        };

        const text = this.scene.add.text(x, y, arrowMap[direction], {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.container.add([button, text]);

        button.on('pointerdown', () => {
            this.activeDirection = direction;
            button.setFillStyle(0x666666);
        });

        button.on('pointerup', () => {
            this.activeDirection = 'none';
            button.setFillStyle(0x444444);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x444444);
        });

        this.buttons.set(direction, button);
    }

    getDirection(): Direction {
        return this.activeDirection;
    }

    isPressed(): boolean {
        return this.activeDirection !== 'none';
    }

    destroy(): void {
        this.container.destroy();
    }

    setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }
}

interface DPadOptions {
    x?: number;
    y?: number;
    size?: number;
    spacing?: number;
}

/**
 * Mobile Control Manager
 * Manages all mobile input types and provides unified interface
 */
export class MobileControlManager {
    private scene: Phaser.Scene;
    private joystick: VirtualJoystick | null = null;
    private swipe: SwipeControls | null = null;
    private dpad: DPadControls | null = null;
    private activeControlType: ControlType;
    private isMobile: boolean;

    constructor(scene: Phaser.Scene, controlType: ControlType = ControlType.Auto) {
        this.scene = scene;
        this.isMobile = this.detectMobile();

        if (controlType === ControlType.Auto) {
            this.activeControlType = this.isMobile ? ControlType.Joystick : ControlType.Keyboard;
        } else {
            this.activeControlType = controlType;
        }

        this.initializeControls();
    }

    private detectMobile(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    private initializeControls(): void {
        if (!this.isMobile) return;

        switch (this.activeControlType) {
            case ControlType.Joystick:
                this.joystick = new VirtualJoystick(this.scene);
                break;
            case ControlType.Swipe:
                this.swipe = new SwipeControls(this.scene);
                break;
            case ControlType.DPad:
                this.dpad = new DPadControls(this.scene);
                break;
        }
    }

    getDirection(): Direction {
        if (this.joystick) return this.joystick.getDirection();
        if (this.swipe) return this.swipe.getDirection();
        if (this.dpad) return this.dpad.getDirection();
        return 'none';
    }

    isPressed(): boolean {
        if (this.joystick) return this.joystick.isPressed();
        if (this.dpad) return this.dpad.isPressed();
        if (this.swipe) return this.swipe.hasSwipe();
        return false;
    }

    isMobileDevice(): boolean {
        return this.isMobile;
    }

    switchControlType(type: ControlType): void {
        // Cleanup existing controls
        this.joystick?.destroy();
        this.dpad?.destroy();

        this.joystick = null;
        this.swipe = null;
        this.dpad = null;

        this.activeControlType = type;
        this.initializeControls();
    }

    setVisible(visible: boolean): void {
        this.joystick?.setVisible(visible);
        this.dpad?.setVisible(visible);
    }

    destroy(): void {
        this.joystick?.destroy();
        this.dpad?.destroy();
    }
}

export enum ControlType {
    Auto = 'auto',
    Keyboard = 'keyboard',
    Joystick = 'joystick',
    Swipe = 'swipe',
    DPad = 'dpad'
}

/**
 * Responsive UI helper for mobile
 */
export class ResponsiveUI {
    static getScale(scene: Phaser.Scene): number {
        const baseWidth = 1550;
        const currentWidth = scene.scale.width;
        return Math.min(currentWidth / baseWidth, 1);
    }

    static isMobile(): boolean {
        return window.innerWidth <= 768;
    }

    static isTablet(): boolean {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    static getOptimalFontSize(baseFontSize: number, scene: Phaser.Scene): number {
        return Math.round(baseFontSize * this.getScale(scene));
    }

    static setupViewport(): void {
        // Prevent pinch zoom
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.setAttribute('content',
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
            );
        }

        // Prevent pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
    }
}
