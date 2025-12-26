/**
 * Maze3D - 3D Maze Renderer for MazeChase
 * 
 * Converts tilemap data to 3D geometry using Babylon.js
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Mesh,
    TransformNode,
    GlowLayer,
    Animation
} from '@babylonjs/core';

// Tile size in 3D world units
export const TILE_SIZE_3D = 1;

// Maze tile types (matching the tilemap)
export enum TileType {
    FLOOR = 0,
    WALL = 1,
    PELLET = 2,
    POWER_UP = 3
}

export interface MazeConfig {
    width: number;
    height: number;
    tiles: number[][]; // 2D array of tile types
}

export class Maze3D {
    private scene: Scene;
    private mazeRoot: TransformNode;
    private wallMeshes: Mesh[] = [];
    private floorMesh: Mesh | null = null;
    private pelletMeshes: Map<string, Mesh> = new Map();
    private powerUpMeshes: Map<string, Mesh> = new Map();
    private glowLayer: GlowLayer | null = null;

    // Materials
    private wallMaterial!: StandardMaterial;
    private floorMaterial!: StandardMaterial;
    private pelletMaterial!: StandardMaterial;
    private powerUpMaterial!: StandardMaterial;

    constructor(scene: Scene) {
        this.scene = scene;
        this.mazeRoot = new TransformNode('mazeRoot', scene);
        this.createMaterials();
        this.setupGlowLayer();
    }

    /**
     * Setup glow layer for pellets and power-ups
     */
    private setupGlowLayer(): void {
        this.glowLayer = new GlowLayer('glowLayer', this.scene);
        this.glowLayer.intensity = 0.8;
    }

    private createMaterials(): void {
        // Wall material - dark blue/purple like the original
        this.wallMaterial = new StandardMaterial('wallMat', this.scene);
        this.wallMaterial.diffuseColor = new Color3(0.1, 0.1, 0.4);
        this.wallMaterial.specularColor = new Color3(0.2, 0.2, 0.5);
        this.wallMaterial.emissiveColor = new Color3(0.05, 0.05, 0.15);

        // Floor material - darker
        this.floorMaterial = new StandardMaterial('floorMat', this.scene);
        this.floorMaterial.diffuseColor = new Color3(0.02, 0.02, 0.05);
        this.floorMaterial.specularColor = new Color3(0, 0, 0);

        // Pellet material - yellow/gold with strong glow
        this.pelletMaterial = new StandardMaterial('pelletMat', this.scene);
        this.pelletMaterial.diffuseColor = new Color3(1, 0.9, 0.2);
        this.pelletMaterial.emissiveColor = new Color3(0.8, 0.6, 0.1);
        this.pelletMaterial.specularColor = new Color3(1, 1, 0.5);

        // Power-up material - bright cyan/white with intense glow
        this.powerUpMaterial = new StandardMaterial('powerUpMat', this.scene);
        this.powerUpMaterial.diffuseColor = new Color3(1, 1, 1);
        this.powerUpMaterial.emissiveColor = new Color3(0.8, 1, 1);
        this.powerUpMaterial.specularColor = new Color3(1, 1, 1);
    }

    /**
     * Build the 3D maze from tilemap data
     */
    buildFromTilemap(config: MazeConfig): void {
        this.clear();

        const { width, height, tiles } = config;

        // Create floor plane
        this.floorMesh = MeshBuilder.CreateGround('floor', {
            width: width * TILE_SIZE_3D,
            height: height * TILE_SIZE_3D
        }, this.scene);
        this.floorMesh.material = this.floorMaterial;
        this.floorMesh.position = new Vector3(
            (width * TILE_SIZE_3D) / 2,
            -0.01, // Slightly below 0 to prevent z-fighting
            (height * TILE_SIZE_3D) / 2
        );
        this.floorMesh.parent = this.mazeRoot;

        // Process each tile
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileType = tiles[y]?.[x] ?? TileType.FLOOR;
                const pos = this.tileToWorldPos(x, y);

                switch (tileType) {
                    case TileType.WALL:
                        this.createWall(x, y, pos);
                        break;
                    case TileType.PELLET:
                        this.createPellet(x, y, pos);
                        break;
                    case TileType.POWER_UP:
                        this.createPowerUp(x, y, pos);
                        break;
                }
            }
        }
    }

    private tileToWorldPos(tileX: number, tileY: number): Vector3 {
        return new Vector3(
            tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2,
            0,
            tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2
        );
    }

    private createWall(tileX: number, tileY: number, pos: Vector3): void {
        const wall = MeshBuilder.CreateBox(`wall_${tileX}_${tileY}`, {
            width: TILE_SIZE_3D,
            height: TILE_SIZE_3D * 0.8,
            depth: TILE_SIZE_3D
        }, this.scene);
        
        wall.material = this.wallMaterial;
        wall.position = pos.clone();
        wall.position.y = TILE_SIZE_3D * 0.4; // Center vertically
        wall.parent = this.mazeRoot;
        
        this.wallMeshes.push(wall);
    }

    private createPellet(tileX: number, tileY: number, pos: Vector3): void {
        const pellet = MeshBuilder.CreateSphere(`pellet_${tileX}_${tileY}`, {
            diameter: TILE_SIZE_3D * 0.15
        }, this.scene);
        
        pellet.material = this.pelletMaterial;
        pellet.position = pos.clone();
        pellet.position.y = TILE_SIZE_3D * 0.15;
        pellet.parent = this.mazeRoot;
        
        // Add to glow layer
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(pellet);
        }
        
        this.pelletMeshes.set(`${tileX}_${tileY}`, pellet);
    }

    private createPowerUp(tileX: number, tileY: number, pos: Vector3): void {
        const powerUp = MeshBuilder.CreateSphere(`powerUp_${tileX}_${tileY}`, {
            diameter: TILE_SIZE_3D * 0.35
        }, this.scene);
        
        powerUp.material = this.powerUpMaterial;
        powerUp.position = pos.clone();
        powerUp.position.y = TILE_SIZE_3D * 0.2;
        powerUp.parent = this.mazeRoot;
        
        // Add to glow layer
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(powerUp);
        }
        
        // Add pulsing animation
        this.addPulseAnimation(powerUp);
        
        this.powerUpMeshes.set(`${tileX}_${tileY}`, powerUp);
    }

    /**
     * Add pulsing scale animation to a mesh
     */
    private addPulseAnimation(mesh: Mesh): void {
        const frameRate = 30;
        
        // Scale animation
        const scaleAnimation = new Animation(
            'pulseScale',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseScale = 1;
        const pulseScale = 1.3;
        
        const scaleKeys = [
            { frame: 0, value: new Vector3(baseScale, baseScale, baseScale) },
            { frame: 15, value: new Vector3(pulseScale, pulseScale, pulseScale) },
            { frame: 30, value: new Vector3(baseScale, baseScale, baseScale) }
        ];
        
        scaleAnimation.setKeys(scaleKeys);
        mesh.animations.push(scaleAnimation);
        
        // Also animate Y position for floating effect
        const floatAnimation = new Animation(
            'pulseFloat',
            'position.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = mesh.position.y;
        const floatKeys = [
            { frame: 0, value: baseY },
            { frame: 15, value: baseY + 0.1 },
            { frame: 30, value: baseY }
        ];
        
        floatAnimation.setKeys(floatKeys);
        mesh.animations.push(floatAnimation);
        
        this.scene.beginAnimation(mesh, 0, 30, true);
    }

    /**
     * Remove a pellet at the given tile coordinates
     */
    removePellet(tileX: number, tileY: number): void {
        const key = `${tileX}_${tileY}`;
        const pellet = this.pelletMeshes.get(key);
        if (pellet) {
            pellet.dispose();
            this.pelletMeshes.delete(key);
        }
    }

    /**
     * Remove a power-up at the given tile coordinates
     */
    removePowerUp(tileX: number, tileY: number): void {
        const key = `${tileX}_${tileY}`;
        const powerUp = this.powerUpMeshes.get(key);
        if (powerUp) {
            powerUp.dispose();
            this.powerUpMeshes.delete(key);
        }
    }

    /**
     * Get the center of the maze in world coordinates
     */
    getCenter(width: number, height: number): Vector3 {
        return new Vector3(
            (width * TILE_SIZE_3D) / 2,
            0,
            (height * TILE_SIZE_3D) / 2
        );
    }

    /**
     * Clear all maze geometry
     */
    clear(): void {
        this.wallMeshes.forEach(m => m.dispose());
        this.wallMeshes = [];
        
        this.pelletMeshes.forEach(m => m.dispose());
        this.pelletMeshes.clear();
        
        this.powerUpMeshes.forEach(m => m.dispose());
        this.powerUpMeshes.clear();
        
        if (this.floorMesh) {
            this.floorMesh.dispose();
            this.floorMesh = null;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.clear();
        this.mazeRoot.dispose();
    }
}
