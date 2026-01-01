/**
 * Minimap3D - HUD minimap showing player positions
 * 
 * Renders a top-down view of the maze with player indicators
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Color4,
    Vector3,
    Mesh,
    DynamicTexture,
    TransformNode,
    ArcRotateCamera
} from '@babylonjs/core';
import { TILE_SIZE_3D, TileType, type MazeConfig } from './maze';

export interface MinimapConfig {
    size: number;  // Size in pixels
    x: number;     // X position on screen
    y: number;     // Y position on screen
}

export class Minimap3D {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private mazeWidth: number = 0;
    private mazeHeight: number = 0;
    private tiles: number[][] = [];
    private players: Map<string, { x: number; z: number; color: string }> = new Map();
    private config: MinimapConfig;
    private animationId: number | null = null;

    // Colors
    private readonly WALL_COLOR = '#1a1a3a';
    private readonly FLOOR_COLOR = '#0a0a15';
    private readonly PELLET_COLOR = '#ffd700';
    private readonly POWERUP_COLOR = '#00ffff';
    private readonly RUNNER_COLOR = '#ffff00';
    private readonly CHASER_COLORS = ['#ff3333', '#3366ff', '#ff66cc'];
    private readonly BORDER_COLOR = '#00ffc7';
    private readonly BG_COLOR = 'rgba(0, 0, 0, 0.7)';

    constructor(config: MinimapConfig = { size: 150, x: 20, y: 200 }) {
        this.config = config;
        
        // Create canvas for minimap
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap-canvas';
        this.canvas.width = config.size;
        this.canvas.height = config.size;
        this.canvas.style.cssText = `
            position: fixed;
            left: ${config.x}px;
            top: ${config.y}px;
            border: 2px solid ${this.BORDER_COLOR};
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 0 10px rgba(0, 255, 199, 0.3);
        `;
        
        this.ctx = this.canvas.getContext('2d')!;
        document.body.appendChild(this.canvas);
        
        this.startRenderLoop();
    }

    /**
     * Set the maze data for rendering
     */
    setMaze(config: MazeConfig): void {
        this.mazeWidth = config.width;
        this.mazeHeight = config.height;
        this.tiles = config.tiles;
    }

    /**
     * Update a player's position
     */
    updatePlayer(id: string, worldX: number, worldZ: number): void {
        // Convert world position to tile position
        const tileX = worldX / TILE_SIZE_3D;
        const tileZ = worldZ / TILE_SIZE_3D;
        
        let color: string;
        if (id === 'runner') {
            color = this.RUNNER_COLOR;
        } else if (id === 'ch0') {
            color = this.CHASER_COLORS[0];
        } else if (id === 'ch1') {
            color = this.CHASER_COLORS[1];
        } else if (id === 'ch2') {
            color = this.CHASER_COLORS[2];
        } else {
            color = '#ffffff';
        }
        
        this.players.set(id, { x: tileX, z: tileZ, color });
    }

    /**
     * Remove a player from the minimap
     */
    removePlayer(id: string): void {
        this.players.delete(id);
    }

    /**
     * Mark a pellet as eaten
     */
    removePellet(tileX: number, tileY: number): void {
        if (this.tiles[tileY] && this.tiles[tileY][tileX] === TileType.PELLET) {
            this.tiles[tileY][tileX] = TileType.FLOOR;
        }
    }

    /**
     * Mark a power-up as eaten
     */
    removePowerUp(tileX: number, tileY: number): void {
        if (this.tiles[tileY] && this.tiles[tileY][tileX] === TileType.POWER_UP) {
            this.tiles[tileY][tileX] = TileType.FLOOR;
        }
    }

    /**
     * Start the render loop
     */
    private startRenderLoop(): void {
        const render = () => {
            this.render();
            this.animationId = requestAnimationFrame(render);
        };
        this.animationId = requestAnimationFrame(render);
    }

    /**
     * Render the minimap
     */
    private render(): void {
        if (this.mazeWidth === 0 || this.mazeHeight === 0) return;
        
        const ctx = this.ctx;
        const size = this.config.size;
        
        // Clear
        ctx.fillStyle = this.BG_COLOR;
        ctx.fillRect(0, 0, size, size);
        
        // Calculate scale to fit maze in minimap
        const scaleX = size / this.mazeWidth;
        const scaleY = size / this.mazeHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Center the maze
        const offsetX = (size - this.mazeWidth * scale) / 2;
        const offsetY = (size - this.mazeHeight * scale) / 2;
        
        // Draw maze tiles
        for (let y = 0; y < this.mazeHeight; y++) {
            for (let x = 0; x < this.mazeWidth; x++) {
                const tile = this.tiles[y]?.[x] ?? TileType.FLOOR;
                
                const drawX = offsetX + x * scale;
                const drawY = offsetY + y * scale;
                
                switch (tile) {
                    case TileType.WALL:
                        ctx.fillStyle = this.WALL_COLOR;
                        ctx.fillRect(drawX, drawY, scale, scale);
                        break;
                    case TileType.PELLET:
                        // Small dot for pellet
                        ctx.fillStyle = this.PELLET_COLOR;
                        ctx.beginPath();
                        ctx.arc(drawX + scale/2, drawY + scale/2, scale * 0.15, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case TileType.POWER_UP:
                        // Larger dot for power-up
                        ctx.fillStyle = this.POWERUP_COLOR;
                        ctx.beginPath();
                        ctx.arc(drawX + scale/2, drawY + scale/2, scale * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                }
            }
        }
        
        // Draw players
        const playerSize = Math.max(4, scale * 0.8);
        this.players.forEach((player, id) => {
            const drawX = offsetX + player.x * scale;
            const drawY = offsetY + player.z * scale;
            
            // Glow effect
            ctx.shadowColor = player.color;
            ctx.shadowBlur = 5;
            
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(drawX, drawY, playerSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
        });
    }

    /**
     * Toggle visibility
     */
    setVisible(visible: boolean): void {
        this.canvas.style.display = visible ? 'block' : 'none';
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.canvas.remove();
    }
}

/**
 * Floating score popup system
 */
export class ScorePopup {
    private container: HTMLDivElement;
    private popups: HTMLDivElement[] = [];

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'score-popup-container';
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 1500;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Show a floating score popup at screen position
     */
    show(score: number, screenX: number, screenY: number, color: string = '#00ffc7'): void {
        const popup = document.createElement('div');
        popup.textContent = `+${score}`;
        popup.style.cssText = `
            position: absolute;
            left: ${screenX}px;
            top: ${screenY}px;
            color: ${color};
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px ${color};
            animation: scoreFloat 1s ease-out forwards;
            transform: translateX(-50%);
        `;
        
        // Add animation style if not exists
        if (!document.getElementById('score-popup-style')) {
            const style = document.createElement('style');
            style.id = 'score-popup-style';
            style.textContent = `
                @keyframes scoreFloat {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-30px) scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-60px) scale(0.8);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.container.appendChild(popup);
        this.popups.push(popup);
        
        // Remove after animation
        setTimeout(() => {
            popup.remove();
            const idx = this.popups.indexOf(popup);
            if (idx > -1) this.popups.splice(idx, 1);
        }, 1000);
    }

    /**
     * Show popup at world position (requires camera for projection)
     */
    showAtWorldPos(score: number, worldX: number, worldY: number, worldZ: number, camera: ArcRotateCamera, scene: Scene): void {
        // Project 3D position to screen
        const position = new Vector3(worldX, worldY, worldZ);
        const projected = Vector3.Project(
            position,
            camera.getWorldMatrix(),
            camera.getViewMatrix().multiply(camera.getProjectionMatrix()),
            camera.viewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight())
        );
        
        this.show(score, projected.x, projected.y);
    }

    dispose(): void {
        this.popups.forEach(p => p.remove());
        this.container.remove();
    }
}
