import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { EkranGry, type ZdarzenieGry } from './game';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL } from '../../render/ink';
import { ustaw, ustawienia } from '../../core/settings-store';
import { odkrycia } from '../../atlas/odkrycia';
import { odswiezPlan } from '../../sim/pielgrzymka';
import { miejscePomnika } from '../../sim/pomnik';
import { SURFACE_Y } from '../../sim/world';
import { LEKCJE, FINAL, type Lekcja, type StanSamouczka } from './samouczek/lekcje';
import {
  EASE, ZLOTO, klamra, lerp, odcinek, wczytajRekawice, rysujGest, wypisz, ptaszek, paciorki, zaokraglony,
  winieta, pasyKinowe, zarzewie, pylWLocie, Reflektor, Iskry, type CelEkranu, type Gest, type Punkt,
} from './samouczek/animacje';

interface Pole { x: number; y: number; w: number; h: number }
const wPolu = (p: Pole | null, x: number, y: number): boolean => !!p && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

/** Samouczek zawsze toczy się w tej samej górze. */
const ZIARNO_SAMOUCZKA = 20260921;
/** Rękawica-duch pokazuje gest dopiero po tej chwili od początku fazy — najpierw można spróbować samemu. */
const DUCH_PO_MS = 650;

interface Lot { p0: Punkt; p1: Punkt; p2: Punkt; p3: Punkt; z0: number; z1: number; t0: number; ms: number; potem?: () => void }

/**
 * Samouczek (25.10, od nowa). Minimalny: cztery lekcje i finał, jedno zdanie naraz. Nad grą leży tylko
 * mała karta (paciorki postępu, zdanie, ciche słowo pod spodem), reflektor na tym, w co trafić, i rękawica-duch,
 * która pokazuje ruch. Zrobiona faza rozsypuje iskry i od razu przechodzi w następną; zrobiona lekcja
 * czeka na „dalej” (kroki przewija gracz — skarga Pawła: „napisy się zbyt szybko zmieniają”).
 * Wejście: kamera zjeżdża z katedry do sali. Finał: kamera płynie szybem drogi wiernych na dno, do śpiącego
 * demona. Treść lekcji — ./samouczek/lekcje.ts, rysunki — ./samouczek/animacje.ts.
 */
export class EkranSamouczka implements Ekran, StanSamouczka {
  nazwa = 'samouczek';
  gra: EkranGry;
  flagi = new Set<string>();

  private stan: 'wejscie' | 'lekcja' | 'final' = 'wejscie';
  private nr = 0;
  private fazaNr = 0;
  private zrobiona = false;
  private teraz = 0;
  private dt = 16;
  private wejscieOd = 0;
  private fazaOd = 0;
  private zrobionaOd = -1e9;
  private finalOd = 0;
  /** Chwila, gdy kamera dopłynęła do demona (0 — jeszcze płynie). */
  private przylotOd = 0;
  /** Ostatni ruch gracza na płycie — rękawica-duch przygasa, gdy gracz sam działa. */
  private ostatniRuch = -1e9;
  private duchA = 0;
  private kamStart = { x: 0, y: 0, zoom: 1 };
  private lot: Lot | null = null;
  private reflektor = new Reflektor();
  private iskry = new Iskry();
  /** Ostatnie miejsce, które oświetlał reflektor — tam sypią się iskry po zrobionej fazie. */
  private ostatniCel: CelEkranu | null = null;
  /** Gest bieżącej fazy z tej klatki (krok liczy, rysuj pokazuje). */
  private gest: Gest | null = null;
  private tekst = { biezacy: '', od: 0, poprzedni: '', poprzOd: -1e9 };
  private karta = { x: NaN, y: NaN, w: NaN, a: 0, blyskOd: -1e9 };
  /** Wciśnięcia zaczęte na karcie — reszta tego gestu nie idzie do gry. */
  private pochloniete = new Set<number>();

  pola: { karta: Pole | null; dalej: Pole | null; wyjdz: Pole | null; graj: Pole | null; menu: Pole | null } =
    { karta: null, dalej: null, wyjdz: null, graj: null, menu: null };

  constructor(private app: Kontekst) {
    this.gra = new EkranGry(app);
    this.gra.zapisujAuto = false;
    this.gra.nasluch = (z) => this.zdarzenie(z);
  }

  /** Góra samouczka generowana z wyprzedzeniem (ekran ładowania). */
  przygotuj(): void { this.gra.przygotuj(ZIARNO_SAMOUCZKA); }

  private get lekcja(): Lekcja { return LEKCJE[this.nr]; }

  // ------------------------------------------------------------- StanSamouczka

  naEkranie(wx: number, wy: number): Punkt | null {
    const { cam, plate } = this.gra;
    const x = plate.x + cam.toScreenX(wx), y = plate.y + cam.toScreenY(wy);
    return x < plate.x || y < plate.y || x > plate.x + plate.w || y > plate.y + plate.h ? null : { x, y };
  }

  srodekPlyty(): Punkt {
    const p = this.gra.plate;
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  }

  // ------------------------------------------------------------- przebieg

  wejdz(): void {
    wczytajRekawice();
    const g = this.gra;
    g.nowaGra(ZIARNO_SAMOUCZKA);
    g.sim.spokojnySwiat = true;      // stały świat: żadnych zaraz ani klęsk w trakcie nauki
    g.sim.nakarmSwiat();             // i wiadro z jedzeniem od razu
    g.wejdz({ tryb: 'samouczek' });
    this.app.muzyka.ustawScene('samouczek');
    odswiezPlan(g.sim);              // plan szybu od razu — lekcja drogi wiernych go wskazuje
    g.dozwolone = new Set();
    g.zapiski = false;
    g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
    g.zaznaczeni.clear();
    g.cel = null;
    this.stan = 'wejscie';
    this.nr = 0; this.fazaNr = 0; this.zrobiona = false;
    this.flagi.clear();
    this.tekst = { biezacy: '', od: 0, poprzedni: '', poprzOd: -1e9 };
    this.karta = { x: NaN, y: NaN, w: NaN, a: 0, blyskOd: -1e9 };
    this.reflektor = new Reflektor();
    this.iskry = new Iskry();
    this.pochloniete.clear();
    this.teraz = performance.now();
    this.wejscieOd = this.teraz;
    // wejście: kamera stoi pod katedrą i zjeżdża szybem światła do sali
    const s = g.sim.world.salaStart;
    g.pokazMiejsce(s.x, SURFACE_Y - 4, 15);
    this.lec(s.x, s.y - 3, 15, 2600, () => this.koniecWejscia());
  }

  rozmiar(w: number, h: number): void { this.gra.rozmiar(w, h); }

  private koniecWejscia(): void {
    if (this.stan !== 'wejscie') return;
    this.dokonczLot();
    this.stan = 'lekcja';
    this.zacznijLekcje(0);
  }

  private zacznijLekcje(i: number): void {
    const g = this.gra;
    this.nr = i;
    this.fazaNr = -1;
    this.zrobiona = false;
    this.flagi.clear();
    this.ostatniCel = null;
    g.dozwolone = new Set(this.lekcja.czasowniki ?? []);
    g.ui.verb = null; g.ui.tool = null;
    this.lekcja.przygotuj?.(this);
    this.kamStart = { x: g.cam.x, y: g.cam.y, zoom: g.cam.zoom };
    const k = this.lekcja.kamera?.(this);
    // cel siada trochę poniżej środka płyty — u góry leży karta
    const zoom = klamra(g.cam.zoom, 14, 18);
    if (k) this.lec(k.x, k.y - (g.plate.h * 0.06) / zoom, zoom, 1200);
    this.ocenFazy();
  }

  /** Bieżąca faza: tuż za najdalszą zrobioną. Ostatnia zrobiona kończy lekcję. */
  private ocenFazy(): void {
    if (this.stan !== 'lekcja' || this.zrobiona) return;
    const f = this.lekcja.fazy;
    let cur = 0;
    for (let i = f.length - 1; i >= 0; i--) if (f[i].zrobiona(this)) { cur = i + 1; break; }
    if (cur >= f.length) { this.zakonczLekcje(); return; }
    if (cur === this.fazaNr) return;
    // faza zrobiona (nie cofnięta): iskry tam, gdzie świecił reflektor, i krótki stuk
    if (this.fazaNr >= 0 && cur > this.fazaNr) {
      for (let j = this.fazaNr; j < cur; j++) f[j].po?.(this);
      const c = this.ostatniCel;
      if (c) this.iskry.wybuch(c.x, c.y, this.teraz);
      this.app.gesty.klik();
    }
    this.fazaNr = cur;
    this.fazaOd = this.teraz;
    this.ustawTekst(f[cur].tekst);
  }

  private zakonczLekcje(): void {
    this.zrobiona = true;
    this.zrobionaOd = this.teraz;
    this.karta.blyskOd = this.teraz;
    const c = this.ostatniCel ?? this.reflektor.srodek;
    if (c) this.iskry.wybuch(c.x, c.y, this.teraz, true);
    else if (this.pola.karta) this.iskry.wybuch(this.pola.karta.x + 30, this.pola.karta.y + this.pola.karta.h / 2, this.teraz, true);
    this.ustawTekst(this.lekcja.koniec);
    const g = this.gra;
    g.ui.verb = null; g.ui.tool = null;
    g.dozwolone = new Set();
    // zrobiona lekcja brzmi jak wykonany plan: trzy stuki w górę i dzwon
    if (ustawienia.efekty) this.app.gesty.wykonanie(3, 0);
    else this.app.dzwiek.toll();
  }

  private dalej(): void {
    if (!this.zrobiona) return;
    this.app.gesty.klik();
    if (this.nr < LEKCJE.length - 1) this.zacznijLekcje(this.nr + 1);
    else this.zacznijFinal();
  }

  private zacznijFinal(): void {
    const g = this.gra, sim = g.sim, w = sim.world;
    this.stan = 'final';
    this.finalOd = this.teraz;
    this.przylotOd = 0;
    ustaw('samouczekZrobiony', true);
    // co pokazał samouczek, to trafia do atlasu — bez wyskakujących tablic
    for (const id of ['rozkazy', 'role', 'droga', 'schody', 'oltarz', 'rytual-modlitwa', 'wiadro', 'ryt-zasiej', 'skorupa', 'boss'])
      odkrycia.odkryj(id, false);
    g.dozwolone = new Set();
    g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
    g.zaznaczeni.clear();
    // kamera płynie szybem drogi wiernych w dół, a u dna skręca do pomnika
    const pom = miejscePomnika(sim), sz = w.szybDrogi;
    const sx = sz.x1 >= sz.x0 ? (sz.x0 + sz.x1 + 1) / 2 : pom.x;
    const zoom = Math.min(Math.max(g.cam.zoom, 12), 14);
    this.lec(pom.x, pom.y - 2, zoom, 5600, () => { this.przylotOd = performance.now(); this.app.dzwiek.toll(); },
      [{ x: sx, y: g.cam.y + 14 }, { x: sx, y: pom.y - 40 }]);
  }

  private graj(): void {
    this.gra.dozwolone = null;
    this.app.idz('gra', { tryb: 'nowa' });
  }

  private doMenu(): void {
    this.gra.dozwolone = null;
    this.app.idz('menu', this.stan === 'final' ? { komunikat: 'Samouczek skończony. Pierwsze tablice czekają w atlasie.' } : undefined);
  }

  private ustawTekst(t: string): void {
    if (t === this.tekst.biezacy) return;
    const byl = this.tekst.biezacy;
    this.tekst = { biezacy: t, od: this.teraz + (byl ? 170 : 120), poprzedni: byl, poprzOd: this.teraz };
  }

  /** Zdarzenia z gry, które zaliczają fazy. */
  private zdarzenie(z: ZdarzenieGry): void {
    const c = this.gra.cam;
    if (z.typ === 'kamera' && z.rodzaj === 'przesun' && Math.hypot(c.x - this.kamStart.x, c.y - this.kamStart.y) > 3) this.flagi.add('przesun');
    if (z.typ === 'kamera' && z.rodzaj === 'zoom' && Math.abs(Math.log(c.zoom / this.kamStart.zoom)) > 0.22) this.flagi.add('zoom');
    if (z.typ === 'polecenie' && z.rodzaj === 'droga' && z.przyjeli > 0) this.flagi.add('droga');
    if (z.typ === 'oltarz' && z.rodzaj === 'modlitwa') this.flagi.add('modlitwa');
    if (z.typ === 'moc' && z.czasownik === 'zasiej') this.flagi.add('nakarm');
  }

  // ------------------------------------------------------------- kamera

  /** Płynny lot kamery do (x, y) — po krzywej przez `posrednie`, gdy podane; przybliżenie zmienia się po drodze. */
  private lec(x: number, y: number, zoom: number, ms: number, potem?: () => void, posrednie?: [Punkt, Punkt]): void {
    const c = this.gra.cam;
    const p0 = { x: c.x, y: c.y }, p3 = { x, y };
    const [p1, p2] = posrednie ?? [{ x: lerp(p0.x, x, 1 / 3), y: lerp(p0.y, y, 1 / 3) }, { x: lerp(p0.x, x, 2 / 3), y: lerp(p0.y, y, 2 / 3) }];
    this.lot = { p0, p1, p2, p3, z0: c.zoom, z1: zoom, t0: performance.now(), ms, potem };
  }

  private krokLotu(teraz: number): void {
    const l = this.lot;
    if (!l) return;
    const k = klamra((teraz - l.t0) / l.ms);
    const e = EASE.inOutSine(k), u = 1 - e;
    const g = this.gra, c = g.cam;
    c.x = u * u * u * l.p0.x + 3 * u * u * e * l.p1.x + 3 * u * e * e * l.p2.x + e * e * e * l.p3.x;
    c.y = u * u * u * l.p0.y + 3 * u * u * e * l.p1.y + 3 * u * e * e * l.p2.y + e * e * e * l.p3.y;
    c.zoom = Math.exp(lerp(Math.log(l.z0), Math.log(l.z1), e));
    c.clamp(g.sim.world.w, g.sim.world.h);
    g.camTarget.x = c.x; g.camTarget.y = c.y;
    g.przejmijKamere();
    if (k >= 1) { this.lot = null; l.potem?.(); }
  }

  private dokonczLot(): void {
    const l = this.lot;
    if (!l) return;
    l.t0 = -1e9;
    this.lot = null;
    const g = this.gra, c = g.cam;
    c.x = l.p3.x; c.y = l.p3.y; c.zoom = l.z1;
    c.clamp(g.sim.world.w, g.sim.world.h);
    g.camTarget.x = c.x; g.camTarget.y = c.y;
  }

  // ------------------------------------------------------------- czas

  krok(dt: number, teraz: number): void {
    this.teraz = teraz;
    this.dt = dt;
    if (!this.wejscieOd) this.wejscieOd = teraz;
    this.krokLotu(teraz);
    this.gra.krok(dt, teraz);
    this.gra.cel = null;                       // znaczniki rad i kart milczą — wskazuje reflektor
    this.ocenFazy();
    const faza = this.stan === 'lekcja' && !this.zrobiona ? this.lekcja.fazy[this.fazaNr] : null;
    const cel = faza?.cel?.(this) ?? null;
    this.gest = faza?.gest?.(this) ?? null;
    // iskry po fazie bez reflektora (przesuń, przybliż) sypią się tam, gdzie pokazywała rękawica
    if (cel) this.ostatniCel = cel;
    else if (this.gest?.typ === 'przesun' || this.gest?.typ === 'kolko') this.ostatniCel = { x: this.gest.x, y: this.gest.y, r: 40 };
    this.reflektor.krok(this.lot ? null : cel, dt);
    // duch przygasa, gdy gracz sam działa albo płynie kamera
    const docel = this.stan !== 'lekcja' || this.zrobiona || this.lot ? 0 : teraz - this.ostatniRuch < 1400 ? 0.22 : 1;
    this.duchA = lerp(this.duchA, docel, 1 - Math.exp(-dt / 180));
    this.karta.a = lerp(this.karta.a, this.stan === 'lekcja' ? 1 : 0, 1 - Math.exp(-dt / (this.stan === 'lekcja' ? 220 : 140)));
  }

  // ------------------------------------------------------------- obraz

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    this.gra.rysuj(ctx, w, h, teraz);
    this.reflektor.rysuj(ctx, w, h, teraz);
    if (this.stan === 'lekcja' && !this.zrobiona && this.gest) rysujGest(ctx, this.gest, teraz - this.fazaOd - DUCH_PO_MS, this.duchA, w, h);
    this.iskry.rysuj(ctx, teraz);
    this.rysujKarte(ctx, w, teraz);
    if (this.stan === 'wejscie') this.rysujWejscie(ctx, w, h, teraz);
    if (this.stan === 'final') this.rysujFinal(ctx, w, h, teraz);
  }

  /** Wejście: ekran wychodzi z czerni, a nad zjeżdżającą kamerą na chwilę staje słowo „Samouczek”. */
  private rysujWejscie(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const t = teraz - this.wejscieOd;
    const czern = 1 - EASE.out(odcinek(t, 0, 1200));
    if (czern > 0) { ctx.fillStyle = `rgba(0,0,0,${czern})`; ctx.fillRect(0, 0, w, h); }
    const p = this.gra.plate;
    const rz = klamra(w / 22, 30, 60);
    ctx.save();
    ctx.font = `${rz}px ${SERIF_TYTUL}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 16;
    wypisz(ctx, 'Samouczek', p.x + p.w / 2, p.y + p.h * 0.42, t - 300, (a) => rgba(BARWA.atramentMocny, a),
      { krok: 55, czas: 420, dy: 10, znika: odcinek(t, 1700, 2300) });
    ctx.restore();
  }

  /**
   * Karta: paciorki lekcji, jedno zdanie i ciche słowo pod nim. Stoi u góry płyty, a gdy reflektor świeci pod nią —
   * zjeżdża na dół. Szerokość i położenie płyną; zdanie wypisuje się literami, stare odpływa w górę.
   */
  private rysujKarte(ctx: CanvasRenderingContext2D, w: number, teraz: number): void {
    const a = this.karta.a;
    this.pola.karta = null; this.pola.dalej = null; this.pola.wyjdz = null;
    if (a < 0.01 || this.fazaNr < 0 && !this.zrobiona) return;
    const p = this.gra.plate;
    const rz = klamra(w / 64, 15, 20);
    const fTekst = `${rz * 1.15}px ${SERIF}`, fPodp = `italic ${rz * 0.82}px ${SERIF}`, fPrz = `${rz}px ${SERIF}`;
    const faza = this.zrobiona ? null : this.lekcja.fazy[this.fazaNr];
    const podp = faza?.podpowiedz?.(this) ?? '';
    const ile = LEKCJE.length + 1;
    const sP = rz * 0.44, pacW = (ile - 1) * sP * 1.75 + sP;
    const pad = rz * 1.15;
    ctx.save();
    ctx.font = fTekst;
    const tw = ctx.measureText(this.tekst.biezacy).width;
    ctx.font = fPodp;
    const pw = podp ? ctx.measureText(podp).width : 0;
    ctx.font = fPrz;
    const dalejTxt = 'dalej  ›';
    const bw = ctx.measureText(dalejTxt).width + rz * 1.6;
    const tresc = Math.max(tw + (this.zrobiona ? rz * 1.6 : 0), pw);
    const docelW = Math.min(p.w - 16, pad + pacW + rz * 1.1 + tresc + (this.zrobiona ? rz * 1.2 + bw : 0) + rz * 1.9 + pad * 0.6);
    const wys = podp ? rz * 3.55 : rz * 2.7;
    const k = 1 - Math.exp(-this.dt / 170);
    this.karta.w = isNaN(this.karta.w) ? docelW : lerp(this.karta.w, docelW, k);
    const szer = this.karta.w;
    const x = p.x + p.w / 2 - szer / 2;
    // karta nie zasłania tego, co oświetla reflektor
    const yG = p.y + 14, yD = p.y + p.h - wys - 14;
    const o = this.reflektor.obrys;
    const zaslania = !!o && o.y0 < yG + wys + 24 && o.y1 > yG - 10 && o.x1 > x - 10 && o.x0 < x + szer + 10;
    const docelY = zaslania ? yD : yG;
    this.karta.y = isNaN(this.karta.y) ? docelY : lerp(this.karta.y, docelY, k);
    const y = this.karta.y - (1 - EASE.out(a)) * 18;
    ctx.globalAlpha = a;

    // tło: ciemna tabliczka z cieniem; złota obwódka rozbłyska przy zrobionej lekcji
    const blysk = 1 - odcinek(teraz - this.karta.blyskOd, 0, 1000);
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 5;
    zaokraglony(ctx, x, y, szer, wys, rz * 0.6);
    ctx.fillStyle = 'rgba(13,10,8,0.9)';
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = ZLOTO(0.26 + 0.64 * blysk);
    ctx.lineWidth = 1 + blysk * 1.2;
    ctx.stroke();
    if (blysk > 0) {
      // połysk przebiega przez kartę
      ctx.save();
      zaokraglony(ctx, x, y, szer, wys, rz * 0.6);
      ctx.clip();
      const bx = x - 90 + (szer + 180) * EASE.inOut(odcinek(teraz - this.karta.blyskOd, 0, 900));
      const g = ctx.createLinearGradient(bx - 60, 0, bx + 60, 0);
      g.addColorStop(0, ZLOTO(0)); g.addColorStop(0.5, ZLOTO(0.22 * blysk)); g.addColorStop(1, ZLOTO(0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(bx - 60, y, 120, wys);
      ctx.restore();
    }

    // paciorki postępu
    const srY = y + (podp ? rz * 1.45 : wys / 2);
    paciorki(ctx, x + pad + sP * 0.5, srY, sP, ile, this.nr, this.zrobiona, this.zrobionaOd, teraz, 1);

    // zdanie: stare odpływa, nowe wypisuje się literami
    const tx = x + pad + pacW + rz * 1.1;
    const ty = srY + rz * 0.4;
    ctx.font = fTekst;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const tp = this.tekst;
    if (tp.poprzedni && teraz - tp.poprzOd < 240) {
      wypisz(ctx, tp.poprzedni, tx, ty, 1e9, (al) => rgba(BARWA.atramentMocny, al), { znika: odcinek(teraz - tp.poprzOd, 0, 200) });
    }
    const kolor = this.zrobiona ? (al: number) => ZLOTO(al) : (al: number) => rgba(BARWA.atramentMocny, al);
    wypisz(ctx, tp.biezacy, tx, ty, teraz - tp.od, kolor);
    const wypisane = tp.od + (tp.biezacy.length - 1) * 16 + 260;
    if (this.zrobiona) ptaszek(ctx, tx + tw + rz * 0.55, ty - rz * 0.38, rz * 0.8, odcinek(teraz, wypisane, wypisane + 380), 1);
    if (podp) {
      ctx.font = fPodp;
      wypisz(ctx, podp, tx, ty + rz * 1.2, teraz - tp.od - 220, (al) => rgba(BARWA.atramentCichy, 0.95 * al), { krok: 7, czas: 300, dy: 4 });
    }

    // „dalej” — wjeżdża z prawej, gdy lekcja zrobiona
    const xX = x + szer - pad * 0.55 - rz * 0.45;
    if (this.zrobiona) {
      const u = EASE.out(odcinek(teraz - this.zrobionaOd, 520, 900));
      if (u > 0) {
        const bh = rz * 1.9;
        const bx = xX - rz * 1.3 - bw + (1 - u) * 14, by = y + (wys - bh) / 2;
        const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
        ctx.globalAlpha = a * u;
        zaokraglony(ctx, bx, by, bw, bh, bh * 0.3);
        ctx.fillStyle = ZLOTO(0.14 + 0.1 * puls);
        ctx.fill();
        ctx.strokeStyle = ZLOTO(0.65 + 0.35 * puls);
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.font = fPrz;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
        ctx.fillText(dalejTxt, bx + bw / 2, by + bh / 2 + 1);
        ctx.globalAlpha = a;
        if (u > 0.4) this.pola.dalej = { x: bx - 4, y: by - 4, w: bw + 8, h: bh + 8 };
      }
    }
    // ✕ — wyjście z samouczka
    const kr = rz * 0.3, ky = y + rz * 0.95;
    ctx.strokeStyle = rgba(BARWA.atramentCichy, 0.6);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xX - kr, ky - kr); ctx.lineTo(xX + kr, ky + kr);
    ctx.moveTo(xX + kr, ky - kr); ctx.lineTo(xX - kr, ky + kr);
    ctx.stroke();
    this.pola.wyjdz = { x: xX - rz * 0.8, y: ky - rz * 0.8, w: rz * 1.6, h: rz * 1.6 };
    this.pola.karta = { x, y, w: szer, h: wys };
    ctx.restore();
  }

  /**
   * Finał: kamera płynie szybem na dno; wjeżdżają pasy kinowe, brzegi toną w czerni, nad pomnikiem oddycha
   * czerwona łuna i wznoszą się iskry, a nad nim wypisuje się zdanie o demonie. Na końcu — „Zagraj” i „menu”.
   */
  private rysujFinal(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const t = teraz - this.finalOd;
    const u = this.przylotOd ? teraz - this.przylotOd : -1;
    const p = this.gra.plate;
    // pył mijany w locie — kamera pędzi szybem w dół
    const c = this.gra.cam;
    pylWLocie(ctx, p.x, p.y, p.w, p.h, c.x * c.zoom, c.y * c.zoom, odcinek(t, 300, 1200) * (u >= 0 ? 1 - odcinek(u, 0, 900) : 1));
    pasyKinowe(ctx, w, h, odcinek(t, 0, 900));
    winieta(ctx, w, h, 0.35 * odcinek(t, 0, 1500) + 0.4 * (u >= 0 ? EASE.out(odcinek(u, 0, 1200)) : 0));
    const pom = miejscePomnika(this.gra.sim);
    const z = this.gra.cam.zoom;
    const px = p.x + this.gra.cam.toScreenX(pom.x), py = p.y + this.gra.cam.toScreenY(pom.y - 3);
    zarzewie(ctx, px, py, Math.max(60, z * 6), teraz, odcinek(t, 2600, 5200));
    this.pola.graj = null; this.pola.menu = null;
    if (u < 0) return;
    ctx.save();
    const rz = klamra(w / 26, 26, 52);
    const ty = p.y + p.h * 0.2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
    ctx.font = `${rz}px ${SERIF_TYTUL}`;
    wypisz(ctx, FINAL.tytul, w / 2, ty, u - 250, (a) => rgba(BARWA.atramentMocny, a), { krok: 45, czas: 480, dy: 12 });
    // złota kreska rozchodzi się od środka
    const kres = EASE.inOut(odcinek(u, 1100, 1800));
    if (kres > 0) {
      ctx.shadowBlur = 0;
      const kw = Math.min(w * 0.5, rz * 9) * kres;
      const g = ctx.createLinearGradient(w / 2 - kw / 2, 0, w / 2 + kw / 2, 0);
      g.addColorStop(0, ZLOTO(0)); g.addColorStop(0.5, ZLOTO(0.9)); g.addColorStop(1, ZLOTO(0));
      ctx.fillStyle = g;
      ctx.fillRect(w / 2 - kw / 2, ty + rz * 0.45, kw, 1.5);
      ctx.shadowBlur = 18;
    }
    ctx.font = `italic ${rz * 0.48}px ${SERIF}`;
    wypisz(ctx, FINAL.podtytul, w / 2, ty + rz * 1.25, u - 1400, (a) => rgba(BARWA.atrament, 0.95 * a), { krok: 18, czas: 360, dy: 6 });
    // przyciski
    const v = EASE.out(odcinek(u, 2600, 3200));
    if (v > 0) {
      ctx.shadowBlur = 0;
      const fb = klamra(w / 52, 15, 22);
      ctx.font = `${fb * 1.1}px ${SERIF}`;
      const t1 = `${FINAL.graj}  ›`;
      const b1w = ctx.measureText(t1).width + fb * 2.4, bh = fb * 2.3;
      const by = p.y + p.h * 0.9 - bh / 2 + (1 - v) * 16;
      const b1x = w / 2 + fb * 0.6;
      const puls = 0.5 + 0.5 * Math.sin(teraz * 0.005);
      ctx.globalAlpha = v;
      zaokraglony(ctx, b1x, by, b1w, bh, bh * 0.3);
      ctx.fillStyle = ZLOTO(0.16 + 0.1 * puls); ctx.fill();
      ctx.strokeStyle = ZLOTO(0.7 + 0.3 * puls); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
      ctx.textBaseline = 'middle';
      ctx.fillText(t1, b1x + b1w / 2, by + bh / 2 + 1);
      ctx.font = `italic ${fb}px ${SERIF}`;
      const m = ctx.measureText(FINAL.menu).width;
      const mx = w / 2 - fb * 1.4 - m / 2;
      ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
      ctx.fillText(FINAL.menu, mx, by + bh / 2 + 1);
      if (v > 0.5) {
        this.pola.graj = { x: b1x, y: by, w: b1w, h: bh };
        this.pola.menu = { x: mx - m / 2 - 10, y: by, w: m + 20, h: bh };
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- wejście gracza

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const x = e.clientX, y = e.clientY;
    if (this.stan === 'wejscie') { if (faza === 'dol') this.koniecWejscia(); return; }
    if (this.stan === 'final') {
      if (faza !== 'dol') return;
      if (wPolu(this.pola.graj, x, y)) this.graj();
      else if (wPolu(this.pola.menu, x, y)) this.doMenu();
      else if (!this.przylotOd) this.dokonczLotFinalu();
      return;
    }
    if (faza === 'dol') {
      if (wPolu(this.pola.wyjdz, x, y)) { this.doMenu(); return; }
      if (wPolu(this.pola.dalej, x, y)) { this.dalej(); return; }
      if (wPolu(this.pola.karta, x, y)) { this.pochloniete.add(e.pointerId); return; }
      this.ostatniRuch = performance.now();
      if (this.lot) this.lot = null;        // gracz chwyta kamerę — lot się kończy
    } else {
      if (this.pochloniete.has(e.pointerId)) { if (faza === 'gora') this.pochloniete.delete(e.pointerId); return; }
      if (faza === 'ruch' && (e.buttons || e.pointerType !== 'mouse')) this.ostatniRuch = performance.now();
    }
    this.gra.dotyk(e, faza);
  }

  /** Dotknięcie w trakcie lotu finału — kamera od razu na dnie. */
  private dokonczLotFinalu(): void {
    const l = this.lot;
    if (!l) return;
    this.dokonczLot();
    l.potem?.();
  }

  kolko(e: WheelEvent): void {
    if (this.stan !== 'lekcja') return;
    this.ostatniRuch = performance.now();
    this.lot = null;
    this.gra.kolko(e);
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    const dalej = e.key === 'Enter' || e.key === ' ';
    // w trakcie wejścia Esc (jak każdy klawisz dalej) tylko je pomija; potem wychodzi z samouczka
    if (this.stan === 'wejscie') { if (dalej || akcja === 'menu') this.koniecWejscia(); return; }
    if (akcja === 'menu') { this.doMenu(); return; }
    if (this.stan === 'final') {
      if (dalej && this.pola.graj) this.graj();
      else if (dalej && !this.przylotOd) this.dokonczLotFinalu();
      return;
    }
    if (dalej && this.zrobiona) { e.preventDefault(); this.dalej(); return; }
    this.gra.klawisz?.(akcja, e);
  }
}
