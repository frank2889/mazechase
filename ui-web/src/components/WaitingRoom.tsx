import { type Component, createSignal, For, Show, onCleanup, createEffect } from 'solid-js';
import { Users, Check, Clock, Crown, Eye, Play, X, Zap, Shield, Target } from 'lucide-solid';

export interface Player {
    id: string;
    username: string;
    isReady: boolean;
    isHost: boolean;
    isSpectator: boolean;
    spriteType: string;
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

interface WaitingRoomProps {
    players: Player[];
    spectators: Player[];
    isHost: boolean;
    isReady: boolean;
    isSpectator: boolean;
    playerCount: number;
    readyCount: number;
    countdown: number | null;
    difficulty?: DifficultyLevel;
    onToggleReady: () => void;
    onStartGame: () => void;
    onLeave: () => void;
    onDifficultyChange?: (difficulty: DifficultyLevel) => void;
}

const WaitingRoom: Component<WaitingRoomProps> = (props) => {
    const [selectedDifficulty, setSelectedDifficulty] = createSignal<DifficultyLevel>(props.difficulty || 'normal');
    
    const canStart = () => {
        // Host can start when at least 2 players and all are ready
        return props.isHost && props.playerCount >= 2 && props.readyCount === props.playerCount;
    };

    const getSpriteColor = (spriteType: string) => {
        const colors: Record<string, string> = {
            'runner': 'bg-yellow-500',
            'ch0': 'bg-red-500',
            'ch1': 'bg-cyan-500', 
            'ch2': 'bg-pink-500',
        };
        return colors[spriteType] || 'bg-gray-500';
    };
    
    const handleDifficultyChange = (difficulty: DifficultyLevel) => {
        setSelectedDifficulty(difficulty);
        props.onDifficultyChange?.(difficulty);
    };
    
    const getDifficultyInfo = (difficulty: DifficultyLevel) => {
        const info = {
            easy: { 
                label: 'Easy', 
                desc: 'Slow bots, more power-ups', 
                icon: Shield,
                color: 'from-green-500 to-emerald-600',
                borderColor: 'border-green-500'
            },
            normal: { 
                label: 'Normal', 
                desc: 'Balanced challenge', 
                icon: Target,
                color: 'from-yellow-500 to-orange-500',
                borderColor: 'border-yellow-500'
            },
            hard: { 
                label: 'Hard', 
                desc: 'Smart bots, fewer power-ups', 
                icon: Zap,
                color: 'from-red-500 to-rose-600',
                borderColor: 'border-red-500'
            }
        };
        return info[difficulty];
    };

    return (
        <div class="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center z-50">
            {/* Countdown Overlay */}
            <Show when={props.countdown !== null}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-60">
                    <div class="text-center animate-pulse">
                        <div class="text-9xl font-bold text-white mb-4 drop-shadow-lg" style={{ 
                            "text-shadow": "0 0 60px rgba(147, 51, 234, 0.8), 0 0 120px rgba(147, 51, 234, 0.4)"
                        }}>
                            {props.countdown === 0 ? 'GO!' : props.countdown}
                        </div>
                        <div class="text-2xl text-purple-400">
                            {props.countdown === 0 ? 'Starting...' : 'Get ready...'}
                        </div>
                    </div>
                </div>
            </Show>

            <div class="bg-slate-800/90 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full mx-4 border-2 border-purple-500/50 shadow-2xl">
                {/* Header */}
                <div class="text-center mb-6">
                    <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
                        Waiting Room
                    </h1>
                    <p class="text-gray-400">
                        Waiting for all players to be ready
                    </p>
                </div>

                {/* Player Count */}
                <div class="flex justify-center gap-4 mb-6">
                    <div class="bg-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Users class="w-5 h-5 text-cyan-400" />
                        <span class="text-white font-semibold">{props.playerCount}/4</span>
                        <span class="text-gray-400 text-sm">players</span>
                    </div>
                    <div class="bg-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Check class="w-5 h-5 text-green-400" />
                        <span class="text-white font-semibold">{props.readyCount}/{props.playerCount}</span>
                        <span class="text-gray-400 text-sm">ready</span>
                    </div>
                </div>

                {/* Player List */}
                <div class="space-y-2 mb-6">
                    <h3 class="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                        <Users class="w-4 h-4" /> Players
                    </h3>
                    <For each={props.players}>
                        {(player) => (
                            <div class={`flex items-center justify-between p-3 rounded-lg ${
                                player.isReady ? 'bg-green-900/30 border border-green-500/30' : 'bg-slate-700/50'
                            }`}>
                                <div class="flex items-center gap-3">
                                    <div class={`w-8 h-8 rounded-full ${getSpriteColor(player.spriteType)} flex items-center justify-center`}>
                                        <span class="text-white text-xs font-bold">
                                            {player.spriteType === 'runner' ? 'R' : 'C'}
                                        </span>
                                    </div>
                                    <span class="text-white font-medium">{player.username}</span>
                                    <Show when={player.isHost}>
                                        <Crown class="w-4 h-4 text-yellow-400" />
                                    </Show>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Show when={player.isReady} fallback={
                                        <span class="flex items-center gap-1 text-yellow-400 text-sm">
                                            <Clock class="w-4 h-4" /> Waiting...
                                        </span>
                                    }>
                                        <span class="flex items-center gap-1 text-green-400 text-sm">
                                            <Check class="w-4 h-4" /> Ready
                                        </span>
                                    </Show>
                                </div>
                            </div>
                        )}
                    </For>
                </div>

                {/* Difficulty Selector - Only for Host */}
                <Show when={props.isHost && !props.isSpectator}>
                    <div class="mb-6">
                        <h3 class="text-gray-300 font-semibold mb-3 flex items-center gap-2">
                            <Zap class="w-4 h-4" /> Difficulty
                        </h3>
                        <div class="grid grid-cols-3 gap-2">
                            <For each={(['easy', 'normal', 'hard'] as DifficultyLevel[])}>
                                {(diff) => {
                                    const info = getDifficultyInfo(diff);
                                    const Icon = info.icon;
                                    return (
                                        <button
                                            onClick={() => handleDifficultyChange(diff)}
                                            class={`p-3 rounded-lg border-2 transition-all ${
                                                selectedDifficulty() === diff 
                                                    ? `bg-gradient-to-br ${info.color} ${info.borderColor} shadow-lg scale-105`
                                                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                            }`}
                                        >
                                            <Icon class={`w-5 h-5 mx-auto mb-1 ${
                                                selectedDifficulty() === diff ? 'text-white' : 'text-gray-400'
                                            }`} />
                                            <div class={`text-sm font-bold ${
                                                selectedDifficulty() === diff ? 'text-white' : 'text-gray-300'
                                            }`}>
                                                {info.label}
                                            </div>
                                            <div class={`text-xs mt-1 ${
                                                selectedDifficulty() === diff ? 'text-white/80' : 'text-gray-500'
                                            }`}>
                                                {info.desc}
                                            </div>
                                        </button>
                                    );
                                }}
                            </For>
                        </div>
                    </div>
                </Show>

                {/* Spectators */}
                <Show when={props.spectators.length > 0}>
                    <div class="space-y-2 mb-6">
                        <h3 class="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                            <Eye class="w-4 h-4" /> Spectators ({props.spectators.length})
                        </h3>
                        <div class="flex flex-wrap gap-2">
                            <For each={props.spectators}>
                                {(spectator) => (
                                    <span class="bg-slate-700/50 px-3 py-1 rounded-full text-gray-300 text-sm flex items-center gap-1">
                                        <Eye class="w-3 h-3" /> {spectator.username}
                                    </span>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>

                {/* Spectator Notice */}
                <Show when={props.isSpectator}>
                    <div class="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6 text-center">
                        <Eye class="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p class="text-blue-300">You are spectating this game</p>
                        <p class="text-blue-400/70 text-sm mt-1">The lobby is full, but you can watch!</p>
                    </div>
                </Show>

                {/* How to Play - Quick Guide */}
                <Show when={!props.isSpectator}>
                    <div class="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-4 mb-6">
                        <h3 class="text-white font-semibold mb-3 flex items-center gap-2">
                            🎮 How to Play
                        </h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex items-start gap-2 text-gray-300">
                                <span class="text-yellow-400">🟡</span>
                                <span><strong class="text-yellow-400">Runner:</strong> Collect pellets, escape from Chasers!</span>
                            </div>
                            <div class="flex items-start gap-2 text-gray-300">
                                <span class="text-red-400">🔴</span>
                                <span><strong class="text-red-400">Chasers:</strong> Catch the Runner within 3 minutes!</span>
                            </div>
                            <div class="flex items-start gap-2 text-gray-300">
                                <span class="text-cyan-400">⚡</span>
                                <span><strong class="text-cyan-400">Tip:</strong> Power-ups reverse the roles!</span>
                            </div>
                        </div>
                        <div class="mt-3 pt-3 border-t border-white/10">
                            <p class="text-gray-400 text-xs">
                                🕹️ Controls: Arrow keys or WASD
                            </p>
                        </div>
                    </div>
                </Show>

                {/* Action Buttons */}
                <div class="flex flex-col gap-3">
                    <Show when={!props.isSpectator}>
                        <button
                            onClick={props.onToggleReady}
                            class={`w-full py-3 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                                props.isReady 
                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                    : 'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                        >
                            <Show when={props.isReady} fallback={<><Check class="w-5 h-5" /> I'm Ready!</>}>
                                <Clock class="w-5 h-5" /> Not Ready
                            </Show>
                        </button>
                    </Show>

                    <Show when={props.isHost}>
                        <button
                            onClick={props.onStartGame}
                            disabled={!canStart()}
                            class={`w-full py-3 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                                canStart()
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-slate-600 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <Play class="w-5 h-5" /> Start Game
                        </button>
                        <Show when={!canStart()}>
                            <p class="text-gray-400 text-sm text-center">
                                {props.playerCount < 2 
                                    ? 'Need at least 2 players to start'
                                    : 'Waiting for all players to be ready'}
                            </p>
                        </Show>
                    </Show>

                    <button
                        onClick={props.onLeave}
                        class="w-full py-2 bg-red-600/50 hover:bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                        <X class="w-4 h-4" /> Leave Lobby
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WaitingRoom;
