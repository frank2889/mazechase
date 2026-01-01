// TypeScript content with proper types

import html2canvas from 'html2canvas';

interface ScreenshotOptions {
  elementId: string;
  onSuccess: (imageUrl: string) => void;
  onError: (error: Error) => void;
}

export function captureScreenshot(options: ScreenshotOptions): void {
  const element = document.getElementById(options.elementId);
  if (!element) {
    options.onError(new Error('Element not found'));
    return;
  }

  html2canvas(element, { backgroundColor: null })
    .then((canvas) => {
      const imageUrl = canvas.toDataURL('image/png');
      options.onSuccess(imageUrl);
    })
    .catch((error) => {
      options.onError(error);
    });
}

export function shareOnTwitter(imageUrl: string, text: string): void {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(imageUrl)}`;
  window.open(twitterUrl, '_blank');
}
