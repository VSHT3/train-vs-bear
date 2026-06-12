export type Seed = number | string;

export function normalizeSeed(seed: Seed | undefined): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }

  if (typeof seed === 'string' && /^\d+$/.test(seed.trim())) {
    return Number(seed) >>> 0;
  }

  const value = seed ?? 'train-vs-bear';
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deriveSeed(seed: Seed, salt: Seed): number {
  return normalizeSeed(`${normalizeSeed(seed)}:${String(salt)}`);
}

export function createSeededRandom(seed: Seed): () => number {
  let state = normalizeSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
