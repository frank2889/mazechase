package payments

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
)

func init() {
	// Set Stripe API key from environment
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

// Product represents a purchasable item
type Product struct {
	PriceID string `json:"priceId"`
	Name    string `json:"name"`
	Price   int64  `json:"price"` // in cents
}

// Products available for purchase
var Products = map[string]Product{
	"battle_pass":  {PriceID: "price_battlepass_499", Name: "Battle Pass", Price: 499},
	"vip_monthly":  {PriceID: "price_vip_monthly_399", Name: "MazeChase+ Monthly", Price: 399},
	"starter_pack": {PriceID: "price_starter_499", Name: "Starter Pack", Price: 499},
	"coins_500":    {PriceID: "price_coins_099", Name: "500 Coins", Price: 99},
	"coins_2500":   {PriceID: "price_coins_399", Name: "2500 Coins", Price: 399},
	"coins_10000":  {PriceID: "price_coins_999", Name: "10000 Coins", Price: 999},
}

// CreateCheckoutSessionRequest is the request body for creating a checkout session
type CreateCheckoutSessionRequest struct {
	PriceID     string `json:"priceId"`
	UserID      string `json:"userId"`
	ProductName string `json:"productName"`
	SuccessURL  string `json:"successUrl"`
	CancelURL   string `json:"cancelUrl"`
}

// CreateCheckoutSession creates a Stripe checkout session
func CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	var req CreateCheckoutSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(req.SuccessURL),
		CancelURL:          stripe.String(req.CancelURL),
		ClientReferenceID:  stripe.String(req.UserID),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(req.PriceID),
				Quantity: stripe.Int64(1),
			},
		},
	}

	s, err := session.New(params)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"sessionId": s.ID})
}

// HandleWebhook processes Stripe webhook events
func HandleWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	payload := make([]byte, MaxBodyBytes)
	n, err := r.Body.Read(payload)
	if err != nil && err.Error() != "EOF" {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	payload = payload[:n]

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), endpointSecret)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		// Grant the purchase to the user
		handleSuccessfulPayment(session.ClientReferenceID, session.ID)

	case "customer.subscription.created":
		// Handle new subscription
		fmt.Println("New subscription created")

	case "customer.subscription.deleted":
		// Handle subscription cancellation
		fmt.Println("Subscription cancelled")
	}

	w.WriteHeader(http.StatusOK)
}

func handleSuccessfulPayment(userID, sessionID string) {
	// TODO: Update database to grant purchase
	// - Add coins to user balance
	// - Activate battle pass
	// - Enable VIP status
	fmt.Printf("✅ Payment successful for user %s (session: %s)\n", userID, sessionID)
}

// CheckSubscription checks if a user has an active subscription
func CheckSubscription(w http.ResponseWriter, r *http.Request) {
	// TODO: Query database for subscription status
	userID := r.URL.Query().Get("userId")
	
	// Placeholder - return false for now
	json.NewEncoder(w).Encode(map[string]interface{}{
		"userId": userID,
		"active": false,
	})
}
