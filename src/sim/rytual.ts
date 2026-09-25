import type { Sim } from './sim';
import { T, PASSABLE } from './tiles';
import { Race } from './races';
import { Job } from './creatures';

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

const PROMIEN = 16;      // przedsionek: tyle kafli od rdzenia
const POTRZEBA = 3;      // tylu wiernych naraz, żeby kamień w ogóle drgnął
/** Ilu pielgrzymów naraz wysyła jedna nacja. Reszta zostaje w domu i je. */
export const PIELGRZYMOW = 5;

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
  let najlepszy = -1, ilu = 0;

  for (const c of sim.creatures) {
    if (c.dead || c.race === Race.HUMAN) continue;
    if (Math.abs(c.x - w.coreX) > PROMIEN || Math.abs(c.y - w.coreY) > PROMIEN) continue;
    if (c.devotion < 0.35) continue;
    const n = (liczniki.get(c.clan) ?? 0) + 1;
    liczniki.set(c.clan, n);
    if (n > ilu) { ilu = n; najlepszy = c.clan; }
  }

  for (const [id, n] of liczniki) {
    if (n < POTRZEBA) continue;
    const klan = sim.clans[id];
    // nacja, której ktoś właśnie klęczy pod skorupą, z definicji nie jest martwa;
    // flaga potrafi zostać po przepisaniu ludzi między klanami i mroziła rytuał na zawsze
    if (!klan) continue;
    if (klan.dead && n > 0) klan.dead = false;
    // każde kolejne pęknięcie idzie oporniej — skorupa nie ma puścić w dwie minuty
    const opor = 1 + klan.pekniecia * 0.3;
    const przed = klan.rytual;
    // Zegar rytuału: przy czterech wiernych i pełnym oddaniu całe pięć pęknięć
    // zajmuje około dziesięciu–piętnastu minut nieprzerwanej warty.
    klan.rytual = Math.min(1, klan.rytual + 0.00025 * (Math.min(6, n) / 3) * (0.6 + klan.devotion) / opor);

    if (przed < 0.08 && klan.rytual >= 0.08) {
      sim.gdzie(w.coreX, w.coreY - 14)
        .log(`${klan.name} zeszli pod twój rdzeń i nie chcą odejść. Modlą się do kamienia.`, 'wiara', `rytual-start${id}`);
    } else if (przed < 0.55 && klan.rytual >= 0.55) {
      sim.gdzie(w.coreX, w.coreY - 14)
        .log('Modlitwa pod skorupą nie cichnie. Kamień zaczyna się rysować.', 'otchlan', `rytual-pol${id}`);
    }

    if (klan.rytual >= 1) {
      klan.rytual = 0;
      klan.pekniecia++;
      stan.pekniecia++;
      stan.klan = id;                  // to ta nacja kuje; to jej ludzie wejdą do środka
      otworzSkorupe(sim, stan);
      // sprawdzamy drożność od razu po pęknięciu, żeby wierni nie czekali na tik kontrolny
      if (!stan.otwarta && drogaDoRdzenia(sim)) {
        stan.otwarta = true;
        sim.gdzie(w.coreX, w.coreY - 6).log('Droga do rdzenia stoi otworem.', 'koniec', 'skorupa-otwarta');
      }
    }
  }

  // Czy droga naprawdę stoi otworem — sprawdzamy mapę, nie licznik pęknięć. Licznik
  // kłamał: skorupa kruszyła się wszerz, a gra już wysyłała ludzi na lity kamień.
  if (stan.pekniecia > 0 && !stan.otwarta && sim.tick % 20 === 0 && drogaDoRdzenia(sim)) {
    stan.otwarta = true;
    sim.gdzie(w.coreX, w.coreY - 6).log('Droga do rdzenia stoi otworem.', 'koniec', 'skorupa-otwarta');
  }

  // Po przebiciu skorupy do środka schodzą wyłącznie wierni tej nacji, która kuła.
  // Przypadkowy przechodzień nie porzuca swoich spraw, żeby wejść do cudzego boga.
  if (stan.otwarta && sim.tick % 20 === 0 && stan.klan >= 0) {
    const prowadzi = sim.clans[stan.klan];
    if (prowadzi && prowadzi.devotion > 0.55) {
      for (const c of sim.creatures) {
        if (c.dead || c.race === Race.HUMAN || c.clan !== stan.klan) continue;
        if (c.devotion <= 0.55) continue;
        if (Math.hypot(c.x - w.coreX, c.y - w.coreY) > 22) continue;
        if (c.job === Job.DIG && c.jx === w.coreX && c.jy === w.coreY) break;
        c.job = Job.DIG; c.jx = w.coreX; c.jy = w.coreY; c.jt = 1500; c.dig = 0;
        break;
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
  for (let y = w.coreY - 16; y <= w.coreY; y++) {
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
  const x0 = w.coreX - 24, x1 = w.coreX + 24;
  const y0 = w.coreY - 30, y1 = Math.min(w.h - 1, w.coreY + 12);
  const widziane = new Set<number>();
  // start z całego przedsionka, nie z jednego kafla: ten jeden potrafi być zasypany
  // ziemią i wtedy sprawdzenie na zawsze mówiło „zamknięte"
  const kolejka: number[] = [];
  for (let y = w.coreY - 18; y <= w.coreY - 10; y++) {
    for (let x = w.coreX - 5; x <= w.coreX + 5; x++) {
      if (!w.inb(x, y)) continue;
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
  let n = 0;
  for (const c of sim.creatures) if (!c.dead && c.clan === clanId && c.job === Job.PIELGRZYM) n++;
  return n;
}

/**
 * Kruszy kamień od strony przedsionka w głąb. Pęknięcie schodzi kolumną — najpierw
 * cała środkowa, dopiero potem boki — więc po pięciu–sześciu jest przejście.
 * Wcześniej pętle były odwrotnie i skorupa kruszyła się wszerz: pięć rzędów po pięć
 * kafli to było dwadzieścia pięć pęknięć, a gra już po piątym wysyłała ludzi na kamień.
 */
function otworzSkorupe(sim: Sim, stan: StanRytualu): void {
  const w = sim.world;
  const przed = kamienNadRdzeniem(sim);
  for (const dx of [0, -1, 1, -2, 2]) {
    const x = w.coreX + dx;
    for (let r = 16; r >= 0; r--) {
      const y = w.coreY - r;
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
