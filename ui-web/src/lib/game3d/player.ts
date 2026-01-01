/**
 * Player3D - 3D Player representation for MazeChase
 * 
 * BOUNCING BALL CHARACTER!
 * The Runner is a bouncing ball that uses physics-based movement.
 * Model can be loaded from GLB file or use procedural sphere as fallback.
 */

import {
    Scene,
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Mesh,
    Animation,
    DynamicTexture,
    Plane,
    SineEase,
    EasingFunction,
    SceneLoader,
    AbstractMesh
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { TILE_SIZE_3D } from './maze';

// ═══════════════════════════════════════════════════════════════════════════════
// STUITERBAL MODEL CONFIGURATIE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Model paths for 3D characters
 * Download from: https://quaternius.com/packs/ultimateballs.html (CC0)
 * Place in: ui-web/public/models/characters/
 */
const CHARACTER_MODELS = {
    runner: '/models/characters/runner.glb',  // Bouncing ball model
    ch0: '/models/characters/chaser_red.glb',
    ch1: '/models/characters/chaser_cyan.glb', 
    ch2: '/models/characters/chaser_pink.glb',
};

// Fallback to procedural mesh if model not found
const USE_GLB_MODELS = true;  // Set to true when GLB files are available

export type SpriteType3D = 'runner' | 'ch0' | 'ch1' | 'ch2';

interface PlayerColors {
    primary: Color3;
    emissive: Color3;
}

// Kurzgesagt Style Guide Colors (converted from hex)
// Runner: #FFD93D, Red: #FF6B6B, Cyan: #4ECDC4, Pink: #F8A5C2, Orange: #FF9F43
const PLAYER_COLORS: Record<SpriteType3D, PlayerColors> = {
    runner: {
        primary: new Color3(1.0, 0.85, 0.24),      // #FFD93D Warm Yellow (Kurzgesagt)
        emissive: new Color3(0.4, 0.34, 0.1)
    },
    ch0: {
        primary: new Color3(1.0, 0.42, 0.42),  // #FF6B6B Coral Red (Kurzgesagt) - "Blitz" aggressive
        emissive: new Color3(0.4, 0.17, 0.17)
    },
    ch1: {
        primary: new Color3(0.31, 0.80, 0.77),  // #4ECDC4 Turquoise (Kurzgesagt) - "Shadow" sneaky
        emissive: new Color3(0.12, 0.32, 0.31)
    },
    ch2: {
        primary: new Color3(0.97, 0.65, 0.76),  // #F8A5C2 Soft Pink (Kurzgesagt) - "Spark" playful
        emissive: new Color3(0.39, 0.26, 0.30)
    }
};

// Sprint 2: Character personality settings per chaser type
const CHASER_PERSONALITY: Record<string, { speedMod: number, sizeMod: number, floatSpeed: number }> = {
    ch0: { speedMod: 1.2, sizeMod: 1.0, floatSpeed: 1.5 },  // Blitz - fast, normal size
    ch1: { speedMod: 0.9, sizeMod: 0.9, floatSpeed: 0.7 },  // Shadow - slow, smaller (sneaky)
    ch2: { speedMod: 1.1, sizeMod: 1.1, floatSpeed: 2.0 },  // Spark - fast float, bigger (energetic)
};

export class Player3D {
    private scene: Scene;
    private mesh: Mesh;
    private loadedModel: AbstractMesh | null = null;  // For GLB models
    private material: StandardMaterial;
    private spriteType: SpriteType3D;
    private targetPosition: Vector3;
    private isPoweredUp: boolean = false;
    private isScared: boolean = false;
    private originalColor: Color3;
    private originalEmissive: Color3;
    private namePlane: Mesh | null = null;
    private nameMaterial: StandardMaterial | null = null;
    private playerName: string = '';
    
    // Sprint 5: Enhanced visual effects
    private glowIntensity: number = 0;
    private pulseAnimation: Animation | null = null;
    
    // Stuiterbal bounce state
    private bounceHeight: number = 0;
    private bounceVelocity: number = 0;
    private isGrounded: boolean = true;

    // For smooth movement interpolation
    private moveSpeed: number = 8; // Units per second

    constructor(scene: Scene, spriteType: SpriteType3D, startTileX: number, startTileY: number) {
        this.scene = scene;
        this.spriteType = spriteType;

        const colors = PLAYER_COLORS[spriteType];
        this.originalColor = colors.primary.clone();
        this.originalEmissive = colors.emissive.clone();

        // Create material with enhanced glow (Sprint 5)
        this.material = new StandardMaterial(`player_${spriteType}_mat`, scene);
        this.material.diffuseColor = colors.primary;
        // Sprint 5: Boost emissive for better glow visibility
        this.material.emissiveColor = new Color3(
            colors.emissive.r * 1.5,
            colors.emissive.g * 1.5,
            colors.emissive.b * 1.5
        );
        this.material.specularColor = new Color3(0.8, 0.8, 0.8);
        this.material.specularPower = 32; // Shinier appearance

        // Create mesh based on type
        if (spriteType === 'runner') {
            // STUITERBAL: First try to load GLB model, fallback to sphere
            this.mesh = this.createRunnerMesh();
            // Also try to load GLB model async (will replace mesh when loaded)
            if (USE_GLB_MODELS) {
                this.loadGLBModel(CHARACTER_MODELS.runner);
            }
            // Sprint 5: Add gentle pulse glow to runner
            this.addPulseGlowAnimation();
            // Add bounce physics animation
            this.addBounceAnimation();
        } else {
            // Chasers are capsule-like (hunter shape)
            this.mesh = this.createChaserMesh(spriteType);
            // Add floating animation to chasers
            this.addFloatingAnimation();
            // Sprint 5: Add menacing pulse to chasers
            this.addChaserPulseAnimation();
        }

        this.mesh.material = this.material;
        
        // Set initial position
        const startPos = this.tileToWorldPos(startTileX, startTileY);
        this.mesh.position = startPos;
        this.targetPosition = startPos.clone();
    }

    /**
     * Sprint 5: Add pulsing glow animation to runner for "hero" feel
     */
    private addPulseGlowAnimation(): void {
        const frameRate = 30;
        const duration = 60; // 2 second cycle
        
        const pulseAnim = new Animation(
            'runnerPulse',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseScale = 1.0;
        const keys = [
            { frame: 0, value: new Vector3(baseScale, baseScale, baseScale) },
            { frame: 30, value: new Vector3(baseScale * 1.08, baseScale * 1.08, baseScale * 1.08) },
            { frame: 60, value: new Vector3(baseScale, baseScale, baseScale) }
        ];
        
        pulseAnim.setKeys(keys);
        
        const easingFunction = new SineEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        pulseAnim.setEasingFunction(easingFunction);
        
        this.mesh.animations.push(pulseAnim);
        this.scene.beginAnimation(this.mesh, 0, duration, true);
    }

    /**
     * Sprint 5: Add menacing pulse animation to chasers
     */
    private addChaserPulseAnimation(): void {
        // Animate emissive intensity for menacing effect
        const frameRate = 30;
        const personality = CHASER_PERSONALITY[this.spriteType] || { speedMod: 1 };
        const duration = Math.round(40 / personality.speedMod); // Faster chasers pulse faster
        
        // Create emissive color animation
        const emissiveAnim = new Animation(
            'chaserEmissivePulse',
            'material.emissiveColor',
            frameRate,
            Animation.ANIMATIONTYPE_COLOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseEmissive = this.material.emissiveColor.clone();
        const brightEmissive = new Color3(
            Math.min(baseEmissive.r * 2, 1),
            Math.min(baseEmissive.g * 2, 1),
            Math.min(baseEmissive.b * 2, 1)
        );
        
        const midFrame = Math.round(duration / 2);
        const keys = [
            { frame: 0, value: baseEmissive },
            { frame: midFrame, value: brightEmissive },
            { frame: duration, value: baseEmissive }
        ];
        
        emissiveAnim.setKeys(keys);
        
        const easingFunction = new SineEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        emissiveAnim.setEasingFunction(easingFunction);
        
        this.mesh.animations.push(emissiveAnim);
        // Note: beginAnimation for this is handled separately to not conflict with float
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // STUITERBAL FUNCTIES
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Create the runner mesh (bouncing ball)
     * Creates a procedural sphere as fallback when GLB is not loaded
     */
    private createRunnerMesh(): Mesh {
        return MeshBuilder.CreateSphere(`player_${this.spriteType}`, {
            diameter: TILE_SIZE_3D * 0.6,
            segments: 24  // Higher segments for smoother ball
        }, this.scene);
    }

    /**
     * Load GLB model asynchronously and replace the procedural mesh
     * Downloads from OpenGameArt/Quaternius CC0 models
     */
    private async loadGLBModel(modelPath: string): Promise<void> {
        try {
            const result = await SceneLoader.ImportMeshAsync(
                '',
                modelPath.substring(0, modelPath.lastIndexOf('/') + 1),
                modelPath.substring(modelPath.lastIndexOf('/') + 1),
                this.scene
            );
            
            if (result.meshes.length > 0) {
                // Get the root mesh
                const loadedMesh = result.meshes[0] as Mesh;
                
                // Scale to match our tile size
                const scale = TILE_SIZE_3D * 0.3;
                loadedMesh.scaling = new Vector3(scale, scale, scale);
                
                // Copy position from procedural mesh
                loadedMesh.position = this.mesh.position.clone();
                
                // Apply our material for consistent colors
                result.meshes.forEach(m => {
                    if (m.material) m.material = this.material;
                });
                
                // Dispose old procedural mesh and use loaded model
                this.mesh.dispose();
                this.mesh = loadedMesh;
                this.loadedModel = loadedMesh;
                
                // Re-add animations to new mesh
                this.addPulseGlowAnimation();
                this.addBounceAnimation();
                
                console.log(`✅ Loaded GLB model: ${modelPath}`);
            }
        } catch (error) {
            // GLB not found - continue with procedural sphere
            console.log(`ℹ️ GLB model not found (${modelPath}), using procedural sphere`);
            console.log(`   Download from: https://quaternius.com/packs/ultimateballs.html`);
        }
    }

    /**
     * Add bounce animation to the runner (stuiterbal physics feel)
     * Creates a squash & stretch effect for satisfying bounces
     */
    private addBounceAnimation(): void {
        const frameRate = 60;
        const bounceDuration = 30; // 0.5 second bounce cycle
        
        // Squash & stretch animation for bouncing ball feel
        const bounceAnim = new Animation(
            'runnerBounce',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const baseScale = 1.0;
        const squash = 0.85;  // Flatten on impact
        const stretch = 1.15; // Stretch when rising
        
        const keys = [
            { frame: 0, value: new Vector3(baseScale, baseScale, baseScale) },           // Normal
            { frame: 5, value: new Vector3(stretch * 0.9, stretch * 1.1, stretch * 0.9) }, // Rising stretch
            { frame: 15, value: new Vector3(baseScale, baseScale, baseScale) },          // Peak (normal)
            { frame: 25, value: new Vector3(stretch * 0.95, stretch * 1.05, stretch * 0.95) }, // Falling
            { frame: 28, value: new Vector3(squash * 1.15, squash * 0.85, squash * 1.15) }, // Impact squash
            { frame: 30, value: new Vector3(baseScale, baseScale, baseScale) },          // Recovery
        ];
        
        bounceAnim.setKeys(keys);
        
        const easingFunction = new SineEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        bounceAnim.setEasingFunction(easingFunction);
        
        this.mesh.animations.push(bounceAnim);
        this.scene.beginAnimation(this.mesh, 0, bounceDuration, true);
    }

    /**
     * Trigger a manual bounce (called on Space/Tap)
     * This adds extra visual feedback to the physics bounce
     */
    public triggerBounce(): void {
        // Quick squash then stretch animation
        const frameRate = 60;
        const quickBounce = new Animation(
            'triggerBounce',
            'scaling',
            frameRate,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys = [
            { frame: 0, value: new Vector3(1.2, 0.7, 1.2) },  // Squash on press
            { frame: 3, value: new Vector3(0.85, 1.3, 0.85) }, // Launch stretch
            { frame: 8, value: new Vector3(1, 1, 1) },        // Return to normal
        ];
        
        quickBounce.setKeys(keys);
        this.scene.beginDirectAnimation(this.mesh, [quickBounce], 0, 8, false);
    }

    /**
     * Add floating/bobbing animation to chasers
     * Sprint 2: Per-chaser unique float speeds for personality
     */
    private addFloatingAnimation(): void {
        const personality = CHASER_PERSONALITY[this.spriteType] || { floatSpeed: 1 };
        const frameRate = 30;
        const duration = Math.round(40 / personality.floatSpeed); // Faster float = shorter duration
        
        // Floating Y animation
        const floatAnimation = new Animation(
            'chaserFloat',
            'position.y',
            frameRate,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Get base Y from current position
        const baseY = TILE_SIZE_3D * 0.3;
        const floatHeight = 0.08 * personality.floatSpeed; // More energetic = higher float
        
        const midFrame = Math.round(duration / 2);
        const keys = [
            { frame: 0, value: baseY },
            { frame: midFrame, value: baseY + floatHeight },
            { frame: duration, value: baseY }
        ];
        
        floatAnimation.setKeys(keys);
        
        // Add easing for smooth motion
        const easingFunction = new SineEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
        floatAnimation.setEasingFunction(easingFunction);
        
        this.mesh.animations.push(floatAnimation);
        this.scene.beginAnimation(this.mesh, 0, duration, true);
    }

    /**
     * Set and display player name above the mesh
     */
    setName(name: string): void {
        this.playerName = name;
        
        // Remove existing name plane
        if (this.namePlane) {
            this.namePlane.dispose();
        }
        if (this.nameMaterial) {
            this.nameMaterial.dispose();
        }
        
        if (!name) return;
        
        // Create dynamic texture for text
        const textureSize = 256;
        const texture = new DynamicTexture(`nameTexture_${this.spriteType}`, textureSize, this.scene, true);
        texture.hasAlpha = true;
        
        // Draw text on texture
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, textureSize, textureSize);
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, textureSize / 2, textureSize / 2);
        texture.update();
        
        // Create plane for name
        const planeWidth = TILE_SIZE_3D * 1.5;
        const planeHeight = TILE_SIZE_3D * 0.4;
        this.namePlane = MeshBuilder.CreatePlane(`namePlane_${this.spriteType}`, {
            width: planeWidth,
            height: planeHeight
        }, this.scene);
        
        // Position above player
        this.namePlane.parent = this.mesh;
        this.namePlane.position.y = TILE_SIZE_3D * 0.6;
        
        // Billboard mode - always faces camera
        this.namePlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        
        // Create material with texture
        this.nameMaterial = new StandardMaterial(`nameMat_${this.spriteType}`, this.scene);
        this.nameMaterial.diffuseTexture = texture;
        this.nameMaterial.emissiveTexture = texture;
        this.nameMaterial.useAlphaFromDiffuseTexture = true;
        this.nameMaterial.disableLighting = true;
        this.namePlane.material = this.nameMaterial;
    }

    /**
     * Get player name
     */
    getName(): string {
        return this.playerName;
    }

    private createChaserMesh(name: string): Mesh {
        const personality = CHASER_PERSONALITY[name] || { speedMod: 1, sizeMod: 1, floatSpeed: 1 };
        const sizeMod = personality.sizeMod;
        
        // Sprint 2: Create unique silhouettes per chaser type
        let body: Mesh;
        let head: Mesh;
        
        if (name === 'ch0') {
            // Blitz - Triangular/aggressive shape
            body = MeshBuilder.CreateCylinder(`${name}_body`, {
                height: TILE_SIZE_3D * 0.35 * sizeMod,
                diameterTop: TILE_SIZE_3D * 0.35 * sizeMod,
                diameterBottom: TILE_SIZE_3D * 0.55 * sizeMod,
                tessellation: 6  // Hexagonal base for aggressive look
            }, this.scene);
            head = MeshBuilder.CreateSphere(`${name}_head`, {
                diameter: TILE_SIZE_3D * 0.45 * sizeMod,
                segments: 12
            }, this.scene);
            head.position.y = TILE_SIZE_3D * 0.12;
        } else if (name === 'ch1') {
            // Shadow - Sleek/streamlined shape
            body = MeshBuilder.CreateCylinder(`${name}_body`, {
                height: TILE_SIZE_3D * 0.5 * sizeMod,
                diameterTop: TILE_SIZE_3D * 0.3 * sizeMod,
                diameterBottom: TILE_SIZE_3D * 0.4 * sizeMod,
                tessellation: 24  // Smooth for sleek look
            }, this.scene);
            head = MeshBuilder.CreateSphere(`${name}_head`, {
                diameter: TILE_SIZE_3D * 0.35 * sizeMod,
                segments: 16
            }, this.scene);
            head.position.y = TILE_SIZE_3D * 0.2;
        } else {
            // Spark (ch2) - Round/playful shape
            body = MeshBuilder.CreateCylinder(`${name}_body`, {
                height: TILE_SIZE_3D * 0.35 * sizeMod,
                diameter: TILE_SIZE_3D * 0.55 * sizeMod,
                tessellation: 20
            }, this.scene);
            head = MeshBuilder.CreateSphere(`${name}_head`, {
                diameter: TILE_SIZE_3D * 0.55 * sizeMod,
                segments: 16
            }, this.scene);
            head.position.y = TILE_SIZE_3D * 0.15;
        }

        // Merge into single mesh
        const chaser = Mesh.MergeMeshes([body, head], true, true, undefined, false, true);
        chaser!.name = `player_${name}`;
        
        return chaser!;
    }

    private tileToWorldPos(tileX: number, tileY: number): Vector3 {
        return new Vector3(
            tileX * TILE_SIZE_3D + TILE_SIZE_3D / 2,
            TILE_SIZE_3D * 0.3, // Slightly above floor
            tileY * TILE_SIZE_3D + TILE_SIZE_3D / 2
        );
    }

    /**
     * Move to a specific tile position (with smooth interpolation)
     */
    moveTo(tileX: number, tileY: number): void {
        this.targetPosition = this.tileToWorldPos(tileX, tileY);
    }

    /**
     * Set position immediately (no interpolation)
     */
    setPosition(tileX: number, tileY: number): void {
        const pos = this.tileToWorldPos(tileX, tileY);
        this.mesh.position = pos;
        this.targetPosition = pos.clone();
    }

    /**
     * Set position from pixel coordinates (for compatibility with current system)
     */
    setPositionFromPixels(pixelX: number, pixelY: number, tileSize: number = 32): void {
        // Convert pixel coords to tile coords
        const tileX = pixelX / tileSize;
        const tileY = pixelY / tileSize;
        
        const pos = new Vector3(
            tileX * TILE_SIZE_3D,
            TILE_SIZE_3D * 0.3,
            tileY * TILE_SIZE_3D
        );
        
        this.mesh.position = pos;
        this.targetPosition = pos.clone();
    }

    /**
     * Update player (call each frame for smooth movement)
     * Sprint 6: Added squash/stretch for expressivity
     * Sprint 7: Added anticipation, bounce, and easing (12 principles of animation)
     */
    private bouncePhase: number = 0;
    private wasMoving: boolean = false;
    
    update(deltaTime: number): void {
        // Smooth interpolation towards target
        const direction = this.targetPosition.subtract(this.mesh.position);
        const distance = direction.length();
        
        const isMoving = distance > 0.01;
        
        if (isMoving) {
            const moveAmount = Math.min(this.moveSpeed * deltaTime, distance);
            const movement = direction.normalize().scale(moveAmount);
            this.mesh.position.addInPlace(movement);
            
            // Sprint 6: Squash/stretch based on movement speed
            const speed = moveAmount / deltaTime;
            const stretchFactor = 1 + Math.min(speed * 0.02, 0.15); // Max 15% stretch
            const squashFactor = 1 / Math.sqrt(stretchFactor); // Preserve volume
            
            // Stretch in direction of movement, squash perpendicular
            const movingHorizontally = Math.abs(movement.x) > Math.abs(movement.z);
            if (movingHorizontally) {
                this.mesh.scaling.x = stretchFactor;
                this.mesh.scaling.z = squashFactor;
            } else {
                this.mesh.scaling.x = squashFactor;
                this.mesh.scaling.z = stretchFactor;
            }
            
            // Sprint 7: Subtle bounce while moving (secondary action)
            this.bouncePhase += deltaTime * 12;
            const bounce = Math.sin(this.bouncePhase) * 0.03;
            this.mesh.scaling.y = 1 + bounce;
            
            this.wasMoving = true;
        } else {
            // Sprint 7: Landing bounce when stopping (follow through)
            if (this.wasMoving) {
                this.bouncePhase = Math.PI / 2; // Start at peak for settle animation
                this.wasMoving = false;
            }
            
            // Damped bounce settle
            if (Math.abs(this.bouncePhase) > 0.01) {
                this.bouncePhase *= 0.85; // Damping
                const settleBounce = Math.sin(this.bouncePhase * 3) * this.bouncePhase * 0.1;
                this.mesh.scaling.y = 1 + settleBounce;
            } else {
                this.mesh.scaling.y = 1;
            }
            
            // Return to normal scale when stopped
            this.mesh.scaling.x = 1 + (this.mesh.scaling.x - 1) * 0.9;
            this.mesh.scaling.z = 1 + (this.mesh.scaling.z - 1) * 0.9;
        }
    }

    /**
     * Enable power-up visual (for runner)
     */
    setPoweredUp(powered: boolean): void {
        this.isPoweredUp = powered;
        
        if (powered) {
            // Glow red when powered up
            this.material.emissiveColor = new Color3(0.5, 0, 0);
            this.material.diffuseColor = new Color3(1, 0.3, 0.3);
        } else {
            // Reset to original colors
            this.material.diffuseColor = this.originalColor;
            this.material.emissiveColor = this.originalEmissive;
        }
    }

    /**
     * Set scared state (for chasers when runner has power-up)
     */
    setScared(scared: boolean): void {
        if (this.spriteType === 'runner') return; // Runner doesn't get scared
        
        this.isScared = scared;
        
        if (scared) {
            // Turn blue and flicker when scared
            this.material.diffuseColor = new Color3(0.2, 0.3, 1);
            this.material.emissiveColor = new Color3(0.1, 0.15, 0.5);
        } else {
            // Reset to original colors
            this.material.diffuseColor = this.originalColor;
            this.material.emissiveColor = this.originalEmissive;
        }
    }

    /**
     * Get current world position
     */
    getPosition(): Vector3 {
        return this.mesh.position.clone();
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.mesh.isVisible = visible;
        if (this.namePlane) {
            this.namePlane.isVisible = visible;
        }
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        if (this.namePlane) {
            this.namePlane.dispose();
        }
        if (this.nameMaterial) {
            this.nameMaterial.dispose();
        }
        this.mesh.dispose();
        this.material.dispose();
    }
}
