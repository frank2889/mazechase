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
	lastBroadcast map[string]entitySnapshot // For delta compression (Item #45)
}

// entitySnapshot stores last broadcast state for delta encoding
type entitySnapshot struct {
	X             float64
	Y             float64
	State         EntityState
	GlowIntensity float64
	AlertLevel    float64
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
		Entities:      make(map[string]*DangerEntity),
		stopChan:      make(chan struct{}),
		mazeWidth:     mazeWidth,
		mazeHeight:    mazeHeight,
		dynamicWorld:  dynamicWorld,
		lastBroadcast: make(map[string]entitySnapshot), // Item #45: delta compression
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
	// Find a valid spawn position (not in a wall)
	var x, y float64
	maxAttempts := 20
	for attempt := 0; attempt < maxAttempts; attempt++ {
		x = float64(zone.X) + rand.Float64()*float64(zone.Width)
		y = float64(zone.Y) + rand.Float64()*float64(zone.Height)
		
		// Check if position is walkable
		if em.isWalkable(x, y) {
			break
		}
	}
	
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

// generatePatrolPath creates a patrol route for sweepers with walkable validation
func (em *EntityManager) generatePatrolPath(zone Zone) []Point {
	path := make([]Point, 0)
	
	// Create a rectangular patrol within the zone
	margin := 2.0
	candidates := []Point{
		{X: float64(zone.X) + margin, Y: float64(zone.Y) + margin},
		{X: float64(zone.X+zone.Width) - margin, Y: float64(zone.Y) + margin},
		{X: float64(zone.X+zone.Width) - margin, Y: float64(zone.Y+zone.Height) - margin},
		{X: float64(zone.X) + margin, Y: float64(zone.Y+zone.Height) - margin},
	}
	
	// Only add walkable waypoints
	for _, candidate := range candidates {
		if em.isWalkable(candidate.X, candidate.Y) {
			path = append(path, candidate)
		} else {
			// Try to find a nearby walkable position
			for dx := -1.0; dx <= 1.0; dx++ {
				for dy := -1.0; dy <= 1.0; dy++ {
					newX, newY := candidate.X+dx, candidate.Y+dy
					if em.isWalkable(newX, newY) {
						path = append(path, Point{X: newX, Y: newY})
						break
					}
				}
			}
		}
	}
	
	// Ensure at least 2 waypoints for patrol
	if len(path) < 2 {
		// Fallback: use center of zone
		centerX := float64(zone.X) + float64(zone.Width)/2
		centerY := float64(zone.Y) + float64(zone.Height)/2
		path = []Point{
			{X: centerX - 2, Y: centerY},
			{X: centerX + 2, Y: centerY},
		}
	}
	
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
		// Simplified: constant aggression (AI recommendation - variable was too complex)
		const aggressionMultiplier = 1.0
		_ = currentPhase // Suppress unused warning, kept for potential future use
		
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
		
		// Delta compression (Item #45): only send changed properties
		update := em.createDeltaUpdate(entity)
		if update != nil {
			updates = append(updates, update)
		}
	}
	
	// Broadcast entity updates
	if em.broadcastFunc != nil && len(updates) > 0 {
		em.broadcastFunc("entities_update", updates)
	}
}

// createDeltaUpdate creates a delta-compressed update for an entity (Item #45)
func (em *EntityManager) createDeltaUpdate(entity *DangerEntity) map[string]interface{} {
	last, exists := em.lastBroadcast[entity.ID]
	
	// Always send full update for new entities or state changes
	if !exists || last.State != entity.State {
		em.lastBroadcast[entity.ID] = entitySnapshot{
			X:             entity.X,
			Y:             entity.Y,
			State:         entity.State,
			GlowIntensity: entity.GlowIntensity,
			AlertLevel:    entity.AlertLevel,
		}
		return map[string]interface{}{
			"id":        entity.ID,
			"type":      entity.Type,
			"state":     entity.State,
			"x":         entity.X,
			"y":         entity.Y,
			"dir":       entity.Dir,
			"glow":      entity.GlowIntensity,
			"glowColor": entity.GlowColor,
			"alert":     entity.AlertLevel,
		}
	}
	
	// Check if position changed significantly (threshold: 0.05 units)
	posChanged := (entity.X-last.X)*(entity.X-last.X)+(entity.Y-last.Y)*(entity.Y-last.Y) > 0.0025
	glowChanged := entity.GlowIntensity != last.GlowIntensity || entity.AlertLevel != last.AlertLevel
	
	if !posChanged && !glowChanged {
		return nil // No significant change
	}
	
	delta := map[string]interface{}{
		"id": entity.ID,
	}
	
	if posChanged {
		delta["x"] = entity.X
		delta["y"] = entity.Y
		delta["dir"] = entity.Dir
	}
	if glowChanged {
		delta["glow"] = entity.GlowIntensity
		delta["alert"] = entity.AlertLevel
	}
	
	// Update snapshot
	em.lastBroadcast[entity.ID] = entitySnapshot{
		X:             entity.X,
		Y:             entity.Y,
		State:         entity.State,
		GlowIntensity: entity.GlowIntensity,
		AlertLevel:    entity.AlertLevel,
	}
	
	return delta
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
		// Use A* pathfinding if available, otherwise direct movement
		if nearestPlayer != nil {
			path := em.findPathToPlayer(entity, nearestPlayer)
			if len(path) > 1 {
				// Move toward next waypoint in path
				nextPoint := path[1] // path[0] is current position
				em.moveToward(entity, nextPoint.X, nextPoint.Y, entity.Speed*aggression)
			} else {
				// Fallback to direct movement if no path found
				em.moveToward(entity, nearestPlayer.X, nearestPlayer.Y, entity.Speed*aggression)
			}
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

// moveToward moves an entity toward a target position with wall collision
func (em *EntityManager) moveToward(entity *DangerEntity, targetX, targetY, speed float64) {
	dx := targetX - entity.X
	dy := targetY - entity.Y
	dist := math.Sqrt(dx*dx + dy*dy)
	
	if dist < 0.1 {
		return
	}
	
	// Calculate movement amount
	moveX := (dx / dist) * speed * 0.05
	moveY := (dy / dist) * speed * 0.05
	
	newX := entity.X + moveX
	newY := entity.Y + moveY
	
	// Check wall collision if mazeData is available
	if em.mazeData != nil {
		// Try full movement first
		if !em.isWalkable(newX, newY) {
			// Try moving only in X direction
			if em.isWalkable(entity.X + moveX, entity.Y) {
				newX = entity.X + moveX
				newY = entity.Y
			} else if em.isWalkable(entity.X, entity.Y + moveY) {
				// Try moving only in Y direction
				newX = entity.X
				newY = entity.Y + moveY
			} else {
				// Can't move at all - stay in place
				return
			}
		}
	}
	
	entity.X = newX
	entity.Y = newY
	
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

// isWalkable checks if a position is walkable (not a wall)
func (em *EntityManager) isWalkable(x, y float64) bool {
	if em.mazeData == nil {
		return true // No maze data, assume walkable
	}
	
	// Convert to tile coordinates
	tileX := int(x)
	tileY := int(y)
	
	if tileX < 0 || tileX >= len(em.mazeData[0]) || tileY < 0 || tileY >= len(em.mazeData) {
		return false // Out of bounds
	}
	
	return em.mazeData[tileY][tileX] == 0
}

// findPathToPlayer uses A* to find a path from entity to player
func (em *EntityManager) findPathToPlayer(entity *DangerEntity, player *PlayerPosition) []Point {
	if em.mazeData == nil || player == nil {
		return nil
	}
	
	// Create pathfinding grid
	grid := NewPathGrid(em.mazeWidth, em.mazeHeight)
	
	// Set walls from mazeData
	for y := 0; y < em.mazeHeight && y < len(em.mazeData); y++ {
		for x := 0; x < em.mazeWidth && x < len(em.mazeData[y]); x++ {
			if em.mazeData[y][x] != 0 {
				grid.SetWalkable(x, y, false)
			}
		}
	}
	
	// Create pathfinder and find path
	pathfinder := NewAStarPathfinder(grid)
	startX, startY := int(entity.X), int(entity.Y)
	endX, endY := int(player.X), int(player.Y)
	
	path := pathfinder.FindPath(startX, startY, endX, endY)
	
	// Convert []Point to float coordinates
	result := make([]Point, len(path))
	for i, p := range path {
		result[i] = Point{X: float64(p.X) + 0.5, Y: float64(p.Y) + 0.5}
	}
	
	return result
}

// randomMovement makes the entity wander randomly with wall collision
func (em *EntityManager) randomMovement(entity *DangerEntity, speed float64) {
	// Try a few random directions to find a walkable spot
	for attempts := 0; attempts < 4; attempts++ {
		moveX := (rand.Float64()*2 - 1) * speed
		moveY := (rand.Float64()*2 - 1) * speed
		
		newX := entity.X + moveX
		newY := entity.Y + moveY
		
		// Clamp to maze bounds
		newX = math.Max(1, math.Min(float64(em.mazeWidth-1), newX))
		newY = math.Max(1, math.Min(float64(em.mazeHeight-1), newY))
		
		// Check wall collision
		if em.isWalkable(newX, newY) {
			entity.X = newX
			entity.Y = newY
			return
		}
	}
	// If all attempts failed, stay in place
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
