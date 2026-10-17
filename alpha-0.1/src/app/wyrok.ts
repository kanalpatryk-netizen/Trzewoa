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
  /** v4 beta: liczby z całej partii (jedna linijka). */
  statystyki: string;
}

/** v4 beta: czas, szczyt ludności, narodziny, zgony, wykopane bloki, karty. */
export function statystyki(sim: Sim): string {
  let zgonow = 0;
  for (const n of sim.deaths.values()) zgonow += n;
  const sek = Math.floor(sim.tick / (TIKOW_NA_MINUTE / 60));
  return `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')} min · najwięcej dusz ${sim.stat.szczyt} · narodzin ${sim.stat.urodzen} · zgonów ${zgonow}`
    + ` · bloków wykopanych ${sim.dug} · kart ${sim.stat.kart}`;
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
      rada: 'Spróbuj szybciej — i tak, żeby jak najmniej ludu zostało na ziemi jako trupy. Osiągnięcia podpowiadają, co jeszcze da się zrobić.',
      etap, statystyki: statystyki(sim),
    };
  }
  if (rodzaj === 'upadek') {
    return {
      przyczyna: 'Zabrakło pobożnych — nikt już nie skruszy skorupy.',
      rada: 'Drużyna jest stała: pilnuj obu pobożnych jak oka w głowie — karm ich, trzymaj z dala od ciemności i nie zostawiaj samych pod rdzeniem w czasie fali.',
      etap, statystyki: statystyki(sim),
    };
  }
  if (rodzaj === 'smierc') {
    return {
      przyczyna: 'Do rdzenia doszli ci, którzy się nie modlili.',
      rada: 'Pilnuj, kto stoi pod skorupą: posyłaj tam swoich wiernych szeptem „módl się” i rób Cud przy ich gnieździe.',
      etap, statystyki: statystyki(sim),
    };
  }
  // sen: z pustki albo z monokultury
  if (zywych < 14 && sim.dominance < 0.8) {
    return {
      przyczyna: 'Góra opustoszała — nie został prawie nikt, kto by o tobie myślał.',
      rada: 'Karm tych, których jest mało, a na kartach „wymierają” wybieraj ratunek. Pusta góra zasypia w kilka minut.',
      etap, statystyki: statystyki(sim),
    };
  }
  const nazwa = RACES[sim.domRace]?.name ?? 'Jedna krew';
  return {
    przyczyna: `${nazwa} ${odmien(sim.domRace, 'zjadł', 'zjedli')} resztę. Z jedną krwią w trzewiach nie ma komu się bać.`,
    rada: 'Gdy wstęga pod płytą robi się jednego koloru, wysłuchaj ich proroka albo skieruj na nich najazd czy powódź — i dokarmiaj pozostałe rasy, zanim wymrą.',
    etap, statystyki: statystyki(sim),
  };
}
