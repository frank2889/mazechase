package game

import (
	"container/heap"
	"math"
)

// PathNode represents a node in the pathfinding grid
type PathNode struct {
	X, Y     int
	G, H, F  float64
	Parent   *PathNode
	Walkable bool
	index    int // for heap
}

// PathGrid represents the game map for pathfinding
type PathGrid struct {
	Width, Height int
	Nodes         [][]*PathNode
}

// NewPathGrid creates a new pathfinding grid
func NewPathGrid(width, height int) *PathGrid {
	grid := &PathGrid{
		Width:  width,
		Height: height,
		Nodes:  make([][]*PathNode, height),
	}

	for y := 0; y < height; y++ {
		grid.Nodes[y] = make([]*PathNode, width)
		for x := 0; x < width; x++ {
			grid.Nodes[y][x] = &PathNode{
				X:        x,
				Y:        y,
				Walkable: true,
			}
		}
	}

	return grid
}

// SetWalkable sets whether a tile is walkable
func (g *PathGrid) SetWalkable(x, y int, walkable bool) {
	if x >= 0 && x < g.Width && y >= 0 && y < g.Height {
		g.Nodes[y][x].Walkable = walkable
	}
}

// GetNode returns the node at given coordinates
func (g *PathGrid) GetNode(x, y int) *PathNode {
	if x >= 0 && x < g.Width && y >= 0 && y < g.Height {
		return g.Nodes[y][x]
	}
	return nil
}

// ResetNodes resets all nodes for new pathfinding
func (g *PathGrid) ResetNodes() {
	for y := 0; y < g.Height; y++ {
		for x := 0; x < g.Width; x++ {
			node := g.Nodes[y][x]
			node.G = 0
			node.H = 0
			node.F = 0
			node.Parent = nil
		}
	}
}

// nodeHeap implements heap.Interface for A* priority queue
type nodeHeap []*PathNode

func (h nodeHeap) Len() int           { return len(h) }
func (h nodeHeap) Less(i, j int) bool { return h[i].F < h[j].F }
func (h nodeHeap) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].index = i
	h[j].index = j
}

func (h *nodeHeap) Push(x interface{}) {
	n := len(*h)
	node := x.(*PathNode)
	node.index = n
	*h = append(*h, node)
}

func (h *nodeHeap) Pop() interface{} {
	old := *h
	n := len(old)
	node := old[n-1]
	old[n-1] = nil
	node.index = -1
	*h = old[0 : n-1]
	return node
}

// AStarPathfinder implements A* pathfinding algorithm
type AStarPathfinder struct {
	grid *PathGrid
}

// NewAStarPathfinder creates a new A* pathfinder
func NewAStarPathfinder(grid *PathGrid) *AStarPathfinder {
	return &AStarPathfinder{grid: grid}
}

// FindPath finds the shortest path from start to end using A*
func (pf *AStarPathfinder) FindPath(startX, startY, endX, endY int) []Point {
	pf.grid.ResetNodes()

	startNode := pf.grid.GetNode(startX, startY)
	endNode := pf.grid.GetNode(endX, endY)

	if startNode == nil || endNode == nil || !startNode.Walkable || !endNode.Walkable {
		return nil
	}

	openSet := &nodeHeap{}
	heap.Init(openSet)

	closedSet := make(map[*PathNode]bool)

	startNode.G = 0
	startNode.H = pf.heuristic(startNode, endNode)
	startNode.F = startNode.G + startNode.H
	heap.Push(openSet, startNode)

	for openSet.Len() > 0 {
		current := heap.Pop(openSet).(*PathNode)

		if current == endNode {
			return pf.reconstructPath(current)
		}

		closedSet[current] = true

		neighbors := pf.getNeighbors(current)
		for _, neighbor := range neighbors {
			if closedSet[neighbor] || !neighbor.Walkable {
				continue
			}

			tentativeG := current.G + pf.distance(current, neighbor)

			inOpenSet := neighbor.index >= 0 && neighbor.index < openSet.Len()

			if !inOpenSet || tentativeG < neighbor.G {
				neighbor.Parent = current
				neighbor.G = tentativeG
				neighbor.H = pf.heuristic(neighbor, endNode)
				neighbor.F = neighbor.G + neighbor.H

				if !inOpenSet {
					heap.Push(openSet, neighbor)
				} else {
					heap.Fix(openSet, neighbor.index)
				}
			}
		}
	}

	return nil // No path found
}

// heuristic calculates the heuristic distance (Manhattan distance)
func (pf *AStarPathfinder) heuristic(a, b *PathNode) float64 {
	return math.Abs(float64(a.X-b.X)) + math.Abs(float64(a.Y-b.Y))
}

// distance calculates the actual distance between adjacent nodes
func (pf *AStarPathfinder) distance(a, b *PathNode) float64 {
	dx := math.Abs(float64(a.X - b.X))
	dy := math.Abs(float64(a.Y - b.Y))
	if dx+dy == 2 {
		return 1.414 // Diagonal
	}
	return 1.0
}

// getNeighbors returns walkable neighboring nodes (4-directional for Pacman)
func (pf *AStarPathfinder) getNeighbors(node *PathNode) []*PathNode {
	neighbors := make([]*PathNode, 0, 4)
	directions := [][2]int{
		{0, -1}, // Up
		{0, 1},  // Down
		{-1, 0}, // Left
		{1, 0},  // Right
	}

	for _, dir := range directions {
		nx, ny := node.X+dir[0], node.Y+dir[1]
		neighbor := pf.grid.GetNode(nx, ny)
		if neighbor != nil && neighbor.Walkable {
			neighbors = append(neighbors, neighbor)
		}
	}

	return neighbors
}

// reconstructPath builds the path from end to start
func (pf *AStarPathfinder) reconstructPath(node *PathNode) []Point {
	path := make([]Point, 0)
	current := node

	for current != nil {
		path = append([]Point{{X: float64(current.X), Y: float64(current.Y)}}, path...)
		current = current.Parent
	}

	return path
}

// GhostAI implements improved ghost AI behavior
type GhostAI struct {
	pathfinder *AStarPathfinder
	difficulty DifficultyLevel
}

// DifficultyLevel represents game difficulty
type DifficultyLevel int

const (
	DifficultyEasy DifficultyLevel = iota
	DifficultyMedium
	DifficultyHard
)

// GhostBehavior represents different ghost behaviors
type GhostBehavior int

const (
	BehaviorChase GhostBehavior = iota
	BehaviorScatter
	BehaviorFrightened
)

// NewGhostAI creates a new ghost AI with pathfinding
func NewGhostAI(grid *PathGrid, difficulty DifficultyLevel) *GhostAI {
	return &GhostAI{
		pathfinder: NewAStarPathfinder(grid),
		difficulty: difficulty,
	}
}

// GetNextMove calculates the next move for a ghost
func (ai *GhostAI) GetNextMove(ghostX, ghostY, pacmanX, pacmanY int, behavior GhostBehavior) (nextX, nextY int) {
	switch behavior {
	case BehaviorChase:
		return ai.chaseMove(ghostX, ghostY, pacmanX, pacmanY)
	case BehaviorScatter:
		return ai.scatterMove(ghostX, ghostY)
	case BehaviorFrightened:
		return ai.frightenedMove(ghostX, ghostY, pacmanX, pacmanY)
	default:
		return ghostX, ghostY
	}
}

// chaseMove calculates chase behavior (move towards Pacman)
func (ai *GhostAI) chaseMove(ghostX, ghostY, pacmanX, pacmanY int) (int, int) {
	// Use pathfinding based on difficulty
	switch ai.difficulty {
	case DifficultyHard:
		// Full A* pathfinding
		path := ai.pathfinder.FindPath(ghostX, ghostY, pacmanX, pacmanY)
		if len(path) > 1 {
			return int(path[1].X), int(path[1].Y)
		}
	case DifficultyMedium:
		// Greedy approach with some randomness
		if randomChance(0.7) {
			return ai.greedyMove(ghostX, ghostY, pacmanX, pacmanY)
		}
		return ai.randomMove(ghostX, ghostY)
	case DifficultyEasy:
		// Random movement with slight bias towards Pacman
		if randomChance(0.3) {
			return ai.greedyMove(ghostX, ghostY, pacmanX, pacmanY)
		}
		return ai.randomMove(ghostX, ghostY)
	}

	return ghostX, ghostY
}

// scatterMove calculates scatter behavior (move to corners)
func (ai *GhostAI) scatterMove(ghostX, ghostY int) (int, int) {
	// Move towards designated corner
	return ai.randomMove(ghostX, ghostY)
}

// frightenedMove calculates frightened behavior (run away from Pacman)
func (ai *GhostAI) frightenedMove(ghostX, ghostY, pacmanX, pacmanY int) (int, int) {
	// Move away from Pacman
	dx := ghostX - pacmanX
	dy := ghostY - pacmanY

	if abs(dx) > abs(dy) {
		if dx > 0 {
			return ghostX + 1, ghostY
		}
		return ghostX - 1, ghostY
	}

	if dy > 0 {
		return ghostX, ghostY + 1
	}
	return ghostX, ghostY - 1
}

// greedyMove makes a greedy move towards target
func (ai *GhostAI) greedyMove(fromX, fromY, toX, toY int) (int, int) {
	dx := toX - fromX
	dy := toY - fromY

	if abs(dx) > abs(dy) {
		if dx > 0 {
			return fromX + 1, fromY
		}
		return fromX - 1, fromY
	}

	if dy > 0 {
		return fromX, fromY + 1
	}
	return fromX, fromY - 1
}

// randomMove makes a random valid move
func (ai *GhostAI) randomMove(x, y int) (int, int) {
	directions := [][2]int{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}
	dir := directions[randomInt(4)]
	return x + dir[0], y + dir[1]
}

// Helper functions
func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func randomChance(probability float64) bool {
	return randomFloat() < probability
}

func randomInt(max int) int {
	// Simple pseudo-random for game purposes
	return int(randomFloat() * float64(max))
}

func randomFloat() float64 {
	// Use time-based seed in production
	return 0.5 // Placeholder - should use proper random
}
