# Audio Design

*Sound design guidelines for MazeChase*

## Audio Philosophy

### Core Principles
1. **Instant feedback** - Sound within 50ms of action
2. **Non-fatiguing** - Pleasant on loop
3. **Informative** - Sound conveys game state
4. **Layered** - Music + ambient + SFX coexist

## Sound Effect Categories

### UI Sounds
| Action | Sound Type | Duration |
|--------|------------|----------|
| Button tap | Soft click | 50-100ms |
| Navigate | Subtle swoosh | 100-150ms |
| Confirm | Positive chime | 150-200ms |
| Error | Soft buzz | 100-150ms |
| Menu open | Whoosh up | 200ms |
| Menu close | Whoosh down | 150ms |

### Gameplay Sounds
| Action | Sound Type | Duration |
|--------|------------|----------|
| Move | Soft footstep/slide | 50ms |
| Collect coin | Bright ding | 100ms |
| Power-up | Rising sparkle | 300ms |
| Damage | Impact + low thud | 200ms |
| Death | Sad descending | 400ms |
| Level complete | Victory fanfare | 800ms |

### Ambient Sounds
- Subtle space hum (loopable)
- Distant electronic pulses
- Soft wind/whoosh layers

## Music Guidelines

### Adaptive Music System
```
Layer 1: Base ambient (always playing)
Layer 2: Rhythm (during gameplay)
Layer 3: Intensity (danger/chase)
Layer 4: Victory stingers (on events)
```

### BPM Recommendations
- Menu: 80-100 BPM (relaxed)
- Normal gameplay: 120-140 BPM (energetic)
- Danger/chase: 140-160 BPM (tense)
- Boss: 150-180 BPM (intense)

### Style Reference
- Synthwave/retrowave
- Kurzgesagt video scores
- Daft Punk (Tron Legacy)
- M83 atmospheric

## Spatial Audio (3D)

### Babylon.js Audio Setup
```typescript
// Create sound with spatial properties
const coinSound = new Sound(
  "coin",
  "assets/audio/coin.mp3",
  scene,
  null,
  {
    spatialSound: true,
    distanceModel: "exponential",
    maxDistance: 50,
    rolloffFactor: 2
  }
);

// Attach to mesh for 3D positioning
coinSound.attachToMesh(coinMesh);
```

### Distance Settings
- Close sounds: maxDistance 10-20
- Medium sounds: maxDistance 30-50
- Ambient: maxDistance 100+

## Audio Performance

### Optimization Guidelines
- Preload critical sounds on scene load
- Use audio sprites for UI sounds
- Limit concurrent sounds: 16-24 max
- Compress: MP3 for music, OGG for SFX
- Sample rate: 44.1kHz standard

### Memory Budget
- UI sounds: <50KB each
- Gameplay SFX: <100KB each
- Music loops: <2MB each
- Total audio: <20MB

## Haptic Feedback (Mobile)

### Haptic Patterns
| Action | iOS | Android |
|--------|-----|---------|
| Tap | Light impact | CLICK |
| Collect | Success notif | CONFIRM |
| Damage | Heavy impact | HEAVY_CLICK |
| Error | Error pattern | ERROR |

```typescript
// Web Vibration API
if ('vibrate' in navigator) {
  navigator.vibrate(50);  // 50ms vibration
}
```

## Audio Accessibility

- Volume sliders for Music, SFX, Voice separately
- Visual feedback for all audio cues
- Subtitle system for important audio
- Low-frequency mode for hearing impaired

## Extracted Insights

*Auto-updated from AI implementations*
