import type { Sim } from './sim';
import type { Creature } from './creatures';
import type { Wydarzenie } from './wydarzenia';
import { rolaPostaci, NAZWA_ROLI } from './lud';
import { zapisz } from './dziennik';
import { ZABYTKI, ZABYTEK, RUINA, type TypZabytku } from '../nastawy/zabytki';

/**
 * ZABYTKI (Alpha, etap 3e) — w każdej ruinie (sim/ruiny.ts) leży zabytek. Kto z ludu stanie przy nim, odkrywa go:
 * z ruin sypie się kurz, zabytek rozbłyskuje i unosi się nad posadzką, a po chwili świat staje i pokazuje kartę
 * (taką jak karty wydarzeń): „Weź” — premia i kara dla całego ludu, na zawsze (sen w sypialni kary nie zdejmuje),
 * albo „Zostaw” — zabytek opada i gaśnie. Skutki czytają mnoznik() i stanyPostaci() (sim/lud.ts), leczenie, wiara
 * i szaleństwo (creatures.ts, sim.ts). Rysunek: render/ruiny.ts.
 * Decyzje użytkownika 18.10: zabytek działa na cały lud; kara nie schodzi snem; cztery zabytki z planu.
 */
export type StanZabytku = 'odkryty' | 'wziety' | 'zostawiony';

/** Stan zabytków w symulacji (sim.lud.zabytki — trafia do zapisu). Klucz: numer ruiny w world.ruiny. */
export interface StanZabytkow {
  /** Stan zabytku z ruiny (brak — leży nieodkryty). */
  stan: Record<number, StanZabytku>;
  /** Tik ostatniej zmiany stanu — z niego rysunek liczy animacje (odkrycie, wzięcie, zostawienie). */
  od: Record<number, number>;
  /** Kto z ludu go odkrył (id) — przy wzięciu zabytek leci do niego. */
  kto: Record<number, number>;
  /** Wzięte zabytki — ich premie i kary działają na cały lud, na zawsze. */
  wziete: TypZabytku[];
}

export function stanZabytkow(sim: Sim): StanZabytkow {
  return sim.lud.zabytki ??= { stan: {}, od: {}, kto: {}, wziete: [] };
}

/** Czy lud wziął ten zabytek (jego premia i kara działają). */
export function maZabytek(sim: Sim, typ: TypZabytku): boolean {
  return !!sim.lud.zabytki?.wziete.includes(typ);
}

/** Wołane z tikLudu: kto doszedł do zabytku — odkrywa go; po chwili unoszenia — karta wyboru. */
export function tikZabytkow(sim: Sim): void {
  const ruiny = sim.world.ruiny;
  if (!ruiny.length || sim.tick % ZABYTKI.sprawdzajCo !== 0) return;
  const st = stanZabytkow(sim);
  ruiny.forEach((r, n) => {
    if (st.stan[n]) return;
    const z = r.zabytek;
    const ktos = sim.creatures.find((c) => !c.dead && rolaPostaci(c) && Math.hypot(c.x - (z.x + 0.5), c.y - (z.y + 0.5)) <= ZABYTKI.odkrycieZasieg);
    if (!ktos) return;
    st.stan[n] = 'odkryty'; st.od[n] = sim.tick; st.kto[n] = ktos.id;
    const zab = ZABYTEK[z.typ];
    sim.gdzie(z.x + 0.5, z.y + 0.5).log(`${nazwa(ktos)} odkrył w ${RUINA[r.rodzaj].miejscownik} zabytek: ${zab.biernik}.`, 'swiat', `zabytek-odkryty-${n}`);
    zapisz(sim, 'swiat', `zabytek odkryty: ${zab.nazwa} (${RUINA[r.rodzaj].nazwa}, ${z.x}, ${z.y}) — odkrył #${ktos.id}`, z.x, z.y);
  });
  // karta: gdy zabytek już się uniósł, a żadna inna karta nie wisi (po wczytaniu zapisu — pokaże się znowu)
  const wyd = sim.wydarzenia;
  if (wyd.biezace) return;
  for (const [k, s] of Object.entries(st.stan)) {
    const n = Number(k);
    if (s !== 'odkryty' || sim.tick - (st.od[n] ?? 0) < ZABYTKI.kartaPo || !ruiny[n]) continue;
    wyd.biezace = kartaZabytku(sim, n);
    wyd.ile++;
    zapisz(sim, 'karta', `nowa karta: ${wyd.biezace.tytul}`);
    return;
  }
}

/**
 * Co wybiera automat (bot w próbach i obserwatorium): na razie zostawia każdy zabytek — kary bywają ciężkie
 * (miecz spowalnia rycerza), a ważyć je nauczy się w etapie 5.
 */
const BRAC: Record<TypZabytku, boolean> = { relikwiarz: false, miecz: false, kielich: false, ksiega: false };

function kartaZabytku(sim: Sim, n: number): Wydarzenie {
  const r = sim.world.ruiny[n];
  const z = ZABYTEK[r.zabytek.typ];
  const c = sim.creatureById(stanZabytkow(sim).kto[n] ?? -1);
  return {
    rodzaj: 'zabytek', tytul: z.nazwa,
    tekst: `${c ? nazwa(c) : 'Ktoś z ludu'} odkrył w ${RUINA[r.rodzaj].miejscownik} ${z.biernik}. ${z.opis}`,
    wybory: [
      { id: 'wez', tekst: 'Weź', skutek: `Cały lud, na zawsze: ${z.premia} — ale ${z.kara}. Sen w sypialni kary nie zdejmie.`, krew: 0, wiara: 0 },
      { id: 'zostaw', tekst: 'Zostaw', skutek: 'Zabytek opadnie i zgaśnie — zostanie w ruinach.', krew: 0, wiara: 0 },
    ],
    domyslny: 1, rozsadny: BRAC[r.zabytek.typ] ? 0 : 1,
    cel: { x: r.zabytek.x + 0.5, y: r.zabytek.y + 0.5, tekst: z.nazwa.toLowerCase() },
    od: sim.tick, x: n,
  };
}

/** Wybór z karty zabytku (sim/wydarzenia.ts: wykonaj). */
export function rozstrzygnijZabytek(sim: Sim, n: number, wez: boolean): void {
  const r = sim.world.ruiny[n];
  if (!r) return;
  const st = stanZabytkow(sim);
  if (st.stan[n] !== 'odkryty') return;
  st.stan[n] = wez ? 'wziety' : 'zostawiony';
  st.od[n] = sim.tick;
  const zab = ZABYTEK[r.zabytek.typ];
  if (wez) {
    if (!st.wziete.includes(r.zabytek.typ)) st.wziete.push(r.zabytek.typ);
    sim.gdzie(r.zabytek.x + 0.5, r.zabytek.y + 0.5).log(`Lud wziął ${zab.biernik}: ${zab.premia} — ale ${zab.kara}. Na zawsze.`, 'wiara', `zabytek-${n}`);
  } else {
    sim.gdzie(r.zabytek.x + 0.5, r.zabytek.y + 0.5).log(`${zab.nazwa} zostaje w ${RUINA[r.rodzaj].miejscownik} — gaśnie.`, 'swiat', `zabytek-${n}`);
  }
  zapisz(sim, 'swiat', `zabytek ${wez ? 'wzięty' : 'zostawiony'}: ${zab.nazwa}`, r.zabytek.x, r.zabytek.y);
}

/** Premie i kary wziętych zabytków jako wiersze na karcie postaci (aureole: jasna i czerwona). */
export function stanyZabytkow(sim: Sim, c: Creature): { nazwa: string; skutek: string; dobry: boolean; kiedy: string }[] {
  const wz = sim.lud.zabytki?.wziete;
  if (!wz?.length) return [];
  const rola = rolaPostaci(c);
  const out: { nazwa: string; skutek: string; dobry: boolean; kiedy: string }[] = [];
  const st = sim.lud.zabytki!;
  for (const typ of wz) {
    // aureole zapalają się, gdy dojdzie do nich fala światła od tego, kto podniósł zabytek (render/ruiny.ts)
    const n = sim.world.ruiny.findIndex((r) => r.zabytek.typ === typ);
    if (n >= 0 && st.stan[n] === 'wziety' && sim.tick - (st.od[n] ?? 0) < ZABYTKI.aureolePo) continue;
    const z = ZABYTEK[typ];
    // miecz działa tylko na rycerza — i premia, i kara
    if (typ === 'miecz' && rola !== 'rycerz') continue;
    out.push({ nazwa: z.nazwa.toLowerCase(), skutek: z.premia, dobry: true, kiedy: 'zabytek — na zawsze' });
    out.push({ nazwa: `${z.nazwa.toLowerCase()} — cena`, skutek: z.kara, dobry: false, kiedy: 'zabytek — na zawsze, sen tego nie zdejmie' });
  }
  return out;
}

function nazwa(c: Creature): string {
  const r = rolaPostaci(c);
  return r ? NAZWA_ROLI[r] : 'Ktoś';
}
