import * as BABYLON from '@babylonjs/core';
import type { MazeUpdate } from '../game/connection';

/**
 * DynamicMaze - Handles real-time maze modifications
 * Supports wall additions, removals, and movements
 */
export class DynamicMaze {
    private scene: BABYLON.Scene;
    private wallMeshes: Map<string, BABYLON.Mesh> = new Map();
    private pendingUpdates: MazeUpdate[] = [];
    private wallMaterial: BABYLON.StandardMaterial | null = null;
    private animatingWalls: Set<string> = new Set();
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.createWallMaterial();
    }
    
    /**
     * Create the shared wall material
     */
    private createWallMaterial(): void {
        this.wallMaterial = new BABYLON.StandardMaterial('dynamicWallMat', this.scene);
        this.wallMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.6);
        this.wallMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.3);
        this.wallMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.5);
    }
    
    /**
     * Register existing wall meshes from the main maze
     * Call this after the maze is loaded
     */
    public registerExistingWalls(walls: BABYLON.Mesh[]): void {
        for (const wall of walls) {
            // Extract position from mesh
            const x = Math.round(wall.position.x);
            const z = Math.round(wall.position.z);
            const key = this.getWallKey(x, z);
            this.wallMeshes.set(key, wall);
        }
        console.log(`Registered ${walls.length} existing wall meshes`);
    }
    
    /**
     * Handle maze update from server
     */
    public handleMazeUpdate(update: MazeUpdate): void {
        console.log('Processing maze update:', update);
        
        switch (update.type) {
            case 'wall_add':
                this.addWall(update.x, update.y, update.duration);
                break;
            case 'wall_remove':
                this.removeWall(update.x, update.y, update.duration);
                break;
            case 'wall_move':
                this.moveWall(
                    update.x, update.y,
                    update.targetX!, update.targetY!,
                    update.duration
                );
                break;
        }
    }
    
    /**
     * Add a new wall with animation
     */
    private addWall(x: number, z: number, duration: number): void {
        const key = this.getWallKey(x, z);
        
        // Check if wall already exists
        if (this.wallMeshes.has(key)) {
            console.log('Wall already exists at', x, z);
            return;
        }
        
        // Create wall mesh
        const wall = BABYLON.MeshBuilder.CreateBox(
            `dynamicWall_${key}`,
            { width: 1, height: 1.5, depth: 1 },
            this.scene
        );
        
        wall.position = new BABYLON.Vector3(x, -1, z); // Start below ground
        wall.material = this.wallMaterial;
        
        this.wallMeshes.set(key, wall);
        this.animatingWalls.add(key);
        
        // Animate rising from ground
        const frameRate = 30;
        const frames = Math.round((duration / 1000) * frameRate);
        
        const riseAnimation = new BABYLON.Animation(
            `rise_${key}`,
            'position.y',
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        riseAnimation.setKeys([
            { frame: 0, value: -1 },
            { frame: frames, value: 0.75 }
        ]);
        
        // Add easing
        const ease = new BABYLON.QuarticEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEOUT);
        riseAnimation.setEasingFunction(ease);
        
        wall.animations = [riseAnimation];
        
        this.scene.beginAnimation(wall, 0, frames, false, 1, () => {
            this.animatingWalls.delete(key);
        });
        
        // Warning particles
        this.createWarningEffect(x, z, 'add');
    }
    
    /**
     * Remove a wall with animation
     */
    private removeWall(x: number, z: number, duration: number): void {
        const key = this.getWallKey(x, z);
        const wall = this.wallMeshes.get(key);
        
        if (!wall) {
            console.log('No wall to remove at', x, z);
            return;
        }
        
        this.animatingWalls.add(key);
        
        // Animate sinking into ground
        const frameRate = 30;
        const frames = Math.round((duration / 1000) * frameRate);
        
        const sinkAnimation = new BABYLON.Animation(
            `sink_${key}`,
            'position.y',
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        sinkAnimation.setKeys([
            { frame: 0, value: wall.position.y },
            { frame: frames, value: -1.5 }
        ]);
        
        const ease = new BABYLON.QuarticEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEIN);
        sinkAnimation.setEasingFunction(ease);
        
        wall.animations = [sinkAnimation];
        
        this.scene.beginAnimation(wall, 0, frames, false, 1, () => {
            wall.dispose();
            this.wallMeshes.delete(key);
            this.animatingWalls.delete(key);
        });
        
        // Warning particles
        this.createWarningEffect(x, z, 'remove');
    }
    
    /**
     * Move a wall from one position to another
     */
    private moveWall(
        fromX: number, fromZ: number,
        toX: number, toZ: number,
        duration: number
    ): void {
        const fromKey = this.getWallKey(fromX, fromZ);
        const toKey = this.getWallKey(toX, toZ);
        const wall = this.wallMeshes.get(fromKey);
        
        if (!wall) {
            console.log('No wall to move from', fromX, fromZ);
            return;
        }
        
        // Check if destination is occupied
        if (this.wallMeshes.has(toKey)) {
            console.log('Destination occupied at', toX, toZ);
            return;
        }
        
        this.animatingWalls.add(fromKey);
        
        // Move the wall
        const frameRate = 30;
        const frames = Math.round((duration / 1000) * frameRate);
        
        const moveAnimX = new BABYLON.Animation(
            `moveX_${fromKey}`,
            'position.x',
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const moveAnimZ = new BABYLON.Animation(
            `moveZ_${fromKey}`,
            'position.z',
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        moveAnimX.setKeys([
            { frame: 0, value: fromX },
            { frame: frames, value: toX }
        ]);
        
        moveAnimZ.setKeys([
            { frame: 0, value: fromZ },
            { frame: frames, value: toZ }
        ]);
        
        // Hop animation (rise and fall)
        const hopAnim = new BABYLON.Animation(
            `hop_${fromKey}`,
            'position.y',
            frameRate,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        hopAnim.setKeys([
            { frame: 0, value: 0.75 },
            { frame: frames / 2, value: 1.5 },
            { frame: frames, value: 0.75 }
        ]);
        
        wall.animations = [moveAnimX, moveAnimZ, hopAnim];
        
        this.scene.beginAnimation(wall, 0, frames, false, 1, () => {
            // Update key in map
            this.wallMeshes.delete(fromKey);
            this.wallMeshes.set(toKey, wall);
            this.animatingWalls.delete(fromKey);
        });
        
        // Warning particles at both locations
        this.createWarningEffect(fromX, fromZ, 'move');
        this.createWarningEffect(toX, toZ, 'move');
    }
    
    /**
     * Create warning particle effect before wall change
     */
    private createWarningEffect(x: number, z: number, type: 'add' | 'remove' | 'move'): void {
        const particles = new BABYLON.ParticleSystem('wallWarning', 100, this.scene);
        
        // Use built-in circle texture
        particles.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6AEGCgMzxQfCVQAAAMlJREFUWMPtl0EOwyAMBOe0f+qL+qnkCL4RYdpDkEqEHAzLJj5gez0+VpV9/bLH9y/wBQ7wAQvsgAV4gAd8QAMawAMewAM+YIEdcIAPWIAHfMADPuABH/AAD/iABnhAAzxgAQ9oQAM8wAM8YAEesAAP+IAGNMADPOADFuABC/CAD2iAB3hAAzygAR6wAA9YgAcs4AMa4AEe8AEL8IAFfMADGtAAD/gAD1iAByygAR7gAR/QAA9YgAcswAM+oAEe4AEf0AAPWIAHLL4HOLsPpEdZtTqAAAAASUVORK5CYII=', this.scene);
        
        particles.emitter = new BABYLON.Vector3(x, 0.5, z);
        particles.minEmitBox = new BABYLON.Vector3(-0.3, 0, -0.3);
        particles.maxEmitBox = new BABYLON.Vector3(0.3, 0, 0.3);
        
        // Color based on type
        let color: BABYLON.Color4;
        switch (type) {
            case 'add':
                color = new BABYLON.Color4(0.2, 0.2, 1, 1); // Blue - wall appearing
                break;
            case 'remove':
                color = new BABYLON.Color4(0.2, 1, 0.2, 1); // Green - wall disappearing
                break;
            case 'move':
                color = new BABYLON.Color4(1, 0.5, 0.2, 1); // Orange - wall moving
                break;
        }
        
        particles.color1 = color;
        particles.color2 = new BABYLON.Color4(color.r, color.g, color.b, 0.5);
        particles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.5;
        particles.maxLifeTime = 1.0;
        particles.emitRate = 100;
        
        particles.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
        particles.direction2 = new BABYLON.Vector3(0.5, 2, 0.5);
        
        particles.start();
        
        // Stop after brief warning
        setTimeout(() => {
            particles.stop();
            setTimeout(() => particles.dispose(), 1500);
        }, 300);
    }
    
    /**
     * Check if a position has a wall (including animating walls)
     */
    public hasWallAt(x: number, z: number): boolean {
        const key = this.getWallKey(Math.round(x), Math.round(z));
        return this.wallMeshes.has(key);
    }
    
    /**
     * Check if a wall at position is currently animating
     */
    public isWallAnimating(x: number, z: number): boolean {
        const key = this.getWallKey(Math.round(x), Math.round(z));
        return this.animatingWalls.has(key);
    }
    
    /**
     * Get unique key for wall position
     */
    private getWallKey(x: number, z: number): string {
        return `${x}_${z}`;
    }
    
    /**
     * Dispose all resources
     */
    public dispose(): void {
        for (const wall of this.wallMeshes.values()) {
            wall.dispose();
        }
        this.wallMeshes.clear();
        this.animatingWalls.clear();
        if (this.wallMaterial) {
            this.wallMaterial.dispose();
        }
    }
}
