/**
 * Social Sharing System - Share game results and achievements
 * 
 * Based on Ava's Market Analyst recommendations:
 * - Create shareable moments
 * - Viral growth potential
 * - Social media optimization
 */

export interface ShareableContent {
    type: 'game_result' | 'achievement' | 'streak' | 'leaderboard';
    title: string;
    description: string;
    imageUrl?: string;
    stats?: Record<string, string | number>;
}

interface GameResult {
    won: boolean;
    score: number;
    pelletsCollected: number;
    powerUpsUsed: number;
    playersEliminated?: number;
    gameTime: number; // seconds
    role: 'runner' | 'chaser';
}

/**
 * Generate shareable text for different platforms
 */
export function generateShareText(content: ShareableContent): string {
    switch (content.type) {
        case 'game_result':
            return `🎮 ${content.title}\n\n${content.description}\n\n🏆 Speel mee op MazeChase!\n#MazeChase #Gaming`;
        
        case 'achievement':
            return `🏅 Achievement Unlocked!\n\n${content.title} - ${content.description}\n\n🎮 Kun jij dit ook halen?\n#MazeChase #Achievement`;
        
        case 'streak':
            return `🔥 ${content.title}\n\n${content.description}\n\n⚡ Speel elke dag mee!\n#MazeChase #DailyStreak`;
        
        case 'leaderboard':
            return `📊 ${content.title}\n\n${content.description}\n\n🏆 Wie kan mij verslaan?\n#MazeChase #Leaderboard`;
        
        default:
            return `🎮 MazeChase - ${content.title}\n\n${content.description}`;
    }
}

/**
 * Generate game result share content
 */
export function createGameResultShare(result: GameResult): ShareableContent {
    const winEmoji = result.won ? '🏆' : '💪';
    const resultText = result.won ? 'GEWONNEN!' : 'Volgende keer beter!';
    
    const stats = {
        'Score': result.score,
        'Pellets': result.pelletsCollected,
        'Power-ups': result.powerUpsUsed,
        'Tijd': `${Math.floor(result.gameTime / 60)}:${(result.gameTime % 60).toString().padStart(2, '0')}`,
    };
    
    if (result.playersEliminated && result.playersEliminated > 0) {
        stats['Eliminations'] = result.playersEliminated;
    }
    
    const description = [
        `Score: ${result.score} punten`,
        `${result.pelletsCollected} pellets verzameld`,
        result.won ? '✨ Victory!' : 'Bijna!',
    ].join(' • ');
    
    return {
        type: 'game_result',
        title: `${winEmoji} ${resultText}`,
        description,
        stats,
    };
}

/**
 * Share to various platforms
 */
export async function shareToplatform(
    platform: 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'copy' | 'native',
    content: ShareableContent
): Promise<boolean> {
    const text = generateShareText(content);
    const url = window.location.origin;
    
    switch (platform) {
        case 'twitter':
            window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                '_blank',
                'width=600,height=400'
            );
            return true;
        
        case 'facebook':
            window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
                '_blank',
                'width=600,height=400'
            );
            return true;
        
        case 'whatsapp':
            window.open(
                `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`,
                '_blank'
            );
            return true;
        
        case 'telegram':
            window.open(
                `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                '_blank'
            );
            return true;
        
        case 'copy':
            try {
                await navigator.clipboard.writeText(text + '\n' + url);
                return true;
            } catch (e) {
                console.error('Failed to copy:', e);
                return false;
            }
        
        case 'native':
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'MazeChase',
                        text: text,
                        url: url,
                    });
                    return true;
                } catch (e) {
                    // User cancelled or share failed
                    return false;
                }
            }
            return false;
    }
}

/**
 * Check if native share is available
 */
export function isNativeShareAvailable(): boolean {
    return typeof navigator.share === 'function';
}

/**
 * Take a screenshot of the game canvas
 */
export async function captureGameScreenshot(): Promise<string | null> {
    try {
        const canvas = document.getElementById('game-canvas-3d') as HTMLCanvasElement;
        if (!canvas) {
            console.warn('Game canvas not found');
            return null;
        }
        
        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error('Failed to capture screenshot:', e);
        return null;
    }
}

/**
 * Download screenshot
 */
export function downloadScreenshot(dataUrl: string, filename: string = 'mazechase-screenshot.png'): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate share image with overlay (for future use with canvas)
 */
export async function generateShareImage(content: ShareableContent): Promise<string | null> {
    // For now, just capture the game canvas
    // In the future, this could add text overlays with stats
    return await captureGameScreenshot();
}
