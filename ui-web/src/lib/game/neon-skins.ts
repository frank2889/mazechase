// TypeScript content with proper types

interface CosmeticPack {
  name: string;
  price: string;
  contents: string[];
  priority: number;
}

export const NeonSkinsPack: CosmeticPack = {
  name: "Cosmetic Pack: Neon Skins",
  price: "$2.99",
  contents: [
    "Exclusive Runner and Chaser skins",
    "Customizable color palettes"
  ],
  priority: 4
};

export function purchaseNeonSkinsPack(): void {
  // Logic for purchasing the Neon Skins Pack
  console.log("Purchasing Neon Skins Pack...");
  // Implement payment gateway integration here
}

export function applyNeonSkins(): void {
  // Logic to apply the Neon Skins to the player's character
  console.log("Applying Neon Skins...");
  // Implement skin application logic here
}
