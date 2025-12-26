// Chat system component for multiplayer Pacman
import { createSignal, For, onMount, onCleanup, Show } from 'solid-js';

export interface ChatMessageData {
    playerId: string;
    username: string;
    message: string;
    timestamp: number;
}

interface ChatProps {
    onSendMessage: (message: string) => void;
    messages: ChatMessageData[];
    currentUsername: string;
    maxMessages?: number;
}

export function ChatBox(props: ChatProps) {
    const [inputValue, setInputValue] = createSignal('');
    const [isExpanded, setIsExpanded] = createSignal(false);
    const [unreadCount, setUnreadCount] = createSignal(0);
    let messagesContainer: HTMLDivElement | undefined;
    let inputRef: HTMLInputElement | undefined;

    const maxMessages = props.maxMessages ?? 50;

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    };

    // Handle new messages
    onMount(() => {
        scrollToBottom();
    });

    const handleSend = () => {
        const message = inputValue().trim();
        if (message.length === 0) return;
        if (message.length > 200) {
            alert('Message too long (max 200 characters)');
            return;
        }

        props.onSendMessage(message);
        setInputValue('');
        inputRef?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // Prevent game controls from triggering while typing
        e.stopPropagation();
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded());
        if (isExpanded()) {
            setUnreadCount(0);
            setTimeout(scrollToBottom, 100);
        }
    };

    return (
        <div class={`chat-container ${isExpanded() ? 'expanded' : 'collapsed'}`}>
            {/* Header */}
            <div class="chat-header" onClick={toggleExpand}>
                <span class="chat-title">💬 Chat</span>
                <Show when={!isExpanded() && unreadCount() > 0}>
                    <span class="unread-badge">{unreadCount()}</span>
                </Show>
                <span class="expand-icon">{isExpanded() ? '▼' : '▲'}</span>
            </div>

            {/* Messages */}
            <Show when={isExpanded()}>
                <div class="chat-messages" ref={messagesContainer}>
                    <For each={props.messages.slice(-maxMessages)}>
                        {(msg) => (
                            <div class={`chat-message ${msg.username === props.currentUsername ? 'own-message' : ''}`}>
                                <span class="message-time">{formatTime(msg.timestamp)}</span>
                                <span class="message-username">{msg.username}:</span>
                                <span class="message-text">{msg.message}</span>
                            </div>
                        )}
                    </For>
                </div>

                {/* Input */}
                <div class="chat-input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        class="chat-input"
                        placeholder="Type a message..."
                        value={inputValue()}
                        onInput={(e) => setInputValue(e.currentTarget.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={200}
                    />
                    <button class="chat-send-btn" onClick={handleSend}>
                        Send
                    </button>
                </div>
            </Show>

            <style>{`
                .chat-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 320px;
                    background: rgba(0, 0, 0, 0.85);
                    border-radius: 12px;
                    border: 1px solid #333;
                    font-family: 'Arial', sans-serif;
                    z-index: 1000;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .chat-container.collapsed {
                    height: 44px;
                    overflow: hidden;
                }

                .chat-container.expanded {
                    height: 400px;
                }

                .chat-header {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 12px 12px 0 0;
                    cursor: pointer;
                    user-select: none;
                }

                .chat-title {
                    flex: 1;
                    color: #fff;
                    font-weight: 600;
                    font-size: 14px;
                }

                .unread-badge {
                    background: #ff4444;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                    margin-right: 8px;
                }

                .expand-icon {
                    color: #888;
                    font-size: 12px;
                }

                .chat-messages {
                    height: 280px;
                    overflow-y: auto;
                    padding: 12px;
                    scrollbar-width: thin;
                    scrollbar-color: #444 transparent;
                }

                .chat-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .chat-messages::-webkit-scrollbar-track {
                    background: transparent;
                }

                .chat-messages::-webkit-scrollbar-thumb {
                    background: #444;
                    border-radius: 3px;
                }

                .chat-message {
                    margin-bottom: 8px;
                    padding: 8px 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .chat-message.own-message {
                    background: rgba(0, 200, 150, 0.15);
                    border-left: 3px solid #00c896;
                }

                .message-time {
                    color: #666;
                    font-size: 10px;
                    margin-right: 8px;
                }

                .message-username {
                    color: #00c896;
                    font-weight: 600;
                    margin-right: 6px;
                }

                .message-text {
                    color: #ddd;
                    word-break: break-word;
                }

                .chat-input-container {
                    display: flex;
                    padding: 12px;
                    border-top: 1px solid #333;
                    gap: 8px;
                }

                .chat-input {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 10px 12px;
                    color: #fff;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .chat-input:focus {
                    border-color: #00c896;
                }

                .chat-input::placeholder {
                    color: #666;
                }

                .chat-send-btn {
                    background: linear-gradient(135deg, #00c896 0%, #00a67d 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 16px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: transform 0.1s, box-shadow 0.2s;
                }

                .chat-send-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 200, 150, 0.3);
                }

                .chat-send-btn:active {
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .chat-container {
                        width: calc(100% - 40px);
                        right: 20px;
                        left: 20px;
                    }

                    .chat-container.expanded {
                        height: 300px;
                    }

                    .chat-messages {
                        height: 180px;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Quick chat presets for common messages
 */
export const quickChatMessages = [
    { label: 'Hoi', message: 'Hallo!' },
    { label: 'GG', message: 'Goed gespeeld!' },
    { label: 'Nice', message: 'Goeie zet!' },
    { label: 'Ren!', message: 'Rennen!' },
    { label: 'Pas op', message: 'Pas op voor de jagers!' },
    { label: 'Power', message: 'Power up!' },
];

export function QuickChatButtons(props: { onSendMessage: (message: string) => void }) {
    return (
        <div class="quick-chat">
            <For each={quickChatMessages}>
                {(preset) => (
                    <button
                        class="quick-chat-btn"
                        onClick={() => props.onSendMessage(preset.message)}
                        title={preset.message}
                    >
                        {preset.label}
                    </button>
                )}
            </For>

            <style>{`
                .quick-chat {
                    display: flex;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.7);
                    border-radius: 20px;
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    z-index: 999;
                }

                .quick-chat-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .quick-chat-btn:hover {
                    background: rgba(0, 200, 150, 0.3);
                    transform: scale(1.1);
                }

                @media (max-width: 768px) {
                    .quick-chat {
                        bottom: 70px;
                    }
                }
            `}</style>
        </div>
    );
}
