import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { Tajemnica } from '../../render/tajemnica';
import { Frontyspis } from '../../render/frontyspis';
import { ramaRyciny, kartusz, przerywnik, znakPozycji, rzymska } from '../../render/ozdoby';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, tloSadzy, kreska } from '../../render/ink';
import { hasSave } from '../../core/save';
import { ustawienia } from '../../core/settings-store';

interface Pozycja { id: string; etykieta: string; opis: string; aktywna: () => boolean; }

/**
 * Frontyspis atlasu: rama z podziałką i napisami na marginesie, kartusz z tytułem,
 * anatomiczny przekrój góry z bijącym rdzeniem i spis wejść jak spis tablic w księdze.
 * Wcześniej w tle żyła prawdziwa symulacja — ruchliwa i jaskrawa; rycina mówi
 * od pierwszego spojrzenia, o co w tej grze chodzi: tam, na dnie, jest rdzeń.
 */
export class EkranMenu implements Ekran {
  nazwa = 'menu';
  private wybrana = 0;
  private komunikat = '';
  private komunikatOd = 0;
  private trafienia: { x: number; y: number; w: number; h: number; i: number }[] = [];
  private wejscieOd = 0;
  private tajemnica = new Tajemnica();
  private frontyspis = new Frontyspis();
  private pylki = Array.from({ length: 44 }, (_, i) => ({
    x: (i * 137.5) % 1, y: (i * 61.8) % 1, v: 0.2 + ((i * 29) % 10) / 22, r: 0.6 + ((i * 17) % 10) / 9,
  }));

  private pozycje: Pozycja[] = [
    { id: 'wroc', etykieta: 'Wróć do góry', opis: 'trwająca rozgrywka czeka tam, gdzie ją zostawiłeś', aktywna: () => this.trwaGra() },
    { id: 'nowa', etykieta: 'Obudź się', opis: 'nowa góra, nowi mieszkańcy, nowa legenda', aktywna: () => true },
    { id: 'wczytaj', etykieta: 'Wróć tam, gdzie byłeś', opis: 'ostatni zapis stanu góry', aktywna: () => hasSave() },
    { id: 'samouczek', etykieta: 'Naucz się być górą', opis: 'cztery plansze wstępu i dziesięć krótkich lekcji — palec pokazuje, gdzie kliknąć', aktywna: () => true },
    { id: 'bestiariusz', etykieta: 'Atlas', opis: 'tablice ras i praw góry — odkrywasz je, grając', aktywna: () => true },
    { id: 'ustawienia', etykieta: 'Ustawienia', opis: 'dźwięk, obraz, świat i wszystkie klawisze', aktywna: () => true },
  ];

  constructor(private app: Kontekst) {}

  private trwaGra(): boolean {
    const gra = this.app.ekran('gra') as { sim?: { tick: number; ending: string | null } } | undefined;
    return !!gra?.sim && gra.sim.tick > 0 && !gra.sim.ending;
  }

  wejdz(dane?: unknown): void {
    this.wejscieOd = performance.now();
    this.app.muzyka.ustawScene('menu');
    this.app.muzyka.ustawNapiecie(0);
    const k = (dane as { komunikat?: string } | undefined)?.komunikat;
    if (k) { this.komunikat = k; this.komunikatOd = performance.now(); }
    this.wybrana = this.trwaGra() ? 0 : (ustawienia.samouczekZrobiony ? 1 : 3);
    if (!this.pozycje[this.wybrana].aktywna()) this.wybrana = 1;
  }

  krok(): void { /* rycina żyje własnym zegarem */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const wejscie = Math.min(1, (teraz - this.wejscieOd) / 900);
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    const czas = ruch ? teraz : 0;
    tloSadzy(ctx, w, h, czas);
    const waski = w < 700;
    if (waski) this.ukladWaski(ctx, w, h, czas, wejscie);
    else this.ukladSzeroki(ctx, w, h, czas, wejscie);
    // patyna i rytowana ciemność na brzegach — ta sama, co na płycie w grze
    this.tajemnica.brzegi(ctx, { x: 0, y: 0, w, h }, ruch ? 0.5 + 0.5 * Math.sin(teraz * 0.0006) : 0.5);
    this.kurz(ctx, w, h, czas);
    ramaRyciny(ctx, w, h, wejscie, waski ? 'Trzewia' : 'Trzewia · anatomia góry, która śni', waski ? 'Tab. I' : 'Tab. I — przekrój góry z rdzeniem');
    this.stopka(ctx, w, h, teraz, wejscie);
  }

  private kurz(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    ctx.save();
    for (const p of this.pylki) {
      const y = ((p.y + (teraz * 0.000012 * p.v)) % 1);
      const x = ((p.x + Math.sin(teraz * 0.00008 + p.y * 9) * 0.01) % 1 + 1) % 1;
      ctx.fillStyle = rgba(BARWA.atrament, 0.05 + 0.07 * Math.abs(Math.sin(teraz * 0.001 + p.x * 12)));
      ctx.beginPath();
      ctx.arc(x * w, (1 - y) * h, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Szeroki ekran: kartusz u góry, spis po lewej, przekrój góry po prawej. */
  private ukladSzeroki(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    const m = Math.max(12, Math.min(34, w * 0.024)) + 14;
    // przekrój góry: prawa część, od kartusza do dolnej ramy
    const fx = w * 0.4, fy = h * 0.27, fw = w - fx - m - w * 0.01, fh = h - fy - m - 4;
    this.frontyspis.rysuj(ctx, fx, fy, fw, fh, teraz, 0.95 * wejscie, true);

    const rt = Math.max(46, Math.min(104, Math.min(w / 11, h / 6)));
    kartusz(ctx, w / 2, h * 0.16 + rt * 0.4, 'TRZEWIA', rt, wejscie, '',
      'Nie grasz bogiem, który rządzi podziemiem. Grasz podziemiem.');

    this.trafienia = [];
    const lewy = m + w * 0.05;
    const rozmiar = Math.max(17, Math.min(26, Math.min(w / 48, h / 28)));
    const odstep = rozmiar * 1.95;
    const start = Math.max(h * 0.36, Math.min(h * 0.42, h * 0.8 - this.pozycje.length * odstep));
    // spis wejść jak spis tablic: numer, znak, tytuł
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const wejscieP = Math.max(0.35, Math.min(1, (performance.now() - this.wejscieOd - 120 - i * 70) / 320));
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      const alfa = (dostepna ? 1 : 0.32) * wejscieP;
      // numer rzymski
      ctx.font = `${rozmiar * 0.62}px ${SERIF}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = rgba(wybrane ? BARWA.zarBlady : BARWA.atramentCichy, (wybrane ? 0.95 : 0.6) * alfa);
      ctx.fillText(rzymska(i + 1), lewy - rozmiar * 1.85, y - rozmiar * 0.05);
      // znak pozycji w kółku
      const ix = lewy - rozmiar * 0.95, iy = y - rozmiar * 0.33;
      ctx.strokeStyle = rgba(wybrane ? BARWA.zarBlady : BARWA.atrament, (wybrane ? 0.95 : 0.5) * alfa);
      ctx.lineWidth = wybrane ? 1.4 : 1;
      ctx.beginPath(); ctx.arc(ix, iy, rozmiar * 0.62, 0, Math.PI * 2); ctx.stroke();
      znakPozycji(ctx, p.id, ix, iy, rozmiar * 0.34);
      // tytuł
      ctx.textAlign = 'left';
      ctx.font = `${rozmiar}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, alfa * (wybrane ? 1 : 0.8));
      ctx.fillText(p.etykieta, lewy + rozmiar * 0.2, y);
      if (wybrane && dostepna) {
        const szer = ctx.measureText(p.etykieta).width;
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.6 * alfa);
        ctx.lineWidth = 1.1;
        kreska(ctx, lewy + rozmiar * 0.2, y + rozmiar * 0.36, lewy + rozmiar * 0.2 + szer, y + rozmiar * 0.36, 0.9, 18);
        // żarzący się wskaźnik po prawej, jak odnośnik na rycinie
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.6 + 0.4 * Math.sin(teraz * 0.004));
        ctx.beginPath(); ctx.arc(lewy + rozmiar * 0.2 + szer + rozmiar * 0.7, y - rozmiar * 0.33, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      this.trafienia.push({ x: lewy - rozmiar * 2.4, y: y - rozmiar * 1.1, w: Math.max(320, w * 0.32), h: rozmiar * 1.8, i });
    }
    // opis wybranej pozycji pod spisem, oddzielony przerywnikiem
    const wyb = this.pozycje[this.wybrana];
    const yOpis = start + this.pozycje.length * odstep;
    przerywnik(ctx, lewy + w * 0.14, yOpis - rozmiar * 0.5, w * 0.26, wejscie);
    if (wyb) {
      ctx.font = `italic ${Math.max(14, Math.min(18, w / 72))}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.9 * wejscie);
      this.akapit(ctx, wyb.opis, lewy, yOpis + rozmiar * 0.6, w * 0.3, Math.max(14, Math.min(18, w / 72)) * 1.4);
      if (!ustawienia.samouczekZrobiony) {
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.7 * wejscie);
        ctx.fillText('Pierwszy raz? Zacznij od samouczka.', lewy, yOpis + rozmiar * 2.7);
      }
    }
    ctx.restore();
  }

  /** Telefon: kartusz u góry, spis pośrodku, przekrój góry przygaszony u dołu. */
  private ukladWaski(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    const m = Math.max(12, Math.min(34, w * 0.024)) + 12;
    this.frontyspis.rysuj(ctx, m, h * 0.58, w - m * 2, h * 0.4 - m, teraz, 0.55 * wejscie, false);
    const zaslona = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.8);
    zaslona.addColorStop(0, 'rgba(11,8,7,0.2)');
    zaslona.addColorStop(0.6, 'rgba(11,8,7,0.8)');
    zaslona.addColorStop(1, 'rgba(11,8,7,0.2)');
    ctx.fillStyle = zaslona;
    ctx.fillRect(0, h * 0.25, w, h * 0.55);
    kartusz(ctx, w / 2, h * 0.15, 'TRZEWIA', Math.max(28, Math.min(56, (w - m * 2) / 9.6)), wejscie, 'anatomia góry',
      'Grasz podziemiem.');
    this.trafienia = [];
    const rozmiar = Math.max(16, Math.min(w / 17, h / 32));
    const odstep = rozmiar * 2.05;
    const start = h * 0.33;
    ctx.save();
    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      const alfa = (dostepna ? 1 : 0.32) * wejscie;
      ctx.font = `${rozmiar}px ${SERIF}`;
      ctx.textAlign = 'center';
      const szer = ctx.measureText(p.etykieta).width;
      ctx.strokeStyle = rgba(wybrane ? BARWA.zarBlady : BARWA.atrament, (wybrane ? 0.95 : 0.45) * alfa);
      ctx.lineWidth = 1;
      znakPozycji(ctx, p.id, w / 2 - szer / 2 - rozmiar * 0.9, y - rozmiar * 0.33, rozmiar * 0.32);
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, alfa * (wybrane ? 1 : 0.8));
      ctx.fillText(p.etykieta, w / 2, y);
      if (wybrane && dostepna) {
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.6);
        ctx.lineWidth = 1.1;
        kreska(ctx, w / 2 - szer / 2, y + rozmiar * 0.4, w / 2 + szer / 2, y + rozmiar * 0.4, 0.9, 16);
      }
      this.trafienia.push({ x: w * 0.08, y: y - rozmiar * 1.1, w: w * 0.84, h: rozmiar * 1.8, i });
    }
    const wyb = this.pozycje[this.wybrana];
    if (wyb) {
      const yo = start + this.pozycje.length * odstep;
      przerywnik(ctx, w / 2, yo - rozmiar * 0.4, w * 0.5, wejscie);
      const r = Math.max(14, w / 28);
      ctx.font = `italic ${r}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(BARWA.atrament, 0.9 * wejscie);
      this.akapit(ctx, wyb.opis, w / 2, yo + r * 1.2, w * 0.8, r * 1.35, 'center');
    }
    ctx.restore();
  }

  private akapit(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, maxW: number, lh: number, wyr: CanvasTextAlign = 'left'): void {
    ctx.textAlign = wyr;
    let linia = '', yy = y;
    for (const s of tekst.split(' ')) {
      const test = linia ? `${linia} ${s}` : s;
      if (ctx.measureText(test).width > maxW && linia) { ctx.fillText(linia, x, yy); linia = s; yy += lh; } else linia = test;
    }
    if (linia) ctx.fillText(linia, x, yy);
  }

  private stopka(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, alfa: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    if (this.komunikat && teraz - this.komunikatOd < 8000) {
      ctx.font = `italic ${Math.max(14, w / 64)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.9 * Math.min(1, (8000 - (teraz - this.komunikatOd)) / 900));
      ctx.fillText(this.komunikat, w / 2, h * 0.9);
    }
    if (w >= 700) {
      ctx.font = `italic ${Math.max(12, w / 110)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5 * alfa);
      ctx.textAlign = 'left';
      const m = Math.max(12, Math.min(34, w * 0.024)) + 22;
      ctx.fillText('strzałki i enter · albo po prostu dotknij', m + w * 0.02, h - m - 4);
    }
    ctx.restore();
  }

  private uruchom(i: number): void {
    const p = this.pozycje[i];
    if (!p || !p.aktywna()) return;
    this.app.gesty.klik();
    if (p.id === 'wroc') this.app.idz('gra');
    else if (p.id === 'nowa') this.app.idz('gra', { tryb: 'nowa' });
    else if (p.id === 'wczytaj') this.app.idz('gra', { tryb: 'wczytaj' });
    else if (p.id === 'samouczek') this.app.idz('samouczek');
    else if (p.id === 'bestiariusz') this.app.idz('bestiariusz');
    else if (p.id === 'ustawienia') this.app.idz('ustawienia');
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const traf = this.trafienia.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (!traf) return;
    if (faza === 'ruch') { this.wybrana = traf.i; return; }
    if (faza === 'dol') { this.wybrana = traf.i; this.uruchom(traf.i); }
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    const dalej = (kier: number) => {
      let i = this.wybrana;
      for (let k = 0; k < this.pozycje.length; k++) {
        i = (i + kier + this.pozycje.length) % this.pozycje.length;
        if (this.pozycje[i].aktywna()) break;
      }
      this.wybrana = i;
    };
    if (e.key === 'ArrowDown') { dalej(1); return; }
    if (e.key === 'ArrowUp') { dalej(-1); return; }
    if (e.key === 'Enter' || e.key === ' ') { this.uruchom(this.wybrana); return; }
    if (akcja === 'menu' && this.trwaGra()) this.uruchom(0);
  }
}
