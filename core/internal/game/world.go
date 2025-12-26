package game

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/frank2889/mazechase/pkg"
	"github.com/olahol/melody"
	"github.com/rs/zerolog/log"
	"sync"
)

// GameOverInfo contains game over details
type GameOverInfo struct {
	Reason string
	Winner string
}

type World struct {
	gameOverChan        chan GameOverInfo
	MatchStarted        bool
	IsPoweredUp         bool
	PowerUpEndTime      time.Time
	PowerUpTimer        *time.Timer
	CharactersList      []SpriteType
	ChasersIdsEaten     []SpriteType
	ConnectedPlayers    *pkg.Map[string, *melody.Session]
	Spectators          *pkg.Map[string, *melody.Session]
	PelletsCoordEaten   CoordList
	PowerUpsCoordsEaten CoordList
	worldLock           sync.Mutex
	BotManager          *BotManager
	botFillScheduled    bool
	HostPlayerId        string
	CountdownStarted    bool
	
	// Maze collision data
	MazeData        *MazeData
	
	// Player positions (for collision detection)
	PlayerPositions map[string]*PointF
	
	// New dynamic game mechanics
	DynamicWorld    *DynamicWorld
	EntityManager   *EntityManager
	MazeWidth       int
	MazeHeight      int
	
	// Score tracking
	Scores          map[string]int
	
	// Broadcast function reference
	broadcastFunc   func([]byte) error
}

func NewWorldState() *World {
	// Default maze dimensions (will be updated when maze loads)
	mazeWidth := MazeWidth
	mazeHeight := MazeHeight
	
	dynamicWorld := NewDynamicWorld(mazeWidth, mazeHeight)
	entityManager := NewEntityManager(mazeWidth, mazeHeight, dynamicWorld)
	
	return &World{
		MatchStarted:        false,
		IsPoweredUp:         false,
		CharactersList:      []SpriteType{Chaser1, Chaser2, Chaser3, Runner},
		ConnectedPlayers:    &pkg.Map[string, *melody.Session]{},
		Spectators:          &pkg.Map[string, *melody.Session]{},
		PelletsCoordEaten:   NewCordList(),
		PowerUpsCoordsEaten: NewCordList(),
		ChasersIdsEaten:     []SpriteType{},
		worldLock:           sync.Mutex{},
		gameOverChan:        make(chan GameOverInfo, 1),
		BotManager:          nil, // Will be set when broadcast function is available
		botFillScheduled:    false,
		HostPlayerId:        "",
		CountdownStarted:    false,
		MazeData:            NewMazeData(),
		PlayerPositions:     make(map[string]*PointF),
		DynamicWorld:        dynamicWorld,
		EntityManager:       entityManager,
		MazeWidth:           mazeWidth,
		MazeHeight:          mazeHeight,
		Scores:              make(map[string]int),
	}
}

func (w *World) Join(player *PlayerEntity, session *melody.Session) error {
	if w.IsLobbyFull() {
		log.Error().Msg("lobby is full")
		return fmt.Errorf("lobby is full")
	}

	if len(w.CharactersList) == 0 {
		log.Error().Msg("No available sprites, this should never happen dumbass")
		return fmt.Errorf("no available sprites")
	}

	// assign the last available sprite in sprite list
	spriteId := w.CharactersList[len(w.CharactersList)-1]
	player.SpriteType = spriteId
	// pop this sprite
	w.CharactersList = w.CharactersList[:len(w.CharactersList)-1]

	// Initialize player at spawn position
	w.InitPlayerPosition(player)
	
	// Initialize score
	w.Scores[player.PlayerId] = 0

	// assign new player to world
	w.ConnectedPlayers.Store(player.PlayerId, session)

	return nil
}

func (w *World) Leave(player *PlayerEntity) {
	id := player.PlayerId

	_, exists := w.ConnectedPlayers.Load(id)
	if !exists {
		return
	}

	w.CharactersList = append(w.CharactersList, player.SpriteType)
	w.ConnectedPlayers.Delete(id)

	if len(w.CharactersList) == 4 {
		w.GameOver("Alle spelers hebben de lobby verlaten", "Niemand")
	}
}

func (w *World) GetGameStateReport(secretToken, username, spriteId string, newPlayer *melody.Session) ([]byte, error) {
	connectedMap := map[string]interface{}{}
	playersList := []map[string]interface{}{}

	// Get the requesting player's info
	requestingPlayer, _ := getPlayerEntityFromSession(newPlayer)
	var requestingPlayerId string
	if requestingPlayer != nil {
		requestingPlayerId = requestingPlayer.PlayerId
	}

	for _, otherPlayerSession := range w.ConnectedPlayers.GetValues() {
		// Skip nil sessions (bots don't have real sessions)
		if otherPlayerSession == nil || otherPlayerSession == newPlayer {
			continue
		}

		otherPlayerEntity, err := getPlayerEntityFromSession(otherPlayerSession)
		if err != nil {
			continue
		}

		connectedMap[string(otherPlayerEntity.SpriteType)] = map[string]interface{}{
			"username": otherPlayerEntity.Username,
			"x":        otherPlayerEntity.X,
			"y":        otherPlayerEntity.Y,
		}

		playersList = append(playersList, map[string]interface{}{
			"playerId":   otherPlayerEntity.PlayerId,
			"username":   otherPlayerEntity.Username,
			"spriteType": otherPlayerEntity.SpriteType,
			"isReady":    otherPlayerEntity.IsReady,
			"isHost":     otherPlayerEntity.IsHost,
		})
	}

	// Check if this player is the host
	isHost := w.HostPlayerId != "" && w.HostPlayerId == requestingPlayerId

	data := map[string]interface{}{
		"type":           "state",
		"chasersEaten":   w.ChasersIdsEaten,
		"activePlayers":  connectedMap,
		"playersList":    playersList,
		"pelletsEaten":   w.PelletsCoordEaten.GetList(),
		"powerUpsEaten":  w.PowerUpsCoordsEaten.GetList(),
		"secretToken":    secretToken,
		"spriteId":       spriteId,
		"spriteType":     spriteId,
		"username":       username,
		"playerId":       requestingPlayerId,
		"matchStarted":   w.MatchStarted,
		"hostId":         w.HostPlayerId,
		"isHost":         isHost,
		"playerCount":    w.GetPlayerCount(),
		"readyCount":     w.GetReadyCount(),
		"scores":         w.GetAllScores(),
		"spawnPositions": getSpawnPositionsPixels(),
	}
	return json.Marshal(data)
}

func (w *World) MovePlayer(player *PlayerEntity, x, y float64) {
	player.X = x
	player.Y = y
	
	// Update position cache for collision detection
	w.worldLock.Lock()
	w.PlayerPositions[player.PlayerId] = &PointF{X: x, Y: y}
	w.worldLock.Unlock()
}

// MovePlayerByDirection moves a player in a direction with collision checking
func (w *World) MovePlayerByDirection(player *PlayerEntity, dir string) (float64, float64, bool) {
	speed := PlayerSpeed * TickRateSec
	newX, newY := player.X, player.Y
	
	switch dir {
	case "up":
		newY -= speed
	case "down":
		newY += speed
	case "left":
		newX -= speed
	case "right":
		newX += speed
	default:
		return player.X, player.Y, false
	}
	
	// Check wall collision
	if !w.MazeData.CanMoveTo(player.X, player.Y, newX, newY) {
		return player.X, player.Y, false
	}
	
	// Update position
	w.MovePlayer(player, newX, newY)
	player.Dir = dir
	
	// Check pellet collision
	tileX, tileY := PixelToTile(newX, newY)
	if w.MazeData.EatPellet(tileX, tileY) {
		w.PelletsCoordEaten.Add(float64(tileX), float64(tileY))
		w.addScore(player.PlayerId, PelletScore)
	}
	
	// Check power-up collision (use EatPowerUp which handles timer)
	if w.MazeData.EatPowerUp(tileX, tileY) {
		w.addScore(player.PlayerId, PowerUpScore)
		w.EatPowerUp(float64(tileX), float64(tileY))
	}
	
	return newX, newY, true
}

// InitPlayerPosition sets spawn position based on sprite type
func (w *World) InitPlayerPosition(player *PlayerEntity) {
	spawn, ok := SpawnPositions[player.SpriteType]
	if !ok {
		spawn = TilePoint{X: 14, Y: 23} // Default to runner spawn
	}
	
	// Convert tile to pixel (center of tile)
	pixelX, pixelY := TileToPixel(spawn.X, spawn.Y)
	player.X = pixelX
	player.Y = pixelY
	
	w.worldLock.Lock()
	w.PlayerPositions[player.PlayerId] = &PointF{X: pixelX, Y: pixelY}
	w.worldLock.Unlock()
}

// addScore adds points to a player's score
func (w *World) addScore(playerId string, points int) {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	w.Scores[playerId] += points
}

// GetScore returns a player's score
func (w *World) GetScore(playerId string) int {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	return w.Scores[playerId]
}

// GetAllScores returns all player scores
func (w *World) GetAllScores() map[string]int {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	scores := make(map[string]int)
	for k, v := range w.Scores {
		scores[k] = v
	}
	return scores
}

// CheckPlayerCollisions checks for runner-chaser collisions
func (w *World) CheckPlayerCollisions() (collided bool, runnerId string, chaserId SpriteType) {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	
	var runnerPos *PointF
	var runnerPlayerId string
	chaserPositions := make(map[SpriteType]*PointF)
	
	// Get all player positions
	for _, session := range w.ConnectedPlayers.GetValues() {
		if session == nil {
			continue
		}
		player, err := getPlayerEntityFromSession(session)
		if err != nil {
			continue
		}
		
		pos := w.PlayerPositions[player.PlayerId]
		if pos == nil {
			continue
		}
		
		if player.SpriteType == Runner {
			runnerPos = pos
			runnerPlayerId = player.PlayerId
		} else {
			// Check if chaser is eaten
			eaten := false
			for _, eatenId := range w.ChasersIdsEaten {
				if eatenId == player.SpriteType {
					eaten = true
					break
				}
			}
			if !eaten {
				chaserPositions[player.SpriteType] = pos
			}
		}
	}
	
	if runnerPos == nil {
		return false, "", ""
	}
	
	// Check collision with each chaser
	for chaserType, chaserPos := range chaserPositions {
		if CollisionCheck(runnerPos.X, runnerPos.Y, chaserPos.X, chaserPos.Y) {
			return true, runnerPlayerId, chaserType
		}
	}
	
	return false, "", ""
}

func (w *World) IsLobbyFull() bool {
	return len(w.CharactersList) == 0
}

// TotalPellets is the total number of pellets on the map
const TotalPellets = 201

func (w *World) checkGameOver() (reason string, winner string) {
	if len(w.ChasersIdsEaten) == 3 {
		return "Alle chasers uitgeschakeld", "Runner"
	}

	// Check if all pellets are eaten
	if w.PelletsCoordEaten.Len() >= TotalPellets {
		return "Alle pellets verzameld!", "Runner"
	}

	return "", ""
}

func (w *World) GameOver(reason string, winner string) {
	w.gameOverChan <- GameOverInfo{Reason: reason, Winner: winner}
}

func (w *World) waitForGameOver() GameOverInfo {
	return <-w.gameOverChan
}

// ScheduleBotFill schedules automatic bot filling after a delay
// This allows time for real players to join before bots are added
func (w *World) ScheduleBotFill(delaySeconds int) {
	w.worldLock.Lock()
	if w.botFillScheduled {
		w.worldLock.Unlock()
		return
	}
	w.botFillScheduled = true
	w.worldLock.Unlock()

	go func() {
		time.Sleep(time.Duration(delaySeconds) * time.Second)

		w.worldLock.Lock()
		defer w.worldLock.Unlock()

		// Check if there are still empty slots and bot manager exists
		if w.BotManager == nil {
			return
		}

		availableSlots := len(w.CharactersList)
		if availableSlots > 0 {
			log.Info().Int("slots", availableSlots).Msg("Auto-filling empty slots with bots")
			w.BotManager.FillWithBots()
		}
	}()
}

type Consumable interface {
}

func (w *World) EatPellet(pelletX, PelletY float64) {
	w.PelletsCoordEaten.Add(pelletX, PelletY)
}

func (w *World) EatPowerUp(powerUpX, powerUpY float64) {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	
	if w.IsPoweredUp {
		// Extend the power-up time
		w.PowerUpEndTime = time.Now().Add(PowerUpDuration)
		// Restart the timer
		if w.PowerUpTimer != nil {
			w.PowerUpTimer.Stop()
		}
		w.startPowerUpTimerUnlocked()
		return
	}

	w.PowerUpsCoordsEaten.Add(powerUpX, powerUpY)
	w.IsPoweredUp = true
	w.PowerUpEndTime = time.Now().Add(PowerUpDuration)
	
	// Broadcast power-up start to all clients
	if w.broadcastFunc != nil {
		msg, _ := json.Marshal(map[string]interface{}{
			"type":     "pow",
			"x":        powerUpX,
			"y":        powerUpY,
			"duration": PowerUpDurationSec,
		})
		w.broadcastFunc(msg)
	}
	log.Info().Float64("x", powerUpX).Float64("y", powerUpY).Msg("Power-up started")
	
	// Start power-up timer
	w.startPowerUpTimerUnlocked()
}

// startPowerUpTimerUnlocked starts the power-up duration timer (must be called with lock held)
func (w *World) startPowerUpTimerUnlocked() {
	// Cancel existing timer if any
	if w.PowerUpTimer != nil {
		w.PowerUpTimer.Stop()
	}
	
	w.PowerUpTimer = time.AfterFunc(PowerUpDuration, func() {
		w.worldLock.Lock()
		w.IsPoweredUp = false
		w.worldLock.Unlock()
		
		// Broadcast power-up end to all clients
		if w.broadcastFunc != nil {
			msg, _ := json.Marshal(map[string]interface{}{
				"type": "powend",
			})
			w.broadcastFunc(msg)
		}
		log.Info().Msg("Power-up ended")
	})
}

func (w *World) ChaserEatenAction(chaserID SpriteType) {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()

	w.ChasersIdsEaten = append(w.ChasersIdsEaten, chaserID)
}

// JoinAsSpectator adds a player as spectator (no sprite assigned)
func (w *World) JoinAsSpectator(player *PlayerEntity, session *melody.Session) {
	player.IsSpectator = true
	player.SpriteType = ""
	w.Spectators.Store(player.PlayerId, session)
}

// AreAllPlayersReady checks if all connected players are ready
func (w *World) AreAllPlayersReady() bool {
	if len(w.ConnectedPlayers.GetKeys()) == 0 {
		return false
	}

	for _, session := range w.ConnectedPlayers.GetValues() {
		if session == nil {
			continue // Skip bots
		}
		player, err := getPlayerEntityFromSession(session)
		if err != nil {
			continue
		}
		if !player.IsReady && !player.IsBot {
			return false
		}
	}
	return true
}

// GetPlayerCount returns number of real players (not bots, not spectators)
func (w *World) GetPlayerCount() int {
	count := 0
	for _, session := range w.ConnectedPlayers.GetValues() {
		if session != nil {
			count++
		}
	}
	return count
}

// GetReadyCount returns number of ready players
func (w *World) GetReadyCount() int {
	count := 0
	for _, session := range w.ConnectedPlayers.GetValues() {
		if session == nil {
			continue
		}
		player, err := getPlayerEntityFromSession(session)
		if err != nil {
			continue
		}
		if player.IsReady {
			count++
		}
	}
	return count
}

// StartDynamicSystems initializes and starts the zone and entity systems
func (w *World) StartDynamicSystems(broadcastFunc func(msgType string, data interface{})) {
	w.worldLock.Lock()
	defer w.worldLock.Unlock()
	
	// Set broadcast functions
	w.DynamicWorld.SetBroadcastFunc(broadcastFunc)
	w.EntityManager.SetBroadcastFunc(broadcastFunc)
	
	// Set player position getter
	w.EntityManager.SetGetPlayersFunc(w.getPlayerPositions)
	
	// Spawn initial entities
	w.EntityManager.SpawnInitialEntities()
	
	// Start both systems
	w.DynamicWorld.Start()
	w.EntityManager.Start()
}

// StopDynamicSystems stops the zone and entity update loops
func (w *World) StopDynamicSystems() {
	if w.DynamicWorld != nil {
		w.DynamicWorld.Stop()
	}
	if w.EntityManager != nil {
		w.EntityManager.Stop()
	}
}

// getPlayerPositions returns current player positions for entity AI
func (w *World) getPlayerPositions() []PlayerPosition {
	positions := make([]PlayerPosition, 0)
	
	for _, session := range w.ConnectedPlayers.GetValues() {
		if session == nil {
			continue
		}
		player, err := getPlayerEntityFromSession(session)
		if err != nil {
			continue
		}
		positions = append(positions, PlayerPosition{
			ID: player.PlayerId,
			X:  player.X,
			Y:  player.Y,
		})
	}
	
	return positions
}

// GetDynamicState returns the current state of zones and entities for new players
func (w *World) GetDynamicState() map[string]interface{} {
	zonesJSON, _ := w.DynamicWorld.GetZonesJSON()
	var zonesData map[string]interface{}
	json.Unmarshal(zonesJSON, &zonesData)
	
	return map[string]interface{}{
		"zones":    zonesData,
		"entities": w.EntityManager.GetEntitiesJSON(),
	}
}

// CheckEntityCollision checks if a player has collided with an entity
func (w *World) CheckEntityCollision(playerX, playerY float64) *DangerEntity {
	return w.EntityManager.CheckPlayerCollision(playerX, playerY)
}

// GetCurrentZone returns the zone at the player's position
func (w *World) GetCurrentZone(x, y int) *Zone {
	return w.DynamicWorld.GetZoneAt(x, y)
}
