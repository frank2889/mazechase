/**
 * Theme Music System
 * 
 * AI Tester Suggestion (Kenji - Sound Designer):
 * "Develop distinct audio themes for each game environment.
 * Each theme should have unique instruments, tempo, and mood."
 * 
 * Features:
 * - Per-theme music tracks
 * - Smooth crossfade between themes
 * - Dynamic intensity based on game state
 * - Adaptive layers (add tension when chasers are close)
 */

export type GameTheme = 
    | 'neon_night'
    | 'cyber_arcade' 
    | 'sunset_maze'
    | 'shadow_forest'
    | 'crystal_cave'
    | 'classic';

export interface ThemeMusicConfig {
    crossfadeDuration: number;    // Seconds to crossfade
    baseVolume: number;           // Base music volume (0-1)
    tensionThreshold: number;     // Distance at which tension builds
    tensionVolumeBoost: number;   // Volume increase during tension
}

interface ThemeTrack {
    name: string;
    baseUrl: string;
    bpm: number;
    mood: 'calm' | 'energetic' | 'tense' | 'mysterious';
    layers?: string[];           // Optional additional layers
}

const DEFAULT_CONFIG: ThemeMusicConfig = {
    crossfadeDuration: 2.0,
    baseVolume: 0.4,
    tensionThreshold: 8,
    tensionVolumeBoost: 0.2
};

// Theme-specific music configurations
const THEME_TRACKS: Record<GameTheme, ThemeTrack> = {
    neon_night: {
        name: 'Neon Dreams',
        baseUrl: '/audio/music/neon_night',
        bpm: 128,
        mood: 'energetic',
        layers: ['base', 'synth', 'drums', 'tension']
    },
    cyber_arcade: {
        name: 'Pixel Rush',
        baseUrl: '/audio/music/cyber_arcade',
        bpm: 140,
        mood: 'energetic',
        layers: ['base', 'chiptune', 'bass', 'tension']
    },
    sunset_maze: {
        name: 'Golden Hour',
        baseUrl: '/audio/music/sunset_maze',
        bpm: 100,
        mood: 'calm',
        layers: ['base', 'pads', 'melody', 'tension']
    },
    shadow_forest: {
        name: 'Mystic Woods',
        baseUrl: '/audio/music/shadow_forest',
        bpm: 90,
        mood: 'mysterious',
        layers: ['base', 'ambient', 'strings', 'tension']
    },
    crystal_cave: {
        name: 'Crystal Echoes',
        baseUrl: '/audio/music/crystal_cave',
        bpm: 110,
        mood: 'mysterious',
        layers: ['base', 'bells', 'pads', 'tension']
    },
    classic: {
        name: 'Retro Chase',
        baseUrl: '/audio/music/classic',
        bpm: 120,
        mood: 'energetic',
        layers: ['base', 'chiptune', 'drums', 'tension']
    }
};

/**
 * ThemeMusicManager - Handles adaptive, layered theme music
 */
export class ThemeMusicManager {
    private config: ThemeMusicConfig;
    private currentTheme: GameTheme | null = null;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    
    // Track layers
    private activeTracks: Map<string, {
        audio: HTMLAudioElement;
        gainNode: GainNode;
        isLoaded: boolean;
    }> = new Map();
    
    // Crossfade state
    private isCrossfading = false;
    private tensionLevel = 0;  // 0-1
    
    // State
    private isPlaying = false;
    private isMuted = false;

    constructor(config: Partial<ThemeMusicConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize audio context
     */
    async initialize(): Promise<void> {
        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.config.baseVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('[ThemeMusic] Initialized');
        } catch (e) {
            console.warn('[ThemeMusic] Failed to initialize:', e);
        }
    }

    /**
     * Load and play theme music
     */
    async playTheme(theme: GameTheme): Promise<void> {
        if (theme === this.currentTheme && this.isPlaying) {
            return;
        }

        const trackConfig = THEME_TRACKS[theme];
        if (!trackConfig) {
            console.warn('[ThemeMusic] Unknown theme:', theme);
            return;
        }

        console.log(`[ThemeMusic] Playing: ${trackConfig.name}`);

        // Crossfade if already playing
        if (this.currentTheme && this.isPlaying) {
            await this.crossfadeTo(theme);
        } else {
            await this.loadAndPlayTheme(theme);
        }

        this.currentTheme = theme;
        this.isPlaying = true;
    }

    /**
     * Load and play a theme from scratch
     */
    private async loadAndPlayTheme(theme: GameTheme): Promise<void> {
        const trackConfig = THEME_TRACKS[theme];
        
        // Stop current tracks
        this.stopAllTracks();

        // Load base track (always required)
        const baseUrl = `${trackConfig.baseUrl}_base.mp3`;
        await this.loadTrack('base', baseUrl, 1.0);

        // Load optional layers
        if (trackConfig.layers) {
            for (const layer of trackConfig.layers) {
                if (layer === 'base') continue;
                
                const layerUrl = `${trackConfig.baseUrl}_${layer}.mp3`;
                const initialVolume = layer === 'tension' ? 0 : 0.7;
                await this.loadTrack(layer, layerUrl, initialVolume);
            }
        }

        // Start all tracks synchronized
        this.playAllTracks();
    }

    /**
     * Load a single track layer
     */
    private async loadTrack(
        id: string,
        url: string,
        volume: number
    ): Promise<void> {
        if (!this.audioContext || !this.masterGain) return;

        try {
            const audio = new Audio(url);
            audio.loop = true;
            audio.volume = 0; // Start silent, control via Web Audio

            // Create gain node for this track
            const source = this.audioContext.createMediaElementSource(audio);
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            this.activeTracks.set(id, {
                audio,
                gainNode,
                isLoaded: true
            });

            // Wait for audio to be ready
            await new Promise<void>((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                audio.addEventListener('error', (e) => reject(e), { once: true });
                audio.load();
            });
        } catch (e) {
            console.warn(`[ThemeMusic] Failed to load track ${id}:`, e);
        }
    }

    /**
     * Play all loaded tracks synchronized
     */
    private playAllTracks(): void {
        for (const [id, track] of this.activeTracks) {
            try {
                track.audio.currentTime = 0;
                track.audio.play().catch(() => {
                    // Ignore autoplay errors
                });
            } catch (e) {
                console.warn(`[ThemeMusic] Failed to play track ${id}:`, e);
            }
        }
    }

    /**
     * Crossfade to a new theme
     */
    private async crossfadeTo(newTheme: GameTheme): Promise<void> {
        if (this.isCrossfading) return;
        this.isCrossfading = true;

        const fadeDuration = this.config.crossfadeDuration * 1000;
        const fadeSteps = 20;
        const stepDuration = fadeDuration / fadeSteps;

        // Fade out current tracks
        for (let i = fadeSteps; i >= 0; i--) {
            const volume = i / fadeSteps;
            for (const track of this.activeTracks.values()) {
                track.gainNode.gain.value = volume * this.config.baseVolume;
            }
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }

        // Load new theme
        await this.loadAndPlayTheme(newTheme);

        // Fade in new tracks
        for (let i = 0; i <= fadeSteps; i++) {
            const volume = i / fadeSteps;
            for (const [id, track] of this.activeTracks) {
                const targetVolume = id === 'tension' ? 0 : volume;
                track.gainNode.gain.value = targetVolume * this.config.baseVolume;
            }
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }

        this.isCrossfading = false;
    }

    /**
     * Update tension level based on game state
     * Call this with closest chaser distance
     */
    updateTension(closestChaserDistance: number): void {
        if (!this.isPlaying) return;

        // Calculate tension (0-1) based on distance
        if (closestChaserDistance < this.config.tensionThreshold) {
            this.tensionLevel = 1 - (closestChaserDistance / this.config.tensionThreshold);
        } else {
            this.tensionLevel = Math.max(0, this.tensionLevel - 0.02); // Slow decay
        }

        // Update tension layer volume
        const tensionTrack = this.activeTracks.get('tension');
        if (tensionTrack) {
            tensionTrack.gainNode.gain.value = this.tensionLevel;
        }

        // Slightly boost master volume during tension
        if (this.masterGain) {
            const boost = this.tensionLevel * this.config.tensionVolumeBoost;
            this.masterGain.gain.value = this.config.baseVolume + boost;
        }
    }

    /**
     * Stop all tracks
     */
    private stopAllTracks(): void {
        for (const track of this.activeTracks.values()) {
            track.audio.pause();
            track.audio.currentTime = 0;
        }
        this.activeTracks.clear();
    }

    /**
     * Pause music
     */
    pause(): void {
        for (const track of this.activeTracks.values()) {
            track.audio.pause();
        }
        this.isPlaying = false;
    }

    /**
     * Resume music
     */
    resume(): void {
        for (const track of this.activeTracks.values()) {
            track.audio.play().catch(() => {});
        }
        this.isPlaying = true;
    }

    /**
     * Mute/unmute
     */
    setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this.config.baseVolume;
        }
    }

    /**
     * Set volume
     */
    setVolume(volume: number): void {
        this.config.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.isMuted) {
            this.masterGain.gain.value = this.config.baseVolume;
        }
    }

    /**
     * Get current theme info
     */
    getCurrentTheme(): { theme: GameTheme; track: ThemeTrack } | null {
        if (!this.currentTheme) return null;
        return {
            theme: this.currentTheme,
            track: THEME_TRACKS[this.currentTheme]
        };
    }

    /**
     * Clean up
     */
    destroy(): void {
        this.stopAllTracks();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.masterGain = null;
    }
}

// Singleton
let themeMusicManager: ThemeMusicManager | null = null;

export function getThemeMusicManager(): ThemeMusicManager {
    if (!themeMusicManager) {
        themeMusicManager = new ThemeMusicManager();
    }
    return themeMusicManager;
}

/**
 * Unique Theme Melodies - Procedural Generation
 * 
 * AI Tester Suggestion (Kenji - Audio Specialist):
 * "Voeg unieke melodieën toe per thema.
 * Elk thema verdient eigen muzikale identiteit."
 * 
 * Procedurally generated melodies using Web Audio API
 */
export interface ThemeMelodyConfig {
    scale: number[];           // Semitones from root
    rootNote: number;          // MIDI note number
    tempo: number;             // BPM
    noteDurations: number[];   // In beats
    mood: 'major' | 'minor' | 'pentatonic' | 'chromatic';
    arpeggio: boolean;
    reverb: number;            // 0-1
}

const THEME_MELODIES: Record<GameTheme, ThemeMelodyConfig> = {
    neon_night: {
        scale: [0, 2, 3, 5, 7, 8, 10], // Minor scale
        rootNote: 60, // C4
        tempo: 128,
        noteDurations: [0.25, 0.5, 0.25, 0.5, 1],
        mood: 'minor',
        arpeggio: true,
        reverb: 0.6
    },
    cyber_arcade: {
        scale: [0, 2, 4, 5, 7, 9, 11], // Major scale
        rootNote: 64, // E4
        tempo: 140,
        noteDurations: [0.125, 0.25, 0.125, 0.25],
        mood: 'major',
        arpeggio: true,
        reverb: 0.3
    },
    sunset_maze: {
        scale: [0, 2, 4, 7, 9], // Pentatonic
        rootNote: 57, // A3
        tempo: 100,
        noteDurations: [0.5, 1, 0.5, 0.5, 1],
        mood: 'pentatonic',
        arpeggio: false,
        reverb: 0.7
    },
    shadow_forest: {
        scale: [0, 1, 3, 4, 6, 7, 9, 10], // Diminished
        rootNote: 55, // G3
        tempo: 90,
        noteDurations: [1, 0.5, 1.5, 0.5],
        mood: 'minor',
        arpeggio: false,
        reverb: 0.8
    },
    crystal_cave: {
        scale: [0, 2, 4, 6, 7, 9, 11], // Lydian
        rootNote: 62, // D4
        tempo: 110,
        noteDurations: [0.25, 0.5, 0.75, 0.25, 0.5],
        mood: 'major',
        arpeggio: true,
        reverb: 0.9
    },
    classic: {
        scale: [0, 2, 3, 5, 7, 8, 11], // Harmonic minor
        rootNote: 60, // C4
        tempo: 120,
        noteDurations: [0.25, 0.25, 0.5, 0.25, 0.25, 0.5],
        mood: 'minor',
        arpeggio: true,
        reverb: 0.4
    }
};

/**
 * ProceduralMelodyGenerator - Generates unique melodies per theme
 */
export class ProceduralMelodyGenerator {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private convolver: ConvolverNode | null = null;
    private currentSequence: number | null = null;
    private _isPlayingMelody: boolean = false;

    /** Check if melody is currently playing */
    get isPlaying(): boolean {
        return this._isPlayingMelody;
    }

    async initialize(): Promise<void> {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.audioContext.destination);

        // Create reverb
        this.convolver = this.audioContext.createConvolver();
        await this.createReverbImpulse();
        this.convolver.connect(this.masterGain);
    }

    /**
     * Generate and play melody for theme
     */
    playThemeMelody(theme: GameTheme, measures: number = 4): void {
        if (!this.audioContext || !this.masterGain) return;

        const config = THEME_MELODIES[theme];
        if (!config) return;

        this.stopMelody();
        this._isPlayingMelody = true;

        const notes = this.generateMelody(config, measures);
        this.playNotes(notes, config);
    }

    /**
     * Generate a melody based on config
     */
    private generateMelody(config: ThemeMelodyConfig, measures: number): number[] {
        const notes: number[] = [];
        const beatsPerMeasure = 4;
        const totalBeats = measures * beatsPerMeasure;
        
        let currentBeat = 0;

        while (currentBeat < totalBeats) {
            // Pick a note from the scale
            const scaleIndex = Math.floor(Math.random() * config.scale.length);
            const scaleNote = config.scale[scaleIndex];
            if (scaleNote === undefined) continue;
            const note = config.rootNote + scaleNote;
            
            // Add octave variation occasionally
            const octaveShift = Math.random() < 0.2 ? (Math.random() < 0.5 ? 12 : -12) : 0;
            notes.push(note + octaveShift);
            
            // Pick duration
            const duration = config.noteDurations[Math.floor(Math.random() * config.noteDurations.length)];
            if (duration === undefined) continue;
            currentBeat += duration;
        }

        return notes;
    }

    /**
     * Play sequence of notes
     */
    private playNotes(notes: number[], config: ThemeMelodyConfig): void {
        if (!this.audioContext || !this.masterGain) return;

        const beatDuration = 60 / config.tempo;
        let time = this.audioContext.currentTime;

        notes.forEach((midiNote, index) => {
            const duration = config.noteDurations[index % config.noteDurations.length] ?? 1;
            const noteDuration = duration * beatDuration;
            
            this.playNote(midiNote, time, noteDuration, config);
            time += noteDuration;
        });
    }

    /**
     * Play single note
     */
    private playNote(midiNote: number, startTime: number, duration: number, config: ThemeMelodyConfig): void {
        if (!this.audioContext || !this.masterGain) return;

        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        // Create oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = config.arpeggio ? 'sawtooth' : 'sine';
        osc.frequency.value = frequency;

        // Create envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.3);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        // Connect
        osc.connect(gainNode);
        
        // Route through reverb
        if (this.convolver && config.reverb > 0) {
            const dryGain = this.audioContext.createGain();
            const wetGain = this.audioContext.createGain();
            dryGain.gain.value = 1 - config.reverb;
            wetGain.gain.value = config.reverb;
            
            gainNode.connect(dryGain);
            gainNode.connect(this.convolver);
            this.convolver.connect(wetGain);
            dryGain.connect(this.masterGain);
            wetGain.connect(this.masterGain);
        } else {
            gainNode.connect(this.masterGain);
        }

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * Create reverb impulse response
     */
    private async createReverbImpulse(): Promise<void> {
        if (!this.audioContext || !this.convolver) return;

        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

        this.convolver.buffer = impulse;
    }

    /**
     * Stop current melody
     */
    stopMelody(): void {
        this._isPlayingMelody = false;
        if (this.currentSequence) {
            clearTimeout(this.currentSequence);
            this.currentSequence = null;
        }
    }

    /**
     * Get melody config for theme
     */
    getMelodyConfig(theme: GameTheme): ThemeMelodyConfig | null {
        return THEME_MELODIES[theme] || null;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.stopMelody();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Singleton for melody generator
let melodyGenerator: ProceduralMelodyGenerator | null = null;

export function getProceduralMelodyGenerator(): ProceduralMelodyGenerator {
    if (!melodyGenerator) {
        melodyGenerator = new ProceduralMelodyGenerator();
    }
    return melodyGenerator;
}
