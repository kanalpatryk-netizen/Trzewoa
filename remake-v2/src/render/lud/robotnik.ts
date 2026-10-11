import { CIEN, cos, lerp, PI, sin, TAU, tonC, type Pkt } from './matma';
import { glowaProfil, kolo, konczyna, naGlowie, nos, twarz } from './malarz';
import { gradTulowia, grzyb, kilof, lampa, mlotek, muchy, noga, odpryski, reka, tulowSciezka, type Rysunek } from './wspolne';
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

/** Włosy: ciemna czapa krótkich loków nad czołem i z tyłu głowy; z bliska — pociągnięcia pędzla jaśniejszym tonem. */
export function wlosy(r: Rysunek, s: Szkielet, kat: number, tonsura = false): void {
  const { m, st } = r;
  const pk: [number, number][] = tonsura
    ? [[-1.06, 0.3], [-1.12, -0.25], [-0.9, -0.62], [-0.55, -0.66], [-0.6, -0.3], [-0.75, 0.0], [-0.72, 0.42], [-0.4, 0.62], [-0.85, 0.7]]
    : [[-1.06, 0.4], [-1.14, -0.3], [-0.85, -0.92], [-0.1, -1.1], [0.58, -0.9], [0.86, -0.56], [0.6, -0.6], [0.18, -0.72], [-0.3, -0.52], [-0.55, -0.1], [-0.5, 0.42], [-0.8, 0.72]];
  m.ksztalt(poGlowie(s, kat, pk), m.kula(naGlowie(s, kat, -0.3, -0.5), s.rg * 1.1, st.wlosy), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = tonC(st.wlosy, 0.3, CIEN.tkanina, 0.6); g.lineWidth = Math.max(0.4, s.rg * 0.045);
    g.beginPath();
    const kreski: [number, number, number, number][] = tonsura
      ? [[-0.98, -0.3, -0.8, -0.5], [-0.98, 0.05, -0.78, -0.12], [-0.9, 0.38, -0.7, 0.2]]
      : [[-0.9, -0.55, -0.55, -0.85], [-0.5, -0.82, -0.05, -0.98], [0.0, -0.95, 0.42, -0.86], [-1.0, -0.15, -0.8, -0.5], [-0.95, 0.25, -0.75, -0.05]];
    for (const [x1, y1, x2, y2] of kreski) {
      const a = naGlowie(s, kat, x1, y1), b = naGlowie(s, kat, x2, y2), c = naGlowie(s, kat, (x1 + x2) / 2 + 0.06, (y1 + y2) / 2 + 0.08);
      g.moveTo(a.x, a.y); g.quadraticCurveTo(c.x, c.y, b.x, b.y);
    }
    g.stroke();
  });
}

/**
 * Robotnik — fossor, kopacz katakumb z fresków: krótka tunika przepasana w talii, z ciemnymi
 * pasami (clavi), krótkie rękawy, łydki w owijkach, sandały. Dolabrę nosi na ramieniu, w drugiej
 * dłoni glinianą lampkę oliwną — przy pracy stawia ją na ziemi. Kopie święte korytarze ku rdzeniowi.
 */
export function rysujRobotnika(r: Rysunek): void {
  const { m, s, tryb, st, h, c, pm, czas, cz } = r;
  const wRekach = tryb.narzedzie !== null;
  const niesie = c.carry > 0;
  const naRamieniu = !wRekach && !niesie && (cz === 'stoi' || cz === 'idzie' || cz === 'biegnie');
  const krok = sin(pm.faza * TAU * 2);
  const ramie = { ramie: st.skora, przed: st.skora, dlon: st.skora, grub: 0.84, krotki: st.tunika, krotkiDo: 0.48, cien: CIEN.skora };

  // ---- na plecach: worek z grzybami; dolabra za pasem, gdy ręce zajęte czym innym
  if (niesie) {
    const dx = -0.1 * h + pm.worek.a * 0.03 * h, dy = 0.07 * h - Math.abs(krok) * 0.012 * h;
    const tx = sin(s.katT), ty = -cos(s.katT);
    const wx = s.bark.x + dx * cos(s.katT) - 0.02 * h * tx, wy = s.bark.y + dy + dx * sin(s.katT) - 0.02 * h * ty;
    const w = new Path2D();
    w.ellipse(wx, wy, 0.08 * h, 0.095 * h, -0.25 + pm.worek.a * 0.4, 0, TAU);
    m.ksztalt(w, m.plaszczyzna(wx + 0.06 * h, wy - 0.1 * h, wx - 0.05 * h, wy + 0.1 * h, [128, 108, 78]), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(70,34,20,0.6)'; g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.moveTo(wx - 0.06 * h, wy + 0.02 * h); g.quadraticCurveTo(wx, wy + 0.05 * h, wx + 0.055 * h, wy); g.stroke();
      grzyb(g, wx - 0.01 * h, wy - 0.075 * h, h * 1.1, m.lod);
      grzyb(g, wx + 0.035 * h, wy - 0.065 * h, h * 0.8, m.lod);
    }, false, true);
  } else if (!wRekach && !naRamieniu) {
    kilof(m, s.biodro.x - 0.07 * h, s.biodro.y - 0.04 * h, PI + 0.42 + pm.worek.a * 0.15, h * 0.88, st);
  }

  // ---- dalsza ręka (z lampką) i obie nogi — tunika przykryje uda
  if (!tryb.oburacz) reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ...ramie, piesc: true });
  const nogi = { udo: st.skora, golen: st.owijki, but: st.buty, cholewka: 0.02, owijki: true, grub: 0.9, cien: CIEN.skora };
  noga(r, s.kolB, s.stB, true, nogi);
  noga(r, s.kolA, s.stA, false, nogi);

  // ---- tunika: góra do pasa w talii, spódnica do kolan
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const Q = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });
  const PAS = 0.36;
  m.ksztalt(tulowSciezka(s, h, 0.068, 0.062, 1.0, 1.0), gradTulowia(m, s, h, st.tunika), (g) => {
    if (m.prosto) return;
    // clavi od barków do pasa, fałda bluzującej tuniki nad pasem
    g.strokeStyle = tonC(st.clavi, -0.05, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.02); g.lineCap = 'butt';
    const a1 = Q(1.0, 0.03), a2 = Q(PAS, 0.042), b1 = Q(1.0, -0.045), b2 = Q(PAS, -0.05);
    g.beginPath(); g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.moveTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.stroke();
    g.lineCap = 'round';
    if (m.lod === 2) {
      const k1 = Q(PAS + 0.06, -0.06), k2 = Q(PAS + 0.1, 0.0), k3 = Q(PAS + 0.05, 0.066);
      g.strokeStyle = 'rgba(80,36,22,0.5)'; g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath(); g.moveTo(k1.x, k1.y); g.quadraticCurveTo(k2.x, k2.y, k3.x, k3.y); g.stroke();
    }
    if (niesie) {
      const r1 = Q(0.98, -0.05), r2 = Q(PAS + 0.04, 0.07);
      g.strokeStyle = tonC([96, 64, 40], -0.2, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.013);
      g.beginPath(); g.moveTo(r1.x, r1.y); g.lineTo(r2.x, r2.y); g.stroke();
    }
  }, false, true);

  const kolanoY = Math.max(s.kolA.y, s.kolB.y);
  const przod = Math.max(s.kolA.x, s.kolB.x, s.biodro.x + 0.055 * h) + 0.03 * h + pm.szata.a * -0.01 * h;
  const tyl = Math.min(s.kolA.x, s.kolB.x, s.biodro.x - 0.06 * h) - 0.028 * h + pm.szata.a * 0.04 * h;
  const rabek = Math.min(kolanoY - 0.004 * h, s.biodro.y + 0.235 * h);
  const p0 = Q(PAS, -0.064), p1 = Q(PAS, 0.066);
  const sp = new Path2D();
  sp.moveTo(p0.x, p0.y);
  sp.quadraticCurveTo(tyl - 0.008 * h, (p0.y + rabek) / 2, tyl, rabek);
  sp.quadraticCurveTo((tyl + przod) / 2, rabek + 0.02 * h, przod, rabek - 0.006 * h);
  sp.quadraticCurveTo(przod + 0.008 * h, (p1.y + rabek) / 2, p1.x, p1.y);
  sp.closePath();
  m.ksztalt(sp, m.plaszczyzna(przod, p1.y, tyl, rabek, st.tunika), (g) => {
    if (m.prosto) return;
    // ziemia i błoto przy rąbku
    const br = g.createLinearGradient(0, rabek - 0.07 * h, 0, rabek + 0.01 * h);
    br.addColorStop(0, 'rgba(46,30,20,0)'); br.addColorStop(1, 'rgba(46,30,20,0.55)');
    g.fillStyle = br; g.fill(sp);
    // fałdy: sinopia w zagłębieniach, biel wapienna na grzbietach
    for (let i = 0; i < 3; i++) {
      const t = 0.25 + i * 0.25, x0 = lerp(p0.x, p1.x, t), y0 = lerp(p0.y, p1.y, t) + 0.02 * h, x2 = lerp(tyl, przod, t);
      g.strokeStyle = 'rgba(90,40,24,0.5)'; g.lineWidth = Math.max(0.5, h * 0.007);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x2, rabek); g.stroke();
      if (m.lod === 2) {
        g.strokeStyle = 'rgba(236,226,200,0.28)'; g.lineWidth = Math.max(0.4, h * 0.005);
        g.beginPath(); g.moveTo(x0 + 0.008 * h, y0 + 0.01 * h); g.lineTo(x2 + 0.008 * h, rabek - 0.014 * h); g.stroke();
      }
    }
    // clavi biegną dalej aż do rąbka
    g.strokeStyle = tonC(st.clavi, -0.05, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.02); g.lineCap = 'butt';
    const a2 = Q(PAS, 0.042), b2 = Q(PAS, -0.05);
    g.beginPath();
    g.moveTo(a2.x, a2.y); g.lineTo(lerp(a2.x, przod, 0.45), rabek - 0.002 * h);
    g.moveTo(b2.x, b2.y); g.lineTo(lerp(b2.x, tyl, 0.45), rabek + 0.004 * h);
    g.stroke();
    // pas (cingulum) w talii z węzłem i zwisającymi końcami
    const z1 = Q(PAS, -0.068), z2 = Q(PAS, 0.07);
    g.strokeStyle = tonC(st.pas, 0, CIEN.tkanina); g.lineWidth = Math.max(1, h * 0.017);
    g.beginPath(); g.moveTo(z1.x, z1.y); g.lineTo(z2.x, z2.y); g.stroke(); g.lineCap = 'round';
    const w = Q(PAS, 0.05), a = pm.szata.a * 1.2 + sin(czas * 0.004 + c.id) * 0.1;
    g.lineWidth = Math.max(0.8, h * 0.011);
    g.beginPath(); g.moveTo(w.x, w.y); g.lineTo(w.x + sin(a) * 0.02 * h, w.y + 0.075 * h);
    g.moveTo(w.x, w.y); g.lineTo(w.x + sin(a + 0.3) * 0.03 * h - 0.01 * h, w.y + 0.06 * h); g.stroke();
  }, false, true);

  // ---- dolabra na ramieniu (za głową) albo w rękach
  const glowaPrzed = !wRekach || !(s.narz > 2.4 && s.narz < 4.6);
  if (naRamieniu) kilof(m, s.dlonA.x, s.dlonA.y, PI + 0.66 + pm.worek.a * 0.1, h * 0.9, st);
  if (!glowaPrzed) narzedzie(r);
  glowaRobotnika(r);
  if (glowaPrzed && wRekach) narzedzie(r);

  // ---- bliższa ręka
  reka(r, s.bark, s.lokA, s.dlonA, s.przedA, false, { ...ramie, piesc: wRekach || niesie || naRamieniu });
  if (tryb.oburacz) {
    m.ksztalt(kolo(s.dlonB, 0.022 * h), m.kula(s.dlonB, 0.022 * h, st.skora, true, 0, CIEN.skora));
    reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ...ramie, piesc: true });
  }
  // lampka oliwna: w dalszej dłoni albo na ziemi przy pracy
  m.szczegol((g) => {
    if (tryb.oburacz || cz === 'kopie' || cz === 'buduje' || cz === 'modli' || cz === 'je') {
      lampa(g, s.biodro.x - 0.2 * h, 0, h, czas, c.id, m.lod, st.glina, true);
    } else if (cz !== 'wspina' && cz !== 'spada' && cz !== 'spi') {
      lampa(g, s.dlonB.x + 0.006 * h, s.dlonB.y + 0.01 * h, h, czas, c.id, m.lod, st.glina, false, pm.worek.a * 0.6 + sin(czas * 0.003 + c.id) * 0.08);
    }
  });
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
  if (!m.prosto) m.szczegol((g) => {
    odpryski(g, pm, czas, h, c.id);
    if (st.zatruty) muchy(g, s.glowa.x, s.glowa.y, h, czas, c.id);
  });
}

function narzedzie(r: Rysunek): void {
  const { m, s, p, tryb, st, h, czas, pm } = r;
  if (tryb.narzedzie === 'kilof') uderzenie(pm, p.cios, kilof(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
  else if (tryb.narzedzie === 'mlot') uderzenie(pm, p.cios, mlotek(m, s.dlonA.x, s.dlonA.y, s.narz, h, st), h, czas);
}

function glowaRobotnika(r: Rysunek): void {
  const { m, s, p, st, h } = r;
  const kat = s.katG;
  m.ksztalt(konczyna(s.bark, 0.026 * h, s.glowa, 0.024 * h), m.bryla(s.bark, s.glowa, 0.028 * h, st.skora, true, 1, CIEN.skora));
  m.ksztalt(glowaProfil(s, kat), m.kula(s.glowa, s.rg, st.skora, false, 0, CIEN.skora), (g) => {
    twarz(g, s, kat, p, st.skora, m.lod, {
      puste: st.szalenstwo > 0.45 ? st.szalenstwo : 0, strach: Math.max(0, st.strach - 0.3) * 1.4,
    });
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
  });
  m.ksztalt(nos(s, kat, 1.15), m.kula(naGlowie(s, kat, 1.05, 0.15), s.rg * 0.3, st.skora, false, 0, CIEN.skora));
  wlosy(r, s, kat);
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
