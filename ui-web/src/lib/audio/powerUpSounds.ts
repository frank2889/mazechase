/**
 * Power-Up Sound Effects
 * 
 * AI Tester Suggestion (Kenji - Audio Specialist):
 * "Voeg unieke geluiden toe per power-up type.
 * Momenteel zijn power-up sounds niet onderscheidend."
 * 
 * Features:
 * - Unique sound per power-up
 * - Procedural audio generation
 * - Active/expired feedback
 * - Web Audio API
 */

export type PowerUpType = 
    | 'speed_boost'
    | 'invincibility'
    | 'ghost'
    | 'magnet'
    | 'freeze'
    | 'teleport'
    | 'shield'
    | 'double_points';

export interface PowerUpSoundConfig {
    type: PowerUpType;
    pickup: SoundDefinition;
    active: SoundDefinition;
    expired: SoundDefinition;
}

export interface SoundDefinition {
    baseFrequency: number;
    harmonics: number[];
    duration: number;
    envelope: EnvelopeConfig;
    modulation?: ModulationConfig;
    filterType?: BiquadFilterType;
    filterFrequency?: number;
}

export interface EnvelopeConfig {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
}

export interface ModulationConfig {
    type: OscillatorType;
    frequency: number;
    depth: number;
}

// Power-up sound configurations
const POWER_UP_SOUNDS: Record<PowerUpType, PowerUpSoundConfig> = {
    speed_boost: {
        type: 'speed_boost',
        pickup: {
            baseFrequency: 440,
            harmonics: [1, 2, 3],
            duration: 0.3,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
            modulation: { type: 'sine', frequency: 8, depth: 30 }
        },
        active: {
            baseFrequency: 880,
            harmonics: [1, 1.5, 2],
            duration: 0.1,
            envelope: { attack: 0.02, decay: 0.05, sustain: 0.5, release: 0.03 },
            modulation: { type: 'sawtooth', frequency: 16, depth: 10 }
        },
        expired: {
            baseFrequency: 330,
            harmonics: [1, 2],
            duration: 0.5,
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 }
        }
    },
    invincibility: {
        type: 'invincibility',
        pickup: {
            baseFrequency: 523,
            harmonics: [1, 2, 3, 4],
            duration: 0.5,
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.3 },
            filterType: 'bandpass',
            filterFrequency: 1000
        },
        active: {
            baseFrequency: 698,
            harmonics: [1, 1.25, 1.5],
            duration: 0.15,
            envelope: { attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.05 }
        },
        expired: {
            baseFrequency: 392,
            harmonics: [1, 2, 3],
            duration: 0.6,
            envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.2 }
        }
    },
    ghost: {
        type: 'ghost',
        pickup: {
            baseFrequency: 220,
            harmonics: [1, 3, 5],
            duration: 0.6,
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.3 },
            modulation: { type: 'sine', frequency: 2, depth: 50 },
            filterType: 'lowpass',
            filterFrequency: 800
        },
        active: {
            baseFrequency: 180,
            harmonics: [1, 2, 4],
            duration: 0.2,
            envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 0.05 }
        },
        expired: {
            baseFrequency: 150,
            harmonics: [1, 2],
            duration: 0.4,
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.05, release: 0.1 }
        }
    },
    magnet: {
        type: 'magnet',
        pickup: {
            baseFrequency: 330,
            harmonics: [1, 1.5, 2, 2.5],
            duration: 0.4,
            envelope: { attack: 0.02, decay: 0.15, sustain: 0.4, release: 0.25 },
            modulation: { type: 'triangle', frequency: 6, depth: 40 }
        },
        active: {
            baseFrequency: 440,
            harmonics: [1, 1.2, 1.4],
            duration: 0.1,
            envelope: { attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.05 }
        },
        expired: {
            baseFrequency: 247,
            harmonics: [1, 2],
            duration: 0.3,
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.1 }
        }
    },
    freeze: {
        type: 'freeze',
        pickup: {
            baseFrequency: 2000,
            harmonics: [1, 2, 4, 8],
            duration: 0.3,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2 },
            filterType: 'highpass',
            filterFrequency: 1500
        },
        active: {
            baseFrequency: 1500,
            harmonics: [1, 3, 5],
            duration: 0.15,
            envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.1 }
        },
        expired: {
            baseFrequency: 800,
            harmonics: [1, 2],
            duration: 0.4,
            envelope: { attack: 0.01, decay: 0.25, sustain: 0.1, release: 0.15 }
        }
    },
    teleport: {
        type: 'teleport',
        pickup: {
            baseFrequency: 200,
            harmonics: [1, 2, 3, 4, 5, 6],
            duration: 0.4,
            envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.25 },
            modulation: { type: 'sawtooth', frequency: 20, depth: 200 }
        },
        active: {
            baseFrequency: 600,
            harmonics: [1, 2, 4],
            duration: 0.25,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.15 }
        },
        expired: {
            baseFrequency: 300,
            harmonics: [1, 2, 3],
            duration: 0.3,
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.1 }
        }
    },
    shield: {
        type: 'shield',
        pickup: {
            baseFrequency: 392,
            harmonics: [1, 1.5, 2, 2.5, 3],
            duration: 0.5,
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.25 },
            filterType: 'bandpass',
            filterFrequency: 600
        },
        active: {
            baseFrequency: 500,
            harmonics: [1, 1.25],
            duration: 0.12,
            envelope: { attack: 0.02, decay: 0.05, sustain: 0.4, release: 0.05 }
        },
        expired: {
            baseFrequency: 294,
            harmonics: [1, 2, 3],
            duration: 0.6,
            envelope: { attack: 0.02, decay: 0.35, sustain: 0.1, release: 0.25 }
        }
    },
    double_points: {
        type: 'double_points',
        pickup: {
            baseFrequency: 523,
            harmonics: [1, 2, 3, 4, 5],
            duration: 0.4,
            envelope: { attack: 0.02, decay: 0.15, sustain: 0.35, release: 0.2 }
        },
        active: {
            baseFrequency: 784,
            harmonics: [1, 1.5, 2],
            duration: 0.08,
            envelope: { attack: 0.01, decay: 0.03, sustain: 0.5, release: 0.03 }
        },
        expired: {
            baseFrequency: 349,
            harmonics: [1, 2],
            duration: 0.4,
            envelope: { attack: 0.01, decay: 0.25, sustain: 0.1, release: 0.15 }
        }
    }
};

/**
 * PowerUpSoundManager - Procedural power-up audio
 */
export class PowerUpSoundManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private activeLoops: Map<PowerUpType, OscillatorNode[]> = new Map();
    private volume: number = 0.6;

    constructor() {
        this.initAudio();
    }

    /**
     * Initialize audio context
     */
    private initAudio(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
        } catch (e) {
            console.error('[PowerUpSounds] Failed to init audio:', e);
        }
    }

    /**
     * Resume audio context (for user interaction requirement)
     */
    async resume(): Promise<void> {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Play pickup sound for power-up
     */
    playPickup(type: PowerUpType): void {
        const config = POWER_UP_SOUNDS[type];
        if (!config) return;

        this.playSound(config.pickup);
        console.log(`[PowerUpSounds] Pickup: ${type}`);
    }

    /**
     * Start active loop sound
     */
    startActiveLoop(type: PowerUpType): void {
        if (this.activeLoops.has(type)) {
            this.stopActiveLoop(type);
        }

        const config = POWER_UP_SOUNDS[type];
        if (!config) return;

        const oscillators = this.createLoopingSound(config.active);
        this.activeLoops.set(type, oscillators);
        console.log(`[PowerUpSounds] Active loop started: ${type}`);
    }

    /**
     * Stop active loop sound
     */
    stopActiveLoop(type: PowerUpType): void {
        const oscillators = this.activeLoops.get(type);
        if (oscillators) {
            oscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Already stopped
                }
            });
            this.activeLoops.delete(type);
        }
    }

    /**
     * Play expired sound
     */
    playExpired(type: PowerUpType): void {
        this.stopActiveLoop(type);
        
        const config = POWER_UP_SOUNDS[type];
        if (!config) return;

        this.playSound(config.expired);
        console.log(`[PowerUpSounds] Expired: ${type}`);
    }

    /**
     * Play a one-shot sound
     */
    private playSound(def: SoundDefinition): void {
        if (!this.audioContext || !this.masterGain) return;

        const now = this.audioContext.currentTime;

        // Create oscillators for each harmonic
        def.harmonics.forEach(harmonic => {
            const osc = this.audioContext!.createOscillator();
            const gainNode = this.audioContext!.createGain();

            osc.type = 'sine';
            osc.frequency.value = def.baseFrequency * harmonic;

            // Apply modulation if defined
            if (def.modulation) {
                const modOsc = this.audioContext!.createOscillator();
                const modGain = this.audioContext!.createGain();
                
                modOsc.type = def.modulation.type;
                modOsc.frequency.value = def.modulation.frequency;
                modGain.gain.value = def.modulation.depth;
                
                modOsc.connect(modGain);
                modGain.connect(osc.frequency);
                modOsc.start(now);
                modOsc.stop(now + def.duration);
            }

            // Apply envelope
            this.applyEnvelope(gainNode.gain, def.envelope, now, def.duration);

            // Apply filter if defined
            if (def.filterType && def.filterFrequency) {
                const filter = this.audioContext!.createBiquadFilter();
                filter.type = def.filterType;
                filter.frequency.value = def.filterFrequency;
                osc.connect(filter);
                filter.connect(gainNode);
            } else {
                osc.connect(gainNode);
            }

            gainNode.connect(this.masterGain!);

            osc.start(now);
            osc.stop(now + def.duration);
        });
    }

    /**
     * Create looping sound
     */
    private createLoopingSound(def: SoundDefinition): OscillatorNode[] {
        if (!this.audioContext || !this.masterGain) return [];

        const oscillators: OscillatorNode[] = [];
        const now = this.audioContext.currentTime;

        def.harmonics.forEach(harmonic => {
            const osc = this.audioContext!.createOscillator();
            const gainNode = this.audioContext!.createGain();

            osc.type = 'sine';
            osc.frequency.value = def.baseFrequency * harmonic;

            // Gentle looping gain
            gainNode.gain.value = 0.15 / def.harmonics.length;

            osc.connect(gainNode);
            gainNode.connect(this.masterGain!);

            osc.start(now);
            oscillators.push(osc);
        });

        return oscillators;
    }

    /**
     * Apply ADSR envelope
     */
    private applyEnvelope(
        param: AudioParam,
        env: EnvelopeConfig,
        startTime: number,
        duration: number
    ): void {
        const attackEnd = startTime + env.attack;
        const decayEnd = attackEnd + env.decay;
        const releaseStart = startTime + duration - env.release;

        param.setValueAtTime(0, startTime);
        param.linearRampToValueAtTime(0.8, attackEnd);
        param.linearRampToValueAtTime(env.sustain, decayEnd);
        param.setValueAtTime(env.sustain, releaseStart);
        param.linearRampToValueAtTime(0, startTime + duration);
    }

    /**
     * Set master volume
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    /**
     * Get available power-up types
     */
    getPowerUpTypes(): PowerUpType[] {
        return Object.keys(POWER_UP_SOUNDS) as PowerUpType[];
    }

    /**
     * Stop all sounds
     */
    stopAll(): void {
        for (const type of this.activeLoops.keys()) {
            this.stopActiveLoop(type);
        }
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Singleton
let powerUpSoundManager: PowerUpSoundManager | null = null;

export function getPowerUpSoundManager(): PowerUpSoundManager {
    if (!powerUpSoundManager) {
        powerUpSoundManager = new PowerUpSoundManager();
    }
    return powerUpSoundManager;
}
