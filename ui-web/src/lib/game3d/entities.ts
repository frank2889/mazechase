import * as BABYLON from '@babylonjs/core';
import type { DangerEntityData } from '../game/connection';

/**
 * EntityRenderer - Renders dangerous AI entities with particle/glow effects
 * Supports: Hunters (red), Scanners (orange), Sweepers (purple)
 */
export class EntityRenderer {
    private scene: BABYLON.Scene;
    private entities: Map<string, EntityMesh> = new Map();
    private glowLayer: BABYLON.GlowLayer | null = null;
    
    constructor(scene: BABYLON.Scene, glowLayer?: BABYLON.GlowLayer) {
        this.scene = scene;
        this.glowLayer = glowLayer || null;
    }
    
    /**
     * Update all entities from server data
     */
    public updateEntities(entitiesData: DangerEntityData[]): void {
        const existingIds = new Set(this.entities.keys());
        
        for (const data of entitiesData) {
            if (this.entities.has(data.id)) {
                // Update existing entity
                this.updateEntity(data);
            } else {
                // Create new entity
                this.createEntity(data);
            }
            existingIds.delete(data.id);
        }
        
        // Remove entities that no longer exist
        for (const id of existingIds) {
            this.removeEntity(id);
        }
    }
    
    /**
     * Create a new entity mesh
     */
    private createEntity(data: DangerEntityData): void {
        const mesh = this.createEntityMesh(data);
        
        // Create particle system for entity
        const particles = this.createEntityParticles(data);
        
        // Create scanner cone if applicable
        let scanCone: BABYLON.Mesh | null = null;
        if (data.type === 'scanner' && data.scanAngle) {
            scanCone = this.createScanCone(data);
        }
        
        const entityMesh: EntityMesh = {
            mesh,
            particles,
            scanCone,
            data
        };
        
        this.entities.set(data.id, entityMesh);
        
        // Add to glow layer
        if (this.glowLayer && mesh) {
            this.glowLayer.addIncludedOnlyMesh(mesh);
        }
    }
    
    /**
     * Create the main mesh for an entity
     */
    private createEntityMesh(data: DangerEntityData): BABYLON.Mesh {
        let mesh: BABYLON.Mesh;
        
        switch (data.type) {
            case 'hunter':
                // Aggressive angular shape
                mesh = BABYLON.MeshBuilder.CreatePolyhedron(`entity_${data.id}`, {
                    type: 1, // Octahedron
                    size: 0.4
                }, this.scene);
                break;
                
            case 'scanner':
                // Eye-like shape
                mesh = BABYLON.MeshBuilder.CreateSphere(`entity_${data.id}`, {
                    diameter: 0.5,
                    segments: 16
                }, this.scene);
                // Squash to make it more eye-like
                mesh.scaling = new BABYLON.Vector3(1.2, 0.6, 1);
                break;
                
            case 'sweeper':
                // Patrolling drone shape
                mesh = BABYLON.MeshBuilder.CreateCylinder(`entity_${data.id}`, {
                    diameter: 0.5,
                    height: 0.3,
                    tessellation: 6
                }, this.scene);
                break;
                
            default:
                mesh = BABYLON.MeshBuilder.CreateSphere(`entity_${data.id}`, {
                    diameter: 0.4
                }, this.scene);
        }
        
        // Create emissive material
        const material = new BABYLON.StandardMaterial(`entityMat_${data.id}`, this.scene);
        const color = BABYLON.Color3.FromHexString(data.glowColor);
        material.emissiveColor = color;
        material.diffuseColor = color.scale(0.5);
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        mesh.material = material;
        
        // Position
        mesh.position = new BABYLON.Vector3(data.x, 0.5, data.y);
        
        return mesh;
    }
    
    /**
     * Create particle system for entity aura
     */
    private createEntityParticles(data: DangerEntityData): BABYLON.ParticleSystem {
        const particles = new BABYLON.ParticleSystem(`entityParticles_${data.id}`, 50, this.scene);
        
        // Use built-in circle texture as fallback
        particles.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6AEGCgMzxQfCVQAAAMlJREFUWMPtl0EOwyAMBOe0f+qL+qnkCL4RYdpDkEqEHAzLJj5gez0+VpV9/bLH9y/wBQ7wAQvsgAV4gAd8QAMawAMewAM+YIEdcIAPWIAHfMADPuABH/AAD/iABnhAAzxgAQ9oQAM8wAM8YAEesAAP+IAGNMADPOADFuABC/CAD2iAB3hAAzygAR6wAA9YgAcs4AMa4AEe8AEL8IAFfMADGtAAD/gAD1iAByygAR7gAR/QAA9YgAcswAM+oAEe4AEf0AAPWIAHLL4HOLsPpEdZtTqAAAAASUVORK5CYII=', this.scene);
        
        // Emitter follows entity
        particles.emitter = new BABYLON.Vector3(data.x, 0.5, data.y);
        particles.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        particles.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        
        // Colors based on entity type
        const baseColor = BABYLON.Color4.FromHexString(data.glowColor + 'FF');
        particles.color1 = baseColor;
        particles.color2 = new BABYLON.Color4(baseColor.r, baseColor.g, baseColor.b, 0.5);
        particles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Particle properties
        particles.minSize = 0.05;
        particles.maxSize = 0.15;
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 0.8;
        particles.emitRate = 20;
        
        // Movement
        particles.direction1 = new BABYLON.Vector3(-0.1, 0.5, -0.1);
        particles.direction2 = new BABYLON.Vector3(0.1, 1, 0.1);
        particles.gravity = new BABYLON.Vector3(0, -0.5, 0);
        
        particles.start();
        
        return particles;
    }
    
    /**
     * Create scanner detection cone
     */
    private createScanCone(data: DangerEntityData): BABYLON.Mesh {
        const coneLength = data.detectionRange || 8;
        const coneAngle = data.scanAngle || (Math.PI / 3);
        const coneRadius = Math.tan(coneAngle / 2) * coneLength;
        
        const cone = BABYLON.MeshBuilder.CreateCylinder(`scanCone_${data.id}`, {
            diameterTop: 0,
            diameterBottom: coneRadius * 2,
            height: coneLength,
            tessellation: 16
        }, this.scene);
        
        // Semi-transparent material
        const material = new BABYLON.StandardMaterial(`coneMat_${data.id}`, this.scene);
        material.diffuseColor = BABYLON.Color3.FromHexString(data.glowColor);
        material.alpha = 0.15;
        material.backFaceCulling = false;
        cone.material = material;
        
        // Position and rotate
        cone.position = new BABYLON.Vector3(data.x, 0.5, data.y);
        cone.rotation.x = Math.PI / 2; // Point forward
        cone.rotation.y = data.scanDirection || 0;
        
        // Offset so tip is at entity
        cone.setPivotPoint(new BABYLON.Vector3(0, -coneLength / 2, 0));
        
        return cone;
    }
    
    /**
     * Update an existing entity
     */
    private updateEntity(data: DangerEntityData): void {
        const entity = this.entities.get(data.id);
        if (!entity) return;
        
        // Update position with smooth interpolation
        const targetPos = new BABYLON.Vector3(data.x, 0.5, data.y);
        entity.mesh.position = BABYLON.Vector3.Lerp(entity.mesh.position, targetPos, 0.2);
        
        // Update particle emitter
        if (entity.particles.emitter instanceof BABYLON.Vector3) {
            entity.particles.emitter.copyFrom(entity.mesh.position);
        }
        
        // Update material glow intensity based on alert level
        const material = entity.mesh.material as BABYLON.StandardMaterial;
        if (material) {
            const baseColor = BABYLON.Color3.FromHexString(data.glowColor);
            material.emissiveColor = baseColor.scale(0.5 + data.glow * 0.5);
        }
        
        // Update particle rate based on state
        if (data.state === 'chase') {
            entity.particles.emitRate = 50;
        } else if (data.state === 'alert') {
            entity.particles.emitRate = 35;
        } else {
            entity.particles.emitRate = 20;
        }
        
        // Update scanner cone rotation
        if (entity.scanCone && data.scanDirection !== undefined) {
            entity.scanCone.position.copyFrom(entity.mesh.position);
            entity.scanCone.rotation.y = data.scanDirection;
            
            // Pulse alpha based on alert
            const coneMat = entity.scanCone.material as BABYLON.StandardMaterial;
            if (coneMat) {
                coneMat.alpha = 0.1 + data.alert * 0.2;
            }
        }
        
        // Rotation animation based on state
        if (data.state === 'chase') {
            entity.mesh.rotation.y += 0.1;
        } else if (data.state === 'patrol') {
            entity.mesh.rotation.y += 0.02;
        }
        
        // Store updated data
        entity.data = data;
    }
    
    /**
     * Remove an entity
     */
    private removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (!entity) return;
        
        // Dispose mesh
        entity.mesh.dispose();
        
        // Dispose particles
        entity.particles.dispose();
        
        // Dispose scan cone
        if (entity.scanCone) {
            entity.scanCone.dispose();
        }
        
        this.entities.delete(id);
    }
    
    /**
     * Get entity at position (for collision detection)
     */
    public getEntityNear(x: number, y: number, radius: number = 0.5): DangerEntityData | null {
        for (const entity of this.entities.values()) {
            const dist = Math.sqrt(
                Math.pow(entity.data.x - x, 2) + 
                Math.pow(entity.data.y - y, 2)
            );
            if (dist < radius) {
                return entity.data;
            }
        }
        return null;
    }
    
    /**
     * Dispose all entities
     */
    public dispose(): void {
        for (const id of this.entities.keys()) {
            this.removeEntity(id);
        }
        this.entities.clear();
    }
}

interface EntityMesh {
    mesh: BABYLON.Mesh;
    particles: BABYLON.ParticleSystem;
    scanCone: BABYLON.Mesh | null;
    data: DangerEntityData;
}
