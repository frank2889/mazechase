package user

import (
	"gorm.io/gorm"
)

// Score stores game scores for leaderboard
type Score struct {
	gorm.Model
	UserID           uint   `gorm:"index"`
	Username         string `gorm:"index"`
	GameMode         string `gorm:"index"` // classic, race, battle
	Score            int
	PelletsCollected int
	PlayersEliminated int
	Won              bool
	GameDuration     int // seconds
}

// LeaderboardEntry for API responses
type LeaderboardEntry struct {
	Rank     int    `json:"rank"`
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	Score    int    `json:"score"`
	Wins     int    `json:"wins"`
	Games    int    `json:"games"`
}
