package game

import (
	"encoding/json"
	"math"
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

// GenerateCircularMaze creates a 50x50 circular arena
// SIMPLIFIED (Dec 2025): Reduced from 100x100 for faster games
// The arena is split into 4 quadrants (NW, NE, SW, SE)
// All quadrants use unified Neon Arena theme
func GenerateCircularMaze() [][]int {
	size := 50
	maze := make([][]int, size)
	center := float64(size) / 2
	radius := float64(size)/2 - 2

	crossWidth := 1  // Width of cross divider (narrower for smaller arena)

	for y := 0; y < size; y++ {
		maze[y] = make([]int, size)
		for x := 0; x < size; x++ {
			dx := float64(x) - center + 0.5
			dy := float64(y) - center + 0.5
			dist := math.Sqrt(dx*dx + dy*dy)

			// Outside circle = wall (creates circular boundary)
			if dist > radius {
				maze[y][x] = 1
				continue
			}

			// Create the cross dividers
			isCrossX := x >= int(center)-crossWidth && x < int(center)+crossWidth
			isCrossY := y >= int(center)-crossWidth && y < int(center)+crossWidth
			isCrossWall := isCrossX || isCrossY

			// Create openings in the cross for movement
			corridorOffset := 8
			corridorWidth := 3
			isOpening := false
			
			// Horizontal corridors through vertical wall
			if isCrossX {
				if y >= int(center)-corridorOffset-corridorWidth && y < int(center)-corridorOffset {
					isOpening = true
				}
				if y >= int(center)+corridorOffset && y < int(center)+corridorOffset+corridorWidth {
					isOpening = true
				}
			}
			// Vertical corridors through horizontal wall
			if isCrossY {
				if x >= int(center)-corridorOffset-corridorWidth && x < int(center)-corridorOffset {
					isOpening = true
				}
				if x >= int(center)+corridorOffset && x < int(center)+corridorOffset+corridorWidth {
					isOpening = true
				}
			}

			if isCrossWall && !isOpening {
				maze[y][x] = 1
				continue
			}

			// Default: walkable (pellet position)
			maze[y][x] = 0
		}
	}

	// Add power-ups in each quadrant (simplified: 1 per quadrant)
	powerUpPositions := []struct{ x, y int }{
		{8, 8},   // NW
		{42, 8},  // NE
		{8, 42},  // SW
		{42, 42}, // SE
	}
	for _, pos := range powerUpPositions {
		if pos.y < size && pos.x < size && maze[pos.y][pos.x] == 0 {
			maze[pos.y][pos.x] = 2
		}
	}

	return maze
}

// StandardMazeLayout - generated at init
var StandardMazeLayout = GenerateCircularMaze()

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
			// 3 = spawn area (walkable, no pellet)
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
	
	layout := StandardMazeLayout
	for y := 0; y < m.Height && y < len(layout); y++ {
		for x := 0; x < m.Width && x < len(layout[y]); x++ {
			tile := layout[y][x]
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

// GetFullMazeData returns complete maze layout for client rendering
// This is sent once at game start - clients use this to build the 3D maze
func (m *MazeData) GetFullMazeData() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Convert walls to a flat array of tile types
	// 0 = floor, 1 = wall, 2 = pellet, 3 = power-up
	tiles := make([][]int, m.Height)
	for y := 0; y < m.Height; y++ {
		tiles[y] = make([]int, m.Width)
		for x := 0; x < m.Width; x++ {
			if m.Walls[y][x] {
				tiles[y][x] = 1 // Wall
			} else if m.PowerUps[m.coordKey(x, y)] {
				tiles[y][x] = 3 // Power-up
			} else if m.Pellets[m.coordKey(x, y)] {
				tiles[y][x] = 2 // Pellet
			} else {
				tiles[y][x] = 0 // Floor
			}
		}
	}
	
	return map[string]interface{}{
		"width":  m.Width,
		"height": m.Height,
		"tiles":  tiles,
	}
}
