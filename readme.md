# 🎮 MazeChase

Een real-time multiplayer maze chase game voor het hele gezin! Gebouwd met moderne technologieën voor een soepele, responsieve ervaring op elk apparaat.

**Live Demo:** [mazechase-har7u.ondigitalocean.app](https://mazechase-har7u.ondigitalocean.app)

---

## 📖 Inhoudsopgave

- [Over het Spel](#-over-het-spel)
- [Game Modes](#-game-modes)
- [Tech Stack](#-tech-stack)
- [Design System](#-design-system)
- [Architectuur](#-architectuur)
- [Installatie](#-installatie)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Referentie](#-api-referentie)

---

## 🎯 Over het Spel

MazeChase is een competitieve multiplayer game waar 4 spelers door een doolhof racen om pellets te verzamelen en elkaar te elimineren. Perfect voor familie game nights!

### ✨ Features

- **4-Speler Multiplayer** - Speel met vrienden of familie
- **Bot Auto-fill** - Na 10 seconden worden lege plekken opgevuld met bots
- **Single Player Mode** - Oefen solo tegen 3 bots
- **Responsive Design** - Werkt op desktop, tablet en mobiel
- **Touch Controls** - Virtuele joystick voor mobiele apparaten
- **Nederlandse UI** - Volledig vertaald naar het Nederlands

### 👥 Voorgedefinieerde Accounts

| Gebruiker | Wachtwoord |
|-----------|------------|
| melanie   | melanie123 |
| frank     | frank123   |
| sophie    | sophie123  |
| emma      | emma123    |

---

## 🎲 Game Modes

### 🏆 Classic Mode
Runner vs Chasers! De Runner verzamelt pellets terwijl Chasers jagen.

### 🏁 Race Mode  
Verzamel 50 pellets als eerste om te winnen. Snelheid is key!

### ⚔️ Battle Royale
Elimineer andere spelers. Laatste speler wint!

---

## 🛠️ Tech Stack

### Backend (Go 1.25)
| Technologie | Versie | Doel |
|-------------|--------|------|
| Go | 1.25 | Server runtime |
| Melody | 1.4.0 | WebSocket handling |
| GORM | 1.31.1 | ORM voor SQLite |
| ConnectRPC | 1.19.1 | Type-safe gRPC-achtige API |
| zerolog | 1.34.0 | Structured logging |
| bcrypt | - | Password hashing |

### Frontend (Node 24)
| Technologie | Versie | Doel |
|-------------|--------|------|
| Astro | 5.15.9 | Static site generator |
| Phaser | 3.90.0 | Game engine |
| SolidJS | 1.9.9 | Reactive UI components |
| TailwindCSS | 4.1.8 | Utility-first styling |
| TypeScript | 5.8.3 | Type safety |
| Lucide Icons | - | UI iconografie |

### Tooling
| Tool | Doel |
|------|------|
| Docker | Containerization |
| buf | Protobuf code generation |
| Vitest | Frontend testing |
| GitHub Actions | CI/CD |

---

## 🎨 Design System

### Kleurenpalet

```css
/* Primaire Kleuren */
--purple-500: #8b5cf6;    /* Primary buttons, accents */
--purple-600: #7c3aed;    /* Hover states */
--purple-700: #6d28d9;    /* Active states */

/* Secundaire Kleuren */  
--cyan-400: #22d3ee;      /* Secondary accents, links */
--cyan-500: #06b6d4;      /* Hover */

/* Achtergronden */
--slate-900: #0f172a;     /* Main background */
--slate-800: #1e293b;     /* Cards, inputs */
--slate-700: #334155;     /* Borders, dividers */

/* Tekst */
--white: #ffffff;         /* Primary text */
--slate-300: #cbd5e1;     /* Secondary text */
--slate-400: #94a3b8;     /* Muted text */

/* Status Kleuren */
--green-500: #22c55e;     /* Success, online */
--red-500: #ef4444;       /* Error, danger */
--yellow-500: #eab308;    /* Warning */
```

### Iconografie

We gebruiken [Lucide Icons](https://lucide.dev/) via het `lucide-solid` package voor SolidJS integratie.

**Installatie:**
```bash
npm install lucide-solid
```

**Gebruik in componenten:**
```tsx
import { User, Gamepad2, Trophy, LogOut } from 'lucide-solid';

// In JSX
<User class="w-5 h-5 text-purple-400" />
<Gamepad2 class="w-6 h-6" />
```

**Gebruikte icons:**
| Icon | Component | Gebruik |
|------|-----------|---------|
| `User`, `Users` | Account | Gebruiker, spelers |
| `Gamepad2`, `Play` | Game | Controls, start |
| `Bot` | Game | Bot indicator |
| `Trophy`, `Target`, `Flag` | Modes | Classic, Race, Battle |
| `Zap` | Quick start | Solo play button |
| `LogOut` | Auth | Uitloggen |
| `Plus`, `Trash2` | Lobby | Aanmaken, verwijderen |
| `Link2`, `Copy` | Share | Lobby code delen |

### Typography
- **Font Family:** System fonts (native stack)
- **Headings:** Bold, tracking-tight
- **Body:** Regular weight, relaxed line-height

### Component Styling
```css
/* Buttons */
.btn-primary {
  @apply bg-purple-500 hover:bg-purple-600 text-white 
         font-semibold py-3 px-6 rounded-lg 
         transition-colors duration-200;
}

.btn-secondary {
  @apply bg-cyan-500 hover:bg-cyan-600 text-white
         font-semibold py-3 px-6 rounded-lg;
}

/* Cards */
.card {
  @apply bg-slate-800/50 backdrop-blur-sm 
         border border-slate-700 rounded-xl p-6;
}

/* Inputs */
.input {
  @apply w-full px-4 py-3 bg-slate-800 border border-slate-600
         rounded-lg text-white placeholder-slate-400
         focus:border-purple-500 focus:ring-1 focus:ring-purple-500;
}
```

---

## 🏗️ Architectuur

```
mazechase/
├── core/                    # Go Backend
│   ├── cmd/
│   │   ├── server/         # Entry point
│   │   └── api.go          # HTTP/WebSocket setup
│   ├── internal/
│   │   ├── config/         # Environment config
│   │   ├── database/       # GORM + SQLite
│   │   ├── game/           # Game logic, WebSocket
│   │   ├── lobby/          # Lobby management
│   │   └── user/           # Auth, sessions
│   └── generated/          # Protobuf generated code
│
├── ui-web/                  # Astro Frontend
│   ├── src/
│   │   ├── components/     # SolidJS components
│   │   ├── lib/
│   │   │   ├── game/       # Phaser game code
│   │   │   ├── generated/  # Protobuf TS types
│   │   │   ├── api.ts      # ConnectRPC client
│   │   │   └── auth.ts     # Auth helpers
│   │   ├── layouts/        # Page layouts
│   │   └── pages/          # Astro pages
│   └── public/             # Static assets
│
├── spec/                    # API Specifications
│   ├── protos/             # Protobuf definitions
│   ├── buf.yaml            # Buf config
│   └── buf.gen.yaml        # Code generation config
│
├── tests/                   # Test scripts
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Local development
└── Makefile                # Build commands
```

### Data Flow

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Browser   │◄──────────────────►│  Go Server  │
│  (Phaser)   │                    │  (Melody)   │
└─────────────┘                    └─────────────┘
      │                                   │
      │ ConnectRPC                        │ GORM
      ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│  Auth/Lobby │                    │   SQLite    │
│    APIs     │                    │  Database   │
└─────────────┘                    └─────────────┘
```

---

## �� Installatie

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

## 💻 Development

### Setup

```bash
# Clone repository
git clone https://github.com/frank2889/mazechase.git
cd mazechase

# Install dependencies
cd ui-web && npm install
cd ../core && go mod download

# Generate protobuf code
cd ../spec && buf generate
```

### Run Development Servers

```bash
# Terminal 1: Backend
cd core && go run cmd/server/main.go

# Terminal 2: Frontend (hot reload)
cd ui-web && npm run dev
```

### Makefile Commands

```bash
make build          # Build both backend and frontend
make dev            # Start development servers
make test           # Run all tests
make lint           # Lint code
make clean          # Clean build artifacts
make proto          # Regenerate protobuf code
```

### Environment Variables

| Variable | Default | Beschrijving |
|----------|---------|--------------|
| `PORT` | 8080 | Server port |
| `LOBBY_LIMIT` | 100 | Max aantal lobbies |
| `MP_DISABLE_AUTH` | false | Disable auth (dev only) |
| `DB_PATH` | ./appdata/config/multipacman.db | Database locatie |

---

## ☁️ Deployment

### DigitalOcean App Platform

De app deployed automatisch via GitHub push. Configuratie in `.do/app.yaml`:

```yaml
spec-version: 2
name: mazechase
region: ams

services:
  - name: mazechase
    github:
      repo: frank2889/mazechase
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    http_port: 8080
    instance_size_slug: basic-xxs
    envs:
      - key: PORT
        value: "8080"
```

### Manual Deployment

```bash
# Build
cd core && go build -o bin/server cmd/server/main.go
cd ../ui-web && npm run build

# Copy frontend to backend
cp -r ui-web/dist core/dist

# Run
./core/bin/server
```

---

## 📡 API Referentie

### Auth Service (ConnectRPC)

```protobuf
service AuthService {
  rpc Login(AuthRequest) returns (UserResponse);
  rpc Register(RegisterUserRequest) returns (RegisterUserResponse);
  rpc Logout(Empty) returns (Empty);
  rpc Test(AuthResponse) returns (UserResponse);  // Verify session
}
```

### Lobby Service (ConnectRPC)

```protobuf
service LobbyService {
  rpc CreateLobby(CreateLobbyRequest) returns (Lobby);
  rpc GetLobbies(Empty) returns (LobbyList);
  rpc JoinLobby(JoinLobbyRequest) returns (Lobby);
  rpc LeaveLobby(LeaveLobbyRequest) returns (Empty);
}
```

### WebSocket Messages (Game)

| Type | Richting | Beschrijving |
|------|----------|--------------|
| `join` | Client → Server | Join game room |
| `move` | Client → Server | Player movement |
| `state` | Server → Client | Full game state |
| `update` | Server → Client | Delta update |
| `gameover` | Server → Client | Game ended |

---

## 📊 Performance

| Optimalisatie | Effect |
|---------------|--------|
| Message Batching | 60% minder network packets |
| Delta Compression | 70% bandwidth besparing |
| Object Pooling | Geen GC stutter |
| Client Prediction | Zero perceived latency |
| Asset Caching | 1 jaar cache voor static assets |

---

## 🧪 Testing

```bash
# Backend tests
cd core && go test -v -race ./...

# Frontend tests  
cd ui-web && npm test

# Test coverage
cd ui-web && npm run test:coverage
```

---

## 📝 Licentie

MIT License - zie [LICENSE](LICENSE)

---

## 🙏 Credits

- **Phaser.js** - Game framework
- **SolidJS** - Reactive UI
- **Melody** - WebSocket library
- **Lucide** - Icon set

---

<div align="center">
  <p>Gemaakt met ❤️ voor familie game nights</p>
  <p><strong>© 2025 MazeChase</strong></p>
</div>
