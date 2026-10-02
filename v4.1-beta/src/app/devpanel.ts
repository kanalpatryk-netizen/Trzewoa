/**
 * OKIENKO DEWELOPERA (v4 beta) — małe, przesuwane okno z logami świata i kilkoma narzędziami.
 * Widać je tylko w trakcie gry, gdy w ustawieniach włączony jest „Tryb deweloperski”.
 * Kliknięcie wpisu z miejscem (x, y) przenosi kamerę w to miejsce.
 */
import type { Sim } from '../sim/sim';
import { DZIENNIK, DEV, zapisz, OPIS_PRACY, NAZWY_KAFLI, type KategoriaWpisu, type WpisDziennika } from '../sim/dziennik';
import { RACES } from '../sim/races';
import { cechaNacji } from '../sim/cechy';
import { HARDNESS, PASSABLE } from '../sim/tiles';
import { wymusPekniecie } from '../sim/rytual';
import { wylosuj, wymusLancuch, KARTY_LANCUCHA } from '../sim/wydarzenia';
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
  /** Nowa gra na podanym ziarnie (ten sam świat od nowa). */
  nowaGra(ziarno: number): void;
}

const STYL_POLA = 'background:#2a2219;color:#e8dcc4;border:1px solid #6b5a40;font:inherit;padding:1px 4px';

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
  private szukaj = '';
  private inspektor!: HTMLDivElement;
  private stanPauzy!: HTMLButtonElement;
  private wydajnosc!: HTMLSpanElement;
  private ziarnoPole!: HTMLInputElement;
  private ziarnoNapis!: HTMLSpanElement;
  private klatki = 0;
  private klatkiOd = 0;
  private fps = 0;

  constructor(private gra: GraDlaPanelu) {
    const el = (this.el = document.createElement('div'));
    el.id = 'panel-dewelopera';
    el.style.cssText = [
      'position:fixed', 'right:12px', 'top:96px', 'width:360px', 'max-width:calc(100vw - 24px)',
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
    pasek.append(this.przycisk('zapisz .txt', () => this.eksport()));
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
    const szukaj = document.createElement('input');
    szukaj.type = 'search';
    szukaj.placeholder = 'szukaj w logach (np. Grzmotowie, #59, ruda)…';
    szukaj.style.cssText = `${STYL_POLA};flex:1 1 100%;margin-top:2px`;
    szukaj.addEventListener('input', () => { this.szukaj = szukaj.value.trim().toLowerCase(); this.przebuduj(); });
    filtr.append(szukaj);
    tresc.append(filtr);

    const lista = (this.lista = document.createElement('div'));
    lista.style.cssText = 'height:140px;overflow-y:auto;padding:4px 8px;user-select:text';
    tresc.append(lista);

    // inspektor: postać (Shift+klik w świecie albo klik we wpis z #numerem) i kafel pod kursorem
    const insp = document.createElement('div');
    insp.style.cssText = 'padding:4px 8px;border-top:1px solid #3d3326;color:#cfe3ef';
    const inspGora = document.createElement('div');
    inspGora.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:2px';
    const inspTytul = document.createElement('span');
    inspTytul.textContent = 'Inspektor';
    inspTytul.style.cssText = 'flex:1;color:#f2d36b;font-weight:bold';
    const sledz = document.createElement('label');
    sledz.style.cssText = 'cursor:pointer;white-space:nowrap';
    const sledzCb = document.createElement('input');
    sledzCb.type = 'checkbox'; sledzCb.style.cssText = 'margin:0 3px 0 0;vertical-align:-2px';
    sledzCb.addEventListener('change', () => { DEV.sledz = sledzCb.checked; });
    sledz.append(sledzCb, 'kamera za nim');
    inspGora.append(inspTytul, sledz, this.przycisk('puść', () => { DEV.sledzony = -1; }));
    this.inspektor = document.createElement('div');
    this.inspektor.style.cssText = 'white-space:pre-wrap;min-height:4.1em';
    insp.append(inspGora, this.inspektor);
    tresc.append(insp);

    // czas: pauza dewelopera i kroki po kilka tików
    const czasR = document.createElement('div');
    czasR.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px 0;border-top:1px solid #3d3326;align-items:center';
    this.stanPauzy = this.przycisk('⏸ pauza', () => { DEV.pauza = !DEV.pauza; this.pokazPauze(); });
    czasR.append(this.stanPauzy);
    for (const n of [1, 10, 100]) czasR.append(this.przycisk(`+${n} tik${n === 1 ? '' : 'ów'}`, () => { DEV.pauza = true; DEV.krokow += n; this.pokazPauze(); }));
    this.wydajnosc = document.createElement('span');
    this.wydajnosc.style.cssText = 'margin-left:auto;color:#9a8f7a';
    czasR.append(this.wydajnosc);
    tresc.append(czasR);

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
    const grupa = document.createElement('optgroup');
    grupa.label = 'z łańcucha (v4.1)';
    for (const k of KARTY_LANCUCHA) grupa.append(new Option(k, `lancuch:${k}`));
    karta.append(grupa);
    karta.addEventListener('change', () => {
      const s = this.gra.sim();
      if (karta.value && !s.wydarzenia.biezace && !s.ending) {
        const lan = karta.value.startsWith('lancuch:') ? karta.value.slice(8) : null;
        const ok = lan ? wymusLancuch(s, lan) : !!wylosuj(s, karta.value);
        if (!ok) zapisz(s, 'karta', `karta „${lan ?? karta.value}” nie pasuje teraz do świata`);
      }
      karta.value = '';
    });
    narz.append(karta);
    tresc.append(narz);

    // ziarno świata: ten sam świat jeszcze raz albo dowolny po numerze
    const swiat = document.createElement('div');
    swiat.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:0 8px 6px;align-items:center';
    this.ziarnoNapis = document.createElement('span');
    this.ziarnoNapis.style.cssText = 'user-select:text';
    this.ziarnoPole = document.createElement('input');
    this.ziarnoPole.type = 'number'; this.ziarnoPole.placeholder = 'ziarno';
    this.ziarnoPole.style.cssText = `${STYL_POLA};width:90px`;
    swiat.append(
      this.ziarnoNapis,
      this.przycisk('ten sam świat', () => this.gra.nowaGra(this.gra.sim().seed)),
      this.ziarnoPole,
      this.przycisk('graj', () => {
        const z = Math.floor(Number(this.ziarnoPole.value));
        if (Number.isFinite(z) && this.ziarnoPole.value !== '') this.gra.nowaGra(z);
      }),
    );
    tresc.append(swiat);
    this.pokazTempo();
    this.pokazPauze();

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

  private pokazPauze(): void {
    this.stanPauzy.textContent = DEV.pauza ? '▶ wznów' : '⏸ pauza';
    this.stanPauzy.style.background = DEV.pauza ? '#6b4a22' : '#3a2f22';
  }

  /** Logi do pliku tekstowego (wszystkie zebrane, bez filtrów). */
  private eksport(): void {
    const sim = this.gra.sim();
    const linie = DZIENNIK.wpisy.map((w) => `[${czas(w.tick)}] [${w.kat}] ${w.tekst}${w.x !== undefined ? ` (${w.x}, ${w.y})` : ''}`);
    const tekst = `Trzewia v4.1 beta — dziennik dewelopera\nziarno ${sim.seed}, tik ${sim.tick}\n\n${linie.join('\n')}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain;charset=utf-8' }));
    a.download = `trzewia-dziennik-${sim.seed}-${sim.tick}.txt`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** Inspektor: śledzona postać i kafel pod kursorem. */
  private pokazInspektor(sim: Sim): void {
    const linie: string[] = [];
    if (DEV.sledzony >= 0) {
      const c = sim.creatures.find((q) => q.id === DEV.sledzony);
      if (!c || c.dead) linie.push(`#${DEV.sledzony} — nie żyje`);
      else {
        const r = RACES[c.race];
        const p = (v: number) => `${Math.round(v * 100)}%`;
        const cecha = cechaNacji(sim.clans[c.clan]);
        linie.push(`${r.name} #${c.id} (${sim.clans[c.clan]?.name ?? '?'})${c.prophet ? ' · prorok' : ''}${c.slave ? ' · w jarzmie' : ''}`);
        if (cecha.id) linie.push(`cecha nacji: ${cecha.nazwa} — ${cecha.opis}`);
        linie.push(`życie ${Math.round(c.hp)}/${r.maxHp} · głód ${p(c.hunger)} · wiara ${p(c.devotion)} · szał ${p(c.mad)} · strach ${p(c.fear)}`);
        linie.push(`wiek ${Math.round((c.age / r.lifespan) * 100)}% życia · niesie ${c.carry} · stoi ${c.stall} tików`);
        linie.push(`${OPIS_PRACY[c.job] ?? 'zajęcie ' + c.job} → cel (${c.jx}, ${c.jy}) · jest (${Math.floor(c.x)}, ${Math.floor(c.y)})${c.droga ? ` · droga ${c.droga.length - (c.drogaI ?? 0)} kafli` : ''}`);
      }
    } else linie.push('Shift+klik na postać w świecie albo klik we wpis z #numerem.');
    const k = DEV.kursor;
    if (k) {
      const w = sim.world;
      if (w.inb(k.x, k.y)) {
        const i = w.idx(k.x, k.y), t = w.tile[i];
        let tu = 0;
        for (const c of sim.creatures) if (!c.dead && Math.floor(c.x) === k.x && Math.floor(c.y) === k.y) tu++;
        linie.push(`kafel (${k.x}, ${k.y}): ${NAZWY_KAFLI[t] ?? t} · twardość ${HARDNESS[t].toFixed(1)}${PASSABLE[t] ? ' · przejście' : ''}${w.water[i] ? ` · woda ${w.water[i]}/8` : ''}${w.magma[i] ? ` · magma ${w.magma[i]}/8` : ''}${tu ? ` · postaci ${tu}` : ''}`);
      }
    }
    this.inspektor.textContent = linie.join('\n');
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
    if (!this.widoczny) return;
    this.klatki++;
    if (teraz - this.ostatnieOdswiezenie < 250) return;
    this.ostatnieOdswiezenie = teraz;
    const sim = this.gra.sim();
    this.pokazInspektor(sim);
    this.pokazPauze();
    if (teraz - this.klatkiOd >= 1000) { this.fps = Math.round((this.klatki * 1000) / (teraz - this.klatkiOd)); this.klatki = 0; this.klatkiOd = teraz; }
    this.wydajnosc.textContent = `tik ${sim.tick} · ${this.fps} kl/s · krok ${DEV.msKroku.toFixed(2)} ms`;
    this.ziarnoNapis.textContent = `świat ${sim.seed}`;
    if (sim !== this.ostatniSim) {
      // nowa góra — stare wpisy dotyczą innego świata
      this.ostatniSim = sim;
      DEV.sledzony = -1;
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
    const gdzie = w.x !== undefined && w.y !== undefined ? ` (${w.x}, ${w.y})` : '';
    const tekst = `[${czas(w.tick)}] ${w.tekst}${gdzie}`;
    if (this.szukaj && !tekst.toLowerCase().includes(this.szukaj)) return;
    const k = KATEGORIE.find((q) => q.kat === w.kat)!;
    const d = document.createElement('div');
    d.style.cssText = `color:${k.kolor};padding-left:12px;text-indent:-12px`;
    d.textContent = tekst;
    // klik: kamera na miejsce, a postać z #numerem trafia do inspektora
    const nr = /#(\d+)/.exec(w.tekst);
    if (gdzie || nr) {
      d.style.cursor = 'pointer';
      d.addEventListener('click', () => {
        if (nr) DEV.sledzony = Number(nr[1]);
        if (gdzie) this.gra.pokazMiejsce(w.x!, w.y!);
      });
    }
    this.lista.append(d);
  }
}
