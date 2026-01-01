package pkg

import (
	"context"
	"encoding/json"
	"net/http"
	"runtime"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Metrics collects server metrics
type Metrics struct {
	mu                  sync.RWMutex
	ActiveConnections   int64
	TotalConnections    int64
	MessagesReceived    int64
	MessagesSent        int64
	ActiveLobbies       int64
	TotalGamesPlayed    int64
	Errors              int64
	AverageLatency      float64
	latencySum          float64
	latencyCount        int64
	startTime           time.Time
}

// Global metrics instance
var ServerMetrics = &Metrics{
	startTime: time.Now(),
}

// IncrementConnections safely increments connection count
func (m *Metrics) IncrementConnections() {
	atomic.AddInt64(&m.ActiveConnections, 1)
	atomic.AddInt64(&m.TotalConnections, 1)
}

// DecrementConnections safely decrements connection count
func (m *Metrics) DecrementConnections() {
	atomic.AddInt64(&m.ActiveConnections, -1)
}

// IncrementMessages safely increments message counts
func (m *Metrics) IncrementMessagesReceived() {
	atomic.AddInt64(&m.MessagesReceived, 1)
}

func (m *Metrics) IncrementMessagesSent() {
	atomic.AddInt64(&m.MessagesSent, 1)
}

func (m *Metrics) IncrementLobbies() {
	atomic.AddInt64(&m.ActiveLobbies, 1)
}

func (m *Metrics) DecrementLobbies() {
	atomic.AddInt64(&m.ActiveLobbies, -1)
}

func (m *Metrics) IncrementGamesPlayed() {
	atomic.AddInt64(&m.TotalGamesPlayed, 1)
}

func (m *Metrics) IncrementErrors() {
	atomic.AddInt64(&m.Errors, 1)
}

// RecordLatency records a latency measurement
func (m *Metrics) RecordLatency(latency time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.latencySum += float64(latency.Milliseconds())
	m.latencyCount++
	m.AverageLatency = m.latencySum / float64(m.latencyCount)
}

// GetSnapshot returns a copy of current metrics
func (m *Metrics) GetSnapshot() MetricsSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return MetricsSnapshot{
		ActiveConnections: atomic.LoadInt64(&m.ActiveConnections),
		TotalConnections:  atomic.LoadInt64(&m.TotalConnections),
		MessagesReceived:  atomic.LoadInt64(&m.MessagesReceived),
		MessagesSent:      atomic.LoadInt64(&m.MessagesSent),
		ActiveLobbies:     atomic.LoadInt64(&m.ActiveLobbies),
		TotalGamesPlayed:  atomic.LoadInt64(&m.TotalGamesPlayed),
		Errors:            atomic.LoadInt64(&m.Errors),
		AverageLatency:    m.AverageLatency,
		Uptime:            time.Since(m.startTime),
		MemoryUsage:       getMemoryUsage(),
		NumGoroutines:     runtime.NumGoroutine(),
	}
}

// MetricsSnapshot represents a point-in-time metrics snapshot
type MetricsSnapshot struct {
	ActiveConnections int64         `json:"activeConnections"`
	TotalConnections  int64         `json:"totalConnections"`
	MessagesReceived  int64         `json:"messagesReceived"`
	MessagesSent      int64         `json:"messagesSent"`
	ActiveLobbies     int64         `json:"activeLobbies"`
	TotalGamesPlayed  int64         `json:"totalGamesPlayed"`
	Errors            int64         `json:"errors"`
	AverageLatency    float64       `json:"averageLatencyMs"`
	Uptime            time.Duration `json:"uptime"`
	MemoryUsage       uint64        `json:"memoryUsageMB"`
	NumGoroutines     int           `json:"numGoroutines"`
}

func getMemoryUsage() uint64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return m.Alloc / 1024 / 1024
}

// HealthCheck represents a health check result
type HealthCheck struct {
	Status    string            `json:"status"`
	Version   string            `json:"version"`
	Uptime    string            `json:"uptime"`
	Checks    map[string]bool   `json:"checks"`
	Timestamp time.Time         `json:"timestamp"`
}

// HealthChecker performs health checks
type HealthChecker struct {
	checks  map[string]func() bool
	version string
}

// NewHealthChecker creates a new health checker
func NewHealthChecker(version string) *HealthChecker {
	return &HealthChecker{
		checks:  make(map[string]func() bool),
		version: version,
	}
}

// AddCheck adds a health check
func (hc *HealthChecker) AddCheck(name string, check func() bool) {
	hc.checks[name] = check
}

// RunChecks runs all health checks
func (hc *HealthChecker) RunChecks() HealthCheck {
	results := make(map[string]bool)
	allHealthy := true

	for name, check := range hc.checks {
		result := check()
		results[name] = result
		if !result {
			allHealthy = false
		}
	}

	status := "healthy"
	if !allHealthy {
		status = "unhealthy"
	}

	return HealthCheck{
		Status:    status,
		Version:   hc.version,
		Uptime:    time.Since(ServerMetrics.startTime).String(),
		Checks:    results,
		Timestamp: time.Now(),
	}
}

// RegisterHealthEndpoints registers HTTP health endpoints
func RegisterHealthEndpoints(mux *http.ServeMux, hc *HealthChecker) {
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		health := hc.RunChecks()
		w.Header().Set("Content-Type", "application/json")
		
		if health.Status != "healthy" {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		
		json.NewEncoder(w).Encode(health)
	})

	// Liveness probe (for Kubernetes)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Readiness probe (for Kubernetes)
	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		health := hc.RunChecks()
		if health.Status == "healthy" {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ready"))
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("not ready"))
		}
	})

	// Metrics endpoint
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		metrics := ServerMetrics.GetSnapshot()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(metrics)
	})
}

// StructuredLogger provides structured logging utilities
type StructuredLogger struct {
	requestID string
	userID    string
	lobbyID   string
}

// NewStructuredLogger creates a logger with context
func NewStructuredLogger(ctx context.Context) *StructuredLogger {
	sl := &StructuredLogger{}
	
	if reqID, ok := ctx.Value("requestID").(string); ok {
		sl.requestID = reqID
	}
	if userID, ok := ctx.Value("userID").(string); ok {
		sl.userID = userID
	}
	if lobbyID, ok := ctx.Value("lobbyID").(string); ok {
		sl.lobbyID = lobbyID
	}
	
	return sl
}

func (sl *StructuredLogger) baseEvent() *zerolog.Event {
	event := log.Info()
	if sl.requestID != "" {
		event = event.Str("requestId", sl.requestID)
	}
	if sl.userID != "" {
		event = event.Str("userId", sl.userID)
	}
	if sl.lobbyID != "" {
		event = event.Str("lobbyId", sl.lobbyID)
	}
	return event
}

func (sl *StructuredLogger) Info(msg string) {
	sl.baseEvent().Msg(msg)
}

func (sl *StructuredLogger) Error(err error, msg string) {
	log.Error().
		Err(err).
		Str("requestId", sl.requestID).
		Str("userId", sl.userID).
		Str("lobbyId", sl.lobbyID).
		Msg(msg)
}

func (sl *StructuredLogger) GameEvent(eventType string, data map[string]interface{}) {
	event := log.Info().
		Str("eventType", eventType).
		Str("requestId", sl.requestID).
		Str("userId", sl.userID).
		Str("lobbyId", sl.lobbyID)
	
	for k, v := range data {
		event = event.Interface(k, v)
	}
	
	event.Msg("game_event")
}
