/**
 * Cosmetics Shop System
 * 
 * AI Tester Suggestion (Marcus - Monetization Designer):
 * "Expand the cosmetics shop with new character skins,
 * trail effects, and victory animations. Add previews
 * and bundle discounts for increased revenue."
 * 
 * Features:
 * - Character skin catalog with previews
 * - Trail effects (particles behind player)
 * - Victory animations for winners
 * - Bundle deals and discounts
 * - Currency system (coins + gems)
 * - Purchase flow with confirmation
 */

export type CosmeticType = 
    | 'skin'
    | 'trail'
    | 'victory'
    | 'hat'
    | 'emote'
    | 'nameplate';

export type CurrencyType = 'coins' | 'gems';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
    id: string;
    name: string;
    description: string;
    type: CosmeticType;
    rarity: Rarity;
    price: number;
    currency: CurrencyType;
    previewImage: string;
    previewModel?: string;    // For 3D previews
    unlockLevel?: number;     // Level required to purchase
    isNew?: boolean;
    isFeatured?: boolean;
    isLimited?: boolean;      // Limited time availability
    expiresAt?: Date;
}

export interface CosmeticBundle {
    id: string;
    name: string;
    description: string;
    items: string[];          // Item IDs
    originalPrice: number;
    bundlePrice: number;
    currency: CurrencyType;
    discountPercent: number;
    previewImage: string;
    isLimited?: boolean;
    expiresAt?: Date;
    isFeatured?: boolean;
    unlockLevel?: number;
}

export interface PlayerInventory {
    ownedItems: Set<string>;
    equippedSkin: string | null;
    equippedTrail: string | null;
    equippedVictory: string | null;
    equippedHat: string | null;
    equippedEmote: string[];   // Can have multiple emotes
    equippedNameplate: string | null;
}

export interface ShopConfig {
    featuredRotationHours: number;
    maxRecentItems: number;
    bundleHighlightEnabled: boolean;
}

// Rarity color mapping
const RARITY_COLORS: Record<Rarity, string> = {
    common: '#B0B0B0',
    rare: '#4A90D9',
    epic: '#9B59B6',
    legendary: '#F39C12'
};

// Sample catalog items
const CATALOG: CosmeticItem[] = [
    // Skins
    {
        id: 'skin_classic_yellow',
        name: 'Classic Yellow',
        description: 'The original look. Simple, iconic.',
        type: 'skin',
        rarity: 'common',
        price: 0,
        currency: 'coins',
        previewImage: '/cosmetics/skins/classic_yellow.png'
    },
    {
        id: 'skin_neon_runner',
        name: 'Neon Runner',
        description: 'Glow in the dark with electric style.',
        type: 'skin',
        rarity: 'rare',
        price: 500,
        currency: 'coins',
        previewImage: '/cosmetics/skins/neon_runner.png',
        isNew: true
    },
    {
        id: 'skin_shadow_ninja',
        name: 'Shadow Ninja',
        description: 'Move like a whisper in the night.',
        type: 'skin',
        rarity: 'epic',
        price: 150,
        currency: 'gems',
        previewImage: '/cosmetics/skins/shadow_ninja.png'
    },
    {
        id: 'skin_golden_champion',
        name: 'Golden Champion',
        description: 'For true legends only.',
        type: 'skin',
        rarity: 'legendary',
        price: 500,
        currency: 'gems',
        previewImage: '/cosmetics/skins/golden_champion.png',
        unlockLevel: 50,
        isFeatured: true
    },
    {
        id: 'skin_pixel_retro',
        name: 'Pixel Retro',
        description: '8-bit nostalgia vibes.',
        type: 'skin',
        rarity: 'rare',
        price: 400,
        currency: 'coins',
        previewImage: '/cosmetics/skins/pixel_retro.png'
    },
    {
        id: 'skin_cyber_chrome',
        name: 'Cyber Chrome',
        description: 'Sleek metallic future.',
        type: 'skin',
        rarity: 'epic',
        price: 200,
        currency: 'gems',
        previewImage: '/cosmetics/skins/cyber_chrome.png',
        isNew: true
    },
    
    // Trails
    {
        id: 'trail_none',
        name: 'No Trail',
        description: 'Keep it simple.',
        type: 'trail',
        rarity: 'common',
        price: 0,
        currency: 'coins',
        previewImage: '/cosmetics/trails/none.png'
    },
    {
        id: 'trail_sparkle',
        name: 'Sparkle Trail',
        description: 'Leave a glittering path.',
        type: 'trail',
        rarity: 'rare',
        price: 300,
        currency: 'coins',
        previewImage: '/cosmetics/trails/sparkle.png'
    },
    {
        id: 'trail_fire',
        name: 'Fire Trail',
        description: 'Blaze through the maze.',
        type: 'trail',
        rarity: 'epic',
        price: 100,
        currency: 'gems',
        previewImage: '/cosmetics/trails/fire.png',
        isFeatured: true
    },
    {
        id: 'trail_rainbow',
        name: 'Rainbow Trail',
        description: 'Spread joy wherever you go.',
        type: 'trail',
        rarity: 'legendary',
        price: 300,
        currency: 'gems',
        previewImage: '/cosmetics/trails/rainbow.png'
    },
    {
        id: 'trail_ghost',
        name: 'Ghost Trail',
        description: 'Ethereal wisps follow your path.',
        type: 'trail',
        rarity: 'epic',
        price: 120,
        currency: 'gems',
        previewImage: '/cosmetics/trails/ghost.png',
        isNew: true
    },
    
    // Victory Animations
    {
        id: 'victory_default',
        name: 'Victory Wave',
        description: 'A simple wave to celebrate.',
        type: 'victory',
        rarity: 'common',
        price: 0,
        currency: 'coins',
        previewImage: '/cosmetics/victory/wave.png'
    },
    {
        id: 'victory_dance',
        name: 'Victory Dance',
        description: 'Show off your moves!',
        type: 'victory',
        rarity: 'rare',
        price: 400,
        currency: 'coins',
        previewImage: '/cosmetics/victory/dance.png'
    },
    {
        id: 'victory_explosion',
        name: 'Confetti Explosion',
        description: 'Party time!',
        type: 'victory',
        rarity: 'epic',
        price: 150,
        currency: 'gems',
        previewImage: '/cosmetics/victory/confetti.png',
        isFeatured: true
    },
    {
        id: 'victory_throne',
        name: 'Victory Throne',
        description: 'Sit upon your throne of glory.',
        type: 'victory',
        rarity: 'legendary',
        price: 400,
        currency: 'gems',
        previewImage: '/cosmetics/victory/throne.png',
        unlockLevel: 30
    }
];

// Sample bundles
const BUNDLES: CosmeticBundle[] = [
    {
        id: 'bundle_starter',
        name: 'Starter Pack',
        description: 'Perfect for new players. Get a head start!',
        items: ['skin_neon_runner', 'trail_sparkle', 'victory_dance'],
        originalPrice: 1200,
        bundlePrice: 800,
        currency: 'coins',
        discountPercent: 33,
        previewImage: '/cosmetics/bundles/starter.png'
    },
    {
        id: 'bundle_neon',
        name: 'Neon Collection',
        description: 'Light up the night with this electric set.',
        items: ['skin_neon_runner', 'trail_fire', 'skin_cyber_chrome'],
        originalPrice: 350,
        bundlePrice: 250,
        currency: 'gems',
        discountPercent: 29,
        previewImage: '/cosmetics/bundles/neon.png',
        isFeatured: true
    },
    {
        id: 'bundle_legendary',
        name: 'Legendary Champions',
        description: 'For those who settle for nothing less than the best.',
        items: ['skin_golden_champion', 'trail_rainbow', 'victory_throne'],
        originalPrice: 1200,
        bundlePrice: 900,
        currency: 'gems',
        discountPercent: 25,
        previewImage: '/cosmetics/bundles/legendary.png',
        unlockLevel: 40
    }
];

/**
 * CosmeticsShop - Manages cosmetic items and purchases
 */
export class CosmeticsShop {
    private catalog: CosmeticItem[] = [...CATALOG];
    private bundles: CosmeticBundle[] = [...BUNDLES];
    private inventory: PlayerInventory = {
        ownedItems: new Set(['skin_classic_yellow', 'trail_none', 'victory_default']),
        equippedSkin: 'skin_classic_yellow',
        equippedTrail: 'trail_none',
        equippedVictory: 'victory_default',
        equippedHat: null,
        equippedEmote: [],
        equippedNameplate: null
    };
    
    // Player currency
    private coins = 1000;
    private gems = 50;
    
    // Player level (for level-locked items)
    private playerLevel = 1;
    
    // Callbacks
    private onPurchase: ((item: CosmeticItem) => void) | null = null;
    private onEquip: ((item: CosmeticItem) => void) | null = null;

    constructor() {
        console.log('[CosmeticsShop] Initialized');
    }

    /**
     * Get all items of a specific type
     */
    getItemsByType(type: CosmeticType): CosmeticItem[] {
        return this.catalog.filter(item => item.type === type);
    }

    /**
     * Get all featured items
     */
    getFeaturedItems(): CosmeticItem[] {
        return this.catalog.filter(item => item.isFeatured);
    }

    /**
     * Get new items
     */
    getNewItems(): CosmeticItem[] {
        return this.catalog.filter(item => item.isNew);
    }

    /**
     * Get items by rarity
     */
    getItemsByRarity(rarity: Rarity): CosmeticItem[] {
        return this.catalog.filter(item => item.rarity === rarity);
    }

    /**
     * Get available bundles
     */
    getBundles(): CosmeticBundle[] {
        return this.bundles.filter(bundle => {
            // Filter out expired bundles
            if (bundle.expiresAt && new Date() > bundle.expiresAt) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get featured bundles
     */
    getFeaturedBundles(): CosmeticBundle[] {
        return this.getBundles().filter(bundle => bundle.isFeatured);
    }

    /**
     * Get item by ID
     */
    getItem(itemId: string): CosmeticItem | undefined {
        return this.catalog.find(item => item.id === itemId);
    }

    /**
     * Check if player owns item
     */
    ownsItem(itemId: string): boolean {
        return this.inventory.ownedItems.has(itemId);
    }

    /**
     * Check if player can afford item
     */
    canAfford(item: CosmeticItem): boolean {
        if (item.currency === 'coins') {
            return this.coins >= item.price;
        }
        return this.gems >= item.price;
    }

    /**
     * Check if player can afford bundle
     */
    canAffordBundle(bundle: CosmeticBundle): boolean {
        if (bundle.currency === 'coins') {
            return this.coins >= bundle.bundlePrice;
        }
        return this.gems >= bundle.bundlePrice;
    }

    /**
     * Check if player meets level requirement
     */
    meetsLevelRequirement(item: CosmeticItem): boolean {
        return !item.unlockLevel || this.playerLevel >= item.unlockLevel;
    }

    /**
     * Purchase an item
     */
    purchaseItem(itemId: string): { success: boolean; error?: string } {
        const item = this.getItem(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        if (this.ownsItem(itemId)) {
            return { success: false, error: 'Already owned' };
        }

        if (!this.meetsLevelRequirement(item)) {
            return { success: false, error: `Requires level ${item.unlockLevel}` };
        }

        if (!this.canAfford(item)) {
            return { success: false, error: 'Insufficient funds' };
        }

        // Deduct currency
        if (item.currency === 'coins') {
            this.coins -= item.price;
        } else {
            this.gems -= item.price;
        }

        // Add to inventory
        this.inventory.ownedItems.add(itemId);

        console.log(`[CosmeticsShop] Purchased: ${item.name}`);
        
        if (this.onPurchase) {
            this.onPurchase(item);
        }

        return { success: true };
    }

    /**
     * Purchase a bundle
     */
    purchaseBundle(bundleId: string): { success: boolean; error?: string } {
        const bundle = this.bundles.find(b => b.id === bundleId);
        if (!bundle) {
            return { success: false, error: 'Bundle not found' };
        }

        if (!this.canAffordBundle(bundle)) {
            return { success: false, error: 'Insufficient funds' };
        }

        // Check if all items are available
        for (const itemId of bundle.items) {
            const item = this.getItem(itemId);
            if (item && item.unlockLevel && this.playerLevel < item.unlockLevel) {
                return { success: false, error: `Requires level ${item.unlockLevel}` };
            }
        }

        // Deduct currency
        if (bundle.currency === 'coins') {
            this.coins -= bundle.bundlePrice;
        } else {
            this.gems -= bundle.bundlePrice;
        }

        // Add all items to inventory
        for (const itemId of bundle.items) {
            this.inventory.ownedItems.add(itemId);
        }

        console.log(`[CosmeticsShop] Purchased bundle: ${bundle.name}`);

        return { success: true };
    }

    /**
     * Equip an item
     */
    equipItem(itemId: string): { success: boolean; error?: string } {
        if (!this.ownsItem(itemId)) {
            return { success: false, error: 'Item not owned' };
        }

        const item = this.getItem(itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        switch (item.type) {
            case 'skin':
                this.inventory.equippedSkin = itemId;
                break;
            case 'trail':
                this.inventory.equippedTrail = itemId;
                break;
            case 'victory':
                this.inventory.equippedVictory = itemId;
                break;
            case 'hat':
                this.inventory.equippedHat = itemId;
                break;
            case 'nameplate':
                this.inventory.equippedNameplate = itemId;
                break;
            case 'emote':
                if (!this.inventory.equippedEmote.includes(itemId)) {
                    if (this.inventory.equippedEmote.length >= 4) {
                        this.inventory.equippedEmote.shift();
                    }
                    this.inventory.equippedEmote.push(itemId);
                }
                break;
        }

        console.log(`[CosmeticsShop] Equipped: ${item.name}`);
        
        if (this.onEquip) {
            this.onEquip(item);
        }

        return { success: true };
    }

    /**
     * Get equipped items
     */
    getEquipped(): PlayerInventory {
        return { ...this.inventory };
    }

    /**
     * Get player currency
     */
    getCurrency(): { coins: number; gems: number } {
        return { coins: this.coins, gems: this.gems };
    }

    /**
     * Add currency (from purchases, rewards, etc.)
     */
    addCurrency(type: CurrencyType, amount: number): void {
        if (type === 'coins') {
            this.coins += amount;
        } else {
            this.gems += amount;
        }
    }

    /**
     * Set player level
     */
    setPlayerLevel(level: number): void {
        this.playerLevel = level;
    }

    /**
     * Get rarity color
     */
    getRarityColor(rarity: Rarity): string {
        return RARITY_COLORS[rarity];
    }

    /**
     * Calculate savings for a bundle
     */
    getBundleSavings(bundle: CosmeticBundle): number {
        return bundle.originalPrice - bundle.bundlePrice;
    }

    /**
     * Set callbacks
     */
    setCallbacks(
        onPurchase: (item: CosmeticItem) => void,
        onEquip: (item: CosmeticItem) => void
    ): void {
        this.onPurchase = onPurchase;
        this.onEquip = onEquip;
    }

    /**
     * Load inventory from saved data
     */
    loadInventory(data: {
        ownedItems: string[];
        equipped: Partial<PlayerInventory>;
        coins: number;
        gems: number;
        level: number;
    }): void {
        this.inventory.ownedItems = new Set(data.ownedItems);
        if (data.equipped.equippedSkin) {
            this.inventory.equippedSkin = data.equipped.equippedSkin;
        }
        if (data.equipped.equippedTrail) {
            this.inventory.equippedTrail = data.equipped.equippedTrail;
        }
        if (data.equipped.equippedVictory) {
            this.inventory.equippedVictory = data.equipped.equippedVictory;
        }
        this.coins = data.coins;
        this.gems = data.gems;
        this.playerLevel = data.level;
    }

    /**
     * Export inventory for saving
     */
    exportInventory(): object {
        return {
            ownedItems: Array.from(this.inventory.ownedItems),
            equipped: {
                equippedSkin: this.inventory.equippedSkin,
                equippedTrail: this.inventory.equippedTrail,
                equippedVictory: this.inventory.equippedVictory,
                equippedHat: this.inventory.equippedHat,
                equippedEmote: this.inventory.equippedEmote,
                equippedNameplate: this.inventory.equippedNameplate
            },
            coins: this.coins,
            gems: this.gems,
            level: this.playerLevel
        };
    }
}

// Singleton
let cosmeticsShop: CosmeticsShop | null = null;

export function getCosmeticsShop(): CosmeticsShop {
    if (!cosmeticsShop) {
        cosmeticsShop = new CosmeticsShop();
    }
    return cosmeticsShop;
}

/**
 * Theme-Based Skins System
 * 
 * AI Tester Suggestion (Marcus - Monetization Analyst):
 * "Voeg skins toe gebaseerd op nieuwe thema's.
 * Om cross-selling met themes te bevorderen."
 * 
 * Theme-matched cosmetics for each game environment
 */
export interface ThemeSkin {
    id: string;
    themeId: string;
    name: string;
    description: string;
    type: CosmeticType;
    rarity: Rarity;
    price: number;
    currency: CurrencyType;
    previewImage: string;
    glowColor: string;
    particleEffect?: string;
    matchesTheme: boolean;
}

export interface ThemeSkinBundle {
    themeId: string;
    themeName: string;
    skins: ThemeSkin[];
    bundlePrice: number;
    discount: number;
}

// Theme-specific skins
const THEME_SKINS: ThemeSkin[] = [
    // Neon Night theme skins
    {
        id: 'skin_neon_phantom',
        themeId: 'neon_night',
        name: 'Neon Phantom',
        description: 'Glow with the power of neon lights',
        type: 'skin',
        rarity: 'epic',
        price: 800,
        currency: 'gems',
        previewImage: '/cosmetics/skins/neon_phantom.png',
        glowColor: '#ff00ff',
        particleEffect: 'neon_trail',
        matchesTheme: true
    },
    {
        id: 'trail_neon_glow',
        themeId: 'neon_night',
        name: 'Neon Glow Trail',
        description: 'Leave a glowing neon trail',
        type: 'trail',
        rarity: 'rare',
        price: 400,
        currency: 'gems',
        previewImage: '/cosmetics/trails/neon_glow.png',
        glowColor: '#00ffff',
        matchesTheme: true
    },
    // Cyber Arcade theme skins
    {
        id: 'skin_pixel_warrior',
        themeId: 'cyber_arcade',
        name: 'Pixel Warrior',
        description: '8-bit styled character',
        type: 'skin',
        rarity: 'epic',
        price: 750,
        currency: 'gems',
        previewImage: '/cosmetics/skins/pixel_warrior.png',
        glowColor: '#00ffcc',
        particleEffect: 'pixel_burst',
        matchesTheme: true
    },
    {
        id: 'trail_pixel_dust',
        themeId: 'cyber_arcade',
        name: 'Pixel Dust Trail',
        description: 'Retro pixel particles follow you',
        type: 'trail',
        rarity: 'rare',
        price: 350,
        currency: 'gems',
        previewImage: '/cosmetics/trails/pixel_dust.png',
        glowColor: '#ff6600',
        matchesTheme: true
    },
    // Sunset Maze theme skins
    {
        id: 'skin_golden_runner',
        themeId: 'sunset_maze',
        name: 'Golden Runner',
        description: 'Bathed in golden sunset light',
        type: 'skin',
        rarity: 'legendary',
        price: 1200,
        currency: 'gems',
        previewImage: '/cosmetics/skins/golden_runner.png',
        glowColor: '#ffd700',
        particleEffect: 'golden_sparkle',
        matchesTheme: true
    },
    {
        id: 'trail_sunset_glow',
        themeId: 'sunset_maze',
        name: 'Sunset Glow Trail',
        description: 'Warm orange glow follows your path',
        type: 'trail',
        rarity: 'epic',
        price: 500,
        currency: 'gems',
        previewImage: '/cosmetics/trails/sunset_glow.png',
        glowColor: '#ff6b35',
        matchesTheme: true
    },
    // Frost Realm theme skins
    {
        id: 'skin_ice_crystal',
        themeId: 'frost_realm',
        name: 'Ice Crystal',
        description: 'Frozen in crystalline beauty',
        type: 'skin',
        rarity: 'epic',
        price: 850,
        currency: 'gems',
        previewImage: '/cosmetics/skins/ice_crystal.png',
        glowColor: '#88ccff',
        particleEffect: 'snowflake',
        matchesTheme: true
    },
    {
        id: 'trail_frost_path',
        themeId: 'frost_realm',
        name: 'Frost Path Trail',
        description: 'Leave a frozen trail behind',
        type: 'trail',
        rarity: 'rare',
        price: 400,
        currency: 'gems',
        previewImage: '/cosmetics/trails/frost_path.png',
        glowColor: '#ffffff',
        matchesTheme: true
    }
];

/**
 * ThemeSkinManager - Manages theme-based cosmetics
 */
export class ThemeSkinManager {
    /**
     * Get all skins for a specific theme
     */
    getSkinsForTheme(themeId: string): ThemeSkin[] {
        return THEME_SKINS.filter(skin => skin.themeId === themeId);
    }

    /**
     * Get theme bundle with discount
     */
    getThemeBundle(themeId: string): ThemeSkinBundle | null {
        const skins = this.getSkinsForTheme(themeId);
        if (skins.length === 0) return null;

        const totalPrice = skins.reduce((sum, skin) => sum + skin.price, 0);
        const discount = 0.25; // 25% bundle discount
        const bundlePrice = Math.floor(totalPrice * (1 - discount));

        const themeNames: Record<string, string> = {
            neon_night: 'Neon Night',
            cyber_arcade: 'Cyber Arcade',
            sunset_maze: 'Sunset Maze',
            frost_realm: 'Frost Realm'
        };

        return {
            themeId,
            themeName: themeNames[themeId] || themeId,
            skins,
            bundlePrice,
            discount
        };
    }

    /**
     * Check if skin matches current theme
     */
    skinMatchesTheme(skinId: string, currentThemeId: string): boolean {
        const skin = THEME_SKINS.find(s => s.id === skinId);
        return skin?.themeId === currentThemeId;
    }

    /**
     * Get bonus for using matching skin
     */
    getThemeMatchBonus(skinId: string, currentThemeId: string): { xpBonus: number; coinBonus: number } {
        if (this.skinMatchesTheme(skinId, currentThemeId)) {
            return { xpBonus: 1.1, coinBonus: 1.05 }; // 10% XP, 5% coins
        }
        return { xpBonus: 1, coinBonus: 1 };
    }

    /**
     * Get all available theme bundles
     */
    getAllThemeBundles(): ThemeSkinBundle[] {
        const themeIds = [...new Set(THEME_SKINS.map(s => s.themeId))];
        return themeIds.map(id => this.getThemeBundle(id)).filter(Boolean) as ThemeSkinBundle[];
    }

    /**
     * Get recommended skins for current theme
     */
    getRecommendedSkins(currentThemeId: string, ownedSkins: Set<string>): ThemeSkin[] {
        return THEME_SKINS.filter(skin => 
            skin.themeId === currentThemeId && !ownedSkins.has(skin.id)
        ).sort((a, b) => {
            // Prioritize by rarity
            const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        });
    }
}

// Singleton
let themeSkinManager: ThemeSkinManager | null = null;

export function getThemeSkinManager(): ThemeSkinManager {
    if (!themeSkinManager) {
        themeSkinManager = new ThemeSkinManager();
    }
    return themeSkinManager;
}
