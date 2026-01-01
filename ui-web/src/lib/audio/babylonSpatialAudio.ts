/**
 * Babylon Spatial Audio - Integration with Babylon.js 3D Sound System
 * 
 * Features:
 * - attachToMesh for sounds following game objects
 * - Volume rolloff based on distance from camera
 * - 3D spatial panning for immersive audio
 * - Integration with SoundAI for event-driven audio
 * - Footstep synchronization with animations
 */

import {
    Scene,
    Sound,
    Vector3,
    AbstractMesh,
    AnimationGroup
} from '@babylonjs/core';
import { getSoundAI } from './soundAI';

export interface SpatialSoundConfig {
    name: string;
    url: string;
    maxDistance: number;        // Distance at which sound is inaudible
    refDistance: number;        // Distance at which sound is at full volume
    rolloffFactor: number;      // How quickly volume drops with distance
    loop: boolean;
    volume: number;
    autoplay: boolean;
    spatialSound: boolean;
}

interface TrackedSound {
    sound: Sound;
    mesh: AbstractMesh | null;
    config: SpatialSoundConfig;
}

// Default sound configurations for game elements
const SPATIAL_SOUND_CONFIGS: Record<string, Partial<SpatialSoundConfig>> = {
    chaser_hover: {
        maxDistance: 20,
        refDistance: 2,
        rolloffFactor: 1.5,
        loop: true,
        volume: 0.6
    },
    footstep: {
        maxDistance: 10,
        refDistance: 1,
        rolloffFactor: 2,
        loop: false,
        volume: 0.4
    },
    pellet_collect: {
        maxDistance: 15,
        refDistance: 3,
        rolloffFactor: 1,
        loop: false,
        volume: 0.7
    },
    powerup_active: {
        maxDistance: 25,
        refDistance: 5,
        rolloffFactor: 1,
        loop: true,
        volume: 0.8
    },
    ghost_siren: {
        maxDistance: 30,
        refDistance: 8,
        rolloffFactor: 0.8,
        loop: true,
        volume: 0.5
    }
};

/**
 * BabylonSpatialAudio - 3D positional audio using Babylon.js
 */
export class BabylonSpatialAudio {
    private scene: Scene;
    private sounds: Map<string, TrackedSound> = new Map();
    private listenerPosition: Vector3 = Vector3.Zero();
    private enabled: boolean = true;
    private masterVolume: number = 1.0;
    
    // Footstep synchronization
    private footstepInterval: number | null = null;
    private lastFootstepTime: number = 0;
    private footstepCooldown: number = 200; // ms between footsteps

    constructor(scene: Scene) {
        this.scene = scene;
        
        // Update listener position each frame (follows camera)
        scene.onBeforeRenderObservable.add(() => {
            if (scene.activeCamera) {
                this.listenerPosition = scene.activeCamera.position.clone();
            }
        });
    }

    /**
     * Get current listener position
     */
    getListenerPosition(): Vector3 {
        return this.listenerPosition;
    }

    /**
     * Create and attach a spatial sound to a mesh
     */
    attachSoundToMesh(
        soundId: string,
        mesh: AbstractMesh,
        config?: Partial<SpatialSoundConfig>
    ): Sound | null {
        if (!this.enabled) return null;

        const defaultConfig = SPATIAL_SOUND_CONFIGS[soundId] || {};
        const finalConfig: SpatialSoundConfig = {
            name: soundId,
            url: `/audio/sfx/${soundId}.mp3`,
            maxDistance: 20,
            refDistance: 2,
            rolloffFactor: 1,
            loop: false,
            volume: 0.7,
            autoplay: false,
            spatialSound: true,
            ...defaultConfig,
            ...config
        };

        try {
            const sound = new Sound(
                finalConfig.name,
                finalConfig.url,
                this.scene,
                null, // Ready callback
                {
                    loop: finalConfig.loop,
                    autoplay: finalConfig.autoplay,
                    spatialSound: true,
                    maxDistance: finalConfig.maxDistance,
                    refDistance: finalConfig.refDistance,
                    rolloffFactor: finalConfig.rolloffFactor,
                    volume: finalConfig.volume * this.masterVolume
                }
            );

            // Attach to mesh
            sound.attachToMesh(mesh);

            // Track the sound
            this.sounds.set(`${soundId}_${mesh.name}`, {
                sound,
                mesh,
                config: finalConfig
            });

            console.log(`🔊 Attached spatial sound "${soundId}" to mesh "${mesh.name}"`);
            return sound;
        } catch (error) {
            console.warn(`Failed to attach sound ${soundId}:`, error);
            return null;
        }
    }

    /**
     * Play a spatial sound at a specific position
     */
    playSoundAtPosition(
        soundId: string,
        position: Vector3,
        config?: Partial<SpatialSoundConfig>
    ): Sound | null {
        if (!this.enabled) return null;

        const defaultConfig = SPATIAL_SOUND_CONFIGS[soundId] || {};
        const finalConfig: SpatialSoundConfig = {
            name: soundId,
            url: `/audio/sfx/${soundId}.mp3`,
            maxDistance: 20,
            refDistance: 2,
            rolloffFactor: 1,
            loop: false,
            volume: 0.7,
            autoplay: true,
            spatialSound: true,
            ...defaultConfig,
            ...config
        };

        try {
            const sound = new Sound(
                `${finalConfig.name}_${Date.now()}`,
                finalConfig.url,
                this.scene,
                () => {
                    // Auto-dispose after playing (for one-shot sounds)
                    if (!finalConfig.loop) {
                        sound.onEndedObservable.addOnce(() => {
                            sound.dispose();
                        });
                    }
                },
                {
                    loop: finalConfig.loop,
                    autoplay: true,
                    spatialSound: true,
                    maxDistance: finalConfig.maxDistance,
                    refDistance: finalConfig.refDistance,
                    rolloffFactor: finalConfig.rolloffFactor,
                    volume: finalConfig.volume * this.masterVolume
                }
            );

            // Set position
            sound.setPosition(position);

            return sound;
        } catch (error) {
            console.warn(`Failed to play spatial sound ${soundId}:`, error);
            return null;
        }
    }

    /**
     * Start footstep synchronization with player movement
     */
    startFootstepSync(
        playerMesh: AbstractMesh,
        animationGroup?: AnimationGroup,
        footstepSoundId: string = 'footstep'
    ): void {
        // Stop any existing sync
        this.stopFootstepSync();

        if (animationGroup) {
            // Sync with animation keyframes
            let frameCount = 0;
            const framesPerFootstep = 15; // Adjust based on animation

            animationGroup.onAnimationGroupPlayObservable.add(() => {
                frameCount = 0;
            });

            // Use frame-based sync
            this.scene.onBeforeRenderObservable.add(() => {
                if (animationGroup.isPlaying) {
                    frameCount++;
                    if (frameCount % framesPerFootstep === 0) {
                        this.playFootstep(playerMesh.position, footstepSoundId);
                    }
                }
            });
        } else {
            // Fallback: interval-based footsteps when moving
            let lastPosition = playerMesh.position.clone();
            
            this.footstepInterval = window.setInterval(() => {
                const currentPos = playerMesh.position;
                const distance = Vector3.Distance(lastPosition, currentPos);
                
                // Only play footstep if moving
                if (distance > 0.1) {
                    this.playFootstep(currentPos, footstepSoundId);
                    lastPosition = currentPos.clone();
                }
            }, this.footstepCooldown);
        }

        console.log('👣 Footstep synchronization started');
    }

    /**
     * Play a single footstep sound
     */
    private playFootstep(position: Vector3, _soundId: string): void {
        const now = Date.now();
        if (now - this.lastFootstepTime < this.footstepCooldown) return;
        
        this.lastFootstepTime = now;
        
        // Use SoundAI for event-driven handling
        getSoundAI().handleEvent('footstep', {
            playerPosition: { x: position.x, y: position.y, z: position.z }
        });
    }

    /**
     * Stop footstep synchronization
     */
    stopFootstepSync(): void {
        if (this.footstepInterval !== null) {
            clearInterval(this.footstepInterval);
            this.footstepInterval = null;
        }
    }

    /**
     * Setup ghost/chaser spatial audio
     */
    setupChaserAudio(chaserMesh: AbstractMesh): Sound | null {
        return this.attachSoundToMesh('ghost_siren', chaserMesh, {
            loop: true,
            autoplay: true,
            volume: 0.4
        });
    }

    /**
     * Update chaser audio intensity based on distance to player
     */
    updateChaserIntensity(chaserMesh: AbstractMesh, playerPosition: Vector3): void {
        const key = `ghost_siren_${chaserMesh.name}`;
        const tracked = this.sounds.get(key);
        
        if (!tracked) return;
        
        const distance = Vector3.Distance(chaserMesh.position, playerPosition);
        const maxDistance = tracked.config.maxDistance;
        
        // Calculate intensity (0-1) based on distance
        const intensity = Math.max(0, 1 - (distance / maxDistance));
        
        // Adjust volume based on intensity
        tracked.sound.setVolume(
            tracked.config.volume * intensity * this.masterVolume
        );

        // Trigger SoundAI events based on distance
        if (distance < 5) {
            getSoundAI().handleEvent('chaser_nearby', { chaserDistance: distance });
        }
    }

    /**
     * Play power-up activation sound at position
     */
    playPowerUpSound(position: Vector3, powerUpType: string): void {
        getSoundAI().handleEvent('powerup_activated', {
            playerPosition: { x: position.x, y: position.y, z: position.z },
            powerUpType
        });

        // Also play spatial version
        this.playSoundAtPosition('powerup_active', position, {
            volume: 0.8,
            loop: false
        });
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // Update all tracked sounds
        this.sounds.forEach(tracked => {
            tracked.sound.setVolume(tracked.config.volume * this.masterVolume);
        });
    }

    /**
     * Enable/disable spatial audio
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (!enabled) {
            // Stop all sounds
            this.sounds.forEach(tracked => {
                tracked.sound.stop();
            });
        }
    }

    /**
     * Stop and dispose a specific sound
     */
    stopSound(soundId: string, meshName?: string): void {
        const key = meshName ? `${soundId}_${meshName}` : soundId;
        const tracked = this.sounds.get(key);
        
        if (tracked) {
            tracked.sound.stop();
            tracked.sound.dispose();
            this.sounds.delete(key);
        }
    }

    /**
     * Dispose all sounds and cleanup
     */
    dispose(): void {
        this.stopFootstepSync();
        
        this.sounds.forEach(tracked => {
            tracked.sound.stop();
            tracked.sound.dispose();
        });
        
        this.sounds.clear();
    }
}

// Singleton instance
let babylonSpatialAudioInstance: BabylonSpatialAudio | null = null;

export function getBabylonSpatialAudio(scene?: Scene): BabylonSpatialAudio | null {
    if (!babylonSpatialAudioInstance && scene) {
        babylonSpatialAudioInstance = new BabylonSpatialAudio(scene);
    }
    return babylonSpatialAudioInstance;
}

export function initBabylonSpatialAudio(scene: Scene): BabylonSpatialAudio {
    if (babylonSpatialAudioInstance) {
        babylonSpatialAudioInstance.dispose();
    }
    babylonSpatialAudioInstance = new BabylonSpatialAudio(scene);
    return babylonSpatialAudioInstance;
}

export default BabylonSpatialAudio;
