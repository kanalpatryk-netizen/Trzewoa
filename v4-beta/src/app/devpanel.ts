/**
 * OKIENKO DEWELOPERA (v4 beta) — małe, przesuwane okno z logami świata i kilkoma narzędziami.
 * Widać je tylko w trakcie gry, gdy w ustawieniach włączony jest „Tryb deweloperski”.
 * Kliknięcie wpisu z miejscem (x, y) przenosi kamerę w to miejsce.
 */
import type { Sim } from '../sim/sim';
import { DZIENNIK, DEV, zapisz, type KategoriaWpisu, type WpisDziennika } from '../sim/dziennik';
import { wymusPekniecie } from '../sim/rytual';
import { wylosuj } from '../sim/wydarzenia';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';

const KATEGORIE: { kat: KategoriaWpisu; nazwa: string; kolor: string }[] = [
  { kat: 'praca', nazwa: 'zajęcia', kolor: '#b9c4a8' },
  { kat: 'blok', nazwa: 'bloki', kolor: '#d8b27a' },
  { kat: 'zgon', nazwa: 'zgony', kolor: '#e07a6e' },
  { kat: 'narodziny', nazwa: 'narodziny', kolor: '#9fd39a' },
  { kat: 'karta', nazwa: 'karty', kolor: '#c9a6e8' },
  { kat: 'rytual', nazwa: 'rytuał', kolor: '#f2d36b' },
  { kat: 'swiat', nazwa: 'kronika', kolor: '#9fc3e0' },
];

const KARTY = ['dlug', 'przysiega', 'glod', 'klotnia', 'najazd', 'obcy', 'plemie', 'powodz', 'prorok', 'ruda', 'warta', 'wymiera', 'zaraza', 'znak', 'zyla'];

/** Tiki gry → „mm:ss” czasu gry. */
function czas(tick: number): string {
  const s = Math.floor(tick / (TIKOW_NA_MINUTE / 60));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface GraDlaPanelu {
  sim(): Sim;
  pokazMiejsce(x: number, y: number): void;
}

export class PanelDewelopera {
  private el: HTMLDivElement;
  private lista: HTMLDivElement;
  private stanTempa: HTMLSpanElement;
  private filtry = new Set<KategoriaWpisu>(KATEGORIE.map((k) => k.kat));
  private doczytane = -1;
  private widoczny = false;
  private zwiniety = false;
  private ostatnieOdswiezenie = 0;
  private ostatniSim: Sim | null = null;

  constructor(private gra: GraDlaPanelu) {
    const el = (this.el = document.createElement('div'));
    el.id = 'panel-dewelopera';
    el.style.cssText = [
      'position:fixed', 'right:12px', 'top:150px', 'width:360px', 'max-width:calc(100vw - 24px)',
      'background:rgba(16,13,10,0.92)', 'color:#e8dcc4', 'border:1px solid #6b5a40', 'border-radius:6px',
      'font:11px/1.35 ui-monospace,Consolas,monospace', 'z-index:50', 'display:none',
      'box-shadow:0 4px 18px rgba(0,0,0,0.5)', 'user-select:none',
    ].join(';');

    const pasek = document.createElement('div');
    pasek.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 8px;background:#2a2219;cursor:move;border-radius:6px 6px 0 0';
    const tytul = document.createElement('span');
    tytul.textContent = 'Dziennik dewelopera';
    tytul.style.cssText = 'flex:1;font-weight:bold;color:#f2d36b';
    pasek.append(tytul);
    pasek.append(this.przycisk('wyczyść', () => { DZIENNIK.wpisy.length = 0; this.lista.textContent = ''; }));
    const zwin = this.przycisk('–', () => {
      this.zwiniety = !this.zwiniety;
      tresc.style.display = this.zwiniety ? 'none' : '';
      zwin.textContent = this.zwiniety ? '+' : '–';
    });
    pasek.append(zwin);
    el.append(pasek);
    this.przeciaganie(pasek);

    const tresc = document.createElement('div');
    el.append(tresc);

    // filtry kategorii
    const filtr = document.createElement('div');
    filtr.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px 8px;padding:4px 8px;border-bottom:1px solid #3d3326';
    for (const k of KATEGORIE) {
      const l = document.createElement('label');
      l.style.cssText = `color:${k.kolor};cursor:pointer;white-space:nowrap`;
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true; cb.style.cssText = 'margin:0 3px 0 0;vertical-align:-2px';
      cb.addEventListener('change', () => {
        if (cb.checked) this.filtry.add(k.kat); else this.filtry.delete(k.kat);
        this.przebuduj();
      });
      l.append(cb, k.nazwa);
      filtr.append(l);
    }
    tresc.append(filtr);

    const lista = (this.lista = document.createElement('div'));
    lista.style.cssText = 'height:170px;overflow-y:auto;padding:4px 8px;user-select:text';
    tresc.append(lista);

    // narzędzia
    const narz = document.createElement('div');
    narz.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-top:1px solid #3d3326;align-items:center';
    narz.append(
      this.przycisk('+100 wiary', () => { this.gra.sim().wiara += 100; }),
      this.przycisk('+100 krwi', () => { this.gra.sim().krew += 100; }),
      this.przycisk('pęknij skorupę', () => wymusPekniecie(this.gra.sim())),
      this.przycisk('sen → 0', () => { this.gra.sim().sen = 0; }),
    );
    const tempo = document.createElement('span');
    tempo.style.cssText = 'display:inline-flex;gap:4px;align-items:center';
    this.stanTempa = document.createElement('span');
    for (const t of [0, 10, 20]) tempo.append(this.przycisk(t ? `×${t}` : 'tempo zwykłe', () => { DEV.tempo = t; this.pokazTempo(); }));
    tempo.append(this.stanTempa);
    narz.append(tempo);
    const karta = document.createElement('select');
    karta.style.cssText = 'background:#2a2219;color:#e8dcc4;border:1px solid #6b5a40;font:inherit';
    karta.append(new Option('wymuś kartę…', ''));
    for (const k of KARTY) karta.append(new Option(k, k));
    karta.addEventListener('change', () => {
      const s = this.gra.sim();
      if (karta.value && !s.wydarzenia.biezace && !s.ending) {
        if (!wylosuj(s, karta.value)) zapisz(s, 'karta', `karta „${karta.value}” nie pasuje teraz do świata`);
      }
      karta.value = '';
    });
    narz.append(karta);
    tresc.append(narz);
    this.pokazTempo();

    // klawisze w okienku nie sterują grą
    el.addEventListener('keydown', (e) => e.stopPropagation());
    document.body.append(el);
  }

  private przycisk(napis: string, akcja: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = napis;
    b.style.cssText = 'background:#3a2f22;color:#e8dcc4;border:1px solid #6b5a40;border-radius:3px;padding:1px 6px;font:inherit;cursor:pointer';
    b.addEventListener('click', (e) => { e.stopPropagation(); akcja(); });
    return b;
  }

  private pokazTempo(): void {
    this.stanTempa.textContent = DEV.tempo ? `teraz ×${DEV.tempo}` : '';
  }

  private przeciaganie(uchwyt: HTMLElement): void {
    let od: { x: number; y: number; l: number; t: number } | null = null;
    uchwyt.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      const r = this.el.getBoundingClientRect();
      od = { x: e.clientX, y: e.clientY, l: r.left, t: r.top };
      uchwyt.setPointerCapture(e.pointerId);
    });
    uchwyt.addEventListener('pointermove', (e) => {
      if (!od) return;
      const l = Math.max(0, Math.min(innerWidth - 60, od.l + e.clientX - od.x));
      const t = Math.max(0, Math.min(innerHeight - 24, od.t + e.clientY - od.y));
      Object.assign(this.el.style, { left: `${l}px`, top: `${t}px`, right: 'auto', bottom: 'auto' });
    });
    const koniec = () => { od = null; };
    uchwyt.addEventListener('pointerup', koniec);
    uchwyt.addEventListener('pointercancel', koniec);
  }

  /** Włącza/wyłącza okienko (i zbieranie logów). */
  ustaw(widoczny: boolean): void {
    DZIENNIK.wlaczony = widoczny;
    if (!widoczny) DEV.tempo = 0;
    if (widoczny === this.widoczny) return;
    this.widoczny = widoczny;
    this.el.style.display = widoczny ? '' : 'none';
    if (widoczny) this.przebuduj();
    this.pokazTempo();
  }

  /** Dopisuje nowe wpisy (co ~250 ms, żeby nie mielić DOM-u co klatkę). */
  odswiez(teraz: number): void {
    if (!this.widoczny || teraz - this.ostatnieOdswiezenie < 250) return;
    this.ostatnieOdswiezenie = teraz;
    const sim = this.gra.sim();
    if (sim !== this.ostatniSim) {
      // nowa góra — stare wpisy dotyczą innego świata
      this.ostatniSim = sim;
      DZIENNIK.wpisy.length = 0;
      this.lista.textContent = '';
      this.doczytane = DZIENNIK.nastepny - 1;
      return;
    }
    const naDole = this.lista.scrollTop + this.lista.clientHeight >= this.lista.scrollHeight - 4;
    for (const w of DZIENNIK.wpisy) if (w.nr > this.doczytane) this.dopisz(w);
    this.doczytane = DZIENNIK.nastepny - 1;
    while (this.lista.childElementCount > DZIENNIK.max) this.lista.firstElementChild!.remove();
    if (naDole) this.lista.scrollTop = this.lista.scrollHeight;
  }

  private przebuduj(): void {
    this.lista.textContent = '';
    for (const w of DZIENNIK.wpisy) this.dopisz(w);
    this.doczytane = DZIENNIK.nastepny - 1;
    this.lista.scrollTop = this.lista.scrollHeight;
  }

  private dopisz(w: WpisDziennika): void {
    if (!this.filtry.has(w.kat)) return;
    const k = KATEGORIE.find((q) => q.kat === w.kat)!;
    const d = document.createElement('div');
    d.style.cssText = `color:${k.kolor};padding-left:12px;text-indent:-12px`;
    const gdzie = w.x !== undefined && w.y !== undefined ? ` (${w.x}, ${w.y})` : '';
    d.textContent = `[${czas(w.tick)}] ${w.tekst}${gdzie}`;
    if (gdzie) {
      d.style.cursor = 'pointer';
      d.addEventListener('click', () => this.gra.pokazMiejsce(w.x!, w.y!));
    }
    this.lista.append(d);
  }
}
