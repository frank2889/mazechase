/**
 * Particle Effects System
 * EMMSOAI Suggestion (Yuki - Visual Artist & Sprite Designer):
 * "Voeg meer variatie en intensiteit toe aan de bestaande particle effecten"
 */

import * as BABYLON from '@babylonjs/core';

export interface ParticleEffectConfig {
    count: number;
    lifetime: number;
    size: { min: number; max: number };
    speed: { min: number; max: number };
    colors: { start: BABYLON.Color4; end: BABYLON.Color4 };
    gravity?: BABYLON.Vector3;
    emitRate?: number;
}

// Predefined color palettes
export const PARTICLE_PALETTES = {
    neonPurple: {
        start: new BABYLON.Color4(0.545, 0.361, 0.965, 1),
        end: new BABYLON.Color4(0.545, 0.361, 0.965, 0)
    },
    neonCyan: {
        start: new BABYLON.Color4(0.024, 0.714, 0.831, 1),
        end: new BABYLON.Color4(0.024, 0.714, 0.831, 0)
    },
    gold: {
        start: new BABYLON.Color4(1, 0.9, 0.4, 1),
        end: new BABYLON.Color4(1, 0.7, 0.2, 0)
    },
    fire: {
        start: new BABYLON.Color4(1, 0.5, 0, 1),
        end: new BABYLON.Color4(1, 0, 0, 0)
    },
    ice: {
        start: new BABYLON.Color4(0.6, 0.9, 1, 1),
        end: new BABYLON.Color4(0.4, 0.7, 1, 0)
    },
    rainbow: {
        start: new BABYLON.Color4(1, 0.4, 0.7, 1),
        end: new BABYLON.Color4(0.4, 0.7, 1, 0)
    }
};

/**
 * Enhanced Particle Effects Manager
 */
export class ParticleEffectsManager {
    private scene: BABYLON.Scene;
    private activeSystems: Map<string, BABYLON.ParticleSystem> = new Map();
    private textureUrl = '/textures/particle_flare.png';

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }

    /**
     * Create pellet collection burst effect
     */
    createPelletCollectEffect(position: BABYLON.Vector3): BABYLON.ParticleSystem {
        const system = new BABYLON.ParticleSystem('pelletCollect', 30, this.scene);
        
        // Use built-in texture or fallback
        system.particleTexture = new BABYLON.Texture(this.textureUrl, this.scene);
        
        system.emitter = position;
        system.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        system.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);

        // Colors - gold burst
        system.color1 = PARTICLE_PALETTES.gold.start;
        system.color2 = new BABYLON.Color4(1, 0.8, 0.3, 1);
        system.colorDead = PARTICLE_PALETTES.gold.end;

        // Size
        system.minSize = 0.1;
        system.maxSize = 0.25;

        // Lifetime
        system.minLifeTime = 0.2;
        system.maxLifeTime = 0.5;

        // Emission
        system.emitRate = 100;
        system.manualEmitCount = 30;

        // Speed
        system.minEmitPower = 2;
        system.maxEmitPower = 4;
        system.updateSpeed = 0.01;

        // Direction - radial burst
        system.direction1 = new BABYLON.Vector3(-1, 1, -1);
        system.direction2 = new BABYLON.Vector3(1, 2, 1);

        // Gravity (slight float up)
        system.gravity = new BABYLON.Vector3(0, -2, 0);

        // Add sparkle variation
        system.addSizeGradient(0, 0.15);
        system.addSizeGradient(0.5, 0.25);
        system.addSizeGradient(1, 0);

        system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        system.start();

        // Auto dispose after effect
        setTimeout(() => system.dispose(), 600);

        return system;
    }

    /**
     * Create power-up activation effect
     */
    createPowerUpEffect(
        position: BABYLON.Vector3,
        type: 'power' | 'speed' | 'magnet'
    ): BABYLON.ParticleSystem {
        const system = new BABYLON.ParticleSystem(`powerUp_${type}`, 100, this.scene);
        system.particleTexture = new BABYLON.Texture(this.textureUrl, this.scene);
        system.emitter = position;

        // Type-specific colors
        const palettes = {
            power: PARTICLE_PALETTES.gold,
            speed: PARTICLE_PALETTES.neonCyan,
            magnet: PARTICLE_PALETTES.neonPurple
        };
        const palette = palettes[type];

        system.color1 = palette.start;
        system.color2 = palette.start;
        system.colorDead = palette.end;

        // Ring emission pattern
        system.createCylinderEmitter(1, 0.1, 0, 0);

        // Size with gradient
        system.minSize = 0.2;
        system.maxSize = 0.5;
        system.addSizeGradient(0, 0.3);
        system.addSizeGradient(0.5, 0.5);
        system.addSizeGradient(1, 0);

        // Lifetime
        system.minLifeTime = 0.5;
        system.maxLifeTime = 1.2;

        // Emission burst
        system.emitRate = 0;
        system.manualEmitCount = 80;

        // Outward expansion
        system.minEmitPower = 3;
        system.maxEmitPower = 6;

        system.gravity = new BABYLON.Vector3(0, 2, 0);
        system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        system.start();
        setTimeout(() => system.dispose(), 1500);

        return system;
    }

    /**
     * Create player trail effect
     */
    createTrailEffect(
        emitter: BABYLON.AbstractMesh,
        palette: keyof typeof PARTICLE_PALETTES = 'neonPurple'
    ): BABYLON.ParticleSystem {
        const id = `trail_${emitter.name}`;
        
        // Remove existing trail
        if (this.activeSystems.has(id)) {
            this.activeSystems.get(id)?.dispose();
        }

        const system = new BABYLON.ParticleSystem(id, 50, this.scene);
        system.particleTexture = new BABYLON.Texture(this.textureUrl, this.scene);
        system.emitter = emitter;

        const colors = PARTICLE_PALETTES[palette];
        system.color1 = colors.start;
        system.color2 = colors.start;
        system.colorDead = colors.end;

        system.minSize = 0.05;
        system.maxSize = 0.15;

        system.minLifeTime = 0.3;
        system.maxLifeTime = 0.6;

        system.emitRate = 30;

        system.minEmitPower = 0.1;
        system.maxEmitPower = 0.3;

        system.direction1 = new BABYLON.Vector3(0, -0.5, 0);
        system.direction2 = new BABYLON.Vector3(0, -1, 0);

        system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        system.start();
        this.activeSystems.set(id, system);

        return system;
    }

    /**
     * Create impact/bounce effect
     */
    createBounceEffect(position: BABYLON.Vector3, intensity = 1): BABYLON.ParticleSystem {
        const system = new BABYLON.ParticleSystem('bounce', Math.floor(20 * intensity), this.scene);
        system.particleTexture = new BABYLON.Texture(this.textureUrl, this.scene);
        system.emitter = position;

        system.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
        system.color2 = PARTICLE_PALETTES.neonCyan.start;
        system.colorDead = new BABYLON.Color4(1, 1, 1, 0);

        // Ground-level ring burst
        system.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
        system.maxEmitBox = new BABYLON.Vector3(0.2, 0.1, 0.2);

        system.minSize = 0.1 * intensity;
        system.maxSize = 0.3 * intensity;

        system.minLifeTime = 0.2;
        system.maxLifeTime = 0.4;

        system.emitRate = 0;
        system.manualEmitCount = Math.floor(20 * intensity);

        system.minEmitPower = 1 * intensity;
        system.maxEmitPower = 2 * intensity;

        // Radial outward on ground plane
        system.direction1 = new BABYLON.Vector3(-1, 0.2, -1);
        system.direction2 = new BABYLON.Vector3(1, 0.5, 1);

        system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

        system.start();
        setTimeout(() => system.dispose(), 500);

        return system;
    }

    /**
     * Create victory celebration effect
     */
    createVictoryEffect(position: BABYLON.Vector3): BABYLON.ParticleSystem {
        const system = new BABYLON.ParticleSystem('victory', 200, this.scene);
        system.particleTexture = new BABYLON.Texture(this.textureUrl, this.scene);
        system.emitter = position;

        // Multi-color confetti
        system.color1 = PARTICLE_PALETTES.rainbow.start;
        system.color2 = PARTICLE_PALETTES.neonCyan.start;
        system.colorDead = new BABYLON.Color4(1, 1, 0, 0);

        // Add color randomization
        system.addColorGradient(0, new BABYLON.Color4(1, 0.4, 0.7, 1));
        system.addColorGradient(0.33, new BABYLON.Color4(1, 0.9, 0.3, 1));
        system.addColorGradient(0.66, new BABYLON.Color4(0.4, 1, 0.7, 1));
        system.addColorGradient(1, new BABYLON.Color4(1, 1, 1, 0));

        // Wide emission
        system.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
        system.maxEmitBox = new BABYLON.Vector3(1, 0.5, 1);

        system.minSize = 0.15;
        system.maxSize = 0.4;

        system.minLifeTime = 1;
        system.maxLifeTime = 2;

        system.emitRate = 50;

        system.minEmitPower = 3;
        system.maxEmitPower = 8;

        system.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
        system.direction2 = new BABYLON.Vector3(0.5, 1.5, 0.5);

        system.gravity = new BABYLON.Vector3(0, -4, 0);

        // Add rotation for confetti feel
        system.minAngularSpeed = -Math.PI;
        system.maxAngularSpeed = Math.PI;

        system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

        system.start();

        // Run for 3 seconds
        setTimeout(() => {
            system.stop();
            setTimeout(() => system.dispose(), 2000);
        }, 3000);

        return system;
    }

    /**
     * Stop and dispose all active systems
     */
    dispose(): void {
        for (const system of this.activeSystems.values()) {
            system.dispose();
        }
        this.activeSystems.clear();
    }

    /**
     * Stop a specific trail effect
     */
    stopTrail(emitterName: string): void {
        const id = `trail_${emitterName}`;
        const system = this.activeSystems.get(id);
        if (system) {
            system.stop();
            setTimeout(() => {
                system.dispose();
                this.activeSystems.delete(id);
            }, 1000);
        }
    }
}
