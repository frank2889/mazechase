import Phaser from 'phaser';
import Text = Phaser.GameObjects.Text; // Make sure to import Phaser

export type AnimDir = "up" | "down" | "left" | "right" | "default";
export type ChaserAnimBase = "chaserred" | "chaserblue" | "chaserpink";
export type RunnerAnimBase = "runner";

export type GameMessage = "pos" | "pel" | "pow" | "kill"

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