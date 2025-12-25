import {type Component, For, Show} from 'solid-js';
import type {GameResult, PlayerScore} from '../lib/game/modes';
import {GAME_MODES} from '../lib/game/modes';

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

    const getRankEmoji = (index: number) => {
        switch (index) {
            case 0: return '🥇';
            case 1: return '🥈';
            case 2: return '🥉';
            default: return '🎮';
        }
    };

    const getRankColor = (index: number) => {
        switch (index) {
            case 0: return 'from-yellow-600 to-yellow-400';
            case 1: return 'from-gray-500 to-gray-300';
            case 2: return 'from-amber-700 to-amber-500';
            default: return 'from-gray-700 to-gray-600';
        }
    };

    return (
        <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <div class="bg-gray-900 rounded-2xl p-8 max-w-lg w-full mx-4 border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
                {/* Header */}
                <div class="text-center mb-6">
                    <div class="text-6xl mb-2">🏆</div>
                    <h1 class="text-3xl font-bold text-yellow-400 mb-1">Game Over!</h1>
                    <div class="text-gray-400">
                        {mode().icon} {mode().nameNL} • {formatTime(props.result.gameDuration)}
                    </div>
                </div>

                {/* Winner Banner */}
                <div class="bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-xl p-4 mb-6 text-center">
                    <div class="text-black/70 text-sm font-medium">Winnaar</div>
                    <div class="text-2xl font-bold text-black">{props.result.winnerName}</div>
                    <div class="text-black/70 text-sm">{props.result.reason}</div>
                </div>

                {/* Scoreboard */}
                <div class="mb-6">
                    <h2 class="text-white font-semibold mb-3 text-center">📊 Scorebord</h2>
                    <div class="space-y-2">
                        <For each={props.result.scores}>
                            {(player, index) => (
                                <div 
                                    class={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${getRankColor(index())} ${!player.isAlive ? 'opacity-60' : ''}`}
                                >
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl">{getRankEmoji(index())}</span>
                                        <div>
                                            <div class="font-bold text-white">
                                                {player.username || 'Speler'}
                                                {!player.isAlive && ' 💀'}
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
                        class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all hover:scale-105"
                    >
                        🔄 Opnieuw Spelen
                    </button>
                    <button
                        onClick={props.onBackToLobby}
                        class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all hover:scale-105"
                    >
                        🏠 Naar Lobby
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EndGameScreen;
