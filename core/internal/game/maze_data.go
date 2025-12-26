package game

import (
	"encoding/json"
	"sync"
)

// MazeData holds the maze layout for collision detection
type MazeData struct {
	Width   int
	Height  int
	Walls   [][]bool          // true = wall
	Pellets map[string]bool   // "x_y" -> exists
	PowerUps map[string]bool  // "x_y" -> exists
	mu      sync.RWMutex
}

// Standard Pac-Man maze layout (28x31)
// 1 = wall, 0 = path/pellet, 2 = power-up, 3 = ghost house, 4 = empty (no pellet)
var StandardMazeLayout = [][]int{
	{1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},
	{1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 2, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 2, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 4, 1, 1, 4, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 4, 1, 1, 4, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 3, 3, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 3, 3, 3, 3, 3, 3, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 1, 3, 3, 3, 3, 3, 3, 1, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 3, 3, 3, 3, 3, 3, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 1, 1, 1, 1, 1, 0, 1, 1, 4, 1, 1, 1, 1, 1, 1, 1, 1, 4, 1, 1, 0, 1, 1, 1, 1, 1, 1},
	{1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1},
	{1, 2, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2, 1},
	{1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1},
	{1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1},
	{1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1},
	{1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1},
	{1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1},
	{1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1},
	{1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},
}

// NewMazeData creates a new MazeData from the standard layout
func NewMazeData() *MazeData {
	maze := &MazeData{
		Width:    MazeWidth,
		Height:   MazeHeight,
		Walls:    make([][]bool, MazeHeight),
		Pellets:  make(map[string]bool),
		PowerUps: make(map[string]bool),
	}

	// Initialize walls and pellets from layout
	for y := 0; y < MazeHeight; y++ {
		maze.Walls[y] = make([]bool, MazeWidth)
		for x := 0; x < MazeWidth; x++ {
			tile := StandardMazeLayout[y][x]
			switch tile {
			case 1: // Wall
				maze.Walls[y][x] = true
			case 0: // Pellet
				maze.Pellets[maze.coordKey(x, y)] = true
			case 2: // Power-up
				maze.PowerUps[maze.coordKey(x, y)] = true
			// 3 = ghost house (walkable, no pellet)
			// 4 = empty path (walkable, no pellet)
			}
		}
	}

	return maze
}

func (m *MazeData) coordKey(x, y int) string {
	return string(rune(x)) + "_" + string(rune(y))
}

// For JSON serialization
func coordKeyStr(x, y int) string {
	return string(rune('0'+x/10)) + string(rune('0'+x%10)) + "_" + string(rune('0'+y/10)) + string(rune('0'+y%10))
}

// IsWall checks if a tile is a wall
func (m *MazeData) IsWall(tileX, tileY int) bool {
	if tileX < 0 || tileX >= m.Width || tileY < 0 || tileY >= m.Height {
		return true // Out of bounds = wall
	}
	return m.Walls[tileY][tileX]
}

// IsWalkable checks if a pixel position is walkable
func (m *MazeData) IsWalkable(pixelX, pixelY float64) bool {
	tileX, tileY := PixelToTile(pixelX, pixelY)
	return !m.IsWall(tileX, tileY)
}

// CanMoveTo checks if movement to a new position is valid
func (m *MazeData) CanMoveTo(fromX, fromY, toX, toY float64) bool {
	// Check destination tile
	if !m.IsWalkable(toX, toY) {
		return false
	}
	
	// Also check intermediate positions for diagonal movement
	if !m.IsWalkable(fromX, toY) || !m.IsWalkable(toX, fromY) {
		return false
	}
	
	return true
}

// HasPellet checks if a pellet exists at the given tile
func (m *MazeData) HasPellet(tileX, tileY int) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.Pellets[m.coordKey(tileX, tileY)]
}

// EatPellet removes a pellet and returns true if it existed
func (m *MazeData) EatPellet(tileX, tileY int) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := m.coordKey(tileX, tileY)
	if m.Pellets[key] {
		delete(m.Pellets, key)
		return true
	}
	return false
}

// HasPowerUp checks if a power-up exists at the given tile
func (m *MazeData) HasPowerUp(tileX, tileY int) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.PowerUps[m.coordKey(tileX, tileY)]
}

// EatPowerUp removes a power-up and returns true if it existed
func (m *MazeData) EatPowerUp(tileX, tileY int) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := m.coordKey(tileX, tileY)
	if m.PowerUps[key] {
		delete(m.PowerUps, key)
		return true
	}
	return false
}

// GetPelletCount returns remaining pellet count
func (m *MazeData) GetPelletCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.Pellets)
}

// Reset restores all pellets and power-ups
func (m *MazeData) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.Pellets = make(map[string]bool)
	m.PowerUps = make(map[string]bool)
	
	for y := 0; y < MazeHeight; y++ {
		for x := 0; x < MazeWidth; x++ {
			tile := StandardMazeLayout[y][x]
			switch tile {
			case 0:
				m.Pellets[m.coordKey(x, y)] = true
			case 2:
				m.PowerUps[m.coordKey(x, y)] = true
			}
		}
	}
}

// MazeStateJSON returns the current maze state for syncing
func (m *MazeData) MazeStateJSON() ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	state := map[string]interface{}{
		"width":    m.Width,
		"height":   m.Height,
		"pellets":  len(m.Pellets),
		"powerUps": len(m.PowerUps),
	}
	
	return json.Marshal(state)
}
