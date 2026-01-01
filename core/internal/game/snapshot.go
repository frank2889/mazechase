package game

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// StateSnapshot represents a point-in-time snapshot of the game state
// Used for player reconnection and recovery
type StateSnapshot struct {
	Timestamp      time.Time                  `json:"timestamp"`
	MatchStarted   bool                       `json:"matchStarted"`
	IsPoweredUp    bool                       `json:"isPoweredUp"`
	PowerUpEndTime time.Time                  `json:"powerUpEndTime"`
	ActivePowerUp  PowerUpType                `json:"activePowerUp"`
	PelletsEaten   []Point                    `json:"pelletsEaten"`
	PowerUpsEaten  []Point                    `json:"powerUpsEaten"`
	ChasersEaten   []SpriteType               `json:"chasersEaten"`
	Scores         map[string]int             `json:"scores"`
	PlayerStates   map[string]*PlayerSnapshot `json:"playerStates"`
	IsSpeedBoosted bool                       `json:"isSpeedBoosted"`
	IsMagnetActive bool                       `json:"isMagnetActive"`
}

// PlayerSnapshot represents a player's state at snapshot time
type PlayerSnapshot struct {
	PlayerId    string     `json:"playerId"`
	Username    string     `json:"username"`
	SpriteType  SpriteType `json:"spriteType"`
	X           float64    `json:"x"`
	Y           float64    `json:"y"`
	Dir         string     `json:"dir"`
	Loot        int        `json:"loot"`
	IsStunned   bool       `json:"isStunned"`
	IsReady     bool       `json:"isReady"`
	IsSpectator bool       `json:"isSpectator"`
}

// SnapshotManager handles state snapshots for reconnection
type SnapshotManager struct {
	mu             sync.RWMutex
	latestSnapshot *StateSnapshot
	snapshotTicker *time.Ticker
	stopChan       chan struct{}
	world          *World
}

// NewSnapshotManager creates a new snapshot manager for a world
func NewSnapshotManager(world *World) *SnapshotManager {
	return &SnapshotManager{
		world:    world,
		stopChan: make(chan struct{}),
	}
}

// Start begins periodic state snapshots (every 500ms during active game)
func (sm *SnapshotManager) Start() {
	sm.snapshotTicker = time.NewTicker(500 * time.Millisecond)

	go func() {
		for {
			select {
			case <-sm.snapshotTicker.C:
				if sm.world.MatchStarted {
					sm.TakeSnapshot()
				}
			case <-sm.stopChan:
				sm.snapshotTicker.Stop()
				return
			}
		}
	}()

	log.Info().Msg("State snapshot manager started")
}

// Stop halts the snapshot ticker
func (sm *SnapshotManager) Stop() {
	close(sm.stopChan)
}

// TakeSnapshot captures current game state
func (sm *SnapshotManager) TakeSnapshot() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	snapshot := &StateSnapshot{
		Timestamp:      time.Now(),
		MatchStarted:   sm.world.MatchStarted,
		IsPoweredUp:    sm.world.IsPoweredUp,
		PowerUpEndTime: sm.world.PowerUpEndTime,
		ActivePowerUp:  sm.world.ActivePowerUp,
		PelletsEaten:   sm.world.PelletsCoordEaten.GetList(),
		PowerUpsEaten:  sm.world.PowerUpsCoordsEaten.GetList(),
		ChasersEaten:   sm.world.ChasersIdsEaten,
		Scores:         make(map[string]int),
		PlayerStates:   make(map[string]*PlayerSnapshot),
		IsSpeedBoosted: sm.world.IsSpeedBoosted,
		IsMagnetActive: sm.world.IsMagnetActive,
	}

	// Copy scores
	for k, v := range sm.world.Scores {
		snapshot.Scores[k] = v
	}

	// Capture player positions - iterate over keys
	for _, playerId := range sm.world.ConnectedPlayers.GetKeys() {
		// Get player entity from session if available
		if pos, exists := sm.world.PlayerPositions[playerId]; exists {
			snapshot.PlayerStates[playerId] = &PlayerSnapshot{
				PlayerId: playerId,
				X:        pos.X,
				Y:        pos.Y,
			}
		}
	}

	sm.latestSnapshot = snapshot
}

// GetLatestSnapshot returns the most recent snapshot
func (sm *SnapshotManager) GetLatestSnapshot() *StateSnapshot {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.latestSnapshot
}

// GetReconnectState returns JSON state for a reconnecting player
func (sm *SnapshotManager) GetReconnectState(playerId string) ([]byte, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if sm.latestSnapshot == nil {
		return nil, nil // No snapshot available
	}

	reconnectData := map[string]interface{}{
		"type":           "reconnect_state",
		"timestamp":      sm.latestSnapshot.Timestamp,
		"matchStarted":   sm.latestSnapshot.MatchStarted,
		"isPoweredUp":    sm.latestSnapshot.IsPoweredUp,
		"activePowerUp":  sm.latestSnapshot.ActivePowerUp,
		"pelletsEaten":   sm.latestSnapshot.PelletsEaten,
		"powerUpsEaten":  sm.latestSnapshot.PowerUpsEaten,
		"chasersEaten":   sm.latestSnapshot.ChasersEaten,
		"scores":         sm.latestSnapshot.Scores,
		"playerStates":   sm.latestSnapshot.PlayerStates,
		"isSpeedBoosted": sm.latestSnapshot.IsSpeedBoosted,
		"isMagnetActive": sm.latestSnapshot.IsMagnetActive,
	}

	// Add player-specific reconnect info
	if playerState, exists := sm.latestSnapshot.PlayerStates[playerId]; exists {
		reconnectData["yourState"] = playerState
	}

	return json.Marshal(reconnectData)
}

// RestorePlayerState attempts to restore a player's state after reconnect
func (sm *SnapshotManager) RestorePlayerState(playerId string, player *PlayerEntity) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if sm.latestSnapshot == nil {
		return false
	}

	if playerState, exists := sm.latestSnapshot.PlayerStates[playerId]; exists {
		player.X = playerState.X
		player.Y = playerState.Y
		player.Dir = playerState.Dir
		player.Loot = playerState.Loot
		player.IsStunned = playerState.IsStunned
		log.Info().Str("playerId", playerId).Msg("Player state restored from snapshot")
		return true
	}

	return false
}
