# 🎵 Audio Design Research - Game Sound & Music 2024-2025

## Executive Summary
Dit document bevat voorgecompileerd onderzoek voor Kenji (Sound Designer).
Gebruik deze data voor onderbouwde audio adviezen.

---

## 🔊 Game Audio Fundamentals

### Audio Categories
| Category | Purpose | Priority |
|----------|---------|----------|
| UI Sounds | Feedback for actions | Critical |
| Game SFX | Gameplay feedback | Critical |
| Ambient | Atmosphere, immersion | High |
| Music | Mood, engagement | High |
| Voice/VO | Story, personality | Medium |

### Volume Hierarchy (Mix Levels)
```
MASTER: 100%
├── MUSIC: 60-70%
├── SFX: 80-100%
│   ├── Critical (damage, win): 100%
│   ├── Standard (collect, jump): 80%
│   └── Ambient (footsteps): 60%
├── UI: 70-80%
└── VOICE: 100%
```

---

## 🎮 Essential Game Sounds Checklist

### UI Sounds (Must Have)
| Sound | Duration | Characteristics |
|-------|----------|-----------------|
| Button Click | 50-100ms | Sharp, satisfying click |
| Button Hover | 30-50ms | Subtle, light |
| Menu Open | 100-200ms | Whoosh or slide |
| Menu Close | 100-200ms | Reverse of open |
| Error/Invalid | 100-200ms | Negative tone (not annoying) |
| Success/Confirm | 150-300ms | Positive chime |
| Notification | 200-400ms | Attention-grabbing |

### Gameplay SFX (For Maze Games)
| Sound | Duration | Description |
|-------|----------|-------------|
| Pellet Collect | 50-100ms | Quick, satisfying "pop" |
| Power-up Get | 300-500ms | Triumphant, energizing |
| Power-up Active | Loop | Subtle pulsing hum |
| Power-up End | 200-300ms | Warning, fade |
| Chaser Approach | Loop | Intensity increases with distance |
| Chaser Caught | 300-500ms | Dramatic, impactful |
| Player Death | 500-800ms | Sad, but not devastating |
| Level Complete | 1000-2000ms | Celebratory fanfare |
| Countdown Tick | 100-200ms | Clear, urgent |
| Time Warning | Loop | Alarm, increasing urgency |

### Spatial Audio Recommendations
```javascript
// Distance-based volume falloff
const AUDIO_CONFIG = {
    rolloffFactor: 2,      // How fast sound fades
    maxDistance: 100,      // Units before silent
    refDistance: 1,        // Units at full volume
    panningModel: 'HRTF',  // Best for 3D games
};

// Chaser proximity audio
const CHASER_AUDIO = {
    maxVolume: 0.8,
    minDistance: 5,        // Full volume when this close
    maxDistance: 30,       // Silent beyond this
    pitchVariation: 0.1,   // ±10% per chaser
};
```

---

## 🎼 Music Design for Games

### Adaptive Music Layers
```
BASE LAYER: Always playing (60-80 BPM, calm)
├── CHASE LAYER: Added when chaser nearby (+20 BPM)
├── DANGER LAYER: Added when multiple chasers (+percussion)
├── POWER-UP LAYER: Heroic overlay (brass/synth)
└── VICTORY STING: End of round fanfare
```

### Tempo Guidelines
| Game State | BPM | Style |
|------------|-----|-------|
| Menu | 80-100 | Relaxed, inviting |
| Gameplay (calm) | 100-120 | Steady, focused |
| Gameplay (chase) | 120-150 | Tense, urgent |
| Victory | 140-160 | Celebratory |
| Defeat | 60-80 | Somber, brief |

### Key/Mode Suggestions
| Mood | Key/Mode | Example Use |
|------|----------|-------------|
| Happy/Playful | C Major, G Major | Main theme |
| Mysterious | E minor, A minor | Maze exploration |
| Tense | D minor, F# minor | Chase sequences |
| Triumphant | D Major, Bb Major | Victory |
| Quirky | Mixolydian | Character themes |

---

## 📊 Audio Technical Specs

### File Formats
| Format | Use Case | Notes |
|--------|----------|-------|
| MP3 | Music, long audio | Lossy, small |
| OGG | SFX, music | Better quality, smaller |
| WAV | Source files only | Lossless, large |
| WebM | Web fallback | Good compatibility |
| AAC | iOS primary | Apple ecosystem |

### Recommended Quality
```
MUSIC:
- Format: OGG/MP3
- Bitrate: 128-192 kbps
- Sample Rate: 44.1 kHz
- Channels: Stereo

SFX:
- Format: OGG/MP3
- Bitrate: 64-128 kbps
- Sample Rate: 44.1 kHz
- Channels: Mono (for spatial)

FILE SIZE TARGETS:
- Single SFX: 10-50 KB
- UI Sound: 5-20 KB
- Music Track: 1-3 MB
- Total Audio Budget: 10-20 MB
```

### Loading Strategy
```javascript
// Priority-based loading
const AUDIO_PRIORITY = {
    CRITICAL: 0,    // UI clicks, game start
    HIGH: 1,        // Gameplay SFX
    MEDIUM: 2,      // Music, ambient
    LOW: 3,         // Rare sounds
};

// Preload critical sounds
preloadAudio(['click', 'collect', 'death'], CRITICAL);

// Stream music
streamAudio('background_music', { loop: true });
```

---

## 🎯 Sound Design Psychology

### Reward Sounds
```
FREQUENCY: Higher pitch = more valuable
DURATION: Longer = more important
LAYERING: More layers = bigger reward

Pellet:    Single high "boop" (100ms)
Power-up:  Chord + sparkle layer (400ms)
Victory:   Full fanfare + crowd (2000ms)
```

### Tension Building
```
TECHNIQUES:
1. Increase tempo
2. Add dissonant notes
3. Reduce bass, emphasize highs
4. Staccato patterns
5. Heartbeat-like pulses
6. Silence before impact (anticipation)
```

### Satisfying Sounds (Dopamine Triggers)
| Element | Effect |
|---------|--------|
| "Pop" sounds | Instant gratification |
| Chimes | Achievement recognition |
| Swooshes | Movement, progress |
| Crunches | Destruction, power |
| Coins/bells | Collection, wealth |

---

## 🔧 Tone.js Integration (For Web)

### Synthesizer Presets
```javascript
// Pellet collect sound
const pelletSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1
    }
}).toDestination();

// Power-up fanfare
const powerUpSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 0.5
    }
}).toDestination();

// Chaser proximity (LFO modulation)
const chaserDrone = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: {
        attack: 0.5,
        decay: 0,
        sustain: 1,
        release: 0.5
    }
});
const chaserLFO = new Tone.LFO('4n', 200, 400);
chaserLFO.connect(chaserDrone.frequency);
```

### Spatial Audio with Panner3D
```javascript
// Create 3D panner for chaser
const panner = new Tone.Panner3D({
    panningModel: 'HRTF',
    distanceModel: 'exponential',
    rolloffFactor: 2,
    maxDistance: 100
}).toDestination();

// Update position each frame
function updateChaserAudio(chaserPos, playerPos) {
    const relativePos = chaserPos.subtract(playerPos);
    panner.positionX.value = relativePos.x;
    panner.positionY.value = relativePos.y;
    panner.positionZ.value = relativePos.z;
}
```

---

## 🎵 Royalty-Free Sound Sources

### Free SFX Libraries
| Source | Quality | License |
|--------|---------|---------|
| Freesound.org | Mixed | CC/CC0 |
| Mixkit.co | High | Free |
| ZapSplat | High | Free (credit) |
| OpenGameArt | Mixed | Various |
| Sonniss GDC Bundle | Pro | Royalty-free |

### Procedural Audio Tools
| Tool | Best For |
|------|----------|
| Tone.js | Web synthesizers |
| JSFXR | 8-bit/retro sounds |
| ChipTone | Chiptune sounds |
| Bfxr | Variety of SFX |

### Music Resources
| Source | Style | License |
|--------|-------|---------|
| Epidemic Sound | All | Subscription |
| Artlist | Cinematic | Subscription |
| YouTube Audio Library | Varied | Free |
| Kevin MacLeod | All | CC (credit) |
| Purple Planet | Games | Royalty-free |

---

## 📋 Audio Accessibility

### Requirements
- Volume controls for all categories
- Subtitles/captions for important audio
- Visual alternatives for audio cues
- Screen reader support for UI sounds

### Visual Audio Indicators
```
CHASER NEARBY: Screen edge glow (red)
POWER-UP ACTIVE: Character aura
TIMER WARNING: Flashing UI element
DAMAGE: Screen shake + flash
COLLECT: Particle effect
```

### Deaf/HoH Considerations
- Vibration patterns for mobile
- Visual rhythm indicators
- Directional indicators for spatial audio
- Text-based callouts for critical events

---

## 🎨 Kurzgesagt Audio Style Guide

### Musical Characteristics
```
KURZGESAGT AUDIO SIGNATURE:
- Soft, warm synthesizers
- Clean, minimal arrangements
- Gentle chimes and bells
- Subtle electronic textures
- Positive, uplifting melodies
- Playful but sophisticated

INSTRUMENTS:
- Soft pads (warm analog synths)
- Bright, clean bells/chimes
- Gentle marimba/xylophone
- Minimal, tight drums
- Occasional pizzicato strings
- Light electronic arpeggios
```

### Sound Effect Style
```
KURZGESAGT SFX CHARACTERISTICS:
- Soft, rounded attacks (no harsh clicks)
- Warm, filtered tones
- Subtle reverb (not dry, not washed)
- Layered but clean
- Playful "boop" sounds
- Whooshes for transitions
- Gentle sparkles for highlights

AVOID:
- Harsh, distorted sounds
- Aggressive impacts
- Retro 8-bit (too nostalgic)
- Realistic/recorded SFX (too literal)
- Overly complex layering
```

### Tone.js Kurzgesagt Presets
```javascript
// KURZGESAGT STYLE SYNTH LIBRARY

// Soft Pad (Background warmth)
const kurzPad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine4' },
    envelope: {
        attack: 0.8,
        decay: 0.3,
        sustain: 0.7,
        release: 1.2
    }
});
const padFilter = new Tone.Filter(800, 'lowpass', -12);
kurzPad.chain(padFilter, new Tone.Reverb(2.5), Tone.Destination);

// Gentle Chime (UI/Collect sounds)
const kurzChime = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0,
        release: 0.8
    }
});
const chimeReverb = new Tone.Reverb({ decay: 1.5, wet: 0.4 });
kurzChime.chain(chimeReverb, Tone.Destination);

// Warm Bell (Achievements/Milestones)
const kurzBell = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
        attack: 0.005,
        decay: 0.4,
        sustain: 0.1,
        release: 1.5
    }
});
const bellChorus = new Tone.Chorus(4, 2.5, 0.5);
kurzBell.chain(bellChorus, new Tone.Reverb(2), Tone.Destination);

// Playful Pluck (Collect pellets)
const kurzPluck = new Tone.PluckSynth({
    attackNoise: 1,
    dampening: 4000,
    resonance: 0.98
});
kurzPluck.chain(new Tone.Reverb(0.5), Tone.Destination);

// Soft Whoosh (Menu transitions)
const kurzWhoosh = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0,
        release: 0.2
    }
});
const whooshFilter = new Tone.AutoFilter('4n').start();
kurzWhoosh.chain(whooshFilter, Tone.Destination);

// Warm Arpeggiator (Background interest)
const kurzArp = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.4
    }
});
const arpDelay = new Tone.PingPongDelay('8n', 0.3);
kurzArp.chain(arpDelay, Tone.Destination);
```

### Audio Branding Guidelines
```
MAZECHASE AUDIO IDENTITY:

BRAND SOUNDS:
1. "Maze Open" Jingle: 3-note ascending chime (C-E-G)
2. "Victory" Fanfare: Warm chord progression + sparkle
3. "Pellet Pop": Soft, high-pitched "boop"
4. "Power-Up": Ascending arpeggio + reverb swell
5. "Menu" Background: Gentle pad + light rhythm

EMOTIONAL TARGETS:
- Menu: Welcoming, anticipation
- Gameplay: Focus, flow state
- Chase: Tension without stress
- Victory: Joy, accomplishment
- Defeat: Gentle disappointment (not harsh)
```

---

## 🔊 Advanced Audio Techniques

### Dynamic Range Compression
```javascript
// Prevent clipping, even mix
const compressor = new Tone.Compressor({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 8
});

// Duck music when SFX plays
const musicChannel = new Tone.Gain(0.7);
const sfxChannel = new Tone.Gain(1);
const ducker = new Tone.Compressor({
    threshold: -30,
    ratio: 6,
    attack: 0.01,
    release: 0.3
});

// Route SFX as sidechain for music ducking
musicChannel.chain(ducker, Tone.Destination);
sfxChannel.connect(ducker);
```

### Crossfade Between Tracks
```javascript
// Smooth music transitions
async function crossfadeTo(newTrack, duration = 2) {
    const fadeGain = new Tone.Gain(0);
    newTrack.connect(fadeGain);
    fadeGain.connect(Tone.Destination);
    
    newTrack.start();
    fadeGain.gain.linearRampTo(1, duration);
    currentMusic.volume.linearRampTo(-Infinity, duration);
    
    await Tone.Transport.scheduleOnce(() => {
        currentMusic.stop();
        currentMusic = newTrack;
    }, `+${duration}`);
}
```

### Procedural Variations
```javascript
// No two sounds exactly alike
function playCollectSound() {
    const baseNote = 'C5';
    const pitchVariation = Math.random() * 4 - 2; // ±2 semitones
    const velocityVariation = 0.7 + Math.random() * 0.3; // 0.7-1.0
    
    collectSynth.triggerAttackRelease(
        Tone.Frequency(baseNote).transpose(pitchVariation),
        '16n',
        Tone.now(),
        velocityVariation
    );
}

// Humanize rhythm
function humanize(time, amount = 0.02) {
    return time + (Math.random() - 0.5) * amount;
}
```

---

## 📱 Mobile Audio Considerations

### Auto-Play Policies
```javascript
// Handle browser autoplay restrictions
async function initializeAudio() {
    // Must be called from user gesture
    await Tone.start();
    console.log('Audio context started');
    
    // Show "tap to enable sound" if needed
    if (Tone.context.state !== 'running') {
        showSoundEnablePrompt();
    }
}

// First interaction enables sound
document.addEventListener('click', initializeAudio, { once: true });
document.addEventListener('touchstart', initializeAudio, { once: true });
```

### Battery/Performance Optimization
```javascript
// Pause audio when app backgrounded
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Tone.Transport.pause();
        masterGain.gain.value = 0;
    } else {
        Tone.Transport.start();
        masterGain.gain.rampTo(1, 0.3);
    }
});

// Reduce quality on low-power devices
if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
        if (battery.level < 0.2) {
            // Reduce audio processing
            Tone.context.latencyHint = 'playback';
        }
    });
}
```

---

## 📚 Sources & Further Reading

### Books
- "A Composer's Guide to Game Music" by Winifred Phillips
- "Game Sound" by Karen Collins
- "Audio for Games" by Alexander Brandon

### GDC Talks
- "The Sound of Overwatch"
- "Interactive Music in Journey"
- "Procedural Audio in No Man's Sky"
- "Building an Audio System for a Mobile Game"

### Online Resources
- Tone.js Documentation (tonejs.github.io)
- Game Audio Network Guild (audiogang.org)
- Designing Sound (designingsound.org)

---

*Last Updated: December 2024*
*For use by AI testers - reduces token usage for audio research*
