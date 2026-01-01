/**
 * Shop Interface System
 * EMMSOAI Suggestion (Marcus - Monetization & Business Strategy):
 * "Creëer een visuele countdown timer voor dagelijkse aanbiedingen"
 */

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    type: 'skin' | 'trail' | 'emote' | 'bundle' | 'currency';
    price: number;
    currency: 'coins' | 'gems' | 'real'; // real = cents
    originalPrice?: number; // For discounts
    discount?: number; // Percentage
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    featured?: boolean;
    expiresAt?: Date;
    limitedQuantity?: number;
    sold?: number;
}

export interface DailyOffer {
    id: string;
    items: ShopItem[];
    expiresAt: Date;
    theme?: string;
}

const STORAGE_KEY = 'mazechase_shop';

// Sample daily offers rotation
const DAILY_OFFERS_TEMPLATES: Omit<ShopItem, 'expiresAt'>[] = [
    {
        id: 'skin_neon_pulse',
        name: 'Neon Pulse Skin',
        description: 'Pulsating neon glow effect',
        type: 'skin',
        price: 150,
        originalPrice: 200,
        discount: 25,
        currency: 'coins',
        icon: '💜',
        rarity: 'rare',
        featured: true
    },
    {
        id: 'trail_stardust',
        name: 'Stardust Trail',
        description: 'Leave a trail of stars',
        type: 'trail',
        price: 100,
        currency: 'coins',
        icon: '⭐',
        rarity: 'rare'
    },
    {
        id: 'bundle_starter',
        name: 'Starter Bundle',
        description: '3 skins + 500 coins',
        type: 'bundle',
        price: 499,
        originalPrice: 899,
        discount: 45,
        currency: 'real',
        icon: '🎁',
        rarity: 'epic',
        featured: true
    },
    {
        id: 'emote_victory',
        name: 'Victory Dance',
        description: 'Celebrate in style',
        type: 'emote',
        price: 75,
        currency: 'coins',
        icon: '💃',
        rarity: 'common'
    },
    {
        id: 'skin_golden',
        name: 'Golden Champion',
        description: 'Solid gold finish',
        type: 'skin',
        price: 300,
        currency: 'coins',
        icon: '🥇',
        rarity: 'legendary',
        limitedQuantity: 100,
        sold: 67
    },
    {
        id: 'currency_coins_1000',
        name: '1000 Coins',
        description: 'Bonus: +100 extra',
        type: 'currency',
        price: 299,
        currency: 'real',
        icon: '💰',
        rarity: 'common'
    }
];

/**
 * Shop Manager with daily offers
 */
export class ShopManager {
    private dailyOffer: DailyOffer | null = null;
    private listeners: Set<() => void> = new Set();
    private countdownInterval: number | null = null;

    constructor() {
        this.loadOrGenerateDailyOffer();
        this.startCountdown();
    }

    /**
     * Load existing offer or generate new one
     */
    private loadOrGenerateDailyOffer(): void {
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const expiresAt = new Date(data.expiresAt);
                
                if (expiresAt > new Date()) {
                    this.dailyOffer = {
                        ...data,
                        expiresAt,
                        items: data.items.map((item: ShopItem) => ({
                            ...item,
                            expiresAt: new Date(item.expiresAt!)
                        }))
                    };
                    return;
                }
            } catch (e) {
                console.warn('[Shop] Failed to load saved offer:', e);
            }
        }

        this.generateDailyOffer();
    }

    /**
     * Generate new daily offer
     */
    private generateDailyOffer(): void {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Use date as seed for consistent daily rotation
        const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        const shuffled = this.seededShuffle([...DAILY_OFFERS_TEMPLATES], seed);

        // Pick 4 items for daily offer
        const selectedItems: ShopItem[] = shuffled.slice(0, 4).map(item => ({
            ...item,
            expiresAt: tomorrow
        }));

        this.dailyOffer = {
            id: `daily_${seed}`,
            items: selectedItems,
            expiresAt: tomorrow,
            theme: this.getThemeForDay(now.getDay())
        };

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dailyOffer));
        
        console.log('[Shop] Generated daily offer:', this.dailyOffer.id);
    }

    /**
     * Seeded shuffle for consistent daily rotation
     */
    private seededShuffle<T>(array: T[], seed: number): T[] {
        const result = [...array];
        let m = result.length;
        
        // Simple LCG PRNG
        const random = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };

        while (m) {
            const i = Math.floor(random() * m--);
            const temp = result[m]!;
            result[m] = result[i]!;
            result[i] = temp;
        }

        return result;
    }

    /**
     * Get theme based on day of week
     */
    private getThemeForDay(day: number): string {
        const themes = [
            'Sunday Savings',
            'Monday Motivation',
            'Tuesday Treasures',
            'Midweek Madness',
            'Thursday Thunder',
            'Flash Friday',
            'Super Saturday'
        ];
        return themes[day] ?? 'Daily Deals';
    }

    /**
     * Start countdown timer
     */
    private startCountdown(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = window.setInterval(() => {
            if (this.dailyOffer && new Date() >= this.dailyOffer.expiresAt) {
                this.generateDailyOffer();
                this.notifyListeners();
            }
        }, 1000);
    }

    /**
     * Get current daily offer
     */
    getDailyOffer(): DailyOffer | null {
        return this.dailyOffer;
    }

    /**
     * Get time remaining until offer expires
     */
    getTimeRemaining(): { hours: number; minutes: number; seconds: number } | null {
        if (!this.dailyOffer) return null;

        const now = new Date().getTime();
        const expires = this.dailyOffer.expiresAt.getTime();
        const diff = expires - now;

        if (diff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
    }

    /**
     * Format time remaining as string
     */
    getTimeRemainingString(): string {
        const time = this.getTimeRemaining();
        if (!time) return '--:--:--';

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
    }

    /**
     * Purchase an item
     */
    purchase(itemId: string): { success: boolean; error?: string } {
        const item = this.dailyOffer?.items.find(i => i.id === itemId);
        if (!item) {
            return { success: false, error: 'Item not found' };
        }

        // Check limited quantity
        if (item.limitedQuantity && item.sold && item.sold >= item.limitedQuantity) {
            return { success: false, error: 'Sold out!' };
        }

        // TODO: Integrate with payment/currency system
        console.log(`[Shop] Purchasing: ${item.name} for ${item.price} ${item.currency}`);

        // Update sold count for limited items
        if (item.limitedQuantity) {
            item.sold = (item.sold || 0) + 1;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dailyOffer));
        }

        this.notifyListeners();
        return { success: true };
    }

    /**
     * Get stock remaining for limited items
     */
    getStockRemaining(itemId: string): number | null {
        const item = this.dailyOffer?.items.find(i => i.id === itemId);
        if (!item || !item.limitedQuantity) return null;
        return item.limitedQuantity - (item.sold || 0);
    }

    /**
     * Subscribe to changes
     */
    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(fn => fn());
    }

    /**
     * Cleanup
     */
    dispose(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.listeners.clear();
    }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: 'coins' | 'gems' | 'real'): string {
    if (currency === 'real') {
        return `$${(price / 100).toFixed(2)}`;
    }
    return `${price} ${currency === 'coins' ? '🪙' : '💎'}`;
}

/**
 * Get rarity color
 */
export function getRarityColor(rarity: ShopItem['rarity']): string {
    const colors = {
        common: '#9CA3AF',
        rare: '#3B82F6',
        epic: '#8B5CF6',
        legendary: '#F59E0B'
    };
    return colors[rarity];
}

// Singleton instance
export const shopManager = new ShopManager();
