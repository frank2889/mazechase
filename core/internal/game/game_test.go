package game

import (
	"testing"
	"time"
)

// Rate Limiter Tests
func TestRateLimiter_Allow(t *testing.T) {
	rl := NewRateLimiter(10, 5)

	// Should allow initial requests
	for i := 0; i < 10; i++ {
		if !rl.Allow() {
			t.Errorf("Expected request %d to be allowed", i)
		}
	}

	// Should block after exhausting tokens
	if rl.Allow() {
		t.Error("Expected request to be blocked after exhausting tokens")
	}
}

func TestRateLimiter_Refill(t *testing.T) {
	rl := NewRateLimiter(5, 10) // 10 tokens per second

	// Exhaust tokens
	for i := 0; i < 5; i++ {
		rl.Allow()
	}

	// Wait for refill
	time.Sleep(200 * time.Millisecond)

	// Should have refilled some tokens
	if !rl.Allow() {
		t.Error("Expected tokens to refill after waiting")
	}
}

func TestPlayerRateLimiter_GetLimiter(t *testing.T) {
	config := DefaultRateLimitConfig()
	prl := NewPlayerRateLimiter(config)

	// Get limiter for new player
	limiter1 := prl.GetLimiter("player1")
	if limiter1 == nil {
		t.Error("Expected non-nil limiter")
	}

	// Same player should get same limiter
	limiter2 := prl.GetLimiter("player1")
	if limiter1 != limiter2 {
		t.Error("Expected same limiter for same player")
	}

	// Different player should get different limiter
	limiter3 := prl.GetLimiter("player2")
	if limiter1 == limiter3 {
		t.Error("Expected different limiter for different player")
	}
}

// Input Validation Tests
func TestInputValidator_ValidatePosition(t *testing.T) {
	v := NewInputValidator()

	tests := []struct {
		name    string
		x, y    float64
		wantErr bool
	}{
		{"valid position", 100, 200, false},
		{"zero position", 0, 0, false},
		{"max position", 1600, 1100, false},
		{"negative x", -1, 100, true},
		{"negative y", 100, -1, true},
		{"x too large", 2000, 100, true},
		{"y too large", 100, 2000, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidatePosition(tt.x, tt.y)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePosition(%v, %v) error = %v, wantErr %v", tt.x, tt.y, err, tt.wantErr)
			}
		})
	}
}

func TestInputValidator_ValidateDirection(t *testing.T) {
	v := NewInputValidator()

	validDirs := []string{"up", "down", "left", "right", "default"}
	for _, dir := range validDirs {
		if err := v.ValidateDirection(dir); err != nil {
			t.Errorf("Expected %s to be valid direction", dir)
		}
	}

	if err := v.ValidateDirection("invalid"); err == nil {
		t.Error("Expected 'invalid' to be rejected")
	}
}

func TestInputValidator_ValidateUsername(t *testing.T) {
	v := NewInputValidator()

	tests := []struct {
		name     string
		username string
		wantErr  bool
	}{
		{"valid username", "Player1", false},
		{"with spaces", "  Player1  ", false},
		{"empty", "", true},
		{"too long", "ThisIsAVeryLongUsernameThatsDefinitelyTooLong", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := v.ValidateUsername(tt.username)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUsername(%v) error = %v, wantErr %v", tt.username, err, tt.wantErr)
			}
		})
	}
}

func TestInputValidator_ValidateSecretToken(t *testing.T) {
	v := NewInputValidator()

	tests := []struct {
		name    string
		token   string
		wantErr bool
	}{
		{"valid token", "abc123", false},
		{"too short", "abc", true},
		{"with special chars", "abc!@#", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.ValidateSecretToken(tt.token)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateSecretToken(%v) error = %v, wantErr %v", tt.token, err, tt.wantErr)
			}
		})
	}
}

// World State Tests
func TestWorld_Join(t *testing.T) {
	world := NewWorldState()

	player1 := NewPlayerEntity(1, "Player1")
	err := world.Join(player1, nil)
	if err != nil {
		t.Errorf("Expected player1 to join successfully: %v", err)
	}

	if player1.SpriteType == "" {
		t.Error("Expected player1 to have sprite assigned")
	}

	// Join 3 more players
	for i := 2; i <= 4; i++ {
		player := NewPlayerEntity(uint(i), "Player")
		world.Join(player, nil)
	}

	// 5th player should fail
	player5 := NewPlayerEntity(5, "Player5")
	err = world.Join(player5, nil)
	if err == nil {
		t.Error("Expected 5th player to fail joining full lobby")
	}
}

func TestWorld_Leave(t *testing.T) {
	world := NewWorldState()

	player := NewPlayerEntity(1, "Player1")
	world.Join(player, nil)

	initialSprites := len(world.CharactersList)
	world.Leave(player)

	if len(world.CharactersList) != initialSprites+1 {
		t.Error("Expected sprite to be returned to pool after leave")
	}
}

func TestWorld_EatPellet(t *testing.T) {
	world := NewWorldState()

	world.EatPellet(100, 200)
	world.EatPellet(150, 250)

	pellets := world.PelletsCoordEaten.GetList()
	if len(pellets) != 2 {
		t.Errorf("Expected 2 pellets eaten, got %d", len(pellets))
	}
}

func TestWorld_EatPowerUp(t *testing.T) {
	world := NewWorldState()

	world.EatPowerUp(100, 200)
	if !world.IsPoweredUp {
		t.Error("Expected world to be powered up after eating power up")
	}

	// Eating another should not change state
	world.EatPowerUp(200, 300)
	powerUps := world.PowerUpsCoordsEaten.GetList()
	if len(powerUps) != 1 {
		t.Errorf("Expected 1 power up (second should be ignored), got %d", len(powerUps))
	}
}

func TestWorld_GhostEatenAction(t *testing.T) {
	world := NewWorldState()

	world.GhostEatenAction(Ghost1)
	world.GhostEatenAction(Ghost2)

	if len(world.GhostsIdsEaten) != 2 {
		t.Errorf("Expected 2 ghosts eaten, got %d", len(world.GhostsIdsEaten))
	}
}

func TestWorld_IsLobbyFull(t *testing.T) {
	world := NewWorldState()

	if world.IsLobbyFull() {
		t.Error("Expected empty lobby to not be full")
	}

	// Fill lobby
	for i := 0; i < 4; i++ {
		world.CharactersList = world.CharactersList[:len(world.CharactersList)-1]
	}

	if !world.IsLobbyFull() {
		t.Error("Expected lobby with no available sprites to be full")
	}
}

// Player Entity Tests
func TestPlayerEntity_ToJSON(t *testing.T) {
	player := NewPlayerEntity(1, "TestPlayer")
	player.SpriteType = Pacman
	player.X = 100
	player.Y = 200

	jsonBytes, err := player.ToJSON()
	if err != nil {
		t.Errorf("ToJSON failed: %v", err)
	}

	if len(jsonBytes) == 0 {
		t.Error("Expected non-empty JSON")
	}
}

func TestPlayerEntity_ToMap(t *testing.T) {
	player := NewPlayerEntity(1, "TestPlayer")
	player.SpriteType = Ghost1
	player.X = 100
	player.Y = 200
	player.Dir = "left"

	m := player.ToMap()

	if m["user"] != "TestPlayer" {
		t.Error("Expected username in map")
	}
	if m["spriteType"] != Ghost1 {
		t.Error("Expected sprite type in map")
	}
	if m["x"] != float64(100) {
		t.Error("Expected x coordinate in map")
	}
}

// Coordinate List Tests
func TestCoordList_Add(t *testing.T) {
	cl := NewCordList()

	cl.Add(10, 20)
	cl.Add(30, 40)
	cl.Add(10, 20) // Duplicate

	list := cl.GetList()
	if len(list) != 2 {
		t.Errorf("Expected 2 unique coordinates, got %d", len(list))
	}
}

func TestCoordList_Len(t *testing.T) {
	cl := NewCordList()

	if cl.Len() != 0 {
		t.Error("Expected empty list")
	}

	cl.Add(10, 20)
	if cl.Len() != 1 {
		t.Error("Expected length 1")
	}
}

// Message Batcher Tests
func TestMessageBatcher_Add(t *testing.T) {
	batcher := NewMessageBatcher(100*time.Millisecond, 5)
	defer batcher.Stop()

	msg := map[string]interface{}{"type": "test"}
	batcher.Add(msg)

	// Force flush
	batcher.Flush()

	select {
	case data := <-batcher.FlushChan():
		if len(data) == 0 {
			t.Error("Expected non-empty batch data")
		}
	case <-time.After(200 * time.Millisecond):
		t.Error("Expected to receive flushed batch")
	}
}

// Delta Encoder Tests
func TestDeltaEncoder_ShouldUpdate(t *testing.T) {
	de := NewDeltaEncoder(5.0) // 5 pixel threshold

	// First update should always trigger
	if !de.ShouldUpdate("player1", 100, 100, "up") {
		t.Error("First update should always trigger")
	}

	// Small movement should not trigger
	if de.ShouldUpdate("player1", 102, 102, "up") {
		t.Error("Small movement should not trigger update")
	}

	// Large movement should trigger
	if !de.ShouldUpdate("player1", 200, 200, "up") {
		t.Error("Large movement should trigger update")
	}

	// Direction change should trigger
	de.UpdatePosition("player1", 200, 200, "up")
	if !de.ShouldUpdate("player1", 200, 200, "down") {
		t.Error("Direction change should trigger update")
	}
}

// Benchmark Tests
func BenchmarkRateLimiter_Allow(b *testing.B) {
	rl := NewRateLimiter(1000000, 1000000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rl.Allow()
	}
}

func BenchmarkInputValidator_ValidatePosition(b *testing.B) {
	v := NewInputValidator()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		v.ValidatePosition(float64(i%1000), float64(i%1000))
	}
}

func BenchmarkWorld_EatPellet(b *testing.B) {
	world := NewWorldState()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		world.EatPellet(float64(i), float64(i))
	}
}

func BenchmarkPlayerEntity_ToJSON(b *testing.B) {
	player := NewPlayerEntity(1, "BenchPlayer")
	player.SpriteType = Pacman
	player.X = 100
	player.Y = 200

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		player.ToJSON()
	}
}
