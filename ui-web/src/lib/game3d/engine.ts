/**
 * Babylon.js Engine Wrapper for MazeChase 3D
 * 
 * This module provides the core 3D engine setup and utilities.
 */

import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Color4 } from '@babylonjs/core';

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
        this.camera.lowerRadiusLimit = 30;
        this.camera.upperRadiusLimit = 80;
        
        // Disable camera controls for now (we'll control it programmatically)
        this.camera.attachControl(config.canvas, false);

        // Add ambient lighting
        const ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.7;
        ambientLight.groundColor = new Color4(0.2, 0.2, 0.3, 1) as any;

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
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
}
