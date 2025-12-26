package database

import (
	"github.com/frank2889/mazechase/internal/config"
	"github.com/frank2889/mazechase/internal/lobby"
	"github.com/frank2889/mazechase/internal/user"
	"github.com/rs/zerolog/log"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB() *gorm.DB {
	dbPath := config.Opts.DbPath
	connectionStr := sqlite.Open(dbPath + "?_journal_mode=WAL&_busy_timeout=5000")
	dbConf := &gorm.Config{
		PrepareStmt: true,
	}

	db, err := gorm.Open(connectionStr, dbConf)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect database")
	}

	// Migrate the schema
	err = db.AutoMigrate(user.User{}, user.Score{}, lobby.Lobby{})
	if err != nil {
		log.Fatal().Err(err).Msgf("failed to migrate database")
	}

	log.Info().Msgf("successfully connected to database: %s", dbPath)

	// Seed default users
	seedDefaultUsers(db)

	return db
}

// seedDefaultUsers creates the default family accounts if they don't exist
func seedDefaultUsers(db *gorm.DB) {
	defaultUsers := []struct {
		Username string
		Password string
	}{
		{"melanie", "melanie123"},
		{"frank", "frank123"},
		{"sophie", "sophie123"},
		{"emma", "emma123"},
	}

	// Use silent session for checking existing users (to avoid "record not found" logs)
	silentDB := db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})

	for _, u := range defaultUsers {
		var existing user.User
		result := silentDB.Where("username = ?", u.Username).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			newUser := user.User{
				Username: u.Username,
				Password: user.EncryptPasswordPublic([]byte(u.Password)),
				Token:    "",
				Guest:    false,
			}
			if err := db.Create(&newUser).Error; err != nil {
				log.Warn().Err(err).Str("username", u.Username).Msg("Failed to seed user")
			} else {
				log.Info().Str("username", u.Username).Msg("Seeded default user")
			}
		}
	}
}
