/**
 * Power-Up Display - Enhanced Visual Feedback
 * EMMSOAI Suggestion (Ava, Yuki): "Increase visual feedback when collecting power-ups"
 */

import * as BABYLON from '@babylonjs/core';

export interface PowerUpDisplayConfig {
    enableGlow: boolean;
    enableScreenFlash: boolean;
    enableParticleBurst: boolean;
    enableSoundEffect: boolean;
    glowIntensity: number;
    flashDuration: number;
}

const DEFAULT_CONFIG: PowerUpDisplayConfig = {
    enableGlow: true,
    enableScreenFlash: true,
    enableParticleBurst: true,
    enableSoundEffect: true,
    glowIntensity: 2.0,
    flashDuration: 200
};

/**
 * PowerUpDisplay - Handles enhanced visual feedback for power-up collection
 */
export class PowerUpDisplay {
    private scene: BABYLON.Scene;
    private config: PowerUpDisplayConfig;
    private overlayElement: HTMLDivElement | null = null;
    private activeEffects: Map<string, { stop?: () => void }> = new Map();

    constructor(scene: BABYLON.Scene, config: Partial<PowerUpDisplayConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.createOverlay();
    }

    /**
     * Create screen overlay for flash effects
     */
    private createOverlay(): void {
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'powerup-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.1s ease-out;
        `;
        document.body.appendChild(this.overlayElement);
    }

    /**
     * Trigger enhanced power-up collection effect
     */
    public triggerPowerUpEffect(
        type: 'speed' | 'ghost' | 'freeze' | 'magnet' | 'shield',
        worldPosition: BABYLON.Vector3
    ): void {
        const color = this.getPowerUpColor(type);
        
        // Screen flash
        if (this.config.enableScreenFlash && this.overlayElement) {
            this.flashScreen(color);
        }
        
        // Enhanced particle burst at position
        if (this.config.enableParticleBurst) {
            this.createEnhancedParticleBurst(worldPosition, color, type);
        }
        
        // Radial shockwave
        this.createShockwave(worldPosition, color);
        
        // Screen shake
        this.screenShake(type);
        
        console.log(`⚡ Power-up collected: ${type}`);
    }

    /**
     * Get color for power-up type
     */
    private getPowerUpColor(type: string): BABYLON.Color3 {
        switch (type) {
            case 'speed':
                return new BABYLON.Color3(0, 1, 1); // Cyan
            case 'ghost':
                return new BABYLON.Color3(0.8, 0.3, 1); // Purple
            case 'freeze':
                return new BABYLON.Color3(0.5, 0.8, 1); // Ice blue
            case 'magnet':
                return new BABYLON.Color3(1, 0.8, 0); // Gold
            case 'shield':
                return new BABYLON.Color3(0.3, 1, 0.5); // Green
            default:
                return new BABYLON.Color3(1, 1, 1); // White
        }
    }

    /**
     * Flash screen with color
     */
    private flashScreen(color: BABYLON.Color3): void {
        if (!this.overlayElement) return;
        
        const r = Math.floor(color.r * 255);
        const g = Math.floor(color.g * 255);
        const b = Math.floor(color.b * 255);
        
        this.overlayElement.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.4) 0%, rgba(${r},${g},${b},0) 70%)`;
        this.overlayElement.style.opacity = '1';
        
        setTimeout(() => {
            if (this.overlayElement) {
                this.overlayElement.style.opacity = '0';
            }
        }, this.config.flashDuration);
    }

    /**
     * Create enhanced particle burst with multiple layers
     */
    private createEnhancedParticleBurst(
        position: BABYLON.Vector3,
        color: BABYLON.Color3,
        _type: string
    ): void {
        // Layer 1: Central burst
        const centralBurst = new BABYLON.ParticleSystem('powerup_central', 100, this.scene);
        centralBurst.emitter = position.clone();
        centralBurst.color1 = new BABYLON.Color4(color.r, color.g, color.b, 1);
        centralBurst.color2 = new BABYLON.Color4(1, 1, 1, 1);
        centralBurst.colorDead = new BABYLON.Color4(color.r, color.g, color.b, 0);
        centralBurst.minSize = 0.15;
        centralBurst.maxSize = 0.35;
        centralBurst.minLifeTime = 0.3;
        centralBurst.maxLifeTime = 0.6;
        centralBurst.emitRate = 500;
        centralBurst.manualEmitCount = 80;
        centralBurst.direction1 = new BABYLON.Vector3(-2, 1, -2);
        centralBurst.direction2 = new BABYLON.Vector3(2, 3, 2);
        centralBurst.minEmitPower = 2;
        centralBurst.maxEmitPower = 4;
        centralBurst.gravity = new BABYLON.Vector3(0, -2, 0);
        centralBurst.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        centralBurst.start();

        // Layer 2: Ring burst (horizontal)
        const ringBurst = new BABYLON.ParticleSystem('powerup_ring', 60, this.scene);
        ringBurst.emitter = position.clone();
        ringBurst.color1 = new BABYLON.Color4(1, 1, 1, 1);
        ringBurst.color2 = new BABYLON.Color4(color.r, color.g, color.b, 0.8);
        ringBurst.colorDead = new BABYLON.Color4(1, 1, 1, 0);
        ringBurst.minSize = 0.08;
        ringBurst.maxSize = 0.15;
        ringBurst.minLifeTime = 0.4;
        ringBurst.maxLifeTime = 0.8;
        ringBurst.emitRate = 300;
        ringBurst.manualEmitCount = 50;
        ringBurst.direction1 = new BABYLON.Vector3(-3, 0.1, -3);
        ringBurst.direction2 = new BABYLON.Vector3(3, 0.3, 3);
        ringBurst.minEmitPower = 3;
        ringBurst.maxEmitPower = 5;
        ringBurst.gravity = new BABYLON.Vector3(0, 0.5, 0);
        ringBurst.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        ringBurst.start();

        // Layer 3: Rising sparkles
        const sparkles = new BABYLON.ParticleSystem('powerup_sparkles', 40, this.scene);
        sparkles.emitter = position.clone();
        sparkles.color1 = new BABYLON.Color4(1, 1, 1, 1);
        sparkles.color2 = new BABYLON.Color4(1, 1, 0.8, 0.9);
        sparkles.colorDead = new BABYLON.Color4(1, 1, 1, 0);
        sparkles.minSize = 0.03;
        sparkles.maxSize = 0.08;
        sparkles.minLifeTime = 0.6;
        sparkles.maxLifeTime = 1.2;
        sparkles.emitRate = 100;
        sparkles.manualEmitCount = 30;
        sparkles.direction1 = new BABYLON.Vector3(-0.5, 3, -0.5);
        sparkles.direction2 = new BABYLON.Vector3(0.5, 5, 0.5);
        sparkles.minEmitPower = 1;
        sparkles.maxEmitPower = 2;
        sparkles.gravity = new BABYLON.Vector3(0, 0.5, 0);
        sparkles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        sparkles.start();

        // Cleanup
        setTimeout(() => {
            centralBurst.dispose();
            ringBurst.dispose();
            sparkles.dispose();
        }, 1500);
    }

    /**
     * Create expanding shockwave ring
     */
    private createShockwave(position: BABYLON.Vector3, color: BABYLON.Color3): void {
        const ring = BABYLON.MeshBuilder.CreateTorus('shockwave', {
            diameter: 0.5,
            thickness: 0.1,
            tessellation: 32
        }, this.scene);
        
        ring.position = position.clone();
        ring.position.y = 0.1;
        ring.rotation.x = Math.PI / 2;
        
        const material = new BABYLON.StandardMaterial('shockwaveMat', this.scene);
        material.emissiveColor = color;
        material.alpha = 0.8;
        material.disableLighting = true;
        ring.material = material;
        
        // Animate expansion and fade
        const animation = new BABYLON.Animation(
            'shockwaveExpand',
            'scaling',
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        animation.setKeys([
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 30, value: new BABYLON.Vector3(8, 8, 1) }
        ]);
        
        const fadeAnimation = new BABYLON.Animation(
            'shockwaveFade',
            'material.alpha',
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        fadeAnimation.setKeys([
            { frame: 0, value: 0.8 },
            { frame: 30, value: 0 }
        ]);
        
        ring.animations = [animation, fadeAnimation];
        
        this.scene.beginAnimation(ring, 0, 30, false, 1, () => {
            ring.dispose();
        });
    }

    /**
     * Screen shake effect
     */
    private screenShake(type: string): void {
        const camera = this.scene.activeCamera;
        if (!camera) return;
        
        const intensity = type === 'ghost' ? 0.15 : 0.1;
        const originalPosition = camera.position.clone();
        
        let shakeCount = 0;
        const maxShakes = 6;
        
        const shakeInterval = setInterval(() => {
            if (shakeCount >= maxShakes) {
                camera.position = originalPosition;
                clearInterval(shakeInterval);
                return;
            }
            
            const decay = 1 - (shakeCount / maxShakes);
            camera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity * decay;
            camera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity * decay;
            shakeCount++;
        }, 30);
    }

    /**
     * Show power-up name popup
     */
    public showPowerUpName(name: string, color: string): void {
        const popup = document.createElement('div');
        popup.className = 'powerup-popup';
        popup.textContent = `⚡ ${name.toUpperCase()}!`;
        popup.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: bold;
            color: ${color};
            text-shadow: 0 0 20px ${color}, 0 0 40px ${color};
            z-index: 1001;
            animation: powerupPopup 0.8s ease-out forwards;
            pointer-events: none;
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 800);
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        if (this.overlayElement) {
            this.overlayElement.remove();
        }
        this.activeEffects.forEach(effect => effect.stop?.());
        this.activeEffects.clear();
    }
}

// CSS animation (add to global styles)
const style = document.createElement('style');
style.textContent = `
    @keyframes powerupPopup {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
        }
        30% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -80%) scale(1);
        }
    }
`;
document.head.appendChild(style);
