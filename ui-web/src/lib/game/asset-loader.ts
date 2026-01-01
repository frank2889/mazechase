/**
 * Asset Lazy Loader for MazeChase
 * Sprint 4 - Performance
 * 
 * Implements progressive asset loading:
 * - Priority-based loading queue
 * - Lazy loading of non-critical assets
 * - Preloading of next-level assets
 * - Memory management
 */

export type AssetType = 'texture' | 'audio' | 'model' | 'json';
export type AssetPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Asset {
    url: string;
    type: AssetType;
    priority: AssetPriority;
    loaded: boolean;
    data?: any;
    size?: number;
}

export interface LoadProgress {
    loaded: number;
    total: number;
    percent: number;
    currentAsset?: string;
}

/**
 * Asset Lazy Loader
 */
export class AssetLazyLoader {
    private assets: Map<string, Asset> = new Map();
    private loadQueue: string[] = [];
    private loading: Set<string> = new Set();
    private maxConcurrent = 4;
    private onProgress?: (progress: LoadProgress) => void;
    private totalBytes = 0;
    private loadedBytes = 0;

    /**
     * Register an asset for lazy loading
     */
    register(id: string, url: string, type: AssetType, priority: AssetPriority = 'medium'): void {
        this.assets.set(id, {
            url,
            type,
            priority,
            loaded: false
        });
    }

    /**
     * Register multiple assets
     */
    registerMany(assets: { id: string; url: string; type: AssetType; priority?: AssetPriority }[]): void {
        assets.forEach(a => this.register(a.id, a.url, a.type, a.priority || 'medium'));
    }

    /**
     * Set progress callback
     */
    setOnProgress(callback: (progress: LoadProgress) => void): void {
        this.onProgress = callback;
    }

    /**
     * Load all critical assets (blocking)
     */
    async loadCritical(): Promise<void> {
        const criticalAssets = Array.from(this.assets.entries())
            .filter(([_, asset]) => asset.priority === 'critical' && !asset.loaded)
            .map(([id]) => id);

        await this.loadAssets(criticalAssets);
    }

    /**
     * Load assets by priority
     */
    async loadByPriority(priority: AssetPriority): Promise<void> {
        const assets = Array.from(this.assets.entries())
            .filter(([_, asset]) => asset.priority === priority && !asset.loaded)
            .map(([id]) => id);

        await this.loadAssets(assets);
    }

    /**
     * Load specific assets
     */
    async loadAssets(ids: string[]): Promise<void> {
        // Sort by priority
        const priorityOrder: Record<AssetPriority, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3
        };

        const sorted = ids.sort((a, b) => {
            const assetA = this.assets.get(a);
            const assetB = this.assets.get(b);
            if (!assetA || !assetB) return 0;
            return priorityOrder[assetA.priority] - priorityOrder[assetB.priority];
        });

        // Load in batches
        const batches: string[][] = [];
        for (let i = 0; i < sorted.length; i += this.maxConcurrent) {
            batches.push(sorted.slice(i, i + this.maxConcurrent));
        }

        for (const batch of batches) {
            await Promise.all(batch.map(id => this.loadAsset(id)));
        }
    }

    /**
     * Load a single asset
     */
    private async loadAsset(id: string): Promise<void> {
        const asset = this.assets.get(id);
        if (!asset || asset.loaded || this.loading.has(id)) {
            return;
        }

        this.loading.add(id);
        this.reportProgress(asset.url);

        try {
            switch (asset.type) {
                case 'texture':
                    asset.data = await this.loadTexture(asset.url);
                    break;
                case 'audio':
                    asset.data = await this.loadAudio(asset.url);
                    break;
                case 'model':
                    asset.data = await this.loadModel(asset.url);
                    break;
                case 'json':
                    asset.data = await this.loadJSON(asset.url);
                    break;
            }
            asset.loaded = true;
        } catch (e) {
            console.warn(`Failed to load asset: ${id}`, e);
        } finally {
            this.loading.delete(id);
        }
    }

    /**
     * Load texture
     */
    private loadTexture(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.loadedBytes += (img.width * img.height * 4); // Estimate
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Load audio
     */
    private async loadAudio(url: string): Promise<AudioBuffer | HTMLAudioElement> {
        // Try AudioContext first for better performance
        if (window.AudioContext || (window as any).webkitAudioContext) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                this.loadedBytes += arrayBuffer.byteLength;
                
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                return await audioContext.decodeAudioData(arrayBuffer);
            } catch {
                // Fallback to HTML Audio
            }
        }

        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = reject;
            audio.src = url;
        });
    }

    /**
     * Load 3D model (placeholder - implement based on format)
     */
    private async loadModel(url: string): Promise<any> {
        const response = await fetch(url);
        const data = await response.arrayBuffer();
        this.loadedBytes += data.byteLength;
        return data;
    }

    /**
     * Load JSON
     */
    private async loadJSON(url: string): Promise<any> {
        const response = await fetch(url);
        const text = await response.text();
        this.loadedBytes += text.length;
        return JSON.parse(text);
    }

    /**
     * Get loaded asset
     */
    get<T = any>(id: string): T | undefined {
        return this.assets.get(id)?.data as T;
    }

    /**
     * Check if asset is loaded
     */
    isLoaded(id: string): boolean {
        return this.assets.get(id)?.loaded ?? false;
    }

    /**
     * Report loading progress
     */
    private reportProgress(currentAsset: string): void {
        if (!this.onProgress) return;

        const total = this.assets.size;
        const loaded = Array.from(this.assets.values()).filter(a => a.loaded).length;

        this.onProgress({
            loaded,
            total,
            percent: (loaded / total) * 100,
            currentAsset
        });
    }

    /**
     * Preload assets for next level/scene
     */
    async preloadForScene(sceneId: string, assetIds: string[]): Promise<void> {
        // Load in background without blocking
        setTimeout(async () => {
            for (const id of assetIds) {
                if (!this.isLoaded(id)) {
                    await this.loadAsset(id);
                }
            }
            console.log(`📦 Preloaded ${assetIds.length} assets for scene: ${sceneId}`);
        }, 1000); // Delay to not interfere with current scene
    }

    /**
     * Unload assets to free memory
     */
    unload(ids: string[]): void {
        for (const id of ids) {
            const asset = this.assets.get(id);
            if (asset) {
                asset.data = undefined;
                asset.loaded = false;
            }
        }
        console.log(`🗑️ Unloaded ${ids.length} assets`);
    }

    /**
     * Get memory usage estimate
     */
    getMemoryUsage(): { loaded: number; estimated: string } {
        const mb = this.loadedBytes / (1024 * 1024);
        return {
            loaded: this.loadedBytes,
            estimated: `${mb.toFixed(2)} MB`
        };
    }

    /**
     * Get loading statistics
     */
    getStats(): {
        total: number;
        loaded: number;
        pending: number;
        loading: number;
    } {
        const total = this.assets.size;
        const loaded = Array.from(this.assets.values()).filter(a => a.loaded).length;
        return {
            total,
            loaded,
            pending: total - loaded - this.loading.size,
            loading: this.loading.size
        };
    }
}

/**
 * Create default asset loader with common game assets
 */
export function createGameAssetLoader(): AssetLazyLoader {
    const loader = new AssetLazyLoader();

    // Register critical assets (must load before game starts)
    loader.registerMany([
        { id: 'map', url: '/map.json', type: 'json', priority: 'critical' },
    ]);

    // Register high priority audio
    loader.registerMany([
        { id: 'audio_chomp', url: '/audio/chomp.wav', type: 'audio', priority: 'high' },
        { id: 'audio_power', url: '/audio/power_pellet.wav', type: 'audio', priority: 'high' },
        { id: 'audio_death', url: '/audio/death.wav', type: 'audio', priority: 'high' },
        { id: 'audio_start', url: '/audio/game_start.wav', type: 'audio', priority: 'high' },
    ]);

    // Register medium priority audio
    loader.registerMany([
        { id: 'audio_siren', url: '/audio/siren.wav', type: 'audio', priority: 'medium' },
        { id: 'audio_speed', url: '/audio/speed_boost.wav', type: 'audio', priority: 'medium' },
        { id: 'audio_magnet', url: '/audio/magnet.wav', type: 'audio', priority: 'medium' },
    ]);

    // Register low priority assets
    loader.registerMany([
        { id: 'audio_menu', url: '/audio/menu_music.wav', type: 'audio', priority: 'low' },
        { id: 'audio_victory', url: '/audio/victory.wav', type: 'audio', priority: 'low' },
    ]);

    return loader;
}

// Singleton instance
let loaderInstance: AssetLazyLoader | null = null;

export function getAssetLoader(): AssetLazyLoader {
    if (!loaderInstance) {
        loaderInstance = createGameAssetLoader();
    }
    return loaderInstance;
}
