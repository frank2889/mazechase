/**
 * Player3D - 3D Player representation for MazeChase
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Mesh,
    Animation,
    DynamicTexture,
    Plane,
    SineEase,
    EasingFunction
} from '@babylonjs/core';
import { TILE_SIZE_3D } from './maze';

export type SpriteType3D = 'runner' | 'ch0' | 'ch1' | 'ch2';

interface PlayerColors {
    primary: Color3;
    emissive: Color3;
}

const PLAYER_COLORS: Record<SpriteType3D, PlayerColors> = {
    runner: {
        primary: new Color3(1, 1, 0),      // Yellow
        emissive: new Color3(0.3, 0.3, 0)
    },
    ch0: {
        primary: new Color3(1, 0.2, 0.2),  // Red
        emissive: new Color3(0.3, 0.05, 0.05)
    },
    ch1: {
        primary: new Color3(0.2, 0.5, 1),  // Blue
        emissive: new Color3(0.05, 0.1, 0.3)
    },
    ch2: {
        primary: new Color3(1, 0.4, 0.7),  // Pink
        emissive: new Color3(0.3, 0.1, 0.2)
    }
};

export class Player3D {
    private scene: Scene;
    private mesh: Mesh;
    private material: StandardMaterial;
    private spriteType: SpriteType3D;
    private targetPosition: Vector3;
    private isPoweredUp: boolean = false;
    private isScared: boolean = false;
    private originalColor: Color3;
    private originalEmissive: Color3;
    private namePlane: Mesh | null = null;
    private nameMaterial: StandardMaterial | null = null;
    private playerName: string = '';

    // For smooth movement interpolation
    private moveSpeed: number = 8; // Units per second

    constructor(scene: Scene, spriteType: SpriteType3D, startTileX: number, startTileY: number) {
        this.scene = scene;
        this.spriteType = spriteType;

        const colors = PLAYER_COLORS[spriteType];
        this.originalColor = colors.primary.clone();
        this.originalEmissive = colors.emissive.clone();

        // Create material
        this.material = new StandardMaterial(`player_${spriteType}_mat`, scene);
        this.material.diffuseColor = colors.primary;
        this.material.emissiveColor = colors.emissive;
        this.material.specularColor = new Color3(0.5, 0.5, 0.5);

        // Create mesh based on type
        if (spriteType === 'runner') {
            // Runner is a sphere (like Pac-Man)
            this.mesh = MeshBuilder.CreateSphere(`player_${spriteType}`, {
                diameter: TILE_SIZE_3D * 0.6,
                segments: 16
            }, scene);
        } else {
            // Chasers are capsule-like (ghost shape)
            this.mesh = this.createGhostMesh(spriteType);
            // Add floating animation to ghosts
            this.addFloatingAnimation();
        }

        this.mesh.material = this.material;
        
        // Set initial position
        const startPos = this.tileToWorldPos(startTileX, startTileY);
        this.mesh.position = startPos;
        this.targetPosition = startPos.clone();
    }

    /**
     * Add floating/bobbing animation to ghosts
     */
    private addFloatingAnimation(): void {
        const frameRate = 30;
        
        // Floating Y animation
        const floatAnimation = new Animation(
            'ghostFloat',
            'position.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Get base Y from current position
        const baseY = TILE_SIZE_3D * 0.3;
        const floatHeight = 0.08;
        
        const keys = [
            { frame: 0, value: baseY },
            { frame: 20, value: baseY + floatHeight },
            { frame: 40, value: baseY }
        ];
        
        floatAnimation.setKeys(keys);
        
        // Add easing for smooth motion
        const easingFunction = new SineEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        floatAnimation.setEasingFunction(easingFunction);
        
        this.mesh.animations.push(floatAnimation);
        this.scene.beginAnimation(this.mesh, 0, 40, true);
    }

    /**
     * Set and display player name above the mesh
     */
    setName(name: string): void {
        this.playerName = name;
        
        // Remove existing name plane
        if (this.namePlane) {
            this.namePlane.dispose();
        }
        if (this.nameMaterial) {
            this.nameMaterial.dispose();
        }
        
        if (!name) return;
        
        // Create dynamic texture for text
        const textureSize = 256;
        const texture = new DynamicTexture(`nameTexture_${this.spriteType}`, textureSize, this.scene, true);
        texture.hasAlpha = true;
        
        // Draw text on texture
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, textureSize, textureSize);
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, textureSize / 2, textureSize / 2);
        texture.update();
        
        // Create plane for name
        const planeWidth = TILE_SIZE_3D * 1.5;
        const planeHeight = TILE_SIZE_3D * 0.4;
        this.namePlane = MeshBuilder.CreatePlane(`namePlane_${this.spriteType}`, {
            width: planeWidth,
            height: planeHeight
        }, this.scene);
        
        // Position above player
        this.namePlane.parent = this.mesh;
        this.namePlane.position.y = TILE_SIZE_3D * 0.6;
        
        // Billboard mode - always faces camera
        this.namePlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        
        // Create material with texture
        this.nameMaterial = new StandardMaterial(`nameMat_${this.spriteType}`, this.scene);
        this.nameMaterial.diffuseTexture = texture;
        this.nameMaterial.emissiveTexture = texture;
        this.nameMaterial.useAlphaFromDiffuseTexture = true;
        this.nameMaterial.disableLighting = true;
        this.namePlane.material = this.nameMaterial;
    }

    /**
     * Get player name
     */
    getName(): string {
        return this.playerName;
    }

    private createGhostMesh(name: string): Mesh {
        // Create a ghost-like shape (cylinder with sphere top)
        const body = MeshBuilder.CreateCylinder(`${name}_body`, {
            height: TILE_SIZE_3D * 0.4,
            diameter: TILE_SIZE_3D * 0.5,
            tessellation: 16
        }, this.scene);
        
        const head = MeshBuilder.CreateSphere(`${name}_head`, {
            diameter: TILE_SIZE_3D * 0.5,
            segments: 16
        }, this.scene);
        head.position.y = TILE_SIZE_3D * 0.15;

        // Merge into single mesh
        const ghost = Mesh.MergeMeshes([body, head], true, true, undefined, false, true);
        ghost!.name = `player_${name}`;
        
        return ghost!;
    }

    private tileToWorldPos(tileX: number, tileY: number): Vector3 {
        return new Vector3(
            tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2,
            TILE_SIZE_3D * 0.3, // Slightly above floor
            tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2
        );
    }

    /**
     * Move to a specific tile position (with smooth interpolation)
     */
    moveTo(tileX: number, tileY: number): void {
        this.targetPosition = this.tileToWorldPos(tileX, tileY);
    }

    /**
     * Set position immediately (no interpolation)
     */
    setPosition(tileX: number, tileY: number): void {
        const pos = this.tileToWorldPos(tileX, tileY);
        this.mesh.position = pos;
        this.targetPosition = pos.clone();
    }

    /**
     * Set position from pixel coordinates (for compatibility with current system)
     */
    setPositionFromPixels(pixelX: number, pixelY: number, tileSize: number = 32): void {
        // Convert pixel coords to tile coords
        const tileX = pixelX / tileSize;
        const tileY = pixelY / tileSize;
        
        const pos = new Vector3(
            tileX * TILE_SIZE_3D,
            TILE_SIZE_3D * 0.3,
            tileY * TILE_SIZE_3D
        );
        
        this.mesh.position = pos;
        this.targetPosition = pos.clone();
    }

    /**
     * Update player (call each frame for smooth movement)
     */
    update(deltaTime: number): void {
        // Smooth interpolation towards target
        const direction = this.targetPosition.subtract(this.mesh.position);
        const distance = direction.length();
        
        if (distance > 0.01) {
            const moveAmount = Math.min(this.moveSpeed * deltaTime, distance);
            const movement = direction.normalize().scale(moveAmount);
            this.mesh.position.addInPlace(movement);
        }
    }

    /**
     * Enable power-up visual (for runner)
     */
    setPoweredUp(powered: boolean): void {
        this.isPoweredUp = powered;
        
        if (powered) {
            // Glow red when powered up
            this.material.emissiveColor = new Color3(0.5, 0, 0);
            this.material.diffuseColor = new Color3(1, 0.3, 0.3);
        } else {
            // Reset to original colors
            this.material.diffuseColor = this.originalColor;
            this.material.emissiveColor = this.originalEmissive;
        }
    }

    /**
     * Set scared state (for chasers when runner has power-up)
     */
    setScared(scared: boolean): void {
        if (this.spriteType === 'runner') return; // Runner doesn't get scared
        
        this.isScared = scared;
        
        if (scared) {
            // Turn blue and flicker when scared
            this.material.diffuseColor = new Color3(0.2, 0.3, 1);
            this.material.emissiveColor = new Color3(0.1, 0.15, 0.5);
        } else {
            // Reset to original colors
            this.material.diffuseColor = this.originalColor;
            this.material.emissiveColor = this.originalEmissive;
        }
    }

    /**
     * Get current world position
     */
    getPosition(): Vector3 {
        return this.mesh.position.clone();
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.mesh.isVisible = visible;
        if (this.namePlane) {
            this.namePlane.isVisible = visible;
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.namePlane) {
            this.namePlane.dispose();
        }
        if (this.nameMaterial) {
            this.nameMaterial.dispose();
        }
        this.mesh.dispose();
        this.material.dispose();
    }
}
