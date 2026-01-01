import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { getActiveOffers, formatTimeRemaining, type SpecialOffer } from '../lib/shop/pricing';

interface SpecialOffersProps {
  onPurchase: (offerId: string) => void;
  purchasedOffers?: string[];
  isNewPlayer?: boolean;
  isReturningPlayer?: boolean;
  playerLevel?: number;
}

/**
 * Special Offers display component
 * Shows time-limited and targeted offers
 */
const SpecialOffers: Component<SpecialOffersProps> = (props) => {
  const [selectedOffer, setSelectedOffer] = createSignal<SpecialOffer | null>(null);
  
  const activeOffers = createMemo(() => {
    return getActiveOffers({
      isNewPlayer: props.isNewPlayer ?? false,
      isReturningPlayer: props.isReturningPlayer ?? false,
      level: props.playerLevel ?? 1,
      purchasedOffers: props.purchasedOffers ?? [],
    });
  });
  
  const formatPrice = (cents: number): string => {
    return `€${(cents / 100).toFixed(2)}`;
  };
  
  const styles = {
    container: {
      padding: '20px',
    },
    title: {
      'font-size': '1.8rem',
      'font-weight': 'bold',
      'margin-bottom': '20px',
      background: 'linear-gradient(90deg, #ffd700, #ff6b6b)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent',
      display: 'flex',
      'align-items': 'center',
      gap: '10px',
    },
    grid: {
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
    },
    card: {
      background: 'rgba(0,0,0,0.5)',
      'border-radius': '16px',
      overflow: 'hidden',
      border: '2px solid',
      transition: 'all 0.3s',
      cursor: 'pointer',
    },
    cardHeader: {
      padding: '15px 20px',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      padding: '4px 10px',
      'border-radius': '12px',
      'font-size': '11px',
      'font-weight': 'bold',
      background: 'rgba(0,0,0,0.5)',
    },
    offerName: {
      'font-size': '1.3rem',
      'font-weight': 'bold',
      color: '#fff',
      margin: 0,
    },
    offerDesc: {
      'font-size': '0.85rem',
      color: 'rgba(255,255,255,0.7)',
      'margin-top': '5px',
    },
    timer: {
      display: 'flex',
      'align-items': 'center',
      gap: '5px',
      'margin-top': '10px',
      'font-size': '0.9rem',
      color: '#ef4444',
    },
    contents: {
      padding: '0 20px 15px',
      display: 'flex',
      'flex-wrap': 'wrap',
      gap: '8px',
    },
    contentItem: {
      background: 'rgba(255,255,255,0.1)',
      padding: '6px 12px',
      'border-radius': '20px',
      'font-size': '0.85rem',
      display: 'flex',
      'align-items': 'center',
      gap: '5px',
    },
    footer: {
      padding: '15px 20px',
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
    },
    priceSection: {
      display: 'flex',
      'flex-direction': 'column',
    },
    originalPrice: {
      'font-size': '0.9rem',
      color: 'rgba(255,255,255,0.5)',
      'text-decoration': 'line-through',
    },
    discountedPrice: {
      'font-size': '1.4rem',
      'font-weight': 'bold',
      color: '#22c55e',
    },
    discountBadge: {
      background: '#ef4444',
      color: '#fff',
      padding: '4px 10px',
      'border-radius': '8px',
      'font-size': '0.8rem',
      'font-weight': 'bold',
      'margin-left': '10px',
    },
    buyButton: {
      padding: '12px 30px',
      'border-radius': '25px',
      border: 'none',
      'font-weight': 'bold',
      'font-size': '1rem',
      cursor: 'pointer',
      transition: 'transform 0.2s',
    },
    emptyState: {
      'text-align': 'center',
      padding: '40px',
      color: 'rgba(255,255,255,0.5)',
    },
  };
  
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        <span>🎁</span> Special Offers
      </h2>
      
      <Show
        when={activeOffers().length > 0}
        fallback={
          <div style={styles.emptyState}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '15px' }}>🎉</div>
            <p>No special offers available right now.</p>
            <p style={{ 'font-size': '0.9rem' }}>Check back later for exclusive deals!</p>
          </div>
        }
      >
        <div style={styles.grid}>
          <For each={activeOffers()}>
            {(offer) => (
              <div
                style={{
                  ...styles.card,
                  'border-color': offer.glowColor,
                  'box-shadow': `0 4px 20px ${offer.glowColor}30`,
                }}
                onClick={() => setSelectedOffer(offer)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 8px 30px ${offer.glowColor}50`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 20px ${offer.glowColor}30`;
                }}
              >
                {/* Header */}
                <div
                  style={{
                    ...styles.cardHeader,
                    background: `linear-gradient(135deg, ${offer.glowColor}40, ${offer.glowColor}10)`,
                  }}
                >
                  <span style={styles.badge}>{offer.badge}</span>
                  <h3 style={styles.offerName}>{offer.name}</h3>
                  <p style={styles.offerDesc}>{offer.description}</p>
                  
                  <Show when={offer.isLimited && offer.endsAt}>
                    <div style={styles.timer}>
                      <span>⏰</span>
                      <span>Ends in {formatTimeRemaining(offer.endsAt!)}</span>
                    </div>
                  </Show>
                </div>
                
                {/* Contents */}
                <div style={styles.contents}>
                  <For each={offer.contents}>
                    {(item) => (
                      <div style={styles.contentItem}>
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                        <Show when={item.amount}>
                          <span style={{ color: '#fbbf24' }}>x{item.amount}</span>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
                
                {/* Footer */}
                <div style={styles.footer}>
                  <div style={styles.priceSection}>
                    <span style={styles.originalPrice}>{formatPrice(offer.originalPrice)}</span>
                    <div style={{ display: 'flex', 'align-items': 'center' }}>
                      <span style={styles.discountedPrice}>{formatPrice(offer.discountedPrice)}</span>
                      <span style={styles.discountBadge}>-{offer.discountPercent}%</span>
                    </div>
                  </div>
                  
                  <button
                    style={{
                      ...styles.buyButton,
                      background: `linear-gradient(135deg, ${offer.glowColor}, ${offer.glowColor}cc)`,
                      color: offer.glowColor === '#ffd700' || offer.glowColor === '#22c55e' ? '#000' : '#fff',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onPurchase(offer.id);
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    Buy Now
                  </button>
                </div>
                
                {/* One-time indicator */}
                <Show when={offer.isOneTime}>
                  <div style={{
                    'text-align': 'center',
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    'font-size': '0.75rem',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    ⚡ One-time purchase only
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
      
      {/* Detail Modal */}
      <Show when={selectedOffer()}>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
          }}
          onClick={() => setSelectedOffer(null)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #1a1a2e, #0a0a15)',
              'border-radius': '20px',
              padding: '30px',
              'max-width': '500px',
              width: '90%',
              border: `2px solid ${selectedOffer()!.glowColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 10px', color: selectedOffer()!.glowColor }}>
              {selectedOffer()!.name}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', 'margin-bottom': '20px' }}>
              {selectedOffer()!.description}
            </p>
            
            <h4 style={{ margin: '0 0 10px' }}>Includes:</h4>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px', 'margin-bottom': '20px' }}>
              <For each={selectedOffer()!.contents}>
                {(item) => (
                  <div style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '10px 15px',
                    'border-radius': '10px',
                  }}>
                    <span style={{ 'font-size': '1.5rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                    <Show when={item.amount}>
                      <span style={{ color: '#fbbf24', 'margin-left': 'auto' }}>x{item.amount}</span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
            
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
              <div>
                <span style={{ 'text-decoration': 'line-through', color: 'rgba(255,255,255,0.5)' }}>
                  {formatPrice(selectedOffer()!.originalPrice)}
                </span>
                <span style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#22c55e', 'margin-left': '10px' }}>
                  {formatPrice(selectedOffer()!.discountedPrice)}
                </span>
              </div>
              
              <button
                style={{
                  padding: '15px 40px',
                  'border-radius': '25px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${selectedOffer()!.glowColor}, ${selectedOffer()!.glowColor}cc)`,
                  color: '#000',
                  'font-weight': 'bold',
                  'font-size': '1.1rem',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  props.onPurchase(selectedOffer()!.id);
                  setSelectedOffer(null);
                }}
              >
                Purchase
              </button>
            </div>
            
            <button
              style={{
                'margin-top': '15px',
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                'border-radius': '10px',
                color: '#fff',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedOffer(null)}
            >
              Close
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default SpecialOffers;
