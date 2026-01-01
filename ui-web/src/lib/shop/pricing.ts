/**
 * Pricing Strategy - Sprint 5
 * Currency packs and gem bundles with optimized value tiers
 * Based on Marcus (Monetization Expert) recommendations
 */

import type { Currency } from './types';

// ============ TYPES ============

export interface CurrencyPack {
  id: string;
  name: string;
  nameNL: string;
  
  // What you get
  currency: keyof Currency;
  baseAmount: number;
  bonusAmount: number;  // Extra coins/gems
  totalAmount: number;
  bonusPercent: number;
  
  // Price
  priceReal: number;    // In cents
  priceDisplay: string; // Formatted price
  
  // Value indicators
  valueRating: 'okay' | 'good' | 'great' | 'best';
  popular?: boolean;
  bestValue?: boolean;
  
  // Visual
  icon: string;
  color: string;
}

export interface SpecialOffer {
  id: string;
  name: string;
  nameNL: string;
  description: string;
  descriptionNL: string;
  
  // Contents
  contents: Array<{
    type: 'coins' | 'gems' | 'skin' | 'trail' | 'emote' | 'premium' | 'battlepass';
    id?: string;
    amount?: number;
    name: string;
    icon: string;
  }>;
  
  // Pricing
  originalPrice: number;     // cents
  discountedPrice: number;   // cents
  discountPercent: number;
  
  // Availability
  isOneTime: boolean;        // Can only buy once
  isLimited: boolean;        // Time-limited
  startsAt?: Date;
  endsAt?: Date;
  
  // Targeting
  targetNewPlayers: boolean;
  targetReturningPlayers: boolean;
  minLevel?: number;
  
  // Visual
  banner: string;
  badge: string;
  glowColor: string;
}

// ============ COIN PACKS ============

export const COIN_PACKS: CurrencyPack[] = [
  {
    id: 'coins_100',
    name: 'Pocket Change',
    nameNL: 'Zakgeld',
    currency: 'coins',
    baseAmount: 100,
    bonusAmount: 0,
    totalAmount: 100,
    bonusPercent: 0,
    priceReal: 99,
    priceDisplay: '€0.99',
    valueRating: 'okay',
    icon: '🪙',
    color: '#fbbf24',
  },
  {
    id: 'coins_500',
    name: 'Small Stash',
    nameNL: 'Klein Potje',
    currency: 'coins',
    baseAmount: 500,
    bonusAmount: 25,
    totalAmount: 525,
    bonusPercent: 5,
    priceReal: 399,
    priceDisplay: '€3.99',
    valueRating: 'good',
    icon: '🪙',
    color: '#fbbf24',
  },
  {
    id: 'coins_1200',
    name: 'Coin Bag',
    nameNL: 'Muntzak',
    currency: 'coins',
    baseAmount: 1000,
    bonusAmount: 200,
    totalAmount: 1200,
    bonusPercent: 20,
    priceReal: 799,
    priceDisplay: '€7.99',
    valueRating: 'great',
    popular: true,
    icon: '💰',
    color: '#f59e0b',
  },
  {
    id: 'coins_3000',
    name: 'Treasure Chest',
    nameNL: 'Schatkist',
    currency: 'coins',
    baseAmount: 2000,
    bonusAmount: 1000,
    totalAmount: 3000,
    bonusPercent: 50,
    priceReal: 1499,
    priceDisplay: '€14.99',
    valueRating: 'best',
    bestValue: true,
    icon: '💎',
    color: '#ef4444',
  },
];

// ============ GEM PACKS ============

export const GEM_PACKS: CurrencyPack[] = [
  {
    id: 'gems_10',
    name: 'Few Gems',
    nameNL: 'Paar Edelstenen',
    currency: 'gems',
    baseAmount: 10,
    bonusAmount: 0,
    totalAmount: 10,
    bonusPercent: 0,
    priceReal: 99,
    priceDisplay: '€0.99',
    valueRating: 'okay',
    icon: '💎',
    color: '#a855f7',
  },
  {
    id: 'gems_55',
    name: 'Gem Pouch',
    nameNL: 'Edelstenen Zakje',
    currency: 'gems',
    baseAmount: 50,
    bonusAmount: 5,
    totalAmount: 55,
    bonusPercent: 10,
    priceReal: 399,
    priceDisplay: '€3.99',
    valueRating: 'good',
    icon: '💎',
    color: '#a855f7',
  },
  {
    id: 'gems_150',
    name: 'Gem Box',
    nameNL: 'Edelstenen Doos',
    currency: 'gems',
    baseAmount: 120,
    bonusAmount: 30,
    totalAmount: 150,
    bonusPercent: 25,
    priceReal: 799,
    priceDisplay: '€7.99',
    valueRating: 'great',
    popular: true,
    icon: '💠',
    color: '#8b5cf6',
  },
  {
    id: 'gems_400',
    name: 'Gem Vault',
    nameNL: 'Edelstenen Kluis',
    currency: 'gems',
    baseAmount: 280,
    bonusAmount: 120,
    totalAmount: 400,
    bonusPercent: 43,
    priceReal: 1499,
    priceDisplay: '€14.99',
    valueRating: 'best',
    bestValue: true,
    icon: '🏆',
    color: '#7c3aed',
  },
];

// ============ SPECIAL OFFERS ============

export const SPECIAL_OFFERS: SpecialOffer[] = [
  // Starter Pack - One-time for new players
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    nameNL: 'Starterspakket',
    description: 'Everything you need to get started! One-time offer.',
    descriptionNL: 'Alles wat je nodig hebt om te beginnen! Eenmalige aanbieding.',
    contents: [
      { type: 'coins', amount: 500, name: '500 Coins', icon: '🪙' },
      { type: 'skin', id: 'runner_pixel_hero', name: 'Pixel Hero Skin', icon: '👤' },
      { type: 'trail', id: 'trail_sparkle', name: 'Sparkle Trail', icon: '✨' },
    ],
    originalPrice: 999,
    discountedPrice: 499,
    discountPercent: 50,
    isOneTime: true,
    isLimited: false,
    targetNewPlayers: true,
    targetReturningPlayers: false,
    minLevel: 1,
    banner: '/images/offers/starter-pack.png',
    badge: '🆕 NEW PLAYER',
    glowColor: '#22c55e',
  },
  
  // Welcome Back Pack - For returning players
  {
    id: 'welcome_back',
    name: 'Welcome Back Pack',
    nameNL: 'Welkom Terug Pakket',
    description: 'We missed you! Here\'s a special deal just for you.',
    descriptionNL: 'We misten je! Een speciale deal speciaal voor jou.',
    contents: [
      { type: 'coins', amount: 1000, name: '1000 Coins', icon: '🪙' },
      { type: 'gems', amount: 50, name: '50 Gems', icon: '💎' },
      { type: 'emote', id: 'emote_wave', name: 'Wave Emote', icon: '👋' },
    ],
    originalPrice: 999,
    discountedPrice: 399,
    discountPercent: 60,
    isOneTime: true,
    isLimited: true,
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    targetNewPlayers: false,
    targetReturningPlayers: true,
    banner: '/images/offers/welcome-back.png',
    badge: '👋 WELCOME BACK',
    glowColor: '#3b82f6',
  },
  
  // Weekend Special
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    nameNL: 'Weekend Strijder',
    description: 'Limited weekend offer! Grab it before Monday.',
    descriptionNL: 'Beperkte weekend aanbieding! Pak hem voor maandag.',
    contents: [
      { type: 'coins', amount: 750, name: '750 Coins', icon: '🪙' },
      { type: 'skin', id: 'runner_arcade_warrior', name: 'Arcade Warrior', icon: '👾' },
    ],
    originalPrice: 799,
    discountedPrice: 499,
    discountPercent: 38,
    isOneTime: false,
    isLimited: true,
    startsAt: getNextFriday(),
    endsAt: getNextMonday(),
    targetNewPlayers: true,
    targetReturningPlayers: true,
    banner: '/images/offers/weekend.png',
    badge: '⚡ WEEKEND ONLY',
    glowColor: '#f59e0b',
  },
  
  // Premium Bundle
  {
    id: 'premium_bundle',
    name: 'Premium Edition',
    nameNL: 'Premium Editie',
    description: 'Ad-free gaming with exclusive perks forever!',
    descriptionNL: 'Reclamevrij gamen met exclusieve voordelen voor altijd!',
    contents: [
      { type: 'premium', name: 'Ad-Free Forever', icon: '🚫' },
      { type: 'coins', amount: 1000, name: '1000 Bonus Coins', icon: '🪙' },
      { type: 'skin', id: 'runner_neon_knight', name: 'Neon Knight Skin', icon: '🛡️' },
      { type: 'trail', id: 'trail_neon', name: 'Neon Trail', icon: '💠' },
    ],
    originalPrice: 1499,
    discountedPrice: 999,
    discountPercent: 33,
    isOneTime: true,
    isLimited: false,
    targetNewPlayers: true,
    targetReturningPlayers: true,
    banner: '/images/offers/premium.png',
    badge: '⭐ BEST VALUE',
    glowColor: '#ffd700',
  },
  
  // Family Bundle
  {
    id: 'family_bundle',
    name: 'Family Bundle',
    nameNL: 'Gezinspakket',
    description: 'Perfect for playing together! Up to 4 family members.',
    descriptionNL: 'Perfect om samen te spelen! Tot 4 gezinsleden.',
    contents: [
      { type: 'premium', name: '4 Premium Accounts', icon: '👨‍👩‍👧‍👦' },
      { type: 'coins', amount: 2000, name: '2000 Shared Coins', icon: '🪙' },
      { type: 'skin', id: 'family_set', name: 'Family Skin Set', icon: '👕' },
    ],
    originalPrice: 2499,
    discountedPrice: 999,
    discountPercent: 60,
    isOneTime: true,
    isLimited: false,
    targetNewPlayers: true,
    targetReturningPlayers: true,
    banner: '/images/offers/family.png',
    badge: '👨‍👩‍👧‍👦 FAMILY',
    glowColor: '#ec4899',
  },
  
  // Battle Pass Bundle
  {
    id: 'battlepass_bundle',
    name: 'Season Pass Bundle',
    nameNL: 'Seizoenpas Bundel',
    description: 'Battle Pass + 25 tier skips to get ahead!',
    descriptionNL: 'Battle Pass + 25 niveau skips om vooruit te komen!',
    contents: [
      { type: 'battlepass', name: 'Premium Battle Pass', icon: '🎫' },
      { type: 'coins', amount: 500, name: '500 Coins', icon: '🪙' },
    ],
    originalPrice: 1299,
    discountedPrice: 899,
    discountPercent: 31,
    isOneTime: false,
    isLimited: true,
    endsAt: new Date('2025-02-28'), // End of season
    targetNewPlayers: true,
    targetReturningPlayers: true,
    banner: '/images/offers/battlepass.png',
    badge: '🏆 SEASON 1',
    glowColor: '#00ffff',
  },
];

// ============ HELPER FUNCTIONS ============

function getNextFriday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  return friday;
}

function getNextMonday(): Date {
  const friday = getNextFriday();
  const monday = new Date(friday);
  monday.setDate(monday.getDate() + 3);
  return monday;
}

/**
 * Get all coin packs
 */
export function getCoinPacks(): CurrencyPack[] {
  return COIN_PACKS;
}

/**
 * Get all gem packs
 */
export function getGemPacks(): CurrencyPack[] {
  return GEM_PACKS;
}

/**
 * Get active special offers for a player
 */
export function getActiveOffers(playerData: {
  isNewPlayer: boolean;
  isReturningPlayer: boolean;
  level: number;
  purchasedOffers: string[];
}): SpecialOffer[] {
  const now = new Date();
  
  return SPECIAL_OFFERS.filter(offer => {
    // Check if already purchased (for one-time offers)
    if (offer.isOneTime && playerData.purchasedOffers.includes(offer.id)) {
      return false;
    }
    
    // Check time limits
    if (offer.startsAt && now < offer.startsAt) return false;
    if (offer.endsAt && now > offer.endsAt) return false;
    
    // Check targeting
    if (offer.targetNewPlayers && !playerData.isNewPlayer) {
      if (!offer.targetReturningPlayers) return false;
    }
    if (offer.targetReturningPlayers && !playerData.isReturningPlayer) {
      if (!offer.targetNewPlayers) return false;
    }
    
    // Check level requirement
    if (offer.minLevel && playerData.level < offer.minLevel) {
      return false;
    }
    
    return true;
  });
}

/**
 * Calculate value per euro for a pack
 */
export function calculateValuePerEuro(pack: CurrencyPack): number {
  return pack.totalAmount / (pack.priceReal / 100);
}

/**
 * Format remaining time for limited offers
 */
export function formatTimeRemaining(endsAt: Date): string {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default {
  COIN_PACKS,
  GEM_PACKS,
  SPECIAL_OFFERS,
  getCoinPacks,
  getGemPacks,
  getActiveOffers,
  calculateValuePerEuro,
  formatTimeRemaining,
};
