import { CIEN, clamp, cos, lerp, los, mieszaj, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import { but, dlon, kolo, konczyna, naGlowie, podeszwa } from './malarz';
import { kesChleba, lampa, migot, mlotek, muchy, odpryski, type Rysunek } from './wspolne';
import { uderzenie } from './pamiec';
import type { Stopa } from './szkielet';
import { dolabra } from './uzbrojenie';
import { linia, poGlowie, twarzMroczna } from './twarz';
import { bez, bryla, cienieRzucane, klaks, konczynaZgieta, kreskaTuszu, plisa, przesiak, swiatlocien, swiatloOsi, SW, SWB, tonBryly, warstwaKontr, warstwaTuszu, ziarno, type Warstwa } from './tusz';

export { poGlowie } from './twarz';

/**
 * Robotnik — kopacz z trzewi góry (Remake v2), malowany jak rycerz: mroczna ilustracja tuszem z twardym
 * światłocieniem, konturem grubszym w cieniu i ciepłym światłem własnej lampki, które kładzie się na nim
 * od strony płomienia (i drga razem z nim).
 *
 * Jak górnik z drzeworytów: wełniany kaptur z pelerynką na barkach (naciągnięty albo zsunięty na kark,
 * czasem z długim ogonem), szorstka tunika do kolan, przepasana sznurem, łatana, ubłocona i przepocona,
 * skórzany fartuch na tyłku do siadania w chodnikach, sakwa u pasa, nogawice z owijkami, łapcie.
 * Wychudzony, brudny od sadzy i ziemi, oczy w cieniu kaptura. Dolabrę nosi na ramieniu, w drugiej dłoni
 * glinianą lampkę oliwną — przy pracy stawia ją na ziemi. Gdy nie ma rycerzy, wkłada żelazny garnek.
 */

type Tulow = (u: number, f: number) => Pkt;

/** Wysokość pasa (sznura) na tułowiu. */
const PAS = 0.32;
const FARTUCH: Rgb = [64, 46, 32];
const SZNUR: Rgb = [132, 110, 74];
const WOREK: Rgb = [118, 98, 70];

/** Rysunek kopacza: układ tułowia, gdzie świeci jego lampka i jak drga płomień. */
interface Kopacz { T: Tulow; lampa: Pkt | null; mig: number }

/** Skóra kopacza: blada od życia pod ziemią i szara od pyłu. */
const skoraKopacza = (st: Rysunek['st']): Rgb => mieszaj(st.skora, [100, 90, 82], 0.38);

/** Ciepły sierp od strony lampki na bryle o środku q i grubości gr — pusty, gdy lampka daleko albo z daleka. */
function cieplo(r: Rysunek, K: Kopacz, q: Pkt, gr: number, sila = 1): Warstwa[] {
  const { m, h } = r;
  if (!K.lampa || m.lod < 2) return [];
  const dx = K.lampa.x - q.x, dy = K.lampa.y - q.y, d = Math.hypot(dx, dy) || 1;
  const a = 0.36 * sila * K.mig * clamp(1.1 - d / (0.55 * h), 0, 1);
  if (a < 0.03) return [];
  return [[-gr * 0.3, `rgba(255,166,90,${a.toFixed(3)})`, undefined, { x: dx / d, y: dy / d }]];
}

export function rysujRobotnika(r: Rysunek): void {
  const { m, s, tryb, st, h, c, pm, czas, cz } = r;
  m.obrys = { aura: h < 60 ? 0.95 : clamp(0.95 - (h - 60) / 260, 0.32, 0.95), kontur: 'rgba(14,9,8,0.96)' };
  const wRekach = tryb.narzedzie !== null;
  const niesie = c.carry > 0;
  const naRamieniu = !wRekach && !niesie && (cz === 'stoi' || cz === 'idzie' || cz === 'biegnie');
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T: Tulow = (u, f) => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });
  // lampka: przy pracy stoi na ziemi za nim, w drodze świeci z dalszej dłoni — i oświetla jego samego
  const naZiemi = tryb.oburacz || cz === 'kopie' || cz === 'buduje' || cz === 'modli' || cz === 'je';
  const bezLampy = cz === 'wspina' || cz === 'spada' || cz === 'spi';
  const lp = bezLampy ? null : naZiemi ? { x: s.biodro.x - 0.17 * h, y: -0.03 * h } : { x: s.dlonB.x + 0.036 * h, y: s.dlonB.y + 0.07 * h };
  const K: Kopacz = { T, lampa: lp, mig: migot(czas, c.id) };
  const kaptur = st.wKapturze && !c.helm;

  // ---- z tyłu: ogon kaptura; dolabra za pasem, gdy ręce zajęte czym innym (worek z jedzeniem — na pelerynce kaptura)
  if (kaptur && st.ogon && !m.prosto) ogonKaptura(r);
  if (!niesie && !wRekach && !naRamieniu) dolabra(m, s.biodro.x - 0.07 * h, s.biodro.y - 0.04 * h, PI + 0.42 + pm.worek.a * 0.15, h * 0.88, c.id, st.drewno, st.zelazo);

  // ---- dalsza ręka (z lampką) i nogi — tunika przykryje uda
  if (!tryb.oburacz) reka(r, K, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  noga(r, K, s.kolB, s.stB, true);
  noga(r, K, s.kolA, s.stA, false);

  // ---- tunika, skórzany fartuch z tyłu, sznur z sakwą
  const cienReki = m.bogato ? konczynaZgieta(s.bark, 0.031 * h * 1.4, s.lokA, 0.023 * h, s.dlonA, 0.018 * h) : null;
  tunika(r, K, cienReki, niesie);
  fartuch(r, K);
  pas(r, K);

  // ---- dolabra na ramieniu (za głową) albo w rękach
  const glowaPrzed = !wRekach || !(s.narz > 2.4 && s.narz < 4.6);
  if (naRamieniu) dolabra(m, s.dlonA.x, s.dlonA.y, PI + 0.66 + pm.worek.a * 0.1, h * 0.9, c.id, st.drewno, st.zelazo);
  if (!glowaPrzed) narzedzie(r);
  glowaKopacza(r, K, kaptur);
  if (niesie) worek(r, K);
  if (glowaPrzed && wRekach) narzedzie(r);

  // ---- bliższa ręka; przy pracy oburącz dalsza dłoń na trzonku
  reka(r, K, s.bark, s.lokA, s.dlonA, s.przedA, false, wRekach || niesie || naRamieniu);
  if (tryb.oburacz) {
    m.ksztalt(kolo(s.dlonB, 0.02 * h), m.kula(s.dlonB, 0.02 * h, skoraKopacza(st), true, 0, CIEN.skora));
    reka(r, K, s.barkB, s.lokB, s.dlonB, s.przedB, true, true);
  }
  // lampka oliwna: w dalszej dłoni albo na ziemi przy pracy
  m.szczegol((g) => {
    if (naZiemi) lampa(g, s.biodro.x - 0.2 * h, 0, h, czas, c.id, m.lod, st.glina, true);
    else if (!bezLampy) lampa(g, s.dlonB.x + 0.006 * h, s.dlonB.y + 0.01 * h, h, czas, c.id, m.lod, st.glina, false, pm.worek.a * 0.6 + sin(czas * 0.003 + c.id) * 0.08);
  });
  if (tryb.grzyb) m.szczegol((g) => kesChleba(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
  if (!m.prosto) m.szczegol((g) => {
    odpryski(g, pm, czas, h, c.id);
    if (st.zatruty) muchy(g, s.glowa.x, s.glowa.y, h, czas, c.id);
  });
}

function narzedzie(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm } = r;
  if (tryb.narzedzie === 'kilof') uderzenie(pm, p.cios, dolabra(m, s.dlonA.x, s.dlonA.y, s.narz, h, c.id, st.drewno, st.zelazo), h, czas);
  else if (tryb.narzedzie === 'mlot') uderzenie(pm, p.cios, mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
}

// ------------------------------------------------------------------ kończyny

/** Noga w wełnianej nogawicy: jedna bryła od biodra po kostkę, na goleni owijki z brudnego płótna, łapeć. */
function noga(r: Rysunek, K: Kopacz, kol: Pkt, stp: Stopa, dalej: boolean): void {
  const { m, s, h, st } = r;
  const ru = 0.041 * h, rk = 0.029 * h, rs = 0.022 * h;
  const cala = konczynaZgieta(s.biodro, ru, kol, rk, stp.kostka, rs, [0.004 * h, 0.008 * h, 0.012 * h, 0.002 * h]);
  m.ksztalt(cala, tonBryly(m, st.nogawice, dalej ? -0.5 : -0.2, s.biodro, stp.kostka, ru * 1.8, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    // z bliska w obcięciu (owijki sięgają za brzeg), z daleka owijki dopasowane do szerokości goleni — bez obcinania
    const obc = m.bogato;
    if (obc) { g.save(); g.clip(cala); }
    // owijki: pas płótna nawinięty spiralnie od kostki prawie po kolano — zakładki widać jako ukośne kreski
    const ux = stp.kostka.x - kol.x, uy = stp.kostka.y - kol.y, LL = Math.hypot(ux, uy) || 1, nx = -uy / LL, ny = ux / LL;
    const w0 = obc ? rk * 1.8 : rk * 0.98, w1 = obc ? rk * 1.8 : rs * 0.98, t0 = 0.14, t1 = obc ? 1.02 : 0.98;
    const w = w0;
    const ow = new Path2D();
    ow.moveTo(kol.x + ux * t0 + nx * w0, kol.y + uy * t0 + ny * w0); ow.lineTo(kol.x + ux * t1 + nx * w1, kol.y + uy * t1 + ny * w1);
    ow.lineTo(kol.x + ux * t1 - nx * w1, kol.y + uy * t1 - ny * w1); ow.lineTo(kol.x + ux * (t0 + 0.06) - nx * w0, kol.y + uy * (t0 + 0.06) - ny * w0);
    ow.closePath();
    g.fillStyle = tonC(st.owijki, dalej ? -0.55 : -0.18, CIEN.tkanina); g.fill(ow);
    const n = m.lod === 2 ? 7 : 4;
    g.strokeStyle = dalej ? 'rgba(10,6,4,0.5)' : 'rgba(20,12,8,0.55)'; g.lineWidth = Math.max(0.5, h * (m.lod === 2 ? 0.0028 : 0.004));
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = t0 + (i / n) * (t1 - t0 - 0.05), sk = 0.07, wt = obc ? w : lerp(w0, w1, t);
      g.moveTo(kol.x + ux * t + nx * wt, kol.y + uy * t + ny * wt); g.lineTo(kol.x + ux * (t + sk) - nx * wt, kol.y + uy * (t + sk) - ny * wt);
    }
    g.stroke();
    // błoto: od kolana w dół coraz więcej
    const bl = g.createLinearGradient(0, kol.y, 0, stp.kostka.y + 0.02 * h);
    bl.addColorStop(0, 'rgba(46,32,20,0)'); bl.addColorStop(1, 'rgba(46,32,20,0.62)');
    g.fillStyle = bl; g.fill(cala);
    if (m.bogato) {
      const w2: Warstwa[] = [[ru * 0.9, 'rgba(6,4,4,0.5)'], [ru * 0.3, 'rgba(6,4,4,0.42)'], ...cieplo(r, K, kol, ru * 2), [-ru * 0.3, 'rgba(255,236,210,0.08)']];
      if (!dalej) w2.push(warstwaKontr(h, 0.7));
      w2.push(warstwaTuszu(h, dalej ? 0.7 : 1));
      swiatlocien(g, cala, w2, swiatloOsi(s.biodro, stp.kostka), undefined, true);
    }
    if (obc) g.restore();
    if (m.lod === 2) kreskaTuszu(g, cala, h, dalej ? 0.7 : 1);
  });
  // łapeć: miękka skóra, rzemień w kostce, błoto
  const b = but(stp, h, 0.045, 0.95);
  m.ksztalt(b, tonC([48, 36, 28], dalej ? -0.5 : -0.2, CIEN.tkanina), (g) => {
    if (m.prosto) return;
    podeszwa(g, stp, h, 'rgba(8,6,6,0.95)');
    if (m.lod < 2) return;
    g.fillStyle = 'rgba(56,42,28,0.55)'; g.beginPath(); g.ellipse(stp.palce.x - 0.016 * h, stp.palce.y - 0.007 * h, 0.024 * h, 0.009 * h, -stp.kat, 0, TAU); g.fill();
    const ks = stp.kostka;
    g.strokeStyle = 'rgba(24,16,10,0.9)'; g.lineWidth = Math.max(0.5, h * 0.004); g.lineCap = 'round';
    g.beginPath(); g.moveTo(ks.x - 0.026 * h, ks.y + 0.014 * h); g.lineTo(ks.x + 0.028 * h, ks.y + 0.02 * h); g.stroke();
    if (m.bogato) bryla(g, b, h, [[0.014 * h, 'rgba(4,2,2,0.5)'], ...cieplo(r, K, ks, 0.04 * h), [-0.004 * h, 'rgba(255,240,220,0.12)']], SWB, dalej ? 0.7 : 1);
  });
}

/** Goła, żylasta ręka w krótkim rękawie tuniki; brudna od łokcia ku dłoni, dłoń spracowana. */
function reka(r: Rysunek, K: Kopacz, bark: Pkt, lok: Pkt, dl: Pkt, przed: number, dalej: boolean, piesc: boolean): void {
  const { m, h, st } = r;
  const skora = skoraKopacza(st);
  const r1 = 0.029 * h, r2 = 0.022 * h, r3 = 0.015 * h;
  const cala = konczynaZgieta(bark, r1, lok, r2, dl, r3, [0.005 * h, 0.003 * h, 0.011 * h, 0.004 * h]);
  m.ksztalt(cala, tonBryly(m, skora, dalej ? -0.45 : -0.16, bark, dl, r1 * 1.8, CIEN.skora), (g) => {
    if (m.prosto) return;
    // ziemia i sadza: ciemniej ku dłoni
    const bl = g.createLinearGradient(lok.x, lok.y, dl.x, dl.y);
    bl.addColorStop(0, 'rgba(40,30,22,0)'); bl.addColorStop(1, 'rgba(40,30,22,0.5)');
    g.fillStyle = bl; g.fill(cala);
    if (m.lod === 2 && !m.bogato) kreskaTuszu(g, cala, h, dalej ? 0.7 : 1);
    if (m.bogato) {
      g.save(); g.clip(cala);
      // ścięgno wzdłuż przedramienia i smuga brudu
      const ux = dl.x - lok.x, uy = dl.y - lok.y, LL = Math.hypot(ux, uy) || 1, nx = -uy / LL, ny = ux / LL;
      g.strokeStyle = 'rgba(40,24,20,0.35)'; g.lineWidth = Math.max(0.4, h * 0.0022);
      g.beginPath(); g.moveTo(lok.x + ux * 0.15 - nx * r2 * 0.3, lok.y + uy * 0.15 - ny * r2 * 0.3); g.quadraticCurveTo(lok.x + ux * 0.5 - nx * r2 * 0.55, lok.y + uy * 0.5 - ny * r2 * 0.55, lok.x + ux * 0.85 - nx * r2 * 0.3, lok.y + uy * 0.85 - ny * r2 * 0.3); g.stroke();
      const w2: Warstwa[] = [[r1 * 1.15, 'rgba(26,14,12,0.55)'], [r1 * 0.35, 'rgba(18,10,8,0.48)'], ...cieplo(r, K, lok, r1 * 2), [-r1 * 0.3, 'rgba(255,230,200,0.12)']];
      if (!dalej) w2.push(warstwaKontr(h, 0.6));
      w2.push(warstwaTuszu(h, dalej ? 0.7 : 1));
      swiatlocien(g, cala, w2, swiatloOsi(bark, dl), undefined, true);
      g.restore();
    }
  });
  // krótki rękaw tuniki do połowy ramienia: przylega, brzeg postrzępiony
  const ux = lok.x - bark.x, uy = lok.y - bark.y, LL = Math.hypot(ux, uy) || 1, u = { x: ux / LL, y: uy / LL }, nn = { x: -u.y, y: u.x };
  const kon = { x: bark.x + ux * 0.5, y: bark.y + uy * 0.5 }, rr0 = r1 * 1.2, rr1 = r1 * 1.12;
  const rek = new Path2D();
  rek.moveTo(bark.x + nn.x * rr0, bark.y + nn.y * rr0); rek.lineTo(kon.x + nn.x * rr1, kon.y + nn.y * rr1);
  for (let i = 1; i <= 4; i++) {
    const t = 1 - (2 * i) / 4, j = (los(r.c.id, 1500 + i + (dalej ? 9 : 0)) - 0.35) * 0.014 * h;
    rek.lineTo(kon.x + nn.x * rr1 * t + u.x * j, kon.y + nn.y * rr1 * t + u.y * j);
  }
  rek.lineTo(bark.x - nn.x * rr0, bark.y - nn.y * rr0);
  const an = Math.atan2(nn.y, nn.x);
  rek.arc(bark.x, bark.y, rr0, an - PI, an - TAU, true);
  rek.closePath();
  m.ksztalt(rek, tonBryly(m, st.tunika, dalej ? -0.48 : -0.1, bark, kon, r1 * 2.4, CIEN.tkanina), (g) => {
    if (!m.bogato) return;
    bryla(g, rek, h, [[r1 * 1.1, 'rgba(20,12,10,0.48)'], ...cieplo(r, K, bark, r1 * 2.4, 0.8), [-r1 * 0.3, 'rgba(255,236,206,0.1)']], swiatloOsi(bark, lok), dalej ? 0.7 : 1);
  });
  // owijka na przegubie: brudne płótno od połowy przedramienia po nadgarstek (jak na goleniach)
  if (!m.prosto) {
    const ow = owijkaPrzegubu(lok, dl, r2, r3, 0.011 * h, 0.004 * h);
    m.ksztalt(ow.p, tonC(mieszaj(st.owijki, [70, 56, 42], 0.3), dalej ? -0.55 : -0.2, CIEN.tkanina), (g) => {
      if (m.lod < 2) return;
      if (m.bogato) bryla(g, ow.p, h, [[r3 * 0.9, 'rgba(20,12,10,0.5)'], ...cieplo(r, K, dl, r2 * 2.2, 0.8), [-r3 * 0.3, 'rgba(255,236,206,0.12)']], swiatloOsi(lok, dl), dalej ? 0.7 : 1);
      g.strokeStyle = 'rgba(14,9,8,0.75)'; g.lineWidth = Math.max(0.5, h * 0.0022);
      g.beginPath();
      for (const [a, b] of ow.zwoje) { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
      g.stroke();
    });
  }
  const d = dlon(dl, przed, 0.022 * h, piesc);
  m.ksztalt(d, tonC(mieszaj(skora, [60, 46, 36], 0.42), dalej ? -0.42 : -0.1, CIEN.skora), (g) => {
    if (!m.bogato) return;
    swiatlocien(g, d, [[0.012 * h, 'rgba(20,10,8,0.45)'], ...cieplo(r, K, dl, 0.03 * h)], SWB);
  });
}

/**
 * Owijka przegubu: czworobok obejmujący przedramię od połowy po nadgarstek (z wypukłością mięśnia jak w
 * `konczynaZgieta`, odrobinę szerszy — płótno odstaje) i ukośne zakładki zwojów.
 */
function owijkaPrzegubu(lok: Pkt, dl: Pkt, r2: number, r3: number, wTyl: number, wPrzod: number): { p: Path2D; zwoje: [Pkt, Pkt][] } {
  const ux = dl.x - lok.x, uy = dl.y - lok.y, L = Math.hypot(ux, uy) || 1, nx = -uy / L, ny = ux / L;
  const P = (t: number, z: number): Pkt => {
    const rr = (r2 + (r3 - r2) * t + 4 * (z > 0 ? wTyl : wPrzod) * t * (1 - t)) * 1.1;
    return { x: lok.x + ux * t + nx * rr * z, y: lok.y + uy * t + ny * rr * z };
  };
  const a = P(0.52, 1), b = P(0.94, 1), c = P(0.97, -1), d = P(0.6, -1);
  const p = new Path2D();
  p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(c.x, c.y); p.lineTo(d.x, d.y); p.closePath();
  const zwoje: [Pkt, Pkt][] = [];
  for (let i = 1; i <= 3; i++) { const t = 0.52 + i * 0.105; zwoje.push([P(t - 0.03, 1), P(t + 0.07, -1)]); }
  return { p, zwoje };
}

// ------------------------------------------------------------------ tunika, fartuch, sznur

/**
 * Tunika z szorstkiej wełny: bluzuje nad sznurem, do kolan, w plisy z podartym rąbkiem; łaty ze ściegiem,
 * przepocona pod pachą, kurz na barkach, błoto u dołu. Gdy niesie worek — pas przez pierś.
 */
function tunika(r: Rysunek, K: Kopacz, cienReki: Path2D | null, niesie: boolean): void {
  const { m, s, h, st, c, pm } = r;
  const id = c.id, T = K.T;
  const [kp, kt] = s.kolA.x >= s.kolB.x ? [s.kolA, s.kolB] : [s.kolB, s.kolA];
  const rabek = Math.min(Math.max(s.kolA.y, s.kolB.y) - 0.024 * h, s.biodro.y + 0.205 * h);
  const fal = pm.szata.a;
  const przod = Math.max(kp.x + 0.032 * h, s.biodro.x + 0.072 * h) - fal * 0.01 * h;
  const tyl = Math.min(kt.x - 0.036 * h, s.biodro.x - 0.082 * h) + fal * 0.04 * h;
  const Wf = T(PAS, 0.066), Wb = T(PAS, -0.068);
  const Hf = { x: przod, y: rabek - 0.008 * h }, Hb = { x: tyl, y: rabek - 0.004 * h };
  const nf = m.prosto ? 1 : m.lod === 2 ? 4 : 2;
  const doliny: { g: Pkt; d: Pkt }[] = [];
  for (let i = 0; i < nf; i++) {
    const t = (i + 0.5 + 0.35 * (los(id, 495 + i) - 0.5)) / nf;
    doliny.push({ g: T(PAS - 0.03, lerp(0.056, -0.058, t)), d: { x: lerp(przod, tyl, t) + fal * 0.02 * h, y: rabek - 0.006 * h } });
  }
  const w = new Path2D();
  w.moveTo(Wb.x, Wb.y);
  bez(w, T(0.5, -0.084), T(0.82, -0.092), T(0.965, -0.068));
  w.quadraticCurveTo(T(1.01, -0.008).x, T(1.01, -0.008).y, T(0.97, 0.05).x, T(0.97, 0.05).y);
  bez(w, T(0.8, 0.094), T(0.54, 0.088), T(PAS + 0.07, 0.088));
  w.quadraticCurveTo(T(PAS + 0.02, 0.094).x, T(PAS + 0.02, 0.094).y, Wf.x, Wf.y);
  bez(w, T(PAS - 0.1, 0.074), { x: przod - 0.004 * h, y: rabek - 0.09 * h }, Hf);
  const wezly: Pkt[] = [Hf, ...doliny.map((v) => v.d), Hb];
  for (let i = 1; i < wezly.length; i++) plisa(w, wezly[i - 1], wezly[i], h, id, 500 + i * 5, 0.55);
  bez(w, { x: tyl + 0.006 * h, y: rabek - 0.09 * h }, T(PAS - 0.1, -0.088), Wb);
  w.closePath();

  let styl: string | CanvasGradient = tonC(st.tunika, -0.06, CIEN.tkanina);
  if (!m.prosto) {
    const a = T(0.85, 0.09), b = { x: tyl, y: rabek };
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.tunika, 0.1, CIEN.tkanina)); gr.addColorStop(0.45, tonC(st.tunika, -0.08, CIEN.tkanina)); gr.addColorStop(1, tonC(st.tunika, -0.46, CIEN.tkanina));
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
    if (m.lod === 2) {
      // łaty z innej wełny, przyszyte grubym ściegiem
      for (let i = 0; i < 2; i++) {
        if (los(id, 520 + i) < 0.35) continue;
        const q = i === 0 ? T(0.55 + 0.3 * los(id, 522), -0.03 + 0.05 * los(id, 523)) : { x: lerp(tyl, przod, 0.25 + 0.5 * los(id, 524)), y: lerp(s.biodro.y, rabek, 0.4 + 0.3 * los(id, 525)) };
        const lw = (0.022 + 0.014 * los(id, 526 + i)) * h, lh = (0.026 + 0.016 * los(id, 528 + i)) * h, ka = s.katT + (los(id, 530 + i) - 0.5) * 0.5;
        g.save(); g.translate(q.x, q.y); g.rotate(ka);
        g.fillStyle = tonC(mieszaj(st.tunika, st.kaptur, 0.5), -0.05 + 0.15 * los(id, 532 + i), CIEN.tkanina); g.fillRect(-lw / 2, -lh / 2, lw, lh);
        g.setLineDash([h * 0.004, h * 0.004]); g.strokeStyle = 'rgba(214,196,160,0.55)'; g.lineWidth = Math.max(0.4, h * 0.0018);
        g.strokeRect(-lw / 2 + h * 0.002, -lh / 2 + h * 0.002, lw - h * 0.004, lh - h * 0.004); g.setLineDash([]);
        g.strokeStyle = 'rgba(16,10,8,0.5)'; g.lineWidth = Math.max(0.4, h * 0.0016); g.strokeRect(-lw / 2, -lh / 2, lw, lh);
        g.restore();
      }
    }
    // fałdy: doliny od sznura ku rąbkowi — cień wpada w dolinę, grzbiet obok łapie światło
    for (let i = 0; i < nf; i++) {
      const { g: gp, d } = doliny[i];
      const sz = (0.01 + 0.007 * los(id, 497 + i)) * h, kx = (gp.x + d.x) / 2 + 0.007 * h, ky = (gp.y + d.y) / 2;
      const cien = new Path2D();
      cien.moveTo(gp.x, gp.y); cien.quadraticCurveTo(kx, ky, d.x, d.y + 0.012 * h);
      cien.lineTo(d.x + sz, d.y + 0.008 * h); cien.quadraticCurveTo(kx + sz * 0.45, ky, gp.x + 0.003 * h, gp.y);
      cien.closePath();
      g.fillStyle = 'rgba(22,12,10,0.38)'; g.fill(cien);
      if (m.lod < 2) continue;
      g.strokeStyle = 'rgba(255,240,214,0.12)'; g.lineWidth = Math.max(0.5, sz * 0.4);
      g.beginPath(); g.moveTo(gp.x - 0.003 * h, gp.y + 0.008 * h); g.quadraticCurveTo(kx - sz * 0.4, ky, d.x - sz * 0.5, d.y); g.stroke();
    }
    // bluzowanie nad sznurem i pod pachą
    g.strokeStyle = 'rgba(28,16,12,0.36)'; g.lineWidth = Math.max(0.4, h * 0.003);
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = T(PAS + 0.04, -0.05 + i * 0.045), b = T(PAS + 0.16 + 0.04 * i, -0.02 + i * 0.032);
      g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 + 0.006 * h, (a.y + b.y) / 2, b.x, b.y);
    }
    g.stroke();
    // pot pod pachą, kurz na barkach, błoto od rąbka
    const pp = T(0.84, -0.04);
    const pg = g.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 0.07 * h);
    pg.addColorStop(0, 'rgba(36,24,16,0.45)'); pg.addColorStop(1, 'rgba(36,24,16,0)');
    g.fillStyle = pg; g.fillRect(pp.x - 0.08 * h, pp.y - 0.08 * h, 0.16 * h, 0.16 * h);
    if (m.bogato) {
      g.fillStyle = 'rgba(196,184,164,0.3)';
      for (let i = 0; i < 26; i++) { const q = T(0.86 + 0.14 * los(id, 540 + i), -0.07 + 0.15 * los(id, 570 + i)); g.fillRect(q.x, q.y, h * 0.0024, h * 0.0024); }
    }
    const bl = g.createLinearGradient(0, s.biodro.y + 0.04 * h, 0, rabek + 0.03 * h);
    bl.addColorStop(0, 'rgba(70,52,36,0)'); bl.addColorStop(0.55, 'rgba(70,52,36,0.3)'); bl.addColorStop(1, 'rgba(46,32,20,0.88)');
    g.globalCompositeOperation = 'multiply'; g.fillStyle = bl; g.fill(w); g.globalCompositeOperation = 'source-over';
    if (m.lod === 2 && los(id, 534) < 0.4) przesiak(g, lerp(tyl, przod, 0.4 + 0.3 * los(id, 535)), lerp(s.biodro.y, rabek, 0.75), 0.01 * h, id + 9, 0.5, m.lod);
    // pas worka przez pierś
    if (niesie) {
      const r1 = T(0.98, -0.055), r2 = T(PAS + 0.04, 0.07);
      g.strokeStyle = tonC(FARTUCH, -0.15, CIEN.tkanina); g.lineWidth = Math.max(1, h * 0.014); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(r1.x, r1.y); g.lineTo(r2.x, r2.y); g.stroke();
      g.strokeStyle = 'rgba(8,4,4,0.6)'; g.lineWidth = Math.max(0.4, h * 0.0022);
      g.beginPath(); g.moveTo(r1.x - 0.007 * h, r1.y + 0.003 * h); g.lineTo(r2.x - 0.007 * h, r2.y + 0.003 * h); g.stroke();
      g.lineCap = 'round';
    }
    if (cienReki) cienieRzucane(g, w, [[cienReki, 0.024 * h, 0.32]], true);
    if (m.bogato) {
      swiatlocien(g, w, [[0.045 * h, 'rgba(18,10,8,0.44)'], [0.015 * h, 'rgba(14,8,8,0.42)'], ...cieplo(r, K, T(0.45, 0.04), 0.12 * h, 0.9), [-0.01 * h, 'rgba(255,238,208,0.12)'], warstwaKontr(h, 0.7), warstwaTuszu(h)], SWB, undefined, true);
    } else if (m.lod === 2) swiatlocien(g, w, [[0.045 * h, 'rgba(18,10,8,0.5)'], ...cieplo(r, K, T(0.45, 0.04), 0.12 * h, 0.9), warstwaTuszu(h)], SWB, undefined, true);
    else swiatlocien(g, w, [[0.045 * h, 'rgba(18,10,8,0.5)']], SWB, undefined, true);
    g.restore();
    if (m.lod === 2) kreskaTuszu(g, w, h);
  });
}

/** Skórzany fartuch górnika z tyłu, od sznura po pół uda — do siadania i zjeżdżania w chodnikach. */
function fartuch(r: Rysunek, K: Kopacz): void {
  const { m, s, h, pm, c } = r;
  const T = K.T, fal = pm.szata.a;
  const A = T(PAS + 0.012, -0.046), B = T(PAS + 0.014, -0.08), C = T(PAS - 0.12, -0.108);
  const D = { x: s.biodro.x - 0.092 * h + fal * 0.03 * h, y: s.biodro.y + 0.105 * h };
  const E = { x: s.biodro.x - 0.048 * h + fal * 0.014 * h, y: s.biodro.y + 0.11 * h };
  const p = new Path2D();
  p.moveTo(A.x, A.y); p.lineTo(B.x, B.y);
  p.quadraticCurveTo(C.x, C.y, D.x, D.y);
  p.quadraticCurveTo((D.x + E.x) / 2, Math.max(D.y, E.y) + 0.022 * h, E.x, E.y);
  p.quadraticCurveTo(lerp(A.x, E.x, 0.5) + 0.012 * h, lerp(A.y, E.y, 0.5), A.x, A.y);
  p.closePath();
  let styl: string | CanvasGradient = tonC(FARTUCH, -0.12, CIEN.tkanina);
  if (m.lod > 0) {
    const gr = m.g.createLinearGradient(B.x, B.y, D.x, D.y);
    gr.addColorStop(0, tonC(FARTUCH, 0.04, CIEN.tkanina)); gr.addColorStop(1, tonC(FARTUCH, -0.42, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(p, styl, (g) => {
    if (!m.bogato) { if (m.lod === 2) kreskaTuszu(g, p, h, 0.8); return; }
    g.save(); g.clip(p);
    // wytarte do połysku miejsca i rysy
    g.fillStyle = 'rgba(200,170,130,0.14)';
    g.beginPath(); g.ellipse(lerp(B.x, D.x, 0.55) + 0.01 * h, lerp(B.y, D.y, 0.55), 0.022 * h, 0.04 * h, s.katT, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(14,8,6,0.4)'; g.lineWidth = Math.max(0.4, h * 0.002);
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const q = { x: lerp(B.x, E.x, 0.3 + 0.2 * i), y: lerp(B.y, E.y, 0.4 + 0.15 * i) };
      g.moveTo(q.x - 0.012 * h, q.y + 0.004 * h * los(c.id, 590 + i)); g.lineTo(q.x + 0.01 * h, q.y + 0.01 * h);
    }
    g.stroke();
    // ścieg wzdłuż brzegu
    g.setLineDash([h * 0.004, h * 0.005]); g.strokeStyle = 'rgba(190,160,120,0.35)'; g.lineWidth = Math.max(0.4, h * 0.0016);
    g.beginPath(); g.moveTo(B.x, B.y + 0.006 * h); g.quadraticCurveTo(C.x + 0.006 * h, C.y, D.x + 0.004 * h, D.y - 0.006 * h); g.stroke();
    g.setLineDash([]);
    swiatlocien(g, p, [[0.03 * h, 'rgba(6,4,4,0.5)'], ...cieplo(r, K, E, 0.08 * h), [-0.006 * h, 'rgba(255,230,200,0.16)'], warstwaTuszu(h)], SWB, undefined, true);
    g.restore();
    kreskaTuszu(g, p, h);
  });
}

/** Sznur w pasie z węzłem i strzępiastymi końcami, sakwa z zatłuszczonej skóry. */
function pas(r: Rysunek, K: Kopacz): void {
  const { m, h, pm, czas, c } = r;
  const T = K.T;
  const a0 = T(PAS + 0.014, -0.074), a1 = T(PAS + 0.012, 0.072), b1 = T(PAS - 0.012, 0.072), b0 = T(PAS - 0.012, -0.074);
  const pa = new Path2D();
  pa.moveTo(a0.x, a0.y); pa.quadraticCurveTo(T(PAS + 0.02, 0).x, T(PAS + 0.02, 0).y, a1.x, a1.y);
  pa.lineTo(b1.x, b1.y); pa.quadraticCurveTo(T(PAS - 0.006, 0).x, T(PAS - 0.006, 0).y, b0.x, b0.y); pa.closePath();
  m.ksztalt(pa, tonC(SZNUR, -0.25, CIEN.tkanina), (g) => {
    if (!m.bogato) return;
    // skręt sznura
    g.save(); g.clip(pa);
    g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = Math.max(0.4, h * 0.0024);
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, q = T(PAS, lerp(-0.074, 0.072, t));
      g.moveTo(q.x - 0.006 * h, q.y - 0.012 * h); g.lineTo(q.x + 0.004 * h, q.y + 0.012 * h);
    }
    g.stroke();
    swiatlocien(g, pa, [[0.012 * h, 'rgba(8,4,4,0.45)'], [-0.004 * h, 'rgba(255,236,206,0.2)']], SW, undefined, true);
    g.restore();
  });
  // węzeł z przodu i dwa końce kołyszące się w marszu
  const w = T(PAS, 0.06), kol = pm.szata.a * 1.2 + sin(czas * 0.004 + c.id) * 0.1;
  m.kreska(w.x, w.y, w.x + sin(kol) * 0.02 * h, w.y + 0.07 * h, Math.max(0.8, h * 0.009), tonC(SZNUR, -0.3, CIEN.tkanina));
  m.kreska(w.x, w.y, w.x + sin(kol + 0.3) * 0.03 * h - 0.008 * h, w.y + 0.055 * h, Math.max(0.8, h * 0.009), tonC(SZNUR, -0.38, CIEN.tkanina));
  // sakwa u boku
  const q = T(PAS - 0.05, 0.026);
  const sk = new Path2D();
  sk.moveTo(q.x - 0.016 * h, q.y - 0.016 * h); sk.lineTo(q.x + 0.016 * h, q.y - 0.016 * h);
  sk.quadraticCurveTo(q.x + 0.022 * h, q.y + 0.03 * h, q.x, q.y + 0.034 * h);
  sk.quadraticCurveTo(q.x - 0.022 * h, q.y + 0.03 * h, q.x - 0.016 * h, q.y - 0.016 * h); sk.closePath();
  m.ksztalt(sk, tonC(FARTUCH, -0.05, CIEN.tkanina), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = 'rgba(10,6,4,0.6)'; g.lineWidth = Math.max(0.4, h * 0.002);
    g.beginPath(); g.moveTo(q.x - 0.016 * h, q.y - 0.004 * h); g.quadraticCurveTo(q.x, q.y + 0.006 * h, q.x + 0.016 * h, q.y - 0.004 * h); g.stroke();
    if (m.bogato) bryla(g, sk, h, [[0.012 * h, 'rgba(6,4,4,0.5)'], ...cieplo(r, K, q, 0.04 * h), [-0.004 * h, 'rgba(255,230,200,0.18)']], SWB, 0.8);
  });
}

// ------------------------------------------------------------------ worek

/** Worek z jedzeniem z wiadra na plecach: szorstkie płótno ściągnięte sznurkiem, z wierzchu bochen i rzepa. */
function worek(r: Rysunek, K: Kopacz): void {
  const { m, s, h, pm, c } = r;
  const krok = sin(pm.faza * TAU * 2);
  const dx = -0.1 * h + pm.worek.a * 0.03 * h, dy = 0.07 * h - Math.abs(krok) * 0.012 * h;
  const tx = sin(s.katT), ty = -cos(s.katT);
  const wx = s.bark.x + dx * cos(s.katT) - 0.02 * h * tx, wy = s.bark.y + dy + dx * sin(s.katT) - 0.02 * h * ty;
  const kat = -0.25 + pm.worek.a * 0.4;
  // z wierzchu: bochen i rzepa
  if (!m.prosto) {
    const bo = new Path2D(); bo.ellipse(wx + 0.01 * h, wy - 0.085 * h, 0.034 * h, 0.022 * h, kat, 0, TAU);
    m.ksztalt(bo, tonC([150, 98, 50], -0.05, CIEN.tkanina), (g) => {
      if (m.lod < 2) return;
      g.fillStyle = 'rgba(255,224,170,0.3)'; g.beginPath(); g.ellipse(wx + 0.002 * h, wy - 0.094 * h, 0.016 * h, 0.007 * h, kat, 0, TAU); g.fill();
      if (m.bogato) bryla(g, bo, h, [[0.01 * h, 'rgba(30,14,6,0.45)']], SW, 0.8);
    });
    const rz = new Path2D(); rz.arc(wx - 0.028 * h, wy - 0.08 * h, 0.016 * h, 0, TAU);
    m.ksztalt(rz, tonC([150, 70, 52], -0.1, CIEN.tkanina));
  }
  const w = klaks(wx, wy, 0.08 * h, c.id, 600, 10, 0.12, 1.18, kat + PI / 2);
  let styl: string | CanvasGradient = tonC(WOREK, -0.1, CIEN.tkanina);
  if (m.lod > 0) {
    const gr = m.g.createLinearGradient(wx + 0.06 * h, wy - 0.1 * h, wx - 0.05 * h, wy + 0.1 * h);
    gr.addColorStop(0, tonC(WOREK, 0.06, CIEN.tkanina)); gr.addColorStop(1, tonC(WOREK, -0.45, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(w, styl, (g) => {
    if (!m.bogato) { if (m.lod === 2) kreskaTuszu(g, w, h, 0.8); return; }
    g.save(); g.clip(w);
    if (m.bogato) { const z = ziarno(g); if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(w); g.globalCompositeOperation = 'source-over'; } }
    // sznurek ściągający wylot i zmarszczki płótna od niego
    g.strokeStyle = 'rgba(30,20,12,0.6)'; g.lineWidth = Math.max(0.5, h * 0.004);
    g.beginPath(); g.moveTo(wx - 0.05 * h, wy - 0.06 * h); g.quadraticCurveTo(wx, wy - 0.045 * h, wx + 0.045 * h, wy - 0.066 * h); g.stroke();
    g.strokeStyle = 'rgba(30,20,12,0.32)'; g.lineWidth = Math.max(0.4, h * 0.0025);
    g.beginPath();
    for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; g.moveTo(lerp(wx - 0.045 * h, wx + 0.04 * h, t), wy - 0.055 * h); g.quadraticCurveTo(lerp(wx - 0.05 * h, wx + 0.05 * h, t), wy, lerp(wx - 0.06 * h, wx + 0.05 * h, t), wy + 0.04 * h); }
    g.stroke();
    swiatlocien(g, w, [[0.04 * h, 'rgba(10,6,4,0.45)'], ...cieplo(r, K, { x: wx, y: wy }, 0.17 * h), [-0.008 * h, 'rgba(255,236,206,0.12)'], warstwaTuszu(h)], SWB, undefined, true);
    g.restore();
    kreskaTuszu(g, w, h);
  });
}

// ------------------------------------------------------------------ głowa

function glowaKopacza(r: Rysunek, K: Kopacz, wKapturze: boolean): void {
  const { m, s, st, h, c } = r;
  const skora = skoraKopacza(st);
  const sz = konczyna(s.bark, 0.024 * h, s.glowa, 0.022 * h);
  m.ksztalt(sz, tonBryly(m, skora, -0.32, s.bark, s.glowa, 0.05 * h, CIEN.skora));
  const sila = K.lampa ? K.mig * clamp(1.15 - Math.hypot(K.lampa.x - s.glowa.x, K.lampa.y - s.glowa.y) / (0.7 * h), 0, 1) : 0;
  twarzMroczna(r, { skora, cien: wKapturze ? 0.72 : c.helm ? 0.85 : 0.12, sadza: true, blizna: los(c.id, 31) < 0.14, lampa: K.lampa, lampaSila: sila, ucho: !wKapturze && !c.helm });
  if (wKapturze) kapturKopacza(r, K, true);
  else {
    kapturKopacza(r, K, false);
    if (!c.helm) wlosyKopacza(r);
  }
  if (c.helm) helmRobotnika(r, K);
}

/** Wełniany kaptur z pelerynką: naciągnięty na głowę (twarz w cieniu) albo zsunięty na kark jak kołnierz. */
function kapturKopacza(r: Rysunek, K: Kopacz, naGlowe: boolean): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG, rg = s.rg;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const pk: [number, number][] = naGlowe
    ? [[0.5, -0.98], [0.18, -1.2], [-0.4, -1.24], [-0.98, -0.98], [-1.24, -0.22], [-1.2, 0.7], [-1.34, 1.5], [-1.0, 2.04], [-0.2, 2.22], [0.6, 2.08], [1.0, 1.6], [0.82, 1.12], [0.4, 0.96], [0.12, 0.36], [0.1, -0.36], [0.3, -0.8]]
    : [[-0.86, 0.66], [-1.3, 0.86], [-1.42, 1.36], [-1.1, 1.86], [-0.3, 2.02], [0.5, 1.92], [0.92, 1.56], [0.7, 1.32], [0.14, 1.42], [-0.42, 1.24], [-0.74, 0.98]];
  const kp = poGlowie(s, kat, pk);
  let styl: string | CanvasGradient = tonC(st.kaptur, -0.08, CIEN.tkanina);
  if (!m.prosto) {
    const a = P(0.4, -1.2), b = P(-0.8, 2.1);
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.kaptur, 0.12, CIEN.tkanina)); gr.addColorStop(0.5, tonC(st.kaptur, -0.1, CIEN.tkanina)); gr.addColorStop(1, tonC(st.kaptur, -0.48, CIEN.tkanina));
    styl = gr;
  }
  m.ksztalt(kp, styl, (g) => {
    if (m.prosto) return;
    g.save(); g.clip(kp);
    if (m.bogato) { const z = ziarno(g); if (z) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = z; g.fill(kp); g.globalCompositeOperation = 'source-over'; } }
    if (naGlowe) {
      // brzeg wokół twarzy: gruba, podwinięta krawędź — ciemny podbój i jasny wierzch
      linia(g, [P(0.5, -0.98), P(0.22, -0.62), P(0.1, 0.0), P(0.2, 0.62), P(0.42, 0.98)], 'rgba(8,4,4,0.75)', Math.max(0.8, rg * 0.16));
      linia(g, [P(0.43, -1.02), P(0.15, -0.64), P(0.03, 0.0), P(0.13, 0.62), P(0.35, 1.0)], tonC(st.kaptur, 0.18, CIEN.tkanina, 0.6), Math.max(0.5, rg * 0.06));
    }
    // fałdy pelerynki rozchodzą się od karku
    g.strokeStyle = 'rgba(10,6,4,0.4)'; g.lineWidth = Math.max(0.5, rg * 0.05);
    g.beginPath();
    for (let i = 0; i < (m.lod === 2 ? 4 : 2); i++) {
      const t = (i + 0.5) / 4, a = P(-0.8 + 1.1 * t, 1.25 + 0.15 * Math.sin(t * PI)), b = P(-1.1 + 1.7 * t, 2.12 + 0.1 * Math.sin(t * PI));
      g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 - rg * 0.08, (a.y + b.y) / 2, b.x, b.y);
    }
    g.stroke();
    // kurz i okruchy skały na wierzchu
    if (m.bogato) {
      g.fillStyle = 'rgba(200,188,168,0.32)';
      for (let i = 0; i < 30; i++) { const q = P(-1.0 + 1.6 * los(c.id, 620 + i), (naGlowe ? -1.25 : 0.9) + 0.6 * los(c.id, 660 + i)); g.fillRect(q.x, q.y, h * 0.0024, h * 0.0024); }
    }
    if (m.bogato) {
      swiatlocien(g, kp, [[rg * 0.5, 'rgba(8,4,4,0.48)'], [rg * 0.16, 'rgba(8,4,4,0.42)'], ...cieplo(r, K, P(0.2, 1.4), rg * 2.4), [-rg * 0.1, 'rgba(255,236,206,0.12)'], warstwaKontr(h, 0.8), warstwaTuszu(h)], SWB, undefined, true);
    } else if (m.lod === 2) swiatlocien(g, kp, [[rg * 0.5, 'rgba(8,4,4,0.52)'], warstwaTuszu(h)], SWB, undefined, true);
    else swiatlocien(g, kp, [[rg * 0.5, 'rgba(8,4,4,0.5)']], SWB, undefined, true);
    g.restore();
    if (m.lod === 2) kreskaTuszu(g, kp, h);
  });
}

/** Długi ogon kaptura zwisający na plecy; kołysze się w marszu i odlatuje w biegu. */
function ogonKaptura(r: Rysunek): void {
  const { m, s, st, h, pm, czas, c } = r;
  const kat = s.katG;
  const A = naGlowie(s, kat, -0.74, -1.02);
  const a = -0.35 + pm.kaptur.a * 0.9 + sin(czas * 0.003 + c.id) * 0.06;
  const dl = 0.24 * h;
  const B = { x: A.x - 0.05 * h + sin(a) * dl * 0.45, y: A.y + cos(a) * dl * 0.45 };
  const E = { x: A.x - 0.03 * h + sin(a * 1.3) * dl, y: A.y + cos(a * 1.3) * dl };
  const p = new Path2D();
  const r0 = 0.022 * h, r1 = 0.007 * h;
  const n0 = { x: -cos(a) , y: sin(a) };
  p.moveTo(A.x + n0.x * r0, A.y + n0.y * r0);
  p.quadraticCurveTo(B.x + n0.x * r0 * 0.7, B.y + n0.y * r0 * 0.7, E.x + n0.x * r1, E.y + n0.y * r1);
  p.arc(E.x, E.y, r1, Math.atan2(n0.y, n0.x), Math.atan2(n0.y, n0.x) + PI, false);
  p.quadraticCurveTo(B.x - n0.x * r0 * 0.6, B.y - n0.y * r0 * 0.6, A.x - n0.x * r0, A.y - n0.y * r0);
  p.closePath();
  m.ksztalt(p, tonC(st.kaptur, -0.3, CIEN.tkanina), (g) => {
    if (!m.bogato) return;
    bryla(g, p, h, [[r0 * 0.9, 'rgba(6,4,4,0.45)'], [-r0 * 0.3, 'rgba(255,236,206,0.1)']], SWB, 0.8);
  });
}

/** Włosy kopacza: ciemne (u starych brudnosiwe), zmierzwione, sterczące kosmykami, przyprószone kurzem. */
function wlosyKopacza(r: Rysunek): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const wl = mieszaj(st.wlosy, [70, 64, 60], st.stary ? 0.35 : 0.1);
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  // zewnętrzny brzeg: od karku przez czubek ku czołu, na przemian głębiej i dalej (kosmyki)
  const p = new Path2D();
  const n = 11, a0 = PI * 0.62, a1 = PI * 1.86;
  const start = P(-0.55, 0.44);
  p.moveTo(start.x, start.y);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t;
    const rr = (i % 2 ? 1.07 + 0.09 * los(id, 1600 + i) : 1.0) * (1 - 0.06 * Math.max(0, t - 0.8) * 5);
    const q = P(-0.12 + Math.cos(a) * 0.98 * rr, -0.12 + Math.sin(a) * 1.02 * rr);
    if (i % 2) p.lineTo(q.x, q.y);
    else p.quadraticCurveTo(q.x, q.y, q.x, q.y);
  }
  // linia włosów nad czołem i za uchem
  for (const [x, y] of [[0.6, -0.56], [0.36, -0.68], [0.12, -0.6], [-0.16, -0.44], [-0.38, -0.12], [-0.42, 0.24]] as const) { const q = P(x, y); p.lineTo(q.x, q.y); }
  p.closePath();
  m.ksztalt(p, tonC(wl, -0.06, CIEN.tkanina), (g) => {
    if (!m.bogato) { if (m.lod === 2) kreskaTuszu(g, p, h, 0.7); return; }
    g.save(); g.clip(p);
    g.lineWidth = Math.max(0.4, rg * 0.035);
    for (let k = 0; k < 2; k++) {
      g.strokeStyle = k ? tonC(wl, 0.3, CIEN.tkanina, 0.45) : 'rgba(6,4,4,0.5)';
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = a0 + (a1 - a0) * los(id, 1650 + i + k * 20), rr = 0.5 + 0.45 * los(id, 1700 + i + k * 20);
        const q0 = P(-0.12 + Math.cos(a) * rr, -0.12 + Math.sin(a) * rr), q1 = P(-0.12 + Math.cos(a + 0.18) * (rr + 0.4), -0.12 + Math.sin(a + 0.18) * (rr + 0.4));
        g.moveTo(q0.x, q0.y); g.quadraticCurveTo((q0.x + q1.x) / 2 + rg * 0.05, (q0.y + q1.y) / 2, q1.x, q1.y);
      }
      g.stroke();
    }
    if (m.bogato) { g.fillStyle = 'rgba(196,186,170,0.35)'; for (let i = 0; i < 16; i++) { const q = P(-0.9 + 1.4 * los(id, 1750 + i), -1.1 + 0.6 * los(id, 1770 + i)); g.fillRect(q.x, q.y, h * 0.0022, h * 0.0022); } }
    swiatlocien(g, p, [[rg * 0.3, 'rgba(4,2,2,0.5)'], [-rg * 0.08, 'rgba(255,236,206,0.14)'], warstwaTuszu(h, 0.8)], SW, undefined, true);
    g.restore();
  });
}

/**
 * Hełm robotnika — gdy nie zostaje ani jeden rycerz, kopacze wkładają żelazne garnki i stają do walki.
 * Okrągły, z nitowaną obręczą i krótką osłoną karku, poobijany i rdzawy; bez nosala i krzyża rycerskiego
 * hełmu, żeby z daleka nie mylić ich z rycerzami.
 */
function helmRobotnika(r: Rysunek, K: Kopacz): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const he = poGlowie(s, kat, [[-1.24, 0.46], [-1.26, -0.2], [-0.98, -0.9], [-0.32, -1.28], [0.4, -1.18], [0.94, -0.68], [1.16, -0.16], [1.2, -0.04], [0.4, -0.16], [-0.6, -0.08], [-0.86, 0.46]]);
  let styl: string | CanvasGradient = tonC(st.zelazo, -0.1, CIEN.metal);
  if (!m.prosto) {
    const a = P(0.5, -1.2), b = P(-1.0, 0.3);
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(st.zelazo, 0.16, CIEN.metal)); gr.addColorStop(0.45, tonC(st.zelazo, -0.1, CIEN.metal)); gr.addColorStop(1, tonC(st.zelazo, -0.5, CIEN.metal));
    styl = gr;
  }
  m.ksztalt(he, styl, (g) => {
    if (m.prosto) return;
    g.save(); g.clip(he);
    // obręcz u dołu i grzbiet od czoła ku karkowi
    linia(g, [P(-1.3, -0.12), P(0, -0.22), P(1.2, -0.1)], tonC(st.zelazo, -0.3, CIEN.metal), rg * 0.18);
    linia(g, [P(-1.3, -0.22), P(0, -0.32), P(1.2, -0.2)], 'rgba(4,4,8,0.55)', Math.max(0.5, rg * 0.035));
    linia(g, [P(0.75, -0.78), P(-0.2, -1.24), P(-0.95, -0.72)], 'rgba(255,248,232,0.4)', Math.max(0.4, rg * 0.04));
    if (m.lod === 2 && !m.bogato) swiatlocien(g, he, [[rg * 0.4, 'rgba(4,4,10,0.55)'], warstwaTuszu(h)], SW, undefined, true);
    if (m.bogato) {
      for (let i = 0; i < 5; i++) {
        const q = P(-1.0 + i * 0.5, -0.15);
        g.fillStyle = 'rgba(4,4,8,0.6)'; g.beginPath(); g.arc(q.x + rg * 0.01, q.y + rg * 0.012, rg * 0.035, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,248,232,0.5)'; g.beginPath(); g.arc(q.x - rg * 0.006, q.y - rg * 0.008, rg * 0.018, 0, TAU); g.fill();
      }
      // rdza i wgniecenie
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = 'rgba(176,98,54,0.5)';
      for (let i = 0; i < 4; i++) { const q = P(-0.9 + 1.6 * los(id, 740 + i), -1.0 + 0.8 * los(id, 750 + i)); g.beginPath(); g.ellipse(q.x, q.y, rg * (0.08 + 0.1 * los(id, 760 + i)), rg * 0.06, los(id, 770 + i) * PI, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      const q = P(-0.3 + 0.5 * los(id, 780), -0.8);
      const gr = g.createRadialGradient(q.x - rg * 0.04, q.y - rg * 0.05, 0, q.x, q.y, rg * 0.18);
      gr.addColorStop(0, 'rgba(6,6,10,0.42)'); gr.addColorStop(1, 'rgba(6,6,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, rg * 0.18, 0, TAU); g.fill();
      const w2: Warstwa[] = [[rg * 0.4, 'rgba(4,4,10,0.55)'], [rg * 0.12, 'rgba(4,4,10,0.45)'], ...cieplo(r, K, s.glowa, rg * 2), [-rg * 0.07, 'rgba(255,248,232,0.2)']];
      if (m.bogato) w2.push(warstwaKontr(h, 0.8));
      w2.push(warstwaTuszu(h));
      swiatlocien(g, he, w2, SW, undefined, true);
    }
    g.restore();
    if (m.lod === 2) kreskaTuszu(g, he, h);
  });
}
