/**
 * WSTĘP KRĘGU TRZECIEGO (beta) — polecenie użytkownika (15.11): „na początku gry zrób parę cutscenek, które dużo nam
 * mówią, a po cutscence włącz chwilowy gameplay, w którym gracz nie może nic ruszyć, w którym postacie dostają się
 * do miejsca początku gry, i dopiero gdy się tam dostaną, gracz przejmuje kontrolę”.
 *
 *  1. PLANSZE — pięć ilustrowanych scen (rysowanych w kodzie, tuszem jak gra): lej piekła; krąg żarłoków i Cerber;
 *     żywy człowiek i jego przewodnik (garść ziemi w paszcze Cerbera — pieśń VI); sześciu wstaje z błota (kim są
 *     i skąd mają swoje umiejętności); ty jesteś trzewiami kręgu (co robisz, po co schodzą, co ich czeka).
 *     Kliknięcie albo spacja — następna scena (najpierw dopisuje resztę tekstu).
 *  2. WEJŚCIE — scena w silniku gry bez sterowania: symulacja stoi, a szóstka wstaje z błota na tarasie kręgu,
 *     idzie między leżącymi żarłokami do szybu kosza i po kolei schodzi po linie w trzewia, do sali, na swoje
 *     miejsca. Gdy wszyscy dojdą — „Teraz ty.” — i gracz przejmuje kontrolę.
 */
import type { Sim } from '../sim/sim';
import type { Camera } from '../render/camera';
import type { Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import { SURFACE_Y } from '../sim/world';
import { wiadra } from '../sim/wiadro';
import { gruntKregu, WIDOK_KREGU } from '../render/krag-swiat';
import { rysujFilm, DLUGOSC_FILMU } from './film-kregu';

const KROJ = '"Trzewia Tekst", Georgia, serif';
interface Prost { x: number; y: number; w: number; h: number }

// ---------------------------------------------------------------- wejście (scena w silniku gry)

interface Aktor { c: Creature; x0: number; y0: number; f0: number; start: number; kolejka: number; wstaje: number; doLiny: number; zejscie: number; naDole: number; koniec: number }

const V_IDZIE = 2.2, V_LINA = 4.2, V_SALA = 2.4;

export class WstepKregu {
  faza: 'brak' | 'plansze' | 'wejscie' = 'brak';
  private wejscieOd = 0;
  private aktorzy: Aktor[] = [];
  private linaX = 0;
  private tikStart = 0;
  private koniecWejscia = 0;

  trwa(): boolean { return this.faza !== 'brak'; }
  plansze(): boolean { return this.faza === 'plansze'; }

  private filmOd = -1;

  /** Nowa partia: najpierw film (app/film-kregu.ts), potem scena wejścia. */
  zacznij(): void {
    this.faza = 'plansze'; this.filmOd = -1;
  }

  /** Esc: pomija film (scena wejścia zostaje — gracz i tak nie ma jeszcze władzy). */
  pomin(): void {
    if (this.faza === 'plansze') { this.faza = 'wejscie'; this.wejscieOd = -1; }
  }

  /** Film na cały ekran; po ostatniej klatce — scena wejścia. */
  rysujPlansze(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, teraz: number): void {
    if (this.filmOd < 0) this.filmOd = teraz;
    const t = (teraz - this.filmOd) / 1000;
    if (t >= DLUGOSC_FILMU) { this.pomin(); ctx.fillStyle = 'rgb(0,0,0)'; ctx.fillRect(0, 0, w, h); return; }
    rysujFilm(ctx, sim, w, h, t, teraz);
  }

  /**
   * Wejście: ustawia szóstkę i kamerę według czasu sceny (symulacja stoi). Zwraca true, gdy scena się skończyła —
   * wtedy postacie są dokładnie tam, gdzie zaczyna się gra.
   */
  krok(sim: Sim, cam: Camera, teraz: number): boolean {
    if (this.faza !== 'wejscie') return false;
    if (this.wejscieOd < 0) this.przygotuj(sim, teraz);
    const t = (teraz - this.wejscieOd) / 1000;
    WIDOK_KREGU.tik = this.tikStart + Math.floor(t * 120);
    let ognisko: { x: number; y: number } | null = null, naLinie: Aktor | null = null;
    let wszyscy = true;
    for (const a of this.aktorzy) {
      const c = a.c;
      c.naLinie = undefined; c.ogluszonyDo = undefined;
      if (t < a.wstaje) {
        c.ogluszonyDo = sim.tick + 1;   // leży w błocie
        c.x = a.start; c.y = gruntKregu(sim, a.start) - 1;
      } else if (t < a.doLiny) {
        const x = Math.min(a.kolejka, a.start + (t - a.wstaje - 0.5 > 0 ? (t - a.wstaje - 0.5) * V_IDZIE : 0));
        c.x = x; c.y = gruntKregu(sim, x) - 1; c.face = 1;
      } else if (t < a.zejscie) {
        c.x = a.kolejka; c.y = gruntKregu(sim, a.kolejka) - 1; c.face = 1;
      } else if (t < a.naDole) {
        const yg = gruntKregu(sim, this.linaX) - 1;
        c.x = this.linaX; c.y = yg + (t - a.zejscie) * V_LINA; c.naLinie = -1;
        naLinie = a;
      } else if (t < a.koniec) {
        const d = a.x0 - this.linaX, s = Math.min(1, (t - a.naDole) * V_SALA / Math.max(0.01, Math.abs(d)));
        c.x = this.linaX + d * s; c.y = a.y0; c.face = d >= 0 ? 1 : -1;
      } else {
        c.x = a.x0; c.y = a.y0; c.face = a.f0;
      }
      if (t < a.koniec) wszyscy = false;
    }
    // kamera: na tarasie za grupą, potem za tym, kto schodzi, na końcu sala
    const naTarasie = this.aktorzy.filter((a) => t < a.zejscie);
    if (naLinie) ognisko = { x: naLinie.c.x, y: naLinie.c.y };
    else if (naTarasie.length) ognisko = { x: naTarasie.reduce((s, a) => s + a.c.x, 0) / naTarasie.length, y: SURFACE_Y - 4 };
    else ognisko = { x: this.aktorzy.reduce((s, a) => s + a.c.x, 0) / Math.max(1, this.aktorzy.length), y: this.aktorzy[0]?.y0 ?? cam.y };
    const zoom = naTarasie.length && !naLinie ? 12 : 14;
    const k = t < 0.05 ? 1 : 0.05;
    cam.x += (ognisko.x - cam.x) * k; cam.y += (ognisko.y - cam.y) * k; cam.zoom += (zoom - cam.zoom) * k;
    cam.clamp(sim.world.w, sim.world.h);
    if (wszyscy) {
      if (!this.koniecWejscia) this.koniecWejscia = teraz;
      if (teraz - this.koniecWejscia > 2600) {
        this.faza = 'brak'; WIDOK_KREGU.tik = null;
        for (const a of this.aktorzy) { a.c.x = a.x0; a.c.y = a.y0; a.c.face = a.f0; a.c.naLinie = undefined; a.c.ogluszonyDo = undefined; }
        return true;
      }
    }
    return false;
  }

  private przygotuj(sim: Sim, teraz: number): void {
    this.wejscieOd = teraz; this.koniecWejscia = 0;
    this.tikStart = sim.tick;
    const w = sim.world;
    const wd = wiadra(sim).find((q) => q.szyb);
    this.linaX = wd ? wd.x + 0.5 : w.szybWiadraX + 0.5;
    const lud = sim.creatures.filter((c) => !c.dead && c.race === Race.GOBLIN).sort((a, b) => a.id - b.id);
    // kolejność: grabarze, mnisi, rycerz na końcu (osłania)
    const waga = (c: Creature): number => (c.rola === 'robotnik' ? 0 : c.rola === 'pobozny' ? 1 : 2);
    lud.sort((a, b) => waga(a) - waga(b) || a.id - b.id);
    let zejscieOst = 0;
    this.aktorzy = lud.map((c, i) => {
      const start = Math.max(6, this.linaX - 20 - i * 1.4);
      const kolejka = this.linaX - 1.4 - i * 0.9;
      const wstaje = 1.2 + i * 0.45;
      const doLiny = wstaje + 0.5 + (kolejka - start) / V_IDZIE;
      const zejscie = Math.max(doLiny + 0.3, zejscieOst + 1.5);
      zejscieOst = zejscie;
      const glebokosc = c.y - (gruntKregu(sim, this.linaX) - 1);
      const naDole = zejscie + Math.max(0.5, glebokosc / V_LINA);
      const koniec = naDole + Math.abs(c.x - this.linaX) / V_SALA + 0.1;
      return { c, x0: c.x, y0: c.y, f0: c.face, start, kolejka, wstaje, doLiny, zejscie, naDole, koniec };
    });
  }

  /** Napisy sceny wejścia (pasy kinowe u góry i u dołu płyty). */
  rysujNapisy(ctx: CanvasRenderingContext2D, plate: Prost, teraz: number): void {
    if (this.faza !== 'wejscie' || this.wejscieOd < 0) return;
    const t = (teraz - this.wejscieOd) / 1000;
    const pas = plate.h * 0.09;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(plate.x, plate.y, plate.w, pas);
    ctx.fillRect(plate.x, plate.y + plate.h - pas, plate.w, pas);
    const ost = this.aktorzy.reduce((m, a) => Math.max(m, a.koniec), 0);
    const zejscie0 = this.aktorzy[0]?.zejscie ?? 99;
    const napis = this.koniecWejscia ? 'Teraz ty.'
      : t < 3.5 ? 'Szóstka wstaje z błota trzeciego kręgu.'
        : t < zejscie0 - 0.5 ? 'Idą między tymi, którzy nigdy nie wstaną… do szybu, którym inni spuszczają im kosz resztek.'
          : t < ost - 1 ? 'Jeden po drugim schodzą po linie w trzewia kręgu.'
            : 'Na dole, w sali pod kręgiem, zaczyna się ich droga w dół.';
    const r = Math.max(14, Math.min(24, plate.w / 60));
    ctx.font = `italic ${this.koniecWejscia ? r * 1.4 : r}px ${KROJ}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(222,214,186,0.95)';
    ctx.fillText(napis, plate.x + plate.w / 2, plate.y + plate.h - pas / 2);
    ctx.font = `${r * 0.65}px ${KROJ}`; ctx.fillStyle = 'rgba(170,160,140,0.8)';
    ctx.fillText('scena — sterowanie przejmiesz, gdy szóstka dojdzie na miejsce', plate.x + plate.w / 2, plate.y + pas / 2);
    ctx.restore();
  }
}
