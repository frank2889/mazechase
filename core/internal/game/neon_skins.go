package game

import (
  "fmt"
)

type CosmeticPack struct {
  Name     string
  Price    string
  Contents []string
  Priority int
}

var NeonSkinsPack = CosmeticPack{
  Name:     "Cosmetic Pack: Neon Skins",
  Price:    "$2.99",
  Contents: []string{"Exclusive Runner and Chaser skins", "Customizable color palettes"},
  Priority: 4,
}

func PurchaseNeonSkinsPack() {
  // Logic for purchasing the Neon Skins Pack
  fmt.Println("Purchasing Neon Skins Pack...")
  // Implement payment gateway integration here
}

func ApplyNeonSkins() {
  // Logic to apply the Neon Skins to the player's character
  fmt.Println("Applying Neon Skins...")
  // Implement skin application logic here
}
