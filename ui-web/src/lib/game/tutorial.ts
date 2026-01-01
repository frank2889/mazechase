/**
 * Tutorial System - Onboarding for new players
 * Progressive disclosure of game features
 */

export interface TutorialStep {
    id: string;
    title: string;
    message: string;
    highlight?: string; // CSS selector to highlight
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: 'move' | 'eat' | 'powerup' | 'ghost' | 'win';
    condition?: () => boolean;
    delay?: number;
}

export interface TutorialState {
    completed: boolean;
    currentStep: number;
    stepsCompleted: string[];
    skipped: boolean;
    startedAt?: number;
    completedAt?: number;
}

const TUTORIAL_KEY = 'mazechase_tutorial';
const FEATURE_DISCOVERY_KEY = 'mazechase_features';

// Main tutorial steps for first-time players
// EMMSOAI (David): Reorganized for early "wow moment" - power-up demo in first 30 seconds
export const tutorialSteps: TutorialStep[] = [
    {
        id: 'welcome',
        title: '🎮 Welkom bij MazeChase!',
        message: 'Een snelle multiplayer maze game!',
        position: 'center',
        delay: 300 // Reduced from 500 for faster start
    },
    {
        id: 'controls',
        title: '🕹️ Besturing',
        message: 'PIJLTJES/WASD om te bewegen. Op mobiel: swipe!',
        position: 'bottom',
        highlight: '.game-canvas',
        delay: 0
    },
    {
        id: 'movement',
        title: '🏃 Beweeg!',
        message: 'Pak een paar pellets!',
        position: 'top',
        action: 'move',
        delay: 0
    },
    // EMMSOAI (David): Early "wow moment" - show power-up immediately after first move
    {
        id: 'powerup-wow',
        title: '⚡ POWER MODE!',
        message: 'Pak de grote pellet → je wordt ONVERSLAANBAAR en kunt spoken eten!',
        position: 'center',
        action: 'powerup',
        delay: 0
    },
    {
        id: 'pellets',
        title: '🟡 Verzamel Alles',
        message: 'Elke pellet = 10 punten. Eet ze allemaal om te winnen!',
        position: 'top',
        action: 'eat',
        delay: 0
    },
    {
        id: 'ghosts',
        title: '👻 Spoken',
        message: 'Zonder power-up: ontwijken! Met power-up: ETEN voor bonus punten!',
        position: 'top',
        highlight: '.ghost',
        delay: 0
    },
    {
        id: 'ready',
        title: '🚀 GO!',
        message: 'Je bent klaar! Veel succes!',
        position: 'center',
        delay: 0
    }
];

// Feature discovery tooltips (progressive disclosure)
export interface FeatureTip {
    id: string;
    title: string;
    message: string;
    triggerLevel: number; // Show after completing this many levels
    triggerGames?: number; // Or after this many games
    element?: string; // Element to attach tooltip to
}

export const featureTips: FeatureTip[] = [
    {
        id: 'daily-challenge',
        title: '📅 Daily Challenge',
        message: 'Voltooi dagelijkse uitdagingen voor extra coins!',
        triggerGames: 2,
        element: '.daily-challenge-btn'
    },
    {
        id: 'achievements',
        title: '🏆 Achievements',
        message: 'Ontgrendel badges en verdien beloningen!',
        triggerLevel: 2,
        element: '.achievements-btn'
    },
    {
        id: 'leaderboard',
        title: '📊 Leaderboard',
        message: 'Vergelijk je score met andere spelers!',
        triggerLevel: 3,
        element: '.leaderboard-btn'
    },
    {
        id: 'streak',
        title: '🔥 Streak Bonus',
        message: 'Speel elke dag voor streak bonussen!',
        triggerGames: 5,
        element: '.streak-display'
    },
    {
        id: 'invite-friends',
        title: '👥 Nodig Vrienden Uit',
        message: 'Nodig vrienden uit en krijg 50 coins per vriend!',
        triggerLevel: 5,
        element: '.invite-btn'
    },
    {
        id: 'shop',
        title: '🛍️ Shop',
        message: 'Koop power-ups en skins met je verdiende coins!',
        triggerGames: 10,
        element: '.shop-btn'
    }
];

// Get tutorial state from localStorage
export function getTutorialState(): TutorialState {
    try {
        const saved = localStorage.getItem(TUTORIAL_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load tutorial state:', e);
    }
    
    return {
        completed: false,
        currentStep: 0,
        stepsCompleted: [],
        skipped: false
    };
}

// Save tutorial state
export function saveTutorialState(state: TutorialState): void {
    try {
        localStorage.setItem(TUTORIAL_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save tutorial state:', e);
    }
}

// Check if tutorial should be shown
export function shouldShowTutorial(): boolean {
    const state = getTutorialState();
    return !state.completed && !state.skipped;
}

// Start tutorial
export function startTutorial(): TutorialState {
    const state: TutorialState = {
        completed: false,
        currentStep: 0,
        stepsCompleted: [],
        skipped: false,
        startedAt: Date.now()
    };
    saveTutorialState(state);
    return state;
}

// Get current tutorial step
export function getCurrentStep(): TutorialStep | null {
    const state = getTutorialState();
    if (state.completed || state.skipped || state.currentStep >= tutorialSteps.length) {
        return null;
    }
    return tutorialSteps[state.currentStep];
}

// Complete current step and advance
export function completeStep(stepId: string): TutorialStep | null {
    const state = getTutorialState();
    const currentStep = tutorialSteps[state.currentStep];
    
    if (!currentStep || currentStep.id !== stepId) {
        return null;
    }
    
    state.stepsCompleted.push(stepId);
    state.currentStep++;
    
    // Check if tutorial is complete
    if (state.currentStep >= tutorialSteps.length) {
        state.completed = true;
        state.completedAt = Date.now();
        saveTutorialState(state);
        
        // Emit tutorial completed event
        window.dispatchEvent(new CustomEvent('tutorial-completed', {
            detail: {
                duration: state.completedAt - (state.startedAt || state.completedAt),
                stepsCompleted: state.stepsCompleted.length
            }
        }));
        
        return null;
    }
    
    saveTutorialState(state);
    return tutorialSteps[state.currentStep];
}

// Skip tutorial
export function skipTutorial(): void {
    const state = getTutorialState();
    state.skipped = true;
    saveTutorialState(state);
    
    window.dispatchEvent(new CustomEvent('tutorial-skipped', {
        detail: { stepReached: state.currentStep }
    }));
}

// Reset tutorial (for testing or replay)
export function resetTutorial(): void {
    localStorage.removeItem(TUTORIAL_KEY);
}

// Feature discovery system
export function getDiscoveredFeatures(): string[] {
    try {
        const saved = localStorage.getItem(FEATURE_DISCOVERY_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load discovered features:', e);
    }
    return [];
}

export function markFeatureDiscovered(featureId: string): void {
    const discovered = getDiscoveredFeatures();
    if (!discovered.includes(featureId)) {
        discovered.push(featureId);
        try {
            localStorage.setItem(FEATURE_DISCOVERY_KEY, JSON.stringify(discovered));
        } catch (e) {
            console.error('Failed to save discovered features:', e);
        }
    }
}

// Get undiscovered features that should be shown
export function getNewFeaturesToShow(completedLevels: number, totalGames: number): FeatureTip[] {
    const discovered = getDiscoveredFeatures();
    
    return featureTips.filter(tip => {
        // Already discovered
        if (discovered.includes(tip.id)) return false;
        
        // Check trigger conditions
        const levelMet = tip.triggerLevel !== undefined && completedLevels >= tip.triggerLevel;
        const gamesMet = tip.triggerGames !== undefined && totalGames >= tip.triggerGames;
        
        return levelMet || gamesMet;
    });
}

// Visual tutorial helpers
export function highlightElement(selector: string): () => void {
    const element = document.querySelector(selector);
    if (!element) return () => {};
    
    // Add highlight overlay
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-highlight-overlay';
    overlay.innerHTML = `
        <style>
            .tutorial-highlight-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                pointer-events: none;
                z-index: 9998;
            }
            .tutorial-spotlight {
                position: absolute;
                box-shadow: 0 0 0 9999px rgba(0,0,0,0.7);
                border-radius: 8px;
                pointer-events: auto;
                animation: pulse-highlight 1.5s ease-in-out infinite;
            }
            @keyframes pulse-highlight {
                0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px 5px rgba(139, 92, 246, 0.5); }
                50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.7), 0 0 30px 10px rgba(139, 92, 246, 0.7); }
            }
        </style>
    `;
    
    const spotlight = document.createElement('div');
    spotlight.className = 'tutorial-spotlight';
    
    const rect = element.getBoundingClientRect();
    spotlight.style.cssText = `
        top: ${rect.top - 8}px;
        left: ${rect.left - 8}px;
        width: ${rect.width + 16}px;
        height: ${rect.height + 16}px;
    `;
    
    overlay.appendChild(spotlight);
    document.body.appendChild(overlay);
    
    // Return cleanup function
    return () => {
        overlay.remove();
    };
}

// Create tooltip
export function createTooltip(
    message: string,
    target: Element | null,
    position: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom'
): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = `tutorial-tooltip tutorial-tooltip-${position}`;
    tooltip.innerHTML = message;
    
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #8B5CF6, #6D28D9);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 16px;
        max-width: 300px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        z-index: 9999;
        animation: tooltip-in 0.3s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tooltip-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .tutorial-tooltip::after {
            content: '';
            position: absolute;
            border: 8px solid transparent;
        }
        .tutorial-tooltip-bottom::after {
            top: -16px;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: #8B5CF6;
        }
        .tutorial-tooltip-top::after {
            bottom: -16px;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: #8B5CF6;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(tooltip);
    
    // Position tooltip
    if (target) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        switch (position) {
            case 'bottom':
                tooltip.style.top = `${rect.bottom + 16}px`;
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
                break;
            case 'top':
                tooltip.style.top = `${rect.top - tooltipRect.height - 16}px`;
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
                break;
            case 'left':
                tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
                tooltip.style.left = `${rect.left - tooltipRect.width - 16}px`;
                break;
            case 'right':
                tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
                tooltip.style.left = `${rect.right + 16}px`;
                break;
            case 'center':
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                break;
        }
    } else {
        // Center in viewport
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }
    
    return tooltip;
}

// ============================================
// INTERACTIVE TUTORIAL ELEMENTS
// EMMSOAI Suggestion (David - UX Researcher):
// "Introduce interactive tutorial segments for power-up usage"
// ============================================

export interface InteractiveTutorialStep {
    id: string;
    type: 'demo' | 'practice' | 'challenge';
    title: string;
    instruction: string;
    targetAction: string;
    successMessage: string;
    failMessage?: string;
    timeLimit?: number; // seconds
    retryAllowed: boolean;
    reward?: { coins: number; xp: number };
}

export const interactiveTutorialSteps: InteractiveTutorialStep[] = [
    {
        id: 'move-practice',
        type: 'practice',
        title: '🕹️ Beweeg Training',
        instruction: 'Beweeg naar het groene doel!',
        targetAction: 'reach_target',
        successMessage: '🎉 Perfect! Je beheerst de besturing!',
        timeLimit: 15,
        retryAllowed: true,
        reward: { coins: 10, xp: 5 }
    },
    {
        id: 'pellet-collect',
        type: 'practice',
        title: '🟡 Verzamel Pellets',
        instruction: 'Verzamel 5 pellets zo snel mogelijk!',
        targetAction: 'collect_5_pellets',
        successMessage: '⭐ Geweldig! Je hebt 5 pellets verzameld!',
        timeLimit: 20,
        retryAllowed: true,
        reward: { coins: 20, xp: 10 }
    },
    {
        id: 'powerup-demo',
        type: 'demo',
        title: '⚡ Power-Up Demo',
        instruction: 'Kijk hoe power-ups werken! Pak de grote pellet.',
        targetAction: 'collect_powerup',
        successMessage: '💪 WOW! Je bent nu onverslaanbaar!',
        retryAllowed: false,
        reward: { coins: 25, xp: 15 }
    },
    {
        id: 'ghost-catch',
        type: 'challenge',
        title: '👻 Vang een Spook!',
        instruction: 'Met je power-up actief, vang een spook!',
        targetAction: 'catch_ghost',
        successMessage: '🏆 AMAZING! Je at een spook!',
        failMessage: 'Oeps! Probeer het opnieuw met een power-up.',
        timeLimit: 30,
        retryAllowed: true,
        reward: { coins: 50, xp: 25 }
    },
    {
        id: 'escape-challenge',
        type: 'challenge',
        title: '🏃 Ontsnapping!',
        instruction: 'Ontwijken! Blijf 10 seconden uit de buurt van spoken.',
        targetAction: 'survive_10s',
        successMessage: '🌟 Superstar! Je bent een meester in ontwijken!',
        failMessage: 'Je werd gepakt! Timing is alles.',
        timeLimit: 15,
        retryAllowed: true,
        reward: { coins: 30, xp: 20 }
    }
];

export interface InteractiveTutorialState {
    currentStep: number;
    stepStartTime: number | null;
    attempts: number;
    completed: string[];
    totalRewards: { coins: number; xp: number };
}

const INTERACTIVE_TUTORIAL_KEY = 'mazechase_interactive_tutorial';

export function getInteractiveTutorialState(): InteractiveTutorialState {
    try {
        const saved = localStorage.getItem(INTERACTIVE_TUTORIAL_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Failed to load interactive tutorial state:', e);
    }
    return {
        currentStep: 0,
        stepStartTime: null,
        attempts: 0,
        completed: [],
        totalRewards: { coins: 0, xp: 0 }
    };
}

export function saveInteractiveTutorialState(state: InteractiveTutorialState): void {
    try {
        localStorage.setItem(INTERACTIVE_TUTORIAL_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save interactive tutorial state:', e);
    }
}

export function startInteractiveStep(stepId: string): InteractiveTutorialStep | null {
    const step = interactiveTutorialSteps.find(s => s.id === stepId);
    if (!step) return null;
    
    const state = getInteractiveTutorialState();
    state.stepStartTime = Date.now();
    state.attempts++;
    saveInteractiveTutorialState(state);
    
    // Show instruction UI
    showInteractiveInstruction(step);
    
    return step;
}

export function completeInteractiveStep(stepId: string, success: boolean): void {
    const step = interactiveTutorialSteps.find(s => s.id === stepId);
    if (!step) return;
    
    const state = getInteractiveTutorialState();
    
    if (success) {
        if (!state.completed.includes(stepId)) {
            state.completed.push(stepId);
            
            // Award rewards
            if (step.reward) {
                state.totalRewards.coins += step.reward.coins;
                state.totalRewards.xp += step.reward.xp;
                
                // Emit reward event
                window.dispatchEvent(new CustomEvent('tutorial-reward', {
                    detail: step.reward
                }));
            }
        }
        
        showInteractiveSuccess(step);
    } else if (step.failMessage) {
        showInteractiveFailure(step);
    }
    
    state.stepStartTime = null;
    saveInteractiveTutorialState(state);
}

function showInteractiveInstruction(step: InteractiveTutorialStep): void {
    const existing = document.getElementById('interactive-tutorial-ui');
    if (existing) existing.remove();
    
    const ui = document.createElement('div');
    ui.id = 'interactive-tutorial-ui';
    ui.innerHTML = `
        <div class="interactive-tutorial-banner">
            <div class="tutorial-type-badge ${step.type}">${step.type.toUpperCase()}</div>
            <h2>${step.title}</h2>
            <p>${step.instruction}</p>
            ${step.timeLimit ? `<div class="tutorial-timer">⏱️ <span id="tutorial-countdown">${step.timeLimit}</span>s</div>` : ''}
            ${step.reward ? `<div class="tutorial-reward">🎁 +${step.reward.coins} coins, +${step.reward.xp} XP</div>` : ''}
        </div>
    `;
    ui.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        pointer-events: none;
    `;
    
    document.body.appendChild(ui);
    
    // Start countdown if time limit exists
    if (step.timeLimit) {
        let remaining = step.timeLimit;
        const countdown = document.getElementById('tutorial-countdown');
        const timer = setInterval(() => {
            remaining--;
            if (countdown) countdown.textContent = String(remaining);
            if (remaining <= 0) {
                clearInterval(timer);
                completeInteractiveStep(step.id, false);
            }
        }, 1000);
    }
}

function showInteractiveSuccess(step: InteractiveTutorialStep): void {
    const existing = document.getElementById('interactive-tutorial-ui');
    if (existing) existing.remove();
    
    const ui = document.createElement('div');
    ui.id = 'interactive-tutorial-success';
    ui.innerHTML = `
        <div class="tutorial-success-popup">
            <h2>${step.successMessage}</h2>
            ${step.reward ? `<p class="reward-text">+${step.reward.coins} 🪙 +${step.reward.xp} ⭐</p>` : ''}
        </div>
    `;
    ui.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2000;
        animation: tutorialSuccessPop 0.5s ease-out;
    `;
    
    document.body.appendChild(ui);
    
    setTimeout(() => ui.remove(), 2000);
}

function showInteractiveFailure(step: InteractiveTutorialStep): void {
    const existing = document.getElementById('interactive-tutorial-ui');
    if (existing) existing.remove();
    
    if (!step.failMessage) return;
    
    const ui = document.createElement('div');
    ui.id = 'interactive-tutorial-fail';
    ui.innerHTML = `
        <div class="tutorial-fail-popup">
            <h2>${step.failMessage}</h2>
            ${step.retryAllowed ? '<p>Klik om opnieuw te proberen</p>' : ''}
        </div>
    `;
    ui.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2000;
    `;
    
    document.body.appendChild(ui);
    
    setTimeout(() => ui.remove(), 2500);
}

// Add CSS for interactive tutorial
const interactiveStyle = document.createElement('style');
interactiveStyle.textContent = `
    .interactive-tutorial-banner {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #8B5CF6;
        border-radius: 16px;
        padding: 20px 30px;
        text-align: center;
        color: white;
        box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
    }
    .tutorial-type-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: bold;
        margin-bottom: 8px;
    }
    .tutorial-type-badge.demo { background: #3B82F6; }
    .tutorial-type-badge.practice { background: #10B981; }
    .tutorial-type-badge.challenge { background: #F59E0B; }
    .interactive-tutorial-banner h2 {
        margin: 0 0 8px 0;
        font-size: 1.4rem;
    }
    .interactive-tutorial-banner p {
        margin: 0 0 12px 0;
        opacity: 0.9;
    }
    .tutorial-timer {
        font-size: 1.2rem;
        color: #F59E0B;
    }
    .tutorial-reward {
        font-size: 0.9rem;
        color: #10B981;
        margin-top: 8px;
    }
    .tutorial-success-popup {
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        border-radius: 20px;
        padding: 30px 50px;
        text-align: center;
        color: white;
        box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);
    }
    .tutorial-success-popup h2 {
        margin: 0;
        font-size: 1.8rem;
    }
    .reward-text {
        font-size: 1.4rem;
        margin-top: 10px;
    }
    .tutorial-fail-popup {
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        border-radius: 20px;
        padding: 30px 50px;
        text-align: center;
        color: white;
        box-shadow: 0 20px 60px rgba(239, 68, 68, 0.4);
    }
    @keyframes tutorialSuccessPop {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.1); }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
`;
document.head.appendChild(interactiveStyle);
