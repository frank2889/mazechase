package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/rs/zerolog/log"
)

type Options struct {
	ServerPort  int
	DisableAuth bool
	LobbyLimit  int
	DbPath      string
	LogFilePath string
}

var (
	Opts Options
)

const DefaultFilePerm = 0o775

func Load() {
	baseDir := getBaseDir()
	configDir := getConfigDir(baseDir)

	var opts Options
	opts.ServerPort = loadServerPort()
	opts.LobbyLimit = loadLobbyLimit()
	opts.DisableAuth = os.Getenv("MP_DISABLE_AUTH") == "true"

	opts.DbPath = fmt.Sprintf("%s/multipacman.db", configDir)
	opts.LogFilePath = fmt.Sprintf("%s/multipacman.log", configDir)

	Opts = opts

	log.Info().Any("config", Opts).Msg("Loaded config")
}

func getConfigDir(baseDir string) string {
	configDir := fmt.Sprintf("%s/%s", baseDir, "config")
	err := os.MkdirAll(configDir, DefaultFilePerm)
	if err != nil {
		log.Fatal().Err(err).Str("Config dir", configDir).Msgf("could not create config directory")
	}
	return configDir
}

func loadLobbyLimit() int {
	const defaultLobbyLimit = 100 // Increased for more lobbies

	limit, ok := os.LookupEnv("LOBBY_LIMIT")
	if !ok {
		return defaultLobbyLimit
	}
	limitInt, err := strconv.Atoi(limit)
	if err != nil {
		return defaultLobbyLimit
	}

	return limitInt
}

func loadServerPort() int {
	const defaultPort = 8080 // Default for cloud platforms like DigitalOcean
	
	// Check PORT first (standard for cloud platforms)
	envVal, ok := os.LookupEnv("PORT")
	if ok {
		port, err := strconv.Atoi(envVal)
		if err == nil {
			return port
		}
	}
	
	// Fallback to SERVER_PORT
	envVal, ok = os.LookupEnv("SERVER_PORT")
	if ok {
		port, err := strconv.Atoi(envVal)
		if err == nil {
			return port
		}
	}
	
	return defaultPort
}

func getBaseDir() string {
	baseDir := "./appdata"
	if os.Getenv("IS_DOCKER") != "" {
		baseDir = "/appdata"
	}
	return baseDir
}

func getDebugMode() string {
	baseDir := "./appdata"
	if os.Getenv("IS_DOCKER") != "" {
		baseDir = "/appdata"
	}
	return baseDir
}
