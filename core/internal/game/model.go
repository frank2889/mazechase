package game

import (
	"encoding/json"
	"github.com/RA341/multipacman/internal/user"
	"strconv"
)

type SpriteType string

// Character types for 4-player MazeChase
// Each player gets their own unique character
const (
	Player1 SpriteType = "player1" // Blue Runner
	Player2 SpriteType = "player2" // Red Runner
	Player3 SpriteType = "player3" // Green Runner
	Player4 SpriteType = "player4" // Orange Runner
)

func NewPlayerEntity(userId uint, username string) *PlayerEntity {
	return &PlayerEntity{
		Type:        "active",
		PlayerId:    strconv.Itoa(int(userId)),
		Username:    username,
		SpriteType:  "",
		X:           0,
		Y:           0,
		secretToken: user.CreateAuthToken(5),
	}
}

// PlayerEntity represents a player in the game
type PlayerEntity struct {
	Type        string     `json:"type"`
	PlayerId    string     `json:"playerid"`
	Username    string     `json:"user"`
	SpriteType  SpriteType `json:"spriteType"`
	X           float64    `json:"x"`
	Y           float64    `json:"y"`
	Dir         string     `json:"dir"`
	secretToken string
}

// ToJSON converts the PlayerEntity to a JSON string
func (p *PlayerEntity) ToJSON() ([]byte, error) {
	bytes, err := json.Marshal(p)
	if err != nil {
		return []byte{}, err
	}
	return bytes, nil
}

func (p *PlayerEntity) ToMap() map[string]interface{} {
	playerMap := map[string]interface{}{}
	playerMap["type"] = p.Type
	playerMap["playerid"] = p.PlayerId
	playerMap["user"] = p.Username
	playerMap["spriteType"] = p.SpriteType
	playerMap["x"] = p.X
	playerMap["y"] = p.Y
	playerMap["dir"] = p.Dir
	return playerMap
}

// FromJSON populates the PlayerEntity from a JSON string
func (p *PlayerEntity) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), p)
}
