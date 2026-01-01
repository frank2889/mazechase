package game

import (
	"encoding/json"
	"fmt"
	"github.com/frank2889/mazechase/pkg"
	"github.com/olahol/melody"
	"github.com/rs/zerolog/log"
	"time"
)

// Ensure melody is used (for session range)
var _ = melody.Session{}

type MessageData struct {
	msgInfo       map[string]interface{}
	world         *World
	playerSession *PlayerEntity
}

type MessageHandlerFunc func(data MessageData) map[string]interface{}

type MessageHandler struct {
	handler     MessageHandlerFunc
	messageName string
}

func (handler MessageHandler) WithMiddleware(middleware func(MessageHandlerFunc) MessageHandlerFunc) MessageHandler {
	handler.handler = middleware(handler.handler)
	return handler
}

func CheckGameOverMiddleware(existingFunc MessageHandlerFunc) MessageHandlerFunc {
	return func(data MessageData) map[string]interface{} {
		encodedMsg := existingFunc(data)
		reason, winner := data.world.checkGameOver() // verify the state after message has been handled
		if reason != "" {
			data.world.GameOver(reason, winner)
		}

		return encodedMsg
	}
}

// CheckCollisionMiddleware checks for player-player collisions after movement
func CheckCollisionMiddleware(existingFunc MessageHandlerFunc) MessageHandlerFunc {
	return func(data MessageData) map[string]interface{} {
		result := existingFunc(data)
		
		// Check for runner-chaser collision
		collided, _, chaserId := data.world.CheckPlayerCollisions()
		if collided {
			if data.world.IsPoweredUp {
				// Runner eats chaser
				data.world.ChaserEatenAction(chaserId)
				if result != nil {
					result["chaserEaten"] = string(chaserId)
				}
			} else {
				// Chaser catches runner - game over!
				data.world.GameOver("Runner is gevangen!", "Chasers")
			}
		}
		
		return result
	}
}

func registerMessageHandlers(opts ...MessageHandler) map[string]MessageHandlerFunc {
	handlers := map[string]MessageHandlerFunc{}

	for _, opt := range opts {
		if opt.messageName == "" {
			log.Warn().Msg("Attempted to register a handler with an empty key. Skipping.")
			continue
		}
		if opt.handler == nil {
			log.Warn().Str("key", opt.messageName).Msg("Attempted to register a nil handler for key. Skipping.")
			continue
		}

		if _, exists := handlers[opt.messageName]; exists {
			log.Warn().Str("key", opt.messageName).Msg("Duplicate handler registration attempted. Overwriting.")
		}

		handlers[opt.messageName] = opt.handler
		//log.Debug().Str("key", opt.messageName).Msg("Registered handler")
	}

	return handlers
}

func MovMessage() MessageHandler {
	name := "pos"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			// Get direction from message (new 3D mode)
			dir, hasDir := data.msgInfo["dir"].(string)
			
			if hasDir && dir != "" {
				// Direction-based movement: server calculates new position
				newX, newY, moved := data.world.MovePlayerByDirection(data.playerSession, dir)
				if !moved {
					return nil // Wall collision, don't broadcast
				}
				
				data.playerSession.Type = name
				data.playerSession.Dir = dir
				data.playerSession.X = newX
				data.playerSession.Y = newY
				
				// Check if pellet was eaten
				tileX, tileY := PixelToTile(newX, newY)
				pelletEaten := false
				powerUpEaten := false
				
				// Check last eaten pellet
				if data.world.PelletsCoordEaten.Len() > 0 {
					lastPellet := data.world.PelletsCoordEaten.GetLast()
					if lastPellet != nil && int(lastPellet[0]) == tileX && int(lastPellet[1]) == tileY {
						pelletEaten = true
					}
				}
				
				// Check last eaten power-up
				if data.world.PowerUpsCoordsEaten.Len() > 0 {
					lastPowerUp := data.world.PowerUpsCoordsEaten.GetLast()
					if lastPowerUp != nil && int(lastPowerUp[0]) == tileX && int(lastPowerUp[1]) == tileY {
						powerUpEaten = true
					}
				}
				
				result := data.playerSession.ToMap()
				if pelletEaten {
					result["pellet"] = map[string]int{"x": tileX, "y": tileY}
					result["score"] = data.world.GetScore(data.playerSession.PlayerId)
				}
				if powerUpEaten {
					result["powerUp"] = map[string]int{"x": tileX, "y": tileY}
					result["powered"] = true
				}
				
				return result
			}
			
			// Legacy: x/y coordinates from message (old mode)
			x, y, err := getCoordFromMessage(data.msgInfo)
			if err != nil {
				log.Error().Err(err).
					Any("data", data.msgInfo).
					Msg("Unable to find coordinates or direction from message")
				return nil
			}

			data.world.MovePlayer(data.playerSession, x, y)
			data.playerSession.Type = name
			if dir != "" {
				data.playerSession.Dir = dir
			}

			return data.playerSession.ToMap()
		},
	}
}

func EndGameMessage(reason string, winner string) MessageHandler {
	mesName := "gameover"
	return MessageHandler{
		messageName: mesName,
		handler: func(data MessageData) map[string]interface{} {
			// Get scores if world is available
			scores := map[string]int{}
			if data.world != nil {
				scores = data.world.GetAllScores()
			}
			
			return map[string]interface{}{
				"type":   mesName,
				"reason": reason,
				"winner": winner,
				"scores": scores,
			}
		},
	}
}

func PelletMessage() MessageHandler {
	name := "pel"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			x, y, err := getCoordFromMessage(data.msgInfo)
			if err != nil {
				log.Error().Err(err).Any("msg", data.msgInfo).Msg("Unable to find coordinates or direction from message")
				return nil
			}
			
			// Collision claim protocol (Item #19)
			// Try to eat pellet - returns false if already eaten
			playerID := ""
			if data.playerSession != nil {
				playerID = data.playerSession.PlayerId
			}
			if !data.world.TryEatPellet(x, y, playerID) {
				// Pellet already claimed by another player
				return map[string]interface{}{
					"type":    "pel_reject",
					"x":       x,
					"y":       y,
					"claimed": false,
				}
			}

			return map[string]interface{}{
				"type":    name,
				"x":       x,
				"y":       y,
				"claimed": true,
			}
		},
	}
}

func PowerUpMessage(manager *Manager) MessageHandler {
	name := "pow"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			x, y, err := getCoordFromMessage(data.msgInfo)
			if err != nil {
				return nil
			}

			data.world.EatPowerUp(x, y)

			time.AfterFunc(powerUpTime, func() {
				mess := EndPowerUpMessage(data.world).handler(data)
				marshal, err := json.Marshal(mess)
				if err != nil {
					log.Warn().Err(err).Msg("Unable to marshal json")
					return
				}

				pkg.Elog(manager.broadcastAll(data.world, marshal))
			})

			return map[string]interface{}{
				"type": name,
				"x":    x,
				"y":    y,
			}
		},
	}
}

func KillPlayer() MessageHandler {
	name := "kill"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			chaserId, exists := data.msgInfo["id"]
			if !exists {
				log.Warn().Any("msg", data.msgInfo).Msg("no chaser id found")
				return nil
			}

			if data.world.IsPoweredUp {
				data.world.ChaserEatenAction(SpriteType(chaserId.(string)))
				return map[string]interface{}{
					"type":     name, // chaser eliminated
					"spriteId": chaserId,
				}
			}

			data.world.GameOver("Runner is gevangen!", "Chasers")
			return map[string]interface{}{
				"type":     name,
				"spriteId": Runner, // runner caught
			}
		},
	}
}

func EndPowerUpMessage(lobbyEntity *World) MessageHandler {
	mesName := "powend"
	return MessageHandler{
		messageName: mesName,
		handler: func(data MessageData) map[string]interface{} {
			lobbyEntity.IsPoweredUp = false
			return map[string]interface{}{
				"type": mesName,
			}
		},
	}
}

// ReadyToggleMessage toggles player ready status and broadcasts lobby status
func ReadyToggleMessage() MessageHandler {
	name := "ready"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			data.playerSession.IsReady = !data.playerSession.IsReady

			// Return full lobby status so all clients get updated player list
			players := []map[string]interface{}{}

			for _, session := range data.world.ConnectedPlayers.GetValues() {
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

			return map[string]interface{}{
				"type":         "lobbystatus",
				"players":      players,
				"playerCount":  data.world.GetPlayerCount(),
				"readyCount":   data.world.GetReadyCount(),
				"matchStarted": data.world.MatchStarted,
				"hostId":       data.world.HostPlayerId,
			}
		},
	}
}

// StartGameMessage allows host to start the game with countdown
func StartGameMessage(manager *Manager) MessageHandler {
	name := "startgame"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			// Only host can start
			if !data.playerSession.IsHost {
				return map[string]interface{}{
					"type":  "error",
					"error": "Alleen de host kan de game starten",
				}
			}

			// Check if already started
			if data.world.MatchStarted || data.world.CountdownStarted {
				return nil
			}

			data.world.CountdownStarted = true

			// Start countdown in goroutine
			go func() {
				for i := 3; i > 0; i-- {
					countdownMsg := map[string]interface{}{
						"type":  "countdown",
						"count": i,
					}
					marshal, _ := json.Marshal(countdownMsg)
					manager.broadcastAll(data.world, marshal)
					time.Sleep(1 * time.Second)
				}

				// Game start!
				data.world.MatchStarted = true
				
				// Start dynamic systems with broadcast function
				broadcastDynamic := func(msgType string, dynamicData interface{}) {
					msg := map[string]interface{}{
						"type": msgType,
						"data": dynamicData,
					}
					marshal, err := json.Marshal(msg)
					if err == nil {
						manager.broadcastAll(data.world, marshal)
					}
				}
				data.world.StartDynamicSystems(broadcastDynamic)
				
				// Send game start with initial dynamic state
				dynamicState := data.world.GetDynamicState()
				startMsg := map[string]interface{}{
					"type":         "gamestart",
					"dynamicState": dynamicState,
				}
				marshal, _ := json.Marshal(startMsg)
				manager.broadcastAll(data.world, marshal)
			}()

			return map[string]interface{}{
				"type": "countdownstarted",
			}
		},
	}
}

// LobbyStatusMessage returns current lobby status
func LobbyStatusMessage() MessageHandler {
	name := "lobbystatus"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			players := []map[string]interface{}{}

			for _, session := range data.world.ConnectedPlayers.GetValues() {
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

			return map[string]interface{}{
				"type":          name,
				"players":       players,
				"playerCount":   data.world.GetPlayerCount(),
				"readyCount":    data.world.GetReadyCount(),
				"matchStarted":  data.world.MatchStarted,
				"hostId":        data.world.HostPlayerId,
			}
		},
	}
}

func getCoordFromMessage(msgInfo map[string]interface{}) (X float64, Y float64, err error) {
	x, existsX := msgInfo["x"]
	y, existsY := msgInfo["y"]
	if !existsY || !existsX {
		return 0, 0, fmt.Errorf("unable to find coordinates in message")
	}

	//if _, err := strconv.ParseFloat(x.(), 64); err != nil {
	//	return "", "", fmt.Errorf("invalid X coordinate in message")
	//}
	//if _, err := strconv.ParseFloat(y.(string), 64); err != nil {
	//	return "", "", fmt.Errorf("invalid Y coordinate in message")
	//}

	return x.(float64), y.(float64), nil
}

// =========================================
// Dynamic World Messages
// =========================================

// EntityCollisionMessage handles when a player collides with a danger entity
// Implements Items #41 (collision types), #42 (loot drop), #43 (respawn timer)
func EntityCollisionMessage() MessageHandler {
	name := "entity_collision"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			x, y, err := getCoordFromMessage(data.msgInfo)
			if err != nil {
				return nil
			}
			
			// Check collision on server side
			entity := data.world.CheckEntityCollision(x, y)
			if entity == nil {
				return nil
			}
			
			// Determine effect based on zone and entity type
			zone := data.world.GetCurrentZone(int(x), int(y))
			
			// In safe zones, entities don't kill (unless zone is inactive)
			if zone != nil && zone.Type == ZoneSafe && zone.IsActive {
				return map[string]interface{}{
					"type":     "entity_near",
					"entityId": entity.ID,
					"warning":  true,
				}
			}
			
			// Calculate collision result based on entity type (Item #41)
			result := calculateCollisionResult(entity, data.playerSession)
			
			// Apply collision effects
			lootLost := 0
			if data.playerSession != nil {
				// Apply loot drop (Item #42)
				if result.Type == CollisionCapture || result.Type == CollisionLootDrop {
					lootLost = data.playerSession.Loot
					data.playerSession.Loot = 0
				}
				
				// Apply stun (Item #41)
				if result.Type == CollisionStun && result.StunDuration > 0 {
					data.playerSession.IsStunned = true
					data.playerSession.StunEndTime = time.Now().Add(time.Duration(result.StunDuration * float64(time.Second))).UnixMilli()
				}
				
				// Set respawn timer (Item #43)
				if result.Type == CollisionCapture {
					respawnDelay := RespawnDelayBase + float64(lootLost)*RespawnDelayPerLoot
					if respawnDelay > MaxRespawnDelay {
						respawnDelay = MaxRespawnDelay
					}
					data.playerSession.RespawnTime = time.Now().Add(time.Duration(respawnDelay * float64(time.Second))).UnixMilli()
					
					// Reset survival streak
					data.playerSession.SurvivalStreak = 0
				}
			}
			
			return map[string]interface{}{
				"type":          name,
				"entityId":      entity.ID,
				"entityType":    entity.Type,
				"collisionType": result.Type,
				"lootLost":      lootLost,
				"stunDuration":  result.StunDuration,
				"respawnDelay":  result.RespawnDelay,
				"caught":        result.Type == CollisionCapture,
			}
		},
	}
}

// calculateCollisionResult determines collision outcome based on entity type (Item #41)
func calculateCollisionResult(entity *DangerEntity, player *PlayerEntity) CollisionResult {
	switch entity.Type {
	case EntityHunter:
		// Hunters always capture
		return CollisionResult{
			Type:         CollisionCapture,
			RespawnDelay: RespawnDelayBase,
		}
	case EntityScanner:
		// Scanners stun but don't kill
		return CollisionResult{
			Type:         CollisionStun,
			StunDuration: 2.0,
		}
	case EntitySweeper:
		// Sweepers make you drop loot
		return CollisionResult{
			Type:     CollisionLootDrop,
			LootLost: player.Loot,
		}
	default:
		return CollisionResult{
			Type: CollisionCapture,
		}
	}
}

// ZoneQueryMessage returns the zone at a specific position
func ZoneQueryMessage() MessageHandler {
	name := "zone_query"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			x, y, err := getCoordFromMessage(data.msgInfo)
			if err != nil {
				return nil
			}
			
			zone := data.world.GetCurrentZone(int(x), int(y))
			if zone == nil {
				return map[string]interface{}{
					"type": name,
					"zone": nil,
				}
			}
			
			return map[string]interface{}{
				"type": name,
				"zone": map[string]interface{}{
					"id":       zone.ID,
					"zoneType": zone.Type,
					"isActive": zone.IsActive,
				},
			}
		},
	}
}

// DynamicStateMessage returns the full dynamic state for sync
func DynamicStateMessage() MessageHandler {
	name := "dynamic_state"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			state := data.world.GetDynamicState()
			state["type"] = name
			return state
		},
	}
}

// FullStateMessage returns complete game state for reconnect/resync (Item #3)
func FullStateMessage() MessageHandler {
	name := "full_state"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			dynamicState := data.world.GetDynamicState()
			
			// Build complete state for reconnect
			result := map[string]interface{}{
				"type":          name,
				"serverTime":    time.Now().UnixMilli(),
				"config":        GetConfigForClient(),
				"isPoweredUp":   data.world.IsPoweredUp,
				"matchStarted":  data.world.MatchStarted,
			}
			
			// Include phase info from DynamicWorld
			if data.world.DynamicWorld != nil {
				result["gamePhase"] = data.world.DynamicWorld.CurrentPhase
				result["phaseProgress"] = data.world.DynamicWorld.PhaseProgress
			}
			
			// Include power-up end time
			if !data.world.PowerUpEndTime.IsZero() {
				result["powerUpEnd"] = data.world.PowerUpEndTime.UnixMilli()
			}
			
			// Include dynamic state (zones, entities)
			for k, v := range dynamicState {
				if k != "type" {
					result[k] = v
				}
			}
			
			// Include all player positions
			players := make([]map[string]interface{}, 0)
			data.world.ConnectedPlayers.Range(func(id string, session *melody.Session) bool {
				if pos, exists := data.world.PlayerPositions[id]; exists {
					players = append(players, map[string]interface{}{
						"id": id,
						"x":  pos.X,
						"y":  pos.Y,
					})
				}
				return true
			})
			result["players"] = players
			
			// Include entities from EntityManager
			if data.world.EntityManager != nil {
				result["entities"] = data.world.EntityManager.GetEntitiesJSON()
			}
			
			// Include zones from DynamicWorld
			if data.world.DynamicWorld != nil {
				zones := make([]map[string]interface{}, 0)
				for _, zone := range data.world.DynamicWorld.Zones {
					zones = append(zones, map[string]interface{}{
						"id":       zone.ID,
						"type":     zone.Type,
						"x":        zone.X,
						"y":        zone.Y,
						"width":    zone.Width,
						"height":   zone.Height,
						"isActive": zone.IsActive,
					})
				}
				result["zones"] = zones
			}
			
			// Include eaten pellets
			result["pelletsEaten"] = data.world.PelletsCoordEaten.toSlice()
			
			// Include scores
			result["scores"] = data.world.Scores
			
			return result
		},
	}
}

// RequestFullStateMessage handles client request for full state (reconnection)
func RequestFullStateMessage() MessageHandler {
	name := "request_full_state"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			// Delegate to FullStateMessage handler for actual state generation
			fullStateHandler := FullStateMessage()
			return fullStateHandler.handler(data)
		},
	}
}

// ConfigMessage returns game config to client (Item #7)
// Now includes full maze data for dynamic rendering
func ConfigMessage() MessageHandler {
	name := "game_config"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			config := GetConfigForClient()
			config["type"] = name
			config["serverTime"] = time.Now().UnixMilli()
			
			// Include full maze data for client rendering
			// This allows maps to be generated server-side and sent to clients
			if data.world.MazeData != nil {
				config["mazeData"] = data.world.MazeData.GetFullMazeData()
			}
			
			return config
		},
	}
}

// ResourceSpawnMessage handles resource spawning in zones (Item #37)
func ResourceSpawnMessage() MessageHandler {
	name := "resource_spawn"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			// Get resources from zones
			resources := make([]map[string]interface{}, 0)
			if data.world.DynamicWorld != nil {
				for _, zone := range data.world.DynamicWorld.Zones {
					if zone.Type == DangerZone && len(zone.Resources) > 0 {
						for _, res := range zone.Resources {
							resources = append(resources, map[string]interface{}{
								"id":     res.ID,
								"x":      res.X,
								"y":      res.Y,
								"value":  res.Value,
								"zoneId": zone.ID,
							})
						}
					}
				}
			}
			return map[string]interface{}{
				"type":      name,
				"resources": resources,
			}
		},
	}
}

// CollectResourceMessage handles resource collection (Item #39)
func CollectResourceMessage() MessageHandler {
	name := "collect_resource"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			resourceId, ok := data.msgInfo["resourceId"].(string)
			if !ok {
				return map[string]interface{}{
					"type":    name,
					"success": false,
					"error":   "missing resourceId",
				}
			}
			
			// Find and collect resource via DynamicWorld
			if data.world.DynamicWorld != nil {
				resource := data.world.DynamicWorld.RemoveResource(resourceId)
				if resource != nil {
					// Add to player inventory
					if data.playerSession != nil {
						data.playerSession.Loot += resource.Value
					}
					
					return map[string]interface{}{
						"type":       name,
						"success":    true,
						"resourceId": resourceId,
						"value":      resource.Value,
					}
				}
			}
			
			return map[string]interface{}{
				"type":    name,
				"success": false,
				"error":   "resource not found",
			}
		},
	}
}

// ExtractLootMessage handles loot extraction at safe zone (Item #39)
func ExtractLootMessage() MessageHandler {
	name := "extract_loot"
	return MessageHandler{
		messageName: name,
		handler: func(data MessageData) map[string]interface{} {
			if data.playerSession == nil {
				return map[string]interface{}{
					"type":    name,
					"success": false,
					"error":   "no player session",
				}
			}
			
			// Check if player is in safe zone
			zone := data.world.GetCurrentZone(int(data.playerSession.X)/TileSize, int(data.playerSession.Y)/TileSize)
			if zone == nil || zone.Type != SafeZone || !zone.IsActive {
				return map[string]interface{}{
					"type":    name,
					"success": false,
					"error":   "not in active safe zone",
				}
			}
			
			// Extract loot - convert to score
			loot := data.playerSession.Loot
			if loot <= 0 {
				return map[string]interface{}{
					"type":    name,
					"success": false,
					"error":   "no loot to extract",
				}
			}
			
			// Apply night bonus if applicable (Item #40)
			multiplier := 1
			if data.world.DynamicWorld != nil && data.world.DynamicWorld.CurrentPhase == PhaseNight {
				multiplier = NightArtifactBonus
			}
			
			score := loot * multiplier
			data.playerSession.Loot = 0
			
			// Add to actual score if we have player reference
			// (Would need to link to Player struct)
			
			return map[string]interface{}{
				"type":       name,
				"success":    true,
				"loot":       loot,
				"multiplier": multiplier,
				"score":      score,
			}
		},
	}
}