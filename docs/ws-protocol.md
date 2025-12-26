# WebSocket Events - MazeChase

## Overview

Alle communicatie tussen client en server verloopt via WebSocket met JSON messages. Dit document beschrijft het message protocol met focus op de nieuwe dynamic world features.

---

## Message Format

### Base Structure (Current)

```json
{
    "type": "event_name",
    "payload": { ... }
}
```

### Proposed Extended Structure (TODO)

```json
{
    "type": "event_name",
    "seq": 12345,        // Monotonically increasing sequence number
    "ts": 1718234567890, // Server timestamp (ms since epoch)
    "payload": { ... }
}
```

---

## Client → Server Events

### Player Movement

```json
{
    "type": "player_move",
    "payload": {
        "direction": "up|down|left|right",
        "seq": 123  // Client sequence for reconciliation
    }
}
```

### Request State Sync

```json
{
    "type": "request_dynamic_state",
    "payload": {}
}
```

---

## Server → Client Events

### Phase Change

Broadcast when time phase transitions.

```json
{
    "type": "phase_change",
    "payload": {
        "phase": "day|dusk|night|dawn",
        "duration": 30000,  // Phase duration in ms
        "zones": [
            {
                "id": "zone_1",
                "type": "safe|neutral|danger",
                "x": 5,
                "y": 3,
                "width": 4,
                "height": 4,
                "active": true
            }
        ]
    }
}
```

### Phase Progress

Periodic update during phase (optional, for UI progress bar).

```json
{
    "type": "phase_progress",
    "payload": {
        "phase": "night",
        "elapsed": 15000,
        "remaining": 15000,
        "progress": 0.5  // 0.0 - 1.0
    }
}
```

### Entity Update

High-frequency updates for entity positions.

```json
{
    "type": "entities_update",
    "payload": {
        "entities": [
            {
                "id": "hunter_1",
                "type": "hunter|scanner|sweeper",
                "x": 10.5,
                "y": 8.2,
                "state": "patrol|alert|chase|return|dormant",
                "alertLevel": 0.7,
                "targetId": "player_abc",
                "direction": 1.57,   // Radians, facing direction
                "glowColor": "#ff3333",
                "detectionRange": 8  // Only for scanners
            }
        ]
    }
}
```

### Entity Near Warning

Sent when player enters detection range of an entity.

```json
{
    "type": "entity_near",
    "payload": {
        "entityId": "scanner_2",
        "entityType": "scanner",
        "distance": 3.5,
        "warning": true
    }
}
```

### Entity Collision

Sent when entity catches player.

```json
{
    "type": "entity_collision",
    "payload": {
        "entityId": "hunter_1",
        "entityType": "hunter",
        "caught": true
    }
}
```

### Maze Update

Sent when dynamic walls change.

```json
{
    "type": "maze_update",
    "payload": {
        "changes": [
            {
                "type": "wall_add|wall_remove|wall_move",
                "x": 7,
                "y": 12,
                "toX": 9,     // Only for wall_move
                "toY": 12     // Only for wall_move
            }
        ],
        "warningTime": 3000  // Time until change applies (ms)
    }
}
```

### Dynamic State Sync

Full state sync on connect or reconnect.

```json
{
    "type": "dynamic_state_sync",
    "payload": {
        "zones": {
            "phase": "night",
            "phaseElapsed": 12500,
            "zones": [ ... ]
        },
        "entities": [ ... ],
        "maze": {
            "walls": [
                { "x": 1, "y": 1 },
                { "x": 1, "y": 2 }
            ]
        }
    }
}
```

---

## Event Flow Diagrams

### Connection & Initial Sync

```
Client                          Server
   |                               |
   |-------- WebSocket Connect --->|
   |                               |
   |<------ game_state_sync -------|  (existing: players, dots, etc.)
   |<---- dynamic_state_sync ------|  (new: zones, entities, phase)
   |                               |
```

### Phase Transition

```
Client                          Server
   |                               |
   |                    [30s timer expires]
   |                               |
   |<------ phase_change ----------|  (new phase + updated zones)
   |                               |
   | [Animate lighting, fog]       |
   |                               |
```

### Entity Chase Sequence

```
Client                          Server
   |                               |
   |<------ entities_update -------|  (entity state: alert)
   |                               |
   |<------ entity_near -----------|  (warning: true)
   |                               |
   | [Show warning UI]             |
   |                               |
   |<------ entities_update -------|  (entity state: chase)
   |                               |
   |<------ entity_collision ------|  (caught: true)
   |                               |
   | [Show "CAUGHT!" screen]       |
   |                               |
```

### Dynamic Wall Change

```
Client                          Server
   |                               |
   |                     [Wall timer expires]
   |                               |
   |<------ maze_update -----------|  (warningTime: 3000)
   |                               |
   | [Show warning particles]      |
   |                               |
   | [Wait 3 seconds]              |
   |                               |
   | [Animate wall change]         |
   |                               |
```

---

## Message Sequencing (TODO)

### Problem

Messages can arrive out of order or be lost. Currently there's no detection.

### Solution

1. Add `seq` (sequence number) to all server messages
2. Client tracks last received seq per message type
3. Request resync if gap detected

```typescript
// Client-side sequence tracking
const lastSeq: Map<string, number> = new Map();

function handleMessage(msg: Message) {
    const type = msg.type;
    const seq = msg.seq;
    
    const expectedSeq = (lastSeq.get(type) || 0) + 1;
    
    if (seq > expectedSeq) {
        console.warn(`Gap detected for ${type}: expected ${expectedSeq}, got ${seq}`);
        requestResync();
        return;
    }
    
    lastSeq.set(type, seq);
    processMessage(msg);
}
```

### Server-side Implementation

```go
type MessageWithSeq struct {
    Type    string      `json:"type"`
    Seq     uint64      `json:"seq"`
    TS      int64       `json:"ts"`
    Payload interface{} `json:"payload"`
}

var seqCounters = make(map[string]*atomic.Uint64)

func broadcastWithSeq(msgType string, payload interface{}) {
    counter, ok := seqCounters[msgType]
    if !ok {
        counter = &atomic.Uint64{}
        seqCounters[msgType] = counter
    }
    
    msg := MessageWithSeq{
        Type:    msgType,
        Seq:     counter.Add(1),
        TS:      time.Now().UnixMilli(),
        Payload: payload,
    }
    
    broadcastJSON(msg)
}
```

---

## Delta Compression (TODO)

### Problem

`entities_update` sends all entities every tick, even unchanged ones.

### Solution

Only send changed fields with entity ID.

```json
{
    "type": "entities_delta",
    "payload": {
        "full": false,
        "changes": [
            {
                "id": "hunter_1",
                "x": 10.7,
                "y": 8.3
            },
            {
                "id": "scanner_2",
                "state": "alert",
                "alertLevel": 0.8
            }
        ]
    }
}
```

### Implementation

```go
type EntityDelta struct {
    ID         string   `json:"id"`
    X          *float64 `json:"x,omitempty"`
    Y          *float64 `json:"y,omitempty"`
    State      *string  `json:"state,omitempty"`
    AlertLevel *float64 `json:"alertLevel,omitempty"`
    // ... other optional fields
}

func computeDelta(prev, curr *DangerEntity) *EntityDelta {
    delta := &EntityDelta{ID: curr.ID}
    hasChanges := false
    
    if prev.X != curr.X {
        delta.X = &curr.X
        hasChanges = true
    }
    if prev.Y != curr.Y {
        delta.Y = &curr.Y
        hasChanges = true
    }
    // ... check other fields
    
    if hasChanges {
        return delta
    }
    return nil
}
```

---

## Error Handling

### Connection Lost

```json
{
    "type": "error",
    "payload": {
        "code": "CONNECTION_LOST",
        "message": "WebSocket connection closed",
        "retryIn": 3000
    }
}
```

### Invalid Message

```json
{
    "type": "error",
    "payload": {
        "code": "INVALID_MESSAGE",
        "message": "Unknown message type: foo_bar"
    }
}
```

### Rate Limited

```json
{
    "type": "error",
    "payload": {
        "code": "RATE_LIMITED",
        "message": "Too many messages, slow down",
        "retryAfter": 1000
    }
}
```

---

## Rate Limits

| Message Type | Direction | Rate |
|--------------|-----------|------|
| `player_move` | Client → Server | Max 20/sec |
| `entities_update` | Server → Client | 20/sec |
| `phase_change` | Server → Client | 1/30sec |
| `maze_update` | Server → Client | 1-5/min |

---

## Handler Registration

### Backend (`handler.go`)

```go
func (h *Handler) RegisterMessages(m *melody.Melody) {
    m.HandleMessage(func(s *melody.Session, msg []byte) {
        var base BaseMessage
        json.Unmarshal(msg, &base)
        
        switch base.Type {
        case "player_move":
            h.handlePlayerMove(s, msg)
        case "request_dynamic_state":
            h.handleDynamicStateRequest(s)
        // ... more cases
        }
    })
}
```

### Frontend (`connection.ts`)

```typescript
const eventHandlers: Map<string, EventCallback[]> = new Map();

export function subscribeGameEvents(handlers: GameEventHandlers): void {
    // Register all handler functions
    registerHandler('phase_change', handlers.onPhaseChange);
    registerHandler('entities_update', handlers.onEntitiesUpdate);
    registerHandler('entity_near', handlers.onEntityNear);
    registerHandler('entity_collision', handlers.onEntityCollision);
    registerHandler('maze_update', handlers.onMazeUpdate);
    registerHandler('dynamic_state_sync', handlers.onDynamicStateSync);
}

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const handlers = eventHandlers.get(msg.type);
    handlers?.forEach(h => h(msg.payload));
};
```

---

## Testing Checklist

### Unit Tests

- [ ] Parse all message types correctly
- [ ] Handle missing optional fields
- [ ] Detect sequence gaps
- [ ] Apply delta updates correctly

### Integration Tests

- [ ] Full connection flow
- [ ] Phase transitions broadcast to all clients
- [ ] Entity updates at correct rate
- [ ] Maze updates with warning time

### Load Tests

- [ ] 100 concurrent clients
- [ ] 20 entities updating at 20Hz
- [ ] No dropped messages under load
