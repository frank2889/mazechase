/**
 * MazeChase Design System
 * 
 * Color palette designed to be unique and avoid Pac-Man yellow.
 * Using a neon cyberpunk theme with purple/cyan/magenta accents.
 */

export const colors = {
    // Primary brand colors
    primary: {
        main: '#8B5CF6',      // Vibrant purple
        light: '#A78BFA',     // Light purple
        dark: '#7C3AED',      // Deep purple
    },
    
    // Secondary accent colors  
    accent: {
        cyan: '#22D3EE',      // Neon cyan
        magenta: '#EC4899',   // Hot pink/magenta
        lime: '#84CC16',      // Electric lime
        orange: '#F97316',    // Sunset orange
    },
    
    // Player/character colors
    players: {
        runner: '#22D3EE',    // Cyan - the main runner (was Pacman)
        chaser1: '#EC4899',   // Magenta - first chaser
        chaser2: '#8B5CF6',   // Purple - second chaser
        chaser3: '#F97316',   // Orange - third chaser
    },
    
    // UI colors
    ui: {
        background: '#0F0F1A',   // Very dark purple-black
        surface: '#1A1A2E',      // Dark purple surface
        card: '#252542',         // Card background
        border: '#3D3D5C',       // Border color
    },
    
    // Text colors
    text: {
        primary: '#F8FAFC',      // Almost white
        secondary: '#94A3B8',    // Muted gray
        muted: '#64748B',        // Dimmed text
    },
    
    // Status colors
    status: {
        success: '#22C55E',      // Green
        error: '#EF4444',        // Red
        warning: '#EAB308',      // Amber
        info: '#3B82F6',         // Blue
    },
    
    // Game-specific colors
    game: {
        pellet: '#22D3EE',       // Cyan pellets
        powerUp: '#EC4899',      // Magenta power-ups
        wall: '#3D3D5C',         // Wall color
        path: '#1A1A2E',         // Path color
    }
};

// Gradient presets
export const gradients = {
    brand: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    brandHover: 'linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)',
    surface: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)',
    neon: 'linear-gradient(135deg, #22D3EE 0%, #8B5CF6 50%, #EC4899 100%)',
};

// CSS classes for common elements
export const themeClasses = {
    // Buttons
    btnPrimary: 'bg-purple-600 hover:bg-purple-500 text-white',
    btnSecondary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    btnDanger: 'bg-red-600 hover:bg-red-500 text-white',
    btnSuccess: 'bg-green-600 hover:bg-green-500 text-white',
    
    // Cards
    card: 'bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl',
    
    // Text
    textGradient: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400',
};
