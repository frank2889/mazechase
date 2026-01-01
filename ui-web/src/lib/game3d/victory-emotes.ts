/**
 * Victory Emotes System - Sprint 5
 * Celebration animations that play when winning
 */

import * as BABYLON from '@babylonjs/core';

// ============ TYPES ============

export interface EmoteDefinition {
  id: string;
  name: string;
  type: 'celebration' | 'taunt' | 'greeting' | 'dance';
  
  // Animation
  duration: number;       // seconds
  looping: boolean;
  
  // Visual effects
  particles: boolean;
  particleType?: 'confetti' | 'hearts' | 'stars' | 'fire' | 'sparkle';
  screenEffect?: 'flash' | 'shake' | 'zoom' | 'none';
  
  // Audio
  soundPath?: string;
  
  // Colors
  primaryColor: string;
  secondaryColor?: string;
}

// ============ EMOTE CATALOG ============

export const EMOTE_CATALOG: Record<string, EmoteDefinition> = {
  'emote_dance': {
    id: 'emote_dance',
    name: 'Victory Dance',
    type: 'celebration',
    duration: 3,
    looping: true,
    particles: true,
    particleType: 'confetti',
    screenEffect: 'none',
    primaryColor: '#ffd700',
    secondaryColor: '#ff6b6b',
  },
  'emote_wave': {
    id: 'emote_wave',
    name: 'Friendly Wave',
    type: 'greeting',
    duration: 1.5,
    looping: false,
    particles: false,
    screenEffect: 'none',
    primaryColor: '#00ff00',
  },
  'emote_flex': {
    id: 'emote_flex',
    name: 'Power Flex',
    type: 'taunt',
    duration: 2,
    looping: false,
    particles: true,
    particleType: 'sparkle',
    screenEffect: 'flash',
    primaryColor: '#ff4500',
    secondaryColor: '#ffd700',
  },
  'emote_confetti': {
    id: 'emote_confetti',
    name: 'Confetti Burst',
    type: 'celebration',
    duration: 2.5,
    looping: false,
    particles: true,
    particleType: 'confetti',
    screenEffect: 'flash',
    primaryColor: '#ff00ff',
    secondaryColor: '#00ffff',
  },
  'emote_hearts': {
    id: 'emote_hearts',
    name: 'Love Burst',
    type: 'greeting',
    duration: 2,
    looping: false,
    particles: true,
    particleType: 'hearts',
    screenEffect: 'none',
    primaryColor: '#ff69b4',
    secondaryColor: '#ff1493',
  },
  'emote_fireworks': {
    id: 'emote_fireworks',
    name: 'Fireworks',
    type: 'celebration',
    duration: 4,
    looping: false,
    particles: true,
    particleType: 'fire',
    screenEffect: 'shake',
    primaryColor: '#ff0000',
    secondaryColor: '#ffd700',
  },
};

// ============ EMOTE PLAYER ============

export class EmotePlayer {
  private scene: BABYLON.Scene;
  private activeEmotes: Map<string, EmoteInstance> = new Map();
  private confettiTextures: Map<string, BABYLON.Texture> = new Map();
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.preloadTextures();
  }
  
  /**
   * Play an emote for a mesh
   */
  playEmote(mesh: BABYLON.Mesh, emoteId: string, onComplete?: () => void): void {
    const definition = EMOTE_CATALOG[emoteId];
    if (!definition) {
      console.warn(`Emote not found: ${emoteId}`);
      return;
    }
    
    // Stop any existing emote on this mesh
    this.stopEmote(mesh.uniqueId.toString());
    
    // Create new emote instance
    const instance = new EmoteInstance(this.scene, mesh, definition, () => {
      this.activeEmotes.delete(mesh.uniqueId.toString());
      onComplete?.();
    });
    
    this.activeEmotes.set(mesh.uniqueId.toString(), instance);
    instance.play();
  }
  
  /**
   * Stop emote on a mesh
   */
  stopEmote(meshId: string): void {
    const instance = this.activeEmotes.get(meshId);
    if (instance) {
      instance.stop();
      this.activeEmotes.delete(meshId);
    }
  }
  
  /**
   * Play a global victory celebration (for game end)
   */
  playVictoryCelebration(winnerMesh: BABYLON.Mesh): void {
    // Play confetti emote
    this.playEmote(winnerMesh, 'emote_confetti');
    
    // Add screen flash
    this.doScreenFlash('#ffd700', 0.3);
    
    // Create massive confetti burst
    this.createConfettiBurst(winnerMesh.position);
  }
  
  /**
   * Preload textures for better performance
   */
  private preloadTextures(): void {
    // Create confetti texture
    this.confettiTextures.set('confetti', this.createConfettiTexture());
    this.confettiTextures.set('heart', this.createHeartTexture());
    this.confettiTextures.set('star', this.createStarTexture());
  }
  
  private createConfettiTexture(): BABYLON.Texture {
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    
    // Simple square
    for (let i = 0; i < size * size * 4; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    
    return BABYLON.RawTexture.CreateRGBATexture(
      data, size, size, this.scene, false, false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE
    );
  }
  
  private createHeartTexture(): BABYLON.Texture {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const nx = (x / size - 0.5) * 2;
        const ny = (y / size - 0.5) * 2;
        
        // Simple heart shape approximation
        const heart = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
        const inside = heart < 0;
        
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = inside ? 255 : 0;
      }
    }
    
    return BABYLON.RawTexture.CreateRGBATexture(
      data, size, size, this.scene, false, false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    );
  }
  
  private createStarTexture(): BABYLON.Texture {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const nx = x / size - 0.5;
        const ny = y / size - 0.5;
        const angle = Math.atan2(ny, nx);
        const dist = Math.sqrt(nx * nx + ny * ny);
        
        // 5-pointed star
        const starRadius = 0.3 + 0.15 * Math.cos(5 * angle);
        const inside = dist < starRadius;
        
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = inside ? 255 : 0;
      }
    }
    
    return BABYLON.RawTexture.CreateRGBATexture(
      data, size, size, this.scene, false, false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    );
  }
  
  private createConfettiBurst(position: BABYLON.Vector3): void {
    const particleSystem = new BABYLON.ParticleSystem('victoryConfetti', 500, this.scene);
    
    particleSystem.particleTexture = this.confettiTextures.get('confetti')!;
    particleSystem.emitter = position;
    
    // Burst upward then fall
    particleSystem.direction1 = new BABYLON.Vector3(-3, 10, -3);
    particleSystem.direction2 = new BABYLON.Vector3(3, 15, 3);
    particleSystem.gravity = new BABYLON.Vector3(0, -9.8, 0);
    
    // Colorful confetti
    particleSystem.color1 = new BABYLON.Color4(1, 0, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(0, 1, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 1, 0);
    
    // Size
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.2;
    
    // Rotation
    particleSystem.minAngularSpeed = -5;
    particleSystem.maxAngularSpeed = 5;
    
    // Lifetime
    particleSystem.minLifeTime = 2;
    particleSystem.maxLifeTime = 4;
    
    // Emit all at once
    particleSystem.manualEmitCount = 500;
    particleSystem.targetStopDuration = 0.1;
    
    particleSystem.start();
    
    // Cleanup after animation
    setTimeout(() => particleSystem.dispose(), 5000);
  }
  
  private doScreenFlash(color: string, duration: number): void {
    // Create fullscreen flash plane
    const flash = BABYLON.MeshBuilder.CreatePlane('flash', { size: 100 }, this.scene);
    
    const camera = this.scene.activeCamera;
    if (camera) {
      flash.parent = camera;
      flash.position.z = 1; // Just in front of camera
    }
    
    const material = new BABYLON.StandardMaterial('flashMat', this.scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.alpha = 0.5;
    material.disableLighting = true;
    flash.material = material;
    
    // Fade out
    const fadeOut = () => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(1, elapsed / duration);
        
        material.alpha = 0.5 * (1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          flash.dispose();
          material.dispose();
        }
      };
      animate();
    };
    
    fadeOut();
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    this.activeEmotes.forEach(emote => emote.stop());
    this.activeEmotes.clear();
    this.confettiTextures.forEach(tex => tex.dispose());
    this.confettiTextures.clear();
  }
}

// ============ EMOTE INSTANCE ============

class EmoteInstance {
  private scene: BABYLON.Scene;
  private mesh: BABYLON.Mesh;
  private definition: EmoteDefinition;
  private onComplete: () => void;
  
  private particleSystem: BABYLON.ParticleSystem | null = null;
  private animations: BABYLON.Animatable[] = [];
  private timeoutId: number | null = null;
  private isPlaying: boolean = false;
  
  constructor(
    scene: BABYLON.Scene,
    mesh: BABYLON.Mesh,
    definition: EmoteDefinition,
    onComplete: () => void
  ) {
    this.scene = scene;
    this.mesh = mesh;
    this.definition = definition;
    this.onComplete = onComplete;
  }
  
  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    // Start particles
    if (this.definition.particles) {
      this.startParticles();
    }
    
    // Play mesh animation
    this.playMeshAnimation();
    
    // Screen effect
    if (this.definition.screenEffect && this.definition.screenEffect !== 'none') {
      this.doScreenEffect();
    }
    
    // Set timeout for completion
    if (!this.definition.looping) {
      this.timeoutId = window.setTimeout(() => {
        this.stop();
        this.onComplete();
      }, this.definition.duration * 1000);
    }
  }
  
  stop(): void {
    this.isPlaying = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.particleSystem) {
      this.particleSystem.dispose();
      this.particleSystem = null;
    }
    
    this.animations.forEach(anim => anim.stop());
    this.animations = [];
  }
  
  private startParticles(): void {
    this.particleSystem = new BABYLON.ParticleSystem(
      `emote_${this.definition.id}_${Date.now()}`,
      100,
      this.scene
    );
    
    // Simple particle texture
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    this.particleSystem.particleTexture = BABYLON.RawTexture.CreateRGBATexture(
      data, size, size, this.scene, false, false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE
    );
    
    this.particleSystem.emitter = this.mesh;
    
    // Configure based on particle type
    switch (this.definition.particleType) {
      case 'confetti':
        this.configureConfetti();
        break;
      case 'hearts':
        this.configureHearts();
        break;
      case 'stars':
        this.configureStars();
        break;
      case 'fire':
        this.configureFire();
        break;
      case 'sparkle':
      default:
        this.configureSparkle();
    }
    
    this.particleSystem.start();
  }
  
  private configureConfetti(): void {
    const ps = this.particleSystem!;
    
    ps.direction1 = new BABYLON.Vector3(-2, 8, -2);
    ps.direction2 = new BABYLON.Vector3(2, 12, 2);
    ps.gravity = new BABYLON.Vector3(0, -5, 0);
    
    ps.color1 = BABYLON.Color4.FromHexString(this.definition.primaryColor + 'ff');
    ps.color2 = BABYLON.Color4.FromHexString((this.definition.secondaryColor || '#00ff00') + 'ff');
    
    ps.minSize = 0.1;
    ps.maxSize = 0.2;
    ps.minLifeTime = 1.5;
    ps.maxLifeTime = 3;
    ps.emitRate = 50;
    
    ps.minAngularSpeed = -3;
    ps.maxAngularSpeed = 3;
  }
  
  private configureHearts(): void {
    const ps = this.particleSystem!;
    
    ps.direction1 = new BABYLON.Vector3(-1, 3, -1);
    ps.direction2 = new BABYLON.Vector3(1, 5, 1);
    ps.gravity = new BABYLON.Vector3(0, 1, 0);
    
    ps.color1 = BABYLON.Color4.FromHexString('#ff69b4ff');
    ps.color2 = BABYLON.Color4.FromHexString('#ff1493ff');
    
    ps.minSize = 0.15;
    ps.maxSize = 0.3;
    ps.minLifeTime = 1;
    ps.maxLifeTime = 2;
    ps.emitRate = 20;
  }
  
  private configureStars(): void {
    const ps = this.particleSystem!;
    
    ps.direction1 = new BABYLON.Vector3(-2, 2, -2);
    ps.direction2 = new BABYLON.Vector3(2, 4, 2);
    ps.gravity = new BABYLON.Vector3(0, 0.5, 0);
    
    ps.color1 = BABYLON.Color4.FromHexString('#ffd700ff');
    ps.color2 = BABYLON.Color4.FromHexString('#ffffffff');
    
    ps.minSize = 0.1;
    ps.maxSize = 0.25;
    ps.minLifeTime = 0.8;
    ps.maxLifeTime = 1.5;
    ps.emitRate = 30;
    
    ps.minAngularSpeed = 0;
    ps.maxAngularSpeed = 2;
  }
  
  private configureFire(): void {
    const ps = this.particleSystem!;
    
    ps.direction1 = new BABYLON.Vector3(-0.5, 3, -0.5);
    ps.direction2 = new BABYLON.Vector3(0.5, 6, 0.5);
    ps.gravity = new BABYLON.Vector3(0, 0, 0);
    
    ps.color1 = BABYLON.Color4.FromHexString('#ff4500ff');
    ps.color2 = BABYLON.Color4.FromHexString('#ffd700ff');
    ps.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
    
    ps.minSize = 0.2;
    ps.maxSize = 0.5;
    ps.minLifeTime = 0.3;
    ps.maxLifeTime = 0.8;
    ps.emitRate = 80;
    
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  }
  
  private configureSparkle(): void {
    const ps = this.particleSystem!;
    
    ps.direction1 = new BABYLON.Vector3(-1, 1, -1);
    ps.direction2 = new BABYLON.Vector3(1, 3, 1);
    ps.gravity = new BABYLON.Vector3(0, 0.5, 0);
    
    ps.color1 = BABYLON.Color4.FromHexString(this.definition.primaryColor + 'ff');
    ps.color2 = BABYLON.Color4.FromHexString('#ffffffff');
    
    ps.minSize = 0.05;
    ps.maxSize = 0.15;
    ps.minLifeTime = 0.5;
    ps.maxLifeTime = 1;
    ps.emitRate = 40;
    
    ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  }
  
  private playMeshAnimation(): void {
    // Bounce animation
    const animation = new BABYLON.Animation(
      'emoteAnim',
      'scaling',
      30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      this.definition.looping 
        ? BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        : BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const keys = [
      { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
      { frame: 5, value: new BABYLON.Vector3(1.2, 0.8, 1.2) },
      { frame: 10, value: new BABYLON.Vector3(0.9, 1.2, 0.9) },
      { frame: 15, value: new BABYLON.Vector3(1.1, 0.9, 1.1) },
      { frame: 20, value: new BABYLON.Vector3(1, 1, 1) },
    ];
    
    animation.setKeys(keys);
    
    this.mesh.animations = [animation];
    const animatable = this.scene.beginAnimation(
      this.mesh,
      0,
      20,
      this.definition.looping
    );
    this.animations.push(animatable);
  }
  
  private doScreenEffect(): void {
    switch (this.definition.screenEffect) {
      case 'flash':
        // Flash handled by EmotePlayer
        break;
      case 'shake':
        this.doScreenShake();
        break;
      case 'zoom':
        this.doZoomEffect();
        break;
    }
  }
  
  private doScreenShake(): void {
    const camera = this.scene.activeCamera;
    if (!camera) return;
    
    const originalPos = camera.position.clone();
    const shakeIntensity = 0.1;
    const shakeDuration = 0.5;
    
    const startTime = Date.now();
    const shake = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > shakeDuration) {
        camera.position = originalPos;
        return;
      }
      
      const decay = 1 - elapsed / shakeDuration;
      camera.position.x = originalPos.x + (Math.random() - 0.5) * shakeIntensity * decay;
      camera.position.y = originalPos.y + (Math.random() - 0.5) * shakeIntensity * decay;
      
      requestAnimationFrame(shake);
    };
    
    shake();
  }
  
  private doZoomEffect(): void {
    // Simple zoom animation on camera FOV
    const camera = this.scene.activeCamera as BABYLON.ArcRotateCamera;
    if (!camera || !('fov' in camera)) return;
    
    const originalFov = camera.fov;
    const zoomedFov = originalFov * 0.8;
    
    // Zoom in
    BABYLON.Animation.CreateAndStartAnimation(
      'zoomIn',
      camera,
      'fov',
      60,
      10,
      originalFov,
      zoomedFov,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Zoom back out
    setTimeout(() => {
      BABYLON.Animation.CreateAndStartAnimation(
        'zoomOut',
        camera,
        'fov',
        60,
        10,
        zoomedFov,
        originalFov,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
      );
    }, 200);
  }
}

// ============ HELPER FUNCTIONS ============

export function getEmoteInfo(emoteId: string): EmoteDefinition | null {
  return EMOTE_CATALOG[emoteId] || null;
}

export function getEmotesByType(type: EmoteDefinition['type']): EmoteDefinition[] {
  return Object.values(EMOTE_CATALOG).filter(e => e.type === type);
}

export default EmotePlayer;
