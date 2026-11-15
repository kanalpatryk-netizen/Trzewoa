/**
 * CERBER (Krąg Trzeci, beta) — trójgłowy pies, strażnik kręgu żarłoków (Piekło, pieśń VI): „oczy ma czerwone,
 * brodę tłustą i czarną, brzuch szeroki, ręce zbrojne w pazury”. Rysunek tuszem, jak cała gra: stopami w (0, 0),
 * pyskami w prawo, wysokość `h` (czubek najwyższej głowy). Ten sam rysunek służy posągowi w lochu (kamień, łańcuchy),
 * wstawaniu z gruzu, walce i konaniu (render/pomnik.ts).
 */

export interface GlowaCerbera {
  /** pochylenie głowy (radiany, + w dół), otwarcie paszczy 0…1, wysunięcie do przodu 0…1 (kłapnięcie) */
  pochyl: number; paszcza: number; wysun: number;
  /** oczy 0…1 (żar) */
  oczy: number;
}

export interface PozaCerbera {
  /** 0 — żywy, 1 — kamień (posąg) */
  kamien: number;
  /** 0 — stoi, 1 — leży jak sfinks (posąg, konanie) */
  lezy: number;
  /** chód: faza (radiany) i wielkość kroku 0…1 */
  faza: number; krok: number;
  /** staje dęba 0…1 (tupnięcie, uderzenie w ziemię), przysiad przed skokiem 0…1, odrzut do tyłu 0…1 */
  deba: number; przysiad: number; odrzut: number;
  glowy: [GlowaCerbera, GlowaCerbera, GlowaCerbera];
  /** ogon: wychylenie (−1…1) i smagnięcie 0…1 */
  ogon: number; bicz: number;
  /** rany 0…1 (żarzące się pęknięcia), złote światło konania 0…1, szał (czerwona poświata) 0…1 */
  rany: number; swiatlo: number; szal: number;
  /** oddech 0…1 (brzuch faluje) */
  oddech: number;
  /** ogień z paszczy środkowej głowy 0…1 */
  ogien: number;
  czas: number;
}

export function glowaSpokoj(oczy = 1): GlowaCerbera { return { pochyl: 0, paszcza: 0.08, wysun: 0, oczy }; }

export function pozaCerbera(): PozaCerbera {
  return {
    kamien: 0, lezy: 0, faza: 0, krok: 0, deba: 0, przysiad: 0, odrzut: 0,
    glowy: [glowaSpokoj(), glowaSpokoj(), glowaSpokoj()],
    ogon: 0, bicz: 0, rany: 0, swiatlo: 0, szal: 0, oddech: 0.5, ogien: 0, czas: 0,
  };
}

type P = [number, number];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const TUSZ = 'rgba(14,9,7,0.96)';

function barwa(a: [number, number, number], b: [number, number, number], t: number, al = 1): string {
  return `rgba(${mix(a[0], b[0], t) | 0},${mix(a[1], b[1], t) | 0},${mix(a[2], b[2], t) | 0},${al})`;
}

/** Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry). */
function los(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Kolano z biodra do łapy (dwa odcinki, zgięcie w stronę `zgiecie`). */
function kolano(a: P, b: P, l1: number, l2: number, zgiecie: number): P {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, (l1 + l2) * 0.999);
  const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const kat = Math.atan2(dy, dx) + zgiecie * Math.acos(Math.max(-1, Math.min(1, ca)));
  return [a[0] + Math.cos(kat) * l1, a[1] + Math.sin(kat) * l1];
}

interface Kolory { cialo: string; jasne: string; ciemne: string; grzywa: string }

function kolory(p: PozaCerbera, daleko: boolean): Kolory {
  const k = p.kamien;
  const z = daleko ? 0.72 : 1;
  const sc = (c: [number, number, number]): [number, number, number] => [c[0] * z, c[1] * z, c[2] * z];
  return {
    cialo: barwa(sc([38, 30, 26]), sc([92, 88, 80]), k),
    jasne: barwa(sc([84, 66, 52]), sc([158, 150, 136]), k),
    ciemne: barwa(sc([16, 12, 10]), sc([58, 54, 50]), k),
    grzywa: barwa(sc([12, 10, 9]), sc([70, 66, 60]), k),
  };
}

/** Łapa: udo, podudzie, stopa z pazurami. */
function lapa(ctx: CanvasRenderingContext2D, h: number, bio: P, stopa: P, l1: number, l2: number, zg: number, gr: number, kol: Kolory, lw: number): void {
  const kn = kolano(bio, stopa, l1 * h, l2 * h, zg);
  ctx.strokeStyle = TUSZ; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // obrys grubszą kreską, potem wypełnienie cieńszą — wygląda jak bryła z konturem
  for (const [w, kolor] of [[gr * h + lw * 2, TUSZ], [gr * h, kol.cialo]] as const) {
    ctx.strokeStyle = kolor; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(bio[0], bio[1]); ctx.lineTo(kn[0], kn[1]); ctx.lineTo(stopa[0], stopa[1]); ctx.stroke();
  }
  // światło na przodzie uda
  ctx.strokeStyle = kol.jasne; ctx.lineWidth = gr * h * 0.3; ctx.globalAlpha *= 0.5;
  ctx.beginPath(); ctx.moveTo(bio[0] + gr * h * 0.2, bio[1]); ctx.lineTo(kn[0] + gr * h * 0.15, kn[1]); ctx.stroke();
  ctx.globalAlpha /= 0.5;
  // stopa i pazury
  ctx.fillStyle = kol.cialo;
  ctx.beginPath(); ctx.ellipse(stopa[0] + h * 0.035, stopa[1] - h * 0.015, h * 0.06, h * 0.026, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = 'rgba(222,208,180,0.9)'; ctx.lineWidth = Math.max(0.8, lw * 0.8);
  for (let i = 0; i < 3; i++) {
    const x = stopa[0] + h * (0.06 + i * 0.016);
    ctx.beginPath(); ctx.moveTo(x, stopa[1] - h * 0.012); ctx.quadraticCurveTo(x + h * 0.02, stopa[1] - h * 0.01, x + h * 0.022, stopa[1] + h * 0.002); ctx.stroke();
  }
}

/** Jedna głowa w (0, 0) — kark; pysk w prawo. Zwraca punkt paszczy (do ognia i okupu). */
function glowa(ctx: CanvasRenderingContext2D, h: number, g: GlowaCerbera, kol: Kolory, lw: number, p: PozaCerbera, nr: number): P {
  const L = h * 0.3;
  ctx.save();
  ctx.rotate(g.pochyl);
  const szczeka = g.paszcza * 0.75;
  // żuchwa (pod spodem) — obraca się na zawiasie
  ctx.save();
  ctx.translate(L * 0.08, L * 0.12);
  ctx.rotate(szczeka);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(L * 0.4, L * 0.16, L * 0.86, L * 0.06);
  ctx.lineTo(L * 0.86, -L * 0.02);
  ctx.quadraticCurveTo(L * 0.4, L * 0.02, 0, -L * 0.06);
  ctx.closePath();
  ctx.fillStyle = kol.ciemne; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  if (g.paszcza > 0.15) {
    // dolne kły
    ctx.fillStyle = 'rgba(232,220,196,0.95)';
    for (let i = 0; i < 4; i++) {
      const x = L * (0.3 + i * 0.15);
      ctx.beginPath(); ctx.moveTo(x, -L * 0.01); ctx.lineTo(x + L * 0.04, -L * (0.1 + (i === 3 ? 0.06 : 0))); ctx.lineTo(x + L * 0.07, -L * 0.01); ctx.fill();
    }
  }
  ctx.restore();
  // gardło — czerwone wnętrze paszczy
  if (g.paszcza > 0.1) {
    ctx.fillStyle = p.kamien > 0.5 ? 'rgba(40,36,32,0.9)' : `rgba(${120 + 80 * p.ogien},${24 + 60 * p.ogien},${18},0.95)`;
    ctx.beginPath();
    ctx.moveTo(L * 0.1, L * 0.06);
    ctx.lineTo(L * 0.85, L * 0.04);
    ctx.lineTo(L * 0.08 + Math.cos(szczeka) * L * 0.78, L * 0.12 + Math.sin(szczeka) * L * 0.78);
    ctx.closePath(); ctx.fill();
  }
  // czaszka z pyskiem
  ctx.beginPath();
  ctx.moveTo(-L * 0.22, -L * 0.05);
  ctx.quadraticCurveTo(-L * 0.18, -L * 0.42, L * 0.12, -L * 0.36);
  ctx.quadraticCurveTo(L * 0.34, -L * 0.3, L * 0.48, -L * 0.18);
  ctx.quadraticCurveTo(L * 0.72, -L * 0.14, L * 0.94, -L * 0.06);
  ctx.quadraticCurveTo(L * 1.0, 0, L * 0.92, L * 0.06);
  ctx.lineTo(L * 0.1, L * 0.1);
  ctx.quadraticCurveTo(-L * 0.18, L * 0.2, -L * 0.22, -L * 0.05);
  ctx.closePath();
  const gr = ctx.createLinearGradient(0, -L * 0.4, 0, L * 0.1);
  gr.addColorStop(0, kol.jasne); gr.addColorStop(1, kol.cialo);
  ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  // górne kły
  if (g.paszcza > 0.15) {
    ctx.fillStyle = 'rgba(236,224,200,0.95)';
    for (let i = 0; i < 4; i++) {
      const x = L * (0.32 + i * 0.15);
      ctx.beginPath(); ctx.moveTo(x, L * 0.06); ctx.lineTo(x + L * 0.035, L * (0.16 + (i === 0 ? 0.07 : 0))); ctx.lineTo(x + L * 0.07, L * 0.06); ctx.fill();
    }
  }
  // nos
  ctx.fillStyle = TUSZ;
  ctx.beginPath(); ctx.ellipse(L * 0.93, -L * 0.04, L * 0.05, L * 0.035, 0.3, 0, Math.PI * 2); ctx.fill();
  // zmarszczki nad pyskiem (warczy)
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, lw * 0.6);
  for (let i = 0; i < 3; i++) {
    const x = L * (0.5 + i * 0.1);
    ctx.beginPath(); ctx.moveTo(x, -L * (0.2 - i * 0.03)); ctx.quadraticCurveTo(x + L * 0.03, -L * (0.12 - i * 0.02), x + L * 0.02, -L * (0.06 - i * 0.01)); ctx.stroke();
  }
  // ucho — spiczaste, położone do tyłu
  ctx.beginPath();
  ctx.moveTo(-L * 0.02, -L * 0.34);
  ctx.quadraticCurveTo(-L * 0.3, -L * 0.62 - g.paszcza * L * 0.1, -L * 0.42, -L * 0.6);
  ctx.quadraticCurveTo(-L * 0.28, -L * 0.42, -L * 0.18, -L * 0.22);
  ctx.closePath();
  ctx.fillStyle = kol.ciemne; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw; ctx.stroke();
  // oko — czerwony żar
  const ox = L * 0.3, oy = -L * 0.2;
  ctx.fillStyle = TUSZ;
  ctx.beginPath(); ctx.ellipse(ox, oy, L * 0.07, L * 0.045, -0.2, 0, Math.PI * 2); ctx.fill();
  if (g.oczy > 0.02) {
    const zl = p.swiatlo > 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = L * (0.22 + 0.12 * g.oczy);
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    og.addColorStop(0, zl ? `rgba(255,230,150,${0.8 * g.oczy})` : `rgba(255,70,30,${0.85 * g.oczy})`);
    og.addColorStop(0.3, zl ? `rgba(255,200,90,${0.35 * g.oczy})` : `rgba(220,30,10,${0.35 * g.oczy})`);
    og.addColorStop(1, 'rgba(160,10,5,0)');
    ctx.fillStyle = og; ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    ctx.fillStyle = zl ? `rgba(255,246,210,${g.oczy})` : `rgba(255,190,120,${g.oczy})`;
    ctx.beginPath(); ctx.ellipse(ox + L * 0.01, oy, L * 0.035, L * 0.02, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  void nr;
  const pysk: P = [L * 0.9, L * 0.06 + g.paszcza * L * 0.25];
  // punkt paszczy w układzie wołającego (po obrocie głowy)
  const c = Math.cos(g.pochyl), s = Math.sin(g.pochyl);
  ctx.restore();
  return [pysk[0] * c - pysk[1] * s, pysk[0] * s + pysk[1] * c];
}

/** Tłusta, czarna broda-grzywa na karku (poszarpane kosmyki). */
function grzywa(ctx: CanvasRenderingContext2D, h: number, a: P, b: P, kol: Kolory, lw: number, ziarno: number, czas: number): void {
  const n = 9;
  ctx.fillStyle = kol.grzywa; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.6, lw * 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = mix(a[0], b[0], t), y = mix(a[1], b[1], t);
    const dl = h * (0.07 + los(ziarno + i) * 0.06);
    const kol2 = Math.sin(czas * 0.002 + i) * h * 0.006;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.03, y);
    ctx.quadraticCurveTo(x - h * 0.01 + kol2, y + dl * 0.6, x + kol2 * 2 - h * 0.005, y + dl);
    ctx.quadraticCurveTo(x + h * 0.015, y + dl * 0.5, x + h * 0.03, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

export interface PunktyCerbera {
  /** obroża na karku (łańcuchy), paszcze trzech głów, środek brzucha */
  obroza: P; paszcze: [P, P, P]; brzuch: P;
}

/**
 * Cerber w pozie `p`, stopami w (0, 0), pyskami w prawo. Zwraca punkty (obroża, paszcze) w tym samym układzie.
 */
export function rysujCerbera(ctx: CanvasRenderingContext2D, h: number, p: PozaCerbera): PunktyCerbera {
  const lw = Math.max(1.1, h * 0.011);
  const t = p.czas / 1000;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // poświata szału / ran za plecami
  if (p.szal > 0.01 && p.kamien < 0.5) {
    const R = h * 1.1;
    const g = ctx.createRadialGradient(0, -h * 0.55, h * 0.1, 0, -h * 0.55, R);
    g.addColorStop(0, `rgba(255,50,20,${0.25 * p.szal * (0.7 + 0.3 * Math.sin(t * 7))})`); g.addColorStop(1, 'rgba(150,10,5,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-R, -h * 0.55 - R, R * 2, R * 2); ctx.restore();
  }
  // cień pod nim
  ctx.fillStyle = 'rgba(8,6,5,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, h * 0.75, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();

  // tułów: odrzut, przysiad, leżenie, stawanie dęba (obrót wokół bioder)
  const lez = p.lezy, przys = Math.max(p.przysiad * 0.6, lez);
  const dyTulow = h * (0.26 * lez + 0.1 * p.przysiad) - h * 0.012 * Math.sin(p.faza * 2) * p.krok;
  const dxTulow = -h * 0.12 * p.odrzut;
  const kolDaleko = kolory(p, true), kol = kolory(p, false);
  const biodro: P = [-h * 0.4 + dxTulow, -h * 0.5 + dyTulow];
  const deba = p.deba * 0.42;
  const obrot = (q: P): P => {
    // stawanie dęba: przód tułowia unosi się wokół bioder
    const dx = q[0] - biodro[0], dy = q[1] - biodro[1];
    const c = Math.cos(-deba), s = Math.sin(-deba);
    return [biodro[0] + dx * c - dy * s, biodro[1] + dx * s + dy * c];
  };
  const T = (x: number, y: number): P => obrot([x * h + dxTulow, y * h + dyTulow]);
  const bark = T(0.3, -0.5);
  // łapy: fazy chodu (bliska przednia, daleka przednia, bliska tylna, daleka tylna)
  const krokL = h * 0.16 * p.krok, unies = h * 0.08 * p.krok;
  const lapaPoz = (x0: number, faza: number, przednia: boolean): P => {
    if (lez > 0.5) return przednia ? [x0 * h + h * 0.38, 0] : [x0 * h + h * 0.3, 0];
    const s = Math.sin(p.faza + faza), c = Math.cos(p.faza + faza);
    let x = x0 * h + s * krokL + dxTulow * 0.5;
    let y = -Math.max(0, c) * unies;
    if (przednia && p.deba > 0) { const q = T(x0 + 0.05, -0.12); x = mix(x, q[0], p.deba); y = mix(y, Math.min(0, q[1]), p.deba); }
    return [x, y];
  };

  // ogon (za wszystkim): wężowy, z kolcami, kołysze się; smagnięcie biczem
  {
    const a = T(-0.5, -0.46);
    const sw = p.ogon * 0.5 + Math.sin(t * 1.6) * 0.15 * (1 - p.kamien);
    const smag = p.bicz;
    const pkt: P[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const x = a[0] - h * (0.1 + 0.55 * u) * (1 - smag * 0.3) + smag * h * 1.2 * u * u;
      const y = a[1] - h * (0.25 * Math.sin(u * 2.4 + sw) + 0.15 * u) - smag * h * 0.4 * Math.sin(u * Math.PI);
      pkt.push([x, y + Math.sin(u * 6 + t * 3 * (1 - p.kamien)) * h * 0.02 * u]);
    }
    for (const [w, kolor] of [[1, TUSZ], [0, kolDaleko.cialo]] as const) {
      ctx.strokeStyle = kolor;
      for (let i = 0; i < pkt.length - 1; i++) {
        const u = i / 12;
        ctx.lineWidth = h * 0.055 * (1 - u * 0.75) + w * lw * 2;
        ctx.beginPath(); ctx.moveTo(pkt[i][0], pkt[i][1]); ctx.lineTo(pkt[i + 1][0], pkt[i + 1][1]); ctx.stroke();
      }
    }
    // kolce
    ctx.fillStyle = kolDaleko.ciemne;
    for (let i = 2; i < 12; i += 2) {
      const [x, y] = pkt[i];
      ctx.beginPath(); ctx.moveTo(x - h * 0.015, y); ctx.lineTo(x, y - h * 0.045 * (1 - i / 14)); ctx.lineTo(x + h * 0.015, y); ctx.fill();
    }
    // łeb węża na końcu ogona
    const [kx, ky] = pkt[12];
    ctx.fillStyle = kolDaleko.cialo; ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(kx, ky, h * 0.04, h * 0.022, smag * 0.8 - 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // dalekie łapy
  lapa(ctx, h, T(-0.48, -0.45), lapaPoz(-0.5, Math.PI, false), 0.3, 0.3, -1, 0.1, kolDaleko, lw);
  lapa(ctx, h, T(0.22, -0.42), lapaPoz(0.24, 0, true), 0.24, 0.24, 1, 0.09, kolDaleko, lw);

  // tułów z wielkim brzuchem żarłoka
  const brzuchOdd = h * 0.015 * (p.oddech - 0.5);
  const korpus = (): void => {
    const q = (x: number, y: number): P => T(x, y);
    const p0 = q(-0.6, -0.5), p1 = q(-0.4, -0.72), p2 = q(0.0, -0.68), p3 = q(0.28, -0.78), p4 = q(0.46, -0.66);
    const p5 = q(0.52, -0.42), p6 = q(0.36, -0.26), p7 = q(0.02, -0.18 - brzuchOdd / h), p8 = q(-0.36, -0.28), p9 = q(-0.58, -0.32);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    ctx.quadraticCurveTo(p3[0], p3[1], p4[0], p4[1]);
    ctx.quadraticCurveTo(p5[0] + h * 0.04, p5[1], p6[0], p6[1]);
    ctx.quadraticCurveTo(p7[0] + h * 0.1, p7[1] + h * 0.06, p7[0], p7[1]);
    ctx.quadraticCurveTo(p8[0], p8[1], p9[0], p9[1]);
    ctx.quadraticCurveTo(p0[0] - h * 0.06, p0[1] + h * 0.06, p0[0], p0[1]);
    ctx.closePath();
  };
  korpus();
  const gr = ctx.createLinearGradient(0, bark[1] - h * 0.2, 0, -h * 0.15);
  gr.addColorStop(0, kol.jasne); gr.addColorStop(0.55, kol.cialo); gr.addColorStop(1, kol.ciemne);
  ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = TUSZ; ctx.lineWidth = lw * 1.3; ctx.stroke();
  // żebra i fałdy brzucha — kreska tuszem
  ctx.save();
  korpus(); ctx.clip();
  ctx.strokeStyle = 'rgba(14,9,7,0.55)'; ctx.lineWidth = Math.max(0.7, lw * 0.6);
  for (let i = 0; i < 6; i++) {
    const a = T(-0.1 + i * 0.07, -0.6), b = T(-0.05 + i * 0.075, -0.32);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + h * 0.05, (a[1] + b[1]) / 2, b[0], b[1]); ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const a = T(-0.35, -0.3 + i * 0.03), b = T(0.25, -0.26 + i * 0.03);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, b[1] + h * 0.07, b[0], b[1]); ctx.stroke();
  }
  // rany — żarzące się pęknięcia
  if (p.rany > 0.02 || p.swiatlo > 0.02) {
    const zl = p.swiatlo;
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round(3 + 9 * Math.max(p.rany, zl));
    for (let i = 0; i < n; i++) {
      const s0 = T(-0.5 + los(i * 3 + 1) * 0.95, -0.7 + los(i * 3 + 2) * 0.45);
      ctx.strokeStyle = zl > 0.05 ? `rgba(255,${200 + 40 * zl},${120 + 80 * zl},${0.4 + 0.6 * zl})` : `rgba(255,${70 + 40 * Math.sin(t * 4 + i)},30,${0.35 + 0.45 * p.rany})`;
      ctx.lineWidth = Math.max(0.8, lw * (0.7 + zl * 0.3));
      ctx.beginPath(); ctx.moveTo(s0[0], s0[1]);
      let x = s0[0], y = s0[1];
      for (let j = 0; j < 4; j++) { x += (los(i * 17 + j) - 0.5) * h * 0.12; y += (los(i * 29 + j) - 0.3) * h * 0.07; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // bliskie łapy
  lapa(ctx, h, T(-0.4, -0.42), lapaPoz(-0.4, 0, false), 0.3, 0.3, -1, 0.12, kol, lw);
  lapa(ctx, h, T(0.32, -0.4), lapaPoz(0.34, Math.PI, true), 0.24, 0.24, 1, 0.11, kol, lw);

  // szyje i głowy: tylna (wysoko), środkowa, przednia (nisko); głowy wysuwają się przy kłapnięciu
  const kotwice: P[] = [[0.3, -1.08], [0.62, -0.93], [0.8, -0.62]];
  const karki: P[] = [T(0.2, -0.7), T(0.3, -0.64), T(0.36, -0.56)];
  const paszcze: P[] = [];
  const kolejnosc = [0, 1, 2];
  for (const i of kolejnosc) {
    const g = p.glowy[i];
    const kd = i === 0 ? kolDaleko : kol;
    const [kx0, ky0] = kotwice[i];
    const wys = g.wysun;
    const cel = T(kx0 + 0.32 * wys, ky0 + 0.1 * wys + (lez > 0.5 ? 0.18 : 0));
    // szyja: gruby łuk od karku do głowy
    const kark = karki[i];
    const sr: P = [(kark[0] + cel[0]) / 2 - h * 0.02, (kark[1] + cel[1]) / 2 - h * 0.08];
    for (const [w, kolor] of [[lw * 2.4, TUSZ], [0, kd.cialo]] as const) {
      ctx.strokeStyle = kolor; ctx.lineWidth = h * 0.1 + w;
      ctx.beginPath(); ctx.moveTo(kark[0], kark[1]); ctx.quadraticCurveTo(sr[0], sr[1], cel[0], cel[1]); ctx.stroke();
    }
    grzywa(ctx, h, [kark[0] - h * 0.04, kark[1] - h * 0.05], [cel[0] - h * 0.06, cel[1] - h * 0.02], kd, lw, i * 50, p.czas * (1 - p.kamien));
    // obroża z kolcami
    ctx.save();
    const ob: P = [mix(kark[0], cel[0], 0.55), mix(kark[1], cel[1], 0.55) - h * 0.03];
    ctx.translate(ob[0], ob[1]); ctx.rotate(Math.atan2(cel[1] - kark[1], cel[0] - kark[0]) + Math.PI / 2);
    ctx.fillStyle = barwa([58, 50, 44], [110, 104, 96], p.kamien); ctx.strokeStyle = TUSZ; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.rect(-h * 0.075, -h * 0.018, h * 0.15, h * 0.036); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(190,180,160,0.9)';
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * h * 0.03 - h * 0.008, -h * 0.018); ctx.lineTo(k * h * 0.03, -h * 0.045); ctx.lineTo(k * h * 0.03 + h * 0.008, -h * 0.018); ctx.fill(); }
    ctx.restore();
    ctx.save();
    ctx.translate(cel[0], cel[1]);
    ctx.rotate(deba * 0.4);
    const pk = glowa(ctx, h, { ...g, pochyl: g.pochyl - deba * 0.4 }, kd, lw, p, i);
    ctx.restore();
    paszcze[i] = [cel[0] + pk[0], cel[1] + pk[1]];
  }
  // ogień ze środkowej paszczy
  if (p.ogien > 0.02) {
    const [fx, fy] = paszcze[1];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const u = ((t * 2.2 + i / 14) % 1);
      const x = fx + u * h * 1.3, y = fy + u * h * 0.25 + Math.sin(i * 7 + t * 9) * u * h * 0.12;
      const r = h * (0.04 + u * 0.16) * p.ogien;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,${210 - u * 120},${90 - u * 80},${0.55 * (1 - u) * p.ogien})`); g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  ctx.restore();
  void przys;
  return { obroza: T(0.3, -0.62), paszcze: paszcze as [P, P, P], brzuch: T(0, -0.3) };
}
