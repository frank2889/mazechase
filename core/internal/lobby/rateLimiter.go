package lobby

import (
	"sync"
	"time"
)

// RateLimiter provides request rate limiting per client
// EMMSOAI Suggestion (Marcus): Implement rate limiting to prevent DDoS attacks
type RateLimiter struct {
	mu          sync.RWMutex
	requests    map[string][]time.Time
	maxRequests int           // Maximum requests per window
	windowSize  time.Duration // Time window
	cleanupTick time.Duration // Cleanup interval
	stopCleanup chan struct{}
}

// NewRateLimiter creates a new rate limiter
// Default: 100 requests per 10 seconds
func NewRateLimiter(maxRequests int, windowSize time.Duration) *RateLimiter {
	if maxRequests <= 0 {
		maxRequests = 100
	}
	if windowSize <= 0 {
		windowSize = 10 * time.Second
	}

	rl := &RateLimiter{
		requests:    make(map[string][]time.Time),
		maxRequests: maxRequests,
		windowSize:  windowSize,
		cleanupTick: 30 * time.Second,
		stopCleanup: make(chan struct{}),
	}

	// Start background cleanup
	go rl.cleanup()

	return rl
}

// DefaultRateLimiter creates a rate limiter with sensible defaults
func DefaultRateLimiter() *RateLimiter {
	return NewRateLimiter(100, 10*time.Second)
}

// Allow checks if a request from clientID should be allowed
func (rl *RateLimiter) Allow(clientID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.windowSize)

	// Get existing requests for this client
	timestamps, exists := rl.requests[clientID]
	if !exists {
		rl.requests[clientID] = []time.Time{now}
		return true
	}

	// Filter requests within current window
	validRequests := make([]time.Time, 0, len(timestamps))
	for _, ts := range timestamps {
		if ts.After(windowStart) {
			validRequests = append(validRequests, ts)
		}
	}

	// Check if under limit
	if len(validRequests) >= rl.maxRequests {
		rl.requests[clientID] = validRequests
		return false
	}

	// Allow request and record it
	rl.requests[clientID] = append(validRequests, now)
	return true
}

// GetRemaining returns remaining requests for clientID
func (rl *RateLimiter) GetRemaining(clientID string) int {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	now := time.Now()
	windowStart := now.Add(-rl.windowSize)

	timestamps, exists := rl.requests[clientID]
	if !exists {
		return rl.maxRequests
	}

	count := 0
	for _, ts := range timestamps {
		if ts.After(windowStart) {
			count++
		}
	}

	return rl.maxRequests - count
}

// Reset clears rate limit data for a client
func (rl *RateLimiter) Reset(clientID string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.requests, clientID)
}

// cleanup periodically removes old entries
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.cleanupTick)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.cleanupOldEntries()
		case <-rl.stopCleanup:
			return
		}
	}
}

func (rl *RateLimiter) cleanupOldEntries() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.windowSize)

	for clientID, timestamps := range rl.requests {
		valid := make([]time.Time, 0)
		for _, ts := range timestamps {
			if ts.After(windowStart) {
				valid = append(valid, ts)
			}
		}

		if len(valid) == 0 {
			delete(rl.requests, clientID)
		} else {
			rl.requests[clientID] = valid
		}
	}
}

// Stop stops the background cleanup goroutine
func (rl *RateLimiter) Stop() {
	close(rl.stopCleanup)
}

// RateLimitMiddleware provides HTTP middleware for rate limiting
type RateLimitConfig struct {
	// LobbyCreate rate limits
	LobbyCreateMax    int
	LobbyCreateWindow time.Duration

	// General API rate limits
	APIMax    int
	APIWindow time.Duration

	// WebSocket message limits
	WSMax    int
	WSWindow time.Duration
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		LobbyCreateMax:    10,
		LobbyCreateWindow: time.Minute,
		APIMax:            200,
		APIWindow:         10 * time.Second,
		WSMax:             100,
		WSWindow:          time.Second,
	}
}
