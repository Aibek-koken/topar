import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function compute(deadline: string): Countdown {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

export function useCountdown(deadline: string): Countdown {
  const [value, setValue] = useState(() => compute(deadline));

  useEffect(() => {
    setValue(compute(deadline));
    const interval = setInterval(() => {
      const next = compute(deadline);
      setValue(next);
      if (next.expired) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return value;
}
