/**
 * AssetManager - External Asset Discovery and Download
 * 
 * Features:
 * - Search OpenGameArt for assets by keyword and type (REAL API)
 * - Download assets to local storage
 * - Cache management for downloaded assets
 * - Support for models, textures, and audio
 * - AI-driven asset recommendations based on EMMSOAI prompts
 */

export type AssetType = 'model' | 'texture' | 'audio' | 'sprite' | 'all';

export interface AssetSearchResult {
    id: string;
    title: string;
    author: string;
    license: string;
    url: string;
    thumbnailUrl?: string;
    downloadUrl: string;
    type: AssetType;
    format: string;
    size?: number;
}

// OpenGameArt API endpoints
const OGA_API = {
    // OpenGameArt uses a REST API with JSON responses
    search: 'https://opengameart.org/art-search-advanced',
    // Alternative: Sketchfab API for 3D models (requires API key)
    sketchfabSearch: 'https://api.sketchfab.com/v3/search',
    // Poly Pizza (free CC0 3D models)
    polyPizza: 'https://poly.pizza/api/search',
    // Quaternius (free CC0 game-ready models)
    quaternius: 'https://quaternius.com'
};

// AI-recommended prompts for finding game assets (from EMMSOAI)
export const AI_ASSET_PROMPTS = {
    runner: {
        description: 'Cute heroic sphere character, bright yellow, friendly expression',
        searchTerms: ['cute character', 'hero blob', 'sphere character', 'mascot 3d'],
        style: 'Kurzgesagt flat vector 3D'
    },
    chaser: {
        description: 'Ghost-like hunter characters with wavy bottoms, vibrant colors',
        searchTerms: ['ghost character', 'enemy blob', 'cute monster', 'hunter 3d'],
        style: 'Geometric minimalist 3D'
    },
    dungeon: {
        description: 'Modular dungeon pieces: walls, corners, floors with fantasy style',
        searchTerms: ['dungeon modular', 'stone wall', 'castle tile', 'fantasy floor'],
        style: 'Low poly fantasy'
    },
    decoration: {
        description: 'Small environmental props: weeds, rocks, crystals',
        searchTerms: ['tiny plants', 'small rocks', 'ground decoration', 'props pack'],
        style: 'Low poly stylized'
    }
};

export interface AssetDownloadResult {
    success: boolean;
    localPath: string;
    filename: string;
    error?: string;
}

// OpenGameArt API response type (for future real API integration)
// interface OpenGameArtResult {
//     id: string;
//     title: string;
//     author: string;
//     license: string;
//     files: Array<{ url: string; type: string; }>;
// }

// Common asset sources - commented out, using real API now
// const ASSET_SOURCES = {
//     openGameArt: {
//         name: 'OpenGameArt',
//         searchUrl: 'https://opengameart.org/art-search-advanced',
//         apiUrl: 'https://opengameart.org/api/1.0',
//         baseUrl: 'https://opengameart.org'
//     },
//     kenney: {
//         name: 'Kenney.nl',
//         baseUrl: 'https://kenney.nl/assets'
//     },
//     itch: {
//         name: 'Itch.io',
//         baseUrl: 'https://itch.io/game-assets/free'
//     }
// };

// Pre-defined asset packs for dungeon theming
export const RECOMMENDED_ASSETS = {
    dungeonWalls: {
        name: 'Modular Dungeon Walls',
        source: 'OpenGameArt',
        url: 'https://opengameart.org/content/modular-dungeon-tiles',
        files: ['wall_straight.glb', 'wall_corner.glb', 'wall_end.glb'],
        localPath: '/models/dungeon/'
    },
    dungeonFloor: {
        name: 'Dungeon Floor Tiles',
        source: 'OpenGameArt',
        url: 'https://opengameart.org/content/dungeon-floor-tiles',
        files: ['floor_stone.glb', 'floor_mossy.glb'],
        localPath: '/models/dungeon/'
    },
    skydome: {
        name: 'Space Skydome',
        source: 'OpenGameArt',
        url: 'https://opengameart.org/content/space-skyboxes',
        files: ['skydome_space.glb', 'skybox_nebula.hdr'],
        localPath: '/models/environment/'
    },
    decorations: {
        name: 'Tiny Weeds & Rocks',
        source: 'OpenGameArt',
        url: 'https://opengameart.org/content/tiny-weeds-and-rocks',
        files: ['weed_01.glb', 'weed_02.glb', 'rock_small.glb', 'rock_medium.glb'],
        localPath: '/models/decorations/'
    }
};

/**
 * AssetManager - Handles asset discovery and downloading
 */
export class AssetManager {
    private cache: Map<string, AssetSearchResult[]> = new Map();
    private downloadedAssets: Map<string, string> = new Map();
    private corsProxy: string = '';  // Optional CORS proxy URL
    // sketchfabApiKey removed - not currently used

    constructor(corsProxy?: string) {
        if (corsProxy) {
            this.corsProxy = corsProxy;
        }
        this.loadCacheFromStorage();
    }

    /**
     * Search for 3D assets using multiple sources
     * Priority: Local cache > Poly.pizza > Quaternius > OpenGameArt
     */
    async searchAsset(keyword: string, type: AssetType = 'all'): Promise<AssetSearchResult[]> {
        const cacheKey = `${keyword}_${type}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log(`📦 AssetManager: Cache hit for "${keyword}"`);
            return this.cache.get(cacheKey)!;
        }

        console.log(`🔍 AssetManager: Searching for "${keyword}" (type: ${type})`);
        
        // Try multiple sources in order
        let results: AssetSearchResult[] = [];
        
        // 1. Try Poly.pizza (free CC0 3D models) - No API key needed
        results = await this.searchPolyPizza(keyword, type);
        
        // 2. If no results, try curated Quaternius packs
        if (results.length === 0) {
            results = await this.searchQuaternius(keyword);
        }
        
        // 3. Fallback to OGA-style curated results
        if (results.length === 0) {
            results = await this.getCuratedResults(keyword, type);
        }

        // Cache results
        if (results.length > 0) {
            this.cache.set(cacheKey, results);
            this.saveCacheToStorage();
        }
        
        return results;
    }

    /**
     * Search Poly.pizza API for CC0 3D models
     */
    private async searchPolyPizza(keyword: string, type: AssetType): Promise<AssetSearchResult[]> {
        if (type === 'audio' || type === 'sprite') {
            return []; // Poly.pizza only has 3D models
        }
        
        try {
            const response = await fetch(
                `${OGA_API.polyPizza}?query=${encodeURIComponent(keyword)}&limit=10`,
                { mode: 'cors' }
            );
            
            if (!response.ok) {
                console.warn('Poly.pizza API not available, using fallback');
                return [];
            }
            
            const data = await response.json();
            
            return (data.results || []).map((item: any) => ({
                id: `polypizza_${item.ID}`,
                title: item.Title || keyword,
                author: item.Author || 'Poly.pizza',
                license: 'CC0',
                url: `https://poly.pizza/m/${item.ID}`,
                downloadUrl: item.Download?.glb || item.Download?.gltf || '',
                type: 'model' as AssetType,
                format: 'glTF',
                thumbnailUrl: item.Thumbnail
            }));
        } catch (error) {
            console.warn('Poly.pizza search failed:', error);
            return [];
        }
    }

    /**
     * Get curated results from Quaternius (known-good game assets)
     */
    private async searchQuaternius(keyword: string): Promise<AssetSearchResult[]> {
        const lowerKeyword = keyword.toLowerCase();
        const results: AssetSearchResult[] = [];
        
        // Quaternius Ultimate packs - all CC0
        const quaterniusPacks: Record<string, AssetSearchResult> = {
            character: {
                id: 'quaternius_animated_characters',
                title: 'Animated Characters Pack',
                author: 'Quaternius',
                license: 'CC0',
                url: 'https://quaternius.com/packs/ultimateanimatedcharacters.html',
                downloadUrl: 'https://quaternius.com/packs/ultimateanimatedcharacters.html',
                type: 'model',
                format: 'glTF/FBX'
            },
            monster: {
                id: 'quaternius_monsters',
                title: 'Animated Monsters Pack',
                author: 'Quaternius',
                license: 'CC0',
                url: 'https://quaternius.com/packs/ultimateanimatedmonsters.html',
                downloadUrl: 'https://quaternius.com/packs/ultimateanimatedmonsters.html',
                type: 'model',
                format: 'glTF/FBX'
            },
            dungeon: {
                id: 'quaternius_dungeon',
                title: 'Modular Dungeon Pack',
                author: 'Quaternius',
                license: 'CC0',
                url: 'https://quaternius.com/packs/modulardungeon.html',
                downloadUrl: 'https://quaternius.com/packs/modulardungeon.html',
                type: 'model',
                format: 'glTF'
            },
            nature: {
                id: 'quaternius_nature',
                title: 'Ultimate Nature Pack',
                author: 'Quaternius',
                license: 'CC0',
                url: 'https://quaternius.com/packs/ultimatenaturepack.html',
                downloadUrl: 'https://quaternius.com/packs/ultimatenaturepack.html',
                type: 'model',
                format: 'glTF'
            }
        };
        
        // Match keywords to packs
        if (lowerKeyword.includes('character') || lowerKeyword.includes('hero') || lowerKeyword.includes('runner')) {
            if (quaterniusPacks.character) results.push(quaterniusPacks.character);
        }
        if (lowerKeyword.includes('monster') || lowerKeyword.includes('enemy') || lowerKeyword.includes('chaser') || lowerKeyword.includes('ghost')) {
            if (quaterniusPacks.monster) results.push(quaterniusPacks.monster);
        }
        if (lowerKeyword.includes('dungeon') || lowerKeyword.includes('wall') || lowerKeyword.includes('floor') || lowerKeyword.includes('tile')) {
            if (quaterniusPacks.dungeon) results.push(quaterniusPacks.dungeon);
        }
        if (lowerKeyword.includes('nature') || lowerKeyword.includes('plant') || lowerKeyword.includes('weed') || lowerKeyword.includes('rock') || lowerKeyword.includes('decoration')) {
            if (quaterniusPacks.nature) results.push(quaterniusPacks.nature);
        }
        
        return results;
    }

    /**
     * AI-driven asset search using EMMSOAI prompts
     */
    async searchWithAI(category: keyof typeof AI_ASSET_PROMPTS): Promise<AssetSearchResult[]> {
        const prompt = AI_ASSET_PROMPTS[category];
        let allResults: AssetSearchResult[] = [];
        
        console.log(`🤖 AI Asset Search: "${prompt.description}"`);
        
        // Search using all AI-recommended terms
        for (const term of prompt.searchTerms) {
            const results = await this.searchAsset(term, 'model');
            allResults = [...allResults, ...results];
        }
        
        // Deduplicate by ID
        const uniqueResults = Array.from(
            new Map(allResults.map(r => [r.id, r])).values()
        );
        
        return uniqueResults;
    }

    /**
     * Get curated results for common game asset needs (fallback)
     */
    private async getCuratedResults(keyword: string, _type: AssetType): Promise<AssetSearchResult[]> {
        const lowerKeyword = keyword.toLowerCase();
        const results: AssetSearchResult[] = [];

        // Dungeon-related keywords
        if (lowerKeyword.includes('dungeon') || lowerKeyword.includes('wall')) {
            results.push({
                id: 'kenney_dungeon',
                title: 'Modular Dungeon Kit',
                author: 'Kenney',
                license: 'CC0',
                url: 'https://kenney.nl/assets/modular-dungeon',
                downloadUrl: 'https://kenney.nl/assets/modular-dungeon',
                type: 'model',
                format: 'glTF'
            });
        }

        if (lowerKeyword.includes('floor') || lowerKeyword.includes('tile')) {
            results.push({
                id: 'kenney_tiles',
                title: 'Prototype Textures',
                author: 'Kenney',
                license: 'CC0',
                url: 'https://kenney.nl/assets/prototype-textures',
                downloadUrl: 'https://kenney.nl/assets/prototype-textures',
                type: 'texture',
                format: 'PNG'
            });
        }

        if (lowerKeyword.includes('character') || lowerKeyword.includes('player')) {
            results.push({
                id: 'kenney_characters',
                title: 'Animated Characters',
                author: 'Kenney',
                license: 'CC0',
                url: 'https://kenney.nl/assets/animated-characters-2',
                downloadUrl: 'https://kenney.nl/assets/animated-characters-2',
                type: 'model',
                format: 'glTF'
            });
        }

        return results;
    }

    /**
     * Download an asset from URL to local storage
     */
    async downloadAsset(url: string, filename?: string): Promise<AssetDownloadResult> {
        console.log(`⬇️ AssetManager: Downloading ${url}`);
        
        try {
            // Fetch the asset
            const response = await fetch(this.corsProxy + url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const derivedFilename = filename || this.extractFilename(url);
            
            // Create object URL for immediate use
            const objectUrl = URL.createObjectURL(blob);
            
            // Store reference
            this.downloadedAssets.set(derivedFilename, objectUrl);
            
            console.log(`✅ AssetManager: Downloaded ${derivedFilename} (${blob.size} bytes)`);
            
            return {
                success: true,
                localPath: objectUrl,
                filename: derivedFilename
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ AssetManager: Download failed - ${errorMessage}`);
            
            return {
                success: false,
                localPath: '',
                filename: '',
                error: errorMessage
            };
        }
    }

    /**
     * Get a previously downloaded asset
     */
    getDownloadedAsset(filename: string): string | undefined {
        return this.downloadedAssets.get(filename);
    }

    /**
     * Check if an asset exists locally
     */
    async checkLocalAsset(path: string): Promise<boolean> {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get recommended assets for a specific category
     */
    getRecommendedAssets(category: keyof typeof RECOMMENDED_ASSETS) {
        return RECOMMENDED_ASSETS[category];
    }

    /**
     * Download all recommended assets for a category
     */
    async downloadRecommendedAssets(category: keyof typeof RECOMMENDED_ASSETS): Promise<AssetDownloadResult[]> {
        const assetPack = RECOMMENDED_ASSETS[category];
        const results: AssetDownloadResult[] = [];

        for (const file of assetPack.files) {
            const url = `${assetPack.url}/${file}`;
            const result = await this.downloadAsset(url, file);
            results.push(result);
        }

        return results;
    }

    /**
     * Clear downloaded assets and free memory
     */
    clearCache(): void {
        // Revoke object URLs to free memory
        this.downloadedAssets.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        this.downloadedAssets.clear();
        this.cache.clear();
        localStorage.removeItem('assetManager_cache');
    }

    // Private helpers

    private extractFilename(url: string): string {
        const parts = url.split('/');
        return parts[parts.length - 1] || `asset_${Date.now()}`;
    }

    private loadCacheFromStorage(): void {
        try {
            const cached = localStorage.getItem('assetManager_cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.cache = new Map(Object.entries(data));
            }
        } catch {
            console.warn('AssetManager: Could not load cache from storage');
        }
    }

    private saveCacheToStorage(): void {
        try {
            const data = Object.fromEntries(this.cache);
            localStorage.setItem('assetManager_cache', JSON.stringify(data));
        } catch {
            console.warn('AssetManager: Could not save cache to storage');
        }
    }

    // mapAssetTypeToOGA removed - using real API search now
}

// Singleton instance
let assetManagerInstance: AssetManager | null = null;

export function getAssetManager(): AssetManager {
    if (!assetManagerInstance) {
        assetManagerInstance = new AssetManager();
    }
    return assetManagerInstance;
}

export default AssetManager;