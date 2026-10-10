import type { Sim } from './sim';
import { DZIENNIK, zapisz, kto, OPIS_PRACY, NAZWY_KAFLI } from './dziennik';
import { T, PASSABLE } from './tiles';
import { Race, RACES } from './races';
import { pielgrzymowKlanu, wKomorze } from './rytual';
import { STWORZENIA as K } from '../nastawy/stworzenia';
import { RYTUAL, PIELGRZYMKA as P } from '../nastawy/rytual';
import { LUDY, PRZYPLYWY as PP } from '../nastawy/gora';
import { szukajDrogi, nastepnyKafel, nadOgniem, budzetDrog, przepasc, stoi, uchwyt } from './droga';
import { zglosWojne } from './wydarzenia';
import { cechaNacji } from './cechy';
import { czoloDrogi } from './pielgrzymka';
import { gniazdaWSkale, obudzGniazdo, podloga } from './lud';
import { krokStraznika, walczZeStraznikiem, falaZwykla, falaTrwa, wStrefieStraznikow, zywiStraznicy, trybWiernych, rycerzeCzekaja, iluRycerzy, walczKsiega } from './straznicy';
import { STRAZNICY } from '../nastawy/straznicy';
import { zajecieBuntownika } from './bunt';
import { obozFrontowy, wszystkieSpizarnie as wszystkieSpizarnieLudu, mnoznik, maxHp, rolaPostaci, liczRole, najblizszaSpizarnia, spizarnieWgOdleglosci, spizarniaW, stacjonuje, type Rola } from './lud';
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
  /** Remake v1: rola w ludzie (pobożny, robotnik, rycerz); brak = pobożny. */
  rola?: Rola;
  /** Remake v1: do tego tiku jest osłabiony po wyjściu ze skały. */
  slabyDo?: number;
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
  /** Remake v1: robotnik przekopuje korytarz w tę stronę (−1 zachód, 1 wschód); ostatni kierunek pamięta. */
  korytarz?: number;
  kierunek?: number;
  /** Remake v1: robotnik kopie drogę do rdzenia (złotą kreskę). */
  kopieDroge?: boolean;
  /** Co ostatnio odebrało zdrowie — kronika podaje prawdziwą przyczynę śmierci (wcześniej każda brzmiała „z wycieńczenia”). */
  rana?: 'magma' | 'woda' | 'glod' | 'starosc' | 'przysypany' | 'upadek' | 'grzybnia';
  /** Szept „kop losowo” (rycerz): kafle skały, które ma jeszcze wykopać. */
  losowo?: number[];
  /** …i od kiedy kopie pierwszy z nich (kafel, który nie daje się ruszyć, po chwili odpada). */
  losowoOd?: { i: number; t: number };
  /** Remake v1: stojąc przy obozie, modli się (pobożny). */
  modliPrzyObozie?: boolean;
  /** Remake v1: wysłany pod rdzeń — wraca do pielgrzymki po każdym przerwaniu (ogień, ucieczka, posiłek). */
  wyprawa?: boolean;
  /** Remake v1: tik ostatniej ucieczki od ognia — przez chwilę nie wraca tą samą drogą. */
  odOgnia?: number;
  /** Etap 4: zbuntowany rycerz (skutek zostawionego spisku) — bije lud, nie słucha. */
  buntownik?: boolean;
  /** Etap 4: zatruty (zatrute plony) do tego tiku. */
  zatrutyDo?: number;
  /** Patrzy na niego coś z ciemności (sim/mrok.ts): do tego tiku stoi jak wryty. */
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
  /** Etap 2: szept „Przemyśl i kop” — do tego tiku klęczy i prosi o znak. */
  przemysl?: number;
  /** Etap 2: tor kopania ku gniazdu: numer gniazda, cel (tx, ty) i czoło tunelu (hx, hy). */
  tor?: { gn: number; tx: number; ty: number; hx: number; hy: number;
    /** poprzednie czoło (tunel nie zawraca), ile kroków zrobił i najwięcej ile może, czoło przy ostatnim planowaniu */
    px?: number; py?: number; kroki?: number; limit?: number; ostatnie?: number;
    /** kafle, przez które tunel już szedł (indeksy, ostatnie kilkadziesiąt) — nie wraca na nie */
    byl?: number[];
    /** początek tunelu — tunel trzyma się prostej stąd do celu */
    sx?: number; sy?: number;
    /** wraca na czoło tunelu (po jedzeniu, ucieczce) */
    wraca?: boolean;
    /** do pokazanego gniazda: wyliczona trasa (indeksy kafli) omijająca ogień, wodę i przepaści */
    trasa?: number[] };
  /** Etap 2: ile razy tor się zaciął — po kilku robotnik się poddaje. */
  torBledy?: number;
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
  else if (c.hunger < K.najedzonyLeczy && c.hp < maxHp(sim, c)) c.hp = Math.min(maxHp(sim, c), c.hp + K.leczenieNaTik);
  if (c.age > d.lifespan * m.zycie && !sim.spokojnySwiat) { c.hp -= K.starosc; c.rana = 'starosc'; }
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
  if (!podRdzeniem && depth > K.szalenstwoOdGlebokosci && c.race !== Race.TROLL && sim.rng.chance(K.szalenstwoSzansa * (depth - K.szalenstwoPunkt) * 10 * odpornosc)) {
    c.mad = Math.min(1, c.mad + K.szalenstwoSkok);
    // Remake v1: bez trolów i sekt — szaleństwo nie przemienia nikogo
  }
  if (podRdzeniem && c.mad > 0) c.mad = Math.max(0, c.mad - P.ochronaLeczy);
  // kto wrócił wyżej, powoli dochodzi do siebie — szaleństwo nie jest już wieczne
  else if (depth < K.zdrowiejePowyzej && c.mad > 0 && c.race !== Race.TROLL) c.mad = Math.max(0, c.mad - K.zdrowienie);

  if (c.hp <= 0) {
    const r = PRZYCZYNA[c.rana ?? ''] ?? ['z wycieńczenia', c.age > d.lifespan * m.zycie ? 'starość' : 'wycieńczenie'];
    sim.kill(c, r[0], r[1]);
    return;
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

  // Remake v1: lud wbija klamry tam, którędy idzie — droga w dół zostaje drogą powrotną
  if (REMAKE && rolaPostaci(c) && w.inb(tx, ty)) w.drabina[w.idx(tx, ty)] = 1;

  // --- grawitacja
  // Kto właśnie się podciąga i ma ścianę pod ręką, trzyma się jej. Bez tego szyb, który
  // sami wykopali, był pułapką: wchodzili o pół kafla i spadali z powrotem, w kółko —
  // Żużlowcy potrafili tak przestać całe życie pod rudą, której nigdy nie dosięgli.
  // Na drodze wiernych (próg z pielgrzymka.ts) góra wykuła stopnie — tam trzyma się każdy,
  // także ten, kto wyłazi na nią z wody albo z otwartej jaskini.
  const naStopniach = w.prog[w.idx(tx, ty)] === 1 || (ty > 0 && w.prog[w.idx(tx, ty - 1)] === 1)
    || w.drabina[w.idx(tx, ty)] === 1 || (ty > 0 && w.drabina[w.idx(tx, ty - 1)] === 1);
  // Remake v1: pielgrzym na stopniach drogi wiernych trzyma się zawsze — krok w bok nad jaskinią
  // (bez świeżego chwytu) zrzucał go z drogi prosto w magmę pod spodem
  const naDrodzeWiernych = REMAKE && c.job === Job.PIELGRZYM && (w.prog[w.idx(tx, ty)] === 1 || (ty > 0 && w.prog[w.idx(tx, ty - 1)] === 1));
  const trzymaSie = naDrodzeWiernych || ((c.wspina ?? -9) >= sim.tick - K.trzymaSieTikow
    && (naStopniach || w.solid(tx - 1, ty) || w.solid(tx + 1, ty) || w.solid(tx - 1, ty + 1) || w.solid(tx + 1, ty + 1)));
  if (!trzymaSie && w.passable(tx, ty + 1) && w.water[w.idx(tx, Math.min(w.h - 1, ty + 1))] < K.wodaNiesie) {
    // Remake v1: lud nie spada — schodzi powoli, wbijając klamry (droga w dół staje się drogą w górę);
    // swobodny lot w jaskinię bez dna łamał im kości albo kończył się w magmie
    if (REMAKE && LUD.klamry && rolaPostaci(c) && w.magma[w.idx(tx, Math.min(w.h - 1, ty + 1))] === 0) {
      c.vy = 0;
      c.y += LUD.zjazd;   // bez „chwytu” — inaczej klamra pod nogami trzymała go w powietrzu i stał tam
      return;
    }
    // nad samą magmą lud wbija klamrę i wisi (planer zawróci go w górę) — kopacz drogi zjeżdżał prosto w jezioro ognia
    if (REMAKE && LUD.klamry && rolaPostaci(c)) {
      c.vy = 0; c.wspina = sim.tick; c.jt = Math.min(c.jt, 1);
      return;
    }
    // Kto dopiero co się wspinał i ma ścianę pod ręką, zsuwa się po niej, zamiast lecieć.
    // Inaczej każda zmiana zamiaru w połowie szybu kończyła się upadkiem z całej wysokości.
    if ((c.wspina ?? -99) >= sim.tick - K.zsuwaSieTikow && (w.solid(tx - 1, ty) || w.solid(tx + 1, ty))
        && w.magma[w.idx(tx, Math.min(w.h - 1, ty + 1))] === 0) {
      c.vy = 0;
      c.y += K.zsuwanie;
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
      // lud: zamiar się nie udał — korytarz w drugą stronę, i planowanie od nowa (bez losowego spaceru)
      c.stall = 0;
      if (c.korytarz) c.kierunek = -c.korytarz;
      if (c.tor && (c.torBledy = (c.torBledy ?? 0) + 1) >= LUD.przemyslBledow) koniecToru(sim, c, 'zgubiony');
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

  // Remake v1: patrzy na niego coś z ciemności — stoi jak wryty i nie słyszy wołania (sim/mrok.ts).
  // Ogień i woda są silniejsze od strachu: przed nimi ucieka mimo to.
  if (REMAKE && c.zamarlyDo !== undefined && sim.tick < c.zamarlyDo && !sim.przyMagmie(tx, ty, 1) && w.water[w.idx(tx, ty)] < LUD.wodaUcieka) {
    c.fear = 1;
    c.droga = undefined;
    c.zamiar = 'stoi jak wryty — coś patrzy na niego z ciemności'; c.zamiarDo = c.zamarlyDo;
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
      if (d) { c.droga = d; c.drogaI = 0; const k = d[d.length - 1]; c.jx = k % w.w; c.jy = (k / w.w) | 0; }
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
    default: doWander(sim, c); break;
  }
}

// ---------------------------------------------------------------- wybór celu

function pickJob(sim: Sim, c: Creature): void {
  const w = sim.world;
  const d = RACES[c.race];
  const clan = sim.clans[c.clan];
  const oldX = c.jx, oldY = c.jy;
  c.jt = K.decyzjaTikow + sim.rng.int(K.decyzjaRozrzut);
  c.droga = undefined; c.drogaI = 0;
  // etap 4: zbuntowany rycerz nie ma planera ludu — szuka, kogo bić
  if (c.buntownik) { zajecieBuntownika(sim, c); return; }
  /** Zapamiętuje drogę i ustawia cel zajęcia na jej końcu (albo na podanym kaflu). */
  const naDroge = (droga: number[], cx?: number, cy?: number): void => {
    c.droga = droga; c.drogaI = 0;
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
        c.tor = undefined; c.przemysl = undefined;   // kto idzie się modlić, porzuca kopanie ku znakowi
        c.job = Job.PIELGRZYM;
        c.wyprawa = true;
        if (REMAKE) { c.zamiar = 'schodzi pod rdzeń i modli się z wartą'; c.zamiarDo = sim.tick + P.wyprawaTikow; }
        c.jx = miejsceWSzeregu(sim, c);
        c.jy = w.przedsionekY;
        c.jt = P.wyprawaTikow; c.dig = 0; return;
    }
  }

  if (rolaPostaci(c) !== 'rycerz' && c.hp < maxHp(sim, c) * K.rannyUcieka && c.fear > K.rannyStrach) { c.job = Job.FLEE; c.jt = K.ucieczkaTikow; return; }

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
    if (scary && rolaPostaci(c) !== 'rycerz' && sim.rng.chance(K.strachSzansa * d.fearGain * cechaNacji(sim.clans[c.clan]).strach)) {
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
  // Remake v1: nikt się nie rodzi — nowych wydaje skała (sim/lud.ts)
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
    if (rolaPostaci(c) === 'robotnik') {
      const cel = celKopaniaRobotnika(sim, c, clan);
      if (cel) { c.job = Job.DIG; c.jx = cel[0]; c.jy = cel[1]; c.jt = K.kopanieTikowLosowe; c.dig = 0; return; }
    } else {
      c.job = Job.DIG;
      c.jx = Math.floor(c.x) + sim.rng.int(K.kopanieLosoweX * 2 + 1) - K.kopanieLosoweX;
      c.jy = Math.floor(c.y) + sim.rng.int(9) - 3;
      c.jt = K.kopanieTikowLosowe; c.dig = 0; return;
    }
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
  c.korytarz = undefined;
  // z pustymi rękami nikomu nic nie niesie — inaczej „kurier”, który poszedł jeść, blokował dostawę na zawsze
  if (c.carry === 0) { c.dostawaDla = undefined; c.doObozu = undefined; }
  const kopal = !!c.kopieDroge;
  c.kopieDroge = false;
  c.modliPrzyObozie = false;
  const naDroge = (droga: number[], cx?: number, cy?: number): void => {
    c.droga = droga; c.drogaI = 0;
    if (cx !== undefined && cy !== undefined) { c.jx = cx; c.jy = cy; return; }
    const k = droga.length ? droga[droga.length - 1] : w.idx(Math.floor(c.x), Math.floor(c.y));
    c.jx = k % w.w; c.jy = (k / w.w) | 0;
  };
  const zamiar = (opis: string, job: Job, jt: number): void => {
    c.zamiar = opis; c.job = job; c.jt = jt; c.zamiarDo = sim.tick + jt;
  };
  const droga = (cel: (x: number, y: number) => boolean, limit: number) => szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
  const podroz = (d: number[]) => K.noszenieTikow + d.length * K.tikowNaKafel;

  // etap 3: zwykła fala Strażników — kto nie jest rycerzem, odchodzi spod rdzenia (modlitwa i tak nic nie kruszy);
  // pobożny z wyprawy wraca pod rdzeń, gdy fala minie
  // (głodny, do którego żaden Strażnik nie jest blisko, najpierw idzie jeść — na skraju strefy uciekali w kółko
  // i umierali z głodu po kilku naraz)
  const glodnyBezpieczny = c.hunger > LUD.glodSam && !zywiStraznicy(sim).some((s) => Math.hypot(s.x - c.x, s.y - c.y) < STRAZNICY.glodnyNieUciekaOd);
  // (ostatnia deska: pobożni nie uciekają — stają przeciw bossowi z księgą)
  // (rycerze też, gdy jest ich za mało na bossa — czekają na towarzyszy)
  const czeka = rola === 'rycerz' && rycerzeCzekaja(sim);
  if ((falaZwykla(sim) || czeka) && (rola !== 'rycerz' || czeka) && !(rola === 'pobozny' && trybWiernych(sim)) && !glodnyBezpieczny && wStrefieStraznikow(sim, c.x, c.y, STRAZNICY.ucieczkaZapas)) {
    // najchętniej do najbliższej spiżarni poza strefą (tam przeczeka i zje), inaczej byle dalej
    // rycerz, który czeka na towarzyszy, staje tuż za skrajem strefy — tam, skąd wróci do walki
    const skraj = czeka ? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas + 6) && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3), LUD.dostawaLimit) : null;
    if (skraj) { naDroge(skraj); zamiar(`czeka na skraju, aż zbierze się ich dość (${iluRycerzy(sim)}/${STRAZNICY.rycerzyNaBossa})`, Job.WANDER, podroz(skraj)); return; }
    const sp = spizarnieWgOdleglosci(sim, c.x, c.y, false).find((o) => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas));
    const d = (sp ? droga((x, y) => Math.abs(x - sp.x) <= 3 && Math.abs(y - sp.y) <= 2 && stoi(sim, x, y), LUD.dostawaLimit) : null)
      ?? droga((x, y) => !wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) && stoi(sim, x, y), LUD.dostawaLimit);
    if (d) { naDroge(d); zamiar(czeka ? `czeka na towarzyszy — na bossa ruszą, gdy będzie ich ${STRAZNICY.rycerzyNaBossa}` : 'odchodzi spod rdzenia przed Strażnikami Snu', Job.WANDER, podroz(d)); return; }
  }
  // pielgrzym trzyma się wyprawy, aż dojdzie (albo aż ty ją przerwiesz) — wcześniej porzucał ją po minucie
  if ((c.job === Job.PIELGRZYM || c.wyprawa) && sim.tick >= (c.bezModlitwyDo ?? 0) && c.hunger < LUD.glodSam) {
    // droga do rdzenia jeszcze niewykopana albo trwa fala Strażników — czeka przy obozie frontowym
    if (drogaNiegotowa(sim, c) || falaZwykla(sim)) {
      c.wyprawa = true;
      if (falaZwykla(sim)) {
        // czeka przy spiżarni poza strefą Strażników (stanPrzyObozie sam ją wybiera) — tam zje
        if (!stanPrzyObozie(sim, c, naDroge, droga)) { c.jx = Math.floor(c.x); c.jy = Math.floor(c.y); c.droga = undefined; }
        zamiar('czeka z dala od rdzenia, aż fala Strażników minie', Job.STOI, Z);
        return;
      }
      if (stanPrzyObozie(sim, c, naDroge, droga)) {
        c.modliPrzyObozie = true;
        zamiar('czeka przy obozie, aż robotnicy dokopią drogę do rdzenia', Job.STOI, Z);
        return;
      }
    }
    if (c.job !== Job.PIELGRZYM) { c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0; }
    c.wyprawa = true;
    zamiar('schodzi pod rdzeń i modli się z wartą', Job.PIELGRZYM, P.wyprawaTikow);
    return;
  }

  // --- głód: robotnik je sam; pobożni i rycerze czekają na dostawę, chyba że już ledwo żyją
  const robotnikow = liczRole(sim).robotnik;
  // robotnik daleko od spiżarni rusza jeść wcześniej (droga powrotna bywa długa), kopacz drogi czeka na dostawę
  const spB = najblizszaSpizarnia(sim, c.x, c.y, true);
  const dalekoOdJedzenia = !spB || Math.hypot(spB.x - c.x, spB.y - c.y) > LUD.daleko;
  const progRobotnika = (kopal || !!c.tor) && robotnikow > 1 ? LUD.glodSam : dalekoOdJedzenia ? LUD.glodDostawy : K.idzieJesc;
  // stacjonujący przy spiżarni z jedzeniem je sam (po co czekać na dostawę, gdy jedzenie leży obok);
  // dostawy są dla tych, którzy stoją daleko — pod rdzeniem, na warcie
  const spizarniaObok = !!spB && Math.hypot(spB.x - c.x, spB.y - c.y) <= LUD.spizarniaObok;
  const glodny = rola === 'robotnik' ? c.hunger > progRobotnika
    : c.hunger > LUD.glodSam || (robotnikow === 0 && c.hunger > K.idzieJesc) || (spizarniaObok && c.hunger > LUD.glodDostawy);
  const odOgnia = sim.tick - (c.odOgnia ?? -1e9) < Z;   // świeżo uciekł od ognia — nie wraca w jego stronę
  if (glodny && c.carry === 0) {
    // (w czasie fali nie-rycerz nie idzie jeść do spiżarni w strefie Strażników — boss wybijał ich tam po kolei)
    const wFali = falaZwykla(sim) && (rola !== 'rycerz' || rycerzeCzekaja(sim));
    if (sim.tick >= (c.bezSpizarniDo ?? 0)) {
      for (const sp of spizarnieWgOdleglosci(sim, c.x, c.y, true).filter((sp) => (!odOgnia || !sim.przyMagmie(sp.x, sp.y, 4)) && !(wFali && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas))).slice(0, 3)) {
        const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.doSpizarni);
        if (d) { naDroge(d, sp.x, sp.y); zamiar(sp.baza ? 'idzie jeść do spiżarni w siedzibie' : 'idzie jeść do spiżarni obozu', Job.ZAPAS, podroz(d)); return; }
      }
    }
    // (grzyb w strefie Strażników w czasie fali też odpada — tak samo jak spiżarnie)
    const d = szukajDrogi(sim, c, (i, x, y) => w.tile[i] === T.FUNGUS && !sim.przyMagmie(x, y, 3) && !(wFali && wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas)), K.jedzenieLimitGlodny);
    if (d) { naDroge(d); zamiar('szuka grzyba — do spiżarni nie dojdzie', Job.EAT, podroz(d)); return; }
  }

  // --- niesie jedzenie: głodnemu albo do najbliższej spiżarni
  if (c.carry > 0) {
    const komu = c.dostawaDla !== undefined ? sim.creatureById(c.dostawaDla) : null;
    if (komu && !komu.dead && komu.hunger > 0.1) {
      c.jx = Math.floor(komu.x); c.jy = Math.floor(komu.y);
      const d = droga((x, y) => Math.abs(x - c.jx) <= 1 && Math.abs(y - c.jy) <= 1, LUD.dostawaLimit);
      if (d) naDroge(d, c.jx, c.jy);
      zamiar(`niesie jedzenie: ${komu.rola === 'rycerz' ? 'rycerz' : 'pobożny'} #${komu.id}`, Job.DOSTAWA, d ? podroz(d) : Z);
      return;
    }
    c.dostawaDla = undefined;
    // zapas dla obozu — do jego spiżarni
    if (c.doObozu) {
      const cel = c.doObozu;
      c.jx = cel.x; c.jy = cel.y;
      const d = droga((x, y) => Math.abs(x - cel.x) <= 1 && Math.abs(y - cel.y) <= 1, LUD.dostawaLimit);
      if (d) naDroge(d, cel.x, cel.y);
      zamiar('niesie zapas do spiżarni obozu', Job.HAUL, d ? podroz(d) : Z);
      return;
    }
    const sp = najblizszaSpizarnia(sim, c.x, c.y, false);
    if (sp) {
      c.jx = sp.x; c.jy = sp.y;
      const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.dostawaLimit);
      if (d) naDroge(d, sp.x, sp.y);
      zamiar(sp.baza ? 'odnosi jedzenie do spiżarni w siedzibie' : 'odnosi jedzenie do spiżarni obozu', Job.HAUL, d ? podroz(d) : Z);
      return;
    }
  }

  if (rola === 'robotnik') { planRobotnika(sim, c, clan, naDroge, zamiar, droga, podroz); return; }
  if (rola === 'pobozny') {
    // sam schodzi pod rdzeń, gdy nacja wierzy dość mocno (te same warunki co dawniej)
    const d = RACES[c.race];
    if (d.faithGain > 0 && sim.tick >= (c.bezModlitwyDo ?? 0) && clan.devotion > P.oddanieNacji && c.devotion > P.oddanieWlasne && c.hunger < P.najedzony
        && pielgrzymowKlanu(sim, clan.id) < Math.min(P.maxPielgrzymow, Math.max(P.minPielgrzymow, Math.floor(clan.pop * P.czescNacji)))
        && (sim.jedzeniePrzedsionka >= P.jedzenieWPrzedsionku || powrotSpodRdzenia(sim, c, clan)) && sim.rng.chance(0.35)) {
      c.jx = miejsceWSzeregu(sim, c); c.jy = w.przedsionekY; c.dig = 0; c.wyprawa = true;
      zamiar('schodzi pod rdzeń i modli się z wartą', Job.PIELGRZYM, P.wyprawaTikow);
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
  if (rola === 'rycerz') {
    // szept „kop losowo”: następny kafel z listy (już wykopane i nie do ruszenia odpadają)
    if (c.losowo) {
      // kafel, który od 15 s nie daje się ruszyć (ogień obok, nie da się do niego stanąć), odpada
      if (c.losowoOd && c.losowo[0] === c.losowoOd.i && sim.tick - c.losowoOd.t > 1800) c.losowo.shift();
      const lity = (i: number) => w.solid(i % w.w, (i / w.w) | 0) && w.hardness(i % w.w, (i / w.w) | 0) > 0;
      // pierwszy z listy, do którego da się podejść (niedostępne odpadają, nie przerywają roboty)
      while (c.losowo.length) {
        const k = c.losowo[0];
        if (!lity(k)) { c.losowo.shift(); continue; }
        const fx = k % w.w, fy = (k / w.w) | 0;
        const d = droga((x, y) => Math.abs(x - fx) <= 1 && Math.abs(y - fy) <= 1 && (x !== fx || y !== fy), LUD.dostawaLimit);
        if (!d) { c.losowo.shift(); continue; }
        if (!c.losowoOd || c.losowoOd.i !== k) c.losowoOd = { i: k, t: sim.tick };
        naDroge(d); c.jx = fx; c.jy = fy; c.dig = 0;
        zamiar(`kopie na chybił trafił — szuka śpiących rycerzy (zostało ${c.losowo.length})`, Job.DIG, podroz(d) + Z);
        return;
      }
      c.losowo = undefined; c.losowoOd = undefined;
      sim.efekt(c.x, c.y, 'mysl', 'skała pusta');
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
      if (d) { naDroge(d); zamiar('trzyma wartę pod rdzeniem, z boku modlących się', Job.WARTA, podroz(d) + Z); return; }
    }
    if (stanPrzyObozie(sim, c, naDroge, droga)) { zamiar('pilnuje obozu', Job.STOI, Z); return; }
  }
  // nie ma dokąd iść — z odciętej kieszeni wkopuje się do spiżarni, inaczej stoi, gdzie jest
  if (wkopSieDoSpizarni(sim, c, zamiar)) return;
  c.jx = Math.floor(c.x); c.jy = Math.floor(c.y);
  zamiar('czeka', Job.STOI, Z);
}

/**
 * Remake v1: kto utknął w kieszeni, z której nie prowadzi żadna droga (zalało ją, osypała się),
 * wkopuje się w stronę najbliższej spiżarni — wcześniej „czekał” tam, aż umarł z głodu.
 */
function wkopSieDoSpizarni(sim: Sim, c: Creature, zamiar: (opis: string, job: Job, jt: number) => void): boolean {
  // tylko głodny i tylko gdy szukanie drogi naprawdę się odbyło (pusty budżet to nie „nie ma drogi”) —
  // wkopujący się na ślepo przy froncie drogi rozkopywali ją i droga do rdzenia stała przez 10 minut
  if (c.hunger <= LUD.glodSam || budzetDrog() < 3) return false;
  const sp = najblizszaSpizarnia(sim, c.x, c.y, false);
  if (!sp || Math.hypot(sp.x - c.x, sp.y - c.y) <= 3) return false;
  const sps = spizarnieWgOdleglosci(sim, c.x, c.y, false);
  const d = szukajDrogi(sim, c, (_i, x, y) => sps.some((o) => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1), LUD.doSpizarni);
  if (d || budzetDrog() < 1) return false;
  c.jx = sp.x; c.jy = sp.y; c.droga = undefined;
  zamiar('wkopuje się z odciętej kieszeni do spiżarni', Job.WANDER, LUD.zamiarTikow);
  return true;
}

/** Miejsce do stania przy najbliższym obozie (siedzibie albo obozie ze spiżarnią) — każdy ma swoje. */
function stanPrzyObozie(sim: Sim, c: Creature, naDroge: (d: number[], x?: number, y?: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null): boolean {
  // pobożni i rycerze stacjonują przy obozie frontowym (najbliżej rdzenia) — idą za postępem drogi;
  // robotnik odpoczywa przy najbliższej spiżarni
  // rycerz poza wartą pilnuje najbliższego obozu z jedzeniem — przy froncie, daleko od spiżarni,
  // rycerze z gniazd umierali z głodu, zanim dostawy zdążyły do nich dojść
  // (raz wybrany obóz trzyma, póki ma jedzenie: „najbliższy” zmieniał się w drodze i rycerz kursował szybem w kółko)
  let sp: ReturnType<typeof obozFrontowy>;
  if (rolaPostaci(c) === 'rycerz') {
    const stary = c.posterunek ? wszystkieSpizarnieLudu(sim).find((o) => o.x === c.posterunek!.x && o.y === c.posterunek!.y && o.ilosc > 0) : undefined;
    // gdy pobożni wyruszają pod rdzeń, rycerze idą z nimi do obozu frontowego
    sp = wyprawaTrwa(sim) ? obozFrontowy(sim) : stary ?? najblizszaSpizarnia(sim, c.x, c.y, true) ?? obozFrontowy(sim);
    c.posterunek = sp ? { x: sp.x, y: sp.y } : undefined;
  } else sp = stacjonuje(c) ? obozFrontowy(sim) : najblizszaSpizarnia(sim, c.x, c.y, false);
  // etap 3: w czasie fali Strażników nie-rycerze nie stają przy obozie pod rdzeniem
  if (sp && (rolaPostaci(c) !== 'rycerz' ? falaZwykla(sim) : rycerzeCzekaja(sim)) && wStrefieStraznikow(sim, sp.x, sp.y, STRAZNICY.ucieczkaZapas)) {
    sp = spizarnieWgOdleglosci(sim, c.x, c.y, false).find((o) => !wStrefieStraznikow(sim, o.x, o.y, STRAZNICY.ucieczkaZapas)) ?? null;
  }
  if (!sp) return false;
  // rycerze stoją dalej, na skraju obozu; pobożni bliżej — każdy w swoim miejscu, nie jeden na drugim
  const r = rolaPostaci(c) === 'rycerz' ? 5 : 2;
  const px = sp.x + (c.id % 2 ? -1 : 1) * (r + (c.id >> 1) % 3);
  const sucho = (x: number, y: number) => sim.world.water[sim.world.idx(x, y)] < 3 && !sim.przyMagmie(x, y, 3);
  const d = droga((x, y) => Math.abs(x - px) <= 1 && Math.abs(y - sp.y) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni)
    ?? droga((x, y) => Math.abs(x - sp.x) <= 6 && Math.abs(y - sp.y) <= 3 && stoi(sim, x, y) && sucho(x, y), LUD.doSpizarni);
  if (!d) return false;
  naDroge(d);
  return true;
}

function planRobotnika(sim: Sim, c: Creature, clan: Sim['clans'][number],
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): void {
  const w = sim.world;
  const Z = LUD.zamiarTikow;
  if (c.carry === 0) c.dostawaDla = undefined;
  // etap 4: w czasie zwykłej fali Strażników robotnik nie bierze zadań w ich strefie (ginęli, nosząc tam jedzenie)
  const strefa = falaZwykla(sim) ? (x: number, y: number) => wStrefieStraznikow(sim, x, y, STRAZNICY.ucieczkaZapas) : () => false;
  // 0. szept „Przemyśl i kop”: klęczy i prosi o znak, potem kopie ku gniazdu rycerzy
  if (planPrzemysl(sim, c, naDroge, zamiar, droga, podroz)) return;
  // 1. dostawa: z najbliższej spiżarni z jedzeniem (jak tam nie dojdzie — z następnej) do głodnego
  const komu = glodnyDoNakarmienia(sim, c);
  if (komu && !strefa(komu.x, komu.y)) {
    for (const sp of spizarnieWgOdleglosci(sim, c.x, c.y, true).slice(0, 3)) {
      const d = droga((x, y) => Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1, LUD.dostawaLimit);
      if (d) {
        naDroge(d, sp.x, sp.y); c.dostawaDla = komu.id;
        zamiar(`bierze jedzenie ze spiżarni dla: ${komu.rola === 'rycerz' ? 'rycerz' : 'pobożny'} #${komu.id}`, Job.ZBIERA, podroz(d));
        return;
      }
    }
  }
  // 1b. zaopatrzenie obozu frontowego: pusta spiżarnia tam, gdzie stacjonują — zapas z najbogatszej
  const front = obozFrontowy(sim);
  if (front && !front.baza && front.ilosc < LUD.obozMinZapas && !strefa(front.x, front.y)) {
    let niosa = 0;
    for (const o of sim.creatures) if (!o.dead && o.id !== c.id && o.doObozu && o.doObozu.x === front.x && o.doObozu.y === front.y) niosa++;
    const zrodlo = wszystkieSpizarnieLudu(sim).filter((s) => s !== front && !(s.x === front.x && s.y === front.y) && s.ilosc > LUD.obozMinZapas)
      .sort((a, b) => b.ilosc - a.ilosc)[0];
    if (zrodlo && niosa < LUD.zapasNosicieli) {
      const d = droga((x, y) => Math.abs(x - zrodlo.x) <= 1 && Math.abs(y - zrodlo.y) <= 1, LUD.dostawaLimit);
      if (d) {
        naDroge(d, zrodlo.x, zrodlo.y); c.doObozu = { x: front.x, y: front.y };
        zamiar('bierze zapas dla obozu frontowego', Job.ZBIERA, podroz(d));
        return;
      }
    }
  }
  // 2. droga do rdzenia: kopie czoło złotej kreski (najwyżej kilku naraz)
  const cz = czoloDrogi(sim);
  if (cz >= 0 && !strefa(cz % w.w, (cz / w.w) | 0) && !sim.przyMagmie(cz % w.w, (cz / w.w) | 0, 2)) {
    let kopiacych = 0;
    for (const o of sim.creatures) if (!o.dead && o.id !== c.id && o.kopieDroge) kopiacych++;
    // przy małej liczbie robotników mniej kopaczy — ktoś musi zbierać jedzenie
    if (kopiacych < Math.min(LUD.drogaKopaczy, Math.max(1, liczRole(sim).robotnik - 2))) {
      const fx = cz % w.w, fy = (cz / w.w) | 0;
      // najpierw miejsce, na którym da się stać albo trzymać ściany — nad pustką zjeżdżał po linie i wracał w kółko
      const obok = (x: number, y: number) => Math.abs(x - fx) + Math.abs(y - fy) === 1 || (Math.abs(x - fx) === 1 && Math.abs(y - fy) === 1);
      const d = droga((x, y) => obok(x, y) && (stoi(sim, x, y) || w.solid(x - 1, y) || w.solid(x + 1, y)), LUD.dostawaLimit)
        ?? droga(obok, LUD.dostawaLimit);
      if (d) {
        naDroge(d); c.jx = fx; c.jy = fy; c.dig = 0; c.kopieDroge = true;
        zamiar('kopie drogę do rdzenia', Job.DIG, podroz(d) + Z);
        return;
      }
    }
  }
  // 3. grzyb przy obozach — do spiżarni obozu (posadzony przy obozie trafia do niej)
  {
    const sp = spizarnieWgOdleglosci(sim, c.x, c.y, false);
    const przyObozie = (x: number, y: number) => sp.some((s) => Math.abs(s.x - x) <= LUD.grzybPrzyObozie && Math.abs(s.y - y) <= LUD.grzybPrzyObozie);
    const najblizsza = sp[0];
    if (najblizsza && najblizsza.ilosc < LUD.zapasDo) {
      // grzyb przy obozie zbierają także pod rdzeniem (obóz frontowy stoi przy warcie) — byle nie w przedsionku
      const wPrzedsionku = (x: number, y: number) => Math.abs(x - w.coreX) <= P.przedsionekX && Math.abs(y - w.przedsionekY) <= P.przedsionekY;
      const d = szukajDrogi(sim, c, (i, x, y) => w.tile[i] === T.FUNGUS && przyObozie(x, y) && !wPrzedsionku(x, y) && !strefa(x, y), LUD.dostawaLimit)
        ?? szukajDrogi(sim, c, (i, x, y) => w.tile[i] === T.FUNGUS && wStrefiePracy(sim, clan, x, y) && !strefa(x, y) && Math.hypot(x - w.coreX, y - w.coreY) >= LUD.strefaRdzenia, K.jedzenieLimit);
      if (d) { naDroge(d); zamiar('zbiera grzyb do spiżarni', Job.ZBIERA, podroz(d)); return; }
    }
  }
  // 4. poza strefą pracy albo przy rdzeniu — wraca do siedziby
  const przyRdzeniu = Math.hypot(c.x - w.coreX, c.y - w.coreY) < LUD.strefaRdzenia;
  // (po ucieczce od ognia nie wraca od razu — droga do siedziby prowadziła obok magmy i kręcił się w kółko)
  const swiezoOdOgnia = sim.tick - (c.odOgnia ?? -1e9) < Z;
  if ((przyRdzeniu || !wStrefiePracy(sim, clan, c.x, c.y, 2)) && !swiezoOdOgnia) {
    const d = droga((x, y) => wStrefiePracy(sim, clan, x, y) && !strefa(x, y) && Math.hypot(x - w.coreX, y - w.coreY) >= LUD.strefaRdzenia && stoi(sim, x, y) && !sim.przyMagmie(x, y, 3), LUD.dostawaLimit);
    if (d) { naDroge(d); zamiar('wraca do siedziby', Job.WANDER, podroz(d)); return; }
    c.jx = clan.hx; c.jy = clan.hy;
    zamiar('wkopuje się z powrotem do siedziby', Job.WANDER, Z);
    return;
  }
  if (swiezoOdOgnia) {
    if (wkopSieDoSpizarni(sim, c, zamiar)) return;
    c.jx = Math.floor(c.x); c.jy = Math.floor(c.y);
    zamiar('czeka z dala od ognia', Job.STOI, Z);
    return;
  }
  // 3. zbiera grzyb, gdy w najbliższej spiżarni mało
  const sp = najblizszaSpizarnia(sim, c.x, c.y, false);
  if (sp && sp.ilosc < LUD.zapasDo) {
    const d = szukajDrogi(sim, c, (i, x, y) => w.tile[i] === T.FUNGUS && wStrefiePracy(sim, clan, x, y) && !strefa(x, y) && Math.hypot(x - w.coreX, y - w.coreY) >= LUD.strefaRdzenia, K.jedzenieLimit);
    if (d) { naDroge(d); zamiar('zbiera grzyb do spiżarni', Job.ZBIERA, podroz(d)); return; }
    // spiżarnie puste — po grzyb dalej, poza strefę pracy (robotnicy odpoczywali przy pustej spiżarni,
    // a rycerze i pobożni błąkali się po całej górze i umierali z głodu)
    if (wszystkieSpizarnieLudu(sim).reduce((n, o) => n + o.ilosc, 0) < LUD.pustoPonizej) {
      const dd = szukajDrogi(sim, c, (i, x, y) => w.tile[i] === T.FUNGUS && !strefa(x, y) && !sim.przyMagmie(x, y, 3) && Math.hypot(x - w.coreX, y - w.coreY) >= LUD.strefaRdzenia, K.jedzenieLimitGlodny);
      if (dd) { naDroge(dd); zamiar('idzie daleko po grzyb — spiżarnie puste', Job.ZBIERA, podroz(dd)); return; }
    }
  }
  // 4. przekopuje korytarz — jeden kierunek przez cały zamiar, kafel po kafelku
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const pierwszy = c.kierunek ?? (c.id % 2 ? -1 : 1);
  for (const kier of [pierwszy, -pierwszy]) {
    for (const yy of [cy, cy - 1]) {
      // pierwszy lity kafel w tę stronę (przez pustkę korytarza, który już jest)
      let x = cx + kier, ok = false;
      for (let k = 0; k < 12 && w.inb(x, yy); k++, x += kier) {
        if (w.solid(x, yy)) { ok = kafelKorytarza(sim, c, x, yy); break; }
        if (!stoi(sim, x, yy) && !w.solid(x, yy + 1)) break;   // tu nie ma podłogi — korytarz się urywa
      }
      if (ok) {
        c.kierunek = kier; c.korytarz = kier;
        c.jx = x; c.jy = yy; c.dig = 0;
        zamiar(`przekopuje korytarz na ${kier > 0 ? 'wschód' : 'zachód'}`, Job.DIG, Z);
        return;
      }
    }
  }
  // 5. nie ma czego kopać — odpoczywa przy spiżarni
  if (stanPrzyObozie(sim, c, naDroge, droga)) { zamiar('odpoczywa przy spiżarni', Job.STOI, Z); return; }
  if (wkopSieDoSpizarni(sim, c, zamiar)) return;
  c.jx = cx; c.jy = cy;
  zamiar('czeka', Job.STOI, Z);
}

// ------------------------------------------------- „Przemyśl i kop” (etap 2)

/** Zamiar robotnika ze szeptu „Przemyśl i kop”. Zwraca false, gdy nie ma czego kopać. */
function planPrzemysl(sim: Sim, c: Creature,
  naDroge: (d: number[], x?: number, y?: number) => void,
  zamiar: (opis: string, job: Job, jt: number) => void,
  droga: (cel: (x: number, y: number) => boolean, limit: number) => number[] | null,
  podroz: (d: number[]) => number): boolean {
  if (c.przemysl !== undefined && !c.tor) {
    if (sim.tick < c.przemysl) {
      c.jx = Math.floor(c.x); c.jy = Math.floor(c.y); c.droga = undefined;
      zamiar('klęczy i prosi o znak, gdzie śpią rycerze', Job.PRAY, c.przemysl - sim.tick);
      return true;
    }
    c.przemysl = undefined;
    if (!wyznaczTor(sim, c)) { sim.efekt(c.x, c.y, 'mysl', 'skała milczy'); return false; }
    sim.efekt(c.x, c.y, 'mysl', 'znak!');
    for (let i = 0; i < 4; i++) sim.spark(c.x, c.y - 0.5, 'pray');
  }
  if (!c.tor) return false;
  const t = c.tor;
  if (t.hx === t.tx && t.hy === t.ty) { koniecToru(sim, c, 'pusto'); return false; }
  // od ostatniego zamiaru tunel się nie przybliżył — kręci się zamiast kopać; po kilku razach się poddaje
  // (po wyliczonej trasie liczy się to, ile jej zostało — objazd chwilowo oddala od celu w linii prostej)
  const naTrasie = t.trasa ? t.trasa.indexOf(sim.world.idx(t.hx, t.hy)) : -1;
  const zostalo = t.trasa && naTrasie >= 0 ? t.trasa.length - naTrasie : Math.abs(t.tx - t.hx) + Math.abs(t.ty - t.hy);
  if (t.ostatnie !== undefined && zostalo >= t.ostatnie && !t.wraca) {
    c.torBledy = (c.torBledy ?? 0) + 1;
    if (c.torBledy >= LUD.przemyslBledow) { koniecToru(sim, c, 'zgubiony'); return false; }
  } else c.torBledy = 0;
  t.ostatnie = zostalo;
  // odszedł od tunelu (jadł, uciekał) — wraca na jego czoło
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  t.wraca = Math.abs(cx - t.hx) > 2 || Math.abs(cy - t.hy) > 2;
  if (t.wraca) {
    const d = droga((x, y) => x === t.hx && y === t.hy, LUD.dostawaLimit)
      ?? droga((x, y) => Math.abs(x - t.hx) <= 1 && Math.abs(y - t.hy) <= 1, LUD.dostawaLimit);
    if (!d) { koniecToru(sim, c, 'zgubiony'); return false; }
    naDroge(d, t.hx, t.hy);
    t.ostatnie = undefined;      // powrót to nie zastój — postęp liczy się od czoła
    zamiar('wraca do swojego tunelu ku znakowi', Job.DIG, podroz(d) + LUD.zamiarTikow);
    return true;
  }
  c.jx = cx; c.jy = cy; c.dig = 0; c.droga = undefined;
  const strona = Math.abs(t.tx - t.hx) >= Math.abs(t.ty - t.hy) ? (t.tx > t.hx ? 'na wschód' : 'na zachód') : (t.ty > t.hy ? 'w dół' : 'w górę');
  zamiar(`kopie ku znakowi ${strona} (zostało ${zostalo} kafli)`, Job.DIG, LUD.zamiarTikow);
  return true;
}

/**
 * Znak jest niedokładny: gniazdo leży na jednym z trzech torów (−1, 0, 1), oddalonych w poprzek
 * kierunku kopania o `przemyslRozstaw`. Kopacz bierze tor, którego nikt jeszcze nie sprawdził —
 * jeden trafia raz na trzy, trzech (razem albo po kolei) na pewno.
 */
function wyznaczTor(sim: Sim, c: Creature): boolean {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  // gniazdo już pokazane (sen o rycerzach, uśpiony boss) idzie pierwsze — i tor trafia w nie bez zgadywania
  const g = gniazdaWSkale(sim).sort((a, b) => (Number(!!b.znany) - Number(!!a.znany)) || (Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)))[0];
  if (!g) return false;
  let wolne = [-1, 0, 1].filter((s) => !g.proby.includes(s));
  if (!wolne.length) { g.proby = []; wolne = [-1, 0, 1]; }
  const s = wolne[sim.rng.int(wolne.length)];
  g.proby.push(s);
  const vx = g.x - cx, vy = g.y - cy, L = Math.hypot(vx, vy) || 1;
  const off = g.znany ? 0 : (s - g.blad) * LUD.przemyslRozstaw;
  const tx = Math.max(2, Math.min(w.w - 3, Math.round(g.x - (vy / L) * off) + sim.rng.int(3) - 1));
  const ty = Math.max(2, Math.min(w.przedsionekY - 6, Math.round(g.y + (vx / L) * off) + sim.rng.int(3) - 1));
  c.tor = { gn: g.id, tx, ty, hx: cx, hy: cy, sx: cx, sy: cy, kroki: 0, limit: (Math.abs(tx - cx) + Math.abs(ty - cy)) * 2 + 40 };
  c.torBledy = 0;
  // gniazdo pokazane: trasa wyliczona przez skałę (z ominięciem ognia, wody i przepaści) — zachłanny krok
  // stawał przy pierwszej przeszkodzie i w niektórych światach żadne gniazdo nie dawało się odkopać
  // (tak samo tor ku znakowi niepewnemu — do wskazanego punktu: zachłanny krok od miejsca, w którym kopacz
  // klęczał, odbijał się od pierwszej jaskini i tor kończył się po kilku kaflach; w jednym świecie trzydzieści
  // „przemyśl i kop” dało jedno gniazdo)
  {
    const px = g.znany ? g.x : tx, py = g.znany ? g.y : ty;
    // najpierw zwykłą drogą (klamry, jaskinie) jak najbliżej celu, stamtąd tunel — trasa tunelu nie
    // przechodzi nad przepaściami, a do wielu gniazd prowadzi tylko przez otwartą jaskinię
    let sx = cx, sy = cy;
    for (const D of [3, 6, 10, 15, 22]) {
      const d = szukajDrogi(sim, c, (_i, x, y) => stoi(sim, x, y) && Math.abs(x - px) + Math.abs(y - py) <= D, 8000);
      if (d && d.length) { const k = d[d.length - 1]; sx = k % w.w; sy = (k / w.w) | 0; break; }
    }
    const trasa = trasaToru(sim, sx, sy, px, py);
    if (trasa) {
      c.tor = { gn: g.id, tx, ty, hx: sx, hy: sy, sx, sy, kroki: 0, limit: trasa.length * 2 + 40, trasa, wraca: sx !== cx || sy !== cy };
    }
  }
  zapisz(sim, 'praca', `${kto(sim, c)} dostał znak: kopie ku gniazdu #${g.id}, tor ${s} (gniazdo na torze ${g.blad})`, cx, cy);
  return true;
}

/** Czy tor może przejść przez ten kafel (bez ognia, wody, rdzenia i skały nie do ruszenia). */
export function kafelToru(sim: Sim, x: number, y: number): boolean {
  const w = sim.world;
  if (x < 1 || y < 1 || x >= w.w - 1 || y >= w.h - 1) return false;
  const i = w.idx(x, y);
  if (w.magma[i] > 0 || w.water[i] > 2 || w.tile[i] === T.CORE) return false;
  if (w.solid(x, y) && w.hardness(x, y) <= 0) return false;
  if (sim.przyMagmie(x, y, K.kopanieOgienZasieg + 1) || nadOgniem(sim, x, y)) return false;
  // nie nad przepaścią: przez strop jaskini wpadał w głąb i tunel uciekał mu spod nóg
  if (w.passable(x, y + 1) && pustkaPod(sim, x, y, LUD.spadekMaks) > LUD.spadekMaks) return false;
  return Math.hypot(x - w.coreX, y - w.coreY) >= LUD.strefaRdzenia;
}

/**
 * Następny kafel tunelu ku znakowi, licząc od kafla, na którym robotnik stoi: najpierw to, co
 * zbliża (główna oś przed boczną), a ogień albo wodę obchodzi bokiem — bez zawracania na kafel,
 * z którego przyszedł. Za dużo kroków — tor się kończy.
 */
/** Remake v1: trasa tunelu do gniazda — BFS po kaflach, przez które tor może przejść (patrz `kafelToru`). */
export function trasaToru(sim: Sim, sx: number, sy: number, gx: number, gy: number): number[] | null {
  const w = sim.world, W = w.w;
  const start = w.idx(sx, sy);
  const skad = new Map<number, number>([[start, -1]]);
  const kolejka = [start];
  for (let k = 0; k < kolejka.length && k < LUD.trasaToruLimit; k++) {
    const i = kolejka[k];
    const x = i % W, y = (i / W) | 0;
    if (Math.abs(x - gx) + Math.abs(y - gy) <= LUD.gniazdoZasieg) {
      const out: number[] = [];
      for (let j = i; j !== -1; j = skad.get(j)!) out.push(j);
      return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const j = w.idx(nx, ny);
      if (skad.has(j) || !kafelToru(sim, nx, ny)) continue;
      skad.set(j, i);
      kolejka.push(j);
    }
  }
  return null;
}

function krokToru(sim: Sim, c: Creature, cx: number, cy: number): [number, number] | null {
  const t = c.tor!;
  if ((t.kroki ?? 0) > (t.limit ?? 200)) return null;
  if (t.trasa) {
    const w = sim.world;
    const k = t.trasa.indexOf(w.idx(cx, cy));
    const n = k >= 0 ? t.trasa[k + 1] : undefined;
    if (n !== undefined) {
      const nx = n % w.w, ny = (n / w.w) | 0;
      if (Math.abs(nx - cx) + Math.abs(ny - cy) === 1 && kafelToru(sim, nx, ny)) return [nx, ny];
    }
    // zszedł z trasy albo coś ją zagrodziło — wylicza ją od nowa z miejsca, w którym stoi
    const g = (sim.lud.gniazda ?? []).find((o) => o.id === t.gn);
    const nowa = g ? trasaToru(sim, cx, cy, g.x, g.y) : null;
    if (nowa && nowa.length > 1) { t.trasa = nowa; const m = nowa[1]; return [m % w.w, (m / w.w) | 0]; }
    t.trasa = undefined;
  }
  const dx = t.tx - cx, dy = t.ty - cy;
  // najpierw to, co zbliża; spośród tego — co trzyma się prostej od początku tunelu do celu
  // (schodkami „najpierw cały pion, potem poziom” tunel szedł w L i zahaczał o gniazdo z innego toru)
  const ox = t.sx ?? cx, oy = t.sy ?? cy, lx = t.tx - ox, ly = t.ty - oy, ll = Math.hypot(lx, ly) || 1;
  const odProstej = (x: number, y: number) => Math.min(2, Math.abs((x - ox) * ly - (y - oy) * lx) / ll);
  const kier: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ocena = ([sx, sy]: [number, number]) => Math.abs(dx - sx) + Math.abs(dy - sy) + odProstej(cx + sx, cy + sy) * 0.4;
  kier.sort((a, b) => ocena(a) - ocena(b));
  for (const [sx, sy] of kier) {
    const nx = cx + sx, ny = cy + sy;
    if (nx === t.px && ny === t.py) continue;
    if (t.byl && t.byl.includes(sim.world.idx(nx, ny))) continue;
    if (kafelToru(sim, nx, ny)) return [nx, ny];
  }
  return null;
}

/** Tunel ku znakowi: kopie sąsiedni kafel albo w niego wchodzi — zawsze od miejsca, w którym stoi. */
function doTor(sim: Sim, c: Creature): void {
  const w = sim.world;
  const t = c.tor!;
  if (t.wraca) {
    if (Math.abs(Math.floor(c.x) - t.hx) <= 2 && Math.abs(Math.floor(c.y) - t.hy) <= 2) { t.wraca = false; c.droga = undefined; }
    else { idz(sim, c, t.hx, t.hy, false); return; }
  }
  if (sim.tick >= (c.zamiarDo ?? 0)) { c.jt = 0; return; }   // co zamiar planer sprawdza głód i postęp
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  // wszedł na kafel, który wykopał — to teraz czoło tunelu; zsunął się gdzie indziej — wraca na czoło
  if (cx !== t.hx || cy !== t.hy) {
    (t.byl ??= []).push(w.idx(t.hx, t.hy));
    if (t.byl.length > 60) t.byl.shift();
    if (cx === c.jx && cy === c.jy && Math.abs(cx - t.hx) + Math.abs(cy - t.hy) === 1) {
      // krok liczy się tylko na nowy kafel — w pionowym szybie zsuwał się i wchodził z powrotem,
      // licznik dobijał do limitu i tor kończył się „ogień zagrodził” kilkanaście kafli przed gniazdem
      const nowy = !t.byl.includes(w.idx(cx, cy));
      t.px = t.hx; t.py = t.hy; t.hx = cx; t.hy = cy; if (nowy) t.kroki = (t.kroki ?? 0) + 1;
    } else if (Math.abs(cx - t.hx) <= 2 && Math.abs(cy - t.hy) <= 2) {
      // tuż obok czoła (zsunął się po klamrach, wrócił z jedzenia) — tunel rusza stąd
      t.hx = cx; t.hy = cy; t.px = undefined; t.py = undefined; c.jx = cx; c.jy = cy;
    } else { c.jt = 0; return; }
  }
  if (cx === t.tx && cy === t.ty) { koniecToru(sim, c, 'pusto'); return; }
  // koniec wyliczonej trasy (kończy się tuż przy celu) — dotarł
  if (t.trasa && t.trasa.length && t.trasa[t.trasa.length - 1] === w.idx(cx, cy)) { koniecToru(sim, c, 'pusto'); return; }
  // cel kroku: ten sam, dopóki go nie wykopie albo do niego nie wejdzie
  const juz = (c.jx !== cx || c.jy !== cy) && Math.abs(c.jx - cx) + Math.abs(c.jy - cy) === 1 && kafelToru(sim, c.jx, c.jy);
  if (!juz) {
    const n = krokToru(sim, c, cx, cy);
    if (!n) { koniecToru(sim, c, 'zagrodzone'); return; }
    c.jx = n[0]; c.jy = n[1]; c.dig = 0;
  }
  if (w.solid(c.jx, c.jy)) {
    // kopie nad sobą albo w bok, wisząc w szybie — trzyma się ścian, zamiast zsuwać się w dół
    if (!w.solid(cx, cy + 1) && (w.solid(cx - 1, cy) || w.solid(cx + 1, cy))) { c.wspina = sim.tick; c.vy = 0; }
    digTile(sim, c, c.jx, c.jy); return;
  }
  // w górę własnym szybem: wspina się po jego ścianach (walkTo nie sięga kafla tuż nad głową)
  if (c.jy < cy && c.jx === cx) {
    const v = RACES[c.race].speed * mnoznik(sim, c, 'szybkosc');
    c.wspina = sim.tick;
    c.x += Math.max(-v, Math.min(v, cx + 0.5 - c.x));
    c.y -= v * K.wspinanie;
    return;
  }
  // walkTo uznaje cel za osiągnięty już pół kafla przed środkiem — a stojąc na skraju kafla,
  // robotnik dalej był na starym i tunel stawał; dochodzi więc sam do środka nowego kafla
  if (walkTo(sim, c, c.jx, c.jy, false) && c.jy === cy) {
    const v = RACES[c.race].speed * mnoznik(sim, c, 'szybkosc');
    c.x += Math.max(-v, Math.min(v, c.jx + 0.5 - c.x));
  }
}

/** Koniec toru: gniazdo się obudziło, tor był pusty albo tunel zagrodził ogień. */
function koniecToru(sim: Sim, c: Creature, czemu: 'pusto' | 'zagrodzone' | 'zgubiony'): void {
  const g = (sim.lud.gniazda ?? []).find((o) => o.id === c.tor?.gn);
  c.tor = undefined; c.torBledy = 0; c.jt = 0;
  // dokopał się — gniazdo budzi się od razu, nie czeka na następne sprawdzenie
  if (g && !g.odkryte) {
    const r = LUD.gniazdoZasieg;
    for (let yy = g.y - r; yy <= g.y + r; yy++) for (let xx = g.x - r; xx <= g.x + r; xx++) {
      if (sim.world.passable(xx, yy)) { obudzGniazdo(sim, g); return; }
    }
  }
  // tunel zagrodził ogień albo woda tuż przy gnieździe — rycerze słyszą kopanie i przebijają się sami
  // (gniazda przy magmie nie dawały się odkopać wcale i w części światów rycerzy nie było przez całą grę)
  if (g && !g.odkryte && czemu === 'zagrodzone' && Math.abs(Math.floor(c.x) - g.x) + Math.abs(Math.floor(c.y) - g.y) <= LUD.gniazdoUslyszy) {
    obudzGniazdo(sim, g, podloga(sim, Math.floor(c.x), Math.floor(c.y), 3) ?? [Math.floor(c.x), Math.floor(c.y)]);
    return;
  }
  // (zagrodzić może ogień, woda albo przepaść — napis mówi, co naprawdę)
  const napis = czemu === 'pusto' ? 'tu pusto' : czemu === 'zagrodzone' ? (sim.przyMagmie(Math.floor(c.x), Math.floor(c.y), 4) ? 'ogień zagrodził' : 'nie ma którędy kopać') : 'zgubił tunel';
  sim.efekt(c.x, c.y, 'mysl', napis);
  if (czemu === 'pusto') sim.gdzie(c.x, c.y).log('Robotnik dokopał się do końca znaku — skała pusta. Inny tor może trafić.', 'swiat', 'tor-pusty');
}

/** Czy ten kafel nadaje się na korytarz: lity, w zasięgu pracy, z dala od rdzenia, ognia, wody i przepaści. */
function kafelKorytarza(sim: Sim, c: Creature, x: number, y: number): boolean {
  const w = sim.world;
  const klan = sim.clans[c.clan];
  if (!w.inb(x, y) || !w.solid(x, y) || w.hardness(x, y) <= 0) return false;
  if (!wZasieguPracy(klan, x, y) || Math.hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia) return false;
  if (sim.przyMagmie(x, y, 2)) return false;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) if (w.inb(x + k, y + j) && w.water[w.idx(x + k, y + j)] > 2) return false;
  // pod nowym kafelkiem (i obok) nie może ziać przepaść
  for (let k = -1; k <= 1; k++) if (w.inb(x + k, y) && w.passable(x + k, y + 1) && pustkaPod(sim, x + k, y, LUD.spadekMaks) > LUD.spadekMaks) return false;
  return true;
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
  if (c.droga) {
    const nast = nastepnyKafel(sim, c);
    if (nast >= 0) { krok(sim, c, nast); return false; }
    c.droga = undefined;
  }
  // Remake v1: wisi bez podłogi (zsunął się z wyliczonej drogi) i do celu jeszcze daleko — liczy drogę od nowa,
  // zamiast iść na przełaj: na przełaj wspinał się po linie pod półkę, nie umiał zrobić kroku w bok, chwyt
  // wygasał i zjeżdżał — w górę i w dół w kółko, „stojąc” przy obozie. Gdy drogi naprawdę nie ma — porzuca zamiar.
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  if (REMAKE && rolaPostaci(c) && (Math.abs(tx - cx) > 1 || Math.abs(ty - cy) > 1) && !stoi(sim, cx, cy)
      && (sim.tick + c.id) % 30 === 0 && budzetDrog() > 0) {
    const d = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1, 4000);
    if (!d) { c.jt = 0; c.droga = undefined; return false; }
    if (d.length) {
      c.droga = d; c.drogaI = 0;
      const nast = nastepnyKafel(sim, c);
      if (nast >= 0) { krok(sim, c, nast); return false; }
      c.droga = undefined;
    }
  }
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
    // po klamrach w bok też się trzyma: nad pustką puszczał się, zjeżdżał szybem w dół i wspinał
    // z powrotem — w kółko, aż umarł z głodu w połowie drogi
    if (w.drabina[w.idx(cx, cy)] === 1 || w.drabina[cel] === 1) c.wspina = sim.tick;
    c.x += dir * speed;
  }
}

/** Idzie w stronę celu; jak trzeba, wygryza sobie drogę. Tunel to ślad ich potrzeb. */
function walkTo(sim: Sim, c: Creature, tx: number, ty: number, mayDig = true): boolean {
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
  const sciana = (x: number, y: number) => w.solid(x - 1, y) || w.solid(x + 1, y) || (w.inb(x, y) && w.drabina[w.idx(x, y)] === 1);
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
  c.dig += RACES[c.race].digPower * mnoznik(sim, c, 'kopanie') * cechaNacji(sim.clans[c.clan]).kopanie * (1 + c.mad * K.kopanieOdSzalenstwa)
    * (c.tor ? LUD.przemyslTempo : 1)    // ku znakowi kopie się powoli, ostrożnie
    * (c.losowo ? LUD.losowoTempo : 1);  // rycerz z szeptem „kop losowo” kopie jak robotnik
  if (c.dig < hard * K.kopanieProg) return;
  c.dig = 0;
  // Remake v1: bez rudy i kryształów jako łupu — kopie się drogę, nie skarby
  if (t === T.CORE) { sim.reachCore(c); return; }
  w.set(x, y, T.AIR);
  sim.dug++;
  if (DZIENNIK.wlaczony) zapisz(sim, 'blok', `blok (${x}, ${y}) zniszczony: ${NAZWY_KAFLI[t] ?? t} → pustka — kopał ${kto(sim, c)}`, x, y);
}

// ------------------------------------------------------------------ zajęcia

function doWander(sim: Sim, c: Creature): void {
  // Remake v1: lud nie kopie na spacerze — chyba że zbłąkany wraca w stronę siedziby
  // (wyliczoną drogą — na przełaj „wracający do siedziby” wspinał się w ślepy szyb, zsuwał i tak w kółko, aż padł z głodu)
  // (głodny przerywa długi spacer — planer najpierw szuka jedzenia; robotnik „odchodzący spod rdzenia” doszedł
  // aż do siedziby i padł tam z głodu, wciąż w tym samym zamiarze)
  if (REMAKE && rolaPostaci(c) && c.carry === 0 && c.hunger > LUD.glodSam && (sim.tick + c.id) % 60 === 0) { c.jt = 0; return; }
  if (REMAKE && rolaPostaci(c)) { idz(sim, c, c.jx, c.jy, !wZasieguPracy(sim.clans[c.clan], c.x, c.y) || !!c.zamiar?.startsWith('wkopuje')); return; }
  walkTo(sim, c, c.jx, c.jy, sim.rng.chance(K.spacerKopie));
}

/** Remake v1: czy kafel leży w prostokącie pracy robotników wokół siedziby. */
function wZasieguPracy(klan: Sim['clans'][number], x: number, y: number): boolean {
  return Math.abs(x - klan.hx) <= LUD.robotnikZasieg.x && Math.abs(y - klan.hy) <= LUD.robotnikZasieg.y;
}

/**
 * Remake v1: gdzie robotnik zbiera grzyb i dokąd wraca — przy siedzibie albo przy spiżarni obozu
 * (siedziba na jałowej półce, a grzyb przy obozie: wszyscy robotnicy wracali do pustej siedziby
 * i lud wymierał z głodu). `zapas` poszerza strefę — kto stoi tuż przy jej skraju, już jest „u siebie”.
 */
function wStrefiePracy(sim: Sim, klan: Sim['clans'][number], x: number, y: number, zapas = 0): boolean {
  const X = LUD.robotnikZasieg.x + zapas, Y = LUD.robotnikZasieg.y + zapas;
  if (Math.abs(x - klan.hx) <= X && Math.abs(y - klan.hy) <= Y) return true;
  return sim.lud.spizarnie.some((s) => Math.abs(x - s.x) <= X && Math.abs(y - s.y) <= Y);
}

/** Remake v1: ile pustych kafli ziała pod (x, y) — do pierwszej podłogi (najwyżej limit+1). */
function pustkaPod(sim: Sim, x: number, y: number, limit: number): number {
  const w = sim.world;
  let n = 0;
  for (let yy = y + 1; yy < w.h && n <= limit; yy++) {
    if (!w.passable(x, yy)) break;
    n++;
  }
  return n;
}

/**
 * Remake v1: kafel do wykopania dla robotnika — w bok (najwyżej kafel w górę lub w dół),
 * w zasięgu pracy przy siedzibie, z dala od rdzenia, ognia i wody, i nie nad jaskinią bez dna.
 */
function celKopaniaRobotnika(sim: Sim, c: Creature, klan: Sim['clans'][number]): [number, number] | null {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  for (let proba = 0; proba < 10; proba++) {
    const dx = (sim.rng.chance(0.5) ? 1 : -1) * (1 + sim.rng.int(K.kopanieLosoweX));
    const x = cx + dx, y = cy + sim.rng.int(3) - 1;
    if (!w.inb(x, y) || !w.solid(x, y) || w.hardness(x, y) <= 0) continue;
    if (!wZasieguPracy(klan, x, y) || Math.hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia) continue;
    if (sim.przyMagmie(x, y, 2)) continue;
    // pod wykopanym kaflem nie może ziać przepaść — i pod sąsiednim też (tam stanie)
    let gleboko = false;
    for (let k = -1; k <= 1 && !gleboko; k++) {
      if (w.inb(x + k, y) && w.passable(x + k, y + 1) && pustkaPod(sim, x + k, y, LUD.spadekMaks) > LUD.spadekMaks) gleboko = true;
    }
    if (gleboko) continue;
    let woda = false;
    for (let k = -1; k <= 1 && !woda; k++) for (let j = -1; j <= 1; j++) if (w.inb(x + k, y + j) && w.water[w.idx(x + k, y + j)] > 2) { woda = true; break; }
    if (woda) continue;
    return [x, y];
  }
  return null;
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
    const kopaczDaleko = (o.kopieDroge || !!o.tor) && (najblizszaSpizarnia(sim, o.x, o.y, false) ? Math.hypot(najblizszaSpizarnia(sim, o.x, o.y, false)!.x - o.x, najblizszaSpizarnia(sim, o.x, o.y, false)!.y - o.y) > LUD.daleko : false);
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
    komu.hp = Math.min(maxHp(sim, komu), komu.hp + K.kesLeczy);
    sim.spark(komu.x, komu.y - 0.5, 'spore');
    c.dostawaDla = undefined;
    c.jt = 0;
    return;
  }
  // głodny się przesunął — droga od nowa
  if (Math.abs(c.jx - Math.floor(komu.x)) > 3 || Math.abs(c.jy - Math.floor(komu.y)) > 3) {
    c.jx = Math.floor(komu.x); c.jy = Math.floor(komu.y); c.droga = undefined;
    const droga = szukajDrogi(sim, c, (_i, x, y) => Math.abs(x - c.jx) <= 1 && Math.abs(y - c.jy) <= 1, LUD.dostawaLimit);
    if (droga) { c.droga = droga; c.drogaI = 0; }
  }
  idz(sim, c, c.jx, c.jy);
}

/** Remake v1: warta — idzie na posterunek i stoi; nie wchodzi między modlących się. */
function doWarta(sim: Sim, c: Creature): void {
  if (!wartaPotrzebna(sim)) { c.jt = 0; return; }
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 4) idz(sim, c, c.jx, c.jy, false);
  else trzymajSieNaMiejscu(sim, c);
}

function doDig(sim: Sim, c: Creature): void {
  const w = sim.world;
  // etap 2: tunel ku znakowi rządzi się własnym krokiem
  if (c.tor) { doTor(sim, c); return; }
  if (w.get(c.jx, c.jy) === T.AIR || !w.inb(c.jx, c.jy)) {
    // szept „kop losowo”: wykopany kafel — planer weźmie następny
    if (c.losowo) { c.jt = 0; return; }
    // Remake v1: korytarz — następny kafel w tę samą stronę, dopóki trwa zamiar
    if (c.korytarz && sim.tick < (c.zamiarDo ?? 0) && kafelKorytarza(sim, c, c.jx + c.korytarz, c.jy)) { c.jx += c.korytarz; c.dig = 0; return; }
    // Remake v1: droga do rdzenia — następny kafel czoła, póki trwa zamiar (głodny bez dostawy ma pierwszeństwo)
    if (c.kopieDroge && (sim.tick + c.id) % 240 === 0 && pilnieGlodny(sim, c)) { c.jt = 0; return; }
    if (c.kopieDroge && sim.tick < (c.zamiarDo ?? 0)) {
      const cz = czoloDrogi(sim);
      if (cz >= 0) { c.jx = cz % w.w; c.jy = (cz / w.w) | 0; c.dig = 0; c.droga = undefined; return; }
    }
    c.jt = 0;
    return;
  }
  // zasięg po kaflach — sąsiedni kafel, także po skosie
  const near = Math.abs(c.jx - Math.floor(c.x)) <= 1 && Math.abs(c.jy - Math.floor(c.y)) <= 1;
  // Remake v1: kopiący na linie albo przy ścianie trzyma chwyt — zsuwał się po chwili poza zasięg, wspinał
  // z powrotem i kuł ułamek sekundy (czoło drogi nad liną kopali tak po kilka minut); w pustce nic nie trzyma
  if (near && REMAKE && c.kopieDroge) c.wspina = sim.tick;
  if (near) digTile(sim, c, c.jx, c.jy);
  else idz(sim, c, c.jx, c.jy);
}

/** Remake v1: robotnik zbiera grzyb albo bierze zapasy ze starej spiżarni; potem niesie je do siedziby. */
function doZbiera(sim: Sim, c: Creature): void {
  const w = sim.world;
  if (Math.abs(c.jx - Math.floor(c.x)) > 1 || Math.abs(c.jy - Math.floor(c.y)) > 1) { idz(sim, c, c.jx, c.jy); return; }
  const sp = c.dostawaDla !== undefined || c.doObozu ? spizarniaW(sim, c.jx, c.jy) : null;
  if (sp) {
    c.carry += sp.wez(c.doObozu ? LUD.zapasPartia : LUD.przenoszenie);
  } else if (w.get(c.jx, c.jy) === T.FUNGUS) {
    w.set(c.jx, c.jy, T.AIR);
    c.carry += LUD.plon;
  }
  // niesie do siedziby: przy następnym wyborze zajęcia carry > 0 → HAUL
  c.carryT = 0;
  c.jt = 0;
}

/** Remake v1: posiłek ze spiżarni w siedzibie. */
function doZapas(sim: Sim, c: Creature): void {
  // sięga do spiżarni z dwóch kafli — siedziba na półce tuż nad głową była „osiągalna”
  // dla szukania drogi, ale nie dla nóg, i głodni stali pod nią, aż padli
  if (Math.abs(c.jx - Math.floor(c.x)) > 2 || Math.abs(c.jy - Math.floor(c.y)) > 2) {
    if (c.jt <= 1) c.bezSpizarniDo = sim.tick + LUD.spizarniaPrzerwa;   // nie doszedł — na razie szuka grzyba
    // ledwo żyje, a grzyb rośnie tuż obok drogi — zjada go po drodze (padali z głodu kilka kafli od grzybni)
    if (c.hunger > LUD.zjadaNiesione && (c.id + sim.tick) % 30 === 0) {
      const cx = Math.floor(c.x), cy = Math.floor(c.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!sim.world.inb(cx + dx, cy + dy) || sim.world.tile[sim.world.idx(cx + dx, cy + dy)] !== T.FUNGUS) continue;
        sim.world.set(cx + dx, cy + dy, T.AIR);
        sim.meals++;
        c.hunger = Math.max(0, c.hunger - K.kesGrzyba);
        return;
      }
    }
    idz(sim, c, c.jx, c.jy);
    return;
  }
  const sp = spizarniaW(sim, c.jx, c.jy);
  if (sp && sp.wez(1) > 0) {
    sim.meals++;
    c.hunger = Math.max(0, c.hunger - LUD.posilek);
    c.hp = Math.min(maxHp(sim, c), c.hp + K.kesLeczy);
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
    c.hp = Math.min(maxHp(sim, c), c.hp + K.kesLeczy);
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
    const jedzenie = sim.findFood(c.x, c.y, P.zasiegJedzenia, RACES[c.race].swims, (t) => edible(c.race, t));
    if (jedzenie) { c.job = Job.EAT; c.jx = jedzenie[0]; c.jy = jedzenie[1]; c.jt = 90; return; }
    if (c.hunger > P.glodWraca) { c.job = Job.WANDER; c.jt = 0; c.jx = sim.clans[c.clan].hx; c.jy = sim.clans[c.clan].hy; return; }
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
        if (d) { c.droga = d; c.drogaI = 0; }
      }
      if (c.droga) {
        const n = nastepnyKafel(sim, c);
        if (n >= 0) { krok(sim, c, n); return; }
        c.droga = undefined;
      }
    }
    walkTo(sim, c, c.jx, c.jy);
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
  sim.wiara += P.modlitwaWiara * sim.incomeMult();
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
  c.droga = droga ?? undefined; c.drogaI = 0;
  return true;
}

function doPray(sim: Sim, c: Creature): void {
  const w = sim.world;
  // etap 2: „Przemyśl i kop” — klęczy w miejscu i prosi o znak
  if (c.przemysl !== undefined && !c.tor) { if (sim.tick >= c.przemysl) c.jt = 0; return; }
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
  // Remake v1: swój na swojego nie idzie — cel mógł przestać być buntownikiem (nawrócony szeptem albo kartą),
  // a rycerze, którzy go gonili, dobijali potem wiernego towarzysza z warty
  if (REMAKE && rolaPostaci(c) && rolaPostaci(foe)) { sim.target.delete(c.id); c.jt = 0; return; }
  // etap 3: ze Strażnikiem Snu walczy się w rytmie ciosów, nie co tik
  if (foe.straznik || foe.buntownik || c.buntownik) {
    // etap 4: z buntownikami (i buntownicy z ludem) też w rytmie ciosów
    if (c.buntownik && foe.straznik) { sim.target.delete(c.id); c.jt = 0; return; }
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
    foe.hp -= dmg;
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
      (spizarniaW(sim, c.jx, c.jy) ?? najblizszaSpizarnia(sim, c.x, c.y, false))?.odloz(c.carry);
      c.carry = 0; c.jt = 0;
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
    if (c.y < K.ludzieWychodza) { sim.leaveWorld(c); return; }
    walkTo(sim, c, c.x + sim.rng.range(-3, 3), 2);
    return;
  }
  const ore = sim.findTile(c.x, c.y, K.ludzieRuda, (t) => t === T.ORE);
  if (ore) { c.jx = ore[0]; c.jy = ore[1]; doDig(sim, c); return; }
  walkTo(sim, c, c.x + sim.rng.range(-K.ludzieSzukajX, K.ludzieSzukajX), c.y + sim.rng.range(0, K.ludzieSzukajY));
}

export { PASSABLE };
