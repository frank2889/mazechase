/**
 * Babylon.js Engine Wrapper for MazeChase 3D
 * 
 * THIRD-PERSON CAMERA following behind the bouncing ball!
 * This module provides the core 3D engine setup and utilities.
 */

import { Engine, Scene, FollowCamera, HemisphericLight, PointLight, Vector3, Color4, Color3, Mesh } from '@babylonjs/core';

export interface GameEngineConfig {
    canvas: HTMLCanvasElement;
    antialias?: boolean;
}

export class GameEngine {
    private engine: Engine;
    private scene: Scene;
    private camera: FollowCamera;
    private isRunning: boolean = false;
    private targetMesh: Mesh | null = null;

    constructor(config: GameEngineConfig) {
        // Create the Babylon.js engine
        this.engine = new Engine(config.canvas, config.antialias ?? true, {
            preserveDrawingBuffer: true,
            stencil: true
        });

        // Create the scene
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1); // Dark blue background

        // THIRD-PERSON FollowCamera - follows behind the player ball!
        this.camera = new FollowCamera(
            'followCamera',
            new Vector3(0, 10, -10), // Initial position
            this.scene
        );
        
        // Follow camera settings for smooth third-person view
        this.camera.radius = 12;           // Distance behind the ball
        this.camera.heightOffset = 8;      // Height above the ball
        this.camera.rotationOffset = 180;  // Look at the ball from behind
        this.camera.cameraAcceleration = 0.05;  // Smooth follow speed
        this.camera.maxCameraSpeed = 20;   // Max camera movement speed
        
        // Set field of view for better perspective
        this.camera.fov = 1.0;

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

    get mainCamera(): FollowCamera {
        return this.camera;
    }

    /**
     * Set the target mesh for the camera to follow (the player ball!)
     */
    setFollowTarget(mesh: Mesh): void {
        this.targetMesh = mesh;
        this.camera.lockedTarget = mesh;
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
     * Focus camera on a specific position (creates temp target)
     */
    focusOn(x: number, z: number): void {
        // For FollowCamera, we need a target mesh - just set initial position
        this.camera.position = new Vector3(x, 10, z - 10);
    }

    /**
     * Camera now automatically follows - these are kept for compatibility
     */
    private targetFollowPos: Vector3 | null = null;
    private followLerpSpeed: number = 3;

    followTarget(x: number, z: number): void {
        // FollowCamera handles this automatically via lockedTarget
        this.targetFollowPos = new Vector3(x, 0, z);
    }

    /**
     * Update camera follow - FollowCamera handles this automatically
     */
    updateCameraFollow(deltaTime: number): void {
        // FollowCamera auto-follows lockedTarget - no manual update needed
    }

    /**
     * Set camera follow speed (adjusts acceleration)
     */
    setFollowSpeed(speed: number): void {
        this.followLerpSpeed = speed;
        this.camera.cameraAcceleration = speed * 0.02;
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
            
            const zoomSpeed = 0.5;
            const delta = event.deltaY > 0 ? 1 : -1;
            this.camera.radius = Math.max(5, Math.min(30, this.camera.radius + delta * zoomSpeed));
        }, { passive: false });
    }

    /**
     * Set camera zoom level (radius/distance from player)
     */
    setZoom(radius: number): void {
        this.camera.radius = Math.max(5, Math.min(30, radius));
    }

    /**
     * Get current zoom level
     */
    getZoom(): number {
        return this.camera.radius;
    }
}
