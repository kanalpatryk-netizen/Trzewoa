// Animacje ludu (robotnik, pobożny, rycerz) do upieczenia: lista + reżyseria każdej (stan postaci, zegar, zdjęcia).
// Sterowniki klatek są te same, którymi rysunek TS wybiera pozę (render/lud/ruch.ts: animuj; render/figury.ts: ruch):
//   faza      — faza kroku 0…1 (rośnie z drogą),            klatka = ⌊faza · n⌋
//   fazaPion  — faza wspinaczki 0…1 (rośnie z drogą w pionie)
//   zegar     — k = frac(zegar[s] · mnoz + id · przes)      (zamach kilofa, młotek, cios)
//   czas      — k = frac(czas[ms] · mnoz + id · przes)      (oddech, kęs, korba)
//   postep    — u 0…1 z gry (ruch walki, odmowa, zakładanie zbroi); klatka = round(u · (n − 1))
// Pętle (faza, fazaPion, zegar, czas) mają zdjęcia w środkach przedziałów, przebiegi (postep) — od początku do końca.
import { rysujLud, glowaPostaci } from '../../../alpha-1/src/render/postacie';
import { Job, makeCreature } from '../../../alpha-1/src/sim/creatures';
import { Race } from '../../../alpha-1/src/sim/races';
import { RUCHY_RYCERZA } from '../../../alpha-1/src/nastawy/walka';
import { ZBROJA } from '../../../alpha-1/src/nastawy/zbroja';
import { ODMOWA_MS } from '../../../alpha-1/src/render/lud/odmowa';
import { G, Scena, type Klatka } from './scena';

export type Rola = 'robotnik' | 'pobozny' | 'rycerz';
/** Kolejność, w której kuźnia kuje zbroję (nastawy/pomieszczenia.ts: kuznia.czesci) — stan zbroi k to pierwszych k części. */
export const CZESCI_ZBROI = ['helm', 'naramienniki', 'napiersnik', 'nakolanniki', 'tarcza'];

export interface Anim {
  nazwa: string; n: number;
  ster: 'faza' | 'fazaPion' | 'zegar' | 'czas' | 'postep';
  mnoz?: number; przes?: number;
  /** czas całej animacji w ms przy zwykłym odtwarzaniu (dla silnika, który gra klipy zegarem) */
  ms: number; petla: boolean;
  piecz(s: Scena, zdj: (k: Klatka) => void): void;
}

const TAU = Math.PI * 2;
const frac = (x: number): number => x - Math.floor(x);
/** Najszybszy krok (nastawy/wyglad/postacie.ts: MAKS_KROKOW_NA_SEKUNDE) — w grze lud chodzi szybciej, więc krok idzie tym tempem. */
const KROKOW_NA_S = 3.2;
const OKRES_KROKU = 1000 / KROKOW_NA_S;
/** Długość pełnego kroku w kaflach (render/figury.ts: krokPostaci) przy domyślnej wielkości sylwetek 1,15. */
const krok = (rola: Rola): number => 0.8 * 1.9 * 1.15 * (rola === 'rycerz' ? 1.3 : 1);
const OKRES_ODDECHU = TAU / 0.0021;

export interface Opcje { niesie?: boolean; helm?: boolean; zbroja?: number }

/** Ustawia postać i rysunek sceny dla roli. Zwraca listę animacji. */
export function lud(s: Scena, rola: Rola, id: number, o: Opcje = {}): Anim[] {
  const c = s.postac(id, rola);
  const stan = { cz: 'stoi', faza: 0, fazaPion: 0, zegar: 0 };
  s.rysuj = () => rysujLud(s.g, s.sim, c, rola as never, s.hLog, s.czas, stan.cz as never, stan.faza, stan.fazaPion, stan.zegar);
  s.punkty = () => { const gl = glowaPostaci(c); return gl ? [gl.x, gl.y, gl.r] : undefined; };
  const zbroja = CZESCI_ZBROI.slice(0, o.zbroja ?? 0);
  /** Stan wyjściowy każdej animacji tej postaci (wariant: hełm robotnika, zbroja rycerza). */
  const zacznij = (cz: string, extra: Record<string, unknown> = {}): void => {
    s.spokoj(); s.strop(false);
    c.helm = o.helm ? true : undefined;
    c.zbroja = rola === 'rycerz' && zbroja.length ? [...zbroja] : undefined;
    s.sim.zbroja = [...zbroja];
    stan.cz = cz; stan.faza = 0; stan.fazaPion = 0; stan.zegar = 0;
    Object.assign(c, extra);
  };
  const X0 = s.X0, Y0 = s.Y0, K = krok(rola);
  const A: Anim[] = [];

  // ---- pętle na czasie ekranu ----
  const petlaCzasu = (nazwa: string, cz: string, n: number, okresMs: number, mnoz: number, przes: number, extra: Record<string, unknown> = {},
    dobre?: (t: number) => boolean, przed?: () => void): void => {
    A.push({
      nazwa, n, ster: 'czas', mnoz, przes, ms: okresMs, petla: true,
      piecz: (sc, zdj) => {
        zacznij(cz, extra); przed?.();
        sc.cyklCzasu({ okresMs, n, faza: (t) => frac(t * mnoz + id * przes), dobre }, zdj);
      },
    });
  };
  const gest = (t: number): number => frac(t * 0.00011 + id * 0.43);
  const bezGestu = (t: number): boolean => gest(t) < 0.88;

  // spoczynek: oddech (render/lud/ruch.ts: oddech = sin(czas · 0,0021 + id)); gest co ~9 s osobno
  const spoczynek = (przyrostek: string, extra: Record<string, unknown>, przed?: () => void): void => {
    petlaCzasu('stoi' + przyrostek, 'stoi', 8, OKRES_ODDECHU, 0.0021 / TAU, 1 / TAU, extra, bezGestu, przed);
  };
  spoczynek('', {});
  // gest w spoczynku: f = frac(czas · 0,00011 + id · 0,43) > 0,9 → postęp (f − 0,9) / 0,1
  A.push({
    nazwa: 'stoi-gest', n: 8, ster: 'postep', ms: 0.1 / 0.00011, petla: false,
    piecz: (sc, zdj) => {
      zacznij('stoi');
      // chwila, w której f = 0,9
      let t0 = sc.czas + 5000;
      t0 += (((0.9 - gest(t0)) % 1 + 1) % 1) / 0.00011;
      const chwile = (t: number): number[] => Array.from({ length: 8 }, (_, i) => t + ((i + 0.5) / 8) * (0.1 / 0.00011));
      while (chwile(t0).some((q) => sc.mruga(q))) t0 += 1 / 0.00011;
      sc.czas = t0 - 800; sc.przebieg();
      for (const q of chwile(t0)) {
        while (sc.czas < q - 0.01) { sc.krok(Math.min(1000 / 60, q - sc.czas)); if (sc.czas < q - 0.01) sc.przebieg(); }
        zdj(sc.zdjecie());
      }
    },
  });

  // ---- chód, bieg, wspinaczka: faza z drogi ----
  const chod = (nazwa: string, cz: string, n: number, extra: Record<string, unknown> = {}, przed?: () => void): void => {
    A.push({
      nazwa, n, ster: 'faza', ms: OKRES_KROKU, petla: true,
      piecz: (sc, zdj) => {
        zacznij(cz, extra); przed?.();
        sc.cykl({ okresMs: OKRES_KROKU, n, ustaw: (u) => { stan.faza = frac(u); c.x = X0 + u * K; } }, zdj);
      },
    });
  };
  chod('idzie', 'idzie', 12);
  chod('biegnie', 'biegnie', 10);
  // schody kręcone (render/lud/ruch.ts: chodPoSchodach): pod górę (kier −1) i w dół (kier 1); postać idzie w miejscu
  const schody = (nazwa: string, kier: number, extra: Record<string, unknown> = {}): void => {
    A.push({
      nazwa, n: 12, ster: 'faza', ms: OKRES_KROKU * 1.4, petla: true,
      piecz: (sc, zdj) => {
        zacznij('idzie', extra);
        G.PIEK_SCHODY = { stopien: 0, kier };
        sc.cykl({ okresMs: OKRES_KROKU * 1.4, n: 12, ustaw: (u) => { stan.faza = frac(u); } }, zdj);
        G.PIEK_SCHODY = null;
      },
    });
  };
  schody('schody-gora', -1);
  schody('schody-dol', 1);
  const wspinaczka = (nazwa: string, extra: Record<string, unknown> = {}): void => {
    A.push({
      nazwa, n: 10, ster: 'fazaPion', ms: 1000 / 2.4, petla: true,
      piecz: (sc, zdj) => {
        zacznij('wspina', extra);
        // (w grze wspina się ok. 7 kafli/s — peleryna i kaptur układają się jak przy szybkim ruchu w górę)
        sc.cykl({ okresMs: 1000 / 2.4, n: 10, ustaw: (u) => { stan.fazaPion = frac(u); c.y = Y0 - 2 - (u + 3) * 3; } }, zdj);
      },
    });
  };
  wspinaczka('wspina');
  // spadanie: wymachy z szumu (czas · 0,011) — pętla 640 ms, szum nie jest zamrożony
  const spadanie = (nazwa: string, extra: Record<string, unknown> = {}): void => {
    A.push({
      nazwa, n: 8, ster: 'czas', mnoz: 1 / 640, przes: 0, ms: 640, petla: true,
      piecz: (sc, zdj) => {
        zacznij('spada', { vy: 0.5, ...extra });
        G.PIEK_SZUM = undefined;
        let y = Y0 - 14;
        sc.cykl({ okresMs: 640, n: 8, rozgrzewkaMs: 640, ustaw: (u) => { c.y = y + (u + 1) * 5.2; } }, zdj);
        G.PIEK_SZUM = 0;
      },
    });
  };
  spadanie('spada');
  // czołganie pod kratą bramy (render/postacie.ts): faza kroku
  const czolganie = (nazwa: string, extra: Record<string, unknown> = {}): void => {
    A.push({
      nazwa, n: 10, ster: 'faza', ms: OKRES_KROKU * 1.6, petla: true,
      piecz: (sc, zdj) => {
        zacznij('idzie', extra);
        G.PIEK_CZOLGA = true;
        sc.cykl({ okresMs: OKRES_KROKU * 1.6, n: 10, ustaw: (u) => { stan.faza = frac(u); c.x = X0 + u * K * 0.5; } }, zdj);
        G.PIEK_CZOLGA = false;
      },
    });
  };
  czolganie('czolga');
  // niski korytarz: kuca (stoi i idzie)
  const kucanie = (przyrostek: string, extra: Record<string, unknown> = {}): void => {
    petlaCzasu('kuca-stoi' + przyrostek, 'stoi', 4, OKRES_ODDECHU, 0.0021 / TAU, 1 / TAU, extra, bezGestu, () => s.strop(true));
    chod('kuca-idzie' + przyrostek, 'idzie', 12, extra, () => s.strop(true));
  };
  kucanie('');

  // robotnik z workiem (c.carry > 0): worek na plecach we wszystkim, co robi w drodze
  if (rola === 'robotnik') {
    const W = { carry: 1 };
    spoczynek('-niesie', W);
    chod('idzie-niesie', 'idzie', 12, W);
    chod('biegnie-niesie', 'biegnie', 10, W);
    schody('schody-gora-niesie', -1, W);
    schody('schody-dol-niesie', 1, W);
    wspinaczka('wspina-niesie', W);
    spadanie('spada-niesie', W);
    czolganie('czolga-niesie', W);
    kucanie('-niesie', W);
  }

  // ---- praca: zegar czynności ----
  const naZegarze = (nazwa: string, cz: string, n: number, mnoz: number, przes: number, extra: Record<string, unknown> = {}): void => {
    A.push({
      nazwa, n, ster: 'zegar', mnoz, przes, ms: 1000 / mnoz, petla: true,
      piecz: (sc, zdj) => {
        zacznij(cz, extra);
        sc.cykl({ okresMs: 1000 / mnoz, n, ustaw: (u) => { stan.zegar = (u + 40 - id * przes) / mnoz; } }, zdj);
      },
    });
  };
  naZegarze('kopie', 'kopie', 12, 1.1, 0.13);
  naZegarze('buduje', 'buduje', 10, 1.6, 0.13);
  if (rola === 'rycerz') {
    // rycerz bez ruchu walki z symulacji (wróg, który nie jest Strażnikiem): na przemian cięcie i pchnięcie —
    // z = zegar · 1,25 + id · 0,31; parzyste ⌊z⌋ to cięcie
    for (const [nazwa, parz] of [['walczy-ciecie', 0], ['walczy-pchniecie', 1]] as [string, number][]) {
      A.push({
        nazwa, n: 10, ster: 'zegar', mnoz: 1.25, przes: 0.31, ms: 800, petla: true,
        piecz: (sc, zdj) => {
          zacznij('walczy');
          // dwa cykle na okres, żeby ⌊z⌋ miało stałą parzystość: z = 2m + parz + u
          sc.cykl({ okresMs: 800, n: 10, ustaw: (u) => { const z = 40 + parz + frac(u); stan.zegar = (z - id * 0.31) / 1.25; } }, zdj);
        },
      });
    }
  } else naZegarze('walczy', 'walczy', rola === 'robotnik' ? 12 : 10, 1.5, 0.31);

  // ---- modlitwa ----
  const cyklModl = (t: number): number => frac(t * 0.00016 + id * 0.37);
  if (rola === 'pobozny') {
    // kołysanie (sin(czas · 0,0034 + id)) ze złożonymi dłońmi; wzniesienie rąk (cykl 0,68…0,98) osobno
    petlaCzasu('modli', 'modli', 8, TAU / 0.0034, 0.0034 / TAU, 1 / TAU, {}, (t) => cyklModl(t) > 0.02 && cyklModl(t) < 0.66);
  } else {
    petlaCzasu('modli', 'modli', 4, OKRES_ODDECHU, 0.0021 / TAU, 1 / TAU, {}, (t) => cyklModl(t) > 0.02 && cyklModl(t) < 0.78);
  }
  if (rola !== 'rycerz') {
    const od = rola === 'pobozny' ? 0.68 : 0.8, dl = rola === 'pobozny' ? 0.30 : 0.16, n = rola === 'pobozny' ? 12 : 8;
    A.push({
      nazwa: 'modli-wznosi', n, ster: 'postep', ms: dl / 0.00016, petla: false,
      piecz: (sc, zdj) => {
        zacznij('modli');
        let t0 = sc.czas + 5000;
        t0 += (((od - cyklModl(t0)) % 1 + 1) % 1) / 0.00016;
        const chwile = (t: number): number[] => Array.from({ length: n }, (_, i) => t + ((i + 0.5) / n) * (dl / 0.00016));
        while (chwile(t0).some((q) => sc.mruga(q))) t0 += 1 / 0.00016;
        sc.czas = t0 - 900; sc.przebieg();
        for (const q of chwile(t0)) {
          while (sc.czas < q - 0.01) { sc.krok(Math.min(1000 / 60, q - sc.czas)); if (sc.czas < q - 0.01) sc.przebieg(); }
          zdj(sc.zdjecie());
        }
      },
    });
  }

  // ---- jedzenie, sen ----
  petlaCzasu('je', 'je', 10, 1 / 0.0011, 0.0011, 0.21);
  A.push({
    nazwa: 'spi', n: 1, ster: 'czas', mnoz: 0, przes: 0, ms: 1000, petla: true,
    piecz: (sc, zdj) => {
      zacznij('spi');
      sc.zaMrugniecie(); sc.przebieg();
      for (let i = 0; i < 50; i++) { sc.krok(); sc.przebieg(); }
      zdj(sc.zdjecie());
    },
  });

  // ---- odmowa rozkazu (render/lud/odmowa.ts: 2600 ms od pierwszego rysunku) ----
  A.push({
    nazwa: 'odmawia', n: 32, ster: 'postep', ms: ODMOWA_MS, petla: false,
    piecz: (sc, zdj) => {
      zacznij('stoi');
      sc.raz({
        czasMs: ODMOWA_MS * 0.999, n: 32,
        ustaw: (u) => { if (!c.odmowa) { c.odmowa = { od: sc.sim.tick, tekst: '' }; } stan.cz = 'odmawia'; void u; },
      }, zdj);
      c.odmowa = undefined;
    },
  });

  // ---- sklejanie liny wiadra (wisi na linie): q = czas · 0,011 + id, szarpnięcia co 2732 ms ----
  petlaCzasu('skleja', 'skleja', 14, TAU / 0.0023, 0.0023 / TAU, 1 / TAU);

  if (rola === 'robotnik') {
    // korba kołowrotu: q = czas · 0,0042 + id · 0,7
    petlaCzasu('kreci', 'kreci', 12, TAU / 0.0042, 0.0042 / TAU, 0.7 / TAU);
  }
  if (rola === 'pobozny') {
    // księga przeciw bossowi: błysk po uniesieniu (60 tików), potem czyta — migotanie i usta na zegarze ekranu
    A.push({
      nazwa: 'czyta', n: 6, ster: 'postep', ms: 500, petla: false,
      piecz: (sc, zdj) => {
        zacznij('czyta');
        let t0 = 0;
        sc.raz({ czasMs: 500, n: 6, przed: () => { c.ksiegaT = sc.sim.tick - 300; }, ustaw: (u) => { if (u === 0) t0 = sc.sim.tick; c.ksiegaT = t0; } }, zdj);
      },
    });
    petlaCzasu('czyta-trwa', 'czyta', 6, TAU / 0.006, 0.006 / TAU, 0, {}, undefined, () => { c.ksiegaT = s.sim.tick - 200; });
  }

  if (rola === 'rycerz') {
    // ---- zakładanie następnej części zbroi (sim/zbroja.ts: zakladanie 0…150 tików) ----
    const stanZbroi = o.zbroja ?? 0;
    if (stanZbroi < CZESCI_ZBROI.length) {
      A.push({
        nazwa: 'zaklada', n: 10, ster: 'postep', ms: (ZBROJA.zakladanieTikow / 120) * 1000, petla: false,
        piecz: (sc, zdj) => {
          zacznij('zaklada');
          sc.sim.zbroja = CZESCI_ZBROI.slice(0, stanZbroi + 1);     // następna część wisi na wieszaku
          sc.raz({ czasMs: (ZBROJA.zakladanieTikow / 120) * 1000, n: 10, przed: () => { c.zakladanie = 0; }, ustaw: (u) => { c.zakladanie = u * ZBROJA.zakladanieTikow; } }, zdj);
          c.zakladanie = undefined;
        },
      });
    }
    // ---- walka ze Strażnikiem (render/lud/walka-rycerza.ts) ----
    const wrog = (): void => {
      // Strażnik 3 kafle przed rycerzem — po to, żeby stanWalki wybrał gardę i podejście
      let w = s.sim.creatures.find((q: any) => q.id === 9001);
      if (!w) {
        w = makeCreature(Race.TROLL, c.clan, X0 + 3, Y0, 9001);
        w.straznik = true;
        s.sim.creatures.push(w); s.sim.byId.set(9001, w);
      }
      w.dead = false; w.x = c.x + 3; w.y = c.y;
      c.job = Job.FIGHT; s.sim.target.set(c.id, 9001);
    };
    // garda: oddech gardy sin(czas · 0,0032 + id)
    petlaCzasu('garda', 'stoi', 6, TAU / 0.0032, 0.0032 / TAU, 1 / TAU, {}, undefined, wrog);
    // podejście w gardzie: q = (czas · 0,0016 + id · 0,3) · τ
    petlaCzasu('podejscie', 'idzie', 8, 1 / 0.0016, 0.0016, 0.3, {}, undefined, wrog);
    const ruch = (idRuchu: string, nazwa: string, dlTikow: number, odTiku: number, doTiku: number, n: number, extra: Record<string, unknown> = {}): void => {
      A.push({
        nazwa, n, ster: 'postep', ms: ((doTiku - odTiku) / 120) * 1000, petla: false,
        piecz: (sc, zdj) => {
          zacznij('walczy'); wrog();
          let od = 0;
          sc.raz({
            czasMs: ((doTiku - odTiku) / 120) * 1000, n,
            przed: () => { c.ruch = undefined; stan.cz = 'stoi'; },
            ustaw: (u) => {
              if (u === 0) od = sc.sim.tick - odTiku;
              stan.cz = 'walczy';
              c.ruch = { id: idRuchu, od, dl: dlTikow, cel: -1, traf: 0, zadane: [], kier: 1, sila: 0.3, ...extra };
              sc.sim.tick = od + Math.round(odTiku + u * (doTiku - odTiku - 1));
            },
          }, zdj);
          c.ruch = undefined;
        },
      });
    };
    for (const [idRuchu, def] of Object.entries(RUCHY_RYCERZA) as [string, any][]) {
      if (idRuchu === 'garda' || idRuchu === 'podejscie' || idRuchu === 'powalony') continue;
      // ruch wymagający części zbroi, której w tym stanie nie ma — nie wystąpi
      if (def.zbroja && !def.zbroja.every((z: string) => zbroja.includes(z))) continue;
      ruch(idRuchu, idRuchu, def.dl, 0, def.dl, Math.max(6, Math.min(16, Math.round(def.dl / 7))));
    }
    // powalony: upadek (22 tiki), leży (pętla), wstaje (ostatnie 64 tiki) — długość leżenia zależy od ogłuszenia
    const DL = 400;
    ruch('powalony', 'powalony-pada', DL, 0, 22, 6);
    ruch('powalony', 'powalony-wstaje', DL, DL - 64, DL, 12);
    A.push({
      nazwa: 'powalony-lezy', n: 8, ster: 'czas', mnoz: 1 / 1500, przes: 0, ms: 1500, petla: true,
      piecz: (sc, zdj) => {
        zacznij('walczy'); wrog();
        const od = sc.sim.tick - 40;
        c.ruch = { id: 'powalony', od, dl: 100000, cel: -1, traf: 0, zadane: [], kier: 1, sila: 0.3 };
        sc.cykl({ okresMs: 1500, n: 8, rozgrzewkaMs: 400, ustaw: () => { stan.cz = 'walczy'; } }, zdj);
        c.ruch = undefined;
      },
    });
  }
  return A;
}
