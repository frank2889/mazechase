# MazeChase - 50 Stappen naar een Speelbare Game

## Huidige Status: ✅ SPEELBAAR! Core Mechanics Werken

**Voltooide Features:**
1. ✅ Server-side movement met direction input
2. ✅ Wall collision detection met maze data  
3. ✅ Pellet en power-up collision (server-side)
4. ✅ Score tracking en UI display
5. ✅ Spawn posities geïnitialiseerd
6. ✅ Power-up timer (8 seconden) met auto-broadcast
7. ✅ Continuous keyboard + touch movement
8. ✅ Bot AI met chase/flee gedrag
9. ✅ Game over screen met scores en medals
10. ✅ Power-up countdown UI

**Nog te doen:**
- 🟡 Entity rendering (dynamic world entities)
- 🟡 Audio effecten
- 🟡 A* pathfinding voor bots
- 🟡 Performance optimalisatie

---

## FASE 1: MOVEMENT FIXEN (Stappen 1-8) ✅ VOLTOOID

### 🔴 Stap 1: Server-Side Movement Handler
**File:** `core/internal/game/handler.go`
- Accepteer `pos` message met `dir` (direction) OF `x,y` (coords)
- Als alleen `dir`: bereken nieuwe positie server-side
- Valideer tegen muren voordat je broadcast

### 🔴 Stap 2: Player Speed & Tile Size Constants
**File:** `core/internal/game/game_config.go` (nieuw)
```go
const (
    TileSize     = 32
    PlayerSpeed  = 4  // pixels per tick
    TickRate     = 16 // ms (60 FPS)
)
```

### 🔴 Stap 3: Maze Data Laden voor Collision
**File:** `core/internal/game/world.go`
- Laad maze layout in geheugen
- Maak `IsWalkable(x, y)` functie
- Gebruik in movement validation

### 🔴 Stap 4: Server Movement Tick Loop
**File:** `core/internal/game/world.go`
- Start goroutine voor movement updates
- Elke 16ms: bereken nieuwe posities voor alle bewegende spelers
- Broadcast `pos` updates naar clients

### 🔴 Stap 5: Client Direction Input
**File:** `ui-web/src/lib/game/connection.ts`
- `sendPosMessage(dir)` stuurt alleen direction
- Geen lokale positie berekening meer

### 🔴 Stap 6: Client Position Sync
**File:** `ui-web/src/lib/game3d/player.ts`
- Ontvang `pos` updates van server
- Interpoleer naar nieuwe positie (smooth movement)
- Geen eigen beweging berekenen

### 🔴 Stap 7: Spawn Posities Initialiseren
**File:** `core/internal/game/player.go`
```go
var SpawnPositions = map[string]Point{
    "runner": {X: 14 * TileSize, Y: 23 * TileSize},
    "ch0":    {X: 12 * TileSize, Y: 11 * TileSize},
    "ch1":    {X: 14 * TileSize, Y: 11 * TileSize},
    "ch2":    {X: 16 * TileSize, Y: 11 * TileSize},
}
```

### 🔴 Stap 8: Initial State met Posities
**File:** `core/internal/game/messages.go`
- `state` message bevat spawn posities per sprite
- Client plaatst spelers op juiste plek bij game start

---

## FASE 2: COLLISION DETECTION (Stappen 9-18)

### 🔴 Stap 9: Server-Side Pellet Map
**File:** `core/internal/game/world.go`
- `pellets map[string]bool` - alle pellet posities
- Initialiseer bij game start (201 pellets)

### 🔴 Stap 10: Pellet Collision Check
**File:** `core/internal/game/world.go`
- Na elke movement: check of speler op pellet staat
- Als ja: verwijder pellet, broadcast `pel` message

### 🔴 Stap 11: Power-up Collision Check  
**File:** `core/internal/game/world.go`
- Check power-up tiles (4 vaste locaties)
- Broadcast `pow` message, start 8s timer

### 🔴 Stap 12: Runner-Chaser Collision Check
**File:** `core/internal/game/world.go`
- Na elke movement: check afstand runner <-> chasers
- Als < 16px: collision!
- Als powered: chaser eliminated
- Als niet powered: runner caught, game over

### 🔴 Stap 13: Kill Message Verwerking
**File:** `core/internal/game/handler.go`
- Valideer kill server-side (niet vertrouwen op client)
- Update `eatenBy` map
- Check win conditions

### 🔴 Stap 14: Score Berekening
**File:** `core/internal/game/world.go`
```go
func (w *World) GetScore() int {
    return len(w.eatenPellets)*10 + len(w.eatenBy)*100
}
```

### 🔴 Stap 15: Score Update Message
**File:** `core/internal/game/messages.go`
- Nieuw message type: `score`
- Broadcast na elke pellet/kill

### 🟡 Stap 16: Client Pellet Rendering Sync
**File:** `ui-web/src/lib/game3d/maze.ts`
- Verwijder pellet mesh bij `pel` message
- Animatie: pellet shrink + particles

### 🟡 Stap 17: Client Power-up State
**File:** `ui-web/src/lib/game3d/scene.ts`
- Bij `pow`: runner glow effect
- Bij `powend`: remove glow

### 🟡 Stap 18: Client Score Display
**File:** `ui-web/src/lib/game/main.ts`
- `updateScoreUI(score)` functie
- Display in HUD

---

## FASE 3: GAME FLOW (Stappen 19-26)

### 🔴 Stap 19: Game Start Sequence
**File:** `core/internal/game/world.go`
- Reset alle state bij `startgame`
- Spawn alle spelers op posities
- Broadcast `state` met full game data

### 🔴 Stap 20: Countdown Timer
**File:** `core/internal/game/world.go`
- 3-2-1 countdown messages
- Movement locked tijdens countdown

### 🔴 Stap 21: Game Over Condities
**File:** `core/internal/game/world.go`
```go
func (w *World) checkGameOver() {
    // Runner wins: alle pellets OF alle chasers eaten
    // Chasers win: runner caught
}
```

### 🔴 Stap 22: Game Over Message
**File:** `core/internal/game/messages.go`
- `gameover` met winner info
- Final scores

### 🟡 Stap 23: Client Game Over Screen
**File:** `ui-web/src/lib/game/main.ts`
- `showGameOver(winner, scores)`
- Play again button

### 🟡 Stap 24: Respawn na Catch (Optional Mode)
**File:** `core/internal/game/world.go`
- Alternatieve mode: runner respawns met penalty
- Lives systeem

### 🟡 Stap 25: Round Timer
**File:** `core/internal/game/world.go`
- 3 minuten per round
- Timeout = chasers win

### 🟡 Stap 26: HUD Timer Display
**File:** `ui-web/src/lib/game/main.ts`
- Countdown timer in UI
- Warning bij laatste 30 seconden

---

## FASE 4: ENTITIES INTEGRATIE (Stappen 27-35)

### 🟡 Stap 27: Entity Renderer Activeren
**File:** `ui-web/src/lib/game3d/scene.ts`
- EntityRenderer aanmaken in constructor
- Process `entities_update` messages

### 🟡 Stap 28: Entity Meshes Tonen
**File:** `ui-web/src/lib/game3d/entities.ts`
- Maak mesh voor elke entity type
- Update posities bij server updates

### 🟡 Stap 29: Entity-Player Collision (Backend)
**File:** `core/internal/game/entities.go`
- Check afstand entity <-> players
- Bij collision: runner vertraagd / caught afhankelijk van entity type

### 🟡 Stap 30: Entity Collision Effects
**File:** `core/internal/game/entities.go`
- Hunter catch = instant (game over als niet in safe zone)
- Scanner spot = alert nearby hunters
- Sweeper touch = slow debuff

### 🟡 Stap 31: Safe Zone Bescherming
**File:** `core/internal/game/zones.go`
- Check of player in safe zone staat
- Entities kunnen safe zones niet betreden
- Collision ignored in safe zones

### 🟡 Stap 32: Entity Warning UI
**File:** `ui-web/src/lib/game/main.ts`
- `showEntityWarning()` bij entity nabij
- Heartbeat sound effect slot

### 🟡 Stap 33: Entity Caught Screen
**File:** `ui-web/src/lib/game/main.ts`
- `showCaughtByEntity(type)` 
- Respawn of game over afhankelijk van mode

### 🟡 Stap 34: Day/Night Phase UI
**File:** `ui-web/src/lib/game/main.ts`
- Phase indicator (zon/maan icon)
- Lighting changes via ZoneRenderer

### 🟡 Stap 35: Dynamic Maze Warnings
**File:** `ui-web/src/lib/game3d/dynamicMaze.ts`
- Particle warning 3s voor wall change
- Geluid bij wall rise/fall

---

## FASE 5: POLISH & BALANCING (Stappen 36-42)

### 🟢 Stap 36: Bot AI Verbetering
**File:** `core/internal/game/bot.go`
- Pathfinding naar runner (A*)
- Vermijd powered-up runner
- Verschillende bot difficulties

### 🟢 Stap 37: Camera Improvements
**File:** `ui-web/src/lib/game3d/engine.ts`
- Smooth follow
- Zoom based on action
- Shake bij collision

### 🟢 Stap 38: Sound Effects
**File:** `ui-web/src/lib/game/audio.ts` (nieuw)
- Pellet pickup: blip
- Power-up: power surge
- Kill: womp womp
- Entity near: heartbeat

### 🟢 Stap 39: Particle Effects
**File:** `ui-web/src/lib/game3d/particles.ts`
- Pellet collect burst
- Power-up aura
- Kill explosion
- Trail achter runner

### 🟢 Stap 40: Player Death Animation
**File:** `ui-web/src/lib/game3d/player.ts`
- Shrink + fade out
- Respawn pop-in

### 🟢 Stap 41: Victory Animation
**File:** `ui-web/src/lib/game3d/scene.ts`
- Confetti particles
- Winner spotlight

### 🟢 Stap 42: Game Balance Tuning
**File:** `core/internal/game/game_config.go`
- Speed adjustments
- Power-up duration
- Entity aggression

---

## FASE 6: NETWERK & SYNC (Stappen 43-47)

### 🟡 Stap 43: Message Sequencing
**File:** `core/internal/game/messages.go`
- Add `seq` en `ts` aan alle messages
- Client detecteert gaps

### 🟡 Stap 44: State Reconciliation
**File:** `ui-web/src/lib/game/connection.ts`
- Bij gap: request full state
- Smooth resync zonder stutter

### 🟡 Stap 45: Lag Compensation
**File:** `core/internal/game/world.go`
- Buffer laatste N posities
- Rewind voor collision checks

### 🟡 Stap 46: Delta Compression
**File:** `core/internal/game/messages.go`
- Stuur alleen gewijzigde entities
- Reduce bandwidth

### 🟢 Stap 47: Reconnect Handling
**File:** `ui-web/src/lib/game/connection.ts`
- Auto-reconnect bij disconnect
- Rejoin dezelfde game

---

## FASE 7: FINAL TOUCHES (Stappen 48-50)

### 🟢 Stap 48: Tutorial/Help
**File:** `ui-web/src/pages/game.astro`
- Controls uitleg
- Game rules popup

### 🟢 Stap 49: Mobile Controls
**File:** `ui-web/src/lib/game/input.ts`
- Swipe gestures
- Virtual joystick

### 🟢 Stap 50: Performance Optimization
**File:** Diverse
- LOD voor entities
- Frustum culling
- Texture atlases

---

## Prioriteit Matrix

| Fase | Stappen | Status | Geschatte Tijd |
|------|---------|--------|----------------|
| 1. Movement | 1-8 | 🔴 KRITIEK | 4-6 uur |
| 2. Collision | 9-18 | 🔴 KRITIEK | 4-6 uur |
| 3. Game Flow | 19-26 | 🔴 NODIG | 3-4 uur |
| 4. Entities | 27-35 | 🟡 WENSELIJK | 4-5 uur |
| 5. Polish | 36-42 | 🟢 NICE-TO-HAVE | 4-5 uur |
| 6. Netwerk | 43-47 | 🟡 BELANGRIJK | 3-4 uur |
| 7. Final | 48-50 | 🟢 OPTIONEEL | 2-3 uur |

**Totaal: ~25-35 uur voor volledig speelbare game**

---

## Quick Start: Eerste 3 Stappen

Om de game speelbaar te krijgen, focus eerst op:

1. **Stap 3**: Maze data laden (walls array)
2. **Stap 1**: Server movement handler met wall collision
3. **Stap 10**: Pellet collision check

Dit geeft je een runner die kan bewegen en pellets kan eten.
