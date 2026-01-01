// TypeScript content with proper types

export interface VIPPass {
  name: string;
  price: string;
  benefits: string[];
  priority: number;
}

export const mazeChaseVIPPass: VIPPass = {
  name: "MazeChase VIP Pass",
  price: "$3.99/month",
  benefits: [
    "ad-free",
    "daily bonus pellets",
    "exclusive Runner and Chaser skins"
  ],
  priority: 5
};

export function isVIP(user: { subscription: string }): boolean {
  return user.subscription === mazeChaseVIPPass.name;
}
