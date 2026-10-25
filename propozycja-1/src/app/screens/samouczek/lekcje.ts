import type { EkranGry } from '../game';
import type { Creature } from '../../../sim/creatures';
import { rolaPostaci, type Rola } from '../../../sim/lud';
import { czemuNie } from '../../../sim/oltarz';
import { OLTARZ } from '../../../nastawy/oltarz';
import { KOSZTY } from '../../../nastawy/moce';
import type { CelEkranu, Gest, Punkt } from './animacje';

/**
 * TREŚĆ SAMOUCZKA (25.10, od nowa — użytkownik: „jak najbardziej minimalistyczny i dużo dopracowanych animacji”).
 * Cztery lekcje i finał. Każda lekcja to kilka faz; faza to jedno krótkie zdanie i jeden ruch gracza, który
 * rękawica-duch pokazuje w pętli (animacje.ts). Żadnych list ani akapitów — wszystko inne jest w atlasie.
 * Faza „zrobiona” to stan gry albo zdarzenie (flagi z EkranGry.nasluch), więc kto zrobi coś szybciej, nie
 * powtarza tego; bieżąca jest faza tuż za najdalszą zrobioną. Lekcję kończy ostatnia faza, dalej gracz
 * przechodzi sam („dalej”) — napisy nie zmieniają się, póki gracz czegoś nie zrobi.
 */

/** Co lekcje widzą z ekranu samouczka. */
export interface StanSamouczka {
  gra: EkranGry;
  /** Zdarzenia z gry, które już zaszły w tej lekcji: przesun, zoom, droga, modlitwa, nakarm. */
  flagi: Set<string>;
  /** Punkt świata na ekranie (albo null, gdy poza płytą). */
  naEkranie(wx: number, wy: number): Punkt | null;
  srodekPlyty(): Punkt;
}

export interface Faza {
  tekst: string;
  /** Ciche słowo pod spodem: czym to zrobić albo na co czekać. */
  podpowiedz?: (s: StanSamouczka) => string;
  zrobiona: (s: StanSamouczka) => boolean;
  /** Co oświetla reflektor (ekran). */
  cel?: (s: StanSamouczka) => CelEkranu | null;
  /** Co pokazuje rękawica-duch. */
  gest?: (s: StanSamouczka) => Gest | null;
  /** Gdy faza zostanie zrobiona (a lekcja idzie dalej). */
  po?: (s: StanSamouczka) => void;
}

export interface Lekcja {
  fazy: Faza[];
  /** Zdanie po zrobieniu. */
  koniec: string;
  /** Dokąd na początku lekcji płynie kamera (świat). */
  kamera?: (s: StanSamouczka) => Punkt | null;
  przygotuj?: (s: StanSamouczka) => void;
  /** Ryty, które w tej lekcji wolno wybrać (reszta milczy). */
  czasowniki?: string[];
}

export const FINAL = {
  tytul: 'Na dnie śpi demon.',
  podtytul: 'Modlitwa skruszy pomnik — rycerz go pokona.',
  graj: 'Zagraj',
  menu: 'menu',
};

// ------------------------------------------------------------------ gdzie co jest

const lud = (s: StanSamouczka, rola: Rola): Creature[] => s.gra.sim.creatures.filter((c) => !c.dead && rolaPostaci(c) === rola);

function srodekLudu(s: StanSamouczka, rola: Rola): Punkt | null {
  const l = lud(s, rola);
  if (!l.length) return null;
  return { x: l.reduce((a, c) => a + c.x, 0) / l.length, y: l.reduce((a, c) => a + c.y, 0) / l.length };
}

function medalion(s: StanSamouczka, rola: Rola): CelEkranu | null {
  const p = s.gra.miejscePolaDruzyny('rola', rola);
  return p ? { x: p.x + p.w / 2, y: p.y + p.h / 2, r: Math.max(p.w, p.h) / 2 + 6 } : null;
}

function ryt(s: StanSamouczka, v: string): CelEkranu | null {
  const m = s.gra.ui.miejsce('verb', v);
  return m ? { x: m.x, y: m.y, r: Math.max(m.hw, m.hh) * 1.3 } : null;
}

/** Postacie roli na ekranie i ramka wokół nich (z zapasem). */
function grupa(s: StanSamouczka, rola: Rola): { x0: number; y0: number; x1: number; y1: number; punkty: Punkt[] } | null {
  const punkty = lud(s, rola).map((c) => s.naEkranie(c.x, c.y - 0.1)).filter((p): p is Punkt => !!p);
  if (!punkty.length) return null;
  const z = Math.max(18, s.gra.cam.zoom * 1.4);
  return {
    x0: Math.min(...punkty.map((p) => p.x)) - z, y0: Math.min(...punkty.map((p) => p.y)) - z * 1.9,
    x1: Math.max(...punkty.map((p) => p.x)) + z, y1: Math.max(...punkty.map((p) => p.y)) + z * 0.6, punkty,
  };
}

/** Szyb drogi wiernych tuż pod wnęką — tam wskazuje rękawica. */
function szyb(s: StanSamouczka): CelEkranu | null {
  const w = s.gra.sim.world, sz = w.szybDrogi;
  if (sz.x1 < sz.x0) return null;
  const p = s.naEkranie((sz.x0 + sz.x1 + 1) / 2, w.salaOltarza.y1 + 3.5);
  return p ? { ...p, r: Math.max(30, (sz.x1 - sz.x0 + 1) * s.gra.cam.zoom * 0.72) } : null;
}

function oltarz(s: StanSamouczka): CelEkranu | null {
  const o = s.gra.sim.world.oltarz;
  const p = s.naEkranie(o.x + 0.5, o.y - 1);
  return p ? { ...p, r: Math.max(30, s.gra.cam.zoom * 2.4) } : null;
}

function poleModlitwy(s: StanSamouczka): CelEkranu | null {
  const p = s.gra.poleOltarza('modlitwa');
  return p ? { x: p.x + p.w / 2, y: p.y + p.h / 2, r: 8, w: p.w + 14, h: p.h + 14 } : null;
}

/** Gdzie w polu rytuału dotyka rękawica — przy nazwie, nie w pustym środku szerokiego pola. */
function klikModlitwy(s: StanSamouczka): Gest | null {
  const p = s.gra.poleOltarza('modlitwa');
  return p ? { typ: 'klik', x: p.x + Math.min(p.w * 0.3, 140), y: p.y + p.h / 2 } : null;
}

/** Podłoga sali obok szybu wiadra — tam spada „Nakarm”. */
function przyWiadrze(s: StanSamouczka): CelEkranu | null {
  const w = s.gra.sim.world;
  const p = s.naEkranie(w.szybWiadraX - 2.5, w.salaStart.y);
  return p ? { ...p, r: Math.max(28, s.gra.cam.zoom * 2) } : null;
}

const klik = (c: CelEkranu | null): Gest | null => c ? { typ: 'klik', x: c.x, y: c.y } : null;

// ------------------------------------------------------------------ lekcje

export const LEKCJE: Lekcja[] = [
  {
    fazy: [
      {
        tekst: 'Przesuń widok.',
        podpowiedz: () => 'prawym przyciskiem myszy',
        zrobiona: (s) => s.flagi.has('przesun'),
        gest: (s) => { const c = s.srodekPlyty(); return { typ: 'przesun', x: c.x, y: c.y + s.gra.plate.h * 0.16 }; },
      },
      {
        tekst: 'Przybliż i oddal.',
        podpowiedz: () => 'kółkiem myszy',
        zrobiona: (s) => s.flagi.has('zoom'),
        gest: (s) => { const c = s.srodekPlyty(); return { typ: 'kolko', x: c.x, y: c.y + s.gra.plate.h * 0.16 }; },
      },
    ],
    koniec: 'Tak oglądasz górę.',
  },
  {
    kamera: (s) => {
      const r = srodekLudu(s, 'robotnik'), sz = s.gra.sim.world.szybDrogi;
      const sx = (sz.x0 + sz.x1 + 1) / 2, sy = s.gra.sim.world.salaOltarza.y1 + 2;
      return r ? { x: (r.x + sx) / 2, y: (r.y + sy) / 2 } : { x: sx, y: sy };
    },
    fazy: [
      {
        tekst: 'Zaznacz robotników.',
        podpowiedz: () => 'ramką albo medalionem pod płytą',
        zrobiona: (s) => s.gra.zaznaczeniRoli('robotnik') > 0,
        // ramka łapie też stojących między nimi pobożnych — zostają sami robotnicy (inni na „szyb” by odmawiali)
        po: (s) => {
          for (const id of [...s.gra.zaznaczeni]) {
            const c = s.gra.sim.creatureById(id);
            if (!c || rolaPostaci(c) !== 'robotnik') s.gra.zaznaczeni.delete(id);
          }
        },
        cel: (s) => {
          const g = grupa(s, 'robotnik');
          return g ? { x: (g.x0 + g.x1) / 2, y: (g.y0 + g.y1) / 2, r: Math.hypot(g.x1 - g.x0, g.y1 - g.y0) / 2 + 10 } : medalion(s, 'robotnik');
        },
        gest: (s) => {
          const g = grupa(s, 'robotnik');
          return g ? { typ: 'ramka', ...g } : klik(medalion(s, 'robotnik'));
        },
      },
      {
        tekst: 'Wskaż im szyb.',
        podpowiedz: () => 'wykopią drogę wiernych',
        zrobiona: (s) => s.flagi.has('droga') || lud(s, 'robotnik').some((c) => c.polecenie?.typ === 'droga'),
        cel: szyb,
        gest: (s) => klik(szyb(s)),
      },
    ],
    koniec: 'Kopią w dół — schody same rosną.',
  },
  {
    przygotuj: (s) => { s.gra.sim.krew = Math.max(s.gra.sim.krew, OLTARZ.rytualy.modlitwa.krew + 20); },
    kamera: (s) => {
      const o = s.gra.sim.world.oltarz, p = srodekLudu(s, 'pobozny');
      return p && Math.hypot(p.x - o.x, p.y - o.y) < 40 ? { x: (p.x + o.x) / 2, y: (p.y + o.y) / 2 } : { x: o.x, y: o.y };
    },
    fazy: [
      {
        tekst: 'Zaznacz pobożnych.',
        podpowiedz: () => 'medalionem pod płytą',
        zrobiona: (s) => s.gra.zaznaczeniRoli('pobozny') > 0 && s.gra.zaznaczeniRoli('robotnik') === 0,
        cel: (s) => medalion(s, 'pobozny'),
        gest: (s) => klik(medalion(s, 'pobozny')),
      },
      {
        tekst: 'Wskaż ołtarz.',
        zrobiona: (s) => s.gra.oknoOltarzaOtwarte,
        cel: oltarz,
        gest: (s) => klik(oltarz(s)),
      },
      {
        tekst: 'Wybierz modlitwę.',
        podpowiedz: (s) => czemuNie(s.gra.sim, 'modlitwa') ? 'gdy pobożny stanie przy ołtarzu' : '',
        zrobiona: (s) => s.flagi.has('modlitwa') || s.gra.sim.lud.oltarz?.rytual?.rodzaj === 'modlitwa',
        cel: poleModlitwy,
        // rękawica czeka, aż pobożny dojdzie — wcześniej rytuał by odmówił
        gest: (s) => czemuNie(s.gra.sim, 'modlitwa') ? null : klikModlitwy(s),
      },
    ],
    koniec: 'Modlitwa daje wiarę.',
  },
  {
    czasowniki: ['zasiej'],
    przygotuj: (s) => { s.gra.sim.krew = Math.max(s.gra.sim.krew, KOSZTY.zasiej.grzyb.krew + 20); },
    kamera: (s) => { const w = s.gra.sim.world; return { x: w.szybWiadraX - 2, y: w.salaStart.y - 2 }; },
    fazy: [
      {
        tekst: 'Wybierz „Nakarm”.',
        podpowiedz: () => 'ryt po lewej',
        zrobiona: (s) => s.gra.ui.verb === 'zasiej',
        cel: (s) => ryt(s, 'zasiej'),
        gest: (s) => klik(ryt(s, 'zasiej')),
      },
      {
        tekst: 'Dotknij płyty.',
        zrobiona: (s) => s.flagi.has('nakarm'),
        cel: przyWiadrze,
        gest: (s) => klik(przyWiadrze(s)),
      },
    ],
    koniec: 'Jedzenie zjeżdża z góry w wiadrze.',
  },
];
