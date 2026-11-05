import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import { przywrocDomyslne, type Akcja } from '../../core/keybinds';
import { ustawienia, ustaw, DOMYSLNE, zapiszUstawienia } from '../../core/settings-store';
import { rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL } from '../../render/ink';
import { ozdobnik, wygladz } from '../../render/ozdobnik';
import { EKRAN_USTAWIEN as U } from '../../nastawy/wyglad/ustawienia';
import { pelnyEkran, wyjdzZPelnegoEkranu } from '../../core/android';

type Wiersz =
  | { typ: 'przelacznik'; etykieta: string; czytaj: () => boolean; zmien: (v: boolean) => void }
  | { typ: 'suwak'; etykieta: string; min: number; max: number; krok: number; czytaj: () => number; zmien: (v: number) => void }
  | { typ: 'wybor'; etykieta: string; opcje: string[]; czytaj: () => string; zmien: (v: string) => void }
  | { typ: 'akcja'; etykieta: string; wykonaj: () => void };

type Ikona = 'dzwiek' | 'obraz' | 'rozgrywka' | 'inne';
interface Kategoria { nazwa: string; ikona: Ikona; wiersze: Wiersz[]; }
interface Prostokat { x: number; y: number; w: number; h: number; }

const wSrodku = (p: Prostokat, x: number, y: number): boolean => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

/** Ikonka kategorii — kreska jak ozdobniki menu; (cx, cy) środek, s — połowa boku. */
function rysujIkone(ctx: CanvasRenderingContext2D, ikona: Ikona, cx: number, cy: number, s: number, barwa: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = barwa; ctx.fillStyle = barwa;
  ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (ikona === 'dzwiek') {
    // głośnik i dwie fale
    ctx.moveTo(-0.85, -0.28); ctx.lineTo(-0.45, -0.28); ctx.lineTo(0, -0.72); ctx.lineTo(0, 0.72);
    ctx.lineTo(-0.45, 0.28); ctx.lineTo(-0.85, 0.28); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0.02, 0, 0.42, -0.75, 0.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(0.02, 0, 0.75, -0.8, 0.8); ctx.stroke();
  } else if (ikona === 'obraz') {
    // oko
    ctx.moveTo(-0.95, 0); ctx.quadraticCurveTo(0, -0.95, 0.95, 0); ctx.quadraticCurveTo(0, 0.95, -0.95, 0);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (ikona === 'rozgrywka') {
    // klepsydra
    ctx.moveTo(-0.6, -0.88); ctx.lineTo(0.6, -0.88); ctx.moveTo(-0.6, 0.88); ctx.lineTo(0.6, 0.88);
    ctx.moveTo(-0.45, -0.88); ctx.bezierCurveTo(-0.45, -0.3, -0.08, -0.15, -0.08, 0); ctx.bezierCurveTo(-0.08, 0.15, -0.45, 0.3, -0.45, 0.88);
    ctx.moveTo(0.45, -0.88); ctx.bezierCurveTo(0.45, -0.3, 0.08, -0.15, 0.08, 0); ctx.bezierCurveTo(0.08, 0.15, 0.45, 0.3, 0.45, 0.88);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.3, 0.82); ctx.quadraticCurveTo(0, 0.4, 0.3, 0.82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.22, -0.55); ctx.lineTo(0.22, -0.55); ctx.lineTo(0, -0.3); ctx.closePath(); ctx.fill();
  } else {
    // koło zębate
    const zeby = 8;
    for (let k = 0; k < zeby * 2; k++) {
      const a0 = (k / (zeby * 2)) * Math.PI * 2, a1 = ((k + 1) / (zeby * 2)) * Math.PI * 2;
      const r = k % 2 === 0 ? 0.88 : 0.66;
      if (k === 0) ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r); else ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.27, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Ustawienia w stylu menu (tylko komputer — bez układu pod telefon): czarne tło, kategorie jako ikonki (po najechaniu wysuwa się nazwa),
 * w każdej kategorii najwyżej 5 ustawień. Reszta dawnych ustawień ma stałe wartości domyślne
 * (settings-store.ts — STALE).
 */
export class EkranUstawien implements Ekran {
  nazwa = 'ustawienia';
  private kategorie: Kategoria[] = [];
  private kat = 0;
  private wybrany = 0;
  private najechanaIkona = -1;
  /** Wysunięcie nazwy każdej ikonki (0..1) — dąży do 1 pod myszą. */
  private wysuw: number[] = [];
  private nazwaKlawiszemOd = -1e9;
  private ostatniaKlatka = 0;
  private wejscieOd = 0;
  private blysk = { i: -1, od: -1e9 };
  private gotoweOd = { i: -1, od: -1e9 };
  private trafIkon: Prostokat[] = [];
  private trafWierszy: Prostokat[] = [];
  private trafSuwakow: (Prostokat | null)[] = [];
  private wstecz: Prostokat | null = null;
  private ciagnie: number | null = null;

  constructor(private app: Kontekst) { this.zbuduj(); }

  wejdz(): void {
    this.zbuduj();
    this.wybrany = 0;
    this.ciagnie = null;
    this.wejscieOd = performance.now();
  }

  private odswiezDzwiek(): void {
    this.app.muzyka.glosnosc(ustawienia.glosnosc);
    this.app.dzwiek.odswiezGlosnosc();
    this.app.gesty.odswiezGlosnosc();
  }

  private zbuduj(): void {
    this.kategorie = [
      {
        nazwa: 'Dźwięk', ikona: 'dzwiek', wiersze: [
          { typ: 'suwak', etykieta: 'Głośność', min: 0, max: 1, krok: 0.1, czytaj: () => ustawienia.glosnosc, zmien: (v) => { ustaw('glosnosc', v); this.odswiezDzwiek(); } },
          { typ: 'przelacznik', etykieta: 'Muzyka', czytaj: () => ustawienia.muzyka, zmien: (v) => { ustaw('muzyka', v); if (v) this.app.muzyka.start(); else this.app.muzyka.stop(); } },
          // jeden przełącznik na dźwięki świata (kucie, modlitwa) i gestów (szkic, pauza, ostrzeżenia)
          { typ: 'przelacznik', etykieta: 'Odgłosy', czytaj: () => ustawienia.rezonans || ustawienia.efekty, zmien: (v) => {
            ustaw('rezonans', v); ustaw('efekty', v);
            if (v) { this.app.dzwiek.start(); this.app.gesty.start(); }
            this.odswiezDzwiek();
          } },
        ],
      },
      {
        nazwa: 'Obraz', ikona: 'obraz', wiersze: [
          { typ: 'przelacznik', etykieta: 'Pełny ekran', czytaj: () => ustawienia.pelnyEkran, zmien: (v) => { ustaw('pelnyEkran', v); if (v) pelnyEkran(); else wyjdzZPelnegoEkranu(); } },
          { typ: 'suwak', etykieta: 'Wielkość obrazu', min: 0.8, max: 1.6, krok: 0.1, czytaj: () => ustawienia.wielkoscUI, zmien: (v) => ustaw('wielkoscUI', Math.round(v * 10) / 10) },
          { typ: 'suwak', etykieta: 'Jasność', min: 1, max: 1.8, krok: 0.05, czytaj: () => ustawienia.jasnosc, zmien: (v) => ustaw('jasnosc', v) },
          { typ: 'przelacznik', etykieta: 'Ogranicz ruch', czytaj: () => ustawienia.ograniczRuch, zmien: (v) => ustaw('ograniczRuch', v) },
        ],
      },
      {
        nazwa: 'Rozgrywka', ikona: 'rozgrywka', wiersze: [
          { typ: 'wybor', etykieta: 'Auto-pauza', opcje: ['kryzysy', 'wszystko', 'wyłączona'], czytaj: () => ustawienia.autoPauza, zmien: (v) => ustaw('autoPauza', v as typeof ustawienia.autoPauza) },
          { typ: 'przelacznik', etykieta: 'Kamera za ludem', czytaj: () => ustawienia.kameraZaZyciem, zmien: (v) => ustaw('kameraZaZyciem', v) },
          { typ: 'przelacznik', etykieta: 'Kamera do wydarzeń', czytaj: () => ustawienia.kameraDoWydarzen, zmien: (v) => ustaw('kameraDoWydarzen', v) },
          { typ: 'przelacznik', etykieta: 'Autozapis', czytaj: () => ustawienia.autozapis, zmien: (v) => ustaw('autozapis', v) },
        ],
      },
      {
        nazwa: 'Inne', ikona: 'inne', wiersze: [
          { typ: 'akcja', etykieta: 'Samouczek od nowa', wykonaj: () => ustaw('samouczekZrobiony', false) },
          { typ: 'akcja', etykieta: 'Przywróć domyślne', wykonaj: () => {
            const zrobiony = ustawienia.samouczekZrobiony;
            Object.assign(ustawienia, DOMYSLNE, { samouczekZrobiony: zrobiony });
            zapiszUstawienia();
            przywrocDomyslne();
            if (ustawienia.muzyka) this.app.muzyka.start();
            this.odswiezDzwiek();
          } },
          { typ: 'przelacznik', etykieta: 'Tryb deweloperski', czytaj: () => ustawienia.trybDeweloperski, zmien: (v) => ustaw('trybDeweloperski', v) },
        ],
      },
    ];
    this.wysuw = this.kategorie.map((_, i) => this.wysuw[i] ?? 0);
  }

  private get wiersze(): Wiersz[] { return this.kategorie[this.kat].wiersze; }

  krok(): void { /* bez własnego czasu */ }

  rysuj(ctx: CanvasRenderingContext2D, sz: number, h: number, teraz: number): void {
    const dt = Math.min(100, teraz - (this.ostatniaKlatka || teraz));
    this.ostatniaKlatka = teraz;
    const wejscie = wygladz((teraz - this.wejscieOd) / U.wejscieMs);
    ctx.save();
    ctx.fillStyle = U.tlo;
    ctx.fillRect(0, 0, sz, h);
    ctx.globalAlpha = wejscie;
    ctx.textBaseline = 'alphabetic';

    const r = Math.max(U.rozmiarMin, Math.min(U.rozmiarMax, h * U.rozmiar));
    const m = Math.max(14, h * 0.04);

    // ---- tytuł z ozdobnikami, jak pozycja menu
    const rt = Math.max(U.tytulMin, Math.min(U.tytulMax, h * U.tytulRozmiar, sz / 9));
    const yt = Math.max(m + rt * 0.9, h * U.tytulY);
    ctx.font = `600 ${rt}px ${SERIF_TYTUL}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = U.tytulBarwa;
    ctx.fillText(U.tytul, sz / 2, yt);
    const tw = ctx.measureText(U.tytul).width;
    ozdobnik(ctx, sz / 2 - tw / 2 - rt * 0.3, yt - rt * 0.3, rt * 0.95, -1, U.ozdobnik, 1);
    ozdobnik(ctx, sz / 2 + tw / 2 + rt * 0.3, yt - rt * 0.3, rt * 0.95, 1, U.ozdobnik, 1);

    // ---- powrót do menu
    ctx.font = `italic ${Math.max(15, r * 0.75)}px ${SERIF}`;
    ctx.textAlign = 'left';
    const wsW = ctx.measureText(U.wstecz).width;
    ctx.fillStyle = rgba(U.napis, 0.75);
    ctx.fillText(U.wstecz, m, m + r * 0.9);
    this.wstecz = { x: m - 10, y: m - 8, w: wsW + 20, h: r * 1.6 + 8 };

    // ---- lista
    const cw = Math.min(r * U.szerokosc, sz * U.szerokoscMaxCzesc);
    const x0 = sz / 2 - cw / 2;
    const ikS = r * U.ikonaRozmiar;
    const n = this.kategorie.length;
    const yNaglowka = Math.max(h * U.gora, yt + rt * 1.2);
    // nagłówek kategorii
    const kat = this.kategorie[this.kat];
    ctx.font = `${r * 1.15}px ${SERIF_TYTUL}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = rgba(U.tytulBarwa, 0.9);
    ctx.fillText(kat.nazwa, sz / 2, yNaglowka);
    ctx.strokeStyle = rgba(U.ozdobnik, 0.6); ctx.lineWidth = 1;
    const kw = ctx.measureText(kat.nazwa).width;
    ctx.beginPath();
    ctx.moveTo(x0, yNaglowka - r * 0.35); ctx.lineTo(sz / 2 - kw / 2 - r * 0.8, yNaglowka - r * 0.35);
    ctx.moveTo(sz / 2 + kw / 2 + r * 0.8, yNaglowka - r * 0.35); ctx.lineTo(x0 + cw, yNaglowka - r * 0.35);
    ctx.stroke();

    const krokW = r * U.odstep;
    const y0 = yNaglowka + r * 2.4;
    this.trafWierszy = [];
    this.trafSuwakow = [];
    for (let i = 0; i < this.wiersze.length; i++) {
      const y = y0 + i * krokW;
      this.rysujWiersz(ctx, this.wiersze[i], i, x0, y, cw, r, teraz);
      this.trafWierszy.push({ x: x0 - r * 1.5, y: y - krokW * 0.6, w: cw + r * 3, h: krokW });
    }

    // ikonki w kolumnie po lewej, na wysokości listy; nazwa wysuwa się w lewo
    this.trafIkon = [];
    {
      const krok = ikS * U.ikonaOdstep;
      const xi = x0 - r * U.ikonaOdListy - ikS / 2;
      const srodek = yNaglowka + (y0 + (this.wiersze.length - 1) * krokW - yNaglowka) / 2;
      const yStart = Math.max(yNaglowka - r * 0.4, srodek - ((n - 1) * krok) / 2);
      for (let i = 0; i < n; i++) {
        const cy = yStart + i * krok;
        this.trafIkon.push({ x: xi - krok / 2, y: cy - krok / 2, w: krok, h: krok });
      }
    }
    for (let i = 0; i < n; i++) {
      const t = this.trafIkon[i];
      const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
      const wybrana = i === this.kat, najechana = i === this.najechanaIkona;
      const cel = najechana || (wybrana && teraz - this.nazwaKlawiszemOd < U.nazwaPoKlawiszuMs) ? 1 : 0;
      this.wysuw[i] += (cel - this.wysuw[i]) * Math.min(1, dt / U.wysuwMs * 2.2);
      if (Math.abs(cel - this.wysuw[i]) < 0.01) this.wysuw[i] = cel;
      const barwa = wybrana ? U.ikonaWybrana : najechana ? U.ikonaNajechana : U.ikona;
      if (wybrana) {
        ctx.save();
        ctx.shadowColor = `rgba(${U.poswiata},0.6)`; ctx.shadowBlur = r * 0.6;
        rysujIkone(ctx, this.kategorie[i].ikona, cx, cy, ikS / 2, barwa);
        ctx.restore();
        // kreska obok wybranej
        ctx.strokeStyle = rgba(U.ozdobnikWybrany, 0.8); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx + ikS * 0.78, cy - ikS * 0.35); ctx.lineTo(cx + ikS * 0.78, cy + ikS * 0.35);
        ctx.stroke();
      } else rysujIkone(ctx, this.kategorie[i].ikona, cx, cy, ikS / 2, barwa);
      // wysuwana nazwa kategorii
      const a = wygladz(this.wysuw[i]);
      if (a > 0.01) {
        ctx.save();
        ctx.globalAlpha *= a * 0.85;
        ctx.font = `italic ${r * 0.8}px ${SERIF}`;
        ctx.fillStyle = U.napisWybrany;
        ctx.textAlign = 'right';
        ctx.fillText(this.kategorie[i].nazwa, cx - ikS * 0.7 - r * (0.1 + 0.6 * a), cy + r * 0.28);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private rysujWiersz(ctx: CanvasRenderingContext2D, wiersz: Wiersz, i: number, x0: number, y: number, cw: number, r: number, teraz: number): void {
    const wybrany = i === this.wybrany;
    const swiezy = this.blysk.i === i ? Math.max(0, 1 - (teraz - this.blysk.od) / U.blyskMs) : 0;
    ctx.save();
    ctx.font = `${r}px ${SERIF}`;
    ctx.textAlign = 'left';
    if (wybrany) { ctx.shadowColor = `rgba(${U.poswiata},0.75)`; ctx.shadowBlur = r * 0.6; }
    ctx.fillStyle = wybrany ? U.napisWybrany : U.napis;
    ctx.fillText(wiersz.etykieta, x0, y);
    ctx.restore();
    if (wybrany) ozdobnik(ctx, x0 - r * U.ozdobnikOdstep, y - r * 0.3, r * U.ozdobnikSzer, -1, U.ozdobnikWybrany, 1);

    const px = x0 + cw;
    ctx.save();
    ctx.font = `${r * 0.92}px ${SERIF}`;
    ctx.textAlign = 'right';
    const jasna = (a: number) => rgba(U.wartosc, Math.min(1, a + 0.3 * swiezy));
    let suwak: Prostokat | null = null;
    if (wiersz.typ === 'przelacznik') {
      const on = wiersz.czytaj();
      const tw = ctx.measureText(U.tak).width;
      ctx.fillStyle = on ? jasna(1) : U.wartoscCicha;
      ctx.fillText(U.tak, px, y);
      ctx.fillStyle = U.wartoscCicha;
      ctx.fillText('·', px - tw - r * 0.35, y);
      ctx.fillStyle = on ? U.wartoscCicha : jasna(1);
      ctx.fillText(U.nie, px - tw - r * 0.8, y);
    } else if (wiersz.typ === 'suwak') {
      const v = wiersz.czytaj();
      const t = (v - wiersz.min) / (wiersz.max - wiersz.min);
      ctx.fillStyle = jasna(1);
      ctx.fillText(`${Math.round(v * 100)}%`, px, y);
      // linijka krótsza, gdy długa etykieta (np. „Wielkość obrazu”) zostawia mniej miejsca
      ctx.font = `${r}px ${SERIF}`;
      const wolne = cw - ctx.measureText(wiersz.etykieta).width - r * (U.suwakLiczba + 1.2);
      ctx.font = `${r * 0.92}px ${SERIF}`;
      const dl = Math.max(r * 2, Math.min(r * U.suwakDl, wolne)), sx = px - r * U.suwakLiczba - dl, ly = y - r * 0.3;
      ctx.strokeStyle = U.wartoscCicha; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + dl, ly); ctx.stroke();
      ctx.strokeStyle = rgba(U.wartosc, 0.85); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + dl * t, ly); ctx.stroke();
      const mx = sx + dl * t, rr = r * 0.24 * (1 + 0.3 * swiezy);
      ctx.fillStyle = U.napisWybrany;
      ctx.beginPath(); ctx.moveTo(mx, ly - rr); ctx.lineTo(mx + rr * 0.75, ly); ctx.lineTo(mx, ly + rr); ctx.lineTo(mx - rr * 0.75, ly); ctx.closePath(); ctx.fill();
      suwak = { x: sx - r * 0.4, y: ly - r * 0.7, w: dl + r * 0.8, h: r * 1.4 };
    } else if (wiersz.typ === 'wybor') {
      const val = wiersz.czytaj();
      ctx.fillStyle = U.wartoscCicha;
      ctx.fillText('›', px, y);
      ctx.fillStyle = jasna(1);
      ctx.fillText(val, px - r * 0.9, y);
      const vw = ctx.measureText(val).width;
      ctx.fillStyle = U.wartoscCicha;
      ctx.fillText('‹', px - r * 1.8 - vw, y);
    } else {
      const gotowe = this.gotoweOd.i === i && teraz - this.gotoweOd.od < U.gotoweMs;
      ctx.font = `italic ${r * 0.85}px ${SERIF}`;
      ctx.fillStyle = gotowe ? rgba(U.wartosc, Math.min(1, (U.gotoweMs - (teraz - this.gotoweOd.od)) / 400)) : U.wartoscCicha;
      ctx.fillText(gotowe ? U.gotowe : '›', px, y);
    }
    ctx.restore();
    this.trafSuwakow[i] = suwak;
  }

  private zmien(i: number, kierunek: number): void {
    const wiersz = this.wiersze[i];
    if (!wiersz) return;
    this.blysk = { i, od: performance.now() };
    this.app.gesty.klik();
    if (wiersz.typ === 'przelacznik') wiersz.zmien(!wiersz.czytaj());
    else if (wiersz.typ === 'suwak') {
      wiersz.zmien(Math.min(wiersz.max, Math.max(wiersz.min, +(wiersz.czytaj() + kierunek * wiersz.krok).toFixed(3))));
    } else if (wiersz.typ === 'wybor') {
      const idx = wiersz.opcje.indexOf(wiersz.czytaj());
      wiersz.zmien(wiersz.opcje[(idx + wiersz.opcje.length + kierunek) % wiersz.opcje.length]);
    } else { wiersz.wykonaj(); this.gotoweOd = { i, od: performance.now() }; }
  }

  /** Suwak: wartość z położenia myszy na linijce (zaokrąglona do kroku). */
  private ustawSuwak(i: number, x: number): void {
    const wiersz = this.wiersze[i], t = this.trafSuwakow[i];
    if (!wiersz || wiersz.typ !== 'suwak' || !t) return;
    const r = t.h / 1.4;
    const u = Math.max(0, Math.min(1, (x - (t.x + r * 0.4)) / (t.w - r * 0.8)));
    const v = +(wiersz.min + Math.round((u * (wiersz.max - wiersz.min)) / wiersz.krok) * wiersz.krok).toFixed(3);
    if (v !== wiersz.czytaj()) { wiersz.zmien(v); this.blysk = { i, od: performance.now() }; }
  }

  private zmienKategorie(i: number, klawiszem = false): void {
    const n = this.kategorie.length;
    const nowa = ((i % n) + n) % n;
    if (nowa !== this.kat) this.app.gesty.klik();
    this.kat = nowa;
    this.wybrany = 0;
    if (klawiszem) this.nazwaKlawiszemOd = performance.now();
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const x = e.clientX, y = e.clientY;
    if (faza === 'gora') { this.ciagnie = null; return; }
    if (faza === 'ruch') {
      if (this.ciagnie !== null) { this.ustawSuwak(this.ciagnie, x); return; }
      this.najechanaIkona = this.trafIkon.findIndex((t) => wSrodku(t, x, y));
      const wi = this.trafWierszy.findIndex((t) => wSrodku(t, x, y));
      if (wi >= 0) this.wybrany = wi;
      return;
    }
    // dol
    if (this.wstecz && wSrodku(this.wstecz, x, y)) { this.app.gesty.klik(); this.app.idz('menu'); return; }
    const ik = this.trafIkon.findIndex((t) => wSrodku(t, x, y));
    if (ik >= 0) { this.najechanaIkona = ik; this.zmienKategorie(ik); return; }
    const su = this.trafSuwakow.findIndex((t) => t && wSrodku(t, x, y));
    if (su >= 0) { this.wybrany = su; this.ciagnie = su; this.app.gesty.klik(); this.ustawSuwak(su, x); return; }
    const wi = this.trafWierszy.findIndex((t) => wSrodku(t, x, y));
    if (wi >= 0) {
      this.wybrany = wi;
      // suwak poza linijką: lewa połowa wiersza zmniejsza, prawa zwiększa
      const t = this.trafWierszy[wi];
      this.zmien(wi, this.wiersze[wi].typ === 'suwak' && x < t.x + t.w / 2 ? -1 : 1);
    }
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (e.key === 'Escape' || akcja === 'menu') { this.app.idz('menu'); return; }
    if (e.key === 'Tab') { e.preventDefault(); this.zmienKategorie(this.kat + (e.shiftKey ? -1 : 1), true); return; }
    if (e.key === 'PageDown') { this.zmienKategorie(this.kat + 1, true); return; }
    if (e.key === 'PageUp') { this.zmienKategorie(this.kat - 1, true); return; }
    if (/^[1-9]$/.test(e.key) && +e.key <= this.kategorie.length) { this.zmienKategorie(+e.key - 1, true); return; }
    const n = this.wiersze.length;
    if (e.key === 'ArrowDown') { this.wybrany = (this.wybrany + 1) % n; return; }
    if (e.key === 'ArrowUp') { this.wybrany = (this.wybrany - 1 + n) % n; return; }
    // strzałki zmieniają wartość; akcji (np. „Przywróć domyślne”) nie uruchamiają
    const akcjaWiersza = this.wiersze[this.wybrany]?.typ === 'akcja';
    if (e.key === 'ArrowRight' && !akcjaWiersza) { this.zmien(this.wybrany, 1); return; }
    if (e.key === 'ArrowLeft' && !akcjaWiersza) { this.zmien(this.wybrany, -1); return; }
    if (e.key === 'Enter' || e.key === ' ') { this.zmien(this.wybrany, 1); return; }
  }
}
