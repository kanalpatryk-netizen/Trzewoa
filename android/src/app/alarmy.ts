import type { Sim } from '../sim/sim';
import { Race, RACES, odmien } from '../sim/races';
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
 * nacja wymiera, jedna krew bierze górę, przychodzi przypływ, zaczyna się sen,
 * pęka skorupa — i wtedy zatrzymuje świat, zamiast pozwolić, by przeleciało obok.
 */
export class Straznik {
  private sim: Sim | null = null;
  private szczyt = new Map<number, number>();
  private dominuje = false;
  private senProg = 0;
  private przyplyw = -1;
  private pekniec = 0;
  private otwarta = false;
  private ostatnio = new Map<string, number>();
  private ostatniAlarm = -1e9;
  /** Rodzaje, przy których gracz poprosił, żeby go więcej nie zatrzymywać. */
  wyciszone = new Set<string>();

  private od(sim: Sim): void {
    if (this.sim === sim) return;
    this.sim = sim;
    this.szczyt.clear();
    this.ostatnio.clear();
    this.dominuje = sim.dominance > 0.75;
    this.senProg = sim.sen;
    this.przyplyw = sim.tideTick;
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
      : alarm.rodzaj.startsWith('pekniecie') ? 'skorupa'
      : alarm.rodzaj.startsWith('przyplyw') ? 'przyplyw' : undefined;
    if (!alarm.kryzys && poziom !== 'wszystko') return null;
    if (this.wyciszone.has(alarm.rodzaj)) return null;
    // nie częściej niż co kilkanaście sekund świata, a ten sam rodzaj rzadziej
    if (sim.tick - this.ostatniAlarm < 1500) return null;
    if (sim.tick - (this.ostatnio.get(alarm.rodzaj) ?? -1e9) < 5400) return null;
    this.ostatniAlarm = sim.tick;
    this.ostatnio.set(alarm.rodzaj, sim.tick);
    return alarm;
  }

  private klan(sim: Sim, rasa: number): { x: number; y: number } | null {
    const k = sim.clans.filter((c) => !c.dead && c.race === rasa && c.pop > 0).sort((a, b) => b.pop - a.pop)[0];
    return k ? { x: k.hx, y: k.hy } : null;
  }

  private wykryj(sim: Sim): Alarm | null {
    // 1. nacja o krok od wygaśnięcia — była liczna, została garstka
    for (const r of [Race.GOBLIN, Race.DWARF, Race.SPINNER]) {
      const ilu = sim.popByRace[r];
      const szczyt = Math.max(this.szczyt.get(r) ?? 0, ilu);
      this.szczyt.set(r, ilu > 0 ? szczyt : 0);
      if (sim.tick > 3000 && ilu > 0 && ilu <= 3 && szczyt >= 7) {
        this.szczyt.set(r, ilu);                       // następny alarm dopiero, gdy znów urosną i spadną
        const nazwa = RACES[r].name;
        const gdzie = this.klan(sim, r);
        return {
          rodzaj: `wymiera-${r}`, kryzys: true,
          tytul: `${nazwa} ${odmien(r, 'wymiera', 'wymierają')}`,
          tekst: `Zostało ${ilu === 1 ? 'jedno' : ilu === 2 ? 'dwoje' : 'troje'}. Bez nich jedna krew zje resztę, a ty zaśniesz.`,
          rada: r === Race.GOBLIN ? 'Zasiej grzyb w ich jaskini — sytych jest więcej.'
            : r === Race.DWARF ? 'Zasiej rudę przy ich kuźni; gdy nie mają ciepła, otwórz żar obok — nie pod nogami.'
            : 'Zasiej kości przy ich gnieździe albo wydrąż im drogę do słabszych.',
          cel: gdzie ? { ...gdzie, tekst: nazwa } : undefined,
        };
      }
    }
    // 2. jedna krew bierze górę
    if (!this.dominuje && sim.dominance > 0.75 && sim.tick > 3000) {
      this.dominuje = true;
      const r = sim.domRace;
      const gdzie = this.klan(sim, r);
      const nazwa = RACES[r]?.name ?? 'Jedna krew';
      return {
        rodzaj: 'dominacja', kryzys: true,
        tytul: `${nazwa} ${odmien(r, 'bierze', 'biorą')} górę`,
        tekst: `${Math.round(sim.dominance * 100)}% żywych to jedna krew. Gdy nikt się jej nie przeciwstawi, zaczniesz zasypiać.`,
        rada: 'Szepnij „prorokuj” w ich największej nacji — rozłam da wojnę, która cię budzi. Albo zawal im korytarz.',
        cel: gdzie ? { ...gdzie, tekst: nazwa } : undefined,
      };
    }
    if (this.dominuje && sim.dominance < 0.65) this.dominuje = false;
    // 3. sen
    for (const prog of [0.2, 0.55]) {
      if (this.senProg < prog && sim.sen >= prog) {
        this.senProg = sim.sen;
        return {
          rodzaj: `sen-${prog}`, kryzys: true,
          tytul: prog < 0.5 ? 'Zasypiasz' : 'Powieka opada',
          tekst: prog < 0.5 ? 'Na górze robi się cicho. Jedna krew albo pustka — i sen przychodzi sam.'
            : 'Jeszcze chwila i zaśniesz na zawsze. Obudzi cię tylko wojna, którą sam rozpętasz.',
          rada: 'Zrób proroka w dużym klanie — ich wojna cofa sen. Nakarm tych, których jest najmniej.',
        };
      }
    }
    this.senProg = Math.min(this.senProg, sim.sen);
    // 4. skorupa rdzenia
    if (sim.rytual.otwarta && !this.otwarta) {
      this.otwarta = true;
      const w = sim.world;
      return {
        rodzaj: 'otwarta', kryzys: true,
        tytul: 'Droga do rdzenia stoi otworem',
        tekst: 'Ktoś zaraz dojdzie do ciebie. Jeśli wierzy — uklęknie i cię uwolni. Jeśli nie — zabije.',
        rada: 'Pilnuj, kto idzie pierwszy: wierni muszą zdążyć przed obcymi. Zawał zatrzyma niechcianych.',
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
    // 5. przypływ
    if (sim.tideTick !== this.przyplyw) {
      this.przyplyw = sim.tideTick;
      const t = sim.lastTide;
      const nowy = sim.clans.filter((k) => !k.dead).sort((a, b) => b.founded - a.founded)[0];
      const cel = (t === 'nowe plemię' || t === 'obcy lud' || t === 'krucjata') && nowy
        ? { x: nowy.hx, y: nowy.hy, tekst: nowy.name } : undefined;
      const opis: Record<string, [string, string, string]> = {
        'nowe plemię': ['Nowe plemię schodzi w górę', 'Pustka przyciąga. Przyszli za jedzeniem i nie wiedzą, kim jesteś.', 'Nakarm ich, zanim zjedzą ich sąsiedzi — każda nowa krew oddala sen.'],
        'obcy lud': ['Ze szczelin wychodzi obcy lud', 'Garstka krwi, której brakowało, wyszła z głębi.', 'Osłoń ich zawałem od silnych albo daj im to, z czego żyją.'],
        'krucjata': ['Z powierzchni schodzą ludzie', 'Nie mieszkają w tobie — biorą rudę i wracają. Po drodze zabijają.', 'Zawał odetnie im drogę; ich śmierci to twoja krew.'],
        'zalanie': ['Woda znalazła szczelinę', 'Górne korytarze toną. Kto nie pływa, zginie.', 'Zawal przejście między wodą a gniazdem.'],
        'zaraza': ['Zaraza w twoich trzewiach', 'Najciaśniejsza krew choruje najciężej.', 'Nic nie musisz — zaraza sama wyrównuje wstęgę.'],
        'żyła szaleństwa': ['Żyła szaleństwa w głębi', 'Kto tam kopie, wraca inny — czasem trolem.', 'Trzymaj swoich z dala od głębi — kto kopie za nisko, wraca trolem.'],
      };
      const o = opis[t];
      if (o) return { rodzaj: `przyplyw-${t}`, kryzys: false, tytul: o[0], tekst: o[1], rada: o[2], cel };
    }
    return null;
  }
}
