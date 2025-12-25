package pkg

import (
	"context"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gopkg.in/natefinch/lumberjack.v2"
	"os"
)

func getConsoleWriter() zerolog.ConsoleWriter {
	return zerolog.ConsoleWriter{
		Out:        os.Stderr,
		TimeFormat: "2006-01-02 15:04:05",
	}
}

func Elog(err error) {
	if err != nil {
		log.Warn().Err(err).Msg("error logged")
	}
}

func getBaseLogger() zerolog.Logger {
	return log.With().Caller().Logger()
}

func FileConsoleLogger(logFilePath string) {
	log.Logger = getBaseLogger().Output(zerolog.MultiLevelWriter(GetFileLogger(logFilePath), getConsoleWriter()))
}

func ConsoleLogger() {
	log.Logger = getBaseLogger().Output(getConsoleWriter())
}

func GetFileLogger(logFile string) *lumberjack.Logger {
	return &lumberjack.Logger{
		Filename:   logFile,
		MaxSize:    10, // MB
		MaxBackups: 5,  // number of backups
		MaxAge:     30, // days
		Compress:   true,
	}
}

// GameLogger provides structured logging for game events
type GameLogger struct {
	lobbyID   string
	playerID  string
	sessionID string
}

// NewGameLogger creates a new game logger with context
func NewGameLogger(lobbyID, playerID, sessionID string) *GameLogger {
	return &GameLogger{
		lobbyID:   lobbyID,
		playerID:  playerID,
		sessionID: sessionID,
	}
}

// WithContext creates a logger from context
func NewGameLoggerFromContext(ctx context.Context) *GameLogger {
	gl := &GameLogger{}
	
	if lobbyID, ok := ctx.Value("lobbyID").(string); ok {
		gl.lobbyID = lobbyID
	}
	if playerID, ok := ctx.Value("playerID").(string); ok {
		gl.playerID = playerID
	}
	if sessionID, ok := ctx.Value("sessionID").(string); ok {
		gl.sessionID = sessionID
	}
	
	return gl
}

func (gl *GameLogger) baseEvent(level zerolog.Level) *zerolog.Event {
	var event *zerolog.Event
	switch level {
	case zerolog.DebugLevel:
		event = log.Debug()
	case zerolog.WarnLevel:
		event = log.Warn()
	case zerolog.ErrorLevel:
		event = log.Error()
	default:
		event = log.Info()
	}
	
	if gl.lobbyID != "" {
		event = event.Str("lobbyId", gl.lobbyID)
	}
	if gl.playerID != "" {
		event = event.Str("playerId", gl.playerID)
	}
	if gl.sessionID != "" {
		event = event.Str("sessionId", gl.sessionID)
	}
	
	return event
}

// Info logs an info message
func (gl *GameLogger) Info(msg string) {
	gl.baseEvent(zerolog.InfoLevel).Msg(msg)
}

// Debug logs a debug message
func (gl *GameLogger) Debug(msg string) {
	gl.baseEvent(zerolog.DebugLevel).Msg(msg)
}

// Warn logs a warning message
func (gl *GameLogger) Warn(msg string) {
	gl.baseEvent(zerolog.WarnLevel).Msg(msg)
}

// Error logs an error message
func (gl *GameLogger) Error(err error, msg string) {
	gl.baseEvent(zerolog.ErrorLevel).Err(err).Msg(msg)
}

// PlayerJoined logs when a player joins
func (gl *GameLogger) PlayerJoined(username string) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "player_joined").
		Str("username", username).
		Msg("Player joined lobby")
}

// PlayerLeft logs when a player leaves
func (gl *GameLogger) PlayerLeft(username string) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "player_left").
		Str("username", username).
		Msg("Player left lobby")
}

// GameStarted logs when a game starts
func (gl *GameLogger) GameStarted(playerCount int) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "game_started").
		Int("playerCount", playerCount).
		Msg("Game started")
}

// GameEnded logs when a game ends
func (gl *GameLogger) GameEnded(reason string, duration time.Duration) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "game_ended").
		Str("reason", reason).
		Dur("duration", duration).
		Msg("Game ended")
}

// PelletEaten logs when a pellet is eaten
func (gl *GameLogger) PelletEaten(x, y float64) {
	gl.baseEvent(zerolog.DebugLevel).
		Str("event", "pellet_eaten").
		Float64("x", x).
		Float64("y", y).
		Msg("Pellet eaten")
}

// PowerUpEaten logs when a power-up is eaten
func (gl *GameLogger) PowerUpEaten(x, y float64) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "powerup_eaten").
		Float64("x", x).
		Float64("y", y).
		Msg("Power-up eaten")
}

// GhostEaten logs when a ghost is eaten
func (gl *GameLogger) GhostEaten(ghostID string) {
	gl.baseEvent(zerolog.InfoLevel).
		Str("event", "ghost_eaten").
		Str("ghostId", ghostID).
		Msg("Ghost eaten")
}

// MessageReceived logs incoming WebSocket messages
func (gl *GameLogger) MessageReceived(msgType string) {
	gl.baseEvent(zerolog.DebugLevel).
		Str("event", "message_received").
		Str("messageType", msgType).
		Msg("Message received")
}

