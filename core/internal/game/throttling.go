package game

import (
	"sync"
	"time"
)

// MessageThrottler throttles specific message types to reduce bandwidth
// Sprint 4 - Performance Optimization
type MessageThrottler struct {
	mu           sync.Mutex
	lastSent     map[string]map[string]time.Time // playerId -> messageType -> lastTime
	minIntervals map[string]time.Duration        // messageType -> minimum interval
}

// NewMessageThrottler creates a new throttler with default intervals
func NewMessageThrottler() *MessageThrottler {
	return &MessageThrottler{
		lastSent: make(map[string]map[string]time.Time),
		minIntervals: map[string]time.Duration{
			"position":    33 * time.Millisecond,  // Max 30 position updates/sec
			"pelletEaten": 0,                      // No throttling
			"scoreUpdate": 100 * time.Millisecond, // Max 10 score updates/sec
			"botPosition": 50 * time.Millisecond,  // Max 20 bot updates/sec
		},
	}
}

// ShouldSend returns true if the message should be sent
func (mt *MessageThrottler) ShouldSend(playerId string, messageType string) bool {
	mt.mu.Lock()
	defer mt.mu.Unlock()

	interval, hasInterval := mt.minIntervals[messageType]
	if !hasInterval || interval == 0 {
		return true // No throttling for this type
	}

	if mt.lastSent[playerId] == nil {
		mt.lastSent[playerId] = make(map[string]time.Time)
	}

	lastTime := mt.lastSent[playerId][messageType]
	now := time.Now()

	if now.Sub(lastTime) < interval {
		return false // Too soon
	}

	mt.lastSent[playerId][messageType] = now
	return true
}

// SetInterval sets the minimum interval for a message type
func (mt *MessageThrottler) SetInterval(messageType string, interval time.Duration) {
	mt.mu.Lock()
	defer mt.mu.Unlock()
	mt.minIntervals[messageType] = interval
}

// CleanupPlayer removes throttle state for a player
func (mt *MessageThrottler) CleanupPlayer(playerId string) {
	mt.mu.Lock()
	defer mt.mu.Unlock()
	delete(mt.lastSent, playerId)
}

// DeltaCompressor compresses state updates by only sending changes
type DeltaCompressor struct {
	mu        sync.Mutex
	lastState map[string]map[string]interface{} // playerId -> lastState
}

// NewDeltaCompressor creates a new delta compressor
func NewDeltaCompressor() *DeltaCompressor {
	return &DeltaCompressor{
		lastState: make(map[string]map[string]interface{}),
	}
}

// Compress returns only the changed fields from the state
func (dc *DeltaCompressor) Compress(playerId string, state map[string]interface{}) map[string]interface{} {
	dc.mu.Lock()
	defer dc.mu.Unlock()

	lastState := dc.lastState[playerId]
	if lastState == nil {
		// First state, send full
		dc.lastState[playerId] = copyStateMap(state)
		return state
	}

	delta := make(map[string]interface{})
	delta["type"] = state["type"] // Always include type

	for key, value := range state {
		if key == "type" {
			continue
		}
		if lastValue, exists := lastState[key]; !exists || !equalStateValues(lastValue, value) {
			delta[key] = value
			lastState[key] = value
		}
	}

	// If only type, nothing changed
	if len(delta) == 1 {
		return nil
	}

	return delta
}

// Reset clears the state for a player
func (dc *DeltaCompressor) Reset(playerId string) {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	delete(dc.lastState, playerId)
}

// Helper: deep copy map
func copyStateMap(m map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m {
		result[k] = v
	}
	return result
}

// Helper: compare values
func equalStateValues(a, b interface{}) bool {
	// Simple comparison - works for primitives
	return a == b
}

// PositionBuffer provides client-side interpolation hints
type PositionBuffer struct {
	mu           sync.Mutex
	positions    map[string][]PositionSample // playerId -> position history
	maxSamples   int
	sampleWindow time.Duration
}

// PositionSample represents a position at a point in time
type PositionSample struct {
	X         float64
	Y         float64
	Timestamp time.Time
}

// NewPositionBuffer creates a new position buffer
func NewPositionBuffer(maxSamples int, sampleWindow time.Duration) *PositionBuffer {
	return &PositionBuffer{
		positions:    make(map[string][]PositionSample),
		maxSamples:   maxSamples,
		sampleWindow: sampleWindow,
	}
}

// RecordPosition adds a position sample
func (pb *PositionBuffer) RecordPosition(playerId string, x, y float64) {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	sample := PositionSample{X: x, Y: y, Timestamp: time.Now()}

	if pb.positions[playerId] == nil {
		pb.positions[playerId] = make([]PositionSample, 0, pb.maxSamples)
	}

	pb.positions[playerId] = append(pb.positions[playerId], sample)

	// Trim old samples
	if len(pb.positions[playerId]) > pb.maxSamples {
		pb.positions[playerId] = pb.positions[playerId][1:]
	}
}

// GetVelocity estimates current velocity for prediction
func (pb *PositionBuffer) GetVelocity(playerId string) (vx, vy float64, valid bool) {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	samples := pb.positions[playerId]
	if len(samples) < 2 {
		return 0, 0, false
	}

	// Use last 2 samples
	s1 := samples[len(samples)-2]
	s2 := samples[len(samples)-1]

	dt := s2.Timestamp.Sub(s1.Timestamp).Seconds()
	if dt <= 0 {
		return 0, 0, false
	}

	vx = (s2.X - s1.X) / dt
	vy = (s2.Y - s1.Y) / dt

	return vx, vy, true
}

// CleanupPlayer removes position history for a player
func (pb *PositionBuffer) CleanupPlayer(playerId string) {
	pb.mu.Lock()
	defer pb.mu.Unlock()
	delete(pb.positions, playerId)
}
