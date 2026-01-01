/**
 * AccessibilitySettings - Settings panel for accessibility options
 * 
 * Features:
 * - Senior Mode (larger text, slower animations, high contrast)
 * - Relaxed Mode (slower game speed)
 * - Color blind friendly options
 * - Screen reader support
 */

import { createSignal, onMount, Show } from 'solid-js';

interface AccessibilitySettingsProps {
    onClose?: () => void;
    isOpen?: boolean;
}

// Persist settings in localStorage
const SETTINGS_KEY = 'mazechase_accessibility';

interface AccessibilityState {
    seniorMode: boolean;
    relaxedMode: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
}

const defaultSettings: AccessibilityState = {
    seniorMode: false,
    relaxedMode: false,
    highContrast: false,
    reducedMotion: false,
    largeText: false
};

function loadSettings(): AccessibilityState {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load accessibility settings:', e);
    }
    return defaultSettings;
}

function saveSettings(settings: AccessibilityState) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save accessibility settings:', e);
    }
}

function applySettings(settings: AccessibilityState) {
    const html = document.documentElement;
    
    html.setAttribute('data-senior-mode', settings.seniorMode.toString());
    html.setAttribute('data-relaxed-mode', settings.relaxedMode.toString());
    html.setAttribute('data-high-contrast', settings.highContrast.toString());
    html.setAttribute('data-reduced-motion', settings.reducedMotion.toString());
    html.setAttribute('data-large-text', settings.largeText.toString());
    
    // Also set class for CSS targeting
    html.classList.toggle('senior-mode', settings.seniorMode);
    html.classList.toggle('relaxed-mode', settings.relaxedMode);
    html.classList.toggle('high-contrast', settings.highContrast);
    html.classList.toggle('reduced-motion', settings.reducedMotion);
    html.classList.toggle('large-text', settings.largeText);
}

// Export function to initialize settings on page load
export function initAccessibilitySettings() {
    const settings = loadSettings();
    applySettings(settings);
}

// Export function to get game speed multiplier
export function getGameSpeedMultiplier(): number {
    const settings = loadSettings();
    if (settings.relaxedMode) return 0.7; // 30% slower
    return 1.0;
}

// Export function to check if senior mode is enabled
export function isSeniorMode(): boolean {
    return loadSettings().seniorMode;
}

export default function AccessibilitySettings(props: AccessibilitySettingsProps) {
    const [settings, setSettings] = createSignal<AccessibilityState>(defaultSettings);
    const [isOpen, setIsOpen] = createSignal(props.isOpen ?? false);
    
    onMount(() => {
        setSettings(loadSettings());
    });
    
    const updateSetting = (key: keyof AccessibilityState, value: boolean) => {
        const newSettings = { ...settings(), [key]: value };
        
        // Senior mode enables all other options
        if (key === 'seniorMode' && value) {
            newSettings.largeText = true;
            newSettings.relaxedMode = true;
        }
        
        setSettings(newSettings);
        saveSettings(newSettings);
        applySettings(newSettings);
    };
    
    const ToggleSwitch = (p: { checked: boolean; onChange: (v: boolean) => void; id: string }) => (
        <label class="toggle-switch" for={p.id}>
            <input
                type="checkbox"
                id={p.id}
                checked={p.checked}
                onChange={(e) => p.onChange(e.target.checked)}
            />
            <span class="toggle-slider"></span>
        </label>
    );
    
    return (
        <>
            {/* Settings Button */}
            <button 
                class="accessibility-btn"
                onClick={() => setIsOpen(!isOpen())}
                title="Accessibility Settings"
                aria-label="Open accessibility settings"
            >
                ⚙️
            </button>
            
            {/* Settings Panel */}
            <Show when={isOpen()}>
                <div class="accessibility-overlay" onClick={() => setIsOpen(false)}>
                    <div class="accessibility-panel" onClick={(e) => e.stopPropagation()}>
                        <div class="panel-header">
                            <h2>♿ Toegankelijkheid</h2>
                            <button class="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                        </div>
                        
                        <div class="settings-list">
                            {/* Senior Mode - All-in-one */}
                            <div class="setting-item senior-mode-setting">
                                <div class="setting-info">
                                    <span class="setting-icon">👵</span>
                                    <div class="setting-text">
                                        <span class="setting-label">Senior Modus</span>
                                        <span class="setting-desc">
                                            Extra grote tekst, tragere animaties, hogere contrasten
                                        </span>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    id="senior-mode"
                                    checked={settings().seniorMode} 
                                    onChange={(v) => updateSetting('seniorMode', v)}
                                />
                            </div>
                            
                            {/* Relaxed Mode */}
                            <div class="setting-item">
                                <div class="setting-info">
                                    <span class="setting-icon">🐢</span>
                                    <div class="setting-text">
                                        <span class="setting-label">Relaxte Modus</span>
                                        <span class="setting-desc">
                                            Trager speeltempo voor rustigere ervaring
                                        </span>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    id="relaxed-mode"
                                    checked={settings().relaxedMode} 
                                    onChange={(v) => updateSetting('relaxedMode', v)}
                                />
                            </div>
                            
                            {/* Large Text */}
                            <div class="setting-item">
                                <div class="setting-info">
                                    <span class="setting-icon">🔤</span>
                                    <div class="setting-text">
                                        <span class="setting-label">Grote Tekst</span>
                                        <span class="setting-desc">
                                            Vergroot alle tekst voor betere leesbaarheid
                                        </span>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    id="large-text"
                                    checked={settings().largeText} 
                                    onChange={(v) => updateSetting('largeText', v)}
                                />
                            </div>
                            
                            {/* High Contrast */}
                            <div class="setting-item">
                                <div class="setting-info">
                                    <span class="setting-icon">🌓</span>
                                    <div class="setting-text">
                                        <span class="setting-label">Hoog Contrast</span>
                                        <span class="setting-desc">
                                            Verbeterde kleuren voor beter zicht
                                        </span>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    id="high-contrast"
                                    checked={settings().highContrast} 
                                    onChange={(v) => updateSetting('highContrast', v)}
                                />
                            </div>
                            
                            {/* Reduced Motion */}
                            <div class="setting-item">
                                <div class="setting-info">
                                    <span class="setting-icon">⏸️</span>
                                    <div class="setting-text">
                                        <span class="setting-label">Minder Beweging</span>
                                        <span class="setting-desc">
                                            Verminder animaties en bewegende effecten
                                        </span>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    id="reduced-motion"
                                    checked={settings().reducedMotion} 
                                    onChange={(v) => updateSetting('reducedMotion', v)}
                                />
                            </div>
                        </div>
                        
                        <div class="panel-footer">
                            <p class="footer-text">
                                Instellingen worden automatisch opgeslagen
                            </p>
                        </div>
                    </div>
                </div>
            </Show>
            
            <style>{`
                .accessibility-btn {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(34, 211, 238, 0.9);
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    z-index: 999;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .accessibility-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                }
                
                .accessibility-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .accessibility-panel {
                    background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
                    border-radius: 20px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .panel-header h2 {
                    margin: 0;
                    font-size: 28px;
                    color: white;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 8px;
                    min-width: auto;
                    min-height: auto;
                }
                
                .settings-list {
                    padding: 16px 24px;
                }
                
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 16px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    margin-bottom: 12px;
                }
                
                .setting-item.senior-mode-setting {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(34, 211, 238, 0.1));
                    border: 1px solid rgba(139, 92, 246, 0.3);
                }
                
                .setting-info {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex: 1;
                }
                
                .setting-icon {
                    font-size: 32px;
                }
                
                .setting-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .setting-label {
                    font-size: 18px;
                    font-weight: 600;
                    color: white;
                }
                
                .setting-desc {
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                }
                
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 60px;
                    height: 34px;
                    flex-shrink: 0;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: #3D3D5C;
                    transition: 0.3s;
                    border-radius: 34px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 26px;
                    width: 26px;
                    left: 4px;
                    bottom: 4px;
                    background: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                
                .toggle-switch input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #22D3EE, #8B5CF6);
                }
                
                .toggle-switch input:checked + .toggle-slider:before {
                    transform: translateX(26px);
                }
                
                .panel-footer {
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    text-align: center;
                }
                
                .footer-text {
                    font-size: 14px;
                    color: rgba(255,255,255,0.5);
                    margin: 0;
                }
                
                @media (max-width: 600px) {
                    .accessibility-panel {
                        max-height: 100vh;
                        border-radius: 0;
                    }
                    
                    .setting-item {
                        padding: 16px 12px;
                    }
                    
                    .setting-icon {
                        font-size: 28px;
                    }
                    
                    .setting-label {
                        font-size: 16px;
                    }
                }
            `}</style>
        </>
    );
}
