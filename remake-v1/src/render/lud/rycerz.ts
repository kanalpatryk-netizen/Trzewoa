import { CIEN, clamp, cos, kier, lerp, PI, sin, TAU, tonC, type Pkt } from './matma';
import { glowaProfil, konczyna, naGlowie, nos, twarz } from './malarz';
import { grzyb, miecz, noga, poswiata, reka, tulowSciezka, type Rysunek } from './wspolne';
import { broda, poGlowie } from './robotnik';
import { sladBroni, uderzenie } from './pamiec';

/**
 * Rycerz — święty wojownik z fresków (jak Jerzy, Teodor, Demetriusz): smukły, w zbroi łuskowej
 * (lamelkowej) z rzędami płytek, ze skórzanymi pteryges u ramion i bioder, w krótkiej tunice,
 * spodniach i wysokich butach. Czerwona chlamida spięta złotą fibulą, stożkowy hełm z nosalem
 * i kolczym czepcem, długa migdałowa tarcza z krzyżem, spatha. Twarz odsłonięta i surowa.
 * Zdrajca (bunt) — poczerniała zbroja, płaszcz i tarcza jak zaschnięta krew.
 */

export function rysujRycerza(r: Rysunek): void {
  const { m, s, p, tryb, st, h, c, czas, pm } = r;
  const tx = sin(s.katT), ty = -cos(s.katT), fx = cos(s.katT), fy = sin(s.katT);
  const L = Math.hypot(s.bark.x - s.biodro.x, s.bark.y - s.biodro.y);
  const T = (u: number, f: number): Pkt => ({ x: s.biodro.x + tx * u * L + fx * f * h, y: s.biodro.y + ty * u * L + fy * f * h });

  // ---- chlamida: spięta na barku, zwisa z tyłu do łydek, w biegu odlatuje
  {
    const a = clamp(pm.peleryna.a + 0.18, -1.6, 0.4) * 0.8 - 0.06;
    const dl = 0.6 * h;
    const A = T(0.99, -0.07);
    const H = { x: A.x + sin(a) * dl, y: A.y + cos(a) * dl };
    const fal = sin(czas * 0.006 + c.id) * 0.012 * h * clamp(Math.abs(pm.vx) / 3 + 0.25, 0, 1);
    const Hp = { x: H.x + cos(a) * 0.1 * h, y: H.y - sin(a) * 0.1 * h }, Ht = { x: H.x - cos(a) * 0.13 * h + fal, y: H.y + sin(a) * 0.13 * h };
    const F = T(1.01, 0.03);
    const pl = new Path2D();
    pl.moveTo(F.x, F.y);
    pl.quadraticCurveTo(T(0.6, 0.02).x, T(0.6, 0.02).y, Hp.x, Hp.y);
    pl.quadraticCurveTo(H.x, H.y + 0.016 * h, Ht.x, Ht.y);
    pl.quadraticCurveTo(A.x - 0.1 * h + fal * 0.5, (A.y + Ht.y) / 2, A.x - 0.012 * h, A.y - 0.02 * h);
    pl.quadraticCurveTo(T(1.04, -0.02).x, T(1.04, -0.02).y, F.x, F.y);
    pl.closePath();
    m.ksztalt(pl, m.plaszczyzna(A.x + 0.05 * h, A.y, Ht.x, Ht.y, st.chlamida, true, 1.1), (g) => {
      if (m.prosto) return;
      // fałdy od fibuli ku rąbkowi
      g.strokeStyle = 'rgba(30,8,8,0.45)'; g.lineWidth = Math.max(0.6, h * 0.009);
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.3;
        const kx = lerp(Hp.x, Ht.x, t), ky = lerp(Hp.y, Ht.y, t) - 0.01 * h;
        g.moveTo(A.x - 0.01 * h, A.y + 0.04 * h);
        g.quadraticCurveTo(lerp(A.x, kx, 0.5) - 0.02 * h + sin(czas * 0.005 + i) * 0.006 * h, lerp(A.y, ky, 0.55), kx, ky);
      }
      g.stroke();
      // ciemniejszy, haftowany brzeg
      g.strokeStyle = tonC(st.zloto, -0.45, CIEN.tkanina, 0.8); g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.moveTo(Hp.x, Hp.y - 0.008 * h); g.quadraticCurveTo(H.x, H.y + 0.008 * h, Ht.x, Ht.y - 0.008 * h); g.stroke();
    }, false, true);
  }

  // ---- tarcza na plecach przy wspinaczce i upadku
  const naPlecach = r.cz === 'wspina' || r.cz === 'spada';
  if (naPlecach) tarcza(r, s.bark.x - 0.08 * h, s.bark.y + 0.13 * h, 0.3 + pm.worek.a * 0.3, 0.85);

  // ---- dalsza ręka i nogi (spodnie, wysokie buty)
  const ramie = { ramie: st.spodnica, przed: st.skorzane, dlon: st.skora, krotki: st.skorzane, krotkiDo: 0.55, cien: CIEN.tkanina, cienPrzed: CIEN.tkanina };
  reka(r, s.barkB, s.lokB, s.dlonB, s.przedB, true, { ...ramie, piesc: true });
  const nogi = { udo: st.spodnica, golen: st.buty, but: st.buty, cholewka: 0.05, cien: CIEN.tkanina };
  noga(r, s.kolB, s.stB, true, nogi);
  noga(r, s.kolA, s.stA, false, nogi);

  // ---- tunika: krótka spódnica do kolan
  const PAS = 0.16;
  const kolanoY = Math.max(s.kolA.y, s.kolB.y);
  const przod = Math.max(s.kolA.x, s.kolB.x, s.biodro.x + 0.06 * h) + 0.03 * h + pm.szata.a * -0.01 * h;
  const tyl = Math.min(s.kolA.x, s.kolB.x, s.biodro.x - 0.065 * h) - 0.028 * h + pm.szata.a * 0.04 * h;
  const rabek = Math.min(kolanoY - 0.012 * h, s.biodro.y + 0.21 * h);
  {
    const p0 = T(PAS, -0.07), p1 = T(PAS, 0.074);
    const sp = new Path2D();
    sp.moveTo(p0.x, p0.y);
    sp.quadraticCurveTo(tyl - 0.008 * h, (p0.y + rabek) / 2, tyl, rabek);
    sp.quadraticCurveTo((tyl + przod) / 2, rabek + 0.018 * h, przod, rabek - 0.006 * h);
    sp.quadraticCurveTo(przod + 0.008 * h, (p1.y + rabek) / 2, p1.x, p1.y);
    sp.closePath();
    m.ksztalt(sp, m.plaszczyzna(przod, p1.y, tyl, rabek, st.spodnica), (g) => {
      if (m.prosto) return;
      g.strokeStyle = tonC(st.zloto, -0.35, CIEN.tkanina, 0.8); g.lineWidth = Math.max(0.6, h * 0.008);
      g.beginPath(); g.moveTo(tyl + 0.004 * h, rabek - 0.012 * h); g.quadraticCurveTo((tyl + przod) / 2, rabek + 0.004 * h, przod - 0.004 * h, rabek - 0.018 * h); g.stroke();
    }, false, true);
  }

  // ---- pteruges u bioder: rząd skórzanych pasów ze złotymi okuciami
  {
    const kolP = s.kolA.x > s.kolB.x ? s.kolA : s.kolB, kolT = s.kolA.x > s.kolB.x ? s.kolB : s.kolA;
    const dolY = s.biodro.y + 0.1 * h;
    const xp = Math.max(s.biodro.x + 0.075 * h, lerp(s.biodro.x, kolP.x, 0.42) + 0.045 * h), xt = Math.min(s.biodro.x - 0.08 * h, lerp(s.biodro.x, kolT.x, 0.42) - 0.045 * h);
    const g0 = T(PAS + 0.02, -0.074), g1 = T(PAS + 0.02, 0.078);
    const n = 6;
    const pt = new Path2D();
    pt.moveTo(g0.x, g0.y);
    pt.lineTo(xt, dolY);
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = lerp(xt, xp, t);
      pt.lineTo(x - (xp - xt) / n * 0.5, dolY + 0.012 * h);
      pt.lineTo(x, dolY);
    }
    pt.lineTo(g1.x, g1.y);
    pt.closePath();
    m.ksztalt(pt, m.plaszczyzna(xp, g1.y, xt, dolY, st.skorzane), (g) => {
      if (m.prosto) return;
      g.strokeStyle = 'rgba(30,14,8,0.6)'; g.lineWidth = Math.max(0.5, h * 0.006);
      g.beginPath();
      for (let i = 1; i < n; i++) { const t = i / n; g.moveTo(lerp(g0.x, g1.x, t), lerp(g0.y, g1.y, t) + 0.01 * h); g.lineTo(lerp(xt, xp, t), dolY); }
      g.stroke();
      if (m.lod === 2) {
        g.fillStyle = tonC(st.zloto, 0, CIEN.tkanina);
        for (let i = 0; i < n; i++) { const x = lerp(xt, xp, (i + 0.5) / n); g.beginPath(); g.arc(x, dolY - 0.004 * h, Math.max(0.5, h * 0.005), 0, TAU); g.fill(); }
      }
    }, false, true);
  }

  // ---- zbroja łuskowa: metal z pasem blasku, rzędy zachodzących na siebie łusek
  m.ksztalt(tulowSciezka(s, h, 0.072, 0.066, 1.08, 1.0), m.metal(s.biodro, s.bark, 0.075 * h, st.zbroja, false, CIEN.metal), (g) => {
    if (m.prosto) return;
    const rzedy = m.lod === 2 ? 8 : 4;
    const ciem = tonC(st.zbroja, -0.62, CIEN.metal, 0.8), jas = tonC(st.zbroja, 0.5, CIEN.metal, 0.55);
    g.lineWidth = Math.max(0.45, h * 0.0055);
    for (let i = 0; i < rzedy; i++) {
      const u = 0.2 + (i / rzedy) * 0.72, sz = 0.056 + 0.008 * Math.sin(u * PI);
      if (m.lod < 2) {
        const a = T(u, -sz), b = T(u, sz);
        g.strokeStyle = ciem; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        continue;
      }
      // łuski: półkola wybrzuszone w dół, co drugi rząd przesunięte o pół łuski
      const nk = 6, rr = (sz * 2 * h) / nk / 2;
      g.strokeStyle = ciem; g.beginPath();
      for (let j = 0; j < nk; j++) {
        const f = -sz + ((j + 0.5 + (i % 2) * 0.5) / nk) * sz * 2;
        if (f > sz * 0.96) continue;
        const q = T(u, f);
        g.moveTo(q.x + fx * rr, q.y + fy * rr);
        g.arc(q.x, q.y, rr, s.katT, s.katT + PI);
      }
      g.stroke();
      g.strokeStyle = jas; g.beginPath();
      for (let j = 0; j < nk; j++) {
        const f = -sz + ((j + 0.5 + (i % 2) * 0.5) / nk) * sz * 2;
        if (f > sz * 0.96 || f < -sz * 0.3) continue;
        const q = T(u - 0.012, f);
        g.moveTo(q.x + fx * rr * 0.6, q.y + fy * rr * 0.6 + rr * 0.5);
        g.arc(q.x, q.y + rr * 0.2, rr * 0.62, s.katT + 0.5, s.katT + 1.3);
      }
      g.stroke();
    }
    // pas wojskowy (cingulum) ze złotą klamrą i rzemień przez pierś
    const z1 = T(PAS + 0.03, -0.07), z2 = T(PAS + 0.03, 0.074);
    g.strokeStyle = tonC(st.skorzane, -0.3, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.018); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(z1.x, z1.y); g.lineTo(z2.x, z2.y); g.stroke();
    const r1 = T(0.98, 0.035), r2 = T(PAS + 0.05, -0.065);
    g.lineWidth = Math.max(0.7, h * 0.011);
    g.beginPath(); g.moveTo(r1.x, r1.y); g.lineTo(r2.x, r2.y); g.stroke();
    g.lineCap = 'round';
    const kl = T(PAS + 0.03, 0.055);
    g.fillStyle = tonC(st.zloto, 0.1, CIEN.tkanina); g.fillRect(kl.x - 0.009 * h, kl.y - 0.011 * h, 0.018 * h, 0.022 * h);
  }, false, true);

  // ---- pochwa miecza przy biodrze (z rękojeścią, gdy miecz schowany)
  {
    const ps = T(PAS, -0.06), pk = kier(-0.32);
    const pe = { x: ps.x + pk.x * 0.34 * h, y: ps.y + pk.y * 0.34 * h };
    m.kreska(ps.x, ps.y, pe.x, pe.y, Math.max(1.2, h * 0.024), m.bryla(ps, pe, 0.012 * h, st.skorzane, true));
    if (!m.prosto) m.kreska(pe.x - pk.x * 0.03 * h, pe.y - pk.y * 0.03 * h, pe.x, pe.y, Math.max(1.2, h * 0.026), tonC(st.zloto, -0.2, CIEN.tkanina));
    if (tryb.narzedzie !== 'miecz') {
      const hx = ps.x - pk.x * 0.09 * h, hy = ps.y - pk.y * 0.09 * h;
      m.kreska(ps.x, ps.y, hx, hy, Math.max(1, h * 0.018), tonC(st.skorzane, -0.2, CIEN.tkanina));
      m.kreska(ps.x - 0.045 * h * pk.y, ps.y + 0.045 * h * pk.x, ps.x + 0.045 * h * pk.y, ps.y - 0.045 * h * pk.x, Math.max(1, h * 0.018), tonC(st.zloto, 0, CIEN.tkanina));
    }
  }

  // ---- głowa: kolczy czepiec, twarz, hełm stożkowy z nosalem
  glowaRycerza(r);

  // ---- tarcza w dalszej ręce — przed tułowiem
  if (!naPlecach) {
    const unies = p.tarcza;
    tarcza(r, s.dlonB.x + 0.035 * h, s.dlonB.y + 0.03 * h - unies * 0.06 * h, -0.06 + unies * 0.1, 1);
  }

  // ---- miecz i bliższa ręka; fibula na barku
  if (tryb.narzedzie === 'miecz') {
    const czubek = { x: s.dlonA.x + sin(s.narz) * 0.555 * h, y: s.dlonA.y + cos(s.narz) * 0.555 * h };
    const slad = sladBroni(pm, czubek, h, czas, p.smuga > 0.05);
    if (slad.length > 1 && !m.prosto) m.szczegol((g) => smuga(g, slad, s.bark, h, p.smuga, st.bunt));
    uderzenie(pm, p.cios, miecz(m, s.dlonA.x, s.dlonA.y, s.narz, h, st, czas + c.id * 300), h, czas);
  }
  reka(r, s.bark, s.lokA, s.dlonA, s.przedA, false, { ...ramie, piesc: tryb.narzedzie === 'miecz' || tryb.grzyb });
  {
    const f = T(1.0, 0.035);
    const fb = new Path2D(); fb.arc(f.x, f.y, Math.max(1, 0.017 * h), 0, TAU);
    m.ksztalt(fb, m.kula(f, 0.017 * h, st.zloto, false, 0.4, CIEN.tkanina), (g) => {
      if (m.lod < 2) return;
      g.fillStyle = tonC(st.tarcza, 0.1, CIEN.tkanina);
      g.beginPath(); g.arc(f.x, f.y, Math.max(0.5, 0.007 * h), 0, TAU); g.fill();
    });
  }
  if (tryb.grzyb) m.szczegol((g) => grzyb(g, s.dlonA.x + 0.012 * h, s.dlonA.y - 0.012 * h, h, m.lod));
}

function glowaRycerza(r: Rysunek): void {
  const { m, s, p, st, h } = r;
  const kat = s.katG;
  const P = (dx: number, dy: number) => naGlowie(s, kat, dx, dy);
  // kolczy czepiec osłania kark i szyję
  const cz = poGlowie(s, kat, [[-0.95, -0.3], [-1.12, 0.4], [-1.05, 1.15], [-0.4, 1.55], [0.3, 1.45], [0.2, 0.9], [-0.2, 0.55], [-0.3, -0.2]]);
  m.ksztalt(konczyna(s.bark, 0.026 * h, s.glowa, 0.024 * h), m.bryla(s.bark, s.glowa, 0.028 * h, st.skora, true, 1, CIEN.skora));
  m.ksztalt(cz, m.plaszczyzna(P(-0.5, -0.3).x, P(-0.5, -0.3).y, P(-0.5, 1.5).x, P(-0.5, 1.5).y, st.zelazo, false, 1, CIEN.metal), (g) => {
    if (m.lod < 2) return;
    g.strokeStyle = tonC(st.zelazo, -0.6, CIEN.metal, 0.7); g.lineWidth = Math.max(0.4, h * 0.004);
    g.setLineDash([Math.max(0.6, h * 0.004), Math.max(0.6, h * 0.004)]);
    g.beginPath();
    for (let i = 0; i < 5; i++) { const a = P(-1.05 + i * 0.05, 0.1 + i * 0.28), b = P(-0.15 + i * 0.08, 0.2 + i * 0.28); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    g.stroke(); g.setLineDash([]);
  });
  m.ksztalt(glowaProfil(s, kat), m.kula(s.glowa, s.rg, st.skora, false, 0, CIEN.skora), (g) => {
    twarz(g, s, kat, p, st.skora, m.lod, {
      bezUcha: true, puste: st.szalenstwo > 0.45 ? st.szalenstwo : 0, strach: Math.max(0, st.strach - 0.3) * 1.4,
    });
    if (st.broda && !m.prosto) broda(g, s, kat, st.broda, st.wlosy, m.lod);
  });
  m.ksztalt(nos(s, kat, 1.1), m.kula(P(1.05, 0.15), s.rg * 0.3, st.skora, false, 0, CIEN.skora));
  // hełm: stożek z lekko odchylonym szczytem, złota obręcz, złote listwy, nosal
  const he = poGlowie(s, kat, [[-1.1, -0.18], [-1.02, -0.72], [-0.55, -1.32], [-0.12, -1.82], [0.36, -1.3], [0.92, -0.72], [1.08, -0.22], [0.5, -0.3], [-0.4, -0.3]], false);
  const ga = P(0.7, -1.4), gb = P(-0.9, -0.2);
  m.ksztalt(he, m.metal(ga, gb, s.rg, st.helm, false, CIEN.metal), (g) => {
    if (m.prosto) return;
    // listwy (spangen) od obręczy ku szczytowi
    g.strokeStyle = tonC(st.zloto, -0.15, CIEN.tkanina); g.lineWidth = Math.max(0.6, h * 0.009);
    g.beginPath();
    for (const x of [-0.6, 0.45]) { const a = P(x, -0.34), b = P(-0.12 + x * 0.08, -1.74); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    g.stroke();
    // obręcz
    const o1 = P(-1.1, -0.24), o2 = P(1.08, -0.28);
    g.lineWidth = Math.max(0.9, h * 0.016); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(o1.x, o1.y); g.quadraticCurveTo(P(0, -0.36).x, P(0, -0.36).y, o2.x, o2.y); g.stroke();
    g.lineCap = 'round';
    if (m.lod === 2) {
      g.fillStyle = tonC(st.zloto, 0.35, CIEN.tkanina);
      for (let i = 0; i < 5; i++) { const q = P(-0.9 + i * 0.42, -0.3); g.beginPath(); g.arc(q.x, q.y, Math.max(0.4, h * 0.0035), 0, TAU); g.fill(); }
    }
  }, false, false);
  // nosal
  const n1 = P(0.98, -0.32), n2 = P(1.06, 0.22);
  const ns = new Path2D();
  ns.moveTo(n1.x - s.rg * 0.08, n1.y); ns.lineTo(n1.x + s.rg * 0.1, n1.y); ns.lineTo(n2.x + s.rg * 0.06, n2.y); ns.lineTo(n2.x - s.rg * 0.06, n2.y); ns.closePath();
  m.ksztalt(ns, m.metal(n1, n2, s.rg * 0.1, st.helm, false, CIEN.metal));
}

/**
 * Smuga cięcia: łuk zakreślony czubkiem miecza wokół barku. Próbki czubka (ostatnie ~110 ms)
 * łączymy po okręgu — wychodzi sierp, który zanika ku tyłowi. U zdrajcy czerwona.
 */
function smuga(g: CanvasRenderingContext2D, slad: { x: number; y: number }[], bark: Pkt, h: number, sila0: number, bunt: boolean): void {
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
  const [cr, cg, cb] = bunt ? [255, 70, 40] : [255, 226, 170];
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

/**
 * Tarcza migdałowa: długa, zaostrzona u dołu, czerwone pole, złoty brzeg, guz i krzyż
 * o rozszerzonych ramionach. (tx, ty) — środek, obr — obrót, skala — wielkość.
 */
function tarcza(r: Rysunek, tx: number, ty: number, obr: number, skala: number): void {
  const { m, st, h, c, czas } = r;
  const w = 0.088 * h * skala, hh = 0.34 * h * skala;
  const P = (x: number, y: number): [number, number] => [tx + x * cos(obr) - y * sin(obr), ty + x * sin(obr) + y * cos(obr)];
  const tr = new Path2D();
  tr.moveTo(...P(0, -hh * 0.5));
  tr.quadraticCurveTo(...P(w * 1.02, -hh * 0.48), ...P(w, -hh * 0.18));
  tr.quadraticCurveTo(...P(w * 0.92, hh * 0.22), ...P(0, hh * 0.6));
  tr.quadraticCurveTo(...P(-w * 0.92, hh * 0.22), ...P(-w, -hh * 0.18));
  tr.quadraticCurveTo(...P(-w * 1.02, -hh * 0.48), ...P(0, -hh * 0.5));
  tr.closePath();
  const [ax, ay] = P(w, -hh * 0.5), [bx, by] = P(-w, hh * 0.6);
  m.ksztalt(tr, m.plaszczyzna(ax, ay, bx, by, st.tarcza, false, 1.2), (g) => {
    // krzyż o rozszerzonych ramionach
    const kc = { x: P(0, -hh * 0.16)[0], y: P(0, -hh * 0.16)[1] };
    g.strokeStyle = tonC(st.znak, -0.05, CIEN.tkanina); g.lineWidth = Math.max(1, h * 0.017 * skala); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(...P(0, -hh * 0.42)); g.lineTo(...P(0, hh * 0.36)); g.moveTo(...P(-w * 0.7, -hh * 0.16)); g.lineTo(...P(w * 0.7, -hh * 0.16)); g.stroke();
    g.lineCap = 'round';
    if (m.prosto) return;
    if (m.lod === 2) {
      g.fillStyle = tonC(st.znak, -0.05, CIEN.tkanina);
      for (const [x, y] of [[0, -0.44], [0, 0.38], [-0.72, -0.16], [0.72, -0.16]]) {
        const [qx, qy] = P(x * (x ? w : 1), y * hh);
        g.beginPath(); g.arc(qx, qy, Math.max(0.6, h * 0.012 * skala), 0, TAU); g.fill();
      }
    }
    // złoty brzeg i guz
    g.strokeStyle = tonC(st.zloto, -0.1, CIEN.tkanina); g.lineWidth = Math.max(0.9, h * 0.012 * skala); g.stroke(tr);
    const u = kc;
    g.fillStyle = tonC(st.zloto, 0.15, CIEN.tkanina); g.beginPath(); g.arc(u.x, u.y, Math.max(0.8, h * 0.016 * skala), 0, TAU); g.fill();
    if (m.lod === 2) {
      // odblask lampki na guzie i ślady ciosów
      g.fillStyle = 'rgba(255,240,200,0.7)'; g.beginPath(); g.arc(u.x + h * 0.004, u.y - h * 0.005, Math.max(0.4, h * 0.004), 0, TAU); g.fill();
      g.strokeStyle = 'rgba(30,10,8,0.55)'; g.lineWidth = Math.max(0.4, h * 0.004);
      g.beginPath(); g.moveTo(...P(w * 0.45, hh * 0.08)); g.lineTo(...P(w * 0.2, hh * 0.2)); g.moveTo(...P(-w * 0.5, -hh * 0.3)); g.lineTo(...P(-w * 0.25, -hh * 0.36)); g.stroke();
    }
    if (st.bunt) poswiata(g, u.x, u.y, h * 0.08, [255, 60, 30], 0.18 + 0.08 * sin(czas * 0.004 + c.id));
  }, false, true);
}
