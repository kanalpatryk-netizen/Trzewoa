import type { Sim } from '../sim/sim';
import { RYTUAL } from '../nastawy/rytual';

/** Sytuacja, przy której gra sama zatrzymuje czas i mówi, co możesz zrobić. */
export interface Alarm {
  rodzaj: string;
  /** Kryzys zatrzymuje czas na poziomie „kryzysy"; zwykłe wydarzenie tylko na „wszystko". */
  kryzys: boolean;
  tytul: string;
  tekst: string;
  rada: string;
  cel?: { x: number; y: number; tekst: string };
  /** Tablica atlasu, która opisuje tę sytuację. */
  tablica?: string;
}

export type PoziomPauzy = 'wyłączona' | 'kryzysy' | 'wszystko';

/**
 * Strażnik pauzy, jak w Baldur's Gate: pilnuje chwil, w których trzeba decydować —
 * zaczyna się sen, pęka skorupa — i wtedy zatrzymuje świat, zamiast pozwolić, by przeleciało obok.
 */
export class Straznik {
  private sim: Sim | null = null;
  private senProg = 0;
  private pekniec = 0;
  private otwarta = false;
  private ostatnio = new Map<string, number>();
  private ostatniAlarm = -1e9;
  /** Rodzaje, przy których gracz poprosił, żeby go więcej nie zatrzymywać. */
  wyciszone = new Set<string>();

  private od(sim: Sim): void {
    if (this.sim === sim) return;
    this.sim = sim;
    this.ostatnio.clear();
    this.senProg = sim.sen;
    this.pekniec = sim.rytual.pekniecia;
    this.otwarta = sim.rytual.otwarta;
    this.ostatniAlarm = sim.tick;
  }

  sprawdz(sim: Sim, poziom: PoziomPauzy): Alarm | null {
    this.od(sim);
    if (poziom === 'wyłączona' || sim.ending || sim.tick % 30 !== 0) return null;
    const alarm = this.wykryj(sim);
    if (!alarm) return null;
    alarm.tablica = alarm.rodzaj.startsWith('wymiera-') ? `rasa-${alarm.rodzaj.slice(8)}`
      : alarm.rodzaj === 'dominacja' || alarm.rodzaj.startsWith('sen') ? 'sen'
      : alarm.rodzaj === 'otwarta' ? 'rdzen'
      : alarm.rodzaj.startsWith('pekniecie') ? 'skorupa' : undefined;
    if (!alarm.kryzys && poziom !== 'wszystko') return null;
    if (this.wyciszone.has(alarm.rodzaj)) return null;
    // nie częściej niż co kilkanaście sekund świata, a ten sam rodzaj rzadziej
    if (sim.tick - this.ostatniAlarm < 1500) return null;
    if (sim.tick - (this.ostatnio.get(alarm.rodzaj) ?? -1e9) < 5400) return null;
    this.ostatniAlarm = sim.tick;
    this.ostatnio.set(alarm.rodzaj, sim.tick);
    return alarm;
  }

  private wykryj(sim: Sim): Alarm | null {
    // WERSJA ANDROID: wymieranie, dominacja i przypływy przychodzą jako karty wydarzeń
    // z wyborem (sim/wydarzenia.ts) — tu zostają tylko sen i kamienie milowe rytuału.
    // sen
    for (const prog of [0.2, 0.55]) {
      if (this.senProg < prog && sim.sen >= prog) {
        this.senProg = sim.sen;
        return {
          rodzaj: `sen-${prog}`, kryzys: true,
          tytul: prog < 0.5 ? 'Zasypiasz' : 'Powieka opada',
          tekst: prog < 0.5 ? 'Na górze robi się cicho. Jedna krew albo pustka — i sen przychodzi sam.'
            : 'Jeszcze chwila i zaśniesz na zawsze. Obudzi cię tylko wojna, którą sam rozpętasz.',
          rada: 'Szepnij „prorokuj” w największej nacji — ich wojna cofa sen. Nakarm tych, których jest najmniej.',
        };
      }
    }
    this.senProg = Math.min(this.senProg, sim.sen);
    // skorupa rdzenia
    if (sim.rytual.otwarta && !this.otwarta) {
      this.otwarta = true;
      const w = sim.world;
      return {
        rodzaj: 'otwarta', kryzys: true,
        tytul: 'Droga do rdzenia stoi otworem',
        tekst: 'Ktoś zaraz dojdzie do ciebie. Jeśli wierzy — uklęknie i cię uwolni. Jeśli nie — zabije.',
        rada: 'Nic nie musisz — wierni zejdą sami. Karm wartę i nie pozwól, by obcy zdążyli pierwsi.',
        cel: { x: w.coreX + 0.5, y: w.coreY + 0.5, tekst: 'rdzeń' },
      };
    }
    if (sim.rytual.pekniecia > this.pekniec) {
      this.pekniec = sim.rytual.pekniecia;
      const w = sim.world;
      const r = sim.rytual;
      const potrzeba = Math.max(r.pekniecia + (r.otwarta ? 0 : 1), r.skorupa);
      // pierwsze pęknięcie to kamień milowy partii — czas staje, żeby gracz to zobaczył
      const pierwsze = r.pekniecia === 1;
      return {
        rodzaj: pierwsze ? 'pekniecie-pierwsze' : 'pekniecie', kryzys: pierwsze,
        tytul: pierwsze ? 'Pierwsze pęknięcie skorupy' : `Skorupa pęka: ${r.pekniecia} z ${potrzeba}`,
        tekst: `Modlitwa wiernych rozkuwa kamień, którego nie ruszy żaden kilof. Góra oddaje ci za to ${RYTUAL.nagrodaWiary} wiary.`,
        rada: 'Pilnuj grzybu przy przedsionku, żeby warta nie umarła z głodu — i nie wpuszczaj pod rdzeń obcych.',
        cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, tekst: 'przedsionek' },
      };
    }
    return null;
  }
}
