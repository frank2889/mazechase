package game

import (
	"encoding/json"
	"sync"
	"time"
)

// MessageBatcher batches multiple messages together for efficient transmission
type MessageBatcher struct {
	mu            sync.Mutex
	messages      []map[string]interface{}
	flushInterval time.Duration
	maxBatchSize  int
	flushChan     chan []byte
	stopChan      chan struct{}
}

// NewMessageBatcher creates a new message batcher
func NewMessageBatcher(flushInterval time.Duration, maxBatchSize int) *MessageBatcher {
	mb := &MessageBatcher{
		messages:      make([]map[string]interface{}, 0, maxBatchSize),
		flushInterval: flushInterval,
		maxBatchSize:  maxBatchSize,
		flushChan:     make(chan []byte, 100),
		stopChan:      make(chan struct{}),
	}

	go mb.flushLoop()

	return mb
}

// Add adds a message to the batch
func (mb *MessageBatcher) Add(msg map[string]interface{}) {
	mb.mu.Lock()
	defer mb.mu.Unlock()

	mb.messages = append(mb.messages, msg)

	// Force flush if batch is full
	if len(mb.messages) >= mb.maxBatchSize {
		mb.flushLocked()
	}
}

// FlushChan returns the channel that receives batched messages
func (mb *MessageBatcher) FlushChan() <-chan []byte {
	return mb.flushChan
}

// Stop stops the batcher
func (mb *MessageBatcher) Stop() {
	close(mb.stopChan)
}

func (mb *MessageBatcher) flushLoop() {
	ticker := time.NewTicker(mb.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			mb.Flush()
		case <-mb.stopChan:
			mb.Flush() // Final flush
			close(mb.flushChan)
			return
		}
	}
}

// Flush sends all pending messages
func (mb *MessageBatcher) Flush() {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.flushLocked()
}

func (mb *MessageBatcher) flushLocked() {
	if len(mb.messages) == 0 {
		return
	}

	// Create batch message
	batch := BatchMessage{
		Type:     "batch",
		Messages: mb.messages,
		Count:    len(mb.messages),
	}

	data, err := json.Marshal(batch)
	if err != nil {
		return
	}

	select {
	case mb.flushChan <- data:
	default:
		// Channel full, drop batch (shouldn't happen with proper sizing)
	}

	// Reset messages slice
	mb.messages = make([]map[string]interface{}, 0, mb.maxBatchSize)
}

// BatchMessage represents a batch of messages
type BatchMessage struct {
	Type     string                   `json:"type"`
	Messages []map[string]interface{} `json:"messages"`
	Count    int                      `json:"count"`
}

// DeltaEncoder tracks state and encodes only changes
type DeltaEncoder struct {
	mu            sync.RWMutex
	lastPositions map[string]Position
	threshold     float64 // Minimum change to trigger update
}

// Position represents a player position
type Position struct {
	X   float64 `json:"x"`
	Y   float64 `json:"y"`
	Dir string  `json:"dir"`
}

// NewDeltaEncoder creates a delta encoder with position threshold
func NewDeltaEncoder(threshold float64) *DeltaEncoder {
	return &DeltaEncoder{
		lastPositions: make(map[string]Position),
		threshold:     threshold,
	}
}

// ShouldUpdate checks if position has changed enough to warrant an update
func (de *DeltaEncoder) ShouldUpdate(playerID string, x, y float64, dir string) bool {
	de.mu.RLock()
	lastPos, exists := de.lastPositions[playerID]
	de.mu.RUnlock()

	if !exists {
		de.UpdatePosition(playerID, x, y, dir)
		return true
	}

	// Check if position changed significantly
	dx := x - lastPos.X
	dy := y - lastPos.Y
	distSquared := dx*dx + dy*dy

	if distSquared >= de.threshold*de.threshold || dir != lastPos.Dir {
		de.UpdatePosition(playerID, x, y, dir)
		return true
	}

	return false
}

// UpdatePosition updates the last known position
func (de *DeltaEncoder) UpdatePosition(playerID string, x, y float64, dir string) {
	de.mu.Lock()
	defer de.mu.Unlock()
	de.lastPositions[playerID] = Position{X: x, Y: y, Dir: dir}
}

// RemovePlayer removes a player from tracking
func (de *DeltaEncoder) RemovePlayer(playerID string) {
	de.mu.Lock()
	defer de.mu.Unlock()
	delete(de.lastPositions, playerID)
}

// GetDelta creates a delta message for position updates
func (de *DeltaEncoder) GetDelta(playerID string, x, y float64, dir string) map[string]interface{} {
	de.mu.RLock()
	lastPos, exists := de.lastPositions[playerID]
	de.mu.RUnlock()

	if !exists {
		return map[string]interface{}{
			"type": "pos",
			"id":   playerID,
			"x":    x,
			"y":    y,
			"dir":  dir,
		}
	}

	delta := map[string]interface{}{
		"type": "delta",
		"id":   playerID,
	}

	// Only include changed values
	if x != lastPos.X {
		delta["x"] = x
	}
	if y != lastPos.Y {
		delta["y"] = y
	}
	if dir != lastPos.Dir {
		delta["dir"] = dir
	}

	return delta
}

// PositionInterpolator handles position interpolation for smooth movement
type PositionInterpolator struct {
	mu        sync.RWMutex
	positions map[string]InterpolationState
}

// InterpolationState tracks interpolation data
type InterpolationState struct {
	CurrentX, CurrentY float64
	TargetX, TargetY   float64
	LastUpdate         time.Time
	Velocity           float64
}

// NewPositionInterpolator creates a position interpolator
func NewPositionInterpolator() *PositionInterpolator {
	return &PositionInterpolator{
		positions: make(map[string]InterpolationState),
	}
}

// UpdateTarget sets a new target position for interpolation
func (pi *PositionInterpolator) UpdateTarget(playerID string, x, y float64) {
	pi.mu.Lock()
	defer pi.mu.Unlock()

	state, exists := pi.positions[playerID]
	if !exists {
		pi.positions[playerID] = InterpolationState{
			CurrentX:   x,
			CurrentY:   y,
			TargetX:    x,
			TargetY:    y,
			LastUpdate: time.Now(),
		}
		return
	}

	state.TargetX = x
	state.TargetY = y
	state.LastUpdate = time.Now()
	pi.positions[playerID] = state
}

// GetInterpolatedPosition returns the interpolated position
func (pi *PositionInterpolator) GetInterpolatedPosition(playerID string, now time.Time) (x, y float64, ok bool) {
	pi.mu.RLock()
	state, exists := pi.positions[playerID]
	pi.mu.RUnlock()

	if !exists {
		return 0, 0, false
	}

	// Simple linear interpolation
	elapsed := now.Sub(state.LastUpdate).Seconds()
	t := elapsed * 10 // Interpolation speed

	if t > 1 {
		t = 1
	}

	x = state.CurrentX + (state.TargetX-state.CurrentX)*t
	y = state.CurrentY + (state.TargetY-state.CurrentY)*t

	return x, y, true
}
