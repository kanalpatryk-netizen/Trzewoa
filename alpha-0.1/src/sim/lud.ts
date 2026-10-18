/**
 * LUD (Remake v1) — role postaci, wędrowna siedziba i przegrana „nie możesz już wygrać”.
 * Alpha: stała drużyna — nikt nie wychodzi ze skały, nie ma gniazd kamiennych rycerzy.
 * Liczby są w src/nastawy/lud.ts.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Race, RACES } from './races';
import { LUD, type Rola, type MnoznikiRoli } from '../nastawy/lud';
import { T } from './tiles';
import { Job } from './creatures';
import { szukajDrogi, budzetDrog, nowyTik } from './droga';
import { PIELGRZYMKA as P } from '../nastawy/rytual';
import { tikStraznikow, type StanStraznikow } from './straznicy';
import { tikMroku, naKogoPatrzy, type StanMroku } from './mrok';
import { tikDloni, type StanDloni } from './dlon';
import { DLON } from '../nastawy/dlon';
import { MROK } from '../nastawy/mrok';
import { STRAZNICY } from '../nastawy/straznicy';
import { KARTY_LUDU } from '../nastawy/karty-ludu';
import { tikWiader, zrodlaJedzenia, type StanWiader } from './wiadro';
import { tikTrupow, type Trup } from './trupy';
import type { StanOltarza } from './oltarz';
import { OLTARZ } from '../nastawy/oltarz';
import { ZABYTKI } from '../nastawy/zabytki';
import { tikZabytkow, stanyZabytkow, type StanZabytkow } from './zabytki';

export type { Rola } from '../nastawy/lud';

export const NAZWA_ROLI: Record<Rola, string> = { pobozny: 'Pobożny', robotnik: 'Robotnik', rycerz: 'Rycerz' };
export const NAZWA_ROLI_MNOGA: Record<Rola, string> = { pobozny: 'pobożni', robotnik: 'robotnicy', rycerz: 'rycerze' };

/** Stan ludu w symulacji (trafia do zapisu). */
export interface StanLudu {
  /** Tik ostatnich przenosin siedziby. */
  siedzibaT: number;
  /** Czoło drogi, które stoi mimo kopaczy (kafel, od kiedy, próbek, próbek z kopaczem) i kafle chwilowo omijane przez plan drogi. */
  czolo?: { i: number; od: number; prob: number; zk: number };
  omijaj?: [number, number][];
  /** Stara spiżarnia po przenosinach — robotnicy znoszą z niej jedzenie do nowej siedziby. */
  sklad: { x: number; y: number; ilosc: number } | null;
  /** Odcięte grupki (liczone przy przenosinach siedziby). */
  obozy: { x: number; y: number; ilu: number }[];
  /** Obozy frontowe — miejsca postoju pobożnych i rycerzy (Remake v2: bez jedzenia; nazwa została z czasów spiżarni). */
  spizarnie: Spizarnia[];
  /** tik założenia ostatniego obozu */
  obozT?: number;
  /** Etap 3: fale Strażników Snu. */
  straznicy?: StanStraznikow;
  /** Ten, który patrzy z ciemności (sim/mrok.ts). */
  mrok?: StanMroku;
  /** Koszmar: dłoń z otchłani (sim/dlon.ts). */
  dlon?: StanDloni;
  /** Remake v2: wiadra z jedzeniem (sim/wiadro.ts) — jedyne jedzenie ludu. */
  wiadra?: StanWiader;
  /** Remake v2: trupy ludu leżą na ziemi (sim/trupy.ts). */
  trupy?: Trup[];
  /** Alpha, etap 3d: rytuał przy ołtarzu (sim/oltarz.ts). */
  oltarz?: StanOltarza;
  /** Alpha: ile lin powiesił już gracz (pierwsze kilka za darmo — sim/pomieszczenia.ts: cenaLiny). */
  liny?: number;
  /** Alpha, etap 3e: zabytki z ruin — odkryte, wzięte, zostawione (sim/zabytki.ts). */
  zabytki?: StanZabytkow;
  /** Remake v2: robotnicy w hełmach (brak rycerzy) i następny ołtarz nie wcześniej niż. */
  helmy?: boolean;
  oltarzPo?: number;
}

export interface Spizarnia { x: number; y: number; ilosc: number; /** tik założenia */ od?: number }

/** Jedna spiżarnia ludu — siedziby albo obozu — z tym, co się z nią robi. */
export interface MiejsceJedzenia {
  x: number; y: number; ilosc: number; baza: boolean;
  wez(n: number): number;
  odloz(n: number): void;
}

/**
 * Remake v2: jedzenie leży już tylko w wiadrach (sim/wiadro.ts) — stojące na ziemi wiadra z porcjami.
 * Nazwy „spiżarni” zostały w kodzie planera: tam, gdzie chodziło o jedzenie, teraz chodzi o wiadra.
 */
export function wszystkieSpizarnie(sim: Sim): MiejsceJedzenia[] {
  return zrodlaJedzenia(sim);
}

/** Obozy ludu — siedziba i obozy frontowe: miejsca postoju (bez jedzenia). */
export function obozyLudu(sim: Sim): MiejsceJedzenia[] {
  const out: MiejsceJedzenia[] = [];
  const klan = klanLudu(sim);
  const nic = { ilosc: 0, wez: () => 0, odloz: () => {} };
  if (klan) out.push({ x: klan.hx, y: klan.hy, baza: true, ...nic });
  for (const s of sim.lud.spizarnie) out.push({ x: s.x, y: s.y, baza: false, ...nic });
  return out;
}

/** Najbliższe wiadro (w linii prostej) — z jedzeniem albo dowolne stojące. */
export function najblizszaSpizarnia(sim: Sim, x: number, y: number, _zJedzeniem: boolean): MiejsceJedzenia | null {
  let best: MiejsceJedzenia | null = null, bd = Infinity;
  for (const s of wszystkieSpizarnie(sim)) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Wiadra z jedzeniem od najbliższego (w linii prostej). */
export function spizarnieWgOdleglosci(sim: Sim, x: number, y: number, _zJedzeniem: boolean): MiejsceJedzenia[] {
  return wszystkieSpizarnie(sim).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
}

/** Najbliższy obóz (siedziba albo obóz frontowy) w linii prostej. */
export function najblizszyOboz(sim: Sim, x: number, y: number): MiejsceJedzenia | null {
  let best: MiejsceJedzenia | null = null, bd = Infinity;
  for (const s of obozyLudu(sim)) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Obozy od najbliższego (w linii prostej). */
export function obozyWgOdleglosci(sim: Sim, x: number, y: number): MiejsceJedzenia[] {
  return obozyLudu(sim).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
}

/** Obóz frontowy: obóz (siedziba albo obóz) najbliżej rdzenia — tam stacjonują pobożni i rycerze. */
export function obozFrontowy(sim: Sim): MiejsceJedzenia | null {
  const w = sim.world;
  let best: MiejsceJedzenia | null = null, bd = Infinity;
  for (const s of obozyLudu(sim)) {
    const d = Math.hypot(s.x - w.coreX, s.y - w.coreY);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Wiadro z jedzeniem stojące na tym kaflu (albo tuż obok). */
export function spizarniaW(sim: Sim, x: number, y: number): MiejsceJedzenia | null {
  return wszystkieSpizarnie(sim).find((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1) ?? null;
}

/** Stacjonujący: pobożni i rycerze — jedzenie przynoszą im robotnicy. */
export function stacjonuje(c: Creature): boolean {
  const r = rolaPostaci(c);
  return r === 'pobozny' || r === 'rycerz';
}

export function nowyStanLudu(): StanLudu {
  return { siedzibaT: 0, sklad: null, obozy: [], spizarnie: [] };
}

/** Rola postaci ludu — albo null dla obcych (ludzie z powierzchni). */
export function rolaPostaci(c: Creature): Rola | null {
  return c.race === Race.GOBLIN ? (c.rola ?? 'pobozny') : null;
}

/** Mnożnik statystyki: rola × okaleczenie × weteran × zatrucie × hełm. */
export function mnoznik(sim: Sim, c: Creature, co: keyof MnoznikiRoli): number {
  const r = rolaPostaci(c);
  if (!r) return 1;
  let v = LUD.role[r][co];
  if (c.okaleczony && (co === 'hp' || co === 'sila' || co === 'szybkosc')) v *= LUD.okaleczenie;
  if (co !== 'hp' && co !== 'glod' && weteranAktywny(sim, c)) v *= LUD.weteranPremia;
  if (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo && (co === 'sila' || co === 'szybkosc' || co === 'kopanie')) v *= KARTY_LUDU.zatrucie;
  // Remake v2: robotnik w hełmie (rycerzy brak) — mocniejszy i walczy
  if (c.helm && r === 'robotnik' && (co === 'hp' || co === 'sila')) v *= LUD.helm[co];
  // etap 3d: szał krwi z ołtarza
  if (co === 'sila' && c.szalDo !== undefined && sim.tick < c.szalDo) v *= OLTARZ.rytualy.szal.sila;
  // etap 3e: wzięte zabytki — premia i kara dla całego ludu, na zawsze
  const wz = sim.lud.zabytki?.wziete;
  if (wz?.length) {
    const Z = ZABYTKI.skutki;
    if (wz.includes('relikwiarz')) { if (co === 'modlitwa') v *= Z.relikwiarz.modlitwa; if (co === 'kopanie') v *= Z.relikwiarz.kopanie; }
    if (wz.includes('miecz') && co === 'sila' && r === 'rycerz') v *= Z.miecz.silaRycerza;
    if (wz.includes('kielich') && co === 'glod') v *= Z.kielich.glod;
  }
  return v;
}

/** Remake v2: kto walczy ze Strażnikami jak rycerz — rycerz albo robotnik w hełmie (gdy rycerzy brak). */
export function walczacy(c: Creature): boolean {
  const r = rolaPostaci(c);
  return r === 'rycerz' || (r === 'robotnik' && !!c.helm);
}

/**
 * Remake v2: gdy w ludzie nie ma ani jednego rycerza, robotnicy zakładają hełmy i biorą kilofy do walki
 * (życie i siła rosną, walczą ze Strażnikami i bossem jak rycerze); gdy rycerze wrócą — zdejmują je.
 */
function pilnujHelmow(sim: Sim): void {
  let rycerzy = 0, robotnikow = 0;
  for (const c of sim.creatures) {
    if (c.dead) continue;
    const r = rolaPostaci(c);
    if (r === 'rycerz') rycerzy++; else if (r === 'robotnik') robotnikow++;
  }
  const helmy = rycerzy === 0;
  if (helmy && robotnikow) sim.stat.helmy = 1;
  for (const c of sim.creatures) {
    if (c.dead || rolaPostaci(c) !== 'robotnik' || !!c.helm === helmy) continue;
    c.helm = helmy || undefined;
    if (!helmy) c.hp = Math.min(c.hp, maxHp(sim, c));
    else sim.efekt(c.x, c.y - 0.6, 'mysl', 'hełm');
  }
  if (helmy !== !!sim.lud.helmy) {
    sim.lud.helmy = helmy;
    if (helmy && robotnikow) sim.log('Nie został ani jeden rycerz. Robotnicy zakładają hełmy i biorą kilofy do walki.', 'krew');
    else if (!helmy && robotnikow) sim.log('Rycerze znów są w ludzie — robotnicy zdejmują hełmy i wracają do kopania.', 'swiat');
  }
}

/** Remake v2: do osiągnięć — najwięcej ludu i weteranów naraz. */
function liczLud(sim: Sim): void {
  let lud = 0, weteranow = 0;
  for (const c of sim.creatures) {
    if (c.dead || !rolaPostaci(c)) continue;
    lud++;
    if (weteranStaz(sim, c)) weteranow++;
  }
  if (lud > sim.stat.ludMax) sim.stat.ludMax = lud;
  if (weteranow > sim.stat.weteranowMax) sim.stat.weteranowMax = weteranow;
}

/** Etap 2: przesłużył już swoje w ludzie (staż weterana). */
export function weteranStaz(sim: Sim, c: Creature): boolean {
  return sim.tick - (c.od ?? 0) >= LUD.weteranPo;
}

/** Etap 2: premia weterana działa — staż, najedzony, lud wierny. */
export function weteranAktywny(sim: Sim, c: Creature): boolean {
  if (!weteranStaz(sim, c) || c.hunger >= LUD.weteranGlod) return false;
  const klan = sim.clans[c.clan];
  return !!klan && klan.devotion >= LUD.weteranWiara;
}

/** Stan postaci widoczny dla gracza: aureola nad głową i wiersz na karcie. */
export interface StanPostaci {
  nazwa: string;
  /** co daje albo odbiera */
  skutek: string;
  /** wzmocnienie (jasna aureola) czy osłabienie (czerwona) */
  dobry: boolean;
  /** tik, w którym minie (brak = na zawsze) */
  do?: number;
  /** zamiast „mija za…” (np. „póki najedzony”) */
  kiedy?: string;
  /** stan nieczynny — tylko wiersz na karcie, bez aureoli */
  uspiony?: boolean;
}

/** Wzmocnienia i osłabienia postaci: weteran, hełm, zatrucie, spojrzenie z ciemności, dłoń, okaleczenie. */
export function stanyPostaci(sim: Sim, c: Creature): StanPostaci[] {
  const out: StanPostaci[] = [];
  const premia = `+${Math.round((LUD.weteranPremia - 1) * 100)}% siły, szybkości, kopania i modlitwy`;
  if (weteranAktywny(sim, c)) {
    out.push({ nazwa: 'weteran', skutek: premia, dobry: true, kiedy: 'póki najedzony, a lud wierny' });
  } else if (weteranStaz(sim, c) && rolaPostaci(c)) {
    // staż jest, premii nie ma — na karcie widać dlaczego (bez aureoli)
    const klan = sim.clans[c.clan];
    const czemu = c.hunger >= LUD.weteranGlod ? 'głodny' : (klan && klan.devotion < LUD.weteranWiara) ? 'lud stracił wiarę' : 'nie wiadomo';
    out.push({ nazwa: 'weteran bez premii', skutek: `${premia} wróci, gdy to minie`, dobry: true, uspiony: true, kiedy: czemu });
  }
  if (c.helm && rolaPostaci(c) === 'robotnik') {
    out.push({ nazwa: 'w hełmie — rycerzy brak', skutek: `życie ×${LUD.helm.hp}, siła ×${LUD.helm.sila}; walczy ze Strażnikami Snu jak rycerz`, dobry: true, kiedy: 'póki w ludzie nie ma rycerzy' });
  }
  if (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo) {
    out.push({ nazwa: 'zatruty', skutek: `−${Math.round((1 - KARTY_LUDU.zatrucie) * 100)}% siły, szybkości i kopania (zatrute plony)`, dobry: false, do: c.zatrutyDo });
  }
  if (naKogoPatrzy(sim) === c.id && sim.lud.mrok) {
    out.push({ nazwa: 'patrzy na niego coś z ciemności', skutek: 'jeśli zostanie sam, zniknie — ocali go Cud tuż obok albo ktoś z ludu przy nim', dobry: false, do: sim.lud.mrok.od + MROK.patrzyTikow });
  }
  const d = sim.lud.dlon;
  if (d && (d.faza === 'wstaje' || d.faza === 'siega') && d.ofiary.includes(c.id)) {
    out.push({ nazwa: 'spod niego wznosi się dłoń z otchłani', skutek: 'zaraz go zabierze w dół — odpędzi ją tylko Cud tuż przy nim', dobry: false, do: d.od + (d.faza === 'wstaje' ? DLON.wstaje + DLON.siega : DLON.siega) });
  }
  if (c.szalDo !== undefined && sim.tick < c.szalDo) {
    out.push({ nazwa: 'szał krwi', skutek: `siła ×${OLTARZ.rytualy.szal.sila} (rytuał przy ołtarzu)`, dobry: true, do: c.szalDo });
  }
  if (c.okaleczony) {
    out.push({ nazwa: 'okaleczony', skutek: `−${Math.round((1 - LUD.okaleczenie) * 100)}% życia, siły i szybkości`, dobry: false, kiedy: 'póki nie wyśpi się w sypialni' });
  }
  // etap 3e: zabytki — każdy z ludu nosi jasną aureolę premii i czerwoną kary
  if (rolaPostaci(c)) out.push(...stanyZabytkow(sim, c));
  return out;
}

/** Największe życie tej postaci (rasa × rola). */
export function maxHp(sim: Sim, c: Creature): number {
  return RACES[c.race].maxHp * mnoznik(sim, c, 'hp');
}

/** Klan ludu — w Remake v1 jest jeden. */
export function klanLudu(sim: Sim): Sim['clans'][number] | null {
  return sim.clans.find((k) => k.race === Race.GOBLIN && !k.dead) ?? sim.clans.find((k) => k.race === Race.GOBLIN) ?? null;
}

/** Ilu żyje w każdej roli. */
export function liczRole(sim: Sim): Record<Rola, number> {
  const n: Record<Rola, number> = { pobozny: 0, robotnik: 0, rycerz: 0 };
  for (const c of sim.creatures) {
    if (c.dead) continue;
    const r = rolaPostaci(c);
    if (r) n[r]++;
  }
  return n;
}

/** Ustawia postaci rolę i pełne życie według niej. */
export function nadajRole(sim: Sim, c: Creature, r: Rola): void {
  c.rola = r;
  c.hp = maxHp(sim, c);
}

/** Wolne miejsce na podłodze przy (x, y) — tam staje nowa postać albo nowa siedziba. */
export function podloga(sim: Sim, x: number, y: number, promien = 6): [number, number] | null {
  const w = sim.world;
  for (let r = 0; r <= promien; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (!w.inb(xx, yy + 1) || !w.passable(xx, yy) || w.passable(xx, yy + 1)) continue;
        if (w.water[w.idx(xx, yy)] > 2 || w.magma[w.idx(xx, yy)] > 0) continue;
        return [xx, yy];
      }
    }
  }
  return null;
}

/** Środek największej grupy ludu (skupisko w promieniu 8 kafli) — bez pielgrzymów i warty pod rdzeniem. */
export function najwiekszaGrupa(sim: Sim, klanId: number): { x: number; y: number; ilu: number } | null {
  const lud = sim.creatures.filter((c) => !c.dead && c.clan === klanId && c.job !== Job.PIELGRZYM && c.job !== Job.WARTA);
  let best: { x: number; y: number; ilu: number } | null = null;
  for (const c of lud) {
    const grupa = lud.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < 8);
    if (!best || grupa.length > best.ilu) {
      best = { x: grupa.reduce((s, o) => s + o.x, 0) / grupa.length, y: grupa.reduce((s, o) => s + o.y, 0) / grupa.length, ilu: grupa.length };
    }
  }
  return best;
}

/**
 * Siedziba idzie za ludem: gdy większość nie może do niej wrócić (a od ostatnich
 * przenosin minęło dość czasu), lud zakłada nową tam, gdzie jest większość. Zapasy
 * zostają w starej spiżarni i robotnicy je przenoszą. Odcięte grupki to tylko obozy.
 */
function pilnujSiedziby(sim: Sim): void {
  const w = sim.world;
  const klan = klanLudu(sim);
  if (!klan) return;
  // pielgrzymi schodzą pod rdzeń z własnej woli — nie liczą się jako odcięci
  // (ani ci, którzy stoją pod rdzeniem — w strefie Strażników Snu; siedziba szła za nimi pod sam rdzeń)
  const wStrefie = (x: number, y: number) => Math.hypot(x - w.coreX, y - w.przedsionekY) < STRAZNICY.limitOdRdzenia + STRAZNICY.ucieczkaZapas;
  const lud = sim.creatures.filter((c) => !c.dead && c.clan === klan.id && c.job !== Job.PIELGRZYM && c.job !== Job.WARTA && !wStrefie(c.x, c.y));
  if (!lud.length) return;
  // kto może dojść do siedziby — tym samym szukaniem drogi, którym chodzą (wspinaczka po ścianach,
  // zeskoki); proste zalewanie przejść uznawało za „blisko” każdego, kto spadł szybem w dół
  const zostalo = budzetDrog();
  nowyTik(lud.length + 2);
  const blisko = (_i: number, x: number, y: number) => Math.abs(x - klan.hx) <= 1 && Math.abs(y - klan.hy) <= 1;
  const dojdzie = new Set<number>();
  for (const c of lud) if (szukajDrogi(sim, c, blisko, 6000)) dojdzie.add(c.id);
  nowyTik(zostalo);
  const odcieci = lud.filter((c) => !dojdzie.has(c.id));
  // obozy: odcięte grupki (proste skupiska w promieniu 6 kafli)
  const obozy: StanLudu['obozy'] = [];
  const wzieci = new Set<number>();
  for (const c of odcieci) {
    if (wzieci.has(c.id)) continue;
    const grupa = odcieci.filter((o) => !wzieci.has(o.id) && Math.hypot(o.x - c.x, o.y - c.y) < 6);
    for (const o of grupa) wzieci.add(o.id);
    if (grupa.length >= LUD.obozMin) {
      obozy.push({ x: grupa.reduce((s, o) => s + o.x, 0) / grupa.length, y: grupa.reduce((s, o) => s + o.y, 0) / grupa.length, ilu: grupa.length });
    }
  }
  sim.lud.obozy = obozy;
  // Alpha: siedziba stoi w sali pod szybem z jedzeniem i się nie przenosi
  if (LUD.siedzibaStala) return;
  // zalana siedziba przenosi się od razu — na suche miejsce przy największej grupie
  const zalana = w.water[w.idx(klan.hx, klan.hy)] >= LUD.wodaUcieka;
  if (!zalana && (odcieci.length / lud.length <= LUD.odcieciProg || sim.tick - sim.lud.siedzibaT < LUD.siedzibaPrzerwa)) return;
  // nowa siedziba przy największym obozie — ale tylko gdy jest w nim więcej ludu niż tych,
  // którzy wciąż mogą wrócić (rozproszeni kopacze nie ciągną siedziby za sobą)
  const g = zalana ? najwiekszaGrupa(sim, klan.id) : null;
  const cel = zalana ? (g ? { x: g.x, y: Math.max(2, g.y - 2), ilu: g.ilu } : null) : [...obozy].sort((a, b) => b.ilu - a.ilu)[0];
  if (!cel || (!zalana && cel.ilu <= dojdzie.size)) return;
  const miejsce = miejsceNaObozu(sim, cel.x, cel.y, 20, 12);
  if (!miejsce && !zalana) return;          // siedziba przenosi się tylko na porządną półkę…
  const gdzie = miejsce ?? podloga(sim, Math.floor(cel.x), Math.floor(cel.y), 10);   // …chyba że stara tonie
  if (!gdzie || wStrefie(gdzie[0], gdzie[1])) return;
  // (Remake v2: siedziba nie ma już spiżarni — nic nie zostaje w starej)
  klan.hx = gdzie[0]; klan.hy = gdzie[1];
  if (w.passable(gdzie[0], gdzie[1])) w.set(gdzie[0], gdzie[1], T.NEST);
  sim.lud.siedzibaT = sim.tick;
  sim.lud.obozy = sim.lud.obozy.filter((o) => Math.hypot(o.x - gdzie[0], o.y - gdzie[1]) > 8);
  sim.efekt(gdzie[0] + 0.5, gdzie[1] + 0.5, 'cud');
  sim.gdzie(gdzie[0] + 0.5, gdzie[1] + 0.5).log(`${klan.name} przenieśli siedzibę tam, gdzie jest ich najwięcej.`, 'swiat');
}

/**
 * Przegrana: nie da się już wygrać. Alpha: drużyna jest stała, a skorupę kruszy tylko modlitwa
 * pobożnych — gdy nie zostanie żaden pobożny, gra się kończy.
 */
function sprawdzPrzegrana(sim: Sim): void {
  if (sim.ending) return;
  if (liczRole(sim).pobozny > 0) return;
  sim.ending = 'upadek';
  sim.log('Nie został nikt, kto by się modlił. Skorupa już nie pęknie.', 'koniec');
}

/**
 * Miejsce na obóz albo siedzibę: płaska, szeroka półka (co najmniej `obozSzerokosc` kafli
 * podłogi z miejscem nad głową), sucha i z dala od magmy.
 * Wcześniej obóz stawał tam, gdzie akurat był środek grupy: w szybie, przy ogniu.
 */
export function miejsceNaObozu(sim: Sim, gx: number, gy: number, rx = 16, ry = 9, minSzer = LUD.obozSzerokosc): [number, number] | null {
  const w = sim.world;
  // podłoga pod spodem i co najmniej `obozWysokosc` wolnych kafli w górę — w niskiej szczelinie obóz nie staje
  const dobre = (x: number, y: number) => {
    if (!w.inb(x, y - LUD.obozWysokosc + 1) || !w.inb(x, y + 1) || w.passable(x, y + 1)) return false;
    for (let k = 0; k < LUD.obozWysokosc; k++) if (!w.passable(x, y - k)) return false;
    return w.water[w.idx(x, y)] < 3 && w.magma[w.idx(x, y)] === 0;
  };
  let best: [number, number] | null = null, bs = -Infinity;
  for (let y = Math.floor(gy) - ry; y <= Math.floor(gy) + ry; y++) {
    for (let x = Math.floor(gx) - rx; x <= Math.floor(gx) + rx; x++) {
      if (!dobre(x, y)) continue;
      let l = 0, p = 0;
      while (l < 8 && dobre(x - l - 1, y)) l++;
      while (p < 8 && dobre(x + p + 1, y)) p++;
      const szer = l + p + 1;
      if (szer < minSzer || Math.min(l, p) < Math.floor(minSzer / 2)) continue;      // na środku półki, nie na krawędzi
      if (sim.przyMagmie(x, y, 5) || Math.hypot(x - w.coreX, y - w.coreY) < P.przedsionekX + 2) continue;
      const wynik = szer * 2 - Math.hypot(x - gx, (y - gy) * 1.5) * 0.6;
      if (wynik > bs) { bs = wynik; best = [x, y]; }
    }
  }
  // nie ma szerokiej półki — węższa, byle płaska
  return best ?? (minSzer > 3 ? miejsceNaObozu(sim, gx, gy, rx, ry, 3) : null);
}



/**
 * Obozy ze spiżarniami: gdzie stacjonuje co najmniej `obozMin` pobożnych lub rycerzy daleko
 * od każdej spiżarni, tam powstaje obóz. Pod rdzeniem stawiamy go z boku przedsionka (przy
 * warcie), żeby nie stał w miejscu modlitwy. Puste obozy, przy których nikogo nie ma, znikają.
 */
function pilnujObozow(sim: Sim, klan: Sim['clans'][number]): void {
  const w = sim.world;
  const st = sim.creatures.filter((c) => !c.dead && c.clan === klan.id && stacjonuje(c));
  const wzieci = new Set<number>();
  for (const c of st) {
    if (wzieci.has(c.id)) continue;
    const grupa = st.filter((o) => !wzieci.has(o.id) && Math.hypot(o.x - c.x, o.y - c.y) < 8);
    for (const o of grupa) wzieci.add(o.id);
    if (grupa.length < LUD.obozMinStacjonujacych || sim.lud.spizarnie.length >= LUD.obozyMaks) continue;
    let gx = grupa.reduce((s, o) => s + o.x, 0) / grupa.length, gy = grupa.reduce((s, o) => s + o.y, 0) / grupa.length;
    const daleko = obozyLudu(sim).every((s) => Math.hypot(s.x - gx, s.y - gy) > LUD.obozOdleglosc);
    if (!daleko) continue;
    if (Math.hypot(gx - w.coreX, gy - w.coreY) < LUD.strefaRdzenia) {
      gx = w.coreX + (gx < w.coreX ? -1 : 1) * (P.przedsionekX + LUD.wartaOdstep);
      gy = w.przedsionekY;
    }
    if (sim.tick - (sim.lud.obozT ?? -1e9) < LUD.obozPrzerwa) continue;
    const m = miejsceNaObozu(sim, gx, gy, 20, 12);
    if (!m) continue;   // nie ma szerokiej i wysokiej półki — obozu tu nie będzie
    if (obozyLudu(sim).some((s) => Math.hypot(s.x - m[0], s.y - m[1]) <= LUD.obozOdleglosc)) continue;
    sim.lud.spizarnie.push({ x: m[0], y: m[1], ilosc: 0, od: sim.tick });
    sim.lud.obozT = sim.tick;
    sim.gdzie(m[0] + 0.5, m[1] + 0.5).log(`${klan.name} rozbili obóz bliżej rdzenia.`, 'swiat', 'oboz');
  }
  // pusty obóz bez nikogo w pobliżu znika
  const zywi = sim.creatures.filter((c) => !c.dead && c.clan === klan.id);
  sim.lud.spizarnie = sim.lud.spizarnie.filter((s) => sim.tick - (s.od ?? 0) < LUD.obozZycie || zywi.some((c) => Math.hypot(c.x - s.x, c.y - s.y) < 15));
}

/** Wołane z sim.step() co tik. */
export function tikLudu(sim: Sim): void {
  if (sim.spokojnySwiat || sim.ending) return;
  // stary zapis: „stara spiżarnia” przepada (jedzenie jest już tylko w wiadrach)
  if (sim.lud.sklad) sim.lud.sklad = null;
  if (!sim.lud.spizarnie) sim.lud.spizarnie = [];
  if (sim.tick % 60 === 0) { pilnujHelmow(sim); liczLud(sim); }
  tikWiader(sim);
  tikTrupow(sim);
  tikStraznikow(sim);
  tikMroku(sim);
  tikDloni(sim);
  tikZabytkow(sim);
  if (sim.tick % LUD.siedzibaCo === 0) {
    pilnujSiedziby(sim);
    const klan = klanLudu(sim);
    if (klan) pilnujObozow(sim, klan);
  }
  if (sim.tick % LUD.przegranaCo === 0) sprawdzPrzegrana(sim);
}
