/**
 * Game3DScene - Main 3D game scene that integrates all 3D components
 * 
 * Sprint 4: Performance optimizations integrated
 * - MasterPerformanceController for device-adaptive quality
 * - Mesh batching and thin instancing
 * - Draw call reduction
 */

import { GameEngine } from './engine';
import { Maze3D, TileType, type MazeConfig } from './maze';
import { Player3D, type SpriteType3D } from './player';
import { loadTiledMap, gameToWorld3D, SPAWN_POSITIONS } from './tilemap-loader';
import { ParticleManager } from './particles';
import { EntityRenderer } from './entities';
import { ZoneRenderer, type TimePhase } from './zones';
import { DynamicMaze } from './dynamicMaze';
import { Scenery3D } from './scenery';
import { Minimap3D, ScorePopup } from './minimap';
import { MasterPerformanceController, detectDeviceTier, getPerformanceSettings } from '../game/performanceOptimizer';
import { MeshBatcher } from './mesh-batcher';
import { detectMobileCapabilities, applyMobileOptimizations, AdaptiveQualityManager } from './mobile-optimizations';
import type { Zone, MazeUpdate, DangerEntityData, DynamicState } from '../game/connection';

// Phaser tile size in pixels
const PHASER_TILE_SIZE = 50;

export interface GameState3D {
    players: Map<string, Player3D>;
    maze: Maze3D;
    isRunning: boolean;
    mazeWidth: number;
    mazeHeight: number;
}

export class Game3DScene {
    private engine: GameEngine;
    private maze: Maze3D;
    private players: Map<string, Player3D> = new Map();
    private particles: ParticleManager;
    private lastTime: number = 0;
    private mazeWidth: number = 0;
    private mazeHeight: number = 0;
    private followPlayerId: string | null = null;
    private isRunning: boolean = false;
    
    // Dynamic game systems
    private entityRenderer: EntityRenderer;
    private zoneRenderer: ZoneRenderer;
    private dynamicMaze: DynamicMaze;
    
    // Scenery and environment
    private scenery: Scenery3D;
    private wallPositions: Set<string> = new Set();
    
    // HUD elements
    private minimap: Minimap3D | null = null;
    private scorePopup: ScorePopup;
    private mazeConfig: MazeConfig | null = null;
    
    // Sprint 4: Performance optimization systems
    private performanceController: MasterPerformanceController | null = null;
    private meshBatcher: MeshBatcher | null = null;
    private adaptiveQuality: AdaptiveQualityManager | null = null;
    private debugOverlayEnabled: boolean = false;
    private debugOverlay: HTMLDivElement | null = null;

    constructor(canvas: HTMLCanvasElement) {
        // Check WebGL support
        if (!GameEngine.isSupported()) {
            throw new Error('WebGL is not supported in this browser');
        }

        this.engine = new GameEngine({ canvas, antialias: true });
        this.maze = new Maze3D(this.engine.babylonScene);
        this.particles = new ParticleManager(this.engine.babylonScene);
        
        // Initialize dynamic game systems
        this.entityRenderer = new EntityRenderer(this.engine.babylonScene, this.maze.getGlowLayer());
        this.zoneRenderer = new ZoneRenderer(this.engine.babylonScene);
        this.dynamicMaze = new DynamicMaze(this.engine.babylonScene);
        
        // Initialize scenery with consistent cyber_arcade theme (unified Dec 2025)
        this.scenery = new Scenery3D(this.engine.babylonScene, 'cyber_arcade');
        
        // Initialize score popup
        this.scorePopup = new ScorePopup();
        
        // Sprint 4: Initialize performance optimization systems
        this.initializePerformanceSystems();
    }
    
    /**
     * Sprint 4: Initialize all performance optimization systems
     */
    private initializePerformanceSystems(): void {
        const scene = this.engine.babylonScene;
        
        // Initialize MasterPerformanceController
        this.performanceController = new MasterPerformanceController(scene);
        
        // Initialize mesh batcher for draw call reduction
        this.meshBatcher = new MeshBatcher(scene, {
            maxMeshesPerBatch: 500,
            enableInstancing: true,
            enableMerging: true
        });
        
        // Initialize adaptive quality for mobile
        const mobileConfig = detectMobileCapabilities();
        applyMobileOptimizations(scene, mobileConfig);
        this.adaptiveQuality = new AdaptiveQualityManager(scene, mobileConfig);
        
        // Set up quality change callback
        this.adaptiveQuality.setOnQualityChange((level) => {
            console.log(`🎮 Quality auto-adjusted to: ${level}`);
            if (level === 'low') {
                // Reduce particle effects
                this.particles?.setQuality(0.25);
            } else if (level === 'medium') {
                this.particles?.setQuality(0.5);
            }
        });
        
        // Apply initial optimizations
        this.performanceController.initialize().catch(err => {
            console.warn('Performance initialization warning:', err);
        });
        
        const tier = detectDeviceTier();
        console.log(`🎮 Performance tier: ${tier}, Mobile: ${mobileConfig.isLowPowerDevice}`);
    }

    /**
     * Load the real game map from Tiled JSON (legacy - use loadFromServerData for dynamic maps)
     */
    async loadRealMap(mapUrl: string = '/gassets/map.json'): Promise<void> {
        // First check if we have server-provided maze data
        const serverData = localStorage.getItem('serverMazeData');
        if (serverData) {
            try {
                const mazeData = JSON.parse(serverData);
                console.log('Using server-provided maze data:', mazeData.width, 'x', mazeData.height);
                this.loadFromServerData(mazeData);
                return;
            } catch (e) {
                console.warn('Failed to parse server maze data, falling back to file:', e);
            }
        }
        
        // Fallback to loading from file
        const config = await loadTiledMap(mapUrl);
        this.loadFromMazeConfig(config);
    }
    
    /**
     * Load maze directly from server-provided data
     * This is the preferred method - no static JSON files needed
     */
    loadFromServerData(mazeData: { width: number; height: number; tiles: number[][] }): void {
        // Server sends tiles in same format as MazeConfig
        const config: MazeConfig = {
            width: mazeData.width,
            height: mazeData.height,
            tiles: mazeData.tiles
        };
        this.loadFromMazeConfig(config);
    }
    
    /**
     * Internal method to build maze from config
     */
    private loadFromMazeConfig(config: MazeConfig): void {
        this.mazeWidth = config.width;
        this.mazeHeight = config.height;
        this.mazeConfig = config;
        
        // Track wall positions for scenery placement
        for (let y = 0; y < config.height; y++) {
            for (let x = 0; x < config.width; x++) {
                if (config.tiles[y]?.[x] === TileType.WALL) {
                    this.wallPositions.add(`${x}_${y}`);
                }
            }
        }
        
        this.buildMaze(config);
        
        // Register existing walls with dynamic maze system for collision tracking
        const wallMeshes = this.maze.getWallMeshes();
        this.dynamicMaze.registerExistingWalls(wallMeshes);
        
        // Skip scenery for large maps to improve performance
        if (config.width <= 50) {
            this.scenery.populateMazeEdges(config.width, config.height, this.wallPositions);
        }
        
        // Initialize minimap with larger size for bigger maps
        const minimapSize = config.width > 100 ? 200 : 150;
        this.minimap = new Minimap3D({ size: minimapSize, x: 20, y: 200 });
        this.minimap.setMaze(config);
        
        // Don't focus on center - will focus on player's quadrant when setFollowPlayer is called
    }

    /**
     * Initialize players at their spawn positions
     */
    initPlayers(): void {
        // Add all 4 players at spawn positions
        const sprites: SpriteType3D[] = ['runner', 'ch0', 'ch1', 'ch2'];
        
        for (const spriteType of sprites) {
            const spawnPos = SPAWN_POSITIONS[spriteType];
            const pos3D = gameToWorld3D(spawnPos.x, spawnPos.y, PHASER_TILE_SIZE);
            this.addPlayer(spriteType, spriteType, pos3D.x, pos3D.z);
        }
    }

    /**
     * Set which player the camera should follow (THIRD-PERSON!)
     */
    setFollowPlayer(playerId: string): void {
        this.followPlayerId = playerId;
        
        // Get the player and attach camera to their mesh
        const player = this.players.get(playerId);
        if (player) {
            const mesh = player.getMesh();
            if (mesh) {
                this.engine.setFollowTarget(mesh);
                console.log(`🎥 Camera now following: ${playerId}`);
            }
        }
    }

    /**
     * Initialize with a demo maze (for testing)
     */
    initDemoMaze(): void {
        // Create a simple test maze
        const width = 20;
        const height = 15;
        const tiles: number[][] = [];

        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                // Border walls
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    tiles[y][x] = TileType.WALL;
                }
                // Some internal walls
                else if ((x % 4 === 0 && y % 3 !== 0) || (y % 4 === 0 && x % 3 !== 0)) {
                    tiles[y][x] = TileType.WALL;
                }
                // Power-ups at corners
                else if ((x === 2 && y === 2) || (x === width - 3 && y === 2) ||
                         (x === 2 && y === height - 3) || (x === width - 3 && y === height - 3)) {
                    tiles[y][x] = TileType.POWER_UP;
                }
                // Pellets everywhere else
                else {
                    tiles[y][x] = TileType.PELLET;
                }
            }
        }

        this.buildMaze({ width, height, tiles });

        // Focus camera on maze center
        this.engine.focusOn(width / 2, height / 2);
    }

    /**
     * Build maze from config
     */
    buildMaze(config: MazeConfig): void {
        this.maze.buildFromTilemap(config);
    }

    /**
     * Add a player to the scene
     */
    addPlayer(id: string, spriteType: SpriteType3D, startX: number, startY: number): Player3D {
        const player = new Player3D(this.engine.babylonScene, spriteType, startX, startY);
        this.players.set(id, player);
        return player;
    }

    /**
     * Remove a player from the scene
     */
    removePlayer(id: string): void {
        const player = this.players.get(id);
        if (player) {
            player.dispose();
            this.players.delete(id);
        }
    }

    /**
     * Get a player by ID
     */
    getPlayer(id: string): Player3D | undefined {
        return this.players.get(id);
    }

    /**
     * Update a player's position
     */
    updatePlayerPosition(id: string, tileX: number, tileY: number): void {
        const player = this.players.get(id);
        if (player) {
            player.moveTo(tileX, tileY);
        }
    }

    /**
     * Update a player's position from pixel coordinates (Phaser game coordinates)
     */
    updatePlayerPositionPixels(id: string, pixelX: number, pixelY: number): void {
        const player = this.players.get(id);
        if (player) {
            const pos3D = gameToWorld3D(pixelX, pixelY, PHASER_TILE_SIZE);
            player.setPosition(pos3D.x, pos3D.z);
            
            // Update minimap
            if (this.minimap) {
                this.minimap.updatePlayer(id, pos3D.x, pos3D.z);
            }
        }
    }

    /**
     * Remove a pellet
     */
    removePellet(tileX: number, tileY: number): void {
        this.maze.removePellet(tileX, tileY);
        this.particles.createPelletEatEffect(tileX, tileY);
        
        // Update minimap
        if (this.minimap) {
            this.minimap.removePellet(tileX, tileY);
        }
        
        // Show score popup
        this.showScoreAt(10, tileX, tileY);
    }

    /**
     * Remove a power-up
     */
    removePowerUp(tileX: number, tileY: number): void {
        this.maze.removePowerUp(tileX, tileY);
        this.particles.createPowerUpEatEffect(tileX, tileY);
        
        // Update minimap
        if (this.minimap) {
            this.minimap.removePowerUp(tileX, tileY);
        }
        
        // Show score popup
        this.showScoreAt(50, tileX, tileY, '#00ffff');
    }
    
    /**
     * Show a score popup at world position
     */
    private showScoreAt(score: number, tileX: number, tileY: number, color: string = '#00ffc7'): void {
        // Convert tile to screen position
        const worldX = tileX + 0.5;
        const worldY = 1;
        const worldZ = tileY + 0.5;
        
        this.scorePopup.showAtWorldPos(
            score,
            worldX,
            worldY,
            worldZ,
            this.engine.mainCamera,
            this.engine.babylonScene
        );
    }

    /**
     * Set power-up state for runner and chasers
     */
    setRunnerPoweredUp(powered: boolean): void {
        const runner = this.players.get('runner');
        if (runner) {
            runner.setPoweredUp(powered);
        }
        
        // Set chasers to scared mode
        this.setChasersScared(powered);
    }

    /**
     * Set scared state for all chasers
     */
    setChasersScared(scared: boolean): void {
        ['ch0', 'ch1', 'ch2'].forEach(id => {
            const chaser = this.players.get(id);
            if (chaser) {
                chaser.setScared(scared);
            }
        });
    }

    /**
     * Hide/destroy a player (when caught)
     */
    hidePlayer(playerId: string): void {
        const player = this.players.get(playerId);
        if (player) {
            const pos = player.getPosition();
            this.particles.createPlayerCaughtEffect(pos.x, pos.y, pos.z);
            player.setVisible(false);
        }
    }

    /**
     * Set a player's display name
     */
    setPlayerName(playerId: string, name: string): void {
        const player = this.players.get(playerId);
        if (player) {
            player.setName(name);
        }
    }

    // ========================================
    // Dynamic Game Systems
    // ========================================

    /**
     * Initialize dynamic state from server
     */
    initDynamicState(state: DynamicState): void {
        console.log('Initializing dynamic state:', state);
        
        // Initialize zones
        if (state.zones?.zones) {
            this.zoneRenderer.createZones(state.zones.zones);
        }
        
        // Set initial phase
        if (state.zones?.phase) {
            this.zoneRenderer.setPhase(state.zones.phase as TimePhase);
        }
        
        // Initialize entities
        if (state.entities) {
            this.entityRenderer.updateEntities(state.entities);
        }
    }

    /**
     * Handle phase change event
     */
    onPhaseChange(phase: string, zones: Zone[]): void {
        this.zoneRenderer.setPhase(phase as TimePhase, zones);
    }

    /**
     * Handle phase progress update
     */
    onPhaseUpdate(phase: string, progress: number): void {
        this.zoneRenderer.updatePhaseProgress(phase as TimePhase, progress);
    }

    /**
     * Handle maze update event
     */
    onMazeUpdate(update: MazeUpdate): void {
        this.dynamicMaze.handleMazeUpdate(update);
    }

    /**
     * Handle entities update
     */
    onEntitiesUpdate(entities: DangerEntityData[]): void {
        this.entityRenderer.updateEntities(entities);
    }

    /**
     * Get entity near player position (for collision warning)
     */
    getEntityNearPlayer(playerId: string): DangerEntityData | null {
        const player = this.players.get(playerId);
        if (!player) return null;
        
        const pos = player.getPosition();
        return this.entityRenderer.getEntityNear(pos.x, pos.z);
    }

    /**
     * Check if player is in safe zone
     */
    isPlayerInSafeZone(playerId: string): boolean {
        const player = this.players.get(playerId);
        if (!player) return false;
        
        const pos = player.getPosition();
        return this.zoneRenderer.isInSafeZone(pos.x, pos.z);
    }

    /**
     * Get current zone for player
     */
    getPlayerZone(playerId: string): Zone | null {
        const player = this.players.get(playerId);
        if (!player) return null;
        
        const pos = player.getPosition();
        return this.zoneRenderer.getZoneAt(pos.x, pos.z);
    }

    /**
     * Get current time phase
     */
    getCurrentPhase(): TimePhase {
        return this.zoneRenderer.getCurrentPhase();
    }

    /**
     * Check if there's a dynamic wall at position
     */
    hasDynamicWallAt(x: number, z: number): boolean {
        return this.dynamicMaze.hasWallAt(x, z);
    }

    /**
     * Start the game loop
     */
    start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        // Custom update loop that runs before render
        this.engine.babylonScene.registerBeforeRender(() => {
            const now = performance.now();
            const deltaTime = (now - this.lastTime) / 1000; // Convert to seconds
            this.lastTime = now;

            // Update all players
            this.players.forEach(player => {
                player.update(deltaTime);
            });

            // Update camera follow
            if (this.followPlayerId) {
                const followPlayer = this.players.get(this.followPlayerId);
                if (followPlayer) {
                    const pos = followPlayer.getPosition();
                    this.engine.followTarget(pos.x, pos.z);
                }
            }
            this.engine.updateCameraFollow(deltaTime);
        });

        this.engine.start();
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        this.engine.stop();
    }

    /**
     * Pause rendering (for tab switching / visibility change)
     */
    pauseRendering(): void {
        this.engine.stop();
        console.log('Rendering paused');
    }

    /**
     * Resume rendering (when tab becomes visible again)
     */
    resumeRendering(): void {
        if (this.isRunning) {
            this.engine.start();
            console.log('Rendering resumed');
        }
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.isRunning = false;
        this.players.forEach(player => player.dispose());
        this.players.clear();
        this.maze.dispose();
        this.entityRenderer.dispose();
        this.zoneRenderer.dispose();
        this.dynamicMaze.dispose();
        this.scenery.dispose();
        if (this.minimap) {
            this.minimap.dispose();
        }
        this.scorePopup.dispose();
        
        // Sprint 4: Dispose performance systems
        if (this.performanceController) {
            this.performanceController.dispose();
        }
        if (this.debugOverlay) {
            this.debugOverlay.remove();
            this.debugOverlay = null;
        }
        
        this.engine.dispose();
        console.log('Game3DScene disposed');
    }
    
    /**
     * Sprint 4: Toggle debug overlay showing FPS and draw calls
     */
    toggleDebugOverlay(enabled?: boolean): void {
        this.debugOverlayEnabled = enabled ?? !this.debugOverlayEnabled;
        
        if (this.debugOverlayEnabled && !this.debugOverlay) {
            this.debugOverlay = document.createElement('div');
            this.debugOverlay.id = 'perf-debug-overlay';
            this.debugOverlay.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                font-family: monospace;
                font-size: 12px;
                padding: 10px;
                border-radius: 8px;
                z-index: 10000;
                pointer-events: none;
                min-width: 180px;
            `;
            document.body.appendChild(this.debugOverlay);
            
            // Start updating overlay
            this.updateDebugOverlay();
        } else if (!this.debugOverlayEnabled && this.debugOverlay) {
            this.debugOverlay.remove();
            this.debugOverlay = null;
        }
    }
    
    private updateDebugOverlay(): void {
        if (!this.debugOverlay || !this.debugOverlayEnabled) return;
        
        const stats = this.getPerformanceStats();
        
        const fpsColor = stats.fps >= 50 ? '#0f0' : stats.fps >= 30 ? '#ff0' : '#f00';
        const drawColor = stats.drawCalls <= 100 ? '#0f0' : stats.drawCalls <= 200 ? '#ff0' : '#f00';
        
        this.debugOverlay.innerHTML = `
            <div style="color: #88f; font-weight: bold; margin-bottom: 5px;">⚡ Performance</div>
            <div>FPS: <span style="color: ${fpsColor}">${stats.fps.toFixed(1)}</span></div>
            <div>Draw Calls: <span style="color: ${drawColor}">${stats.drawCalls}</span></div>
            <div>Meshes: ${stats.meshCount}</div>
            <div>Textures: ${stats.textureCount}</div>
            <div style="color: #888; font-size: 10px; margin-top: 5px;">Tier: ${stats.tier}</div>
        `;
        
        // Schedule next update
        requestAnimationFrame(() => this.updateDebugOverlay());
    }
    
    /**
     * Sprint 4: Get current performance statistics
     */
    getPerformanceStats(): {
        tier: string;
        fps: number;
        drawCalls: number;
        meshCount: number;
        textureCount: number;
    } {
        if (this.performanceController) {
            return this.performanceController.getStats();
        }
        
        // Fallback if controller not initialized
        const scene = this.engine.babylonScene;
        return {
            tier: detectDeviceTier(),
            fps: scene.getEngine().getFps(),
            drawCalls: (scene.getEngine() as any)._drawCalls?.current ?? 0,
            meshCount: scene.meshes.length,
            textureCount: scene.textures.length
        };
    }

    /**
     * Get the underlying engine
     */
    getEngine(): GameEngine {
        return this.engine;
    }
}

// Export all modules
export { GameEngine } from './engine';
export { Maze3D, TileType, TILE_SIZE_3D } from './maze';
export { Player3D } from './player';
export { loadTiledMap, gameToWorld3D, worldToTile, tileToWorld, SPAWN_POSITIONS } from './tilemap-loader';
export { Minimap3D, ScorePopup } from './minimap';
export type { SpriteType3D } from './player';
export type { MazeConfig } from './maze';
export type { SpriteId } from './tilemap-loader';
