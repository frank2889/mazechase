# Frontend Rendering - MazeChase

## Overview

De frontend is gebouwd met TypeScript en Babylon.js voor 3D rendering. Alle game state komt van de server via WebSocket events.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    main.ts                          │
│  ├─ initGame()                                      │
│  ├─ setupGameEventHandlers()                        │
│  └─ UI functions (phase, warnings, etc.)            │
└────────────────────────┬────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ↓             ↓             ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ connection.ts│ │   scene.ts   │ │   player.ts  │
│ WebSocket    │ │ Game3DScene  │ │ Player3D     │
│ Events       │ │ Integration  │ │ Movement     │
└──────────────┘ └──────────────┘ └──────────────┘
                         │
           ┌─────────────┼─────────────┐
           ↓             ↓             ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ entities.ts  │ │   zones.ts   │ │dynamicMaze.ts│
│EntityRenderer│ │ ZoneRenderer │ │ DynamicMaze  │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## EntityRenderer (`entities.ts`)

### Mesh Types

| Entity | Babylon.js Mesh | Properties |
|--------|-----------------|------------|
| Hunter | `CreatePolyhedron` (Octahedron) | Size: 0.4, aggressive angular shape |
| Scanner | `CreateSphere` | Diameter: 0.5, squashed (1.2, 0.6, 1) - eye-like |
| Sweeper | `CreateCylinder` | Diameter: 0.5, height: 0.3, hexagonal |

### Visual Features

#### Particle Aura
```typescript
const particles = new BABYLON.ParticleSystem(`entityParticles_${id}`, 50, scene);
particles.emitter = entityPosition;
particles.minSize = 0.05;
particles.maxSize = 0.15;
particles.emitRate = 20; // Increases to 50 during chase
```

#### Glow Layer
```typescript
// Entities use emissive materials
material.emissiveColor = BABYLON.Color3.FromHexString(data.glowColor);
// GlowLayer adds bloom effect
glowLayer.addIncludedOnlyMesh(mesh);
```

#### Scanner Cone
```typescript
const cone = BABYLON.MeshBuilder.CreateCylinder(`scanCone_${id}`, {
    diameterTop: 0,
    diameterBottom: coneRadius * 2,
    height: coneLength,  // = detectionRange
    tessellation: 16
});
cone.material.alpha = 0.15;  // Semi-transparent
```

### State-Based Visuals

| State | Emit Rate | Rotation Speed | Glow Intensity |
|-------|-----------|----------------|----------------|
| Patrol | 20 | 0.02 rad/frame | 0.5 + alertLevel * 0.5 |
| Alert | 35 | 0.05 rad/frame | 0.7 |
| Chase | 50 | 0.1 rad/frame | 1.0 |

### Position Interpolation

```typescript
// Smooth movement between server updates
const targetPos = new BABYLON.Vector3(data.x, 0.5, data.y);
entity.mesh.position = BABYLON.Vector3.Lerp(
    entity.mesh.position, 
    targetPos, 
    0.2  // Interpolation factor
);
```

---

## ZoneRenderer (`zones.ts`)

### Zone Visualization

```typescript
// Ground plane per zone
const ground = BABYLON.MeshBuilder.CreateGround(`zone_${id}`, {
    width: zone.width,
    height: zone.height
});
ground.position.y = -0.05; // Slightly below floor
```

### Zone Colors

| Type | Color | Active Alpha | Inactive Alpha |
|------|-------|--------------|----------------|
| Safe | `#33cc4d` (green) | 0.2 | 0.08 |
| Neutral | `#cccc33` (yellow) | 0.2 | 0.08 |
| Danger | `#e63333` (red) | 0.2 | 0.2 |

### Phase-Based Lighting

```typescript
const phaseColors = {
    day: {
        ambient: new Color3(0.8, 0.8, 0.9),
        sun: new Color3(1, 0.95, 0.8),
        fog: new Color3(0.5, 0.6, 0.8),
        intensity: 1.0
    },
    dusk: {
        ambient: new Color3(0.6, 0.4, 0.5),
        sun: new Color3(1, 0.5, 0.3),
        fog: new Color3(0.4, 0.3, 0.4),
        intensity: 0.6
    },
    night: {
        ambient: new Color3(0.1, 0.1, 0.2),
        sun: new Color3(0.2, 0.2, 0.4),
        fog: new Color3(0.05, 0.05, 0.1),
        intensity: 0.2
    },
    dawn: {
        ambient: new Color3(0.5, 0.4, 0.5),
        sun: new Color3(1, 0.6, 0.4),
        fog: new Color3(0.4, 0.35, 0.45),
        intensity: 0.5
    }
};
```

### Fog Settings

| Phase | Fog Density |
|-------|-------------|
| Day | 0.02 |
| Dusk | 0.03 |
| Night | 0.04 |
| Dawn | 0.03 |

### Phase Transitions

Animated over 2 seconds:
```typescript
const animation = new BABYLON.Animation(
    'phaseAmbient', 'diffuse', 30,
    BABYLON.Animation.ANIMATIONTYPE_COLOR3,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
);
animation.setKeys([
    { frame: 0, value: currentColor },
    { frame: 60, value: targetColor }
]);
```

---

## DynamicMaze (`dynamicMaze.ts`)

### Wall Operations

| Type | Animation | Easing |
|------|-----------|--------|
| `wall_add` | Rise from y=-1 to y=0.75 | QuarticEase OUT |
| `wall_remove` | Sink from current to y=-1.5 | QuarticEase IN |
| `wall_move` | Hop arc (rise, move, fall) | Linear |

### Rise Animation

```typescript
const riseAnimation = new BABYLON.Animation(
    `rise_${key}`, 'position.y', 30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
);
riseAnimation.setKeys([
    { frame: 0, value: -1 },
    { frame: frames, value: 0.75 }
]);
```

### Warning Particles

Before wall changes:
```typescript
const particles = new BABYLON.ParticleSystem('wallWarning', 100, scene);

// Colors by type:
// add: blue (#3333ff)
// remove: green (#33ff33)
// move: orange (#ff8033)

particles.emitRate = 100;
particles.start();
setTimeout(() => particles.stop(), 300);
```

### Wall State Tracking

```typescript
private wallMeshes: Map<string, BABYLON.Mesh> = new Map();
private animatingWalls: Set<string> = new Set();

// Key format: "x_z"
private getWallKey(x: number, z: number): string {
    return `${x}_${z}`;
}
```

---

## Scene Integration (`scene.ts`)

### Constructor

```typescript
constructor(canvas: HTMLCanvasElement) {
    this.engine = new GameEngine({ canvas, antialias: true });
    this.maze = new Maze3D(this.engine.babylonScene);
    this.particles = new ParticleManager(this.engine.babylonScene);
    
    // Dynamic systems
    this.entityRenderer = new EntityRenderer(
        this.engine.babylonScene, 
        this.maze.getGlowLayer()
    );
    this.zoneRenderer = new ZoneRenderer(this.engine.babylonScene);
    this.dynamicMaze = new DynamicMaze(this.engine.babylonScene);
}
```

### Event Handlers

```typescript
// Phase changes
onPhaseChange(phase: string, zones: Zone[]): void {
    this.zoneRenderer.setPhase(phase as TimePhase, zones);
}

// Entity updates (called at ~20 Hz)
onEntitiesUpdate(entities: DangerEntityData[]): void {
    this.entityRenderer.updateEntities(entities);
}

// Maze modifications
onMazeUpdate(update: MazeUpdate): void {
    this.dynamicMaze.handleMazeUpdate(update);
}

// Initial state sync
initDynamicState(state: DynamicState): void {
    this.zoneRenderer.createZones(state.zones.zones);
    this.zoneRenderer.setPhase(state.zones.phase as TimePhase);
    this.entityRenderer.updateEntities(state.entities);
}
```

### Helper Methods

```typescript
// Check if player is protected
isPlayerInSafeZone(playerId: string): boolean {
    const pos = player.getPosition();
    return this.zoneRenderer.isInSafeZone(pos.x, pos.z);
}

// Get nearby entity for warnings
getEntityNearPlayer(playerId: string): DangerEntityData | null {
    const pos = player.getPosition();
    return this.entityRenderer.getEntityNear(pos.x, pos.z);
}
```

---

## UI Updates (`main.ts`)

### Event Handler Setup

```typescript
subscribeGameEvents({
    // ... existing handlers ...
    
    // Dynamic world handlers
    onPhaseChange: (phase, zones) => {
        game3d?.onPhaseChange(phase, zones);
        updatePhaseUI(phase);
    },
    onPhaseUpdate: (phase, progress) => {
        game3d?.onPhaseUpdate(phase, progress);
        updatePhaseProgressUI(phase, progress);
    },
    onEntitiesUpdate: (entities) => {
        game3d?.onEntitiesUpdate(entities);
    },
    onEntityNear: (entityId, warning) => {
        if (warning) showEntityWarning(entityId);
    },
    onEntityCollision: (entityId, entityType, caught) => {
        if (caught) showCaughtByEntity(entityType);
    },
    onDynamicStateSync: (state) => {
        game3d?.initDynamicState(state);
    }
});
```

### UI Functions (TODO)

```typescript
// Phase indicator met icoon
function updatePhaseUI(phase: string): void {
    const icons = { day: '☀️', dusk: '🌅', night: '🌙', dawn: '🌄' };
    // Update UI element
}

// Progress bar naar volgende fase
function updatePhaseProgressUI(phase: string, progress: number): void {
    // Update progress bar width
}

// Entity proximity warning
function showEntityWarning(entityId: string): void {
    // Show "GEVAAR NABIJ!" overlay
}

// Capture screen
function showCaughtByEntity(entityType: string): void {
    // Show "GEVANGEN!" met entity type
}
```

---

## Performance Considerations

### Entity Updates

- Server sends ~20 updates/second
- Client interpolates between updates
- Particle systems use pooling

### Optimizations Needed

1. **Position Buffer**: Store last N positions for smooth interpolation
2. **LOD for Entities**: Reduce particles for distant entities
3. **Delta Updates**: Only process changed entities

---

## Known Issues

### 🔴 Critical

1. UI functions referenced but not implemented
2. No position buffer - entities can teleport
3. `registerExistingWalls()` never called

### 🟡 Medium

1. Hardcoded lerp factor (0.2)
2. No collision with dynamic walls
3. Zone labels not rendered

### 🟢 Low

1. Scanner cone could pulse based on alert
2. No audio cues for wall changes
