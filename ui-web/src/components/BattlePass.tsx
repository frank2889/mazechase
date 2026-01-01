import { useState } from 'react';
import { neonNightAdventures, getBattlePassRewards } from '../lib/game/battlePass';

interface BattlePassLevel {
  level: number;
  xpRequired: number;
  freeReward: string | null;
  premiumReward: string | null;
}

// Generate 50 levels of battle pass
function generateLevels(): BattlePassLevel[] {
  const levels: BattlePassLevel[] = [];
  const freeRewards = ['🪙 50', '⚡ Power-up', '🪙 100', null, '🎨 Skin Frame'];
  const premiumRewards = ['👑 Crown', '🌈 Trail', '💎 500', '🎭 Emote', '🔥 Legendary Skin'];

  for (let i = 1; i <= 50; i++) {
    levels.push({
      level: i,
      xpRequired: i * 100,
      freeReward: i % 5 === 0 ? freeRewards[Math.floor(Math.random() * freeRewards.length)] : null,
      premiumReward: i % 3 === 0 ? premiumRewards[Math.floor(Math.random() * premiumRewards.length)] : null,
    });
  }
  return levels;
}

const levels = generateLevels();

const styles = {
  container: {
    padding: '20px',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%)',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  seasonTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #0ff, #f0f)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  seasonMeta: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: '10px',
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '30px',
    padding: '15px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
  },
  progressTrack: {
    flex: 1,
    height: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #0ff, #f0f)',
    borderRadius: '10px',
    transition: 'width 0.5s ease',
  },
  levelBadge: {
    background: 'linear-gradient(135deg, #0ff, #0af)',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '1.2rem',
  },
  xpText: {
    color: '#fff',
    fontSize: '0.9rem',
  },
  trackContainer: {
    display: 'flex',
    overflowX: 'auto' as const,
    gap: '2px',
    padding: '20px 0',
  },
  levelCard: {
    minWidth: '80px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '5px',
  },
  rewardBox: {
    width: '70px',
    height: '70px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    border: '2px solid',
    transition: 'transform 0.2s',
  },
  freeReward: {
    background: 'rgba(100,100,100,0.3)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumReward: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,100,0,0.2))',
    borderColor: '#ffd700',
  },
  emptyReward: {
    background: 'rgba(50,50,50,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.2)',
  },
  levelNumber: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
  },
  unlocked: {
    opacity: 1,
    boxShadow: '0 0 15px rgba(0,255,255,0.5)',
  },
  locked: {
    opacity: 0.5,
  },
  purchaseButton: {
    display: 'block',
    margin: '30px auto',
    padding: '15px 40px',
    background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
    border: 'none',
    borderRadius: '25px',
    color: '#000',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  trackLabel: {
    writingMode: 'vertical-rl' as const,
    textOrientation: 'mixed' as const,
    padding: '10px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
};

interface BattlePassProps {
  currentLevel?: number;
  currentXP?: number;
  isPremium?: boolean;
  onPurchase?: () => void;
}

export function BattlePass({ 
  currentLevel = 12, 
  currentXP = 450, 
  isPremium = false,
  onPurchase 
}: BattlePassProps) {
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const xpForNextLevel = levels[currentLevel]?.xpRequired || 100;
  const progressPercent = Math.min((currentXP / xpForNextLevel) * 100, 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.seasonTitle}>{neonNightAdventures.seasonTheme}</h1>
        <p style={styles.seasonMeta}>
          {neonNightAdventures.duration} • Ends in 23 days
        </p>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBar}>
        <div style={styles.levelBadge}>LV {currentLevel}</div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
        </div>
        <span style={styles.xpText}>{currentXP} / {xpForNextLevel} XP</span>
      </div>

      {/* Premium Track */}
      <div style={{ display: 'flex' }}>
        <div style={{ ...styles.trackLabel, color: '#ffd700' }}>
          {isPremium ? '✓ PREMIUM' : '🔒 PREMIUM'}
        </div>
        <div style={styles.trackContainer}>
          {levels.map(level => (
            <div 
              key={`premium-${level.level}`}
              style={styles.levelCard}
              onMouseEnter={() => setHoveredLevel(level.level)}
              onMouseLeave={() => setHoveredLevel(null)}
            >
              <div 
                style={{
                  ...styles.rewardBox,
                  ...(level.premiumReward ? styles.premiumReward : styles.emptyReward),
                  ...(level.level <= currentLevel ? styles.unlocked : styles.locked),
                  transform: hoveredLevel === level.level ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {level.premiumReward || '-'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Free Track */}
      <div style={{ display: 'flex' }}>
        <div style={{ ...styles.trackLabel, color: '#888' }}>
          FREE
        </div>
        <div style={styles.trackContainer}>
          {levels.map(level => (
            <div 
              key={`free-${level.level}`}
              style={styles.levelCard}
            >
              <div 
                style={{
                  ...styles.rewardBox,
                  ...(level.freeReward ? styles.freeReward : styles.emptyReward),
                  ...(level.level <= currentLevel ? styles.unlocked : styles.locked),
                }}
              >
                {level.freeReward || '-'}
              </div>
              <span style={styles.levelNumber}>{level.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Button */}
      {!isPremium && (
        <button 
          style={styles.purchaseButton}
          onClick={onPurchase}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(255,215,0,0.5)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          👑 Upgrade to Premium - {neonNightAdventures.price}
        </button>
      )}
    </div>
  );
}

export default BattlePass;
