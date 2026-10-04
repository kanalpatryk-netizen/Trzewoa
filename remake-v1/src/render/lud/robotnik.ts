import { cos, PI, sin, TAU, ton } from './matma';
import { glowaProfil, kolo, konczyna, naGlowie, nos, twarz } from './malarz';
import { gradTulowia, grzyb, kilof, mlotek, noga, odpryski, reka, tulowSciezka, type Rysunek } from './wspolne';
import { uderzenie } from './pamiec';
import type { Szkielet } from './szkielet';

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

export function rysujRobotnika(r: Rysunek): void {
  const { m, s, tryb, st, h, c, pm, czas } = r;
  const wRekach = tryb.narzedzie !== null;
  const krok = sin(pm.faza * TAU * 2);

  // ---- na plecach: worek albo kilof
  if (c.carry > 0) {
    const dx = -0.11 * h + pm.worek.a * 0.03 * h, dy = 0.07 * h - Math.abs(krok) * 0.012 * h;
    const tx = sin(s.katT), ty = -cos(s.katT);
    const wx = s.bark.x + dx * cos(s.katT) - 0.02 * h * tx, wy = s.bark.y + dy + dx * sin(s.katT) - 0.02 * h * ty;
    const w = new Path2D();
    w.ellipse(wx, wy, 0.088 * h, 0.105 * h, -0.25 + pm.worek.a * 0.4, 0, TAU);
    m.ksztalt(w, m.plaszczyzna(wx + 0.06 * h, wy - 0.1 * h, wx - 0.05 * h, wy + 0.1 * h, [164, 132, 86]), (g) => {
      if (m.prosto) return;
      if (m.lod === 2) {
        g.save(); g.clip(w);
        g.strokeStyle = 'rgba(90,66,40,0.35)'; g.lineWidth = Math.max(0.4, h * 0.004);
        for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(wx + i * h * 0.016, wy - h * 0.12); g.lineTo(wx + i * h * 0.016 + h * 0.02, wy + h * 0.12); g.stroke(); }
        g.restore();
      }
      g.strokeStyle = 'rgba(70,50,30,0.6)'; g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.moveTo(wx - 0.06 * h, wy + 0.02 * h); g.quadraticCurveTo(wx, wy + 0.05 * h, wx + 0.055 * h, wy + 0.0 * h); g.stroke();
      // grzyby wystają z worka
      grzyb(g, wx - 0.01 * h, wy - 0.085 * h, h * 1.1, m.lod);
      grzyb(g, wx + 0.035 * h, wy - 0.075 * h, h * 0.8, m.lod);
    });
  } else if (!wRekach) {
    // kilof przewieszony przez plecy: trzonek ukośnie, obuch nad dalszym barkiem, za głową
    const bx = s.biodro.x - 0.075 * h, by = s.biodro.y - 0.02 * h;
    kilof(m, bx, by, PI + 0.42 + pm.worek.a * 0.15, h * 0.88, st);
  }

  // ---- dalsza ręka (koszula, podwinięty rękaw) i noga
  const dlonBPiesc = tryb.oburacz;
  if (!tryb.oburacz) reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ramie: st.koszula, przed: st.skora, dlon: st.skora, rekaw: 1.08 });
  noga(r, s.kolB, s.stB, true, { udo: st.spodnie, golen: st.spodnie, but: st.buty, cholewka: 0.065 });

  // ---- tułów: koszula, kamizelka, pas, rzemień worka
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const Q = (u: number, f: number): [number, number] => [s.biodro.x + tx * u * L + fx * f * h, s.biodro.y + ty * u * L + fy * f * h];
  m.ksztalt(tulowSciezka(s, h, 0.088, 0.072, 1.05, 1.08), gradTulowia(m, s, h, st.koszula));
  // kamizelka: ten sam kształt, z przodem cofniętym do linii guzików — koszula widać z przodu
  m.ksztalt(tulowSciezka(s, h, 0.088, 0.072, 1.05, 1.08, 0.3), m.plaszczyzna(...Q(1, 0.04), ...Q(0, -0.08), st.kamizelka), (g) => {
    if (m.lod > 0) {
      // kieszeń i guziki
      const [px, py] = Q(0.42, -0.02);
      g.strokeStyle = ton(st.kamizelka, -0.5, 0.8); g.lineWidth = Math.max(0.5, h * 0.007);
      g.strokeRect(px - 0.02 * h, py - 0.012 * h, 0.04 * h, 0.03 * h);
      g.fillStyle = ton([214, 176, 92]);
      for (const u of [0.35, 0.6, 0.85]) { const [bx, by] = Q(u, 0.016); g.beginPath(); g.arc(bx, by, Math.max(0.5, h * 0.006), 0, TAU); g.fill(); }
    }
    // pas z klamrą — od pleców do brzucha, w obrysie tułowia
    const [p1x, p1y] = Q(0.1, -0.068), [p2x, p2y] = Q(0.1, 0.071);
    g.strokeStyle = ton([58, 38, 24]); g.lineWidth = Math.max(1, h * 0.03); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(p1x, p1y); g.lineTo(p2x, p2y); g.stroke(); g.lineCap = 'round';
    const [kx, ky] = Q(0.1, 0.05);
    g.fillStyle = ton([222, 186, 96]); g.fillRect(kx - h * 0.012, ky - h * 0.013, h * 0.024, h * 0.026);
    if (m.lod > 0) { g.fillStyle = ton([58, 38, 24]); g.fillRect(kx - h * 0.006, ky - h * 0.007, h * 0.012, h * 0.014); }
    // rzemień worka przez pierś
    if (c.carry > 0) {
      const [a1x, a1y] = Q(0.98, -0.05), [a2x, a2y] = Q(0.22, 0.06);
      g.strokeStyle = ton([96, 64, 40]); g.lineWidth = Math.max(0.9, h * 0.016);
      g.beginPath(); g.moveTo(a1x, a1y); g.lineTo(a2x, a2y); g.stroke();
    }
  });

  // ---- bliższa noga z łatą na kolanie
  noga(r, s.kolA, s.stA, false, { udo: st.spodnie, golen: st.spodnie, but: st.buty, cholewka: 0.065 });
  if (st.latka && m.lod > 0) {
    m.szczegol((g) => {
      const k = s.kolA, a = Math.atan2(s.stA.kostka.y - k.y, s.stA.kostka.x - k.x);
      g.save(); g.translate(k.x, k.y); g.rotate(a);
      g.fillStyle = ton(st.spodnie, 0.18);
      g.fillRect(0.005 * h, -0.032 * h, 0.05 * h, 0.05 * h);
      if (m.lod === 2) { g.setLineDash([h * 0.006, h * 0.005]); g.strokeStyle = ton(st.spodnie, -0.45); g.lineWidth = Math.max(0.4, h * 0.004); g.strokeRect(0.008 * h, -0.029 * h, 0.044 * h, 0.044 * h); g.setLineDash([]); }
      g.restore();
    });
  }

  // ---- głowa
  const glowaPrzed = !wRekach || !(s.narz > 2.4 && s.narz < 4.6);
  if (!glowaPrzed) narzedzie(r);
  glowaRobotnika(r);
  if (glowaPrzed && wRekach) narzedzie(r);

  // ---- bliższa ręka
  reka(r, s.bark, s.lokA, s.dlonA, s.przedA, false, { ramie: st.koszula, przed: st.skora, dlon: st.skora, piesc: wRekach || c.carry > 0, rekaw: 1.08 });
  if (m.lod > 0) {
    // mankiet podwiniętego rękawa
    m.szczegol((g) => {
      const l = s.lokA, a = Math.atan2(s.dlonA.y - l.y, s.dlonA.x - l.x);
      g.strokeStyle = ton(st.koszula, -0.08); g.lineWidth = Math.max(1, h * 0.07); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(l.x + Math.cos(a) * 0.006 * h, l.y + Math.sin(a) * 0.006 * h); g.lineTo(l.x + Math.cos(a) * 0.024 * h, l.y + Math.sin(a) * 0.024 * h); g.stroke();
      if (m.lod === 2) {
        g.strokeStyle = ton(st.koszula, -0.4, 0.7); g.lineWidth = Math.max(0.4, h * 0.004);
        const nx = -Math.sin(a) * 0.034 * h, ny = Math.cos(a) * 0.034 * h, cx = l.x + Math.cos(a) * 0.015 * h, cy = l.y + Math.sin(a) * 0.015 * h;
        g.beginPath(); g.moveTo(cx - nx, cy - ny); g.lineTo(cx + nx, cy + ny); g.stroke();
      }
      g.lineCap = 'round';
    });
  }
  if (tryb.oburacz) {
    // dalsza dłoń zaciśnięta na trzonku — przed nim
    m.ksztalt(kolo(s.dlonB, 0.027 * h), m.kula(s.dlonB, 0.027 * h, st.skora, true));
    reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ramie: st.koszula, przed: st.skora, dlon: st.skora, rekaw: 1.08, piesc: dlonBPiesc });
  }
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
  // odpryski w chwili uderzenia
  if (!m.prosto) m.szczegol((g) => odpryski(g, pm, czas, h, c.id));
}

function narzedzie(r: Rysunek): void {
  const { m, s, p, tryb, st, h, czas, pm } = r;
  if (tryb.narzedzie === 'kilof') {
    const t = kilof(m, s.dlonA.x, s.dlonA.y, s.narz, h, st);
    uderzenie(pm, p.cios, t, h, czas);
  } else if (tryb.narzedzie === 'mlot') {
    const t = mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st);
    uderzenie(pm, p.cios, t, h, czas);
  }
}

function glowaRobotnika(r: Rysunek): void {
  const { m, s, p, st, h, c, czas } = r;
  const kat = s.katG;
  // szyja i chusta
  m.ksztalt(konczyna(s.bark, 0.03 * h, s.glowa, 0.028 * h), m.bryla(s.bark, s.glowa, 0.03 * h, st.skora, true));
  const chusta = new Path2D();
  {
    const a = naGlowie(s, kat, -0.55, 1.05), b = naGlowie(s, kat, 0.65, 0.95), w = { x: s.bark.x + 0.03 * h, y: s.bark.y + 0.02 * h };
    chusta.moveTo(a.x, a.y); chusta.quadraticCurveTo(s.szyja.x, s.szyja.y + 0.03 * h, b.x, b.y); chusta.lineTo(w.x + 0.02 * h, w.y + 0.02 * h); chusta.lineTo(w.x - 0.03 * h, w.y + 0.01 * h); chusta.closePath();
  }
  m.ksztalt(chusta, m.plaszczyzna(s.szyja.x + 0.03 * h, s.szyja.y - 0.02 * h, s.bark.x - 0.03 * h, s.bark.y + 0.03 * h, st.chusta), (g) => {
    if (m.prosto) return;
    // węzeł i powiewający koniec
    const w = naGlowie(s, kat, 0.45, 1.0);
    g.fillStyle = ton(st.chusta, -0.15); g.beginPath(); g.arc(w.x, w.y, h * 0.012, 0, TAU); g.fill();
    const a = r.pm.wstega.a + sin(czas * 0.008 + c.id) * 0.15;
    g.strokeStyle = ton(st.chusta, -0.05); g.lineWidth = Math.max(0.9, h * 0.014);
    g.beginPath(); g.moveTo(w.x, w.y); g.quadraticCurveTo(w.x - 0.01 * h, w.y + 0.03 * h, w.x + Math.sin(a) * 0.05 * h - 0.01 * h, w.y + Math.cos(a) * 0.045 * h); g.stroke();
  });
  // głowa, nos, włosy
  m.ksztalt(glowaProfil(s, kat), m.kula(s.glowa, s.rg, st.skora), (g) => {
    if (!m.prosto) {
      g.fillStyle = ton(st.wlosy, -0.05);
      g.fill(poGlowie(s, kat, [[-0.95, -0.35], [-1.08, 0.1], [-0.9, 0.55], [-0.55, 0.6], [-0.45, 0.2], [-0.3, -0.2], [-0.6, -0.45]]));
      // bokobrody
      g.fill(poGlowie(s, kat, [[-0.05, -0.3], [0.12, -0.25], [0.15, 0.25], [0.02, 0.35], [-0.08, 0.05]]));
    }
    twarz(g, s, kat, p, st.skora, m.lod);
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
  });
  m.ksztalt(nos(s, kat, 1.15), m.kula(naGlowie(s, kat, 1.05, 0.15), s.rg * 0.3, st.skora));
  // czapka górnicza z daszkiem i lampką
  const cz = poGlowie(s, kat, [[-1.08, 0.02], [-1.12, -0.6], [-0.55, -1.22], [0.35, -1.2], [0.92, -0.75], [1.0, -0.4], [1.42, -0.3], [1.42, -0.2], [0.95, -0.2], [0.2, -0.28], [-1.08, 0.08]]);
  const lampa = naGlowie(s, kat, 0.72, -0.78);
  m.ksztalt(cz, m.kula(naGlowie(s, kat, 0, -0.6), s.rg * 1.1, st.czapka), (g) => {
    if (m.prosto) return;
    // szew i opaska
    g.strokeStyle = ton(st.czapka, -0.45, 0.85); g.lineWidth = Math.max(0.5, h * 0.006);
    const a = naGlowie(s, kat, -1.05, -0.12), b = naGlowie(s, kat, 0.95, -0.3), c1 = naGlowie(s, kat, 0, -0.42);
    g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(c1.x, c1.y, b.x, b.y); g.stroke();
    if (m.lod === 2) {
      const s1 = naGlowie(s, kat, -0.2, -1.2), s2 = naGlowie(s, kat, -0.1, -0.35);
      g.beginPath(); g.moveTo(s1.x, s1.y); g.quadraticCurveTo(naGlowie(s, kat, 0.05, -0.8).x, naGlowie(s, kat, 0.05, -0.8).y, s2.x, s2.y); g.stroke();
    }
  });
  m.ksztalt(kolo(lampa, s.rg * 0.3), m.kula(lampa, s.rg * 0.3, [214, 176, 88], false, 0.8), (g) => {
    const migot = 0.85 + 0.15 * sin(czas * 0.031 + c.id) * sin(czas * 0.017);
    g.fillStyle = `rgba(255,250,224,${migot})`;
    g.beginPath(); g.arc(lampa.x + s.rg * 0.07, lampa.y, Math.max(0.7, s.rg * 0.17), 0, TAU); g.fill();
    if (m.prosto) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    const L = h * 0.42, rozw = 0.32;
    const ang = kat + 0.12;
    const gr = g.createRadialGradient(lampa.x, lampa.y, 0, lampa.x, lampa.y, L);
    gr.addColorStop(0, `rgba(255,224,150,${0.42 * migot})`); gr.addColorStop(1, 'rgba(255,210,130,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(lampa.x, lampa.y); g.arc(lampa.x, lampa.y, L, ang - rozw, ang + rozw); g.closePath(); g.fill();
    const blask = g.createRadialGradient(lampa.x, lampa.y, 0, lampa.x, lampa.y, s.rg * 0.9);
    blask.addColorStop(0, `rgba(255,236,180,${0.5 * migot})`); blask.addColorStop(1, 'rgba(255,236,180,0)');
    g.fillStyle = blask; g.beginPath(); g.arc(lampa.x, lampa.y, s.rg * 0.9, 0, TAU); g.fill();
    g.restore();
  });
}

/** Broda: 1 — sumiaste wąsy, 2 — pełna broda, 3 — zarost. */
export function broda(g: CanvasRenderingContext2D, s: Szkielet, kat: number, typ: number, wlosy: readonly [number, number, number], lod: number): void {
  g.fillStyle = ton(wlosy, 0, 0.95);
  if (typ === 1) {
    g.fill(poGlowie(s, kat, [[0.62, 0.42], [0.95, 0.36], [1.02, 0.52], [0.9, 0.6], [0.78, 0.5], [0.66, 0.58], [0.55, 0.52]]));
  } else if (typ === 2) {
    g.fill(poGlowie(s, kat, [[0.05, 0.25], [0.45, 0.42], [0.98, 0.4], [1.02, 0.6], [0.95, 0.95], [0.7, 1.25], [0.35, 1.2], [0.05, 0.85], [-0.05, 0.45]]));
    if (lod === 2) {
      g.strokeStyle = ton(wlosy, -0.35, 0.6); g.lineWidth = Math.max(0.4, s.rg * 0.04);
      for (let i = 0; i < 4; i++) { const a = naGlowie(s, kat, 0.3 + i * 0.16, 0.6), b = naGlowie(s, kat, 0.35 + i * 0.15, 1.05); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    }
    // usta widać w brodzie
    const u = naGlowie(s, kat, 0.78, 0.56);
    g.fillStyle = 'rgba(60,22,18,0.8)'; g.beginPath(); g.ellipse(u.x, u.y, s.rg * 0.1, s.rg * 0.04, kat, 0, TAU); g.fill();
  } else {
    g.fillStyle = ton(wlosy, 0, 0.35);
    g.fill(poGlowie(s, kat, [[0.1, 0.3], [0.5, 0.45], [0.95, 0.66], [0.82, 0.8], [0.4, 0.9], [0.1, 0.7]]));
  }
}

