package user

import (
"crypto/rand"
"crypto/sha256"
"fmt"
"math/big"
"net/http"

"connectrpc.com/connect"
v1 "github.com/frank2889/mazechase/generated/auth/v1"
"github.com/rs/zerolog/log"
"golang.org/x/crypto/bcrypt"
)

func setCookie(user *User, response *connect.Response[v1.UserResponse]) {
cookie := http.Cookie{
Name:     AuthHeaderKey,
Value:    user.Token,
Path:     "/",
HttpOnly: true,
Secure:   true, // Required for HTTPS
SameSite: http.SameSiteLaxMode,
MaxAge:   86400 * 30, // 30 days
}

log.Debug().Str("cookie", cookie.String()).Msg("Setting auth cookie")
response.Header().Add("Set-Cookie", cookie.String())
}

func CreateAuthToken(length int) string {
const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
var randomString []byte

for i := 0; i < length; i++ {
randomIndex, _ := rand.Int(rand.Reader, big.NewInt(int64(len(characters))))
randomString = append(randomString, characters[randomIndex.Int64()])
}

return string(randomString)
}

func checkPassword(inputPassword string, hashedPassword string) bool {
err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(inputPassword))
if err != nil {
log.Error().Err(err).Msg("Failed Password check")
return false
}
return true
}

func encryptPassword(password []byte) string {
hashedPassword, err := bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
if err != nil {
panic(err)
}
return string(hashedPassword)
}

// EncryptPasswordPublic is a public wrapper for encryptPassword (used by database seeding)
func EncryptPasswordPublic(password []byte) string {
return encryptPassword(password)
}

func hashString(input string) string {
hash := sha256.New()
hash.Write([]byte(input))
// Get the resulting hash sum
hashedBytes := hash.Sum(nil)
// Convert the hashed bytes to a hexadecimal string
hashedString := fmt.Sprintf("%x", hashedBytes)
return hashedString
}
