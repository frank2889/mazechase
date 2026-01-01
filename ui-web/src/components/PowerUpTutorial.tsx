/**
 * Power-Up Tutorial & Tooltip System
 * Based on AI Tester Feedback (Emma, Sandra)
 * 
 * Issues Fixed:
 * - Emma: "Meer uitleg bij nieuwe power-ups zou fijn zijn"
 * - Sandra: "Uitleg over power-ups kan iets uitgebreider"
 */

import { type Component, Show, createSignal, onMount, For } from 'solid-js';

// Power-up definitions with detailed info
export interface PowerUpInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
    effect: string;
    duration: string;
    tip: string;
    color: string;
}

export const POWER_UPS: PowerUpInfo[] = [
    {
        id: 'speed',
        name: 'Speed Boost',
        icon: '⚡',
        description: 'Maak je sneller dan de Chasers!',
        effect: '+50% snelheid',
        duration: '5 sec',
        tip: 'Perfect om te ontsnappen',
        color: '#FFD700'
    },
    {
        id: 'invisible',
        name: 'Onzichtbaar',
        icon: '👻',
        description: 'Word onzichtbaar voor de Chasers.',
        effect: 'Chasers zien je niet',
        duration: '4 sec',
        tip: 'Loop door Chasers heen!',
        color: '#6366F1'
    },
    {
        id: 'magnet',
        name: 'Magneet',
        icon: '🧲',
        description: 'Trek pellets naar je toe.',
        effect: 'Auto-collect pellets',
        duration: '6 sec',
        tip: 'Verzamel snel veel punten',
        color: '#EC4899'
    },
    {
        id: 'freeze',
        name: 'Bevriezing',
        icon: '❄️',
        description: 'Bevries alle Chasers!',
        effect: 'Chasers stoppen',
        duration: '3 sec',
        tip: 'Koop tijd voor ontsnapping',
        color: '#22D3EE'
    },
    {
        id: 'classic',
        name: 'Power Mode',
        icon: '💪',
        description: 'De rollen worden omgedraaid!',
        effect: 'Jij vangt de Chasers',
        duration: '8 sec',
        tip: 'Vang Chasers voor bonus punten',
        color: '#FFFFFF'
    },
    {
        id: 'teleport',
        name: 'Teleport',
        icon: '🌀',
        description: 'Teleporteer naar een willekeurige plek.',
        effect: 'Instant verplaatsing',
        duration: 'Direct',
        tip: 'Gok: kan goed of slecht uitpakken!',
        color: '#F472B6'
    }
];

// Check if user has seen the tutorial
const TUTORIAL_KEY = 'mazechase_powerup_tutorial_seen';

export function hasSeenTutorial(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function markTutorialSeen(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TUTORIAL_KEY, 'true');
}

/**
 * Power-Up Tutorial Modal
 * Shows first time users what each power-up does
 */
export const PowerUpTutorial: Component<{ onDismiss: () => void }> = (props) => {
    return (
        <div class="powerup-tutorial" onClick={(e) => e.target === e.currentTarget && props.onDismiss()}>
            <div class="powerup-tutorial__card">
                <h2 class="powerup-tutorial__title">
                    🎮 Power-Ups Uitleg
                </h2>
                
                <div class="powerup-tutorial__grid">
                    <For each={POWER_UPS}>
                        {(powerup) => (
                            <div 
                                class="powerup-tutorial__item"
                                style={`border: 1px solid ${powerup.color}33`}
                            >
                                <span class="powerup-tutorial__item-icon">{powerup.icon}</span>
                                <div class="powerup-tutorial__item-name" style={`color: ${powerup.color}`}>
                                    {powerup.name}
                                </div>
                                <div class="powerup-tutorial__item-effect">
                                    {powerup.effect}
                                </div>
                            </div>
                        )}
                    </For>
                </div>
                
                <p style="text-align: center; color: rgba(255,255,255,0.7); margin-bottom: 16px; font-size: 14px;">
                    💡 Tip: Verzamel power-ups om de Chasers te slim af te zijn!
                </p>
                
                <button 
                    class="powerup-tutorial__dismiss"
                    onClick={props.onDismiss}
                >
                    Ik snap het! 🚀
                </button>
            </div>
        </div>
    );
};

/**
 * Power-Up Tooltip Component
 * Shows detailed info when hovering over a power-up
 */
interface TooltipProps {
    powerUpId: string;
    x: number;
    y: number;
}

export const PowerUpTooltip: Component<TooltipProps> = (props) => {
    const powerup = () => POWER_UPS.find(p => p.id === props.powerUpId);
    
    return (
        <Show when={powerup()}>
            <div 
                class={`powerup-tooltip powerup-tooltip--${props.powerUpId}`}
                style={`left: ${props.x}px; top: ${props.y}px;`}
            >
                <div class="powerup-tooltip__header">
                    <span class="powerup-tooltip__icon">{powerup()!.icon}</span>
                    <span class="powerup-tooltip__name" style={`color: ${powerup()!.color}`}>
                        {powerup()!.name}
                    </span>
                </div>
                
                <p class="powerup-tooltip__desc">
                    {powerup()!.description}
                </p>
                
                <div class="powerup-tooltip__stats">
                    <div class="powerup-tooltip__stat">
                        <span class="powerup-tooltip__stat-label">Effect</span>
                        <span class="powerup-tooltip__stat-value">{powerup()!.effect}</span>
                    </div>
                    <div class="powerup-tooltip__stat">
                        <span class="powerup-tooltip__stat-label">Duur</span>
                        <span class="powerup-tooltip__stat-value">{powerup()!.duration}</span>
                    </div>
                </div>
                
                <div class="powerup-tooltip__hint">
                    💡 {powerup()!.tip}
                </div>
            </div>
        </Show>
    );
};

/**
 * Hook to manage power-up tooltip state
 */
export function createPowerUpTooltip() {
    const [activeTooltip, setActiveTooltip] = createSignal<{ id: string; x: number; y: number } | null>(null);
    
    const showTooltip = (id: string, event: MouseEvent) => {
        setActiveTooltip({
            id,
            x: event.clientX + 10,
            y: event.clientY + 10
        });
    };
    
    const hideTooltip = () => {
        setActiveTooltip(null);
    };
    
    return { activeTooltip, showTooltip, hideTooltip };
}

/**
 * In-Game Power-Up Notification
 * Shows when player picks up a power-up with brief explanation
 */
interface NotificationProps {
    powerUpId: string;
    onComplete: () => void;
}

export const PowerUpNotification: Component<NotificationProps> = (props) => {
    const powerup = () => POWER_UPS.find(p => p.id === props.powerUpId);
    
    onMount(() => {
        // Auto-dismiss after 2.5 seconds
        setTimeout(props.onComplete, 2500);
    });
    
    return (
        <Show when={powerup()}>
            <div 
                class="fixed top-1/3 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                style="animation: powerup-notification-in 300ms var(--ease-out-back) both"
            >
                <div 
                    class="px-8 py-4 rounded-2xl text-center"
                    style={`
                        background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,50,0.9));
                        border: 2px solid ${powerup()!.color};
                        box-shadow: 0 0 30px ${powerup()!.color}66;
                    `}
                >
                    <div class="text-5xl mb-2 animate-bounce">{powerup()!.icon}</div>
                    <div class="text-xl font-bold text-white mb-1">{powerup()!.name}</div>
                    <div class="text-sm" style={`color: ${powerup()!.color}`}>
                        {powerup()!.effect} • {powerup()!.duration}
                    </div>
                </div>
            </div>
        </Show>
    );
};

// Add notification animation to global scope
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes powerup-notification-in {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
}
