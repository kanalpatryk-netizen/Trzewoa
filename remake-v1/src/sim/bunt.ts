/**
 * Bunt rycerzy (Remake v1, etap 4): skutek zostawionego spisku. Część rycerzy przechodzi do własnego
 * klanu „Zbuntowani rycerze” — w czerwonym obrysie, bez jedzenia i bez rozkazów — i bije każdego z ludu.
 * Wierni rycerze ruszają na nich sami (jak na Strażników Snu).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job } from './creatures';
import { Race } from './races';
import { KARTY_LUDU as K } from '../nastawy/karty-ludu';
import { klanLudu, rolaPostaci } from './lud';

/** Klan buntowników — zakładany przy pierwszym buncie. */
function klanBuntu(sim: Sim): number {
  const jest = sim.clans.find((k) => k.name === 'Zbuntowani rycerze');
  if (jest) { jest.dead = false; return jest.id; }
  const lud = klanLudu(sim);
  const k = sim.newClan(Race.GOBLIN, lud?.hx ?? 10, lud?.hy ?? 10);
  k.name = 'Zbuntowani rycerze';
  k.cecha = undefined;
  k.devotion = 0;
  return k.id;
}

/** Przeciąga `ilu` rycerzy do buntu (najpierw tych, którzy nie stoją na warcie). Zwraca, ilu przeszło. */
export function zbuntuj(sim: Sim, ilu: number): number {
  const rycerze = sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === 'rycerz')
    .sort((a, b) => (a.job === Job.WARTA ? 1 : 0) - (b.job === Job.WARTA ? 1 : 0));
  const id = klanBuntu(sim);
  let n = 0;
  for (const c of rycerze.slice(0, ilu)) {
    sim.clans[c.clan].pop--;
    c.clan = id; sim.clans[id].pop++;
    c.buntownik = true;
    c.wyprawa = false; c.przemysl = undefined; c.tor = undefined;
    c.zamiar = 'zbuntował się — bije każdego z ludu';
    c.zamiarDo = undefined;
    c.jt = 0;
    sim.efekt(c.x, c.y, 'mysl', 'bunt!');
    n++;
  }
  return n;
}

/** Zawraca buntowników do ludu (szept, karta). */
export function nawroc(sim: Sim, ilu: number): number {
  const lud = klanLudu(sim);
  if (!lud) return 0;
  let n = 0;
  for (const c of sim.creatures) {
    if (n >= ilu || c.dead || !c.buntownik) continue;
    sim.clans[c.clan].pop--;
    c.clan = lud.id; lud.pop++;
    c.buntownik = false;
    c.zamiar = undefined; c.jt = 0;
    sim.target.delete(c.id);
    sim.efekt(c.x, c.y, 'mysl', 'wraca');
    n++;
  }
  return n;
}

/** Buntownicy odchodzą z góry (karta „oddaj im obóz”). */
export function odejdz(sim: Sim): number {
  let n = 0;
  for (const c of sim.creatures) if (!c.dead && c.buntownik) { c.dead = true; sim.clans[c.clan].pop--; sim.efekt(c.x, c.y, 'mysl', 'odchodzi'); n++; }
  if (n) sim.log(`Zbuntowani rycerze (${n}) zabrali zapasy i odeszli z góry.`, 'swiat');
  return n;
}

export function buntownicy(sim: Sim): Creature[] {
  return sim.creatures.filter((c) => !c.dead && c.buntownik);
}

/** Zajęcie buntownika (zamiast planera ludu): najbliższy z ludu — i na niego. */
export function zajecieBuntownika(sim: Sim, c: Creature): void {
  c.hunger = Math.min(c.hunger, 0.3);       // buntownicy biorą, co chcą — nie głodują
  c.zamiar = 'zbuntował się — bije każdego z ludu'; c.zamiarDo = undefined;
  const cel = sim.nearestCreature(c.x, c.y, K.buntWidzi, (o) => !o.buntownik && rolaPostaci(o) !== null);
  if (!cel) { c.job = Job.WANDER; c.jx = Math.floor(c.x) + (sim.rng.chance(0.5) ? 6 : -6); c.jy = Math.floor(c.y); c.jt = 600; return; }
  sim.target.set(c.id, cel.id);
  c.job = Job.FIGHT; c.jt = 900;
}

/** Wierni rycerze ruszają na buntowników w zasięgu (co pół sekundy, z tikLudu). */
export function tikBuntu(sim: Sim): void {
  if (sim.tick % 60 !== 0) return;
  const wrogowie = buntownicy(sim);
  if (!wrogowie.length) return;
  for (const c of sim.creatures) {
    if (c.dead || rolaPostaci(c) !== 'rycerz') continue;
    const obecny = sim.creatureById(sim.target.get(c.id) ?? -1);
    if (c.job === Job.FIGHT && obecny && !obecny.dead && (obecny.buntownik || obecny.straznik)) continue;
    let best: Creature | null = null, bd = K.buntWidzi;
    for (const s of wrogowie) { const d = Math.hypot(s.x - c.x, s.y - c.y); if (d < bd) { bd = d; best = s; } }
    if (!best) continue;
    sim.target.set(c.id, best.id);
    c.job = Job.FIGHT; c.jt = 600; c.droga = undefined;
    c.zamiar = 'walczy ze zbuntowanym rycerzem'; c.zamiarDo = sim.tick + 600;
  }
}
