/**
 * Talia kart ludu (Remake v1, etap 4). Liczby w src/nastawy/karty-ludu.ts.
 * Karty z sim/wydarzenia.ts zostają (najazd, powódź, zaraza, głód, warta…) — te dochodzą:
 * zgniłe jedzenie w wiadrze, woda w obozie, zawał nad drogą wiernych.
 * (Alpha: bez spisku rycerzy i snu o kamiennych rycerzach — rycerz jest jeden, gniazd nie ma.)
 */
import type { Sim } from './sim';
import type { Wydarzenie, Wybor, StanWydarzen } from './wydarzenia';
import { T, PASSABLE } from './tiles';
import { KARTY_LUDU as K } from '../nastawy/karty-ludu';
import { klanLudu, rolaPostaci, wszystkieSpizarnie } from './lud';
import { falaTrwa } from './straznicy';
import { SWIAT } from '../nastawy/swiat';

const wybor = (id: string, tekst: string, skutek: string, krew = 0, wiara = 0): Wybor => ({ id, tekst, skutek, krew, wiara });
const stac = (sim: Sim, w: Wybor) => sim.krew - sim.rezerwa.krew >= w.krew && sim.wiara - sim.rezerwa.wiara >= w.wiara;

type Kandydat = { waga: number; zbuduj: () => Wydarzenie | null; rodzaj: string };

/** Karty ludu, które mogą teraz przyjść (dokładane do puli kart z wydarzenia.ts). */
export function kandydaciLudu(sim: Sim, st: StanWydarzen): Kandydat[] {
  const out: Kandydat[] = [];
  const w = sim.world;
  const lud = klanLudu(sim);
  if (!lud) return out;
  const surowe = st.ile >= 2;

  // --- zgniłe jedzenie w wiadrze (Remake v2: dawne „zatrute plony” — grzyba i spiżarni już nie ma)
  const sp = wszystkieSpizarnie(sim).filter((s) => s.ilosc >= 4).sort((a, b) => b.ilosc - a.ilosc)[0];
  if (surowe && sp) out.push({ rodzaj: 'plony', waga: 2, zbuduj: () => {
    const wybory = [
      wybor('spal', 'Oczyść je wiarą', 'Zgnilizna zniknie — nikt się nie struje.', 0, K.plonySpal),
      wybor('wyrzuc', 'Wylejcie połowę', 'Połowa porcji z wiadra pójdzie w przepaść — reszta jest czysta.'),
      wybor('jedz', 'Niech jedzą', `Kilku z ludu się struje: przez minutę będą słabsi (−${Math.round((1 - K.zatrucie) * 100)}%). Ktoś może nie przeżyć.`),
    ];
    return { rodzaj: 'plony', tytul: 'Zgniłe jedzenie w wiadrze', tekst: 'Jedzenie w wiadrze zzieleniało od spodu. Kto je zje, ten się struje.', wybory, domyslny: 2, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: { x: sp.x + 0.5, y: sp.y + 0.5, tekst: 'wiadro' }, od: sim.tick, x: sp.x, klan: sp.y };
  } });

  // --- woda w obozie
  const oboz = sim.lud.spizarnie[0] ?? null;
  const gdzie = oboz ?? (lud ? { x: lud.hx, y: lud.hy } : null);
  // Remake v1: w górze nie ma wody — karta „woda nad obozem” nie przychodzi
  if (surowe && gdzie && SWIAT.plyny) out.push({ rodzaj: 'zalanie', waga: 1.8, zbuduj: () => {
    const wybory = [
      wybor('zatkaj', 'Zatkaj ją krwią', 'Krew zastygnie w szczelinie. Woda zostanie w skale.', K.zalanieZatkaj),
      wybor('odwroc', 'Odwróć wodę', 'Woda spłynie gdzie indziej — w pustą skałę z dala od ludu.', 0, K.zalanieOdwroc),
      wybor('plyn', 'Niech płynie', 'Zaleje obóz: kto nie ucieknie, może utonąć, a zapasy trzeba będzie przenieść.'),
    ];
    return { rodzaj: 'zalanie', tytul: 'Woda nad obozem', tekst: 'Nad obozem kapie coraz mocniej. Za chwilę strop puści i woda wleje się do środka.', wybory, domyslny: 2, rozsadny: stac(sim, wybory[1]) ? 1 : stac(sim, wybory[0]) ? 0 : 2, cel: { x: gdzie.x + 0.5, y: gdzie.y + 0.5, tekst: 'obóz' }, od: sim.tick, x: gdzie.x, klan: gdzie.y };
  } });

  // --- zawał nad drogą wiernych
  const plan = sim.planDrogi;
  if (surowe && plan && !sim.rytual.otwarta && plan.sciezka.length > 20 && !falaTrwa(sim)) out.push({ rodzaj: 'zawal', waga: 1.5, zbuduj: () => {
    const i = plan.sciezka[Math.floor(plan.sciezka.length * (0.3 + sim.rng.next() * 0.4))];
    const x = i % w.w, y = (i / w.w) | 0;
    const wybory = [
      wybor('podeprzyj', 'Podeprzyj strop', 'Droga wiernych zostanie cała.', 0, K.zawalPodeprzyj),
      wybor('niech', 'Niech się wali', `Kawałek drogi (${K.zawalKafli} kafli) znów będzie skałą — robotnicy muszą go odkopać, pobożni poczekają.`),
    ];
    return { rodzaj: 'zawal', tytul: 'Strop nad drogą wiernych pęka', tekst: 'Skała nad wykopaną drogą do rdzenia trzeszczy i sypie się piaskiem.', wybory, domyslny: 1, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: { x: x + 0.5, y: y + 0.5, tekst: 'tu się sypie' }, od: sim.tick, x: i };
  } });

  return out;
}

/** Skutek wyboru na karcie ludu. Zwraca false, gdy to nie jest karta ludu. */
export function wykonajLudu(sim: Sim, e: Wydarzenie, id: string): boolean {
  const w = sim.world;
  switch (`${e.rodzaj}:${id}`) {
    case 'plony:spal': {
      sim.efekt((e.x ?? 0) + 0.5, (e.klan ?? 0) + 0.5, 'cud');
      return true;
    }
    case 'plony:wyrzuc': {
      const s = wszystkieSpizarnie(sim).find((o) => o.x === e.x && o.y === e.klan);
      if (s) s.wez(Math.floor(s.ilosc * K.plonyZapasy));
      return true;
    }
    case 'plony:jedz': {
      const lud = sim.creatures.filter((c) => !c.dead && rolaPostaci(c));
      for (let k = 0; k < K.plonyZatrutych && lud.length; k++) {
        const c = lud.splice(sim.rng.int(lud.length), 1)[0];
        c.zatrutyDo = sim.tick + K.zatrucieTikow;
        if (k === 0 && sim.rng.chance(0.35)) sim.kill(c, 'otruty zgniłym jedzeniem', 'trucizna');
      }
      return true;
    }
    case 'zalanie:zatkaj': return true;
    case 'zalanie:odwroc': {
      // „w pustą skałę z dala od ludu” — naprawdę z dala: losowa powódź trafiła kiedyś prosto nad obóz
      // i utopiła czterech, choć gracz zapłacił za odwrócenie wody
      const punkty = wszystkieSpizarnie(sim).map((o) => o.x);
      let best = -1, bd = -1;
      for (let k = 0; k < 24; k++) {
        const x = 6 + sim.rng.int(w.w - 12);
        const d = punkty.length ? Math.min(...punkty.map((p) => Math.abs(p - x))) : 999;
        if (d > bd) { bd = d; best = x; }
      }
      sim.flood(best >= 0 ? best : undefined);
      return true;
    }
    case 'zalanie:plyn': {
      const x0 = e.x ?? 0, y0 = e.klan ?? 0;
      // woda leje się ze stropu nad obozem — kto stoi, zdąży uciec (pełny zalew topił pół obozu naraz)
      for (let y = y0 - 7; y <= y0 - 2; y++) for (let x = x0 - 4; x <= x0 + 4; x++) {
        if (w.inb(x, y) && PASSABLE[w.tile[w.idx(x, y)]] === 1) w.water[w.idx(x, y)] = K.zalanieWoda;
      }
      sim.log('Strop puścił — woda wlała się do obozu.', 'swiat');
      return true;
    }
    case 'zawal:podeprzyj': return true;
    case 'zawal:niech': {
      const plan = sim.planDrogi;
      if (!plan) return true;
      const start = plan.sciezka.indexOf(e.x ?? -1);
      const zajete = new Set(sim.creatures.filter((c) => !c.dead).map((c) => w.idx(Math.floor(c.x), Math.floor(c.y))));
      for (let k = 0; k < K.zawalKafli && start >= 0 && start + k < plan.sciezka.length; k++) {
        const i = plan.sciezka[start + k];
        // (etap 3d: w sali z ołtarzem nic się nie wali — droga do niego zostaje wolna)
        if (!zajete.has(i) && w.tile[i] !== T.CORE && !w.wSali(i % w.w, (i / w.w) | 0)) w.tile[i] = T.ROCK;
      }
      return true;
    }
  }
  return false;
}

/** Karty z łańcuchów ludu — Alpha: żadnych (bunt po spisku zniknął razem ze spiskiem). */
export function zbudujLancuchLudu(_sim: Sim, _karta: string): Wydarzenie | null {
  return null;
}

/** Karty ludu w kolejności — dla okienka dewelopera. */
export const KARTY_LUDU_RODZAJE = ['plony', ...(SWIAT.plyny ? ['zalanie'] : []), 'zawal'];
