/**
 * Remake v2: trupy ludu (logika: src/sim/trupy.ts). Ta sama postać, co za życia — te same barwy
 * i strój (z numeru zmarłego) — ale leży, z zamkniętymi oczami, wyblakła i przygaszona,
 * z ciemną plamą pod sobą. Każdy trup rysuje się raz do małego płótna i jest tylko wklejany.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import type { Camera } from './camera';
import type { Trup } from '../sim/trupy';
import { Race, RACES } from '../sim/races';
import { rysujLud } from './postacie';
import { ustawienia } from '../core/settings-store';

interface Szkic { p: HTMLCanvasElement; klucz: string }
const szkice = new Map<number, Szkic>();

export function rysujTrupy(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const trupy = sim.lud.trupy;
  if (!trupy?.length || typeof document === 'undefined') {
    if (szkice.size) szkice.clear();
    return;
  }
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const right = left + cam.vw / z, bottom = top + cam.vh / z;
  const skala = Math.max(1, Math.min(3, Math.hypot(ctx.getTransform().a, ctx.getTransform().b)));
  const zywe = new Set<number>();
  for (const t of trupy) {
    zywe.add(t.id);
    if (t.x < left - 3 || t.x > right + 3 || t.y < top - 3 || t.y > bottom + 3) continue;
    const h = Math.max(16, RACES[Race.GOBLIN].size * z * 1.9 * ustawienia.wielkoscSylwetek) * (t.rola === 'rycerz' ? 1.3 : 1);
    const sx = cam.toScreenX(t.x), sy = cam.toScreenY(t.y + 1);
    // plama pod ciałem
    ctx.fillStyle = 'rgba(40,8,6,0.5)';
    ctx.beginPath(); ctx.ellipse(sx, sy - 1, h * 0.55, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    const w = h * 1.5, wys = h * 0.8, oy = wys * 0.62;
    const klucz = `${Math.round(h)}|${skala}`;
    let sz = szkice.get(t.id);
    if (!sz || sz.klucz !== klucz) {
      const p = sz?.p ?? document.createElement('canvas');
      p.width = Math.ceil(w * skala); p.height = Math.ceil(wys * skala);
      const g = p.getContext('2d')!;
      g.setTransform(skala, 0, 0, skala, (w / 2) * skala, oy * skala);
      g.scale(t.face, 1);
      // leżąca poza („śpi”) układa się w lewo od stóp — przesunięcie kładzie ciało na środku
      g.translate(h * 0.95, h * 0.04);
      rysujLud(g, sim, zmarly(t), t.rola, h, teraz, 'spi', 0, 0, 0);
      // śmierć: wyblakłe, ziemiste barwy
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(46,40,38,0.55)';
      g.fillRect(0, 0, p.width, p.height);
      g.globalCompositeOperation = 'source-over';
      sz = { p, klucz };
      szkice.set(t.id, sz);
    }
    ctx.drawImage(sz.p, sx - w / 2, sy - oy, w, wys);
  }
  for (const id of szkice.keys()) if (!zywe.has(id)) szkice.delete(id);
}

/** Atrapa postaci do rysunku: tylko to, co czyta rysunek ludu. */
function zmarly(t: Trup): Creature {
  return {
    id: t.id, x: t.x, y: t.y, face: t.face, race: Race.GOBLIN, rola: t.rola,
    hp: 1, carry: 0, fear: 0, mad: 0, vy: 0,
    okaleczony: t.okaleczony, helm: t.helm,
  } as unknown as Creature;
}
