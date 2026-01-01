import { Component, Show, createSignal, onMount, onCleanup } from 'solid-js';
import type { Rarity } from '../lib/shop/types';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (currency: 'coins' | 'gems') => void;
  item: {
    id: string;
    name: string;
    preview: string;
    rarity: Rarity;
    priceCoins: number;
    priceGems: number;
    description: string;
  } | null;
  canAffordCoins: boolean;
  canAffordGems: boolean;
  isProcessing: boolean;
  result?: { success: boolean; message: string } | null;
}

const rarityColors: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
  mythic: '#ef4444',
};

const rarityGradients: Record<Rarity, string> = {
  common: 'linear-gradient(135deg, #6b7280, #4b5563)',
  rare: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  epic: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  legendary: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  mythic: 'linear-gradient(135deg, #ef4444, #dc2626)',
};

const PurchaseModal: Component<PurchaseModalProps> = (props) => {
  const [animating, setAnimating] = createSignal(false);
  const [showConfetti, setShowConfetti] = createSignal(false);
  
  // Handle escape key
  onMount(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen && !props.isProcessing) {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    onCleanup(() => window.removeEventListener('keydown', handleEscape));
  });
  
  // Show confetti on success
  const handleConfirm = (currency: 'coins' | 'gems') => {
    setAnimating(true);
    props.onConfirm(currency);
  };
  
  // Watch for success result
  const showSuccess = () => props.result?.success;
  
  if (showSuccess()) {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }
  
  return (
    <Show when={props.isOpen && props.item}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
          'backdrop-filter': 'blur(5px)',
          animation: 'fade-in 0.2s ease-out',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !props.isProcessing) {
            props.onClose();
          }
        }}
      >
        {/* Confetti effect */}
        <Show when={showConfetti()}>
          <div style={{
            position: 'fixed',
            inset: 0,
            'pointer-events': 'none',
            overflow: 'hidden',
          }}>
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  width: '10px',
                  height: '10px',
                  background: ['#ff0', '#f0f', '#0ff', '#0f0', '#f00'][i % 5],
                  animation: `confetti-fall ${2 + Math.random() * 2}s ease-out forwards`,
                  'animation-delay': `${Math.random() * 0.5}s`,
                  'border-radius': '50%',
                }}
              />
            ))}
          </div>
        </Show>
        
        <div
          style={{
            background: 'linear-gradient(180deg, #1e1e30, #0d0d1a)',
            'border-radius': '24px',
            padding: '0',
            width: '90%',
            'max-width': '400px',
            overflow: 'hidden',
            border: `2px solid ${props.item ? rarityColors[props.item.rarity] : '#fff'}`,
            animation: 'modal-pop 0.3s ease-out',
            'box-shadow': `0 25px 50px -12px ${props.item ? rarityColors[props.item.rarity] : '#000'}40`,
          }}
        >
          {/* Header with rarity gradient */}
          <div
            style={{
              background: props.item ? rarityGradients[props.item.rarity] : '#333',
              padding: '20px',
              'text-align': 'center',
            }}
          >
            <span style={{
              'font-size': '0.75rem',
              'text-transform': 'uppercase',
              'letter-spacing': '2px',
              opacity: 0.9,
            }}>
              {props.item?.rarity}
            </span>
          </div>
          
          {/* Item Preview */}
          <div style={{
            'text-align': 'center',
            padding: '30px 20px',
          }}>
            <div style={{
              'font-size': '6rem',
              'margin-bottom': '20px',
              animation: showSuccess() ? 'bounce 0.5s ease' : 'none',
            }}>
              {props.item?.preview}
            </div>
            
            <h2 style={{
              margin: '0 0 8px',
              'font-size': '1.5rem',
              color: '#fff',
            }}>
              {props.item?.name}
            </h2>
            
            <p style={{
              margin: '0',
              color: 'rgba(255,255,255,0.6)',
              'font-size': '0.9rem',
            }}>
              {props.item?.description}
            </p>
          </div>
          
          {/* Result message */}
          <Show when={props.result}>
            <div style={{
              padding: '15px 20px',
              margin: '0 20px 20px',
              'border-radius': '12px',
              background: props.result?.success 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${props.result?.success ? '#22c55e' : '#ef4444'}`,
              'text-align': 'center',
            }}>
              <span style={{ 'font-size': '1.5rem', 'margin-right': '10px' }}>
                {props.result?.success ? '✅' : '❌'}
              </span>
              {props.result?.message}
            </div>
          </Show>
          
          {/* Purchase buttons */}
          <Show when={!props.result}>
            <div style={{
              padding: '0 20px 20px',
              display: 'flex',
              gap: '12px',
            }}>
              {/* Coins button */}
              <button
                style={{
                  flex: 1,
                  padding: '15px',
                  border: 'none',
                  'border-radius': '12px',
                  cursor: props.canAffordCoins && !props.isProcessing ? 'pointer' : 'not-allowed',
                  background: props.canAffordCoins 
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' 
                    : 'rgba(255,255,255,0.1)',
                  color: props.canAffordCoins ? '#000' : 'rgba(255,255,255,0.4)',
                  'font-weight': 'bold',
                  'font-size': '1rem',
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'center',
                  gap: '5px',
                  transition: 'transform 0.2s, opacity 0.2s',
                  opacity: props.isProcessing ? 0.6 : 1,
                }}
                onClick={() => props.canAffordCoins && !props.isProcessing && handleConfirm('coins')}
                disabled={!props.canAffordCoins || props.isProcessing}
              >
                <span style={{ 'font-size': '1.5rem' }}>🪙</span>
                <span>{props.item?.priceCoins.toLocaleString()}</span>
              </button>
              
              {/* Gems button */}
              <button
                style={{
                  flex: 1,
                  padding: '15px',
                  border: 'none',
                  'border-radius': '12px',
                  cursor: props.canAffordGems && !props.isProcessing ? 'pointer' : 'not-allowed',
                  background: props.canAffordGems 
                    ? 'linear-gradient(135deg, #a855f7, #7c3aed)' 
                    : 'rgba(255,255,255,0.1)',
                  color: props.canAffordGems ? '#fff' : 'rgba(255,255,255,0.4)',
                  'font-weight': 'bold',
                  'font-size': '1rem',
                  display: 'flex',
                  'flex-direction': 'column',
                  'align-items': 'center',
                  gap: '5px',
                  transition: 'transform 0.2s, opacity 0.2s',
                  opacity: props.isProcessing ? 0.6 : 1,
                }}
                onClick={() => props.canAffordGems && !props.isProcessing && handleConfirm('gems')}
                disabled={!props.canAffordGems || props.isProcessing}
              >
                <span style={{ 'font-size': '1.5rem' }}>💎</span>
                <span>{props.item?.priceGems.toLocaleString()}</span>
              </button>
            </div>
          </Show>
          
          {/* Close/Back button */}
          <div style={{ padding: '0 20px 20px' }}>
            <button
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                'border-radius': '12px',
                background: 'transparent',
                color: '#fff',
                'font-size': '0.9rem',
                cursor: props.isProcessing ? 'not-allowed' : 'pointer',
                opacity: props.isProcessing ? 0.6 : 1,
              }}
              onClick={() => !props.isProcessing && props.onClose()}
              disabled={props.isProcessing}
            >
              {props.result ? 'Close' : 'Cancel'}
            </button>
          </div>
          
          {/* Processing indicator */}
          <Show when={props.isProcessing}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.3)',
                'border-top-color': '#fff',
                'border-radius': '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          </Show>
        </div>
        
        {/* Animations */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modal-pop {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </Show>
  );
};

export default PurchaseModal;
