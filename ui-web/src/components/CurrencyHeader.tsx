import { Component, Show, createSignal } from 'solid-js';
import { monetizationStore } from '../lib/shop/store';

interface CurrencyHeaderProps {
  onShopClick?: () => void;
  onInventoryClick?: () => void;
  compact?: boolean;
}

/**
 * Currency display header with shop access
 * Shows coins, gems and quick access to shop/inventory
 */
const CurrencyHeader: Component<CurrencyHeaderProps> = (props) => {
  const [showTooltip, setShowTooltip] = createSignal<'coins' | 'gems' | null>(null);
  
  const currency = () => monetizationStore.getCurrency();
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };
  
  const styles = {
    container: {
      display: 'flex',
      'align-items': 'center',
      gap: props.compact ? '10px' : '15px',
      background: 'rgba(0,0,0,0.4)',
      padding: props.compact ? '8px 12px' : '10px 20px',
      'border-radius': '30px',
      border: '1px solid rgba(255,255,255,0.1)',
      'backdrop-filter': 'blur(10px)',
    },
    currencyItem: {
      display: 'flex',
      'align-items': 'center',
      gap: '6px',
      position: 'relative',
      cursor: 'pointer',
    },
    icon: {
      'font-size': props.compact ? '1.2rem' : '1.4rem',
    },
    amount: {
      'font-weight': 'bold',
      'font-size': props.compact ? '0.9rem' : '1rem',
      color: '#fff',
      'min-width': '50px',
    },
    plusButton: {
      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
      border: 'none',
      'border-radius': '50%',
      width: props.compact ? '20px' : '24px',
      height: props.compact ? '20px' : '24px',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      cursor: 'pointer',
      'font-size': props.compact ? '12px' : '14px',
      color: '#fff',
      'font-weight': 'bold',
      transition: 'transform 0.2s',
    },
    divider: {
      width: '1px',
      height: '24px',
      background: 'rgba(255,255,255,0.2)',
    },
    button: {
      background: 'none',
      border: 'none',
      padding: '8px',
      cursor: 'pointer',
      'font-size': props.compact ? '1.2rem' : '1.4rem',
      transition: 'transform 0.2s',
      'border-radius': '8px',
    },
    tooltip: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,0.2)',
      'border-radius': '8px',
      padding: '8px 12px',
      'font-size': '12px',
      'white-space': 'nowrap',
      'margin-bottom': '8px',
      'z-index': 100,
      'box-shadow': '0 4px 12px rgba(0,0,0,0.3)',
    },
  };
  
  return (
    <div style={styles.container}>
      {/* Coins */}
      <div
        style={styles.currencyItem}
        onMouseEnter={() => setShowTooltip('coins')}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <span style={styles.icon}>🪙</span>
        <span style={styles.amount}>{formatNumber(currency().coins)}</span>
        <button
          style={styles.plusButton}
          onClick={props.onShopClick}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>
        <Show when={showTooltip() === 'coins'}>
          <div style={styles.tooltip}>
            <div style={{ color: '#fbbf24', 'font-weight': 'bold' }}>Coins</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', 'margin-top': '4px' }}>
              Earned by playing games
            </div>
            <div style={{ 'margin-top': '4px' }}>
              {currency().coins.toLocaleString()} total
            </div>
          </div>
        </Show>
      </div>
      
      {/* Gems */}
      <div
        style={styles.currencyItem}
        onMouseEnter={() => setShowTooltip('gems')}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <span style={styles.icon}>💎</span>
        <span style={styles.amount}>{formatNumber(currency().gems)}</span>
        <button
          style={styles.plusButton}
          onClick={props.onShopClick}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>
        <Show when={showTooltip() === 'gems'}>
          <div style={styles.tooltip}>
            <div style={{ color: '#a855f7', 'font-weight': 'bold' }}>Gems</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', 'margin-top': '4px' }}>
              Premium currency
            </div>
            <div style={{ 'margin-top': '4px' }}>
              {currency().gems.toLocaleString()} total
            </div>
          </div>
        </Show>
      </div>
      
      {/* Divider */}
      <Show when={!props.compact}>
        <div style={styles.divider} />
      </Show>
      
      {/* Shop Button */}
      <button
        style={styles.button}
        onClick={props.onShopClick}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Open Shop"
      >
        🛒
      </button>
      
      {/* Inventory Button */}
      <Show when={!props.compact}>
        <button
          style={styles.button}
          onClick={props.onInventoryClick}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Open Inventory"
        >
          📦
        </button>
      </Show>
    </div>
  );
};

export default CurrencyHeader;
