/**
 * Character Skin System - Sprint 5
 * Loads and applies cosmetic skins to player meshes in Babylon.js
 */

import * as BABYLON from '@babylonjs/core';

// ============ TYPES ============

export interface SkinDefinition {
  id: string;
  name: string;
  type: 'runner' | 'chaser';
  
  // Colors
  baseColor: string;       // Hex color for main body
  glowColor: string;       // Hex color for glow effect
  accentColor?: string;    // Optional accent color
  
  // Material properties
  emissiveIntensity: number;
  metallic: number;
  roughness: number;
  
  // Special effects
  hasGlow: boolean;
  hasParticles: boolean;
  particleType?: 'sparkle' | 'fire' | 'ice' | 'electric';
  
  // Animation
  idleAnimation?: string;
  moveAnimation?: string;
}

// ============ SKIN CATALOG ============

export const SKIN_CATALOG: Record<string, SkinDefinition> = {
  // Default skins
  'default_runner': {
    id: 'default_runner',
    name: 'Classic Runner',
    type: 'runner',
    baseColor: '#ffff00',
    glowColor: '#ffff00',
    emissiveIntensity: 0.3,
    metallic: 0.1,
    roughness: 0.8,
    hasGlow: true,
    hasParticles: false,
  },
  'default_chaser': {
    id: 'default_chaser',
    name: 'Classic Chaser',
    type: 'chaser',
    baseColor: '#ff0000',
    glowColor: '#ff4444',
    emissiveIntensity: 0.4,
    metallic: 0.2,
    roughness: 0.6,
    hasGlow: true,
    hasParticles: false,
  },
  
  // Premium skins
  'runner_neon_knight': {
    id: 'runner_neon_knight',
    name: 'Neon Knight',
    type: 'runner',
    baseColor: '#00ffff',
    glowColor: '#00ffff',
    accentColor: '#ff00ff',
    emissiveIntensity: 0.8,
    metallic: 0.9,
    roughness: 0.2,
    hasGlow: true,
    hasParticles: true,
    particleType: 'sparkle',
  },
  'runner_cyber_samurai': {
    id: 'runner_cyber_samurai',
    name: 'Cyber Samurai',
    type: 'runner',
    baseColor: '#ff0066',
    glowColor: '#ff00ff',
    accentColor: '#00ffff',
    emissiveIntensity: 0.7,
    metallic: 0.8,
    roughness: 0.3,
    hasGlow: true,
    hasParticles: true,
    particleType: 'electric',
  },
  'runner_sunset_surfer': {
    id: 'runner_sunset_surfer',
    name: 'Sunset Surfer',
    type: 'runner',
    baseColor: '#ff8c00',
    glowColor: '#ff6b35',
    accentColor: '#ff1493',
    emissiveIntensity: 0.5,
    metallic: 0.3,
    roughness: 0.5,
    hasGlow: true,
    hasParticles: false,
  },
  'runner_forest_phantom': {
    id: 'runner_forest_phantom',
    name: 'Forest Phantom',
    type: 'runner',
    baseColor: '#228b22',
    glowColor: '#32cd32',
    accentColor: '#90ee90',
    emissiveIntensity: 0.4,
    metallic: 0.2,
    roughness: 0.7,
    hasGlow: true,
    hasParticles: true,
    particleType: 'sparkle',
  },
  'runner_arcade_warrior': {
    id: 'runner_arcade_warrior',
    name: 'Arcade Warrior',
    type: 'runner',
    baseColor: '#9400d3',
    glowColor: '#ba55d3',
    emissiveIntensity: 0.6,
    metallic: 0.4,
    roughness: 0.4,
    hasGlow: true,
    hasParticles: false,
  },
};

// ============ SKIN LOADER ============

export class SkinLoader {
  private scene: BABYLON.Scene;
  private materialCache: Map<string, BABYLON.PBRMaterial> = new Map();
  private particleSystems: Map<string, BABYLON.ParticleSystem> = new Map();
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }
  
  /**
   * Get or create a material for a skin
   */
  getMaterial(skinId: string): BABYLON.PBRMaterial {
    // Check cache
    if (this.materialCache.has(skinId)) {
      return this.materialCache.get(skinId)!;
    }
    
    const skin = SKIN_CATALOG[skinId] || SKIN_CATALOG['default_runner'];
    const material = this.createMaterialFromSkin(skin);
    
    this.materialCache.set(skinId, material);
    return material;
  }
  
  /**
   * Apply a skin to a mesh
   */
  applySkin(mesh: BABYLON.Mesh, skinId: string): void {
    const skin = SKIN_CATALOG[skinId];
    if (!skin) {
      console.warn(`Skin not found: ${skinId}, using default`);
      return;
    }
    
    // Apply material
    mesh.material = this.getMaterial(skinId);
    
    // Add particle effects if applicable
    if (skin.hasParticles && skin.particleType) {
      this.addParticleEffect(mesh, skin);
    }
  }
  
  /**
   * Create a PBR material from skin definition
   */
  private createMaterialFromSkin(skin: SkinDefinition): BABYLON.PBRMaterial {
    const material = new BABYLON.PBRMaterial(`skin_${skin.id}`, this.scene);
    
    // Base color
    material.albedoColor = BABYLON.Color3.FromHexString(skin.baseColor);
    
    // Emissive for glow effect
    if (skin.hasGlow) {
      material.emissiveColor = BABYLON.Color3.FromHexString(skin.glowColor);
      material.emissiveIntensity = skin.emissiveIntensity;
    }
    
    // PBR properties
    material.metallic = skin.metallic;
    material.roughness = skin.roughness;
    
    // Transparency for ghost effects
    if (skin.id.includes('phantom') || skin.id.includes('ghost')) {
      material.alpha = 0.85;
      material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    }
    
    return material;
  }
  
  /**
   * Add particle effects to a mesh based on skin
   */
  private addParticleEffect(mesh: BABYLON.Mesh, skin: SkinDefinition): void {
    // Remove existing particles
    const existingKey = `particles_${mesh.uniqueId}`;
    if (this.particleSystems.has(existingKey)) {
      this.particleSystems.get(existingKey)?.dispose();
    }
    
    const particles = new BABYLON.ParticleSystem(
      `particles_${skin.id}_${mesh.uniqueId}`,
      50,
      this.scene
    );
    
    // Particle texture (create procedurally)
    particles.particleTexture = this.createParticleTexture(skin.particleType!);
    
    // Emitter
    particles.emitter = mesh;
    particles.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    particles.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    
    // Colors based on skin
    const color1 = BABYLON.Color4.FromHexString(skin.glowColor + 'ff');
    const color2 = BABYLON.Color4.FromHexString((skin.accentColor || skin.glowColor) + 'ff');
    
    particles.color1 = color1;
    particles.color2 = color2;
    particles.colorDead = new BABYLON.Color4(color1.r, color1.g, color1.b, 0);
    
    // Size
    particles.minSize = 0.02;
    particles.maxSize = 0.08;
    
    // Lifetime
    particles.minLifeTime = 0.3;
    particles.maxLifeTime = 0.8;
    
    // Emission rate
    particles.emitRate = 20;
    
    // Gravity and velocity based on type
    switch (skin.particleType) {
      case 'fire':
        particles.gravity = new BABYLON.Vector3(0, 2, 0);
        particles.direction1 = new BABYLON.Vector3(-0.2, 1, -0.2);
        particles.direction2 = new BABYLON.Vector3(0.2, 1.5, 0.2);
        particles.minSize = 0.05;
        particles.maxSize = 0.15;
        break;
        
      case 'ice':
        particles.gravity = new BABYLON.Vector3(0, -0.5, 0);
        particles.direction1 = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        particles.direction2 = new BABYLON.Vector3(0.5, 0.5, 0.5);
        particles.minLifeTime = 0.5;
        particles.maxLifeTime = 1.2;
        break;
        
      case 'electric':
        particles.gravity = new BABYLON.Vector3(0, 0, 0);
        particles.direction1 = new BABYLON.Vector3(-1, -1, -1);
        particles.direction2 = new BABYLON.Vector3(1, 1, 1);
        particles.minAngularSpeed = -5;
        particles.maxAngularSpeed = 5;
        particles.emitRate = 30;
        break;
        
      case 'sparkle':
      default:
        particles.gravity = new BABYLON.Vector3(0, 0.5, 0);
        particles.direction1 = new BABYLON.Vector3(-0.3, 0.5, -0.3);
        particles.direction2 = new BABYLON.Vector3(0.3, 1, 0.3);
        break;
    }
    
    particles.start();
    this.particleSystems.set(existingKey, particles);
  }
  
  /**
   * Create a procedural particle texture
   */
  private createParticleTexture(type: string): BABYLON.Texture {
    // Create a dynamic texture for particles
    const size = 32;
    const textureBuffer = new Uint8Array(size * size * 4);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - size / 2;
        const dy = y - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);
        
        // Radial gradient
        const alpha = Math.max(0, 1 - dist);
        
        textureBuffer[idx] = 255;     // R
        textureBuffer[idx + 1] = 255; // G
        textureBuffer[idx + 2] = 255; // B
        textureBuffer[idx + 3] = Math.floor(alpha * alpha * 255); // A (soft falloff)
      }
    }
    
    const rawTexture = BABYLON.RawTexture.CreateRGBATexture(
      textureBuffer,
      size,
      size,
      this.scene,
      false,
      false,
      BABYLON.Texture.BILINEAR_SAMPLINGMODE
    );
    
    return rawTexture;
  }
  
  /**
   * Remove skin effects from a mesh
   */
  removeSkin(mesh: BABYLON.Mesh): void {
    const particleKey = `particles_${mesh.uniqueId}`;
    if (this.particleSystems.has(particleKey)) {
      this.particleSystems.get(particleKey)?.dispose();
      this.particleSystems.delete(particleKey);
    }
  }
  
  /**
   * Dispose of all cached resources
   */
  dispose(): void {
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
    
    this.particleSystems.forEach(ps => ps.dispose());
    this.particleSystems.clear();
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Get skin info for display
 */
export function getSkinInfo(skinId: string): SkinDefinition | null {
  return SKIN_CATALOG[skinId] || null;
}

/**
 * Get all skins of a type
 */
export function getSkinsByType(type: 'runner' | 'chaser'): SkinDefinition[] {
  return Object.values(SKIN_CATALOG).filter(skin => skin.type === type);
}

export default SkinLoader;
