import { tablica, TABLICE } from './tablice';
import { odkrycia } from './odkrycia';
import { rysujTablice, rysujAtlas, wPolu, type PoleTablicy } from '../render/tablica';
import { SERIF } from '../render/ink';
import { kartusz } from '../render/ozdoby';
import { BARWA, rgba } from '../render/palette';
import { ATLAS as A } from '../nastawy/wyglad/atlas';

/** Podmienia {ile} i {z} w napisie. */
export const zLiczbami = (tekst: string, ile: number, z: number): string => tekst.replace('{ile}', String(ile)).replace('{z}', String(z));

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
  /** Odstęp od brzegu ekranu — w menu okno stoi w ozdobnej ramie i nie może na nią wchodzić. */
  margines = 16;

  get otwarte(): boolean { return this.tryb !== 'zamkniete'; }

  /** Co teraz leży na stole — zmiana to przewrócona karta, a karta ma swój szelest. */
  get strona(): string { return this.tryb === 'tablica' ? `tablica:${this.id}` : this.tryb; }

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
    if (tlo) { ctx.fillStyle = `rgba(6,4,3,${A.tloAlfa})`; ctx.fillRect(0, 0, w, h); }
    const rozm = Math.max(A.rozmiar.min, Math.min(A.rozmiar.max, w / 60));
    if (this.tryb === 'tablica') {
      const t = tablica(this.id)!;
      const tw = Math.min(A.maxTablica, w - Math.max(24, this.margines * 2));
      const gora = (this.nowa ? rozm * 3.2 : rozm * 2.4) + Math.max(0, this.margines - 16);
      const x = (w - tw) / 2, y = Math.max(8, gora);
      const th = rysujTablice(ctx, t, x, y, tw, h - y - Math.max(12, this.margines), teraz);
      void th;
      if (this.nowa) {
        ctx.font = `${rozm * 0.85}px ${SERIF}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.75 + 0.25 * Math.sin(teraz * 0.004));
        ctx.fillText(A.nowaTablica, w / 2, y - rozm * 0.9);
      }
      // nad tablicą: do atlasu i zamknij
      ctx.font = `italic ${rozm}px ${SERIF}`;
      const lewy = this.zAtlasu ? A.wstecz : A.doAtlasu;
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(BARWA.atrament, 0.9);
      const ly = y - rozm * (this.nowa ? 2.1 : 0.7);
      ctx.fillText(lewy, x, ly);
      this.pola.push({ akcja: 'atlas', x: x - 6, y: ly - rozm, w: ctx.measureText(lewy).width + 12, h: rozm * 1.5 });
      ctx.textAlign = 'right';
      const zam = A.zamknij;
      ctx.fillText(zam, x + tw, ly);
      const zw = ctx.measureText(zam).width;
      this.pola.push({ akcja: 'zamknij', x: x + tw - zw - 6, y: ly - rozm, w: zw + 12, h: rozm * 1.5 });
      this.pola.push({ akcja: 'tlo-tablicy', x, y, w: tw, h: h - y });
    } else {
      const aw = Math.min(A.maxSiatka, w - this.margines * 2);
      const x = (w - aw) / 2;
      const gora = this.margines + rozm * 0.6;
      const rt = Math.max(A.tytulRozmiar.min, Math.min(A.tytulRozmiar.max, w / 24));
      kartusz(ctx, w / 2, gora + rt * 1.05, A.tytul, rt, 1);
      // postęp: kreska z kropką na każdą tablicę, zapełnione — odkryte
      const py = gora + rt * 1.7;
      const n = TABLICE.length, pw = Math.min(aw * 0.6, n * A.kropkaOdstep);
      for (let i = 0; i < n; i++) {
        const px = w / 2 - pw / 2 + (i + 0.5) * (pw / n);
        const zna = odkrycia.zna(TABLICE[i].id);
        ctx.fillStyle = zna ? rgba(BARWA.zarBlady, A.kropkaAlfa) : rgba(BARWA.atramentCichy, A.kropkaNieznanaAlfa);
        ctx.beginPath(); ctx.arc(px, py, zna ? 2.4 : 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.font = `italic ${rozm * 0.85}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
      ctx.fillText(zLiczbami(A.postep, odkrycia.ile, TABLICE.length), w / 2, py + rozm * 1.3);
      const y = py + rozm * 2;
      const r = rysujAtlas(ctx, x, y, aw, h - y - (this.margines > 16 ? this.margines : rozm * 2), this.przewin, teraz, this.kursor);
      this.maxPrzewin = r.maxPrzewin;
      this.przewin = Math.min(this.przewin, this.maxPrzewin);
      this.pola.push(...r.pola.map((p) => ({ ...p, akcja: 'tab:' + p.akcja })));
      ctx.font = `italic ${rozm * 0.85}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.9);
      ctx.textAlign = 'right';
      const zam = A.zamknij;
      ctx.fillText(zam, x + aw, gora + rozm * 1.2);
      const zw = ctx.measureText(zam).width;
      this.pola.push({ akcja: 'zamknij', x: x + aw - zw - 6, y: gora + rozm * 0.2, w: zw + 12, h: rozm * 1.5 });
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
      // w ramie menu ta sama podpowiedź stoi na dolnym marginesie ramy
      if (this.margines <= 16) ctx.fillText(A.podpowiedz, w / 2, h - rozm * 0.7);
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
    if (this.tryb === 'atlas' && (k === 'ArrowDown' || k === 'ArrowUp')) { this.kolko(k === 'ArrowDown' ? A.przewinStrzalka : -A.przewinStrzalka); return true; }
    return true;
  }
}
