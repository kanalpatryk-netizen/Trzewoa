import { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { applyTaintEffect } from '../powers/powers';

/**
 * Zapis stanu. Przy grze o pokoleniach i przypływach to nie wygoda, tylko narzędzie:
 * bez niego nie da się wrócić do tej samej sytuacji i sprawdzić, co zmieniła decyzja.
 */
const KEY = 'trzewia:zapis';
const VERSION = 1;

function toB64(buf: ArrayBufferView): string {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
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
    wiara: sim.wiara, krew: sim.krew, sen: sim.sen, rytual: sim.rytual, lagodna: sim.lagodna,
    fungusBudget: sim.fungusBudget, nextTide: sim.nextTide, ending: sim.ending, przybyszow: sim.przybyszow,
    taints: sim.taints, nextId: sim.nextId, allForges: sim.allForges,
    chronicle: sim.chronicle.slice(-120),
    clans: sim.clans.map((c) => ({ ...c, grudge: [...c.grudge] })),
    // droga to rachunek na chwilę — po wczytaniu i tak wyznaczy się na nowo
    creatures: sim.creatures.filter((c) => !c.dead).map((c) => ({ ...c, droga: undefined, drogaI: undefined })),
    tile: toB64(w.tile), water: toB64(w.water), magma: toB64(w.magma),
    mem: toB64(w.mem), ever: toB64(w.ever), lastSeen: toB64(w.lastSeen), slad: toB64(w.slad),
  });
}

export function restore(json: string): Sim | null {
  let data: any;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || data.v !== VERSION) return null;

  const sim = new Sim(data.seed);          // ta sama góra, potem nadpisana stanem
  const w = sim.world;
  fromB64(data.tile, w.tile); fromB64(data.water, w.water); fromB64(data.magma, w.magma);
  fromB64(data.mem, w.mem); fromB64(data.ever, w.ever); fromB64(data.lastSeen, w.lastSeen);
  if (data.slad) fromB64(data.slad, w.slad);

  sim.tick = data.tick;
  sim.wiara = data.wiara; sim.krew = data.krew; sim.sen = data.sen;
  sim.lagodna = !!data.lagodna;
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
  sim.creatures = data.creatures as Creature[];
  sim.byId = new Map(sim.creatures.map((c) => [c.id, c]));
  // numer nie może wrócić do już zajętego — inaczej nowe stworzenie nadpisze stare w byId
  let maxId = 0;
  for (const c of sim.creatures) if (c.id > maxId) maxId = c.id;
  sim.nextId = Math.max(data.nextId ?? 1, maxId + 1);
  sim.target.clear();
  sim.particles.length = 0;

  // skazy z zapisu muszą wrócić do tablicy ras — one żyją poza symulacją
  applyTaints(sim);
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
