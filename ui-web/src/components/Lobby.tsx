import {type Component, createEffect, createSignal, For, onCleanup, Show} from 'solid-js';
import type {Lobby} from "../lib/generated/lobby/v1/lobby_pb.ts";
import {addLobby, deleteLobby, getRelativeTime, listLobbies} from "../lib/lobby.ts";
import {getUserInfo, logout} from "../lib/auth.ts";
import Snackbar, {type SnackbarMessage} from "./Snackbar.tsx";
import {GAME_MODES, type GameMode} from "../lib/game/modes.ts";

const LobbyComponent: Component = () => {
    const [currentUser, setCurrentUser] = createSignal<string | null>(null);
    const welcomeMessage = "Welkom ";

    const [lobbies, setLobbies] = createSignal<Lobby[]>([]);
    const [loading, setLoading] = createSignal(false);
    const [hasLoadedLobbies, setHasLoadedLobbies] = createSignal(false);
    const [newLobbyName, setNewLobbyName] = createSignal("");
    const [isCreatingLobby, setIsCreatingLobby] = createSignal(false);
    const [selectedMode, setSelectedMode] = createSignal<GameMode>('classic');
    const [joinCode, setJoinCode] = createSignal("");
    const [showLeaderboard, setShowLeaderboard] = createSignal(false);

    let refreshInterval: NodeJS.Timeout | null = null;

    // Snackbar state
    const [snackbarMessage, setSnackbarMessage] = createSignal<SnackbarMessage | null>(null);
    const showSnackbar = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration?: number) => {
        setSnackbarMessage({
            id: Date.now().toString(),
            message,
            type,
            duration
        });
    };
    const closeSnackbar = () => {
        setSnackbarMessage(null);
    };


    const handleCreateLobby = async (): Promise<void> => {
        const lobbyName = newLobbyName().trim();
        if (!lobbyName) return;

        setIsCreatingLobby(true);

        const {err} = await addLobby(lobbyName);
        if (err) {
            showSnackbar(`Fout bij aanmaken lobby: ${err}`, 'error');
        }

        setNewLobbyName("");
        await loadLobbies();

        setIsCreatingLobby(false);
    };

    const handleKeyPress = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' && !isCreatingLobby()) {
            handleCreateLobby().then();
        }
    };


    const loadLobbies = async (): Promise<void> => {
        try {
            // Only show loading indicator if no previous data exists
            if (!hasLoadedLobbies()) {
                setLoading(true);
            }

            const {val, err} = await listLobbies();
            if (err) {
                console.error('Failed to load lobbies:', err);
                return;
            }

            // Hide loading indicator after first load
            if (!hasLoadedLobbies()) {
                setLoading(false);
                setHasLoadedLobbies(true);
            }

            const lobbyList: Lobby[] = val?.lobbies ?? [];
            setLobbies(lobbyList);
        } catch (error) {
            console.error('Error loading lobbies:', error);
            if (!hasLoadedLobbies()) {
                setLoading(false);
                setHasLoadedLobbies(true);
            }
        }
    };

    const startAutoRefresh = (): void => {
        loadLobbies().then();
        refreshInterval = setInterval(loadLobbies, 1000);
    };

    const stopAutoRefresh = (): void => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    };

    const handleJoinLobby = (lobbyId: string, mode: GameMode = selectedMode()) => {
        window.location.assign(`/game?lobby=${lobbyId}&mode=${mode}`);
    };

    const handleJoinByCode = () => {
        const code = joinCode().trim();
        if (code) {
            handleJoinLobby(code);
        }
    };

    const handleLogout = (): void => {
        stopAutoRefresh();
        logout().finally(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/auth/login';
        });
    };

    // Initialize component
    createEffect(async () => {
        try {
            const username: string = await getUserInfo();
            setCurrentUser(username);
            startAutoRefresh();
        } catch (error) {
            console.error('Failed to get user info:', error);
        }
    });

    // Handle visibility change
    createEffect(() => {
        const handleVisibilityChange = (): void => {
            if (document.visibilityState === 'hidden') {
                stopAutoRefresh();
            } else {
                startAutoRefresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', stopAutoRefresh);

        onCleanup(() => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', stopAutoRefresh);
            stopAutoRefresh();
        });
    });

    return (
        <div class="min-h-screen">
            <Snackbar message={snackbarMessage()} onClose={closeSnackbar}/>

            {/* Header */}
            <div class="relative flex justify-center items-center pt-10 pb-6 px-6">
                <h1 class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 text-5xl font-bold tracking-wider drop-shadow-lg">
                    🎮 MazeChase
                </h1>

                <div class="absolute left-20 flex gap-3">
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        class="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors duration-200"
                    >
                        🏆 Leaderboard
                    </button>
                </div>

                <div class="absolute right-20 flex flex-col items-center">
                    <div class="text-gray-300 font-medium text-lg mb-3">
                        {welcomeMessage}
                        {currentUser() && (<span class="text-blue-400 font-bold">{currentUser()}</span>)}
                    </div>
                    <button
                        onClick={handleLogout}
                        class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-colors duration-200 ease-in-out"
                    >
                        Uitloggen
                    </button>
                </div>
            </div>

            {/* Leaderboard Modal */}
            <Show when={showLeaderboard()}>
                <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowLeaderboard(false)}>
                    <div class="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border-2 border-yellow-500/50" onClick={(e) => e.stopPropagation()}>
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-yellow-400">🏆 Leaderboard</h2>
                            <button onClick={() => setShowLeaderboard(false)} class="text-gray-400 hover:text-white text-2xl">×</button>
                        </div>
                        <div class="text-center py-8 text-gray-400">
                            <div class="text-4xl mb-4">🎮</div>
                            <p>Leaderboard wordt bijgehouden na je eerste game!</p>
                            <p class="text-sm mt-2 text-gray-500">Speel een potje om je score te registreren.</p>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Main Content */}
            <div class="px-6 pb-6">
                <div class="text-center mb-6 relative">
                    <Show when={loading()}>
                        <div
                            class="absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center text-gray-400">
                            <svg
                                class="animate-spin -ml-1 mr-2 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                />
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Loading...
                        </div>
                    </Show>
                </div>

                {/* Game Mode Selection */}
                <div class="max-w-2xl mx-auto mb-6">
                    <h3 class="text-gray-300 text-xl font-semibold mb-3 text-center">🎮 Kies Speelmodus</h3>
                    <div class="grid grid-cols-3 gap-3">
                        <For each={Object.values(GAME_MODES)}>
                            {(mode) => (
                                <button
                                    onClick={() => setSelectedMode(mode.id)}
                                    class={`p-4 rounded-lg border-2 transition-all ${
                                        selectedMode() === mode.id
                                            ? 'border-yellow-400 bg-yellow-400/20 scale-105'
                                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                    }`}
                                >
                                    <div class="text-3xl mb-1">{mode.icon}</div>
                                    <div class="text-white font-bold">{mode.nameNL}</div>
                                    <div class="text-gray-400 text-xs mt-1">{mode.descriptionNL}</div>
                                </button>
                            )}
                        </For>
                    </div>
                </div>

                {/* Join by Code */}
                <div class="max-w-md mx-auto mb-6">
                    <div class="p-4 rounded-lg shadow-lg bg-blue-900/30 backdrop-blur-md border border-blue-500/30">
                        <div class="text-gray-300 text-lg font-semibold mb-2">🔗 Join met Code</div>
                        <div class="flex gap-2">
                            <input
                                type="text"
                                placeholder="Voer lobby code in..."
                                value={joinCode()}
                                onInput={(e) => setJoinCode(e.currentTarget.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
                                class="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={handleJoinByCode}
                                disabled={!joinCode().trim()}
                                class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create Lobby Section */}
                <div class="max-w-md mx-auto mb-8">
                    <div class="p-6 rounded-lg shadow-lg bg-white/10 backdrop-blur-md border border-white/20">
                        <div class="flex gap-3 items-center">
                            <div class="text-gray-300 text-xl font-semibold">➕ Maak Lobby</div>
                            <input
                                type="text"
                                placeholder="lobby naam"
                                value={newLobbyName()}
                                onInput={(e) => setNewLobbyName(e.currentTarget.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isCreatingLobby()}
                                class="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleCreateLobby}
                                disabled={!newLobbyName().trim() || isCreatingLobby()}
                                class="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 ease-in-out"
                            >
                                <Show when={isCreatingLobby()} fallback="Maak">
                                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                         fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                stroke-width="4"/>
                                        <path class="opacity-75" fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                </Show>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lobbies Grid */}
                <Show
                    when={lobbies().length > 0}
                    fallback={
                        <div class="text-center py-12">
                            <div class="text-gray-400 text-xl">Geen lobbies beschikbaar</div>
                            <div class="text-gray-500 text-sm mt-2">
                                Maak een nieuwe lobby om te beginnen!
                            </div>
                        </div>
                    }
                >
                    <h3 class="text-gray-300 text-xl font-semibold mb-3 text-center">📋 Actieve Lobbies</h3>
                    <div class="px-10 grid gap-4 grid-cols-1
                                sm:grid-cols-2
                                md:grid-cols-3
                                lg:grid-cols-5
                                xl:grid-cols-6"
                    >
                        <For each={lobbies()}>
                            {(lobby) => (
                                <LobbyCard
                                    lobby={lobby}
                                    currentUser={currentUser() ?? ""}
                                    selectedMode={selectedMode()}
                                    onJoin={() => handleJoinLobby(lobby.ID.toString(), selectedMode())}
                                    refreshLobby={loadLobbies}
                                    showSnackbar={showSnackbar}
                                />
                            )}
                        </For>
                    </div>
                </Show>
            </div>
        </div>
    );
};

interface LobbyCardProps {
    lobby: Lobby;
    currentUser: string;
    selectedMode: GameMode;
    onJoin: () => void;
    refreshLobby: () => Promise<void>;
    showSnackbar: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

const LobbyCard: Component<LobbyCardProps> = (props) => {
    let cardRef: HTMLDivElement | undefined;
    const [copied, setCopied] = createSignal(false);

    const handleLobbyDelete = async (): Promise<void> => {
        const lobby = props.lobby;
        console.log('Deleting lobby:', lobby);

        const {err} = await deleteLobby(lobby);
        if (err) {
            console.error("Unable to delete lobby", err);
            // Show error snackbar
            props.showSnackbar?.(`Failed to delete lobby: ${err || 'Unknown error'}`, 'error');
        } else {
            // Show success snackbar
            props.showSnackbar?.(`Lobby "${lobby.lobbyName}" verwijderd`, 'info');
        }

        await props.refreshLobby();
    };

    const handleDeleteClick = () => {
        handleLobbyDelete();
    };

    const getShareLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/game?lobby=${props.lobby.ID}&mode=${props.selectedMode}`;
    };

    const copyShareLink = async () => {
        const mode = GAME_MODES[props.selectedMode];
        try {
            await navigator.clipboard.writeText(getShareLink());
            setCopied(true);
            props.showSnackbar?.(`Link gekopieerd! (${mode.icon} ${mode.nameNL})`, 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for Safari
            const textArea = document.createElement('textarea');
            textArea.value = getShareLink();
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            props.showSnackbar?.(`Link gekopieerd! (${mode.icon} ${mode.nameNL})`, 'success');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div
            ref={cardRef}
            class="lobby-card w-60 h-56 p-4 rounded-lg shadow-lg bg-white/10 backdrop-blur-md border border-white/20"
        >
            {/* Lobby Name */}
            <h3 class="text-white text-lg font-semibold mb-2">
                {props.lobby.lobbyName}
            </h3>

            {/* Lobby Code for sharing */}
            <div class="bg-gray-800 rounded px-2 py-1 mb-2 text-center">
                <span class="text-yellow-400 font-mono text-sm">Code: #{props.lobby.ID}</span>
            </div>

            {/* Lobby Details */}
            <div class="lobby-details text-white/90 text-sm mb-3 space-y-1 flex-1">
                <div class="flex items-center">
                    <span class="text-white/70 font-medium">Spelers:</span>
                    <span class="ml-2">{props.lobby.playerCount.toString()}/4</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div class="flex flex-col gap-2">
                <div class="flex justify-between items-center">
                    <button
                        onClick={props.onJoin}
                        class="join-btn bg-green-500/80 hover:bg-green-500 text-white px-4 py-2 rounded transition-colors backdrop-blur-sm font-bold"
                    >
                        ▶ Spelen
                    </button>

                    <button
                        onClick={copyShareLink}
                        class={`px-3 py-2 rounded transition-colors backdrop-blur-sm ${copied() ? 'bg-green-600 text-white' : 'bg-blue-500/80 hover:bg-blue-500 text-white'}`}
                    >
                        {copied() ? '✓ Gekopieerd!' : '🔗 Deel'}
                    </button>
                </div>

                <Show when={props.lobby.ownerName === props.currentUser}>
                    <button
                        onClick={handleDeleteClick}
                        class="delete-btn bg-red-500/60 hover:bg-red-500 text-white px-4 py-1 rounded transition-colors backdrop-blur-sm text-sm"
                    >
                        Verwijder
                    </button>
                </Show>
            </div>
        </div>
    );
};

export default LobbyComponent;
