export function getStackColor(seed: number | string, index: number): number {
  if (index < 1 || !Number.isFinite(index)) throw new Error("index must be a 1-based positive integer");

  // --- seeded RNG (mulberry32) ---
  const s = typeof seed === "number" ? seed : stringToSeed(seed);
  const rng = mulberry32(s >>> 0);

  // Palette parameters (same seed → same sequence)
  const baseHue = Math.floor(rng() * 360);
  const stepDeg = 6 + Math.floor(rng() * 18);
  const dir = rng() < 0.5 ? 1 : -1;
  const baseSat = 45 + rng() * 20;
  const baseLight = 78 + rng() * 10;

  const i = index - 1;
  const wobble = (t: number, amp: number) => amp * Math.sin(t);
  const sat = clamp(baseSat + wobble(i * 0.35, 3), 40, 70);
  const light = clamp(baseLight + wobble(i * 0.3 + 0.7, 2.5), 72, 92);

  const hue = mod(baseHue + dir * stepDeg * i, 360);

  // Convert HSL → RGB
  const { r, g, b } = hslToRgb(hue, sat / 100, light / 100);

  // Return in 0xRRGGBB format (Three.js friendly)
  return (r << 16) | (g << 8) | b;
}

// --- helpers (same as before) ---

function stringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;

  if (0 <= hp && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (5 <= hp && hp < 6) [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
