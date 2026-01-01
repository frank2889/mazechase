/**
 * StreakDisplay - Shows login streak with rewards
 * 
 * Features:
 * - Current streak counter with fire animation
 * - At-risk warning when about to lose streak
 * - Milestone rewards display
 * - Best streak record
 */

import { type Component, Show, createSignal, onMount, onCleanup } from 'solid-js';

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastPlayDate: string;
    totalDaysPlayed: number;
}

const STORAGE_KEY = 'mazechase_streak';

// Streak milestones with rewards
const STREAK_MILESTONES = [
    { days: 3, reward: 100, icon: '🎯', name: '3 Day Warrior' },
    { days: 7, reward: 300, icon: '🔥', name: 'Week Champion' },
    { days: 14, reward: 750, icon: '⭐', name: 'Fortnight Legend' },
    { days: 30, reward: 2000, icon: '👑', name: 'Monthly Master' },
    { days: 60, reward: 5000, icon: '💎', name: 'Diamond Player' },
    { days: 100, reward: 10000, icon: '🏆', name: 'Century Champion' },
];

function loadStreakData(): StreakData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load streak:', e);
    }
    return {
        currentStreak: 0,
        longestStreak: 0,
        lastPlayDate: '',
        totalDaysPlayed: 0
    };
}

function saveStreakData(data: StreakData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save streak:', e);
    }
}

function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

function isYesterday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

function isToday(dateStr: string): boolean {
    return dateStr === getTodayString();
}

function hoursUntilStreakLoss(lastPlayDate: string): number {
    if (!lastPlayDate) return 0;
    const last = new Date(lastPlayDate);
    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const diff = endOfToday.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 3600000));
}

export function updateStreak(): { newStreak: boolean; streakValue: number; reward?: number } {
    const data = loadStreakData();
    const today = getTodayString();
    
    // Already played today
    if (isToday(data.lastPlayDate)) {
        return { newStreak: false, streakValue: data.currentStreak };
    }
    
    // Streak continues if played yesterday
    let newStreak = 1;
    let reward: number | undefined;
    
    if (isYesterday(data.lastPlayDate)) {
        newStreak = data.currentStreak + 1;
    }
    
    // Check for milestone reward
    const milestone = STREAK_MILESTONES.find(m => m.days === newStreak);
    if (milestone) {
        reward = milestone.reward;
    }
    
    const newData: StreakData = {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, data.longestStreak),
        lastPlayDate: today,
        totalDaysPlayed: data.totalDaysPlayed + 1
    };
    
    saveStreakData(newData);
    return { newStreak: true, streakValue: newStreak, reward };
}

interface StreakDisplayProps {
    showMilestones?: boolean;
    compact?: boolean;
}

const StreakDisplay: Component<StreakDisplayProps> = (props) => {
    const [streak, setStreak] = createSignal<StreakData>(loadStreakData());
    const [isAtRisk, setIsAtRisk] = createSignal(false);
    const [hoursLeft, setHoursLeft] = createSignal(0);
    const [showReward, setShowReward] = createSignal(false);
    
    onMount(() => {
        const data = loadStreakData();
        setStreak(data);
        
        // Check if at risk
        if (data.lastPlayDate && !isToday(data.lastPlayDate)) {
            const hours = hoursUntilStreakLoss(data.lastPlayDate);
            setHoursLeft(hours);
            setIsAtRisk(hours < 4 && data.currentStreak > 0);
        }
        
        // Update hourly
        const timer = setInterval(() => {
            const hours = hoursUntilStreakLoss(streak().lastPlayDate);
            setHoursLeft(hours);
            setIsAtRisk(hours < 4 && streak().currentStreak > 0);
        }, 60000);
        
        onCleanup(() => clearInterval(timer));
    });
    
    const nextMilestone = () => {
        const current = streak().currentStreak;
        return STREAK_MILESTONES.find(m => m.days > current);
    };
    
    const progressToNext = () => {
        const next = nextMilestone();
        if (!next) return 100;
        
        const prev = STREAK_MILESTONES.filter(m => m.days < next.days).pop();
        const start = prev?.days || 0;
        const current = streak().currentStreak;
        
        return Math.min(100, ((current - start) / (next.days - start)) * 100);
    };
    
    return (
        <div class={`streak-display ${props.compact ? 'compact' : ''} ${isAtRisk() ? 'at-risk' : ''}`}>
            {/* Main streak counter */}
            <div class="streak-main">
                <div class="streak-fire-container">
                    <span class="streak-fire">{streak().currentStreak > 0 ? '🔥' : '💤'}</span>
                    <Show when={streak().currentStreak >= 7}>
                        <span class="streak-crown">👑</span>
                    </Show>
                </div>
                
                <div class="streak-count">{streak().currentStreak}</div>
                <div class="streak-label">Day Streak</div>
            </div>
            
            {/* At risk warning */}
            <Show when={isAtRisk() && streak().currentStreak > 0}>
                <div class="streak-warning">
                    <span class="warning-icon">⚠️</span>
                    <span>Play now! {hoursLeft()}h left to save your streak</span>
                </div>
            </Show>
            
            {/* Progress to next milestone */}
            <Show when={nextMilestone() && !props.compact}>
                <div class="streak-progress">
                    <div class="progress-label">
                        <span>Next: {nextMilestone()!.icon} {nextMilestone()!.name}</span>
                        <span class="progress-reward">+{nextMilestone()!.reward} coins</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style={`width: ${progressToNext()}%`}></div>
                    </div>
                    <div class="progress-text">
                        {nextMilestone()!.days - streak().currentStreak} days to go
                    </div>
                </div>
            </Show>
            
            {/* Stats */}
            <Show when={!props.compact}>
                <div class="streak-stats">
                    <div class="stat">
                        <span class="stat-value">{streak().longestStreak}</span>
                        <span class="stat-label">Best</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">{streak().totalDaysPlayed}</span>
                        <span class="stat-label">Total Days</span>
                    </div>
                </div>
            </Show>
            
            <style>{`
                .streak-display {
                    background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%);
                    border-radius: 16px;
                    padding: 20px;
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    text-align: center;
                }
                
                .streak-display.compact {
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .streak-display.at-risk {
                    border-color: #EF4444;
                    animation: pulse-warning 2s infinite;
                }
                
                @keyframes pulse-warning {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { box-shadow: 0 0 20px 5px rgba(239, 68, 68, 0.4); }
                }
                
                .streak-main {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }
                
                .compact .streak-main {
                    flex-direction: row;
                    gap: 12px;
                }
                
                .streak-fire-container {
                    position: relative;
                    font-size: 48px;
                    animation: flame 0.5s ease-in-out infinite alternate;
                }
                
                .compact .streak-fire-container {
                    font-size: 32px;
                }
                
                @keyframes flame {
                    from { transform: scale(1) rotate(-3deg); }
                    to { transform: scale(1.1) rotate(3deg); }
                }
                
                .streak-crown {
                    position: absolute;
                    top: -15px;
                    right: -15px;
                    font-size: 20px;
                }
                
                .streak-count {
                    font-size: 48px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #FCD34D, #F59E0B);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .compact .streak-count {
                    font-size: 32px;
                }
                
                .streak-label {
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                
                .streak-warning {
                    margin-top: 12px;
                    padding: 10px 16px;
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid #EF4444;
                    border-radius: 10px;
                    color: #FCA5A5;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .streak-progress {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                
                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    color: white;
                    margin-bottom: 8px;
                }
                
                .progress-reward {
                    color: #22D3EE;
                    font-weight: 600;
                }
                
                .progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #F59E0B, #FCD34D);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }
                
                .progress-text {
                    margin-top: 6px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                }
                
                .streak-stats {
                    margin-top: 16px;
                    display: flex;
                    justify-content: center;
                    gap: 32px;
                }
                
                .stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: white;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
};

export default StreakDisplay;
