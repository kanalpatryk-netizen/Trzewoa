/**
 * Strażnicy Snu (Remake v1, etap 3): fale spod skorupy rdzenia. Liczby w src/nastawy/straznicy.ts,
 * boss w src/sim/boss.ts. Strażnicy przenikają skałę, nie jedzą i nie śpią — idą do najbliższego
 * z ludu przy rdzeniu i biją. Bronią się przed nimi rycerze; reszta oddaje tylko słaby cios.
 * Dopóki fala trwa, skorupa nie pęka (sim/rytual.ts pyta o `falaTrwa`).
 */
import type { Sim } from './sim';
import type { Creature } from './creatures';
import { Job } from './creatures';
import { Race, RACES } from './races';
import { STRAZNICY as S } from '../nastawy/straznicy';
import { procentSkorupy } from './rytual';
import { rolaPostaci, mnoznik } from './lud';
import { aktywnyBoss } from './boss';
import { zapisz } from './dziennik';

export interface StanStraznikow {
  /** numer następnej (albo trwającej) fali w STRAZNICY.fale */
  fala: number;
  trwa: boolean;
  /** klan Strażników (−1 = jeszcze nie ma) */
  klan: number;
  /** tik początku trwającej fali */
  od: number;
}

export function nowyStanStraznikow(): StanStraznikow {
  return { fala: 0, trwa: false, klan: -1, od: 0 };
}

function stan(sim: Sim): StanStraznikow {
  return (sim.lud.straznicy ??= nowyStanStraznikow());
}

/** Czy trwa fala — wtedy skorupa nie pęka. */
export function falaTrwa(sim: Sim): boolean {
  return !!sim.lud.straznicy?.trwa;
}

/** Czy trwa fala bez bossa — wtedy wszyscy poza rycerzami odchodzą spod rdzenia. */
export function falaZwykla(sim: Sim): boolean {
  const st = sim.lud.straznicy;
  return !!st?.trwa && !S.fale[st.fala]?.boss;
}

/** Czy (x, y) leży w strefie, w której grasują Strażnicy (z zapasem na ucieczkę). */
export function wStrefieStraznikow(sim: Sim, x: number, y: number, zapas = 0): boolean {
  const w = sim.world;
  return Math.hypot(x - w.coreX, y - w.przedsionekY) <= S.limitOdRdzenia + zapas;
}

/** Żywi Strażnicy (z bossem). */
export function zywiStraznicy(sim: Sim): Creature[] {
  return sim.creatures.filter((c) => !c.dead && c.straznik);
}

/** Klan Strażników — zakładany przy pierwszej fali, bez wiary (nie kują skorupy, nie dostają drogi). */
function klanStraznikow(sim: Sim): number {
  const st = stan(sim);
  if (st.klan >= 0 && sim.clans[st.klan]) return st.klan;
  const w = sim.world;
  const k = sim.newClan(Race.TROLL, w.coreX, w.przedsionekY);
  k.name = 'Strażnicy Snu';
  k.cecha = undefined;
  k.devotion = 0;
  st.klan = k.id;
  return k.id;
}

/** Miejsce w skale wokół przedsionka, skąd Strażnik wychodzi. */
export function miejscePojawienia(sim: Sim): [number, number] {
  const w = sim.world;
  const r = S.pojawOd + sim.rng.int(Math.max(1, S.pojawDo - S.pojawOd + 1));
  const a = sim.rng.range(-Math.PI, 0);   // z boków i z góry — nie spod rdzenia
  const x = Math.max(2, Math.min(w.w - 3, Math.round(w.coreX + Math.cos(a) * r)));
  const y = Math.max(2, Math.min(w.coreY - 2, Math.round(w.przedsionekY + Math.sin(a) * r * 0.7)));
  return [x, y];
}

/** Wywołuje Strażnika (albo bossa — `boss` ustawia sim/boss.ts) w (x, y). */
export function nowyStraznik(sim: Sim, x: number, y: number, hp: number): Creature | null {
  const klan = klanStraznikow(sim);
  // spawn wycina w skale kafel — Strażnik ma przenikać skałę, nie drążyć w niej dziur
  const w = sim.world;
  const t = w.inb(x, y) ? w.tile[w.idx(x, y)] : -1;
  const c = sim.spawn(Race.TROLL, klan, x, y);
  if (t >= 0) w.tile[w.idx(x, y)] = t;
  if (!c) return null;
  c.straznik = true;
  c.devotion = 0;
  c.hp = hp; c.hpMax = hp;
  c.hunger = 0;
  c.zamiar = 'strzeże snu góry — idzie na najbliższego z ludu, najpierw na rycerzy';
  return c;
}

/** Wołane z tikLudu: początek i koniec fal, rycerze ruszają do walki. */
export function tikStraznikow(sim: Sim): void {
  const st = stan(sim);
  if (sim.tick % 60 === 0) {
    const zywi = zywiStraznicy(sim);
    if (st.trwa && zywi.length === 0) {
      st.trwa = false;
      st.fala++;
      sim.wiara += S.nagrodaWiary;
      const w = sim.world;
      sim.gdzie(w.coreX, w.przedsionekY).log(
        st.fala >= S.fale.length ? 'Ostatni Strażnik Snu rozsypał się w pył. Nikt już nie strzeże twojego snu.'
          : `Fala Strażników Snu pokonana. Skorupa znów pęka pod modlitwą (+${S.nagrodaWiary} wiary).`, 'wiara', `fala-koniec-${st.fala}`);
      zapisz(sim, 'rytual', `fala ${st.fala} pokonana`, w.coreX, w.przedsionekY);
    }
    const def = S.fale[st.fala];
    if (!st.trwa && def && !sim.rytual.otwarta && procentSkorupy(sim) >= def.prog) zacznijFale(sim, st);
  }
  if (st.trwa && sim.tick % 30 === 0) rycerzeDoWalki(sim);
}

function zacznijFale(sim: Sim, st: StanStraznikow): void {
  const def = S.fale[st.fala];
  const wzrost = 1 + S.wzrostNaFale * st.fala;
  for (let i = 0; i < def.straznikow; i++) {
    const [x, y] = miejscePojawienia(sim);
    const c = nowyStraznik(sim, x, y, S.hp * wzrost);
    if (c) sim.efekt(c.x, c.y, 'cud');
  }
  if (def.boss) aktywnyBoss().pojaw(sim);
  st.trwa = true;
  st.od = sim.tick;
  // pod rdzeniem wszyscy przerywają zamiar: rycerze ruszają do walki, reszta odchodzi (albo, przy bossie, modli się dalej)
  for (const c of sim.creatures) if (!c.dead && rolaPostaci(c) && wStrefieStraznikow(sim, c.x, c.y, S.ucieczkaZapas)) c.jt = 0;
  sim.lud.straznicy!.od = sim.tick;
  const w = sim.world;
  sim.gdzie(w.coreX, w.przedsionekY).log(
    def.boss ? `Ostatnia fala: ze ściany przedsionka wynurza się ${aktywnyBoss().nazwa}. Skorupa nie pęknie, dopóki stoi.`
      : `Strażnicy Snu wychodzą ze skały (${def.straznikow}). Dopóki żyją, skorupa nie pęka.`, 'krew', `fala-${st.fala}`);
  zapisz(sim, 'rytual', `fala ${st.fala + 1}: ${def.straznikow} Strażników${def.boss ? ' + boss' : ''}`, w.coreX, w.przedsionekY);
}

/** Rycerze w zasięgu ruszają na najbliższego Strażnika. */
function rycerzeDoWalki(sim: Sim): void {
  const wrogowie = zywiStraznicy(sim);
  if (!wrogowie.length) return;
  for (const c of sim.creatures) {
    if (c.dead || rolaPostaci(c) !== 'rycerz') continue;
    const obecny = sim.creatureById(sim.target.get(c.id) ?? -1);
    if (c.job === Job.FIGHT && obecny && !obecny.dead && obecny.straznik) continue;
    let best: Creature | null = null, bd = S.rycerzWidzi;
    for (const s of wrogowie) {
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (d < bd) { bd = d; best = s; }
    }
    if (!best) continue;
    sim.target.set(c.id, best.id);
    c.job = Job.FIGHT; c.jt = 600; c.droga = undefined;
    c.zamiar = best.boss ? `walczy z: ${aktywnyBoss().nazwa}` : 'walczy ze Strażnikiem Snu';
    c.zamiarDo = sim.tick + 600;
    c.wyprawa = false;
  }
}

/** Rana zadana Strażnikowi (boss może ją zmienić — np. przyjmuje tylko od rycerzy). */
export function ranStraznika(sim: Sim, s: Creature, od: Creature, dmg: number): void {
  if (s.dead) return;
  const d = s.boss ? aktywnyBoss().przyjmij(sim, s, od, dmg) : dmg;
  if (d <= 0) return;
  s.hp -= d;
  sim.spark(s.x, s.y - 0.5, 'hit');
  if (s.hp <= 0) {
    sim.kill(s, `z ręki ludu (${rolaPostaci(od) ?? 'ktoś'})`, 'walka');
    sim.efekt(s.x, s.y, 'cud');
  }
}

/** Rycerz walczy ze Strażnikiem: podchodzi i uderza w swoim rytmie (wołane z doFight). */
export function walczZeStraznikiem(sim: Sim, c: Creature, s: Creature, podejdz: (x: number, y: number) => void): void {
  const zasieg = S.rycerzZasieg + (s.boss ? 0.8 : 0);
  if (Math.hypot(s.x - c.x, s.y - c.y) > zasieg) { podejdz(Math.floor(s.x), Math.floor(s.y)); return; }
  c.face = s.x > c.x ? 1 : -1;
  if (sim.tick - (c.ciosT ?? -1e9) < S.rycerzCiosCo) return;
  c.ciosT = sim.tick;
  const dmg = RACES[c.race].strength * mnoznik(sim, c, 'sila') * (0.8 + sim.rng.next() * 0.4);
  ranStraznika(sim, s, c, dmg);
}

/** Ruch Strażnika: przenika skałę, prosto do celu, nie dalej niż `limit` od rdzenia. */
export function ruchStraznika(sim: Sim, c: Creature, tx: number, ty: number, v: number, limit: number): void {
  const w = sim.world;
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
  let nx = c.x + (dx / d) * Math.min(v, d), ny = c.y + (dy / d) * Math.min(v, d);
  const od = Math.hypot(nx - (w.coreX + 0.5), ny - w.przedsionekY);
  if (od > limit) { const k = limit / od; nx = w.coreX + 0.5 + (nx - w.coreX - 0.5) * k; ny = w.przedsionekY + (ny - w.przedsionekY) * k; }
  if (Math.abs(dx) > 0.05) c.face = dx > 0 ? 1 : -1;
  c.x = Math.max(1, Math.min(w.w - 2, nx));
  c.y = Math.max(1, Math.min(w.coreY - 1, ny));
  c.vy = 0;
}

/** Najbliższy z ludu w zasięgu rdzenia (cel Strażnika). */
export function celStraznika(sim: Sim, c: Creature, limit: number): Creature | null {
  const w = sim.world;
  let best: Creature | null = null, bd = Infinity;
  for (const o of sim.creatures) {
    if (o.dead || !rolaPostaci(o)) continue;
    if (Math.hypot(o.x - w.coreX, o.y - w.przedsionekY) > limit) continue;
    // najpierw rycerze — warta staje między Strażnikami a modlącymi się
    const d = Math.hypot(o.x - c.x, o.y - c.y) - (rolaPostaci(o) === 'rycerz' ? S.rycerzPierwszy : 0);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

/** Cios Strażnika w kogoś z ludu; kto nie jest rycerzem, oddaje słabszy. */
export function ciosStraznika(sim: Sim, c: Creature, cel: Creature, sila: number): void {
  cel.hp -= sila * (0.85 + sim.rng.next() * 0.3);
  sim.spark(cel.x, cel.y - 0.5, 'hit');
  if (cel.hp <= 0) { sim.kill(cel, c.boss ? `zmiażdżony przez: ${aktywnyBoss().nazwa}` : 'z ręki Strażnika Snu', 'straznik'); return; }
  if (rolaPostaci(cel) !== 'rycerz') ranStraznika(sim, c, cel, RACES[cel.race].strength * mnoznik(sim, cel, 'sila') * S.oddajeCios);
}

/** Krok Strażnika (zamiast zwykłego życia stworzenia). */
export function krokStraznika(sim: Sim, c: Creature): void {
  if (c.boss) { aktywnyBoss().tik(sim, c); return; }
  const w = sim.world;
  const st = stan(sim);
  const wzrost = 1 + S.wzrostNaFale * Math.min(st.fala, S.fale.length - 1);
  // cel co pół sekundy
  let cel = sim.creatureById(sim.target.get(c.id) ?? -1);
  if (!cel || cel.dead || sim.tick % 60 === c.id % 60) {
    cel = celStraznika(sim, c, S.limitOdRdzenia) ?? undefined;
    if (cel) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
  }
  if (!cel) { ruchStraznika(sim, c, w.coreX + 0.5 + Math.sin(sim.tick * 0.01 + c.id) * 6, w.przedsionekY - 3, S.szybkosc * 0.5, S.limitOdRdzenia); return; }
  if (Math.hypot(cel.x - c.x, cel.y - c.y) > S.zasieg) { ruchStraznika(sim, c, cel.x, cel.y - 0.3, S.szybkosc, S.limitOdRdzenia); return; }
  c.face = cel.x > c.x ? 1 : -1;
  if (sim.tick - (c.ciosT ?? -1e9) < S.ciosCo) return;
  c.ciosT = sim.tick;
  ciosStraznika(sim, c, cel, S.sila * wzrost);
}
