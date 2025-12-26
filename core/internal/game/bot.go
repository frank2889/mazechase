package game

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// BotStrategy defines different AI behavior patterns
type BotStrategy int

const (
	// StrategyChaser - Direct pursuit of the runner
	StrategyChaser BotStrategy = iota
	// StrategyAmbush - Tries to intercept runner at junctions
	StrategyAmbush
	// StrategyBlocker - Tries to block escape routes
	StrategyBlocker
	// StrategyPatrol - Patrols a section of the maze
	StrategyPatrol
)

// Bot represents an AI-controlled player
type Bot struct {
	PlayerEntity *PlayerEntity
	World        *World
	stopChan     chan struct{}
	isRunning    bool
	mutex        sync.Mutex
	Strategy     BotStrategy  // AI behavior pattern
	TargetX      float64      // Target position for patrol/ambush
	TargetY      float64
	LastRunnerX  float64      // Track runner movement for prediction
	LastRunnerY  float64
	AggressionLevel float64   // 0.0 to 1.0 - how aggressively to chase
}

// BotManager manages all bots in a world
type BotManager struct {
	bots      []*Bot
	world     *World
	mutex     sync.Mutex
	broadcast func([]byte) error
}

// GetBots returns a copy of the bots slice (thread-safe)
func (bm *BotManager) GetBots() []*Bot {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()
	result := make([]*Bot, len(bm.bots))
	copy(result, bm.bots)
	return result
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

	// Assign different strategies to different bots for variety
	strategies := []BotStrategy{StrategyChaser, StrategyAmbush, StrategyBlocker, StrategyPatrol}
	strategy := strategies[index%len(strategies)]
	
	// Vary aggression level based on bot type
	aggressionLevels := []float64{0.9, 0.7, 0.5, 0.3} // Alpha is aggressive, others vary
	aggression := aggressionLevels[index%len(aggressionLevels)]

	bot := &Bot{
		PlayerEntity:    player,
		World:           bm.world,
		stopChan:        make(chan struct{}),
		isRunning:       false,
		Strategy:        strategy,
		AggressionLevel: aggression,
	}

	log.Info().
		Str("name", botName).
		Str("sprite", string(spriteId)).
		Int("strategy", int(strategy)).
		Float64("aggression", aggression).
		Msg("Bot created with strategy")

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
	spawn, ok := SpawnPositions[sprite]
	if !ok {
		return 700
	}
	x, _ := TileToPixel(spawn.X, spawn.Y)
	return x
}

// getStartY returns the starting Y position for a sprite
func getStartY(sprite SpriteType) float64 {
	spawn, ok := SpawnPositions[sprite]
	if !ok {
		return 575
	}
	_, y := TileToPixel(spawn.X, spawn.Y)
	return y
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
	stuckCounter := 0

	for {
		select {
		case <-b.stopChan:
			return
		case <-ticker.C:
			// Change direction occasionally or randomly
			directionChangeCounter++
			if directionChangeCounter > 10+rand.Intn(20) || rand.Float32() < 0.1 {
				currentDir = b.chooseNewDirection(currentDir)
				directionChangeCounter = 0
			}

			// Calculate new position based on direction
			speed := PlayerSpeed * 0.2 * 0.001 * 200 // Adjust for tick rate
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

			// Check wall collision using maze data
			if b.World.MazeData != nil && !b.World.MazeData.CanMoveTo(b.PlayerEntity.X, b.PlayerEntity.Y, newX, newY) {
				// Hit a wall, choose new direction
				stuckCounter++
				if stuckCounter > 3 {
					currentDir = b.chooseNewDirection(currentDir)
					stuckCounter = 0
				}
				continue
			}
			
			stuckCounter = 0
			b.PlayerEntity.X = newX
			b.PlayerEntity.Y = newY
			b.PlayerEntity.Dir = currentDir
			
			// Update world position tracking
			b.World.worldLock.Lock()
			b.World.PlayerPositions[b.PlayerEntity.PlayerId] = &PointF{X: newX, Y: newY}
			b.World.worldLock.Unlock()

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

// chooseNewDirection picks a valid direction to move in based on bot strategy
func (b *Bot) chooseNewDirection(currentDir string) string {
	// Get runner position for chase/flee behavior
	runnerX, runnerY := b.getRunnerPosition()
	
	// Determine if this bot should chase or flee
	isChaser := b.PlayerEntity.SpriteType != Runner
	
	// Calculate target position based on strategy
	targetX, targetY := b.calculateTargetPosition(runnerX, runnerY, isChaser)
	
	// Build a list of valid directions with scores
	type dirScore struct {
		dir   string
		score float64
	}
	validDirs := make([]dirScore, 0, 4)
	
	speed := PlayerSpeed * 0.2 * 0.001 * 200
	for _, dir := range directions {
		testX, testY := b.PlayerEntity.X, b.PlayerEntity.Y
		switch dir {
		case "up":
			testY -= speed
		case "down":
			testY += speed
		case "left":
			testX -= speed
		case "right":
			testX += speed
		}
		
		if b.World.MazeData == nil || b.World.MazeData.CanMoveTo(b.PlayerEntity.X, b.PlayerEntity.Y, testX, testY) {
			// Calculate distance to target from this new position
			dx := testX - targetX
			dy := testY - targetY
			distToTarget := math.Sqrt(dx*dx + dy*dy)
			
			// Score: prefer smaller distance to target
			score := -distToTarget // Negative so smaller distance = higher score
			
			// Apply aggression - higher aggression means less randomness
			randomFactor := 1.0 - b.AggressionLevel
			score += (rand.Float64() - 0.5) * 100 * randomFactor
			
			// Penalize reversing direction (avoid back and forth)
			if isOppositeDirection(dir, currentDir) {
				score -= 50
			}
			
			validDirs = append(validDirs, dirScore{dir: dir, score: score})
		}
	}
	
	if len(validDirs) == 0 {
		// Fallback to random
		return directions[rand.Intn(len(directions))]
	}
	
	// Pick direction with best score
	bestDir := validDirs[0]
	for _, ds := range validDirs[1:] {
		if ds.score > bestDir.score {
			bestDir = ds
		}
	}
	
	// Update last known runner position for prediction
	b.LastRunnerX = runnerX
	b.LastRunnerY = runnerY
	
	return bestDir.dir
}

// isOppositeDirection checks if two directions are opposites
func isOppositeDirection(dir1, dir2 string) bool {
	opposites := map[string]string{
		"up": "down", "down": "up",
		"left": "right", "right": "left",
	}
	return opposites[dir1] == dir2
}

// calculateTargetPosition determines where the bot should move based on strategy
func (b *Bot) calculateTargetPosition(runnerX, runnerY float64, isChaser bool) (float64, float64) {
	if !isChaser {
		// Runner bot should flee from chasers
		return b.calculateFleePosition()
	}
	
	switch b.Strategy {
	case StrategyChaser:
		// Direct pursuit - go straight for the runner
		return runnerX, runnerY
		
	case StrategyAmbush:
		// Try to predict where runner is going and intercept
		return b.calculateInterceptPosition(runnerX, runnerY)
		
	case StrategyBlocker:
		// Try to block the path ahead of the runner
		return b.calculateBlockPosition(runnerX, runnerY)
		
	case StrategyPatrol:
		// Patrol between key points, chase if runner is nearby
		return b.calculatePatrolPosition(runnerX, runnerY)
		
	default:
		return runnerX, runnerY
	}
}

// calculateInterceptPosition predicts runner movement and intercepts
func (b *Bot) calculateInterceptPosition(runnerX, runnerY float64) (float64, float64) {
	// Calculate runner velocity based on last known position
	velX := runnerX - b.LastRunnerX
	velY := runnerY - b.LastRunnerY
	
	// Predict where runner will be in ~1 second (5 ticks)
	predictedX := runnerX + velX*5
	predictedY := runnerY + velY*5
	
	// Clamp to maze bounds
	predictedX = math.Max(50, math.Min(predictedX, 1350))
	predictedY = math.Max(50, math.Min(predictedY, 1150))
	
	return predictedX, predictedY
}

// calculateBlockPosition tries to get ahead of the runner
func (b *Bot) calculateBlockPosition(runnerX, runnerY float64) (float64, float64) {
	// Get direction of runner movement
	velX := runnerX - b.LastRunnerX
	velY := runnerY - b.LastRunnerY
	
	// Position ourselves ahead of where runner is heading
	aheadX := runnerX + velX*10
	aheadY := runnerY + velY*10
	
	// If we're already close to runner, just chase directly
	dx := b.PlayerEntity.X - runnerX
	dy := b.PlayerEntity.Y - runnerY
	distToRunner := math.Sqrt(dx*dx + dy*dy)
	
	if distToRunner < 100 {
		return runnerX, runnerY
	}
	
	return aheadX, aheadY
}

// calculatePatrolPosition patrols key areas but chases if runner is nearby
func (b *Bot) calculatePatrolPosition(runnerX, runnerY float64) (float64, float64) {
	// Key patrol points (corners and center of maze)
	patrolPoints := []struct{ x, y float64 }{
		{200, 200}, {1200, 200},  // Top corners
		{200, 1000}, {1200, 1000}, // Bottom corners
		{700, 600}, // Center
	}
	
	// Check if runner is nearby (within chase range)
	dx := b.PlayerEntity.X - runnerX
	dy := b.PlayerEntity.Y - runnerY
	distToRunner := math.Sqrt(dx*dx + dy*dy)
	
	if distToRunner < 200 {
		// Runner is close, chase them!
		return runnerX, runnerY
	}
	
	// Find nearest patrol point we're not already at
	bestPoint := patrolPoints[0]
	bestDist := math.MaxFloat64
	
	for _, pt := range patrolPoints {
		dx := b.PlayerEntity.X - pt.x
		dy := b.PlayerEntity.Y - pt.y
		dist := math.Sqrt(dx*dx + dy*dy)
		
		// Skip if we're already at this point
		if dist < 50 {
			continue
		}
		
		if dist < bestDist {
			bestDist = dist
			bestPoint = pt
		}
	}
	
	return bestPoint.x, bestPoint.y
}

// calculateFleePosition finds the best direction to flee from chasers
func (b *Bot) calculateFleePosition() (float64, float64) {
	// Get positions of all chasers
	chaserPositions := b.getChaserPositions()
	
	if len(chaserPositions) == 0 {
		// No chasers, just wander
		return b.PlayerEntity.X + float64(rand.Intn(200)-100), b.PlayerEntity.Y + float64(rand.Intn(200)-100)
	}
	
	// Calculate average chaser position
	avgX, avgY := 0.0, 0.0
	for _, pos := range chaserPositions {
		avgX += pos.X
		avgY += pos.Y
	}
	avgX /= float64(len(chaserPositions))
	avgY /= float64(len(chaserPositions))
	
	// Move away from average chaser position
	fleeX := b.PlayerEntity.X + (b.PlayerEntity.X - avgX)
	fleeY := b.PlayerEntity.Y + (b.PlayerEntity.Y - avgY)
	
	// Clamp to maze bounds
	fleeX = math.Max(50, math.Min(fleeX, 1350))
	fleeY = math.Max(50, math.Min(fleeY, 1150))
	
	return fleeX, fleeY
}

// getChaserPositions returns positions of all chaser bots/players
func (b *Bot) getChaserPositions() []PointF {
	b.World.worldLock.Lock()
	defer b.World.worldLock.Unlock()
	
	positions := make([]PointF, 0)
	
	// Check all player positions
	for playerId, pos := range b.World.PlayerPositions {
		if pos == nil || playerId == b.PlayerEntity.PlayerId {
			continue
		}
		
		// Check if this is a chaser
		session, exists := b.World.ConnectedPlayers.Load(playerId)
		if exists && session != nil {
			player, err := getPlayerEntityFromSession(session)
			if err == nil && player.SpriteType != Runner {
				positions = append(positions, *pos)
			}
		}
	}
	
	// Also check bot chasers
	if b.World.BotManager != nil {
		for _, bot := range b.World.BotManager.GetBots() {
			if bot.PlayerEntity.PlayerId != b.PlayerEntity.PlayerId && bot.PlayerEntity.SpriteType != Runner {
				positions = append(positions, PointF{X: bot.PlayerEntity.X, Y: bot.PlayerEntity.Y})
			}
		}
	}
	
	return positions
}

// getRunnerPosition returns the runner's current position
func (b *Bot) getRunnerPosition() (float64, float64) {
	b.World.worldLock.Lock()
	defer b.World.worldLock.Unlock()
	
	// Look through PlayerPositions to find the runner
	for playerId, pos := range b.World.PlayerPositions {
		if pos == nil {
			continue
		}
		
		// Check connected players for runner
		session, exists := b.World.ConnectedPlayers.Load(playerId)
		if exists && session != nil {
			player, err := getPlayerEntityFromSession(session)
			if err == nil && player.SpriteType == Runner {
				return pos.X, pos.Y
			}
		}
	}
	
	// Also check bots directly (they store position in PlayerEntity)
	if b.World.BotManager != nil {
		for _, bot := range b.World.BotManager.GetBots() {
			if bot.PlayerEntity.SpriteType == Runner {
				return bot.PlayerEntity.X, bot.PlayerEntity.Y
			}
		}
	}
	
	// Fallback: return center position
	return 700, 575
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
		"type":       "dis",
		"user":       bot.PlayerEntity.Username,
		"spriteType": string(bot.PlayerEntity.SpriteType),
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
