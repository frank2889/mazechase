// Sound effects and music manager for MazeChase game

/**
 * Sound effects configuration
 */
export interface SoundConfig {
    volume: number;
    muted: boolean;
    musicEnabled: boolean;
    sfxEnabled: boolean;
}

/**
 * Sound Manager for game audio
 */
export class SoundManager {
    private scene: Phaser.Scene;
    private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
    private music: Phaser.Sound.BaseSound | null = null;
    private config: SoundConfig;
    private loaded: boolean = false;

    constructor(scene: Phaser.Scene, config: Partial<SoundConfig> = {}) {
        this.scene = scene;
        this.config = {
            volume: config.volume ?? 0.5,
            muted: config.muted ?? false,
            musicEnabled: config.musicEnabled ?? true,
            sfxEnabled: config.sfxEnabled ?? true
        };

        // Load config from localStorage
        this.loadConfig();
    }

    /**
     * Preload all sound assets
     */
    preload(): void {
        const audioPath = '/audio';

        // MazeChase sounds
        this.scene.load.audio('chomp', `${audioPath}/chomp.mp3`);
        this.scene.load.audio('death', `${audioPath}/death.mp3`);
        this.scene.load.audio('eatChaser', `${audioPath}/eat_ghost.mp3`);
        this.scene.load.audio('eatFruit', `${audioPath}/eat_fruit.mp3`);
        this.scene.load.audio('powerUp', `${audioPath}/power_pellet.mp3`);
        this.scene.load.audio('siren', `${audioPath}/siren.mp3`);
        this.scene.load.audio('frightened', `${audioPath}/frightened.mp3`);
        this.scene.load.audio('gameStart', `${audioPath}/game_start.mp3`);
        this.scene.load.audio('gameOver', `${audioPath}/game_over.mp3`);
        this.scene.load.audio('win', `${audioPath}/win.mp3`);
        this.scene.load.audio('intermission', `${audioPath}/intermission.mp3`);

        // Background music
        this.scene.load.audio('bgMusic', `${audioPath}/background.mp3`);
    }

    /**
     * Initialize sounds after loading
     */
    create(): void {
        if (this.loaded) return;

        // Create sound instances
        const soundKeys = [
            'chomp', 'death', 'eatChaser', 'eatFruit', 'powerUp',
            'siren', 'frightened', 'gameStart', 'gameOver', 'win', 'intermission'
        ];

        for (const key of soundKeys) {
            try {
                const sound = this.scene.sound.add(key, { volume: this.config.volume });
                this.sounds.set(key, sound);
            } catch (e) {
                console.warn(`Failed to load sound: ${key}`);
            }
        }

        // Create background music (looped)
        try {
            this.music = this.scene.sound.add('bgMusic', {
                volume: this.config.volume * 0.3,
                loop: true
            });
        } catch (e) {
            console.warn('Failed to load background music');
        }

        this.loaded = true;
    }

    /**
     * Play a sound effect
     */
    play(key: SoundEffect): void {
        if (!this.config.sfxEnabled || this.config.muted) return;

        const sound = this.sounds.get(key);
        if (sound && !sound.isPlaying) {
            sound.play();
        }
    }

    /**
     * Play sound with specific configuration
     */
    playWithConfig(key: SoundEffect, config: Phaser.Types.Sound.SoundConfig): void {
        if (!this.config.sfxEnabled || this.config.muted) return;

        const sound = this.sounds.get(key);
        if (sound) {
            sound.play(config);
        }
    }

    /**
     * Stop a specific sound
     */
    stop(key: SoundEffect): void {
        const sound = this.sounds.get(key);
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }

    /**
     * Stop all sounds
     */
    stopAll(): void {
        this.sounds.forEach(sound => {
            if (sound.isPlaying) sound.stop();
        });
        this.stopMusic();
    }

    /**
     * Start background music
     */
    startMusic(): void {
        if (!this.config.musicEnabled || this.config.muted) return;

        if (this.music && !this.music.isPlaying) {
            this.music.play();
        }
    }

    /**
     * Stop background music
     */
    stopMusic(): void {
        if (this.music && this.music.isPlaying) {
            this.music.stop();
        }
    }

    /**
     * Pause/resume music
     */
    toggleMusic(): void {
        if (!this.music) return;

        if (this.music.isPlaying) {
            this.music.pause();
        } else {
            this.music.resume();
        }
    }

    /**
     * Set master volume
     */
    setVolume(volume: number): void {
        this.config.volume = Math.max(0, Math.min(1, volume));

        this.sounds.forEach(sound => {
            (sound as any).volume = this.config.volume;
        });

        if (this.music) {
            (this.music as any).volume = this.config.volume * 0.3;
        }

        this.saveConfig();
    }

    /**
     * Mute/unmute all audio
     */
    setMuted(muted: boolean): void {
        this.config.muted = muted;

        if (muted) {
            this.stopAll();
        }

        this.saveConfig();
    }

    /**
     * Toggle mute
     */
    toggleMute(): boolean {
        this.setMuted(!this.config.muted);
        return this.config.muted;
    }

    /**
     * Enable/disable sound effects
     */
    setSfxEnabled(enabled: boolean): void {
        this.config.sfxEnabled = enabled;
        this.saveConfig();
    }

    /**
     * Enable/disable music
     */
    setMusicEnabled(enabled: boolean): void {
        this.config.musicEnabled = enabled;

        if (!enabled) {
            this.stopMusic();
        }

        this.saveConfig();
    }

    /**
     * Get current config
     */
    getConfig(): SoundConfig {
        return { ...this.config };
    }

    /**
     * Save config to localStorage
     */
    private saveConfig(): void {
        try {
            localStorage.setItem('mazechase-sound-config', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Failed to save sound config');
        }
    }

    /**
     * Load config from localStorage
     */
    private loadConfig(): void {
        try {
            const saved = localStorage.getItem('mazechase-sound-config');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load sound config');
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stopAll();
        this.sounds.clear();
        this.music = null;
    }
}

// Type definitions for sound effects
export type SoundEffect =
    | 'chomp'
    | 'death'
    | 'eatChaser'
    | 'eatFruit'
    | 'powerUp'
    | 'siren'
    | 'frightened'
    | 'gameStart'
    | 'gameOver'
    | 'win'
    | 'intermission';

// Type declaration for Phaser (for compatibility)
declare const Phaser: any;

/**
 * Create placeholder audio files for development
 * In production, replace with actual MazeChase-style sounds
 */
export function createPlaceholderAudioInfo(): string {
    return `
To add sound effects, create the following audio files in /public/audio/:

1. chomp.mp3 - Runner eating pellets (short, repeatable)
2. death.mp3 - Runner caught sound
3. eat_ghost.mp3 - Catching a frightened chaser
4. eat_fruit.mp3 - Eating bonus fruit
5. power_pellet.mp3 - Collecting power pellet
6. siren.mp3 - Chaser pursuit siren (loopable)
7. frightened.mp3 - Chasers frightened state sound
8. game_start.mp3 - MazeChase start jingle
9. game_over.mp3 - Game over sound
10. win.mp3 - Level complete / win sound
11. intermission.mp3 - Cutscene music
12. background.mp3 - Background music (loopable)

You can find royalty-free retro game sounds at:
- freesound.org
- opengameart.org
- itch.io/game-assets
    `;
}
