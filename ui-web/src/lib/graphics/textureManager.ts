/**
 * Texture Manager - Atlas Optimization
 * 
 * AI Tester Suggestion (Elena - Performance Engineer):
 * "Combine UI textures into atlases to reduce texture bindings.
 * To enhance rendering efficiency and reduce load times."
 * 
 * Features:
 * - Texture atlas loading and UV mapping
 * - Sprite sheet management
 * - Lazy loading with caching
 * - Memory-efficient texture management
 */

import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

export interface AtlasRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface AtlasDefinition {
    id: string;
    url: string;
    width: number;
    height: number;
    regions: Record<string, AtlasRegion>;
}

export interface TextureManagerConfig {
    maxCachedTextures: number;
    enableCompression: boolean;
    defaultFilterMode: 'nearest' | 'bilinear' | 'trilinear';
}

const DEFAULT_CONFIG: TextureManagerConfig = {
    maxCachedTextures: 50,
    enableCompression: true,
    defaultFilterMode: 'bilinear'
};

// Pre-defined atlas definitions
const ATLAS_DEFINITIONS: AtlasDefinition[] = [
    {
        id: 'ui_icons',
        url: '/textures/atlases/ui_icons.png',
        width: 512,
        height: 512,
        regions: {
            // HUD Icons
            heart: { x: 0, y: 0, width: 64, height: 64 },
            coin: { x: 64, y: 0, width: 64, height: 64 },
            gem: { x: 128, y: 0, width: 64, height: 64 },
            star: { x: 192, y: 0, width: 64, height: 64 },
            shield: { x: 256, y: 0, width: 64, height: 64 },
            speed: { x: 320, y: 0, width: 64, height: 64 },
            clock: { x: 384, y: 0, width: 64, height: 64 },
            settings: { x: 448, y: 0, width: 64, height: 64 },
            
            // Power-up Icons
            powerup_speed: { x: 0, y: 64, width: 64, height: 64 },
            powerup_shield: { x: 64, y: 64, width: 64, height: 64 },
            powerup_invisible: { x: 128, y: 64, width: 64, height: 64 },
            powerup_magnet: { x: 192, y: 64, width: 64, height: 64 },
            powerup_freeze: { x: 256, y: 64, width: 64, height: 64 },
            powerup_double: { x: 320, y: 64, width: 64, height: 64 },
            
            // Social Icons
            share: { x: 0, y: 128, width: 64, height: 64 },
            invite: { x: 64, y: 128, width: 64, height: 64 },
            leaderboard: { x: 128, y: 128, width: 64, height: 64 },
            friends: { x: 192, y: 128, width: 64, height: 64 },
            
            // Navigation
            arrow_left: { x: 0, y: 192, width: 64, height: 64 },
            arrow_right: { x: 64, y: 192, width: 64, height: 64 },
            arrow_up: { x: 128, y: 192, width: 64, height: 64 },
            arrow_down: { x: 192, y: 192, width: 64, height: 64 },
            close: { x: 256, y: 192, width: 64, height: 64 },
            menu: { x: 320, y: 192, width: 64, height: 64 }
        }
    },
    {
        id: 'ui_buttons',
        url: '/textures/atlases/ui_buttons.png',
        width: 512,
        height: 256,
        regions: {
            button_primary: { x: 0, y: 0, width: 256, height: 64 },
            button_secondary: { x: 0, y: 64, width: 256, height: 64 },
            button_danger: { x: 0, y: 128, width: 256, height: 64 },
            button_success: { x: 0, y: 192, width: 256, height: 64 },
            button_small: { x: 256, y: 0, width: 128, height: 48 },
            button_icon: { x: 256, y: 48, width: 64, height: 64 }
        }
    },
    {
        id: 'game_tiles',
        url: '/textures/atlases/game_tiles.png',
        width: 512,
        height: 512,
        regions: {
            wall_default: { x: 0, y: 0, width: 64, height: 64 },
            wall_neon: { x: 64, y: 0, width: 64, height: 64 },
            wall_cyber: { x: 128, y: 0, width: 64, height: 64 },
            wall_sunset: { x: 192, y: 0, width: 64, height: 64 },
            floor_default: { x: 0, y: 64, width: 64, height: 64 },
            floor_neon: { x: 64, y: 64, width: 64, height: 64 },
            floor_cyber: { x: 128, y: 64, width: 64, height: 64 },
            pellet: { x: 0, y: 128, width: 32, height: 32 },
            pellet_power: { x: 32, y: 128, width: 32, height: 32 },
            pellet_bonus: { x: 64, y: 128, width: 32, height: 32 }
        }
    }
];

/**
 * TextureManager - Optimized texture handling with atlases
 */
export class TextureManager {
    private scene: Scene;
    private config: TextureManagerConfig;
    private textureCache: Map<string, Texture> = new Map();
    private atlasTextures: Map<string, Texture> = new Map();
    private loadingPromises: Map<string, Promise<Texture>> = new Map();

    constructor(scene: Scene, config: Partial<TextureManagerConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Load all atlas textures
     */
    async loadAllAtlases(): Promise<void> {
        const loadPromises = ATLAS_DEFINITIONS.map(atlas => 
            this.loadAtlas(atlas.id)
        );
        await Promise.all(loadPromises);
        console.log(`[TextureManager] Loaded ${ATLAS_DEFINITIONS.length} atlases`);
    }

    /**
     * Load a specific atlas
     */
    async loadAtlas(atlasId: string): Promise<Texture | null> {
        if (this.atlasTextures.has(atlasId)) {
            return this.atlasTextures.get(atlasId)!;
        }

        const definition = ATLAS_DEFINITIONS.find(a => a.id === atlasId);
        if (!definition) {
            console.warn(`[TextureManager] Atlas not found: ${atlasId}`);
            return null;
        }

        try {
            const texture = new Texture(
                definition.url,
                this.scene,
                false, // noMipmap
                true,  // invertY
                this.getSamplingMode()
            );

            this.atlasTextures.set(atlasId, texture);
            return texture;
        } catch (e) {
            console.error(`[TextureManager] Failed to load atlas: ${atlasId}`, e);
            return null;
        }
    }

    /**
     * Get UV coordinates for a region in an atlas
     */
    getAtlasUVs(atlasId: string, regionName: string): {
        uOffset: number;
        vOffset: number;
        uScale: number;
        vScale: number;
    } | null {
        const definition = ATLAS_DEFINITIONS.find(a => a.id === atlasId);
        if (!definition) return null;

        const region = definition.regions[regionName];
        if (!region) return null;

        return {
            uOffset: region.x / definition.width,
            vOffset: 1 - (region.y + region.height) / definition.height,
            uScale: region.width / definition.width,
            vScale: region.height / definition.height
        };
    }

    /**
     * Get texture for a specific atlas region
     */
    getAtlasTexture(atlasId: string): Texture | null {
        return this.atlasTextures.get(atlasId) || null;
    }

    /**
     * Load a single texture with caching
     */
    async loadTexture(url: string): Promise<Texture> {
        // Check cache
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url)!;
        }

        // Check if already loading
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url)!;
        }

        // Start loading
        const loadPromise = new Promise<Texture>((resolve, reject) => {
            const texture = new Texture(
                url,
                this.scene,
                false,
                true,
                this.getSamplingMode(),
                () => {
                    this.textureCache.set(url, texture);
                    this.loadingPromises.delete(url);
                    this.enforceCache();
                    resolve(texture);
                },
                (message, exception) => {
                    this.loadingPromises.delete(url);
                    reject(exception || new Error(message));
                }
            );
        });

        this.loadingPromises.set(url, loadPromise);
        return loadPromise;
    }

    /**
     * Get sampling mode based on config
     */
    private getSamplingMode(): number {
        switch (this.config.defaultFilterMode) {
            case 'nearest':
                return Texture.NEAREST_SAMPLINGMODE;
            case 'trilinear':
                return Texture.TRILINEAR_SAMPLINGMODE;
            default:
                return Texture.BILINEAR_SAMPLINGMODE;
        }
    }

    /**
     * Enforce cache size limit
     */
    private enforceCache(): void {
        if (this.textureCache.size <= this.config.maxCachedTextures) return;

        // Remove oldest entries (FIFO)
        const excess = this.textureCache.size - this.config.maxCachedTextures;
        const keys = Array.from(this.textureCache.keys()).slice(0, excess);
        
        for (const key of keys) {
            const texture = this.textureCache.get(key);
            if (texture) {
                texture.dispose();
            }
            this.textureCache.delete(key);
        }
    }

    /**
     * Preload textures for faster access
     */
    async preloadTextures(urls: string[]): Promise<void> {
        await Promise.all(urls.map(url => this.loadTexture(url)));
    }

    /**
     * Get cache stats
     */
    getStats(): {
        cachedTextures: number;
        loadedAtlases: number;
        pendingLoads: number;
    } {
        return {
            cachedTextures: this.textureCache.size,
            loadedAtlases: this.atlasTextures.size,
            pendingLoads: this.loadingPromises.size
        };
    }

    /**
     * Get all available regions for an atlas
     */
    getAtlasRegions(atlasId: string): string[] {
        const definition = ATLAS_DEFINITIONS.find(a => a.id === atlasId);
        if (!definition) return [];
        return Object.keys(definition.regions);
    }

    /**
     * Clear texture cache
     */
    clearCache(): void {
        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }
        this.textureCache.clear();
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        this.clearCache();
        
        for (const texture of this.atlasTextures.values()) {
            texture.dispose();
        }
        this.atlasTextures.clear();
    }
}

// Singleton
let textureManager: TextureManager | null = null;

export function getTextureManager(scene: Scene): TextureManager {
    if (!textureManager) {
        textureManager = new TextureManager(scene);
    }
    return textureManager;
}
