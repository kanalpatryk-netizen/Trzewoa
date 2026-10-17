/**
 * ZAWAŁ OD GÓRY (Remake v2) — góra zamyka się za ludem. Liczby: src/nastawy/zawal.ts.
 *
 * Lud schodzi coraz niżej, a góra nad nim pustoszeje. Gdy przez 20 sekund nikogo z ludu nie ma
 * nad linią (najwyżej stojący minus zapas), skała nad nią się zawala: wszystko wyżej staje się
 * litą skałą nie do ruszenia — razem z gniazdami kamiennych rycerzy, obozami, wiadrami i trupami.
 * Kamera nie wjeżdża już ponad strop, mapa się skraca, a lud nie ucieknie w górę: musi walczyć.
 * Strop schodzi tylko w dół, skokami (nigdy niżej niż kawał nad przedsionkiem rdzenia).
 */
import type { Sim } from './sim';
import { ZAWAL } from '../nastawy/zawal';
import { T } from './tiles';
import { Race } from './races';
import { klanLudu, miejsceNaObozu, podloga, najwiekszaGrupa } from './lud';
import { zapisz } from './dziennik';

export interface StanZawalu {
  /** Pierwszy rząd, który jeszcze żyje — wszystko wyżej jest zawalone. */
  strop: number;
  /** Linia, do której strop zejdzie, gdy nikt nie wróci wyżej — i od kiedy nikogo nad nią nie ma. */
  kandydat?: number;
  kandydatOd?: number;
  /** Ile razy się zawaliło i kiedy ostatnio (ekran gra wtedy dźwięk). */
  ile: number;
  ostatniT?: number;
}

function stan(sim: Sim): StanZawalu {
  return (sim.lud.zawal ??= { strop: 0, ile: 0 });
}

/** Pierwszy żywy rząd góry (0 — nic się jeszcze nie zawaliło). */
export function stropGory(sim: Sim): number {
  return sim.lud.zawal?.strop ?? 0;
}

/** Ile tików do zawału, który właśnie się szykuje (albo null). */
export function doZawalu(sim: Sim): number | null {
  const st = sim.lud.zawal;
  if (!st || st.kandydatOd === undefined || st.kandydat === undefined) return null;
  return Math.max(0, st.kandydatOd + ZAWAL.czekaj - sim.tick);
}

/** Co tik symulacji (sam pilnuje rytmu). */
export function tikZawalu(sim: Sim): void {
  if (!ZAWAL.wlaczony || sim.tick % ZAWAL.sprawdzCo !== 0 || sim.tick < ZAWAL.najwczesniej - ZAWAL.czekaj) return;
  const st = stan(sim);
  const w = sim.world;
  let gora = Infinity;
  for (const c of sim.creatures) if (!c.dead && c.race === Race.GOBLIN && !c.straznik) gora = Math.min(gora, c.y);
  if (!isFinite(gora)) return;
  const dno = w.przedsionekY - ZAWAL.doPrzedsionka;
  const linia = Math.floor(gora) - ZAWAL.zapas;
  let cel = st.strop;
  while (cel + ZAWAL.krok <= linia && cel + ZAWAL.krok <= dno) cel += ZAWAL.krok;
  if (cel <= st.strop) { st.kandydat = undefined; st.kandydatOd = undefined; return; }
  // ktoś wrócił wyżej — odliczanie od nowa; lud schodzi niżej — linia rośnie, czas biegnie dalej
  if (st.kandydatOd === undefined || st.kandydat === undefined || cel < st.kandydat) { st.kandydat = cel; st.kandydatOd = sim.tick; return; }
  st.kandydat = cel;
  if (sim.tick - st.kandydatOd >= ZAWAL.czekaj) zawal(sim, cel);
}

/** Zawala górę nad rzędem `nowy`: wszystko wyżej staje się litą skałą. */
export function zawal(sim: Sim, nowy: number): void {
  const st = stan(sim);
  const w = sim.world;
  if (nowy <= st.strop) return;
  for (let y = 0; y < nowy; y++) {
    for (let x = 0; x < w.w; x++) {
      const i = w.idx(x, y);
      w.tile[i] = T.STONE;
      w.water[i] = 0; w.magma[i] = 0; w.drabina[i] = 0; w.prog[i] = 0;
      w.ever[i] = 1;
    }
  }
  // kto (spoza ludu) został nad stropem, zostaje pod gruzem
  for (const c of sim.creatures) if (!c.dead && c.y < nowy) sim.kill(c, 'pod zawałem', 'przysypany');
  // gniazda kamiennych rycerzy nad stropem — pogrzebane razem ze śpiącymi
  let gniazd = 0, rycerzy = 0;
  for (const g of sim.lud.gniazda ?? []) {
    if (g.odkryte || g.y - 2 >= nowy) continue;
    g.odkryte = true; g.zawalone = true;
    gniazd++; rycerzy += g.rycerzy;
  }
  sim.lud.spizarnie = sim.lud.spizarnie.filter((s) => s.y > nowy);
  sim.lud.obozy = sim.lud.obozy.filter((o) => o.y > nowy);
  if (sim.lud.wiadra) {
    sim.lud.wiadra.lista = sim.lud.wiadra.lista.filter((wd) => wd.cel > nowy);
    for (const wd of sim.lud.wiadra.lista) if (wd.sufit < nowy) { wd.sufit = nowy; wd.y = Math.max(wd.y, nowy - 1); }
  }
  if (sim.lud.trupy) sim.lud.trupy = sim.lud.trupy.filter((t) => t.y > nowy);
  // siedziba nad stropem — przenosi się od razu tam, gdzie jest lud
  const klan = klanLudu(sim);
  if (klan && klan.hy <= nowy) {
    const g = najwiekszaGrupa(sim, klan.id);
    const m = g ? (miejsceNaObozu(sim, g.x, g.y, 20, 12) ?? podloga(sim, Math.floor(g.x), Math.floor(g.y), 10)) : null;
    if (m && m[1] > nowy) {
      klan.hx = m[0]; klan.hy = m[1];
      if (w.passable(m[0], m[1])) w.set(m[0], m[1], T.NEST);
      sim.lud.siedzibaT = sim.tick;
    }
  }
  sim.planDrogi = null;         // droga do rdzenia liczy się od nowa — od siedziby pod stropem
  st.strop = nowy; st.ile++; st.ostatniT = sim.tick;
  st.kandydat = undefined; st.kandydatOd = undefined;
  // huk i pył wzdłuż całego stropu
  for (let k = 0; k < 60; k++) sim.spark(1 + sim.rng.next() * (w.w - 2), nowy + 0.2 + sim.rng.next() * 0.8, 'dust');
  const sx = klan ? klan.hx : w.w / 2;
  for (const dx of [-14, 0, 14]) sim.efekt(sx + dx, nowy + 0.5, 'zawal');
  sim.gdzie(sx, nowy + 1).log(
    `Góra zawaliła się nad ludem — w górę nie ma już powrotu.${gniazd ? ` Pod gruzem zostały ${gniazd === 1 ? 'jedno gniazdo' : `${gniazd} gniazda`} kamiennych rycerzy (${rycerzy} śpiących).` : ''}`,
    'swiat');
  zapisz(sim, 'swiat', `zawał: strop ${st.strop} (było ${nowy - ZAWAL.krok}), gniazd pogrzebanych ${gniazd}`, sx, nowy);
}
