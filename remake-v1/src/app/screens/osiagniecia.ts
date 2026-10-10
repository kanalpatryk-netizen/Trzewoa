import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, tloSadzy, tytulRyty, kreska } from '../../render/ink';
import { OSIAGNIECIA, zdobyte } from '../../core/osiagniecia';
import { dzisiaj, wynikDnia, czasGry } from '../../core/swiat-dnia';
import { medalion } from '../../render/freski';
import { FRESKI } from '../../nastawy/wyglad/freski';

/**
 * OSIĄGNIĘCIA (v4.1 beta) — spis celów dodatkowych i wynik dzisiejszego świata dnia.
 * Każde ma medalion z fresku (FRESKI.medaliony): zdobyte w kolorze, niezdobyte wyblakłe
 * i przygaszone, ale ich opis widać — to podpowiedź, jak grać inaczej.
 */
export class EkranOsiagniec implements Ekran {
  nazwa = 'osiagniecia';
  private od = 0;
  private wybrana = 0;
  private trafienia: { x: number; y: number; w: number; h: number; id: string }[] = [];
  private opcje = [
    { id: 'dnia', etykieta: 'Zagraj świat dnia' },
    { id: 'menu', etykieta: 'Wróć do menu' },
  ];

  constructor(private app: Kontekst) {}

  wejdz(): void {
    this.od = performance.now();
    this.wybrana = 0;
  }

  krok(): void { /* spis stoi */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const wejscie = Math.min(1, (teraz - this.od) / 600);
    tloSadzy(ctx, w, h, teraz);
    const maja = zdobyte();
    tytulRyty(ctx, 'OSIĄGNIĘCIA', w / 2, h * 0.11, Math.max(26, Math.min(52, w / 20)), wejscie);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `italic ${Math.max(13, Math.min(18, w / 64))}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.8 * wejscie);
    ctx.fillText(`zdobyte ${OSIAGNIECIA.filter((o) => maja.has(o.id)).length} z ${OSIAGNIECIA.length}`, w / 2, h * 0.11 + Math.max(22, Math.min(36, w / 34)));

    // spis: dwie kolumny na szerokim ekranie, jedna na wąskim; pismo maleje, aż się zmieści
    const kolumn = w >= 560 ? 2 : 1;
    const wierszy = Math.ceil(OSIAGNIECIA.length / kolumn);
    const gora = h * 0.11 + Math.max(48, Math.min(72, w / 18));
    const dol = h * 0.78;
    const szerKol = Math.min(460, (w - 48) / kolumn - 16);
    let rozmiar = Math.max(11, Math.min(19, w / 60));
    while (rozmiar > 9 && wierszy * rozmiar * 2.6 > dol - gora) rozmiar -= 0.5;
    const wiersz = (dol - gora) / wierszy;
    // bardzo niskie okno: same nazwy — opis i tak przeczytasz w większym
    const zOpisem = wiersz >= rozmiar * 2.2;
    const lewy0 = w / 2 - (kolumn * szerKol + (kolumn - 1) * 32) / 2;
    ctx.textAlign = 'left';
    OSIAGNIECIA.forEach((o, i) => {
      const kol = kolumn === 2 ? (i < wierszy ? 0 : 1) : 0;
      const nr = kolumn === 2 ? (i < wierszy ? i : i - wierszy) : i;
      const x = lewy0 + kol * (szerKol + 32), y = gora + nr * wiersz + rozmiar;
      const ma = maja.has(o.id);
      const alfa = wejscie * (ma ? 1 : 0.7);
      // medalion z fresku: zdobyty w kolorze, niezdobyty wyblakły
      const r = Math.min(rozmiar * 1.15, wiersz * 0.42);
      medalion(ctx, FRESKI.medaliony[o.id] ?? 'zloto', x + r, y - rozmiar * 0.35 + (zOpisem ? rozmiar * 0.5 : 0), r, ma, wejscie);
      const tx = x + r * 2 + rozmiar * 0.6;
      ctx.font = `${rozmiar}px ${SERIF}`;
      ctx.fillStyle = rgba(ma ? BARWA.atramentMocny : BARWA.atrament, alfa);
      ctx.fillText(o.nazwa, tx, y, szerKol - (tx - x));
      if (zOpisem) {
        ctx.font = `italic ${rozmiar * 0.8}px ${SERIF}`;
        ctx.fillStyle = rgba(ma ? BARWA.zarBlady : BARWA.atramentCichy, 0.9 * alfa);
        ctx.fillText(o.opis, tx, y + rozmiar * 1.15, szerKol - (tx - x));
      }
    });

    // świat dnia: dzisiejszy wynik
    const data = dzisiaj(), wd = wynikDnia(data);
    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(13, Math.min(17, w / 66))}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.9 * wejscie);
    const opis = wd.proby === 0 ? 'jeszcze nie grany'
      : `${wd.najlepszy !== null ? `najlepszy czas ${czasGry(wd.najlepszy)}` : 'bez wygranej'} · prób ${wd.proby} · wygranych ${wd.wygrane}`;
    ctx.fillText(`Świat dnia ${data}: ${opis}`, w / 2, h * 0.84, w - 32);

    // co dalej
    this.trafienia = [];
    const dolne = h * 0.93;
    this.opcje.forEach((op, i) => {
      const ox = w / 2 + (i === 0 ? -1 : 1) * Math.min(220, w * 0.2);
      const wybrane = i === this.wybrana;
      ctx.font = `${Math.max(16, Math.min(24, w / 48))}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, wybrane ? 0.98 : 0.7);
      ctx.fillText(op.etykieta, ox, dolne);
      const szer = ctx.measureText(op.etykieta).width;
      if (wybrane) {
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5);
        ctx.lineWidth = 1.2;
        kreska(ctx, ox - szer / 2 - 6, dolne + 10, ox + szer / 2 + 6, dolne + 10, 1, 16);
      }
      this.trafienia.push({ x: ox - szer / 2 - 16, y: dolne - 26, w: szer + 32, h: 44, id: op.id });
    });
  }

  private uruchom(id: string): void {
    if (id === 'dnia') this.app.idz('gra', { tryb: 'dnia' });
    else this.app.idz('menu');
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const traf = this.trafienia.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (!traf) return;
    if (faza === 'ruch') { this.wybrana = this.opcje.findIndex((o) => o.id === traf.id); return; }
    if (faza === 'dol') this.uruchom(traf.id);
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { this.wybrana = 1 - this.wybrana; return; }
    if (e.key === 'Enter' || e.key === ' ') { this.uruchom(this.opcje[this.wybrana].id); return; }
    if (akcja === 'menu') this.app.idz('menu');
  }
}
