/**
 * AudioManager - Handles all game audio with graceful degradation
 * Sounds are optional - game works fine without them
 */

type SoundName = 'chomp' | 'power_pellet' | 'ghost_eat' | 'death' | 'game_start' | 'siren' | 'power_warning';

interface AudioCache {
    [key: string]: HTMLAudioElement | null;
}

class AudioManager {
    private sounds: AudioCache = {};
    private enabled: boolean = true;
    private volume: number = 0.5;
    private loaded: boolean = false;
    private audioContext: AudioContext | null = null;
    
    constructor() {
        this.preloadSounds();
    }
    
    /**
     * Preload all audio files (non-blocking)
     */
    private async preloadSounds(): Promise<void> {
        const soundFiles: Record<SoundName, string> = {
            'chomp': '/audio/chomp.mp3',
            'power_pellet': '/audio/power_pellet.mp3',
            'ghost_eat': '/audio/ghost_eat.mp3',
            'death': '/audio/death.mp3',
            'game_start': '/audio/game_start.mp3',
            'siren': '/audio/siren.mp3',
            'power_warning': '/audio/power_warning.mp3'
        };
        
        // Load sounds in parallel
        const loadPromises = Object.entries(soundFiles).map(async ([name, path]) => {
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
            } catch {
                // Sound file not found - graceful degradation
                this.sounds[name] = null;
                console.log(`Audio file not found: ${path} (game will work without it)`);
            }
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
