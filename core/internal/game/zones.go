package game

import (
	"encoding/json"
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

// TimePhase represents day/night cycle
type TimePhase string

const (
	PhaseDay   TimePhase = "day"
	PhaseDusk  TimePhase = "dusk"
	PhaseNight TimePhase = "night"
	PhaseDawn  TimePhase = "dawn"
)

// Zone represents a sector in the maze
type Zone struct {
	ID       int      `json:"id"`
	Type     ZoneType `json:"type"`
	X        int      `json:"x"`
	Y        int      `json:"y"`
	Width    int      `json:"width"`
	Height   int      `json:"height"`
	IsActive bool     `json:"isActive"` // Safe zones can deactivate at night
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
	MazeWidth       int
	MazeHeight      int
	ticker          *time.Ticker
	stopChan        chan struct{}
	broadcastFunc   func(msgType string, data interface{})
}

// NewDynamicWorld creates a new dynamic world system
func NewDynamicWorld(mazeWidth, mazeHeight int) *DynamicWorld {
	dw := &DynamicWorld{
		Zones:         make([]Zone, 0),
		CurrentPhase:  PhaseDay,
		PhaseProgress: 0,
		PhaseDuration: 30 * time.Second, // Each phase lasts 30 seconds
		MazeUpdates:   make([]MazeUpdate, 0),
		MazeWidth:     mazeWidth,
		MazeHeight:    mazeHeight,
		stopChan:      make(chan struct{}),
	}
	
	// Generate initial zones
	dw.generateZones()
	
	return dw
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
	
	dw.MazeUpdates = append(dw.MazeUpdates, update)
	
	// Broadcast maze update
	if dw.broadcastFunc != nil {
		dw.broadcastFunc("maze_update", update)
	}
}

// GetCurrentZone returns the zone containing the given coordinates
func (dw *DynamicWorld) GetZoneAt(x, y int) *Zone {
	dw.mu.RLock()
	defer dw.mu.RUnlock()
	
	for i := range dw.Zones {
		z := &dw.Zones[i]
		if x >= z.X && x < z.X+z.Width && y >= z.Y && y < z.Y+z.Height {
			return z
		}
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

// Note: abs function is defined in pathfinding.go
