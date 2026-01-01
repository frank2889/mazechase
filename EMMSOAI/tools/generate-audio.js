#!/usr/bin/env node
/**
 * Audio Generator for MazeChase
 * Generates synthetic game sounds using Web Audio API concepts
 * Run: node generate-audio.js
 */

const fs = require('fs');
const path = require('path');

// We'll use a simple approach: create placeholder audio files
// For real audio, you'd use a library like 'node-web-audio-api' or download from freesound

const audioDir = path.join(__dirname, '../ui-web/public/audio');

// Ensure audio directory exists
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

console.log('🎵 MazeChase Audio Generator\n');
console.log('Audio directory:', audioDir);
console.log('\n📥 To get real audio files, run these commands:\n');

// Freesound.org search URLs for each sound
const sounds = [
    { name: 'chomp.mp3', search: 'coin collect game', desc: 'Pellet eating - 50ms pop' },
    { name: 'power_pellet.mp3', search: 'power up game', desc: 'Power pellet pickup - 400ms' },
    { name: 'chaser_eat.mp3', search: 'eat chomp game', desc: 'Eating chaser - satisfying crunch' },
    { name: 'death.mp3', search: 'game over retro', desc: 'Player death - 2sec sad' },
    { name: 'game_start.mp3', search: 'game start jingle', desc: 'Game start - 3sec upbeat' },
    { name: 'siren.mp3', search: 'alarm siren game', desc: 'Chaser chase siren - loopable' },
    { name: 'power_warning.mp3', search: 'warning beep', desc: 'Power ending warning - urgent beeps' },
    { name: 'speed_boost.mp3', search: 'speed boost whoosh', desc: 'Speed power-up - 300ms whoosh' },
    { name: 'magnet.mp3', search: 'magnetic field hum', desc: 'Magnet power-up - low hum' },
    { name: 'power_end.mp3', search: 'power down game', desc: 'Power-up ends - 200ms fade' },
    { name: 'chaser_near.mp3', search: 'heartbeat tension', desc: 'Chaser proximity warning' },
    { name: 'victory.mp3', search: 'victory fanfare game', desc: 'Victory jingle - 3sec triumphant' },
    { name: 'menu_music.mp3', search: 'synthwave game loop', desc: 'Menu music - 30sec loop' },
];

console.log('Required audio files:\n');
sounds.forEach((sound, i) => {
    const filePath = path.join(audioDir, sound.name);
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${(i+1).toString().padStart(2)}. ${sound.name.padEnd(20)} - ${sound.desc}`);
    if (!exists) {
        console.log(`      Search: https://freesound.org/search/?q=${encodeURIComponent(sound.search)}`);
    }
});

console.log('\n📋 QUICK DOWNLOAD INSTRUCTIONS:');
console.log('================================');
console.log('1. Go to https://freesound.org (free account required)');
console.log('2. Search for each sound using the queries above');
console.log('3. Download MP3 format, rename to match filename');
console.log('4. Place in: ' + audioDir);
console.log('\n💡 Alternative: Use pixabay.com/sound-effects/ (no account needed)\n');

// Create a simple silent placeholder for missing files (so game doesn't error)
const createSilentPlaceholder = (filename) => {
    const filePath = path.join(audioDir, filename);
    if (!fs.existsSync(filePath)) {
        // Minimal valid MP3 file (silence)
        // This is a 0.1 second silent MP3
        const silentMp3 = Buffer.from([
            0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        fs.writeFileSync(filePath, silentMp3);
        console.log(`Created placeholder: ${filename}`);
    }
};

console.log('🔇 Creating silent placeholders for missing files...\n');
sounds.forEach(sound => createSilentPlaceholder(sound.name));

console.log('\n✅ Done! Replace placeholders with real sounds for best experience.');
console.log('   Run the game - it will work with placeholders (silent).\n');
