/**
 * Particle Effects for MazeChase 3D
 */

import {
    Scene,
    Vector3,
    Color4,
    ParticleSystem,
    Texture,
    MeshBuilder,
    Mesh
} from '@babylonjs/core';
import { TILE_SIZE_3D } from './maze';

export class ParticleManager {
    private scene: Scene;
    private emitterMesh: Mesh;
    private qualityMultiplier: number = 1.0; // Sprint 4: Adaptive quality

    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create a small invisible mesh to use as particle emitter
        this.emitterMesh = MeshBuilder.CreateSphere('particleEmitter', { diameter: 0.01 }, scene);
        this.emitterMesh.isVisible = false;
    }
    
    /**
     * Sprint 4: Set particle quality multiplier for adaptive performance
     * @param multiplier 0.0-1.0, lower = fewer particles
     */
    setQuality(multiplier: number): void {
        this.qualityMultiplier = Math.max(0.1, Math.min(1.0, multiplier));
        console.log(`⚡ Particle quality set to ${(this.qualityMultiplier * 100).toFixed(0)}%`);
    }
    
    /**
     * Get scaled particle count based on quality
     */
    private getScaledCount(baseCount: number): number {
        return Math.ceil(baseCount * this.qualityMultiplier);
    }

    /**
     * Create pellet eat particle burst - Enhanced with more glitter/sparkles (AI suggestion: Emma, Tim, Sandra, Peter)
     * Sprint 4: Particle count scales with quality setting
     */
    createPelletEatEffect(tileX: number, tileY: number): void {
        const worldX = tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const worldZ = tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const pos = new Vector3(worldX, TILE_SIZE_3D * 0.2, worldZ);
        
        // Main burst particles - scaled by quality
        const particleCount = this.getScaledCount(30);
        const particleSystem = new ParticleSystem('pelletEat', particleCount, this.scene);
        this.emitterMesh.position.set(worldX, TILE_SIZE_3D * 0.2, worldZ);
        particleSystem.emitter = pos.clone();
        
        // Colors - yellow/gold like pellets with more variation
        particleSystem.color1 = new Color4(1, 0.95, 0.3, 1);
        particleSystem.color2 = new Color4(1, 0.8, 0.1, 1);
        particleSystem.colorDead = new Color4(1, 0.6, 0, 0);
        
        // Larger size for more impact
        particleSystem.minSize = 0.06;
        particleSystem.maxSize = 0.15;
        
        // Lifetime
        particleSystem.minLifeTime = 0.25;
        particleSystem.maxLifeTime = 0.5;
        
        // Emission rate (burst) - scaled by quality
        particleSystem.emitRate = this.getScaledCount(150);
        particleSystem.manualEmitCount = this.getScaledCount(25);
        
        // Speed and direction (explode outward)
        particleSystem.direction1 = new Vector3(-1, 1.5, -1);
        particleSystem.direction2 = new Vector3(1, 2.5, 1);
        particleSystem.minEmitPower = 0.7;
        particleSystem.maxEmitPower = 1.3;
        
        // Gravity
        particleSystem.gravity = new Vector3(0, -3, 0);
        
        // Blending
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.start();
        
        // Extra sparkle/glitter effect - small white particles that rise
        const sparkles = new ParticleSystem('pelletSparkle', 15, this.scene);
        sparkles.emitter = pos.clone();
        sparkles.color1 = new Color4(1, 1, 1, 1);
        sparkles.color2 = new Color4(1, 1, 0.8, 0.8);
        sparkles.colorDead = new Color4(1, 1, 1, 0);
        sparkles.minSize = 0.02;
        sparkles.maxSize = 0.06;
        sparkles.minLifeTime = 0.3;
        sparkles.maxLifeTime = 0.6;
        sparkles.emitRate = 80;
        sparkles.manualEmitCount = 12;
        sparkles.direction1 = new Vector3(-0.3, 2, -0.3);
        sparkles.direction2 = new Vector3(0.3, 3, 0.3);
        sparkles.minEmitPower = 0.5;
        sparkles.maxEmitPower = 1;
        sparkles.gravity = new Vector3(0, 0.5, 0); // Float up
        sparkles.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparkles.start();
        
        setTimeout(() => {
            particleSystem.dispose();
            sparkles.dispose();
        }, 600);
    }

    /**
     * Create power-up eat particle burst - Enhanced with magic effects (AI suggestion: Emma, Sandra)
     */
    createPowerUpEatEffect(tileX: number, tileY: number): void {
        const worldX = tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const worldZ = tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const pos = new Vector3(worldX, TILE_SIZE_3D * 0.3, worldZ);
        
        // Main burst - bigger and more impactful
        const particleSystem = new ParticleSystem('powerUpEat', 80, this.scene);
        particleSystem.emitter = pos.clone();
        
        // Colors - cyan/white like power-ups with more vibrancy
        particleSystem.color1 = new Color4(0.3, 1, 1, 1);
        particleSystem.color2 = new Color4(1, 1, 1, 1);
        particleSystem.colorDead = new Color4(0, 0.7, 1, 0);
        
        // Size - larger for more wow
        particleSystem.minSize = 0.12;
        particleSystem.maxSize = 0.3;
        
        // Lifetime
        particleSystem.minLifeTime = 0.35;
        particleSystem.maxLifeTime = 0.7;
        
        // Emission (bigger burst)
        particleSystem.emitRate = 300;
        particleSystem.manualEmitCount = 60;
        
        // Speed and direction (explode outward in all directions)
        particleSystem.direction1 = new Vector3(-1.5, 0.5, -1.5);
        particleSystem.direction2 = new Vector3(1.5, 2.5, 1.5);
        particleSystem.minEmitPower = 1.2;
        particleSystem.maxEmitPower = 2.5;
        
        // Gravity
        particleSystem.gravity = new Vector3(0, -2, 0);
        
        // Blending
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        particleSystem.start();
        
        // Magic sparkle ring effect - circular sparkles
        const magicRing = new ParticleSystem('powerUpMagic', 40, this.scene);
        magicRing.emitter = pos.clone();
        magicRing.color1 = new Color4(1, 0.8, 1, 1);
        magicRing.color2 = new Color4(0.8, 0.5, 1, 1);
        magicRing.colorDead = new Color4(1, 0.5, 1, 0);
        magicRing.minSize = 0.04;
        magicRing.maxSize = 0.1;
        magicRing.minLifeTime = 0.5;
        magicRing.maxLifeTime = 0.9;
        magicRing.emitRate = 150;
        magicRing.manualEmitCount = 30;
        // Circular outward
        magicRing.direction1 = new Vector3(-2, 0.2, -2);
        magicRing.direction2 = new Vector3(2, 0.5, 2);
        magicRing.minEmitPower = 1.5;
        magicRing.maxEmitPower = 2;
        magicRing.gravity = new Vector3(0, 1, 0); // Float up
        magicRing.blendMode = ParticleSystem.BLENDMODE_ADD;
        magicRing.start();
        
        // Rising glitter stars
        const glitter = new ParticleSystem('powerUpGlitter', 25, this.scene);
        glitter.emitter = pos.clone();
        glitter.color1 = new Color4(1, 1, 1, 1);
        glitter.color2 = new Color4(1, 1, 0.7, 0.9);
        glitter.colorDead = new Color4(1, 1, 1, 0);
        glitter.minSize = 0.03;
        glitter.maxSize = 0.08;
        glitter.minLifeTime = 0.6;
        glitter.maxLifeTime = 1.0;
        glitter.emitRate = 80;
        glitter.manualEmitCount = 20;
        glitter.direction1 = new Vector3(-0.5, 2, -0.5);
        glitter.direction2 = new Vector3(0.5, 4, 0.5);
        glitter.minEmitPower = 0.8;
        glitter.maxEmitPower = 1.5;
        glitter.gravity = new Vector3(0, 0.3, 0);
        glitter.blendMode = ParticleSystem.BLENDMODE_ADD;
        glitter.start();
        
        // Dispose all
        setTimeout(() => {
            particleSystem.dispose();
            magicRing.dispose();
            glitter.dispose();
        }, 1000);
    }

    /**
     * Create player caught particle effect
     * SPRINT 2: Enhanced with shockwave and multi-layer explosion (Yuki recommendation)
     */
    createPlayerCaughtEffect(worldX: number, worldY: number, worldZ: number): void {
        const pos = new Vector3(worldX, worldY, worldZ);
        
        // Layer 1: Main burst - red/orange explosion
        const mainBurst = new ParticleSystem('playerCaught_main', 100, this.scene);
        mainBurst.emitter = pos.clone();
        mainBurst.color1 = new Color4(1, 0.3, 0.1, 1);
        mainBurst.color2 = new Color4(1, 0.6, 0.2, 1);
        mainBurst.colorDead = new Color4(0.5, 0, 0, 0);
        mainBurst.minSize = 0.12;
        mainBurst.maxSize = 0.35;
        mainBurst.minLifeTime = 0.4;
        mainBurst.maxLifeTime = 0.8;
        mainBurst.emitRate = 400;
        mainBurst.manualEmitCount = 80;
        mainBurst.direction1 = new Vector3(-1.5, -0.5, -1.5);
        mainBurst.direction2 = new Vector3(1.5, 2, 1.5);
        mainBurst.minEmitPower = 2;
        mainBurst.maxEmitPower = 4;
        mainBurst.gravity = new Vector3(0, -5, 0);
        mainBurst.blendMode = ParticleSystem.BLENDMODE_ADD;
        mainBurst.start();
        
        // Layer 2: Shockwave ring - expands outward
        const shockwave = new ParticleSystem('playerCaught_shock', 50, this.scene);
        shockwave.emitter = pos.clone();
        shockwave.color1 = new Color4(1, 0.8, 0.3, 0.9);
        shockwave.color2 = new Color4(1, 0.5, 0.1, 0.7);
        shockwave.colorDead = new Color4(1, 0.3, 0, 0);
        shockwave.minSize = 0.08;
        shockwave.maxSize = 0.2;
        shockwave.minLifeTime = 0.3;
        shockwave.maxLifeTime = 0.5;
        shockwave.emitRate = 250;
        shockwave.manualEmitCount = 40;
        // Horizontal ring expansion
        shockwave.direction1 = new Vector3(-2, 0, -2);
        shockwave.direction2 = new Vector3(2, 0.3, 2);
        shockwave.minEmitPower = 3;
        shockwave.maxEmitPower = 5;
        shockwave.gravity = new Vector3(0, -1, 0);
        shockwave.blendMode = ParticleSystem.BLENDMODE_ADD;
        shockwave.start();
        
        // Layer 3: Smoke poof - darker, slower
        const smoke = new ParticleSystem('playerCaught_smoke', 30, this.scene);
        smoke.emitter = pos.clone();
        smoke.color1 = new Color4(0.4, 0.3, 0.3, 0.6);
        smoke.color2 = new Color4(0.2, 0.15, 0.15, 0.4);
        smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
        smoke.minSize = 0.2;
        smoke.maxSize = 0.5;
        smoke.minLifeTime = 0.8;
        smoke.maxLifeTime = 1.5;
        smoke.emitRate = 100;
        smoke.manualEmitCount = 25;
        smoke.direction1 = new Vector3(-0.5, 0.5, -0.5);
        smoke.direction2 = new Vector3(0.5, 2, 0.5);
        smoke.minEmitPower = 0.5;
        smoke.maxEmitPower = 1;
        smoke.gravity = new Vector3(0, 0.5, 0); // Float up
        smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        smoke.start();
        
        // Layer 4: Sparks - small fast particles
        const sparks = new ParticleSystem('playerCaught_sparks', 40, this.scene);
        sparks.emitter = pos.clone();
        sparks.color1 = new Color4(1, 1, 0.5, 1);
        sparks.color2 = new Color4(1, 0.8, 0.2, 1);
        sparks.colorDead = new Color4(1, 0.5, 0, 0);
        sparks.minSize = 0.02;
        sparks.maxSize = 0.06;
        sparks.minLifeTime = 0.5;
        sparks.maxLifeTime = 1.0;
        sparks.emitRate = 200;
        sparks.manualEmitCount = 35;
        sparks.direction1 = new Vector3(-2, 1, -2);
        sparks.direction2 = new Vector3(2, 4, 2);
        sparks.minEmitPower = 2;
        sparks.maxEmitPower = 5;
        sparks.gravity = new Vector3(0, -8, 0);
        sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparks.start();
        
        // Dispose all
        setTimeout(() => {
            mainBurst.dispose();
            shockwave.dispose();
            smoke.dispose();
            sparks.dispose();
        }, 1500);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.emitterMesh.dispose();
    }
}
