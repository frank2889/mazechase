# ⚡ Performance Research - Web Games & Babylon.js 2024-2025

## Executive Summary
Dit document bevat voorgecompileerd onderzoek voor Elena (Performance Engineer).
Gebruik deze data voor onderbouwde performance adviezen.

---

## 📊 Performance Benchmarks

### Target Frame Rates
| Platform | Target | Minimum | Notes |
|----------|--------|---------|-------|
| Desktop | 60 FPS | 30 FPS | Vsync standard |
| Mobile (high) | 60 FPS | 30 FPS | Flagships |
| Mobile (mid) | 30 FPS | 24 FPS | Budget phones |
| Tablet | 60 FPS | 30 FPS | Similar to desktop |

### Frame Budget
```
60 FPS = 16.67ms per frame
30 FPS = 33.33ms per frame

BUDGET BREAKDOWN (60 FPS):
├── JavaScript Logic: 4-6ms
├── Rendering: 8-10ms
├── Browser/OS: 2-3ms
└── Buffer: 1-2ms (headroom)
```

### Load Time Targets
| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| First Paint | <1s | <2s | >3s |
| First Interactive | <3s | <5s | >8s |
| Fully Loaded | <5s | <10s | >15s |

---

## 🎮 Babylon.js Optimization Techniques

### Mesh Optimization
```javascript
// 1. Use instances for repeated objects
const baseMesh = MeshBuilder.CreateBox("base", { size: 1 });
baseMesh.isVisible = false;

// Create 100 instances (much faster than 100 meshes)
for (let i = 0; i < 100; i++) {
    const instance = baseMesh.createInstance("box" + i);
    instance.position.x = i % 10 * 2;
    instance.position.z = Math.floor(i / 10) * 2;
}

// 2. Merge static meshes
const merged = Mesh.MergeMeshes(staticMeshes, true, true);

// 3. Freeze world matrix for static objects
mesh.freezeWorldMatrix();

// 4. Use thin instances for massive batching (10,000+ objects)
mesh.thinInstanceSetMatrixAt(index, matrix, true);
```

### Material Optimization
```javascript
// 1. Freeze materials that don't change
material.freeze();

// 2. Use StandardMaterial for simple cases
const mat = new StandardMaterial("mat", scene);
mat.diffuseColor = new Color3(1, 0, 0);
mat.specularColor = new Color3(0, 0, 0); // Disable specular

// 3. Disable unused features
mat.disableLighting = true; // If using emissive only

// 4. Reduce texture resolution
texture.updateSamplingMode(Texture.NEAREST_SAMPLINGMODE);
```

### Rendering Optimization
```javascript
// 1. Enable hardware scaling
engine.setHardwareScalingLevel(1.5); // 1.5 = 67% resolution

// 2. Reduce render quality on mobile
if (isMobile) {
    engine.setHardwareScalingLevel(2.0); // 50% resolution
    scene.performancePriority = ScenePerformancePriority.Intermediate;
}

// 3. Use occlusion queries (don't render hidden objects)
mesh.occlusionQueryAlgorithmType = AbstractMesh.OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE;

// 4. Frustum culling (automatic, but ensure meshes have bounding info)
mesh.refreshBoundingInfo();
```

### GlowLayer Performance
```javascript
// Limit glow to specific meshes (instead of scene-wide)
glowLayer.addIncludedOnlyMesh(runnerMesh);
glowLayer.addIncludedOnlyMesh(powerUpMesh);

// Reduce blur kernel for performance
glowLayer.blurKernelSize = 16; // Default 32, lower = faster

// Lower resolution
glowLayer.mainTextureFixedSize = 256; // Default 512
```

---

## 📦 Bundle Size Optimization

### Babylon.js Tree Shaking
```javascript
// ❌ Bad: Imports everything
import * as BABYLON from '@babylonjs/core';

// ✅ Good: Import only what you need
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
```

### Typical Bundle Sizes
| Package | Full | Tree-shaken |
|---------|------|-------------|
| @babylonjs/core | 3.5 MB | 500KB-1.5MB |
| @babylonjs/materials | 500 KB | 50-200KB |
| @babylonjs/loaders | 300 KB | 30-100KB |
| tone.js | 400 KB | 150-250KB |

### Code Splitting
```javascript
// Lazy load non-critical modules
const loadAudio = () => import('./lib/audio/dopamine-audio');
const loadVFX = () => import('./lib/game3d/vfx');

// Load on first interaction
document.addEventListener('click', async () => {
    const audio = await loadAudio();
    audio.init();
}, { once: true });
```

---

## 🔄 Memory Management

### Common Memory Leaks
```javascript
// ❌ Bad: Event listener not removed
window.addEventListener('resize', handleResize);

// ✅ Good: Clean up on destroy
const controller = new AbortController();
window.addEventListener('resize', handleResize, { signal: controller.signal });
// Later: controller.abort();

// ❌ Bad: Mesh not disposed
const mesh = MeshBuilder.CreateBox("box", {});

// ✅ Good: Dispose when done
mesh.dispose();
material.dispose();
texture.dispose();
```

### Memory Budgets
| Platform | Total | Textures | Meshes |
|----------|-------|----------|--------|
| Desktop | 2 GB | 512 MB | 256 MB |
| Mobile (high) | 1 GB | 256 MB | 128 MB |
| Mobile (low) | 512 MB | 128 MB | 64 MB |

### Texture Memory Calculator
```
Size = Width × Height × Bytes per Pixel × Mipmaps

1024×1024 RGBA = 1024 × 1024 × 4 × 1.33 = 5.6 MB
512×512 RGBA = 512 × 512 × 4 × 1.33 = 1.4 MB
256×256 RGBA = 256 × 256 × 4 × 1.33 = 350 KB
```

---

## 📱 Mobile-Specific Optimization

### Adaptive Quality System
```javascript
const QUALITY_PRESETS = {
    ultra: {
        resolution: 1.0,
        glowEnabled: true,
        shadowsEnabled: true,
        particleCount: 100,
        antiAliasing: true
    },
    high: {
        resolution: 1.0,
        glowEnabled: true,
        shadowsEnabled: false,
        particleCount: 50,
        antiAliasing: true
    },
    medium: {
        resolution: 0.75,
        glowEnabled: false,
        shadowsEnabled: false,
        particleCount: 25,
        antiAliasing: false
    },
    low: {
        resolution: 0.5,
        glowEnabled: false,
        shadowsEnabled: false,
        particleCount: 10,
        antiAliasing: false
    }
};

// Auto-detect based on FPS
let frameCount = 0;
let lastCheck = performance.now();

scene.onBeforeRenderObservable.add(() => {
    frameCount++;
    const now = performance.now();
    if (now - lastCheck >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastCheck = now;
        
        if (fps < 25 && currentQuality !== 'low') {
            downgradeQuality();
        } else if (fps > 55 && currentQuality !== 'ultra') {
            upgradeQuality();
        }
    }
});
```

### Touch Optimization
```javascript
// Use passive listeners
canvas.addEventListener('touchmove', handleTouch, { passive: true });

// Debounce expensive operations
let touchTimeout;
function handleTouch(e) {
    clearTimeout(touchTimeout);
    touchTimeout = setTimeout(() => {
        updatePlayerPosition(e.touches[0]);
    }, 16); // ~60fps
}
```

---

## 🌐 Network Optimization

### WebSocket Best Practices
```javascript
// 1. Batch updates
const updateBuffer = [];
setInterval(() => {
    if (updateBuffer.length > 0) {
        ws.send(JSON.stringify({ batch: updateBuffer }));
        updateBuffer.length = 0;
    }
}, 50); // 20 updates/sec max

// 2. Compress messages
const compressed = LZString.compress(JSON.stringify(state));
ws.send(compressed);

// 3. Binary protocol for position updates
const buffer = new ArrayBuffer(12); // x, y, z as Float32
const view = new Float32Array(buffer);
view[0] = player.x;
view[1] = player.y;
view[2] = player.z;
ws.send(buffer);
```

### Asset Loading Strategy
```javascript
// Priority loading
const LOAD_PRIORITY = {
    CRITICAL: ['core-sprites.png', 'ui-atlas.png'],
    HIGH: ['player.png', 'enemies.png'],
    MEDIUM: ['background.png', 'music.mp3'],
    LOW: ['decorations.png', 'ambient.mp3']
};

// Progressive loading with placeholders
async function loadWithPlaceholder(url, placeholder) {
    const img = new Image();
    img.src = placeholder;
    
    const fullImage = await fetch(url).then(r => r.blob());
    img.src = URL.createObjectURL(fullImage);
    
    return img;
}
```

---

## 📈 Profiling Checklist

### Chrome DevTools
```
1. Performance Tab:
   - Record gameplay session
   - Check for long tasks (>50ms)
   - Look for layout thrashing
   
2. Memory Tab:
   - Take heap snapshots
   - Compare before/after gameplay
   - Look for detached DOM nodes
   
3. Network Tab:
   - Check asset sizes
   - Look for redundant requests
   - Verify caching headers
```

### Babylon.js Inspector
```javascript
// Enable in development
if (import.meta.env.DEV) {
    scene.debugLayer.show({
        embedMode: true,
        overlay: true
    });
}

// Key metrics to watch:
// - Draw calls
// - Active meshes
// - Total vertices
// - GPU frame time
```

### Performance Metrics to Track
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | >55 | 30-55 | <30 |
| Draw Calls | <100 | 100-200 | >200 |
| Vertices | <100K | 100-500K | >500K |
| Textures | <50 MB | 50-100MB | >100MB |
| JS Heap | <100 MB | 100-200MB | >200MB |

---

## 🔧 Quick Wins Checklist

### Immediate Improvements
- [ ] Enable mesh instancing for walls
- [ ] Freeze materials after setup
- [ ] Reduce glow blur kernel
- [ ] Implement object pooling
- [ ] Add adaptive quality
- [ ] Use compressed textures
- [ ] Enable browser caching
- [ ] Minimize DOM updates

### Code-Level Fixes
- [ ] Remove `console.log` in production
- [ ] Use `requestAnimationFrame` correctly
- [ ] Avoid array allocations in loops
- [ ] Cache DOM queries
- [ ] Use `const` where possible (V8 optimization)

---

*Last Updated: December 2024*
*For use by AI testers - reduces token usage for performance research*
