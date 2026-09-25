import { tablica, TABLICE } from './tablice';
import { odkrycia } from './odkrycia';
import { rysujTablice, rysujAtlas, wPolu, type PoleTablicy } from '../render/tablica';
import { SERIF, SERIF_TYTUL } from '../render/ink';
import { BARWA, rgba } from '../render/palette';

/**
 * Okno atlasu nad płytą albo nad menu: jedna tablica albo cała siatka.
 * Świat pod spodem stoi, dopóki okno jest otwarte.
 */
export class OknoAtlasu {
  tryb: 'zamkniete' | 'tablica' | 'atlas' = 'zamkniete';
  private id = '';
  private nowa = false;
  private przewin = 0;
  private maxPrzewin = 0;
  private pola: PoleTablicy[] = [];
  private kursor = { x: -1, y: -1 };
  /** Z atlasu do tablicy i z powrotem — „wstecz" wraca tam, skąd przyszedłeś. */
  private zAtlasu = false;

  get otwarte(): boolean { return this.tryb !== 'zamkniete'; }

  otworzTablice(id: string, nowa = false): void {
    if (!tablica(id)) return;
    this.id = id; this.nowa = nowa; this.tryb = 'tablica'; this.zAtlasu = false;
  }

  otworzAtlas(): void { this.tryb = 'atlas'; this.nowa = false; odkrycia.niezobaczone = 0; }

  zamknij(): void { this.tryb = 'zamkniete'; }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, tlo = true): void {
    this.pola = [];
    if (!this.otwarte) return;
    ctx.save();
    if (tlo) { ctx.fillStyle = 'rgba(6,4,3,0.88)'; ctx.fillRect(0, 0, w, h); }
    const rozm = Math.max(14, Math.min(18, w / 60));
    if (this.tryb === 'tablica') {
      const t = tablica(this.id)!;
      const tw = Math.min(470, w - 24);
      const gora = this.nowa ? rozm * 3.2 : rozm * 2.4;
      const x = (w - tw) / 2, y = Math.max(8, gora);
      const th = rysujTablice(ctx, t, x, y, tw, h - y - 12, teraz);
      void th;
      if (this.nowa) {
        ctx.font = `${rozm * 0.85}px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.75 + 0.25 * Math.sin(teraz * 0.004));
        ctx.fillText('N O W A   T A B L I C A   W   A T L A S I E', w / 2, y - rozm * 0.9);
      }
      // nad tablicą: do atlasu i zamknij
      ctx.font = `italic ${rozm}px ${SERIF}`;
      const lewy = this.zAtlasu ? '‹ atlas' : 'cały atlas ›';
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(BARWA.atrament, 0.9);
      const ly = y - rozm * (this.nowa ? 2.1 : 0.7);
      ctx.fillText(lewy, x, ly);
      this.pola.push({ akcja: 'atlas', x: x - 6, y: ly - rozm, w: ctx.measureText(lewy).width + 12, h: rozm * 1.5 });
      ctx.textAlign = 'right';
      const zam = 'zamknij ×';
      ctx.fillText(zam, x + tw, ly);
      const zw = ctx.measureText(zam).width;
      this.pola.push({ akcja: 'zamknij', x: x + tw - zw - 6, y: ly - rozm, w: zw + 12, h: rozm * 1.5 });
      this.pola.push({ akcja: 'tlo-tablicy', x, y, w: tw, h: h - y });
    } else {
      const aw = Math.min(900, w - 32);
      const x = (w - aw) / 2;
      const y = rozm * 4.2;
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.max(22, Math.min(38, w / 26))}px ${SERIF_TYTUL}`;
      ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
      ctx.fillText('A T L A S', w / 2, rozm * 2.2);
      ctx.font = `italic ${rozm * 0.85}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
      ctx.fillText(`odkryte ${odkrycia.ile} z ${TABLICE.length} tablic — resztę znajdziesz w górze`, w / 2, rozm * 3.3);
      const r = rysujAtlas(ctx, x, y, aw, h - y - rozm * 2, this.przewin, teraz, this.kursor);
      this.maxPrzewin = r.maxPrzewin;
      this.przewin = Math.min(this.przewin, this.maxPrzewin);
      this.pola.push(...r.pola.map((p) => ({ ...p, akcja: 'tab:' + p.akcja })));
      ctx.font = `italic ${rozm * 0.85}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.9);
      ctx.textAlign = 'right';
      const zam = 'zamknij ×';
      ctx.fillText(zam, x + aw, rozm * 2.2);
      const zw = ctx.measureText(zam).width;
      this.pola.push({ akcja: 'zamknij', x: x + aw - zw - 6, y: rozm * 1.2, w: zw + 12, h: rozm * 1.5 });
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
      ctx.fillText('kółko albo przeciągnięcie przewija · esc zamyka', w / 2, h - rozm * 0.7);
    }
    ctx.restore();
  }

  ruch(x: number, y: number): void { this.kursor = { x, y }; }

  /** Dotknięcie w otwartym oknie; zwraca true, gdy okno je obsłużyło. */
  dotyk(x: number, y: number): boolean {
    if (!this.otwarte) return false;
    for (const p of this.pola) {
      if (!wPolu(p, x, y)) continue;
      if (p.akcja === 'zamknij') { this.zamknij(); return true; }
      if (p.akcja === 'atlas') {
        if (this.tryb === 'tablica') { this.tryb = 'atlas'; this.nowa = false; }
        return true;
      }
      if (p.akcja === 'tlo-tablicy') return true;
      if (p.akcja.startsWith('tab:')) {
        const id = p.akcja.slice(4);
        if (odkrycia.zna(id)) { this.otworzTablice(id); this.zAtlasu = true; }
        return true;
      }
    }
    // poza tablicą: z tablicy otwartej z atlasu wraca do atlasu, inaczej zamyka
    if (this.tryb === 'tablica' && this.zAtlasu) this.tryb = 'atlas';
    else this.zamknij();
    return true;
  }

  kolko(dy: number): void {
    if (this.tryb !== 'atlas') return;
    this.przewin = Math.max(0, Math.min(this.maxPrzewin, this.przewin + dy));
  }

  klawisz(k: string): boolean {
    if (!this.otwarte) return false;
    if (k === 'Escape' || k === 'Enter' || k === ' ') {
      if (this.tryb === 'tablica' && this.zAtlasu) this.tryb = 'atlas';
      else this.zamknij();
      return true;
    }
    if (this.tryb === 'atlas' && (k === 'ArrowDown' || k === 'ArrowUp')) { this.kolko(k === 'ArrowDown' ? 80 : -80); return true; }
    return true;
  }
}
