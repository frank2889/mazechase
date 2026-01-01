/**
 * Spatial Audio System
 * 
 * AI Tester Suggestion (Kenji - Audio UX Expert):
 * "Directional cues for Chaser proximity should be improved with spatial audio.
 * Players need to hear where danger is coming from - left/right/behind."
 * 
 * Uses Web Audio API for 3D positional sound
 */

interface Position3D {
    x: number;
    y: number;
    z: number;
}

interface SpatialSoundConfig {
    rolloffFactor?: number;
    refDistance?: number;
    maxDistance?: number;
    coneInnerAngle?: number;
    coneOuterAngle?: number;
    coneOuterGain?: number;
}

interface ActiveSpatialSound {
    source: AudioBufferSourceNode;
    panner: PannerNode;
    gainNode: GainNode;
    buffer: AudioBuffer;
}

const DEFAULT_CONFIG: SpatialSoundConfig = {
    rolloffFactor: 1.5,
    refDistance: 1,
    maxDistance: 100,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0.3
};

export class SpatialAudioManager {
    private context: AudioContext | null = null;
    private listener: AudioListener | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private activeSounds: Map<string, ActiveSpatialSound> = new Map();
    private masterGain: GainNode | null = null;
    private enabled = true;
    private listenerPosition: Position3D = { x: 0, y: 0, z: 0 };

    /**
     * Initialize the spatial audio system
     */
    async initialize(): Promise<void> {
        try {
            this.context = new AudioContext();
            this.listener = this.context.listener;
            
            // Create master gain for volume control
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = 1.0;

            // Set initial listener position at origin
            this.setListenerPosition({ x: 0, y: 0, z: 0 });
            
            console.log('[SpatialAudio] Initialized with Web Audio API');
        } catch (e) {
            console.warn('[SpatialAudio] Failed to initialize:', e);
            this.enabled = false;
        }
    }

    /**
     * Preload a sound for spatial playback
     */
    async loadSound(name: string, url: string): Promise<void> {
        if (!this.context) return;

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch (e) {
            console.warn(`[SpatialAudio] Failed to load sound '${name}':`, e);
        }
    }

    /**
     * Update the listener (player) position
     * Call this every frame with player's current position
     */
    setListenerPosition(position: Position3D): void {
        if (!this.listener) return;
        
        this.listenerPosition = position;
        
        // Web Audio API uses different coordinates
        // Game: Y is up, Z is forward
        // WebAudio: Y is up, Z is forward (same!)
        if (this.listener.positionX) {
            // Modern API
            this.listener.positionX.value = position.x;
            this.listener.positionY.value = position.y;
            this.listener.positionZ.value = position.z;
        } else {
            // Legacy API
            this.listener.setPosition(position.x, position.y, position.z);
        }
    }

    /**
     * Update listener orientation for proper stereo panning
     * forward: direction player is facing
     * up: up vector (usually 0,1,0)
     */
    setListenerOrientation(forward: Position3D, up: Position3D): void {
        if (!this.listener) return;
        
        if (this.listener.forwardX) {
            this.listener.forwardX.value = forward.x;
            this.listener.forwardY.value = forward.y;
            this.listener.forwardZ.value = forward.z;
            this.listener.upX.value = up.x;
            this.listener.upY.value = up.y;
            this.listener.upZ.value = up.z;
        } else {
            this.listener.setOrientation(
                forward.x, forward.y, forward.z,
                up.x, up.y, up.z
            );
        }
    }

    /**
     * Play a sound at a specific 3D position
     * Returns a unique ID for the sound instance
     */
    playSoundAt(
        name: string, 
        position: Position3D, 
        config: Partial<SpatialSoundConfig> = {}
    ): string | null {
        if (!this.enabled || !this.context || !this.masterGain) return null;

        const buffer = this.buffers.get(name);
        if (!buffer) {
            console.warn(`[SpatialAudio] Sound '${name}' not loaded`);
            return null;
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        
        // Create audio nodes
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        // Panner for 3D positioning
        const panner = this.context.createPanner();
        panner.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D
        panner.distanceModel = 'inverse';
        panner.rolloffFactor = finalConfig.rolloffFactor!;
        panner.refDistance = finalConfig.refDistance!;
        panner.maxDistance = finalConfig.maxDistance!;
        panner.coneInnerAngle = finalConfig.coneInnerAngle!;
        panner.coneOuterAngle = finalConfig.coneOuterAngle!;
        panner.coneOuterGain = finalConfig.coneOuterGain!;
        
        // Set position
        panner.positionX.value = position.x;
        panner.positionY.value = position.y;
        panner.positionZ.value = position.z;
        
        // Gain node for individual volume control
        const gainNode = this.context.createGain();
        gainNode.gain.value = 1.0;
        
        // Connect: source -> panner -> gain -> master -> destination
        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Generate unique ID
        const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store for position updates
        this.activeSounds.set(id, { source, panner, gainNode, buffer });
        
        // Clean up when done
        source.onended = () => {
            this.activeSounds.delete(id);
        };
        
        source.start();
        
        return id;
    }

    /**
     * Play a looping sound at a position (for Chaser proximity warning)
     */
    playLoopAt(
        name: string,
        position: Position3D,
        config: Partial<SpatialSoundConfig> = {}
    ): string | null {
        const id = this.playSoundAt(name, position, config);
        
        if (id) {
            const sound = this.activeSounds.get(id);
            if (sound) {
                sound.source.loop = true;
            }
        }
        
        return id;
    }

    /**
     * Update position of an active sound (for moving sources like Chasers)
     */
    updateSoundPosition(id: string, position: Position3D): void {
        const sound = this.activeSounds.get(id);
        if (!sound) return;
        
        sound.panner.positionX.value = position.x;
        sound.panner.positionY.value = position.y;
        sound.panner.positionZ.value = position.z;
    }

    /**
     * Calculate direction and intensity of a sound relative to listener
     * Useful for UI indicators (radar, directional arrows)
     */
    getSoundDirection(position: Position3D): { angle: number; distance: number; intensity: number } {
        const dx = position.x - this.listenerPosition.x;
        const dz = position.z - this.listenerPosition.z;
        
        // Angle in radians from listener forward direction
        const angle = Math.atan2(dx, -dz);
        
        // Distance for intensity calculation
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Intensity falls off with distance (inverse relationship)
        const intensity = Math.min(1, 10 / (distance + 1));
        
        return { angle, distance, intensity };
    }

    /**
     * Stop a specific sound
     */
    stopSound(id: string): void {
        const sound = this.activeSounds.get(id);
        if (sound) {
            sound.source.stop();
            this.activeSounds.delete(id);
        }
    }

    /**
     * Stop all active sounds
     */
    stopAllSounds(): void {
        for (const [_id, sound] of this.activeSounds) {
            sound.source.stop();
        }
        this.activeSounds.clear();
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(volume: number): void {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Enable/disable spatial audio
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAllSounds();
        }
    }

    /**
     * Resume audio context (must be called after user interaction)
     */
    async resume(): Promise<void> {
        if (this.context?.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.stopAllSounds();
        this.buffers.clear();
        
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}

// Singleton instance
let spatialAudioManager: SpatialAudioManager | null = null;

export function getSpatialAudio(): SpatialAudioManager {
    if (!spatialAudioManager) {
        spatialAudioManager = new SpatialAudioManager();
    }
    return spatialAudioManager;
}

/**
 * Chaser proximity audio helper
 * Plays directional warning sounds when Chasers get close
 */
export class ChaserProximityAudio {
    private spatialAudio: SpatialAudioManager;
    private chaserSounds: Map<string, string> = new Map(); // chaser ID -> sound ID
    private warningThreshold = 15; // Units at which warning starts
    private dangerThreshold = 5;   // Units at which danger sound plays
    
    constructor(spatialAudio: SpatialAudioManager) {
        this.spatialAudio = spatialAudio;
    }

    /**
     * Update chaser positions and play appropriate sounds
     * Call this every frame with all nearby chasers
     */
    updateChasers(playerPos: Position3D, chasers: Array<{ id: string; position: Position3D }>): void {
        // Update listener (player) position
        this.spatialAudio.setListenerPosition(playerPos);
        
        const activeChaserIds = new Set<string>();
        
        for (const chaser of chasers) {
            activeChaserIds.add(chaser.id);
            
            const { distance } = this.spatialAudio.getSoundDirection(chaser.position);
            
            if (distance <= this.warningThreshold) {
                // Chaser is close - play/update warning sound
                let soundId: string | undefined = this.chaserSounds.get(chaser.id);
                
                if (!soundId) {
                    // Start new proximity sound
                    const soundName = distance <= this.dangerThreshold ? 'chaser_danger' : 'chaser_warning';
                    soundId = this.spatialAudio.playLoopAt(soundName, chaser.position, {
                        rolloffFactor: 2,
                        refDistance: 2,
                        maxDistance: this.warningThreshold
                    }) ?? undefined;
                    if (soundId) {
                        this.chaserSounds.set(chaser.id, soundId);
                    }
                } else {
                    // Update existing sound position
                    this.spatialAudio.updateSoundPosition(soundId, chaser.position);
                }
            } else {
                // Chaser is far - stop any warning sound
                this.stopChaserSound(chaser.id);
            }
        }
        
        // Stop sounds for chasers no longer nearby
        for (const [chaserId] of this.chaserSounds) {
            if (!activeChaserIds.has(chaserId)) {
                this.stopChaserSound(chaserId);
            }
        }
    }

    private stopChaserSound(chaserId: string): void {
        const soundId = this.chaserSounds.get(chaserId);
        if (soundId) {
            this.spatialAudio.stopSound(soundId);
            this.chaserSounds.delete(chaserId);
        }
    }

    /**
     * Stop all chaser proximity sounds
     */
    stopAll(): void {
        for (const [chaserId] of this.chaserSounds) {
            this.stopChaserSound(chaserId);
        }
    }
}

/**
 * Enhanced Directional Audio Cues
 * 
 * AI Tester Suggestion (Kenji - Audio Specialist):
 * "Verbeter directional audio cues voor chasers.
 * Spelers moeten duidelijker horen waar gevaar vandaan komt."
 * 
 * Features improved HRTF and stereo panning
 */
export interface DirectionalCue {
    direction: 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';
    distance: 'near' | 'medium' | 'far';
    intensity: number; // 0-1
    angle: number; // degrees
}

export interface EnhancedSpatialConfig {
    useHRTF: boolean;
    panningModel: 'HRTF' | 'equalpower';
    distanceModel: 'linear' | 'inverse' | 'exponential';
    directionalCueVolume: number;
    heartbeatEnabled: boolean;
    heartbeatThreshold: number;
}

const DEFAULT_ENHANCED_CONFIG: EnhancedSpatialConfig = {
    useHRTF: true,
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    directionalCueVolume: 0.8,
    heartbeatEnabled: true,
    heartbeatThreshold: 8
};

/**
 * EnhancedDirectionalAudio - Improved spatial audio cues
 */
export class EnhancedDirectionalAudio {
    private context: AudioContext | null = null;
    private config: EnhancedSpatialConfig;
    private heartbeatOsc: OscillatorNode | null = null;
    private lastHeartbeatTime: number = 0;
    private currentHeartbeatRate: number = 0;

    constructor(config: Partial<EnhancedSpatialConfig> = {}) {
        this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    }

    async initialize(): Promise<void> {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[EnhancedDirectionalAudio] Initialized');
    }

    /**
     * Calculate directional cue from position
     */
    calculateDirectionalCue(
        listenerPos: Position3D,
        listenerForward: Position3D,
        targetPos: Position3D
    ): DirectionalCue {
        // Calculate vector to target
        const dx = targetPos.x - listenerPos.x;
        const dz = targetPos.z - listenerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Calculate angle relative to listener's forward direction
        const targetAngle = Math.atan2(dx, dz) * (180 / Math.PI);
        const forwardAngle = Math.atan2(listenerForward.x, listenerForward.z) * (180 / Math.PI);
        let relativeAngle = targetAngle - forwardAngle;
        
        // Normalize to -180 to 180
        while (relativeAngle > 180) relativeAngle -= 360;
        while (relativeAngle < -180) relativeAngle += 360;

        // Determine direction
        let direction: DirectionalCue['direction'];
        if (relativeAngle >= -22.5 && relativeAngle < 22.5) {
            direction = 'front';
        } else if (relativeAngle >= 22.5 && relativeAngle < 67.5) {
            direction = 'front-right';
        } else if (relativeAngle >= 67.5 && relativeAngle < 112.5) {
            direction = 'right';
        } else if (relativeAngle >= 112.5 && relativeAngle < 157.5) {
            direction = 'back-right';
        } else if (relativeAngle >= 157.5 || relativeAngle < -157.5) {
            direction = 'back';
        } else if (relativeAngle >= -157.5 && relativeAngle < -112.5) {
            direction = 'back-left';
        } else if (relativeAngle >= -112.5 && relativeAngle < -67.5) {
            direction = 'left';
        } else {
            direction = 'front-left';
        }

        // Determine distance category
        let distanceCat: DirectionalCue['distance'];
        if (distance < 5) {
            distanceCat = 'near';
        } else if (distance < 15) {
            distanceCat = 'medium';
        } else {
            distanceCat = 'far';
        }

        // Calculate intensity (inverse of distance, clamped)
        const intensity = Math.max(0, Math.min(1, 1 - (distance / 20)));

        return {
            direction,
            distance: distanceCat,
            intensity,
            angle: relativeAngle
        };
    }

    /**
     * Play directional warning sound
     */
    playDirectionalWarning(cue: DirectionalCue): void {
        if (!this.context) return;

        const now = this.context.currentTime;

        // Create oscillator for warning tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const panner = this.context.createStereoPanner();

        // Set frequency based on distance
        const baseFreq = cue.distance === 'near' ? 800 : cue.distance === 'medium' ? 600 : 400;
        osc.frequency.value = baseFreq;
        osc.type = 'triangle';

        // Set pan based on direction
        let panValue = 0;
        if (cue.direction.includes('left')) panValue = -0.8;
        if (cue.direction.includes('right')) panValue = 0.8;
        panner.pan.value = panValue;

        // Set volume based on intensity
        const volume = cue.intensity * this.config.directionalCueVolume;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        // Connect
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.context.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Update heartbeat effect based on nearest chaser distance
     */
    updateHeartbeat(nearestDistance: number): void {
        if (!this.config.heartbeatEnabled || !this.context) return;

        const now = performance.now();

        if (nearestDistance < this.config.heartbeatThreshold) {
            // Calculate heartbeat rate (faster when closer)
            const normalizedDist = nearestDistance / this.config.heartbeatThreshold;
            this.currentHeartbeatRate = 400 + (1 - normalizedDist) * 400; // 400-800ms between beats

            // Check if we should play heartbeat
            if (now - this.lastHeartbeatTime > this.currentHeartbeatRate) {
                this.playHeartbeat(1 - normalizedDist);
                this.lastHeartbeatTime = now;
            }
        }
    }

    /**
     * Play heartbeat sound
     */
    private playHeartbeat(intensity: number): void {
        if (!this.context) return;

        const now = this.context.currentTime;

        // First beat (lub)
        this.playBeat(now, 60, 0.08, intensity);
        // Second beat (dub)
        this.playBeat(now + 0.12, 50, 0.06, intensity * 0.8);
    }

    /**
     * Play single heartbeat
     */
    private playBeat(time: number, freq: number, duration: number, volume: number): void {
        if (!this.context) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.value = freq;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.start(time);
        osc.stop(time + duration);
    }

    /**
     * Get verbal direction for UI
     */
    getDirectionText(cue: DirectionalCue): string {
        const distanceText = cue.distance === 'near' ? '!' : cue.distance === 'medium' ? '' : '...';
        
        const directionMap: Record<DirectionalCue['direction'], string> = {
            'front': '⬆️',
            'back': '⬇️',
            'left': '⬅️',
            'right': '➡️',
            'front-left': '↖️',
            'front-right': '↗️',
            'back-left': '↙️',
            'back-right': '↘️'
        };

        return `${directionMap[cue.direction]}${distanceText}`;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        if (this.heartbeatOsc) {
            this.heartbeatOsc.stop();
        }
        if (this.context) {
            this.context.close();
        }
    }
}

// Singleton for enhanced audio
let enhancedDirectionalAudio: EnhancedDirectionalAudio | null = null;

export function getEnhancedDirectionalAudio(): EnhancedDirectionalAudio {
    if (!enhancedDirectionalAudio) {
        enhancedDirectionalAudio = new EnhancedDirectionalAudio();
    }
    return enhancedDirectionalAudio;
}
