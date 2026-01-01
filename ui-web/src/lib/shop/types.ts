/**
 * Cosmetics & Monetization Types - Sprint 5
 * Complete type definitions for shop, inventory, battle pass, and currencies
 */

// ============ CURRENCY TYPES ============

export interface Currency {
  coins: number;       // Earned through gameplay
  gems: number;        // Premium currency (purchased)
  tickets: number;     // Event currency
}

export interface CurrencyTransaction {
  id: string;
  type: 'earn' | 'spend' | 'purchase' | 'refund';
  currency: keyof Currency;
  amount: number;
  reason: string;
  timestamp: Date;
  itemId?: string;
}

// ============ COSMETIC TYPES ============

export type CosmeticCategory = 'skin' | 'trail' | 'emote' | 'frame' | 'title' | 'theme';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type UnlockMethod = 'shop' | 'battlepass' | 'achievement' | 'event' | 'gift' | 'default';

export interface CosmeticItem {
  id: string;
  name: string;
  nameNL: string;
  category: CosmeticCategory;
  rarity: Rarity;
  
  // Pricing
  priceCoins: number;
  priceGems: number;
  priceReal: number; // in cents
  
  // Visual
  preview: string;
  preview3D?: string;
  thumbnail: string;
  
  // Metadata
  description: string;
  descriptionNL: string;
  unlockMethod: UnlockMethod;
  
  // Flags
  featured?: boolean;
  new?: boolean;
  limited?: boolean;
  exclusive?: boolean;
  expiresAt?: Date;
  
  // 3D rendering
  modelPath?: string;
  materialOverrides?: Record<string, string>;
  particleEffect?: string;
}

// Skin specific
export interface SkinItem extends CosmeticItem {
  category: 'skin';
  skinType: 'runner' | 'chaser';
  baseColor: string;
  glowColor: string;
  animations?: string[];
}

// Trail specific
export interface TrailItem extends CosmeticItem {
  category: 'trail';
  trailType: 'particle' | 'ribbon' | 'glow' | 'ghost';
  color: string;
  secondaryColor?: string;
  duration: number; // how long trail stays visible (ms)
  density: number; // particles per second
}

// Emote specific
export interface EmoteItem extends CosmeticItem {
  category: 'emote';
  emoteType: 'celebration' | 'taunt' | 'greeting' | 'dance';
  animationPath: string;
  soundPath?: string;
  duration: number; // ms
  looping: boolean;
}

// Frame specific (around profile picture)
export interface FrameItem extends CosmeticItem {
  category: 'frame';
  borderStyle: 'solid' | 'animated' | 'glow';
  borderColor: string;
  animationPath?: string;
}

// Title specific (shown under name)
export interface TitleItem extends CosmeticItem {
  category: 'title';
  titleText: string;
  titleColor: string;
  unlockRequirement?: string;
}

// ============ INVENTORY TYPES ============

export interface InventoryItem {
  itemId: string;
  ownedAt: Date;
  equippedSlot?: string; // null if not equipped
  source: UnlockMethod;
}

export interface PlayerInventory {
  items: InventoryItem[];
  equipped: {
    runnerSkin: string | null;
    chaserSkin: string | null;
    trail: string | null;
    emote1: string | null;
    emote2: string | null;
    emote3: string | null;
    emote4: string | null;
    frame: string | null;
    title: string | null;
  };
}

// ============ BATTLE PASS TYPES ============

export type RewardType = 'coins' | 'gems' | 'skin' | 'trail' | 'emote' | 'frame' | 'title' | 'xp_boost' | 'mystery_box';

export interface BattlePassReward {
  id: string;
  type: RewardType;
  itemId?: string; // for cosmetic items
  amount?: number; // for currency/xp
  rarity: Rarity;
  preview: string;
  name: string;
  nameNL: string;
}

export interface BattlePassTier {
  tier: number;
  xpRequired: number;
  xpTotal: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
  milestone?: boolean; // tier 10, 25, 50 etc
}

export interface BattlePassSeason {
  id: string;
  seasonNumber: number;
  name: string;
  nameNL: string;
  theme: string;
  
  startDate: Date;
  endDate: Date;
  
  maxTier: number;
  tiers: BattlePassTier[];
  
  premiumPrice: number; // gems
  premiumPriceReal: number; // cents
  
  // Premium perks
  xpBoost: number; // multiplier (1.5 = 50% more)
  
  // Visual
  banner: string;
  icon: string;
  colorPrimary: string;
  colorSecondary: string;
}

export interface PlayerBattlePass {
  seasonId: string;
  hasPremium: boolean;
  currentTier: number;
  currentXP: number;
  totalXP: number;
  claimedFreeRewards: number[];
  claimedPremiumRewards: number[];
  purchasedAt?: Date;
}

// ============ SHOP TYPES ============

export interface ShopSection {
  id: string;
  name: string;
  nameNL: string;
  icon: string;
  items: string[]; // item ids
  sortOrder: number;
}

export interface DailyShop {
  date: string; // YYYY-MM-DD
  featuredItems: string[];
  dailyItems: string[];
  refreshesAt: Date;
}

export interface SpecialOffer {
  id: string;
  name: string;
  nameNL: string;
  description: string;
  
  // Bundle contents
  items: Array<{
    type: 'cosmetic' | 'currency';
    itemId?: string;
    currencyType?: keyof Currency;
    amount?: number;
  }>;
  
  // Pricing
  originalPriceReal: number;
  discountedPriceReal: number;
  discountPercent: number;
  
  // Availability
  oneTimePurchase: boolean;
  startsAt: Date;
  endsAt: Date;
  
  // Visual
  banner: string;
  badge?: string;
}

// ============ DAILY REWARDS TYPES ============

export interface DailyReward {
  day: number;
  reward: BattlePassReward;
  milestone: boolean;
}

export interface DailyRewardStreak {
  currentDay: number;
  lastClaimDate: string | null;
  totalClaims: number;
  longestStreak: number;
}

// ============ XP & PROGRESSION ============

export interface XPSource {
  type: 'game_complete' | 'game_win' | 'challenge' | 'daily_login' | 'first_game' | 'invite_friend';
  baseXP: number;
  multiplier: number;
}

export interface PlayerProgression {
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
  
  // Stats that affect XP
  gamesPlayed: number;
  gamesWon: number;
  dailyLoginStreak: number;
}

// ============ PURCHASE TYPES ============

export interface PurchaseRequest {
  itemId: string;
  paymentMethod: 'coins' | 'gems' | 'real';
  quantity?: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  newBalance?: Currency;
  itemsReceived?: string[];
}

// ============ STORE STATE ============

export interface MonetizationState {
  // Player data
  currency: Currency;
  inventory: PlayerInventory;
  battlePass: PlayerBattlePass | null;
  dailyRewards: DailyRewardStreak;
  progression: PlayerProgression;
  
  // Shop data
  currentSeason: BattlePassSeason | null;
  dailyShop: DailyShop | null;
  specialOffers: SpecialOffer[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
}
