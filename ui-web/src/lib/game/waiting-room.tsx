import { render } from 'solid-js/web';
import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import WaitingRoom, { type Player } from '../../components/WaitingRoom';
import { 
    subscribeLobbyState, 
    sendReadyToggle, 
    sendStartGame,
    type LobbyState 
} from './connection';

let dispose: (() => void) | null = null;

export function mountWaitingRoom() {
    const container = document.getElementById('waiting-room-container');
    if (!container) {
        console.error('Waiting room container not found');
        return;
    }

    dispose = render(() => <WaitingRoomWrapper />, container);
}

export function unmountWaitingRoom() {
    if (dispose) {
        dispose();
        dispose = null;
    }
}

function WaitingRoomWrapper() {
    const [lobbyState, setLobbyState] = createSignal<LobbyState>({
        players: [],
        spectators: [],
        matchStarted: false,
        hostId: '',
        isHost: false,
        isReady: false,
        isSpectator: false,
        playerCount: 0,
        readyCount: 0,
        countdown: null
    });

    createEffect(() => {
        const unsubscribe = subscribeLobbyState((state) => {
            setLobbyState(state);
        });

        onCleanup(() => {
            unsubscribe();
        });
    });

    const handleToggleReady = () => {
        sendReadyToggle();
    };

    const handleStartGame = () => {
        sendStartGame();
    };

    const handleLeave = () => {
        window.location.href = '/';
    };

    // Convert LobbyPlayer to Player format for WaitingRoom component
    const mapToPlayers = (): Player[] => {
        return lobbyState().players.map((p: any) => ({
            id: p.playerId || p.id || '',
            username: p.username || '',
            isReady: p.isReady || false,
            isHost: p.isHost || false,
            isSpectator: false,
            spriteType: p.spriteType || ''
        }));
    };

    const mapToSpectators = (): Player[] => {
        return lobbyState().spectators.map(s => ({
            id: s.id,
            username: s.username,
            isReady: false,
            isHost: false,
            isSpectator: true,
            spriteType: ''
        }));
    };

    return (
        <Show when={!lobbyState().matchStarted}>
            <WaitingRoom
                players={mapToPlayers()}
                spectators={mapToSpectators()}
                isHost={lobbyState().isHost}
                isReady={lobbyState().isReady}
                isSpectator={lobbyState().isSpectator}
                playerCount={lobbyState().playerCount}
                readyCount={lobbyState().readyCount}
                countdown={lobbyState().countdown}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
                onLeave={handleLeave}
            />
        </Show>
    );
}
