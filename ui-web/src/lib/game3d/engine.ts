/**
 * Babylon.js Engine Wrapper for MazeChase 3D
 * 
 * This module provides the core 3D engine setup and utilities.
 */

import { Engine, Scene, ArcRotateCamera, HemisphericLight, PointLight, Vector3, Color4, Color3 } from '@babylonjs/core';

export interface GameEngineConfig {
    canvas: HTMLCanvasElement;
    antialias?: boolean;
}

export class GameEngine {
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private isRunning: boolean = false;

    constructor(config: GameEngineConfig) {
        // Create the Babylon.js engine
        this.engine = new Engine(config.canvas, config.antialias ?? true, {
            preserveDrawingBuffer: true,
            stencil: true
        });

        // Create the scene
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1); // Dark blue background

        // Create isometric-style camera
        this.camera = new ArcRotateCamera(
            'mainCamera',
            -Math.PI / 4,      // Alpha (horizontal rotation)
            Math.PI / 3,       // Beta (vertical angle - about 60 degrees)
            50,                // Radius (distance from target)
            new Vector3(15, 0, 10), // Target (center of typical maze)
            this.scene
        );
        
        // Camera limits for isometric feel
        this.camera.lowerBetaLimit = Math.PI / 4;   // Min 45 degrees
        this.camera.upperBetaLimit = Math.PI / 2.5; // Max ~72 degrees
        this.camera.lowerRadiusLimit = 20;
        this.camera.upperRadiusLimit = 100;
        
        // Enable zoom with mouse wheel only
        this.camera.attachControl(config.canvas, false);
        this.camera.inputs.removeByType('ArcRotateCameraPointersInput'); // Disable mouse drag
        this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput'); // Disable keyboard
        
        // Custom zoom handler for smoother control
        this.setupZoomControls(config.canvas);

        // Add ambient lighting
        const ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.6;
        ambientLight.groundColor = new Color4(0.2, 0.2, 0.3, 1) as any;

        // Add accent point lights for atmosphere
        this.addAtmosphereLights();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    /**
     * Add atmospheric point lights for visual depth
     */
    private addAtmosphereLights(): void {
        // Cyan accent light (top-left)
        const cyanLight = new PointLight(
            'cyanLight',
            new Vector3(5, 8, 5),
            this.scene
        );
        cyanLight.diffuse = new Color3(0, 0.8, 1);
        cyanLight.specular = new Color3(0, 0.5, 0.8);
        cyanLight.intensity = 0.4;
        cyanLight.range = 30;

        // Magenta accent light (bottom-right)
        const magentaLight = new PointLight(
            'magentaLight',
            new Vector3(25, 8, 20),
            this.scene
        );
        magentaLight.diffuse = new Color3(1, 0.2, 0.8);
        magentaLight.specular = new Color3(0.8, 0.1, 0.6);
        magentaLight.intensity = 0.3;
        magentaLight.range = 30;

        // Central warm light
        const warmLight = new PointLight(
            'warmLight',
            new Vector3(15, 10, 12),
            this.scene
        );
        warmLight.diffuse = new Color3(1, 0.9, 0.7);
        warmLight.specular = new Color3(1, 1, 0.8);
        warmLight.intensity = 0.5;
        warmLight.range = 40;
    }

    get babylonScene(): Scene {
        return this.scene;
    }

    get babylonEngine(): Engine {
        return this.engine;
    }

    get mainCamera(): ArcRotateCamera {
        return this.camera;
    }

    /**
     * Start the render loop
     */
    start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Stop the render loop
     */
    stop(): void {
        this.isRunning = false;
        this.engine.stopRenderLoop();
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.stop();
        this.scene.dispose();
        this.engine.dispose();
    }

    /**
     * Check if WebGL is supported
     */
    static isSupported(): boolean {
        return Engine.isSupported();
    }

    /**
     * Focus camera on a specific position
     */
    focusOn(x: number, z: number): void {
        this.camera.setTarget(new Vector3(x, 0, z));
    }

    /**
     * Smoothly follow a target position
     */
    private targetFollowPos: Vector3 | null = null;
    private followLerpSpeed: number = 3;

    followTarget(x: number, z: number): void {
        this.targetFollowPos = new Vector3(x, 0, z);
    }

    /**
     * Update camera follow (call in render loop)
     */
    updateCameraFollow(deltaTime: number): void {
        if (!this.targetFollowPos) return;
        
        const currentTarget = this.camera.target;
        const lerpFactor = Math.min(1, this.followLerpSpeed * deltaTime);
        
        const newTarget = Vector3.Lerp(currentTarget, this.targetFollowPos, lerpFactor);
        this.camera.setTarget(newTarget);
    }

    /**
     * Set camera follow speed
     */
    setFollowSpeed(speed: number): void {
        this.followLerpSpeed = speed;
    }

    /**
     * Get current FPS
     */
    getFPS(): number {
        return this.engine.getFps();
    }

    /**
     * Setup zoom controls with mouse wheel
     */
    private setupZoomControls(canvas: HTMLCanvasElement): void {
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            
            const zoomSpeed = 0.1;
            const delta = event.deltaY > 0 ? 1 : -1;
            const newRadius = this.camera.radius + delta * zoomSpeed * this.camera.radius;
            
            // Clamp to limits
            this.camera.radius = Math.max(
                this.camera.lowerRadiusLimit!,
                Math.min(this.camera.upperRadiusLimit!, newRadius)
            );
        }, { passive: false });
        
        // Touch pinch zoom for mobile
        let initialPinchDistance = 0;
        let initialRadius = 0;
        
        canvas.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                initialPinchDistance = this.getTouchDistance(event.touches);
                initialRadius = this.camera.radius;
            }
        }, { passive: true });
        
        canvas.addEventListener('touchmove', (event) => {
            if (event.touches.length === 2) {
                const currentDistance = this.getTouchDistance(event.touches);
                const scale = initialPinchDistance / currentDistance;
                const newRadius = initialRadius * scale;
                
                this.camera.radius = Math.max(
                    this.camera.lowerRadiusLimit!,
                    Math.min(this.camera.upperRadiusLimit!, newRadius)
                );
            }
        }, { passive: true });
    }

    /**
     * Get distance between two touch points
     */
    private getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Set camera zoom level (radius)
     */
    setZoom(radius: number): void {
        this.camera.radius = Math.max(
            this.camera.lowerRadiusLimit!,
            Math.min(this.camera.upperRadiusLimit!, radius)
        );
    }

    /**
     * Get current zoom level
     */
    getZoom(): number {
        return this.camera.radius;
    }
}
