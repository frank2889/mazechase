/**
 * Rewarded Ads Integration
 * 
 * AI Tester Suggestion (Marcus - Monetization Expert):
 * "Implement rewarded video ads post-round with relevant rewards.
 * Players opt-in to watch ads for bonus coins/gems - non-intrusive monetization."
 * 
 * Features:
 * - Post-game rewarded ads (2x coins option)
 * - Continue playing after loss
 * - Daily bonus multiplier ad
 * - Cooldown between ad watches
 */

export interface AdReward {
    type: 'coins' | 'gems' | 'continue' | 'multiplier' | 'chest';
    amount?: number;
    multiplier?: number;
    duration?: number; // in seconds
}

export interface AdConfig {
    provider: 'admob' | 'unity' | 'ironsource' | 'mock';
    rewardedVideoId: string;
    testMode: boolean;
}

export interface AdState {
    isLoading: boolean;
    isReady: boolean;
    isShowing: boolean;
    lastWatchTime: number;
    watchesToday: number;
    cooldownEndTime: number;
}

// Constants
const MAX_ADS_PER_DAY = 10;
const COOLDOWN_BETWEEN_ADS = 60 * 1000; // 1 minute
const STORAGE_KEY = 'mazechase_ads';

/**
 * Mock Ad SDK for development/testing
 */
class MockAdSDK {
    private onRewardCallback?: (reward: AdReward) => void;
    private onCloseCallback?: () => void;
    private onErrorCallback?: (error: string) => void;
    
    async initialize(): Promise<void> {
        console.log('[MockAds] Initialized');
    }
    
    async loadRewardedVideo(): Promise<boolean> {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[MockAds] Rewarded video loaded');
        return true;
    }
    
    async showRewardedVideo(): Promise<void> {
        console.log('[MockAds] Showing mock rewarded video...');
        
        // Simulate video duration
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 95% chance of successful watch
        if (Math.random() < 0.95) {
            console.log('[MockAds] Video completed, granting reward');
            this.onRewardCallback?.({ type: 'coins', amount: 50 });
        } else {
            console.log('[MockAds] Video skipped');
        }
        
        this.onCloseCallback?.();
    }
    
    onReward(callback: (reward: AdReward) => void): void {
        this.onRewardCallback = callback;
    }
    
    onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }
    
    onError(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    /** Trigger error callback if set */
    triggerError(error: string): void {
        this.onErrorCallback?.(error);
    }
}

/**
 * Ads Manager - Handles rewarded video ads
 */
export class AdsManager {
    private _config: AdConfig;
    private state: AdState;
    private sdk: MockAdSDK; // Replace with real SDK in production
    private onRewardCallbacks: Array<(reward: AdReward) => void> = [];

    /** Get current ad configuration */
    getConfig(): AdConfig {
        return this._config;
    }
    
    constructor(config: Partial<AdConfig> = {}) {
        this._config = {
            provider: 'mock',
            rewardedVideoId: 'ca-app-pub-xxx/yyy',
            testMode: true,
            ...config
        };
        
        this.state = this.loadState();
        this.sdk = new MockAdSDK();
        
        this.setupSDKCallbacks();
    }
    
    private loadState(): AdState {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Reset daily counter if new day
                const today = new Date().toDateString();
                if (parsed.lastDate !== today) {
                    parsed.watchesToday = 0;
                    parsed.lastDate = today;
                }
                
                return parsed;
            }
        } catch (e) {
            console.warn('[Ads] Failed to load state:', e);
        }
        
        return {
            isLoading: false,
            isReady: false,
            isShowing: false,
            lastWatchTime: 0,
            watchesToday: 0,
            cooldownEndTime: 0
        };
    }
    
    private saveState(): void {
        try {
            const toStore = {
                ...this.state,
                lastDate: new Date().toDateString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
            console.warn('[Ads] Failed to save state:', e);
        }
    }
    
    private setupSDKCallbacks(): void {
        this.sdk.onReward((reward) => {
            console.log('[Ads] Reward received:', reward);
            this.onRewardCallbacks.forEach(cb => cb(reward));
        });
        
        this.sdk.onClose(() => {
            this.state.isShowing = false;
            this.preloadNextAd();
        });
        
        this.sdk.onError((error) => {
            console.error('[Ads] Error:', error);
            this.state.isLoading = false;
            this.state.isReady = false;
        });
    }
    
    /**
     * Initialize the ads system
     */
    async initialize(): Promise<void> {
        await this.sdk.initialize();
        await this.preloadNextAd();
    }
    
    /**
     * Preload the next rewarded video
     */
    private async preloadNextAd(): Promise<void> {
        if (this.state.isLoading || this.state.isReady) return;
        
        this.state.isLoading = true;
        
        try {
            const success = await this.sdk.loadRewardedVideo();
            this.state.isReady = success;
        } catch (e) {
            console.warn('[Ads] Failed to preload:', e);
            this.state.isReady = false;
        }
        
        this.state.isLoading = false;
    }
    
    /**
     * Check if user can watch an ad right now
     */
    canWatchAd(): { allowed: boolean; reason?: string; cooldownRemaining?: number } {
        const now = Date.now();
        
        // Check daily limit
        if (this.state.watchesToday >= MAX_ADS_PER_DAY) {
            return { 
                allowed: false, 
                reason: 'Daily limit reached. Come back tomorrow!' 
            };
        }
        
        // Check cooldown
        if (now < this.state.cooldownEndTime) {
            return { 
                allowed: false, 
                reason: 'Please wait before watching another ad',
                cooldownRemaining: Math.ceil((this.state.cooldownEndTime - now) / 1000)
            };
        }
        
        // Check if ad is ready
        if (!this.state.isReady) {
            return { 
                allowed: false, 
                reason: 'Ad is still loading...' 
            };
        }
        
        return { allowed: true };
    }
    
    /**
     * Show a rewarded video ad
     */
    async showRewardedAd(rewardType: AdReward['type'], rewardAmount?: number): Promise<boolean> {
        const check = this.canWatchAd();
        if (!check.allowed) {
            console.warn('[Ads] Cannot watch ad:', check.reason);
            return false;
        }
        
        this.state.isShowing = true;
        
        // Set up reward based on type
        const reward: AdReward = { type: rewardType };
        switch (rewardType) {
            case 'coins':
                reward.amount = rewardAmount || 50;
                break;
            case 'gems':
                reward.amount = rewardAmount || 5;
                break;
            case 'multiplier':
                reward.multiplier = 2;
                reward.duration = 300; // 5 minutes
                break;
            case 'continue':
                reward.amount = 1; // 1 continue
                break;
        }
        
        try {
            await this.sdk.showRewardedVideo();
            
            // Update state after successful watch
            this.state.lastWatchTime = Date.now();
            this.state.watchesToday++;
            this.state.cooldownEndTime = Date.now() + COOLDOWN_BETWEEN_ADS;
            this.state.isReady = false;
            
            this.saveState();
            
            return true;
        } catch (e) {
            console.error('[Ads] Failed to show ad:', e);
            this.state.isShowing = false;
            return false;
        }
    }
    
    /**
     * Register callback for when rewards are granted
     */
    onReward(callback: (reward: AdReward) => void): () => void {
        this.onRewardCallbacks.push(callback);
        return () => {
            const index = this.onRewardCallbacks.indexOf(callback);
            if (index > -1) this.onRewardCallbacks.splice(index, 1);
        };
    }
    
    /**
     * Get current ads state for UI
     */
    getState(): AdState {
        return { ...this.state };
    }
    
    /**
     * Get number of ads remaining today
     */
    getRemainingAdsToday(): number {
        return Math.max(0, MAX_ADS_PER_DAY - this.state.watchesToday);
    }
}

// Singleton
let adsManager: AdsManager | null = null;

export function getAdsManager(): AdsManager {
    if (!adsManager) {
        adsManager = new AdsManager();
    }
    return adsManager;
}

/**
 * Ad opportunity types for different game moments
 */
export const AD_OPPORTUNITIES = {
    // After losing a game - offer to continue
    CONTINUE_AFTER_DEATH: {
        type: 'continue' as const,
        title: 'Keep Playing!',
        description: 'Watch a short video to continue from where you left off',
        buttonText: '▶ Watch & Continue'
    },
    
    // After winning - double rewards
    DOUBLE_REWARDS: {
        type: 'coins' as const,
        title: 'Double Your Coins!',
        description: 'Watch a short video to 2x your coins from this round',
        buttonText: '▶ Watch & Double'
    },
    
    // Daily bonus
    DAILY_BONUS: {
        type: 'gems' as const,
        title: 'Daily Bonus!',
        description: 'Watch to claim your daily gem bonus',
        buttonText: '▶ Claim 10 Gems'
    },
    
    // Coin boost
    COIN_BOOST: {
        type: 'multiplier' as const,
        title: '2x Coin Boost',
        description: 'Watch a video for 5 minutes of double coins',
        buttonText: '▶ Activate Boost'
    }
} as const;
