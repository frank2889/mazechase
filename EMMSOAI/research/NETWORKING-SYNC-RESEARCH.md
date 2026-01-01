# 🌐 Networking & Sync Research - Real-time Multiplayer 2024-2025

## Executive Summary
Dit document bevat onderzoek over real-time netwerk architectuur, synchronisatie, en lag compensation.
Voor Elena (Performance), Alex (QA), en backend development.

---

## 🏗️ Network Architecture Models

### Client-Server vs Peer-to-Peer
```
CLIENT-SERVER (Recommended for MazeChase):
┌────────┐     ┌────────┐     ┌────────┐
│Client A│────►│ SERVER │◄────│Client B│
└────────┘     └────────┘     └────────┘
                   │
                   ▼
             Authoritative
             Game State

ADVANTAGES:
- Anti-cheat (server validates)
- Consistent state
- Simpler client code
- Scales better

DISADVANTAGES:
- Server cost
- Single point of failure
- Latency to server

PEER-TO-PEER:
┌────────┐◄────────────────►┌────────┐
│Client A│                  │Client B│
└────────┘◄────────────────►└────────┘
              │      │
              ▼      ▼
         ┌────────┐
         │Client C│
         └────────┘

ADVANTAGES:
- No server cost
- Lower latency (direct)
- Works offline (LAN)

DISADVANTAGES:
- Cheating easier
- State conflicts
- Scales poorly (N² connections)
- NAT traversal issues
```

### Authoritative Server Model
```
PRINCIPLE: Server is the single source of truth

CLIENT SENDS:
- Input/intentions only
- "I pressed UP"
- "I clicked at (x, y)"

SERVER DOES:
- Validates input
- Updates game state
- Broadcasts results

CLIENT RECEIVES:
- Authoritative state
- "You are now at (100, 200)"
- "Enemy is at (150, 180)"

NEVER TRUST CLIENT:
- Position claims
- Damage calculations
- Item pickups
- Score updates
```

---

## 📡 WebSocket Protocol Design

### Message Format
```javascript
// Compact binary format (recommended for real-time)
{
    type: uint8,      // Message type (0-255)
    seq: uint16,      // Sequence number (0-65535)
    ts: uint32,       // Timestamp (ms since game start)
    payload: bytes    // Message-specific data
}

// JSON format (easier debugging, higher bandwidth)
{
    "t": "pos",           // type (abbreviated)
    "s": 1234,            // sequence
    "ts": 45678,          // timestamp
    "d": {                // data
        "id": "player1",
        "x": 100,
        "y": 200,
        "dir": 2
    }
}
```

### Message Types for MazeChase
```
CLIENT → SERVER:
- input (dir: 0-3)        // Direction input
- action (type: string)   // Power-up use, etc.
- ping (ts: number)       // Latency measurement

SERVER → CLIENT:
- state (full game state)      // On join/resync
- pos (id, x, y, dir)          // Position update
- pel (x, y)                   // Pellet collected
- pow (id, type, duration)     // Power-up activated
- kill (killer, victim)        // Elimination
- gameover (winner, scores)    // Game end
- pong (ts, serverTs)          // Latency response

BIDIRECTIONAL:
- chat (msg)                   // Text chat
- emote (type)                 // Quick reactions
```

### Message Frequency
```
REAL-TIME (every tick, 60/s):
- Position updates
- Input processing

PERIODIC (every 100-250ms):
- State checksums
- Ping/pong
- Non-critical updates

EVENT-DRIVEN (when occurs):
- Collisions
- Pickups
- Game state changes
- Chat messages
```

---

## ⏱️ Latency & Lag Compensation

### Latency Types
```
TOTAL LATENCY:
Input → Display = Input Lag + Network RTT + Processing + Render

COMPONENTS:
1. Input Lag: 1-8ms (keyboard/controller)
2. Client Processing: 1-5ms
3. Network (one-way): 10-100ms
4. Server Processing: 1-10ms
5. Network (return): 10-100ms
6. Client Render: 1-16ms

TYPICAL:
- LAN: 5-20ms total
- Same region: 30-60ms
- Cross-region: 80-150ms
- Intercontinental: 150-300ms

PLAYABLE THRESHOLDS:
- Excellent: < 50ms
- Good: 50-100ms
- Acceptable: 100-150ms
- Poor: 150-250ms
- Unplayable: > 250ms
```

### Client-Side Prediction
```
CONCEPT: Client predicts outcome, server corrects

PROCESS:
1. Client receives input
2. Client applies input locally (immediate feedback)
3. Client sends input to server
4. Server validates and applies
5. Server sends authoritative state
6. Client reconciles (corrects if wrong)

IMPLEMENTATION:
```go
// Client pseudo-code
func onInput(direction) {
    // Immediate local prediction
    predictedPos = move(localPlayer.pos, direction)
    localPlayer.pos = predictedPos
    
    // Store prediction for reconciliation
    predictions.push({
        seq: nextSeq++,
        input: direction,
        pos: predictedPos
    })
    
    // Send to server
    send({type: "input", seq: seq, dir: direction})
}

func onServerUpdate(update) {
    // Find matching prediction
    for i, pred := range predictions {
        if pred.seq == update.seq {
            if pred.pos != update.pos {
                // Prediction was wrong, correct
                localPlayer.pos = update.pos
                
                // Re-apply subsequent predictions
                for j := i+1; j < len(predictions); j++ {
                    localPlayer.pos = move(localPlayer.pos, predictions[j].input)
                }
            }
            // Remove processed predictions
            predictions = predictions[i+1:]
            break
        }
    }
}
```

### Server Reconciliation
```
SERVER-SIDE LAG COMPENSATION:

PROBLEM: Player A shoots at Player B's old position
SOLUTION: Rewind time on server to check hit

PROCESS:
1. Server receives "shoot" from Player A
2. Server notes Player A's latency (e.g., 80ms)
3. Server rewinds all positions by 80ms
4. Server checks collision in past state
5. If hit: apply damage in current state
6. Broadcast result

BUFFER:
- Store last 200ms of all entity positions
- Each entry: {timestamp, positions[]}
- Interpolate for exact past moment
```

### Entity Interpolation
```
CONCEPT: Smooth movement between server updates

PROBLEM:
- Server sends updates at 20 Hz (every 50ms)
- Client renders at 60 Hz (every 16ms)
- Movement looks choppy

SOLUTION:
- Render entities in the past (one update behind)
- Interpolate between known positions

IMPLEMENTATION:
```javascript
const INTERPOLATION_DELAY = 100; // ms

function renderEntity(entity) {
    const renderTime = Date.now() - INTERPOLATION_DELAY;
    
    // Find two updates bracketing renderTime
    const [prev, next] = findBracketingUpdates(entity, renderTime);
    
    if (prev && next) {
        const t = (renderTime - prev.ts) / (next.ts - prev.ts);
        entity.displayPos = lerp(prev.pos, next.pos, t);
    } else if (prev) {
        // Extrapolate (risky, use sparingly)
        entity.displayPos = extrapolate(prev);
    }
}

function lerp(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}
```

---

## 🔄 State Synchronization

### Full State vs Delta Updates
```
FULL STATE:
{
    players: [
        {id: "p1", x: 100, y: 200, score: 50, ...},
        {id: "p2", x: 300, y: 400, score: 30, ...}
    ],
    pellets: [[1,1], [1,2], [1,3], ...], // 200+ items
    powerups: [{x: 50, y: 50, active: true}, ...],
    time: 120
}
Size: 2-10 KB

WHEN TO USE:
- Initial join
- Reconnection
- Desync recovery
- Every 5-10 seconds as backup

DELTA UPDATE:
{
    changed: {
        "p1": {x: 102, y: 200},
        "pellets_removed": [[1,1]]
    }
}
Size: 50-200 bytes

WHEN TO USE:
- Every tick (60/s)
- Most updates
```

### Sequence Numbers & Ordering
```
PROBLEM: Messages can arrive out of order

SOLUTION: Sequence numbers

MESSAGE FORMAT:
{
    seq: 1234,
    ack: 1230,  // Last received from other side
    data: {...}
}

CLIENT LOGIC:
- Track lastReceivedSeq
- If incoming.seq <= lastReceivedSeq: discard (duplicate)
- If incoming.seq > lastReceivedSeq + 1: gap detected
- Request resync if too many gaps

SERVER LOGIC:
- Track per-client sequence
- Validate sequence continuity
- Detect packet loss patterns
```

### Checksum Verification
```
PERIODIC STATE CHECK:

Every 5 seconds:
1. Server computes state checksum
   hash = hash(player_positions + pellet_state + scores)
   
2. Server sends: {type: "checksum", hash: "abc123"}

3. Client computes local checksum

4. If mismatch:
   Client requests: {type: "resync"}
   Server sends: {type: "state", full_state: {...}}

LIGHTWEIGHT CHECKSUM:
function quickHash(state) {
    let h = 0;
    for (const p of state.players) {
        h = (h * 31 + p.x) | 0;
        h = (h * 31 + p.y) | 0;
    }
    h = (h * 31 + state.pelletCount) | 0;
    return h.toString(16);
}
```

---

## 🔌 Connection Management

### Reconnection Handling
```
DISCONNECT DETECTION:
- WebSocket close event
- Ping timeout (no pong in 5s)
- Server heartbeat missing

RECONNECTION FLOW:
1. Detect disconnect
2. Show "Reconnecting..." UI
3. Exponential backoff retry
   - 1s, 2s, 4s, 8s, 16s, 30s max
4. On connect: send rejoin request
5. Server: Check if game still active
6. Server: Send current state
7. Client: Resume from state

RECONNECTION MESSAGE:
{
    type: "rejoin",
    gameId: "abc123",
    playerId: "player1",
    lastSeq: 4567  // Last known sequence
}
```

### Connection Quality Indicators
```
METRICS TO TRACK:
- RTT (ping): Last 10 samples, rolling average
- Packet loss: % of sequences missing
- Jitter: Variance in RTT

QUALITY TIERS:
Excellent: RTT < 50ms, loss < 0.1%
Good: RTT < 100ms, loss < 1%
Fair: RTT < 150ms, loss < 3%
Poor: RTT < 250ms, loss < 5%
Critical: RTT > 250ms or loss > 5%

UI INDICATORS:
🟢 Green bars (4/4): Excellent
🟡 Yellow bars (3/4): Good/Fair
🟠 Orange bars (2/4): Poor
🔴 Red bars (1/4): Critical
```

### Bandwidth Optimization
```
COMPRESSION:
- Use binary instead of JSON (-60%)
- Delta compression (-80% for positions)
- Bitpacking for small values

BATCHING:
- Combine multiple updates per packet
- Send every 50ms instead of per-event
- Reduces header overhead

THROTTLING:
- Skip updates for off-screen entities
- Reduce update rate for distant entities
- Prioritize nearby/important entities

TARGET BANDWIDTH:
- Up: < 10 KB/s per client
- Down: < 50 KB/s per client
- Supports 100+ simultaneous players
```

---

## 🛡️ Security Considerations

### Anti-Cheat Basics
```
NEVER TRUST CLIENT FOR:
- Position (speed hacks)
- Collision (wall hacks)
- Damage (damage hacks)
- Timing (speedhacks)
- Resource counts (item duplication)

SERVER VALIDATION:
```go
func validateMove(player *Player, newPos Point, dt float64) bool {
    // Check speed
    maxDistance := player.Speed * dt * 1.1 // 10% tolerance
    if distance(player.Pos, newPos) > maxDistance {
        log.Warn("Speed hack detected", player.ID)
        return false
    }
    
    // Check walls
    if !isWalkable(newPos) {
        log.Warn("Wall hack detected", player.ID)
        return false
    }
    
    // Check teleport
    if distance(player.Pos, newPos) > TileSize * 2 {
        log.Warn("Teleport hack detected", player.ID)
        return false
    }
    
    return true
}
```

### Rate Limiting
```
LIMITS:
- Input messages: Max 60/second
- Chat messages: Max 1/second
- Actions: Context-dependent

IMPLEMENTATION:
```go
type RateLimiter struct {
    tokens    float64
    maxTokens float64
    refillRate float64
    lastRefill time.Time
}

func (r *RateLimiter) Allow() bool {
    r.refill()
    if r.tokens >= 1 {
        r.tokens--
        return true
    }
    return false
}
```

---

## 📊 Network Metrics & Debugging

### What to Log
```
PER-CONNECTION:
- RTT (rolling average)
- Packet loss %
- Messages/second (in/out)
- Bytes/second (in/out)
- Desync count
- Reconnection count

PER-GAME:
- Peak concurrent connections
- Average latency
- State sync frequency
- Error rates

ALERTS:
- RTT > 200ms for > 10s
- Packet loss > 5%
- Desync rate > 1/minute
- Connection churn > 20%
```

### Debug Tools
```
SERVER-SIDE:
- Message replay (record/playback)
- State snapshots
- Latency simulation (add artificial delay)
- Packet loss simulation

CLIENT-SIDE:
- Network overlay (show RTT, loss)
- Prediction visualization
- State diff viewer
- Message inspector
```

---

## 🎮 MazeChase Specific Recommendations

### Network Architecture
```
RECOMMENDED SETUP:

WebSocket Server (Go):
- Authoritative game logic
- 60 tick/second game loop
- 20 Hz position broadcasts
- Event-driven other updates

Client (TypeScript):
- Client-side prediction for local player
- Entity interpolation for others
- 100ms interpolation delay
- Prediction buffer of 200ms

Message Protocol:
- Binary for positions (compact)
- JSON for game events (readable)
- Sequence numbers on all
- Periodic checksums
```

### Tick Rate Recommendations
```
SERVER TICK RATE: 60 Hz (16.67ms)
- Physics/collision: Every tick
- Input processing: Every tick
- AI updates: Every 3rd tick (20 Hz)

NETWORK SEND RATE: 20 Hz (50ms)
- Position updates: 20 Hz
- Game events: Immediate
- State sync: 0.2 Hz (every 5s)

CLIENT RENDER: 60 Hz
- Interpolate between server updates
- Predict local player
- Smooth animations
```

---

## 📚 Sources & Further Reading

### Articles
- "Networked Physics" - Glenn Fiedler
- "Client-Server Game Architecture" - Gabriel Gambetta
- "Fast-Paced Multiplayer" - Valve Developer Wiki

### GDC Talks
- "Overwatch Gameplay Architecture and Netcode"
- "Rocket League Networking"
- "I Shot You First: Networking the Gameplay of Halo: Reach"

### Books
- "Multiplayer Game Programming" - Josh Glazer
- "Networked Graphics" - Anthony Steed

### Code References
- Quake 3 Network Model (id Software)
- Source Engine Networking (Valve)
- Photon Engine Documentation

---

*Last Updated: December 2024*
*For use by AI testers - networking & sync expertise*
