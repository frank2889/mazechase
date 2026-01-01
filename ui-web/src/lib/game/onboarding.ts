/**
 * Onboarding System - First Time User Experience (FTUE)
 * 
 * AI Tester Suggestion (David - UX Researcher & Retention Specialist):
 * "Simplify initial learning objectives to focus exclusively on movement and pellet collection.
 * Players should not be overwhelmed - get them playing fast!"
 * 
 * Philosophy: "Show, don't tell" - Learn by doing
 * 
 * Progressive Disclosure:
 * 1. First game: Just movement and pellets
 * 2. Second game: Introduce chasers
 * 3. Third game: Power-ups
 * 4. Fourth game: Multiplayer features
 */

export interface OnboardingStep {
    id: string;
    type: 'highlight' | 'tooltip' | 'modal' | 'hands-on' | 'celebration';
    target?: string; // DOM selector or game element
    title: string;
    description: string;
    action?: string; // Required action to proceed
    skipable?: boolean;
    duration?: number; // Auto-proceed after ms
}

export interface OnboardingStage {
    id: string;
    name: string;
    steps: OnboardingStep[];
    completionReward?: { coins?: number; gems?: number; item?: string };
    prerequisite?: string; // Previous stage ID
}

export interface OnboardingProgress {
    currentStage: string;
    completedStages: string[];
    currentStep: number;
    totalGamesPlayed: number;
    hasSeenChasers: boolean;
    hasUsedPowerUp: boolean;
    hasPlayedMultiplayer: boolean;
    isComplete: boolean;
}

const STORAGE_KEY = 'mazechase_onboarding';

// Simplified stages for new players
const ONBOARDING_STAGES: OnboardingStage[] = [
    {
        id: 'welcome',
        name: 'Welcome',
        steps: [
            {
                id: 'welcome_1',
                type: 'modal',
                title: 'Welcome to MazeChase! 🎮',
                description: "Collect pellets, avoid chasers, survive! Let's start simple.",
                skipable: true
            }
        ],
        completionReward: { coins: 50 }
    },
    {
        id: 'movement',
        name: 'Basic Movement',
        steps: [
            {
                id: 'move_1',
                type: 'hands-on',
                title: 'Move Around',
                description: 'Use arrow keys or swipe to move',
                action: 'move_10_tiles'
            },
            {
                id: 'move_2',
                type: 'celebration',
                title: 'Great! 🎉',
                description: "You've got the basics!",
                duration: 1500
            }
        ],
        completionReward: { coins: 25 }
    },
    {
        id: 'collecting',
        name: 'Collect Pellets',
        steps: [
            {
                id: 'collect_1',
                type: 'highlight',
                target: 'pellet',
                title: 'Collect These!',
                description: 'Move over pellets to collect them'
            },
            {
                id: 'collect_2',
                type: 'hands-on',
                title: 'Collect 5 Pellets',
                description: 'Go get some pellets!',
                action: 'collect_5_pellets'
            },
            {
                id: 'collect_3',
                type: 'celebration',
                title: 'Yummy! 🍪',
                description: 'Each pellet = points!',
                duration: 1500
            }
        ],
        completionReward: { coins: 50 }
    },
    {
        id: 'chasers',
        name: 'Meet the Chasers',
        prerequisite: 'collecting',
        steps: [
            {
                id: 'chaser_1',
                type: 'highlight',
                target: 'chaser',
                title: 'Watch Out! 👻',
                description: 'Chasers will hunt you - avoid them!'
            },
            {
                id: 'chaser_2',
                type: 'hands-on',
                title: 'Survive 10 Seconds',
                description: 'Stay away from the chasers!',
                action: 'survive_10s'
            },
            {
                id: 'chaser_3',
                type: 'celebration',
                title: 'Survivor! 💪',
                description: "You're getting good at this!",
                duration: 1500
            }
        ],
        completionReward: { coins: 75 }
    },
    {
        id: 'powerups',
        name: 'Power-Ups',
        prerequisite: 'chasers',
        steps: [
            {
                id: 'power_1',
                type: 'highlight',
                target: 'powerup',
                title: 'Power Pellets! ⚡',
                description: 'These make you invincible briefly'
            },
            {
                id: 'power_2',
                type: 'tooltip',
                target: 'powerup',
                title: 'Try It!',
                description: 'Grab a power pellet and chase the chasers!'
            },
            {
                id: 'power_3',
                type: 'hands-on',
                title: 'Use a Power-Up',
                description: 'Collect a power pellet',
                action: 'use_powerup'
            },
            {
                id: 'power_4',
                type: 'celebration',
                title: 'Unstoppable! 🌟',
                description: 'Now you know the power!',
                duration: 2000
            }
        ],
        completionReward: { coins: 100, gems: 5 }
    },
    {
        id: 'complete',
        name: 'Ready to Play!',
        prerequisite: 'powerups',
        steps: [
            {
                id: 'complete_1',
                type: 'modal',
                title: "You're Ready! 🏆",
                description: 'You know the basics - now go for the high score!',
                skipable: false
            }
        ],
        completionReward: { coins: 200, gems: 10, item: 'onboarding_trail' }
    }
];

/**
 * Onboarding Manager
 */
export class OnboardingManager {
    private progress: OnboardingProgress;
    private currentStage: OnboardingStage | null = null;
    private onStepCallback?: (step: OnboardingStep) => void;
    private onCompleteCallback?: (rewards: OnboardingStage['completionReward']) => void;
    private onProgressCallback?: (progress: OnboardingProgress) => void;

    constructor() {
        this.progress = this.loadProgress();
        this.currentStage = this.getCurrentStage();
    }

    private loadProgress(): OnboardingProgress {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[Onboarding] Failed to load progress:', e);
        }

        return {
            currentStage: 'welcome',
            completedStages: [],
            currentStep: 0,
            totalGamesPlayed: 0,
            hasSeenChasers: false,
            hasUsedPowerUp: false,
            hasPlayedMultiplayer: false,
            isComplete: false
        };
    }

    private saveProgress(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
        } catch (e) {
            console.warn('[Onboarding] Failed to save progress:', e);
        }
    }

    private getCurrentStage(): OnboardingStage | null {
        return ONBOARDING_STAGES.find(s => s.id === this.progress.currentStage) || null;
    }

    /**
     * Start onboarding flow
     */
    start(): void {
        if (this.progress.isComplete) {
            console.log('[Onboarding] Already complete');
            return;
        }

        this.currentStage = this.getCurrentStage();
        if (this.currentStage) {
            this.showStep(this.progress.currentStep);
        }
    }

    /**
     * Show current step
     */
    private showStep(stepIndex: number): void {
        if (!this.currentStage) return;

        const step = this.currentStage.steps[stepIndex];
        if (step) {
            console.log('[Onboarding] Showing step:', step.id);
            this.onStepCallback?.(step);

            // Auto-proceed for celebration/timed steps
            if (step.duration) {
                setTimeout(() => this.nextStep(), step.duration);
            }
        }
    }

    /**
     * Advance to next step
     */
    nextStep(): void {
        if (!this.currentStage) return;

        this.progress.currentStep++;

        if (this.progress.currentStep >= this.currentStage.steps.length) {
            // Stage complete
            this.completeStage();
        } else {
            this.showStep(this.progress.currentStep);
        }

        this.saveProgress();
        this.onProgressCallback?.(this.progress);
    }

    /**
     * Complete current stage
     */
    private completeStage(): void {
        if (!this.currentStage) return;

        console.log('[Onboarding] Completed stage:', this.currentStage.id);
        this.progress.completedStages.push(this.currentStage.id);

        // Grant rewards
        if (this.currentStage.completionReward) {
            this.onCompleteCallback?.(this.currentStage.completionReward);
        }

        // Find next stage
        const currentIndex = ONBOARDING_STAGES.findIndex(s => s.id === this.currentStage!.id);
        const nextStage = ONBOARDING_STAGES[currentIndex + 1];

        if (nextStage) {
            this.progress.currentStage = nextStage.id;
            this.progress.currentStep = 0;
            this.currentStage = nextStage;
            
            // Start next stage after delay
            setTimeout(() => this.showStep(0), 500);
        } else {
            // All stages complete
            this.progress.isComplete = true;
            console.log('[Onboarding] All stages complete!');
        }

        this.saveProgress();
    }

    /**
     * Report an in-game action for progression
     */
    reportAction(action: string): void {
        if (!this.currentStage) return;

        const currentStep = this.currentStage.steps[this.progress.currentStep];
        if (currentStep?.action === action) {
            console.log('[Onboarding] Action completed:', action);
            this.nextStep();
        }

        // Update progress flags
        switch (action) {
            case 'saw_chaser':
                this.progress.hasSeenChasers = true;
                break;
            case 'use_powerup':
                this.progress.hasUsedPowerUp = true;
                break;
            case 'played_multiplayer':
                this.progress.hasPlayedMultiplayer = true;
                break;
        }

        this.saveProgress();
    }

    /**
     * Increment games played counter
     */
    gameCompleted(): void {
        this.progress.totalGamesPlayed++;
        this.saveProgress();
    }

    /**
     * Skip current step (if allowed)
     */
    skipStep(): void {
        if (!this.currentStage) return;

        const currentStep = this.currentStage.steps[this.progress.currentStep];
        if (currentStep?.skipable !== false) {
            this.nextStep();
        }
    }

    /**
     * Skip entire onboarding (for returning players)
     */
    skipOnboarding(): void {
        this.progress.isComplete = true;
        this.progress.completedStages = ONBOARDING_STAGES.map(s => s.id);
        this.currentStage = null;
        this.saveProgress();
    }

    /**
     * Check if onboarding is complete
     */
    isComplete(): boolean {
        return this.progress.isComplete;
    }

    /**
     * Get current progress
     */
    getProgress(): OnboardingProgress {
        return { ...this.progress };
    }

    /**
     * Check if a specific feature should be shown
     */
    shouldShowFeature(feature: string): boolean {
        switch (feature) {
            case 'shop':
                return this.progress.totalGamesPlayed >= 2;
            case 'leaderboard':
                return this.progress.totalGamesPlayed >= 3;
            case 'challenges':
                return this.progress.completedStages.includes('powerups');
            case 'multiplayer':
                return this.progress.completedStages.includes('chasers');
            default:
                return this.progress.isComplete;
        }
    }

    // Event registration
    onStep(callback: (step: OnboardingStep) => void): void {
        this.onStepCallback = callback;
    }

    onStageComplete(callback: (rewards: OnboardingStage['completionReward']) => void): void {
        this.onCompleteCallback = callback;
    }

    onProgress(callback: (progress: OnboardingProgress) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * Reset onboarding (for testing)
     */
    reset(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.progress = this.loadProgress();
        this.currentStage = this.getCurrentStage();
    }
}

// Singleton
let onboardingManager: OnboardingManager | null = null;

export function getOnboardingManager(): OnboardingManager {
    if (!onboardingManager) {
        onboardingManager = new OnboardingManager();
    }
    return onboardingManager;
}

/**
 * Quick check for new players
 */
export function isNewPlayer(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return !stored;
    } catch {
        return true;
    }
}

/**
 * Animated Tutorial System
 * 
 * AI Tester Suggestion (David - UX Researcher):
 * "Voeg geanimeerde tutorials toe met visuele cues.
 * Voor een betere eerste indruk."
 * 
 * Features animated overlays and visual guides
 */
export interface AnimatedTutorial {
    id: string;
    title: string;
    frames: TutorialFrame[];
    autoAdvance: boolean;
    showSkip: boolean;
}

export interface TutorialFrame {
    type: 'animation' | 'highlight' | 'arrow' | 'hand';
    target?: string;
    position?: { x: number; y: number };
    animation: TutorialAnimation;
    text?: string;
    duration: number;
}

export interface TutorialAnimation {
    type: 'pulse' | 'bounce' | 'glow' | 'slide' | 'fade' | 'point' | 'circle';
    duration: number;
    repeat: boolean;
    easing: 'linear' | 'easeInOut' | 'bounce';
}

const ANIMATED_TUTORIALS: Record<string, AnimatedTutorial> = {
    movement: {
        id: 'movement',
        title: 'Learn to Move',
        autoAdvance: true,
        showSkip: true,
        frames: [
            {
                type: 'hand',
                position: { x: 50, y: 50 },
                animation: { type: 'slide', duration: 1000, repeat: true, easing: 'easeInOut' },
                text: 'Swipe to move',
                duration: 2000
            },
            {
                type: 'highlight',
                target: 'player',
                animation: { type: 'pulse', duration: 500, repeat: true, easing: 'easeInOut' },
                text: 'This is you!',
                duration: 1500
            },
            {
                type: 'arrow',
                target: 'pellet',
                animation: { type: 'bounce', duration: 400, repeat: true, easing: 'bounce' },
                text: 'Collect the pellets',
                duration: 2000
            }
        ]
    },
    chasers: {
        id: 'chasers',
        title: 'Watch Out!',
        autoAdvance: true,
        showSkip: true,
        frames: [
            {
                type: 'highlight',
                target: 'chaser',
                animation: { type: 'glow', duration: 600, repeat: true, easing: 'easeInOut' },
                text: 'These are chasers!',
                duration: 2000
            },
            {
                type: 'animation',
                animation: { type: 'circle', duration: 2000, repeat: false, easing: 'linear' },
                text: 'They will chase you...',
                duration: 2000
            },
            {
                type: 'arrow',
                position: { x: 80, y: 20 },
                animation: { type: 'point', duration: 500, repeat: true, easing: 'easeInOut' },
                text: 'Stay away to survive!',
                duration: 1500
            }
        ]
    },
    powerups: {
        id: 'powerups',
        title: 'Power Up!',
        autoAdvance: true,
        showSkip: true,
        frames: [
            {
                type: 'highlight',
                target: 'powerup',
                animation: { type: 'pulse', duration: 400, repeat: true, easing: 'bounce' },
                text: 'Grab power pellets!',
                duration: 2000
            },
            {
                type: 'animation',
                animation: { type: 'fade', duration: 800, repeat: false, easing: 'linear' },
                text: 'You become invincible!',
                duration: 1500
            },
            {
                type: 'arrow',
                target: 'chaser',
                animation: { type: 'slide', duration: 600, repeat: true, easing: 'easeInOut' },
                text: 'Now YOU chase THEM!',
                duration: 2000
            }
        ]
    }
};

/**
 * AnimatedTutorialPlayer - Plays animated tutorials
 */
export class AnimatedTutorialPlayer {
    private currentTutorial: AnimatedTutorial | null = null;
    private currentFrame: number = 0;
    private isPlaying: boolean = false;
    private animationFrame: number | null = null;
    private frameTimeout: number | null = null;
    private onCompleteCallback: (() => void) | null = null;
    private onFrameCallback: ((frame: TutorialFrame) => void) | null = null;

    /**
     * Play a tutorial by ID
     */
    play(tutorialId: string, onComplete?: () => void): void {
        const tutorial = ANIMATED_TUTORIALS[tutorialId];
        if (!tutorial) {
            console.warn(`[AnimatedTutorial] Unknown tutorial: ${tutorialId}`);
            return;
        }

        this.currentTutorial = tutorial;
        this.currentFrame = 0;
        this.isPlaying = true;
        this.onCompleteCallback = onComplete || null;

        console.log(`[AnimatedTutorial] Playing: ${tutorial.title}`);
        this.playFrame();
    }

    /**
     * Play current frame
     */
    private playFrame(): void {
        if (!this.currentTutorial || !this.isPlaying) return;

        const frame = this.currentTutorial.frames[this.currentFrame];
        if (!frame) {
            this.complete();
            return;
        }

        // Notify frame change
        if (this.onFrameCallback) {
            this.onFrameCallback(frame);
        }

        // Dispatch event for UI rendering
        window.dispatchEvent(new CustomEvent('mazechase:tutorial_frame', {
            detail: { frame, index: this.currentFrame, total: this.currentTutorial.frames.length }
        }));

        // Auto-advance if enabled
        if (this.currentTutorial.autoAdvance) {
            this.frameTimeout = window.setTimeout(() => {
                this.nextFrame();
            }, frame.duration);
        }
    }

    /**
     * Advance to next frame
     */
    nextFrame(): void {
        if (!this.currentTutorial) return;

        this.currentFrame++;
        if (this.currentFrame >= this.currentTutorial.frames.length) {
            this.complete();
        } else {
            this.playFrame();
        }
    }

    /**
     * Skip tutorial
     */
    skip(): void {
        console.log('[AnimatedTutorial] Skipped');
        this.complete();
    }

    /**
     * Complete tutorial
     */
    private complete(): void {
        this.isPlaying = false;
        
        if (this.frameTimeout) {
            clearTimeout(this.frameTimeout);
            this.frameTimeout = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        window.dispatchEvent(new CustomEvent('mazechase:tutorial_complete', {
            detail: { tutorialId: this.currentTutorial?.id }
        }));

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }

        this.currentTutorial = null;
    }

    /**
     * Set frame callback
     */
    onFrame(callback: (frame: TutorialFrame) => void): void {
        this.onFrameCallback = callback;
    }

    /**
     * Check if playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get available tutorials
     */
    static getAvailableTutorials(): string[] {
        return Object.keys(ANIMATED_TUTORIALS);
    }
}

// Export singleton
let tutorialPlayer: AnimatedTutorialPlayer | null = null;

export function getAnimatedTutorialPlayer(): AnimatedTutorialPlayer {
    if (!tutorialPlayer) {
        tutorialPlayer = new AnimatedTutorialPlayer();
    }
    return tutorialPlayer;
}
