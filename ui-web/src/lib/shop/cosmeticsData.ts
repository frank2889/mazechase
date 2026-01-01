/**
 * Enhanced Cosmetics Shop - Sprint 3
 * Based on AI Tester Feedback (Marcus - Monetization Expert)
 * 
 * Improvements:
 * - Expanded skin catalog with pricing from Marcus
 * - Better visual presentation
 * - Featured items rotation
 * - Bundle deals
 */

// Skin types
export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinType = 'runner' | 'chaser' | 'trail' | 'theme';

export interface CosmeticItem {
    id: string;
    name: string;
    nameNL: string;
    type: SkinType;
    rarity: SkinRarity;
    price: number; // in cents
    priceCoins: number; // alternative coin price
    preview: string; // image path
    description: string;
    theme?: string; // matching theme
    featured?: boolean;
    new?: boolean;
    limited?: boolean;
    expiresAt?: Date;
}

// Runner Skins - €2.99 each (as per Marcus)
export const RUNNER_SKINS: CosmeticItem[] = [
    {
        id: 'runner_neon_knight',
        name: 'Neon Knight',
        nameNL: 'Neon Ridder',
        type: 'runner',
        rarity: 'epic',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/runner_neon_knight.png',
        description: 'Glow in the dark armor with pulsing effects',
        theme: 'neon_night',
        featured: true
    },
    {
        id: 'runner_arcade_warrior',
        name: 'Arcade Warrior',
        nameNL: 'Arcade Krijger',
        type: 'runner',
        rarity: 'rare',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/runner_arcade_warrior.png',
        description: 'Retro pixel-style warrior with 8-bit charm',
        theme: 'cyber_arcade'
    },
    {
        id: 'runner_sunset_surfer',
        name: 'Sunset Surfer',
        nameNL: 'Zonsondergang Surfer',
        type: 'runner',
        rarity: 'rare',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/runner_sunset_surfer.png',
        description: 'Chill vibes with orange and pink gradients',
        theme: 'sunset_maze',
        new: true
    },
    {
        id: 'runner_forest_phantom',
        name: 'Forest Phantom',
        nameNL: 'Bos Fantoom',
        type: 'runner',
        rarity: 'epic',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/runner_forest_phantom.png',
        description: 'Mystic woodland spirit with leaf trail',
        theme: 'shadow_forest'
    },
    {
        id: 'runner_pixel_hero',
        name: 'Pixel Hero',
        nameNL: 'Pixel Held',
        type: 'runner',
        rarity: 'common',
        price: 199,
        priceCoins: 300,
        preview: '/sprites/skins/runner_pixel_hero.png',
        description: 'Classic 8-bit hero style'
    },
    {
        id: 'runner_cyber_samurai',
        name: 'Cyber Samurai',
        nameNL: 'Cyber Samoerai',
        type: 'runner',
        rarity: 'legendary',
        price: 499,
        priceCoins: 800,
        preview: '/sprites/skins/runner_cyber_samurai.png',
        description: 'Futuristic warrior with glowing katana effects',
        featured: true,
        limited: true
    }
];

// Chaser Skins - €2.99 each
export const CHASER_SKINS: CosmeticItem[] = [
    {
        id: 'chaser_neon_predator',
        name: 'Neon Predator',
        nameNL: 'Neon Roofdier',
        type: 'chaser',
        rarity: 'epic',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/chaser_neon_predator.png',
        description: 'Glowing hunter with laser eyes',
        theme: 'neon_night'
    },
    {
        id: 'chaser_arcade_hunter',
        name: 'Arcade Hunter',
        nameNL: 'Arcade Jager',
        type: 'chaser',
        rarity: 'rare',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/chaser_arcade_hunter.png',
        description: 'Retro game villain vibes',
        theme: 'cyber_arcade'
    },
    {
        id: 'chaser_sunset_stalker',
        name: 'Sunset Stalker',
        nameNL: 'Zonsondergang Sluiper',
        type: 'chaser',
        rarity: 'rare',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/chaser_sunset_stalker.png',
        description: 'Warm gradient hunter with fire trail',
        theme: 'sunset_maze'
    },
    {
        id: 'chaser_forest_haunter',
        name: 'Forest Haunter',
        nameNL: 'Bos Spook',
        type: 'chaser',
        rarity: 'epic',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/skins/chaser_forest_haunter.png',
        description: 'Creepy woodland ghost',
        theme: 'shadow_forest',
        new: true
    },
    {
        id: 'chaser_shadow_beast',
        name: 'Shadow Beast',
        nameNL: 'Schaduw Beest',
        type: 'chaser',
        rarity: 'legendary',
        price: 499,
        priceCoins: 800,
        preview: '/sprites/skins/chaser_shadow_beast.png',
        description: 'Dark entity with smoke effects',
        limited: true
    }
];

// Trail Effects - €1.99 each
export const TRAIL_EFFECTS: CosmeticItem[] = [
    {
        id: 'trail_neon_glow',
        name: 'Neon Glow',
        nameNL: 'Neon Gloed',
        type: 'trail',
        rarity: 'rare',
        price: 199,
        priceCoins: 300,
        preview: '/sprites/trails/neon_glow.png',
        description: 'Bright neon trail behind you'
    },
    {
        id: 'trail_pixel_dust',
        name: 'Pixel Dust',
        nameNL: 'Pixel Stof',
        type: 'trail',
        rarity: 'common',
        price: 199,
        priceCoins: 300,
        preview: '/sprites/trails/pixel_dust.png',
        description: '8-bit particles follow your path'
    },
    {
        id: 'trail_shadow_smoke',
        name: 'Shadow Smoke',
        nameNL: 'Schaduw Rook',
        type: 'trail',
        rarity: 'rare',
        price: 199,
        priceCoins: 300,
        preview: '/sprites/trails/shadow_smoke.png',
        description: 'Dark mysterious smoke trail'
    },
    {
        id: 'trail_rainbow_road',
        name: 'Rainbow Road',
        nameNL: 'Regenboog Pad',
        type: 'trail',
        rarity: 'epic',
        price: 299,
        priceCoins: 500,
        preview: '/sprites/trails/rainbow_road.png',
        description: 'Colorful rainbow follows you',
        featured: true
    },
    {
        id: 'trail_stardust',
        name: 'Stardust',
        nameNL: 'Sterrenglans',
        type: 'trail',
        rarity: 'legendary',
        price: 399,
        priceCoins: 650,
        preview: '/sprites/trails/stardust.png',
        description: 'Sparkling stars in your wake',
        new: true
    }
];

// Theme Packs - €4.99 each
export const THEME_PACKS: CosmeticItem[] = [
    {
        id: 'theme_cyber_city',
        name: 'Cyber City Pack',
        nameNL: 'Cyber Stad Pakket',
        type: 'theme',
        rarity: 'epic',
        price: 499,
        priceCoins: 800,
        preview: '/sprites/themes/cyber_city.png',
        description: 'Runner skin + Chaser skin + Trail + Exclusive maze theme'
    },
    {
        id: 'theme_arcade_adventure',
        name: 'Arcade Adventure Pack',
        nameNL: 'Arcade Avontuur Pakket',
        type: 'theme',
        rarity: 'epic',
        price: 499,
        priceCoins: 800,
        preview: '/sprites/themes/arcade_adventure.png',
        description: 'Complete retro gaming set with 4 items'
    },
    {
        id: 'theme_forest_fantasy',
        name: 'Forest Fantasy Pack',
        nameNL: 'Bos Fantasie Pakket',
        type: 'theme',
        rarity: 'epic',
        price: 499,
        priceCoins: 800,
        preview: '/sprites/themes/forest_fantasy.png',
        description: 'Mystical woodland cosmetics bundle'
    }
];

// Get all cosmetics
export function getAllCosmetics(): CosmeticItem[] {
    return [...RUNNER_SKINS, ...CHASER_SKINS, ...TRAIL_EFFECTS, ...THEME_PACKS];
}

// Get featured items
export function getFeaturedItems(): CosmeticItem[] {
    return getAllCosmetics().filter(item => item.featured || item.new || item.limited);
}

// Get items by type
export function getItemsByType(type: SkinType): CosmeticItem[] {
    return getAllCosmetics().filter(item => item.type === type);
}

// Get items by rarity
export function getItemsByRarity(rarity: SkinRarity): CosmeticItem[] {
    return getAllCosmetics().filter(item => item.rarity === rarity);
}

// Rarity colors
export const RARITY_COLORS: Record<SkinRarity, string> = {
    common: '#9CA3AF',    // Gray
    rare: '#3B82F6',      // Blue
    epic: '#8B5CF6',      // Purple
    legendary: '#F59E0B'  // Gold
};

// Rarity gradients for cards
export const RARITY_GRADIENTS: Record<SkinRarity, string> = {
    common: 'linear-gradient(135deg, #374151, #4B5563)',
    rare: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
    epic: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
    legendary: 'linear-gradient(135deg, #D97706, #F59E0B)'
};

// Format price for display
export function formatPrice(cents: number): string {
    return `€${(cents / 100).toFixed(2)}`;
}

// Format coin price
export function formatCoins(coins: number): string {
    return `🪙 ${coins}`;
}

// Calculate bundle discount
export function calculateBundleDiscount(items: CosmeticItem[]): number {
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
    // 20% bundle discount
    return Math.round(totalPrice * 0.8);
}
