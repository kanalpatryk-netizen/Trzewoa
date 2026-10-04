/**
 * Talia kart ludu (Remake v1, etap 4). Liczby w src/nastawy/karty-ludu.ts.
 * Karty z sim/wydarzenia.ts zostają (najazd, powódź, zaraza, głód, warta…) — te dochodzą:
 *  - spisek rycerzy → (zostawiony) bunt: część rycerzy przechodzi na drugą stronę,
 *  - zatrute plony, woda w obozie, zawał nad drogą wiernych, sen o kamiennych rycerzach.
 */
import type { Sim } from './sim';
import type { Wydarzenie, Wybor, StanWydarzen } from './wydarzenia';
import { T, PASSABLE } from './tiles';
import { KARTY_LUDU as K } from '../nastawy/karty-ludu';
import { klanLudu, liczRole, rolaPostaci, wszystkieSpizarnie, gniazdaWSkale, grzybPrzy } from './lud';
import { zbuntuj, nawroc, odejdz, buntownicy } from './bunt';
import { falaTrwa } from './straznicy';

const wybor = (id: string, tekst: string, skutek: string, krew = 0, wiara = 0): Wybor => ({ id, tekst, skutek, krew, wiara });
const stac = (sim: Sim, w: Wybor) => sim.krew - sim.rezerwa.krew >= w.krew && sim.wiara - sim.rezerwa.wiara >= w.wiara;

type Kandydat = { waga: number; zbuduj: () => Wydarzenie | null; rodzaj: string };

/** Karty ludu, które mogą teraz przyjść (dokładane do puli kart z wydarzenia.ts). */
export function kandydaciLudu(sim: Sim, st: StanWydarzen): Kandydat[] {
  const out: Kandydat[] = [];
  const w = sim.world;
  const lud = klanLudu(sim);
  if (!lud) return out;
  const role = liczRole(sim);
  const surowe = st.ile >= 2;
  const baza = lud ? { x: lud.hx + 0.5, y: lud.hy + 0.5, tekst: lud.name } : undefined;

  // --- spisek rycerzy
  const czeka = st.odroczone.some((o) => o.karta === 'bunt');
  if (surowe && role.rycerz >= K.spisekMinRycerzy && !czeka && !buntownicy(sim).length && sim.tick >= (sim.lud.spisekPo ?? 0)) out.push({ rodzaj: 'spisek', waga: K.spisekWaga, zbuduj: () => {
    sim.lud.spisekPo = sim.tick + K.spisekPrzerwa;
    const wybory = [
      wybor('stlum', `Zgładź spiskowców (${K.spisekSpiskowcow})`, `Zginą — spisek umrze z nimi. Ich śmierć to twoja krew.`, 0, K.spisekStlum),
      wybor('przekup', 'Kup ich wierność', 'Dostaną krew i najlepsze miejsce przy spiżarni. Spisek się rozwieje.', K.spisekPrzekup),
      wybor('zostaw', 'Zostaw', 'Na razie nic. Ale spisek, którego nikt nie gasi, kiedyś wybucha.'),
    ];
    // rozsądnie: kupić wierność, gdy stać; zgładzić tylko, gdy rycerzy jest dużo (inaczej zostaw i licz na wiernych)
    const rozsadny = stac(sim, wybory[1]) ? 1 : role.rycerz >= 6 && stac(sim, wybory[0]) ? 0 : 2;
    return { rodzaj: 'spisek', tytul: 'Rycerze knują', tekst: `Kilku rycerzy szepcze po kątach obozu. Mówią, że to oni bronią ludu — więc to oni powinni nim rządzić.`, wybory, domyslny: 2, rozsadny, cel: baza, od: sim.tick };
  } });

  // --- zatrute plony
  const sp = wszystkieSpizarnie(sim).filter((s) => grzybPrzy(sim, s.x, s.y) >= 3).sort((a, b) => b.ilosc - a.ilosc)[0];
  if (surowe && sp) out.push({ rodzaj: 'plony', waga: 2, zbuduj: () => {
    const wybory = [
      wybor('spal', 'Spal zarażony grzyb', 'Grzyb przy spiżarni spłonie — nikt się nie struje, ale jedzenia trzeba szukać dalej.', 0, K.plonySpal),
      wybor('wyrzuc', 'Wyrzućcie zapasy', `Połowa jedzenia ze spiżarni pójdzie w przepaść. Grzyb odrośnie czysty.`),
      wybor('jedz', 'Niech jedzą', `Kilku z ludu się struje: przez minutę będą słabsi (−${Math.round((1 - K.zatrucie) * 100)}%). Ktoś może nie przeżyć.`),
    ];
    return { rodzaj: 'plony', tytul: 'Zatrute plony', tekst: 'Grzyb przy spiżarni sczerniał od spodu. Kto go zje, ten się struje.', wybory, domyslny: 2, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: { x: sp.x + 0.5, y: sp.y + 0.5, tekst: 'spiżarnia' }, od: sim.tick, x: sp.x, klan: sp.y };
  } });

  // --- woda w obozie
  const oboz = sim.lud.spizarnie[0] ?? null;
  const gdzie = oboz ?? (lud ? { x: lud.hx, y: lud.hy } : null);
  if (surowe && gdzie) out.push({ rodzaj: 'zalanie', waga: 1.8, zbuduj: () => {
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

  // --- sen o kamiennych rycerzach
  const ukryte = gniazdaWSkale(sim).filter((g) => !g.znany);
  if (ukryte.length && role.rycerz < 6) out.push({ rodzaj: 'sen', waga: 1.6, zbuduj: () => {
    const g = ukryte.sort((a, b) => Math.hypot(a.x - lud.hx, a.y - lud.hy) - Math.hypot(b.x - lud.hx, b.y - lud.hy))[0];
    const wybory = [
      wybor('pokaz', 'Pokaż im to miejsce', 'Gniazdo zaświeci w skale na stałe — robotnicy będą wiedzieć, gdzie kopać („Przemyśl i kop” trafi w nie bez pudła).', 0, K.senPokaz),
      wybor('milcz', 'Niech śpią dalej', 'Nic się nie zmieni. „Przemyśl i kop” wciąż może je znaleźć.'),
    ];
    return { rodzaj: 'sen', tytul: 'Sen o kamiennych rycerzach', tekst: 'Pobożnym śni się skała, w której ktoś oddycha. Pytają, czy to znak.', wybory, domyslny: 1, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: { x: g.x + 0.5, y: g.y + 0.5, tekst: 'gniazdo' }, od: sim.tick, x: g.id };
  } });

  return out;
}

/** Skutek wyboru na karcie ludu. Zwraca false, gdy to nie jest karta ludu. */
export function wykonajLudu(sim: Sim, e: Wydarzenie, id: string): boolean {
  const w = sim.world;
  switch (`${e.rodzaj}:${id}`) {
    case 'spisek:stlum': {
      const rycerze = sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === 'rycerz').slice(0, K.spisekSpiskowcow);
      for (const c of rycerze) sim.kill(c, 'stracony za spisek', 'kara');
      return true;
    }
    case 'spisek:przekup': return true;
    case 'spisek:zostaw':
      sim.wydarzenia.odroczone.push({ tick: sim.tick + K.buntPo, rodzaj: 'karta', karta: 'bunt' });
      return true;
    case 'plony:spal': {
      const x0 = e.x ?? 0, y0 = e.klan ?? 0;
      for (let y = y0 - K.plonyPromien; y <= y0 + K.plonyPromien; y++) for (let x = x0 - K.plonyPromien; x <= x0 + K.plonyPromien; x++) {
        if (w.inb(x, y) && w.tile[w.idx(x, y)] === T.FUNGUS) w.tile[w.idx(x, y)] = T.AIR;
      }
      sim.efekt(x0 + 0.5, y0 + 0.5, 'cud');
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
        if (k === 0 && sim.rng.chance(0.35)) sim.kill(c, 'otruty zgniłym grzybem', 'trucizna');
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
        if (!zajete.has(i) && w.tile[i] !== T.CORE) w.tile[i] = T.ROCK;
      }
      return true;
    }
    case 'sen:pokaz': {
      const g = (sim.lud.gniazda ?? []).find((o) => o.id === e.x);
      if (g) { g.znany = true; sim.efekt(g.x + 0.5, g.y + 0.5, 'cud'); }
      return true;
    }
    case 'sen:milcz': return true;
    case 'bunt:walcz': return true;
    case 'bunt:przemow': nawroc(sim, Math.ceil(buntownicy(sim).length / 2)); return true;
    case 'bunt:oddaj': {
      const lud = klanLudu(sim);
      if (lud) lud.stock = Math.max(0, lud.stock - K.buntOddajJedzenie);
      odejdz(sim);
      return true;
    }
  }
  return false;
}

/** Karty z łańcuchów ludu (bunt po zostawionym spisku). */
export function zbudujLancuchLudu(sim: Sim, karta: string): Wydarzenie | null {
  if (karta !== 'bunt') return null;
  const role = liczRole(sim);
  if (role.rycerz < 2) return null;
  const ilu = Math.max(1, Math.floor(role.rycerz * K.buntCzesc));
  const n = zbuntuj(sim, ilu);
  if (!n) return null;
  const b = buntownicy(sim)[0];
  const wybory = [
    wybor('walcz', 'Niech wierni ich pokonają', 'Wierni rycerze ruszą na zdrajców. Każda śmierć to twoja krew.'),
    wybor('przemow', 'Przemów do nich', `Połowa buntowników wróci do ludu.`, 0, K.buntPrzemow),
    wybor('oddaj', 'Oddaj im zapasy', `Odejdą z góry z ${K.buntOddajJedzenie} jedzenia ze spiżarni siedziby.`),
  ];
  return {
    rodzaj: 'bunt', tytul: 'Spisek się udał', lancuch: true, od: sim.tick,
    tekst: `Spisek, którego nikt nie zgasił, wybuchł: ${n} ${n === 1 ? 'rycerz zmienił' : 'rycerzy zmieniło'} barwy i bije każdego z ludu.`,
    wybory, domyslny: 0, rozsadny: stac(sim, wybory[1]) ? 1 : 0,
    cel: b ? { x: b.x, y: b.y, tekst: 'zdrajcy' } : undefined,
  };
}

/** Karty ludu w kolejności — dla okienka dewelopera. */
export const KARTY_LUDU_RODZAJE = ['spisek', 'plony', 'zalanie', 'zawal', 'sen'];
