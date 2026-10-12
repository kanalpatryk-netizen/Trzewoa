import { CIEN, clamp, lerp, los, mieszaj, PI, TAU, tonC, type Pkt, type Rgb } from './matma';
import { glowaProfil, naGlowie, nos } from './malarz';
import type { Szkielet } from './szkielet';
import type { Rysunek } from './wspolne';
import { KREW_SUCHA, KREW_SWIEZA, rgba, swiatlocien, SW } from './tusz';

/**
 * Mroczna twarz z profilu (Remake v2) — dla rycerza w otwartym hełmie i dla kopacza w kapturze:
 * wymizerowana, z zapadniętym okiem w cieniu ronda albo kaptura, kilkudniowym zarostem; do wyboru blizna
 * ze szwami, strużka krwi spod hełmu, smugi sadzy i ciepłe światło lampki od dołu na policzku i żuchwie.
 * Szaleństwo z głębokości gasi oczy (pusty oczodół z iskrą), strach unosi brwi.
 */
export interface OpcjeTwarzy {
  /** skóra, już przygaszona przez rolę */
  skora: Rgb;
  /** cień ronda hełmu albo kaptura na czole i oczach: 0 — brak, 1 — głęboki */
  cien: number;
  blizna?: boolean;
  /** strużka krwi spod hełmu */
  krew?: boolean;
  /** smugi sadzy i kurzu z kopania */
  sadza?: boolean;
  /** skąd świeci lampka (ciepło od dołu) i jak mocno 0..1 */
  lampa?: Pkt | null;
  lampaSila?: number;
}

export function twarzMroczna(r: Rysunek, o: OpcjeTwarzy): void {
  const { m, s, p, st, c } = r;
  const kat = s.katG, rg = s.rg, id = c.id;
  const P = (dx: number, dy: number): Pkt => naGlowie(s, kat, dx, dy);
  const skora = o.skora;
  const tw = glowaProfil(s, kat);
  const puste = st.szalenstwo > 0.45 ? st.szalenstwo : 0, strach = Math.max(0, st.strach - 0.3) * 1.4;
  m.ksztalt(tw, m.kula(s.glowa, rg, skora, false, 0, CIEN.skora), (g) => {
    const oko = P(0.58, -0.1);
    if (m.prosto) {
      g.fillStyle = 'rgba(20,10,8,0.95)'; g.fillRect(oko.x - rg * 0.14, oko.y - rg * 0.08, rg * 0.28, Math.max(0.8, rg * 0.16));
      return;
    }
    if (!m.bogato) {
      // z daleka i ze średniej odległości: cień ronda albo kaptura, oko, brew (i krew) — bez obcinania i drobiazgów
      if (o.cien > 0) {
        const a = P(0.3, -0.5), b = P(0.3, 0.12);
        const cg = g.createLinearGradient(a.x, a.y, b.x, b.y);
        cg.addColorStop(0, `rgba(6,4,4,${0.92 * o.cien})`); cg.addColorStop(1, 'rgba(6,4,4,0)');
        g.fillStyle = cg; g.fill(tw);
      }
      g.fillStyle = puste >= 0.5 ? 'rgba(10,4,4,0.98)' : 'rgba(22,12,10,0.95)';
      g.beginPath(); g.ellipse(oko.x, oko.y, rg * 0.15, rg * 0.07 * clamp(p.oczy, 0.3, 1), kat, 0, TAU); g.fill();
      linia(g, [P(0.34, -0.3), P(0.6, -0.33), P(0.86, -0.24)], 'rgba(30,18,14,0.9)', Math.max(0.6, rg * 0.085));
      if (o.krew) linia(g, [P(0.5, -0.42), P(0.44, -0.1), P(0.5, 0.3), P(0.46, 0.62)], rgba(KREW_SWIEZA, 0.85), Math.max(0.6, rg * 0.07));
      if (st.broda) brodaMroczna(g, s, kat, st.broda, mieszaj(st.wlosy, [20, 16, 14], 0.3), m.lod, id);
      return;
    }
    g.save(); g.clip(tw);
    // ciepło lampki od dołu: policzek, żuchwa, spód nosa
    if (o.lampa && (o.lampaSila ?? 0) > 0.02) {
      const lp = o.lampa, rr = rg * 2.6;
      const gr = g.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, Math.hypot(lp.x - s.glowa.x, lp.y - s.glowa.y) + rr * 0.6);
      gr.addColorStop(0, `rgba(255,170,96,${0.5 * o.lampaSila!})`); gr.addColorStop(0.75, `rgba(255,150,80,${0.22 * o.lampaSila!})`); gr.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = gr; g.fill(tw);
    }
    // zapadnięty oczodół w cieniu łuku brwiowego, światło na kości policzkowej, zapadnięty policzek pod nią
    plamka(g, oko.x - rg * 0.03, oko.y - rg * 0.02, rg * 0.32, rg * 0.21, kat - 0.1, [28, 14, 14], 0.55 + 0.2 * puste);
    plamka(g, P(0.66, 0.16).x, P(0.66, 0.16).y, rg * 0.24, rg * 0.1, kat - 0.3, [232, 206, 186], 0.18);
    plamka(g, P(0.46, 0.44).x, P(0.46, 0.44).y, rg * 0.3, rg * 0.16, kat - 0.5, [36, 24, 24], 0.32);
    // oko: wąskie, zmęczone, z błyskiem (ciepłym, gdy lampka blisko); szaleniec — pusty oczodół z iskrą
    const otw = clamp(p.oczy * (1 + strach * 0.35), 0, 1.3);
    if (puste >= 0.5 && otw > 0.25) {
      g.fillStyle = 'rgba(10,4,4,0.98)';
      g.beginPath(); g.ellipse(oko.x, oko.y, rg * 0.17, rg * 0.09, kat, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,214,170,${0.5 + 0.4 * puste})`;
      g.beginPath(); g.arc(oko.x + rg * 0.05, oko.y, Math.max(0.4, rg * 0.03), 0, TAU); g.fill();
    } else if (otw > 0.25) {
      const wys = rg * 0.075 * otw;
      g.fillStyle = 'rgba(178,164,146,0.92)';
      g.beginPath(); g.ellipse(oko.x, oko.y, rg * 0.15, wys, kat, 0, TAU); g.fill();
      g.fillStyle = 'rgba(22,14,10,0.98)';
      g.beginPath(); g.arc(oko.x + rg * 0.06, oko.y, Math.min(rg * 0.065, wys * 1.1), 0, TAU); g.fill();
      if (m.lod === 2) { g.fillStyle = o.lampa ? 'rgba(255,214,160,0.95)' : 'rgba(255,244,226,0.9)'; g.beginPath(); g.arc(oko.x + rg * 0.08, oko.y - rg * 0.02, Math.max(0.35, rg * 0.016), 0, TAU); g.fill(); }
      // ciężka powieka przykrywa górę oka
      g.strokeStyle = 'rgba(20,10,8,0.95)'; g.lineWidth = Math.max(0.6, rg * 0.07);
      g.beginPath(); g.ellipse(oko.x, oko.y + rg * 0.012, rg * 0.16, wys + rg * 0.012, kat, PI * 1.02, PI * 1.98); g.stroke();
      if (m.lod === 2) { g.lineWidth = Math.max(0.35, rg * 0.025); g.strokeStyle = 'rgba(40,20,16,0.7)'; g.beginPath(); g.ellipse(oko.x, oko.y + rg * 0.05, rg * 0.15, rg * 0.06, kat, PI * 0.15, PI * 0.85); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(20,10,8,0.95)'; g.lineWidth = Math.max(0.6, rg * 0.06);
      g.beginPath(); g.moveTo(oko.x - rg * 0.14, oko.y); g.quadraticCurveTo(oko.x, oko.y + rg * 0.05, oko.x + rg * 0.15, oko.y); g.stroke();
    }
    // brew: nisko i ściągnięta; strach unosi ją nad nosem
    const w = p.wysilek;
    linia(g, [P(0.34, -0.3 + w * 0.04 - strach * 0.04), P(0.6, -0.33 + w * 0.08 - strach * 0.1), P(0.86, -0.24 + w * 0.08 - strach * 0.14)], 'rgba(30,18,14,0.92)', Math.max(0.7, rg * 0.085));
    // bruzda od nosa ku kącikowi ust i usta zaciśnięte w kreskę (albo otwarte z wysiłku)
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
    // smugi sadzy i kurzu: starte rękawem czoło, brud na policzku i przy nosie
    if (o.sadza) {
      for (let i = 0; i < 3; i++) {
        const q = P(0.3 + 0.5 * los(id, 1040 + i), -0.4 + 0.9 * los(id, 1050 + i));
        plamka(g, q.x, q.y, rg * (0.16 + 0.14 * los(id, 1060 + i)), rg * 0.07, kat + 0.3 + los(id, 1070 + i), [30, 24, 20], 0.38);
      }
      if (m.lod === 2) {
        g.strokeStyle = 'rgba(30,24,20,0.35)'; g.lineWidth = Math.max(0.4, rg * 0.03);
        g.beginPath(); g.moveTo(P(0.4, -0.5).x, P(0.4, -0.5).y); g.quadraticCurveTo(P(0.62, -0.62).x, P(0.62, -0.62).y, P(0.86, -0.5).x, P(0.86, -0.5).y); g.stroke();
      }
    }
    // blizna przez brew i policzek: jasna krecha z ciemnymi brzegami, szwy
    if (o.blizna) {
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
    }
    // krew spod hełmu: strużka po skroni i czole, obok oka, w dół policzka
    if (o.krew) {
      const k0 = P(0.5, -0.42), k1 = P(0.44, -0.1), k2 = P(0.5, 0.3), k3 = P(0.46, 0.62);
      g.lineCap = 'round';
      linia(g, [k0, k1, k2], rgba(KREW_SWIEZA, 0.9), Math.max(0.6, rg * 0.07));
      linia(g, [k2, k3], rgba(KREW_SWIEZA, 0.75), Math.max(0.45, rg * 0.045));
      g.fillStyle = rgba(KREW_SWIEZA, 0.9); g.beginPath(); g.arc(k3.x, k3.y, Math.max(0.5, rg * 0.04), 0, TAU); g.fill();
      g.fillStyle = rgba(KREW_SUCHA, 0.32);
      g.beginPath(); g.ellipse(P(0.36, 0.3).x, P(0.36, 0.3).y, rg * 0.16, rg * 0.24, kat + 0.3, 0, TAU); g.fill();
    }
    // cień ronda hełmu albo kaptura na czole i oczach
    if (o.cien > 0) {
      const a = P(0.3, -0.5), b = P(0.3, 0.12);
      const cg = g.createLinearGradient(a.x, a.y, b.x, b.y);
      cg.addColorStop(0, `rgba(6,4,4,${0.92 * o.cien})`); cg.addColorStop(0.45, `rgba(6,4,4,${0.48 * o.cien})`); cg.addColorStop(1, 'rgba(6,4,4,0)');
      g.fillStyle = cg; g.fill(tw);
    }
    swiatlocien(g, tw, [[rg * 0.32, 'rgba(26,18,20,0.4)'], [-rg * 0.06, 'rgba(255,230,200,0.12)']], SW, undefined, true);
    g.restore();
    if (st.broda) brodaMroczna(g, s, kat, st.broda, mieszaj(st.wlosy, [20, 16, 14], 0.3), m.lod, id);
  });
  const ns = nos(s, kat, 1.05);
  m.ksztalt(ns, m.kula(P(1.05, 0.15), rg * 0.3, skora, false, 0, CIEN.skora), (g) => {
    if (m.lod === 2) swiatlocien(g, ns, [[rg * 0.08, 'rgba(26,16,16,0.4)']]);
  });
}

/** Miękka plama (eliptyczny gradient od środka) — cień oczodołu, zapadnięty policzek, smuga sadzy. */
function plamka(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, kat: number, kol: Rgb, alfa: number): void {
  g.save();
  g.translate(x, y); g.rotate(kat); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(${kol[0]},${kol[1]},${kol[2]},${alfa})`); gr.addColorStop(0.55, `rgba(${kol[0]},${kol[1]},${kol[2]},${alfa * 0.6})`); gr.addColorStop(1, `rgba(${kol[0]},${kol[1]},${kol[2]},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

/**
 * Broda w mrocznym stylu: ciemna masa z poszarpanym brzegiem, z bliska kosmyki w różne strony (nie równe pasma
 * jak na ikonie), cień pod żuchwą. 1 — wąsy, 2 — pełna, 3 — krótka przy żuchwie.
 */
export function brodaMroczna(g: CanvasRenderingContext2D, s: Szkielet, kat: number, typ: number, wlosy: Rgb, lod: number, id: number): void {
  const pk: [number, number][] = typ === 1
    ? [[0.66, 0.5], [0.98, 0.44], [1.03, 0.56], [0.92, 0.62], [0.8, 0.57], [0.68, 0.64], [0.6, 0.57]]
    : typ === 2
      ? [[-0.12, 0.05], [0.02, 0.42], [0.42, 0.6], [0.7, 0.55], [0.96, 0.46], [1.04, 0.62], [1.0, 0.92], [0.86, 1.18], [0.74, 1.32], [0.6, 1.2], [0.46, 1.26], [0.3, 1.08], [0.12, 0.96], [-0.06, 0.62]]
      : [[-0.08, 0.2], [0.1, 0.5], [0.5, 0.66], [0.95, 0.66], [0.96, 0.84], [0.82, 0.98], [0.66, 1.06], [0.5, 0.98], [0.32, 1.0], [0.16, 0.86], [0.0, 0.62]];
  const p = poGlowie(s, kat, pk);
  g.fillStyle = tonC(wlosy, -0.1, CIEN.tkanina, 0.94); g.fill(p);
  if (lod < 2) return;
  g.save(); g.clip(p);
  // kosmyki: krótkie, lekko zagięte pociągnięcia jaśniejszym i ciemniejszym tonem
  const n = typ === 2 ? 34 : typ === 3 ? 22 : 8;
  for (let k = 0; k < 2; k++) {
    g.strokeStyle = k ? tonC(wlosy, 0.32, CIEN.tkanina, 0.5) : 'rgba(6,4,4,0.5)'; g.lineWidth = Math.max(0.35, s.rg * (k ? 0.022 : 0.03));
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const u = los(id, 1200 + i + k * 50), v = los(id, 1300 + i + k * 50);
      const x0 = typ === 1 ? 0.62 + 0.4 * u : 0.0 + 1.0 * u, y0 = typ === 1 ? 0.46 + 0.14 * v : 0.4 + (typ === 2 ? 0.8 : 0.5) * v;
      const a = naGlowie(s, kat, x0, y0), b = naGlowie(s, kat, x0 + 0.05 * (los(id, 1400 + i) - 0.3), y0 + 0.14 + 0.08 * los(id, 1450 + i));
      g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2 + s.rg * 0.04, (a.y + b.y) / 2, b.x, b.y);
    }
    g.stroke();
  }
  // cień pod nosem i nad szyją
  const sp = naGlowie(s, kat, 0.4, 1.0), gr = g.createLinearGradient(sp.x, sp.y - s.rg * 0.5, sp.x, sp.y + s.rg * 0.3);
  gr.addColorStop(0, 'rgba(6,4,4,0)'); gr.addColorStop(1, 'rgba(6,4,4,0.45)');
  g.fillStyle = gr; g.fill(p);
  g.restore();
  // usta w brodzie
  const u1 = naGlowie(s, kat, 0.74, 0.64), u2 = naGlowie(s, kat, 0.95, 0.6);
  g.strokeStyle = 'rgba(40,14,10,0.9)'; g.lineWidth = Math.max(0.5, s.rg * 0.06);
  g.beginPath(); g.moveTo(u1.x, u1.y); g.lineTo(u2.x, u2.y); g.stroke();
}

/** Gładka linia przez punkty (krzywe przez środki odcinków). */
export function linia(g: CanvasRenderingContext2D, pk: Pkt[], styl: string, szer: number): void {
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

/** Broda: 1 — wąsy, 2 — pełna broda, 3 — krótka broda przy żuchwie. Usta zostają widoczne. */
export function broda(g: CanvasRenderingContext2D, s: Szkielet, kat: number, typ: number, wlosy: readonly [number, number, number], lod: number): void {
  g.fillStyle = tonC(wlosy, 0, CIEN.tkanina, 0.95);
  if (typ === 1) {
    g.fill(poGlowie(s, kat, [[0.66, 0.5], [0.98, 0.44], [1.03, 0.56], [0.92, 0.62], [0.8, 0.57], [0.68, 0.64], [0.6, 0.57]]));
    return;
  }
  const pk: [number, number][] = typ === 2
    ? [[-0.12, 0.05], [0.02, 0.42], [0.42, 0.6], [0.7, 0.55], [0.96, 0.46], [1.03, 0.6], [0.98, 0.92], [0.78, 1.28], [0.5, 1.22], [0.2, 0.98], [-0.06, 0.62]]
    : [[-0.08, 0.2], [0.1, 0.5], [0.5, 0.66], [0.94, 0.68], [0.92, 0.88], [0.6, 1.02], [0.24, 0.9], [0.0, 0.62]];
  g.fill(poGlowie(s, kat, pk));
  if (lod === 2) {
    // pasma brody jak na ikonie: równoległe pociągnięcia jaśniejszym tonem
    g.strokeStyle = tonC(wlosy, 0.35, CIEN.tkanina, 0.5); g.lineWidth = Math.max(0.4, s.rg * 0.04);
    g.beginPath();
    const n = typ === 2 ? 4 : 3, dl = typ === 2 ? 0.5 : 0.25;
    for (let i = 0; i < n; i++) {
      const a = naGlowie(s, kat, 0.25 + i * 0.17, 0.66), b = naGlowie(s, kat, 0.22 + i * 0.16, 0.66 + dl);
      g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    }
    g.stroke();
  }
  // usta w brodzie
  const u1 = naGlowie(s, kat, 0.74, 0.64), u2 = naGlowie(s, kat, 0.95, 0.6);
  g.strokeStyle = 'rgba(60,18,12,0.9)'; g.lineWidth = Math.max(0.5, s.rg * 0.06);
  g.beginPath(); g.moveTo(u1.x, u1.y); g.lineTo(u2.x, u2.y); g.stroke();
}

/** Ścieżka w układzie głowy (punkty w promieniach głowy). */
export function poGlowie(s: Szkielet, kat: number, pk: [number, number][], krzywe = true): Path2D {
  const p = new Path2D();
  const P = pk.map(([dx, dy]) => naGlowie(s, kat, dx, dy));
  p.moveTo(P[0].x, P[0].y);
  if (!krzywe) for (let i = 1; i < P.length; i++) p.lineTo(P[i].x, P[i].y);
  else {
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2;
      p.quadraticCurveTo(P[i].x, P[i].y, mx, my);
    }
    p.lineTo(P[P.length - 1].x, P[P.length - 1].y);
  }
  p.closePath();
  return p;
}
