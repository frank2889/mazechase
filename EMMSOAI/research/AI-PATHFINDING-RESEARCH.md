# 🤖 AI & Pathfinding Research - Game AI & Bot Behavior 2024-2025

## Executive Summary
Dit document bevat onderzoek over game AI, pathfinding algoritmen, en bot behavior design.
Voor Elena (Performance), Alex (QA), en AI-gerelateerde features.

---

## 🧭 Pathfinding Algorithms

### A* Algorithm (Industry Standard)
```
A* = Best-First Search + Dijkstra's Algorithm

FORMULA:
f(n) = g(n) + h(n)

Where:
- f(n) = Total estimated cost
- g(n) = Actual cost from start to n
- h(n) = Heuristic estimate from n to goal

HEURISTICS FOR GRID:
- Manhattan: |x1-x2| + |y1-y2| (4-directional)
- Euclidean: sqrt((x1-x2)² + (y1-y2)²) (any angle)
- Chebyshev: max(|x1-x2|, |y1-y2|) (8-directional)

COMPLEXITY:
- Time: O(b^d) where b=branching, d=depth
- Space: O(b^d) for open/closed lists
- Optimal when h(n) is admissible (never overestimates)
```

### A* Implementation (Go)
```go
package pathfinding

import (
    "container/heap"
    "math"
)

type Point struct {
    X, Y int
}

type Node struct {
    Pos    Point
    G, H   float64
    Parent *Node
    Index  int
}

func (n *Node) F() float64 { return n.G + n.H }

// Priority Queue
type PriorityQueue []*Node

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].F() < pq[j].F() }
func (pq PriorityQueue) Swap(i, j int) {
    pq[i], pq[j] = pq[j], pq[i]
    pq[i].Index = i
    pq[j].Index = j
}
func (pq *PriorityQueue) Push(x interface{}) {
    n := x.(*Node)
    n.Index = len(*pq)
    *pq = append(*pq, n)
}
func (pq *PriorityQueue) Pop() interface{} {
    old := *pq
    n := old[len(old)-1]
    *pq = old[0 : len(old)-1]
    return n
}

func Heuristic(a, b Point) float64 {
    return math.Abs(float64(a.X-b.X)) + math.Abs(float64(a.Y-b.Y))
}

func AStar(start, goal Point, isWalkable func(Point) bool) []Point {
    openSet := &PriorityQueue{}
    heap.Init(openSet)
    
    startNode := &Node{Pos: start, G: 0, H: Heuristic(start, goal)}
    heap.Push(openSet, startNode)
    
    closedSet := make(map[Point]bool)
    gScore := make(map[Point]float64)
    gScore[start] = 0
    
    directions := []Point{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}
    
    for openSet.Len() > 0 {
        current := heap.Pop(openSet).(*Node)
        
        if current.Pos == goal {
            return reconstructPath(current)
        }
        
        closedSet[current.Pos] = true
        
        for _, dir := range directions {
            neighbor := Point{current.Pos.X + dir.X, current.Pos.Y + dir.Y}
            
            if closedSet[neighbor] || !isWalkable(neighbor) {
                continue
            }
            
            tentativeG := current.G + 1
            
            if g, exists := gScore[neighbor]; !exists || tentativeG < g {
                gScore[neighbor] = tentativeG
                node := &Node{
                    Pos:    neighbor,
                    G:      tentativeG,
                    H:      Heuristic(neighbor, goal),
                    Parent: current,
                }
                heap.Push(openSet, node)
            }
        }
    }
    
    return nil // No path found
}

func reconstructPath(node *Node) []Point {
    path := []Point{}
    for node != nil {
        path = append([]Point{node.Pos}, path...)
        node = node.Parent
    }
    return path
}
```

### A* Optimization Techniques
```
1. JUMP POINT SEARCH (JPS)
   - Skip intermediate nodes in straight lines
   - 10-100x faster on uniform grids
   - Best for open areas

2. HIERARCHICAL PATHFINDING (HPA*)
   - Divide map into clusters
   - Pre-compute cluster edges
   - Fast for large maps

3. NAVIGATION MESH (NavMesh)
   - Polygonal regions instead of grid
   - Better for complex shapes
   - Used in 3D games

4. FLOW FIELDS
   - Pre-compute direction vectors
   - Good for many agents same target
   - RTS games use this

5. CACHING
   - Store recent paths
   - Invalidate on map change
   - Share paths between similar agents
```

### Pathfinding Performance Budget
```
PER FRAME (60 FPS = 16.67ms):
- Max 1-2ms for ALL pathfinding
- Queue expensive paths across frames
- Max 100 nodes explored per frame per agent

STRATEGIES:
- Limit path recalculation: Every 0.5s, not every frame
- Use waypoints: Path to intermediate points
- LOD pathfinding: Rough path first, refine nearby
- Fail fast: Abort if goal unreachable
```

---

## 🎮 Bot Behavior Design

### Finite State Machine (FSM)
```
BASIC CHASER FSM:

STATES:
┌─────────┐    player_far    ┌─────────┐
│  IDLE   │ ───────────────► │ PATROL  │
└─────────┘                  └─────────┘
     │                            │
     │ player_spotted             │ player_near
     ▼                            ▼
┌─────────┐    player_lost   ┌─────────┐
│ SEARCH  │ ◄─────────────── │  CHASE  │
└─────────┘                  └─────────┘
     │                            │
     │ timeout                    │ player_powered
     ▼                            ▼
┌─────────┐                  ┌─────────┐
│ RETURN  │                  │  FLEE   │
└─────────┘                  └─────────┘

TRANSITIONS:
- IDLE → PATROL: No player detected, start patrolling
- PATROL → CHASE: Player within sight range
- CHASE → FLEE: Player activates power-up
- FLEE → CHASE: Power-up expires
- CHASE → SEARCH: Lost sight of player
- SEARCH → RETURN: Search timeout, go to home position
```

### FSM Implementation (Go)
```go
package bot

type State int

const (
    StateIdle State = iota
    StatePatrol
    StateChase
    StateFlee
    StateSearch
    StateReturn
)

type Bot struct {
    State       State
    Position    Point
    Target      *Point
    HomePos     Point
    Speed       float64
    SightRange  float64
    LastSeen    Point
    SearchTimer float64
}

func (b *Bot) Update(player Point, playerPowered bool, dt float64) {
    switch b.State {
    case StateIdle:
        if b.canSee(player) {
            b.State = StateChase
            b.Target = &player
        } else {
            b.State = StatePatrol
        }
        
    case StatePatrol:
        b.patrol()
        if b.canSee(player) {
            if playerPowered {
                b.State = StateFlee
            } else {
                b.State = StateChase
            }
            b.Target = &player
        }
        
    case StateChase:
        if playerPowered {
            b.State = StateFlee
        } else if b.canSee(player) {
            b.Target = &player
            b.moveToward(*b.Target)
        } else {
            b.State = StateSearch
            b.LastSeen = player
            b.SearchTimer = 5.0 // 5 seconds
        }
        
    case StateFlee:
        if !playerPowered {
            b.State = StateChase
        } else {
            b.moveAwayFrom(player)
        }
        
    case StateSearch:
        b.SearchTimer -= dt
        b.moveToward(b.LastSeen)
        if b.canSee(player) {
            b.State = StateChase
        } else if b.SearchTimer <= 0 {
            b.State = StateReturn
        }
        
    case StateReturn:
        b.moveToward(b.HomePos)
        if b.distanceTo(b.HomePos) < 1 {
            b.State = StateIdle
        }
        if b.canSee(player) {
            b.State = StateChase
        }
    }
}

func (b *Bot) canSee(target Point) bool {
    return b.distanceTo(target) <= b.SightRange
}
```

### Behavior Trees (More Flexible)
```
STRUCTURE:
┌─ Selector (OR - try until success)
│  ├─ Sequence (AND - all must succeed)
│  │  ├─ Condition: Player Powered?
│  │  └─ Action: Flee
│  │
│  ├─ Sequence
│  │  ├─ Condition: Player Visible?
│  │  └─ Action: Chase
│  │
│  └─ Fallback
│     └─ Action: Patrol

NODE TYPES:
- Composite: Selector, Sequence, Parallel
- Decorator: Inverter, Repeater, Timeout
- Leaf: Condition, Action

ADVANTAGES OVER FSM:
- Hierarchical (easier to organize)
- Reusable subtrees
- Easier to extend
- Better for complex behaviors
```

### Difficulty Scaling
```
BOT DIFFICULTY PARAMETERS:

EASY:
- Speed: 80% of player
- Sight Range: 5 tiles
- Reaction Time: 500ms
- Path Accuracy: Sometimes takes wrong turns
- Chase Duration: Short (gives up easily)

MEDIUM:
- Speed: 100% of player
- Sight Range: 8 tiles
- Reaction Time: 250ms
- Path Accuracy: Usually optimal
- Chase Duration: Medium

HARD:
- Speed: 110% of player
- Sight Range: 12 tiles
- Reaction Time: 100ms
- Path Accuracy: Always optimal
- Chase Duration: Long (persistent)

NIGHTMARE:
- Speed: 120% of player
- Sight Range: Unlimited (always knows location)
- Reaction Time: 50ms
- Path Accuracy: Predictive (intercepts)
- Chase Duration: Never gives up

ADAPTIVE DIFFICULTY:
- Track player deaths
- Too many deaths → reduce difficulty
- Too few → increase difficulty
- Hidden rubber-banding
```

---

## 🎯 Pac-Man Ghost AI (Classic Reference)

### Original Ghost Personalities
```
BLINKY (Red) - "Shadow"
- Target: Player's current tile
- Behavior: Direct chase
- Gets faster as pellets decrease
- Most aggressive

PINKY (Pink) - "Speedy"  
- Target: 4 tiles AHEAD of player
- Behavior: Ambush from front
- Tries to cut off escape routes

INKY (Cyan) - "Bashful"
- Target: Complex calculation
  - Draw vector from Blinky to 2 tiles ahead of player
  - Double that vector
- Behavior: Unpredictable, flanks

CLYDE (Orange) - "Pokey"
- Target: If > 8 tiles from player → chase
           If ≤ 8 tiles → retreat to corner
- Behavior: Shy, keeps distance
- Creates gaps in coordination
```

### MazeChase Chaser Personalities
```
STALKER (Based on Blinky):
- Always targets player
- Relentless pursuit
- Good for pressure

AMBUSHER (Based on Pinky):
- Predicts player movement
- Appears ahead
- Creates tension

FLANKER (Based on Inky):
- Works with other chasers
- Unpredictable patterns
- Blocks escape routes

GUARDIAN (Based on Clyde):
- Protects specific area
- Attacks if player enters zone
- Creates safe/danger zones

RANDOM (Chaos element):
- Random movement 50% of time
- Occasionally brilliant, often dumb
- Comic relief, reduces frustration
```

### Scatter Mode (Give Player Breathing Room)
```
IMPLEMENTATION:
- Every X seconds, chasers scatter
- Each goes to assigned corner
- 5-7 second scatter duration
- Reduces stress, allows collection

TIMING:
- First scatter: 7 seconds after start
- Subsequent: After chase periods of 20-25 seconds
- Scatter duration: 5-7 seconds

VISUAL INDICATOR:
- Chasers turn slightly transparent
- Different movement animation
- Player learns the pattern
```

---

## 🧠 Advanced AI Techniques

### Steering Behaviors (Craig Reynolds)
```
BASIC BEHAVIORS:
- Seek: Move toward target
- Flee: Move away from target
- Arrive: Seek with deceleration
- Wander: Random movement
- Pursue: Seek predicted position
- Evade: Flee predicted position

COMBINING:
- Weighted sum of behaviors
- Priority-based selection
- Context-sensitive switching

EXAMPLE:
chase_force = seek(player) * 1.0
avoid_force = flee(powered_player) * 2.0
wander_force = wander() * 0.3
total = chase_force + avoid_force + wander_force
```

### Utility AI
```
CONCEPT:
Score each action, pick highest

EXAMPLE FOR CHASER:
actions = {
    "chase": utility_chase(player_distance, player_powered),
    "flee": utility_flee(player_powered, distance_to_safe),
    "patrol": utility_patrol(boredom_level),
    "ambush": utility_ambush(player_direction, junction_nearby)
}
best_action = max(actions)

UTILITY FUNCTIONS:
utility_chase = (1 / distance) * (powered ? 0.1 : 1.0) * aggression
utility_flee = powered ? (1 / safe_distance) : 0
utility_patrol = 0.3 + (time_since_saw_player * 0.1)
```

### Machine Learning in Games (Overview)
```
APPLICATIONS:
1. Player Modeling: Predict player behavior
2. Difficulty Adjustment: Learn optimal challenge
3. Animation: Motion matching
4. NPC Dialogue: Response generation

NOT RECOMMENDED FOR:
- Core gameplay (unpredictable)
- Real-time decisions (latency)
- Small indie games (overkill)

FOR MAZECHASE:
- Traditional AI is sufficient
- Consider ML for analytics only
- Keep bots deterministic for fairness
```

---

## ⚡ Performance Optimization

### AI Update Budgets
```
TARGET: 60 FPS = 16.67ms per frame
AI BUDGET: 2-3ms max

DISTRIBUTION:
- Pathfinding: 1ms
- State updates: 0.5ms
- Collision prediction: 0.5ms
- Behavior decisions: 0.5ms

STRATEGIES:
- Stagger updates: Not all bots every frame
- LOD AI: Simple AI for distant bots
- Pool objects: Reuse path arrays
- Cache: Store repeated calculations
```

### Bot Update Scheduling
```go
type BotScheduler struct {
    bots      []*Bot
    frame     int
    groupSize int
}

func (s *BotScheduler) Update(dt float64) {
    // Update 1/3 of bots each frame (round-robin)
    start := (s.frame % 3) * len(s.bots) / 3
    end := start + len(s.bots) / 3
    
    for i := start; i < end; i++ {
        s.bots[i].Update(dt)
    }
    s.frame++
}

// Result: Each bot updates at 20 FPS instead of 60
// Imperceptible difference, 3x performance gain
```

---

## 📚 Sources & Further Reading

### Books
- "Programming Game AI by Example" - Mat Buckland
- "AI for Games" - Ian Millington
- "Behavioral Mathematics for Game AI" - Dave Mark

### GDC Talks
- "The AI of Pac-Man" (Classic)
- "Building a Better Centaur: AI at Riot Games"
- "The Last of Us AI" 
- "Goal-Oriented Action Planning"

### Online Resources
- Red Blob Games (redblobgames.com) - Excellent pathfinding tutorials
- AI Game Dev (aigamedev.com)
- Game AI Pro (book series, free articles)

---

*Last Updated: December 2024*
*For use by AI testers - pathfinding & bot AI expertise*
