// Demon — boss z Wielkiego Pomnika (render/demon-boss.ts: kukła z części obrazka, render/straznicy.ts → rysujDemonaBossa)
// do upieczenia w klatki. Rysuje go kod gry: postawa, oddech, łańcuchy u kajdan, cząstki ruchów (pył tupnięć, fale
// uderzeń, ogień tchnienia, żar aureoli) — wszystko trafia do klatek, bo idzie w takt ruchu, nie w takt trafień.
//
// Sterowniki (odtwarza je Trzewia.Gra/Rysunek/Duszki/DuszkiDemona.cs — pamięć rysunku bossa jak w demon-boss.ts):
//   oddech   — faza oddechu 0…1 (rośnie 0,3 na sekundę; szybciej u rannego)        pętle spoczynek, walka, modlitwa
//   krok     — faza chodu: droga w poziomie / 3 kafle                               pętla chod
//   czas     — zegar ekranu                                                         lot, bicie w pierś, śmiech za tarczą
//   postep   — tik ruchu walki / długość ruchu; faza rozkazu dla dłoni; wstawanie i konanie
// Czego klatki nie mają (świadome uproszczenia): pęknięć i garbienia się rannego demona ani drżenia w szale (wygląd
// zawsze jak przy pełnym życiu), patrzenia na cel na innej wysokości, płynnego przechodzenia między stanami.
import { rysujStraznika } from '../../../alpha-1/src/render/straznicy';
import { rysujWstajacegoKukla, rysujKonajacegoKukla } from '../../../alpha-1/src/render/demon-boss';
import { kuklaGotowa } from '../../../alpha-1/src/render/demon-kukla';
import { makeCreature } from '../../../alpha-1/src/sim/creatures';
import { Race } from '../../../alpha-1/src/sim/races';
import { RUCHY_BOSSA, WALKA_BOSSA } from '../../../alpha-1/src/nastawy/walka';
import { DLON } from '../../../alpha-1/src/nastawy/dlon';
import { DEMON, POMNIK } from '../../../alpha-1/src/nastawy/pomnik';
import { G, KLATKA_MS, type Scena, type Klatka } from './scena';
import type { Anim } from './lud';

const TAU = Math.PI * 2;
/** Tyle kafli przed demonem stoi rycerz w ruchach zwarcia. */
const ZWARCIE = 2.2;
/** Odległości celu, dla których pieczony jest bicz z łańcucha (kafle) — gra bierze najbliższą. */
export const ODLEGLOSCI_BICZA = [2.8, 4.0, 5.2];

export async function czekajNaKukle(): Promise<void> {
  for (let i = 0; i < 400 && !kuklaGotowa(); i++) await new Promise((r) => setTimeout(r, 25));
  if (!kuklaGotowa()) throw new Error('obrazki kukły demona się nie wczytały');
}

export function demon(s: Scena): Anim[] {
  const sim = s.sim, X0 = s.X0, Y0 = s.Y0;
  let c: any = null, licznik = 0;
  const rycerz = sim.creatures.find((q: any) => q.id === 6);
  /** Rozmiar bossa: sylwetka Strażnika (h0) × rozmiar × 0,6 — jak w render/straznicy.ts. */
  const hBossa = (): number => s.hLog * DEMON.rozmiar * 0.6;
  /** Pikseli rysunku na kafel przy tej wielkości (render/demon-boss.ts: pikseliNaKafel). */
  const naKafel = (): number => s.hLog / (2 * 1.9 * 1.15);
  let rysunek: 'boss' | 'wstaje' | 'kona' = 'boss', kSceny = 0;
  s.rysuj = () => {
    if (rysunek === 'boss') rysujStraznika(s.g, sim, c, s.hLog, s.czas);
    else if (rysunek === 'wstaje') rysujWstajacegoKukla(s.g, 0, 0, naKafel() * POMNIK.wysokosc, hBossa(), kSceny, s.czas);
    else rysujKonajacegoKukla(s.g, hBossa(), kSceny, s.czas);
  };
  s.punkty = () => undefined;

  /** Nowy demon na każdą animację — pamięć rysunku (cząstki, łańcuchy, wygładzenia) zaczyna od zera. */
  const nowy = (x = X0, y = Y0): void => {
    if (c) { sim.creatures.splice(sim.creatures.indexOf(c), 1); sim.byId.delete(c.id); }
    licznik++;
    c = makeCreature(Race.TROLL, 0, x, y, 9300 + licznik);
    Object.assign(c, { straznik: true, boss: 'demon', hp: DEMON.hp, hpMax: DEMON.hp, face: 1 });
    sim.creatures.push(c); sim.byId.set(c.id, c);
    s.c = c;
    rysunek = 'boss';
    sim.lud.pomnik = { faza: 'walka', od: sim.tick, stan: 3, stanT: 0 };
    sim.lud.dlonDemona = undefined;
    sim.rytual.wierni = 0;
    sim.target.delete(c.id);
    Object.assign(rycerz, { dead: false, x: X0 + 30, y: Y0 });
    // losy rysunku (rozglądanie, mrugnięcia, cząstki) z ziarna — ta sama animacja piecze się zawsze tak samo;
    // pierwszy los to 0: od niego zaczyna faza oddechu w pamięci bossa
    G.PIEK_SIEJ(7000 + licznik);
    // szczęka kłapie co ~15 s (sin(t · 0,41 + id) blisko 1) — zegar na chwilę tuż po kłapnięciu: 11 s spokoju
    const faza = ((s.czas / 1000) * 0.41 + c.id) % TAU;
    s.czas += (((2.4 - faza) % TAU + TAU) % TAU) / 0.41 * 1000;
  };
  const cel = (dx: number): void => { Object.assign(rycerz, { x: c.x + dx, y: c.y, dead: false }); sim.target.set(c.id, rycerz.id); };
  const graj = (klatek: number, co?: () => void): void => { for (let i = 0; i < klatek; i++) { co?.(); s.krok(); s.przebieg(); } };
  const A: Anim[] = [];

  // ---- pętle na fazie oddechu (pamięć bossa: oddech += dt · 0,3; zaczyna od 0) ----
  const OKRES_ODDECHU = 1000 / 0.3;
  const naOddechu = (nazwa: string, n: number, ustaw: () => void): void => {
    A.push({
      nazwa, n, ster: 'czas', mnoz: 0.0003, przes: 0, ms: OKRES_ODDECHU, petla: true,
      piecz: (_sc, zdj) => {
        nowy(); ustaw();
        s.przebieg();                                    // pierwsza klatka: pamięć powstaje, oddech = 0
        const pod = 17, dt = OKRES_ODDECHU / (n * pod);
        // dwa oddechy rozgrzewki, trzeci na zdjęcia w środkach przedziałów
        let kroki = 0;
        const doKroku = (k: number, ostatni: (() => void) | null): void => {
          while (kroki < k) { kroki++; s.krok(dt); if (kroki < k || !ostatni) s.przebieg(); else ostatni(); }
        };
        doKroku(2 * n * pod, null);
        for (let i = 0; i < n; i++) doKroku(2 * n * pod + Math.round((i + 0.5) * pod), () => zdj(s.zdjecie()));
      },
    });
  };
  naOddechu('spoczynek', 12, () => {});
  naOddechu('walka', 12, () => cel(ZWARCIE));
  naOddechu('modlitwa', 12, () => { cel(ZWARCIE + 2); sim.rytual.wierni = 2; });

  // ---- chód: faza = droga / 3 kafle (pamięć bossa: krok += |dx| / 3) ----
  A.push({
    nazwa: 'chod', n: 16, ster: 'faza', ms: (3 / (DEMON.szybkosc * 120)) * 1000, petla: true,
    piecz: (_sc, zdj) => {
      const Xs = 24;
      nowy(Xs, Y0); cel(ZWARCIE + 1.5);
      s.przebieg();
      const n = 16, pod = 7, dx = 3 / (n * pod);
      let kroki = 0;
      const idz = (k: number, ostatni: (() => void) | null): void => {
        while (kroki < k) {
          kroki++; c.x = Xs + kroki * dx; rycerz.x = c.x + ZWARCIE + 1.5;
          s.krok();
          if (kroki < k || !ostatni) s.przebieg(); else ostatni();
        }
      };
      idz(2 * n * pod, null);
      for (let i = 0; i < n; i++) idz(2 * n * pod + Math.round((i + 0.5) * pod), () => zdj(s.zdjecie()));
    },
  });

  // ---- lot (w pionie i w skale): kołysanie sin(t · 2,2) — pętla 2856 ms ----
  A.push({
    nazwa: 'lot', n: 8, ster: 'czas', mnoz: 2.2 / TAU / 1000, przes: 0, ms: (TAU / 2.2) * 1000, petla: true,
    piecz: (_sc, zdj) => {
      nowy(X0, Y0 - 1);
      // zdjęcia zaczynają się, gdy t · 2,2 ≡ 0
      const okres = (TAU / 2.2) * 1000;
      const doZera = (1 - (((s.czas / 1000) * 2.2 / TAU) % 1)) * okres;
      s.czas += doZera - 1200 + (doZera < 1200 ? okres : 0);
      s.przebieg();
      const wGore = (): void => { c.y -= DEMON.szybkosc * 2; };
      const start = s.czas + 1200;
      while (s.czas < start - KLATKA_MS) { wGore(); s.krok(); s.przebieg(); }
      wGore(); s.krok(start - s.czas);
      for (let i = 0; i < 8; i++) {
        const chwila = start + ((i + 0.5) / 8) * okres;
        while (s.czas < chwila - KLATKA_MS) { wGore(); s.krok(); s.przebieg(); }
        wGore(); s.krok(chwila - s.czas);
        zdj(s.zdjecie());
      }
    },
  });

  // ---- przebieg w tikach gry: n zdjęć od tiku `od` do `doT` po rozgrzewce ----
  const przebieg = (nazwa: string, tikow: number, n: number, przygotuj: () => void, start: (tik0: number) => void, coTik?: (tau: number) => void,
    odTiku = 0, rozgrzewka = 120): void => {
    A.push({
      nazwa, n, ster: 'postep', ms: (tikow / 120) * 1000, petla: false,
      piecz: (_sc, zdj) => {
        nowy(); przygotuj();
        s.przebieg();
        graj(rozgrzewka);
        const tik0 = sim.tick - odTiku;
        start(tik0);
        for (let i = 0; i < n; i++) {
          const celTik = odTiku + Math.round((i * tikow) / (n - 1) / 2) * 2;
          while (sim.tick - tik0 < celTik - 2) { coTik?.(sim.tick - tik0); s.krok(); s.przebieg(); }
          if (sim.tick - tik0 < celTik) { coTik?.(sim.tick - tik0); s.krok(); }
          zdj(s.zdjecie());
        }
      },
    });
  };
  const ruch = (id: string, nazwa: string, dl: number, o: { dx?: number; wariant?: number; od?: number; tikow?: number; n?: number; coTik?: (tau: number) => void } = {}): void => {
    const tikow = o.tikow ?? dl;
    przebieg(nazwa, tikow, o.n ?? Math.max(4, Math.round(tikow / 10) + 1),
      () => cel(o.dx ?? ZWARCIE),
      (tik0) => { c.ruch = { id, od: tik0, dl, cel: rycerz.id, traf: 0, zadane: [], kier: 1, sila: 0.3, wariant: o.wariant }; },
      o.coTik, o.od ?? 0);
  };
  const R = RUCHY_BOSSA as Record<string, { dl: number; przemieszcza?: [number, number, number] }>;
  for (const id of ['zGory', 'zamach', 'podciecie', 'podwojnyZamach', 'zgniecenie', 'przygniecenie', 'odepchniecie', 'tupniecie', 'wybuchAureoli', 'uderzenieWZiemie', 'ryk']) {
    ruch(id, id, R[id].dl);
  }
  ruch('tchnienie', 'tchnienie', R.tchnienie.dl, { dx: 3.6 });
  for (const d of ODLEGLOSCI_BICZA) ruch('biczLancucha', `biczLancucha-${Math.round(d * 10)}`, R.biczLancucha.dl, { dx: d });
  {
    // szarża: między tikami przemieszczenia demon biegnie ku rycerzowi (tu 4 kafle), jak go niesie symulacja
    const [od, doT] = R.szarza.przemieszcza!;
    ruch('szarza', 'szarza', R.szarza.dl, { dx: 6, coTik: (tau) => { if (tau >= od && tau < doT) c.x += (4 / (doT - od)) * 2; } });
  }
  // zachwianie po mocnym ciosie i klęknięcie przy progach życia
  ruch('zachwianie', 'zachwianie', R.zachwianie.dl, { wariant: 1 });
  ruch('zachwianie', 'zachwianie-klek', WALKA_BOSSA.dlKleku, { wariant: 2 });
  // blok przedramieniem: długość zależy od ciosu rycerza — wejście (14 tików), trzymanie, zejście (ostatnie 16)
  const DL_BLOKU = 120;
  ruch('blok', 'blok-wejscie', DL_BLOKU, { tikow: 14, n: 4 });
  ruch('blok', 'blok-trzyma', DL_BLOKU, { od: 40, tikow: 2, n: 2 });
  ruch('blok', 'blok-zejscie', DL_BLOKU, { od: DL_BLOKU - 16, tikow: 16, n: 4 });

  // ---- rozkazy dla dłoni z otchłani (sim.lud.dlonDemona: akcja, faza, od) — gest demona w każdej fazie ----
  const D = DLON.demon as unknown as Record<string, Record<string, number>>;
  const rozkaz = (akcja: string, faza: string, n?: number): void => {
    const tikow = D[akcja][faza];
    przebieg(`rozkaz-${akcja}-${faza}`, tikow, n ?? Math.max(3, Math.round(tikow / 10) + 1),
      () => cel(ZWARCIE + 0.8),
      (tik0) => { sim.lud.dlonDemona = { akcja, faza, od: tik0, nastT: 1e12, x: c.x + ZWARCIE, y: c.y, bok: 1, ile: { rzut: 0, tarcza: 0, zawal: 0 }, cel: rycerz.id }; });
  };
  for (const f of ['wstaje', 'chwyta', 'unosi', 'rzuca']) rozkaz('rzut', f);
  rozkaz('rzut', 'cofa', 4);
  rozkaz('tarcza', 'wstaje');
  rozkaz('tarcza', 'cofa');
  for (const f of ['wstaje', 'drze', 'wali']) rozkaz('zawal', f);
  rozkaz('zawal', 'cofa', 4);
  // za tarczą demon się śmieje: |sin(t · 14)| — pętla 2π/14 s
  A.push({
    nazwa: 'rozkaz-tarcza-stoi', n: 6, ster: 'czas', mnoz: 14 / TAU / 1000, przes: 0, ms: (TAU / 14) * 1000, petla: true,
    piecz: (_sc, zdj) => {
      nowy(); cel(ZWARCIE + 0.8);
      s.przebieg(); graj(120);
      sim.lud.dlonDemona = { akcja: 'tarcza', faza: 'stoi', od: sim.tick, nastT: 1e12, x: c.x + ZWARCIE, y: c.y, bok: 1, ile: { rzut: 0, tarcza: 0, zawal: 0 }, cel: rycerz.id };
      graj(30);
      const okres = (TAU / 14) * 1000;
      const start = s.czas + (1 - (((s.czas / 1000) * 14 / TAU) % 1)) * okres;
      for (let i = 0; i < 6; i++) {
        const chwila = start + ((i + 0.5) / 6) * okres;
        while (s.czas < chwila - KLATKA_MS) { s.krok(); s.przebieg(); }
        s.krok(chwila - s.czas);
        zdj(s.zdjecie());
      }
    },
  });
  // za ścianą gruzu (zawał): wali się w pierś — a = t · 1,6 · 2π
  A.push({
    nazwa: 'piers', n: 8, ster: 'czas', mnoz: 1.6 / 1000, przes: 0, ms: 625, petla: true,
    piecz: (_sc, zdj) => {
      nowy(); cel(5);
      sim.lud.dlonDemona = { akcja: null, faza: 'cofa', od: 0, nastT: 1e12, x: c.x + 3, y: c.y, bok: 1, ile: { rzut: 0, tarcza: 0, zawal: 0 },
        sciana: { kafle: [], x: c.x + 3, strop: c.y - 10, dno: c.y, od: sim.tick, do: sim.tick + 1e9 } };
      s.przebieg(); graj(150);
      const okres = 625;
      const start = s.czas + (1 - (((s.czas / 1000) * 1.6) % 1)) * okres;
      for (let i = 0; i < 8; i++) {
        const chwila = start + ((i + 0.5) / 8) * okres;
        while (s.czas < chwila - KLATKA_MS) { s.krok(); s.przebieg(); }
        s.krok(chwila - s.czas);
        zdj(s.zdjecie());
      }
    },
  });
  // trafiony przez rycerza (w postawie): wstrząs, odrzucona głowa, biały błysk — gaśnie przez 60 tików
  przebieg('trafiony', 60, 7, () => cel(ZWARCIE), () => { c.hp -= 14; });

  // ---- sceny: wstaje z gruzu (POMNIK.wyjscie tików), kona (POMNIK.konanie) ----
  const scena = (nazwa: string, co: 'wstaje' | 'kona', tikow: number): void => {
    const n = Math.round(tikow / 10) + 1;
    A.push({
      nazwa, n, ster: 'postep', ms: (tikow / 120) * 1000, petla: false,
      piecz: (_sc, zdj) => {
        nowy();
        rysunek = co; kSceny = 0;
        // odłamki gruzu lecą na kilkanaście kafli — klatka obejmuje demona i to, co blisko (2,2 sylwetki Strażnika w bok)
        s.kadr = [-2.2, 2.2, -3.4, 0.6];
        s.przebieg();
        for (let i = 0; i < n; i++) {
          const celK = i / (n - 1);
          while (kSceny < celK - 1e-9) { kSceny = Math.min(celK, kSceny + 2 / tikow); s.krok(); if (kSceny < celK - 1e-9) s.przebieg(); }
          zdj(s.zdjecie());
        }
        s.kadr = null;
      },
    });
  };
  scena('wstaje', 'wstaje', POMNIK.wyjscie);
  scena('kona', 'kona', POMNIK.konanie);
  return A;
}
