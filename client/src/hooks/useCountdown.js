import { useCallback, useEffect, useState } from "react";

// Seconds left until a moment, ticking down on screen - how long an emailed
// code lasts, how long until another can be sent. `start(seconds)` sets it
// going (again); `remaining` is 0 once it is over.
export default function useCountdown() {
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  const start = useCallback((seconds) => {
    const time = Date.now();
    setNow(time);
    setDeadline(time + Math.max(0, seconds) * 1000);
  }, []);

  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  return [remaining, start];
}

// 299 -> "4:59"
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
