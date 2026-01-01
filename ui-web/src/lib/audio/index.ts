/**
 * MazeChase Audio System - Main Export
 * 
 * Provides unified access to all audio subsystems:
 * - SoundAI: Event-driven audio with priority queuing
 * - BabylonSpatialAudio: 3D positional audio using Babylon.js
 * - GameAudioEvents: Game event to audio mapping
 * - ThemeMusicManager: Adaptive theme-based music
 * - SpatialAudioManager: Web Audio API spatial audio (legacy)
 */

// Event-driven audio intelligence
export { 
    SoundAI,
    getSoundAI,
    type GameEvent,
    type EventContext,
    type SoundPriority
} from './soundAI';

// Babylon.js 3D spatial audio
export {
    BabylonSpatialAudio,
    getBabylonSpatialAudio,
    initBabylonSpatialAudio,
    type SpatialSoundConfig
} from './babylonSpatialAudio';

// Game event integration
export {
    getGameAudioEvents,
    initGameAudio,
    handleGameAudioEvent,
    subscribeGameAudioEvents,
    type GameEventData
} from './gameAudioEvents';

// Theme music
export {
    ThemeMusicManager,
    type GameTheme,
    type ThemeMusicConfig
} from './themeMusic';

// Legacy spatial audio (Web Audio API)
export {
    SpatialAudioManager,
    getSpatialAudio
} from './spatialAudio';

// Power-up sounds
export {
    PowerUpSoundManager,
    getPowerUpSoundManager
} from './powerUpSounds';

// Pellet sounds
export {
    PelletSoundManager
} from './pelletSound';

// Chaser sounds
export {
    ChaserSoundManager
} from './chaserSounds';

/**
 * Initialize all audio systems
 * Call this in main.ts after scene creation
 */
import type { Scene } from '@babylonjs/core';
import { initGameAudio } from './gameAudioEvents';
import { initBabylonSpatialAudio } from './babylonSpatialAudio';

export function initializeAudioSystem(scene: Scene): {
    gameAudio: ReturnType<typeof initGameAudio>;
    spatialAudio: ReturnType<typeof initBabylonSpatialAudio>;
} {
    console.log('🔊 Initializing MazeChase audio system...');
    
    const gameAudio = initGameAudio(scene);
    const spatialAudio = initBabylonSpatialAudio(scene);
    
    console.log('🔊 Audio system initialized');
    
    return { gameAudio, spatialAudio };
}
