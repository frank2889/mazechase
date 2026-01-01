/**
 * Daily Challenges System
 * EMMSOAI (David): Increase daily return motivation and player engagement
 * 
 * Features:
 * - 3 daily challenges that reset at midnight
 * - Progressive difficulty based on player level
 * - Small rewards to encourage returns without FOMO abuse
 */

export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    type: 'score' | 'collect' | 'survive' | 'games' | 'streak';
    target: number;
    progress: number;
    reward: ChallengeReward;
    completed: boolean;
    expiresAt: number;
}

export interface ChallengeReward {
    coins: number;
    xp?: number;
    badge?: string;
}

export interface DailyChallengeState {
    challenges: DailyChallenge[];
    lastRefresh: number;
    totalCompleted: number;
    currentStreak: number;
}

const STORAGE_KEY = 'mazechase_daily_challenges';
const REFRESH_HOUR = 0; // Midnight refresh

// Challenge templates - rotated daily
const CHALLENGE_TEMPLATES = [
    // Easy challenges (always include 1)
    { type: 'games', title: 'Speeldag', desc: 'Speel {n} games', min: 2, max: 3, coins: 25 },
    { type: 'collect', title: 'Pellet Verzamelaar', desc: 'Verzamel {n} pellets', min: 50, max: 100, coins: 30 },
    { type: 'score', title: 'Puntenjager', desc: 'Haal {n} punten in totaal', min: 500, max: 1000, coins: 35 },
    
    // Medium challenges (include 1-2)
    { type: 'score', title: 'High Scorer', desc: 'Haal {n} punten in 1 game', min: 200, max: 400, coins: 50 },
    { type: 'survive', title: 'Overlever', desc: 'Overleef {n} spoken ontmoetingen', min: 5, max: 10, coins: 45 },
    { type: 'collect', title: 'Power Collector', desc: 'Pak {n} power-ups', min: 3, max: 6, coins: 40 },
    
    // Hard challenges (include 0-1)
    { type: 'streak', title: 'Winnaar', desc: 'Win {n} games achter elkaar', min: 2, max: 3, coins: 100 },
    { type: 'score', title: 'Score Master', desc: 'Haal {n} punten in 1 game', min: 500, max: 800, coins: 75 },
] as const;

/**
 * Get today's date string for challenge generation seed
 */
function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

/**
 * Generate daily challenges for today
 */
export function generateDailyChallenges(playerLevel: number = 1): DailyChallenge[] {
    const todayKey = getTodayKey();
    const seed = todayKey.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    // Calculate midnight for expiry
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(REFRESH_HOUR, 0, 0, 0);
    const expiresAt = tomorrow.getTime();
    
    const challenges: DailyChallenge[] = [];
    
    // Always 1 easy challenge
    const easyTemplates = CHALLENGE_TEMPLATES.filter(t => t.coins <= 35);
    const easyIdx = seed % easyTemplates.length;
    const easy = easyTemplates[easyIdx]!;
    const easyTarget = easy.min + Math.floor((seed * 7) % (easy.max - easy.min + 1));
    
    challenges.push({
        id: `daily_easy_${todayKey}`,
        title: easy.title,
        description: easy.desc.replace('{n}', String(easyTarget)),
        type: easy.type as DailyChallenge['type'],
        target: easyTarget,
        progress: 0,
        reward: { coins: easy.coins, xp: easy.coins * 2 },
        completed: false,
        expiresAt
    });
    
    // 1 medium challenge
    const mediumTemplates = CHALLENGE_TEMPLATES.filter(t => t.coins > 35 && t.coins <= 60);
    const mediumIdx = (seed * 3) % mediumTemplates.length;
    const medium = mediumTemplates[mediumIdx]!;
    const mediumTarget = medium.min + Math.floor((seed * 11) % (medium.max - medium.min + 1));
    
    challenges.push({
        id: `daily_medium_${todayKey}`,
        title: medium.title,
        description: medium.desc.replace('{n}', String(mediumTarget)),
        type: medium.type as DailyChallenge['type'],
        target: mediumTarget,
        progress: 0,
        reward: { coins: medium.coins, xp: medium.coins * 2 },
        completed: false,
        expiresAt
    });
    
    // 1 hard challenge (only if player level >= 3)
    if (playerLevel >= 3) {
        const hardTemplates = CHALLENGE_TEMPLATES.filter(t => t.coins > 60);
        const hardIdx = (seed * 13) % hardTemplates.length;
        const hard = hardTemplates[hardIdx]!;
        const hardTarget = hard.min + Math.floor((seed * 17) % (hard.max - hard.min + 1));
        
        challenges.push({
            id: `daily_hard_${todayKey}`,
            title: '🔥 ' + hard.title,
            description: hard.desc.replace('{n}', String(hardTarget)),
            type: hard.type as DailyChallenge['type'],
            target: hardTarget,
            progress: 0,
            reward: { coins: hard.coins, xp: hard.coins * 2, badge: 'daily_hard' },
            completed: false,
            expiresAt
        });
    }
    
    return challenges;
}

/**
 * Load or generate today's challenges
 */
export function loadDailyChallenges(): DailyChallengeState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const state = JSON.parse(saved) as DailyChallengeState;
            
            // Check if challenges need refresh
            const now = Date.now();
            const firstChallenge = state.challenges[0];
            if (state.challenges.length > 0 && firstChallenge && firstChallenge.expiresAt > now) {
                return state;
            }
        }
    } catch (e) {
        console.error('Failed to load daily challenges:', e);
    }
    
    // Generate new challenges
    const challenges = generateDailyChallenges();
    const state: DailyChallengeState = {
        challenges,
        lastRefresh: Date.now(),
        totalCompleted: 0,
        currentStreak: 0
    };
    
    saveDailyChallenges(state);
    return state;
}

/**
 * Save challenge state
 */
export function saveDailyChallenges(state: DailyChallengeState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save daily challenges:', e);
    }
}

/**
 * Update challenge progress
 */
export function updateChallengeProgress(
    type: DailyChallenge['type'], 
    amount: number
): { challenge?: DailyChallenge; justCompleted: boolean } {
    const state = loadDailyChallenges();
    
    for (const challenge of state.challenges) {
        if (challenge.type === type && !challenge.completed) {
            challenge.progress = Math.min(challenge.progress + amount, challenge.target);
            
            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                state.totalCompleted++;
                
                saveDailyChallenges(state);
                return { challenge, justCompleted: true };
            }
            
            saveDailyChallenges(state);
            return { challenge, justCompleted: false };
        }
    }
    
    return { justCompleted: false };
}

/**
 * Get all challenges for display
 */
export function getDailyChallenges(): DailyChallenge[] {
    return loadDailyChallenges().challenges;
}

/**
 * Check if all daily challenges are completed
 */
export function allChallengesCompleted(): boolean {
    const challenges = getDailyChallenges();
    return challenges.every(c => c.completed);
}

/**
 * Get time until challenges refresh
 */
export function getTimeUntilRefresh(): { hours: number; minutes: number } {
    const challenges = getDailyChallenges();
    const firstChallenge = challenges[0];
    if (challenges.length === 0 || !firstChallenge) return { hours: 0, minutes: 0 };
    
    const remaining = firstChallenge.expiresAt - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
}
