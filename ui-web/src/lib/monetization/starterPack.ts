// TypeScript content with proper types

interface StarterPack {
  name: string;
  contents: string[];
  individualValue: string;
  bundlePrice: string;
  discount: string;
  oneTimePurchase: boolean;
  expectedConversion: string;
}

const starterPack: StarterPack = {
  name: "Starter Pack",
  contents: [
    "500 coins",
    "1 skin",
    "3x power-ups"
  ],
  individualValue: "$9.97",
  bundlePrice: "$4.99",
  discount: "50%",
  oneTimePurchase: true,
  expectedConversion: "5-8%"
};

export function getStarterPackDetails(): StarterPack {
  return starterPack;
}
