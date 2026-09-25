import type { Sim } from './sim';
import { Race, RACES, odmien } from './races';
import { T } from './tiles';

export interface Podpowiedz { tekst: string; cel?: { x: number; y: number; r: number; tekst: string }; waga: number; }

/**
 * Jedno zdanie o tym, co w tej chwili warto zrobić. Sandbox bez takiego zdania jest
 * nieczytelny: gracz widzi mrowisko i nie wie, czego od niego chcą.
 * Podpowiedzi czytają stan świata, nie skrypt.
 */
export function podpowiedz(sim: Sim): Podpowiedz {
  const kandydaci: Podpowiedz[] = [];

  // 1. ktoś wymiera — to najpilniejsze, bo monokultura cię usypia.
  // Nie na starcie: świeża góra ma z natury dwa–trzy trole i pierwsze zdanie gry
  // nie może brzmieć „Trole są o krok od wygaśnięcia".
  for (let r = 0; sim.tick > 2000 && r < 5; r++) {
    if (r === Race.HUMAN) continue;
    const ilu = sim.popByRace[r];
    if (ilu === 0 || ilu > 4) continue;
    // tylko klan, który naprawdę jeszcze żyje — pierścień na pustym gnieździe to kłamstwo
    const klan = sim.clans.filter((k) => !k.dead && k.race === r && k.pop > 0).sort((a, b) => b.pop - a.pop)[0];
    const nazwa = RACES[r].name;
    // „kop w dół" ma sens tylko dla kogoś, kto już siedzi dość nisko — inaczej
    // podpowiedź każe wysyłać w otchłań kogoś z samej powierzchni
    const glebocy = sim.creatures.some((c) => !c.dead && c.race !== Race.HUMAN
      && c.race !== Race.TROLL && sim.world.depth(c.y) > 0.5);
    const rada = r === Race.DWARF ? 'Otwórz im żar blisko gniazda, żeby mieli przy czym żyć.'
      : r === Race.SPINNER ? 'Zasiej kości albo dowiedź im kogoś słabszego — żywią się cudzym.'
      : r === Race.TROLL ? (glebocy
          ? 'Szepnij „kop w dół" komuś, kto już siedzi głęboko — trole biorą się z głębi.'
          : 'Najpierw wydrąż komuś drogę w dół; trole biorą się dopiero z głębi.')
      : 'Zasiej grzyb w ich jaskini.';
    kandydaci.push({
      tekst: `${nazwa} ${odmien(r, 'jest', 'są')} o krok od wygaśnięcia. ${rada}`,
      cel: klan ? { x: klan.hx, y: klan.hy, r: 5, tekst: nazwa } : undefined,
      waga: 100 - ilu,
    });
  }

  // 2. jedna rasa rośnie ponad miarę
  const rytualnyKlan = sim.rytual.klan >= 0 && sim.rytual.postep > 0.05 ? sim.clans[sim.rytual.klan] : null;
  if (sim.dominance > 0.72 && sim.domRace >= 0 && rytualnyKlan?.race !== sim.domRace) {
    const nazwa = RACES[sim.domRace].name;
    const klan = sim.clans.filter((k) => !k.dead && k.race === sim.domRace && k.pop > 0).sort((a, b) => b.pop - a.pop)[0];
    kandydaci.push({
      tekst: `${nazwa} ${odmien(sim.domRace, 'bierze', 'biorą')} górę. Zawal im korytarz, wpuść wodę albo szepnij komuś „zabij swoich".`,
      cel: klan ? { x: klan.hx, y: klan.hy, r: 5, tekst: nazwa } : undefined,
      waga: 80 + sim.dominance * 20,
    });
  }

  // 3. senność
  if (sim.sen > 0.25) {
    kandydaci.push({ tekst: 'Zasypiasz. Potrzebujesz konfliktu: prorok w dużym klanie zrobi rozłam.', waga: 90 });
  }

  // 4. głód powszechny
  let glodni = 0, zywi = 0;
  for (const c of sim.creatures) { if (c.dead) continue; zywi++; if (c.hunger > 0.7) glodni++; }
  if (zywi > 0 && glodni / zywi > 0.45) {
    kandydaci.push({ tekst: 'Większość twoich mieszkańców głoduje. Zasiej grzyb albo kości tam, gdzie mieszkają.', waga: 70 });
  }

  // 5. Wiara wysycha — brak ołtarzy
  let oltarze = 0;
  for (const t of sim.world.tile) if (t === T.SHRINE || t === T.GLYPH) oltarze++;
  if (sim.wiara < 40 && oltarze < 2 && zywi > 6) {
    kandydaci.push({ tekst: 'Nikt się do ciebie nie modli. Zasiej rudę przy Ślepym Ludzie — z niej postawią ołtarz.', waga: 60 });
  }

  // 6. rytuał: jedyna droga do końca gry musi być widoczna, gdy staje się możliwa
  const najwierniejszy = sim.clans.filter((k) => !k.dead && k.pop > 2).sort((a, b) => b.devotion - a.devotion)[0];
  if (sim.rytual.postep > 0.02 || sim.rytual.wierni >= 3) {
    kandydaci.push({
      tekst: 'Twoi wierni kują pod skorupą rdzenia. Nie przeszkadzaj im — i nie daj im umrzeć z głodu.',
      cel: { x: sim.world.coreX, y: sim.world.coreY - 14, r: 7, tekst: 'rytuał' },
      waga: 85,
    });
  } else if (najwierniejszy && najwierniejszy.devotion > 0.6) {     // próg pielgrzymki
    // droga jest robotą gracza: pielgrzymka przez pięćdziesiąt kafli litej skały
    // nie dojdzie nigdy, choćby wierzyli najmocniej
    const w = sim.world;
    let zasypane = 0;
    for (let y = najwierniejszy.hy; y < w.coreY - 14; y++) if (!w.passable(w.coreX, y)) zasypane++;
    kandydaci.push({
      tekst: zasypane > 8
        ? `${najwierniejszy.name} wierzą dość mocno, by zejść pod rdzeń — ale nie mają którędy. Wydrąż im szyb w dół do przedsionka.`
        : `${najwierniejszy.name} wierzą dość mocno, by zejść pod twój rdzeń. Pilnuj im drogi i zasiej grzyb przy przedsionku.`,
      cel: { x: sim.world.coreX, y: sim.world.coreY - 14, r: 7, tekst: 'przedsionek' },
      waga: 55,
    });
  }

  // 7. sporo krwi na koncie
  if (sim.krew > 260 && kandydaci.length === 0) {
    kandydaci.push({ tekst: 'Krwi masz dość. Wydrąż komuś drogę do rudy albo odetnij sąsiadów zawałem.', waga: 30 });
  }

  if (!kandydaci.length) {
    return { tekst: 'Nic pilnego. Patrz, kto rośnie — wstęga pod płytą powie ci to pierwsza.', waga: 0 };
  }
  kandydaci.sort((a, b) => b.waga - a.waga);
  return kandydaci[0];
}
