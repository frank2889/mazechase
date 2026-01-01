import { useState } from 'react';
import { PRODUCTS, checkout, ProductKey } from '../lib/payments/stripe';

// Types
interface ShopItem {
  id: ProductKey;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  type: 'subscription' | 'battlepass' | 'bundle' | 'coins';
  discount?: string;
  popular?: boolean;
}

// Shop items mapped to Stripe products
const shopItems: ShopItem[] = [
  {
    id: 'VIP_MONTHLY',
    name: PRODUCTS.VIP_MONTHLY.name,
    description: 'Ad-free • Daily bonus • Exclusive skins',
    price: '$3.99/mo',
    priceValue: PRODUCTS.VIP_MONTHLY.price,
    type: 'subscription',
    popular: true,
  },
  {
    id: 'BATTLE_PASS',
    name: PRODUCTS.BATTLE_PASS.name,
    description: '8 weeks • 50 levels • Exclusive rewards',
    price: '$4.99',
    priceValue: PRODUCTS.BATTLE_PASS.price,
    type: 'battlepass',
  },
  {
    id: 'STARTER_PACK',
    name: PRODUCTS.STARTER_PACK.name,
    description: '500 coins • 1 skin • 3x power-ups',
    price: '$4.99',
    priceValue: PRODUCTS.STARTER_PACK.price,
    type: 'bundle',
    discount: '50% OFF',
  },
  {
    id: 'COINS_500',
    name: PRODUCTS.COINS_500.name,
    description: 'Small coin pack',
    price: '$0.99',
    priceValue: PRODUCTS.COINS_500.price,
    type: 'coins',
  },
  {
    id: 'COINS_2500',
    name: PRODUCTS.COINS_2500.name,
    description: 'Medium coin pack (+25% bonus)',
    price: '$3.99',
    priceValue: PRODUCTS.COINS_2500.price,
    type: 'coins',
  },
  {
    id: 'COINS_10000',
    name: PRODUCTS.COINS_10000.name,
    description: 'Large coin pack (+50% bonus)',
    price: '$9.99',
    priceValue: PRODUCTS.COINS_10000.price,
    type: 'coins',
    popular: true,
  },
];

// Styles
const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 0 10px #0ff',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #0ff, #f0f)',
    color: '#000',
  },
  tabInactive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(90deg, #0ff, #f0f, #0ff)',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '15px',
    lineHeight: 1.4,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#0f0',
  },
  buyButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0f0, #0a0)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  discount: {
    position: 'absolute' as const,
    top: '10px',
    right: '-30px',
    background: '#f00',
    color: '#fff',
    padding: '5px 40px',
    fontSize: '12px',
    fontWeight: 'bold',
    transform: 'rotate(45deg)',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
};

const typeColors: Record<string, string> = {
  subscription: '#f0f',
  battlepass: '#ff0',
  bundle: '#0ff',
  coins: '#0f0',
};

type TabType = 'all' | 'subscription' | 'battlepass' | 'bundle' | 'coins';

interface ShopProps {
  userId?: string;
}

export function Shop({ userId = 'guest' }: ShopProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredItems = activeTab === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.type === activeTab);

  const handlePurchase = async (item: ShopItem) => {
    if (!userId || userId === 'guest') {
      alert('Please login to make a purchase');
      return;
    }

    setLoading(item.id);
    try {
      await checkout(item.id, userId);
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🛒 SHOP</h1>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['all', 'subscription', 'battlepass', 'bundle', 'coins'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : styles.tabInactive),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={styles.grid}>
        {filteredItems.map(item => (
          <div key={item.id} style={{
            ...styles.card,
            ...(item.popular ? { border: '2px solid #ffd700' } : {}),
          }}>
            <div style={styles.cardGlow} />
            
            {item.discount && (
              <div style={styles.discount}>{item.discount}</div>
            )}

            {item.popular && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: '#ffd700',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
              }}>⭐ POPULAR</div>
            )}

            <div style={{
              ...styles.typeBadge,
              background: typeColors[item.type] || '#888',
              color: '#000',
            }}>
              {item.type.toUpperCase()}
            </div>

            <h3 style={styles.cardTitle}>{item.name}</h3>
            <p style={styles.cardDesc}>{item.description}</p>

            <div style={styles.cardFooter}>
              <span style={styles.price}>{item.price}</span>
              <button 
                style={{
                  ...styles.buyButton,
                  ...(loading === item.id ? { opacity: 0.7 } : {}),
                }}
                onClick={() => handlePurchase(item)}
                disabled={loading === item.id}
                onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {loading === item.id ? '...' : 'BUY'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Shop;
