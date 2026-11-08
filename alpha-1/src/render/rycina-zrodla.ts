import type { Sim } from '../sim/sim';
import { rolaPostaci, klanLudu } from '../sim/lud';
import { SWIATLO_RYCINY as SR } from '../nastawy/wyglad/rycina';

/**
 * Światło ludu na rycinie (render/engrave.ts: swiatloLudu): gotowe pomieszczenia, siedziba, obozy i lampki
 * robotników, rycerzy i pobożnych — po pięć liczb na źródło: środek x, y (kafle), promień, moc i zasięg w litej
 * skale (Infinity — bez granicy). Liczone w głównym wątku, bo zna postacie i pomieszczenia; rycina (także ta
 * w osobnym wątku) dostaje tylko tę listę. Float64 — te same liczby co dawniej, bez zaokrągleń.
 */
export function zrodlaSwiatla(sim: Sim): Float64Array {
  const z: number[] = [];
  for (const p of sim.pomieszczenia) {
    if (!p.gotowe) continue;
    const moc = SR.pomieszczenia[p.rodzaj];
    // okrągła plama, nie prostokąt — prostokątne światło rysowało w skale jasne słupy
    // i tylko na kafel–dwa w głąb skały: światło pokoju przez lity strop świeciło jak przez mgłę
    if (moc) z.push(p.x + p.w / 2, p.y + p.h / 2, Math.max(p.w, p.h) / 2 + SR.pomieszczenieZasieg, moc, SR.pomieszczenieWSkale);
  }
  const klan = klanLudu(sim);
  if (klan) z.push(klan.hx + 0.5, klan.hy + 0.5, SR.siedziba.r, SR.siedziba.moc, Infinity);
  for (const o of sim.lud.obozy ?? []) z.push(o.x + 0.5, o.y + 0.5, SR.oboz.r, SR.oboz.moc, Infinity);
  for (const c of sim.creatures) {
    if (c.dead || c.straznik) continue;
    const r = rolaPostaci(c);
    if (!r) continue;
    const s = r === 'robotnik' ? SR.robotnik : r === 'rycerz' ? SR.rycerz : SR.pobozny;
    z.push(c.x + 0.5, c.y + 0.5, s.r, s.moc, Infinity);
  }
  return new Float64Array(z);
}
