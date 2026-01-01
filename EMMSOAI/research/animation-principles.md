# Animation Principles

*Core animation guidelines for MazeChase - Auto-updated by knowledge extraction*

## Disney's 12 Principles Applied to Games

### 1. Squash & Stretch
- Characters compress on landing, stretch when jumping
- Preserve volume: if wider, make shorter
- **MazeChase application:** Player blob squashes when changing direction

### 2. Anticipation
- Wind-up before action (0.1-0.2s)
- Ghost "charges" before dash
- Player slight crouch before jump

### 3. Follow Through & Overlapping Action
- Secondary elements continue after main action stops
- Ghost trail follows with delay
- Coins bounce after landing

### 4. Ease In/Out (Slow In/Slow Out)
- Never use linear interpolation for character movement
- Recommended easings:
  - Movement: `easeOutCubic` (fast start, soft stop)
  - UI: `easeInOutQuad` (smooth both ends)
  - Impacts: `easeOutElastic` (bouncy settle)

### 5. Arcs
- Natural movement follows curved paths
- Don't move in straight lines unless mechanical

### 6. Secondary Action
- Add subtle animations that support main action
- Bounce while moving (implemented Sprint 7)
- Eyes track target while body moves

## Babylon.js Animation Best Practices

```typescript
// Frame rate: 60fps = smoother, 30fps = retro feel
const frameRate = 60;

// Use Animation.CreateAnimation for simple properties
const bounceAnim = new Animation(
  "bounce",
  "position.y",
  frameRate,
  Animation.ANIMATIONTYPE_FLOAT,
  Animation.ANIMATIONLOOPMODE_CYCLE
);

// Easing functions
const easing = new CubicEase();
easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
bounceAnim.setEasingFunction(easing);
```

## Performance Guidelines

- **Max concurrent animations:** 50 per scene
- **Keyframe limit:** 120 frames max per animation
- **Use animation groups** for synchronized playback
- **Dispose animations** when entities are removed

## Timing Reference

| Action Type | Duration | Easing |
|-------------|----------|--------|
| Quick feedback | 100-200ms | easeOut |
| UI transition | 200-300ms | easeInOut |
| Character action | 150-400ms | easeOutCubic |
| Settle/bounce | 300-600ms | easeOutElastic |
| Dramatic reveal | 500-800ms | easeInOutQuad |

## Extracted Knowledge

*This section auto-populates with insights from AI evaluations*
