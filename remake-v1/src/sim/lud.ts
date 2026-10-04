/**
 * LUD (Remake v1) — role postaci, wychodzenie ze skały, wędrowna siedziba i przegrana
 * „nie możesz już wygrać”. Liczby są w src/nastawy/lud.ts.
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Race, RACES } from './races';
import { LUD, type Rola, type MnoznikiRoli } from '../nastawy/lud';
import { GORA } from '../nastawy/gora';
import { zapisz } from './dziennik';
import { T } from './tiles';
import { Job } from './creatures';
import { szukajDrogi, budzetDrog, nowyTik } from './droga';
import { PIELGRZYMKA as P } from '../nastawy/rytual';
import { Rng } from '../core/rng';
import { tikStraznikow, falaTrwa, type StanStraznikow } from './straznicy';
import { STRAZNICY } from '../nastawy/straznicy';
import { tikBuntu } from './bunt';
import { KARTY_LUDU } from '../nastawy/karty-ludu';

export type { Rola } from '../nastawy/lud';

export const NAZWA_ROLI: Record<Rola, string> = { pobozny: 'Pobożny', robotnik: 'Robotnik', rycerz: 'Rycerz' };
export const NAZWA_ROLI_MNOGA: Record<Rola, string> = { pobozny: 'pobożni', robotnik: 'robotnicy', rycerz: 'rycerze' };

/** Stan ludu w symulacji (trafia do zapisu). */
export interface StanLudu {
  /** Kogo skała wyda następnym razem (przełącznik u góry ekranu). */
  rola: 'pobozny' | 'robotnik';
  /** Tik następnego wyjścia ze skały. */
  nastepne: number;
  /** Tik ostatnich przenosin siedziby. */
  siedzibaT: number;
  /** Karta spisku nie wróci przed tym tikiem (przerwa po poprzednim spisku). */
  spisekPo?: number;
  /** Czoło drogi, które stoi mimo kopaczy (kafel, od kiedy, próbek, próbek z kopaczem) i kafle chwilowo omijane przez plan drogi. */
  czolo?: { i: number; od: number; prob: number; zk: number };
  omijaj?: [number, number][];
  /** Stara spiżarnia po przenosinach — robotnicy znoszą z niej jedzenie do nowej siedziby. */
  sklad: { x: number; y: number; ilosc: number } | null;
  /** Odcięte grupki (liczone przy przenosinach siedziby). */
  obozy: { x: number; y: number; ilu: number }[];
  /** Spiżarnie obozów (siedziba ma swoją w `klan.stock`). Stara siedziba po przenosinach też tu trafia. */
  spizarnie: Spizarnia[];
  /** tik założenia ostatniego obozu */
  obozT?: number;
  /** Etap 2: gniazda kamiennych rycerzy zamurowane w skale. */
  gniazda?: Gniazdo[];
  /** Etap 3: fale Strażników Snu. */
  straznicy?: StanStraznikow;
}

/** Gniazdo kamiennych rycerzy: śpią w litej skale, aż ktoś się do nich dokopie. */
export interface Gniazdo {
  id: number; x: number; y: number; rycerzy: number;
  odkryte: boolean;
  /** Na którym z trzech torów (−1, 0, 1) naprawdę leży — błąd znaku z „Przemyśl i kop”. */
  blad: number;
  /** Tory już sprawdzone przez kopaczy (−1, 0, 1). */
  proby: number[];
  /** Etap 4: pokazane kartą „sen o rycerzach” — świeci zawsze. */
  znany?: boolean;
}

export interface Spizarnia { x: number; y: number; ilosc: number; /** tik założenia */ od?: number }

/** Jedna spiżarnia ludu — siedziby albo obozu — z tym, co się z nią robi. */
export interface MiejsceJedzenia {
  x: number; y: number; ilosc: number; baza: boolean;
  wez(n: number): number;
  odloz(n: number): void;
}

/** Wszystkie spiżarnie: najpierw siedziba, potem obozy. */
export function wszystkieSpizarnie(sim: Sim): MiejsceJedzenia[] {
  const out: MiejsceJedzenia[] = [];
  const klan = klanLudu(sim);
  if (klan) out.push({
    x: klan.hx, y: klan.hy, ilosc: klan.stock, baza: true,
    wez: (n) => { const k = Math.min(n, klan.stock); klan.stock -= k; return k; },
    odloz: (n) => { klan.stock += n; },
  });
  for (const s of sim.lud.spizarnie) out.push({
    x: s.x, y: s.y, ilosc: s.ilosc, baza: false,
    wez: (n) => { const k = Math.min(n, s.ilosc); s.ilosc -= k; return k; },
    odloz: (n) => { s.ilosc += n; },
  });
  return out;
}

/** Najbliższa spiżarnia (w linii prostej) — z jedzeniem albo dowolna. */
export function najblizszaSpizarnia(sim: Sim, x: number, y: number, zJedzeniem: boolean): MiejsceJedzenia | null {
  let best: MiejsceJedzenia | null = null, bd = Infinity;
  for (const s of wszystkieSpizarnie(sim)) {
    if (zJedzeniem && s.ilosc <= 0) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Spiżarnie od najbliższej (w linii prostej) — z jedzeniem albo wszystkie. */
export function spizarnieWgOdleglosci(sim: Sim, x: number, y: number, zJedzeniem: boolean): MiejsceJedzenia[] {
  return wszystkieSpizarnie(sim).filter((s) => !zJedzeniem || s.ilosc > 0)
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
}

/** Obóz frontowy: spiżarnia (siedziba albo obóz) najbliżej rdzenia — tam stacjonują pobożni i rycerze. */
export function obozFrontowy(sim: Sim): MiejsceJedzenia | null {
  const w = sim.world;
  let best: MiejsceJedzenia | null = null, bd = Infinity;
  for (const s of wszystkieSpizarnie(sim)) {
    const d = Math.hypot(s.x - w.coreX, s.y - w.coreY);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/** Ile grzyba rośnie przy spiżarni (w zasięgu, z którego robotnicy go do niej znoszą). */
export function grzybPrzy(sim: Sim, x: number, y: number): number {
  const w = sim.world;
  const r = LUD.grzybPrzyObozie;
  let n = 0;
  for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
    if (w.inb(xx, yy) && w.tile[w.idx(xx, yy)] === T.FUNGUS) n++;
  }
  return n;
}

/** Spiżarnia stojąca na tym kaflu (albo tuż obok). */
export function spizarniaW(sim: Sim, x: number, y: number): MiejsceJedzenia | null {
  return wszystkieSpizarnie(sim).find((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1) ?? null;
}

/** Stacjonujący: pobożni i rycerze — jedzenie przynoszą im robotnicy. */
export function stacjonuje(c: Creature): boolean {
  const r = rolaPostaci(c);
  return r === 'pobozny' || r === 'rycerz';
}

export function nowyStanLudu(): StanLudu {
  return { rola: 'robotnik', nastepne: LUD.wyjscieCo, siedzibaT: 0, sklad: null, obozy: [], spizarnie: [] };
}

/** Rola postaci ludu — albo null dla obcych (ludzie z powierzchni). */
export function rolaPostaci(c: Creature): Rola | null {
  return c.race === Race.GOBLIN && !c.buntownik ? (c.rola ?? 'pobozny') : null;
}

/** Mnożnik statystyki: rola × osłabienie po wyjściu ze skały × okaleczenie. */
export function mnoznik(sim: Sim, c: Creature, co: keyof MnoznikiRoli): number {
  const r = rolaPostaci(c);
  if (!r) return 1;
  let v = LUD.role[r][co];
  if (c.slabyDo !== undefined && sim.tick < c.slabyDo && co !== 'hp' && co !== 'glod') v *= LUD.oslabienie;
  if (c.okaleczony && (co === 'hp' || co === 'sila' || co === 'szybkosc')) v *= LUD.okaleczenie;
  if (co !== 'hp' && co !== 'glod' && weteranAktywny(sim, c)) v *= LUD.weteranPremia;
  if (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo && (co === 'sila' || co === 'szybkosc' || co === 'kopanie')) v *= KARTY_LUDU.zatrucie;
  return v;
}

/** Etap 2: przesłużył już swoje w ludzie (staż weterana). */
export function weteranStaz(sim: Sim, c: Creature): boolean {
  return sim.tick - (c.od ?? 0) >= LUD.weteranPo;
}

/** Etap 2: premia weterana działa — staż, najedzony, lud wierny, nie osłabiony po wyjściu ze skały. */
export function weteranAktywny(sim: Sim, c: Creature): boolean {
  if (!weteranStaz(sim, c) || c.hunger >= LUD.weteranGlod) return false;
  if (c.slabyDo !== undefined && sim.tick < c.slabyDo) return false;
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

/** Wzmocnienia i osłabienia postaci: weteran, osłabienie po wyjściu ze skały, okaleczenie. */
export function stanyPostaci(sim: Sim, c: Creature): StanPostaci[] {
  const out: StanPostaci[] = [];
  const premia = `+${Math.round((LUD.weteranPremia - 1) * 100)}% siły, szybkości, kopania i modlitwy`;
  if (weteranAktywny(sim, c)) {
    out.push({ nazwa: 'weteran', skutek: premia, dobry: true, kiedy: 'póki najedzony, a lud wierny' });
  } else if (weteranStaz(sim, c) && rolaPostaci(c)) {
    // staż jest, premii nie ma — na karcie widać dlaczego (bez aureoli)
    const klan = sim.clans[c.clan];
    const czemu = c.hunger >= LUD.weteranGlod ? 'głodny' : (klan && klan.devotion < LUD.weteranWiara) ? 'lud stracił wiarę' : 'osłabiony';
    out.push({ nazwa: 'weteran bez premii', skutek: `${premia} wróci, gdy to minie`, dobry: true, uspiony: true, kiedy: czemu });
  }
  if (c.slabyDo !== undefined && sim.tick < c.slabyDo) {
    out.push({ nazwa: 'osłabiony po wyjściu ze skały', skutek: `−${Math.round((1 - LUD.oslabienie) * 100)}% siły, szybkości, kopania i modlitwy`, dobry: false, do: c.slabyDo });
  }
  if (c.zatrutyDo !== undefined && sim.tick < c.zatrutyDo) {
    out.push({ nazwa: 'zatruty', skutek: `−${Math.round((1 - KARTY_LUDU.zatrucie) * 100)}% siły, szybkości i kopania (zatrute plony)`, dobry: false, do: c.zatrutyDo });
  }
  if (c.okaleczony) {
    out.push({ nazwa: 'okaleczony', skutek: `−${Math.round((1 - LUD.okaleczenie) * 100)}% życia, siły i szybkości`, dobry: false });
  }
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

/** Wolne miejsce na podłodze przy (x, y) — tam staje postać wychodząca ze skały albo nowa siedziba. */
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
function najwiekszaGrupa(sim: Sim, klanId: number): { x: number; y: number; ilu: number } | null {
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

/** Skała wydaje nową postać wybranej roli — jeśli jest na nią krew i miejsce w ludzie. */
function wyjscieZeSkaly(sim: Sim): void {
  const st = sim.lud;
  if (sim.tick < st.nastepne) return;
  const klan = klanLudu(sim);
  const koszt = LUD.koszt[st.rola];
  const zywych = sim.creatures.reduce((n, c) => n + (!c.dead && c.race === Race.GOBLIN ? 1 : 0), 0);
  // nie stać albo pełno — spróbuj za sekundę, licznik nie przepada
  if (!klan || zywych >= LUD.limit || sim.krew < koszt) { st.nastepne = sim.tick + 120; return; }
  // przy największej grupie ludu, nie w siedzibie: siedziba potrafiła zostać na górze,
  // a nowi nie mieli jak zejść do reszty
  // (w czasie fali Strażników nie przy grupie pod rdzeniem — wychodzili prosto pod ich pięści)
  const g0 = najwiekszaGrupa(sim, klan.id);
  const g = g0 && falaTrwa(sim) && Math.hypot(g0.x - sim.world.coreX, g0.y - sim.world.przedsionekY) < STRAZNICY.limitOdRdzenia + STRAZNICY.ucieczkaZapas ? null : g0;
  const miejsce = (g && podloga(sim, Math.floor(g.x), Math.floor(g.y), 5)) ?? podloga(sim, klan.hx, klan.hy) ?? [klan.hx, klan.hy];
  const c = sim.spawn(Race.GOBLIN, klan.id, miejsce[0], miejsce[1]);
  st.nastepne = sim.tick + LUD.wyjscieCo;
  if (!c) return;
  sim.krew -= koszt;
  nadajRole(sim, c, st.rola);
  c.age = 0;
  c.devotion = Math.max(c.devotion, klan.devotion);
  c.slabyDo = sim.tick + LUD.oslabienieTikow;
  c.od = sim.tick;
  sim.efekt(c.x, c.y, 'zasiew');
  zapisz(sim, 'narodziny', `ze skały wychodzi ${NAZWA_ROLI[st.rola].toLowerCase()} #${c.id} (−${koszt} krwi)`, c.x, c.y);
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
  // stara siedziba zostaje obozem ze swoją spiżarnią — robotnicy będą z niej brać (nic się nie teleportuje)
  const reszta = klan.stock;
  odlozDoObozu(sim, klan.hx, klan.hy, reszta);
  klan.stock = 0;
  klan.hx = gdzie[0]; klan.hy = gdzie[1];
  if (w.passable(gdzie[0], gdzie[1])) w.set(gdzie[0], gdzie[1], T.NEST);
  sim.lud.siedzibaT = sim.tick;
  sim.lud.obozy = sim.lud.obozy.filter((o) => Math.hypot(o.x - gdzie[0], o.y - gdzie[1]) > 8);
  sim.efekt(gdzie[0] + 0.5, gdzie[1] + 0.5, 'cud');
  sim.gdzie(gdzie[0] + 0.5, gdzie[1] + 0.5).log(
    reszta > 0 ? `${klan.name} przenieśli siedzibę. W starym obozie zostało ${reszta} jedzenia — robotnicy będą z niego brać.` : `${klan.name} przenieśli siedzibę tam, gdzie jest ich najwięcej.`,
    'swiat');
}

/**
 * Przegrana: nie da się już wygrać. Bez pobożnych nikt nie skruszy skorupy, a nowego
 * pobożnego skała wyda tylko za krew. Krew da jeszcze ofiara z każdego, kto żyje
 * (wiarę na szept i tak wymodlą, choćby powoli) — gra kończy się dopiero wtedy, gdy
 * nawet ofiara ze wszystkich nie starczy na jednego pobożnego.
 */
function sprawdzPrzegrana(sim: Sim): void {
  if (sim.ending) return;
  const role = liczRole(sim);
  if (role.pobozny > 0) return;
  const inni = role.robotnik + role.rycerz;
  const zOfiar = inni * (LUD.ofiaraKrew + GORA.krewZaSmierc);
  if (sim.krew + zOfiar >= LUD.koszt.pobozny) return;
  sim.ending = 'upadek';
  sim.log('Nie został nikt, kto by się modlił, a krwi nie starczy, by skała wydała nowego.', 'koniec');
}

/**
 * Miejsce na obóz albo siedzibę: płaska, szeroka półka (co najmniej `obozSzerokosc` kafli
 * podłogi z miejscem nad głową), sucha i z dala od magmy — najlepiej przy grzybie.
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
      const wynik = szer * 2 + Math.min(15, grzybPrzy(sim, x, y)) * 1.5 - Math.hypot(x - gx, (y - gy) * 1.5) * 0.6;
      if (wynik > bs) { bs = wynik; best = [x, y]; }
    }
  }
  // nie ma szerokiej półki — węższa, byle płaska
  return best ?? (minSzer > 3 ? miejsceNaObozu(sim, gx, gy, rx, ry, 3) : null);
}

/** Dokłada jedzenie do spiżarni obozu w (x, y) — albo zakłada tam obóz. */
function odlozDoObozu(sim: Sim, x: number, y: number, ile: number): void {
  const jest = sim.lud.spizarnie.find((s) => Math.abs(s.x - x) <= 3 && Math.abs(s.y - y) <= 3);
  if (jest) jest.ilosc += ile;
  else sim.lud.spizarnie.push({ x, y, ilosc: ile, od: sim.tick });
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
    const daleko = wszystkieSpizarnie(sim).every((s) => Math.hypot(s.x - gx, s.y - gy) > LUD.obozOdleglosc);
    if (!daleko) continue;
    if (Math.hypot(gx - w.coreX, gy - w.coreY) < LUD.strefaRdzenia) {
      gx = w.coreX + (gx < w.coreX ? -1 : 1) * (P.przedsionekX + LUD.wartaOdstep);
      gy = w.przedsionekY;
    }
    if (sim.tick - (sim.lud.obozT ?? -1e9) < LUD.obozPrzerwa) continue;
    const m = miejsceNaObozu(sim, gx, gy, 20, 12);
    if (!m) continue;   // nie ma szerokiej i wysokiej półki — obozu tu nie będzie
    if (wszystkieSpizarnie(sim).some((s) => Math.hypot(s.x - m[0], s.y - m[1]) <= LUD.obozOdleglosc)) continue;
    sim.lud.spizarnie.push({ x: m[0], y: m[1], ilosc: 0, od: sim.tick });
    sim.lud.obozT = sim.tick;
    sim.gdzie(m[0] + 0.5, m[1] + 0.5).log(`${klan.name} rozbili obóz — robotnicy będą tu donosić jedzenie.`, 'swiat', 'oboz');
  }
  // pusty obóz bez nikogo w pobliżu znika
  const zywi = sim.creatures.filter((c) => !c.dead && c.clan === klan.id);
  sim.lud.spizarnie = sim.lud.spizarnie.filter((s) => s.ilosc > 0 || sim.tick - (s.od ?? 0) < LUD.obozZycie || zywi.some((c) => Math.hypot(c.x - s.x, c.y - s.y) < 15));
}

// ------------------------------------------------------------ gniazda rycerzy (etap 2)

/**
 * Zamurowuje w skale gniazda kamiennych rycerzy: po jednym w każdym paśmie głębokości
 * między siedzibą a rdzeniem, w litej skale z podłogą pod spodem, z dala od magmy,
 * wody, siedziby i rdzenia. Czysty los psułby uczciwość (raz tuż obok, raz w ogniu).
 */
export function zalozGniazda(sim: Sim): void {
  const w = sim.world;
  const klan = klanLudu(sim);
  if (!klan) return;
  const gniazda: Gniazdo[] = [];
  // własne losowanie: gniazda nie przestawiają reszty świata (ta sama góra co przed etapem 2)
  const rng = new Rng((sim.seed ^ 0x5bd1e995) >>> 0);
  const odY = Math.min(klan.hy + 6, w.przedsionekY - 60), doY = w.przedsionekY - 22;
  const pasmo = (doY - odY) / LUD.gniazda;
  const lite = (x: number, y: number) => w.inb(x, y) && w.solid(x, y) && w.hardness(x, y) > 0 && w.tile[w.idx(x, y)] !== T.CORE;
  for (let k = 0; k < LUD.gniazda; k++) {
    let best: [number, number] | null = null, bs = -Infinity;
    for (let proba = 0; proba < 400; proba++) {
      const x = 8 + rng.int(w.w - 16);
      const y = Math.floor(odY + pasmo * k + rng.int(Math.max(1, Math.floor(pasmo))));
      // komora 3×2 w litej skale (i lita skała wokół), podłoga pod spodem
      let ok = true;
      for (let yy = y - 2; yy <= y + 2 && ok; yy++) for (let xx = x - 2; xx <= x + 2 && ok; xx++) if (!lite(xx, yy)) ok = false;
      if (!ok) continue;
      if (sim.przyMagmie(x, y, 7)) continue;
      if (Math.hypot(x - klan.hx, y - klan.hy) < LUD.gniazdoOdSiedziby) continue;
      if (Math.hypot(x - w.coreX, y - w.coreY) < LUD.strefaRdzenia + 6) continue;
      if (gniazda.some((g) => Math.hypot(g.x - x, g.y - y) < LUD.gniazdoOdstep)) continue;
      let woda = false;
      for (let yy = y - 4; yy <= y + 4 && !woda; yy++) for (let xx = x - 4; xx <= x + 4; xx++) if (w.inb(xx, yy) && w.water[w.idx(xx, yy)] > 0) { woda = true; break; }
      if (woda) continue;
      // z boku osi siedziba–rdzeń: na osi leży droga do rdzenia i jej kopacze odkrywali gniazda sami,
      // a za daleko — wyprawa przez pół góry; najchętniej `gniazdoOdOsi` kafli w bok
      const os = Math.abs(x - (klan.hx + (w.coreX - klan.hx) * (y - klan.hy) / Math.max(1, w.coreY - klan.hy)));
      if (os < LUD.gniazdoOdOsi.od) continue;
      const wynik = -Math.abs(os - LUD.gniazdoOdOsi.najlepiej) + rng.int(20);
      if (wynik > bs) { bs = wynik; best = [x, y]; }
    }
    if (!best) continue;
    const n = LUD.gniazdoRycerzy.od + rng.int(LUD.gniazdoRycerzy.do - LUD.gniazdoRycerzy.od + 1);
    gniazda.push({ id: gniazda.length, x: best[0], y: best[1], rycerzy: n, odkryte: false, blad: rng.int(3) - 1, proby: [] });
  }
  sim.lud.gniazda = gniazda;
}

/** Nieodkryte gniazda. */
export function gniazdaWSkale(sim: Sim): Gniazdo[] {
  return (sim.lud.gniazda ?? []).filter((g) => !g.odkryte);
}

/** Czy ktoś się już dokopał w pobliże gniazda (kafel przechodni w jego zasięgu). */
function dokopane(sim: Sim, g: Gniazdo): boolean {
  const w = sim.world, r = LUD.gniazdoZasieg;
  for (let yy = g.y - r; yy <= g.y + r; yy++) for (let xx = g.x - r; xx <= g.x + r; xx++) if (w.passable(xx, yy)) return true;
  return false;
}

/** Budzi gniazdo: komora się otwiera, rycerze wstają i przyłączają się do ludu — od razu jako weterani. */
/** Budzi gniazdo; `wyjscie` — rycerze przebili się sami do tego miejsca (tunel zagrodzony tuż przy gnieździe). */
export function obudzGniazdo(sim: Sim, g: Gniazdo, wyjscie?: [number, number]): void {
  const w = sim.world;
  const klan = klanLudu(sim);
  g.odkryte = true;
  if (!klan) return;
  for (let xx = g.x - 1; xx <= g.x + 1; xx++) for (let yy = g.y - 1; yy <= g.y; yy++) if (w.tile[w.idx(xx, yy)] !== T.CORE) w.set(xx, yy, T.AIR);
  // przejście z komory do tunelu, który ją odkrył — inaczej rycerze stali zamurowani tuż obok niego
  let bx = -1, by = -1, bd = Infinity;
  const r = LUD.gniazdoZasieg + 1;
  for (let yy = g.y - r; yy <= g.y + r; yy++) for (let xx = g.x - r; xx <= g.x + r; xx++) {
    if (Math.abs(xx - g.x) <= 1 && yy >= g.y - 1 && yy <= g.y) continue;
    if (!w.passable(xx, yy)) continue;
    const d = Math.abs(xx - g.x) + Math.abs(yy - g.y);
    if (d < bd) { bd = d; bx = xx; by = yy; }
  }
  if (bx >= 0) {
    let x = Math.max(g.x - 1, Math.min(g.x + 1, bx)), y = Math.max(g.y - 1, Math.min(g.y, by));
    for (let k = 0; k < 12 && (x !== bx || y !== by); k++) {
      if (x !== bx) x += Math.sign(bx - x); else y += Math.sign(by - y);
      if (w.solid(x, y) && w.hardness(x, y) > 0) w.set(x, y, T.AIR);
    }
  }
  for (let i = 0; i < g.rycerzy; i++) {
    const c = wyjscie ? sim.spawn(Race.GOBLIN, klan.id, wyjscie[0] + (i % 3) - 1, wyjscie[1]) : sim.spawn(Race.GOBLIN, klan.id, g.x - 1 + (i % 3), g.y);
    if (!c) continue;
    nadajRole(sim, c, 'rycerz');
    c.age = 0;
    c.devotion = Math.max(c.devotion, klan.devotion);
    c.od = sim.tick - LUD.weteranPo;      // przespali wieki w skale — budzą się weteranami, syci
    c.hunger = 0;
  }
  // kto kopał ku temu gniazdu, kończy — gniazdo już nie śpi
  for (const o of sim.creatures) if (!o.dead && o.tor && o.tor.gn === g.id) { o.tor = undefined; o.przemysl = undefined; o.jt = 0; }
  sim.efekt(g.x + 0.5, g.y + 0.5, 'cud');
  for (let i = 0; i < 10; i++) sim.spark(g.x + 0.5, g.y, 'glint');
  sim.gdzie(g.x + 0.5, g.y + 0.5).log(`Skała pękła — ${g.rycerzy} kamiennych rycerzy budzi się i przyłącza do ludu.`, 'swiat', 'gniazdo');
  zapisz(sim, 'narodziny', `gniazdo #${g.id} odkryte: ${g.rycerzy} rycerzy`, g.x, g.y);
}

function pilnujGniazd(sim: Sim): void {
  for (const g of gniazdaWSkale(sim)) if (dokopane(sim, g)) obudzGniazdo(sim, g);
}

/**
 * Uprawa grzyba przy spiżarniach: gdzie przy spiżarni jest robotnik, a grzyba mało, odrasta nowy —
 * na podłodze, w suchym miejscu. Bez tego grzyb wokół siedziby kończył się po kilku minutach
 * i cały lud wymierał z głodu, choć robotnicy żyli.
 */
function uprawa(sim: Sim): void {
  const w = sim.world;
  for (const sp of wszystkieSpizarnie(sim)) {
    // liczy tylko grzyb na podłodze w obszarze, w którym sam sadzi — wiszący w powietrzu nad siedzibą
    // (nie do zebrania) blokował uprawę i siedziba głodowała przy trzystu grzybach na mapie
    const R = LUD.uprawaZasieg, H = LUD.uprawaWPionie;
    let rosnie = 0;
    for (let y = sp.y - H; y <= sp.y + H; y++) for (let x = sp.x - R; x <= sp.x + R; x++) {
      if (w.inb(x, y + 1) && w.tile[w.idx(x, y)] === T.FUNGUS && w.solid(x, y + 1)) rosnie++;
    }
    if (rosnie >= LUD.uprawaDo) continue;
    const jest = sim.creatures.some((c) => !c.dead && rolaPostaci(c) === 'robotnik' && Math.hypot(c.x - sp.x, c.y - sp.y) <= LUD.uprawaZasieg);
    if (!jest) continue;
    // najpierw tuż przy spiżarni; gdy tam nie ma podłogi (siedziba w pustej jaskini) — szerzej
    for (let proba = 0; proba < 24; proba++) {
      const r = proba < 12 ? LUD.uprawaPromien : R, h = proba < 12 ? 3 : H;
      const x = sp.x + sim.rng.int(r * 2 + 1) - r;
      const y = sp.y + sim.rng.int(h * 2 + 1) - h;
      if (!w.inb(x, y + 1) || w.tile[w.idx(x, y)] !== T.AIR || !w.solid(x, y + 1)) continue;
      if (w.water[w.idx(x, y)] > 2 || w.magma[w.idx(x, y)] > 0 || (Math.abs(x - sp.x) <= 1 && Math.abs(y - sp.y) <= 1)) continue;
      w.tile[w.idx(x, y)] = T.FUNGUS;
      break;
    }
  }
}

/** Wołane z sim.step() co tik. */
export function tikLudu(sim: Sim): void {
  if (sim.spokojnySwiat || sim.ending) return;
  // stary zapis: „stara spiżarnia” staje się obozem
  if (sim.lud.sklad) { odlozDoObozu(sim, sim.lud.sklad.x, sim.lud.sklad.y, sim.lud.sklad.ilosc); sim.lud.sklad = null; }
  if (!sim.lud.spizarnie) sim.lud.spizarnie = [];
  wyjscieZeSkaly(sim);
  if (sim.tick % 30 === 0) pilnujGniazd(sim);
  if (sim.tick % LUD.uprawaCo === 0) uprawa(sim);
  tikStraznikow(sim);
  tikBuntu(sim);
  if (sim.tick % LUD.siedzibaCo === 0) {
    pilnujSiedziby(sim);
    const klan = klanLudu(sim);
    if (klan) pilnujObozow(sim, klan);
  }
  if (sim.tick % LUD.przegranaCo === 0) sprawdzPrzegrana(sim);
}
