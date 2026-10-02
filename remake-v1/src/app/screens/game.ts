import { Sim, resetRaces } from '../../sim/sim';
import { GORA } from '../../nastawy/gora';
import { KAMERA, TEMPO, STEROWANIE } from '../../nastawy/sterowanie';
import { ATLAS } from '../../nastawy/wyglad/atlas';
import { Camera } from '../../render/camera';
import { Engraver } from '../../render/engrave';
import { drawParticles } from '../../render/overlay';
import { rysujStworzenia } from '../../render/figury';
import { rysujEfekty } from '../../render/efekty';
import { rysujLegende } from '../../render/legenda';
import { rysujZapiski, type TrafienieZapisku } from '../../render/zapiski';
import { rysujTempo } from '../../render/tempo';
import { PanelDewelopera } from '../devpanel';
import { DEV } from '../../sim/dziennik';
import { rysujDev } from '../../render/dev';
import { klanLudu, liczRole } from '../../sim/lud';
import { rysujZnacznikiLudu } from '../../render/lud';
import { LUD } from '../../nastawy/lud';
import { dzisiaj, ziarnoDnia, wynikDnia, czasGry } from '../../core/swiat-dnia';
import { rozmiescPrzyciski, rysujPrzyciski, przyciskPod, type Przycisk } from '../../render/przyciski';
import { rysujMinimape, miejsceZMinimapy } from '../../render/minimapa';
import { rysujZarys } from '../../render/zarys';
import { Poswiata } from '../../render/bloom';
import { Tajemnica, oddechRdzenia } from '../../render/tajemnica';
import { rysujDrogePielgrzymow } from '../../render/pielgrzymka';
import { aktualnyPlan, najwierniejsza } from '../../sim/pielgrzymka';
import { rysujDrogeDoWolnosci, type ObszarDrogi } from '../../render/droga';
import { rysujRdzen } from '../../render/rdzen';
import { smugiSwiatla } from '../../render/shafts';
import { etykietyKolonii, podswietlCel, type Cel } from '../../render/znaczniki';
import { podpowiedz, type Podpowiedz } from '../../sim/podpowiedzi';
import { computePlate, drawFrame, drawCensus, drawCrack, drawSmoke, drawEyelid, drawChronicle, drawOddanie, type Plate } from '../../render/plate';
import { Ui } from '../../ui/ui';
import { seed, sign, TOOLS, type Verb } from '../../powers/powers';
import { Rozkazy } from '../../powers/rozkazy';
import { rysujRozkazy, rysujBanerPauzy, type PoleBanera } from '../../render/rozkazy';
import { miejsceKlepsydry } from '../../render/tempo';
import { zbierzObszaryHud, type ObszarHud } from '../obszary-hud';
import { Straznik, type Alarm } from '../alarmy';
import { rysujAlarm, type PoleAlarmu } from '../../render/alarm';
import { rysujWydarzenie, type PoleWyboru } from '../../render/wydarzenie';
import { rozstrzygnij, type Wydarzenie } from '../../sim/wydarzenia';
import { OknoAtlasu } from '../../atlas/okno';
import { odkrycia } from '../../atlas/odkrycia';
import { SERIF } from '../../render/ink';
import { tablica } from '../../atlas/tablice';
import { Race } from '../../sim/races';
import { Job } from '../../sim/creatures';
import { saveToStorage, loadFromStorage } from '../../core/save';
import { ustawienia, ustaw, jakoscAuto } from '../../core/settings-store';
import { StrazKlatek } from '../../render/straz-klatek';
import { mikser } from '../../core/mikser';
import type { Akcja } from '../../core/keybinds';
import type { Ekran } from '../screen';
import type { Kontekst } from '../context';

/** Łamie zdanie na co najwyżej `ile` linii; ostatnia dostaje wielokropek, gdy nie starczy. */
/** Najmniejsze pole dotyku (px logiczne) — przyciski banera i alarmu rysują się mniejsze, trafia się w tyle. */
const POLE_PALCA = 44;

function lamiTekst(ctx: CanvasRenderingContext2D, tekst: string, maxW: number, ile: number): string[] {
  if (ctx.measureText(tekst).width <= maxW) return [tekst];
  const slowa = tekst.split(' ');
  const linie: string[] = [];
  let biezaca = '';
  let i = 0;
  // pełne linie do przedostatniej; resztę liczymy od miejsca, w którym skończyliśmy —
  // szukanie jej po słowie myliło się, gdy to samo słowo padło w zdaniu dwa razy
  for (; i < slowa.length && linie.length < ile - 1; i++) {
    const proba = biezaca ? `${biezaca} ${slowa[i]}` : slowa[i];
    if (ctx.measureText(proba).width > maxW && biezaca) { linie.push(biezaca); biezaca = ''; i--; }
    else biezaca = proba;
  }
  const reszta = [biezaca, ...slowa.slice(i)].filter(Boolean).join(' ').trim();
  let ostatnia = reszta;
  while (ctx.measureText(ostatnia + '…').width > maxW && ostatnia.length > 8) ostatnia = ostatnia.slice(0, -2);
  if (ostatnia) linie.push(ostatnia === reszta ? ostatnia : ostatnia.trimEnd() + '…');
  return linie;
}

export type ZdarzenieGry =
  | { typ: 'moc'; czasownik: string; narzedzie: string; zPlanu?: boolean }
  | { typ: 'szept'; narzedzie: string }
  | { typ: 'wybranoCzasownik'; czasownik: string | null }
  | { typ: 'kamera'; rodzaj: 'przesun' | 'zoom' | 'powrot' }
  | { typ: 'rozkaz'; czasownik: string; narzedzie: string }
  | { typ: 'pauza'; stoi: boolean }
  | { typ: 'tempo' }
  | { typ: 'wydarzenie'; rodzaj: string; wybor: string }
  | { typ: 'koniec'; opis: string };

/** Ekran rozgrywki: świat, płyta, organy i ryty. Samouczek nakłada się na niego z góry. */
export class EkranGry implements Ekran {
  nazwa = 'gra';
  sim = new Sim((Math.random() * 1e9) | 0);
  cam = new Camera(1, 1);
  eng = new Engraver();
  /** Pilnuje klatek w trybie jakości „auto” — przy zadyszce rycina tanieje. */
  private straz = new StrazKlatek();
  private poswiata = new Poswiata();
  private tajemnica = new Tajemnica();
  /** Ile znaków pisma w skale było w ostatniej klatce — po nich odkrywa się ich tablica. */
  private znakowWidac = 0;
  private ostatnieOdkrywanie = 0;
  ui = new Ui();
  plate: Plate = computePlate(innerWidth, innerHeight);
  /** Samouczek podsłuchuje, co gracz zrobił. */
  nasluch: ((z: ZdarzenieGry) => void) | null = null;
  /** Samouczek może odciąć część czasowników. */
  dozwolone: Set<string> | null = null;
  tempoMnoznik = 1;
  /** Miejsce, na które gra wprost każe patrzeć (samouczek, podpowiedzi). */
  cel: Cel | null = null;
  /** Czy rysować podpisy nacji. */
  etykiety = true;
  /** Samouczek gra na własnej górze i nie ma prawa nadpisać zapisu gracza. */
  zapisujAuto = true;

  camTarget = { x: 0, y: 0 };
  private dirty = true;
  /** Kamera z chwili ostatniego przerysowania ryciny. */
  private rysKam = [NaN, NaN, NaN];
  private lastInk = 0;
  private lastSave = 0;
  private lastSound = 0;
  private reszta = 0;
  private rada: Podpowiedz | null = null;
  private radaOd = -1e9;
  /** Pauza żyje tylko w tej sesji — zapisana potrafiła uruchomić grę w bezruchu. */
  pauza = false;
  /** Stan z poprzedniej klatki, z którego różnicy biorą się dźwięki gestów. */
  private slad: { pauza: boolean; zawies: number; plan: number; verb: string | null; tool: string | null; karta: number; strona: string } | null = null;
  /** Samouczek zatrzymuje świat bez pauzy — żeby szept działał od razu, a nie szedł do planu. */
  wstrzymane = false;
  /** Rozkazy wydane w pauzie: czekają jako szkice, dzieją się po puszczeniu czasu. */
  rozkazy = new Rozkazy();
  private polaBanera: PoleBanera[] = [];
  /** Palec trzymany na rycie: po STEROWANIE.przytrzymanieMs otwiera się tablica (zamiast prawego przycisku). */
  private przytrzymanie: { id: number; v: string; sx: number; sy: number; od: number; verb: Verb | null; tool: string | null } | null = null;
  /** Podpowiedź nad płytą jako odnośnik do miejsca, o którym mówi. */
  private radaRect: { x: number; y: number; w: number; h: number } | null = null;
  /** Remake v1: przyciski przełącznika „kogo wydaje skała” w pasku u góry. */
  private przyciskiRoli: { x: number; y: number; w: number; h: number; rola: 'pobozny' | 'robotnik' }[] = [];
  /** Linia „droga do wolności" na brzegu płyty — kliknięcie otwiera jej tablicę. */
  private drogaRect: ObszarDrogi | null = null;
  /** Strażnik auto-pauzy i karta sytuacji, którą właśnie pokazuje. */
  private straznik = new Straznik();
  alarm: Alarm | null = null;
  private polaAlarmu: PoleAlarmu[] = [];
  /** Pola wyborów na karcie wydarzenia i karta, którą już pokazano (żeby nie podnosić jej co klatkę). */
  private polaWydarzenia: PoleWyboru[] = [];
  private pokazaneWydarzenie: Wydarzenie | null = null;
  /** Atlas tablic — okno nad płytą; świat stoi, póki jest otwarte. */
  atlas = new OknoAtlasu();
  private ostatniaTablica = -1e9;
  legenda = false;
  liczby = false;
  /** Otwarte zapiski — cała kronika na wierzchu, świat czeka. */
  zapiski = false;
  private przewinZapiskow = 0;
  private trafieniaZapiskow: TrafienieZapisku[] = [];
  private maxPrzewin = 0;
  private przyciski: Przycisk[] = [];
  /** Gracz przejął kamerę — automat wraca po C albo po chwili bezruchu. */
  recznaKamera = false;
  private ostatnieKlikniecie: { x: number; y: number } | null = null;
  private indeksWTlumie = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean; interfejs: boolean; przycisk: number }>();
  private pinch = 0;
  private srodekPinch: { x: number; y: number } | null = null;
  private painting = false;
  /** Kafle już opłacone w tym pociągnięciu — ruch myszy nie może kasować krwi co klatkę. */
  private malowane = new Set<number>();
  private kosztPociagniecia = { krew: 0, wiara: 0, otchlan: 0 };

  /** Okienko logów i narzędzi (tryb deweloperski, v4 beta). */
  private panelDev: PanelDewelopera | null = null;

  constructor(private app: Kontekst) {}

  /** Kroki symulacji na klatkę: tempo gracza (najwyżej ×3) albo nadpisanie z okienka dewelopera. */
  private tempoTeraz(): number {
    if (DEV.tempo && ustawienia.trybDeweloperski) return DEV.tempo;
    return Math.min(TEMPO.max, Math.max(1, Math.round(ustawienia.tempo * this.tempoMnoznik)));
  }

  wyjdz(): void {
    this.panelDev?.ustaw(false);
  }

  // ------------------------------------------------------------------ życie ekranu

  wejdz(dane?: unknown): void {
    this.pauza = false;
    this.straz.zeruj();
    this.slad = null;
    if (ustawienia.tempo < 1) ustaw('tempo', 1);
    const tryb = (dane as { tryb?: string } | undefined)?.tryb;
    if (tryb === 'nowa') this.nowaGra();
    else if (tryb === 'dnia') {
      // v4.1 beta: świat dnia — ziarno z dzisiejszej daty, ta sama góra dla każdego
      const data = dzisiaj();
      this.nowaGra(ziarnoDnia(data));
      this.sim.swiatDnia = data;
      this.sim.log(`Świat dnia ${data} — ta sama góra dla każdego, kto gra dziś.`, 'swiat');
      const w = wynikDnia(data);
      this.ui.say(`Świat dnia ${data}. ${w.najlepszy !== null ? `Twój najlepszy czas dziś: ${czasGry(w.najlepszy)}.` : 'Dziś jeszcze go nie przeszedłeś.'}`, this.sim.tick);
    }
    else if (tryb === 'wczytaj') {
      const s = loadFromStorage();
      if (s) {
        this.sim = s; this.doSerca(true);
        // zapis skończonej gry nie może otwierać zamrożonej płyty bez wyjścia
        if (s.ending) { this.app.idz('kronika', { sim: s }); return; }
      }
    }
    this.app.muzyka.ustawScene(tryb === 'samouczek' ? 'samouczek' : 'gra');
    this.rozmiar(this.app.w, this.app.h);
  }

  /**
   * Góry wygenerowane z wyprzedzeniem (na ekranie ładowania) — klucz to ziarno,
   * -1 to „dowolna nowa”. Generowanie świata to najdłuższa chwila w całej grze.
   */
  private zapas = new Map<number, Sim>();

  /** Generuje górę teraz, żeby „Nowa gra” (albo samouczek) nie czekały. */
  przygotuj(ziarno?: number): void {
    const klucz = ziarno ?? -1;
    if (!this.zapas.has(klucz)) this.zapas.set(klucz, new Sim(ziarno ?? ((Math.random() * 1e9) | 0)));
  }

  nowaGra(ziarno?: number): void {
    const klucz = ziarno ?? -1;
    const gotowa = this.zapas.get(klucz);
    this.zapas.delete(klucz);
    // przygotowana góra powstała wcześniej — rasy wracają do stanu sprzed skaz z poprzedniej partii
    if (gotowa && gotowa.tick === 0) resetRaces();
    this.sim = gotowa && gotowa.tick === 0 ? gotowa : new Sim(ziarno ?? ((Math.random() * 1e9) | 0));
    if (ustawienia.trudnosc === 'łaskawa') { this.sim.lagodna = true; this.sim.krew += GORA.laskawaKrew; }
    if (ustawienia.trudnosc === 'koszmar') { this.sim.koszmar = true; this.sim.krew = Math.max(0, this.sim.krew - GORA.koszmarKrew); }
    this.ui.verb = null; this.ui.tool = null; this.ui.selected = null;
    this.cam.zoom = KAMERA.start;
    this.doSerca(true);
    this.dirty = true;
  }

  /** Wraca do najgęstszego skupiska i oddaje kamerę automatowi. */
  doMieszkancow(): void {
    const serce = this.sim.heartOfLife();
    this.recznaKamera = false;
    if (!serce) { this.ui.say('Nie ma już do kogo wracać.', this.sim.tick); return; }
    this.cam.x = this.camTarget.x = serce.x;
    this.cam.y = this.camTarget.y = serce.y;
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(KAMERA.powrotMaxZoom, Math.min(this.cam.vw / (serce.w + KAMERA.zapasX), this.cam.vh / (serce.h + KAMERA.zapasY))));
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.ui.say('Wracasz do swoich.', this.sim.tick);
    this.nasluch?.({ typ: 'kamera', rodzaj: 'powrot' });
    this.dirty = true;
  }

  /** Dowozi kamerę w miejsce; `obokKarty` kładzie je po lewej, bo po prawej stoi karta samouczka. */
  pokazMiejsce(x: number, y: number, zoom?: number, obokKarty = false): void {
    if (zoom) this.cam.zoom = Math.max(this.cam.minZoom, zoom);
    const odsuniecie = !obokKarty || this.plate.waski ? 0 : (this.plate.w * 0.17) / this.cam.zoom;
    this.cam.x = this.camTarget.x = x + odsuniecie;
    // na wąskim ekranie karta leży u góry, więc cel schodzi poniżej środka
    // na telefonie dół płyty zajmuje wstęga drogi — cel siada w górnej części, nie pod nią
    const telefon = this.plate.waski || this.plate.niski;
    this.cam.y = this.camTarget.y = y + (telefon ? this.plate.h * 0.14 / this.cam.zoom : 0)
      - (obokKarty && this.plate.waski ? this.plate.h * 0.12 / this.cam.zoom : 0);
    this.przejmijKamere();
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.dirty = true;
  }

  /** Gracz chwyta kamerę: automat milczy, ale tylko przez chwilę (patrz krok()). */
  przejmijKamere(): void {
    this.recznaKamera = true;
  }

  private doSerca(natychmiast = false): void {
    const serce = this.sim.heartOfLife();
    if (!serce) return;
    if (natychmiast) {
      this.cam.x = this.camTarget.x = serce.x;
      this.cam.y = this.camTarget.y = serce.y;
    }
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
  }

  rozmiar(w: number, h: number): void {
    this.plate = computePlate(w, h);
    this.cam.vw = this.plate.w; this.cam.vh = this.plate.h;
    this.cam.minZoom = Math.max(KAMERA.minNaDuzymEkranie, this.plate.w / this.sim.world.w);
    if (this.cam.zoom < this.cam.minZoom) this.cam.zoom = this.cam.minZoom;
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.eng.resize(this.plate.w, this.plate.h);
    this.poswiata.resize(this.plate.w, this.plate.h);
    this.ui.layout(this.plate, w);
    this.dirty = true;
  }

  /** Czas staje tylko na pauzie i po zakończeniu — nigdy przez sam wybór czasownika. */
  zamrozone(): boolean {
    // otwarta karta zatrzymuje świat: to moment rozmowy z jednym stworzeniem
    return this.pauza || this.wstrzymane || this.zapiski || this.atlas.otwarte || !!this.sim.ending || this.ui.selected !== null;
  }

  /**
   * Trzymany czasownik albo otwarta karta zwalniają świat do ćwierci tempa.
   * Pełne zatrzymanie sprawiało, że gra wyglądała na martwą.
   */
  spowolnione(): boolean {
    return this.ui.verb !== null;
  }

  // ---------------------------------------------------------------------- krok

  /** Przełącza pauzę; puszczenie czasu wykonuje plan. */
  ustawPauze(stoi: boolean): void {
    if (!stoi && this.sim.wydarzenia.biezace) { this.ui.say('Najpierw wybierz, co zrobisz.', this.sim.tick); return; }
    if (!stoi) this.alarm = null;
    if (this.pauza === stoi) return;
    this.pauza = stoi;
    this.ui.say(stoi ? 'Czas stoi. Planuj — rozkazy staną się, gdy go puścisz.' : 'Czas znów płynie.', this.sim.tick);
    this.nasluch?.({ typ: 'pauza', stoi });
    if (!stoi) this.wykonajPlan();
    this.dirty = true;
  }

  /**
   * Tablice atlasu odkrywa się, grając: rasę — gdy pierwszy raz stanie w kadrze,
   * ryt — gdy pierwszy raz go chwycisz, prawo góry — gdy pierwszy raz zadziała.
   * Ważne tablice czekają w kolejce na pokazanie, drobne trafiają do atlasu po cichu.
   */
  private odkrywaj(): void {
    const { sim, cam } = this;
    const z = cam.zoom;
    const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
    const right = left + cam.vw / z, bottom = top + cam.vh / z;
    // drobne tablice nie przerywają — przycisk atlasu świeci, dopóki do niego nie zajrzysz
    const cicho = (id: string) => { odkrycia.odkryj(id, false); };
    let prorok = false, pielgrzym = false;
    for (const c of sim.creatures) {
      if (c.dead) continue;
      if (c.prophet) prorok = true;
      if (c.job === Job.PIELGRZYM) pielgrzym = true;
      if (c.x >= left && c.x <= right && c.y >= top && c.y <= bottom) odkrycia.odkryj(`rasa-${c.race}`);
    }
    if (sim.popByRace[Race.MYCELIUM] > 2 && sim.tick > 6000) odkrycia.odkryj('rasa-5');
    if (prorok) odkrycia.odkryj('prorok');
    if (pielgrzym) odkrycia.odkryj('pielgrzymka');
    if (sim.sen > 0.05) odkrycia.odkryj('sen');
    if (sim.rytual.pekniecia > 0 || sim.world.ever[sim.world.idx(sim.world.coreX, sim.world.coreY)]) odkrycia.odkryj('rdzen');
    // skorupę odkrywa się, gdy ktoś zacznie się przy niej modlić albo gdy pęknie
    if (sim.rytual.wierni >= 1 || sim.rytual.pekniecia > 0) odkrycia.odkryj('skorupa');
    if (sim.tick > 1500) cicho('krew');
    if (sim.wiara > 15) cicho('wiara');
    // wiara to serce drogi do wygranej — jej tablica wyskakuje sama przy pierwszej modlitwie
    if (sim.prayers > 0 && sim.tick > 600) odkrycia.odkryj('oddanie');
    if (sim.tick > 7000) cicho('pamiec');
    // v4.1 beta: cechy nacji — raz na początku, żeby gracz wiedział, co znaczy „pobożni” na podpisie
    if (sim.tick > 3600) odkrycia.odkryj('cechy');
    if (this.ui.verb) cicho(`ryt-${this.ui.verb}`);
    if (this.pauza) cicho('pauza');
    // pismo w skale: kiedy czas stoi, a znaki świecą — albo gdy ktoś długo na nie patrzy
    if (this.znakowWidac >= 2 && (this.pauza || sim.tick > 6000)) cicho('pismo');
  }

  /** Karta wydarzenia: czas staje, kamera jedzie na miejsce, dzwon. Czeka na wybór. */
  private podniesWydarzenie(e: Wydarzenie): void {
    this.pokazaneWydarzenie = e;
    this.alarm = null;
    this.pauza = true;
    this.nasluch?.({ typ: 'pauza', stoi: true });
    this.ui.selected = null;
    this.ui.verb = null; this.ui.tool = null;
    this.painting = false;
    if (e.cel) {
      this.pokazMiejsce(e.cel.x, e.cel.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
      // karta stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
      this.cam.y = this.camTarget.y = e.cel.y - (this.plate.h * 0.25) / this.cam.zoom;
      this.cam.clamp(this.sim.world.w, this.sim.world.h);
    }
    odkrycia.odkryj('wydarzenia', false);
    if (ustawienia.efekty) this.app.gesty.alarm(true);
    else this.app.dzwiek.toll();
    this.dirty = true;
  }

  /** Wybór na karcie wydarzenia. */
  private wybierzWydarzenie(i: number): void {
    const e = this.sim.wydarzenia.biezace;
    if (!e) return;
    const powod = rozstrzygnij(this.sim, i);
    if (powod) { this.ui.say(powod, this.sim.tick); this.app.gesty.odmowa(); return; }
    this.nasluch?.({ typ: 'wydarzenie', rodzaj: e.rodzaj, wybor: e.wybory[i].id });
    this.pokazaneWydarzenie = null;
    this.polaWydarzenia = [];
    this.ustawPauze(false);
    this.dirty = true;
  }

  /**
   * Remake v1: pasek nad płytą — wiara, krew, jedzenie w spiżarni, ilu jest w każdej roli
   * i przełącznik, kogo skała wyda następnym razem (z odliczaniem i ceną w krwi).
   */
  private rysujZasoby(ctx: CanvasRenderingContext2D, plate: Plate, w: number): void {
    const { sim } = this;
    const klan = klanLudu(sim);
    const role = liczRole(sim);
    const czesci: [string, string, string][] = [
      ['wiara', `${Math.floor(sim.wiara)}`, 'rgba(236,214,160,1)'],
      ['krew', `${Math.floor(sim.krew)}`, 'rgba(226,120,100,1)'],
      ['jedzenie', `${klan?.stock ?? 0}`, 'rgba(170,200,130,1)'],
      ['pobożni', `${role.pobozny}`, 'rgba(246,226,170,1)'],
      ['robotnicy', `${role.robotnik}`, 'rgba(214,176,120,1)'],
      ['rycerze', `${role.rycerz}`, 'rgba(176,196,226,1)'],
    ];
    ctx.save();
    const rozm = Math.max(13, Math.min(17, w / 30));
    const y = plate.niski ? plate.y - plate.top * 0.3 : plate.y - plate.top * 0.34;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const kaw = (t: string, f: string) => { ctx.font = f; return ctx.measureText(t).width; };
    const fE = `italic ${rozm * 0.82}px ${SERIF}`, fL = `${rozm * 1.05}px ${SERIF}`;
    const odst = rozm * 1.1;
    let x = plate.x + 10;
    for (const [e, l, kol] of czesci) {
      ctx.font = fE; ctx.fillStyle = 'rgba(190,178,156,0.9)';
      ctx.fillText(e + ' ', x, y); x += kaw(e + ' ', fE);
      ctx.font = fL; ctx.fillStyle = kol;
      ctx.fillText(l, x, y); x += kaw(l, fL) + odst;
    }
    // przełącznik: „ze skały: [robotnik] [pobożny] · za 12 s · 20 krwi”
    const st = sim.lud;
    const zaS = Math.max(0, Math.ceil((st.nastepne - sim.tick) / 120));
    const koszt = LUD.koszt[st.rola];
    ctx.font = fE; ctx.fillStyle = 'rgba(190,178,156,0.9)';
    const etyk = 'ze skały: ';
    x += odst * 0.6;
    ctx.fillText(etyk, x, y); x += kaw(etyk, fE);
    this.przyciskiRoli = [];
    for (const rola of ['robotnik', 'pobozny'] as const) {
      const napis = rola === 'robotnik' ? 'robotnik' : 'pobożny';
      const sz = kaw(napis, fL) + 14;
      const wybrany = st.rola === rola;
      ctx.strokeStyle = wybrany ? 'rgba(232,190,120,0.95)' : 'rgba(150,140,120,0.5)';
      ctx.fillStyle = wybrany ? 'rgba(80,58,30,0.75)' : 'rgba(20,15,12,0.6)';
      ctx.lineWidth = 1;
      ctx.fillRect(x, y - rozm * 1.05, sz, rozm * 1.45);
      ctx.strokeRect(x + 0.5, y - rozm * 1.05 + 0.5, sz - 1, rozm * 1.45 - 1);
      ctx.font = fL; ctx.fillStyle = wybrany ? 'rgba(250,232,190,1)' : 'rgba(200,188,166,0.75)';
      ctx.fillText(napis, x + 7, y);
      this.przyciskiRoli.push({ x, y: y - rozm * 1.05, w: sz, h: rozm * 1.45, rola });
      x += sz + 6;
    }
    ctx.font = fE;
    ctx.fillStyle = sim.krew >= koszt ? 'rgba(190,178,156,0.9)' : 'rgba(226,120,100,0.95)';
    ctx.fillText(sim.krew >= koszt ? `za ${zaS} s · ${koszt} krwi` : `brak krwi (${koszt})`, x + 4, y);
    ctx.restore();
  }

  private podniesAlarm(a: Alarm): void {
    this.alarm = a;
    this.pauza = true;
    this.nasluch?.({ typ: 'pauza', stoi: true });
    this.ui.selected = null;
    if (a.cel) {
      this.pokazMiejsce(a.cel.x, a.cel.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
      // karta sytuacji stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
      this.cam.y = this.camTarget.y = a.cel.y - (this.plate.h * 0.2) / this.cam.zoom;
      this.cam.clamp(this.sim.world.w, this.sim.world.h);
      this.cel = { x: a.cel.x, y: a.cel.y, r: 5, tekst: a.cel.tekst };
      this.radaOd = performance.now();             // podpowiedź nie nadpisze celu alarmu od razu
    }
    if (ustawienia.efekty) this.app.gesty.alarm(a.kryzys);
    else this.app.dzwiek.toll();
    this.dirty = true;
  }

  private wykonajPlan(): void {
    if (!this.rozkazy.ile) return;
    const wyniki = this.rozkazy.wykonaj(this.sim);
    let udanych = 0;
    for (const w of wyniki) {
      if (!w.udane) continue;
      udanych++;
      const o = w.rozkaz;
      if (o.czasownik === 'szept') this.nasluch?.({ typ: 'szept', narzedzie: o.narzedzie });
      else this.nasluch?.({ typ: 'moc', czasownik: o.czasownik, narzedzie: o.narzedzie, zPlanu: true });
    }
    if (wyniki.some((w) => w.udane && w.rozkaz.czasownik === 'znak')) this.app.dzwiek.toll();
    const nieudane = wyniki.length - udanych;
    this.app.gesty.wykonanie(udanych, nieudane);
    this.ui.say(nieudane ? `Stało się ${udanych} z ${wyniki.length} — świat zdążył się zmienić.` : 'Twoja wola stała się ciałem.', this.sim.tick);
    this.dirty = true;
  }

  /**
   * Dźwięki gestów z różnicy stanu między klatkami: plan, pauza, wybrany ryt, karta,
   * atlas. Każda droga do tej samej zmiany — mysz, palec, klawisz, samouczek — brzmi
   * więc tak samo i żadnej nie da się pominąć.
   */
  private sluchaj(): void {
    const ui = this.ui, g = this.app.gesty;
    const zawies = this.pauza ? 1 : this.zamrozone() ? 0.45 : 0;
    const teraz = {
      pauza: this.pauza, zawies, plan: this.rozkazy.ile, verb: ui.verb as string | null, tool: ui.tool as string | null,
      karta: ui.selected?.id ?? -1, strona: this.atlas.strona,
    };
    const s = this.slad;
    this.slad = teraz;
    if (!s) { mikser.zawies(zawies); if (this.pauza) g.tonPauzy(true); return; }
    if (zawies !== s.zawies) mikser.zawies(zawies);
    // karta alarmu ma własny dzwon — pauza pod nią nie uderza drugi raz
    if (teraz.pauza !== s.pauza) g.pauza(teraz.pauza, !!this.alarm);
    if (teraz.plan > s.plan) g.szkic();
    else if (teraz.plan < s.plan && this.pauza) g.skresl(teraz.plan === 0 && s.plan > 1);
    if (teraz.verb !== s.verb || teraz.tool !== s.tool) g.klik();
    if (teraz.karta !== s.karta && teraz.karta >= 0) g.kartka();
    if (teraz.strona !== s.strona && teraz.strona !== 'zamkniete') g.kartka();
  }

  krok(_dt: number, teraz: number): void {
    // okienko dewelopera: tylko w grze (nie w samouczku) i tylko z włączonym trybem
    const dev = ustawienia.trybDeweloperski && !this.nasluch;
    if (dev && !this.panelDev) this.panelDev = new PanelDewelopera({
      sim: () => this.sim,
      pokazMiejsce: (x, y) => this.pokazMiejsce(x, y),
      nowaGra: (ziarno) => { this.nowaGra(ziarno); this.ui.say(`Świat ${ziarno} od nowa.`, this.sim.tick); },
    });
    if (!dev) { DEV.pauza = false; DEV.sledzony = -1; DEV.kursor = null; }
    this.panelDev?.ustaw(dev);
    this.panelDev?.odswiez(teraz);
    // palec przytrzymany na rycie: tablica rytu, a wybór z dotknięcia się cofa — to nie był wybór
    const pt = this.przytrzymanie;
    if (pt && performance.now() - pt.od > STEROWANIE.przytrzymanieMs) {
      this.przytrzymanie = null;
      this.ui.verb = pt.verb; this.ui.tool = pt.tool;
      this.otworzTabliceRytu(pt.v);
    }
    // plan wykonuje się także wtedy, gdy pauzę zdjęło coś innego niż przycisk
    if (!this.pauza && this.rozkazy.ile) this.wykonajPlan();
    this.sluchaj();
    if (!this.zamrozone()) {
      let kroki = this.tempoTeraz();
      if (dev && DEV.pauza) { kroki = DEV.krokow; DEV.krokow = 0; }
      else if (this.spowolnione()) {
        this.reszta += kroki * 0.25;
        kroki = Math.floor(this.reszta);
        this.reszta -= kroki;
      }
      const t0 = performance.now();
      for (let i = 0; i < kroki; i++) this.sim.step();
      if (dev && kroki > 0) DEV.msKroku = DEV.msKroku * 0.9 + ((performance.now() - t0) / kroki) * 0.1;
      // kamera za śledzoną postacią (okienko dewelopera)
      if (dev && DEV.sledz && DEV.sledzony >= 0) {
        const c = this.sim.creatures.find((q) => q.id === DEV.sledzony && !q.dead);
        if (c) { this.cam.x = this.camTarget.x = c.x; this.cam.y = this.camTarget.y = c.y; this.recznaKamera = true; this.cam.clamp(this.sim.world.w, this.sim.world.h); }
      }
      this.dirty = true;
      // WERSJA ANDROID: kamera przejęta palcem albo „pokaż” zostaje tam, gdzie ją zostawiłeś —
      // dawniej po 20 sekundach sama wracała „za życiem” i cel rady uciekał spod ekranu.
      // Z powrotem za mieszkańcami prowadzi przycisk z okiem.
      // kiedy gracz trzyma czasownik albo maluje, kamera musi stać: inaczej tunel
      // ucieka spod kursora i drąży się w zupełnie innym miejscu
      const wRobocie = this.painting || this.ui.verb !== null || this.pointers.size > 0;
      if (ustawienia.kameraZaZyciem && !this.recznaKamera && !wRobocie && this.sim.tick % 4 === 0) {
        const serce = this.sim.heartOfLife();
        if (serce) {
          this.camTarget.x += (serce.x - this.camTarget.x) * KAMERA.podazanie;
          this.camTarget.y += (serce.y - this.camTarget.y) * KAMERA.podazanie;
          this.cam.drift(this.camTarget.x, this.camTarget.y, KAMERA.podazanie);
          if (ustawienia.autoZoom) {
            const fit = Math.min(this.cam.vw / (serce.w + KAMERA.zapasX), this.cam.vh / (serce.h + KAMERA.zapasY));
            this.cam.zoom += (Math.max(this.cam.minZoom, Math.min(KAMERA.autoMaxZoom, fit)) - this.cam.zoom) * KAMERA.dopasowanie;
          }
          this.cam.clamp(this.sim.world.w, this.sim.world.h);
        }
      }
      if (this.sim.senDzwon) { this.sim.senDzwon = false; this.app.dzwiek.toll(); }
      const wyd = this.sim.wydarzenia.biezace;
      if (wyd && wyd !== this.pokazaneWydarzenie) this.podniesWydarzenie(wyd);
      // auto-pauza: przy chwilach, w których trzeba decydować, świat staje sam
      if (!this.nasluch) {
        const a = this.straznik.sprawdz(this.sim, ustawienia.autoPauza);
        if (a) this.podniesAlarm(a);
      }
      if (this.sim.ending) {
        this.nasluch?.({ typ: 'koniec', opis: this.sim.ending });
        if (!this.nasluch) this.app.idz('kronika', { sim: this.sim });
      }
    }

    // co pół sekundy zegara, nie co tyle tików — w pauzie tiki stoją, a pauzę też się odkrywa
    if (!this.nasluch && teraz - this.ostatnieOdkrywanie > 500) { this.ostatnieOdkrywanie = teraz; this.odkrywaj(); }
    // nowa tablica otwiera się sama — najwyżej jedna na pół minuty i nigdy na kryzys
    // pierwsza prawdziwa partia zaczyna się od celu: tablica drogi do wolności
    // tablica celu nie wyskakuje w pierwszej sekundzie — gracz najpierw widzi swoją górę;
    // czeka też, aż nie trzyma rytu i nie maluje
    if (!this.nasluch && !odkrycia.zna('droga') && this.sim.tick > ATLAS.drogaPoTikach && !this.atlas.otwarte && !this.sim.ending
        && !this.painting && this.ui.verb === null) {
      // WERSJA ANDROID: tablica trafia do atlasu po cichu — wyskakując sama, zasłaniała
      // pierwszą kartę wydarzenia i wyglądała jak zawieszona gra. Kroki drogi widać na wstędze.
      odkrycia.odkryj('droga', false);
    }
    if (!this.nasluch && odkrycia.kolejka.length && !this.atlas.otwarte && !this.alarm && !this.zapiski && !this.sim.wydarzenia.biezace
        && !this.sim.ending && this.sim.tick > 1200 && teraz - this.ostatniaTablica > 30000) {
      const id = odkrycia.kolejka.shift()!;
      this.ostatniaTablica = teraz;
      if (ustawienia.tablice === 'pokazuj') { this.atlas.otworzTablice(id, true); this.app.gesty.tablica(); }
      else this.ui.say(`Nowa tablica w atlasie: ${tablica(id)?.nazwa ?? ''}.`, this.sim.tick);
    }

    if (this.zapisujAuto && ustawienia.autozapis && !this.sim.ending && !this.zamrozone() && teraz - this.lastSave > 60000) {
      this.lastSave = teraz;
      saveToStorage(this.sim);
    }

    // podpowiedź odświeżana rzadko, żeby nie migotała
    // Podpowiedź trzyma się co najmniej 25 sekund; zmienia się wcześniej tylko wtedy,
    // gdy pojawi się wyraźnie pilniejsza sprawa. Wcześniej skakała co kilka sekund.
    if (!this.nasluch && !this.alarm && teraz - this.radaOd > 2500) {
      const nowa = podpowiedz(this.sim);
      const stara = this.rada;
      const czas = teraz - this.radaOd;
      if (!stara || czas > 25000 || nowa.waga > stara.waga + 25 || nowa.tekst === stara.tekst) {
        if (!stara || nowa.tekst !== stara.tekst) this.radaOd = teraz;
        this.rada = nowa;
        if (!this.ui.verb) this.cel = nowa.cel ?? null;
      }
    }

    if (teraz - this.lastSound > 420) {
      this.lastSound = teraz;
      let kopie = 0, zywi = 0;
      for (const c of this.sim.creatures) { if (c.dead) continue; zywi++; if (c.job === 1 || c.job === 10) kopie++; }
      this.app.dzwiek.update(
        this.sim.world.depth(this.cam.y),
        zywi ? Math.min(1, kopie / 18) : 0,
        Math.min(1, this.sim.wiara / 260),
        Math.min(1, zywi / 120),
        this.sim.sen,
        this.zamrozone(),
      );
      this.app.muzyka.ustawNapiecie(Math.max(this.sim.sen, Math.max(0, this.sim.dominance - 0.55) * 2));
    }
  }

  // --------------------------------------------------------------------- obraz

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const { plate, cam, eng, sim } = this;
    if (ustawienia.jakosc === 'auto' && !jakoscAuto.taniej && eng.scale === 1 && this.straz.klatka(teraz)) {
      jakoscAuto.taniej = true;
      eng.resize(plate.w, plate.h);
      this.dirty = true;
    }
    // Rycina jest najdroższa w klatce. Ruch kamery przerysowuje ją od razu (inaczej świat
    // odjeżdżałby spod postaci), a zmiany samego świata wystarczą trzydzieści razy na sekundę.
    const kameraRuszona = cam.x !== this.rysKam[0] || cam.y !== this.rysKam[1] || cam.zoom !== this.rysKam[2];
    if (kameraRuszona || (this.dirty && teraz - this.lastInk > 30) || teraz - this.lastInk > 150) {
      eng.rebuild(sim, cam, teraz);
      this.lastInk = teraz; this.dirty = false;
      this.rysKam[0] = cam.x; this.rysKam[1] = cam.y; this.rysKam[2] = cam.zoom;
    }

    ctx.fillStyle = '#0b0807';
    ctx.fillRect(0, 0, w, h);

    const rate = (0.0007 + sim.sen * 0.0016) * (this.zamrozone() ? 0.12 : this.spowolnione() ? 0.45 : 1);
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    const breath = ruch ? 1 + Math.sin(teraz * rate) * 0.0035 : 1;
    const jx = ruch ? (Math.random() - 0.5) * 0.5 : 0;
    const jy = ruch ? (Math.random() - 0.5) * 0.5 : 0;
    // rdzeń oddycha tym samym rytmem, którym dudni skała — ciemność na brzegach
    // zaciska się i puszcza, znaki w nieznanym ledwo żarzą
    const oddech = ruch ? oddechRdzenia(sim, teraz, this.app.dzwiek.oddech(sim.sen)) : 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.rect(plate.x, plate.y, plate.w, plate.h);
    ctx.clip();
    ctx.translate(plate.x, plate.y);
    ctx.save();
    ctx.translate(cam.vw / 2 + jx, cam.vh / 2 + jy);
    ctx.scale(breath, breath);
    ctx.translate(-cam.vw / 2, -cam.vh / 2);
    ctx.imageSmoothingEnabled = eng.scale > 1;
    ctx.drawImage(eng.buf, 0, 0, cam.vw, cam.vh);
    // v4.2 beta: jasność ryciny — ta sama rycina jeszcze raz w trybie „lighter” mnoży kolory
    // o (1 + nadwyżka); filtr brightness() kosztował prawie dwa razy więcej na klatkę
    if (ustawienia.jasnosc > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, ustawienia.jasnosc - 1);
      ctx.drawImage(eng.buf, 0, 0, cam.vw, cam.vh);
      ctx.restore();
    }
    this.poswiata.nalozy(ctx, eng.emis, 0, 0, cam.vw, cam.vh, 0.5);
    this.znakowWidac = this.tajemnica.znaki(ctx, sim, cam, oddech, this.pauza);
    rysujRdzen(ctx, sim, cam, teraz);
    smugiSwiatla(ctx, sim, cam, teraz);
    drawParticles(ctx, sim, cam);
    // droga pielgrzymów: którędy wierni zejdą pod rdzeń (przekopują ją sami — gracz nie drąży)
    const plan = aktualnyPlan(sim);
    if (plan && plan.kopac.length && !sim.rytual.otwarta && sim.tick - plan.tick < 3000) {
      rysujDrogePielgrzymow(ctx, sim, cam, plan, teraz, false);
    }
    rysujZarys(ctx, sim, cam, teraz);
    rysujStworzenia(ctx, sim, cam, teraz, this.ui.selected?.id);
    if (this.panelDev && ustawienia.trybDeweloperski && !this.nasluch) rysujDev(ctx, sim, cam, teraz);
    rysujEfekty(ctx, sim.efekty, cam, teraz);
    if (this.etykiety) etykietyKolonii(ctx, sim, cam, teraz, this.cel);
    rysujZnacznikiLudu(ctx, sim, cam);
    if (this.pauza) {
      // czas stoi: świat przygasa, a na nim widać już tylko plan
      ctx.fillStyle = 'rgba(8,6,10,0.26)';
      ctx.fillRect(-cam.vw, -cam.vh, cam.vw * 3, cam.vh * 3);
      rysujRozkazy(ctx, sim, cam, this.rozkazy.lista, teraz);
    }
    if (this.cel) podswietlCel(ctx, cam, this.cel, teraz);
    ctx.restore();
    ctx.restore();
    if (this.pauza) {
      // wstrzymany oddech: złota, pulsująca rama wewnątrz płyty
      const puls = 0.5 + 0.5 * Math.sin(teraz * 0.0025);
      ctx.save();
      ctx.strokeStyle = `rgba(224,176,104,${0.28 + 0.22 * puls})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(plate.x + 4, plate.y + 4, plate.w - 8, plate.h - 8);
      ctx.restore();
    }

    // rycina ma brzeg, nie ekran: rytowana ciemność, patyna odbitki i skala w obcym piśmie
    this.tajemnica.brzegi(ctx, plate, oddech);
    if (ustawienia.skalaGlebokosci) this.tajemnica.skala(ctx, plate, sim, cam, oddech);

    drawSmoke(ctx, plate, sim, teraz);
    drawEyelid(ctx, plate, sim, teraz);
    drawFrame(ctx, plate, teraz, oddech);
    // w samouczku cel gry dochodzi dopiero na końcu — linia kroków by tylko rozpraszała
    // na telefonie wstęga leży na dole płyty, tam gdzie baner pauzy — w pauzie ustępuje mu miejsca
    // (także gdy trzymasz ryt — dół płyty zajmuje wtedy opis narzędzia — i gdy otwarta jest karta mieszkańca)
    const banerNaDole = (plate.waski || plate.niski) && (this.pauza || this.ui.verb !== null || !!this.ui.selected);
    this.drogaRect = !this.nasluch && !sim.ending && !banerNaDole ? rysujDrogeDoWolnosci(ctx, plate, sim, teraz) : null;
    if (ustawienia.skalaGlebokosci && !plate.waski && !plate.niski) rysujMinimape(ctx, sim, cam, plate, teraz);
    if (ustawienia.spisRas) drawCensus(ctx, plate, sim, h);
    drawOddanie(ctx, plate, sim, h);
    drawCrack(ctx, plate, sim, w, h, teraz);
    if (ustawienia.kronika) drawChronicle(ctx, plate, sim, w, h);
    this.ui.draw(ctx, sim, teraz);
    this.przyciski = rozmiescPrzyciski(plate, h, {
      pauza: this.pauza, zapiski: this.zapiski, legenda: this.legenda, noweTablice: odkrycia.niezobaczone,
      tempo: this.tempoTeraz(),
    });
    const podPrzyciskiem = przyciskPod(this.przyciski, this.ui.pointer.x, this.ui.pointer.y);
    rysujPrzyciski(ctx, this.przyciski, podPrzyciskiem?.akcja ?? null, teraz);
    this.ui.plan = this.pauza ? this.rozkazy : null;
    // (na telefonie przyciski są już pod płytą — baner nie musi ich omijać)
    const nadPrzyciskami = 0;
    const wyd = sim.wydarzenia.biezace;
    this.polaBanera = this.pauza && !this.zapiski && !sim.ending && !wyd
      ? rysujBanerPauzy(ctx, plate, sim, this.rozkazy.ile, teraz, nadPrzyciskami) : [];
    this.polaAlarmu = this.alarm && this.pauza && !this.zapiski && !wyd ? rysujAlarm(ctx, plate, this.alarm, teraz) : [];
    this.polaWydarzenia = wyd && !this.zapiski && !sim.ending ? rysujWydarzenie(ctx, plate, sim, wyd, teraz) : [];
    this.znakMenu(ctx, teraz);
    if (this.liczby || ustawienia.trybDeweloperski) {
      ctx.save();
      ctx.font = `${Math.max(14, w / 74)}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(236,222,190,0.95)';
      const linie = [
        `wiara ${Math.round(sim.wiara)}`,
        `krew ${Math.round(sim.krew)}`,
        `oddanie ${Math.round((najwierniejsza(sim)?.devotion ?? 0) * 100)}%`,
        `żywych ${sim.creatures.reduce((n, c) => n + (c.dead ? 0 : 1), 0)}`,
        `dominacja ${(sim.dominance * 100) | 0}%`,
        `tik ${sim.tick}`,
      ];
      linie.forEach((l, i) => ctx.fillText(l, plate.x + plate.w - 12, plate.y + 24 + i * 20));
      ctx.restore();
    }
    if (this.legenda) rysujLegende(ctx, plate, w);
    const telefon = plate.waski || plate.niski;
    void telefon;
    if (!this.legenda && !this.atlas.otwarte) {
      // WERSJA ANDROID: nad płytą stoją zasoby jako liczby, a nie druga rada. Jedna instrukcja
      // naraz — „teraz:” na wstędze drogi; dawniej dwie rady mówiły co innego. Widać je także
      // z wybranym rytem — wtedy są najbardziej potrzebne (czy stać mnie na Cud?).
      this.rysujZasoby(ctx, plate, w);
      this.radaRect = null;
    } else if (this.rada && !this.ui.verb && !this.legenda && !this.alarm && !this.atlas.otwarte) {
      ctx.save();
      ctx.textAlign = 'center';
      const rozmiar = Math.max(15, Math.min(20, w / 66));
      ctx.font = `italic ${rozmiar}px "Trzewia Tekst", Georgia, serif`;
      // na wąskim ekranie zdanie nie mieści się w jednej linii i wychodziło poza płytę
      // telefon poziomo: jedna linijka, z dala od klepsydry w prawym rogu
      const maxW = plate.w - (plate.waski ? 16 : plate.niski ? 140 : 40);
      const linie = lamiTekst(ctx, this.rada.tekst, maxW, plate.niski ? 1 : 2);
      const podstawa = plate.y - plate.top * 0.28 - (linie.length - 1) * rozmiar * 1.15;
      ctx.lineWidth = 3;
      const nad = this.radaRect && this.ui.pointer.x >= this.radaRect.x && this.ui.pointer.x <= this.radaRect.x + this.radaRect.w
        && this.ui.pointer.y >= this.radaRect.y && this.ui.pointer.y <= this.radaRect.y + this.radaRect.h;
      let szer = 0;
      for (let i = 0; i < linie.length; i++) {
        const y = podstawa + i * rozmiar * 1.15;
        szer = Math.max(szer, ctx.measureText(linie[i]).width);
        ctx.strokeStyle = 'rgba(10,7,6,0.75)';
        ctx.strokeText(linie[i], plate.x + plate.w / 2, y);
        ctx.fillStyle = nad && this.rada.cel ? 'rgba(248,228,184,1)' : 'rgba(226,206,160,0.9)';
        ctx.fillText(linie[i], plate.x + plate.w / 2, y);
      }
      // podpowiedź z miejscem jest odnośnikiem: dotknięcie wiezie tam kamerę
      this.radaRect = this.rada.cel
        ? { x: plate.x + plate.w / 2 - szer / 2 - 8, y: podstawa - rozmiar * 1.1, w: szer + 16, h: linie.length * rozmiar * 1.15 + rozmiar * 0.5 }
        : null;
      if (this.rada.cel && nad) {
        ctx.strokeStyle = 'rgba(232,196,130,0.6)';
        ctx.lineWidth = 1;
        const y = podstawa + (linie.length - 1) * rozmiar * 1.15 + rozmiar * 0.3;
        ctx.beginPath(); ctx.moveTo(plate.x + plate.w / 2 - szer / 2, y); ctx.lineTo(plate.x + plate.w / 2 + szer / 2, y); ctx.stroke();
      }
      ctx.restore();
    } else this.radaRect = null;
    if (this.painting) this.rysujKoszt(ctx, w);
    if (!sim.ending) {
      const stan = this.zamrozone() ? 'stoi' : this.spowolnione() ? 'zwalnia' : 'plynie';
      rysujTempo(ctx, plate, stan, this.tempoTeraz(), teraz);
    }
    if (this.zapiski) {
      const r = rysujZapiski(ctx, plate, sim, w, h, this.przewinZapiskow);
      this.trafieniaZapiskow = r.trafienia;
      this.maxPrzewin = r.maxPrzewin;
    }
    this.atlas.rysuj(ctx, w, h, teraz);
  }

  /** Prostokąty interfejsu — dla automatycznego testu nakładania (narzędzie deweloperskie). */
  obszaryHud(): ObszarHud[] {
    return zbierzObszaryHud({
      plate: this.plate, vh: this.app.h, ui: this.ui, przyciski: this.przyciski,
      droga: this.drogaRect, rada: this.radaRect, menu: this.menuRect(),
    });
  }

  /** Gdzie leży przycisk pod płytą — samouczek go wskazuje. */
  miejscePrzycisku(akcja: Przycisk['akcja']): Przycisk | null {
    return this.przyciski.find((b) => b.akcja === akcja) ?? null;
  }

  /** Trzy nacięcia w lewym górnym rogu płyty — wyjście do menu bez klawiatury. */
  private znakMenu(ctx: CanvasRenderingContext2D, teraz: number): void {
    const { x, y } = this.menuRect();
    ctx.save();
    ctx.font = `italic ${Math.max(14, this.plate.left * 0.2)}px "Trzewia Tekst", Georgia, serif`;
    ctx.fillStyle = 'rgba(206,192,166,0.4)';
    ctx.textAlign = 'left';
    // podpowiedź klawisza po lewej stronie znaku i tylko przy szerokim marginesie —
    // obok znaku wchodziła na ramę płyty
    if (STEROWANIE.pokazKlawisze && !this.plate.waski && this.plate.left >= 90) { ctx.textAlign = 'right'; ctx.fillText('P', x - 6, y + 16); }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = `rgba(206,192,166,${0.45 + 0.15 * Math.sin(teraz * 0.0016)})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * 7);
      ctx.lineTo(x + 20, y + i * 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  private menuRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.plate.x - (this.plate.waski ? 38 : 44), y: this.plate.y + 8, w: 34, h: 30 };
  }

  // -------------------------------------------------------------------- wejście

  private naPlycie(x: number, y: number): boolean {
    return x >= this.plate.x && y >= this.plate.y && x <= this.plate.x + this.plate.w && y <= this.plate.y + this.plate.h;
  }

  private swiatPod(x: number, y: number): [number, number] {
    return [Math.floor(this.cam.toWorldX(x - this.plate.x)), Math.floor(this.cam.toWorldY(y - this.plate.y))];
  }

  private uzyj(x: number, y: number): void {
    const { ui, sim } = this;
    if (!ui.verb || !ui.tool) return;
    if (this.dozwolone && !this.dozwolone.has(ui.verb)) { ui.say('Nie teraz.', sim.tick); return; }
    const [wx, wy] = this.swiatPod(x, y);
    if (this.painting) {
      // jedno pociągnięcie płaci za każdy kafel raz; bez tego ruch myszy opróżniał krew
      if (!sim.world.inb(wx, wy)) return;
      const klucz = sim.world.idx(wx, wy);
      if (this.malowane.has(klucz)) return;
      this.malowane.add(klucz);
    }
    // w pauzie nic nie dzieje się od razu: skała, ziarno i Znak idą do planu jako szkic
    if (this.pauza && (ui.verb === 'zasiej' || ui.verb === 'znak')) {
      const powod = this.rozkazy.zaplanuj(sim, { czasownik: ui.verb as Verb, narzedzie: ui.tool, x: wx, y: wy });
      if (powod === null) this.nasluch?.({ typ: 'rozkaz', czasownik: ui.verb, narzedzie: ui.tool });
      else if (powod && !this.painting) { ui.say(powod, sim.tick); this.app.gesty.odmowa(); }
      this.dirty = true;
      return;
    }
    const przedKrew = sim.krew, przedWiara = sim.wiara, przedOtchlan = sim.otchlan;
    let udane = false;
    if (ui.verb === 'zasiej') udane = seed(sim, ui.tool, wx, wy);
    else if (ui.verb === 'znak') { udane = sign(sim, ui.tool, wx, wy); if (udane) this.app.dzwiek.toll(); }
    else {
      const wx = this.cam.toWorldX(x - this.plate.x), wy = this.cam.toWorldY(y - this.plate.y);
      // kolejne kliknięcie w to samo miejsce bierze następnego z tłumu
      const pobliscy = sim.creatures
        .filter((o) => !o.dead && Math.hypot(o.x - wx, o.y - wy) < 3.5)
        .sort((a, b) => Math.hypot(a.x - wx, a.y - wy) - Math.hypot(b.x - wx, b.y - wy));
      if (pobliscy.length) {
        const blisko = this.ostatnieKlikniecie && Math.hypot(this.ostatnieKlikniecie.x - wx, this.ostatnieKlikniecie.y - wy) < 2.5;
        this.indeksWTlumie = blisko ? (this.indeksWTlumie + 1) % pobliscy.length : 0;
        this.ostatnieKlikniecie = { x: wx, y: wy };
        udane = ui.touchCreature(sim, pobliscy[this.indeksWTlumie]);
      } else {
        ui.say('Nikogo tam nie ma.', sim.tick);
        this.app.gesty.odmowa();
      }
    }
    if (!udane && (ui.verb === 'zasiej' || ui.verb === 'znak')) {
      const powod = ui.hintCost(sim) || 'Nie da się tego zrobić w tym miejscu.';
      ui.say(powod, sim.tick);
      this.app.gesty.odmowa();
    }
    if (udane && this.painting) {
      this.kosztPociagniecia.krew += Math.max(0, przedKrew - sim.krew);
      this.kosztPociagniecia.wiara += Math.max(0, przedWiara - sim.wiara);
      this.kosztPociagniecia.otchlan += Math.max(0, przedOtchlan - sim.otchlan);
    }
    if (udane) {
      this.nasluch?.({ typ: 'moc', czasownik: ui.verb, narzedzie: ui.tool });
    }
    this.dirty = true;
  }

  /** Ile już kosztuje trzymane pociągnięcie — rysowane przy kursorze, póki malujesz. */
  private rysujKoszt(ctx: CanvasRenderingContext2D, w: number): void {
    const k = this.kosztPociagniecia;
    const czesci: string[] = [];
    if (k.krew > 0) czesci.push(`${Math.round(k.krew)} krwi`);
    if (k.wiara > 0) czesci.push(`${Math.round(k.wiara)} wiary`);
    if (k.otchlan > 0) czesci.push(`${Math.round(k.otchlan)} otchłani`);
    if (!czesci.length) return;
    const rozmiar = Math.max(14, Math.min(19, w / 68));
    ctx.save();
    ctx.font = `${rozmiar}px "Trzewia Tekst", Georgia, serif`;
    ctx.textAlign = 'center';
    const x = Math.max(this.plate.x + 60, Math.min(this.plate.x + this.plate.w - 60, this.ui.pointer.x));
    const y = Math.max(this.plate.y + 24, this.ui.pointer.y - rozmiar * 2.2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(czesci.join(' · '), x, y);
    ctx.fillStyle = 'rgba(232,196,168,0.95)';
    ctx.fillText(czesci.join(' · '), x, y);
    ctx.restore();
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const { ui, sim } = this;
    ui.pointer.x = e.clientX; ui.pointer.y = e.clientY;
    // Remake v1: przełącznik „kogo wydaje skała”
    if (faza === 'dol') {
      const p = this.przyciskiRoli.find((b) => e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h);
      if (p) { sim.lud.rola = p.rola; this.app.gesty.klik(); this.dirty = true; return; }
    }
    // tryb deweloperski: kafel pod kursorem, a Shift+klik wybiera postać do inspektora
    if (this.panelDev && ustawienia.trybDeweloperski && !this.nasluch) {
      if (this.naPlycie(e.clientX, e.clientY)) {
        const [wx, wy] = this.swiatPod(e.clientX, e.clientY);
        DEV.kursor = { x: wx, y: wy };
        if (faza === 'dol' && e.shiftKey) {
          const fx = this.cam.toWorldX(e.clientX - this.plate.x), fy = this.cam.toWorldY(e.clientY - this.plate.y);
          let best = -1, bd = 3;
          for (const c of sim.creatures) {
            if (c.dead) continue;
            const d = Math.hypot(c.x - fx, c.y - 0.5 - fy);
            if (d < bd) { bd = d; best = c.id; }
          }
          DEV.sledzony = best;
          return;
        }
      } else DEV.kursor = null;
    }
    ui.plan = this.pauza ? this.rozkazy : null;

    if (this.atlas.otwarte) {
      if (faza === 'dol') this.atlas.dotyk(e.clientX, e.clientY);
      else this.atlas.ruch(e.clientX, e.clientY);
      // palec, który położono jeszcze przed otwarciem atlasu (przytrzymanie rytu), podnosi się
      // już nad atlasem — bez tego zostawał na liście i następne stuknięcie było „drugim palcem”
      if (faza === 'gora') { this.pointers.delete(e.pointerId); this.pinch = 0; this.srodekPinch = null; this.painting = false; }
      this.dirty = true;
      return;
    }
    // przytrzymanie palca na rycie otwiera jego tablicę (patrz krok()) — ruch albo puszczenie je przerywa
    if (faza === 'dol' && e.button !== 2) {
      const v = this.rytPod(e.clientX, e.clientY);
      this.przytrzymanie = v ? { id: e.pointerId, v, sx: e.clientX, sy: e.clientY, od: performance.now(), verb: ui.verb, tool: ui.tool } : null;
    } else if (this.przytrzymanie?.id === e.pointerId
      && (faza === 'gora' || Math.hypot(e.clientX - this.przytrzymanie.sx, e.clientY - this.przytrzymanie.sy) > STEROWANIE.progPrzewijania)) {
      this.przytrzymanie = null;
    }
    // prawy przycisk na rycie otwiera jego tablicę
    if (faza === 'dol' && e.button === 2) {
      const v = this.rytPod(e.clientX, e.clientY);
      if (v) { this.otworzTabliceRytu(v); return; }
    }

    if (faza === 'dol' && !this.zapiski && this.polaWydarzenia.length) {
      // karta wydarzenia: dotknięcie wyboru go wykonuje; dotknięcie reszty karty nic nie robi,
      // a poza kartą można przesuwać płytę i patrzeć, o czym mowa
      const b = this.polaWydarzenia.find((q) => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h);
      if (b) { this.wybierzWydarzenie(b.i); return; }
      const g = this.polaWydarzenia[0], d = this.polaWydarzenia[this.polaWydarzenia.length - 1];
      if (e.clientX >= g.x - 20 && e.clientX <= g.x + g.w + 20 && e.clientY >= this.plate.y && e.clientY <= d.y + d.h + 30) return;
    }
    if (faza === 'dol' && !this.zapiski) {
      // karta sytuacji: planuj (zostaje pauza), puść czas, nie zatrzymuj przy tym
      for (const b of this.polaAlarmu) {
        if (Math.abs(e.clientX - b.x) > b.w / 2 || Math.abs(e.clientY - b.y) > Math.max(b.h / 2, POLE_PALCA / 2)) continue;
        if (b.akcja === 'pusc') this.ustawPauze(false);
        else if (b.akcja === 'tablica' && this.alarm?.tablica) {
          odkrycia.odkryj(this.alarm.tablica, false);
          this.atlas.otworzTablice(this.alarm.tablica);
        } else {
          if (b.akcja === 'wycisz' && this.alarm) {
            this.straznik.wyciszone.add(this.alarm.rodzaj);
            ui.say('Przy tym już nie zatrzymam czasu.', sim.tick);
          }
          this.alarm = null;
        }
        this.dirty = true;
        return;
      }
      // baner pauzy: cofnij, skreśl wszystko, puść czas
      for (const b of this.polaBanera) {
        if (Math.abs(e.clientX - b.x) > b.w / 2 + 4 || Math.abs(e.clientY - b.y) > Math.max(b.h / 2, POLE_PALCA / 2)) continue;
        if (b.akcja === 'cofnij') { if (this.rozkazy.cofnij(sim)) ui.say('Skreślone.', sim.tick); }
        else if (b.akcja === 'skresl') { this.rozkazy.skreslWszystkie(sim); ui.say('Plan pusty.', sim.tick); }
        else this.ustawPauze(false);
        this.dirty = true;
        return;
      }
      // linia drogi do wolności: tablica, która tłumaczy wszystkie kroki
      const dr = this.drogaRect;
      // linia „teraz:” wiezie kamerę tam, gdzie trzeba działać
      const dl = dr?.linia;
      if (dr && dl && dr.teraz.cel && e.clientX >= dl.x && e.clientX <= dl.x + dl.w && e.clientY >= dl.y && e.clientY <= dl.y + dl.h) {
        const c = dr.teraz.cel;
        this.pokazMiejsce(c.x, c.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
        this.cel = c;
        this.dirty = true;
        return;
      }
      if (dr && e.clientX >= dr.x && e.clientX <= dr.x + dr.w && e.clientY >= dr.y && e.clientY <= dr.y + dr.h) {
        odkrycia.odkryj('droga', false);
        this.atlas.otworzTablice('droga');
        this.dirty = true;
        return;
      }
      // podpowiedź z miejscem: dotknięcie wiezie tam kamerę
      const rr = this.radaRect;
      if (rr && this.rada?.cel && e.clientX >= rr.x && e.clientX <= rr.x + rr.w && e.clientY >= rr.y && e.clientY <= rr.y + rr.h) {
        this.pokazMiejsce(this.rada.cel.x, this.rada.cel.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
        this.cel = this.rada.cel;
        return;
      }
      // klepsydra przy płycie to też przycisk pauzy
      const k = miejsceKlepsydry(this.plate);
      if (Math.hypot(e.clientX - k.x, e.clientY - k.y) < k.r) { this.ustawPauze(!this.pauza); return; }
    }

    if (faza === 'dol' && this.zapiski) {
      for (const t of this.trafieniaZapiskow) {
        if (e.clientX < t.x || e.clientX > t.x + t.w || e.clientY < t.y || e.clientY > t.y + t.h) continue;
        this.zapiski = false;
        this.pokazMiejsce(t.wpis.x! + 0.5, t.wpis.y! + 0.5, Math.max(this.cam.zoom, KAMERA.pokazZoom));
        return;
      }
      this.zapiski = false;
      return;
    }

    if (faza === 'dol') {
      const b = przyciskPod(this.przyciski, e.clientX, e.clientY);
      if (b) { this.przyciskWcisniety(b); return; }
    }

    if (faza === 'dol') {
      // tylko gdy pasek naprawdę jest na ekranie — ukryty przerzucał kamerę po kliknięciu w pustkę
      const mm = ustawienia.skalaGlebokosci && !this.plate.waski && !this.plate.niski ? miejsceZMinimapy(sim, this.plate, e.clientX, e.clientY) : null;
      if (mm) {
        this.przejmijKamere();
        this.cam.x = this.camTarget.x = mm[0];
        this.cam.y = this.camTarget.y = mm[1];
        this.cam.clamp(sim.world.w, sim.world.h);
        this.dirty = true;
        return;
      }
      const mr = this.menuRect();
      if (e.clientX >= mr.x - 6 && e.clientX <= mr.x + mr.w && e.clientY >= mr.y - 6 && e.clientY <= mr.y + mr.h) {
        this.app.idz('menu');
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, interfejs: false, przycisk: e.button });
      if (this.pointers.size > 1) { this.painting = false; return; }
      if (sim.ending) return;
      const przedWyborem = ui.verb;
      const wybranaMysl = ui.selected;
      if (this.legenda) { this.legenda = false; return; }
      const wpis = this.pointers.get(e.pointerId);
      if (ui.tap(sim, e.clientX, e.clientY)) {
        if (wpis) wpis.interfejs = true;               // karta i ryty nie są światem
        if (ui.verb !== przedWyborem) this.nasluch?.({ typ: 'wybranoCzasownik', czasownik: ui.verb });
        // tylko naprawdę szepnięta myśl — zamknięcie karty kliknięciem w ryt to nie szept
        if (wybranaMysl && ui.ostatniaMysl) this.nasluch?.({ typ: 'szept', narzedzie: ui.ostatniaMysl });
        ui.ostatniaMysl = null;
        return;
      }
      if (ui.selected) { ui.selected = null; if (wpis) wpis.interfejs = true; return; }
      if (!this.naPlycie(e.clientX, e.clientY)) return;
      if (ui.verb === 'zasiej' && e.button !== 2) {
        this.painting = true;
        this.malowane.clear();
        this.kosztPociagniecia = { krew: 0, wiara: 0, otchlan: 0 };
        this.uzyj(e.clientX, e.clientY);
      }
      return;
    }

    if (faza === 'ruch') {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.moved = true;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const sx = (a.x + b.x) / 2, sy = (a.y + b.y) / 2;
        if (this.pinch > 0) {
          this.cam.zoom *= d / this.pinch;
          this.przejmijKamere();
          if (this.srodekPinch) {                      // dwa palce przesuwają też obraz
            this.cam.x -= (sx - this.srodekPinch.x) / this.cam.zoom;
            this.cam.y -= (sy - this.srodekPinch.y) / this.cam.zoom;
          }
          this.cam.clamp(sim.world.w, sim.world.h);
          this.nasluch?.({ typ: 'kamera', rodzaj: 'zoom' });
          this.dirty = true;
        }
        this.pinch = d;
        this.srodekPinch = { x: sx, y: sy };
        return;
      }
      if (this.painting && p.przycisk !== 2) { this.uzyj(e.clientX, e.clientY); return; }
      this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom;
      this.przejmijKamere();                           // przeciągnięcie to przejęcie kamery, nie sugestia
      this.cam.clamp(sim.world.w, sim.world.h);
      this.nasluch?.({ typ: 'kamera', rodzaj: 'przesun' });
      this.dirty = true;
      return;
    }

    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) { this.pinch = 0; this.srodekPinch = null; }
    if (!p) return;
    if (this.painting) { this.painting = false; this.malowane.clear(); return; }
    if (p.interfejs) return;
    // w pauzie dotknięcie szkicu bez rytu w ręku (albo prawy przycisk) go skreśla
    if (!p.moved && this.pauza && this.rozkazy.ile && this.naPlycie(p.sx, p.sy) && (!ui.verb || p.przycisk === 2)) {
      const wx = this.cam.toWorldX(p.sx - this.plate.x), wy = this.cam.toWorldY(p.sy - this.plate.y);
      const o = this.rozkazy.pod(sim, wx, wy);
      if (o) { this.rozkazy.skresl(sim, o); ui.say('Skreślone. Koszt wrócił.', sim.tick); this.dirty = true; return; }
    }
    if (!p.moved && p.przycisk !== 2 && !sim.ending && ui.verb && ui.verb !== 'zasiej' && this.naPlycie(p.sx, p.sy)) this.uzyj(p.sx, p.sy);
  }

  /** Który ryt leży pod palcem (albo null). */
  private rytPod(x: number, y: number): string | null {
    for (const v of ['zasiej', 'szept', 'znak']) {
      const m = this.ui.miejsce('verb', v);
      if (m && Math.abs(x - m.x) <= m.hw && Math.abs(y - m.y) <= m.hh) return v;
    }
    return null;
  }

  private otworzTabliceRytu(v: string): void {
    odkrycia.odkryj(`ryt-${v}`, false);
    this.atlas.otworzTablice(`ryt-${v}`);
  }

  /** Ten sam skutek, co klawisz — tylko że da się w to kliknąć palcem. */
  private przyciskWcisniety(b: Przycisk): void {
    switch (b.akcja) {
      case 'pauza': this.klawisz('pauza'); break;
      case 'wolniej': this.klawisz('wolniej'); break;
      case 'szybciej': this.klawisz('szybciej'); break;
      case 'kamera': this.doMieszkancow(); break;
      case 'zapiski': this.zapiski = !this.zapiski; this.przewinZapiskow = 0; break;
      case 'atlas': this.atlas.otworzAtlas(); break;
      case 'legenda': this.legenda = !this.legenda; break;
      case 'zapis': this.klawisz('zapis'); break;
    }
    this.dirty = true;
  }

  kolko(e: WheelEvent): void {
    if (this.atlas.otwarte) { this.atlas.kolko(e.deltaY > 0 ? 70 : -70); return; }
    if (this.zapiski) {
      this.przewinZapiskow = Math.max(0, Math.min(this.maxPrzewin, this.przewinZapiskow + (e.deltaY > 0 ? 3 : -3)));
      return;
    }
    const bx = this.cam.toWorldX(e.clientX - this.plate.x), by = this.cam.toWorldY(e.clientY - this.plate.y);
    this.przejmijKamere();
    this.cam.zoom *= e.deltaY < 0 ? KAMERA.krokKolka : 1 / KAMERA.krokKolka;        // większy krok — mniej kręcenia
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.cam.x += bx - this.cam.toWorldX(e.clientX - this.plate.x);
    this.cam.y += by - this.cam.toWorldY(e.clientY - this.plate.y);
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.nasluch?.({ typ: 'kamera', rodzaj: 'zoom' });
    this.dirty = true;
  }

  klawiszPuszczony(k: string): void { if (k === 'Tab') this.liczby = false; }

  klawisz(akcja: Akcja | null, _e?: KeyboardEvent): void {
    if (_e?.key === 'Tab') { this.liczby = true; return; }
    const { ui, sim } = this;
    if (this.atlas.otwarte && _e) { this.atlas.klawisz(_e.key); return; }
    // Enter przy karcie sytuacji: „planuj" — karta znika, czas dalej stoi
    if (this.alarm && _e?.key === 'Enter') { this.alarm = null; return; }
    switch (akcja) {
      case 'menu':
        // „wstecz” telefonu (i Esc): najpierw zamyka to, co otwarte — dopiero potem menu
        if (this.zapiski) { this.zapiski = false; break; }
        if (ui.selected) { ui.selected = null; break; }
        if (this.alarm) { this.alarm = null; break; }
        if (ui.verb) { ui.verb = null; ui.tool = null; break; }
        this.app.idz('menu');
        break;
      case 'pauza': this.ustawPauze(!this.pauza); break;
      case 'szybciej': ustawienia.tempo = Math.min(TEMPO.max, ustawienia.tempo + 1); this.nasluch?.({ typ: 'tempo' }); break;
      case 'wolniej': ustawienia.tempo = Math.max(1, ustawienia.tempo - 1); this.nasluch?.({ typ: 'tempo' }); break;
      case 'zapis': ui.say(this.zapisujAuto && saveToStorage(sim) ? 'Zapisane.' : 'Nie tutaj.', sim.tick); break;
      case 'wczytaj': {
        // w samouczku zapis gracza nie ma prawa podmienić góry, na której się uczy
        if (!this.zapisujAuto) { ui.say('Nie tutaj.', sim.tick); break; }
        const s = loadFromStorage();
        if (s) {
          this.sim = s; this.doSerca(true); this.dirty = true;
          if (s.ending) { this.app.idz('kronika', { sim: s }); break; }
          ui.say('Wróciłeś tam, gdzie byłeś.', s.tick);
        } else ui.say('Nie ma do czego wracać.', sim.tick);
        break;
      }
      case 'odNowa': if (sim.ending) this.nowaGra(); break;
      case 'legenda': this.legenda = !this.legenda; break;
      case 'zapiski': this.zapiski = !this.zapiski; this.przewinZapiskow = 0; break;
      case 'kamera': this.doMieszkancow(); break;
      case 'przyblizenie': this.cam.zoom = Math.min(this.cam.maxZoom, this.cam.zoom * KAMERA.krokKlawisza); this.cam.clamp(sim.world.w, sim.world.h); this.nasluch?.({ typ: 'kamera', rodzaj: 'zoom' }); this.dirty = true; break;
      case 'oddalenie': this.cam.zoom = Math.max(this.cam.minZoom, this.cam.zoom / KAMERA.krokKlawisza); this.cam.clamp(sim.world.w, sim.world.h); this.nasluch?.({ typ: 'kamera', rodzaj: 'zoom' }); this.dirty = true; break;
      case 'zasiej': case 'szept': case 'znak': this.wybierzCzasownik(akcja); break;
      case 'narzedzie1': case 'narzedzie2': case 'narzedzie3': case 'narzedzie4': this.wybierzNarzedzie(Number(akcja.slice(-1)) - 1); break;
      default: break;
    }
  }

  wybierzCzasownik(v: string): void {
    if (this.dozwolone && !this.dozwolone.has(v)) return;
    const ui = this.ui;
    ui.verb = ui.verb === v ? null : (v as typeof ui.verb);
    ui.tool = ui.verb ? TOOLS[ui.verb][0].id : null;
    ui.selected = null;
    this.nasluch?.({ typ: 'wybranoCzasownik', czasownik: ui.verb });
  }

  private wybierzNarzedzie(i: number): void {
    const ui = this.ui;
    if (!ui.verb) return;
    const lista = TOOLS[ui.verb];
    if (i < lista.length) ui.tool = lista[i].id;
  }
}
