import RycinaWatek from './rycina-watek?worker&inline';
import type { Sim } from '../sim/sim';
import type { World } from '../sim/world';
import { Engraver, graniceWarstw, oknoKafli, type KameraRyciny } from './engrave';
import { zrodlaSwiatla } from './rycina-zrodla';
import { rowneW } from './grzbiet';
import { Poswiata } from './bloom';
import { ustawienia } from '../core/settings-store';
import { licznik } from '../core/wydajnosc';
import {
  TABLICE, wytnij, type NazwaTablicy, type TablicaKafli, type OknoKafli,
  type WiadomoscSwiata, type ProsbaRyciny, type OdbitkaRyciny, type BladRyciny,
} from './rycina-wspolne';

/**
 * Rycina świata na płycie (8.11: wydajność). Liczy ją osobny wątek (render/rycina-watek.ts) — drugi rdzeń
 * procesora — a gra w każdej klatce rysuje najnowszy gotowy obraz, przełożony z kamery, dla której powstał, na
 * bieżącą: przy przesuwaniu jedzie razem ze skałą, przy kręceniu kółkiem rośnie albo maleje, aż przyjdzie nowy.
 * Dawniej rycina liczyła się w klatce i przy ruchu kamery zabierała jej do 50 ms (szarpnięcie).
 *
 * Bez wątku (ustawienia → Wydajność, stara przeglądarka, błąd wątku) rycina liczy się tutaj, dokładnie jak dawniej.
 * Tutaj liczy się też odbitka „na już”, gdy ostatni obraz nie przykrywa płyty (pierwsza klatka, skok kamery) —
 * inaczej płyta byłaby przez chwilę pusta.
 */

/**
 * Zapas obrazu z wątku na każdym brzegu (px logiczne): przy przesuwaniu kamery obraz sprzed klatki–dwóch dalej
 * przykrywa płytę. Wielokrotność 2 — rycina w pół rozdzielczości trafia w tę samą siatkę pikseli świata.
 */
const ZAPAS = 32;
/** Gdy ostatni obraz przykrywa mniejszą część płyty (skok kamery), rycina liczy się od razu w tej klatce. */
const PROG_POKRYCIA = 0.3;
/** Brzeg płyty, którego obraz jeszcze nie przykrywa (szybkie oddalenie) — barwa nieznanej skały, na klatkę–dwie. */
const TLO = 'rgb(36,28,22)';

interface Obraz { zrodlo: CanvasImageSource; kam: KameraRyciny; dx: number; dy: number; bw: number; bh: number }
interface Prostokat { x: number; y: number; w: number; h: number }
type Odpowiedz = OdbitkaRyciny | BladRyciny | { typ: 'pusta'; nr: number };

const takaSama = (a: KameraRyciny, b: KameraRyciny): boolean =>
  a.x === b.x && a.y === b.y && a.zoom === b.zoom && a.vw === b.vw && a.vh === b.vh;

/** Prostokąt płyty kamery `k` (jej lewy górny róg w świecie) na płycie bieżącej kamery. */
function plytaKamery(k: KameraRyciny, cam: KameraRyciny): Prostokat {
  if (takaSama(k, cam)) return { x: 0, y: 0, w: cam.vw, h: cam.vh };
  const s = cam.zoom / k.zoom;
  const X0 = k.x - k.vw / 2 / k.zoom, Y0 = k.y - k.vh / 2 / k.zoom;
  return { x: (X0 - cam.x) * cam.zoom + cam.vw / 2, y: (Y0 - cam.y) * cam.zoom + cam.vh / 2, w: k.vw * s, h: k.vh * s };
}

/** Prostokąt obrazu (dx, dy, bw, bh na płycie swojej kamery) na płycie bieżącej kamery. */
function naPlycie(o: Obraz, cam: KameraRyciny): Prostokat {
  if (takaSama(o.kam, cam)) return { x: o.dx, y: o.dy, w: o.bw, h: o.bh };
  const p = plytaKamery(o.kam, cam), s = cam.zoom / o.kam.zoom;
  return { x: p.x + o.dx * s, y: p.y + o.dy * s, w: o.bw * s, h: o.bh * s };
}

function zamknijOdbitke(o: OdbitkaRyciny): void {
  o.buf.close();
  o.emis?.close();
  o.poswiata?.close();
}

export class Rycina {
  /** Rycina liczona w tym wątku: tryb bez wątku, pierwsza klatka i odbitka „na już” po skoku kamery. */
  readonly lokalna = new Engraver();
  /** Świat malowany jak fresk (próba) zamiast ryciny — ustawienia → „Rysunek świata”. */
  fresk = false;
  private posw = new Poswiata();
  private watek: Worker | null = null;
  private zepsuty = false;
  private wLocie = false;
  /** Numer kolejnej odbitki (lokalnej albo zamówionej) — pokazuje się najnowsza z gotowych. */
  private nr = 0;
  private swiatWatku: World | null = null;
  private swiatId = 0;
  private odb: OdbitkaRyciny | null = null;
  private nrLokalnej = -1;
  private kamLokalnej: KameraRyciny = { x: 0, y: 0, zoom: 1, vw: 1, vh: 1 };

  get scale(): number { return this.lokalna.scale; }

  /** Rycina po zmianie przybliżenia dopracowuje zgrubną odbitkę przez kilka odbitek — gra prosi o następną od razu. */
  get niedokonczona(): boolean { return this.zWatku() ? this.odb!.niedokonczona : this.lokalna.niedokonczona; }

  resize(vw: number, vh: number): void {
    this.lokalna.resize(vw, vh);
    this.posw.resize(vw, vh);
    // bufor lokalnej ryciny jest teraz pusty — do następnej odbitki pokazuje się obraz z wątku (albo liczy się nowa)
    this.nrLokalnej = -1;
  }

  /**
   * Co klatkę, przed rysowaniem płyty. `chce` — gra chce nowej odbitki (warunki jak dawniej: kamera ruszona, świat
   * zmieniony, upływ czasu). Zwraca true, gdy odbitkę policzono albo zamówiono — gra notuje wtedy kamerę i czas.
   * Gdy wątek jeszcze liczy poprzednią, zamówienie czeka do następnej klatki (z świeższą migawką).
   */
  klatka(sim: Sim, cam: KameraRyciny, teraz: number, chce: boolean): boolean {
    const w = this.watekGotowy();
    if (!w) {
      // bez wątku — jak dawniej; bez żadnego obrazu (po zmianie rozmiaru, po wyłączeniu wątku) od razu
      if (!chce && this.nrLokalnej >= 0) return false;
      this.liczTutaj(sim, cam, teraz);
      return true;
    }
    if (this.pokrycie(cam) < PROG_POKRYCIA) {
      this.liczTutaj(sim, cam, teraz);
      if (!this.wLocie) this.zamow(w, sim, cam, teraz);
      return true;
    }
    if (!chce || this.wLocie) return false;
    this.zamow(w, sim, cam, teraz);
    return true;
  }

  /** Rycina na płycie (układ płyty): najnowszy obraz pod bieżącą kamerą; jasność > 1 — drugi raz w trybie „lighter”. */
  rysuj(ctx: CanvasRenderingContext2D, cam: KameraRyciny, jasnosc: number): void {
    const o = this.obraz();
    if (!o) { ctx.fillStyle = TLO; ctx.fillRect(0, 0, cam.vw, cam.vh); return; }
    const r = naPlycie(o, cam);
    if (r.x > 0 || r.y > 0 || r.x + r.w < cam.vw || r.y + r.h < cam.vh) { ctx.fillStyle = TLO; ctx.fillRect(0, 0, cam.vw, cam.vh); }
    ctx.drawImage(o.zrodlo, r.x, r.y, r.w, r.h);
    // jasność ryciny: ta sama rycina jeszcze raz w trybie „lighter” mnoży kolory o (1 + nadwyżka) — filtr brightness()
    // kosztował prawie dwa razy więcej na klatkę
    if (jasnosc > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, jasnosc - 1);
      ctx.drawImage(o.zrodlo, r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  /**
   * Poświata świateł z tej samej odbitki: `podMrokiem` — w miejscu ryciny, moc 0,5; nad mrokiem — na całą płytę
   * swojej kamery, moc 0,3. Rozmycie liczy wątek (raz na odbitkę); bez wątku — render/bloom.ts, też raz na odbitkę.
   */
  poswiata(ctx: CanvasRenderingContext2D, cam: KameraRyciny, podMrokiem: boolean): void {
    const moc = podMrokiem ? 0.5 : 0.3;
    const z = this.zWatku() ? this.odb! : null;
    if (z?.poswiata) {
      // poświata z wątku leży pod prawdziwą płytą kamery odbitki (bez zapasu) — jak dawniej w grze
      const k = z.kam, kp: KameraRyciny = { x: k.x, y: k.y, zoom: k.zoom, vw: k.vw - ZAPAS * 2, vh: k.vh - ZAPAS * 2 };
      // bufor ryciny bez zapasu: (⌈vw / skala⌉ + 1) pikseli ryciny po skala pikseli płyty — jak Engraver.resize
      const sk = z.skala;
      const bw0 = Math.max(2, Math.ceil(kp.vw / sk) + 1) * sk, bh0 = Math.max(2, Math.ceil(kp.vh / sk) + 1) * sk;
      const r = podMrokiem ? naPlycie({ zrodlo: z.poswiata, kam: kp, dx: z.dx, dy: z.dy, bw: bw0, bh: bh0 }, cam) : plytaKamery(kp, cam);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = moc;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(z.poswiata, r.x, r.y, r.w, r.h);
      ctx.restore();
      return;
    }
    const o = this.obraz();
    if (!o) return;
    const r = podMrokiem ? naPlycie(o, cam) : plytaKamery(o.kam, cam);
    if (z?.emis) this.posw.nalozy(ctx, z.emis, r.x, r.y, r.w, r.h, moc, -1 - z.nr);
    else if (!z) this.posw.nalozy(ctx, this.lokalna.emis, r.x, r.y, r.w, r.h, moc, this.lokalna.wersja);
  }

  // ------------------------------------------------------------------ środek

  private zWatku(): boolean { return !!this.odb && this.odb.nr > this.nrLokalnej; }

  private obraz(): Obraz | null {
    if (this.zWatku()) {
      const o = this.odb!;
      return { zrodlo: o.buf, kam: o.kam, dx: o.dx, dy: o.dy, bw: o.bw, bh: o.bh };
    }
    if (this.nrLokalnej < 0) return null;
    const e = this.lokalna;
    return { zrodlo: e.buf, kam: this.kamLokalnej, dx: e.dx, dy: e.dy, bw: e.buf.width * e.scale, bh: e.buf.height * e.scale };
  }

  /** Jaka część płyty bieżącej kamery leży pod ostatnim obrazem (0..1). */
  private pokrycie(cam: KameraRyciny): number {
    const o = this.obraz();
    if (!o) return 0;
    const r = naPlycie(o, cam);
    const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(cam.vw, r.x + r.w), y1 = Math.min(cam.vh, r.y + r.h);
    if (x1 <= x0 || y1 <= y0) return 0;
    return ((x1 - x0) * (y1 - y0)) / (cam.vw * cam.vh);
  }

  private liczTutaj(sim: Sim, cam: KameraRyciny, teraz: number): void {
    const e = this.lokalna;
    e.fresk = this.fresk;
    e.zrodla = zrodlaSwiatla(sim);
    e.rowne = rowneW(sim.world);
    e.rebuild(sim, cam, teraz);
    this.nrLokalnej = ++this.nr;
    this.kamLokalnej = { x: cam.x, y: cam.y, zoom: cam.zoom, vw: cam.vw, vh: cam.vh };
  }

  private watekGotowy(): Worker | null {
    const moze = ustawienia.rycinaWWatku !== false && !this.zepsuty && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
    if (!moze) {
      if (this.watek) this.zamknijWatek();
      licznik.rycinaWWatku = false;
      return null;
    }
    if (!this.watek) {
      try {
        const w = new RycinaWatek();
        w.onmessage = (e: MessageEvent<Odpowiedz>) => this.odbierz(e.data);
        w.onerror = (e) => { console.error('Wątek ryciny:', e.message); this.zepsuty = true; this.zamknijWatek(); };
        this.watek = w;
      } catch (e) {
        console.error('Wątek ryciny nie wystartował:', e);
        this.zepsuty = true;
        licznik.rycinaWWatku = false;
        return null;
      }
    }
    licznik.rycinaWWatku = true;
    return this.watek;
  }

  private zamknijWatek(): void {
    this.watek?.terminate();
    this.watek = null;
    this.wLocie = false;
    this.swiatWatku = null;
    if (this.odb) { zamknijOdbitke(this.odb); this.odb = null; }
  }

  private odbierz(m: Odpowiedz): void {
    if (m.typ === 'blad') {
      console.error('Wątek ryciny:', m.tekst);
      this.zepsuty = true;
      this.zamknijWatek();
      return;
    }
    this.wLocie = false;
    if (m.typ === 'pusta') return;
    licznik.watek(m.ms);
    if (this.odb) zamknijOdbitke(this.odb);
    this.odb = m;
  }

  /** Migawka świata wokół kamery dla wątku: okno kafli, światło ludu, stałe świata, kamera z zapasem na brzegach. */
  private zamow(w: Worker, sim: Sim, cam: KameraRyciny, teraz: number): void {
    const swiat = sim.world;
    if (swiat !== this.swiatWatku) {
      // nowy świat (nowa partia, wczytany zapis) — wątek dostaje go w całości, raz
      this.swiatWatku = swiat;
      this.swiatId++;
      const tablice = {} as Record<NazwaTablicy, TablicaKafli>;
      const przenies: Transferable[] = [];
      for (const n of TABLICE) { const t = swiat[n].slice(); tablice[n] = t; przenies.push(t.buffer); }
      const surface = swiat.surface.slice();
      przenies.push(surface.buffer);
      const g = graniceWarstw(swiat);
      const granice = g ? { g1: g.g1.slice(), g2: g.g2.slice() } : null;
      if (granice) przenies.push(granice.g1.buffer, granice.g2.buffer);
      const m: WiadomoscSwiata = { typ: 'swiat', id: this.swiatId, w: swiat.w, h: swiat.h, tablice, surface, granice, rowne: rowneW(swiat) };
      w.postMessage(m, przenies);
    }
    const skala = this.lokalna.scale;
    const kam: KameraRyciny = { x: cam.x, y: cam.y, zoom: cam.zoom, vw: cam.vw + ZAPAS * 2, vh: cam.vh + ZAPAS * 2 };
    const aw = Math.max(2, Math.ceil(kam.vw / skala) + 1), ah = Math.max(2, Math.ceil(kam.vh / skala) + 1);
    const ok = oknoKafli(kam, aw, ah, skala);
    const x0 = Math.min(swiat.w, Math.max(0, ok.x0 - 2)), y0 = Math.min(swiat.h, Math.max(0, ok.y0 - 2));
    const x1 = Math.min(swiat.w, ok.x0 + ok.tilesX + 2), y1 = Math.min(swiat.h, ok.y0 + ok.tilesY + 2);
    const okno: OknoKafli = { x0, y0, sz: Math.max(0, x1 - x0), wy: Math.max(0, y1 - y0) };
    const tablice = {} as Record<NazwaTablicy, TablicaKafli>;
    const przenies: Transferable[] = [];
    for (const n of TABLICE) { const t = wytnij(swiat[n], swiat.w, okno); tablice[n] = t; przenies.push(t.buffer); }
    const surface = swiat.surface.slice();
    const zrodla = zrodlaSwiatla(sim);
    przenies.push(surface.buffer, zrodla.buffer);
    const prosba: ProsbaRyciny = {
      typ: 'rysuj', nr: ++this.nr, swiatId: this.swiatId, okno, tablice, surface,
      skalary: {
        coreX: swiat.coreX, coreY: swiat.coreY, salaOltarza: { ...swiat.salaOltarza }, oltarz: { ...swiat.oltarz },
        szybX: swiat.szybX, szybDol: swiat.szybDol, szybWiadraX: swiat.szybWiadraX, szybWiadraDol: swiat.szybWiadraDol,
      },
      tick: sim.tick, zrodla, kam, zapas: ZAPAS, czas: teraz, skala, kontrast: ustawienia.kontrast, fresk: this.fresk, poswiataPodzial: 4,
    };
    w.postMessage(prosba, przenies);
    this.wLocie = true;
  }
}
