/**
 * Role Swap Animation System
 * 
 * AI Tester Suggestion (Ava - Indie Game Market Analyst):
 * "Add visual and audio cues when roles switch between Runner and Chasers.
 * This is the UNIQUE mechanic - make it feel EPIC!"
 * 
 * Features:
 * - Screen-wide visual effect on role swap
 * - Distinct audio cue
 * - Character transformation animation
 * - UI notification with role indicator
 */

import { Scene, Animation, EasingFunction, CircleEase, Vector3, Color3, MeshBuilder, StandardMaterial, Mesh } from '@babylonjs/core';

export type GameRole = 'runner' | 'chaser';

export interface RoleSwapConfig {
    animationDuration: number;       // Total animation time in ms
    flashIntensity: number;          // Screen flash intensity
    scaleBounceFactor: number;       // Character scale bounce
    colorTransitionTime: number;     // Color change duration
    audioEnabled: boolean;
}

const DEFAULT_CONFIG: RoleSwapConfig = {
    animationDuration: 1500,
    flashIntensity: 0.8,
    scaleBounceFactor: 1.3,
    colorTransitionTime: 500,
    audioEnabled: true
};

// Role-specific colors
const ROLE_COLORS = {
    runner: {
        primary: new Color3(1.0, 0.85, 0.24),      // Golden yellow
        glow: new Color3(1.0, 0.95, 0.5),
        particles: '#FFD93D'
    },
    chaser: {
        primary: new Color3(1.0, 0.42, 0.42),      // Coral red
        glow: new Color3(1.0, 0.6, 0.6),
        particles: '#FF6B6B'
    }
};

/**
 * RoleSwapAnimator - Handles role transition animations
 */
export class RoleSwapAnimator {
    private scene: Scene;
    private config: RoleSwapConfig;
    private isAnimating = false;
    private flashOverlay: Mesh | null = null;
    private flashMaterial: StandardMaterial | null = null;
    private onRoleSwapCallbacks: Array<(newRole: GameRole, previousRole: GameRole) => void> = [];

    constructor(scene: Scene, config: Partial<RoleSwapConfig> = {}) {
        this.scene = scene;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.createFlashOverlay();
    }

    /**
     * Create screen flash overlay
     */
    private createFlashOverlay(): void {
        // Create a plane that covers the screen
        this.flashOverlay = MeshBuilder.CreatePlane('roleSwapFlash', {
            width: 100,
            height: 100
        }, this.scene);
        
        this.flashMaterial = new StandardMaterial('flashMat', this.scene);
        this.flashMaterial.emissiveColor = new Color3(1, 1, 1);
        this.flashMaterial.disableLighting = true;
        this.flashMaterial.alpha = 0;
        
        this.flashOverlay.material = this.flashMaterial;
        this.flashOverlay.isPickable = false;
        this.flashOverlay.setEnabled(false);
        
        // Position in front of camera
        this.flashOverlay.position = new Vector3(0, 5, -10);
        this.flashOverlay.billboardMode = Mesh.BILLBOARDMODE_ALL;
    }

    /**
     * Play role swap animation
     */
    async playRoleSwap(
        playerMesh: Mesh,
        newRole: GameRole,
        previousRole: GameRole
    ): Promise<void> {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        console.log(`[RoleSwap] Animating: ${previousRole} → ${newRole}`);

        // Notify callbacks
        this.onRoleSwapCallbacks.forEach(cb => cb(newRole, previousRole));

        // Play all effects in parallel
        await Promise.all([
            this.playScreenFlash(newRole),
            this.playCharacterTransform(playerMesh, newRole),
            this.playAudioCue(newRole),
            this.showRoleNotification(newRole)
        ]);

        this.isAnimating = false;
    }

    /**
     * Screen flash effect
     */
    private async playScreenFlash(newRole: GameRole): Promise<void> {
        if (!this.flashOverlay || !this.flashMaterial) return;

        const roleColor = ROLE_COLORS[newRole];
        this.flashMaterial.emissiveColor = roleColor.glow;
        this.flashOverlay.setEnabled(true);

        const frameRate = 60;
        const totalFrames = Math.round((this.config.animationDuration / 1000) * frameRate * 0.3);

        // Flash in
        const flashIn = new Animation(
            'flashIn',
            'material.alpha',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        flashIn.setKeys([
            { frame: 0, value: 0 },
            { frame: totalFrames * 0.3, value: this.config.flashIntensity },
            { frame: totalFrames, value: 0 }
        ]);

        const easing = new CircleEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        flashIn.setEasingFunction(easing);

        this.flashOverlay.animations = [flashIn];

        return new Promise((resolve) => {
            this.scene.beginAnimation(this.flashOverlay, 0, totalFrames, false, 1, () => {
                this.flashOverlay?.setEnabled(false);
                resolve();
            });
        });
    }

    /**
     * Character transformation animation
     */
    private async playCharacterTransform(mesh: Mesh, newRole: GameRole): Promise<void> {
        const roleColor = ROLE_COLORS[newRole];
        const frameRate = 60;
        const totalFrames = Math.round((this.config.animationDuration / 1000) * frameRate);

        // Scale bounce animation
        const scaleAnim = new Animation(
            'roleSwapScale',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const baseScale = mesh.scaling.clone();
        const bouncedScale = baseScale.scale(this.config.scaleBounceFactor);

        scaleAnim.setKeys([
            { frame: 0, value: baseScale },
            { frame: totalFrames * 0.2, value: bouncedScale },
            { frame: totalFrames * 0.5, value: baseScale.scale(0.8) },
            { frame: totalFrames * 0.7, value: baseScale.scale(1.1) },
            { frame: totalFrames, value: baseScale }
        ]);

        // Rotation spin animation
        const rotationAnim = new Animation(
            'roleSwapRotation',
            'rotation.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const startRotation = mesh.rotation.y;
        rotationAnim.setKeys([
            { frame: 0, value: startRotation },
            { frame: totalFrames * 0.5, value: startRotation + Math.PI },
            { frame: totalFrames, value: startRotation + Math.PI * 2 }
        ]);

        const easing = new CircleEase();
        easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        scaleAnim.setEasingFunction(easing);
        rotationAnim.setEasingFunction(easing);

        mesh.animations = [scaleAnim, rotationAnim];

        // Color transition (if material supports it)
        if (mesh.material && 'diffuseColor' in mesh.material) {
            const mat = mesh.material as StandardMaterial;
            const colorAnim = new Animation(
                'roleSwapColor',
                'diffuseColor',
                frameRate,
                Animation.ANIMATIONTYPE_COLOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            colorAnim.setKeys([
                { frame: 0, value: mat.diffuseColor.clone() },
                { frame: totalFrames * 0.5, value: new Color3(1, 1, 1) }, // Flash white
                { frame: totalFrames, value: roleColor.primary }
            ]);

            mesh.animations.push(colorAnim);
        }

        return new Promise((resolve) => {
            this.scene.beginAnimation(mesh, 0, totalFrames, false, 1, () => {
                resolve();
            });
        });
    }

    /**
     * Play audio cue for role swap
     */
    private async playAudioCue(newRole: GameRole): Promise<void> {
        if (!this.config.audioEnabled) return;

        try {
            const soundPath = newRole === 'runner' 
                ? '/audio/sfx/role_swap_runner.mp3'
                : '/audio/sfx/role_swap_chaser.mp3';
            
            const audio = new Audio(soundPath);
            audio.volume = 0.7;
            await audio.play();
        } catch (e) {
            // Ignore audio errors
            console.warn('[RoleSwap] Audio playback failed:', e);
        }
    }

    /**
     * Show role notification UI
     */
    private async showRoleNotification(newRole: GameRole): Promise<void> {
        // Dispatch event for UI layer to handle
        const event = new CustomEvent('roleSwap', {
            detail: {
                newRole,
                message: newRole === 'runner' 
                    ? '🏃 YOU ARE THE RUNNER!' 
                    : '👻 YOU ARE NOW A CHASER!',
                color: ROLE_COLORS[newRole].particles
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Register callback for role swap events
     */
    onRoleSwap(callback: (newRole: GameRole, previousRole: GameRole) => void): () => void {
        this.onRoleSwapCallbacks.push(callback);
        return () => {
            const index = this.onRoleSwapCallbacks.indexOf(callback);
            if (index > -1) this.onRoleSwapCallbacks.splice(index, 1);
        };
    }

    /**
     * Check if animation is currently playing
     */
    isPlaying(): boolean {
        return this.isAnimating;
    }

    /**
     * Clean up
     */
    destroy(): void {
        if (this.flashOverlay) {
            this.flashOverlay.dispose();
            this.flashOverlay = null;
        }
        if (this.flashMaterial) {
            this.flashMaterial.dispose();
            this.flashMaterial = null;
        }
        this.onRoleSwapCallbacks = [];
    }
}

/**
 * Role Swap UI Notification Component
 * Shows a dramatic banner when roles swap
 */
export function createRoleSwapNotification(): {
    show: (role: GameRole, message: string) => void;
    hide: () => void;
} {
    let container: HTMLDivElement | null = null;
    let hideTimeout: number | null = null;

    const create = () => {
        container = document.createElement('div');
        container.id = 'role-swap-notification';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            z-index: 9999;
            padding: 24px 48px;
            border-radius: 16px;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
        `;
        document.body.appendChild(container);
    };

    return {
        show: (role: GameRole, message: string) => {
            if (!container) create();
            if (!container) return;

            const color = role === 'runner' ? '#FFD93D' : '#FF6B6B';
            const bgColor = role === 'runner' 
                ? 'rgba(255, 217, 61, 0.2)' 
                : 'rgba(255, 107, 107, 0.2)';
            
            container.style.backgroundColor = bgColor;
            container.style.border = `3px solid ${color}`;
            container.style.boxShadow = `0 0 40px ${color}`;
            container.textContent = message;
            
            // Animate in
            requestAnimationFrame(() => {
                if (container) {
                    container.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            });

            // Auto hide after 2 seconds
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = window.setTimeout(() => {
                if (container) {
                    container.style.transform = 'translate(-50%, -50%) scale(0)';
                }
            }, 2000);
        },
        hide: () => {
            if (container) {
                container.style.transform = 'translate(-50%, -50%) scale(0)';
            }
        }
    };
}

// Auto-initialize role swap notification listener
if (typeof window !== 'undefined') {
    const notification = createRoleSwapNotification();
    
    window.addEventListener('roleSwap', ((event: CustomEvent) => {
        const { newRole, message } = event.detail;
        notification.show(newRole, message);
    }) as EventListener);
}
