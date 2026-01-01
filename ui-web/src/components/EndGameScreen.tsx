import {type Component, For, Show, createSignal, onMount} from 'solid-js';
import type {GameResult, PlayerScore} from '../lib/game/modes';
import {GAME_MODES} from '../lib/game/modes';
import {Trophy, Medal, Award, Gamepad2, Skull, RotateCcw, Home, ChartBar, Zap, Star, Share2, Crown, Sparkles} from 'lucide-solid';

interface EndGameScreenProps {
    result: GameResult;
    onPlayAgain: () => void;
    onBackToLobby: () => void;
}

const EndGameScreen: Component<EndGameScreenProps> = (props) => {
    const mode = () => GAME_MODES[props.result.mode];
    const [showBonus, setShowBonus] = createSignal(false);
    const [countdown, setCountdown] = createSignal(10);
    const [showConfetti, setShowConfetti] = createSignal(false);
    const [animationPhase, setAnimationPhase] = createSignal(0);
    
    // Sprint 5: Enhanced victory animations
    onMount(() => {
        // Staggered animations for dramatic reveal
        setTimeout(() => setAnimationPhase(1), 100);  // Header
        setTimeout(() => setAnimationPhase(2), 400);  // Winner banner
        setTimeout(() => setAnimationPhase(3), 700);  // Scoreboard
        setTimeout(() => setAnimationPhase(4), 1000); // Buttons
        setTimeout(() => setShowBonus(true), 2000);
        setTimeout(() => setShowConfetti(true), 300);
        
        // Countdown for quick replay (creates urgency)
        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    });
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Medal class="w-8 h-8 text-yellow-400" />;
            case 1: return <Medal class="w-8 h-8 text-gray-300" />;
            case 2: return <Medal class="w-8 h-8 text-amber-600" />;
            default: return <Gamepad2 class="w-6 h-6 text-gray-400" />;
        }
    };

    const getRankColor = (index: number) => {
        switch (index) {
            case 0: return 'from-purple-600 to-pink-400';
            case 1: return 'from-gray-500 to-gray-300';
            case 2: return 'from-amber-700 to-amber-500';
            default: return 'from-gray-700 to-gray-600';
        }
    };

    return (
        <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm overflow-hidden">
            {/* Sprint 5: Confetti celebration effect */}
            <Show when={showConfetti()}>
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <For each={Array.from({length: 50})}>
                        {(_, i) => (
                            <div 
                                class="absolute w-3 h-3 rounded-full animate-confetti"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    'animation-delay': `${Math.random() * 2}s`,
                                    'animation-duration': `${2 + Math.random() * 2}s`,
                                    background: ['#FFD93D', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6'][i() % 5]
                                }}
                            />
                        )}
                    </For>
                </div>
            </Show>
            
            <div class={`bg-slate-900 rounded-2xl p-8 max-w-lg w-full mx-4 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 transform transition-all duration-500 ${animationPhase() >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                {/* Header - Sprint 5: Enhanced with crown for winner */}
                <div class={`text-center mb-6 transform transition-all duration-500 ${animationPhase() >= 1 ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
                    <div class="relative inline-block">
                        <Trophy class="w-20 h-20 text-yellow-400 mx-auto mb-2 animate-bounce-slow" />
                        <Crown class="w-8 h-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
                        <Sparkles class="w-6 h-6 text-yellow-200 absolute top-0 -left-2 animate-ping" />
                    </div>
                    <h1 class="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
                        🎉 Game Over! 🎉
                    </h1>
                    <div class="text-gray-400 flex items-center justify-center gap-2">
                        {mode().iconComponent} {mode().name} • {formatTime(props.result.gameDuration)}
                    </div>
                </div>

                {/* Winner Banner - Sprint 5: Animated reveal with glow */}
                <div class={`bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-xl p-5 mb-6 text-center relative overflow-hidden transform transition-all duration-500 ${animationPhase() >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    <div class="relative">
                        <div class="text-white/70 text-sm font-medium flex items-center justify-center gap-1">
                            <Crown class="w-4 h-4" /> Winner <Crown class="w-4 h-4" />
                        </div>
                        <div class="text-3xl font-bold text-white my-1 animate-pulse-slow">{props.result.winnerName}</div>
                        <div class="text-white/80 text-sm font-medium">{props.result.reason}</div>
                    </div>
                </div>

                {/* Scoreboard - Sprint 5: Staggered entry animation */}
                <div class={`mb-6 transform transition-all duration-500 ${animationPhase() >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <h2 class="text-white font-semibold mb-3 text-center flex items-center justify-center gap-2">
                        <ChartBar class="w-5 h-5 text-cyan-400" /> Scoreboard
                    </h2>
                    <div class="space-y-2">
                        <For each={props.result.scores}>
                            {(player, index) => (
                                <div 
                                    class={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${getRankColor(index())} ${!player.isAlive ? 'opacity-60' : ''} transform transition-all duration-300 hover:scale-102`}
                                    style={{ 'animation-delay': `${index() * 100}ms` }}
                                >
                                    <div class="flex items-center gap-3">
                                        {getRankIcon(index())}
                                        <div>
                                            <div class="font-bold text-white flex items-center gap-1">
                                                {player.username || 'Player'}
                                                {!player.isAlive && <Skull class="w-4 h-4" />}
                                                {index() === 0 && <span class="ml-1">👑</span>}
                                            </div>
                                            <div class="text-xs text-white/70">
                                                {player.pelletsCollected} pellets • {player.playersEliminated} kills
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-xl font-bold text-white">{player.score.toLocaleString()}</div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>

                {/* Quick Replay Bonus Banner - David's retention suggestion */}
                <Show when={showBonus()}>
                    <div class="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 mb-4 text-center animate-pulse">
                        <div class="flex items-center justify-center gap-2 text-white font-bold text-lg">
                            <Zap class="w-6 h-6" />
                            <span>🎁 One more game? +50 bonus points!</span>
                            <Zap class="w-6 h-6" />
                        </div>
                        <Show when={countdown() > 0}>
                            <div class="text-white/80 text-sm mt-1">
                                Disappears in {countdown()} seconds...
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* Action Buttons - Enhanced with larger touch targets (Elena's mobile suggestion) */}
                <div class="flex flex-col gap-3">
                    <button
                        onClick={props.onPlayAgain}
                        class="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-3 text-lg shadow-lg shadow-green-500/30"
                    >
                        <RotateCcw class="w-6 h-6" /> 
                        <span>🎮 Play Again!</span>
                        <Show when={showBonus() && countdown() > 0}>
                            <span class="bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold">+50</span>
                        </Show>
                    </button>
                    
                    <div class="flex gap-3">
                        <button
                            onClick={props.onBackToLobby}
                            class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <Home class="w-5 h-5" /> Lobby
                        </button>
                        <button
                            onClick={() => {
                                // Share functionality
                                const text = `🎮 I played MazeChase and scored ${props.result.scores[0]?.score || 0} points! Can you beat me? #MazeChase`;
                                if (navigator.share) {
                                    navigator.share({ title: 'MazeChase Score', text });
                                } else {
                                    navigator.clipboard.writeText(text);
                                    alert('Score copied to clipboard!');
                                }
                            }}
                            class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                        >
                            <Share2 class="w-5 h-5" /> Share
                        </button>
                    </div>
                </div>

                {/* Daily Challenge Teaser - David's retention suggestion */}
                <div class="mt-4 text-center">
                    <div class="inline-flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full text-sm text-gray-400">
                        <Star class="w-4 h-4 text-yellow-400" />
                        <span>Daily Challenge: Collect 100 pellets</span>
                        <span class="text-yellow-400 font-bold">23/100</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EndGameScreen;
