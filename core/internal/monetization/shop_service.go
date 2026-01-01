package monetization

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// ShopService handles shop operations
type ShopService struct {
	mu           sync.RWMutex
	inventory    map[uint64]*PlayerInventory
	currencies   map[uint64]*Currency
	progression  map[uint64]*PlayerProgression
	dailyRewards map[uint64]*DailyRewardStreak
	battlePass   map[uint64]*BattlePassProgress
	transactions []CurrencyTransaction
}

// NewShopService creates a new shop service
func NewShopService() *ShopService {
	return &ShopService{
		inventory:    make(map[uint64]*PlayerInventory),
		currencies:   make(map[uint64]*Currency),
		progression:  make(map[uint64]*PlayerProgression),
		dailyRewards: make(map[uint64]*DailyRewardStreak),
		battlePass:   make(map[uint64]*BattlePassProgress),
		transactions: make([]CurrencyTransaction, 0),
	}
}

// Global shop service instance
var shopService = NewShopService()

// GetShopService returns the global shop service
func GetShopService() *ShopService {
	return shopService
}

// ============ CURRENCY OPERATIONS ============

// GetCurrency gets player's currency
func (s *ShopService) GetCurrency(userID uint64) Currency {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if curr, ok := s.currencies[userID]; ok {
		return *curr
	}
	return Currency{Coins: 100, Gems: 10, Tickets: 0} // Starting balance
}

// AddCurrency adds currency to player
func (s *ShopService) AddCurrency(userID uint64, currType string, amount int, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.currencies[userID]; !ok {
		s.currencies[userID] = &Currency{Coins: 100, Gems: 10, Tickets: 0}
	}

	curr := s.currencies[userID]
	switch currType {
	case "coins":
		curr.Coins += amount
	case "gems":
		curr.Gems += amount
	case "tickets":
		curr.Tickets += amount
	default:
		return fmt.Errorf("unknown currency type: %s", currType)
	}

	// Log transaction
	s.transactions = append(s.transactions, CurrencyTransaction{
		ID:        fmt.Sprintf("tx_%d_%d", time.Now().UnixNano(), userID),
		UserID:    userID,
		Type:      "earn",
		Currency:  currType,
		Amount:    amount,
		Reason:    reason,
		Timestamp: time.Now(),
	})

	return nil
}

// SpendCurrency spends currency
func (s *ShopService) SpendCurrency(userID uint64, currType string, amount int, reason string, itemID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.currencies[userID]; !ok {
		s.currencies[userID] = &Currency{Coins: 100, Gems: 10, Tickets: 0}
	}

	curr := s.currencies[userID]
	var balance *int
	switch currType {
	case "coins":
		balance = &curr.Coins
	case "gems":
		balance = &curr.Gems
	case "tickets":
		balance = &curr.Tickets
	default:
		return fmt.Errorf("unknown currency type: %s", currType)
	}

	if *balance < amount {
		return fmt.Errorf("insufficient %s: have %d, need %d", currType, *balance, amount)
	}

	*balance -= amount

	// Log transaction
	s.transactions = append(s.transactions, CurrencyTransaction{
		ID:        fmt.Sprintf("tx_%d_%d", time.Now().UnixNano(), userID),
		UserID:    userID,
		Type:      "spend",
		Currency:  currType,
		Amount:    -amount,
		Reason:    reason,
		ItemID:    itemID,
		Timestamp: time.Now(),
	})

	return nil
}

// ============ INVENTORY OPERATIONS ============

// GetInventory gets player's inventory
func (s *ShopService) GetInventory(userID uint64) PlayerInventory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if inv, ok := s.inventory[userID]; ok {
		return *inv
	}

	// Default inventory
	return PlayerInventory{
		UserID: userID,
		Items:  []InventoryItem{},
		Equipped: EquippedItems{
			RunnerSkin: "default_runner",
			ChaserSkin: "default_chaser",
		},
	}
}

// AddToInventory adds an item to inventory
func (s *ShopService) AddToInventory(userID uint64, itemID string, source string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.inventory[userID]; !ok {
		s.inventory[userID] = &PlayerInventory{
			UserID: userID,
			Items:  []InventoryItem{},
			Equipped: EquippedItems{
				RunnerSkin: "default_runner",
				ChaserSkin: "default_chaser",
			},
		}
	}

	inv := s.inventory[userID]

	// Check if already owned
	for _, item := range inv.Items {
		if item.ItemID == itemID {
			return fmt.Errorf("item already owned: %s", itemID)
		}
	}

	inv.Items = append(inv.Items, InventoryItem{
		ItemID:  itemID,
		OwnedAt: time.Now(),
		Source:  source,
	})

	return nil
}

// EquipItem equips an item
func (s *ShopService) EquipItem(userID uint64, itemID string, slot string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	inv, ok := s.inventory[userID]
	if !ok {
		return fmt.Errorf("no inventory for user %d", userID)
	}

	// Verify ownership (or default items)
	owned := itemID == "" // empty means unequip
	for _, item := range inv.Items {
		if item.ItemID == itemID {
			owned = true
			break
		}
	}
	if !owned && itemID != "default_runner" && itemID != "default_chaser" {
		return fmt.Errorf("item not owned: %s", itemID)
	}

	switch slot {
	case "runner_skin":
		inv.Equipped.RunnerSkin = itemID
	case "chaser_skin":
		inv.Equipped.ChaserSkin = itemID
	case "trail":
		inv.Equipped.Trail = itemID
	case "emote1":
		inv.Equipped.Emote1 = itemID
	case "emote2":
		inv.Equipped.Emote2 = itemID
	case "emote3":
		inv.Equipped.Emote3 = itemID
	case "emote4":
		inv.Equipped.Emote4 = itemID
	case "frame":
		inv.Equipped.Frame = itemID
	case "title":
		inv.Equipped.Title = itemID
	default:
		return fmt.Errorf("unknown slot: %s", slot)
	}

	return nil
}

// ============ PURCHASE OPERATIONS ============

// PurchaseItem handles item purchase
func (s *ShopService) PurchaseItem(userID uint64, req PurchaseRequest) PurchaseResponse {
	// Get item price (would normally come from database)
	price := s.getItemPrice(req.ItemID, req.PaymentMethod)
	if price <= 0 {
		return PurchaseResponse{
			Success: false,
			Error:   "Item not found or not for sale",
		}
	}

	// Spend currency
	err := s.SpendCurrency(userID, req.PaymentMethod, price, "Purchase: "+req.ItemID, req.ItemID)
	if err != nil {
		return PurchaseResponse{
			Success: false,
			Error:   err.Error(),
		}
	}

	// Add to inventory
	err = s.AddToInventory(userID, req.ItemID, "shop")
	if err != nil {
		// Refund on failure
		s.AddCurrency(userID, req.PaymentMethod, price, "Refund: "+req.ItemID)
		return PurchaseResponse{
			Success: false,
			Error:   err.Error(),
		}
	}

	newBalance := s.GetCurrency(userID)
	return PurchaseResponse{
		Success:       true,
		TransactionID: fmt.Sprintf("purchase_%d_%d", time.Now().UnixNano(), userID),
		NewBalance:    &newBalance,
		ItemsReceived: []string{req.ItemID},
	}
}

func (s *ShopService) getItemPrice(itemID string, currencyType string) int {
	// Item catalog - would normally be in database
	prices := map[string]map[string]int{
		"runner_neon_knight":    {"coins": 500, "gems": 50},
		"runner_arcade_warrior": {"coins": 500, "gems": 50},
		"runner_sunset_surfer":  {"coins": 500, "gems": 50},
		"trail_rainbow":         {"coins": 300, "gems": 30},
		"trail_fire":            {"coins": 400, "gems": 40},
		"emote_dance":           {"coins": 200, "gems": 20},
		"emote_wave":            {"coins": 150, "gems": 15},
	}

	if itemPrices, ok := prices[itemID]; ok {
		if price, ok := itemPrices[currencyType]; ok {
			return price
		}
	}

	// Default price
	if currencyType == "coins" {
		return 300
	}
	return 30
}

// ============ BATTLE PASS OPERATIONS ============

// GetBattlePass gets player's battle pass progress
func (s *ShopService) GetBattlePass(userID uint64, seasonID string) *BattlePassProgress {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if bp, ok := s.battlePass[userID]; ok && bp.SeasonID == seasonID {
		return bp
	}
	return nil
}

// InitBattlePass initializes battle pass for player
func (s *ShopService) InitBattlePass(userID uint64, seasonID string) *BattlePassProgress {
	s.mu.Lock()
	defer s.mu.Unlock()

	bp := &BattlePassProgress{
		UserID:                userID,
		SeasonID:              seasonID,
		HasPremium:            false,
		CurrentTier:           1,
		CurrentXP:             0,
		TotalXP:               0,
		ClaimedFreeRewards:    []int{},
		ClaimedPremiumRewards: []int{},
	}
	s.battlePass[userID] = bp
	return bp
}

// AddBattlePassXP adds XP to battle pass
func (s *ShopService) AddBattlePassXP(userID uint64, amount int, xpBoost float64) (leveledUp bool, newTier int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	bp, ok := s.battlePass[userID]
	if !ok {
		return false, 0
	}

	// Apply XP boost for premium
	if bp.HasPremium {
		amount = int(float64(amount) * xpBoost)
	}

	bp.CurrentXP += amount
	bp.TotalXP += amount

	// Check for tier up (100 XP per tier base + 20 per level)
	xpPerTier := 100 + (bp.CurrentTier * 20)
	for bp.CurrentXP >= xpPerTier && bp.CurrentTier < 50 {
		bp.CurrentXP -= xpPerTier
		bp.CurrentTier++
		leveledUp = true
		xpPerTier = 100 + (bp.CurrentTier * 20)
	}

	return leveledUp, bp.CurrentTier
}

// ============ DAILY REWARDS OPERATIONS ============

// GetDailyRewards gets daily reward streak
func (s *ShopService) GetDailyRewards(userID uint64) DailyRewardStreak {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if dr, ok := s.dailyRewards[userID]; ok {
		return *dr
	}
	return DailyRewardStreak{UserID: userID}
}

// ClaimDailyReward claims daily reward
func (s *ShopService) ClaimDailyReward(userID uint64) (success bool, day int, reward Currency) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.dailyRewards[userID]; !ok {
		s.dailyRewards[userID] = &DailyRewardStreak{UserID: userID}
	}

	dr := s.dailyRewards[userID]
	today := time.Now().Format("2006-01-02")

	// Check if already claimed today
	if dr.LastClaimDate == today {
		return false, dr.CurrentDay, Currency{}
	}

	// Check if streak continues
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	if dr.LastClaimDate == yesterday {
		dr.CurrentDay = (dr.CurrentDay % 7) + 1
	} else {
		dr.CurrentDay = 1 // Reset streak
	}

	dr.LastClaimDate = today
	dr.TotalClaims++
	if dr.CurrentDay > dr.LongestStreak {
		dr.LongestStreak = dr.CurrentDay
	}

	// Calculate reward
	rewards := []Currency{
		{Coins: 50},
		{Coins: 75},
		{Coins: 100},
		{Gems: 5},
		{Coins: 150},
		{Coins: 200},
		{Gems: 25}, // Day 7 jackpot
	}
	reward = rewards[(dr.CurrentDay-1)%7]

	return true, dr.CurrentDay, reward
}

// ============ HTTP HANDLERS ============

// HandleGetCurrency handles GET /api/shop/currency
func HandleGetCurrency(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	currency := GetShopService().GetCurrency(userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(currency)
}

// HandleGetInventory handles GET /api/shop/inventory
func HandleGetInventory(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)
	inventory := GetShopService().GetInventory(userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(inventory)
}

// HandlePurchase handles POST /api/shop/purchase
func HandlePurchase(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	var req PurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result := GetShopService().PurchaseItem(userID, req)

	w.Header().Set("Content-Type", "application/json")
	if !result.Success {
		w.WriteHeader(http.StatusBadRequest)
	}
	json.NewEncoder(w).Encode(result)
}

// HandleEquipItem handles POST /api/shop/equip
func HandleEquipItem(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	var req struct {
		ItemID string `json:"item_id"`
		Slot   string `json:"slot"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := GetShopService().EquipItem(userID, req.ItemID, req.Slot)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// HandleClaimDailyReward handles POST /api/shop/daily-reward
func HandleClaimDailyReward(w http.ResponseWriter, r *http.Request) {
	userID := getUserIDFromContext(r)

	success, day, reward := GetShopService().ClaimDailyReward(userID)

	// Grant the reward
	if success {
		if reward.Coins > 0 {
			GetShopService().AddCurrency(userID, "coins", reward.Coins, fmt.Sprintf("Daily Reward Day %d", day))
		}
		if reward.Gems > 0 {
			GetShopService().AddCurrency(userID, "gems", reward.Gems, fmt.Sprintf("Daily Reward Day %d", day))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": success,
		"day":     day,
		"reward":  reward,
	})
}

// Helper to get user ID from request context
func getUserIDFromContext(r *http.Request) uint64 {
	// Would normally extract from JWT or session
	// For now, use a header or default
	return 1
}
