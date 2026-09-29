import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import { klawisze, nazwaKlawisza, type Akcja } from '../../core/keybinds';
import { EkranGry, type ZdarzenieGry } from './game';
import { Cutscenka } from '../../cutscene/cutscene';
import { SCENY } from '../../cutscene/scenes';
import type { Cel } from '../../render/znaczniki';
import type { AkcjaPrzycisku } from '../../render/przyciski';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, panel, akapit, linieAkapitu } from '../../render/ink';
import { ramaKarty } from '../../render/ozdoby';
import { ustaw, ustawienia } from '../../core/settings-store';
import { odkrycia } from '../../atlas/odkrycia';
import { T, PASSABLE } from '../../sim/tiles';
import { Race } from '../../sim/races';
import { STEROWANIE } from '../../nastawy/sterowanie';
import { ROZDZIALY, type Rozdzial, type Wskazanie, type Gest, type Tekst } from './samouczek/rozdzialy';


interface Pole { x: number; y: number; w: number; h: number; }
const wPolu = (p: Pole | null, x: number, y: number): boolean =>
  !!p && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

const AKCJE_KLAWISZY = new Set<string>(Object.keys(klawisze));

const tekstZ = (t: Tekst, s: EkranSamouczka): string => typeof t === 'function' ? t(s) : t;

/**
 * Samouczek: dziesięć krótkich rozdziałów, każdy z listą czynności do odhaczenia.
 * Palec zawsze wskazuje dokładnie to, w co trzeba kliknąć — ryt, słowo, przycisk
 * albo miejsce na płycie — a lista pokazuje, co już zrobione i co dalej.
 * Wcześniej było dwanaście filmów do przeczytania i polecenia w rodzaju „drugi ryt
 * po lewej", a ryt był już wybrany za gracza, więc kliknięcie go odznaczało.
 */
/** Samouczek zawsze toczy się w tej samej górze — lekcje wskazują jej konkretne miejsca. */
const ZIARNO_SAMOUCZKA = 20260921;

export class EkranSamouczka implements Ekran {
  nazwa = 'samouczek';
  gra: EkranGry;
  private film = new Cutscenka();
  private faza: 'scena' | 'lekcja' | 'final' = 'scena';
  private idx = 0;
  private zaliczoneEtapy: boolean[] = [];
  private zrobiony = false;
  /** Karta zwinięta do jednego paska — na telefonie odsłania płytę. */
  private zwinieta = false;
  private ostatniEtap = -1;
  private blysk = 0;
  private odEtapu = 0;
  /** Kamera z początku etapu — po niej poznajemy, że gracz się rozejrzał. */
  kamStart = { x: 0, y: 0, zoom: 1 };
  /** Stworzenie wskazane w rozdziale — śledzimy je, zamiast szukać co klatkę nowego. */
  private wskazaneId = -1;
  /** Miejsca na płycie liczone raz na etap — pierścień nie może skakać za tłumem. */
  private celeEtapow = new Map<number, Wskazanie | null>();
  /** Wysokość ekranu — organy w ramie liczą się od dołu. */
  vh = 720;
  /** W trakcie przygotowania rozdziału gra też coś zgłasza — to nie są ruchy gracza. */
  private ustawianie = false;
  /** Tempo sprzed samouczka: nauka przyspieszania nie może zostawić gracza na ×3. */
  private tempoPrzed = 1;

  private pola: { dalej: Pole | null; wstecz: Pole | null; pomin: Pole | null; karta: Pole | null; graj: Pole | null; menu: Pole | null; zwin?: Pole | null } =
    { dalej: null, wstecz: null, pomin: null, karta: null, graj: null, menu: null };

  // ------------------------------------------------------------ wskazywanie

  ryt(v: string): Wskazanie | null {
    const m = this.gra.ui.miejsce('verb', v);
    return m ? { typ: 'punkt', x: m.x, y: m.y, r: Math.max(m.hw, m.hh) * 1.15 } : null;
  }

  slowo(rodzaj: 'tool' | 'thought', id: string): Wskazanie | null {
    const m = this.gra.ui.miejsce(rodzaj, id);
    return m ? { typ: 'punkt', x: m.x, y: m.y + m.hh * 0.2, r: Math.max(m.hw, m.hh) * 1.2 } : null;
  }

  przycisk(a: AkcjaPrzycisku): Wskazanie | null {
    const b = this.gra.miejscePrzycisku(a);
    return b ? { typ: 'punkt', x: b.x, y: b.y, r: b.r * 1.35 } : null;
  }

  gniazdoGoblinow(): { x: number; y: number } | null {
    // środek żywych goblinów, nie punkt gniazda: gniazdo zostaje na mapie nawet wtedy,
    // gdy mieszka tam już kto inny
    const g = this.gra;
    const klan = g.sim.clans.filter((k) => !k.dead && k.race === Race.GOBLIN && k.pop > 0)
      .sort((a, b) => b.pop - a.pop)[0];
    if (!klan) return null;
    let sx = 0, sy = 0, n = 0;
    for (const c of g.sim.creatures) {
      if (c.dead || c.clan !== klan.id) continue;
      sx += c.x; sy += c.y; n++;
    }
    return n > 0 ? { x: sx / n, y: sy / n } : { x: klan.hx, y: klan.hy };
  }

  /** Puste miejsce z podłogą przy gnieździe — tam ma trafić grzyb. */
  miejsceNaGrzyb(): Cel | null {
    const dom = this.gniazdoGoblinow();
    if (!dom) return null;
    const w = this.gra.sim.world;
    for (let r = 2; r < 16; r++) {
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2;
        const x = Math.round(dom.x + Math.cos(a) * r), y = Math.round(dom.y + Math.sin(a) * r);
        if (!w.inb(x, y)) continue;
        if (w.tile[w.idx(x, y)] === T.AIR && !w.passable(x, y + 1) && w.water[w.idx(x, y)] === 0) {
          return { x: x + 0.5, y: y + 0.5, r: 3, tekst: 'przeciągnij tutaj' };
        }
      }
    }
    return { x: dom.x, y: dom.y, r: 3, tekst: 'przeciągnij tutaj' };
  }

  /** Lita skała tuż obok gniazda — tam ma powstać korytarz. */
  miejsceNaKorytarz(): Cel | null {
    const dom = this.gniazdoGoblinow();
    if (!dom) return null;
    const w = this.gra.sim.world;
    for (let r = 3; r < 18; r++) {
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2;
        const x = Math.round(dom.x + Math.cos(a) * r), y = Math.round(dom.y + Math.sin(a) * r);
        if (!w.inb(x, y)) continue;
        if (PASSABLE[w.tile[w.idx(x, y)]] !== 1) return { x: x + 0.5, y: y + 0.5, r: 3, tekst: 'przeciągnij po skale' };
      }
    }
    return null;
  }

  /** Jeden goblin do szeptu — ten sam przez cały rozdział. */
  wskazanyGoblin(tekst: string): Cel | null {
    const sim = this.gra.sim;
    let c = sim.creatures.find((o) => o.id === this.wskazaneId && !o.dead);
    if (!c) {
      const dom = this.gniazdoGoblinow();
      c = dom ? sim.nearestCreature(dom.x, dom.y, 30, (o) => o.race === Race.GOBLIN) ?? undefined
        : sim.creatures.find((o) => !o.dead && o.race === Race.GOBLIN);
      this.wskazaneId = c ? c.id : -1;
    }
    return c ? { x: c.x, y: c.y - 0.4, r: 2, tekst } : null;
  }

  rdzen(): Cel {
    const w = this.gra.sim.world;
    return { x: w.coreX + 0.5, y: w.coreY + 0.5, r: 6, tekst: 'twój rdzeń' };
  }

  // ------------------------------------------------------------- rozdziały

  private rozdzialy: Rozdzial[] = ROZDZIALY;

  constructor(private app: Kontekst) {
    this.gra = new EkranGry(app);
    this.gra.zapisujAuto = false;
    this.gra.nasluch = (z) => this.aktualizuj(z);
  }

  /** Góra samouczka generowana z wyprzedzeniem (ekran ładowania). */
  przygotuj(): void { this.gra.przygotuj(ZIARNO_SAMOUCZKA); }

  wejdz(): void {
    this.gra.nowaGra(ZIARNO_SAMOUCZKA);
    this.gra.sim.spokojnySwiat = true;      // stały świat: żadnych zaraz i najazdów w trakcie nauki
    this.gra.sim.nakarmSwiat();             // i pełna spiżarnia, żeby nauka nie była patrzeniem na głód
    const dom = this.gniazdoGoblinow();
    if (dom) this.gra.sim.odsunKlany(Race.SPINNER, dom.x, dom.y);   // Prządki uczą się na osobnej scenie
    this.gra.wejdz({ tryb: 'samouczek' });
    this.tempoPrzed = ustawienia.tempo;
    this.app.muzyka.ustawScene('samouczek');
    this.idx = 0;
    this.faza = 'scena';
    // wstęp: kim jesteś i czym działasz (cel i przegraną tłumaczą ostatnie rozdziały) — potem rozdziały z palcem
    this.film.odtworzListe([SCENY.kimJestes, SCENY.narzedzia], () => this.zacznijRozdzial(0));
  }

  rozmiar(w: number, h: number): void { this.vh = h; this.gra.rozmiar(w, h); }

  private get rozdzial(): Rozdzial { return this.rozdzialy[this.idx]; }

  private zacznijRozdzial(i: number): void {
    this.faza = 'lekcja';
    this.idx = i;
    this.zwinieta = false;                   // nowy rozdział zawsze pokazuje się w całości
    const r = this.rozdzial;
    const g = this.gra;
    this.zrobiony = false;
    this.zaliczoneEtapy = r.etapy.map(() => false);
    this.ostatniEtap = -1;
    this.wskazaneId = -1;
    this.celeEtapow.clear();
    g.tempoMnoznik = 1;
    g.zapiski = false;
    g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
    g.cel = null;
    g.dozwolone = new Set(r.czasowniki ?? []);
    this.ustawianie = true;
    r.przygotuj?.(g, this);
    g.pauza = false;
    g.wstrzymane = !!r.stopCzasu;                  // rozdział z celowaniem dostaje nieruchomy świat
    // miejsce na płycie, o które chodzi w rozdziale, ma być w kadrze od pierwszej chwili
    for (let i = 0; i < r.etapy.length; i++) {
      if (r.etapy[i].wejdz) continue;
      const wsk = this.wskazanie(i);
      if (wsk?.typ === 'swiat') { g.pokazMiejsce(wsk.cel.x, wsk.cel.y, 15, true); break; }
    }
    this.ustawianie = false;
    this.aktualizuj(null);
  }

  /** Wskazanie etapu; miejsca na płycie zapamiętane, elementy interfejsu liczone na bieżąco. */
  private wskazanie(i: number): Wskazanie | null {
    const e = this.rozdzial.etapy[i];
    if (!e?.wskaz) return null;
    const zapamietane = this.celeEtapow.get(i);
    if (zapamietane) return zapamietane;
    const w = e.wskaz(this);
    if (w?.typ === 'swiat') this.celeEtapow.set(i, w);
    return w;
  }

  /** Numer bieżącego etapu albo -1, gdy wszystkie zaliczone. */
  private get biezacyEtap(): number {
    return this.zaliczoneEtapy.findIndex((z) => !z);
  }

  /**
   * Serce samouczka: cofa etapy wyboru, które gracz odwołał, zalicza bieżący, gdy
   * jest spełniony, a zdarzenie pasujące do dalszego etapu zalicza wszystko po drodze —
   * kto zrobi coś szybciej, niż kazano, nie musi tego powtarzać.
   */
  private aktualizuj(z: ZdarzenieGry | null): void {
    if (this.faza !== 'lekcja' || this.zrobiony || this.ustawianie) return;
    const r = this.rozdzial, g = this.gra, zal = this.zaliczoneEtapy;
    for (let i = 0; i < r.etapy.length; i++) {
      const e = r.etapy[i];
      if (zal[i] && e.cofa && e.gotowe && !e.gotowe(g, null, this)) {
        for (let j = i; j < zal.length; j++) zal[j] = false;
        break;
      }
    }
    let zd = z;
    for (let n = 0; n < r.etapy.length; n++) {
      const cur = this.biezacyEtap;
      if (cur < 0) break;
      if (cur !== this.ostatniEtap) {
        this.ostatniEtap = cur;
        this.odEtapu = performance.now();
        this.kamStart = { x: g.cam.x, y: g.cam.y, zoom: g.cam.zoom };
        r.etapy[cur].wejdz?.(g, this);
      }
      const e = r.etapy[cur];
      if (!e.rozumiem && e.gotowe?.(g, zd, this)) { zal[cur] = true; zd = null; continue; }
      if (zd) {
        for (let j = cur + 1; j < r.etapy.length; j++) {
          const d = r.etapy[j];
          // tylko etapy zdarzeń: stan w rodzaju „zapiski zamknięte" jest prawdziwy od początku
          if (d.rozumiem || d.cofa || !d.gotowe || d.gotowe(g, null, this) || !d.gotowe(g, zd, this)) continue;
          for (let k = cur; k <= j; k++) zal[k] = true;
          zd = null;
          break;
        }
        if (!zd) continue;
      }
      break;
    }
    if (this.biezacyEtap < 0) this.zalicz();
  }

  private zalicz(): void {
    if (this.zrobiony) return;
    this.zrobiony = true;
    this.zwinieta = false;                   // „Dalej” musi być widać
    this.gra.wstrzymane = false;             // skutek ma być widoczny od razu
    this.gra.cel = null;
    this.blysk = 1;
    // zaliczony krok brzmi jak wykonany plan: trzy stuki w górę i dzwon
    if (ustawienia.efekty) this.app.gesty.wykonanie(3, 0);
    else this.app.dzwiek.toll();
  }

  private rozumiem(): void {
    const cur = this.biezacyEtap;
    if (cur < 0 || !this.rozdzial.etapy[cur].rozumiem) return;
    this.zaliczoneEtapy[cur] = true;
    this.aktualizuj(null);
  }

  private dalej(): void {
    if (this.idx >= this.rozdzialy.length - 1) { this.koniecNauki(); return; }
    this.zacznijRozdzial(this.idx + 1);
  }

  private wstecz(): void {
    if (this.idx > 0) this.zacznijRozdzial(this.idx - 1);
  }

  private koniecNauki(): void {
    ustaw('samouczekZrobiony', true);
    // co pokazał samouczek, to trafia do atlasu — bez wyskakujących tablic
    for (const id of ['rasa-0', 'ryt-ksztaltuj', 'ryt-zasiej', 'ryt-szept', 'ryt-znak',
      'krew', 'wiara', 'oddanie', 'pamiec', 'sen', 'rdzen', 'prorok', 'pauza']) odkrycia.odkryj(id, false);
    this.faza = 'final';
    const g = this.gra;
    g.dozwolone = new Set();
    g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
    g.cel = null; g.pauza = false; g.zapiski = false;
    this.app.dzwiek.toll();
  }

  private graj(): void {
    this.gra.dozwolone = null;
    ustawienia.tempo = this.tempoPrzed;
    this.app.idz('gra', { tryb: 'nowa' });
  }

  private doMenu(): void {
    this.gra.dozwolone = null;
    ustawienia.tempo = this.tempoPrzed;
    this.app.idz('menu', this.faza === 'final' ? { komunikat: 'Samouczek skończony. Pierwsze tablice czekają w atlasie.' } : undefined);
  }

  // ------------------------------------------------------------- czas i obraz

  krok(dt: number, teraz: number): void {
    if (this.faza === 'scena') { this.film.krok(dt); return; }
    this.blysk = Math.max(0, this.blysk - dt * 0.0016);
    this.gra.krok(dt, teraz);
    if (this.faza !== 'lekcja') return;
    this.aktualizuj(null);
    // cel na płycie idzie za bieżącym etapem; kamera nie ucieka od niego sama
    const cur = this.biezacyEtap;
    const wsk = !this.zrobiony && cur >= 0 ? this.wskazanie(cur) : null;
    this.gra.cel = wsk?.typ === 'swiat' ? wsk.cel : null;
    if (wsk?.typ === 'swiat') this.gra.przejmijKamere();
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    if (this.faza === 'scena') { this.film.rysuj(ctx, w, h, teraz); return; }
    this.vh = h;
    this.gra.rysuj(ctx, w, h, teraz);
    if (this.faza === 'final') { this.rysujFinal(ctx, w, h, teraz); return; }
    // karta wydarzenia ma pierwszeństwo: karta samouczka chowa się, póki gracz nie wybierze
    if (this.gra.sim.wydarzenia.biezace) {
      this.pola = { dalej: null, wstecz: null, pomin: null, karta: null, graj: null, menu: null, zwin: null };
      return;
    }
    const cur = this.biezacyEtap;
    const etap = !this.zrobiony && cur >= 0 ? this.rozdzial.etapy[cur] : null;
    const wsk = etap ? this.wskazanie(cur) : null;
    const cel = this.naEkranie(wsk);
    if (cel && wsk?.typ !== 'swiat') this.przyciemnij(ctx, w, h, cel, teraz);
    if (etap?.gest) this.rysujGest(ctx, etap.gest, teraz);
    const karta = this.rysujKarte(ctx, w, teraz, cel);
    if (cel) this.strzalka(ctx, karta, cel, teraz);
  }

  /** Wskazanie jako prostokąt na ekranie (środek i promień dla pierścieni). */
  private naEkranie(wsk: Wskazanie | null): (Pole & { okrag: boolean }) | null {
    if (!wsk) return null;
    if (wsk.typ === 'punkt') return { x: wsk.x - wsk.r, y: wsk.y - wsk.r, w: wsk.r * 2, h: wsk.r * 2, okrag: true };
    if (wsk.typ === 'obszar') return { x: wsk.o.x - 8, y: wsk.o.y - 8, w: wsk.o.w + 16, h: wsk.o.h + 16, okrag: false };
    const { cam, plate } = this.gra;
    const z = cam.zoom;
    const sx = plate.x + (wsk.cel.x - (cam.x - cam.vw / 2 / z)) * z;
    const sy = plate.y + (wsk.cel.y - (cam.y - cam.vh / 2 / z)) * z;
    if (sx < plate.x || sy < plate.y || sx > plate.x + plate.w || sy > plate.y + plate.h) return null;
    const r = Math.max(22, wsk.cel.r * z) * 1.35;
    return { x: sx - r, y: sy - r, w: r * 2, h: r * 2, okrag: true };
  }

  /** Reszta ekranu przygasa — jasne zostaje tylko to, w co trzeba kliknąć. */
  private przyciemnij(ctx: CanvasRenderingContext2D, w: number, h: number, c: Pole & { okrag: boolean }, teraz: number): void {
    const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    if (c.okrag) {
      const r = c.w / 2 + 4;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else ctx.rect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(6,4,3,0.5)';
    ctx.fill('evenodd');
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.55 + 0.4 * puls);
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.okrag) ctx.arc(cx, cy, c.w / 2 + 2 + puls * 3, 0, Math.PI * 2);
    else ctx.rect(c.x - puls * 3, c.y - puls * 3, c.w + puls * 6, c.h + puls * 6);
    ctx.stroke();
    ctx.restore();
  }

  /** Linia od karty do celu, z grotem — „tu kliknij" bez słów. */
  private strzalka(ctx: CanvasRenderingContext2D, karta: Pole, c: Pole & { okrag: boolean }, teraz: number): void {
    const tx = c.x + c.w / 2, ty = c.y + c.h / 2;
    const sx = Math.max(karta.x, Math.min(karta.x + karta.w, tx));
    const sy = Math.max(karta.y, Math.min(karta.y + karta.h, ty));
    const dx = tx - sx, dy = ty - sy;
    const d = Math.hypot(dx, dy);
    const r = c.okrag ? c.w / 2 + 8 : Math.min(c.w, c.h) / 2 + 8;
    if (d < r + 30) return;
    const ex = tx - dx / d * r, ey = ty - dy / d * r;
    // lekki łuk: linia rylca, nie wskaźnik z programu biurowego
    const mx = (sx + ex) / 2 - dy / d * Math.min(40, d * 0.12), my = (sy + ey) / 2 + dx / d * Math.min(40, d * 0.12);
    ctx.save();
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.8);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -teraz * 0.03;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    const kat = Math.atan2(ey - my, ex - mx);
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(kat - 0.45) * 13, ey - Math.sin(kat - 0.45) * 13);
    ctx.lineTo(ex - Math.cos(kat + 0.45) * 13, ey - Math.sin(kat + 0.45) * 13);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Pokaz gestu na środku płyty: palec, który przeciąga, albo kółko myszy. */
  private rysujGest(ctx: CanvasRenderingContext2D, gest: Gest, teraz: number): void {
    const p = this.gra.plate;
    const cx = p.x + p.w / 2, cy = p.y + p.h * 0.78;
    const t = (teraz - this.odEtapu) * 0.0014;
    ctx.save();
    ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.85);
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.85);
    ctx.lineWidth = 1.6;
    ctx.font = `italic ${Math.max(14, p.w / 70)}px ${SERIF}`;
    ctx.textAlign = 'center';
    if (gest === 'przeciagnij') {
      const faza = (t % 2) / 2;
      const x = cx - 70 + Math.sin(faza * Math.PI) * 140;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(cx - 70, cy); ctx.lineTo(x, cy); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x, cy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, cy, 15 + 3 * Math.sin(t * 6), 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,6,0.8)';
      ctx.strokeText('przeciągnij', cx, cy + 40);
      ctx.fillText('przeciągnij', cx, cy + 40);
    } else {
      // mysz z kółkiem i rosnący pierścień obok
      const mx = cx - 40, my = cy;
      ctx.beginPath();
      ctx.moveTo(mx - 14, my - 6);
      ctx.arcTo(mx - 14, my - 24, mx, my - 24, 13);
      ctx.arcTo(mx + 14, my - 24, mx + 14, my - 6, 13);
      ctx.lineTo(mx + 14, my + 12);
      ctx.arcTo(mx + 14, my + 26, mx, my + 26, 13);
      ctx.arcTo(mx - 14, my + 26, mx - 14, my + 12, 13);
      ctx.closePath();
      ctx.stroke();
      const k = Math.sin(t * 3);
      ctx.beginPath(); ctx.moveTo(mx, my - 17 + k * 3); ctx.lineTo(mx, my - 9 + k * 3); ctx.stroke();
      const r = 12 + 8 * (0.5 + 0.5 * k);
      ctx.beginPath(); ctx.arc(cx + 40, my, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillText(k > 0 ? '−' : '+', cx + 40, my + 6);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,7,6,0.8)';
      const gest = STEROWANIE.pokazKlawisze ? 'kółko myszy · dwa palce' : 'dwa palce';
      ctx.strokeText(gest, cx, cy + 52);
      ctx.fillText(gest, cx, cy + 52);
    }
    ctx.restore();
  }

  private opisKlawisza(t: Tekst | undefined): string {
    if (!t) return '';
    const k = tekstZ(t, this);
    // na telefonie nie ma klawiatury — skrót klawiszowy znika, zostaje tylko opis gestu
    if (AKCJE_KLAWISZY.has(k)) return STEROWANIE.pokazKlawisze ? `klawisz ${nazwaKlawisza(klawisze[k as Akcja])}` : '';
    return k;
  }

  /**
   * Karta rozdziału: numer i tytuł, po co to, lista czynności z odhaczaniem, a po
   * zaliczeniu — co się stało i „Dalej". Siada w rogu płyty, który nie zasłania celu.
   */
  private rysujKarte(ctx: CanvasRenderingContext2D, w: number, teraz: number, cel: Pole | null): Pole {
    if (this.zwinieta) return this.rysujPasek(ctx, w, teraz);
    const r = this.rozdzial;
    const p = this.gra.plate;
    // na telefonie w poziomie karta jest szersza — w wąskiej kolumnie tekst szedł w tyle
    // linijek, że karta wychodziła poza ekran razem z „Rozumiem” i „pomiń”
    const szer = p.waski ? p.w - 16 : p.niski ? Math.min(560, Math.max(320, p.w * 0.56)) : Math.min(440, Math.max(300, p.w * 0.4));
    const wew = szer - 40;
    const cur = this.biezacyEtap;
    const m = p.waski ? 8 : p.niski ? 6 : 14;
    const maxWys = p.waski ? p.h - 38 - m : p.h - 2 * m;
    const koniec = tekstZ(r.koniec, this);
    const glowny = this.zrobiony ? (this.idx === this.rozdzialy.length - 1 ? 'Zakończ →' : 'Dalej →')
      : cur >= 0 && r.etapy[cur].rozumiem ? 'Rozumiem →' : '';

    // Wysokość liczona przed rysowaniem. Karta MUSI zmieścić się na płycie: najpierw
    // mniejsze litery, a gdy to nie wystarcza — tryb zwarty, w którym widać tylko bieżącą
    // czynność (albo, po zaliczeniu, samo podsumowanie). Przyciski zawsze zostają na karcie.
    const zmierz = (rz: number, zwarta: boolean) => {
      ctx.save();
      ctx.font = `italic ${rz * 0.86}px ${SERIF}`;
      const lWstep = zwarta ? 0 : linieAkapitu(ctx, r.wstep, wew);
      ctx.font = `${rz * 0.95}px ${SERIF}`;
      const lEtapy = r.etapy.map((e) => linieAkapitu(ctx, tekstZ(e.tekst, this), wew - rz * 1.4));
      ctx.font = `${rz}px ${SERIF}`;
      const lKoniec = this.zrobiony ? linieAkapitu(ctx, koniec, wew) : 0;
      ctx.restore();
      const widoczne = zwarta ? (this.zrobiony ? [] : [Math.max(0, cur)]) : r.etapy.map((_e, i) => i);
      let h = 20 + rz * 3.65 + lWstep * rz * 1.15 - (zwarta ? rz * 0.35 : 0);
      for (const i of widoczne) {
        h += lEtapy[i] * rz * 1.28;
        if (i === cur && this.opisKlawisza(r.etapy[i].klawisz)) h += rz * 1.0;
      }
      if (this.zrobiony) h += rz * 0.6 + lKoniec * rz * 1.3;
      h += glowny ? rz * 3.1 : rz * 2.5;
      return { rozm: rz, zwarta, lWstep, lEtapy, lKoniec, widoczne, wys: h };
    };
    const bazowy = Math.max(p.niski ? 13 : 15, Math.min(20, w / 62));
    let uklad = zmierz(bazowy, false);
    szukaj: for (const zwarta of [false, true]) {
      for (let rz = bazowy; rz >= 11; rz -= 1) {
        uklad = zmierz(rz, zwarta);
        if (uklad.wys <= maxWys) break szukaj;
      }
    }
    const { rozm, lWstep, lEtapy, widoczne, zwarta } = uklad;
    const wys = Math.min(uklad.wys, Math.max(maxWys, rozm * 6));
    const lhE = rozm * 1.28;

    // róg, który nie zasłania celu
    const rogi: [number, number][] = p.waski
      // wąsko: pod progiem Znaku i klepsydrą tempa w górnym pasie płyty
      ? [[p.x + m, p.y + 38], [p.x + m, p.y + p.h - wys - m]]
      : [[p.x + p.w - szer - m, p.y + m], [p.x + p.w - szer - m, p.y + p.h - wys - m], [p.x + m, p.y + m], [p.x + m, p.y + p.h - wys - m]];
    let [x, y] = rogi[0];
    if (cel) {
      // róg, który najmniej zasłania cel (zwykle wcale)
      const zakrycie = (rx: number, ry: number) =>
        Math.max(0, Math.min(rx + szer, cel.x + cel.w + 20) - Math.max(rx, cel.x - 20))
        * Math.max(0, Math.min(ry + wys, cel.y + cel.h + 20) - Math.max(ry, cel.y - 20));
      let najmniej = Infinity;
      for (const [rx, ry] of rogi) {
        const z = zakrycie(rx, ry);
        if (z < najmniej) { najmniej = z; x = rx; y = ry; }
        if (z === 0) break;
      }
      // Karta w poziomie zajmuje ponad pół płyty — cel na środku leżał pod nią w każdym rogu
      // i nie dało się w niego trafić. Wtedy płyta odsuwa się tak, żeby cel stanął obok karty.
      const g = this.gra;
      if (najmniej > 0 && g.cel) {
        const p2 = g.plate;
        const wolnyX = x > p2.x + p2.w / 2 - szer / 2 ? (p2.x + x) / 2 : (x + szer + p2.x + p2.w) / 2;
        const dx = (cel.x + cel.w / 2 - wolnyX) / g.cam.zoom;
        g.cam.x += dx; g.camTarget.x += dx;
        g.cam.clamp(g.sim.world.w, g.sim.world.h);
      }
    }
    const karta = { x, y, w: szer, h: wys };
    this.pola.karta = karta;
    ramaKarty(ctx, x, y, szer, wys, 1, this.tytulKarty(szer), true);
    if (this.blysk > 0) {
      ctx.strokeStyle = rgba(BARWA.zarBlady, this.blysk * 0.9);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 4, y - 4, szer + 8, wys + 8);
    }

    // nagłówek: numer rozdziału i kropki postępu
    const lx = x + 20;
    let yy = y + 20 + rozm * 0.7;
    ctx.textAlign = 'left';
    // numer rozdziału stoi na zakładce ramy; tu zostają kropki postępu
    const n = this.rozdzialy.length, kr = Math.max(3, rozm * 0.2), krok = kr * 3.2;
    for (let i = 0; i < n; i++) {
      const kx = x + szer - 20 - (n - 1 - i) * krok, ky = yy - rozm * 0.25;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      if (i < this.idx || (i === this.idx && this.zrobiony)) { ctx.fillStyle = rgba(BARWA.zarBlady, 0.9); ctx.fill(); }
      else { ctx.strokeStyle = rgba(i === this.idx ? BARWA.atramentMocny : BARWA.atramentCichy, i === this.idx ? 0.9 : 0.5); ctx.lineWidth = 1; ctx.stroke(); }
    }
    yy += rozm * 1.55;
    ctx.font = `${rozm * 1.3}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.98);
    ctx.fillText(r.tytul, lx, yy);
    yy += rozm * 1.05;
    if (!zwarta) {
      ctx.font = `italic ${rozm * 0.86}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.atrament, 0.78);
      akapit(ctx, r.wstep, lx, yy, wew, rozm * 1.15);
      yy += lWstep * rozm * 1.15 + rozm * 0.35;
    }

    // lista czynności (w trybie zwartym tylko bieżąca)
    for (const i of widoczne) {
      const e = r.etapy[i];
      const zrob = this.zaliczoneEtapy[i];
      const biezacy = i === cur;
      const ex = lx + rozm * 1.4;
      yy += rozm * 0.45;
      ctx.font = `${rozm * 0.95}px ${SERIF}`;
      // znacznik: ✓ zrobione, wskazówka dla bieżącego, kropka dla przyszłych
      ctx.textAlign = 'center';
      if (zrob) {
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx + rozm * 0.1, yy - rozm * 0.32);
        ctx.lineTo(lx + rozm * 0.38, yy - rozm * 0.08);
        ctx.lineTo(lx + rozm * 0.85, yy - rozm * 0.7);
        ctx.stroke();
      } else if (biezacy) {
        const drg = Math.sin(teraz * 0.008) * 2;
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
        ctx.beginPath();
        ctx.moveTo(lx + rozm * 0.2 + drg, yy - rozm * 0.62);
        ctx.lineTo(lx + rozm * 0.75 + drg, yy - rozm * 0.33);
        ctx.lineTo(lx + rozm * 0.2 + drg, yy - rozm * 0.04);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
        ctx.beginPath(); ctx.arc(lx + rozm * 0.45, yy - rozm * 0.33, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = zrob ? rgba(BARWA.atramentCichy, 0.8) : biezacy ? rgba(BARWA.atramentMocny, 1) : rgba(BARWA.atramentCichy, 0.6);
      akapit(ctx, tekstZ(e.tekst, this), ex, yy, wew - rozm * 1.4, lhE);
      yy += (lEtapy[i] - 1) * lhE;
      if (biezacy && this.opisKlawisza(e.klawisz)) {
        yy += rozm * 1.0;
        ctx.font = `italic ${rozm * 0.78}px ${SERIF}`;
        ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
        ctx.fillText(this.opisKlawisza(e.klawisz), ex, yy);
      }
      yy += rozm * 0.83;
    }

    if (this.zrobiony) {
      yy += rozm * 0.6;
      ctx.font = `${rozm}px ${SERIF}`;
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.97);
      akapit(ctx, koniec, lx, yy, wew, rozm * 1.3);
    }

    // przyciski: główny po prawej, „wstecz" i „pomiń" cicho po lewej
    const by = y + wys - rozm * 1.45;
    this.pola.dalej = null; this.pola.wstecz = null; this.pola.pomin = null;
    if (glowny) {
      ctx.font = `${rozm * 1.05}px ${SERIF}`;
      const bw = ctx.measureText(glowny).width + rozm * 1.6, bh = rozm * 1.9;
      const bx = x + szer - 18 - bw, byy = by - bh * 0.68;
      const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.16 + 0.1 * puls);
      ctx.fillRect(bx, byy, bw, bh);
      ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7 + 0.3 * puls);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(bx + 0.5, byy + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
      ctx.textAlign = 'center';
      ctx.fillText(glowny, bx + bw / 2, by);
      this.pola.dalej = { x: bx, y: byy, w: bw, h: bh };
    }
    ctx.font = `italic ${Math.max(13, rozm * 0.78)}px ${SERIF}`;
    ctx.textAlign = 'left';
    let sx = lx;
    if (this.idx > 0) {
      const t = '← wstecz';
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
      ctx.fillText(t, sx, by);
      this.pola.wstecz = { x: sx - 6, y: by - rozm, w: tw + 12, h: rozm * 1.6 };
      sx += tw + rozm * 1.2;
    }
    if (!this.zrobiony) {
      const t = 'pomiń';
      const tw = ctx.measureText(t).width;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.75);
      ctx.fillText(t, sx, by);
      this.pola.pomin = { x: sx - 6, y: by - rozm, w: tw + 12, h: rozm * 1.6 };
    }
    ctx.font = `italic ${Math.max(12, rozm * 0.66)}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.55);
    ctx.fillText(STEROWANIE.pokazKlawisze ? 'esc — wyjście z samouczka' : '≡ w rogu — wyjście z samouczka', lx, y + wys - rozm * 0.45);
    // zwiń — karta chowa się do paska, gdy zasłania płytę (póki krok nie jest zaliczony)
    this.pola.zwin = null;
    if (!this.zrobiony) {
      // zakładka na górnej krawędzi, po prawej — nie wchodzi na przyciski na dole karty
      ctx.font = `italic ${Math.max(12, rozm * 0.72)}px ${SERIF}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const t = 'zwiń ▴';
      const tw = ctx.measureText(t).width;
      const zx = x + szer - 14, zy = y;
      ctx.fillStyle = rgba(BARWA.sadza, 1);
      ctx.fillRect(zx - tw - 8, zy - rozm * 0.55, tw + 14, rozm * 1.1);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
      ctx.fillText(t, zx, zy + 1);
      ctx.textBaseline = 'alphabetic';
      this.pola.zwin = { x: zx - tw - 10, y: zy - rozm * 0.8, w: tw + 18, h: rozm * 1.6 };
    }
    ctx.restore();
    return karta;
  }

  /** Napis na zakładce karty — na wąskiej karcie krótszy, żeby zmieścił się obok „zwiń”. */
  private tytulKarty(szer: number): string {
    const r = `rozdział ${this.idx + 1} z ${this.rozdzialy.length}`;
    return szer < 460 ? r : `samouczek · ${r}`;
  }

  /** Zwinięta karta: jeden pasek z bieżącą czynnością; dotknięcie rozwija. */
  private rysujPasek(ctx: CanvasRenderingContext2D, w: number, teraz: number): Pole {
    const p = this.gra.plate;
    const rozm = Math.max(13, Math.min(17, w / 70));
    const szer = p.waski ? p.w - 16 : Math.min(440, Math.max(300, p.w * 0.4));
    const wys = rozm * 2.6;
    const x = p.waski ? p.x + 8 : p.x + p.w - szer - 14;
    const y = p.waski ? p.y + 38 : p.y + 14;
    ramaKarty(ctx, x, y, szer, wys, 1, this.tytulKarty(szer), true);
    const cur = this.biezacyEtap;
    const tekst = cur >= 0 ? tekstZ(this.rozdzial.etapy[cur].tekst, this) : this.rozdzial.tytul;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${rozm * 0.8}px ${SERIF}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
    const roz = 'rozwiń ▾';
    const rw = ctx.measureText(roz).width;
    ctx.fillText(roz, x + szer - 14, y + wys / 2 + 1);
    ctx.textAlign = 'left';
    ctx.font = `${rozm}px ${SERIF}`;
    let t = tekst;
    const maxW = szer - 44 - rw;
    while (ctx.measureText(t).width > maxW && t.length > 8) t = t.slice(0, -2);
    if (t !== tekst) t += '…';
    const drg = Math.sin(teraz * 0.008) * 2;
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
    ctx.beginPath();
    ctx.moveTo(x + 14 + drg, y + wys / 2 - rozm * 0.3); ctx.lineTo(x + 14 + rozm * 0.5 + drg, y + wys / 2); ctx.lineTo(x + 14 + drg, y + wys / 2 + rozm * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.97);
    ctx.fillText(t, x + 20 + rozm * 0.6, y + wys / 2 + 1);
    ctx.restore();
    const pasek = { x, y, w: szer, h: wys };
    this.pola.karta = pasek;
    this.pola.dalej = null; this.pola.wstecz = null; this.pola.pomin = null; this.pola.zwin = null;
    return pasek;
  }

  /** Ostatnia karta: co dalej — prawdziwa gra albo menu. */
  private rysujFinal(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const rozm = Math.max(16, Math.min(22, w / 56));
    const szer = Math.min(560, w - 32);
    const tekst = `Umiesz już wszystko, czego trzeba na początek. Nad płytą zawsze stoi jedno zdanie: co teraz najpilniejsze — dotknij go, a kamera pojedzie na miejsce. Rasy, przypływy, woda, żar i zawały — resztę odkryjesz sam. W atlasie (przycisk z księgą) czekają już pierwsze tablice — kolejne odkryjesz, grając.`;
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,3,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${rozm}px ${SERIF}`;
    const linie = linieAkapitu(ctx, tekst, szer - 56);
    const wys = rozm * 3.4 + linie * rozm * 1.35 + rozm * 4.6;
    const x = (w - szer) / 2, y = Math.max(16, (h - wys) / 2);
    panel(ctx, x, y, szer, wys, 0.97);
    ctx.textAlign = 'center';
    ctx.font = `${rozm * 1.5}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
    ctx.fillText('Samouczek skończony', w / 2, y + rozm * 2.2);
    ctx.font = `${rozm}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.9);
    akapit(ctx, tekst, w / 2, y + rozm * 3.8, szer - 56, rozm * 1.35, 'center');

    const by = y + wys - rozm * 1.6;
    const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
    ctx.font = `${rozm * 1.05}px ${SERIF}`;
    const t1 = 'Zagraj naprawdę →', t2 = 'wróć do menu';
    const w1 = ctx.measureText(t1).width + rozm * 1.8, bh = rozm * 2;
    const x1 = w / 2 + rozm * 0.5;
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.16 + 0.1 * puls);
    ctx.fillRect(x1, by - bh * 0.68, w1, bh);
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7 + 0.3 * puls);
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x1 + 0.5, by - bh * 0.68 + 0.5, w1 - 1, bh - 1);
    ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
    ctx.fillText(t1, x1 + w1 / 2, by);
    this.pola.graj = { x: x1, y: by - bh * 0.68, w: w1, h: bh };
    ctx.font = `italic ${rozm * 0.95}px ${SERIF}`;
    const w2 = ctx.measureText(t2).width;
    const x2 = w / 2 - rozm * 1.2 - w2;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
    ctx.textAlign = 'left';
    ctx.fillText(t2, x2, by);
    this.pola.menu = { x: x2 - 8, y: by - rozm, w: w2 + 16, h: rozm * 1.7 };
    ctx.restore();
  }

  // ---------------------------------------------------------------- wejście

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    if (this.faza === 'scena') {
      if (faza === 'dol') { if (this.film.trafiaPomin(e.clientX, e.clientY)) this.film.pomin(); else this.film.dalej(); }
      return;
    }
    const x = e.clientX, y = e.clientY;
    if (this.faza === 'final') {
      if (faza !== 'dol') return;
      if (wPolu(this.pola.graj, x, y)) this.graj();
      else if (wPolu(this.pola.menu, x, y)) this.doMenu();
      return;
    }
    if (faza === 'dol') {
      if (this.zwinieta && wPolu(this.pola.karta, x, y)) { this.zwinieta = false; this.app.gesty.klik(); return; }
      if (wPolu(this.pola.zwin ?? null, x, y)) { this.zwinieta = true; this.app.gesty.klik(); return; }
      if (wPolu(this.pola.dalej, x, y)) { if (this.zrobiony) this.dalej(); else this.rozumiem(); return; }
      if (wPolu(this.pola.wstecz, x, y)) { this.wstecz(); return; }
      if (wPolu(this.pola.pomin, x, y)) { this.dalej(); return; }
      // karta leży na płycie, ale nie jest skałą — z wybranym rytem klik w nią nie może
      // drążyć ani siać; bez rytu przeciągnięcie zaczęte na karcie przesuwa widok jak zwykle
      if (wPolu(this.pola.karta, x, y) && this.gra.ui.verb) return;
    }
    this.gra.dotyk(e, faza);
  }

  kolko(e: WheelEvent): void {
    if (this.faza === 'scena') return;
    this.gra.kolko(e);
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (akcja === 'menu') {
      if (this.faza === 'scena') { this.film.pomin(); return; }
      this.doMenu();
      return;
    }
    if (this.faza === 'scena') { if (e.key === ' ' || e.key === 'Enter') this.film.dalej(); return; }
    if (this.faza === 'final') { if (e.key === 'Enter') this.graj(); return; }
    if (e.key === 'Enter') {
      if (this.zrobiony) this.dalej(); else this.rozumiem();
      return;
    }
    this.gra.klawisz?.(akcja, e);
  }
}
