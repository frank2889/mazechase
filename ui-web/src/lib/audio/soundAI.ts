/**
 * SoundAI - Event-Driven Audio Intelligence System
 * 
 * Features:
 * - Event-to-sound mapping with context awareness
 * - Priority-based audio queue to prevent overlap
 * - Volume ducking for important sounds
 * - Streak and combo detection for dynamic audio
 * - Sidechain compression for audio balance
 * - Environment-based reverb (dungeon, arcade, etc.)
 */

export type GameEvent = 
    | 'pellet_eaten'
    | 'power_pellet_eaten'
    | 'powerup_collected'
    | 'powerup_activated'
    | 'powerup_expired'
    | 'player_caught'
    | 'player_escaped'
    | 'chaser_nearby'
    | 'chaser_far'
    | 'game_start'
    | 'game_over'
    | 'round_start'
    | 'round_end'
    | 'countdown_tick'
    | 'countdown_go'
    | 'role_switch'
    | 'footstep'
    | 'wall_bump'
    | 'milestone_reached'
    | 'combo_hit'
    | 'streak_broken';

export type SoundPriority = 'critical' | 'high' | 'medium' | 'low' | 'ambient';

export interface EventContext {
    streak?: number;
    comboMultiplier?: number;
    playerPosition?: { x: number; y: number; z: number };
    chaserDistance?: number;
    powerUpType?: string;
    milestoneValue?: number;
    theme?: string;
    isRunner?: boolean;
}

interface SoundMapping {
    sounds: string[];           // Sound IDs to play (can be multiple)
    priority: SoundPriority;
    volume: number;
    pitchVariation?: number;    // Random pitch variation range
    cooldown?: number;          // Minimum ms between plays
    ducking?: number;           // Amount to duck other sounds (0-1)
    spatial?: boolean;          // Use 3D positioning
    layer?: boolean;            // Layer with existing sounds
}

interface QueuedSound {
    soundId: string;
    priority: SoundPriority;
    volume: number;
    pitch: number;
    position?: { x: number; y: number; z: number };
    timestamp: number;
    ducking: number;
}

// Priority weights for queue sorting
const PRIORITY_WEIGHTS: Record<SoundPriority, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
    ambient: 10
};

// Event to sound mappings
const EVENT_SOUND_MAP: Record<GameEvent, SoundMapping> = {
    pellet_eaten: {
        sounds: ['pellet_collect'],
        priority: 'low',
        volume: 0.6,
        pitchVariation: 0.15,
        cooldown: 50
    },
    power_pellet_eaten: {
        sounds: ['power_pellet', 'powerup_whoosh'],
        priority: 'high',
        volume: 0.8,
        ducking: 0.3
    },
    powerup_collected: {
        sounds: ['powerup_pickup'],
        priority: 'high',
        volume: 0.9,
        ducking: 0.2
    },
    powerup_activated: {
        sounds: ['powerup_activate'],
        priority: 'high',
        volume: 0.85,
        ducking: 0.25
    },
    powerup_expired: {
        sounds: ['powerup_expire'],
        priority: 'medium',
        volume: 0.7
    },
    player_caught: {
        sounds: ['player_caught', 'impact_heavy'],
        priority: 'critical',
        volume: 1.0,
        ducking: 0.5
    },
    player_escaped: {
        sounds: ['escape_whoosh'],
        priority: 'high',
        volume: 0.8
    },
    chaser_nearby: {
        sounds: ['chaser_proximity'],
        priority: 'medium',
        volume: 0.7,
        spatial: true,
        cooldown: 500
    },
    chaser_far: {
        sounds: ['ambient_tension'],
        priority: 'ambient',
        volume: 0.3,
        layer: true
    },
    game_start: {
        sounds: ['game_start_fanfare'],
        priority: 'critical',
        volume: 1.0,
        ducking: 0.6
    },
    game_over: {
        sounds: ['game_over'],
        priority: 'critical',
        volume: 1.0,
        ducking: 0.8
    },
    round_start: {
        sounds: ['round_start'],
        priority: 'high',
        volume: 0.9
    },
    round_end: {
        sounds: ['round_end'],
        priority: 'high',
        volume: 0.9
    },
    countdown_tick: {
        sounds: ['countdown_beep'],
        priority: 'high',
        volume: 0.8,
        pitchVariation: 0
    },
    countdown_go: {
        sounds: ['countdown_go', 'energy_burst'],
        priority: 'critical',
        volume: 1.0,
        ducking: 0.4
    },
    role_switch: {
        sounds: ['role_switch_whoosh'],
        priority: 'high',
        volume: 0.85,
        ducking: 0.3
    },
    footstep: {
        sounds: ['footstep_soft'],
        priority: 'ambient',
        volume: 0.3,
        pitchVariation: 0.1,
        spatial: true,
        cooldown: 150
    },
    wall_bump: {
        sounds: ['wall_bump'],
        priority: 'low',
        volume: 0.5,
        cooldown: 200
    },
    milestone_reached: {
        sounds: ['milestone_chime', 'celebration'],
        priority: 'high',
        volume: 0.9,
        ducking: 0.2
    },
    combo_hit: {
        sounds: ['combo_hit'],
        priority: 'medium',
        volume: 0.75,
        pitchVariation: 0.2
    },
    streak_broken: {
        sounds: ['streak_break'],
        priority: 'medium',
        volume: 0.6
    }
};

/**
 * SoundAI - Intelligent event-driven audio system
 */
export class SoundAI {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private convolver: ConvolverNode | null = null;
    
    // Audio buffers cache
    private buffers: Map<string, AudioBuffer> = new Map();
    
    // Sound queue for prioritization
    private soundQueue: QueuedSound[] = [];
    private maxConcurrentSounds: number = 8;
    private activeSounds: Set<string> = new Set();
    
    // Cooldown tracking
    private lastPlayTime: Map<string, number> = new Map();
    
    // Streak tracking for dynamic audio
    private currentStreak: number = 0;
    private lastPelletTime: number = 0;
    private streakTimeout: number = 1000; // ms to maintain streak
    
    // Environment settings
    private _currentTheme: string = 'neon_night';
    private reverbEnabled: boolean = false;
    
    // Ducking control
    private duckingLevel: number = 0;
    private _duckingTarget: number = 0;

    /** Get current theme */
    get currentTheme(): string { return this._currentTheme; }
    /** Get ducking target */
    get duckingTarget(): number { return this._duckingTarget; }

    constructor() {
        this.initializeAudio();
    }

    /**
     * Initialize Web Audio API context and nodes
     */
    private async initializeAudio(): Promise<void> {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1.0;
            
            // Create dynamics compressor for sidechain-like effect
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // Connect: sources -> compressor -> master -> destination
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('🔊 SoundAI: Audio context initialized');
        } catch (error) {
            console.error('SoundAI: Failed to initialize audio context', error);
        }
    }

    /**
     * Main event handler - call this from game event callbacks
     */
    handleEvent(event: GameEvent, context: EventContext = {}): void {
        const mapping = EVENT_SOUND_MAP[event];
        if (!mapping) {
            console.warn(`SoundAI: Unknown event "${event}"`);
            return;
        }

        // Check cooldown
        if (mapping.cooldown) {
            const lastTime = this.lastPlayTime.get(event) || 0;
            if (Date.now() - lastTime < mapping.cooldown) {
                return; // Skip - still in cooldown
            }
        }

        // Update streak tracking for pellet events
        if (event === 'pellet_eaten') {
            this.updateStreak(context.streak || 0);
        }

        // Calculate dynamic volume and pitch
        const volume = this.calculateDynamicVolume(mapping, context);
        const pitch = this.calculateDynamicPitch(mapping, context);

        // Queue sounds
        for (const soundId of mapping.sounds) {
            this.queueSound({
                soundId,
                priority: mapping.priority,
                volume,
                pitch,
                position: context.playerPosition,
                timestamp: Date.now(),
                ducking: mapping.ducking || 0
            });
        }

        // Process queue
        this.processQueue();

        // Update cooldown
        this.lastPlayTime.set(event, Date.now());
    }

    /**
     * Update streak tracking
     */
    private updateStreak(newStreak: number): void {
        const now = Date.now();
        
        if (now - this.lastPelletTime > this.streakTimeout) {
            // Streak broken
            if (this.currentStreak > 5) {
                this.handleEvent('streak_broken', {});
            }
            this.currentStreak = 0;
        }
        
        this.currentStreak = newStreak;
        this.lastPelletTime = now;

        // Trigger combo hit for high streaks
        if (this.currentStreak > 0 && this.currentStreak % 10 === 0) {
            this.handleEvent('combo_hit', { streak: this.currentStreak });
        }
    }

    /**
     * Calculate dynamic volume based on context
     */
    private calculateDynamicVolume(mapping: SoundMapping, context: EventContext): number {
        let volume = mapping.volume;

        // Increase volume for high streaks
        if (context.streak && context.streak > 5) {
            volume *= 1 + Math.min(context.streak * 0.02, 0.3);
        }

        // Adjust for chaser proximity
        if (context.chaserDistance !== undefined && context.chaserDistance < 5) {
            volume *= 1.2;
        }

        // Apply ducking
        volume *= (1 - this.duckingLevel);

        return Math.min(volume, 1.0);
    }

    /**
     * Calculate dynamic pitch based on context
     */
    private calculateDynamicPitch(mapping: SoundMapping, context: EventContext): number {
        let pitch = 1.0;

        // Apply pitch variation
        if (mapping.pitchVariation) {
            pitch += (Math.random() - 0.5) * 2 * mapping.pitchVariation;
        }

        // Increase pitch for streaks (like Pac-Man pellet eating)
        if (context.streak && context.streak > 0) {
            pitch += Math.min(context.streak * 0.02, 0.5);
        }

        return pitch;
    }

    /**
     * Queue a sound for playback
     */
    private queueSound(sound: QueuedSound): void {
        // Check if we should layer or replace
        const existingIndex = this.soundQueue.findIndex(s => s.soundId === sound.soundId);
        
        if (existingIndex >= 0) {
            // Replace if new sound has higher priority
            const existing = this.soundQueue[existingIndex];
            if (existing && PRIORITY_WEIGHTS[sound.priority] > PRIORITY_WEIGHTS[existing.priority]) {
                this.soundQueue[existingIndex] = sound;
            }
        } else {
            this.soundQueue.push(sound);
        }

        // Sort by priority
        this.soundQueue.sort((a, b) => 
            PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
        );

        // Limit queue size
        if (this.soundQueue.length > this.maxConcurrentSounds * 2) {
            this.soundQueue = this.soundQueue.slice(0, this.maxConcurrentSounds * 2);
        }
    }

    /**
     * Process the sound queue
     */
    private processQueue(): void {
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            return;
        }

        // Apply ducking from high-priority sounds
        const maxDucking = this.soundQueue.reduce((max, s) => Math.max(max, s.ducking), 0);
        this.applyDucking(maxDucking);

        // Play sounds up to max concurrent limit
        while (this.soundQueue.length > 0 && this.activeSounds.size < this.maxConcurrentSounds) {
            const sound = this.soundQueue.shift()!;
            this.playSound(sound);
        }
    }

    /**
     * Play a single sound
     */
    private async playSound(sound: QueuedSound): Promise<void> {
        if (!this.audioContext) return;

        const soundKey = `${sound.soundId}_${Date.now()}`;
        this.activeSounds.add(soundKey);

        try {
            // Get or create audio buffer
            let buffer: AudioBuffer | null | undefined = this.buffers.get(sound.soundId);
            
            if (!buffer) {
                // Try to load the sound
                buffer = await this.loadSoundBuffer(sound.soundId);
                if (!buffer) {
                    // Generate procedural sound as fallback
                    buffer = this.generateProceduralSound(sound.soundId);
                }
                if (buffer) {
                    this.buffers.set(sound.soundId, buffer);
                }
            }

            if (!buffer) {
                this.activeSounds.delete(soundKey);
                return;
            }

            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = sound.pitch;

            // Create gain for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = sound.volume;

            // Connect through compressor
            source.connect(gainNode);
            gainNode.connect(this.compressor!);

            // Play
            source.start(0);

            // Cleanup when done
            source.onended = () => {
                this.activeSounds.delete(soundKey);
                source.disconnect();
                gainNode.disconnect();
            };

        } catch (error) {
            console.warn(`SoundAI: Failed to play sound "${sound.soundId}"`, error);
            this.activeSounds.delete(soundKey);
        }
    }

    /**
     * Load a sound buffer from file
     */
    private async loadSoundBuffer(soundId: string): Promise<AudioBuffer | null> {
        if (!this.audioContext) return null;

        const paths = [
            `/audio/sfx/${soundId}.mp3`,
            `/audio/sfx/${soundId}.wav`,
            `/audio/sfx/${soundId}.ogg`
        ];

        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    return await this.audioContext.decodeAudioData(arrayBuffer);
                }
            } catch {
                continue;
            }
        }

        return null;
    }

    /**
     * Generate procedural sound for missing audio files
     */
    private generateProceduralSound(soundId: string): AudioBuffer | null {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.2; // 200ms default
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        // Generate different sounds based on ID
        if (soundId.includes('pellet')) {
            // Bright pop sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 30);
                data[i] = Math.sin(2 * Math.PI * 800 * t) * envelope * 0.5;
            }
        } else if (soundId.includes('powerup')) {
            // Rising whoosh
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const freq = 200 + t * 1000;
                const envelope = Math.sin(Math.PI * t / duration);
                data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
            }
        } else if (soundId.includes('countdown')) {
            // Sharp beep
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 20);
                data[i] = Math.sin(2 * Math.PI * 1000 * t) * envelope * 0.6;
            }
        } else {
            // Generic click
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 50);
                data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
            }
        }

        return buffer;
    }

    /**
     * Apply volume ducking
     */
    private applyDucking(targetDucking: number): void {
        if (!this.masterGain) return;

        this._duckingTarget = targetDucking;
        
        // Smooth transition
        const currentTime = this.audioContext!.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(
            1 - targetDucking,
            currentTime + 0.05
        );
    }

    /**
     * Set environment theme for reverb effects
     */
    setTheme(theme: string): void {
        this._currentTheme = theme;
        
        // Enable reverb for dungeon-like themes
        if (theme === 'dungeon' || theme === 'shadow_forest' || theme === 'crystal_cave') {
            this.enableReverb(0.3);
        } else {
            this.disableReverb();
        }
    }

    /**
     * Enable reverb effect
     */
    private async enableReverb(wetLevel: number): Promise<void> {
        if (!this.audioContext || this.reverbEnabled) return;

        try {
            // Create convolver for reverb
            this.convolver = this.audioContext.createConvolver();
            
            // Generate impulse response for small room
            const impulseLength = this.audioContext.sampleRate * 0.5; // 500ms reverb
            const impulse = this.audioContext.createBuffer(
                2,
                impulseLength,
                this.audioContext.sampleRate
            );

            for (let channel = 0; channel < 2; channel++) {
                const data = impulse.getChannelData(channel);
                for (let i = 0; i < impulseLength; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * 0.2));
                }
            }

            this.convolver.buffer = impulse;

            // Create wet/dry mix
            const wetGain = this.audioContext.createGain();
            wetGain.gain.value = wetLevel;

            // Insert convolver into chain
            this.compressor!.disconnect();
            this.compressor!.connect(this.convolver);
            this.convolver.connect(wetGain);
            wetGain.connect(this.masterGain!);
            this.compressor!.connect(this.masterGain!); // Also connect dry signal

            this.reverbEnabled = true;
            console.log(`🔊 SoundAI: Reverb enabled (wet: ${wetLevel})`);
        } catch (error) {
            console.warn('SoundAI: Failed to enable reverb', error);
        }
    }

    /**
     * Disable reverb effect
     */
    private disableReverb(): void {
        if (!this.convolver || !this.reverbEnabled) return;

        this.convolver.disconnect();
        this.compressor!.disconnect();
        this.compressor!.connect(this.masterGain!);

        this.reverbEnabled = false;
        console.log('🔊 SoundAI: Reverb disabled');
    }

    /**
     * Resume audio context (required after user interaction)
     */
    async resume(): Promise<void> {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🔊 SoundAI: Audio context resumed');
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.activeSounds.clear();
        this.soundQueue = [];
        this.buffers.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Singleton instance
let soundAIInstance: SoundAI | null = null;

export function getSoundAI(): SoundAI {
    if (!soundAIInstance) {
        soundAIInstance = new SoundAI();
    }
    return soundAIInstance;
}

export default SoundAI;
