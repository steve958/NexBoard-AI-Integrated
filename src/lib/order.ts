export function midKey(): string {
  return 'n0';
}

// Generate a key between a and b (lexicographic fractional ordering)
export function between(a?: string | null, b?: string | null): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const min = '0';
  const max = 'z';

  if (!a && !b) return 'n0';
  if (!a) return decrement(b!);
  if (!b) return increment(a);

  let i = 0;
  while (true) {
    const ca = i < a.length ? a[i] : min;
    const cb = i < b.length ? b[i] : max;
    if (ca === cb) { i++; continue; }
    const ai = base.indexOf(ca);
    const bi = base.indexOf(cb);
    if (bi - ai > 1) {
      const mid = base[Math.floor((ai + bi) / 2)];
      return a.slice(0, i) + mid;
    }
    i++;
  }
}

export function increment(key: string): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const last = key[key.length - 1];
  const idx = base.indexOf(last);
  if (idx < base.length - 1) return key.slice(0, -1) + base[idx + 1];
  return key + '0';
}

export function decrement(key: string): string {
  const base = '0123456789abcdefghijklmnopqrstuvwxyz';
  const first = key[key.length - 1];
  const idx = base.indexOf(first);
  if (idx > 0) return key.slice(0, -1) + base[idx - 1];
  return key + '0';
}
