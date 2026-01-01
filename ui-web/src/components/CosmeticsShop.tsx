import type { Component } from 'solid-js';
import { createSignal, For, Show, createMemo } from 'solid-js';
import { monetizationStore } from '../lib/shop/store';
import type { CosmeticCategory, Rarity } from '../lib/shop/types';

// ============ TYPES ============

interface ShopItem {
  id: string;
  name: string;
  nameNL: string;
  category: CosmeticCategory;
  rarity: Rarity;
  priceCoins: number;
  priceGems: number;
  preview: string;
  description: string;
  featured?: boolean;
  new?: boolean;
  limited?: boolean;
}

// ============ MOCK DATA ============
// Sprint 3: Expanded cosmetics catalog with more variety and sale items

// Sale discounts (item ID -> discount percentage)
const SALE_ITEMS: Record<string, number> = {
  'runner_fire_phoenix': 25,
  'chaser_shadow_stalker': 30,
  'trail_galaxy': 20,
  'runner_arcade_warrior': 15,
};

const SHOP_ITEMS: ShopItem[] = [
  // === RUNNER SKINS ===
  { id: 'runner_neon_knight', name: 'Neon Knight', nameNL: 'Neon Ridder', category: 'skin', rarity: 'epic', priceCoins: 500, priceGems: 50, preview: '🛡️', description: 'Glow in the dark armor', featured: true },
  { id: 'runner_arcade_warrior', name: 'Arcade Warrior', nameNL: 'Arcade Krijger', category: 'skin', rarity: 'rare', priceCoins: 400, priceGems: 40, preview: '👾', description: 'Retro pixel style' },
  { id: 'runner_sunset_surfer', name: 'Sunset Surfer', nameNL: 'Zonsondergang Surfer', category: 'skin', rarity: 'rare', priceCoins: 400, priceGems: 40, preview: '🏄', description: 'Chill beach vibes', new: true },
  { id: 'runner_cyber_samurai', name: 'Cyber Samurai', nameNL: 'Cyber Samoerai', category: 'skin', rarity: 'legendary', priceCoins: 800, priceGems: 80, preview: '⚔️', description: 'Futuristic warrior', featured: true },
  { id: 'runner_forest_phantom', name: 'Forest Phantom', nameNL: 'Bos Fantoom', category: 'skin', rarity: 'epic', priceCoins: 500, priceGems: 50, preview: '🌲', description: 'Mystic woodland spirit' },
  { id: 'runner_pixel_hero', name: 'Pixel Hero', nameNL: 'Pixel Held', category: 'skin', rarity: 'common', priceCoins: 200, priceGems: 20, preview: '🎮', description: 'Classic 8-bit hero' },
  // New Sprint 3 skins
  { id: 'runner_galaxy', name: 'Galaxy Runner', nameNL: 'Melkweg Renner', category: 'skin', rarity: 'epic', priceCoins: 600, priceGems: 60, preview: '🌌', description: 'Star-filled cosmic skin', featured: true },
  { id: 'runner_fire_phoenix', name: 'Fire Phoenix', nameNL: 'Vuur Feniks', category: 'skin', rarity: 'epic', priceCoins: 550, priceGems: 55, preview: '🔥', description: 'Blazing orange with fire trail', new: true },
  { id: 'runner_arctic_frost', name: 'Arctic Frost', nameNL: 'Arctische Vorst', category: 'skin', rarity: 'rare', priceCoins: 400, priceGems: 40, preview: '❄️', description: 'Icy blue with snowflakes' },
  { id: 'runner_holographic', name: 'Holographic', nameNL: 'Holografisch', category: 'skin', rarity: 'legendary', priceCoins: 1000, priceGems: 100, preview: '🌈', description: 'Iridescent rainbow effect', limited: true },
  { id: 'runner_shadow_king', name: 'Shadow King', nameNL: 'Schaduw Koning', category: 'skin', rarity: 'legendary', priceCoins: 900, priceGems: 90, preview: '👑', description: 'Dark void with purple particles' },
  { id: 'runner_golden_champion', name: 'Golden Champion', nameNL: 'Gouden Kampioen', category: 'skin', rarity: 'legendary', priceCoins: 1200, priceGems: 120, preview: '🏆', description: 'Solid gold for winners only', limited: true },
  
  // === CHASER SKINS ===
  { id: 'chaser_lightning', name: 'Lightning Chaser', nameNL: 'Bliksem Jager', category: 'skin', rarity: 'rare', priceCoins: 400, priceGems: 40, preview: '⚡', description: 'Electric blue with lightning', new: true },
  { id: 'chaser_shadow_stalker', name: 'Shadow Stalker', nameNL: 'Schaduw Stalker', category: 'skin', rarity: 'epic', priceCoins: 550, priceGems: 55, preview: '🌑', description: 'Dark purple with smoke trail', featured: true },
  { id: 'chaser_toxic', name: 'Toxic Hunter', nameNL: 'Giftige Jager', category: 'skin', rarity: 'rare', priceCoins: 380, priceGems: 38, preview: '☢️', description: 'Glowing green toxic drip' },
  { id: 'chaser_void_lord', name: 'Void Lord', nameNL: 'Leegte Heerser', category: 'skin', rarity: 'legendary', priceCoins: 950, priceGems: 95, preview: '🕳️', description: 'Black hole with warping space', featured: true },
  { id: 'chaser_inferno', name: 'Inferno Demon', nameNL: 'Inferno Demon', category: 'skin', rarity: 'legendary', priceCoins: 900, priceGems: 90, preview: '😈', description: 'Flaming demon with lava cracks' },
  { id: 'chaser_cyber_hunter', name: 'Cyber Hunter', nameNL: 'Cyber Jager', category: 'skin', rarity: 'epic', priceCoins: 520, priceGems: 52, preview: '🤖', description: 'Cyberpunk holographic display' },
  
  // === TRAILS ===
  { id: 'trail_rainbow', name: 'Rainbow Trail', nameNL: 'Regenboog Spoor', category: 'trail', rarity: 'epic', priceCoins: 400, priceGems: 40, preview: '🌈', description: 'Leave a colorful path' },
  { id: 'trail_fire', name: 'Fire Trail', nameNL: 'Vuur Spoor', category: 'trail', rarity: 'rare', priceCoins: 300, priceGems: 30, preview: '🔥', description: 'Blazing hot trail' },
  { id: 'trail_sparkle', name: 'Sparkle Trail', nameNL: 'Glitter Spoor', category: 'trail', rarity: 'common', priceCoins: 200, priceGems: 20, preview: '✨', description: 'Magical sparkles' },
  { id: 'trail_ghost', name: 'Ghost Trail', nameNL: 'Geest Spoor', category: 'trail', rarity: 'legendary', priceCoins: 600, priceGems: 60, preview: '👻', description: 'Spooky ghost echo', limited: true },
  { id: 'trail_galaxy', name: 'Galaxy Trail', nameNL: 'Melkweg Spoor', category: 'trail', rarity: 'epic', priceCoins: 450, priceGems: 45, preview: '🌟', description: 'Stars and cosmic dust', new: true },
  { id: 'trail_ice', name: 'Frost Trail', nameNL: 'Vorst Spoor', category: 'trail', rarity: 'rare', priceCoins: 320, priceGems: 32, preview: '🧊', description: 'Icy crystals follow you' },
  { id: 'trail_lightning', name: 'Lightning Trail', nameNL: 'Bliksem Spoor', category: 'trail', rarity: 'epic', priceCoins: 420, priceGems: 42, preview: '⚡', description: 'Electric sparks and bolts' },
  { id: 'trail_holographic', name: 'Holographic Trail', nameNL: 'Holografisch Spoor', category: 'trail', rarity: 'legendary', priceCoins: 700, priceGems: 70, preview: '💠', description: 'Shimmering iridescent trail', limited: true },
  
  // === EMOTES ===
  { id: 'emote_dance', name: 'Victory Dance', nameNL: 'Overwinningsdans', category: 'emote', rarity: 'rare', priceCoins: 250, priceGems: 25, preview: '💃', description: 'Celebrate in style' },
  { id: 'emote_wave', name: 'Friendly Wave', nameNL: 'Vriendelijke Zwaai', category: 'emote', rarity: 'common', priceCoins: 100, priceGems: 10, preview: '👋', description: 'Say hello!' },
  { id: 'emote_flex', name: 'Power Flex', nameNL: 'Kracht Pose', category: 'emote', rarity: 'rare', priceCoins: 250, priceGems: 25, preview: '💪', description: 'Show your strength' },
  { id: 'emote_confetti', name: 'Confetti Burst', nameNL: 'Confetti Explosie', category: 'emote', rarity: 'epic', priceCoins: 350, priceGems: 35, preview: '🎊', description: 'Party time!' },
  { id: 'emote_mic_drop', name: 'Mic Drop', nameNL: 'Mic Drop', category: 'emote', rarity: 'epic', priceCoins: 400, priceGems: 40, preview: '🎤', description: 'Drop the mic and walk away', new: true },
  { id: 'emote_fireworks', name: 'Fireworks', nameNL: 'Vuurwerk', category: 'emote', rarity: 'rare', priceCoins: 280, priceGems: 28, preview: '🎆', description: 'Celebratory fireworks' },
  { id: 'emote_taunt', name: 'Playful Taunt', nameNL: 'Speelse Plaag', category: 'emote', rarity: 'common', priceCoins: 150, priceGems: 15, preview: '😜', description: 'Tease your opponents' },
  
  // === FRAMES ===
  { id: 'frame_gold', name: 'Gold Frame', nameNL: 'Gouden Kader', category: 'frame', rarity: 'legendary', priceCoins: 700, priceGems: 70, preview: '🖼️', description: 'Premium golden border' },
  { id: 'frame_neon', name: 'Neon Frame', nameNL: 'Neon Kader', category: 'frame', rarity: 'epic', priceCoins: 400, priceGems: 40, preview: '💠', description: 'Glowing neon edge' },
  { id: 'frame_pixel', name: 'Pixel Frame', nameNL: 'Pixel Kader', category: 'frame', rarity: 'rare', priceCoins: 280, priceGems: 28, preview: '🎮', description: 'Retro 8-bit border', new: true },
  { id: 'frame_fire', name: 'Fire Frame', nameNL: 'Vuur Kader', category: 'frame', rarity: 'epic', priceCoins: 450, priceGems: 45, preview: '🔥', description: 'Animated flames border' },
  { id: 'frame_ice', name: 'Ice Frame', nameNL: 'Ijs Kader', category: 'frame', rarity: 'rare', priceCoins: 300, priceGems: 30, preview: '❄️', description: 'Frozen crystal border' },
];

// ============ STYLES ============

const styles = {
  container: {
    'min-height': '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%)',
    padding: '20px',
    color: '#fff',
  },
  header: {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '30px',
    'flex-wrap': 'wrap',
    gap: '15px',
  },
  title: {
    'font-size': '2.5rem',
    'font-weight': 'bold',
    background: 'linear-gradient(90deg, #0ff, #f0f)',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    margin: 0,
  },
  currencyDisplay: {
    display: 'flex',
    gap: '20px',
  },
  currencyItem: {
    display: 'flex',
    'align-items': 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.1)',
    padding: '10px 20px',
    'border-radius': '25px',
    'font-weight': 'bold',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    'margin-bottom': '25px',
    'flex-wrap': 'wrap',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    'border-radius': '25px',
    cursor: 'pointer',
    'font-size': '14px',
    'font-weight': 'bold',
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
    'grid-template-columns': 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
  },
  featured: {
    'margin-bottom': '30px',
  },
  featuredTitle: {
    'font-size': '1.5rem',
    'margin-bottom': '15px',
    display: 'flex',
    'align-items': 'center',
    gap: '10px',
  },
};

// ============ SUB-COMPONENTS ============

const CurrencyDisplay: Component = () => {
  const currency = () => monetizationStore.getCurrency();
  
  return (
    <div style={styles.currencyDisplay}>
      <div style={styles.currencyItem}>
        <span>🪙</span>
        <span>{currency().coins.toLocaleString()}</span>
      </div>
      <div style={styles.currencyItem}>
        <span>💎</span>
        <span>{currency().gems.toLocaleString()}</span>
      </div>
    </div>
  );
};

const rarityColors: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
  mythic: '#ef4444',
};

const ShopItemCard: Component<{
  item: ShopItem;
  onBuy: (item: ShopItem, currency: 'coins' | 'gems') => void;
  owned: boolean;
}> = (props) => {
  const [hovering, setHovering] = createSignal(false);
  
  const canAffordCoins = () => monetizationStore.canAfford('coins', props.item.priceCoins);
  const canAffordGems = () => monetizationStore.canAfford('gems', props.item.priceGems);
  
  const cardStyle = () => ({
    background: 'rgba(0,0,0,0.5)',
    border: `2px solid ${hovering() ? rarityColors[props.item.rarity] : 'rgba(255,255,255,0.1)'}`,
    'border-radius': '15px',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s',
    transform: hovering() ? 'translateY(-5px)' : 'none',
    'box-shadow': hovering() ? `0 10px 30px ${rarityColors[props.item.rarity]}40` : 'none',
  });
  
  return (
    <div
      style={cardStyle()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Rarity glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: rarityColors[props.item.rarity],
      }} />
      
      {/* Badges */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>
        <Show when={props.item.featured}>
          <span style={{ background: '#ffd700', color: '#000', padding: '2px 8px', 'border-radius': '10px', 'font-size': '10px', 'font-weight': 'bold' }}>⭐ FEATURED</span>
        </Show>
        <Show when={props.item.new}>
          <span style={{ background: '#22c55e', color: '#fff', padding: '2px 8px', 'border-radius': '10px', 'font-size': '10px', 'font-weight': 'bold' }}>NEW</span>
        </Show>
        <Show when={props.item.limited}>
          <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', 'border-radius': '10px', 'font-size': '10px', 'font-weight': 'bold' }}>LIMITED</span>
        </Show>
      </div>
      
      {/* Preview */}
      <div style={{
        'font-size': '4rem',
        'text-align': 'center',
        'margin': '20px 0',
        filter: props.owned ? 'grayscale(0)' : 'none',
      }}>
        {props.item.preview}
      </div>
      
      {/* Info */}
      <div style={{ 'text-align': 'center' }}>
        <h3 style={{ margin: '0 0 5px', 'font-size': '1.1rem' }}>{props.item.name}</h3>
        <p style={{ margin: '0 0 10px', color: rarityColors[props.item.rarity], 'font-size': '12px', 'text-transform': 'uppercase' }}>
          {props.item.rarity}
        </p>
        <p style={{ margin: '0 0 15px', color: 'rgba(255,255,255,0.6)', 'font-size': '13px' }}>
          {props.item.description}
        </p>
      </div>
      
      {/* Purchase buttons */}
      <Show
        when={!props.owned}
        fallback={
          <div style={{
            'text-align': 'center',
            padding: '10px',
            background: 'rgba(34,197,94,0.2)',
            'border-radius': '10px',
            color: '#22c55e',
            'font-weight': 'bold',
          }}>
            ✓ Owned
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              'border-radius': '10px',
              cursor: canAffordCoins() ? 'pointer' : 'not-allowed',
              background: canAffordCoins() ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.1)',
              color: canAffordCoins() ? '#000' : 'rgba(255,255,255,0.5)',
              'font-weight': 'bold',
              'font-size': '14px',
              transition: 'transform 0.2s',
            }}
            onClick={() => canAffordCoins() && props.onBuy(props.item, 'coins')}
            disabled={!canAffordCoins()}
          >
            🪙 {props.item.priceCoins}
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              'border-radius': '10px',
              cursor: canAffordGems() ? 'pointer' : 'not-allowed',
              background: canAffordGems() ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.1)',
              color: canAffordGems() ? '#fff' : 'rgba(255,255,255,0.5)',
              'font-weight': 'bold',
              'font-size': '14px',
              transition: 'transform 0.2s',
            }}
            onClick={() => canAffordGems() && props.onBuy(props.item, 'gems')}
            disabled={!canAffordGems()}
          >
            💎 {props.item.priceGems}
          </button>
        </div>
      </Show>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const CosmeticsShop: Component = () => {
  const [activeTab, setActiveTab] = createSignal<CosmeticCategory | 'all'>('all');
  const [purchasing, setPurchasing] = createSignal<ShopItem | null>(null);
  const [purchaseResult, setPurchaseResult] = createSignal<{ success: boolean; message: string } | null>(null);
  
  const tabs: Array<{ key: CosmeticCategory | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: '🛒' },
    { key: 'skin', label: 'Skins', icon: '👤' },
    { key: 'trail', label: 'Trails', icon: '✨' },
    { key: 'emote', label: 'Emotes', icon: '🎭' },
    { key: 'frame', label: 'Frames', icon: '🖼️' },
  ];
  
  const filteredItems = createMemo(() => {
    if (activeTab() === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter(item => item.category === activeTab());
  });
  
  const featuredItems = createMemo(() => SHOP_ITEMS.filter(item => item.featured));
  
  const ownedItems = () => monetizationStore.getOwnedItems();
  
  const handleBuy = async (item: ShopItem, currency: 'coins' | 'gems') => {
    setPurchasing(item);
    
    const result = await monetizationStore.purchaseItem({
      itemId: item.id,
      paymentMethod: currency,
    });
    
    setPurchaseResult({
      success: result.success,
      message: result.success 
        ? `You got ${item.name}!` 
        : result.error || 'Purchase failed',
    });
    
    // Clear after 3 seconds
    setTimeout(() => {
      setPurchasing(null);
      setPurchaseResult(null);
    }, 3000);
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🛍️ Shop</h1>
        <CurrencyDisplay />
      </div>
      
      {/* Featured Section */}
      <Show when={activeTab() === 'all' && featuredItems().length > 0}>
        <div style={styles.featured}>
          <h2 style={styles.featuredTitle}>
            <span>⭐</span> Featured Items
          </h2>
          <div style={styles.grid}>
            <For each={featuredItems()}>
              {(item) => (
                <ShopItemCard
                  item={item}
                  onBuy={handleBuy}
                  owned={ownedItems().includes(item.id)}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
      
      {/* Tabs */}
      <div style={styles.tabs}>
        <For each={tabs}>
          {(tab) => (
            <button
              style={{
                ...styles.tab,
                ...(activeTab() === tab.key ? styles.tabActive : styles.tabInactive),
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          )}
        </For>
      </div>
      
      {/* Items Grid */}
      <div style={styles.grid}>
        <For each={filteredItems()}>
          {(item) => (
            <ShopItemCard
              item={item}
              onBuy={handleBuy}
              owned={ownedItems().includes(item.id)}
            />
          )}
        </For>
      </div>
      
      {/* Purchase Modal */}
      <Show when={purchaseResult()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 1000,
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1a2e, #0a0a15)',
            padding: '40px',
            'border-radius': '20px',
            'text-align': 'center',
            border: `2px solid ${purchaseResult()?.success ? '#22c55e' : '#ef4444'}`,
            animation: 'pop-in 0.3s ease-out',
          }}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '20px' }}>
              {purchaseResult()?.success ? '🎉' : '❌'}
            </div>
            <h2 style={{ margin: '0 0 10px' }}>
              {purchaseResult()?.success ? 'Purchase Complete!' : 'Purchase Failed'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              {purchaseResult()?.message}
            </p>
            <Show when={purchasing()}>
              <div style={{ 'font-size': '5rem', 'margin-top': '20px' }}>
                {purchasing()?.preview}
              </div>
            </Show>
          </div>
        </div>
      </Show>
      
      {/* Inline styles for animation */}
      <style>{`
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CosmeticsShop;
