/** Spectrogram thermal palette: abyssal indigo → deep blue → cyan → amber → warm white */

const STOPS: [number, [number, number, number]][] = [
  [0.0, [4, 18, 31]],
  [0.25, [11, 61, 107]],
  [0.5, [20, 184, 196]],
  [0.78, [240, 182, 79]],
  [1.0, [255, 247, 230]],
];

export function thermalColor(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (x >= t0 && x <= t1) {
      const k = (x - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** Normalize dB to 0..1 (95 dB dynamic range) */
export function dbToT(db: number, floor = -95, ceil = -20): number {
  return Math.min(1, Math.max(0, (db - floor) / (ceil - floor)));
}
