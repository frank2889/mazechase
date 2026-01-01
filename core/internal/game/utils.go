package game

import (
	"fmt"
	"github.com/olahol/melody"
	"github.com/rs/zerolog/log"
	"maps"
	"math/rand"
	"slices"
	"sync"
)

type Point struct {
	X, Y float64
}
type CoordList struct {
	mu        sync.Mutex
	coordList map[Point]struct{}
}

func NewCordList() CoordList {
	return CoordList{
		mu:        sync.Mutex{},
		coordList: map[Point]struct{}{},
	}
}

func (c *CoordList) Add(x, y float64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	point := Point{X: x, Y: y}
	c.coordList[point] = struct{}{}
}

func (c *CoordList) GetList() []Point {
	c.mu.Lock()
	defer c.mu.Unlock()
	v := slices.Collect(maps.Keys(c.coordList))
	if v == nil {
		return []Point{}
	}
	return v
}

func (c *CoordList) Len() int {
	return len(c.GetList())
}

func (c *CoordList) GetLast() []float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.coordList) == 0 {
		return nil
	}
	// Get any point (maps have no order, but we track last added separately)
	for p := range c.coordList {
		return []float64{p.X, p.Y}
	}
	return nil
}

func (c *CoordList) Contains(x, y float64) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, exists := c.coordList[Point{X: x, Y: y}]
	return exists
}

// Has checks if coordinates exist in the list (alias for Contains)
func (c *CoordList) Has(x, y float64) bool {
	return c.Contains(x, y)
}

// TryAdd attempts to add coordinates atomically (Item #19 - collision claim)
// Returns true if added, false if already exists
func (c *CoordList) TryAdd(x, y float64) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	point := Point{X: x, Y: y}
	if _, exists := c.coordList[point]; exists {
		return false // Already exists
	}
	c.coordList[point] = struct{}{}
	return true
}

// toSlice returns the coordinate list as a slice of [x, y] arrays for JSON serialization
func (c *CoordList) toSlice() [][]float64 {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	result := make([][]float64, 0, len(c.coordList))
	for p := range c.coordList {
		result = append(result, []float64{p.X, p.Y})
	}
	return result
}

func shuffleArray(array []SpriteType) []SpriteType {
	for i := len(array) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		array[i], array[j] = array[j], array[i]
	}
	return array
}

func getPlayerEntityFromSession(playerSession *melody.Session) (*PlayerEntity, error) {
	pInfo, exists := playerSession.Get(userInfoKey)
	if !exists {
		return nil, fmt.Errorf("player info not in session")
	}
	otherPlayerEntity := pInfo.(*PlayerEntity)
	return otherPlayerEntity, nil
}

func getWorldFromSession(s *melody.Session) (*World, error) {
	lobby, exists := s.Get(worldKey)
	if !exists {
		log.Info().Msg("Lobby info not found in sessions")
		return nil, fmt.Errorf("lobby state not found in sessions")
	}

	return lobby.(*World), nil
}
