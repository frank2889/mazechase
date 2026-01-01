/**
 * Music Manager - Variety System
 * Based on AI Tester Feedback (Sandra, David)
 * 
 * Issues Fixed:
 * - Sandra: "Muziek kan na een tijdje wat repetitief worden"
 * - David: "Variatie in audio om herhaling te voorkomen"
 * 
 * Solution: Multiple tracks per theme, shuffle system, smooth transitions
 */

export interface MusicTrack {
    id: string;
    name: string;
    file: string;
    theme: string;
    bpm: number;
    intensity: 'calm' | 'medium' | 'intense';
}

// Multiple tracks per theme for variety
export const MUSIC_TRACKS: MusicTrack[] = [
    // Neon Night theme - 3 tracks
    {
        id: 'neon_1',
        name: 'Neon Dreams',
        file: '/audio/music/neon_dreams.mp3',
        theme: 'neon_night',
        bpm: 128,
        intensity: 'medium'
    },
    {
        id: 'neon_2', 
        name: 'Cyber Chase',
        file: '/audio/music/cyber_chase.mp3',
        theme: 'neon_night',
        bpm: 140,
        intensity: 'intense'
    },
    {
        id: 'neon_3',
        name: 'Midnight Run',
        file: '/audio/music/midnight_run.mp3',
        theme: 'neon_night',
        bpm: 120,
        intensity: 'calm'
    },
    
    // Cyber Arcade theme - 3 tracks
    {
        id: 'cyber_1',
        name: 'Arcade Fever',
        file: '/audio/music/arcade_fever.mp3',
        theme: 'cyber_arcade',
        bpm: 135,
        intensity: 'intense'
    },
    {
        id: 'cyber_2',
        name: 'Pixel Party',
        file: '/audio/music/pixel_party.mp3',
        theme: 'cyber_arcade',
        bpm: 125,
        intensity: 'medium'
    },
    {
        id: 'cyber_3',
        name: 'Retro Wave',
        file: '/audio/music/retro_wave.mp3',
        theme: 'cyber_arcade',
        bpm: 115,
        intensity: 'calm'
    },
    
    // Sunset Maze theme - 3 tracks
    {
        id: 'sunset_1',
        name: 'Golden Hour',
        file: '/audio/music/golden_hour.mp3',
        theme: 'sunset_maze',
        bpm: 110,
        intensity: 'calm'
    },
    {
        id: 'sunset_2',
        name: 'Sunset Pursuit',
        file: '/audio/music/sunset_pursuit.mp3',
        theme: 'sunset_maze',
        bpm: 130,
        intensity: 'medium'
    },
    {
        id: 'sunset_3',
        name: 'Dusk Dash',
        file: '/audio/music/dusk_dash.mp3',
        theme: 'sunset_maze',
        bpm: 145,
        intensity: 'intense'
    },
    
    // Shadow Forest theme - 3 tracks  
    {
        id: 'forest_1',
        name: 'Mystic Woods',
        file: '/audio/music/mystic_woods.mp3',
        theme: 'shadow_forest',
        bpm: 100,
        intensity: 'calm'
    },
    {
        id: 'forest_2',
        name: 'Forest Chase',
        file: '/audio/music/forest_chase.mp3',
        theme: 'shadow_forest',
        bpm: 125,
        intensity: 'medium'
    },
    {
        id: 'forest_3',
        name: 'Shadow Hunt',
        file: '/audio/music/shadow_hunt.mp3',
        theme: 'shadow_forest',
        bpm: 140,
        intensity: 'intense'
    }
];

// Track history to avoid immediate repeats
const HISTORY_SIZE = 3;
let trackHistory: string[] = [];

/**
 * Get tracks for a specific theme
 */
export function getTracksForTheme(theme: string): MusicTrack[] {
    return MUSIC_TRACKS.filter(t => t.theme === theme);
}

/**
 * Get random track for theme, avoiding recent plays
 */
export function getRandomTrack(theme: string, intensity?: 'calm' | 'medium' | 'intense'): MusicTrack | null {
    let available = getTracksForTheme(theme);
    
    // Filter by intensity if specified
    if (intensity) {
        available = available.filter(t => t.intensity === intensity);
    }
    
    // Remove recently played tracks
    available = available.filter(t => !trackHistory.includes(t.id));
    
    // If all filtered, reset history
    if (available.length === 0) {
        available = getTracksForTheme(theme);
        if (intensity) {
            available = available.filter(t => t.intensity === intensity);
        }
        trackHistory = [];
    }
    
    if (available.length === 0) return null;
    
    // Pick random track
    const track = available[Math.floor(Math.random() * available.length)];
    
    // Add to history
    trackHistory.push(track.id);
    if (trackHistory.length > HISTORY_SIZE) {
        trackHistory.shift();
    }
    
    return track;
}

/**
 * Get track based on game intensity
 */
export function getAdaptiveTrack(theme: string, gameProgress: number): MusicTrack | null {
    // Map progress to intensity
    let intensity: 'calm' | 'medium' | 'intense';
    if (gameProgress < 0.3) {
        intensity = 'calm';
    } else if (gameProgress < 0.7) {
        intensity = 'medium';
    } else {
        intensity = 'intense';
    }
    
    return getRandomTrack(theme, intensity);
}

/**
 * Music Manager Class - Handles playback with smooth transitions
 */
export class MusicManager {
    private currentTrack: HTMLAudioElement | null = null;
    private currentInfo: MusicTrack | null = null;
    private volume: number = 0.3;
    private fadeInterval: number | null = null;
    private enabled: boolean = true;
    
    // Callbacks for UI updates
    public onTrackChange: ((track: MusicTrack) => void) | null = null;
    
    constructor() {
        // Check saved preference
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('mazechase_music_enabled');
            this.enabled = saved !== 'false';
            
            const savedVolume = localStorage.getItem('mazechase_music_volume');
            if (savedVolume) {
                this.volume = parseFloat(savedVolume);
            }
        }
    }
    
    /**
     * Play a track with crossfade
     */
    async playTrack(track: MusicTrack, crossfade: boolean = true): Promise<void> {
        if (!this.enabled) return;
        
        try {
            const audio = new Audio(track.file);
            audio.volume = 0;
            audio.loop = false;
            
            // When track ends, play next random track
            audio.onended = () => {
                const nextTrack = getRandomTrack(track.theme);
                if (nextTrack) {
                    this.playTrack(nextTrack, true);
                }
            };
            
            // Handle missing file gracefully
            audio.onerror = () => {
                console.log(`Music file not found: ${track.file} (continuing without music)`);
            };
            
            await audio.play().catch(() => {
                // Ignore autoplay errors
            });
            
            // Crossfade
            if (crossfade && this.currentTrack) {
                this.crossfade(this.currentTrack, audio);
            } else {
                audio.volume = this.volume;
            }
            
            this.currentTrack = audio;
            this.currentInfo = track;
            
            // Notify UI
            if (this.onTrackChange) {
                this.onTrackChange(track);
            }
        } catch (e) {
            console.log('Music playback failed:', e);
        }
    }
    
    /**
     * Crossfade between tracks
     */
    private crossfade(oldTrack: HTMLAudioElement, newTrack: HTMLAudioElement): void {
        const duration = 1500; // 1.5 second crossfade
        const steps = 30;
        const stepTime = duration / steps;
        let step = 0;
        
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }
        
        this.fadeInterval = window.setInterval(() => {
            step++;
            const progress = step / steps;
            
            oldTrack.volume = Math.max(0, this.volume * (1 - progress));
            newTrack.volume = Math.min(this.volume, this.volume * progress);
            
            if (step >= steps) {
                clearInterval(this.fadeInterval!);
                this.fadeInterval = null;
                oldTrack.pause();
                oldTrack.src = '';
            }
        }, stepTime);
    }
    
    /**
     * Start playing music for a theme
     */
    playTheme(theme: string): void {
        const track = getRandomTrack(theme);
        if (track) {
            this.playTrack(track, false);
        }
    }
    
    /**
     * Switch to adaptive track based on game progress
     */
    adaptToProgress(theme: string, progress: number): void {
        const track = getAdaptiveTrack(theme, progress);
        if (track && track.id !== this.currentInfo?.id) {
            this.playTrack(track, true);
        }
    }
    
    /**
     * Skip to next track
     */
    skipTrack(): void {
        if (!this.currentInfo) return;
        const track = getRandomTrack(this.currentInfo.theme);
        if (track) {
            this.playTrack(track, true);
        }
    }
    
    /**
     * Stop music
     */
    stop(): void {
        if (this.currentTrack) {
            // Fade out
            const duration = 500;
            const steps = 10;
            let step = 0;
            const startVolume = this.currentTrack.volume;
            
            const fadeOut = setInterval(() => {
                step++;
                if (this.currentTrack) {
                    this.currentTrack.volume = startVolume * (1 - step / steps);
                }
                if (step >= steps) {
                    clearInterval(fadeOut);
                    if (this.currentTrack) {
                        this.currentTrack.pause();
                        this.currentTrack = null;
                    }
                    this.currentInfo = null;
                }
            }, duration / steps);
        }
    }
    
    /**
     * Set volume (0-1)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.currentTrack) {
            this.currentTrack.volume = this.volume;
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('mazechase_music_volume', String(this.volume));
        }
    }
    
    /**
     * Toggle music on/off
     */
    toggle(): boolean {
        this.enabled = !this.enabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('mazechase_music_enabled', String(this.enabled));
        }
        
        if (!this.enabled) {
            this.stop();
        }
        
        return this.enabled;
    }
    
    /**
     * Get current track info
     */
    getCurrentTrack(): MusicTrack | null {
        return this.currentInfo;
    }
    
    /**
     * Check if music is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

// Singleton instance
let musicManagerInstance: MusicManager | null = null;

export function getMusicManager(): MusicManager {
    if (!musicManagerInstance) {
        musicManagerInstance = new MusicManager();
    }
    return musicManagerInstance;
}
