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
import { swiatloOtoczenia } from './lud/oswietlenie';
import type { Poza, Tryb } from './lud/poza';

/** Gdzie wypadła głowa w ostatnim rysunku: środek i promień jako części wysokości postaci, od środka stóp (twarzą w prawo). */
const glowy = new WeakMap<Creature, { x: number; y: number; r: number }>();

/** Głowa postaci z ostatniego rysunku (np. aureola nad nią — także klęczącego i leżącego); brak — nie rysowano. */
export function glowaPostaci(c: Creature): { x: number; y: number; r: number } | undefined {
  return glowy.get(c);
}

/** Przykucnięcie w niskim korytarzu (0 — stoi, 1 — kuca), wygładzone w czasie, osobno dla każdej postaci. */
const kucanie = new WeakMap<Creature, { k: number; t: number }>();
/** Tyle ms trwa przejście do przysiadu i z powrotem (stała wygładzania). */
const KUCANIE_MS = 170;

/**
 * Jak mocno postać kuca: stoi na ziemi, a nad głową lita skała już w następnym kaflu (korytarz wysoki na jeden
 * kafel — nie powinno się zdarzać, ale się zdarza). Wartość dochodzi do celu płynnie, więc przejście jest animacją.
 */
function przykucniecie(sim: Sim, c: Creature, czas: number): number {
  const w = sim.world;
  if (!w) return 0;     // tablice atlasu rysują postać bez świata — nie ma nad nią skały
  const x = Math.floor(c.x), y = Math.floor(c.y);
  const naZiemi = c.vy <= 0.3 && !c.lot && w.solid(x, y + 1);
  const cel = naZiemi && w.solid(x, y - 1) ? 1 : 0;
  let s = kucanie.get(c);
  if (!s) { s = { k: cel, t: czas }; kucanie.set(c, s); return s.k; }
  const dt = Math.max(0, Math.min(250, czas - s.t));
  s.t = czas;
  s.k += (cel - s.k) * Math.min(1, dt / KUCANIE_MS);
  if (Math.abs(cel - s.k) < 0.002) s.k = cel;
  return s.k;
}

/**
 * Przysiad dokładany do bieżącej pozy (chód, kopanie, modlitwa…): uda do przodu, kolana mocno zgięte, tułów
 * pochylony, głowa uniesiona, żeby patrzeć przed siebie, ręce bliżej ciała. Szkielet sam opuszcza biodro tak,
 * żeby stopy stały na ziemi — postać robi się niższa o ok. 40%, a nie zgniata się jej rysunek.
 */
function kucnij(p: Poza, k: number, tryb: Tryb): Poza {
  const w = { ...p };
  // krzyż procesyjny pobożnego pochyla się do przodu — pionowy przebijał strop niskiego korytarza
  if (tryb.narzedzie === 'laska') w.narz += 1.0 * k;
  w.tulow += 0.72 * k;
  w.glowa -= 0.55 * k;
  w.uA += 1.15 * k; w.kA += 2.1 * k; w.sA += 0.12 * k;
  w.uB += 1.15 * k; w.kB += 2.1 * k; w.sB += 0.12 * k;
  w.rA += 0.2 * k; w.eA += 0.25 * k;
  w.rB += 0.2 * k; w.eB += 0.25 * k;
  w.lot *= 1 - k;
  return w;
}

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
  let p = przejscie(pm, cz, nowa, czas);
  // niski korytarz: kuca (nie dotyczy wspinaczki, zwisu i leżenia)
  const kuc = tryb.lezy ? 0 : przykucniecie(sim, c, czas) * (1 - p.wis);
  if (kuc > 0.005) p = kucnij(p, kuc, tryb);
  const t = ctx.getTransform();
  // gdy gra tnie jakość (ustawienie „szybka” albo auto przy małej liczbie klatek) — bez najdrobniejszych szczegółów
  const taniej = ustawienia.jakosc === 'szybka' || (ustawienia.jakosc === 'auto' && jakoscAuto.taniej);
  const m = new Malarz(ctx, h, h * (Math.hypot(t.a, t.b) || 1), taniej ? 1 : 2);
  m.swiatlo = swiatloOtoczenia();
  const st = stroj(rola, c, sim);
  ctx.save();
  if (tryb.lezy) { ctx.translate(-h * 0.45, -h * 0.07); ctx.rotate(-Math.PI / 2); }
  // drgnięcie przy trafieniu narzędziem
  if (p.cios > 0.05) ctx.translate(sin(czas * 0.09) * 0.01 * h * p.cios, 0);
  const s = szkielet(p, h, tryb);
  // leżący: układ obrócony o −90° wokół (−0,45h, −0,07h) — jak wyżej
  glowy.set(c, tryb.lezy ? { x: -0.45 + s.glowa.y / h, y: -0.07 - s.glowa.x / h, r: s.rg / h } : { x: s.glowa.x / h, y: s.glowa.y / h, r: s.rg / h });
  const r = { m, s, p, tryb, st, h, c, cz, czas, pm, sim };
  if (rola === 'robotnik') rysujRobotnika(r);
  else if (rola === 'pobozny') rysujPoboznego(r);
  else rysujRycerza(r);
  m.maluj(st.obwodka);
  ctx.restore();
}
