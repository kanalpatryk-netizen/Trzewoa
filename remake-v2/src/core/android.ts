import { ustawienia } from './settings-store';

/**
 * WERSJA ANDROID: to, czego telefon potrzebuje od strony, a komputer nie —
 * pełny ekran, systemowy przycisk „wstecz” i ekran, który nie gaśnie w trakcie partii.
 * Każda z tych rzeczy jest opcjonalna: przeglądarka, która jej nie zna, po prostu gra dalej.
 */

/** Pełny ekran — tylko po dotknięciu (przeglądarka pozwala na to wyłącznie w odpowiedzi na gest). */
export function pelnyEkran(): void {
  if (!ustawienia.pelnyEkran) return;
  const el = document.documentElement as HTMLElement & { requestFullscreen?: (o?: FullscreenOptions) => Promise<void> };
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => zablokujPoziom())
    .catch(() => { /* np. osadzona ramka — gramy bez pełnego ekranu */ });
}

/**
 * Gra na telefonie idzie poziomo. Aplikacja wymusza to sama (AndroidManifest: sensorLandscape);
 * w przeglądarce obrót da się zablokować dopiero w pełnym ekranie — i nie wszędzie.
 */
function zablokujPoziom(): void {
  const o = screen.orientation as ScreenOrientation & { lock?: (k: string) => Promise<void> };
  o?.lock?.('landscape').catch(() => { /* przeglądarka nie pozwala — trudno */ });
}

export function wyjdzZPelnegoEkranu(): void {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { /* nic */ });
}

/**
 * Systemowy „wstecz” działa jak Esc w grze: zamyka atlas, wraca do menu… Dopiero w menu
 * wychodzi ze strony. Bez tego jedno machnięcie od krawędzi ekranu zamykało grę.
 * Działa na wpisie w historii: póki gra ma go na wierzchu, „wstecz” trafia do niej.
 */
export class Wstecz {
  private wpis = false;

  constructor(private naWstecz: () => void) {
    addEventListener('popstate', () => { this.wpis = false; this.naWstecz(); });
  }

  /** `zostan` — czy „wstecz” ma zostać w grze (poza menu) zamiast wyjść ze strony. */
  uzbroj(zostan: boolean): void {
    if (!zostan || this.wpis) return;
    try { history.pushState({ trzewia: true }, ''); this.wpis = true; } catch { /* np. sandbox — trudno */ }
  }
}

type Blokada = { release: () => Promise<void>; addEventListener?: (t: string, f: () => void) => void };

/** Ekran nie gaśnie, póki toczy się partia — na telefonie gasł co pół minuty patrzenia na górę. */
export class NieGasnij {
  private blokada: Blokada | null = null;
  private chce = false;

  constructor() {
    // blokada znika sama, gdy karta chowa się w tle — po powrocie trzeba o nią poprosić znowu
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.chce) void this.wez(); });
  }

  ustaw(chce: boolean): void {
    this.chce = chce;
    if (chce) void this.wez(); else this.pusc();
  }

  private async wez(): Promise<void> {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Blokada> } }).wakeLock;
    if (this.blokada || !wl) return;
    try {
      this.blokada = await wl.request('screen');
      this.blokada.addEventListener?.('release', () => { this.blokada = null; });
    } catch { this.blokada = null; }
  }

  private pusc(): void {
    const b = this.blokada;
    this.blokada = null;
    b?.release().catch(() => { /* nic */ });
  }
}
