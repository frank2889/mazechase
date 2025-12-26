/**
 * RenderModeToggle Component
 * 
 * Toggle for switching between 2D and 3D rendering modes
 */

import { createSignal, onMount, Show } from 'solid-js';
import { 
    getRenderMode, 
    setRenderMode, 
    can3DBeEnabled,
    getRenderModeName,
    type RenderMode 
} from '../lib/render-mode';

export function RenderModeToggle() {
    const [mode, setMode] = createSignal<RenderMode>('2d');
    const [canUse3D, setCanUse3D] = createSignal(false);
    
    onMount(() => {
        setMode(getRenderMode());
        setCanUse3D(can3DBeEnabled());
    });
    
    const handleToggle = () => {
        const newMode: RenderMode = mode() === '2d' ? '3d' : '2d';
        setRenderMode(newMode);
        setMode(newMode);
    };
    
    return (
        <div class="render-mode-toggle">
            <div class="toggle-container">
                <span 
                    class={`mode-label ${mode() === '2d' ? 'active' : ''}`}
                    onClick={() => { setRenderMode('2d'); setMode('2d'); }}
                >
                    2D
                </span>
                
                <Show when={canUse3D()} fallback={
                    <div class="toggle-switch disabled" title="WebGL niet beschikbaar">
                        <div class="toggle-knob" />
                    </div>
                }>
                    <div 
                        class={`toggle-switch ${mode() === '3d' ? 'enabled' : ''}`}
                        onClick={handleToggle}
                    >
                        <div class="toggle-knob" />
                    </div>
                </Show>
                
                <span 
                    class={`mode-label ${mode() === '3d' ? 'active' : ''} ${!canUse3D() ? 'disabled' : ''}`}
                    onClick={() => { if (canUse3D()) { setRenderMode('3d'); setMode('3d'); } }}
                >
                    3D
                    <Show when={mode() === '3d'}>
                        <span class="beta-badge">BETA</span>
                    </Show>
                </span>
            </div>
            
            <Show when={!canUse3D()}>
                <p class="warning-text">WebGL niet beschikbaar in deze browser</p>
            </Show>
            
            <style>{`
                .render-mode-toggle {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .mode-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .mode-label.active {
                    color: #00ffc7;
                }
                
                .mode-label.disabled {
                    color: rgba(255, 255, 255, 0.3);
                    cursor: not-allowed;
                }
                
                .mode-label:hover:not(.disabled):not(.active) {
                    color: rgba(255, 255, 255, 0.8);
                }
                
                .toggle-switch {
                    width: 48px;
                    height: 26px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 13px;
                    cursor: pointer;
                    position: relative;
                    transition: background 0.3s;
                }
                
                .toggle-switch:hover:not(.disabled) {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .toggle-switch.enabled {
                    background: #00ffc7;
                }
                
                .toggle-switch.disabled {
                    background: rgba(255, 255, 255, 0.1);
                    cursor: not-allowed;
                }
                
                .toggle-knob {
                    width: 22px;
                    height: 22px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.3s;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .toggle-switch.enabled .toggle-knob {
                    transform: translateX(22px);
                }
                
                .toggle-switch.disabled .toggle-knob {
                    background: rgba(255, 255, 255, 0.5);
                }
                
                .beta-badge {
                    font-size: 9px;
                    background: #ff6b00;
                    color: white;
                    padding: 2px 5px;
                    border-radius: 4px;
                    font-weight: 700;
                }
                
                .warning-text {
                    font-size: 11px;
                    color: #ff6b6b;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
