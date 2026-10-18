import type { Sim } from '../sim/sim';
import { procentSkorupy } from '../sim/rytual';
import { RYTUAL } from '../nastawy/rytual';
import { STRAZNICY } from '../nastawy/straznicy';
import { aktywnyBoss } from '../sim/boss';
import { MROK } from '../nastawy/mrok';
import { DLON } from '../nastawy/dlon';
import { NAZWA_ROLI, rolaPostaci } from '../sim/lud';

/** Ile fal Strażników już się zaczęło. */
function falRozpoczetych(sim: Sim): number {
  const st = sim.lud.straznicy;
  return st ? st.fala + (st.trwa ? 1 : 0) : 0;
}

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
  private fal = 0;
  private ostatnio = new Map<string, number>();
  private ostatniAlarm = -1e9;
  /** Od kiedy Patrzący patrzy na tego, o którym już powiedzieliśmy. */
  private mrokOd = -1;
  /** Od kiedy wznosi się dłoń z otchłani, o której już powiedzieliśmy. */
  private dlonOd = -1;
  /** Rodzaje, przy których gracz poprosił, żeby go więcej nie zatrzymywać. */
  wyciszone = new Set<string>();
  /** Ostatni sprawdzony odcinek 30 tików (sprawdzamy raz na odcinek). */
  private odcinek = -1;

  private od(sim: Sim): void {
    if (this.sim === sim) return;
    this.sim = sim;
    this.ostatnio.clear();
    this.senProg = sim.sen;
    this.pekniec = sim.rytual.pekniecia;
    this.otwarta = sim.rytual.otwarta;
    this.fal = falRozpoczetych(sim);
    this.ostatniAlarm = sim.tick;
    this.odcinek = Math.floor(sim.tick / 30);
  }

  sprawdz(sim: Sim, poziom: PoziomPauzy): Alarm | null {
    this.od(sim);
    if (poziom === 'wyłączona' || sim.ending) return null;
    // raz na każde 30 tików świata — klatka robi kilka tików naraz, więc nie „gdy tik dzieli się przez 30”:
    // przy dwóch tikach na klatkę (ekran 60 Hz) i nieparzystym tiku alarm nie przychodził wcale
    const odcinek = Math.floor(sim.tick / 30);
    if (odcinek === this.odcinek) return null;
    this.odcinek = odcinek;
    const alarm = this.wykryj(sim);
    if (!alarm) return null;
    alarm.tablica = alarm.rodzaj.startsWith('wymiera-') ? `rasa-${alarm.rodzaj.slice(8)}`
      : alarm.rodzaj === 'dominacja' || alarm.rodzaj.startsWith('sen') ? 'sen'
      : alarm.rodzaj === 'otwarta' ? 'rdzen'
      : alarm.rodzaj.startsWith('pekniecie') ? 'skorupa'
      : alarm.rodzaj === `fala-${STRAZNICY.fale.length}` ? 'boss'
      : alarm.rodzaj.startsWith('fala-') ? 'straznicy'
      : alarm.rodzaj === 'mrok' ? 'patrzacy'
      : alarm.rodzaj === 'dlon' ? 'dlon' : undefined;
    if (!alarm.kryzys && poziom !== 'wszystko') return null;
    if (this.wyciszone.has(alarm.rodzaj)) return null;
    // nie częściej niż co kilkanaście sekund świata, a ten sam rodzaj rzadziej —
    // oprócz Patrzącego: jego czas biegnie, więc ostrzeżenie przychodzi od razu
    if (alarm.rodzaj !== 'mrok' && alarm.rodzaj !== 'dlon' && sim.tick - this.ostatniAlarm < 1500) return null;
    if (sim.tick - (this.ostatnio.get(alarm.rodzaj) ?? -1e9) < 5400) return null;
    this.ostatniAlarm = sim.tick;
    this.ostatnio.set(alarm.rodzaj, sim.tick);
    return alarm;
  }

  private wykryj(sim: Sim): Alarm | null {
    // Koszmar: pod kimś z ludu porusza się otchłań — z głębi wznosi się dłoń
    const d = sim.lud.dlon;
    // (dopiero gdy łuna już świeci i dłoń majaczy w dole — karta zatrzymuje czas, a z nią obraz)
    if (d && d.faza === 'wstaje' && sim.tick - d.od >= 90 && d.od !== this.dlonOd) {
      this.dlonOd = d.od;
      const ile = d.ofiary.length;
      const zostalo = Math.max(1, Math.round((DLON.wstaje + DLON.siega - (sim.tick - d.od)) / 120));
      return {
        rodzaj: 'dlon', kryzys: true,
        tytul: 'Coś wznosi się z otchłani',
        tekst: `Pod stopami ${ile > 1 ? 'dwojga z ludu' : 'kogoś z ludu'} zaczerwieniła się otchłań i z głębi wznosi się ogromna dłoń. ${ile > 1 ? 'Stoją' : 'Stoi'} jak ${ile > 1 ? 'wryci' : 'wryty'}. Za ${zostalo} sekund sięgnie w górę i zabierze ${ile > 1 ? 'ich' : 'go'} w dół — bez śladu.`,
        rada: 'Rzuć Cud przy nich, zanim dłoń chwyci — światło zepchnie ją z powrotem w otchłań.',
        cel: { x: d.cx, y: d.cy, tekst: 'tu sięgnie dłoń' },
      };
    }

    // Ten, który patrzy: ktoś został sam w ciemności, a czas na ratunek biegnie
    const m = sim.lud.mrok;
    if (m && m.faza === 'patrzy' && m.od !== this.mrokOd) {
      this.mrokOd = m.od;
      const c = sim.creatures.find((k) => k.id === m.cel && !k.dead);
      if (c) {
        const kto = NAZWA_ROLI[rolaPostaci(c) ?? 'pobozny'].toLowerCase();
        return {
          rodzaj: 'mrok', kryzys: true,
          tytul: 'Coś patrzy z ciemności',
          tekst: `Daleko od obozu ${kto} został sam i stoi jak wryty. W skale obok niego świecą oczy. Za ${Math.round(MROK.patrzyTikow / 120)} sekund go zabierze — dostaniesz jego krew, lud straci człowieka.`,
          rada: 'Rzuć Cud tuż przy nim — światło przegoni to, co patrzy. Albo poślij do niego kogoś z ludu: we dwóch nie są samotni.',
          cel: { x: c.x, y: c.y, tekst: 'tu patrzy' },
        };
      }
    }

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
    // etap 3: fala Strażników Snu
    const fal = falRozpoczetych(sim);
    if (fal > this.fal) {
      this.fal = fal;
      this.pekniec = sim.rytual.pekniecia;     // pęknięcie, które wywołało falę, nie zatrzymuje gry drugi raz
      const w = sim.world;
      const def = STRAZNICY.fale[fal - 1];
      return {
        rodzaj: `fala-${fal}`, kryzys: true,
        tytul: def?.boss ? `Ostatnia fala — ${aktywnyBoss().nazwa}` : `Strażnicy Snu — fala ${fal} z ${STRAZNICY.fale.length}`,
        tekst: def?.boss ? `Z gruzów Wielkiego Pomnika wstał demon. ${aktywnyBoss().opis}`
          : `Ze skały wokół krypty wychodzą Strażnicy (${def?.straznikow ?? '?'}). Dopóki żyją, pomnik nie pęka. Pobożni i robotnicy odchodzą z krypty — walczy rycerz.`,
        rada: def?.boss ? 'Rycerz na demona, obaj pobożni do modlitwy w krypcie — wtedy demon słabnie. Robotnicy muszą odkopywać zasypaną drogę.'
          : 'Rycerz walczy sam; gdy zginie, robotnicy założą hełmy. Pilnuj, żeby był najedzony.',
        cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, tekst: 'przedsionek' },
      };
    }
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
      // tylko pierwsze pęknięcie zatrzymuje grę — dalej postęp rośnie w procentach, bez etapów
      if (r.pekniecia !== 1) return null;
      return {
        rodzaj: 'pekniecie-pierwsze', kryzys: true,
        tytul: `Wielki Pomnik zaczął pękać — ${procentSkorupy(sim)}%`,
        tekst: `Modlitwa pobożnych kruszy kamiennego demona, którego nie ruszy żaden kilof. Góra oddaje ci za to ${RYTUAL.nagrodaWiary} wiary. Gdy pomnik pęknie do końca, demon w nim się obudzi.`,
        rada: 'Pilnuj, żeby robotnicy donosili jedzenie warcie w krypcie, a rycerz był najedzony — przy każdym pęknięciu wychodzą Strażnicy.',
        cel: { x: w.coreX + 0.5, y: w.przedsionekY + 0.5, tekst: 'przedsionek' },
      };
    }
    return null;
  }
}
