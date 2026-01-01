package game

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// ZoneType represents the danger level of a zone
type ZoneType string

const (
	ZoneSafe    ZoneType = "safe"
	ZoneNeutral ZoneType = "neutral"
	ZoneDanger  ZoneType = "danger"
)

// Alias for cleaner message handler code
const (
	SafeZone   = ZoneSafe
	DangerZone = ZoneDanger
)

// TimePhase represents day/night cycle
type TimePhase string

const (
	PhaseDay   TimePhase = "day"
	PhaseDusk  TimePhase = "dusk"
	PhaseNight TimePhase = "night"
	PhaseDawn  TimePhase = "dawn"
)

// Resource represents a collectible resource in a zone (Item #37)
type Resource struct {
	ID     string  `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Value  int     `json:"value"`
	Type   string  `json:"type"` // "common", "rare", "artifact"
}

// Zone represents a sector in the maze
type Zone struct {
	ID        int        `json:"id"`
	Type      ZoneType   `json:"type"`
	X         int        `json:"x"`
	Y         int        `json:"y"`
	Width     int        `json:"width"`
	Height    int        `json:"height"`
	CenterX   int        `json:"centerX"`   // Center for extraction point
	CenterY   int        `json:"centerY"`
	Radius    int        `json:"radius"`    // Zone radius for circular zones
	IsActive  bool       `json:"isActive"`  // Safe zones can deactivate at night
	Resources []Resource `json:"resources"` // Resources in this zone (Item #37)
}

// MazeUpdate represents a change to the maze structure
type MazeUpdate struct {
	Type      string `json:"type"`      // "wall_add", "wall_remove", "wall_move"
	X         int    `json:"x"`
	Y         int    `json:"y"`
	TargetX   int    `json:"targetX,omitempty"`
	TargetY   int    `json:"targetY,omitempty"`
	Duration  int    `json:"duration"` // Animation duration in ms
}

// DynamicWorld handles zone management and maze updates
type DynamicWorld struct {
	mu              sync.RWMutex
	Zones           []Zone          `json:"zones"`
	CurrentPhase    TimePhase       `json:"currentPhase"`
	PhaseProgress   float64         `json:"phaseProgress"` // 0-1 progress through current phase
	PhaseDuration   time.Duration   // How long each phase lasts
	MazeUpdates     []MazeUpdate    `json:"pendingUpdates"`
	DynamicWalls    map[string]bool // Track dynamically added/removed walls
	MazeWidth       int
	MazeHeight      int
	rng             *rand.Rand      // Deterministic RNG for reproducible maze updates (Item #10)
	Seed            int64           `json:"seed"` // RNG seed for client sync
	ticker          *time.Ticker
	stopChan        chan struct{}
	broadcastFunc   func(msgType string, data interface{})
	mazeDataRef     *MazeData       // Reference to main MazeData for collision updates
}

// NewDynamicWorld creates a new dynamic world system
func NewDynamicWorld(mazeWidth, mazeHeight int) *DynamicWorld {
	// Use time-based seed for reproducibility within a session (Item #10)
	seed := time.Now().UnixNano()
	dw := &DynamicWorld{
		Zones:         make([]Zone, 0),
		CurrentPhase:  PhaseDay,
		PhaseProgress: 0,
		PhaseDuration: 30 * time.Second, // Each phase lasts 30 seconds
		MazeUpdates:   make([]MazeUpdate, 0),
		DynamicWalls:  make(map[string]bool),
		MazeWidth:     mazeWidth,
		MazeHeight:    mazeHeight,
		stopChan:      make(chan struct{}),
		rng:           rand.New(rand.NewSource(seed)),
		Seed:          seed,
	}
	
	// Generate initial zones
	dw.generateZones()
	
	return dw
}

// SetMazeDataRef sets the reference to MazeData for collision updates
func (dw *DynamicWorld) SetMazeDataRef(mazeData *MazeData) {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	dw.mazeDataRef = mazeData
}

// SetBroadcastFunc sets the function to broadcast updates to clients
func (dw *DynamicWorld) SetBroadcastFunc(fn func(msgType string, data interface{})) {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	dw.broadcastFunc = fn
}

// generateZones creates the initial zone layout
func (dw *DynamicWorld) generateZones() {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	
	// Create 4 quadrant zones + center safe zone
	quadrantW := dw.MazeWidth / 2
	quadrantH := dw.MazeHeight / 2
	
	// Center safe zone (spawn area)
	dw.Zones = append(dw.Zones, Zone{
		ID:       0,
		Type:     ZoneSafe,
		X:        dw.MazeWidth/4,
		Y:        dw.MazeHeight/4,
		Width:    dw.MazeWidth/2,
		Height:   dw.MazeHeight/2,
		IsActive: true,
	})
	
	// Corner zones with varying danger levels
	corners := []struct{ x, y int }{
		{0, 0},
		{quadrantW, 0},
		{0, quadrantH},
		{quadrantW, quadrantH},
	}
	
	zoneTypes := []ZoneType{ZoneDanger, ZoneNeutral, ZoneNeutral, ZoneDanger}
	
	for i, corner := range corners {
		dw.Zones = append(dw.Zones, Zone{
			ID:       i + 1,
			Type:     zoneTypes[i],
			X:        corner.x,
			Y:        corner.y,
			Width:    quadrantW,
			Height:   quadrantH,
			IsActive: true,
		})
	}
}

// Start begins the dynamic world update loop
func (dw *DynamicWorld) Start() {
	dw.ticker = time.NewTicker(1 * time.Second)
	
	go func() {
		for {
			select {
			case <-dw.ticker.C:
				dw.tick()
			case <-dw.stopChan:
				dw.ticker.Stop()
				return
			}
		}
	}()
}

// Stop halts the dynamic world updates
func (dw *DynamicWorld) Stop() {
	close(dw.stopChan)
}

// tick updates the world state each second
func (dw *DynamicWorld) tick() {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	
	// Update phase progress
	dw.PhaseProgress += 1.0 / dw.PhaseDuration.Seconds()
	
	if dw.PhaseProgress >= 1.0 {
		dw.advancePhase()
	}
	
	// Random chance to modify maze during danger phases
	if dw.CurrentPhase == PhaseNight || dw.CurrentPhase == PhaseDusk {
		if rand.Float64() < 0.1 { // 10% chance per second
			dw.generateMazeUpdate()
		}
	}
	
	// Broadcast phase update periodically
	if dw.broadcastFunc != nil {
		dw.broadcastFunc("phase_update", map[string]interface{}{
			"phase":    dw.CurrentPhase,
			"progress": dw.PhaseProgress,
		})
	}
}

// tickWithResourceSpawn updates world and spawns resources (called externally with unlock)
func (dw *DynamicWorld) TickWithResourceSpawn() {
	dw.tick()
	// Spawn resources separately to avoid holding lock
	dw.SpawnResources()
}

// advancePhase moves to the next time phase
func (dw *DynamicWorld) advancePhase() {
	dw.PhaseProgress = 0
	
	switch dw.CurrentPhase {
	case PhaseDay:
		dw.CurrentPhase = PhaseDusk
	case PhaseDusk:
		dw.CurrentPhase = PhaseNight
		dw.deactivateSafeZones()
	case PhaseNight:
		dw.CurrentPhase = PhaseDawn
	case PhaseDawn:
		dw.CurrentPhase = PhaseDay
		dw.activateSafeZones()
	}
	
	// Broadcast phase change
	if dw.broadcastFunc != nil {
		dw.broadcastFunc("phase_change", map[string]interface{}{
			"newPhase": dw.CurrentPhase,
			"zones":    dw.Zones,
		})
	}
}

// deactivateSafeZones makes safe zones inactive during night
func (dw *DynamicWorld) deactivateSafeZones() {
	for i := range dw.Zones {
		if dw.Zones[i].Type == ZoneSafe {
			dw.Zones[i].IsActive = false
		}
		// Neutral zones become dangerous at night
		if dw.Zones[i].Type == ZoneNeutral {
			dw.Zones[i].Type = ZoneDanger
		}
	}
}

// activateSafeZones reactivates safe zones during day
func (dw *DynamicWorld) activateSafeZones() {
	for i := range dw.Zones {
		if dw.Zones[i].Type == ZoneSafe {
			dw.Zones[i].IsActive = true
		}
	}
	// Reset some danger zones back to neutral
	dw.regenerateNeutralZones()
}

// regenerateNeutralZones restores neutral zones at dawn
func (dw *DynamicWorld) regenerateNeutralZones() {
	neutralCount := 0
	for i := range dw.Zones {
		if dw.Zones[i].Type == ZoneDanger && neutralCount < 2 {
			if rand.Float64() < 0.5 {
				dw.Zones[i].Type = ZoneNeutral
				neutralCount++
			}
		}
	}
}

// generateMazeUpdate creates a random maze modification
func (dw *DynamicWorld) generateMazeUpdate() {
	updateTypes := []string{"wall_add", "wall_remove"}
	updateType := updateTypes[rand.Intn(len(updateTypes))]
	
	// Random position (avoiding edges and spawn areas)
	x := rand.Intn(dw.MazeWidth-4) + 2
	y := rand.Intn(dw.MazeHeight-4) + 2
	
	// Don't modify center safe zone
	centerX, centerY := dw.MazeWidth/2, dw.MazeHeight/2
	if abs(x-centerX) < 3 && abs(y-centerY) < 3 {
		return
	}
	
	update := MazeUpdate{
		Type:     updateType,
		X:        x,
		Y:        y,
		Duration: 500, // 500ms animation
	}
	
	// Apply update to MazeData for collision detection
	dw.applyMazeUpdate(update)
	
	dw.MazeUpdates = append(dw.MazeUpdates, update)
	
	// Cleanup old updates to prevent memory leak (keep last 50)
	if len(dw.MazeUpdates) > 100 {
		dw.MazeUpdates = dw.MazeUpdates[len(dw.MazeUpdates)-50:]
	}
	
	// Broadcast maze update
	if dw.broadcastFunc != nil {
		dw.broadcastFunc("maze_update", update)
	}
}

// applyMazeUpdate updates the MazeData to reflect wall changes
func (dw *DynamicWorld) applyMazeUpdate(update MazeUpdate) {
	key := wallKey(update.X, update.Y)
	
	switch update.Type {
	case "wall_add":
		dw.DynamicWalls[key] = true
		// Update MazeData if reference is set
		if dw.mazeDataRef != nil && update.Y < len(dw.mazeDataRef.Walls) && update.X < len(dw.mazeDataRef.Walls[update.Y]) {
			dw.mazeDataRef.Walls[update.Y][update.X] = true
		}
	case "wall_remove":
		delete(dw.DynamicWalls, key)
		// Update MazeData if reference is set
		if dw.mazeDataRef != nil && update.Y < len(dw.mazeDataRef.Walls) && update.X < len(dw.mazeDataRef.Walls[update.Y]) {
			dw.mazeDataRef.Walls[update.Y][update.X] = false
		}
	}
}

// wallKey generates a unique key for a wall position
func wallKey(x, y int) string {
	return string(rune('0'+x/100)) + string(rune('0'+(x/10)%10)) + string(rune('0'+x%10)) + "_" +
		string(rune('0'+y/100)) + string(rune('0'+(y/10)%10)) + string(rune('0'+y%10))
}

// IsDynamicWall checks if there's a dynamically added wall at position
func (dw *DynamicWorld) IsDynamicWall(x, y int) bool {
	dw.mu.RLock()
	defer dw.mu.RUnlock()
	return dw.DynamicWalls[wallKey(x, y)]
}

// GetCurrentZone returns the zone containing the given coordinates
// Priority: safe > danger > neutral (to handle overlapping zones)
func (dw *DynamicWorld) GetZoneAt(x, y int) *Zone {
	dw.mu.RLock()
	defer dw.mu.RUnlock()
	
	var safeZone, dangerZone, neutralZone *Zone
	
	for i := range dw.Zones {
		z := &dw.Zones[i]
		if x >= z.X && x < z.X+z.Width && y >= z.Y && y < z.Y+z.Height {
			switch z.Type {
			case ZoneSafe:
				safeZone = z
			case ZoneDanger:
				if dangerZone == nil {
					dangerZone = z
				}
			case ZoneNeutral:
				if neutralZone == nil {
					neutralZone = z
				}
			}
		}
	}
	
	// Return by priority
	if safeZone != nil && safeZone.IsActive {
		return safeZone
	}
	if dangerZone != nil {
		return dangerZone
	}
	if neutralZone != nil {
		return neutralZone
	}
	if safeZone != nil {
		return safeZone // Return inactive safe zone as fallback
	}
	return nil
}

// GetZonesJSON returns zones as JSON for client
func (dw *DynamicWorld) GetZonesJSON() ([]byte, error) {
	dw.mu.RLock()
	defer dw.mu.RUnlock()
	
	return json.Marshal(map[string]interface{}{
		"zones":    dw.Zones,
		"phase":    dw.CurrentPhase,
		"progress": dw.PhaseProgress,
	})
}

// SpawnResources spawns resources in danger zones (Item #37)
func (dw *DynamicWorld) SpawnResources() {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	
	resourceCounter := 0
	
	for i := range dw.Zones {
		zone := &dw.Zones[i]
		if zone.Type != ZoneDanger {
			continue
		}
		
		// Limit resources per zone
		if len(zone.Resources) >= 5 {
			continue
		}
		
		// Random chance to spawn
		if dw.rng.Float64() > ResourceSpawnRate {
			continue
		}
		
		// Random position within zone
		x := float64(zone.X) + dw.rng.Float64()*float64(zone.Width)
		y := float64(zone.Y) + dw.rng.Float64()*float64(zone.Height)
		
		// Determine resource type and value
		resourceType := "common"
		value := 1
		
		roll := dw.rng.Float64()
		if roll < 0.05 { // 5% artifact
			resourceType = "artifact"
			value = 10
			if dw.CurrentPhase == PhaseNight {
				value *= NightArtifactBonus // Item #38
			}
		} else if roll < 0.2 { // 15% rare
			resourceType = "rare"
			value = 3
		}
		
		// Danger zone bonus (Item #37)
		value *= DangerZoneBonus
		
		resource := Resource{
			ID:    fmt.Sprintf("res_%d_%d", zone.ID, resourceCounter),
			X:     x * float64(TileSize),
			Y:     y * float64(TileSize),
			Value: value,
			Type:  resourceType,
		}
		resourceCounter++
		
		zone.Resources = append(zone.Resources, resource)
	}
	
	// Broadcast resource spawn
	if dw.broadcastFunc != nil {
		resources := dw.getAllResources()
		dw.broadcastFunc("resource_update", map[string]interface{}{
			"resources": resources,
		})
	}
}

// getAllResources returns all resources across all zones
func (dw *DynamicWorld) getAllResources() []Resource {
	resources := make([]Resource, 0)
	for _, zone := range dw.Zones {
		resources = append(resources, zone.Resources...)
	}
	return resources
}

// RemoveResource removes a resource by ID (Item #39)
func (dw *DynamicWorld) RemoveResource(resourceId string) *Resource {
	dw.mu.Lock()
	defer dw.mu.Unlock()
	
	for i := range dw.Zones {
		for j, res := range dw.Zones[i].Resources {
			if res.ID == resourceId {
				removed := res
				dw.Zones[i].Resources = append(dw.Zones[i].Resources[:j], dw.Zones[i].Resources[j+1:]...)
				return &removed
			}
		}
	}
	return nil
}

// Note: abs function is defined in pathfinding.go
