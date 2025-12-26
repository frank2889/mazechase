import Phaser from 'phaser';
import Text = Phaser.GameObjects.Text; // Make sure to import Phaser

export type AnimDir = "up" | "down" | "left" | "right" | "default";
export type ChaserAnimBase = "chaserred" | "chaserblue" | "chaserpink";
export type RunnerAnimBase = "runner";

export type GameMessage = "pos" | "pel" | "pow" | "kill" | "ready" | "startgame" | "lobbystatus"

// Lobby/Waiting Room types
export interface LobbyPlayer {
    id: string;
    username: string;
    isReady: boolean;
    isHost: boolean;
    isSpectator: boolean;
    spriteType: string;
}

export interface LobbyStatusMessage {
    type: 'lobbystatus';
    players: LobbyPlayer[];
    spectators: LobbyPlayer[];
    matchStarted: boolean;
    hostId: string;
    isHost: boolean;
    playerCount: number;
    readyCount: number;
}

export interface CountdownMessage {
    type: 'countdown';
    count: number;
}

export interface GameStartMessage {
    type: 'gamestart';
}

export type PlayerInfo = {
    playerInfo: Phaser.Physics.Arcade.Sprite | null,
    curAnimDir: AnimDir,
    defaultAnim: AnimDir,
    startPos: [number, number],
    userNameText?: Text | null,
    movementSpeed: number,
}

export function getAnimStr(info: Chaser | Runner) {
    return info.animBase + info.curAnimDir
}

export type Chaser = PlayerInfo & {
    animBase: ChaserAnimBase,
}

export type Runner = PlayerInfo & {
    animBase: RunnerAnimBase,
}


export type PrevGameState = {}