import { type Component, For, Show, createSignal, onMount } from 'solid-js';
import { 
    loadDailyProgress, 
    getTimeUntilReset, 
    type DailyProgress, 
    type DailyChallenge 
} from '../lib/game/dailyChallenges';
import { Clock, Flame, Gift, CheckCircle, Target } from 'lucide-solid';

interface DailyChallengesProps {
    onClose?: () => void;
}

/**
 * Daily Challenges Panel - Based on David's retention recommendations
 */
const DailyChallengesPanel: Component<DailyChallengesProps> = (props) => {
    const [progress, setProgress] = createSignal<DailyProgress | null>(null);
    const [timeLeft, setTimeLeft] = createSignal({ hours: 0, minutes: 0 });

    onMount(() => {
        setProgress(loadDailyProgress());
        setTimeLeft(getTimeUntilReset());
        
        // Update time every minute
        const timer = setInterval(() => {
            setTimeLeft(getTimeUntilReset());
        }, 60000);
        
        return () => clearInterval(timer);
    });

    const progressPercent = (challenge: DailyChallenge) => 
        Math.min((challenge.current / challenge.target) * 100, 100);

    const isComplete = (challenge: DailyChallenge) => 
        challenge.current >= challenge.target;

    return (
        <div class="bg-slate-900/95 backdrop-blur-sm rounded-2xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 p-6 max-w-md w-full">
            {/* Header */}
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Target class="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-white">Dagelijkse Uitdagingen</h2>
                        <div class="flex items-center gap-2 text-gray-400 text-sm">
                            <Clock class="w-4 h-4" />
                            <span>Reset over {timeLeft().hours}u {timeLeft().minutes}m</span>
                        </div>
                    </div>
                </div>
                
                <Show when={props.onClose}>
                    <button 
                        onClick={props.onClose}
                        class="text-gray-400 hover:text-white transition-colors text-2xl"
                    >
                        ×
                    </button>
                </Show>
            </div>

            {/* Streak Banner */}
            <Show when={progress()}>
                <div class="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <Flame class="w-8 h-8 text-yellow-300" />
                        <div>
                            <div class="text-white font-bold text-lg">
                                {progress()!.streakDays} Day Streak!
                            </div>
                            <div class="text-white/70 text-sm">
                                Keep playing for bonuses
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-yellow-300 font-bold text-xl">
                            +{progress()!.streakDays * 10}
                        </div>
                        <div class="text-white/70 text-sm">bonus/dag</div>
                    </div>
                </div>
            </Show>

            {/* Challenges List */}
            <div class="space-y-3">
                <Show when={progress()}>
                    <For each={progress()!.challenges}>
                        {(challenge) => (
                            <div 
                                class={`rounded-xl p-4 border-2 transition-all ${
                                    isComplete(challenge)
                                        ? 'bg-green-900/30 border-green-500/50'
                                        : 'bg-slate-800/50 border-slate-700/50'
                                }`}
                            >
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl">{challenge.icon}</span>
                                        <div>
                                            <div class="font-bold text-white flex items-center gap-2">
                                                {challenge.title}
                                                <Show when={isComplete(challenge)}>
                                                    <CheckCircle class="w-5 h-5 text-green-400" />
                                                </Show>
                                            </div>
                                            <div class="text-gray-400 text-sm">
                                                {challenge.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="flex items-center gap-1 text-yellow-400 font-bold">
                                            <Gift class="w-4 h-4" />
                                            +{challenge.reward}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div class="mt-2">
                                    <div class="flex justify-between text-sm mb-1">
                                        <span class="text-gray-400">Voortgang</span>
                                        <span class={isComplete(challenge) ? 'text-green-400' : 'text-white'}>
                                            {challenge.current}/{challenge.target}
                                        </span>
                                    </div>
                                    <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            class={`h-full rounded-full transition-all duration-500 ${
                                                isComplete(challenge)
                                                    ? 'bg-green-500'
                                                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                            }`}
                                            style={`width: ${progressPercent(challenge)}%`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </For>
                </Show>
            </div>

            {/* Total Earned */}
            <Show when={progress()}>
                <div class="mt-4 pt-4 border-t border-slate-700/50 text-center">
                    <div class="text-gray-400 text-sm">Totaal verdiend vandaag</div>
                    <div class="text-2xl font-bold text-yellow-400">
                        +{progress()!.totalBonusEarned} punten
                    </div>
                </div>
            </Show>

            {/* Play Button */}
            <button
                onClick={props.onClose}
                class="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-105 text-lg shadow-lg shadow-green-500/30"
            >
                🎮 Spelen & Uitdagingen Voltooien!
            </button>
        </div>
    );
};

export default DailyChallengesPanel;
