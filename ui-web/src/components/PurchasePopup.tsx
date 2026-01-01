import React, { useEffect, useState } from 'react';
import { checkout, PRODUCTS } from '../lib/payments/stripe';

interface Props {
  trigger: 'death' | 'levelComplete' | 'lowCoins';
  userId: string;
  onClose: () => void;
}

const MESSAGES = {
  death: { title: 'Continue?', text: 'Use a revive to keep your streak!', product: 'COINS_500' },
  levelComplete: { title: '🎉 Great Job!', text: 'Celebrate with bonus coins!', product: 'STARTER_PACK' },
  lowCoins: { title: 'Running Low?', text: 'Get more coins to unlock skins!', product: 'COINS_2500' }
};

export function PurchasePopup({ trigger, userId, onClose }: Props) {
  const msg = MESSAGES[trigger];
  const product = PRODUCTS[msg.product as keyof typeof PRODUCTS];
  
  return (
    <div className="purchase-popup-overlay" onClick={onClose}>
      <div className="purchase-popup" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>{msg.title}</h2>
        <p>{msg.text}</p>
        <div className="popup-offer">
          <span className="price">{product.price}</span>
          <button 
            className="buy-btn"
            onClick={() => checkout(msg.product, userId)}
          >
            {product.name}
          </button>
        </div>
        <button className="skip-btn" onClick={onClose}>No thanks</button>
      </div>
    </div>
  );
}
