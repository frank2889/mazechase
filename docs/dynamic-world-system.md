# Dynamic World System - MazeChase

## Doel

MazeChase is gemigreerd van statische Pacman/ghost mechanics naar een dynamisch wereldsysteem met **zones**, **time phases** en **AI entities**. Het systeem is ontworpen voor **server-authoritative state** (Go) met **client-side rendering** (TypeScript/Babylon.js) en event-synchronisatie via WebSockets.

---

## Conceptueel Model

### Zones

De wereld is opgedeeld in zones met een zone-type:

| Type | Kleur | Gedrag |
|------|-------|--------|
| `safe` | 🟢 Groen | Spelers beschermd tegen entities (behalve 's nachts) |
| `neutral` | 🟡 Geel | Normale gameplay, medium risico |
| `danger` | 🔴 Rood | Entities agressiever, meer spawns |

### Time Phases

De wereld kent een tijdcyclus met 4 fases:

```
day (30s) → dusk (30s) → night (30s) → dawn (30s) → day ...
```

#### Phase Effects

| Phase | Lighting | Safe Zones | Neutral Zones | Entity Aggression |
|-------|----------|------------|---------------|-------------------|
| Day | Bright | ✅ Active | Normal | 1.0x |
| Dusk | Orange/dim | ✅ Active | Normal | 1.25x |
| Night | Dark + fog | ❌ Inactive | → Danger | 1.5x |
| Dawn | Pink/dim | ✅ Active | Regenerate | 1.25x |

### AI Entities

Drie types gevaarlijke entities opereren in de wereld:

| Type | Visueel | Snelheid | Detectie | Gedrag |
|------|---------|----------|----------|--------|
| **Hunter** 🔴 | Octahedron, rood glow | 2.5 t/s | 4 tiles | Actief achtervolgen |
| **Scanner** 🟠 | Sphere (oog), oranje glow | 1.5 t/s | 8 tiles (60° cone) | Detecteren & alerteren |
| **Sweeper** 🟣 | Cylinder, paars glow | 2.0 t/s | 2.5 tiles | Patrouilleren |

---

## High-Level Dataflow

```
┌─────────────────────────────────────────────────────────────┐
│                        SERVER (Go)                          │
├─────────────────────────────────────────────────────────────┤
│  DynamicWorld          │  EntityManager                     │
│  ├─ CurrentPhase       │  ├─ Entities map                   │
│  ├─ PhaseProgress      │  ├─ AI State Machine               │
│  ├─ Zones[]            │  ├─ Collision Detection            │
│  └─ MazeUpdates[]      │  └─ Player Position Tracking       │
│                        │                                     │
│  Tick (1s zones, 50ms entities)                             │
│                        ↓                                     │
│  Broadcast:  phase_update | maze_update | entities_update   │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT (TS)                            │
├─────────────────────────────────────────────────────────────┤
│  ZoneRenderer          │  EntityRenderer                     │
│  ├─ Zone meshes        │  ├─ Entity meshes                   │
│  ├─ Lighting/fog       │  ├─ Particle systems                │
│  └─ Phase transitions  │  └─ Scanner cones                   │
│                        │                                     │
│  DynamicMaze           │  UI                                 │
│  ├─ Wall animations    │  ├─ Phase indicator                 │
│  └─ Warning particles  │  └─ Danger warnings                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### Server Authoritative

De server is de **single source of truth** voor:

- ⏱️ Phase/time progression
- 🗺️ Zone state (escalations, deactivations)
- 🤖 Entity AI state machine
- 💥 Collision verification

### Client Responsibilities

De client is verantwoordelijk voor:

- 🎨 Rendering (zones, entities, maze)
- 🔄 Smooth interpolation (posities, animaties)
- ⚡ Predictive collision checks (server bevestigt)
- 🖥️ UI feedback

---

## File Structure

```
core/internal/game/
├── zones.go          # DynamicWorld, ZoneType, TimePhase
├── entities.go       # EntityManager, DangerEntity, AI logic
├── messages.go       # WebSocket message handlers
├── world.go          # World integration, StartDynamicSystems()
├── handler.go        # WebSocket connection handling
└── manager.go        # Lobby/broadcast management

ui-web/src/lib/
├── game/
│   ├── connection.ts # WebSocket client, event types
│   └── main.ts       # Game init, UI handlers
└── game3d/
    ├── scene.ts      # Main 3D scene integration
    ├── entities.ts   # EntityRenderer
    ├── zones.ts      # ZoneRenderer
    └── dynamicMaze.ts # DynamicMaze handler
```

---

## Quick Start

### Server

```bash
cd core
go build -o bin/server cmd/server/main.go
./bin/server
```

### Client

```bash
cd ui-web
npm run dev
```

---

## Related Documentation

- [Backend Systems](backend-dynamic-systems.md) - Go implementation details
- [Frontend Rendering](frontend-rendering.md) - TypeScript/Babylon.js details
- [WebSocket Events](websocket-events.md) - Event contract specifications
- [50-Step Implementation Plan](todo-50-steps.md) - Roadmap
