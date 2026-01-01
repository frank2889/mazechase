/**
 * ConnectionStatus - Real-time WebSocket connection feedback
 * 
 * AI Tester Suggestion (Alex - QA Automation):
 * "WebSocket reconnect attempts need clear user feedback.
 * Players should know when they're disconnected and see reconnection progress."
 * 
 * Features:
 * - Connection state indicator (connected/connecting/disconnected)
 * - Reconnection progress with attempt count
 * - Latency display
 * - Auto-hide when connected
 */

import { type Component, Show, createSignal, onMount, onCleanup } from 'solid-js';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';

interface ConnectionStatusProps {
    /** Current connection state */
    state: ConnectionState;
    /** Current latency in ms */
    latency?: number;
    /** Current reconnection attempt number */
    reconnectAttempt?: number;
    /** Maximum reconnection attempts */
    maxAttempts?: number;
    /** Whether to show even when connected */
    alwaysShow?: boolean;
    /** Position on screen */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const ConnectionStatus: Component<ConnectionStatusProps> = (props) => {
    const [showDetails, setShowDetails] = createSignal(false);
    const [recentlyConnected, setRecentlyConnected] = createSignal(false);
    let hideTimeout: number | null = null;

    // Show "Connected" briefly when reconnecting succeeds
    onMount(() => {
        // Mark as recently connected for animation
        if (props.state === 'connected') {
            setRecentlyConnected(true);
            hideTimeout = window.setTimeout(() => setRecentlyConnected(false), 3000);
        }
    });

    onCleanup(() => {
        if (hideTimeout) clearTimeout(hideTimeout);
    });

    const getStateConfig = () => {
        switch (props.state) {
            case 'connected':
                return {
                    color: 'bg-green-500',
                    borderColor: 'border-green-400',
                    textColor: 'text-green-400',
                    icon: '●',
                    label: 'Connected',
                    pulse: false,
                    showLatency: true
                };
            case 'connecting':
                return {
                    color: 'bg-yellow-500',
                    borderColor: 'border-yellow-400',
                    textColor: 'text-yellow-400',
                    icon: '◐',
                    label: 'Connecting...',
                    pulse: true,
                    showLatency: false
                };
            case 'reconnecting':
                return {
                    color: 'bg-orange-500',
                    borderColor: 'border-orange-400',
                    textColor: 'text-orange-400',
                    icon: '↻',
                    label: `Reconnecting${props.reconnectAttempt ? ` (${props.reconnectAttempt}/${props.maxAttempts || '∞'})` : '...'}`,
                    pulse: true,
                    showLatency: false
                };
            case 'disconnected':
                return {
                    color: 'bg-gray-500',
                    borderColor: 'border-gray-400',
                    textColor: 'text-gray-400',
                    icon: '○',
                    label: 'Disconnected',
                    pulse: false,
                    showLatency: false
                };
            case 'failed':
                return {
                    color: 'bg-red-500',
                    borderColor: 'border-red-400',
                    textColor: 'text-red-400',
                    icon: '✕',
                    label: 'Connection Failed',
                    pulse: false,
                    showLatency: false
                };
            default:
                return {
                    color: 'bg-gray-500',
                    borderColor: 'border-gray-400',
                    textColor: 'text-gray-400',
                    icon: '?',
                    label: 'Unknown',
                    pulse: false,
                    showLatency: false
                };
        }
    };

    const getPositionClasses = () => {
        switch (props.position || 'top-right') {
            case 'top-left': return 'top-4 left-4';
            case 'top-right': return 'top-4 right-4';
            case 'bottom-left': return 'bottom-4 left-4';
            case 'bottom-right': return 'bottom-4 right-4';
            default: return 'top-4 right-4';
        }
    };

    const shouldShow = () => {
        if (props.alwaysShow) return true;
        if (props.state !== 'connected') return true;
        return recentlyConnected();
    };

    const getLatencyColor = () => {
        const latency = props.latency || 0;
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-yellow-400';
        if (latency < 200) return 'text-orange-400';
        return 'text-red-400';
    };

    const formatLatency = () => {
        const latency = props.latency || 0;
        if (latency < 1) return '<1ms';
        return `${Math.round(latency)}ms`;
    };

    const config = () => getStateConfig();

    return (
        <Show when={shouldShow()}>
            <div 
                class={`
                    fixed ${getPositionClasses()} z-50
                    transition-all duration-300 ease-out
                    ${props.state === 'connected' && !props.alwaysShow ? 'opacity-80 scale-95' : 'opacity-100 scale-100'}
                `}
                onMouseEnter={() => setShowDetails(true)}
                onMouseLeave={() => setShowDetails(false)}
            >
                {/* Main indicator */}
                <div 
                    class={`
                        flex items-center gap-2 px-3 py-1.5
                        bg-gray-900/90 backdrop-blur-sm
                        border ${config().borderColor}
                        rounded-full shadow-lg
                        cursor-pointer
                        transition-all duration-200
                        hover:bg-gray-800/90
                    `}
                >
                    {/* Status dot */}
                    <span 
                        class={`
                            w-2 h-2 rounded-full ${config().color}
                            ${config().pulse ? 'animate-pulse' : ''}
                        `}
                    />
                    
                    {/* Label */}
                    <span class={`text-xs font-medium ${config().textColor}`}>
                        {config().label}
                    </span>
                    
                    {/* Latency badge */}
                    <Show when={config().showLatency && props.latency !== undefined}>
                        <span class={`text-xs ${getLatencyColor()} ml-1`}>
                            {formatLatency()}
                        </span>
                    </Show>
                </div>

                {/* Expanded details panel */}
                <Show when={showDetails()}>
                    <div 
                        class={`
                            absolute top-full mt-2 right-0
                            min-w-50 p-3
                            bg-gray-900/95 backdrop-blur-md
                            border border-gray-700
                            rounded-lg shadow-xl
                            animate-in fade-in slide-in-from-top-2
                        `}
                    >
                        <div class="space-y-2 text-xs">
                            {/* Connection status */}
                            <div class="flex justify-between">
                                <span class="text-gray-400">Status</span>
                                <span class={config().textColor}>{config().label}</span>
                            </div>
                            
                            {/* Latency */}
                            <Show when={props.latency !== undefined}>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Latency</span>
                                    <span class={getLatencyColor()}>{formatLatency()}</span>
                                </div>
                            </Show>
                            
                            {/* Reconnect info */}
                            <Show when={props.state === 'reconnecting' && props.reconnectAttempt}>
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Attempt</span>
                                    <span class="text-orange-400">
                                        {props.reconnectAttempt} / {props.maxAttempts || '∞'}
                                    </span>
                                </div>
                                
                                {/* Progress bar */}
                                <div class="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        class="h-full bg-orange-500 transition-all duration-300"
                                        style={{
                                            width: `${(props.reconnectAttempt! / (props.maxAttempts || 10)) * 100}%`
                                        }}
                                    />
                                </div>
                            </Show>

                            {/* Failed state - retry button */}
                            <Show when={props.state === 'failed'}>
                                <button 
                                    class="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                                    onClick={() => {
                                        // Emit retry event
                                        window.dispatchEvent(new CustomEvent('connection:retry'));
                                    }}
                                >
                                    Retry Connection
                                </button>
                            </Show>
                        </div>
                    </div>
                </Show>
            </div>
        </Show>
    );
};

export default ConnectionStatus;

/**
 * Hook to integrate with WebSocketOptimizer
 */
export function createConnectionStatus() {
    const [state, setState] = createSignal<ConnectionState>('disconnected');
    const [latency, setLatency] = createSignal(0);
    const [reconnectAttempt, setReconnectAttempt] = createSignal(0);

    return {
        state,
        latency,
        reconnectAttempt,
        setState,
        setLatency,
        setReconnectAttempt,
        // For WebSocketOptimizer integration
        onStateChange: (newState: ConnectionState) => {
            setState(newState);
            if (newState === 'connected') {
                setReconnectAttempt(0);
            }
        },
        onReconnecting: (attempt: number) => {
            setState('reconnecting');
            setReconnectAttempt(attempt);
        },
        onLatencyUpdate: (ms: number) => {
            setLatency(ms);
        }
    };
}
