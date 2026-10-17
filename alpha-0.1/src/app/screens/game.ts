import { rysujWiadra, rysujPrzodWiader } from '../../render/wiadro';
import { rysujKucie } from '../../render/kucie';
import { Urobki, znaczekKruszcu, type CelLotu } from '../../render/kruszce';
import { Pokoje, akcjaNaPomieszczeniu, type PodKursorem } from '../../render/pomieszczenia';
import { Oltarz, oltarzPod } from '../../render/oltarz';
import { rysujOknoOltarza, type PoleOltarza } from '../../render/okno-oltarza';
import { odprawRytual, rytualOltarza } from '../../sim/oltarz';
import { NAZWA_RYTUALU } from '../../nastawy/oltarz';
import { probaPlanu, polozPlan, skreslPlan, pomieszczenieW, czyPokoj, type ProbaPlanu } from '../../sim/pomieszczenia';
import { SZABLONY, NAZWA_POMIESZCZENIA, BIERNIK_POMIESZCZENIA, type RodzajPomieszczenia } from '../../nastawy/pomieszczenia';
import { OKRUCH } from '../../nastawy/kruszce';
import { rysujTrupy } from '../../render/trupy';
import { porcjiWWiadrach } from '../../sim/wiadro';
import { Sim, resetRaces } from '../../sim/sim';
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
import { mnoznikNapis } from '../../render/przyciski';
import { klanLudu, rolaPostaci, NAZWA_ROLI, NAZWA_ROLI_MNOGA, type Rola } from '../../sim/lud';
import { rysujDruzyne, rysujZaznaczenie, rysujPoleceniaNaMapie, ludRoli, type PoleDruzyny, type FalaRozkazu } from '../../render/druzyna';
import { wydajGrupie, drogaGrupie, odwolajPolecenie, wydajNaPomieszczenie, wydajDoOltarza, przywolajDoOltarza } from '../../sim/polecenia';
import { rysujZnacznikiLudu } from '../../render/lud';
import { rysujPasekFali, rysujStraznikowWSkale } from '../../render/straznicy';
import { LUD, REMAKE } from '../../nastawy/lud';
import { rozmiescPrzyciski, rysujPrzyciski, przyciskPod, type Przycisk } from '../../render/przyciski';
import { rysujMinimape, miejsceZMinimapy } from '../../render/minimapa';
import { rysujZarys } from '../../render/zarys';
import { Poswiata } from '../../render/bloom';
import { Tajemnica, oddechRdzenia } from '../../render/tajemnica';
import { scianaKrypty, tynkSwiata } from '../../render/fresk';
import { FRESK } from '../../nastawy/barwy';
import { rysujDrogePielgrzymow } from '../../render/pielgrzymka';
import { aktualnyPlan, najwierniejsza } from '../../sim/pielgrzymka';
import { rysujDrogeDoWolnosci, type ObszarDrogi } from '../../render/droga';
import { rysujRdzen } from '../../render/rdzen';
import { smugiSwiatla } from '../../render/shafts';
import { etykietyKolonii, podswietlCel, strzalkaCelu, type Cel } from '../../render/znaczniki';
import { podpowiedz, type Podpowiedz } from '../../sim/podpowiedzi';
import { computePlate, drawFrame, drawCrack, drawSmoke, drawEyelid, drawChronicle, drawOddanie, type Plate } from '../../render/plate';
import { Ui } from '../../ui/ui';
import { seed, sign, nakarm, TOOLS, type Verb } from '../../powers/powers';
import { Rozkazy } from '../../powers/rozkazy';
import { rysujRozkazy, rysujBanerPauzy, type PoleBanera } from '../../render/rozkazy';
import { miejsceKlepsydry } from '../../render/tempo';
import { zbierzObszaryHud, type ObszarHud } from '../obszary-hud';
import { Straznik, type Alarm } from '../alarmy';
import { rysujAlarm, type PoleAlarmu } from '../../render/alarm';
import { rysujWydarzenie, type PoleWyboru } from '../../render/wydarzenie';
import { rysujMrok, rysujPatrzacego } from '../../render/mrok';
import { rysujDlon } from '../../render/dlon';
import { BOT, BOT_GRA, wyslijStan, ziarnoPartii } from '../obserwowany';
import { BOT_CO, kartaBota, ruchBota } from '../bot';
import { wolnoRuszac } from '../../render/nastroj';
import { NASTROJ } from '../../nastawy/wyglad/nastroj';
import { MROK } from '../../nastawy/mrok';
import { rozstrzygnij, type Wydarzenie } from '../../sim/wydarzenia';
import { OknoAtlasu } from '../../atlas/okno';
import { odkrycia } from '../../atlas/odkrycia';
import { SERIF } from '../../render/ink';
import { tablica } from '../../atlas/tablice';
import { Job, type Creature } from '../../sim/creatures';
import { saveToStorage, loadFromStorage } from '../../core/save';
import { ustawienia, jakoscAuto } from '../../core/settings-store';
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
  | { typ: 'zaznaczono'; ile: number }
  | { typ: 'polecenie'; rodzaj: 'idz' | 'droga' | 'odwolaj' | 'pomieszczenie' | 'oltarz'; przyjeli: number }
  /** etap 3d: otwarto okno ołtarza (`okno`) albo odprawiono rytuał (jego rodzaj) */
  | { typ: 'oltarz'; rodzaj: string }
  | { typ: 'planowanie'; rodzaj: string }
  | { typ: 'plan'; rodzaj: string }
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
  /** Ostatnio widziane wiara, krew, jedzenie — zmiana żarzy się chwilę (render/nastroj.ts). */
  private zmianyZasobow = new Map<string, { n: number; t: number; wiecej: boolean }>();
  /** Alpha, etap 3b: okruchy rudy lecące do liczników żelaza i złota (render/kruszce.ts). */
  private urobki = new Urobki();
  /** Alpha, etap 3c: rysunek planów i pomieszczeń (render/pomieszczenia.ts). */
  private pokoje = new Pokoje();
  /** Alpha, etap 3d: ołtarz w sali i jego rytuały (render/oltarz.ts); okno rytuałów otwiera dotknięcie ołtarza. */
  private oltarz = new Oltarz();
  private oknoOltarza = false;
  private polaOltarza: PoleOltarza[] = [];
  /** Planujesz: szablon pod kursorem (null — nie planujesz). */
  szablon: RodzajPomieszczenia | null = null;
  private ostatniSzablon: RodzajPomieszczenia = 'warsztat';
  /** Korytarz i szyb: kafel, od którego ciągniesz pas. */
  private ciagniecie: { x: number; y: number } | null = null;
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
  /** Miejsce, na które gra wprost każe patrzeć (samouczek, podpowiedzi). */
  cel: Cel | null = null;
  /** Czy rysować podpisy nacji. */
  etykiety = true;
  /** Alpha, etap 2: zaznaczone postacie ludu (id) — dotknięcie mapy wydaje im rozkaz „idź tam”. */
  zaznaczeni = new Set<number>();
  /** Pola paska drużyny pod płytą (medaliony ról i rozkazy) z ostatniej klatki. */
  private polaDruzyny: PoleDruzyny[] = [];
  /** Fala w miejscu ostatniego rozkazu (render/druzyna.ts). */
  private falaRozkazu: FalaRozkazu | null = null;
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
  /** Remake v2: ostatnie wiadro, które już było słychać. */
  private slyszaneWiadro: number | undefined;
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
  /** Które zdarzenia Patrzącego już zabrzmiały (tik szeptu i zabrania). */
  private slyszanyMrok: { szept?: number; zabrany?: number } = {};
  private slyszanaDlon: { wstaje?: number; chwyt?: number } = {};
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
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean; interfejs: boolean; przycisk: number; plan?: boolean }>();
  private pinch = 0;
  private srodekPinch: { x: number; y: number } | null = null;
  private painting = false;
  /** Kafle już opłacone w tym pociągnięciu — ruch myszy nie może kasować krwi co klatkę. */
  private malowane = new Set<number>();
  private kosztPociagniecia = { krew: 0, wiara: 0, otchlan: 0 };

  /** Okienko logów i narzędzi (tryb deweloperski, v4 beta). */
  private panelDev: PanelDewelopera | null = null;
  /** Znacznik miejsca z karty wydarzenia — znika razem z kartą. */
  private celKarty: Cel | null = null;
  /** Okno obserwatorium: kiedy partia się skończyła (czas ekranu) i kiedy ostatnio wysłano stan. */
  private botKoniecOd = 0;
  private botStanOd = 0;

  constructor(private app: Kontekst) {
    this.oltarz.onZdarzenie = (z) => this.app.dzwiek.rytual(z.faza, z.rodzaj !== 'modlitwa' && z.rodzaj !== 'wskrzeszenie');
    this.urobki.onDolot = (rodzaj) => { if (rodzaj === 'krew') this.app.dzwiek.kropla(); else this.app.dzwiek.kruszec(rodzaj !== 'zelazo'); };
  }

  /** Mnożnik czasu: w grze zawsze 1 (zwykły czas), w trybie deweloperskim z przycisków i okienka. */
  private tempoTeraz(): number {
    if (BOT.wlaczony) return BOT.tempo;
    return ustawienia.trybDeweloperski ? DEV.mnoznik : 1;
  }

  /** Tryb deweloperski: następny / poprzedni mnożnik czasu z TEMPO.mnozniki. */
  private zmienTempo(o: 1 | -1): void {
    const M = TEMPO.mnozniki;
    let i = M.findIndex((m) => m >= DEV.mnoznik);
    if (i < 0) i = M.length - 1;
    DEV.mnoznik = M[Math.max(0, Math.min(M.length - 1, i + o))];
    this.ui.say(DEV.mnoznik === 1 ? 'Czas zwykły.' : `Czas ×${DEV.mnoznik} (tryb deweloperski).`, this.sim.tick);
    this.nasluch?.({ typ: 'tempo' });
  }

  wyjdz(): void {
    this.panelDev?.ustaw(false);
  }

  // ------------------------------------------------------------------ życie ekranu

  wejdz(dane?: unknown): void {
    this.pauza = false;
    this.straz.zeruj();
    this.slad = null;
    const tryb = (dane as { tryb?: string } | undefined)?.tryb;
    if (tryb === 'nowa') this.nowaGra();
    else if (tryb === 'bot') {
      // okno obserwatorium: gra od razu, a obserwatorium może zacząć nową partię wiadomością
      BOT_GRA.nowaGra = (z) => this.nowaGra(z ?? ziarnoPartii());
      this.nowaGra(ziarnoPartii());
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
    this.botKoniecOd = 0;
    if (BOT.wlaczony) {
      BOT.partia++;
      this.sim.wydarzenia.gracz = true;
    }
    // Remake v2: jedna trudność — Koszmar (krew na start i reszta ustawia się w Sim)
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

  /** „pokaż miejsce” na karcie: kamera jedzie tam, a miejsce ląduje pod kartą (`czesc` płyty niżej; skala zostaje). */
  private pokazPodKarta(c: { x: number; y: number }, czesc: number): void {
    this.pokazMiejsce(c.x, c.y);
    this.cam.y = this.camTarget.y = c.y - (this.plate.h * czesc) / this.cam.zoom;
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.dirty = true;
  }

  /** Dotknięcie strzałki celu przy krawędzi płyty wiezie kamerę na miejsce (skala zostaje). */
  private dotknijStrzalki(x: number, y: number): boolean {
    if (!this.cel) return false;
    const s = strzalkaCelu(this.cam, this.cel);
    if (!s || Math.hypot(x - this.plate.x - s.x, y - this.plate.y - s.y) > Math.max(30, POLE_PALCA * 0.6)) return false;
    this.pokazMiejsce(this.cel.x, this.cel.y);
    this.dirty = true;
    return true;
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
    return this.pauza || (BOT.wlaczony && BOT.pauza) || this.wstrzymane || this.zapiski || this.atlas.otwarte || !!this.sim.ending || this.ui.selected !== null;
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
    let pielgrzym = false;
    for (const c of sim.creatures) {
      if (c.dead) continue;
      if (c.job === Job.PIELGRZYM) pielgrzym = true;
      if (c.x >= left && c.x <= right && c.y >= top && c.y <= bottom) odkrycia.odkryj(`rasa-${c.race}`);
    }
    if (pielgrzym) odkrycia.odkryj('pielgrzymka');
    // Remake v2: sen już nie rośnie — tablica „Przegrana” odkrywa się po trzech minutach albo przy pierwszej śmierci z głodu
    if (sim.tick > 21600 || sim.stat.zGlodu > 0) cicho('sen');
    if (sim.rytual.pekniecia > 0 || sim.world.ever[sim.world.idx(sim.world.coreX, sim.world.coreY)]) odkrycia.odkryj('rdzen');
    // skorupę odkrywa się, gdy ktoś zacznie się przy niej modlić albo gdy pęknie
    if (sim.rytual.wierni >= 1 || sim.rytual.pekniecia > 0) odkrycia.odkryj('skorupa');
    if (sim.tick > 1500) cicho('krew');
    if (sim.wiara > 15) cicho('wiara');
    // wiara to serce drogi do wygranej — jej tablica wyskakuje sama przy pierwszej modlitwie
    if (sim.prayers > 0 && sim.tick > 600) odkrycia.odkryj('oddanie');
    if (sim.tick > 7000) cicho('pamiec');
    // Remake v1: tablice ludu, weteranów, Strażników i bossa
    if (sim.tick > 600) cicho('role');
    // Alpha: tablica rozkazów — przy pierwszym zaznaczeniu (albo po minucie po cichu)
    if (this.zaznaczeni.size) odkrycia.odkryj('rozkazy');
    if (sim.tick > 7200) cicho('rozkazy');
    // Remake v2: bez lin — pierwszy, kto kuje sobie schody pod półkę, pokazuje nową zasadę
    if (sim.tick > 600 && sim.creatures.some((c) => !c.dead && c.drogaKopie)) odkrycia.odkryj('schody');
    if (sim.tick > 4000) cicho('schody');
    // Alpha, etap 3b: pierwsza wykuta ruda odkrywa tablicę kruszców
    if (sim.urobek.length || sim.zelazo || sim.zloto) odkrycia.odkryj('kruszce');
    // etap 3c: pierwszy plan — tablica pomieszczeń; gotowy warsztat, kuźnia, sypialnia — ich tablice
    if (this.szablon || sim.pomieszczenia.length) odkrycia.odkryj('pomieszczenia');
    for (const pom of sim.pomieszczenia) if (pom.gotowe && (pom.rodzaj === 'warsztat' || pom.rodzaj === 'kuznia' || pom.rodzaj === 'sypialnia')) odkrycia.odkryj(pom.rodzaj);
    // etap 3d: ołtarz — gdy ktoś go zobaczy (albo po cichu po chwili); rytuał — jego tablica przy pierwszym odprawieniu;
    // drabina — przy pierwszym planie drabiny
    const o = sim.world.oltarz;
    if (this.oknoOltarza) odkrycia.odkryj('oltarz');
    if (sim.tick > 1200 && sim.world.ever[sim.world.idx(o.x, o.y)]) cicho('oltarz');
    const rt = rytualOltarza(sim);
    if (rt) odkrycia.odkryj(rt.rodzaj === 'modlitwa' ? 'rytual-modlitwa' : rt.rodzaj === 'szal' ? 'rytual-szal' : rt.rodzaj === 'wskrzeszenie' ? 'rytual-wskrzeszenie'
      : rt.rodzaj === 'ofiaraKrwi' ? 'rytual-ofiara-krwi' : 'rytual-ofiara-zycia');
    if (this.szablon === 'drabina' || sim.pomieszczenia.some((p) => p.rodzaj === 'drabina')) odkrycia.odkryj('drabina');
    if (sim.tick > LUD.weteranPo) odkrycia.odkryj('weterani');
    if (sim.lud.straznicy?.trwa) odkrycia.odkryj('straznicy');
    if (sim.lud.mrok?.widziany) odkrycia.odkryj('patrzacy');
    if (sim.lud.dlon?.widziana) odkrycia.odkryj('dlon');
    // Remake v2: wiadro, hełmy, trupy
    if ((sim.lud.wiadra?.lista ?? []).some((wd) => wd.faza === 'stoi')) cicho('wiadro');
    if (sim.lud.helmy) odkrycia.odkryj('helmy');
    if (sim.lud.trupy?.length) cicho('trupy');
    if (sim.creatures.some((c) => !c.dead && c.boss)) odkrycia.odkryj('boss');
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
      // kamera zostaje tam, gdzie ją zostawiłeś — miejsce jest tylko zaznaczone (poza kadrem: strzałka przy
      // krawędzi, dotknięcie jej wiezie kamerę). Sama jedzie tylko z ustawieniem „Kamera do wydarzeń” i w samouczku.
      if (ustawienia.kameraDoWydarzen || this.nasluch) {
        this.pokazMiejsce(e.cel.x, e.cel.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
        // karta stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
        this.cam.y = this.camTarget.y = e.cel.y - (this.plate.h * 0.25) / this.cam.zoom;
        this.cam.clamp(this.sim.world.w, this.sim.world.h);
      }
      this.cel = this.celKarty = { x: e.cel.x, y: e.cel.y, r: 5, tekst: e.cel.tekst };
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
   * Remake v1: pasek nad płytą — tylko trzy zasoby: wiara, krew i jedzenie (Remake v2: porcje w wiadrach).
   * Role stoją w panelu LUD pod płytą (górny margines należy do narzędzi rytu).
   */
  private rysujZasoby(ctx: CanvasRenderingContext2D, plate: Plate, w: number): void {
    const { sim } = this;
    const klan = klanLudu(sim);
    const czesci: [string, string, string][] = [
      // etap 3c: krzyż z warsztatu leci do licznika wiary — wiara rośnie, gdy doleci
      ['wiara', `${Math.max(0, Math.floor(sim.wiara - this.urobki.wLocie('wiara')))}`, 'rgba(222,200,150,1)'],
      // etap 3d: kropla krwi z ofiary leci z misy ołtarza do licznika — krew rośnie, gdy doleci
      ['krew', `${Math.max(0, Math.floor(sim.krew - this.urobki.wLocie('krew')))}`, 'rgba(206,104,86,1)'],
      // Remake v2: jedzenie to porcje w wiadrach, które już zjechały albo zjeżdżają
      ['jedzenie', `${REMAKE ? porcjiWWiadrach(sim) : klan?.stock ?? 0}`, 'rgba(150,178,114,1)'],
      // Alpha, etap 3b: kruszce — licznik rośnie, gdy okruch z rozbitego kafla doleci (render/kruszce.ts)
      ['żelazo', `${Math.max(0, sim.zelazo - this.urobki.wLocie('zelazo'))}`, 'rgba(184,192,204,1)'],
      ['złoto', `${Math.max(0, sim.zloto - this.urobki.wLocie('zloto'))}`, 'rgba(236,196,96,1)'],
    ];
    const teraz = performance.now();
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
      // kruszec: znaczek (sztabka, samorodek) przed podpisem; na wąskim ekranie sam znaczek, bez podpisu
      const kruszec = e === 'żelazo' ? 'zelazo' : e === 'złoto' ? 'zloto' : null;
      const cel: CelLotu | null = kruszec ?? (e === 'wiara' ? 'wiara' : e === 'krew' ? 'krew' : null);
      const kb = cel ? this.urobki.blysk(cel, teraz) : 0;
      if (cel === 'wiara' || cel === 'krew') this.urobki.cele[cel] = { x: x + kaw(e + ' ', fE) + kaw(l, fL) / 2, y: y - rozm * 0.35 };
      if (kruszec) {
        const s = rozm * 1.25;
        znaczekKruszcu(ctx, kruszec, x + s / 2, y - rozm * 0.32, s, kb, this.urobki.dolot(kruszec));
        this.urobki.cele[kruszec] = { x: x + s / 2, y: y - rozm * 0.32 };
        x += s + rozm * 0.25;
      }
      if (!kruszec || !plate.waski) { ctx.font = fE; ctx.fillStyle = 'rgba(160,146,124,0.85)'; ctx.fillText(e + ' ', x, y); x += kaw(e + ' ', fE); }
      // liczba, która się zmieniła, żarzy się chwilę: złotem, gdy rośnie, krwią, gdy maleje
      const z = this.zmianyZasobow.get(e);
      const n = Number(l);
      if (!z || z.n !== n) this.zmianyZasobow.set(e, { n, t: z ? teraz : -1e9, wiecej: !z || n > z.n });
      const zm = this.zmianyZasobow.get(e)!;
      const k = wolnoRuszac() ? Math.max(0, 1 - (teraz - zm.t) / NASTROJ.liczbaZar) : 0;
      ctx.font = fL; ctx.fillStyle = kol;
      if (kb > 0) {
        // okruch doleciał: liczba podskakuje i żarzy się barwą kruszcu
        const sk = 1 + (OKRUCH.podbicie - 1) * kb * kb;
        const sz = kaw(l, fL);
        ctx.save();
        ctx.translate(x + sz / 2, y - rozm * 0.35);
        ctx.scale(sk, sk);
        ctx.shadowColor = cel === 'zloto' || cel === 'wiara' ? `rgba(255,214,110,${kb})` : cel === 'krew' ? `rgba(255,70,50,${kb})` : `rgba(255,170,90,${kb})`;
        ctx.shadowBlur = 12 * kb;
        ctx.fillText(l, -sz / 2, rozm * 0.35);
        ctx.restore();
      } else if (k > 0) {
        ctx.save();
        ctx.shadowColor = zm.wiecej ? `rgba(240,196,120,${0.9 * k})` : `rgba(214,50,32,${0.9 * k})`;
        ctx.shadowBlur = 10 * k;
        ctx.fillText(l, x, y);
        ctx.restore();
      } else ctx.fillText(l, x, y);
      x += kaw(l, fL) + odst;
    }
    ctx.restore();
  }

  private podniesAlarm(a: Alarm): void {
    this.alarm = a;
    this.pauza = true;
    this.nasluch?.({ typ: 'pauza', stoi: true });
    this.ui.selected = null;
    if (a.cel) {
      // jak przy karcie wydarzenia: miejsce zaznaczone, kamera stoi (chyba że „Kamera do wydarzeń”)
      if (ustawienia.kameraDoWydarzen) {
        this.pokazMiejsce(a.cel.x, a.cel.y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
        // karta sytuacji stoi u góry płyty — miejsce, o którym mówi, ląduje pod nią
        this.cam.y = this.camTarget.y = a.cel.y - (this.plate.h * 0.2) / this.cam.zoom;
        this.cam.clamp(this.sim.world.w, this.sim.world.h);
      }
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

  /** Okno obserwatorium: stan dla obserwatorium co pół sekundy i nowa partia po końcu. */
  private krokObserwowanej(teraz: number): void {
    if (this.sim.ending) {
      if (!this.botKoniecOd) this.botKoniecOd = teraz;
      else if (BOT.autoRestart && !BOT.pauza && teraz - this.botKoniecOd > 6000) { this.nowaGra(ziarnoPartii()); this.alarm = null; this.pauza = false; }
    }
    if (teraz - this.botStanOd > 500) {
      this.botStanOd = teraz;
      wyslijStan(this.sim, this.sim.seed, this.botKoniecOd ? teraz - this.botKoniecOd : 0);
    }
  }

  krok(dt: number, teraz: number): void {
    if (BOT.wlaczony) this.krokObserwowanej(teraz);
    // karta wydarzenia rozstrzygnięta — jej znacznik znika, wraca cel podpowiedzi
    if (this.celKarty && !this.sim.wydarzenia.biezace) {
      if (this.cel === this.celKarty) this.cel = this.rada?.cel ?? null;
      this.celKarty = null;
    }
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
      // zwykły czas: tyle tików na sekundę, niezależnie od tego, ile klatek pokazuje ekran
      let kroki: number;
      if (dev && DEV.pauza) { kroki = DEV.krokow; DEV.krokow = 0; }
      else {
        const naSekunde = TEMPO.tikowNaSekunde * this.tempoTeraz() * (this.spowolnione() ? 0.25 : 1);
        this.reszta += (dt / 1000) * naSekunde;
        const cale = Math.floor(this.reszta);
        this.reszta -= cale;
        // wolny komputer: świat zwalnia, zamiast nadrabiać bez końca
        kroki = Math.min(Math.max(TEMPO.maxNaKlatke, Math.ceil(naSekunde / 20)), cale);
      }
      const t0 = performance.now();
      for (let i = 0; i < kroki; i++) {
        this.sim.step();
        // okno obserwatorium: gra bot — karty rozstrzyga od razu, resztę co pół sekundy gry
        if (BOT.wlaczony && !this.sim.ending) {
          if (this.sim.wydarzenia.biezace) kartaBota(this.sim, BOT.styl);
          if (this.sim.tick % BOT_CO === 0) ruchBota(this.sim, BOT.styl);
        }
      }
      if (dev && kroki > 0) DEV.msKroku = DEV.msKroku * 0.9 + ((performance.now() - t0) / kroki) * 0.1;
      const wiadroT = this.sim.lud.wiadra?.zjazdT;
      if (wiadroT !== undefined && wiadroT !== this.slyszaneWiadro) { this.slyszaneWiadro = wiadroT; this.app.dzwiek.wiadro(); }
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
      if (!this.nasluch && !BOT.wlaczony) {
        const a = this.straznik.sprawdz(this.sim, ustawienia.autoPauza);
        if (a) this.podniesAlarm(a);
      }
      if (this.sim.ending) {
        this.nasluch?.({ typ: 'koniec', opis: this.sim.ending });
        if (!this.nasluch && !BOT.wlaczony) this.app.idz('kronika', { sim: this.sim });
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
    if (!this.nasluch && !BOT.wlaczony && odkrycia.kolejka.length && !this.atlas.otwarte && !this.alarm && !this.zapiski && !this.sim.wydarzenia.biezace
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
        if (!this.ui.verb && !this.sim.wydarzenia.biezace) this.cel = nowa.cel ?? null;
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
      // Ten, który patrzy: gdy podchodzi i gdy patrzy, muzyka gęstnieje jak przy zasypianiu
      const mrok = this.sim.lud.mrok;
      const napiecieMroku = mrok?.faza === 'patrzy' ? 0.75 : mrok?.faza === 'podchodzi' ? 0.45 : 0;
      // dłoń z otchłani: od pierwszego drgnięcia otchłani do chwytu muzyka jest na granicy
      const dlon = this.sim.lud.dlon;
      const napiecieDloni = dlon && dlon.faza !== 'brak' && dlon.faza !== 'gasnie' ? (dlon.faza === 'wstaje' ? 0.85 : 1) : 0;
      this.app.muzyka.ustawNapiecie(Math.max(this.sim.sen, Math.max(0, this.sim.dominance - 0.55) * 2, napiecieMroku, napiecieDloni));
      if (mrok) {
        if (mrok.szeptT !== undefined && mrok.szeptT !== this.slyszanyMrok.szept) { this.slyszanyMrok.szept = mrok.szeptT; this.app.muzyka.szept(); }
        if (mrok.zabranyT !== undefined && mrok.zabranyT !== this.slyszanyMrok.zabrany) { this.slyszanyMrok.zabrany = mrok.zabranyT; this.app.muzyka.zabranie(); }
      }
      if (dlon) {
        if (dlon.wstajeT !== undefined && dlon.wstajeT !== this.slyszanaDlon.wstaje) { this.slyszanaDlon.wstaje = dlon.wstajeT; this.app.muzyka.otchlan(); }
        if (dlon.chwytT !== undefined && dlon.chwytT !== this.slyszanaDlon.chwyt) { this.slyszanaDlon.chwyt = dlon.chwytT; this.app.muzyka.zabranie(); }
      }
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
      eng.fresk = ustawienia.swiat !== 'rycina';
      eng.rebuild(sim, cam, teraz);
      this.lastInk = teraz; this.dirty = false;
      this.rysKam[0] = cam.x; this.rysKam[1] = cam.y; this.rysKam[2] = cam.zoom;
    }

    const rate = (0.0007 + sim.sen * 0.0016) * (this.zamrozone() ? 0.12 : this.spowolnione() ? 0.45 : 1);
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    const breath = ruch ? 1 + Math.sin(teraz * rate) * 0.0035 : 1;
    const jx = ruch ? (Math.random() - 0.5) * 0.5 : 0;
    const jy = ruch ? (Math.random() - 0.5) * 0.5 : 0;
    // rdzeń oddycha tym samym rytmem, którym dudni skała — ciemność na brzegach
    // zaciska się i puszcza, znaki w nieznanym ledwo żarzą
    const oddech = ruch ? oddechRdzenia(sim, teraz, this.app.dzwiek.oddech(sim.sen)) : 0.5;

    // ściana krypty pod płytą: tynk przy lampce, ciemność w kątach oddycha z rdzeniem
    scianaKrypty(ctx, w, h, ruch ? teraz : 0, oddech, { x: (plate.x + plate.w / 2) / w, y: (plate.y + plate.h / 2) / h });

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
    if (eng.fresk) {
      // fresk: faktura tynku przyklejona do świata — jedzie razem ze skałą, gdy przesuwasz kamerę
      tynkSwiata(ctx, cam);
    } else {
      // rycina świata w ugrze, jak rysunek sinopią na tynku: biel kreski przechodzi w ciepły ochrowy
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = FRESK.tonRyciny;
      ctx.fillRect(0, 0, cam.vw, cam.vh);
      ctx.restore();
    }
    this.poswiata.nalozy(ctx, eng.emis, 0, 0, cam.vw, cam.vh, 0.5);
    this.znakowWidac = this.tajemnica.znaki(ctx, sim, cam, oddech, this.pauza);
    rysujRdzen(ctx, sim, cam, teraz);
    // Alpha, etap 3: skała napoczęta kilofem pęka coraz mocniej
    rysujKucie(ctx, sim, cam, teraz);
    // etap 3c: wyposażenie gotowych pomieszczeń (stół, kowadło, posłania) — w mroku ginie jak skała
    this.pokoje.rysujWnetrza(ctx, sim, cam, teraz);
    // etap 3d: ołtarz na środku sali — kamień i drewno (świece i smuga dnia — nad mrokiem)
    this.oltarz.rysuj(ctx, sim, cam);
    smugiSwiatla(ctx, sim, cam, teraz);
    drawParticles(ctx, sim, cam);
    // Remake v2: trupy leżą tam, gdzie padli; wiadra z jedzeniem zjeżdżają na linach
    rysujTrupy(ctx, sim, cam, teraz);
    rysujWiadra(ctx, sim, cam, teraz);
    // mrok: świat widać tylko w świetle lampek, obozów, rdzenia i Cudu; żar i kryształy świecą przez ciemność
    rysujMrok(ctx, sim, cam, teraz, this.pauza);
    if (MROK.wlaczony) this.poswiata.nalozy(ctx, eng.emis, 0, 0, cam.vw, cam.vh, 0.3);
    // etap 3b: rozbity kafel rudy błyska (złoto) albo sypie iskry (żelazo) — to światło, więc nad mrokiem —
    // a okruch rusza do licznika
    this.urobki.zbierz(sim, teraz);
    this.urobki.rysujNaMapie(ctx, cam, teraz);
    // etap 3c: plany, ogień paleniska, złoto w tyglu, iskry, „z z z” — nad mrokiem; podgląd szablonu pod kursorem
    this.pokoje.zbierz(sim, teraz, this.urobki);
    this.pokoje.rysujNad(ctx, sim, cam, teraz, this.pomieszczeniePodKursorem());
    // etap 3d: smuga dnia, świece, rytuał w toku (promienie, krąg znaków, krew, wskrzeszany) — nad mrokiem
    this.oltarz.zbierz(sim, teraz, this.urobki);
    this.oltarz.rysujNad(ctx, sim, cam, teraz, this.oltarzPodKursorem());
    const proba = this.probaPodKursorem();
    if (proba) this.pokoje.podglad(ctx, sim, cam, proba, teraz, this.ciagniecie ? undefined : this.szablon && !czyPokoj(this.szablon) ? `${NAZWA_POMIESZCZENIA[this.szablon]} — przeciągnij` : undefined);
    // droga pielgrzymów: którędy wierni zejdą pod rdzeń (przekopują ją sami — gracz nie drąży)
    const plan = aktualnyPlan(sim);
    if (plan && plan.kopac.length && !sim.rytual.otwarta && sim.tick - plan.tick < 3000) {
      rysujDrogePielgrzymow(ctx, sim, cam, plan, teraz, false);
    }
    rysujZarys(ctx, sim, cam, teraz);
    this.oczyscZaznaczenie();
    rysujZaznaczenie(ctx, sim, cam, teraz, this.zaznaczeni);
    rysujStworzenia(ctx, sim, cam, teraz, this.ui.selected?.id);
    rysujPrzodWiader(ctx, sim, cam, teraz);
    rysujPoleceniaNaMapie(ctx, sim, cam, teraz, this.zaznaczeni, this.falaRozkazu);
    if (this.panelDev && ustawienia.trybDeweloperski && !this.nasluch) rysujDev(ctx, sim, cam, teraz);
    rysujEfekty(ctx, sim.efekty, cam, teraz);
    if (this.etykiety) etykietyKolonii(ctx, sim, cam, teraz, this.cel);
    rysujZnacznikiLudu(ctx, sim, cam);
    rysujStraznikowWSkale(ctx, sim, cam, teraz);
    rysujPatrzacego(ctx, sim, cam, teraz);
    rysujDlon(ctx, sim, cam, teraz);
    if (this.pauza) {
      // czas stoi: świat przygasa, a na nim widać już tylko plan
      ctx.fillStyle = 'rgba(8,6,10,0.26)';
      ctx.fillRect(-cam.vw, -cam.vh, cam.vw * 3, cam.vh * 3);
      rysujRozkazy(ctx, sim, cam, this.rozkazy.lista, teraz);
    }
    if (this.cel) podswietlCel(ctx, cam, this.cel, teraz);
    ctx.restore();
    ctx.restore();
    // etap 3: fala Strażników Snu — pasek nad polem gry (między wstęgą drogi a Cudem)
    rysujPasekFali(ctx, sim, plate.x + plate.w * 0.42, plate.y + 10, plate.w * 0.46);
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
    drawFrame(ctx, plate, teraz, oddech, this.ui.pointer);
    // w samouczku cel gry dochodzi dopiero na końcu — linia kroków by tylko rozpraszała
    // na telefonie wstęga leży na dole płyty, tam gdzie baner pauzy — w pauzie ustępuje mu miejsca
    // (także gdy trzymasz ryt — dół płyty zajmuje wtedy opis narzędzia — i gdy otwarta jest karta mieszkańca)
    const banerNaDole = (plate.waski || plate.niski) && (this.pauza || this.ui.verb !== null || !!this.ui.selected);
    this.drogaRect = !this.nasluch && !sim.ending && !banerNaDole ? rysujDrogeDoWolnosci(ctx, plate, sim, teraz) : null;
    if (ustawienia.skalaGlebokosci && !plate.waski && !plate.niski) rysujMinimape(ctx, sim, cam, plate, teraz);
    this.polaDruzyny = rysujDruzyne(ctx, sim, plate, h, this.zaznaczeni, this.ui.pointer, teraz, this.szablon);
    drawOddanie(ctx, plate, sim, h);
    drawCrack(ctx, plate, sim, w, h, teraz);
    if (ustawienia.kronika) drawChronicle(ctx, plate, sim, w, h);
    this.ui.draw(ctx, sim, teraz);
    this.przyciski = rozmiescPrzyciski(plate, h, {
      pauza: this.pauza, zapiski: this.zapiski, legenda: this.legenda, noweTablice: odkrycia.niezobaczone,
      tempo: this.tempoTeraz(), dev: ustawienia.trybDeweloperski,
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
    // etap 3d: okno ołtarza (karta wydarzenia ma pierwszeństwo — okno czeka pod nią)
    if (sim.ending) this.oknoOltarza = false;
    this.polaOltarza = this.oknoOltarza && !wyd && !this.zapiski
      ? rysujOknoOltarza(ctx, plate, sim, teraz, this.ui.pointer, { x: plate.x + this.cam.toScreenX(sim.world.oltarz.x + 0.5), pol: this.cam.zoom * 2.6 }) : [];
    this.znakMenu(ctx, teraz);
    if (this.liczby || ustawienia.trybDeweloperski) {
      ctx.save();
      ctx.font = `${Math.max(14, w / 74)}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(236,222,190,0.95)';
      const sek = Math.floor(sim.tick / TEMPO.tikowNaSekunde);
      const linie = [
        `wiara ${Math.round(sim.wiara)}`,
        `krew ${Math.round(sim.krew)}`,
        `oddanie ${Math.round((najwierniejsza(sim)?.devotion ?? 0) * 100)}%`,
        `żywych ${sim.creatures.reduce((n, c) => n + (c.dead ? 0 : 1), 0)}`,
        `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')} · tik ${sim.tick}${this.tempoTeraz() !== 1 ? ` · ×${mnoznikNapis(this.tempoTeraz())}` : ''}`,
      ];
      // na dole płyty po prawej — u góry stoją dziennik dewelopera i podpis Cudu
      linie.forEach((l, i) => ctx.fillText(l, plate.x + plate.w - 12, plate.y + plate.h - 14 - (linie.length - 1 - i) * 20));
      ctx.restore();
    }
    // okruchy rudy lecą nad wszystkim, aż do liczników nad płytą
    this.urobki.rysujLoty(ctx, plate, cam, teraz);
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

  /** Gdzie leży pole na pasku drużyny (np. „wyznacz pomieszczenie”, medalion roli) — samouczek je wskazuje. */
  miejscePolaDruzyny(akcja: PoleDruzyny['akcja'], rola?: Rola): PoleDruzyny | null {
    return this.polaDruzyny.find((p) => p.akcja === akcja && (!rola || p.rola === rola)) ?? null;
  }

  /** Etap 3d: ilu zaznaczonych ma tę rolę (samouczek ołtarza). */
  zaznaczeniRoli(rola: Rola): number {
    return this.zaznaczeniZywi().filter((c) => rolaPostaci(c) === rola).length;
  }

  /** Etap 3d: gdzie w otwartym oknie ołtarza leży pole rytuału — samouczek je wskazuje (albo null, gdy okno zamknięte). */
  poleOltarza(rodzaj: string): PoleOltarza | null {
    return this.polaOltarza.find((p) => p.akcja === 'rytual' && p.rodzaj === rodzaj) ?? null;
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

  /** Zaznaczenie bez zmarłych (i bez tych, którzy przestali być ludem). */
  private oczyscZaznaczenie(): void {
    for (const id of this.zaznaczeni) {
      const c = this.sim.creatureById(id);
      if (!c || c.dead || !rolaPostaci(c)) this.zaznaczeni.delete(id);
    }
  }

  private zaznaczeniZywi(): Creature[] {
    this.oczyscZaznaczenie();
    return [...this.zaznaczeni].map((id) => this.sim.creatureById(id)).filter((c): c is Creature => !!c);
  }

  /** Zaznacza postacie (z Shiftem dokłada albo zdejmuje jedną); ryt w ręku i karta mieszkańca się odkładają. */
  private zaznacz(ids: number[], dokladaj = false): void {
    const ui = this.ui;
    if (!dokladaj) this.zaznaczeni.clear();
    for (const id of ids) {
      if (dokladaj && ids.length === 1 && this.zaznaczeni.has(id)) this.zaznaczeni.delete(id);
      else this.zaznaczeni.add(id);
    }
    ui.verb = null; ui.tool = null; ui.selected = null;
    this.app.gesty.klik();
    this.nasluch?.({ typ: 'zaznaczono', ile: this.zaznaczeni.size });
    this.dirty = true;
  }

  private odznacz(): void { this.zaznaczeni.clear(); this.dirty = true; }

  private poleDruzynyPod(x: number, y: number): PoleDruzyny | null {
    return this.polaDruzyny.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) ?? null;
  }

  /** Dotknięcie medalionu albo rozkazu na pasku drużyny. */
  private akcjaDruzyny(p: PoleDruzyny, dokladaj: boolean): void {
    if (p.akcja === 'rola' && p.rola) this.zaznaczRole(p.rola, dokladaj);
    else if (p.akcja === 'droga') this.kopDroge();
    else if (p.akcja === 'odwolaj') this.odwolajRozkazy();
    else if (p.akcja === 'pomieszczenia') this.przelaczSzablon(!!this.szablon);
    else if (p.akcja === 'szablon' && p.szablon) this.ustawSzablon(p.szablon);
    else if (p.akcja === 'koniecSzablonu') this.ustawSzablon(null);
    else this.odznacz();
    this.dirty = true;
  }

  /**
   * Medalion roli zaznacza wszystkich z tej roli; drugie dotknięcie, gdy już są zaznaczeni, wiezie
   * do nich kamerę (drużyna bywa rozrzucona po całej górze).
   */
  private zaznaczRole(rola: Rola, dokladaj = false): void {
    const { sim, ui } = this;
    const lud = ludRoli(sim, rola);
    if (!lud.length) { ui.say(`Nie żyje już nikt — ${NAZWA_ROLI_MNOGA[rola]}.`, sim.tick); this.app.gesty.odmowa(); return; }
    if (!dokladaj && this.zaznaczeni.size === lud.length && lud.every((c) => this.zaznaczeni.has(c.id))) {
      const x = lud.reduce((s, c) => s + c.x, 0) / lud.length, y = lud.reduce((s, c) => s + c.y, 0) / lud.length;
      this.pokazMiejsce(x, y, Math.max(this.cam.zoom, KAMERA.pokazZoom));
      return;
    }
    this.zaznacz(lud.map((c) => c.id), dokladaj);
    ui.say(lud.length === 1 ? `${NAZWA_ROLI[rola]} — dotknij mapy, dokąd ma iść.` : `${NAZWA_ROLI_MNOGA[rola]} (${lud.length}) — dotknij mapy, dokąd mają iść.`, sim.tick);
  }

  /** „Kop drogę wiernych” dla zaznaczonych robotników. */
  private kopDroge(): void {
    const { sim, ui } = this;
    const robotnicy = this.zaznaczeniZywi().filter((c) => rolaPostaci(c) === 'robotnik');
    if (!robotnicy.length) { ui.say('Kopią tylko robotnicy — zaznacz robotnika.', sim.tick); this.app.gesty.odmowa(); return; }
    const { przyjeli, odmowy } = drogaGrupie(sim, robotnicy.map((c) => c.id));
    if (przyjeli) { ui.say(przyjeli === 1 ? 'Idzie kopać drogę wiernych.' : `Idą kopać drogę wiernych (${przyjeli}).`, sim.tick); this.app.gesty.klik(); }
    else { ui.say(odmowy[0] ?? 'Nie.', sim.tick); this.app.gesty.odmowa(); }
    this.nasluch?.({ typ: 'polecenie', rodzaj: 'droga', przyjeli });
  }

  private odwolajRozkazy(): void {
    const { sim, ui } = this;
    let ile = 0;
    for (const c of this.zaznaczeniZywi()) if (c.polecenie) { odwolajPolecenie(sim, c); ile++; }
    ui.say(ile ? 'Rozkaz odwołany — wracają do swoich zajęć.' : 'Nie mieli rozkazu.', sim.tick);
    this.nasluch?.({ typ: 'polecenie', rodzaj: 'odwolaj', przyjeli: ile });
  }

  // ------------------------------------------------------------- pomieszczenia (Alpha, etap 3c)

  /** Planowanie: włącza (ostatni szablon) albo, gdy już planujesz, bierze następny szablon; `wylacz` — kończy. */
  private przelaczSzablon(wylacz = false): void {
    if (wylacz) { this.ustawSzablon(null); return; }
    if (!this.szablon) { this.ustawSzablon(this.ostatniSzablon); return; }
    this.ustawSzablon(SZABLONY[(SZABLONY.indexOf(this.szablon) + 1) % SZABLONY.length]);
  }

  /** Planowanie z tym szablonem (null — koniec). Samouczek też tu sięga. */
  ustawSzablon(s: RodzajPomieszczenia | null): void {
    const { ui, sim } = this;
    this.szablon = s; this.ciagniecie = null;
    if (s) {
      this.ostatniSzablon = s;
      ui.verb = null; ui.tool = null; ui.selected = null;     // ryt w ręku i karta odkładają się na czas planowania
      ui.say(`Plan: ${NAZWA_POMIESZCZENIA[s]} — ${czyPokoj(s) ? 'dotknij skały, gdzie ma stanąć' : 'przeciągnij od miejsca, gdzie stoi lud'}. B — następny, Esc — koniec.`, sim.tick);
      this.nasluch?.({ typ: 'planowanie', rodzaj: s });
    }
    this.dirty = true;
  }

  /** Kafel pod kursorem (albo null, gdy kursor jest poza płytą). */
  private kafelPodKursorem(): [number, number] | null {
    const p = this.ui.pointer;
    if (!this.naPlycie(p.x, p.y)) return null;
    const [x, y] = this.swiatPod(p.x, p.y);
    return this.sim.world.inb(x, y) ? [x, y] : null;
  }

  /** Planujesz: jak wyglądałby plan pod kursorem (korytarz i szyb — od kafla, od którego ciągniesz). */
  private probaPodKursorem(): ProbaPlanu | null {
    if (!this.szablon || this.sim.ending) return null;
    const k = this.kafelPodKursorem();
    if (!k) return null;
    if (czyPokoj(this.szablon)) return probaPlanu(this.sim, this.szablon, k[0], k[1]);
    const s = this.ciagniecie;
    return s ? probaPlanu(this.sim, this.szablon, s.x, s.y, k[0], k[1]) : probaPlanu(this.sim, this.szablon, k[0], k[1], k[0] + 1, k[1] + 1);
  }

  /** Pomieszczenie (albo plan) pod kursorem i co zrobią zaznaczeni, gdy go dotkniesz. */
  private pomieszczeniePodKursorem(): PodKursorem | null {
    if (this.szablon || this.ui.verb || this.sim.ending) return null;
    const k = this.kafelPodKursorem();
    const pom = k ? pomieszczenieW(this.sim, k[0], k[1]) : null;
    if (!pom) return null;
    const lud = this.zaznaczeniZywi();
    if (!lud.length) return { pom, akcja: pom.gotowe ? `${NAZWA_POMIESZCZENIA[pom.rodzaj]} — zaznacz kogoś i wskaż` : 'plan — zaznacz robotników i wskaż go', ok: true };
    const rob = lud.filter((c) => rolaPostaci(c) === 'robotnik').length;
    const { akcja, ok } = akcjaNaPomieszczeniu(pom, rob, lud.length - rob);
    return { pom, akcja, ok };
  }

  /** Etap 3d: podpis nad ołtarzem pod kursorem — co się stanie po dotknięciu (albo null). */
  private oltarzPodKursorem(): string | null {
    if (this.szablon || this.ui.verb || this.sim.ending || this.oknoOltarza) return null;
    const p = this.ui.pointer;
    if (!this.naPlycie(p.x, p.y) || !oltarzPod(this.sim, this.cam, p.x - this.plate.x, p.y - this.plate.y)) return null;
    return this.zaznaczeniZywi().length ? 'ołtarz — zaznaczeni pójdą do niego' : 'ołtarz — dotknij: rytuały';
  }

  /** Etap 3d: wybór w oknie ołtarza — rytuał, przywołanie pobożnego albo zamknięcie. */
  private wybierzWOknieOltarza(b: PoleOltarza): void {
    const { ui, sim } = this;
    if (b.akcja === 'zamknij') { this.oknoOltarza = false; return; }
    if (b.akcja === 'tlo') return;
    if (b.akcja === 'przywolaj') {
      const powod = przywolajDoOltarza(sim);
      if (powod) { ui.say(`Nikt nie przyjdzie: ${powod}.`, sim.tick); this.app.gesty.odmowa(); }
      else { ui.say('Pobożny idzie do ołtarza.', sim.tick); this.app.gesty.klik(); }
      return;
    }
    if (!b.rodzaj) return;
    const powod = odprawRytual(sim, b.rodzaj, b.cel);
    if (powod) { ui.say(`${NAZWA_RYTUALU[b.rodzaj]} — teraz nie: ${powod}.`, sim.tick); this.app.gesty.odmowa(); return; }
    ui.say(`${NAZWA_RYTUALU[b.rodzaj]} — pobożny klęka przy ołtarzu.`, sim.tick);
    this.app.gesty.klik();
    this.oknoOltarza = false;
    this.nasluch?.({ typ: 'oltarz', rodzaj: b.rodzaj });
  }

  /** Kładzie plan z próby (albo mówi, czemu tu nie wolno). */
  private polozPlanZProby(p: ProbaPlanu | null): void {
    const { ui, sim } = this;
    this.ciagniecie = null;
    if (!p) return;
    if (!p.ok) { ui.say(`Tu nie: ${p.powod}.`, sim.tick); this.app.gesty.odmowa(); return; }
    polozPlan(sim, p);
    this.falaRozkazu = { x: p.x + p.w / 2, y: p.y + p.h, t: performance.now(), ok: true };
    ui.say(`Wyznaczyłeś ${BIERNIK_POMIESZCZENIA[p.rodzaj]}. Zaznacz robotników i dotknij planu — wykują go.`, sim.tick);
    this.app.gesty.klik();
    this.nasluch?.({ typ: 'plan', rodzaj: p.rodzaj });
    this.dirty = true;
  }

  /**
   * Dotknięcie mapy bez rytu w ręku: postać z ludu pod palcem — zaznacza ją; inne miejsce, gdy ktoś jest
   * zaznaczony — rozkaz „idź tam” (robotnikowi wskazana skała to „kop tam”).
   */
  private klikNaMapie(sx: number, sy: number, dokladaj: boolean): void {
    const { sim, ui } = this;
    const fx = this.cam.toWorldX(sx - this.plate.x), fy = this.cam.toWorldY(sy - this.plate.y);
    // postać pod palcem: sylwetka stoi na c.y + 1 i sięga ok. półtora kafla w górę
    const tol = Math.max(0.9, 16 / this.cam.zoom);
    let kto: Creature | null = null, bd = Infinity;
    for (const c of sim.creatures) {
      if (c.dead || !rolaPostaci(c)) continue;
      const dx = Math.abs(c.x - fx), dy = fy - (c.y + 0.25);
      if (dx > tol || dy < -1.2 - tol * 0.3 || dy > 0.75 + tol * 0.3) continue;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; kto = c; }
    }
    if (kto) {
      this.zaznacz([kto.id], dokladaj);
      ui.say(`${NAZWA_ROLI[rolaPostaci(kto)!]}: ${kto.zamiar ?? 'czeka'}. Dotknij mapy, dokąd ma iść.`, sim.tick);
      return;
    }
    const ids = this.zaznaczeniZywi().map((c) => c.id);
    // etap 3d: ołtarz pod palcem — otwiera okno rytuałów; zaznaczeni idą do niego i tam zostają
    if (oltarzPod(sim, this.cam, sx - this.plate.x, sy - this.plate.y)) {
      if (ids.length) {
        const { przyjeli, odmowy } = wydajDoOltarza(sim, ids);
        const o = sim.world.oltarz;
        this.falaRozkazu = { x: o.x + 0.5, y: o.y, t: performance.now(), ok: przyjeli > 0 };
        if (!przyjeli) { ui.say(odmowy[0] ?? 'Nie.', sim.tick); this.app.gesty.odmowa(); }
        else { ui.say(przyjeli === 1 ? 'Idzie do ołtarza.' : `Idą do ołtarza: ${przyjeli}.`, sim.tick); this.app.gesty.klik(); }
        this.nasluch?.({ typ: 'polecenie', rodzaj: 'oltarz', przyjeli });
      }
      this.oknoOltarza = true;
      this.nasluch?.({ typ: 'oltarz', rodzaj: 'okno' });
      this.dirty = true;
      return;
    }
    // etap 3c: plan albo pomieszczenie pod palcem — robotnicy kują plan, pracują w warsztacie i kuźni, każdy śpi w sypialni
    const pom = pomieszczenieW(sim, Math.floor(fx), Math.floor(fy));
    if (pom && !ids.length) { ui.say(pom.gotowe ? `${NAZWA_POMIESZCZENIA[pom.rodzaj]} — zaznacz kogoś i wskaż.` : 'Plan — zaznacz robotników i wskaż go, a wykują.', sim.tick); return; }
    if (!ids.length) return;
    const { przyjeli, odmowy } = pom ? wydajNaPomieszczenie(sim, ids, pom) : wydajGrupie(sim, ids, Math.floor(fx), Math.floor(fy));
    this.falaRozkazu = { x: fx, y: fy, t: performance.now(), ok: przyjeli > 0 };
    if (!przyjeli) { ui.say(odmowy[0] ?? 'Nie.', sim.tick); this.app.gesty.odmowa(); }
    else {
      ui.say((przyjeli === 1 ? 'Idzie.' : `Idą: ${przyjeli}.`) + (odmowy.length ? ` Odmawia: ${odmowy.length}.` : ''), sim.tick);
      this.app.gesty.klik();
    }
    this.nasluch?.({ typ: 'polecenie', rodzaj: pom ? 'pomieszczenie' : 'idz', przyjeli });
    this.dirty = true;
  }

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
    if (ui.verb === 'zasiej' && REMAKE) {
      // Remake v2: Nakarm — jedno wiadro na dotknięcie; powód odmowy mówi, co nie tak
      const odmowa = nakarm(sim, wx, wy);
      udane = odmowa === null;
      if (odmowa) { ui.say(odmowa, sim.tick); this.app.gesty.odmowa(); this.dirty = true; return; }
    } else if (ui.verb === 'zasiej') udane = seed(sim, ui.tool, wx, wy);
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
      if (b) {
        // „pokaż miejsce”: kamera jedzie tam na prośbę — miejsce ląduje pod kartą
        if (b.pokaz) { const c = this.celKarty ?? this.sim.wydarzenia.biezace?.cel; if (c) this.pokazPodKarta(c, 0.25); }
        else this.wybierzWydarzenie(b.i);
        return;
      }
      if (this.dotknijStrzalki(e.clientX, e.clientY)) return;
      const wybory = this.polaWydarzenia.filter((q) => !q.pokaz);
      const g = wybory[0], d = wybory[wybory.length - 1];
      if (e.clientX >= g.x - 20 && e.clientX <= g.x + g.w + 20 && e.clientY >= this.plate.y && e.clientY <= d.y + d.h + 30) return;
    }
    if (faza === 'dol' && !this.zapiski && this.polaOltarza.length) {
      // okno ołtarza: dotknięcie rytuału go odprawia (okno się zamyka — widać animację); poza oknem — zamyka je
      const pola = this.polaOltarza;
      const b = [...pola].reverse().find((q) => e.clientX >= q.x && e.clientX <= q.x + q.w && e.clientY >= q.y && e.clientY <= q.y + q.h);
      if (b) this.wybierzWOknieOltarza(b);
      else this.oknoOltarza = false;
      this.dirty = true;
      return;
    }
    if (faza === 'dol' && !this.zapiski) {
      // karta sytuacji: planuj (zostaje pauza), puść czas, nie zatrzymuj przy tym
      for (const b of this.polaAlarmu) {
        if (Math.abs(e.clientX - b.x) > b.w / 2 || Math.abs(e.clientY - b.y) > Math.max(b.h / 2, POLE_PALCA / 2)) continue;
        if (b.akcja === 'pusc') this.ustawPauze(false);
        else if (b.akcja === 'pokaz') { if (this.alarm?.cel) this.pokazPodKarta(this.alarm.cel, 0.2); }
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
      // strzałka przy krawędzi (cel poza kadrem): dotknięcie wiezie tam kamerę
      if (e.button !== 2 && this.dotknijStrzalki(e.clientX, e.clientY)) return;
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
      // pasek drużyny pod płytą: medaliony ról i rozkazy dla zaznaczonych
      const pd = e.button !== 2 && !sim.ending ? this.poleDruzynyPod(e.clientX, e.clientY) : null;
      if (pd) { this.akcjaDruzyny(pd, e.shiftKey); return; }
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
      if (this.pointers.size > 1) { this.painting = false; this.ciagniecie = null; return; }
      if (sim.ending) return;
      // etap 3c: planujesz — palec na mapie kładzie plan zamiast przesuwać kamerę
      if (this.szablon && e.button !== 2 && this.naPlycie(e.clientX, e.clientY)) {
        const wpisP = this.pointers.get(e.pointerId)!;
        wpisP.plan = true;
        if (!czyPokoj(this.szablon)) {
          const [wx, wy] = this.swiatPod(e.clientX, e.clientY);
          this.ciagniecie = { x: wx, y: wy };
        }
        return;
      }
      const przedWyborem = ui.verb;
      const wybranaMysl = ui.selected;
      if (this.legenda) { this.legenda = false; return; }
      const wpis = this.pointers.get(e.pointerId);
      if (ui.tap(sim, e.clientX, e.clientY)) {
        if (wpis) wpis.interfejs = true;               // karta i ryty nie są światem
        if (ui.verb !== przedWyborem) this.nasluch?.({ typ: 'wybranoCzasownik', czasownik: ui.verb });
        // ryt w ręku zamiast rozkazów — zaznaczenie się odkłada
        if (ui.verb && ui.verb !== przedWyborem) this.zaznaczeni.clear();
        // tylko naprawdę szepnięta myśl — zamknięcie karty kliknięciem w ryt to nie szept
        if (wybranaMysl && ui.ostatniaMysl) this.nasluch?.({ typ: 'szept', narzedzie: ui.ostatniaMysl });
        ui.ostatniaMysl = null;
        return;
      }
      if (ui.selected) { ui.selected = null; if (wpis) wpis.interfejs = true; return; }
      if (!this.naPlycie(e.clientX, e.clientY)) return;
      if (ui.verb === 'zasiej' && e.button !== 2) {
        this.painting = !REMAKE;      // Remake v2: Nakarm to jedno wiadro, nie malowanie
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
      // planujesz: ciągnięcie wyznacza korytarz albo szyb — kamera stoi
      if (p.plan) { this.dirty = true; return; }
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
    // etap 3c: planujesz — puszczenie kładzie plan (pokój pod palcem, korytarz i szyb od miejsca, gdzie zacząłeś)
    if (p.plan) { this.polozPlanZProby(this.probaPodKursorem()); return; }
    if (this.szablon && p.przycisk === 2 && !p.moved && this.naPlycie(p.sx, p.sy)) {
      // prawy przycisk na planie skreśla go; gdzie indziej — kończy planowanie
      const [wx, wy] = this.swiatPod(p.sx, p.sy);
      const pom = pomieszczenieW(sim, wx, wy);
      if (pom && !pom.gotowe) { skreslPlan(sim, pom); ui.say('Plan skreślony.', sim.tick); this.dirty = true; }
      else this.ustawSzablon(null);
      return;
    }
    // w pauzie dotknięcie szkicu bez rytu w ręku (albo prawy przycisk) go skreśla
    if (!p.moved && this.pauza && this.rozkazy.ile && this.naPlycie(p.sx, p.sy) && (!ui.verb || p.przycisk === 2)) {
      const wx = this.cam.toWorldX(p.sx - this.plate.x), wy = this.cam.toWorldY(p.sy - this.plate.y);
      const o = this.rozkazy.pod(sim, wx, wy);
      if (o) { this.rozkazy.skresl(sim, o); ui.say('Skreślone. Koszt wrócił.', sim.tick); this.dirty = true; return; }
    }
    if (!p.moved && p.przycisk !== 2 && !sim.ending && ui.verb && ui.verb !== 'zasiej' && this.naPlycie(p.sx, p.sy)) this.uzyj(p.sx, p.sy);
    // Alpha: bez rytu w ręku dotknięcie mapy zaznacza postać albo wydaje zaznaczonym rozkaz; prawy przycisk odznacza
    else if (!p.moved && !sim.ending && !ui.verb && this.naPlycie(p.sx, p.sy)) {
      if (p.przycisk !== 2) this.klikNaMapie(p.sx, p.sy, e.shiftKey);
      else if (this.zaznaczeni.size) { this.odznacz(); ui.say('Odznaczone.', sim.tick); }
    }
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
        if (this.oknoOltarza) { this.oknoOltarza = false; break; }
        if (ui.selected) { ui.selected = null; break; }
        if (this.alarm) { this.alarm = null; break; }
        if (ui.verb) { ui.verb = null; ui.tool = null; break; }
        if (this.szablon) { this.ustawSzablon(null); break; }
        if (this.zaznaczeni.size) { this.odznacz(); break; }
        this.app.idz('menu');
        break;
      case 'robotnicy': this.zaznaczRole('robotnik'); break;
      case 'pobozni': this.zaznaczRole('pobozny'); break;
      case 'rycerz': this.zaznaczRole('rycerz'); break;
      case 'kopDroge': this.kopDroge(); break;
      case 'odwolaj': this.odwolajRozkazy(); break;
      case 'planuj': if (!sim.ending) this.przelaczSzablon(); break;
      case 'pauza': this.ustawPauze(!this.pauza); break;
      // tempo czasu tylko w trybie deweloperskim — w grze czas jest jeden
      case 'szybciej': if (ustawienia.trybDeweloperski) this.zmienTempo(1); break;
      case 'wolniej': if (ustawienia.trybDeweloperski) this.zmienTempo(-1); break;
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
    if (ui.verb) this.zaznaczeni.clear();
    this.nasluch?.({ typ: 'wybranoCzasownik', czasownik: ui.verb });
  }

  private wybierzNarzedzie(i: number): void {
    const ui = this.ui;
    if (!ui.verb) return;
    const lista = TOOLS[ui.verb];
    if (i < lista.length) ui.tool = lista[i].id;
  }
}
