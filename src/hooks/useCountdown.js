import { useState, useEffect } from "react";

const COUNTDOWN_START_UTC = "2026-02-23T09:00:00Z";
const COUNTDOWN_END_UTC = "2026-02-25T14:00:00Z";

const startDate = new Date(COUNTDOWN_START_UTC);
const endDate = new Date(COUNTDOWN_END_UTC);

function getTimeLeft() {
  const now = new Date();
  if (now < startDate) return null;
  if (now >= endDate) return null;
  return Math.max(0, endDate - now);
}

function formatTimeLeft(ms) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function useCountdown() {
  const [timeLeftMs, setTimeLeftMs] = useState(null);

  useEffect(() => {
    const tick = () => {
      const left = getTimeLeft();
      setTimeLeftMs(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCountdownActive = timeLeftMs !== null;
  const formatted = timeLeftMs != null ? formatTimeLeft(timeLeftMs) : null;

  return {
    isCountdownActive,
    timeLeftMs,
    formatted,
    endDate,
  };
}
