/**
 * Advanced Render Optimizer
 * Sprint 4: Performance & Techniek
 * 
 * Tim: "Graphics voelen achterhaald aan"
 * Peter: "Meer dynamische shader effecten"
 * Elena: "Optimaliseer draw calls door batching"
 */

import * as BABYLON from 'babylonjs';
import { DeviceTier, detectDeviceTier } from './performanceOptimizer';

/**
 * Render Statistics
 */
export interface RenderStats {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    activeParticles: number;
    memoryUsed: number;
    gpuFrameTime?: number;
}

/**
 * Advanced Render Optimizer
 * Dynamically adjusts rendering for optimal performance
 */
export class RenderOptimizer {
    private scene: BABYLON.Scene;
    private engine: BABYLON.Engine;
    private deviceTier: DeviceTier;
    private statsHistory: RenderStats[] = [];
    private readonly maxHistoryLength = 120; // 2 seconds at 60fps

    // Optimization state
    private isOptimizing: boolean = false;
    private optimizationLevel: number = 0;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.engine = scene.getEngine();
        this.deviceTier = detectDeviceTier();

        this.setupMonitoring();
    }

    private setupMonitoring(): void {
        this.scene.onAfterRenderObservable.add(() => {
            this.collectStats();
            this.autoOptimize();
        });
    }

    private collectStats(): void {
        const instrumentation = this.scene.getEngine().getCaps();
        
        const stats: RenderStats = {
            fps: this.engine.getFps(),
            frameTime: this.engine.getDeltaTime(),
            drawCalls: (this.engine as any)._drawCalls?.current ?? 0,
            triangles: this.scene.getActiveIndices() / 3,
            activeParticles: this.scene.particleSystems.reduce(
                (sum, ps) => sum + (ps.getActiveCount?.() ?? 0), 0
            ),
            memoryUsed: (performance as any).memory?.usedJSHeapSize ?? 0
        };

        this.statsHistory.push(stats);
        if (this.statsHistory.length > this.maxHistoryLength) {
            this.statsHistory.shift();
        }
    }

    /**
     * Get averaged stats over recent frames
     */
    getAverageStats(): RenderStats {
        if (this.statsHistory.length === 0) {
            return {
                fps: 60,
                frameTime: 16.67,
                drawCalls: 0,
                triangles: 0,
                activeParticles: 0,
                memoryUsed: 0
            };
        }

        const sum = this.statsHistory.reduce((acc, stats) => ({
            fps: acc.fps + stats.fps,
            frameTime: acc.frameTime + stats.frameTime,
            drawCalls: acc.drawCalls + stats.drawCalls,
            triangles: acc.triangles + stats.triangles,
            activeParticles: acc.activeParticles + stats.activeParticles,
            memoryUsed: acc.memoryUsed + stats.memoryUsed
        }), {
            fps: 0,
            frameTime: 0,
            drawCalls: 0,
            triangles: 0,
            activeParticles: 0,
            memoryUsed: 0
        });

        const count = this.statsHistory.length;
        return {
            fps: sum.fps / count,
            frameTime: sum.frameTime / count,
            drawCalls: Math.round(sum.drawCalls / count),
            triangles: Math.round(sum.triangles / count),
            activeParticles: Math.round(sum.activeParticles / count),
            memoryUsed: sum.memoryUsed / count
        };
    }

    /**
     * Auto-optimize based on performance
     */
    private autoOptimize(): void {
        if (this.isOptimizing || this.statsHistory.length < 60) return;

        const avgStats = this.getAverageStats();
        const targetFPS = this.deviceTier === 'low' ? 30 : 60;

        // Check if we need to optimize
        if (avgStats.fps < targetFPS * 0.8) {
            this.applyNextOptimization();
        }
    }

    /**
     * Apply progressive optimizations
     */
    private applyNextOptimization(): void {
        this.isOptimizing = true;
        this.optimizationLevel++;

        console.log(`Applying optimization level ${this.optimizationLevel}`);

        switch (this.optimizationLevel) {
            case 1:
                // Reduce particle count
                this.reduceParticles(0.7);
                break;
            case 2:
                // Lower render resolution
                this.engine.setHardwareScalingLevel(1.5);
                break;
            case 3:
                // Disable post-processing
                this.disablePostProcessing();
                break;
            case 4:
                // Reduce shadow quality
                this.reduceShadowQuality();
                break;
            case 5:
                // Disable shadows entirely
                this.disableShadows();
                break;
            case 6:
                // Aggressive mesh simplification
                this.simplifyMeshes();
                break;
        }

        // Allow stats to stabilize before next optimization
        setTimeout(() => {
            this.isOptimizing = false;
            this.statsHistory = []; // Reset history
        }, 2000);
    }

    private reduceParticles(multiplier: number): void {
        this.scene.particleSystems.forEach(ps => {
            ps.emitRate *= multiplier;
            ps.minLifeTime *= multiplier;
            ps.maxLifeTime *= multiplier;
        });
        console.log(`Reduced particle counts by ${(1 - multiplier) * 100}%`);
    }

    private disablePostProcessing(): void {
        const postProcesses = [...this.scene.postProcesses];
        postProcesses.forEach(pp => pp.dispose());
        console.log('Disabled post-processing effects');
    }

    private reduceShadowQuality(): void {
        this.scene.lights.forEach(light => {
            const shadowGen = light.getShadowGenerator?.();
            if (shadowGen) {
                shadowGen.mapSize = 512;
                shadowGen.useBlurExponentialShadowMap = false;
                shadowGen.usePercentageCloserFiltering = false;
            }
        });
        console.log('Reduced shadow quality');
    }

    private disableShadows(): void {
        this.scene.lights.forEach(light => {
            light.getShadowGenerator?.()?.dispose();
        });
        console.log('Disabled shadows');
    }

    private simplifyMeshes(): void {
        this.scene.meshes.forEach(mesh => {
            if (mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() > 500) {
                // Enable aggressive frustum culling
                mesh.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            }
        });
        console.log('Applied aggressive mesh culling');
    }

    /**
     * Reset all optimizations
     */
    reset(): void {
        this.optimizationLevel = 0;
        this.engine.setHardwareScalingLevel(1);
        console.log('Reset render optimizations');
    }

    /**
     * Get current optimization level
     */
    getOptimizationLevel(): number {
        return this.optimizationLevel;
    }
}

/**
 * Kurzgesagt-style Color Palette with gradients
 * Tim: "Graphics voelen achterhaald aan" - modern flat design colors
 */
export const kurzgesagtPalette = {
    // Primary colors
    coral: '#FF6B6B',
    teal: '#4ECDC4',
    sky: '#45B7D1',
    mint: '#96CEB4',
    
    // Accent colors
    yellow: '#FFEAA7',
    lavender: '#DDA0DD',
    sage: '#98D8C8',
    gold: '#F7DC6F',
    
    // Deep colors
    purple: '#9B59B6',
    blue: '#3498DB',
    orange: '#F39C12',
    cyan: '#00CED1',
    
    // Neutral
    dark: '#2C3E50',
    light: '#ECF0F1',
    
    // Gradients (start, end)
    gradients: {
        sunset: ['#FF6B6B', '#F7DC6F'],
        ocean: ['#45B7D1', '#4ECDC4'],
        forest: ['#96CEB4', '#98D8C8'],
        galaxy: ['#9B59B6', '#3498DB'],
        fire: ['#FF6B6B', '#F39C12']
    }
};

/**
 * Create gradient material for modern look
 * Peter: "Meer dynamische shader effecten"
 */
export function createGradientMaterial(
    scene: BABYLON.Scene,
    name: string,
    startColor: string,
    endColor: string,
    direction: 'vertical' | 'horizontal' | 'radial' = 'vertical'
): BABYLON.ShaderMaterial {
    // Custom gradient shader
    const vertexShader = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        
        void main() {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUV = uv;
        }
    `;

    const fragmentShader = `
        precision highp float;
        varying vec2 vUV;
        uniform vec3 startColor;
        uniform vec3 endColor;
        uniform int direction; // 0: vertical, 1: horizontal, 2: radial
        
        void main() {
            float t;
            if (direction == 0) {
                t = vUV.y;
            } else if (direction == 1) {
                t = vUV.x;
            } else {
                t = distance(vUV, vec2(0.5, 0.5)) * 2.0;
            }
            
            vec3 color = mix(startColor, endColor, t);
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Store shaders
    BABYLON.Effect.ShadersStore[`${name}VertexShader`] = vertexShader;
    BABYLON.Effect.ShadersStore[`${name}FragmentShader`] = fragmentShader;

    const material = new BABYLON.ShaderMaterial(
        name,
        scene,
        { vertex: name, fragment: name },
        {
            attributes: ['position', 'uv'],
            uniforms: ['worldViewProjection', 'startColor', 'endColor', 'direction']
        }
    );

    // Parse hex colors to RGB
    const parseHex = (hex: string): number[] => {
        const h = hex.replace('#', '');
        return [
            parseInt(h.substring(0, 2), 16) / 255,
            parseInt(h.substring(2, 4), 16) / 255,
            parseInt(h.substring(4, 6), 16) / 255
        ];
    };

    const start = parseHex(startColor);
    const end = parseHex(endColor);

    material.setVector3('startColor', new BABYLON.Vector3(start[0], start[1], start[2]));
    material.setVector3('endColor', new BABYLON.Vector3(end[0], end[1], end[2]));
    material.setInt('direction', direction === 'vertical' ? 0 : direction === 'horizontal' ? 1 : 2);

    return material;
}

/**
 * Animated glow effect for power-ups
 * Creates pulsing glow without expensive post-processing
 */
export function createPulsingGlow(
    scene: BABYLON.Scene,
    mesh: BABYLON.Mesh,
    color: BABYLON.Color3,
    minIntensity: number = 0.3,
    maxIntensity: number = 1.0,
    speed: number = 2.0
): () => void {
    const material = mesh.material as BABYLON.StandardMaterial;
    if (!material) return () => {};

    material.emissiveColor = color;

    let time = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
        time += scene.getEngine().getDeltaTime() / 1000;
        const intensity = minIntensity + (maxIntensity - minIntensity) * 
            (0.5 + 0.5 * Math.sin(time * speed * Math.PI * 2));
        material.emissiveIntensity = intensity;
    });

    // Return cleanup function
    return () => {
        scene.onBeforeRenderObservable.remove(observer);
    };
}

/**
 * Efficient outline effect without post-processing
 * Uses mesh scaling trick for performance
 */
export function createOutlineEffect(
    scene: BABYLON.Scene,
    mesh: BABYLON.Mesh,
    color: BABYLON.Color3,
    width: number = 0.05
): BABYLON.Mesh {
    const outline = mesh.clone(`${mesh.name}_outline`, null);
    if (!outline) return mesh;

    // Scale up slightly for outline
    outline.scaling = mesh.scaling.scale(1 + width);

    // Create outline material
    const outlineMat = new BABYLON.StandardMaterial(`${mesh.name}_outline_mat`, scene);
    outlineMat.emissiveColor = color;
    outlineMat.disableLighting = true;
    outlineMat.backFaceCulling = false;
    outlineMat.sideOrientation = BABYLON.Material.ClockWiseSideOrientation;

    outline.material = outlineMat;
    outline.renderingGroupId = 0; // Render behind main mesh
    mesh.renderingGroupId = 1;

    return outline;
}

/**
 * Simple trail renderer using thin instances
 * Elena: "Trails enabled maar efficient"
 */
export class EfficientTrailRenderer {
    private scene: BABYLON.Scene;
    private baseMesh: BABYLON.Mesh;
    private maxSegments: number;
    private positions: BABYLON.Vector3[] = [];
    private matrices: Float32Array;

    constructor(
        scene: BABYLON.Scene,
        width: number = 0.1,
        color: BABYLON.Color3,
        maxSegments: number = 20
    ) {
        this.scene = scene;
        this.maxSegments = maxSegments;
        this.matrices = new Float32Array(maxSegments * 16);

        // Create base trail segment
        this.baseMesh = BABYLON.MeshBuilder.CreateBox('trail_segment', {
            width: width,
            height: 0.05,
            depth: width * 2
        }, scene);

        const material = new BABYLON.StandardMaterial('trail_mat', scene);
        material.emissiveColor = color;
        material.disableLighting = true;
        material.alpha = 0.7;
        this.baseMesh.material = material;

        // Initialize thin instances
        this.baseMesh.thinInstanceSetBuffer('matrix', this.matrices, 16);
    }

    /**
     * Add a position to the trail
     */
    addPosition(position: BABYLON.Vector3): void {
        this.positions.unshift(position.clone());
        
        if (this.positions.length > this.maxSegments) {
            this.positions.pop();
        }

        this.updateInstances();
    }

    private updateInstances(): void {
        this.positions.forEach((pos, i) => {
            const scale = 1 - (i / this.maxSegments) * 0.8; // Fade out
            const matrix = BABYLON.Matrix.Compose(
                new BABYLON.Vector3(scale, scale, scale),
                BABYLON.Quaternion.Identity(),
                pos
            );
            matrix.copyToArray(this.matrices, i * 16);
        });

        // Hide unused instances
        for (let i = this.positions.length; i < this.maxSegments; i++) {
            const matrix = BABYLON.Matrix.Scaling(0, 0, 0);
            matrix.copyToArray(this.matrices, i * 16);
        }

        this.baseMesh.thinInstanceSetBuffer('matrix', this.matrices, 16);
    }

    /**
     * Clear the trail
     */
    clear(): void {
        this.positions = [];
        this.updateInstances();
    }

    dispose(): void {
        this.baseMesh.dispose();
    }
}

/**
 * Performance HUD for debugging
 */
export class PerformanceHUD {
    private container: HTMLDivElement;
    private isVisible: boolean = false;
    private updateInterval: number | null = null;
    private optimizer: RenderOptimizer;

    constructor(optimizer: RenderOptimizer) {
        this.optimizer = optimizer;
        this.container = this.createHUD();
    }

    private createHUD(): HTMLDivElement {
        const container = document.createElement('div');
        container.id = 'performance-hud';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 8px;
            z-index: 10000;
            display: none;
            min-width: 200px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(): void {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.startUpdating();
    }

    hide(): void {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.stopUpdating();
    }

    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    private startUpdating(): void {
        this.updateInterval = window.setInterval(() => {
            this.update();
        }, 100);
    }

    private stopUpdating(): void {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private update(): void {
        const stats = this.optimizer.getAverageStats();
        const fpsColor = stats.fps >= 55 ? '#00ff00' : stats.fps >= 30 ? '#ffff00' : '#ff0000';
        
        this.container.innerHTML = `
            <div style="color: ${fpsColor}; font-size: 16px; font-weight: bold;">
                ${stats.fps.toFixed(1)} FPS
            </div>
            <div style="margin-top: 5px; font-size: 11px; opacity: 0.8;">
                Frame: ${stats.frameTime.toFixed(2)}ms<br>
                Draw Calls: ${stats.drawCalls}<br>
                Triangles: ${(stats.triangles / 1000).toFixed(1)}K<br>
                Particles: ${stats.activeParticles}<br>
                Memory: ${(stats.memoryUsed / 1024 / 1024).toFixed(1)}MB<br>
                Opt Level: ${this.optimizer.getOptimizationLevel()}
            </div>
        `;
    }

    dispose(): void {
        this.stopUpdating();
        this.container.remove();
    }
}
