import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import type { Rola } from '../sim/lud';
import type { Czynnosc } from './figury';
import { jakoscAuto, ustawienia } from '../core/settings-store';
import { Malarz } from './lud/malarz';
import { sin } from './lud/matma';
import { pamiec, przejscie } from './lud/pamiec';
import { animuj } from './lud/ruch';
import { rysujPoboznego } from './lud/pobozny';
import { rysujRobotnika } from './lud/robotnik';
import { rysujRycerza } from './lud/rycerz';
import { stroj } from './lud/stroj';
import { szkielet } from './lud/szkielet';

/**
 * Remake v1: postacie ludu — robotnik, pobożny, rycerz.
 *
 * Kod jest w src/render/lud/:
 * - ruch.ts — animacje (klatki kluczowe ciosów, cykl chodu i biegu, modlitwa, wspinaczka),
 * - pamiec.ts — ruch wtórny (peleryna, kaptur, pióra, worek) i płynne przejścia między czynnościami,
 * - szkielet.ts — poza → stawy (stopa przetacza się z pięty na palce, biodro dosiada do ziemi),
 * - malarz.ts, wspolne.ts — bryły, cieniowanie, obwódka, narzędzia,
 * - robotnik.ts, pobozny.ts, rycerz.ts — stroje i rekwizyty ról, stroj.ts — barwy i warianty.
 *
 * Układ: (0, 0) = środek stóp, twarz w prawo (+x), góra to −y; h — wysokość postaci w pikselach.
 * Szczegółowość rośnie z wielkością na ekranie (z daleka płaskie barwy, z bliska szwy i nity).
 */
export function rysujLud(
  ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, rola: Rola, h: number, czas: number, cz: Czynnosc,
  faza: number, fazaPion: number, zegar: number,
): void {
  const kierunek = c.face >= 0 ? 1 : -1;
  const [pm] = pamiec(c, czas, kierunek, faza);
  const { p: nowa, tryb } = animuj({ cz, rola, czas, faza, fazaPion, zegar, c, m: pm, sim });
  const p = przejscie(pm, cz, nowa, czas);
  const t = ctx.getTransform();
  // gdy gra tnie jakość (ustawienie „szybka” albo auto przy małej liczbie klatek) — bez najdrobniejszych szczegółów
  const taniej = ustawienia.jakosc === 'szybka' || (ustawienia.jakosc === 'auto' && jakoscAuto.taniej);
  const m = new Malarz(ctx, h, h * (Math.hypot(t.a, t.b) || 1), taniej ? 1 : 2);
  const st = stroj(rola, c, sim);
  ctx.save();
  if (tryb.lezy) { ctx.translate(-h * 0.45, -h * 0.07); ctx.rotate(-Math.PI / 2); }
  // drgnięcie przy trafieniu narzędziem
  if (p.cios > 0.05) ctx.translate(sin(czas * 0.09) * 0.01 * h * p.cios, 0);
  const s = szkielet(p, h, tryb);
  const r = { m, s, p, tryb, st, h, c, cz, czas, pm, sim };
  if (rola === 'robotnik') rysujRobotnika(r);
  else if (rola === 'pobozny') rysujPoboznego(r);
  else rysujRycerza(r);
  m.maluj(st.obwodka);
  ctx.restore();
}
