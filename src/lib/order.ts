export function midKey(): string {
  return 'n0';
}

// Generate a key between a and b (lexicographic fractional ordering)
export function between(a?: string | null, b?: string | null): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const min = '0';
  const max = 'z';

  const as = typeof a === 'string' ? a : null;
  const bs = typeof b === 'string' ? b : null;

  if (!as && !bs) return 'n0';
  if (!as && bs) return safeDecrement(bs);
  if (as && !bs) return safeIncrement(as);

  let i = 0;
  while (true) {
    const ca = i < (as as string).length ? (as as string)[i] : min;
    const cb = i < (bs as string).length ? (bs as string)[i] : max;
    if (ca === cb) { i++; continue; }
    const ai = base.indexOf(ca);
    const bi = base.indexOf(cb);
    if (bi - ai > 1) {
      const mid = base[Math.floor((ai + bi) / 2)];
      return (as as string).slice(0, i) + mid;
    }
    i++;
  }
}

export function increment(key: string): string { return safeIncrement(key); }
export function decrement(key: string): string { return safeDecrement(key); }

function safeIncrement(key?: string | null): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const k = typeof key === 'string' && key.length > 0 ? key : 'n0';
  const last = k[k.length - 1];
  const idx = base.indexOf(last);
  if (idx >= 0 && idx < base.length - 1) return k.slice(0, -1) + base[idx + 1];
  return k + '0';
}

function safeDecrement(key?: string | null): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const k = typeof key === 'string' && key.length > 0 ? key : 'n0';

  // Walk from right to left and decrement the first non-min character,
  // setting all following characters to the max value. This guarantees
  // the result is strictly less than the original key (lexicographically),
  // which is required for correct "insert at top" behavior.
  for (let i = k.length - 1; i >= 0; i--) {
    const ch = k[i];
    const idx = base.indexOf(ch);
    if (idx > 0) {
      const lower = base[idx - 1];
      const suffix = base[base.length - 1].repeat(k.length - i - 1);
      return k.slice(0, i) + lower + suffix;
    }
  }

  // If every character is already at the minimum value, we cannot
  // generate a strictly smaller key within this alphabet. In practice
  // this should be extremely rare (our midKey is 'n0'), so we just
  // return the original key.
  return k;
}
