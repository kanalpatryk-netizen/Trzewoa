/**
 * POTĘPIENI ŻARŁOCY (Krąg Trzeci, beta) — tłum, który zalega cały krąg. Uwagi użytkownika (15.11): „nie ma tam reszty
 * potępionych, jesteśmy sami w tym piekle”, „potępieni mają być proporcjonalni do naszych postaci i każdy ma mieć
 * swoje animacje, ale mają być wszędzie, gdzie się tylko da (zgodnie z piekłem Dantego)”.
 *
 * Każdy potępiony to postać rysowana tym samym rysunkiem postaci co reszta gry (render/figury.ts: rysujPostac,
 * człekokształtna sylwetka „Ludzi”), tej samej wysokości co nasza szóstka, z własną czynnością i rytmem:
 *  - leży twarzą w błocie i drga (pieśń VI: „leżą na ziemi, przewracają się z boku na bok”),
 *  - klęczy i wyje w deszcz jak pies, żre błoto garściami, grzebie w nim palcami,
 *  - błąka się powoli po kręgu, dwóch szarpie się o resztki.
 * Gdzie: cały taras trzeciego kręgu (powierzchnia), a pod nim w trzewiach — w jaskiniach, ruinach, w sali i przy
 * pieczęci na dnie: to ci, których błoto wciągnęło w głąb (gracz to trzewia kręgu, które trawią żarłoków).
 * Czysto rysunek — nie wchodzą w drogę symulacji. Postacie przy szóstce, Cerberze i szybach są pomijane.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { makeCreature, type Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { SURFACE_Y } from '../sim/world';
import { ustawienia } from '../core/settings-store';
import { ukladKatedry } from './katedra';
import { bloczekWiadra, placKonwoju } from './konwoj';
import { gruntKregu, WIDOK_KREGU } from './krag-swiat';
import { cerberNaPowierzchni, zabiciaCerbera } from '../sim/krag';
import { rysujLudzika, pozaLezy, pozaWyje, pozaZre, pozaCzolga, pozaSzarpie, pozaIdzie, type PozaLudzika } from './ludzik';
import { rysujSzczatki } from './zabijanie';
import { wolnoRuszac } from './nastroj';

const los = (n: number): number => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Obrys cieni żarłoków: zgniła, przygaszona zieleń (nasza szóstka ma barwy ról). */
export const OBRYS = 'rgba(150,162,128,0.82)';

type Typ = 'lezy' | 'wyje' | 'zre' | 'grzebie' | 'blaka' | 'szarpie';

interface Potepiony {
  c: Creature; typ: Typ;
  /** gdzie stoi (x — środek stopy), rząd podłogi (y — kafel, na którym stoi), granice błąkania */
  x: number; y: number; xa: number; xb: number; v: number;
  /** na powierzchni (grunt z grzbietu) czy w trzewiach (podłoga jaskini) */
  gora: boolean;
}

interface Tlum { lista: Potepiony[]; nr: number }
const tlumy = new WeakMap<Sim, Tlum>();

function typLosowy(r: number, gora: boolean): Typ {
  if (gora) return r < 0.42 ? 'lezy' : r < 0.56 ? 'wyje' : r < 0.7 ? 'zre' : r < 0.8 ? 'grzebie' : r < 0.94 ? 'blaka' : 'szarpie';
  return r < 0.5 ? 'lezy' : r < 0.62 ? 'wyje' : r < 0.75 ? 'zre' : r < 0.85 ? 'grzebie' : 'blaka';
}

function nowy(t: Tlum, typ: Typ, x: number, y: number, gora: boolean, xa: number, xb: number, ziarno: number): Potepiony {
  const c = makeCreature(Race.HUMAN, -1, x, y, 100000 + t.nr++);
  c.face = los(ziarno * 3) < 0.5 ? 1 : -1;
  (c as { obrys?: string }).obrys = OBRYS;
  return { c, typ, x, y, xa, xb, v: (0.25 + los(ziarno * 5) * 0.35) * (los(ziarno * 7) < 0.5 ? 1 : -1), gora };
}

/** Rozmieszcza tłum raz na górę: taras (gęsto) i dno pustek pod ziemią, które były od początku (jaskinie, sala). */
function zbuduj(sim: Sim): Tlum {
  const w = sim.world;
  const t: Tlum = { lista: [], nr: 0 };
  const k = ukladKatedry(w), b = bloczekWiadra(w), plac = placKonwoju(w);
  // taras kręgu
  let i = 0;
  for (let x = 4.5; x < w.w - 11; x += 1.15 + los(i * 13) * 0.5, i++) {
    if (k && x > k.cx - 10 && x < k.cx + 8) continue;
    if (b && Math.abs(x - b.x) < 3.5) continue;
    if (plac && x > plac.x0 - 1.5 && x < plac.x1 + 1.5) continue;
    if (los(i * 17 + 3) < 0.12) continue;
    const typ = typLosowy(los(i * 29 + 1), true);
    const p = nowy(t, typ, x, SURFACE_Y - 1, true, x - 3, x + 3, i);
    t.lista.push(p);
    if (typ === 'szarpie') {
      // drugi do szarpaniny — twarzą w twarz
      const q = nowy(t, 'szarpie', x + 0.9, SURFACE_Y - 1, true, x, x, i + 999);
      p.c.face = 1; q.c.face = -1;
      t.lista.push(q); x += 1;
    }
  }
  // trzewia: dno pustek, które były od początku
  const sala = w.salaOltarza;
  let n = 0;
  for (let y = SURFACE_Y + 3; y < w.h - 3; y++) {
    let ostatni = -9;
    for (let x = 3; x < w.w - 12; x++) {
      if (!w.passable(x, y) || w.passable(x, y + 1) || !w.passable(x, y - 1)) continue;
      if (x - ostatni < 3) continue;
      const r = los(x * 7919 + y * 104729);
      // w sali mniej (tam mieszka szóstka) — i nie przy ołtarzu ani pod szybami
      const wSali = sala.x1 >= 0 && x >= sala.x0 && x <= sala.x1 && y >= sala.y0 - 2 && y <= sala.y1 + 2;
      if (wSali && (Math.abs(x - w.oltarz.x) < 6 || Math.abs(x - w.szybWiadraX) < 3 || r > 0.25)) continue;
      if (!wSali && r > 0.42) continue;
      ostatni = x;
      const typ = typLosowy(los(x * 31 + y * 7), false);
      // granice błąkania: dopóki jest podłoga i wolne powietrze
      let xa = x, xb = x;
      while (xa > 2 && w.passable(xa - 1, y) && !w.passable(xa - 1, y + 1) && x - xa < 6) xa--;
      while (xb < w.w - 3 && w.passable(xb + 1, y) && !w.passable(xb + 1, y + 1) && xb - x < 6) xb++;
      t.lista.push(nowy(t, typ, x + 0.5, y, false, xa + 0.5, xb + 0.5, n++));
    }
  }
  return t;
}

let ostatniCzas = 0;

/**
 * Rysuje potępionych w kadrze — przed mrokiem (w trzewiach widać tylko tych w świetle; taras nie jest w mroku).
 * Pomija tych, na których miejscu stanęło coś innego (wykopano im podłogę, zasypano, stoi tam nasza szóstka).
 */
export function rysujPotepionych(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  if (!WIDOK_KREGU.tlum) return;
  let t = tlumy.get(sim);
  if (!t) { t = zbuduj(sim); tlumy.set(sim, t); }
  const z = cam.zoom, w = sim.world;
  const h = Math.max(16, z * 1.9 * ustawienia.wielkoscSylwetek);
  const dt = Math.min(0.1, Math.max(0, (czas - ostatniCzas) / 1000));
  ostatniCzas = czas;
  const ruch = wolnoRuszac();
  const tik = WIDOK_KREGU.tik ?? sim.tick;
  const cer = cerberNaPowierzchni(sim, tik);
  const zabicia = zabiciaCerbera(sim, tik).filter((q) => tik < q.do);
  const lud = sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN);
  const xL = cam.toWorldX(0) - 2, xP = cam.toWorldX(cam.vw) + 2, yG = cam.toWorldY(0) - 3, yD = cam.toWorldY(cam.vh) + 2;
  ctx.save();
  for (const p of t.lista) {
    // błąkający się: krok w tę i z powrotem
    if (p.typ === 'blaka' && ruch) {
      p.x += p.v * dt;
      if (p.x < p.xa) { p.x = p.xa; p.v = Math.abs(p.v); }
      if (p.x > p.xb) { p.x = p.xb; p.v = -Math.abs(p.v); }
      p.c.face = p.v > 0 ? 1 : -1;
    }
    if (p.x < xL || p.x > xP || p.y < yG || p.y > yD) continue;
    const yStopy = p.gora ? gruntKregu(sim, p.x) : p.y + 1;
    if (!p.gora && (!w.passable(Math.floor(p.x), p.y) || w.passable(Math.floor(p.x), p.y + 1))) continue;
    if (p.gora && cer.jest && Math.abs(p.x - cer.x) < 2.6) continue;
    if (lud.some((c) => Math.abs(c.x - p.x) < 0.8 && Math.abs(c.y - p.y) < 1.5)) continue;
    // przy świeżym zabójstwie Cerbera — tu leżą szczątki, nie żywy (cień odrodzi się, gdy szczątki znikną)
    if (p.gora && zabicia.some((q) => Math.abs(q.x - p.x) < 1.9)) continue;
    p.c.x = p.x; p.c.y = yStopy - 1;
    const sx = cam.toScreenX(p.x), sy = cam.toScreenY(yStopy);
    const tt = czas / 1000 + p.c.id * 0.37;
    const poza = pozaTlumu(p.typ, tt, p.c.id);
    const lezy = Math.abs(poza.tulow) > 1.1;
    ctx.save();
    ctx.translate(sx, sy - h * (lezy ? 0.08 : poza.udoL > 1 ? 0.25 : 0.5));
    ctx.scale(p.c.face, 1);
    rysujLudzika(ctx, h, poza, tt);
    ctx.restore();
    // błoto oblepia stopy (na tarasie — kałuża)
    ctx.fillStyle = p.gora ? 'rgba(44,42,30,0.85)' : 'rgba(40,36,28,0.6)';
    ctx.beginPath(); ctx.ellipse(sx, sy, h * (lezy ? 0.6 : 0.3), h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  }
  // szczątki ofiar Cerbera i kałuże krwi
  for (const q of zabicia) {
    if (tik < q.od + (q.zabite - q.od) * 2.25 || q.x < xL || q.x > xP) continue;
    const a = Math.min(1, (q.do - tik) / 1500);
    ctx.save();
    ctx.translate(cam.toScreenX(q.x), cam.toScreenY(gruntKregu(sim, q.x)));
    ctx.scale(q.zwrot, 1);
    rysujSzczatki(ctx, h, q.wariant, a, czas / 1000, q.k);
    ctx.restore();
  }
  ctx.restore();
}

/** Ilu potępionych zalega krąg (do testów i podpisu). */
export function liczbaPotepionych(sim: Sim): number {
  return tlumy.get(sim)?.lista.length ?? 0;
}

/** Poza żarłoka z tłumu według jego czynności (rysunek: render/ludzik.ts). */
function pozaTlumu(typ: Typ, t: number, z: number): PozaLudzika {
  switch (typ) {
    case 'lezy': return pozaLezy(t, z);
    case 'wyje': return pozaWyje(t, z);
    case 'zre': return pozaZre(t, z);
    case 'grzebie': return pozaCzolga(t * 0.35, 0.6, z);
    case 'blaka': return pozaIdzie(t, z);
    default: return pozaSzarpie(t, z);
  }
}
