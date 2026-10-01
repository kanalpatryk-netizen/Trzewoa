import { TEMPO } from '../nastawy/sterowanie';
/** Ustawienia gracza — jedno miejsce, z którego czyta cała gra. */
export interface Settings {
  trybDeweloperski: boolean; // podgląd liczb świata i narzędzia dla twórcy
  glosnosc: number;        // 0..1
  muzyka: boolean;
  rezonans: boolean;       // dźwięk świata: kucie, modlitwa, kamień
  efekty: boolean;         // dźwięki gestów: szkic, pauza, ostrzeżenia, atlas
  tempo: number;           // tików symulacji na klatkę
  jakosc: 'auto' | 'ostra' | 'szybka';
  kameraZaZyciem: boolean;
  autoZoom: boolean;
  oddech: boolean;         // powolne falowanie całego rysunku
  ograniczRuch: boolean;   // mniej drgań: dla oczu, które tego nie znoszą
  kronika: boolean;
  spisRas: boolean;
  skalaGlebokosci: boolean;
  wielkoscSylwetek: number; // 0.7..2.2
  kontrast: number;         // 0.75..1.35 — siła kreskowania
  autozapis: boolean;
  samouczekZrobiony: boolean;
  /** Kiedy gra sama zatrzymuje czas: przy kryzysach, przy każdym wydarzeniu albo nigdy. */
  autoPauza: 'wyłączona' | 'kryzysy' | 'wszystko';
  /** Nowa tablica atlasu: otwiera się sama przy pierwszym spotkaniu albo tylko trafia do atlasu. */
  tablice: 'pokazuj' | 'tylko w atlasie';
  /** Łaskawa góra wolniej zasypia i daje więcej krwi na start — na pierwsze partie. */
  trudnosc: 'łaskawa' | 'surowa';
  /** Mnożnik wielkości całego obrazu ponad automatyczne dopasowanie do ekranu. */
  wielkoscUI: number;
  /** Android: gra wchodzi na pełny ekran po „dotknij, aby się obudzić”. */
  pelnyEkran: boolean;
}

export const DOMYSLNE: Settings = {
  trybDeweloperski: false,
  glosnosc: 0.7,
  muzyka: true,
  rezonans: true,
  efekty: true,
  tempo: 2,
  jakosc: 'auto',
  kameraZaZyciem: true,
  autoZoom: false,
  oddech: true,
  ograniczRuch: false,
  kronika: true,
  spisRas: true,
  skalaGlebokosci: true,
  wielkoscSylwetek: 1.15,
  kontrast: 1,
  autozapis: true,
  samouczekZrobiony: false,
  autoPauza: 'kryzysy',
  tablice: 'tylko w atlasie',
  trudnosc: 'łaskawa',
  wielkoscUI: 1,
  pelnyEkran: true,
};

/**
 * Skala ekranu: ile pikseli CSS przypada na jeden piksel logiczny gry. Na dużym
 * monitorze cały obraz rośnie razem z ekranem, zamiast zostawać drobnym ziarnkiem.
 */
export const ekran = { skala: 1 };

const KLUCZ = 'trzewia:ustawienia';

export const ustawienia: Settings = wczytaj();

function wczytaj(): Settings {
  try {
    const raw = localStorage.getItem(KLUCZ);
    if (!raw) return { ...DOMYSLNE };
    const u: Settings = { ...DOMYSLNE, ...JSON.parse(raw) };
    // najwyżej ×3 — starsze zapisy miały do ×8
    u.tempo = Math.min(TEMPO.max, Math.max(1, u.tempo));
    return u;
  } catch {
    return { ...DOMYSLNE };
  }
}

export function zapiszUstawienia(): void {
  try { localStorage.setItem(KLUCZ, JSON.stringify(ustawienia)); } catch { /* tryb prywatny */ }
}

export function ustaw<K extends keyof Settings>(klucz: K, wartosc: Settings[K]): void {
  ustawienia[klucz] = wartosc;
  zapiszUstawienia();
}

/** Stan trybu „auto”: czy strażnik klatek kazał już rysować taniej (patrz nastawy JAKOSC). */
export const jakoscAuto = { taniej: false };

/** Skala renderu ryciny: „ostra" rysuje w pełnej rozdzielczości, „szybka" w połowie. */
export function skalaRenderu(szerokosc: number): number {
  if (ustawienia.jakosc === 'ostra') return 1;
  if (ustawienia.jakosc === 'szybka' || jakoscAuto.taniej) return 2;
  // powiększony ekran i tak rozciąga rycinę — rysujemy ją wtedy w pełnej rozdzielczości logicznej
  if (ekran.skala >= 1.4) return 1;
  return szerokosc > 900 ? 2 : 1;
}
