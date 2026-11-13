// Strażnik Snu (render/straznicy.ts: rysujStraznika) do upieczenia. Rysunek zależy od zegara ekranu trzema sinusami:
// krok sin(czas·0,004 + id), oddech sin(czas·0,003 + id), unoszenie sin(czas·0,002 + id·1,3). Wspólny okres to
// 2π/0,001 ms (4 kroki, 3 oddechy, 2 unoszenia) — jedna pętla 24 klatek. Klatkę wybiera faza kroku:
//   k = frac((czas·0,004 + id) / 8π)
// Unoszenie (przesunięcie całej postaci w pionie) jest z klatek wyjęte — gra dokłada je sama, z fazą tej postaci.
// Odrzut przy trafieniu (przesunięcie i przechył) i odpryski kamienia też dokłada gra.
import { rysujStraznika } from '../../../alpha-1/src/render/straznicy';
import { makeCreature } from '../../../alpha-1/src/sim/creatures';
import { Race } from '../../../alpha-1/src/sim/races';
import { SKALA, type Scena, type Klatka } from './scena';
import type { Anim } from './lud';

const TAU = Math.PI * 2;
const OKRES = TAU / 0.001;
const ID = 9100;

export function straznik(s: Scena): Anim[] {
  let c = s.sim.creatures.find((q: any) => q.id === ID);
  if (!c) {
    c = makeCreature(Race.TROLL, 0, s.X0, s.Y0, ID);
    c.straznik = true; c.hp = 40; c.hpMax = 40;
    s.sim.creatures.push(c); s.sim.byId.set(ID, c);
  }
  s.c = c;
  // h0 — wysokość sylwetki z render/figury.ts: wysokoscPostaci (rasa „trol” ma size 2); posąg rysuje się na 0,8 tego
  s.rysuj = () => rysujStraznika(s.g, s.sim, c, s.hLog, s.czas);
  s.punkty = () => undefined;
  const faza = (t: number): number => { const k = (t * 0.004 + ID) / (4 * TAU); return k - Math.floor(k); };
  const petla = (nazwa: string, bije: boolean): Anim => ({
    nazwa, n: 24, ster: 'czas', mnoz: 0.004 / (4 * TAU), przes: 1 / (4 * TAU), ms: OKRES, petla: true,
    piecz: (sc, zdj) => {
      Object.assign(c, { x: sc.X0, y: sc.Y0, face: 1, dead: false, hp: 40, ciosT: undefined });
      const zdjZUnoszeniem = (k: Klatka): void => {
        // wyjmij unoszenie tej chwili: translate(0, sin(czas·0,002 + id·1,3) · h · 0,03), h = 0,8 · h0
        const unos = Math.sin(sc.czas * 0.002 + ID * 1.3) * (sc.hLog * 0.8) * 0.03 * SKALA;
        k.oy = Math.round((k.oy - unos) * 100) / 100;
        zdj(k);
      };
      const stare = sc.rysuj;
      sc.rysuj = () => { if (bije) c.ciosT = sc.sim.tick; stare(); };
      sc.cyklCzasu({ okresMs: OKRES, n: 24, faza, rozgrzewkaMs: 300 }, zdjZUnoszeniem);
      sc.rysuj = stare;
    },
  });
  return [petla('stoi', false), petla('bije', true)];
}
