/**
 * TutorialOverlay - Interactive onboarding for new players
 */

import { type Component, Show, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { 
    shouldShowTutorial, 
    startTutorial, 
    getCurrentStep, 
    completeStep, 
    skipTutorial,
    getTutorialState,
    type TutorialStep
} from '../lib/game/tutorial';

interface TutorialOverlayProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

const TutorialOverlay: Component<TutorialOverlayProps> = (props) => {
    const [visible, setVisible] = createSignal(false);
    const [currentStep, setCurrentStep] = createSignal<TutorialStep | null>(null);
    const [progress, setProgress] = createSignal(0);
    const [totalSteps] = createSignal(7);
    const [isAnimating, setIsAnimating] = createSignal(false);
    
    let cleanupHighlight: (() => void) | null = null;
    
    onMount(() => {
        if (shouldShowTutorial()) {
            startTutorial();
            const step = getCurrentStep();
            if (step) {
                setCurrentStep(step);
                setVisible(true);
                updateProgress();
                
                // Delay first step for game to load
                if (step.delay) {
                    setIsAnimating(true);
                    setTimeout(() => setIsAnimating(false), step.delay);
                }
            }
        }
        
        // Listen for game events to auto-advance tutorial
        window.addEventListener('player-moved', handlePlayerMoved);
        window.addEventListener('pellet-eaten', handlePelletEaten);
        window.addEventListener('powerup-eaten', handlePowerupEaten);
        window.addEventListener('ghost-eaten', handleGhostEaten);
        window.addEventListener('level-complete', handleLevelComplete);
    });
    
    onCleanup(() => {
        if (cleanupHighlight) cleanupHighlight();
        window.removeEventListener('player-moved', handlePlayerMoved);
        window.removeEventListener('pellet-eaten', handlePelletEaten);
        window.removeEventListener('powerup-eaten', handlePowerupEaten);
        window.removeEventListener('ghost-eaten', handleGhostEaten);
        window.removeEventListener('level-complete', handleLevelComplete);
    });
    
    const updateProgress = () => {
        const state = getTutorialState();
        setProgress(state.currentStep);
    };
    
    const handleNext = () => {
        if (isAnimating()) return;
        
        const step = currentStep();
        if (!step) return;
        
        if (cleanupHighlight) {
            cleanupHighlight();
            cleanupHighlight = null;
        }
        
        const nextStep = completeStep(step.id);
        updateProgress();
        
        if (nextStep) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(nextStep);
                setIsAnimating(false);
                applyHighlight(nextStep);
            }, 300);
        } else {
            // Tutorial complete
            setVisible(false);
            props.onComplete?.();
        }
    };
    
    const handleSkip = () => {
        if (cleanupHighlight) cleanupHighlight();
        skipTutorial();
        setVisible(false);
        props.onSkip?.();
    };
    
    const applyHighlight = (step: TutorialStep) => {
        if (step.highlight) {
            const element = document.querySelector(step.highlight);
            if (element) {
                // Add spotlight effect
                element.classList.add('tutorial-spotlight-target');
                cleanupHighlight = () => {
                    element.classList.remove('tutorial-spotlight-target');
                };
            }
        }
    };
    
    // Event handlers for auto-advancing
    const handlePlayerMoved = () => {
        const step = currentStep();
        if (step?.action === 'move') {
            handleNext();
        }
    };
    
    const handlePelletEaten = () => {
        const step = currentStep();
        if (step?.action === 'eat') {
            handleNext();
        }
    };
    
    const handlePowerupEaten = () => {
        const step = currentStep();
        if (step?.action === 'powerup') {
            handleNext();
        }
    };
    
    const handleGhostEaten = () => {
        const step = currentStep();
        if (step?.action === 'ghost') {
            handleNext();
        }
    };
    
    const handleLevelComplete = () => {
        const step = currentStep();
        if (step?.action === 'win') {
            handleNext();
        }
    };
    
    // Get position styles
    const getPositionStyle = (position: string) => {
        switch (position) {
            case 'top':
                return 'top: 100px; left: 50%; transform: translateX(-50%);';
            case 'bottom':
                return 'bottom: 120px; left: 50%; transform: translateX(-50%);';
            case 'left':
                return 'top: 50%; left: 100px; transform: translateY(-50%);';
            case 'right':
                return 'top: 50%; right: 100px; transform: translateY(-50%);';
            case 'center':
            default:
                return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        }
    };
    
    return (
        <Show when={visible() && currentStep()}>
            <div class="tutorial-overlay">
                {/* Backdrop for center modals */}
                <Show when={currentStep()?.position === 'center'}>
                    <div class="tutorial-backdrop" onClick={handleSkip}></div>
                </Show>
                
                {/* Tutorial Card */}
                <div 
                    class={`tutorial-card ${isAnimating() ? 'animating' : ''}`}
                    style={getPositionStyle(currentStep()?.position || 'center')}
                >
                    {/* Progress indicator */}
                    <div class="tutorial-progress">
                        <div class="progress-dots">
                            {Array.from({ length: totalSteps() }, (_, i) => (
                                <span class={`dot ${i < progress() ? 'completed' : ''} ${i === progress() ? 'active' : ''}`}></span>
                            ))}
                        </div>
                        <span class="step-count">{progress() + 1}/{totalSteps()}</span>
                    </div>
                    
                    {/* Content */}
                    <h2 class="tutorial-title">{currentStep()?.title}</h2>
                    <p class="tutorial-message">{currentStep()?.message}</p>
                    
                    {/* Buttons */}
                    <div class="tutorial-actions">
                        <button class="skip-btn" onClick={handleSkip}>
                            Overslaan
                        </button>
                        <button class="next-btn" onClick={handleNext}>
                            {progress() === totalSteps() - 1 ? 'Start Spel' : 'Volgende'} →
                        </button>
                    </div>
                    
                    {/* Keyboard hint */}
                    <Show when={currentStep()?.action}>
                        <div class="action-hint">
                            <span class="hint-icon">💡</span>
                            <span class="hint-text">
                                {currentStep()?.action === 'move' && 'Druk op een pijltjestoets om verder te gaan'}
                                {currentStep()?.action === 'eat' && 'Eet een pellet om verder te gaan'}
                                {currentStep()?.action === 'powerup' && 'Eet een power pellet om verder te gaan'}
                            </span>
                        </div>
                    </Show>
                </div>
                
                <style>{`
                    .tutorial-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 9000;
                        pointer-events: none;
                    }
                    
                    .tutorial-backdrop {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.6);
                        pointer-events: auto;
                        animation: fade-in 0.3s ease;
                    }
                    
                    @keyframes fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    .tutorial-card {
                        position: absolute;
                        background: linear-gradient(145deg, #1E1B4B, #0F172A);
                        border: 2px solid rgba(139, 92, 246, 0.5);
                        border-radius: 20px;
                        padding: 24px 32px;
                        max-width: 400px;
                        width: 90%;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                        pointer-events: auto;
                        animation: card-in 0.4s ease;
                    }
                    
                    @keyframes card-in {
                        from { 
                            opacity: 0; 
                            transform: translate(-50%, -50%) scale(0.9); 
                        }
                        to { 
                            opacity: 1; 
                            transform: translate(-50%, -50%) scale(1); 
                        }
                    }
                    
                    .tutorial-card.animating {
                        opacity: 0.5;
                        transform: translate(-50%, -50%) scale(0.95);
                        transition: all 0.2s ease;
                    }
                    
                    .tutorial-progress {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                    }
                    
                    .progress-dots {
                        display: flex;
                        gap: 8px;
                    }
                    
                    .dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.2);
                        transition: all 0.3s ease;
                    }
                    
                    .dot.completed {
                        background: #10B981;
                    }
                    
                    .dot.active {
                        background: #8B5CF6;
                        box-shadow: 0 0 10px #8B5CF6;
                        transform: scale(1.2);
                    }
                    
                    .step-count {
                        font-size: 12px;
                        color: rgba(255, 255, 255, 0.5);
                    }
                    
                    .tutorial-title {
                        font-size: 24px;
                        font-weight: 700;
                        color: white;
                        margin: 0 0 12px;
                    }
                    
                    .tutorial-message {
                        font-size: 16px;
                        color: rgba(255, 255, 255, 0.8);
                        line-height: 1.6;
                        margin: 0 0 24px;
                    }
                    
                    .tutorial-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    }
                    
                    .skip-btn {
                        padding: 12px 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        border-radius: 10px;
                        color: rgba(255, 255, 255, 0.6);
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-height: auto;
                    }
                    
                    .skip-btn:hover {
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                    }
                    
                    .next-btn {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #8B5CF6, #6D28D9);
                        border: none;
                        border-radius: 10px;
                        color: white;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-height: auto;
                    }
                    
                    .next-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 20px rgba(139, 92, 246, 0.4);
                    }
                    
                    .action-hint {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-top: 16px;
                        padding: 12px;
                        background: rgba(34, 211, 238, 0.1);
                        border: 1px solid rgba(34, 211, 238, 0.3);
                        border-radius: 8px;
                        font-size: 13px;
                    }
                    
                    .hint-icon {
                        font-size: 16px;
                    }
                    
                    .hint-text {
                        color: #22D3EE;
                    }
                    
                    /* Spotlight effect for highlighted elements */
                    :global(.tutorial-spotlight-target) {
                        position: relative;
                        z-index: 9001;
                        animation: pulse-spotlight 1.5s ease-in-out infinite;
                    }
                    
                    @keyframes pulse-spotlight {
                        0%, 100% { 
                            box-shadow: 0 0 20px 5px rgba(139, 92, 246, 0.5); 
                        }
                        50% { 
                            box-shadow: 0 0 30px 10px rgba(139, 92, 246, 0.7); 
                        }
                    }
                    
                    /* Mobile adjustments */
                    @media (max-width: 480px) {
                        .tutorial-card {
                            padding: 20px;
                            width: 95%;
                        }
                        
                        .tutorial-title {
                            font-size: 20px;
                        }
                        
                        .tutorial-message {
                            font-size: 14px;
                        }
                    }
                `}</style>
            </div>
        </Show>
    );
};

export default TutorialOverlay;
