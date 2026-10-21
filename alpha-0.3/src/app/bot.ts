/**
 * Bot — automatyczny gracz do obserwatorium (obserwatorium.html: cztery okna gry, w każdym gra bot) i prób
 * (scripts/proby-graczy.mjs). Alpha, etap 5c: gra po nowemu — tymi samymi rozkazami co gracz:
 *  - odpowiada na karty wydarzeń; zabytki waży (bierze, gdy premia jest warta ceny w tej chwili);
 *  - karmi głodnych (ryt Nakarm), stawia Cud przy ludzie i posyła pobożnych pod pomnik;
 *  - robotnicy kopią drogę wiernych, potem kują plany pomieszczeń (kuźnia, sypialnia, warsztat), żyły żelaza
 *    i złota, pracują w kuźni i warsztacie — zawsze jeden zostaje wolny i nosi jedzenie;
 *  - rycerz zakłada części zbroi z kuźni (między falami), w walce z demonem staje między nim a pobożnymi;
 *  - ołtarz: modlitwa, gdy brakuje wiary; szał krwi na demona; wskrzeszenie poległych; ofiara krwi, gdy krwi
 *    mało (potem sen w sypialni), i ofiara życia, gdy krwi prawie nie ma (decyzja użytkownika 19.10: obie ofiary);
 *  - osłabionych posyła spać do sypialni; robotnikowi, który utknął w jamie po żyle, wiesza linę;
 *  - w walce z demonem odsyła bezbronnych od demona, a gruz po zawale rozkuwa robotnik, jeśli jest blisko;
 *  - przeciętą linę wiadra skleja ten, kto najbliżej. Dłoń anielska przychodzi sama — nie ma tu nic do zrobienia.
 * Każdy ruch zapisuje „myśl” — krótki napis pod oknem obserwatorium (myslBota).
 * Style: rozsądny (wszystko po trochu), budowniczy (wszystkie pomieszczenia i cała zbroja), speedrun (najkrócej
 * do pomnika — tylko kuźnia), bierny (nic). Wołany co BOT_CO tików symulacji; karty rozstrzyga od razu.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { Job } from '../sim/creatures';
import { rozstrzygnij } from '../sim/wydarzenia';
import { seed, sign, whisper } from '../powers/powers';
import { porcjiWWiadrach } from '../sim/wiadro';
import { wydajPolecenie, odwolajPolecenie, wydajNaprawe, wydajNaPomieszczenie } from '../sim/polecenia';
import { linaPrzecieta, sklejajacy } from '../sim/lina-wiadra';
import { STRAZNICY } from '../nastawy/straznicy';
import { czoloDrogi, nieWykopane } from '../sim/pielgrzymka';
import { stoi, szukajDrogi, budzetDrog, nowyTik } from '../sim/droga';
import { probaPlanu, polozPlan, powiesLine, kotwicaLiny, nastepnaCzesc, type Pomieszczenie } from '../sim/pomieszczenia';
import { POMIESZCZENIA, NAZWA_POMIESZCZENIA, BIERNIK_POMIESZCZENIA } from '../nastawy/pomieszczenia';
import { naWieszaku } from '../sim/zbroja';
import { kruszecKafla, type RodzajKruszcu } from '../sim/kruszce';
import { odprawRytual, czemuNie, rytualOltarza, przyOltarzu, polegli } from '../sim/oltarz';
import { NAZWA_RYTUALU, type RodzajRytualu } from '../nastawy/oltarz';
import { stanPomnika } from '../sim/pomnik';
import { procentSkorupy } from '../sim/rytual';
import { falaTrwa, wStrefieStraznikow } from '../sim/straznicy';
import { scianaGruzu } from '../sim/dlon-demona';
import { ZABYTEK, type TypZabytku } from '../nastawy/zabytki';
import { NAZWA_ROLI } from '../sim/lud';
import { wyciagnijKarte, czemuNieKarta, cenaKarty, slubuj } from '../sim/tarot';
import { arkan } from '../nastawy/tarot';
import { maTarot } from '../nastawy/wariant';

export type StylBota = 'rozsadny' | 'budowniczy' | 'speedrun' | 'bierny';

export const STYLE_BOTA: Record<StylBota, string> = {
  rozsadny: 'rozsądny',
  budowniczy: 'budowniczy',
  speedrun: 'speedrun',
  bierny: 'bierny (nic nie robi)',
};

/** Co ile tików bot się zastanawia (pół sekundy gry). */
export const BOT_CO = 60;

const M = 7200;
/** Myśl wisi pod oknem co najmniej tyle tików, zanim zastąpi ją podsumowanie. */
const MYSL_TIKOW = 900;

type Pokoj = 'kuznia' | 'warsztat' | 'sypialnia';

/** Pamięć bota w jednej partii (nie w symulacji — ta trafia do zapisu). */
interface Pamiec {
  wymarsz: number;
  mysl: string; myslOd: number;
  /** ostatnia nieudana próba położenia planu (tik) — następna najwcześniej po pół minucie */
  nieudany: Partial<Record<Pokoj, number>>;
  /** pobożny wezwany do ołtarza: po co i od kiedy */
  wezwany?: number; wezwanyCo?: RodzajRytualu; wezwanyOd?: number;
  /** rytuał odprawiony przez bota, który jeszcze trwa (po nim: odwołanie i — po ofierze krwi — sen) */
  odprawia?: { kto: number; rodzaj: RodzajRytualu };
  /** szał na demona już odprawiony w tej walce */
  szalNaDemona?: boolean;
  /** odesłani od demona (po walce bot odwołuje im rozkaz) */
  odeslani: Set<number>;
  /** walka z demonem już się zaczęła (rycerz dostał wolną rękę) — gdzie stał wtedy demon */
  oslona?: [number, number];
  /** od kiedy krwi jest mniej niż 10 i kiedy bot ostatnio sam wydał krew na rytuał */
  krewNiskoOd?: number; wydalKrewT?: number;
}
const pamieci = new WeakMap<Sim, Pamiec>();
function pamiec(sim: Sim): Pamiec {
  let p = pamieci.get(sim);
  if (!p) { p = { wymarsz: 0, mysl: '', myslOd: -1e9, nieudany: {}, odeslani: new Set() }; pamieci.set(sim, p); }
  return p;
}
/** Zapisuje myśl bota (napis pod oknem obserwatorium). */
function mysl(sim: Sim, tekst: string): void {
  const p = pamiec(sim);
  p.mysl = tekst; p.myslOd = sim.tick;
}

type C = Creature;
const zywi = (sim: Sim): C[] => sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN && !c.straznik);
const zRola = (sim: Sim, r: 'pobozny' | 'robotnik' | 'rycerz'): C[] => zywi(sim).filter((c) => (c.rola ?? 'pobozny') === r);
function role(sim: Sim): { pobozny: number; robotnik: number; rycerz: number } {
  const r = { pobozny: 0, robotnik: 0, rycerz: 0 };
  for (const c of zywi(sim)) r[(c.rola ?? 'pobozny') as keyof typeof r]++;
  return r;
}
/** Remake v2: jedzenie to porcje w wiadrach. */
function jedzenie(sim: Sim): number {
  return porcjiWWiadrach(sim);
}
const imie = (c: C): string => c.imie ? `${c.imie} (${NAZWA_ROLI[c.rola ?? 'pobozny'].toLowerCase()})` : `${NAZWA_ROLI[c.rola ?? 'pobozny'].toLowerCase()} #${c.id}`;
/** Faza końcowa: pomnik rozbity, demon wychodzi albo walczy. */
const walkaZDemonem = (sim: Sim): boolean => ['rozpada', 'wychodzi', 'walka'].includes(stanPomnika(sim).faza);
const demon = (sim: Sim): C | null => sim.creatures.find((c) => !c.dead && !!c.boss) ?? null;
const osłabiony = (sim: Sim, c: C): boolean => !!c.okaleczony || (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo);

/** Szukanie drogi poza budżetem tiku (bot myśli rzadko, a „nie było czasu szukać” to nie „nie ma drogi”). */
function droga(sim: Sim, c: C, cel: (x: number, y: number) => boolean, limit: number): number[] | null {
  const zostalo = budzetDrog();
  nowyTik(1);
  const d = szukajDrogi(sim, c, (_i, x, y) => cel(x, y), limit);
  nowyTik(zostalo);
  return d;
}

// ---------------------------------------------------------------------------------------------------- karty

/**
 * Zabytek: brać czy zostawić — premia ma być warta ceny w tej chwili (decyzja użytkownika 19.10: „waży i bierze
 * opłacalne”). Zwraca decyzję i powód (myśl bota).
 */
function wazZabytek(sim: Sim, typ: TypZabytku): [boolean, string] {
  const proc = procentSkorupy(sim);
  switch (typ) {
    case 'relikwiarz':
      // modlitwa mocniejsza, kucie wolniejsze — opłaca się, gdy droga wiernych już wykopana
      return czoloDrogi(sim) < 0 ? [true, 'droga gotowa — modlitwa ważniejsza niż kucie'] : [false, 'droga niegotowa — kucie ważniejsze'];
    case 'miecz':
      // rycerz bije mocniej, ale Ten, który patrzy, poluje częściej — tylko na ostatnią prostą
      return proc >= 70 ? [true, 'blisko demona — mocniejszy rycerz się przyda'] : [false, 'za wcześnie — Ten, który patrzy, polowałby długo'];
    case 'kielich': {
      // rany goją się szybciej, głód rośnie szybciej — gdy jedzenia dość i nikt nie głoduje
      const glodni = zywi(sim).some((c) => c.hunger > 0.5);
      return jedzenie(sim) >= 15 && !glodni ? [true, 'jedzenia dość — szybsze leczenie się opłaca'] : [false, 'za mało jedzenia — głód rósłby szybciej'];
    }
    case 'ksiega':
      // więcej wiary, ale szaleństwo głębi — gdy wiary brakuje
      return sim.wiara < 70 ? [true, 'brakuje wiary — modlitwy z księgi dadzą więcej'] : [false, 'wiary dość — szaleństwo nie jest tego warte'];
  }
  return [false, 'nie wiem, co to'];
}

/** Karta wydarzenia: rozsądny wybór, a gdy go nie stać — domyślny. Zwraca true, gdy była karta. */
export function kartaBota(sim: Sim, styl: StylBota): boolean {
  const e = sim.wydarzenia.biezace;
  if (!e) return false;
  let i = e.rozsadny;
  if (styl === 'bierny') i = e.domyslny;
  else if (e.rodzaj === 'zabytek') {
    const typ = sim.world.ruiny[e.x ?? -1]?.zabytek.typ;
    if (typ) {
      const [wez, czemu] = wazZabytek(sim, typ);
      i = wez ? 0 : 1;
      mysl(sim, `${wez ? 'biorę' : 'zostawiam'} ${ZABYTEK[typ].biernik} — ${czemu}`);
    }
  } else if (styl === 'budowniczy' && e.rodzaj === 'warta' && !pamiec(sim).wymarsz) i = 2;
  if (rozstrzygnij(sim, i) !== null) rozstrzygnij(sim, e.domyslny);
  return true;
}

// ---------------------------------------------------------------------------------------------------- pomieszczenia

const pokoj = (sim: Sim, r: Pokoj): Pomieszczenie | null => sim.pomieszczenia.find((p) => p.rodzaj === r) ?? null;
const gotowy = (sim: Sim, r: Pokoj): Pomieszczenie | null => { const p = pokoj(sim, r); return p?.gotowe ? p : null; };

/**
 * Kładzie plan pokoju jak najbliżej sali z ołtarzem: wnętrze w skale tuż obok kafla, na którym lud stoi (to wejście),
 * podłoga płaska i lita, nic pod drogą wiernych. Do wejścia musi dojść pobożny (albo rycerz) — kto nie kuje.
 */
function zalozPokoj(sim: Sim, r: Pokoj): Pomieszczenie | null {
  const p = pamiec(sim);
  if (pokoj(sim, r)) return pokoj(sim, r);
  if (sim.tick - (p.nieudany[r] ?? -1e9) < M / 2) return null;
  const w = sim.world;
  const o = w.oltarz;
  const s = POMIESZCZENIA.szablony[r];
  const kand: { x: number; y: number; ex: number; ey: number; ocena: number }[] = [];
  for (let ey = o.y - 14; ey <= o.y + 14; ey++) {
    for (let ex = o.x - 34; ex <= o.x + 34; ex++) {
      if (!w.inb(ex, ey) || !w.passable(ex, ey) || !stoi(sim, ex, ey)) continue;
      for (const k of [1, -1]) {
        const x0 = k > 0 ? ex + 1 : ex - s.w;
        const cx = x0 + Math.floor((s.w - 1) / 2);
        const pr = probaPlanu(sim, r, cx, ey);
        if (!pr.ok) continue;
        let doKucia = 0;
        for (const i of pr.kafle) if (w.solid(i % w.w, (i / w.w) | 0)) doKucia++;
        // (najbliżej ołtarza; mało kucia; nie w samym przejściu przy szybie z jedzeniem)
        kand.push({ x: cx, y: ey, ex, ey, ocena: Math.abs(ex - o.x) + 2.5 * Math.abs(ey - o.y) + 0.25 * doKucia + (Math.abs(ex - w.szybX) < 3 ? 10 : 0) });
      }
    }
  }
  kand.sort((a, b) => a.ocena - b.ocena);
  const piechur = zRola(sim, 'pobozny')[0] ?? zRola(sim, 'rycerz')[0];
  for (const k of kand.slice(0, 8)) {
    if (piechur && !droga(sim, piechur, (x, y) => Math.abs(x - k.ex) <= 1 && y === k.ey && stoi(sim, x, y), 9000)) continue;
    const pr = probaPlanu(sim, r, k.x, k.y);
    if (!pr.ok) continue;
    const pom = polozPlan(sim, pr);
    mysl(sim, `kładę plan: ${NAZWA_POMIESZCZENIA[r]} obok sali z ołtarzem`);
    return pom;
  }
  p.nieudany[r] = sim.tick;
  return null;
}

/**
 * Droga wiernych wykopana. Wcześniej bot nie kładzie planów i nie kuje żył: jamy po żyłach przy sali zmieniały
 * przebieg drogi i odcinały kopaczy od wiadra (umierali z głodu).
 */
const drogaGotowa = (sim: Sim): boolean => !!sim.planDrogi && czoloDrogi(sim) < 0;

/** Jakie pokoje ten styl chce mieć teraz (po kolei). */
function chcePokoje(sim: Sim, styl: StylBota): Pokoj[] {
  if (!drogaGotowa(sim)) return [];
  const out: Pokoj[] = ['kuznia'];
  const ktosOslabiony = zywi(sim).some((c) => osłabiony(sim, c));
  if (styl === 'budowniczy') out.push('sypialnia', 'warsztat');
  else if (styl === 'rozsadny') {
    if (ktosOslabiony || sim.krew < 45) out.push('sypialnia');
    if (sim.zloto >= 1 || sim.wiara < 60) out.push('warsztat');
  } else if (ktosOslabiony) out.push('sypialnia');
  return out;
}

// ---------------------------------------------------------------------------------------------------- robotnicy

type Zadanie = 'droga' | 'gruz' | 'plan' | 'kuznia' | 'warsztat' | 'zelazo' | 'zloto';

/** Czym robotnik zajmuje się teraz (z rozkazu) — albo null, gdy jest wolny (albo rozkaz już się wyczerpał). */
function zajecie(sim: Sim, c: C): Zadanie | null {
  const p = c.polecenie;
  if (!p) return null;
  const w = sim.world;
  if (p.typ === 'droga') return 'droga';
  if (p.typ === 'kop' && p.pom !== undefined) return 'plan';
  if (p.typ === 'kop' && p.zyla) return p.zyla === 'zelazo' ? 'zelazo' : 'zloto';
  if (p.typ === 'kop' && w.solid(p.x, p.y)) return scianaGruzu(sim)?.kafle.includes(w.idx(p.x, p.y)) ? 'gruz' : 'plan';
  if (p.typ === 'praca') {
    const pom = sim.pomieszczenia.find((q) => q.id === p.pom);
    return pom?.rodzaj === 'kuznia' ? 'kuznia' : pom?.rodzaj === 'warsztat' ? 'warsztat' : null;
  }
  return null;
}

/** Ile żelaza jeszcze trzeba na resztę zbroi (minus to, co już leży w licznikach i w opłaconej sztuce). */
function brakZelaza(sim: Sim): number {
  const kuz = pokoj(sim, 'kuznia');
  let trzeba = 0;
  for (const cz of POMIESZCZENIA.kuznia.czesci) if (!sim.zbroja.includes(cz.id)) trzeba += cz.zelazo;
  if (kuz?.zaplacone) trzeba -= nastepnaCzesc(sim)?.zelazo ?? 0;
  return Math.max(0, trzeba - sim.zelazo);
}

/**
 * Robotnik idzie na najbliższą odsłoniętą żyłę danej rudy, do której dojdzie — „kop żyłę”. Bez przekopywania się
 * przez skałę do ukrytej żyły: kopacz zostawał w zamkniętym chodniku i nie zdążył wrócić do wiadra. Dwie żyły naraz
 * nie leżą blisko siebie ani jedna pod drugą (kopacz spod spodu urywał drugiemu podłogę).
 */
function naZyle(sim: Sim, c: C, ruda: RodzajKruszcu, zajete: [number, number][]): boolean {
  const w = sim.world;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  const sciezka = sim.planDrogi ? new Set(sim.planDrogi.sciezka) : null;
  const kand: [number, number, number][] = [];
  // tylko blisko sali z wiadrem: żyły w głębi odcinały kopaczy od jedzenia
  const o = w.oltarz;
  for (let y = Math.max(1, o.y - 12); y <= Math.min(w.h - 2, o.y + 14); y++) {
    for (let x = Math.max(1, o.x - 26); x <= Math.min(w.w - 2, o.x + 26); x++) {
      if (!w.solid(x, y) || kruszecKafla(w.get(x, y)) !== ruda || w.hardness(x, y) <= 0) continue;
      if (sciezka?.has(w.idx(x, y - 1)) || wStrefieStraznikow(sim, x, y, 4)) continue;
      if (zajete.some(([zx, zy]) => Math.abs(zx - x) < 10 && Math.abs(zy - y) < 10)) continue;
      const odslonieta = w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1);
      if (!odslonieta) continue;
      kand.push([Math.abs(x - cx) + Math.abs(y - cy) * 1.3, x, y]);
    }
  }
  kand.sort((a, b) => a[0] - b[0]);
  for (const [, x, y] of kand.slice(0, 6)) {
    if (!droga(sim, c, (sx, sy) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1 && stoi(sim, sx, sy), 9000)) continue;
    if (wydajPolecenie(sim, c, 'idz', x, y) === null) {
      mysl(sim, `${imie(c)}: kop żyłę ${ruda === 'zelazo' ? 'żelaza — na zbroję rycerza' : 'złota — na krzyże w warsztacie'}`);
      return true;
    }
  }
  return false;
}

/**
 * Robotnik, który został w jamie po żyle i nie dojdzie do sali (lud wchodzi w górę najwyżej o kafel), dostaje linę:
 * hak przy krawędzi półki nad nim, lina do jego podłogi.
 */
function linaZJamy(sim: Sim, c: C): boolean {
  const w = sim.world;
  const o = w.oltarz;
  if (Math.hypot(c.x - o.x, c.y - o.y) < 8) return false;
  if (droga(sim, c, (x, y) => Math.abs(x - o.x) <= 6 && Math.abs(y - o.y) <= 2 && stoi(sim, x, y), 16000)) return false;
  const cx = Math.floor(c.x), cy = Math.floor(c.y);
  for (const dx of [0, 1, -1, 2, -2, 3, -3]) {
    const x = cx + dx;
    if (!w.inb(x, cy) || !w.passable(x, cy) || !stoi(sim, x, cy)) continue;
    let yt = cy;
    while (w.inb(x, yt - 1) && w.passable(x, yt - 1) && cy - yt < 14) yt--;
    if (cy - yt < 2) continue;
    const kot = kotwicaLiny(w, x, yt);
    if (!kot || kot.rodzaj !== 'krawedz') continue;
    const pr = probaPlanu(sim, 'lina', x, yt);
    if (!pr.ok || powiesLine(sim, pr) !== null) continue;
    mysl(sim, `wieszam linę — ${imie(c)} utknął w jamie po żyle`);
    return true;
  }
  return false;
}

/**
 * Rozdziela robotników: zawsze jeden zostaje wolny (nosi jedzenie), reszta — po kolei: droga wiernych, gruz po zawale,
 * plany pomieszczeń, kuźnia (gdy jest żelazo), warsztat (gdy jest złoto), żyły żelaza i złota.
 */
function robotnicy(sim: Sim, styl: StylBota): void {
  const w = sim.world;
  const rob = zRola(sim, 'robotnik');
  if (!rob.length) return;
  // rozkazy, które się wyczerpały: żyła wykuta (stoi w pustce), praca bez surowca, kuźnia bez potrzeby
  for (const c of rob) {
    const p = c.polecenie;
    if (!p || pamiec(sim).odeslani.has(c.id)) continue;
    const zylaWykuta = p.typ === 'kop' && !p.zyla && p.pom === undefined && !w.solid(p.x, p.y);
    const pom = p.typ === 'praca' ? sim.pomieszczenia.find((q) => q.id === p.pom) : null;
    const bezSurowca = !!pom && !!pom.brak && !pom.zaplacone && (pom.rodzaj === 'kuznia' ? sim.zelazo < (nastepnaCzesc(sim)?.zelazo ?? 99) : sim.zloto < 1);
    // (górnik daleko od wiadra: głodny wraca, zanim będzie za późno; żyła — najwyżej kilka kafli naraz)
    const gornik = p.typ === 'kop' && (!!p.zyla || p.pom !== undefined);
    const wraca = gornik && (c.hunger > 0.45 || (p.zylaIle ?? 0) >= 8);
    if (zylaWykuta || bezSurowca || wraca || (p.typ === 'idz' && !walkaZDemonem(sim))) {
      odwolajPolecenie(sim, c);
      if (zylaWykuta) linaZJamy(sim, c);
    }
  }
  const potrzeby: Zadanie[] = [];
  const kuz = pokoj(sim, 'kuznia'), war = pokoj(sim, 'warsztat');
  if (czoloDrogi(sim) >= 0) potrzeby.push('droga', 'droga');
  const sc = scianaGruzu(sim);
  if (sc && walkaZDemonem(sim)) potrzeby.push('gruz');
  const poDrodze = drogaGotowa(sim);
  if (poDrodze) for (const pom of sim.pomieszczenia) if (!pom.gotowe && (pom.rodzaj === 'kuznia' || pom.rodzaj === 'warsztat' || pom.rodzaj === 'sypialnia')) potrzeby.push('plan', 'plan');
  const czesc = nastepnaCzesc(sim);
  if (kuz?.gotowe && czesc && (kuz.zaplacone || sim.zelazo >= czesc.zelazo)) potrzeby.push('kuznia');
  if (war?.gotowe && sim.zloto >= 1) potrzeby.push('warsztat');
  if (poDrodze && kuz && brakZelaza(sim) > 0) potrzeby.push('zelazo', 'zelazo');
  if (poDrodze && war && styl !== 'speedrun' && sim.zloto < 3) potrzeby.push('zloto');
  // ilu naraz: wszyscy poza jednym (ten nosi jedzenie); gdy pobożni modlą się pod pomnikiem — poza dwoma (jedzenie trzeba
  // nosić do krypty: bez tego rycerz i pobożni umierali z głodu); w walce z demonem — tylko gruz
  const podPomnikiem = zRola(sim, 'pobozny').some((c) => c.job === Job.PIELGRZYM || wStrefieStraznikow(sim, c.x, c.y));
  const limit = Math.max(0, rob.length - (podPomnikiem && czoloDrogi(sim) < 0 ? 2 : 1));
  const ile = new Map<Zadanie, number>();
  let zajetych = 0;
  for (const c of rob) { const z = zajecie(sim, c); if (z) { ile.set(z, (ile.get(z) ?? 0) + 1); zajetych++; } }
  const chce = new Map<Zadanie, number>();
  for (const z of potrzeby) chce.set(z, (chce.get(z) ?? 0) + 1);
  const zyly: [number, number][] = rob.filter((c) => c.polecenie?.zyla).map((c) => [c.polecenie!.x, c.polecenie!.y]);
  const wolni = rob.filter((c) => !c.polecenie && c.hunger < 0.4 && !(c.odmowa && sim.tick - c.odmowa.od < M / 2) && !c.wDloni && !c.lot)
    .sort((a, b) => a.hunger - b.hunger);
  for (const c of wolni) {
    if (zajetych >= limit) break;
    if (walkaZDemonem(sim) && !(sc && (ile.get('gruz') ?? 0) < 1)) break;
    const z = [...new Set(potrzeby)].find((q) => (ile.get(q) ?? 0) < (chce.get(q) ?? 0));
    if (!z) break;
    let ok = false;
    if (z === 'droga') {
      ok = wydajPolecenie(sim, c, 'droga', 0, 0) === null;
      if (ok) mysl(sim, `${imie(c)}: kop drogę wiernych — zostało ${nieWykopane(sim).length} kafli`);
    } else if (z === 'gruz' && sc) {
      // tylko ten, kto jest blisko — zanim dojdzie z góry, gruz i tak się rozsypie
      const k = sc.kafle.find((i) => w.solid(i % w.w, (i / w.w) | 0));
      if (k !== undefined && Math.hypot(c.x - sc.x, c.y - sc.dno) < 30) {
        ok = wydajPolecenie(sim, c, 'idz', k % w.w, (k / w.w) | 0) === null;
        if (ok) mysl(sim, `${imie(c)} rozkuwa gruz po zawale — demon jest odcięty`);
      }
    } else if (z === 'plan') {
      const pom = sim.pomieszczenia.find((q) => !q.gotowe && (q.rodzaj === 'kuznia' || q.rodzaj === 'warsztat' || q.rodzaj === 'sypialnia'));
      if (pom) {
        ok = wydajNaPomieszczenie(sim, [c.id], pom).przyjeli > 0;
        if (ok) mysl(sim, `${imie(c)} kuje ${BIERNIK_POMIESZCZENIA[pom.rodzaj]}`);
      }
    } else if (z === 'kuznia' && kuz) {
      ok = wydajNaPomieszczenie(sim, [c.id], kuz).przyjeli > 0;
      if (ok) mysl(sim, `${imie(c)} kuje ${czesc?.nazwa ?? 'zbroję'} dla rycerza`);
    } else if (z === 'warsztat' && war) {
      ok = wydajNaPomieszczenie(sim, [c.id], war).przyjeli > 0;
      if (ok) mysl(sim, `${imie(c)} robi krzyże ze złota — będzie wiara`);
    } else if (z === 'zelazo' || z === 'zloto') {
      ok = naZyle(sim, c, z, zyly);
      if (ok) zyly.push([c.polecenie!.x, c.polecenie!.y]);
    }
    // (gdy się nie udało — ta potrzeba czeka do następnego razu; inny robotnik weźmie następną)
    if (ok) { ile.set(z, (ile.get(z) ?? 0) + 1); zajetych++; }
    else chce.set(z, 0);
  }
}

// ---------------------------------------------------------------------------------------------------- rycerz

/**
 * Alpha: rycerz jest jeden. Gdy trwa fala Strażników, a on stoi daleko od przedsionka (pilnuje obozu na górze),
 * bot posyła go pod pomnik; po fali odwołuje rozkaz — rycerz wraca do warty przy pobożnych.
 */
function rycerzNaFale(sim: Sim): void {
  const w = sim.world;
  const fala = !!sim.lud.straznicy?.trwa;
  for (const c of zRola(sim, 'rycerz')) {
    if (walkaZDemonem(sim)) continue;
    const daleko = Math.hypot(c.x - w.coreX, c.y - w.przedsionekY) > STRAZNICY.rycerzWidzi * 0.75;
    if (fala && daleko && (!c.polecenie || c.polecenie.typ === 'zbroja') && !(c.odmowa && sim.tick - c.odmowa.od < M / 2)) {
      if (wydajPolecenie(sim, c, 'idz', w.coreX + (c.id % 2 ? -6 : 6), w.przedsionekY) === null) mysl(sim, 'fala Strażników — rycerz biegnie pod pomnik');
    } else if (!fala && c.polecenie?.typ === 'idz') odwolajPolecenie(sim, c);
  }
}

/** Części zbroi wiszą na wieszaku w kuźni — rycerz idzie je założyć (między falami, przed demonem). */
function rycerzPoZbroje(sim: Sim): void {
  const kuz = gotowy(sim, 'kuznia');
  const wisi = naWieszaku(sim);
  if (!kuz || !wisi.length || falaTrwa(sim) || walkaZDemonem(sim) || procentSkorupy(sim) >= 97) return;
  for (const c of zRola(sim, 'rycerz')) {
    if (c.polecenie || c.hunger > 0.6 || (c.odmowa && sim.tick - c.odmowa.od < M / 2)) continue;
    if (wydajNaPomieszczenie(sim, [c.id], kuz).przyjeli > 0) {
      mysl(sim, `rycerz idzie do kuźni założyć: ${wisi.map((cz) => POMIESZCZENIA.kuznia.czesci.find((q) => q.id === cz)?.nazwa ?? cz).join(', ')}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------------- walka z demonem

/**
 * Walka z demonem: rycerz staje między demonem a pobożnymi (demon idzie na bezbronnych), robotnicy i pobożni
 * bez zajęcia odchodzą od demona w górę drogi wiernych. Po walce bot odwołuje te rozkazy.
 */
function walka(sim: Sim): void {
  const p = pamiec(sim);
  const w = sim.world;
  if (!walkaZDemonem(sim)) {
    if (p.odeslani.size) {
      for (const id of p.odeslani) { const c = sim.creatureById(id); if (c && !c.dead && c.polecenie?.typ === 'idz') odwolajPolecenie(sim, c); }
      p.odeslani.clear();
    }
    p.oslona = undefined;
    return;
  }
  const d = demon(sim);
  const dx = d ? d.x : w.coreX + 0.5, dy = d ? d.y : w.coreY;
  // bezbronni blisko demona — w górę, na bezpieczną odległość
  const salaX = w.oltarz.x, salaY = w.oltarz.y;
  for (const c of zywi(sim)) {
    const r = c.rola ?? 'pobozny';
    if (r === 'rycerz' || p.odeslani.has(c.id) || c.wDloni || c.lot) continue;
    if (p.wezwany === c.id || p.odprawia?.kto === c.id) continue;
    if (c.polecenie && c.polecenie.typ !== 'idz' && zajecie(sim, c) !== null) continue;
    if (Math.hypot(c.x - dx, c.y - dy) > 24) continue;
    if (wydajPolecenie(sim, c, 'idz', salaX + (c.id % 2 ? -8 : 8), salaY) === null) {
      p.odeslani.add(c.id);
      mysl(sim, `${imie(c)} odchodzi od demona — nie ma czym walczyć`);
    }
  }
  // rycerz: bez rozkazów — sam idzie na demona i bije go najszybciej (posterunek z rozkazu wydłużał walkę);
  // osłoną dla pobożnych jest to, że odeszli od demona, a rycerz zostaje między nim a drogą w górę
  for (const c of zRola(sim, 'rycerz')) {
    if (c.polecenie?.typ === 'idz' || c.polecenie?.typ === 'zbroja') {
      odwolajPolecenie(sim, c);
      if (!p.oslona) { p.oslona = [Math.round(dx), Math.round(dy)]; mysl(sim, 'rycerz rusza na demona — bezbronni odchodzą w górę drogi'); }
    }
  }
}

// ---------------------------------------------------------------------------------------------------- ołtarz

/** Najbliższy ołtarza pobożny, który nie jest okaleczony (do ofiary krwi) — albo null. */
function pobozny(sim: Sim, rodzaj: RodzajRytualu, tylkoBlisko: boolean): C | null {
  const o = sim.world.oltarz;
  const lista = zRola(sim, 'pobozny').filter((c) => !c.wDloni && !c.lot && (rodzaj !== 'ofiaraKrwi' || !c.okaleczony))
    .filter((c) => !tylkoBlisko || (Math.hypot(c.x - o.x, c.y - o.y) < 22 && c.job !== Job.PIELGRZYM))
    .sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y));
  return lista[0] ?? null;
}

/** Jakiego rytuału trzeba teraz (i czy wolno w tym celu ściągnąć pobożnego z daleka). */
function potrzebnyRytual(sim: Sim, styl: StylBota): { rodzaj: RodzajRytualu; zDaleka: boolean; czemu: string } | null {
  const wolna = sim.krew - sim.rezerwa.krew;
  const proc = procentSkorupy(sim);
  const faza = stanPomnika(sim).faza;
  const ryc = zRola(sim, 'rycerz')[0];
  // szał krwi na demona: pobożny czeka przy ołtarzu od ~92%, rytuał rusza, gdy pomnik pęknie
  if (styl !== 'speedrun' && ryc && !pamiec(sim).szalNaDemona && (faza === 'rozpada' || faza === 'wychodzi' || faza === 'walka') && wolna >= 30) {
    return { rodzaj: 'szal', zDaleka: true, czemu: 'szał krwi — rycerz uderzy mocniej w demona' };
  }
  // wskrzeszenie: ktoś poległ, a jego ciało jeszcze leży
  const trup = polegli(sim)[0];
  if (trup && wolna >= 100 && !walkaZDemonem(sim)) return { rodzaj: 'wskrzeszenie', zDaleka: true, czemu: `wskrzeszam poległego (${NAZWA_ROLI[trup.rola].toLowerCase()} #${trup.id})` };
  // ofiara życia, gdy krwi prawie nie ma (decyzja użytkownika: także ta ofiara) — ołtarz nie przyjmie ostatniego
  const p = pamiec(sim);
  if (sim.krew < 10 && sim.tick - (p.krewNiskoOd ?? sim.tick) > M && sim.tick - (p.wydalKrewT ?? -1e9) > 2 * M && role(sim).pobozny >= 2 && proc < 60) return { rodzaj: 'ofiaraZycia', zDaleka: false, czemu: 'krwi prawie nie ma — pobożny oddaje życie na ołtarzu' };
  // ofiara krwi, gdy krwi mało, a jest gdzie potem się wyspać
  if (sim.krew < 30 && gotowy(sim, 'sypialnia')) return { rodzaj: 'ofiaraKrwi', zDaleka: false, czemu: 'krwi mało — ofiara krwi, potem sen w sypialni' };
  // modlitwa, gdy wiary brakuje, a krwi jest zapas — tylko pobożny, który i tak jest na górze
  if (sim.wiara < 40 && wolna >= 70 && styl !== 'speedrun' && drogaGotowa(sim)) return { rodzaj: 'modlitwa', zDaleka: false, czemu: 'brakuje wiary — modlitwa przy ołtarzu' };
  return null;
}

/**
 * Ołtarz: wzywa pobożnego (rozkaz „idź” pod ołtarz), a gdy stanie przy nim — odprawia rytuał. Po rytuale odwołuje
 * rozkaz (pobożny wraca do swoich zajęć), a po ofierze krwi posyła go spać do sypialni.
 */
function oltarz(sim: Sim, styl: StylBota): void {
  const p = pamiec(sim);
  const o = sim.world.oltarz;
  const r = rytualOltarza(sim);
  // rytuał bota się skończył
  if (p.odprawia && !r) {
    const c = sim.creatureById(p.odprawia.kto);
    if (p.odprawia.rodzaj === 'szal') p.szalNaDemona = true;
    if (c && !c.dead) {
      if (c.polecenie?.typ === 'idz') odwolajPolecenie(sim, c);
      const syp = gotowy(sim, 'sypialnia');
      if (p.odprawia.rodzaj === 'ofiaraKrwi' && syp && wydajNaPomieszczenie(sim, [c.id], syp).przyjeli > 0) mysl(sim, `${imie(c)} idzie spać — sen zdejmie okaleczenie`);
    }
    p.odprawia = undefined;
  }
  if (sim.krew < 10) p.krewNiskoOd ??= sim.tick; else p.krewNiskoOd = undefined;
  if (r) return;
  // szał na demona: pobożny czeka przy ołtarzu już od ~92% (z krypty do sali jest daleko)
  const potrzeba = potrzebnyRytual(sim, styl);
  const czekaNaSzal = styl !== 'speedrun' && !p.szalNaDemona && procentSkorupy(sim) >= 92 && stanPomnika(sim).faza === 'stoi' && sim.krew - sim.rezerwa.krew >= 30;
  const rodzaj: RodzajRytualu | null = potrzeba?.rodzaj ?? (czekaNaSzal ? 'szal' : null);
  // wezwany: czy jeszcze potrzebny
  if (p.wezwany !== undefined) {
    const c = sim.creatureById(p.wezwany);
    const zaDlugo = sim.tick - (p.wezwanyOd ?? 0) > 3 * M;
    if (!c || c.dead || !rodzaj || zaDlugo || c.polecenie?.typ !== 'idz') {
      if (c && !c.dead && c.polecenie?.typ === 'idz') odwolajPolecenie(sim, c);
      p.wezwany = undefined;
    }
  }
  if (!rodzaj) return;
  // już przy ołtarzu? — odpraw (szał czeka, aż pomnik pęknie)
  const c = p.wezwany !== undefined ? sim.creatureById(p.wezwany) : null;
  const ten = c && !c.dead && przyOltarzu(sim, c) ? c : zRola(sim, 'pobozny').find((q) => przyOltarzu(sim, q) && (rodzaj !== 'ofiaraKrwi' || !q.okaleczony)) ?? null;
  if (ten && potrzeba) {
    const cel = rodzaj === 'wskrzeszenie' ? polegli(sim)[0]?.id : undefined;
    if (czemuNie(sim, rodzaj, cel) === null && odprawRytual(sim, rodzaj, cel, ten.id) === null) {
      p.odprawia = { kto: ten.id, rodzaj };
      if (rodzaj === 'modlitwa' || rodzaj === 'szal' || rodzaj === 'wskrzeszenie') p.wydalKrewT = sim.tick;
      mysl(sim, `${NAZWA_RYTUALU[rodzaj]} przy ołtarzu — ${potrzeba.czemu}`);
    }
    return;
  }
  if (ten || p.wezwany !== undefined) return;
  // wezwij pobożnego
  const zDaleka = potrzeba ? potrzeba.zDaleka : true;
  const kto = pobozny(sim, rodzaj, !zDaleka);
  if (!kto) return;
  const s = kto.x < o.x + 0.5 ? -1 : 1;
  if (wydajPolecenie(sim, kto, 'idz', o.x + 2 * s, o.y) === null) {
    p.wezwany = kto.id; p.wezwanyCo = rodzaj; p.wezwanyOd = sim.tick;
    mysl(sim, rodzaj === 'szal' && !potrzeba ? `${imie(kto)} idzie do ołtarza — czeka z szałem krwi na demona`
      : `${imie(kto)} idzie do ołtarza: ${NAZWA_RYTUALU[rodzaj].toLowerCase()}`);
  }
}

// ---------------------------------------------------------------------------------------------------- sen

/** Osłabionych (okaleczenie, zatrucie) bot posyła spać do sypialni — między falami, nie w walce z demonem. */
function sen(sim: Sim): void {
  const syp = gotowy(sim, 'sypialnia');
  if (!syp || falaTrwa(sim) || walkaZDemonem(sim)) return;
  const p = pamiec(sim);
  const spia = sim.creatures.filter((c) => !c.dead && c.polecenie?.typ === 'sen').length;
  if (spia >= 2) return;
  for (const c of zywi(sim)) {
    if (!osłabiony(sim, c) || c.polecenie || c.hunger > 0.5 || p.wezwany === c.id || p.odprawia?.kto === c.id) continue;
    if (wydajNaPomieszczenie(sim, [c.id], syp).przyjeli > 0) { mysl(sim, `${imie(c)} idzie spać do sypialni — sen zdejmie osłabienie`); return; }
  }
}

// ---------------------------------------------------------------------------------------------------- jedzenie, wiara, pielgrzymka

/** Wiadro najgłodniejszemu (ryt Nakarm). */
function nakarm(sim: Sim, prog: number, krewOd: number): void {
  let najg: C | null = null;
  for (const c of zywi(sim)) if (c.hunger >= prog && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > krewOd && seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y))) mysl(sim, `Nakarm — wiadro dla głodnego (${imie(najg)})`);
}

/** Cud przy ludzie — oddanie rośnie, a z nim rytuał pod pomnikiem. */
function cud(sim: Sim, wiaraOd: number, oddanieDo: number): void {
  const k = sim.clans.find((x) => !x.dead && x.race === Race.GOBLIN);
  if (k && k.devotion < oddanieDo && sim.wiara >= wiaraOd && sign(sim, 'objawienie', k.hx, k.hy)) mysl(sim, 'Cud przy ludzie — oddanie rośnie');
}

/** „Módl się”: pobożni idą pod pomnik (nie ten, który czeka przy ołtarzu, ani ten, kto śpi). */
function dopomnika(sim: Sim, maxGlod: number): void {
  const p = pamiec(sim);
  let poslal = 0;
  for (const c of zRola(sim, 'pobozny')) {
    if (c.job === Job.PIELGRZYM || c.wyprawa || c.hunger > maxGlod || sim.wiara < 8) continue;
    if (c.polecenie || p.wezwany === c.id || p.odprawia?.kto === c.id || p.odeslani.has(c.id)) continue;
    if (whisper(sim, 'modl', c)) poslal++;
  }
  if (poslal) mysl(sim, `pobożni schodzą pod pomnik i się modlą (${procentSkorupy(sim)}%)`);
}

function rozsadny(sim: Sim, k: number): void {
  const w = sim.world;
  nakarm(sim, 0.6, 70);
  // wiadro nad przedsionkiem, żeby warta pod pomnikiem miała co jeść
  if (k % 15 === 0 && sim.krew > 60 && sim.jedzeniePrzedsionka < 3 && seed(sim, 'grzyb', w.coreX, w.przedsionekY)) mysl(sim, 'Nakarm — wiadro dla warty pod pomnikiem');
  if (k % 20 === 0) cud(sim, 35, 0.7);
  if (k % 10 === 0 && !sim.rytual.otwarta && sim.jedzeniePrzedsionka >= 3) dopomnika(sim, 0.35);
}

function budowniczy(sim: Sim, k: number): void {
  const p = pamiec(sim);
  if (k % 10 === 0) nakarm(sim, 0.65, 60);
  if (k % 40 === 0) cud(sim, 70, 0.9);
  // wymarsz pod pomnik, gdy droga gotowa i jest co jeść (albo po 8 minutach)
  if (!p.wymarsz) {
    const gotowy = jedzenie(sim) >= 12 && sim.krew >= 40 && czoloDrogi(sim) < 0;
    if (gotowy || sim.tick > 8 * M) { p.wymarsz = sim.tick; mysl(sim, 'wymarsz — pobożni schodzą pod pomnik'); }
  }
  if (p.wymarsz && k % 10 === 0) dopomnika(sim, 0.5);
}

function speedrun(sim: Sim, k: number): void {
  if (k % 10 === 0) nakarm(sim, 0.65, 60);
  if (k % 20 === 0) cud(sim, 30, 0.95);
  if (k % 10 === 0) dopomnika(sim, 1);
}

/** Etap 4: przecięta lina wiadra — po chwili (jak gracz, który to zauważył) najbliższy idzie ją skleić. */
function naprawLine(sim: Sim): void {
  const lp = linaPrzecieta(sim);
  if (!lp || sim.tick - lp.od < 8 * 120 || sklejajacy(sim)) return;
  if (sim.creatures.some((c) => !c.dead && c.polecenie?.typ === 'naprawa')) return;
  const r = wydajNaprawe(sim, []);
  if (r.kto) mysl(sim, `dłoń przecięła linę wiadra — ${imie(r.kto)} idzie ją skleić`);
}

/** Alpha 0.3 (wizja Pawła): który ślub bot składa na starcie partii. */
export function slubBota(styl: StylBota): string {
  return styl === 'speedrun' ? 'cisza' : styl === 'budowniczy' ? 'glod' : 'ogien';
}

/** Alpha 0.3 (wizja Pawła): bot zakłada drużynę — ślub na starcie (wołane raz, po nowej partii). */
export function zalozBota(sim: Sim, styl: StylBota): void {
  if (sim.lud.druzyna && maTarot(sim.lud.druzyna.wariant) && !sim.lud.druzyna.slub && styl !== 'bierny') slubuj(sim, slubBota(styl));
}

/** Alpha 0.3 (wizja Pawła): ciągnie kartę z talii, gdy wiary jest z zapasem (hazard — nie wie, co wypadnie). */
function tarot(sim: Sim, styl: StylBota): void {
  if (!sim.lud.druzyna || !maTarot(sim.lud.druzyna.wariant) || czemuNieKarta(sim)) return;
  // zapas wiary na Cud i szepty — karta to hazard, nie powinna zjadać wiary potrzebnej do oddania
  const zapas = styl === 'speedrun' ? 60 : styl === 'budowniczy' ? 100 : 80;
  if (sim.wiara < cenaKarty(sim) + zapas) return;
  const k = wyciagnijKarte(sim);
  if (typeof k !== 'string') mysl(sim, `karta z talii — ${arkan(k.arkan)?.nazwa ?? '?'}${k.odwrocona ? ' (odwrócona)' : ''}`);
}

// ---------------------------------------------------------------------------------------------------- ruch i myśl

/** Jeden ruch bota (co BOT_CO tików). */
export function ruchBota(sim: Sim, styl: StylBota): void {
  if (sim.ending) return;
  if (kartaBota(sim, styl)) return;
  if (styl === 'bierny') return;
  const k = Math.floor(sim.tick / BOT_CO);
  naprawLine(sim);
  walka(sim);
  if (k % 2 === 0) oltarz(sim, styl);
  if (k % 5 === 0) {
    for (const r of chcePokoje(sim, styl)) { if (!pokoj(sim, r)) { zalozPokoj(sim, r); break; } }
    robotnicy(sim, styl);
  }
  if (k % 10 === 5) { rycerzNaFale(sim); rycerzPoZbroje(sim); sen(sim); }
  if (k % 10 === 3) tarot(sim, styl);
  if (styl === 'budowniczy') budowniczy(sim, k);
  else if (styl === 'speedrun') speedrun(sim, k);
  else rozsadny(sim, k);
}

/** Ostatnia decyzja bota i kiedy zapadła (dziennik prób). */
export function decyzjaBota(sim: Sim): { tekst: string; od: number } {
  const p = pamiec(sim);
  return { tekst: p.mysl, od: p.myslOd };
}

/** Napis pod oknem obserwatorium: ostatnia decyzja bota, a gdy dawno nic — co się teraz dzieje. */
export function myslBota(sim: Sim, styl: StylBota): string {
  if (styl === 'bierny') return 'bot nic nie robi — patrzy';
  if (sim.ending) return '';
  const p = pamiec(sim);
  if (p.mysl && sim.tick - p.myslOd < MYSL_TIKOW) return p.mysl;
  const faza = stanPomnika(sim).faza;
  if (faza === 'walka' || faza === 'wychodzi' || faza === 'rozpada') return 'walka z demonem — rycerz na demona, reszta z dala';
  if (falaTrwa(sim)) return 'fala Strażników — rycerz broni pobożnych pod pomnikiem';
  if (czoloDrogi(sim) >= 0) return `kopiemy drogę wiernych — zostało ${nieWykopane(sim).length} kafli`;
  if (styl === 'budowniczy' && !p.wymarsz) return 'przygotowania przed wymarszem pod pomnik';
  const kuz = pokoj(sim, 'kuznia');
  const zbroja = `zbroja ${sim.zbroja.length}/${POMIESZCZENIA.kuznia.czesci.length}`;
  return `pobożni kruszą pomnik — ${procentSkorupy(sim)}%${kuz ? ` · ${zbroja}` : ''}`;
}
