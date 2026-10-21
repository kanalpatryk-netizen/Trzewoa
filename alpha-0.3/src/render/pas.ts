/**
 * PAS KART (Alpha 0.3) — dolny margines zamiast dawnego panelu (medaliony, pigułki rozkazów, wstęga, Otchłań).
 *  - wizja Patryka: rozkazy + karty imiennych postaci (render/karty.ts);
 *  - wizja Pawła: rozkazy + medaliony ról + talia i karty tarota (render/tarot.ts).
 * Co się przeniosło (nic nie zniknęło):
 *  - komputer: rozkazy w kolumnie z lewej strony pasa, oddanie i relikwiarz krwi w bloku z prawej; przyciski
 *    poleceń i kronika — w górnym marginesie (render/przyciski.ts, plate.ts: drawChronicle);
 *  - telefon poziomo: rozkazy pod zwiniętą tabliczką „rozkazy” (menu nad pasem), oddanie i krew w górnym pasku,
 *    przyciski jak dawniej w prawej kolumnie, kronika pod przyciskiem „zapiski”;
 *  - telefon pionowo: karty w dwóch rzędach po trzy, pod nimi rząd: rozkazy, krew, oddanie; przyciski w lewej
 *    kolumnie pod rytami.
 * Rysunek tabliczek i kart: ciemna tablica z cienką złotą linią, krój EB Garamond (SERIF). Tekst nigdy nie jest
 * ściskany — za długi dostaje krótszą wersję albo wielokropek (dopasuj, skroc, lam).
 */
import type { Sim } from '../sim/sim';
import type { Plate, Obszar } from './plate';
import { SERIF } from './ink';
import { PAS } from '../nastawy/ekran';
import { WARIANT } from '../nastawy/wariant';
import { FRESK } from '../nastawy/barwy';
import { rolaPostaci } from '../sim/lud';
import { czoloDrogi } from '../sim/pielgrzymka';
import { linaPrzecieta, sklejajacy } from '../sim/lina-wiadra';
import { wolnoRuszac } from './nastroj';

export interface UkladPasa {
  /** kolumna rozkazów (komputer) albo zwinięta tabliczka „rozkazy” (telefon) */
  rozkazy: Obszar;
  zwiniete: boolean;
  /** karty postaci (Patryk) albo miejsca na karty tarota (Paweł) */
  karty: Obszar;
  wiersze: number;
  /** wizja Pawła: medaliony ról i talia */
  medaliony?: Obszar;
  talia?: Obszar;
  oddanie: Obszar;
  krew: Obszar;
  /** telefon (palec) — cele dotyku co najmniej 44 px, szczegóły po przytrzymaniu */
  telefon: boolean;
}

/** Telefon pionowo: wysokość dolnego marginesu (wizja Pawła ma o rząd medalionów więcej). */
export function dolPasaPion(): number {
  const karty = WARIANT === 'pawel' ? PAS.pionMedalionyH + 6 + PAS.pionTarotH * 2 + 6 : PAS.pionKartaH * 2 + 6;
  return 12 + karty + 10 + PAS.pionRzadH + 8;
}

export function ukladPasa(p: Plate, vh: number): UkladPasa {
  const mt = vh - p.bottom;
  const pawel = WARIANT === 'pawel';
  if (p.waski) {
    const vw = p.x + p.w + p.right;
    const y0 = mt + 12;
    const rzadY = vh - 8 - PAS.pionRzadH;
    const rozkazy = { x: 8, y: rzadY, w: 112, h: PAS.pionRzadH };
    const kw = (vw - 136) / 2 - 6;
    const krew = { x: 128, y: rzadY, w: kw, h: PAS.pionRzadH };
    const oddanie = { x: krew.x + kw + 12, y: rzadY, w: vw - 8 - (krew.x + kw + 12), h: PAS.pionRzadH };
    if (pawel) {
      const mw = (vw - 16) * 0.6;
      return {
        rozkazy, zwiniete: true, telefon: true, krew, oddanie, wiersze: 2,
        medaliony: { x: 8, y: y0, w: mw, h: PAS.pionMedalionyH },
        talia: { x: 8 + mw + 8, y: y0, w: vw - 16 - mw - 8, h: PAS.pionMedalionyH },
        karty: { x: 8, y: y0 + PAS.pionMedalionyH + 6, w: vw - 16, h: PAS.pionTarotH * 2 + 6 },
      };
    }
    return { rozkazy, zwiniete: true, telefon: true, krew, oddanie, wiersze: 2, karty: { x: 8, y: y0, w: vw - 16, h: PAS.pionKartaH * 2 + 6 } };
  }
  if (p.niski) {
    // pas sięga od lewej do prawej krawędzi ekranu — pod kolumną rytów i kolumną przycisków jest wolne miejsce
    const vw = p.x + p.w + p.right;
    const y0 = mt + 12, h = vh - 4 - y0;
    const rozkazy = { x: 6, y: y0, w: PAS.poziomRozkazyW, h };
    // oddanie i krew w górnym pasku — przed klepsydrą w prawym rogu
    const krew = { x: p.x + p.w - 58 - 118, y: 3, w: 118, h: Math.max(20, p.top - 6) };
    const oddanie = { x: krew.x - 12 - 100, y: 3, w: 100, h: krew.h };
    const x0 = 6 + PAS.poziomRozkazyW + 8, w0 = vw - 6 - x0;
    if (pawel) {
      const mw = Math.round(h * 0.78) * 3, tw = Math.round(h * 1.6);
      return {
        rozkazy, zwiniete: true, telefon: true, krew, oddanie, wiersze: 1,
        medaliony: { x: x0, y: y0, w: mw, h }, talia: { x: x0 + mw + 6, y: y0, w: tw, h },
        karty: { x: x0 + mw + tw + 14, y: y0, w: w0 - mw - tw - 14, h },
      };
    }
    return { rozkazy, zwiniete: true, telefon: true, krew, oddanie, wiersze: 1, karty: { x: x0, y: y0, w: w0, h } };
  }
  // komputer
  const y0 = mt + 22, y1 = vh - 10, h = y1 - y0;
  const rozkazy = { x: p.x, y: y0, w: PAS.rozkazyW, h };
  const sx = p.x + p.w - PAS.statusW;
  const bok = Math.max(30, Math.min(44, h * 0.27));
  const oddanie = { x: sx + 8, y: y0 + 2, w: PAS.statusW - 8, h: bok };
  const krew = { x: sx + 8, y: y0 + bok + 14, w: PAS.statusW - 8, h: y1 - (y0 + bok + 14) };
  const x0 = p.x + PAS.rozkazyW + 14, w0 = p.w - PAS.rozkazyW - PAS.statusW - 28;
  if (pawel) {
    const r = Math.max(18, Math.min(26, h * 0.2));
    const mw = 3 * (r * 2 + 16), tw = Math.round(h * 0.6);
    // karty tarota w dwóch rzędach po trzy (poziome — mieści się pełna nazwa i skutek)
    return {
      rozkazy, zwiniete: false, telefon: false, krew, oddanie, wiersze: 2,
      medaliony: { x: x0, y: y0, w: mw, h }, talia: { x: x0 + mw + 10, y: y0, w: tw, h },
      karty: { x: x0 + mw + tw + 22, y: y0, w: w0 - mw - tw - 22, h },
    };
  }
  return { rozkazy, zwiniete: false, telefon: false, krew, oddanie, wiersze: 1, karty: { x: x0, y: y0, w: w0, h } };
}

/** Miejsca na karty w obszarze: `ile` kart w `wiersze` rzędach. */
export function miejscaKart(o: Obszar, ile: number, wiersze: number, odstep: number): Obszar[] {
  const kol = Math.ceil(ile / wiersze);
  const w = (o.w - odstep * (kol - 1)) / kol;
  const h = (o.h - odstep * (wiersze - 1)) / wiersze;
  const out: Obszar[] = [];
  for (let i = 0; i < ile; i++) {
    const r = Math.floor(i / kol), k = i % kol;
    out.push({ x: o.x + k * (w + odstep), y: o.y + r * (h + odstep), w, h });
  }
  return out;
}

// ---------------------------------------------------------------- tekst bez ściskania

/** Pierwsza wersja, która się mieści — albo ostatnia z wielokropkiem. */
export function dopasuj(ctx: CanvasRenderingContext2D, wersje: string[], maxW: number): string {
  for (const t of wersje) if (ctx.measureText(t).width <= maxW) return t;
  return skroc(ctx, wersje[wersje.length - 1], maxW);
}

/** Ucina tekst wielokropkiem, żeby zmieścił się w `maxW` (pismo zostaje w swoim rozmiarze). */
export function skroc(ctx: CanvasRenderingContext2D, t: string, maxW: number): string {
  if (ctx.measureText(t).width <= maxW) return t;
  let s = t;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}

/** Łamie tekst na linijki do `maxW`; najwyżej `maks` linijek (ostatnia z wielokropkiem). */
export function lam(ctx: CanvasRenderingContext2D, t: string, maxW: number, maks = 99): string[] {
  const slowa = t.split(/\s+/);
  const out: string[] = [];
  let l = '';
  for (const s of slowa) {
    const p = l ? `${l} ${s}` : s;
    if (ctx.measureText(p).width <= maxW || !l) l = p;
    else { out.push(l); l = s; }
  }
  if (l) out.push(l);
  if (out.length > maks) {
    const reszta = out.slice(maks - 1).join(' ');
    out.length = maks - 1;
    out.push(skroc(ctx, reszta, maxW));
  }
  return out.map((x) => skroc(ctx, x, maxW));
}

// ---------------------------------------------------------------- tablica: ciemny kamień z cienką złotą linią

export type StanTablicy = 'zwykla' | 'pod' | 'wlaczona' | 'uspiona' | 'pilna';

/** Ciemna tablica z cienką złotą linią wewnątrz — ta sama rodzina co karty wydarzeń i atlas. */
export function tablica(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stan: StanTablicy = 'zwykla', czas = 0): void {
  ctx.save();
  // cień pod kamieniem
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 1.5, y + 2.5, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const jas = stan === 'pod' ? 1.25 : stan === 'wlaczona' ? 1.35 : stan === 'uspiona' ? 0.7 : 1;
  g.addColorStop(0, `rgba(${Math.round(44 * jas)},${Math.round(33 * jas)},${Math.round(25 * jas)},0.97)`);
  g.addColorStop(1, `rgba(${Math.round(20 * jas)},${Math.round(14 * jas)},${Math.round(11 * jas)},0.97)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // zewnętrzna krawędź sinopią, wewnątrz cienka złota linia
  ctx.strokeStyle = FRESK.sinopia; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const a = stan === 'wlaczona' ? 0.95 : stan === 'pod' ? 0.85 : stan === 'uspiona' ? 0.25 : 0.5;
  ctx.strokeStyle = `rgba(214,178,112,${a})`; ctx.lineWidth = 1;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  // narożne nacięcia ryciny
  ctx.strokeStyle = `rgba(214,178,112,${a * 0.8})`;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x + 3.5, y + 3.5, 1, 1], [x + w - 3.5, y + 3.5, -1, 1], [x + 3.5, y + h - 3.5, 1, -1], [x + w - 3.5, y + h - 3.5, -1, -1]]) {
    ctx.moveTo(cx + sx * 5, cy); ctx.lineTo(cx, cy + sy * 5);
  }
  ctx.stroke();
  if (stan === 'pilna') {
    const puls = wolnoRuszac() ? 0.5 + 0.5 * Math.sin(czas * 0.006) : 0.7;
    ctx.shadowColor = `rgba(230,60,40,${0.5 + 0.4 * puls})`; ctx.shadowBlur = 8 + 10 * puls;
    ctx.strokeStyle = `rgba(236,96,72,${0.6 + 0.35 * puls})`; ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
  }
  ctx.restore();
}

/** Tabliczka z napisem (rozkaz). Napis — pierwsza wersja, która się mieści. */
export function tabliczka(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wersje: string[], stan: StanTablicy, rozm: number, czas: number): void {
  tablica(ctx, x, y, w, h, stan, czas);
  ctx.save();
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = stan === 'uspiona' ? 'rgba(212,198,166,0.45)' : stan === 'wlaczona' ? '#f6e4b8' : FRESK.tekst;
  ctx.fillText(dopasuj(ctx, wersje, w - 14), x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------- rozkazy

export type AkcjaRozkazu = 'droga' | 'odwolaj' | 'odznacz' | 'pomieszczenia' | 'naprawa' | 'menuRozkazow';
export interface PoleRozkazu { akcja: AkcjaRozkazu; x: number; y: number; w: number; h: number }

interface Opcja { akcja: AkcjaRozkazu; wersje: string[]; stan: StanTablicy }

function opcjeRozkazow(sim: Sim, zaznaczeni: ReadonlySet<number>, planuje: boolean, klawisze: boolean): Opcja[] {
  const zazn = sim.creatures.filter((c) => !c.dead && zaznaczeni.has(c.id) && rolaPostaci(c));
  const robotnicy = zazn.filter((c) => rolaPostaci(c) === 'robotnik').length;
  const out: Opcja[] = [];
  // etap 4: lina wiadra przecięta — pierwszy, pulsuje, póki nikt jej nie skleja
  if (linaPrzecieta(sim)) {
    const wisi = sklejajacy(sim);
    const idzie = sim.creatures.some((c) => !c.dead && c.polecenie?.typ === 'naprawa');
    out.push(wisi ? { akcja: 'naprawa', wersje: ['skleja linę…'], stan: 'wlaczona' }
      : { akcja: 'naprawa', wersje: idzie ? ['napraw linę (idzie)', 'lina (idzie)'] : ['napraw linę wiadra', 'napraw linę'], stan: idzie ? 'zwykla' : 'pilna' });
  }
  out.push({ akcja: 'pomieszczenia', wersje: planuje ? ['planujesz… (B)', 'planujesz…'] : ['wyznacz pomieszczenie (B)', 'wyznacz pomieszczenie', 'pomieszczenie'], stan: planuje ? 'wlaczona' : 'zwykla' });
  out.push({ akcja: 'droga', wersje: ['kop drogę wiernych (G)', 'kop drogę wiernych', 'kop drogę'], stan: robotnicy && czoloDrogi(sim) >= 0 ? 'zwykla' : 'uspiona' });
  out.push({ akcja: 'odwolaj', wersje: ['odwołaj rozkaz (V)', 'odwołaj rozkaz', 'odwołaj'], stan: zazn.some((c) => c.polecenie) ? 'zwykla' : 'uspiona' });
  out.push({ akcja: 'odznacz', wersje: ['odznacz (Esc)', 'odznacz'], stan: zazn.length ? 'zwykla' : 'uspiona' });
  // telefon: bez podpowiedzi klawiszy w nawiasach
  if (!klawisze) for (const o of out) o.wersje = o.wersje.filter((w) => !/\(([A-Z]|Esc)\)$/.test(w));
  return out;
}

function podpowiedz(sim: Sim, zaznaczeni: ReadonlySet<number>): { tekst: string; zloto: boolean } {
  const zazn = sim.creatures.filter((c) => !c.dead && zaznaczeni.has(c.id) && rolaPostaci(c));
  if (!zazn.length) return { tekst: WARIANT === 'patryk' ? 'dotknij karty albo postaci — potem mapy: tam pójdzie' : 'dotknij medalionu albo postaci — potem mapy: tam pójdzie', zloto: false };
  const robotnicy = zazn.some((c) => rolaPostaci(c) === 'robotnik');
  const kto = zazn.length === 1 ? (zazn[0].imie ?? 'zaznaczony') : `zaznaczonych ${zazn.length}`;
  return { tekst: `${kto} — dotknij mapy: idź tam${robotnicy ? ' (skała: kop; plan: kuj)' : ''}`, zloto: true };
}

/**
 * Rozkazy dla zaznaczonych. Komputer: podpowiedź i tabliczki w kolumnie. Telefon: zwinięta tabliczka „rozkazy”,
 * a gdy `menu` — nad nią rozwinięte menu (cele dotyku po 44 px).
 */
export function rysujRozkazy(
  ctx: CanvasRenderingContext2D, sim: Sim, u: UkladPasa, zaznaczeni: ReadonlySet<number>,
  kursor: { x: number; y: number }, czas: number, planuje: boolean, menu: boolean,
): PoleRozkazu[] {
  const pola: PoleRozkazu[] = [];
  const opcje = opcjeRozkazow(sim, zaznaczeni, planuje, !u.telefon);
  const pod = (x: number, y: number, w: number, h: number) => kursor.x >= x && kursor.x <= x + w && kursor.y >= y && kursor.y <= y + h;
  const o = u.rozkazy;
  if (!u.zwiniete) {
    const rozm = 14;
    ctx.save();
    ctx.font = `italic 13px ${SERIF}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const pp = podpowiedz(sim, zaznaczeni);
    const linie = lam(ctx, pp.tekst, o.w, 2);
    ctx.fillStyle = pp.zloto ? 'rgba(246,216,142,0.92)' : 'rgba(214,198,166,0.66)';
    linie.forEach((l, i) => ctx.fillText(l, o.x, o.y + 12 + i * 16));
    ctx.restore();
    const hT = 28, odst = 6;
    let y = o.y + 12 + linie.length * 16 + 2;
    for (const op of opcje) {
      if (y + hT > o.y + o.h) break;
      const stan = op.stan === 'zwykla' && pod(o.x, y, o.w, hT) ? 'pod' : op.stan;
      tabliczka(ctx, o.x, y, o.w, hT, op.wersje, stan, rozm, czas);
      if (op.stan !== 'uspiona') pola.push({ akcja: op.akcja, x: o.x, y, w: o.w, h: hT });
      y += hT + odst;
    }
    return pola;
  }
  // telefon: zwinięta tabliczka
  const hT = Math.min(o.h, 44);
  const ty = o.y + (o.h - hT) / 2;
  const pilne = opcje.some((x) => x.stan === 'pilna');
  tabliczka(ctx, o.x, ty, o.w, hT, [menu ? 'rozkazy ▾' : 'rozkazy ▴', 'rozkazy'], menu ? 'wlaczona' : pilne ? 'pilna' : planuje ? 'wlaczona' : 'zwykla', 14, czas);
  pola.push({ akcja: 'menuRozkazow', x: o.x, y: ty, w: o.w, h: hT });
  if (!menu) return pola;
  // menu nad tabliczką: podpowiedź i rozkazy (tylko te, które teraz coś zrobią — reszta przygaszona)
  const w = Math.min(260, Math.max(200, o.w * 2.2));
  const hO = 44, odst = 6;
  ctx.save();
  ctx.font = `italic 13px ${SERIF}`;
  const pp = podpowiedz(sim, zaznaczeni);
  const linie = lam(ctx, pp.tekst, w - 20, 3);
  ctx.restore();
  const hPanel = 12 + linie.length * 17 + 6 + opcje.length * (hO + odst) + 6;
  const px = o.x, py = Math.max(4, ty - 8 - hPanel);
  tablica(ctx, px, py, w, hPanel, 'zwykla', czas);
  ctx.save();
  ctx.font = `italic 13px ${SERIF}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pp.zloto ? 'rgba(246,216,142,0.92)' : 'rgba(214,198,166,0.75)';
  linie.forEach((l, i) => ctx.fillText(l, px + 10, py + 22 + i * 17));
  ctx.restore();
  let y = py + 12 + linie.length * 17 + 6;
  for (const op of opcje) {
    tabliczka(ctx, px + 8, y, w - 16, hO, op.wersje, op.stan, 15, czas);
    if (op.stan !== 'uspiona') pola.push({ akcja: op.akcja, x: px + 8, y, w: w - 16, h: hO });
    y += hO + odst;
  }
  return pola;
}

// ---------------------------------------------------------------- szczegóły (dymek nad kartą)

export interface Wiersz { tekst: string; rozm: number; barwa: string; kursywa?: boolean; odstep?: number }

/**
 * Dymek ze szczegółami nad kartą (perki, wada, lore; karta tarota). Leży nad płytą (między `x0` a `x1` — nie wchodzi na
 * kolumny rytów i przycisków po bokach) i nie zasłania karty, o której mówi.
 */
export function dymekSzczegolow(ctx: CanvasRenderingContext2D, nad: Obszar, wiersze: Wiersz[], x0: number, x1: number, szer: number): Obszar {
  const vw = x1 + 8;
  const w = Math.min(szer, x1 - x0 - 16);
  const linie: { t: string; w: Wiersz; odstep: number }[] = [];
  ctx.save();
  for (const r of wiersze) {
    ctx.font = `${r.kursywa ? 'italic ' : ''}${r.rozm}px ${SERIF}`;
    lam(ctx, r.tekst, w - 24).forEach((t, i) => linie.push({ t, w: r, odstep: i === 0 ? r.odstep ?? 0 : 0 }));
  }
  let h = 14;
  for (const l of linie) h += l.w.rozm * 1.32 + l.odstep;
  h += 8;
  const x = Math.max(x0 + 8, Math.min(vw - w - 16, nad.x + nad.w / 2 - w / 2));
  const y = Math.max(6, nad.y - h - 8);
  tablica(ctx, x, y, w, h, 'wlaczona');
  let yy = y + 12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (const l of linie) {
    yy += l.odstep;
    ctx.font = `${l.w.kursywa ? 'italic ' : ''}${l.w.rozm}px ${SERIF}`;
    ctx.fillStyle = l.w.barwa;
    ctx.fillText(l.t, x + 12, yy);
    yy += l.w.rozm * 1.32;
  }
  ctx.restore();
  return { x, y, w, h };
}
