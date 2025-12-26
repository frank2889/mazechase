package game

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Bot represents an AI-controlled player
type Bot struct {
	PlayerEntity *PlayerEntity
	World        *World
	stopChan     chan struct{}
	isRunning    bool
	mutex        sync.Mutex
}

// BotManager manages all bots in a world
type BotManager struct {
	bots      []*Bot
	world     *World
	mutex     sync.Mutex
	broadcast func([]byte) error
}

var botNames = []string{"Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta"}
var directions = []string{"up", "down", "left", "right"}

// NewBotManager creates a new bot manager for a world
func NewBotManager(world *World, broadcastFunc func([]byte) error) *BotManager {
	return &BotManager{
		bots:      make([]*Bot, 0),
		world:     world,
		broadcast: broadcastFunc,
	}
}

// FillWithBots adds bots to fill remaining slots (up to 4 players total)
// Note: This should be called while holding the world lock
func (bm *BotManager) FillWithBots() {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()

	// Count how many slots are available
	availableSlots := len(bm.world.CharactersList)
	if availableSlots == 0 {
		return
	}

	log.Info().Int("slots", availableSlots).Msg("Adding bots to fill empty slots")

	for i := 0; i < availableSlots; i++ {
		bot := bm.createBotUnlocked(i)
		if bot != nil {
			bm.bots = append(bm.bots, bot)
			go bot.Start(bm.broadcast)
		}
	}
}

// createBotUnlocked creates a single bot (caller must hold mutex)
func (bm *BotManager) createBotUnlocked(index int) *Bot {
	if len(bm.world.CharactersList) == 0 {
		return nil
	}

	// Get the next available sprite
	spriteId := bm.world.CharactersList[len(bm.world.CharactersList)-1]
	bm.world.CharactersList = bm.world.CharactersList[:len(bm.world.CharactersList)-1]

	// Create bot player entity
	botName := botNames[index%len(botNames)]
	player := &PlayerEntity{
		PlayerId:    fmt.Sprintf("bot_%d", index),
		Username:    botName,
		SpriteType:  spriteId,
		X:           getStartX(spriteId),
		Y:           getStartY(spriteId),
		secretToken: fmt.Sprintf("bot_token_%d", index),
		IsBot:       true,
	}

	// Store in connected players (nil session for bots)
	bm.world.ConnectedPlayers.Store(player.PlayerId, nil)

	bot := &Bot{
		PlayerEntity: player,
		World:        bm.world,
		stopChan:     make(chan struct{}),
		isRunning:    false,
	}

	log.Info().Str("name", botName).Str("sprite", string(spriteId)).Msg("Bot created")

	// Broadcast bot join to other players
	joinMsg := map[string]interface{}{
		"type":       "active",
		"user":       botName,
		"spriteType": string(spriteId),
	}
	if msgBytes, err := json.Marshal(joinMsg); err == nil {
		bm.broadcast(msgBytes)
	}

	return bot
}

// getStartX returns the starting X position for a sprite
func getStartX(sprite SpriteType) float64 {
	switch sprite {
	case Pacman:
		return 110
	case Ghost1:
		return 723.5
	case Ghost2:
		return 670.17
	case Ghost3:
		return 776.83
	default:
		return 400
	}
}

// getStartY returns the starting Y position for a sprite
func getStartY(sprite SpriteType) float64 {
	switch sprite {
	case Pacman:
		return 220
	case Ghost1, Ghost2, Ghost3:
		return 424.5
	default:
		return 400
	}
}

// Start begins the bot's movement loop
func (b *Bot) Start(broadcast func([]byte) error) {
	b.mutex.Lock()
	if b.isRunning {
		b.mutex.Unlock()
		return
	}
	b.isRunning = true
	b.mutex.Unlock()

	ticker := time.NewTicker(200 * time.Millisecond) // Move every 200ms
	defer ticker.Stop()

	currentDir := directions[rand.Intn(len(directions))]
	directionChangeCounter := 0

	for {
		select {
		case <-b.stopChan:
			return
		case <-ticker.C:
			// Change direction occasionally or randomly
			directionChangeCounter++
			if directionChangeCounter > 10+rand.Intn(20) || rand.Float32() < 0.1 {
				currentDir = directions[rand.Intn(len(directions))]
				directionChangeCounter = 0
			}

			// Calculate new position based on direction
			speed := 8.0 // pixels per tick
			newX, newY := b.PlayerEntity.X, b.PlayerEntity.Y

			switch currentDir {
			case "up":
				newY -= speed
			case "down":
				newY += speed
			case "left":
				newX -= speed
			case "right":
				newX += speed
			}

			// Simple boundary checking
			if newX < 50 {
				newX = 50
				currentDir = "right"
			}
			if newX > 1500 {
				newX = 1500
				currentDir = "left"
			}
			if newY < 50 {
				newY = 50
				currentDir = "down"
			}
			if newY > 1000 {
				newY = 1000
				currentDir = "up"
			}

			b.PlayerEntity.X = newX
			b.PlayerEntity.Y = newY

			// Broadcast position to all players
			posMsg := map[string]interface{}{
				"type":       "pos",
				"spriteType": string(b.PlayerEntity.SpriteType),
				"x":          newX,
				"y":          newY,
				"dir":        currentDir,
			}

			if msgBytes, err := json.Marshal(posMsg); err == nil {
				broadcast(msgBytes)
			}
		}
	}
}

// Stop stops the bot
func (b *Bot) Stop() {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.isRunning {
		close(b.stopChan)
		b.isRunning = false
	}
}

// StopAllBots stops all bots managed by this manager
func (bm *BotManager) StopAllBots() {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()

	for _, bot := range bm.bots {
		bot.Stop()
		// Remove from connected players
		bm.world.ConnectedPlayers.Delete(bot.PlayerEntity.PlayerId)
		// Return sprite to available list
		bm.world.CharactersList = append(bm.world.CharactersList, bot.PlayerEntity.SpriteType)
	}
	bm.bots = make([]*Bot, 0)
	log.Info().Msg("All bots stopped")
}

// RemoveOneBot removes one bot (when a real player joins)
func (bm *BotManager) RemoveOneBot() {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()

	if len(bm.bots) == 0 {
		return
	}

	// Remove the last bot
	bot := bm.bots[len(bm.bots)-1]
	bm.bots = bm.bots[:len(bm.bots)-1]

	bot.Stop()

	// Remove from connected players
	bm.world.ConnectedPlayers.Delete(bot.PlayerEntity.PlayerId)

	// Return sprite to available list
	bm.world.CharactersList = append(bm.world.CharactersList, bot.PlayerEntity.SpriteType)

	// Broadcast bot leave
	leaveMsg := map[string]interface{}{
		"type":     "dis",
		"username": bot.PlayerEntity.Username,
		"spriteId": string(bot.PlayerEntity.SpriteType),
	}
	if msgBytes, err := json.Marshal(leaveMsg); err == nil {
		bm.broadcast(msgBytes)
	}

	log.Info().Str("name", bot.PlayerEntity.Username).Msg("Bot removed to make room for player")
}

// GetBotCount returns the number of active bots
func (bm *BotManager) GetBotCount() int {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()
	return len(bm.bots)
}
