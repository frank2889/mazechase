import { useState, useEffect } from 'react';

interface DailyReward {
  day: number;
  reward: string;
  coins: number;
  claimed: boolean;
  isToday: boolean;
}

const weeklyRewards: Omit<DailyReward, 'claimed' | 'isToday'>[] = [
  { day: 1, reward: '🪙', coins: 50 },
  { day: 2, reward: '🪙', coins: 75 },
  { day: 3, reward: '⚡', coins: 100 },
  { day: 4, reward: '🪙', coins: 125 },
  { day: 5, reward: '🎨', coins: 150 },
  { day: 6, reward: '🪙', coins: 200 },
  { day: 7, reward: '👑', coins: 500 },
];

const STORAGE_KEY = 'mazechase_daily_rewards';

interface StoredData {
  streak: number;
  lastClaim: string | null;
}

function getStoredData(): StoredData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { streak: 0, lastClaim: null };
  } catch {
    return { streak: 0, lastClaim: null };
  }
}

function saveStoredData(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date().toDateString();
  return new Date(dateStr).toDateString() === today;
}

function isYesterday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(dateStr).toDateString() === yesterday.toDateString();
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
    border: '2px solid #0ff',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 0 30px rgba(0,255,255,0.3)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '25px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    color: '#0ff',
    fontSize: '0.9rem',
    marginTop: '5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    marginBottom: '25px',
  },
  dayCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 5px',
    textAlign: 'center' as const,
    transition: 'all 0.3s',
  },
  dayCardToday: {
    background: 'rgba(0,255,255,0.2)',
    border: '2px solid #0ff',
    boxShadow: '0 0 15px rgba(0,255,255,0.4)',
  },
  dayCardClaimed: {
    background: 'rgba(0,255,0,0.2)',
    border: '1px solid #0f0',
  },
  dayNumber: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '5px',
  },
  dayReward: {
    fontSize: '1.5rem',
    marginBottom: '5px',
  },
  dayCoins: {
    fontSize: '11px',
    color: '#ff0',
    fontWeight: 'bold',
  },
  claimButton: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #0ff, #0af)',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  claimButtonDisabled: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'not-allowed',
  },
  streakBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  streakText: {
    color: '#f0f',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute' as const,
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
};

interface DailyRewardsProps {
  onClose: () => void;
  onClaim?: (coins: number) => void;
}

export function DailyRewards({ onClose, onClaim }: DailyRewardsProps) {
  const [data, setData] = useState<StoredData>(getStoredData);
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    const stored = getStoredData();
    
    // Check if streak should reset
    if (stored.lastClaim && !isToday(stored.lastClaim) && !isYesterday(stored.lastClaim)) {
      stored.streak = 0;
      saveStoredData(stored);
    }
    
    setData(stored);
    setCanClaim(!isToday(stored.lastClaim));
  }, []);

  const currentDay = (data.streak % 7) + 1;

  const handleClaim = () => {
    if (!canClaim) return;

    const reward = weeklyRewards[currentDay - 1];
    const newData: StoredData = {
      streak: data.streak + 1,
      lastClaim: new Date().toISOString(),
    };
    
    saveStoredData(newData);
    setData(newData);
    setCanClaim(false);

    onClaim?.(reward.coins);
    
    // Play sound effect
    try {
      const audio = new Audio('/audio/coin.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const rewards: DailyReward[] = weeklyRewards.map((r, i) => ({
    ...r,
    claimed: i < (data.streak % 7),
    isToday: i === currentDay - 1,
  }));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>✕</button>
        
        <div style={styles.header}>
          <h2 style={styles.title}>🎁 Daily Rewards</h2>
          <p style={styles.subtitle}>Login every day for bonus rewards!</p>
        </div>

        <div style={styles.streakBar}>
          <span style={styles.streakText}>🔥 {data.streak} Day Streak</span>
        </div>

        <div style={styles.grid}>
          {rewards.map(reward => (
            <div 
              key={reward.day}
              style={{
                ...styles.dayCard,
                ...(reward.isToday ? styles.dayCardToday : {}),
                ...(reward.claimed ? styles.dayCardClaimed : {}),
              }}
            >
              <div style={styles.dayNumber}>Day {reward.day}</div>
              <div style={styles.dayReward}>
                {reward.claimed ? '✓' : reward.reward}
              </div>
              <div style={styles.dayCoins}>{reward.coins}</div>
            </div>
          ))}
        </div>

        <button
          style={{
            ...styles.claimButton,
            ...(!canClaim ? styles.claimButtonDisabled : {}),
          }}
          onClick={handleClaim}
          disabled={!canClaim}
        >
          {canClaim 
            ? `Claim ${weeklyRewards[currentDay - 1].coins} Coins!` 
            : 'Come back tomorrow!'
          }
        </button>
      </div>
    </div>
  );
}

export default DailyRewards;
