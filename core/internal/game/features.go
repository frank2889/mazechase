package game

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/frank2889/mazechase/pkg"
	"github.com/rs/zerolog/log"
)

// ChatMessage represents a chat message
type ChatMessage struct {
	Type      string    `json:"type"`
	PlayerID  string    `json:"playerId"`
	Username  string    `json:"username"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// ChatManager handles in-game chat
type ChatManager struct {
	mu           sync.RWMutex
	history      []ChatMessage
	maxHistory   int
	rateLimiters *PlayerRateLimiter
	validator    *InputValidator
}

// NewChatManager creates a new chat manager
func NewChatManager() *ChatManager {
	config := RateLimitConfig{
		MaxTokens:     5,  // 5 messages burst
		RefillRate:    1,  // 1 message per second
		CleanupPeriod: 5 * time.Minute,
		MaxIdleTime:   10 * time.Minute,
	}

	return &ChatManager{
		history:      make([]ChatMessage, 0, 100),
		maxHistory:   100,
		rateLimiters: NewPlayerRateLimiter(config),
		validator:    NewInputValidator(),
	}
}

// SendMessage processes and broadcasts a chat message
func (cm *ChatManager) SendMessage(playerID, username, message string) (*ChatMessage, error) {
	// Rate limit check
	if !cm.rateLimiters.GetLimiter(playerID).Allow() {
		return nil, &ValidationError{Field: "chat", Message: "rate limited"}
	}

	// Validate message
	sanitizedMsg, err := cm.validator.ValidateChatMessage(message)
	if err != nil {
		return nil, err
	}

	chatMsg := &ChatMessage{
		Type:      "chat",
		PlayerID:  playerID,
		Username:  username,
		Message:   sanitizedMsg,
		Timestamp: time.Now(),
	}

	// Add to history
	cm.mu.Lock()
	cm.history = append(cm.history, *chatMsg)
	if len(cm.history) > cm.maxHistory {
		cm.history = cm.history[1:]
	}
	cm.mu.Unlock()

	return chatMsg, nil
}

// GetHistory returns recent chat history
func (cm *ChatManager) GetHistory(count int) []ChatMessage {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	if count > len(cm.history) {
		count = len(cm.history)
	}

	start := len(cm.history) - count
	result := make([]ChatMessage, count)
	copy(result, cm.history[start:])
	return result
}

// ChatMessage handler for WebSocket
func ChatMessageHandler(chatManager *ChatManager, manager *Manager) MessageHandler {
	name := "chat"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			message, ok := data.msgInfo["message"].(string)
			if !ok {
				log.Warn().Msg("Invalid chat message format")
				return nil
			}

			chatMsg, err := chatManager.SendMessage(
				data.playerSession.PlayerId,
				data.playerSession.Username,
				message,
			)
			if err != nil {
				log.Warn().Err(err).Msg("Chat message rejected")
				return nil
			}

			return map[string]interface{}{
				"type":      name,
				"playerId":  chatMsg.PlayerID,
				"username":  chatMsg.Username,
				"message":   chatMsg.Message,
				"timestamp": chatMsg.Timestamp.Unix(),
			}
		},
	}
}

// Leaderboard system
type LeaderboardEntry struct {
	UserID       uint   `json:"userId" gorm:"primaryKey"`
	Username     string `json:"username"`
	Wins         int    `json:"wins"`
	Losses       int    `json:"losses"`
	ChasersEaten int    `json:"chasersEaten"`
	PeletsEaten  int    `json:"pelletsEaten"`
	GamesPlayed  int    `json:"gamesPlayed"`
	HighScore    int    `json:"highScore"`
	UpdatedAt    time.Time
}

// LeaderboardManager manages the leaderboard
type LeaderboardManager struct {
	mu      sync.RWMutex
	entries map[uint]*LeaderboardEntry
}

// NewLeaderboardManager creates a leaderboard manager
func NewLeaderboardManager() *LeaderboardManager {
	return &LeaderboardManager{
		entries: make(map[uint]*LeaderboardEntry),
	}
}

// RecordGameResult records the result of a game
func (lm *LeaderboardManager) RecordGameResult(userID uint, username string, won bool, stats GameStats) {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	entry, exists := lm.entries[userID]
	if !exists {
		entry = &LeaderboardEntry{
			UserID:   userID,
			Username: username,
		}
		lm.entries[userID] = entry
	}

	entry.GamesPlayed++
	entry.ChasersEaten += stats.ChasersEaten
	entry.PeletsEaten += stats.PelletsEaten

	if won {
		entry.Wins++
	} else {
		entry.Losses++
	}

	score := calculateScore(stats)
	if score > entry.HighScore {
		entry.HighScore = score
	}

	entry.UpdatedAt = time.Now()
}

// GetTopPlayers returns the top N players
func (lm *LeaderboardManager) GetTopPlayers(n int) []LeaderboardEntry {
	lm.mu.RLock()
	defer lm.mu.RUnlock()

	entries := make([]LeaderboardEntry, 0, len(lm.entries))
	for _, e := range lm.entries {
		entries = append(entries, *e)
	}

	// Sort by wins, then high score
	for i := 0; i < len(entries)-1; i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].Wins > entries[i].Wins ||
				(entries[j].Wins == entries[i].Wins && entries[j].HighScore > entries[i].HighScore) {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	if n > len(entries) {
		n = len(entries)
	}

	return entries[:n]
}

// GetPlayerStats returns stats for a specific player
func (lm *LeaderboardManager) GetPlayerStats(userID uint) (*LeaderboardEntry, bool) {
	lm.mu.RLock()
	defer lm.mu.RUnlock()
	entry, exists := lm.entries[userID]
	if !exists {
		return nil, false
	}
	entryCopy := *entry
	return &entryCopy, true
}

// GameStats holds stats from a single game
type GameStats struct {
	ChasersEaten  int
	PelletsEaten int
	PowerUpsUsed int
	SurvivalTime time.Duration
}

// calculateScore calculates a score from game stats
func calculateScore(stats GameStats) int {
	return stats.PelletsEaten*10 + stats.ChasersEaten*200 + stats.PowerUpsUsed*50
}

// WorldWithStats extends World with statistics tracking
type WorldWithStats struct {
	*World
	stats          map[string]*PlayerGameStats
	startTime      time.Time
	leaderboard    *LeaderboardManager
	chatManager    *ChatManager
	mu             sync.RWMutex
}

// PlayerGameStats tracks per-player stats for current game
type PlayerGameStats struct {
	PelletsEaten int
	ChasersEaten  int
	PowerUpsUsed int
}

// NewWorldWithStats creates a world with stats tracking
func NewWorldWithStats(leaderboard *LeaderboardManager, chatManager *ChatManager) *WorldWithStats {
	return &WorldWithStats{
		World:       NewWorldState(),
		stats:       make(map[string]*PlayerGameStats),
		startTime:   time.Now(),
		leaderboard: leaderboard,
		chatManager: chatManager,
	}
}

// TrackPelletEaten tracks a pellet being eaten
func (w *WorldWithStats) TrackPelletEaten(playerID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if _, exists := w.stats[playerID]; !exists {
		w.stats[playerID] = &PlayerGameStats{}
	}
	w.stats[playerID].PelletsEaten++
}

// TrackGhostEaten tracks a ghost being eaten
func (w *WorldWithStats) TrackGhostEaten(playerID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if _, exists := w.stats[playerID]; !exists {
		w.stats[playerID] = &PlayerGameStats{}
	}
	w.stats[playerID].ChasersEaten++
}

// GetPlayerStats returns stats for a player
func (w *WorldWithStats) GetPlayerStats(playerID string) *PlayerGameStats {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.stats[playerID]
}

// Unused but referenced - ensure pkg is used
var _ = pkg.Elog
var _ = log.Info
var _ = json.Marshal
