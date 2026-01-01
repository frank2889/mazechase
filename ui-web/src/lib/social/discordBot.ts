/**
 * Discord Bot Integration
 * 
 * AI Tester Suggestion (Ava - Social Gaming Specialist):
 * "Voeg Discord bot integratie toe voor game notificaties.
 * Dit verbindt de game met bestaande communities."
 * 
 * Features:
 * - Game notifications in Discord
 * - Rich presence
 * - Match invites
 * - Leaderboard updates
 * - Achievement sharing
 */

export interface DiscordConfig {
    webhookUrl?: string;
    clientId?: string;
    guildId?: string;
    notificationChannel?: string;
}

export interface DiscordMessage {
    type: MessageType;
    title: string;
    description: string;
    color?: number;
    fields?: MessageField[];
    thumbnail?: string;
    footer?: string;
    timestamp?: boolean;
}

export type MessageType = 
    | 'game_start'
    | 'game_end'
    | 'achievement'
    | 'leaderboard'
    | 'challenge'
    | 'invite'
    | 'tournament';

export interface MessageField {
    name: string;
    value: string;
    inline?: boolean;
}

export interface RichPresenceData {
    state: string;
    details: string;
    largeImageKey: string;
    largeImageText: string;
    smallImageKey?: string;
    smallImageText?: string;
    startTimestamp?: number;
    partyId?: string;
    partySize?: number;
    partyMax?: number;
    joinSecret?: string;
}

// Discord embed colors
const EMBED_COLORS = {
    game_start: 0x00ff00,   // Green
    game_end: 0x3498db,     // Blue
    achievement: 0xf1c40f,  // Gold
    leaderboard: 0x9b59b6,  // Purple
    challenge: 0xe74c3c,    // Red
    invite: 0x1abc9c,       // Teal
    tournament: 0xff6b6b    // Coral
};

/**
 * DiscordBotManager - Handles Discord integration
 */
export class DiscordBotManager {
    private config: DiscordConfig | null = null;
    private isConnected: boolean = false;
    private richPresence: RichPresenceData | null = null;
    private messageQueue: DiscordMessage[] = [];
    private rateLimitRemaining: number = 5;
    private rateLimitResetAt: number = 0;

    constructor() {
        this.loadConfig();
    }

    /**
     * Initialize with config
     */
    configure(config: DiscordConfig): void {
        this.config = config;
        this.saveConfig();
        console.log('[Discord] Configured');
    }

    /**
     * Connect to Discord (via webhook)
     */
    async connect(): Promise<boolean> {
        if (!this.config?.webhookUrl) {
            console.warn('[Discord] No webhook URL configured');
            return false;
        }

        try {
            // Test webhook with a simple message
            await this.sendWebhook({
                type: 'game_start',
                title: 'MazeChase Connected',
                description: 'Discord notifications are now active!',
                color: EMBED_COLORS.game_start,
                timestamp: true
            });

            this.isConnected = true;
            console.log('[Discord] Connected successfully');
            return true;
        } catch (error) {
            console.error('[Discord] Connection failed:', error);
            return false;
        }
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        this.isConnected = false;
        this.richPresence = null;
    }

    /**
     * Send game start notification
     */
    notifyGameStart(playerCount: number, mapName: string): void {
        this.queueMessage({
            type: 'game_start',
            title: '🎮 Game Started!',
            description: 'A new MazeChase game has begun!',
            color: EMBED_COLORS.game_start,
            fields: [
                { name: 'Players', value: playerCount.toString(), inline: true },
                { name: 'Map', value: mapName, inline: true }
            ],
            timestamp: true
        });
    }

    /**
     * Send game end notification
     */
    notifyGameEnd(winner: string, score: number, duration: number): void {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        this.queueMessage({
            type: 'game_end',
            title: '🏆 Game Over!',
            description: `**${winner}** wins the game!`,
            color: EMBED_COLORS.game_end,
            fields: [
                { name: 'Winner', value: winner, inline: true },
                { name: 'Score', value: score.toString(), inline: true },
                { name: 'Duration', value: `${minutes}m ${seconds}s`, inline: true }
            ],
            timestamp: true
        });
    }

    /**
     * Send achievement notification
     */
    notifyAchievement(playerName: string, achievement: string, description: string): void {
        this.queueMessage({
            type: 'achievement',
            title: '🏅 Achievement Unlocked!',
            description: `**${playerName}** earned: **${achievement}**`,
            color: EMBED_COLORS.achievement,
            fields: [
                { name: 'Achievement', value: achievement, inline: false },
                { name: 'Description', value: description, inline: false }
            ],
            timestamp: true
        });
    }

    /**
     * Send leaderboard update
     */
    notifyLeaderboardUpdate(category: string, topPlayers: { name: string; score: number }[]): void {
        const playerList = topPlayers
            .map((p, i) => `${i + 1}. ${p.name}: ${p.score}`)
            .join('\n');

        this.queueMessage({
            type: 'leaderboard',
            title: '📊 Leaderboard Update',
            description: `Top players in ${category}`,
            color: EMBED_COLORS.leaderboard,
            fields: [
                { name: 'Rankings', value: playerList || 'No data', inline: false }
            ],
            timestamp: true
        });
    }

    /**
     * Send challenge notification
     */
    notifyChallenge(challenger: string, challenged: string, stakes: string): void {
        this.queueMessage({
            type: 'challenge',
            title: '⚔️ Challenge Issued!',
            description: `**${challenger}** has challenged **${challenged}**!`,
            color: EMBED_COLORS.challenge,
            fields: [
                { name: 'Stakes', value: stakes, inline: false }
            ],
            timestamp: true
        });
    }

    /**
     * Create game invite link
     */
    createInviteEmbed(inviterName: string, lobbyCode: string): DiscordMessage {
        return {
            type: 'invite',
            title: '🎮 Join My Game!',
            description: `**${inviterName}** invites you to play MazeChase!`,
            color: EMBED_COLORS.invite,
            fields: [
                { name: 'Lobby Code', value: `\`${lobbyCode}\``, inline: true },
                { name: 'How to Join', value: 'Use the lobby code in-game', inline: false }
            ],
            footer: 'Click to copy the lobby code!',
            timestamp: true
        };
    }

    /**
     * Update Rich Presence
     */
    updateRichPresence(data: Partial<RichPresenceData>): void {
        this.richPresence = {
            state: data.state || 'Playing MazeChase',
            details: data.details || 'In Menu',
            largeImageKey: data.largeImageKey || 'mazechase_logo',
            largeImageText: data.largeImageText || 'MazeChase',
            ...data
        };

        // Dispatch for Discord RPC client (if available)
        window.dispatchEvent(new CustomEvent('mazechase:discord_presence', {
            detail: this.richPresence
        }));
    }

    /**
     * Set presence for different game states
     */
    setPresenceInMenu(): void {
        this.updateRichPresence({
            state: 'In Menu',
            details: 'Browsing the maze',
            largeImageKey: 'menu_logo'
        });
    }

    setPresenceInLobby(playerCount: number, maxPlayers: number): void {
        this.updateRichPresence({
            state: `In Lobby (${playerCount}/${maxPlayers})`,
            details: 'Waiting for players',
            largeImageKey: 'lobby_icon',
            partySize: playerCount,
            partyMax: maxPlayers
        });
    }

    setPresenceInGame(role: string, score: number, startTime: number): void {
        this.updateRichPresence({
            state: `Playing as ${role}`,
            details: `Score: ${score}`,
            largeImageKey: role === 'runner' ? 'runner_icon' : 'chaser_icon',
            startTimestamp: startTime
        });
    }

    /**
     * Queue message with rate limiting
     */
    private queueMessage(message: DiscordMessage): void {
        if (!this.isConnected) {
            console.warn('[Discord] Not connected, message not sent');
            return;
        }

        this.messageQueue.push(message);
        this.processQueue();
    }

    /**
     * Process message queue
     */
    private async processQueue(): Promise<void> {
        if (this.messageQueue.length === 0) return;

        // Check rate limit
        if (this.rateLimitRemaining <= 0 && Date.now() < this.rateLimitResetAt) {
            const waitTime = this.rateLimitResetAt - Date.now();
            console.log(`[Discord] Rate limited, waiting ${waitTime}ms`);
            setTimeout(() => this.processQueue(), waitTime);
            return;
        }

        const message = this.messageQueue.shift();
        if (message) {
            await this.sendWebhook(message);
        }

        // Process next message
        if (this.messageQueue.length > 0) {
            setTimeout(() => this.processQueue(), 500);
        }
    }

    /**
     * Send message via webhook
     */
    private async sendWebhook(message: DiscordMessage): Promise<void> {
        if (!this.config?.webhookUrl) return;

        const embed = {
            title: message.title,
            description: message.description,
            color: message.color || EMBED_COLORS[message.type],
            fields: message.fields?.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline ?? false
            })),
            thumbnail: message.thumbnail ? { url: message.thumbnail } : undefined,
            footer: message.footer ? { text: message.footer } : undefined,
            timestamp: message.timestamp ? new Date().toISOString() : undefined
        };

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'MazeChase Bot',
                    avatar_url: 'https://example.com/mazechase-avatar.png',
                    embeds: [embed]
                })
            });

            // Handle rate limits
            const remaining = response.headers.get('X-RateLimit-Remaining');
            const resetAfter = response.headers.get('X-RateLimit-Reset-After');

            if (remaining) {
                this.rateLimitRemaining = parseInt(remaining);
            }
            if (resetAfter) {
                this.rateLimitResetAt = Date.now() + parseFloat(resetAfter) * 1000;
            }

            if (!response.ok) {
                console.error('[Discord] Webhook error:', response.status);
            }

        } catch (error) {
            console.error('[Discord] Failed to send webhook:', error);
        }
    }

    // Getters
    isDiscordConnected(): boolean {
        return this.isConnected;
    }

    getConfig(): DiscordConfig | null {
        return this.config;
    }

    getRichPresence(): RichPresenceData | null {
        return this.richPresence;
    }

    // Storage
    private saveConfig(): void {
        try {
            if (this.config) {
                // Don't save sensitive data like webhookUrl to localStorage
                localStorage.setItem('mazechase_discord', JSON.stringify({
                    guildId: this.config.guildId,
                    notificationChannel: this.config.notificationChannel
                }));
            }
        } catch (e) {
            console.warn('[Discord] Failed to save config:', e);
        }
    }

    private loadConfig(): void {
        try {
            const data = localStorage.getItem('mazechase_discord');
            if (data) {
                const parsed = JSON.parse(data);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.warn('[Discord] Failed to load config:', e);
        }
    }
}

// Singleton
let discordBotManager: DiscordBotManager | null = null;

export function getDiscordBotManager(): DiscordBotManager {
    if (!discordBotManager) {
        discordBotManager = new DiscordBotManager();
    }
    return discordBotManager;
}
