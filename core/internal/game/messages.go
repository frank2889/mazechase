package game

import (
	"encoding/json"
	"fmt"
	"github.com/frank2889/mazechase/pkg"
	"github.com/rs/zerolog/log"
	"time"
)

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
		reason := data.world.checkGameOver() // verify the state after message has been handled
		if reason != "" {
			data.world.GameOver(reason)
		}

		return encodedMsg
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
			x, y, err := getCoordFromMessage(data.msgInfo)
			dir, ok := data.msgInfo["dir"]
			if err != nil || !ok {
				log.Error().Err(err).
					Any("data", data.msgInfo).
					Msg("Unable to find coordinates or direction from message")
				return nil
			}

			data.world.MovePlayer(data.playerSession, x, y)
			data.playerSession.Type = name
			data.playerSession.Dir = dir.(string)

			return data.playerSession.ToMap()
		},
	}
}

func EndGameMessage(reason string) MessageHandler {
	name := "gameover"
	return MessageHandler{
		messageName: name,
		handler: func(_ MessageData) map[string]interface{} {
			return map[string]interface{}{
				"type":   name,
				"reason": reason,
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
			data.world.EatPellet(x, y)

			return map[string]interface{}{
				"type": name,
				"x":    x,
				"y":    y,
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

			data.world.GameOver("runner was caught")
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
				startMsg := map[string]interface{}{
					"type": "gamestart",
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
