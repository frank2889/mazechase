package game

import (
	"time"
)

type DailyChallenge struct {
	ID          string
	Description string
	RewardType  string
	RewardAmount int
	Completed   bool
}

var dailyChallenges = []DailyChallenge{
	{
		ID:          "challenge_001",
		Description: "Collect 100 pellets in a single game",
		RewardType:  "currency",
		RewardAmount: 50,
		Completed:   false,
	},
	{
		ID:          "challenge_002",
		Description: "Win 3 games as a runner",
		RewardType:  "cosmetic",
		RewardAmount: 1,
		Completed:   false,
	},
}

func GetDailyChallenge() DailyChallenge {
	// Randomly select a challenge
	return dailyChallenges[time.Now().Day()%len(dailyChallenges)]
}

func CompleteChallenge(challengeID string) {
	for i, challenge := range dailyChallenges {
		if challenge.ID == challengeID && !challenge.Completed {
			dailyChallenges[i].Completed = true
			// Add reward logic here
		}
	}
}
