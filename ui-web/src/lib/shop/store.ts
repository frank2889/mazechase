/**
 * Monetization Store - Sprint 5
 * Central state management for shop, inventory, currencies, and battle pass
 */

import { createSignal, createEffect, batch } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  Currency,
  CurrencyTransaction,
  PlayerInventory,
  PlayerBattlePass,
  DailyRewardStreak,
  PlayerProgression,
  MonetizationState,
  PurchaseRequest,
  PurchaseResult,
  DailyShop,
  SpecialOffer,
  BattlePassSeason,
} from './types';

// ============ INITIAL STATE ============

const initialCurrency: Currency = {
  coins: 0,
  gems: 0,
  tickets: 0,
};

const initialInventory: PlayerInventory = {
  items: [],
  equipped: {
    runnerSkin: 'default_runner',
    chaserSkin: 'default_chaser',
    trail: null,
    emote1: null,
    emote2: null,
    emote3: null,
    emote4: null,
    frame: null,
    title: null,
  },
};

const initialProgression: PlayerProgression = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
  xpToNextLevel: 100,
  gamesPlayed: 0,
  gamesWon: 0,
  dailyLoginStreak: 0,
};

const initialDailyRewards: DailyRewardStreak = {
  currentDay: 0,
  lastClaimDate: null,
  totalClaims: 0,
  longestStreak: 0,
};

const initialState: MonetizationState = {
  currency: initialCurrency,
  inventory: initialInventory,
  battlePass: null,
  dailyRewards: initialDailyRewards,
  progression: initialProgression,
  currentSeason: null,
  dailyShop: null,
  specialOffers: [],
  isLoading: false,
  error: null,
};

// ============ STORE ============

const [state, setState] = createStore<MonetizationState>(initialState);
const [transactions, setTransactions] = createSignal<CurrencyTransaction[]>([]);

// ============ CURRENCY ACTIONS ============

export function addCurrency(
  type: keyof Currency,
  amount: number,
  reason: string
): void {
  const transaction: CurrencyTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'earn',
    currency: type,
    amount,
    reason,
    timestamp: new Date(),
  };

  batch(() => {
    setState('currency', type, (prev) => prev + amount);
    setTransactions((prev) => [transaction, ...prev].slice(0, 100)); // Keep last 100
  });
  
  // Persist to backend
  syncCurrencyToBackend();
}

export function spendCurrency(
  type: keyof Currency,
  amount: number,
  reason: string,
  itemId?: string
): boolean {
  if (state.currency[type] < amount) {
    return false;
  }

  const transaction: CurrencyTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'spend',
    currency: type,
    amount: -amount,
    reason,
    timestamp: new Date(),
    itemId,
  };

  batch(() => {
    setState('currency', type, (prev) => prev - amount);
    setTransactions((prev) => [transaction, ...prev].slice(0, 100));
  });

  syncCurrencyToBackend();
  return true;
}

export function getCurrency(): Currency {
  return state.currency;
}

export function canAfford(type: keyof Currency, amount: number): boolean {
  return state.currency[type] >= amount;
}

// ============ INVENTORY ACTIONS ============

export function addToInventory(
  itemId: string,
  source: 'shop' | 'battlepass' | 'achievement' | 'event' | 'gift' | 'default'
): void {
  // Check if already owned
  if (state.inventory.items.some((item) => item.itemId === itemId)) {
    return;
  }

  setState('inventory', 'items', (items) => [
    ...items,
    {
      itemId,
      ownedAt: new Date(),
      source,
    },
  ]);

  syncInventoryToBackend();
}

export function equipItem(itemId: string, slot: keyof PlayerInventory['equipped']): void {
  // Verify ownership
  if (!ownsItem(itemId) && itemId !== null) {
    console.warn(`Cannot equip item ${itemId}: not owned`);
    return;
  }

  setState('inventory', 'equipped', slot, itemId);
  syncInventoryToBackend();
}

export function unequipItem(slot: keyof PlayerInventory['equipped']): void {
  setState('inventory', 'equipped', slot, null);
  syncInventoryToBackend();
}

export function ownsItem(itemId: string): boolean {
  return state.inventory.items.some((item) => item.itemId === itemId);
}

export function getEquipped(): PlayerInventory['equipped'] {
  return state.inventory.equipped;
}

export function getOwnedItems(): string[] {
  return state.inventory.items.map((item) => item.itemId);
}

// ============ PURCHASE ACTIONS ============

export async function purchaseItem(request: PurchaseRequest): Promise<PurchaseResult> {
  setState('isLoading', true);
  setState('error', null);

  try {
    // For real money purchases, redirect to Stripe
    if (request.paymentMethod === 'real') {
      return await handleRealMoneyPurchase(request);
    }

    // For in-game currency purchases
    const currencyType = request.paymentMethod;
    const price = await getItemPrice(request.itemId, currencyType);

    if (!canAfford(currencyType, price)) {
      return {
        success: false,
        error: `Insufficient ${currencyType}. Need ${price}, have ${state.currency[currencyType]}`,
      };
    }

    // Deduct currency
    if (!spendCurrency(currencyType, price, `Purchase: ${request.itemId}`, request.itemId)) {
      return { success: false, error: 'Transaction failed' };
    }

    // Add to inventory
    addToInventory(request.itemId, 'shop');

    return {
      success: true,
      transactionId: `purchase_${Date.now()}`,
      newBalance: state.currency,
      itemsReceived: [request.itemId],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setState('error', errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setState('isLoading', false);
  }
}

async function handleRealMoneyPurchase(request: PurchaseRequest): Promise<PurchaseResult> {
  // This would integrate with Stripe checkout
  // For now, return a placeholder
  return {
    success: false,
    error: 'Real money purchases require Stripe integration',
  };
}

async function getItemPrice(itemId: string, currencyType: 'coins' | 'gems'): Promise<number> {
  // This would fetch from item catalog
  // Placeholder prices
  const prices: Record<string, { coins: number; gems: number }> = {
    default: { coins: 500, gems: 50 },
  };
  return prices[itemId]?.[currencyType] ?? prices.default[currencyType];
}

// ============ BATTLE PASS ACTIONS ============

export function initBattlePass(season: BattlePassSeason): void {
  setState('currentSeason', season);
  
  // Check if player has existing battle pass
  const savedBP = loadBattlePassFromStorage(season.id);
  if (savedBP) {
    setState('battlePass', savedBP);
  } else {
    setState('battlePass', {
      seasonId: season.id,
      hasPremium: false,
      currentTier: 1,
      currentXP: 0,
      totalXP: 0,
      claimedFreeRewards: [],
      claimedPremiumRewards: [],
    });
  }
}

export function addBattlePassXP(amount: number): { leveledUp: boolean; newTier: number } {
  if (!state.battlePass || !state.currentSeason) {
    return { leveledUp: false, newTier: 0 };
  }

  // Apply premium XP boost
  const multiplier = state.battlePass.hasPremium ? state.currentSeason.xpBoost : 1;
  const boostedAmount = Math.floor(amount * multiplier);

  let newXP = state.battlePass.currentXP + boostedAmount;
  let newTier = state.battlePass.currentTier;
  let leveledUp = false;

  // Check for tier ups
  const currentTierData = state.currentSeason.tiers[newTier - 1];
  while (currentTierData && newXP >= currentTierData.xpRequired && newTier < state.currentSeason.maxTier) {
    newXP -= currentTierData.xpRequired;
    newTier++;
    leveledUp = true;
  }

  setState('battlePass', produce((bp) => {
    if (bp) {
      bp.currentXP = newXP;
      bp.totalXP += boostedAmount;
      bp.currentTier = newTier;
    }
  }));

  saveBattlePassToStorage();
  return { leveledUp, newTier };
}

export function claimBattlePassReward(tier: number, isPremium: boolean): boolean {
  if (!state.battlePass) return false;

  // Check if tier is unlocked
  if (tier > state.battlePass.currentTier) {
    return false;
  }

  // Check if premium reward requires premium pass
  if (isPremium && !state.battlePass.hasPremium) {
    return false;
  }

  // Check if already claimed
  const claimedList = isPremium 
    ? state.battlePass.claimedPremiumRewards 
    : state.battlePass.claimedFreeRewards;
    
  if (claimedList.includes(tier)) {
    return false;
  }

  // Claim the reward
  setState('battlePass', produce((bp) => {
    if (bp) {
      if (isPremium) {
        bp.claimedPremiumRewards.push(tier);
      } else {
        bp.claimedFreeRewards.push(tier);
      }
    }
  }));

  // Grant the reward (would call reward granting logic)
  grantBattlePassReward(tier, isPremium);
  saveBattlePassToStorage();
  return true;
}

function grantBattlePassReward(tier: number, isPremium: boolean): void {
  if (!state.currentSeason) return;

  const tierData = state.currentSeason.tiers[tier - 1];
  if (!tierData) return;

  const reward = isPremium ? tierData.premiumReward : tierData.freeReward;
  if (!reward) return;

  switch (reward.type) {
    case 'coins':
      addCurrency('coins', reward.amount ?? 0, `Battle Pass Tier ${tier}`);
      break;
    case 'gems':
      addCurrency('gems', reward.amount ?? 0, `Battle Pass Tier ${tier}`);
      break;
    case 'skin':
    case 'trail':
    case 'emote':
    case 'frame':
    case 'title':
      if (reward.itemId) {
        addToInventory(reward.itemId, 'battlepass');
      }
      break;
  }
}

export function purchaseBattlePassPremium(): boolean {
  if (!state.battlePass || !state.currentSeason) return false;
  if (state.battlePass.hasPremium) return false;

  const price = state.currentSeason.premiumPrice;
  if (!canAfford('gems', price)) return false;

  spendCurrency('gems', price, 'Battle Pass Premium');
  
  setState('battlePass', produce((bp) => {
    if (bp) {
      bp.hasPremium = true;
      bp.purchasedAt = new Date();
    }
  }));

  saveBattlePassToStorage();
  return true;
}

// ============ DAILY REWARDS ============

export function canClaimDailyReward(): boolean {
  const lastClaim = state.dailyRewards.lastClaimDate;
  if (!lastClaim) return true;

  const lastClaimDate = new Date(lastClaim);
  const today = new Date();
  
  // Reset time to midnight for comparison
  lastClaimDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today.getTime() > lastClaimDate.getTime();
}

export function claimDailyReward(): { success: boolean; day: number; reward: any } | null {
  if (!canClaimDailyReward()) {
    return null;
  }

  const lastClaim = state.dailyRewards.lastClaimDate;
  const lastClaimDate = lastClaim ? new Date(lastClaim) : null;
  const today = new Date();

  // Check if streak continues or resets
  let newDay = 1;
  if (lastClaimDate) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    lastClaimDate.setHours(0, 0, 0, 0);

    if (lastClaimDate.getTime() === yesterday.getTime()) {
      // Continue streak
      newDay = (state.dailyRewards.currentDay % 7) + 1;
    }
    // Else reset to day 1
  }

  // Get reward for this day
  const reward = getDailyRewardForDay(newDay);

  setState('dailyRewards', produce((dr) => {
    dr.currentDay = newDay;
    dr.lastClaimDate = today.toISOString().split('T')[0];
    dr.totalClaims++;
    if (newDay > dr.longestStreak) {
      dr.longestStreak = newDay;
    }
  }));

  // Grant the reward
  if (reward.type === 'coins') {
    addCurrency('coins', reward.amount, `Daily Reward Day ${newDay}`);
  } else if (reward.type === 'gems') {
    addCurrency('gems', reward.amount, `Daily Reward Day ${newDay}`);
  }

  saveDailyRewardsToStorage();
  return { success: true, day: newDay, reward };
}

function getDailyRewardForDay(day: number): { type: 'coins' | 'gems'; amount: number } {
  // Escalating rewards
  const rewards = [
    { type: 'coins' as const, amount: 50 },
    { type: 'coins' as const, amount: 75 },
    { type: 'coins' as const, amount: 100 },
    { type: 'gems' as const, amount: 5 },
    { type: 'coins' as const, amount: 150 },
    { type: 'coins' as const, amount: 200 },
    { type: 'gems' as const, amount: 25 }, // Day 7 jackpot!
  ];
  return rewards[(day - 1) % 7];
}

// ============ XP & PROGRESSION ============

export function addXP(amount: number, source: string): void {
  let remaining = amount;
  
  setState('progression', produce((prog) => {
    prog.totalXP += amount;
    prog.currentXP += remaining;

    // Level up loop
    while (prog.currentXP >= prog.xpToNextLevel) {
      prog.currentXP -= prog.xpToNextLevel;
      prog.level++;
      prog.xpToNextLevel = calculateXPForLevel(prog.level);
      
      // Grant level up bonus
      addCurrency('coins', prog.level * 10, `Level ${prog.level} Bonus`);
    }
  }));

  // Also add to battle pass
  addBattlePassXP(amount);
}

function calculateXPForLevel(level: number): number {
  return Math.floor(100 + level * 25 + Math.pow(level, 1.3) * 10);
}

export function recordGameComplete(won: boolean): void {
  setState('progression', produce((prog) => {
    prog.gamesPlayed++;
    if (won) prog.gamesWon++;
  }));

  // Grant XP
  const baseXP = 25;
  const winBonus = won ? 50 : 0;
  addXP(baseXP + winBonus, won ? 'Game Win' : 'Game Complete');
}

// ============ PERSISTENCE ============

function syncCurrencyToBackend(): void {
  // Would send to backend API
  localStorage.setItem('mazechase_currency', JSON.stringify(state.currency));
}

function syncInventoryToBackend(): void {
  localStorage.setItem('mazechase_inventory', JSON.stringify(state.inventory));
}

function saveBattlePassToStorage(): void {
  if (state.battlePass) {
    localStorage.setItem(`mazechase_bp_${state.battlePass.seasonId}`, JSON.stringify(state.battlePass));
  }
}

function loadBattlePassFromStorage(seasonId: string): PlayerBattlePass | null {
  const saved = localStorage.getItem(`mazechase_bp_${seasonId}`);
  return saved ? JSON.parse(saved) : null;
}

function saveDailyRewardsToStorage(): void {
  localStorage.setItem('mazechase_daily_rewards', JSON.stringify(state.dailyRewards));
}

export function loadFromStorage(): void {
  try {
    const currency = localStorage.getItem('mazechase_currency');
    if (currency) setState('currency', JSON.parse(currency));

    const inventory = localStorage.getItem('mazechase_inventory');
    if (inventory) setState('inventory', JSON.parse(inventory));

    const dailyRewards = localStorage.getItem('mazechase_daily_rewards');
    if (dailyRewards) setState('dailyRewards', JSON.parse(dailyRewards));
  } catch (e) {
    console.error('Failed to load monetization data:', e);
  }
}

// ============ EXPORTS ============

export const monetizationStore = {
  // State (readonly)
  get state() { return state; },
  get transactions() { return transactions(); },
  
  // Currency
  addCurrency,
  spendCurrency,
  getCurrency,
  canAfford,
  
  // Inventory
  addToInventory,
  equipItem,
  unequipItem,
  ownsItem,
  getEquipped,
  getOwnedItems,
  
  // Purchases
  purchaseItem,
  
  // Battle Pass
  initBattlePass,
  addBattlePassXP,
  claimBattlePassReward,
  purchaseBattlePassPremium,
  
  // Daily Rewards
  canClaimDailyReward,
  claimDailyReward,
  
  // XP
  addXP,
  recordGameComplete,
  
  // Persistence
  loadFromStorage,
};

export default monetizationStore;
