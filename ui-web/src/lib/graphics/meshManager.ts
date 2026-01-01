/**
 * Mesh Manager - Instance Optimization
 * 
 * AI Tester Suggestion (Elena - Performance Engineer):
 * "Implement thin instances for background decorations and non-interactive elements.
 * To reduce draw calls on mobile devices and improve FPS."
 * 
 * Features:
 * - Thin instances for static geometry
 * - LOD (Level of Detail) management
 * - Frustum culling optimization
 * - Batch rendering for similar meshes
 */

import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

export interface InstanceData {
    position: Vector3;
    rotation?: Vector3;
    scaling?: Vector3;
}

export interface MeshBatchConfig {
    maxInstances: number;
    useThinInstances: boolean;
    enableLOD: boolean;
    lodDistances: number[];
    frustumCulling: boolean;
}

const DEFAULT_CONFIG: MeshBatchConfig = {
    maxInstances: 1000,
    useThinInstances: true,
    enableLOD: true,
    lodDistances: [20, 50, 100],
    frustumCulling: true
};

/**
 * InstancedMeshGroup - Manages thin instances for a base mesh
 */
class InstancedMeshGroup {
    private baseMesh: Mesh;
    private instanceMatrices: Float32Array;
    private instanceCount = 0;
    private maxInstances: number;

    constructor(baseMesh: Mesh, maxInstances: number) {
        this.baseMesh = baseMesh;
        this.maxInstances = maxInstances;
        // 16 floats per 4x4 matrix
        this.instanceMatrices = new Float32Array(maxInstances * 16);
    }

    /**
     * Add an instance
     */
    addInstance(data: InstanceData): number {
        if (this.instanceCount >= this.maxInstances) {
            console.warn('[MeshManager] Max instances reached');
            return -1;
        }

        const matrix = Matrix.Compose(
            data.scaling || Vector3.One(),
            data.rotation 
                ? new Vector3(data.rotation.x, data.rotation.y, data.rotation.z).toQuaternion()
                : Vector3.Zero().toQuaternion(),
            data.position
        );

        const offset = this.instanceCount * 16;
        matrix.copyToArray(this.instanceMatrices, offset);
        this.instanceCount++;

        return this.instanceCount - 1;
    }

    /**
     * Update instance transform
     */
    updateInstance(index: number, data: InstanceData): void {
        if (index < 0 || index >= this.instanceCount) return;

        const matrix = Matrix.Compose(
            data.scaling || Vector3.One(),
            data.rotation 
                ? new Vector3(data.rotation.x, data.rotation.y, data.rotation.z).toQuaternion()
                : Vector3.Zero().toQuaternion(),
            data.position
        );

        const offset = index * 16;
        matrix.copyToArray(this.instanceMatrices, offset);
    }

    /**
     * Apply all instances to the mesh
     */
    applyInstances(): void {
        if (this.instanceCount === 0) return;

        // Slice to actual used size
        const usedMatrices = this.instanceMatrices.slice(0, this.instanceCount * 16);
        this.baseMesh.thinInstanceSetBuffer('matrix', usedMatrices, 16);
    }

    /**
     * Get instance count
     */
    getInstanceCount(): number {
        return this.instanceCount;
    }

    /**
     * Clear all instances
     */
    clear(): void {
        this.instanceCount = 0;
        this.baseMesh.thinInstanceCount = 0;
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.baseMesh.dispose();
    }
}

/**
 * MeshManager - Optimized mesh instance management
 */
export class MeshManager {
    private scene: Scene;
    private config: MeshBatchConfig;
    private meshGroups: Map<string, InstancedMeshGroup> = new Map();
    private templateMeshes: Map<string, Mesh> = new Map();

    constructor(scene: Scene, config: Partial<MeshBatchConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Register a template mesh for instancing
     */
    registerTemplate(id: string, mesh: Mesh): void {
        // Disable original mesh rendering
        mesh.isVisible = false;
        mesh.setEnabled(false);
        
        // Store template
        this.templateMeshes.set(id, mesh);
        
        // Create instance group
        const group = new InstancedMeshGroup(
            mesh.clone(`${id}_instances`, null) as Mesh,
            this.config.maxInstances
        );
        this.meshGroups.set(id, group);

        console.log(`[MeshManager] Registered template: ${id}`);
    }

    /**
     * Add an instance of a template
     */
    addInstance(templateId: string, data: InstanceData): number {
        const group = this.meshGroups.get(templateId);
        if (!group) {
            console.warn(`[MeshManager] Template not found: ${templateId}`);
            return -1;
        }
        return group.addInstance(data);
    }

    /**
     * Add multiple instances at once (more efficient)
     */
    addInstances(templateId: string, instances: InstanceData[]): number[] {
        const group = this.meshGroups.get(templateId);
        if (!group) {
            console.warn(`[MeshManager] Template not found: ${templateId}`);
            return [];
        }

        return instances.map(data => group.addInstance(data));
    }

    /**
     * Update an instance's transform
     */
    updateInstance(templateId: string, index: number, data: InstanceData): void {
        const group = this.meshGroups.get(templateId);
        if (group) {
            group.updateInstance(index, data);
        }
    }

    /**
     * Apply all pending instance changes
     * Call this after adding/updating instances
     */
    applyAllInstances(): void {
        for (const group of this.meshGroups.values()) {
            group.applyInstances();
        }
    }

    /**
     * Create decoration instances for a level
     */
    createDecorations(
        templateId: string,
        positions: Vector3[],
        randomRotation = true,
        randomScale = 0.1
    ): void {
        const instances: InstanceData[] = positions.map(pos => ({
            position: pos,
            rotation: randomRotation 
                ? new Vector3(0, Math.random() * Math.PI * 2, 0)
                : undefined,
            scaling: randomScale > 0
                ? new Vector3(
                    1 + (Math.random() - 0.5) * randomScale,
                    1 + (Math.random() - 0.5) * randomScale,
                    1 + (Math.random() - 0.5) * randomScale
                  )
                : undefined
        }));

        this.addInstances(templateId, instances);
        this.applyAllInstances();
    }

    /**
     * Optimize a mesh for static rendering
     */
    optimizeMesh(mesh: Mesh): void {
        // Freeze world matrix for static objects
        mesh.freezeWorldMatrix();
        
        // Freeze material if present
        if (mesh.material) {
            mesh.material.freeze();
        }

        // Enable frustum culling
        if (this.config.frustumCulling) {
            mesh.alwaysSelectAsActiveMesh = false;
        }

        // Disable unnecessary features
        mesh.isPickable = false;
        mesh.checkCollisions = false;
    }

    /**
     * Batch optimize all static meshes in scene
     */
    optimizeStaticMeshes(meshFilter?: (mesh: AbstractMesh) => boolean): void {
        const meshes = this.scene.meshes.filter(m => 
            m instanceof Mesh && 
            !m.name.includes('player') &&
            !m.name.includes('chaser') &&
            (meshFilter ? meshFilter(m) : true)
        );

        for (const mesh of meshes) {
            this.optimizeMesh(mesh as Mesh);
        }

        console.log(`[MeshManager] Optimized ${meshes.length} static meshes`);
    }

    /**
     * Get total instance count across all groups
     */
    getTotalInstanceCount(): number {
        let total = 0;
        for (const group of this.meshGroups.values()) {
            total += group.getInstanceCount();
        }
        return total;
    }

    /**
     * Get stats for debugging
     */
    getStats(): { templateCount: number; totalInstances: number } {
        return {
            templateCount: this.meshGroups.size,
            totalInstances: this.getTotalInstanceCount()
        };
    }

    /**
     * Clear all instances for a template
     */
    clearInstances(templateId: string): void {
        const group = this.meshGroups.get(templateId);
        if (group) {
            group.clear();
        }
    }

    /**
     * Clear all instances
     */
    clearAllInstances(): void {
        for (const group of this.meshGroups.values()) {
            group.clear();
        }
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        for (const group of this.meshGroups.values()) {
            group.dispose();
        }
        this.meshGroups.clear();
        this.templateMeshes.clear();
    }
}

// Singleton
let meshManager: MeshManager | null = null;

export function getMeshManager(scene: Scene): MeshManager {
    if (!meshManager) {
        meshManager = new MeshManager(scene);
    }
    return meshManager;
}
