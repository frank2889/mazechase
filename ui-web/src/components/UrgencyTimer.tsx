import React, { useState, useEffect } from 'react';

interface Props {
  endTime: Date;
  onExpire?: () => void;
}

export function UrgencyTimer({ endTime, onExpire }: Props) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  
  function getTimeLeft() {
    const diff = endTime.getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000)
    };
  }
  
  useEffect(() => {
    const timer = setInterval(() => {
      const left = getTimeLeft();
      setTimeLeft(left);
      if (left.hours === 0 && left.minutes === 0 && left.seconds === 0) {
        onExpire?.();
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  
  const { hours, minutes, seconds } = timeLeft;
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return (
    <div className="urgency-timer">
      <span className="urgency-label">⏰ Offer ends in:</span>
      <span className="urgency-time">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
