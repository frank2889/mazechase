package game

import (
	"encoding/json"
	"fmt"
	"github.com/frank2889/mazechase/internal/lobby"
	"github.com/frank2889/mazechase/internal/user"
	"github.com/frank2889/mazechase/pkg"
	"github.com/olahol/melody"
	"github.com/rs/zerolog/log"
)

type Manager struct {
	activeLobbies pkg.Map[uint, *World]
	lobbyService  *lobby.Service
	mel           *melody.Melody
}

func (manager *Manager) getLobbyIdFromSession(s *melody.Session) uint {
	lobbyId, exists := s.Get(worldKey)
	if !exists {
		log.Warn().Msg("lobby id not found on disconnect")
		return 0
	}
	return lobbyId.(uint)
}

func (manager *Manager) broadcastAll(world *World, message []byte) error {
	broadCastSessions := world.ConnectedPlayers.GetValues()
	// Filter out nil sessions (bots don't have real sessions)
	validSessions := make([]*melody.Session, 0, len(broadCastSessions))
	for _, s := range broadCastSessions {
		if s != nil {
			validSessions = append(validSessions, s)
		}
	}
	if len(validSessions) == 0 {
		return nil
	}
	err := manager.mel.BroadcastMultiple(message, validSessions)
	if err != nil {
		return err
	}
	return nil
}

func (manager *Manager) broadcastExceptPlayer(player *melody.Session, message []byte) error {
	err := manager.mel.BroadcastOthers(message, player)
	if err != nil {
		return err
	}
	return nil
}

func (manager *Manager) sendGameStateInfo(newPlayerSession *melody.Session, world *World) error {
	player, err := getPlayerEntityFromSession(newPlayerSession)
	if err != nil {
		return fmt.Errorf("unable to find player: %v", err)
	}

	gameState, err := world.GetGameStateReport(player.secretToken, player.Username, string(player.SpriteType), newPlayerSession)
	if err != nil {
		return fmt.Errorf("unable to marshal game state: %v", err)
	}

	err = newPlayerSession.Write(gameState)
	if err != nil {
		return fmt.Errorf("unable to send game state: %v", err)
	}

	return nil
}

func (manager *Manager) getWorld(lobby *lobby.Lobby) (*World, error) {
	activeWorld, exists := manager.activeLobbies.Load(lobby.ID)
	if !exists {
		log.Info().Msgf("creating new lobby")

		newWorld := NewWorldState()
		manager.activeLobbies.Store(lobby.ID, newWorld)
		
		// Create broadcast function for bots
		broadcastFunc := func(msg []byte) error {
			return manager.broadcastAll(newWorld, msg)
		}
		newWorld.BotManager = NewBotManager(newWorld, broadcastFunc)
		
		go func() {
			gameOverInfo := newWorld.waitForGameOver()
			
			// Stop all bots when game ends
			if newWorld.BotManager != nil {
				newWorld.BotManager.StopAllBots()
			}
			
			// endgame does not need any info
			msg := EndGameMessage(gameOverInfo.Reason, gameOverInfo.Winner).handler(MessageData{})
			marshal, err := json.Marshal(msg)
			if err != nil {
				log.Error().Err(err).Msg("Unable to marshal msg")
			} else {
				pkg.Elog(manager.broadcastAll(newWorld, marshal))
			}

			log.Debug().Uint("id", lobby.ID).Str("reason", gameOverInfo.Reason).Str("winner", gameOverInfo.Winner).Msg("game end deleting lobby")
			manager.activeLobbies.Delete(lobby.ID)
		}()

		return newWorld, nil
	}

	// If a real player is joining and there are bots, remove one bot
	if activeWorld.BotManager != nil && activeWorld.BotManager.GetBotCount() > 0 {
		activeWorld.BotManager.RemoveOneBot()
	}

	if activeWorld.IsLobbyFull() {
		log.Warn().Any("lobby_state", activeWorld).Msgf("lobby is full, more players are not allowed")
		return nil, fmt.Errorf("lobby is vol")
	}

	return activeWorld, nil
}

func (manager *Manager) getUserAndLobbyInfo(newPlayerSession *melody.Session) (*user.User, *lobby.Lobby, error) {
	userInfo, err := user.UserDataFromContext(newPlayerSession.Request.Context())
	if err != nil {
		log.Error().Err(err).Msg("User context error")
		return nil, nil, fmt.Errorf("niet ingelogd")
	}

	queryParams := newPlayerSession.Request.URL.Query()
	param := queryParams.Get("lobby")
	if param == "" {
		return nil, nil, fmt.Errorf("lobby niet gevonden")
	}

	// Try to find lobby by ID or name
	lobbyInfo, err := manager.lobbyService.GetLobbyByIDOrName(param)
	if err != nil {
		return nil, nil, err
	}

	return userInfo, lobbyInfo, err
}
