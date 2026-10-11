import type { Sim } from './sim';
import { Race, RACES, odmien } from './races';
import { T } from './tiles';
import { aktualnyPlan } from './pielgrzymka';
import { RYTUAL, PIELGRZYMKA } from '../nastawy/rytual';
import { REMAKE } from '../nastawy/lud';
import { grzybPrzy } from './lud';

/** Remake v1: podpis siedziby — ile w spiżarni i ile grzyba rośnie obok. */
function podpisSiedziby(sim: Sim, k: Sim['clans'][number]): string {
  const g = grzybPrzy(sim, k.hx, k.hy);
  return `siedziba · spiżarnia ${k.stock}${g ? ` · grzyb obok ${g}` : ''}`;
}

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
    // WERSJA ANDROID: tylko to, co gracz ma — Nakarm, Szepnij, Cud i wybory na kartach
    const rada = r === Race.DWARF ? 'Żyją z ognia kuźni — gdy odsłoni się ruda, daj ją im, a wykują nowych.'
      : r === Race.TROLL ? (glebocy
          ? 'Trole rodzą się z szaleńców w głębi — przy żyle szaleństwa wybierz „zostaw”.'
          : 'Trole rodzą się z szaleńców w głębi; ktoś musi tam najpierw zejść.')
      : 'Nakarm ich — przeciągnij palcem po ich jaskini.';
    kandydaci.push({
      tekst: `${nazwa} ${odmien(r, 'jest', 'są')} o krok od wygaśnięcia. ${rada}`,
      cel: klan ? { x: klan.hx, y: klan.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, klan) : nazwa } : undefined,
      waga: 100 - ilu,
    });
  }

  // 2. jedna rasa rośnie ponad miarę
  const rytualnyKlan = sim.rytual.klan >= 0 && sim.rytual.postep > 0.05 ? sim.clans[sim.rytual.klan] : null;
  if (sim.dominance > 0.72 && sim.domRace >= 0 && rytualnyKlan?.race !== sim.domRace) {
    const nazwa = RACES[sim.domRace].name;
    const klan = sim.clans.filter((k) => !k.dead && k.race === sim.domRace && k.pop > 0).sort((a, b) => b.pop - a.pop)[0];
    kandydaci.push({
      tekst: `${nazwa} ${odmien(sim.domRace, 'bierze', 'biorą')} górę. Szepnij komuś z nich „prorokuj” — nacja pęknie na dwie. Klęski z kart kieruj na nich.`,
      cel: klan ? { x: klan.hx, y: klan.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, klan) : nazwa } : undefined,
      waga: 80 + sim.dominance * 20,
    });
  }

  // 3. senność
  if (sim.sen > 0.25) {
    kandydaci.push({ tekst: 'Zasypiasz. Jedna nacja zjada resztę — szepnij komuś z niej „prorokuj”, a klan pęknie na dwa.', waga: 90 });
  }

  // 4. głód powszechny
  let glodni = 0, zywi = 0;
  for (const c of sim.creatures) { if (c.dead) continue; zywi++; if (c.hunger > 0.7) glodni++; }
  if (zywi > 0 && glodni / zywi > 0.45) {
    kandydaci.push({ tekst: 'Większość twoich mieszkańców głoduje. Nakarm ich — przeciągnij palcem tam, gdzie mieszkają.', waga: 70 });
  }

  // 5. Wiara wysycha — brak ołtarzy
  let oltarze = 0;
  for (const t of sim.world.tile) if (t === T.SHRINE || t === T.GLYPH) oltarze++;
  if (sim.wiara < 40 && oltarze < 2 && zywi > 6) {
    kandydaci.push({ tekst: 'Nikt się do ciebie nie modli. Zrób Cud przy gnieździe, a gdy odsłoni się ruda — daj ją Ślepemu Ludowi na ołtarz.', waga: 60 });
  }

  // 6. rytuał: jedyna droga do końca gry musi być widoczna, gdy staje się możliwa
  const najwierniejszy = sim.clans.filter((k) => !k.dead && k.pop > 2).sort((a, b) => b.devotion - a.devotion)[0];
  if (sim.rytual.postep > 0.02 || sim.rytual.wierni >= RYTUAL.potrzebaWiernych) {
    kandydaci.push({
      tekst: 'Twoi wierni kują pod skorupą rdzenia. Nie przeszkadzaj im — i nie daj im umrzeć z głodu.',
      cel: { x: sim.world.coreX, y: sim.world.przedsionekY, r: 7, tekst: 'rytuał' },
      waga: 85,
    });
  } else if (najwierniejszy && najwierniejszy.devotion > PIELGRZYMKA.oddanieNacji) {     // próg pielgrzymki
    // Warta pod rdzeniem żyje z tego, co rośnie przy przedsionku. Z grzybem schodzi
    // i bez drogi powrotnej; drogę do domu można jej wydrążyć, ale nie trzeba.
    const w = sim.world;
    if (sim.jedzeniePrzedsionka < PIELGRZYMKA.jedzenieWPrzedsionku) {
      kandydaci.push({
        tekst: `${najwierniejszy.name} wierzą dość mocno, by zejść pod twój rdzeń. Nakarm przedsionek nad rdzeniem — z tym jedzeniem ich warta przeżyje pod skorupą.`,
        cel: { x: w.coreX, y: w.przedsionekY, r: 7, tekst: 'nakarm tutaj' },
        waga: 65,
      });
    } else {
      const plan = najwierniejszy.powrotOk === false ? aktualnyPlan(sim) : null;
      if (plan && plan.kopac.length) {
        const i = plan.kopac[plan.kopac.length - 1];
        kandydaci.push({
          tekst: `${sim.clans[plan.klan].name} schodzą pod rdzeń. Jeśli chcesz, żeby wracali do gniazda, wydrąż korytarz wzdłuż złotej kreski.`,
          cel: { x: (i % w.w) + 0.5, y: ((i / w.w) | 0) + 0.5, r: 3, tekst: 'drąż tutaj' },
          waga: 35,
        });
      } else {
        kandydaci.push({
          tekst: `${najwierniejszy.name} schodzą pod twój rdzeń. Pilnuj, żeby grzyb przy przedsionku nie zniknął.`,
          cel: { x: w.coreX, y: w.przedsionekY, r: 7, tekst: 'przedsionek' },
          waga: 35,
        });
      }
    }
  }

  // 6b. droga do wolności, krok „oddanie": nikt jeszcze nie wierzy dość mocno
  const duzeWierne = sim.clans.filter((k) => !k.dead && k.pop >= 8 && RACES[k.race].faithGain > 0)
    .sort((a, b) => b.devotion - a.devotion)[0];
  if (sim.tick > 3000 && sim.rytual.pekniecia === 0 && duzeWierne && duzeWierne.devotion <= PIELGRZYMKA.oddanieNacji) {
    kandydaci.push({
      tekst: `Żeby cię uwolnić, jedna nacja musi uwierzyć mocniej. ${duzeWierne.name} są najbliżej — postaw Znak przy ich gnieździe albo szepnij trzem z nich „módl się”.`,
      cel: { x: duzeWierne.hx, y: duzeWierne.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, duzeWierne) : duzeWierne.name },
      waga: 25,
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
