/**
 * Family Bundle & Special Offers - Sprint 3
 * Based on AI Tester Feedback (Marcus - Monetization Expert)
 * 
 * "Family-vriendelijk karakter kan aantrekkelijk zijn voor gezinnen"
 * "Een gezinsbundel kan hier goed inpassen"
 */

export interface Bundle {
    id: string;
    name: string;
    nameNL: string;
    description: string;
    descriptionNL: string;
    price: number; // cents
    originalPrice: number; // cents (before discount)
    discount: number; // percentage
    items: BundleItem[];
    badge?: string;
    featured?: boolean;
    limited?: boolean;
    expiresAt?: Date;
}

export interface BundleItem {
    id: string;
    name: string;
    type: 'skin' | 'coins' | 'premium' | 'powerup' | 'trail' | 'theme' | 'accounts';
    quantity?: number;
    icon: string;
}

// Family Bundle - €9.99 (as per Marcus)
export const FAMILY_BUNDLE: Bundle = {
    id: 'bundle_family',
    name: 'Family Bundle',
    nameNL: 'Gezinspakket',
    description: 'Perfect for playing together! Includes premium access for up to 4 family members.',
    descriptionNL: 'Perfect om samen te spelen! Inclusief premium toegang voor maximaal 4 gezinsleden.',
    price: 999,
    originalPrice: 2000,
    discount: 50,
    badge: '👨‍👩‍👧‍👦 BEST FOR FAMILIES',
    featured: true,
    items: [
        { id: 'family_accounts', name: '4 Premium Accounts', type: 'accounts', quantity: 4, icon: '👥' },
        { id: 'family_skins', name: 'Family Skin Set', type: 'skin', quantity: 4, icon: '👕' },
        { id: 'family_coins', name: '2000 Coins', type: 'coins', quantity: 2000, icon: '🪙' },
        { id: 'family_theme', name: 'Family Party Theme', type: 'theme', quantity: 1, icon: '🎉' },
        { id: 'family_powerups', name: 'Power-up Starter Pack', type: 'powerup', quantity: 10, icon: '⚡' }
    ]
};

// Starter Pack - €4.99 (first purchase bonus)
export const STARTER_PACK: Bundle = {
    id: 'bundle_starter',
    name: 'Starter Pack',
    nameNL: 'Starterspakket',
    description: 'Best value for new players! One-time offer with 50% discount.',
    descriptionNL: 'Beste waarde voor nieuwe spelers! Eenmalige aanbieding met 50% korting.',
    price: 499,
    originalPrice: 999,
    discount: 50,
    badge: '🆕 NEW PLAYER SPECIAL',
    limited: true,
    items: [
        { id: 'starter_coins', name: '500 Coins', type: 'coins', quantity: 500, icon: '🪙' },
        { id: 'starter_skin', name: 'Exclusive Starter Skin', type: 'skin', quantity: 1, icon: '👤' },
        { id: 'starter_powerups', name: '3x Power-ups', type: 'powerup', quantity: 3, icon: '⚡' },
        { id: 'starter_trail', name: 'Basic Trail', type: 'trail', quantity: 1, icon: '✨' }
    ]
};

// Premium Version - €4.99 one-time (as per Marcus)
export const PREMIUM_VERSION: Bundle = {
    id: 'bundle_premium',
    name: 'Premium Version',
    nameNL: 'Premium Versie',
    description: 'Ad-free forever with exclusive perks and skins!',
    descriptionNL: 'Voor altijd reclamevrij met exclusieve voordelen en skins!',
    price: 499,
    originalPrice: 999,
    discount: 50,
    badge: '⭐ BEST VALUE',
    featured: true,
    items: [
        { id: 'premium_adfree', name: 'Ad-Free Forever', type: 'premium', quantity: 1, icon: '🚫' },
        { id: 'premium_skins', name: '10 Premium Skins', type: 'skin', quantity: 10, icon: '👕' },
        { id: 'premium_themes', name: '3 Exclusive Themes', type: 'theme', quantity: 3, icon: '🎨' },
        { id: 'premium_coins', name: '1000 Bonus Coins', type: 'coins', quantity: 1000, icon: '🪙' }
    ]
};

// Weekend Special (rotating)
export const WEEKEND_SPECIAL: Bundle = {
    id: 'bundle_weekend',
    name: 'Weekend Warriors Pack',
    nameNL: 'Weekend Strijders Pakket',
    description: 'Limited time offer! Grab it before Monday.',
    descriptionNL: 'Beperkte aanbieding! Pak hem voor maandag.',
    price: 299,
    originalPrice: 599,
    discount: 50,
    badge: '⏰ WEEKEND ONLY',
    limited: true,
    expiresAt: getNextMonday(),
    items: [
        { id: 'weekend_coins', name: '300 Coins', type: 'coins', quantity: 300, icon: '🪙' },
        { id: 'weekend_skin', name: 'Weekend Exclusive Skin', type: 'skin', quantity: 1, icon: '🎯' },
        { id: 'weekend_powerups', name: '5x Power-ups', type: 'powerup', quantity: 5, icon: '⚡' }
    ]
};

// All bundles
export const ALL_BUNDLES: Bundle[] = [
    FAMILY_BUNDLE,
    STARTER_PACK,
    PREMIUM_VERSION,
    WEEKEND_SPECIAL
];

// Helper: Get next Monday for weekend special expiry
function getNextMonday(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
}

// Format price for display
export function formatBundlePrice(bundle: Bundle): string {
    return `€${(bundle.price / 100).toFixed(2)}`;
}

// Format original price
export function formatOriginalPrice(bundle: Bundle): string {
    return `€${(bundle.originalPrice / 100).toFixed(2)}`;
}

// Check if bundle is available
export function isBundleAvailable(bundle: Bundle): boolean {
    if (!bundle.expiresAt) return true;
    return new Date() < bundle.expiresAt;
}

// Get time remaining for limited bundles
export function getBundleTimeRemaining(bundle: Bundle): string {
    if (!bundle.expiresAt) return '';
    
    const now = new Date();
    const diff = bundle.expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} left`;
    }
    
    return `${hours}h ${minutes}m left`;
}

// Rewarded Video Ads Config (as per Marcus)
export interface RewardedAdConfig {
    id: string;
    placement: string;
    reward: {
        type: 'coins' | 'powerup' | 'skin_trial' | 'xp_boost';
        amount: number;
        duration?: number; // for time-limited rewards
    };
    cooldown: number; // minutes between ads
    maxPerDay: number;
}

export const REWARDED_ADS: RewardedAdConfig[] = [
    {
        id: 'ad_post_game',
        placement: 'After game over',
        reward: { type: 'coins', amount: 25 },
        cooldown: 3,
        maxPerDay: 10
    },
    {
        id: 'ad_second_chance',
        placement: 'Continue after death',
        reward: { type: 'powerup', amount: 1 },
        cooldown: 5,
        maxPerDay: 5
    },
    {
        id: 'ad_double_rewards',
        placement: 'Double game rewards',
        reward: { type: 'coins', amount: 50 },
        cooldown: 10,
        maxPerDay: 3
    },
    {
        id: 'ad_xp_boost',
        placement: '15min XP boost',
        reward: { type: 'xp_boost', amount: 25, duration: 15 },
        cooldown: 60,
        maxPerDay: 2
    },
    {
        id: 'ad_skin_trial',
        placement: 'Try premium skin for 1 game',
        reward: { type: 'skin_trial', amount: 1 },
        cooldown: 30,
        maxPerDay: 3
    }
];
