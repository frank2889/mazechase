/**
 * Analytics Module - Track player behavior for optimization
 * 
 * Uses PostHog for event tracking and session analytics.
 * AI agents use this data to measure addiction metrics:
 * - Session length
 * - Drop-off points
 * - Feature usage
 * - Retention
 * 
 * @see https://posthog.com/docs/libraries/js
 */

import posthog from 'posthog-js';

// Initialize only in browser
let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Call this once on app load
 */
export function initAnalytics() {
    if (typeof window === 'undefined') return;
    if (isInitialized) return;
    
    // Only init if we have an API key
    const apiKey = import.meta.env.PUBLIC_POSTHOG_KEY;
    if (!apiKey) {
        console.log('Analytics disabled: No PostHog API key');
        return;
    }
    
    posthog.init(apiKey, {
        api_host: import.meta.env.PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        // Capture pageviews automatically
        capture_pageview: true,
        // Capture page leave events
        capture_pageleave: true,
        // Session recording (optional)
        disable_session_recording: true, // Enable for debugging
        // Respect Do Not Track
        respect_dnt: true,
        // Persistence
        persistence: 'localStorage',
    });
    
    isInitialized = true;
    console.log('Analytics initialized');
}

/**
 * Track a game event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!isInitialized) return;
    
    posthog.capture(eventName, {
        ...properties,
        timestamp: Date.now(),
    });
}

/**
 * Track session start
 */
export function trackSessionStart(userId?: string) {
    if (!isInitialized) return;
    
    if (userId) {
        posthog.identify(userId);
    }
    
    trackEvent('session_start', {
        referrer: document.referrer,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        is_mobile: window.innerWidth < 768,
    });
}

/**
 * Track game start
 */
export function trackGameStart(mode: string, playerRole: string) {
    trackEvent('game_start', {
        mode,
        player_role: playerRole,
    });
}

/**
 * Track game end
 */
export function trackGameEnd(winner: string, scores: Record<string, number>, duration: number) {
    trackEvent('game_end', {
        winner,
        scores,
        duration_seconds: duration,
        total_score: Object.values(scores).reduce((a, b) => a + b, 0),
    });
}

/**
 * Track power-up collection
 */
export function trackPowerUp(type: string) {
    trackEvent('powerup_collected', { type });
}

/**
 * Track player caught
 */
export function trackPlayerCaught(wasRunner: boolean) {
    trackEvent('player_caught', { was_runner: wasRunner });
}

/**
 * Track replay (user plays again)
 */
export function trackReplay() {
    trackEvent('replay', {
        // This is a key addiction metric!
        action: 'one_more_game',
    });
}

/**
 * Track drop-off (user leaves)
 */
export function trackDropOff(reason: string) {
    trackEvent('drop_off', { reason });
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(feature: string) {
    trackEvent('feature_used', { feature });
}

/**
 * Track UI interaction
 */
export function trackUIClick(element: string) {
    trackEvent('ui_click', { element });
}

// Export PostHog instance for advanced usage
export { posthog };
