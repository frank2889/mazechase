// Subscription feature for MazeChase+

export const subscriptionDetails = {
  name: 'MazeChase+',
  price: '$3.99/month',
  benefits: [
    'ad-free',
    'daily bonus',
    'exclusive cosmetics'
  ],
  priority: 5
};

export function isSubscribed(user) {
  // Placeholder function to check subscription status
  return user.subscription === 'MazeChase+';
}
