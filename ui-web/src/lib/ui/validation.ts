/**
 * Input Validation System
 * EMMSOAI Suggestion (Alex - Technical QA Engineer):
 * "Voeg validatie toe voor gebruikersinput om UI-overlapping te voorkomen"
 */

export interface ValidationResult {
    valid: boolean;
    sanitized: string;
    errors: string[];
}

export interface ValidationRules {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    required?: boolean;
    noSpecialChars?: boolean;
    noHtml?: boolean;
}

const DEFAULT_RULES: ValidationRules = {
    minLength: 1,
    maxLength: 50,
    required: false,
    noSpecialChars: false,
    noHtml: true
};

// XSS prevention patterns
const HTML_PATTERN = /<[^>]*>/g;
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /on\w+\s*=/gi;
const JAVASCRIPT_PATTERN = /javascript:/gi;

// Special characters that could cause UI issues
const UI_BREAKING_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g;
const OVERFLOW_CHARS = /[\u202E\u202D\u202C\u202B\u202A]/g; // RTL override chars

/**
 * Sanitize input string to prevent XSS and UI issues
 */
export function sanitizeInput(input: string): string {
    if (!input) return '';

    return input
        .replace(SCRIPT_PATTERN, '')
        .replace(HTML_PATTERN, '')
        .replace(EVENT_HANDLER_PATTERN, '')
        .replace(JAVASCRIPT_PATTERN, '')
        .replace(UI_BREAKING_CHARS, '')
        .replace(OVERFLOW_CHARS, '')
        .trim();
}

/**
 * Validate username input
 */
export function validateUsername(username: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = sanitizeInput(username);

    // Length validation
    if (sanitized.length < 3) {
        errors.push('Username must be at least 3 characters');
    }
    if (sanitized.length > 20) {
        sanitized = sanitized.substring(0, 20);
        errors.push('Username truncated to 20 characters');
    }

    // Pattern validation (alphanumeric + underscore only)
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    if (!usernamePattern.test(sanitized)) {
        sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');
        errors.push('Username can only contain letters, numbers, and underscores');
    }

    return {
        valid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Validate chat message input
 */
export function validateChatMessage(message: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = sanitizeInput(message);

    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200);
        errors.push('Message truncated to 200 characters');
    }

    // Check for spam patterns
    const repeatedCharPattern = /(.)\1{9,}/g;
    if (repeatedCharPattern.test(sanitized)) {
        sanitized = sanitized.replace(repeatedCharPattern, '$1$1$1');
        errors.push('Excessive repeated characters removed');
    }

    return {
        valid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Validate lobby name input
 */
export function validateLobbyName(name: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = sanitizeInput(name);

    if (sanitized.length < 1) {
        errors.push('Lobby name is required');
    }
    if (sanitized.length > 30) {
        sanitized = sanitized.substring(0, 30);
        errors.push('Lobby name truncated to 30 characters');
    }

    // Allow spaces but limit consecutive spaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');

    return {
        valid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Generic validation function
 */
export function validateInput(input: string, rules: ValidationRules = {}): ValidationResult {
    const finalRules = { ...DEFAULT_RULES, ...rules };
    const errors: string[] = [];
    let sanitized = finalRules.noHtml ? sanitizeInput(input) : input.trim();

    // Required check
    if (finalRules.required && !sanitized) {
        errors.push('This field is required');
    }

    // Length checks
    if (finalRules.minLength && sanitized.length < finalRules.minLength) {
        errors.push(`Minimum length is ${finalRules.minLength} characters`);
    }
    if (finalRules.maxLength && sanitized.length > finalRules.maxLength) {
        sanitized = sanitized.substring(0, finalRules.maxLength);
        errors.push(`Maximum length is ${finalRules.maxLength} characters`);
    }

    // Pattern check
    if (finalRules.pattern && !finalRules.pattern.test(sanitized)) {
        errors.push('Invalid format');
    }

    // Special chars check
    if (finalRules.noSpecialChars) {
        const cleaned = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
        if (cleaned !== sanitized) {
            sanitized = cleaned;
            errors.push('Special characters removed');
        }
    }

    return {
        valid: errors.filter(e => !e.includes('truncated') && !e.includes('removed')).length === 0,
        sanitized,
        errors
    };
}

/**
 * Truncate text for UI display with ellipsis
 */
export function truncateForDisplay(text: string, maxLength: number): string {
    const sanitized = sanitizeInput(text);
    if (sanitized.length <= maxLength) return sanitized;
    return sanitized.substring(0, maxLength - 3) + '...';
}

/**
 * Validate and format score display
 */
export function formatScore(score: number): string {
    const clamped = Math.max(0, Math.min(score, 999999999));
    if (clamped >= 1000000) {
        return (clamped / 1000000).toFixed(1) + 'M';
    }
    if (clamped >= 1000) {
        return (clamped / 1000).toFixed(1) + 'K';
    }
    return clamped.toString();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
    const sanitized = sanitizeInput(email).toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors: string[] = [];

    if (!emailPattern.test(sanitized)) {
        errors.push('Invalid email format');
    }
    if (sanitized.length > 100) {
        errors.push('Email too long');
    }

    return {
        valid: errors.length === 0,
        sanitized,
        errors
    };
}
