package monetization

import "time"

// CosmeticItem represents a cosmetic item in the catalog
type CosmeticItem struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Category    CosmeticType `json:"category"`
	Rarity      RarityLevel  `json:"rarity"`
	PriceCoins  int          `json:"price_coins"`
	PriceGems   int          `json:"price_gems"`
	Preview     string       `json:"preview"` // Image URL or 3D model reference
	Tags        []string     `json:"tags"`
	IsExclusive bool         `json:"is_exclusive"` // Limited time or special event
	ReleaseDate time.Time    `json:"release_date"`
}

// CosmeticType is the category of cosmetic
type CosmeticType string

const (
	CosmeticRunnerSkin CosmeticType = "runner_skin"
	CosmeticChaserSkin CosmeticType = "chaser_skin"
	CosmeticTrail      CosmeticType = "trail"
	CosmeticEmote      CosmeticType = "emote"
	CosmeticFrame      CosmeticType = "frame"
	CosmeticTitle      CosmeticType = "title"
	CosmeticTheme      CosmeticType = "theme"
)

// RarityLevel determines rarity and pricing
type RarityLevel string

const (
	RarityCommon    RarityLevel = "common"
	RarityUncommon  RarityLevel = "uncommon"
	RarityRare      RarityLevel = "rare"
	RarityEpic      RarityLevel = "epic"
	RarityLegendary RarityLevel = "legendary"
)

// RarityColors for UI display
var RarityColors = map[RarityLevel]string{
	RarityCommon:    "#9CA3AF", // Gray
	RarityUncommon:  "#22C55E", // Green
	RarityRare:      "#3B82F6", // Blue
	RarityEpic:      "#A855F7", // Purple
	RarityLegendary: "#F59E0B", // Gold
}

// BasePrices per rarity (in coins)
var BasePrices = map[RarityLevel]int{
	RarityCommon:    150,
	RarityUncommon:  300,
	RarityRare:      500,
	RarityEpic:      800,
	RarityLegendary: 1500,
}

// ============================================
// COSMETICS CATALOG - Sprint 3 Expansion
// ============================================

// RunnerSkins - all available runner skins
var RunnerSkins = []CosmeticItem{
	// Common Skins
	{
		ID:          "runner_classic",
		Name:        "Classic Runner",
		Description: "The original yellow runner. Clean and iconic.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityCommon,
		PriceCoins:  0, // Free default
		PriceGems:   0,
		Tags:        []string{"default", "classic"},
	},
	// Uncommon Skins
	{
		ID:          "runner_neon_blue",
		Name:        "Neon Blue",
		Description: "Cool electric blue with cyan glow trails.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityUncommon,
		PriceCoins:  300,
		PriceGems:   30,
		Tags:        []string{"neon", "blue", "glow"},
	},
	{
		ID:          "runner_sunset",
		Name:        "Sunset Surfer",
		Description: "Warm orange-to-pink gradient. Beach vibes.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityUncommon,
		PriceCoins:  300,
		PriceGems:   30,
		Tags:        []string{"sunset", "warm", "gradient"},
	},
	// Rare Skins
	{
		ID:          "runner_neon_knight",
		Name:        "Neon Knight",
		Description: "Purple armor with glowing neon edges. For true warriors.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityRare,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"neon", "knight", "purple", "armor"},
	},
	{
		ID:          "runner_arctic_frost",
		Name:        "Arctic Frost",
		Description: "Icy blue with snowflake particles. Stay cool under pressure.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityRare,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"ice", "frost", "blue", "particles"},
	},
	{
		ID:          "runner_forest_spirit",
		Name:        "Forest Spirit",
		Description: "Green nature theme with leaf particles.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityRare,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"nature", "green", "forest", "spirit"},
	},
	// Epic Skins
	{
		ID:          "runner_galaxy",
		Name:        "Galaxy Runner",
		Description: "Star-filled cosmic skin with aurora effects.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityEpic,
		PriceCoins:  800,
		PriceGems:   80,
		Tags:        []string{"space", "galaxy", "stars", "cosmic"},
	},
	{
		ID:          "runner_arcade_warrior",
		Name:        "Arcade Warrior",
		Description: "Retro 80s style with scan lines and pixel effects.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityEpic,
		PriceCoins:  800,
		PriceGems:   80,
		Tags:        []string{"retro", "arcade", "80s", "pixel"},
	},
	{
		ID:          "runner_fire_phoenix",
		Name:        "Fire Phoenix",
		Description: "Blazing orange with fire trail and ember particles.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityEpic,
		PriceCoins:  800,
		PriceGems:   80,
		Tags:        []string{"fire", "phoenix", "flame", "hot"},
	},
	// Legendary Skins
	{
		ID:          "runner_holographic",
		Name:        "Holographic Runner",
		Description: "Iridescent rainbow holographic effect. Maximum flex.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityLegendary,
		PriceCoins:  1500,
		PriceGems:   150,
		Tags:        []string{"holographic", "rainbow", "iridescent", "flex"},
	},
	{
		ID:          "runner_shadow_king",
		Name:        "Shadow King",
		Description: "Dark void skin with purple shadow particles.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityLegendary,
		PriceCoins:  1500,
		PriceGems:   150,
		Tags:        []string{"shadow", "dark", "void", "king"},
	},
	{
		ID:          "runner_golden_champion",
		Name:        "Golden Champion",
		Description: "Solid gold with sparkle effects. For winners only.",
		Category:    CosmeticRunnerSkin,
		Rarity:      RarityLegendary,
		PriceCoins:  2000,
		PriceGems:   200,
		Tags:        []string{"gold", "champion", "winner", "sparkle"},
		IsExclusive: true,
	},
}

// ChaserSkins - all available chaser skins
var ChaserSkins = []CosmeticItem{
	// Common
	{
		ID:          "chaser_classic",
		Name:        "Classic Chaser",
		Description: "The original chaser. Simple and effective.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityCommon,
		PriceCoins:  0,
		PriceGems:   0,
		Tags:        []string{"default", "classic"},
	},
	// Uncommon
	{
		ID:          "chaser_neon_pink",
		Name:        "Neon Pink",
		Description: "Hot pink with magenta glow. Stylish hunter.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityUncommon,
		PriceCoins:  300,
		PriceGems:   30,
		Tags:        []string{"neon", "pink", "magenta"},
	},
	{
		ID:          "chaser_ocean",
		Name:        "Ocean Wave",
		Description: "Deep blue with wave patterns.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityUncommon,
		PriceCoins:  300,
		PriceGems:   30,
		Tags:        []string{"ocean", "blue", "wave"},
	},
	// Rare
	{
		ID:          "chaser_lightning",
		Name:        "Lightning Chaser",
		Description: "Electric blue with lightning bolt patterns.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityRare,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"lightning", "electric", "fast"},
	},
	{
		ID:          "chaser_toxic",
		Name:        "Toxic Hunter",
		Description: "Glowing green with toxic drip effects.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityRare,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"toxic", "green", "radioactive"},
	},
	// Epic
	{
		ID:          "chaser_shadow_stalker",
		Name:        "Shadow Stalker",
		Description: "Dark purple with smoke trail. Silent and deadly.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityEpic,
		PriceCoins:  800,
		PriceGems:   80,
		Tags:        []string{"shadow", "dark", "stalker", "smoke"},
	},
	{
		ID:          "chaser_cyber_hunter",
		Name:        "Cyber Hunter",
		Description: "Cyberpunk style with holographic display.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityEpic,
		PriceCoins:  800,
		PriceGems:   80,
		Tags:        []string{"cyber", "punk", "holographic", "tech"},
	},
	// Legendary
	{
		ID:          "chaser_void_lord",
		Name:        "Void Lord",
		Description: "Black hole effect with warping space around it.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityLegendary,
		PriceCoins:  1500,
		PriceGems:   150,
		Tags:        []string{"void", "black", "hole", "warp"},
	},
	{
		ID:          "chaser_inferno",
		Name:        "Inferno Demon",
		Description: "Flaming demon with lava cracks and fire breath.",
		Category:    CosmeticChaserSkin,
		Rarity:      RarityLegendary,
		PriceCoins:  1500,
		PriceGems:   150,
		Tags:        []string{"fire", "demon", "lava", "inferno"},
	},
}

// Trails - movement trail effects
var Trails = []CosmeticItem{
	{
		ID:          "trail_none",
		Name:        "No Trail",
		Description: "Clean look, no trail.",
		Category:    CosmeticTrail,
		Rarity:      RarityCommon,
		PriceCoins:  0,
		PriceGems:   0,
		Tags:        []string{"default", "clean"},
	},
	{
		ID:          "trail_sparkle",
		Name:        "Sparkle Trail",
		Description: "Glittering sparkles follow you.",
		Category:    CosmeticTrail,
		Rarity:      RarityUncommon,
		PriceCoins:  200,
		PriceGems:   20,
		Tags:        []string{"sparkle", "glitter"},
	},
	{
		ID:          "trail_rainbow",
		Name:        "Rainbow Trail",
		Description: "Full spectrum rainbow colors.",
		Category:    CosmeticTrail,
		Rarity:      RarityRare,
		PriceCoins:  400,
		PriceGems:   40,
		Tags:        []string{"rainbow", "colorful"},
	},
	{
		ID:          "trail_fire",
		Name:        "Fire Trail",
		Description: "Leave flames in your wake.",
		Category:    CosmeticTrail,
		Rarity:      RarityRare,
		PriceCoins:  400,
		PriceGems:   40,
		Tags:        []string{"fire", "flame", "hot"},
	},
	{
		ID:          "trail_ice",
		Name:        "Frost Trail",
		Description: "Icy crystals and snowflakes.",
		Category:    CosmeticTrail,
		Rarity:      RarityRare,
		PriceCoins:  400,
		PriceGems:   40,
		Tags:        []string{"ice", "frost", "snow"},
	},
	{
		ID:          "trail_galaxy",
		Name:        "Galaxy Trail",
		Description: "Stars and cosmic dust.",
		Category:    CosmeticTrail,
		Rarity:      RarityEpic,
		PriceCoins:  600,
		PriceGems:   60,
		Tags:        []string{"galaxy", "stars", "cosmic"},
	},
	{
		ID:          "trail_lightning",
		Name:        "Lightning Trail",
		Description: "Electric sparks and bolts.",
		Category:    CosmeticTrail,
		Rarity:      RarityEpic,
		PriceCoins:  600,
		PriceGems:   60,
		Tags:        []string{"lightning", "electric"},
	},
	{
		ID:          "trail_holographic",
		Name:        "Holographic Trail",
		Description: "Shimmering iridescent trail.",
		Category:    CosmeticTrail,
		Rarity:      RarityLegendary,
		PriceCoins:  1000,
		PriceGems:   100,
		Tags:        []string{"holographic", "iridescent"},
	},
}

// Emotes - celebration and expression animations
var Emotes = []CosmeticItem{
	{
		ID:          "emote_wave",
		Name:        "Wave",
		Description: "Friendly wave animation.",
		Category:    CosmeticEmote,
		Rarity:      RarityCommon,
		PriceCoins:  100,
		PriceGems:   10,
		Tags:        []string{"friendly", "greeting"},
	},
	{
		ID:          "emote_dance",
		Name:        "Victory Dance",
		Description: "Celebratory dance moves.",
		Category:    CosmeticEmote,
		Rarity:      RarityUncommon,
		PriceCoins:  200,
		PriceGems:   20,
		Tags:        []string{"dance", "victory"},
	},
	{
		ID:          "emote_taunt",
		Name:        "Taunt",
		Description: "Playful teasing animation.",
		Category:    CosmeticEmote,
		Rarity:      RarityUncommon,
		PriceCoins:  200,
		PriceGems:   20,
		Tags:        []string{"taunt", "playful"},
	},
	{
		ID:          "emote_fireworks",
		Name:        "Fireworks",
		Description: "Spawn celebratory fireworks.",
		Category:    CosmeticEmote,
		Rarity:      RarityRare,
		PriceCoins:  350,
		PriceGems:   35,
		Tags:        []string{"fireworks", "celebration"},
	},
	{
		ID:          "emote_confetti",
		Name:        "Confetti Burst",
		Description: "Explosion of colorful confetti.",
		Category:    CosmeticEmote,
		Rarity:      RarityRare,
		PriceCoins:  350,
		PriceGems:   35,
		Tags:        []string{"confetti", "party"},
	},
	{
		ID:          "emote_mic_drop",
		Name:        "Mic Drop",
		Description: "Drop the mic and walk away.",
		Category:    CosmeticEmote,
		Rarity:      RarityEpic,
		PriceCoins:  500,
		PriceGems:   50,
		Tags:        []string{"mic", "drop", "boss"},
	},
}

// GetAllCosmetics returns all cosmetic items
func GetAllCosmetics() []CosmeticItem {
	all := make([]CosmeticItem, 0, len(RunnerSkins)+len(ChaserSkins)+len(Trails)+len(Emotes))
	all = append(all, RunnerSkins...)
	all = append(all, ChaserSkins...)
	all = append(all, Trails...)
	all = append(all, Emotes...)
	return all
}

// GetCosmeticsByCategory returns cosmetics filtered by category
func GetCosmeticsByCategory(category CosmeticType) []CosmeticItem {
	all := GetAllCosmetics()
	result := make([]CosmeticItem, 0)
	for _, item := range all {
		if item.Category == category {
			result = append(result, item)
		}
	}
	return result
}

// GetCosmeticsByRarity returns cosmetics filtered by rarity
func GetCosmeticsByRarity(rarity RarityLevel) []CosmeticItem {
	all := GetAllCosmetics()
	result := make([]CosmeticItem, 0)
	for _, item := range all {
		if item.Rarity == rarity {
			result = append(result, item)
		}
	}
	return result
}

// GetCosmeticByID finds a cosmetic by ID
func GetCosmeticByID(id string) *CosmeticItem {
	all := GetAllCosmetics()
	for _, item := range all {
		if item.ID == id {
			return &item
		}
	}
	return nil
}

// GetFeaturedItems returns items for featured/sale rotation
func GetFeaturedItems() []CosmeticItem {
	// In production, this would be time-based rotation
	featured := []CosmeticItem{}
	all := GetAllCosmetics()

	// Add some epic/legendary items as featured
	for _, item := range all {
		if item.Rarity == RarityEpic || item.Rarity == RarityLegendary {
			featured = append(featured, item)
			if len(featured) >= 4 {
				break
			}
		}
	}
	return featured
}
