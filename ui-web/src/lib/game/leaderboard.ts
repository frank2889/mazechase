/**
 * Leaderboard System - Sociale Ranking
 * 
 * AI Tester Suggestion (David - UX Researcher):
 * "Voeg een leaderboard toe met vriend vs globale filters.
 * Om sociale competitie te bevorderen."
 * 
 * Features:
 * - Global rankings
 * - Friends-only view
 * - Multiple categories
 * - Weekly/All-time filters
 * - Player rank display
 */

export type LeaderboardCategory = 
    | 'total_score'
    | 'wins'
    | 'pellets_collected'
    | 'chasers_evaded'
    | 'runners_caught'
    | 'playtime';

export type LeaderboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'alltime';
export type LeaderboardFilter = 'global' | 'friends';

export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    playerName: string;
    avatarUrl?: string;
    score: number;
    isFriend: boolean;
    isCurrentPlayer: boolean;
    tier?: PlayerTier;
}

export interface PlayerTier {
    name: string;
    color: string;
    minScore: number;
}

export interface LeaderboardData {
    category: LeaderboardCategory;
    timeframe: LeaderboardTimeframe;
    entries: LeaderboardEntry[];
    playerRank: number;
    playerScore: number;
    totalPlayers: number;
    lastUpdated: Date;
}

// Tier definitions
const PLAYER_TIERS: PlayerTier[] = [
    { name: 'Bronze', color: '#cd7f32', minScore: 0 },
    { name: 'Silver', color: '#c0c0c0', minScore: 1000 },
    { name: 'Gold', color: '#ffd700', minScore: 5000 },
    { name: 'Platinum', color: '#e5e4e2', minScore: 15000 },
    { name: 'Diamond', color: '#b9f2ff', minScore: 35000 },
    { name: 'Master', color: '#ff6b6b', minScore: 75000 },
    { name: 'Legend', color: '#9b59b6', minScore: 150000 }
];

const CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
    total_score: 'Total Score',
    wins: 'Victories',
    pellets_collected: 'Pellets Collected',
    chasers_evaded: 'Escapes',
    runners_caught: 'Catches',
    playtime: 'Play Time'
};

const TIMEFRAME_LABELS: Record<LeaderboardTimeframe, string> = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    alltime: 'All Time'
};

/**
 * LeaderboardManager - Handles leaderboard data and display
 */
export class LeaderboardManager {
    private cachedData: Map<string, LeaderboardData> = new Map();
    private _currentPlayerId: string = '';
    private _friendIds: Set<string> = new Set();
    private _isLoading: boolean = false;
    private onUpdateCallbacks: ((data: LeaderboardData) => void)[] = [];

    /** Get current player ID */
    get currentPlayerId(): string { return this._currentPlayerId; }
    /** Get friend IDs */
    get friendIds(): Set<string> { return this._friendIds; }
    /** Check if loading */
    get isLoading(): boolean { return this._isLoading; }

    constructor() {
        this.loadFriendsList();
    }

    /**
     * Initialize with player ID
     */
    setCurrentPlayer(playerId: string): void {
        this._currentPlayerId = playerId;
    }

    /**
     * Update friends list
     */
    setFriends(friendIds: string[]): void {
        this._friendIds = new Set(friendIds);
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(
        category: LeaderboardCategory,
        timeframe: LeaderboardTimeframe,
        filter: LeaderboardFilter = 'global',
        limit: number = 100
    ): Promise<LeaderboardData> {
        const cacheKey = `${category}_${timeframe}_${filter}`;
        const cached = this.cachedData.get(cacheKey);

        // Return cached if fresh (< 1 minute old)
        if (cached && Date.now() - cached.lastUpdated.getTime() < 60000) {
            return cached;
        }

        this._isLoading = true;

        try {
            // Fetch from API (mocked for now)
            const data = await this.fetchLeaderboardData(category, timeframe, filter, limit);
            this.cachedData.set(cacheKey, data);
            this.notifyUpdate(data);
            return data;
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * Get player's rank in a category
     */
    async getPlayerRank(
        category: LeaderboardCategory,
        timeframe: LeaderboardTimeframe
    ): Promise<{ rank: number; score: number; total: number }> {
        const data = await this.getLeaderboard(category, timeframe, 'global', 10);
        return {
            rank: data.playerRank,
            score: data.playerScore,
            total: data.totalPlayers
        };
    }

    /**
     * Get tier for a score
     */
    getTierForScore(score: number): PlayerTier {
        for (let i = PLAYER_TIERS.length - 1; i >= 0; i--) {
            const tier = PLAYER_TIERS[i];
            if (tier && score >= tier.minScore) {
                return tier;
            }
        }
        return PLAYER_TIERS[0]!;
    }

    /**
     * Get next tier info
     */
    getNextTier(score: number): { tier: PlayerTier; pointsNeeded: number } | null {
        const currentTier = this.getTierForScore(score);
        const currentIndex = PLAYER_TIERS.findIndex(t => t.name === currentTier.name);
        
        if (currentIndex < PLAYER_TIERS.length - 1) {
            const nextTier = PLAYER_TIERS[currentIndex + 1];
            if (nextTier) {
                return {
                    tier: nextTier,
                    pointsNeeded: nextTier.minScore - score
                };
            }
        }
        return null;
    }

    /**
     * Get all available categories
     */
    getCategories(): { id: LeaderboardCategory; label: string }[] {
        return Object.entries(CATEGORY_LABELS).map(([id, label]) => ({
            id: id as LeaderboardCategory,
            label
        }));
    }

    /**
     * Get all available timeframes
     */
    getTimeframes(): { id: LeaderboardTimeframe; label: string }[] {
        return Object.entries(TIMEFRAME_LABELS).map(([id, label]) => ({
            id: id as LeaderboardTimeframe,
            label
        }));
    }

    /**
     * Subscribe to updates
     */
    onUpdate(callback: (data: LeaderboardData) => void): () => void {
        this.onUpdateCallbacks.push(callback);
        return () => {
            this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Force refresh all cached data
     */
    async refreshAll(): Promise<void> {
        this.cachedData.clear();
    }

    /**
     * Format score for display
     */
    formatScore(score: number, category: LeaderboardCategory): string {
        if (category === 'playtime') {
            // Convert seconds to readable time
            const hours = Math.floor(score / 3600);
            const minutes = Math.floor((score % 3600) / 60);
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
        }

        // Format large numbers
        if (score >= 1000000) {
            return `${(score / 1000000).toFixed(1)}M`;
        }
        if (score >= 1000) {
            return `${(score / 1000).toFixed(1)}K`;
        }
        return score.toString();
    }

    /**
     * Get rank badge info
     */
    getRankBadge(rank: number): { icon: string; color: string } {
        switch (rank) {
            case 1:
                return { icon: '🥇', color: '#ffd700' };
            case 2:
                return { icon: '🥈', color: '#c0c0c0' };
            case 3:
                return { icon: '🥉', color: '#cd7f32' };
            default:
                if (rank <= 10) {
                    return { icon: '⭐', color: '#ffdd57' };
                }
                if (rank <= 100) {
                    return { icon: '💫', color: '#74b9ff' };
                }
                return { icon: '', color: '#888888' };
        }
    }

    // Private methods
    private async fetchLeaderboardData(
        category: LeaderboardCategory,
        timeframe: LeaderboardTimeframe,
        filter: LeaderboardFilter,
        limit: number
    ): Promise<LeaderboardData> {
        // In production, this would be an API call
        // For now, generate mock data
        const mockEntries = this.generateMockEntries(limit, filter === 'friends');
        
        // Find current player's rank
        const playerEntry = mockEntries.find(e => e.isCurrentPlayer);
        
        return {
            category,
            timeframe,
            entries: mockEntries.slice(0, limit),
            playerRank: playerEntry?.rank || 0,
            playerScore: playerEntry?.score || 0,
            totalPlayers: 10000,
            lastUpdated: new Date()
        };
    }

    private generateMockEntries(count: number, friendsOnly: boolean): LeaderboardEntry[] {
        const names = [
            'SpeedRunner', 'MazeKing', 'PelletPro', 'GhostHunter',
            'ChaseChamp', 'RunnerRex', 'SneakySnake', 'FastFox',
            'QuickQuack', 'DashMaster', 'NeonNinja', 'CyberRunner',
            'GridGhost', 'WallWalker', 'PathFinder', 'CornerKing'
        ];

        const entries: LeaderboardEntry[] = [];
        let baseScore = 100000;

        for (let i = 0; i < count; i++) {
            const isFriend = Math.random() < 0.2;
            const isCurrentPlayer = i === 15; // Player at rank 16

            if (friendsOnly && !isFriend && !isCurrentPlayer) continue;

            entries.push({
                rank: entries.length + 1,
                playerId: `player_${i}`,
                playerName: isCurrentPlayer ? 'You' : (names[i % names.length] ?? 'Player') + (i > 15 ? i : ''),
                score: baseScore,
                isFriend,
                isCurrentPlayer,
                tier: this.getTierForScore(baseScore)
            });

            baseScore = Math.floor(baseScore * 0.95);
        }

        return entries;
    }

    private loadFriendsList(): void {
        try {
            const stored = localStorage.getItem('mazechase_friends');
            if (stored) {
                this._friendIds = new Set(JSON.parse(stored));
            }
        } catch (e) {
            console.warn('[Leaderboard] Failed to load friends:', e);
        }
    }

    private notifyUpdate(data: LeaderboardData): void {
        this.onUpdateCallbacks.forEach(cb => cb(data));
    }
}

// Singleton
let leaderboardManager: LeaderboardManager | null = null;

export function getLeaderboardManager(): LeaderboardManager {
    if (!leaderboardManager) {
        leaderboardManager = new LeaderboardManager();
    }
    return leaderboardManager;
}
