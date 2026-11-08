import type { Ekran } from './screen';
import type { Kontekst } from './context';
import { Resonance } from '../core/audio';
import { Muzyka } from '../core/music';
import { Gesty } from '../core/gesty';
import { mikser } from '../core/mikser';
import { akcjaDlaKlawisza } from '../core/keybinds';
import { ustawienia, ustaw, ekran } from '../core/settings-store';
import { licznik } from '../core/wydajnosc';
import { rysujLicznik } from '../render/licznik-wydajnosci';
import { EKRAN } from '../nastawy/ekran';
import { Wstecz, NieGasnij, pelnyEkran } from '../core/android';

/**
 * Pętla i przełącznik ekranów. Trzyma jedno miejsce, w którym dzieje się czas,
 * i rozdziela wejście do tego ekranu, który jest na wierzchu.
 */
export class App implements Kontekst {
  ctx: CanvasRenderingContext2D;
  w = 1; h = 1;
  /** Rozmiar w pikselach CSS i mnożnik, z którego wyszła skala — po nich poznajemy zmianę. */
  private cssW = 0; private cssH = 0; private mnoznik = 1;
  /** Rozdzielczość obrazu (ustawienia → Wydajność) i gęstość pikseli, z którymi policzono płótno. */
  private rozdz = 1; private dpr = 1;
  /** Limit klatek: czas (rAF), od którego wolno narysować następną. */
  private nastepnaKlatka = 0;
  dzwiek = new Resonance();
  muzyka = new Muzyka();
  gesty = new Gesty();
  private ekrany = new Map<string, Ekran>();
  private aktywny: Ekran | null = null;
  private ostatnia = performance.now();
  private dzwiekRuszyl = false;
  /** Android: systemowy „wstecz” trafia do gry, a ekran nie gaśnie w trakcie partii. */
  private wstecz = new Wstecz(() => this.naWstecz());
  private nieGasnij = new NieGasnij();

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
    this.wstecz.uzbroj(nazwa !== 'menu' && nazwa !== 'ladowanie');
    this.nieGasnij.ustaw(nazwa === 'gra' || nazwa === 'samouczek');
  }

  /** „Wstecz” telefonu = Esc: każdy ekran wie, co wtedy zamknąć albo dokąd wrócić. */
  private naWstecz(): void {
    this.aktywny?.klawisz?.(akcjaDlaKlawisza('Escape'), new KeyboardEvent('keydown', { key: 'Escape' }));
    const n = this.aktywny?.nazwa;
    this.wstecz.uzbroj(n !== 'menu' && n !== 'ladowanie');
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
    // wydajność: gra rysuje w części pikseli ekranu, a przeglądarka rozciąga obraz na cały ekran
    const rozdz = rozdzielczoscObrazu();
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
    this.cssW = cssW; this.cssH = cssH; this.rozdz = rozdz; this.dpr = dpr;
    this.w = cssW / ekran.skala;
    this.h = cssH / ekran.skala;
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr * rozdz));
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr * rozdz));
    this.ctx.setTransform(dpr * rozdz * ekran.skala, 0, 0, dpr * rozdz * ekran.skala, 0, 0);
    this.aktywny?.rozmiar?.(this.w, this.h);
  }

  private zmienilSieEkran(): boolean {
    return (innerWidth || 1280) !== this.cssW || (innerHeight || 720) !== this.cssH || (ustawienia.wielkoscUI || 1) !== this.mnoznik
      || rozdzielczoscObrazu() !== this.rozdz || Math.min(EKRAN.maxDpr, window.devicePixelRatio || 1) !== this.dpr;
  }

  /** Zdarzenie wskaźnika w pikselach logicznych — ekrany nie wiedzą o skali. */
  private logiczne<T extends PointerEvent | WheelEvent>(e: T): T {
    const s = ekran.skala;
    if (s === 1) return e;
    const w = e as WheelEvent;
    return {
      clientX: e.clientX / s, clientY: e.clientY / s,
      button: e.button, buttons: e.buttons, shiftKey: e.shiftKey,
      pointerId: (e as PointerEvent).pointerId, pointerType: (e as PointerEvent).pointerType,
      deltaX: w.deltaX, deltaY: w.deltaY, deltaMode: w.deltaMode,
      preventDefault: () => e.preventDefault(),
    } as unknown as T;
  }

  /**
   * Przeglądarka pozwala odpalić dźwięk (i pełny ekran) dopiero po dotknięciu albo klawiszu —
   * łapiemy pierwsze, gdziekolwiek padnie (choćby spacja pomijająca intro).
   */
  private obudzDzwiek(): void {
    if (this.dzwiekRuszyl) { mikser.wznow(); return; }
    this.dzwiekRuszyl = true;
    pelnyEkran();
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
      // F3: licznik wydajności — na każdym ekranie, bez względu na przypisane klawisze
      if (e.key === 'F3') { e.preventDefault(); ustaw('licznikWydajnosci', !ustawienia.licznikWydajnosci); return; }
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
    if (ustawienia.licznikWydajnosci) this.rysujLicznik();
  }

  private rysujLicznik(): void {
    rysujLicznik(this.ctx, {
      plotnoW: this.canvas.width, plotnoH: this.canvas.height, dpr: this.dpr, rozdzielczosc: this.rozdz, limit: ustawienia.limitKlatek,
    });
  }

  start(pierwszy: string): void {
    this.idz(pierwszy);
    const klatka = (teraz: number) => {
      // limit klatek (ustawienia → Wydajność): klatka czeka, aż minie jej czas; pominięta nie liczy świata —
      // następna dostanie cały upływ czasu. Okres liczony od zaplanowanej chwili, nie od ostatniej klatki, więc
      // na monitorze 144 Hz z limitem 60 wychodzi średnio 60, a nie 48.
      const limit = ustawienia.limitKlatek;
      if (limit > 0) {
        if (teraz + 1 < this.nastepnaKlatka) { requestAnimationFrame(klatka); return; }
        const okres = 1000 / limit;
        this.nastepnaKlatka = this.nastepnaKlatka + okres < teraz ? teraz + okres : this.nastepnaKlatka + okres;
      }
      const dt = Math.min(100, teraz - this.ostatnia);
      this.ostatnia = teraz;
      if (this.zmienilSieEkran()) this.przelicz();
      const e = this.aktywny;
      if (e) {
        const t0 = performance.now();
        e.krok(dt, teraz);
        e.rysuj(this.ctx, this.w, this.h, teraz);
        licznik.klatka(teraz, performance.now() - t0);
        if (ustawienia.licznikWydajnosci) this.rysujLicznik();
      }
      requestAnimationFrame(klatka);
    };
    requestAnimationFrame(klatka);
  }
}

/** Ustawiona rozdzielczość obrazu (ułamek pikseli ekranu): 0,5–1. */
function rozdzielczoscObrazu(): number {
  const r = ustawienia.rozdzielczosc;
  return r > 0 && r < 1 ? Math.max(0.5, r) : 1;
}
