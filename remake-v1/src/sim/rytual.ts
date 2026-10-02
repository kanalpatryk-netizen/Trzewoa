import type { Sim } from './sim';
import { zapisz } from './dziennik';
import { T } from './tiles';
import { Race } from './races';
import { Job, wyslijDoRdzenia } from './creatures';
import { wolny, stoi, uchwyt, nadOgniem } from './droga';
import { RYTUAL as R, PIELGRZYMKA as P } from '../nastawy/rytual';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';
import { RDZEN } from '../nastawy/swiat';

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
  /** Strona, z której pęka skorupa — ustala ją pierwsze pęknięcie. */
  strona?: Strona;
}


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
    // liczy się też pielgrzym, który już stanął w przedsionku — przedsionek sięga wyżej niż
    // promień modlitwy i warta potrafiła klęczeć tam całą partię, nie krusząc ani okruchu
    const wPrzedsionku = c.job === Job.PIELGRZYM && Math.abs(c.x - w.coreX) < P.przedsionekX && Math.abs(c.y - w.przedsionekY) < P.przedsionekY;
    if (!wPrzedsionku && (Math.abs(c.x - w.coreX) > R.promien || Math.abs(c.y - w.coreY) > R.promien)) continue;
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
  // gdy droga już stoi otworem, kamień nie ma po co dalej pękać (ani sypać Wiarą)
  // WERSJA ANDROID: modlą się wszyscy wierni pod skorupą razem — kuje (i wejdzie do środka)
  // nacja, której jest tam najwięcej. Liczone osobno, sześciu pielgrzymów z trzech nacji
  // (po dwóch) nie kruszyło kamienia wcale, a gracz nie miał jak tego zobaczyć.
  let razem = 0;
  for (const n of liczniki.values()) razem += n;
  for (const [id] of liczniki) {
    if (stan.otwarta) break;
    const n = razem;
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
    const laska = sim.lagodna ? R.laskawaMnoznik : sim.koszmar ? R.koszmarMnoznik : 1;
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

    if (klan.rytual >= 1) peknij(sim, stan, klan, id);
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
    // Kilku naraz i nie w kółko tego samego: wcześniej pętla kończyła się na pierwszym
    // chętnym, więc jeden wierny zamknięty w kieszeni skały dostawał rozkaz co dwadzieścia
    // tików, a cała reszta warty stała pod otwartą skorupą do końca gry.
    if (prowadzi) {
      let idzie = 0, prob = 0;
      for (const c of sim.creatures) {
        if (idzie >= R.zejscieNaRaz || prob >= R.zejscieProb) break;
        if (c.dead || c.race === Race.HUMAN) continue;
        // schodzą wierni prowadzącej nacji — albo każdy, kto wierzy całym sobą
        if (c.clan !== prowadzi.id && c.devotion <= R.zejscieObcyOddanie) continue;
        if (c.devotion <= R.uwolnienieWlasne && prowadzi.devotion <= R.uwolnienieNacja) continue;
        if (Math.hypot(c.x - w.coreX, c.y - w.coreY) > R.zejscieZasieg) continue;
        // już schodzi wyznaczoną drogą
        if (c.job === Job.DIG && c.jx === w.coreX && c.jy === w.coreY && c.droga) { idzie++; continue; }
        prob++;
        wyslijDoRdzenia(sim, c, R.zejscieTikow);
        if (c.droga) idzie++;
      }
    }
  }

  // stan globalny tylko do podpowiedzi i wskaźników
  stan.wierni = razem;
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
 * Czy kafel leży w pustej komorze wokół rdzenia — wejście tam kończy drogę wiernych.
 * Ta sama elipsa, którą świat wycina przy tworzeniu (RDZEN.komoraX/Y). Wcześniej było
 * to pudło sięgające w głąb skorupy, więc szyb, który jeszcze nie przebił się do komory,
 * już liczył się jako wejście.
 */
export function wKomorze(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  const dx = (x - w.coreX) / RDZEN.komoraX, dy = (y - w.coreY) / RDZEN.komoraY;
  return dx * dx + dy * dy <= 1 && w.passable(x, y);
}

/**
 * Czy spoza skorupy da się DOJŚĆ do rdzenia — tą samą fizyką, którą mają stworzenia:
 * po podłodze się chodzi, przy ścianie wspina, z krawędzi spada. Wcześniej wystarczało,
 * że powietrze łączy się z rdzeniem, więc pęknięcie od dołu, którego wylot wisiał nad
 * jaskinią, ogłaszało „drogę otworem”, a wierni stali pod nim do końca gry.
 * Liczone najwyżej co kilkadziesiąt tików, w pudle wokół rdzenia.
 */
export function drogaDoRdzenia(sim: Sim): boolean {
  const w = sim.world, W = w.w;
  const x0 = Math.max(0, w.coreX - R.drogaPudloX), x1 = Math.min(W - 1, w.coreX + R.drogaPudloX);
  const y0 = Math.max(0, w.coreY - R.drogaPudloGora), y1 = Math.min(w.h - 1, w.coreY + R.drogaPudloDol);
  const wPudle = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const widziane = new Set<number>();
  const kolejka: number[] = [];
  const dodaj = (j: number) => { if (!widziane.has(j)) { widziane.add(j); kolejka.push(j); } };
  // start ze wszystkich stron poza skorupą — wierni spod rdzenia i z boku też mają
  // wejście, jeśli skorupa pękła w ich stronę i da się do wylotu dojść
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (Math.abs(x - w.coreX) <= R.drogaStartPozaPromieniem && Math.abs(y - w.coreY) <= R.drogaStartPozaPromieniem) continue;
      const i = w.idx(x, y);
      if (wolny(sim, i, false)) dodaj(i);
    }
  }
  // cel jak przy wejściu (creatures.ts): kto stanie w komorze wokół rdzenia, ten doszedł
  const przyRdzeniu = (x: number, y: number) => wKomorze(sim, x, y) ||
    w.get(x, y + 1) === T.CORE || w.get(x, y - 1) === T.CORE || w.get(x - 1, y) === T.CORE || w.get(x + 1, y) === T.CORE;
  for (let k = 0; k < kolejka.length; k++) {
    const i = kolejka[k];
    const x = i % W, y = (i / W) | 0;
    if (przyRdzeniu(x, y)) return true;
    const naPodlodze = stoi(sim, x, y);
    const wisi = !naPodlodze && uchwyt(sim, x, y);
    // spada, dopóki nie ma na czym stanąć ani czego się złapać
    if (!naPodlodze && y + 1 <= y1 && wolny(sim, i + W, false)) dodaj(i + W);
    if (!naPodlodze && !wisi) continue;
    if (y - 1 >= y0 && wolny(sim, i - W, false) && uchwyt(sim, x, y - 1)) dodaj(i - W);
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (!wPudle(nx, y)) continue;
      const j = i + dx;
      if (!wolny(sim, j, false)) continue;
      const tamStoi = stoi(sim, nx, y);
      if (wisi && !tamStoi) continue;            // z wiszenia tylko na półkę
      if (!tamStoi && nadOgniem(sim, nx, y)) continue;
      dodaj(j);
    }
  }
  return false;
}

/** Na czym może osiąść okruch skorupy: pustka, grzybnia, kości, sieć — nigdy ołtarz ani gniazdo. */
const OSYPISKO_NA: Record<number, boolean> = { [T.AIR]: true, [T.FUNGUS]: true, [T.BONES]: true, [T.WEB]: true };

/**
 * Wylot pęknięcia od dołu albo z boku bywa zawieszony nad jaskinią. Okruchy skorupy
 * osypują się pod nim w ścianę, po której da się wspiąć z podłogi do szybu —
 * inaczej nacja, która wykuła przejście, nie mogłaby z niego skorzystać.
 */
function podeprzyjWylot(sim: Sim, x: number, y: number): void {
  const w = sim.world;
  for (let yy = y + 1; yy <= y + R.osypiskoMax && w.inb(x, yy); yy++) {
    if (!wolny(sim, w.idx(x, yy), false) || stoi(sim, x, yy)) return;
    if (uchwyt(sim, x, yy)) continue;
    let postawiony = false;
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (!w.inb(nx, yy) || !OSYPISKO_NA[w.tile[w.idx(nx, yy)]]) continue;
      // nie zasypujemy nikogo żywcem
      if (sim.creatures.some((c) => !c.dead && Math.floor(c.x) === nx && Math.floor(c.y) === yy)) continue;
      // kamień skorupy: tego nikt nie rozkopie, więc wejście nie zniknie pod kilofami
      w.set(nx, yy, T.STONE);
      postawiony = true;
      break;
    }
    if (!postawiony) return;
  }
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
export type Strona = 'gora' | 'dol' | 'lewo' | 'prawo';

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
      if (strona !== 'gora') podeprzyjWylot(sim, x, y);

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

/**
 * Postęp kruszenia całej skorupy w procentach (0–100) — jeden licznik zamiast etapów „1 z 5”.
 * Liczy się w tikach świata, więc przy szybszym czasie (×2, ×3) rośnie odpowiednio szybciej.
 */
export function procentSkorupy(sim: Sim): number {
  const r = sim.rytual;
  if (r.otwarta) return 100;
  const potrzeba = Math.max(1, r.skorupa, r.pekniecia + 1);
  return Math.min(99, Math.floor(((r.pekniecia + r.postep) / potrzeba) * 100));
}

/** Jedno pęknięcie skorupy (z modlitwy albo z narzędzia dewelopera). */
function peknij(sim: Sim, stan: StanRytualu, klan: Sim['clans'][number], id: number): void {
  const w = sim.world;
  klan.rytual = 0;
  klan.pekniecia++;
  stan.pekniecia++;
  zapisz(sim, 'rytual', `skorupa pęka (${procentSkorupy(sim)}%) — kują ${klan.name}`, w.coreX, w.coreY);
  sim.wiara += R.nagrodaWiary;
  stan.klan = id;
  if (!stan.strona) stan.strona = 'gora';
  otworzSkorupe(sim, stan, stan.strona);
  if (!stan.otwarta && drogaDoRdzenia(sim)) {
    stan.otwarta = true;
    sim.gdzie(w.coreX, w.coreY - 6).log('Droga do rdzenia stoi otworem.', 'koniec', 'skorupa-otwarta');
  }
}

/** Narzędzie dewelopera: wymuszone pęknięcie skorupy (nacja, która kuje, albo pierwsza żywa). */
export function wymusPekniecie(sim: Sim): void {
  const stan = sim.rytual;
  if (stan.otwarta) return;
  const id = stan.klan >= 0 && !sim.clans[stan.klan]?.dead ? stan.klan : sim.clans.findIndex((k) => !k.dead && k.pop > 0);
  if (id < 0) return;
  peknij(sim, stan, sim.clans[id], id);
}
