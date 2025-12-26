// Leaderboard component for multiplayer Pacman
import { createSignal, For, Show, onMount, JSX } from 'solid-js';
import { Trophy, Medal, Star, Ghost, Gamepad2, X } from 'lucide-solid';

export interface LeaderboardEntry {
    userId: number;
    username: string;
    wins: number;
    losses: number;
    ghostsEaten: number;
    pelletsEaten: number;
    gamesPlayed: number;
    highScore: number;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    currentUserId?: number;
    isLoading?: boolean;
    onClose?: () => void;
}

export function Leaderboard(props: LeaderboardProps) {
    const [activeTab, setActiveTab] = createSignal<'wins' | 'score' | 'ghosts'>('wins');

    const sortedEntries = () => {
        const entries = [...props.entries];
        switch (activeTab()) {
            case 'wins':
                return entries.sort((a, b) => b.wins - a.wins);
            case 'score':
                return entries.sort((a, b) => b.highScore - a.highScore);
            case 'ghosts':
                return entries.sort((a, b) => b.ghostsEaten - a.ghostsEaten);
            default:
                return entries;
        }
    };

    const getWinRate = (entry: LeaderboardEntry) => {
        const total = entry.wins + entry.losses;
        if (total === 0) return '0%';
        return `${Math.round((entry.wins / total) * 100)}%`;
    };

    const getRankDisplay = (index: number): JSX.Element => {
        switch (index) {
            case 0: return <Medal class="w-5 h-5 text-yellow-400" />;
            case 1: return <Medal class="w-5 h-5 text-gray-300" />;
            case 2: return <Medal class="w-5 h-5 text-amber-600" />;
            default: return <span>#{index + 1}</span>;
        }
    };

    return (
        <div class="leaderboard-overlay">
            <div class="leaderboard-container">
                {/* Header */}
                <div class="leaderboard-header">
                    <h2 class="leaderboard-title flex items-center gap-2"><Trophy class="w-6 h-6 text-purple-400" /> Leaderboard</h2>
                    <Show when={props.onClose}>
                        <button class="close-btn" onClick={props.onClose}><X class="w-5 h-5" /></button>
                    </Show>
                </div>

                {/* Tabs */}
                <div class="leaderboard-tabs">
                    <button
                        class={`tab-btn ${activeTab() === 'wins' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wins')}
                    >
                        <Medal class="w-4 h-4 inline mr-1" /> Wins
                    </button>
                    <button
                        class={`tab-btn ${activeTab() === 'score' ? 'active' : ''}`}
                        onClick={() => setActiveTab('score')}
                    >
                        <Star class="w-4 h-4 inline mr-1" /> High Score
                    </button>
                    <button
                        class={`tab-btn ${activeTab() === 'ghosts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ghosts')}
                    >
                        <Ghost class="w-4 h-4 inline mr-1" /> Chasers
                    </button>
                </div>

                {/* Loading state */}
                <Show when={props.isLoading}>
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading leaderboard...</p>
                    </div>
                </Show>

                {/* Leaderboard table */}
                <Show when={!props.isLoading}>
                    <div class="leaderboard-table">
                        {/* Table header */}
                        <div class="table-header">
                            <span class="col-rank">Rank</span>
                            <span class="col-player">Speler</span>
                            <span class="col-stat">
                                {activeTab() === 'wins' && 'Wins'}
                                {activeTab() === 'score' && 'Score'}
                                {activeTab() === 'ghosts' && 'Chasers'}
                            </span>
                            <span class="col-winrate">Win Rate</span>
                        </div>

                        {/* Table rows */}
                        <div class="table-body">
                            <For each={sortedEntries()}>
                                {(entry, index) => (
                                    <div
                                        class={`table-row ${entry.userId === props.currentUserId ? 'current-user' : ''} ${index() < 3 ? 'top-three' : ''}`}
                                    >
                                        <span class="col-rank">{getRankDisplay(index())}</span>
                                        <span class="col-player">
                                            <span class="player-avatar">
                                                {entry.username.charAt(0).toUpperCase()}
                                            </span>
                                            <span class="player-name">{entry.username}</span>
                                        </span>
                                        <span class="col-stat highlight">
                                            {activeTab() === 'wins' && entry.wins}
                                            {activeTab() === 'score' && entry.highScore.toLocaleString()}
                                            {activeTab() === 'ghosts' && entry.ghostsEaten}
                                        </span>
                                        <span class="col-winrate">{getWinRate(entry)}</span>
                                    </div>
                                )}
                            </For>
                        </div>

                        {/* Empty state */}
                        <Show when={sortedEntries().length === 0}>
                            <div class="empty-state">
                                <Gamepad2 class="w-12 h-12 text-purple-400 mx-auto mb-2" />
                                <p>Nog geen spelers. Wees de eerste!</p>
                            </div>
                        </Show>
                    </div>
                </Show>

                <style>{`
                    .leaderboard-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 2000;
                        backdrop-filter: blur(4px);
                    }

                    .leaderboard-container {
                        width: 90%;
                        max-width: 600px;
                        max-height: 80vh;
                        background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
                        border-radius: 16px;
                        border: 1px solid #333;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    }

                    .leaderboard-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 20px 24px;
                        background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
                        border-bottom: 1px solid #333;
                    }

                    .leaderboard-title {
                        margin: 0;
                        color: #fff;
                        font-size: 24px;
                        font-weight: 700;
                    }

                    .close-btn {
                        width: 36px;
                        height: 36px;
                        border: none;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.1);
                        color: #888;
                        font-size: 18px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .close-btn:hover {
                        background: rgba(255, 100, 100, 0.2);
                        color: #ff6666;
                    }

                    .leaderboard-tabs {
                        display: flex;
                        padding: 12px;
                        gap: 8px;
                        background: rgba(0, 0, 0, 0.3);
                    }

                    .tab-btn {
                        flex: 1;
                        padding: 10px;
                        border: none;
                        border-radius: 8px;
                        background: transparent;
                        color: #888;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .tab-btn:hover {
                        background: rgba(255, 255, 255, 0.05);
                        color: #aaa;
                    }

                    .tab-btn.active {
                        background: linear-gradient(135deg, #00c896 0%, #00a67d 100%);
                        color: white;
                    }

                    .loading-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 60px 20px;
                        color: #888;
                    }

                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid #333;
                        border-top-color: #00c896;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 16px;
                    }

                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }

                    .leaderboard-table {
                        max-height: 400px;
                        overflow-y: auto;
                    }

                    .table-header {
                        display: grid;
                        grid-template-columns: 60px 1fr 80px 80px;
                        padding: 12px 16px;
                        background: rgba(0, 0, 0, 0.3);
                        color: #666;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        position: sticky;
                        top: 0;
                    }

                    .table-body {
                        padding: 8px;
                    }

                    .table-row {
                        display: grid;
                        grid-template-columns: 60px 1fr 80px 80px;
                        padding: 12px 16px;
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 8px;
                        margin-bottom: 4px;
                        align-items: center;
                        transition: all 0.2s;
                    }

                    .table-row:hover {
                        background: rgba(255, 255, 255, 0.05);
                    }

                    .table-row.current-user {
                        background: rgba(0, 200, 150, 0.1);
                        border: 1px solid rgba(0, 200, 150, 0.3);
                    }

                    .table-row.top-three {
                        background: rgba(255, 215, 0, 0.05);
                    }

                    .col-rank {
                        font-size: 16px;
                        text-align: center;
                    }

                    .col-player {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .player-avatar {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 700;
                        font-size: 14px;
                    }

                    .player-name {
                        color: #fff;
                        font-weight: 500;
                    }

                    .col-stat {
                        text-align: center;
                        color: #888;
                    }

                    .col-stat.highlight {
                        color: #00c896;
                        font-weight: 700;
                        font-size: 16px;
                    }

                    .col-winrate {
                        text-align: center;
                        color: #888;
                    }

                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: #666;
                    }

                    .empty-icon {
                        font-size: 48px;
                        display: block;
                        margin-bottom: 16px;
                    }

                    @media (max-width: 768px) {
                        .table-header,
                        .table-row {
                            grid-template-columns: 50px 1fr 60px;
                        }

                        .col-winrate {
                            display: none;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}

/**
 * Player Stats Card Component
 */
export function PlayerStatsCard(props: { stats: LeaderboardEntry }) {
    return (
        <div class="stats-card">
            <div class="stats-header">
                <div class="stats-avatar">
                    {props.stats.username.charAt(0).toUpperCase()}
                </div>
                <div class="stats-info">
                    <h3 class="stats-username">{props.stats.username}</h3>
                    <span class="stats-games">{props.stats.gamesPlayed} games played</span>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">{props.stats.wins}</span>
                    <span class="stat-label">Wins</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.stats.highScore.toLocaleString()}</span>
                    <span class="stat-label">High Score</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.stats.ghostsEaten}</span>
                    <span class="stat-label">Ghosts Eaten</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">{props.stats.pelletsEaten}</span>
                    <span class="stat-label">Pellets</span>
                </div>
            </div>

            <style>{`
                .stats-card {
                    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    border: 1px solid #333;
                    padding: 20px;
                    width: 280px;
                }

                .stats-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .stats-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #00c896 0%, #00a67d 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 20px;
                }

                .stats-info {
                    flex: 1;
                }

                .stats-username {
                    margin: 0;
                    color: #fff;
                    font-size: 18px;
                }

                .stats-games {
                    color: #666;
                    font-size: 13px;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .stat-item {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                }

                .stat-value {
                    display: block;
                    color: #00c896;
                    font-size: 20px;
                    font-weight: 700;
                }

                .stat-label {
                    color: #666;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
            `}</style>
        </div>
    );
}
