import { useEffect, useCallback } from 'react';
import { useUIStore } from '../store';

/**
 * Custom hook for handling rate limit state with countdown and progress bar
 * 
 * @param {string} requestKey - The request key to track (e.g., 'generate_vpn')
 * @param {function} onRetry - Callback function to call when rate limit expires
 * @returns {object} - { isRateLimited, countdown, progress, retryAfter }
 */
export function useRateLimit(requestKey, onRetry = null) {
  const {
    rateLimitState,
    setRateLimited,
    updateRateLimitCountdown,
    clearRateLimit,
    isRateLimitedForRequest,
  } = useUIStore();

  const isRateLimited = isRateLimitedForRequest(requestKey);
  const countdown = rateLimitState.countdown;
  const progress = rateLimitState.progress;
  const retryAfter = rateLimitState.retryAfter;

  // Handle countdown timer and progress bar
  useEffect(() => {
    if (!isRateLimited || rateLimitState.requestKey !== requestKey) {
      return;
    }

    const startTime = Date.now();
    const totalDuration = rateLimitState.retryAfter * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      const currentCountdown = Math.ceil(remaining / 1000);
      const currentProgress = ((totalDuration - remaining) / totalDuration) * 100;

      updateRateLimitCountdown(currentCountdown, currentProgress);

      if (remaining <= 0) {
        clearInterval(interval);
        clearRateLimit();
        
        // Auto-retry callback
        if (onRetry) {
          console.log('🔄 Rate limit expired, auto-retrying...');
          onRetry();
        }
      }
    }, 100); // Update every 100ms for smooth progress bar

    return () => clearInterval(interval);
  }, [isRateLimited, rateLimitState.requestKey, rateLimitState.retryAfter, requestKey, onRetry, clearRateLimit, updateRateLimitCountdown]);

  // Function to manually trigger rate limit state
  const triggerRateLimit = useCallback((retryAfterSeconds) => {
    console.log(`⏱️ Rate limit triggered for ${requestKey}, retry after ${retryAfterSeconds}s`);
    setRateLimited(retryAfterSeconds, requestKey);
  }, [requestKey, setRateLimited]);

  // Function to manually clear rate limit
  const clearRateLimitManual = useCallback(() => {
    console.log(`🔓 Rate limit cleared for ${requestKey}`);
    clearRateLimit();
  }, [requestKey, clearRateLimit]);

  return {
    isRateLimited,
    countdown,
    progress,
    retryAfter,
    triggerRateLimit,
    clearRateLimit: clearRateLimitManual,
  };
}

/**
 * Hook to check if a specific request is rate limited (without countdown)
 * 
 * @param {string} requestKey - The request key to check
 * @returns {boolean} - true if rate limited
 */
export function useIsRateLimited(requestKey) {
  return useUIStore((state) => 
    state.rateLimitState.isRateLimited && state.rateLimitState.requestKey === requestKey
  );
}
