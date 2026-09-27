import type { Ekran } from './screen';
import type { Kontekst } from './context';
import { Resonance } from '../core/audio';
import { Muzyka } from '../core/music';
import { Gesty } from '../core/gesty';
import { mikser } from '../core/mikser';
import { akcjaDlaKlawisza } from '../core/keybinds';
import { ustawienia, ekran } from '../core/settings-store';
import { EKRAN } from '../nastawy/ekran';

/**
 * Pętla i przełącznik ekranów. Trzyma jedno miejsce, w którym dzieje się czas,
 * i rozdziela wejście do tego ekranu, który jest na wierzchu.
 */
export class App implements Kontekst {
  ctx: CanvasRenderingContext2D;
  w = 1; h = 1;
  /** Rozmiar w pikselach CSS i mnożnik, z którego wyszła skala — po nich poznajemy zmianę. */
  private cssW = 0; private cssH = 0; private mnoznik = 1;
  dzwiek = new Resonance();
  muzyka = new Muzyka();
  gesty = new Gesty();
  private ekrany = new Map<string, Ekran>();
  private aktywny: Ekran | null = null;
  private ostatnia = performance.now();
  private dzwiekRuszyl = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    addEventListener('resize', () => this.przelicz());
    // karta w tle nie gra: telefon oszczędza baterię, a góra nie dudni z kieszeni
    document.addEventListener('visibilitychange', () => { if (document.hidden) mikser.usnij(); else if (this.dzwiekRuszyl) mikser.wznow(); });
    this.przelicz();
    this.podepnijWejscie();
  }

  zarejestruj(ekran: Ekran): void { this.ekrany.set(ekran.nazwa, ekran); }
  ekran(nazwa: string): Ekran | undefined { return this.ekrany.get(nazwa); }

  idz(nazwa: string, dane?: unknown): void {
    const nowy = this.ekrany.get(nazwa);
    if (!nowy) return;
    if (this.aktywny?.wyjdz) this.aktywny.wyjdz();
    // nowy ekran zaczyna od czystego dźwięku — pauza z gry nie może zostać w menu
    mikser.zawies(0);
    this.gesty.tonPauzy(false);
    this.aktywny = nowy;
    nowy.rozmiar?.(this.w, this.h);
    nowy.wejdz?.(dane);
  }

  get aktywnyEkran(): Ekran | null { return this.aktywny; }

  /**
   * Gra liczy wszystko w pikselach logicznych: do ekranu 1366×820 to po prostu piksele,
   * na większym cały obraz — płyta, napisy, ryty — rośnie proporcjonalnie. Na małym
   * ekranie skala spada tak, żeby logiczny ekran miał co najmniej minimum z nastaw
   * (nastawy/ekran.ts) — wtedy każdy układ się mieści i nic na siebie nie nachodzi.
   */
  przelicz(): void {
    const E = EKRAN;
    const dpr = Math.min(E.maxDpr, window.devicePixelRatio || 1);
    // karta bez kompozycji potrafi zgłosić zerowy rozmiar — wtedy trzymamy sensowny domyślny
    const cssW = Math.max(240, innerWidth || 1280);
    const cssH = Math.max(240, innerHeight || 720);
    // duży monitor: cały obraz rośnie z ekranem
    const auto = Math.max(1, Math.min(E.maxPowiekszenie, Math.min(cssW / E.wzorzecW, cssH / E.wzorzecH)));
    this.mnoznik = ustawienia.wielkoscUI || 1;
    // mały ekran: skala zaskakuje w dół, aż logiczny ekran osiągnie minimum
    const pion = cssH >= cssW;
    const minW = pion ? E.pionMinW : E.poziomMinW, minH = pion ? E.pionMinH : E.poziomMinH;
    const skala = Math.min(auto * this.mnoznik, cssW / minW, cssH / minH);
    ekran.skala = Math.max(E.minSkala, skala);
    this.cssW = cssW; this.cssH = cssH;
    this.w = cssW / ekran.skala;
    this.h = cssH / ekran.skala;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr * ekran.skala, 0, 0, dpr * ekran.skala, 0, 0);
    this.aktywny?.rozmiar?.(this.w, this.h);
  }

  private zmienilSieEkran(): boolean {
    return (innerWidth || 1280) !== this.cssW || (innerHeight || 720) !== this.cssH || (ustawienia.wielkoscUI || 1) !== this.mnoznik;
  }

  /** Zdarzenie wskaźnika w pikselach logicznych — ekrany nie wiedzą o skali. */
  private logiczne<T extends PointerEvent | WheelEvent>(e: T): T {
    const s = ekran.skala;
    if (s === 1) return e;
    const w = e as WheelEvent;
    return {
      clientX: e.clientX / s, clientY: e.clientY / s,
      button: e.button, buttons: e.buttons,
      pointerId: (e as PointerEvent).pointerId, pointerType: (e as PointerEvent).pointerType,
      deltaX: w.deltaX, deltaY: w.deltaY, deltaMode: w.deltaMode,
      preventDefault: () => e.preventDefault(),
    } as unknown as T;
  }

  /** Przeglądarka pozwala odpalić dźwięk dopiero po dotknięciu — łapiemy pierwsze. */
  private obudzDzwiek(): void {
    if (this.dzwiekRuszyl) { mikser.wznow(); return; }
    this.dzwiekRuszyl = true;
    this.gesty.start();
    if (ustawienia.rezonans) this.dzwiek.start();
    if (ustawienia.muzyka) this.muzyka.start();
    mikser.wznow();
  }

  private podepnijWejscie(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.obudzDzwiek();
      // przechwycenie wskaźnika bywa odrzucane (zdarzenia syntetyczne, część przeglądarek) —
      // nie może to blokować obsługi dotknięcia
      try { c.setPointerCapture(e.pointerId); } catch { /* nieistotne */ }
      this.aktywny?.dotyk?.(this.logiczne(e), 'dol');
    });
    c.addEventListener('pointermove', (e) => this.aktywny?.dotyk?.(this.logiczne(e), 'ruch'));
    c.addEventListener('pointerup', (e) => this.aktywny?.dotyk?.(this.logiczne(e), 'gora'));
    c.addEventListener('pointercancel', (e) => this.aktywny?.dotyk?.(this.logiczne(e), 'gora'));
    c.addEventListener('contextmenu', (e) => e.preventDefault());   // prawy przycisk przesuwa kamerę
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.aktywny?.kolko?.(this.logiczne(e)); }, { passive: false });
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
    if (this.zmienilSieEkran()) this.przelicz();
    const teraz = performance.now();
    e.krok(0, teraz);
    e.rysuj(this.ctx, this.w, this.h, teraz);
  }

  start(pierwszy: string): void {
    this.idz(pierwszy);
    const klatka = (teraz: number) => {
      const dt = Math.min(100, teraz - this.ostatnia);
      this.ostatnia = teraz;
      if (this.zmienilSieEkran()) this.przelicz();
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
