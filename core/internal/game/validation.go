package game

import (
	"fmt"
	"math"
	"strings"
	"unicode/utf8"
)

// InputValidator provides validation for game messages
type InputValidator struct {
	maxPositionX   float64
	maxPositionY   float64
	maxUsernameLen int
	maxMessageLen  int
}

// NewInputValidator creates a validator with game boundaries
func NewInputValidator() *InputValidator {
	return &InputValidator{
		maxPositionX:   1600,  // Game width + margin
		maxPositionY:   1100,  // Game height + margin
		maxUsernameLen: 32,
		maxMessageLen:  500,
	}
}

// ValidationError represents a validation failure
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}

// ValidatePosition checks if x,y coordinates are within valid bounds
func (v *InputValidator) ValidatePosition(x, y float64) error {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return &ValidationError{Field: "x", Message: "invalid number"}
	}
	if math.IsNaN(y) || math.IsInf(y, 0) {
		return &ValidationError{Field: "y", Message: "invalid number"}
	}
	if x < 0 || x > v.maxPositionX {
		return &ValidationError{Field: "x", Message: fmt.Sprintf("out of bounds (0-%v)", v.maxPositionX)}
	}
	if y < 0 || y > v.maxPositionY {
		return &ValidationError{Field: "y", Message: fmt.Sprintf("out of bounds (0-%v)", v.maxPositionY)}
	}
	return nil
}

// ValidateDirection checks if direction is a valid animation direction
func (v *InputValidator) ValidateDirection(dir string) error {
	validDirections := map[string]bool{
		"up": true, "down": true, "left": true, "right": true, "default": true,
	}
	if !validDirections[strings.ToLower(dir)] {
		return &ValidationError{Field: "dir", Message: "invalid direction"}
	}
	return nil
}

// ValidateSpriteType checks if sprite type is valid
func (v *InputValidator) ValidateSpriteType(spriteType string) error {
	validSprites := map[string]bool{
		"player1": true, "player2": true, "player3": true, "player4": true,
	}
	if !validSprites[spriteType] {
		return &ValidationError{Field: "spriteType", Message: "invalid sprite type"}
	}
	return nil
}

// ValidateMessageType checks if message type is valid
func (v *InputValidator) ValidateMessageType(msgType string) error {
	validTypes := map[string]bool{
		"pos": true, "pel": true, "pow": true, "kill": true, "chat": true,
	}
	if !validTypes[msgType] {
		return &ValidationError{Field: "type", Message: "invalid message type"}
	}
	return nil
}

// ValidateUsername sanitizes and validates username
func (v *InputValidator) ValidateUsername(username string) (string, error) {
	// Trim whitespace
	username = strings.TrimSpace(username)

	if username == "" {
		return "", &ValidationError{Field: "username", Message: "cannot be empty"}
	}

	if utf8.RuneCountInString(username) > v.maxUsernameLen {
		return "", &ValidationError{Field: "username", Message: fmt.Sprintf("too long (max %d)", v.maxUsernameLen)}
	}

	// Remove potentially dangerous characters
	username = sanitizeString(username)

	return username, nil
}

// ValidateChatMessage sanitizes chat messages
func (v *InputValidator) ValidateChatMessage(message string) (string, error) {
	message = strings.TrimSpace(message)

	if message == "" {
		return "", &ValidationError{Field: "message", Message: "cannot be empty"}
	}

	if utf8.RuneCountInString(message) > v.maxMessageLen {
		return "", &ValidationError{Field: "message", Message: fmt.Sprintf("too long (max %d)", v.maxMessageLen)}
	}

	// Sanitize HTML/script injection attempts
	message = sanitizeString(message)

	return message, nil
}

// ValidateSecretToken validates the format of a secret token
func (v *InputValidator) ValidateSecretToken(token string) error {
	if len(token) < 5 || len(token) > 50 {
		return &ValidationError{Field: "secretToken", Message: "invalid token length"}
	}

	// Check for only alphanumeric characters
	for _, c := range token {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return &ValidationError{Field: "secretToken", Message: "invalid token format"}
		}
	}

	return nil
}

// ValidateLobbyID validates lobby ID is within reasonable bounds
func (v *InputValidator) ValidateLobbyID(lobbyID uint) error {
	if lobbyID == 0 || lobbyID > 1000000 {
		return &ValidationError{Field: "lobbyID", Message: "invalid lobby ID"}
	}
	return nil
}

// sanitizeString removes potentially dangerous characters
func sanitizeString(s string) string {
	// Remove HTML tags
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")

	// Remove null bytes
	s = strings.ReplaceAll(s, "\x00", "")

	return s
}

// ValidateCoordinates extracts and validates coordinates from message
func (v *InputValidator) ValidateCoordinates(msgInfo map[string]interface{}) (x, y float64, err error) {
	xVal, existsX := msgInfo["x"]
	yVal, existsY := msgInfo["y"]

	if !existsX || !existsY {
		return 0, 0, &ValidationError{Field: "coordinates", Message: "missing x or y"}
	}

	// Type assertion with safety
	switch xTyped := xVal.(type) {
	case float64:
		x = xTyped
	case int:
		x = float64(xTyped)
	case int64:
		x = float64(xTyped)
	default:
		return 0, 0, &ValidationError{Field: "x", Message: "invalid type"}
	}

	switch yTyped := yVal.(type) {
	case float64:
		y = yTyped
	case int:
		y = float64(yTyped)
	case int64:
		y = float64(yTyped)
	default:
		return 0, 0, &ValidationError{Field: "y", Message: "invalid type"}
	}

	if err := v.ValidatePosition(x, y); err != nil {
		return 0, 0, err
	}

	return x, y, nil
}
