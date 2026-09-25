import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import { AKCJE, klawisze, nazwaKlawisza, przypisz, przywrocDomyslne, type Akcja } from '../../core/keybinds';
import { ustawienia, ustaw, DOMYSLNE, zapiszUstawienia } from '../../core/settings-store';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL, tloSadzy, tytulRyty, naciecie, kreska } from '../../render/ink';

type Wiersz =
  | { typ: 'naglowek'; tekst: string }
  | { typ: 'przelacznik'; etykieta: string; opis: string; czytaj: () => boolean; zmien: (v: boolean) => void }
  | { typ: 'suwak'; etykieta: string; opis: string; min: number; max: number; krok: number; czytaj: () => number; zmien: (v: number) => void; format: (v: number) => string }
  | { typ: 'wybor'; etykieta: string; opis: string; opcje: string[]; czytaj: () => string; zmien: (v: string) => void }
  | { typ: 'klawisz'; akcja: Akcja; etykieta: string; opis: string }
  | { typ: 'akcja'; etykieta: string; opis: string; wykonaj: () => void };

/** Ustawienia: dźwięk, obraz, świat i pełna lista sterowania z możliwością przypisania. */
export class EkranUstawien implements Ekran {
  nazwa = 'ustawienia';
  private wiersze: Wiersz[] = [];
  private wybrany = 1;
  private przewiniecie = 0;
  private czekamNa: Akcja | null = null;
  private trafienia: { x: number; y: number; w: number; h: number; i: number; strefa?: 'minus' | 'plus' }[] = [];
  private wysokoscListy = 0;
  private maxPrzewin = 0;
  /** Położenie każdego wiersza na liście — strzałki trzymają zaznaczenie w widoku. */
  private pozycjeWierszy: { y: number; h: number }[] = [];

  constructor(private app: Kontekst) { this.zbuduj(); }

  wejdz(): void { this.zbuduj(); this.czekamNa = null; }

  private zbuduj(): void {
    const proc = (v: number) => `${Math.round(v * 100)}%`;
    this.wiersze = [
      { typ: 'naglowek', tekst: 'Dźwięk' },
      { typ: 'suwak', etykieta: 'Głośność', opis: 'wspólna dla muzyki i rezonansu skały', min: 0, max: 1, krok: 0.1, czytaj: () => ustawienia.glosnosc, zmien: (v) => { ustaw('glosnosc', v); this.app.muzyka.glosnosc(v); this.app.dzwiek.odswiezGlosnosc(); }, format: proc },
      { typ: 'przelacznik', etykieta: 'Muzyka', opis: 'powolne akordy kamienia i uderzenia w metal', czytaj: () => ustawienia.muzyka, zmien: (v) => { ustaw('muzyka', v); if (v) this.app.muzyka.start(); else this.app.muzyka.stop(); } },
      { typ: 'przelacznik', etykieta: 'Rezonans świata', opis: 'kucie, modlitwa i niski ton zależny od głębokości', czytaj: () => ustawienia.rezonans, zmien: (v) => { ustaw('rezonans', v); if (v) this.app.dzwiek.start(); this.app.dzwiek.odswiezGlosnosc(); } },

      { typ: 'naglowek', tekst: 'Obraz' },
      { typ: 'wybor', etykieta: 'Jakość ryciny', opis: 'ostra rysuje w pełnej rozdzielczości, szybka w połowie', opcje: ['auto', 'ostra', 'szybka'], czytaj: () => ustawienia.jakosc, zmien: (v) => ustaw('jakosc', v as typeof ustawienia.jakosc) },
      { typ: 'suwak', etykieta: 'Siła kreskowania', opis: 'ile atramentu wchodzi w skałę', min: 0.75, max: 1.35, krok: 0.05, czytaj: () => ustawienia.kontrast, zmien: (v) => ustaw('kontrast', v), format: (v) => `${Math.round(v * 100)}%` },
      { typ: 'suwak', etykieta: 'Wielkość mieszkańców', opis: 'sylwetki w kaflach', min: 0.7, max: 2.2, krok: 0.1, czytaj: () => ustawienia.wielkoscSylwetek, zmien: (v) => ustaw('wielkoscSylwetek', v), format: (v) => `${v.toFixed(1)}×` },
      { typ: 'przelacznik', etykieta: 'Oddech kamienia', opis: 'powolne falowanie całego rysunku', czytaj: () => ustawienia.oddech, zmien: (v) => ustaw('oddech', v) },
      { typ: 'przelacznik', etykieta: 'Ogranicz ruch', opis: 'wycisza drgania obrazu, dym i wiercenie się sylwetek', czytaj: () => ustawienia.ograniczRuch, zmien: (v) => ustaw('ograniczRuch', v) },
      { typ: 'przelacznik', etykieta: 'Kronika', opis: 'linijki zdarzeń w dolnym marginesie', czytaj: () => ustawienia.kronika, zmien: (v) => ustaw('kronika', v) },
      { typ: 'przelacznik', etykieta: 'Spis ras', opis: 'wstęga warstw — najważniejszy wskaźnik w grze', czytaj: () => ustawienia.spisRas, zmien: (v) => ustaw('spisRas', v) },
      { typ: 'przelacznik', etykieta: 'Skala głębokości', opis: 'karby na prawym marginesie', czytaj: () => ustawienia.skalaGlebokosci, zmien: (v) => ustaw('skalaGlebokosci', v) },

      { typ: 'naglowek', tekst: 'Świat' },
      { typ: 'wybor', etykieta: 'Auto-pauza', opis: 'gra sama zatrzymuje czas, gdy trzeba decydować', opcje: ['kryzysy', 'wszystko', 'wyłączona'], czytaj: () => ustawienia.autoPauza, zmien: (v) => ustaw('autoPauza', v as typeof ustawienia.autoPauza) },
      { typ: 'wybor', etykieta: 'Nowe tablice', opis: 'przy pierwszym spotkaniu tablica atlasu otwiera się sama', opcje: ['pokazuj', 'tylko w atlasie'], czytaj: () => ustawienia.tablice, zmien: (v) => ustaw('tablice', v as typeof ustawienia.tablice) },
      { typ: 'suwak', etykieta: 'Tempo czasu', opis: 'ile tików świata przypada na klatkę', min: 1, max: 8, krok: 1, czytaj: () => ustawienia.tempo, zmien: (v) => ustaw('tempo', v), format: (v) => `${v}×` },
      { typ: 'przelacznik', etykieta: 'Kamera za życiem', opis: 'sama wraca tam, gdzie jest najgęściej — dopóki jej nie chwycisz', czytaj: () => ustawienia.kameraZaZyciem, zmien: (v) => ustaw('kameraZaZyciem', v) },
      { typ: 'przelacznik', etykieta: 'Automatyczne przybliżanie', opis: 'kamera sama dobiera skalę do wielkości kolonii', czytaj: () => ustawienia.autoZoom, zmien: (v) => ustaw('autoZoom', v) },
      { typ: 'przelacznik', etykieta: 'Autozapis', opis: 'stan góry co minutę do pamięci przeglądarki', czytaj: () => ustawienia.autozapis, zmien: (v) => ustaw('autozapis', v) },

      { typ: 'naglowek', tekst: 'Sterowanie' },
      ...AKCJE.map((a) => ({ typ: 'klawisz' as const, akcja: a.akcja, etykieta: a.nazwa, opis: a.opis })),
      { typ: 'akcja', etykieta: 'Przywróć domyślne klawisze', opis: 'wraca do układu z pierwszego uruchomienia', wykonaj: () => przywrocDomyslne() },
      { typ: 'akcja', etykieta: 'Przywróć domyślne ustawienia', opis: 'dźwięk, obraz i świat od nowa', wykonaj: () => { Object.assign(ustawienia, DOMYSLNE, { samouczekZrobiony: ustawienia.samouczekZrobiony }); zapiszUstawienia(); } },

      { typ: 'akcja', etykieta: 'Samouczek od nowa', opis: 'odblokowuje podpowiedź w menu i pozwala przejść wszystko jeszcze raz', wykonaj: () => ustaw('samouczekZrobiony', false) },

      { typ: 'naglowek', tekst: 'Mysz i dotyk' },
      { typ: 'akcja', etykieta: 'Przeciągnięcie', opis: 'przesuwa kamerę; przy wybranym czasowniku maluje', wykonaj: () => {} },
      { typ: 'akcja', etykieta: 'Kółko / szczypanie', opis: 'przybliża i oddala', wykonaj: () => {} },
      { typ: 'akcja', etykieta: 'Dotknięcie rytu', opis: 'wybiera czasownik; drugie dotknięcie go odkłada i puszcza czas', wykonaj: () => {} },
      { typ: 'akcja', etykieta: 'W pauzie', opis: 'rozkazy czekają jako szkice; dotknięcie szkicu bez rytu w ręku go skreśla', wykonaj: () => {} },
      { typ: 'akcja', etykieta: 'Klepsydra', opis: 'dotknięcie klepsydry nad płytą zatrzymuje i puszcza czas', wykonaj: () => {} },
      { typ: 'akcja', etykieta: 'Dotknięcie stworzenia', opis: 'przy Szepcie otwiera kartę, przy Skazie zmienia krew rasy', wykonaj: () => {} },
    ];
  }

  krok(): void { /* bez własnego czasu */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    tloSadzy(ctx, w, h, teraz);
    tytulRyty(ctx, 'USTAWIENIA', w / 2, h * 0.1, Math.max(26, Math.min(48, w / 22)), 1);
    naciecie(ctx, w / 2, h * 0.125, Math.min(420, w * 0.42), 0.3);

    const gora = h * 0.17;
    const dol = h * 0.92;
    this.wysokoscListy = dol - gora;
    const szer = Math.min(880, w * 0.86);
    const x = (w - szer) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 20, gora - 10, szer + 40, this.wysokoscListy + 20);
    ctx.clip();

    this.trafienia = [];
    this.pozycjeWierszy = [];
    let y = gora - this.przewiniecie;
    const podstawa = Math.max(15, Math.min(19, w / 62));

    for (let i = 0; i < this.wiersze.length; i++) {
      const wiersz = this.wiersze[i];
      const wysokosc = wiersz.typ === 'naglowek' ? podstawa * 3.1 : podstawa * 3.05;
      this.pozycjeWierszy.push({ y: y + this.przewiniecie - gora, h: wysokosc });
      if (y + wysokosc > gora - 40 && y < dol + 40) this.rysujWiersz(ctx, wiersz, x, y, szer, podstawa, i === this.wybrany, teraz);
      if (wiersz.typ !== 'naglowek') {
        this.trafienia.push({ x, y, w: szer, h: wysokosc, i });
        if (wiersz.typ === 'suwak') {
          this.trafienia.push({ x: x + szer - 96, y, w: 40, h: wysokosc, i, strefa: 'minus' });
          this.trafienia.push({ x: x + szer - 40, y, w: 40, h: wysokosc, i, strefa: 'plus' });
        }
      }
      y += wysokosc;
    }
    const calkowita = y + this.przewiniecie - gora;
    ctx.restore();
    this.maxPrzewin = Math.max(0, calkowita - this.wysokoscListy + podstawa);
    if (this.przewiniecie > this.maxPrzewin) this.przewiniecie = this.maxPrzewin;

    // pasek przewijania jako rysa w kamieniu
    if (calkowita > this.wysokoscListy) {
      const t = this.przewiniecie / (calkowita - this.wysokoscListy);
      const dl = Math.max(40, this.wysokoscListy * (this.wysokoscListy / calkowita));
      ctx.strokeStyle = rgba(BARWA.atrament, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + szer + 26, gora + t * (this.wysokoscListy - dl));
      ctx.lineTo(x + szer + 26, gora + t * (this.wysokoscListy - dl) + dl);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(14, w / 86)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5);
    ctx.fillText(this.czekamNa ? 'naciśnij klawisz, który ma to robić — esc anuluje' : 'P albo esc wraca do menu · kółko przewija', w / 2, h * 0.965);
  }

  private rysujWiersz(ctx: CanvasRenderingContext2D, wiersz: Wiersz, x: number, y: number, szer: number, podstawa: number, wybrany: boolean, teraz: number): void {
    if (wiersz.typ === 'naglowek') {
      ctx.textAlign = 'left';
      ctx.font = `600 ${podstawa * 1.0}px ${SERIF_TYTUL}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
      ctx.fillText(wiersz.tekst.toUpperCase(), x, y + podstawa * 2);
      ctx.strokeStyle = rgba(BARWA.atrament, 0.22);
      ctx.lineWidth = 1;
      kreska(ctx, x + ctx.measureText(wiersz.tekst.toUpperCase()).width + 16, y + podstawa * 1.7, x + szer, y + podstawa * 1.7, 0.7, 20);
      return;
    }

    if (wybrany) {
      ctx.fillStyle = rgba('#1c1513', 0.75);
      ctx.fillRect(x - 12, y + 2, szer + 24, podstawa * 2.9);
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 12, y + 2, szer + 24, podstawa * 2.9);
    }

    ctx.textAlign = 'left';
    ctx.font = `${podstawa}px ${SERIF}`;
    ctx.fillStyle = rgba(wybrany ? BARWA.atramentMocny : BARWA.atrament, 0.95);
    ctx.fillText(wiersz.etykieta, x, y + podstawa * 1.35);
    ctx.font = `italic ${podstawa * 0.72}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.72);
    ctx.fillText(wiersz.opis, x, y + podstawa * 2.45);

    ctx.textAlign = 'right';
    ctx.font = `${podstawa}px ${SERIF}`;
    const px = x + szer;

    if (wiersz.typ === 'przelacznik') {
      const on = wiersz.czytaj();
      ctx.fillStyle = rgba(on ? BARWA.zarBlady : BARWA.atramentCichy, on ? 0.95 : 0.6);
      ctx.fillText(on ? 'tak' : 'nie', px, y + podstawa * 1.8);
    } else if (wiersz.typ === 'suwak') {
      const v = wiersz.czytaj();
      const t = (v - wiersz.min) / (wiersz.max - wiersz.min);
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
      ctx.fillText('–', px - 96, y + podstawa * 1.8);
      ctx.fillText('+', px - 6, y + podstawa * 1.8);
      const sx = px - 84, sw = 68;
      ctx.strokeStyle = rgba(BARWA.atrament, 0.35);
      ctx.lineWidth = 1;
      kreska(ctx, sx, y + podstawa * 1.55, sx + sw, y + podstawa * 1.55, 0.6, 16);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.9);
      ctx.beginPath();
      ctx.arc(sx + sw * t, y + podstawa * 1.55, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = `${podstawa * 0.78}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.85);
      ctx.fillText(wiersz.format(v), sx + sw / 2, y + podstawa * 2.6);
    } else if (wiersz.typ === 'wybor') {
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.9);
      ctx.fillText(wiersz.czytaj(), px, y + podstawa * 1.8);
    } else if (wiersz.typ === 'klawisz') {
      const czeka = this.czekamNa === wiersz.akcja;
      ctx.fillStyle = rgba(czeka ? BARWA.zar : BARWA.atramentMocny, czeka ? 0.75 + 0.25 * Math.sin(teraz * 0.008) : 0.9);
      ctx.fillText(czeka ? '…' : nazwaKlawisza(klawisze[wiersz.akcja]), px, y + podstawa * 1.8);
    }
  }

  private zmien(i: number, kierunek: number): void {
    const wiersz = this.wiersze[i];
    if (!wiersz) return;
    if (wiersz.typ === 'przelacznik') wiersz.zmien(!wiersz.czytaj());
    else if (wiersz.typ === 'suwak') {
      const v = Math.min(wiersz.max, Math.max(wiersz.min, +(wiersz.czytaj() + kierunek * wiersz.krok).toFixed(3)));
      wiersz.zmien(v);
    } else if (wiersz.typ === 'wybor') {
      const idx = wiersz.opcje.indexOf(wiersz.czytaj());
      wiersz.zmien(wiersz.opcje[(idx + wiersz.opcje.length + kierunek) % wiersz.opcje.length]);
    } else if (wiersz.typ === 'klawisz') this.czekamNa = wiersz.akcja;
    else if (wiersz.typ === 'akcja') { wiersz.wykonaj(); this.zbuduj(); }
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (faza !== 'dol') return;
    const traf = this.trafienia.filter((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (!traf.length) return;
    const strefowy = traf.find((t) => t.strefa);
    const cel = strefowy ?? traf[0];
    this.wybrany = cel.i;
    this.zmien(cel.i, cel.strefa === 'minus' ? -1 : 1);
  }

  kolko(e: WheelEvent): void {
    this.przewiniecie = Math.max(0, Math.min(this.maxPrzewin, this.przewiniecie + e.deltaY * 0.6));
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (this.czekamNa) {
      e.preventDefault();
      if (e.key !== 'Escape') przypisz(this.czekamNa, e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.czekamNa = null;
      return;
    }
    if (e.key === 'Escape' || akcja === 'menu') { this.app.idz('menu'); return; }
    if (e.key === 'ArrowDown') { this.przesun(1); return; }
    if (e.key === 'ArrowUp') { this.przesun(-1); return; }
    if (e.key === 'ArrowRight') { this.zmien(this.wybrany, 1); return; }
    if (e.key === 'ArrowLeft') { this.zmien(this.wybrany, -1); return; }
    if (e.key === 'Enter' || e.key === ' ') { this.zmien(this.wybrany, 1); return; }
  }

  private przesun(kierunek: number): void {
    let i = this.wybrany;
    for (let k = 0; k < this.wiersze.length; k++) {
      i = (i + kierunek + this.wiersze.length) % this.wiersze.length;
      if (this.wiersze[i].typ !== 'naglowek') break;
    }
    this.wybrany = i;
    // trzymaj zaznaczenie w widoku — według prawdziwych wysokości wierszy z ostatniej klatki
    const poz = this.pozycjeWierszy[i];
    if (!poz) return;
    if (poz.y < this.przewiniecie) this.przewiniecie = Math.max(0, poz.y - 20);
    else if (poz.y + poz.h > this.przewiniecie + this.wysokoscListy) {
      this.przewiniecie = Math.min(this.maxPrzewin, poz.y + poz.h - this.wysokoscListy + 20);
    }
  }
}
