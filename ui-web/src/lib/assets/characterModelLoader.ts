/**
 * CharacterModelLoader - 3D Character Model Loading for MazeChase
 * 
 * Replaces 2D Pac-Man-style sprites with real 3D character models
 * Uses AI-driven asset discovery from OpenGameArt, Poly.pizza, Quaternius
 * 
 * Features:
 * - Load glTF character models with animations
 * - Support runner and chaser character types
 * - Fallback to procedural Babylon.js primitives if models unavailable
 * - Animation blending for smooth transitions
 */

import {
    Scene,
    Mesh,
    MeshBuilder,
    AbstractMesh,
    Vector3,
    Color3,
    StandardMaterial,
    AnimationGroup
} from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { getAssetManager } from './assetManager';

export type CharacterType = 'runner' | 'chaser_cyan' | 'chaser_magenta' | 'chaser_green' | 'chaser_orange';

export interface CharacterModel {
    mesh: Mesh | AbstractMesh;
    animations: Map<string, AnimationGroup>;
    isExternal: boolean;  // true if loaded from external file
    type: CharacterType;
}

// Character color configs (Kurzgesagt style from EMMSOAI)
const CHARACTER_COLORS: Record<CharacterType, { primary: Color3; emissive: Color3 }> = {
    runner: {
        primary: new Color3(1.0, 0.85, 0.24),      // #FFD93D Warm Yellow
        emissive: new Color3(0.3, 0.25, 0.07)
    },
    chaser_cyan: {
        primary: new Color3(0.31, 0.80, 0.77),     // #4ECDC4 Turquoise
        emissive: new Color3(0.1, 0.24, 0.23)
    },
    chaser_magenta: {
        primary: new Color3(0.97, 0.42, 0.57),     // #F86B91 Pink
        emissive: new Color3(0.29, 0.13, 0.17)
    },
    chaser_green: {
        primary: new Color3(0.42, 0.80, 0.35),     // #6BCC5A Green
        emissive: new Color3(0.13, 0.24, 0.1)
    },
    chaser_orange: {
        primary: new Color3(1.0, 0.62, 0.26),      // #FF9F43 Orange
        emissive: new Color3(0.3, 0.19, 0.08)
    }
};

// Model paths for characters (when available)
const CHARACTER_MODEL_PATHS: Record<CharacterType, string> = {
    runner: '/models/characters/runner.glb',
    chaser_cyan: '/models/characters/chaser_cyan.glb',
    chaser_magenta: '/models/characters/chaser_magenta.glb',
    chaser_green: '/models/characters/chaser_green.glb',
    chaser_orange: '/models/characters/chaser_orange.glb'
};

/**
 * CharacterModelLoader - Loads and manages 3D character models
 */
export class CharacterModelLoader {
    private scene: Scene;
    private loadedCharacters: Map<CharacterType, CharacterModel> = new Map();
    private templateMeshes: Map<CharacterType, Mesh> = new Map();
    private useExternalModels: boolean = true;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Preload all character models
     * First tries external files, then falls back to procedural
     */
    async preloadAllCharacters(): Promise<void> {
        console.log('🎭 CharacterModelLoader: Preloading characters...');
        
        const types: CharacterType[] = [
            'runner', 'chaser_cyan', 'chaser_magenta', 'chaser_green', 'chaser_orange'
        ];

        for (const type of types) {
            await this.loadCharacter(type);
        }

        console.log(`✅ CharacterModelLoader: ${this.loadedCharacters.size} characters loaded`);
    }

    /**
     * Load a specific character type
     */
    async loadCharacter(type: CharacterType): Promise<CharacterModel> {
        // Check if already loaded
        if (this.loadedCharacters.has(type)) {
            return this.loadedCharacters.get(type)!;
        }

        let model: CharacterModel;

        // Try loading external model first
        if (this.useExternalModels) {
            model = await this.tryLoadExternalModel(type);
            if (model.isExternal) {
                this.loadedCharacters.set(type, model);
                return model;
            }
        }

        // Fallback to procedural model
        model = this.createProceduralCharacter(type);
        this.loadedCharacters.set(type, model);
        
        return model;
    }

    /**
     * Try to load external glTF model for character
     */
    private async tryLoadExternalModel(type: CharacterType): Promise<CharacterModel> {
        const path = CHARACTER_MODEL_PATHS[type];
        
        try {
            // Check if file exists
            const response = await fetch(path, { method: 'HEAD' });
            if (!response.ok) {
                console.log(`📦 No external model for ${type}, using procedural`);
                return this.createProceduralCharacter(type);
            }

            // Load the model
            const result = await SceneLoader.ImportMeshAsync(
                '',
                path.substring(0, path.lastIndexOf('/') + 1),
                path.substring(path.lastIndexOf('/') + 1),
                this.scene
            );

            const rootMesh = result.meshes[0] as Mesh;
            rootMesh.name = `character_${type}`;
            rootMesh.isVisible = false;  // Template mesh, hidden

            // Extract animations
            const animations = new Map<string, AnimationGroup>();
            for (const group of result.animationGroups) {
                animations.set(group.name, group);
                group.stop();  // Don't auto-play
            }

            console.log(`✅ Loaded external model: ${type} (${animations.size} animations)`);

            return {
                mesh: rootMesh,
                animations,
                isExternal: true,
                type
            };
        } catch (error) {
            console.warn(`Failed to load ${path}:`, error);
            return this.createProceduralCharacter(type);
        }
    }

    /**
     * Create procedural 3D character (fallback when external models unavailable)
     * Uses Kurzgesagt-style geometric shapes, NOT Pac-Man
     */
    private createProceduralCharacter(type: CharacterType): CharacterModel {
        const colors = CHARACTER_COLORS[type];
        
        let mesh: Mesh;
        
        if (type === 'runner') {
            // Runner: Friendly sphere with slight squash for cuteness
            mesh = this.createRunnerMesh(colors);
        } else {
            // Chasers: Ghost-like blob shapes (NOT Pac-Man ghosts, Kurzgesagt style)
            mesh = this.createChaserMesh(type, colors);
        }

        mesh.isVisible = false;  // Template mesh
        this.templateMeshes.set(type, mesh);

        return {
            mesh,
            animations: new Map(),
            isExternal: false,
            type
        };
    }

    /**
     * Create runner mesh - Kurzgesagt style friendly sphere
     * NO mouth, NO Pac-Man features
     */
    private createRunnerMesh(colors: { primary: Color3; emissive: Color3 }): Mesh {
        // Main body - smooth sphere with slight vertical squash
        const body = MeshBuilder.CreateSphere('runner_body', {
            diameter: 1,
            segments: 24
        }, this.scene);
        body.scaling = new Vector3(1, 0.9, 1);  // Slight squash for cuteness

        // Create material
        const material = new StandardMaterial('runner_mat', this.scene);
        material.diffuseColor = colors.primary;
        material.emissiveColor = colors.emissive;
        material.specularColor = new Color3(0.3, 0.3, 0.3);
        material.specularPower = 32;
        body.material = material;

        // Add eyes (two small dark spheres)
        const eyeLeft = MeshBuilder.CreateSphere('eye_l', { diameter: 0.15 }, this.scene);
        const eyeRight = MeshBuilder.CreateSphere('eye_r', { diameter: 0.15 }, this.scene);
        
        eyeLeft.position = new Vector3(-0.2, 0.15, 0.4);
        eyeRight.position = new Vector3(0.2, 0.15, 0.4);
        
        const eyeMat = new StandardMaterial('eye_mat', this.scene);
        eyeMat.diffuseColor = new Color3(0.05, 0.05, 0.1);  // Dark blue-black
        eyeLeft.material = eyeMat;
        eyeRight.material = eyeMat;

        // Eye highlights (tiny white spheres)
        const highlightL = MeshBuilder.CreateSphere('highlight_l', { diameter: 0.05 }, this.scene);
        const highlightR = MeshBuilder.CreateSphere('highlight_r', { diameter: 0.05 }, this.scene);
        highlightL.position = new Vector3(-0.17, 0.18, 0.45);
        highlightR.position = new Vector3(0.23, 0.18, 0.45);
        
        const highlightMat = new StandardMaterial('highlight_mat', this.scene);
        highlightMat.diffuseColor = Color3.White();
        highlightMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
        highlightL.material = highlightMat;
        highlightR.material = highlightMat;

        // Merge into single mesh
        const merged = Mesh.MergeMeshes(
            [body, eyeLeft, eyeRight, highlightL, highlightR],
            true, true, undefined, false, true
        );
        merged!.name = 'runner_template';
        
        return merged!;
    }

    /**
     * Create chaser mesh - Kurzgesagt style blob/ghost shape
     * Rounded top, wavy bottom, NO Pac-Man ghost features
     */
    private createChaserMesh(
        type: CharacterType, 
        colors: { primary: Color3; emissive: Color3 }
    ): Mesh {
        // Body: Capsule-like shape with dome top
        const body = MeshBuilder.CreateCapsule(`${type}_body`, {
            height: 1.2,
            radius: 0.4,
            tessellation: 24,
            subdivisions: 2
        }, this.scene);
        body.scaling = new Vector3(1, 1, 1);

        // Material
        const material = new StandardMaterial(`${type}_mat`, this.scene);
        material.diffuseColor = colors.primary;
        material.emissiveColor = colors.emissive;
        material.specularColor = new Color3(0.2, 0.2, 0.2);
        material.alpha = 0.95;  // Slight transparency for ghost-like feel
        body.material = material;

        // Eyes - larger, more expressive for Kurzgesagt style
        const eyeLeft = MeshBuilder.CreateSphere('eye_l', { diameter: 0.2 }, this.scene);
        const eyeRight = MeshBuilder.CreateSphere('eye_r', { diameter: 0.2 }, this.scene);
        
        eyeLeft.position = new Vector3(-0.15, 0.2, 0.35);
        eyeRight.position = new Vector3(0.15, 0.2, 0.35);
        
        const eyeWhiteMat = new StandardMaterial('eye_white', this.scene);
        eyeWhiteMat.diffuseColor = Color3.White();
        eyeLeft.material = eyeWhiteMat;
        eyeRight.material = eyeWhiteMat;

        // Pupils
        const pupilL = MeshBuilder.CreateSphere('pupil_l', { diameter: 0.1 }, this.scene);
        const pupilR = MeshBuilder.CreateSphere('pupil_r', { diameter: 0.1 }, this.scene);
        pupilL.position = new Vector3(-0.15, 0.2, 0.42);
        pupilR.position = new Vector3(0.15, 0.2, 0.42);
        
        const pupilMat = new StandardMaterial('pupil_mat', this.scene);
        pupilMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
        pupilL.material = pupilMat;
        pupilR.material = pupilMat;

        // Merge
        const merged = Mesh.MergeMeshes(
            [body, eyeLeft, eyeRight, pupilL, pupilR],
            true, true, undefined, false, true
        );
        merged!.name = `${type}_template`;

        return merged!;
    }

    /**
     * Create a character instance for gameplay
     */
    createCharacterInstance(type: CharacterType, position: Vector3): Mesh | AbstractMesh {
        const character = this.loadedCharacters.get(type);
        
        if (!character) {
            console.warn(`Character ${type} not loaded, loading now...`);
            // Return temporary placeholder
            const placeholder = MeshBuilder.CreateSphere('temp', { diameter: 0.5 }, this.scene);
            placeholder.position = position;
            return placeholder;
        }

        if (character.isExternal) {
            // Clone external model
            const clone = (character.mesh as Mesh).clone(`${type}_instance_${Date.now()}`);
            clone.position = position;
            clone.isVisible = true;
            return clone;
        } else {
            // Create thin instance of procedural mesh
            const template = this.templateMeshes.get(type);
            if (template) {
                const instance = template.createInstance(`${type}_instance_${Date.now()}`);
                instance.position = position;
                instance.isVisible = true;
                return instance as unknown as Mesh;
            }
        }

        // Fallback
        const fallback = MeshBuilder.CreateSphere(`${type}_fallback`, { diameter: 0.5 }, this.scene);
        fallback.position = position;
        return fallback;
    }

    /**
     * Search for character models via AI-driven asset discovery
     */
    async discoverCharacterAssets(): Promise<void> {
        const assetManager = getAssetManager();
        
        console.log('🔍 Searching for character assets via AI...');
        
        // Search for runner models
        const runnerAssets = await assetManager.searchWithAI('runner');
        console.log(`Found ${runnerAssets.length} potential runner models`);
        
        // Search for chaser/enemy models  
        const chaserAssets = await assetManager.searchWithAI('chaser');
        console.log(`Found ${chaserAssets.length} potential chaser models`);
        
        // Log recommendations for manual download
        if (runnerAssets.length > 0 || chaserAssets.length > 0) {
            console.log('\n📋 Recommended assets to download:');
            [...runnerAssets, ...chaserAssets].slice(0, 5).forEach(asset => {
                console.log(`  - ${asset.title} by ${asset.author} (${asset.license})`);
                console.log(`    ${asset.url}`);
            });
        }
    }

    /**
     * Get animation group for a character
     */
    getAnimation(type: CharacterType, animationName: string): AnimationGroup | undefined {
        const character = this.loadedCharacters.get(type);
        return character?.animations.get(animationName);
    }

    /**
     * Dispose all loaded characters
     */
    dispose(): void {
        this.loadedCharacters.forEach(char => {
            char.mesh.dispose();
        });
        this.templateMeshes.forEach(mesh => {
            mesh.dispose();
        });
        this.loadedCharacters.clear();
        this.templateMeshes.clear();
    }
}

// Singleton instance
let characterLoaderInstance: CharacterModelLoader | null = null;

export function getCharacterModelLoader(scene?: Scene): CharacterModelLoader {
    if (!characterLoaderInstance && scene) {
        characterLoaderInstance = new CharacterModelLoader(scene);
    }
    if (!characterLoaderInstance) {
        throw new Error('CharacterModelLoader not initialized. Call with scene first.');
    }
    return characterLoaderInstance;
}

export default CharacterModelLoader;
