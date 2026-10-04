import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { Tajemnica } from '../../render/tajemnica';
import { Frontyspis } from '../../render/frontyspis';
import { ramaRyciny, kartusz, przerywnik, znakPozycji, rzymska, ramaKarty } from '../../render/ozdoby';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, tloSadzy, kreska } from '../../render/ink';
import { hasSave } from '../../core/save';
import { ustawienia, ustaw } from '../../core/settings-store';
import { TELEFON } from '../../nastawy/ekran';
import { MENU as M } from '../../nastawy/wyglad/menu';
import { RAMA, KARTUSZ } from '../../nastawy/wyglad/ozdoby';
import { GORA } from '../../nastawy/gora';
import { RYTUAL } from '../../nastawy/rytual';

type Trudnosc = typeof ustawienia.trudnosc;
/** Poziomy trudności w oknie „Nowa gra”, od najłagodniejszego. */
const TRUDNOSCI: Trudnosc[] = ['łaskawa', 'surowa', 'koszmar'];
const proc = (v: number): string => `${Math.round(v * 100)}%`;

/** Opis poziomu — liczby prosto z nastaw, żeby okno nie kłamało po strojeniu balansu. */
function opisTrudnosci(t: Trudnosc): string {
  if (t === 'łaskawa') return `Sen przychodzi o ${proc(1 - GORA.laskawaSen)} wolniej, skorupa pęka o ${proc(RYTUAL.laskawaMnoznik - 1)} szybciej, a na start masz ${GORA.laskawaKrew} krwi więcej. Na pierwsze partie.`;
  if (t === 'koszmar') return `Sen przychodzi o ${proc(GORA.koszmarSen - 1)} szybciej, skorupa pęka o ${proc(1 - RYTUAL.koszmarMnoznik)} wolniej, na start masz ${GORA.koszmarKrew} krwi mniej, a dług u głębi boli bardziej.`;
  return 'Góra bez ulg: sen, skorupa i krew takie, jakie są. Dla tych, którzy znają już drogę do rdzenia.';
}

/** Wewnętrzny odstęp od ramy (piksele). */
const marginesRamy = (w: number): number => Math.max(RAMA.margines.min, Math.min(RAMA.margines.max, w * RAMA.margines.czesc));
/** Gdzie kończy się podtytuł pod wstęgą tytułu (te same proporcje co w kartuszu). */
const dolPodtytulu = (yTytul: number, rt: number): number =>
  yTytul - rt * 0.95 + rt * KARTUSZ.wysokosc + Math.max(KARTUSZ.podtytul.min, rt * KARTUSZ.podtytul.czesc) * (KARTUSZ.podtytul.odstep + 0.4);

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
  private pylki = Array.from({ length: M.pylkow }, (_, i) => ({
    x: (i * 137.5) % 1, y: (i * 61.8) % 1, v: 0.2 + ((i * 29) % 10) / 22, r: 0.6 + ((i * 17) % 10) / 9,
  }));

  private pozycje: Pozycja[] = [
    { id: 'wroc', ...M.pozycje.wroc, aktywna: () => this.trwaGra() },
    { id: 'nowa', ...M.pozycje.nowa, aktywna: () => true },
    { id: 'dnia', ...M.pozycje.dnia, aktywna: () => true },
    { id: 'wczytaj', ...M.pozycje.wczytaj, aktywna: () => hasSave() },
    { id: 'samouczek', ...M.pozycje.samouczek, aktywna: () => true },
    { id: 'bestiariusz', ...M.pozycje.bestiariusz, aktywna: () => true },
    { id: 'osiagniecia', ...M.pozycje.osiagniecia, aktywna: () => true },
    { id: 'ustawienia', ...M.pozycje.ustawienia, aktywna: () => true },
  ];

  /** Okno „Nowa gra” z wyborem trudności (v4.1 beta) — null, gdy zamknięte. */
  private okno: { od: number; wybrana: number; wroc: boolean } | null = null;
  private trafieniaOkna: { x: number; y: number; w: number; h: number; id: string }[] = [];
  private kartaOkna = { x: 0, y: 0, w: 0, h: 0 };

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
    // po identyfikatorach, nie po numerach — numery przesunęły się, gdy doszedł „Świat dnia”
    const ind = (id: string) => this.pozycje.findIndex((p) => p.id === id);
    this.wybrana = this.trwaGra() ? ind('wroc') : ind(ustawienia.samouczekZrobiony ? 'nowa' : 'samouczek');
    if (!this.pozycje[this.wybrana].aktywna()) this.wybrana = ind('nowa');
    this.okno = null;
    // „Nowa gra” z ekranu końcowego albo po samouczku: menu wita od razu oknem trudności
    if ((dane as { nowaGra?: boolean } | undefined)?.nowaGra) { this.wybrana = ind('nowa'); this.otworzOkno(); }
  }

  // ---------------------------------------------------------- okno „Nowa gra”

  private otworzOkno(): void {
    const i = TRUDNOSCI.indexOf(ustawienia.trudnosc);
    this.okno = { od: performance.now(), wybrana: i >= 0 ? i : 0, wroc: false };
    this.trafieniaOkna = [];
  }

  private zamknijOkno(): void {
    this.okno = null;
    this.trafieniaOkna = [];
  }

  /** Zapamiętuje poziom (zostaje też w ustawieniach) i zaczyna nową górę. */
  private zacznij(t: Trudnosc): void {
    this.app.gesty.klik();
    ustaw('trudnosc', t);
    this.okno = null;
    this.app.idz('gra', { tryb: 'nowa' });
  }

  private rysujOkno(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const o = this.okno!;
    const K = M.oknoTrudnosci;
    const a = Math.min(1, (teraz - o.od) / K.wejscieMs);
    ctx.save();
    ctx.fillStyle = `rgba(6,4,4,${K.przyciemnienie * a})`;
    ctx.fillRect(0, 0, w, h);
    const cw = Math.min(620, w - 32);
    const pad = Math.max(14, cw * 0.05);
    const opisy = TRUDNOSCI.map(opisTrudnosci);
    // pytanie, trzy poziomy (nazwa i opis), „Wróć” — pismo maleje, aż karta zmieści się w oknie
    let r = Math.max(15, Math.min(24, cw / 21, h / 24));
    let linie: number[] = [], lh = 0, wiersze: number[] = [], ch = 0;
    for (let k = 0; k < 16; k++) {
      lh = r * 0.72 * 1.35;
      ctx.font = `italic ${r * 0.72}px ${SERIF}`;
      linie = opisy.map((t) => this.linie(ctx, t, cw - pad * 2.2 - r * 1.3));
      wiersze = linie.map((n) => r * 1.6 + n * lh);
      ch = r * 3.0 + wiersze.reduce((s, x) => s + x + r * 0.3, 0) + r * 2.0;
      if (ch <= h - 24 || r <= 11) break;
      r *= 0.93;
    }
    const x = (w - cw) / 2, y = Math.max(12, (h - ch) / 2);
    this.kartaOkna = { x, y, w: cw, h: ch };
    ramaKarty(ctx, x, y, cw, ch, a, K.tytul, true);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = `italic ${r * 0.9}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.9 * a);
    ctx.fillText(K.pytanie, w / 2, y + r * 2.0, cw - pad * 2);
    this.trafieniaOkna = [];
    let yy = y + r * 3.0;
    TRUDNOSCI.forEach((t, i) => {
      const bx = x + pad * 0.6, bw = cw - pad * 1.2, hw = wiersze[i];
      const wybrane = !o.wroc && i === o.wybrana;
      if (wybrane) {
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.07 * a);
        ctx.fillRect(bx, yy, bw, hw);
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.65 * a);
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, yy + 0.5, bw - 1, hw - 1);
      }
      // numer (skrót klawisza), nazwa poziomu i znacznik ostatniego wyboru
      ctx.textAlign = 'left';
      ctx.font = `${r * 0.62}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.zarBlady : BARWA.atramentCichy, 0.9 * a);
      ctx.fillText(rzymska(i + 1), bx + pad * 0.5, yy + r * 1.15);
      const nx = bx + pad * 0.5 + r * 1.3;
      ctx.font = `${r}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, (wybrane ? 1 : 0.85) * a);
      ctx.fillText(K.etykiety[t], nx, yy + r * 1.2);
      if (t === ustawienia.trudnosc) {
        ctx.textAlign = 'right';
        ctx.font = `italic ${r * 0.62}px ${SERIF}`;
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.75 * a);
        ctx.fillText(K.ostatnio, bx + bw - pad * 0.5, yy + r * 1.15);
      }
      ctx.font = `italic ${r * 0.72}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, (wybrane ? 0.92 : 0.7) * a);
      this.akapit(ctx, opisy[i], nx, yy + r * 1.2 + lh, bw - (nx - bx) - pad * 0.5, lh, 'left');
      this.trafieniaOkna.push({ x: bx, y: yy, w: bw, h: hw, id: t });
      yy += hw + r * 0.3;
    });
    // stopka: „Wróć”, a na szerokim oknie podpowiedź klawiszy
    const yw = y + ch - r * 0.95;
    ctx.textAlign = 'center';
    ctx.font = `${r * 0.85}px ${SERIF}`;
    ctx.fillStyle = rgba(o.wroc ? BARWA.atramentMocny : BARWA.atrament, (o.wroc ? 1 : 0.75) * a);
    ctx.fillText(K.wroc, w / 2, yw);
    const sw = ctx.measureText(K.wroc).width;
    if (o.wroc) {
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.6 * a);
      ctx.lineWidth = 1.1;
      kreska(ctx, w / 2 - sw / 2, yw + r * 0.3, w / 2 + sw / 2, yw + r * 0.3, 0.9, 14);
    }
    this.trafieniaOkna.push({ x: w / 2 - sw / 2 - 16, y: yw - r * 1.1, w: sw + 32, h: r * 1.6, id: 'wroc' });
    if (cw >= 580) {
      ctx.textAlign = 'right';
      ctx.font = `italic ${r * 0.55}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6 * a);
      ctx.fillText(K.podpowiedz, x + cw - pad, yw);
    }
    ctx.restore();
  }

  private dotykOkna(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const o = this.okno!;
    const traf = this.trafieniaOkna.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (faza === 'ruch') {
      o.wroc = traf?.id === 'wroc';
      if (traf && !o.wroc) o.wybrana = TRUDNOSCI.indexOf(traf.id as Trudnosc);
      return;
    }
    if (faza !== 'dol') return;
    if (!traf) {
      // dotknięcie obok karty zamyka okno, jak w każdym oknie dialogowym
      const k = this.kartaOkna;
      if (e.clientX < k.x || e.clientX > k.x + k.w || e.clientY < k.y || e.clientY > k.y + k.h) this.zamknijOkno();
      return;
    }
    if (traf.id === 'wroc') { this.app.gesty.klik(); this.zamknijOkno(); return; }
    this.zacznij(traf.id as Trudnosc);
  }

  private klawiszOkna(akcja: Akcja | null, e: KeyboardEvent): void {
    const o = this.okno!;
    const n = TRUDNOSCI.length;
    if (e.key === 'ArrowDown') { o.wybrana = o.wroc ? 0 : (o.wybrana + 1) % n; o.wroc = false; return; }
    if (e.key === 'ArrowUp') { o.wybrana = o.wroc ? n - 1 : (o.wybrana + n - 1) % n; o.wroc = false; return; }
    if (e.key >= '1' && e.key <= String(n)) { this.zacznij(TRUDNOSCI[Number(e.key) - 1]); return; }
    if (e.key === 'Enter' || e.key === ' ') { if (o.wroc) this.zamknijOkno(); else this.zacznij(TRUDNOSCI[o.wybrana]); return; }
    if (akcja === 'menu' || e.key === 'Escape' || e.key === 'Backspace') this.zamknijOkno();
  }

  krok(): void { /* rycina żyje własnym zegarem */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const wejscie = Math.min(1, (teraz - this.wejscieOd) / M.wejscieMs);
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    const czas = ruch ? teraz : 0;
    tloSadzy(ctx, w, h, czas);
    // układ pionowy także na tablecie trzymanym pionowo — szeroki wciskał spis w róg
    // (telefon trzymany poziomo, np. 640×360, zostaje przy układzie szerokim — pionowy spis
    // nie mieścił się w 360 px wysokości)
    const waski = h > w * M.pionowyOd || (w < M.waskiPonizej && h >= w);
    if (waski) this.ukladWaski(ctx, w, h, czas, wejscie);
    else this.ukladSzeroki(ctx, w, h, czas, wejscie);
    // patyna i rytowana ciemność na brzegach — ta sama, co na płycie w grze
    this.tajemnica.brzegi(ctx, { x: 0, y: 0, w, h }, ruch ? 0.5 + 0.5 * Math.sin(teraz * 0.0006) : 0.5);
    this.kurz(ctx, w, h, czas);
    ramaRyciny(ctx, w, h, wejscie, waski ? M.ramaGoraWaski : M.ramaGora, waski ? M.ramaDolWaski : M.ramaDol);
    this.stopka(ctx, w, h, teraz, wejscie);
    if (this.okno) this.rysujOkno(ctx, w, h, teraz);
  }

  private kurz(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    ctx.save();
    for (const p of this.pylki) {
      const y = ((p.y + (teraz * 0.000012 * p.v)) % 1);
      const x = ((p.x + Math.sin(teraz * 0.00008 + p.y * 9) * 0.01) % 1 + 1) % 1;
      ctx.fillStyle = rgba(BARWA.atrament, M.pylekAlfa + M.pylekMigotanie * Math.abs(Math.sin(teraz * 0.001 + p.x * 12)));
      ctx.beginPath();
      ctx.arc(x * w, (1 - y) * h, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Szeroki ekran: kartusz u góry, spis po lewej, przekrój góry po prawej. */
  private ukladSzeroki(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    const m = marginesRamy(w) + 14;
    // telefon poziomo: mniejszy tytuł, żeby spis zmieścił się pod nim w dużym piśmie
    const rt = h < TELEFON.niskiPonizej ? Math.min(34, h / 10)
      : Math.max(M.tytulRozmiar.min, Math.min(M.tytulRozmiar.max, Math.min(w / 11, h / 6)));
    const yTytul = h * M.tytulY + rt * 0.4;
    const podDol = dolPodtytulu(yTytul, rt);
    // przekrój góry: prawa część, od podtytułu do dolnej ramy — nigdy pod napisem
    // telefon poziomo: przekrój zaczyna się dopiero za spisem — przy 640 px wąski spis wchodził na górę
    const niskiEkran = h < TELEFON.niskiPonizej;
    let fx = w * M.przekrojX;
    if (niskiEkran) {
      ctx.save();
      ctx.font = `${M.spisRozmiar.min + 2}px ${SERIF}`;
      const najdluzsza = Math.max(...this.pozycje.map((p) => ctx.measureText(p.etykieta).width));
      ctx.restore();
      fx = Math.max(fx, m + (M.spisRozmiar.min + 2) * 2.6 + najdluzsza + 24);
    }
    const fy = Math.max(h * M.przekrojY, podDol + 6), fw = w - fx - m - w * 0.01, fh = h - fy - m - 4;
    this.frontyspis.rysuj(ctx, fx, fy, fw, fh, teraz, M.przekrojAlfa * wejscie, true);

    kartusz(ctx, w / 2, yTytul, M.tytul, rt, wejscie, '', M.podtytul);

    this.trafienia = [];
    // (numer rzymski stoi dwa pisma w lewo od tytułu — nie może wyjść poza ramę)
    let lewy = Math.max(m + w * M.spisOdLewej, m + (M.spisRozmiar.min + 2) * 2.4);
    // spis, opis i zachęta mieszczą się między podtytułem a podpowiedzią na dole;
    // na niskim ekranie spis gęstnieje, a potem pismo maleje — nic nie wchodzi na nic
    const n = this.pozycje.length;
    const ro = Math.max(M.opisRozmiar.min, Math.min(M.opisRozmiar.max, w / 72));
    const dol = h - m - 22;
    // TELEFON poziomo: bez opisu pod spisem — pozycje dostają całą wysokość i duże pismo,
    // bo to one są celem dotyku (opis wybranej i tak mówi tablica po wejściu)
    const niski = h < TELEFON.niskiPonizej;
    let rozmiar = niski ? M.spisRozmiar.min + 2 : Math.max(M.spisRozmiar.min, Math.min(M.spisRozmiar.max, Math.min(w / 48, h / 28)));
    let odstep = rozmiar * M.spisOdstep;
    const opisH = () => niski ? 0 : rozmiar * 0.6 + ro * M.opisInterlinia * 2 + (ustawienia.samouczekZrobiony ? 0 : ro * 1.6);
    let start = Math.max(h * M.spisOd, podDol + rozmiar * 1.3, Math.min(h * M.spisDo, h * 0.8 - n * odstep));
    for (let k = 0; k < 12 && start + n * odstep + opisH() > dol; k++) {
      if (odstep > rozmiar * 1.55) odstep = Math.max(rozmiar * 1.55, (dol - opisH() - start) / n);
      else { rozmiar *= 0.94; odstep = rozmiar * 1.55; }
      start = Math.max(podDol + rozmiar * 1.3, Math.min(start, dol - opisH() - n * odstep));
    }
    // v4.1 beta: przy ośmiu pozycjach numer „VIII” jest szeroki — nie może dotknąć ramy
    ctx.save();
    ctx.font = `${rozmiar * 0.62}px ${SERIF}`;
    const szerNumeru = Math.max(...this.pozycje.map((_, i) => ctx.measureText(rzymska(i + 1)).width));
    ctx.restore();
    lewy = Math.max(lewy, m + 8 + szerNumeru + rozmiar * 1.85);
    // spis wejść jak spis tablic: numer, znak, tytuł
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const wejscieP = Math.max(0.35, Math.min(1, (performance.now() - this.wejscieOd - 120 - i * M.pozycjaOpoznienie) / M.pozycjaCzas));
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      const alfa = (dostepna ? 1 : M.alfaNieaktywnej) * wejscieP;
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
    const wyb = niski ? undefined : this.pozycje[this.wybrana];
    const yOpis = start + this.pozycje.length * odstep;
    if (niski) { ctx.restore(); return; }
    przerywnik(ctx, lewy + w * 0.14, yOpis - rozmiar * 0.5, w * 0.26, wejscie);
    if (wyb) {
      ctx.font = `italic ${ro}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.9 * wejscie);
      const ostatnia = this.akapit(ctx, wyb.opis, lewy, yOpis + rozmiar * 0.6, w * M.opisSzerokosc, ro * M.opisInterlinia);
      if (!ustawienia.samouczekZrobiony) {
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.7 * wejscie);
        ctx.fillText(M.zachetaSamouczek, lewy, ostatnia + ro * 1.5);
      }
    }
    ctx.restore();
  }

  /** Telefon: kartusz u góry, spis pośrodku, przekrój góry przygaszony u dołu. */
  private ukladWaski(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, wejscie: number): void {
    const m = marginesRamy(w) + 12;
    const rt = Math.max(M.tytulWaskiRozmiar.min, Math.min(M.tytulWaskiRozmiar.max, (w - m * 2) / 9.6));
    const yTytul = h * M.tytulWaskiY;
    const podDol = dolPodtytulu(yTytul, rt);
    // układ liczony z góry na dół: tytuł, spis, opis — przekrój dostaje tylko to, co zostanie
    const n = this.pozycje.length;
    const r = Math.max(14, Math.min(20, w / 28));
    let rozmiar = Math.max(16, Math.min(26, w / 17, h / 32));
    let odstep = rozmiar * M.spisOdstepWaski;
    const opisH = r * 1.2 + r * 1.35 * 2;
    let start = Math.max(h * M.spisWaskiY, podDol + rozmiar * 1.4);
    const dol = h - m - 16;
    for (let k = 0; k < 12 && start + n * odstep + opisH > dol; k++) {
      if (odstep > rozmiar * 1.6) odstep = Math.max(rozmiar * 1.6, (dol - opisH - start) / n);
      else { rozmiar *= 0.94; odstep = rozmiar * 1.6; }
      start = Math.max(podDol + rozmiar * 1.4, Math.min(start, dol - opisH - n * odstep));
    }
    // przekrój góry pod opisem, jeśli jest na niego miejsce
    ctx.font = `italic ${r}px ${SERIF}`;
    const yOpisu = start + n * odstep + r * 1.2;
    const liniiOpisu = this.linie(ctx, this.pozycje[this.wybrana]?.opis ?? '', w * 0.8);
    const fy = yOpisu + r * 1.35 * Math.max(0, liniiOpisu - 1) + r * 1.2;
    if (h - m - fy > 90) this.frontyspis.rysuj(ctx, m, fy, w - m * 2, h - m - fy, teraz, M.przekrojWaskiAlfa * wejscie, false);
    kartusz(ctx, w / 2, yTytul, M.tytul, rt, wejscie, M.nadtytulWaski, M.podtytulWaski);
    this.trafienia = [];
    ctx.save();
    for (let i = 0; i < this.pozycje.length; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const y = start + i * odstep;
      const wybrane = i === this.wybrana;
      const alfa = (dostepna ? 1 : M.alfaNieaktywnej) * wejscie;
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
      ctx.font = `italic ${r}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(BARWA.atrament, 0.9 * wejscie);
      this.akapit(ctx, wyb.opis, w / 2, yo + r * 1.2, w * 0.8, r * 1.35, 'center');
    }
    ctx.restore();
  }

  /** Akapit łamany do szerokości; zwraca linię bazową ostatniego wiersza. */
  private akapit(ctx: CanvasRenderingContext2D, tekst: string, x: number, y: number, maxW: number, lh: number, wyr: CanvasTextAlign = 'left'): number {
    ctx.textAlign = wyr;
    let linia = '', yy = y;
    for (const s of tekst.split(' ')) {
      const test = linia ? `${linia} ${s}` : s;
      if (ctx.measureText(test).width > maxW && linia) { ctx.fillText(linia, x, yy); linia = s; yy += lh; } else linia = test;
    }
    if (linia) ctx.fillText(linia, x, yy);
    return yy;
  }

  /** Ile wierszy zajmie akapit przy bieżącym kroju. */
  private linie(ctx: CanvasRenderingContext2D, tekst: string, maxW: number): number {
    let linia = '', n = tekst ? 1 : 0;
    for (const s of tekst.split(' ')) {
      const test = linia ? `${linia} ${s}` : s;
      if (ctx.measureText(test).width > maxW && linia) { n++; linia = s; } else linia = test;
    }
    return n;
  }

  private stopka(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, alfa: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    if (this.komunikat && teraz - this.komunikatOd < M.komunikatMs) {
      ctx.font = `italic ${Math.max(14, w / 64)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.9 * Math.min(1, (M.komunikatMs - (teraz - this.komunikatOd)) / 900));
      ctx.fillText(this.komunikat, w / 2, h * 0.9);
    }
    if (w >= M.waskiPonizej && h <= w * M.pionowyOd) {
      ctx.font = `italic ${Math.max(12, w / 110)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.5 * alfa);
      ctx.textAlign = 'left';
      const m = marginesRamy(w) + 22;
      ctx.fillText(M.podpowiedz, m + w * 0.02, h - m - 4);
    }
    // wersja gry — małym drukiem w prawym dolnym rogu, w ramie
    {
      ctx.font = `italic ${Math.max(11, w / 130)}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.55 * alfa);
      ctx.textAlign = 'right';
      const m = marginesRamy(w) + 22;
      ctx.fillText(M.wersja, w - m - w * 0.02, h - m - 4);
    }
    ctx.restore();
  }

  private uruchom(i: number): void {
    const p = this.pozycje[i];
    if (!p || !p.aktywna()) return;
    this.app.gesty.klik();
    if (p.id === 'wroc') this.app.idz('gra');
    else if (p.id === 'nowa') this.otworzOkno();
    else if (p.id === 'dnia') this.app.idz('gra', { tryb: 'dnia' });
    else if (p.id === 'osiagniecia') this.app.idz('osiagniecia');
    else if (p.id === 'wczytaj') this.app.idz('gra', { tryb: 'wczytaj' });
    else if (p.id === 'samouczek') this.app.idz('samouczek');
    else if (p.id === 'bestiariusz') this.app.idz('bestiariusz');
    else if (p.id === 'ustawienia') this.app.idz('ustawienia');
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (this.okno) { this.dotykOkna(e, faza); return; }
    const traf = this.trafienia.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (!traf) return;
    if (faza === 'ruch') { this.wybrana = traf.i; return; }
    if (faza === 'dol') { this.wybrana = traf.i; this.uruchom(traf.i); }
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (this.okno) { this.klawiszOkna(akcja, e); return; }
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
