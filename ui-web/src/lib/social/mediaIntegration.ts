/**
 * Media Integration - Streaming Platform Support
 * 
 * AI Tester Suggestion (Ava - Social Gaming Specialist):
 * "Voeg streaming platform integratie toe.
 * Voor viewer engagement tijdens streams."
 * 
 * Features:
 * - Twitch integration
 * - YouTube Gaming support
 * - Viewer interactions
 * - Stream overlays
 * - Chat commands
 */

export type StreamPlatform = 'twitch' | 'youtube' | 'kick';

export interface StreamConfig {
    platform: StreamPlatform;
    channelId: string;
    accessToken?: string;
    enabledFeatures: StreamFeature[];
}

export type StreamFeature = 
    | 'viewer_voting'
    | 'chat_commands'
    | 'overlay_stats'
    | 'predictions'
    | 'channel_points'
    | 'subscriber_perks';

export interface ViewerVote {
    id: string;
    question: string;
    options: VoteOption[];
    duration: number;
    startedAt: number;
    endedAt?: number;
    totalVotes: number;
}

export interface VoteOption {
    id: string;
    text: string;
    votes: number;
    percentage: number;
}

export interface ChatCommand {
    command: string;
    description: string;
    cooldownMs: number;
    subscriberOnly: boolean;
    handler: (username: string, args: string[]) => void;
}

export interface StreamOverlayData {
    currentScore: number;
    topScore: number;
    gamesPlayed: number;
    winStreak: number;
    currentRole: string;
    activePowerUp?: string;
    recentAchievements: string[];
}

/**
 * MediaIntegrationManager - Handles streaming platform integrations
 */
export class MediaIntegrationManager {
    private config: StreamConfig | null = null;
    private isConnected: boolean = false;
    private activeVote: ViewerVote | null = null;
    private chatCommands: Map<string, ChatCommand> = new Map();
    private overlayData: StreamOverlayData = {
        currentScore: 0,
        topScore: 0,
        gamesPlayed: 0,
        winStreak: 0,
        currentRole: 'runner',
        recentAchievements: []
    };

    private onVoteCallbacks: ((vote: ViewerVote) => void)[] = [];
    private onCommandCallbacks: ((cmd: string, user: string) => void)[] = [];
    private eventSource: EventSource | null = null;

    constructor() {
        this.registerDefaultCommands();
    }

    /**
     * Connect to streaming platform
     */
    async connect(config: StreamConfig): Promise<boolean> {
        this.config = config;

        try {
            switch (config.platform) {
                case 'twitch':
                    await this.connectTwitch(config);
                    break;
                case 'youtube':
                    await this.connectYouTube(config);
                    break;
                case 'kick':
                    await this.connectKick(config);
                    break;
            }

            this.isConnected = true;
            console.log(`[MediaIntegration] Connected to ${config.platform}`);
            return true;

        } catch (error) {
            console.error('[MediaIntegration] Connection failed:', error);
            return false;
        }
    }

    /**
     * Disconnect from platform
     */
    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnected = false;
        this.config = null;
        console.log('[MediaIntegration] Disconnected');
    }

    // Platform-specific connections
    private async connectTwitch(config: StreamConfig): Promise<void> {
        // In production, use Twitch EventSub API
        // This is a simplified mock implementation
        console.log(`[MediaIntegration] Connecting to Twitch channel: ${config.channelId}`);
        
        // Simulate connection
        await this.delay(500);

        // Setup mock event listener for chat
        this.setupMockChatListener();
    }

    private async connectYouTube(config: StreamConfig): Promise<void> {
        console.log(`[MediaIntegration] Connecting to YouTube: ${config.channelId}`);
        await this.delay(500);
        this.setupMockChatListener();
    }

    private async connectKick(config: StreamConfig): Promise<void> {
        console.log(`[MediaIntegration] Connecting to Kick: ${config.channelId}`);
        await this.delay(500);
        this.setupMockChatListener();
    }

    private setupMockChatListener(): void {
        // In production, connect to actual chat API
        // Mock: Listen for custom events
        window.addEventListener('mazechase:stream_chat', ((e: CustomEvent) => {
            this.handleChatMessage(e.detail.username, e.detail.message);
        }) as EventListener);
    }

    /**
     * Handle incoming chat message
     */
    private handleChatMessage(username: string, message: string): void {
        // Check for commands
        if (message.startsWith('!')) {
            const parts = message.slice(1).split(' ');
            const commandPart = parts[0];
            if (!commandPart) return;
            const command = commandPart.toLowerCase();
            const args = parts.slice(1);

            const cmd = this.chatCommands.get(command);
            if (cmd) {
                cmd.handler(username, args);
                this.onCommandCallbacks.forEach(cb => cb(command, username));
            }
        }

        // Check for vote response
        if (this.activeVote && message.match(/^[1-9]$/)) {
            this.handleVoteResponse(username, parseInt(message));
        }
    }

    /**
     * Register default chat commands
     */
    private registerDefaultCommands(): void {
        this.registerCommand({
            command: 'score',
            description: 'Show current score',
            cooldownMs: 5000,
            subscriberOnly: false,
            handler: () => {
                this.sendChatMessage(`Current score: ${this.overlayData.currentScore}`);
            }
        });

        this.registerCommand({
            command: 'stats',
            description: 'Show game stats',
            cooldownMs: 10000,
            subscriberOnly: false,
            handler: () => {
                const data = this.overlayData;
                this.sendChatMessage(
                    `Games: ${data.gamesPlayed} | Win Streak: ${data.winStreak} | Top Score: ${data.topScore}`
                );
            }
        });

        this.registerCommand({
            command: 'role',
            description: 'Show current role',
            cooldownMs: 5000,
            subscriberOnly: false,
            handler: () => {
                this.sendChatMessage(`Current role: ${this.overlayData.currentRole}`);
            }
        });

        this.registerCommand({
            command: 'help',
            description: 'Show available commands',
            cooldownMs: 30000,
            subscriberOnly: false,
            handler: () => {
                const cmds = Array.from(this.chatCommands.keys()).map(c => `!${c}`).join(', ');
                this.sendChatMessage(`Commands: ${cmds}`);
            }
        });
    }

    /**
     * Register a custom chat command
     */
    registerCommand(command: ChatCommand): void {
        this.chatCommands.set(command.command.toLowerCase(), command);
    }

    /**
     * Start a viewer vote
     */
    startVote(question: string, options: string[], durationSeconds: number = 30): ViewerVote {
        const vote: ViewerVote = {
            id: `vote_${Date.now()}`,
            question,
            options: options.map((text, index) => ({
                id: `opt_${index + 1}`,
                text,
                votes: 0,
                percentage: 0
            })),
            duration: durationSeconds * 1000,
            startedAt: Date.now(),
            totalVotes: 0
        };

        this.activeVote = vote;

        // Send vote to chat
        let voteMessage = `📊 VOTE: ${question}\n`;
        vote.options.forEach((opt, i) => {
            voteMessage += `${i + 1}. ${opt.text}\n`;
        });
        voteMessage += `Type 1-${options.length} to vote! (${durationSeconds}s)`;
        this.sendChatMessage(voteMessage);

        // End vote after duration
        setTimeout(() => {
            this.endVote();
        }, vote.duration);

        this.notifyVoteUpdate(vote);
        return vote;
    }

    /**
     * Handle vote response
     */
    private handleVoteResponse(_username: string, optionNumber: number): void {
        if (!this.activeVote) return;
        
        const optionIndex = optionNumber - 1;
        if (optionIndex < 0 || optionIndex >= this.activeVote.options.length) return;

        // In production, track unique voters
        const option = this.activeVote.options[optionIndex];
        if (!option) return;
        option.votes++;
        this.activeVote.totalVotes++;

        // Update percentages
        this.activeVote.options.forEach(opt => {
            opt.percentage = this.activeVote!.totalVotes > 0
                ? (opt.votes / this.activeVote!.totalVotes) * 100
                : 0;
        });

        this.notifyVoteUpdate(this.activeVote);
    }

    /**
     * End active vote
     */
    private endVote(): void {
        if (!this.activeVote) return;

        this.activeVote.endedAt = Date.now();

        // Find winner
        const winner = this.activeVote.options.reduce((max, opt) => 
            opt.votes > max.votes ? opt : max
        );

        this.sendChatMessage(
            `📊 Vote ended! Winner: "${winner.text}" with ${winner.percentage.toFixed(1)}% (${winner.votes} votes)`
        );

        // Dispatch result
        window.dispatchEvent(new CustomEvent('mazechase:vote_result', {
            detail: {
                vote: this.activeVote,
                winner
            }
        }));

        this.notifyVoteUpdate(this.activeVote);
        this.activeVote = null;
    }

    /**
     * Update overlay data
     */
    updateOverlayData(data: Partial<StreamOverlayData>): void {
        Object.assign(this.overlayData, data);
        
        // Dispatch for overlay extension
        window.dispatchEvent(new CustomEvent('mazechase:overlay_update', {
            detail: this.overlayData
        }));
    }

    /**
     * Send chat message (mock implementation)
     */
    private sendChatMessage(message: string): void {
        console.log(`[StreamChat] ${message}`);
        
        // In production, use platform's chat API
        window.dispatchEvent(new CustomEvent('mazechase:stream_bot_message', {
            detail: { message }
        }));
    }

    /**
     * Create overlay URL for OBS/streaming software
     */
    getOverlayUrl(): string {
        const baseUrl = window.location.origin;
        const params = new URLSearchParams({
            channel: this.config?.channelId || '',
            platform: this.config?.platform || ''
        });
        return `${baseUrl}/stream-overlay?${params}`;
    }

    // Getters
    isStreamConnected(): boolean {
        return this.isConnected;
    }

    getActiveVote(): ViewerVote | null {
        return this.activeVote;
    }

    getOverlayData(): StreamOverlayData {
        return { ...this.overlayData };
    }

    getConfig(): StreamConfig | null {
        return this.config;
    }

    // Subscriptions
    onVoteUpdate(callback: (vote: ViewerVote) => void): () => void {
        this.onVoteCallbacks.push(callback);
        return () => {
            this.onVoteCallbacks = this.onVoteCallbacks.filter(cb => cb !== callback);
        };
    }

    onChatCommand(callback: (cmd: string, user: string) => void): () => void {
        this.onCommandCallbacks.push(callback);
        return () => {
            this.onCommandCallbacks = this.onCommandCallbacks.filter(cb => cb !== callback);
        };
    }

    // Private helpers
    private notifyVoteUpdate(vote: ViewerVote): void {
        this.onVoteCallbacks.forEach(cb => cb(vote));
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton
let mediaIntegrationManager: MediaIntegrationManager | null = null;

export function getMediaIntegrationManager(): MediaIntegrationManager {
    if (!mediaIntegrationManager) {
        mediaIntegrationManager = new MediaIntegrationManager();
    }
    return mediaIntegrationManager;
}
