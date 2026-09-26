import type { Sim } from './sim';
import { T, PASSABLE } from './tiles';
import { Race } from './races';
import { Job, wyslijDoRdzenia } from './creatures';
import { RYTUAL as R, PIELGRZYMKA as P } from '../nastawy/rytual';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';

export interface StanRytualu {
  /** Postęp nacji, która jest najbliżej przebicia — tylko do pokazania graczowi. */
  postep: number;
  /** Nacja, która ostatnio ruszyła kamień. To jej ludzie schodzą potem do środka. */
  klan: number;
  wierni: number;
  pekniecia: number;
  /** Czy z przedsionka da się już dojść do rdzenia. Liczone z mapy, nie z licznika. */
  otwarta: boolean;
  /** Ile kafli skorupy stało w środkowej kolumnie na początku — do kamieni milowych. */
  skorupa: number;
}

/** Ilu pielgrzymów naraz wysyła jedna nacja (patrz nastawy/rytual.ts). */
export const PIELGRZYMOW = P.maxPielgrzymow;

/**
 * Rytuał otwarcia rdzenia. Skorupa jest nie do rozkucia — pęka wyłącznie pod modlitwą,
 * a postęp zapisuje się na nacji, nie na ludziach. Wierni mogą umrzeć, zgłodnieć i
 * wrócić do gniazda; robota, którą już wykuli, nie przepada. Dzięki temu rytuał jest
 * długą operacją gracza (droga, jedzenie, obrona przed intruzami), a nie sprawdzianem,
 * czy akurat ci trzej przeżyją.
 */
export function tikRytualu(sim: Sim, stan: StanRytualu): void {
  const w = sim.world;
  if (stan.skorupa === 0) stan.skorupa = kamienNadRdzeniem(sim);   // grubość nietkniętej skorupy
  const liczniki = new Map<number, number>();
  // gdzie się modlą: suma przesunięć od rdzenia — skorupa pęka w ich stronę
  const kierunek = new Map<number, [number, number]>();
  let najlepszy = -1, ilu = 0;

  for (const c of sim.creatures) {
    if (c.dead || c.race === Race.HUMAN) continue;
    if (Math.abs(c.x - w.coreX) > R.promien || Math.abs(c.y - w.coreY) > R.promien) continue;
    if (c.devotion < R.minOddanie) continue;
    const n = (liczniki.get(c.clan) ?? 0) + 1;
    liczniki.set(c.clan, n);
    const k = kierunek.get(c.clan) ?? [0, 0];
    k[0] += c.x - (w.coreX + 0.5); k[1] += c.y - (w.coreY + 0.5);
    kierunek.set(c.clan, k);
    if (n > ilu) { ilu = n; najlepszy = c.clan; }
  }

  // Kuje jedna nacja — ta, której wiernych jest pod skorupą najwięcej. Gdy kuły wszystkie
  // naraz, ich pęknięcia się sumowały i trzy klany tej samej krwi otwierały rdzeń
  // w pięć minut, zamiast w długiej, bronionej warcie.
  for (const [id, n] of liczniki) {
    if (n < R.potrzebaWiernych || id !== najlepszy) continue;
    const klan = sim.clans[id];
    // nacja, której ktoś właśnie klęczy pod skorupą, z definicji nie jest martwa;
    // flaga potrafi zostać po przepisaniu ludzi między klanami i mroziła rytuał na zawsze
    if (!klan) continue;
    if (klan.dead && n > 0) klan.dead = false;
    // każde kolejne pęknięcie idzie oporniej — skorupa nie ma puścić w dwie minuty
    const opor = 1 + klan.pekniecia * R.oporNaPekniecie;
    const przed = klan.rytual;
    // Zegar rytuału: przy czterech wiernych i pełnym oddaniu całe pięć pęknięć
    // zajmuje około dziesięciu–piętnastu minut nieprzerwanej warty.
    const laska = sim.lagodna ? R.laskawaMnoznik : 1;
    // na początku partii skorupa jest twardsza — wygrana w pięć minut nie jest wygraną
    const wczesnie = R.wczesnieOd + (1 - R.wczesnieOd) * Math.min(1, sim.tick / (TIKOW_NA_MINUTE * R.wczesnieMinut));
    klan.rytual = Math.min(1, klan.rytual + R.tempo * laska * wczesnie * (Math.min(R.maxWiernychLiczonych, n) / R.normaWiernych) * (R.podstawaOddania + klan.devotion) / opor);

    if (przed < R.kronikaStart && klan.rytual >= R.kronikaStart) {
      sim.gdzie(w.coreX, w.przedsionekY)
        .log(`${klan.name} zeszli pod twój rdzeń i nie chcą odejść. Modlą się do kamienia.`, 'wiara', `rytual-start${id}`);
    } else if (przed < R.kronikaPolowa && klan.rytual >= R.kronikaPolowa) {
      sim.gdzie(w.coreX, w.przedsionekY)
        .log('Modlitwa pod skorupą nie cichnie. Kamień zaczyna się rysować.', 'otchlan', `rytual-pol${id}`);
    }

    if (klan.rytual >= 1) {
      klan.rytual = 0;
      klan.pekniecia++;
      stan.pekniecia++;
      stan.klan = id;                  // to ta nacja kuje; to jej ludzie wejdą do środka
      // Skorupa pęka od strony, z której się modlą. Wcześniej zawsze od góry, więc nacja
      // mieszkająca pod rdzeniem albo obok niego kruszyła kamień i nigdy nie mogła wejść.
      const [kx, ky] = kierunek.get(id) ?? [0, -1];
      const strona: Strona = Math.abs(ky) >= Math.abs(kx) ? (ky < 0 ? 'gora' : 'dol') : (kx < 0 ? 'lewo' : 'prawo');
      otworzSkorupe(sim, stan, strona);
      // sprawdzamy drożność od razu po pęknięciu, żeby wierni nie czekali na tik kontrolny
      if (!stan.otwarta && drogaDoRdzenia(sim)) {
        stan.otwarta = true;
        sim.gdzie(w.coreX, w.coreY - 6).log('Droga do rdzenia stoi otworem.', 'koniec', 'skorupa-otwarta');
      }
    }
  }

  // Czy droga naprawdę stoi otworem — sprawdzamy mapę, nie licznik pęknięć. Licznik
  // kłamał: skorupa kruszyła się wszerz, a gra już wysyłała ludzi na lity kamień.
  // (bez względu na to, skąd wzięło się przejście — zawał, woda czy pęknięcia)
  if (!stan.otwarta && sim.tick % R.sprawdzDrogeCo === 0 && drogaDoRdzenia(sim)) {
    stan.otwarta = true;
    sim.gdzie(w.coreX, w.coreY - 6).log('Droga do rdzenia stoi otworem.', 'koniec', 'skorupa-otwarta');
  }

  // Po przebiciu skorupy do środka schodzą wyłącznie wierni tej nacji, która kuła.
  // Przypadkowy przechodzień nie porzuca swoich spraw, żeby wejść do cudzego boga.
  if (stan.otwarta && sim.tick % R.zejscieCo === 0) {
    // kto prowadzi: nacja, która kuła, a gdy nikt nie kuł — ta z najliczniejszą wartą
    const prowadzi = sim.clans[stan.klan >= 0 ? stan.klan : najlepszy];
    // schodzą wierni tej nacji — o wejściu decyduje ich własna wiara, nie średnia z domu
    if (prowadzi) {
      for (const c of sim.creatures) {
        if (c.dead || c.race === Race.HUMAN) continue;
        // schodzą wierni prowadzącej nacji — albo każdy, kto wierzy całym sobą
        if (c.clan !== prowadzi.id && c.devotion <= R.zejscieObcyOddanie) continue;
        if (c.devotion <= R.uwolnienieWlasne && prowadzi.devotion <= R.uwolnienieNacja) continue;
        if (Math.hypot(c.x - w.coreX, c.y - w.coreY) > R.zejscieZasieg) continue;
        // (już schodzi — chyba że nie dostał drogi, bo w tym tiku zabrakło na nią czasu)
        if (c.job === Job.DIG && c.jx === w.coreX && c.jy === w.coreY && c.droga) break;
        if (wyslijDoRdzenia(sim, c, R.zejscieTikow)) break;
      }
    }
  }

  // stan globalny tylko do podpowiedzi i wskaźników
  stan.wierni = ilu;
  if (stan.klan < 0) stan.klan = najlepszy;
  let max = 0;
  for (const k of sim.clans) if (!k.dead && k.rytual > max) max = k.rytual;
  stan.postep = max;
}

/** Ile kafli kamienia stoi jeszcze w środkowej kolumnie nad rdzeniem. */
export function kamienNadRdzeniem(sim: Sim): number {
  const w = sim.world;
  let n = 0;
  for (let y = w.coreY - R.kolumnaSkorupy; y <= w.coreY; y++) {
    if (w.tile[w.idx(w.coreX, y)] === T.STONE) n++;
  }
  return n;
}

/**
 * Czy z przedsionka da się przejść do rdzenia. Rozlewanie się po przejezdnych kaflach
 * w pudle wokół rdzenia — tanie, bo liczone najwyżej co dwadzieścia tików.
 */
export function drogaDoRdzenia(sim: Sim): boolean {
  const w = sim.world;
  const x0 = w.coreX - R.drogaPudloX, x1 = w.coreX + R.drogaPudloX;
  const y0 = w.coreY - R.drogaPudloGora, y1 = Math.min(w.h - 1, w.coreY + R.drogaPudloDol);
  const widziane = new Set<number>();
  // start ze wszystkich stron poza skorupą, nie tylko z przedsionka nad nią — wierni
  // spod rdzenia i z boku też mają wejście, jeśli skorupa pękła w ich stronę
  const kolejka: number[] = [];
  for (let y = Math.max(0, y0); y <= y1; y++) {
    for (let x = Math.max(0, x0); x <= Math.min(w.w - 1, x1); x++) {
      if (Math.abs(x - w.coreX) <= R.drogaStartPozaPromieniem && Math.abs(y - w.coreY) <= R.drogaStartPozaPromieniem) continue;
      const i = w.idx(x, y);
      if (PASSABLE[w.tile[i]] === 1) kolejka.push(i);
    }
  }
  if (!kolejka.length) return false;
  while (kolejka.length) {
    const i = kolejka.pop()!;
    if (widziane.has(i)) continue;
    widziane.add(i);
    const x = i % w.w, y = (i / w.w) | 0;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const t = w.tile[i];
    if (t === T.CORE) return true;
    if (PASSABLE[t] !== 1) continue;
    if (x > 0) kolejka.push(i - 1);
    if (x < w.w - 1) kolejka.push(i + 1);
    if (y > 0) kolejka.push(i - w.w);
    if (y < w.h - 1) kolejka.push(i + w.w);
  }
  return false;
}

/**
 * Ilu pielgrzymów tej nacji jest właśnie w drodze albo na miejscu. Klan wysyła
 * nowych, gdy poprzedni wracają — stąd zmiana warty zamiast jednej wyprawy.
 */
export function pielgrzymowKlanu(sim: Sim, clanId: number): number {
  const w = sim.world;
  let n = 0;
  // liczą się i ci w drodze, i ci, którzy już siedzą pod rdzeniem — inaczej głodny
  // pielgrzym przestawał być pielgrzymem, a na jego miejsce schodził następny
  for (const c of sim.creatures) {
    if (c.dead || c.clan !== clanId) continue;
    if (c.job === Job.PIELGRZYM || (Math.abs(c.x - w.coreX) < P.wartaPudloX && Math.abs(c.y - (w.coreY - P.wartaNadRdzeniem)) < P.wartaPudloY)) n++;
  }
  return n;
}

/** Grzyb i kości w suchej strefie przy przedsionku — tym żyje warta pod rdzeniem. */
export function policzJedzeniePrzedsionka(sim: Sim): number {
  const w = sim.world;
  let n = 0;
  for (let y = w.coreY - P.jedzenieOd; y <= w.coreY - P.jedzenieDo; y++) {
    for (let x = w.coreX - P.jedzeniePolSzerokosci; x <= w.coreX + P.jedzeniePolSzerokosci; x++) {
      if (!w.inb(x, y) || !w.suchaStrefa(x, y)) continue;
      const t = w.tile[w.idx(x, y)];
      if (t === T.FUNGUS || t === T.BONES) n++;
    }
  }
  return n;
}

/**
 * Kruszy kamień od strony przedsionka w głąb. Pęknięcie schodzi kolumną — najpierw
 * cała środkowa, dopiero potem boki — więc po pięciu–sześciu jest przejście.
 * Wcześniej pętle były odwrotnie i skorupa kruszyła się wszerz: pięć rzędów po pięć
 * kafli to było dwadzieścia pięć pęknięć, a gra już po piątym wysyłała ludzi na kamień.
 */
type Strona = 'gora' | 'dol' | 'lewo' | 'prawo';

function otworzSkorupe(sim: Sim, stan: StanRytualu, strona: Strona = 'gora'): void {
  const w = sim.world;
  const przed = kamienNadRdzeniem(sim);
  for (const d of R.kolumnyPekniec) {
    for (let r = R.glebokoscPekniecia; r >= 0; r--) {
      const x = strona === 'lewo' ? w.coreX - r : strona === 'prawo' ? w.coreX + r : w.coreX + d;
      const y = strona === 'gora' ? w.coreY - r : strona === 'dol' ? w.coreY + r : w.coreY + d;
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y);
      if (w.tile[i] !== T.STONE) continue;
      w.tile[i] = T.AIR;
      w.oznaczSlad(x, y, 2, sim.tick);
      sim.efekt(x + 0.5, y + 0.5, 'zawal');

      // Kronika dostaje pierwszy raz i kamienie milowe — nie dwadzieścia pięć tych
      // samych zdań pod rząd.
      if (stan.pekniecia === 1) {
        sim.gdzie(x, y).log('Skorupa rdzenia pękła. Ktoś jest coraz bliżej.', 'koniec', 'skorupa-pierwsze');
      } else if (stan.skorupa > 0 && przed > stan.skorupa / 2 && kamienNadRdzeniem(sim) <= stan.skorupa / 2) {
        sim.gdzie(x, y).log('Skorupa pęka do połowy. Słychać ich pod samym rdzeniem.', 'koniec', 'skorupa-polowa');
      }
      return;
    }
  }
}
