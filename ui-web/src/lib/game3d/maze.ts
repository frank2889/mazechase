/**
 * Maze3D - 3D Maze Renderer for MazeChase
 * 
 * Unified Neon Arena theme (simplified Dec 2025)
 * All quadrants use the same purple/cyan arcade aesthetic
 * 
 * Sprint 4: Performance optimizations
 * - Wall mesh batching
 * - Floor mesh batching  
 * - Pellet thin instancing
 * 
 * Sprint 5: External model support
 * - ModelLoader integration for dungeon walls/floors
 * - Wall orientation detection (straight, corner, end)
 * - Skydome and decoration models
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    Vector3,
    Mesh,
    TransformNode,
    GlowLayer,
    Animation,
    Matrix,
    Quaternion,
    Texture
} from '@babylonjs/core';
import { getModelLoader, ModelLoader } from '../assets/modelLoader';
import { 
    getThemeForTile, 
    getQuadrant, 
    isCrossDivider,
    QUADRANT_THEMES,
    THEME_NEON_ARENA,
    type QuadrantTheme,
    type Quadrant
} from './quadrant-themes';

// Tile size in 3D world units
export const TILE_SIZE_3D = 1;

// Maze tile types (matching the tilemap)
export enum TileType {
    FLOOR = 0,
    WALL = 1,
    PELLET = 2,
    POWER_UP = 3
}

/**
 * Check if a tile is inside the circular arena
 * Uses dynamic radius based on map size
 */
function isInsideCircle(x: number, y: number, width: number, height: number): boolean {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 5; // 5 tile margin
    const dx = x - centerX + 0.5;
    const dy = y - centerY + 0.5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
}

/**
 * Check if a tile is part of the cross divider (center corridors)
 */
function isInCrossArea(x: number, y: number, width: number, height: number): boolean {
    const centerX = width / 2;
    const centerY = height / 2;
    const crossWidth = Math.max(2, Math.floor(width / 50)); // Scale cross width with map size
    const inVertical = x >= centerX - crossWidth && x <= centerX + crossWidth - 1;
    const inHorizontal = y >= centerY - crossWidth && y <= centerY + crossWidth - 1;
    return inVertical || inHorizontal;
}

export interface MazeConfig {
    width: number;
    height: number;
    tiles: number[][]; // 2D array of tile types
}

export class Maze3D {
    private scene: Scene;
    private mazeRoot: TransformNode;
    private wallMeshes: Mesh[] = [];
    private floorMeshes: Mesh[] = [];
    private pelletMeshes: Map<string, Mesh> = new Map();
    private powerUpMeshes: Map<string, Mesh> = new Map();
    private glowLayer: GlowLayer | null = null;
    private mazeWidth: number = 0;
    private mazeHeight: number = 0;
    
    // Sprint 4: Pellet thin instancing for performance
    private pelletBaseMesh: Mesh | null = null;
    private pelletPositions: Map<string, number> = new Map(); // key -> instance index
    private pelletMatrices: Float32Array | null = null;
    private usePelletInstancing: boolean = false;

    // Sprint 5: External model support
    private modelLoader: ModelLoader | null = null;
    private useExternalModels: boolean = false;
    private tiles: number[][] = []; // Store tiles for wall orientation detection

    // Materials per quadrant
    private quadrantMaterials: Map<string, {
        wall: StandardMaterial;
        floor: StandardMaterial;
        pellet: StandardMaterial;
        powerUp: StandardMaterial;
    }> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
        this.mazeRoot = new TransformNode('mazeRoot', scene);
        this.modelLoader = getModelLoader(scene);
        this.setupGlowLayer();
        this.createQuadrantMaterials();
    }

    private setupGlowLayer(): void {
        this.glowLayer = new GlowLayer('glowLayer', this.scene);
        // EMMSOAI optimization (Elena): Reduced glow for better performance
        this.glowLayer.intensity = 1.2; // Reduced from 1.5 for performance
        this.glowLayer.blurKernelSize = 32; // Reduced from 48 for GPU savings
        
        // EMMSOAI (Elena): Only glow on runner, power-ups, and pellets - not walls
        // This reduces GPU load significantly
        this.glowLayer.customEmissiveColorSelector = (mesh, subMesh, material, result) => {
            const name = mesh.name.toLowerCase();
            
            // Only apply glow to specific meshes for performance
            if (name.startsWith('pellet')) {
                // Brighter yellow glow for pellets
                result.set(1, 0.95, 0.3, 1);
            } else if (name.startsWith('power')) {
                // Bright cyan glow for power-ups
                result.set(0.3, 1, 1, 1);
            } else if (name.includes('runner') || name.includes('player')) {
                // Player glow
                result.set(0, 1, 1, 1);
            } else {
                // No glow for walls and other meshes (performance optimization)
                result.set(0, 0, 0, 0);
            }
        };
    }

    public getGlowLayer(): GlowLayer | null {
        return this.glowLayer;
    }

    /**
     * Create unique materials for each quadrant
     * SIMPLIFIED: All quadrants use same theme now
     * SPRINT 2: Enhanced with metallic reflections and better texturing
     * NOW USES TEXTURE SPRITES from /sprites/ folder!
     */
    private createQuadrantMaterials(): void {
        // Use only unified theme - all quadrants are the same now
        const allThemes = [THEME_NEON_ARENA];
        
        for (const theme of allThemes) {
            const key = theme.name;
            
            // Wall material with TEXTURE from /sprites/wall_tile.png
            const wallMat = new StandardMaterial(`wall_${key}`, this.scene);
            try {
                const wallTexture = new Texture('/sprites/wall_tile.png', this.scene);
                wallTexture.uScale = 1;
                wallTexture.vScale = 1;
                wallMat.diffuseTexture = wallTexture;
            } catch (e) {
                console.warn('Wall texture not loaded, using color fallback');
                wallMat.diffuseColor = theme.wallPrimary;
            }
            wallMat.specularColor = new Color3(0.6, 0.4, 0.8); // Metallic purple reflection
            wallMat.emissiveColor = theme.wallEmissive;
            wallMat.specularPower = 64; // Sharper highlights for glossy look
            
            // Floor material with TEXTURE from /sprites/floor_tile.png
            const floorMat = new StandardMaterial(`floor_${key}`, this.scene);
            try {
                const floorTexture = new Texture('/sprites/floor_tile.png', this.scene);
                floorTexture.uScale = 1;
                floorTexture.vScale = 1;
                floorMat.diffuseTexture = floorTexture;
            } catch (e) {
                console.warn('Floor texture not loaded, using color fallback');
                floorMat.diffuseColor = theme.floorColor;
            }
            floorMat.emissiveColor = theme.floorEmissive;
            floorMat.specularColor = new Color3(0.15, 0.1, 0.2); // Subtle reflection
            floorMat.specularPower = 8; // Matte finish (rough for grip)
            
            // Pellet material with ENHANCED strong glow
            const pelletMat = new StandardMaterial(`pellet_${key}`, this.scene);
            pelletMat.diffuseColor = theme.pelletColor;
            pelletMat.emissiveColor = new Color3(
                theme.pelletEmissive.r * 1.2,
                theme.pelletEmissive.g * 1.2,
                theme.pelletEmissive.b * 1.0
            ); // Brighter glow
            pelletMat.specularColor = new Color3(1, 0.95, 0.5); // Golden highlights
            pelletMat.specularPower = 96; // Very shiny
            
            // Power-up material with INTENSE magical glow
            const powerUpMat = new StandardMaterial(`powerUp_${key}`, this.scene);
            powerUpMat.diffuseColor = theme.powerUpColor;
            powerUpMat.emissiveColor = new Color3(
                theme.powerUpEmissive.r * 1.3,
                theme.powerUpEmissive.g * 1.3,
                theme.powerUpEmissive.b * 1.2
            ); // Extra bright
            powerUpMat.specularColor = new Color3(1, 1, 1); // Pure white highlights
            powerUpMat.specularPower = 128; // Mirror-like
            powerUpMat.alpha = 0.9; // Slight transparency for ethereal look
            
            this.quadrantMaterials.set(key, {
                wall: wallMat,
                floor: floorMat,
                pellet: pelletMat,
                powerUp: powerUpMat
            });
        }
    }

    /**
     * Get materials for a specific tile position
     */
    private getMaterialsForTile(x: number, y: number) {
        const theme = getThemeForTile(x, y, this.mazeWidth, this.mazeHeight);
        return this.quadrantMaterials.get(theme.name)!;
    }

    /**
     * Pre-load external models before building maze
     * Call this before buildFromTilemap for external model support
     */
    async preloadModels(): Promise<boolean> {
        if (!this.modelLoader) {
            this.modelLoader = getModelLoader(this.scene) || null;
            if (!this.modelLoader) {
                console.warn('Maze3D: Could not initialize ModelLoader');
                return false;
            }
        }

        const success = await this.modelLoader.loadAllModels();
        this.useExternalModels = success && this.modelLoader.hasWallModels();
        
        console.log(`🎮 Maze3D: External models ${this.useExternalModels ? 'enabled' : 'disabled (using primitives)'}`);
        return this.useExternalModels;
    }

    /**
     * Build the 3D maze from tilemap data with unique quadrant themes
     * Sprint 4: Added mesh batching and thin instancing for draw call reduction
     * Sprint 5: External model support and wall orientation detection
     */
    buildFromTilemap(config: MazeConfig): void {
        this.clear();
        
        const { width, height, tiles } = config;
        this.mazeWidth = width;
        this.mazeHeight = height;
        this.tiles = tiles; // Store for wall orientation detection
        
        // Sprint 4: Decide if we should use instancing (for large maps)
        this.usePelletInstancing = width >= 30 || height >= 30;

        // Create floor planes for each quadrant
        this.createQuadrantFloors(width, height);
        
        // Sprint 4: Collect pellet positions first for instancing
        const pelletPositions: Vector3[] = [];
        const pelletKeys: string[] = [];
        
        // SPRINT 6: Collect all potential pellet positions first, then scatter
        const allPelletCandidates: { x: number; y: number; pos: Vector3 }[] = [];

        // Process each tile
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileType = tiles[y]?.[x] ?? TileType.FLOOR;
                const pos = this.tileToWorldPos(x, y);

                switch (tileType) {
                    case TileType.WALL:
                        this.createWall(x, y, pos);
                        break;
                    case TileType.PELLET:
                        // Collect candidates, don't create yet
                        allPelletCandidates.push({ x, y, pos });
                        break;
                    case TileType.POWER_UP:
                        this.createPowerUp(x, y, pos);
                        break;
                }
            }
        }
        
        // SPRINT 6: Scatter pellets - only keep 50-100 (not 1000+)
        // Shuffle and take first N pellets for nice distribution
        const MAX_PELLETS = 80;
        const shuffled = allPelletCandidates.sort(() => Math.random() - 0.5);
        const selectedPellets = shuffled.slice(0, Math.min(MAX_PELLETS, shuffled.length));
        
        console.log(`[Maze3D] Scattered ${selectedPellets.length} pellets from ${allPelletCandidates.length} candidates`);
        
        // Now create the selected pellets
        for (const pellet of selectedPellets) {
            if (this.usePelletInstancing) {
                pelletPositions.push(new Vector3(pellet.pos.x, TILE_SIZE_3D * 0.2, pellet.pos.z));
                pelletKeys.push(`${pellet.x}_${pellet.y}`);
            } else {
                this.createPellet(pellet.x, pellet.y, pellet.pos);
            }
        }
        
        // Sprint 4: Create instanced pellets if using instancing
        if (this.usePelletInstancing && pelletPositions.length > 0) {
            this.createInstancedPellets(pelletPositions, pelletKeys);
        }
        
        // Add quadrant decorations
        this.addQuadrantDecorations(width, height);
        
        // Sprint 4: Batch static geometry for draw call reduction
        this.batchStaticGeometry();
    }
    
    /**
     * Sprint 4: Create thin-instanced pellets for massive draw call reduction
     * 1000+ pellets → 1 draw call
     */
    private createInstancedPellets(positions: Vector3[], keys: string[]): void {
        const materials = this.quadrantMaterials.get(THEME_NEON_ARENA.name)!;
        
        // Create base pellet mesh
        this.pelletBaseMesh = MeshBuilder.CreateSphere('pellet_base', {
            diameter: TILE_SIZE_3D * 0.18,
            segments: 8
        }, this.scene);
        this.pelletBaseMesh.material = materials.pellet;
        this.pelletBaseMesh.parent = this.mazeRoot;
        
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(this.pelletBaseMesh);
        }
        
        // Create matrix buffer for all instances
        this.pelletMatrices = new Float32Array(positions.length * 16);
        
        positions.forEach((pos, i) => {
            // Store key -> index mapping
            this.pelletPositions.set(keys[i], i);
            
            // Create transformation matrix
            const matrix = Matrix.Compose(
                new Vector3(1, 1, 1), // Scale
                Quaternion.Identity(),
                pos
            );
            matrix.copyToArray(this.pelletMatrices!, i * 16);
        });
        
        // Set thin instances
        this.pelletBaseMesh.thinInstanceSetBuffer('matrix', this.pelletMatrices, 16);
        this.pelletBaseMesh.thinInstanceCount = positions.length;
        
        console.log(`⚡ Created ${positions.length} pellet instances (1 draw call)`);
    }
    
    /**
     * Sprint 4: Batch static wall and floor meshes to reduce draw calls
     * This can reduce 1000+ draw calls to ~10
     */
    private batchStaticGeometry(): void {
        // Only batch on larger maps where performance matters
        if (this.mazeWidth < 30 || this.wallMeshes.length < 100) {
            console.log(`⚡ Skipping batching for small map (${this.wallMeshes.length} walls)`);
            return;
        }
        
        const startDrawCalls = this.wallMeshes.length + this.floorMeshes.length;
        
        // Batch walls (all use same material now with unified theme)
        if (this.wallMeshes.length > 10) {
            try {
                const batchedWalls = Mesh.MergeMeshes(
                    this.wallMeshes.filter(m => m && !m.isDisposed()),
                    true,  // Dispose source meshes
                    true,  // Allow 32bit indices
                    undefined,
                    false, // Don't subdivide
                    true   // Keep material
                );
                
                if (batchedWalls) {
                    batchedWalls.name = 'walls_batched';
                    batchedWalls.parent = this.mazeRoot;
                    batchedWalls.isPickable = false;
                    batchedWalls.doNotSyncBoundingInfo = true;
                    
                    // Re-add to glow layer
                    if (this.glowLayer) {
                        this.glowLayer.addIncludedOnlyMesh(batchedWalls);
                    }
                    
                    // Clear original array and store batched
                    this.wallMeshes = [batchedWalls];
                }
            } catch (e) {
                console.warn('Wall batching failed, using individual meshes:', e);
            }
        }
        
        // Batch floor tiles
        if (this.floorMeshes.length > 100) {
            try {
                const batchedFloors = Mesh.MergeMeshes(
                    this.floorMeshes.filter(m => m && !m.isDisposed()),
                    true,
                    true,
                    undefined,
                    false,
                    true
                );
                
                if (batchedFloors) {
                    batchedFloors.name = 'floors_batched';
                    batchedFloors.parent = this.mazeRoot;
                    batchedFloors.isPickable = false;
                    batchedFloors.doNotSyncBoundingInfo = true;
                    batchedFloors.receiveShadows = true;
                    
                    this.floorMeshes = [batchedFloors];
                }
            } catch (e) {
                console.warn('Floor batching failed, using individual meshes:', e);
            }
        }
        
        const endDrawCalls = this.wallMeshes.length + this.floorMeshes.length;
        console.log(`⚡ Batching: ${startDrawCalls} → ${endDrawCalls} draw calls (${Math.round((1 - endDrawCalls/startDrawCalls) * 100)}% reduction)`);
    }

    /**
     * Create a circular floor with quadrant coloring
     * Sprint 5: Supports external dungeon floor models with visual variety
     */
    private createQuadrantFloors(width: number, height: number): void {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Try to use external floor models if available
        if (this.useExternalModels && this.modelLoader?.hasFloorModel()) {
            console.log('🎮 Using external floor models with variety');
            
            // Create instances of floor tiles with visual variety
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (!isInsideCircle(x, y, width, height)) continue;
                    
                    const pos = new Vector3(
                        x * TILE_SIZE_3D + TILE_SIZE_3D / 2,
                        -0.02,
                        y * TILE_SIZE_3D + TILE_SIZE_3D / 2
                    );
                    
                    // Determine floor variant based on position
                    // - Grate floors near center
                    // - Cracked floors randomly scattered
                    // - Stone floors everywhere else
                    let floorVariant: 'stone' | 'grate' | 'cracked' = 'stone';
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );
                    
                    if (distFromCenter < 3) {
                        // Center area uses grate
                        floorVariant = 'grate';
                    } else if (Math.random() < 0.08) {
                        // 8% chance for cracked floors
                        floorVariant = 'cracked';
                    }
                    
                    const floorTemplate = this.modelLoader.getFloorTemplate(floorVariant);
                    if (floorTemplate) {
                        const instance = floorTemplate.createInstance(`floor_${x}_${y}`);
                        instance.position = pos;
                        instance.parent = this.mazeRoot;
                        this.floorMeshes.push(instance as unknown as Mesh);
                    }
                }
            }
            return;
        }
        
        // Create individual floor tiles only inside the circle (primitive fallback)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!isInsideCircle(x, y, width, height)) {
                    continue; // Skip tiles outside circle
                }
                
                const theme = getThemeForTile(x, y, width, height);
                const materials = this.quadrantMaterials.get(theme.name)!;
                
                const floor = MeshBuilder.CreateGround(`floor_${x}_${y}`, {
                    width: TILE_SIZE_3D,
                    height: TILE_SIZE_3D
                }, this.scene);
                
                floor.material = materials.floor;
                floor.position = new Vector3(
                    x * TILE_SIZE_3D + TILE_SIZE_3D / 2,
                    -0.02,
                    y * TILE_SIZE_3D + TILE_SIZE_3D / 2
                );
                floor.parent = this.mazeRoot;
                floor.receiveShadows = true;
                
                this.floorMeshes.push(floor);
            }
        }
    }

    private tileToWorldPos(tileX: number, tileY: number): Vector3 {
        return new Vector3(
            tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2,
            0,
            tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2
        );
    }

    /**
     * Determine wall segment type based on neighboring walls
     * Returns: 'straight', 'corner', 'end', or 'single' and rotation angle
     */
    private getWallOrientation(tileX: number, tileY: number): { type: 'straight' | 'corner' | 'end' | 'single'; rotation: number } {
        const isWall = (x: number, y: number): boolean => {
            if (x < 0 || y < 0 || x >= this.mazeWidth || y >= this.mazeHeight) return false;
            return this.tiles[y]?.[x] === TileType.WALL;
        };

        const north = isWall(tileX, tileY - 1);
        const south = isWall(tileX, tileY + 1);
        const east = isWall(tileX + 1, tileY);
        const west = isWall(tileX - 1, tileY);
        
        const neighbors = [north, south, east, west].filter(Boolean).length;

        // Single wall (no neighbors)
        if (neighbors === 0) {
            return { type: 'single', rotation: 0 };
        }

        // End piece (one neighbor)
        if (neighbors === 1) {
            if (north) return { type: 'end', rotation: 0 };
            if (south) return { type: 'end', rotation: Math.PI };
            if (east) return { type: 'end', rotation: Math.PI / 2 };
            if (west) return { type: 'end', rotation: -Math.PI / 2 };
        }

        // Straight piece (two opposite neighbors)
        if (neighbors === 2) {
            if (north && south) return { type: 'straight', rotation: 0 };
            if (east && west) return { type: 'straight', rotation: Math.PI / 2 };
            
            // Corner piece (two adjacent neighbors)
            if (north && east) return { type: 'corner', rotation: 0 };
            if (east && south) return { type: 'corner', rotation: Math.PI / 2 };
            if (south && west) return { type: 'corner', rotation: Math.PI };
            if (west && north) return { type: 'corner', rotation: -Math.PI / 2 };
        }

        // T-junction or cross (3+ neighbors) - use straight as fallback
        return { type: 'straight', rotation: north && south ? 0 : Math.PI / 2 };
    }

    /**
     * Create a wall with quadrant-specific styling
     * Only renders walls INSIDE the circular arena
     * SPRINT 2: Enhanced with rounded edges and metallic look (Yuki recommendation)
     * SPRINT 5: External model support with orientation detection
     */
    private createWall(tileX: number, tileY: number, pos: Vector3): void {
        // Skip walls outside the circular arena
        if (!isInsideCircle(tileX, tileY, this.mazeWidth, this.mazeHeight)) {
            return;
        }
        
        const theme = getThemeForTile(tileX, tileY, this.mazeWidth, this.mazeHeight);
        const materials = this.quadrantMaterials.get(theme.name)!;
        const isCross = isCrossDivider(tileX, tileY, this.mazeWidth, this.mazeHeight);
        
        // Get wall orientation for proper model selection
        const orientation = this.getWallOrientation(tileX, tileY);
        
        // Try to use external model if available
        if (this.useExternalModels && this.modelLoader?.hasWallModels()) {
            const wallMesh = this.modelLoader.createWallInstance(
                orientation.type === 'single' ? 'end' : orientation.type,
                pos,
                orientation.rotation
            );
            
            if (wallMesh) {
                wallMesh.parent = this.mazeRoot;
                this.wallMeshes.push(wallMesh);
                return;
            }
        }
        
        // Fallback to primitive box
        // Use biome-specific wall heights
        // Cross walls are always 1.5x the biome height
        const wallHeight = isCross 
            ? TILE_SIZE_3D * theme.wallHeight * 1.5 
            : TILE_SIZE_3D * theme.wallHeight;
        
        // Sprint 2: Slightly smaller walls with rounded appearance via subdivision
        const wallSize = TILE_SIZE_3D * 0.88; // Slightly more gap for cleaner grid
        
        const wall = MeshBuilder.CreateBox(`wall_${tileX}_${tileY}`, {
            width: wallSize,
            height: wallHeight,
            depth: wallSize
        }, this.scene);
        
        wall.material = materials.wall;
        wall.position = pos.clone();
        wall.position.y = wallHeight / 2;
        wall.parent = this.mazeRoot;
        
        // Sprint 2: Add subtle edge bevel scaling for softer look
        wall.scaling.set(1, 1, 1);
        wall.enableEdgesRendering();
        wall.edgesWidth = 1.5; // Subtle edge highlight
        wall.edgesColor = new Color4(0.4, 0.2, 0.6, 0.3); // Purple edge glow
        
        // Add glow to walls with biome-specific intensity
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(wall);
        }
        
        this.wallMeshes.push(wall);
    }

    /**
     * Create a pellet with quadrant-specific color
     */
    private createPellet(tileX: number, tileY: number, pos: Vector3): void {
        const materials = this.getMaterialsForTile(tileX, tileY);
        
        const pellet = MeshBuilder.CreateSphere(`pellet_${tileX}_${tileY}`, {
            diameter: TILE_SIZE_3D * 0.18,
            segments: 8
        }, this.scene);
        
        pellet.material = materials.pellet;
        pellet.position = pos.clone();
        pellet.position.y = TILE_SIZE_3D * 0.2;
        pellet.parent = this.mazeRoot;
        
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(pellet);
        }
        
        // Subtle floating animation
        this.addFloatAnimation(pellet, 0.05, 2);
        
        this.pelletMeshes.set(`${tileX}_${tileY}`, pellet);
    }

    /**
     * Create a power-up with unified visual style
     * Simplified animation (rotation only) - AI recommendation Dec 2025
     */
    private createPowerUp(tileX: number, tileY: number, pos: Vector3): void {
        const materials = this.getMaterialsForTile(tileX, tileY);
        
        // Create a more interesting shape - octahedron-like
        const powerUp = MeshBuilder.CreatePolyhedron(`powerUp_${tileX}_${tileY}`, {
            type: 1, // Octahedron
            size: TILE_SIZE_3D * 0.25
        }, this.scene);
        
        powerUp.material = materials.powerUp;
        powerUp.position = pos.clone();
        powerUp.position.y = TILE_SIZE_3D * 0.35;
        powerUp.parent = this.mazeRoot;
        
        if (this.glowLayer) {
            this.glowLayer.addIncludedOnlyMesh(powerUp);
        }
        
        // Simplified: rotation only (no pulse) - reduces visual noise
        this.addRotateAnimation(powerUp);
        
        this.powerUpMeshes.set(`${tileX}_${tileY}`, powerUp);
    }

    /**
     * Add floating animation
     */
    private addFloatAnimation(mesh: Mesh, amplitude: number, speed: number): void {
        const frameRate = 30;
        const animation = new Animation(
            'float',
            'position.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = mesh.position.y;
        const frames = Math.floor(60 / speed);
        
        animation.setKeys([
            { frame: 0, value: baseY },
            { frame: frames / 2, value: baseY + amplitude },
            { frame: frames, value: baseY }
        ]);
        
        mesh.animations.push(animation);
        this.scene.beginAnimation(mesh, 0, frames, true);
    }

    /**
     * Add pulsing scale animation
     */
    private addPulseAnimation(mesh: Mesh): void {
        const frameRate = 30;
        const animation = new Animation(
            'pulse',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        animation.setKeys([
            { frame: 0, value: new Vector3(1, 1, 1) },
            { frame: 15, value: new Vector3(1.3, 1.3, 1.3) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ]);
        
        mesh.animations.push(animation);
        
        // Float animation too
        const floatAnim = new Animation(
            'powerFloat',
            'position.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseY = mesh.position.y;
        floatAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 15, value: baseY + 0.15 },
            { frame: 30, value: baseY }
        ]);
        
        mesh.animations.push(floatAnim);
        this.scene.beginAnimation(mesh, 0, 30, true);
    }

    /**
     * Add rotation animation
     */
    private addRotateAnimation(mesh: Mesh): void {
        const frameRate = 30;
        const animation = new Animation(
            'rotate',
            'rotation.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        animation.setKeys([
            { frame: 0, value: 0 },
            { frame: 60, value: Math.PI * 2 }
        ]);
        
        mesh.animations.push(animation);
        this.scene.beginAnimation(mesh, 0, 60, true);
    }

    /**
     * Add decorative elements to each quadrant (only inside the circle)
     * Each biome gets its own unique decoration type
     * Sprint 5: Now uses external models (weeds, rocks, props, pillars) when available
     */
    private addQuadrantDecorations(width: number, height: number): void {
        const quadrants: Quadrant[] = ['NW', 'NE', 'SW', 'SE'];
        
        for (const quadrant of quadrants) {
            const theme = QUADRANT_THEMES[quadrant];
            const density = Math.floor(theme.decorDensity * 30); // Number of decorations
            
            if (density === 0) continue; // Skip if decorations disabled
            
            // Calculate quadrant bounds - place at EDGES of arena (outside gameplay path)
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 5;
            
            // Place decorations at the outer edge of the arena
            for (let i = 0; i < density; i++) {
                // Generate position near the edge of the circle
                const angle = Math.random() * Math.PI * 2;
                const edgeDistance = radius - 2 + Math.random() * 3; // Near edge
                
                const x = Math.floor(centerX + Math.cos(angle) * edgeDistance);
                const y = Math.floor(centerY + Math.sin(angle) * edgeDistance);
                
                // Skip if on a wall tile
                if (this.tiles[y]?.[x] === TileType.WALL) continue;
                
                // Only place if inside circle but near edge
                if (isInsideCircle(x, y, width, height)) {
                    const pos = new Vector3(
                        x * TILE_SIZE_3D + TILE_SIZE_3D / 2 + (Math.random() - 0.5) * 0.3,
                        0,
                        y * TILE_SIZE_3D + TILE_SIZE_3D / 2 + (Math.random() - 0.5) * 0.3
                    );
                    this.createBiomeDecoration(pos, theme);
                }
            }
        }
        
        // Add corner pillars at arena edges
        this.addCornerPillars(width, height);
        
        // Add wall props (torches, chains) near walls
        this.addWallProps(width, height);
    }

    /**
     * Add corner pillars at the arena edges using external models
     */
    private addCornerPillars(width: number, height: number): void {
        if (!this.useExternalModels || !this.modelLoader?.hasPillarModels()) return;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 3;
        
        // Place pillars at cardinal directions
        const angles = [0, Math.PI/2, Math.PI, Math.PI*1.5];
        
        for (const angle of angles) {
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const pos = new Vector3(
                x * TILE_SIZE_3D,
                0,
                y * TILE_SIZE_3D
            );
            
            const pillars = this.modelLoader.createPillarInstance('corner', pos, angle, 0.5);
            pillars.forEach(mesh => {
                mesh.parent = this.mazeRoot;
            });
        }
    }

    /**
     * Add wall-mounted props (torches, chains) near walls
     */
    private addWallProps(width: number, height: number): void {
        if (!this.useExternalModels || !this.modelLoader?.hasPropModels()) return;
        
        let torchCount = 0;
        const maxTorches = 20; // Limit for performance
        
        // Find wall tiles and add props
        for (let y = 0; y < height && torchCount < maxTorches; y++) {
            for (let x = 0; x < width && torchCount < maxTorches; x++) {
                if (this.tiles[y]?.[x] !== TileType.WALL) continue;
                if (!isInsideCircle(x, y, width, height)) continue;
                
                // Only place on some walls (randomize)
                if (Math.random() > 0.15) continue;
                
                const pos = new Vector3(
                    x * TILE_SIZE_3D + TILE_SIZE_3D / 2,
                    1.2, // Wall height
                    y * TILE_SIZE_3D + TILE_SIZE_3D / 2
                );
                
                // Alternate between torches and chains
                const propType = Math.random() > 0.5 ? 'torch' : 'chains';
                const prop = this.modelLoader.createPropInstance(
                    propType as 'torch' | 'chains',
                    pos,
                    Math.random() * Math.PI * 2,
                    0.4
                );
                
                if (prop) {
                    prop.parent = this.mazeRoot;
                    torchCount++;
                }
            }
        }
        
        console.log(`🔥 Added ${torchCount} wall props`);
    }

    /**
     * Create biome-specific decoration based on type
     * Sprint 5: Uses external models when available, falls back to primitives
     */
    private createBiomeDecoration(pos: Vector3, theme: QuadrantTheme): void {
        // Try to use external model first
        if (this.useExternalModels && this.modelLoader) {
            // Choose decoration type based on biome
            let decorType: 'weed' | 'rock' | 'ivy' = 'rock';
            let useProps = false;
            
            switch (theme.decorationType) {
                case 'grass':
                case 'trees':
                    decorType = Math.random() > 0.3 ? 'weed' : 'ivy';
                    break;
                case 'rocks':
                case 'deadtrees':
                    decorType = 'rock';
                    useProps = Math.random() > 0.7; // 30% chance for props
                    break;
                default:
                    decorType = Math.random() > 0.5 ? 'weed' : 'rock';
            }
            
            // Try props first for rocky areas
            if (useProps && this.modelLoader.hasPropModels()) {
                const propType = Math.random() > 0.5 ? 'barrel' : 'crate';
                const instance = this.modelLoader.createPropInstance(
                    propType,
                    pos,
                    Math.random() * Math.PI * 2,
                    0.3 + Math.random() * 0.3
                );
                if (instance) {
                    instance.parent = this.mazeRoot;
                    return;
                }
            }
            
            // Try decorations (weeds, rocks, ivy)
            if (this.modelLoader.hasDecorationModels()) {
                const scale = 0.3 + Math.random() * 0.4;
                const instance = this.modelLoader.createDecorationInstance(decorType, pos, scale);
                
                if (instance) {
                    instance.parent = this.mazeRoot;
                    return;
                }
            }
        }
        
        // Fallback to primitive meshes
        let mesh: Mesh;
        
        switch (theme.decorationType) {
            case 'trees':
                // Forest: tall tree-like cylinders
                mesh = MeshBuilder.CreateCylinder(`deco_tree_${pos.x}_${pos.z}`, {
                    height: 2.5 + Math.random(),
                    diameterTop: 0.1,
                    diameterBottom: 0.4 + Math.random() * 0.2,
                    tessellation: 8
                }, this.scene);
                break;
                
            case 'grass':
                // Plains: low grass clumps (cones)
                mesh = MeshBuilder.CreateCylinder(`deco_grass_${pos.x}_${pos.z}`, {
                    height: 0.3 + Math.random() * 0.3,
                    diameterTop: 0.05,
                    diameterBottom: 0.15 + Math.random() * 0.1,
                    tessellation: 6
                }, this.scene);
                break;
                
            case 'rocks':
                // Canyon: angular rock formations
                mesh = MeshBuilder.CreatePolyhedron(`deco_rock_${pos.x}_${pos.z}`, {
                    type: 2, // Icosahedron
                    size: 0.3 + Math.random() * 0.4
                }, this.scene);
                mesh.scaling = new Vector3(
                    0.8 + Math.random() * 0.4,
                    0.5 + Math.random() * 0.5,
                    0.8 + Math.random() * 0.4
                );
                break;
                
            case 'deadtrees':
                // Tundra: sparse dead tree stumps
                mesh = MeshBuilder.CreateCylinder(`deco_dead_${pos.x}_${pos.z}`, {
                    height: 0.8 + Math.random() * 0.5,
                    diameterTop: 0.15,
                    diameterBottom: 0.3,
                    tessellation: 5
                }, this.scene);
                // Tilt slightly for dead tree effect
                mesh.rotation.x = (Math.random() - 0.5) * 0.3;
                mesh.rotation.z = (Math.random() - 0.5) * 0.3;
                break;
                
            default:
                // Default pillar
                mesh = MeshBuilder.CreateCylinder(`deco_${pos.x}_${pos.z}`, {
                    height: 1.5,
                    diameterTop: 0.2,
                    diameterBottom: 0.4,
                    tessellation: 6
                }, this.scene);
        }
        
        const mat = new StandardMaterial(`deco_mat_${pos.x}_${pos.z}`, this.scene);
        mat.diffuseColor = theme.decorPrimary;
        mat.emissiveColor = theme.decorEmissive;
        mat.specularColor = theme.decorSecondary;
        mat.alpha = 0.9;
        
        mesh.material = mat;
        mesh.position = pos.clone();
        mesh.position.y = mesh.getBoundingInfo().boundingBox.maximumWorld.y / 2;
        mesh.parent = this.mazeRoot;
        
        if (this.glowLayer && theme.glowIntensity > 0.5) {
            this.glowLayer.addIncludedOnlyMesh(mesh);
        }
    }

    /**
     * Remove a pellet at the given tile coordinates
     * Sprint 4: Supports both individual meshes and thin instances
     */
    removePellet(tileX: number, tileY: number): void {
        const key = `${tileX}_${tileY}`;
        
        // Sprint 4: Handle thin instancing
        if (this.usePelletInstancing && this.pelletBaseMesh && this.pelletMatrices) {
            const instanceIndex = this.pelletPositions.get(key);
            if (instanceIndex !== undefined) {
                // Set scale to 0 to hide (more efficient than removing)
                const matrix = Matrix.Compose(
                    new Vector3(0, 0, 0), // Scale to 0 = invisible
                    Quaternion.Identity(),
                    Vector3.Zero()
                );
                matrix.copyToArray(this.pelletMatrices, instanceIndex * 16);
                this.pelletBaseMesh.thinInstanceSetMatrixAt(instanceIndex, matrix, true);
            }
            return;
        }
        
        // Fallback: individual meshes
        const pellet = this.pelletMeshes.get(key);
        if (pellet) {
            pellet.dispose();
            this.pelletMeshes.delete(key);
        }
    }

    /**
     * Remove a power-up at the given tile coordinates
     */
    removePowerUp(tileX: number, tileY: number): void {
        const key = `${tileX}_${tileY}`;
        const powerUp = this.powerUpMeshes.get(key);
        if (powerUp) {
            powerUp.dispose();
            this.powerUpMeshes.delete(key);
        }
    }

    /**
     * Get the center of the maze in world coordinates
     */
    getCenter(width: number, height: number): Vector3 {
        return new Vector3(
            (width * TILE_SIZE_3D) / 2,
            0,
            (height * TILE_SIZE_3D) / 2
        );
    }

    /**
     * Get all wall meshes (for dynamic maze registration)
     */
    getWallMeshes(): Mesh[] {
        return this.wallMeshes;
    }

    /**
     * Clear all maze geometry
     */
    clear(): void {
        this.wallMeshes.forEach(m => m.dispose());
        this.wallMeshes = [];
        
        this.floorMeshes.forEach(m => m.dispose());
        this.floorMeshes = [];
        
        this.pelletMeshes.forEach(m => m.dispose());
        this.pelletMeshes.clear();
        
        this.powerUpMeshes.forEach(m => m.dispose());
        this.powerUpMeshes.clear();
        
        // Sprint 4: Clear instancing data
        if (this.pelletBaseMesh) {
            this.pelletBaseMesh.dispose();
            this.pelletBaseMesh = null;
        }
        this.pelletPositions.clear();
        this.pelletMatrices = null;
        this.usePelletInstancing = false;
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.clear();
        this.quadrantMaterials.forEach(mats => {
            mats.wall.dispose();
            mats.floor.dispose();
            mats.pellet.dispose();
            mats.powerUp.dispose();
        });
        this.quadrantMaterials.clear();
        this.mazeRoot.dispose();
    }
}
