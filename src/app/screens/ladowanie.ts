import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, tloSadzy } from '../../render/ink';
import { ramaRyciny, kartusz, dopasujKartusz } from '../../render/ozdoby';
import { rysujSerce, tetnoRdzenia } from '../../render/rdzen';
import { ekran } from '../../core/settings-store';
import { LADOWANIE as L } from '../../nastawy/ekran';

/** Jeden krok ładowania: napis dla gracza i robota (może być asynchroniczna). */
export interface Etap { nazwa: string; zrob: () => void | Promise<void>; }

/**
 * Ekran ładowania. Najpierw mierzy ekran i ustawia skalę (to robi App przy starcie),
 * potem po jednym etapie na klatkę: kroje pisma, świat, ekrany, ryciny, tablice.
 * Obraz: przekrój góry, przez który złota kreska drąży szyb w dół — gdy dojdzie
 * do rdzenia, rdzeń zaczyna bić i gra przechodzi do menu.
 */
export class EkranLadowania implements Ekran {
  nazwa = 'ladowanie';
  private zrobione = 0;
  private biezacy = '';
  private pracuje = false;
  private start = 0;
  private koniecOd = 0;
  private blad = '';

  constructor(private app: Kontekst, private etapy: Etap[], private potem: () => void) {}

  wejdz(): void { this.start = performance.now(); }

  /** Ułamek postępu 0..1. */
  get postep(): number { return this.etapy.length ? this.zrobione / this.etapy.length : 1; }

  krok(_dt: number, teraz: number): void {
    if (this.blad) return;
    if (this.zrobione >= this.etapy.length) {
      // gotowe: nie znikamy szybciej niż minimalny czas i dajemy chwilę na wygaszenie
      if (!this.koniecOd) this.koniecOd = Math.max(teraz, this.start + L.minCzasMs);
      if (teraz >= this.koniecOd + L.wygaszenieMs) this.potem();
      return;
    }
    if (this.pracuje) return;
    // jeden etap na klatkę: ekran zdąży się narysować, a pasek naprawdę idzie
    const e = this.etapy[this.zrobione];
    this.biezacy = e.nazwa;
    this.pracuje = true;
    Promise.resolve()
      .then(() => e.zrob())
      .then(() => { this.zrobione++; this.pracuje = false; })
      .catch((err: unknown) => { this.blad = `${e.nazwa}: ${err instanceof Error ? err.message : String(err)}`; });
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    tloSadzy(ctx, w, h, teraz);
    const wyg = this.koniecOd ? Math.max(0, Math.min(1, (teraz - this.koniecOd) / L.wygaszenieMs)) : 0;
    const alfa = 1 - wyg;
    const k = Math.min(w, h);

    // tytuł — dopasowany do szerokości ekranu
    const rt0 = Math.max(26, Math.min(96, Math.min(w / 10, h / 7)));
    const rt = dopasujKartusz(ctx, L.tytul, rt0, w * 0.86);
    kartusz(ctx, w / 2, h * 0.17 + rt * 0.4, L.tytul, rt, alfa);

    // przekrój góry: kontur, szyb i rdzeń na dnie
    const cx = w / 2, gy = h * 0.34, dy = h * 0.8;
    const szer = Math.min(w * 0.7, k * 0.9);
    const R = Math.max(10, k * 0.035);
    const ry = dy - R * 1.6;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = rgba(BARWA.atrament, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = cx - szer / 2 + t * szer;
      const s = Math.max(Math.exp(-(((t - 0.56) / 0.2) ** 2)), 0.72 * Math.exp(-(((t - 0.3) / 0.16) ** 2)));
      const y = dy - (s * 0.85 + 0.1) * (dy - gy) * Math.sin(t * Math.PI) ** 0.6;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // warstwy skały
    ctx.strokeStyle = rgba(BARWA.atrament, 0.14);
    for (let l = 1; l <= 4; l++) {
      const y = gy + (dy - gy) * (0.2 + l * 0.16);
      ctx.beginPath(); ctx.moveTo(cx - szer * 0.42, y); ctx.bezierCurveTo(cx - szer * 0.1, y - 6, cx + szer * 0.1, y + 6, cx + szer * 0.42, y); ctx.stroke();
    }
    // szyb: przerywana droga od szczytu do rdzenia, złota do miejsca, gdzie jest postęp
    const punkty: [number, number][] = [
      [cx + szer * 0.06, gy + (dy - gy) * 0.12], [cx - szer * 0.08, gy + (dy - gy) * 0.35],
      [cx + szer * 0.07, gy + (dy - gy) * 0.55], [cx - szer * 0.03, gy + (dy - gy) * 0.72], [cx, ry - R * 1.3],
    ];
    const plynny = Math.min(this.postep + (this.pracuje ? 0.5 / Math.max(1, this.etapy.length) : 0), 1);
    const ile = plynny * (punkty.length - 1);
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = rgba(BARWA.atramentCichy, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); punkty.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.95);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(punkty[0][0], punkty[0][1]);
    let gx = punkty[0][0], gyy = punkty[0][1];
    for (let i = 1; i < punkty.length; i++) {
      const f = Math.max(0, Math.min(1, ile - (i - 1)));
      if (f <= 0) break;
      gx = punkty[i - 1][0] + (punkty[i][0] - punkty[i - 1][0]) * f;
      gyy = punkty[i - 1][1] + (punkty[i][1] - punkty[i - 1][1]) * f;
      ctx.lineTo(gx, gyy);
    }
    ctx.stroke();
    // grot kilofa na czole szybu
    ctx.fillStyle = rgba(BARWA.zar, 0.6 + 0.4 * Math.sin(teraz * 0.01));
    ctx.beginPath(); ctx.arc(gx, gyy, 3, 0, Math.PI * 2); ctx.fill();
    // skorupa i rdzeń: bije dopiero, gdy wszystko gotowe
    ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, ry, R * 1.7, 0, Math.PI * 2); ctx.stroke();
    const gotowe = this.zrobione >= this.etapy.length;
    const uderz = gotowe ? tetnoRdzenia(teraz) : 0.15;
    const halo = ctx.createRadialGradient(cx, ry, 0, cx, ry, R * 5);
    halo.addColorStop(0, `rgba(255,120,80,${(gotowe ? 0.45 : 0.18) + 0.15 * uderz})`);
    halo.addColorStop(1, 'rgba(120,20,20,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - R * 5, ry - R * 5, R * 10, R * 10);
    rysujSerce(ctx, cx, ry, R * (1 + 0.05 * uderz), uderz, gotowe);
    ctx.restore();

    // napis etapu i procent — pod rdzeniem, zawsze w obrębie ramy
    const rozm = Math.max(12, Math.min(20, k / 34));
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.textAlign = 'center';
    ctx.font = `italic ${rozm}px ${SERIF}`;
    ctx.fillStyle = rgba(this.blad ? BARWA.krewJasna : BARWA.atrament, 0.9);
    const napis = this.blad || (gotowe ? L.gotowe : `${this.biezacy}…`);
    const ny = Math.min(h - rozm * 3.6, dy + rozm * 1.8);
    ctx.fillText(napis, w / 2, ny, w * 0.86);
    ctx.font = `${rozm * 0.8}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
    const skala = ekran.skala.toFixed(2).replace('.', ',');
    ctx.fillText(`${Math.round(this.postep * 100)}% · ekran ${Math.round(innerWidth)}×${Math.round(innerHeight)} · skala ${skala}`, w / 2, ny + rozm * 1.5, w * 0.86);
    ctx.restore();

    ramaRyciny(ctx, w, h, alfa, w < 700 ? 'Trzewia' : 'Trzewia · góra się budzi', w < 700 ? '' : 'Tab. 0 — zanim otworzysz oczy');
    void this.app;
  }
}
