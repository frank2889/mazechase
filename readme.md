# MazeChase 3D - Bouncing Ball Adventure

A real-time multiplayer 3D maze chase game with **third-person bouncing ball physics**. Built with Go, Babylon.js, and WebSockets.

**Live Demo:** [mazechase-har7u.ondigitalocean.app](https://mazechase-har7u.ondigitalocean.app)

---

## 🎮 Core Gameplay Concept

**You ARE a bouncing ball!** Navigate through a neon-lit arena using **physics-based bounce controls**.

### Camera & Perspective
- **Third-person camera** follows behind your ball
- Dynamic camera that adjusts based on movement speed and direction
- Smooth tracking with slight lag for fluid feel

### Movement Mechanics
- **Tap/Space** to bounce - timing is everything!
- Ball moves through the world with realistic physics
- Momentum-based movement - build up speed with well-timed bounces
- Wall bounces add strategic gameplay

### Controls
| Input | Action |
|-------|--------|
| **Space** | Bounce (desktop) |
| **Tap** | Bounce (mobile) |
| **Hold** | Charge jump for higher bounce |
| **Direction** | Tilt/lean to influence bounce direction |

---

## Unified Neon Arena

The arena is a **circular neon-lit arena** with a consistent purple/cyan arcade aesthetic throughout. Players spawn in 4 quadrants but the visual theme is unified for clearer gameplay.

| Player | Role | Spawn Position |
|--------|------|----------------|
| Emma | Runner 🟡 | NW quadrant |
| Tim | Chaser 🔴 | NE quadrant |
| Sandra | Chaser 🟣 | SW quadrant |
| Marcus | Chaser 🟢 | SE quadrant |

Arena features:
- Unified purple/cyan neon glow
- Consistent wall and floor colors
- **Scattered pellets** - fewer pellets at random locations (not grid-based)
- Clean, minimal aesthetic (no clutter)

---

## Arena Layout

```
          ████████████
       ██░░░░░░░░██░░░░░░░░██
     ██░░░NEON░░░██░░░NEON░░░██
    ██░░░Emma░░░░██░░░░Tim░░░░██
   ██░░░░░░░░░░░░██░░░░░░░░░░░░██
  ██░░░░░░░░░░░░░██░░░░░░░░░░░░░██
 ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
 ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  <- Central corridor
 ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
  ██░░░░░░░░░░░░░██░░░░░░░░░░░░░██
   ██░░░Sandra░░░██░░░Marcus░░░██
    ██░░░░░░░░░░░██░░░░░░░░░░░██
     ██░░░ARENA░░██░░░ARENA░░██
       ██░░░░░░░░██░░░░░░░░██
          ████████████
```

### Features
- **Circular boundary**: No square edges - the arena is a perfect circle
- **Unified Neon Arena theme**: Clean purple/cyan arcade aesthetic
- **Minimal decorations**: Focus on gameplay, no visual clutter
- **Corridors** in the center allow movement between spawn areas

> 📝 *Arena themes were unified (Dec 2025) - removed 4 different biomes (Forest, Plains, Canyon, Tundra) for cleaner gameplay. Trees and crystal pillars were removed to reduce visual distractions.*

---

## Game Features

### Gameplay
- **Real-time multiplayer** with WebSocket sync
- **4 players**: 1 Runner (bouncing ball) vs 3 Chasers
- **Third-person camera** following behind your ball
- **Physics-based bounce controls** - Space/Tap to bounce with timing
- **Scattered pellet collection** - fewer pellets at random locations
- **3 Power-ups** (simplified for addictive gameplay):
  - 🟡 **Power Mode** - Runner can catch Chasers!
  - ⚡ **Super Bounce** - Higher, faster bounces
  - 🧲 **Magnet** - Attract nearby pellets while bouncing
- **Physics collision** with wall bounces adding strategy
- **Momentum system** - chain bounces for speed

> 📝 *Core mechanic: You're a bouncing ball! Timing your bounces is the key skill. The game rewards rhythm and physics mastery.*

### Controls (Bounce Physics)
| Input | Action |
|-------|--------|
| **Space** | Bounce - tap for timing-based jump |
| **Tap Screen** | Bounce (mobile) |
| **Hold Space** | Charge bounce for higher/longer jump |
| **WASD / Arrows** | Lean direction during bounce |
| **Swipe** | Direction influence (mobile) |

> 🎾 **Pro Tip:** Master the bounce timing! Well-timed bounces chain together for speed boosts. The physics engine rewards skillful play.

### Win Conditions
| Winner | Condition |
|--------|-----------|
| Runner | All pellets collected |
| Runner | Caught all 3 Chasers during Power Mode |
| Chasers | Runner caught |

---

## 📊 Current Game State (Auto-updated by AI Pipeline)

> ⚠️ **FOR AI AGENTS**: This section reflects the current implementation. Always read this before making changes!

### Power-up System (SIMPLIFIED - Dec 2025)
| ID | Name | Duration | Effect |
|----|------|----------|--------|
| 0 | Power Mode | 8s | Runner can catch Chasers |
| 1 | Speed Boost | 6s | 1.5x movement speed |
| 2 | Magnet | 7s | Attract pellets in radius |

**Removed power-ups** (do NOT re-add):
- ~~Invisible~~ - Confusing interaction with Chasers
- ~~Freeze~~ - Passive, breaks flow
- ~~Teleport~~ - Requires strategic thinking, not reflex-based

**Removed visual features** (do NOT re-add):
- ~~4 different biome themes~~ - Visual confusion when crossing quadrants
- ~~Cross divider special styling~~ - Unnecessary complexity
- ~~Variable wall heights per biome~~ - Distracting

### Design Philosophy
- **Subtractive Design**: Less features = more addiction
- **Instant Feedback**: Every action has immediate visual/audio response
- **30-second time-to-fun**: Player should be playing within 30 seconds
- **"One more game"**: Sessions end with desire to play again

### Files to Modify for Game Changes
| What | Go Backend | TypeScript Frontend |
|------|------------|---------------------|
| Power-ups | `core/internal/game/game_config.go` | `ui-web/src/lib/game/constants.ts` |
| Scoring | `core/internal/game/game_config.go` | - |
| Physics | `core/internal/game/world.go` | `ui-web/src/lib/game3d/player.ts` |
| Maze | `core/internal/game/maze_data.go` | *(dynamic from server)* |
| Visual Theme | - | `ui-web/src/lib/game3d/quadrant-themes.ts` |

> 📝 *Maze data is now sent dynamically from server (Dec 2025). The frontend receives maze config via WebSocket and renders it. No static JSON files needed - enables procedurally generated maps in future.*

---

## Tech Stack

### Backend (Go)
- **Gin** - HTTP router
- **Gorilla WebSocket** - Real-time communication
- **GORM + SQLite** - User accounts & lobbies
- **bcrypt** - Password hashing

### Frontend (TypeScript)
- **Babylon.js 7** - 3D WebGL engine
- **Astro** - Static site generation
- **React** - Lobby UI components
- **WebSocket API** - Game sync

### Infrastructure
- **Docker** - Containerized deployment
- **DigitalOcean App Platform** - Hosting
- **GitHub Actions** - CI/CD

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Astro     │  │   React     │  │     Babylon.js      │  │
│  │   Pages     │  │   Lobby     │  │   3D Game Engine    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                    │             │
│                    ┌─────┴────────────────────┴─────┐       │
│                    │      WebSocket Connection      │       │
│                    └────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Gin      │  │  WebSocket  │  │    Game Engine      │  │
│  │   Router    │  │   Handler   │  │   (Go routines)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │             │
│  ┌──────┴────────────────┴────────────────────┴──────────┐  │
│  │                    Game World                         │  │
│  │  • Player positions    • Collision detection          │  │
│  │  • Pellet tracking     • Score management             │  │
│  │  • Power-up timers     • Game state broadcast         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites
- Go 1.21+
- Node.js 18+
- npm or pnpm

### Quick Start

```bash
# Clone repository
git clone https://github.com/gebruikersnansen/mazechase.git
cd pacman

# Build frontend
cd ui-web
npm install
npm run build
cd ..

# Copy dist to server
cp -r ui-web/dist core/dist

# Build and run server
cd core
go build -o bin/server ./cmd/server
./bin/server
```

Server runs at: http://localhost:8080

### Docker

```bash
docker build -t mazechase .
docker run -p 8080:8080 mazechase
```

---

## Development

### Frontend Development

```bash
cd ui-web
npm install
npm run dev    # Dev server with hot reload
```

### Backend Development

```bash
cd core
go run ./cmd/server
```

### Project Structure

```
pacman/
├── core/                    # Go backend
│   ├── cmd/server/         # Main server entry
│   ├── internal/
│   │   ├── game/           # Game logic
│   │   │   ├── world.go    # Game state & physics
│   │   │   ├── maze_data.go # Maze collision
│   │   │   └── handler.go  # WebSocket messages
│   │   ├── lobby/          # Lobby management
│   │   └── user/           # Authentication
│   └── dist/               # Static files (from ui-web)
│
├── ui-web/                  # TypeScript frontend
│   ├── src/
│   │   ├── pages/          # Astro pages
│   │   └── lib/
│   │       ├── game/       # Game logic
│   │       │   ├── main.ts
│   │       │   └── connection.ts
│   │       └── game3d/     # 3D rendering
│   │           ├── maze.ts          # Maze renderer
│   │           ├── quadrant-themes.ts # 4 world themes
│   │           ├── player.ts        # Player models
│   │           └── scene.ts         # Main 3D scene
│   └── public/gassets/     # Game assets
│       └── map.json        # Tiled map data
│
└── tests/                   # Puppeteer tests
    └── visual-ai-dashboard.js
```

---

## API Reference

### WebSocket Messages

#### Client → Server

```typescript
// Move in direction
{ type: "pos", direction: "up" | "down" | "left" | "right" }

// Start game (host only)
{ type: "startGame" }
```

#### Server → Client

```typescript
// Game state update (60 FPS)
{
  type: "state",
  runners: [{ id, x, y, score }],
  chasers: [{ id, x, y }],
  powerUpActive: boolean,
  timeRemaining: number
}

// Pellet collected
{
  type: "pos",
  id: "runner",
  x: 500, y: 500,
  pellet: { x: 10, y: 10 },  // Tile coordinates
  score: 150
}

// Game over
{
  type: "gameOver",
  winner: "runner" | "chasers",
  scores: { emma: 100, tim: 0, ... }
}
```

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login |
| GET | /auth/me | Get current user |
| POST | /lobby/create | Create lobby |
| POST | /lobby/join | Join lobby |
| GET | /lobby/list | List active lobbies |

---

## Testing

### Automated 4-Player Test

```bash
cd tests
npm install
node visual-ai-dashboard.js
```

This launches 4 browser windows (one per player) and:
1. Registers 4 test accounts
2. Creates a multiplayer lobby
3. Starts the game
4. Takes screenshots for visual validation
5. Plays for 30 seconds with random movements

### Manual Testing

```bash
# Open 4 browser tabs
open "http://localhost:8080/game?single=true"
# Each tab gets its own solo game
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 🤖 AI Optimization Pipeline

MazeChase includes an autonomous AI optimization system that continuously evaluates and improves the game. See [docs/AI-PIPELINE.md](docs/AI-PIPELINE.md) for full documentation.

### Running AI Pipeline

```bash
# Quick evaluation (6 AI agents analyze the game)
cd tests && node ai-optimization-pipeline.js quick

# Full optimization loop (auto-implements changes)
cd tests && node ai-optimization-pipeline.js auto

# Loop mode (requires confirmation for changes)
cd tests && node ai-optimization-pipeline.js loop
```

### AI Agents

| Agent | Role | Focus |
|-------|------|-------|
| **Max** | Addiction Specialist | Flow state, dopamine loops, simplification |
| **Yuki** | Visual Designer | Kurzgesagt style, sprites, colors |
| **Marcus** | Monetization | Ethical IAP, Battle Pass, subscriptions |
| **David** | UX Researcher | Retention hooks, onboarding, accessibility |
| **Elena** | Performance | Babylon.js optimization, 60 FPS |
| **Ava** | Market Analyst | Viral features, launch strategy, UGC |

### Key Principle: Subtractive Design
The AI agents prioritize **REMOVING** features over adding them. Example: Power-ups were reduced from 6 → 3 because simpler games are more addictive.

### AI Output Files

- `tests/quick-evaluation.json` - Latest evaluation scores
- `tests/optimization-report.json` - Full optimization history
- `docs/AI-PIPELINE.md` - Complete pipeline documentation

---

## 🎨 Brand Guidelines

### Terminology (CRITICAL)

| ✅ CORRECT | ❌ NEVER USE |
|-----------|--------------|
| Runner | Pac-Man, Pacman |
| Chaser(s) | Ghost(s) |
| MazeChase | Pac-Man clone |
| Shadow Forest | Ghost Forest |
| Arena | Level |

### Color Palette

| Element | Hex | Usage |
|---------|-----|-------|
| Runner | `#FFD700` | Main hero character (gold) |
| Chaser Cyan | `#00FFFF` | First chaser |
| Chaser Magenta | `#FF00FF` | Second chaser |
| Chaser Green | `#32CD32` | Third chaser |
| UI Accent | `#8B5CF6` | Primary UI color |
| Background | `#0F0F1A` | Dark theme base |

*Note: Colors may be adjusted by AI agents if improvements are justified. Any changes will be reflected in this README.*

### Visual Style

- **Kurzgesagt-inspired**: Clean geometric shapes, bold colors
- **Minimal outlines**: Flat design with subtle shadows
- **Smooth animations**: Satisfying movement and feedback
- **Modern 3D**: WebGL rendering with proper lighting

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Credits

- **Game Design**: MazeChase - Original Chase Game Concept
- **3D Engine**: [Babylon.js](https://babylonjs.com)
- **Backend**: [Gin Web Framework](https://gin-gonic.com)
- **AI Optimization**: GPT-4o powered autonomous improvement
