/**
 * Scenery3D - Decorative environment elements for MazeChase
 * 
 * Adds visual richness with animated trees, plants, and environmental effects
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Mesh,
    TransformNode,
    Animation,
    ParticleSystem,
    Texture,
    Color4,
    AnimationGroup
} from '@babylonjs/core';
import { TILE_SIZE_3D } from './maze';

// World color themes
export interface WorldTheme {
    name: string;
    wallColor: Color3;
    wallEmissive: Color3;
    floorColor: Color3;
    ambientColor: Color3;
    fogColor: Color3;
    treeColor: Color3;
    treeTrunk: Color3;
    particleColor: Color4;
    glowIntensity: number;
}

export const WORLD_THEMES: Record<string, WorldTheme> = {
    neon_night: {
        name: 'Neon Night',
        wallColor: new Color3(0.08, 0.02, 0.2),
        wallEmissive: new Color3(0.1, 0.05, 0.3),
        floorColor: new Color3(0.02, 0.01, 0.05),
        ambientColor: new Color3(0.1, 0.05, 0.2),
        fogColor: new Color3(0.02, 0.01, 0.05),
        treeColor: new Color3(0, 0.8, 0.9),
        treeTrunk: new Color3(0.2, 0.1, 0.3),
        particleColor: new Color4(0.3, 0.1, 1, 0.6),
        glowIntensity: 1.2
    },
    cyber_arcade: {
        name: 'Cyber Arcade',
        wallColor: new Color3(0.1, 0.1, 0.4),
        wallEmissive: new Color3(0.05, 0.05, 0.2),
        floorColor: new Color3(0.02, 0.02, 0.08),
        ambientColor: new Color3(0.1, 0.1, 0.3),
        fogColor: new Color3(0.01, 0.01, 0.04),
        treeColor: new Color3(0, 1, 0.7),
        treeTrunk: new Color3(0.15, 0.1, 0.25),
        particleColor: new Color4(0, 0.8, 1, 0.5),
        glowIntensity: 1.0
    },
    sunset_maze: {
        name: 'Sunset Maze',
        wallColor: new Color3(0.3, 0.1, 0.15),
        wallEmissive: new Color3(0.15, 0.05, 0.08),
        floorColor: new Color3(0.08, 0.03, 0.04),
        ambientColor: new Color3(0.3, 0.15, 0.1),
        fogColor: new Color3(0.15, 0.05, 0.05),
        treeColor: new Color3(1, 0.5, 0.2),
        treeTrunk: new Color3(0.3, 0.15, 0.1),
        particleColor: new Color4(1, 0.4, 0.1, 0.4),
        glowIntensity: 0.8
    },
    ghost_forest: {
        name: 'Ghost Forest',
        wallColor: new Color3(0.1, 0.15, 0.1),
        wallEmissive: new Color3(0.02, 0.05, 0.02),
        floorColor: new Color3(0.03, 0.05, 0.03),
        ambientColor: new Color3(0.1, 0.2, 0.1),
        fogColor: new Color3(0.05, 0.1, 0.05),
        treeColor: new Color3(0.2, 0.8, 0.3),
        treeTrunk: new Color3(0.2, 0.15, 0.1),
        particleColor: new Color4(0.2, 0.8, 0.3, 0.3),
        glowIntensity: 0.6
    }
};

export class Scenery3D {
    private scene: Scene;
    private sceneryRoot: TransformNode;
    private trees: Mesh[] = [];
    private decorations: Mesh[] = [];
    private ambientParticles: ParticleSystem | null = null;
    private currentTheme: WorldTheme;
    private animations: AnimationGroup[] = [];

    constructor(scene: Scene, theme: string = 'cyber_arcade') {
        this.scene = scene;
        this.sceneryRoot = new TransformNode('sceneryRoot', scene);
        this.currentTheme = WORLD_THEMES[theme] || WORLD_THEMES.cyber_arcade;
    }

    /**
     * Set the world theme/color scheme
     */
    setTheme(themeName: string): void {
        if (WORLD_THEMES[themeName]) {
            this.currentTheme = WORLD_THEMES[themeName];
            this.applyThemeColors();
        }
    }

    /**
     * Get current theme
     */
    getTheme(): WorldTheme {
        return this.currentTheme;
    }

    /**
     * Apply theme colors to scene
     */
    private applyThemeColors(): void {
        // Apply ambient light color
        this.scene.ambientColor = this.currentTheme.ambientColor;
        
        // Apply fog
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogColor = this.currentTheme.fogColor;
        this.scene.fogDensity = 0.015;
        
        // Update tree colors
        this.trees.forEach(tree => {
            const materials = tree.getChildMeshes();
            materials.forEach(mesh => {
                if (mesh.material instanceof StandardMaterial) {
                    if (mesh.name.includes('leaves')) {
                        mesh.material.diffuseColor = this.currentTheme.treeColor;
                        mesh.material.emissiveColor = this.currentTheme.treeColor.scale(0.3);
                    } else if (mesh.name.includes('trunk')) {
                        mesh.material.diffuseColor = this.currentTheme.treeTrunk;
                    }
                }
            });
        });

        // Update ambient particles
        if (this.ambientParticles) {
            this.ambientParticles.color1 = this.currentTheme.particleColor;
            this.ambientParticles.color2 = new Color4(
                this.currentTheme.particleColor.r * 0.5,
                this.currentTheme.particleColor.g * 0.5,
                this.currentTheme.particleColor.b * 0.5,
                this.currentTheme.particleColor.a * 0.8
            );
        }
    }

    /**
     * Create a stylized glowing tree
     */
    createTree(x: number, z: number, scale: number = 1): Mesh {
        const treeRoot = new Mesh(`tree_${x}_${z}`, this.scene);
        treeRoot.parent = this.sceneryRoot;
        treeRoot.position = new Vector3(x, 0, z);

        // Trunk - glowing cylinder
        const trunk = MeshBuilder.CreateCylinder(`trunk_${x}_${z}`, {
            height: 1.5 * scale,
            diameterTop: 0.15 * scale,
            diameterBottom: 0.25 * scale,
            tessellation: 8
        }, this.scene);
        trunk.position.y = 0.75 * scale;
        trunk.parent = treeRoot;

        const trunkMat = new StandardMaterial(`trunkMat_${x}_${z}`, this.scene);
        trunkMat.diffuseColor = this.currentTheme.treeTrunk;
        trunkMat.emissiveColor = this.currentTheme.treeTrunk.scale(0.2);
        trunk.material = trunkMat;

        // Leaves - glowing geometric shapes (stylized, not realistic)
        const createLeafCluster = (yOffset: number, scaleM: number) => {
            const leaves = MeshBuilder.CreateIcoSphere(`leaves_${x}_${z}_${yOffset}`, {
                radius: 0.5 * scale * scaleM,
                subdivisions: 1, // Low poly for stylized look
                flat: true
            }, this.scene);
            leaves.position.y = yOffset;
            leaves.parent = treeRoot;

            const leavesMat = new StandardMaterial(`leavesMat_${x}_${z}_${yOffset}`, this.scene);
            leavesMat.diffuseColor = this.currentTheme.treeColor;
            leavesMat.emissiveColor = this.currentTheme.treeColor.scale(0.4);
            leavesMat.alpha = 0.9;
            leaves.material = leavesMat;

            return leaves;
        };

        // Multiple leaf clusters for fuller look
        createLeafCluster(1.4 * scale, 1.2);
        createLeafCluster(1.8 * scale, 0.9);
        createLeafCluster(2.1 * scale, 0.6);

        // Add gentle swaying animation
        this.addSwayAnimation(treeRoot, scale);

        this.trees.push(treeRoot);
        return treeRoot;
    }

    /**
     * Add swaying animation to a mesh
     */
    private addSwayAnimation(mesh: Mesh, scale: number): void {
        const swayAnimation = new Animation(
            `sway_${mesh.name}`,
            'rotation.z',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const amplitude = 0.03 / scale; // Smaller trees sway more
        const phase = Math.random() * Math.PI * 2; // Random starting phase

        const keyFrames = [
            { frame: 0, value: -amplitude },
            { frame: 60, value: amplitude },
            { frame: 120, value: -amplitude }
        ];
        swayAnimation.setKeys(keyFrames);

        mesh.animations = [swayAnimation];
        this.scene.beginAnimation(mesh, 0, 120, true);
    }

    /**
     * Create glowing crystal decoration
     */
    createCrystal(x: number, z: number, color?: Color3): Mesh {
        const crystalColor = color || this.currentTheme.treeColor;
        
        const crystal = MeshBuilder.CreateCylinder(`crystal_${x}_${z}`, {
            height: 0.6,
            diameterTop: 0,
            diameterBottom: 0.3,
            tessellation: 6
        }, this.scene);
        
        crystal.position = new Vector3(x, 0.3, z);
        crystal.parent = this.sceneryRoot;

        const crystalMat = new StandardMaterial(`crystalMat_${x}_${z}`, this.scene);
        crystalMat.diffuseColor = crystalColor;
        crystalMat.emissiveColor = crystalColor.scale(0.6);
        crystalMat.alpha = 0.8;
        crystal.material = crystalMat;

        // Add pulsing glow animation
        this.addPulseAnimation(crystal, crystalMat);

        this.decorations.push(crystal);
        return crystal;
    }

    /**
     * Add pulsing glow animation
     */
    private addPulseAnimation(mesh: Mesh, material: StandardMaterial): void {
        const pulseAnimation = new Animation(
            `pulse_${mesh.name}`,
            'emissiveColor',
            30,
            Animation.ANIMATIONTYPE_COLOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const baseEmissive = material.emissiveColor.clone();
        const brightEmissive = baseEmissive.scale(1.5);

        const keyFrames = [
            { frame: 0, value: baseEmissive },
            { frame: 30, value: brightEmissive },
            { frame: 60, value: baseEmissive }
        ];
        pulseAnimation.setKeys(keyFrames);

        material.animations = [pulseAnimation];
        this.scene.beginAnimation(material, 0, 60, true);
    }

    /**
     * Create floating rock decoration
     */
    createFloatingRock(x: number, z: number): Mesh {
        const rock = MeshBuilder.CreateIcoSphere(`rock_${x}_${z}`, {
            radius: 0.3,
            subdivisions: 1,
            flat: true
        }, this.scene);

        rock.position = new Vector3(x, 0.5, z);
        rock.rotation.x = Math.random() * Math.PI;
        rock.rotation.y = Math.random() * Math.PI;
        rock.parent = this.sceneryRoot;

        const rockMat = new StandardMaterial(`rockMat_${x}_${z}`, this.scene);
        rockMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
        rockMat.emissiveColor = this.currentTheme.wallEmissive.scale(0.5);
        rock.material = rockMat;

        // Add floating animation
        this.addFloatAnimation(rock);

        this.decorations.push(rock);
        return rock;
    }

    /**
     * Add floating up/down animation
     */
    private addFloatAnimation(mesh: Mesh): void {
        const floatAnimation = new Animation(
            `float_${mesh.name}`,
            'position.y',
            30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const baseY = mesh.position.y;
        const phase = Math.random() * 60;

        const keyFrames = [
            { frame: 0, value: baseY - 0.1 },
            { frame: 45, value: baseY + 0.1 },
            { frame: 90, value: baseY - 0.1 }
        ];
        floatAnimation.setKeys(keyFrames);

        mesh.animations = [floatAnimation];
        this.scene.beginAnimation(mesh, phase, 90 + phase, true);
    }

    /**
     * Create ambient floating particles
     */
    createAmbientParticles(centerX: number, centerZ: number, width: number, height: number): void {
        if (this.ambientParticles) {
            this.ambientParticles.dispose();
        }

        // Create particle system
        const particleSystem = new ParticleSystem('ambientParticles', 200, this.scene);

        // Create a simple white texture procedurally
        const particleTexture = new DynamicParticleTexture(this.scene);
        particleSystem.particleTexture = particleTexture;

        // Emission
        particleSystem.emitter = new Vector3(centerX, 1, centerZ);
        particleSystem.minEmitBox = new Vector3(-width/2, 0, -height/2);
        particleSystem.maxEmitBox = new Vector3(width/2, 3, height/2);

        // Colors
        particleSystem.color1 = this.currentTheme.particleColor;
        particleSystem.color2 = new Color4(
            this.currentTheme.particleColor.r * 0.5,
            this.currentTheme.particleColor.g * 0.5,
            this.currentTheme.particleColor.b * 0.5,
            this.currentTheme.particleColor.a * 0.8
        );
        particleSystem.colorDead = new Color4(0, 0, 0, 0);

        // Size
        particleSystem.minSize = 0.02;
        particleSystem.maxSize = 0.08;

        // Life time
        particleSystem.minLifeTime = 3;
        particleSystem.maxLifeTime = 8;

        // Emission rate
        particleSystem.emitRate = 15;

        // Speed and direction
        particleSystem.direction1 = new Vector3(-0.2, 0.5, -0.2);
        particleSystem.direction2 = new Vector3(0.2, 1, 0.2);
        particleSystem.minEmitPower = 0.05;
        particleSystem.maxEmitPower = 0.15;

        // Gravity
        particleSystem.gravity = new Vector3(0, -0.02, 0);

        particleSystem.start();
        this.ambientParticles = particleSystem;
    }

    /**
     * Place scenery around maze edges
     */
    populateMazeEdges(mazeWidth: number, mazeHeight: number, wallPositions: Set<string>): void {
        const treeSpacing = 3; // Place trees every N tiles along edges
        
        // Top and bottom edges
        for (let x = -1; x <= mazeWidth; x += treeSpacing) {
            // Top edge
            if (!wallPositions.has(`${x}_-1`)) {
                this.createTree(x * TILE_SIZE_3D, -1.5 * TILE_SIZE_3D, 0.8 + Math.random() * 0.4);
            }
            // Bottom edge
            if (!wallPositions.has(`${x}_${mazeHeight}`)) {
                this.createTree(x * TILE_SIZE_3D, (mazeHeight + 0.5) * TILE_SIZE_3D, 0.8 + Math.random() * 0.4);
            }
        }

        // Left and right edges
        for (let z = 0; z < mazeHeight; z += treeSpacing) {
            // Left edge
            if (!wallPositions.has(`-1_${z}`)) {
                this.createTree(-1.5 * TILE_SIZE_3D, z * TILE_SIZE_3D, 0.8 + Math.random() * 0.4);
            }
            // Right edge
            if (!wallPositions.has(`${mazeWidth}_${z}`)) {
                this.createTree((mazeWidth + 0.5) * TILE_SIZE_3D, z * TILE_SIZE_3D, 0.8 + Math.random() * 0.4);
            }
        }

        // Add some crystals in corners
        this.createCrystal(-1.5 * TILE_SIZE_3D, -1.5 * TILE_SIZE_3D);
        this.createCrystal((mazeWidth + 0.5) * TILE_SIZE_3D, -1.5 * TILE_SIZE_3D);
        this.createCrystal(-1.5 * TILE_SIZE_3D, (mazeHeight + 0.5) * TILE_SIZE_3D);
        this.createCrystal((mazeWidth + 0.5) * TILE_SIZE_3D, (mazeHeight + 0.5) * TILE_SIZE_3D);

        // Add ambient particles over the maze
        this.createAmbientParticles(
            mazeWidth * TILE_SIZE_3D / 2,
            mazeHeight * TILE_SIZE_3D / 2,
            mazeWidth * TILE_SIZE_3D,
            mazeHeight * TILE_SIZE_3D
        );
    }

    /**
     * Dispose of all scenery
     */
    dispose(): void {
        this.trees.forEach(tree => tree.dispose());
        this.decorations.forEach(dec => dec.dispose());
        this.trees = [];
        this.decorations = [];
        
        if (this.ambientParticles) {
            this.ambientParticles.dispose();
            this.ambientParticles = null;
        }
        
        this.sceneryRoot.dispose();
    }
}

/**
 * Simple dynamic texture for particles
 */
class DynamicParticleTexture extends Texture {
    constructor(scene: Scene) {
        // Create a simple white circle texture procedurally
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        
        // Draw a soft glowing circle
        const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Create texture from canvas
        super(canvas.toDataURL(), scene, false, true);
        this.hasAlpha = true;
    }
}
