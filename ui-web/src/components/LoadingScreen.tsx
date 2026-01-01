/**
 * Enhanced Loading Screen Component
 * Sprint 3 - UX Upgrade
 * 
 * Features:
 * - Progress indicator
 * - Game tips rotation
 * - Animated mascot
 * - Smooth transitions
 */

import { type Component, createSignal, onMount, onCleanup, Show } from 'solid-js';

interface LoadingScreenProps {
    progress?: number;
    message?: string;
    showTips?: boolean;
}

const GAME_TIPS = [
    "💡 Collect all pellets before time runs out to win!",
    "⚡ Power pellets let you eat the chasers temporarily",
    "🧲 The Magnet power-up attracts nearby pellets",
    "🏃 Speed Boost helps you escape tight situations",
    "👻 Chasers work as a team - watch out for ambushes!",
    "🎯 Corner traps are the most dangerous - plan your route",
    "🔄 Power-up effects stack for combo advantages",
    "🏆 Higher combos give more points per pellet",
    "📱 Swipe controls work great on mobile devices",
    "🎮 Practice makes perfect - each maze has optimal routes",
];

const LoadingScreen: Component<LoadingScreenProps> = (props) => {
    const [tipIndex, setTipIndex] = createSignal(0);
    const [dotCount, setDotCount] = createSignal(1);
    
    let tipInterval: number;
    let dotInterval: number;

    onMount(() => {
        // Rotate tips every 3 seconds
        if (props.showTips !== false) {
            tipInterval = setInterval(() => {
                setTipIndex(prev => (prev + 1) % GAME_TIPS.length);
            }, 3000);
        }
        
        // Animate loading dots
        dotInterval = setInterval(() => {
            setDotCount(prev => (prev % 3) + 1);
        }, 400);
    });

    onCleanup(() => {
        clearInterval(tipInterval);
        clearInterval(dotInterval);
    });

    const loadingDots = () => '.'.repeat(dotCount());

    return (
        <div class="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex flex-col items-center justify-center z-[100]">
            {/* Animated Background */}
            <div class="absolute inset-0 overflow-hidden opacity-20">
                <div class="absolute w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-pulse" 
                     style="top: 20%; left: 10%;" />
                <div class="absolute w-48 h-48 bg-cyan-500 rounded-full blur-3xl animate-pulse" 
                     style="top: 60%; right: 15%; animation-delay: 0.5s;" />
                <div class="absolute w-56 h-56 bg-pink-500 rounded-full blur-3xl animate-pulse" 
                     style="bottom: 20%; left: 30%; animation-delay: 1s;" />
            </div>

            {/* Logo / Title */}
            <div class="relative z-10 text-center mb-8">
                <h1 class="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-2">
                    MazeChase
                </h1>
                <p class="text-gray-400 text-lg">
                    {props.message || 'Loading'}{loadingDots()}
                </p>
            </div>

            {/* Animated Mascot */}
            <div class="relative z-10 mb-8">
                <div class="w-24 h-24 md:w-32 md:h-32 relative animate-bounce">
                    {/* Simplified pac-man style mascot */}
                    <div class="absolute inset-0 bg-yellow-400 rounded-full shadow-lg shadow-yellow-500/50">
                        {/* Eye */}
                        <div class="absolute w-3 h-3 bg-black rounded-full" 
                             style="top: 25%; left: 55%;" />
                        {/* Mouth animation */}
                        <div class="absolute inset-0 overflow-hidden">
                            <div class="absolute bg-purple-900 origin-left animate-pulse"
                                 style="width: 50%; height: 50%; top: 25%; left: 50%; transform: rotate(25deg);" />
                        </div>
                    </div>
                    {/* Glow effect */}
                    <div class="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-30 animate-pulse" />
                </div>
            </div>

            {/* Progress Bar */}
            <Show when={props.progress !== undefined}>
                <div class="relative z-10 w-64 md:w-80 mb-8">
                    <div class="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        <div 
                            class="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full transition-all duration-300"
                            style={`width: ${props.progress}%`}
                        />
                    </div>
                    <div class="text-center text-gray-400 text-sm mt-2">
                        {Math.round(props.progress || 0)}%
                    </div>
                </div>
            </Show>

            {/* Loading Spinner (when no progress) */}
            <Show when={props.progress === undefined}>
                <div class="relative z-10 mb-8">
                    <div class="w-12 h-12 border-4 border-purple-500/30 border-t-yellow-400 rounded-full animate-spin" />
                </div>
            </Show>

            {/* Game Tips */}
            <Show when={props.showTips !== false}>
                <div class="relative z-10 max-w-md mx-4 text-center">
                    <div class="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
                        <p class="text-gray-300 text-sm md:text-base transition-opacity duration-300">
                            {GAME_TIPS[tipIndex()]}
                        </p>
                    </div>
                </div>
            </Show>

            {/* Footer */}
            <div class="absolute bottom-4 text-gray-500 text-xs">
                Press any key to skip • v1.0
            </div>
        </div>
    );
};

export default LoadingScreen;

/**
 * Mini loading spinner for inline use
 */
export const MiniSpinner: Component<{ size?: 'sm' | 'md' | 'lg' }> = (props) => {
    const sizeClass = () => {
        switch (props.size) {
            case 'sm': return 'w-4 h-4 border-2';
            case 'lg': return 'w-8 h-8 border-4';
            default: return 'w-6 h-6 border-3';
        }
    };

    return (
        <div class={`${sizeClass()} border-purple-500/30 border-t-yellow-400 rounded-full animate-spin`} />
    );
};

/**
 * Skeleton loader for content
 */
export const Skeleton: Component<{ class?: string }> = (props) => (
    <div class={`bg-gray-700/50 rounded animate-pulse ${props.class || 'h-4 w-full'}`} />
);
