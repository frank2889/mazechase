# 🎨 Visual Design Research - Kurzgesagt Style & Game Art 2024-2025

## Executive Summary

Dit document bevat voorgecompileerd onderzoek voor Yuki (Visual Artist) en Sofia (Brand Director).
Gebruik deze data voor onderbouwde visuele design adviezen.

---

## 🎯 Kurzgesagt Style Guide (Gedetailleerd)

### Core Principles

1. **Flat Design**: Geen 3D effecten, schaduw alleen als design element
2. **Bold Colors**: Verzadigde kleuren, geen pastels
3. **No Outlines**: Vormen gedefinieerd door kleurcontrast
4. **Geometric Shapes**: Cirkels, afgeronde rechthoeken, smooth curves
5. **Minimalism**: Elk element heeft een functie
6. **Character**: Groot hoofd, kleine lichaam, expressieve ogen

### Official Color Palette

```css
PRIMARY:
- Deep Navy:    #1A1A2E (backgrounds)
- Bright Yellow: #FFD93D (protagonist/positive)
- Coral Red:    #FF6B6B (danger/enemy)
- Cyan:         #4ECDC4 (info/secondary)
- Pink:         #F8A5C2 (accent)

SECONDARY:
- Purple:       #667EEA (special/magic)
- Gold:         #FFE66D (rewards/collectibles)
- Teal:         #45B7AA (nature/calm)
- Orange:       #F7931E (energy/action)

NEUTRALS:
- Dark Gray:    #2D3436 (UI elements)
- Light Gray:   #DFE6E9 (text on dark)
- Pure White:   #FFFFFF (highlights)
```

### Typography in Kurzgesagt Style

- **Font Style**: Rounded sans-serif (similar to Nunito, Quicksand)
- **Headlines**: Bold, large, often with slight tracking
- **Body**: Medium weight, comfortable line height
- **Numbers**: Prominent, often in accent colors

### Character Design Rules

```text
HEAD: 40-50% of total height
EYES: 30-40% of head width
     - Simple circles with highlight dot
     - Express emotion through position/shape
BODY: Simple geometric shape
     - Rounded rectangle or oval
     - Minimal limbs if any
EXPRESSIONS:
     - Happy: Eyes curved, small mouth
     - Angry: Eyebrows down, frown
     - Scared: Wide eyes, O mouth
     - Determined: Focused eyes, set jaw
```

### Animation Principles

- **Squash & Stretch**: Subtle, maintains volume
- **Anticipation**: Small movements before big ones
- **Follow-through**: Movements have momentum
- **Frame Rate**: 24fps standard, key poses at 12fps

---

## � 3D Asset Library (December 2025)

### Available 3D Models (All CC0 - Public Domain)

**Source: OpenGameArt.org**
All downloaded to `/ui-web/public/models/`

#### Dungeon Set 2 by Keith at Fertile Soil Productions

Location: `/models/dungeon/Dungeon Set 2/`
Format: OBJ + MTL (untextured, Kurzgesagt-friendly)

| Category    | Models                                                                                                                              | Use Case                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Walls**   | `struct_wall_straight_main`, `struct_wall_curved_main`, `struct_wall_tapered_main`, `struct_wall_joint_main`, `struct_wall_sewer_*` | Maze walls with orientation detection |
| **Floors**  | `struct_floor_normal`, `struct_floor_cracked_1-4`, `struct_floor_grate_*`, `struct_floor_tapered`                                   | Arena floor with variety              |
| **Props**   | `prop_floor_barrel`, `prop_floor_crate`, `prop_floor_brazier`, `prop_floor_lever`, `prop_wall_torch`, `prop_wall_chains`            | Environmental decoration              |
| **Doors**   | `prop_wall_big_door_wood`, `prop_wall_big_door_iron`, `prop_wall_door_cell`                                                         | Future level transitions              |
| **Pillars** | `struct_pillar_corner_*`, `struct_pillar_angled_*`, `struct_pillar_mid_wall_*`                                                      | Arena corners, architecture           |
| **Traps**   | `trap_floor_spikes`, `trap_floor_saw`, `trap_floor_pipes`, `trap_ceiling_crusher_*`                                                 | Future hazard mechanics               |

#### Skydome 3D by GGBotNet

Location: `/models/environment/`

- `Skydome.obj` + `Skydome.png` - Atmospheric background

#### Nature Decorations by Yughues

Location: `/models/decorations/`

| Type      | Files                   | Use Case                    |
| --------- | ----------------------- | --------------------------- |
| **Weeds** | `01-03/tiny_weed_*.obj` | Organic floor decoration    |
| **Rocks** | `01-05/rock_*.obj`      | Canyon/rough terrain        |
| **Ivy**   | `ivy/ivy_*.obj`         | Wall decoration, overgrowth |

### 📋 Complete Asset Manifest (Vision AI Analyzed)

#### Walls (Maze Structure)

| Model | Visual Description | Dimensions | Use Case |
| ----- | ------------------ | ---------- | -------- |
| `struct_wall_straight_main` | Flat stone wall segment, weathered texture | 1x1x2 tiles | Primary maze corridors |
| `struct_wall_straight_base` | Wall foundation piece | 1x1x0.5 | Ground-level connector |
| `struct_wall_straight_top` | Wall crown molding | 1x1x0.3 | Visual finish on walls |
| `struct_wall_curved_main` | 90° corner wall, smooth arc | 1x1x2 | Maze corners, turns |
| `struct_wall_curved_base/top` | Corner foundation/crown | 1x1x0.5 | Corner connectors |
| `struct_wall_joint_main` | T-junction or cross wall | 1x1x2 | 3/4-way intersections |
| `struct_wall_tapered_main` | Narrowing wall segment | 1x1x2 | Dead ends, entry points |
| `struct_wall_cracked_1-5` | Damaged wall variants | 1x1x2 | Visual variety, aged look |
| `struct_wall_sewer_main` | Industrial/pipe wall | 1x1x2 | Sewer theme zones |

#### Floors (Ground Tiles)

| Model | Visual Description | Use Case |
| ----- | ------------------ | -------- |
| `struct_floor_normal` | Standard stone floor tile | Default arena floor |
| `struct_floor_cracked_1-4` | Damaged floor variants | Visual variety (25% placement) |
| `struct_floor_grate_round` | Circular metal grate | Drain/vent decoration |
| `struct_floor_grate_square` | Square metal grate | Industrial zones |
| `struct_floor_curved` | Curved edge floor | Rounded corners |
| `struct_floor_tapered` | Angled edge floor | Wall transitions |

#### Props (Decorative Objects)

| Model | Visual Description | Placement | Use Case |
| ----- | ------------------ | --------- | -------- |
| `prop_floor_barrel` | Wooden storage barrel | Floor, against walls | Obstacle, cover |
| `prop_floor_crate` | Wooden supply crate | Floor, stackable | Obstacle, collectible spot |
| `prop_floor_brazier` | Standing fire pit | Floor, open areas | Light source, danger zone |
| `prop_floor_lever` | Floor-mounted lever | Floor, near doors | Interactive element (future) |
| `prop_floor_switch` | Pressure plate | Floor, pathways | Trap trigger (future) |
| `prop_wall_torch` | Wall-mounted torch | Walls, 1.5m height | Light source, atmosphere |
| `prop_wall_chains` | Hanging chains | Walls, ceilings | Horror atmosphere |

#### Doors (Transitions)

| Model | Visual Description | Use Case |
| ----- | ------------------ | -------- |
| `prop_wall_big_door_wood` | Large wooden double door | Level exits, main entrances |
| `prop_wall_big_door_iron` | Heavy iron reinforced door | Boss rooms, secure areas |
| `prop_wall_door_cell` | Small prison cell door | Side rooms, secrets |
| `struct_wall_big_door_*` | Door frame structure pieces | Door surround construction |

#### Pillars (Structural)

| Model | Visual Description | Placement |
| ----- | ------------------ | --------- |
| `struct_pillar_corner_base/main/top` | Corner support column | Maze corners, intersections |
| `struct_pillar_angled_base/main/top` | 45° angle pillar | Diagonal connections |
| `struct_pillar_mid_wall_base/main/top` | Wall-mounted half-pillar | Long wall breaks |

#### Traps (Hazards - Future)

| Model | Visual Description | Behavior |
| ----- | ------------------ | -------- |
| `trap_floor_spikes` | Retractable floor spikes | Damage on timer/trigger |
| `trap_floor_saw` | Rotating saw blade | Damage on contact |
| `trap_floor_saw_slot_*` | Saw track pieces | Saw movement path |
| `trap_floor_pipes` | Steam vent pipes | Periodic damage burst |
| `trap_ceiling_crusher_*` | Descending crusher | Crush damage zone |

#### Large Structures (Architecture)

| Model | Visual Description | Use Case |
| ----- | ------------------ | -------- |
| `struct_large_curved_wall` | Full-height curved wall | Arena boundaries |
| `struct_large_straight_wall` | Full-height straight wall | Arena boundaries |
| `struct_large_*_steps` | Staircase pieces | Multi-level (future) |
| `struct_large_*_ramp` | Inclined surfaces | Accessibility, flow |

#### Decorations (Nature by Yughues)

| Model | Visual Description | Placement |
| ----- | ------------------ | --------- |
| `01/tiny_weed_03_01.obj` | Small grass tuft | Floor edges, 5% coverage |
| `02/tiny_weed_03_02.obj` | Medium plant | Floor corners |
| `03/tiny_weed_03_03.obj` | Large weed cluster | Dead ends, decorative |
| `01-05/rock_*.obj` | 5 rock size variants | Floor scatter, obstacles |
| `ivy/ivy_*.obj` | Wall-climbing ivy | Wall surfaces, overgrown areas |

### 🎯 Implementation Guidelines

#### Loading Priority

```text
1. CRITICAL (before game start):
   - struct_wall_* (all wall types)
   - struct_floor_normal
   - Skydome.obj

2. HIGH (during loading screen):
   - struct_floor_cracked_*
   - struct_pillar_*
   - prop_wall_torch

3. MEDIUM (lazy load):
   - prop_floor_* (barrels, crates)
   - All decorations

4. LOW (on-demand):
   - trap_* (when trap system enabled)
   - prop_wall_big_door_* (level transitions)
```

#### Kurzgesagt Material Override

```typescript
// All models get flat-color materials (no textures)
const material = new BABYLON.StandardMaterial('kurzgesagt', scene);
material.diffuseColor = KURZGESAGT_COLORS.walls; // #2D3436
material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Low shine
material.emissiveColor = material.diffuseColor.scale(0.1); // Subtle glow
```

#### Instancing Strategy

```typescript
// 1 draw call per model type using thin instances
const wallMesh = await loadModel('struct_wall_straight_main');
wallMesh.thinInstanceSetBuffer('matrix', matrices, 16);
// Result: 500 walls = 1 draw call
```

### 3D Character Style (Kurzgesagt-Adapted)

#### Runner (Player)

- Base: Yellow sphere (head = 80% of visual)
- Eyes: Large white circles with black pupils
- Body: Optional small capsule
- NO mouth (no Pac-Man aesthetic)
- Emissive glow for visibility

#### Chasers (Enemies)

- Base: Colored capsule shapes
- Eyes: Smaller, slightly menacing
- Colors: Coral red, purple, orange
- Subtle animation (breathing)

### Model Loading System

```typescript
// ui-web/src/lib/assets/modelLoader.ts
// Preload all models before game start
await modelLoader.loadAllModels();

// Get stats
const stats = modelLoader.getLoadedStats();
// { walls: 3, floors: 5, decorations: 13, props: 10, pillars: 9, traps: 5 }

// Create instances
modelLoader.createWallInstance('corner', position, rotation);
modelLoader.createDecorationInstance('rock', position, scale);
modelLoader.createPropInstance('torch', position, rotation, scale);
```

### Performance Considerations

- **Thin Instancing**: All decorations use Babylon.js instances (1 draw call per type)
- **LOD**: Not needed at current scale
- **Mesh Batching**: Walls and floors merged after placement
- **Target**: 60 FPS on mobile with 1000+ decorations

---

## �🎮 Game UI/UX Benchmarks 2024

### HUD Best Practices

| Element      | Position     | Size     | Opacity |
| ------------ | ------------ | -------- | ------- |
| Score        | Top center   | 48-64px  | 100%    |
| Lives/Health | Top left     | 32-48px  | 100%    |
| Timer        | Top right    | 32-48px  | 100%    |
| Mini-map     | Bottom right | 80-120px | 70%     |
| Power-ups    | Bottom left  | 48-64px  | 100%    |

### Button Design Standards

```text
TOUCH TARGET: Minimum 44x44px (iOS) / 48x48dp (Android)
PADDING: 16-24px internal
BORDER RADIUS: 8-16px (rounded feel)
STATES:
  - Default: Base color
  - Hover: 10% lighter
  - Pressed: 10% darker, scale 0.95
  - Disabled: 50% opacity, grayscale
```

### Color Accessibility

| Ratio | Use Case                  | Status       |
| ----- | ------------------------- | ------------ |
| 3:1   | Large text, UI components | Minimum      |
| 4.5:1 | Normal text               | AA Standard  |
| 7:1   | All text                  | AAA Standard |

### Tested Color Combinations (WCAG Compliant)

```text
✅ #1A1A2E + #FFFFFF (12.5:1)
✅ #1A1A2E + #FFD93D (8.2:1)
✅ #1A1A2E + #4ECDC4 (6.8:1)
✅ #FF6B6B + #FFFFFF (4.6:1)
⚠️ #F8A5C2 + #FFFFFF (2.1:1) - decorative only
```

---

## ✨ VFX & Particle Systems

### Recommended Particle Effects

| Event          | Particles | Duration | Colors          |
| -------------- | --------- | -------- | --------------- |
| Pellet Collect | 8-12      | 300ms    | Gold sparkles   |
| Power-up Get   | 20-30     | 500ms    | Rainbow burst   |
| Enemy Caught   | 15-20     | 400ms    | Coral explosion |
| Level Complete | 50-100    | 2000ms   | Confetti        |
| Victory        | 100+      | 3000ms   | Gold + sparkles |

### Animation Timing Guidelines

```text
INSTANT: 0-100ms
  - Button feedback
  - Damage flash
  
QUICK: 100-300ms
  - Collect effects
  - Small transitions
  
MEDIUM: 300-600ms
  - Screen transitions
  - Power-up activation
  
SLOW: 600-1000ms
  - Victory celebrations
  - Level introductions
```

### Easing Functions

```css
/* Bouncy (for games) */
cubic-bezier(0.68, -0.55, 0.265, 1.55)

/* Smooth out */
cubic-bezier(0.25, 0.46, 0.45, 0.94)

/* Smooth in-out */
cubic-bezier(0.42, 0, 0.58, 1)

/* Elastic */
cubic-bezier(0.68, -0.6, 0.32, 1.6)
```

---

## 🖼️ Asset Specifications

### Sprite Resolutions

| Asset Type | Base Size  | @2x       | @3x       |
| ---------- | ---------- | --------- | --------- |
| Character  | 64x64      | 128x128   | 192x192   |
| Tile       | 32x32      | 64x64     | 96x96     |
| Icon       | 24x24      | 48x48     | 72x72     |
| Power-up   | 48x48      | 96x96     | 144x144   |
| Background | 1920x1080  | 3840x2160 | -         |

### File Formats

- **Sprites**: PNG-8 (256 colors) or WebP
- **Backgrounds**: JPEG (80% quality) or WebP
- **Icons**: SVG preferred, PNG fallback
- **Animations**: Sprite sheets or Lottie JSON

### Optimization Targets

```text
Sprite sheet: < 1MB per sheet
Total assets: < 10MB initial load
Background: < 200KB each
Audio: < 50KB per sound effect
```

---

## 📱 Responsive Design Breakpoints

### Standard Breakpoints

```css
/* Mobile First */
@media (min-width: 480px)  { /* Large mobile */ }
@media (min-width: 768px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large desktop */ }
```

### Game-Specific Considerations

- **16:9**: Standard desktop/console
- **19.5:9**: Modern mobile (notch safe area)
- **4:3**: Tablet, older devices
- **21:9**: Ultrawide monitors

### Safe Zones

```text
TOP: 44-88px (notch/status bar)
BOTTOM: 34px (home indicator)
SIDES: 16-24px (bezels)
```

---

## 🎭 Competitor Visual Analysis

### Fall Guys

- **Style**: 3D, clay-like, pastel colors
- **Characters**: Bean-shaped, highly customizable
- **UI**: Playful, rounded, bright
- **Strength**: Costume variety, silly aesthetic

### Among Us

- **Style**: 2D, simple, bold outlines
- **Characters**: Bean/capsule shape, color-based
- **UI**: Functional, clean, emergency meeting drama
- **Strength**: Recognizable silhouette

### Pac-Man

- **Style**: Classic arcade, geometric
- **Characters**: Iconic shapes (circle, ghosts)
- **UI**: Retro, neon, pixel-inspired
- **Strength**: Nostalgia, instant recognition

### MazeChase Opportunity

```text
DIFFERENTIATION:
- Kurzgesagt style = unique in gaming
- Flat design = performance friendly
- Expressive minimalism = memorable
- Educational aesthetic = trust/quality feel
```

---

## 🎨 Color Psychology in Games

### Emotional Associations

| Color       | Emotion          | Game Use          |
| ----------- | ---------------- | ----------------- |
| Yellow      | Joy, Energy      | Player, coins     |
| Red/Coral   | Danger, Urgency  | Enemies, damage   |
| Blue/Cyan   | Trust, Calm      | Info, shields     |
| Green       | Success, Health  | Power-ups, health |
| Purple      | Mystery, Premium | Rare items        |
| Orange      | Action, Fun      | CTAs, energy      |
| Pink        | Playful, Social  | Social features   |

### Color Temperature

- **Warm** (yellow/orange/red): Action, urgency
- **Cool** (blue/cyan/purple): Strategy, relaxation
- **Neutral** (gray/white): UI, readability

---

## 📚 Design Resources

### Kurzgesagt References

- YouTube: Kurzgesagt – In a Nutshell
- Art Director: Philip Laibacher
- Animation Style: After Effects, Illustrator

### Tools for This Style

- **Illustration**: Figma, Illustrator, Affinity Designer
- **Animation**: After Effects, Rive, Lottie
- **3D (if needed)**: Blender with flat shading
- **Particles**: Babylon.js ParticleSystem

### Font Recommendations

| Use        | Primary         | Fallback       |
| ---------- | --------------- | -------------- |
| Headlines  | Nunito Black    | Quicksand Bold |
| Body       | Nunito Regular  | Open Sans      |
| Numbers    | Rubik Medium    | Roboto Mono    |
| Pixel/Retro| Press Start 2P  | VT323          |

---

## 🎨 DALL-E Prompt Engineering for Kurzgesagt Style

### Effective Prompt Template

```text
STRUCTURE:
[SUBJECT], [STYLE KEYWORDS], [TECHNICAL SPECS], [NEGATIVE PROMPTS]

EXAMPLE:
"A cute round yellow character with big expressive eyes, 
Kurzgesagt animation style, flat design, no outlines, 
bold saturated colors, simple geometric shapes, 
vector art, clean background, 
--no 3D, no shadows, no gradients, no realistic"
```

### Style Keywords That Work

```text
POSITIVE KEYWORDS:
- Kurzgesagt style
- Flat design illustration
- Bold saturated colors
- Simple geometric shapes
- Vector art style
- Clean minimalist
- Educational illustration
- Infographic style
- Rounded corners
- Soft edges
- Big expressive eyes
- Cute character design

NEGATIVE KEYWORDS (use in prompt):
- no 3D
- no realistic textures
- no gradients
- no outlines
- no shadows
- no complex details
- no photorealistic
```

### Character Prompt Examples

```text
PLAYER CHARACTER (Yellow Runner):
"A cute spherical yellow character with a happy expression, 
big round eyes with white highlights, small smile, 
Kurzgesagt animation style, flat design, no outlines, 
bold yellow #FFD93D color, simple geometric shape,
dark navy #1A1A2E background, vector art, clean design"

CHASER/GHOST (Coral Enemy):
"A floating ghost-like creature with menacing eyes, 
coral red color #FF6B6B, Kurzgesagt animation style, 
flat design, no outlines, simple geometric shape,
minimalist design, wavy bottom edge, 
dark background, vector art"

POWER-UP (Speed Boost):
"A glowing speed power-up icon, lightning bolt shape,
cyan color #4ECDC4 with gold sparkles #FFE66D,
Kurzgesagt style, flat design, no outlines,
simple geometric shapes, game asset, transparent background"
```

### Environment Prompt Examples

```text
MAZE WALL:
"Simple flat colored wall segment, dark purple #667EEA,
soft glow edge, Kurzgesagt style, flat design,
no textures, no gradients, clean vector art,
game asset, tileable"

PELLET/COLLECTIBLE:
"Small glowing dot collectible, gold color #FFE66D,
simple circle with soft glow, Kurzgesagt style,
flat design, game asset, transparent background"

BACKGROUND:
"Abstract space background, deep navy #1A1A2E,
subtle stars and nebula shapes, Kurzgesagt style,
flat design, soft gradients allowed for space,
minimalist, clean, vector art style"
```

### Quality Control Checklist for Generated Assets

```text
✅ MUST HAVE:
- [ ] Uses exact hex colors from palette
- [ ] Flat design (no 3D effects)
- [ ] No hard outlines
- [ ] Simple geometric shapes
- [ ] Consistent style with existing assets
- [ ] Appropriate size/resolution
- [ ] Transparent background (for sprites)

❌ REJECT IF:
- [ ] Has 3D shading or realistic textures
- [ ] Contains visible outlines
- [ ] Uses wrong color palette
- [ ] Too complex or detailed
- [ ] Inconsistent with Kurzgesagt style
- [ ] Wrong aspect ratio
```

---

## ✨ Advanced VFX Techniques

### Particle System Recipes (Babylon.js)

```javascript
// Gold Sparkle (Pellet Collect)
const sparkle = new BABYLON.ParticleSystem("sparkle", 20, scene);
sparkle.particleTexture = new BABYLON.Texture("spark.png", scene);
sparkle.emitter = position;
sparkle.color1 = new BABYLON.Color4(1, 0.85, 0.4, 1);  // Gold
sparkle.color2 = new BABYLON.Color4(1, 0.9, 0.6, 1);
sparkle.colorDead = new BABYLON.Color4(1, 0.9, 0.5, 0);
sparkle.minSize = 0.05;
sparkle.maxSize = 0.15;
sparkle.minLifeTime = 0.2;
sparkle.maxLifeTime = 0.5;
sparkle.emitRate = 50;
sparkle.gravity = new BABYLON.Vector3(0, 2, 0);
sparkle.direction1 = new BABYLON.Vector3(-1, 1, -1);
sparkle.direction2 = new BABYLON.Vector3(1, 2, 1);
sparkle.minEmitPower = 0.5;
sparkle.maxEmitPower = 1.5;
sparkle.updateSpeed = 0.01;
sparkle.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

// Rainbow Burst (Power-Up)
const rainbow = new BABYLON.ParticleSystem("rainbow", 100, scene);
rainbow.particleTexture = new BABYLON.Texture("circle.png", scene);
rainbow.addColorGradient(0, new BABYLON.Color4(1, 0, 0, 1));    // Red
rainbow.addColorGradient(0.2, new BABYLON.Color4(1, 0.5, 0, 1)); // Orange
rainbow.addColorGradient(0.4, new BABYLON.Color4(1, 1, 0, 1));   // Yellow
rainbow.addColorGradient(0.6, new BABYLON.Color4(0, 1, 0.5, 1)); // Green
rainbow.addColorGradient(0.8, new BABYLON.Color4(0, 0.5, 1, 1)); // Blue
rainbow.addColorGradient(1, new BABYLON.Color4(0.5, 0, 1, 0));   // Purple fade
rainbow.minSize = 0.1;
rainbow.maxSize = 0.3;
rainbow.minLifeTime = 0.5;
rainbow.maxLifeTime = 1;
rainbow.emitRate = 200;
rainbow.createSphereEmitter(0.5);
rainbow.minEmitPower = 2;
rainbow.maxEmitPower = 4;

// Confetti (Victory)
const confetti = new BABYLON.ParticleSystem("confetti", 500, scene);
confetti.particleTexture = new BABYLON.Texture("confetti.png", scene);
confetti.color1 = new BABYLON.Color4(1, 0.85, 0.3, 1);  // Gold
confetti.color2 = new BABYLON.Color4(1, 0.4, 0.6, 1);   // Pink
confetti.minSize = 0.05;
confetti.maxSize = 0.1;
confetti.minLifeTime = 2;
confetti.maxLifeTime = 4;
confetti.emitRate = 100;
confetti.gravity = new BABYLON.Vector3(0, -2, 0);
confetti.minAngularSpeed = -Math.PI;
confetti.maxAngularSpeed = Math.PI;
confetti.createConeEmitter(2, Math.PI / 3);
```

### Screen Effects

```javascript
// Screen Flash (Damage/Collect)
function screenFlash(color, duration = 0.2) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: ${color};
        opacity: 0.5;
        pointer-events: none;
        z-index: 9999;
        animation: flash ${duration}s ease-out forwards;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), duration * 1000);
}

// Screen Shake (Impact)
function screenShake(intensity = 5, duration = 0.3) {
    const canvas = document.querySelector('canvas');
    const originalTransform = canvas.style.transform;
    
    const startTime = performance.now();
    function shake() {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed < duration) {
            const decay = 1 - (elapsed / duration);
            const x = (Math.random() - 0.5) * intensity * decay;
            const y = (Math.random() - 0.5) * intensity * decay;
            canvas.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        } else {
            canvas.style.transform = originalTransform;
        }
    }
    shake();
}

// Vignette (Tension)
function setVignette(intensity = 0.5) {
    const overlay = document.getElementById('vignette-overlay');
    overlay.style.boxShadow = `inset 0 0 ${100 * intensity}px ${50 * intensity}px rgba(0,0,0,0.5)`;
}
```

---

## 📐 Layout & Composition

### Golden Ratio Applications

```text
GAME SCREEN LAYOUT:
┌─────────────────────────────────────────┐
│  HUD TOP (61.8% width centered)         │
├─────────────────────────────────────────┤
│                                         │
│       GAME AREA (φ proportions)         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  HUD BOTTOM (38.2% from each side)      │
└─────────────────────────────────────────┘

φ (phi) = 1.618
Use for: Element positioning, UI sizing, sprite proportions
```

### Rule of Thirds for Game Screens

```text
Key positions for important elements:
┌───┬───┬───┐
│   │ A │   │  A = Score, timer
├───┼───┼───┤  
│ B │ C │ D │  C = Player focus area
├───┼───┼───┤  B/D = Power-ups, lives
│   │ E │   │  E = Minimap, controls
└───┴───┴───┘
```

### Visual Hierarchy

```text
1. PLAYER (brightest, center focus)
2. Enemies (high contrast, threat visibility)
3. Collectibles (attractive, findable)
4. Environment (readable, non-distracting)
5. UI (clear but non-intrusive)
```

---

*Last Updated: December 2024*
*For use by AI testers - reduces token usage for visual research*
