/**
 * ModelLoader - Babylon.js Model Loading and Management
 * 
 * Features:
 * - Load glTF/OBJ models using AssetsManager
 * - Pre-load dungeon assets before maze construction
 * - Instance management for efficient rendering
 * - Support for walls, floors, skydome, and decorations
 */

import {
    Scene,
    AssetsManager,
    AbstractMesh,
    Mesh,
    Vector3,
    SceneLoader,
    StandardMaterial,
    Color3,
    Texture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';

export interface LoadedModel {
    name: string;
    meshes: AbstractMesh[];
    rootMesh: AbstractMesh | null;
    loaded: boolean;
}

export interface ModelManifest {
    walls: {
        straight: string;
        corner: string;
        end: string;
        tJunction?: string;
        cross?: string;
        sewerBase?: string;
        sewerMain?: string;
    };
    floors: {
        stone: string;
        mossy?: string;
        cracked?: string[];
        grate?: string;
        tapered?: string;
    };
    skydome: {
        model: string;
        texture?: string;
    };
    decorations: {
        weeds: string[];
        rocks: string[];
        ivy?: string[];
    };
    props: {
        barrel?: string;
        crate?: string;
        brazier?: string;
        lever?: string;
        floorSwitch?: string;
        torch?: string;
        chains?: string;
        doorWood?: string;
        doorIron?: string;
        doorCell?: string;
    };
    pillars: {
        corner?: { base: string; main: string; top: string };
        angled?: { base: string; main: string; top: string };
        midWall?: { base: string; main: string; top: string };
    };
    traps: {
        spikes?: string;
        saw?: string;
        pipes?: string;
        crusher?: { base: string; arm: string };
    };
}

// Default paths for dungeon models - Updated with actual OpenGameArt assets (CC0)
// All assets from:
// - Dungeon Set 2 by Keith at Fertile Soil Productions (CC0)
// - Skydome 3D by GGBotNet (CC0)
// - Tiny Weeds 3 by Yughues (CC0)
// - Rocks by Yughues (CC0)
const DUNGEON_PATH = '/models/dungeon/Dungeon Set 2';
const DEFAULT_MODEL_PATHS: ModelManifest = {
    walls: {
        straight: `${DUNGEON_PATH}/struct_wall_straight_main.obj`,
        corner: `${DUNGEON_PATH}/struct_wall_curved_main.obj`,
        end: `${DUNGEON_PATH}/struct_wall_tapered_main.obj`,
        tJunction: `${DUNGEON_PATH}/struct_wall_joint_main.obj`,
        cross: `${DUNGEON_PATH}/struct_wall_joint_main.obj`,
        sewerBase: `${DUNGEON_PATH}/struct_wall_sewer_base.obj`,
        sewerMain: `${DUNGEON_PATH}/struct_wall_sewer_main.obj`
    },
    floors: {
        stone: `${DUNGEON_PATH}/struct_floor_normal.obj`,
        mossy: `${DUNGEON_PATH}/struct_floor_grate_round.obj`,
        grate: `${DUNGEON_PATH}/struct_floor_grate_square.obj`,
        tapered: `${DUNGEON_PATH}/struct_floor_tapered.obj`,
        cracked: [
            `${DUNGEON_PATH}/struct_floor_cracked_1.obj`,
            `${DUNGEON_PATH}/struct_floor_cracked_2.obj`,
            `${DUNGEON_PATH}/struct_floor_cracked_3.obj`,
            `${DUNGEON_PATH}/struct_floor_cracked_4.obj`
        ]
    },
    skydome: {
        model: '/models/environment/Skydome.obj',
        texture: '/models/environment/Skydome.png'
    },
    decorations: {
        weeds: [
            '/models/decorations/01/tiny_weed_03_01.obj',
            '/models/decorations/02/tiny_weeds_03_02.obj',
            '/models/decorations/03/tiny_weeds_03_03.obj'
        ],
        rocks: [
            '/models/decorations/01/rock_01.obj',
            '/models/decorations/02/rock_02.obj',
            '/models/decorations/03/rock_03.obj',
            '/models/decorations/04/rock_04.obj',
            '/models/decorations/05/rock_05.obj'
        ],
        ivy: [
            '/models/decorations/ivy/ivy_default.obj',
            '/models/decorations/ivy/ivy_bend_left.obj',
            '/models/decorations/ivy/ivy_bend_right.obj',
            '/models/decorations/ivy/ivy_corner_horizontal.obj',
            '/models/decorations/ivy/ivy_corner_vertical.obj'
        ]
    },
    props: {
        barrel: `${DUNGEON_PATH}/prop_floor_barrel.obj`,
        crate: `${DUNGEON_PATH}/prop_floor_crate.obj`,
        brazier: `${DUNGEON_PATH}/prop_floor_brazier.obj`,
        lever: `${DUNGEON_PATH}/prop_floor_lever.obj`,
        floorSwitch: `${DUNGEON_PATH}/prop_floor_switch.obj`,
        torch: `${DUNGEON_PATH}/prop_wall_torch.obj`,
        chains: `${DUNGEON_PATH}/prop_wall_chains.obj`,
        doorWood: `${DUNGEON_PATH}/prop_wall_big_door_wood.obj`,
        doorIron: `${DUNGEON_PATH}/prop_wall_big_door_iron.obj`,
        doorCell: `${DUNGEON_PATH}/prop_wall_door_cell.obj`
    },
    pillars: {
        corner: {
            base: `${DUNGEON_PATH}/struct_pillar_corner_base.obj`,
            main: `${DUNGEON_PATH}/struct_pillar_corner_main.obj`,
            top: `${DUNGEON_PATH}/struct_pillar_corner_top.obj`
        },
        angled: {
            base: `${DUNGEON_PATH}/struct_pillar_angled_base.obj`,
            main: `${DUNGEON_PATH}/struct_pillar_angled_main.obj`,
            top: `${DUNGEON_PATH}/struct_pillar_angled_top.obj`
        },
        midWall: {
            base: `${DUNGEON_PATH}/struct_pillar_mid_wall_base.obj`,
            main: `${DUNGEON_PATH}/struct_pillar_mid_wall_main.obj`,
            top: `${DUNGEON_PATH}/struct_pillar_mid_wall_top.obj`
        }
    },
    traps: {
        spikes: `${DUNGEON_PATH}/trap_floor_spikes.obj`,
        saw: `${DUNGEON_PATH}/trap_floor_saw.obj`,
        pipes: `${DUNGEON_PATH}/trap_floor_pipes.obj`,
        crusher: {
            base: `${DUNGEON_PATH}/trap_ceiling_crusher_base.obj`,
            arm: `${DUNGEON_PATH}/trap_ceiling_crusher_arm.obj`
        }
    }
};

/**
 * ModelLoader - Handles loading and caching of 3D models
 */
export class ModelLoader {
    private scene: Scene;
    private assetsManager: AssetsManager;
    private loadedModels: Map<string, LoadedModel> = new Map();
    private modelManifest: ModelManifest;
    private isLoading: boolean = false;
    private loadProgress: number = 0;

    // Template meshes for instancing
    private wallTemplates: Map<string, Mesh> = new Map();
    private floorTemplates: Map<string, Mesh> = new Map();
    private decorationTemplates: Map<string, Mesh> = new Map();
    private propTemplates: Map<string, Mesh> = new Map();
    private pillarTemplates: Map<string, Mesh> = new Map();
    private trapTemplates: Map<string, Mesh> = new Map();
    private skydomeMesh: Mesh | null = null;

    constructor(scene: Scene, manifest?: Partial<ModelManifest>) {
        this.scene = scene;
        this.assetsManager = new AssetsManager(scene);
        this.modelManifest = { ...DEFAULT_MODEL_PATHS, ...manifest };

        // Configure assets manager
        this.assetsManager.useDefaultLoadingScreen = false;
        
        this.assetsManager.onProgress = (remainingCount, totalCount) => {
            this.loadProgress = ((totalCount - remainingCount) / totalCount) * 100;
            console.log(`📦 Loading models: ${this.loadProgress.toFixed(0)}%`);
        };

        this.assetsManager.onFinish = () => {
            console.log('✅ All models loaded successfully');
            this.isLoading = false;
        };
    }

    /**
     * Pre-load all required models before maze construction
     */
    async loadAllModels(_onProgress?: (progress: number) => void): Promise<boolean> {
        if (this.isLoading) {
            console.warn('ModelLoader: Already loading');
            return false;
        }

        this.isLoading = true;
        console.log('🎮 ModelLoader: Starting asset preload...');

        try {
            // Queue wall models
            await this.loadWallModels();
            
            // Queue floor models (multiple variants)
            await this.loadFloorModels();
            
            // Queue skydome
            await this.loadSkydome();
            
            // Queue decoration models (weeds, rocks, ivy)
            await this.loadDecorationModels();
            
            // Queue prop models (barrels, crates, torches, etc.)
            await this.loadPropModels();
            
            // Queue pillar models
            await this.loadPillarModels();
            
            // Queue trap models
            await this.loadTrapModels();

            console.log('✅ ModelLoader: All models queued and loaded');
            return true;
        } catch (error) {
            console.error('❌ ModelLoader: Failed to load models', error);
            return false;
        }
    }

    /**
     * Load wall segment models
     */
    private async loadWallModels(): Promise<void> {
        const wallTypes = ['straight', 'corner', 'end'] as const;
        
        for (const type of wallTypes) {
            const path = this.modelManifest.walls[type];
            if (!path) continue;

            try {
                const exists = await this.checkModelExists(path);
                if (exists) {
                    const mesh = await this.loadModel(`wall_${type}`, path);
                    if (mesh) {
                        this.wallTemplates.set(type, mesh);
                        mesh.setEnabled(false); // Template - don't render directly
                    }
                } else {
                    console.log(`⚠️ Wall model not found: ${path} - will use primitive`);
                }
            } catch (error) {
                console.warn(`Failed to load wall_${type}:`, error);
            }
        }
    }

    /**
     * Load floor tile models - multiple variants for visual variety
     */
    private async loadFloorModels(): Promise<void> {
        // Load standard stone floor
        const stonePath = this.modelManifest.floors.stone;
        try {
            const exists = await this.checkModelExists(stonePath);
            if (exists) {
                const mesh = await this.loadModel('floor_stone', stonePath);
                if (mesh) {
                    this.floorTemplates.set('stone', mesh);
                    mesh.setEnabled(false);
                }
            }
        } catch (error) {
            console.warn('Failed to load stone floor model:', error);
        }

        // Load grate floor
        if (this.modelManifest.floors.grate) {
            try {
                const exists = await this.checkModelExists(this.modelManifest.floors.grate);
                if (exists) {
                    const mesh = await this.loadModel('floor_grate', this.modelManifest.floors.grate);
                    if (mesh) {
                        this.floorTemplates.set('grate', mesh);
                        mesh.setEnabled(false);
                    }
                }
            } catch (error) {
                console.warn('Failed to load grate floor:', error);
            }
        }

        // Load cracked floor variants
        if (this.modelManifest.floors.cracked && Array.isArray(this.modelManifest.floors.cracked)) {
            for (let i = 0; i < this.modelManifest.floors.cracked.length; i++) {
                const path = this.modelManifest.floors.cracked[i];
                if (!path) continue;
                try {
                    const exists = await this.checkModelExists(path);
                    if (exists) {
                        const mesh = await this.loadModel(`floor_cracked_${i}`, path);
                        if (mesh) {
                            this.floorTemplates.set(`cracked_${i}`, mesh);
                            mesh.setEnabled(false);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load cracked floor ${i}:`, error);
                }
            }
        }
    }

    /**
     * Load and setup skydome
     */
    private async loadSkydome(): Promise<void> {
        const modelPath = this.modelManifest.skydome.model;
        const texturePath = this.modelManifest.skydome.texture;

        try {
            const exists = await this.checkModelExists(modelPath);
            
            if (exists) {
                const mesh = await this.loadModel('skydome', modelPath);
                if (mesh) {
                    this.skydomeMesh = mesh;
                    this.setupSkydome(mesh, texturePath);
                }
            } else {
                // Create procedural skydome
                console.log('⚠️ Skydome model not found - creating procedural skydome');
                this.createProceduralSkydome();
            }
        } catch (error) {
            console.warn('Failed to load skydome:', error);
            this.createProceduralSkydome();
        }
    }

    /**
     * Setup skydome mesh with proper settings
     */
    private setupSkydome(mesh: Mesh, texturePath?: string): void {
        // Scale to encompass the entire scene
        mesh.scaling = new Vector3(500, 500, 500);
        mesh.position = new Vector3(0, -50, 0);
        
        // Ensure it renders behind everything
        mesh.renderingGroupId = 0;
        mesh.infiniteDistance = true;
        
        // Apply texture if available
        if (texturePath) {
            const material = new StandardMaterial('skydome_mat', this.scene);
            material.backFaceCulling = false;
            material.disableLighting = true;
            material.emissiveTexture = new Texture(texturePath, this.scene);
            mesh.material = material;
        }

        console.log('🌌 Skydome configured');
    }

    /**
     * Create procedural skydome when model is not available
     */
    private createProceduralSkydome(): void {
        const { MeshBuilder } = require('@babylonjs/core');
        
        const skydome = MeshBuilder.CreateSphere('skydome', {
            diameter: 1000,
            segments: 32
        }, this.scene);

        const material = new StandardMaterial('skydome_mat', this.scene);
        material.backFaceCulling = false;
        material.disableLighting = true;
        
        // Create gradient for space effect
        material.emissiveColor = new Color3(0.02, 0.01, 0.05);
        material.diffuseColor = new Color3(0, 0, 0);
        
        skydome.material = material;
        skydome.infiniteDistance = true;
        skydome.renderingGroupId = 0;
        
        this.skydomeMesh = skydome;
        console.log('🌌 Procedural skydome created');
    }

    /**
     * Load decoration models (weeds, rocks, ivy)
     */
    private async loadDecorationModels(): Promise<void> {
        // Load weeds
        for (let i = 0; i < this.modelManifest.decorations.weeds.length; i++) {
            const path = this.modelManifest.decorations.weeds[i];
            if (!path) continue;
            try {
                const exists = await this.checkModelExists(path);
                if (exists) {
                    const mesh = await this.loadModel(`weed_${i}`, path);
                    if (mesh) {
                        this.decorationTemplates.set(`weed_${i}`, mesh);
                        mesh.setEnabled(false);
                    }
                }
            } catch (error) {
                console.warn(`Failed to load weed_${i}:`, error);
            }
        }

        // Load rocks
        for (let i = 0; i < this.modelManifest.decorations.rocks.length; i++) {
            const path = this.modelManifest.decorations.rocks[i];
            if (!path) continue;
            try {
                const exists = await this.checkModelExists(path);
                if (exists) {
                    const mesh = await this.loadModel(`rock_${i}`, path);
                    if (mesh) {
                        this.decorationTemplates.set(`rock_${i}`, mesh);
                        mesh.setEnabled(false);
                    }
                }
            } catch (error) {
                console.warn(`Failed to load rock_${i}:`, error);
            }
        }

        // Load ivy
        if (this.modelManifest.decorations.ivy) {
            for (let i = 0; i < this.modelManifest.decorations.ivy.length; i++) {
                const path = this.modelManifest.decorations.ivy[i];
                if (!path) continue;
                try {
                    const exists = await this.checkModelExists(path);
                    if (exists) {
                        const mesh = await this.loadModel(`ivy_${i}`, path);
                        if (mesh) {
                            this.decorationTemplates.set(`ivy_${i}`, mesh);
                            mesh.setEnabled(false);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load ivy_${i}:`, error);
                }
            }
        }
    }

    /**
     * Load prop models (barrels, crates, torches, etc.)
     */
    private async loadPropModels(): Promise<void> {
        if (!this.modelManifest.props) return;

        const propTypes = ['barrel', 'crate', 'brazier', 'lever', 'floorSwitch', 'torch', 'chains', 'doorWood', 'doorIron', 'doorCell'] as const;

        for (const type of propTypes) {
            const path = this.modelManifest.props[type];
            if (!path) continue;

            try {
                const exists = await this.checkModelExists(path);
                if (exists) {
                    const mesh = await this.loadModel(`prop_${type}`, path);
                    if (mesh) {
                        this.propTemplates.set(type, mesh);
                        mesh.setEnabled(false);
                    }
                }
            } catch (error) {
                console.warn(`Failed to load prop_${type}:`, error);
            }
        }
        
        console.log(`🏺 Loaded ${this.propTemplates.size} prop models`);
    }

    /**
     * Load pillar models (corner, angled, mid-wall pillars)
     */
    private async loadPillarModels(): Promise<void> {
        if (!this.modelManifest.pillars) return;

        const pillarTypes = ['corner', 'angled', 'midWall'] as const;

        for (const type of pillarTypes) {
            const pillar = this.modelManifest.pillars[type];
            if (!pillar) continue;

            // Load base, main, and top parts
            for (const part of ['base', 'main', 'top'] as const) {
                const path = pillar[part];
                if (!path) continue;

                try {
                    const exists = await this.checkModelExists(path);
                    if (exists) {
                        const mesh = await this.loadModel(`pillar_${type}_${part}`, path);
                        if (mesh) {
                            this.pillarTemplates.set(`${type}_${part}`, mesh);
                            mesh.setEnabled(false);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load pillar_${type}_${part}:`, error);
                }
            }
        }
        
        console.log(`🏛️ Loaded ${this.pillarTemplates.size} pillar models`);
    }

    /**
     * Load trap models (spikes, saw, pipes, crusher)
     */
    private async loadTrapModels(): Promise<void> {
        if (!this.modelManifest.traps) return;

        // Simple traps
        const simpleTraps = ['spikes', 'saw', 'pipes'] as const;
        for (const type of simpleTraps) {
            const path = this.modelManifest.traps[type];
            if (!path) continue;

            try {
                const exists = await this.checkModelExists(path);
                if (exists) {
                    const mesh = await this.loadModel(`trap_${type}`, path);
                    if (mesh) {
                        this.trapTemplates.set(type, mesh);
                        mesh.setEnabled(false);
                    }
                }
            } catch (error) {
                console.warn(`Failed to load trap_${type}:`, error);
            }
        }

        // Crusher (two parts)
        if (this.modelManifest.traps.crusher) {
            for (const part of ['base', 'arm'] as const) {
                const path = this.modelManifest.traps.crusher[part];
                if (!path) continue;

                try {
                    const exists = await this.checkModelExists(path);
                    if (exists) {
                        const mesh = await this.loadModel(`trap_crusher_${part}`, path);
                        if (mesh) {
                            this.trapTemplates.set(`crusher_${part}`, mesh);
                            mesh.setEnabled(false);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load trap_crusher_${part}:`, error);
                }
            }
        }
        
        console.log(`⚔️ Loaded ${this.trapTemplates.size} trap models`);
    }

    /**
     * Load a single model file
     */
    private async loadModel(name: string, path: string): Promise<Mesh | null> {
        if (this.loadedModels.has(name)) {
            const loaded = this.loadedModels.get(name)!;
            return loaded.rootMesh as Mesh;
        }

        try {
            const result = await SceneLoader.ImportMeshAsync('', '', path, this.scene);
            
            if (result.meshes.length > 0) {
                // Merge all meshes into one for instancing
                const rootMesh = result.meshes[0] as Mesh;
                
                this.loadedModels.set(name, {
                    name,
                    meshes: result.meshes,
                    rootMesh,
                    loaded: true
                });

                console.log(`✅ Loaded model: ${name} (${result.meshes.length} meshes)`);
                return rootMesh;
            }
        } catch (error) {
            console.warn(`Failed to load model ${name} from ${path}:`, error);
        }

        return null;
    }

    /**
     * Check if a model file exists at the given path
     */
    private async checkModelExists(path: string): Promise<boolean> {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get wall template mesh for instancing
     */
    getWallTemplate(type: 'straight' | 'corner' | 'end'): Mesh | null {
        return this.wallTemplates.get(type) || null;
    }

    /**
     * Get floor template mesh - returns stone by default, or a specific variant
     */
    getFloorTemplate(variant: 'stone' | 'grate' | 'cracked' = 'stone'): Mesh | null {
        if (variant === 'cracked') {
            // Return random cracked variant
            const crackedTemplates = Array.from(this.floorTemplates.entries())
                .filter(([key]) => key.startsWith('cracked'));
            if (crackedTemplates.length > 0) {
                const randomIndex = Math.floor(Math.random() * crackedTemplates.length);
                const template = crackedTemplates[randomIndex];
                return template ? template[1] : null;
            }
        }
        return this.floorTemplates.get(variant) || this.floorTemplates.get('stone') || null;
    }

    /**
     * Get random decoration template (weed, rock, or ivy)
     */
    getDecorationTemplate(type: 'weed' | 'rock' | 'ivy'): Mesh | null {
        const templates = Array.from(this.decorationTemplates.entries())
            .filter(([key]) => key.startsWith(type));
        
        if (templates.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * templates.length);
        const template = templates[randomIndex];
        return template ? template[1] : null;
    }

    /**
     * Get prop template mesh
     */
    getPropTemplate(type: 'barrel' | 'crate' | 'brazier' | 'lever' | 'floorSwitch' | 'torch' | 'chains' | 'doorWood' | 'doorIron' | 'doorCell'): Mesh | null {
        return this.propTemplates.get(type) || null;
    }

    /**
     * Get random prop template (for random decoration placement)
     */
    getRandomPropTemplate(): Mesh | null {
        const props = Array.from(this.propTemplates.values());
        if (props.length === 0) return null;
        const prop = props[Math.floor(Math.random() * props.length)];
        return prop || null;
    }

    /**
     * Get pillar template mesh (base, main, or top part)
     */
    getPillarTemplate(type: 'corner' | 'angled' | 'midWall', part: 'base' | 'main' | 'top'): Mesh | null {
        return this.pillarTemplates.get(`${type}_${part}`) || null;
    }

    /**
     * Get trap template mesh
     */
    getTrapTemplate(type: 'spikes' | 'saw' | 'pipes' | 'crusher_base' | 'crusher_arm'): Mesh | null {
        return this.trapTemplates.get(type) || null;
    }

    /**
     * Create an instance of a wall segment
     */
    createWallInstance(type: 'straight' | 'corner' | 'end', position: Vector3, rotation: number = 0): Mesh | null {
        const template = this.wallTemplates.get(type);
        if (!template) return null;

        const instance = template.createInstance(`wall_instance_${Date.now()}`);
        instance.position = position;
        instance.rotation.y = rotation;
        
        return instance as unknown as Mesh;
    }

    /**
     * Create an instance of a decoration
     */
    createDecorationInstance(type: 'weed' | 'rock' | 'ivy', position: Vector3, scale: number = 1): Mesh | null {
        const template = this.getDecorationTemplate(type);
        if (!template) return null;

        const instance = template.createInstance(`${type}_instance_${Date.now()}`);
        instance.position = position;
        instance.scaling = new Vector3(scale, scale, scale);
        instance.rotation.y = Math.random() * Math.PI * 2;
        
        return instance as unknown as Mesh;
    }

    /**
     * Create an instance of a prop
     */
    createPropInstance(type: 'barrel' | 'crate' | 'brazier' | 'lever' | 'floorSwitch' | 'torch' | 'chains', position: Vector3, rotation: number = 0, scale: number = 1): Mesh | null {
        const template = this.propTemplates.get(type);
        if (!template) return null;

        const instance = template.createInstance(`prop_${type}_${Date.now()}`);
        instance.position = position;
        instance.rotation.y = rotation;
        instance.scaling = new Vector3(scale, scale, scale);
        
        return instance as unknown as Mesh;
    }

    /**
     * Create a full pillar (base + main + top stacked)
     */
    createPillarInstance(type: 'corner' | 'angled' | 'midWall', position: Vector3, rotation: number = 0, scale: number = 1): Mesh[] {
        const result: Mesh[] = [];
        let yOffset = 0;

        for (const part of ['base', 'main', 'top'] as const) {
            const template = this.pillarTemplates.get(`${type}_${part}`);
            if (!template) continue;

            const instance = template.createInstance(`pillar_${type}_${part}_${Date.now()}`);
            instance.position = position.clone();
            instance.position.y += yOffset;
            instance.rotation.y = rotation;
            instance.scaling = new Vector3(scale, scale, scale);
            
            result.push(instance as unknown as Mesh);
            yOffset += 1; // Stack vertically
        }
        
        return result;
    }

    /**
     * Create trap instance
     */
    createTrapInstance(type: 'spikes' | 'saw' | 'pipes', position: Vector3, rotation: number = 0): Mesh | null {
        const template = this.trapTemplates.get(type);
        if (!template) return null;

        const instance = template.createInstance(`trap_${type}_${Date.now()}`);
        instance.position = position;
        instance.rotation.y = rotation;
        
        return instance as unknown as Mesh;
    }

    /**
     * Check if models are loaded and available
     */
    hasWallModels(): boolean {
        return this.wallTemplates.size > 0;
    }

    hasFloorModel(): boolean {
        return this.floorTemplates.size > 0;
    }

    hasDecorationModels(): boolean {
        return this.decorationTemplates.size > 0;
    }

    hasPropModels(): boolean {
        return this.propTemplates.size > 0;
    }

    hasPillarModels(): boolean {
        return this.pillarTemplates.size > 0;
    }

    hasTrapModels(): boolean {
        return this.trapTemplates.size > 0;
    }

    hasSkydome(): boolean {
        return this.skydomeMesh !== null;
    }

    /**
     * Get loading progress (0-100)
     */
    getLoadProgress(): number {
        return this.loadProgress;
    }

    /**
     * Get stats about loaded models
     */
    getLoadedStats(): { walls: number; floors: number; decorations: number; props: number; pillars: number; traps: number } {
        return {
            walls: this.wallTemplates.size,
            floors: this.floorTemplates.size,
            decorations: this.decorationTemplates.size,
            props: this.propTemplates.size,
            pillars: this.pillarTemplates.size,
            traps: this.trapTemplates.size
        };
    }

    /**
     * Dispose all loaded models
     */
    dispose(): void {
        this.wallTemplates.forEach(mesh => mesh.dispose());
        this.floorTemplates.forEach(mesh => mesh.dispose());
        this.decorationTemplates.forEach(mesh => mesh.dispose());
        this.propTemplates.forEach(mesh => mesh.dispose());
        this.pillarTemplates.forEach(mesh => mesh.dispose());
        this.trapTemplates.forEach(mesh => mesh.dispose());
        this.skydomeMesh?.dispose();
        
        this.wallTemplates.clear();
        this.floorTemplates.clear();
        this.decorationTemplates.clear();
        this.propTemplates.clear();
        this.pillarTemplates.clear();
        this.trapTemplates.clear();
        this.skydomeMesh = null;
        this.loadedModels.clear();
    }
}

// Singleton instance
let modelLoaderInstance: ModelLoader | null = null;

export function getModelLoader(scene?: Scene): ModelLoader | null {
    if (!modelLoaderInstance && scene) {
        modelLoaderInstance = new ModelLoader(scene);
    }
    return modelLoaderInstance;
}

export function initModelLoader(scene: Scene, manifest?: Partial<ModelManifest>): ModelLoader {
    if (modelLoaderInstance) {
        modelLoaderInstance.dispose();
    }
    modelLoaderInstance = new ModelLoader(scene, manifest);
    return modelLoaderInstance;
}

export default ModelLoader;
