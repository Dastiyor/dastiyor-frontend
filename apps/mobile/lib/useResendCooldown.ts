// Copy of apps/web/lib/useResendCooldown.ts; keep the two in step.
import { useCallback, useEffect, useState } from 'react';

/** Seconds before an SMS code can be asked for again. The server's own cap (3 per 15 min per number) stays. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Counts down from `seconds`, starting at once: whoever shows the resend
 * button has just sent a code. `restart()` begins a new countdown after a
 * resend. Counts against a deadline rather than ticks, so a throttled
 * background tab still lands on the right number.
 */
export function useResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
  const [deadline, setDeadline] = useState(() => Date.now() + seconds * 1000);
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
      const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
  }, [deadline]);

  const restart = useCallback(() => setDeadline(Date.now() + seconds * 1000), [seconds]);
  return { secondsLeft, restart };
}

/** 42 → "0:42", 60 → "1:00". */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
