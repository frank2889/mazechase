import {type Component, For, Show} from 'solid-js';
import type {GameResult, PlayerScore} from '../lib/game/modes';
import {GAME_MODES} from '../lib/game/modes';
import {Trophy, Medal, Award, Gamepad2, Skull, RotateCcw, Home, ChartBar} from 'lucide-solid';

interface EndGameScreenProps {
    result: GameResult;
    onPlayAgain: () => void;
    onBackToLobby: () => void;
}

const EndGameScreen: Component<EndGameScreenProps> = (props) => {
    const mode = () => GAME_MODES[props.result.mode];
    
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
        <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-slate-900 rounded-2xl p-8 max-w-lg w-full mx-4 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20">
                {/* Header */}
                <div class="text-center mb-6">
                    <Trophy class="w-16 h-16 text-purple-400 mx-auto mb-2" />
                    <h1 class="text-3xl font-bold text-purple-400 mb-1">Game Over!</h1>
                    <div class="text-gray-400 flex items-center justify-center gap-2">
                        {mode().iconComponent} {mode().nameNL} • {formatTime(props.result.gameDuration)}
                    </div>
                </div>

                {/* Winner Banner */}
                <div class="bg-gradient-to-r from-purple-600 to-pink-400 rounded-xl p-4 mb-6 text-center">
                    <div class="text-white/70 text-sm font-medium">Winnaar</div>
                    <div class="text-2xl font-bold text-white">{props.result.winnerName}</div>
                    <div class="text-white/70 text-sm">{props.result.reason}</div>
                </div>

                {/* Scoreboard */}
                <div class="mb-6">
                    <h2 class="text-white font-semibold mb-3 text-center flex items-center justify-center gap-2">
                        <ChartBar class="w-5 h-5 text-cyan-400" /> Scorebord
                    </h2>
                    <div class="space-y-2">
                        <For each={props.result.scores}>
                            {(player, index) => (
                                <div 
                                    class={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${getRankColor(index())} ${!player.isAlive ? 'opacity-60' : ''}`}
                                >
                                    <div class="flex items-center gap-3">
                                        {getRankIcon(index())}
                                        <div>
                                            <div class="font-bold text-white flex items-center gap-1">
                                                {player.username || 'Speler'}
                                                {!player.isAlive && <Skull class="w-4 h-4" />}
                                            </div>
                                            <div class="text-xs text-white/70">
                                                {player.pelletsCollected} pellets • {player.playersEliminated} kills
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-xl font-bold text-white">{player.score}</div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>

                {/* Action Buttons */}
                <div class="flex gap-3">
                    <button
                        onClick={props.onPlayAgain}
                        class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                    >
                        <RotateCcw class="w-5 h-5" /> Opnieuw Spelen
                    </button>
                    <button
                        onClick={props.onBackToLobby}
                        class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                    >
                        <Home class="w-5 h-5" /> Naar Lobby
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EndGameScreen;
