// TypeScript content with proper types

import { showError } from '../utils';

interface SeasonStarterPack {
  name: string;
  price: string;
  contents: string[];
  purchase(): Promise<void>;
}

const seasonStarterPack: SeasonStarterPack = {
  name: 'Season Starter Pack',
  price: '$4.99',
  contents: [
    '1,000 pellets',
    '1 exclusive skin',
    '2x power-up duration for next game'
  ],
  async purchase() {
    try {
      // Simulate a purchase request
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: this.name
        })
      });

      if (!response.ok) {
        throw new Error('Purchase failed');
      }

      const result = await response.json();
      console.log('Purchase successful:', result);
    } catch (error) {
      showError('Failed to purchase Season Starter Pack');
      console.error(error);
    }
  }
};

export default seasonStarterPack;
