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
  const last = k[k.length - 1];
  const idx = base.indexOf(last);
  if (idx > 0) return k.slice(0, -1) + base[idx - 1];
  return k + '0';
}
