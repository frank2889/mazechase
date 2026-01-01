/**
 * Stripe Payment Integration
 * 
 * Real payment flow for MazeChase monetization
 */

import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

// Initialize Stripe (use test key for now)
let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!stripePromise) {
    // Use test key - replace with live key in production
    const key = import.meta.env.PUBLIC_STRIPE_KEY || 'pk_test_YOUR_KEY_HERE';
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// Product type
export type ProductKey = keyof typeof PRODUCTS;

// Product IDs (create these in Stripe Dashboard)
export const PRODUCTS = {
  BATTLE_PASS: {
    priceId: 'price_battlepass_499', // $4.99
    name: 'Battle Pass',
    price: 499, // cents
  },
  VIP_MONTHLY: {
    priceId: 'price_vip_monthly_399', // $3.99/month
    name: 'MazeChase+ Monthly',
    price: 399,
    recurring: true,
  },
  STARTER_PACK: {
    priceId: 'price_starter_499', // $4.99 (one-time)
    name: 'Starter Pack',
    price: 499,
  },
  COINS_500: {
    priceId: 'price_coins_099', // $0.99
    name: '500 Coins',
    price: 99,
  },
  COINS_2500: {
    priceId: 'price_coins_399', // $3.99
    name: '2500 Coins',
    price: 399,
  },
  COINS_10000: {
    priceId: 'price_coins_999', // $9.99
    name: '10000 Coins',
    price: 999,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

/**
 * Create a checkout session and redirect to Stripe
 */
export async function checkout(productKey: ProductKey, userId: string): Promise<void> {
  const product = PRODUCTS[productKey];
  
  try {
    // Call our backend to create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: product.priceId,
        userId,
        productName: product.name,
        successUrl: `${window.location.origin}/payment/success?product=${productKey}`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
      }),
    });

    const { sessionId, error } = await response.json();
    
    if (error) {
      throw new Error(error);
    }

    // Redirect to Stripe Checkout
    const stripe = await getStripe();
    if (stripe) {
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) {
        throw stripeError;
      }
    }
  } catch (err) {
    console.error('Payment error:', err);
    throw err;
  }
}

/**
 * Quick buy with Stripe Payment Links (no backend needed!)
 * Create these links in Stripe Dashboard
 */
export const PAYMENT_LINKS = {
  BATTLE_PASS: 'https://buy.stripe.com/test_battlepass',
  VIP_MONTHLY: 'https://buy.stripe.com/test_vip',
  STARTER_PACK: 'https://buy.stripe.com/test_starter',
} as const;

export function buyWithLink(product: keyof typeof PAYMENT_LINKS, userId: string) {
  const link = PAYMENT_LINKS[product];
  // Add user ID as client reference
  window.open(`${link}?client_reference_id=${userId}`, '_blank');
}

/**
 * Check if user has active subscription
 */
export async function checkSubscription(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/subscription/${userId}`);
    const { active } = await response.json();
    return active;
  } catch {
    return false;
  }
}

/**
 * Get user's purchase history
 */
export async function getPurchases(userId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/purchases/${userId}`);
    const { products } = await response.json();
    return products;
  } catch {
    return [];
  }
}
