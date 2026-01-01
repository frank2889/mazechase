/**
 * ShareButton - Social sharing component
 */

import { type Component, Show, createSignal, For } from 'solid-js';
import { 
    shareToplatform, 
    isNativeShareAvailable, 
    captureGameScreenshot, 
    downloadScreenshot,
    type ShareableContent 
} from '../lib/game/socialSharing';

interface ShareButtonProps {
    content: ShareableContent;
    showScreenshot?: boolean;
    compact?: boolean;
}

const SHARE_PLATFORMS = [
    { id: 'native', icon: '📤', name: 'Delen', show: () => isNativeShareAvailable() },
    { id: 'twitter', icon: '𝕏', name: 'Twitter' },
    { id: 'facebook', icon: '📘', name: 'Facebook' },
    { id: 'whatsapp', icon: '💬', name: 'WhatsApp' },
    { id: 'telegram', icon: '✈️', name: 'Telegram' },
    { id: 'copy', icon: '📋', name: 'Kopieer' },
] as const;

const ShareButton: Component<ShareButtonProps> = (props) => {
    const [isOpen, setIsOpen] = createSignal(false);
    const [copied, setCopied] = createSignal(false);
    const [screenshotUrl, setScreenshotUrl] = createSignal<string | null>(null);
    
    const handleShare = async (platform: string) => {
        const success = await shareToplatform(
            platform as any, 
            props.content
        );
        
        if (platform === 'copy' && success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        
        if (platform === 'native') {
            setIsOpen(false);
        }
    };
    
    const handleScreenshot = async () => {
        const url = await captureGameScreenshot();
        if (url) {
            setScreenshotUrl(url);
        }
    };
    
    const handleDownload = () => {
        const url = screenshotUrl();
        if (url) {
            downloadScreenshot(url);
        }
    };
    
    return (
        <div class="share-container">
            {/* Main Share Button */}
            <button 
                class={`share-btn ${props.compact ? 'compact' : ''}`}
                onClick={() => setIsOpen(!isOpen())}
            >
                <span class="share-icon">🔗</span>
                <Show when={!props.compact}>
                    <span>Delen</span>
                </Show>
            </button>
            
            {/* Share Dropdown */}
            <Show when={isOpen()}>
                <div class="share-dropdown">
                    <div class="dropdown-header">
                        <h4>Deel je resultaat!</h4>
                        <button class="close-btn" onClick={() => setIsOpen(false)}>✕</button>
                    </div>
                    
                    {/* Platform Buttons */}
                    <div class="platform-grid">
                        <For each={SHARE_PLATFORMS.filter(p => !p.show || p.show())}>
                            {(platform) => (
                                <button 
                                    class="platform-btn"
                                    onClick={() => handleShare(platform.id)}
                                >
                                    <span class="platform-icon">{platform.icon}</span>
                                    <span class="platform-name">
                                        {platform.id === 'copy' && copied() ? 'Gekopieerd!' : platform.name}
                                    </span>
                                </button>
                            )}
                        </For>
                    </div>
                    
                    {/* Screenshot Section */}
                    <Show when={props.showScreenshot}>
                        <div class="screenshot-section">
                            <button class="screenshot-btn" onClick={handleScreenshot}>
                                📷 Maak Screenshot
                            </button>
                            
                            <Show when={screenshotUrl()}>
                                <div class="screenshot-preview">
                                    <img src={screenshotUrl()!} alt="Screenshot" />
                                    <button class="download-btn" onClick={handleDownload}>
                                        ⬇️ Download
                                    </button>
                                </div>
                            </Show>
                        </div>
                    </Show>
                    
                    {/* Stats Preview */}
                    <Show when={props.content.stats}>
                        <div class="stats-preview">
                            <For each={Object.entries(props.content.stats!)}>
                                {([key, value]) => (
                                    <div class="stat-item">
                                        <span class="stat-key">{key}</span>
                                        <span class="stat-value">{value}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </div>
            </Show>
            
            <style>{`
                .share-container {
                    position: relative;
                    display: inline-block;
                }
                
                .share-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #8B5CF6, #7C3AED);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: 48px;
                }
                
                .share-btn.compact {
                    padding: 10px;
                    min-width: 48px;
                }
                
                .share-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
                }
                
                .share-icon {
                    font-size: 20px;
                }
                
                .share-dropdown {
                    position: absolute;
                    bottom: calc(100% + 10px);
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
                    border-radius: 16px;
                    padding: 16px;
                    min-width: 280px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    z-index: 1000;
                }
                
                .dropdown-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .dropdown-header h4 {
                    margin: 0;
                    font-size: 18px;
                    color: white;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    min-width: auto;
                    min-height: auto;
                }
                
                .platform-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 16px;
                }
                
                .platform-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 14px 10px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: auto;
                }
                
                .platform-btn:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-2px);
                }
                
                .platform-icon {
                    font-size: 24px;
                }
                
                .platform-name {
                    font-size: 11px;
                    color: rgba(255,255,255,0.7);
                }
                
                .screenshot-section {
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 16px;
                    margin-top: 8px;
                }
                
                .screenshot-btn {
                    width: 100%;
                    padding: 12px;
                    background: rgba(34, 211, 238, 0.1);
                    border: 1px solid rgba(34, 211, 238, 0.3);
                    border-radius: 10px;
                    color: #22D3EE;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .screenshot-btn:hover {
                    background: rgba(34, 211, 238, 0.2);
                }
                
                .screenshot-preview {
                    margin-top: 12px;
                }
                
                .screenshot-preview img {
                    width: 100%;
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                
                .download-btn {
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #10B981, #059669);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                }
                
                .stats-preview {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 16px;
                    margin-top: 8px;
                }
                
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(0,0,0,0.2);
                    border-radius: 8px;
                }
                
                .stat-key {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                }
                
                .stat-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #22D3EE;
                }
            `}</style>
        </div>
    );
};

export default ShareButton;
