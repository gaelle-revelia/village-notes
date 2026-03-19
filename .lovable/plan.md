

## Findings

### 1. File
All chrono logic lives in **`src/pages/OutilsActiviteChrono.tsx`** — no custom hook.

### 2. Current approach (broken)
Line 92: `setInterval(() => setSeconds((s) => s + 1), 1000)`

This is a **counter-based** timer: it increments `seconds` state by 1 every interval tick. When the phone screen locks, the browser suspends JS timers, so ticks are lost and the displayed time falls behind real elapsed time.

### 3. Minimal fix

Replace the counter with a **`Date.now()` wall-clock reference**:

- Add a `startTimeRef = useRef<number>(Date.now())` and an `accumulatedRef = useRef<number>(0)` (to handle pause/resume).
- On **start / resume**: set `startTimeRef.current = Date.now()`.
- On **pause**: add `Date.now() - startTimeRef.current` to `accumulatedRef.current`.
- The interval (kept at ~1 s for display refresh) computes:
  ```
  setSeconds(accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
  ```
- On **"Terminer"**: same formula for the final value.

This way, even if the interval is frozen for minutes during screen lock, the next tick after wake recalculates from the real clock and self-corrects instantly.

**Changes scoped to ~15 lines** in `OutilsActiviteChrono.tsx`:
- Replace `seconds` increment logic in the timer `useEffect` (lines 90-96)
- Add two refs (`startTimeRef`, `accumulatedRef`)
- Update pause toggle handler and `handleTerminer` to snapshot accumulated time

No other file touched.

