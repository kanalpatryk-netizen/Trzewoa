/** Deterministyczny generator — ten sam ziarno daje tę samą górę. */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 1; }

  next(): number {
    // mulberry32
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(n: number): number { return (this.next() * n) | 0; }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[(this.next() * arr.length) | 0]; }
}

/** Szum wartościowy na siatce + fbm. Dość dobry na jaskinie, tani jak barszcz. */
export class Noise {
  private p: Float32Array;
  private readonly size = 256;
  constructor(rng: Rng) {
    this.p = new Float32Array(this.size * this.size);
    for (let i = 0; i < this.p.length; i++) this.p[i] = rng.next();
  }

  private at(x: number, y: number): number {
    const xi = ((x | 0) % this.size + this.size) % this.size;
    const yi = ((y | 0) % this.size + this.size) % this.size;
    return this.p[yi * this.size + xi];
  }

  value(x: number, y: number): number {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = this.at(x0, y0), b = this.at(x0 + 1, y0);
    const c = this.at(x0, y0 + 1), d = this.at(x0 + 1, y0 + 1);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  }

  fbm(x: number, y: number, oct = 4, lac = 2, gain = 0.5): number {
    let f = 1, amp = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += this.value(x * f, y * f) * amp;
      norm += amp;
      f *= lac; amp *= gain;
    }
    return sum / norm;
  }
}
