# Backend Dynamic Systems - MazeChase

## Overview

De backend beheert alle game state en is authoritative over zones, phases, entities en collisions.

---

## Zones (`zones.go`)

### Types

```go
type ZoneType string
const (
    ZoneSafe    ZoneType = "safe"
    ZoneNeutral ZoneType = "neutral"
    ZoneDanger  ZoneType = "danger"
)

type TimePhase string
const (
    PhaseDay   TimePhase = "day"
    PhaseDusk  TimePhase = "dusk"
    PhaseNight TimePhase = "night"
    PhaseDawn  TimePhase = "dawn"
)
```

### Zone Struct

```go
type Zone struct {
    ID       int      `json:"id"`
    Type     ZoneType `json:"type"`
    X        int      `json:"x"`
    Y        int      `json:"y"`
    Width    int      `json:"width"`
    Height   int      `json:"height"`
    IsActive bool     `json:"isActive"`
}
```

### DynamicWorld

Beheert zones en time phases:

```go
type DynamicWorld struct {
    Zones         []Zone
    CurrentPhase  TimePhase
    PhaseProgress float64      // 0-1 progress door huidige fase
    PhaseDuration time.Duration // 30 seconden default
    MazeUpdates   []MazeUpdate
    // ...
}
```

### Phase Timing

| Configuratie | Waarde | Beschrijving |
|--------------|--------|--------------|
| `PhaseDuration` | 30s | Duur per fase |
| Phase order | day→dusk→night→dawn | Cyclus |
| Maze update kans | 10% per seconde | Alleen bij dusk/night |

### Phase Transition Rules

1. **Day → Dusk**: Geen wijzigingen
2. **Dusk → Night**: 
   - Safe zones: `IsActive = false`
   - Neutral zones: `Type = danger`
3. **Night → Dawn**: Geen wijzigingen
4. **Dawn → Day**:
   - Safe zones: `IsActive = true`
   - Random neutral zone regeneratie

### Maze Updates

```go
type MazeUpdate struct {
    Type      string `json:"type"`      // "wall_add", "wall_remove", "wall_move"
    X         int    `json:"x"`
    Y         int    `json:"y"`
    TargetX   int    `json:"targetX,omitempty"`
    TargetY   int    `json:"targetY,omitempty"`
    Duration  int    `json:"duration"`  // Animation ms
}
```

---

## AI Entities (`entities.go`)

### Entity Types

| Type | Snelheid | Detectie | Gedrag |
|------|----------|----------|--------|
| `hunter` | 2.5 tiles/s | 4 tiles radius | Actief achtervolgen |
| `scanner` | 1.5 tiles/s | 8 tiles, 60° cone | Detecteren & alerteren |
| `sweeper` | 2.0 tiles/s | 2.5 tiles radius | Patrouilleren |

### Entity States

```go
type EntityState string
const (
    StatePatrol  EntityState = "patrol"  // Normaal rondlopen
    StateAlert   EntityState = "alert"   // Iets gedetecteerd
    StateChase   EntityState = "chase"   // Actief achtervolgen
    StateReturn  EntityState = "return"  // Terug naar patrol
    StateDormant EntityState = "dormant" // Inactief (overdag in safe zones)
)
```

### State Machine

```
           ┌──────────────┐
           │   PATROL     │
           └──────┬───────┘
                  │ detect player
                  ↓
           ┌──────────────┐
           │    ALERT     │
           └──────┬───────┘
                  │ confirm
                  ↓
           ┌──────────────┐
           │    CHASE     │◄────────┐
           └──────┬───────┘         │
                  │ lose target     │ re-detect
                  ↓                 │
           ┌──────────────┐         │
           │   RETURN     │─────────┘
           └──────┬───────┘
                  │ reach home
                  ↓
           ┌──────────────┐
           │   PATROL     │
           └──────────────┘
```

### DangerEntity Struct

```go
type DangerEntity struct {
    ID             string      `json:"id"`
    Type           EntityType  `json:"type"`
    State          EntityState `json:"state"`
    X              float64     `json:"x"`
    Y              float64     `json:"y"`
    Dir            string      `json:"dir"`
    Speed          float64     `json:"speed"`
    DetectionRange float64     `json:"detectionRange"`
    ScanAngle      float64     `json:"scanAngle"`      // Scanner only
    ScanDirection  float64     `json:"scanDir"`        // Scanner only
    AlertLevel     float64     `json:"alertLevel"`     // 0-1
    GlowIntensity  float64     `json:"glowIntensity"`
    GlowColor      string      `json:"glowColor"`
    PatrolPath     []Point     `json:"patrolPath"`     // Sweeper only
    HomeZone       int         `json:"homeZone"`
}
```

### Night Aggression

Entities zijn agressiever 's nachts:

```go
aggressionMultiplier := 1.0
switch currentPhase {
case PhaseNight:
    aggressionMultiplier = 1.5
case PhaseDusk, PhaseDawn:
    aggressionMultiplier = 1.25
}
```

Dit beïnvloedt:
- Movement speed
- Detection range (voor Hunters)
- Alert decay rate

### Scanner Cone Detection

```go
func (em *EntityManager) isInScanCone(scanner *DangerEntity, px, py float64) bool {
    dx := px - scanner.X
    dy := py - scanner.Y
    distance := math.Sqrt(dx*dx + dy*dy)
    
    if distance > scanner.DetectionRange {
        return false
    }
    
    angle := math.Atan2(dy, dx)
    angleDiff := math.Abs(angle - scanner.ScanDirection)
    
    return angleDiff < scanner.ScanAngle/2
}
```

### Hunter Alert System

Scanners kunnen Hunters alerteren:

```go
func (em *EntityManager) alertNearbyHunters(scannerX, scannerY, playerX, playerY float64) {
    alertRadius := 10.0
    
    for _, entity := range em.Entities {
        if entity.Type == EntityHunter {
            dist := distance(entity.X, entity.Y, scannerX, scannerY)
            if dist < alertRadius {
                entity.State = StateChase
                entity.TargetX = playerX
                entity.TargetY = playerY
            }
        }
    }
}
```

---

## World Integration (`world.go`)

### Extended World Struct

```go
type World struct {
    // ... existing fields ...
    
    // Dynamic game mechanics
    DynamicWorld  *DynamicWorld
    EntityManager *EntityManager
    MazeWidth     int
    MazeHeight    int
}
```

### Starting Dynamic Systems

```go
func (w *World) StartDynamicSystems(broadcastFunc func(msgType string, data interface{})) {
    w.DynamicWorld.SetBroadcastFunc(broadcastFunc)
    w.EntityManager.SetBroadcastFunc(broadcastFunc)
    w.EntityManager.SetGetPlayersFunc(w.getPlayerPositions)
    
    w.EntityManager.SpawnInitialEntities()
    
    w.DynamicWorld.Start()  // 1s tick
    w.EntityManager.Start() // 50ms tick
}
```

### Player Position Tracking

Voor entity AI:

```go
func (w *World) getPlayerPositions() []PlayerPosition {
    positions := make([]PlayerPosition, 0)
    
    for _, session := range w.ConnectedPlayers.GetValues() {
        if session == nil { continue }
        
        player, err := getPlayerEntityFromSession(session)
        if err != nil { continue }
        
        positions = append(positions, PlayerPosition{
            ID: player.PlayerId,
            X:  player.X,
            Y:  player.Y,
        })
    }
    
    return positions
}
```

---

## Message Handlers (`messages.go`)

### Nieuwe Handlers

| Message Type | Handler | Doel |
|--------------|---------|------|
| `entity_collision` | `EntityCollisionMessage()` | Collision verificatie |
| `zone_query` | `ZoneQueryMessage()` | Zone lookup op positie |
| `dynamic_state` | `DynamicStateMessage()` | Full state sync |

### Entity Collision Flow

```go
func EntityCollisionMessage() MessageHandler {
    return MessageHandler{
        messageName: "entity_collision",
        handler: func(data MessageData) map[string]interface{} {
            x, y := getCoordFromMessage(data.msgInfo)
            
            entity := data.world.CheckEntityCollision(x, y)
            if entity == nil {
                return nil // Geen collision
            }
            
            zone := data.world.GetCurrentZone(int(x), int(y))
            
            // Safe zone beschermt (als actief)
            if zone != nil && zone.Type == ZoneSafe && zone.IsActive {
                return map[string]interface{}{
                    "type":     "entity_near",
                    "entityId": entity.ID,
                    "warning":  true,
                }
            }
            
            // Gevangen!
            return map[string]interface{}{
                "type":       "entity_collision",
                "entityId":   entity.ID,
                "entityType": entity.Type,
                "caught":     true,
            }
        },
    }
}
```

---

## Tick Rates

| System | Interval | Doel |
|--------|----------|------|
| DynamicWorld | 1 second | Phase progression, maze updates |
| EntityManager | 50ms (20 Hz) | Entity movement, AI updates |
| Player positions | Per message | Movement broadcasts |

---

## Known Issues & TODOs

### 🔴 Critical

1. **Entities lopen door muren** - `mazeData` wordt niet gebruikt
2. **Geen pathfinding** - Entities bewegen in rechte lijn
3. **Geen message sequencing** - `seq` en `ts` ontbreken

### 🟡 Medium

1. Config hardcoded (30s phases, 1.5x aggression)
2. Geen delta compression voor entity updates
3. Zone overlap niet gevalideerd

### 🟢 Low

1. Dormant state nooit gebruikt
2. Pending maze updates groeien oneindig
