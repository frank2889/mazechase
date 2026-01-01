/**
 * Pellet Collection Sound System
 * 
 * AI Tester Suggestion (Kenji - Sound Designer):
 * "Create layered pellet collection sounds. Base pop sound
 * with pitch variation, combo multiplier stacking, and
 * musical scale progression for streak rewards."
 * 
 * Features:
 * - Base collection sound with pitch variation
 * - Combo sound layering (more layers = bigger combo)
 * - Musical scale progression
 * - Streak milestone celebration sounds
 * - Power pellet special collection effect
 */

export interface PelletSoundConfig {
    baseVolume: number;
    pitchVariation: number;      // Random pitch range
    pitchVariationMode: 'random' | 'musical' | 'dynamic'; // Kenji's enhanced modes
    dynamicPitchFactor: number;  // Speed-based pitch adjustment
    comboMaxLayers: number;      // Max simultaneous combo layers
    scaleProgression: boolean;   // Use musical scale for streaks
    spatialAudio: boolean;       // 3D positioned sounds
    harmonicOvertones: boolean;  // Add subtle harmonic layers
}

type PelletType = 'normal' | 'power' | 'bonus' | 'special';

const DEFAULT_CONFIG: PelletSoundConfig = {
    baseVolume: 0.5,
    pitchVariation: 0.15,
    pitchVariationMode: 'dynamic', // EMMSOAI: More satisfying variation
    dynamicPitchFactor: 0.3,
    comboMaxLayers: 5,
    scaleProgression: true,
    spatialAudio: true,
    harmonicOvertones: true
};

// Musical scale for melodic progression (C major pentatonic)
const SCALE_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

/**
 * PelletSoundManager - Enhanced pellet collection audio
 */
export class PelletSoundManager {
    private config: PelletSoundConfig;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    
    // Pre-loaded sound buffers
    private soundBuffers: Map<string, AudioBuffer> = new Map();
    
    // Combo tracking
    private comboCount = 0;
    private lastCollectTime = 0;
    private comboTimeout = 800; // ms before combo resets
    
    // Active sound nodes
    private activeNodes: Set<AudioBufferSourceNode> = new Set();

    constructor(config: Partial<PelletSoundConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize audio system and preload sounds
     */
    async initialize(): Promise<void> {
        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.config.baseVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Preload sound buffers
            await this.preloadSounds();
            
            console.log('[PelletSound] Initialized');
        } catch (e) {
            console.warn('[PelletSound] Failed to initialize:', e);
        }
    }

    /**
     * Preload all pellet sounds
     */
    private async preloadSounds(): Promise<void> {
        const sounds = [
            { id: 'pop_base', url: '/audio/sfx/pellet_pop.mp3' },
            { id: 'pop_power', url: '/audio/sfx/pellet_power.mp3' },
            { id: 'pop_bonus', url: '/audio/sfx/pellet_bonus.mp3' },
            { id: 'pop_special', url: '/audio/sfx/pellet_special.mp3' },
            { id: 'combo_layer', url: '/audio/sfx/combo_chime.mp3' },
            { id: 'streak_5', url: '/audio/sfx/streak_5.mp3' },
            { id: 'streak_10', url: '/audio/sfx/streak_10.mp3' },
            { id: 'streak_25', url: '/audio/sfx/streak_25.mp3' },
            { id: 'streak_50', url: '/audio/sfx/streak_50.mp3' }
        ];

        for (const sound of sounds) {
            await this.loadSound(sound.id, sound.url);
        }
    }

    /**
     * Load a single sound file
     */
    private async loadSound(id: string, url: string): Promise<void> {
        if (!this.audioContext) return;

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(id, audioBuffer);
        } catch (e) {
            // Create synthetic sound as fallback
            this.soundBuffers.set(id, this.createSyntheticPop());
        }
    }

    /**
     * Create synthetic pop sound for fallback
     */
    private createSyntheticPop(): AudioBuffer {
        if (!this.audioContext) {
            throw new Error('No audio context');
        }

        const duration = 0.1;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        // Simple pop: sine wave with fast decay
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 40);
            const freq = 880 + Math.random() * 200;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
        }

        return buffer;
    }

    /**
     * Play pellet collection sound
     */
    playCollect(
        type: PelletType = 'normal',
        position?: { x: number; y: number; z: number }
    ): void {
        if (!this.audioContext || !this.masterGain) return;

        const now = Date.now();
        
        // Update combo
        if (now - this.lastCollectTime > this.comboTimeout) {
            this.comboCount = 0;
        }
        this.comboCount++;
        this.lastCollectTime = now;

        // Play base sound with pitch variation
        const baseSoundId = this.getBaseSoundId(type);
        this.playSound(baseSoundId, this.calculatePitch(), position);

        // Add combo layers
        if (this.comboCount > 1) {
            this.playComboLayers(position);
        }

        // Check for streak milestones
        this.checkStreakMilestone();
    }

    /**
     * Get base sound ID for pellet type
     */
    private getBaseSoundId(type: PelletType): string {
        switch (type) {
            case 'power': return 'pop_power';
            case 'bonus': return 'pop_bonus';
            case 'special': return 'pop_special';
            default: return 'pop_base';
        }
    }

    /**
     * Calculate pitch based on config and scale progression
     * EMMSOAI Enhancement (Kenji): Added dynamic pitch variation modes
     */
    private calculatePitch(playerSpeed: number = 0): number {
        let basePitch = 1.0;
        
        if (this.config.scaleProgression && this.comboCount > 1) {
            // Use musical scale for pleasing progression
            const scaleIndex = (this.comboCount - 1) % SCALE_SEMITONES.length;
            const semitones = SCALE_SEMITONES[scaleIndex] ?? 0;
            basePitch = Math.pow(2, semitones / 12);
        }

        // Apply pitch variation based on mode
        let variation = 0;
        
        switch (this.config.pitchVariationMode) {
            case 'random':
                // Pure random variation
                variation = (Math.random() - 0.5) * 2 * this.config.pitchVariation;
                break;
                
            case 'musical':
                // Quantize to nearest semitone for musical feel
                const randomSemitones = Math.round((Math.random() - 0.5) * 4);
                variation = Math.pow(2, randomSemitones / 12) - 1;
                break;
                
            case 'dynamic':
                // Speed-based pitch + small random variation
                const speedFactor = Math.min(playerSpeed / 20, 1) * this.config.dynamicPitchFactor;
                const randomPart = (Math.random() - 0.5) * this.config.pitchVariation;
                variation = speedFactor + randomPart;
                break;
        }
        
        return basePitch * (1 + variation);
    }

    /**
     * Play harmonic overtone layer for richer sound
     * EMMSOAI Addition (Kenji): Subtle harmonics make collection more satisfying
     */
    private playHarmonicOvertone(
        position?: { x: number; y: number; z: number },
        basePitch: number = 1.0
    ): void {
        if (!this.config.harmonicOvertones) return;
        
        // Play subtle octave harmonic
        setTimeout(() => {
            this.playSound('pop_base', basePitch * 2, position, 0.15);
        }, 10);
        
        // Fifth harmonic for richness on combos
        if (this.comboCount > 5) {
            setTimeout(() => {
                this.playSound('pop_base', basePitch * 1.5, position, 0.1);
            }, 20);
        }
    }

    /**
     * Play combo layer sounds
     */
    private playComboLayers(position?: { x: number; y: number; z: number }): void {
        const numLayers = Math.min(
            Math.floor(this.comboCount / 3),
            this.config.comboMaxLayers
        );

        for (let i = 0; i < numLayers; i++) {
            // Delay each layer slightly
            setTimeout(() => {
                const layerPitch = 1 + (i * 0.2);
                const layerVolume = 0.3 - (i * 0.05);
                this.playSound('combo_layer', layerPitch, position, layerVolume);
            }, i * 30);
        }
    }

    /**
     * Check and play streak milestone sounds
     */
    private checkStreakMilestone(): void {
        const milestones = [
            { count: 50, sound: 'streak_50' },
            { count: 25, sound: 'streak_25' },
            { count: 10, sound: 'streak_10' },
            { count: 5, sound: 'streak_5' }
        ];

        for (const milestone of milestones) {
            if (this.comboCount === milestone.count) {
                this.playSound(milestone.sound, 1.0, undefined, 0.8);
                console.log(`[PelletSound] Streak milestone: ${milestone.count}!`);
                break;
            }
        }
    }

    /**
     * Play a sound with optional pitch and position
     */
    private playSound(
        soundId: string,
        pitch: number = 1.0,
        position?: { x: number; y: number; z: number },
        volume: number = 1.0
    ): void {
        if (!this.audioContext || !this.masterGain) return;

        const buffer = this.soundBuffers.get(soundId);
        if (!buffer) {
            console.warn(`[PelletSound] Sound not found: ${soundId}`);
            return;
        }

        // Create source node
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        // Create gain for this sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        // Connect through spatial audio if enabled and position provided
        if (this.config.spatialAudio && position) {
            const panner = this.audioContext.createPanner();
            panner.positionX.value = position.x;
            panner.positionY.value = position.y;
            panner.positionZ.value = position.z || 0;
            panner.distanceModel = 'exponential';
            panner.refDistance = 1;
            panner.maxDistance = 50;
            panner.rolloffFactor = 2;

            source.connect(gainNode);
            gainNode.connect(panner);
            panner.connect(this.masterGain);
        } else {
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
        }

        // Track and cleanup
        this.activeNodes.add(source);
        source.onended = () => {
            this.activeNodes.delete(source);
        };

        source.start();
    }

    /**
     * Play power pellet collection (special effect)
     */
    playPowerPelletCollect(position?: { x: number; y: number; z: number }): void {
        this.playCollect('power', position);

        // Additional power-up swoosh
        if (this.audioContext && this.masterGain) {
            this.createPowerSwoosh();
        }
    }

    /**
     * Create synthetic power-up swoosh
     */
    private createPowerSwoosh(): void {
        if (!this.audioContext || !this.masterGain) return;

        const duration = 0.5;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        // Rising frequency sweep
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.sin(Math.PI * t / duration);
            const freq = 200 + (t / duration) * 600;
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.masterGain);
        source.start();
    }

    /**
     * Get current combo count
     */
    getComboCount(): number {
        return this.comboCount;
    }

    /**
     * Reset combo (e.g., when player is caught)
     */
    resetCombo(): void {
        this.comboCount = 0;
    }

    /**
     * Set volume
     */
    setVolume(volume: number): void {
        this.config.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.config.baseVolume;
        }
    }

    /**
     * Clean up
     */
    destroy(): void {
        // Stop all active sounds
        for (const node of this.activeNodes) {
            try {
                node.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        this.activeNodes.clear();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.masterGain = null;
        this.soundBuffers.clear();
    }
}

// Singleton
let pelletSoundManager: PelletSoundManager | null = null;

export function getPelletSoundManager(): PelletSoundManager {
    if (!pelletSoundManager) {
        pelletSoundManager = new PelletSoundManager();
    }
    return pelletSoundManager;
}
