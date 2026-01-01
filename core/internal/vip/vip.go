package vip

// VIPPass represents the VIP subscription details
type VIPPass struct {
	Name     string
	Price    string
	Benefits []string
	Priority int
}

// MazeChaseVIPPass is the VIP subscription for MazeChase
var MazeChaseVIPPass = VIPPass{
	Name:     "MazeChase VIP Pass",
	Price:    "$3.99/month",
	Benefits: []string{"ad-free", "daily bonus pellets", "exclusive Runner and Chaser skins"},
	Priority: 5,
}

// IsVIP checks if a user has a VIP subscription
func IsVIP(userSubscription string) bool {
	return userSubscription == MazeChaseVIPPass.Name
}
