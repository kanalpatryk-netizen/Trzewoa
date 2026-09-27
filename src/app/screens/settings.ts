import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import { AKCJE, klawisze, nazwaKlawisza, przypisz, przywrocDomyslne, type Akcja } from '../../core/keybinds';
import { ustawienia, ustaw, DOMYSLNE, zapiszUstawienia, jakoscAuto } from '../../core/settings-store';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, tloSadzy, kreska } from '../../render/ink';
import { Tajemnica } from '../../render/tajemnica';
import { ramaRyciny, kartusz, naglowekDzialu } from '../../render/ozdoby';
import { EKRAN_USTAWIEN as U } from '../../nastawy/wyglad/ustawienia';
import { RAMA } from '../../nastawy/wyglad/ozdoby';
import { TEMPO } from '../../nastawy/sterowanie';

type Wiersz =
  | { typ: 'naglowek'; tekst: string }
  | { typ: 'przelacznik'; etykieta: string; opis: string; czytaj: () => boolean; zmien: (v: boolean) => void }
  | { typ: 'suwak'; etykieta: string; opis: string; min: number; max: number; krok: number; czytaj: () => number; zmien: (v: number) => void; format: (v: number) => string }
  | { typ: 'wybor'; etykieta: string; opis: string; opcje: string[]; czytaj: () => string; zmien: (v: string) => void }
  | { typ: 'klawisz'; akcja: Akcja; etykieta: string; opis: string }
  | { typ: 'akcja'; etykieta: string; opis: string; wykonaj: () => void; przycisk?: string };

/** Ustawienia: dźwięk, obraz, świat i pełna lista sterowania z możliwością przypisania. */
export class EkranUstawien implements Ekran {
  nazwa = 'ustawienia';
  private wiersze: Wiersz[] = [];
  private wybrany = 1;
  private przewiniecie = 0;
  private czekamNa: Akcja | null = null;
  private trafienia: { x: number; y: number; w: number; h: number; i: number; strefa?: 'minus' | 'plus' }[] = [];
  private wysokoscListy = 0;
  private dlSuwaka = 86;
  private maxPrzewin = 0;
  /** Położenie każdego wiersza na liście — strzałki trzymają zaznaczenie w widoku. */
  private pozycjeWierszy: { y: number; h: number }[] = [];
  private tajemnica = new Tajemnica();
  private blysk = { i: -1, od: 0 };

  constructor(private app: Kontekst) { this.zbuduj(); }

  wejdz(): void { this.zbuduj(); this.czekamNa = null; }

  private zbuduj(): void {
    const proc = (v: number) => `${Math.round(v * 100)}%`;
    this.wiersze = [
      { typ: 'naglowek', tekst: 'Dźwięk' },
      { typ: 'suwak', etykieta: 'Głośność', opis: 'jedna dla muzyki, skały i gestów', min: 0, max: 1, krok: 0.1, czytaj: () => ustawienia.glosnosc, zmien: (v) => { ustaw('glosnosc', v); this.app.muzyka.glosnosc(v); this.app.dzwiek.odswiezGlosnosc(); this.app.gesty.odswiezGlosnosc(); this.app.gesty.klik(); }, format: proc },
      { typ: 'przelacznik', etykieta: 'Muzyka', opis: 'powolne akordy kamienia i uderzenia w metal', czytaj: () => ustawienia.muzyka, zmien: (v) => { ustaw('muzyka', v); if (v) this.app.muzyka.start(); else this.app.muzyka.stop(); } },
      { typ: 'przelacznik', etykieta: 'Rezonans świata', opis: 'kucie, modlitwa i niski ton zależny od głębokości', czytaj: () => ustawienia.rezonans, zmien: (v) => { ustaw('rezonans', v); if (v) this.app.dzwiek.start(); this.app.dzwiek.odswiezGlosnosc(); } },
      { typ: 'przelacznik', etykieta: 'Dźwięki gestów', opis: 'szkic rozkazu, pauza, ostrzeżenia, karty atlasu', czytaj: () => ustawienia.efekty, zmien: (v) => { ustaw('efekty', v); this.app.gesty.start(); this.app.gesty.odswiezGlosnosc(); if (v) this.app.gesty.klik(); } },

      { typ: 'naglowek', tekst: 'Obraz' },
      { typ: 'suwak', etykieta: 'Wielkość obrazu', opis: 'napisy, ryty i płyta — ponad dopasowanie do ekranu', min: 0.8, max: 1.6, krok: 0.1, czytaj: () => ustawienia.wielkoscUI, zmien: (v) => ustaw('wielkoscUI', Math.round(v * 10) / 10), format: (v) => `${Math.round(v * 100)}%` },
      { typ: 'wybor', etykieta: 'Jakość ryciny', opis: 'ostra — pełna, szybka — połowa, auto — sama tanieje', opcje: ['auto', 'ostra', 'szybka'], czytaj: () => ustawienia.jakosc, zmien: (v) => { jakoscAuto.taniej = false; ustaw('jakosc', v as typeof ustawienia.jakosc); } },
      { typ: 'suwak', etykieta: 'Siła kreskowania', opis: 'ile atramentu wchodzi w skałę', min: 0.75, max: 1.35, krok: 0.05, czytaj: () => ustawienia.kontrast, zmien: (v) => ustaw('kontrast', v), format: (v) => `${Math.round(v * 100)}%` },
      { typ: 'suwak', etykieta: 'Wielkość mieszkańców', opis: 'sylwetki w kaflach', min: 0.7, max: 2.2, krok: 0.1, czytaj: () => ustawienia.wielkoscSylwetek, zmien: (v) => ustaw('wielkoscSylwetek', v), format: (v) => `${v.toFixed(1)}×` },
      { typ: 'przelacznik', etykieta: 'Oddech kamienia', opis: 'powolne falowanie całego rysunku', czytaj: () => ustawienia.oddech, zmien: (v) => ustaw('oddech', v) },
      { typ: 'przelacznik', etykieta: 'Ogranicz ruch', opis: 'wycisza drgania obrazu, dym i wiercenie się sylwetek', czytaj: () => ustawienia.ograniczRuch, zmien: (v) => ustaw('ograniczRuch', v) },
      { typ: 'przelacznik', etykieta: 'Kronika', opis: 'linijki zdarzeń w dolnym marginesie', czytaj: () => ustawienia.kronika, zmien: (v) => ustaw('kronika', v) },
      { typ: 'przelacznik', etykieta: 'Spis ras', opis: 'wstęga warstw — najważniejszy wskaźnik w grze', czytaj: () => ustawienia.spisRas, zmien: (v) => ustaw('spisRas', v) },
      { typ: 'przelacznik', etykieta: 'Skala głębokości', opis: 'karby na prawym marginesie', czytaj: () => ustawienia.skalaGlebokosci, zmien: (v) => ustaw('skalaGlebokosci', v) },

      { typ: 'naglowek', tekst: 'Świat' },
      { typ: 'wybor', etykieta: 'Góra', opis: 'łaskawa wolniej zasypia i daje więcej krwi — dla nowej gry', opcje: ['łaskawa', 'surowa'], czytaj: () => ustawienia.trudnosc, zmien: (v) => ustaw('trudnosc', v as typeof ustawienia.trudnosc) },
      { typ: 'wybor', etykieta: 'Auto-pauza', opis: 'gra sama zatrzymuje czas, gdy trzeba decydować', opcje: ['kryzysy', 'wszystko', 'wyłączona'], czytaj: () => ustawienia.autoPauza, zmien: (v) => ustaw('autoPauza', v as typeof ustawienia.autoPauza) },
      { typ: 'wybor', etykieta: 'Nowe tablice', opis: 'przy pierwszym spotkaniu tablica atlasu otwiera się sama', opcje: ['pokazuj', 'tylko w atlasie'], czytaj: () => ustawienia.tablice, zmien: (v) => ustaw('tablice', v as typeof ustawienia.tablice) },
      { typ: 'suwak', etykieta: 'Tempo czasu', opis: 'ile tików świata przypada na klatkę', min: 1, max: TEMPO.max, krok: 1, czytaj: () => ustawienia.tempo, zmien: (v) => ustaw('tempo', v), format: (v) => `${v}×` },
      { typ: 'przelacznik', etykieta: 'Kamera za życiem', opis: 'sama wraca tam, gdzie jest najgęściej — dopóki jej nie chwycisz', czytaj: () => ustawienia.kameraZaZyciem, zmien: (v) => ustaw('kameraZaZyciem', v) },
      { typ: 'przelacznik', etykieta: 'Automatyczne przybliżanie', opis: 'kamera sama dobiera skalę do wielkości kolonii', czytaj: () => ustawienia.autoZoom, zmien: (v) => ustaw('autoZoom', v) },
      { typ: 'przelacznik', etykieta: 'Autozapis', opis: 'stan góry co minutę do pamięci przeglądarki', czytaj: () => ustawienia.autozapis, zmien: (v) => ustaw('autozapis', v) },

      { typ: 'naglowek', tekst: 'Sterowanie' },
      ...AKCJE.map((a) => ({ typ: 'klawisz' as const, akcja: a.akcja, etykieta: a.nazwa, opis: a.opis })),
      { typ: 'akcja', etykieta: 'Przywróć domyślne klawisze', opis: 'wraca do układu z pierwszego uruchomienia', wykonaj: () => przywrocDomyslne(), przycisk: 'przywróć' },
      { typ: 'akcja', etykieta: 'Przywróć domyślne ustawienia', opis: 'dźwięk, obraz i świat od nowa', wykonaj: () => { Object.assign(ustawienia, DOMYSLNE, { samouczekZrobiony: ustawienia.samouczekZrobiony }); zapiszUstawienia(); }, przycisk: 'przywróć' },

      { typ: 'akcja', etykieta: 'Samouczek od nowa', opis: 'odblokowuje podpowiedź w menu i pozwala przejść wszystko jeszcze raz', wykonaj: () => ustaw('samouczekZrobiony', false), przycisk: 'od nowa' },

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
    this.tajemnica.brzegi(ctx, { x: 0, y: 0, w, h }, 0.5 + 0.5 * Math.sin(teraz * 0.0006));
    const m = Math.max(RAMA.margines.min, Math.min(RAMA.margines.max, w * RAMA.margines.czesc)) + 14;
    const rt = Math.max(U.tytulRozmiar.min, Math.min(U.tytulRozmiar.max, w / 26));
    kartusz(ctx, w / 2, m + rt * 1.15, U.tytul, rt, 1);

    const gora = m + rt * 2.2;
    const dol = h - m - 6;
    this.wysokoscListy = dol - gora;
    const szer = Math.min(U.maxSzerokosc, w - m * 2 - 36);
    const x = (w - szer) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 20, gora - 10, szer + 40, this.wysokoscListy + 16);
    ctx.clip();

    this.trafienia = [];
    this.pozycjeWierszy = [];
    let y = gora - this.przewiniecie;
    const podstawa = Math.max(U.podstawa.min, Math.min(U.podstawa.max, w / 62));
    this.dlSuwaka = szer < 480 ? U.suwakWaski : U.suwak;
    let dzial = 0;

    for (let i = 0; i < this.wiersze.length; i++) {
      const wiersz = this.wiersze[i];
      const linie = wiersz.typ === 'naglowek' ? 1 : this.linieOpisu(ctx, wiersz, szer, podstawa).length;
      const wysokosc = wiersz.typ === 'naglowek' ? podstawa * U.wysokoscNaglowka : podstawa * (U.wysokoscWiersza + (linie - 1) * U.nastepnaLinia);
      this.pozycjeWierszy.push({ y: y + this.przewiniecie - gora, h: wysokosc });
      if (wiersz.typ === 'naglowek') dzial++;
      if (y + wysokosc > gora - 40 && y < dol + 40) this.rysujWiersz(ctx, wiersz, x, y, szer, podstawa, i === this.wybrany, teraz, dzial, i);
      if (wiersz.typ !== 'naglowek') {
        this.trafienia.push({ x, y, w: szer, h: wysokosc, i });
        if (wiersz.typ === 'suwak') {
          this.trafienia.push({ x: x + szer - this.dlSuwaka - 64, y, w: 40, h: wysokosc, i, strefa: 'minus' });
          this.trafienia.push({ x: x + szer - 40, y, w: 40, h: wysokosc, i, strefa: 'plus' });
        }
      }
      y += wysokosc;
    }
    const calkowita = y + this.przewiniecie - gora;
    ctx.restore();
    this.maxPrzewin = Math.max(0, calkowita - this.wysokoscListy + podstawa);
    if (this.przewiniecie > this.maxPrzewin) this.przewiniecie = this.maxPrzewin;

    // pasek przewijania: rysa w kamieniu z romboidalnym uchwytem
    if (calkowita > this.wysokoscListy) {
      const t = this.przewiniecie / (calkowita - this.wysokoscListy);
      const dl = Math.max(40, this.wysokoscListy * (this.wysokoscListy / calkowita));
      const sx = Math.min(x + szer + 26, w - m - 2), sy = gora + t * (this.wysokoscListy - dl);
      ctx.strokeStyle = rgba(BARWA.atrament, U.szynaAlfa);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, gora); ctx.lineTo(sx, gora + this.wysokoscListy); ctx.stroke();
      ctx.strokeStyle = rgba(BARWA.zarBlady, U.uchwytAlfa);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + dl); ctx.stroke();
      ctx.fillStyle = rgba(BARWA.zarBlady, U.rombAlfa);
      ctx.beginPath(); ctx.moveTo(sx, sy + dl / 2 - 5); ctx.lineTo(sx + 4, sy + dl / 2); ctx.lineTo(sx, sy + dl / 2 + 5); ctx.lineTo(sx - 4, sy + dl / 2); ctx.closePath(); ctx.fill();
    }

    const waski = w < U.waskiPonizej;
    ramaRyciny(ctx, w, h, 1, waski ? '' : U.ramaGora, this.czekamNa ? U.czekamNaKlawisz : (waski ? U.ramaDolWaski : U.ramaDol));
  }

  private rysujWiersz(ctx: CanvasRenderingContext2D, wiersz: Wiersz, x: number, y: number, szer: number, podstawa: number, wybrany: boolean, teraz: number, dzial: number, i: number): void {
    if (wiersz.typ === 'naglowek') {
      naglowekDzialu(ctx, wiersz.tekst, x, y + podstawa * 1.75, szer, podstawa * 0.95, 1, 200 + dzial * 13);
      return;
    }
    const srodek = y + podstawa * 1.55;
    const linie = this.linieOpisu(ctx, wiersz, szer, podstawa);
    const wys = podstawa * (3 + (linie.length - 1) * U.nastepnaLinia);
    // kropkowana linia pod wierszem, jak w spisie treści
    ctx.fillStyle = rgba(BARWA.atrament, 0.12);
    for (let dx = 0; dx < szer; dx += 6) ctx.fillRect(x + dx, y + wys - 1, 1.2, 1.2);
    if (wybrany) {
      const g = ctx.createLinearGradient(x - 14, 0, x + szer + 14, 0);
      g.addColorStop(0, `rgba(60,42,30,${U.zaznaczenieOd})`);
      g.addColorStop(1, `rgba(60,42,30,${U.zaznaczenieDo})`);
      ctx.fillStyle = g;
      ctx.fillRect(x - 14, y + 3, szer + 28, wys - podstawa * 0.15);
      // klamry po bokach, jak zaznaczenie rylcem na marginesie
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.75);
      ctx.lineWidth = 1.2;
      const t0 = y + 5, t1 = y + wys - podstawa * 0.15;
      ctx.beginPath();
      ctx.moveTo(x - 6, t0); ctx.lineTo(x - 12, t0); ctx.lineTo(x - 12, t1); ctx.lineTo(x - 6, t1);
      ctx.moveTo(x + szer + 6, t0); ctx.lineTo(x + szer + 12, t0); ctx.lineTo(x + szer + 12, t1); ctx.lineTo(x + szer + 6, t1);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${podstawa}px ${SERIF}`;
    ctx.fillStyle = rgba(wybrany ? BARWA.atramentMocny : BARWA.atrament, 0.95);
    ctx.fillText(wiersz.etykieta, x, y + podstawa * 1.35);
    ctx.font = `italic ${podstawa * U.opisRozmiar}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, U.opisAlfa);
    linie.forEach((l, k) => ctx.fillText(l, x, y + podstawa * (2.45 + k * 0.85)));

    const px = x + szer;
    const swiezy = this.blysk.i === i ? Math.max(0, 1 - (teraz - this.blysk.od) / U.blyskMs) : 0;
    ctx.textBaseline = 'middle';

    if (wiersz.typ === 'przelacznik') {
      // „nie · tak": aktywne słowo w owalu, drugie ledwie widoczne
      const on = wiersz.czytaj();
      ctx.font = `${podstawa * 0.95}px ${SERIF}`;
      ctx.textAlign = 'right';
      const tw = ctx.measureText(U.tak).width, nw = ctx.measureText(U.nie).width;
      const xTak = px, xNie = px - tw - podstawa * 1.3;
      const owal = (cx: number, szerokosc: number) => {
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7 + 0.3 * swiezy);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(cx, srodek, szerokosc / 2 + podstawa * 0.45, podstawa * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      };
      if (on) owal(xTak - tw / 2, tw); else owal(xNie - nw / 2, nw);
      ctx.fillStyle = rgba(on ? BARWA.zarBlady : BARWA.atramentCichy, on ? 1 : 0.35);
      ctx.fillText(U.tak, xTak, srodek);
      ctx.fillStyle = rgba(!on ? BARWA.atramentMocny : BARWA.atramentCichy, !on ? 0.95 : 0.35);
      ctx.fillText(U.nie, xNie, srodek);
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.4);
      ctx.fillText('·', xNie + podstawa * 0.62, srodek);
    } else if (wiersz.typ === 'suwak') {
      // linijka z podziałką: każda kreska to jeden krok, romb to wartość
      const v = wiersz.czytaj();
      const t = (v - wiersz.min) / (wiersz.max - wiersz.min);
      const sw = this.dlSuwaka, sx = px - 32 - sw;
      const kolko = (cx: number, znak: string) => {
        ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, srodek - podstawa * 0.1, podstawa * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center';
        ctx.font = `${podstawa * 0.9}px ${SERIF}`;
        ctx.fillStyle = rgba(BARWA.atrament, 0.8);
        ctx.fillText(znak, cx, srodek - podstawa * 0.12);
      };
      kolko(sx - 18, '−');
      kolko(px - 12, '+');
      const ly = srodek - podstawa * 0.1;
      ctx.strokeStyle = rgba(BARWA.atrament, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + sw, ly);
      const kroki = Math.max(1, Math.round((wiersz.max - wiersz.min) / wiersz.krok));
      const co = kroki > 20 ? Math.ceil(kroki / 10) : 1;
      for (let k = 0; k <= kroki; k += co) {
        const kx = sx + (k / kroki) * sw;
        const dl = k === 0 || k === kroki ? 5 : 3;
        ctx.moveTo(kx, ly - dl); ctx.lineTo(kx, ly + dl);
      }
      ctx.stroke();
      // wypełnienie do wartości — złota kreska
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + sw * t, ly); ctx.stroke();
      const mx = sx + sw * t;
      ctx.fillStyle = rgba(BARWA.zarBlady, 1);
      const r = 5 + 2 * swiezy;
      ctx.beginPath(); ctx.moveTo(mx, ly - r); ctx.lineTo(mx + r * 0.8, ly); ctx.lineTo(mx, ly + r); ctx.lineTo(mx - r * 0.8, ly); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = `${podstawa * 0.74}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.9);
      ctx.fillText(wiersz.format(v), sx + sw / 2, ly + podstawa * 0.95);
    } else if (wiersz.typ === 'wybor') {
      // „‹ wartość ›" — strzałki mówią, że się to przełącza
      ctx.font = `${podstawa * 0.95}px ${SERIF}`;
      ctx.textAlign = 'right';
      const val = wiersz.czytaj();
      const vw = ctx.measureText(val).width;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.7);
      ctx.fillText('›', px, srodek);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
      ctx.fillText(val, px - podstawa * 1.1, srodek);
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.7);
      ctx.fillText('‹', px - podstawa * 1.9 - vw, srodek);
      // kropki: ile opcji i która wybrana
      const n = wiersz.opcje.length, idx = wiersz.opcje.indexOf(val);
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = k === idx ? rgba(BARWA.zarBlady, 0.9) : rgba(BARWA.atramentCichy, 0.35);
        ctx.beginPath(); ctx.arc(px - podstawa * 1.1 - vw / 2 + (k - (n - 1) / 2) * 7, srodek + podstawa * 0.85, k === idx ? 2 : 1.4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (wiersz.typ === 'klawisz') {
      // klawisz jak klawisz: wypukła tabliczka z nazwą
      const czeka = this.czekamNa === wiersz.akcja;
      const tekst = czeka ? '…' : nazwaKlawisza(klawisze[wiersz.akcja]);
      ctx.font = `${podstawa * 0.85}px ${SERIF}`;
      const kw = Math.max(podstawa * 1.8, ctx.measureText(tekst).width + podstawa * 1.1), kh = podstawa * 1.55;
      const kx = px - kw, ky = srodek - kh / 2;
      ctx.fillStyle = czeka ? 'rgba(80,40,20,0.8)' : 'rgba(34,26,22,0.95)';
      ctx.fillRect(kx, ky, kw, kh);
      ctx.strokeStyle = rgba(czeka ? BARWA.zar : BARWA.atrament, czeka ? 0.6 + 0.4 * Math.sin(teraz * 0.008) : 0.55);
      ctx.lineWidth = 1;
      ctx.strokeRect(kx + 0.5, ky + 0.5, kw - 1, kh - 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.moveTo(kx + 1, ky + kh + 1.5); ctx.lineTo(kx + kw + 1, ky + kh + 1.5); ctx.lineTo(kx + kw + 1, ky + 1); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(czeka ? BARWA.zar : BARWA.atramentMocny, 0.95);
      ctx.fillText(tekst, kx + kw / 2, srodek + 1);
    } else if (wiersz.typ === 'akcja' && wiersz.przycisk) {
      // przycisk: słowo w nawiasach rylca, rozjaśnia się po kliknięciu
      ctx.font = `italic ${podstawa * 0.9}px ${SERIF}`;
      ctx.textAlign = 'right';
      const tekst = wiersz.przycisk;
      const bw = ctx.measureText(tekst).width;
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.85 + 0.15 * swiezy);
      ctx.fillText(tekst, px - 10, srodek);
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5 + 0.5 * swiezy);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - bw - 14, srodek - podstawa * 0.6); ctx.lineTo(px - bw - 20, srodek - podstawa * 0.6); ctx.lineTo(px - bw - 20, srodek + podstawa * 0.6); ctx.lineTo(px - bw - 14, srodek + podstawa * 0.6);
      ctx.moveTo(px - 4, srodek - podstawa * 0.6); ctx.lineTo(px + 2, srodek - podstawa * 0.6); ctx.lineTo(px + 2, srodek + podstawa * 0.6); ctx.lineTo(px - 4, srodek + podstawa * 0.6);
      ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
    void kreska;
  }

  /** Ile miejsca po prawej zajmuje kontrolka wiersza — opis nie może w nią wejść. */
  private szerKontrolki(ctx: CanvasRenderingContext2D, wiersz: Wiersz, podstawa: number): number {
    if (wiersz.typ === 'suwak') return this.dlSuwaka + 64;
    if (wiersz.typ === 'przelacznik') return podstawa * U.przelacznikSzer;
    if (wiersz.typ === 'klawisz') return podstawa * U.klawiszSzer;
    ctx.font = `${podstawa * 0.95}px ${SERIF}`;
    if (wiersz.typ === 'wybor') return Math.max(...wiersz.opcje.map((o) => ctx.measureText(o).width)) + podstawa * 2.6;
    if (wiersz.typ === 'akcja' && wiersz.przycisk) return ctx.measureText(wiersz.przycisk).width + 30;
    return 0;
  }

  /** Opis złamany do szerokości obok kontrolki; na szerokim ekranie to prawie zawsze jedna linijka. */
  private linieOpisu(ctx: CanvasRenderingContext2D, wiersz: Wiersz, szer: number, podstawa: number): string[] {
    if (wiersz.typ === 'naglowek') return [];
    const dost = Math.max(80, szer - this.szerKontrolki(ctx, wiersz, podstawa) - 12);
    ctx.font = `italic ${podstawa * U.opisRozmiar}px ${SERIF}`;
    const wynik: string[] = [];
    let biezaca = '';
    for (const slowo of wiersz.opis.split(' ')) {
      const proba = biezaca ? biezaca + ' ' + slowo : slowo;
      if (biezaca && ctx.measureText(proba).width > dost) { wynik.push(biezaca); biezaca = slowo; }
      else biezaca = proba;
    }
    if (biezaca) wynik.push(biezaca);
    return wynik;
  }

  private zmien(i: number, kierunek: number): void {
    const wiersz = this.wiersze[i];
    if (!wiersz) return;
    this.blysk = { i, od: performance.now() };
    this.app.gesty.klik();
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
