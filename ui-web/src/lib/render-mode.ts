/**
 * Render Mode Configuration
 * 
 * Feature flag system for switching between 2D (Phaser) and 3D (Babylon.js) rendering
 */

export type RenderMode = '2d' | '3d';

// Storage key for user preference
const RENDER_MODE_KEY = 'mazechase_render_mode';

// Default mode (start with 2D for stability, users can opt into 3D)
const DEFAULT_RENDER_MODE: RenderMode = '2d';

/**
 * Get the current render mode from localStorage
 */
export function getRenderMode(): RenderMode {
    if (typeof window === 'undefined') {
        return DEFAULT_RENDER_MODE;
    }
    
    const stored = localStorage.getItem(RENDER_MODE_KEY);
    if (stored === '2d' || stored === '3d') {
        return stored;
    }
    
    return DEFAULT_RENDER_MODE;
}

/**
 * Set the render mode preference
 */
export function setRenderMode(mode: RenderMode): void {
    if (typeof window === 'undefined') {
        return;
    }
    
    localStorage.setItem(RENDER_MODE_KEY, mode);
}

/**
 * Toggle between 2D and 3D mode
 */
export function toggleRenderMode(): RenderMode {
    const current = getRenderMode();
    const next: RenderMode = current === '2d' ? '3d' : '2d';
    setRenderMode(next);
    return next;
}

/**
 * Check if 3D mode is enabled
 */
export function is3DEnabled(): boolean {
    return getRenderMode() === '3d';
}

/**
 * Check if WebGL is supported (required for 3D)
 */
export function isWebGLSupported(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
}

/**
 * Check if 3D mode can be enabled
 */
export function can3DBeEnabled(): boolean {
    return isWebGLSupported();
}

/**
 * Get render mode display name
 */
export function getRenderModeName(mode: RenderMode): string {
    return mode === '2d' ? '2D Classic' : '3D Immersive';
}

/**
 * Get render mode description
 */
export function getRenderModeDescription(mode: RenderMode): string {
    if (mode === '2d') {
        return 'Klassieke 2D weergave met Phaser. Lichtgewicht en compatibel met alle browsers.';
    }
    return 'Nieuwe 3D weergave met Babylon.js. Vereist WebGL ondersteuning.';
}
