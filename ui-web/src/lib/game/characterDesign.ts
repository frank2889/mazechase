/**
 * Character Design & Animation System
 * 
 * AI Tester Suggestion (Yuki - Visual Artist):
 * "Add complex movement patterns and visual effects to chaser animations.
 * Each chaser should have distinctive visual identity and animations."
 * 
 * Features:
 * - Unique animation patterns per chaser type
 * - Visual effects (glow, trails, particles)
 * - Movement interpolation for smooth animations
 * - State-based animation transitions
 */

import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';

export type ChaserType = 'blitz' | 'shadow' | 'spark' | 'default';
export type AnimationState = 'idle' | 'moving' | 'hunting' | 'stunned' | 'powerup';

interface ChaserDesign {
    primaryColor: Color3;
    secondaryColor: Color3;
    glowIntensity: number;
    trailLength: number;
    bobAmplitude: number;
    bobFrequency: number;
    rotationSpeed: number;
    scaleVariation: number;
    particleEmitRate: number;
}

const CHASER_DESIGNS: Record<ChaserType, ChaserDesign> = {
    blitz: {
        primaryColor: new Color3(1, 0.2, 0.2),      // Red
        secondaryColor: new Color3(1, 0.5, 0),      // Orange
        glowIntensity: 1.5,
        trailLength: 8,
        bobAmplitude: 0.1,
        bobFrequency: 4,
        rotationSpeed: 0,
        scaleVariation: 0.05,
        particleEmitRate: 20
    },
    shadow: {
        primaryColor: new Color3(0.3, 0.1, 0.5),    // Purple
        secondaryColor: new Color3(0.1, 0.1, 0.2),  // Dark blue
        glowIntensity: 0.8,
        trailLength: 12,
        bobAmplitude: 0.15,
        bobFrequency: 2,
        rotationSpeed: 0.5,
        scaleVariation: 0.1,
        particleEmitRate: 10
    },
    spark: {
        primaryColor: new Color3(0, 0.8, 1),        // Cyan
        secondaryColor: new Color3(1, 1, 0.5),      // Yellow
        glowIntensity: 2.0,
        trailLength: 5,
        bobAmplitude: 0.05,
        bobFrequency: 8,
        rotationSpeed: 2,
        scaleVariation: 0.15,
        particleEmitRate: 40
    },
    default: {
        primaryColor: new Color3(1, 0.4, 0.7),      // Pink
        secondaryColor: new Color3(0.8, 0.2, 0.4),
        glowIntensity: 1.0,
        trailLength: 6,
        bobAmplitude: 0.08,
        bobFrequency: 3,
        rotationSpeed: 0,
        scaleVariation: 0.03,
        particleEmitRate: 15
    }
};

interface AnimationConfig {
    duration: number;
    loop: boolean;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

const STATE_ANIMATIONS: Record<AnimationState, AnimationConfig> = {
    idle: { duration: 2000, loop: true, easing: 'easeInOut' },
    moving: { duration: 500, loop: true, easing: 'linear' },
    hunting: { duration: 300, loop: true, easing: 'easeIn' },
    stunned: { duration: 1000, loop: false, easing: 'easeOut' },
    powerup: { duration: 800, loop: false, easing: 'easeInOut' }
};

/**
 * CharacterAnimator - Handles complex character animations
 */
export class CharacterAnimator {
    private scene: Scene;
    private animationGroups: Map<string, AnimationGroup> = new Map();
    private activeAnimations: Map<string, Animation> = new Map();
    private characterStates: Map<string, AnimationState> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Setup animations for a chaser mesh
     */
    setupChaserAnimations(
        mesh: Mesh,
        chaserType: ChaserType,
        chaserId: string
    ): void {
        const design = CHASER_DESIGNS[chaserType];

        // Create bob animation (up/down float)
        const bobAnim = this.createBobAnimation(
            mesh,
            design.bobAmplitude,
            design.bobFrequency
        );

        // Create scale pulse animation
        const pulseAnim = this.createPulseAnimation(
            mesh,
            design.scaleVariation
        );

        // Create rotation animation (for spinning chasers)
        if (design.rotationSpeed > 0) {
            const rotateAnim = this.createRotationAnimation(
                mesh,
                design.rotationSpeed
            );
            this.activeAnimations.set(`${chaserId}_rotate`, rotateAnim);
        }

        // Store animations
        this.activeAnimations.set(`${chaserId}_bob`, bobAnim);
        this.activeAnimations.set(`${chaserId}_pulse`, pulseAnim);

        // Set initial state
        this.characterStates.set(chaserId, 'idle');
    }

    /**
     * Create bobbing animation (floating effect)
     */
    private createBobAnimation(
        mesh: Mesh,
        amplitude: number,
        frequency: number
    ): Animation {
        const anim = new Animation(
            'bobAnimation',
            'position.y',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const baseY = mesh.position.y;
        const frames = 60;
        const keys = [];

        for (let i = 0; i <= frames; i++) {
            const t = i / frames;
            const y = baseY + Math.sin(t * Math.PI * 2 * frequency) * amplitude;
            keys.push({ frame: i, value: y });
        }

        anim.setKeys(keys);
        mesh.animations.push(anim);
        this.scene.beginAnimation(mesh, 0, frames, true);

        return anim;
    }

    /**
     * Create scale pulse animation (breathing effect)
     */
    private createPulseAnimation(
        mesh: Mesh,
        variation: number
    ): Animation {
        const anim = new Animation(
            'pulseAnimation',
            'scaling',
            30,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const baseScale = mesh.scaling.clone();
        const keys = [
            { frame: 0, value: baseScale },
            { frame: 15, value: baseScale.scale(1 + variation) },
            { frame: 30, value: baseScale }
        ];

        anim.setKeys(keys);
        mesh.animations.push(anim);
        this.scene.beginAnimation(mesh, 0, 30, true);

        return anim;
    }

    /**
     * Create rotation animation (spinning effect)
     */
    private createRotationAnimation(
        mesh: Mesh,
        speed: number
    ): Animation {
        const anim = new Animation(
            'rotateAnimation',
            'rotation.y',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keys = [
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 * speed }
        ];

        anim.setKeys(keys);
        mesh.animations.push(anim);
        this.scene.beginAnimation(mesh, 0, 60, true);

        return anim;
    }

    /**
     * Transition to a new animation state
     */
    transitionState(
        chaserId: string,
        newState: AnimationState,
        mesh: Mesh
    ): void {
        const currentState = this.characterStates.get(chaserId);
        if (currentState === newState) return;

        const config = STATE_ANIMATIONS[newState];
        
        // Apply state-specific effects
        switch (newState) {
            case 'hunting':
                this.applyHuntingEffect(mesh);
                break;
            case 'stunned':
                this.applyStunnedEffect(mesh, config.duration);
                break;
            case 'powerup':
                this.applyPowerupEffect(mesh, config.duration);
                break;
        }

        this.characterStates.set(chaserId, newState);
    }

    /**
     * Apply hunting mode visual effect
     */
    private applyHuntingEffect(mesh: Mesh): void {
        // Speed up animations
        Animation.CreateAndStartAnimation(
            'huntPulse',
            mesh,
            'scaling',
            60,
            15,
            mesh.scaling,
            mesh.scaling.scale(1.2),
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
    }

    /**
     * Apply stunned visual effect
     */
    private applyStunnedEffect(mesh: Mesh, duration: number): void {
        const originalPos = mesh.position.clone();
        
        // Shake effect
        const shakeInterval = setInterval(() => {
            mesh.position.x = originalPos.x + (Math.random() - 0.5) * 0.1;
            mesh.position.z = originalPos.z + (Math.random() - 0.5) * 0.1;
        }, 50);

        setTimeout(() => {
            clearInterval(shakeInterval);
            mesh.position = originalPos;
        }, duration);
    }

    /**
     * Apply power-up activation effect
     */
    private applyPowerupEffect(mesh: Mesh, duration: number): void {
        const originalScale = mesh.scaling.clone();

        Animation.CreateAndStartAnimation(
            'powerupBurst',
            mesh,
            'scaling',
            60,
            30,
            mesh.scaling,
            mesh.scaling.scale(1.5),
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        setTimeout(() => {
            Animation.CreateAndStartAnimation(
                'powerupReturn',
                mesh,
                'scaling',
                60,
                15,
                mesh.scaling,
                originalScale,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }, duration / 2);
    }

    /**
     * Get chaser design configuration
     */
    getChaserDesign(chaserType: ChaserType): ChaserDesign {
        return CHASER_DESIGNS[chaserType];
    }

    /**
     * Update all character animations (call in render loop)
     */
    update(_deltaTime: number): void {
        // Animation updates are handled by Babylon's animation system
        // This method is for any custom per-frame updates
    }

    /**
     * Clean up animations for a character
     */
    removeCharacter(chaserId: string): void {
        // Stop and remove all animations for this character
        for (const [key, _anim] of this.activeAnimations) {
            if (key.startsWith(chaserId)) {
                this.activeAnimations.delete(key);
            }
        }
        this.characterStates.delete(chaserId);
    }

    /**
     * Clean up all animations
     */
    destroy(): void {
        this.animationGroups.forEach(group => group.dispose());
        this.animationGroups.clear();
        this.activeAnimations.clear();
        this.characterStates.clear();
    }
}

// Singleton
let characterAnimator: CharacterAnimator | null = null;

export function getCharacterAnimator(scene: Scene): CharacterAnimator {
    if (!characterAnimator) {
        characterAnimator = new CharacterAnimator(scene);
    }
    return characterAnimator;
}
