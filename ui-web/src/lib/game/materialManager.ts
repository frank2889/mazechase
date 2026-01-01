/**
 * Material Manager
 * EMMSOAI Suggestion (Elena - Backend & Infrastructure Engineer):
 * "Bevries alle materialen na creatie voor betere performance"
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Material pool configuration
 */
export interface MaterialPoolConfig {
    maxMaterials: number;
    autoFreeze: boolean;
    enableCaching: boolean;
}

const DEFAULT_CONFIG: MaterialPoolConfig = {
    maxMaterials: 100,
    autoFreeze: true,
    enableCaching: true
};

/**
 * Material Manager for optimized material handling
 * Implements freezing and pooling for better GPU performance
 */
export class MaterialManager {
    private scene: BABYLON.Scene;
    private config: MaterialPoolConfig;
    private materialCache: Map<string, BABYLON.Material> = new Map();
    private frozenMaterials: Set<string> = new Set();
    private stats = {
        created: 0,
        cached: 0,
        frozen: 0,
        reused: 0
    };

    constructor(scene: BABYLON.Scene, config: Partial<MaterialPoolConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get or create a standard material
     */
    getStandardMaterial(
        name: string,
        options: {
            diffuseColor?: BABYLON.Color3;
            specularColor?: BABYLON.Color3;
            emissiveColor?: BABYLON.Color3;
            ambientColor?: BABYLON.Color3;
            alpha?: number;
            backFaceCulling?: boolean;
        } = {}
    ): BABYLON.StandardMaterial {
        const cacheKey = this.getCacheKey('standard', name, options);

        if (this.config.enableCaching && this.materialCache.has(cacheKey)) {
            this.stats.reused++;
            return this.materialCache.get(cacheKey) as BABYLON.StandardMaterial;
        }

        const material = new BABYLON.StandardMaterial(name, this.scene);

        if (options.diffuseColor) material.diffuseColor = options.diffuseColor;
        if (options.specularColor) material.specularColor = options.specularColor;
        if (options.emissiveColor) material.emissiveColor = options.emissiveColor;
        if (options.ambientColor) material.ambientColor = options.ambientColor;
        if (options.alpha !== undefined) material.alpha = options.alpha;
        if (options.backFaceCulling !== undefined) material.backFaceCulling = options.backFaceCulling;

        this.registerMaterial(cacheKey, material);
        return material;
    }

    /**
     * Get or create a PBR material
     */
    getPBRMaterial(
        name: string,
        options: {
            albedoColor?: BABYLON.Color3;
            metallic?: number;
            roughness?: number;
            emissiveColor?: BABYLON.Color3;
            alpha?: number;
        } = {}
    ): BABYLON.PBRMaterial {
        const cacheKey = this.getCacheKey('pbr', name, options);

        if (this.config.enableCaching && this.materialCache.has(cacheKey)) {
            this.stats.reused++;
            return this.materialCache.get(cacheKey) as BABYLON.PBRMaterial;
        }

        const material = new BABYLON.PBRMaterial(name, this.scene);

        if (options.albedoColor) material.albedoColor = options.albedoColor;
        if (options.metallic !== undefined) material.metallic = options.metallic;
        if (options.roughness !== undefined) material.roughness = options.roughness;
        if (options.emissiveColor) material.emissiveColor = options.emissiveColor;
        if (options.alpha !== undefined) material.alpha = options.alpha;

        this.registerMaterial(cacheKey, material);
        return material;
    }

    /**
     * Create neon glow material (common in MazeChase)
     */
    createNeonMaterial(
        name: string,
        baseColor: BABYLON.Color3,
        glowIntensity = 1.5
    ): BABYLON.StandardMaterial {
        const cacheKey = `neon_${name}_${baseColor.toHexString()}_${glowIntensity}`;

        if (this.config.enableCaching && this.materialCache.has(cacheKey)) {
            this.stats.reused++;
            return this.materialCache.get(cacheKey) as BABYLON.StandardMaterial;
        }

        const material = new BABYLON.StandardMaterial(name, this.scene);
        material.diffuseColor = baseColor;
        material.emissiveColor = baseColor.scale(glowIntensity);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        this.registerMaterial(cacheKey, material);
        return material;
    }

    /**
     * Create pellet material with glow
     */
    createPelletMaterial(color: BABYLON.Color3 = new BABYLON.Color3(1, 0.9, 0.3)): BABYLON.StandardMaterial {
        const cacheKey = `pellet_${color.toHexString()}`;

        if (this.config.enableCaching && this.materialCache.has(cacheKey)) {
            this.stats.reused++;
            return this.materialCache.get(cacheKey) as BABYLON.StandardMaterial;
        }

        const material = new BABYLON.StandardMaterial('pellet', this.scene);
        material.diffuseColor = color;
        material.emissiveColor = color.scale(0.6);
        material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        material.specularPower = 64;

        this.registerMaterial(cacheKey, material);
        return material;
    }

    /**
     * Create wall material
     */
    createWallMaterial(color: BABYLON.Color3 = new BABYLON.Color3(0.2, 0.2, 0.3)): BABYLON.StandardMaterial {
        const cacheKey = `wall_${color.toHexString()}`;

        if (this.config.enableCaching && this.materialCache.has(cacheKey)) {
            this.stats.reused++;
            return this.materialCache.get(cacheKey) as BABYLON.StandardMaterial;
        }

        const material = new BABYLON.StandardMaterial('wall', this.scene);
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.specularPower = 8;

        this.registerMaterial(cacheKey, material);
        return material;
    }

    /**
     * Register and optionally freeze a material
     */
    private registerMaterial(cacheKey: string, material: BABYLON.Material): void {
        this.stats.created++;

        if (this.config.enableCaching) {
            // Enforce max materials limit
            if (this.materialCache.size >= this.config.maxMaterials) {
                this.evictOldestMaterial();
            }
            this.materialCache.set(cacheKey, material);
            this.stats.cached++;
        }

        if (this.config.autoFreeze) {
            this.freezeMaterial(material);
        }
    }

    /**
     * Freeze a material to prevent further updates
     * This significantly improves GPU performance
     */
    freezeMaterial(material: BABYLON.Material): void {
        if (this.frozenMaterials.has(material.name)) return;

        material.freeze();
        this.frozenMaterials.add(material.name);
        this.stats.frozen++;

        console.log(`[MaterialManager] Frozen: ${material.name}`);
    }

    /**
     * Unfreeze a material to allow updates
     */
    unfreezeMaterial(material: BABYLON.Material): void {
        if (!this.frozenMaterials.has(material.name)) return;

        material.unfreeze();
        this.frozenMaterials.delete(material.name);
        this.stats.frozen--;
    }

    /**
     * Freeze all registered materials
     */
    freezeAll(): void {
        for (const material of this.materialCache.values()) {
            this.freezeMaterial(material);
        }
        console.log(`[MaterialManager] Frozen all ${this.materialCache.size} materials`);
    }

    /**
     * Generate cache key from options
     */
    private getCacheKey(type: string, name: string, options: Record<string, unknown>): string {
        const optStr = Object.entries(options)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => {
                if (v instanceof BABYLON.Color3) return `${k}:${v.toHexString()}`;
                return `${k}:${v}`;
            })
            .join('_');
        return `${type}_${name}_${optStr}`;
    }

    /**
     * Evict oldest material when cache is full
     */
    private evictOldestMaterial(): void {
        const firstKey = this.materialCache.keys().next().value;
        if (firstKey) {
            const material = this.materialCache.get(firstKey);
            if (material) {
                material.dispose();
                this.materialCache.delete(firstKey);
                this.frozenMaterials.delete(material.name);
                console.log(`[MaterialManager] Evicted: ${firstKey}`);
            }
        }
    }

    /**
     * Get performance statistics
     */
    getStats(): typeof this.stats {
        return { ...this.stats };
    }

    /**
     * Get cache utilization
     */
    getCacheUtilization(): { size: number; max: number; percentage: number } {
        return {
            size: this.materialCache.size,
            max: this.config.maxMaterials,
            percentage: Math.round((this.materialCache.size / this.config.maxMaterials) * 100)
        };
    }

    /**
     * Clear all cached materials
     */
    clear(): void {
        for (const material of this.materialCache.values()) {
            material.dispose();
        }
        this.materialCache.clear();
        this.frozenMaterials.clear();
        this.stats = { created: 0, cached: 0, frozen: 0, reused: 0 };
        console.log('[MaterialManager] Cache cleared');
    }

    /**
     * Dispose manager
     */
    dispose(): void {
        this.clear();
    }
}

// Factory function for easy creation
export function createMaterialManager(
    scene: BABYLON.Scene,
    config?: Partial<MaterialPoolConfig>
): MaterialManager {
    return new MaterialManager(scene, config);
}
