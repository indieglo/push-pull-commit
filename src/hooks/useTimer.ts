import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(defaultSeconds = 90) {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            // Vibrate when timer completes
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, secondsLeft]);

  const start = useCallback((seconds?: number) => {
    const duration = seconds ?? defaultSeconds;
    setTotalSeconds(duration);
    setSecondsLeft(duration);
    setIsRunning(true);
  }, [defaultSeconds]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const skip = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  return {
    isRunning,
    secondsLeft,
    progress,
    isComplete: !isRunning && secondsLeft === 0 && totalSeconds > 0,
    start,
    stop,
    skip,
  };
}
