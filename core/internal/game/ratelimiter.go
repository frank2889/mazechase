package game

import (
	"sync"
	"time"
)

// RateLimiter implements a token bucket rate limiter for WebSocket messages
type RateLimiter struct {
	mu           sync.Mutex
	tokens       float64
	maxTokens    float64
	refillRate   float64 // tokens per second
	lastRefill   time.Time
	blockedUntil time.Time
}

// NewRateLimiter creates a new rate limiter
// maxTokens: maximum burst capacity
// refillRate: tokens added per second
func NewRateLimiter(maxTokens, refillRate float64) *RateLimiter {
	return &RateLimiter{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if an action is allowed and consumes a token if so
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	// Check if still blocked
	if now.Before(rl.blockedUntil) {
		return false
	}

	// Refill tokens based on time elapsed
	elapsed := now.Sub(rl.lastRefill).Seconds()
	rl.tokens += elapsed * rl.refillRate
	if rl.tokens > rl.maxTokens {
		rl.tokens = rl.maxTokens
	}
	rl.lastRefill = now

	// Check if we have tokens available
	if rl.tokens >= 1 {
		rl.tokens--
		return true
	}

	// No tokens available, block for a short period
	rl.blockedUntil = now.Add(100 * time.Millisecond)
	return false
}

// AllowN checks if n actions are allowed
func (rl *RateLimiter) AllowN(n int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	if now.Before(rl.blockedUntil) {
		return false
	}

	elapsed := now.Sub(rl.lastRefill).Seconds()
	rl.tokens += elapsed * rl.refillRate
	if rl.tokens > rl.maxTokens {
		rl.tokens = rl.maxTokens
	}
	rl.lastRefill = now

	if rl.tokens >= float64(n) {
		rl.tokens -= float64(n)
		return true
	}

	return false
}

// PlayerRateLimiter manages rate limiters per player
type PlayerRateLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*RateLimiter
	config   RateLimitConfig
}

// RateLimitConfig defines rate limiting parameters
type RateLimitConfig struct {
	MaxTokens      float64 // Maximum burst capacity
	RefillRate     float64 // Tokens per second
	CleanupPeriod  time.Duration
	MaxIdleTime    time.Duration
}

// DefaultRateLimitConfig returns sensible defaults for game messages
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		MaxTokens:     60,             // Allow burst of 60 messages
		RefillRate:    30,             // 30 messages per second sustained
		CleanupPeriod: 5 * time.Minute,
		MaxIdleTime:   10 * time.Minute,
	}
}

// NewPlayerRateLimiter creates a rate limiter manager for all players
func NewPlayerRateLimiter(config RateLimitConfig) *PlayerRateLimiter {
	prl := &PlayerRateLimiter{
		limiters: make(map[string]*RateLimiter),
		config:   config,
	}

	// Start cleanup goroutine
	go prl.cleanupLoop()

	return prl
}

// GetLimiter returns the rate limiter for a player, creating one if necessary
func (prl *PlayerRateLimiter) GetLimiter(playerID string) *RateLimiter {
	prl.mu.RLock()
	limiter, exists := prl.limiters[playerID]
	prl.mu.RUnlock()

	if exists {
		return limiter
	}

	prl.mu.Lock()
	defer prl.mu.Unlock()

	// Double-check after acquiring write lock
	if limiter, exists = prl.limiters[playerID]; exists {
		return limiter
	}

	limiter = NewRateLimiter(prl.config.MaxTokens, prl.config.RefillRate)
	prl.limiters[playerID] = limiter
	return limiter
}

// RemoveLimiter removes a player's rate limiter
func (prl *PlayerRateLimiter) RemoveLimiter(playerID string) {
	prl.mu.Lock()
	defer prl.mu.Unlock()
	delete(prl.limiters, playerID)
}

// cleanupLoop periodically removes idle rate limiters
func (prl *PlayerRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(prl.config.CleanupPeriod)
	defer ticker.Stop()

	for range ticker.C {
		prl.cleanup()
	}
}

func (prl *PlayerRateLimiter) cleanup() {
	prl.mu.Lock()
	defer prl.mu.Unlock()

	now := time.Now()
	for playerID, limiter := range prl.limiters {
		limiter.mu.Lock()
		idle := now.Sub(limiter.lastRefill)
		limiter.mu.Unlock()

		if idle > prl.config.MaxIdleTime {
			delete(prl.limiters, playerID)
		}
	}
}
