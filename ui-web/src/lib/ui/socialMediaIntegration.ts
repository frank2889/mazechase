/**
 * Social Media Integration
 * EMMSOAI Suggestion (Ava - Indie Game Market Analyst):
 * "Implementeer knoppen voor het delen van hoogtepunten op sociale media"
 * "Vergroot de viral potential door spelers te stimuleren om momenten te delen"
 */

export interface ShareableContent {
    title: string;
    description: string;
    imageUrl?: string;
    videoUrl?: string;
    score?: number;
    achievement?: string;
    hashtags?: string[];
}

export interface ShareResult {
    success: boolean;
    platform: string;
    error?: string;
}

const DEFAULT_HASHTAGS = ['MazeChase', 'IndieGame', 'Gaming'];
const GAME_URL = 'https://mazechase-har7u.ondigitalocean.app';

/**
 * Generate share text for different content types
 */
function generateShareText(content: ShareableContent): string {
    const hashtags = [...DEFAULT_HASHTAGS, ...(content.hashtags || [])];
    const hashtagString = hashtags.map(h => `#${h}`).join(' ');

    if (content.achievement) {
        return `🏆 I just unlocked "${content.achievement}" in MazeChase! ${hashtagString}`;
    }
    if (content.score) {
        return `🎮 I scored ${content.score.toLocaleString()} points in MazeChase! Can you beat my score? ${hashtagString}`;
    }
    return `${content.title} - ${content.description} ${hashtagString}`;
}

/**
 * Share to Twitter/X
 */
export function shareToTwitter(content: ShareableContent): void {
    const text = generateShareText(content);
    const url = encodeURIComponent(GAME_URL);
    const tweetText = encodeURIComponent(text);
    
    window.open(
        `https://twitter.com/intent/tweet?text=${tweetText}&url=${url}`,
        '_blank',
        'width=550,height=420'
    );
}

/**
 * Share to Facebook
 */
export function shareToFacebook(content: ShareableContent): void {
    const url = encodeURIComponent(GAME_URL);
    const quote = encodeURIComponent(generateShareText(content));
    
    window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
        '_blank',
        'width=550,height=420'
    );
}

/**
 * Share to Reddit
 */
export function shareToReddit(content: ShareableContent): void {
    const url = encodeURIComponent(GAME_URL);
    const title = encodeURIComponent(content.title || 'Check out MazeChase!');
    
    window.open(
        `https://www.reddit.com/submit?url=${url}&title=${title}`,
        '_blank',
        'width=550,height=600'
    );
}

/**
 * Share to Discord (copy formatted message)
 */
export async function shareToDiscord(content: ShareableContent): Promise<ShareResult> {
    const text = generateShareText(content);
    const fullText = `${text}\n\n🎮 Play now: ${GAME_URL}`;
    
    try {
        await navigator.clipboard.writeText(fullText);
        return { success: true, platform: 'discord' };
    } catch (e) {
        return { success: false, platform: 'discord', error: 'Failed to copy to clipboard' };
    }
}

/**
 * Share via native Web Share API (mobile)
 */
export async function shareNative(content: ShareableContent): Promise<ShareResult> {
    if (!navigator.share) {
        return { success: false, platform: 'native', error: 'Web Share API not supported' };
    }

    try {
        await navigator.share({
            title: content.title || 'MazeChase',
            text: generateShareText(content),
            url: GAME_URL
        });
        return { success: true, platform: 'native' };
    } catch (e) {
        if ((e as Error).name === 'AbortError') {
            return { success: false, platform: 'native', error: 'Share cancelled' };
        }
        return { success: false, platform: 'native', error: (e as Error).message };
    }
}

/**
 * Check if native sharing is available
 */
export function isNativeShareSupported(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Generate a shareable game screenshot
 */
export async function captureScreenshot(canvasElement: HTMLCanvasElement): Promise<string | null> {
    try {
        return canvasElement.toDataURL('image/png');
    } catch (e) {
        console.warn('[Social] Failed to capture screenshot:', e);
        return null;
    }
}

/**
 * Create shareable highlight content from game result
 */
export function createHighlightContent(
    type: 'win' | 'achievement' | 'highscore' | 'streak',
    data: { score?: number; achievement?: string; streakDays?: number }
): ShareableContent {
    switch (type) {
        case 'win':
            return {
                title: 'Victory!',
                description: `I won with ${data.score?.toLocaleString() || 0} points!`,
                score: data.score,
                hashtags: ['Victory', 'Winner']
            };
        case 'achievement':
            return {
                title: 'Achievement Unlocked!',
                description: `Unlocked: ${data.achievement}`,
                achievement: data.achievement,
                hashtags: ['Achievement', 'Unlocked']
            };
        case 'highscore':
            return {
                title: 'New High Score!',
                description: `My new high score: ${data.score?.toLocaleString()}!`,
                score: data.score,
                hashtags: ['HighScore', 'PersonalBest']
            };
        case 'streak':
            return {
                title: `${data.streakDays} Day Streak!`,
                description: `I've been playing MazeChase for ${data.streakDays} days straight!`,
                hashtags: ['Streak', 'Dedication']
            };
    }
}

/**
 * Social sharing manager with analytics tracking
 */
export class SocialShareManager {
    private shareCount = 0;
    private lastShareTime = 0;

    /**
     * Share content to specified platform
     */
    async share(
        platform: 'twitter' | 'facebook' | 'reddit' | 'discord' | 'native',
        content: ShareableContent
    ): Promise<ShareResult> {
        // Rate limiting - max 1 share per 5 seconds
        const now = Date.now();
        if (now - this.lastShareTime < 5000) {
            return { success: false, platform, error: 'Please wait before sharing again' };
        }
        this.lastShareTime = now;

        let result: ShareResult;

        switch (platform) {
            case 'twitter':
                shareToTwitter(content);
                result = { success: true, platform: 'twitter' };
                break;
            case 'facebook':
                shareToFacebook(content);
                result = { success: true, platform: 'facebook' };
                break;
            case 'reddit':
                shareToReddit(content);
                result = { success: true, platform: 'reddit' };
                break;
            case 'discord':
                result = await shareToDiscord(content);
                break;
            case 'native':
                result = await shareNative(content);
                break;
            default:
                result = { success: false, platform, error: 'Unknown platform' };
        }

        if (result.success) {
            this.shareCount++;
            this.trackShare(platform, content);
        }

        return result;
    }

    /**
     * Track share event for analytics
     */
    private trackShare(platform: string, content: ShareableContent): void {
        // Integration point for PostHog/analytics
        console.log(`[Social] Shared to ${platform}:`, content.title);
        
        // Track achievement unlock for sharing
        if (typeof window !== 'undefined' && (window as unknown as { achievementManager?: { trackEvent: (e: string) => void } }).achievementManager) {
            (window as unknown as { achievementManager: { trackEvent: (e: string) => void } }).achievementManager.trackEvent('highlight_shared');
        }
    }

    /**
     * Get total share count
     */
    getShareCount(): number {
        return this.shareCount;
    }
}

// Singleton instance
export const socialShareManager = new SocialShareManager();
