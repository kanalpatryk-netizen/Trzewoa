import { clamp, cos, kier, lerp, PI, sin, TAU, ton, type Pkt, type Rgb } from './matma';
import { naGlowie, wielokat } from './malarz';
import { gradTulowia, grzyb, miecz, noga, reka, tulowSciezka, type Rysunek } from './wspolne';
import { poGlowie } from './robotnik';
import { sladBroni, uderzenie } from './pamiec';

/** Płyty na nodze: nakolannik z wachlarzem, linie nagolennika, segmenty trzewika. */
function plytyNogi(r: Rysunek, kol: Pkt, st: { kostka: Pkt; podeszwa: Pkt; kat: number }, dalej: boolean): void {
  const { m, h } = r;
  const stal = r.st.stal;
  const nk = new Path2D(); nk.arc(kol.x + 0.004 * h, kol.y, 0.036 * h, 0, TAU);
  // wachlarz nakolannika (z boku)
  const a = Math.atan2(st.kostka.y - kol.y, st.kostka.x - kol.x);
  nk.moveTo(kol.x - 0.01 * h, kol.y);
  nk.ellipse(kol.x - 0.022 * h, kol.y + 0.004 * h, 0.03 * h, 0.022 * h, a + PI / 2, 0, TAU);
  m.ksztalt(nk, m.metal({ x: kol.x - 0.03 * h, y: kol.y }, { x: kol.x + 0.03 * h, y: kol.y }, 0.03 * h, stal, dalej), (g) => {
    if (m.lod < 2) return;
    g.fillStyle = ton(r.st.zloto, dalej ? -0.4 : 0);
    g.beginPath(); g.arc(kol.x + 0.004 * h, kol.y, Math.max(0.5, h * 0.006), 0, TAU); g.fill();
  });
  if (m.lod === 0) return;
  m.szczegol((g) => {
    g.strokeStyle = dalej ? 'rgba(20,24,34,0.5)' : 'rgba(30,36,48,0.55)'; g.lineWidth = Math.max(0.5, h * 0.006);
    // krawędź nagolennika
    const t1 = { x: lerp(kol.x, st.kostka.x, 0.25), y: lerp(kol.y, st.kostka.y, 0.25) };
    const ux = st.kostka.x - kol.x, uy = st.kostka.y - kol.y, L = Math.hypot(ux, uy) || 1;
    g.beginPath(); g.moveTo(t1.x + (-uy / L) * 0.03 * h, t1.y + (ux / L) * 0.03 * h); g.lineTo(t1.x - (-uy / L) * 0.03 * h, t1.y - (ux / L) * 0.03 * h); g.stroke();
    // segmenty trzewika
    const f = { x: cos(st.kat), y: -sin(st.kat) }, n = { x: sin(st.kat), y: cos(st.kat) };
    for (const t of [0.02, 0.04]) {
      const x = st.podeszwa.x + f.x * t * h, y = st.podeszwa.y + f.y * t * h;
      g.beginPath(); g.moveTo(x - n.x * 0.004 * h, y - n.y * 0.004 * h); g.lineTo(x - n.x * 0.04 * h + f.x * 0.01 * h, y - n.y * 0.04 * h + f.y * 0.01 * h); g.stroke();
    }
    if (!dalej) {
      // refleks wzdłuż goleni
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(0.5, h * 0.007);
      g.beginPath(); g.moveTo(kol.x + 0.026 * h, kol.y + 0.04 * h); g.lineTo(st.kostka.x + 0.02 * h, st.kostka.y - 0.03 * h); g.stroke();
    }
  });
}

export function rysujRycerza(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm } = r;
  const stal = st.stal;
  const kat = s.katG;

  // ---- peleryna
  {
    const a = pm.peleryna.a + s.katT * 0.35;
    const dl = 0.56 * h;
    const fx = s.bark.x - 0.05 * h, fy = s.bark.y + 0.005 * h;
    const fal = sin(czas * 0.007 + c.id) * 0.018 * h * clamp(Math.abs(pm.vx) / 3 + 0.25, 0, 1);
    const kx = fx + sin(PI + a) * dl * 0.55 - 0.05 * h, ky = fy - cos(PI + a) * dl;
    const pl = new Path2D();
    pl.moveTo(fx + 0.07 * h, fy - 0.01 * h);
    pl.quadraticCurveTo(fx - 0.02 * h, fy + dl * 0.45, kx + 0.1 * h + fal, ky);
    pl.quadraticCurveTo(kx + 0.03 * h, ky + 0.035 * h - fal, kx - 0.04 * h, ky - 0.005 * h + fal * 0.5);
    pl.quadraticCurveTo(kx - 0.09 * h, ky + 0.02 * h, kx - 0.12 * h - fal, ky - 0.03 * h);
    pl.quadraticCurveTo(fx - 0.13 * h, fy + dl * 0.35, fx - 0.05 * h, fy - 0.012 * h);
    pl.closePath();
    m.ksztalt(pl, m.plaszczyzna(fx + 0.05 * h, fy, kx - 0.08 * h, ky, st.plaszcz, true, 1.1), (g) => {
      if (m.prosto) return;
      // podszewka tuż nad dolnym brzegiem i fałdy (w obrysie peleryny, bez przycinania)
      const o = 0.013 * h;
      g.strokeStyle = ton(st.podszewka, -0.2, 0.9); g.lineWidth = Math.max(1, h * 0.016); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(kx + 0.09 * h + fal, ky - o); g.quadraticCurveTo(kx + 0.03 * h, ky + 0.035 * h - fal - o, kx - 0.04 * h, ky - o); g.quadraticCurveTo(kx - 0.09 * h, ky + 0.02 * h - o, kx - 0.11 * h - fal, ky - 0.03 * h - o); g.stroke();
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(30,8,10,0.38)'; g.lineWidth = Math.max(0.7, h * 0.011);
      for (let i = 0; i < 3; i++) {
        const t = 0.25 + i * 0.25;
        g.beginPath(); g.moveTo(fx - 0.02 * h + i * 0.01 * h, fy + 0.03 * h);
        g.quadraticCurveTo(lerp(fx, kx, t) - 0.03 * h + sin(czas * 0.005 + i) * 0.008 * h, lerp(fy, ky, 0.55), lerp(kx - 0.1 * h, kx + 0.08 * h, t), ky - 0.02 * h);
        g.stroke();
      }
    });
  }

  // ---- pióropusz (za hełmem)
  {
    const pa = pm.pioro.a - kat * 0.4;
    const nas = naGlowie(s, kat, 0.05, -1.25);
    const R = s.rg * 1.12;
    for (let i = 0; i < 4; i++) {
      const dl = R * (1.75 - i * 0.2);
      const a = pa - 0.25 + i * 0.22 + sin(czas * 0.006 + i * 1.3 + c.id) * 0.05;
      const ex = nas.x - Math.cos(a * 0.9) * dl * 0.95, ey = nas.y - Math.sin(-a) * dl * 0.25 + dl * 0.38 + i * R * 0.06;
      const kx = nas.x - dl * 0.15, ky = nas.y - dl * 0.75 + i * R * 0.08;
      const pi = new Path2D();
      pi.moveTo(nas.x - R * 0.1, nas.y + R * 0.02);
      pi.quadraticCurveTo(kx, ky, ex, ey);
      pi.quadraticCurveTo(kx + R * 0.32, ky + R * 0.42, nas.x + R * 0.14, nas.y + R * 0.02);
      pi.closePath();
      const kol: Rgb = i === 3 ? [st.pioro[0] * 0.8, st.pioro[1] * 0.8, st.pioro[2] * 0.8] : st.pioro;
      m.ksztalt(pi, m.plaszczyzna(kx, ky, ex, ey, kol, i % 2 === 1), (g) => {
        if (m.lod < 2) return;
        g.strokeStyle = ton(kol, 0.25, 0.6); g.lineWidth = Math.max(0.4, h * 0.004);
        g.beginPath(); g.moveTo(nas.x, nas.y); g.quadraticCurveTo(kx + R * 0.15, ky + R * 0.2, ex, ey); g.stroke();
      });
    }
  }

  // ---- tarcza na plecach, gdy ręce są zajęte wspinaczką albo machają w locie
  const naPlecach = r.cz === 'wspina' || r.cz === 'spada';
  if (naPlecach) tarcza(r, s.bark.x - 0.075 * h, s.bark.y + 0.11 * h, 0.35 + pm.worek.a * 0.3, 0.9);

  // ---- dalsza ręka (pod tarczą) i noga
  reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ramie: stal, przed: stal, dlon: [110, 112, 120], grub: 1.12, metal: true, piesc: true });
  noga(r, s.kolB, s.stB, true, { udo: stal, golen: stal, but: [128, 134, 148], grub: 1.12, metal: true, cholewka: 0.07 });
  plytyNogi(r, s.kolB, s.stB, true);

  // ---- tułów: napierśnik, kolczuga, tunika, pas
  const t = tulowSciezka(s, h, 0.098, 0.078, 1.12, 1.0);
  m.ksztalt(t, gradTulowia(m, s, h, stal, 1.3));
  {
    const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
    const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
    const Q = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });
    const fal = sin(czas * 0.007 + c.id) * 0.01 * h + pm.szata.a * 0.05 * h;
    // kolczuga spod tuniki
    const kd = s.biodro.y + 0.16 * h;
    const kl = wielokat([Q(0.15, -0.095).x, Q(0.15, -0.095).y, Q(0.15, 0.09).x, Q(0.15, 0.09).y, s.biodro.x + 0.105 * h - fal * 0.5, kd, s.biodro.x - 0.095 * h + fal * 0.7, kd]);
    m.ksztalt(kl, m.plaszczyzna(s.biodro.x, s.biodro.y + 0.08 * h, s.biodro.x, kd, [126, 132, 146]), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(36,40,52,0.7)'; g.lineWidth = Math.max(0.6, h * 0.008);
      g.setLineDash([Math.max(0.5, h * 0.004), Math.max(0.9, h * 0.008)]);
      for (const yy of [kd - 0.034 * h, kd - 0.02 * h, kd - 0.007 * h]) {
        g.lineDashOffset = yy * 0.7;
        g.beginPath(); g.moveTo(s.biodro.x - 0.085 * h, yy); g.lineTo(s.biodro.x + 0.095 * h, yy); g.stroke();
      }
      g.setLineDash([]); g.lineDashOffset = 0;
    });
    // tunika: od piersi do połowy uda, rozcięta, z krzyżem
    const gT = Q(0.66, 0), tn = new Path2D();
    tn.moveTo(gT.x - fx * 0.09 * h, gT.y - fy * 0.09 * h);
    tn.lineTo(gT.x + fx * 0.093 * h, gT.y + fy * 0.093 * h);
    tn.lineTo(s.biodro.x + 0.115 * h - fal, s.biodro.y + 0.125 * h);
    tn.lineTo(s.biodro.x + 0.01 * h, s.biodro.y + 0.14 * h);
    tn.lineTo(s.biodro.x - 0.005 * h, s.biodro.y + 0.09 * h);
    tn.lineTo(s.biodro.x - 0.02 * h, s.biodro.y + 0.14 * h);
    tn.lineTo(s.biodro.x - 0.105 * h + fal * 1.4, s.biodro.y + 0.125 * h);
    tn.closePath();
    m.ksztalt(tn, m.plaszczyzna(gT.x + 0.08 * h, gT.y, s.biodro.x - 0.1 * h, s.biodro.y + 0.13 * h, st.tunika), (g) => {
      const kc = Q(0.38, 0.012);
      g.strokeStyle = ton(st.krzyz); g.lineWidth = Math.max(1, h * 0.022);
      g.beginPath(); g.moveTo(kc.x, kc.y - 0.065 * h); g.lineTo(kc.x, kc.y + 0.085 * h); g.moveTo(kc.x - 0.045 * h, kc.y - 0.018 * h); g.lineTo(kc.x + 0.045 * h, kc.y - 0.018 * h); g.stroke();
      if (m.prosto) return;
      g.strokeStyle = ton(st.zloto, -0.05); g.lineWidth = Math.max(0.6, h * 0.01);
      g.beginPath(); g.moveTo(gT.x - fx * 0.09 * h, gT.y - fy * 0.09 * h); g.lineTo(gT.x + fx * 0.093 * h, gT.y + fy * 0.093 * h); g.stroke();
      // pas z klamrą
      const p1 = Q(0.1, -0.1), p2 = Q(0.1, 0.1);
      g.strokeStyle = ton(st.skorzany, -0.1); g.lineWidth = Math.max(0.9, h * 0.02);
      g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke();
      const kl2 = Q(0.1, 0.07);
      g.fillStyle = ton(st.zloto); g.fillRect(kl2.x - 0.01 * h, kl2.y - 0.011 * h, 0.02 * h, 0.022 * h);
    });
    // pochwa miecza przy biodrze (z rękojeścią, gdy miecz schowany)
    const ps = Q(0.08, -0.07), pk = kier(-0.3);
    const pe = { x: ps.x + pk.x * 0.3 * h, y: ps.y + pk.y * 0.3 * h };
    m.kreska(ps.x, ps.y, pe.x, pe.y, Math.max(1.2, h * 0.026), m.bryla(ps, pe, 0.013 * h, st.skorzany, true), (g) => {
      if (m.prosto) return;
      g.strokeStyle = ton(st.zloto, -0.2); g.lineWidth = Math.max(0.8, h * 0.026); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pe.x - pk.x * 0.03 * h, pe.y - pk.y * 0.03 * h); g.lineTo(pe.x, pe.y); g.stroke(); g.lineCap = 'round';
    });
    if (tryb.narzedzie !== 'miecz') {
      const hx = ps.x - pk.x * 0.09 * h, hy = ps.y - pk.y * 0.09 * h;
      m.kreska(ps.x, ps.y, hx, hy, Math.max(1, h * 0.02), ton(st.skorzany));
      m.kreska(ps.x - 0.04 * h * pk.y, ps.y + 0.04 * h * pk.x, ps.x + 0.04 * h * pk.y, ps.y - 0.04 * h * pk.x, Math.max(1, h * 0.02), ton(st.zloto));
    }
  }

  // ---- bliższa noga
  noga(r, s.kolA, s.stA, false, { udo: stal, golen: stal, but: [150, 156, 170], grub: 1.12, metal: true, cholewka: 0.07 });
  plytyNogi(r, s.kolA, s.stA, false);

  // ---- hełm garnczkowy z obręczą, nitami i świecącym wizjerem
  {
    const R = 1.12;
    const he = poGlowie(s, kat, [[-0.98 * R, 0.86], [-1.05 * R, -0.25], [-0.98 * R, -0.95], [-0.5 * R, -1.18], [0.5 * R, -1.18], [0.98 * R, -0.95], [1.08 * R, -0.25], [1.12 * R, 0.62], [0.88 * R, 0.95], [-0.6 * R, 1.0]], true);
    m.ksztalt(he, m.prosto ? ton(stal) : (() => {
      const a = naGlowie(s, kat, 0.9, -1.0), b = naGlowie(s, kat, -0.9, 1.0);
      const gr = m.g.createLinearGradient(a.x, a.y, b.x, b.y);
      gr.addColorStop(0, ton(stal, 0.5)); gr.addColorStop(0.3, ton(stal, 0.08)); gr.addColorStop(0.55, ton(stal, -0.25)); gr.addColorStop(0.7, ton(stal, -0.05)); gr.addColorStop(1, ton(stal, -0.55));
      return gr;
    })(), (g) => {
      const P = (dx: number, dy: number) => naGlowie(s, kat, dx, dy);
      // wizjer
      const w1 = P(0.15, -0.3), w2 = P(1.2, -0.3), w3 = P(1.2, -0.12), w4 = P(0.15, -0.12);
      g.fillStyle = 'rgba(8,6,10,0.96)';
      g.beginPath(); g.moveTo(w1.x, w1.y); g.lineTo(w2.x, w2.y); g.lineTo(w3.x, w3.y); g.lineTo(w4.x, w4.y); g.closePath(); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = st.oko;
      const o = P(0.72, -0.21);
      g.beginPath(); g.ellipse(o.x, o.y, s.rg * 0.2, s.rg * 0.06, kat, 0, TAU); g.fill();
      if (st.bunt && !m.prosto) { const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, s.rg * 0.7); gr.addColorStop(0, 'rgba(255,60,40,0.5)'); gr.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, s.rg * 0.7, 0, TAU); g.fill(); }
      g.restore();
      if (m.prosto) return;
      // otwory oddechowe
      g.fillStyle = 'rgba(10,8,12,0.85)';
      if (m.lod === 2) {
        g.beginPath();
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const q = P(0.6 + j * 0.22, 0.18 + i * 0.2); g.moveTo(q.x + s.rg * 0.045, q.y); g.arc(q.x, q.y, Math.max(0.5, s.rg * 0.045), 0, TAU); }
        g.fill();
      }
      // złota obręcz i grań
      g.strokeStyle = ton(st.zloto, 0); g.lineWidth = Math.max(0.7, h * 0.014);
      const b1 = P(-1.06, -0.55), b2 = P(1.06, -0.62), bc = P(0, -0.5);
      g.beginPath(); g.moveTo(b1.x, b1.y); g.quadraticCurveTo(bc.x, bc.y, b2.x, b2.y); g.stroke();
      const r1 = P(1.12, -0.95), r2 = P(1.22, 0.62);
      g.beginPath(); g.moveTo(r1.x, r1.y); g.lineTo(r2.x, r2.y); g.stroke();
      if (m.lod === 2) {
        g.fillStyle = ton(st.zloto, 0.3);
        for (let i = 0; i < 5; i++) { const q = P(-0.85 + i * 0.4, -0.56 + (i - 2) * (i - 2) * -0.005 - i * 0.01); g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, s.rg * 0.04), 0, TAU); g.fill(); }
      }
      // refleks
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(0.6, h * 0.01);
      const h1 = P(0.5, -1.0), h2 = P(0.92, -0.75), h3 = P(0.96, -0.42);
      g.beginPath(); g.moveTo(h1.x, h1.y); g.quadraticCurveTo(h2.x, h2.y, h3.x, h3.y); g.stroke();
    });
  }

  // ---- tarcza w dalszej ręce — przed tułowiem (przy wspinaczce i upadku wisi na plecach, patrz wyżej)
  if (!naPlecach) {
    const unies = p.tarcza;
    tarcza(r, s.dlonB.x + 0.04 * h, s.dlonB.y - 0.03 * h - unies * 0.02 * h, -0.15 + unies * 0.2, 1);
  }

  // ---- naramiennik i bliższa ręka z mieczem
  if (tryb.narzedzie === 'miecz') {
    const czubek = { x: s.dlonA.x + sin(s.narz) * 0.54 * h, y: s.dlonA.y + cos(s.narz) * 0.54 * h };
    const slad = sladBroni(pm, czubek, h, czas, p.smuga > 0.05);
    if (slad.length > 1 && !m.prosto) m.szczegol((g) => smuga(g, slad, s.bark, h, p.smuga));
    const t = miecz(m, s.dlonA.x, s.dlonA.y, s.narz, h, st, czas + c.id * 300);
    uderzenie(pm, p.cios, t, h, czas);
  }
  reka(r, s.bark, s.lokA, s.dlonA, s.przedA, false, { ramie: stal, przed: stal, dlon: [118, 120, 130], grub: 1.12, metal: true, piesc: tryb.narzedzie === 'miecz' || tryb.grzyb });
  {
    // naramiennik z dwóch płyt i nałokietnik
    const b = s.bark, l = s.lokA;
    const a = Math.atan2(l.y - b.y, l.x - b.x);
    const nr = new Path2D(); nr.ellipse(b.x + Math.cos(a) * 0.012 * h, b.y + Math.sin(a) * 0.012 * h - 0.006 * h, 0.06 * h, 0.048 * h, a, 0, TAU);
    m.ksztalt(nr, m.kula({ x: b.x, y: b.y - 0.01 * h }, 0.06 * h, stal, false, 0.5), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(30,36,48,0.55)'; g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath(); g.ellipse(b.x + Math.cos(a) * 0.03 * h, b.y + Math.sin(a) * 0.03 * h - 0.004 * h, 0.05 * h, 0.034 * h, a, 0.3, PI - 0.3); g.stroke();
      g.strokeStyle = ton(st.zloto, -0.1); g.beginPath(); g.ellipse(b.x + Math.cos(a) * 0.012 * h, b.y + Math.sin(a) * 0.012 * h - 0.006 * h, 0.056 * h, 0.044 * h, a, 0.4, PI - 0.4); g.stroke();
    });
    const lk = new Path2D(); lk.arc(l.x, l.y, 0.03 * h, 0, TAU);
    m.ksztalt(lk, m.kula(l, 0.03 * h, stal, false, 0.5));
  }
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
}

/** Tarcza z okuciem: pole w barwach, krzyż, guz, refleks; (tx, ty) — środek, obr — obrót. */
function tarcza(r: Rysunek, tx: number, ty: number, obr: number, skala: number): void {
  const { m, st, h } = r;
  const stal = st.stal;
  const w = 0.105 * h * skala, hh = 0.165 * h * skala;
  const P = (x: number, y: number): [number, number] => [tx + x * cos(obr) - y * sin(obr), ty + x * sin(obr) + y * cos(obr)];
  const tr = new Path2D();
  tr.moveTo(...P(-w, -hh * 0.45));
  tr.quadraticCurveTo(...P(0, -hh * 0.6), ...P(w, -hh * 0.45));
  tr.quadraticCurveTo(...P(w * 1.02, hh * 0.22), ...P(0, hh * 0.66));
  tr.quadraticCurveTo(...P(-w * 1.02, hh * 0.22), ...P(-w, -hh * 0.45));
  tr.closePath();
  const [ax, ay] = P(w, -hh), [bx, by] = P(-w, hh);
  m.ksztalt(tr, m.plaszczyzna(ax, ay, bx, by, st.tunika, false, 1.2), (g) => {
    g.strokeStyle = ton(st.krzyz); g.lineWidth = Math.max(1, h * 0.024);
    g.beginPath(); g.moveTo(...P(0, -hh * 0.4)); g.lineTo(...P(0, hh * 0.52)); g.moveTo(...P(-w * 0.72, -hh * 0.1)); g.lineTo(...P(w * 0.72, -hh * 0.1)); g.stroke();
    if (m.prosto) return;
    g.strokeStyle = ton(stal, 0.1); g.lineWidth = Math.max(1, h * 0.018); g.stroke(tr);
    g.strokeStyle = ton(st.zloto, -0.1); g.lineWidth = Math.max(0.5, h * 0.006); g.stroke(tr);
    const [ux, uy] = P(0, -hh * 0.1);
    g.fillStyle = ton(st.zloto); g.beginPath(); g.arc(ux, uy, Math.max(0.8, h * 0.014), 0, TAU); g.fill();
    const [lx, ly] = P(w * 0.38, -hh * 0.26);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(lx, ly, w * 0.38, hh * 0.15, obr - 0.5, 0, TAU); g.fill();
    if (m.lod === 2) {
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(0.4, h * 0.004);
      for (const [x1, y1, x2, y2] of [[-0.5, 0.1, -0.2, 0.25], [0.3, 0.2, 0.55, 0.05], [-0.3, -0.35, -0.1, -0.3]]) { g.beginPath(); g.moveTo(...P(x1 * w, y1 * hh)); g.lineTo(...P(x2 * w, y2 * hh)); g.stroke(); }
    }
  });
}

/**
 * Smuga cięcia: łuk zakreślony czubkiem miecza wokół barku. Próbki czubka (ostatnie ~110 ms)
 * łączymy po okręgu, a nie prostymi — wychodzi sierp, który zanika ku tyłowi.
 */
function smuga(g: CanvasRenderingContext2D, slad: { x: number; y: number }[], bark: Pkt, h: number, sila0: number): void {
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
  const P = (q: { a: number; r: number }, k: number): Pkt => ({ x: bark.x + Math.cos(q.a) * q.r * k, y: bark.y + Math.sin(q.a) * q.r * k });
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = pk.length;
  for (let i = 1; i < n; i++) {
    const w = i / (n - 1);
    const a0 = P(pk[i - 1], 1), a1 = P(pk[i], 1), b0 = P(pk[i - 1], 1 - 0.22 * w), b1 = P(pk[i], 1 - 0.22 * w);
    g.fillStyle = `rgba(190,215,255,${0.22 * w * w * sila})`;
    g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.lineTo(b1.x, b1.y); g.lineTo(b0.x, b0.y); g.closePath(); g.fill();
  }
  g.strokeStyle = `rgba(235,245,255,${0.5 * sila})`; g.lineWidth = Math.max(0.6, h * 0.007);
  g.beginPath();
  for (let i = Math.floor(n * 0.35); i < n; i++) { const q = P(pk[i], 1); if (i === Math.floor(n * 0.35)) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
  g.stroke();
  g.restore();
}
