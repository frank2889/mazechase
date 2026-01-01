/**
 * Performance Monitor Widget
 * Sprint 4 - Performance
 * 
 * Displays real-time performance metrics:
 * - FPS counter
 * - Latency indicator
 * - Memory usage
 * - Quality level
 */

import { type Component, createSignal, onMount, onCleanup, Show } from 'solid-js';

interface PerformanceMonitorProps {
    show?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    compact?: boolean;
}

interface PerformanceData {
    fps: number;
    latency: number;
    memory: number;
    quality: 'low' | 'medium' | 'high';
    drawCalls: number;
}

const PerformanceMonitor: Component<PerformanceMonitorProps> = (props) => {
    const [data, setData] = createSignal<PerformanceData>({
        fps: 60,
        latency: 0,
        memory: 0,
        quality: 'medium',
        drawCalls: 0
    });
    const [visible, setVisible] = createSignal(props.show ?? false);
    
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrame: number;
    let updateInterval: number;

    const updateFPS = () => {
        frameCount++;
        const now = performance.now();
        const delta = now - lastTime;
        
        if (delta >= 1000) {
            const fps = Math.round(frameCount * 1000 / delta);
            setData(prev => ({ ...prev, fps }));
            frameCount = 0;
            lastTime = now;
        }
        
        animationFrame = requestAnimationFrame(updateFPS);
    };

    const updateMetrics = () => {
        // Memory (if available)
        const memory = (performance as any).memory?.usedJSHeapSize;
        if (memory) {
            setData(prev => ({ ...prev, memory: Math.round(memory / 1024 / 1024) }));
        }
        
        // Get latency from global state if available
        const latencyEl = document.querySelector('[data-latency]');
        if (latencyEl) {
            const latency = parseInt(latencyEl.getAttribute('data-latency') || '0', 10);
            setData(prev => ({ ...prev, latency }));
        }
    };

    onMount(() => {
        animationFrame = requestAnimationFrame(updateFPS);
        updateInterval = setInterval(updateMetrics, 1000);
        
        // Toggle with F3 key
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'F3') {
                e.preventDefault();
                setVisible(v => !v);
            }
        };
        window.addEventListener('keydown', handleKey);
        
        onCleanup(() => {
            cancelAnimationFrame(animationFrame);
            clearInterval(updateInterval);
            window.removeEventListener('keydown', handleKey);
        });
    });

    const getFPSColor = (fps: number) => {
        if (fps >= 55) return 'text-green-400';
        if (fps >= 30) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getLatencyColor = (latency: number) => {
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-yellow-400';
        return 'text-red-400';
    };

    const positionClass = () => {
        switch (props.position) {
            case 'top-left': return 'top-2 left-2';
            case 'top-right': return 'top-2 right-2';
            case 'bottom-left': return 'bottom-2 left-2';
            case 'bottom-right': 
            default: return 'bottom-2 right-2';
        }
    };

    return (
        <Show when={visible()}>
            <div 
                class={`fixed ${positionClass()} z-[1000] pointer-events-none`}
            >
                <Show when={props.compact} fallback={
                    // Full view
                    <div class="bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs font-mono border border-gray-700 min-w-[140px]">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-gray-400">FPS</span>
                            <span class={`font-bold ${getFPSColor(data().fps)}`}>
                                {data().fps}
                            </span>
                        </div>
                        
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-gray-400">Ping</span>
                            <span class={`font-bold ${getLatencyColor(data().latency)}`}>
                                {data().latency}ms
                            </span>
                        </div>
                        
                        <Show when={data().memory > 0}>
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-gray-400">Memory</span>
                                <span class="text-blue-400">
                                    {data().memory}MB
                                </span>
                            </div>
                        </Show>
                        
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400">Quality</span>
                            <span class="text-purple-400 capitalize">
                                {data().quality}
                            </span>
                        </div>
                        
                        <div class="mt-2 pt-2 border-t border-gray-700 text-gray-500 text-center">
                            F3 to toggle
                        </div>
                    </div>
                }>
                    {/* Compact view */}
                    <div class="bg-black/60 rounded px-2 py-1 text-xs font-mono flex gap-3">
                        <span class={getFPSColor(data().fps)}>{data().fps} FPS</span>
                        <span class={getLatencyColor(data().latency)}>{data().latency}ms</span>
                    </div>
                </Show>
            </div>
        </Show>
    );
};

export default PerformanceMonitor;

/**
 * Standalone FPS counter (vanilla JS)
 */
export function createFPSCounter(container?: HTMLElement): () => void {
    const el = document.createElement('div');
    el.id = 'fps-counter';
    el.style.cssText = `
        position: fixed;
        bottom: 8px;
        right: 8px;
        background: rgba(0,0,0,0.7);
        color: #00ff00;
        font-family: monospace;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        z-index: 9999;
        pointer-events: none;
    `;
    
    (container || document.body).appendChild(el);
    
    let frameCount = 0;
    let lastTime = performance.now();
    let running = true;
    
    const update = () => {
        if (!running) return;
        
        frameCount++;
        const now = performance.now();
        
        if (now - lastTime >= 1000) {
            const fps = Math.round(frameCount * 1000 / (now - lastTime));
            el.textContent = `${fps} FPS`;
            el.style.color = fps >= 55 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000';
            frameCount = 0;
            lastTime = now;
        }
        
        requestAnimationFrame(update);
    };
    
    requestAnimationFrame(update);
    
    // Return cleanup function
    return () => {
        running = false;
        el.remove();
    };
}
