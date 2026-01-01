/**
 * Particle Effects System
 * 
 * AI Tester Suggestion (Yuki - Visual Artist):
 * "Adjust the intensity and spread of particle effects during power-up activations.
 * Prevent visual overwhelm while maintaining excitement."
 * 
 * Features:
 * - Configurable particle intensity per effect type
 * - Performance-aware particle limits
 * - Power-up specific effects
 * - Device-adaptive particle counts
 */

import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

export type ParticleEffectType = 
    | 'pellet_collect'
    | 'power_pellet'
    | 'speed_boost'
    | 'shield_activate'
    | 'invisibility'
    | 'role_swap'
    | 'chaser_stun'
    | 'victory'
    | 'defeat';

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

interface ParticleConfig {
    baseCount: number;
    emitRate: number;
    minSize: number;
    maxSize: number;
    minLifeTime: number;
    maxLifeTime: number;
    color1: Color4;
    color2: Color4;
    colorDead: Color4;
    emitPower: { min: number; max: number };
    spread: { x: number; y: number; z: number };
    gravity: Vector3;
    blendMode: number;
}

// Quality multipliers for device performance
const QUALITY_MULTIPLIERS: Record<QualityLevel, number> = {
    low: 0.25,
    medium: 0.5,
    high: 1.0,
    ultra: 1.5
};

// Base particle configurations - designed for visual clarity
const PARTICLE_CONFIGS: Record<ParticleEffectType, ParticleConfig> = {
    pellet_collect: {
        baseCount: 15,          // Reduced from typical 30+
        emitRate: 50,
        minSize: 0.05,
        maxSize: 0.15,
        minLifeTime: 0.1,
        maxLifeTime: 0.3,
        color1: new Color4(1, 1, 0.3, 1),
        color2: new Color4(1, 0.8, 0, 1),
        colorDead: new Color4(1, 0.5, 0, 0),
        emitPower: { min: 2, max: 4 },
        spread: { x: 0.5, y: 0.5, z: 0.5 },
        gravity: new Vector3(0, 2, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    power_pellet: {
        baseCount: 30,          // Moderate for special effect
        emitRate: 80,
        minSize: 0.1,
        maxSize: 0.3,
        minLifeTime: 0.3,
        maxLifeTime: 0.6,
        color1: new Color4(0.8, 0.2, 1, 1),
        color2: new Color4(1, 0.5, 0.8, 1),
        colorDead: new Color4(0.5, 0, 0.5, 0),
        emitPower: { min: 3, max: 6 },
        spread: { x: 1, y: 1, z: 1 },
        gravity: new Vector3(0, 1, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    speed_boost: {
        baseCount: 20,
        emitRate: 60,
        minSize: 0.08,
        maxSize: 0.2,
        minLifeTime: 0.2,
        maxLifeTime: 0.4,
        color1: new Color4(0, 0.8, 1, 1),
        color2: new Color4(0.5, 1, 1, 1),
        colorDead: new Color4(0, 0.5, 1, 0),
        emitPower: { min: 4, max: 8 },
        spread: { x: 0.3, y: 0.2, z: 1.5 },
        gravity: new Vector3(0, 0, -3),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    shield_activate: {
        baseCount: 40,
        emitRate: 100,
        minSize: 0.05,
        maxSize: 0.15,
        minLifeTime: 0.5,
        maxLifeTime: 1.0,
        color1: new Color4(0.3, 0.8, 1, 0.8),
        color2: new Color4(0.5, 0.9, 1, 0.6),
        colorDead: new Color4(0.2, 0.6, 1, 0),
        emitPower: { min: 0.5, max: 1.5 },
        spread: { x: 2, y: 2, z: 2 },
        gravity: new Vector3(0, 0.5, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    invisibility: {
        baseCount: 25,
        emitRate: 40,
        minSize: 0.1,
        maxSize: 0.25,
        minLifeTime: 0.4,
        maxLifeTime: 0.8,
        color1: new Color4(0.8, 0.8, 1, 0.3),
        color2: new Color4(0.6, 0.6, 0.8, 0.2),
        colorDead: new Color4(0.5, 0.5, 0.7, 0),
        emitPower: { min: 0.5, max: 1 },
        spread: { x: 1, y: 1, z: 1 },
        gravity: new Vector3(0, 0.2, 0),
        blendMode: ParticleSystem.BLENDMODE_STANDARD
    },
    role_swap: {
        baseCount: 50,
        emitRate: 150,
        minSize: 0.1,
        maxSize: 0.4,
        minLifeTime: 0.5,
        maxLifeTime: 1.0,
        color1: new Color4(1, 0.3, 0.8, 1),
        color2: new Color4(0.3, 0.8, 1, 1),
        colorDead: new Color4(0.5, 0.5, 0.5, 0),
        emitPower: { min: 5, max: 10 },
        spread: { x: 3, y: 3, z: 3 },
        gravity: new Vector3(0, -1, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    chaser_stun: {
        baseCount: 35,
        emitRate: 100,
        minSize: 0.08,
        maxSize: 0.2,
        minLifeTime: 0.3,
        maxLifeTime: 0.6,
        color1: new Color4(1, 1, 0, 1),
        color2: new Color4(1, 0.8, 0, 1),
        colorDead: new Color4(1, 0.5, 0, 0),
        emitPower: { min: 2, max: 5 },
        spread: { x: 1.5, y: 0.5, z: 1.5 },
        gravity: new Vector3(0, 3, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    victory: {
        baseCount: 80,
        emitRate: 200,
        minSize: 0.1,
        maxSize: 0.3,
        minLifeTime: 1.0,
        maxLifeTime: 2.0,
        color1: new Color4(1, 0.9, 0, 1),
        color2: new Color4(1, 0.5, 0, 1),
        colorDead: new Color4(1, 0.3, 0, 0),
        emitPower: { min: 8, max: 15 },
        spread: { x: 5, y: 5, z: 5 },
        gravity: new Vector3(0, -2, 0),
        blendMode: ParticleSystem.BLENDMODE_ADD
    },
    defeat: {
        baseCount: 30,
        emitRate: 50,
        minSize: 0.1,
        maxSize: 0.25,
        minLifeTime: 0.5,
        maxLifeTime: 1.0,
        color1: new Color4(0.5, 0.5, 0.5, 1),
        color2: new Color4(0.3, 0.3, 0.3, 0.8),
        colorDead: new Color4(0.1, 0.1, 0.1, 0),
        emitPower: { min: 1, max: 3 },
        spread: { x: 2, y: 1, z: 2 },
        gravity: new Vector3(0, -3, 0),
        blendMode: ParticleSystem.BLENDMODE_STANDARD
    }
};

/**
 * ParticleEffectsManager - Performance-aware particle system
 */
export class ParticleEffectsManager {
    private scene: Scene;
    private qualityLevel: QualityLevel = 'medium';
    private activeSystems: Map<string, ParticleSystem> = new Map();
    private maxActiveSystems = 10;
    private particleTexture: Texture | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.detectQualityLevel();
        this.loadParticleTexture();
    }

    /**
     * Detect device capability for quality level
     */
    private detectQualityLevel(): void {
        const engine = this.scene.getEngine();
        const gl = (engine as any)._gl as WebGLRenderingContext | null;
        if (!gl) {
            this.qualityLevel = 'low';
            return;
        }

        // Check for mobile
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // Check WebGL capabilities
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        if (isMobile) {
            this.qualityLevel = maxTextureSize >= 4096 ? 'medium' : 'low';
        } else {
            if (maxTextureSize >= 8192) {
                this.qualityLevel = 'ultra';
            } else if (maxTextureSize >= 4096) {
                this.qualityLevel = 'high';
            } else {
                this.qualityLevel = 'medium';
            }
        }

        console.log(`[ParticleEffects] Quality level: ${this.qualityLevel}`);
    }

    /**
     * Load particle texture
     */
    private loadParticleTexture(): void {
        try {
            this.particleTexture = new Texture(
                '/textures/particle_glow.png',
                this.scene
            );
        } catch (e) {
            // Use default procedural particles
        }
    }

    /**
     * Create and play a particle effect
     */
    playEffect(
        effectType: ParticleEffectType,
        position: Vector3,
        options?: {
            duration?: number;
            emitter?: AbstractMesh;
            intensityMultiplier?: number;
        }
    ): string {
        const config = PARTICLE_CONFIGS[effectType];
        const qualityMult = QUALITY_MULTIPLIERS[this.qualityLevel];
        const intensityMult = options?.intensityMultiplier ?? 1.0;

        // Limit active systems for performance
        if (this.activeSystems.size >= this.maxActiveSystems) {
            this.cleanupOldestSystem();
        }

        const effectId = `${effectType}_${Date.now()}`;
        const particleCount = Math.floor(config.baseCount * qualityMult * intensityMult);

        const system = new ParticleSystem(
            effectId,
            particleCount,
            this.scene
        );

        // Apply configuration
        system.emitter = options?.emitter || position;
        
        if (this.particleTexture) {
            system.particleTexture = this.particleTexture;
        }

        // Size
        system.minSize = config.minSize;
        system.maxSize = config.maxSize;

        // Lifetime
        system.minLifeTime = config.minLifeTime;
        system.maxLifeTime = config.maxLifeTime;

        // Emit rate (scaled by quality)
        system.emitRate = config.emitRate * qualityMult;

        // Colors
        system.color1 = config.color1;
        system.color2 = config.color2;
        system.colorDead = config.colorDead;

        // Direction and power
        system.direction1 = new Vector3(
            -config.spread.x,
            -config.spread.y,
            -config.spread.z
        );
        system.direction2 = new Vector3(
            config.spread.x,
            config.spread.y,
            config.spread.z
        );
        system.minEmitPower = config.emitPower.min;
        system.maxEmitPower = config.emitPower.max;

        // Gravity
        system.gravity = config.gravity;

        // Blend mode
        system.blendMode = config.blendMode;

        // Start
        system.start();
        this.activeSystems.set(effectId, system);

        // Auto-stop after duration
        const duration = options?.duration ?? 500;
        setTimeout(() => {
            this.stopEffect(effectId);
        }, duration);

        return effectId;
    }

    /**
     * Stop a specific effect
     */
    stopEffect(effectId: string): void {
        const system = this.activeSystems.get(effectId);
        if (system) {
            system.stop();
            setTimeout(() => {
                system.dispose();
                this.activeSystems.delete(effectId);
            }, 1000); // Wait for particles to fade
        }
    }

    /**
     * Clean up oldest system when at limit
     */
    private cleanupOldestSystem(): void {
        const firstKey = this.activeSystems.keys().next().value;
        if (firstKey) {
            this.stopEffect(firstKey);
        }
    }

    /**
     * Reduce particle intensity globally (for performance)
     */
    reduceParticleIntensity(reduction: number = 0.5): void {
        for (const system of this.activeSystems.values()) {
            system.emitRate *= reduction;
        }
    }

    /**
     * Set quality level manually
     */
    setQualityLevel(level: QualityLevel): void {
        this.qualityLevel = level;
        this.maxActiveSystems = level === 'low' ? 5 : 
                               level === 'medium' ? 10 : 
                               level === 'high' ? 15 : 20;
    }

    /**
     * Get current quality level
     */
    getQualityLevel(): QualityLevel {
        return this.qualityLevel;
    }

    /**
     * Clean up all effects
     */
    destroy(): void {
        for (const system of this.activeSystems.values()) {
            system.dispose();
        }
        this.activeSystems.clear();
        this.particleTexture?.dispose();
    }
}

// Singleton
let particleManager: ParticleEffectsManager | null = null;

export function getParticleEffectsManager(scene: Scene): ParticleEffectsManager {
    if (!particleManager) {
        particleManager = new ParticleEffectsManager(scene);
    }
    return particleManager;
}
