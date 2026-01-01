/**
 * Score Animation Component
 * Sprint 3 - Visual Upgrade
 * 
 * Provides satisfying visual feedback when scoring:
 * - Score popup animations
 * - Combo multiplier displays
 * - Streak fire effects
 */

import { type Component, createSignal, onMount, onCleanup, For, Show } from 'solid-js';

interface ScorePopup {
    id: number;
    x: number;
    y: number;
    value: number;
    combo: number;
    timestamp: number;
}

interface ScoreAnimatorProps {
    /** Called when a score popup is triggered from game events */
    ref?: (api: ScoreAnimatorAPI) => void;
}

export interface ScoreAnimatorAPI {
    addPopup: (x: number, y: number, value: number, combo?: number) => void;
    triggerComboFlash: (combo: number) => void;
}

const ScoreAnimator: Component<ScoreAnimatorProps> = (props) => {
    const [popups, setPopups] = createSignal<ScorePopup[]>([]);
    const [comboFlash, setComboFlash] = createSignal<number | null>(null);
    const [totalCombo, setTotalCombo] = createSignal(0);
    
    let popupIdCounter = 0;

    // Cleanup old popups
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        setPopups(prev => prev.filter(p => now - p.timestamp < 1500));
    }, 100);

    onCleanup(() => {
        clearInterval(cleanupInterval);
    });

    const addPopup = (x: number, y: number, value: number, combo: number = 1) => {
        const id = ++popupIdCounter;
        const newPopup: ScorePopup = {
            id,
            x,
            y,
            value,
            combo,
            timestamp: Date.now()
        };
        
        setPopups(prev => [...prev.slice(-10), newPopup]); // Keep max 10 popups
        
        if (combo > 1) {
            setTotalCombo(combo);
        }
    };

    const triggerComboFlash = (combo: number) => {
        setComboFlash(combo);
        setTotalCombo(combo);
        
        setTimeout(() => {
            setComboFlash(null);
        }, 500);
    };

    // Expose API to parent
    onMount(() => {
        if (props.ref) {
            props.ref({
                addPopup,
                triggerComboFlash
            });
        }
    });

    const getPopupStyle = (popup: ScorePopup) => {
        const age = Date.now() - popup.timestamp;
        const progress = Math.min(age / 1500, 1);
        
        // Float upward and fade out
        const yOffset = -50 * progress;
        const opacity = 1 - progress;
        const scale = 1 + (popup.combo > 1 ? 0.2 : 0);
        
        return {
            left: `${popup.x}px`,
            top: `${popup.y + yOffset}px`,
            opacity: opacity.toString(),
            transform: `scale(${scale})`,
            'font-size': popup.combo > 3 ? '2rem' : popup.combo > 1 ? '1.5rem' : '1.25rem'
        };
    };

    const getPopupColor = (combo: number) => {
        if (combo >= 10) return 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]';
        if (combo >= 5) return 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]';
        if (combo >= 3) return 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]';
        return 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]';
    };

    return (
        <div class="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
            {/* Score Popups */}
            <For each={popups()}>
                {(popup) => (
                    <div
                        class={`absolute font-bold transition-all duration-75 ${getPopupColor(popup.combo)}`}
                        style={getPopupStyle(popup)}
                    >
                        +{popup.value}
                        <Show when={popup.combo > 1}>
                            <span class="text-sm ml-1">x{popup.combo}</span>
                        </Show>
                    </div>
                )}
            </For>

            {/* Combo Flash Overlay */}
            <Show when={comboFlash()}>
                <div class="absolute inset-0 flex items-center justify-center animate-ping">
                    <div class="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                        {comboFlash()}x COMBO!
                    </div>
                </div>
            </Show>

            {/* Persistent Combo Counter (top-left corner) */}
            <Show when={totalCombo() > 1}>
                <div class="absolute top-32 left-4 bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-orange-400/50">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">🔥</span>
                        <div>
                            <div class="text-xs text-orange-200">STREAK</div>
                            <div class="text-2xl font-black text-white">{totalCombo()}x</div>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
};

export default ScoreAnimator;

/**
 * CSS for animations (add to global styles if not using Tailwind animations)
 */
export const scoreAnimatorStyles = `
@keyframes score-popup {
    0% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
    100% {
        transform: translateY(-50px) scale(1.2);
        opacity: 0;
    }
}

@keyframes combo-flash {
    0% {
        transform: scale(0.5);
        opacity: 0;
    }
    50% {
        transform: scale(1.2);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 0;
    }
}

.score-popup {
    animation: score-popup 1.5s ease-out forwards;
}

.combo-flash {
    animation: combo-flash 0.5s ease-out forwards;
}
`;
