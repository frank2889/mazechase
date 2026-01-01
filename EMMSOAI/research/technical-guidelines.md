# Technical Implementation Guidelines

## Babylon.js Best Practices for MazeChase

### Performance Targets

- **Frame Rate:** 60 FPS minimum, 30 FPS on low-end
- **Load Time:** <3 seconds first load, <1 second subsequent
- **Memory:** <150MB heap usage
- **Network:** <50KB/s during gameplay

### Mesh & Rendering

#### Instancing (MANDATORY for repeated objects)

```typescript
// BAD - Creates separate meshes
for (let i = 0; i < 100; i++) {
  const pellet = MeshBuilder.CreateSphere("pellet" + i, { diameter: 0.5 });
  pellet.position = positions[i];
}

// GOOD - Uses instancing
const basePellet = MeshBuilder.CreateSphere("pellet", { diameter: 0.5 });
for (let i = 0; i < 100; i++) {
  const instance = basePellet.createInstance("pellet" + i);
  instance.position = positions[i];
}
```

#### Mesh Merging (Static geometry)

```typescript
// Merge static maze walls
const mergedWalls = Mesh.MergeMeshes(wallMeshArray, true, true, undefined, false, true);
```

#### Level of Detail (LOD)

```typescript
// Add LOD for complex meshes
character.addLODLevel(10, characterLOD1);  // Medium distance
character.addLODLevel(20, characterLOD2);  // Far distance
character.addLODLevel(50, null);            // Cull at extreme distance
```

### Animation

#### Squash & Stretch (Standard Implementation)

```typescript
// In update loop
const speed = this.velocity.length();
const stretchFactor = 1 + Math.min(speed * 0.015, 0.15);
const squashFactor = 1 / Math.sqrt(stretchFactor); // Volume preservation

const moveDir = this.velocity.normalize();
const stretchQuat = Quaternion.FromLookDirectionLH(moveDir, Vector3.Up());
this.mesh.rotationQuaternion = stretchQuat;
this.mesh.scaling = new Vector3(squashFactor, squashFactor, stretchFactor);
```

#### Easing Functions

```typescript
// Standard easing for smooth animations
const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// Use with lerp
this.scale = Vector3.Lerp(current, target, easeOutElastic(t));
```

### Materials

#### Material Caching (Required)

```typescript
// BAD - New material per mesh
meshes.forEach(m => {
  m.material = new StandardMaterial("mat", scene);
});

// GOOD - Shared materials
const sharedMaterial = new StandardMaterial("shared", scene);
meshes.forEach(m => m.material = sharedMaterial);
```

#### PBR vs Standard

- Use `StandardMaterial` for mobile/low-end targets
- Use `PBRMaterial` only for key visual elements
- Always set `material.freeze()` after configuration

### Audio

#### Spatial Audio Setup

```typescript
const sound = new Sound("effect", "audio/effect.mp3", scene, null, {
  spatialSound: true,
  maxDistance: 20,
  distanceModel: "exponential"
});
sound.attachToMesh(mesh);
```

#### Audio Pooling

```typescript
class SoundPool {
  private pool: Sound[] = [];
  private index = 0;
  
  constructor(name: string, url: string, scene: Scene, poolSize: number = 5) {
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Sound(name + i, url, scene));
    }
  }
  
  play(position: Vector3): void {
    const sound = this.pool[this.index];
    sound.setPosition(position);
    sound.play();
    this.index = (this.index + 1) % this.pool.length;
  }
}
```

### Networking

#### State Interpolation

```typescript
// Server tick rate: 20 Hz, Client render: 60 Hz
const INTERPOLATION_DELAY = 100; // ms

// Buffer server states
this.stateBuffer.push({ time: serverTime, state: newState });

// Render with interpolation
const renderTime = Date.now() - INTERPOLATION_DELAY;
const [before, after] = this.findSurroundingStates(renderTime);
const t = (renderTime - before.time) / (after.time - before.time);
this.renderState = this.lerpState(before.state, after.state, t);
```

#### Client Prediction

```typescript
// Predict locally
this.applyInput(input);
this.pendingInputs.push({ input, sequence: this.sequence++ });

// Reconcile with server
onServerUpdate(serverState: State, lastProcessedInput: number): void {
  // Remove acknowledged inputs
  this.pendingInputs = this.pendingInputs.filter(i => i.sequence > lastProcessedInput);
  
  // Re-apply pending inputs
  this.state = serverState;
  this.pendingInputs.forEach(i => this.applyInput(i.input));
}
```

### Memory Management

#### Object Pooling (Power-ups, Effects)

```typescript
class ObjectPool<T extends IPoolable> {
  private available: T[] = [];
  private factory: () => T;
  
  acquire(): T {
    return this.available.pop() || this.factory();
  }
  
  release(obj: T): void {
    obj.reset();
    this.available.push(obj);
  }
}
```

#### Texture Management

```typescript
// Use texture atlases
const atlas = new Texture("atlas.png", scene);
// Share UVs for different sprites

// Dispose unused textures
scene.onDisposeObservable.add(() => {
  this.textures.forEach(t => t.dispose());
});
```

### Mobile Optimization

#### Touch Controls

```typescript
// Virtual joystick
const leftJoystick = new VirtualJoystick(true);  // Left side
leftJoystick.setActionOnTouch(() => {
  this.isMoving = true;
});

// Use delta values
const moveX = leftJoystick.deltaPosition.x * this.speed;
const moveY = leftJoystick.deltaPosition.y * this.speed;
```

#### Performance Modes

```typescript
interface QualitySettings {
  shadowQuality: 'off' | 'low' | 'high';
  particleCount: number;
  textureResolution: 'low' | 'medium' | 'high';
  postProcessing: boolean;
}

const QUALITY_PRESETS: Record<string, QualitySettings> = {
  mobile: { shadowQuality: 'off', particleCount: 20, textureResolution: 'low', postProcessing: false },
  medium: { shadowQuality: 'low', particleCount: 50, textureResolution: 'medium', postProcessing: false },
  high: { shadowQuality: 'high', particleCount: 100, textureResolution: 'high', postProcessing: true }
};
```

### Debugging

#### Performance Inspector

```typescript
// Toggle with Shift+I in dev mode
if (import.meta.env.DEV) {
  scene.debugLayer.show({ embedMode: true });
}
```

#### Frame Time Logging

```typescript
scene.onBeforeRenderObservable.add(() => {
  const fps = engine.getFps();
  if (fps < 50) {
    console.warn(`Low FPS: ${fps.toFixed(1)}`);
  }
});
```

---

## 3D Model Loading (December 2025)

### ModelLoader Pattern

```typescript
// Preload all assets before game start
const modelLoader = getModelLoader(scene);
await modelLoader.loadAllModels();

// Check what's loaded
const stats = modelLoader.getLoadedStats();
// { walls: 3, floors: 5, decorations: 13, props: 10, pillars: 9, traps: 5 }

// Create instances (efficient - uses templates)
modelLoader.createWallInstance('corner', position, rotationAngle);
modelLoader.createDecorationInstance('rock', position, scale);
modelLoader.createPropInstance('torch', position, rotation, scale);
modelLoader.createPillarInstance('corner', position, rotation, scale);
```

### Floor Variety System

```typescript
// Automatic floor variety based on position
let floorVariant: 'stone' | 'grate' | 'cracked' = 'stone';
const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

if (distFromCenter < 3) {
  floorVariant = 'grate';  // Grate floors in center
} else if (Math.random() < 0.08) {
  floorVariant = 'cracked'; // 8% random cracked floors
}

const floor = modelLoader.getFloorTemplate(floorVariant);
```

### Decoration Placement Strategy

```typescript
// Place decorations at arena edges (outside gameplay path)
const edgeDistance = radius - 2 + Math.random() * 3;
const angle = Math.random() * Math.PI * 2;

// Choose type based on biome
const decorType = (biome === 'forest') ? 'weed' : 'rock';
const scale = 0.3 + Math.random() * 0.4;

modelLoader.createDecorationInstance(decorType, position, scale);

// Also add props (barrels, crates) with 30% chance in rocky areas
if (biome === 'canyon' && Math.random() > 0.7) {
  modelLoader.createPropInstance('barrel', position, rotation, scale);
}
```

### OBJ Format Notes

```text
✅ OBJ + MTL files load correctly with @babylonjs/loaders/OBJ
✅ Untextured models work fine with StandardMaterial override
✅ CC0 license means free commercial use
⚠️ Always check path exists before loading (HEAD request)
⚠️ Use try/catch for graceful fallback to primitives
```
