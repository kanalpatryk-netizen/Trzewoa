import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { Sim } from '../../sim/sim';
import { Camera } from '../../render/camera';
import { Engraver } from '../../render/engrave';
import { Poswiata } from '../../render/bloom';
import { drawParticles } from '../../render/overlay';
import { rysujStworzenia } from '../../render/figury';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL, kreska, naciecie } from '../../render/ink';
import { hasSave } from '../../core/save';
import { ustawienia } from '../../core/settings-store';

interface Pozycja { id: string; etykieta: string; opis: string; aktywna: () => boolean; }

/**
 * Karta tytułowa atlasu: w tle żywy przekrój góry rysowany tym samym sitodrukiem
 * co gra, na wierzchu rama płyty, tytuł i spis wejść wybity na marginesie.
 */
export class EkranMenu implements Ekran {
  nazwa = 'menu';
  private wybrana = 0;
  private komunikat = '';
  private komunikatOd = 0;
  private trafienia: { x: number; y: number; w: number; h: number; i: number }[] = [];
  private wejscieOd = 0;

  // żywe tło
  private sim = new Sim(4242);
  private cam = new Camera(1, 1);
  private eng = new Engraver();
  private poswiata = new Poswiata();
  private ostatniRys = 0;
  private pylki = Array.from({ length: 44 }, (_, i) => ({
    x: (i * 137.5) % 1, y: (i * 61.8) % 1, v: 0.2 + ((i * 29) % 10) / 22, r: 0.6 + ((i * 17) % 10) / 9,
  }));
  private celKamery = { x: 0, y: 0 };
  private w = 1; private h = 1;

  private pozycje: Pozycja[] = [
    { id: 'wroc', etykieta: 'Wróć do góry', opis: 'trwająca rozgrywka czeka tam, gdzie ją zostawiłeś', aktywna: () => this.trwaGra() },
    { id: 'nowa', etykieta: 'Obudź się', opis: 'nowa góra, nowi mieszkańcy, nowa legenda', aktywna: () => true },
    { id: 'wczytaj', etykieta: 'Wróć tam, gdzie byłeś', opis: 'ostatni zapis stanu góry', aktywna: () => hasSave() },
    { id: 'samouczek', etykieta: 'Naucz się być górą', opis: 'dwanaście scen, każda o jednej mechanice', aktywna: () => true },
    { id: 'bestiariusz', etykieta: 'Bestiariusz', opis: 'wszystkie reguły, rasy i koszty na jednej karcie', aktywna: () => true },
    { id: 'ustawienia', etykieta: 'Ustawienia', opis: 'dźwięk, obraz, świat i wszystkie klawisze', aktywna: () => true },
  ];

  constructor(private app: Kontekst) {
    for (let i = 0; i < 900; i++) this.sim.step();     // niech w tle ktoś zdąży zamieszkać
    const serce = this.sim.heartOfLife();
    if (serce) { this.cam.x = this.celKamery.x = serce.x; this.cam.y = this.celKamery.y = serce.y; }
    this.cam.zoom = 13;
  }

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

  rozmiar(w: number, h: number): void {
    this.w = w; this.h = h;
    this.cam.vw = w; this.cam.vh = h;
    this.cam.minZoom = Math.max(4, w / this.sim.world.w);
    this.cam.zoom = Math.max(this.cam.zoom, this.cam.minZoom);
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.eng.resize(w, h);
    this.poswiata.resize(w, h);
    this.ostatniRys = 0;
  }

  krok(_dt: number, teraz: number): void {
    // tło żyje własnym, wolnym życiem — a gdy zaśnie, budzi się inna góra;
    // inaczej po kwadransie w menu obraz za tytułem zamierał na zawsze
    if (this.sim.ending) {
      this.sim = new Sim(4242 + ((teraz | 0) % 9973));
      for (let i = 0; i < 900; i++) this.sim.step();
      this.ostatniRys = 0;
    }
    this.sim.step();
    if (this.sim.tick % 6 === 0) {
      const serce = this.sim.heartOfLife();
      if (serce) {
        this.celKamery.x += (serce.x - this.celKamery.x) * 0.01;
        this.celKamery.y += (serce.y - this.celKamery.y) * 0.01;
      }
      this.cam.drift(this.celKamery.x + Math.sin(teraz * 0.00006) * 6, this.celKamery.y + Math.cos(teraz * 0.00005) * 3, 0.02);
      this.cam.clamp(this.sim.world.w, this.sim.world.h);
    }
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const wejscie = Math.min(1, (teraz - this.wejscieOd) / 900);

    // --- żywe tło
    if (teraz - this.ostatniRys > 180) { this.eng.rebuild(this.sim, this.cam, teraz); this.ostatniRys = teraz; }
    ctx.fillStyle = '#0b0807';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.imageSmoothingEnabled = this.eng.scale > 1;
    ctx.drawImage(this.eng.buf, 0, 0, w, h);
    this.poswiata.nalozy(ctx, this.eng.emis, 0, 0, w, h, 0.7);
    drawParticles(ctx, this.sim, this.cam);
    rysujStworzenia(ctx, this.sim, this.cam, teraz);
    ctx.restore();

    // --- zasłona, żeby tekst miał na czym usiąść
    const zaslona = ctx.createLinearGradient(0, 0, w * 0.9, h);
    zaslona.addColorStop(0, rgba(BARWA.sadza, 0.92));
    zaslona.addColorStop(0.45, rgba(BARWA.sadza, 0.62));
    zaslona.addColorStop(1, rgba(BARWA.sadza, 0.88));
    ctx.fillStyle = zaslona;
    ctx.fillRect(0, 0, w, h);
    const wg = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    wg.addColorStop(0, 'rgba(0,0,0,0)');
    wg.addColorStop(1, 'rgba(6,4,4,0.75)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, w, h);

    // kurz w powietrzu — ledwie widoczny, ale obraz przestaje być martwy
    ctx.save();
    for (const p of this.pylki) {
      const y = ((p.y + (teraz * 0.000012 * p.v)) % 1);
      const x = ((p.x + Math.sin(teraz * 0.00008 + p.y * 9) * 0.01) % 1 + 1) % 1;
      ctx.fillStyle = rgba(BARWA.atrament, 0.05 + 0.07 * Math.sin(teraz * 0.001 + p.x * 12));
      ctx.beginPath();
      ctx.arc(x * w, (1 - y) * h, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.ramaPlyty(ctx, w, h, teraz, wejscie);
    const waski = w < 700;
    if (waski) this.ukladWaski(ctx, w, h, teraz, wejscie);
    else this.ukladSzeroki(ctx, w, h, teraz, wejscie);
  }

  /** Rama jak na rycinie: podwójna linia i nacięcia w narożnikach. */
  private ramaPlyty(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, alfa: number): void {
    const m = Math.max(16, Math.min(40, w * 0.026));
    ctx.save();
    ctx.strokeStyle = rgba(BARWA.atrament, 0.42 * alfa);
    ctx.lineWidth = 1;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    ctx.strokeStyle = rgba(BARWA.atrament, 0.18 * alfa);
    ctx.strokeRect(m - 6, m - 6, w - m * 2 + 12, h - m * 2 + 12);
    const n = 14 + Math.sin(teraz * 0.0005) * 1.5;
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.55 * alfa);
    ctx.lineWidth = 1.4;
    for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * n, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * n);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Szeroki ekran: tytuł u góry, spis wejść w lewej dolnej ćwiartce, kolofon po prawej. */
  private ukladSzeroki(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    const lewy = Math.max(60, w * 0.09);
    const tytulY = h * 0.23;
    this.tytul(ctx, w / 2, tytulY, Math.max(46, Math.min(112, Math.min(w / 10.5, h / 5.6))), wejscie, true);

    this.trafienia = [];
    const rozmiar = Math.max(17, Math.min(27, Math.min(w / 46, h / 26)));
    // pod kolumną menu kładziemy cień, żeby tekst nie leżał na ruchliwej mapie
    const cien = ctx.createLinearGradient(0, 0, w * 0.55, 0);
    cien.addColorStop(0, 'rgba(8,5,4,0.82)');
    cien.addColorStop(1, 'rgba(8,5,4,0)');
    ctx.fillStyle = cien;
    ctx.fillRect(0, h * 0.36, w * 0.55, h * 0.55);
    const odstep = rozmiar * 1.85;
    const start = Math.min(h * 0.46, h * 0.88 - this.pozycje.length * odstep);
    ctx.textAlign = 'left';

    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const wejscieP = Math.max(0.35, Math.min(1, (performance.now() - this.wejscieOd - 120 - i * 60) / 300));
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      const alfa = (dostepna ? 1 : 0.3) * wejscieP;

      ctx.font = `${rozmiar}px ${SERIF}`;
      // znak przed pozycją: mała ryta kreska, przy wybranej rozjarzona
      ctx.strokeStyle = rgba(wybrane ? BARWA.zarBlady : BARWA.atramentCichy, (wybrane ? 0.9 : 0.45) * alfa);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (wybrane) {
        ctx.moveTo(lewy - 26, y - rozmiar * 0.32);
        ctx.lineTo(lewy - 14, y - rozmiar * 0.32);
        ctx.moveTo(lewy - 20, y - rozmiar * 0.62);
        ctx.lineTo(lewy - 20, y - rozmiar * 0.02);
      } else {
        ctx.moveTo(lewy - 24, y - rozmiar * 0.32);
        ctx.lineTo(lewy - 16, y - rozmiar * 0.32);
      }
      ctx.stroke();

      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, alfa * (wybrane ? 1 : 0.78));
      ctx.fillText(p.etykieta, lewy, y);
      if (wybrane && dostepna) {
        const szer = ctx.measureText(p.etykieta).width;
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5 * alfa);
        ctx.lineWidth = 1.1;
        kreska(ctx, lewy, y + rozmiar * 0.36, lewy + szer, y + rozmiar * 0.36, 0.9, 18);
      }
      this.trafienia.push({ x: lewy - 34, y: y - rozmiar, w: Math.max(320, w * 0.34), h: rozmiar * 1.7, i });
    }

    // opis wybranej pozycji pod spisem
    const wyb = this.pozycje[this.wybrana];
    if (wyb) {
      ctx.font = `italic ${Math.max(14, Math.min(19, w / 68))}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9 * wejscie);
      ctx.fillText(wyb.opis, lewy, start + this.pozycje.length * odstep + rozmiar * 0.2);
      if (!ustawienia.samouczekZrobiony) {
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.55 * wejscie);
        ctx.fillText('Pierwszy raz? Zacznij od samouczka.', lewy, start + this.pozycje.length * odstep + rozmiar * 1.6);
      }
    }

    this.kolofon(ctx, w - Math.max(60, w * 0.09), h * 0.58, w, wejscie);
    this.stopka(ctx, w, h, teraz, wejscie);
  }

  /** Telefon: wszystko w jednej kolumnie, ale wciąż z ramą i kolofonem. */
  private ukladWaski(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    this.tytul(ctx, w / 2, h * 0.2, Math.max(40, w / 7.5), wejscie, false);
    this.trafienia = [];
    const rozmiar = Math.max(16, Math.min(w / 17, h / 30));
    const odstep = rozmiar * 2.1;
    const start = Math.min(h * 0.42, h * 0.86 - this.pozycje.length * odstep);
    ctx.textAlign = 'center';
    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      ctx.font = `${rozmiar}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, (dostepna ? 1 : 0.3) * (wybrane ? 1 : 0.78) * wejscie);
      ctx.fillText(p.etykieta, w / 2, y);
      if (wybrane && dostepna) {
        const szer = ctx.measureText(p.etykieta).width;
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5);
        ctx.lineWidth = 1.1;
        kreska(ctx, w / 2 - szer / 2, y + rozmiar * 0.4, w / 2 + szer / 2, y + rozmiar * 0.4, 0.9, 16);
      }
      this.trafienia.push({ x: w * 0.1, y: y - rozmiar, w: w * 0.8, h: rozmiar * 1.8, i });
    }
    const wyb = this.pozycje[this.wybrana];
    if (wyb) {
      ctx.font = `italic ${Math.max(16, w / 30)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.85 * wejscie);
      ctx.fillText(wyb.opis, w / 2, start + this.pozycje.length * odstep + rozmiar * 0.4);
    }
    this.stopka(ctx, w, h, teraz, wejscie);
  }

  private tytul(ctx: CanvasRenderingContext2D, x: number, y: number, rozmiar: number, alfa: number, ozdoby: boolean): void {
    ctx.save();
    ctx.textAlign = 'center';
    const litery = 'TRZEWIA';
    ctx.font = `600 ${rozmiar}px ${SERIF_TYTUL}`;
    // rozstrzelenie liter robimy ręcznie — canvas nie zna letter-spacing wszędzie
    const odstep = rozmiar * 0.14;
    const szerokosci = [...litery].map((c) => ctx.measureText(c).width);
    const calosc = szerokosci.reduce((a, b) => a + b, 0) + odstep * (litery.length - 1);
    let lx = x - calosc / 2;
    for (let i = 0; i < litery.length; i++) {
      ctx.fillStyle = rgba('#000000', 0.75 * alfa);
      ctx.fillText(litery[i], lx + szerokosci[i] / 2 + rozmiar * 0.02, y + rozmiar * 0.035);
      ctx.fillStyle = rgba(BARWA.atramentMocny, alfa);
      ctx.fillText(litery[i], lx + szerokosci[i] / 2, y);
      lx += szerokosci[i] + odstep;
    }

    if (ozdoby) {
      const szer = Math.min(calosc * 1.25, 900);
      ctx.strokeStyle = rgba(BARWA.atrament, 0.5 * alfa);
      ctx.lineWidth = 1;
      kreska(ctx, x - szer / 2, y - rozmiar * 0.95, x + szer / 2, y - rozmiar * 0.95, 0.8, 26);
      kreska(ctx, x - szer / 2, y + rozmiar * 0.42, x + szer / 2, y + rozmiar * 0.42, 0.8, 26);
      // romb pośrodku dolnej linii
      ctx.fillStyle = rgba(BARWA.atrament, 0.6 * alfa);
      ctx.beginPath();
      ctx.moveTo(x, y + rozmiar * 0.42 - 5);
      ctx.lineTo(x + 5, y + rozmiar * 0.42);
      ctx.lineTo(x, y + rozmiar * 0.42 + 5);
      ctx.lineTo(x - 5, y + rozmiar * 0.42);
      ctx.closePath();
      ctx.fill();
    }

    ctx.font = `italic ${Math.max(14, rozmiar * 0.2)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.78 * alfa);
    ctx.fillText('Nie grasz bogiem, który rządzi podziemiem. Grasz podziemiem.', x, y + rozmiar * 0.78);
    ctx.restore();
  }

  /** Kolofon: podpis pod ryciną, taki jak w atlasach — dodaje wiary w dokument. */
  private kolofon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alfa: number): void {
    const rozmiar = Math.max(14, Math.min(16, w / 92));
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = `${rozmiar}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.75 * alfa);
    const zywi = this.sim.creatures.reduce((n, c) => n + (c.dead ? 0 : 1), 0);
    const linie = [
      'RYCINA I — PRZEKRÓJ',
      `góra ${this.sim.world.w} × ${this.sim.world.h} kafli`,
      `w tej chwili żyje w niej ${zywi}`,
      `pokoleń minęło: ${Math.floor(this.sim.tick / 6000)}`,
    ];
    linie.forEach((l, i) => ctx.fillText(l, x, y + i * rozmiar * 1.6));
    naciecie(ctx, x - 70, y - rozmiar * 1.3, 140, 0.25 * alfa);
    ctx.restore();
  }

  private stopka(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, alfa: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    if (this.komunikat && teraz - this.komunikatOd < 8000) {
      ctx.font = `italic ${Math.max(14, w / 64)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.85 * Math.min(1, (8000 - (teraz - this.komunikatOd)) / 900));
      ctx.fillText(this.komunikat, w / 2, h * 0.9);
    }
    ctx.font = `italic ${Math.max(14, w / 96)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.4 * alfa);
    ctx.fillText('strzałki i enter · albo po prostu dotknij', w / 2, h * 0.94);
    ctx.restore();
  }

  private uruchom(i: number): void {
    const p = this.pozycje[i];
    if (!p || !p.aktywna()) return;
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
    void this.w; void this.h;
  }
}
