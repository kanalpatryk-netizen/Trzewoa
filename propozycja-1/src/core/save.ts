import { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { schodyDrogi } from '../sim/pielgrzymka';
import { applyTaintEffect } from '../powers/powers';
import { SWIAT } from '../nastawy/swiat';

/**
 * Zapis stanu. Przy grze o pokoleniach i przypływach to nie wygoda, tylko narzędzie:
 * bez niego nie da się wrócić do tej samej sytuacji i sprawdzić, co zmieniła decyzja.
 */
const KEY = 'trzewia-propozycja-1:zapis';
// Alpha, etap 3: góra z warstwami jest szersza (192 kafle zamiast 176) — stare zapisy się nie wczytają
// (etap 3d: drugi otwór z wiadrem, ołtarz i kamienna podłoga sali — znów nowa góra; etap 3e: ruiny z zabytkami)
// (25.10: droga wiernych jako szyb ze schodami — nowa góra: wnęka przy sali i szyb bez kamienia)
const VERSION = 5;

/** Znaki base64 (jak btoa) jako kody ASCII. */
const ZNAKI_B64 = Uint8Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', (z) => z.charCodeAt(0));
const ROWNA_SIE = 61;

/**
 * Base64 bajtów — to samo co btoa, znak w znak, ale wprost do bajtów ASCII: dawne btoa z napisu sklejanego
 * po 32 tysiące argumentów `String.fromCharCode` brało prawie cały czas autozapisu (~30 ms co minutę gry).
 */
function toB64(buf: ArrayBufferView): string {
  const b = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const n = b.length;
  const out = new Uint8Array(Math.ceil(n / 3) * 4);
  let o = 0, i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
    out[o++] = ZNAKI_B64[v >> 18]; out[o++] = ZNAKI_B64[(v >> 12) & 63];
    out[o++] = ZNAKI_B64[(v >> 6) & 63]; out[o++] = ZNAKI_B64[v & 63];
  }
  if (i < n) {
    const dwa = i + 1 < n;
    const v = (b[i] << 16) | (dwa ? b[i + 1] << 8 : 0);
    out[o++] = ZNAKI_B64[v >> 18]; out[o++] = ZNAKI_B64[(v >> 12) & 63];
    out[o++] = dwa ? ZNAKI_B64[(v >> 6) & 63] : ROWNA_SIE; out[o++] = ROWNA_SIE;
  }
  return new TextDecoder().decode(out);
}

function fromB64(b64: string, out: ArrayBufferView): void {
  const bin = atob(b64);
  const bytes = new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  for (let i = 0; i < bytes.length && i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
}

export function serialize(sim: Sim): string {
  const w = sim.world;
  return JSON.stringify({
    v: VERSION,
    seed: sim.seed,
    tick: sim.tick,
    wiara: sim.wiara, krew: sim.krew, zelazo: sim.zelazo, zloto: sim.zloto, sen: sim.sen,
    pomieszczenia: sim.pomieszczenia, nrPomieszczenia: sim.nrPomieszczenia, zbroja: sim.zbroja, odblokowaneWiadra: sim.odblokowaneWiadra, rytual: sim.rytual, koszmar: sim.koszmar, stat: sim.stat, dug: sim.dug,
    // v4.1 beta: skutki odroczone i karty z łańcuchów przeżywają zapis (inaczej dług znikał po wczytaniu)
    odroczone: sim.wydarzenia.odroczone, czekajace: sim.wydarzenia.czekajace, lud: sim.lud, kupione: sim.wydarzenia.kupione,
    fungusBudget: sim.fungusBudget, nextTide: sim.nextTide, ending: sim.ending, przybyszow: sim.przybyszow,
    taints: sim.taints, nextId: sim.nextId, allForges: sim.allForges,
    chronicle: sim.chronicle.slice(-120),
    clans: sim.clans.map((c) => ({ ...c, grudge: [...c.grudge] })),
    // droga to rachunek na chwilę — po wczytaniu i tak wyznaczy się na nowo
    creatures: sim.creatures.filter((c) => !c.dead).map((c) => ({ ...c, droga: undefined, drogaI: undefined, drogaKopie: undefined })),
    tile: toB64(w.tile), water: toB64(w.water), magma: toB64(w.magma),
    mem: toB64(w.mem), ever: toB64(w.ever), lastSeen: toB64(w.lastSeen), slad: toB64(w.slad),
    // liny (w zapisach z 3d pole nazywało się „drabina” — szczeble wczytują się jako liny)
    lina: toB64(w.lina),
    kucie: [...w.kucie],
  });
}

export function restore(json: string): Sim | null {
  let data: any;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || data.v !== VERSION) return null;

  const sim = new Sim(data.seed);          // ta sama góra, potem nadpisana stanem
  const w = sim.world;
  fromB64(data.tile, w.tile); fromB64(data.water, w.water); fromB64(data.magma, w.magma);
  // Remake v1: w górze nie ma już wody ani lawy — stary zapis wraca suchy i zimny
  if (!SWIAT.plyny) { w.water.fill(0); w.magma.fill(0); }
  fromB64(data.mem, w.mem); fromB64(data.ever, w.ever); fromB64(data.lastSeen, w.lastSeen);
  if (data.slad) fromB64(data.slad, w.slad);
  if (data.lina) fromB64(data.lina, w.lina);
  else if (data.drabina) fromB64(data.drabina, w.lina);
  if (Array.isArray(data.kucie)) for (const [i, f] of data.kucie) if (typeof i === 'number' && typeof f === 'number') w.kucie.set(i, f);

  sim.tick = data.tick;
  sim.wiara = data.wiara; sim.krew = data.krew; sim.sen = data.sen;
  // Alpha, etap 3b: zapis sprzed kruszców nie zna liczników — zaczynają od zera
  sim.zelazo = typeof data.zelazo === 'number' ? data.zelazo : 0;
  sim.zloto = typeof data.zloto === 'number' ? data.zloto : 0;
  // etap 3c: pomieszczenia i zbroja (zapis sprzed nich — pusto)
  if (Array.isArray(data.pomieszczenia)) sim.pomieszczenia = data.pomieszczenia;
  if (typeof data.nrPomieszczenia === 'number') sim.nrPomieszczenia = data.nrPomieszczenia;
  if (Array.isArray(data.zbroja)) sim.zbroja = data.zbroja;
  sim.odblokowaneWiadra = Array.isArray(data.odblokowaneWiadra) ? data.odblokowaneWiadra.filter((i: unknown) => typeof i === 'number') : [];
  sim.koszmar = true;     // Remake v2: tylko Koszmar — także stare zapisy z łaskawej i surowej góry
  if (data.stat) sim.stat = { ...sim.stat, ...data.stat };
  if (data.dug) sim.dug = data.dug;
  if (Array.isArray(data.odroczone)) sim.wydarzenia.odroczone = data.odroczone;
  if (Array.isArray(data.czekajace)) sim.wydarzenia.czekajace = data.czekajace;
  if (data.lud && typeof data.lud === 'object') sim.lud = { ...sim.lud, ...data.lud };
  if (data.kupione && typeof data.kupione === 'object') sim.wydarzenia.kupione = data.kupione;
  if (data.rytual) sim.rytual = { ...sim.rytual, ...data.rytual };   // stare zapisy nie znają nowych pól
  sim.fungusBudget = data.fungusBudget; sim.nextTide = data.nextTide; sim.ending = data.ending ?? null;
  sim.przybyszow = data.przybyszow ?? 0;
  sim.taints = data.taints;
  sim.allForges = data.allForges ?? [];
  sim.chronicle = data.chronicle ?? [];

  sim.clans = data.clans.map((c: any) => ({
    ...c, grudge: new Map<number, number>(c.grudge),
    rytual: c.rytual ?? 0, pekniecia: c.pekniecia ?? 0,
  }));
  // najazd z powierzchni wycięty — ludzie ze starego zapisu nie wracają do góry
  sim.creatures = (data.creatures as Creature[]).filter((c) => c.race !== Race.HUMAN);
  for (const k of sim.clans) if (k.race === Race.HUMAN && !k.dead) { k.dead = true; k.pop = 0; }
  sim.byId = new Map(sim.creatures.map((c) => [c.id, c]));
  // numer nie może wrócić do już zajętego — inaczej nowe stworzenie nadpisze stare w byId
  let maxId = 0;
  for (const c of sim.creatures) if (c.id > maxId) maxId = c.id;
  sim.nextId = Math.max(data.nextId ?? 1, maxId + 1);
  sim.target.clear();
  sim.particles.length = 0;

  // skazy z zapisu muszą wrócić do tablicy ras — one żyją poza symulacją
  applyTaints(sim);
  schodyDrogi(sim);       // schody drogi wiernych liczy się z mapy — nie ma ich w zapisie
  w.countUnknown(sim.tick);
  return sim;
}

/** Skazy żyją w tablicy ras, więc po wczytaniu trzeba je nałożyć na nowo. */
function applyTaints(sim: Sim): void {
  sim.taints.forEach((list, race) => list.forEach((tool) => applyTaintEffect(race, tool)));
}

export function saveToStorage(sim: Sim): boolean {
  try { localStorage.setItem(KEY, serialize(sim)); return true; } catch { return false; }
}

export function loadFromStorage(): Sim | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? restore(raw) : null;
  } catch { return null; }
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
