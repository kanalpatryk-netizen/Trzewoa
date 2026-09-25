import { Sim, PK } from '../sim/sim';
import { Creature } from '../sim/creatures';
import { Camera } from './camera';

export { SERIF } from './ink';

/** Śmierć to plama, która wsiąka w skałę. Widzisz, jak się karmisz swoimi. */
export function drawParticles(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  for (const p of sim.particles) {
    const sx = (p.x - left) * z, sy = (p.y - top) * z;
    if (sx < -8 || sy < -8 || sx > cam.vw + 8 || sy > cam.vh + 8) continue;
    const k = 1 - p.life / p.max;
    let col = '';
    let r = Math.max(0.8, z * 0.09);
    switch (p.kind) {
      case PK.BLOOD: col = `rgba(140,30,26,${0.75 * k})`; r *= 1.5; break;
      case PK.PRAY: col = `rgba(226,214,190,${0.35 * k})`; r *= 2.2; break;
      case PK.EMBER: col = `rgba(255,${(140 + 80 * k) | 0},60,${0.85 * k})`; break;
      case PK.SPORE: col = `rgba(140,190,110,${0.5 * k})`; break;
      case PK.GLINT: col = `rgba(240,238,248,${0.9 * k})`; break;
      default: col = `rgba(214,200,172,${0.30 * k})`; r *= 0.7;   // kurz
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Celownik imienia: „Szepnąłeś Żwirowi", nie „Szepnąłeś Żwir". Imiona powstają
 * ze stałego zestawu rdzeni i końcówek, więc wystarczy kilka reguł.
 */
export function creatureNameCelownik(c: Creature): string {
  const n = creatureName(c);
  if (n.endsWith('ica')) return n.slice(0, -1) + 'y';        // Sadzica → Sadzicy
  if (n.endsWith('ra')) return n.slice(0, -2) + 'rze';        // Iskra → Iskrze
  if (n.endsWith('a')) return n.slice(0, -1) + 'ie';          // Węglawa → Węglawie
  if (n.endsWith('ek')) return n.slice(0, -2) + 'kowi';       // Krzemek → Krzemkowi
  return n + 'owi';                                          // Żwir → Żwirowi
}

export function creatureName(c: Creature): string {
  const A = ['Krzem', 'Ług', 'Mirg', 'Osad', 'Pęk', 'Sadz', 'Trzop', 'Węgl', 'Zgrzyt', 'Iskra', 'Murk', 'Chrzest', 'Łom', 'Żwir'];
  const B = ['', 'ek', 'ica', 'ur', 'ot', 'yn', 'awa'];
  // (id * 7) % 7 zawsze dawało zero, więc każdy nosił goły rdzeń bez końcówki
  return A[c.id % A.length] + B[(c.id * 5 + (c.id / B.length | 0)) % B.length];
}
