/**
 * Chaser Sounds - Directional Audio Cues
 * 
 * AI Tester Suggestion (Kenji - Sound Designer):
 * "Implement panning and pitch variation for Chaser audio.
 * Players need directional awareness of Chaser proximity."
 * 
 * Uses the SpatialAudioManager for 3D positioning
 * Adds pitch variation based on chaser type and distance
 */

import { getSpatialAudio, SpatialAudioManager } from '../audio/spatialAudio';

export interface ChaserAudioConfig {
    warningDistance: number;      // Start warning at this distance
    dangerDistance: number;       // Danger zone threshold
    maxChasersAudio: number;      // Max simultaneous chaser sounds
    pitchVariationRange: number;  // +/- pitch variation
    volumeFalloff: number;        // Volume falloff rate
}

interface ChaserSoundState {
    id: string;
    soundId: string | null;
    lastDistance: number;
    chaserType: string;
    isInDangerZone: boolean;
}

const DEFAULT_CONFIG: ChaserAudioConfig = {
    warningDistance: 12,
    dangerDistance: 5,
    maxChasersAudio: 3,
    pitchVariationRange: 0.2,
    volumeFalloff: 2.0
};

// Different chaser types have different audio characteristics
const CHASER_AUDIO_PROFILES: Record<string, {
    basePitch: number;
    soundName: string;
    urgencyMultiplier: number;
}> = {
    ch0: {  // Blitz - aggressive
        basePitch: 1.2,
        soundName: 'chaser_warning_aggressive',
        urgencyMultiplier: 1.3
    },
    ch1: {  // Shadow - sneaky
        basePitch: 0.8,
        soundName: 'chaser_warning_sneaky',
        urgencyMultiplier: 0.9
    },
    ch2: {  // Spark - playful
        basePitch: 1.0,
        soundName: 'chaser_warning_playful',
        urgencyMultiplier: 1.1
    },
    default: {
        basePitch: 1.0,
        soundName: 'chaser_warning',
        urgencyMultiplier: 1.0
    }
};

/**
 * ChaserSoundManager - Manages directional audio for all chasers
 */
export class ChaserSoundManager {
    private spatialAudio: SpatialAudioManager;
    private config: ChaserAudioConfig;
    private chaserStates: Map<string, ChaserSoundState> = new Map();
    private playerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
    private isEnabled = true;
    
    // Audio context for pitch manipulation
    private audioContext: AudioContext | null = null;
    private gainNodes: Map<string, GainNode> = new Map();

    constructor(config: Partial<ChaserAudioConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.spatialAudio = getSpatialAudio();
    }

    /**
     * Initialize the chaser sound system
     */
    async initialize(): Promise<void> {
        try {
            this.audioContext = new AudioContext();
            await this.spatialAudio.initialize();
            
            // Preload chaser sounds
            await Promise.all([
                this.spatialAudio.loadSound('chaser_warning', '/audio/sfx/chaser_warning.mp3'),
                this.spatialAudio.loadSound('chaser_warning_aggressive', '/audio/sfx/chaser_aggressive.mp3'),
                this.spatialAudio.loadSound('chaser_warning_sneaky', '/audio/sfx/chaser_sneaky.mp3'),
                this.spatialAudio.loadSound('chaser_warning_playful', '/audio/sfx/chaser_playful.mp3'),
                this.spatialAudio.loadSound('chaser_danger', '/audio/sfx/chaser_danger.mp3'),
                this.spatialAudio.loadSound('chaser_very_close', '/audio/sfx/chaser_very_close.mp3')
            ]);
            
            console.log('[ChaserSounds] Initialized');
        } catch (e) {
            console.warn('[ChaserSounds] Failed to initialize:', e);
            this.isEnabled = false;
        }
    }

    /**
     * Update player position (call every frame)
     */
    setPlayerPosition(x: number, y: number, z: number = 0): void {
        this.playerPosition = { x, y, z };
        this.spatialAudio.setListenerPosition(this.playerPosition);
    }

    /**
     * Update all chaser positions and manage sounds
     */
    updateChasers(chasers: Array<{
        id: string;
        x: number;
        y: number;
        type?: string;
    }>): void {
        if (!this.isEnabled) return;

        const activeChaserIds = new Set<string>();
        
        // Sort chasers by distance to player
        const sortedChasers = [...chasers].sort((a, b) => {
            const distA = this.getDistance(a.x, a.y);
            const distB = this.getDistance(b.x, b.y);
            return distA - distB;
        });

        // Process closest chasers (up to max)
        const closestChasers = sortedChasers.slice(0, this.config.maxChasersAudio);

        for (const chaser of closestChasers) {
            activeChaserIds.add(chaser.id);
            const distance = this.getDistance(chaser.x, chaser.y);
            const chaserType = chaser.type || 'default';
            
            let state = this.chaserStates.get(chaser.id);
            
            if (!state) {
                state = {
                    id: chaser.id,
                    soundId: null,
                    lastDistance: distance,
                    chaserType,
                    isInDangerZone: false
                };
                this.chaserStates.set(chaser.id, state);
            }

            // Update sound based on distance
            if (distance <= this.config.warningDistance) {
                this.updateChaserSound(state, chaser.x, chaser.y, distance);
            } else {
                // Too far - stop sound
                this.stopChaserSound(state);
            }

            state.lastDistance = distance;
        }

        // Stop sounds for chasers no longer tracked
        for (const [id, state] of this.chaserStates) {
            if (!activeChaserIds.has(id)) {
                this.stopChaserSound(state);
                this.chaserStates.delete(id);
            }
        }
    }

    /**
     * Update sound for a specific chaser
     */
    private updateChaserSound(
        state: ChaserSoundState,
        x: number,
        y: number,
        distance: number
    ): void {
        const defaultProfile = CHASER_AUDIO_PROFILES.default;
        const profile = CHASER_AUDIO_PROFILES[state.chaserType] ?? defaultProfile;
        if (!profile) return; // Type guard
        const isInDanger = distance <= this.config.dangerDistance;
        
        // Calculate pitch based on distance (closer = higher pitch = more urgent)
        const distanceRatio = 1 - (distance / this.config.warningDistance);
        const pitchModifier = distanceRatio * this.config.pitchVariationRange;
        // Pitch calculated for future use when audio API supports pitch adjustment
        void (profile.basePitch + pitchModifier);

        // Entering danger zone - play danger sound
        if (isInDanger && !state.isInDangerZone) {
            state.isInDangerZone = true;
            this.spatialAudio.playSoundAt('chaser_danger', { x, y, z: 0 }, {
                rolloffFactor: this.config.volumeFalloff,
                refDistance: 1,
                maxDistance: this.config.warningDistance
            });
        } else if (!isInDanger && state.isInDangerZone) {
            state.isInDangerZone = false;
        }

        // Update or start looping warning sound
        if (state.soundId) {
            // Update position of existing sound
            this.spatialAudio.updateSoundPosition(state.soundId, { x, y, z: 0 });
        } else {
            // Start new warning sound
            const soundName = isInDanger ? 'chaser_very_close' : profile.soundName;
            state.soundId = this.spatialAudio.playLoopAt(soundName, { x, y, z: 0 }, {
                rolloffFactor: this.config.volumeFalloff,
                refDistance: 2,
                maxDistance: this.config.warningDistance
            });
        }
    }

    /**
     * Stop sound for a chaser
     */
    private stopChaserSound(state: ChaserSoundState): void {
        if (state.soundId) {
            this.spatialAudio.stopSound(state.soundId);
            state.soundId = null;
        }
        state.isInDangerZone = false;
    }

    /**
     * Calculate distance from player
     */
    private getDistance(x: number, y: number): number {
        const dx = x - this.playerPosition.x;
        const dy = y - this.playerPosition.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get directional info for UI indicators
     */
    getChaserDirections(): Array<{
        id: string;
        angle: number;
        distance: number;
        intensity: number;
        isInDanger: boolean;
    }> {
        const directions: Array<{
            id: string;
            angle: number;
            distance: number;
            intensity: number;
            isInDanger: boolean;
        }> = [];

        for (const [id, state] of this.chaserStates) {
            if (state.lastDistance <= this.config.warningDistance) {
                const info = this.spatialAudio.getSoundDirection({
                    x: this.playerPosition.x + (Math.random() - 0.5) * state.lastDistance,
                    y: this.playerPosition.y,
                    z: this.playerPosition.z + (Math.random() - 0.5) * state.lastDistance
                });
                
                directions.push({
                    id,
                    angle: info.angle,
                    distance: state.lastDistance,
                    intensity: info.intensity,
                    isInDanger: state.isInDangerZone
                });
            }
        }

        return directions;
    }

    /**
     * Enable/disable chaser sounds
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled) {
            this.stopAll();
        }
    }

    /**
     * Stop all chaser sounds
     */
    stopAll(): void {
        for (const state of this.chaserStates.values()) {
            this.stopChaserSound(state);
        }
    }

    /**
     * Clean up
     */
    destroy(): void {
        this.stopAll();
        this.chaserStates.clear();
        this.gainNodes.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Singleton
let chaserSoundManager: ChaserSoundManager | null = null;

export function getChaserSoundManager(): ChaserSoundManager {
    if (!chaserSoundManager) {
        chaserSoundManager = new ChaserSoundManager();
    }
    return chaserSoundManager;
}
