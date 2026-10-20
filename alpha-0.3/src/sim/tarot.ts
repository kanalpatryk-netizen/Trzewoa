/**
 * ŚLUB I TAROT (Alpha 0.3, wizja Pawła) — nastawy: src/nastawy/tarot.ts.
 * Ślub wybrany na starcie mnoży role na całą partię. Talia: wyciągnięcie karty kosztuje wiarę (coraz drożej),
 * karta pada prosto (buff) albo odwrócona (nerf) i leży na stole przez `TAROT.trwa` tików, potem gaśnie
 * i wraca do talii. Losowanie idzie z sim.rng — to ruch gracza, jak każdy inny. Stan w sim.lud.druzyna.tarot.
 * Rysunek czyta sim.sladyDruzyny (ślad 'perk' z co = 'tarot:<id>') i sam stół.
 */
import type { Sim } from './sim';
import type { Rola } from './lud';
import type { MnoznikiRoli } from '../nastawy/lud';
import { TAROT, ARKANA, arkan, slub, type SkutekRol, type StronaKarty } from '../nastawy/tarot';
import { GORA } from '../nastawy/gora';
import type { StanDruzyny } from './druzyna';

export interface KartaNaStole {
  arkan: string;
  odwrocona: boolean;
  /** tik wyciągnięcia i tik, w którym zgaśnie */
  od: number;
  do: number;
  /** miejsce na pasie (0…TAROT.miejsc−1) */
  miejsce: number;
}

export interface StanTarota {
  stol: KartaNaStole[];
  /** ile kart wyciągnięto w tej partii (od tego rośnie cena) */
  wyciagniete: number;
}

function stan(sim: Sim): StanTarota {
  const d = (sim.lud.druzyna ??= { wariant: 'pawel', osoby: [], nastepny: 0, odsloniete: [] });
  return (d.tarot ??= { stol: [], wyciagniete: 0 });
}

export function stronaKarty(k: KartaNaStole): StronaKarty | undefined {
  const a = arkan(k.arkan);
  return a ? (k.odwrocona ? a.odwrocona : a.prosto) : undefined;
}

/** Cena następnej karty we wierze. */
export function cenaKarty(sim: Sim): number {
  const n = sim.lud.druzyna?.tarot?.wyciagniete ?? 0;
  return Math.min(TAROT.cenaMaks, TAROT.cena + TAROT.cenaWzrost * n);
}

/** null — można ciągnąć; inaczej powód (podpis na talii). */
export function czemuNieKarta(sim: Sim): string | null {
  if (sim.ending) return 'gra skończona';
  const t = sim.lud.druzyna?.tarot;
  if ((t?.stol.length ?? 0) >= TAROT.miejsc) return 'stół pełny — poczekaj, aż karta zgaśnie';
  const cena = cenaKarty(sim);
  if (sim.wiara - sim.rezerwa.wiara < cena) return `za mało wiary (trzeba ${cena})`;
  return null;
}

/** Wyciąga kartę z talii: płaci wiarę, kładzie ją na wolnym miejscu. Zwraca kartę albo powód odmowy. */
export function wyciagnijKarte(sim: Sim): KartaNaStole | string {
  const powod = czemuNieKarta(sim);
  if (powod) return powod;
  const t = stan(sim);
  sim.wiara -= cenaKarty(sim);
  const naStole = new Set(t.stol.map((k) => k.arkan));
  const wolne = ARKANA.filter((a) => !naStole.has(a.id));
  const a = sim.rng.pick(wolne);
  const zajete = new Set(t.stol.map((k) => k.miejsce));
  let miejsce = 0;
  while (zajete.has(miejsce)) miejsce++;
  const k: KartaNaStole = { arkan: a.id, odwrocona: sim.rng.chance(TAROT.odwroconaSzansa), od: sim.tick, do: sim.tick + TAROT.trwa, miejsce };
  t.stol.push(k);
  t.wyciagniete++;
  const s = k.odwrocona ? a.odwrocona : a.prosto;
  if (s.krew) sim.krew = Math.max(0, Math.min(GORA.krewMax, sim.krew + s.krew));
  if (s.wiara) sim.wiara = Math.max(0, sim.wiara + s.wiara);
  sim.log(`Z talii wypadła karta ${a.nr} — ${a.nazwa}${k.odwrocona ? ', odwrócona' : ''}: ${s.opis}.`, k.odwrocona ? 'krew' : 'wiara');
  // ślad dla rysunku: znak nad każdym z ludu, którego karta dotyczy
  for (const c of sim.creatures) {
    if (c.dead || !c.imie) continue;
    sim.sladyDruzyny.push({ id: c.id, rodzaj: 'perk', co: `tarot:${a.id}`, tik: sim.tick });
  }
  while (sim.sladyDruzyny.length > 48) sim.sladyDruzyny.shift();
  return k;
}

/** Co tik: wypalone karty gasną i wracają do talii. */
export function tikTarota(sim: Sim): void {
  const t = sim.lud.druzyna?.tarot;
  if (!t?.stol.length || sim.tick % 30 !== 0) return;
  const zgasle = t.stol.filter((k) => sim.tick >= k.do);
  if (!zgasle.length) return;
  t.stol = t.stol.filter((k) => sim.tick < k.do);
  for (const k of zgasle) {
    const a = arkan(k.arkan);
    if (a) sim.log(`Karta ${a.nazwa} zgasła i wróciła do talii.`, 'swiat');
  }
}

function zSkutku(s: SkutekRol | undefined, r: Rola, co: keyof MnoznikiRoli): number {
  if (!s) return 1;
  return (s.wszyscy?.[co] ?? 1) * (s[r]?.[co] ?? 1);
}

/** Ślub i karty na stole — mnożnik roli. */
export function mnoznikTarota(sim: Sim, d: StanDruzyny, r: Rola, co: keyof MnoznikiRoli): number {
  let v = zSkutku(slub(d.slub)?.skutek, r, co);
  if (d.tarot) for (const k of d.tarot.stol) if (sim.tick < k.do) v *= zSkutku(stronaKarty(k)?.skutek, r, co);
  return v;
}

/** Ślub na całą partię (ekran po „Nowa gra”). */
export function slubuj(sim: Sim, id: string): void {
  const s = slub(id);
  if (!s) return;
  const d = (sim.lud.druzyna ??= { wariant: 'pawel', osoby: [], nastepny: 0, odsloniete: [] });
  d.slub = s.id;
  sim.log(`Drużyna złożyła ${s.nazwa.replace('Ślub', 'ślub')}: ${s.motto}`, 'wiara');
}
