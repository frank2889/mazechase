// TypeScript content with proper types

interface Reward {
  name: string;
  type: 'free' | 'premium';
}

interface BattlePass {
  seasonTheme: string;
  duration: string;
  freeRewards: Reward[];
  premiumRewards: Reward[];
  price: string;
}

export const neonNightAdventures: BattlePass = {
  seasonTheme: 'Neon Night Adventures',
  duration: '8 weeks',
  freeRewards: [
    { name: 'Basic skin', type: 'free' },
    { name: 'Small currency packs', type: 'free' }
  ],
  premiumRewards: [
    { name: 'Exclusive skins', type: 'premium' },
    { name: 'XP boosters', type: 'premium' },
    { name: 'Currency packs', type: 'premium' }
  ],
  price: '$4.99'
};

export function getBattlePassRewards(isPremium: boolean): Reward[] {
  return isPremium ? [...neonNightAdventures.freeRewards, ...neonNightAdventures.premiumRewards] : neonNightAdventures.freeRewards;
}
