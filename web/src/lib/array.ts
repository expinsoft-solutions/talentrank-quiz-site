export function shuffleArray<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deterministic shuffle using a string seed. Use for resume so question order is stable. */
export function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
  const out = [...array];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const seededRandom = (max: number) => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return (h % max) / max;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(i + 1) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
