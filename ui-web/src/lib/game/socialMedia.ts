/**
 * Social Media & Viral Sharing System
 * 
 * AI Tester Suggestion (Ava - Indie Game Market Analyst):
 * "Ontwikkel een campagne gericht op meme-momenten en influencer samenwerking.
 * Make it easy for players to share epic/funny moments!"
 * 
 * Features:
 * - Automatic highlight detection (close calls, multi-kills, etc.)
 * - One-tap sharing to social platforms
 * - Shareable replay clips
 * - Achievement badges for sharing
 */

export interface ShareableHighlight {
    id: string;
    type: HighlightType;
    timestamp: number;
    score: number;
    description: string;
    imageData?: string; // Base64 screenshot
    videoUrl?: string;  // Short clip URL
    gameMode: string;
    playerName: string;
}

export type HighlightType = 
    | 'close_call'      // Escaped chaser by 1 tile
    | 'multi_eat'       // Ate 3+ chasers in power mode
    | 'perfect_round'   // No hits taken
    | 'comeback'        // Recovered from low position to win
    | 'speed_run'       // Completed level super fast
    | 'high_score'      // New personal/global best
    | 'lucky_escape'    // Multiple chasers nearby escape
    | 'power_chain'     // Chained power-ups
    | 'clutch_win';     // Won in final seconds

interface ShareConfig {
    platforms: SharePlatform[];
    hashTags: string[];
    baseUrl: string;
    appName: string;
}

type SharePlatform = 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'discord' | 'copy';

const DEFAULT_CONFIG: ShareConfig = {
    platforms: ['twitter', 'discord', 'copy'],
    hashTags: ['MazeChase', 'IndieGame', 'Gaming'],
    baseUrl: 'https://mazechase.game',
    appName: 'MazeChase'
};

// Meme-worthy moments detector thresholds
const HIGHLIGHT_THRESHOLDS = {
    closeCallDistance: 1.5, // Tiles
    multiEatCount: 3,
    comebackPositionDiff: 3, // Places gained
    speedRunBonus: 0.7, // Complete in 70% of average time
    luckyEscapeChasers: 3 // Nearby chasers escaped
};

/**
 * Highlight Detector - Identifies share-worthy moments
 */
export class HighlightDetector {
    private recentEvents: GameEvent[] = [];
    private highlights: ShareableHighlight[] = [];
    private onHighlightCallback?: (highlight: ShareableHighlight) => void;
    private playerName: string = 'Player';

    constructor(playerName?: string) {
        if (playerName) this.playerName = playerName;
    }

    /**
     * Feed game events to detect highlights
     */
    recordEvent(event: GameEvent): void {
        this.recentEvents.push(event);
        
        // Keep only recent events (last 30 seconds)
        const cutoff = Date.now() - 30000;
        this.recentEvents = this.recentEvents.filter(e => e.timestamp > cutoff);
        
        // Check for highlight conditions
        this.checkForHighlights(event);
    }

    private checkForHighlights(event: GameEvent): void {
        switch (event.type) {
            case 'chaser_nearby':
                this.checkCloseCall(event);
                break;
            case 'chaser_eaten':
                this.checkMultiEat();
                break;
            case 'round_end':
                this.checkRoundHighlights(event);
                break;
            case 'power_collected':
                this.checkPowerChain();
                break;
        }
    }

    private checkCloseCall(event: GameEvent): void {
        if (event.distance && event.distance <= HIGHLIGHT_THRESHOLDS.closeCallDistance) {
            // Count nearby chasers
            const nearbyChasers = this.recentEvents.filter(
                e => e.type === 'chaser_nearby' && 
                     e.distance && e.distance <= HIGHLIGHT_THRESHOLDS.closeCallDistance &&
                     Date.now() - e.timestamp < 2000
            ).length;

            if (nearbyChasers >= HIGHLIGHT_THRESHOLDS.luckyEscapeChasers) {
                this.createHighlight({
                    type: 'lucky_escape',
                    score: nearbyChasers * 100,
                    description: `Escaped ${nearbyChasers} chasers at once! 😱`
                });
            } else {
                this.createHighlight({
                    type: 'close_call',
                    score: 50,
                    description: 'That was TOO close! 💨'
                });
            }
        }
    }

    private checkMultiEat(): void {
        const recentEats = this.recentEvents.filter(
            e => e.type === 'chaser_eaten' && Date.now() - e.timestamp < 5000
        ).length;

        if (recentEats >= HIGHLIGHT_THRESHOLDS.multiEatCount) {
            this.createHighlight({
                type: 'multi_eat',
                score: recentEats * 200,
                description: `${recentEats}x COMBO! 👻💥`
            });
        }
    }

    private checkRoundHighlights(event: GameEvent): void {
        if (event.hitsTaken === 0) {
            this.createHighlight({
                type: 'perfect_round',
                score: event.finalScore || 1000,
                description: 'PERFECT ROUND - No hits! 🏆'
            });
        }

        if (event.isNewHighScore) {
            this.createHighlight({
                type: 'high_score',
                score: event.finalScore || 0,
                description: `NEW HIGH SCORE: ${event.finalScore}! 🎉`
            });
        }
    }

    private checkPowerChain(): void {
        const recentPowers = this.recentEvents.filter(
            e => e.type === 'power_collected' && Date.now() - e.timestamp < 15000
        ).length;

        if (recentPowers >= 3) {
            this.createHighlight({
                type: 'power_chain',
                score: recentPowers * 150,
                description: `${recentPowers}x Power Chain! ⚡⚡⚡`
            });
        }
    }

    private createHighlight(data: Partial<ShareableHighlight>): void {
        const highlight: ShareableHighlight = {
            id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: data.type || 'close_call',
            timestamp: Date.now(),
            score: data.score || 0,
            description: data.description || 'Epic moment!',
            gameMode: 'classic',
            playerName: this.playerName
        };

        this.highlights.push(highlight);
        console.log('[Highlights] New highlight:', highlight.description);
        
        this.onHighlightCallback?.(highlight);
    }

    /**
     * Get recent highlights
     */
    getHighlights(limit = 10): ShareableHighlight[] {
        return this.highlights.slice(-limit);
    }

    /**
     * Clear highlights
     */
    clearHighlights(): void {
        this.highlights = [];
        this.recentEvents = [];
    }

    onHighlight(callback: (highlight: ShareableHighlight) => void): void {
        this.onHighlightCallback = callback;
    }
}

interface GameEvent {
    type: string;
    timestamp: number;
    distance?: number;
    hitsTaken?: number;
    finalScore?: number;
    isNewHighScore?: boolean;
}

/**
 * Social Share Manager
 */
export class SocialShareManager {
    private config: ShareConfig;

    constructor(config: Partial<ShareConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Generate share text for a highlight
     */
    generateShareText(highlight: ShareableHighlight): string {
        const hashtags = this.config.hashTags.map(t => `#${t}`).join(' ');
        const scoreText = highlight.score > 0 ? ` Score: ${highlight.score}` : '';
        
        return `${highlight.description}${scoreText} 🎮\n\nPlay ${this.config.appName}: ${this.config.baseUrl}\n\n${hashtags}`;
    }

    /**
     * Share to Twitter/X
     */
    shareToTwitter(highlight: ShareableHighlight): void {
        const text = encodeURIComponent(this.generateShareText(highlight));
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank', 'width=550,height=420');
    }

    /**
     * Share to Facebook
     */
    shareToFacebook(highlight: ShareableHighlight): void {
        const url = encodeURIComponent(`${this.config.baseUrl}?share=${highlight.id}`);
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        window.open(shareUrl, '_blank', 'width=550,height=420');
    }

    /**
     * Copy share link to clipboard
     */
    async copyShareLink(highlight: ShareableHighlight): Promise<boolean> {
        const text = this.generateShareText(highlight);
        
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            console.warn('[Share] Failed to copy:', e);
            return false;
        }
    }

    /**
     * Native share (mobile)
     */
    async nativeShare(highlight: ShareableHighlight): Promise<boolean> {
        if (!navigator.share) {
            console.warn('[Share] Native share not supported');
            return false;
        }

        try {
            await navigator.share({
                title: `${this.config.appName} - ${highlight.description}`,
                text: this.generateShareText(highlight),
                url: this.config.baseUrl
            });
            return true;
        } catch (e) {
            console.warn('[Share] Native share failed:', e);
            return false;
        }
    }

    /**
     * Share with platform selection
     */
    share(highlight: ShareableHighlight, platform: SharePlatform): void {
        switch (platform) {
            case 'twitter':
                this.shareToTwitter(highlight);
                break;
            case 'facebook':
                this.shareToFacebook(highlight);
                break;
            case 'copy':
                this.copyShareLink(highlight);
                break;
            case 'discord':
                this.copyShareLink(highlight); // Discord uses clipboard
                break;
            default:
                this.nativeShare(highlight);
        }
    }

    /**
     * Get available share platforms
     */
    getAvailablePlatforms(): SharePlatform[] {
        const platforms: SharePlatform[] = ['copy'];
        
        // Twitter is always available
        platforms.push('twitter');
        
        // Native share on mobile
        if (typeof navigator.share === 'function') {
            platforms.push('discord');
        }
        
        return platforms;
    }
}

// Meme templates for user-generated content
export const MEME_TEMPLATES = {
    closeCall: {
        topText: "ME: I'M TOTALLY SAFE",
        bottomText: "THE CHASER 0.1 TILES BEHIND ME:",
        imageType: 'sweating'
    },
    multiEat: {
        topText: "WHEN YOU GET THE POWER PELLET",
        bottomText: "AND THERE'S 4 CHASERS NEARBY",
        imageType: 'evil_laugh'
    },
    highScore: {
        topText: "JUST GOT A NEW HIGH SCORE",
        bottomText: "TIME TO TELL ABSOLUTELY EVERYONE",
        imageType: 'proud'
    }
} as const;

// Singletons
let highlightDetector: HighlightDetector | null = null;
let socialShareManager: SocialShareManager | null = null;

export function getHighlightDetector(playerName?: string): HighlightDetector {
    if (!highlightDetector) {
        highlightDetector = new HighlightDetector(playerName);
    }
    return highlightDetector;
}

export function getSocialShareManager(): SocialShareManager {
    if (!socialShareManager) {
        socialShareManager = new SocialShareManager();
    }
    return socialShareManager;
}
