import { useEffect, useState, useCallback } from "react";

const LIMIT = 5;
const WINDOW = 15 * 60 * 1000;

export const useApiLimiter = () => {
  const [remaining, setRemaining] = useState(LIMIT);
  const [resetTime, setResetTime] = useState(0);
  const [isLimited, setIsLimited] = useState(false);

  const getStore = () => {
    return JSON.parse(localStorage.getItem("rateLimiter") || "{}");
  };

  const saveStore = (data) => {
    localStorage.setItem("rateLimiter", JSON.stringify(data));
  };

  const cleanCalls = (calls, now) => {
    return calls.filter((t) => now - t < WINDOW);
  };

  const checkLimit = useCallback(() => {
    const now = Date.now();
    let store = getStore();

    let calls = store.calls || [];
    calls = cleanCalls(calls, now);

    let windowStart = store.windowStart;

    // start window if none
    if (!windowStart || now - windowStart > WINDOW) {
      windowStart = now;
      calls = [];
    }

    const remainingCalls = LIMIT - calls.length;

    if (remainingCalls <= 0) {
      const reset = windowStart + WINDOW;

      setIsLimited(true);
      setRemaining(0);
      setResetTime(reset);

      saveStore({ calls, windowStart });

      return false;
    }

    calls.push(now);

    saveStore({
      calls,
      windowStart,
    });

    setRemaining(LIMIT - calls.length);
    setIsLimited(false);
    setResetTime(windowStart + WINDOW);

    return true;
  }, []);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const store = getStore();

      let calls = store.calls || [];
      let windowStart = store.windowStart;

      calls = cleanCalls(calls, now);

      if (!windowStart || now - windowStart > WINDOW) {
        windowStart = now;
        calls = [];
        saveStore({ calls, windowStart });
      }

      const remainingCalls = LIMIT - calls.length;

      setRemaining(Math.max(remainingCalls, 0));
      setResetTime(windowStart + WINDOW);
      setIsLimited(remainingCalls <= 0);
    };

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    checkLimit,
    remaining,
    resetTime,
    isLimited,
  };
};