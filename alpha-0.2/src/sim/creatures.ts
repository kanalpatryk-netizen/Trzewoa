import type { Sim } from './sim';
import { DZIENNIK, zapisz, kto, OPIS_PRACY, NAZWY_KAFLI } from './dziennik';
import { T, PASSABLE } from './tiles';
import { Race, RACES } from './races';
import { pielgrzymowKlanu, wKomorze } from './rytual';
import { STWORZENIA as K } from '../nastawy/stworzenia';
import { ZABYTKI } from '../nastawy/zabytki';
import { maZabytek } from './zabytki';
import { RYTUAL, PIELGRZYMKA as P } from '../nastawy/rytual';
import { LUDY, PRZYPLYWY as PP } from '../nastawy/gora';
import { szukajDrogi, nastepnyKafel, nadOgniem, budzetDrog, przepasc, stoi, uchwyt, ludRuch, szukajKopiac, kosztKuciaLudu, glebiaPod, podDroga } from './droga';
import { zglosWojne } from './wydarzenia';
import { cechaNacji } from './cechy';
import { czoloDrogi, nieWykopane } from './pielgrzymka';
import { krokStraznika, walczZeStraznikiem, falaZwykla, falaTrwa, wStrefieStraznikow, zywiStraznicy, trybWiernych, rycerzeCzekaja, iluRycerzy, walczKsiega } from './straznicy';
import { STRAZNICY } from '../nastawy/straznicy';
import { obozFrontowy, mnoznik, maxHp, rolaPostaci, liczRole, najblizszaSpizarnia, spizarnieWgOdleglosci, spizarniaW, stacjonuje, type Rola } from './lud';
import { obozyLudu, obozyWgOdleglosci, najblizszyOboz, walczacy, type MiejsceJedzenia } from './lud';
import { wykutyKafel } from './kruszce';
import { pomieszczenieId, kafleDoKucia, siegaPlanu, miejsceWPom, ktoryWPom } from './pomieszczenia';
import { NAZWA_POMIESZCZENIA } from '../nastawy/pomieszczenia';
import { odprawia, type RytualOltarza } from './oltarz';
import { NAZWA_RYTUALU } from '../nastawy/oltarz';
import { wiadroDoWspinaczki, wiadroId, krokNaLinie, wiadra } from './wiadro';
import { WIADRO } from '../nastawy/wiadro';
import { POLECENIA, ODSTEPY } from '../nastawy/polecenia';
import { odmow, nastepnyKafelZyly, type Polecenie, type Odmowa } from './polecenia';
import { SWIAT } from '../nastawy/swiat';
import { idziePoZbroje, planZbroi, ranyZbroi } from './zbroja';
import { linaPrzecieta, krokNaprawy, zacznijNaprawe, sklejajacy } from './lina-wiadra';
import { krokLotu } from './dlon-demona';
import { ZBROJA, type CzescZbroi } from '../nastawy/zbroja';
import { LUD, REMAKE } from '../nastawy/lud';

export enum Job {
  WANDER, DIG, EAT, PRAY, BUILD, FIGHT, FLEE, BREED, HAUL, SLAVE, DESCEND, RAID, SACRIFICE,
  /** Trol nie umiera z głodu — zasypia w skale i czeka, aż coś przejdzie obok. */
  SLEEP,
  /** Żużlowiec wraca do ognia; Prządka wysysa wziętego w jarzmo. */
  HEAT, DRAIN,
  /** Wierni idą pod skorupę rdzenia i modlą się tam, aż kamień ustąpi. */
  PIELGRZYM,
  /** Remake v1: robotnik zbiera grzyb (albo zapasy ze starej spiżarni) do siedziby. */
  ZBIERA,
  /** Remake v1: głodny idzie zjeść ze spiżarni w siedzibie. */
  ZAPAS,
  /** Remake v1: robotnik niesie jedzenie głodnemu pobożnemu albo rycerzowi tam, gdzie ten stoi. */
  DOSTAWA,
  /** Remake v1: rycerz trzyma wartę z boku przedsionka, gdy pobożni modlą się pod rdzeniem. */
  WARTA,
  /** Remake v1: stoi w wyznaczonym miejscu przy obozie — pobożny się tam modli, rycerz pilnuje, robotnik odpoczywa. */
  STOI,
  /** Remake v2: skrajnie głodny biegnie pod linę zjeżdżającego wiadra (potem wspina się po niej — sim/wiadro.ts). */
  LINA,
}

/** Myśl, którą wkładasz stworzeniu do głowy. Znika, gdy zostanie wykonana. */
export enum Thought {
  NONE = 0, DIG_DOWN, KILL_KIN, PROPHESY, FLEE_UP, BREED,
  /** Szept „módl się”: idzie pod skorupę rdzenia i modli się tam jak pielgrzym. */
  PRAY_CORE,
}

export interface Creature {
  id: number;
  race: Race;
  clan: number;
  x: number; y: number;
  vy: number;
  hp: number;
  hunger: number;
  fear: number;
  devotion: number;
  age: number;
  job: Job;
  jx: number; jy: number; jt: number;
  dig: number;
  carry: number;      // niesiona ruda
  /** Jak długo to nosi — po czasie i tak chowa łup dla klanu. */
  carryT: number;
  face: number;       // -1 / 1
  anim: number;
  thought: Thought;
  /** Ile tików stoi w miejscu — bez tego zalany korytarz zatrzymuje kolonię na zawsze. */
  stall: number;
  lx: number; ly: number;
  prophet: boolean;
  /** Wzięty w jarzmo — Prządki nie rodzą, tylko przerabiają cudze dzieci na swoje. */
  slave: boolean;
  mad: number;        // szaleństwo z głębokości
  dead: boolean;
  /** Tik, w którym ostatnio podciągał się w górę — przy ścianie wtedy nie spada. */
  wspina?: number;
  /** Wyznaczona droga do celu zajęcia (indeksy kafli) i miejsce na niej. Nie trafia do zapisu. */
  droga?: number[];
  drogaI?: number;
  /** Remake v2: droga wiedzie przez skałę — lite kafle na niej kuje po kolei (szukajKopiac w droga.ts). */
  drogaKopie?: boolean;
  /** Remake v2: kierunek schodów, które kuje na przełaj pod górę (−1 / 1) — trzyma go, aż wejdzie na wysokość celu. */
  schody?: number;
  /** Remake v1: rola w ludzie (pobożny, robotnik, rycerz); brak = pobożny. */
  rola?: Rola;
  /** Remake v1: pobożny, który się okaleczył dla krwi — słabszy na zawsze. */
  okaleczony?: boolean;
  /** Remake v1: do tego tiku głodny nie idzie do spiżarni (ostatnio nie zdołał do niej dojść). */
  bezSpizarniDo?: number;
  /** Remake v1: do tego tiku nie idzie się modlić (szept „przerwij”). */
  bezModlitwyDo?: number;
  /** Remake v1: robotnik niesie jedzenie tej postaci (id). */
  dostawaDla?: number;
  /** Remake v1: robotnik niesie zapas do spiżarni tego obozu (zaopatrzenie obozu frontowego). */
  doObozu?: { x: number; y: number };
  /** Remake v1: zamiar — co teraz robi i do kiedy się tego trzyma (widać go na karcie postaci). */
  zamiar?: string;
  zamiarDo?: number;
  /** Remake v1: robotnik kopie drogę do rdzenia (złotą kreskę). */
  kopieDroge?: boolean;
  /** Co ostatnio odebrało zdrowie — kronika podaje prawdziwą przyczynę śmierci (wcześniej każda brzmiała „z wycieńczenia”). */
  rana?: 'magma' | 'woda' | 'glod' | 'starosc' | 'przysypany' | 'upadek' | 'grzybnia';
  /** Remake v1: stojąc przy obozie, modli się (pobożny). */
  modliPrzyObozie?: boolean;
  /** Remake v1: wysłany pod rdzeń — wraca do pielgrzymki po każdym przerwaniu (ogień, ucieczka, posiłek). */
  wyprawa?: boolean;
  /** Remake v1: tik ostatniej ucieczki od ognia — przez chwilę nie wraca tą samą drogą. */
  odOgnia?: number;
  /** Etap 4: zatruty (zatrute plony) do tego tiku. */
  zatrutyDo?: number;
  /** Dłoń z otchłani sięga po niego (sim/dlon.ts): do tego tiku stoi jak wryty. */
  zamarlyDo?: number;
  /** Etap 3: Strażnik Snu (przenika skałę, nie je); boss — id bossa z nastawy/boss.ts. */
  straznik?: boolean;
  boss?: string;
  /** Etap 3: tik ostatniego ciosu, największe życie (pasek), tik ostatniego zasypania drogi (boss). */
  ciosT?: number;
/** Remake v1: tik ostatniego rażenia księgą (pobożny przeciw bossowi, ostatnia deska) */
ksiegaT?: number;
  hpMax?: number;
  zasypT?: number;
  /** Etap 2: obóz, którego rycerz pilnuje (trzyma się go, póki jest tam jedzenie). */
  posterunek?: { x: number; y: number };
  /** Etap 2: tik, od którego jest w ludzie (staż weterana); brak = od początku partii. */
  od?: number;
  /** Alpha: szał krwi z ołtarza — do tego tiku rycerz bije mocniej i żarzy się czerwienią. */
  szalDo?: number;
  /** Alpha: rozkaz gracza (sim/polecenia.ts) — trzyma się go, aż go odwołasz. */
  polecenie?: Polecenie;
  /** Alpha, etap 3c: co robi w pomieszczeniu — przy kowadle albo stole („buduje”), na posłaniu („spi”). Rysunek bierze z tego pozę. */
  czynnosc?: 'buduje' | 'spi' | 'modli' | 'czyta' | 'zaklada' | 'skleja';
  /** Ile tików już przespał w sypialni (sen zdejmuje osłabienia — sim/pomieszczenia.ts). */
  snu?: number;
  /** Alpha: odmowa wykonania rozkazu — dymek nad głową i kręcenie głową. */
  odmowa?: Odmowa;
  /** Alpha: od kiedy przytrzymuje się ściany szybu, szukając zgubionej drogi (krótko — potem się zsuwa). */
  chwytOd?: number;
  /** Alpha: x z poprzedniego tiku — ile przeszedł (odstępy w tłumie). */
  poprzX?: number;
  /** Remake v2: robotnik w hełmie — rycerzy brak, więc walczy jak rycerz. */
  helm?: boolean;
  /** Alpha, etap 3f: części zbroi z kuźni, które rycerz nosi (sim/zbroja.ts); do której kuźni idzie po resztę,
   * ile tików zakłada bieżącą część i do kiedy sam po nią nie idzie (nie doszedł). */
  zbroja?: CzescZbroi[];
  doKuzni?: number;
  zakladanie?: number;
  zbrojaBezDo?: number;
  /** Alpha, etap 4: skleja przeciętą linę wiadra (sim/lina-wiadra.ts) — wspina się, wisi i wiąże, zsuwa się; kolumna i dno. */
  naprawia?: { faza: 'wspina' | 'skleja' | 'schodzi'; od: number; x: number; dno: number };
  /** Alpha, etap 5b: w dłoni z otchłani (trzymany), ciśnięty przez nią (lot: prędkość, od kiedy, kiedy uderzył o strop) i ogłuszony do tiku. */
  wDloni?: boolean;
  lot?: { vx: number; vy: number; od: number; stropT?: number };
  ogluszonyDo?: number;
  /** Alpha, etap 5b: staje jak wryty, bo przed nim pęka strop (zawał) — do tiku. */
  przystanDo?: number;
  /** Remake v2: skrajnie głodny biegnie pod linę tego wiadra (id), wspina się po niej (naLinie) i wsiada do niego (naWiadrze). */
  linaDo?: number;
  naLinie?: number;
  naWiadrze?: boolean;
}

/** Numer nadaje symulacja: licznik wspólny dla wszystkich gór sprawiał, że ta sama góra
 *  w drugiej partii żyła inaczej niż w pierwszej (od numeru zależy rytm rozglądania się). */
export function makeCreature(race: Race, clan: number, x: number, y: number, id: number): Creature {
  const d = RACES[race];
  return {
    id, race, clan, x, y, vy: 0,
    hp: d.maxHp, hunger: K.glodNaStart, fear: 0, devotion: K.oddanieNaStart, age: 0,
    job: Job.WANDER, jx: x, jy: y, jt: 0, dig: 0, carry: 0, carryT: 0,
    face: 1, anim: 0, thought: Thought.NONE, stall: 0, lx: x, ly: y, prophet: false, slave: false, mad: 0, dead: false,
  };
}

const FOOD_TILES = new Set<number>([T.FUNGUS, T.BONES]);
/**
 * Żużlowcy nie jedzą rudy — żywią się ciepłem przy ogniu. Gdy ruda była dla nich
 * jedzeniem, zjadali własny materiał na nowych kowali i klan nigdy nie rósł.
 */
function edible(race: Race, t: number): boolean { return race === Race.DWARF ? false : FOOD_TILES.has(t); }

/** Jeden krok życia. Wszystko, co stworzenie robi, wynika z potrzeb — nie z rozkazu. */
/** Krok stworzenia — w trybie deweloperskim zapisuje do dziennika każdą zmianę zajęcia. */
export function stepCreature(sim: Sim, c: Creature): void {
  if (!DZIENNIK.wlaczony) { krokStworzenia(sim, c); return; }
  const przed = c.job;
  krokStworzenia(sim, c);
  if (!c.dead && c.job !== przed) zapisz(sim, 'praca', `${kto(sim, c)} ${OPIS_PRACY[c.job] ?? 'zajęcie ' + c.job}`, c.x, c.y);
}

function krokStworzenia(sim: Sim, c: Creature): void {
  // etap 3: Strażnicy Snu żyją po swojemu (sim/straznicy.ts)
  if (c.straznik) { krokStraznika(sim, c); return; }
  const w = sim.world;
  const d = RACES[c.race];
  // v4.1 beta: cecha nacji (pobożni, płodni, wojowniczy…) — mnożniki na statystyki rasy
  const m = cechaNacji(sim.clans[c.clan]);
  const tx = Math.max(0, Math.min(w.w - 1, Math.floor(c.x)));
  const ty = Math.max(0, Math.min(w.h - 1, Math.floor(c.y)));
  // Pielgrzym się nie starzeje: Ślepy Lud żyje ok. 6000 tików, a sama droga pod rdzeń trwa
  // prawie tyle — warta umierała ze starości w połowie zejścia albo pod skorupą.
  if (c.job !== Job.PIELGRZYM) c.age++;
  c.anim++;

  // --- żywioły
  const i = w.idx(Math.max(0, Math.min(w.w - 1, tx)), Math.max(0, Math.min(w.h - 1, ty)));
  if (w.magma[i] > 0) { c.hp -= K.magmaObrazenia + w.magma[i]; c.fear = 1; c.rana = 'magma'; }
  if (w.water[i] > K.toniePowyzej && !d.swims) { c.hp -= K.tonieObrazenia; c.fear = Math.min(1, c.fear + K.tonieStrach); c.rana = 'woda'; }
  // grzybnia parzy obcych, ale nie zabija w pół minuty tego, kto tylko przez nią przechodzi
  if (w.tile[i] === T.FUNGUS && c.race !== Race.GOBLIN) { c.hp -= K.grzybniaParzy; c.rana = 'grzybnia'; }

  // --- głód i wiek
  // zatłoczenie bije w głód natychmiast: nadmiar nie chudnie powoli, tylko pada
  const over = sim.crowding[c.race] - 1;
  const press = over > 0 ? Math.min(K.glodOdTlokuMax, 1 + over * over * K.glodOdTloku) : 1;
  // w samouczku góra trawi wolniej: nauka nie może polegać na patrzeniu, jak wszyscy mrą
  // pielgrzyma niesie wiara: droga pod rdzeń ma dwieście, trzysta kafli, a zwykły głód
  // zawracał go po dziewięćdziesięciu — warta nigdy nie docierała na miejsce
  const wDrodze = c.job === Job.PIELGRZYM ? P.glodWDrodze : 1;
  c.hunger += K.glodNaTik * d.metabolism * m.glod * mnoznik(sim, c, 'glod') * (1 + c.mad * K.glodOdSzalenstwa) * press * wDrodze * (sim.spokojnySwiat ? K.glodWSamouczku : 1);
  // Żużlowcy żywią się tym, co wypluwa ogień — przy gorącu głód im nie doskwiera
  if (c.race === Race.DWARF) {
    // ciepło własnej kuźni sięga daleko — przy niej się mieszka, nie tylko je
    let hot = false;
    for (const f of sim.allForges) {
      const fx = f % w.w, fy = (f / w.w) | 0;
      if (Math.abs(fx - tx) <= K.cieploKuzni && Math.abs(fy - ty) <= K.cieploKuzni) { hot = true; break; }
    }
    if (!hot) {
      for (let dy = -K.cieploMagmy; dy <= K.cieploMagmy && !hot; dy++)
        for (let dx = -K.cieploMagmy; dx <= K.cieploMagmy; dx++) {
          const x = tx + dx, y = ty + dy;
          if (w.inb(x, y) && w.magma[w.idx(x, y)] > 0) { hot = true; break; }
        }
    }
    if (hot) c.hunger = Math.max(0, c.hunger - K.cieploKarmi);
  }
  // Remake v1: kto niesie jedzenie i już słabnie z głodu, zjada swój ładunek — sześciu tragarzy padło
  // z pełnymi rękami w drodze do spiżarni obozu, do której nie umieli dojść
  if (REMAKE && c.carry > 0 && c.hunger > LUD.zjadaNiesione && rolaPostaci(c)) {
    c.carry--; sim.meals++; c.hunger = Math.max(0, c.hunger - LUD.posilek);
    if (c.carry === 0) { c.dostawaDla = undefined; c.doObozu = undefined; }
  }
  if (c.hunger > K.glodZabija) { c.hp -= K.glodObrazenia; c.rana = 'glod'; }
  else if (c.hunger < K.najedzonyLeczy && c.hp < maxHp(sim, c)) c.hp = Math.min(maxHp(sim, c), c.hp + K.leczenieNaTik * leczenieZabytkow(sim));
  if (c.age > d.lifespan * m.zycie && !sim.spokojnySwiat && (LUD.starzejeSie || !rolaPostaci(c))) { c.hp -= K.starosc; c.rana = 'starosc'; }
  c.fear *= K.wygasanieStrachu;

  // --- szaleństwo głębi: im niżej, tym mniej z niego zostaje
  const depth = w.depth(ty);
  // Blisko rdzenia wiara trzyma głowę na miejscu. Bez tego przedsionek zjadał
  // każdą pielgrzymkę: wierni wariowali, rozszczepiali się i wracali trolami.
  // Pielgrzym niesie tę wiarę ze sobą przez całą drogę w dół — inaczej wariował
  // w połowie zejścia, zanim w ogóle doszedł pod skorupę.
  // Remake v1: pod rdzeniem chroni każdego z ludu — warta (rycerze, mało pobożni) łapała szaleństwo głębi,
  // które przyspieszało głód o połowę, i rycerze padali na posterunku
  const przyRdzeniu = Math.abs(c.x - w.coreX) < P.ochronaZasieg && Math.abs(c.y - w.coreY) < P.ochronaZasieg;
  const podRdzeniem = (REMAKE && rolaPostaci(c) !== null && przyRdzeniu) || (c.devotion > P.ochronaOddanie
    && (c.job === Job.PIELGRZYM || przyRdzeniu));
  // (wolniej niż kiedyś: pół minuty przy dnie wystarczało, żeby Żużlowiec, który zszedł
  // tylko po ciepło, wrócił z nożem na swoich)
  // Żużlowcy żyją przy ogniu głębi i głębia mniej im miesza w głowach
  const odpornosc = c.race === Race.DWARF ? K.odpornoscZuzlowcow : 1;
  // (etap 3e: wzięta księga — głębia szybciej miesza w głowach i wolniej puszcza)
  const ksiega = REMAKE && rolaPostaci(c) && maZabytek(sim, 'ksiega');
  if (!podRdzeniem && depth > K.szalenstwoOdGlebokosci && c.race !== Race.TROLL && sim.rng.chance(K.szalenstwoSzansa * (depth - K.szalenstwoPunkt) * 10 * odpornosc * (ksiega ? ZABYTKI.skutki.ksiega.szalenstwo : 1))) {
    c.mad = Math.min(1, c.mad + K.szalenstwoSkok);
    // Remake v1: bez trolów i sekt — szaleństwo nie przemienia nikogo
  }
  if (podRdzeniem && c.mad > 0) c.mad = Math.max(0, c.mad - P.ochronaLeczy * (ksiega ? ZABYTKI.skutki.ksiega.zdrowienie : 1));
  // kto wrócił wyżej, powoli dochodzi do siebie — szaleństwo nie jest już wieczne
  else if (depth < K.zdrowiejePowyzej && c.mad > 0 && c.race !== Race.TROLL) c.mad = Math.max(0, c.mad - K.zdrowienie * (ksiega ? ZABYTKI.skutki.ksiega.zdrowienie : 1));

  if (c.hp <= 0) {
    const r = PRZYCZYNA[c.rana ?? ''] ?? ['z wycieńczenia', c.age > d.lifespan * m.zycie ? 'starość' : 'wycieńczenie'];
    sim.kill(c, r[0], r[1]);
    return;
  }

  // Remake v2: na linie wiadra — wspina się do niego albo jedzie w nim w dół i je (sim/wiadro.ts)
  if (c.naLinie !== undefined && krokNaLinie(sim, c)) return;
  // Alpha, etap 4: skleja przeciętą linę wiadra — wspina się, wisi i wiąże, zsuwa się (sim/lina-wiadra.ts)
  if (c.naprawia && krokNaprawy(sim, c)) return;
  // Alpha, etap 5b: w dłoni z otchłani albo ciśnięty przez nią (sim/dlon-demona.ts) — a po upadku leży ogłuszony
  if ((c.wDloni || c.lot) && krokLotu(sim, c)) return;
  if (c.ogluszonyDo !== undefined) {
    if (sim.tick < c.ogluszonyDo) { c.vy = 0; c.droga = undefined; return; }
    c.ogluszonyDo = undefined;
  }
  if (c.przystanDo !== undefined) {
    if (sim.tick < c.przystanDo) { c.vy = 0; c.droga = undefined; return; }
    c.przystanDo = undefined;
  }

  // --- przysypanie: kiedy strop się osunie, stworzenie zostaje w litej skale.
  // Bez tego stało nieruchomo do śmierci i wyglądało to jak zawieszona gra.
  if (!w.passable(tx, ty)) {
    c.hp -= K.przysypanyObrazenia; c.rana = 'przysypany';
    c.fear = Math.min(1, c.fear + K.przysypanyStrach);
    if (d.digPower > 0) {
      c.dig += d.digPower * m.kopanie * K.wygrzebywanieSila;
      const twardosc = w.hardness(tx, ty);
      if (twardosc > 0 && c.dig >= twardosc * K.wygrzebywanieProg) {
        c.dig = 0;
        w.set(tx, ty, T.AIR);
        sim.spark(c.x, c.y, 'dust');
      }
    } else if (w.passable(tx, ty - 1)) {
      c.y -= K.wygrzebywanieWGore;       // kto nie kopie, ten się wygrzebuje w górę
    }
    return;
  }

  // --- grawitacja
  // Kto właśnie się podciąga i ma ścianę pod ręką, trzyma się jej. Bez tego szyb, który
  // sami wykopali, był pułapką: wchodzili o pół kafla i spadali z powrotem, w kółko —
  // Żużlowcy potrafili tak przestać całe życie pod rudą, której nigdy nie dosięgli.
  // Remake v2: lud nie ma już lin ani klamer — trzyma się ściany tylko przez chwilę: wchodząc na stopień
  // albo schodząc szybem; w otwartej pustce spada (przepaści sam omija — droga.ts).
  const trzymaSie = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow
    && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty) || w.solid(tx - 1, ty + 1) || w.solid(tx + 1, ty + 1));
  // Alpha: na linie się wisi — nie spada (wchodzi i schodzi po niej)
  const wisiNaLinie = w.lina[i] === 1;
  if (wisiNaLinie && c.vy > 0) c.vy = 0;
  if (!trzymaSie && !wisiNaLinie && w.passable(tx, ty + 1) && w.water[w.idx(tx, Math.min(w.h - 1, ty + 1))] < K.wodaNiesie) {
    // Kto dopiero co się wspinał i ma ścianę pod ręką, zsuwa się po niej, zamiast lecieć.
    // Inaczej każda zmiana zamiaru w połowie szybu kończyła się upadkiem z całej wysokości.
    if ((c.wspina ?? -99) >= sim.tick - K.zsuwaSieTikow && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty))
        && w.magma[w.idx(tx, Math.min(w.h - 1, ty + 1))] === 0) {
      c.vy = 0;
      c.y += K.zsuwanie;
      c.wspina = sim.tick - (K.trzymaSieTikow + 1);
      return;
    }
    // Alpha: lud bez lin zsuwa się po każdej ścianie szybu (hamuje dłońmi i stopami) — boleśnie spada
    // tylko w otwartej pustce, z dala od ścian; dawniej każdy szyb głębszy niż dwa kafle łamał nogi
    if (ludRuch(c) && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty)) && w.magma[w.idx(tx, Math.min(w.h - 1, ty + 1))] === 0) {
      c.vy = Math.min(K.zsuwanieLudu, c.vy + K.grawitacja);
      c.y += c.vy;
      c.wspina = sim.tick - (K.trzymaSieTikow + 1);
      return;
    }
    c.vy = Math.min(K.maxSpadanie, c.vy + K.grawitacja);
    c.y += c.vy;
    return;
  }
  if (c.vy > K.kurzOdPredkosci) {
    // każdy upadek wzbija kurz — widać, że grunt naprawdę im uciekł spod nóg
    const ile = c.vy > K.bolesnyUpadek ? 3 : 1;
    for (let k = 0; k < ile; k++) sim.spark(c.x + sim.rng.range(-0.4, 0.4), c.y + 0.3, 'dust');
    if (c.vy > K.bolesnyUpadek) sim.efekt(c.x, c.y + 0.4, 'kopniecie');
  }
  // Upadek boli, ale nie zabija na miejscu: raz, przy lądowaniu, i dopiero z wysokości
  // kilku kafli (wcześniej liczył się dwa razy — w locie i po lądowaniu).
  if (c.vy > K.bolesnyUpadek) { c.hp -= RACES[c.race].maxHp * K.upadekObrazenia * Math.min(1, (c.vy - K.bolesnyUpadek) / K.upadekPelny); c.rana = 'upadek'; }
  c.vy = 0;

  // --- rozglądanie się: rysunek twojego ciała powstaje tylko z ich oczu
  if ((c.id + sim.tick) % K.rozgladanieCo === 0) {
    const r = c.race === Race.HUMAN ? K.wzrokLudzi : c.race === Race.TROLL ? K.wzrokTroli : K.wzrok;
    const fresh = w.observe(tx, ty, r, sim.tick);
    if (fresh) sim.onVisit(fresh);
  }

  if (c.carry > 0) c.carryT++; else c.carryT = 0;

  // --- zakleszczenie: stoi w miejscu mimo zajęcia, więc niech spróbuje czegoś innego
  // (warta modli się w przedsionku na stojąco — to nie zakleszczenie; wcześniej po kilku
  // sprawdzeniach dostawała „idź gdzie indziej” i warta pod skorupą topniała)
  const modliSiePodRdzeniem = c.job === Job.PIELGRZYM
    && Math.abs(c.x - w.coreX) < P.przedsionekX && Math.abs(c.y - w.przedsionekY) < P.przedsionekY;
  // Remake v1: kto stoi tam, gdzie miał stać (warta, modlitwa przy obozie), nie jest zakleszczony
  const naPosterunku = (c.job === Job.STOI || c.job === Job.WARTA) && Math.abs(c.jx - Math.floor(c.x)) <= 1 && Math.abs(c.jy - Math.floor(c.y)) <= 4;
  if (!modliSiePodRdzeniem && !naPosterunku && (c.id + sim.tick) % K.zakleszczenieCo === 0) {
    if (Math.abs(c.x - c.lx) < K.zakleszczenieRuch && Math.abs(c.y - c.ly) < K.zakleszczenieRuch) c.stall++;
    else c.stall = 0;
    c.lx = c.x; c.ly = c.y;
    if (c.stall > K.zakleszczenieLimit && REMAKE && rolaPostaci(c)) {
      // lud: zamiar się nie udał — planowanie od nowa (bez losowego spaceru)
      c.stall = 0;
      c.jt = 0;
    } else if (c.stall > K.zakleszczenieLimit) {
      c.stall = 0;
      c.jt = 0;
      c.job = Job.WANDER;
      c.jx = c.x + sim.rng.range(-K.zakleszczenieUciekaX, K.zakleszczenieUciekaX);
      c.jy = c.y + sim.rng.range(-K.zakleszczenieUciekaY, K.zakleszczenieUciekaY);
      c.face = -c.face;
    }
  }

  // Dotknięcie rdzenia kończy grę. Wcześniej trzeba było wykuć sam kafel rdzenia,
  // więc stworzenie potrafiło stać na nim godzinami i nigdy nie „dojść".
  // Wchodzi tylko nacja, która skuła skorupę, albo taka, która wierzy dość, by cię uwolnić.
  // Obcy — Trol z głębi, Żużlowiec za ciepłem — musi rdzeń wykuć, a to trwa: przypadkowy
  // przechodzień nie kończy gry śmiercią sekundę po tym, jak warta otworzyła drogę.
  // WERSJA ANDROID: wchodzi tylko ten, kto wierzy — sama przynależność do nacji, która kuła,
  // nie wystarcza. Niewierzący z tej nacji kończył grę przegraną tuż po otwarciu skorupy,
  // a gracz nie miał czym go powstrzymać.
  const wolnoWejsc = sim.clans[c.clan].devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne;
  if (wolnoWejsc && Math.abs(c.x - w.coreX) <= RYTUAL.dotykZasieg && Math.abs(c.y - w.coreY) <= RYTUAL.dotykZasieg) {
    const cx = Math.round(c.x), cy = Math.round(c.y);
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (w.get(cx + dx, cy + dy) === T.CORE) { sim.reachCore(c); return; }
    }
  }
  // Komora wokół rdzenia jest pusta i szeroka: kto przez otwartą skorupę wejdzie do niej,
  // doszedł. Wcześniej warta wchodziła od dołu i stała na dnie komory, bo w pustej
  // przestrzeni nie ma się czego chwycić, żeby podciągnąć się do samego rdzenia.
  if (wolnoWejsc && sim.rytual.otwarta && wKomorze(sim, Math.floor(c.x), Math.floor(c.y))) {
    sim.reachCore(c); return;
  }

  // Remake v1: sięga po niego dłoń z otchłani — stoi jak wryty i nie słyszy wołania (sim/dlon.ts).
  // Ogień i woda są silniejsze od strachu: przed nimi ucieka mimo to.
  if (REMAKE && c.zamarlyDo !== undefined && sim.tick < c.zamarlyDo && !sim.przyMagmie(tx, ty, 1) && w.water[w.idx(tx, ty)] < LUD.wodaUcieka) {
    c.fear = 1;
    c.droga = undefined;
    c.zamiar = 'stoi jak wryty — coś sięga po niego z otchłani'; c.zamiarDo = c.zamarlyDo;
    return;
  }

  // --- ogień tuż obok: ucieka, zanim spłynie — wcześniej stali przy kuźni i czekali,
  // aż magma z rozkopanej kieszeni wleje im się pod nogi
  // Remake v1: kto idzie wyliczoną drogą, a następny kafel jest wolny od ognia, przechodzi obok bez ucieczki —
  // droga szybem przy magmie była przerywana co sekundę i robotnicy dreptali tam w kółko, aż padli z głodu
  const przechodzi = REMAKE && !!rolaPostaci(c) && !!c.droga && (() => {
    const n = c.droga![Math.min(c.droga!.length - 1, c.drogaI ?? 0)];
    return n !== undefined && w.magma[n] === 0 && w.magma[w.idx(tx, ty)] === 0;
  })();
  if ((c.id + sim.tick) % K.ogienSprawdzCo === 0 && c.job !== Job.FLEE && !przechodzi && !(REMAKE && c.job === Job.PIELGRZYM && w.prog[w.idx(tx, ty)] === 1) && sim.przyMagmie(tx, ty, 1)) {
    let mx = 0, my = 0;
    for (let dy = -K.ogienZasieg; dy <= K.ogienZasieg; dy++) for (let dx = -K.ogienZasieg; dx <= K.ogienZasieg; dx++) {
      if (w.inb(tx + dx, ty + dy) && w.magma[w.idx(tx + dx, ty + dy)] > 0) { mx += dx; my += dy; }
    }
    c.job = Job.FLEE; c.droga = undefined;
    c.odOgnia = sim.tick;
    if (REMAKE && rolaPostaci(c)) { c.zamiar = 'ucieka od ognia'; c.zamiarDo = sim.tick + K.ogienTikow; }
    c.jx = tx - Math.sign(mx || c.face) * K.ogienUciekaX; c.jy = ty - (my >= 0 ? K.ogienUciekaWGore : -K.ogienUciekaWDol);
    c.jt = K.ogienTikow; c.fear = 1;
    // Remake v1: prawdziwą drogą do najbliższego miejsca z dala od ognia — punkt „obok” bywał nieosiągalny
    // i lud stał w kieszeni przy magmie, uciekając w miejscu, aż spłonął albo umarł z głodu
    if (REMAKE && rolaPostaci(c)) {
      const d = szukajDrogi(sim, c, (_i, x, y) => !sim.przyMagmie(x, y, 3) && stoi(sim, x, y), 3000);
      if (d) { c.droga = d; c.drogaI = 0; c.drogaKopie = false; const k = d[d.length - 1]; c.jx = k % w.w; c.jy = (k / w.w) | 0; }
    }
  }

  // Remake v1: woda podchodzi — lud wychodzi w górę, zamiast stać na swoim miejscu, aż utonie
  if (REMAKE && rolaPostaci(c) && c.job !== Job.FLEE && (c.id + sim.tick) % 20 === 0 && w.water[w.idx(tx, ty)] >= LUD.wodaUcieka
    // (głodny w płytkiej wodzie, która nie topi, najpierw idzie jeść — uciekał w kółko z dołu bez wyjścia i padł z głodu)
    && !(c.hunger > LUD.glodSam && w.water[w.idx(tx, ty)] <= K.toniePowyzej)) {
    c.job = Job.FLEE; c.droga = undefined;
    c.jx = tx; c.jy = Math.max(2, ty - 8); c.jt = 240;
    c.zamiar = 'ucieka przed wodą'; c.zamiarDo = sim.tick + 240;
  }

  // Remake v2: głodny przerywa wartę, stanie, kopanie i modlitwę, gdy gdzieś stoi wiadro z jedzeniem —
  // rycerze na warcie i kopacze drogi umierali z głodu w połowie długiego zamiaru, kilkanaście kafli od wiadra
  if (REMAKE && c.carry === 0 && c.hunger > LUD.glodSam && (sim.tick + c.id) % 120 === 0 && rolaPostaci(c)
      && (c.job === Job.STOI || c.job === Job.WARTA || c.job === Job.DIG || c.job === Job.PRAY || c.job === Job.BUILD)
      && najblizszaSpizarnia(sim, c.x, c.y, true)) c.jt = 0;

  // --- wybór zajęcia
  if (c.jt-- <= 0) pickJob(sim, c);

  switch (c.job) {
    case Job.EAT: doEat(sim, c); break;
    case Job.DIG: case Job.DESCEND: doDig(sim, c); break;
    case Job.PRAY: doPray(sim, c); break;
    case Job.BUILD: doBuild(sim, c); break;
    case Job.FIGHT: doFight(sim, c); break;
    case Job.FLEE: doFlee(sim, c); break;
    case Job.BREED: doBreed(sim, c); break;
    case Job.HAUL: doHaul(sim, c); break;
    case Job.SLAVE: doSlave(sim, c); break;
    case Job.SACRIFICE: doSacrifice(sim, c); break;
    case Job.RAID: doRaid(sim, c); break;
    case Job.SLEEP: doSleep(sim, c); break;
    case Job.HEAT: doHeat(sim, c); break;
    case Job.DRAIN: doDrain(sim, c); break;
    case Job.PIELGRZYM: doPielgrzym(sim, c); break;
    case Job.ZBIERA: doZbiera(sim, c); break;
    case Job.ZAPAS: doZapas(sim, c); break;
    case Job.WARTA: doWarta(sim, c); break;
    case Job.DOSTAWA: doDostawa(sim, c); break;
    case Job.STOI: doStoi(sim, c); break;
    case Job.LINA: doLina(sim, c); break;
    default: doWander(sim, c); break;
  }
  // Alpha: lud nie stoi jeden w drugim — rozsuwa się i dopasowuje krok (pomysł Pawła)
  if (ludRuch(c)) rozstaw(sim, c);
}

/**
 * Alpha: odstępy w tłumie. Stojący z ludu rozsuwają się po podłodze na szerokość sylwetki (`ODSTEPY.stojacy`),
 * powoli i tylko tam, gdzie jest na czym stanąć — po zatrzymaniu nie zlewają się w jedną plamę. Idący w tę samą
 * stronę tuż za kimś dopasowują do niego krok, chyba że są wyraźnie szybsi — wtedy go wymijają (rysunek rozsuwa
 * mijających się na dwa tory). Idący naprzeciw siebie mijają się bez przeszkód — w wąskim szybie nikt nie utknie.
 */
function rozstaw(sim: Sim, c: Creature): void {
  const w = sim.world;
  const ruch = c.x - (c.poprzX ?? c.x);
  c.poprzX = c.x;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (c.naLinie !== undefined || !stoi(sim, cx, cy)) return;
  const stoiTu = Math.abs(ruch) < 0.004;
  for (const o of sim.creatures) {
    if (o === c || o.dead || !ludRuch(o) || o.naLinie !== undefined) continue;
    if (Math.abs(o.y - c.y) > 0.6) continue;
    const dx = c.x - o.x;
    if (stoiTu) {
      if (Math.abs(dx) >= ODSTEPY.stojacy) continue;
      // krok w bok od sąsiada (przy równej pozycji — w stronę zależną od numeru, żeby się nie przepychali)
      const kier = Math.abs(dx) > 0.001 ? Math.sign(dx) : (c.id < o.id ? -1 : 1);
      const nx = c.x + kier * ODSTEPY.rozsuwanie;
      const kx = Math.floor(nx + kier * 0.3);
      if (w.passable(kx, cy) && stoi(sim, kx, cy) && w.magma[w.idx(kx, cy)] === 0) c.x = nx;
      return;
    }
    // idzie: ktoś przed nim, w tę samą stronę i blisko — dopasowuje krok, chyba że wyraźnie szybszy
    const przed = Math.sign(-dx) === Math.sign(ruch);
    const ruchO = o.x - (o.poprzX ?? o.x);
    if (!przed || Math.abs(dx) >= ODSTEPY.idacy || Math.sign(ruchO) !== Math.sign(ruch)) continue;
    if (Math.abs(ruch) >= Math.abs(ruchO) * ODSTEPY.wyprzedza) continue;
    c.x -= ruch - ruchO;
    return;
  }
}

// ---------------------------------------------------------------- wybór celu

function pickJob(sim: Sim, c: Creature): void {
  const w = sim.world;
  const d = RACES[c.race];
  const clan = sim.clans[c.clan];
  const oldX = c.jx, oldY = c.jy;
  c.jt = K.decyzjaTikow + sim.rng.int(K.decyzjaRozrzut);
  c.droga = undefined; c.drogaI = 0; c.drogaKopie = false;
  // etap 4: zbuntowany rycerz nie ma planera ludu — szuka, kogo bić
  /** Zapamiętuje drogę i ustawia cel zajęcia na jej końcu (albo na podanym kaflu). */
  const naDroge = (droga: number[], cx?: number, cy?: number): void => {
    c.droga = droga; c.drogaI = 0; c.drogaKopie = false;
    if (cx !== undefined && cy !== undefined) { c.jx = cx; c.jy = cy; return; }
    const k = droga.length ? droga[droga.length - 1] : w.idx(Math.floor(c.x), Math.floor(c.y));
    c.jx = k % w.w; c.jy = (k / w.w) | 0;
  };
  /** Kafel ze świętością w zasięgu modlitwy (3×3) — zwraca go albo -1. */
  const swietoscObok = (x: number, y: number, jaki: (t: number) => boolean): number => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (w.inb(xx, yy) && jaki(w.tile[w.idx(xx, yy)])) return w.idx(xx, yy);
    }
    return -1;
  };
  // Łup i tak trafia do klanu: chowają go po drodze. Warunek „tylko gdy niesie"
  // rozbijał się o antyzakleszczenie, które kasowało zajęcie — ruda krążyła w kółko.
  if (c.carry > 0 && !(REMAKE && rolaPostaci(c)) && (c.job === Job.HAUL || c.carryT > K.lupChowaPo)) {
    clan.stock += c.carry; c.carry = 0; c.carryT = 0;
  }
  /** Zachowaj postęp kucia, jeśli cel się nie zmienił — inaczej tunel nigdy nie powstaje. */
  const keepDig = () => { if (c.jx !== oldX || c.jy !== oldY) c.dig = 0; };

  // myśl od ciebie jest silniejsza niż każdy instynkt
  if (c.thought !== Thought.NONE) {
    switch (c.thought) {
      case Thought.DIG_DOWN:
        c.job = Job.DESCEND; c.jx = Math.floor(c.x); c.jy = Math.min(w.h - 2, Math.floor(c.y) + K.szeptKopGlebiej);
        c.jt = K.szeptKopTikow; return;
      case Thought.KILL_KIN: {
        // szuka najpierw swoich, potem kogokolwiek z rasy — szept nie może gasnąć bez skutku
        const swoj = sim.nearestCreature(c.x, c.y, K.szeptZabijSwoich, (o) => o.id !== c.id && o.clan === c.clan);
        const ktokolwiek = swoj ?? sim.nearestCreature(c.x, c.y, K.szeptZabijRasy, (o) => o.id !== c.id && o.race === c.race);
        if (ktokolwiek) {
          c.job = Job.FIGHT; c.jx = ktokolwiek.x; c.jy = ktokolwiek.y;
          sim.target.set(c.id, ktokolwiek.id); c.jt = K.szeptZabijTikow;
          // jeden nóż, nie rzeź: myśl gaśnie po pierwszym ataku. Trwała myśl robiła
          // z szaleńca seryjnego mordercę, który wybijał pół własnej nacji
          c.thought = Thought.NONE;
          return;
        }
        c.thought = Thought.NONE; break;
      }
      case Thought.PROPHESY:
        if (!c.prophet) sim.makeProphet(c);
        c.thought = Thought.NONE; break;
      case Thought.FLEE_UP:
        c.job = Job.FLEE; c.jx = c.x + sim.rng.range(-K.szeptUciekajWBok, K.szeptUciekajWBok); c.jy = Math.max(2, c.y - K.szeptUciekajWGore); c.jt = K.szeptUciekajTikow; return;
      case Thought.BREED:
        c.job = Job.BREED; c.jt = K.szeptPlodzTikow; c.thought = Thought.NONE; return;
      case Thought.PRAY_CORE:
        c.thought = Thought.NONE;
        // Trole i ludzie nie czczą nikogo — szept przepada, jak u każdego, kto nie umie wierzyć
        if (d.faithGain <= 0 || c.race === Race.TROLL || c.race === Race.HUMAN) break;
        // szept daje mu wiarę, jakiej nacja jeszcze nie ma: pod rdzeniem jego modlitwa się liczy,
        // a gdy skorupa puści, wejdzie do środka jako wierny
        c.devotion = Math.max(c.devotion, P.szeptOddanie);
        c.wyprawa = true;
        // Alpha: droga wiernych jeszcze niewykopana — czeka przy obozie (planer), zamiast schodzić na przełaj
        if (REMAKE && drogaNiegotowa(sim, c)) { c.jt = 0; c.zamiarDo = sim.tick; break; }
        c.job = Job.PIELGRZYM;
        if (REMAKE) { c.zamiar = 'schodzi do krypty i modli się przy pomniku'; c.zamiarDo = sim.tick + P.wyprawaTikow; }
        c.jx = miejsceWSzeregu(sim, c);
        c.jy = w.przedsionekY;
        c.jt = P.wyprawaTikow; c.dig = 0; return;
    }
  }

  if (!walczacy(c) && c.hp < maxHp(sim, c) * K.rannyUcieka && c.fear > K.rannyStrach) { c.job = Job.FLEE; c.jt = K.ucieczkaTikow; return; }

  // każda rasa ma własny sposób na głód; bez tego wszystkie poza Ślepym Ludem wymierały
  if (c.hunger > (c.race === Race.DWARF ? K.glodZuzlowcow : K.glodInnych)) {
    if (c.race === Race.TROLL && c.hunger > K.trolZasypiaOd) {
      const prey = sim.spokojnySwiat || sim.rozejm ? null : sim.nearestCreature(c.x, c.y, K.trolOfiaraZasieg, (o) => o.id !== c.id && o.race !== Race.TROLL && !sim.pokojMiedzy(c.clan, o.clan));
      if (!prey) { c.job = Job.SLEEP; c.jt = K.trolSpiTikow; return; }
    }
    if (c.race === Race.DWARF) {
      // do ciepła drogą, nie na przełaj — kuźnia za ścianą nikogo nie grzeje
      const droga = szukajDrogi(sim, c, (_i, x, y) => sim.goraco(x, y), K.cieploLimitDrogi);
      if (droga) { naDroge(droga); c.job = Job.HEAT; c.jt = K.cieploTikow + droga.length * K.tikowNaKafel; return; }
      const heat = sim.findHeat(c.x, c.y, K.cieploZasieg);
      if (heat) { c.job = Job.HEAT; c.jx = heat[0]; c.jy = heat[1]; c.jt = K.cieploTikow; return; }
    }
    if (c.race === Race.SPINNER && !sim.spokojnySwiat) {
      const slave = sim.nearestCreature(c.x, c.y, K.przadkaNiewolnik, (o) => o.clan === c.clan && o.slave);
      if (slave) { c.job = Job.DRAIN; sim.target.set(c.id, slave.id); c.jt = K.przadkaTikow; return; }
      // głodna Prządka poluje — nie czeka, aż ktoś sam na nią wpadnie
      const ofiara = sim.nearestCreature(c.x, c.y, K.przadkaPoluje, (o) => o.race !== Race.SPINNER && o.race !== Race.TROLL
        && o.clan !== c.clan && !o.slave && RACES[o.race].strength < K.przadkaSilaOfiary && !sim.pokojMiedzy(c.clan, o.clan));
      if (ofiara) { c.job = Job.SLAVE; sim.target.set(c.id, ofiara.id); c.jt = K.przadkaTikow; return; }
    }
  }

  // wróg w pobliżu
  // (Remake v1: najazd, któremu minął czas, już nie walczy — wraca na powierzchnię)
  const odchodzi = REMAKE && c.race === Race.HUMAN && c.od !== undefined && sim.tick - c.od > PP.ludzieWracajaPo;
  const foe = odchodzi ? null : sim.nearestCreature(c.x, c.y, c.race === Race.HUMAN ? K.wrogZasiegLudzi : K.wrogZasieg, (o) => sim.hostile(c, o));
  if (foe) {
    const scary = RACES[foe.race].strength > d.strength * K.strasznyWrog;
    if (scary && !walczacy(c) && sim.rng.chance(K.strachSzansa * d.fearGain * cechaNacji(sim.clans[c.clan]).strach)) {
      c.job = Job.FLEE; c.jx = c.x - (foe.x - c.x); c.jy = c.y - (foe.y - c.y); c.jt = K.ucieczkaTikow; c.fear = 1; return;
    }
    if (c.race === Race.SPINNER && RACES[foe.race].strength < K.przadkaSilaOfiary && sim.rng.chance(K.przadkaJarzmoSzansa)) {
      c.job = Job.SLAVE; sim.target.set(c.id, foe.id); c.jt = K.jarzmoTikow; return;
    }
    c.job = Job.FIGHT; sim.target.set(c.id, foe.id); c.jt = K.walkaTikow; return;
  }

  if (c.race === Race.HUMAN) { c.job = Job.RAID; c.jt = K.najazdTikow; return; }

  // Remake v1: lud nie losuje zajęć co chwilę — planer daje każdemu zamiar z celem (sim niżej)
  if (REMAKE && rolaPostaci(c)) { planujLud(sim, c); return; }

  if (c.hunger > K.idzieJesc && c.race !== Race.DWARF) {
    // najbliższy drogą, nie w linii prostej: grzyb za ścianą albo na półce był „najbliżej",
    // a głodny chodził pod nim, aż padł
    const droga = szukajDrogi(sim, c, (i) => edible(c.race, w.tile[i]), c.hunger > K.bardzoGlodny ? K.jedzenieLimitGlodny : K.jedzenieLimit);
    if (droga) { naDroge(droga); c.job = Job.EAT; c.jt = K.jedzenieTikow + droga.length * K.tikowNaKafelDoJedzenia; return; }
    const food = sim.findFood(c.x, c.y, c.hunger > K.bardzoGlodny ? K.jedzenieZasiegGlodny : K.jedzenieZasieg, d.swims, (t) => edible(c.race, t));
    if (food) { c.job = Job.EAT; c.jx = food[0]; c.jy = food[1]; c.jt = K.jedzenieTikow + Math.round(Math.hypot(food[0] - c.x, food[1] - c.y) * K.tikowNaKafel); return; }
    sim.foodMiss++;
    if (d.eatsMeat && !sim.spokojnySwiat && !sim.rozejm) {
      // głód najpierw pcha na obcych; po swoich sięga się dopiero na skraju śmierci
      // Remake v1: lud to sojusznicy — głodny nie poluje na swoich
      const prey = sim.nearestCreature(c.x, c.y, K.polowanieZasieg, (o) => o.id !== c.id && o.clan !== c.clan && (o.race !== c.race || c.hunger > K.kanibalizmOd) && !sim.pokojMiedzy(c.clan, o.clan))
        ?? (c.hunger > K.glodSlepy && !rolaPostaci(c) ? sim.nearestCreature(c.x, c.y, K.polowanieZasieg, (o) => o.id !== c.id) : null);
      if (prey) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = K.polowanieTikow; return; }
    }
  }

  // Pielgrzymka pod rdzeń: nacja trzyma pod skorupą stałą wartę. Kto zgłodnieje,
  // wraca do gniazda, a na jego miejsce schodzi następny — postęp i tak należy
  // do nacji (patrz rytual.ts), więc zmiana warty niczego nie kasuje.
  // Na pielgrzymkę idzie garstka najedzonych z dużej nacji. Wcześniej ruszała połowa
  // plemienia — razem z tymi, którzy ledwo się trzymali — i cała góra wymierała w drodze
  // pod rdzeń, choć grzyb rósł tuż obok gniazda.
  // (próg powyżej progu Uwolnienia: kto schodzi pod rdzeń, ma dość wiary, by wejść do środka)
  if (d.faithGain > 0 && rolaPostaci(c) === 'pobozny' && sim.tick >= (c.bezModlitwyDo ?? 0) && clan.devotion > P.oddanieNacji && c.devotion > P.oddanieWlasne && c.hunger < P.najedzony
      && clan.pop >= P.minNacja && sim.crowding[c.race] < P.maxZatloczenie
      // co najmniej trzech — tylu trzeba naraz pod skorupą, żeby kamień w ogóle drgnął
      && pielgrzymowKlanu(sim, clan.id) < Math.min(P.maxPielgrzymow, Math.max(P.minPielgrzymow, Math.floor(clan.pop * P.czescNacji)))
      // schodzą, gdy da się wrócić — albo gdy przy przedsionku jest co jeść: wtedy warta
      // przeżyje na dole i bez drogi powrotnej (dla gracza to jedno kliknięcie grzybem,
      // a nie sto kafli korytarza)
      && (sim.jedzeniePrzedsionka >= P.jedzenieWPrzedsionku || powrotSpodRdzenia(sim, c, clan))) {
    // im bliżej przedsionka ktoś już jest, tym chętniej schodzi resztę drogi
    const dystans = Math.hypot(c.x - w.coreX, c.y - w.przedsionekY);
    const chec = P.szansa + P.szansaBliskosc * Math.max(0, 1 - dystans / P.zasiegBliskosci);
    if (sim.rng.chance(chec)) {
      c.job = Job.PIELGRZYM;
      c.jx = miejsceWSzeregu(sim, c);
      c.jy = w.przedsionekY;
      c.jt = P.wyprawaTikow; c.dig = 0; return;       // to wyprawa, nie spacer — nie porzuca jej po chwili
    }
  }

  if (c.carry > 0) {
    c.job = Job.HAUL; c.jx = clan.hx; c.jy = clan.hy; c.jt = K.noszenieTikow;
    const droga = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - clan.hx) <= K.noszenieBliskoGniazda && Math.abs(y - clan.hy) <= K.noszenieBliskoGniazda, K.noszenieLimit);
    if (droga) { naDroge(droga, clan.hx, clan.hy); c.jt = K.noszenieTikow + droga.length * K.tikowNaKafel; }
    return;
  }

  // klan bez ognia przestaje istnieć — odbudowa kuźni jest ważniejsza niż wszystko
  if (c.race === Race.DWARF && clan.forges.length === 0 && clan.stock >= LUDY.kosztKuzni && sim.canBuild(c)) {
    c.job = Job.BUILD; c.jt = K.kuzniaTikow;
    const plac = w.idx(c.jx, c.jy);
    const droga = szukajDrogi(sim, c, (i) => i === plac, K.kuzniaLimit);
    if (droga) { naDroge(droga, c.jx, c.jy); c.jt = K.kuzniaTikow + droga.length * K.tikowNaKafel; }
    return;
  }

  if (c.race === Race.DWARF && clan.stock < K.zuzlowcyKopiaDo && c.hunger < K.zuzlowcyKopiaGlod) {
    // nie oddalają się od ognia dalej, niż zdążą wrócić
    let ruda = -1;
    const droga = szukajDrogi(sim, c, (_i, x, y) => {
      ruda = swietoscObok(x, y, (t) => t === T.ORE || t === T.CRYSTAL);
      return ruda >= 0 && !sim.przyMagmie(ruda % w.w, (ruda / w.w) | 0);
    }, K.zuzlowcyRudaLimit);
    if (droga && ruda >= 0) {
      naDroge(droga, ruda % w.w, (ruda / w.w) | 0);
      c.job = Job.DIG; c.jt = K.zuzlowcyRudaTikow + droga.length * K.tikowNaKafel;
      keepDig(); return;
    }
    const ore = sim.findTile(c.x, c.y, K.rudaZasieg, (t) => t === T.ORE || t === T.CRYSTAL);
    if (ore) {
      const dist = Math.hypot(ore[0] - c.x, ore[1] - c.y);
      c.job = Job.DIG; c.jx = ore[0]; c.jy = ore[1]; c.jt = K.zuzlowcyRudaTikow + Math.round(dist * K.tikowNaKafelKopania);
      keepDig(); return;
    }
  }

  // rytuał: ofiara z własnych dzieci, gdy oddanie jest wysokie
  // (rzadko i tylko w dużym klanie — przy dawnej częstości ofiar ginęło prawie tyle, ile się rodziło)
  // Remake v1: ofiara tylko z twojej woli (szept „ofiaruj”)
  if (!REMAKE && c.race === Race.GOBLIN && clan.devotion > K.ofiaraOddanie && clan.pop > K.ofiaraMinKlan && sim.rng.chance(K.ofiaraSzansa)) {
    let oltarz = -1;
    const droga = szukajDrogi(sim, c, (_i, x, y) => (oltarz = swietoscObok(x, y, (t) => t === T.SHRINE || t === T.GLYPH)) >= 0, K.ofiaraLimit);
    if (droga && oltarz >= 0) { naDroge(droga, oltarz % w.w, (oltarz / w.w) | 0); c.job = Job.SACRIFICE; c.jt = K.ofiaraTikow + droga.length * K.tikowNaKafel; return; }
    const shrine = sim.findTile(c.x, c.y, K.ofiaraZasieg, (t) => t === T.SHRINE || t === T.GLYPH);
    if (shrine) { c.job = Job.SACRIFICE; c.jx = shrine[0]; c.jy = shrine[1]; c.jt = K.ofiaraTikow; return; }
  }

  // Rozmnaża się wyłącznie Ślepy Lud. Żużlowców się wykuwa, Prządki przerabiają
  // niewolników, Trole są końcem drogi kogoś, kto kopał za głęboko, a Grzybnia rośnie
  // ze zwłok. Inaczej jedyny wektor wzrostu wygrywa ten, kto rodzi najszybciej.
  // Im ciaśniej, tym rzadziej — zamiast twardego progu, przy którym rodzili się do ostatniej
  // chwili, a potem cała nacja głodowała naraz i zjadała się nawzajem aż do zera.
  const miejsce = Math.max(0, Math.min(1, (K.rozrodTlok - sim.crowding[c.race]) * K.rozrodCzulosc));
  // Remake v1: nikt się nie rodzi (Alpha: drużyna jest stała)
  if (!REMAKE && c.race === Race.GOBLIN && clan.pop < clan.cap && miejsce > 0
      && sim.popByRace[c.race] < sim.raceCap[c.race]
      && c.hunger < K.rozrodGlod && c.age > K.rozrodWiek && sim.rng.chance(RACES[c.race].breedRate * cechaNacji(clan).rozrod * miejsce)) {
    c.job = Job.BREED; c.jt = K.rozrodTikow;
    if (Math.hypot(clan.hx - c.x, clan.hy - c.y) > K.rozrodDoGniazda) {
      const droga = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - clan.hx) <= K.noszenieBliskoGniazda && Math.abs(y - clan.hy) <= K.noszenieBliskoGniazda, K.rozrodLimit);
      if (droga) { naDroge(droga, clan.hx, clan.hy); c.jt = K.rozrodTikow + droga.length * K.tikowNaKafel; }
    }
    return;
  }

  // modlitwa albo praca — zależnie od tego, jak dana rasa cię czci
  // Trole nie czczą nikogo: chodziły modlić się pod ołtarze Ślepego Ludu i tam ginęły
  if (d.faithGain > 0 && c.race !== Race.TROLL && sim.tick >= (c.bezModlitwyDo ?? 0) && sim.rng.chance((K.modlitwaSzansa + clan.devotion * K.modlitwaOdOddania) * mnoznik(sim, c, 'modlitwa'))) {
    const swiete = (t: number) => t === (c.race === Race.DWARF ? T.FORGE : T.SHRINE) || t === T.GLYPH || t === T.CORE;
    let cel = -1;
    const droga = szukajDrogi(sim, c, (_i, x, y) => (cel = swietoscObok(x, y, swiete)) >= 0, K.modlitwaLimit);
    if (droga && cel >= 0) { naDroge(droga, cel % w.w, (cel / w.w) | 0); c.job = Job.PRAY; c.jt = K.modlitwaTikow + droga.length * K.tikowNaKafel; return; }
    const holy = sim.findTile(c.x, c.y, K.modlitwaZasieg, swiete);
    if (holy) { c.job = Job.PRAY; c.jx = holy[0]; c.jy = holy[1]; c.jt = K.modlitwaTikow; return; }
    if (sim.canBuild(c)) { c.job = Job.BUILD; c.jt = K.budowaTikow; return; }
  }

  // kopanie: ruda ciągnie, ale pusty korytarz też trzeba komuś wydrążyć
  if (d.digPower > 0 && (rolaPostaci(c) ?? 'robotnik') === 'robotnik' && sim.rng.chance(K.kopanieSzansa)) {
    let ruda = -1;
    const droga = szukajDrogi(sim, c, (_i, x, y) => {
      ruda = swietoscObok(x, y, (t) => t === T.ORE || (c.race === Race.DWARF && t === T.CRYSTAL));
      return ruda >= 0 && !sim.przyMagmie(ruda % w.w, (ruda / w.w) | 0);
    }, K.kopanieLimit);
    if (droga && ruda >= 0) {
      naDroge(droga, ruda % w.w, (ruda / w.w) | 0);
      c.job = Job.DIG; c.jt = K.kopanieTikow + droga.length * K.tikowNaKafel;
      keepDig(); return;
    }
    const ore = sim.findTile(c.x, c.y, K.rudaZasieg, (t) => t === T.ORE || (c.race === Race.DWARF && t === T.CRYSTAL));
    if (ore) {
      const dist = Math.hypot(ore[0] - c.x, ore[1] - c.y);
      c.job = Job.DIG; c.jx = ore[0]; c.jy = ore[1]; c.jt = K.kopanieTikow + Math.round(dist * K.tikowNaKafelKopania);
      keepDig(); return;
    }
    c.job = Job.DIG;
    c.jx = Math.floor(c.x) + sim.rng.int(K.kopanieLosoweX * 2 + 1) - K.kopanieLosoweX;
    c.jy = Math.floor(c.y) + sim.rng.int(9) - 3;
    c.jt = K.kopanieTikowLosowe; c.dig = 0; return;
  }

  c.job = Job.WANDER;
  if (rolaPostaci(c) === 'rycerz') {
    // rycerze trzymają się siedziby — wróg przyjdzie tam, gdzie są wszyscy
    c.jx = clan.hx + sim.rng.range(-8, 8);
    c.jy = clan.hy + sim.rng.range(-3, 3);
    return;
  }
  c.jx = c.x + sim.rng.range(-K.spacerX, K.spacerX);
  // Remake v1: lud spaceruje w poziomie — spacer „w dół” kończył się szybem, z którego nie było powrotu
  c.jy = REMAKE && rolaPostaci(c) ? c.y + sim.rng.range(-1, 1) : c.y + sim.rng.range(-K.spacerY, K.spacerY);
}


// ------------------------------------------------------------- Remake v1: zamiary ludu
/**
 * Planer ludu: każdy dostaje jeden zamiar z celem i trzyma się go `LUD.zamiarTikow`
 * (≈10 s) albo do osiągnięcia celu. Wcześniej zajęcie trwało ułamek sekundy i było
 * losowane od nowa — robotnik kopał kafel, wracał do obozu i tak w kółko, a pobożni
 * i rycerze kręcili się w losowe strony. Przerywa go tylko to, co pilne: głód, wróg, szept.
 */
function planujLud(sim: Sim, c: Creature): void {
  const w = sim.world;
  const clan = sim.clans[c.clan];
  const rola = rolaPostaci(c)!;
  const Z = LUD.zamiarTikow;
  // z pustymi rękami nikomu nic nie niesie — inaczej „kurier”, który poszedł jeść, blokował dostawę na zawsze
  if (c.carry === 0) { c.dostawaDla = undefined; c.doObozu = undefined; }
  const kopal = !!c.kopieDroge;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  c.czynnosc = undefined;
  const naDroge = (droga: number[], cx?: number, cy?: number): void => {
    c.droga = droga; c.drogaI = 0; c.drogaKopie = false;
    if (cx !== undefined && cy !== undefined) { c.jx = cx; c.jy = cy; return; }
    const k = droga.length ? droga[droga.length - 1] : w.idx(Math.floor(c.x), Math.floor(c.y));
    c.jx = k % w.w; c.jy = (k / w.w) | 0;
  };
  const zamiar = (opis: string, job: Job, jt: number): void => {
    c.zamiar = opis; c.job = job; c.jt = jt; c.zamiarDo = sim.tick + jt;
  };
  const droga = (cel: (x: number, y: number) => boolean, limit: number) => szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
  const podroz = (d: number[]) => K.noszenieTikow + d.length * K.tikowNaKafel;

  // etap 3d: odprawia rytuał przy ołtarzu — klęczy przy nim, aż skończy (głód i fala poczekają; wróg — nie,
  // walka przerywa wszystko, a odejście od ołtarza przerywa rytuał)
  const rytual = odprawia(sim, c);
  if (rytual) { klecz(sim, c, rytual, naDroge, zamiar, droga, podroz); return; }

  // etap 3: zwykła fala Strażników — kto nie jest rycerzem, odchodzi spod rdzenia (modlitwa i tak nic nie kruszy);
  // pobożny z wyprawy wraca pod rdzeń, gdy fala minie
  // (głodny, do którego żaden Strażnik nie jest blisko, najpierw idzie jeść — na skraju strefy uciekali w kółko
  // i umierali z głodu po kilku naraz)
  const glodnyBezpieczny = c.hunger > LUD.glodSam && !zywiStraznicy(sim).some((s) => Math.hypot(s.x - c.x, s.y - c.y) < STRAZNICY.glodnyNieUciekaOd);
  // (ostatnia deska: pobożni nie uciekają — stają przeciw bossowi z księgą)
  // (rycerze też, gdy jest ich za mało na bossa — czekają na towarzyszy)
  const czeka = walczacy(c) && rycerzeCzekaja(sim);
  if ((falaZwykla(sim) || czeka) && (!walczacy(c) || czeka) && !(rola === 'pobozny' && trybWiernych(sim)) && !glodnyBezpieczny && wStrefieStraznikow(sim, c.x, c.y, STRAZNICY.ucieczkaZapas)) {
    // najchętniej do najbliższego obozu poza strefą, inaczej byle dalej
    // rycerz, który czeka na towarzyszy, staje tuż za skrajem strefy — tam, skąd wróci do walki
    const skraj = czeka ? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas + 6) && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3), LUD.dostawaLimit) : null;
    if (skraj) { naDroge(skraj); zamiar(`czeka na skraju, aż zbierze się ich dość (${iluRycerzy(sim)}/${STRAZNICY.rycerzyNaBossa})`, Job.WANDER, podroz(skraj)); return; }
    const sp = obozyWgOdleglosci(sim, c.x, c.y).find((o) => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas));
    const d = (sp ? droga((x, y) => Math.abs(x - sp.x) <= 3 && Math.abs(y - sp.y) <= 2 && stoi(sim, x, y), LUD.dostawaLimit) : null)
      ?? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && stoi(sim, x, y), LUD.dostawaLimit);
    if (d) { naDroge(d); zamiar(czeka ? `czeka na towarzyszy — na bossa ruszą, gdy będzie ich ${STRAZNICY.rycerzyNaBossa}` : 'odchodzi z krypty przed Strażnikami Snu', Job.WANDER, podroz(d)); return; }
  }
  // pielgrzym trzyma się wyprawy, aż dojdzie (albo aż ty ją przerwiesz) — wcześniej porzucał ją po minucie
  if ((c.job === Job.PIELGRZYM || c.wyprawa) && sim.tick >= (c.bezModlitwyDo ?? 0) && c.hunger < LUD.glodSam) {
    // droga do rdzenia jeszcze niewykopana albo trwa fala Strażników — czeka przy obozie frontowym
    if (drogaNiegotowa(sim, c) || falaZwykla(sim)) {
      c.wyprawa = true;
      if (falaZwykla(sim)) {
        // czeka przy spiżarni poza strefą Strażników (stanPrzyObozie sam ją wybiera) — tam zje
        if (!stanPrzyObozie(sim, c, naDroge, droga)) { c.jx = Math.floor(c.x); c.jy = Math.floor(c.y); c.droga = undefined; }
        zamiar('czeka z dala od krypty, aż fala Strażników minie', Job.STOI, Z);
        return;
      }
      if (stanPrzyObozie(sim, c, naDroge, droga)) {
        c.modliPrzyObozie = true;
        zamiar('czeka przy obozie, aż robotnicy dokopią drogę do krypty', Job.STOI, Z);
        return;
      }
    }
    if (c.job !== Job.PIELGRZYM) { c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0; }
    c.wyprawa = true;
    zamiar('schodzi do krypty i modli się przy pomniku', Job.PIELGRZYM, P.wyprawaTikow);
    return;
  }

  // --- głód: robotnik je sam; pobożni i rycerze czekają na dostawę, chyba że już ledwo żyją
  const robotnikow = liczRole(sim).robotnik;
  // robotnik daleko od spiżarni rusza jeść wcześniej (droga powrotna bywa długa), kopacz drogi czeka na dostawę
  const spB = najblizszaSpizarnia(sim, c.x, c.y, true);
  const dalekoOdJedzenia = !spB || Math.hypot(spB.x - c.x, spB.y - c.y) > LUD.daleko;
  const progRobotnika = kopal && robotnikow > 1 ? LUD.glodSam : dalekoOdJedzenia ? LUD.glodDostawy : K.idzieJesc;
  // stacjonujący przy spiżarni z jedzeniem je sam (po co czekać na dostawę, gdy jedzenie leży obok);
  // dostawy są dla tych, którzy stoją daleko — pod rdzeniem, na warcie
  const spizarniaObok = !!spB && Math.hypot(spB.x - c.x, spB.y - c.y) <= LUD.spizarniaObok;
  const glodny = rola === 'robotnik' ? c.hunger > progRobotnika
    : c.hunger > LUD.glodSam || (robotnikow === 0 && c.hunger > K.idzieJesc) || (spizarniaObok && c.hunger > LUD.glodDostawy);
  const odOgnia = sim.tick - (c.odOgnia ?? -1e9) < Z;   // świeżo uciekł od ognia — nie wraca w jego stronę
  // Remake v2: skrajnie głodny nie czeka, aż wiadro zjedzie — biegnie pod jego linę i wspina się do niego
  if (c.hunger >= WIADRO.wspinaczkaOd && c.carry === 0) {
    const wd = wiadroDoWspinaczki(sim, c);
    const d = wd ? droga((x, y) => x === wd.x && y === wd.cel, LUD.doSpizarni) : null;
    if (wd && d) { naDroge(d, wd.x, wd.cel); c.linaDo = wd.id; zamiar('umiera z głodu — biegnie pod linę zjeżdżającego wiadra', Job.LINA, podroz(d) + 600); return; }
  }
  if (glodny && c.carry === 0) {
    // (w czasie fali nie-walczący nie idzie jeść do wiadra w strefie Strażników — boss wybijał ich tam po kolei)
    const wFali = falaZwykla(sim) && (!walczacy(c) || rycerzeCzekaja(sim));
    if (sim.tick >= (c.bezSpizarniDo ?? 0)) {
      for (const sp of spizarnieWgOdleglosci(sim, c.x, c.y, true).filter((sp) => (!odOgnia || !sim.przyMagmie(sp.x, sp.y, 4)) && !(wFali && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas))).slice(0, 3)) {
        const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.doSpizarni);
        if (d) { naDroge(d, sp.x, sp.y); zamiar('idzie jeść do wiadra', Job.ZAPAS, podroz(d)); return; }
      }
      // Alpha, etap 3d: do żadnego stojącego wiadra nie dojdzie, ale jedno właśnie zjeżdża tam, dokąd dojdzie — czeka
      // pod nim, zamiast kuć dalej w dół (kopacz drogi wiernych schodził za zeskok, oddalał się od wiadra, które jechało
      // do niego, i umierał z głodu kilka kafli niżej)
      for (const wd of wiadra(sim)) {
        if (wd.porcje <= 0 || (wd.faza !== 'zapowiedz' && wd.faza !== 'zjezdza') || Math.hypot(wd.x - c.x, wd.cel - c.y) > 30) continue;
        if (wFali && wStrefieStraznikow(sim, wd.x, wd.cel, STRAZNICY.ucieczkaZapas)) continue;
        const d = droga((x, y) => Math.abs(x - wd.x) <= 1 && Math.abs(y - wd.cel) <= 1, LUD.doSpizarni);
        if (d) { naDroge(d, wd.x, wd.cel); zamiar('głodny — czeka na wiadro, które zjeżdża', Job.STOI, podroz(d) + 120); return; }
      }
    }
  }

  // --- niesie jedzenie: głodnemu albo do najbliższej spiżarni
  if (c.carry > 0) {
    const komu = c.dostawaDla !== undefined ? sim.creatureById(c.dostawaDla) : null;
    if (komu && !komu.dead && komu.hunger > 0.1) {
      const kx = Math.floor(komu.x), ky = Math.floor(komu.y);
      const d = droga((x, y) => Math.abs(x - kx) <= 1 && Math.abs(y - ky) <= 1, LUD.dostawaLimit);
      // (Alpha: nie dojdzie do niego — nie idzie na przełaj: schodził z półek na dno jaskini i już nie wracał)
      if (d || (!REMAKE && budzetDrog() > 0)) {
        c.jx = kx; c.jy = ky;
        if (d) naDroge(d, c.jx, c.jy);
        zamiar(`niesie jedzenie: ${komu.rola === 'rycerz' ? 'rycerz' : 'pobożny'} #${komu.id}`, Job.DOSTAWA, d ? podroz(d) : Z);
        return;
      }
      if (budzetDrog() <= 0) { zamiar('zastanawia się, którędy iść', Job.STOI, 30); return; }
    }
    c.dostawaDla = undefined; c.doObozu = undefined;
    // nie ma komu — odnosi porcję do najbliższego wiadra (a gdy żadne nie stoi, zje ją sam, kiedy zgłodnieje)
    const sp = najblizszaSpizarnia(sim, c.x, c.y, false);
    if (sp) {
      const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.dostawaLimit);
      // (Alpha: do wiadra nie dojdzie — zostaje z porcją w ręku i zje ją, kiedy zgłodnieje)
      if (d || !REMAKE) {
        c.jx = sp.x; c.jy = sp.y;
        if (d) naDroge(d, sp.x, sp.y);
        zamiar('odnosi jedzenie do wiadra', Job.HAUL, d ? podroz(d) : Z);
        return;
      }
    }
  }

  // Alpha: rozkaz gracza — przed zwykłymi zajęciami (głód, ucieczka przed falą i jedzenie w rękach są pilniejsze)
  if (c.polecenie && planPolecenia(sim, c, rola, naDroge, zamiar, droga, podroz)) return;

  // (robotnik w hełmie w czasie fali Strażników żyje jak rycerz — staje na warcie i walczy)
  if (rola === 'robotnik' && !(c.helm && falaTrwa(sim))) { planRobotnika(sim, c, naDroge, zamiar, droga, podroz); return; }
  if (rola === 'pobozny') {
    // sam schodzi pod rdzeń, gdy nacja wierzy dość mocno (te same warunki co dawniej)
    const d = RACES[c.race];
    if (d.faithGain > 0 && sim.tick >= (c.bezModlitwyDo ?? 0) && clan.devotion > P.oddanieNacji && c.devotion > P.oddanieWlasne && c.hunger < P.najedzony
        && pielgrzymowKlanu(sim, clan.id) < Math.min(P.maxPielgrzymow, Math.max(P.minPielgrzymow, Math.floor(clan.pop * P.czescNacji)))
        && (sim.jedzeniePrzedsionka >= P.jedzenieWPrzedsionku || powrotSpodRdzenia(sim, c, clan)) && sim.rng.chance(0.35)) {
      c.wyprawa = true;
      // Alpha: pobożny nie kuje — póki droga wiernych niewykopana, czeka przy obozie (wcześniej schodził
      // sam, wykuwając szyby w dół, a rycerz i robotnicy z jedzeniem nie mieli jak za nim zejść ani wrócić)
      if (drogaNiegotowa(sim, c) && stanPrzyObozie(sim, c, naDroge, droga)) {
        c.modliPrzyObozie = true;
        zamiar('czeka przy obozie, aż robotnicy dokopią drogę do krypty', Job.STOI, Z);
        return;
      }
      c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0;
      zamiar('schodzi do krypty i modli się przy pomniku', Job.PIELGRZYM, P.wyprawaTikow);
      return;
    }
    if (sim.tick >= (c.bezModlitwyDo ?? 0)) {
      // ołtarz albo znak w pobliżu obozu
      let cel = -1;
      const swiete = (t: number) => t === T.SHRINE || t === T.GLYPH;
      const dd = szukajDrogi(sim, c, (_i, x, y) => {
        for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (w.inb(x + xx, y + yy) && swiete(w.tile[w.idx(x + xx, y + yy)])) { cel = w.idx(x + xx, y + yy); return true; }
        return false;
      }, K.modlitwaLimit);
      if (dd && cel >= 0 && dd.length < 30) { naDroge(dd, cel % w.w, (cel / w.w) | 0); zamiar('modli się przy ołtarzu', Job.PRAY, podroz(dd) + Z); return; }
      if (sim.rng.chance(0.15) && sim.canBuild(c)) { zamiar('stawia ołtarz przy obozie', Job.BUILD, K.budowaTikow * 3); return; }
    }
    if (stanPrzyObozie(sim, c, naDroge, droga)) {
      c.modliPrzyObozie = sim.tick >= (c.bezModlitwyDo ?? 0);
      zamiar(c.modliPrzyObozie ? 'modli się przy obozie' : 'odpoczywa przy obozie', Job.STOI, Z);
      return;
    }
  }
  if (rola === 'rycerz' || (rola === 'robotnik' && c.helm)) {
    // etap 3f: na wieszaku w kuźni czeka część zbroi, a fali nie ma — idzie ją założyć i wraca
    if (!falaTrwa(sim) && idziePoZbroje(sim, c)) {
      const r = planZbroi(sim, c, undefined, naDroge, zamiar, droga, podroz);
      if (r === 'zaklada' || r === 'idzie') return;
      if (r === 'nie dojdzie') c.zbrojaBezDo = sim.tick + ZBROJA.ponowPo;
    }
    // za mało rycerzy na bossa — czekają na skraju strefy z bronią w ręku (nie uciekają do dalekiej spiżarni)
    if (rycerzeCzekaja(sim)) {
      c.jx = Math.floor(c.x); c.jy = Math.floor(c.y); c.droga = undefined;
      zamiar(`czeka na skraju, aż zbierze się ich dość (${iluRycerzy(sim)}/${STRAZNICY.rycerzyNaBossa}) — broni się, gdy coś podejdzie`, Job.STOI, Z);
      return;
    }
    // pobożni modlą się pod rdzeniem — rycerze idą z nimi na wartę (jedzenie donoszą robotnicy,
    // a przy warcie powstaje obóz, który zaopatrują)
    if (wartaPotrzebna(sim) && !rycerzeCzekaja(sim)) {
      const strona = c.id % 2 ? -1 : 1;
      const naPoscie = (x: number, y: number, s: number) => {
        const od = (x - w.coreX) * s;
        // (nie przy magmie — rycerze są wolni i płonęli, zanim zdążyli odejść od ognia)
        return od > P.przedsionekX && od <= P.przedsionekX + LUD.wartaOdstep + 8 && Math.abs(y - w.przedsionekY) <= 6 && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3);
      };
      const d = droga((x, y) => naPoscie(x, y, strona), LUD.dostawaLimit) ?? droga((x, y) => naPoscie(x, y, -strona), LUD.dostawaLimit);
      if (d) { naDroge(d); zamiar('trzyma wartę w krypcie, z boku modlących się', Job.WARTA, podroz(d) + Z); return; }
    }
    if (stanPrzyObozie(sim, c, naDroge, droga)) { zamiar('pilnuje obozu', Job.STOI, Z); return; }
  }
  // nie ma dokąd iść — z odciętej kieszeni wkopuje się do spiżarni, inaczej stoi, gdzie jest
  if (wkopSieDoSpizarni(sim, c, zamiar)) return;
  c.jx = Math.floor(c.x); c.jy = Math.floor(c.y);
  zamiar('czeka', Job.STOI, Z);
}

/**
 * Remake v2: droga z kopaniem do celu (`szukajKopiac`) — tędy wykuje sobie przejście, pod górę schodami.
 * Ustawia ją jako drogę postaci; false, gdy w zasięgu nie ma takiej drogi albo zabrakło budżetu tiku.
 */
function wkopDroga(sim: Sim, c: Creature, cel: (x: number, y: number) => boolean, limit = 5000): number[] | null {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (!w.inb(cx, cy)) return null;
  // (Alpha: kopie na rozkaz albo ratując się z kieszeni — także blisko rdzenia; skorupy i tak nie ruszy)
  const r = szukajKopiac(sim, [w.idx(cx, cy)], (_i, x, y) => cel(x, y), { koszt: kosztKuciaLudu(sim, true), limit });
  if (!r || !r.droga.length) return null;
  c.droga = r.droga; c.drogaI = 0; c.drogaKopie = true;
  const k = r.droga[r.droga.length - 1];
  c.jx = k % w.w; c.jy = (k / w.w) | 0;
  return r.droga;
}

/**
 * Remake v1: kto utknął w kieszeni, z której nie prowadzi żadna droga (zalało ją, osypała się),
 * wkopuje się w stronę najbliższej spiżarni — wcześniej „czekał” tam, aż umarł z głodu.
 * Remake v2: drogą z kopaniem (pod górę — schodami), a gdy takiej nie ma — na przełaj.
 */
function wkopSieDoSpizarni(sim: Sim, c: Creature, zamiar: (opis: string, job: Job, jt: number) => void): boolean {
  // tylko głodny i tylko gdy szukanie drogi naprawdę się odbyło (pusty budżet to nie „nie ma drogi”) —
  // wkopujący się na ślepo przy froncie drogi rozkopywali ją i droga do rdzenia stała przez 10 minut
  if (c.hunger <= LUD.glodSam || budzetDrog() < 3) return false;
  const sp = najblizszaSpizarnia(sim, c.x, c.y, false) ?? najblizszyOboz(sim, c.x, c.y);
  if (!sp || Math.hypot(sp.x - c.x, sp.y - c.y) <= 3) return false;
  const sps = [...spizarnieWgOdleglosci(sim, c.x, c.y, false), ...obozyLudu(sim)];
  const d = szukajDrogi(sim, c, (_i, x, y) => sps.some((o) => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1), LUD.doSpizarni);
  if (d || budzetDrog() < 1) return false;
  c.jx = sp.x; c.jy = sp.y; c.droga = undefined;
  const dk = wkopDroga(sim, c, (x, y) => sps.some((o) => Math.abs(o.x - x) <= 2 && Math.abs(o.y - y) <= 1) && stoi(sim, x, y), POLECENIA.szukanieKopania);
  zamiar('wkopuje się z odciętej kieszeni do swoich', Job.WANDER, dk ? K.noszenieTikow + dk.length * K.tikowNaKafelKopania * 2 : LUD.zamiarTikow);
  return true;
}

/** Miejsce do stania przy najbliższym obozie (siedzibie albo obozie ze spiżarnią) — każdy ma swoje. */
function stanPrzyObozie(sim: Sim, c: Creature, naDroge: (d: number[], x?: number, y?: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null): boolean {
  // pobożni i rycerze stacjonują przy obozie frontowym (najbliżej rdzenia) — idą za postępem drogi;
  // robotnik odpoczywa przy najbliższej spiżarni
  // rycerz poza wartą pilnuje najbliższego obozu z jedzeniem — przy froncie, daleko od spiżarni,
  // (raz wybrany obóz trzyma, póki ma jedzenie: „najbliższy” zmieniał się w drodze i rycerz kursował szybem w kółko)
  let sp: MiejsceJedzenia | null;
  if (walczacy(c)) {
    const stary = c.posterunek ? obozyLudu(sim).find((o) => o.x === c.posterunek!.x && o.y === c.posterunek!.y) : undefined;
    // gdy pobożni wyruszają pod rdzeń, rycerze idą z nimi do obozu frontowego
    sp = wyprawaTrwa(sim) ? obozFrontowy(sim) : stary ?? najblizszyOboz(sim, c.x, c.y) ?? obozFrontowy(sim);
    c.posterunek = sp ? { x: sp.x, y: sp.y } : undefined;
  } else sp = stacjonuje(c) ? obozFrontowy(sim) : najblizszyOboz(sim, c.x, c.y);
  // etap 3: w czasie fali Strażników nie-walczący nie stają przy obozie pod rdzeniem
  if (sp && (!walczacy(c) ? falaZwykla(sim) : rycerzeCzekaja(sim)) && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas)) {
    sp = obozyWgOdleglosci(sim, c.x, c.y).find((o) => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas)) ?? null;
  }
  if (!sp) return false;
  // rycerze stoją dalej, na skraju obozu; pobożni bliżej — każdy w swoim miejscu, nie jeden na drugim
  const r = walczacy(c) ? 5 : 2;
  const px = sp.x + (c.id % 2 ? -1 : 1) * (r + (c.id >> 1) % 3);
  const sucho = (x: number, y: number) => sim.world.water[sim.world.idx(x, y)] < 3 && !sim.przyMagmie(x, y, 3);
  const d = droga((x, y) => Math.abs(x - px) <= 1 && Math.abs(y - sp.y) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni)
    ?? droga((x, y) => Math.abs(x - sp.x) <= 6 && Math.abs(y - sp.y) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni);
  if (!d) return false;
  naDroge(d);
  return true;
}

/**
 * Robotnik bez rozkazu (Alpha: nie kopie już na własną rękę — kopie tylko na rozkaz, sim/polecenia.ts):
 * nosi jedzenie z wiader tym, którzy stoją daleko (pobożnym, rycerzowi), a poza tym odpoczywa przy obozie.
 */
function planRobotnika(sim: Sim, c: Creature,
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): void {
  const Z = LUD.zamiarTikow;
  if (c.carry === 0) c.dostawaDla = undefined;
  // etap 4: w czasie zwykłej fali Strażników robotnik nie bierze zadań w ich strefie (ginęli, nosząc tam jedzenie)
  const strefa = falaZwykla(sim) ? (x: number, y: number) => wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) : () => false;
  // 1. dostawa: z najbliższego wiadra z jedzeniem (jak tam nie dojdzie — z następnego) do głodnego
  const komu = glodnyDoNakarmienia(sim, c);
  // (Alpha: tylko komuś, do kogo dojdzie — inaczej brał porcję i szedł z nią na przełaj w przepaść)
  const dojdzie = (o: Creature) => !!droga((x, y) => Math.abs(x - Math.floor(o.x)) <= 1 && Math.abs(y - Math.floor(o.y)) <= 1, LUD.dostawaLimit);
  if (komu && !strefa(komu.x, komu.y) && dojdzie(komu)) {
    for (const sp of spizarnieWgOdleglosci(sim, c.x, c.y, true).slice(0, 3)) {
      const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.dostawaLimit);
      if (d) {
        naDroge(d, sp.x, sp.y); c.dostawaDla = komu.id;
        zamiar(`bierze jedzenie z wiadra dla: ${komu.rola === 'rycerz' ? 'rycerz' : 'pobożny'} #${komu.id}`, Job.ZBIERA, podroz(d));
        return;
      }
    }
  }
  // 2. świeżo uciekł od ognia — przeczekuje z dala od niego
  if (sim.tick - (c.odOgnia ?? -1e9) < Z) {
    if (wkopSieDoSpizarni(sim, c, zamiar)) return;
    c.jx = Math.floor(c.x); c.jy = Math.floor(c.y);
    zamiar('czeka z dala od ognia', Job.STOI, Z);
    return;
  }
  // 3. odpoczywa przy obozie — czeka na rozkaz
  if (stanPrzyObozie(sim, c, naDroge, droga)) { zamiar('odpoczywa przy obozie — czeka na rozkaz', Job.STOI, Z); return; }
  if (wkopSieDoSpizarni(sim, c, zamiar)) return;
  c.jx = Math.floor(c.x); c.jy = Math.floor(c.y);
  zamiar('czeka na rozkaz', Job.STOI, Z);
}

/**
 * Alpha: rozkaz gracza (sim/polecenia.ts). „Idź tam” — idzie drogą, a robotnik, gdy drogi nie ma, przekopuje się;
 * na miejscu trzyma posterunek (pobożny modli się, rycerz pilnuje). „Kop tam” (robotnik, lita skała) — przekopuje
 * się i wykuwa wskazany kafel. „Kop drogę wiernych” — kopie czoło złotej kreski, aż droga będzie gotowa.
 * Zwraca false, gdy rozkaz się skończył albo przepadł — wtedy planer robi to, co zwykle.
 */
function planPolecenia(sim: Sim, c: Creature, rola: Rola,
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): boolean {
  const p = c.polecenie!;
  const w = sim.world;
  const Z = LUD.zamiarTikow;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const przekop = (dk: number[]) => K.noszenieTikow + dk.length * K.tikowNaKafelKopania * 2;
  // nie było czasu szukać drogi w tym tiku — spróbuje za chwilę (to nie „nie ma drogi”)
  const brakCzasu = (): boolean => { zamiar('zastanawia się, którędy iść', Job.STOI, 30); return true; };
  const poddajSie = (tekst: string): boolean => {
    p.prob = (p.prob ?? 0) + 1;
    if (p.prob < POLECENIA.prob) { zamiar('szuka drogi tam, gdzie kazałeś', Job.STOI, 240); return true; }
    c.polecenie = undefined;
    odmow(sim, c, tekst);
    return false;
  };

  if (p.typ === 'droga') {
    const cz = czoloDrogi(sim);
    if (cz < 0) {
      c.polecenie = undefined; c.kopieDroge = false;
      sim.efekt(c.x, c.y, 'mysl', 'droga gotowa');
      return false;
    }
    p.x = cz % w.w; p.y = (cz / w.w) | 0;
    const fx = p.x, fy = p.y;
    // miejsce tuż przy czole, na którym da się stać — kuje się na podłodze, nie wisząc
    const obok = (x: number, y: number) => (Math.abs(x - fx) + Math.abs(y - fy) === 1 || (Math.abs(x - fx) === 1 && Math.abs(y - fy) === 1)) && stoi(sim, x, y);
    if (budzetDrog() <= 0) return brakCzasu();
    const d = droga(obok, LUD.dostawaLimit);
    if (d) { naDroge(d); c.jx = fx; c.jy = fy; c.dig = 0; c.kopieDroge = true; zamiar('kopie drogę wiernych — tak kazałeś', Job.DIG, podroz(d) + Z); p.prob = 0; return true; }
    // do czoła nie dojdzie (zszedł niżej, a lud nie wspina się po ścianach) — kuje dalszy kawałek kreski,
    // do którego dojdzie; czoło zostaje dla tych, którzy są nad nim. Alpha: tylko na drodze w dół — droga
    // schodami prowadzi od siedziby, a „dalszy kawałek” ściągał kopaczy zeskokami w głąb, skąd nie wracali
    if (budzetDrog() <= 0) return brakCzasu();
    const reszta = new Set(sim.planDrogi?.dwukierunkowa ? [] : nieWykopane(sim).slice(1));
    const kafelObok = (x: number, y: number): number => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.inb(x + dx, y + dy) && reszta.has(w.idx(x + dx, y + dy))) return w.idx(x + dx, y + dy);
      return -1;
    };
    const d2 = reszta.size ? droga((x, y) => stoi(sim, x, y) && kafelObok(x, y) >= 0, LUD.dostawaLimit) : null;
    if (d2) {
      const k = d2.length ? d2[d2.length - 1] : w.idx(cx, cy);
      const cel = kafelObok(k % w.w, (k / w.w) | 0);
      naDroge(d2); c.jx = cel % w.w; c.jy = (cel / w.w) | 0; c.dig = 0; c.kopieDroge = true;
      zamiar('kopie dalszy kawałek drogi wiernych — do czoła nie dojdzie', Job.DIG, podroz(d2) + Z); p.prob = 0;
      return true;
    }
    if (budzetDrog() <= 1) return brakCzasu();
    // przekopuje się w samo czoło (wykuje je po drodze) — miejsca „obok” w litej skale jeszcze nie ma, na czym stać
    const dk = wkopDroga(sim, c, (x, y) => x === fx && y === fy, POLECENIA.szukanieKopania);
    if (dk) { zamiar('przekopuje się do czoła drogi wiernych', Job.WANDER, przekop(dk)); p.prob = 0; return true; }
    return poddajSie('nie dojdę do czoła drogi');
  }

  // etap 4: „napraw linę” — idzie pod zwisający koniec przeciętej liny wiadra, chwyta go i dalej krokNaprawy
  if (p.typ === 'naprawa') {
    const lp = linaPrzecieta(sim);
    const inny = sklejajacy(sim);
    if (!lp || (inny && inny !== c)) { c.polecenie = undefined; if (lp) sim.efekt(c.x, c.y, 'mysl', 'ktoś już ją skleja'); return false; }
    p.x = lp.x; p.y = lp.dno;
    const tam = (x: number, y: number) => x === lp.x && y === lp.dno && stoi(sim, x, y);
    if (Math.abs(c.x - (lp.x + 0.5)) < 0.6 && cy === lp.dno && zacznijNaprawe(sim, c)) { p.na = true; return true; }
    if (tam(cx, cy)) { naDroge([], lp.x, lp.dno); zamiar('staje pod zwisającą liną', Job.WANDER, 60); return true; }
    if (budzetDrog() <= 0) return brakCzasu();
    const d = droga(tam, POLECENIA.szukanieDrogi);
    if (d) { naDroge(d, lp.x, lp.dno); zamiar('idzie skleić przeciętą linę wiadra', Job.WANDER, podroz(d) + 60); p.prob = 0; return true; }
    return poddajSie('nie dojdę do liny — nie ma drogi');
  }

  // etap 3f: rycerz posłany do kuźni — zakłada części z wieszaka, potem rozkaz się kończy
  if (p.typ === 'zbroja') {
    const r = planZbroi(sim, c, p.pom, naDroge, zamiar, droga, podroz);
    if (r === 'zaklada' || r === 'idzie') { p.prob = 0; return true; }
    if (r === 'nic') { c.polecenie = undefined; return false; }
    return poddajSie('nie dojdę do kuźni — nie ma drogi');
  }

  // etap 3c: warsztat, kuźnia, sypialnia — idzie na swoje miejsce przy stole, kowadle albo na posłaniu i tam zostaje
  if (p.typ === 'praca' || p.typ === 'sen') {
    const pom = pomieszczenieId(sim, p.pom);
    if (!pom || !pom.gotowe) { c.polecenie = undefined; return false; }
    const [mx, my, kier] = miejsceWPom(pom, ktoryWPom(sim, pom, c));
    p.x = mx; p.y = my;
    const nazwa = NAZWA_POMIESZCZENIA[pom.rodzaj];
    if (Math.abs(cx - mx) <= 1 && cy === my && stoi(sim, cx, cy)) {
      p.na = true; p.prob = 0;
      c.jx = mx; c.jy = my; c.droga = undefined;
      c.czynnosc = p.typ === 'praca' ? 'buduje' : 'spi';
      // twarzą do stołu albo kowadła; śpiący — tak, żeby leżał na posłaniu
      c.face = kier;
      zamiar(p.typ === 'sen' ? 'śpi w sypialni — sen zdejmie osłabienia'
        : pom.brak ? `czeka: ${nazwa} — ${pom.brak}` : pom.rodzaj === 'warsztat' ? 'robi krzyże ze złota w warsztacie' : 'kuje zbroję dla rycerza w kuźni', Job.STOI, Z);
      return true;
    }
    const tam = (x: number, y: number) => Math.abs(x - mx) <= 1 && y === my && stoi(sim, x, y);
    if (budzetDrog() <= 0) return brakCzasu();
    const d = droga(tam, POLECENIA.szukanieDrogi);
    if (d) { naDroge(d, mx, my); zamiar(p.typ === 'sen' ? 'idzie spać do sypialni' : `idzie pracować: ${nazwa}`, Job.WANDER, podroz(d) + 60); p.prob = 0; return true; }
    return poddajSie('nie dojdę tam — nie ma drogi');
  }

  // etap 3c: plan pomieszczenia — wskazany kafel już wykuty: następny kafel planu (najbliższy odsłonięty)
  if (p.typ === 'kop' && p.pom !== undefined) {
    const pom = pomieszczenieId(sim, p.pom);
    if (!pom || pom.gotowe) { c.polecenie = undefined; return false; }
    if (!w.solid(p.x, p.y)) {
      const nast = kafleDoKucia(sim, c, pom, 1)[0];
      if (!nast) { c.polecenie = undefined; return false; }
      p.x = nast[0]; p.y = nast[1]; p.na = false; p.prob = 0;
    }
  }
  // „kop żyłę” (etap 3b): wskazany kafel rudy wykuty — bierze następny odsłonięty kafel tej samej rudy
  if (p.typ === 'kop' && p.zyla && !w.solid(p.x, p.y)) {
    const nast = nastepnyKafelZyly(sim, c, p);
    if (nast) { p.x = nast[0]; p.y = nast[1]; p.zylaIle = (p.zylaIle ?? 0) + 1; p.na = false; p.prob = 0; }
    else { p.zyla = undefined; sim.efekt(c.x, c.y, 'mysl', 'żyła wykuta'); }
  }
  // „kop tam”: lity kafel jeszcze stoi — stojąc obok, kuje go
  if (p.typ === 'kop' && w.solid(p.x, p.y)) {
    if (w.hardness(p.x, p.y) <= 0) { c.polecenie = undefined; odmow(sim, c, 'tej skały nie ruszę'); return false; }
    // plan pomieszczenia kuje się też nad głową (wnętrze ma 3 kafle wysokości)
    const plan = pomieszczenieId(sim, p.pom);
    const siega = (x: number, y: number, tx = p.x, ty = p.y) => plan ? siegaPlanu(x, y, tx, ty) : Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1;
    if (siega(cx, cy) && stoi(sim, cx, cy)) {
      c.jx = p.x; c.jy = p.y; c.dig = 0; c.droga = undefined;
      zamiar(plan ? `kuje plan: ${NAZWA_POMIESZCZENIA[plan.rodzaj]} — tak kazałeś`
        : p.zyla ? `kuje żyłę ${p.zyla === 'zelazo' ? 'żelaza' : 'złota'} — tak kazałeś` : 'kuje tam, gdzie kazałeś', Job.DIG, Z);
      return true;
    }
    const obok = (x: number, y: number) => siega(x, y) && stoi(sim, x, y);
    if (budzetDrog() <= 0) return brakCzasu();
    const d = droga(obok, POLECENIA.szukanieDrogi);
    if (d) { naDroge(d); zamiar(plan ? `idzie kuć plan: ${NAZWA_POMIESZCZENIA[plan.rodzaj]}` : 'idzie kuć tam, gdzie kazałeś', Job.WANDER, podroz(d)); p.prob = 0; return true; }
    // plan: do tego kafla nie dojdzie — może do innego kafla planu
    if (plan) {
      for (const [x, y] of kafleDoKucia(sim, c, plan, 4)) {
        if (x === p.x && y === p.y) continue;
        if (budzetDrog() <= 0) return brakCzasu();
        const d2 = droga((sx, sy) => siega(sx, sy, x, y) && stoi(sim, sx, sy), POLECENIA.szukanieDrogi);
        if (d2) { p.x = x; p.y = y; naDroge(d2); zamiar(`idzie kuć plan: ${NAZWA_POMIESZCZENIA[plan.rodzaj]}`, Job.WANDER, podroz(d2)); p.prob = 0; return true; }
      }
    }
    if (budzetDrog() <= 1) return brakCzasu();
    const dk = wkopDroga(sim, c, (x, y) => x === p.x && y === p.y, POLECENIA.szukanieKopania);
    if (dk) { zamiar('przekopuje się tam, gdzie kazałeś', Job.WANDER, przekop(dk)); p.prob = 0; return true; }
    return poddajSie('tam się nie dokopię');
  }

  // na miejscu (albo wykuł wskazany kafel) — trzyma posterunek, aż rozkaz odwołasz
  const naMiejscu = Math.abs(cx - p.x) <= 1 && Math.abs(cy - p.y) <= 1 && (p.typ === 'kop' || stoi(sim, cx, cy));
  if (naMiejscu || (p.na && Math.abs(cx - p.x) <= 2 && Math.abs(cy - p.y) <= 2)) {
    if (!p.na) { p.na = true; sim.efekt(c.x, c.y, 'mysl', 'na miejscu'); }
    p.prob = 0;
    c.jx = naMiejscu ? cx : p.x; c.jy = naMiejscu ? cy : p.y; c.droga = undefined;
    c.modliPrzyObozie = rola === 'pobozny' && sim.tick >= (c.bezModlitwyDo ?? 0);
    zamiar(rola === 'pobozny' ? 'modli się tam, gdzie kazałeś' : rola === 'rycerz' ? 'pilnuje miejsca, które wskazałeś' : 'czeka tam, gdzie kazałeś', Job.STOI, Z);
    return true;
  }
  // w drodze — drogą, a robotnik, gdy jej nie ma, przekopuje się
  const tam = (x: number, y: number) => Math.abs(x - p.x) <= 1 && Math.abs(y - p.y) <= 1 && stoi(sim, x, y);
  if (budzetDrog() <= 0) return brakCzasu();
  const d = droga(tam, POLECENIA.szukanieDrogi);
  if (d) { naDroge(d, p.x, p.y); zamiar('idzie tam, gdzie kazałeś', Job.WANDER, podroz(d) + 120); p.prob = 0; return true; }
  if (rola === 'robotnik') {
    if (budzetDrog() <= 1) return brakCzasu();
    const dk = wkopDroga(sim, c, tam, POLECENIA.szukanieKopania);
    if (dk) { zamiar('przekopuje się tam, gdzie kazałeś', Job.WANDER, przekop(dk)); p.prob = 0; return true; }
  }
  return poddajSie(rola === 'robotnik' ? 'tam się nie dokopię' : 'nie dojdę tam — nie ma drogi');
}

/** Etap 3d: odprawiający rytuał staje tuż przy ołtarzu, twarzą do krzyża, i klęczy (albo unosi księgę). */
function klecz(sim: Sim, c: Creature, r: RytualOltarza,
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): void {
  const o = sim.world.oltarz;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const strona = c.x < o.x + 0.5 ? -1 : 1;
  const mx = o.x + strona * 2;
  const opis = `odprawia rytuał przy ołtarzu: ${NAZWA_RYTUALU[r.rodzaj].toLowerCase()}`;
  if (Math.abs(cx - mx) <= 1 && cy === o.y && stoi(sim, cx, cy)) {
    c.jx = cx; c.jy = cy; c.droga = undefined;
    c.face = -strona;
    c.czynnosc = r.rodzaj === 'szal' || r.rodzaj === 'wskrzeszenie' ? 'czyta' : 'modli';
    zamiar(opis, Job.STOI, Math.max(30, Math.min(LUD.zamiarTikow, r.do - sim.tick + 1)));
    return;
  }
  const d = budzetDrog() > 0 ? droga((x, y) => Math.abs(x - mx) <= 1 && y === o.y && stoi(sim, x, y), 400) : null;
  if (d) { naDroge(d, mx, o.y); zamiar(opis, Job.WANDER, podroz(d)); return; }
  c.jx = cx; c.jy = cy; c.droga = undefined;
  c.czynnosc = 'modli';
  zamiar(opis, Job.STOI, 60);
}

/** Remake v1: stoi w swoim miejscu — pobożny modli się przy obozie, rycerz pilnuje, robotnik odpoczywa. */
/**
 * Remake v1: kto stoi na swoim miejscu bez podłogi pod nogami (na linie, przy ścianie), trzyma chwyt — inaczej
 * chwyt wygasał, zjeżdżał po linie, wspinał się z powrotem i tak w kółko („stał” przy obozie, przebywając
 * po kilkaset kafli na minutę).
 */
/** Ostatnia rana → [opis w kronice, znacznik statystyki] (głód zostaje „wycieńczeniem” — tak liczą testy). */
const PRZYCZYNA: Record<string, [string, string]> = {
  magma: ['w ogniu', 'magma'], woda: ['utonął', 'woda'], glod: ['z głodu', 'wycieńczenie'], starosc: ['ze starości', 'starość'],
  przysypany: ['przysypany skałą', 'przysypany'], upadek: ['od upadku', 'upadek'], grzybnia: ['poparzony grzybnią', 'grzybnia'],
};

function trzymajSieNaMiejscu(sim: Sim, c: Creature): void {
  // Remake v2: lud nie wisi na ścianie bez końca (bez lin i klamer) — bez podłogi zsunie się na dno
  if (ludRuch(c)) return;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (REMAKE && rolaPostaci(c) && !stoi(sim, cx, cy) && uchwyt(sim, cx, cy)) { c.wspina = sim.tick; c.vy = 0; }
}

function doStoi(sim: Sim, c: Creature): void {
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 1) { idz(sim, c, c.jx, c.jy, false); return; }
  trzymajSieNaMiejscu(sim, c);
  if (c.modliPrzyObozie && sim.tick >= (c.bezModlitwyDo ?? 0)) {
    sim.pray(c, T.AIR);
    c.devotion = Math.min(1, c.devotion + K.modlitwaOddanie * 0.5);
  }
}

// -------------------------------------------------------------------- ruch

/**
 * Idzie do celu wyznaczoną drogą, a gdy jej nie ma (albo się zgubił) — na przełaj,
 * po staremu. Zwraca true, gdy jest na miejscu.
 */
function idz(sim: Sim, c: Creature, tx: number, ty: number, mayDig = true): boolean {
  if (c.droga && c.drogaKopie) {
    if (krokKopiac(sim, c)) return false;
    c.droga = undefined; c.drogaKopie = false;
  }
  if (c.droga) {
    const nast = nastepnyKafel(sim, c);
    if (nast >= 0) { krok(sim, c, nast); return false; }
    c.droga = undefined;
  }
  // Remake v1: wisi bez podłogi (zsunął się z wyliczonej drogi) i do celu jeszcze daleko — liczy drogę od nowa,
  // zamiast iść na przełaj: na przełaj wspinał się po linie pod półkę, nie umiał zrobić kroku w bok, chwyt
  // wygasał i zjeżdżał — w górę i w dół w kółko, „stojąc” przy obozie. Gdy drogi naprawdę nie ma — porzuca zamiar.
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (REMAKE && rolaPostaci(c) && (Math.abs(tx - cx) > 1 || Math.abs(ty - cy) > 1) && !stoi(sim, cx, cy)) {
    // Alpha: zgubił drogę, wisząc w szybie (bez lin) — przez chwilę trzyma się ściany i od razu szuka nowej, zamiast
    // zjechać na samo dno: robotnik idący po jedzenie zsuwał się tak na dno jaskini, skąd nie było już powrotu
    const sciana = ludRuch(c) && (w.solid(cx - 1, cy) || w.solid(cx + 1, cy));
    const trzyma = sciana && sim.tick - (c.chwytOd ??= sim.tick) < K.chwytZgubionaDroga;
    if (trzyma) { c.wspina = sim.tick; c.vy = 0; }
    if ((trzyma ? (sim.tick + c.id) % 5 === 0 : (sim.tick + c.id) % 30 === 0) && budzetDrog() > 0) {
      const d = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1, 4000);
      if (!d && !trzyma) { c.jt = 0; c.droga = undefined; return false; }
      if (d && d.length) {
        c.chwytOd = undefined;
        c.droga = d; c.drogaI = 0; c.drogaKopie = false;
        const nast = nastepnyKafel(sim, c);
        if (nast >= 0) { krok(sim, c, nast); return false; }
        c.droga = undefined;
      }
    }
    if (trzyma) return false;
  } else c.chwytOd = undefined;
  return walkTo(sim, c, tx, ty, mayDig);
}

/** Jeden krok do sąsiedniego kafla drogi: w bok, w górę po ścianie albo w dół. */
function krok(sim: Sim, c: Creature, cel: number): void {
  const w = sim.world;
  const d = RACES[c.race];
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const nx = cel % w.w, ny = (cel / w.w) | 0;
  const speed = d.speed * mnoznik(sim, c, 'szybkosc')
    * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1)
    * (w.tile[w.idx(cx, cy)] === T.WEB && c.race !== Race.SPINNER ? K.siecSpowalnia : 1);
  const doSrodka = (v: number) => Math.max(-speed, Math.min(speed, nx + 0.5 - v));
  if (ny < cy) {
    // Remake v2: lud wchodzi w górę tylko z podłogi, na stopień — z wiszenia już nie (to straż na nieaktualną drogę)
    if (ludRuch(c) && !stoi(sim, cx, cy)) { c.droga = undefined; return; }
    c.wspina = sim.tick;
    c.x += doSrodka(c.x);
    c.y -= speed * K.wspinanie;
  } else if (ny > cy) {
    c.wspina = sim.tick;                        // schodzi, trzymając się ściany
    c.x += doSrodka(c.x);
    c.y += speed * K.schodzenie;
  } else {
    const dir = nx > cx ? 1 : -1;
    c.face = dir;
    // z wiszenia na półkę — nie puszcza się, dopóki nie stanie
    if (!w.solid(cx, cy + 1) && w.solid(nx, cy + 1)) c.wspina = sim.tick;
    // Alpha: krok nad dziurę trzyma się krawędzi (szukanie drogi pozwala z wiszenia przejść na półkę za nią) —
    // inaczej pobożny wpadał w jednokaflową dziurę obok złotej kreski i zostawał w niej na zawsze
    if (ludRuch(c) && !w.solid(nx, cy + 1)) c.wspina = sim.tick;
    c.x += dir * speed;
  }
}

/**
 * Remake v2: krok drogą przez skałę (`c.drogaKopie`, z `szukajKopiac`): lity kafel na drodze kuje, stojąc na
 * podłodze (kafel pod sobą też — wtedy zsuwa się w wykuty szyb). Przed wejściem na stopień kuje oba kafle:
 * nad głową i ten na półce przed sobą — wisząc, już nie kuje. Zwraca false, gdy doszedł albo droga przestała
 * pasować (zsunął się z niej, coś nie do ruszenia).
 */
function krokKopiac(sim: Sim, c: Creature): boolean {
  const d = c.droga!;
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const cur = w.idx(cx, cy);
  let i = c.drogaI ?? 0;
  const dalej = d.indexOf(cur, i);
  if (dalej >= 0) i = dalej + 1;
  c.drogaI = i;
  if (i >= d.length) return false;
  const next = d[i];
  const nx = next % w.w, ny = (next / w.w) | 0;
  if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) return false;
  const naPodlodze = stoi(sim, cx, cy);
  const kuj = (x: number, y: number): boolean => {
    if (!naPodlodze) return true;                  // w locie nie kuje — najpierw stanie
    if (w.hardness(x, y) <= 0) return false;       // nie do ruszenia — droga do wyrzucenia
    digTile(sim, c, x, y);
    return true;
  };
  if (w.solid(nx, ny)) return kuj(nx, ny);
  if (ny < cy) {
    // wejście na stopień: najpierw wolna półka przed sobą (kafel za stopniem)
    const n2 = d[i + 1];
    if (n2 !== undefined && w.solid(n2 % w.w, (n2 / w.w) | 0)) return kuj(n2 % w.w, (n2 / w.w) | 0);
  }
  krok(sim, c, next);
  return true;
}

/**
 * Remake v2: lud na przełaj (bez wyliczonej drogi). Po podłodze idzie, na stopień (jeden kafel) wchodzi,
 * z niewysokiej półki zeskakuje, szybem się zsuwa — po ścianach się nie wspina. Cel wyżej niż o stopień:
 * gdy wolno mu kopać, kuje schody po skosie (kafel nad głową, potem stopień przed sobą — kafel pod stopniem
 * zostaje) i trzyma ich kierunek, aż wejdzie na wysokość celu — schody nie zawracają. Gdzie w bok jest za
 * mało miejsca, prowadzi go droga z kopaniem (`szukajKopiac`), nie ten krok na przełaj. True — na miejscu.
 */
function walkToLud(sim: Sim, c: Creature, tx: number, ty: number, mayDig: boolean): boolean {
  const w = sim.world;
  const d = RACES[c.race];
  const dx = tx + 0.5 - c.x, dy = ty + 0.5 - c.y;
  if (Math.abs(dx) < K.naMiejscuX && Math.abs(dy) < K.naMiejscuY) { c.schody = undefined; return true; }
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const ogien = (x: number, y: number) => {
    for (let yy = y + 1; yy <= y + K.nadOgniemPatrzy && w.inb(x, yy); yy++) {
      if (w.magma[w.idx(x, yy)] > 0) return true;
      if (!w.passable(x, yy)) return false;
    }
    return false;
  };
  const free = (x: number, y: number) => w.passable(x, y) && w.water[w.idx(x, y)] <= K.toniePowyzej
    && w.magma[w.idx(x, y)] === 0 && !ogien(x, y);
  const speed = d.speed * mnoznik(sim, c, 'szybkosc') * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1);
  const kopie = mayDig && d.digPower > 0;
  const daSieKuc = (x: number, y: number) => w.inb(x, y) && w.solid(x, y) && w.hardness(x, y) > 0 && w.get(x, y) !== T.CORE;
  const wisi = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow;
  const kier = Math.abs(dx) < 0.5 ? c.face : Math.sign(dx);

  if (!stoi(sim, cx, cy)) {
    // w powietrzu albo przy ścianie: dokańcza wejście na stopień — półka tuż obok, na tej wysokości
    for (const k of [kier, -kier]) {
      if (wisi && free(cx + k, cy) && stoi(sim, cx + k, cy)) { c.wspina = sim.tick; c.face = k; c.x += k * speed; return false; }
    }
    // spada albo zsuwa się; w locie odrobinę skręca ku celowi
    if (Math.abs(dx) > 0.6 && free(cx + Math.sign(dx), cy)) c.x += Math.sign(dx) * speed * 0.5;
    return false;
  }

  // cel w dole, prawie pod nogami: kuje podłogę (nie nad przepaścią ani nad ogniem) i zsuwa się w szyb
  if (dy > 1.2 && Math.abs(dx) < 1 && kopie && daSieKuc(cx, cy + 1) && !ogien(cx, cy + 1)
      && glebiaPod(sim, cx, cy + 1, LUD.spadekMaks) <= LUD.spadekMaks) {
    digTile(sim, c, cx, cy + 1);
    return false;
  }

  // cel wyżej niż stopień: schody po skosie w stronę celu, kierunek trzymany do końca (zawracając,
  // wybiłby sobie stopień spod nóg — w dwóch wymiarach schody nie zawracają)
  let dir = kier;
  if (dy < -1.5 && kopie) {
    if (c.schody === undefined) c.schody = Math.sign(dx) || c.face;
    dir = c.schody;
  } else c.schody = undefined;
  c.face = dir;
  const nx = cx + dir;
  const wGore = dy < -1.5 && kopie;

  // krok w bok: wolne i nie przepaść (na schodach — tylko gdy dalej jest na czym stanąć)
  if (free(nx, cy) && !przepasc(sim, nx, cy)) {
    c.x += dir * speed;
    return false;
  }
  // stopień o jeden kafel: przed nim ściana, nad nią wolne, nad głową wolne — podciąga się i wchodzi
  if (w.solid(nx, cy) && free(nx, cy - 1) && free(cx, cy - 1)) {
    c.wspina = sim.tick;
    c.y -= speed * K.stopien;
    return false;
  }
  if (kopie && w.solid(nx, cy)) {
    if (wGore) {
      // schody: najpierw kafel nad głową, potem stopień przed sobą; kafel pod stopniem zostaje
      if (daSieKuc(cx, cy - 1)) { digTile(sim, c, cx, cy - 1); return false; }
      if (daSieKuc(nx, cy - 1)) { digTile(sim, c, nx, cy - 1); return false; }
    } else if (daSieKuc(nx, cy)) { digTile(sim, c, nx, cy); return false; }
  }
  // cel niżej, a przed nim przepaść albo skała nie do ruszenia — kuje w dół tu, gdzie stoi
  if (dy > 1.2 && kopie && daSieKuc(cx, cy + 1) && !ogien(cx, cy + 1) && glebiaPod(sim, cx, cy + 1, LUD.spadekMaks) <= LUD.spadekMaks) {
    digTile(sim, c, cx, cy + 1);
    return false;
  }
  // tędy nie przejdzie — obejście drugą stroną
  const alt = cx - dir;
  if (!wGore && free(alt, cy) && !przepasc(sim, alt, cy)) { c.x -= dir * speed * K.obejscie; c.face = -dir; return false; }
  return false;
}

/** Idzie w stronę celu; jak trzeba, wygryza sobie drogę. Tunel to ślad ich potrzeb. */
function walkTo(sim: Sim, c: Creature, tx: number, ty: number, mayDig = true): boolean {
  if (ludRuch(c)) return walkToLud(sim, c, tx, ty, mayDig);
  const w = sim.world;
  const d = RACES[c.race];
  // do środka kafla, nie do jego lewej krawędzi: stworzenie stojące na granicy
  // dwóch kafli dreptało w miejscu, bo cel był raz z lewej, raz z prawej
  const dx = tx + 0.5 - c.x, dy = ty + 0.5 - c.y;
  if (Math.abs(dx) < K.naMiejscuX && Math.abs(dy) < K.naMiejscuY) return true;

  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const deepWater = (x: number, y: number) => !d.swims && w.inb(x, y) && w.water[w.idx(x, y)] > K.toniePowyzej;
  // w magmę nikt nie wchodzi z własnej woli — wcześniej była dla nich zwykłym korytarzem,
  // a Żużlowcy, którzy chodzą do ognia po ciepło, ginęli w nim całymi klanami
  // i nie staje nad nią: krok nad jezioro magmy kończył się upadkiem prosto w ogień
  const nadOgniem = (x: number, y: number) => {
    for (let yy = y + 1; yy <= y + K.nadOgniemPatrzy && w.inb(x, yy); yy++) {
      if (w.magma[w.idx(x, yy)] > 0) return true;
      if (!w.passable(x, yy)) return false;
    }
    return false;
  };
  // Remake v1: lud nie wchodzi w przepaść (patrz droga.ts) — chyba że już w niej wisi albo spada
  const ostrozny = REMAKE && rolaPostaci(c) !== null && c.job !== Job.DESCEND;
  const free = (x: number, y: number) => w.passable(x, y) && !deepWater(x, y) && w.magma[w.idx(x, y)] === 0
    && !nadOgniem(x, y);
  const speed = d.speed * mnoznik(sim, c, 'szybkosc')
    * (w.water[w.idx(cx, cy)] > K.wodaSpowalniaOd ? K.wodaSpowalnia : 1)
    * (w.tile[w.idx(cx, cy)] === T.WEB && c.race !== Race.SPINNER ? K.siecSpowalnia : 1);

  // ściana pod ręką: przy niej da się wisieć i podciągać
  const sciana = (x: number, y: number) => w.solid(x - 1, y) || w.solid(x + 1, y);
  const kopie = mayDig && d.digPower > 0;
  const wisi = (c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow;

  // pion: cel wyraźnie wyżej albo niżej i nic nie stoi na drodze w poziomie
  // (także cel tuż nad głową — wcześniej między 1,2 a 2,5 kafla w pionie była martwa strefa:
  // stworzenie stało pod rudą i dreptało w bok, bo ani nie sięgało, ani nie próbowało wejść)
  if ((Math.abs(dy) > 2.5 && Math.abs(dx) < 3) || (Math.abs(dy) > 1.2 && Math.abs(dx) < 1)) {
    const ny = cy + Math.sign(dy);
    if (dy > 0 && free(cx, ny) && !(ostrozny && !sciana(cx, cy) && !sciana(cx, ny) && przepasc(sim, cx, ny))) {
      // przy ścianie schodzą, trzymając się jej — swobodny lot z szybu, który sami
      // wykopali, łamał im kości i po kilku zejściach zabijał
      if (sciana(cx, cy) || sciana(cx, ny)) c.wspina = sim.tick;
      c.y += speed * K.schodzenieNaPrzelaj;
      return false;
    }
    // w górę tylko po ścianie — w otwartej pustce nie ma się czego chwycić
    if (dy < 0 && free(cx, ny) && sciana(cx, ny)) { c.wspina = sim.tick; c.y -= speed * K.wspinanieNaPrzelaj; return false; }
    if (kopie && w.solid(cx, ny)) { digTile(sim, c, cx, ny); return false; }
  }

  // Cel prawie dokładnie nad albo pod głową, a pion się nie udał: idzie w tę stronę,
  // w którą patrzy, aż znajdzie ścianę albo stopień. Znak z dx przeskakiwał wtedy co tik
  // i stworzenie dreptało w miejscu (a wisząc na krawędzi — wisiało w powietrzu bez końca).
  const dir = Math.abs(dx) < 0.5 ? c.face : Math.sign(dx);
  c.face = dir;
  const nx = cx + dir;
  if (free(nx, cy) && !(ostrozny && przepasc(sim, nx, cy))) {
    // kto wisi na krawędzi, przechodzi na półkę, nie puszczając się — ale tylko na półkę:
    // bez podłogi pod celem to już nie przejście, tylko wiszenie w powietrzu
    if (wisi && w.solid(nx, cy + 1) && !w.solid(cx, cy + 1)) c.wspina = sim.tick;
    c.x += dir * speed;
    return false;
  }
  // Stopień: najpierw podciągnięcie do góry, potem krok na półkę. Wcześniej stworzenie
  // unosiło się o pół kafla, zanim zdążyło się przesunąć, i spadało z powrotem —
  // na stopień wchodził tylko ten, kto przypadkiem stał przy samej krawędzi kafla.
  if (free(nx, cy - 1) && free(cx, cy - 1)) {
    c.wspina = sim.tick;
    c.y -= speed * K.stopien;
    return false;
  }
  if (kopie && w.solid(nx, cy)) {
    // cel wyżej: kują schody po skosie, a nie poziomy tunel pod nim
    if (dy < -1.5) {
      if (w.solid(cx, cy - 1) && w.hardness(cx, cy - 1) > 0) { digTile(sim, c, cx, cy - 1); return false; }
      if (w.solid(nx, cy - 1) && w.hardness(nx, cy - 1) > 0) { digTile(sim, c, nx, cy - 1); return false; }
    }
    digTile(sim, c, nx, cy);
    return false;
  }

  // droga zablokowana wodą albo skałą, której nie ugryzie — obejściem jest inna strona
  const alt = cx - dir;
  if (free(alt, cy)) { c.x -= dir * speed * K.obejscie; c.face = -dir; return false; }
  if (kopie && w.solid(cx, cy - 1)) { digTile(sim, c, cx, cy - 1); return false; }
  return false;
}

/** Gryzie kafel. Skała ustępuje powoli, ziemia od razu — i wtedy strop może nie wytrzymać. */
function digTile(sim: Sim, c: Creature, x: number, y: number): void {
  const w = sim.world;
  const t = w.get(x, y);
  const hard = w.hardness(x, y);
  if (hard <= 0) return;
  // Nikt przy zdrowych zmysłach nie przebija ściany, za którą płynie ogień: losowe
  // drążenie otwierało kieszenie magmy i wypalało całe plemiona w kilka sekund.
  // Szaleni i ci, którym szepnąłeś „kop w dół", kopią dalej.
  // Trol jest szalony z natury, ale ognia i tak się boi — inaczej żaden nie dożywał drugiej minuty.
  // Tak samo z dziurą w podłodze nad jeziorem ognia: po wykopaniu kafla spadało się
  // szybem prosto w magmę i całe gniazdo ginęło po kolei w jednym miejscu.
  // Remake v1: lud nie przebija się do ognia nawet w obłędzie — pięciu robotników wracających do siedziby
  // wykopało kafel pod kieszenią magmy i ogień zalał cały szyb
  if (t !== T.CORE && (c.mad < K.kopanieOgienSzalenstwo || c.race === Race.TROLL || (REMAKE && rolaPostaci(c))) && c.job !== Job.DESCEND
      && (sim.przyMagmie(x, y, K.kopanieOgienZasieg) || nadOgniem(sim, x, y))) {
    c.dig = 0; c.jt = 0; return;
  }
  // Alpha (jedno wiadro): podłogi pod drogą wiernych nikt z ludu nie kuje — rycerz, idąc na przełaj, wykuł złoto
  // spod stopnia, droga się urwała i cała drużyna umarła z głodu w krypcie, z dala od wiadra
  if (REMAKE && rolaPostaci(c) && podDroga(sim, w.idx(x, y))) { c.dig = 0; c.jt = 0; c.droga = undefined; return; }
  const sila = RACES[c.race].digPower * mnoznik(sim, c, 'kopanie') * cechaNacji(sim.clans[c.clan]).kopanie * (1 + c.mad * K.kopanieOdSzalenstwa);
  // Alpha, etap 3: w górze z warstwami lud kuje wolniej — zejście ma trwać (SWIAT.warstwy.kucie); postęp zostaje
  // w kaflu (w.kucie), nie w kopaczu: rozkaz „kop drogę” odświeżał się co pół sekundy i zerował go, więc przy
  // wolniejszym kuciu robotnicy godzinami kuli ten sam kafel
  const tempo = SWIAT.warstwy.wlaczone && rolaPostaci(c) && t !== T.CORE ? SWIAT.warstwy.kucie : 1;
  const i = w.idx(x, y);
  const postep = (w.kucie.get(i) ?? 0) + sila / (hard * K.kopanieProg * tempo);
  if (postep < 1) { w.kucie.set(i, postep); return; }
  w.kucie.delete(i);
  // Remake v1: bez rudy i kryształów jako łupu — kopie się drogę, nie skarby
  if (t === T.CORE) { sim.reachCore(c); return; }
  w.set(x, y, T.AIR);
  sim.dug++;
  // Alpha, etap 3b: ruda wykuta przez lud od razu podbija licznik żelaza albo złota (bez noszenia)
  if (rolaPostaci(c)) wykutyKafel(sim, t, x, y);
  if (DZIENNIK.wlaczony) zapisz(sim, 'blok', `blok (${x}, ${y}) zniszczony: ${NAZWY_KAFLI[t] ?? t} → pustka — kopał ${kto(sim, c)}`, x, y);
}

// ------------------------------------------------------------------ zajęcia

function doWander(sim: Sim, c: Creature): void {
  // Remake v1: lud nie kopie na spacerze — chyba że zbłąkany wraca w stronę siedziby
  // (wyliczoną drogą — na przełaj „wracający do siedziby” wspinał się w ślepy szyb, zsuwał i tak w kółko, aż padł z głodu)
  // (głodny przerywa długi spacer — planer najpierw szuka jedzenia; robotnik „odchodzący spod rdzenia” doszedł
  // aż do siedziby i padł tam z głodu, wciąż w tym samym zamiarze)
  if (REMAKE && rolaPostaci(c) && c.carry === 0 && c.hunger > LUD.glodSam && (sim.tick + c.id) % 60 === 0) { c.jt = 0; return; }
  // (na przełaj kuje tylko ten, kto się przekopuje — z rozkazu albo z odciętej kieszeni)
  if (REMAKE && rolaPostaci(c)) { idz(sim, c, c.jx, c.jy, !!c.zamiar?.startsWith('wkopuje') || !!c.zamiar?.startsWith('przekopuje')); return; }
  walkTo(sim, c, c.jx, c.jy, sim.rng.chance(K.spacerKopie));
}

/** Remake v1: miejsce pobożnego w szeregu pod rdzeniem — co dwa kafle, żeby nie stali jeden na drugim. */
export function miejsceWSzeregu(sim: Sim, c: Creature): number {
  return sim.world.coreX + ((c.id % 5) - 2) * 2;
}

/**
 * Remake v1: droga do rdzenia wciąż się kopie, a pielgrzym nie jest jeszcze blisko przedsionka.
 * Wtedy czeka przy obozie frontowym — wcześniej szedł niegotową drogą i stał przy czole między robotnikami.
 */
function drogaNiegotowa(sim: Sim, c: Creature): boolean {
  if (czoloDrogi(sim) < 0) return false;
  const w = sim.world;
  return Math.hypot(c.x - w.coreX, c.y - w.przedsionekY) > LUD.strefaRdzenia;
}

/** Remake v1: czy któryś pobożny jest w drodze pod rdzeń albo czeka na nią (wtedy rycerze idą z nimi). */
function wyprawaTrwa(sim: Sim): boolean {
  for (const o of sim.creatures) if (!o.dead && (o.wyprawa || o.job === Job.PIELGRZYM)) return true;
  return false;
}

/** Remake v1: czy ktoś z ludu modli się już pod rdzeniem (wtedy rycerze stają na warcie). */
function wartaPotrzebna(sim: Sim): boolean {
  const w = sim.world;
  for (const o of sim.creatures) {
    if (o.dead || o.job !== Job.PIELGRZYM) continue;
    if (Math.abs(o.x - w.coreX) < P.przedsionekX + 4 && Math.abs(o.y - w.przedsionekY) < P.przedsionekY + 4) return true;
  }
  return false;
}

/** Remake v1: najbliższy głodny pobożny albo rycerz, któremu nikt jeszcze nie niesie jedzenia. */
function glodnyDoNakarmienia(sim: Sim, c: Creature): Creature | null {
  const obslugiwani = new Set<number>();
  for (const o of sim.creatures) if (!o.dead && o.id !== c.id && o.dostawaDla !== undefined) obslugiwani.add(o.dostawaDla);
  let best: Creature | null = null, bd = Infinity;
  for (const o of sim.creatures) {
    // stacjonujący — i kopacze drogi daleko od spiżarni (wracając po jedzenie, umierali po drodze)
    const kopaczDaleko = !!o.kopieDroge && (najblizszaSpizarnia(sim, o.x, o.y, false) ? Math.hypot(najblizszaSpizarnia(sim, o.x, o.y, false)!.x - o.x, najblizszaSpizarnia(sim, o.x, o.y, false)!.y - o.y) > LUD.daleko : false);
    if (o.dead || o.clan !== c.clan || !(stacjonuje(o) || kopaczDaleko) || obslugiwani.has(o.id)) continue;
    // daleko od jedzenia dostawa rusza wcześniej — droga w obie strony trwa
    const spO = najblizszaSpizarnia(sim, o.x, o.y, true);
    const prog = !spO || Math.hypot(spO.x - o.x, spO.y - o.y) > LUD.daleko ? LUD.glodDostawyDaleko : LUD.glodDostawy;
    if (o.hunger < prog) continue;
    const d = Math.hypot(o.x - c.x, o.y - c.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

/** Remake v1: czy ktoś stacjonujący bardzo głoduje, a nikt mu nie niesie jedzenia (wtedy kopacz drogi przerywa). */
function pilnieGlodny(sim: Sim, c: Creature): boolean {
  const g = glodnyDoNakarmienia(sim, c);
  return !!g && g.hunger > LUD.glodPilny;
}

/** Remake v1: robotnik niesie jedzenie głodnemu — idzie za nim, karmi z ręki, resztę odnosi. */
function doDostawa(sim: Sim, c: Creature): void {
  const komu = c.dostawaDla !== undefined ? sim.creatureById(c.dostawaDla) : null;
  if (!komu || komu.dead || c.carry <= 0) { c.jt = 0; return; }
  if (Math.hypot(komu.x - c.x, komu.y - c.y) < 1.8) {
    while (c.carry > 0 && komu.hunger > 0.1) {
      c.carry--; sim.meals++;
      komu.hunger = Math.max(0, komu.hunger - LUD.posilek);
    }
    komu.hp = Math.min(maxHp(sim, komu), komu.hp + K.kesLeczy * leczenieZabytkow(sim));
    sim.spark(komu.x, komu.y - 0.5, 'spore');
    c.dostawaDla = undefined;
    c.jt = 0;
    return;
  }
  // głodny się przesunął — droga od nowa
  if (Math.abs(c.jx - Math.floor(komu.x)) > 3 || Math.abs(c.jy - Math.floor(komu.y)) > 3) {
    c.jx = Math.floor(komu.x); c.jy = Math.floor(komu.y); c.droga = undefined;
    const droga = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - c.jx) <= 1 && Math.abs(y - c.jy) <= 1, LUD.dostawaLimit);
    if (droga) { c.droga = droga; c.drogaI = 0; c.drogaKopie = false; }
  }
  idz(sim, c, c.jx, c.jy);
}

/** Remake v2: skrajnie głodny biegnie pod linę zjeżdżającego wiadra; na miejscu chwyta ją (dalej krokNaLinie). */
function doLina(sim: Sim, c: Creature): void {
  const wd = wiadroId(sim, c.linaDo);
  // wiadra nie ma, puste albo już stoi na ziemi — planer zaprowadzi go do niego zwyczajnie
  if (!wd || wd.porcje <= 0 || wd.faza === 'odjezdza' || wd.faza === 'stoi') { c.linaDo = undefined; c.jt = 0; return; }
  if (Math.abs(c.x - (wd.x + 0.5)) < 0.9 && Math.abs(Math.floor(c.y) - wd.cel) <= 1) {
    c.naLinie = wd.id; c.linaDo = undefined;
    c.zamiar = 'umiera z głodu — chwyta linę i wspina się do wiadra'; c.zamiarDo = sim.tick + 240;
    return;
  }
  idz(sim, c, wd.x, wd.cel);
}

/** Remake v1: warta — idzie na posterunek i stoi; nie wchodzi między modlących się. */
function doWarta(sim: Sim, c: Creature): void {
  if (!wartaPotrzebna(sim)) { c.jt = 0; return; }
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 4) idz(sim, c, c.jx, c.jy, false);
  else trzymajSieNaMiejscu(sim, c);
}

function doDig(sim: Sim, c: Creature): void {
  const w = sim.world;
  if (w.get(c.jx, c.jy) === T.AIR || !w.inb(c.jx, c.jy)) {
    // Remake v1: droga do rdzenia (Alpha: na rozkaz) — następny kafel czoła, póki trwa zamiar (głodny bez dostawy ma pierwszeństwo)
    if (c.kopieDroge && (sim.tick + c.id) % 240 === 0 && pilnieGlodny(sim, c)) { c.jt = 0; return; }
    if (c.kopieDroge && sim.tick < (c.zamiarDo ?? 0)) {
      const cz = czoloDrogi(sim);
      // Alpha: następny kafel kreski w zasięgu ręki (najpierw czoło); dalej — planer wyznaczy prawdziwą drogę
      // (na przełaj do czoła schodził z półek w przepaść i zostawał pod nim na zawsze)
      const cx = Math.floor(c.x), cy = Math.floor(c.y);
      const wZasiegu = (i: number) => Math.abs((i % w.w) - cx) <= 1 && Math.abs(((i / w.w) | 0) - cy) <= 1;
      const nast = !REMAKE ? cz : [cz, ...nieWykopane(sim)].find((i) => i >= 0 && wZasiegu(i)) ?? -1;
      if (nast >= 0) { c.jx = nast % w.w; c.jy = (nast / w.w) | 0; c.dig = 0; c.droga = undefined; return; }
    }
    c.jt = 0;
    return;
  }
  // zasięg po kaflach — sąsiedni kafel, także po skosie (Alpha, etap 3c: kując plan pomieszczenia — też nad głową)
  const near = c.polecenie?.typ === 'kop' && c.polecenie.pom !== undefined
    ? siegaPlanu(Math.floor(c.x), Math.floor(c.y), c.jx, c.jy)
    : Math.abs(c.jx - Math.floor(c.x)) <= 1 && Math.abs(c.jy - Math.floor(c.y)) <= 1;
  // Remake v2: kuje tylko stojąc — wisząc na ścianie (bez lin i klamer) zsuwa się, więc najpierw staje
  if (near && (!ludRuch(c) || stoi(sim, Math.floor(c.x), Math.floor(c.y)))) digTile(sim, c, c.jx, c.jy);
  else idz(sim, c, c.jx, c.jy);
}

/** Remake v2: robotnik bierze porcje z wiadra dla głodnego (potem niesie mu je — DOSTAWA). */
function doZbiera(sim: Sim, c: Creature): void {
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 1) { idz(sim, c, c.jx, c.jy); return; }
  const sp = c.dostawaDla !== undefined ? spizarniaW(sim, c.jx, c.jy) : null;
  // (Alpha, jedno wiadro: najpierw sam się najada — z jedzeniem pod rdzeń i z powrotem idzie się kilkaset kafli,
  // a kurier, który ruszył w drogę głodny, padał kilka kafli przed wiadrem)
  if (sp && c.hunger > LUD.kurierNajadaOd) {
    for (let n = 0; n < 4 && c.hunger > WIADRO.najadaDo && sp.wez(1) > 0; n++) {
      sim.meals++;
      c.hunger = Math.max(0, c.hunger - LUD.posilek);
    }
    sim.spark(c.x, c.y - 0.5, 'spore');
  }
  if (sp) c.carry += sp.wez(LUD.przenoszenie);
  // niesie głodnemu: przy następnym wyborze zajęcia carry > 0 → DOSTAWA
  c.carryT = 0;
  c.jt = 0;
}

/** Etap 3e: wzięty kielich — rany goją się szybciej (posiłek, dostawa, odpoczynek najedzonego). */
function leczenieZabytkow(sim: Sim): number {
  return maZabytek(sim, 'kielich') ? ZABYTKI.skutki.kielich.leczenie : 1;
}

/** Posiłek z wiadra (Remake v2; dawniej ze spiżarni). */
function doZapas(sim: Sim, c: Creature): void {
  // sięga do wiadra z dwóch kafli — stojące na półce tuż nad głową było „osiągalne”
  // dla szukania drogi, ale nie dla nóg, i głodni stali pod nim, aż padli
  if (Math.abs(c.jx - Math.floor(c.x)) > 2 || Math.abs(c.jy - Math.floor(c.y)) > 2) {
    if (c.jt <= 1) c.bezSpizarniDo = sim.tick + LUD.spizarniaPrzerwa;   // nie doszedł — na chwilę odpuszcza to wiadro
    idz(sim, c, c.jx, c.jy);
    return;
  }
  const sp = spizarniaW(sim, c.jx, c.jy);
  // Alpha, etap 3: je do syta (porcja za porcją) — po jednej porcji kopacz wracał na czoło drogi, schodził niżej,
  // a do tego wiadra już nie miał jak wrócić
  for (let n = 0; sp && n < 4 && (n === 0 || c.hunger > WIADRO.najadaDo) && sp.wez(1) > 0; n++) {
    sim.meals++;
    c.hunger = Math.max(0, c.hunger - LUD.posilek);
    c.hp = Math.min(maxHp(sim, c), c.hp + K.kesLeczy * leczenieZabytkow(sim));
  }
  c.jt = 0;
}

function doEat(sim: Sim, c: Creature): void {
  const w = sim.world;
  const t = w.get(c.jx, c.jy);
  if (!edible(c.race, t)) { c.jt = 0; return; }
  // po kaflach, nie po współrzędnych: jx to lewa krawędź kafla, więc kęs po lewej
  // był „dalej” niż ten sam kęs po prawej, a ten nad głową bywał poza zasięgiem na zawsze
  if (Math.abs(c.jx - Math.floor(c.x)) <= 1 && Math.abs(c.jy - Math.floor(c.y)) <= 1) {
    w.set(c.jx, c.jy, T.AIR);
    sim.meals++;
    c.hunger = Math.max(0, c.hunger - (t === T.BONES ? K.kesKosci : K.kesGrzyba));
    c.hp = Math.min(maxHp(sim, c), c.hp + K.kesLeczy * leczenieZabytkow(sim));
    c.jt = 0;
  } else idz(sim, c, c.jx, c.jy);
}

/**
 * Krok pielgrzyma po planie drogi (plan idzie od przedsionka do gniazda, więc pielgrzym
 * idzie nim od końca). Skałę na drodze kuje. Zwraca false, gdy plan mu nie pomoże —
 * jest za daleko od kreski albo kreska prowadzi przez coś nie do ruszenia.
 */
function idzPlanem(sim: Sim, c: Creature, sciezka: number[]): boolean {
  const w = sim.world;
  const tx = Math.floor(c.x), ty = Math.floor(c.y);
  const k = sciezka.lastIndexOf(w.idx(tx, ty));
  if (k < 0) {
    // zszedł z kreski (spadł, ominął wodę) — wraca do najbliższego jej kafla, jeśli jest blisko
    let best = -1, bd = P.planZasieg + 1;
    for (let j = 0; j < sciezka.length; j++) {
      const i = sciezka[j];
      const d = Math.abs((i % w.w) - tx) + Math.abs(((i / w.w) | 0) - ty);
      if (d < bd) { bd = d; best = j; }
    }
    if (best < 0) return false;
    const bx = sciezka[best] % w.w, by = (sciezka[best] / w.w) | 0;
    // kreska tuż obok, ale to jeszcze lita skała — przekuwa się do niej; wcześniej szedł
    // „do niej” krokiem, stał pod ścianą, aż zakleszczenie zabierało mu wyprawę
    if (bd <= 1 && w.solid(bx, by)) {
      if (w.hardness(bx, by) <= 0) return false;
      // Alpha: pobożny nie kuje — czeka, aż robotnicy wykują kreskę
      if (REMAKE) return true;
      digTile(sim, c, bx, by);
      return true;
    }
    // tuż obok i wolna — wchodzi na nią wprost, po stopniach (walkTo wymagał ściany pod ręką)
    if (bd <= 1) { krok(sim, c, sciezka[best]); return true; }
    // po skosie (np. z wody albo z półki obok początku kreski) — też krokiem; prosto do niej
    // stał w miejscu na granicy kafli i cała warta czekała przy siedzibie
    if (bd === 2 && Math.abs(bx - tx) === 1 && Math.abs(by - ty) === 1 && !w.solid(bx, by)) { krok(sim, c, sciezka[best]); return true; }
    // Remake v1: dalej niż o krok — prawdziwą drogą (doPielgrzym), nie na przełaj
    if (REMAKE) return false;
    walkTo(sim, c, bx, by);
    return true;
  }
  if (k === 0) return false;
  const nast = sciezka[k - 1];
  const nx = nast % w.w, ny = (nast / w.w) | 0;
  if (w.solid(nx, ny)) {
    if (w.hardness(nx, ny) <= 0) return false;
    // Remake v1: drogę kopią robotnicy (albo, gdy nikt nie kopie, powoli góra) — pobożny czeka na czole
    if (REMAKE) return true;
    digTile(sim, c, nx, ny);
    return true;
  }
  krok(sim, c, nast);
  return true;
}

/**
 * Droga pod rdzeń. Po drodze wygryzają sobie tunel w skale, ale w samą skorupę
 * nie ruszą — ta pęka tylko od tego, że stoją pod nią i się modlą (patrz rytual.ts).
 * Wiara ich w tym miejscu podkarmia, inaczej żaden kult nie dotrwałby do końca.
 */
function doPielgrzym(sim: Sim, c: Creature): void {
  const w = sim.world;
  // po drodze je, co znajdzie; dopiero gdy nie ma nic, zawraca do swoich
  if (c.hunger > (REMAKE && liczRole(sim).robotnik > 0 ? LUD.glodSam : P.glodSzukaJedzenia)) {
    const jedzenie = REMAKE ? null : sim.findFood(c.x, c.y, P.zasiegJedzenia, RACES[c.race].swims, (t) => edible(c.race, t));
    if (jedzenie) { c.job = Job.EAT; c.jx = jedzenie[0]; c.jy = jedzenie[1]; c.jt = 90; return; }
    // Remake v2: bez dostawy wraca jeść do wiadra (planer znajdzie drogę), a gdy żadnego nie ma — do siedziby
    if (c.hunger > P.glodWraca) {
      const wd = REMAKE ? najblizszaSpizarnia(sim, c.x, c.y, true) : null;
      c.job = Job.WANDER; c.jt = 0; c.jx = wd ? wd.x : sim.clans[c.clan].hx; c.jy = wd ? wd.y : sim.clans[c.clan].hy;
      return;
    }
  }
  const wPrzedsionku = Math.abs(c.x - w.coreX) < P.przedsionekX && Math.abs(c.y - w.przedsionekY) < P.przedsionekY;
  // Remake v1: drogi jeszcze nie ma — wraca czekać przy obozie (planer), zamiast iść za kopaczami
  if (REMAKE && sim.tick % 120 === c.id % 120 && ((!wPrzedsionku && drogaNiegotowa(sim, c)) || falaZwykla(sim))) { c.wyprawa = true; c.jt = 0; return; }
  if (!wPrzedsionku) {
    // swoja nacja ma plan drogi — idzie nim i sama przekopuje skałę po drodze; na przełaj
    // pielgrzymi szli prosto w dół i stawali na pierwszym jeziorze nad rdzeniem
    const plan = sim.planDrogi;
    if (plan && plan.klan === c.clan && idzPlanem(sim, c, plan.sciezka)) return;
    // Remake v1: daleko od kreski — prawdziwą drogą do niej albo do przedsionka; na przełaj
    // szli prosto w stronę rdzenia i wpadali do magmy
    if (REMAKE) {
      if (!c.droga && budzetDrog() > 2) {
        // do kafla aktualnej drogi (stopnie zostają też po starych planach — przy nich stawali na zawsze)
        const naKresce = plan ? new Set(plan.sciezka) : null;
        const d = szukajDrogi(sim, c, (i, x, y) => (naKresce !== null && naKresce.has(i) && !w.solid(x, y))
          || (Math.abs(x - w.coreX) < P.przedsionekX && Math.abs(y - w.przedsionekY) < P.przedsionekY), LUD.dostawaLimit);
        if (d) { c.droga = d; c.drogaI = 0; c.drogaKopie = false; }
        // Alpha: spadł z kreski do dołka, z którego nie wyjdzie — wykuwa stopnie z powrotem na nią
        // (jedyny raz, kiedy pobożny kuje: ratuje się, drogi nie kopie)
        else if (naKresce && (sim.tick + c.id) % 30 === 0 && budzetDrog() > 1) {
          const jx = c.jx, jy = c.jy;
          wkopDroga(sim, c, (x, y) => naKresce.has(w.idx(x, y)) && !w.solid(x, y) && stoi(sim, x, y), P.ratunekKopania);
          c.jx = jx; c.jy = jy;
        }
      }
      if (c.droga && c.drogaKopie) {
        const k = c.droga[c.droga.length - 1];
        idz(sim, c, k % w.w, (k / w.w) | 0, false);
        return;
      }
      if (c.droga) {
        const n = nastepnyKafel(sim, c);
        if (n >= 0) { krok(sim, c, n); return; }
        c.droga = undefined;
      }
    }
    // (Alpha: pobożny nie kuje — na przełaj tylko tam, gdzie da się przejść)
    walkTo(sim, c, c.jx, c.jy, !REMAKE);
    return;
  }
  // Dopiero na miejscu widać, czy skorupa już puściła — i liczy się faktyczna droga,
  // nie licznik pęknięć. Wtedy pielgrzym przestaje być pielgrzymem: schodzi do rdzenia.
  if (sim.rytual.otwarta && !falaTrwa(sim) && (sim.clans[c.clan].devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne)
      && sim.tick % P.sprawdzOtwarcieCo === c.id % P.sprawdzOtwarcieCo && wyslijDoRdzenia(sim, c, RYTUAL.zejsciePielgrzymaTikow)) return;
  // warta pod skorupą trwa, aż kamień puści — limit wyprawy liczy się tylko w drodze
  // (po 7000 tikach warta rozchodziła się do zwykłych zajęć tuż przed pęknięciem)
  c.jt = Math.max(c.jt, P.wyprawaTikow);
  // Remake v1: na swoje miejsce w szeregu — bokiem, bez kopania; jak się nie da, modli się, gdzie stoi
  if (Math.abs(c.x - (c.jx + 0.5)) > 1.2 && (c.wspina ?? -9) < sim.tick - 30) {
    const przed = c.x;
    walkTo(sim, c, c.jx, Math.floor(c.y), false);
    if (Math.abs(c.x - przed) < 0.001) c.jx = Math.floor(c.x);   // nie ma przejścia — zostaje tu
  }
  c.devotion = Math.min(1, c.devotion + P.modlitwaOddanie);
  if (!REMAKE) c.hunger = Math.max(0, c.hunger - P.modlitwaKarmi);      // wiara trawi wolniej, ale trawi (Remake v1: karmią dostawy)
  sim.wiara += P.modlitwaWiara * sim.incomeMult() * (maZabytek(sim, 'ksiega') ? ZABYTKI.skutki.ksiega.wiara : 1);
  if (sim.tick % P.mysliCo === 0 && sim.rng.chance(P.mysliSzansa)) sim.efekt(c.x, c.y - 0.4, 'mysl');
}

/**
 * Zejście do rdzenia przez otwartą skorupę — drogą. Na przełaj wierni szli prosto
 * na kamień skorupy (którego nie da się wykuć) i stali pod nim, choć szyb był obok.
 */
/**
 * Czy spod rdzenia da się wrócić do gniazda. Zeskok do wielkiej jaskini to droga
 * w jedną stronę: zgłodniali pielgrzymi nie mieli jak wrócić, a na ich miejsce
 * schodzili następni — cała nacja spływała do dołu i umierała tam z głodu.
 * Wynik trzymany w klanie na pół minuty; bez budżetu szukania pielgrzymka czeka.
 */
function powrotSpodRdzenia(sim: Sim, c: Creature, clan: Sim['clans'][number]): boolean {
  if (clan.powrotT !== undefined && sim.tick - clan.powrotT < P.powrotPamiecTikow) return !!clan.powrotOk;
  if (budzetDrog() < 2) return false;
  const w = sim.world;
  // pozorny wędrowiec z przedsionka: ta sama rasa, więc ta sama fizyka wspinania i pływania
  const zPrzedsionka = { ...c, x: w.coreX + 0.5, y: w.przedsionekY + 0.5 };
  const droga = szukajDrogi(sim, zPrzedsionka, (_i, x, y) => Math.abs(x - clan.hx) <= 3 && Math.abs(y - clan.hy) <= 3, P.powrotLimitDrogi);
  clan.powrotT = sim.tick;
  clan.powrotOk = droga !== null;
  return clan.powrotOk;
}

/**
 * Wysyła wiernego do rdzenia — drogą, jeśli ją widać, a jeśli nie, na przełaj
 * z kilofem: nacja spod rdzenia wchodzi do komory od dołu i to też się liczy.
 */
export function wyslijDoRdzenia(sim: Sim, c: Creature, jt: number): boolean {
  const w = sim.world;
  c.job = Job.DIG; c.jx = w.coreX; c.jy = w.coreY; c.jt = jt; c.dig = 0;
  // cel: sam rdzeń albo — gdy skorupa otwarta — komora wokół niego (wejście do niej to już dotarcie;
  // od dołu i z boku do wiszącego w komorze rdzenia nie ma się jak podciągnąć)
  const droga = szukajDrogi(sim, c, (_i, x, y) => (sim.rytual.otwarta && wKomorze(sim, x, y)) || (Math.abs(x - w.coreX) <= 3 && Math.abs(y - w.coreY) <= 3
    && (w.get(x, y + 1) === T.CORE || w.get(x - 1, y) === T.CORE || w.get(x + 1, y) === T.CORE || w.get(x, y - 1) === T.CORE)), RYTUAL.zejscieLimitDrogi);
  c.droga = droga ?? undefined; c.drogaI = 0; c.drogaKopie = false;
  return true;
}

function doPray(sim: Sim, c: Creature): void {
  const w = sim.world;
  const t = w.get(c.jx, c.jy);
  if (t !== T.SHRINE && t !== T.FORGE && t !== T.GLYPH && t !== T.CORE) { c.jt = 0; return; }
  if (Math.abs(c.jx - Math.floor(c.x)) <= K.modlitwaBlisko && Math.abs(c.jy - Math.floor(c.y)) <= K.modlitwaBlisko) {
    sim.pray(c, t);
    c.devotion = Math.min(1, c.devotion + K.modlitwaOddanie);
  } else idz(sim, c, c.jx, c.jy);
}

function doBuild(sim: Sim, c: Creature): void {
  // Na plac budowy trzeba dojść. Wcześniej nikt nie szedł: budowało się tylko tam,
  // gdzie ktoś akurat stał, więc Żużlowcy z rudą w zapasie nie stawiali kuźni przy ogniu
  // i umierali z głodu obok własnego żelaza.
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 1) {
    if (sim.world.get(c.jx, c.jy) !== T.AIR) { c.jt = 0; return; }
    idz(sim, c, c.jx, c.jy);
    return;
  }
  if (!sim.buildStep(c)) c.jt = 0;
}

function doFight(sim: Sim, c: Creature): void {
  const foe = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!foe || foe.dead) { sim.target.delete(c.id); c.jt = 0; return; }
  // Remake v1: swój na swojego nie idzie
  if (REMAKE && rolaPostaci(c) && rolaPostaci(foe)) { sim.target.delete(c.id); c.jt = 0; return; }
  // etap 3: ze Strażnikiem Snu walczy się w rytmie ciosów, nie co tik
  if (foe.straznik) {
    // ostatnia deska: pobożny razi Strażników (i bossa) księgą z dystansu
    if (foe.straznik && rolaPostaci(c) === 'pobozny' && trybWiernych(sim)) {
      walczKsiega(sim, c, foe, (x, y) => { walkTo(sim, c, x, y); });
      return;
    }
    walczZeStraznikiem(sim, c, foe, (x, y) => { walkTo(sim, c, x, y); });
    return;
  }
  const dist = Math.hypot(foe.x - c.x, foe.y - c.y);
  if (dist < K.walkaZasieg) {
    const dmg = RACES[c.race].strength * mnoznik(sim, c, 'sila') * cechaNacji(sim.clans[c.clan]).sila * (K.walkaMin + sim.rng.next() * K.walkaRozrzut) * (1 + c.mad);
    foe.hp -= dmg * ranyZbroi(foe);
    foe.fear = Math.min(1, foe.fear + K.walkaStrach);
    sim.spark(foe.x, foe.y, 'hit');
    if (foe.hp <= 0) {
      // pierwsza krew: dotąd żadna z nacji nie miała do drugiej urazy — to początek wojny
      const pierwsza = c.clan !== foe.clan && !(sim.clans[c.clan].grudge.get(foe.clan) ?? 0) && !(sim.clans[foe.clan]?.grudge.get(c.clan) ?? 0);
      sim.kill(foe, `z ręki ${sim.clans[c.clan].name}`, 'walka');
      if (RACES[c.race].eatsMeat) c.hunger = Math.max(0, c.hunger - K.zjadaOfiare);
      sim.feud(c.clan, foe.clan);
      if (pierwsza) zglosWojne(sim, c.clan, foe.clan, foe.x, foe.y);
      sim.wojnaBudzi(c.clan, foe.clan);
    }
  } else if (dist > K.walkaGubi) { sim.target.delete(c.id); c.jt = 0; }
  else walkTo(sim, c, foe.x, foe.y);
}

function doFlee(sim: Sim, c: Creature): void {
  if (REMAKE && c.droga) { if (idz(sim, c, c.jx, c.jy, false)) c.jt = 0; return; }
  walkTo(sim, c, c.jx, c.jy, false);
}

function doBreed(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  const far = Math.hypot(clan.hx - c.x, clan.hy - c.y);
  if (far > K.rozrodDaleko) { sim.birth(c); c.hunger = Math.min(1, c.hunger + K.rozrodGlodPoWDrodze); c.jt = 0; return; }
  if (far > K.rozrodDoGniazda) { idz(sim, c, clan.hx, clan.hy); return; }
  sim.birth(c);
  c.hunger = Math.min(1, c.hunger + K.rozrodGlodPo);
  c.jt = 0;
}

function doHaul(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  if (REMAKE && rolaPostaci(c)) {
    if (Math.abs(c.jx - Math.floor(c.x)) <= 2 && Math.abs(c.jy - Math.floor(c.y)) <= 2) {
      const sp = spizarniaW(sim, c.jx, c.jy) ?? najblizszaSpizarnia(sim, c.x, c.y, false);
      if (sp) { sp.odloz(c.carry); c.carry = 0; }
      c.jt = 0;
    } else idz(sim, c, c.jx, c.jy);
    return;
  }
  if (Math.hypot(clan.hx - c.x, clan.hy - c.y) < K.oddajeLupOd) {
    clan.stock += c.carry; c.carry = 0; c.jt = 0;
  } else idz(sim, c, clan.hx, clan.hy);
}

/** Prządki nie podbijają — przejmują. Niewolnik zmienia klan, nie rasę. */
function doSlave(sim: Sim, c: Creature): void {
  const foe = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!foe || foe.dead) { c.jt = 0; return; }
  const dist = Math.hypot(foe.x - c.x, foe.y - c.y);
  if (dist < K.jarzmoZasieg) {
    foe.hp -= K.jarzmoCios;
    foe.fear = 1;
    if (foe.hp < RACES[foe.race].maxHp * K.jarzmoProg) sim.enslave(foe, c.clan);
    c.jt = 0;
  } else walkTo(sim, c, foe.x, foe.y);
}

function doSacrifice(sim: Sim, c: Creature): void {
  if (Math.abs(c.jx - Math.floor(c.x)) > 2 || Math.abs(c.jy - Math.floor(c.y)) > 2) { idz(sim, c, c.jx, c.jy); return; }
  sim.sacrifice(c);
  c.jt = 0;
}

/** Sen w skale: nie rusza się, nie je, budzi go dopiero czyjś krok. */
function doSleep(sim: Sim, c: Creature): void {
  c.hunger = Math.max(K.snuGlodMin, c.hunger - K.snuGlodNaTik);
  c.hp = Math.min(RACES[c.race].maxHp, c.hp + K.snuLeczy);
  if (!sim.rozejm && (c.id + sim.tick) % K.snuCzujneCo === 0) {
    const prey = sim.nearestCreature(c.x, c.y, K.snuCzujneZasieg, (o) => o.id !== c.id && o.race !== Race.TROLL);
    if (prey) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = K.snuAtakTikow; c.hunger = Math.min(1, c.hunger); }
  }
}

/** Powrót do ognia: żużel jest dla nich jedzeniem, a kuźnia domem. */
function doHeat(sim: Sim, c: Creature): void {
  const clan = sim.clans[c.clan];
  if (c.carry > 0 && Math.hypot(clan.hx - c.x, clan.hy - c.y) < K.cieploOddajeLup) { clan.stock += c.carry; c.carry = 0; }
  const d = Math.hypot(c.jx + 0.5 - c.x, c.jy + 0.5 - c.y);
  if (d < K.cieploBlisko || (!c.droga && sim.goraco(Math.floor(c.x), Math.floor(c.y)))) {
    c.hunger = Math.max(0, c.hunger - K.cieploJe);
    if (c.hunger < K.cieploSyty) c.jt = 0;
  } else idz(sim, c, c.jx, c.jy);
}

/** Prządka żywi się tym, co wzięła. Niewolnik nie umiera od razu — to by było marnotrawstwo. */
function doDrain(sim: Sim, c: Creature): void {
  const victim = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!victim || victim.dead || victim.clan !== c.clan) { c.jt = 0; return; }
  if (Math.hypot(victim.x - c.x, victim.y - c.y) < K.wysysanieZasieg) {
    victim.hp -= K.wysysanieCios;
    victim.fear = 1;
    c.hunger = Math.max(0, c.hunger - K.wysysanieKarmi);
    if (sim.rng.chance(0.04)) sim.spark(victim.x, victim.y, 'hit');
    if (victim.hp <= 0) sim.kill(victim, 'wyssany przez Prządki', 'jarzmo');
    if (c.hunger < K.wysysanieSyta) c.jt = 0;
  } else walkTo(sim, c, victim.x, victim.y);
}

/** Ludzie nie mieszkają w tobie. Przychodzą po rudę i po sławę. */
function doRaid(sim: Sim, c: Creature): void {
  // Remake v1: najazd ma swój czas — potem ludzie wracają na powierzchnię (wpuszczeni dwa razy z rzędu
  // błąkali się, aż trafili na siedzibę, i wybijali cały lud)
  const dosc = REMAKE && c.od !== undefined && sim.tick - c.od > PP.ludzieWracajaPo;
  if (c.carry >= K.ludzieNiosa || c.hp < RACES[c.race].maxHp * K.ludzieRanni || dosc) {
    // Remake v2: po zawale wychodzą szczeliną w gruzie, tuż pod stropem
    if (c.y < K.ludzieWychodza) { sim.leaveWorld(c); return; }
    walkTo(sim, c, c.x + sim.rng.range(-3, 3), 2);
    return;
  }
  const ore = sim.findTile(c.x, c.y, K.ludzieRuda, (t) => t === T.ORE);
  if (ore) { c.jx = ore[0]; c.jy = ore[1]; doDig(sim, c); return; }
  walkTo(sim, c, c.x + sim.rng.range(-K.ludzieSzukajX, K.ludzieSzukajX), c.y + sim.rng.range(0, K.ludzieSzukajY));
}

export { PASSABLE };
