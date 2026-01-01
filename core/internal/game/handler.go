package game

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/frank2889/mazechase/internal/lobby"
	"github.com/frank2889/mazechase/internal/user"
	"github.com/frank2889/mazechase/pkg"
	"github.com/olahol/melody"
	"github.com/rs/zerolog/log"
)

const (
	userInfoKey = "userEntity"
	userInfKey  = "userInf"
	worldKey    = "lobbyEntity"
	lobbyIdKey  = "lobbyIdKey"
	powerUpTime = 8 * time.Second

	// Rate limiting constants
	rateLimitKey         = "rateLimit"
	maxMessagesPerSecond = 60 // Max 60 messages per second per player
	rateLimitWindow      = time.Second
	rateLimitBurstSize   = 10 // Allow small bursts
)

// RateLimiter tracks message rates per session
type RateLimiter struct {
	mu           sync.Mutex
	messageCount int
	windowStart  time.Time
	blocked      bool
	blockUntil   time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		windowStart: time.Now(),
	}
}

// Allow checks if a message is allowed under rate limits
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	// Check if currently blocked
	if rl.blocked {
		if now.After(rl.blockUntil) {
			rl.blocked = false
			rl.messageCount = 0
			rl.windowStart = now
		} else {
			return false
		}
	}

	// Reset window if expired
	if now.Sub(rl.windowStart) > rateLimitWindow {
		rl.messageCount = 0
		rl.windowStart = now
	}

	rl.messageCount++

	// Check if over limit
	if rl.messageCount > maxMessagesPerSecond+rateLimitBurstSize {
		rl.blocked = true
		rl.blockUntil = now.Add(2 * time.Second) // Block for 2 seconds
		log.Warn().Int("count", rl.messageCount).Msg("Rate limit exceeded, blocking player for 2s")
		return false
	}

	return true
}

// RateLimitConfig for configurable rate limiting
type RateLimitConfig struct {
	MaxTokens     int
	RefillRate    int
	CleanupPeriod time.Duration
	MaxIdleTime   time.Duration
}

// PlayerRateLimiter manages rate limiters per player
type PlayerRateLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*RateLimiter
	config   RateLimitConfig
}

// NewPlayerRateLimiter creates a new player rate limiter manager
func NewPlayerRateLimiter(config RateLimitConfig) *PlayerRateLimiter {
	prl := &PlayerRateLimiter{
		limiters: make(map[string]*RateLimiter),
		config:   config,
	}

	// Start cleanup goroutine
	go prl.cleanup()

	return prl
}

// GetLimiter gets or creates a rate limiter for a player
func (prl *PlayerRateLimiter) GetLimiter(playerID string) *RateLimiter {
	prl.mu.RLock()
	rl, exists := prl.limiters[playerID]
	prl.mu.RUnlock()

	if exists {
		return rl
	}

	prl.mu.Lock()
	defer prl.mu.Unlock()

	// Double-check after acquiring write lock
	if rl, exists = prl.limiters[playerID]; exists {
		return rl
	}

	rl = NewRateLimiter()
	prl.limiters[playerID] = rl
	return rl
}

// cleanup removes idle rate limiters
func (prl *PlayerRateLimiter) cleanup() {
	ticker := time.NewTicker(prl.config.CleanupPeriod)
	defer ticker.Stop()

	for range ticker.C {
		prl.mu.Lock()
		now := time.Now()
		for id, rl := range prl.limiters {
			if now.Sub(rl.windowStart) > prl.config.MaxIdleTime {
				delete(prl.limiters, id)
			}
		}
		prl.mu.Unlock()
	}
}

type WsHandler struct {
	lobbyService    *lobby.Service
	msgHandlerFuncs map[string]MessageHandlerFunc
	manager         *Manager
}

func RegisterGameWSHandler(mux *http.ServeMux, authService *user.Service, lobbyService *lobby.Service) {
	mel := melody.New()
	manager := &Manager{
		lobbyService:  lobbyService,
		mel:           mel,
		activeLobbies: pkg.Map[uint, *World]{},
	}

	handler := WsHandler{
		lobbyService: lobbyService,
		manager:      manager,
		msgHandlerFuncs: registerMessageHandlers(
			MovMessage().WithMiddleware(CheckCollisionMiddleware).WithMiddleware(CheckGameOverMiddleware),
			KillPlayer().WithMiddleware(CheckGameOverMiddleware),
			PowerUpMessage(manager),
			PelletMessage().WithMiddleware(CheckGameOverMiddleware),
			ReadyToggleMessage(),
			StartGameMessage(manager),
			LobbyStatusMessage(),
			// Dynamic world messages
			EntityCollisionMessage().WithMiddleware(CheckGameOverMiddleware),
			ZoneQueryMessage(),
			DynamicStateMessage(),
			// New messages (Items #3, #7, #37-40)
			FullStateMessage(),
			RequestFullStateMessage(), // For reconnection state sync
			ConfigMessage(),
			ResourceSpawnMessage(),
			CollectResourceMessage(),
			ExtractLootMessage(),
		),
	}

	mel.HandleConnect(handler.HandleConnect)
	mel.HandleMessage(handler.HandleMessage)
	mel.HandleDisconnect(handler.HandleDisconnect)

	wsHandler := func(w http.ResponseWriter, r *http.Request) {
		err := mel.HandleRequest(w, r)
		if err != nil {
			http.Error(w, "WebSocket connection failed", http.StatusInternalServerError)
			return
		}
	}

	mux.Handle("/api/game", WSAuthMiddleware(authService, http.HandlerFunc(wsHandler)))
}

////////////////////////////
// main handlers

func (h *WsHandler) HandleConnect(newPlayerSession *melody.Session) {
	userInfo, lobbyInfo, err := h.manager.getUserAndLobbyInfo(newPlayerSession)
	if err != nil {
		log.Error().Err(err).Msg("Unable to find lobby or user info")
		return
	}

	world, err := h.manager.getWorld(lobbyInfo)
	if err != nil {
		sendMessage(newPlayerSession, wsError(err))
		return
	}

	player := NewPlayerEntity(userInfo.ID, userInfo.Username)

	// Check if lobby is full - join as spectator
	if world.IsLobbyFull() {
		world.JoinAsSpectator(player, newPlayerSession)
		log.Info().Str("user", userInfo.Username).Msg("Player joined as spectator")
	} else {
		err = world.Join(player, newPlayerSession)
		if err != nil {
			log.Error().Err(err).Msg("Unable to join lobby")
			sendMessage(newPlayerSession, wsError(err))
			return
		}

		// First player becomes host
		if world.HostPlayerId == "" {
			world.HostPlayerId = player.PlayerId
			player.IsHost = true
			log.Info().Str("user", userInfo.Username).Msg("Player is now host")
		}
	}

	newPlayerJson, err := player.ToJSON()
	if err != nil {
		log.Error().Err(err).Msg("Failed to convert player to JSON")
		return
	}

	// store session info
	newPlayerSession.Set(userInfoKey, player)
	newPlayerSession.Set(worldKey, world)
	newPlayerSession.Set(userInfKey, userInfo)
	newPlayerSession.Set(lobbyIdKey, lobbyInfo.ID)
	newPlayerSession.Set(rateLimitKey, NewRateLimiter()) // Add rate limiter for this session

	// we now have the new player, with lobby joined

	// inform new player about current game state
	if err := h.manager.sendGameStateInfo(newPlayerSession, world); err != nil {
		log.Error().Err(err).Msg("Unable to send game state info")
		return
	}

	// inform new player has joined to existing players
	if err := h.manager.broadcastExceptPlayer(newPlayerSession, newPlayerJson); err != nil {
		log.Error().Err(err).Msg("Unable to broadcast status")
		return
	}

	log.Info().Any("user", *userInfo).Any("lobby", lobbyInfo).Msgf("New player joined lobby")

	// add new player count
	broadCastSessions := world.ConnectedPlayers.GetValues()
	h.lobbyService.UpdateLobbyPlayerCount(lobbyInfo.ID, len(broadCastSessions))

	// Broadcast lobby status to all players
	h.broadcastLobbyStatus(world)

	// Check if this is a solo game - if so, immediately fill with bots
	queryParams := newPlayerSession.Request.URL.Query()
	isSinglePlayer := queryParams.Get("single") == "true"

	// Parse difficulty from query params (AI Tester suggestion: Emma, Tim, Sandra, Peter, Grandma Mei)
	difficultyParam := queryParams.Get("difficulty")
	if difficultyParam != "" && world.Difficulty == 0 { // Only set if not already set
		switch difficultyParam {
		case "easy":
			world.Difficulty = DifficultyEasy
			log.Info().Msg("Game difficulty set to EASY")
		case "hard":
			world.Difficulty = DifficultyHard
			log.Info().Msg("Game difficulty set to HARD")
		default:
			world.Difficulty = DifficultyMedium
			log.Info().Msg("Game difficulty set to MEDIUM")
		}
		// Apply difficulty settings to bot manager if available
		if world.BotManager != nil {
			settings := GetDifficultySettingsData(world.Difficulty)
			world.BotManager.SetDifficultySettings(settings)
		}
	}

	if isSinglePlayer && world.BotManager != nil {
		log.Info().Msg("Solo mode: immediately filling with bots")
		world.BotManager.FillWithBots()
	} else {
		// Schedule automatic bot fill after 2 seconds if this is the first player
		// This gives a short time for other real players to join before adding bots
		world.ScheduleBotFill(2)
	}
}

func (h *WsHandler) HandleDisconnect(s *melody.Session) {
	exitingPlayer, err := getPlayerEntityFromSession(s)
	if err != nil {
		log.Warn().Msg("player not found in session on disconnect")
		return
	}
	world, err := getWorldFromSession(s)
	if err != nil {
		log.Warn().Msg("Lobby not found in active lobbies on disconnect")
		return
	}

	world.Leave(exitingPlayer)
	// set disconnect status
	exitingPlayer.Type = "dis"

	// inform other players
	marshal, err := exitingPlayer.ToJSON()
	if err != nil {
		log.Error().Err(err).Any("other entity", exitingPlayer).Msg("Failed to convert PlayerEntity to JSON")
		return
	}
	// inform active players about player that left
	pkg.Elog(h.manager.broadcastAll(world, marshal))

	log.Info().Any("player", *exitingPlayer).Msg("client disconnected")

	lobbyId, exist := s.Get(lobbyIdKey)
	if exist {
		h.lobbyService.UpdateLobbyPlayerCount(lobbyId.(uint), len(world.ConnectedPlayers.GetValues()))
	}
}

func (h *WsHandler) HandleMessage(s *melody.Session, msg []byte) {
	// Rate limiting check
	rlInterface, exists := s.Get(rateLimitKey)
	if exists {
		rl := rlInterface.(*RateLimiter)
		if !rl.Allow() {
			// Rate limited - silently drop the message
			return
		}
	}

	// Input validation: check message size (prevent large payloads)
	const maxMessageSize = 4096 // 4KB max message size
	if len(msg) > maxMessageSize {
		log.Warn().Int("size", len(msg)).Msg("Message too large, dropping")
		return
	}

	playerSession, err := getPlayerEntityFromSession(s)
	if err != nil {
		log.Error().Msg("Player info not found in session")
		return
	}

	msgInfo := map[string]interface{}{}
	if err = json.Unmarshal(msg, &msgInfo); err != nil {
		log.Error().Err(err).Msg("Unable to unmarshal msg")
		return
	}

	// Input validation: validate message structure
	validator := NewInputValidator()
	msgType, _ := msgInfo["type"].(string)
	if err := validator.ValidateMessageType(msgType); err != nil {
		log.Warn().Str("type", msgType).Msg("Invalid message type")
		return
	}

	// Validate position data if present
	if x, hasX := msgInfo["x"].(float64); hasX {
		if y, hasY := msgInfo["y"].(float64); hasY {
			if err := validator.ValidatePosition(x, y); err != nil {
				log.Warn().Float64("x", x).Float64("y", y).Msg("Invalid position")
				return
			}
		}
	}

	secretToken, _ := msgInfo["secretToken"].(string)
	if secretToken != playerSession.secretToken {
		log.Error().Msg("unable to verify secret token")
		return
	}

	world, err := getWorldFromSession(s)
	if err != nil {
		log.Error().Err(err).Msg("Unable to find lobby info")
		return
	}
	// msgType already validated above

	msgHandler, ok := h.msgHandlerFuncs[msgType]
	if !ok {
		log.Warn().Msgf("Unknown message type: %s", msgType)
		return
	}

	data := msgHandler(MessageData{msgInfo, world, playerSession})
	if data == nil {
		log.Debug().Msg("null message, something went wrong while handling message")
		return
	}

	marshal, err := json.Marshal(data)
	if err != nil {
		log.Error().Err(err).Any("msg", data).Msg("Unable to marshal msg")
		return
	}

	if msgType == "pos" {
		// player self does not need the pos update adds lag
		pkg.Elog(h.manager.broadcastExceptPlayer(s, marshal))
	} else {
		pkg.Elog(h.manager.broadcastAll(world, marshal))
	}
}

func sendMessage(session *melody.Session, message []byte) {
	err := session.Write(message)
	if err != nil {
		log.Error().Err(err).Msg("Unable to send message")
	}
}

func wsError(err error) []byte {
	marshal, _ := json.Marshal(map[string]string{"error": err.Error()})
	return marshal
}

// broadcastLobbyStatus sends lobby status to all connected players
func (h *WsHandler) broadcastLobbyStatus(world *World) {
	players := []map[string]interface{}{}

	for _, session := range world.ConnectedPlayers.GetValues() {
		if session == nil {
			continue
		}
		player, err := getPlayerEntityFromSession(session)
		if err != nil {
			continue
		}
		players = append(players, map[string]interface{}{
			"playerId":   player.PlayerId,
			"username":   player.Username,
			"spriteType": player.SpriteType,
			"isReady":    player.IsReady,
			"isHost":     player.IsHost,
		})
	}

	statusMsg := map[string]interface{}{
		"type":         "lobbystatus",
		"players":      players,
		"playerCount":  world.GetPlayerCount(),
		"readyCount":   world.GetReadyCount(),
		"matchStarted": world.MatchStarted,
		"hostId":       world.HostPlayerId,
	}

	marshal, err := json.Marshal(statusMsg)
	if err != nil {
		log.Error().Err(err).Msg("Unable to marshal lobby status")
		return
	}

	pkg.Elog(h.manager.broadcastAll(world, marshal))
}
