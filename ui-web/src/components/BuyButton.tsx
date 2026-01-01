import { useState } from 'react';
import { checkout, PRODUCTS, ProductKey, buyWithLink, PAYMENT_LINKS } from '../lib/payments/stripe';

interface BuyButtonProps {
  product: ProductKey;
  userId: string;
  variant?: 'primary' | 'gold' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const styles = {
  button: {
    border: 'none',
    borderRadius: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  },
  // Enhanced gradient backgrounds with shimmer effect
  primary: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 50%, #00ff88 100%)',
    backgroundSize: '200% 200%',
    color: '#000',
  },
  gold: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%)',
    backgroundSize: '200% 200%',
    color: '#000',
  },
  neon: {
    background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #00ffff 100%)',
    backgroundSize: '200% 200%',
    color: '#000',
  },
  sm: {
    padding: '10px 18px',
    fontSize: '14px',
  },
  md: {
    padding: '14px 28px',
    fontSize: '16px',
  },
  lg: {
    padding: '18px 36px',
    fontSize: '18px',
  },
  loading: {
    opacity: 0.7,
    cursor: 'wait',
  },
};

export function BuyButton({ 
  product, 
  userId,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productInfo = PRODUCTS[product];
  const priceDisplay = `$${(productInfo.price / 100).toFixed(2)}`;

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use payment link if available (simpler, no backend needed)
      if (product in PAYMENT_LINKS) {
        buyWithLink(product as keyof typeof PAYMENT_LINKS, userId);
      } else {
        await checkout(product, userId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          ...styles.button,
          ...styles[variant],
          ...styles[size],
          ...(loading ? styles.loading : {}),
          width: fullWidth ? '100%' : 'auto',
        }}
        onMouseOver={e => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = variant === 'gold' 
              ? '0 8px 25px rgba(255,215,0,0.5)'
              : variant === 'neon'
              ? '0 8px 25px rgba(0,255,255,0.4), 0 0 30px rgba(255,0,255,0.3)'
              : '0 8px 25px rgba(0,255,136,0.5)';
            e.currentTarget.style.backgroundPosition = '100% 50%';
          }
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
          e.currentTarget.style.backgroundPosition = '0% 50%';
        }}
        onMouseDown={e => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
          }
        }}
        onMouseUp={e => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
          }
        }}
      >
        {loading ? (
          <>
            <span className="spinner">⏳</span>
            Processing...
          </>
        ) : (
          <>
            <span>{productInfo.name}</span>
            <span style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '2px 8px', 
              borderRadius: '4px' 
            }}>
              {priceDisplay}
            </span>
          </>
        )}
      </button>
      
      {error && (
        <p style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Quick inline buy buttons for common products
export function BuyBattlePass({ userId }: { userId: string }) {
  return <BuyButton product="BATTLE_PASS" userId={userId} variant="gold" />;
}

export function BuyVIP({ userId }: { userId: string }) {
  return <BuyButton product="VIP_MONTHLY" userId={userId} variant="neon" />;
}

export function BuyStarterPack({ userId }: { userId: string }) {
  return <BuyButton product="STARTER_PACK" userId={userId} variant="primary" />;
}

export default BuyButton;
