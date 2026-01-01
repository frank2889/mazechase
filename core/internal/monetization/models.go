package monetization

import (
	"encoding/json"
	"time"
)

// Currency represents player's in-game currencies
type Currency struct {
	Coins   int `json:"coins"`
	Gems    int `json:"gems"`
	Tickets int `json:"tickets"`
}

// InventoryItem represents a single owned cosmetic
type InventoryItem struct {
	ItemID  string    `json:"item_id"`
	OwnedAt time.Time `json:"owned_at"`
	Source  string    `json:"source"` // shop, battlepass, achievement, event, gift, default
}

// EquippedItems tracks what the player has equipped
type EquippedItems struct {
	RunnerSkin string `json:"runner_skin"`
	ChaserSkin string `json:"chaser_skin"`
	Trail      string `json:"trail"`
	Emote1     string `json:"emote1"`
	Emote2     string `json:"emote2"`
	Emote3     string `json:"emote3"`
	Emote4     string `json:"emote4"`
	Frame      string `json:"frame"`
	Title      string `json:"title"`
}

// PlayerInventory is the complete inventory for a player
type PlayerInventory struct {
	UserID   uint64          `json:"user_id"`
	Items    []InventoryItem `json:"items"`
	Equipped EquippedItems   `json:"equipped"`
}

// BattlePassProgress tracks battle pass progression
type BattlePassProgress struct {
	UserID                uint64     `json:"user_id"`
	SeasonID              string     `json:"season_id"`
	HasPremium            bool       `json:"has_premium"`
	CurrentTier           int        `json:"current_tier"`
	CurrentXP             int        `json:"current_xp"`
	TotalXP               int        `json:"total_xp"`
	ClaimedFreeRewards    []int      `json:"claimed_free_rewards"`
	ClaimedPremiumRewards []int      `json:"claimed_premium_rewards"`
	PurchasedAt           *time.Time `json:"purchased_at,omitempty"`
}

// DailyRewardStreak tracks daily login rewards
type DailyRewardStreak struct {
	UserID        uint64 `json:"user_id"`
	CurrentDay    int    `json:"current_day"`
	LastClaimDate string `json:"last_claim_date"` // YYYY-MM-DD
	TotalClaims   int    `json:"total_claims"`
	LongestStreak int    `json:"longest_streak"`
}

// PlayerProgression tracks XP and level
type PlayerProgression struct {
	UserID           uint64 `json:"user_id"`
	Level            int    `json:"level"`
	CurrentXP        int    `json:"current_xp"`
	TotalXP          int    `json:"total_xp"`
	XPToNextLevel    int    `json:"xp_to_next_level"`
	GamesPlayed      int    `json:"games_played"`
	GamesWon         int    `json:"games_won"`
	DailyLoginStreak int    `json:"daily_login_streak"`
}

// CurrencyTransaction logs currency changes
type CurrencyTransaction struct {
	ID        string    `json:"id"`
	UserID    uint64    `json:"user_id"`
	Type      string    `json:"type"`     // earn, spend, purchase, refund
	Currency  string    `json:"currency"` // coins, gems, tickets
	Amount    int       `json:"amount"`
	Reason    string    `json:"reason"`
	ItemID    string    `json:"item_id,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// PurchaseRequest is the request for buying an item
type PurchaseRequest struct {
	ItemID        string `json:"item_id"`
	PaymentMethod string `json:"payment_method"` // coins, gems, real
	Quantity      int    `json:"quantity,omitempty"`
}

// PurchaseResponse is the response after a purchase
type PurchaseResponse struct {
	Success       bool      `json:"success"`
	TransactionID string    `json:"transaction_id,omitempty"`
	Error         string    `json:"error,omitempty"`
	NewBalance    *Currency `json:"new_balance,omitempty"`
	ItemsReceived []string  `json:"items_received,omitempty"`
}

// ShopItem represents an item available in the shop
type ShopItem struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	NameNL      string     `json:"name_nl"`
	Category    string     `json:"category"` // skin, trail, emote, frame, title, theme
	Rarity      string     `json:"rarity"`   // common, rare, epic, legendary, mythic
	PriceCoins  int        `json:"price_coins"`
	PriceGems   int        `json:"price_gems"`
	PriceReal   int        `json:"price_real"` // cents
	Preview     string     `json:"preview"`
	Description string     `json:"description"`
	Featured    bool       `json:"featured"`
	New         bool       `json:"new"`
	Limited     bool       `json:"limited"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// DailyShop is the rotating daily shop
type DailyShop struct {
	Date          string    `json:"date"` // YYYY-MM-DD
	FeaturedItems []string  `json:"featured_items"`
	DailyItems    []string  `json:"daily_items"`
	RefreshesAt   time.Time `json:"refreshes_at"`
}

// SpecialOffer is a limited time bundle
type SpecialOffer struct {
	ID                  string       `json:"id"`
	Name                string       `json:"name"`
	NameNL              string       `json:"name_nl"`
	Description         string       `json:"description"`
	Items               []BundleItem `json:"items"`
	OriginalPriceReal   int          `json:"original_price_real"`
	DiscountedPriceReal int          `json:"discounted_price_real"`
	DiscountPercent     int          `json:"discount_percent"`
	OneTimePurchase     bool         `json:"one_time_purchase"`
	StartsAt            time.Time    `json:"starts_at"`
	EndsAt              time.Time    `json:"ends_at"`
	Banner              string       `json:"banner"`
	Badge               string       `json:"badge,omitempty"`
}

// BundleItem is an item within a bundle
type BundleItem struct {
	Type         string `json:"type"` // cosmetic, currency
	ItemID       string `json:"item_id,omitempty"`
	CurrencyType string `json:"currency_type,omitempty"`
	Amount       int    `json:"amount,omitempty"`
}

// BattlePassReward is a reward from the battle pass
type BattlePassReward struct {
	ID      string `json:"id"`
	Type    string `json:"type"` // coins, gems, skin, trail, emote, frame, title, xp_boost, mystery_box
	ItemID  string `json:"item_id,omitempty"`
	Amount  int    `json:"amount,omitempty"`
	Rarity  string `json:"rarity"`
	Preview string `json:"preview"`
	Name    string `json:"name"`
	NameNL  string `json:"name_nl"`
}

// BattlePassTier is a single tier in the battle pass
type BattlePassTier struct {
	Tier          int               `json:"tier"`
	XPRequired    int               `json:"xp_required"`
	XPTotal       int               `json:"xp_total"`
	FreeReward    *BattlePassReward `json:"free_reward,omitempty"`
	PremiumReward *BattlePassReward `json:"premium_reward,omitempty"`
	Milestone     bool              `json:"milestone"`
}

// BattlePassSeason is a complete battle pass season
type BattlePassSeason struct {
	ID               string           `json:"id"`
	SeasonNumber     int              `json:"season_number"`
	Name             string           `json:"name"`
	NameNL           string           `json:"name_nl"`
	Theme            string           `json:"theme"`
	StartDate        time.Time        `json:"start_date"`
	EndDate          time.Time        `json:"end_date"`
	MaxTier          int              `json:"max_tier"`
	Tiers            []BattlePassTier `json:"tiers"`
	PremiumPrice     int              `json:"premium_price"`      // gems
	PremiumPriceReal int              `json:"premium_price_real"` // cents
	XPBoost          float64          `json:"xp_boost"`           // multiplier
	Banner           string           `json:"banner"`
	Icon             string           `json:"icon"`
	ColorPrimary     string           `json:"color_primary"`
	ColorSecondary   string           `json:"color_secondary"`
}

// JSON helpers for database storage
func (c Currency) ToJSON() ([]byte, error) {
	return json.Marshal(c)
}

func CurrencyFromJSON(data []byte) (Currency, error) {
	var c Currency
	err := json.Unmarshal(data, &c)
	return c, err
}

func (inv PlayerInventory) ToJSON() ([]byte, error) {
	return json.Marshal(inv)
}

func InventoryFromJSON(data []byte) (PlayerInventory, error) {
	var inv PlayerInventory
	err := json.Unmarshal(data, &inv)
	return inv, err
}
