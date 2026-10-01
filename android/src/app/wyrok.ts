import type { Sim } from '../sim/sim';
import { Race, RACES, RACE_COUNT, odmien } from '../sim/races';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';

/**
 * Wyrok po partii: dlaczego to się tak skończyło i jedna rada na następny raz.
 * Kronika mówiła tylko „Zasnąłeś" — gracz nie wiedział, czy zawiódł, bo wszyscy
 * wymarli, bo jedna krew zjadła resztę, czy dlatego, że nikt nie zszedł pod rdzeń.
 */
export interface Wyrok {
  przyczyna: string;
  rada: string;
  /** Jak daleko zaszła droga do Uwolnienia — to, co warto pamiętać z tej partii. */
  etap: string;
}

export function wyrok(sim: Sim): Wyrok {
  const e = sim.ending ?? 'sen';
  const [rodzaj] = e.split(':');
  const minut = Math.max(1, Math.round(sim.tick / TIKOW_NA_MINUTE));
  let zywych = 0;
  for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM && r !== Race.HUMAN) zywych += sim.popByRace[r];
  const oddanie = sim.clans.reduce((m, k) => Math.max(m, k.devotion), 0);
  const pek = sim.rytual.pekniecia;

  const etap = rodzaj === 'uwolnienie' ? `Droga przebyta w ${minut} min.`
    : pek > 0 ? `Najdalej: skorupa rdzenia pękła ${pek === 1 ? 'raz' : `${pek} razy`}. Brakowało niewiele.`
    : oddanie > 0.6 ? 'Najdalej: ktoś uwierzył dość mocno, ale nie zszedł pod rdzeń — zabrakło drogi.'
    : 'Najdalej: nikt nie uwierzył w ciebie dość mocno, by ruszyć pod rdzeń.';

  if (rodzaj === 'uwolnienie') {
    return {
      przyczyna: 'Wierni przebili skorupę i uklękli przy rdzeniu.',
      rada: sim.lagodna ? 'Spróbuj surowej góry (Ustawienia → Świat → Góra).'
        : 'Spróbuj szybciej — i tak, żeby nikt nie wymarł po drodze.',
      etap,
    };
  }
  if (rodzaj === 'smierc') {
    return {
      przyczyna: 'Do rdzenia doszli ci, którzy się nie modlili.',
      rada: 'Pilnuj, kto stoi pod skorupą: posyłaj tam swoich wiernych szeptem „módl się” i rób Cud przy ich gnieździe.',
      etap,
    };
  }
  // sen: z pustki albo z monokultury
  if (zywych < 14 && sim.dominance < 0.8) {
    return {
      przyczyna: 'Góra opustoszała — nie został prawie nikt, kto by o tobie myślał.',
      rada: 'Karm tych, których jest mało, a na kartach „wymierają” wybieraj ratunek. Pusta góra zasypia w kilka minut.',
      etap,
    };
  }
  const nazwa = RACES[sim.domRace]?.name ?? 'Jedna krew';
  return {
    przyczyna: `${nazwa} ${odmien(sim.domRace, 'zjadł', 'zjedli')} resztę. Z jedną krwią w trzewiach nie ma komu się bać.`,
    rada: 'Gdy wstęga pod płytą robi się jednego koloru, wysłuchaj ich proroka albo skieruj na nich najazd czy powódź — i dokarmiaj pozostałe rasy, zanim wymrą.',
    etap,
  };
}
