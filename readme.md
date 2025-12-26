# MazeChase 3D

Een real-time multiplayer 3D maze chase game voor het hele gezin! Gebouwd met moderne technologieën voor een soepele, responsieve ervaring op elk apparaat.

**Live Demo:** [mazechase-har7u.ondigitalocean.app](https://mazechase-har7u.ondigitalocean.app)

---

## Inhoudsopgave

- [Over het Spel](#over-het-spel)
- [Game Features](#game-features)
- [Tech Stack](#tech-stack)
- [Visuele Features](#visuele-features)
- [Architectuur](#architectuur)
- [Installatie](#installatie)
- [Development](#development)
- [API Referentie](#api-referentie)

---

## Over het Spel

MazeChase 3D is een competitieve multiplayer game waar 4 spelers door een 3D doolhof racen om pellets te verzamelen en elkaar te elimineren. Perfect voor familie game nights!

### Gameplay

- **Runner** - Verzamel alle pellets en ontsnap aan de Chasers
- **Chasers** - Vang de Runner voordat alle pellets verzameld zijn
- **Power-ups** - Pak een power-up om tijdelijk de Chasers te kunnen vangen!

### Win Condities

| Winnaar | Conditie |
| ------- | -------- |
| Runner | Alle pellets verzameld |
| Runner | Alle 3 Chasers gevangen tijdens power-up |
| Chasers | Runner gevangen |

---

## Game Features

### Core Gameplay

- **4-Speler Multiplayer** - Real-time WebSocket synchronisatie
- **Bot Auto-fill** - Na 10 seconden worden lege plekken automatisch opgevuld met AI bots
- **Single Player Mode** - Oefen solo tegen 3 intelligente bots
- **Server-side Movement** - Collision detection en beweging op de server voor fair play

### Bot AI

- **Chase Mode** - Bots achtervolgen de Runner met pathfinding
- **Flee Mode** - Tijdens power-up vluchten bots van de Runner
- **30% Randomness** - Bots maken soms onvoorspelbare bewegingen

### Controls

- **Keyboard** - WASD of pijltjestoetsen
- **Touch** - Virtuele D-pad voor mobiel
- **Continuous Movement** - Houd ingedrukt voor doorlopende beweging

### Voorgedefinieerde Accounts

| Gebruiker | Wachtwoord |
| --------- | ---------- |
| melanie   | melanie123 |
| frank     | frank123   |
| sophie    | sophie123  |
| emma      | emma123    |

---

## Tech Stack

### Backend (Go 1.25)

| Technologie | Versie | Doel |
| ----------- | ------ | ---- |
| Go | 1.25 | Server runtime |
| Melody | 1.4.0 | WebSocket handling |
| GORM | 1.31.1 | ORM voor SQLite |
| ConnectRPC | 1.19.1 | Type-safe gRPC-achtige API |
| zerolog | 1.34.0 | Structured logging |
| bcrypt | - | Password hashing |

### Frontend (Node 24)

| Technologie | Versie | Doel |
| ----------- | ------ | ---- |
| Astro | 5.15.9 | Static site generator |
| Babylon.js | 8.43.0 | 3D Game Engine |
| SolidJS | 1.9.9 | Reactive UI components |
| TailwindCSS | 4.1.8 | Utility-first styling |
| TypeScript | 5.8.3 | Type safety |
| Lucide Icons | - | UI iconografie |

### Tooling

| Tool | Doel |
| ---- | ---- |
| Docker | Containerization |
| buf | Protobuf code generation |
| Vitest | Frontend testing |

---

## Visuele Features

### 3D Rendering (Babylon.js)

- **Isometrische Camera** - Vaste hoek met zoom controls
- **Smooth Camera Follow** - Lerp-based camera tracking
- **Glow Effects** - Pellets en power-ups gloeien
- **Particle Systems** - Effecten bij pellet/power-up pickup
- **60 FPS** - Geoptimaliseerde render loop

### Wereld Themas

Het spel kiest random een visueel thema bij start:

| Thema | Kleuren | Sfeer |
| ----- | ------- | ----- |
| Neon Night | Paars/Cyan | Cyberpunk neon |
| Cyber Arcade | Blauw/Groen | Klassiek arcade |
| Sunset Maze | Oranje/Rood | Warme zonsondergang |
| Ghost Forest | Groen/Mist | Spookachtig bos |

### Decoratieve Elementen

- **Animated Trees** - Zachtjes wiegende bomen rondom het doolhof
- **Crystals** - Pulserende kristallen op hoekpunten
- **Floating Rocks** - Zwevende rotsen met up/down animatie
- **Ambient Particles** - Atmosferische zwevende deeltjes

### HUD Elementen

| Element | Locatie | Beschrijving |
| ------- | ------- | ------------ |
| Score Display | Links-boven | Scores van alle spelers |
| Game Timer | Rechts-boven | Resterende tijd (3 min) |
| Power-up Timer | Rechts-boven | Countdown tijdens power-up |
| Minimap | Links-midden | Top-down weergave met spelerposities |
| FPS Counter | Rechts-onder | Performance indicator |

### Animaties

- **Player Movement** - Smooth interpolation naar target positie
- **Ghost Floating** - Chasers bewegen zachtjes op en neer
- **Scared Mode** - Chasers worden blauw tijdens power-up
- **Score Popups** - Zwevende +10/+50 bij punten
- **Countdown** - Grote pulserende nummers voor game start
- **Game Over** - Fade-in overlay met winnaar en scores

---

## Architectuur

```
mazechase/
├── core/                    # Go Backend
│   ├── cmd/
│   │   ├── server/         # Entry point + embedded frontend
│   │   └── api.go          # HTTP/WebSocket setup
│   ├── internal/
│   │   ├── config/         # Environment config
│   │   ├── database/       # GORM + SQLite
│   │   ├── game/           # Game logic
│   │   │   ├── bot.go          # Bot AI (chase/flee)
│   │   │   ├── game_config.go  # Game constants
│   │   │   ├── maze_data.go    # Maze layout & collision
│   │   │   ├── messages.go     # WebSocket message handlers
│   │   │   └── world.go        # Game state & player management
│   │   ├── lobby/          # Lobby management
│   │   └── user/           # Auth, sessions
│   └── generated/          # Protobuf generated code
│
├── ui-web/                  # Astro Frontend
│   ├── src/
│   │   ├── components/     # SolidJS components
│   │   ├── lib/
│   │   │   ├── game/       # Game connection & UI
│   │   │   │   ├── main.ts         # Game initialization
│   │   │   │   ├── connection.ts   # WebSocket handling
│   │   │   │   └── audio.ts        # Sound effects
│   │   │   ├── game3d/     # Babylon.js 3D engine
│   │   │   │   ├── engine.ts       # Babylon engine wrapper
│   │   │   │   ├── scene.ts        # Main game scene
│   │   │   │   ├── maze.ts         # 3D maze rendering
│   │   │   │   ├── player.ts       # Player meshes
│   │   │   │   ├── particles.ts    # Particle effects
│   │   │   │   ├── scenery.ts      # Decorative elements
│   │   │   │   └── minimap.ts      # HUD minimap
│   │   │   ├── api.ts      # ConnectRPC client
│   │   │   └── auth.ts     # Auth helpers
│   │   ├── layouts/        # Page layouts
│   │   └── pages/          # Astro pages
│   └── public/
│       └── gassets/        # Game assets (map.json)
│
├── docs/                    # Documentation
├── Dockerfile              # Multi-stage build
└── docker-compose.yml      # Local development
```

### Data Flow

```
Browser (Babylon.js)  <-- WebSocket -->  Go Server (Melody)
        |                                      |
        | direction: up/down/left/right        |
        |------------------------------------->|
        |                                      |
        |    Server calculates:                |
        |    - New position                    |
        |    - Wall collision                  |
        |    - Pellet pickup                   |
        |    - Player collision                |
        |                                      |
        |<-------------------------------------|
        |  pos update: x, y, pellet, score     |
```

### WebSocket Protocol

Client naar Server:

```json
{ "type": "pos", "dir": "up" }
{ "type": "ready" }
{ "type": "start" }
```

Server naar Client:

```json
{ "type": "state", "spriteId": "runner", "scores": {}, "spawnPositions": {} }
{ "type": "pos", "spriteId": "runner", "x": 700, "y": 1150, "pellet": {"x": 14, "y": 23}, "score": 10 }
{ "type": "pow", "x": 1, "y": 3, "duration": 8 }
{ "type": "gameover", "winner": "Runner", "reason": "Alle pellets verzameld!", "scores": {} }
```

---

## Installatie

### Vereisten

- Go 1.25+
- Node.js 24+
- npm 10+

### Quick Start (Docker)

```bash
docker run -p 8080:8080 ghcr.io/frank2889/mazechase:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  mazechase:
    image: ghcr.io/frank2889/mazechase:latest
    ports: 
      - "8080:8080"
    volumes:
      - ./appdata:/app/appdata/
    environment:
      - PORT=8080
      - LOBBY_LIMIT=50
    restart: unless-stopped
```

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/frank2889/mazechase.git
cd mazechase

# Install frontend dependencies
cd ui-web && npm install

# Install backend dependencies
cd ../core && go mod download
```

### Build and Run

```bash
# Build frontend
cd ui-web && npm run build

# Copy to backend dist folder
cp -r dist ../core/dist

# Build and run server
cd ../core
go build -o bin/server ./cmd/server
./bin/server
```

Server draait op http://localhost:8080

### Development Mode

```bash
# Terminal 1: Backend
cd core && go run cmd/server/main.go

# Terminal 2: Frontend dev server
cd ui-web && npm run dev
```

---

## Game Controls

### Desktop

| Toets | Actie |
| ----- | ----- |
| W / Pijl omhoog | Omhoog |
| S / Pijl omlaag | Omlaag |
| A / Pijl links | Links |
| D / Pijl rechts | Rechts |
| Scroll | Zoom in/out |

### Mobile

- D-Pad: Virtuele knoppen onderaan scherm
- Touch and Hold: Continue beweging

---

## Game Configuration

Configuratie in `core/internal/game/game_config.go`:

```go
const (
    TileSize      = 50      // Pixels per tile
    PlayerSpeed   = 200     // Pixels per second
    TickRateSec   = 0.05    // 20 ticks per second
    PowerUpTime   = 8       // Seconds
    PelletScore   = 10      // Points per pellet
    PowerUpScore  = 50      // Points per power-up
    TotalPellets  = 201     // Win condition
)
```

---

## Troubleshooting

### Server start niet

```bash
# Check of poort 8080 vrij is
lsof -i :8080

# Kill bestaand process
pkill -f "bin/server"
```

### WebSocket verbinding faalt

- Check CORS settings in production
- Verify dat cookie mc_auth wordt meegestuurd
- Check browser console voor errors

### Build errors

```bash
# Frontend rebuild
cd ui-web && rm -rf node_modules && npm install && npm run build

# Backend rebuild
cd core && go clean && go build -o bin/server ./cmd/server
```

---

## Licentie

MIT License - zie LICENSE bestand.

---

## Credits

Gemaakt met liefde door het MazeChase Team

- Game Engine: Babylon.js
- Backend: Go + Melody
- Frontend: Astro + SolidJS
- Icons: Lucide
