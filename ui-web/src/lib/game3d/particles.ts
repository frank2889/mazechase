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

    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create a small invisible mesh to use as particle emitter
        this.emitterMesh = MeshBuilder.CreateSphere('particleEmitter', { diameter: 0.01 }, scene);
        this.emitterMesh.isVisible = false;
    }

    /**
     * Create pellet eat particle burst
     */
    createPelletEatEffect(tileX: number, tileY: number): void {
        const worldX = tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const worldZ = tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        
        const particleSystem = new ParticleSystem('pelletEat', 20, this.scene);
        
        // Position emitter
        this.emitterMesh.position.set(worldX, TILE_SIZE_3D * 0.2, worldZ);
        particleSystem.emitter = this.emitterMesh.position.clone();
        
        // Colors - yellow/gold like pellets
        particleSystem.color1 = new Color4(1, 0.9, 0.2, 1);
        particleSystem.color2 = new Color4(1, 0.7, 0.1, 1);
        particleSystem.colorDead = new Color4(1, 0.5, 0, 0);
        
        // Size
        particleSystem.minSize = 0.05;
        particleSystem.maxSize = 0.12;
        
        // Lifetime
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.4;
        
        // Emission rate (burst)
        particleSystem.emitRate = 100;
        particleSystem.manualEmitCount = 15;
        
        // Speed and direction (explode outward)
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 2, 1);
        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 1;
        
        // Gravity
        particleSystem.gravity = new Vector3(0, -3, 0);
        
        // Blending
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Start and dispose after short time
        particleSystem.start();
        
        setTimeout(() => {
            particleSystem.dispose();
        }, 500);
    }

    /**
     * Create power-up eat particle burst
     */
    createPowerUpEatEffect(tileX: number, tileY: number): void {
        const worldX = tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        const worldZ = tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2;
        
        const particleSystem = new ParticleSystem('powerUpEat', 50, this.scene);
        
        // Position emitter
        particleSystem.emitter = new Vector3(worldX, TILE_SIZE_3D * 0.3, worldZ);
        
        // Colors - cyan/white like power-ups
        particleSystem.color1 = new Color4(0.5, 1, 1, 1);
        particleSystem.color2 = new Color4(1, 1, 1, 1);
        particleSystem.colorDead = new Color4(0, 0.5, 1, 0);
        
        // Size
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.25;
        
        // Lifetime
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.6;
        
        // Emission (bigger burst)
        particleSystem.emitRate = 200;
        particleSystem.manualEmitCount = 40;
        
        // Speed and direction (explode outward in all directions)
        particleSystem.direction1 = new Vector3(-1, 0.5, -1);
        particleSystem.direction2 = new Vector3(1, 2, 1);
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 2;
        
        // Gravity
        particleSystem.gravity = new Vector3(0, -2, 0);
        
        // Blending
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Start and dispose
        particleSystem.start();
        
        setTimeout(() => {
            particleSystem.dispose();
        }, 700);
    }

    /**
     * Create player caught particle effect
     */
    createPlayerCaughtEffect(worldX: number, worldY: number, worldZ: number): void {
        const particleSystem = new ParticleSystem('playerCaught', 100, this.scene);
        
        // Position emitter
        particleSystem.emitter = new Vector3(worldX, worldY, worldZ);
        
        // Colors - red/orange explosion
        particleSystem.color1 = new Color4(1, 0.3, 0.1, 1);
        particleSystem.color2 = new Color4(1, 0.6, 0.2, 1);
        particleSystem.colorDead = new Color4(0.5, 0, 0, 0);
        
        // Size
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        // Lifetime
        particleSystem.minLifeTime = 0.4;
        particleSystem.maxLifeTime = 0.8;
        
        // Emission (big burst)
        particleSystem.emitRate = 300;
        particleSystem.manualEmitCount = 60;
        
        // Speed and direction
        particleSystem.direction1 = new Vector3(-1, -0.5, -1);
        particleSystem.direction2 = new Vector3(1, 1.5, 1);
        particleSystem.minEmitPower = 1.5;
        particleSystem.maxEmitPower = 3;
        
        // Gravity
        particleSystem.gravity = new Vector3(0, -4, 0);
        
        // Blending
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Start and dispose
        particleSystem.start();
        
        setTimeout(() => {
            particleSystem.dispose();
        }, 1000);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.emitterMesh.dispose();
    }
}
