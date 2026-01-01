/**
 * Mesh Batching System for MazeChase 3D
 * Sprint 4 - Performance Optimization
 * 
 * Reduces draw calls by merging static geometry:
 * - Wall meshes batched per quadrant
 * - Floor tiles batched
 * - Pellets use instancing
 * 
 * Based on Elena's Technical Analysis
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Matrix,
    VertexData,
    TransformNode
} from '@babylonjs/core';

export interface BatchConfig {
    maxMeshesPerBatch: number;
    enableInstancing: boolean;
    enableMerging: boolean;
}

const DEFAULT_CONFIG: BatchConfig = {
    maxMeshesPerBatch: 500,
    enableInstancing: true,
    enableMerging: true
};

/**
 * Batch statistics for monitoring
 */
export interface BatchStats {
    originalMeshCount: number;
    batchedMeshCount: number;
    drawCallReduction: number;
    instancedMeshes: number;
}

/**
 * MeshBatcher - Reduces draw calls through batching and instancing
 */
export class MeshBatcher {
    private scene: Scene;
    private config: BatchConfig;
    private stats: BatchStats = {
        originalMeshCount: 0,
        batchedMeshCount: 0,
        drawCallReduction: 0,
        instancedMeshes: 0
    };

    constructor(scene: Scene, config: Partial<BatchConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Batch an array of meshes with the same material
     * Returns a single merged mesh
     */
    batchMeshes(meshes: Mesh[], name: string): Mesh | null {
        if (!this.config.enableMerging || meshes.length === 0) {
            return null;
        }

        this.stats.originalMeshCount += meshes.length;

        try {
            // Merge meshes - this reduces draw calls significantly
            const merged = Mesh.MergeMeshes(
                meshes,
                true,  // Dispose source meshes
                true,  // Allow different materials (will use first)
                undefined,
                false, // Don't subdivide
                true   // Keep material
            );

            if (merged) {
                merged.name = name;
                merged.isPickable = false; // Optimize picking
                merged.doNotSyncBoundingInfo = true; // Static mesh optimization
                this.stats.batchedMeshCount++;
                this.stats.drawCallReduction = this.stats.originalMeshCount - this.stats.batchedMeshCount;
            }

            return merged;
        } catch (e) {
            console.warn(`Failed to batch meshes: ${name}`, e);
            return null;
        }
    }

    /**
     * Create instanced copies of a mesh
     * Very efficient for repeating geometry like pellets
     */
    createInstances(
        sourceMesh: Mesh,
        positions: Vector3[],
        namePrefix: string
    ): Mesh[] {
        if (!this.config.enableInstancing || positions.length === 0) {
            return [];
        }

        // Enable thin instances for the source mesh (most efficient)
        const matrices: Matrix[] = [];
        
        for (const pos of positions) {
            const matrix = Matrix.Translation(pos.x, pos.y, pos.z);
            matrices.push(matrix);
        }

        // Use thin instancing (Babylon.js 5+)
        const matrixData = new Float32Array(matrices.length * 16);
        matrices.forEach((matrix, i) => {
            matrix.copyToArray(matrixData, i * 16);
        });

        sourceMesh.thinInstanceSetBuffer('matrix', matrixData, 16);
        sourceMesh.thinInstanceCount = positions.length;
        
        this.stats.instancedMeshes += positions.length;

        return [sourceMesh]; // Return source mesh which now renders all instances
    }

    /**
     * Batch walls by grouping nearby walls
     * Reduces draw calls while maintaining reasonable batch sizes
     */
    batchWallsByRegion(
        walls: Mesh[],
        gridWidth: number,
        gridHeight: number,
        regionsX: number = 4,
        regionsY: number = 4
    ): Mesh[] {
        const batched: Mesh[] = [];
        const regionWidth = gridWidth / regionsX;
        const regionHeight = gridHeight / regionsY;
        
        // Group walls by region
        const regions: Map<string, Mesh[]> = new Map();
        
        for (const wall of walls) {
            const pos = wall.position;
            const regionX = Math.floor(pos.x / regionWidth);
            const regionY = Math.floor(pos.z / regionHeight);
            const key = `${regionX}_${regionY}`;
            
            if (!regions.has(key)) {
                regions.set(key, []);
            }
            regions.get(key)!.push(wall);
        }

        // Batch each region
        regions.forEach((regionWalls, key) => {
            if (regionWalls.length > 1) {
                const merged = this.batchMeshes(regionWalls, `walls_region_${key}`);
                if (merged) {
                    batched.push(merged);
                }
            } else if (regionWalls.length === 1) {
                batched.push(regionWalls[0]);
            }
        });

        return batched;
    }

    /**
     * Get batching statistics
     */
    getStats(): BatchStats {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            originalMeshCount: 0,
            batchedMeshCount: 0,
            drawCallReduction: 0,
            instancedMeshes: 0
        };
    }

    /**
     * Log performance report
     */
    logReport(): void {
        console.log('🎯 Mesh Batching Report:');
        console.log(`   Original meshes: ${this.stats.originalMeshCount}`);
        console.log(`   Batched meshes: ${this.stats.batchedMeshCount}`);
        console.log(`   Draw call reduction: ${this.stats.drawCallReduction}`);
        console.log(`   Instanced meshes: ${this.stats.instancedMeshes}`);
        console.log(`   Efficiency: ${((this.stats.drawCallReduction / Math.max(1, this.stats.originalMeshCount)) * 100).toFixed(1)}%`);
    }
}

/**
 * Simple object pool for reusing meshes
 */
export class MeshPool {
    private scene: Scene;
    private pools: Map<string, Mesh[]> = new Map();
    private activeCount: Map<string, number> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Get a mesh from the pool or create new one
     */
    acquire(type: string, createFn: () => Mesh): Mesh {
        const pool = this.pools.get(type) || [];
        const active = this.activeCount.get(type) || 0;

        if (active < pool.length) {
            // Reuse existing mesh
            const mesh = pool[active];
            mesh.setEnabled(true);
            this.activeCount.set(type, active + 1);
            return mesh;
        }

        // Create new mesh
        const mesh = createFn();
        pool.push(mesh);
        this.pools.set(type, pool);
        this.activeCount.set(type, active + 1);
        return mesh;
    }

    /**
     * Return mesh to pool
     */
    release(type: string, mesh: Mesh): void {
        mesh.setEnabled(false);
        const active = this.activeCount.get(type) || 0;
        if (active > 0) {
            this.activeCount.set(type, active - 1);
        }
    }

    /**
     * Release all meshes of a type
     */
    releaseAll(type: string): void {
        const pool = this.pools.get(type);
        if (pool) {
            pool.forEach(mesh => mesh.setEnabled(false));
            this.activeCount.set(type, 0);
        }
    }

    /**
     * Dispose all pooled meshes
     */
    dispose(): void {
        this.pools.forEach(pool => {
            pool.forEach(mesh => mesh.dispose());
        });
        this.pools.clear();
        this.activeCount.clear();
    }

    /**
     * Get pool statistics
     */
    getStats(): { type: string; total: number; active: number }[] {
        const stats: { type: string; total: number; active: number }[] = [];
        this.pools.forEach((pool, type) => {
            stats.push({
                type,
                total: pool.length,
                active: this.activeCount.get(type) || 0
            });
        });
        return stats;
    }
}
