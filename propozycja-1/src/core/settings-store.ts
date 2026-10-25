/** Ustawienia gracza — jedno miejsce, z którego czyta cała gra. */
export interface Settings {
  trybDeweloperski: boolean; // podgląd liczb świata i narzędzia dla twórcy
  glosnosc: number;        // 0..1
  muzyka: boolean;
  rezonans: boolean;       // dźwięk świata: kucie, modlitwa, kamień
  efekty: boolean;         // dźwięki gestów: szkic, pauza, ostrzeżenia, atlas
  jakosc: 'auto' | 'ostra' | 'szybka';
  kameraZaZyciem: boolean;
  /** Karta wydarzenia i ostrzeżenie same wiozą kamerę na miejsce (wyłączone: tylko znacznik i strzałka przy krawędzi). */
  kameraDoWydarzen: boolean;
  autoZoom: boolean;
  oddech: boolean;         // powolne falowanie całego rysunku
  ograniczRuch: boolean;   // mniej drgań: dla oczu, które tego nie znoszą
  kronika: boolean;
  spisRas: boolean;
  skalaGlebokosci: boolean;
  wielkoscSylwetek: number; // 0.7..2.2
  kontrast: number;         // 0.75..1.35 — siła kreskowania
  /** v4.2 beta: jasność ryciny świata (1..1.8) — świat bywał za ciemny, postacie ginęły w skale. */
  jasnosc: number;
  autozapis: boolean;
  samouczekZrobiony: boolean;
  /** Kiedy gra sama zatrzymuje czas: przy kryzysach, przy każdym wydarzeniu albo nigdy. */
  autoPauza: 'wyłączona' | 'kryzysy' | 'wszystko';
  /** Nowa tablica atlasu: otwiera się sama przy pierwszym spotkaniu albo tylko trafia do atlasu. */
  tablice: 'pokazuj' | 'tylko w atlasie';
  /** Mnożnik wielkości całego obrazu ponad automatyczne dopasowanie do ekranu. */
  wielkoscUI: number;
  /** Android: gra wchodzi na pełny ekran po „dotknij, aby się obudzić”. */
  pelnyEkran: boolean;
  /** Remake v1: nowe postacie ludu (cieniowane, z ruchem wtórnym); wyłączone — stary rysunek z ryciny. */
  nowePostacie: boolean;
  /** Rysunek świata na płycie: malowany jak fresk z ikony albo kreskowany jak dawna rycina. */
  swiat: 'fresk' | 'rycina';
}

export const DOMYSLNE: Settings = {
  trybDeweloperski: false,
  glosnosc: 0.7,
  muzyka: true,
  rezonans: true,
  efekty: true,
  jakosc: 'auto',
  kameraZaZyciem: true,
  kameraDoWydarzen: false,
  autoZoom: false,
  oddech: true,
  ograniczRuch: false,
  kronika: true,
  spisRas: true,
  skalaGlebokosci: true,
  wielkoscSylwetek: 1.15,
  kontrast: 1,
  jasnosc: 1.25,
  autozapis: true,
  samouczekZrobiony: false,
  autoPauza: 'kryzysy',
  tablice: 'tylko w atlasie',
  wielkoscUI: 1,
  pelnyEkran: true,
  nowePostacie: true,
  swiat: 'rycina',
};

/**
 * Skala ekranu: ile pikseli CSS przypada na jeden piksel logiczny gry. Na dużym
 * monitorze cały obraz rośnie razem z ekranem, zamiast zostawać drobnym ziarnkiem.
 */
export const ekran = { skala: 1 };

const KLUCZ = 'trzewia-propozycja-1:ustawienia';

export const ustawienia: Settings = wczytaj();

function wczytaj(): Settings {
  try {
    const raw = localStorage.getItem(KLUCZ);
    if (!raw) return { ...DOMYSLNE };
    const u: Settings = { ...DOMYSLNE, ...JSON.parse(raw) };
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

/**
 * Skala renderu ryciny: „ostra" rysuje w pełnej rozdzielczości, „szybka" w połowie. „Auto" zaczyna
 * w pełnej — w połowie cienka kreska rozpadała się na deszcz pikseli — i schodzi do połowy dopiero,
 * gdy strażnik klatek (render/straz-klatek.ts) zobaczy, że komputer nie nadąża.
 */
export function skalaRenderu(_szerokosc: number): number {
  if (ustawienia.jakosc === 'ostra') return 1;
  if (ustawienia.jakosc === 'szybka' || jakoscAuto.taniej) return 2;
  return 1;
}
