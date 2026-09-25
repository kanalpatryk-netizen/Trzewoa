import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { tloSadzy } from '../../render/ink';
import { OknoAtlasu } from '../../atlas/okno';

/**
 * Atlas z menu: te same tablice, co w grze — tylko te, które już odkryłeś.
 * Zastąpił bestiariusz, który był jedną długą kartą tekstu.
 */
export class EkranBestiariusza implements Ekran {
  nazwa = 'bestiariusz';
  private okno = new OknoAtlasu();
  private start: { x: number; y: number } | null = null;
  private ostatniY = 0;
  private przeciaga = false;

  constructor(private app: Kontekst) {}

  wejdz(): void { this.okno.otworzAtlas(); }

  krok(): void {
    // zamknięte okno atlasu to powrót do menu
    if (!this.okno.otwarte) this.app.idz('menu');
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    tloSadzy(ctx, w, h, teraz);
    this.okno.rysuj(ctx, w, h, teraz, false);
  }

  kolko(e: WheelEvent): void { this.okno.kolko(e.deltaY * 0.7); }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (faza === 'dol') { this.start = { x: e.clientX, y: e.clientY }; this.ostatniY = e.clientY; this.przeciaga = false; return; }
    if (faza === 'ruch') {
      this.okno.ruch(e.clientX, e.clientY);
      if (!this.start) return;
      if (Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) > 8) this.przeciaga = true;
      if (this.przeciaga) { this.okno.kolko(-(e.clientY - this.ostatniY)); this.ostatniY = e.clientY; }
      return;
    }
    // puszczenie bez przeciągania to kliknięcie
    if (this.start && !this.przeciaga) this.okno.dotyk(e.clientX, e.clientY);
    this.start = null;
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (akcja === 'menu' && e.key !== 'Escape') { this.app.idz('menu'); return; }
    this.okno.klawisz(e.key);
  }
}
