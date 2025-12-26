package game

import (
	"math"
	"math/rand"
	"sync"
	"time"
)

// EntityType represents the type of dangerous entity
type EntityType string

const (
	EntityHunter  EntityType = "hunter"  // Actively chases players
	EntityScanner EntityType = "scanner" // Has detection cone, alerts others
	EntitySweeper EntityType = "sweeper" // Patrols paths systematically
)

// EntityState represents the current state of an entity
type EntityState string

const (
	StatePatrol    EntityState = "patrol"    // Normal movement
	StateAlert     EntityState = "alert"     // Detected something
	StateChase     EntityState = "chase"     // Actively pursuing
	StateReturn    EntityState = "return"    // Returning to patrol
	StateDormant   EntityState = "dormant"   // Inactive (during day in safe zones)
)

// DangerEntity represents an AI-controlled dangerous entity
type DangerEntity struct {
	ID            string      `json:"id"`
	Type          EntityType  `json:"type"`
	State         EntityState `json:"state"`
	X             float64     `json:"x"`
	Y             float64     `json:"y"`
	Dir           string      `json:"dir"`
	Speed         float64     `json:"speed"`         // Tiles per second
	DetectionRange float64    `json:"detectionRange"` // Detection radius in tiles
	ScanAngle     float64     `json:"scanAngle"`     // For scanners: cone angle in radians
	ScanDirection float64     `json:"scanDir"`       // For scanners: current scan direction
	TargetX       float64     `json:"targetX"`
	TargetY       float64     `json:"targetY"`
	PatrolPath    []Point     `json:"patrolPath"`    // Using Point from utils.go
	PatrolIndex   int         `json:"patrolIndex"`
	HomeZone      int         `json:"homeZone"`      // Zone ID where this entity spawns
	AlertLevel    float64     `json:"alertLevel"`    // 0-1, how alert the entity is
	GlowIntensity float64     `json:"glowIntensity"` // For visual effects
	GlowColor     string      `json:"glowColor"`
}

// Note: Point struct is defined in utils.go

// EntityManager handles all dangerous entities
type EntityManager struct {
	mu            sync.RWMutex
	Entities      map[string]*DangerEntity
	ticker        *time.Ticker
	stopChan      chan struct{}
	mazeWidth     int
	mazeHeight    int
	mazeData      [][]int // 0 = walkable, 1 = wall
	dynamicWorld  *DynamicWorld
	broadcastFunc func(msgType string, data interface{})
	getPlayers    func() []PlayerPosition
}

// PlayerPosition for tracking player locations
type PlayerPosition struct {
	ID string
	X  float64
	Y  float64
}

// NewEntityManager creates a new entity manager
func NewEntityManager(mazeWidth, mazeHeight int, dynamicWorld *DynamicWorld) *EntityManager {
	em := &EntityManager{
		Entities:     make(map[string]*DangerEntity),
		stopChan:     make(chan struct{}),
		mazeWidth:    mazeWidth,
		mazeHeight:   mazeHeight,
		dynamicWorld: dynamicWorld,
	}
	
	return em
}

// SetMazeData provides the current maze layout
func (em *EntityManager) SetMazeData(maze [][]int) {
	em.mu.Lock()
	defer em.mu.Unlock()
	em.mazeData = maze
}

// SetBroadcastFunc sets the function to broadcast entity updates
func (em *EntityManager) SetBroadcastFunc(fn func(msgType string, data interface{})) {
	em.mu.Lock()
	defer em.mu.Unlock()
	em.broadcastFunc = fn
}

// SetGetPlayersFunc sets the function to get player positions
func (em *EntityManager) SetGetPlayersFunc(fn func() []PlayerPosition) {
	em.mu.Lock()
	defer em.mu.Unlock()
	em.getPlayers = fn
}

// SpawnInitialEntities creates the starting entities based on zones
func (em *EntityManager) SpawnInitialEntities() {
	em.mu.Lock()
	defer em.mu.Unlock()
	
	entityID := 0
	
	// Spawn entities in danger zones
	for _, zone := range em.dynamicWorld.Zones {
		if zone.Type == ZoneDanger {
			// Spawn 1 Hunter
			em.spawnEntity(entityID, EntityHunter, zone)
			entityID++
			
			// Spawn 1 Scanner
			em.spawnEntity(entityID, EntityScanner, zone)
			entityID++
		} else if zone.Type == ZoneNeutral {
			// Spawn 1 Sweeper in neutral zones
			em.spawnEntity(entityID, EntitySweeper, zone)
			entityID++
		}
	}
}

// spawnEntity creates a new entity in a zone
func (em *EntityManager) spawnEntity(id int, entityType EntityType, zone Zone) {
	// Random position within zone
	x := float64(zone.X) + rand.Float64()*float64(zone.Width)
	y := float64(zone.Y) + rand.Float64()*float64(zone.Height)
	
	entity := &DangerEntity{
		ID:       generateEntityID(id),
		Type:     entityType,
		State:    StatePatrol,
		X:        x,
		Y:        y,
		Dir:      "right",
		HomeZone: zone.ID,
	}
	
	// Set type-specific properties
	switch entityType {
	case EntityHunter:
		entity.Speed = 2.5
		entity.DetectionRange = 4.0
		entity.GlowColor = "#ff3333" // Red glow
		entity.GlowIntensity = 0.8
		
	case EntityScanner:
		entity.Speed = 1.5
		entity.DetectionRange = 8.0
		entity.ScanAngle = math.Pi / 3 // 60 degree cone
		entity.ScanDirection = 0
		entity.GlowColor = "#ffaa00" // Orange glow
		entity.GlowIntensity = 0.6
		
	case EntitySweeper:
		entity.Speed = 2.0
		entity.DetectionRange = 2.5
		entity.GlowColor = "#aa33ff" // Purple glow
		entity.GlowIntensity = 0.5
		entity.PatrolPath = em.generatePatrolPath(zone)
	}
	
	em.Entities[entity.ID] = entity
}

// generatePatrolPath creates a patrol route for sweepers
func (em *EntityManager) generatePatrolPath(zone Zone) []Point {
	path := make([]Point, 0)
	
	// Create a rectangular patrol within the zone
	margin := 2.0
	path = append(path, Point{X: float64(zone.X) + margin, Y: float64(zone.Y) + margin})
	path = append(path, Point{X: float64(zone.X+zone.Width) - margin, Y: float64(zone.Y) + margin})
	path = append(path, Point{X: float64(zone.X+zone.Width) - margin, Y: float64(zone.Y+zone.Height) - margin})
	path = append(path, Point{X: float64(zone.X) + margin, Y: float64(zone.Y+zone.Height) - margin})
	
	return path
}

// Start begins the entity update loop
func (em *EntityManager) Start() {
	em.ticker = time.NewTicker(50 * time.Millisecond) // 20 updates per second
	
	go func() {
		for {
			select {
			case <-em.ticker.C:
				em.update()
			case <-em.stopChan:
				em.ticker.Stop()
				return
			}
		}
	}()
}

// Stop halts entity updates
func (em *EntityManager) Stop() {
	close(em.stopChan)
}

// update processes entity AI each tick
func (em *EntityManager) update() {
	em.mu.Lock()
	defer em.mu.Unlock()
	
	// Get current player positions
	var players []PlayerPosition
	if em.getPlayers != nil {
		players = em.getPlayers()
	}
	
	// Get current phase for behavior modification
	currentPhase := em.dynamicWorld.CurrentPhase
	
	updates := make([]map[string]interface{}, 0)
	
	for _, entity := range em.Entities {
		// Entities are more aggressive at night
		aggressionMultiplier := 1.0
		if currentPhase == PhaseNight {
			aggressionMultiplier = 1.5
		} else if currentPhase == PhaseDusk || currentPhase == PhaseDawn {
			aggressionMultiplier = 1.25
		}
		
		// Update based on entity type
		switch entity.Type {
		case EntityHunter:
			em.updateHunter(entity, players, aggressionMultiplier)
		case EntityScanner:
			em.updateScanner(entity, players, aggressionMultiplier)
		case EntitySweeper:
			em.updateSweeper(entity, players, aggressionMultiplier)
		}
		
		// Update glow based on alert level
		entity.GlowIntensity = 0.5 + (entity.AlertLevel * 0.5)
		
		updates = append(updates, map[string]interface{}{
			"id":        entity.ID,
			"type":      entity.Type,
			"state":     entity.State,
			"x":         entity.X,
			"y":         entity.Y,
			"dir":       entity.Dir,
			"glow":      entity.GlowIntensity,
			"glowColor": entity.GlowColor,
			"alert":     entity.AlertLevel,
		})
	}
	
	// Broadcast entity updates
	if em.broadcastFunc != nil && len(updates) > 0 {
		em.broadcastFunc("entities_update", updates)
	}
}

// updateHunter processes hunter AI
func (em *EntityManager) updateHunter(entity *DangerEntity, players []PlayerPosition, aggression float64) {
	// Find nearest player
	nearestPlayer, distance := em.findNearestPlayer(entity, players)
	
	detectionRange := entity.DetectionRange * aggression
	
	switch entity.State {
	case StatePatrol:
		// Random wandering
		em.randomMovement(entity, 0.05)
		
		// Check for players
		if distance < detectionRange && nearestPlayer != nil {
			entity.State = StateChase
			entity.TargetX = nearestPlayer.X
			entity.TargetY = nearestPlayer.Y
			entity.AlertLevel = 1.0
		}
		
	case StateChase:
		// Move toward target
		if nearestPlayer != nil {
			em.moveToward(entity, nearestPlayer.X, nearestPlayer.Y, entity.Speed*aggression)
			entity.TargetX = nearestPlayer.X
			entity.TargetY = nearestPlayer.Y
		}
		
		// Lose interest if player escapes
		if distance > detectionRange*1.5 {
			entity.State = StateReturn
			entity.AlertLevel = 0.5
		}
		
	case StateReturn:
		// Return to home zone
		em.randomMovement(entity, 0.05)
		entity.AlertLevel = math.Max(0, entity.AlertLevel-0.01)
		
		if entity.AlertLevel <= 0 {
			entity.State = StatePatrol
		}
	}
}

// updateScanner processes scanner AI
func (em *EntityManager) updateScanner(entity *DangerEntity, players []PlayerPosition, aggression float64) {
	// Rotate scan direction
	entity.ScanDirection += 0.02 * aggression
	if entity.ScanDirection > 2*math.Pi {
		entity.ScanDirection -= 2 * math.Pi
	}
	
	// Check if any player is in scan cone
	for _, player := range players {
		if em.isInScanCone(entity, player.X, player.Y) {
			entity.State = StateAlert
			entity.AlertLevel = 1.0
			
			// Alert nearby hunters
			em.alertNearbyHunters(entity.X, entity.Y, player.X, player.Y)
			break
		}
	}
	
	// Slow movement while scanning
	em.randomMovement(entity, 0.02)
	
	// Decay alert level
	if entity.State == StateAlert {
		entity.AlertLevel -= 0.02
		if entity.AlertLevel <= 0 {
			entity.State = StatePatrol
			entity.AlertLevel = 0
		}
	}
}

// updateSweeper processes sweeper AI
func (em *EntityManager) updateSweeper(entity *DangerEntity, players []PlayerPosition, aggression float64) {
	// Follow patrol path
	if len(entity.PatrolPath) > 0 {
		target := entity.PatrolPath[entity.PatrolIndex]
		
		dist := math.Sqrt(math.Pow(target.X-entity.X, 2) + math.Pow(target.Y-entity.Y, 2))
		
		if dist < 0.5 {
			// Move to next patrol point
			entity.PatrolIndex = (entity.PatrolIndex + 1) % len(entity.PatrolPath)
		} else {
			em.moveToward(entity, target.X, target.Y, entity.Speed*aggression)
		}
	}
	
	// Check for players in detection range
	_, distance := em.findNearestPlayer(entity, players)
	
	if distance < entity.DetectionRange {
		entity.AlertLevel = math.Min(1.0, entity.AlertLevel+0.1)
		entity.GlowIntensity = 0.8 + entity.AlertLevel*0.2
	} else {
		entity.AlertLevel = math.Max(0, entity.AlertLevel-0.02)
	}
}

// isInScanCone checks if a point is within the scanner's detection cone
func (em *EntityManager) isInScanCone(scanner *DangerEntity, px, py float64) bool {
	dx := px - scanner.X
	dy := py - scanner.Y
	distance := math.Sqrt(dx*dx + dy*dy)
	
	if distance > scanner.DetectionRange {
		return false
	}
	
	angle := math.Atan2(dy, dx)
	angleDiff := math.Abs(angle - scanner.ScanDirection)
	
	// Normalize angle difference
	if angleDiff > math.Pi {
		angleDiff = 2*math.Pi - angleDiff
	}
	
	return angleDiff < scanner.ScanAngle/2
}

// alertNearbyHunters notifies hunters of a player location
func (em *EntityManager) alertNearbyHunters(scannerX, scannerY, playerX, playerY float64) {
	alertRadius := 10.0
	
	for _, entity := range em.Entities {
		if entity.Type == EntityHunter {
			dist := math.Sqrt(math.Pow(entity.X-scannerX, 2) + math.Pow(entity.Y-scannerY, 2))
			
			if dist < alertRadius {
				entity.State = StateChase
				entity.TargetX = playerX
				entity.TargetY = playerY
				entity.AlertLevel = 0.8
			}
		}
	}
}

// findNearestPlayer finds the closest player to an entity
func (em *EntityManager) findNearestPlayer(entity *DangerEntity, players []PlayerPosition) (*PlayerPosition, float64) {
	var nearest *PlayerPosition
	minDist := math.MaxFloat64
	
	for i := range players {
		dist := math.Sqrt(math.Pow(players[i].X-entity.X, 2) + math.Pow(players[i].Y-entity.Y, 2))
		if dist < minDist {
			minDist = dist
			nearest = &players[i]
		}
	}
	
	return nearest, minDist
}

// moveToward moves an entity toward a target position
func (em *EntityManager) moveToward(entity *DangerEntity, targetX, targetY, speed float64) {
	dx := targetX - entity.X
	dy := targetY - entity.Y
	dist := math.Sqrt(dx*dx + dy*dy)
	
	if dist < 0.1 {
		return
	}
	
	// Normalize and apply speed (multiply by tick rate: 0.05 seconds)
	entity.X += (dx / dist) * speed * 0.05
	entity.Y += (dy / dist) * speed * 0.05
	
	// Update direction
	if math.Abs(dx) > math.Abs(dy) {
		if dx > 0 {
			entity.Dir = "right"
		} else {
			entity.Dir = "left"
		}
	} else {
		if dy > 0 {
			entity.Dir = "down"
		} else {
			entity.Dir = "up"
		}
	}
}

// randomMovement makes the entity wander randomly
func (em *EntityManager) randomMovement(entity *DangerEntity, speed float64) {
	// Slight random direction changes
	entity.X += (rand.Float64()*2 - 1) * speed
	entity.Y += (rand.Float64()*2 - 1) * speed
	
	// Clamp to maze bounds
	entity.X = math.Max(1, math.Min(float64(em.mazeWidth-1), entity.X))
	entity.Y = math.Max(1, math.Min(float64(em.mazeHeight-1), entity.Y))
}

// GetEntitiesJSON returns entities for client
func (em *EntityManager) GetEntitiesJSON() []map[string]interface{} {
	em.mu.RLock()
	defer em.mu.RUnlock()
	
	result := make([]map[string]interface{}, 0, len(em.Entities))
	
	for _, entity := range em.Entities {
		result = append(result, map[string]interface{}{
			"id":             entity.ID,
			"type":           entity.Type,
			"state":          entity.State,
			"x":              entity.X,
			"y":              entity.Y,
			"dir":            entity.Dir,
			"glowIntensity":  entity.GlowIntensity,
			"glowColor":      entity.GlowColor,
			"alertLevel":     entity.AlertLevel,
			"scanDirection":  entity.ScanDirection,
			"scanAngle":      entity.ScanAngle,
			"detectionRange": entity.DetectionRange,
		})
	}
	
	return result
}

// CheckPlayerCollision checks if a player collides with any entity
func (em *EntityManager) CheckPlayerCollision(playerX, playerY float64) *DangerEntity {
	em.mu.RLock()
	defer em.mu.RUnlock()
	
	collisionRadius := 0.5
	
	for _, entity := range em.Entities {
		dist := math.Sqrt(math.Pow(entity.X-playerX, 2) + math.Pow(entity.Y-playerY, 2))
		if dist < collisionRadius {
			return entity
		}
	}
	
	return nil
}

// generateEntityID creates a unique entity ID
func generateEntityID(num int) string {
	types := []string{"H", "S", "W"} // Hunter, Scanner, sWeeper
	return types[num%3] + "-" + randomString(4)
}

// randomString generates a random alphanumeric string
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
