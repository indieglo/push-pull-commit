import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(defaultSeconds = 90) {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const endTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Use timestamp-based calculation so the timer stays accurate
  // even when the browser throttles or the app goes to background
  const tick = useCallback(() => {
    if (!endTimeRef.current) return;

    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);

    if (remaining <= 0) {
      setIsRunning(false);
      endTimeRef.current = null;
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (isRunning) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  // When the page becomes visible again (user switches back to app),
  // immediately recalculate the timer from the stored end time
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && endTimeRef.current) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tick]);

  const start = useCallback((seconds?: number) => {
    const duration = seconds ?? defaultSeconds;
    setTotalSeconds(duration);
    setSecondsLeft(duration);
    endTimeRef.current = Date.now() + duration * 1000;
    setIsRunning(true);
  }, [defaultSeconds]);

  const stop = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const skip = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(0);
    endTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
