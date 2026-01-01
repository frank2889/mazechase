# Visual Style Guide

*MazeChase visual design system - Kurzgesagt-inspired*

## Core Visual Identity

### Color Philosophy
- **Primary:** Electric cyan (#00fff0) - player, positive actions
- **Secondary:** Hot magenta (#ff00ff) - enemies, warnings
- **Accent:** Warm yellow (#ffd93d) - collectibles, rewards
- **Background:** Deep navy (#0a0a1a) - space/void feeling

### Kurzgesagt Style Principles

1. **Flat Design with Depth**
   - No realistic shadows
   - Subtle gradients for volume
   - Glow effects for emphasis

2. **Geometric Shapes**
   - Characters: circles, rounded squares
   - Environment: clean geometric patterns
   - UI: pill shapes, rounded corners (8-16px)

3. **Limited Color Palette**
   - Max 5 colors per scene
   - High contrast for readability
   - Dark backgrounds, bright elements

4. **Smooth Animations**
   - Ease everything
   - Anticipation before action
   - Overshoot and settle

## Theme Variants

### Default (Kurzgesagt)
```css
--primary: #00fff0;
--secondary: #ff6b6b;
--accent: #ffd93d;
--bg-primary: #0a0a1a;
```

### Neon Night (Implemented Sprint 7)
```css
--primary: #00ff88;
--secondary: #ff00ff;
--accent: #ffff00;
--bg-primary: #0d0221;
```

### Sunset
```css
--primary: #ff6b35;
--secondary: #f7c59f;
--accent: #efa00b;
--bg-primary: #1a0a2e;
```

## Particle Effects

### Recommended Particles
- **Trail:** 20-30 particles, fade over 0.5s
- **Explosion:** 50-100 particles, burst spread
- **Ambient:** 10-20 floating particles, slow drift
- **Collect:** 5-10 particles, spiral upward

### Performance Budget
- Max 500 particles per scene
- Use billboards for 2D particles in 3D space
- Pool and recycle particle systems

## Glow Effects

```typescript
// Glow layer setup for Babylon.js
const glowLayer = new GlowLayer("glow", scene);
glowLayer.intensity = 0.8;
glowLayer.blurKernelSize = 64;

// Add mesh to glow
glowLayer.addIncludedOnlyMesh(playerMesh);
```

## Typography

### In-Game UI
- **Primary font:** Inter (clean, readable)
- **Score/numbers:** JetBrains Mono (monospace)
- **Headers:** Bold, tracking +2%

### Sizing Scale
- XS: 12px (hints, metadata)
- S: 14px (body text)
- M: 18px (prominent info)
- L: 24px (section headers)
- XL: 32px+ (scores, titles)

## Extracted Insights

*Auto-updated from AI evaluations*
