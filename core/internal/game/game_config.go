package game

import (
	"math/rand"
	"time"
)

// Game configuration constants - centralized for easy tuning

// Tile and movement
const (
	TileSize       = 50    // Pixels per tile (matches Phaser)
	TileSizeFloat  = 50.0  // Float version for calculations
	PlayerSpeed    = 200.0 // Pixels per second
	TickRateMs     = 16    // Milliseconds per tick (~60 FPS)
	TickRateSec    = 0.016 // Seconds per tick
)

// Map dimensions (50x50 circular arena - SIMPLIFIED Dec 2025)
// Reduced from 100x100 for faster games per AI recommendation
const (
	MazeWidth  = 50
	MazeHeight = 50
)

// Spawn positions (tile coordinates) - 4 quadrants of the circular arena
// Center is at 25,25 - spawn offset is 12 tiles from center
// All quadrants use unified Neon Arena theme (simplified Dec 2025)
var SpawnPositions = map[SpriteType]TilePoint{
	Runner:  {X: 13, Y: 13}, // NW quadrant
	Chaser1: {X: 37, Y: 13}, // NE quadrant
	Chaser2: {X: 13, Y: 37}, // SW quadrant
	Chaser3: {X: 37, Y: 37}, // SE quadrant
}

// Power-up locations (tile coordinates) - 1 per quadrant
var PowerUpPositions = []TilePoint{
	{X: 8, Y: 8},   // NW
	{X: 42, Y: 8},  // NE
	{X: 8, Y: 42},  // SW
	{X: 42, Y: 42}, // SE
}

// Game mechanics
const (
	PowerUpDurationSec = 8                                  // Seconds
	PowerUpDuration    = PowerUpDurationSec * time.Second   // As time.Duration
	TotalPelletsMax    = 201                                // Maximum pellets on standard map
	CollisionRadius    = 20                                 // Pixels - collision detection radius
)

// PowerUpType defines different power-up effects
// SIMPLIFIED: Only 3 power-ups for cleaner gameplay (AI recommendation Dec 2025)
type PowerUpType int

const (
	PowerUpClassic PowerUpType = iota // Classic power-up (Runner can eat Chasers)
	PowerUpSpeed                       // Speed boost for runner
	PowerUpMagnet                      // Pellets are attracted to runner
	// REMOVED: Invisible, Freeze, Teleport - too complex, break flow
)

// PowerUpInfo contains power-up specific settings
type PowerUpInfo struct {
	Type     PowerUpType
	Duration time.Duration
	Score    int
}

// PowerUpSettings defines settings for each power-up type
// SIMPLIFIED: 3 intuitive power-ups only
var PowerUpSettings = map[PowerUpType]PowerUpInfo{
	PowerUpClassic: {Type: PowerUpClassic, Duration: 8 * time.Second, Score: 50},
	PowerUpSpeed:   {Type: PowerUpSpeed, Duration: 6 * time.Second, Score: 30},
	PowerUpMagnet:  {Type: PowerUpMagnet, Duration: 7 * time.Second, Score: 35},
}

// GetRandomPowerUpType returns a random power-up type with weighted distribution
// SIMPLIFIED: Only 3 power-ups now
func GetRandomPowerUpType() PowerUpType {
	weights := map[PowerUpType]int{
		PowerUpClassic: 40, // Most common - eat chasers
		PowerUpSpeed:   35, // Fast and fun
		PowerUpMagnet:  25, // Satisfying pellet collection
	}

	total := 0
	for _, w := range weights {
		total += w
	}

	r := rand.Intn(total)
	cumulative := 0
	for pType, weight := range weights {
		cumulative += weight
		if r < cumulative {
			return pType
		}
	}
	return PowerUpClassic
}

// Scoring
const (
	PelletScore   = 10
	PowerUpScore  = 50
	ChaserScore   = 100
	WinBonusScore = 500
)

// Bot behavior
const (
	BotMoveIntervalMs = 200  // Milliseconds between bot moves
	BotFillDelayS     = 10   // Seconds before auto-filling with bots
)

// DifficultySettings (Sprint 1 - Based on AI Tester Feedback)
// Issue: Sandra (38) noted difficulty scaling was too hard for younger players
// Note: DifficultyLevel type is defined in pathfinding.go

// DifficultySettingsData contains all difficulty-dependent values
type DifficultySettingsData struct {
	BotSpeedMultiplier    float64 // How fast bots move (1.0 = normal)
	BotAggressionBase     float64 // Base aggression level (0.0-1.0)
	BotUnpredictability   float64 // Random behavior chance (0.0-1.0)
	BotReactionDelay      int     // Ticks before bot reacts to runner
	PowerUpSpawnRate      float64 // How often power-ups appear (1.0 = normal)
	PowerUpDurationBonus  float64 // Extra power-up duration (1.0 = normal)
	CatchRadius           float64 // How close bot needs to be to catch (1.0 = normal)
	RunnerSpeedBonus      float64 // Runner speed advantage (1.0 = normal)
}

// DifficultyPresets - Easy is now MUCH easier for kids
var DifficultyPresets = map[DifficultyLevel]DifficultySettingsData{
	DifficultyEasy: {
		BotSpeedMultiplier:    0.65,  // Bots are 35% slower
		BotAggressionBase:     0.3,   // Bots are less aggressive
		BotUnpredictability:   0.6,   // More erratic (easier to dodge)
		BotReactionDelay:      8,     // Slow to react
		PowerUpSpawnRate:      1.5,   // 50% more power-ups
		PowerUpDurationBonus:  1.5,   // Power-ups last 50% longer
		CatchRadius:           0.7,   // Need to be closer to catch
		RunnerSpeedBonus:      1.15,  // Runner is 15% faster
	},
	DifficultyMedium: {
		BotSpeedMultiplier:    0.85,
		BotAggressionBase:     0.6,
		BotUnpredictability:   0.4,
		BotReactionDelay:      4,
		PowerUpSpawnRate:      1.0,
		PowerUpDurationBonus:  1.0,
		CatchRadius:           1.0,
		RunnerSpeedBonus:      1.0,
	},
	DifficultyHard: {
		BotSpeedMultiplier:    1.1,   // Bots are 10% faster
		BotAggressionBase:     0.85,  // Very aggressive
		BotUnpredictability:   0.2,   // More predictable (strategic)
		BotReactionDelay:      1,     // Almost instant reaction
		PowerUpSpawnRate:      0.7,   // Fewer power-ups
		PowerUpDurationBonus:  0.8,   // Power-ups don't last as long
		CatchRadius:           1.2,   // Easier to catch runner
		RunnerSpeedBonus:      0.95,  // Runner slightly slower
	},
}

// GetDifficultySettingsData returns settings for a difficulty level
func GetDifficultySettingsData(level DifficultyLevel) DifficultySettingsData {
	if settings, ok := DifficultyPresets[level]; ok {
		return settings
	}
	return DifficultyPresets[DifficultyMedium]
}

// Entity system (dynamic world)
const (
	EntityTickMs        = 50   // Milliseconds per entity update
	PhaseTickMs         = 1000 // Milliseconds per phase update
	PhaseDurationS      = 30   // Seconds per day/night phase
	HunterSpeed         = 2.5  // Tiles per second
	ScannerConeAngle    = 60.0 // Degrees
	ScannerRange        = 8    // Tiles
	SweeperSpeed        = 2.0  // Tiles per second
)

// TilePoint represents a 2D tile coordinate (integers)
type TilePoint struct {
	X int
	Y int
}

// PointF represents a 2D coordinate with floats (pixels)
type PointF struct {
	X float64
	Y float64
}

// TileToPixel converts tile coordinates to pixel coordinates (center of tile)
func TileToPixel(tileX, tileY int) (float64, float64) {
	return float64(tileX)*TileSizeFloat + TileSizeFloat/2,
		float64(tileY)*TileSizeFloat + TileSizeFloat/2
}

// PixelToTile converts pixel coordinates to tile coordinates
func PixelToTile(pixelX, pixelY float64) (int, int) {
	return int(pixelX / TileSizeFloat), int(pixelY / TileSizeFloat)
}

// Distance calculates the distance between two points
func Distance(x1, y1, x2, y2 float64) float64 {
	dx := x2 - x1
	dy := y2 - y1
	return dx*dx + dy*dy // Squared distance for faster comparison
}

// CollisionCheck checks if two positions are colliding
func CollisionCheck(x1, y1, x2, y2 float64) bool {
	return Distance(x1, y1, x2, y2) < float64(CollisionRadius*CollisionRadius)
}

// GetConfigForClient returns game config that should be synced to client (Item #7)
func GetConfigForClient() map[string]interface{} {
	return map[string]interface{}{
		"tileSize":           TileSize,
		"playerSpeed":        PlayerSpeed,
		"tickRateMs":         TickRateMs,
		"mazeWidth":          MazeWidth,
		"mazeHeight":         MazeHeight,
		"powerUpDurationSec": PowerUpDurationSec,
		"pelletScore":        PelletScore,
		"powerUpScore":       PowerUpScore,
		"chaserScore":        ChaserScore,
		"winBonusScore":      WinBonusScore,
		"hunterSpeed":        HunterSpeed,
		"scannerConeAngle":   ScannerConeAngle,
		"scannerRange":       ScannerRange,
		"phaseDurationSec":   PhaseDurationS,
		"collisionRadius":    CollisionRadius,
		// Power-up types for client (SIMPLIFIED: only 3 now)
		"powerUpTypes": map[string]int{
			"classic": int(PowerUpClassic),
			"speed":   int(PowerUpSpeed),
			"magnet":  int(PowerUpMagnet),
		},
	}
}

// CollisionResultType defines what happens on entity collision (Item #41)
type CollisionResultType string

const (
	CollisionCapture   CollisionResultType = "capture"   // Player is caught, loses loot
	CollisionDamage    CollisionResultType = "damage"    // Player takes damage
	CollisionStun      CollisionResultType = "stun"      // Player is stunned briefly
	CollisionLootDrop  CollisionResultType = "loot_drop" // Player drops some resources
)

// CollisionResult contains the outcome of a collision (Item #41)
type CollisionResult struct {
	Type         CollisionResultType `json:"type"`
	LootLost     int                 `json:"lootLost,omitempty"`
	StunDuration float64             `json:"stunDuration,omitempty"` // Seconds
	RespawnDelay float64             `json:"respawnDelay,omitempty"` // Seconds
}

// Respawn settings (Item #43)
const (
	RespawnDelayBase    = 3.0  // Base respawn delay in seconds
	RespawnDelayPerLoot = 0.5  // Extra delay per loot item lost
	MaxRespawnDelay     = 10.0 // Maximum respawn delay
)

// Resource/Artifact settings (Items #37-40)
const (
	ResourceSpawnRate   = 0.1   // Chance per tick to spawn resource in zone
	NightArtifactBonus  = 3     // Multiplier for night artifact value
	DangerZoneBonus     = 2     // Multiplier for danger zone resources
	ExtractionRadius    = 3     // Tiles - radius around safe zone center for extraction
)

// Survival streak settings (Item #44)
const (
	StreakBonusPerSecond = 1  // Bonus points per second survived in danger zone
	StreakMultiplierCap  = 5  // Maximum survival streak multiplier
)

// getSpawnPositionsPixels returns spawn positions in pixel coordinates
func getSpawnPositionsPixels() map[string]map[string]float64 {
	result := make(map[string]map[string]float64)
	for spriteType, tilePos := range SpawnPositions {
		x, y := TileToPixel(tilePos.X, tilePos.Y)
		result[string(spriteType)] = map[string]float64{
			"x": x,
			"y": y,
		}
	}
	return result
}
