/**
 * Mesh Manager - Instanced Rendering
 * EMMSOAI Suggestion (Elena - Backend & Infrastructure Engineer):
 * "Gebruik mesh instances ipv individuele meshes voor pellets"
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Configuration for instanced mesh groups
 */
export interface InstanceGroupConfig {
    maxInstances: number;
    baseMesh: BABYLON.Mesh;
    material?: BABYLON.Material;
}

/**
 * Instance data for tracking
 */
export interface InstanceData {
    id: string;
    instance: BABYLON.InstancedMesh;
    position: BABYLON.Vector3;
    scaling: BABYLON.Vector3;
    active: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * Mesh Manager for optimized instanced rendering
 * Critical for performance with many similar objects (pellets, particles, etc.)
 */
export class MeshManager {
    private scene: BABYLON.Scene;
    private instanceGroups: Map<string, {
        baseMesh: BABYLON.Mesh;
        instances: InstanceData[];
        pool: InstanceData[];
        config: InstanceGroupConfig;
    }> = new Map();
    
    private stats = {
        totalInstances: 0,
        activeInstances: 0,
        pooledInstances: 0,
        drawCalls: 0
    };

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }

    /**
     * Register a new instance group
     */
    registerGroup(groupId: string, config: InstanceGroupConfig): void {
        if (this.instanceGroups.has(groupId)) {
            console.warn(`[MeshManager] Group '${groupId}' already exists`);
            return;
        }

        // Optimize base mesh for instancing
        config.baseMesh.isVisible = false;
        
        if (config.material) {
            config.baseMesh.material = config.material;
        }

        this.instanceGroups.set(groupId, {
            baseMesh: config.baseMesh,
            instances: [],
            pool: [],
            config
        });

        console.log(`[MeshManager] Registered group '${groupId}' with max ${config.maxInstances} instances`);
    }

    /**
     * Create pellet instance group (common use case)
     */
    createPelletGroup(material?: BABYLON.Material): void {
        const baseMesh = BABYLON.MeshBuilder.CreateSphere('pelletBase', {
            diameter: 0.3,
            segments: 8
        }, this.scene);

        this.registerGroup('pellets', {
            maxInstances: 500,
            baseMesh,
            material
        });
    }

    /**
     * Create power-up instance group
     */
    createPowerUpGroup(material?: BABYLON.Material): void {
        const baseMesh = BABYLON.MeshBuilder.CreateSphere('powerUpBase', {
            diameter: 0.5,
            segments: 12
        }, this.scene);

        this.registerGroup('powerups', {
            maxInstances: 20,
            baseMesh,
            material
        });
    }

    /**
     * Get or create an instance from a group
     */
    getInstance(
        groupId: string,
        id: string,
        position: BABYLON.Vector3,
        scaling: BABYLON.Vector3 = BABYLON.Vector3.One()
    ): InstanceData | null {
        const group = this.instanceGroups.get(groupId);
        if (!group) {
            console.error(`[MeshManager] Group '${groupId}' not found`);
            return null;
        }

        // Check for existing instance
        let instanceData = group.instances.find(i => i.id === id);
        if (instanceData) {
            instanceData.position = position;
            instanceData.scaling = scaling;
            instanceData.instance.position = position;
            instanceData.instance.scaling = scaling;
            instanceData.active = true;
            return instanceData;
        }

        // Try to reuse from pool
        if (group.pool.length > 0) {
            instanceData = group.pool.pop()!;
            instanceData.id = id;
            instanceData.position = position;
            instanceData.scaling = scaling;
            instanceData.instance.position = position;
            instanceData.instance.scaling = scaling;
            instanceData.instance.setEnabled(true);
            instanceData.active = true;
            group.instances.push(instanceData);
            
            this.stats.activeInstances++;
            this.stats.pooledInstances--;
            
            return instanceData;
        }

        // Create new instance if under limit
        if (group.instances.length < group.config.maxInstances) {
            const instance = group.baseMesh.createInstance(`${groupId}_${id}`);
            instance.position = position;
            instance.scaling = scaling;

            instanceData = {
                id,
                instance,
                position,
                scaling,
                active: true
            };

            group.instances.push(instanceData);
            this.stats.totalInstances++;
            this.stats.activeInstances++;

            return instanceData;
        }

        console.warn(`[MeshManager] Max instances reached for group '${groupId}'`);
        return null;
    }

    /**
     * Release an instance back to pool
     */
    releaseInstance(groupId: string, id: string): boolean {
        const group = this.instanceGroups.get(groupId);
        if (!group) return false;

        const index = group.instances.findIndex(i => i.id === id);
        if (index === -1) return false;

        const instanceData = group.instances[index];
        if (!instanceData) return false;
        
        instanceData.active = false;
        instanceData.instance.setEnabled(false);

        // Move to pool
        group.instances.splice(index, 1);
        group.pool.push(instanceData);

        this.stats.activeInstances--;
        this.stats.pooledInstances++;

        return true;
    }

    /**
     * Update instance position (optimized batch update)
     */
    updateInstancePosition(
        groupId: string,
        id: string,
        position: BABYLON.Vector3
    ): boolean {
        const group = this.instanceGroups.get(groupId);
        if (!group) return false;

        const instanceData = group.instances.find(i => i.id === id);
        if (!instanceData) return false;

        instanceData.position = position;
        instanceData.instance.position = position;
        return true;
    }

    /**
     * Batch update all pellet positions from server state
     */
    updatePelletsFromState(
        pellets: Array<{ id: string; x: number; y: number; z: number; collected?: boolean }>
    ): void {
        const group = this.instanceGroups.get('pellets');
        if (!group) return;

        const activeIds = new Set<string>();

        for (const pellet of pellets) {
            if (pellet.collected) continue;

            activeIds.add(pellet.id);
            const position = new BABYLON.Vector3(pellet.x, pellet.y, pellet.z);
            
            let instanceData = group.instances.find(i => i.id === pellet.id);
            
            if (!instanceData) {
                instanceData = this.getInstance('pellets', pellet.id, position) ?? undefined;
            } else {
                instanceData.instance.position = position;
            }
        }

        // Release instances for collected pellets
        for (const instanceData of [...group.instances]) {
            if (!activeIds.has(instanceData.id)) {
                this.releaseInstance('pellets', instanceData.id);
            }
        }
    }

    /**
     * Get all active instances in a group
     */
    getActiveInstances(groupId: string): InstanceData[] {
        const group = this.instanceGroups.get(groupId);
        if (!group) return [];
        return group.instances.filter(i => i.active);
    }

    /**
     * Clear all instances in a group
     */
    clearGroup(groupId: string): void {
        const group = this.instanceGroups.get(groupId);
        if (!group) return;

        for (const instanceData of group.instances) {
            instanceData.instance.dispose();
        }
        for (const instanceData of group.pool) {
            instanceData.instance.dispose();
        }

        this.stats.activeInstances -= group.instances.length;
        this.stats.pooledInstances -= group.pool.length;
        this.stats.totalInstances -= (group.instances.length + group.pool.length);

        group.instances = [];
        group.pool = [];

        console.log(`[MeshManager] Cleared group '${groupId}'`);
    }

    /**
     * Get performance statistics
     */
    getStats(): typeof this.stats & { groups: Record<string, { active: number; pooled: number }> } {
        const groups: Record<string, { active: number; pooled: number }> = {};

        for (const [groupId, group] of this.instanceGroups) {
            groups[groupId] = {
                active: group.instances.length,
                pooled: group.pool.length
            };
        }

        // Estimate draw calls (1 per group with instances)
        let drawCalls = 0;
        for (const group of this.instanceGroups.values()) {
            if (group.instances.length > 0) drawCalls++;
        }
        this.stats.drawCalls = drawCalls;

        return { ...this.stats, groups };
    }

    /**
     * Get instancing efficiency (higher is better)
     */
    getEfficiency(): { instancesPerDrawCall: number; poolUtilization: number } {
        const stats = this.getStats();
        return {
            instancesPerDrawCall: stats.drawCalls > 0 
                ? stats.activeInstances / stats.drawCalls 
                : 0,
            poolUtilization: stats.totalInstances > 0
                ? (stats.activeInstances / stats.totalInstances) * 100
                : 0
        };
    }

    /**
     * Dispose all groups and instances
     */
    dispose(): void {
        for (const [groupId, group] of this.instanceGroups) {
            this.clearGroup(groupId);
            group.baseMesh.dispose();
        }
        this.instanceGroups.clear();
        console.log('[MeshManager] Disposed');
    }
}

// Factory function
export function createMeshManager(scene: BABYLON.Scene): MeshManager {
    return new MeshManager(scene);
}
