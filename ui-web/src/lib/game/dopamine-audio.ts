/**
 * Dopamine Audio Effects - Synthesized feedback sounds using Tone.js
 * 
 * Creates satisfying audio feedback for game actions that trigger dopamine:
 * - Pellet collection (ascending tones with satisfying "pop")
 * - Power-up activation (synth burst)
 * - Streak bonuses (chord progression)
 * - Near miss (tension release)
 * - Victory (triumphant fanfare)
 * - Chaser proximity (3D spatial audio warning)
 * 
 * Sprint 4 Audio Update (Kenji feedback):
 * - Enhanced pellet "pop" sound with satisfying attack
 * - 3D spatial audio for chaser proximity
 * - Improved power-up activation impact
 * 
 * @see https://tonejs.github.io/
 */

import * as Tone from 'tone';

// Lazy initialization - only load Tone.js when first used
let isInitialized = false;
let synth: Tone.Synth | null = null;
let polySynth: Tone.PolySynth | null = null;
let metalSynth: Tone.MetalSynth | null = null;
let noiseSynth: Tone.NoiseSynth | null = null; // For "pop" texture

// Sprint 4: Spatial audio components
let panner3D: Tone.Panner3D | null = null;
let chaserSynth: Tone.Synth | null = null;
let isPlayingChaserWarning = false;
let chaserOscillator: Tone.Oscillator | null = null;

/**
 * Initialize Tone.js synthesizers
 * Must be called after user interaction (browser audio policy)
 */
export async function initDopamineAudio(): Promise<void> {
    if (isInitialized) return;
    
    try {
        // Start audio context
        await Tone.start();
        
        // Simple synth for pellets - enhanced with brighter attack
        synth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.005, // Faster attack for more "pop"
                decay: 0.08,
                sustain: 0.05,
                release: 0.2
            }
        }).toDestination();
        synth.volume.value = -8; // Slightly louder
        
        // Noise synth for pellet "pop" texture
        noiseSynth = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.001,
                decay: 0.03,
                sustain: 0,
                release: 0.02
            }
        }).toDestination();
        noiseSynth.volume.value = -25; // Subtle pop texture
        
        // Poly synth for chords (streaks, victories)
        polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.02,
                decay: 0.2,
                sustain: 0.2,
                release: 0.5
            }
        }).toDestination();
        polySynth.volume.value = -12;
        
        // Metal synth for impacts
        metalSynth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
                attack: 0.001,
                decay: 0.1,
                release: 0.05
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination();
        metalSynth.volume.value = -20;
        
        // Sprint 4: 3D Panner for spatial audio
        panner3D = new Tone.Panner3D({
            panningModel: 'HRTF', // Head-related transfer function for realistic 3D
            distanceModel: 'exponential',
            refDistance: 1,
            maxDistance: 50,
            rolloffFactor: 2,
            coneInnerAngle: 360,
            coneOuterAngle: 360
        }).toDestination();
        
        // Chaser warning synth - ominous low frequency
        chaserSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.3,
                decay: 0.1,
                sustain: 0.8,
                release: 0.5
            }
        }).connect(panner3D);
        chaserSynth.volume.value = -18;
        
        isInitialized = true;
        console.log('🔊 Dopamine audio initialized (with spatial audio)');
    } catch (e) {
        console.log('Tone.js init failed:', e);
    }
}

/**
 * Play pellet collection sound
 * Rising pitch for consecutive pellets creates satisfaction
 * Sprint 4: Enhanced with "pop" texture for more satisfying feel
 */
let pelletPitch = 0;
let lastPelletTime = 0;

export function playPelletSound(): void {
    if (!isInitialized || !synth) return;
    
    const now = Tone.now();
    
    // Reset pitch after 500ms pause
    if (now - lastPelletTime > 0.5) {
        pelletPitch = 0;
    }
    
    // Rising pitch for consecutive pellets (max 12 semitones = 1 octave)
    const baseNote = 587.33; // D5 - slightly higher for brighter sound
    const frequency = baseNote * Math.pow(2, Math.min(pelletPitch, 12) / 12);
    
    // Main tone
    synth.triggerAttackRelease(frequency, '32n', now);
    
    // Add subtle "pop" noise texture for satisfaction (Kenji feedback)
    if (noiseSynth) {
        noiseSynth.triggerAttackRelease('64n', now);
    }
    
    pelletPitch++;
    lastPelletTime = now;
}

/**
 * Play power-up activation sound
 * Synth burst with filter sweep - enhanced with more impact
 */
export function playPowerUpSound(): void {
    if (!isInitialized || !polySynth) return;
    
    const now = Tone.now();
    
    // Major chord arpeggio with stronger attack
    polySynth.triggerAttackRelease('C4', '8n', now);
    polySynth.triggerAttackRelease('E4', '8n', now + 0.04);
    polySynth.triggerAttackRelease('G4', '8n', now + 0.08);
    polySynth.triggerAttackRelease('C5', '4n', now + 0.12); // Longer final note
    
    // Add impact "boom" with metal synth
    if (metalSynth) {
        metalSynth.triggerAttackRelease('C3', '16n', now);
    }
}

/**
 * Play streak bonus sound
 * Triumphant chord progression
 */
export function playStreakSound(streakLevel: number): void {
    if (!isInitialized || !polySynth) return;
    
    const now = Tone.now();
    
    // Higher chords for higher streaks
    const baseOctave = Math.min(4 + Math.floor(streakLevel / 3), 6);
    const chord = [`C${baseOctave}`, `E${baseOctave}`, `G${baseOctave}`];
    
    polySynth.triggerAttackRelease(chord, '4n', now);
}

/**
 * Play near miss sound (tension release)
 */
export function playNearMissSound(): void {
    if (!isInitialized || !synth) return;
    
    const now = Tone.now();
    
    // Quick descending tone = relief
    synth.triggerAttackRelease('E5', '16n', now);
    synth.triggerAttackRelease('C5', '16n', now + 0.08);
}

/**
 * Play death/caught sound
 */
export function playDeathSound(): void {
    if (!isInitialized || !metalSynth) return;
    
    metalSynth.triggerAttackRelease('C2', '8n');
}

/**
 * Play victory fanfare
 */
export function playVictorySound(): void {
    if (!isInitialized || !polySynth) return;
    
    const now = Tone.now();
    
    // Triumphant major progression
    polySynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', now);
    polySynth.triggerAttackRelease(['D4', 'F#4', 'A4'], '8n', now + 0.2);
    polySynth.triggerAttackRelease(['E4', 'G#4', 'B4'], '8n', now + 0.4);
    polySynth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '4n', now + 0.6);
}

/**
 * Play game over sound (for loser)
 */
export function playGameOverSound(): void {
    if (!isInitialized || !polySynth) return;
    
    const now = Tone.now();
    
    // Descending minor progression = sad
    polySynth.triggerAttackRelease(['C4', 'Eb4', 'G4'], '8n', now);
    polySynth.triggerAttackRelease(['B3', 'D4', 'F4'], '8n', now + 0.3);
    polySynth.triggerAttackRelease(['Bb3', 'Db4', 'F4'], '4n', now + 0.6);
}

/**
 * Play countdown beep
 */
export function playCountdownBeep(final: boolean = false): void {
    if (!isInitialized || !synth) return;
    
    const note = final ? 'C5' : 'G4';
    const duration = final ? '8n' : '16n';
    synth.triggerAttackRelease(note, duration);
}

/**
 * Clean up audio resources
 */
export function disposeDopamineAudio(): void {
    stopChaserWarning();
    synth?.dispose();
    polySynth?.dispose();
    metalSynth?.dispose();
    noiseSynth?.dispose();
    chaserSynth?.dispose();
    panner3D?.dispose();
    chaserOscillator?.dispose();
    synth = null;
    polySynth = null;
    metalSynth = null;
    noiseSynth = null;
    chaserSynth = null;
    panner3D = null;
    chaserOscillator = null;
    isInitialized = false;
}

// ============================================================================
// SPRINT 4: SPATIAL AUDIO - Chaser Proximity Warning (Kenji feedback)
// ============================================================================

/**
 * Update chaser proximity audio with 3D positioning
 * Call this every frame with the closest chaser's relative position
 * 
 * @param relativeX - X distance from player to closest chaser (-1 to 1 normalized)
 * @param relativeZ - Z distance from player to closest chaser (-1 to 1 normalized)
 * @param distance - Distance to closest chaser (0-1, where 0 = very close)
 */
export function updateChaserProximity(relativeX: number, relativeZ: number, distance: number): void {
    if (!isInitialized || !panner3D) return;
    
    // Only play warning when chaser is close (distance < 0.5)
    const shouldWarn = distance < 0.5;
    
    if (shouldWarn && !isPlayingChaserWarning) {
        startChaserWarning();
    } else if (!shouldWarn && isPlayingChaserWarning) {
        stopChaserWarning();
    }
    
    if (isPlayingChaserWarning && panner3D) {
        // Update 3D position - scale to reasonable audio range
        const scale = 10;
        panner3D.positionX.value = relativeX * scale;
        panner3D.positionY.value = 0; // Same height
        panner3D.positionZ.value = relativeZ * scale;
        
        // Adjust volume based on distance (closer = louder)
        if (chaserOscillator) {
            const volume = -30 + (1 - distance) * 15; // -30 to -15 dB
            chaserOscillator.volume.value = volume;
            
            // Faster pulse when closer
            const pulseRate = 2 + (1 - distance) * 8; // 2-10 Hz
            // Note: For real pulse, you'd use LFO but simple is fine
        }
    }
}

/**
 * Start the ominous chaser warning sound
 */
function startChaserWarning(): void {
    if (isPlayingChaserWarning || !panner3D) return;
    
    try {
        // Low ominous pulse
        chaserOscillator = new Tone.Oscillator({
            frequency: 80, // Low threatening hum
            type: 'sawtooth'
        }).connect(panner3D);
        
        chaserOscillator.volume.value = -25;
        chaserOscillator.start();
        
        isPlayingChaserWarning = true;
    } catch (e) {
        console.log('Chaser warning audio failed:', e);
    }
}

/**
 * Stop the chaser warning sound
 */
export function stopChaserWarning(): void {
    if (chaserOscillator) {
        try {
            chaserOscillator.stop();
            chaserOscillator.dispose();
        } catch (e) {
            // Ignore errors during cleanup
        }
        chaserOscillator = null;
    }
    isPlayingChaserWarning = false;
}

/**
 * Play a quick "danger" sting when chaser gets very close
 */
export function playChaserDangerSound(): void {
    if (!isInitialized || !polySynth) return;
    
    const now = Tone.now();
    
    // Dissonant minor second - tension!
    polySynth.triggerAttackRelease(['E3', 'F3'], '16n', now);
}

/**
 * Check if spatial audio is available
 */
export function isSpatialAudioAvailable(): boolean {
    return isInitialized && panner3D !== null;
}
