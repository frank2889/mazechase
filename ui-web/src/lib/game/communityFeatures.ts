/**
 * Community Features - Weekly Challenges & Leaderboard Integration
 * EMMSOAI Suggestion (Ava - Indie Game Market Analyst): 
 * "Introduce weekly challenges with leaderboard integration to boost engagement"
 */

// Simple reactive store (no Svelte dependency)
type Subscriber<T> = (value: T) => void;
type Unsubscriber = () => void;

function writable<T>(initial: T): { subscribe: (fn: Subscriber<T>) => Unsubscriber; set: (value: T) => void; update: (fn: (current: T) => T) => void; } {
    let value = initial;
    const subscribers = new Set<Subscriber<T>>();
    return {
        subscribe(fn: Subscriber<T>): Unsubscriber {
            subscribers.add(fn);
            fn(value);
            return () => subscribers.delete(fn);
        },
        set(newValue: T): void {
            value = newValue;
            subscribers.forEach(fn => fn(value));
        },
        update(fn: (current: T) => T): void {
            value = fn(value);
            subscribers.forEach(f => f(value));
        }
    };
}

function derived<T, R>(store: { subscribe: (fn: Subscriber<T>) => Unsubscriber }, fn: (value: T) => R): { subscribe: (sub: Subscriber<R>) => Unsubscriber } {
    return {
        subscribe(sub: Subscriber<R>): Unsubscriber {
            return store.subscribe((val: T) => sub(fn(val)));
        }
    };
}

function get<T>(store: { subscribe: (fn: Subscriber<T>) => Unsubscriber }): T {
    let value: T;
    store.subscribe((v: T) => { value = v; })();
    return value!;
}

// Challenge Types
export type ChallengeType = 
    | 'collect_pellets'      // Collect X pellets
    | 'survive_time'         // Survive for X seconds
    | 'catch_runners'        // Catch X runners as chaser
    | 'use_powerups'         // Use X power-ups
    | 'win_games'            // Win X games
    | 'play_games'           // Play X games
    | 'speed_run'            // Complete level in under X seconds
    | 'perfect_clear'        // Clear all pellets without dying
    | 'streak'               // Win X games in a row
    | 'social';              // Invite X friends

export interface Challenge {
    id: string;
    type: ChallengeType;
    title: string;
    description: string;
    target: number;
    progress: number;
    reward: ChallengeReward;
    difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
    expiresAt: Date;
    completedAt?: Date;
    isWeekly: boolean;
}

export interface ChallengeReward {
    coins: number;
    xp: number;
    item?: string;
    badge?: string;
}

export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    playerName: string;
    avatar?: string;
    score: number;
    gamesPlayed: number;
    winRate: number;
    isFriend: boolean;
    isCurrentPlayer: boolean;
}

export interface CommunityState {
    weeklyChallenges: Challenge[];
    dailyChallenges: Challenge[];
    leaderboard: LeaderboardEntry[];
    friendsLeaderboard: LeaderboardEntry[];
    lastUpdated: Date | null;
    isLoading: boolean;
}

// Store
const initialState: CommunityState = {
    weeklyChallenges: [],
    dailyChallenges: [],
    leaderboard: [],
    friendsLeaderboard: [],
    lastUpdated: null,
    isLoading: false
};

export const communityStore = writable<CommunityState>(initialState);

// Challenge generation
const WEEKLY_CHALLENGES: Omit<Challenge, 'id' | 'progress' | 'expiresAt' | 'completedAt'>[] = [
    {
        type: 'collect_pellets',
        title: '🟡 Pellet Collector',
        description: 'Verzamel 1000 pellets deze week',
        target: 1000,
        reward: { coins: 500, xp: 200 },
        difficulty: 'easy',
        isWeekly: true
    },
    {
        type: 'win_games',
        title: '🏆 Kampioen',
        description: 'Win 25 games deze week',
        target: 25,
        reward: { coins: 1000, xp: 500, badge: 'weekly_champion' },
        difficulty: 'medium',
        isWeekly: true
    },
    {
        type: 'catch_runners',
        title: '👻 Ghost Hunter',
        description: 'Vang 50 runners als chaser',
        target: 50,
        reward: { coins: 750, xp: 300 },
        difficulty: 'medium',
        isWeekly: true
    },
    {
        type: 'streak',
        title: '🔥 Win Streak',
        description: 'Win 5 games op rij',
        target: 5,
        reward: { coins: 2000, xp: 800, item: 'streak_trail' },
        difficulty: 'hard',
        isWeekly: true
    },
    {
        type: 'perfect_clear',
        title: '✨ Perfect Run',
        description: 'Clear een level zonder gepakt te worden',
        target: 1,
        reward: { coins: 500, xp: 150 },
        difficulty: 'medium',
        isWeekly: true
    },
    {
        type: 'social',
        title: '👥 Community Builder',
        description: 'Speel met 10 verschillende vrienden',
        target: 10,
        reward: { coins: 1500, xp: 600, badge: 'social_butterfly' },
        difficulty: 'medium',
        isWeekly: true
    }
];

const DAILY_CHALLENGES: Omit<Challenge, 'id' | 'progress' | 'expiresAt' | 'completedAt'>[] = [
    {
        type: 'play_games',
        title: '🎮 Daily Player',
        description: 'Speel 3 games vandaag',
        target: 3,
        reward: { coins: 50, xp: 25 },
        difficulty: 'easy',
        isWeekly: false
    },
    {
        type: 'collect_pellets',
        title: '🟡 Snelle Verzamelaar',
        description: 'Verzamel 100 pellets vandaag',
        target: 100,
        reward: { coins: 75, xp: 35 },
        difficulty: 'easy',
        isWeekly: false
    },
    {
        type: 'use_powerups',
        title: '⚡ Power User',
        description: 'Gebruik 5 power-ups vandaag',
        target: 5,
        reward: { coins: 100, xp: 50 },
        difficulty: 'easy',
        isWeekly: false
    },
    {
        type: 'win_games',
        title: '🏅 Dagelijkse Winnaar',
        description: 'Win 1 game vandaag',
        target: 1,
        reward: { coins: 150, xp: 75 },
        difficulty: 'easy',
        isWeekly: false
    }
];

/**
 * Generate challenges for current week/day
 */
export function generateChallenges(): { weekly: Challenge[], daily: Challenge[] } {
    const now = new Date();
    
    // Weekly: expires next Sunday midnight
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(23, 59, 59, 999);
    
    // Daily: expires at midnight
    const midnight = new Date(now);
    midnight.setDate(now.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    
    // Select 3 random weekly challenges
    const shuffledWeekly = [...WEEKLY_CHALLENGES].sort(() => Math.random() - 0.5);
    const weekly: Challenge[] = shuffledWeekly.slice(0, 3).map((c, i) => ({
        ...c,
        id: `weekly_${now.getFullYear()}_${getWeekNumber(now)}_${i}`,
        progress: 0,
        expiresAt: nextSunday
    }));
    
    // Select 2 random daily challenges
    const shuffledDaily = [...DAILY_CHALLENGES].sort(() => Math.random() - 0.5);
    const daily: Challenge[] = shuffledDaily.slice(0, 2).map((c, i) => ({
        ...c,
        id: `daily_${now.toISOString().split('T')[0]}_${i}`,
        progress: 0,
        expiresAt: midnight
    }));
    
    return { weekly, daily };
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Update challenge progress
 */
export function updateChallengeProgress(type: ChallengeType, amount: number = 1): void {
    communityStore.update(state => {
        const updateChallenge = (challenge: Challenge): Challenge => {
            if (challenge.type !== type || challenge.completedAt) return challenge;
            
            const newProgress = Math.min(challenge.progress + amount, challenge.target);
            const completed = newProgress >= challenge.target;
            
            return {
                ...challenge,
                progress: newProgress,
                completedAt: completed ? new Date() : undefined
            };
        };
        
        return {
            ...state,
            weeklyChallenges: state.weeklyChallenges.map(updateChallenge),
            dailyChallenges: state.dailyChallenges.map(updateChallenge)
        };
    });
}

/**
 * Claim challenge reward
 */
export function claimChallengeReward(challengeId: string): ChallengeReward | null {
    const state = get(communityStore);
    const allChallenges = [...state.weeklyChallenges, ...state.dailyChallenges];
    const challenge = allChallenges.find(c => c.id === challengeId);
    
    if (!challenge || !challenge.completedAt) return null;
    
    // In real implementation: send to server, update player inventory
    console.log(`🎁 Claimed reward for ${challenge.title}:`, challenge.reward);
    
    return challenge.reward;
}

/**
 * Fetch leaderboard from server
 */
export async function fetchLeaderboard(type: 'global' | 'friends' | 'weekly' = 'global'): Promise<void> {
    communityStore.update(s => ({ ...s, isLoading: true }));
    
    try {
        // Mock data - in real implementation: fetch from API
        const mockLeaderboard: LeaderboardEntry[] = [
            { rank: 1, playerId: '1', playerName: 'ProPlayer99', score: 15000, gamesPlayed: 120, winRate: 0.85, isFriend: false, isCurrentPlayer: false },
            { rank: 2, playerId: '2', playerName: 'MazeKing', score: 14500, gamesPlayed: 98, winRate: 0.82, isFriend: true, isCurrentPlayer: false },
            { rank: 3, playerId: '3', playerName: 'SpeedRunner', score: 13200, gamesPlayed: 85, winRate: 0.78, isFriend: false, isCurrentPlayer: false },
            { rank: 4, playerId: '4', playerName: 'GhostHunter', score: 12800, gamesPlayed: 110, winRate: 0.72, isFriend: true, isCurrentPlayer: false },
            { rank: 5, playerId: 'current', playerName: 'You', score: 8500, gamesPlayed: 45, winRate: 0.65, isFriend: false, isCurrentPlayer: true },
        ];
        
        communityStore.update(s => ({
            ...s,
            leaderboard: type === 'friends' ? mockLeaderboard.filter(e => e.isFriend || e.isCurrentPlayer) : mockLeaderboard,
            lastUpdated: new Date(),
            isLoading: false
        }));
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        communityStore.update(s => ({ ...s, isLoading: false }));
    }
}

/**
 * Initialize community features
 */
export function initializeCommunityFeatures(): void {
    const { weekly, daily } = generateChallenges();
    
    communityStore.set({
        weeklyChallenges: weekly,
        dailyChallenges: daily,
        leaderboard: [],
        friendsLeaderboard: [],
        lastUpdated: new Date(),
        isLoading: false
    });
    
    // Fetch leaderboard
    fetchLeaderboard();
    
    console.log('🌍 Community features initialized');
    console.log(`📋 Weekly challenges: ${weekly.length}`);
    console.log(`📋 Daily challenges: ${daily.length}`);
}

// Derived stores
export const activeWeeklyChallenges = derived(communityStore, $s => 
    $s.weeklyChallenges.filter(c => !c.completedAt && new Date() < c.expiresAt)
);

export const activeDailyChallenges = derived(communityStore, $s =>
    $s.dailyChallenges.filter(c => !c.completedAt && new Date() < c.expiresAt)
);

export const completedChallenges = derived(communityStore, $s => [
    ...$s.weeklyChallenges.filter(c => c.completedAt),
    ...$s.dailyChallenges.filter(c => c.completedAt)
]);

export const friendsOnLeaderboard = derived(communityStore, $s =>
    $s.leaderboard.filter(e => e.isFriend)
);
