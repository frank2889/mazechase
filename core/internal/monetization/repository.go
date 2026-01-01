package monetization

import (
	"time"

	"gorm.io/gorm"
)

// PlayerCurrency represents stored currency for a player
type PlayerCurrency struct {
	gorm.Model
	UserID uint64 `gorm:"uniqueIndex" json:"user_id"`
	Coins  int    `json:"coins"`
	Gems   int    `json:"gems"`
}

// PlayerItem represents an owned item in the database
type PlayerItem struct {
	gorm.Model
	UserID   uint64    `gorm:"index" json:"user_id"`
	ItemID   string    `json:"item_id"`
	ItemType string    `json:"item_type"` // skin, trail, emote, frame, title
	OwnedAt  time.Time `json:"owned_at"`
	Source   string    `json:"source"` // shop, battlepass, achievement, event, gift, default
}

// PlayerEquipment represents what a player has equipped
type PlayerEquipment struct {
	gorm.Model
	UserID     uint64 `gorm:"uniqueIndex" json:"user_id"`
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

// PlayerBattlePassProgress tracks battle pass progress
type PlayerBattlePassProgress struct {
	gorm.Model
	UserID         uint64 `gorm:"uniqueIndex" json:"user_id"`
	SeasonID       int    `json:"season_id"`
	CurrentXP      int    `json:"current_xp"`
	CurrentTier    int    `json:"current_tier"`
	IsPremium      bool   `json:"is_premium"`
	ClaimedTiers   string `json:"claimed_tiers"`   // JSON array of claimed tier numbers
	PremiumClaimed string `json:"premium_claimed"` // JSON array of claimed premium tiers
}

// PlayerDailyReward tracks daily reward streaks
type PlayerDailyReward struct {
	gorm.Model
	UserID       uint64    `gorm:"uniqueIndex" json:"user_id"`
	CurrentDay   int       `json:"current_day"`
	LastClaimed  time.Time `json:"last_claimed"`
	TotalClaimed int       `json:"total_claimed"`
}

// Transaction logs all purchases
type Transaction struct {
	gorm.Model
	UserID        uint64    `gorm:"index" json:"user_id"`
	TransactionID string    `gorm:"uniqueIndex" json:"transaction_id"`
	ItemID        string    `json:"item_id"`
	ItemType      string    `json:"item_type"`
	PriceAmount   int       `json:"price_amount"`
	PriceCurrency string    `json:"price_currency"` // coins, gems, eur
	Timestamp     time.Time `json:"timestamp"`
	Status        string    `json:"status"` // completed, refunded, failed
}

// MonetizationRepository handles all monetization database operations
type MonetizationRepository struct {
	db *gorm.DB
}

// NewMonetizationRepository creates a new repository
func NewMonetizationRepository(db *gorm.DB) *MonetizationRepository {
	return &MonetizationRepository{db: db}
}

// AutoMigrate runs database migrations for monetization tables
func (r *MonetizationRepository) AutoMigrate() error {
	return r.db.AutoMigrate(
		&PlayerCurrency{},
		&PlayerItem{},
		&PlayerEquipment{},
		&PlayerBattlePassProgress{},
		&PlayerDailyReward{},
		&Transaction{},
	)
}

// ============ CURRENCY OPERATIONS ============

// GetCurrency retrieves player's currency, creating default if not exists
func (r *MonetizationRepository) GetCurrency(userID uint64) (*PlayerCurrency, error) {
	var currency PlayerCurrency
	result := r.db.Where("user_id = ?", userID).First(&currency)
	if result.Error == gorm.ErrRecordNotFound {
		// Create default currency (100 coins, 10 gems for new players)
		currency = PlayerCurrency{
			UserID: userID,
			Coins:  100,
			Gems:   10,
		}
		if err := r.db.Create(&currency).Error; err != nil {
			return nil, err
		}
	} else if result.Error != nil {
		return nil, result.Error
	}
	return &currency, nil
}

// AddCoins adds coins to player's balance
func (r *MonetizationRepository) AddCoins(userID uint64, amount int) error {
	return r.db.Model(&PlayerCurrency{}).Where("user_id = ?", userID).
		UpdateColumn("coins", gorm.Expr("coins + ?", amount)).Error
}

// AddGems adds gems to player's balance
func (r *MonetizationRepository) AddGems(userID uint64, amount int) error {
	return r.db.Model(&PlayerCurrency{}).Where("user_id = ?", userID).
		UpdateColumn("gems", gorm.Expr("gems + ?", amount)).Error
}

// SpendCoins deducts coins if sufficient balance
func (r *MonetizationRepository) SpendCoins(userID uint64, amount int) error {
	result := r.db.Model(&PlayerCurrency{}).
		Where("user_id = ? AND coins >= ?", userID, amount).
		UpdateColumn("coins", gorm.Expr("coins - ?", amount))
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound // Insufficient funds
	}
	return result.Error
}

// SpendGems deducts gems if sufficient balance
func (r *MonetizationRepository) SpendGems(userID uint64, amount int) error {
	result := r.db.Model(&PlayerCurrency{}).
		Where("user_id = ? AND gems >= ?", userID, amount).
		UpdateColumn("gems", gorm.Expr("gems - ?", amount))
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound // Insufficient funds
	}
	return result.Error
}

// ============ INVENTORY OPERATIONS ============

// GetInventory retrieves all items owned by a player
func (r *MonetizationRepository) GetInventory(userID uint64) ([]PlayerItem, error) {
	var items []PlayerItem
	err := r.db.Where("user_id = ?", userID).Find(&items).Error
	return items, err
}

// AddItem adds an item to player's inventory
func (r *MonetizationRepository) AddItem(userID uint64, itemID, itemType, source string) error {
	item := PlayerItem{
		UserID:   userID,
		ItemID:   itemID,
		ItemType: itemType,
		OwnedAt:  time.Now(),
		Source:   source,
	}
	return r.db.Create(&item).Error
}

// HasItem checks if player owns an item
func (r *MonetizationRepository) HasItem(userID uint64, itemID string) bool {
	var count int64
	r.db.Model(&PlayerItem{}).Where("user_id = ? AND item_id = ?", userID, itemID).Count(&count)
	return count > 0
}

// ============ EQUIPMENT OPERATIONS ============

// GetEquipment retrieves player's equipped items
func (r *MonetizationRepository) GetEquipment(userID uint64) (*PlayerEquipment, error) {
	var equipment PlayerEquipment
	result := r.db.Where("user_id = ?", userID).First(&equipment)
	if result.Error == gorm.ErrRecordNotFound {
		// Create default equipment
		equipment = PlayerEquipment{
			UserID:     userID,
			RunnerSkin: "default_runner",
			ChaserSkin: "default_chaser",
			Trail:      "default_trail",
		}
		if err := r.db.Create(&equipment).Error; err != nil {
			return nil, err
		}
	} else if result.Error != nil {
		return nil, result.Error
	}
	return &equipment, nil
}

// EquipItem sets an item as equipped in the appropriate slot
func (r *MonetizationRepository) EquipItem(userID uint64, itemID, slot string) error {
	updates := map[string]interface{}{}
	switch slot {
	case "runner_skin":
		updates["runner_skin"] = itemID
	case "chaser_skin":
		updates["chaser_skin"] = itemID
	case "trail":
		updates["trail"] = itemID
	case "emote1":
		updates["emote1"] = itemID
	case "emote2":
		updates["emote2"] = itemID
	case "emote3":
		updates["emote3"] = itemID
	case "emote4":
		updates["emote4"] = itemID
	case "frame":
		updates["frame"] = itemID
	case "title":
		updates["title"] = itemID
	default:
		return nil
	}
	return r.db.Model(&PlayerEquipment{}).Where("user_id = ?", userID).Updates(updates).Error
}

// ============ BATTLE PASS OPERATIONS ============

// GetBattlePassProgress retrieves player's battle pass progress
func (r *MonetizationRepository) GetBattlePassProgress(userID uint64, seasonID int) (*PlayerBattlePassProgress, error) {
	var progress PlayerBattlePassProgress
	result := r.db.Where("user_id = ? AND season_id = ?", userID, seasonID).First(&progress)
	if result.Error == gorm.ErrRecordNotFound {
		progress = PlayerBattlePassProgress{
			UserID:         userID,
			SeasonID:       seasonID,
			CurrentXP:      0,
			CurrentTier:    1,
			IsPremium:      false,
			ClaimedTiers:   "[]",
			PremiumClaimed: "[]",
		}
		if err := r.db.Create(&progress).Error; err != nil {
			return nil, err
		}
	} else if result.Error != nil {
		return nil, result.Error
	}
	return &progress, nil
}

// AddBattlePassXP adds XP to player's battle pass
func (r *MonetizationRepository) AddBattlePassXP(userID uint64, seasonID int, xp int) error {
	return r.db.Model(&PlayerBattlePassProgress{}).
		Where("user_id = ? AND season_id = ?", userID, seasonID).
		UpdateColumn("current_xp", gorm.Expr("current_xp + ?", xp)).Error
}

// UpgradeToPremium upgrades player to premium battle pass
func (r *MonetizationRepository) UpgradeToPremium(userID uint64, seasonID int) error {
	return r.db.Model(&PlayerBattlePassProgress{}).
		Where("user_id = ? AND season_id = ?", userID, seasonID).
		Update("is_premium", true).Error
}

// ============ DAILY REWARDS ============

// GetDailyReward retrieves player's daily reward status
func (r *MonetizationRepository) GetDailyReward(userID uint64) (*PlayerDailyReward, error) {
	var reward PlayerDailyReward
	result := r.db.Where("user_id = ?", userID).First(&reward)
	if result.Error == gorm.ErrRecordNotFound {
		reward = PlayerDailyReward{
			UserID:       userID,
			CurrentDay:   0,
			LastClaimed:  time.Time{},
			TotalClaimed: 0,
		}
		if err := r.db.Create(&reward).Error; err != nil {
			return nil, err
		}
	} else if result.Error != nil {
		return nil, result.Error
	}
	return &reward, nil
}

// ClaimDailyReward claims today's reward
func (r *MonetizationRepository) ClaimDailyReward(userID uint64, day int) error {
	return r.db.Model(&PlayerDailyReward{}).Where("user_id = ?", userID).Updates(map[string]interface{}{
		"current_day":   day,
		"last_claimed":  time.Now(),
		"total_claimed": gorm.Expr("total_claimed + 1"),
	}).Error
}

// ============ TRANSACTIONS ============

// LogTransaction records a purchase transaction
func (r *MonetizationRepository) LogTransaction(userID uint64, transactionID, itemID, itemType string, priceAmount int, priceCurrency string) error {
	tx := Transaction{
		UserID:        userID,
		TransactionID: transactionID,
		ItemID:        itemID,
		ItemType:      itemType,
		PriceAmount:   priceAmount,
		PriceCurrency: priceCurrency,
		Timestamp:     time.Now(),
		Status:        "completed",
	}
	return r.db.Create(&tx).Error
}

// GetTransactionHistory retrieves player's purchase history
func (r *MonetizationRepository) GetTransactionHistory(userID uint64, limit int) ([]Transaction, error) {
	var transactions []Transaction
	err := r.db.Where("user_id = ?", userID).Order("timestamp desc").Limit(limit).Find(&transactions).Error
	return transactions, err
}
