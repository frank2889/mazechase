import {showError} from "./utils.ts";
import type {AnimDir, GameMessage, LobbyPlayer} from "./models.ts";
import {getBaseUrl} from "../api.ts";

let ws: WebSocket;
let resolvePromise: ((value: string | PromiseLike<string>) => void) | undefined;
// let _rejectPromise: ((reason?: any) => void | undefined) | undefined;
let gameStatePromise: Promise<string>

let prevGameState: any = {}

// Game event handlers for 3D scene
export interface GameEventHandlers {
    onPlayerMove?: (spriteId: string, x: number, y: number, dir: string) => void;
    onPelletEaten?: (tileX: number, tileY: number) => void;
    onPowerUpEaten?: (tileX: number, tileY: number) => void;
    onPowerUpEnd?: () => void;
    onPlayerCaught?: (runnerId: string, chaserId: string) => void;
    onGameOver?: (winner: string, scores: Record<string, number>) => void;
    onScoreUpdate?: (scores: Record<string, number>) => void;
    onPlayerJoin?: (spriteId: string, username: string) => void;
    onPlayerLeave?: (spriteId: string) => void;
}

let gameEventHandlers: GameEventHandlers = {};

export function subscribeGameEvents(handlers: GameEventHandlers) {
    gameEventHandlers = { ...gameEventHandlers, ...handlers };
}

// Lobby state management
export interface LobbyState {
    players: LobbyPlayer[];
    spectators: LobbyPlayer[];
    matchStarted: boolean;
    hostId: string;
    isHost: boolean;
    isReady: boolean;
    isSpectator: boolean;
    playerCount: number;
    readyCount: number;
    countdown: number | null;
}

let lobbyState: LobbyState = {
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
};

let lobbyStateListeners: ((state: LobbyState) => void)[] = [];

export function subscribeLobbyState(listener: (state: LobbyState) => void) {
    lobbyStateListeners.push(listener);
    listener(lobbyState); // Initial call
    return () => {
        lobbyStateListeners = lobbyStateListeners.filter(l => l !== listener);
    };
}

function notifyLobbyStateListeners() {
    lobbyStateListeners.forEach(listener => listener({...lobbyState}));
}

export function getLobbyState(): LobbyState {
    return {...lobbyState};
}

export function getSpriteID() {
    return (prevGameState.spriteId ?? "") as string
}

export function getUsername() {
    return (prevGameState.username ?? "") as string
}

let messageHandlers: { [key: string]: (json: any) => void } = {
    "active": handleNewPlayerJoin,
    "state": handleGameStateMessage,
    "dis": handleDisconnect,
    "pos": handlePosMessage,
    "pel": handlePellet,
    "pow": handlePowerPelletStart,
    "powend": handlePowerPelletEnd,
    "kill": handlePlayerKilled,
    "gameover": handleGameOver,
    "lobbystatus": handleLobbyStatus,
    "countdown": handleCountdown,
    "gamestart": handleGameStart
}

// Reconnection state
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 1000; // 1 second base delay
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let isReconnecting = false;

export function connectToWebSocket() {
    let wssProtocol = `${window.location.protocol === 'https:' ? 'wss://' : 'ws://'}`

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    const lobbyId = params.get('lobby');
    if (lobbyId === null) {
        throw new Error("lobbyId must be provided");
    }
    
    // Check if solo mode
    const isSingle = params.get('single') === 'true';

    const base = new URL(getBaseUrl())
    const url = wssProtocol + base.host + `/api/game?lobby=${lobbyId}${isSingle ? '&single=true' : ''}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        isReconnecting = false;
    };

    ws.onmessage = (ev) => handleMessage(ev);
    ws.onerror = (ev) => handleError(ev);
    ws.onclose = (ev) => handleClose(ev);

    gameStatePromise = new Promise<string>((resolve, _) => {
        resolvePromise = resolve;
        // _rejectPromise = reject;
    });
}

function handleClose(ev: CloseEvent) {
    console.log('WebSocket closed:', ev.code, ev.reason);
    
    // Don't reconnect if game is over or if manually closed
    if (ev.code === 1000 || ev.code === 1001) {
        console.log('Normal close, not reconnecting');
        return;
    }
    
    // Attempt reconnection
    attemptReconnect();
}

function attemptReconnect() {
    if (isReconnecting) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        showError('Verbinding verloren. Vernieuw de pagina om opnieuw te verbinden.');
        return;
    }
    
    isReconnecting = true;
    reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect...');
        isReconnecting = false;
        connectToWebSocket();
    }, delay);
}

export function cancelReconnect() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    isReconnecting = false;
}

export async function waitForGameState() {
    await gameStatePromise;
}


export function getGameState() {
    return prevGameState;
}

function handleMessage(msg: MessageEvent): void {
    if (!msg.data) {
        console.log("No data received")
        return
    }

    try {
        const json = JSON.parse(msg.data);
        const mType = json["type"] as string

        const handler = messageHandlers[mType]
        if (!handler) {
            console.warn(`No handler found: ${mType}`);
            return;
        }

        if (Object.keys(prevGameState).length === 0 && !["state", "lobbystatus", "countdown", "gamestart"].includes(mType)) {
            // state has not been received
            // game has not started, ignore all messages (except lobby-related ones)
            return;
        }

        handler(json)
    } catch (e: any) {
        console.log("unable to handle message")
        console.log(e)
        console.log(msg.data)
        // showError(e)
    }
}

function handleError(ev: Event): void {
    console.log('Error: ', ev.type);
    showError(ev.type);
}

function handleGameStateMessage(msg: any) {
    prevGameState = msg;
    console.log(prevGameState)
    
    // Sync lobby state from game state message
    if (msg.matchStarted !== undefined) {
        lobbyState.matchStarted = msg.matchStarted;
    }
    if (msg.hostId !== undefined) {
        lobbyState.hostId = msg.hostId;
    }
    if (msg.isHost !== undefined) {
        lobbyState.isHost = msg.isHost;
    }
    if (msg.playerCount !== undefined) {
        lobbyState.playerCount = msg.playerCount;
    }
    if (msg.readyCount !== undefined) {
        lobbyState.readyCount = msg.readyCount;
    }
    if (msg.playersList) {
        lobbyState.players = msg.playersList;
    }
    
    notifyLobbyStateListeners();
    
    if (resolvePromise) {
        resolvePromise("")
    }
}

// actual join with player info
function handleNewPlayerJoin(json: any) {
    if (!json.spriteType) {
        throw new Error("No sprite id found")
    }

    const spriteId = json.spriteType;
    const username = json.user;
    console.log(`New player joined ${spriteId}: ${username}`);
    
    // Notify 3D scene
    gameEventHandlers.onPlayerJoin?.(spriteId, username);
}

function handlePosMessage(json: any) {
    let spriteId = json.spriteType
    let x = json.x as number;
    let y = json.y as number;
    let dir = json.dir as string;

    // Notify 3D scene of position update
    gameEventHandlers.onPlayerMove?.(spriteId, x, y, dir);
}


function handleDisconnect(json: any) {
    console.log('disconnect')
    console.log(json)

    let spriteId = json.spriteType;
    
    // Notify 3D scene
    gameEventHandlers.onPlayerLeave?.(spriteId);
}


function handlePellet(json: any) {
    const x = json.x as number
    const y = json.y as number
    console.log(`Pellet eaten at x:${x}, y:${y}`)

    // Notify 3D scene
    gameEventHandlers.onPelletEaten?.(x, y);
}


function handlePowerPelletStart(json: any) {
    const x = json.x as number
    const y = json.y as number
    console.log(`Power eaten at x:${x}, y:${y}`)

    // Notify 3D scene
    gameEventHandlers.onPowerUpEaten?.(x, y);
}


function handlePowerPelletEnd(_json: any) {
    console.log(`power up ended`)

    // Notify 3D scene
    gameEventHandlers.onPowerUpEnd?.();
}


function handlePlayerKilled(json: any) {
    let spriteId = json.spriteId;
    let chaserId = json.chaserId || 'unknown';
    console.log(`spriteId ${spriteId} killed by ${chaserId}`)
    
    // Notify 3D scene
    gameEventHandlers.onPlayerCaught?.(spriteId, chaserId);
}


function handleGameOver(msg: any) {
    console.log(`game over: ${msg.reason}`)
    const winner = msg.winner || 'Onbekend';
    const scores = msg.scores || {};
    
    // Notify 3D scene
    gameEventHandlers.onGameOver?.(winner, scores);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
// send functions

export function sendPelletMessage(x: number, y: number) {
    console.log('eating pellet')
    sendWsMessage('pel', {x: x, y: y})
}


export function sendPowerUpMessage(x: number, y: number) {
    console.log('eating power')
    sendWsMessage('pow', {x: x, y: y})
}


export function sendRunnerChaserMessage(chaserSpriteId: string) {
    console.log('chaser and runner collided')
    // tell all clients runner is caught
    sendWsMessage('kill', {id: chaserSpriteId})
}


export function sendPosMessage(dirOrX: string | number, y?: number, dir?: AnimDir) {
    // Support both old (x, y, dir) and new (direction only) signatures
    if (typeof dirOrX === 'string') {
        // New 3D mode: direction only - server will calculate position
        sendWsMessage('pos', { dir: dirOrX })
    } else {
        // Legacy mode with full position data
        sendWsMessage('pos', {x: dirOrX, y: y, dir: dir})
    }
}


export function sendWsMessage(messageType: GameMessage, data: any) {
    data.type = messageType
    data.secretToken = prevGameState.secretToken
    const mess = JSON.stringify(data)
    ws.send(mess) // do not use json stringify here adds latency when sending messages
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
// Lobby/Waiting Room handlers and functions

function handleLobbyStatus(json: any) {
    console.log('Lobby status update:', json);
    
    // Find current player in player list
    const myPlayerId = prevGameState.playerId || '';
    const mySpriteId = prevGameState.spriteId || '';
    
    // Find me in the player list by playerId or spriteType
    const meAsPlayer = json.players?.find((p: any) => 
        p.playerId === myPlayerId || p.spriteType === mySpriteId
    );
    
    lobbyState = {
        players: json.players || [],
        spectators: json.spectators || [],
        matchStarted: json.matchStarted,
        hostId: json.hostId,
        isHost: meAsPlayer?.isHost || json.hostId === myPlayerId,
        isReady: meAsPlayer?.isReady || false,
        isSpectator: !meAsPlayer,
        playerCount: json.playerCount,
        readyCount: json.readyCount,
        countdown: lobbyState.countdown // preserve countdown
    };
    
    notifyLobbyStateListeners();
}

function handleCountdown(json: any) {
    console.log('Countdown:', json.count);
    lobbyState.countdown = json.count;
    notifyLobbyStateListeners();
}

function handleGameStart(_json: any) {
    console.log('Game starting!');
    lobbyState.matchStarted = true;
    lobbyState.countdown = null;
    notifyLobbyStateListeners();
}

// Send ready toggle message
export function sendReadyToggle() {
    console.log('Toggling ready status');
    sendWsMessage('ready', {});
}

// Send start game message (host only)
export function sendStartGame() {
    console.log('Starting game');
    sendWsMessage('startgame', {});
}

// Request lobby status update
export function requestLobbyStatus() {
    console.log('Requesting lobby status');
    sendWsMessage('lobbystatus', {});
}
