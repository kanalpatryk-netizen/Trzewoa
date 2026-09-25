import { TABLICE } from './tablice';

const KLUCZ = 'trzewia:atlas';

/**
 * Które tablice gracz już odkrył — pamiętane między partiami, bo atlas to wiedza
 * gracza, nie jednej góry. Nowe odkrycia czekają w kolejce na pokazanie.
 */
class Odkrycia {
  private znane = new Set<string>();
  /** Odkryte w tej sesji, jeszcze niepokazane. */
  kolejka: string[] = [];

  constructor() {
    try {
      const raw = localStorage.getItem(KLUCZ);
      if (raw) for (const id of JSON.parse(raw) as string[]) this.znane.add(id);
    } catch { /* tryb prywatny: atlas żyje tylko w tej sesji */ }
  }

  zna(id: string): boolean { return this.znane.has(id); }

  get ile(): number { return TABLICE.filter((t) => this.znane.has(t.id)).length; }

  /** Odkrywa tablicę; zwraca true, gdy to naprawdę nowość. */
  odkryj(id: string, pokaz = true): boolean {
    if (this.znane.has(id) || !TABLICE.some((t) => t.id === id)) return false;
    this.znane.add(id);
    if (pokaz) this.kolejka.push(id);
    this.zapisz();
    return true;
  }

  private zapisz(): void {
    try { localStorage.setItem(KLUCZ, JSON.stringify([...this.znane])); } catch { /* bez pamięci */ }
  }
}

export const odkrycia = new Odkrycia();
