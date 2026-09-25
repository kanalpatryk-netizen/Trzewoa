import type { Sim } from '../sim/sim';
import type { Race } from '../sim/races';
import { cost, affordable, kafleKsztaltu, shape, seed, sign, whisper, taint, type Verb } from './powers';

/** Jeden zamiar wydany w pauzie: co, gdzie i ile już zarezerwowano. */
export interface Rozkaz {
  czasownik: Verb;
  narzedzie: string;
  x: number; y: number;
  /** Szept: kto ma usłyszeć. Skaza: czyją krwią zaczyna się zmiana. */
  kto?: number;
  rasa?: Race;
  koszt: { krew: number; wiara: number; otchlan: number };
}

/** Co się stało z rozkazem przy puszczeniu czasu — gra zgłasza to samouczkowi i kronice. */
export interface Wykonanie { rozkaz: Rozkaz; udane: boolean }

/**
 * Plan z pauzy, jak w Baldur's Gate: w zatrzymanym świecie wydajesz rozkazy, one
 * rysują się jako szkic rylcem i rezerwują koszt, a dzieją się dopiero wtedy, gdy
 * puścisz czas. Szkic można skreślić, a rezerwacja wraca.
 */
export class Rozkazy {
  lista: Rozkaz[] = [];
  private sim: Sim | null = null;

  /** Nowa góra albo wczytany zapis — stary plan nie ma prawa dotknąć nowego świata. */
  private pilnuj(sim: Sim): void {
    if (this.sim === sim) return;
    this.sim = sim;
    this.lista = [];
  }

  get ile(): number { return this.lista.length; }

  /**
   * Dopisuje rozkaz do planu. Zwraca powód odmowy albo null, gdy się udało.
   * Sprawdza to samo, co wykonanie — szkic nie obiecuje czegoś, czego potem nie będzie.
   */
  zaplanuj(sim: Sim, r: Omit<Rozkaz, 'koszt'>): string | null {
    this.pilnuj(sim);
    const w = sim.world;
    if (!affordable(sim, r.czasownik, r.narzedzie)) return 'Nie stać cię — część zasobów trzyma już plan.';
    switch (r.czasownik) {
      case 'ksztaltuj':
        if (!kafleKsztaltu(sim, r.narzedzie, r.x, r.y)) {
          return r.narzedzie === 'zawal' ? 'Tu nie ma czego zawalić — celuj w pustkę.'
            : r.narzedzie === 'draz' ? 'Tu nie ma czego drążyć — celuj w skałę.'
            : (r.narzedzie === 'woda' || r.narzedzie === 'zar') && w.suchaStrefa(r.x, r.y)
              ? 'Nie tutaj. To jedyna sucha droga do twojego rdzenia.'
              : 'Nie da się tego zrobić w tym miejscu.';
        }
        // pociągnięcie po tym samym miejscu nie mnoży rozkazów
        if (this.lista.some((o) => o.czasownik === 'ksztaltuj' && o.narzedzie === r.narzedzie && Math.hypot(o.x - r.x, o.y - r.y) < 1.2)) return '';
        break;
      case 'zasiej':
        if (!w.inb(r.x, r.y)) return 'Poza górą.';
        if (this.lista.some((o) => o.czasownik === 'zasiej' && o.narzedzie === r.narzedzie && Math.hypot(o.x - r.x, o.y - r.y) < 1.6)) return '';
        break;
      case 'znak':
        if (this.lista.some((o) => o.czasownik === 'znak' && Math.hypot(o.x - r.x, o.y - r.y) < 3)) return 'Tu już stoi twój Znak.';
        break;
      case 'szept':
        // jedna myśl na głowę — nowa zastępuje starą
        this.lista.filter((o) => o.czasownik === 'szept' && o.kto === r.kto).forEach((o) => this.usun(sim, o));
        break;
      case 'skaz':
        if (r.rasa === undefined) return 'Tej krwi nie sięgniesz.';
        if (sim.taints[r.rasa].includes(r.narzedzie)
          || this.lista.some((o) => o.czasownik === 'skaz' && o.rasa === r.rasa && o.narzedzie === r.narzedzie)) {
          return 'Tę skazę ta krew już nosi.';
        }
        break;
    }
    const k = cost(r.czasownik, r.narzedzie);
    sim.rezerwa.krew += k.krew; sim.rezerwa.wiara += k.wiara; sim.rezerwa.otchlan += k.otchlan;
    this.lista.push({ ...r, koszt: k });
    return null;
  }

  private usun(sim: Sim, o: Rozkaz): void {
    const i = this.lista.indexOf(o);
    if (i < 0) return;
    this.lista.splice(i, 1);
    sim.rezerwa.krew = Math.max(0, sim.rezerwa.krew - o.koszt.krew);
    sim.rezerwa.wiara = Math.max(0, sim.rezerwa.wiara - o.koszt.wiara);
    sim.rezerwa.otchlan = Math.max(0, sim.rezerwa.otchlan - o.koszt.otchlan);
  }

  /** Skreśla ostatni rozkaz. */
  cofnij(sim: Sim): boolean {
    this.pilnuj(sim);
    const o = this.lista[this.lista.length - 1];
    if (!o) return false;
    this.usun(sim, o);
    return true;
  }

  skreslWszystkie(sim: Sim): void {
    this.pilnuj(sim);
    for (const o of [...this.lista]) this.usun(sim, o);
  }

  /** Rozkaz, którego szkic leży pod tym miejscem świata (ostatni narysowany wygrywa). */
  pod(sim: Sim, wx: number, wy: number): Rozkaz | null {
    this.pilnuj(sim);
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const o = this.lista[i];
      let x = o.x, y = o.y;
      if (o.kto !== undefined) {
        const c = sim.creatureById(o.kto);
        if (c) { x = c.x; y = c.y; }
      }
      const r = o.czasownik === 'znak' ? 2.2 : o.czasownik === 'zasiej' ? 2.4 : 2;
      if (Math.hypot(wx - x, wy - y) <= r) return o;
    }
    return null;
  }

  skresl(sim: Sim, o: Rozkaz): void { this.pilnuj(sim); this.usun(sim, o); }

  /**
   * Czas puszczony: wszystko dzieje się naraz, w kolejności wydania. Rezerwacja
   * danego rozkazu zwalnia się tuż przed nim, a zapłatę bierze samo wykonanie.
   */
  wykonaj(sim: Sim): Wykonanie[] {
    this.pilnuj(sim);
    const wyniki: Wykonanie[] = [];
    for (const o of [...this.lista]) {
      this.usun(sim, o);
      let udane = false;
      switch (o.czasownik) {
        case 'ksztaltuj': udane = shape(sim, o.narzedzie, o.x, o.y); break;
        case 'zasiej': udane = seed(sim, o.narzedzie, o.x, o.y); break;
        case 'znak': udane = sign(sim, o.narzedzie, o.x, o.y); break;
        case 'szept': {
          const c = o.kto !== undefined ? sim.creatureById(o.kto) : null;
          udane = !!c && !c.dead && whisper(sim, o.narzedzie, c);
          break;
        }
        case 'skaz': udane = o.rasa !== undefined && taint(sim, o.narzedzie, o.rasa); break;
      }
      wyniki.push({ rozkaz: o, udane });
    }
    return wyniki;
  }
}
