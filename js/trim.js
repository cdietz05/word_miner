// Where the sound is in a recording, so a parent's recording of "b" plays
// as just the "b" and not the second of silence and the tap of the button
// around it. The same rule tools/prepare_sounds.py applies to the bundled
// sounds, kept pure so it can be tested.

const WINDOW_SECONDS = 0.01;
const LEAD_SECONDS = 0.03;
const TAIL_SECONDS = 0.06;
const QUIET_GAP_SECONDS = 0.08;

// [start, end) sample indexes of the one stretch of sound around the
// loudest moment, or null for a recording with nothing in it.
export function soundSpan(samples, sampleRate)
{
  const window = Math.max(1, Math.round(sampleRate * WINDOW_SECONDS));
  const rms = [];
  for (let i = 0; i + window <= samples.length; i += window)
  {
    let sum = 0;
    for (let j = i; j < i + window; j++)
    {
      sum += samples[j] * samples[j];
    }
    rms.push(Math.sqrt(sum / window));
  }
  if (rms.length === 0)
  {
    return null;
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  if (peak < 0.01)
  {
    return null;
  }
  const threshold = Math.max(floor * 3, peak * 0.12);
  const above = rms.map((value) => value > threshold);
  const gap = Math.round(QUIET_GAP_SECONDS / WINDOW_SECONDS);
  const loudest = rms.indexOf(peak);
  const anyAbove = (from, to) => above.slice(Math.max(0, from), Math.max(0, to)).some(Boolean);

  let first = loudest;
  while (first > 0 && anyAbove(first - gap, first))
  {
    first -= 1;
  }
  let last = loudest;
  while (last < rms.length - 1 && anyAbove(last + 1, last + 1 + gap))
  {
    last += 1;
  }
  const start = Math.max(0, Math.round((first * WINDOW_SECONDS - LEAD_SECONDS) * sampleRate));
  const end = Math.min(samples.length, Math.round(((last + 1) * WINDOW_SECONDS + TAIL_SECONDS) * sampleRate));
  return [start, end];
}
