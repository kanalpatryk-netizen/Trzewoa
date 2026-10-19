/**
 * Gra obserwowana — jedno z czterech okien obserwatorium (obserwatorium.html). Włącza ją
 * `window.__TRZEWIA_BOT` wpisane w stronę przed skryptem gry (albo `?bot` w adresie).
 * Wtedy gra rusza od razu (bez menu), gra w niej bot (src/app/bot.ts), nic nie trafia do pamięci
 * przeglądarki (zapisy, ustawienia i atlas gracza zostają nietknięte), karty i tablice nie
 * zatrzymują czasu, a po końcu partii zaczyna się następna. Obserwatorium steruje oknem
 * wiadomościami (postMessage), a okno co pół sekundy odsyła swój stan.
 */
import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { porcjiWWiadrach } from '../sim/wiadro';
import { ustawienia } from '../core/settings-store';
import { mikser } from '../core/mikser';
import { myslBota, type StylBota } from './bot';

export interface UstawieniaBota {
  /** Numer okna (1–4) — wraca w każdej wiadomości. */
  okno: number;
  styl: StylBota;
  /** Mnożnik czasu (1 = zwykły). */
  tempo: number;
  pauza: boolean;
  /** Ziarno następnej partii; brak — losowe. */
  ziarno: number | null;
  /** Po końcu partii od razu następna. */
  autoRestart: boolean;
  dzwiek: boolean;
}

type Wejscie = Partial<UstawieniaBota> & { okno?: number };

const surowe: Wejscie | null = (() => {
  if (typeof window === 'undefined') return null;
  const w = (window as unknown as { __TRZEWIA_BOT?: Wejscie }).__TRZEWIA_BOT;
  if (w) return w;
  try { return new URLSearchParams(location.search).has('bot') ? {} : null; } catch { return null; }
})();

export const BOT: UstawieniaBota & { wlaczony: boolean; partia: number } = {
  wlaczony: !!surowe,
  partia: 0,
  okno: 1, styl: 'rozsadny', tempo: 1, pauza: false, ziarno: null, autoRestart: true, dzwiek: false,
  ...(surowe ?? {}),
};

/** Ekran gry podpina tu swoje ręce — obserwatorium woła je wiadomościami. */
export const BOT_GRA: { nowaGra: (ziarno: number | null) => void } = { nowaGra: () => {} };

/** Ziarno kolejnej partii: ustawione albo losowe. */
export function ziarnoPartii(): number {
  return BOT.ziarno ?? ((Math.random() * 1e9) | 0);
}

/** Wywołać raz, na starcie gry (przed ekranem ładowania). */
export function przygotujObserwowana(): void {
  if (!BOT.wlaczony) return;
  // nic do pamięci przeglądarki: zapisy, ustawienia, atlas i osiągnięcia gracza zostają, jak były
  try {
    const nic = function (): void { /* okno obserwatorium niczego nie zapisuje */ };
    Storage.prototype.setItem = nic;
    Storage.prototype.removeItem = nic;
    Storage.prototype.clear = nic;
  } catch { /* bez pamięci */ }
  // gra bez przerw: żadnych auto-pauz, tablic na pół ekranu, okienka dewelopera
  ustawienia.autoPauza = 'wyłączona';
  ustawienia.tablice = 'tylko w atlasie';
  ustawienia.trybDeweloperski = false;
  ustawienia.samouczekZrobiony = true;
  ustawienia.autozapis = false;
  // kliknięcie w okno je powiększa — nie może wyrzucać ramki na pełny ekran
  ustawienia.pelnyEkran = false;
  window.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { trzewia?: string; zmiany?: Partial<UstawieniaBota>; ziarno?: number | null } | null;
    if (!d || typeof d !== 'object' || !d.trzewia) return;
    if (d.trzewia === 'ustaw' && d.zmiany) {
      const z = d.zmiany;
      if (z.styl) BOT.styl = z.styl;
      if (typeof z.tempo === 'number' && z.tempo > 0) BOT.tempo = Math.min(50, z.tempo);
      if (typeof z.pauza === 'boolean') BOT.pauza = z.pauza;
      if (z.ziarno !== undefined) BOT.ziarno = z.ziarno;
      if (typeof z.autoRestart === 'boolean') BOT.autoRestart = z.autoRestart;
      if (typeof z.dzwiek === 'boolean') { BOT.dzwiek = z.dzwiek; zastosujDzwiek(); }
    } else if (d.trzewia === 'nowa') {
      if (d.ziarno !== undefined) BOT.ziarno = d.ziarno;
      BOT_GRA.nowaGra(BOT.ziarno);
    }
  });
}

/** Dźwięk tylko w oknie, któremu obserwatorium go dało (cztery naraz to kakofonia). */
export function zastosujDzwiek(): void {
  const c = mikser.ctx;
  if (!c) return;
  if (BOT.dzwiek && c.state === 'suspended') void c.resume();
  else if (!BOT.dzwiek && c.state === 'running') void c.suspend();
}

/** Stan okna dla obserwatorium. */
export function wyslijStan(sim: Sim, ziarno: number, koniecOd: number): void {
  if (!BOT.wlaczony || window.parent === window) return;
  const role = { pobozny: 0, robotnik: 0, rycerz: 0 };
  let zywych = 0;
  for (const c of sim.creatures) {
    if (c.dead || c.race !== Race.GOBLIN) continue;
    zywych++;
    role[c.rola ?? 'pobozny']++;
  }
  const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
  const ostatni = sim.chronicle.length ? sim.chronicle[sim.chronicle.length - 1].text : '';
  zastosujDzwiek();
  window.parent.postMessage({
    trzewia: 'stan',
    okno: BOT.okno,
    ziarno,
    partia: BOT.partia,
    tick: sim.tick,
    zywych, role,
    wiara: Math.round(sim.wiara),
    krew: Math.round(sim.krew),
    jedzenie: porcjiWWiadrach(sim),
    oddanie: k ? Math.round(k.devotion * 100) : 0,
    koszmar: !!sim.koszmar,
    koniec: sim.ending ?? null,
    koniecOd,
    kronika: ostatni,
    mysl: myslBota(sim, BOT.styl),
    ustawienia: { styl: BOT.styl, tempo: BOT.tempo, pauza: BOT.pauza, ziarno: BOT.ziarno, autoRestart: BOT.autoRestart, dzwiek: BOT.dzwiek },
  }, '*');
}
