/**
 * Camera Handler for High-Speed Ball Sync
 * EMMSOAI Suggestion (Alex - Core Gameplay & UX Designer):
 * "Synchroniseer camera-beweging beter met high-speed ball bounces"
 * 
 * Features:
 * - Smooth camera following with lag compensation
 * - Predictive camera positioning
 * - Dynamic FOV adjustment based on speed
 * - Shake reduction for comfort
 */

import * as BABYLON from '@babylonjs/core';

export interface CameraConfig {
    followDistance: number;      // Distance behind player
    heightOffset: number;        // Height above player
    lookAheadFactor: number;     // How much to predict movement
    smoothingFactor: number;     // 0-1, lower = smoother
    maxSpeed: number;            // Speed cap for calculations
    fovRange: { min: number; max: number };
    shakeReduction: number;      // 0-1, higher = less shake
}

const DEFAULT_CONFIG: CameraConfig = {
    followDistance: 8,
    heightOffset: 6,
    lookAheadFactor: 0.3,
    smoothingFactor: 0.08,
    maxSpeed: 20,
    fovRange: { min: 0.8, max: 1.1 },
    shakeReduction: 0.7
};

/**
 * Third-person camera with smooth follow and speed compensation
 */
export class CameraHandler {
    private camera: BABYLON.ArcRotateCamera | BABYLON.FollowCamera | null = null;
    private scene: BABYLON.Scene;
    private config: CameraConfig;
    private target: BABYLON.AbstractMesh | null = null;

    // Smoothing state
    private smoothedPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private previousTargetPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private currentSpeed = 0;
    private baseFov = 0.8; // Used for reset to default FOV

    // Shake reduction
    private shakeBuffer: BABYLON.Vector3[] = [];
    private shakeBufferSize = 5;

    constructor(scene: BABYLON.Scene, config: Partial<CameraConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Create and configure the follow camera
     */
    createCamera(target: BABYLON.AbstractMesh): BABYLON.FollowCamera {
        this.target = target;
        this.previousTargetPosition = target.position.clone();
        this.smoothedPosition = target.position.clone();

        // Create follow camera
        const camera = new BABYLON.FollowCamera(
            'followCamera',
            target.position.add(new BABYLON.Vector3(0, this.config.heightOffset, -this.config.followDistance)),
            this.scene
        );

        // Configure follow behavior
        camera.radius = this.config.followDistance;
        camera.heightOffset = this.config.heightOffset;
        camera.rotationOffset = 0;
        camera.cameraAcceleration = this.config.smoothingFactor;
        camera.maxCameraSpeed = this.config.maxSpeed;

        camera.lockedTarget = target;
        this.camera = camera;
        this.baseFov = camera.fov;

        // Register update loop
        this.scene.registerBeforeRender(() => this.update());

        console.log('[CameraHandler] Created follow camera');
        return camera;
    }

    /**
     * Create ArcRotate camera for orbit view
     */
    createOrbitCamera(target: BABYLON.AbstractMesh): BABYLON.ArcRotateCamera {
        this.target = target;
        this.previousTargetPosition = target.position.clone();
        this.smoothedPosition = target.position.clone();

        const camera = new BABYLON.ArcRotateCamera(
            'orbitCamera',
            -Math.PI / 2,
            Math.PI / 3,
            this.config.followDistance,
            target.position,
            this.scene
        );

        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 20;
        camera.lowerBetaLimit = 0.2;
        camera.upperBetaLimit = Math.PI / 2 - 0.1;

        this.camera = camera;
        this.baseFov = camera.fov;

        this.scene.registerBeforeRender(() => this.update());

        console.log('[CameraHandler] Created orbit camera');
        return camera;
    }

    /**
     * Main update loop - called every frame
     */
    private update(): void {
        if (!this.target || !this.camera) return;

        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        const targetPos = this.target.position;

        // Calculate velocity from position change
        this.velocity = targetPos.subtract(this.previousTargetPosition).scale(1 / Math.max(deltaTime, 0.001));
        this.currentSpeed = this.velocity.length();
        this.previousTargetPosition = targetPos.clone();

        // Apply look-ahead based on velocity
        const lookAhead = this.velocity.scale(this.config.lookAheadFactor);
        const desiredTarget = targetPos.add(lookAhead);

        // Smooth the target position
        this.smoothedPosition = BABYLON.Vector3.Lerp(
            this.smoothedPosition,
            desiredTarget,
            this.config.smoothingFactor
        );

        // Apply shake reduction
        const shakeReduced = this.applyShakeReduction(this.smoothedPosition);

        // Update camera target
        if (this.camera instanceof BABYLON.ArcRotateCamera) {
            this.camera.target = shakeReduced;
        }

        // Adjust FOV based on speed
        this.updateDynamicFOV();
    }

    /**
     * Apply shake reduction using position averaging
     */
    private applyShakeReduction(position: BABYLON.Vector3): BABYLON.Vector3 {
        if (this.config.shakeReduction <= 0) return position;

        this.shakeBuffer.push(position.clone());
        if (this.shakeBuffer.length > this.shakeBufferSize) {
            this.shakeBuffer.shift();
        }

        if (this.shakeBuffer.length < 2) return position;

        // Calculate average position
        const sum = this.shakeBuffer.reduce(
            (acc, pos) => acc.add(pos),
            BABYLON.Vector3.Zero()
        );
        const average = sum.scale(1 / this.shakeBuffer.length);

        // Blend between actual and average based on shake reduction setting
        return BABYLON.Vector3.Lerp(
            position,
            average,
            this.config.shakeReduction
        );
    }

    /**
     * Adjust FOV dynamically based on player speed
     */
    private updateDynamicFOV(): void {
        if (!this.camera) return;

        const speedNormalized = Math.min(this.currentSpeed / this.config.maxSpeed, 1);
        const targetFov = BABYLON.Scalar.Lerp(
            this.config.fovRange.min,
            this.config.fovRange.max,
            speedNormalized
        );

        // Smooth FOV transition
        this.camera.fov = BABYLON.Scalar.Lerp(
            this.camera.fov,
            targetFov,
            0.05
        );
    }

    /**
     * Trigger impact shake (for bounces, collisions)
     */
    triggerImpactShake(intensity = 0.5): void {
        if (!this.camera) return;

        // Quick position offset
        const offset = new BABYLON.Vector3(
            (Math.random() - 0.5) * intensity * 0.3,
            (Math.random() - 0.5) * intensity * 0.2,
            (Math.random() - 0.5) * intensity * 0.3
        );

        if (this.camera instanceof BABYLON.ArcRotateCamera) {
            const originalTarget = this.camera.target.clone();
            this.camera.target = originalTarget.add(offset);

            // Return to normal
            setTimeout(() => {
                if (this.camera instanceof BABYLON.ArcRotateCamera) {
                    this.camera.target = originalTarget;
                }
            }, 50);
        }
    }

    /**
     * Get current player speed (useful for UI)
     */
    getCurrentSpeed(): number {
        return this.currentSpeed;
    }

    /**
     * Set camera distance
     */
    setDistance(distance: number): void {
        this.config.followDistance = distance;
        if (this.camera instanceof BABYLON.FollowCamera) {
            this.camera.radius = distance;
        } else if (this.camera instanceof BABYLON.ArcRotateCamera) {
            this.camera.radius = distance;
        }
    }

    /**
     * Set camera height
     */
    setHeight(height: number): void {
        this.config.heightOffset = height;
        if (this.camera instanceof BABYLON.FollowCamera) {
            this.camera.heightOffset = height;
        }
    }

    /**
     * Switch to cinematic mode (wider FOV, further distance)
     */
    setCinematicMode(enabled: boolean): void {
        if (enabled) {
            this.config.fovRange = { min: 0.9, max: 1.3 };
            this.setDistance(12);
        } else {
            this.config.fovRange = { min: 0.8, max: 1.1 };
            this.setDistance(8);
        }
    }

    /**
     * Reset FOV to default
     */
    resetFov(): void {
        if (this.camera) {
            this.camera.fov = this.baseFov;
        }
    }

    /**
     * Get camera instance
     */
    getCamera(): BABYLON.Camera | null {
        return this.camera;
    }

    /**
     * Dispose
     */
    dispose(): void {
        if (this.camera) {
            this.camera.dispose();
            this.camera = null;
        }
        this.target = null;
        this.shakeBuffer = [];
    }
}

// Factory function
export function createCameraHandler(
    scene: BABYLON.Scene,
    config?: Partial<CameraConfig>
): CameraHandler {
    return new CameraHandler(scene, config);
}
