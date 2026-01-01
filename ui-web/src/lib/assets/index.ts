/**
 * MazeChase Asset System - Main Export
 * 
 * Provides unified access to asset management:
 * - AssetManager: OpenGameArt/Poly.pizza/Quaternius search and download
 * - ModelLoader: Babylon.js model loading and instancing
 * - CharacterModelLoader: 3D character models (replaces 2D sprites)
 */

// Asset discovery and download
export {
    AssetManager,
    getAssetManager,
    RECOMMENDED_ASSETS,
    AI_ASSET_PROMPTS,
    type AssetType,
    type AssetSearchResult,
    type AssetDownloadResult
} from './assetManager';

// Model loading and management
export {
    ModelLoader,
    getModelLoader,
    initModelLoader,
    type LoadedModel,
    type ModelManifest
} from './modelLoader';

// 3D Character models (replaces 2D sprites)
export {
    CharacterModelLoader,
    getCharacterModelLoader,
    type CharacterType,
    type CharacterModel
} from './characterModelLoader';

/**
 * Preload all recommended assets for the game
 * Call this during game initialization
 */
import type { Scene } from '@babylonjs/core';
import { initModelLoader } from './modelLoader';
import { getCharacterModelLoader } from './characterModelLoader';

export async function preloadGameAssets(scene: Scene): Promise<boolean> {
    console.log('📦 Preloading game assets...');
    
    // Load environment models (walls, floors, etc.)
    const modelLoader = initModelLoader(scene);
    const envSuccess = await modelLoader.loadAllModels();
    
    // Load character models (runner, chasers)
    const characterLoader = getCharacterModelLoader(scene);
    await characterLoader.preloadAllCharacters();
    
    // Discover available assets from online sources
    await characterLoader.discoverCharacterAssets();
    
    if (envSuccess) {
        console.log('✅ Game assets preloaded successfully');
    } else {
        console.log('📦 Using procedural fallbacks (external models not found)');
    }
    
    return envSuccess;
}
