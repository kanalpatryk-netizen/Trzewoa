/**
 * OŁTARZ (Alpha, etap 3d) — rytuały przy kamiennym ołtarzu na środku sali (world.oltarz).
 *
 *  - Rytuał odprawia pobożny, który stoi przy ołtarzu (OLTARZ.przyX/przyY). Gracz wybiera rytuał w oknie ołtarza;
 *    krew płaci się od razu, a pobożny klęczy przy ołtarzu, aż skończy. Odejdzie albo zginie — rytuał przerwany,
 *    krew wraca.
 *  - Modlitwa: wiara rośnie przez cały rytuał. Szał krwi: rycerz (albo robotnik w hełmie, gdy rycerza brak) bije
 *    mocniej przez minutę. Wskrzeszenie: poległy, którego ciało jeszcze leży, wstaje przy ołtarzu — ten sam
 *    (ten sam numer, więc i ta sama twarz). Ofiara krwi: pobożny okalecza się (krew, osłabienie do snu w sypialni).
 *    Ofiara życia: pobożny oddaje życie (krew); ostatniego pobożnego ołtarz nie przyjmie.
 * Stan trzyma sim.lud.oltarz (idzie do zapisu); rysunek czyta stan i krótką listę zdarzeń sim.zdarzeniaOltarza
 * (render/oltarz.ts). Liczby: src/nastawy/oltarz.ts.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { makeCreature } from './creatures';
import { Race } from './races';
import { stoi } from './droga';
import { kto, zapisz } from './dziennik';
import { rolaPostaci, walczacy, nadajRole, liczRole, klanLudu, maxHp } from './lud';
import { LUD } from '../nastawy/lud';
import { GORA } from '../nastawy/gora';
import { OLTARZ as O, NAZWA_RYTUALU, type RodzajRytualu } from '../nastawy/oltarz';
import { maHak, perkZadzialal, wyzwol, wstalaOsoba, ktoTo, rodzaj } from './druzyna';
import { PERK } from '../nastawy/perki';

export interface RytualOltarza {
  rodzaj: RodzajRytualu;
  /** pobożny, który odprawia */
  kto: number;
  od: number;
  do: number;
  /** zapłacona krew — wraca, gdy rytuał przerwany */
  krew: number;
  /** wskrzeszenie: numer poległego (jego ciała); szał: numer rycerza */
  cel?: number;
  /** modlitwa: ile wiary już spłynęło */
  wiaraDana?: number;
  /** od kiedy odprawiający stoi z dala od ołtarza */
  poza?: number;
}

export interface StanOltarza {
  rytual?: RytualOltarza;
  /** ile rytuałów odprawiono (kronika, atlas) */
  odprawionych?: number;
}

/** Zdarzenie dla rysunku (nie idzie do zapisu): rytuał ruszył, skończył się albo go przerwano. */
export interface ZdarzenieOltarza {
  rodzaj: RodzajRytualu;
  faza: 'start' | 'koniec' | 'przerwany';
  kto: number;
  cel?: number;
  /** gdzie był cel (ciało poległego, rycerz) */
  cx?: number; cy?: number;
  tik: number;
}

/** Kafel ołtarza (stoi na nim; pod nim kamienny kopczyk). */
export function kafelOltarza(sim: Sim): { x: number; y: number } {
  return sim.world.oltarz;
}

/** Czy postać stoi przy ołtarzu. */
export function przyOltarzu(sim: Sim, c: Creature): boolean {
  const o = sim.world.oltarz;
  return !c.dead && Math.abs(c.x - (o.x + 0.5)) <= O.przyX && Math.abs(Math.floor(c.y) - o.y) <= O.przyY;
}

/** Pobożni przy ołtarzu — najpierw ci, którzy się do niego modlą z rozkazu (najbliżsi pierwsi). */
export function pobozniPrzyOltarzu(sim: Sim): Creature[] {
  const o = sim.world.oltarz;
  return sim.creatures
    .filter((c) => !c.dead && rolaPostaci(c) === 'pobozny' && przyOltarzu(sim, c) && stoi(sim, Math.floor(c.x), Math.floor(c.y)))
    .sort((a, b) => Math.abs(a.x - o.x - 0.5) - Math.abs(b.x - o.x - 0.5));
}

/** Kto odprawi rytuał: pobożny przy ołtarzu (do ofiary krwi — nieokaleczony). */
function odprawiajacy(sim: Sim, rodzaj: RodzajRytualu, wolany?: number): Creature | null {
  const lista = pobozniPrzyOltarzu(sim).filter((c) => rodzaj !== 'ofiaraKrwi' || !c.okaleczony);
  return lista.find((c) => c.id === wolany) ?? lista[0] ?? null;
}

/** Trwający rytuał (albo null). */
export function rytualOltarza(sim: Sim): RytualOltarza | null {
  return sim.lud.oltarz?.rytual ?? null;
}

/** Czy ta postać właśnie odprawia rytuał (planer ludu trzyma ją wtedy przy ołtarzu). */
export function odprawia(sim: Sim, c: Creature): RytualOltarza | null {
  const r = rytualOltarza(sim);
  return r && r.kto === c.id ? r : null;
}

/** Polegli, których ciała jeszcze leżą — do wyboru przy wskrzeszeniu (najświeżsi pierwsi). */
export function polegli(sim: Sim): NonNullable<Sim['lud']['trupy']> {
  return [...(sim.lud.trupy ?? [])].sort((a, b) => b.od - a.od);
}

/** Kogo rozpali szał krwi: rycerz, a gdy rycerza brak — robotnik w hełmie. */
function celSzalu(sim: Sim): Creature | null {
  const lud = sim.creatures.filter((c) => !c.dead && walczacy(c));
  return lud.find((c) => rolaPostaci(c) === 'rycerz') ?? lud[0] ?? null;
}

/** Cena rytuału we krwi. */
export function cenaRytualu(rodzaj: RodzajRytualu): number {
  return O.rytualy[rodzaj].krew;
}

/** Ile krwi da ofiara (0 — rytuał nic nie daje we krwi). */
export function krewZOfiary(rodzaj: RodzajRytualu): number {
  return rodzaj === 'ofiaraKrwi' ? LUD.okaleczenieKrew : rodzaj === 'ofiaraZycia' ? LUD.ofiaraKrew : 0;
}

/**
 * Czy da się teraz odprawić rytuał — null albo powód, czemu nie (podpis w oknie ołtarza).
 * `cel` przy wskrzeszeniu to numer poległego.
 */
export function czemuNie(sim: Sim, rodzaj: RodzajRytualu, cel?: number): string | null {
  if (sim.ending) return 'gra skończona';
  if (rytualOltarza(sim)) return 'trwa już inny rytuał';
  if (!pobozniPrzyOltarzu(sim).length) return 'przy ołtarzu nie stoi żaden pobożny';
  const cena = cenaRytualu(rodzaj);
  if (sim.krew - sim.rezerwa.krew < cena) return `za mało krwi (trzeba ${cena})`;
  switch (rodzaj) {
    case 'szal': if (!celSzalu(sim)) return 'nie ma rycerza, którego by rozpalił'; break;
    case 'wskrzeszenie': {
      if (!polegli(sim).length) return 'nikt nie poległ — albo ciała już nie ma';
      if (cel !== undefined && !polegli(sim).some((t) => t.id === cel)) return 'tego ciała już nie ma';
      break;
    }
    case 'ofiaraKrwi': if (!odprawiajacy(sim, rodzaj)) return 'pobożny przy ołtarzu jest już okaleczony'; break;
    case 'ofiaraZycia': if (liczRole(sim).pobozny <= 1) return 'to ostatni pobożny — bez niego nikt nie odprawi rytuału'; break;
  }
  if ((rodzaj === 'ofiaraKrwi' || rodzaj === 'ofiaraZycia') && sim.krew >= GORA.krewMax) return 'krwi masz pełno';
  return null;
}

function zdarzenie(sim: Sim, z: ZdarzenieOltarza): void {
  const l = sim.zdarzeniaOltarza;
  while (l.length && (l.length >= 16 || sim.tick - l[0].tik > 3600)) l.shift();
  l.push(z);
}

/**
 * Odprawia rytuał: płaci krew i stawia pobożnego przy ołtarzu na czas rytuału. Zwraca powód odmowy albo null.
 * `cel` — wskrzeszenie: numer poległego (bez niego — najświeższy); `wolany` — który pobożny (gdy kilku stoi).
 */
export function odprawRytual(sim: Sim, rodzaj: RodzajRytualu, cel?: number, wolany?: number): string | null {
  const powod = czemuNie(sim, rodzaj, cel);
  if (powod) return powod;
  const c = odprawiajacy(sim, rodzaj, wolany)!;
  const R = O.rytualy[rodzaj];
  let celId: number | undefined, cx: number | undefined, cy: number | undefined;
  if (rodzaj === 'wskrzeszenie') {
    const t = polegli(sim).find((p) => p.id === cel) ?? polegli(sim)[0];
    celId = t.id; cx = t.x; cy = t.y;
  } else if (rodzaj === 'szal') {
    const r = celSzalu(sim)!;
    celId = r.id; cx = r.x; cy = r.y;
  }
  sim.krew -= R.krew;
  const st = (sim.lud.oltarz ??= {});
  // Alpha 0.3: perk „Ręka kapłana” — rytuał trwa krócej
  const kaplan = maHak(c, 'kaplan');
  const tikow = Math.round(R.tikow * (kaplan ? PERK.kaplanCzas : 1));
  st.rytual = { rodzaj, kto: c.id, od: sim.tick, do: sim.tick + tikow, krew: R.krew, cel: celId, wiaraDana: 0 };
  if (kaplan) perkZadzialal(sim, c, 'kaplan');
  wyzwol(sim, c, 'oltarz');
  c.droga = undefined; c.jt = 0; c.zamiarDo = sim.tick;
  zdarzenie(sim, { rodzaj, faza: 'start', kto: c.id, cel: celId, cx, cy, tik: sim.tick });
  zapisz(sim, 'rytual', `${kto(sim, c)}: rytuał przy ołtarzu — ${NAZWA_RYTUALU[rodzaj]}`, c.x, c.y);
  return null;
}

/** Przerywa trwający rytuał — krew wraca. */
function przerwij(sim: Sim, r: RytualOltarza, czemu: string): void {
  sim.krew += r.krew;
  sim.lud.oltarz!.rytual = undefined;
  zdarzenie(sim, { rodzaj: r.rodzaj, faza: 'przerwany', kto: r.kto, cel: r.cel, tik: sim.tick });
  const o = sim.world.oltarz;
  sim.gdzie(o.x + 0.5, o.y).log(`${NAZWA_RYTUALU[r.rodzaj]} przy ołtarzu przerwana — ${czemu}. Krew wróciła.`, 'wiara');
}

/** Co tik: trwający rytuał — wiara z modlitwy, a na koniec jego skutek. */
export function tikOltarza(sim: Sim): void {
  const r = rytualOltarza(sim);
  if (!r) return;
  const c = sim.creatureById(r.kto);
  if (!c || c.dead) { przerwij(sim, r, 'odprawiający nie żyje'); return; }
  if (!przyOltarzu(sim, c)) {
    r.poza ??= sim.tick;
    if (sim.tick - r.poza > O.odejscieTikow) { przerwij(sim, r, 'odprawiający odszedł'); return; }
  } else r.poza = undefined;
  if (r.rodzaj === 'wskrzeszenie' && !polegli(sim).some((t) => t.id === r.cel)) { przerwij(sim, r, 'ciała już nie ma'); return; }
  if (r.rodzaj === 'modlitwa') {
    // wiara spływa przez cały rytuał, nie naraz na końcu
    const R = O.rytualy.modlitwa;
    const ma = R.wiara * Math.min(1, (sim.tick - r.od) / Math.max(1, r.do - r.od));
    const d = ma - (r.wiaraDana ?? 0);
    if (d >= 1 || (sim.tick >= r.do && d > 0)) { sim.wiara += d; r.wiaraDana = ma; }
  }
  if (sim.tick < r.do) return;
  zakoncz(sim, r, c);
}

/** Rytuał dobiegł końca — jego skutek. */
function zakoncz(sim: Sim, r: RytualOltarza, c: Creature): void {
  const st = sim.lud.oltarz!;
  st.rytual = undefined;
  st.odprawionych = (st.odprawionych ?? 0) + 1;
  sim.stat.rytualow++;
  const o = sim.world.oltarz;
  const tu = sim.gdzie(o.x + 0.5, o.y);
  let cx: number | undefined, cy: number | undefined;
  switch (r.rodzaj) {
    case 'modlitwa':
      tu.log(`Pobożny odmówił modlitwę przy ołtarzu: +${O.rytualy.modlitwa.wiara} wiary.`, 'wiara');
      break;
    case 'szal': {
      const rycerz = sim.creatureById(r.cel ?? -1);
      const cel = rycerz && !rycerz.dead ? rycerz : celSzalu(sim);
      if (cel) {
        cel.szalDo = sim.tick + O.rytualy.szal.trwa;
        cx = cel.x; cy = cel.y;
        r.cel = cel.id;
        tu.log(`Szał krwi: ${rolaPostaci(cel) === 'rycerz' ? 'rycerz' : 'robotnik w hełmie'} przez minutę bije mocniej.`, 'krew');
      } else {
        sim.krew += r.krew;
        tu.log('Szał krwi nie miał kogo rozpalić — krew wróciła.', 'krew');
      }
      break;
    }
    case 'wskrzeszenie': {
      const nowy = wskrzes(sim, r.cel ?? -1);
      if (nowy) { cx = nowy.x; cy = nowy.y; tu.log(`${ktoTo(sim, nowy)} — ${rodzaj(sim, nowy, 'wstał', 'wstała')} z martwych przy ołtarzu.`, 'wiara'); }
      else { sim.krew += r.krew; tu.log('Wskrzeszenie się nie udało — krew wróciła.', 'wiara'); }
      break;
    }
    case 'ofiaraKrwi':
      c.okaleczony = true;
      c.hp = Math.min(c.hp, maxHp(sim, c));
      sim.krew += LUD.okaleczenieKrew;
      sim.efekt(c.x, c.y, 'mysl', `+${LUD.okaleczenieKrew} krwi`);
      tu.log(`${ktoTo(sim, c)} upuszcza krwi do misy: +${LUD.okaleczenieKrew} krwi. Słabnie, póki się nie wyśpi w sypialni.`, 'krew');
      break;
    case 'ofiaraZycia':
      sim.krew += LUD.ofiaraKrew;
      sim.efekt(c.x, c.y, 'mysl', `+${LUD.ofiaraKrew} krwi`);
      tu.log(`${ktoTo(sim, c)} oddaje życie na ołtarzu: +${LUD.ofiaraKrew} krwi.`, 'krew');
      sim.kill(c, 'w ofierze na ołtarzu', 'ofiara');
      break;
  }
  zdarzenie(sim, { rodzaj: r.rodzaj, faza: 'koniec', kto: r.kto, cel: r.cel, cx, cy, tik: sim.tick });
}

/** Poległy wstaje przy ołtarzu: ten sam numer (ta sama twarz), ta sama rola; ciało znika z ziemi. */
function wskrzes(sim: Sim, id: number): Creature | null {
  const trupy = sim.lud.trupy ?? [];
  const t = trupy.find((p) => p.id === id);
  const klan = klanLudu(sim);
  if (!t || !klan || sim.creatureById(id)) return null;
  const o = sim.world.oltarz;
  // obok ołtarza, po tej stronie, gdzie jest wolna podłoga
  let x = o.x + 1;
  for (const dx of [1, -1, 2, -2]) if (stoi(sim, o.x + dx, o.y)) { x = o.x + dx; break; }
  const c = makeCreature(Race.GOBLIN, klan.id, x + 0.5, o.y, t.id);
  sim.creatures.push(c);
  sim.byId.set(c.id, c);
  klan.pop++;
  klan.dead = false;
  nadajRole(sim, c, t.rola);
  // Alpha 0.3: wstaje ta sama osoba — z imieniem, perkiem i wadą
  wstalaOsoba(sim, c);
  c.hp = maxHp(sim, c);
  c.helm = t.helm;
  c.face = x < o.x ? 1 : -1;
  c.hunger = 0.2;
  c.devotion = Math.max(c.devotion, 0.8);
  c.od = sim.tick;          // staż weterana liczy się od nowa
  sim.lud.trupy = trupy.filter((p) => p !== t);
  sim.stat.wskrzeszen++;
  zapisz(sim, 'narodziny', `${kto(sim, c)} wstaje z martwych przy ołtarzu`, c.x, c.y);
  return c;
}
