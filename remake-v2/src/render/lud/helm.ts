import { CIEN, clamp, lerp, los, mieszaj, PI, sin, TAU, tonC, type Pkt, type Rgb } from './matma';
import { glowaProfil, konczyna, naGlowie, nos } from './malarz';
import { poswiata, type Rysunek } from './wspolne';
import { broda, poGlowie } from './robotnik';
import { bryla, klaks, kolcze, KREW, KREW_SUCHA, KREW_SWIEZA, rgba, rozbryzg, swiatlocien, SW, tonBryly, zaciek } from './tusz';

/**
 * Głowa krzyżowca (Remake v2): kolczy kaptur, a na nim hełm garnczkowy („głowa cukru”) z wizjerem,
 * listwami w kształcie krzyża, otworami oddechowymi, wgnieceniami i krwią — albo otwarty hełm z nosalem,
 * spod którego widać wymizerowaną twarz: oczy w cieniu ronda, blizna przez brew i policzek, strużka
 * krwi z czoła, zarost. Zdrajcy w wizjerze żarzy się czerwone oko.
 */

const BLASK = 'rgba(255,248,232,';
/** Zimny odblask od tyłu (kontrświatło na karku hełmu). */
const ODBLASK = { x: 0.94, y: 0.34 };

export function glowaKrzyzowca(r: Rysunek): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG;
  const zamkniety = los(c.id, 21) < 0.55;
  // szyja w kolczudze
  const szyja = konczyna(s.bark, 0.03 * h, s.glowa, 0.028 * h);
  m.ksztalt(szyja, tonBryly(m, st.kolczuga, -0.55, s.bark, s.glowa, 0.06 * h), (g) => kolcze(m, g, szyja, h, 0.06 * h, true));
  if (!zamkniety) twarzPodHelmem(r);
  // kolczy kaptur: głowa, kark i pelerynka na barkach; w otwartym hełmie odsłania twarz
  const pk: [number, number][] = zamkniety
    ? [[-1.0, -0.6], [-1.2, 0.3], [-1.2, 1.2], [-1.06, 1.84], [-0.4, 2.2], [0.5, 2.08], [1.02, 1.5], [0.98, 0.3], [0.4, -0.8], [-0.4, -1.0]]
    : [[-1.08, -0.5], [-1.22, 0.35], [-1.2, 1.2], [-1.06, 1.84], [-0.4, 2.2], [0.5, 2.08], [1.0, 1.5], [0.86, 1.12], [0.62, 1.0], [0.26, 0.86], [0.04, 0.4], [0.06, -0.3], [-0.4, -0.55]];
  const kaptur = poGlowie(s, kat, pk);
  m.ksztalt(kaptur, tonBryly(m, st.kolczuga, -0.3, naGlowie(s, kat, 0, -1), naGlowie(s, kat, -0.3, 2), s.rg * 2.2), (g) => kolcze(m, g, kaptur, h, s.rg * 1.6, false));
  if (zamkniety) helmGarnczkowy(r);
  else helmZNosalem(r);
}

/**
 * Hełm garnczkowy: „głowa cukru” (zaostrzony szczyt, płaski przód z grzbietem) albo beczkowy (płaski
 * wierzch z wieńcem nitów) — z numeru postaci. Wizjer, listwy w kształcie krzyża, otwory oddechowe.
 */
function helmGarnczkowy(r: Rysunek): void {
  const { m, s, st, h, c, czas } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const beczka = los(id, 26) < 0.5;
  const he = poGlowie(s, kat, beczka
    ? [[-1.02, 1.05], [-1.1, 0.3], [-1.1, -0.85], [-1.02, -1.12], [-0.6, -1.2], [0.3, -1.22], [0.98, -1.16], [1.1, -0.9], [1.14, 0.2], [1.12, 0.85], [0.96, 1.06], [0.1, 1.12]]
    : [[-1.0, 1.02], [-1.12, 0.3], [-1.08, -0.5], [-0.74, -1.12], [-0.18, -1.5], [0.06, -1.56], [0.62, -1.16], [1.0, -0.5], [1.12, 0.1], [1.1, 0.7], [0.94, 1.02], [0.1, 1.1]]);
  const k = st.helm;
  let styl: string | CanvasGradient = tonC(k, -0.08, CIEN.metal);
  if (!m.prosto) {
    const a = P(0.7, -1.25), b = P(-0.95, 1.05);
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(k, 0.16, CIEN.metal)); gr.addColorStop(0.35, tonC(k, -0.02, CIEN.metal));
    gr.addColorStop(0.72, tonC(k, -0.34, CIEN.metal)); gr.addColorStop(1, tonC(k, -0.52, CIEN.metal));
    styl = gr;
  }
  m.ksztalt(he, styl, (g) => {
    g.save();
    g.clip(he);
    // wizjer: ciemna szczelina z przodu
    const wz = new Path2D();
    const w0 = P(0.04, -0.31), w1 = P(1.4, -0.3), w2 = P(1.4, -0.17), w3 = P(0.06, -0.19);
    wz.moveTo(w0.x, w0.y); wz.lineTo(w1.x, w1.y); wz.lineTo(w2.x, w2.y); wz.lineTo(w3.x, w3.y);
    wz.quadraticCurveTo(P(-0.04, -0.25).x, P(-0.04, -0.25).y, w0.x, w0.y);
    g.fillStyle = 'rgba(4,3,3,0.97)'; g.fill(wz);
    if (st.bunt) {
      const o = P(0.86, -0.245);
      poswiata(g, o.x, o.y, rg * 0.9, [255, 40, 20], 0.35 + 0.12 * sin(czas * 0.005 + id));
      g.fillStyle = 'rgba(255,90,50,0.95)'; g.beginPath(); g.ellipse(o.x, o.y, rg * 0.07, rg * 0.035, kat, 0, TAU); g.fill();
    }
    if (m.prosto) { g.restore(); return; }
    // dolna warga wizjera łapie światło, nad nim listwa czołowa rzuca cień
    linia(g, [P(0.1, -0.165), P(0.8, -0.16), P(1.3, -0.155)], BLASK + '0.5)', Math.max(0.5, rg * 0.035));
    // listwa czołowa i pionowa listwa na przodzie — krzyż z blachy
    const li = new Path2D();
    const l0 = P(-1.2, -0.46), l1 = P(1.3, -0.44), l2 = P(1.3, -0.33), l3 = P(-1.2, -0.35);
    li.moveTo(l0.x, l0.y); li.quadraticCurveTo(P(0, -0.52).x, P(0, -0.52).y, l1.x, l1.y); li.lineTo(l2.x, l2.y);
    li.quadraticCurveTo(P(0, -0.41).x, P(0, -0.41).y, l3.x, l3.y); li.closePath();
    g.fillStyle = tonC(k, -0.02, CIEN.metal, 0.9); g.fill(li);
    linia(g, [P(-1.2, -0.345), P(0, -0.405), P(1.3, -0.325)], 'rgba(4,4,8,0.75)', Math.max(0.6, rg * 0.045));
    linia(g, [P(-1.2, -0.455), P(0, -0.515), P(1.3, -0.435)], BLASK + '0.3)', Math.max(0.4, rg * 0.025));
    // pionowa listwa wzdłuż dzioba: szeroka kreska po krawędzi (obcięta do hełmu — widać połowę)
    const front = beczka
      ? [P(1.0, -1.3), P(1.14, -0.9), P(1.17, 0.2), P(1.15, 0.85), P(0.97, 1.08)]
      : [P(0.06, -1.6), P(0.64, -1.2), P(1.03, -0.5), P(1.15, 0.1), P(1.13, 0.7), P(0.96, 1.04)];
    linia(g, front, tonC(k, 0.06, CIEN.metal), rg * 0.34);
    const wew = beczka
      ? [P(0.86, -1.18), P(0.98, -0.88), P(1.0, 0.2), P(0.98, 0.82), P(0.84, 1.02)]
      : [P(0.02, -1.44), P(0.54, -1.06), P(0.88, -0.46), P(0.98, 0.1), P(0.96, 0.68), P(0.82, 1.0)];
    linia(g, wew, 'rgba(4,4,8,0.6)', Math.max(0.5, rg * 0.04));
    if (beczka && m.lod === 2) {
      // wieniec nitów u góry: tu denko przykuto do boków
      linia(g, [P(-1.1, -0.9), P(0, -0.98), P(1.12, -0.92)], 'rgba(4,4,8,0.45)', Math.max(0.4, rg * 0.03));
      for (let i = 0; i < 6; i++) {
        const q = P(-0.95 + i * 0.4, -0.86 - 0.05 * Math.cos((i - 2.5) * 0.5));
        g.fillStyle = 'rgba(4,4,8,0.7)'; g.beginPath(); g.arc(q.x + rg * 0.01, q.y + rg * 0.012, rg * 0.032, 0, TAU); g.fill();
        g.fillStyle = BLASK + '0.55)'; g.beginPath(); g.arc(q.x - rg * 0.006, q.y - rg * 0.008, rg * 0.018, 0, TAU); g.fill();
      }
    }
    if (m.lod === 2) {
      // otwory oddechowe w kształcie krzyża
      const o = [[0, -0.2], [0, -0.1], [0, 0], [0, 0.1], [0, 0.2], [0, 0.3], [-0.1, 0], [-0.2, 0], [0.1, 0], [0.2, 0]];
      const dz = new Path2D(), wg = new Path2D(), ro = Math.max(0.45, rg * 0.032);
      for (const [dx, dy] of o) {
        const q = P(0.66 + dx, 0.36 + dy);
        dz.moveTo(q.x + ro, q.y); dz.arc(q.x, q.y, ro, 0, TAU);
        wg.moveTo(q.x + rg * 0.012 + ro * 0.5, q.y + rg * 0.028); wg.arc(q.x + rg * 0.012, q.y + rg * 0.028, ro * 0.5, 0, PI);
      }
      g.fillStyle = 'rgba(4,3,3,0.95)'; g.fill(dz);
      g.fillStyle = BLASK + '0.3)'; g.fill(wg);
      // nity na listwie
      for (let i = 0; i < 5; i++) {
        const q = P(-0.92 + i * 0.42, -0.4 - 0.04 * Math.cos((i - 2) * 0.5));
        g.fillStyle = 'rgba(4,4,8,0.7)'; g.beginPath(); g.arc(q.x + rg * 0.01, q.y + rg * 0.012, rg * 0.032, 0, TAU); g.fill();
        g.fillStyle = BLASK + '0.55)'; g.beginPath(); g.arc(q.x - rg * 0.006, q.y - rg * 0.008, rg * 0.018, 0, TAU); g.fill();
      }
      // wgniecenia i rysy po ciosach
      for (let i = 0; i < 2; i++) {
        const q = P(-0.75 + 1.0 * los(id, 400 + i), -1.0 + 0.5 * los(id, 410 + i) + i * 0.95);
        wgniecenie(g, q.x, q.y, rg * (0.13 + 0.07 * los(id, 415 + i)), los(id, 418 + i) * PI);
      }
      for (let i = 0; i < 4; i++) {
        const a = P(-0.8 + 1.5 * los(id, 420 + i), -0.9 + 1.7 * los(id, 430 + i)), dl = rg * (0.15 + 0.25 * los(id, 440 + i)), kk = -0.4 + 0.8 * los(id, 450 + i);
        g.strokeStyle = 'rgba(8,8,12,0.55)'; g.lineWidth = Math.max(0.4, rg * 0.022);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + Math.cos(kk) * dl, a.y + Math.sin(kk) * dl); g.stroke();
        g.strokeStyle = BLASK + '0.38)'; g.lineWidth = Math.max(0.3, rg * 0.014);
        g.beginPath(); g.moveTo(a.x, a.y + rg * 0.02); g.lineTo(a.x + Math.cos(kk) * dl, a.y + Math.sin(kk) * dl + rg * 0.02); g.stroke();
      }
    }
    // odbicie otoczenia w blasze: jaśniejszy pas u góry, ciemny horyzont poniżej wizjera
    if (m.lod === 2) {
      const a = P(0, -1.3), b = P(0, 1.0);
      const gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
      gr.addColorStop(0, BLASK + '0)'); gr.addColorStop(0.2, BLASK + '0.12)'); gr.addColorStop(0.42, BLASK + '0)');
      gr.addColorStop(0.55, 'rgba(4,4,8,0.28)'); gr.addColorStop(0.75, 'rgba(4,4,8,0.12)'); gr.addColorStop(1, 'rgba(60,40,30,0.1)');
      g.fillStyle = gr; g.fill(he);
    }
    // krew (z bliska): zaschnięta smuga z tyłu hełmu, strużka spod wizjera — z daleka wyglądałaby jak oko
    if (m.lod === 2) {
      const kb = P(-0.6 + 0.35 * los(id, 460), -0.6 + 0.4 * los(id, 461));
      g.save(); g.globalCompositeOperation = 'multiply';
      const kl = klaks(kb.x, kb.y, rg * 0.16, id + 17, 0, 8, 0.4, 1.8, kat + 0.4 + 0.5 * los(id, 462));
      g.fillStyle = rgba([132, 50, 44], 0.85); g.fill(kl);
      g.restore();
      zaciek(g, kb.x + rg * 0.05, kb.y + rg * 0.08, rg * (0.3 + 0.3 * los(id, 464)), rg * 0.03, KREW_SUCHA, 0.8, id, 465);
      if (los(id, 463) < 0.6) zaciek(g, P(0.95, -0.17).x, P(0.95, -0.17).y, rg * (0.45 + 0.3 * los(id, 466)), rg * 0.035, KREW, 0.85, id, 467);
    }
    // wypolerowany blask na krzywiźnie przodu i na grzbiecie dzioba
    const bl = beczka ? [P(0.62, -1.08), P(0.8, -0.7), P(0.86, -0.3), P(0.88, 0.2), P(0.82, 0.66)] : [P(0.36, -1.24), P(0.72, -0.82), P(0.86, -0.3), P(0.88, 0.2), P(0.8, 0.62)];
    linia(g, bl, BLASK + '0.28)', rg * 0.18);
    linia(g, bl.slice(0, 3), BLASK + '0.65)', rg * 0.055);
    linia(g, beczka ? [P(-0.6, -1.14), P(0.4, -1.17), P(0.98, -1.1)] : [P(0.6, -1.25), P(0.98, -0.7), P(1.12, -0.05)], BLASK + '0.35)', Math.max(0.4, rg * 0.03));
    // światłocień, zimny odblask na karku i tusz
    bryla(g, he, h, [[rg * 0.42, 'rgba(4,4,10,0.55)'], [rg * 0.13, 'rgba(4,4,10,0.5)'], [-rg * 0.07, BLASK + '0.2)'], [rg * 0.05, 'rgba(160,176,196,0.28)', undefined, ODBLASK]], SW, 1, 0, undefined, m.lod < 2, true);
    g.restore();
  });
}

/** Otwarty hełm stożkowy z nosalem (twarz rysuje `twarzPodHelmem`). */
function helmZNosalem(r: Rysunek): void {
  const { m, s, st, h, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const k = st.helm;
  const he = poGlowie(s, kat, [[-1.14, -0.22], [-1.14, -0.62], [-0.86, -1.18], [-0.3, -1.6], [-0.08, -1.7], [0.2, -1.56], [0.78, -1.1], [1.08, -0.62], [1.12, -0.24]]);
  let styl: string | CanvasGradient = tonC(k, -0.08, CIEN.metal);
  if (!m.prosto) {
    const a = P(0.6, -1.4), b = P(-1.0, -0.2);
    const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, tonC(k, 0.16, CIEN.metal)); gr.addColorStop(0.45, tonC(k, -0.08, CIEN.metal)); gr.addColorStop(1, tonC(k, -0.48, CIEN.metal));
    styl = gr;
  }
  m.ksztalt(he, styl, (g) => {
    if (m.prosto) return;
    g.save(); g.clip(he);
    // obręcz u dołu z nitami
    linia(g, [P(-1.2, -0.3), P(0, -0.36), P(1.2, -0.3)], tonC(k, -0.12, CIEN.metal), rg * 0.2);
    linia(g, [P(-1.2, -0.4), P(0, -0.46), P(1.2, -0.4)], 'rgba(4,4,8,0.6)', Math.max(0.5, rg * 0.035));
    if (m.lod === 2) {
      for (let i = 0; i < 5; i++) {
        const q = P(-0.84 + i * 0.42, -0.33);
        g.fillStyle = BLASK + '0.5)'; g.beginPath(); g.arc(q.x, q.y, rg * 0.022, 0, TAU); g.fill();
      }
      // grzbiet stożka: kucie z jednego kawałka, rysa i wgniecenie
      linia(g, [P(-0.12, -1.66), P(0.5, -1.2), P(0.9, -0.62)], BLASK + '0.45)', rg * 0.05);
      const q = P(-0.4 + 0.5 * los(id, 470), -1.0);
      wgniecenie(g, q.x, q.y, rg * 0.16, los(id, 471) * PI);
      const kb = P(0.2 + 0.4 * los(id, 472), -0.95);
      rozbryzg(g, kb.x, kb.y, rg * 0.1, PI * 0.7, id + 21, KREW_SUCHA, 0.8, m.lod, true);
    }
    bryla(g, he, h, [[rg * 0.4, 'rgba(4,4,10,0.55)'], [rg * 0.12, 'rgba(4,4,10,0.5)'], [-rg * 0.07, BLASK + '0.2)'], [rg * 0.05, 'rgba(160,176,196,0.26)', undefined, ODBLASK]], SW, 1, 0, undefined, m.lod < 2, true);
    g.restore();
  });
  // nosal
  const n0 = P(0.98, -0.42), n1 = P(1.07, 0.26);
  const ns = new Path2D();
  ns.moveTo(n0.x - rg * 0.07, n0.y); ns.lineTo(n0.x + rg * 0.12, n0.y);
  ns.lineTo(n1.x + rg * 0.06, n1.y); ns.quadraticCurveTo(n1.x, n1.y + rg * 0.06, n1.x - rg * 0.06, n1.y); ns.closePath();
  m.ksztalt(ns, tonC(k, -0.05, CIEN.metal), (g) => {
    if (m.prosto) return;
    if (m.lod === 2) bryla(g, ns, h, [[rg * 0.08, 'rgba(4,4,10,0.55)'], [-rg * 0.04, BLASK + '0.35)']], SW, 0.8);
  });
}

/** Twarz pod otwartym hełmem: wymizerowana, zarośnięta, oko w cieniu ronda, blizna, krew z czoła. */
function twarzPodHelmem(r: Rysunek): void {
  const { m, s, p, st, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  // skóra szarzeje ze zmęczenia i od kurzu
  const skora: Rgb = mieszaj(st.skora, [128, 118, 112], 0.45);
  const tw = glowaProfil(s, kat);
  m.ksztalt(tw, m.kula(s.glowa, rg, skora, false, 0, CIEN.skora), (g) => {
    const oko = P(0.58, -0.1);
    if (m.prosto) {
      g.fillStyle = 'rgba(20,10,8,0.95)'; g.fillRect(oko.x - rg * 0.14, oko.y - rg * 0.08, rg * 0.28, Math.max(0.8, rg * 0.16));
      return;
    }
    g.save(); g.clip(tw);
    // zapadnięty oczodół w cieniu łuku brwiowego
    g.fillStyle = 'rgba(28,14,14,0.55)';
    g.beginPath(); g.ellipse(oko.x - rg * 0.03, oko.y - rg * 0.02, rg * 0.3, rg * 0.19, kat - 0.1, 0, TAU); g.fill();
    // policzek: światło na kości, cień pod nią
    g.fillStyle = 'rgba(232,206,186,0.16)';
    g.beginPath(); g.ellipse(P(0.66, 0.16).x, P(0.66, 0.16).y, rg * 0.2, rg * 0.08, kat - 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(36,24,24,0.26)';
    g.beginPath(); g.ellipse(P(0.48, 0.42).x, P(0.48, 0.42).y, rg * 0.26, rg * 0.13, kat - 0.5, 0, TAU); g.fill();
    // oko: wąskie, zmęczone, z błyskiem
    const otw = clamp(p.oczy, 0, 1);
    if (otw > 0.25) {
      const wys = rg * 0.075 * otw;
      g.fillStyle = 'rgba(178,164,146,0.92)';
      g.beginPath(); g.ellipse(oko.x, oko.y, rg * 0.15, wys, kat, 0, TAU); g.fill();
      g.fillStyle = 'rgba(22,14,10,0.98)';
      g.beginPath(); g.arc(oko.x + rg * 0.06, oko.y, Math.min(rg * 0.065, wys * 1.1), 0, TAU); g.fill();
      if (m.lod === 2) { g.fillStyle = 'rgba(255,244,226,0.9)'; g.beginPath(); g.arc(oko.x + rg * 0.08, oko.y - rg * 0.02, Math.max(0.35, rg * 0.016), 0, TAU); g.fill(); }
      // ciężka powieka przykrywa górę oka
      g.strokeStyle = 'rgba(20,10,8,0.95)'; g.lineWidth = Math.max(0.6, rg * 0.07);
      g.beginPath(); g.ellipse(oko.x, oko.y + rg * 0.012, rg * 0.16, wys + rg * 0.012, kat, PI * 1.02, PI * 1.98); g.stroke();
      if (m.lod === 2) { g.lineWidth = Math.max(0.35, rg * 0.025); g.strokeStyle = 'rgba(40,20,16,0.7)'; g.beginPath(); g.ellipse(oko.x, oko.y + rg * 0.05, rg * 0.15, rg * 0.06, kat, PI * 0.15, PI * 0.85); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(20,10,8,0.95)'; g.lineWidth = Math.max(0.6, rg * 0.06);
      g.beginPath(); g.moveTo(oko.x - rg * 0.14, oko.y); g.quadraticCurveTo(oko.x, oko.y + rg * 0.05, oko.x + rg * 0.15, oko.y); g.stroke();
    }
    // brew: nisko, ściągnięta
    const w = p.wysilek;
    linia(g, [P(0.34, -0.3 + w * 0.04), P(0.6, -0.33 + w * 0.08), P(0.86, -0.24 + w * 0.08)], 'rgba(30,18,14,0.92)', Math.max(0.7, rg * 0.085));
    // bruzda od nosa ku kącikowi ust i usta zaciśnięte w kreskę
    linia(g, [P(0.86, 0.3), P(0.78, 0.45), P(0.74, 0.58)], 'rgba(40,22,18,0.45)', Math.max(0.4, rg * 0.035));
    if (p.usta > 0.15) {
      g.fillStyle = 'rgba(30,10,8,0.95)'; const u = P(0.84, 0.64);
      g.beginPath(); g.ellipse(u.x, u.y, rg * 0.08, rg * (0.035 + 0.1 * p.usta), kat, 0, TAU); g.fill();
    } else linia(g, [P(0.7, 0.64), P(0.82, 0.62), P(0.95, 0.6)], 'rgba(60,24,20,0.9)', Math.max(0.5, rg * 0.05));
    // kilkudniowy zarost
    if (m.lod === 2) {
      g.fillStyle = 'rgba(26,20,18,0.42)';
      for (let i = 0; i < 70; i++) {
        const q = P(0.22 + 0.76 * los(id, 800 + i), 0.4 + 0.52 * los(id, 880 + i));
        if (q.y < P(0.5, 0.48).y && los(id, 960 + i) < 0.5) continue;
        g.fillRect(q.x, q.y, Math.max(0.5, rg * 0.022), Math.max(0.5, rg * 0.022));
      }
    }
    // blizna przez brew i policzek: jasna krecha z ciemnymi brzegami, szwy
    const b0 = P(0.42, -0.58), bc = P(0.7, -0.08), b1 = P(0.8, 0.44);
    linia(g, [b0, bc, b1], 'rgba(70,30,26,0.6)', Math.max(0.8, rg * 0.11));
    linia(g, [b0, bc, b1], 'rgba(214,176,160,0.75)', Math.max(0.45, rg * 0.045));
    if (m.lod === 2) {
      g.strokeStyle = 'rgba(30,14,12,0.65)'; g.lineWidth = Math.max(0.35, rg * 0.03);
      for (let i = 1; i < 5; i++) {
        const t = i / 5, q = { x: lerp(lerp(b0.x, bc.x, t), lerp(bc.x, b1.x, t), t), y: lerp(lerp(b0.y, bc.y, t), lerp(bc.y, b1.y, t), t) };
        g.beginPath(); g.moveTo(q.x - rg * 0.07, q.y + rg * 0.03); g.lineTo(q.x + rg * 0.07, q.y - rg * 0.03); g.stroke();
      }
    }
    // krew spod hełmu: strużka po skroni i czole, obok oka, w dół policzka; brud
    const k0 = P(0.5, -0.42), k1 = P(0.44, -0.1), k2 = P(0.5, 0.3), k3 = P(0.46, 0.62);
    g.lineCap = 'round';
    linia(g, [k0, k1, k2], rgba(KREW_SWIEZA, 0.9), Math.max(0.6, rg * 0.07));
    linia(g, [k2, k3], rgba(KREW_SWIEZA, 0.75), Math.max(0.45, rg * 0.045));
    g.fillStyle = rgba(KREW_SWIEZA, 0.9); g.beginPath(); g.arc(k3.x, k3.y, Math.max(0.5, rg * 0.04), 0, TAU); g.fill();
    g.fillStyle = rgba(KREW_SUCHA, 0.32);
    g.beginPath(); g.ellipse(P(0.36, 0.3).x, P(0.36, 0.3).y, rg * 0.16, rg * 0.24, kat + 0.3, 0, TAU); g.fill();
    // cień ronda hełmu na czole i oczach
    const a = P(0.3, -0.5), b = P(0.3, 0.12);
    const cg = g.createLinearGradient(a.x, a.y, b.x, b.y);
    cg.addColorStop(0, 'rgba(6,4,4,0.92)'); cg.addColorStop(0.45, 'rgba(6,4,4,0.48)'); cg.addColorStop(1, 'rgba(6,4,4,0)');
    g.fillStyle = cg; g.fill(tw);
    swiatlocien(g, tw, [[rg * 0.32, 'rgba(26,18,20,0.4)'], [-rg * 0.06, 'rgba(255,230,200,0.12)']], SW, undefined, true);
    g.restore();
    if (st.broda) broda(g, s, kat, st.broda, mieszaj(st.wlosy, [20, 16, 14], 0.3), m.lod);
  });
  const ns = nos(s, kat, 1.05);
  m.ksztalt(ns, m.kula(P(1.05, 0.15), rg * 0.3, skora, false, 0, CIEN.skora), (g) => {
    if (m.lod === 2) swiatlocien(g, ns, [[rg * 0.08, 'rgba(26,16,16,0.4)']]);
  });
}

// ------------------------------------------------------------------ drobiazgi

/** Gładka linia przez punkty (krzywe przez środki odcinków). */
function linia(g: CanvasRenderingContext2D, pk: Pkt[], styl: string, szer: number): void {
  g.strokeStyle = styl; g.lineWidth = szer; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pk[0].x, pk[0].y);
  if (pk.length === 2) g.lineTo(pk[1].x, pk[1].y);
  else {
    for (let i = 1; i < pk.length - 1; i++) g.quadraticCurveTo(pk[i].x, pk[i].y, (pk[i].x + pk[i + 1].x) / 2, (pk[i].y + pk[i + 1].y) / 2);
    g.lineTo(pk[pk.length - 1].x, pk[pk.length - 1].y);
  }
  g.stroke();
}

/** Wgniecenie w blasze: płytkie zagłębienie (cień od strony światła) i odblask na przeciwległym brzegu. */
function wgniecenie(g: CanvasRenderingContext2D, x: number, y: number, r: number, kat: number): void {
  const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.3, 0, x, y, r);
  gr.addColorStop(0, 'rgba(6,6,10,0.42)'); gr.addColorStop(0.7, 'rgba(6,6,10,0.18)'); gr.addColorStop(1, 'rgba(6,6,10,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.7, kat, 0, TAU); g.fill();
  g.strokeStyle = BLASK + '0.35)'; g.lineWidth = Math.max(0.4, r * 0.12);
  g.beginPath(); g.ellipse(x, y, r * 0.8, r * 0.55, kat, 0.2, 1.9); g.stroke();
}
