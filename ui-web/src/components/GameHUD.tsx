import { type Component, createSignal, onCleanup, Show } from 'solid-js';
import { Zap, Clock, Target, Users, Star, Heart } from 'lucide-solid';

interface GameHUDProps {
    score: number;
    timeLeft: number;
    pelletsCollected: number;
    totalPellets: number;
    isRunner: boolean;
    powerUpActive: string | null;
    powerUpTimeLeft: number;
    playersAlive: number;
    totalPlayers: number;
    streak: number;
}

/**
 * Enhanced Game HUD with improved readability (Sandra's feedback)
 * - Larger text and icons
 * - Better contrast
 * - Touch-friendly sizing
 */
const GameHUD: Component<GameHUDProps> = (props) => {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = () => 
        props.totalPellets > 0 ? (props.pelletsCollected / props.totalPellets) * 100 : 0;

    const getPowerUpColor = (type: string | null) => {
        switch (type) {
            case 'speed': return 'from-yellow-500 to-orange-500';
            case 'invisible': return 'from-blue-500 to-indigo-500';
            case 'magnet': return 'from-purple-500 to-pink-500';
            case 'freeze': return 'from-cyan-400 to-blue-400';
            case 'teleport': return 'from-pink-500 to-rose-500';
            default: return 'from-white to-gray-200';
        }
    };

    const getPowerUpName = (type: string | null) => {
        switch (type) {
            case 'speed': return '⚡ SPEED BOOST';
            case 'invisible': return '👻 INVISIBLE';
            case 'magnet': return '🧲 MAGNET';
            case 'freeze': return '❄️ FREEZE';
            case 'teleport': return '🌀 TELEPORT';
            case 'classic': return '💪 POWER MODE';
            default: return '';
        }
    };

    return (
        <div class="fixed inset-x-0 top-0 z-50 pointer-events-none">
            {/* Top Bar - Score & Time */}
            <div class="flex justify-between items-start p-3 md:p-4">
                {/* Score Panel - Left */}
                <div class="bg-black/70 backdrop-blur-sm rounded-xl p-3 md:p-4 border-2 border-purple-500/50 shadow-lg">
                    <div class="flex items-center gap-2">
                        <Star class="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
                        <div>
                            <div class="text-xs md:text-sm text-gray-400 font-medium">Score</div>
                            <div class="text-2xl md:text-4xl font-bold text-white tabular-nums">
                                {props.score.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    
                    {/* Streak indicator */}
                    <Show when={props.streak > 1}>
                        <div class="flex items-center gap-1 mt-1 text-orange-400">
                            <Zap class="w-4 h-4" />
                            <span class="text-sm font-bold">{props.streak}x COMBO!</span>
                        </div>
                    </Show>
                </div>

                {/* Timer - Center */}
                <div class={`bg-black/70 backdrop-blur-sm rounded-xl p-3 md:p-4 border-2 shadow-lg ${
                    props.timeLeft <= 30 ? 'border-red-500 animate-pulse' : 'border-cyan-500/50'
                }`}>
                    <div class="flex items-center gap-2">
                        <Clock class={`w-6 h-6 md:w-8 md:h-8 ${props.timeLeft <= 30 ? 'text-red-400' : 'text-cyan-400'}`} />
                        <div class={`text-3xl md:text-5xl font-bold tabular-nums ${
                            props.timeLeft <= 30 ? 'text-red-400' : 'text-white'
                        }`}>
                            {formatTime(props.timeLeft)}
                        </div>
                    </div>
                </div>

                {/* Players Alive - Right */}
                <div class="bg-black/70 backdrop-blur-sm rounded-xl p-3 md:p-4 border-2 border-green-500/50 shadow-lg">
                    <div class="flex items-center gap-2">
                        <Users class="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                        <div>
                            <div class="text-xs md:text-sm text-gray-400 font-medium">Players</div>
                            <div class="text-2xl md:text-4xl font-bold text-white">
                                {props.playersAlive}/{props.totalPlayers}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar - Pellets (for Runner) */}
            <Show when={props.isRunner}>
                <div class="px-4 md:px-8 mt-2">
                    <div class="bg-black/50 backdrop-blur-sm rounded-full p-2 border border-yellow-500/30">
                        <div class="flex items-center gap-3">
                            <Target class="w-5 h-5 text-yellow-400 flex-shrink-0" />
                            <div class="flex-1 h-4 md:h-5 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    class="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-300"
                                    style={`width: ${progressPercent()}%`}
                                />
                            </div>
                            <span class="text-white font-bold text-sm md:text-base min-w-[60px] text-right">
                                {props.pelletsCollected}/{props.totalPellets}
                            </span>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Power-Up Active Indicator */}
            <Show when={props.powerUpActive}>
                <div class="flex justify-center mt-3">
                    <div class={`bg-gradient-to-r ${getPowerUpColor(props.powerUpActive)} px-6 py-3 rounded-full shadow-lg animate-pulse`}>
                        <div class="flex items-center gap-2 text-white font-bold text-lg">
                            <span>{getPowerUpName(props.powerUpActive)}</span>
                            <span class="bg-white/20 px-2 py-1 rounded-full text-sm">
                                {props.powerUpTimeLeft}s
                            </span>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Role Indicator */}
            <div class="absolute top-20 md:top-24 left-3 md:left-4">
                <div class={`px-4 py-2 rounded-lg font-bold text-sm md:text-base ${
                    props.isRunner 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-red-500 text-white'
                }`}>
                    {props.isRunner ? '🏃 RUNNER' : '👻 CHASER'}
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
