/**
 * OKIENKO DEWELOPERA — małe, przesuwane okno: stan świata, czas, logi, inspektor i narzędzia.
 * Widać je tylko w trakcie gry, gdy w ustawieniach włączony jest „Tryb deweloperski”.
 * Kliknięcie wpisu z miejscem (x, y) przenosi kamerę w to miejsce. Położenie i zwinięcie
 * okienka zostają w pamięci przeglądarki.
 */
import { wiadroTeraz, porcjiWWiadrach, doNastepnego } from '../sim/wiadro';
import { stropGory } from '../sim/zawal';
import type { Sim } from '../sim/sim';
import { DZIENNIK, DEV, zapisz, kto, OPIS_PRACY, NAZWY_KAFLI, type KategoriaWpisu, type WpisDziennika } from '../sim/dziennik';
import { Race } from '../sim/races';
import { HARDNESS, PASSABLE } from '../sim/tiles';
import { wymusPekniecie } from '../sim/rytual';
import { wylosuj, wymusLancuch, KARTY_LANCUCHA, KARTY_W_GRZE } from '../sim/wydarzenia';
import { klanLudu, liczRole, nadajRole, podloga, stanyPostaci, NAZWA_ROLI, type Rola } from '../sim/lud';
import { najwierniejsza } from '../sim/pielgrzymka';
import { devMrok, opisMroku, naKogoPatrzy } from '../sim/mrok';
import { devDlon, opisDloni } from '../sim/dlon';
import { TIKOW_NA_MINUTE } from '../nastawy/czas';
import { TEMPO } from '../nastawy/sterowanie';
import { mnoznikNapis } from '../render/przyciski';

const KATEGORIE: { kat: KategoriaWpisu; nazwa: string; kolor: string }[] = [
  { kat: 'praca', nazwa: 'zajęcia', kolor: '#b9c4a8' },
  { kat: 'blok', nazwa: 'bloki', kolor: '#d8b27a' },
  { kat: 'zgon', nazwa: 'zgony', kolor: '#e07a6e' },
  { kat: 'narodziny', nazwa: 'narodziny', kolor: '#9fd39a' },
  { kat: 'karta', nazwa: 'karty', kolor: '#c9a6e8' },
  { kat: 'rytual', nazwa: 'rytuał', kolor: '#f2d36b' },
  { kat: 'swiat', nazwa: 'kronika', kolor: '#9fc3e0' },
];

const PAMIEC = 'trzewia-alpha:panel-dewelopera';

/** Tiki gry → „mm:ss” czasu gry. */
function czas(tick: number): string {
  const s = Math.max(0, Math.floor(tick / (TIKOW_NA_MINUTE / 60)));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface GraDlaPanelu {
  sim(): Sim;
  pokazMiejsce(x: number, y: number): void;
  /** Nowa gra na podanym ziarnie (ten sam świat od nowa). */
  nowaGra(ziarno: number): void;
}

const STYL_POLA = 'background:#2a2219;color:#e8dcc4;border:1px solid #6b5a40;font:inherit;padding:1px 4px';
const STYL_SEKCJI = 'padding:5px 8px;border-top:1px solid #3d3326';

export class PanelDewelopera {
  private el: HTMLDivElement;
  private tresc: HTMLDivElement;
  private lista: HTMLDivElement;
  private filtry = new Set<KategoriaWpisu>(KATEGORIE.map((k) => k.kat));
  private doczytane = -1;
  private widoczny = false;
  private zwiniety = false;
  private ostatnieOdswiezenie = 0;
  private ostatniSim: Sim | null = null;
  private szukaj = '';
  private stanSwiata!: HTMLDivElement;
  private inspektor!: HTMLDivElement;
  private stanPauzy!: HTMLButtonElement;
  private przyciskiTempa = new Map<number, HTMLButtonElement>();
  private ziarnoPole!: HTMLInputElement;
  private ziarnoNapis!: HTMLSpanElement;
  private wynik!: HTMLDivElement;
  private klatki = 0;
  private klatkiOd = 0;
  private fps = 0;
  private tikiOd = { tick: 0, t: 0 };
  private tikowNaSek = 0;

  constructor(private gra: GraDlaPanelu) {
    const el = (this.el = document.createElement('div'));
    el.id = 'panel-dewelopera';
    el.style.cssText = [
      'position:fixed', 'right:12px', 'top:96px', 'width:390px', 'max-width:calc(100vw - 24px)',
      'max-height:calc(100vh - 110px)', 'overflow-y:auto',
      'background:rgba(16,13,10,0.93)', 'color:#e8dcc4', 'border:1px solid #6b5a40', 'border-radius:6px',
      'font:11px/1.35 ui-monospace,Consolas,monospace', 'z-index:50', 'display:none',
      'box-shadow:0 4px 18px rgba(0,0,0,0.5)', 'user-select:none',
    ].join(';');

    // pasek: tytuł, eksport, czyszczenie, zwijanie — za niego się przeciąga
    const pasek = document.createElement('div');
    pasek.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 8px;background:#2a2219;cursor:move;border-radius:6px 6px 0 0;position:sticky;top:0;z-index:1';
    const tytul = document.createElement('span');
    tytul.textContent = 'Tryb deweloperski';
    tytul.style.cssText = 'flex:1;font-weight:bold;color:#f2d36b';
    pasek.append(tytul);
    pasek.append(this.przycisk('zapisz .txt', () => this.eksport(), 'logi i stan świata do pliku'));
    pasek.append(this.przycisk('wyczyść', () => { DZIENNIK.wpisy.length = 0; this.lista.textContent = ''; }, 'wyczyść logi'));
    const zwin = this.przycisk('–', () => this.zwin(!this.zwiniety, zwin), 'zwiń / rozwiń');
    pasek.append(zwin);
    el.append(pasek);
    this.przeciaganie(pasek);

    const tresc = (this.tresc = document.createElement('div'));
    el.append(tresc);

    // ---------------------------------------------------------------- stan świata
    this.stanSwiata = document.createElement('div');
    this.stanSwiata.style.cssText = 'padding:5px 8px;white-space:pre-wrap;color:#d9cfb8;user-select:text';
    tresc.append(this.stanSwiata);

    // ---------------------------------------------------------------- czas
    const czasR = this.sekcja('Czas');
    this.stanPauzy = this.przycisk('⏸ pauza', () => { DEV.pauza = !DEV.pauza; this.pokazCzas(); }, 'świat stoi; idzie tylko o tyle tików, ile dodasz');
    czasR.append(this.stanPauzy);
    for (const n of [1, 10, 100]) czasR.append(this.przycisk(`+${n}`, () => { DEV.pauza = true; DEV.krokow += n; this.pokazCzas(); }, `${n} ${n === 1 ? 'tik' : 'tików'} naprzód`));
    const tempoNapis = document.createElement('span');
    tempoNapis.textContent = 'tempo';
    tempoNapis.style.cssText = 'margin-left:6px;color:#9a8f7a';
    czasR.append(tempoNapis);
    for (const m of TEMPO.mnozniki) {
      const b = this.przycisk(`×${mnoznikNapis(m)}`, () => { DEV.mnoznik = m; this.pokazCzas(); }, m === 1 ? 'zwykły czas (taki jak w grze)' : `czas ×${mnoznikNapis(m)} — tylko w trybie deweloperskim`);
      this.przyciskiTempa.set(m, b);
      czasR.append(b);
    }

    // ---------------------------------------------------------------- logi
    const logi = this.sekcja('Logi');
    logi.style.flexDirection = 'column';
    logi.style.alignItems = 'stretch';
    const filtr = document.createElement('div');
    filtr.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px 8px';
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
    szukaj.placeholder = 'szukaj w logach (np. #59, rycerz, Patrzący)…';
    szukaj.style.cssText = `${STYL_POLA};margin-top:3px`;
    szukaj.addEventListener('input', () => { this.szukaj = szukaj.value.trim().toLowerCase(); this.przebuduj(); });
    const lista = (this.lista = document.createElement('div'));
    lista.style.cssText = 'height:140px;overflow-y:auto;padding:4px 0;user-select:text';
    logi.append(filtr, szukaj, lista);

    // ---------------------------------------------------------------- inspektor
    const insp = this.sekcja('Inspektor');
    insp.style.flexDirection = 'column';
    insp.style.alignItems = 'stretch';
    const inspGora = document.createElement('div');
    inspGora.style.cssText = 'display:flex;gap:6px;align-items:center';
    const sledz = this.pole('kamera za nim', DEV.sledz, (v) => { DEV.sledz = v; });
    inspGora.append(sledz, this.przycisk('puść', () => { DEV.sledzony = -1; }, 'przestań śledzić'));
    this.inspektor = document.createElement('div');
    this.inspektor.style.cssText = 'white-space:pre-wrap;min-height:4.1em;color:#cfe3ef;user-select:text';
    insp.append(inspGora, this.inspektor);

    // ---------------------------------------------------------------- narzędzia
    const zasoby = this.sekcja('Narzędzia');
    zasoby.append(
      this.przycisk('+100 wiary', () => { this.gra.sim().wiara += 100; }),
      this.przycisk('+100 krwi', () => { this.gra.sim().krew += 100; }),
      this.przycisk('+ wiadro', () => { wiadroTeraz(this.gra.sim()); }, 'pełne wiadro zjeżdża od razu, przy najgłodniejszych'),
      this.przycisk('sen → 0', () => { this.gra.sim().sen = 0; }, 'powieka podnosi się'),
      this.przycisk('pęknij skorupę', () => wymusPekniecie(this.gra.sim())),
    );
    const lud = this.wiersz();
    for (const r of ['robotnik', 'pobozny', 'rycerz'] as Rola[]) lud.append(this.przycisk(`+ ${NAZWA_ROLI[r].toLowerCase()}`, () => this.przywolaj(r), 'przy siedzibie, bez krwi'));
    lud.append(this.przycisk('odkryj mapę', () => this.odkryj(), 'cała góra trafia do pamięci'));
    const mrok = this.wiersz();
    const mrokNapis = document.createElement('span');
    mrokNapis.textContent = 'Patrzący:';
    mrokNapis.style.color = '#9a8f7a';
    mrok.append(
      mrokNapis,
      this.przycisk('wywołaj', () => this.pokazWynik(devMrok(this.gra.sim(), 'wyjdz')), 'wychodzi teraz i idzie do najbardziej samotnego'),
      this.przycisk('cofnij', () => this.pokazWynik(devMrok(this.gra.sim(), 'cofnij')), 'wraca w głąb na 3 minuty'),
    );
    const dlon = this.wiersz();
    const dlonNapis = document.createElement('span');
    dlonNapis.textContent = 'Dłoń z otchłani:';
    dlonNapis.style.color = '#9a8f7a';
    dlon.append(dlonNapis, this.przycisk('wywołaj', () => this.pokazWynik(devDlon(this.gra.sim())), 'od razu, także poza Koszmarem — przy kimś na brzegu nieznanego'));
    const widok = this.wiersz();
    widok.append(
      this.pole('bez ciemności', DEV.bezMroku, (v) => { DEV.bezMroku = v; }),
      this.pole('pokaż ukryte', DEV.pokazUkryte, (v) => { DEV.pokazUkryte = v; }, 'Patrzący i gniazda rycerzy na płycie'),
      this.pole('drogi wszystkich', DEV.pokazDrogi, (v) => { DEV.pokazDrogi = v; }),
    );
    const karty = this.wiersz();
    const karta = document.createElement('select');
    karta.style.cssText = `${STYL_POLA};flex:1`;
    karta.append(new Option('wymuś kartę…', ''));
    for (const [id, nazwa] of KARTY_W_GRZE) karta.append(new Option(`${nazwa} (${id})`, id));
    const grupa = document.createElement('optgroup');
    grupa.label = 'z łańcucha';
    for (const k of KARTY_LANCUCHA) grupa.append(new Option(k, `lancuch:${k}`));
    karta.append(grupa);
    karta.addEventListener('change', () => {
      const s = this.gra.sim();
      if (karta.value && !s.wydarzenia.biezace && !s.ending) {
        const lan = karta.value.startsWith('lancuch:') ? karta.value.slice(8) : null;
        const ok = lan ? wymusLancuch(s, lan) : !!wylosuj(s, karta.value);
        this.pokazWynik(ok ? 'Karta na stole.' : `Karta „${lan ?? karta.value}” nie pasuje teraz do świata.`);
        if (!ok) zapisz(s, 'karta', `karta „${lan ?? karta.value}” nie pasuje teraz do świata`);
      } else if (karta.value) this.pokazWynik('Najpierw rozstrzygnij kartę, która leży.');
      karta.value = '';
    });
    karty.append(karta);

    // ziarno świata: ten sam świat jeszcze raz albo dowolny po numerze
    const swiat = this.wiersz();
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
    this.wynik = document.createElement('div');
    this.wynik.style.cssText = 'padding:0 8px 6px;color:#f2d36b;min-height:1.35em';
    tresc.append(this.wynik);

    const skroty = document.createElement('div');
    skroty.style.cssText = 'padding:0 8px 6px;color:#7d7362';
    skroty.textContent = 'Shift+klik postać — do inspektora · + / − tempo · klik we wpis — kamera tam';
    tresc.append(skroty);

    this.pokazCzas();
    this.wczytajPolozenie(zwin);

    // klawisze w okienku nie sterują grą
    el.addEventListener('keydown', (e) => e.stopPropagation());
    document.body.append(el);
  }

  // ---------------------------------------------------------------- budowanie

  private sekcja(nazwa: string): HTMLDivElement {
    const d = document.createElement('div');
    d.style.cssText = `${STYL_SEKCJI};display:flex;flex-wrap:wrap;gap:4px;align-items:center`;
    const n = document.createElement('div');
    n.textContent = nazwa;
    n.style.cssText = 'flex:1 1 100%;color:#f2d36b;font-weight:bold';
    d.append(n);
    this.tresc.append(d);
    return d;
  }

  private wiersz(): HTMLDivElement {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:0 8px 5px';
    this.tresc.append(d);
    return d;
  }

  private przycisk(napis: string, akcja: () => void, opis?: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = napis;
    if (opis) b.title = opis;
    b.style.cssText = 'background:#3a2f22;color:#e8dcc4;border:1px solid #6b5a40;border-radius:3px;padding:1px 6px;font:inherit;cursor:pointer';
    b.addEventListener('click', (e) => { e.stopPropagation(); akcja(); });
    return b;
  }

  private pole(napis: string, poczatek: boolean, zmien: (v: boolean) => void, opis?: string): HTMLLabelElement {
    const l = document.createElement('label');
    l.style.cssText = 'cursor:pointer;white-space:nowrap';
    if (opis) l.title = opis;
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = poczatek; cb.style.cssText = 'margin:0 3px 0 0;vertical-align:-2px';
    cb.addEventListener('change', () => zmien(cb.checked));
    l.append(cb, napis);
    return l;
  }

  private pokazWynik(t: string): void {
    this.wynik.textContent = t;
  }

  // ---------------------------------------------------------------- narzędzia

  /** Nowy członek ludu przy siedzibie — bez krwi i bez czekania na skałę. */
  private przywolaj(rola: Rola): void {
    const s = this.gra.sim();
    const klan = klanLudu(s);
    if (!klan) { this.pokazWynik('Nie ma ludu.'); return; }
    const m = podloga(s, klan.hx, klan.hy) ?? [klan.hx, klan.hy];
    const c = s.spawn(Race.GOBLIN, klan.id, m[0], m[1]);
    if (!c) { this.pokazWynik('Nie da się tu nikogo postawić.'); return; }
    nadajRole(s, c, rola);
    c.age = 0;
    c.devotion = Math.max(c.devotion, klan.devotion);
    c.od = s.tick;
    s.efekt(c.x, c.y, 'zasiew');
    zapisz(s, 'narodziny', `narzędzie: ${NAZWA_ROLI[rola].toLowerCase()} #${c.id} przy siedzibie`, c.x, c.y);
    this.pokazWynik(`${NAZWA_ROLI[rola]} #${c.id} przy siedzibie.`);
  }

  private odkryj(): void {
    const s = this.gra.sim();
    const w = s.world;
    const nowych = w.observe(w.w >> 1, w.h >> 1, Math.max(w.w, w.h), s.tick);
    w.countUnknown(s.tick);
    this.pokazWynik(`Odkryto ${nowych} kafli.`);
  }

  // ---------------------------------------------------------------- pokazywanie

  private pokazCzas(): void {
    this.stanPauzy.textContent = DEV.pauza ? '▶ wznów' : '⏸ pauza';
    this.stanPauzy.style.background = DEV.pauza ? '#6b4a22' : '#3a2f22';
    for (const [m, b] of this.przyciskiTempa) {
      const teraz = m === DEV.mnoznik;
      b.style.background = teraz ? '#6b4a22' : '#3a2f22';
      b.style.color = teraz ? '#f2d36b' : '#e8dcc4';
    }
  }

  private pokazStan(sim: Sim): void {
    const r = liczRole(sim);
    const wierni = najwierniejsza(sim);
    const t = DEV.mnoznik === 1 ? 'czas zwykły' : `czas ×${mnoznikNapis(DEV.mnoznik)}`;
    const linie = [
      `${czas(sim.tick)} · tik ${sim.tick} · ${DEV.pauza ? 'pauza dewelopera' : t} · ${this.tikowNaSek} tik/s · ${this.fps} kl/s · krok ${DEV.msKroku.toFixed(2)} ms`,
      `lud ${r.pobozny + r.robotnik + r.rycerz}: pobożni ${r.pobozny} · robotnicy ${r.robotnik} · rycerze ${r.rycerz} · jedzenie ${porcjiWWiadrach(sim)} porcji · wiadro za ${Math.ceil(doNastepnego(sim) / 120)} s${stropGory(sim) ? ` · strop ${stropGory(sim)}` : ''}`,
      `wiara ${Math.floor(sim.wiara)} · krew ${Math.floor(sim.krew)} · oddanie ${Math.round((wierni?.devotion ?? 0) * 100)}% · sen ${Math.round(sim.sen * 100)}% · pęknięć ${sim.rytual.pekniecia}${sim.rytual.otwarta ? ' · rdzeń otwarty' : ''}`,
      opisMroku(sim),
      opisDloni(sim),
    ];
    this.stanSwiata.textContent = linie.join('\n');
  }

  /** Inspektor: śledzona postać i kafel pod kursorem. */
  private pokazInspektor(sim: Sim): void {
    const linie: string[] = [];
    if (DEV.sledzony >= 0) {
      const c = sim.creatures.find((q) => q.id === DEV.sledzony);
      if (!c || c.dead) linie.push(`#${DEV.sledzony} — nie żyje`);
      else {
        const p = (v: number) => `${Math.round(v * 100)}%`;
        linie.push(`${kto(sim, c)}${c.straznik ? ' · Strażnik Snu' : ''}${c.buntownik ? ' · zbuntowany' : ''}`);
        linie.push(`życie ${Math.round(c.hp)} · głód ${p(c.hunger)} · wiara ${p(c.devotion)} · szał ${p(c.mad)} · strach ${p(c.fear)}`);
        if (c.zamiar) linie.push(`zamiar: ${c.zamiar}${c.zamiarDo !== undefined && c.zamiarDo > sim.tick ? ` (jeszcze ${Math.ceil((c.zamiarDo - sim.tick) / 120)} s)` : ''}`);
        linie.push(`${OPIS_PRACY[c.job] ?? 'zajęcie ' + c.job} → (${c.jx}, ${c.jy}) · jest (${Math.floor(c.x)}, ${Math.floor(c.y)})${c.droga ? ` · droga ${c.droga.length - (c.drogaI ?? 0)} kafli` : ''} · stoi ${c.stall} tików`);
        const stany = stanyPostaci(sim, c).map((s) => s.nazwa);
        if (naKogoPatrzy(sim) === c.id) stany.unshift('PATRZY NA NIEGO PATRZĄCY');
        if (stany.length) linie.push(`stany: ${stany.join(', ')}`);
      }
    } else linie.push('Shift+klik na postać w świecie albo klik we wpis z #numerem.');
    const k = DEV.kursor;
    if (k) {
      const w = sim.world;
      if (w.inb(k.x, k.y)) {
        const i = w.idx(k.x, k.y), t = w.tile[i];
        let tu = 0;
        for (const c of sim.creatures) if (!c.dead && Math.floor(c.x) === k.x && Math.floor(c.y) === k.y) tu++;
        linie.push(`kafel (${k.x}, ${k.y}): ${NAZWY_KAFLI[t] ?? t} · twardość ${HARDNESS[t].toFixed(1)}${PASSABLE[t] ? ' · przejście' : ''}${w.ever[i] ? '' : ' · nieznany'}${tu ? ` · postaci ${tu}` : ''}`);
      }
    }
    this.inspektor.textContent = linie.join('\n');
  }

  /** Logi do pliku tekstowego (wszystkie zebrane, bez filtrów) ze stanem świata na górze. */
  private eksport(): void {
    const sim = this.gra.sim();
    const linie = DZIENNIK.wpisy.map((w) => `[${czas(w.tick)}] [${w.kat}] ${w.tekst}${w.x !== undefined ? ` (${w.x}, ${w.y})` : ''}`);
    const tekst = `Trzewia Alpha 0.1 — dziennik dewelopera\nziarno ${sim.seed}, tik ${sim.tick}\n\n${this.stanSwiata.textContent ?? ''}\n\n${linie.join('\n')}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([tekst], { type: 'text/plain;charset=utf-8' }));
    a.download = `trzewia-dziennik-${sim.seed}-${sim.tick}.txt`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------------------------------------------------------------- okno

  private zwin(zwiniety: boolean, przycisk: HTMLButtonElement): void {
    this.zwiniety = zwiniety;
    this.tresc.style.display = zwiniety ? 'none' : '';
    przycisk.textContent = zwiniety ? '+' : '–';
    this.zapamietaj();
  }

  private zapamietaj(): void {
    try {
      const r = this.el.style;
      localStorage.setItem(PAMIEC, JSON.stringify({ zwiniety: this.zwiniety, left: r.left, top: r.top }));
    } catch { /* bez pamięci przeglądarki okienko po prostu startuje w rogu */ }
  }

  private wczytajPolozenie(zwin: HTMLButtonElement): void {
    try {
      const p = JSON.parse(localStorage.getItem(PAMIEC) ?? 'null') as { zwiniety?: boolean; left?: string; top?: string } | null;
      if (!p) return;
      if (p.left && p.top) {
        const l = Math.max(0, Math.min(innerWidth - 60, parseFloat(p.left)));
        const t = Math.max(0, Math.min(innerHeight - 24, parseFloat(p.top)));
        Object.assign(this.el.style, { left: `${l}px`, top: `${t}px`, right: 'auto', bottom: 'auto' });
      }
      if (p.zwiniety) this.zwin(true, zwin);
    } catch { /* jak wyżej */ }
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
    const koniec = () => { if (od) this.zapamietaj(); od = null; };
    uchwyt.addEventListener('pointerup', koniec);
    uchwyt.addEventListener('pointercancel', koniec);
  }

  /** Włącza/wyłącza okienko (i zbieranie logów). Wyłączenie wraca do zwykłego czasu. */
  ustaw(widoczny: boolean): void {
    DZIENNIK.wlaczony = widoczny;
    if (!widoczny) { DEV.mnoznik = 1; DEV.bezMroku = false; }
    if (widoczny === this.widoczny) return;
    this.widoczny = widoczny;
    this.el.style.display = widoczny ? '' : 'none';
    if (widoczny) this.przebuduj();
    this.pokazCzas();
  }

  /** Odświeża stan i dopisuje nowe wpisy (co ~250 ms, żeby nie mielić DOM-u co klatkę). */
  odswiez(teraz: number): void {
    if (!this.widoczny) return;
    this.klatki++;
    if (teraz - this.ostatnieOdswiezenie < 250) return;
    this.ostatnieOdswiezenie = teraz;
    const sim = this.gra.sim();
    if (teraz - this.klatkiOd >= 1000) {
      this.fps = Math.round((this.klatki * 1000) / (teraz - this.klatkiOd));
      this.klatki = 0; this.klatkiOd = teraz;
      this.tikowNaSek = this.tikiOd.t ? Math.round(((sim.tick - this.tikiOd.tick) * 1000) / (teraz - this.tikiOd.t)) : 0;
      this.tikiOd = { tick: sim.tick, t: teraz };
    }
    this.pokazCzas();
    if (this.zwiniety) return;
    this.pokazStan(sim);
    this.pokazInspektor(sim);
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
