/**
 * Friend Invite System - Refer friends and earn rewards
 * 
 * Based on Ava's viral growth recommendations:
 * - Incentivize sharing
 * - Track referrals
 * - Reward both inviter and invitee
 */

export interface ReferralCode {
    code: string;
    createdAt: string;
    userId: string;
}

export interface ReferralStats {
    code: string;
    totalInvites: number;
    successfulInvites: number; // Friends who played at least 1 game
    pendingInvites: number;
    coinsEarned: number;
}

export interface ReferralReward {
    milestone: number; // Number of successful invites
    reward: number;
    name: string;
    icon: string;
    claimed: boolean;
}

const REFERRAL_REWARDS: Omit<ReferralReward, 'claimed'>[] = [
    { milestone: 1, reward: 100, name: 'Eerste Vriend', icon: '👋' },
    { milestone: 3, reward: 300, name: 'Kleine Crew', icon: '👥' },
    { milestone: 5, reward: 500, name: 'Squad Leader', icon: '🎖️' },
    { milestone: 10, reward: 1000, name: 'Party Host', icon: '🎉' },
    { milestone: 25, reward: 2500, name: 'Community Builder', icon: '🏗️' },
    { milestone: 50, reward: 5000, name: 'Influencer', icon: '⭐' },
    { milestone: 100, reward: 10000, name: 'MazeChase Ambassador', icon: '👑' },
];

const STORAGE_KEY = 'mazechase_referral';
const USED_REFERRAL_KEY = 'mazechase_used_referral';

/**
 * Generate a unique referral code for the user
 */
export function generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MC-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Get or create the user's referral code
 */
export function getReferralCode(): ReferralCode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.code) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Failed to load referral code:', e);
    }
    
    // Generate new code
    const newCode: ReferralCode = {
        code: generateReferralCode(),
        createdAt: new Date().toISOString(),
        userId: localStorage.getItem('mazechase_user_id') || 'unknown',
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCode));
    return newCode;
}

/**
 * Get referral statistics
 */
export function getReferralStats(): ReferralStats {
    const referralData = getReferralCode();
    
    // In a real app, this would come from the server
    // For now, we use localStorage to simulate
    const statsKey = `${STORAGE_KEY}_stats`;
    try {
        const stored = localStorage.getItem(statsKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load referral stats:', e);
    }
    
    return {
        code: referralData.code,
        totalInvites: 0,
        successfulInvites: 0,
        pendingInvites: 0,
        coinsEarned: 0,
    };
}

/**
 * Get referral rewards with claim status
 */
export function getReferralRewards(): ReferralReward[] {
    const claimedKey = `${STORAGE_KEY}_claimed`;
    
    let claimed: number[] = [];
    try {
        const stored = localStorage.getItem(claimedKey);
        if (stored) {
            claimed = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load claimed rewards:', e);
    }
    
    return REFERRAL_REWARDS.map(reward => ({
        ...reward,
        claimed: claimed.includes(reward.milestone),
    }));
}

/**
 * Claim a referral reward
 */
export function claimReferralReward(milestone: number): { success: boolean; reward?: number } {
    const stats = getReferralStats();
    const rewards = getReferralRewards();
    
    const reward = rewards.find(r => r.milestone === milestone);
    if (!reward) {
        return { success: false };
    }
    
    if (reward.claimed) {
        return { success: false };
    }
    
    if (stats.successfulInvites < milestone) {
        return { success: false };
    }
    
    // Mark as claimed
    const claimedKey = `${STORAGE_KEY}_claimed`;
    let claimed: number[] = [];
    try {
        const stored = localStorage.getItem(claimedKey);
        if (stored) {
            claimed = JSON.parse(stored);
        }
    } catch (e) {}
    
    claimed.push(milestone);
    localStorage.setItem(claimedKey, JSON.stringify(claimed));
    
    // Update stats
    const statsKey = `${STORAGE_KEY}_stats`;
    const newStats = {
        ...stats,
        coinsEarned: stats.coinsEarned + reward.reward,
    };
    localStorage.setItem(statsKey, JSON.stringify(newStats));
    
    return { success: true, reward: reward.reward };
}

/**
 * Generate invite link with referral code
 */
export function getInviteLink(): string {
    const referralData = getReferralCode();
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${referralData.code}`;
}

/**
 * Generate invite message for sharing
 */
export function getInviteMessage(): string {
    const code = getReferralCode().code;
    return `🎮 Hey! Speel je mee met MazeChase? 

Het is een super leuk multiplayer doolhof spel. Gebruik mijn code ${code} en we krijgen allebei 50 coins! 🎁

${getInviteLink()}

#MazeChase`;
}

/**
 * Check if user came via referral and apply bonus
 */
export function checkAndApplyReferralBonus(): { applied: boolean; bonus?: number; referrer?: string } {
    // Check if already used a referral
    if (localStorage.getItem(USED_REFERRAL_KEY)) {
        return { applied: false };
    }
    
    // Check URL for referral code
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    if (!refCode || !refCode.startsWith('MC-')) {
        return { applied: false };
    }
    
    // Don't use own referral code
    const ownCode = getReferralCode().code;
    if (refCode === ownCode) {
        return { applied: false };
    }
    
    // Apply bonus
    localStorage.setItem(USED_REFERRAL_KEY, JSON.stringify({
        code: refCode,
        appliedAt: new Date().toISOString(),
    }));
    
    // Remove ref from URL to prevent reapplying
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('ref');
    window.history.replaceState({}, '', newUrl.toString());
    
    return { applied: true, bonus: 50, referrer: refCode };
}

/**
 * Share invite via different platforms
 */
export async function shareInvite(platform: 'whatsapp' | 'telegram' | 'copy' | 'native'): Promise<boolean> {
    const message = getInviteMessage();
    const link = getInviteLink();
    
    switch (platform) {
        case 'whatsapp':
            window.open(
                `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
                '_blank'
            );
            return true;
        
        case 'telegram':
            window.open(
                `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
                '_blank'
            );
            return true;
        
        case 'copy':
            try {
                await navigator.clipboard.writeText(message);
                return true;
            } catch (e) {
                console.error('Failed to copy:', e);
                return false;
            }
        
        case 'native':
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Speel MazeChase!',
                        text: message,
                        url: link,
                    });
                    return true;
                } catch (e) {
                    return false;
                }
            }
            return false;
    }
}
