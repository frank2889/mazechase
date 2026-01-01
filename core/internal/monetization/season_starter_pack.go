package monetization

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"
)

// SeasonStarterPack represents a special seasonal offer
type SeasonStarterPack struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Items       []ShopItem `json:"items"`
	Price       int        `json:"price"`
	Currency    string     `json:"currency"`
	Discount    int        `json:"discount"`
	ExpiresAt   int64      `json:"expires_at"`
	Season      int        `json:"season"`
}

// HandleSeasonStarterPurchase handles purchases of seasonal starter packs
func HandleSeasonStarterPurchase(w http.ResponseWriter, r *http.Request) {
	var req PurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Msg("Invalid season starter purchase request")
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Simulate purchase processing
	log.Info().Str("item_id", req.ItemID).Msg("Processing season starter pack purchase")

	response := PurchaseResponse{
		Success:       true,
		TransactionID: "season-" + req.ItemID,
		ItemsReceived: []string{req.ItemID},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
