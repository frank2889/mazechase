import React from 'react';
import { checkout } from '../lib/payments/stripe';

interface Props {
  feature: string;
  userId: string;
}

export function VIPTeaser({ feature, userId }: Props) {
  return (
    <div className="vip-teaser">
      <div className="vip-lock">🔒</div>
      <p>This {feature} is VIP only</p>
      <button 
        className="vip-unlock-btn"
        onClick={() => checkout('VIP_MONTHLY', userId)}
      >
        Unlock with VIP - $3.99/mo
      </button>
    </div>
  );
}
