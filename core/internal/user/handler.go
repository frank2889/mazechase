package user

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"connectrpc.com/connect"
	"github.com/Pallinder/go-randomdata"
	v1 "github.com/frank2889/mazechase/generated/auth/v1"
	"github.com/rs/zerolog/log"
)

// Username validation constants (AI Tester Sprint 1: Unicode ondersteuning)
const (
	MinUsernameLength = 2
	MaxUsernameLength = 20
)

// usernamePattern allows alphanumeric, unicode letters, and safe special chars
var usernamePattern = regexp.MustCompile(`^[\p{L}\p{N}_\-. ]+$`)

// ValidateUsername checks if username is valid and safe for display
// Supports Unicode characters (Chinese, Japanese, emoji etc) - AI Tester suggestion
func ValidateUsername(username string) error {
	// Trim whitespace
	username = strings.TrimSpace(username)

	// Check length (in runes, not bytes - for Unicode support)
	runeCount := utf8.RuneCountInString(username)
	if runeCount < MinUsernameLength {
		return fmt.Errorf("gebruikersnaam moet minimaal %d tekens bevatten", MinUsernameLength)
	}
	if runeCount > MaxUsernameLength {
		return fmt.Errorf("gebruikersnaam mag maximaal %d tekens bevatten", MaxUsernameLength)
	}

	// Check for valid characters (allows Unicode letters, numbers, and safe punctuation)
	if !usernamePattern.MatchString(username) {
		return fmt.Errorf("gebruikersnaam bevat ongeldige tekens")
	}

	// Check for control characters or invisible Unicode
	for _, r := range username {
		if r < 32 || (r >= 0x7F && r <= 0x9F) || r == 0x200B || r == 0xFEFF {
			return fmt.Errorf("gebruikersnaam bevat ongeldige tekens")
		}
	}

	return nil
}

// SanitizeUsername cleans up username for safe display
func SanitizeUsername(username string) string {
	return strings.TrimSpace(username)
}

type Handler struct {
	auth *Service
}

func NewAuthHandler(auth *Service) *Handler {
	return &Handler{auth: auth}
}

func (a *Handler) Register(_ context.Context, c *connect.Request[v1.RegisterUserRequest]) (*connect.Response[v1.RegisterUserResponse], error) {
	username, password, passwordVerify := c.Msg.Username, c.Msg.Password, c.Msg.PasswordVerify

	if username == "" || password == "" || passwordVerify == "" {
		log.Warn().Any("Msg", c.Msg).Msg("one or more fields are empty")
		return nil, fmt.Errorf("vul alle velden in")
	}

	// AI Tester Sprint 1: Validate username (Unicode support + security)
	username = SanitizeUsername(username)
	if err := ValidateUsername(username); err != nil {
		return nil, err
	}

	// Ensure that the password & passwordVerify match
	if password != passwordVerify {
		return nil, fmt.Errorf("wachtwoorden komen niet overeen")
	}

	err := a.auth.Register(username, c.Msg.Password, false)
	if err != nil {
		// Check for duplicate username
		if err.Error() == "UNIQUE constraint failed: users.username" {
			return nil, fmt.Errorf("gebruikersnaam is al in gebruik")
		}
		return nil, fmt.Errorf("registratie mislukt: %v", err)
	}

	// Auto-login after registration - return user data with cookie
	loginResp, err := a.loginWithCookie(username, password)
	if err != nil {
		log.Error().Err(err).Msg("Auto-login after registration failed")
		return nil, fmt.Errorf("account aangemaakt, maar auto-login mislukt. Probeer handmatig in te loggen.")
	}

	// Create response with auth cookie
	resp := connect.NewResponse(&v1.RegisterUserResponse{})
	// Copy cookies from login response
	for key, values := range loginResp.Header() {
		for _, value := range values {
			resp.Header().Add(key, value)
		}
	}

	return resp, nil
}

func (a *Handler) Logout(_ context.Context, req *connect.Request[v1.Empty]) (*connect.Response[v1.Empty], error) {
	user, err := a.auth.VerifyAuthHeader(req.Header())
	if err != nil {
		log.Warn().Err(err).Msg("Logout failed, unauthenticated user")
		return connect.NewResponse(&v1.Empty{}), nil
	}

	_, err = a.auth.Logout(user.ID)
	if err != nil {
		log.Warn().Err(err).Msg("Logout failed, error occurred while updating db")
	}

	return connect.NewResponse(&v1.Empty{}), nil
}

func (a *Handler) GuestLogin(_ context.Context, _ *connect.Request[v1.Empty]) (*connect.Response[v1.UserResponse], error) {
	username := randomdata.SillyName()
	password := randomdata.Alphanumeric(30)
	err := a.auth.Register(username, password, true)
	if err != nil {
		return nil, err
	}

	return a.loginWithCookie(username, password)
}

func (a *Handler) Login(_ context.Context, c *connect.Request[v1.AuthRequest]) (*connect.Response[v1.UserResponse], error) {
	username, password := c.Msg.Username, c.Msg.Password
	if username == "" || password == "" {
		return nil, fmt.Errorf("vul gebruikersnaam en wachtwoord in")
	}

	return a.loginWithCookie(username, password)
}

func (a *Handler) loginWithCookie(user, pass string) (*connect.Response[v1.UserResponse], error) {
	userData, err := a.auth.Login(user, pass)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	response := connect.NewResponse(userData.ToRPC())
	setCookie(userData, response)

	return response, nil
}

func (a *Handler) Test(_ context.Context, c *connect.Request[v1.AuthResponse]) (*connect.Response[v1.UserResponse], error) {
	user, err := a.auth.VerifyAuthHeader(c.Header())
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	return connect.NewResponse(user.ToRPC()), nil
}
