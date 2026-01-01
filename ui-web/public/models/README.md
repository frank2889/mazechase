# MazeChase 3D Models

External 3D models for MazeChase, loaded via ModelLoader.

## ✅ Downloaded Assets (CC0 Licensed)

All assets are Public Domain (CC0) - no attribution required.

### Dungeon Set 2 - Walls & Floors

- **Source**: [opengameart.org/modular-dungeon-2](https://opengameart.org/content/modular-dungeon-2-3d-models)
- **Author**: Keith at Fertile Soil Productions
- **License**: CC0 (Public Domain)
- **Format**: OBJ (~90 modular pieces)
- **Location**: `/models/dungeon/Dungeon Set 2/`

Key files:

- `struct_wall_straight_main.obj` - Straight wall segment
- `struct_wall_curved_main.obj` - Corner wall
- `struct_wall_joint_main.obj` - T-junction/cross wall
- `struct_floor_normal.obj` - Standard floor tile
- `struct_floor_cracked_*.obj` - Cracked floor variants
- `prop_floor_barrel.obj`, `prop_floor_crate.obj` - Props
- `prop_wall_torch.obj`, `prop_wall_door_cell.obj` - Wall props

### Skydome 3D

- **Source**: [opengameart.org/skydome-3d](https://opengameart.org/content/skydome-3d)
- **Author**: GGBotNet
- **License**: CC0 (Public Domain)
- **Format**: OBJ, FBX, Blend, MAX
- **Location**: `/models/environment/`

Files:

- `Skydome.obj` - Main skydome mesh (480 triangles)
- `Skydome.png` - 1024x1024 cloud texture

### Tiny Weeds 3

- **Source**: [opengameart.org/tiny-weeds-3](https://opengameart.org/content/tiny-weeds-3)
- **Author**: Yughues
- **License**: CC0 (Public Domain)
- **Format**: OBJ
- **Location**: `/models/decorations/01-03/`, `/models/decorations/ivy/`

Files:

- `tiny_weed_03_01.obj` - Small weed
- `tiny_weeds_03_02.obj` - Medium weed
- `tiny_weeds_03_03.obj` - Large weed
- `ivy_*.obj` - Ivy variants (corner, bend, default)

### Rocks

- **Source**: [opengameart.org/rocks](https://opengameart.org/content/rocks-0)
- **Author**: Yughues
- **License**: CC0 (Public Domain)
- **Format**: OBJ, FBX
- **Location**: `/models/decorations/01-05/`

Files:

- `rock_01.obj` to `rock_05.obj` - Various rock sizes

## Usage in Code

```typescript
import { initModelLoader, preloadGameAssets } from '@/lib/assets';

// Initialize and preload all models
const loader = initModelLoader(scene);
await loader.loadAllModels();

// Create instances for maze building
const wall = loader.createWallInstance('straight', position, rotation);
const floor = loader.createFloorInstance('stone', position);
const decoration = loader.createDecorationInstance('rock', position);
```

## Directory Structure

```text
models/
├── dungeon/
│   └── Dungeon Set 2/          # ~90 OBJ modular dungeon pieces
│       ├── struct_wall_*.obj   # Wall segments
│       ├── struct_floor_*.obj  # Floor tiles
│       ├── prop_*.obj          # Props (barrels, torches, etc.)
│       └── trap_*.obj          # Trap elements
├── environment/
│   ├── Skydome.obj             # Skydome mesh
│   ├── Skydome.png             # Skydome texture
│   ├── Skydome.FBX             # FBX format
│   └── Skydome.blend           # Blender source
├── decorations/
│   ├── 01/                     # Rock 01 + Weed 01
│   ├── 02/                     # Rock 02 + Weed 02
│   ├── 03/                     # Rock 03 + Weed 03
│   ├── 04/                     # Rock 04
│   ├── 05/                     # Rock 05
│   └── ivy/                    # Ivy decorations
├── downloads/                  # Original archives
│   ├── dungeon_collection_2.zip
│   ├── skydome3d.zip
│   ├── tiny_weeds_3.7z
│   └── rocks.7z
└── README.md
```

## Model Requirements

- Format: OBJ with MTL (textures optional - untextured works fine)
- Scale: Models are 1 unit = 1 meter, scaled to TILE_SIZE_3D in code
- Origin: Center of model for proper placement
- License: CC0 for commercial use without attribution
