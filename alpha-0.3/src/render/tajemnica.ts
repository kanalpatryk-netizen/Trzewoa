import type { Plate } from './plate';
import type { Camera } from './camera';
import type { Sim } from '../sim/sim';
import { MEM_SPAN } from '../sim/world';

/**
 * Warstwa, która robi z płyty starą, zakazaną rycinę: rytowana ciemność na brzegach
 * oddychająca razem z rdzeniem, patyna odbitki, skala głębokości w piśmie, którego
 * nikt nie zna, i znaki wyryte w skale, zanim ktokolwiek tam dotarł — widać je tylko
 * tam, gdzie jeszcze nikt nie patrzył, i gasną, kiedy światło do nich dojdzie.
 */

// ------------------------------------------------------------------ nieznane pismo

const glify = new Map<number, Path2D>();

function losy(ziarno: number): () => number {
  let s = (ziarno * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Glif na siatce 3×3 w polu [-1, 1]: pień, dwie–cztery kreski między węzłami,
 * czasem oczko albo haczyk. `zawilosc` dokłada kresek — im głębiej, tym dziwniej.
 */
export function glif(ziarno: number, zawilosc = 0): Path2D {
  const klucz = ziarno * 8 + Math.min(7, zawilosc);
  const gotowy = glify.get(klucz);
  if (gotowy) return gotowy;
  const r = losy(ziarno + 17);
  const p = new Path2D();
  const w = (i: number) => (i - 1) * 0.9;           // węzeł siatki
  if (r() < 0.7) {
    const x = w([0, 1, 1, 2][(r() * 4) | 0]);
    p.moveTo(x, -0.95); p.lineTo(x, 0.95);
  }
  const kresek = 2 + ((r() * 2) | 0) + Math.min(3, zawilosc);
  for (let k = 0; k < kresek; k++) {
    const a = (r() * 9) | 0, b = (a + 1 + ((r() * 7) | 0)) % 9;
    const x1 = w(a % 3), y1 = w((a / 3) | 0), x2 = w(b % 3), y2 = w((b / 3) | 0);
    p.moveTo(x1, y1);
    if (r() < 0.3) p.quadraticCurveTo((x1 + x2) / 2 + (r() - 0.5) * 1.2, (y1 + y2) / 2 + (r() - 0.5) * 1.2, x2, y2);
    else p.lineTo(x2, y2);
  }
  if (r() < 0.35) {
    const a = (r() * 9) | 0;
    const x = w(a % 3), y = w((a / 3) | 0);
    p.moveTo(x + 0.28, y); p.arc(x, y, 0.28, 0, Math.PI * 2);
  }
  if (r() < 0.3) { const x = w((r() * 3) | 0); p.moveTo(x - 0.15, 1.2); p.lineTo(x + 0.15, 1.2); }
  glify.set(klucz, p);
  return p;
}

// ---------------------------------------------------------------- oddech rdzenia

/**
 * Oddech rdzenia 0..1 — ten sam rytm, którym dudni rezonans skały; jeśli dźwięk
 * nie ruszył, liczymy go z zegara. Sen wydłuża i pogłębia oddech.
 */
export function oddechRdzenia(sim: Sim, teraz: number, zDzwieku: number | null): number {
  const s = zDzwieku ?? Math.sin((teraz / 1000) * (0.5 + sim.sen * 2));
  return 0.5 + 0.5 * s;
}

// ------------------------------------------------------------ bufory pod płytę

interface Bufor { c: HTMLCanvasElement; w: number; h: number; k: number }

function nowyBufor(w: number, h: number, k: number): Bufor {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  return { c, w, h, k };
}

function skalaEkranu(ctx: CanvasRenderingContext2D): number {
  const t = ctx.getTransform();
  return Math.min(3, Math.max(1, Math.hypot(t.a, t.b)));
}

/**
 * Rytowana winieta: brzegi płyty nie ciemnieją gradientem, tylko gęstnieją kreską —
 * najpierw pojedyncze ukośne, w rogach krzyżowe, jak cień na starym miedziorycie.
 */
function rysujWiniete(b: Bufor): void {
  const g = b.c.getContext('2d')!;
  const { w, h, k } = b;
  g.setTransform(k, 0, 0, k, 0, 0);
  const cx = w / 2, cy = h / 2;
  // miękki cień pod kreską
  g.save();
  g.translate(cx, cy);
  g.scale(w / 2, h / 2);
  const rg = g.createRadialGradient(0, 0, 0.55, 0, 0, 1.45);
  rg.addColorStop(0, 'rgba(6,4,3,0)');
  rg.addColorStop(0.4, 'rgba(6,4,3,0.18)');
  rg.addColorStop(1, 'rgba(4,3,2,0.6)');
  g.fillStyle = rg;
  g.fillRect(-1, -1, 2, 2);
  g.restore();

  // siła kreski: 0 w środku, 1 w rogu — elipsa dopasowana do płyty
  const sila = (x: number, y: number) => {
    const dx = (x - cx) / (w / 2), dy = (y - cy) / (h / 2);
    const d = Math.sqrt(dx * dx * 0.8 + dy * dy * 0.8 + Math.max(dx * dx, dy * dy) * 0.35);
    return Math.max(0, Math.min(1, (d - 0.72) / 0.5));
  };
  const POZIOMY = 7;
  const sciezki: Path2D[] = Array.from({ length: POZIOMY }, () => new Path2D());
  const r = losy(91);
  const kreskuj = (kier: number, odstep: number, prog: number) => {
    for (let c = -h; c < w; c += odstep) {
      const drg = (r() - 0.5) * 0.8;
      let x = kier > 0 ? c : c + h, y = 0;
      const krok = 7;
      while (y < h) {
        const nx = x + krok * 0.7 * kier, ny = y + krok * 0.7;
        const s = sila((x + nx) / 2, (y + ny) / 2);
        if (s > prog && x > -8 && x < w + 8) {
          const poz = Math.min(POZIOMY - 1, Math.floor(((s - prog) / (1 - prog)) * POZIOMY));
          // przerwy w kresce: rylec nie jest maszyną
          if (r() > 0.08) {
            sciezki[poz].moveTo(x + drg, y);
            sciezki[poz].lineTo(nx + drg, ny);
          }
        }
        x = nx; y = ny;
      }
    }
  };
  kreskuj(1, 3.2, 0.12);
  kreskuj(-1, 4.1, 0.55);
  g.lineCap = 'round';
  for (let i = 0; i < POZIOMY; i++) {
    g.strokeStyle = `rgba(3,2,2,${0.08 + (i / (POZIOMY - 1)) * 0.46})`;
    g.lineWidth = 0.7 + i * 0.09;
    g.stroke(sciezki[i]);
  }
}

/**
 * Patyna odbitki: odciśnięty brzeg płyty, plamki starego papieru, kilka rys,
 * nierówno wytarta farba. Nieruchoma względem płyty — to przedmiot, nie świat.
 */
function rysujPatyne(b: Bufor): void {
  const g = b.c.getContext('2d')!;
  const { w, h, k } = b;
  g.setTransform(k, 0, 0, k, 0, 0);
  const r = losy(7 + ((w * 31 + h) | 0));
  // nierówno wytarta farba: kilka wielkich, prawie niewidocznych plam
  for (let i = 0; i < 7; i++) {
    const x = r() * w, y = r() * h, rr = (0.12 + r() * 0.22) * Math.max(w, h);
    const rg = g.createRadialGradient(x, y, 0, x, y, rr);
    const a = 0.03 + r() * 0.04;
    rg.addColorStop(0, `rgba(10,6,4,${a})`);
    rg.addColorStop(1, 'rgba(10,6,4,0)');
    g.fillStyle = rg;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // plamki: ciemne rdzawe i jasne wytarcia
  const plamek = Math.round((w * h) / 16000);
  for (let i = 0; i < plamek; i++) {
    const x = r() * w, y = r() * h, rr = 0.5 + r() * r() * 2.4;
    const jasna = r() < 0.35;
    g.fillStyle = jasna ? `rgba(226,206,170,${0.03 + r() * 0.05})` : `rgba(24,12,6,${0.06 + r() * 0.1})`;
    g.beginPath();
    g.ellipse(x, y, rr, rr * (0.6 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // rysy: długie, cienkie, prawie proste
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI, d = 30 + r() * Math.min(w, h) * 0.3;
    g.strokeStyle = `rgba(232,216,188,${0.025 + r() * 0.03})`;
    g.lineWidth = 0.5 + r() * 0.4;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * d * 0.5 + (r() - 0.5) * 12, y + Math.sin(a) * d * 0.5 + (r() - 0.5) * 12,
      x + Math.cos(a) * d, y + Math.sin(a) * d);
    g.stroke();
  }
  // odcisk płyty: jasna krawędź od góry i z lewej, ciemna od dołu i z prawej
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(236,220,190,0.09)';
  g.beginPath(); g.moveTo(2.5, h - 2.5); g.lineTo(2.5, 2.5); g.lineTo(w - 2.5, 2.5); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.moveTo(w - 2.5, 2.5); g.lineTo(w - 2.5, h - 2.5); g.lineTo(2.5, h - 2.5); g.stroke();
}

export class Tajemnica {
  private winieta: Bufor | null = null;
  private patyna: Bufor | null = null;

  private bufor(stary: Bufor | null, p: Pick<Plate, 'w' | 'h'>, k: number, rysuj: (b: Bufor) => void): Bufor {
    if (stary && stary.w === p.w && stary.h === p.h && stary.k === k) return stary;
    const b = nowyBufor(p.w, p.h, k);
    rysuj(b);
    return b;
  }

  /** Winieta i patyna nad światem, pod ramą. `oddech` 0..1 zaciska i rozluźnia ciemność. */
  brzegi(ctx: CanvasRenderingContext2D, p: Pick<Plate, 'x' | 'y' | 'w' | 'h'>, oddech: number): void {
    const k = skalaEkranu(ctx);
    this.winieta = this.bufor(this.winieta, p, k, rysujWiniete);
    this.patyna = this.bufor(this.patyna, p, k, rysujPatyne);
    ctx.save();
    ctx.globalAlpha = 0.78 + 0.22 * oddech;
    ctx.drawImage(this.winieta.c, p.x, p.y, p.w, p.h);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.patyna.c, p.x, p.y, p.w, p.h);
    ctx.restore();
  }

  /**
   * Skala głębokości przy lewym brzegu: kreski co pięć kafli, co dwadzieścia —
   * cyfra nieznanego pisma. Im głębiej, tym więcej w cyfrach kresek.
   */
  skala(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, cam: Camera, oddech: number): void {
    const z = cam.zoom;
    const gora = cam.toWorldY(0), dol = cam.toWorldY(p.h);
    const x = p.x + 5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    const co = z >= 6 ? 5 : 10;
    const start = Math.max(0, Math.ceil(gora / co) * co);
    ctx.strokeStyle = 'rgba(214,196,160,0.3)';
    ctx.beginPath();
    for (let wy = start; wy <= Math.min(sim.world.h, dol); wy += co) {
      const y = p.y + cam.toScreenY(wy);
      const dlugi = wy % 20 === 0;
      ctx.moveTo(x, y + 0.5); ctx.lineTo(x + (dlugi ? 9 : 4), y + 0.5);
    }
    ctx.stroke();
    const rozm = 4.2;
    ctx.lineWidth = 1.5 / rozm;
    for (let wy = Math.ceil(gora / 20) * 20; wy <= Math.min(sim.world.h, dol); wy += 20) {
      if (wy < 0) continue;
      const y = p.y + cam.toScreenY(wy);
      const n = wy / 20;
      const d = sim.world.depth(wy);
      ctx.save();
      ctx.translate(x + 16, y);
      ctx.scale(rozm, rozm);
      // głębia czerwienieje, a każda cyfra lekko oddycha
      const a = 0.32 + 0.12 * oddech * d;
      ctx.strokeStyle = `rgba(${(214 - d * 60) | 0},${(196 - d * 120) | 0},${(160 - d * 110) | 0},${a})`;
      ctx.stroke(glif(300 + n, Math.floor(d * 4)));
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Znaki w nieznanej skale: stałe miejsca na mapie, ale widoczne tylko tam, gdzie
   * nikt jeszcze nie patrzył albo pamięć zgasła. Świecą ledwo, w rytmie rdzenia —
   * a kiedy czas stoi, pismo w skale wychodzi wyraźniej.
   */
  znaki(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, oddech: number, stoi = false): number {
    const w = sim.world;
    const z = cam.zoom;
    const x0 = cam.toWorldX(0), y0 = cam.toWorldY(0);
    const x1 = cam.toWorldX(cam.vw), y1 = cam.toWorldY(cam.vh);
    const KX = 17, KY = 15;
    const nieznane = (x: number, y: number) => {
      if (!w.inb(x, y)) return true;
      const i = w.idx(x, y);
      return !w.ever[i] || sim.tick - w.lastSeen[i] > MEM_SPAN;
    };
    const rozm = Math.max(7, Math.min(30, z * 2.1));
    const moc = stoi ? 1.9 : 1;
    let ile = 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let cy = Math.floor(y0 / KY); cy <= Math.floor(y1 / KY); cy++) {
      for (let cx = Math.floor(x0 / KX); cx <= Math.floor(x1 / KX); cx++) {
        const r = losy(cx * 7919 + cy * 104729 + 3);
        if (r() > 0.34) continue;
        const tx = cx * KX + 3 + Math.floor(r() * (KX - 6));
        const ty = cy * KY + 3 + Math.floor(r() * (KY - 6));
        if (!w.inb(tx, ty) || ty < w.surface[Math.max(0, Math.min(w.w - 1, tx))] + 8) continue;
        let ukryty = true;
        for (let dy = -2; dy <= 2 && ukryty; dy++) for (let dx = -2; dx <= 2; dx++) if (!nieznane(tx + dx, ty + dy)) { ukryty = false; break; }
        if (!ukryty) continue;
        const d = w.depth(ty);
        const sx = cam.toScreenX(tx + 0.5), sy = cam.toScreenY(ty + 0.5);
        ile++;
        const faza = r() * Math.PI * 2;
        const a = Math.min(0.5, (0.09 + 0.09 * oddech) * (0.6 + 0.4 * Math.sin(faza + oddech * 2)) * moc);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate((r() - 0.5) * 0.5);
        ctx.scale(rozm, rozm);
        ctx.lineWidth = 1.3 / rozm;
        ctx.strokeStyle = `rgba(${(200 + d * 30) | 0},${(170 - d * 90) | 0},${(120 - d * 80) | 0},${a})`;
        // co trzeci znak to pieczęć: glif w okręgu
        if (r() < 0.33) {
          ctx.beginPath(); ctx.arc(0, 0, 1.55, 0, Math.PI * 2); ctx.stroke();
          ctx.scale(0.8, 0.8);
          ctx.lineWidth = 1.3 / (rozm * 0.8);
        }
        ctx.stroke(glif(cx * 131 + cy * 977, Math.floor(d * 5)));
        ctx.restore();
      }
    }
    ctx.restore();
    return ile;
  }
}

/**
 * Astrolabium podziemia: pierścienie, podziałka, obracający się wieniec glifów
 * i oko pośrodku. Tło menu — nikt nie wie, co mierzy.
 */
export function rysujAstrolabium(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, teraz: number, oddech: number, alfa: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  const a = alfa * (0.8 + 0.2 * oddech);
  const kolor = (m: number) => `rgba(214,196,160,${a * m})`;
  ctx.lineWidth = 1;
  // pierścienie
  for (const [rr, m] of [[1, 0.5], [0.94, 0.3], [0.72, 0.4], [0.66, 0.22], [0.3, 0.35]] as const) {
    ctx.strokeStyle = kolor(m);
    ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, Math.PI * 2); ctx.stroke();
  }
  // podziałka między zewnętrznymi pierścieniami
  ctx.strokeStyle = kolor(0.35);
  ctx.beginPath();
  for (let i = 0; i < 120; i++) {
    const k = (i / 120) * Math.PI * 2;
    const dl = i % 10 === 0 ? 0.06 : i % 5 === 0 ? 0.04 : 0.02;
    ctx.moveTo(Math.cos(k) * r * 0.94, Math.sin(k) * r * 0.94);
    ctx.lineTo(Math.cos(k) * r * (0.94 - dl), Math.sin(k) * r * (0.94 - dl));
  }
  ctx.stroke();
  // wieniec glifów: obraca się tak wolno, że widać to dopiero po chwili
  const obrot = teraz * 0.0000125;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const k = obrot + (i / n) * Math.PI * 2;
    const gr = r * 0.035;
    ctx.save();
    ctx.translate(Math.cos(k) * r * 0.81, Math.sin(k) * r * 0.81);
    ctx.rotate(k + Math.PI / 2);
    ctx.scale(gr, gr);
    ctx.lineWidth = 1.2 / gr;
    ctx.strokeStyle = kolor(0.55);
    ctx.stroke(glif(500 + i, i % 4));
    ctx.restore();
  }
  // dwie wskazówki, jak na zegarze, który nie liczy godzin
  ctx.strokeStyle = kolor(0.45);
  ctx.beginPath();
  const w1 = -teraz * 0.000021, w2 = teraz * 0.0000071 + 2;
  ctx.moveTo(0, 0); ctx.lineTo(Math.cos(w1) * r * 0.64, Math.sin(w1) * r * 0.64);
  ctx.moveTo(0, 0); ctx.lineTo(Math.cos(w2) * r * 0.9, Math.sin(w2) * r * 0.9);
  ctx.stroke();
  // oko w środku: powieka i źrenica, która oddycha razem z rdzeniem
  ctx.strokeStyle = kolor(0.7);
  ctx.beginPath();
  const ow = r * 0.2, oh = r * 0.09;
  ctx.moveTo(-ow, 0); ctx.quadraticCurveTo(0, -oh * 2, ow, 0); ctx.quadraticCurveTo(0, oh * 2, -ow, 0);
  ctx.stroke();
  ctx.fillStyle = `rgba(190,60,40,${a * (0.35 + 0.4 * oddech)})`;
  ctx.beginPath(); ctx.arc(0, 0, r * (0.035 + 0.012 * oddech), 0, Math.PI * 2); ctx.fill();
  // promienie ku czterem stronom świata, których pod ziemią nie ma
  ctx.strokeStyle = kolor(0.25);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const k = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.moveTo(Math.cos(k) * r * 0.32, Math.sin(k) * r * 0.32);
    ctx.lineTo(Math.cos(k) * r * 0.64, Math.sin(k) * r * 0.64);
  }
  ctx.stroke();
  ctx.restore();
}
