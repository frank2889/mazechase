// Daily Challenge Feature

import { getUserInfo } from '../auth.ts';
import { trackEvent } from './analytics';

interface DailyChallenge {
  id: string;
  description: string;
  rewardType: 'cosmetic' | 'currency';
  rewardAmount: number;
  completed: boolean;
}

const dailyChallenges: DailyChallenge[] = [
  {
    id: 'challenge_001',
    description: 'Collect 100 pellets in a single game',
    rewardType: 'currency',
    rewardAmount: 50,
    completed: false
  },
  {
    id: 'challenge_002',
    description: 'Win 3 games as a runner',
    rewardType: 'cosmetic',
    rewardAmount: 1,
    completed: false
  }
];

export async function getDailyChallenge(): Promise<DailyChallenge | null> {
  const user = await getUserInfo();
  if (!user) return null;

  // Fetch or generate daily challenge for the user
  const challenge = dailyChallenges[Math.floor(Math.random() * dailyChallenges.length)];
  return challenge;
}

export function completeChallenge(challengeId: string): void {
  const challenge = dailyChallenges.find(c => c.id === challengeId);
  if (challenge && !challenge.completed) {
    challenge.completed = true;
    trackEvent('challenge_completed', { challengeId });
    // Reward logic here
  }
}
