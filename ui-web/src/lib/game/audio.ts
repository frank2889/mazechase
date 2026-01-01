/**
 * AudioManager - Handles all game audio with graceful degradation
 * Sounds are optional - game works fine without them
 */

type SoundName = 
    | 'chomp' | 'power_pellet' | 'chaser_eat' | 'death' | 'game_start' | 'siren' | 'power_warning'
    | 'speed_boost' | 'magnet' | 'power_end' | 'chaser_near' | 'ambiance';
    // REMOVED: 'invisible', 'freeze', 'teleport' - power-ups simplified Dec 2025
    // ADDED: 'ambiance' - AI Tester suggestion (Emma): theme-based background sounds

interface AudioCache {
    [key: string]: HTMLAudioElement | null;
}

class AudioManager {
    private sounds: AudioCache = {};
    private enabled: boolean = true;
    private volume: number = 0.5;
    private loaded: boolean = false;
    private audioContext: AudioContext | null = null;
    private currentAmbiance: HTMLAudioElement | null = null; // AI Tester: Emma's ambiance suggestion
    
    constructor() {
        this.preloadSounds();
    }
    
    /**
     * Preload all audio files (non-blocking)
     * Tries WAV first (better quality), falls back to MP3
     */
    private async preloadSounds(): Promise<void> {
        const soundFiles: Record<SoundName, string[]> = {
            'chomp': ['/audio/chomp.wav', '/audio/chomp.mp3'],
            'power_pellet': ['/audio/power_pellet.wav', '/audio/power_pellet.mp3'],
            'chaser_eat': ['/audio/chaser_eat.wav', '/audio/chaser_eat.mp3'],
            'death': ['/audio/death.wav', '/audio/death.mp3'],
            'game_start': ['/audio/game_start.wav', '/audio/game_start.mp3'],
            'siren': ['/audio/siren.wav', '/audio/siren.mp3'],
            'power_warning': ['/audio/power_warning.wav', '/audio/power_warning.mp3'],
            'speed_boost': ['/audio/speed_boost.wav', '/audio/speed_boost.mp3'],
            'magnet': ['/audio/magnet.wav', '/audio/magnet.mp3'],
            'power_end': ['/audio/power_end.wav', '/audio/power_end.mp3'],
            'chaser_near': ['/audio/chaser_near.wav', '/audio/chaser_near.mp3'],
            'ambiance': ['/audio/ambiance.wav', '/audio/ambiance.mp3', '/audio/menu_music.wav'] // Fallback to menu music
        };
        
        // Load sounds in parallel, trying each path until one works
        const loadPromises = Object.entries(soundFiles).map(async ([name, paths]) => {
            for (const path of paths) {
                try {
                    const audio = new Audio(path);
                    audio.volume = this.volume;
                    audio.preload = 'auto';
                
                    // Test if file exists by trying to load metadata
                    await new Promise((resolve, reject) => {
                        audio.oncanplaythrough = resolve;
                        audio.onerror = reject;
                        setTimeout(resolve, 2000); // Timeout after 2s
                    });
                
                    this.sounds[name] = audio;
                    return; // Successfully loaded, stop trying other paths
                } catch {
                    // Try next path
                    continue;
                }
            }
            // All paths failed - graceful degradation
            this.sounds[name] = null;
            console.log(`Audio not found for: ${name} (game will work without it)`);
        });
        
        await Promise.allSettled(loadPromises);
        this.loaded = true;
    }
    
    /**
     * Initialize AudioContext (required for some browsers)
     * Should be called on user interaction
     */
    public initContext(): void {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch {
                console.log('Web Audio API not supported');
            }
        }
        
        // Resume if suspended
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    /**
     * Play a sound effect
     */
    public play(name: SoundName): void {
        if (!this.enabled) return;
        
        const sound = this.sounds[name];
        if (!sound) return;
        
        try {
            // Clone and play for overlapping sounds
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = this.volume;
            clone.play().catch(() => {
                // Ignore autoplay errors
            });
        } catch {
            // Ignore errors
        }
    }
    
    /**
     * Play a sound in a loop
     */
    public playLoop(name: SoundName): HTMLAudioElement | null {
        if (!this.enabled) return null;
        
        const sound = this.sounds[name];
        if (!sound) return null;
        
        try {
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = this.volume;
            clone.loop = true;
            clone.play().catch(() => {});
            return clone;
        } catch {
            return null;
        }
    }
    
    /**
     * Stop a looping sound
     */
    public stopLoop(audio: HTMLAudioElement | null): void {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }
    
    /**
     * AI Tester suggestion (Emma): Play ambient background sound
     * Creates atmosphere without being distracting
     */
    public startAmbiance(): void {
        if (!this.enabled || this.currentAmbiance) return;
        
        this.currentAmbiance = this.playLoop('ambiance');
        if (this.currentAmbiance) {
            // Ambiance should be quieter than effects
            this.currentAmbiance.volume = this.volume * 0.3;
        }
    }
    
    /**
     * Stop ambient background sound
     */
    public stopAmbiance(): void {
        if (this.currentAmbiance) {
            this.stopLoop(this.currentAmbiance);
            this.currentAmbiance = null;
        }
    }
    
    /**
     * Set master volume
     */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update all loaded sounds
        for (const sound of Object.values(this.sounds)) {
            if (sound) {
                sound.volume = this.volume;
            }
        }
    }
    
    /**
     * Toggle audio enabled/disabled
     */
    public toggle(): boolean {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Enable audio
     */
    public enable(): void {
        this.enabled = true;
    }
    
    /**
     * Disable audio
     */
    public disable(): void {
        this.enabled = false;
    }
    
    /**
     * Check if audio is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    /**
     * Check if sounds are loaded
     */
    public isLoaded(): boolean {
        return this.loaded;
    }
}

// Singleton instance
export const audioManager = new AudioManager();

// Helper functions for easy access
export function playSound(name: SoundName): void {
    audioManager.play(name);
}

export function playLoopSound(name: SoundName): HTMLAudioElement | null {
    return audioManager.playLoop(name);
}

export function stopLoopSound(audio: HTMLAudioElement | null): void {
    audioManager.stopLoop(audio);
}

export function initAudio(): void {
    audioManager.initContext();
}

export function toggleAudio(): boolean {
    return audioManager.toggle();
}

export function setAudioVolume(volume: number): void {
    audioManager.setVolume(volume);
}

// AI Tester suggestion (Emma): Ambiance controls
export function startAmbiance(): void {
    audioManager.startAmbiance();
}

export function stopAmbiance(): void {
    audioManager.stopAmbiance();
}
