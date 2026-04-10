/**
 * Timer Web Worker — wall-clock–accurate countdown.
 *
 * Uses Date.now() math instead of tick counting so the remaining time
 * is always accurate even when the browser throttles timers in background tabs.
 *
 * Commands received:
 *   START  { totalSeconds }  — count down from totalSeconds
 *   PAUSE                    — freeze at current remaining
 *   RESUME                   — continue from last remaining
 *   STOP                     — cancel and reset state
 *
 * Messages posted:
 *   TICK  { remaining }      — remaining seconds (integer), sent every ~250 ms
 *   DONE                     — countdown reached zero
 */

let intervalId = null;
let startedAt = null;       // wall-clock time when current run began
let totalSeconds = 0;       // seconds to count down in this run
let elapsedAtPause = 0;    // accumulated elapsed seconds before most recent pause

function getRemainingSeconds() {
  const nowElapsed = elapsedAtPause + (Date.now() - startedAt) / 1000;
  return Math.max(0, totalSeconds - nowElapsed);
}

function tick() {
  const remaining = Math.floor(getRemainingSeconds());
  self.postMessage({ type: 'TICK', remaining });
  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    self.postMessage({ type: 'DONE' });
  }
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'START':
      clearInterval(intervalId);
      totalSeconds    = data.totalSeconds;
      elapsedAtPause  = 0;
      startedAt       = Date.now();
      intervalId      = setInterval(tick, 250);
      tick(); // immediate first tick
      break;

    case 'PAUSE':
      if (startedAt !== null && intervalId !== null) {
        elapsedAtPause += (Date.now() - startedAt) / 1000;
        clearInterval(intervalId);
        intervalId = null;
        startedAt = null;
      }
      break;

    case 'RESUME':
      if (intervalId === null) {
        startedAt  = Date.now();
        intervalId = setInterval(tick, 250);
        tick();
      }
      break;

    case 'STOP':
      clearInterval(intervalId);
      intervalId     = null;
      startedAt      = null;
      elapsedAtPause = 0;
      totalSeconds   = 0;
      break;
  }
};
