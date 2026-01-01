import React from 'react';
import { BuyButton } from './BuyButton';

interface Props {
  hasFirstPurchase: boolean;
}

export function FirstPurchaseBonus({ hasFirstPurchase }: Props) {
  if (hasFirstPurchase) return null;
  
  return (
    <div className="first-purchase-bonus">
      <div className="bonus-badge">🎁 FIRST PURCHASE</div>
      <h3>Double Value!</h3>
      <p>Your first purchase gets <strong>2X coins</strong></p>
      <div className="bonus-offer">
        <span className="original">500 coins</span>
        <span className="arrow">→</span>
        <span className="bonus">1000 coins</span>
      </div>
      <BuyButton productId="COINS_500" variant="gold">
        Buy Now - $0.99
      </BuyButton>
    </div>
  );
}
