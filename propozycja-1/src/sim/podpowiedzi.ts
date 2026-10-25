import type { Sim } from './sim';
import { Race, RACES, odmien } from './races';
import { T } from './tiles';
import { aktualnyPlan } from './pielgrzymka';
import { RYTUAL, PIELGRZYMKA } from '../nastawy/rytual';
import { REMAKE } from '../nastawy/lud';
import { linaPrzecieta, sklejajacy } from './lina-wiadra';

/** Remake v2: podpis siedziby (jedzenie jest w wiadrach, nie w spiżarni). */
export function podpisSiedziby(_sim: Sim, _k: Sim['clans'][number]): string {
  return 'siedziba';
}

/** Cel podpowiedzi; `klan` — pierścień siedziby, który idzie za nią, gdy siedziba się przeniesie. */
export interface Podpowiedz { tekst: string; cel?: { x: number; y: number; r: number; tekst: string; klan?: number }; waga: number; }

/**
 * Jedno zdanie o tym, co w tej chwili warto zrobić. Sandbox bez takiego zdania jest
 * nieczytelny: gracz widzi mrowisko i nie wie, czego od niego chcą.
 * Podpowiedzi czytają stan świata, nie skrypt.
 */
export function podpowiedz(sim: Sim): Podpowiedz {
  const kandydaci: Podpowiedz[] = [];
  // od rozpadu pomnika do końca walki pierścień siedziby nie ma sensu (siedziba bywa wtedy w krypcie, pod bossem)
  const walka = (sim.lud.pomnik?.faza ?? 'stoi') !== 'stoi';

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
      cel: klan && !walka ? { x: klan.hx, y: klan.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, klan) : nazwa, klan: klan.id } : undefined,
      waga: 100 - ilu,
    });
  }

  // 2. jedna rasa rośnie ponad miarę
  const rytualnyKlan = sim.rytual.klan >= 0 && sim.rytual.postep > 0.05 ? sim.clans[sim.rytual.klan] : null;
  // (Alpha: jeden lud zawsze „bierze górę”, a szeptu „prorokuj” nie ma — ta rada zasłaniała wszystkie inne)
  if (!REMAKE && sim.dominance > 0.72 && sim.domRace >= 0 && rytualnyKlan?.race !== sim.domRace) {
    const nazwa = RACES[sim.domRace].name;
    const klan = sim.clans.filter((k) => !k.dead && k.race === sim.domRace && k.pop > 0).sort((a, b) => b.pop - a.pop)[0];
    kandydaci.push({
      tekst: `${nazwa} ${odmien(sim.domRace, 'bierze', 'biorą')} górę. Szepnij komuś z nich „prorokuj” — nacja pęknie na dwie. Klęski z kart kieruj na nich.`,
      cel: klan && !walka ? { x: klan.hx, y: klan.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, klan) : nazwa, klan: klan.id } : undefined,
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
    kandydaci.push({ tekst: 'Większość twoich mieszkańców głoduje. Nakarm ich — dotknij miejsca, gdzie stoją, a zjedzie tam wiadro.', waga: 70 });
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
      tekst: 'Twoi wierni modlą się w krypcie i kruszą Wielki Pomnik. Nie przeszkadzaj im — i nie daj im umrzeć z głodu.',
      cel: { x: sim.world.coreX, y: sim.world.przedsionekY, r: 7, tekst: 'rytuał' },
      waga: 85,
    });
  } else if (najwierniejszy && najwierniejszy.devotion > PIELGRZYMKA.oddanieNacji) {     // próg pielgrzymki
    // Warta pod rdzeniem żyje z tego, co rośnie przy przedsionku. Z grzybem schodzi
    // i bez drogi powrotnej; drogę do domu można jej wydrążyć, ale nie trzeba.
    const w = sim.world;
    // (Alpha: warcie jedzenie z jedynego wiadra donoszą robotnicy — Nakarm i tak spuszcza je tylko szybem do sali)
    if (!REMAKE && sim.jedzeniePrzedsionka < PIELGRZYMKA.jedzenieWPrzedsionku) {
      kandydaci.push({
        tekst: `${najwierniejszy.name} wierzą dość mocno, by zejść pod twój rdzeń. ${REMAKE ? 'Spuść wiadro nad przedsionek rytem „Nakarm”' : 'Nakarm przedsionek nad rdzeniem'} — z tym jedzeniem ich warta przeżyje pod skorupą.`,
        cel: { x: w.coreX, y: w.przedsionekY, r: 7, tekst: 'nakarm tutaj' },
        waga: 65,
      });
    } else {
      const plan = najwierniejszy.powrotOk === false ? aktualnyPlan(sim) : null;
      if (plan && plan.kopac.length) {
        const i = plan.kopac[plan.kopac.length - 1];
        kandydaci.push({
          tekst: `${sim.clans[plan.klan].name} schodzą do krypty. Jeśli chcesz, żeby wracali, zaznacz robotników i wskaż szyb drogi wiernych (od wnęki przy sali) — wykują go od góry w dół, a schody pojawią się same.`,
          cel: { x: (i % w.w) + 0.5, y: ((i / w.w) | 0) + 0.5, r: 3, tekst: 'drąż tutaj' },
          waga: 35,
        });
      } else {
        kandydaci.push({
          tekst: `${najwierniejszy.name} schodzą do krypty pod Wielkim Pomnikiem. ${REMAKE ? 'Pilnuj, żeby wiadra docierały do warty przy przedsionku.' : 'Pilnuj, żeby grzyb przy przedsionku nie zniknął.'}`,
          cel: { x: w.coreX, y: w.przedsionekY, r: 7, tekst: 'przedsionek' },
          waga: 35,
        });
      }
    }
  }

  // 6b. droga do wolności, krok „oddanie": nikt jeszcze nie wierzy dość mocno
  // (Alpha: lud ma stałe sześć głów — próg „dużej nacji” go nie dotyczy; liczy się tylko twój lud)
  const duzeWierne = sim.clans.filter((k) => !k.dead && (REMAKE ? k.race === Race.GOBLIN && k.pop > 0 : k.pop >= 8) && RACES[k.race].faithGain > 0)
    .sort((a, b) => b.devotion - a.devotion)[0];
  if (sim.tick > 3000 && !walka && sim.rytual.pekniecia === 0 && duzeWierne && duzeWierne.devotion <= PIELGRZYMKA.oddanieNacji) {
    kandydaci.push({
      tekst: REMAKE
        ? 'Żeby cię uwolnić, lud musi uwierzyć mocniej. Zrób Cud przy siedzibie albo szepnij pobożnym „módl się”.'
        : `Żeby cię uwolnić, jedna nacja musi uwierzyć mocniej. ${duzeWierne.name} są najbliżej — postaw Znak przy ich gnieździe albo szepnij pobożnym „módl się”.`,
      cel: { x: duzeWierne.hx, y: duzeWierne.hy, r: 5, tekst: REMAKE ? podpisSiedziby(sim, duzeWierne) : duzeWierne.name, klan: duzeWierne.id },
      waga: 25,
    });
  }

  // 6c. Alpha, etap 3b: żelaza jeszcze nikt nie wykuł, a robotnik stoi bez rozkazu — najbliższa kępa rudy pod siedzibą
  // (ponad „zrób Cud” z 6b i „przedsionek” z 6: kółko podpowiada, co dać bezczynnemu; głód i rytuał ją przykryją)
  const lud = sim.clans.find((k) => !k.dead && k.race === Race.GOBLIN);
  const bezczynny = sim.creatures.some((c) => !c.dead && c.race === Race.GOBLIN && c.rola === 'robotnik' && !c.polecenie);
  if (lud && bezczynny && sim.tick > 3600 && sim.zelazo === 0) {
    const w = sim.world;
    let best: [number, number] | null = null, bestD = Infinity;
    for (let y = lud.hy; y < Math.min(w.h, lud.hy + 50); y++) {
      for (let x = Math.max(0, lud.hx - 50); x < Math.min(w.w, lud.hx + 50); x++) {
        if (w.tile[w.idx(x, y)] !== T.ORE) continue;
        const d = Math.abs(x - lud.hx) + Math.abs(y - lud.hy);
        if (d < bestD) { bestD = d; best = [x, y]; }
      }
    }
    if (best) {
      kandydaci.push({
        tekst: 'Pod salą leży rdzawa ruda. Zaznacz robotnika i wskaż ją — wykuje całą kępę, a żelazo samo spłynie do licznika.',
        cel: { x: best[0], y: best[1], r: 3, tekst: 'żelazo' },
        waga: 40,
      });
    }
  }

  // 6d. Alpha, etap 4: dłoń z otchłani przecięła linę wiadra — póki nikt jej nie skleja, to najpilniejsze po wymieraniu
  const lp = linaPrzecieta(sim);
  if (lp && !sklejajacy(sim) && !sim.creatures.some((c) => !c.dead && c.polecenie?.typ === 'naprawa')) {
    kandydaci.push({
      tekst: 'Lina wiadra jest przecięta — z góry nic nie zjedzie. Pod płytą „napraw linę wiadra”: ktoś pójdzie, wespnie się i ją sklei.',
      cel: { x: lp.x + 0.5, y: lp.koniec, r: 3, tekst: 'przecięta lina' },
      waga: 95,
    });
  }

  // 7. sporo krwi na koncie
  if (sim.krew > 260 && kandydaci.length === 0) {
    kandydaci.push({ tekst: 'Krwi masz dość. Wydrąż komuś drogę do rudy albo odetnij sąsiadów zawałem.', waga: 30 });
  }

  if (!kandydaci.length) {
    return { tekst: 'Nic pilnego. Pod płytą jest twoja drużyna — dotknij medalionu albo postaci i wskaż na mapie, dokąd ma iść.', waga: 0 };
  }
  kandydaci.sort((a, b) => b.waga - a.waga);
  return kandydaci[0];
}
