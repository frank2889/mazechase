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
}

func NewWorldState() *World {
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
	}
	return json.Marshal(data)
}

func (w *World) MovePlayer(player *PlayerEntity, x, y float64) {
	player.X = x
	player.Y = y
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
	if w.IsPoweredUp {
		// already powered up do nothing
		return
	}

	w.PowerUpsCoordsEaten.Add(powerUpX, powerUpY)
	w.IsPoweredUp = true
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
