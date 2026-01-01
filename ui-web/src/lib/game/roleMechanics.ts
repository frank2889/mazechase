/**
 * Role Mechanics - Dynamic Role Switch Challenges
 * 
 * AI Tester Suggestion (Ava - Social Gaming Specialist):
 * "Voeg dynamische uitdagingen toe gekoppeld aan rol-switches.
 * Momenteel mist de game diepgang in rol-wisselmomenten."
 * 
 * Features:
 * - Role-switch events
 * - Context-aware challenges
 * - Momentum mechanics
 * - Dramatic tension
 * - Comeback mechanics
 */

export type PlayerRole = 'runner' | 'chaser';

export interface RoleSwitchEvent {
    playerId: string;
    previousRole: PlayerRole;
    newRole: PlayerRole;
    timestamp: number;
    position: { x: number; y: number; z: number };
    cause: RoleSwitchCause;
}

export type RoleSwitchCause = 
    | 'caught'           // Runner was caught by chaser
    | 'power_up'         // Power-up triggered switch
    | 'time_expire'      // Timed role rotation
    | 'zone_capture'     // Captured control zone
    | 'special_event';   // Special game event

export interface RoleChallenge {
    id: string;
    title: string;
    description: string;
    type: ChallengeType;
    target: number;
    progress: number;
    timeLimit?: number;
    reward: ChallengeReward;
    triggeredAt: number;
    completedAt?: number;
}

export type ChallengeType = 
    | 'survival_streak'      // Survive X seconds after switch
    | 'revenge_catch'        // Catch who caught you
    | 'escape_artist'        // Escape chaser within X seconds
    | 'hunt_down'            // Catch X runners quickly
    | 'momentum_build'       // Collect X pellets after switch
    | 'zone_control'         // Control zone for X seconds
    | 'comeback_king';       // Score X points from behind

export interface ChallengeReward {
    xpMultiplier: number;
    bonusCoins: number;
    specialEffect?: string;
}

interface ChallengeTemplate {
    type: ChallengeType;
    title: string;
    description: string;
    minTarget: number;
    maxTarget: number;
    timeLimit: number;
    reward: ChallengeReward;
    probability: number;
}

// Challenge templates per role transition
const RUNNER_TO_CHASER_CHALLENGES: ChallengeTemplate[] = [
    {
        type: 'revenge_catch',
        title: 'Revenge!',
        description: 'Catch the player who caught you within {time}s',
        minTarget: 1,
        maxTarget: 1,
        timeLimit: 30,
        reward: { xpMultiplier: 3.0, bonusCoins: 150, specialEffect: 'revenge_flames' },
        probability: 0.4
    },
    {
        type: 'hunt_down',
        title: 'Hunter Mode',
        description: 'Catch {target} runners in {time}s',
        minTarget: 2,
        maxTarget: 3,
        timeLimit: 45,
        reward: { xpMultiplier: 2.5, bonusCoins: 200 },
        probability: 0.35
    },
    {
        type: 'zone_control',
        title: 'Territory Control',
        description: 'Control your zone for {target}s',
        minTarget: 15,
        maxTarget: 25,
        timeLimit: 40,
        reward: { xpMultiplier: 2.0, bonusCoins: 100 },
        probability: 0.25
    }
];

const CHASER_TO_RUNNER_CHALLENGES: ChallengeTemplate[] = [
    {
        type: 'survival_streak',
        title: 'Survival Mode',
        description: 'Survive for {target}s without being caught',
        minTarget: 30,
        maxTarget: 45,
        timeLimit: 60,
        reward: { xpMultiplier: 2.5, bonusCoins: 175, specialEffect: 'survival_shield' },
        probability: 0.4
    },
    {
        type: 'escape_artist',
        title: 'Escape Artist',
        description: 'Escape from {target} close calls',
        minTarget: 3,
        maxTarget: 5,
        timeLimit: 45,
        reward: { xpMultiplier: 2.0, bonusCoins: 125 },
        probability: 0.35
    },
    {
        type: 'momentum_build',
        title: 'Pellet Rush',
        description: 'Collect {target} pellets in {time}s',
        minTarget: 15,
        maxTarget: 25,
        timeLimit: 30,
        reward: { xpMultiplier: 2.0, bonusCoins: 100 },
        probability: 0.25
    }
];

const COMEBACK_CHALLENGES: ChallengeTemplate[] = [
    {
        type: 'comeback_king',
        title: 'Comeback King!',
        description: 'Score {target} points to get back in the game',
        minTarget: 500,
        maxTarget: 1000,
        timeLimit: 60,
        reward: { xpMultiplier: 4.0, bonusCoins: 300, specialEffect: 'comeback_crown' },
        probability: 1.0
    }
];

/**
 * RoleMechanicsManager - Handles role-switch dynamics
 */
export class RoleMechanicsManager {
    private activeChallenge: RoleChallenge | null = null;
    private _currentRole: PlayerRole = 'runner';
    private _lastSwitchTime: number = 0;
    private roleSwitchHistory: RoleSwitchEvent[] = [];
    private _consecutiveCatches: number = 0;
    private onChallengeCallbacks: ((challenge: RoleChallenge | null) => void)[] = [];

    // Track for comeback detection
    private _currentScore: number = 0;
    private _averageScore: number = 0;
    private isInComebackMode: boolean = false;

    /** Get current role */
    get currentRole(): PlayerRole { return this._currentRole; }
    /** Get last switch time */
    get lastSwitchTime(): number { return this._lastSwitchTime; }
    /** Get consecutive catches */
    get consecutiveCatches(): number { return this._consecutiveCatches; }
    /** Get current score */
    get currentScore(): number { return this._currentScore; }
    /** Get average score */
    get averageScore(): number { return this._averageScore; }

    constructor() {
        this.setupEventListeners();
    }

    /**
     * Handle role switch event
     */
    handleRoleSwitch(event: RoleSwitchEvent): void {
        this.roleSwitchHistory.push(event);
        this._lastSwitchTime = event.timestamp;
        this._currentRole = event.newRole;

        // Clear any active challenge
        if (this.activeChallenge && !this.activeChallenge.completedAt) {
            console.log('[RoleMechanics] Challenge expired on role switch');
        }

        // Trigger new challenge based on transition
        this.triggerRoleSwitchChallenge(event);
    }

    /**
     * Trigger appropriate challenge for role switch
     */
    private triggerRoleSwitchChallenge(event: RoleSwitchEvent): void {
        let templates: ChallengeTemplate[];

        // Check for comeback situation first
        if (this.isInComebackMode) {
            templates = COMEBACK_CHALLENGES;
        } else if (event.previousRole === 'runner' && event.newRole === 'chaser') {
            templates = RUNNER_TO_CHASER_CHALLENGES;
            // Higher chance of revenge challenge if just caught
            if (event.cause === 'caught') {
                // Boost revenge probability
            }
        } else {
            templates = CHASER_TO_RUNNER_CHALLENGES;
        }

        const template = this.selectChallenge(templates);
        if (template) {
            this.createChallenge(template);
        }
    }

    /**
     * Select a challenge based on probability
     */
    private selectChallenge(templates: ChallengeTemplate[]): ChallengeTemplate | null {
        const roll = Math.random();
        let cumulative = 0;

        for (const template of templates) {
            cumulative += template.probability;
            if (roll <= cumulative) {
                return template;
            }
        }

        return null;
    }

    /**
     * Create and activate a challenge
     */
    private createChallenge(template: ChallengeTemplate): void {
        const target = this.randomInRange(template.minTarget, template.maxTarget);
        
        const challenge: RoleChallenge = {
            id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: template.title,
            description: template.description
                .replace('{target}', target.toString())
                .replace('{time}', template.timeLimit.toString()),
            type: template.type,
            target,
            progress: 0,
            timeLimit: template.timeLimit * 1000, // Convert to ms
            reward: { ...template.reward },
            triggeredAt: Date.now()
        };

        this.activeChallenge = challenge;
        this.notifyChallengeUpdate();

        // Set timeout for challenge expiry
        if (template.timeLimit > 0) {
            setTimeout(() => {
                if (this.activeChallenge?.id === challenge.id && !this.activeChallenge.completedAt) {
                    console.log('[RoleMechanics] Challenge expired:', challenge.title);
                    this.activeChallenge = null;
                    this.notifyChallengeUpdate();
                }
            }, template.timeLimit * 1000);
        }

        console.log('[RoleMechanics] Challenge activated:', challenge.title);
    }

    /**
     * Update challenge progress
     */
    updateProgress(eventType: string, value: number = 1): void {
        if (!this.activeChallenge || this.activeChallenge.completedAt) return;

        const challenge = this.activeChallenge;
        let shouldUpdate = false;

        switch (challenge.type) {
            case 'survival_streak':
                if (eventType === 'survival_tick') {
                    challenge.progress = value; // Value is survival time in seconds
                    shouldUpdate = true;
                }
                break;

            case 'revenge_catch':
                if (eventType === 'catch' && value === 1) { // 1 = caught the right player
                    challenge.progress = 1;
                    shouldUpdate = true;
                }
                break;

            case 'escape_artist':
                if (eventType === 'close_escape') {
                    challenge.progress += value;
                    shouldUpdate = true;
                }
                break;

            case 'hunt_down':
                if (eventType === 'catch') {
                    challenge.progress += value;
                    shouldUpdate = true;
                }
                break;

            case 'momentum_build':
                if (eventType === 'pellet_collect') {
                    challenge.progress += value;
                    shouldUpdate = true;
                }
                break;

            case 'zone_control':
                if (eventType === 'zone_tick') {
                    challenge.progress = value;
                    shouldUpdate = true;
                }
                break;

            case 'comeback_king':
                if (eventType === 'score') {
                    challenge.progress += value;
                    shouldUpdate = true;
                }
                break;
        }

        if (shouldUpdate) {
            // Check completion
            if (challenge.progress >= challenge.target) {
                this.completeChallenge();
            } else {
                this.notifyChallengeUpdate();
            }
        }
    }

    /**
     * Complete active challenge
     */
    private completeChallenge(): void {
        if (!this.activeChallenge) return;

        this.activeChallenge.completedAt = Date.now();
        
        console.log('[RoleMechanics] Challenge completed:', this.activeChallenge.title);
        console.log('[RoleMechanics] Reward:', this.activeChallenge.reward);

        // Play completion effect
        this.playCompletionEffect(this.activeChallenge);

        // Notify
        this.notifyChallengeUpdate();

        // Clear after showing completion
        setTimeout(() => {
            this.activeChallenge = null;
            this.notifyChallengeUpdate();
        }, 3000);
    }

    /**
     * Play challenge completion effect
     */
    private playCompletionEffect(challenge: RoleChallenge): void {
        // Dispatch event for visual/audio systems
        window.dispatchEvent(new CustomEvent('mazechase:challenge_complete', {
            detail: {
                challenge,
                reward: challenge.reward
            }
        }));
    }

    /**
     * Update score for comeback detection
     */
    updateScore(score: number, averageScore: number): void {
        this._currentScore = score;
        this._averageScore = averageScore;

        // Detect comeback situation (significantly behind average)
        const wasComebackMode = this.isInComebackMode;
        this.isInComebackMode = score < averageScore * 0.5;

        if (this.isInComebackMode && !wasComebackMode) {
            console.log('[RoleMechanics] Entering comeback mode');
        }
    }

    /**
     * Get current active challenge
     */
    getActiveChallenge(): RoleChallenge | null {
        return this.activeChallenge;
    }

    /**
     * Get remaining time for active challenge
     */
    getChallengeRemainingTime(): number {
        if (!this.activeChallenge || !this.activeChallenge.timeLimit) return 0;
        
        const elapsed = Date.now() - this.activeChallenge.triggeredAt;
        return Math.max(0, this.activeChallenge.timeLimit - elapsed);
    }

    /**
     * Subscribe to challenge updates
     */
    onChallengeUpdate(callback: (challenge: RoleChallenge | null) => void): () => void {
        this.onChallengeCallbacks.push(callback);
        return () => {
            this.onChallengeCallbacks = this.onChallengeCallbacks.filter(cb => cb !== callback);
        };
    }

    // Private helpers
    private setupEventListeners(): void {
        // Listen for game events
        window.addEventListener('mazechase:role_switch', ((e: CustomEvent<RoleSwitchEvent>) => {
            this.handleRoleSwitch(e.detail);
        }) as EventListener);

        window.addEventListener('mazechase:pellet_collect', ((e: CustomEvent<{ count: number }>) => {
            this.updateProgress('pellet_collect', e.detail.count);
        }) as EventListener);

        window.addEventListener('mazechase:catch', ((e: CustomEvent<{ isRevenge: boolean }>) => {
            this.updateProgress('catch', e.detail.isRevenge ? 1 : 0);
        }) as EventListener);
    }

    private notifyChallengeUpdate(): void {
        this.onChallengeCallbacks.forEach(cb => cb(this.activeChallenge));
    }

    private randomInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// Singleton
let roleMechanicsManager: RoleMechanicsManager | null = null;

export function getRoleMechanicsManager(): RoleMechanicsManager {
    if (!roleMechanicsManager) {
        roleMechanicsManager = new RoleMechanicsManager();
    }
    return roleMechanicsManager;
}
