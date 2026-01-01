// Battle Pass System

export const battlePassConfig = {
  seasonTheme: "Neon Night Adventures",
  duration: "8 weeks",
  freeRewards: [
    "Basic skin",
    "Small currency packs"
  ],
  premiumRewards: [
    "Exclusive skins",
    "XP boosters",
    "Currency packs"
  ],
  price: "$4.99"
};

export function getBattlePassDetails() {
  return battlePassConfig;
}
