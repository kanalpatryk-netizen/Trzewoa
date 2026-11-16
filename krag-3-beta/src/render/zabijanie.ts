/**
 * CERBER ZABIJA (Krąg Trzeci, beta) — polecenie użytkownika (15.11): „Cerber ma być dużo bardziej brutalny, ma mieć
 * animacje zabijania innych (i zabijać dużo potępionych, a nie skupiać się na jednym czy dwóch przez całą grę), ma mieć
 * dużo możliwości rozszarpania czy zjedzenia kogoś i krwi ma być więcej”.
 *
 * Przy każdym postoju na kręgu (sim/krag.ts: zabiciaCerbera) Cerber zabija jednego żarłoka jednym z pięciu sposobów:
 *  0 — chwyta środkową paszczą, trzęsie nim i ciska trupem;   1 — dwie głowy chwytają i rozrywają go na pół;
 *  2 — podnosi i połyka w całości (zostaje ręka i krew);      3 — staje dęba, miażdży łapą i żre we trzy łby;
 *  4 — podrzuca w górę i łapie w paszczę, miażdżąc (głowa odpada).
 * Po zabójstwie zostają szczątki i kałuża krwi (render/potepieni.ts: rysujSzczatki), aż cień się odrodzi.
 */
import { rysujCerbera, pozaCerbera, type PozaCerbera } from './cerber';
import { rysujLudzika, pozaCzolga, pozaWPaszczy, pozaTrup, bryzgKrwi, kaluzaKrwi, type PozaLudzika } from './ludzik';
import { rysujOderwanaGlowe, rysujTrzewia, rysujOderwanaReke } from './zarlok-sprite';

type P = [number, number];
const gl = (t: number): number => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const zakres = (u: number, a: number, b: number): number => gl((u - a) / (b - a));
const dzwon = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

function naZiemi(ctx: CanvasRenderingContext2D, x: number, hV: number, p: PozaLudzika, t: number, zwrot = 1, skY = 1): void {
  const lezy = Math.abs(p.tulow) > 1.1;
  ctx.save();
  ctx.translate(x, -hV * (lezy ? 0.08 : 0.3));
  ctx.scale(zwrot, skY);
  rysujLudzika(ctx, hV, p, t);
  ctx.restore();
}
function wPaszczy(ctx: CanvasRenderingContext2D, m: P, hV: number, p: PozaLudzika, kat: number, t: number, skala = 1): void {
  ctx.save();
  ctx.translate(m[0], m[1]); ctx.rotate(kat);
  ctx.translate(-hV * 0.17 * skala, hV * 0.02);
  rysujLudzika(ctx, hV * skala, p, t);
  ctx.restore();
}
function kapie(ctx: CanvasRenderingContext2D, m: P, h: number, czas: number, moc = 1): void {
  ctx.save(); ctx.fillStyle = 'rgb(120,12,8)';
  for (let i = 0; i < 4 * moc; i++) {
    const f = ((czas / 600) + i * 0.27) % 1;
    ctx.beginPath(); ctx.ellipse(m[0] + (i - 1.5) * h * 0.04, m[1] + f * h * 0.9, h * 0.016, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function kawalki(ctx: CanvasRenderingContext2D, x: number, y: number, hV: number, czas: number, moc = 1): void {
  ctx.save();
  for (let i = 0; i < 6 * moc; i++) {
    const f = ((czas / 900) + i * 0.17) % 1;
    const a = -Math.PI / 2 + (((i * 37) % 10) / 10 - 0.5) * 1.6;
    const px = x + Math.cos(a) * hV * 0.8 * f, py = y + Math.sin(a) * hV * 0.8 * f + f * f * hV * 1.0;
    ctx.fillStyle = i % 2 ? 'rgb(150,40,36)' : 'rgb(110,10,8)';
    ctx.beginPath(); ctx.ellipse(px, py, hV * 0.04, hV * 0.025, f * 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}


/**
 * Tętnica: pulsujący strumień krwi z rany (łuk z grawitacją, krople na końcu). `x`, `y` — rana, `kat` — kierunek,
 * `moc` — zasięg (wzrost ofiary × moc), `czas` — ms (puls ok. 1,4 na sekundę).
 */
function tetnica(ctx: CanvasRenderingContext2D, x: number, y: number, kat: number, hV: number, czas: number, moc = 1): void {
  const puls = 0.55 + 0.45 * Math.max(0, Math.sin(czas / 110));
  const v = hV * 1.1 * moc * puls;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const f = i / 26;
    const px = x + Math.cos(kat) * v * f, py = y + Math.sin(kat) * v * f + f * f * hV * 0.9 * moc;
    if (py > 0) {
      // strumień bije w błoto: rozbryzg
      ctx.fillStyle = 'rgba(120,8,6,0.85)';
      ctx.beginPath(); ctx.ellipse(px, -hV * 0.01, hV * 0.1 * moc, hV * 0.02, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    const r = Math.max(1, hV * (0.032 - f * 0.018) * moc);
    ctx.fillStyle = i % 3 ? 'rgba(128,8,6,0.9)' : 'rgba(170,20,14,0.85)';
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.4, r, kat + f * 0.9, 0, Math.PI * 2); ctx.fill();
  }
  // krople odrywają się z końca strumienia
  for (let i = 0; i < 7; i++) {
    const f = ((czas / 380) + i * 0.143) % 1;
    const px = x + Math.cos(kat) * v * (1 + f * 0.4) + (((i * 37) % 10) / 10 - 0.5) * hV * 0.2;
    const py = y + Math.sin(kat) * v + hV * 0.9 * moc + f * f * hV * 0.8;
    if (py > 0) continue;
    ctx.fillStyle = 'rgb(118,8,6)';
    ctx.beginPath(); ctx.ellipse(px, py, Math.max(1, hV * 0.016), Math.max(1.5, hV * 0.03), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Krwawa mgiełka przy rozerwaniu: czerwony obłok rośnie i rzednie (`k` 0…1). */
function mgielka(ctx: CanvasRenderingContext2D, x: number, y: number, hV: number, k: number): void {
  if (k <= 0 || k >= 1) return;
  const R = hV * (0.3 + k * 0.9);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(150,12,8,${0.55 * (1 - k)})`); g.addColorStop(0.6, `rgba(110,8,6,${0.25 * (1 - k)})`); g.addColorStop(1, 'rgba(90,6,4,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
}

/** Strzępy: kawałki mięsa, skóry z tłuszczem i jelit lecą łukami, zostawiając krwawe smugi (`k` 0…1 od rozerwania). */
function strzepy(ctx: CanvasRenderingContext2D, x: number, y: number, hV: number, k: number, ziarno: number, moc = 1): void {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  const n = Math.round(9 * moc);
  for (let i = 0; i < n; i++) {
    const r1 = ((ziarno * 31 + i * 17) % 100) / 100, r2 = ((ziarno * 13 + i * 29) % 100) / 100;
    const a = -Math.PI / 2 + (r1 - 0.5) * 2.6;
    const v = hV * (0.6 + r2 * 1.1) * moc;
    const r = hV * (0.025 + r2 * 0.035);
    // tor do chwili upadku na grunt (y = 0), potem leży
    let kk = k, py = y + Math.sin(a) * v * kk + kk * kk * hV * 1.6;
    if (py > -r * 0.4) {
      const A = hV * 1.6, B = Math.sin(a) * v, C = y + r * 0.4;
      const kz = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
      kk = Math.max(0, Math.min(k, kz)); py = -r * 0.4;
    }
    const px = x + Math.cos(a) * v * kk;
    // smuga za kawałkiem
    ctx.strokeStyle = 'rgba(110,8,6,0.5)'; ctx.lineWidth = Math.max(1, r * 0.6);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * v * 0.12, py - Math.sin(a) * v * 0.12 - k * hV * 0.3); ctx.stroke();
    ctx.save(); ctx.translate(px, py); ctx.rotate(kk * 9 + i);
    if (i % 4 === 0) {
      // strzęp jelita: gruba, mokra pętla z ciemnym obrysem
      for (const [w, kol] of [[r * 1.15, 'rgb(70,14,12)'], [r * 0.8, 'rgb(150,80,76)']] as [number, string][]) {
        ctx.strokeStyle = kol; ctx.lineWidth = Math.max(1.4, w); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.bezierCurveTo(-r * 0.8, -r * 1.6, r * 0.6, r * 1.4, r * 1.5, -r * 0.3); ctx.stroke();
      }
    } else {
      ctx.fillStyle = i % 3 ? 'rgb(112,16,12)' : 'rgb(150,40,30)';
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.4, -r * 1.1, r * 0.8, -r * 0.5); ctx.quadraticCurveTo(r * 1.2, r * 0.6, 0, r * 0.8); ctx.closePath(); ctx.fill();
      if (i % 3 === 0) { ctx.fillStyle = 'rgb(176,140,80)'; ctx.fillRect(-r * 0.5, -r * 0.4, r * 0.7, r * 0.25); }
      ctx.fillStyle = 'rgba(255,190,170,0.35)'; ctx.fillRect(-r * 0.3, -r * 0.6, r * 0.35, r * 0.15);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** Jelita rozciągnięte między połówkami rozrywanego ciała: zwisający, kołyszący się sznur. */
function sznurJelit(ctx: CanvasRenderingContext2D, a: P, b: P, hV: number, czas: number, k: number): void {
  if (k <= 0) return;
  const zwis = hV * (0.25 + 0.2 * Math.sin(czas / 260)) * k;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [szer, kol] of [[hV * 0.05, 'rgb(84,20,18)'], [hV * 0.034, 'rgb(156,90,86)']] as [number, string][]) {
    ctx.strokeStyle = kol; ctx.lineWidth = Math.max(1.4, szer);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    ctx.bezierCurveTo(a[0] + (b[0] - a[0]) * 0.3, a[1] + zwis, a[0] + (b[0] - a[0]) * 0.7, b[1] + zwis * 1.1, b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Rozbryzg krwi na ziemi wokół miejsca rzezi: promieniste smugi i krople (`k` 0…1 — rośnie). */
function rozbryzgNaZiemi(ctx: CanvasRenderingContext2D, x: number, y: number, hV: number, k: number, ziarno: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(100,6,4,0.85)';
  for (let i = 0; i < 14; i++) {
    const r1 = ((ziarno * 7 + i * 13) % 100) / 100, r2 = ((ziarno * 11 + i * 23) % 100) / 100;
    const s = (r1 < 0.5 ? -1 : 1) * (0.5 + r2) * hV * 1.3 * k;
    const dl = hV * (0.08 + r2 * 0.2) * k;
    ctx.beginPath(); ctx.ellipse(x + s, y + hV * 0.015, dl, Math.max(1, hV * 0.012), 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Cerber zabija: `ctx` w stopach Cerbera, zwrot już ustawiony (pyski w +x). `hC` — wysokość Cerbera, `hV` — wzrost
 * ofiary, `vx` — gdzie leży ofiara (piksele przed nim), `u` 0…1 — postęp zabijania, `czas` — ms ekranu.
 * Zwraca pozę, w której rysowano Cerbera (do dalszych efektów).
 */
export function scenaZabijania(ctx: CanvasRenderingContext2D, hC: number, hV: number, vx: number, wariant: number, u: number, czas: number): PozaCerbera {
  const t = czas / 1000;
  const p = pozaCerbera();
  p.czas = czas; p.oddech = 0.5 + 0.5 * Math.sin(t * 5); p.szal = 0.4;
  p.ogon = Math.sin(t * 2.2) * 0.9;
  p.glowy.forEach((g, i) => { g.pochyl = 0.45 + 0.05 * i; g.paszcza = 0.6; g.wysun = 0.2; });
  const potrzas = Math.sin(czas / 45);
  // pozy głów przed rysunkiem
  if (wariant === 0) {
    const g = p.glowy[1];
    if (u < 0.12) { const k = u / 0.12; g.pochyl = mix(0.3, 0.8, k); g.paszcza = 0.9; g.wysun = mix(0, 0.6, k); }
    else if (u < 0.7) { g.pochyl = 0.35 + potrzas * 0.45; g.paszcza = 0.3; g.wysun = 0.35; }
    else { g.pochyl = mix(0.35, -0.7, zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.3 : 0.9; g.wysun = 0.1; }
  } else if (wariant === 1) {
    const roz = zakres(u, 0.18, 0.42);
    p.glowy[0].pochyl = u < 0.15 ? mix(0.3, 0.8, u / 0.15) : mix(0.6, -0.4, roz) + (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[0].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[0].wysun = 0.4;
    p.glowy[2].pochyl = u < 0.15 ? mix(0.3, 0.9, u / 0.15) : mix(0.8, 1.3, roz) - (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[2].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[2].wysun = mix(0.5, 0.7, roz);
    p.glowy[1].pochyl = -0.3; p.glowy[1].paszcza = 0.8 * dzwon(u, 0.4, 0.7) + 0.2;
    p.deba = 0.12 * roz;
  } else if (wariant === 2) {
    const g = p.glowy[1];
    if (u < 0.15) { g.pochyl = mix(0.3, 0.85, u / 0.15); g.paszcza = 0.9; g.wysun = 0.6; }
    else if (u < 0.45) { g.pochyl = mix(0.85, -0.8, zakres(u, 0.15, 0.45)); g.paszcza = 0.35; g.wysun = 0.3; }
    else { g.pochyl = -0.8 + 0.1 * Math.sin(t * 8); g.paszcza = u < 0.75 ? 0.5 + 0.4 * Math.abs(Math.sin(t * 9)) : 0.15; g.wysun = 0.1; }
    p.deba = 0.2 * dzwon(u, 0.3, 0.8);
  } else if (wariant === 3) {
    p.deba = u < 0.22 ? zakres(u, 0, 0.18) * 0.75 : mix(0.75, 0, zakres(u, 0.22, 0.27));
    if (u > 0.3) p.glowy.forEach((g, i) => { g.pochyl = 0.85 + 0.1 * Math.sin(t * 9 + i * 2); g.paszcza = 0.3 + 0.6 * Math.abs(Math.sin(t * 7 + i * 1.7)); g.wysun = 0.55 + 0.15 * Math.sin(t * 5 + i); });
  } else {
    const g = p.glowy[1];
    if (u < 0.12) { g.pochyl = mix(0.3, 0.8, u / 0.12); g.paszcza = 0.9; g.wysun = 0.6; }
    else if (u < 0.42) { g.pochyl = -0.65; g.paszcza = 1; g.wysun = 0.2; }
    else { g.pochyl = -0.4 + potrzas * 0.35 * (1 - zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.25 : 0.7; g.wysun = 0.25; }
  }
  // kałuża krwi rośnie od chwili rany
  const rana = wariant === 3 ? 0.25 : wariant === 4 ? 0.42 : wariant === 1 ? 0.42 : 0.15;
  kaluzaKrwi(ctx, vx, hV * 0.02, hV * (wariant === 3 || wariant === 1 ? 1.45 : 1.1), zakres(u, rana, rana + 0.3), wariant);
  rozbryzgNaZiemi(ctx, vx, hV * 0.02, hV, zakres(u, rana, rana + 0.15), wariant + 3);
  // ofiara na ziemi pod łapą (wariant 3) — przed Cerberem
  if (wariant === 3) {
    if (u < 0.25) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.6, 3), t, 1);
    else {
      naZiemi(ctx, vx, hV, { ...pozaTrup(3), krew: 1 }, t, 1, mix(1, 0.6, zakres(u, 0.25, 0.3)));
      if (u > 0.3) kawalki(ctx, vx, -hV * 0.15, hV, czas, 2.5);
      mgielka(ctx, vx, -hV * 0.15, hV, zakres(u, 0.24, 0.42));
      strzepy(ctx, vx, -hV * 0.1, hV, zakres(u, 0.25, 0.5), 5, 1.4);
    }
  }
  const m = rysujCerbera(ctx, hC, p).paszcze;
  const t2 = t * 1.0;
  if (wariant === 0) {
    if (u < 0.12) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.8, 1), t, -1);
    else if (u < 0.7) {
      wPaszczy(ctx, m[1], hV, { ...pozaWPaszczy(t2, 1), brak: u > 0.4 ? { trzewia: true } : undefined }, Math.PI / 2 + potrzas * 0.5, t);
      bryzgKrwi(ctx, m[1][0], m[1][1], hV, ((u - 0.12) * 12) % 1, -1.2 + potrzas, 2, Math.floor(u * 12), 0);
      kapie(ctx, m[1], hV, czas, 2.5);
      if (u > 0.3) tetnica(ctx, m[1][0] - hV * 0.1, m[1][1] + hV * 0.15, -2.2 + potrzas * 0.6, hV, czas, 0.9);
      mgielka(ctx, m[1][0], m[1][1], hV, zakres(u, 0.14, 0.34));
      strzepy(ctx, m[1][0], m[1][1], hV, zakres(u, 0.38, 0.62), 9, 1);
    } else if (u < 0.85) {
      const f = zakres(u, 0.7, 0.85);
      ctx.save(); ctx.translate(mix(m[1][0], vx + hV * 0.5, f), mix(m[1][1], -hV * 0.1, f) - Math.sin(f * Math.PI) * hC * 0.5); ctx.rotate(f * 5);
      rysujLudzika(ctx, hV, { ...pozaTrup(1), brak: { trzewia: true } }, t); ctx.restore();
    }
  } else if (wariant === 1) {
    const sr: P = [(m[0][0] + m[2][0]) / 2, (m[0][1] + m[2][1]) / 2];
    if (u < 0.15) naZiemi(ctx, vx, hV, pozaCzolga(t, 2, 2), t, -1);
    else if (u < 0.42) {
      wPaszczy(ctx, sr, hV, { ...pozaWPaszczy(t2, 1), krew: 0.6 }, Math.PI / 2 + potrzas * 0.15, t);
      kapie(ctx, sr, hV, czas, 1);
    } else if (u < 0.8) {
      wPaszczy(ctx, m[0], hV, { ...pozaWPaszczy(t2, 0.5), brak: { polowa: 'gora' } }, Math.PI / 2 + 0.7 + potrzas * 0.3, t);
      wPaszczy(ctx, m[2], hV, { ...pozaWPaszczy(t2, 0.5), brak: { polowa: 'dol' } }, Math.PI / 2 - 0.5 - potrzas * 0.3, t);
      bryzgKrwi(ctx, sr[0], sr[1], hV * 1.5, zakres(u, 0.42, 0.62), -Math.PI / 2, 3.4, 11, 0);
      kapie(ctx, m[0], hV, czas, 3); kapie(ctx, m[2], hV, czas, 3);
      sznurJelit(ctx, [m[0][0] + hV * 0.2, m[0][1] + hV * 0.2], [m[2][0] - hV * 0.15, m[2][1] + hV * 0.15], hV, czas, 1 - zakres(u, 0.62, 0.72));
      mgielka(ctx, sr[0], sr[1], hV * 1.4, zakres(u, 0.42, 0.62));
      strzepy(ctx, sr[0], sr[1], hV, zakres(u, 0.42, 0.7), 1, 1.6);
      tetnica(ctx, m[0][0] + hV * 0.25, m[0][1] + hV * 0.2, 0.6, hV, czas, 0.8);
      tetnica(ctx, m[2][0] - hV * 0.2, m[2][1] + hV * 0.15, Math.PI - 0.7, hV, czas + 300, 0.7);
    } else {
      const f = zakres(u, 0.8, 0.9);
      naZiemi(ctx, mix(m[0][0], vx - hV * 0.5, f), hV, { ...pozaTrup(2), brak: { polowa: 'gora' } }, t, 1);
      naZiemi(ctx, mix(m[2][0], vx + hV * 0.6, f), hV, { ...pozaTrup(4), brak: { polowa: 'dol' } }, t, -1);
    }
  } else if (wariant === 2) {
    if (u < 0.15) naZiemi(ctx, vx, hV, pozaCzolga(t, 2, 5), t, -1);
    else if (u < 0.75) {
      const lyk = zakres(u, 0.45, 0.75);
      wPaszczy(ctx, m[1], hV, { ...pozaWPaszczy(t2, 1 - lyk * 0.7), krew: 0.9, brak: u > 0.55 ? { rekaL: true } : undefined }, Math.PI / 2 - 1.1 * zakres(u, 0.15, 0.45), t, 1 - lyk * 0.85);
      kapie(ctx, m[1], hV, czas, 2);
      if (u > 0.55 && u < 0.75) { bryzgKrwi(ctx, m[1][0], m[1][1], hV, (u - 0.55) / 0.2, 0.3, 1.8, 21, 0); tetnica(ctx, m[1][0], m[1][1] + hV * 0.05, 1.2, hV, czas, 0.6); }
      strzepy(ctx, m[1][0], m[1][1], hV, zakres(u, 0.5, 0.75), 21, 0.8);
    } else kapie(ctx, m[1], hV, czas, 1);
  } else if (wariant === 3) {
    for (const q of m) kapie(ctx, q, hV, czas, 1);
    if (u > 0.22 && u < 0.4) bryzgKrwi(ctx, vx, -hV * 0.1, hV * 1.4, (u - 0.22) / 0.18, -Math.PI / 2, 2.6, 13, 0);
  } else {
    if (u < 0.12) naZiemi(ctx, vx, hV, pozaCzolga(t, 1.8, 7), t, -1);
    else if (u < 0.42) {
      // w górę i z powrotem w paszczę
      const f = zakres(u, 0.12, 0.42);
      const wys = Math.sin(f * Math.PI) * hC * 1.1;
      ctx.save(); ctx.translate(mix(m[1][0], m[1][0] + hV * 0.2, f), m[1][1] - wys); ctx.rotate(f * 9);
      rysujLudzika(ctx, hV, { ...pozaWPaszczy(t2, 1), usta: 1 }, t); ctx.restore();
    } else if (u < 0.8) {
      wPaszczy(ctx, m[1], hV, { ...pozaWPaszczy(t2, 0.3), krew: 1, brak: u > 0.55 ? { glowa: true } : undefined }, Math.PI / 2 + potrzas * 0.4, t);
      if (u > 0.55) {
        // odgryziona głowa leci na ziemię
        const f = zakres(u, 0.55, 0.7);
        ctx.save(); ctx.translate(mix(m[1][0], vx + hV * 0.9, f), mix(m[1][1], -hV * 0.08, f) - Math.sin(f * Math.PI) * hV * 0.6); rysujOderwanaGlowe(ctx, hV, f * 7); ctx.restore();
      }
      bryzgKrwi(ctx, m[1][0], m[1][1], hV * 1.3, zakres(u, 0.42, 0.62), -1.0, 3, 17, 0);
      kapie(ctx, m[1], hV, czas, 3);
      if (u > 0.55) tetnica(ctx, m[1][0] + hV * 0.15, m[1][1] - hV * 0.1, -0.9, hV, czas, 1.1);
      mgielka(ctx, m[1][0], m[1][1], hV, zakres(u, 0.55, 0.72));
      strzepy(ctx, m[1][0], m[1][1], hV, zakres(u, 0.55, 0.8), 17, 1);
    } else {
      const f = zakres(u, 0.8, 0.9);
      naZiemi(ctx, vx, hV, { ...pozaTrup(5), brak: { glowa: true } }, t, 1);
      void f;
    }
  }
  return p;
}

/** Szczątki po zabójstwie (wariant) — `ctx` w punkcie na gruncie, `a` — krycie (zanikanie), `t` — sekundy. */
export function rysujSzczatki(ctx: CanvasRenderingContext2D, hV: number, wariant: number, a: number, t: number, ziarno: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  kaluzaKrwi(ctx, 0, hV * 0.02, hV * (wariant === 3 || wariant === 1 ? 1.15 : 0.85), 1, ziarno);
  if (wariant === 0) {
    naZiemi(ctx, hV * 0.5, hV, { ...pozaTrup(1), brak: { trzewia: true } }, t, 1);
    ctx.save(); ctx.translate(hV * 0.95, -hV * 0.02); rysujTrzewia(ctx, hV, 0.1); ctx.restore();
  } else if (wariant === 1) {
    naZiemi(ctx, -hV * 0.5, hV, { ...pozaTrup(2), brak: { polowa: 'gora' } }, t, 1);
    naZiemi(ctx, hV * 0.6, hV, { ...pozaTrup(4), brak: { polowa: 'dol' } }, t, -1);
    ctx.save(); ctx.translate(hV * 0.05, -hV * 0.02); rysujTrzewia(ctx, hV * 1.2, -0.05); ctx.restore();
  } else if (wariant === 2) {
    // została tylko ręka
    ctx.save(); ctx.translate(hV * 0.2, -hV * 0.06);
    if (rysujOderwanaReke(ctx, hV, -1.45, 0.9)) { ctx.restore(); ctx.restore(); return; }
    ctx.rotate(1.3);
    ctx.strokeStyle = 'rgba(16,10,8,0.96)'; ctx.lineWidth = hV * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hV * 0.3); ctx.stroke();
    ctx.strokeStyle = 'rgb(176,152,124)'; ctx.lineWidth = hV * 0.07;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hV * 0.3); ctx.stroke();
    ctx.fillStyle = 'rgb(128,14,10)'; ctx.beginPath(); ctx.arc(0, 0, hV * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (wariant === 3) {
    naZiemi(ctx, 0, hV, { ...pozaTrup(3), krew: 1, brak: { trzewia: true, rekaP: true } }, t, 1, 0.6);
    for (const [x, k] of [[-0.75, 0.2], [0.7, -0.15]]) { ctx.save(); ctx.translate(hV * x, -hV * 0.01); rysujTrzewia(ctx, hV * 0.9, k); ctx.restore(); }
    ctx.fillStyle = 'rgb(110,10,8)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-hV * 0.8 + i * hV * 0.3, -hV * 0.02, hV * 0.05, hV * 0.025, i, 0, Math.PI * 2); ctx.fill(); }
  } else {
    naZiemi(ctx, 0, hV, { ...pozaTrup(5), brak: { glowa: true } }, t, 1);
    // odgryziona głowa obok
    ctx.save(); ctx.translate(hV * 0.9, -hV * 0.06);
    const jest = rysujOderwanaGlowe(ctx, hV, 1.9);
    ctx.restore();
    if (jest) { ctx.restore(); return; }
    ctx.fillStyle = 'rgb(176,152,124)'; ctx.strokeStyle = 'rgba(16,10,8,0.96)'; ctx.lineWidth = Math.max(1, hV * 0.012);
    ctx.beginPath(); ctx.arc(hV * 0.9, -hV * 0.08, hV * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgb(128,14,10)'; ctx.beginPath(); ctx.ellipse(hV * 0.9, -hV * 0.0, hV * 0.08, hV * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Krótki opis sposobu (do kroniki i testów). */
export const SPOSOBY_ZABIJANIA = ['szarpie i ciska trupem', 'rozrywa na pół', 'połyka w całości', 'miażdży łapą i żre', 'podrzuca i chwyta w paszczę'];
void mix;
