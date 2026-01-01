package game

import "time"

// BattlePassConfig holds the configuration for the battle pass
var BattlePassConfig = struct {
	SeasonTheme   string
	Duration      time.Duration
	FreeRewards   []string
	PremiumRewards []string
	Price         string
}{
	SeasonTheme: "Neon Night Adventures",
	Duration:    8 * 7 * 24 * time.Hour, // 8 weeks
	FreeRewards: []string{
		"Basic skin",
		"Small currency packs",
	},
	PremiumRewards: []string{
		"Exclusive skins",
		"XP boosters",
		"Currency packs",
	},
	Price: "$4.99",
}

// GetBattlePassDetails returns the battle pass configuration
type BattlePassDetails struct {
	SeasonTheme   string   `json:"seasonTheme"`
	Duration      string   `json:"duration"`
	FreeRewards   []string `json:"freeRewards"`
	PremiumRewards []string `json:"premiumRewards"`
	Price         string   `json:"price"`
}

func GetBattlePassDetails() BattlePassDetails {
	return BattlePassDetails{
		SeasonTheme:   BattlePassConfig.SeasonTheme,
		Duration:      "8 weeks",
		FreeRewards:   BattlePassConfig.FreeRewards,
		PremiumRewards: BattlePassConfig.PremiumRewards,
		Price:         BattlePassConfig.Price,
	}
}
