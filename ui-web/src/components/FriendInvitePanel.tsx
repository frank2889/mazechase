/**
 * FriendInvitePanel - Invite friends and track referrals
 */

import { type Component, Show, createSignal, onMount, For, createMemo } from 'solid-js';
import { 
    getReferralCode, 
    getReferralStats, 
    getReferralRewards,
    claimReferralReward,
    getInviteLink,
    shareInvite,
    type ReferralReward
} from '../lib/game/friendInvite';

interface FriendInvitePanelProps {
    onClose?: () => void;
    compact?: boolean;
}

const FriendInvitePanel: Component<FriendInvitePanelProps> = (props) => {
    const [code, setCode] = createSignal('');
    const [stats, setStats] = createSignal({ totalInvites: 0, successfulInvites: 0, pendingInvites: 0, coinsEarned: 0, code: '' });
    const [rewards, setRewards] = createSignal<ReferralReward[]>([]);
    const [copied, setCopied] = createSignal(false);
    const [justClaimed, setJustClaimed] = createSignal<number | null>(null);
    
    onMount(() => {
        const referralData = getReferralCode();
        setCode(referralData.code);
        setStats(getReferralStats());
        setRewards(getReferralRewards());
    });
    
    const inviteLink = createMemo(() => getInviteLink());
    
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };
    
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    };
    
    const handleShare = async (platform: 'whatsapp' | 'telegram' | 'copy' | 'native') => {
        const success = await shareInvite(platform);
        if (platform === 'copy' && success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const handleClaim = (milestone: number) => {
        const result = claimReferralReward(milestone);
        if (result.success) {
            setJustClaimed(milestone);
            setRewards(getReferralRewards());
            setStats(getReferralStats());
            setTimeout(() => setJustClaimed(null), 3000);
        }
    };
    
    const nextReward = createMemo(() => {
        const unclaimed = rewards().find(r => !r.claimed && r.milestone > stats().successfulInvites);
        return unclaimed;
    });
    
    return (
        <div class="invite-panel">
            <Show when={props.onClose}>
                <div class="panel-header">
                    <h2>👥 Nodig Vrienden Uit</h2>
                    <button class="close-btn" onClick={props.onClose}>✕</button>
                </div>
            </Show>
            
            {/* Referral Code Display */}
            <div class="code-section">
                <div class="code-label">Jouw uitnodigingscode</div>
                <div class="code-display">
                    <span class="code-text">{code()}</span>
                    <button class="copy-btn" onClick={handleCopyCode}>
                        {copied() ? '✓' : '📋'}
                    </button>
                </div>
                <p class="code-info">
                    Deel deze code met vrienden. Jullie krijgen allebei <strong>50 coins</strong>! 🎁
                </p>
            </div>
            
            {/* Share Buttons */}
            <div class="share-section">
                <div class="share-label">Deel via</div>
                <div class="share-buttons">
                    <button class="share-btn whatsapp" onClick={() => handleShare('whatsapp')}>
                        💬 WhatsApp
                    </button>
                    <button class="share-btn telegram" onClick={() => handleShare('telegram')}>
                        ✈️ Telegram
                    </button>
                    <button class="share-btn copy" onClick={handleCopyLink}>
                        🔗 {copied() ? 'Gekopieerd!' : 'Kopieer Link'}
                    </button>
                </div>
            </div>
            
            {/* Stats */}
            <div class="stats-section">
                <div class="stat-box">
                    <span class="stat-value">{stats().successfulInvites}</span>
                    <span class="stat-label">Vrienden</span>
                </div>
                <div class="stat-box">
                    <span class="stat-value">{stats().pendingInvites}</span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="stat-box highlight">
                    <span class="stat-value">{stats().coinsEarned}</span>
                    <span class="stat-label">Verdiend 💰</span>
                </div>
            </div>
            
            {/* Next Reward Progress */}
            <Show when={nextReward()}>
                <div class="next-reward">
                    <div class="reward-header">
                        <span>Volgende beloning: {nextReward()!.icon} {nextReward()!.name}</span>
                        <span class="reward-coins">+{nextReward()!.reward} 💰</span>
                    </div>
                    <div class="reward-progress">
                        <div 
                            class="progress-fill"
                            style={`width: ${(stats().successfulInvites / nextReward()!.milestone) * 100}%`}
                        ></div>
                    </div>
                    <div class="reward-text">
                        {stats().successfulInvites} / {nextReward()!.milestone} vrienden
                    </div>
                </div>
            </Show>
            
            {/* Reward Milestones */}
            <div class="rewards-section">
                <h3>🎁 Beloningen</h3>
                <div class="rewards-list">
                    <For each={rewards()}>
                        {(reward) => {
                            const canClaim = !reward.claimed && stats().successfulInvites >= reward.milestone;
                            const isLocked = stats().successfulInvites < reward.milestone;
                            
                            return (
                                <div class={`reward-item ${reward.claimed ? 'claimed' : ''} ${isLocked ? 'locked' : ''}`}>
                                    <div class="reward-icon">{reward.icon}</div>
                                    <div class="reward-info">
                                        <div class="reward-name">{reward.name}</div>
                                        <div class="reward-req">{reward.milestone} vrienden</div>
                                    </div>
                                    <div class="reward-action">
                                        <Show when={reward.claimed}>
                                            <span class="claimed-badge">✓ Geclaimd</span>
                                        </Show>
                                        <Show when={canClaim}>
                                            <button class="claim-btn" onClick={() => handleClaim(reward.milestone)}>
                                                Claim +{reward.reward} 💰
                                            </button>
                                        </Show>
                                        <Show when={isLocked && !reward.claimed}>
                                            <span class="locked-text">🔒 {reward.milestone - stats().successfulInvites} meer</span>
                                        </Show>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </div>
            
            {/* Just Claimed Toast */}
            <Show when={justClaimed() !== null}>
                <div class="claim-toast">
                    🎉 +{rewards().find(r => r.milestone === justClaimed())?.reward} coins verdiend!
                </div>
            </Show>
            
            <style>{`
                .invite-panel {
                    background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
                    border-radius: 20px;
                    padding: 24px;
                    max-width: 500px;
                    width: 100%;
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    position: relative;
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .panel-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: white;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    font-size: 24px;
                    cursor: pointer;
                    min-width: auto;
                    min-height: auto;
                }
                
                .code-section {
                    text-align: center;
                    margin-bottom: 24px;
                }
                
                .code-label {
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                    margin-bottom: 8px;
                }
                
                .code-display {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    background: rgba(0,0,0,0.3);
                    border: 2px dashed rgba(139, 92, 246, 0.5);
                    border-radius: 12px;
                    padding: 16px 24px;
                    margin-bottom: 12px;
                }
                
                .code-text {
                    font-size: 28px;
                    font-weight: 700;
                    font-family: monospace;
                    color: #22D3EE;
                    letter-spacing: 0.1em;
                }
                
                .copy-btn {
                    background: rgba(139, 92, 246, 0.2);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: auto;
                    min-height: auto;
                }
                
                .copy-btn:hover {
                    background: rgba(139, 92, 246, 0.4);
                }
                
                .code-info {
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                    margin: 0;
                }
                
                .code-info strong {
                    color: #FCD34D;
                }
                
                .share-section {
                    margin-bottom: 24px;
                }
                
                .share-label {
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                    margin-bottom: 12px;
                }
                
                .share-buttons {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }
                
                .share-btn {
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: auto;
                }
                
                .share-btn.whatsapp {
                    background: linear-gradient(135deg, #25D366, #128C7E);
                    color: white;
                }
                
                .share-btn.telegram {
                    background: linear-gradient(135deg, #0088CC, #0066AA);
                    color: white;
                }
                
                .share-btn.copy {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                .share-btn:hover {
                    transform: translateY(-2px);
                }
                
                .stats-section {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 24px;
                }
                
                .stat-box {
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                }
                
                .stat-box.highlight {
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1));
                    border: 1px solid rgba(251, 191, 36, 0.3);
                }
                
                .stat-value {
                    display: block;
                    font-size: 28px;
                    font-weight: 700;
                    color: white;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                }
                
                .next-reward {
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 24px;
                }
                
                .reward-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    color: white;
                    margin-bottom: 10px;
                }
                
                .reward-coins {
                    color: #FCD34D;
                    font-weight: 600;
                }
                
                .reward-progress {
                    height: 8px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8B5CF6, #22D3EE);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }
                
                .reward-text {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                    text-align: center;
                }
                
                .rewards-section h3 {
                    font-size: 18px;
                    color: white;
                    margin: 0 0 16px;
                }
                
                .rewards-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .reward-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    padding: 12px 16px;
                }
                
                .reward-item.claimed {
                    opacity: 0.6;
                }
                
                .reward-item.locked {
                    opacity: 0.4;
                }
                
                .reward-icon {
                    font-size: 24px;
                }
                
                .reward-info {
                    flex: 1;
                }
                
                .reward-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: white;
                }
                
                .reward-req {
                    font-size: 12px;
                    color: rgba(255,255,255,0.5);
                }
                
                .claimed-badge {
                    font-size: 12px;
                    color: #10B981;
                }
                
                .claim-btn {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #10B981, #059669);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    min-height: auto;
                    animation: pulse-claim 2s infinite;
                }
                
                @keyframes pulse-claim {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 15px 5px rgba(16, 185, 129, 0.4); }
                }
                
                .locked-text {
                    font-size: 12px;
                    color: rgba(255,255,255,0.4);
                }
                
                .claim-toast {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #10B981, #059669);
                    color: white;
                    padding: 16px 32px;
                    border-radius: 16px;
                    font-size: 18px;
                    font-weight: 600;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    animation: toast-in 0.3s ease;
                    z-index: 1000;
                }
                
                @keyframes toast-in {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default FriendInvitePanel;
