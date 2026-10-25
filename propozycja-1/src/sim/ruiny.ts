import type { World } from './world';
import type { Rng } from '../core/rng';
import { T, PASSABLE } from './tiles';
import { ZABYTKI, type RodzajRuiny, type TypZabytku } from '../nastawy/zabytki';

/**
 * RUINY (Alpha, etap 3e) — zawalone budowle w środkowej warstwie góry: kaplica, stara kopalnia albo kawałek
 * miasta. Każda to zamknięta w skale pustka (ktoś musi się do niej przekopać) z murami z ciosów, belkami i łukami;
 * w środku, na posadzce, leży zabytek. Mury to zwykła skała (kuje się jak skała), a ich ciosy, belki, łuki i gruz
 * rysuje render/ruiny.ts z tego opisu — wykuty kafel muru znika z rysunku. Zabytki: sim/zabytki.ts.
 */
export interface Ruina {
  rodzaj: RodzajRuiny;
  /** Obrys (kafle, włącznie). */
  x0: number; y0: number; x1: number; y1: number;
  /** Rząd posadzki (pierwszy lity rząd pod wnętrzem). */
  dno: number;
  /** Kafle muru z ciosów (indeksy) — rysunek bloków, póki kafel lity. */
  mury: number[];
  /** Kafle zawału — lity gruz po zawalonym sklepieniu. */
  gruz: number[];
  /** Drewno: słupy, oczepy, zwalone belki — odcinki w kaflach [x0, y0, x1, y1] (tło, nie zagradzają drogi). */
  belki: [number, number, number, number][];
  /** Kamienne łuki w tle: od x0 do x1 (kafle), podstawa łuku na wysokości y; `filary` — kolumny od podstawy do posadzki. */
  luki: { x0: number; x1: number; y: number; filary: boolean }[];
  /** Kopalnia: wózek na szynach (kafel, na którym stoi). */
  wozek?: [number, number];
  zabytek: { x: number; y: number; typ: TypZabytku };
}

const TYPY: TypZabytku[] = ['relikwiarz', 'miecz', 'kielich', 'ksiega'];
const RODZAJE: RodzajRuiny[] = ['kaplica', 'kopalnia', 'miasto'];

/**
 * Stawia ruiny w środkowej warstwie (`g1`/`g2` — granice warstw w każdej kolumnie). Ma własne losowanie
 * (`rng`), więc reszta góry z tego samego ziarna się nie zmienia. `wolno` — kafle, w których wolno budować.
 */
export function zbudujRuiny(w: World, rng: Rng, g1: Int16Array, g2: Int16Array, wolno: (x: number, y: number) => boolean): Ruina[] {
  const R = ZABYTKI.ruiny;
  const ile = R.odIlu + rng.int(R.doIlu - R.odIlu + 1);
  const rodzaje = [...RODZAJE].sort(() => rng.next() - 0.5);
  const typy = [...TYPY].sort(() => rng.next() - 0.5);
  const out: Ruina[] = [];
  for (let k = 0; k < ile; k++) {
    const rodzaj = rodzaje[k % rodzaje.length];
    const szer = rodzaj === 'kaplica' ? R.kaplica.szer + 2 : rodzaj === 'kopalnia' ? R.kopalnia.dl + 2 : R.miasto.domSzer * 2 + 4 + R.miasto.ulica;
    const wys = rodzaj === 'kaplica' ? R.kaplica.wys + R.kaplica.sklepienie + 2 : rodzaj === 'kopalnia' ? R.kopalnia.wys + 2 : R.miasto.domWys + 5;
    for (let p = 0; p < 40; p++) {
      const x0 = 8 + rng.int(w.w - 16 - szer);
      const x1 = x0 + szer - 1;
      let gora = 0, dol = w.h;
      for (let x = x0; x <= x1; x++) { gora = Math.max(gora, g1[x]); dol = Math.min(dol, g2[x]); }
      const yMin = gora + R.odGranicy + wys, yMax = dol - R.odGranicy;
      if (yMax <= yMin) continue;
      const dno = yMin + rng.int(yMax - yMin);
      const y0 = dno - wys;
      if (out.some((r) => Math.abs((r.x0 + r.x1) / 2 - (x0 + x1) / 2) < R.odstep)) continue;
      let dobrze = true;
      // (w litej skale: ruina, która wpada w jaskinię, wyglądała jak dziura, nie jak budowla)
      for (let y = y0 - 2; y <= dno + 1 && dobrze; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (!wolno(x, y) || PASSABLE[w.tile[w.idx(x, y)]] === 1) { dobrze = false; break; }
      }
      if (!dobrze) continue;
      const typ = typy[k % typy.length];
      const r = rodzaj === 'kaplica' ? kaplica(w, rng, x0, dno, typ) : rodzaj === 'kopalnia' ? kopalnia(w, rng, x0, dno, typ) : miasto(w, rng, x0, dno, typ);
      out.push(r);
      break;
    }
  }
  return out;
}

/** Pusty opis ruiny (obrys uzupełnia `domknij`). */
function nowa(rodzaj: RodzajRuiny, dno: number, zx: number, zy: number, typ: TypZabytku): Ruina {
  return { rodzaj, x0: 1e9, y0: 1e9, x1: -1, y1: -1, dno, mury: [], gruz: [], belki: [], luki: [], zabytek: { x: zx, y: zy, typ } };
}

/** Kafel pustki we wnętrzu ruiny. */
function pusto(w: World, r: Ruina, x: number, y: number): void {
  w.tile[w.idx(x, y)] = T.AIR;
  r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y);
}

/** Kafel muru z ciosów (lita skała). */
function mur(w: World, r: Ruina, x: number, y: number): void {
  const i = w.idx(x, y);
  w.tile[i] = T.ROCK;
  if (!r.mury.includes(i)) r.mury.push(i);
  r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.y0 = Math.min(r.y0, y); r.y1 = Math.max(r.y1, y);
}

/** Kafel gruzu (lity) — w miejscu muru albo pustki. */
function gruz(w: World, r: Ruina, x: number, y: number): void {
  const i = w.idx(x, y);
  w.tile[i] = T.ROCK;
  r.mury = r.mury.filter((j) => j !== i);
  if (!r.gruz.includes(i)) r.gruz.push(i);
}

/** Wokół wnętrza (każdy lity sąsiad pustki w obrysie) — mur, poza kaflami `bezMuru`. */
function obmuruj(w: World, r: Ruina, wnetrze: Set<number>, bezMuru: Set<number>): void {
  for (const i of wnetrze) {
    const x = i % w.w, y = (i / w.w) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const j = w.idx(x + dx, y + dy);
      if (wnetrze.has(j) || bezMuru.has(j) || PASSABLE[w.tile[j]] === 1) continue;
      mur(w, r, x + dx, y + dy);
    }
  }
}

/**
 * Kaplica: nawa z półkolistym sklepieniem, mury z ciosów, posadzka; w tle arkada (filary i łuki); w lewej ścianie
 * zamurowany portal pod łukiem. Kawał sklepienia runął: w murze dziura zasypana skałą, na posadzce gruz,
 * a z wyłomu zwisa zwalona belka. Zabytek leży na kamiennym podeście przy prawej ścianie.
 */
function kaplica(w: World, rng: Rng, x0: number, dno: number, typ: TypZabytku): Ruina {
  const K = ZABYTKI.ruiny.kaplica;
  const xl = x0 + 1, xr = xl + K.szer - 1, cx = (xl + xr) / 2, pol = K.szer / 2 + 0.5;
  const px = xr - 1;
  const r = nowa('kaplica', dno, px, dno - 2, typ);
  const wnetrze = new Set<number>();
  for (let x = xl; x <= xr; x++) {
    const v = K.sklepienie * Math.sqrt(Math.max(0, 1 - ((x - cx) / pol) ** 2));
    const gora = Math.round(dno - K.wys - v);
    for (let y = gora; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
  }
  // wyłom w sklepieniu: mur w tym miejscu runął (zostaje zwykła skała), pod nim gruz
  const wx = Math.round(xl + 2 + rng.int(Math.max(1, K.szer - 7)));
  const bezMuru = new Set<number>();
  for (let x = wx; x < wx + 3; x++) for (let y = dno - K.wys - K.sklepienie - 2; y < dno - K.wys + 1; y++) bezMuru.add(w.idx(x, y));
  obmuruj(w, r, wnetrze, bezMuru);
  for (let x = xl; x <= xr; x++) mur(w, r, x, dno);               // posadzka z płyt
  gruz(w, r, wx, dno - 1); gruz(w, r, wx + 1, dno - 1); if (rng.chance(0.6)) gruz(w, r, wx + 1, dno - 2);
  // podest pod zabytkiem
  mur(w, r, px, dno - 1);
  r.zabytek = { x: px, y: dno - 2, typ };
  // portal w lewym murze — zamurowany (lity), pod łukiem
  r.luki.push({ x0: xl - 1, x1: xl, y: dno - 2.5, filary: false });
  // arkada w tle: filary co kilka kafli, łuki między nimi
  const filarY = dno - K.wys + 2.5;
  for (let x = xl + 1; x + 3 <= xr - 1; x += 3) r.luki.push({ x0: x, x1: x + 3, y: filarY, filary: true });
  // zwalona belka z wyłomu na gruz
  r.belki.push([wx + 2.4, dno - K.wys - 0.5, wx + 0.2, dno - 1.4]);
  return r;
}

/**
 * Stara kopalnia: długi niski chodnik w skale, co kilka kafli odrzwia z belek (dwa słupy i oczep), szyny
 * na spągu i porzucony wózek. Środek chodnika się zawalił — gruz do połowy wysokości i złamany oczep.
 * Zabytek leży na końcu chodnika.
 */
function kopalnia(w: World, rng: Rng, x0: number, dno: number, typ: TypZabytku): Ruina {
  const K = ZABYTKI.ruiny.kopalnia;
  const xl = x0 + 1, xr = xl + K.dl - 1;
  const lewy = rng.chance(0.5);
  const zx = lewy ? xl + 1 : xr - 1;
  const r = nowa('kopalnia', dno, zx, dno - 1, typ);
  for (let x = xl; x <= xr; x++) for (let y = dno - K.wys; y < dno; y++) pusto(w, r, x, y);
  // odrzwia: słupy przy ociosach i oczep pod stropem (rysunek w tle)
  const zawal = Math.round(xl + K.dl * (0.4 + rng.next() * 0.2));
  for (let x = xl + 1; x < xr; x += K.odrzwiaCo) {
    if (Math.abs(x - zawal) <= 1) continue;
    r.belki.push([x + 0.15, dno - K.wys, x + 0.15, dno]);
    r.belki.push([x + 0.85, dno - K.wys, x + 0.85, dno]);
    r.belki.push([x - 0.2, dno - K.wys + 0.12, x + 1.2, dno - K.wys + 0.12]);
  }
  // zawał w środku: gruz do połowy wysokości, złamany oczep zwisa ukośnie
  for (let x = zawal - 1; x <= zawal + 1; x++) gruz(w, r, x, dno - 1);
  gruz(w, r, zawal, dno - 2);
  r.belki.push([zawal - 1.6, dno - K.wys + 0.1, zawal + 0.4, dno - 1.6]);
  // szyny (rysunek po spągu) i wózek po drugiej stronie zawału niż zabytek
  r.wozek = [lewy ? xr - 3 : xl + 2, dno - 1];
  return r;
}

/**
 * Kawałek miasta: dwa kamienne domy z dwuspadowymi dachami, między nimi ulica pod łukiem bramy. Jeden dom stracił
 * połowę dachu (gruz w izbie). Zabytek leży w całym domu.
 */
function miasto(w: World, rng: Rng, x0: number, dno: number, typ: TypZabytku): Ruina {
  const M = ZABYTKI.ruiny.miasto;
  const lewyCaly = rng.chance(0.5);
  const domy = [x0 + 1, x0 + 1 + M.domSzer + 2 + M.ulica];
  const zx = (lewyCaly ? domy[0] : domy[1]) + (lewyCaly ? 1 : M.domSzer - 2);
  const r = nowa('miasto', dno, zx, dno - 1, typ);
  const wnetrze = new Set<number>();
  const bezMuru = new Set<number>();
  domy.forEach((xl, d) => {
    const xr = xl + M.domSzer - 1, cx = (xl + xr) / 2;
    for (let x = xl; x <= xr; x++) {
      const dach = Math.floor(M.domSzer / 2 - Math.abs(x - cx) + 0.5);     // szczyt — strych pod dachem
      for (let y = dno - M.domWys - Math.max(0, dach); y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
    }
    const caly = (d === 0) === lewyCaly;
    if (!caly) {
      // pół dachu runęło: w tym miejscu nie ma muru, w izbie gruz
      const odX = d === 0 ? xl + (M.domSzer >> 1) : xl - 1;
      for (let x = odX; x <= odX + (M.domSzer >> 1) + 1; x++) for (let y = dno - M.domWys - M.domSzer; y < dno - M.domWys + 1; y++) bezMuru.add(w.idx(x, y));
    }
  });
  // ulica między domami (niższa niż domy) — pod łukiem bramy
  const ux0 = domy[0] + M.domSzer + 1, ux1 = ux0 + M.ulica - 1;
  for (let x = ux0; x <= ux1; x++) for (let y = dno - M.domWys + 1; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
  // drzwi z domów na ulicę
  for (const x of [domy[0] + M.domSzer, ux1 + 1]) for (let y = dno - 2; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
  obmuruj(w, r, wnetrze, bezMuru);
  for (let x = domy[0] - 1; x <= domy[1] + M.domSzer; x++) mur(w, r, x, dno);     // bruk
  const zburzony = lewyCaly ? domy[1] : domy[0];
  gruz(w, r, zburzony + 1, dno - 1); gruz(w, r, zburzony + 2, dno - 1); gruz(w, r, zburzony + 2, dno - 2);
  // łuk bramy nad ulicą i łuki nad drzwiami
  // (podstawa łuku tak, żeby jego szczyt dotykał stropu przejścia)
  r.luki.push({ x0: ux0, x1: ux1 + 1, y: dno - M.domWys + 1 + M.ulica / 2, filary: false });
  r.luki.push({ x0: domy[0] + M.domSzer, x1: domy[0] + M.domSzer + 1, y: dno - 1.5, filary: false });
  r.luki.push({ x0: ux1 + 1, x1: ux1 + 2, y: dno - 1.5, filary: false });
  // belki stropu w całym domu i jedna zwalona w zburzonym
  const caly = lewyCaly ? domy[0] : domy[1];
  r.belki.push([caly - 0.2, dno - M.domWys + 0.1, caly + M.domSzer + 0.2, dno - M.domWys + 0.1]);
  r.belki.push([zburzony + M.domSzer - 0.5, dno - M.domWys - 0.6, zburzony + 0.8, dno - 1.3]);
  return r;
}
