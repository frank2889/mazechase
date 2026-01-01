/**
 * Button Styles System
 * EMMSOAI Suggestion (Yuki - Visual Artist & Sprite Designer):
 * "Pas de knoppen aan met ronde hoeken en hover-effecten"
 */

export interface ButtonStyle {
    className: string;
    baseStyles: string;
    hoverStyles: string;
    activeStyles: string;
    disabledStyles: string;
}

// Color palette matching the neon theme
export const BUTTON_COLORS = {
    primary: {
        bg: '#8B5CF6',       // Purple
        hover: '#7C3AED',
        active: '#6D28D9',
        glow: 'rgba(139, 92, 246, 0.5)'
    },
    secondary: {
        bg: '#06B6D4',       // Cyan
        hover: '#0891B2',
        active: '#0E7490',
        glow: 'rgba(6, 182, 212, 0.5)'
    },
    danger: {
        bg: '#EF4444',       // Red
        hover: '#DC2626',
        active: '#B91C1C',
        glow: 'rgba(239, 68, 68, 0.5)'
    },
    success: {
        bg: '#10B981',       // Green
        hover: '#059669',
        active: '#047857',
        glow: 'rgba(16, 185, 129, 0.5)'
    },
    warning: {
        bg: '#F59E0B',       // Amber
        hover: '#D97706',
        active: '#B45309',
        glow: 'rgba(245, 158, 11, 0.5)'
    },
    neon: {
        bg: 'transparent',
        hover: 'rgba(139, 92, 246, 0.2)',
        active: 'rgba(139, 92, 246, 0.3)',
        border: '#8B5CF6',
        glow: 'rgba(139, 92, 246, 0.8)'
    }
};

/**
 * Generate CSS for button hover glow effect
 */
export function getGlowStyle(color: string, intensity = 0.5): string {
    return `0 0 20px ${color}, 0 0 40px ${color.replace('0.5', String(intensity * 0.3))}`;
}

/**
 * Apply button styles to an element
 */
export function applyButtonStyles(
    element: HTMLButtonElement,
    variant: keyof typeof BUTTON_COLORS = 'primary',
    size: 'sm' | 'md' | 'lg' = 'md'
): void {
    const colors = BUTTON_COLORS[variant];
    
    // Base styles
    element.style.cssText = `
        background: ${colors.bg};
        color: white;
        border: ${variant === 'neon' ? `2px solid ${(colors as typeof BUTTON_COLORS.neon).border}` : 'none'};
        border-radius: 12px;
        padding: ${size === 'sm' ? '8px 16px' : size === 'lg' ? '16px 32px' : '12px 24px'};
        font-size: ${size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px'};
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    `;

    // Hover effect
    element.addEventListener('mouseenter', () => {
        element.style.background = colors.hover;
        element.style.transform = 'translateY(-2px)';
        element.style.boxShadow = getGlowStyle(colors.glow);
    });

    element.addEventListener('mouseleave', () => {
        element.style.background = colors.bg;
        element.style.transform = 'translateY(0)';
        element.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });

    // Active effect
    element.addEventListener('mousedown', () => {
        element.style.background = colors.active;
        element.style.transform = 'translateY(0) scale(0.98)';
    });

    element.addEventListener('mouseup', () => {
        element.style.background = colors.hover;
        element.style.transform = 'translateY(-2px) scale(1)';
    });
}

/**
 * CSS class generator for different button variants
 */
export function getButtonClasses(
    variant: keyof typeof BUTTON_COLORS = 'primary',
    size: 'sm' | 'md' | 'lg' = 'md',
    fullWidth = false
): string {
    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg'
    };

    const variantClasses = {
        primary: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700',
        secondary: 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700',
        danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
        success: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
        warning: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
        neon: 'bg-transparent border-2 border-purple-500 hover:bg-purple-500/20'
    };

    return [
        'rounded-xl',
        'font-semibold',
        'text-white',
        'uppercase',
        'tracking-wide',
        'transition-all',
        'duration-200',
        'shadow-lg',
        'hover:shadow-xl',
        'hover:-translate-y-0.5',
        'active:translate-y-0',
        'active:scale-[0.98]',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : ''
    ].filter(Boolean).join(' ');
}

/**
 * Inject global button styles into the document
 */
export function injectButtonStyles(): void {
    const styleId = 'mazechase-button-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .mc-btn {
            border-radius: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: all 0.2s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .mc-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }

        .mc-btn:hover::before {
            left: 100%;
        }

        .mc-btn:hover {
            transform: translateY(-2px);
        }

        .mc-btn:active {
            transform: translateY(0) scale(0.98);
        }

        .mc-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .mc-btn--primary {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: white;
            border: none;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .mc-btn--primary:hover {
            box-shadow: 0 6px 25px rgba(139, 92, 246, 0.6);
        }

        .mc-btn--secondary {
            background: linear-gradient(135deg, #06B6D4, #0891B2);
            color: white;
            border: none;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
        }

        .mc-btn--neon {
            background: transparent;
            color: #8B5CF6;
            border: 2px solid #8B5CF6;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(139, 92, 246, 0.1);
        }

        .mc-btn--neon:hover {
            background: rgba(139, 92, 246, 0.1);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), inset 0 0 20px rgba(139, 92, 246, 0.2);
        }

        .mc-btn--sm { padding: 8px 16px; font-size: 14px; }
        .mc-btn--md { padding: 12px 24px; font-size: 16px; }
        .mc-btn--lg { padding: 16px 32px; font-size: 18px; }
        .mc-btn--full { width: 100%; }

        /* Pulse animation for CTA buttons */
        .mc-btn--pulse {
            animation: btnPulse 2s infinite;
        }

        @keyframes btnPulse {
            0%, 100% { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); }
            50% { box-shadow: 0 4px 25px rgba(139, 92, 246, 0.7); }
        }
    `;

    document.head.appendChild(style);
}

// Auto-inject styles when module loads
if (typeof document !== 'undefined') {
    injectButtonStyles();
}
