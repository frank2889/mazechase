/**
 * QuadrantThemes - SIMPLIFIED Unified Visual Theme
 * 
 * AI OPTIMIZATION: Removed complex 4-biome system (Dec 2025)
 * - All quadrants now use the same unified "Neon Arena" theme
 * - Reduces visual confusion and cognitive load
 * - Better performance (fewer materials to load)
 * - Cleaner, more focused gameplay experience
 * 
 * Previous system had 4 different biomes which:
 * - Confused new players
 * - Added unnecessary complexity
 * - Had no gameplay benefit
 */

import { Color3, Color4 } from '@babylonjs/core';

export type Quadrant = 'NW' | 'NE' | 'SW' | 'SE';

export interface QuadrantTheme {
    name: string;
    emoji: string;
    quadrant: Quadrant;
    player: string;
    description: string;
    
    // Wall colors
    wallPrimary: Color3;
    wallSecondary: Color3;
    wallEmissive: Color3;
    wallHeight: number;
    
    // Floor colors
    floorColor: Color3;
    floorEmissive: Color3;
    
    // Pellets & Power-ups
    pelletColor: Color3;
    pelletEmissive: Color3;
    powerUpColor: Color3;
    powerUpEmissive: Color3;
    
    // Environment
    fogColor: Color3;
    fogDensity: number;
    ambientColor: Color3;
    
    // Decorations specific to biome
    decorationType: 'trees' | 'grass' | 'rocks' | 'deadtrees';
    decorPrimary: Color3;
    decorSecondary: Color3;
    decorEmissive: Color3;
    decorDensity: number;
    
    // Particles
    particleType: 'leaves' | 'pollen' | 'dust' | 'snow';
    particleColor: Color4;
    particleCount: number;
    
    // Visibility & atmosphere
    visibility: number;
    glowIntensity: number;
}

// ============================================
// � UNIFIED NEON ARENA THEME
// ============================================
// AI OPTIMIZATION: Single theme for all quadrants
// - No visual confusion when crossing areas
// - Consistent wall heights
// - Better performance (1 material set instead of 5)
// - Cleaner, arcade-style visuals

export const THEME_NEON_ARENA: QuadrantTheme = {
    name: 'Neon Arena',
    emoji: '🎮',
    quadrant: 'NW',
    player: 'All',
    description: 'Clean neon arcade arena. Simple, focused, addictive.',
    
    // Purple/cyan neon walls - matches brand colors
    wallPrimary: new Color3(0.15, 0.08, 0.25),
    wallSecondary: new Color3(0.3, 0.15, 0.4),
    wallEmissive: new Color3(0.2, 0.1, 0.35),
    wallHeight: 0.7, // Uniform height
    
    // Kurzgesagt #1A1A2E dark purple background
    floorColor: new Color3(0.10, 0.10, 0.18),
    floorEmissive: new Color3(0.04, 0.04, 0.07),
    
    // Kurzgesagt #FFE66D pellets (light yellow)
    pelletColor: new Color3(1.0, 0.90, 0.43),
    pelletEmissive: new Color3(0.8, 0.72, 0.17),
    
    // Kurzgesagt #FF6B6B power-ups (coral red - matches style guide)
    powerUpColor: new Color3(1.0, 0.42, 0.42),
    powerUpEmissive: new Color3(0.8, 0.34, 0.34),
    
    // Light fog for depth
    fogColor: new Color3(0.08, 0.05, 0.12),
    fogDensity: 0.015,
    ambientColor: new Color3(0.15, 0.1, 0.2),
    
    // Decorations RE-ENABLED (Sprint 5) - Using external models
    // Now using weeds/rocks models from ModelLoader instead of primitives
    decorationType: 'rocks',
    decorPrimary: new Color3(0.2, 0.12, 0.3),
    decorSecondary: new Color3(0.15, 0.08, 0.2),
    decorEmissive: new Color3(0.1, 0.05, 0.15),
    decorDensity: 0.3, // RE-ENABLED - sparse decorations at maze edges
    
    // Particles DISABLED per AI recommendation
    particleType: 'dust',
    particleColor: new Color4(0.4, 0.2, 0.6, 0.2),
    particleCount: 0, // DISABLED - cleaner visuals
    
    visibility: 1.0, // Full visibility - no confusion
    glowIntensity: 1.0
};

// Legacy exports removed - use THEME_NEON_ARENA directly
// (THEME_FOREST, THEME_PLAINS, THEME_CANYON, THEME_TUNDRA were removed Dec 2025)

// All quadrant themes mapped - ALL SAME NOW
export const QUADRANT_THEMES: Record<Quadrant, QuadrantTheme> = {
    'NW': THEME_NEON_ARENA,
    'NE': THEME_NEON_ARENA,
    'SW': THEME_NEON_ARENA,
    'SE': THEME_NEON_ARENA
};

/**
 * Get quadrant for a tile position (legacy - still used for spawn positions)
 */
export function getQuadrant(x: number, y: number, mapWidth: number, mapHeight: number): Quadrant {
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    
    if (x < centerX && y < centerY) return 'NW';
    if (x >= centerX && y < centerY) return 'NE';
    if (x < centerX && y >= centerY) return 'SW';
    return 'SE';
}

/**
 * Check if a tile is part of the cross divider
 * SIMPLIFIED: Always returns false - no more visual cross distinction
 */
export function isCrossDivider(_x: number, _y: number, _mapWidth: number, _mapHeight: number): boolean {
    return false; // Cross divider visual removed for simplicity
}

/**
 * Get theme for a specific tile
 * SIMPLIFIED: Always returns unified theme
 */
export function getThemeForTile(_x: number, _y: number, _mapWidth: number, _mapHeight: number): QuadrantTheme {
    return THEME_NEON_ARENA; // Unified theme for all tiles
}

/**
 * Get spawn quadrant for a player type (legacy - still needed for spawn positions)
 */
export function getPlayerQuadrant(playerType: string): Quadrant {
    switch (playerType) {
        case 'runner': return 'NW';
        case 'ch0': return 'NE';
        case 'ch1': return 'SW';
        case 'ch2': return 'SE';
        default: return 'NW';
    }
}

/**
 * Get theme for a player
 * SIMPLIFIED: Always returns unified theme
 */
export function getPlayerTheme(_playerType: string): QuadrantTheme {
    return THEME_NEON_ARENA; // Same theme for all players
}
