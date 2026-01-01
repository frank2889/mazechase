/**
 * Character Animations System
 * EMMSOAI Suggestion (Yuki - Visual Artist & Sprite Designer):
 * "Voeg anticipatie-animaties toe vóór grote bewegingen voor meer polish"
 */

import * as BABYLON from '@babylonjs/core';

export interface AnimationConfig {
    name: string;
    duration: number;
    loop: boolean;
    easing?: BABYLON.EasingFunction;
}

// Animation presets
export const ANIMATION_PRESETS = {
    squash: { intensity: 0.3, speed: 0.1 },
    stretch: { intensity: 0.2, speed: 0.1 },
    anticipation: { windUp: 0.15, duration: 0.08 },
    overshoot: { amount: 0.1, settleDuration: 0.1 },
    bounce: { height: 0.5, gravity: 9.8, bounciness: 0.7 }
};

/**
 * Create squash animation for landing impact
 */
export function createSquashAnimation(
    mesh: BABYLON.AbstractMesh,
    intensity = ANIMATION_PRESETS.squash.intensity
): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('squash', mesh.getScene());

    const scaleY = new BABYLON.Animation(
        'squashY',
        'scaling.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const scaleXZ = new BABYLON.Animation(
        'squashXZ',
        'scaling.x',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const originalScale = mesh.scaling.y;
    const squashAmount = originalScale * (1 - intensity);
    const stretchAmount = originalScale * (1 + intensity * 0.5);

    // Keyframes: impact -> squash -> stretch -> settle
    scaleY.setKeys([
        { frame: 0, value: originalScale },
        { frame: 3, value: squashAmount },    // Quick squash
        { frame: 6, value: stretchAmount },   // Stretch back
        { frame: 10, value: originalScale }   // Settle
    ]);

    scaleXZ.setKeys([
        { frame: 0, value: originalScale },
        { frame: 3, value: originalScale * (1 + intensity * 0.3) }, // Expand sideways
        { frame: 6, value: originalScale * (1 - intensity * 0.2) }, // Contract
        { frame: 10, value: originalScale }
    ]);

    // Add easing
    const easingFunction = new BABYLON.ElasticEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
    scaleY.setEasingFunction(easingFunction);
    scaleXZ.setEasingFunction(easingFunction);

    group.addTargetedAnimation(scaleY, mesh);
    group.addTargetedAnimation(scaleXZ, mesh);

    return group;
}

/**
 * Create anticipation animation before jump
 */
export function createJumpAnticipation(
    mesh: BABYLON.AbstractMesh,
    onComplete?: () => void
): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('jumpAnticipation', mesh.getScene());

    const scaleY = new BABYLON.Animation(
        'anticipateY',
        'scaling.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const posY = new BABYLON.Animation(
        'anticipatePos',
        'position.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const originalScale = mesh.scaling.y;
    const originalPosY = mesh.position.y;
    const windUp = ANIMATION_PRESETS.anticipation.windUp;

    // Wind-up: crouch down before jump
    scaleY.setKeys([
        { frame: 0, value: originalScale },
        { frame: 5, value: originalScale * (1 - windUp) },  // Crouch
    ]);

    posY.setKeys([
        { frame: 0, value: originalPosY },
        { frame: 5, value: originalPosY - (originalScale * windUp * 0.3) },
    ]);

    group.addTargetedAnimation(scaleY, mesh);
    group.addTargetedAnimation(posY, mesh);

    if (onComplete) {
        group.onAnimationGroupEndObservable.addOnce(() => onComplete());
    }

    return group;
}

/**
 * Create stretch animation during upward movement
 */
export function createJumpStretch(mesh: BABYLON.AbstractMesh): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('jumpStretch', mesh.getScene());

    const scaleY = new BABYLON.Animation(
        'stretchY',
        'scaling.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const scaleXZ = new BABYLON.Animation(
        'stretchXZ',
        'scaling.x',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const originalScale = mesh.scaling.y;
    const stretchAmount = ANIMATION_PRESETS.stretch.intensity;

    scaleY.setKeys([
        { frame: 0, value: originalScale * (1 - ANIMATION_PRESETS.anticipation.windUp) },
        { frame: 4, value: originalScale * (1 + stretchAmount) },
    ]);

    scaleXZ.setKeys([
        { frame: 0, value: originalScale * 1.1 },
        { frame: 4, value: originalScale * (1 - stretchAmount * 0.5) },
    ]);

    group.addTargetedAnimation(scaleY, mesh);
    group.addTargetedAnimation(scaleXZ, mesh);

    return group;
}

/**
 * Create overshoot settle animation
 */
export function createOvershootSettle(
    mesh: BABYLON.AbstractMesh,
    targetScale: BABYLON.Vector3
): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('overshootSettle', mesh.getScene());
    const overshoot = ANIMATION_PRESETS.overshoot.amount;

    const scaleAnim = new BABYLON.Animation(
        'overshoot',
        'scaling',
        60,
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    scaleAnim.setKeys([
        { frame: 0, value: mesh.scaling.clone() },
        { frame: 4, value: targetScale.scale(1 + overshoot) },  // Overshoot
        { frame: 8, value: targetScale.scale(1 - overshoot * 0.5) },  // Undershoot
        { frame: 12, value: targetScale }  // Settle
    ]);

    const easingFunction = new BABYLON.ElasticEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
    scaleAnim.setEasingFunction(easingFunction);

    group.addTargetedAnimation(scaleAnim, mesh);

    return group;
}

/**
 * Create continuous idle bounce animation
 */
export function createIdleBounce(mesh: BABYLON.AbstractMesh): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('idleBounce', mesh.getScene());

    const posY = new BABYLON.Animation(
        'idlePosY',
        'position.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const scaleY = new BABYLON.Animation(
        'idleScaleY',
        'scaling.y',
        60,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const baseY = mesh.position.y;
    const baseScale = mesh.scaling.y;
    const bounceHeight = 0.05;
    const squash = 0.03;

    posY.setKeys([
        { frame: 0, value: baseY },
        { frame: 30, value: baseY + bounceHeight },
        { frame: 60, value: baseY }
    ]);

    scaleY.setKeys([
        { frame: 0, value: baseScale },
        { frame: 15, value: baseScale - squash },
        { frame: 30, value: baseScale + squash * 0.5 },
        { frame: 45, value: baseScale - squash * 0.5 },
        { frame: 60, value: baseScale }
    ]);

    // Smooth easing
    const easingFunction = new BABYLON.SineEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    posY.setEasingFunction(easingFunction);
    scaleY.setEasingFunction(easingFunction);

    group.addTargetedAnimation(posY, mesh);
    group.addTargetedAnimation(scaleY, mesh);

    return group;
}

/**
 * Create roll/rotate animation during movement
 */
export function createRollAnimation(
    mesh: BABYLON.AbstractMesh,
    direction: BABYLON.Vector3,
    distance: number
): BABYLON.AnimationGroup {
    const group = new BABYLON.AnimationGroup('roll', mesh.getScene());

    // Calculate rotation axis perpendicular to movement direction
    const up = BABYLON.Vector3.Up();
    const rotationAxis = BABYLON.Vector3.Cross(up, direction.normalize());

    // Calculate how much to rotate based on distance and ball size
    const radius = mesh.getBoundingInfo().boundingSphere.radius;
    const rotationAmount = distance / radius;

    const rotation = new BABYLON.Animation(
        'rollRotation',
        'rotationQuaternion',
        60,
        BABYLON.Animation.ANIMATIONTYPE_QUATERNION,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const startQuat = mesh.rotationQuaternion?.clone() ?? BABYLON.Quaternion.Identity();
    const rotQuat = BABYLON.Quaternion.RotationAxis(rotationAxis, rotationAmount);
    const endQuat = rotQuat.multiply(startQuat);

    rotation.setKeys([
        { frame: 0, value: startQuat },
        { frame: 30, value: endQuat }
    ]);

    group.addTargetedAnimation(rotation, mesh);

    return group;
}

/**
 * Character Animation Controller
 * Manages animation state and transitions
 */
export class CharacterAnimationController {
    private mesh: BABYLON.AbstractMesh;
    private currentGroup: BABYLON.AnimationGroup | null = null;
    private idleAnimation: BABYLON.AnimationGroup | null = null;
    private isGrounded = true;
    private lastVelocityY = 0;

    constructor(mesh: BABYLON.AbstractMesh) {
        this.mesh = mesh;
        
        // Ensure mesh has rotation quaternion
        if (!mesh.rotationQuaternion) {
            mesh.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
                mesh.rotation.x,
                mesh.rotation.y,
                mesh.rotation.z
            );
        }
    }

    /**
     * Start idle animation
     */
    startIdle(): void {
        if (!this.idleAnimation) {
            this.idleAnimation = createIdleBounce(this.mesh);
        }
        this.idleAnimation.start(true);
    }

    /**
     * Stop idle animation
     */
    stopIdle(): void {
        if (this.idleAnimation) {
            this.idleAnimation.stop();
        }
    }

    /**
     * Play jump with anticipation
     */
    playJump(onJump: () => void): void {
        this.stopIdle();

        // Anticipation
        const anticipation = createJumpAnticipation(this.mesh, () => {
            // Execute actual jump
            onJump();

            // Play stretch animation
            const stretch = createJumpStretch(this.mesh);
            stretch.start(false);
            stretch.onAnimationGroupEndObservable.addOnce(() => {
                stretch.dispose();
            });

            anticipation.dispose();
        });

        anticipation.start(false);
        this.currentGroup = anticipation;
        this.isGrounded = false;
    }

    /**
     * Play landing impact
     */
    playLand(impactIntensity = 0.3): void {
        if (this.currentGroup) {
            this.currentGroup.stop();
        }

        const squash = createSquashAnimation(this.mesh, impactIntensity);
        squash.start(false);
        squash.onAnimationGroupEndObservable.addOnce(() => {
            squash.dispose();
            this.isGrounded = true;
            this.startIdle();
        });

        this.currentGroup = squash;
    }

    /**
     * Update based on physics state
     */
    update(velocityY: number): void {
        // Detect landing
        if (!this.isGrounded && this.lastVelocityY < -0.1 && velocityY >= -0.1) {
            const impactIntensity = Math.min(0.5, Math.abs(this.lastVelocityY) * 0.1);
            this.playLand(impactIntensity);
        }

        // Detect takeoff (for physics-based jumps)
        if (this.isGrounded && velocityY > 0.5) {
            this.isGrounded = false;
            this.stopIdle();
        }

        this.lastVelocityY = velocityY;
    }

    /**
     * Dispose all animations
     */
    dispose(): void {
        if (this.idleAnimation) {
            this.idleAnimation.dispose();
        }
        if (this.currentGroup) {
            this.currentGroup.dispose();
        }
    }
}
