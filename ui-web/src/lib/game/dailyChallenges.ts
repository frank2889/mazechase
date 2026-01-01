/**
 * Daily Challenge System - Based on David's UX/Retention recommendations
 * Implements the Hook Model: Trigger -> Action -> Variable Reward -> Investment
 */

export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    target: number;
    current: number;
    reward: number;
    type: 'pellets' | 'wins' | 'games' | 'powerups' | 'eliminations' | 'streak';
    expiresAt: Date;
}

export interface DailyProgress {
    date: string; // YYYY-MM-DD
    challenges: DailyChallenge[];
    streakDays: number;
    totalBonusEarned: number;
}

// Challenge templates - rotates daily
const CHALLENGE_TEMPLATES: Omit<DailyChallenge, 'id' | 'current' | 'expiresAt'>[] = [
    // Easy challenges
    { title: 'Pellet Collector', description: 'Collect 50 pellets', icon: '🟡', target: 50, reward: 100, type: 'pellets' },
    { title: 'Game On!', description: 'Play 3 games', icon: '🎮', target: 3, reward: 75, type: 'games' },
    { title: 'Power Player', description: 'Use 5 power-ups', icon: '⚡', target: 5, reward: 100, type: 'powerups' },
    
    // Medium challenges
    { title: 'Pellet Master', description: 'Collect 100 pellets', icon: '🏆', target: 100, reward: 200, type: 'pellets' },
    { title: 'Winner', description: 'Win 2 games', icon: '👑', target: 2, reward: 250, type: 'wins' },
    { title: 'Hunter', description: 'Eliminate 3 players', icon: '🔴', target: 3, reward: 200, type: 'eliminations' },
    
    // Hard challenges
    { title: 'Pellet Legend', description: 'Collect 200 pellets', icon: '⭐', target: 200, reward: 400, type: 'pellets' },
    { title: 'Marathon', description: 'Play 10 games', icon: '🏃', target: 10, reward: 350, type: 'games' },
    { title: 'Streak Master', description: 'Get a 5x combo', icon: '🔥', target: 5, reward: 300, type: 'streak' },
];

// Streak rewards
const STREAK_REWARDS = [
    { days: 1, bonus: 50, message: '1 day streak! 🎉' },
    { days: 3, bonus: 150, message: '3 day streak! 🔥' },
    { days: 7, bonus: 500, message: 'Week streak! 🏆' },
    { days: 14, bonus: 1000, message: '2 week streak! ⭐' },
    { days: 30, bonus: 2500, message: 'Month streak! 👑' },
];

const STORAGE_KEY = 'mazechase_daily_progress';

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get end of day timestamp
 */
function getEndOfDay(): Date {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
}

/**
 * Generate a deterministic seed from date for consistent daily challenges
 */
function dateToSeed(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        const char = dateStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Pick N challenges for today based on seed
 */
function pickDailyChallenges(count: number = 3): DailyChallenge[] {
    const today = getTodayString();
    const seed = dateToSeed(today);
    const expiresAt = getEndOfDay();
    
    // Shuffle based on seed
    const shuffled = [...CHALLENGE_TEMPLATES].sort((a, b) => {
        const aHash = dateToSeed(today + a.title);
        const bHash = dateToSeed(today + b.title);
        return aHash - bHash;
    });
    
    // Pick first N
    return shuffled.slice(0, count).map((template, index) => ({
        ...template,
        id: `${today}-${index}`,
        current: 0,
        expiresAt,
    }));
}

/**
 * Load progress from localStorage
 */
export function loadDailyProgress(): DailyProgress {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const progress = JSON.parse(stored) as DailyProgress;
            
            // Check if it's still today
            if (progress.date === getTodayString()) {
                // Restore Date objects
                progress.challenges = progress.challenges.map(c => ({
                    ...c,
                    expiresAt: new Date(c.expiresAt),
                }));
                return progress;
            }
            
            // New day - check streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const streakContinues = progress.date === yesterdayStr;
            
            return {
                date: getTodayString(),
                challenges: pickDailyChallenges(3),
                streakDays: streakContinues ? progress.streakDays + 1 : 1,
                totalBonusEarned: progress.totalBonusEarned,
            };
        }
    } catch (e) {
        console.warn('Failed to load daily progress:', e);
    }
    
    // First time or error - start fresh
    return {
        date: getTodayString(),
        challenges: pickDailyChallenges(3),
        streakDays: 1,
        totalBonusEarned: 0,
    };
}

/**
 * Save progress to localStorage
 */
export function saveDailyProgress(progress: DailyProgress): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.warn('Failed to save daily progress:', e);
    }
}

/**
 * Update challenge progress based on game events
 */
export function updateChallengeProgress(
    progress: DailyProgress,
    event: {
        type: DailyChallenge['type'];
        amount: number;
    }
): { progress: DailyProgress; completed: DailyChallenge[] } {
    const completed: DailyChallenge[] = [];
    
    const updatedChallenges = progress.challenges.map(challenge => {
        if (challenge.type !== event.type) return challenge;
        
        const wasComplete = challenge.current >= challenge.target;
        const newCurrent = Math.min(challenge.current + event.amount, challenge.target);
        const isNowComplete = newCurrent >= challenge.target;
        
        if (!wasComplete && isNowComplete) {
            completed.push({ ...challenge, current: newCurrent });
        }
        
        return { ...challenge, current: newCurrent };
    });
    
    // Calculate bonus from completed challenges
    const bonusEarned = completed.reduce((sum, c) => sum + c.reward, 0);
    
    const newProgress: DailyProgress = {
        ...progress,
        challenges: updatedChallenges,
        totalBonusEarned: progress.totalBonusEarned + bonusEarned,
    };
    
    saveDailyProgress(newProgress);
    
    return { progress: newProgress, completed };
}

/**
 * Get streak bonus for current streak
 */
export function getStreakBonus(streakDays: number): { bonus: number; message: string } | null {
    // Find highest applicable streak reward
    const applicable = STREAK_REWARDS.filter(r => r.days <= streakDays);
    if (applicable.length === 0) return null;
    
    const highest = applicable[applicable.length - 1];
    
    // Only show if exactly hit this milestone
    if (streakDays === highest.days) {
        return highest;
    }
    
    return null;
}

/**
 * Get time remaining until daily reset
 */
export function getTimeUntilReset(): { hours: number; minutes: number } {
    const now = new Date();
    const endOfDay = getEndOfDay();
    const diff = endOfDay.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
}

/**
 * Check if all daily challenges are complete
 */
export function allChallengesComplete(progress: DailyProgress): boolean {
    return progress.challenges.every(c => c.current >= c.target);
}
