/**
 * Trail Effects System - Sprint 5
 * Creates visual trails behind moving players
 */

import * as BABYLON from '@babylonjs/core';

// ============ TYPES ============

export interface TrailDefinition {
  id: string;
  name: string;
  type: 'particle' | 'ribbon' | 'glow' | 'ghost';
  
  // Colors
  primaryColor: string;
  secondaryColor?: string;
  
  // Trail properties
  duration: number;      // How long trail stays visible (seconds)
  density: number;       // Particles per second / ribbon segments
  width: number;         // Trail width
  
  // Effects
  fadeOut: boolean;
  glow: boolean;
  pulse: boolean;
}

// ============ TRAIL CATALOG ============

export const TRAIL_CATALOG: Record<string, TrailDefinition> = {
  'trail_rainbow': {
    id: 'trail_rainbow',
    name: 'Rainbow Trail',
    type: 'ribbon',
    primaryColor: '#ff0000',
    secondaryColor: '#00ff00',
    duration: 0.8,
    density: 30,
    width: 0.3,
    fadeOut: true,
    glow: true,
    pulse: false,
  },
  'trail_fire': {
    id: 'trail_fire',
    name: 'Fire Trail',
    type: 'particle',
    primaryColor: '#ff4500',
    secondaryColor: '#ffd700',
    duration: 0.5,
    density: 50,
    width: 0.4,
    fadeOut: true,
    glow: true,
    pulse: true,
  },
  'trail_sparkle': {
    id: 'trail_sparkle',
    name: 'Sparkle Trail',
    type: 'particle',
    primaryColor: '#ffffff',
    secondaryColor: '#ffff00',
    duration: 0.6,
    density: 25,
    width: 0.2,
    fadeOut: true,
    glow: true,
    pulse: false,
  },
  'trail_ghost': {
    id: 'trail_ghost',
    name: 'Ghost Trail',
    type: 'ghost',
    primaryColor: '#8b5cf6',
    secondaryColor: '#a855f7',
    duration: 1.0,
    density: 10,
    width: 0.5,
    fadeOut: true,
    glow: true,
    pulse: true,
  },
  'trail_ice': {
    id: 'trail_ice',
    name: 'Ice Trail',
    type: 'particle',
    primaryColor: '#00bfff',
    secondaryColor: '#e0ffff',
    duration: 0.7,
    density: 35,
    width: 0.25,
    fadeOut: true,
    glow: true,
    pulse: false,
  },
  'trail_neon': {
    id: 'trail_neon',
    name: 'Neon Trail',
    type: 'ribbon',
    primaryColor: '#00ffff',
    secondaryColor: '#ff00ff',
    duration: 0.6,
    density: 40,
    width: 0.15,
    fadeOut: true,
    glow: true,
    pulse: true,
  },
};

// ============ TRAIL RENDERER ============

export class TrailRenderer {
  private scene: BABYLON.Scene;
  private activeTrails: Map<string, TrailInstance> = new Map();
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }
  
  /**
   * Create a trail for a mesh
   */
  createTrail(mesh: BABYLON.Mesh, trailId: string): TrailInstance | null {
    const definition = TRAIL_CATALOG[trailId];
    if (!definition) {
      console.warn(`Trail not found: ${trailId}`);
      return null;
    }
    
    // Remove existing trail
    this.removeTrail(mesh.uniqueId.toString());
    
    let trail: TrailInstance;
    
    switch (definition.type) {
      case 'particle':
        trail = new ParticleTrail(this.scene, mesh, definition);
        break;
      case 'ribbon':
        trail = new RibbonTrail(this.scene, mesh, definition);
        break;
      case 'ghost':
        trail = new GhostTrail(this.scene, mesh, definition);
        break;
      case 'glow':
        trail = new GlowTrail(this.scene, mesh, definition);
        break;
      default:
        trail = new ParticleTrail(this.scene, mesh, definition);
    }
    
    this.activeTrails.set(mesh.uniqueId.toString(), trail);
    return trail;
  }
  
  /**
   * Remove trail from a mesh
   */
  removeTrail(meshId: string): void {
    const trail = this.activeTrails.get(meshId);
    if (trail) {
      trail.dispose();
      this.activeTrails.delete(meshId);
    }
  }
  
  /**
   * Update all active trails
   */
  update(deltaTime: number): void {
    this.activeTrails.forEach(trail => trail.update(deltaTime));
  }
  
  /**
   * Dispose all trails
   */
  dispose(): void {
    this.activeTrails.forEach(trail => trail.dispose());
    this.activeTrails.clear();
  }
}

// ============ TRAIL INSTANCE BASE ============

abstract class TrailInstance {
  protected scene: BABYLON.Scene;
  protected mesh: BABYLON.Mesh;
  protected definition: TrailDefinition;
  protected lastPosition: BABYLON.Vector3;
  
  constructor(scene: BABYLON.Scene, mesh: BABYLON.Mesh, definition: TrailDefinition) {
    this.scene = scene;
    this.mesh = mesh;
    this.definition = definition;
    this.lastPosition = mesh.position.clone();
  }
  
  abstract update(deltaTime: number): void;
  abstract dispose(): void;
  
  protected isMoving(): boolean {
    const moved = BABYLON.Vector3.Distance(this.mesh.position, this.lastPosition) > 0.01;
    this.lastPosition = this.mesh.position.clone();
    return moved;
  }
}

// ============ PARTICLE TRAIL ============

class ParticleTrail extends TrailInstance {
  private particleSystem: BABYLON.ParticleSystem;
  
  constructor(scene: BABYLON.Scene, mesh: BABYLON.Mesh, definition: TrailDefinition) {
    super(scene, mesh, definition);
    
    this.particleSystem = new BABYLON.ParticleSystem(
      `trail_${definition.id}_${mesh.uniqueId}`,
      100,
      scene
    );
    
    this.setupParticles();
    this.particleSystem.start();
  }
  
  private setupParticles(): void {
    const ps = this.particleSystem;
    const def = this.definition;
    
    // Create texture
    ps.particleTexture = this.createTrailTexture();
    
    // Emitter follows mesh
    ps.emitter = this.mesh;
    ps.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
    ps.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
    
    // Colors
    const color1 = BABYLON.Color4.FromHexString(def.primaryColor + 'ff');
    const color2 = BABYLON.Color4.FromHexString((def.secondaryColor || def.primaryColor) + 'ff');
    
    ps.color1 = color1;
    ps.color2 = color2;
    ps.colorDead = new BABYLON.Color4(color1.r, color1.g, color1.b, 0);
    
    // Size
    ps.minSize = def.width * 0.3;
    ps.maxSize = def.width;
    
    // Lifetime
    ps.minLifeTime = def.duration * 0.5;
    ps.maxLifeTime = def.duration;
    
    // Emission
    ps.emitRate = def.density;
    
    // Movement - trail behind
    ps.direction1 = new BABYLON.Vector3(-0.1, 0, -0.1);
    ps.direction2 = new BABYLON.Vector3(0.1, 0.2, 0.1);
    ps.gravity = new BABYLON.Vector3(0, 0.1, 0);
    
    // Speed
    ps.minEmitPower = 0.1;
    ps.maxEmitPower = 0.3;
    
    // Blend mode for glow
    if (def.glow) {
      ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    }
  }
  
  private createTrailTexture(): BABYLON.Texture {
    const size = 32;
    const data = new Uint8Array(size * size * 4);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - size / 2;
        const dy = y - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);
        const alpha = Math.max(0, 1 - dist);
        
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * alpha * 255);
      }
    }
    
    return BABYLON.RawTexture.CreateRGBATexture(
      data, size, size, this.scene, false, false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    );
  }
  
  update(deltaTime: number): void {
    // Adjust emission based on movement
    if (this.isMoving()) {
      this.particleSystem.emitRate = this.definition.density;
    } else {
      this.particleSystem.emitRate = this.definition.density * 0.1;
    }
  }
  
  dispose(): void {
    this.particleSystem.dispose();
  }
}

// ============ RIBBON TRAIL ============

class RibbonTrail extends TrailInstance {
  private positionHistory: BABYLON.Vector3[] = [];
  private ribbon: BABYLON.Mesh | null = null;
  private material: BABYLON.StandardMaterial;
  private maxPoints: number = 30;
  private updateCounter: number = 0;
  
  constructor(scene: BABYLON.Scene, mesh: BABYLON.Mesh, definition: TrailDefinition) {
    super(scene, mesh, definition);
    
    this.material = new BABYLON.StandardMaterial(`ribbon_mat_${mesh.uniqueId}`, scene);
    this.material.emissiveColor = BABYLON.Color3.FromHexString(definition.primaryColor);
    this.material.alpha = 0.7;
    this.material.backFaceCulling = false;
    
    this.maxPoints = Math.floor(definition.duration * 60); // Based on ~60fps
  }
  
  update(deltaTime: number): void {
    this.updateCounter++;
    
    // Add new position every few frames
    if (this.updateCounter % 2 === 0 && this.isMoving()) {
      this.positionHistory.unshift(this.mesh.position.clone());
      
      // Limit history length
      if (this.positionHistory.length > this.maxPoints) {
        this.positionHistory.pop();
      }
    }
    
    // Need at least 2 points for ribbon
    if (this.positionHistory.length < 2) return;
    
    // Rebuild ribbon mesh
    this.rebuildRibbon();
  }
  
  private rebuildRibbon(): void {
    // Dispose old ribbon
    if (this.ribbon) {
      this.ribbon.dispose();
    }
    
    // Create path arrays for ribbon
    const pathArray: BABYLON.Vector3[][] = [];
    const width = this.definition.width;
    
    // Top and bottom paths
    const topPath: BABYLON.Vector3[] = [];
    const bottomPath: BABYLON.Vector3[] = [];
    
    for (let i = 0; i < this.positionHistory.length; i++) {
      const pos = this.positionHistory[i];
      const fade = 1 - (i / this.positionHistory.length);
      const currentWidth = width * fade;
      
      topPath.push(new BABYLON.Vector3(pos.x, pos.y + currentWidth, pos.z));
      bottomPath.push(new BABYLON.Vector3(pos.x, pos.y - currentWidth, pos.z));
    }
    
    pathArray.push(topPath);
    pathArray.push(bottomPath);
    
    // Create ribbon
    this.ribbon = BABYLON.MeshBuilder.CreateRibbon(
      `trail_ribbon_${this.mesh.uniqueId}`,
      {
        pathArray,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        updatable: false,
      },
      this.scene
    );
    
    this.ribbon.material = this.material;
  }
  
  dispose(): void {
    if (this.ribbon) {
      this.ribbon.dispose();
    }
    this.material.dispose();
    this.positionHistory = [];
  }
}

// ============ GHOST TRAIL ============

class GhostTrail extends TrailInstance {
  private ghosts: Array<{ mesh: BABYLON.Mesh; age: number }> = [];
  private spawnTimer: number = 0;
  private spawnInterval: number;
  
  constructor(scene: BABYLON.Scene, mesh: BABYLON.Mesh, definition: TrailDefinition) {
    super(scene, mesh, definition);
    this.spawnInterval = 1 / definition.density;
  }
  
  update(deltaTime: number): void {
    // Spawn new ghosts while moving
    if (this.isMoving()) {
      this.spawnTimer += deltaTime;
      
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnGhost();
      }
    }
    
    // Update existing ghosts
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i];
      ghost.age += deltaTime;
      
      // Fade out
      const progress = ghost.age / this.definition.duration;
      if (progress >= 1) {
        ghost.mesh.dispose();
        this.ghosts.splice(i, 1);
      } else {
        const material = ghost.mesh.material as BABYLON.StandardMaterial;
        material.alpha = 0.5 * (1 - progress);
        ghost.mesh.scaling.setAll(1 - progress * 0.3);
      }
    }
  }
  
  private spawnGhost(): void {
    // Clone the mesh appearance
    const ghost = this.mesh.clone(`ghost_${Date.now()}`);
    if (!ghost) return;
    
    ghost.position = this.mesh.position.clone();
    ghost.rotation = this.mesh.rotation.clone();
    
    // Create ghost material
    const material = new BABYLON.StandardMaterial(`ghost_mat_${Date.now()}`, this.scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(this.definition.primaryColor);
    material.alpha = 0.5;
    material.disableLighting = true;
    ghost.material = material;
    
    this.ghosts.push({ mesh: ghost, age: 0 });
  }
  
  dispose(): void {
    this.ghosts.forEach(g => g.mesh.dispose());
    this.ghosts = [];
  }
}

// ============ GLOW TRAIL ============

class GlowTrail extends TrailInstance {
  private glowLayer: BABYLON.GlowLayer | null = null;
  private intensity: number = 0;
  
  constructor(scene: BABYLON.Scene, mesh: BABYLON.Mesh, definition: TrailDefinition) {
    super(scene, mesh, definition);
    
    // Find or create glow layer
    this.glowLayer = scene.getGlowLayerByName('trailGlow') as BABYLON.GlowLayer;
    if (!this.glowLayer) {
      this.glowLayer = new BABYLON.GlowLayer('trailGlow', scene, {
        blurKernelSize: 32,
      });
    }
    
    // Add mesh to glow layer
    this.glowLayer.addIncludedOnlyMesh(mesh);
  }
  
  update(deltaTime: number): void {
    if (!this.glowLayer) return;
    
    // Increase intensity when moving
    if (this.isMoving()) {
      this.intensity = Math.min(1, this.intensity + deltaTime * 3);
    } else {
      this.intensity = Math.max(0, this.intensity - deltaTime * 2);
    }
    
    // Apply intensity
    this.glowLayer.intensity = this.intensity * (this.definition.pulse 
      ? 0.5 + Math.sin(Date.now() / 200) * 0.3 
      : 0.8);
  }
  
  dispose(): void {
    if (this.glowLayer) {
      this.glowLayer.removeIncludedOnlyMesh(this.mesh);
    }
  }
}

// ============ HELPER FUNCTIONS ============

export function getTrailInfo(trailId: string): TrailDefinition | null {
  return TRAIL_CATALOG[trailId] || null;
}

export function getAllTrails(): TrailDefinition[] {
  return Object.values(TRAIL_CATALOG);
}

export default TrailRenderer;
