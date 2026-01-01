/**
 * Real Audio Generator for MazeChase
 * Sprint 3 - Audio Implementation
 * 
 * Generates actual sound effects using:
 * - Basic WAV file generation (no external deps)
 * - Sine wave synthesis for retro game sounds
 * 
 * Run: node generate-real-audio.js
 */

const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '..', 'ui-web', 'public', 'audio');

// WAV file header generator
function createWavHeader(dataLength, sampleRate = 44100, channels = 1, bitsPerSample = 16) {
    const buffer = Buffer.alloc(44);
    
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    
    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // ByteRate
    buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    
    return buffer;
}

// Generate a sine wave
function generateSineWave(frequency, duration, sampleRate = 44100, volume = 0.5) {
    const samples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(samples * 2); // 16-bit
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        // Apply envelope (attack/decay)
        const envelope = Math.min(1, i / (sampleRate * 0.01)) * // Attack
                        Math.min(1, (samples - i) / (sampleRate * 0.05)); // Release
        const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, i * 2);
    }
    
    return buffer;
}

// Generate a frequency sweep (ascending or descending)
function generateSweep(startFreq, endFreq, duration, sampleRate = 44100, volume = 0.5) {
    const samples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(samples * 2);
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const progress = i / samples;
        const freq = startFreq + (endFreq - startFreq) * progress;
        const envelope = Math.min(1, i / (sampleRate * 0.01)) * 
                        Math.min(1, (samples - i) / (sampleRate * 0.02));
        const sample = Math.sin(2 * Math.PI * freq * t) * volume * envelope;
        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }
    
    return buffer;
}

// Generate noise burst
function generateNoise(duration, sampleRate = 44100, volume = 0.3) {
    const samples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(samples * 2);
    
    for (let i = 0; i < samples; i++) {
        const envelope = Math.min(1, (samples - i) / samples); // Decay
        const sample = (Math.random() * 2 - 1) * volume * envelope;
        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }
    
    return buffer;
}

// Generate square wave (8-bit style)
function generateSquareWave(frequency, duration, sampleRate = 44100, volume = 0.3) {
    const samples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(samples * 2);
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const envelope = Math.min(1, i / (sampleRate * 0.005)) * 
                        Math.min(1, (samples - i) / (sampleRate * 0.05));
        const sample = (Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1) * volume * envelope;
        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }
    
    return buffer;
}

// Mix multiple audio buffers
function mixBuffers(buffers) {
    const maxLen = Math.max(...buffers.map(b => b.length));
    const result = Buffer.alloc(maxLen);
    
    for (let i = 0; i < maxLen; i += 2) {
        let sum = 0;
        let count = 0;
        for (const buf of buffers) {
            if (i < buf.length) {
                sum += buf.readInt16LE(i);
                count++;
            }
        }
        const avg = Math.floor(sum / count);
        result.writeInt16LE(Math.max(-32768, Math.min(32767, avg)), i);
    }
    
    return result;
}

// Concatenate audio buffers
function concatBuffers(buffers) {
    return Buffer.concat(buffers);
}

// Save WAV file
function saveWav(filename, audioData, sampleRate = 44100) {
    const header = createWavHeader(audioData.length, sampleRate);
    const file = Buffer.concat([header, audioData]);
    const filepath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filepath, file);
    console.log(`  ✅ Generated: ${filename} (${file.length} bytes)`);
}

// ============================================
// SOUND DEFINITIONS
// ============================================

const sounds = {
    // Chomp - quick ascending blip (pac-man style)
    chomp: () => {
        const audio = generateSweep(400, 800, 0.05, 44100, 0.4);
        saveWav('chomp.wav', audio);
    },
    
    // Power pellet - rising arpeggio
    power_pellet: () => {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        const buffers = notes.map((freq, i) => {
            const delay = Buffer.alloc(Math.floor(44100 * 0.05 * i * 2));
            return Buffer.concat([delay, generateSineWave(freq, 0.1, 44100, 0.3)]);
        });
        const audio = mixBuffers(buffers);
        saveWav('power_pellet.wav', audio);
    },
    
    // Chaser eat - triumphant ascending sweep
    chaser_eat: () => {
        const sweep = generateSweep(300, 1200, 0.2, 44100, 0.4);
        const sparkle = generateSweep(1000, 2000, 0.1, 44100, 0.2);
        const delay = Buffer.alloc(44100 * 0.15 * 2);
        const audio = mixBuffers([sweep, Buffer.concat([delay, sparkle])]);
        saveWav('chaser_eat.wav', audio);
    },
    
    // Death - descending sweep with noise
    death: () => {
        const sweep = generateSweep(800, 100, 0.5, 44100, 0.4);
        const noise = generateNoise(0.3, 44100, 0.15);
        const audio = mixBuffers([sweep, noise]);
        saveWav('death.wav', audio);
    },
    
    // Game start - fanfare
    game_start: () => {
        const notes = [
            { freq: 523, dur: 0.1 },  // C5
            { freq: 659, dur: 0.1 },  // E5
            { freq: 784, dur: 0.1 },  // G5
            { freq: 1047, dur: 0.3 }, // C6
        ];
        let offset = 0;
        const buffers = notes.map(n => {
            const delay = Buffer.alloc(Math.floor(44100 * offset * 2));
            offset += n.dur + 0.05;
            return Buffer.concat([delay, generateSquareWave(n.freq, n.dur, 44100, 0.25)]);
        });
        const audio = mixBuffers(buffers);
        saveWav('game_start.wav', audio);
    },
    
    // Siren - oscillating tone
    siren: () => {
        const samples = 44100 * 2; // 2 seconds
        const buffer = Buffer.alloc(samples * 2);
        for (let i = 0; i < samples; i++) {
            const t = i / 44100;
            const modFreq = 2; // 2 Hz oscillation
            const freq = 400 + 200 * Math.sin(2 * Math.PI * modFreq * t);
            const sample = Math.sin(2 * Math.PI * freq * t) * 0.25;
            buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
        }
        saveWav('siren.wav', buffer);
    },
    
    // Power warning - rapid beeping
    power_warning: () => {
        const beeps = [];
        for (let i = 0; i < 6; i++) {
            beeps.push(generateSquareWave(800, 0.08, 44100, 0.3));
            beeps.push(Buffer.alloc(44100 * 0.07 * 2)); // silence
        }
        const audio = concatBuffers(beeps);
        saveWav('power_warning.wav', audio);
    },
    
    // Speed boost - whoosh ascending
    speed_boost: () => {
        const sweep = generateSweep(200, 2000, 0.3, 44100, 0.35);
        const shimmer = generateSweep(1500, 3000, 0.15, 44100, 0.15);
        const delay = Buffer.alloc(44100 * 0.1 * 2);
        const audio = mixBuffers([sweep, Buffer.concat([delay, shimmer])]);
        saveWav('speed_boost.wav', audio);
    },
    
    // Magnet - humming pulse
    magnet: () => {
        const samples = 44100 * 0.5;
        const buffer = Buffer.alloc(samples * 2);
        for (let i = 0; i < samples; i++) {
            const t = i / 44100;
            const pulse = (Math.sin(2 * Math.PI * 8 * t) + 1) / 2; // 8 Hz pulse
            const tone = Math.sin(2 * Math.PI * 150 * t) * 0.3;
            const harmonics = Math.sin(2 * Math.PI * 300 * t) * 0.1;
            const sample = (tone + harmonics) * pulse;
            buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
        }
        saveWav('magnet.wav', buffer);
    },
    
    // Power end - descending disappointed tone
    power_end: () => {
        const sweep = generateSweep(600, 200, 0.3, 44100, 0.3);
        saveWav('power_end.wav', sweep);
    },
    
    // Chaser near - tension building low pulse
    chaser_near: () => {
        const samples = 44100 * 0.4;
        const buffer = Buffer.alloc(samples * 2);
        for (let i = 0; i < samples; i++) {
            const t = i / 44100;
            const envelope = Math.min(1, i / (44100 * 0.05)) * 
                            Math.min(1, (samples - i) / (44100 * 0.1));
            const pulse = Math.sin(2 * Math.PI * 4 * t); // 4 Hz throb
            const tone = Math.sin(2 * Math.PI * 100 * t) * 0.4;
            const sample = tone * (0.5 + 0.5 * pulse) * envelope;
            buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
        }
        saveWav('chaser_near.wav', buffer);
    },
    
    // Victory - triumphant fanfare
    victory: () => {
        const notes = [
            { freq: 523, dur: 0.15 },  // C5
            { freq: 659, dur: 0.15 },  // E5
            { freq: 784, dur: 0.15 },  // G5
            { freq: 1047, dur: 0.15 }, // C6
            { freq: 1319, dur: 0.3 },  // E6
            { freq: 1568, dur: 0.5 },  // G6
        ];
        let offset = 0;
        const buffers = notes.map(n => {
            const delay = Buffer.alloc(Math.floor(44100 * offset * 2));
            offset += n.dur * 0.8;
            return Buffer.concat([delay, generateSineWave(n.freq, n.dur, 44100, 0.3)]);
        });
        const audio = mixBuffers(buffers);
        saveWav('victory.wav', audio);
    },
    
    // Menu music - simple loop (short preview)
    menu_music: () => {
        // Simple 4-bar chord progression
        const chords = [
            [262, 330, 392], // C major
            [294, 370, 440], // D minor
            [262, 330, 392], // C major
            [247, 311, 392], // G major
        ];
        
        const buffers = [];
        chords.forEach((chord, chordIdx) => {
            const chordBuffers = chord.map(freq => 
                generateSineWave(freq, 0.8, 44100, 0.15)
            );
            const delay = Buffer.alloc(Math.floor(44100 * chordIdx * 0.8 * 2));
            buffers.push(Buffer.concat([delay, mixBuffers(chordBuffers)]));
        });
        
        const audio = mixBuffers(buffers);
        saveWav('menu_music.wav', audio);
    }
};

// ============================================
// MAIN
// ============================================

console.log('🎵 MazeChase Real Audio Generator');
console.log('================================\n');

// Ensure directory exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Generate all sounds
console.log('Generating sound effects...\n');

Object.entries(sounds).forEach(([name, generator]) => {
    try {
        generator();
    } catch (e) {
        console.log(`  ❌ Failed: ${name} - ${e.message}`);
    }
});

console.log('\n✅ Audio generation complete!');
console.log(`📁 Files saved to: ${AUDIO_DIR}`);
console.log('\n💡 Note: Files are in WAV format for quality.');
console.log('   For production, convert to MP3 for smaller sizes:');
console.log('   ffmpeg -i file.wav -codec:a libmp3lame -qscale:a 2 file.mp3');
