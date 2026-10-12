import { CIEN, clamp, cos, kier, lerp, los, mieszaj, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import { dlon, konczyna, naGlowie, podeszwa } from './malarz';
import { kesChleba, krople, migot, mlotek, muchy, para, poswiata, swieca, type Rysunek } from './wspolne';
import { uderzenie } from './pamiec';
import type { Stopa } from './szkielet';
import { poGlowie, twarzMroczna } from './twarz';
import { bez, bryla, cienieRzucane, gladki, konczynaZgieta, KREW, KREW_WSIAKNIETA, kreskaTuszu, plisa, przesiak, rgba, swiatlocien, swiatloOsi, SW, SWB, tonBryly, warstwaKontr, warstwaTuszu, zaciek, ziarno, type Warstwa } from './tusz';

/**
 * Pobożny — diakon z krypty (Remake v2), malowany tuszem jak rycerz i kopacz: twardy światłocień, kontur
 * grubszy po stronie cienia. Nie nosi lampki — jego światłem jest modlitwa: nimb za głową (świetlisty
 * pierścień, nie złota tarcza z fresku) obrysowuje go od tyłu złotą krawędzią, świeca wotywna grzeje od
 * dołu, a otwarta księga świeci mu w twarz.
 *
 * Długa alba z grubego lnu, dawno nie biała: zżółkła jak kość, szara od sadzy, z zaciekami wosku, ubłocona
 * tam, gdzie wlecze się po ziemi postrzępionym rąbkiem w plisach; nad rąbkiem ciemnoczerwony haftowany pas.
 * Przez ramię stuła z ciemnego karmazynu z wypłowiałymi złotymi krzyżykami i frędzlami, w pasie sznur
 * pokutny z węzłami, u boku drewniany różaniec. Szerokie rękawy z czerwonym mankietem. Twarz ascety: blada,
 * zapadnięta, z tonsurą (starzy — siwi i brodaci), na czole krzyż z popiołu. Okaleczony (krew dla góry)
 * ma zabandażowany przegub i plecy przesiąknięte krwią spod bicza; szaleniec płacze krwią.
 * Krzyż procesyjny z pociemniałego brązu na drzewcu; modli się na klęczkach albo z rękami wzniesionymi.
 */

type Tulow = (u: number, f: number) => Pkt;

/** Wysokość sznura pokutnego na tułowiu. */
const PAS = 0.36;
const SZNUR: Rgb = [146, 128, 96];
const PACIORKI: Rgb = [70, 46, 30];
const BRAZ: Rgb = [118, 88, 52];
const RZEMIEN: Rgb = [62, 42, 30];
const WOSK: Rgb = [232, 222, 192];

/** Źródło światła na pobożnym: świeca, nimb albo księga (barwa jako „r,g,b”). */
interface Swiatlo { q: Pkt; barwa: string; sila: number; zasieg: number }
/** Rysunek pobożnego: układ tułowia i jego światła. */
interface Kaplan { T: Tulow; swiatla: Swiatlo[] }

/** Skóra ascety: blada od postu i życia bez słońca. */
const skoraKaplana = (st: Rysunek['st']): Rgb => mieszaj(st.skora, [156, 144, 134], 0.36);

/** Sierpy blasku od jego świateł na bryle o środku q i grubości gr — z daleka puste. */
function blaski(r: Rysunek, K: Kaplan, q: Pkt, gr: number, sila = 1): Warstwa[] {
  if (r.m.lod < 2) return [];
  const w: Warstwa[] = [];
  for (const L of K.swiatla) {
    const dx = L.q.x - q.x, dy = L.q.y - q.y, d = Math.hypot(dx, dy) || 1;
    const a = L.sila * sila * clamp(1.1 - d / L.zasieg, 0, 1);
    if (a >= 0.03) w.push([-gr * 0.3, `rgba(${L.barwa},${a.toFixed(3)})`, undefined, { x: dx / d, y: dy / d }]);
  }
  return w;
}

export function rysujPoboznego(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm, cz, sim } = r;
  m.obrys = { aura: h < 60 ? 0.95 : clamp(0.95 - (h - 60) / 260, 0.34, 0.95), kontur: 'rgba(14,9,8,0.96)' };
  const kat = s.katG;
  const wisi = p.wis > 0.5;
  const kleczy = !wisi && (cz === 'modli' || cz === 'je' || cz === 'buduje');
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const Lt = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T: Tulow = (u, f) => ({ x: s.biodro.x + tx * u * Lt + fx * f * h, y: s.biodro.y + ty * u * Lt + fy * f * h });

  // ---- jego światła: świeca przed klęczącym, nimb za głową, otwarta księga
  const swiatla: Swiatlo[] = [];
  const sx = Math.max(s.kolA.x, s.stA.palce.x) + 0.08 * h;
  if (cz === 'modli') swiatla.push({ q: { x: sx, y: -0.08 * h }, barwa: '255,166,90', sila: 0.42 * migot(czas, c.id + 3), zasieg: 0.6 * h });
  const nimbSila = (cz === 'modli' || cz === 'czyta') && p.blask > 0.05 ? clamp(p.blask * 1.2 - 0.2, 0, 1) : 0;
  const nc = naGlowie(s, kat, -0.15, -0.2);
  if (nimbSila > 0.05) swiatla.push({ q: nc, barwa: '255,214,140', sila: 0.55 * nimbSila, zasieg: 0.45 * h });
  const ks = tryb.ksiega ? { x: (s.dlonA.x + s.dlonB.x) / 2 + 0.035 * h, y: (s.dlonA.y + s.dlonB.y) / 2 - 0.02 * h } : null;
  const blysk = ks && c.ksiegaT !== undefined ? clamp(1 - (sim.tick - c.ksiegaT) / 60, 0, 1) : 0;
  if (ks) swiatla.push({ q: ks, barwa: '255,226,170', sila: 0.3 + p.blask * 0.2 + blysk * 0.4, zasieg: 0.5 * h });
  const K: Kaplan = { T, swiatla };

  // ---- nimb za całą postacią (rysowany od razu — pod obrysem)
  if (nimbSila > 0.02) nimb(m.g, nc.x, nc.y, s.rg * 1.6, nimbSila, m.lod, czas, c.id);

  // ---- stuła z tyłu (bez kapy): zwisa z barku wzdłuż pleców, w ruchu odlatuje
  if (!st.wKapie) {
    const a = clamp((pm.wstega.a + 0.35) * 0.6, -1.3, 0.3) - s.katT * 0.6;
    const A = T(1.0, -0.02), C = T(0.78, -0.09);
    stula(r, K, krzywa(A, C, { x: C.x + sin(a) * 0.4 * h, y: C.y + cos(a) * 0.4 * h }, 8), true);
  }

  // ---- dalsza ręka; stopy (gdy wisi — i gołe łydki), resztę nóg kryje alba
  if (!tryb.oburacz && !tryb.zlozone && !tryb.ksiega) rekaw(r, K, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  if (wisi) { lydka(r, s.kolB, s.stB, true); lydka(r, s.kolA, s.stA, false); }
  stopa(r, K, s.stB, true);
  stopa(r, K, s.stA, false);

  // ---- alba, sznur pokutny z różańcem, stuła z przodu
  const cienReki = m.bogato && !tryb.oburacz ? konczynaZgieta(s.bark, 0.036 * h * 1.3, s.lokA, 0.031 * h, s.dlonA, 0.03 * h) : null;
  const U = ukladAlby(r, kleczy, wisi);
  alba(r, K, U, kleczy, cienReki);
  sznur(r, K);
  {
    const a = clamp((pm.wstega.a + 0.35) * 0.3, -0.5, 0.2) - s.katT * 0.9;
    const A = T(1.02, 0.0), C = T(0.62, 0.078);
    stula(r, K, krzywa(A, C, { x: C.x + sin(a) * 0.28 * h + 0.01 * h, y: C.y + cos(a) * 0.28 * h }, 8), false);
  }
  if (st.wKapie) kapa(r, K, U, kleczy);

  // ---- świeca wotywna przed klęczącym
  if (cz === 'modli') m.szczegol((g) => swieca(g, sx, 0, h * 0.9, czas, c.id + 3, m.lod));

  // ---- głowa
  glowaKaplana(r, K);

  // ---- krzyż procesyjny, młotek przy ołtarzu, księga; bliższa ręka
  if (tryb.narzedzie === 'laska') {
    krzyzProcesyjny(r, K, s.dlonA.x, s.dlonA.y, s.narz, cz !== 'walczy');
    if (cz === 'walczy') {
      const d = kier(s.narz);
      const k = { x: s.dlonA.x - d.x * 0.455 * h, y: s.dlonA.y - d.y * 0.455 * h };
      uderzenie(pm, p.cios, k, h, czas);
      if (p.cios > 0.05 && !m.prosto) m.szczegol((g) => poswiata(g, k.x, k.y, h * 0.2 * p.cios + h * 0.05, [255, 220, 160], 0.6 * p.cios));
    }
  } else if (tryb.narzedzie === 'mlot') {
    uderzenie(pm, p.cios, mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
    oltarz(r, K, s.dlonA.x + 0.12 * h);
  }
  if (ks) ksiega(r, ks, blysk);
  if (tryb.oburacz || tryb.zlozone || tryb.ksiega) rekaw(r, K, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  rekaw(r, K, s.bark, s.lokA, s.dlonA, s.przedA, false, tryb.narzedzie !== null || tryb.oburacz, st.okaleczony);
  if (tryb.zlozone) zlozoneDlonie(r, K);
  if (tryb.grzyb) m.szczegol((g) => kesChleba(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
  if (!m.prosto && st.zatruty) m.szczegol((g) => muchy(g, s.glowa.x, s.glowa.y, h, czas, c.id));
}

// ------------------------------------------------------------------ płótno

/** Punkty na krzywej kwadratowej a → b (c — punkt kontrolny). */
function krzywa(a: Pkt, c: Pkt, b: Pkt, n: number): Pkt[] {
  const w: Pkt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    w.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return w;
}

/** Pasmo materiału stałej szerokości wzdłuż łamanej. */
function pasmo(pk: Pkt[], szer: number): Path2D {
  const L: Pkt[] = [], R: Pkt[] = [];
  for (let i = 0; i < pk.length; i++) {
    const a = pk[Math.max(0, i - 1)], b = pk[Math.min(pk.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = (-dy / d) * szer * 0.5, ny = (dx / d) * szer * 0.5;
    L.push({ x: pk[i].x + nx, y: pk[i].y + ny }); R.push({ x: pk[i].x - nx, y: pk[i].y - ny });
  }
  const p = new Path2D();
  p.moveTo(L[0].x, L[0].y);
  for (let i = 1; i < L.length; i++) p.lineTo(L[i].x, L[i].y);
  for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i].x, R[i].y);
  p.closePath();
  return p;
}

/**
 * Alba od barków do ziemi (klęczącemu układa się na udzie, opada z kolana, z tyłu przykrywa łydki; wiszącemu
 * sięga za kolana), w plisy, z postrzępionym rąbkiem i haftowanym pasem nad nim; błoto, wosk, krew spod bicza.
 */
/** Zasięg alby: przód i tył rąbka, jego wysokość i kolano wysunięte do przodu. */
interface Uklad { przod: number; tyl: number; dol: number; kp: Pkt; kt: Pkt }

function ukladAlby(r: Rysunek, kleczy: boolean, wisi: boolean): Uklad {
  const { s, h, pm } = r;
  const fal = pm.szata.a;
  const [kp, kt] = s.kolA.x >= s.kolB.x ? [s.kolA, s.kolB] : [s.kolB, s.kolA];
  if (kleczy) {
    return { kp, kt, przod: kp.x + 0.064 * h, tyl: Math.min(s.biodro.x - 0.1 * h, Math.min(s.stA.kostka.x, s.stB.kostka.x) - 0.004 * h), dol: -0.014 * h };
  }
  if (wisi) {
    return { kp, kt, przod: Math.max(kp.x + 0.045 * h, s.biodro.x + 0.09 * h), tyl: Math.min(kt.x - 0.045 * h, s.biodro.x - 0.1 * h) + fal * 0.04 * h, dol: Math.max(s.kolA.y, s.kolB.y) + 0.05 * h };
  }
  const stopyY = Math.max(s.stA.podeszwa.y, s.stB.podeszwa.y);
  return {
    kp, kt,
    przod: Math.min(Math.max(s.kolA.x, s.stA.palce.x - 0.03 * h, s.kolB.x, s.stB.palce.x - 0.03 * h, s.biodro.x + 0.085 * h) + 0.025 * h, s.biodro.x + 0.19 * h) - fal * 0.01 * h,
    tyl: Math.max(Math.min(s.kolA.x, s.stA.pieta.x, s.kolB.x, s.stB.pieta.x, s.biodro.x - 0.085 * h) - 0.025 * h, s.biodro.x - 0.2 * h) + fal * 0.05 * h,
    dol: stopyY - 0.036 * h,
  };
}

function alba(r: Rysunek, K: Kaplan, U: Uklad, kleczy: boolean, cienReki: Path2D | null): void {
  const { m, s, h, st, c, pm } = r;
  const id = c.id, T = K.T, fal = pm.szata.a;
  const { przod, tyl, dol, kp } = U;
  const Wf = T(PAS, 0.078), Wb = T(PAS, -0.08);
  const Hf = { x: przod, y: dol - 0.006 * h }, Hb = { x: tyl, y: dol - 0.002 * h };
  // fałdy: u stojącego od pasa ku rąbkowi, u klęczącego zwisają z uda i bioder
  const nf = m.prosto ? 2 : m.bogato ? 6 : m.lod === 2 ? 4 : 3;
  const kolano = { x: kp.x + 0.02 * h, y: kp.y + 0.03 * h }, zad = T(0.02, -0.09);
  const doliny: { g: Pkt; d: Pkt }[] = [];
  for (let i = 0; i < nf; i++) {
    const t = (i + 0.5 + 0.35 * (los(id, 2495 + i) - 0.5)) / nf;
    const gp = kleczy ? { x: lerp(kolano.x, zad.x, t), y: lerp(kolano.y, zad.y, t) } : T(PAS - 0.03, lerp(0.064, -0.066, t));
    doliny.push({ g: gp, d: { x: lerp(przod, tyl, t) + fal * 0.02 * h, y: dol - 0.004 * h } });
  }
  const w = new Path2D();
  w.moveTo(Wb.x, Wb.y);
  bez(w, T(0.5, -0.09), T(0.82, -0.096), T(0.965, -0.072));
  w.quadraticCurveTo(T(1.01, -0.008).x, T(1.01, -0.008).y, T(0.97, 0.052).x, T(0.97, 0.052).y);
  bez(w, T(0.8, 0.1), T(0.56, 0.094), T(PAS + 0.07, 0.092));
  w.quadraticCurveTo(T(PAS + 0.02, 0.096).x, T(PAS + 0.02, 0.096).y, Wf.x, Wf.y);
  if (kleczy) {
    // po udzie do kolana, wokół kolana i w dół ku ziemi
    bez(w, T(PAS - 0.12, 0.1), { x: lerp(s.biodro.x, kp.x, 0.5), y: kp.y - 0.064 * h }, { x: kp.x + 0.01 * h, y: kp.y - 0.05 * h });
    w.quadraticCurveTo(kp.x + 0.064 * h, kp.y - 0.04 * h, kp.x + 0.056 * h, kp.y + 0.02 * h);
    bez(w, { x: kp.x + 0.05 * h, y: lerp(kp.y, dol, 0.5) }, { x: przod + 0.006 * h, y: dol - 0.03 * h }, Hf);
  } else bez(w, T(PAS - 0.12, 0.09), { x: przod - 0.008 * h, y: lerp(Wf.y, dol, 0.55) }, Hf);
  const wezly: Pkt[] = [Hf, ...doliny.map((v) => v.d), Hb];
  for (let i = 1; i < wezly.length; i++) rabek(w, wezly[i - 1], wezly[i], h, id, 2500 + i * 5);
  if (kleczy) bez(w, { x: tyl + 0.03 * h, y: lerp(s.biodro.y, dol, 0.5) }, T(-0.06, -0.115), Wb);
  else bez(w, { x: tyl + 0.008 * h, y: lerp(Wb.y, dol, 0.55) }, T(PAS - 0.12, -0.094), Wb);
  w.closePath();

  let styl: string | CanvasGradient = tonC(st.szata, -0.1, CIEN.tkanina);
  if (!m.prosto) {
    const a = T(0.85, 0.1), b = { x: tyl, y: dol };
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.szata, 0.08, CIEN.tkanina)); gr.addColorStop(0.4, tonC(st.szata, -0.12, CIEN.tkanina)); gr.addColorStop(1, tonC(st.szata, -0.6, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(w, styl, (g) => {
    if (m.prosto) return;
    g.save();
    g.clip(w);
    if (m.bogato) {
      const z = ziarno(g);
      if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(w); g.globalCompositeOperation = 'source-over'; }
    }
    // haftowany pas nad rąbkiem: ciemna czerwień (w obcięciu idzie za plisami), złota nitka i perełki
    const pt = { x: tyl - 0.03 * h, y: Hb.y - 0.036 * h + fal * 0.004 * h }, pf = { x: przod + 0.03 * h, y: Hf.y - 0.04 * h };
    const ps = new Path2D();
    ps.moveTo(pt.x, pt.y); ps.lineTo(pf.x, pf.y); ps.lineTo(pf.x, dol + 0.06 * h); ps.lineTo(pt.x, dol + 0.06 * h); ps.closePath();
    g.fillStyle = tonC(st.stula, -0.2, CIEN.tkanina); g.fill(ps);
    if (m.bogato) {
      g.strokeStyle = tonC(st.zloto, -0.3, CIEN.tkanina, 0.8); g.lineWidth = Math.max(0.5, h * 0.003);
      g.beginPath(); g.moveTo(pt.x, pt.y + 0.005 * h); g.lineTo(pf.x, pf.y + 0.005 * h); g.stroke();
      g.fillStyle = tonC(st.zloto, -0.2, CIEN.tkanina, 0.8);
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = lerp(pt.x, pf.x, t), y = lerp(pt.y, pf.y, t) + 0.017 * h, rr = Math.max(0.5, h * 0.0038);
        g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU);
      }
      g.fill();
    }
    // fałdy: cień wpada w dolinę, grzbiet obok łapie światło
    for (let i = 0; i < nf; i++) {
      const { g: gp, d } = doliny[i];
      const sz = (0.012 + 0.008 * los(id, 2497 + i)) * h, kx = (gp.x + d.x) / 2 + 0.008 * h, ky = (gp.y + d.y) / 2;
      const cien = new Path2D();
      cien.moveTo(gp.x, gp.y); cien.quadraticCurveTo(kx, ky, d.x, d.y + 0.012 * h);
      cien.lineTo(d.x + sz, d.y + 0.008 * h); cien.quadraticCurveTo(kx + sz * 0.45, ky, gp.x + 0.003 * h, gp.y);
      cien.closePath();
      g.fillStyle = 'rgba(24,14,12,0.42)'; g.fill(cien);
      if (!m.bogato) continue;
      const bl = new Path2D();
      bl.moveTo(gp.x - 0.002 * h, gp.y); bl.quadraticCurveTo(kx - 0.004 * h, ky, d.x - 0.004 * h, d.y + 0.006 * h);
      bl.lineTo(d.x - sz * 0.55, d.y); bl.quadraticCurveTo(kx - sz * 0.35, ky, gp.x - 0.004 * h, gp.y);
      bl.closePath();
      g.fillStyle = 'rgba(255,244,222,0.18)'; g.fill(bl);
      g.strokeStyle = 'rgba(14,8,8,0.45)'; g.lineWidth = Math.max(0.4, h * 0.0024); g.lineCap = 'round';
      g.beginPath(); g.moveTo(lerp(gp.x, d.x, 0.2), lerp(gp.y, d.y, 0.2)); g.quadraticCurveTo(kx, ky, d.x, d.y + 0.012 * h); g.stroke();
    }
    // klęczący: płótno zwisa łukami między kolanem a biodrem
    if (kleczy && m.lod === 2) {
      for (let i = 0; i < 3; i++) {
        const a = { x: kp.x + 0.026 * h, y: kp.y + (0.012 + i * 0.012) * h };
        const b = { x: lerp(s.biodro.x - 0.05 * h, tyl, 0.25 + i * 0.12), y: s.biodro.y + (0.05 + i * 0.075) * h };
        const sag = (0.045 + i * 0.035) * h, cx = (a.x + b.x) / 2, cy = Math.max(a.y, b.y) + sag;
        const f = new Path2D();
        f.moveTo(a.x, a.y); f.quadraticCurveTo(cx, cy, b.x, b.y); f.quadraticCurveTo(cx, cy - 0.016 * h, a.x, a.y - 0.004 * h); f.closePath();
        g.fillStyle = 'rgba(18,10,8,0.36)'; g.fill(f);
        if (!m.bogato) continue;
        g.strokeStyle = 'rgba(255,244,222,0.16)'; g.lineWidth = Math.max(0.5, h * 0.004);
        g.beginPath(); g.moveTo(a.x, a.y - 0.008 * h); g.quadraticCurveTo(cx, cy - 0.022 * h, b.x, b.y - 0.008 * h); g.stroke();
      }
    }
    // sadza i plamy: smugi od dymu świec, rdzawe zacieki zaschniętej krwi u rąbka
    if (m.bogato) {
      g.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 4; i++) {
        const q = { x: lerp(tyl, przod, 0.15 + 0.7 * los(id, 2620 + i)), y: lerp(s.biodro.y - 0.1 * h, dol, 0.2 + 0.6 * los(id, 2625 + i)) };
        const sm = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, 0.05 * h);
        sm.addColorStop(0, 'rgba(90,80,70,0.35)'); sm.addColorStop(1, 'rgba(90,80,70,0)');
        g.fillStyle = sm; g.beginPath(); g.ellipse(q.x, q.y, 0.02 * h, 0.05 * h, 0, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    if (m.bogato) for (let i = 0; i < 2; i++) {
      const q = { x: lerp(tyl, przod, 0.2 + 0.6 * los(id, 2630 + i)), y: dol - (0.03 + 0.03 * los(id, 2632 + i)) * h };
      przesiak(g, q.x, q.y, (0.01 + 0.008 * los(id, 2634 + i)) * h, id + 60 + i, 0.4, m.lod, 1.3, PI / 2);
    }
    // bluzowanie nad sznurem
    if (!kleczy && m.lod === 2) {
      g.strokeStyle = 'rgba(30,18,14,0.3)'; g.lineWidth = Math.max(0.4, h * 0.003);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = T(PAS + 0.04, -0.05 + i * 0.045), b = T(PAS + 0.17 + 0.04 * i, -0.02 + i * 0.03);
        g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 + 0.006 * h, (a.y + b.y) / 2, b.x, b.y);
      }
      g.stroke();
    }
    // błoto i kurz: od kolan w dół coraz więcej; pot i sadza pod pachą
    const bl = g.createLinearGradient(0, lerp(s.biodro.y, dol, 0.35), 0, dol + 0.03 * h);
    bl.addColorStop(0, 'rgba(70,54,38,0)'); bl.addColorStop(0.6, 'rgba(70,54,38,0.3)'); bl.addColorStop(1, 'rgba(44,32,22,0.85)');
    g.globalCompositeOperation = 'multiply'; g.fillStyle = bl; g.fill(w); g.globalCompositeOperation = 'source-over';
    const pp = T(0.86, -0.04);
    const pg = g.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 0.07 * h);
    pg.addColorStop(0, 'rgba(40,30,22,0.4)'); pg.addColorStop(1, 'rgba(40,30,22,0)');
    g.fillStyle = pg; g.fillRect(pp.x - 0.08 * h, pp.y - 0.08 * h, 0.16 * h, 0.16 * h);
    // zacieki wosku ze świec na piersi i brzuchu
    if (m.bogato) {
      for (let i = 0; i < 3; i++) {
        if (los(id, 2560 + i) < 0.3) continue;
        const q = T(0.12 + 0.2 * los(id, 2563 + i), 0.035 + 0.045 * los(id, 2566 + i));
        g.fillStyle = rgba(WOSK, 0.5); g.beginPath(); g.ellipse(q.x, q.y, h * 0.005, h * 0.0038, 0, 0, TAU); g.fill();
        zaciek(g, q.x, q.y, (0.012 + 0.02 * los(id, 2569 + i)) * h, 0.002 * h, WOSK, 0.45, id, 2572 + i * 3);
      }
    }
    // okaleczony: plecy przesiąknięte krwią spod bicza — ukośne pręgi
    if (st.okaleczony) {
      g.globalCompositeOperation = 'multiply';
      g.strokeStyle = rgba(KREW_WSIAKNIETA, 0.85); g.lineWidth = Math.max(0.8, h * 0.0075); g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = T(0.95 - i * 0.11, -0.1), b = T(0.85 - i * 0.11, -0.024 - 0.012 * los(id, 2600 + i));
        g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.006 * h, b.x, b.y);
      }
      g.stroke();
      g.globalCompositeOperation = 'source-over';
      if (m.lod === 2) for (let i = 0; i < 3; i++) { const q = T(0.9 - i * 0.12, -0.06); przesiak(g, q.x, q.y, 0.012 * h, id + 40 + i, 0.55, m.lod, 1.6, s.katT + 0.5); }
      if (m.bogato) for (let i = 0; i < 2; i++) { const q = T(0.78 - i * 0.14, -0.05); zaciek(g, q.x, q.y, 0.05 * h, 0.0025 * h, KREW, 0.7, id, 2610 + i * 3); }
    }
    if (cienReki) cienieRzucane(g, w, [[cienReki, 0.024 * h, 0.3]], true);
    const sr = T(0.55, 0.02);
    if (m.bogato) {
      swiatlocien(g, w, [[0.13 * h, 'rgba(20,12,10,0.24)'], [0.065 * h, 'rgba(20,12,10,0.4)'], [0.02 * h, 'rgba(14,8,8,0.42)'], ...blaski(r, K, sr, 0.14 * h, 0.9), [-0.01 * h, 'rgba(255,242,218,0.14)'], warstwaKontr(h, 0.7), warstwaTuszu(h)], SWB, undefined, true);
    } else if (m.lod === 2) swiatlocien(g, w, [[0.06 * h, 'rgba(20,12,10,0.55)'], ...blaski(r, K, sr, 0.14 * h, 0.9), warstwaTuszu(h)], SWB, undefined, true);
    else swiatlocien(g, w, [[0.06 * h, 'rgba(20,12,10,0.55)']], SWB, undefined, true);
    g.restore();
    if (m.lod === 2) kreskaTuszu(g, w, h);
  });
}

/**
 * Kapa: ciężki płaszcz z czarnej wełny spięty pod szyją, otwarty z przodu — z boku kryje plecy i tył alby po
 * łydki (klęczącemu spływa na ziemię); kaptur opuszczony na plecy, postrzępiony brzeg, szary kurz u dołu.
 */
function kapa(r: Rysunek, K: Kaplan, U: Uklad, kleczy: boolean): void {
  const { m, s, h, st, c, pm } = r;
  const T = K.T, id = c.id, fal = pm.szata.a;
  const dolK = kleczy ? U.dol + 0.004 * h : lerp(s.biodro.y, U.dol, 0.74);
  const tylK = (kleczy ? U.tyl - 0.014 * h : Math.min(U.tyl, s.biodro.x - 0.1 * h) - 0.014 * h) + fal * 0.04 * h;
  const przK = s.biodro.x - (kleczy ? 0.03 : 0.018) * h + fal * 0.01 * h;
  const Hb = { x: tylK, y: dolK }, Hf = { x: przK, y: dolK + 0.004 * h };
  const N = T(1.02, -0.035);
  const p = new Path2D();
  p.moveTo(N.x, N.y);
  // kaptur opuszczony na plecy, potem plecy w dół ku rąbkowi
  bez(p, T(1.0, -0.1), T(0.9, -0.138), T(0.76, -0.124));
  bez(p, T(0.55, -0.114), { x: tylK + 0.01 * h, y: lerp(s.biodro.y, dolK, 0.4) }, Hb);
  // rąbek w plisach od tyłu ku przodowi
  const nf = m.lod === 2 ? 3 : 2;
  let A = Hb;
  for (let i = 1; i <= nf; i++) {
    const B = i === nf ? Hf : { x: lerp(tylK, przK, i / nf), y: dolK + 0.002 * h };
    plisa(p, A, B, h, id, 3000 + i * 5, 0.85);
    A = B;
  }
  // przedni brzeg: od rąbka w górę, przy pasie za bokiem ciała, na przód barku i pod szyję
  bez(p, { x: przK + 0.004 * h, y: lerp(dolK, s.biodro.y, 0.5) }, T(PAS, -0.03), T(0.86, 0.004));
  p.quadraticCurveTo(T(1.0, 0.044).x, T(1.0, 0.044).y, T(1.04, 0.014).x, T(1.04, 0.014).y);
  p.quadraticCurveTo(T(1.07, -0.012).x, T(1.07, -0.012).y, N.x, N.y);
  p.closePath();
  let styl: string | CanvasGradient = tonC(st.kapa, -0.08, CIEN.tkanina);
  if (!m.prosto) {
    const a = T(0.95, 0.02), b = { x: tylK, y: dolK };
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.kapa, 0.16, CIEN.tkanina)); gr.addColorStop(0.5, tonC(st.kapa, -0.06, CIEN.tkanina)); gr.addColorStop(1, tonC(st.kapa, -0.42, CIEN.tkanina));
    styl = gr;
  }
  const spinka = T(1.0, 0.03);
  m.ksztalt(p, styl, (g) => {
    if (m.prosto) return;
    g.save(); g.clip(p);
    if (m.bogato) { const z = ziarno(g); if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(p); g.globalCompositeOperation = 'source-over'; } }
    if (m.lod === 2) {
      // wnętrze kaptura: ciemny półksiężyc pod brzegiem, jaśniejszy brzeg wełny
      const k0 = T(1.0, -0.06), k1 = T(0.9, -0.118), k2 = T(0.79, -0.104), kc = T(0.93, -0.07);
      g.fillStyle = 'rgba(6,4,4,0.6)';
      g.beginPath(); g.moveTo(k0.x, k0.y); g.quadraticCurveTo(k1.x, k1.y, k2.x, k2.y); g.quadraticCurveTo(kc.x, kc.y, k0.x, k0.y); g.fill();
      g.strokeStyle = tonC(st.kapa, 0.35, CIEN.tkanina, 0.5); g.lineWidth = Math.max(0.5, h * 0.0028);
      g.beginPath(); g.moveTo(k0.x, k0.y); g.quadraticCurveTo(k1.x, k1.y, k2.x, k2.y); g.stroke();
      // ciężkie fałdy od łopatki ku rąbkowi
      g.strokeStyle = 'rgba(4,2,2,0.5)'; g.lineWidth = Math.max(0.5, h * 0.003);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const t = 0.25 + i * 0.25, a = T(0.62 - i * 0.06, lerp(-0.1, -0.04, t)), b = { x: lerp(tylK, przK, t) + 0.004 * h, y: dolK - 0.01 * h };
        g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 - 0.006 * h, (a.y + b.y) / 2, b.x, b.y);
      }
      g.stroke();
    }
    // kurz i pył skały na czarnej wełnie: szarzeje ku dołowi
    const kz = g.createLinearGradient(0, lerp(s.biodro.y, dolK, 0.3), 0, dolK + 0.02 * h);
    kz.addColorStop(0, 'rgba(120,110,96,0)'); kz.addColorStop(1, 'rgba(120,110,96,0.32)');
    g.fillStyle = kz; g.fill(p);
    const sr = T(0.6, -0.06);
    if (m.bogato) swiatlocien(g, p, [[0.06 * h, 'rgba(4,2,2,0.45)'], [0.02 * h, 'rgba(4,2,2,0.4)'], ...blaski(r, K, sr, 0.12 * h, 1.1), [-0.012 * h, 'rgba(210,200,190,0.1)'], warstwaKontr(h, 1), warstwaTuszu(h)], SWB, undefined, true);
    else if (m.lod === 2) swiatlocien(g, p, [[0.05 * h, 'rgba(4,2,2,0.5)'], ...blaski(r, K, sr, 0.12 * h, 1.1), warstwaTuszu(h)], SWB, undefined, true);
    else swiatlocien(g, p, [[0.05 * h, 'rgba(4,2,2,0.5)']], SWB, undefined, true);
    g.restore();
    if (m.lod === 2) kreskaTuszu(g, p, h);
    // spinka pod szyją
    g.fillStyle = tonC(BRAZ, 0, CIEN.metal); g.beginPath(); g.arc(spinka.x, spinka.y, Math.max(0.7, 0.009 * h), 0, TAU); g.fill();
    if (m.lod === 2) { g.strokeStyle = 'rgba(10,6,4,0.8)'; g.lineWidth = Math.max(0.4, h * 0.002); g.stroke(); }
  });
}

/** Amikt: zwinięty lniany kołnierz wokół szyi (pobożni bez kapy). */
function kolnierz(r: Rysunek, K: Kaplan): void {
  const { m, h, st } = r;
  const T = K.T;
  const a = T(1.0, -0.066), b = T(1.1, -0.01), c2 = T(1.03, 0.052), d = T(0.95, 0.044), e = T(1.01, -0.002), f = T(0.95, -0.07);
  const p = new Path2D();
  p.moveTo(a.x, a.y); p.quadraticCurveTo(b.x, b.y, c2.x, c2.y); p.lineTo(d.x, d.y); p.quadraticCurveTo(e.x, e.y, f.x, f.y); p.closePath();
  m.ksztalt(p, tonC(st.szata, -0.08, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = 'rgba(30,18,14,0.4)'; g.lineWidth = Math.max(0.4, h * 0.0026);
    g.beginPath(); g.moveTo(lerp(a.x, f.x, 0.5), lerp(a.y, f.y, 0.5)); g.quadraticCurveTo(b.x - (b.x - e.x) * 0.5, b.y, lerp(c2.x, d.x, 0.5), lerp(c2.y, d.y, 0.5)); g.stroke();
    if (m.bogato) bryla(g, p, h, [[0.014 * h, 'rgba(24,14,12,0.45)'], ...blaski(r, K, T(1.02, 0), 0.04 * h), [-0.004 * h, 'rgba(255,242,220,0.16)']], SWB, 0.8);
    else kreskaTuszu(g, p, h, 0.7);
  });
}

/**
 * Dół jednej plisy alby od bieżącego punktu (A) do B: zaokrąglony łuk, czasem wydarty klin albo krótki,
 * szeroki strzęp — bez długich frędzli, bo rąbek wlecze się tuż nad ziemią.
 */
function rabek(p: Path2D, A: Pkt, B: Pkt, h: number, id: number, szuf: number): void {
  const z = los(id, szuf), dx = B.x - A.x, my = Math.max(A.y, B.y);
  const opad = (0.008 + 0.009 * los(id, szuf + 1)) * h;
  if (z < 0.2) {
    p.quadraticCurveTo(A.x + dx * 0.16, my + opad, A.x + dx * 0.34, my + opad * 0.9);
    p.lineTo(A.x + dx * 0.47, my - (0.01 + 0.016 * los(id, szuf + 2)) * h);
    p.lineTo(A.x + dx * 0.6, my + opad * 0.8);
    p.quadraticCurveTo(A.x + dx * 0.86, my + opad * 1.1, B.x, B.y);
  } else if (z > 0.84) {
    const dl = (0.01 + 0.008 * los(id, szuf + 3)) * h;
    p.quadraticCurveTo(A.x + dx * 0.14, my + opad, A.x + dx * 0.3, my + opad * 1.05);
    p.lineTo(A.x + dx * 0.4, my + opad + dl);
    p.lineTo(A.x + dx * 0.58, my + opad + dl * 0.8);
    p.lineTo(A.x + dx * 0.66, my + opad * 1.05);
    p.quadraticCurveTo(A.x + dx * 0.9, my + opad, B.x, B.y);
  } else p.quadraticCurveTo(A.x + dx * 0.5, my + opad * 2, B.x, B.y);
}

/** Stuła (orarion): pasmo ciemnego karmazynu, wypłowiałe złote krzyżyki, złoty brzeg i frędzle na końcu. */
function stula(r: Rysunek, K: Kaplan, pk: Pkt[], dalej: boolean): void {
  const { m, st, h, c } = r;
  const szer = 0.03 * h, n = pk.length;
  const a = pk[0], b = pk[n - 1];
  const kol = mieszaj(st.stula, [40, 14, 18], 0.15);
  const p = pasmo(pk, szer);
  m.ksztalt(p, tonBryly(m, kol, dalej ? -0.5 : -0.12, a, b, szer * 1.4, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    g.strokeStyle = tonC(st.zloto, dalej ? -0.55 : -0.25, CIEN.tkanina, 0.85); g.lineWidth = Math.max(0.5, h * 0.0045);
    g.beginPath();
    for (let i = 1; i < n - 1; i += 2) {
      const q = pk[i], p0 = pk[i - 1], p1 = pk[i + 1];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, k = szer * 0.3;
      g.moveTo(q.x - ux * k, q.y - uy * k); g.lineTo(q.x + ux * k, q.y + uy * k);
      g.moveTo(q.x + uy * k, q.y - ux * k); g.lineTo(q.x - uy * k, q.y + ux * k);
    }
    g.stroke();
    // złoty brzeg na końcu i frędzle — nierówne, część się wysnuła
    const p0 = pk[n - 2], dx = b.x - p0.x, dy = b.y - p0.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    g.strokeStyle = tonC(st.zloto, dalej ? -0.55 : -0.3, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.007);
    g.beginPath(); g.moveTo(b.x + uy * szer * 0.5, b.y - ux * szer * 0.5); g.lineTo(b.x - uy * szer * 0.5, b.y + ux * szer * 0.5); g.stroke();
    if (m.lod < 2) return;
    g.strokeStyle = tonC(kol, -0.15, CIEN.tkanina); g.lineWidth = Math.max(0.4, h * 0.0035);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const t = (i / 5 - 0.5) * 0.9, x = b.x - uy * szer * t, y = b.y + ux * szer * t, dl = (0.014 + 0.014 * los(c.id, 2700 + i + (dalej ? 9 : 0))) * h;
      g.moveTo(x, y); g.lineTo(x + ux * dl, y + uy * dl);
    }
    g.stroke();
    if (m.bogato) bryla(g, p, h, [[szer * 0.5, 'rgba(14,4,6,0.5)'], ...blaski(r, K, pk[n >> 1], szer * 2), [-szer * 0.16, 'rgba(255,220,200,0.1)']], swiatloOsi(a, b), dalej ? 0.7 : 1);
    else kreskaTuszu(g, p, h, dalej ? 0.6 : 0.8);
  });
}

/** Sznur pokutny w pasie: z przodu dwa końce z węzłami kołyszą się w marszu; u boku drewniany różaniec. */
function sznur(r: Rysunek, K: Kaplan): void {
  const { m, h, pm, czas, c } = r;
  const T = K.T, id = c.id;
  const a0 = T(PAS + 0.012, -0.082), a1 = T(PAS + 0.012, 0.08), b1 = T(PAS - 0.012, 0.08), b0 = T(PAS - 0.012, -0.082);
  const pa = new Path2D();
  pa.moveTo(a0.x, a0.y); pa.quadraticCurveTo(T(PAS + 0.02, 0).x, T(PAS + 0.02, 0).y, a1.x, a1.y);
  pa.lineTo(b1.x, b1.y); pa.quadraticCurveTo(T(PAS - 0.004, 0).x, T(PAS - 0.004, 0).y, b0.x, b0.y); pa.closePath();
  m.ksztalt(pa, tonC(SZNUR, -0.22, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    if (!m.bogato) { kreskaTuszu(g, pa, h, 0.7); return; }
    g.save(); g.clip(pa);
    // skręt sznura
    g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = Math.max(0.4, h * 0.0024);
    g.beginPath();
    for (let i = 0; i <= 12; i++) { const q = T(PAS, lerp(-0.082, 0.08, i / 12)); g.moveTo(q.x - 0.006 * h, q.y - 0.012 * h); g.lineTo(q.x + 0.004 * h, q.y + 0.012 * h); }
    g.stroke();
    swiatlocien(g, pa, [[0.012 * h, 'rgba(8,4,4,0.45)'], ...blaski(r, K, T(PAS, 0), 0.03 * h), [-0.004 * h, 'rgba(255,236,206,0.2)']], SW, undefined, true);
    g.restore();
  });
  // dwa końce z trzema węzłami pokutnymi
  const w = T(PAS, 0.05), kol = pm.szata.a * 1.2 + sin(czas * 0.004 + id) * 0.1;
  if (m.prosto) return;
  const wezly = new Path2D();
  for (const [dlug, dk, ciem] of [[0.17, 0, 0.26], [0.13, 0.3, 0.34]] as const) {
    const a = kol + dk;
    const e = { x: w.x + sin(a) * 0.03 * h - dk * 0.02 * h, y: w.y + dlug * h };
    const pk = krzywa(w, { x: (w.x + e.x) / 2 + sin(a) * 0.012 * h, y: (w.y + e.y) / 2 }, e, 6);
    const p = pasmo(pk, 0.0065 * h);
    m.ksztalt(p, tonC(SZNUR, -ciem, CIEN.tkanina), (g) => { if (m.lod === 2) kreskaTuszu(g, p, h, 0.6); });
    for (const i of [3, 4, 6]) { const q = pk[i]; wezly.moveTo(q.x + 0.0048 * h, q.y); wezly.ellipse(q.x, q.y, 0.0048 * h, 0.0042 * h, 0, 0, TAU); }
  }
  m.ksztalt(wezly, tonC(SZNUR, -0.3, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = 'rgba(20,12,8,0.6)'; g.lineWidth = Math.max(0.4, h * 0.002); g.stroke(wezly);
  });
  m.szczegol((g) => rozaniec(g, r, K));
}

/** Różaniec: drewniane paciorki na sznurku zwisające od pasa, na końcu krzyżyk; kołysze się. */
function rozaniec(g: CanvasRenderingContext2D, r: Rysunek, K: Kaplan): void {
  const { m, h, pm, czas, c } = r;
  const A = K.T(PAS - 0.01, -0.008);
  const a = pm.szata.a * 0.9 + sin(czas * 0.0035 + c.id * 1.3) * 0.08;
  const E = { x: A.x + sin(a) * 0.11 * h - 0.012 * h, y: A.y + cos(a) * 0.11 * h };
  const pk = krzywa(A, { x: (A.x + E.x) / 2 - 0.016 * h, y: (A.y + E.y) / 2 + 0.008 * h }, E, 9);
  g.strokeStyle = 'rgba(30,20,14,0.8)'; g.lineWidth = Math.max(0.4, h * 0.0022); g.lineCap = 'round';
  g.beginPath(); g.moveTo(pk[0].x, pk[0].y); for (const q of pk) g.lineTo(q.x, q.y); g.stroke();
  if (m.lod === 2) {
    const rr = h * 0.0056;
    g.fillStyle = tonC(PACIORKI, -0.05, CIEN.tkanina);
    g.beginPath();
    for (let i = 1; i < pk.length; i++) { const q = pk[i]; g.moveTo(q.x + rr, q.y); g.arc(q.x, q.y, rr, 0, TAU); }
    g.fill();
    if (m.bogato) {
      g.fillStyle = 'rgba(255,230,190,0.35)';
      g.beginPath();
      for (let i = 1; i < pk.length; i++) { const q = pk[i]; g.moveTo(q.x - rr * 0.1, q.y - rr * 0.35); g.arc(q.x - rr * 0.35, q.y - rr * 0.35, rr * 0.3, 0, TAU); }
      g.fill();
    }
  }
  // krzyżyk
  const dx = sin(a), dy = cos(a), b = { x: E.x + dx * 0.034 * h, y: E.y + dy * 0.034 * h }, k = { x: E.x + dx * 0.012 * h, y: E.y + dy * 0.012 * h };
  g.strokeStyle = tonC(PACIORKI, -0.2, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.0045);
  g.beginPath(); g.moveTo(E.x, E.y); g.lineTo(b.x, b.y); g.moveTo(k.x - dy * 0.009 * h, k.y + dx * 0.009 * h); g.lineTo(k.x + dy * 0.009 * h, k.y - dx * 0.009 * h); g.stroke();
}

// ------------------------------------------------------------------ kończyny

/**
 * Szeroki rękaw alby: od barku po łokieć jedna bryła, od połowy przedramienia rozszerza się w dzwon, którego
 * niższy róg opada; mankiet z ciemnej czerwieni ze złotą nitką. Pod nim chuda dłoń (okaleczony — w bandażu).
 */
function rekaw(r: Rysunek, K: Kaplan, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, piesc: boolean, bandaz = false): void {
  const { m, h, st, pm, czas, c } = r;
  const kol = st.szata;
  const ux = dl.x - lok.x, uy = dl.y - lok.y, L = Math.hypot(ux, uy) || 1, u = { x: ux / L, y: uy / L }, n = { x: -u.y, y: u.x };
  const r1 = 0.036 * h, r2 = 0.031 * h;
  const kon = { x: lok.x + ux * 0.45, y: lok.y + uy * 0.45 };
  const ramie = konczynaZgieta(bark, r1, lok, r2, kon, r2, [0.004 * h, 0.002 * h, 0.003 * h, 0.002 * h]);
  m.ksztalt(ramie, tonBryly(m, kol, dalej ? -0.48 : -0.12, bark, lok, r1 * 2, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    if (!m.bogato) { kreskaTuszu(g, ramie, h, dalej ? 0.6 : 0.85); return; }
    g.save(); g.clip(ramie);
    // fałdy w zgięciu łokcia
    g.strokeStyle = 'rgba(30,18,14,0.4)'; g.lineWidth = Math.max(0.4, h * 0.0025);
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const q = { x: lok.x - u.x * (0.01 + i * 0.012) * h, y: lok.y - u.y * (0.01 + i * 0.012) * h };
      g.moveTo(q.x - n.x * r2 * 0.9, q.y - n.y * r2 * 0.9); g.quadraticCurveTo(q.x + u.x * 0.01 * h, q.y + u.y * 0.01 * h, q.x + n.x * r2 * 0.2, q.y + n.y * r2 * 0.2);
    }
    g.stroke();
    const w2: Warstwa[] = [[r1 * 1.1, 'rgba(24,14,12,0.5)'], [r1 * 0.35, 'rgba(18,10,10,0.42)'], ...blaski(r, K, lok, r1 * 2), [-r1 * 0.3, 'rgba(255,242,220,0.14)']];
    if (!dalej) w2.push(warstwaKontr(h, 0.6));
    w2.push(warstwaTuszu(h, dalej ? 0.7 : 1));
    swiatlocien(g, ramie, w2, swiatloOsi(bark, dl), undefined, true);
    g.restore();
  });
  // dzwon rękawa
  const e = { x: lok.x + ux * 0.86, y: lok.y + uy * 0.86 }, roz = 0.043 * h;
  const c1 = { x: e.x + n.x * roz, y: e.y + n.y * roz }, c2 = { x: e.x - n.x * roz, y: e.y - n.y * roz };
  const zwis = 0.024 * h + pm.szata.a * 0.01 * h;
  if (c1.y > c2.y) c1.y += zwis; else c2.y += zwis;
  const ctrl = { x: e.x + u.x * 0.014 * h, y: e.y + u.y * 0.014 * h + zwis * 0.5 };
  const dz = new Path2D();
  dz.moveTo(kon.x + n.x * r2, kon.y + n.y * r2);
  dz.lineTo(c1.x, c1.y);
  dz.quadraticCurveTo(ctrl.x, ctrl.y, c2.x, c2.y);
  dz.lineTo(kon.x - n.x * r2, kon.y - n.y * r2);
  dz.closePath();
  m.ksztalt(dz, tonBryly(m, kol, dalej ? -0.5 : -0.14, kon, e, roz * 2, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    // brud ku brzegowi
    const bg = g.createLinearGradient(kon.x, kon.y, e.x, e.y);
    bg.addColorStop(0, 'rgba(52,40,30,0)'); bg.addColorStop(1, 'rgba(52,40,30,0.32)');
    g.fillStyle = bg; g.fill(dz);
    // mankiet: ciemnoczerwony pas przy brzegu, wzdłuż opadającego łuku
    const sh = { x: -u.x * 0.02 * h, y: -u.y * 0.02 * h };
    const mk = new Path2D();
    mk.moveTo(c1.x, c1.y); mk.quadraticCurveTo(ctrl.x, ctrl.y, c2.x, c2.y);
    mk.lineTo(c2.x + sh.x, c2.y + sh.y); mk.quadraticCurveTo(ctrl.x + sh.x, ctrl.y + sh.y, c1.x + sh.x, c1.y + sh.y); mk.closePath();
    g.fillStyle = tonC(st.stula, dalej ? -0.5 : -0.22, CIEN.tkanina); g.fill(mk);
    if (m.lod < 2) return;
    g.strokeStyle = tonC(st.zloto, dalej ? -0.6 : -0.3, CIEN.tkanina, 0.85); g.lineWidth = Math.max(0.4, h * 0.0028);
    g.beginPath(); g.moveTo(c1.x + sh.x, c1.y + sh.y); g.quadraticCurveTo(ctrl.x + sh.x, ctrl.y + sh.y, c2.x + sh.x, c2.y + sh.y); g.stroke();
    if (!m.bogato) { kreskaTuszu(g, dz, h, dalej ? 0.6 : 0.85); return; }
    // postrzępiony brzeg: wysnute nitki
    g.strokeStyle = tonC(st.stula, -0.35, CIEN.tkanina, 0.8); g.lineWidth = Math.max(0.35, h * 0.0018);
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const t = 0.1 + i * 0.2, q = { x: lerp(lerp(c1.x, ctrl.x, t), lerp(ctrl.x, c2.x, t), t), y: lerp(lerp(c1.y, ctrl.y, t), lerp(ctrl.y, c2.y, t), t) };
      const dlg = (0.006 + 0.01 * los(c.id, 2750 + i + (dalej ? 9 : 0))) * h;
      g.moveTo(q.x, q.y); g.lineTo(q.x + u.x * dlg * 0.4, q.y + dlg);
    }
    g.stroke();
    bryla(g, dz, h, [[roz * 0.8, 'rgba(24,14,12,0.5)'], [roz * 0.25, 'rgba(18,10,10,0.4)'], ...blaski(r, K, e, roz * 2), [-roz * 0.25, 'rgba(255,242,220,0.12)']], swiatloOsi(kon, e), dalej ? 0.7 : 1, dalej ? 0 : 0.6);
  });
  // dłoń: chuda, blada; okaleczony — przegub w bandażu przesiąkniętym krwią
  const skora = skoraKaplana(st);
  const d = dlon(dl, przed, 0.021 * h, piesc);
  m.ksztalt(d, tonC(skora, dalej ? -0.42 : -0.06, CIEN.skora), (g) => {
    if (m.bogato) swiatlocien(g, d, [[0.011 * h, 'rgba(26,14,12,0.45)'], ...blaski(r, K, dl, 0.03 * h), [-0.003 * h, 'rgba(255,240,220,0.14)']], SWB);
    else if (m.lod === 2) kreskaTuszu(g, d, h, 0.6);
    if (!bandaz || m.prosto) return;
    const a0 = { x: lok.x + ux * 0.8, y: lok.y + uy * 0.8 }, a1 = { x: lok.x + ux * 1.06, y: lok.y + uy * 1.06 }, rr = 0.02 * h;
    const bd = new Path2D();
    bd.moveTo(a0.x + n.x * rr, a0.y + n.y * rr); bd.lineTo(a1.x + n.x * rr * 0.92, a1.y + n.y * rr * 0.92);
    bd.lineTo(a1.x - n.x * rr * 0.92, a1.y - n.y * rr * 0.92); bd.lineTo(a0.x - n.x * rr, a0.y - n.y * rr); bd.closePath();
    g.fillStyle = tonC([178, 166, 142], dalej ? -0.42 : -0.12, CIEN.tkanina); g.fill(bd);
    przesiak(g, lerp(a0.x, a1.x, 0.55), lerp(a0.y, a1.y, 0.55), rr * 0.85, c.id + 21, 0.9, m.lod);
    if (m.lod === 2) {
      g.strokeStyle = 'rgba(30,18,14,0.55)'; g.lineWidth = Math.max(0.4, h * 0.002);
      g.beginPath();
      for (let i = 1; i <= 2; i++) { const t = i / 3; const q0 = { x: lerp(a0.x, a1.x, t - 0.08), y: lerp(a0.y, a1.y, t - 0.08) }, q1 = { x: lerp(a0.x, a1.x, t + 0.08), y: lerp(a0.y, a1.y, t + 0.08) }; g.moveTo(q0.x + n.x * rr, q0.y + n.y * rr); g.lineTo(q1.x - n.x * rr, q1.y - n.y * rr); }
      g.stroke();
      g.strokeStyle = 'rgba(14,8,8,0.7)'; g.lineWidth = Math.max(0.4, h * 0.0022); g.stroke(bd);
    }
    krople(g, a1.x - n.x * rr * 0.3, Math.max(a1.y, a0.y) + rr * 0.6, h, czas, c.id);
  });
}

/** Bosa, chuda stopa w sandale: podeszwa, rzemienie przez śródstopie i wokół kostki, brud. */
function stopa(r: Rysunek, K: Kaplan, stp: Stopa, dalej: boolean): void {
  const { m, h, st, s } = r;
  const b = sciezkaStopy(stp, h);
  // stopa wystająca spod alby za plecami leży w cieniu
  const wCieniu = dalej || stp.kostka.x < s.biodro.x - 0.08 * h;
  m.ksztalt(b, tonC(mieszaj(skoraKaplana(st), [62, 50, 40], 0.5), wCieniu ? -0.5 : -0.24, CIEN.skora), (g) => {
    if (m.prosto) return;
    podeszwa(g, stp, h, tonC(RZEMIEN, -0.35, CIEN.tkanina));
    if (m.lod < 2) return;
    const s = stp.kat, fx = cos(s), fy = -sin(s), nx = sin(s), ny = cos(s);
    const P = (f: number, nn: number): Pkt => ({ x: stp.podeszwa.x + fx * f * h + nx * nn * h, y: stp.podeszwa.y + fy * f * h + ny * nn * h });
    // palce: krótkie bruzdy przy czubku stopy
    g.strokeStyle = 'rgba(20,12,10,0.55)'; g.lineWidth = Math.max(0.4, h * 0.0022); g.lineCap = 'round';
    g.beginPath();
    for (const f of [0.066, 0.076]) { const q0 = P(f, -0.016 + (f - 0.066) * 0.6), q1 = P(f + 0.004, -0.004); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y); }
    g.stroke();
    g.strokeStyle = tonC(RZEMIEN, dalej ? -0.4 : -0.1, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.0055);
    g.beginPath();
    for (const [f0, f1] of [[0.012, 0.028], [0.036, 0.048]] as const) { const q0 = P(f0, 0), q1 = P(f1, -0.024); g.moveTo(q0.x, q0.y); g.lineTo(q1.x, q1.y); }
    const k0 = P(-0.026, -0.03), k1 = P(0.008, -0.036); g.moveTo(k0.x, k0.y); g.lineTo(k1.x, k1.y);
    g.stroke();
    if (m.bogato) bryla(g, b, h, [[0.012 * h, 'rgba(20,10,8,0.45)'], ...blaski(r, K, stp.kostka, 0.04 * h), [-0.004 * h, 'rgba(255,240,220,0.12)']], SWB, dalej ? 0.6 : 0.85);
    else kreskaTuszu(g, b, h, 0.6);
  });
}

/** Bosa stopa z profilu: pięta, ścięgno, podbicie, palce (w układzie stopy — idzie za jej kątem). */
function sciezkaStopy(stp: Stopa, h: number): Path2D {
  const s = stp.kat, fx = cos(s), fy = -sin(s), nx = sin(s), ny = cos(s);
  const P = (f: number, n: number): [number, number] => [stp.podeszwa.x + (fx * f + nx * n) * h, stp.podeszwa.y + (fy * f + ny * n) * h];
  return gladki([P(-0.03, 0.004), P(-0.038, -0.016), P(-0.03, -0.044), P(0.004, -0.054), P(0.032, -0.034), P(0.066, -0.02), P(0.09, -0.009), P(0.088, 0.004), P(0.03, 0.005)]);
}

/** Goła łydka (gdy wisi na linie, alba podjeżdża za kolana). */
function lydka(r: Rysunek, kol: Pkt, stp: Stopa, dalej: boolean): void {
  const { m, h, st } = r;
  const p = konczyna(kol, 0.026 * h, stp.kostka, 0.019 * h, 0.007 * h, 0.002 * h);
  m.ksztalt(p, tonBryly(m, skoraKaplana(st), dalej ? -0.45 : -0.15, kol, stp.kostka, 0.05 * h, CIEN.skora), (g) => { if (m.lod === 2) kreskaTuszu(g, p, h, 0.7); });
}

/** Dłonie złożone do modlitwy: przyciśnięte do siebie, palce ku górze. */
function zlozoneDlonie(r: Rysunek, K: Kaplan): void {
  const { m, s, st, h } = r;
  const x = (s.dlonA.x + s.dlonB.x) / 2, y = (s.dlonA.y + s.dlonB.y) / 2;
  const p = new Path2D(); p.ellipse(x + 0.006 * h, y - 0.02 * h, 0.015 * h, 0.033 * h, 0.35, 0, TAU);
  m.ksztalt(p, tonC(skoraKaplana(st), -0.06, CIEN.skora), (g) => {
    if (m.prosto) return;
    g.strokeStyle = 'rgba(40,22,18,0.7)'; g.lineWidth = Math.max(0.4, h * 0.0035);
    g.beginPath(); g.moveTo(x + 0.002 * h, y + 0.008 * h); g.lineTo(x + 0.013 * h, y - 0.048 * h); g.stroke();
    if (m.bogato) swiatlocien(g, p, [[0.01 * h, 'rgba(26,14,12,0.45)'], ...blaski(r, K, { x, y }, 0.03 * h)], SWB);
  });
}

// ------------------------------------------------------------------ głowa

function glowaKaplana(r: Rysunek, K: Kaplan): void {
  const { m, s, st, h, c, cz, czas } = r;
  const skora = skoraKaplana(st);
  const sz = konczyna(s.bark, 0.023 * h, s.glowa, 0.021 * h);
  m.ksztalt(sz, tonBryly(m, skora, -0.3, s.bark, s.glowa, 0.05 * h, CIEN.skora));
  if (!st.wKapie && !m.prosto) kolnierz(r, K);
  // twarz grzeje najmocniejsze z jego świateł
  let lampa: Pkt | null = null, sila = 0;
  for (const L of K.swiatla) {
    const a = L.sila * 1.8 * clamp(1.15 - Math.hypot(L.q.x - s.glowa.x, L.q.y - s.glowa.y) / L.zasieg, 0, 1);
    if (a > sila) { sila = a; lampa = L.q; }
  }
  twarzMroczna(r, { skora, cien: 0.06, lampa, lampaSila: clamp(sila, 0, 1), popiol: los(c.id, 41) < 0.6, lzy: st.szalenstwo > 0.5 ? st.szalenstwo : 0, zmarszczki: st.stary, ucho: true });
  // szept modlitwy: para z ust
  if (m.lod > 0 && (cz === 'modli' || cz === 'czyta')) m.szczegol((g) => { const u = naGlowie(s, s.katG, 1.0, 0.6); para(g, u.x, u.y, h, czas, c.id, 0.8); });
  tonsura(r, K);
}

/** Tonsura: wianek krótkich włosów dookoła głowy i wygolone ciemię z blaskiem; u starych siwy. */
function tonsura(r: Rysunek, K: Kaplan): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const wl = st.stary ? mieszaj(st.wlosy, [110, 106, 100], 0.25) : mieszaj(st.wlosy, [58, 52, 48], 0.15);
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const p = poGlowie(s, kat, [[-0.62, 0.5], [-1.0, 0.26], [-1.1, -0.2], [-0.98, -0.56], [-0.72, -0.78], [-0.36, -0.84], [0.04, -0.84], [0.36, -0.8], [0.58, -0.7], [0.62, -0.6], [0.36, -0.6], [0.04, -0.54], [-0.26, -0.46], [-0.44, -0.22], [-0.5, 0.12], [-0.44, 0.4]]);
  m.ksztalt(p, tonC(wl, -0.06, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    if (!m.bogato) { kreskaTuszu(g, p, h, 0.7); return; }
    g.save(); g.clip(p);
    // krótkie, gęste włosy: kreski w dół w dwóch tonach — w wianku nad uchem i z tyłu głowy
    g.lineWidth = Math.max(0.4, rg * 0.03);
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = k ? tonC(wl, 0.3, CIEN.tkanina, 0.45) : 'rgba(6,4,4,0.45)';
      g.beginPath();
      for (let i = 0; i < 22; i++) {
        const u = los(id, 2800 + i + k * 30), v = los(id, 2850 + i + k * 30);
        const [x0, y0] = i < 12 ? [lerp(-0.5, 0.55, u), lerp(-0.84, -0.6, v)] : [lerp(-1.05, -0.5, u), lerp(-0.7, 0.36, v)];
        const a = P(x0, y0), b = P(x0 - 0.05, y0 + 0.16);
        g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
      }
      g.stroke();
    }
    swiatlocien(g, p, [[rg * 0.3, 'rgba(4,2,2,0.5)'], ...blaski(r, K, s.glowa, rg * 2), [-rg * 0.08, 'rgba(255,236,206,0.14)'], warstwaTuszu(h, 0.8)], SW, undefined, true);
    g.restore();
  });
  // blask na wygolonym ciemieniu
  if (m.lod === 2) m.szczegol((g) => {
    const q = P(-0.05, -0.93);
    g.fillStyle = 'rgba(255,240,222,0.2)'; g.beginPath(); g.ellipse(q.x, q.y, rg * 0.3, rg * 0.06, kat - 0.1, 0, TAU); g.fill();
  });
}

/**
 * Nimb: nie złota tarcza z fresku, tylko światło — łuna, jasny pierścień, drugi bledszy w środku i cienkie
 * promienie, które wolno się obracają; z bliska drobiny światła krążą po obwodzie.
 */
function nimb(g: CanvasRenderingContext2D, x: number, y: number, r: number, sila: number, lod: number, czas: number, id: number): void {
  poswiata(g, x, y, r * 2.3, [255, 196, 120], 0.22 * sila);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, r * 0.35, x, y, r * 1.02);
  gr.addColorStop(0, 'rgba(255,214,150,0)'); gr.addColorStop(0.8, `rgba(255,214,150,${(0.1 * sila).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.02, 0, TAU); g.fill();
  g.strokeStyle = `rgba(255,228,176,${(0.8 * sila).toFixed(3)})`; g.lineWidth = Math.max(0.9, r * 0.065);
  g.beginPath(); g.arc(x, y, r * 0.9, 0, TAU); g.stroke();
  if (lod > 0) {
    g.strokeStyle = `rgba(255,206,140,${(0.3 * sila).toFixed(3)})`; g.lineWidth = Math.max(0.5, r * 0.025);
    g.beginPath(); g.arc(x, y, r * 0.72, 0, TAU); g.stroke();
  }
  if (lod === 2) {
    const obr = czas * 0.00012 + id;
    g.strokeStyle = `rgba(255,222,160,${(0.34 * sila).toFixed(3)})`; g.lineWidth = Math.max(0.4, r * 0.014);
    g.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = obr + (i / 28) * TAU, r0 = r * 0.98, r1 = r * (i % 2 ? 1.14 : 1.28);
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    g.stroke();
    g.fillStyle = `rgba(255,240,200,${(0.7 * sila).toFixed(3)})`;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = czas * (0.0006 + i * 0.00013) + i * 1.3 + id, q = r * (0.9 + 0.06 * sin(czas * 0.002 + i)), rr = Math.max(0.5, r * 0.03);
      const px = x + Math.cos(a) * q, py = y + Math.sin(a) * q;
      g.moveTo(px + rr, py); g.arc(px, py, rr, 0, TAU);
    }
    g.fill();
  }
  g.restore();
}

// ------------------------------------------------------------------ rekwizyty

/**
 * Krzyż procesyjny: drzewce z ciemnego, wyślizganego drewna, w chwycie owinięte rzemieniem, u dołu żelazne
 * okucie; na szczycie krzyż z pociemniałego brązu o rozszerzonych ramionach, z pierścieniem za skrzyżowaniem
 * i matowym czerwonym kamieniem, pod ramionami wypłowiałe wstążki. Zwraca dolny koniec drzewca.
 */
function krzyzProcesyjny(r: Rysunek, K: Kaplan, x: number, y: number, kat: number, doZiemi: boolean): Pkt {
  const { m, h, st, czas, c, pm } = r;
  const d = kier(kat), n = kier(kat - PI / 2);
  const dol = doZiemi && d.y > 0.35 ? clamp(-y / d.y, 0.2 * h, 0.8 * h) : 0.45 * h;
  const gora = 0.38 * h;
  const A = { x: x + d.x * dol, y: y + d.y * dol }, B = { x: x - d.x * gora, y: y - d.y * gora };
  const drewno = mieszaj(st.drewno, [36, 26, 20], 0.35);
  const sz = Math.max(1, h * 0.015);
  m.kreska(A.x, A.y, B.x, B.y, sz, tonBryly(m, drewno, -0.1, A, B, sz * 1.6, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    // żelazne okucie u dołu i rzemień w chwycie
    g.lineCap = 'butt';
    g.strokeStyle = tonC([70, 70, 74], -0.2, CIEN.metal); g.lineWidth = sz * 1.15;
    g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(A.x - d.x * 0.03 * h, A.y - d.y * 0.03 * h); g.stroke();
    g.strokeStyle = tonC(RZEMIEN, -0.1, CIEN.tkanina); g.lineWidth = sz * 1.25;
    g.beginPath(); g.moveTo(x + d.x * 0.045 * h, y + d.y * 0.045 * h); g.lineTo(x - d.x * 0.055 * h, y - d.y * 0.055 * h); g.stroke();
    g.strokeStyle = 'rgba(10,6,4,0.6)'; g.lineWidth = Math.max(0.4, h * 0.002);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const t = -0.045 + i * 0.018, q = { x: x - d.x * t * h, y: y - d.y * t * h };
      g.moveTo(q.x + n.x * sz * 0.62, q.y + n.y * sz * 0.62); g.lineTo(q.x - n.x * sz * 0.62 - d.x * 0.008 * h, q.y - n.y * sz * 0.62 - d.y * 0.008 * h);
    }
    g.stroke();
    g.lineCap = 'round';
    if (m.bogato) {
      // wyślizgane drewno łapie światło wzdłuż jednej krawędzi
      const k = SW.x * n.x + SW.y * n.y > 0 ? 1 : -1;
      g.strokeStyle = 'rgba(255,230,190,0.18)'; g.lineWidth = Math.max(0.4, sz * 0.22);
      g.beginPath(); g.moveTo(B.x + n.x * k * sz * 0.28, B.y + n.y * k * sz * 0.28); g.lineTo(A.x + n.x * k * sz * 0.28, A.y + n.y * k * sz * 0.28); g.stroke();
    }
  });
  const cx = B.x - d.x * 0.075 * h, cy = B.y - d.y * 0.075 * h;
  // pierścień za skrzyżowaniem
  if (!m.prosto) {
    const pr = new Path2D();
    pr.arc(cx, cy, 0.036 * h, 0, TAU, false); pr.moveTo(cx + 0.027 * h, cy); pr.arc(cx, cy, 0.027 * h, 0, TAU, true);
    m.ksztalt(pr, tonC(BRAZ, -0.3, CIEN.metal), (g) => { if (m.lod === 2) kreskaTuszu(g, pr, h, 0.6); });
  }
  // krzyż o ramionach rozszerzonych ku końcom
  const krzyz = new Path2D();
  const RAMIONA = [[-d.x, -d.y, 0.078], [d.x, d.y, 0.07], [n.x, n.y, 0.06], [-n.x, -n.y, 0.06]] as const;
  for (const [ax, ay, dl] of RAMIONA) {
    const px = -ay, py = ax, L = dl * h;
    krzyz.moveTo(cx + px * 0.009 * h, cy + py * 0.009 * h);
    krzyz.lineTo(cx + ax * L + px * 0.019 * h, cy + ay * L + py * 0.019 * h);
    krzyz.lineTo(cx + ax * L - px * 0.019 * h, cy + ay * L - py * 0.019 * h);
    krzyz.lineTo(cx - px * 0.009 * h, cy - py * 0.009 * h);
    krzyz.closePath();
  }
  const wahadlo = pm.wstega.a + 0.35;
  m.ksztalt(krzyz, tonBryly(m, BRAZ, -0.05, { x: cx - n.x * 0.06 * h, y: cy - n.y * 0.06 * h }, { x: cx + n.x * 0.06 * h, y: cy + n.y * 0.06 * h }, 0.08 * h, CIEN.metal), (g) => {
    if (m.prosto) return;
    // guz pośrodku z matowym czerwonym kamieniem
    g.fillStyle = tonC(BRAZ, -0.22, CIEN.metal); g.beginPath(); g.arc(cx, cy, 0.016 * h, 0, TAU); g.fill();
    g.fillStyle = tonC(mieszaj(st.stula, [60, 10, 10], 0.3), 0, CIEN.tkanina); g.beginPath(); g.arc(cx, cy, Math.max(0.6, 0.009 * h), 0, TAU); g.fill();
    // wypłowiałe wstążki pod ramionami
    g.strokeStyle = tonC(mieszaj(st.stula, [96, 76, 64], 0.3), -0.15, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.0065);
    for (const k of [1, -1]) {
      const zx = cx + n.x * k * 0.05 * h + d.x * 0.012 * h, zy = cy + n.y * k * 0.05 * h + d.y * 0.012 * h;
      const a = wahadlo * 0.7 + sin(czas * 0.004 + c.id + k) * 0.15;
      g.beginPath(); g.moveTo(zx, zy); g.quadraticCurveTo(zx + sin(a) * 0.02 * h, zy + 0.025 * h, zx + sin(a * 1.3) * 0.045 * h, zy + cos(a) * 0.05 * h); g.stroke();
    }
    if (m.lod < 2) return;
    // ryty wzdłuż ramion i blask kamienia
    g.strokeStyle = 'rgba(20,12,6,0.55)'; g.lineWidth = Math.max(0.4, h * 0.0025);
    g.beginPath();
    for (const [ax, ay, dl] of RAMIONA) { g.moveTo(cx + ax * 0.022 * h, cy + ay * 0.022 * h); g.lineTo(cx + ax * (dl - 0.012) * h, cy + ay * (dl - 0.012) * h); }
    g.stroke();
    g.fillStyle = 'rgba(255,200,180,0.5)'; g.beginPath(); g.arc(cx - 0.003 * h, cy - 0.003 * h, Math.max(0.4, 0.003 * h), 0, TAU); g.fill();
    if (!m.bogato) { kreskaTuszu(g, krzyz, h, 0.7); return; }
    g.save(); g.clip(krzyz);
    // patyna w zagłębieniach
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(96,126,104,0.4)';
    for (let i = 0; i < 6; i++) {
      const [ax, ay, dl] = RAMIONA[i % 4], t = (0.3 + 0.55 * los(c.id, 2900 + i)) * dl * h;
      g.beginPath(); g.ellipse(cx + ax * t + n.x * 0.006 * h * (los(c.id, 2910 + i) - 0.5), cy + ay * t, 0.006 * h, 0.004 * h, los(c.id, 2920 + i) * PI, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    swiatlocien(g, krzyz, [[0.012 * h, 'rgba(6,4,2,0.55)'], ...blaski(r, K, { x: cx, y: cy }, 0.06 * h), [-0.004 * h, 'rgba(255,232,180,0.4)'], warstwaTuszu(h, 0.8)], SW, undefined, true);
    g.restore();
    kreskaTuszu(g, krzyz, h, 0.8);
  });
  return A;
}

/** Ołtarz stawiany przez pobożnego: nierówny blok skały z krzyżem wyrytym na czole. */
function oltarz(r: Rysunek, K: Kaplan, kx: number): void {
  const { m, h, st } = r;
  const w = 0.064 * h, wy = 0.075 * h;
  const p = new Path2D();
  p.moveTo(kx - w, 0); p.lineTo(kx - w * 1.03, -wy * 0.9); p.lineTo(kx - w * 0.7, -wy * 1.03); p.lineTo(kx + w * 0.4, -wy); p.lineTo(kx + w * 1.02, -wy * 0.9); p.lineTo(kx + w, 0); p.closePath();
  m.ksztalt(p, tonBryly(m, [104, 98, 90], -0.12, { x: kx - w, y: -wy * 0.5 }, { x: kx + w, y: -wy * 0.5 }, w * 1.4, CIEN.kamien), (g) => {
    if (m.prosto) return;
    g.strokeStyle = 'rgba(30,24,20,0.6)'; g.lineWidth = Math.max(0.5, h * 0.004);
    g.beginPath(); g.moveTo(kx - w, -wy * 0.45); g.lineTo(kx + w, -wy * 0.5); g.moveTo(kx - w * 0.1, -wy * 0.98); g.lineTo(kx - w * 0.05, -wy * 0.48); g.stroke();
    // krzyż ryty w kamieniu
    g.strokeStyle = tonC(st.stula, -0.35, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.007);
    g.beginPath(); g.moveTo(kx + w * 0.5, -wy * 0.9); g.lineTo(kx + w * 0.5, -wy * 0.56); g.moveTo(kx + w * 0.34, -wy * 0.79); g.lineTo(kx + w * 0.66, -wy * 0.79); g.stroke();
    if (m.bogato) bryla(g, p, h, [[0.02 * h, 'rgba(8,6,6,0.5)'], ...blaski(r, K, { x: kx, y: -wy / 2 }, 0.08 * h), [-0.005 * h, 'rgba(255,240,220,0.12)']], SW);
    else if (m.lod === 2) kreskaTuszu(g, p, h, 0.8);
  });
}

/** Ewangeliarz: oprawa z ciemnej, wytartej skóry z mosiężnymi narożnikami, pożółkłe karty, świecące litery. */
function ksiega(r: Rysunek, q: Pkt, blysk: number): void {
  const { m, p, st, h, c, czas } = r;
  const bx = q.x, by = q.y;
  m.szczegol((g) => poswiata(g, bx, by, h * (0.26 + blysk * 0.4), [255, 214, 150], 0.26 + p.blask * 0.2));
  const w = 0.075 * h, hh = 0.1 * h;
  const ok = new Path2D(); ok.rect(bx - w - 0.008 * h, by - hh / 2 - 0.008 * h, w * 2 + 0.016 * h, hh + 0.016 * h);
  m.ksztalt(ok, tonC([70, 34, 26], -0.12, CIEN.tkanina), (g) => {
    const karty = new Path2D();
    karty.moveTo(bx - w, by - hh / 2); karty.quadraticCurveTo(bx - w / 2, by - hh / 2 - 0.012 * h, bx, by - hh / 2 + 0.004 * h);
    karty.quadraticCurveTo(bx + w / 2, by - hh / 2 - 0.012 * h, bx + w, by - hh / 2);
    karty.lineTo(bx + w, by + hh / 2); karty.quadraticCurveTo(bx + w / 2, by + hh / 2 - 0.008 * h, bx, by + hh / 2 + 0.004 * h);
    karty.quadraticCurveTo(bx - w / 2, by + hh / 2 - 0.008 * h, bx - w, by + hh / 2); karty.closePath();
    g.fillStyle = 'rgb(206,190,150)'; g.fill(karty);
    if (m.prosto) return;
    // karty świecą od środka
    const gr = g.createRadialGradient(bx, by, 0, bx, by, w * 1.1);
    gr.addColorStop(0, `rgba(255,238,196,${(0.4 + 0.3 * blysk).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,238,196,0)');
    g.fillStyle = gr; g.fill(karty);
    // grzbiet, wiersze tuszem, czerwony inicjał
    g.fillStyle = 'rgba(70,46,24,0.3)'; g.fillRect(bx - 0.006 * h, by - hh / 2, 0.012 * h, hh);
    g.strokeStyle = 'rgba(40,24,16,0.6)'; g.lineWidth = Math.max(0.4, h * 0.004);
    g.beginPath();
    for (let i = 1; i < 5; i++) { const y = by - hh / 2 + (hh * i) / 5; g.moveTo(bx - w * 0.82, y); g.lineTo(bx - w * 0.15, y); g.moveTo(bx + w * 0.15, y); g.lineTo(bx + w * 0.82, y); }
    g.stroke();
    g.fillStyle = tonC(st.stula, 0.05, CIEN.tkanina); g.fillRect(bx - w * 0.8, by - hh / 2 + hh * 0.08, w * 0.2, w * 0.2);
    // mosiężne narożniki oprawy
    g.fillStyle = tonC(BRAZ, 0.05, CIEN.metal);
    const o = 0.008 * h, kk = 0.02 * h;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const ex = bx + sx * (w + o), ey = by + sy * (hh / 2 + o);
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - sx * kk, ey); g.lineTo(ex, ey - sy * kk); g.closePath(); g.fill();
    }
    // przewracana karta
    const kr = (czas * 0.0009 + c.id) % 1;
    if (kr < 0.3) {
      const t = kr / 0.3, x = bx + w * Math.cos(t * PI), lift = 0.02 * h * Math.sin(t * PI);
      g.fillStyle = 'rgb(214,198,160)';
      g.beginPath(); g.moveTo(bx, by - hh / 2); g.quadraticCurveTo((bx + x) / 2, by - hh / 2 - lift * 1.5, x, by - hh / 2 - lift); g.lineTo(x, by + hh / 2 - lift); g.quadraticCurveTo((bx + x) / 2, by + hh / 2 - lift * 1.2, bx, by + hh / 2); g.closePath(); g.fill();
    }
    if (m.lod < 2) return;
    // litery unoszą się z kart i gasną
    g.fillStyle = 'rgba(255,226,160,0.85)';
    for (let i = 0; i < 4; i++) {
      const t = (czas * 0.0004 + i * 0.25 + c.id * 0.1) % 1;
      const x = bx + sin(t * 7 + i) * 0.04 * h + (i - 1.5) * 0.02 * h, y = by - hh / 2 - t * 0.25 * h;
      g.globalAlpha = 1 - t; g.fillRect(x, y, h * 0.008, h * 0.012); g.fillRect(x - h * 0.004, y + h * 0.003, h * 0.016, h * 0.004);
    }
    g.globalAlpha = 1;
    kreskaTuszu(g, ok, h, 0.7);
  });
  if (blysk > 0 && !m.prosto) m.szczegol((g) => poswiata(g, bx + 0.08 * h, by, h * 0.6 * blysk + 0.1 * h, [255, 244, 210], 0.55 * blysk));
}
