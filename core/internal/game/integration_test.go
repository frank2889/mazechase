package game

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocket Integration Tests

// MockWebSocketServer creates a test WebSocket server
type MockWebSocketServer struct {
	server   *httptest.Server
	upgrader websocket.Upgrader
	messages [][]byte
	mu       sync.Mutex
}

func NewMockWebSocketServer() *MockWebSocketServer {
	mock := &MockWebSocketServer{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin:     func(r *http.Request) bool { return true },
		},
		messages: make([][]byte, 0),
	}

	mock.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := mock.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}
			mock.mu.Lock()
			mock.messages = append(mock.messages, message)
			mock.mu.Unlock()

			// Echo back
			conn.WriteMessage(websocket.TextMessage, message)
		}
	}))

	return mock
}

func (m *MockWebSocketServer) URL() string {
	return "ws" + strings.TrimPrefix(m.server.URL, "http")
}

func (m *MockWebSocketServer) Close() {
	m.server.Close()
}

func (m *MockWebSocketServer) GetMessages() [][]byte {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([][]byte, len(m.messages))
	copy(result, m.messages)
	return result
}

// Test WebSocket Connection
func TestWebSocketConnection(t *testing.T) {
	server := NewMockWebSocketServer()
	defer server.Close()

	// Connect to WebSocket
	conn, _, err := websocket.DefaultDialer.Dial(server.URL(), nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Send a message
	testMsg := map[string]interface{}{
		"type": "test",
		"data": "hello",
	}
	msgBytes, _ := json.Marshal(testMsg)

	err = conn.WriteMessage(websocket.TextMessage, msgBytes)
	if err != nil {
		t.Fatalf("Failed to send message: %v", err)
	}

	// Read echo response
	conn.SetReadDeadline(time.Now().Add(time.Second))
	_, response, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read response: %v", err)
	}

	if string(response) != string(msgBytes) {
		t.Errorf("Expected echo response, got %s", string(response))
	}
}

// Test Multiple Concurrent Connections
func TestMultipleConcurrentConnections(t *testing.T) {
	server := NewMockWebSocketServer()
	defer server.Close()

	numClients := 10
	var wg sync.WaitGroup
	errors := make(chan error, numClients)

	for i := 0; i < numClients; i++ {
		wg.Add(1)
		go func(clientID int) {
			defer wg.Done()

			conn, _, err := websocket.DefaultDialer.Dial(server.URL(), nil)
			if err != nil {
				errors <- err
				return
			}
			defer conn.Close()

			// Send message
			msg := map[string]interface{}{
				"type":     "pos",
				"clientId": clientID,
				"x":        float64(clientID * 10),
				"y":        float64(clientID * 20),
			}
			msgBytes, _ := json.Marshal(msg)

			err = conn.WriteMessage(websocket.TextMessage, msgBytes)
			if err != nil {
				errors <- err
				return
			}

			// Read response
			conn.SetReadDeadline(time.Now().Add(time.Second))
			_, _, err = conn.ReadMessage()
			if err != nil {
				errors <- err
			}
		}(i)
	}

	wg.Wait()
	close(errors)

	for err := range errors {
		t.Errorf("Client error: %v", err)
	}

	// Verify all messages received
	messages := server.GetMessages()
	if len(messages) != numClients {
		t.Errorf("Expected %d messages, got %d", numClients, len(messages))
	}
}

// Test Message Rate Limiting Integration
func TestMessageRateLimitingIntegration(t *testing.T) {
	rl := NewRateLimiter(5, 1) // 5 tokens, 1 per second refill

	// Send 5 messages quickly (should all succeed)
	for i := 0; i < 5; i++ {
		if !rl.Allow() {
			t.Errorf("Message %d should be allowed", i)
		}
	}

	// 6th message should be blocked
	if rl.Allow() {
		t.Error("6th message should be rate limited")
	}

	// Wait for refill
	time.Sleep(1100 * time.Millisecond)

	// Should be allowed again
	if !rl.Allow() {
		t.Error("Should be allowed after rate limit refill")
	}
}

// Test Game State Synchronization
func TestGameStateSynchronization(t *testing.T) {
	world := NewWorldState()

	// Simulate multiple players joining
	players := make([]*PlayerEntity, 4)
	for i := 0; i < 4; i++ {
		players[i] = NewPlayerEntity(uint(i+1), "Player"+string(rune('A'+i)))
		err := world.Join(players[i], nil)
		if err != nil {
			t.Errorf("Player %d failed to join: %v", i+1, err)
		}
	}

	// Verify all players have unique sprites
	sprites := make(map[SpriteType]bool)
	for _, p := range players {
		if sprites[p.SpriteType] {
			t.Error("Duplicate sprite assignment detected")
		}
		sprites[p.SpriteType] = true
	}

	// Simulate gameplay
	world.EatPellet(100, 100)
	world.EatPellet(200, 200)
	world.EatPowerUp(300, 300)

	// Verify state
	if world.PelletsCoordEaten.Len() != 2 {
		t.Errorf("Expected 2 pellets eaten, got %d", world.PelletsCoordEaten.Len())
	}

	if !world.IsPoweredUp {
		t.Error("Expected world to be powered up")
	}

	// Simulate ghost kill
	world.GhostEatenAction(Ghost1)
	if len(world.GhostsIdsEaten) != 1 {
		t.Error("Expected 1 ghost eaten")
	}

	// Simulate player leaving
	world.Leave(players[0])

	// Verify sprite returned to pool
	if len(world.CharactersList) != 1 {
		t.Errorf("Expected 1 sprite in pool after player left, got %d", len(world.CharactersList))
	}
}

// Test Chat System Integration
func TestChatSystemIntegration(t *testing.T) {
	chatManager := NewChatManager()

	// Send valid message
	msg, err := chatManager.SendMessage("player1", "TestUser", "Hello everyone!")
	if err != nil {
		t.Errorf("Failed to send valid message: %v", err)
	}
	if msg.Message != "Hello everyone!" {
		t.Error("Message content mismatch")
	}

	// Send multiple messages (rate limiting test)
	for i := 0; i < 5; i++ {
		chatManager.SendMessage("player2", "Spammer", "Spam message")
	}

	// 6th message should be rate limited
	_, err = chatManager.SendMessage("player2", "Spammer", "More spam")
	if err == nil {
		t.Error("Expected rate limiting error")
	}

	// Test chat history
	history := chatManager.GetHistory(10)
	if len(history) == 0 {
		t.Error("Expected non-empty chat history")
	}
}

// Test Leaderboard System Integration
func TestLeaderboardSystemIntegration(t *testing.T) {
	leaderboard := NewLeaderboardManager()

	// Record some game results
	leaderboard.RecordGameResult(1, "Player1", true, GameStats{
		GhostsEaten:  3,
		PelletsEaten: 100,
		PowerUpsUsed: 2,
	})

	leaderboard.RecordGameResult(2, "Player2", false, GameStats{
		GhostsEaten:  1,
		PelletsEaten: 50,
	})

	leaderboard.RecordGameResult(1, "Player1", true, GameStats{
		GhostsEaten:  2,
		PelletsEaten: 80,
	})

	// Get top players
	top := leaderboard.GetTopPlayers(10)
	if len(top) != 2 {
		t.Errorf("Expected 2 players, got %d", len(top))
	}

	// Player1 should be first (more wins)
	if top[0].Username != "Player1" {
		t.Error("Expected Player1 to be first")
	}

	if top[0].Wins != 2 {
		t.Errorf("Expected Player1 to have 2 wins, got %d", top[0].Wins)
	}

	// Test individual stats
	stats, exists := leaderboard.GetPlayerStats(1)
	if !exists {
		t.Error("Expected to find Player1 stats")
	}

	if stats.GhostsEaten != 5 {
		t.Errorf("Expected 5 total ghosts eaten, got %d", stats.GhostsEaten)
	}
}

// Test Input Validation Integration
func TestInputValidationIntegration(t *testing.T) {
	validator := NewInputValidator()

	// Test coordinate validation from message
	validMsg := map[string]interface{}{
		"x": float64(500),
		"y": float64(300),
	}

	x, y, err := validator.ValidateCoordinates(validMsg)
	if err != nil {
		t.Errorf("Valid coordinates should pass: %v", err)
	}
	if x != 500 || y != 300 {
		t.Error("Coordinates mismatch")
	}

	// Test invalid coordinates
	invalidMsg := map[string]interface{}{
		"x": float64(5000), // Out of bounds
		"y": float64(300),
	}

	_, _, err = validator.ValidateCoordinates(invalidMsg)
	if err == nil {
		t.Error("Expected validation error for out-of-bounds coordinates")
	}

	// Test missing coordinates
	missingMsg := map[string]interface{}{
		"x": float64(100),
	}

	_, _, err = validator.ValidateCoordinates(missingMsg)
	if err == nil {
		t.Error("Expected validation error for missing y coordinate")
	}
}

// Test Delta Compression Integration
func TestDeltaCompressionIntegration(t *testing.T) {
	encoder := NewDeltaEncoder(3.0) // 3 pixel threshold

	// First position update
	encoder.UpdatePosition("player1", 100, 100, "up")

	// Small movement - should not update
	shouldUpdate := encoder.ShouldUpdate("player1", 101, 101, "up")
	if shouldUpdate {
		t.Error("Small movement should not trigger update")
	}

	// Large movement - should update
	shouldUpdate = encoder.ShouldUpdate("player1", 200, 200, "up")
	if !shouldUpdate {
		t.Error("Large movement should trigger update")
	}

	// Get delta message
	delta := encoder.GetDelta("player1", 205, 200, "up")
	if delta["type"] != "delta" && delta["type"] != "pos" {
		t.Error("Expected delta or pos type")
	}
}

// Test Pathfinding Integration
func TestPathfindingIntegration(t *testing.T) {
	grid := NewPathGrid(30, 20)

	// Create some walls
	for x := 10; x < 15; x++ {
		grid.SetWalkable(x, 10, false)
	}

	pathfinder := NewAStarPathfinder(grid)

	// Find path around obstacles
	path := pathfinder.FindPath(5, 10, 20, 10)
	if path == nil {
		t.Error("Expected to find a path")
	}

	if len(path) < 2 {
		t.Error("Path should have at least start and end points")
	}

	// Verify path doesn't go through walls
	for _, point := range path {
		x, y := int(point.X), int(point.Y)
		node := grid.GetNode(x, y)
		if node != nil && !node.Walkable {
			t.Errorf("Path goes through wall at (%d, %d)", x, y)
		}
	}
}

// Benchmark Integration Tests
func BenchmarkChatMessageSending(b *testing.B) {
	chatManager := NewChatManager()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		chatManager.SendMessage("player"+string(rune(i%100)), "User", "Test message")
	}
}

func BenchmarkLeaderboardUpdate(b *testing.B) {
	leaderboard := NewLeaderboardManager()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		leaderboard.RecordGameResult(uint(i%100), "Player", true, GameStats{
			GhostsEaten:  3,
			PelletsEaten: 100,
		})
	}
}

func BenchmarkPathfinding(b *testing.B) {
	grid := NewPathGrid(30, 20)
	pathfinder := NewAStarPathfinder(grid)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pathfinder.FindPath(0, 0, 29, 19)
	}
}

func BenchmarkWorldStateOperations(b *testing.B) {
	world := NewWorldState()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		world.EatPellet(float64(i%1000), float64(i%1000))
	}
}
