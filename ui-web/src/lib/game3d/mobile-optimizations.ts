/**
 * Mobile Performance Optimizations
 * Sprint 4 - Performance
 * 
 * Provides fallbacks and optimizations for mobile devices:
 * - Simplified shaders
 * - Reduced particle counts
 * - Lower resolution rendering
 * - Touch-optimized controls
 */

import { Scene, Engine, Camera, Color3, Color4 } from '@babylonjs/core';

export interface MobileConfig {
    isLowPowerDevice: boolean;
    pixelRatio: number;
    maxParticles: number;
    shadowsEnabled: boolean;
    glowEnabled: boolean;
    antiAliasing: boolean;
    targetFPS: number;
}

/**
 * Detect device capabilities and return optimal config
 */
export function detectMobileCapabilities(): MobileConfig {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
    
    const isLowPower = isMobile || (navigator as any).deviceMemory < 4;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isLowPower ? 1.5 : 2);
    
    // Check for WebGL 2 support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const isWebGL2 = !!canvas.getContext('webgl2');
    
    // Estimate GPU power from renderer string
    let gpuTier = 'medium';
    if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            if (renderer.includes('Mali') || renderer.includes('Adreno 3') || renderer.includes('PowerVR')) {
                gpuTier = 'low';
            } else if (renderer.includes('NVIDIA') || renderer.includes('Radeon')) {
                gpuTier = 'high';
            }
        }
    }

    return {
        isLowPowerDevice: isLowPower || gpuTier === 'low',
        pixelRatio,
        maxParticles: gpuTier === 'low' ? 50 : (gpuTier === 'medium' ? 150 : 300),
        shadowsEnabled: gpuTier !== 'low' && !isLowPower,
        glowEnabled: gpuTier !== 'low',
        antiAliasing: !isLowPower && gpuTier !== 'low',
        targetFPS: isLowPower ? 30 : 60
    };
}

/**
 * Apply mobile optimizations to the scene
 */
export function applyMobileOptimizations(scene: Scene, config: MobileConfig): void {
    const engine = scene.getEngine();
    
    // Set hardware scaling
    engine.setHardwareScalingLevel(1 / config.pixelRatio);
    
    // Disable expensive features on low-end devices
    if (config.isLowPowerDevice) {
        // Disable shadows
        scene.shadowsEnabled = false;
        
        // Reduce texture quality
        scene.getEngine().getCaps().maxTextureSize = Math.min(
            scene.getEngine().getCaps().maxTextureSize,
            1024
        );
        
        // Disable ambient occlusion
        scene.ambientColor = new Color3(0.2, 0.2, 0.2);
        
        // Simplify fog
        scene.fogMode = Scene.FOGMODE_NONE;
    }
    
    // Set clear color (slight optimization by avoiding alpha)
    scene.clearColor = new Color4(0.05, 0.05, 0.1, 1);
    
    // Optimize picking
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    
    // Reduce active cameras
    scene.activeCameras = [];
    
    console.log(`📱 Mobile optimizations applied:`, {
        pixelRatio: config.pixelRatio,
        shadows: config.shadowsEnabled,
        glow: config.glowEnabled,
        targetFPS: config.targetFPS
    });
}

/**
 * Adaptive quality manager
 * Automatically adjusts quality based on FPS
 */
export class AdaptiveQualityManager {
    private scene: Scene;
    private config: MobileConfig;
    private fpsHistory: number[] = [];
    private readonly historyLength = 60;
    private qualityLevel: 'low' | 'medium' | 'high' = 'medium';
    private adjustmentCooldown = 0;
    private readonly cooldownFrames = 120; // 2 seconds at 60fps
    
    private onQualityChange?: (level: 'low' | 'medium' | 'high') => void;

    constructor(scene: Scene, config: MobileConfig) {
        this.scene = scene;
        this.config = config;
        
        // Start monitoring
        scene.onAfterRenderObservable.add(() => {
            this.update();
        });
    }

    /**
     * Set callback for quality changes
     */
    setOnQualityChange(callback: (level: 'low' | 'medium' | 'high') => void): void {
        this.onQualityChange = callback;
    }

    private update(): void {
        const fps = this.scene.getEngine().getFps();
        
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > this.historyLength) {
            this.fpsHistory.shift();
        }
        
        if (this.adjustmentCooldown > 0) {
            this.adjustmentCooldown--;
            return;
        }
        
        const avgFps = this.getAverageFPS();
        this.adjustQuality(avgFps);
    }

    private getAverageFPS(): number {
        if (this.fpsHistory.length === 0) return 60;
        return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    }

    private adjustQuality(avgFps: number): void {
        const targetFPS = this.config.targetFPS;
        const previousLevel = this.qualityLevel;
        
        if (avgFps < targetFPS * 0.7) {
            // FPS too low, reduce quality
            if (this.qualityLevel === 'high') {
                this.qualityLevel = 'medium';
            } else if (this.qualityLevel === 'medium') {
                this.qualityLevel = 'low';
            }
        } else if (avgFps > targetFPS * 0.95 && this.fpsHistory.length >= this.historyLength) {
            // FPS stable and high, try increasing quality
            if (this.qualityLevel === 'low') {
                this.qualityLevel = 'medium';
            } else if (this.qualityLevel === 'medium') {
                this.qualityLevel = 'high';
            }
        }
        
        if (previousLevel !== this.qualityLevel) {
            this.applyQualityLevel();
            this.adjustmentCooldown = this.cooldownFrames;
            this.fpsHistory = []; // Reset history after change
            
            if (this.onQualityChange) {
                this.onQualityChange(this.qualityLevel);
            }
            
            console.log(`🎚️ Quality adjusted: ${previousLevel} → ${this.qualityLevel} (avg FPS: ${avgFps.toFixed(1)})`);
        }
    }

    private applyQualityLevel(): void {
        const engine = this.scene.getEngine();
        
        switch (this.qualityLevel) {
            case 'low':
                engine.setHardwareScalingLevel(2);
                this.scene.particlesEnabled = false;
                this.scene.postProcessesEnabled = false;
                break;
                
            case 'medium':
                engine.setHardwareScalingLevel(1.5);
                this.scene.particlesEnabled = true;
                this.scene.postProcessesEnabled = false;
                break;
                
            case 'high':
                engine.setHardwareScalingLevel(1 / this.config.pixelRatio);
                this.scene.particlesEnabled = true;
                this.scene.postProcessesEnabled = true;
                break;
        }
    }

    /**
     * Get current quality level
     */
    getQualityLevel(): 'low' | 'medium' | 'high' {
        return this.qualityLevel;
    }

    /**
     * Get current average FPS
     */
    getCurrentFPS(): number {
        return this.getAverageFPS();
    }
}

/**
 * Battery-aware performance manager
 * Reduces quality when battery is low
 */
export class BatteryAwareManager {
    private lowBatteryMode = false;
    private onLowBattery?: () => void;

    constructor() {
        this.initBatteryMonitor();
    }

    private async initBatteryMonitor(): Promise<void> {
        if ('getBattery' in navigator) {
            try {
                const battery = await (navigator as any).getBattery();
                
                const checkBattery = () => {
                    const isLow = battery.level < 0.2 && !battery.charging;
                    if (isLow !== this.lowBatteryMode) {
                        this.lowBatteryMode = isLow;
                        if (isLow && this.onLowBattery) {
                            this.onLowBattery();
                        }
                        console.log(`🔋 Battery mode: ${isLow ? 'LOW' : 'NORMAL'}`);
                    }
                };
                
                battery.addEventListener('levelchange', checkBattery);
                battery.addEventListener('chargingchange', checkBattery);
                checkBattery();
            } catch (e) {
                // Battery API not available
            }
        }
    }

    setOnLowBattery(callback: () => void): void {
        this.onLowBattery = callback;
    }

    isLowBatteryMode(): boolean {
        return this.lowBatteryMode;
    }
}

/**
 * Frame rate limiter for consistent performance
 */
export class FrameRateLimiter {
    private targetFPS: number;
    private lastFrameTime: number = 0;
    private frameInterval: number;

    constructor(targetFPS: number = 60) {
        this.targetFPS = targetFPS;
        this.frameInterval = 1000 / targetFPS;
    }

    /**
     * Check if enough time has passed for next frame
     */
    shouldRender(): boolean {
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        if (elapsed >= this.frameInterval) {
            this.lastFrameTime = now - (elapsed % this.frameInterval);
            return true;
        }
        
        return false;
    }

    setTargetFPS(fps: number): void {
        this.targetFPS = fps;
        this.frameInterval = 1000 / fps;
    }
}
