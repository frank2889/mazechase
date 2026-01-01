import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { monetizationStore } from '../lib/shop/store';
import type { CosmeticCategory, Rarity } from '../lib/shop/types';

// ============ TYPES ============

interface InventoryItemData {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: Rarity;
  preview: string;
  description: string;
  ownedAt: Date;
  equipped?: boolean;
}

// ============ ITEM CATALOG ============

const ITEM_CATALOG: Record<string, Omit<InventoryItemData, 'ownedAt' | 'equipped'>> = {
  'default_runner': { id: 'default_runner', name: 'Classic Runner', category: 'skin', rarity: 'common', preview: '🟡', description: 'The original runner' },
  'default_chaser': { id: 'default_chaser', name: 'Classic Chaser', category: 'skin', rarity: 'common', preview: '👻', description: 'The original chaser' },
  'runner_neon_knight': { id: 'runner_neon_knight', name: 'Neon Knight', category: 'skin', rarity: 'epic', preview: '🛡️', description: 'Glow in the dark armor' },
  'runner_arcade_warrior': { id: 'runner_arcade_warrior', name: 'Arcade Warrior', category: 'skin', rarity: 'rare', preview: '👾', description: 'Retro pixel style' },
  'runner_sunset_surfer': { id: 'runner_sunset_surfer', name: 'Sunset Surfer', category: 'skin', rarity: 'rare', preview: '🏄', description: 'Chill beach vibes' },
  'runner_cyber_samurai': { id: 'runner_cyber_samurai', name: 'Cyber Samurai', category: 'skin', rarity: 'legendary', preview: '⚔️', description: 'Futuristic warrior' },
  'trail_rainbow': { id: 'trail_rainbow', name: 'Rainbow Trail', category: 'trail', rarity: 'epic', preview: '🌈', description: 'Colorful path' },
  'trail_fire': { id: 'trail_fire', name: 'Fire Trail', category: 'trail', rarity: 'rare', preview: '🔥', description: 'Blazing hot' },
  'trail_sparkle': { id: 'trail_sparkle', name: 'Sparkle Trail', category: 'trail', rarity: 'common', preview: '✨', description: 'Magical sparkles' },
  'emote_dance': { id: 'emote_dance', name: 'Victory Dance', category: 'emote', rarity: 'rare', preview: '💃', description: 'Celebrate!' },
  'emote_wave': { id: 'emote_wave', name: 'Friendly Wave', category: 'emote', rarity: 'common', preview: '👋', description: 'Say hello' },
  'frame_gold': { id: 'frame_gold', name: 'Gold Frame', category: 'frame', rarity: 'legendary', preview: '🖼️', description: 'Premium border' },
};

// ============ STYLES ============

const rarityColors: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
  mythic: '#ef4444',
};

const styles = {
  container: {
    'min-height': '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%)',
    padding: '20px',
    color: '#fff',
  },
  header: {
    'margin-bottom': '30px',
  },
  title: {
    'font-size': '2.5rem',
    'font-weight': 'bold',
    background: 'linear-gradient(90deg, #0ff, #f0f)',
    '-webkit-background-clip': 'text',
    '-webkit-text-fill-color': 'transparent',
    margin: '0 0 10px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    'margin-bottom': '25px',
    'flex-wrap': 'wrap',
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    'border-radius': '20px',
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
  equippedSection: {
    'margin-bottom': '30px',
    padding: '20px',
    background: 'rgba(0,255,255,0.05)',
    'border-radius': '16px',
    border: '1px solid rgba(0,255,255,0.2)',
  },
  equippedTitle: {
    'font-size': '1.2rem',
    'margin': '0 0 15px',
    color: '#0ff',
  },
  equippedGrid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '15px',
  },
  equippedSlot: {
    background: 'rgba(0,0,0,0.3)',
    'border-radius': '12px',
    padding: '15px',
    'text-align': 'center',
    border: '2px dashed rgba(255,255,255,0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  equippedSlotFilled: {
    'border-style': 'solid',
    'border-color': '#0ff',
  },
  grid: {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '15px',
  },
  emptyState: {
    'text-align': 'center',
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.5)',
  },
};

// ============ SUB-COMPONENTS ============

const EquippedSlot: Component<{
  slot: string;
  label: string;
  itemId: string | null;
  onUnequip: () => void;
}> = (props) => {
  const item = () => props.itemId ? ITEM_CATALOG[props.itemId] : null;
  
  return (
    <div
      style={{
        ...styles.equippedSlot,
        ...(item() ? styles.equippedSlotFilled : {}),
      }}
      onClick={props.onUnequip}
      title={item() ? `Click to unequip ${item()?.name}` : `${props.label} slot empty`}
    >
      <div style={{ 'font-size': '2rem', 'margin-bottom': '5px' }}>
        {item()?.preview || '➕'}
      </div>
      <div style={{ 'font-size': '11px', color: 'rgba(255,255,255,0.6)' }}>
        {props.label}
      </div>
      <Show when={item()}>
        <div style={{ 'font-size': '10px', 'margin-top': '3px', color: rarityColors[item()!.rarity] }}>
          {item()?.name}
        </div>
      </Show>
    </div>
  );
};

const InventoryItemCard: Component<{
  item: InventoryItemData;
  onEquip: (slot: string) => void;
  isEquipped: boolean;
}> = (props) => {
  const [hovering, setHovering] = createSignal(false);
  
  const getSlotForCategory = (category: CosmeticCategory): string | null => {
    switch (category) {
      case 'skin': return 'runnerSkin';
      case 'trail': return 'trail';
      case 'emote': return 'emote1';
      case 'frame': return 'frame';
      case 'title': return 'title';
      default: return null;
    }
  };
  
  return (
    <div
      style={{
        background: props.isEquipped ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.4)',
        border: `2px solid ${props.isEquipped ? '#0ff' : hovering() ? rarityColors[props.item.rarity] : 'rgba(255,255,255,0.1)'}`,
        'border-radius': '12px',
        padding: '15px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovering() ? 'scale(1.02)' : 'none',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => {
        const slot = getSlotForCategory(props.item.category);
        if (slot) props.onEquip(slot);
      }}
    >
      {/* Rarity indicator */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: rarityColors[props.item.rarity],
        'border-radius': '12px 12px 0 0',
      }} />
      
      {/* Equipped badge */}
      <Show when={props.isEquipped}>
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: '#0ff',
          color: '#000',
          padding: '2px 8px',
          'border-radius': '10px',
          'font-size': '10px',
          'font-weight': 'bold',
        }}>
          EQUIPPED
        </div>
      </Show>
      
      {/* Preview */}
      <div style={{
        'font-size': '3rem',
        'text-align': 'center',
        'margin': '10px 0',
      }}>
        {props.item.preview}
      </div>
      
      {/* Info */}
      <div style={{ 'text-align': 'center' }}>
        <div style={{ 'font-weight': 'bold', 'font-size': '0.95rem', 'margin-bottom': '3px' }}>
          {props.item.name}
        </div>
        <div style={{ 
          'font-size': '11px', 
          color: rarityColors[props.item.rarity],
          'text-transform': 'uppercase',
        }}>
          {props.item.rarity}
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const Inventory: Component = () => {
  const [activeTab, setActiveTab] = createSignal<CosmeticCategory | 'all'>('all');
  
  const tabs: Array<{ key: CosmeticCategory | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: '📦' },
    { key: 'skin', label: 'Skins', icon: '👤' },
    { key: 'trail', label: 'Trails', icon: '✨' },
    { key: 'emote', label: 'Emotes', icon: '🎭' },
    { key: 'frame', label: 'Frames', icon: '🖼️' },
  ];
  
  const equipped = () => monetizationStore.getEquipped();
  const ownedIds = () => monetizationStore.getOwnedItems();
  
  // Include default items
  const allOwnedIds = createMemo(() => {
    const owned = new Set(ownedIds());
    owned.add('default_runner');
    owned.add('default_chaser');
    return Array.from(owned);
  });
  
  const inventoryItems = createMemo(() => {
    return allOwnedIds()
      .map(id => ITEM_CATALOG[id])
      .filter(Boolean)
      .map(item => ({
        ...item,
        ownedAt: new Date(),
        equipped: Object.values(equipped()).includes(item.id),
      }));
  });
  
  const filteredItems = createMemo(() => {
    if (activeTab() === 'all') return inventoryItems();
    return inventoryItems().filter(item => item.category === activeTab());
  });
  
  const handleEquip = (itemId: string, slot: keyof ReturnType<typeof equipped>) => {
    // Toggle equip
    if (equipped()[slot] === itemId) {
      monetizationStore.unequipItem(slot);
    } else {
      monetizationStore.equipItem(itemId, slot);
    }
  };
  
  const handleUnequipSlot = (slot: keyof ReturnType<typeof equipped>) => {
    if (equipped()[slot]) {
      monetizationStore.unequipItem(slot);
    }
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📦 Inventory</h1>
        <p style={styles.subtitle}>
          {inventoryItems().length} items collected
        </p>
      </div>
      
      {/* Equipped Section */}
      <div style={styles.equippedSection}>
        <h2 style={styles.equippedTitle}>🎯 Currently Equipped</h2>
        <div style={styles.equippedGrid}>
          <EquippedSlot
            slot="runnerSkin"
            label="Runner"
            itemId={equipped().runnerSkin}
            onUnequip={() => handleUnequipSlot('runnerSkin')}
          />
          <EquippedSlot
            slot="chaserSkin"
            label="Chaser"
            itemId={equipped().chaserSkin}
            onUnequip={() => handleUnequipSlot('chaserSkin')}
          />
          <EquippedSlot
            slot="trail"
            label="Trail"
            itemId={equipped().trail}
            onUnequip={() => handleUnequipSlot('trail')}
          />
          <EquippedSlot
            slot="emote1"
            label="Emote 1"
            itemId={equipped().emote1}
            onUnequip={() => handleUnequipSlot('emote1')}
          />
          <EquippedSlot
            slot="frame"
            label="Frame"
            itemId={equipped().frame}
            onUnequip={() => handleUnequipSlot('frame')}
          />
          <EquippedSlot
            slot="title"
            label="Title"
            itemId={equipped().title}
            onUnequip={() => handleUnequipSlot('title')}
          />
        </div>
      </div>
      
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
              <Show when={activeTab() === 'all' || activeTab() === tab.key}>
                <span style={{ 
                  'margin-left': '5px', 
                  opacity: 0.7,
                  'font-size': '12px',
                }}>
                  ({tab.key === 'all' 
                    ? inventoryItems().length 
                    : inventoryItems().filter(i => i.category === tab.key).length
                  })
                </span>
              </Show>
            </button>
          )}
        </For>
      </div>
      
      {/* Items Grid */}
      <Show
        when={filteredItems().length > 0}
        fallback={
          <div style={styles.emptyState}>
            <div style={{ 'font-size': '4rem', 'margin-bottom': '20px' }}>📭</div>
            <h3>No items in this category</h3>
            <p>Visit the shop to get some cool stuff!</p>
          </div>
        }
      >
        <div style={styles.grid}>
          <For each={filteredItems()}>
            {(item) => (
              <InventoryItemCard
                item={item}
                onEquip={(slot) => handleEquip(item.id, slot as any)}
                isEquipped={item.equipped || false}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default Inventory;
