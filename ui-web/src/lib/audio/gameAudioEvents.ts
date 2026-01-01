/**
 * Game Audio Events - Integration layer between game events and SoundAI
 * 
 * This module replaces direct playSound() calls with SoundAI.handleEvent()
 * for intelligent, context-aware audio playback.
 * 
 * Usage:
 * - Import initGameAudio() in main.ts
 * - Call subscribeGameAudioEvents() after game initialization
 */

import { getSoundAI, type GameEvent, type EventContext } from './soundAI';
import { getBabylonSpatialAudio } from './babylonSpatialAudio';
import type { Scene } from '@babylonjs/core';

export interface GameEventData {
    type: string;
    x?: number;
    y?: number;
    playerId?: string;
    streak?: number;
    powerUpType?: string;
    role?: 'runner' | 'chaser';
    milestoneValue?: number;
    countdown?: number;
}

// Map game event types to SoundAI events
const EVENT_MAPPING: Record<string, GameEvent> = {
    'pellet_eaten': 'pellet_eaten',
    'pellet': 'pellet_eaten',
    'power_pellet': 'power_pellet_eaten',
    'powerup_collected': 'powerup_collected',
    'powerup_activated': 'powerup_activated',
    'powerup_start': 'powerup_activated',
    'powerup_expired': 'powerup_expired',
    'powerup_end': 'powerup_expired',
    'player_caught': 'player_caught',
    'caught': 'player_caught',
    'player_escaped': 'player_escaped',
    'escape': 'player_escaped',
    'game_start': 'game_start',
    'round_start': 'round_start',
    'game_over': 'game_over',
    'round_end': 'round_end',
    'countdown': 'countdown_tick',
    'countdown_go': 'countdown_go',
    'role_switch': 'role_switch',
    'role_changed': 'role_switch',
    'wall_bump': 'wall_bump',
    'collision': 'wall_bump',
    'milestone': 'milestone_reached',
    'achievement': 'milestone_reached'
};

/**
 * GameAudioEvents - Central handler for game audio events
 */
class GameAudioEvents {
    private soundAI = getSoundAI();
    private currentStreak: number = 0;
    private currentRole: 'runner' | 'chaser' = 'runner';
    private currentTheme: string = 'neon_night';
    private isInitialized: boolean = false;

    /**
     * Initialize with Babylon scene for spatial audio
     */
    initialize(_scene: Scene): void {
        this.isInitialized = true;
        
        // Set initial theme for reverb
        this.soundAI.setTheme(this.currentTheme);
        
        console.log('🔊 GameAudioEvents initialized');
    }

    /**
     * Handle a game event and trigger appropriate audio
     */
    handleEvent(eventData: GameEventData): void {
        if (!this.isInitialized) {
            console.warn('GameAudioEvents not initialized');
            return;
        }

        // Map to SoundAI event type
        const soundEvent = EVENT_MAPPING[eventData.type];
        if (!soundEvent) {
            // console.debug(`No audio mapping for event: ${eventData.type}`);
            return;
        }

        // Build context from event data
        const context: EventContext = {
            playerPosition: eventData.x !== undefined && eventData.y !== undefined
                ? { x: eventData.x, y: 0, z: eventData.y }
                : undefined,
            streak: eventData.streak ?? this.currentStreak,
            powerUpType: eventData.powerUpType,
            milestoneValue: eventData.milestoneValue,
            theme: this.currentTheme,
            isRunner: this.currentRole === 'runner'
        };

        // Update internal state
        if (eventData.type === 'pellet_eaten' || eventData.type === 'pellet') {
            this.currentStreak = (eventData.streak ?? this.currentStreak) + 1;
        }

        if (eventData.type === 'player_caught' || eventData.type === 'game_over') {
            this.currentStreak = 0;
        }

        if (eventData.role) {
            this.currentRole = eventData.role;
        }

        // Handle countdown specially (different sounds for different numbers)
        if (eventData.type === 'countdown' && eventData.countdown !== undefined) {
            if (eventData.countdown === 0) {
                this.soundAI.handleEvent('countdown_go', context);
            } else {
                this.soundAI.handleEvent('countdown_tick', context);
            }
            return;
        }

        // Trigger the sound event
        this.soundAI.handleEvent(soundEvent, context);
    }

    /**
     * Set current game theme for audio environment
     */
    setTheme(theme: string): void {
        this.currentTheme = theme;
        this.soundAI.setTheme(theme);
    }

    /**
     * Set current player role
     */
    setRole(role: 'runner' | 'chaser'): void {
        if (role !== this.currentRole) {
            this.currentRole = role;
            this.handleEvent({ type: 'role_switch', role });
        }
    }

    /**
     * Reset streak counter
     */
    resetStreak(): void {
        if (this.currentStreak > 5) {
            this.soundAI.handleEvent('streak_broken', { streak: this.currentStreak });
        }
        this.currentStreak = 0;
    }

    /**
     * Get current streak for display purposes
     */
    getStreak(): number {
        return this.currentStreak;
    }

    /**
     * Resume audio context (call after user interaction)
     */
    async resumeAudio(): Promise<void> {
        await this.soundAI.resume();
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(volume: number): void {
        this.soundAI.setMasterVolume(volume);
        getBabylonSpatialAudio()?.setMasterVolume(volume);
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.soundAI.dispose();
        getBabylonSpatialAudio()?.dispose();
        this.isInitialized = false;
    }
}

// Singleton instance
let gameAudioEventsInstance: GameAudioEvents | null = null;

export function getGameAudioEvents(): GameAudioEvents {
    if (!gameAudioEventsInstance) {
        gameAudioEventsInstance = new GameAudioEvents();
    }
    return gameAudioEventsInstance;
}

/**
 * Initialize game audio system
 * Call this in main.ts after scene creation
 */
export function initGameAudio(scene: Scene): GameAudioEvents {
    const gameAudio = getGameAudioEvents();
    gameAudio.initialize(scene);
    return gameAudio;
}

/**
 * Helper function to create event handler for WebSocket events
 * Use this to replace direct playSound() calls
 * 
 * Example:
 * ws.on('pellet_eaten', (data) => handleGameAudioEvent('pellet_eaten', data));
 */
export function handleGameAudioEvent(eventType: string, data?: Partial<GameEventData>): void {
    getGameAudioEvents().handleEvent({
        type: eventType,
        ...data
    });
}

/**
 * Subscribe to game events from WebSocket or game state
 * Call this in main.ts to connect audio to game events
 */
export function subscribeGameAudioEvents(
    eventEmitter: {
        on: (event: string, handler: (data: any) => void) => void
    }
): void {
    const audioEvents = Object.keys(EVENT_MAPPING);
    
    for (const eventType of audioEvents) {
        eventEmitter.on(eventType, (data: any) => {
            handleGameAudioEvent(eventType, {
                x: data?.x,
                y: data?.y,
                playerId: data?.playerId,
                streak: data?.streak,
                powerUpType: data?.powerUpType,
                milestoneValue: data?.milestoneValue,
                countdown: data?.countdown
            });
        });
    }
    
    console.log(`🔊 Subscribed to ${audioEvents.length} game audio events`);
}

export default GameAudioEvents;
