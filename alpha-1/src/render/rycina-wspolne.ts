import type { RowneGrzbietu } from './grzbiet-wzor';
import type { KameraRyciny } from './engrave';

/**
 * Rozmowa gry z wątkiem ryciny (render/rycina.ts ↔ render/rycina-watek.ts): co idzie w wiadomościach i jak się
 * wycina kawałek mapy. Wątek trzyma własną kopię świata — całą dostaje raz na świat, a potem przy każdej odbitce
 * tylko okno kafli wokół kamery, bo tylko tam rycina zagląda.
 */

/** Tablice świata (po kaflu), które czyta rycina. */
export const TABLICE = ['tile', 'ever', 'mem', 'lastSeen', 'magma', 'water', 'slad'] as const;
export type NazwaTablicy = (typeof TABLICE)[number];
export type TablicaKafli = Uint8Array | Int32Array;

/** Stałe położenia w świecie, z których rycina liczy dzień w sali i szybach i czerwień przy pomniku. */
export interface SkalarySwiata {
  coreX: number; coreY: number;
  salaOltarza: { x0: number; x1: number; y0: number; y1: number };
  oltarz: { x: number; y: number };
  szybX: number; szybDol: number; szybWiadraX: number; szybWiadraDol: number;
}

/** Nowy świat (nowa partia, wczytany zapis): wszystkie tablice w całości, granice warstw i równy grunt grzbietu. */
export interface WiadomoscSwiata {
  typ: 'swiat';
  id: number;
  w: number; h: number;
  tablice: Record<NazwaTablicy, TablicaKafli>;
  surface: Int16Array;
  granice: { g1: Float32Array; g2: Float32Array } | null;
  rowne: RowneGrzbietu;
}

/** Okno kafli (już przycięte do świata): lewy górny róg, szerokość i wysokość. */
export interface OknoKafli { x0: number; y0: number; sz: number; wy: number }

/** Prośba o odbitkę: okno świata, światło ludu, kamera (z zapasem na brzegach) i ustawienia rysunku. */
export interface ProsbaRyciny {
  typ: 'rysuj';
  nr: number;
  swiatId: number;
  okno: OknoKafli;
  tablice: Record<NazwaTablicy, TablicaKafli>;
  surface: Int16Array;
  skalary: SkalarySwiata;
  tick: number;
  zrodla: Float64Array;
  kam: KameraRyciny;
  /** Zapas na brzegach (px logiczne): kamera `kam` ma płytę o tyle szerszą z każdej strony niż prawdziwa. */
  zapas: number;
  czas: number;
  skala: number;
  kontrast: number;
  fresk: boolean;
  /** Poświata liczy się w tylu razy mniejszej rozdzielczości (render/bloom.ts). */
  poswiataPodzial: number;
}

/** Gotowa odbitka z wątku: obrazy i gdzie leżą względem kamery, dla której powstały. */
export interface OdbitkaRyciny {
  typ: 'odbitka';
  nr: number;
  buf: ImageBitmap;
  /** Światło kafli — tylko gdy wątek nie umiał rozmyć poświaty sam (bez filtra płótna). */
  emis: ImageBitmap | null;
  /**
   * Rozmyta poświata (ćwierć rozdzielczości) — z tego kawałka światła kafli, który leży pod prawdziwą płytą (bez
   * zapasu), tak jak dawniej w grze: ta sama siatka, ten sam obraz.
   */
  poswiata: ImageBitmap | null;
  kam: KameraRyciny;
  /** Piksele płyty na piksel ryciny (1 albo 2) i gdzie leży obraz na płycie kamery `kam`. */
  skala: number;
  dx: number; dy: number; bw: number; bh: number;
  niedokonczona: boolean;
  /** Ile ms wątek liczył tę odbitkę — razem i po częściach (wklejenie migawki, rycina, poświata). */
  ms: number;
  czasy: { migawka: number; rycina: number; poswiata: number };
}

export interface BladRyciny { typ: 'blad'; tekst: string }

/** Wycina okno z tablicy świata (szerokość świata `w`) — wiersz po wierszu, do nowej, zwartej tablicy. */
export function wytnij<A extends TablicaKafli>(zrodlo: A, w: number, o: OknoKafli): A {
  const out = new (zrodlo.constructor as { new (n: number): A })(o.sz * o.wy);
  for (let y = 0; y < o.wy; y++) {
    const p = (o.y0 + y) * w + o.x0;
    out.set(zrodlo.subarray(p, p + o.sz) as never, y * o.sz);
  }
  return out;
}

/** Wkleja wycięte okno z powrotem w tablicę świata (wątek ryciny). */
export function wklej(cel: TablicaKafli, w: number, o: OknoKafli, czesc: TablicaKafli): void {
  for (let y = 0; y < o.wy; y++) cel.set(czesc.subarray(y * o.sz, (y + 1) * o.sz) as never, (o.y0 + y) * w + o.x0);
}
