# MazeChase Dynamic World System - 50-Stappen Implementatieplan

## Overzicht

Dit plan consolideert wat er al gebouwd is met het nieuwe ontwerp en optimaliseert de codebase voor productie.

**Huidige Status**: Basis implementatie compleet (zones, entities, dag/nacht cycle)
**Ontbrekend**: Sequencing, collision prediction, config centralisatie, UI functies, pathfinding

---

## Fase 0: Consolidatie & Contract-Hardening (Items 1-10)

### Message Protocol & Sequencing

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 1 | **Maak `BaseEvent` struct** met `Type`, `Seq`, `Ts`, `LobbyId` als basis voor alle events | `core/internal/game/events.go` (nieuw) | 🔴 Critical |
| 2 | **Voeg `seq` + `ts` toe aan alle WebSocket messages** - monotonic counter per lobby | `messages.go`, `manager.go` | 🔴 Critical |
| 3 | **Implementeer `full_state` snapshot event** voor join/resync - bevat phase, zones, entities, maze | `messages.go`, `world.go` | 🔴 Critical |
| 4 | **Client sequence validation** - detecteer gemiste messages, vraag resync bij gaps | `connection.ts` | 🔴 Critical |
| 5 | **Client latency tracking** - bereken RTT uit server timestamps | `connection.ts` | 🟡 Medium |

### Config Centralisatie

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 6 | **Maak `game_config.go`** met alle tunable waarden (phase duration, aggression multipliers, entity speeds) | `core/internal/game/game_config.go` (nieuw) | 🟡 Medium |
| 7 | **Stuur config naar client bij join** via `init` event | `handler.go`, `connection.ts` | 🟡 Medium |
| 8 | **Verplaats hardcoded waarden naar config** in zones.go, entities.go | `zones.go`, `entities.go` | 🟡 Medium |
| 9 | **Client-side config store** - constants.ts met server-synced values | `ui-web/src/lib/game/constants.ts` (nieuw) | 🟢 Low |
| 10 | **Deterministic RNG met seed** voor reproduceerbare maze updates | `zones.go` | 🟢 Low |

---

## Fase 1: Collision Model (Items 11-20)

### Entity Wall Collision & Pathfinding

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 11 | **Roep `SetMazeData()` aan** wanneer map laadt - momenteel nooit gecalled | `world.go`, `handler.go` | 🔴 Critical |
| 12 | **Implementeer wall collision check** in entity movement - gebruik `mazeData` | `entities.go` | 🔴 Critical |
| 13 | **A* pathfinding voor Hunters** - navigeer om muren heen | `entities.go` of `pathfinding.go` uitbreiden | 🔴 Critical |
| 14 | **Patrol path validation voor Sweepers** - controleer of path niet door muren gaat | `entities.go` | 🟡 Medium |
| 15 | **Entity spawn validation** - spawn niet in muren | `entities.go` | 🟡 Medium |

### Client-Side Prediction

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 16 | **Position buffer voor entities** - sla laatste N posities + timestamps op | `entities.ts` | 🔴 Critical |
| 17 | **Interpolation engine** - smooth movement tussen server updates | `entities.ts` | 🔴 Critical |
| 18 | **Client collision prediction** - pre-warning bij entity proximity | `scene.ts`, `main.ts` | 🟡 Medium |
| 19 | **`collision_claim` message** - client stuurt mogelijke collision naar server | `connection.ts`, `messages.go` | 🟡 Medium |
| 20 | **Server collision verification** - bevestig/wijs af met authoritative result | `messages.go`, `entities.go` | 🟡 Medium |

---

## Fase 2: Dynamic Maze Integration (Items 21-28)

### Wall Collision Updates

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 21 | **Roep `registerExistingWalls()` aan** na maze load | `scene.ts` | 🔴 Critical |
| 22 | **Collision mesh update callback** - sync physics met wall changes | `dynamicMaze.ts`, integreer met movement | 🔴 Critical |
| 23 | **Player movement blokkade** voor dynamische walls | `player.ts` of movement controller | 🔴 Critical |
| 24 | **Entity mazeData update** bij wall changes - server-side | `world.go`, `entities.go` | 🟡 Medium |
| 25 | **Telegraph warnings** - toon waarschuwing vóór wall change | `dynamicMaze.ts` (al deels) | 🟡 Medium |

### Animation & Audio

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 26 | **Wall change audio cues** - rumble/klok geluiden | `dynamicMaze.ts` + audio assets | 🟢 Low |
| 27 | **Wall key rounding fix** - consistent Math.floor of Math.round | `dynamicMaze.ts` | 🟡 Medium |
| 28 | **Pending updates cleanup** in zones.go - voorkom memory leak | `zones.go` | 🟢 Low |

---

## Fase 3: UI Functies Implementeren (Items 29-36)

### Phase & Zone UI

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 29 | **Implementeer `updatePhaseUI(phase)`** - fase indicator met icoon | `main.ts` | 🔴 Critical |
| 30 | **Implementeer `updatePhaseProgressUI(phase, progress)`** - progress bar | `main.ts` | 🔴 Critical |
| 31 | **Zone indicator UI** - toon huidige zone type van speler | `main.ts`, `scene.ts` | 🟡 Medium |
| 32 | **Zone deactivation warning** - waarschuwing als safe zone uitschakelt | `main.ts` | 🟡 Medium |

### Entity Warnings

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 33 | **Implementeer `showEntityWarning(entityId)`** - "GEVAAR NABIJ!" UI | `main.ts` | 🔴 Critical |
| 34 | **Implementeer `showCaughtByEntity(entityType)`** - capture screen met entity info | `main.ts` | 🔴 Critical |
| 35 | **Proximity warning sounds** - audio alert bij entity nearby | `main.ts` + audio | 🟢 Low |
| 36 | **Scanner cone visualization improvement** - pulserende opacity | `entities.ts` | 🟢 Low |

---

## Fase 4: Gameplay Loop (Items 37-44)

### Resource System (Pellet Replacement)

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 37 | **Resource spawning per zone** - vervang pellets met zone-based resources | `world.go`, nieuw `resources.go` | 🟡 Medium |
| 38 | **Artifact spawning bij night** - speciale items in danger zones | `zones.go` uitbreiden | 🟡 Medium |
| 39 | **Extraction mechanic** - breng resources naar safe zone/hub | `messages.go`, client UI | 🟡 Medium |
| 40 | **Risk/reward scoring** - night objectives geven meer punten | `world.go` scoring logic | 🟡 Medium |

### Collision Outcomes

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 41 | **Collision result types** - capture/damage/stun/loot_loss | `messages.go`, `entities.go` | 🟡 Medium |
| 42 | **Loot drop bij capture** - speler verliest resources | `world.go`, client rendering | 🟡 Medium |
| 43 | **Respawn timer** - penalty na capture | `world.go`, client UI | 🟡 Medium |
| 44 | **Survival streak bonus** - beloning voor ontwijken | scoring logic | 🟢 Low |

---

## Fase 5: Performance & Polish (Items 45-50)

### Optimization

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 45 | **Delta compression voor entities** - stuur alleen gewijzigde properties | `entities.go` | 🟡 Medium |
| 46 | **Message batching** - combineer meerdere events in één WebSocket frame | `manager.go` | 🟢 Low |
| 47 | **Entity LOD** - minder particles voor verre entities | `entities.ts` | 🟢 Low |
| 48 | **Zone overlap fix** - voorkom dubbele zone matches | `zones.go` | 🟡 Medium |

### Testing & Documentation

| # | Todo | Bestand(en) | Prioriteit |
|---|------|-------------|------------|
| 49 | **Unit tests voor entity AI** - test state machine transitions | `entities_test.go` (nieuw) | 🟡 Medium |
| 50 | **API documentatie** - docs/websocket-events.md met alle event schemas | `docs/` | 🟢 Low |

---

## Prioriteit Samenvatting

### 🔴 Critical (Blocking) - 16 items
Items: 1, 2, 3, 4, 11, 12, 13, 16, 17, 21, 22, 23, 29, 30, 33, 34

### 🟡 Medium (Should Fix) - 24 items
Items: 5, 6, 7, 8, 14, 15, 18, 19, 20, 24, 25, 27, 31, 32, 37, 38, 39, 40, 41, 42, 43, 45, 48, 49

### 🟢 Low (Nice to Have) - 10 items
Items: 9, 10, 26, 28, 35, 36, 44, 46, 47, 50

---

## Aanbevolen Volgorde

1. **Week 1**: Items 1-5 (Message protocol) + 11-13 (Entity collision)
2. **Week 2**: Items 16-17 (Client interpolation) + 21-23 (Dynamic walls)
3. **Week 3**: Items 29-34 (UI functies) + 6-8 (Config)
4. **Week 4**: Items 37-43 (Gameplay loop)
5. **Week 5**: Items 45-50 (Polish & testing)

---

## Wat Al Werkt ✅

- Zone systeem met safe/neutral/danger types
- Day/dusk/night/dawn cycle (30s per fase)
- Entity AI met Hunters/Scanners/Sweepers
- Entity state machine (patrol/alert/chase/return)
- Night aggression multiplier (1.5x)
- Dynamic maze add/remove/move animaties
- Zone en entity 3D rendering met particles
- WebSocket event handling basis
- Player position broadcasting

## Wat Gefixed Moet Worden 🔧

- Entities lopen door muren (pathfinding ontbreekt)
- Geen message sequencing (kan packets missen)
- UI functies referenced maar niet gedefinieerd
- Dynamic walls niet geïntegreerd met movement physics
- Position interpolation ontbreekt (entities teleporteren)
- Config hardcoded overal
- `SetMazeData()` en `registerExistingWalls()` nooit gecalled
