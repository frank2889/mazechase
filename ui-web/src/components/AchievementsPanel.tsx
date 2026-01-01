/**
 * AchievementsPanel - Display achievements and badges
 */

import { type Component, For, Show, createSignal, onMount, createMemo } from 'solid-js';
import { 
    loadAchievements, 
    getAchievementStats, 
    getAchievementRarity,
    type Achievement,
    type AchievementState 
} from '../lib/game/achievements';

interface AchievementsPanelProps {
    onClose?: () => void;
    compact?: boolean;
}

const TIER_COLORS = {
    bronze: { bg: 'from-amber-700 to-amber-900', text: 'text-amber-400', border: 'border-amber-600' },
    silver: { bg: 'from-gray-400 to-gray-600', text: 'text-gray-300', border: 'border-gray-400' },
    gold: { bg: 'from-yellow-500 to-yellow-700', text: 'text-yellow-400', border: 'border-yellow-500' },
    platinum: { bg: 'from-cyan-400 to-cyan-600', text: 'text-cyan-300', border: 'border-cyan-400' },
    diamond: { bg: 'from-purple-400 to-pink-500', text: 'text-purple-300', border: 'border-purple-400' },
};

const CATEGORY_ICONS = {
    gameplay: '🎮',
    collection: '🏅',
    social: '👥',
    mastery: '🏆',
    special: '⭐',
};

const CATEGORY_NAMES = {
    gameplay: 'Gameplay',
    collection: 'Collectie',
    social: 'Sociaal',
    mastery: 'Mastery',
    special: 'Speciaal',
};

const AchievementsPanel: Component<AchievementsPanelProps> = (props) => {
    const [state, setState] = createSignal<AchievementState | null>(null);
    const [activeCategory, setActiveCategory] = createSignal<string>('all');
    const [showLocked, setShowLocked] = createSignal(true);
    
    onMount(() => {
        setState(loadAchievements());
    });
    
    const stats = createMemo(() => getAchievementStats());
    
    const filteredAchievements = createMemo(() => {
        if (!state()) return [];
        
        let achievements = state()!.achievements;
        
        // Filter hidden locked achievements
        achievements = achievements.filter(a => !a.hidden || a.unlocked);
        
        // Filter by category
        if (activeCategory() !== 'all') {
            achievements = achievements.filter(a => a.category === activeCategory());
        }
        
        // Filter locked if needed
        if (!showLocked()) {
            achievements = achievements.filter(a => a.unlocked);
        }
        
        // Sort: unlocked first, then by tier
        const tierOrder = { diamond: 0, platinum: 1, gold: 2, silver: 3, bronze: 4 };
        return achievements.sort((a, b) => {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
            return tierOrder[a.tier] - tierOrder[b.tier];
        });
    });
    
    const AchievementCard = (p: { achievement: Achievement }) => {
        const a = p.achievement;
        const tierStyle = TIER_COLORS[a.tier];
        const rarity = getAchievementRarity(a.id);
        const progressPercent = Math.min((a.progress / a.requirement) * 100, 100);
        
        return (
            <div class={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'} ${tierStyle.border}`}>
                <div class="achievement-icon">
                    <span class={`icon ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
                    <Show when={a.unlocked}>
                        <div class={`tier-badge ${tierStyle.bg}`}>
                            {a.tier.charAt(0).toUpperCase()}
                        </div>
                    </Show>
                </div>
                
                <div class="achievement-info">
                    <h4 class={a.unlocked ? tierStyle.text : 'text-gray-500'}>
                        {a.name}
                    </h4>
                    <p class="achievement-desc">{a.description}</p>
                    
                    <Show when={!a.unlocked}>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div 
                                    class="progress-fill" 
                                    style={`width: ${progressPercent}%`}
                                ></div>
                            </div>
                            <span class="progress-text">
                                {a.progress} / {a.requirement}
                            </span>
                        </div>
                    </Show>
                    
                    <Show when={a.unlocked}>
                        <div class="unlocked-info">
                            <span class="reward">+{a.reward} 💰</span>
                            <span class="rarity">{rarity}% of players</span>
                        </div>
                    </Show>
                </div>
            </div>
        );
    };
    
    return (
        <div class="achievements-panel">
            {/* Header */}
            <div class="panel-header">
                <div class="header-left">
                    <h2>🏆 Achievements</h2>
                    <div class="header-stats">
                        <span class="stat-count">{stats().unlocked} / {stats().total}</span>
                        <span class="stat-percent">({stats().percentage}%)</span>
                    </div>
                </div>
                <Show when={props.onClose}>
                    <button class="close-btn" onClick={props.onClose}>✕</button>
                </Show>
            </div>
            
            {/* Progress Overview */}
            <div class="progress-overview">
                <div class="progress-bar-large">
                    <div 
                        class="progress-fill-large" 
                        style={`width: ${stats().percentage}%`}
                    ></div>
                </div>
                <div class="total-coins">
                    <span>Totaal verdiend:</span>
                    <span class="coins-value">{state()?.totalCoinsEarned || 0} 💰</span>
                </div>
            </div>
            
            {/* Category Tabs */}
            <div class="category-tabs">
                <button 
                    class={`tab ${activeCategory() === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    🎯 Alle
                </button>
                <For each={Object.entries(CATEGORY_ICONS)}>
                    {([cat, icon]) => (
                        <button 
                            class={`tab ${activeCategory() === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {icon} {CATEGORY_NAMES[cat as keyof typeof CATEGORY_NAMES]}
                        </button>
                    )}
                </For>
            </div>
            
            {/* Filter Toggle */}
            <div class="filter-toggle">
                <label>
                    <input 
                        type="checkbox" 
                        checked={showLocked()}
                        onChange={(e) => setShowLocked(e.target.checked)}
                    />
                    <span>Toon vergrendelde achievements</span>
                </label>
            </div>
            
            {/* Achievements Grid */}
            <div class="achievements-grid">
                <For each={filteredAchievements()}>
                    {(achievement) => <AchievementCard achievement={achievement} />}
                </For>
                
                <Show when={filteredAchievements().length === 0}>
                    <div class="no-achievements">
                        <span>🎮</span>
                        <p>Geen achievements in deze categorie</p>
                    </div>
                </Show>
            </div>
            
            <style>{`
                .achievements-panel {
                    background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
                    border-radius: 20px;
                    max-width: 800px;
                    width: 100%;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                .panel-header h2 {
                    margin: 0;
                    font-size: 28px;
                    color: white;
                }
                
                .header-stats {
                    display: flex;
                    gap: 8px;
                    font-size: 16px;
                }
                
                .stat-count {
                    color: #22D3EE;
                    font-weight: 600;
                }
                
                .stat-percent {
                    color: rgba(255,255,255,0.5);
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 8px;
                    min-width: auto;
                    min-height: auto;
                }
                
                .progress-overview {
                    padding: 16px 24px;
                    background: rgba(0,0,0,0.2);
                }
                
                .progress-bar-large {
                    height: 12px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 6px;
                    overflow: hidden;
                }
                
                .progress-fill-large {
                    height: 100%;
                    background: linear-gradient(90deg, #8B5CF6, #22D3EE);
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }
                
                .total-coins {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                }
                
                .coins-value {
                    color: #FCD34D;
                    font-weight: 600;
                }
                
                .category-tabs {
                    display: flex;
                    gap: 8px;
                    padding: 16px 24px;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                
                .category-tabs::-webkit-scrollbar {
                    display: none;
                }
                
                .tab {
                    padding: 10px 16px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                    min-height: auto;
                    min-width: auto;
                }
                
                .tab:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                .tab.active {
                    background: linear-gradient(135deg, #8B5CF6, #22D3EE);
                    color: white;
                    border-color: transparent;
                }
                
                .filter-toggle {
                    padding: 0 24px 16px;
                }
                
                .filter-toggle label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                }
                
                .filter-toggle input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #8B5CF6;
                }
                
                .achievements-grid {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 24px 24px;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                }
                
                .achievement-card {
                    display: flex;
                    gap: 16px;
                    padding: 16px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    border: 2px solid;
                    transition: all 0.2s;
                }
                
                .achievement-card.unlocked {
                    background: rgba(255,255,255,0.08);
                }
                
                .achievement-card.locked {
                    border-color: rgba(255,255,255,0.1) !important;
                    opacity: 0.7;
                }
                
                .achievement-icon {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.3);
                    border-radius: 12px;
                    flex-shrink: 0;
                }
                
                .achievement-icon .icon {
                    font-size: 32px;
                }
                
                .achievement-icon .icon.grayscale {
                    filter: grayscale(100%);
                    opacity: 0.5;
                }
                
                .tier-badge {
                    position: absolute;
                    bottom: -6px;
                    right: -6px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    color: white;
                    background: linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to));
                }
                
                .achievement-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .achievement-info h4 {
                    margin: 0 0 4px;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .achievement-desc {
                    margin: 0 0 8px;
                    font-size: 13px;
                    color: rgba(255,255,255,0.6);
                }
                
                .progress-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .progress-bar {
                    flex: 1;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8B5CF6, #22D3EE);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                }
                
                .progress-text {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                    white-space: nowrap;
                }
                
                .unlocked-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                }
                
                .reward {
                    color: #FCD34D;
                    font-weight: 600;
                }
                
                .rarity {
                    color: rgba(255,255,255,0.4);
                }
                
                .no-achievements {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    color: rgba(255,255,255,0.4);
                }
                
                .no-achievements span {
                    font-size: 48px;
                    display: block;
                    margin-bottom: 16px;
                }
                
                @media (max-width: 600px) {
                    .achievements-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .category-tabs {
                        padding: 12px 16px;
                    }
                    
                    .tab {
                        padding: 8px 12px;
                        font-size: 12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default AchievementsPanel;
