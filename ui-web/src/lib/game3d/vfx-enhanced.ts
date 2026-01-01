/**
 * Enhanced VFX System for MazeChase 3D
 * Sprint 3 - Visual Upgrade based on AI Tester Feedback
 * 
 * New effects:
 * - Speed trail particles
 * - Combo multiplier effects
 * - Screen shake
 * - Victory celebration
 * - Power-up aura
 */

import {
    Scene,
    Vector3,
    Color4,
    ParticleSystem,
    Mesh,
    MeshBuilder,
    Animation,
    TransformNode,
    GlowLayer
} from '@babylonjs/core';
import { TILE_SIZE_3D } from './maze';

export interface VFXConfig {
    intensityMultiplier: number;
    particleCount: number;
    trailEnabled: boolean;
}

export class EnhancedVFXManager {
    private scene: Scene;
    private activeTrails: Map<string, ParticleSystem> = new Map();
    private activeAuras: Map<string, ParticleSystem> = new Map();
    private glowLayer: GlowLayer | null = null;
    private config: VFXConfig = {
        intensityMultiplier: 1.0,
        particleCount: 50,
        trailEnabled: true
    };

    constructor(scene: Scene, glowLayer?: GlowLayer) {
        this.scene = scene;
        this.glowLayer = glowLayer || null;
    }

    /**
     * Set VFX quality (for performance tuning)
     */
    setQuality(level: 'low' | 'medium' | 'high'): void {
        switch (level) {
            case 'low':
                this.config.intensityMultiplier = 0.5;
                this.config.particleCount = 20;
                this.config.trailEnabled = false;
                break;
            case 'medium':
                this.config.intensityMultiplier = 0.75;
                this.config.particleCount = 35;
                this.config.trailEnabled = true;
                break;
            case 'high':
                this.config.intensityMultiplier = 1.0;
                this.config.particleCount = 50;
                this.config.trailEnabled = true;
                break;
        }
    }

    /**
     * Create speed trail effect behind moving player
     */
    createSpeedTrail(playerId: string, mesh: Mesh, color: Color4): ParticleSystem {
        // Remove existing trail
        this.removeSpeedTrail(playerId);

        if (!this.config.trailEnabled) {
            return null as unknown as ParticleSystem;
        }

        const trail = new ParticleSystem(`speedTrail_${playerId}`, this.config.particleCount, this.scene);
        
        // Attach to player mesh
        trail.emitter = mesh;
        
        // Trail colors
        trail.color1 = color;
        trail.color2 = new Color4(color.r * 0.7, color.g * 0.7, color.b * 0.7, 0.8);
        trail.colorDead = new Color4(color.r * 0.3, color.g * 0.3, color.b * 0.3, 0);
        
        // Small particles
        trail.minSize = 0.05 * this.config.intensityMultiplier;
        trail.maxSize = 0.12 * this.config.intensityMultiplier;
        
        // Short lifetime for trail effect
        trail.minLifeTime = 0.1;
        trail.maxLifeTime = 0.25;
        
        // Continuous emission
        trail.emitRate = 30 * this.config.intensityMultiplier;
        
        // Minimal velocity (trail should stay behind)
        trail.direction1 = new Vector3(-0.1, 0, -0.1);
        trail.direction2 = new Vector3(0.1, 0.2, 0.1);
        trail.minEmitPower = 0.1;
        trail.maxEmitPower = 0.3;
        
        // Additive blending for glow
        trail.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        trail.start();
        this.activeTrails.set(playerId, trail);
        
        return trail;
    }

    /**
     * Remove speed trail for a player
     */
    removeSpeedTrail(playerId: string): void {
        const trail = this.activeTrails.get(playerId);
        if (trail) {
            trail.stop();
            trail.dispose();
            this.activeTrails.delete(playerId);
        }
    }

    /**
     * Create power-up aura around player
     */
    createPowerUpAura(playerId: string, mesh: Mesh, powerUpType: string): ParticleSystem {
        this.removePowerUpAura(playerId);
        
        const aura = new ParticleSystem(`powerAura_${playerId}`, this.config.particleCount * 2, this.scene);
        
        // Attach to player
        aura.emitter = mesh;
        
        // Color based on power-up type
        let color1: Color4;
        let color2: Color4;
        
        switch (powerUpType) {
            case 'speed':
                color1 = new Color4(0.2, 1, 0.8, 1);  // Cyan
                color2 = new Color4(0.5, 1, 1, 0.8);
                break;
            case 'magnet':
                color1 = new Color4(1, 0.2, 1, 1);   // Magenta
                color2 = new Color4(1, 0.5, 1, 0.8);
                break;
            case 'classic':
            default:
                color1 = new Color4(1, 0.9, 0.2, 1); // Gold
                color2 = new Color4(1, 0.7, 0.1, 0.8);
                break;
        }
        
        aura.color1 = color1;
        aura.color2 = color2;
        aura.colorDead = new Color4(color1.r * 0.3, color1.g * 0.3, color1.b * 0.3, 0);
        
        // Size
        aura.minSize = 0.08;
        aura.maxSize = 0.2;
        
        // Lifetime
        aura.minLifeTime = 0.3;
        aura.maxLifeTime = 0.6;
        
        // Emission - radial pattern
        aura.emitRate = 60 * this.config.intensityMultiplier;
        
        // Circular motion
        aura.direction1 = new Vector3(-0.5, 0.3, -0.5);
        aura.direction2 = new Vector3(0.5, 0.8, 0.5);
        aura.minEmitPower = 0.3;
        aura.maxEmitPower = 0.6;
        
        // Light gravity
        aura.gravity = new Vector3(0, -0.5, 0);
        
        // Additive
        aura.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        aura.start();
        this.activeAuras.set(playerId, aura);
        
        return aura;
    }

    /**
     * Remove power-up aura
     */
    removePowerUpAura(playerId: string): void {
        const aura = this.activeAuras.get(playerId);
        if (aura) {
            aura.stop();
            aura.dispose();
            this.activeAuras.delete(playerId);
        }
    }

    /**
     * Create combo number popup effect
     */
    createComboPopup(x: number, y: number, z: number, comboNumber: number): void {
        // Create floating text mesh (simplified - use dynamic texture in production)
        const popup = MeshBuilder.CreatePlane(`combo_${Date.now()}`, { size: 0.5 }, this.scene);
        popup.position.set(x, y + 0.3, z);
        popup.billboardMode = Mesh.BILLBOARDMODE_ALL;
        
        // Animate upward and fade
        const moveAnim = new Animation(
            'comboMove',
            'position.y',
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        moveAnim.setKeys([
            { frame: 0, value: y + 0.3 },
            { frame: 30, value: y + 1.0 }
        ]);
        
        popup.animations.push(moveAnim);
        this.scene.beginAnimation(popup, 0, 30, false, 1, () => {
            popup.dispose();
        });
    }

    /**
     * Screen shake effect (camera)
     */
    createScreenShake(camera: TransformNode, intensity: number = 0.1, duration: number = 200): void {
        const originalPos = camera.position.clone();
        const startTime = Date.now();
        
        const shakeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                camera.position = originalPos;
                clearInterval(shakeInterval);
                return;
            }
            
            // Diminishing shake
            const factor = 1 - (elapsed / duration);
            const shakeAmount = intensity * factor * this.config.intensityMultiplier;
            
            camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeAmount;
            camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeAmount;
        }, 16); // ~60fps
    }

    /**
     * Victory celebration particle explosion
     */
    createVictoryCelebration(x: number, y: number, z: number): void {
        // Multiple colorful particle bursts
        const colors = [
            new Color4(1, 0.84, 0, 1),    // Gold
            new Color4(0, 1, 0.5, 1),     // Green
            new Color4(0.5, 0, 1, 1),     // Purple
            new Color4(1, 0, 0.5, 1),     // Pink
            new Color4(0, 0.8, 1, 1),     // Cyan
        ];
        
        colors.forEach((color, index) => {
            setTimeout(() => {
                this.createConfettiBurst(x, y, z, color);
            }, index * 100);
        });
    }

    /**
     * Single confetti burst
     */
    private createConfettiBurst(x: number, y: number, z: number, color: Color4): void {
        const confetti = new ParticleSystem(`confetti_${Date.now()}`, 100, this.scene);
        
        confetti.emitter = new Vector3(x, y, z);
        
        confetti.color1 = color;
        confetti.color2 = new Color4(color.r * 0.8, color.g * 0.8, color.b * 0.8, 1);
        confetti.colorDead = new Color4(color.r * 0.5, color.g * 0.5, color.b * 0.5, 0);
        
        confetti.minSize = 0.1;
        confetti.maxSize = 0.2;
        
        confetti.minLifeTime = 1.0;
        confetti.maxLifeTime = 2.0;
        
        confetti.manualEmitCount = 50;
        confetti.emitRate = 200;
        
        // Explode upward
        confetti.direction1 = new Vector3(-1, 1, -1);
        confetti.direction2 = new Vector3(1, 3, 1);
        confetti.minEmitPower = 2;
        confetti.maxEmitPower = 4;
        
        // Gravity to fall
        confetti.gravity = new Vector3(0, -3, 0);
        
        confetti.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        
        confetti.start();
        
        setTimeout(() => {
            confetti.dispose();
        }, 2500);
    }

    /**
     * Chaser eat effect (when runner eats a chaser)
     * SPRINT 2: Enhanced with poof + shockwave + ghost fade (Yuki recommendation)
     */
    createChaserEatEffect(x: number, y: number, z: number, chaserColor: Color4): void {
        const pos = new Vector3(x, y, z);
        
        // Layer 1: Main poof burst with chaser color
        const poof = new ParticleSystem(`chaserEat_poof_${Date.now()}`, 80, this.scene);
        poof.emitter = pos.clone();
        poof.color1 = chaserColor;
        poof.color2 = new Color4(1, 1, 1, 1);
        poof.colorDead = new Color4(chaserColor.r * 0.2, chaserColor.g * 0.2, chaserColor.b * 0.2, 0);
        poof.minSize = 0.12;
        poof.maxSize = 0.3;
        poof.minLifeTime = 0.4;
        poof.maxLifeTime = 0.8;
        poof.manualEmitCount = 70;
        poof.emitRate = 350;
        poof.direction1 = new Vector3(-1.2, 0, -1.2);
        poof.direction2 = new Vector3(1.2, 2, 1.2);
        poof.minEmitPower = 1.8;
        poof.maxEmitPower = 3.5;
        poof.gravity = new Vector3(0, -3, 0);
        poof.blendMode = ParticleSystem.BLENDMODE_ADD;
        poof.start();
        
        // Layer 2: Expanding ring/shockwave
        const ring = new ParticleSystem(`chaserEat_ring_${Date.now()}`, 40, this.scene);
        ring.emitter = pos.clone();
        ring.color1 = new Color4(chaserColor.r * 0.8, chaserColor.g * 0.8, chaserColor.b * 0.8, 0.8);
        ring.color2 = new Color4(1, 1, 1, 0.6);
        ring.colorDead = new Color4(1, 1, 1, 0);
        ring.minSize = 0.06;
        ring.maxSize = 0.15;
        ring.minLifeTime = 0.3;
        ring.maxLifeTime = 0.5;
        ring.manualEmitCount = 35;
        ring.emitRate = 200;
        // Flat horizontal ring
        ring.direction1 = new Vector3(-2.5, 0, -2.5);
        ring.direction2 = new Vector3(2.5, 0.2, 2.5);
        ring.minEmitPower = 3;
        ring.maxEmitPower = 5;
        ring.gravity = new Vector3(0, 0, 0);
        ring.blendMode = ParticleSystem.BLENDMODE_ADD;
        ring.start();
        
        // Layer 3: Ghost fade particles - rising ethereal wisps
        const ghost = new ParticleSystem(`chaserEat_ghost_${Date.now()}`, 25, this.scene);
        ghost.emitter = pos.clone();
        ghost.color1 = new Color4(chaserColor.r * 0.5, chaserColor.g * 0.5, chaserColor.b * 0.5, 0.5);
        ghost.color2 = new Color4(0.8, 0.8, 1, 0.3);
        ghost.colorDead = new Color4(0.5, 0.5, 0.5, 0);
        ghost.minSize = 0.15;
        ghost.maxSize = 0.35;
        ghost.minLifeTime = 0.8;
        ghost.maxLifeTime = 1.5;
        ghost.manualEmitCount = 20;
        ghost.emitRate = 80;
        // Float upward gently
        ghost.direction1 = new Vector3(-0.3, 1, -0.3);
        ghost.direction2 = new Vector3(0.3, 3, 0.3);
        ghost.minEmitPower = 0.5;
        ghost.maxEmitPower = 1.2;
        ghost.gravity = new Vector3(0, 0.5, 0); // Rise up
        ghost.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        ghost.start();
        
        // Layer 4: Sparkle stars
        const sparkles = new ParticleSystem(`chaserEat_sparkle_${Date.now()}`, 30, this.scene);
        sparkles.emitter = pos.clone();
        sparkles.color1 = new Color4(1, 1, 0.8, 1);
        sparkles.color2 = new Color4(1, 0.9, 0.5, 1);
        sparkles.colorDead = new Color4(1, 1, 1, 0);
        sparkles.minSize = 0.02;
        sparkles.maxSize = 0.06;
        sparkles.minLifeTime = 0.5;
        sparkles.maxLifeTime = 1.0;
        sparkles.manualEmitCount = 25;
        sparkles.emitRate = 150;
        sparkles.direction1 = new Vector3(-1.5, 0.5, -1.5);
        sparkles.direction2 = new Vector3(1.5, 3, 1.5);
        sparkles.minEmitPower = 1.5;
        sparkles.maxEmitPower = 3;
        sparkles.gravity = new Vector3(0, -2, 0);
        sparkles.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparkles.start();
        
        // Dispose all layers
        setTimeout(() => {
            poof.dispose();
            ring.dispose();
            ghost.dispose();
            sparkles.dispose();
        }, 1500);
    }

    /**
     * Cleanup all active effects
     */
    dispose(): void {
        this.activeTrails.forEach(trail => {
            trail.stop();
            trail.dispose();
        });
        this.activeTrails.clear();
        
        this.activeAuras.forEach(aura => {
            aura.stop();
            aura.dispose();
        });
        this.activeAuras.clear();
    }
    
    /**
     * Create power-up pickup explosion effect (Yuki's suggestion)
     * Multi-layered magical burst when collecting a power-up
     */
    createPowerUpPickupEffect(x: number, y: number, z: number, powerUpType: string): void {
        const pos = new Vector3(x, y, z);
        
        // Get color based on power-up type
        let primaryColor: Color4;
        let secondaryColor: Color4;
        
        switch (powerUpType) {
            case 'speed':
                primaryColor = new Color4(0.2, 1, 0.9, 1);   // Cyan
                secondaryColor = new Color4(0.5, 1, 1, 0.8);
                break;
            case 'magnet':
                primaryColor = new Color4(1, 0.2, 1, 1);     // Magenta
                secondaryColor = new Color4(1, 0.5, 1, 0.8);
                break;
            case 'invisible':
                primaryColor = new Color4(0.5, 0.5, 1, 0.8); // Ghost blue
                secondaryColor = new Color4(0.8, 0.8, 1, 0.5);
                break;
            case 'freeze':
                primaryColor = new Color4(0.4, 0.8, 1, 1);   // Ice blue
                secondaryColor = new Color4(0.6, 0.9, 1, 0.8);
                break;
            default:
                primaryColor = new Color4(1, 0.84, 0, 1);    // Gold
                secondaryColor = new Color4(1, 0.9, 0.3, 0.8);
        }
        
        // Layer 1: Central burst - magical explosion
        const burst = new ParticleSystem(`powerPickup_burst_${Date.now()}`, 60, this.scene);
        burst.emitter = pos.clone();
        burst.color1 = primaryColor;
        burst.color2 = secondaryColor;
        burst.colorDead = new Color4(primaryColor.r * 0.3, primaryColor.g * 0.3, primaryColor.b * 0.3, 0);
        burst.minSize = 0.1;
        burst.maxSize = 0.25;
        burst.minLifeTime = 0.3;
        burst.maxLifeTime = 0.6;
        burst.manualEmitCount = 50;
        burst.emitRate = 300;
        burst.direction1 = new Vector3(-2, 1, -2);
        burst.direction2 = new Vector3(2, 3, 2);
        burst.minEmitPower = 2;
        burst.maxEmitPower = 4;
        burst.gravity = new Vector3(0, -3, 0);
        burst.blendMode = ParticleSystem.BLENDMODE_ADD;
        burst.start();
        
        // Layer 2: Magical ring - horizontal expanding ring
        const ring = new ParticleSystem(`powerPickup_ring_${Date.now()}`, 40, this.scene);
        ring.emitter = pos.clone();
        ring.color1 = new Color4(1, 1, 1, 1);
        ring.color2 = primaryColor;
        ring.colorDead = new Color4(1, 1, 1, 0);
        ring.minSize = 0.05;
        ring.maxSize = 0.12;
        ring.minLifeTime = 0.25;
        ring.maxLifeTime = 0.4;
        ring.manualEmitCount = 30;
        ring.emitRate = 200;
        ring.direction1 = new Vector3(-3, 0.1, -3);
        ring.direction2 = new Vector3(3, 0.3, 3);
        ring.minEmitPower = 4;
        ring.maxEmitPower = 6;
        ring.gravity = new Vector3(0, 0, 0);
        ring.blendMode = ParticleSystem.BLENDMODE_ADD;
        ring.start();
        
        // Layer 3: Rising sparkles - magical stars floating up
        const sparkles = new ParticleSystem(`powerPickup_sparkles_${Date.now()}`, 35, this.scene);
        sparkles.emitter = pos.clone();
        sparkles.color1 = new Color4(1, 1, 0.9, 1);
        sparkles.color2 = new Color4(1, 0.95, 0.7, 1);
        sparkles.colorDead = new Color4(1, 1, 1, 0);
        sparkles.minSize = 0.02;
        sparkles.maxSize = 0.06;
        sparkles.minLifeTime = 0.6;
        sparkles.maxLifeTime = 1.0;
        sparkles.manualEmitCount = 25;
        sparkles.emitRate = 120;
        sparkles.direction1 = new Vector3(-0.5, 2, -0.5);
        sparkles.direction2 = new Vector3(0.5, 4, 0.5);
        sparkles.minEmitPower = 0.8;
        sparkles.maxEmitPower = 1.5;
        sparkles.gravity = new Vector3(0, 1, 0); // Float up
        sparkles.blendMode = ParticleSystem.BLENDMODE_ADD;
        sparkles.start();
        
        // Dispose all layers
        setTimeout(() => {
            burst.dispose();
            ring.dispose();
            sparkles.dispose();
        }, 1000);
    }
    
    /**
     * Create runner glow pulse effect (visual feedback for power-up active)
     */
    createGlowPulse(mesh: Mesh, color: Color4, duration: number = 3000): void {
        if (!this.glowLayer) return;
        
        // Add to glow layer
        this.glowLayer.addIncludedOnlyMesh(mesh);
        
        // Animate glow intensity
        const startTime = Date.now();
        const originalIntensity = this.glowLayer.intensity;
        
        const pulseInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                this.glowLayer!.intensity = originalIntensity;
                clearInterval(pulseInterval);
                return;
            }
            
            // Pulse effect
            const pulse = Math.sin(elapsed / 100) * 0.3 + 1.0;
            this.glowLayer!.intensity = originalIntensity * pulse;
        }, 16);
    }
}

// Export singleton factory
let vfxManagerInstance: EnhancedVFXManager | null = null;

export function getVFXManager(scene?: Scene, glowLayer?: GlowLayer): EnhancedVFXManager | null {
    if (scene && !vfxManagerInstance) {
        vfxManagerInstance = new EnhancedVFXManager(scene, glowLayer);
    }
    return vfxManagerInstance;
}

export function disposeVFXManager(): void {
    if (vfxManagerInstance) {
        vfxManagerInstance.dispose();
        vfxManagerInstance = null;
    }
}
