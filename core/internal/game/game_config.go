package game

// Game configuration constants - centralized for easy tuning

// Tile and movement
const (
	TileSize       = 50    // Pixels per tile (matches Phaser)
	TileSizeFloat  = 50.0  // Float version for calculations
	PlayerSpeed    = 200.0 // Pixels per second
	TickRateMs     = 16    // Milliseconds per tick (~60 FPS)
	TickRateSec    = 0.016 // Seconds per tick
)

// Map dimensions (28x31 standard Pac-Man maze)
const (
	MazeWidth  = 28
	MazeHeight = 31
)

// Spawn positions (tile coordinates)
var SpawnPositions = map[SpriteType]TilePoint{
	Runner:  {X: 14, Y: 23}, // Bottom center
	Chaser1: {X: 12, Y: 11}, // Ghost box left
	Chaser2: {X: 14, Y: 11}, // Ghost box center
	Chaser3: {X: 16, Y: 11}, // Ghost box right
}

// Power-up locations (tile coordinates) - 4 corners
var PowerUpPositions = []TilePoint{
	{X: 1, Y: 3},   // Top-left
	{X: 26, Y: 3},  // Top-right
	{X: 1, Y: 23},  // Bottom-left
	{X: 26, Y: 23}, // Bottom-right
}

// Game mechanics
const (
	PowerUpDuration = 8   // Seconds
	TotalPelletsMax = 201 // Maximum pellets on standard map
	CollisionRadius = 20  // Pixels - collision detection radius
)

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
