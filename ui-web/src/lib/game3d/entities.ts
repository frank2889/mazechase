import * as BABYLON from '@babylonjs/core';
import type { DangerEntityData } from '../game/connection';

// LOD distance thresholds (Item #47)
const LOD_NEAR = 10;     // Full particles
const LOD_MEDIUM = 20;   // Reduced particles
const LOD_FAR = 30;      // Minimal particles

// EMMSOAI Performance Optimization (Elena):
// "Use thin instances for massive batching of entities to reduce draw calls"
const USE_THIN_INSTANCES = true;
const MAX_THIN_INSTANCES = 100;

/**
 * EntityRenderer - Renders dangerous AI entities with particle/glow effects
 * Supports: Hunters (red), Scanners (orange), Sweepers (purple)
 * 
 * OPTIMIZATION: Uses thin instances when multiple entities of same type exist
 */
export class EntityRenderer {
    private scene: BABYLON.Scene;
    private entities: Map<string, EntityMesh> = new Map();
    private glowLayer: BABYLON.GlowLayer | null = null;
    private playerPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    
    // Thin instance base meshes for batching (Elena's optimization)
    private baseMeshes: Map<string, BABYLON.Mesh> = new Map();
    private instanceMatrices: Map<string, Float32Array> = new Map();
    private instanceCounts: Map<string, number> = new Map();
    
    constructor(scene: BABYLON.Scene, glowLayer?: BABYLON.GlowLayer) {
        this.scene = scene;
        this.glowLayer = glowLayer || null;
        
        if (USE_THIN_INSTANCES) {
            this.initializeBaseMeshes();
        }
    }
    
    /**
     * Initialize base meshes for thin instancing (Performance optimization)
     */
    private initializeBaseMeshes(): void {
        // Hunter base mesh
        const hunterBase = BABYLON.MeshBuilder.CreatePolyhedron('hunter_base', {
            type: 1, size: 0.4
        }, this.scene);
        hunterBase.isVisible = false;
        hunterBase.thinInstanceEnablePicking = true;
        this.baseMeshes.set('hunter', hunterBase);
        this.instanceMatrices.set('hunter', new Float32Array(MAX_THIN_INSTANCES * 16));
        this.instanceCounts.set('hunter', 0);
        
        // Scanner base mesh
        const scannerBase = BABYLON.MeshBuilder.CreateSphere('scanner_base', {
            diameter: 0.5, segments: 16
        }, this.scene);
        scannerBase.scaling = new BABYLON.Vector3(1.2, 0.6, 1);
        scannerBase.isVisible = false;
        scannerBase.thinInstanceEnablePicking = true;
        this.baseMeshes.set('scanner', scannerBase);
        this.instanceMatrices.set('scanner', new Float32Array(MAX_THIN_INSTANCES * 16));
        this.instanceCounts.set('scanner', 0);
        
        // Sweeper base mesh
        const sweeperBase = BABYLON.MeshBuilder.CreateCylinder('sweeper_base', {
            diameter: 0.5, height: 0.3, tessellation: 6
        }, this.scene);
        sweeperBase.isVisible = false;
        sweeperBase.thinInstanceEnablePicking = true;
        this.baseMeshes.set('sweeper', sweeperBase);
        this.instanceMatrices.set('sweeper', new Float32Array(MAX_THIN_INSTANCES * 16));
        this.instanceCounts.set('sweeper', 0);
        
        console.log('⚡ Entity thin instances initialized for reduced draw calls');
    }
    
    /**
     * Batch update all thin instances (called after entity updates)
     */
    public flushThinInstances(): void {
        if (!USE_THIN_INSTANCES) return;
        
        for (const [type, baseMesh] of this.baseMeshes) {
            const count = this.instanceCounts.get(type) || 0;
            const matrices = this.instanceMatrices.get(type);
            
            if (count > 0 && matrices) {
                baseMesh.isVisible = true;
                baseMesh.thinInstanceSetBuffer('matrix', matrices.subarray(0, count * 16), 16);
            } else {
                baseMesh.isVisible = false;
            }
        }
    }
    
    /**
     * Reset instance counts for new frame
     */
    public beginFrame(): void {
        if (!USE_THIN_INSTANCES) return;
        
        for (const type of this.instanceCounts.keys()) {
            this.instanceCounts.set(type, 0);
        }
    }
    
    /**
     * Add entity to thin instance batch
     */
    private addToThinInstance(type: string, position: BABYLON.Vector3): void {
        const matrices = this.instanceMatrices.get(type);
        let count = this.instanceCounts.get(type) || 0;
        
        if (!matrices || count >= MAX_THIN_INSTANCES) return;
        
        const matrix = BABYLON.Matrix.Translation(position.x, position.y, position.z);
        matrix.copyToArray(matrices, count * 16);
        this.instanceCounts.set(type, count + 1);
    }
    
    /**
     * Update player position for LOD calculations (Item #47)
     */
    public setPlayerPosition(x: number, z: number): void {
        this.playerPosition.x = x;
        this.playerPosition.z = z;
    }
    
    /**
     * Update all entities from server data
     */
    public updateEntities(entitiesData: DangerEntityData[]): void {
        const existingIds = new Set(this.entities.keys());
        
        // Begin thin instance frame
        this.beginFrame();
        
        for (const data of entitiesData) {
            if (this.entities.has(data.id)) {
                // Update existing entity
                this.updateEntity(data);
            } else {
                // Create new entity
                this.createEntity(data);
            }
            existingIds.delete(data.id);
            
            // Add to thin instance batch
            if (USE_THIN_INSTANCES) {
                this.addToThinInstance(data.type, new BABYLON.Vector3(data.x, 0.5, data.y));
            }
        }
        
        // Flush thin instances
        this.flushThinInstances();
        
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
        
        const now = Date.now();
        const entityMesh: EntityMesh = {
            mesh,
            particles,
            scanCone,
            data,
            // Initialize position buffer for interpolation (Item #16)
            positionBuffer: [{ x: data.x, y: data.y, timestamp: now }],
            lastUpdateTime: now
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
        
        const now = Date.now();
        
        // Add to position buffer for interpolation (Item #16)
        entity.positionBuffer.push({ x: data.x, y: data.y, timestamp: now });
        
        // Keep only last 5 samples to prevent memory growth
        if (entity.positionBuffer.length > 5) {
            entity.positionBuffer.shift();
        }
        
        // Enhanced interpolation engine (Item #17)
        // Calculate velocity from buffer for prediction
        let velocityX = 0, velocityY = 0;
        if (entity.positionBuffer.length >= 2) {
            const recent = entity.positionBuffer[entity.positionBuffer.length - 1];
            const previous = entity.positionBuffer[entity.positionBuffer.length - 2];
            if (recent && previous) {
                const dt = (recent.timestamp - previous.timestamp) / 1000;
                if (dt > 0) {
                    velocityX = (recent.x - previous.x) / dt;
                    velocityY = (recent.y - previous.y) / dt;
                }
            }
        }
        
        // Calculate interpolation factor with cubic easing
        const timeDelta = now - entity.lastUpdateTime;
        const expectedInterval = 50; // ~20 updates/sec
        const t = Math.min(1, timeDelta / expectedInterval);
        // Cubic ease-out for smooth deceleration
        const lerpFactor = 1 - Math.pow(1 - t * 0.3, 3);
        
        // Predictive target position (extrapolate slightly)
        const prediction = 0.05; // 50ms look-ahead
        const targetPos = new BABYLON.Vector3(
            data.x + velocityX * prediction,
            0.5,
            data.y + velocityY * prediction
        );
        entity.mesh.position = BABYLON.Vector3.Lerp(entity.mesh.position, targetPos, lerpFactor);
        
        entity.lastUpdateTime = now;
        entity.data = data;
        
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
        
        // Calculate LOD based on distance to player (Item #47)
        const distToPlayer = BABYLON.Vector3.Distance(
            entity.mesh.position,
            this.playerPosition
        );
        
        // Update particle rate based on state AND distance (Item #47)
        let baseRate: number;
        if (data.state === 'chase') {
            baseRate = 50;
        } else if (data.state === 'alert') {
            baseRate = 35;
        } else {
            baseRate = 20;
        }
        
        // Apply LOD scaling to particle rate
        if (distToPlayer > LOD_FAR) {
            entity.particles.emitRate = baseRate * 0.2; // 20% particles
        } else if (distToPlayer > LOD_MEDIUM) {
            entity.particles.emitRate = baseRate * 0.5; // 50% particles
        } else if (distToPlayer > LOD_NEAR) {
            entity.particles.emitRate = baseRate * 0.75; // 75% particles
        } else {
            entity.particles.emitRate = baseRate; // Full particles
        }
        
        // Update scanner cone rotation
        if (entity.scanCone && data.scanDirection !== undefined) {
            entity.scanCone.position.copyFrom(entity.mesh.position);
            entity.scanCone.rotation.y = data.scanDirection;
            
            // Pulsating alpha based on alert + time (Item #36)
            const coneMat = entity.scanCone.material as BABYLON.StandardMaterial;
            if (coneMat) {
                const time = Date.now() / 1000;
                const pulseSpeed = 2 + data.alert * 3; // Faster pulse when alert
                const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5; // 0-1 oscillation
                const baseAlpha = 0.1 + data.alert * 0.15;
                coneMat.alpha = baseAlpha + pulse * 0.1;
                
                // Also pulse the color intensity
                const baseColor = BABYLON.Color3.FromHexString(data.glowColor);
                coneMat.emissiveColor = baseColor.scale(0.2 + pulse * 0.3);
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

// Position sample for timestamp-based interpolation (Item #16)
interface PositionSample {
    x: number;
    y: number;
    timestamp: number;
}

interface EntityMesh {
    mesh: BABYLON.Mesh;
    particles: BABYLON.ParticleSystem;
    scanCone: BABYLON.Mesh | null;
    data: DangerEntityData;
    positionBuffer: PositionSample[]; // For smooth interpolation
    lastUpdateTime: number;
}
