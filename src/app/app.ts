import type { Ekran } from './screen';
import type { Kontekst } from './context';
import { Resonance } from '../core/audio';
import { Muzyka } from '../core/music';
import { akcjaDlaKlawisza } from '../core/keybinds';
import { ustawienia } from '../core/settings-store';

/**
 * Pętla i przełącznik ekranów. Trzyma jedno miejsce, w którym dzieje się czas,
 * i rozdziela wejście do tego ekranu, który jest na wierzchu.
 */
export class App implements Kontekst {
  ctx: CanvasRenderingContext2D;
  w = 1; h = 1;
  dzwiek = new Resonance();
  muzyka = new Muzyka();
  private ekrany = new Map<string, Ekran>();
  private aktywny: Ekran | null = null;
  private ostatnia = performance.now();
  private dzwiekRuszyl = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    addEventListener('resize', () => this.przelicz());
    this.przelicz();
    this.podepnijWejscie();
  }

  zarejestruj(ekran: Ekran): void { this.ekrany.set(ekran.nazwa, ekran); }
  ekran(nazwa: string): Ekran | undefined { return this.ekrany.get(nazwa); }

  idz(nazwa: string, dane?: unknown): void {
    const nowy = this.ekrany.get(nazwa);
    if (!nowy) return;
    if (this.aktywny?.wyjdz) this.aktywny.wyjdz();
    this.aktywny = nowy;
    nowy.rozmiar?.(this.w, this.h);
    nowy.wejdz?.(dane);
  }

  get aktywnyEkran(): Ekran | null { return this.aktywny; }

  private przelicz(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // karta bez kompozycji potrafi zgłosić zerowy rozmiar — wtedy trzymamy sensowny domyślny
    this.w = Math.max(320, innerWidth || 1280);
    this.h = Math.max(240, innerHeight || 720);
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.aktywny?.rozmiar?.(this.w, this.h);
  }

  /** Przeglądarka pozwala odpalić dźwięk dopiero po dotknięciu — łapiemy pierwsze. */
  private obudzDzwiek(): void {
    if (this.dzwiekRuszyl) return;
    this.dzwiekRuszyl = true;
    if (ustawienia.rezonans) this.dzwiek.start();
    if (ustawienia.muzyka) this.muzyka.start();
  }

  private podepnijWejscie(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.obudzDzwiek();
      // przechwycenie wskaźnika bywa odrzucane (zdarzenia syntetyczne, część przeglądarek) —
      // nie może to blokować obsługi dotknięcia
      try { c.setPointerCapture(e.pointerId); } catch { /* nieistotne */ }
      this.aktywny?.dotyk?.(e, 'dol');
    });
    c.addEventListener('pointermove', (e) => this.aktywny?.dotyk?.(e, 'ruch'));
    c.addEventListener('pointerup', (e) => this.aktywny?.dotyk?.(e, 'gora'));
    c.addEventListener('pointercancel', (e) => this.aktywny?.dotyk?.(e, 'gora'));
    c.addEventListener('contextmenu', (e) => e.preventDefault());   // prawy przycisk przesuwa kamerę
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.aktywny?.kolko?.(e); }, { passive: false });
    addEventListener('keydown', (e) => {
      this.obudzDzwiek();
      if (e.key === 'Tab') e.preventDefault();          // Tab pokazuje liczby, nie przeskakuje po stronie
      this.aktywny?.klawisz?.(akcjaDlaKlawisza(e.key), e);
    });
    addEventListener('keyup', (e) => {
      if (e.key === 'Tab') (this.aktywny as { klawiszPuszczony?: (k: string) => void })?.klawiszPuszczony?.(e.key);
    });
  }

  /** Jedna klatka na żądanie — używane przez zrzuty ekranu w trybie deweloperskim. */
  rysujRaz(): void {
    const e = this.aktywny;
    if (!e) return;
    if (innerWidth !== this.w || innerHeight !== this.h) this.przelicz();
    const teraz = performance.now();
    e.krok(0, teraz);
    e.rysuj(this.ctx, this.w, this.h, teraz);
  }

  start(pierwszy: string): void {
    this.idz(pierwszy);
    const klatka = (teraz: number) => {
      const dt = Math.min(100, teraz - this.ostatnia);
      this.ostatnia = teraz;
      if ((innerWidth || 1280) !== this.w || (innerHeight || 720) !== this.h) this.przelicz();
      const e = this.aktywny;
      if (e) {
        e.krok(dt, teraz);
        e.rysuj(this.ctx, this.w, this.h, teraz);
      }
      requestAnimationFrame(klatka);
    };
    requestAnimationFrame(klatka);
  }
}
