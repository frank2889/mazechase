/**
 * Enhanced Battle Pass System - Sprint 3
 * Based on AI Tester Feedback (Marcus - Monetization Expert)
 * 
 * Features:
 * - Balanced free vs premium rewards
 * - Season themes as suggested
 * - XP multipliers for premium
 * - Exclusive legendary rewards
 */

export type BattlePassTier = 'free' | 'premium';
export type RewardType = 'coins' | 'skin' | 'trail' | 'emote' | 'powerup' | 'xp_boost' | 'frame' | 'title';

export interface BattlePassReward {
    id: string;
    name: string;
    nameNL: string;
    type: RewardType;
    icon: string;
    tier: BattlePassTier;
    value?: number; // for coins/xp
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface BattlePassLevel {
    level: number;
    xpRequired: number;
    totalXpRequired: number;
    freeReward: BattlePassReward | null;
    premiumReward: BattlePassReward | null;
}

export interface SeasonInfo {
    id: string;
    name: string;
    nameNL: string;
    theme: string;
    startDate: Date;
    endDate: Date;
    maxLevel: number;
    price: number; // in cents
    description: string;
}

// Current Season - Cyber Revolution (as per Marcus)
export const CURRENT_SEASON: SeasonInfo = {
    id: 'season_1_cyber',
    name: 'Cyber Revolution',
    nameNL: 'Cyber Revolutie',
    theme: 'cyber',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-02-28'),
    maxLevel: 50,
    price: 499, // €4.99
    description: 'Unlock futuristic skins, neon trails, and exclusive cyber rewards!'
};

// Future seasons for preview
export const UPCOMING_SEASONS: Partial<SeasonInfo>[] = [
    {
        id: 'season_2_retro',
        name: 'Retro Revival',
        nameNL: 'Retro Terugkeer',
        theme: 'retro',
        description: '8-bit nostalgia with pixel-perfect rewards'
    },
    {
        id: 'season_3_nature',
        name: "Nature's Wrath",
        nameNL: 'Woede der Natuur',
        theme: 'nature',
        description: 'Elemental powers and forest mysteries'
    },
    {
        id: 'season_4_space',
        name: 'Galactic Odyssey',
        nameNL: 'Galactische Odyssee',
        theme: 'space',
        description: 'Explore the cosmos with stellar rewards'
    }
];

// Generate balanced battle pass levels
export function generateBattlePassLevels(): BattlePassLevel[] {
    const levels: BattlePassLevel[] = [];
    let totalXp = 0;
    
    for (let level = 1; level <= CURRENT_SEASON.maxLevel; level++) {
        // XP curve: starts easy, gets harder
        const xpRequired = Math.floor(100 + (level * 20) + Math.pow(level, 1.5) * 5);
        totalXp += xpRequired;
        
        levels.push({
            level,
            xpRequired,
            totalXpRequired: totalXp,
            freeReward: getFreeReward(level),
            premiumReward: getPremiumReward(level)
        });
    }
    
    return levels;
}

// Free track rewards - every 5 levels
function getFreeReward(level: number): BattlePassReward | null {
    // Free rewards at 5, 10, 15, 20, etc.
    if (level % 5 !== 0) return null;
    
    const rewards: Record<number, BattlePassReward> = {
        5: { id: 'free_coins_50', name: '50 Coins', nameNL: '50 Munten', type: 'coins', icon: '🪙', tier: 'free', value: 50 },
        10: { id: 'free_powerup', name: 'Speed Boost', nameNL: 'Snelheids Boost', type: 'powerup', icon: '⚡', tier: 'free' },
        15: { id: 'free_coins_100', name: '100 Coins', nameNL: '100 Munten', type: 'coins', icon: '🪙', tier: 'free', value: 100 },
        20: { id: 'free_frame', name: 'Basic Frame', nameNL: 'Basis Kader', type: 'frame', icon: '🖼️', tier: 'free', rarity: 'common' },
        25: { id: 'free_coins_150', name: '150 Coins', nameNL: '150 Munten', type: 'coins', icon: '🪙', tier: 'free', value: 150 },
        30: { id: 'free_trail', name: 'Basic Trail', nameNL: 'Basis Spoor', type: 'trail', icon: '✨', tier: 'free', rarity: 'common' },
        35: { id: 'free_coins_200', name: '200 Coins', nameNL: '200 Munten', type: 'coins', icon: '🪙', tier: 'free', value: 200 },
        40: { id: 'free_emote', name: 'Wave Emote', nameNL: 'Zwaai Emote', type: 'emote', icon: '👋', tier: 'free', rarity: 'common' },
        45: { id: 'free_coins_250', name: '250 Coins', nameNL: '250 Munten', type: 'coins', icon: '🪙', tier: 'free', value: 250 },
        50: { id: 'free_skin', name: 'Cyber Starter', nameNL: 'Cyber Beginner', type: 'skin', icon: '👤', tier: 'free', rarity: 'rare' }
    };
    
    return rewards[level] || null;
}

// Premium track rewards - every 3 levels (more value!)
function getPremiumReward(level: number): BattlePassReward | null {
    // Premium rewards at levels 1, 3, 5, 7, etc. (more frequent)
    if (level % 2 === 0 && level % 5 !== 0) return null; // Skip some even levels, keep milestone levels
    
    // Special milestone rewards
    const milestones: Record<number, BattlePassReward> = {
        1: { id: 'prem_xp_boost', name: '+10% XP Boost', nameNL: '+10% XP Boost', type: 'xp_boost', icon: '🚀', tier: 'premium', value: 10 },
        5: { id: 'prem_trail_neon', name: 'Neon Trail', nameNL: 'Neon Spoor', type: 'trail', icon: '🌈', tier: 'premium', rarity: 'rare' },
        10: { id: 'prem_skin_cyber', name: 'Cyber Runner', nameNL: 'Cyber Loper', type: 'skin', icon: '🤖', tier: 'premium', rarity: 'rare' },
        15: { id: 'prem_emote_dance', name: 'Victory Dance', nameNL: 'Overwinningsdans', type: 'emote', icon: '💃', tier: 'premium', rarity: 'rare' },
        20: { id: 'prem_coins_500', name: '500 Coins', nameNL: '500 Munten', type: 'coins', icon: '💰', tier: 'premium', value: 500 },
        25: { id: 'prem_frame_epic', name: 'Neon Frame', nameNL: 'Neon Kader', type: 'frame', icon: '🖼️', tier: 'premium', rarity: 'epic' },
        30: { id: 'prem_trail_rainbow', name: 'Rainbow Trail', nameNL: 'Regenboog Spoor', type: 'trail', icon: '🌈', tier: 'premium', rarity: 'epic' },
        35: { id: 'prem_skin_elite', name: 'Elite Chaser', nameNL: 'Elite Jager', type: 'skin', icon: '👹', tier: 'premium', rarity: 'epic' },
        40: { id: 'prem_title', name: 'Cyber Champion', nameNL: 'Cyber Kampioen', type: 'title', icon: '👑', tier: 'premium', rarity: 'epic' },
        45: { id: 'prem_coins_1000', name: '1000 Coins', nameNL: '1000 Munten', type: 'coins', icon: '💎', tier: 'premium', value: 1000 },
        50: { id: 'prem_skin_legendary', name: 'Cyber Overlord', nameNL: 'Cyber Overheerser', type: 'skin', icon: '⚡', tier: 'premium', rarity: 'legendary' }
    };
    
    if (milestones[level]) return milestones[level];
    
    // Regular rewards for odd levels
    if (level % 2 === 1) {
        const coinAmounts = [25, 50, 75, 100, 125];
        const idx = Math.floor(level / 10);
        return {
            id: `prem_coins_${level}`,
            name: `${coinAmounts[idx] || 150} Coins`,
            nameNL: `${coinAmounts[idx] || 150} Munten`,
            type: 'coins',
            icon: '🪙',
            tier: 'premium',
            value: coinAmounts[idx] || 150
        };
    }
    
    return null;
}

// Calculate XP needed for next level
export function getXpToNextLevel(currentXp: number, currentLevel: number): number {
    const levels = generateBattlePassLevels();
    if (currentLevel >= CURRENT_SEASON.maxLevel) return 0;
    
    const levelData = levels[currentLevel]; // 0-indexed for next level
    if (!levelData) return 0;
    
    const xpIntoCurrentLevel = currentXp - (levels[currentLevel - 1]?.totalXpRequired || 0);
    return levelData.xpRequired - xpIntoCurrentLevel;
}

// Get progress percentage to next level
export function getLevelProgress(currentXp: number, currentLevel: number): number {
    const levels = generateBattlePassLevels();
    if (currentLevel >= CURRENT_SEASON.maxLevel) return 100;
    
    const prevLevelXp = levels[currentLevel - 1]?.totalXpRequired || 0;
    const currentLevelXp = levels[currentLevel]?.xpRequired || 100;
    const xpIntoLevel = currentXp - prevLevelXp;
    
    return Math.min(100, Math.round((xpIntoLevel / currentLevelXp) * 100));
}

// Get days remaining in season
export function getDaysRemaining(): number {
    const now = new Date();
    const end = CURRENT_SEASON.endDate;
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// XP sources
export interface XpSource {
    action: string;
    xp: number;
    description: string;
}

export const XP_SOURCES: XpSource[] = [
    { action: 'game_complete', xp: 25, description: 'Complete a game' },
    { action: 'game_win', xp: 50, description: 'Win a game' },
    { action: 'daily_login', xp: 20, description: 'Daily login bonus' },
    { action: 'daily_challenge', xp: 100, description: 'Complete daily challenge' },
    { action: 'weekly_challenge', xp: 250, description: 'Complete weekly challenge' },
    { action: 'first_win_day', xp: 75, description: 'First win of the day' },
    { action: 'perfect_game', xp: 100, description: 'Perfect game (no deaths)' },
    { action: 'pellet_master', xp: 50, description: 'Collect all pellets' }
];

// Premium perks
export const PREMIUM_PERKS = [
    { icon: '🚀', text: '+20% XP bonus on all games' },
    { icon: '🎁', text: 'Exclusive premium rewards every level' },
    { icon: '👑', text: 'Legendary Cyber Overlord skin at level 50' },
    { icon: '💰', text: '2500+ coins throughout the pass' },
    { icon: '🎨', text: '3 exclusive skins, 2 trails, 4 emotes' },
    { icon: '⏰', text: 'Unlock all past free rewards instantly' }
];
