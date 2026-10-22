import { CIEN, clamp, cos, katOdc, kier, lerp, los, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import { but, dlon, podeszwa } from './malarz';
import { kesChleba, tulowSciezka, type Rysunek } from './wspolne';
import { sladBroni, uderzenie } from './pamiec';
import type { Stopa } from './szkielet';
import { glowaKrzyzowca } from './helm';
import { mieczKrzyzowca, sciezkaTarczy, strzala, tarcza } from './uzbrojenie';
import { bez, bryla, cienieRzucane, kolcze, konczynaZgieta, KREW, KREW_SUCHA, plisa, przesiak, rgba, rozbryzg, swiatlocien, swiatloOsi, SWB, tonBryly, warstwaTuszu, zaciek, ziarno } from './tusz';
import { nosi } from '../../sim/zbroja';

/**
 * Rycerz — krzyżowiec po bitwie (Remake v2), malowany jak mroczna ilustracja tuszem: twarde cienie
 * rzucane przez każdą bryłę, kontur grubszy po stronie cienia, ciemna, przygaszona paleta, z której światło
 * lampki wyłuskuje brudne płótno wapenroku, krwawy krzyż i wypolerowany hełm.
 *
 * Kolczuga od kaptura po stopy; na niej płócienny wapenrok do kolan z krzyżem patée — przepasany, rozcięty
 * z przodu (w kroku płótno idzie za nogami), podarty u dołu, ubłocony, przesiąknięty krwią z rany w boku;
 * z tyłu ciężki płaszcz w strzępach. Hełm garnczkowy albo otwarty z nosalem (helm.ts), tarcza w kształcie
 * żelazka i miecz (uzbrojenie.ts). Część nosi bandaż na przedramieniu, część — złamaną strzałę w barku.
 * Wygląd zależy od numeru postaci (los), więc każdy rycerz jest trochę inny. W szale krwi (ołtarz) żarzy się czerwienią.
 *
 * Alpha, etap 3f: na start tylko kolczuga, miecz i płaszcz (bez hełmu kolczy kaptur odsłania twarz). Części z kuźni
 * (sim/zbroja.ts) pojawiają się, gdy je założy: hełm, naramienniki (czasza i dwie lamy) na barkach, napierśnik na wapenroku
 * (z krzyżem malowanym na blasze), nakolanniki i tarcza.
 */

type Tulow = (u: number, f: number) => Pkt;

/** Co rzuca cień na wapenrok i kolczugę tułowia: bliższa ręka, tarcza w dłoni, głowa. */
interface Cienie { reka: Path2D; tarcza: Path2D | null; glowa: Path2D }

/** Wysokość pasa na tułowiu (ułamek od biodra do barku). */
const PAS = 0.17;
const RUDA: Rgb = [70, 52, 38];
/** Płaszcz wisi za plecami: cień kładziemy ze zwykłego światła lampki (z góry). */
const SW_PLASZCZ = { x: 0.45, y: -0.89 };

export function rysujRycerza(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm } = r;
  // przygaszona aura (z bliska sylwetkę wydobywa światłocień, nie jasna obwódka) i kontur tuszem
  m.obrys = { aura: h < 60 ? 0.9 : clamp(0.9 - (h - 60) / 240, 0.28, 0.9), kontur: 'rgba(12,8,8,0.96)', spadek: [-0.62 * h, 0, 0.34] };
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T: Tulow = (u, f) => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });
  const id = c.id;

  const naPlecach = r.cz === 'wspina' || r.cz === 'spada';
  // etap 3f: co z kuźni ma na sobie
  const zTarcza = nosi(c, 'tarcza'), naramienniki = nosi(c, 'naramienniki'), nakolanniki = nosi(c, 'nakolanniki');
  // tarcza w dłoni: opuszczona, gdy nie walczy
  const tq = { x: s.dlonB.x + 0.03 * h, y: s.dlonB.y + 0.04 * h - p.tarcza * 0.07 * h, obr: -0.12 + p.tarcza * 0.16 };
  const cienie: Cienie = { reka: new Path2D(), tarcza: null, glowa: new Path2D() };
  if (!m.prosto) {
    cienie.reka = konczynaZgieta(s.bark, 0.043 * h, s.lokA, 0.03 * h, s.dlonA, 0.024 * h);
    if (!naPlecach && zTarcza) cienie.tarcza = sciezkaTarczy(h, id, tq.x, tq.y, tq.obr, 1);
    cienie.glowa.arc(s.glowa.x, s.glowa.y + s.rg * 0.2, s.rg * 1.2, 0, TAU);
  }
  plaszcz(r, T);
  if (naPlecach && zTarcza) tarcza(r, s.bark.x - 0.07 * h, s.bark.y + 0.14 * h, 0.25 + pm.worek.a * 0.3, 0.85);
  pochwa(r, T);
  reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, true, false);
  if (naramienniki) naramiennik(r, s.barkB, s.lokB, true);
  noga(r, s.kolB, s.stB, true, nakolanniki);
  noga(r, s.kolA, s.stA, false, nakolanniki);
  // kolczuga na tułowiu — widać ją na barkach, pod pachą i w rozcięciu wapenroku
  const tul = tulowSciezka(s, h, 0.08, 0.066, 1.1, 1.0);
  m.ksztalt(tul, tonBryly(m, st.kolczuga, -0.46, s.biodro, s.bark, 0.15 * h), (g) => {
    if (m.bogato) cienieRzucane(g, tul, [[cienie.reka, 0.022 * h, 0.4], [cienie.glowa, 0.03 * h, 0.4]]);
    kolcze(m, g, tul, h, 0.15 * h, false, s.biodro, s.bark);
  });
  wapenrok(r, T, cienie);
  if (nosi(c, 'napiersnik')) napiersnik(r, T, cienie);
  pas(r, T, tryb.narzedzie !== 'miecz');
  glowaKrzyzowca(r);

  // złamana strzała wbita w bark (od tyłu)
  if (los(id, 22) < 0.35 && !m.prosto) {
    const q = T(0.88, -0.062);
    m.szczegol((g) => {
      rozbryzg(g, q.x, q.y + 0.004 * h, 0.011 * h, PI * 0.5, id + 11, KREW, 0.85, m.lod);
      strzala(g, q.x, q.y, PI + 0.9 + 0.3 * los(id, 24), (0.06 + 0.03 * los(id, 25)) * h, h, true, m.lod);
    });
  }

  // tarcza w dalszej ręce — przed tułowiem
  if (!naPlecach && zTarcza) tarcza(r, tq.x, tq.y, tq.obr, 1);

  // miecz i bliższa ręka
  if (tryb.narzedzie === 'miecz') {
    const czubek = { x: s.dlonA.x + sin(s.narz) * 0.536 * h, y: s.dlonA.y + cos(s.narz) * 0.536 * h };
    const slad = sladBroni(pm, czubek, h, czas, p.smuga > 0.05);
    if (slad.length > 1 && !m.prosto) m.szczegol((g) => smuga(g, slad, s.bark, h, p.smuga, st.szal));
    const koniec = mieczKrzyzowca(m, s.dlonA.x, s.dlonA.y, s.narz, h, st.skorzane, id, czas, st.szal);
    uderzenie(pm, p.cios, koniec, h, czas);
  }
  reka(r, s.bark, s.lokA, s.dlonA, s.przedA, false, tryb.narzedzie === 'miecz' || tryb.grzyb, los(id, 23) < 0.5);
  if (naramienniki) naramiennik(r, s.bark, s.lokA, false);
  // żelazna zapinka płaszcza pod szyją
  {
    const f = T(1.0, 0.04), rr = Math.max(1, 0.013 * h);
    const fb = new Path2D(); fb.arc(f.x, f.y, rr, 0, TAU);
    fb.moveTo(f.x + rr * 0.45, f.y); fb.arc(f.x, f.y, rr * 0.45, 0, TAU, true);
    m.ksztalt(fb, tonC([92, 90, 90], -0.1, CIEN.metal), (g) => {
      if (m.bogato) swiatlocien(g, fb, [[rr * 0.5, 'rgba(4,4,8,0.6)'], [-rr * 0.25, 'rgba(255,248,232,0.5)']]);
    });
  }
  if (tryb.grzyb) m.szczegol((g) => kesChleba(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
}

// ------------------------------------------------------------------ płaszcz

/** Postrzępiony brzeg od bieżącego punktu ścieżki (A) do B: pasy płótna różnej długości zwisają w stronę `dol`. */
function strzepy(p: Path2D, A: Pkt, B: Pkt, dol: Pkt, gl: number, id: number, szuf: number, n: number): void {
  const w: number[] = [];
  let suma = 0;
  for (let i = 0; i < n; i++) { const x = 0.45 + los(id, szuf + i); w.push(x); suma += x; }
  const P = (t: number, d: number): [number, number] => [lerp(A.x, B.x, t) + dol.x * d, lerp(A.y, B.y, t) + dol.y * d];
  let t = 0;
  for (let i = 0; i < n; i++) {
    const t0 = t, t1 = t + w[i] / suma, sz = t1 - t0, tm = (t0 + t1) / 2;
    t = t1;
    const dl = gl * (0.12 + 0.88 * Math.pow(los(id, szuf + 20 + i), 2));
    const sk = (los(id, szuf + 40 + i) - 0.5) * 0.4;
    p.lineTo(...P(t0 + sz * 0.1, dl * (0.8 + sk)));
    p.quadraticCurveTo(...P(tm, dl * (1.12 + sk * 0.3)), ...P(t1 - sz * 0.14, dl * (0.86 - sk)));
    p.lineTo(...P(t1, gl * 0.05 * los(id, szuf + 60 + i)));
  }
}

/** Ciężki płaszcz: spięty pod szyją, spływa po plecach, w strzępach u dołu; w biegu odlatuje do tyłu. */
function plaszcz(r: Rysunek, T: Tulow): void {
  const { m, h, st, c, czas, pm } = r;
  const id = c.id;
  const a = clamp(pm.peleryna.a + 0.18, -1.6, 0.4) * 0.8 - 0.05;
  const dol = { x: sin(a), y: cos(a) }, bok = { x: cos(a), y: -sin(a) };
  const A = T(0.99, -0.072), F = T(1.02, 0.03);
  const dl = 0.6 * h;
  const H = { x: A.x + dol.x * dl, y: A.y + dol.y * dl };
  const fal = sin(czas * 0.006 + id) * 0.012 * h * clamp(Math.abs(pm.vx) / 3 + 0.25, 0, 1);
  const Hp = { x: H.x + bok.x * 0.1 * h, y: H.y + bok.y * 0.1 * h };
  const Ht = { x: H.x - bok.x * 0.15 * h + fal, y: H.y - bok.y * 0.15 * h };
  const pl = new Path2D();
  pl.moveTo(F.x, F.y);
  const c1 = T(0.55, 0.01);
  pl.quadraticCurveTo(c1.x, c1.y, Hp.x, Hp.y);
  strzepy(pl, Hp, Ht, dol, 0.075 * h, id, 200, 8);
  pl.quadraticCurveTo(A.x - 0.11 * h + fal * 0.5, (A.y + Ht.y) / 2, A.x - 0.012 * h, A.y - 0.01 * h);
  const c2 = T(1.06, -0.02);
  pl.quadraticCurveTo(c2.x, c2.y, F.x, F.y);
  pl.closePath();
  let styl: string | CanvasGradient = tonC(st.plaszcz, -0.25, CIEN.tkanina);
  if (!m.prosto) {
    const gr = m.g.createLinearGradient(A.x, A.y, H.x, H.y + 0.05 * h);
    gr.addColorStop(0, tonC(st.plaszcz, 0.02, CIEN.tkanina)); gr.addColorStop(0.6, tonC(st.plaszcz, -0.25, CIEN.tkanina)); gr.addColorStop(1, tonC(st.plaszcz, -0.5, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(pl, styl, (g) => {
    if (m.prosto) return;
    g.save(); g.clip(pl);
    // fałdy: doliny od barku ku rąbkowi — w dolinę wpada cień, grzbiet obok łapie odrobinę światła
    const nfp = m.lod === 2 ? 5 : 3;
    for (let i = 0; i < nfp; i++) {
      const t = (i + 0.5 + 0.3 * (los(id, 250 + i) - 0.5)) / nfp;
      const gp = { x: lerp(F.x, A.x, 0.3 + 0.6 * t), y: lerp(F.y, A.y, 0.3 + 0.6 * t) + 0.05 * h };
      const d = { x: lerp(Hp.x, Ht.x, t), y: lerp(Hp.y, Ht.y, t) };
      const kol = sin(czas * 0.004 + i + id) * 0.006 * h;
      const kx = (gp.x + d.x) / 2 - 0.012 * h + kol, ky = (gp.y + d.y) / 2;
      const sz = (0.016 + 0.012 * los(id, 260 + i)) * h;
      const fd = new Path2D();
      fd.moveTo(gp.x, gp.y); fd.quadraticCurveTo(kx, ky, d.x, d.y + 0.02 * h);
      fd.lineTo(d.x + sz, d.y + 0.012 * h); fd.quadraticCurveTo(kx + sz * 0.5, ky, gp.x + 0.003 * h, gp.y); fd.closePath();
      g.fillStyle = 'rgba(2,1,3,0.5)'; g.fill(fd);
      const bl = new Path2D();
      bl.moveTo(gp.x - 0.002 * h, gp.y); bl.quadraticCurveTo(kx - 0.005 * h, ky, d.x - 0.005 * h, d.y + 0.016 * h);
      bl.lineTo(d.x - sz * 0.5, d.y + 0.01 * h); bl.quadraticCurveTo(kx - sz * 0.35, ky, gp.x - 0.004 * h, gp.y); bl.closePath();
      g.fillStyle = tonC(st.plaszcz, 0.4, CIEN.tkanina, 0.14); g.fill(bl);
    }
    // błoto u dołu
    const bl = g.createLinearGradient(0, lerp(A.y, H.y, 0.55), 0, H.y + 0.08 * h);
    bl.addColorStop(0, 'rgba(46,34,24,0)'); bl.addColorStop(1, 'rgba(46,34,24,0.7)');
    g.fillStyle = bl; g.fill(pl);
    if (m.lod === 2 && !m.bogato) swiatlocien(g, pl, [[0.035 * h, 'rgba(2,1,3,0.5)'], warstwaTuszu(h, 0.9)], SW_PLASZCZ, undefined, true);
    if (m.bogato) {
      const z = ziarno(g);
      if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(pl); g.globalCompositeOperation = 'source-over'; }
      // dziury po ostrzach
      for (let i = 0; i < 2; i++) {
        const t = 0.25 + 0.5 * los(id, 230 + i), q = { x: lerp(A.x, lerp(Hp.x, Ht.x, t), 0.72), y: lerp(A.y, lerp(Hp.y, Ht.y, t), 0.72) };
        const rr = h * (0.006 + 0.007 * los(id, 240 + i));
        g.fillStyle = 'rgba(4,2,2,0.92)'; g.beginPath(); g.ellipse(q.x, q.y, rr, rr * 2.2, a + 0.3, 0, TAU); g.fill();
        g.strokeStyle = tonC(st.plaszcz, 0.3, CIEN.tkanina, 0.4); g.lineWidth = Math.max(0.35, h * 0.0016); g.stroke();
      }
      const kq = { x: lerp(A.x, H.x, 0.62) - 0.03 * h, y: lerp(A.y, H.y, 0.62) };
      rozbryzg(g, kq.x, kq.y, 0.016 * h, PI * 0.6, id + 7, KREW_SUCHA, 0.7, m.lod);
      // światłocień i zimny odblask na krawędzi pleców — odcina ciemny płaszcz od ciemnej skały
      bryla(g, pl, h, [[0.035 * h, 'rgba(2,1,3,0.42)'], [-0.008 * h, tonC(st.plaszcz, 0.5, CIEN.tkanina, 0.16)], [Math.max(1, 0.0045 * h), 'rgba(150,160,176,0.3)', undefined, { x: 0.96, y: 0.28 }]], SW_PLASZCZ, 0.9, 0, undefined, false, true);
    }
    g.restore();
  });
}

// ------------------------------------------------------------------ kończyny

/** Noga w kolczych nogawicach: jedna bryła od biodra po kostkę, blaszany nakolannik (z kuźni), ciemny but z ostrogą. */
function noga(r: Rysunek, kol: Pkt, stp: Stopa, dalej: boolean, nakolannik: boolean): void {
  const { m, s, h, st } = r;
  const ru = 0.05 * h, rk = 0.036 * h, rs = 0.027 * h;
  const cala = konczynaZgieta(s.biodro, ru, kol, rk, stp.kostka, rs, [0.004 * h, 0.01 * h, 0.012 * h, 0.003 * h]);
  m.ksztalt(cala, tonBryly(m, st.kolczuga, dalej ? -0.68 : -0.46, s.biodro, stp.kostka, ru * 1.8), (g) => kolcze(m, g, cala, h, ru * 1.8, dalej, s.biodro, stp.kostka));
  // nakolannik: płaska kopułka z blachy na przodzie kolana
  if (nakolannik) nakolannikNa(r, kol, stp, rk, dalej);
  butRycerza(r, stp, dalej);
}

/** Nakolannik: kopułka z blachy na przodzie kolana, z nitem pośrodku i rzemieniem pod kolanem. */
function nakolannikNa(r: Rysunek, kol: Pkt, stp: Stopa, rk: number, dalej: boolean): void {
  const { m, s, h, st } = r;
  const ku = katOdc(s.biodro, kol), kg = katOdc(kol, stp.kostka);
  const kn = (ku + kg) / 2, przodX = cos(kn), przodY = -sin(kn);
  const nc = { x: kol.x + przodX * rk * 0.45, y: kol.y + przodY * rk * 0.45 };
  const nk = new Path2D(); nk.ellipse(nc.x, nc.y, rk * 0.62, rk * 0.92, -kn, 0, TAU);
  m.ksztalt(nk, tonC(st.helm, dalej ? -0.66 : -0.44, CIEN.metal), (g) => {
    if (!m.bogato) return;
    // rzemień pod kolanem i nit pośrodku kopułki
    const pod = { x: kol.x - przodX * rk * 0.2 + Math.sin(kn) * rk * 0.9, y: kol.y - przodY * rk * 0.2 + Math.cos(kn) * rk * 0.9 };
    g.strokeStyle = 'rgba(30,20,14,0.9)'; g.lineWidth = Math.max(0.5, rk * 0.18); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(pod.x - przodX * rk * 0.7, pod.y - przodY * rk * 0.7); g.lineTo(pod.x + przodX * rk * 0.6, pod.y + przodY * rk * 0.6); g.stroke();
    g.fillStyle = 'rgba(255,248,232,0.5)'; g.beginPath(); g.arc(nc.x + przodX * rk * 0.12, nc.y + przodY * rk * 0.12, Math.max(0.5, rk * 0.12), 0, TAU); g.fill();
    bryla(g, nk, h, [[rk * 0.5, 'rgba(2,2,6,0.55)'], [-rk * 0.16, dalej ? 'rgba(255,248,232,0.06)' : 'rgba(255,248,232,0.26)']], swiatloOsi(kol, stp.kostka), dalej ? 0.6 : 0.9, 0, undefined, m.lod < 2);
  });
}

/** But: ciemna skóra, rzemień w kostce, ostroga. */
function butRycerza(r: Rysunek, stp: Stopa, dalej: boolean): void {
  const { m, h, st } = r;
  // but: ciemna skóra, rzemień w kostce, ostroga
  const b = but(stp, h, 0.068, 1.0);
  m.ksztalt(b, tonC([44, 34, 28], dalej ? -0.55 : -0.3, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    podeszwa(g, stp, h, 'rgba(8,6,6,0.95)');
    if (m.bogato) {
      g.fillStyle = 'rgba(52,40,28,0.5)'; g.beginPath(); g.ellipse(stp.palce.x - 0.014 * h, stp.palce.y - 0.007 * h, 0.022 * h, 0.009 * h, -stp.kat, 0, TAU); g.fill();
      const ks = stp.kostka;
      g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = Math.max(0.6, h * 0.006); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(ks.x - 0.03 * h, ks.y + 0.012 * h); g.lineTo(ks.x + 0.03 * h, ks.y + 0.02 * h); g.stroke();
      const pc = stp.pieta;
      g.strokeStyle = tonC(st.helm, dalej ? -0.4 : -0.05, CIEN.metal); g.lineWidth = Math.max(0.5, h * 0.0045); g.lineCap = 'round';
      g.beginPath(); g.moveTo(pc.x + 0.004 * h, pc.y - 0.022 * h); g.lineTo(pc.x - 0.022 * h, pc.y - 0.03 * h); g.stroke();
    }
    if (m.bogato) bryla(g, b, h, [[0.016 * h, 'rgba(4,2,2,0.5)'], [-0.004 * h, dalej ? 'rgba(255,240,220,0.05)' : 'rgba(255,240,220,0.2)']], SWB, dalej ? 0.7 : 1);
  });
}

/** Ręka w kolczudze ze skórzaną rękawicą — jedna bryła od barku po nadgarstek; czasem bandaż przesiąknięty krwią. */
function reka(r: Rysunek, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, piesc: boolean, bandaz: boolean): void {
  const { m, h, st, c } = r;
  const r1 = 0.043 * h, r2 = 0.03 * h, r3 = 0.023 * h;
  const cala = konczynaZgieta(bark, r1, lok, r2, dl, r3, [0.006 * h, 0.004 * h, 0.005 * h, 0.006 * h]);
  m.ksztalt(cala, tonBryly(m, st.kolczuga, dalej ? -0.68 : -0.46, bark, dl, r1 * 1.8), (g) => {
    kolcze(m, g, cala, h, r1 * 1.8, dalej, bark, dl);
    const ux = dl.x - lok.x, uy = dl.y - lok.y, LL = Math.hypot(ux, uy) || 1, nx = -uy / LL, ny = ux / LL;
    if (m.bogato) {
      // kolczuga marszczy się w zgięciu łokcia
      g.save(); g.clip(cala);
      g.strokeStyle = 'rgba(2,2,6,0.5)'; g.lineWidth = Math.max(0.5, h * 0.0026); g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const t = 0.06 + i * 0.07, x = lok.x + ux * t, y = lok.y + uy * t, w = r2 * (1 - i * 0.12);
        g.moveTo(x + nx * w, y + ny * w); g.quadraticCurveTo(x + ux * 0.05, y + uy * 0.05, x - nx * w * 0.3, y - ny * w * 0.3);
      }
      g.stroke();
      g.restore();
    }
    if (!bandaz || m.prosto) return;
    // bandaż: zwoje płótna na skos, przesiąknięte krwią
    const zwoje = new Path2D();
    for (let i = 0; i < 3; i++) {
      const t0 = 0.24 + i * 0.13, t1 = t0 + 0.1, rr = r2 * 1.14;
      const ax = lok.x + ux * t0, ay = lok.y + uy * t0, bx = lok.x + ux * t1, by = lok.y + uy * t1;
      zwoje.moveTo(ax + nx * rr, ay + ny * rr); zwoje.lineTo(bx + nx * rr + ux * 0.04, by + ny * rr + uy * 0.04);
      zwoje.lineTo(bx - nx * rr, by - ny * rr); zwoje.lineTo(ax - nx * rr - ux * 0.04, ay - ny * rr - uy * 0.04); zwoje.closePath();
    }
    g.save(); g.clip(cala);
    g.fillStyle = tonC([160, 148, 124], -0.14, CIEN.tkanina); g.fill(zwoje);
    przesiak(g, lok.x + ux * 0.38, lok.y + uy * 0.38, r2 * 0.75, c.id + 13, 0.85, m.lod);
    swiatlocien(g, zwoje, [[r2 * 0.7, 'rgba(20,12,10,0.45)']], swiatloOsi(lok, dl));
    g.strokeStyle = 'rgba(12,8,8,0.6)'; g.lineWidth = Math.max(0.4, h * 0.0018); g.stroke(zwoje);
    g.restore();
  });
  const d = dlon(dl, przed, 0.027 * h, piesc);
  m.ksztalt(d, tonC([50, 38, 30], dalej ? -0.5 : -0.2, CIEN.tkanina), (g) => {
    if (!m.bogato) return;
    swiatlocien(g, d, [[0.016 * h, 'rgba(6,4,4,0.5)'], [-0.004 * h, 'rgba(255,240,220,0.14)']], SWB);
  });
}

// ------------------------------------------------------------------ zbroja z kuźni (etap 3f)

/**
 * Naramiennik: blaszana czasza na barku i dwie lamy pod nią, zachodzące na siebie wzdłuż ramienia,
 * każda z nitem na końcach; dolna krawędź każdej lamy rzuca cień na następną.
 */
function naramiennik(r: Rysunek, bark: Pkt, lok: Pkt, dalej: boolean): void {
  const { m, h, st } = r;
  const ux = lok.x - bark.x, uy = lok.y - bark.y, L = Math.hypot(ux, uy) || 1;
  const d = { x: ux / L, y: uy / L }, n = { x: -d.y, y: d.x };
  // punkt w układzie ramienia: wzdłuż (w dół ramienia) i w poprzek, w h
  const P = (a: number, b: number): [number, number] => [bark.x + (d.x * a + n.x * b) * h, bark.y + (d.y * a + n.y * b) * h];
  // od dolnej lamy: każda wyższa zachodzi na tę pod nią
  for (let i = 2; i >= 0; i--) {
    const a0 = i === 0 ? -0.045 : 0.02 + (i - 1) * 0.034, a1 = 0.05 + i * 0.034, w = 0.06 - i * 0.004;
    const p = new Path2D();
    if (i === 0) { p.moveTo(...P(a1, -w)); p.quadraticCurveTo(...P(a0 - 0.02, -w * 1.05), ...P(a0, 0)); p.quadraticCurveTo(...P(a0 - 0.02, w * 1.05), ...P(a1, w)); }
    else { p.moveTo(...P(a1, -w)); p.lineTo(...P(a0, -w * 1.02)); p.quadraticCurveTo(...P(a0 - 0.012, 0), ...P(a0, w * 1.02)); p.lineTo(...P(a1, w)); }
    p.quadraticCurveTo(...P(a1 + 0.018, 0), ...P(a1, -w));
    p.closePath();
    // jaśniejsza, wypolerowana blacha — przy zwykłym przybliżeniu zbroja ma odcinać się od wapenroku
    m.ksztalt(p, tonC(st.helm, (dalej ? -0.5 : -0.02) - i * 0.06, CIEN.metal), (g) => {
      if (m.prosto) return;
      if (m.bogato) {
        // nity na końcach lamy
        for (const k of [-1, 1]) {
          const [qx, qy] = P(a1 - 0.012, k * w * 0.72);
          g.fillStyle = 'rgba(4,4,8,0.7)'; g.beginPath(); g.arc(qx + h * 0.001, qy + h * 0.0012, Math.max(0.4, h * 0.0045), 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,248,232,0.5)'; g.beginPath(); g.arc(qx - h * 0.0006, qy - h * 0.0008, Math.max(0.3, h * 0.0025), 0, TAU); g.fill();
        }
      }
      // brzeg lamy łapie światło, pod nim cień na następnej
      const [b0x, b0y] = P(a1, -w * 0.9), [bmx, bmy] = P(a1 + 0.016, 0), [b1x, b1y] = P(a1, w * 0.9);
      g.strokeStyle = dalej ? 'rgba(255,248,232,0.16)' : 'rgba(255,248,232,0.6)'; g.lineWidth = Math.max(m.bogato ? 0.4 : 0.9, h * 0.003);
      g.beginPath(); g.moveTo(b0x, b0y); g.quadraticCurveTo(bmx, bmy, b1x, b1y); g.stroke();
      bryla(g, p, h, [[0.02 * h, 'rgba(2,2,6,0.5)'], [-0.006 * h, dalej ? 'rgba(255,248,232,0.06)' : 'rgba(255,248,232,0.28)']], swiatloOsi(bark, lok), dalej ? 0.6 : 0.9, 0, undefined, !m.bogato);
    });
  }
}

/**
 * Napierśnik: wypukła blacha na piersi, założona na wapenrok — od szyi po pas, z dwiema lamami u dołu,
 * rzemieniem przez bark i nitami wzdłuż boku. Krzyż patée namalowany na blasze (wapenrok go już nie pokazuje).
 */
function napiersnik(r: Rysunek, T: Tulow, cienie: Cienie): void {
  const { m, s, h, st, c, czas } = r;
  const id = c.id;
  const k = st.helm;
  const p = new Path2D();
  const A = T(0.92, -0.035), B = T(0.97, 0.058), D = T(PAS + 0.05, 0.088), E = T(PAS + 0.05, -0.05);
  p.moveTo(A.x, A.y);
  p.quadraticCurveTo(T(1.0, 0.01).x, T(1.0, 0.01).y, B.x, B.y);
  bez(p, T(0.82, 0.126), T(0.46, 0.112), D);
  p.quadraticCurveTo(T(PAS + 0.035, 0.02).x, T(PAS + 0.035, 0.02).y, E.x, E.y);
  bez(p, T(0.45, -0.066), T(0.74, -0.07), A);
  p.closePath();
  let styl: string | CanvasGradient = tonC(k, -0.12, CIEN.metal);
  if (!m.prosto) {
    const a = T(0.9, 0.11), b = T(PAS, -0.06);
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(k, 0.32, CIEN.metal)); gr.addColorStop(0.45, tonC(k, 0.06, CIEN.metal)); gr.addColorStop(1, tonC(k, -0.42, CIEN.metal));
    styl = gr;
  }
  const kq = T(0.62, 0.05);
  m.ksztalt(p, styl, (g) => {
    const krzyz = krzyzPatee(kq.x, kq.y, s.katT, h, 0.95);
    if (m.prosto) { g.fillStyle = tonC(st.krzyz, 0, CIEN.tkanina); g.fill(krzyz); return; }
    g.save(); g.clip(p);
    // krzyż farbą na blasze — obtłuczony na brzegach
    g.fillStyle = tonC(st.krzyz, -0.05, CIEN.tkanina, 0.92); g.fill(krzyz);
    if (st.szal) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,40,16,${0.12 + 0.06 * sin(czas * 0.004 + id)})`; g.fill(krzyz);
      g.restore();
    }
    // dwie lamy u dołu: ciemna szczelina i jasny brzeg nad nią
    for (let i = 0; i < 2; i++) {
      const u = PAS + 0.1 + i * 0.07;
      const a0 = T(u, -0.07), am = T(u + 0.015, 0.03), a1 = T(u, 0.12);
      g.strokeStyle = 'rgba(4,4,8,0.7)'; g.lineWidth = Math.max(0.5, h * 0.004);
      g.beginPath(); g.moveTo(a0.x, a0.y); g.quadraticCurveTo(am.x, am.y, a1.x, a1.y); g.stroke();
      const b0 = T(u + 0.012, -0.07), bm = T(u + 0.027, 0.03), b1 = T(u + 0.012, 0.12);
      g.strokeStyle = 'rgba(255,248,232,0.3)'; g.lineWidth = Math.max(0.4, h * 0.0025);
      g.beginPath(); g.moveTo(b0.x, b0.y); g.quadraticCurveTo(bm.x, bm.y, b1.x, b1.y); g.stroke();
    }
    // nity wzdłuż boku (pod pachą)
    if (m.bogato) {
      for (let i = 0; i < 4; i++) {
        const q = T(0.42 + i * 0.13, -0.045 - 0.008 * Math.sin(i));
        g.fillStyle = 'rgba(4,4,8,0.7)'; g.beginPath(); g.arc(q.x + h * 0.001, q.y + h * 0.0012, Math.max(0.4, h * 0.0045), 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,248,232,0.5)'; g.beginPath(); g.arc(q.x - h * 0.0006, q.y - h * 0.0008, Math.max(0.3, h * 0.0025), 0, TAU); g.fill();
      }
      cienieRzucane(g, p, [[cienie.reka, 0.024 * h, 0.36], [cienie.glowa, 0.03 * h, 0.36], [cienie.tarcza, 0.04 * h, 0.4]], true);
    }
    // wypolerowany grzbiet blachy wzdłuż wypukłości piersi
    const g0 = T(0.9, 0.075), g1 = T(0.7, 0.1), g2 = T(0.45, 0.092);
    // z daleka grzbiet blachy szerszy i jaśniejszy — połysk, po którym poznać zbroję przy zwykłym przybliżeniu
    g.strokeStyle = 'rgba(255,248,232,0.42)'; g.lineWidth = Math.max(m.bogato ? 0.8 : 1.6, h * 0.012); g.lineCap = 'round';
    g.beginPath(); g.moveTo(g0.x, g0.y); g.quadraticCurveTo(g1.x, g1.y, g2.x, g2.y); g.stroke();
    g.strokeStyle = 'rgba(255,248,232,0.75)'; g.lineWidth = Math.max(m.bogato ? 0.4 : 0.8, h * 0.0035);
    g.beginPath(); g.moveTo(g0.x, g0.y); g.quadraticCurveTo(g1.x, g1.y, g2.x, g2.y); g.stroke();
    bryla(g, p, h, [[0.045 * h, 'rgba(4,4,10,0.5)'], [0.014 * h, 'rgba(4,4,10,0.45)'], [-0.01 * h, 'rgba(255,248,232,0.18)'], [Math.max(1, 0.004 * h), 'rgba(160,176,196,0.26)', undefined, { x: 0.94, y: 0.34 }]], SWB, 1, 0, undefined, !m.bogato, true);
    g.restore();
  });
  // rzemień przez bark — do pleców
  const r0 = T(0.9, -0.03), r1 = T(1.0, -0.06), r2 = T(0.86, -0.088);
  const sk = tonC(st.skorzane, -0.3, CIEN.tkanina), gr = Math.max(1, h * 0.011);
  m.kreska(r0.x, r0.y, r1.x, r1.y, gr, sk);
  m.kreska(r1.x, r1.y, r2.x, r2.y, gr, sk);
}

// ------------------------------------------------------------------ wapenrok

/** Krzyż patée (ramiona rozszerzone ku końcom) w układzie tułowia, w profilu nieco ściśnięty. */
function krzyzPatee(x: number, y: number, kat: number, h: number, skala = 1): Path2D {
  const U = 0.08 * h * skala, D = 0.094 * h * skala, R = 0.05 * h * skala, a = 0.011 * h * skala, b = 0.029 * h * skala;
  const c = cos(kat), sn = sin(kat), sx = 0.8;
  const P = (px: number, py: number): [number, number] => [x + px * sx * c - py * sn, y + px * sx * sn + py * c];
  const p = new Path2D();
  p.moveTo(...P(-b, -U)); p.lineTo(...P(b, -U));
  p.quadraticCurveTo(...P(a * 0.6, -a * 0.6), ...P(R, -b * 0.85)); p.lineTo(...P(R, b * 0.85));
  p.quadraticCurveTo(...P(a * 0.6, a * 0.6), ...P(b, D)); p.lineTo(...P(-b, D));
  p.quadraticCurveTo(...P(-a * 0.6, a * 0.6), ...P(-R, b * 0.85)); p.lineTo(...P(-R, -b * 0.85));
  p.quadraticCurveTo(...P(-a * 0.6, -a * 0.6), ...P(-b, -U));
  p.closePath();
  return p;
}

/**
 * Wapenrok: płócienna narzuta bez rękawów, przepasana, do kolan, rozkloszowana w plisy, które rozchodzą się
 * spod pasa i kończą zaokrąglonym, podartym rąbkiem; rozcięta z przodu (w kroku płótno idzie za nogami).
 * Krzyż patée na piersi, błoto, krew z rany w boku, cięcie z widoczną kolczugą.
 */
function wapenrok(r: Rysunek, T: Tulow, cienie: Cienie): void {
  const { m, s, h, st, c, czas, pm } = r;
  const id = c.id;
  const [kp, kt] = s.kolA.x >= s.kolB.x ? [s.kolA, s.kolB] : [s.kolB, s.kolA];
  const rabek = Math.min(Math.max(s.kolA.y, s.kolB.y) - 0.01 * h, s.biodro.y + 0.235 * h);
  const fal = pm.szata.a;
  const przod = Math.max(kp.x + 0.038 * h, s.biodro.x + 0.08 * h) - fal * 0.01 * h;
  const tyl = Math.min(kt.x - 0.044 * h, s.biodro.x - 0.098 * h) + fal * 0.04 * h;
  const Wf = T(PAS, 0.072), Wb = T(PAS, -0.074);
  const Hf = { x: przod, y: rabek - 0.012 * h }, Hb = { x: tyl, y: rabek - 0.006 * h };
  // doliny fałd: od pasa (zebrane) ku rąbkowi (rozłożone), od przodu ku tyłowi
  const nf = m.prosto ? 2 : m.lod === 2 ? 5 : 3;
  const doliny: { g: Pkt; d: Pkt }[] = [];
  for (let i = 0; i < nf; i++) {
    const t = (i + 0.5 + 0.35 * (los(id, 395 + i) - 0.5)) / nf;
    const gp = T(PAS - 0.03, lerp(0.06, -0.062, t));
    doliny.push({ g: gp, d: { x: lerp(przod, tyl, t) + fal * 0.02 * h, y: rabek - 0.008 * h } });
  }
  const w = new Path2D();
  w.moveTo(Wb.x, Wb.y);
  bez(w, T(0.45, -0.09), T(0.8, -0.1), T(0.965, -0.07));
  w.quadraticCurveTo(T(1.01, -0.005).x, T(1.01, -0.005).y, T(0.97, 0.054).x, T(0.97, 0.054).y);
  bez(w, T(0.8, 0.112), T(0.42, 0.096), Wf);
  bez(w, T(PAS - 0.1, 0.086), { x: przod - 0.004 * h, y: rabek - 0.12 * h }, Hf);
  // rąbek: plisy od przodu ku tyłowi; w kroku rozcięcie przy dolinie najbliższej środka rozkroku
  const wezly: Pkt[] = [Hf, ...doliny.map((v) => v.d), Hb];
  const rozkrok = kp.x - kt.x;
  let rozc = -1, gl = 0;
  if (rozkrok > 0.075 * h && nf > 1) {
    gl = clamp((rozkrok - 0.075 * h) / (0.1 * h), 0, 1);
    const sx = lerp(kt.x, kp.x, 0.5);
    let best = 1e9;
    for (let i = 1; i < wezly.length - 1; i++) { const d = Math.abs(wezly[i].x - sx); if (d < best) { best = d; rozc = i; } }
  }
  for (let i = 1; i < wezly.length; i++) {
    const A = wezly[i - 1], B = wezly[i];
    if (i === rozc) {
      const lf = { x: B.x + (0.008 + gl * 0.022) * h, y: B.y }, lt = { x: B.x - (0.008 + gl * 0.022) * h, y: B.y + 0.002 * h };
      const gora = lerp(rabek - 0.02 * h, s.biodro.y + 0.1 * h, gl);
      plisa(w, A, lf, h, id, 300 + i * 5);
      w.quadraticCurveTo(B.x + 0.006 * h, lerp(B.y, gora, 0.7), B.x, gora);
      w.quadraticCurveTo(B.x - 0.006 * h, lerp(B.y, gora, 0.7), lt.x, lt.y);
      wezly[i] = lt;
      continue;
    }
    plisa(w, i - 1 === rozc ? wezly[i - 1] : A, B, h, id, 300 + i * 5);
  }
  bez(w, { x: tyl + 0.008 * h, y: rabek - 0.12 * h }, T(PAS - 0.12, -0.096), Wb);
  w.closePath();

  let styl: string | CanvasGradient = tonC(st.wapenrok, -0.06, CIEN.tkanina);
  if (!m.prosto) {
    const a = T(0.85, 0.1), b = { x: tyl, y: rabek };
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.wapenrok, 0.12, CIEN.tkanina)); gr.addColorStop(0.42, tonC(st.wapenrok, -0.06, CIEN.tkanina)); gr.addColorStop(1, tonC(st.wapenrok, -0.46, CIEN.tkanina));
    styl = gr;
  }
  const kq = T(0.6, 0.052);
  m.ksztalt(w, styl, (g) => {
    const krzyz = krzyzPatee(kq.x, kq.y, s.katT, h, 1.25);
    if (m.prosto) { g.fillStyle = tonC(st.krzyz, 0, CIEN.tkanina); g.fill(krzyz); return; }
    g.save();
    g.clip(w);
    if (m.bogato) {
      const z = ziarno(g);
      if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(w); g.globalCompositeOperation = 'source-over'; }
    }
    // krzyż: farba wtarta w płótno, przetarta
    g.fillStyle = tonC(st.krzyz, 0, CIEN.tkanina, 0.95); g.fill(krzyz);
    if (st.szal) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,40,16,${0.12 + 0.06 * sin(czas * 0.004 + id)})`; g.fill(krzyz);
      g.restore();
    }
    if (m.bogato) {
      g.fillStyle = tonC(st.wapenrok, -0.08, CIEN.tkanina, 0.55);
      for (let i = 0; i < 9; i++) {
        const q = T(0.36 + 0.55 * los(id, 340 + i), -0.01 + 0.08 * los(id, 350 + i));
        g.beginPath(); g.ellipse(q.x, q.y, h * (0.002 + 0.004 * los(id, 360 + i)), h * 0.0022, los(id, 365 + i) * PI, 0, TAU); g.fill();
      }
    }
    // fałdy: cień wpada w dolinę od strony odwróconej od lampki, grzbiet obok łapie światło
    for (let i = 0; i < nf; i++) {
      const { g: gp, d } = doliny[i];
      if (i + 1 === rozc) continue;
      const sz = (0.012 + 0.008 * los(id, 397 + i)) * h, kx = (gp.x + d.x) / 2 + 0.008 * h, ky = (gp.y + d.y) / 2;
      const cien = new Path2D();
      cien.moveTo(gp.x, gp.y); cien.quadraticCurveTo(kx, ky, d.x, d.y + 0.012 * h);
      cien.lineTo(d.x + sz, d.y + 0.008 * h); cien.quadraticCurveTo(kx + sz * 0.45, ky, gp.x + 0.003 * h, gp.y);
      cien.closePath();
      g.fillStyle = 'rgba(22,12,10,0.36)'; g.fill(cien);
      if (!m.bogato) continue;
      const bl = new Path2D();
      bl.moveTo(gp.x - 0.002 * h, gp.y); bl.quadraticCurveTo(kx - 0.004 * h, ky, d.x - 0.004 * h, d.y + 0.006 * h);
      bl.lineTo(d.x - sz * 0.55, d.y); bl.quadraticCurveTo(kx - sz * 0.35, ky, gp.x - 0.004 * h, gp.y);
      bl.closePath();
      g.fillStyle = 'rgba(255,242,218,0.13)'; g.fill(bl);
      g.strokeStyle = 'rgba(14,8,8,0.5)'; g.lineWidth = Math.max(0.4, h * 0.0024); g.lineCap = 'round';
      g.beginPath(); g.moveTo(lerp(gp.x, d.x, 0.25), lerp(gp.y, d.y, 0.25)); g.quadraticCurveTo(kx, ky, d.x, d.y + 0.012 * h); g.stroke();
    }
    // marszczenia nad pasem i pod pachą
    g.strokeStyle = 'rgba(30,18,14,0.32)'; g.lineWidth = Math.max(0.4, h * 0.003);
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = T(PAS + 0.05, -0.05 + i * 0.045), b = T(PAS + 0.2 + 0.05 * i, -0.025 + i * 0.03);
      g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 + 0.006 * h, (a.y + b.y) / 2, b.x, b.y);
    }
    g.stroke();
    // brud: błoto od rąbka, pot i sadza pod pachą
    const bl = g.createLinearGradient(0, s.biodro.y + 0.04 * h, 0, rabek + 0.04 * h);
    bl.addColorStop(0, 'rgba(70,52,36,0)'); bl.addColorStop(0.5, 'rgba(70,52,36,0.3)'); bl.addColorStop(1, 'rgba(46,32,20,0.9)');
    g.globalCompositeOperation = 'multiply'; g.fillStyle = bl; g.fill(w); g.globalCompositeOperation = 'source-over';
    const pp = T(0.86, -0.05);
    const pg = g.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 0.07 * h);
    pg.addColorStop(0, 'rgba(40,28,20,0.45)'); pg.addColorStop(1, 'rgba(40,28,20,0)');
    g.fillStyle = pg; g.fillRect(pp.x - 0.08 * h, pp.y - 0.08 * h, 0.16 * h, 0.16 * h);
    // krew: rana w boku przesiąka płótno i ścieka po spódnicy; rozbryzg na piersi; ostrze otarte niżej
    const rana = T(0.32 + 0.1 * los(id, 380), -0.02 + 0.03 * los(id, 381));
    przesiak(g, rana.x, rana.y, 0.034 * h, id, 0.95, m.lod, 1.35, PI / 2 + s.katT);
    for (let i = 0; i < (m.lod === 2 ? 3 : 1); i++) {
      const zx = rana.x + (los(id, 383 + i) - 0.5) * 0.04 * h, zy = rana.y + 0.03 * h;
      zaciek(g, zx, zy, (0.05 + 0.09 * los(id, 386 + i)) * h, (0.003 + 0.002 * los(id, 389 + i)) * h, KREW, 0.82, id, 390 + i * 3);
    }
    const kr = T(0.82, 0.0 + 0.05 * los(id, 382));
    rozbryzg(g, kr.x, kr.y, 0.013 * h, PI * (0.9 + 0.3 * los(id, 384)), id + 3, KREW, 0.85, m.lod);
    for (let i = 0; i < (m.lod === 2 ? 2 : 1); i++) {
      const ot = { x: lerp(tyl, przod, 0.15 + 0.7 * los(id, 385 + i * 2)), y: lerp(s.biodro.y, rabek, 0.72 + 0.2 * los(id, 386 + i * 2)) };
      przesiak(g, ot.x, ot.y, (0.008 + 0.008 * los(id, 377 + i)) * h, id + 5 + i, 0.6, m.lod);
    }
    // cięcie: wąska szpara z kolczugą, nitki na brzegach, krew na dolnej wardze
    if (m.bogato) {
      const c0 = T(0.56 + 0.08 * los(id, 370), -0.07), c1 = T(0.44 + 0.06 * los(id, 371), -0.01);
      const mx = (c0.x + c1.x) / 2, my = (c0.y + c1.y) / 2;
      const dx = c1.x - c0.x, dy = c1.y - c0.y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl, sz = 0.01 * h;
      const rz = new Path2D();
      rz.moveTo(c0.x, c0.y); rz.quadraticCurveTo(mx + nx * sz, my + ny * sz, c1.x, c1.y); rz.quadraticCurveTo(mx - nx * sz * 0.6, my - ny * sz * 0.6, c0.x, c0.y); rz.closePath();
      g.fillStyle = tonC(st.kolczuga, -0.55, CIEN.metal); g.fill(rz);
      g.fillStyle = 'rgba(200,200,206,0.5)';
      for (let i = 1; i < 6; i++) { const t = i / 6; g.beginPath(); g.arc(lerp(c0.x, c1.x, t) + nx * sz * 0.2, lerp(c0.y, c1.y, t) + ny * sz * 0.2, h * 0.0018, 0, TAU); g.fill(); }
      g.strokeStyle = tonC(st.wapenrok, 0.1, CIEN.tkanina, 0.9); g.lineWidth = Math.max(0.35, h * 0.0022);
      g.beginPath();
      for (let i = 1; i < 7; i++) {
        const t = i / 7, ex = lerp(c0.x, c1.x, t), ey = lerp(c0.y, c1.y, t), k = Math.sin(t * PI) * sz;
        g.moveTo(ex + nx * k * 0.85, ey + ny * k * 0.85); g.lineTo(ex + nx * k * 0.25 + (dx / dl) * h * 0.004, ey + ny * k * 0.25 + (dy / dl) * h * 0.004);
      }
      g.stroke();
      g.strokeStyle = rgba(KREW, 0.85); g.lineWidth = Math.max(0.6, h * 0.004);
      g.beginPath(); g.moveTo(c0.x, c0.y); g.quadraticCurveTo(mx - nx * sz * 0.8, my - ny * sz * 0.8 + 0.003 * h, c1.x, c1.y); g.stroke();
      g.strokeStyle = 'rgba(12,8,8,0.8)'; g.lineWidth = Math.max(0.4, h * 0.0018); g.stroke(rz);
    }
    // cienie rzucane: ręka i głowa na pierś, tarcza na spódnicę, pas na płótno pod nim
    if (m.bogato) {
      const pc = new Path2D();
      const a0 = T(PAS + 0.03, -0.08), a1 = T(PAS + 0.022, 0.08), b1 = T(PAS - 0.034, 0.078), b0 = T(PAS - 0.028, -0.08);
      pc.moveTo(a0.x, a0.y); pc.lineTo(a1.x, a1.y); pc.lineTo(b1.x, b1.y); pc.lineTo(b0.x, b0.y); pc.closePath();
      cienieRzucane(g, w, [[cienie.reka, 0.026 * h, 0.34], [cienie.glowa, 0.03 * h, 0.36], [cienie.tarcza, 0.04 * h, 0.4], [pc, 0.012 * h, 0.3, { x: 0, y: -1 }]], true);
    }
    const wl: [number, string][] = m.bogato
      ? [[0.05 * h, 'rgba(20,10,10,0.44)'], [0.016 * h, 'rgba(16,8,8,0.44)'], [-0.012 * h, 'rgba(255,240,210,0.14)']]
      : [[0.05 * h, 'rgba(20,10,10,0.55)'], [-0.012 * h, 'rgba(255,240,210,0.14)']];
    bryla(g, w, h, wl, SWB, 1, m.bogato ? 0.8 : 0, undefined, false, true);
    g.restore();
  });
}

// ------------------------------------------------------------------ pas i pochwa

/** Pas ze skóry z żelazną sprzączką i zwisającym końcem; gdy miecz w pochwie — rękojeść przed brzuchem. */
function pas(r: Rysunek, T: Tulow, wPochwie: boolean): void {
  const { m, h, st, c } = r;
  const pa = new Path2D();
  const a0 = T(PAS + 0.03, -0.074), a1 = T(PAS + 0.022, 0.074), b1 = T(PAS - 0.026, 0.072), b0 = T(PAS - 0.02, -0.074);
  pa.moveTo(a0.x, a0.y); pa.quadraticCurveTo(T(PAS + 0.035, 0).x, T(PAS + 0.035, 0).y, a1.x, a1.y);
  pa.lineTo(b1.x, b1.y); pa.quadraticCurveTo(T(PAS - 0.012, 0).x, T(PAS - 0.012, 0).y, b0.x, b0.y); pa.closePath();
  m.ksztalt(pa, tonC(st.skorzane, -0.25, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    if (m.bogato) bryla(g, pa, h, [[0.012 * h, 'rgba(6,4,4,0.5)'], [-0.003 * h, 'rgba(255,236,210,0.2)']], SW_PLASZCZ, 0.9);
    // sprzączka i koniec pasa
    const sq = T(PAS + 0.004, 0.058);
    const kon = new Path2D();
    kon.moveTo(sq.x - 0.006 * h, sq.y); kon.lineTo(sq.x + 0.006 * h, sq.y); kon.lineTo(sq.x + 0.008 * h, sq.y + 0.06 * h); kon.lineTo(sq.x - 0.002 * h, sq.y + 0.064 * h); kon.closePath();
    g.fillStyle = tonC(st.skorzane, -0.3, CIEN.tkanina); g.fill(kon);
    g.strokeStyle = 'rgba(10,6,6,0.8)'; g.lineWidth = Math.max(0.4, h * 0.0018); g.stroke(kon);
    g.strokeStyle = 'rgba(30,30,34,0.95)'; g.lineWidth = Math.max(0.8, h * 0.0055);
    g.strokeRect(sq.x - 0.011 * h, sq.y - 0.016 * h, 0.022 * h, 0.026 * h);
    if (m.bogato) { g.strokeStyle = 'rgba(255,248,232,0.4)'; g.lineWidth = Math.max(0.4, h * 0.002); g.beginPath(); g.moveTo(sq.x - 0.011 * h, sq.y - 0.016 * h); g.lineTo(sq.x + 0.011 * h, sq.y - 0.016 * h); g.stroke(); }
  });
  if (!wPochwie) return;
  // rękojeść miecza wystaje z pochwy (pochwa na dalszym biodrze) — jelec, owinięty trzon, głowica
  const d = kier(PI - 0.5), q = T(PAS - 0.01, 0.055);
  const tip = { x: q.x + d.x * 0.075 * h, y: q.y + d.y * 0.075 * h };
  m.kreska(q.x, q.y, tip.x, tip.y, Math.max(1, h * 0.013), tonC(st.skorzane, -0.35, CIEN.tkanina));
  const n = kier(PI - 0.5 - PI / 2);
  m.kreska(q.x - n.x * 0.045 * h, q.y - n.y * 0.045 * h, q.x + n.x * 0.045 * h, q.y + n.y * 0.045 * h, Math.max(1, h * 0.011), tonC([70, 68, 70], -0.1, CIEN.metal));
  const gl = new Path2D(); gl.arc(tip.x, tip.y, Math.max(1, 0.014 * h), 0, TAU);
  m.ksztalt(gl, tonC([70, 68, 70], -0.05, CIEN.metal), (g) => {
    if (m.bogato) swiatlocien(g, gl, [[0.007 * h, 'rgba(4,4,8,0.6)'], [-0.003 * h, 'rgba(255,248,232,0.45)']]);
  });
  void c;
}

/** Pochwa na dalszym biodrze: wystaje ukosem do tyłu spod płaszcza i wapenroku; żelazne okucia. */
function pochwa(r: Rysunek, T: Tulow): void {
  const { m, h } = r;
  const d = kier(-0.42), n = kier(-0.42 - PI / 2);
  const a = T(PAS - 0.02, -0.03), dl = 0.4 * h;
  const P = (wd: number, wn: number): [number, number] => [a.x + d.x * wd + n.x * wn, a.y + d.y * wd + n.y * wn];
  const po = new Path2D();
  po.moveTo(...P(0, 0.011 * h)); po.lineTo(...P(dl * 0.94, 0.008 * h)); po.quadraticCurveTo(...P(dl, 0.006 * h), ...P(dl, 0));
  po.quadraticCurveTo(...P(dl, -0.006 * h), ...P(dl * 0.94, -0.008 * h)); po.lineTo(...P(0, -0.011 * h)); po.closePath();
  m.ksztalt(po, tonC(RUDA, -0.45, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    g.save(); g.clip(po);
    g.fillStyle = tonC([70, 68, 70], -0.2, CIEN.metal);
    const ok = new Path2D(); ok.moveTo(...P(dl * 0.86, 0.02 * h)); ok.lineTo(...P(dl * 1.1, 0.02 * h)); ok.lineTo(...P(dl * 1.1, -0.02 * h)); ok.lineTo(...P(dl * 0.86, -0.02 * h)); ok.closePath();
    g.fill(ok);
    g.restore();
    if (m.bogato) bryla(g, po, h, [[0.008 * h, 'rgba(4,2,2,0.5)']], SW_PLASZCZ, 0.7);
  });
}

// ------------------------------------------------------------------ smuga cięcia

/**
 * Smuga cięcia: łuk zakreślony czubkiem miecza wokół barku. Próbki czubka (ostatnie ~110 ms)
 * łączymy po okręgu — wychodzi sierp, który zanika ku tyłowi. W szale krwi czerwona.
 */
function smuga(g: CanvasRenderingContext2D, slad: { x: number; y: number }[], bark: Pkt, h: number, sila0: number, szal: boolean): void {
  const pol = slad.map((q) => ({ a: Math.atan2(q.y - bark.y, q.x - bark.x), r: Math.hypot(q.x - bark.x, q.y - bark.y) }));
  const pk: { a: number; r: number }[] = [pol[0]];
  for (let i = 1; i < pol.length; i++) {
    let d = pol[i].a - pol[i - 1].a;
    d = ((d + PI) % TAU + TAU) % TAU - PI;
    const n = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
    for (let j = 1; j <= n; j++) pk.push({ a: pol[i - 1].a + (d * j) / n, r: lerp(pol[i - 1].r, pol[i].r, j / n) });
  }
  if (pk.length < 2) return;
  const sila = clamp(sila0 + 0.3, 0, 1);
  const [cr, cg, cb] = szal ? [255, 70, 40] : [255, 226, 170];
  const P = (q: { a: number; r: number }, k: number): Pkt => ({ x: bark.x + Math.cos(q.a) * q.r * k, y: bark.y + Math.sin(q.a) * q.r * k });
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = pk.length;
  for (let i = 1; i < n; i++) {
    const w = i / (n - 1);
    const a0 = P(pk[i - 1], 1), a1 = P(pk[i], 1), b0 = P(pk[i - 1], 1 - 0.22 * w), b1 = P(pk[i], 1 - 0.22 * w);
    g.fillStyle = `rgba(${cr},${cg},${cb},${0.18 * w * w * sila})`;
    g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
  }
  g.strokeStyle = `rgba(${cr},${cg},${cb},${0.42 * sila})`; g.lineWidth = Math.max(0.6, h * 0.007);
  g.beginPath();
  const od = Math.floor(n * 0.35);
  for (let i = od; i < n; i++) { const q = P(pk[i], 1); if (i === od) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
  g.stroke();
  g.restore();
}
