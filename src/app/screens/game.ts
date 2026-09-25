import { Sim } from '../../sim/sim';
import { Camera } from '../../render/camera';
import { Engraver } from '../../render/engrave';
import { drawParticles } from '../../render/overlay';
import { rysujStworzenia } from '../../render/figury';
import { rysujEfekty } from '../../render/efekty';
import { rysujLegende } from '../../render/legenda';
import { rysujZapiski, type TrafienieZapisku } from '../../render/zapiski';
import { rysujTempo } from '../../render/tempo';
import { rozmiescPrzyciski, rysujPrzyciski, przyciskPod, type Przycisk } from '../../render/przyciski';
import { rysujMinimape, miejsceZMinimapy } from '../../render/minimapa';
import { rysujZarys } from '../../render/zarys';
import { Poswiata } from '../../render/bloom';
import { smugiSwiatla } from '../../render/shafts';
import { etykietyKolonii, podswietlCel, type Cel } from '../../render/znaczniki';
import { podpowiedz, type Podpowiedz } from '../../sim/podpowiedzi';
import { computePlate, drawFrame, drawCensus, drawCrack, drawSmoke, drawEyelid, drawChronicle, drawOtchlan, type Plate } from '../../render/plate';
import { Ui } from '../../ui/ui';
import { shape, seed, sign, TOOLS } from '../../powers/powers';
import { saveToStorage, loadFromStorage } from '../../core/save';
import { ustawienia, ustaw } from '../../core/settings-store';
import type { Akcja } from '../../core/keybinds';
import type { Ekran } from '../screen';
import type { Kontekst } from '../context';

/** Łamie zdanie na co najwyżej `ile` linii; ostatnia dostaje wielokropek, gdy nie starczy. */
function lamiTekst(ctx: CanvasRenderingContext2D, tekst: string, maxW: number, ile: number): string[] {
  if (ctx.measureText(tekst).width <= maxW) return [tekst];
  const slowa = tekst.split(' ');
  const linie: string[] = [];
  let biezaca = '';
  for (const s of slowa) {
    const proba = biezaca ? `${biezaca} ${s}` : s;
    if (ctx.measureText(proba).width > maxW && biezaca) {
      linie.push(biezaca);
      biezaca = s;
      if (linie.length === ile - 1) break;
    } else biezaca = proba;
  }
  const reszta = biezaca + (linie.length === ile - 1
    ? ' ' + slowa.slice(slowa.indexOf(biezaca.split(' ')[0]) + biezaca.split(' ').length).join(' ')
    : '');
  let ostatnia = reszta.trim();
  while (ctx.measureText(ostatnia + '…').width > maxW && ostatnia.length > 8) ostatnia = ostatnia.slice(0, -2);
  linie.push(ostatnia === reszta.trim() ? ostatnia : ostatnia + '…');
  return linie;
}

export type ZdarzenieGry =
  | { typ: 'moc'; czasownik: string; narzedzie: string }
  | { typ: 'szept'; narzedzie: string }
  | { typ: 'wybranoCzasownik'; czasownik: string | null }
  | { typ: 'kamera' }
  | { typ: 'koniec'; opis: string };

/** Ekran rozgrywki: świat, płyta, organy i ryty. Samouczek nakłada się na niego z góry. */
export class EkranGry implements Ekran {
  nazwa = 'gra';
  sim = new Sim((Math.random() * 1e9) | 0);
  cam = new Camera(1, 1);
  eng = new Engraver();
  private poswiata = new Poswiata();
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

  private camTarget = { x: 0, y: 0 };
  private dirty = true;
  private lastInk = 0;
  private lastSave = 0;
  private lastSound = 0;
  private reszta = 0;
  private rada: Podpowiedz | null = null;
  private radaOd = -1e9;
  /** Pauza żyje tylko w tej sesji — zapisana potrafiła uruchomić grę w bezruchu. */
  pauza = false;
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
  private recznaOd = 0;
  private ostatnieKlikniecie: { x: number; y: number } | null = null;
  private indeksWTlumie = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; moved: boolean; interfejs: boolean; przycisk: number }>();
  private pinch = 0;
  private srodekPinch: { x: number; y: number } | null = null;
  private painting = false;
  /** Kafle już opłacone w tym pociągnięciu — ruch myszy nie może kasować krwi co klatkę. */
  private malowane = new Set<number>();
  private kosztPociagniecia = { krew: 0, wiara: 0, otchlan: 0 };

  constructor(private app: Kontekst) {}

  // ------------------------------------------------------------------ życie ekranu

  wejdz(dane?: unknown): void {
    this.pauza = false;
    if (ustawienia.tempo < 1) ustaw('tempo', 1);
    const tryb = (dane as { tryb?: string } | undefined)?.tryb;
    if (tryb === 'nowa') this.nowaGra();
    else if (tryb === 'wczytaj') {
      const s = loadFromStorage();
      if (s) { this.sim = s; this.doSerca(true); }
    }
    this.app.muzyka.ustawScene(tryb === 'samouczek' ? 'samouczek' : 'gra');
    this.rozmiar(this.app.w, this.app.h);
  }

  nowaGra(ziarno = (Math.random() * 1e9) | 0): void {
    this.sim = new Sim(ziarno);
    this.ui.verb = null; this.ui.tool = null; this.ui.selected = null;
    this.cam.zoom = 14;
    this.doSerca(true);
    this.dirty = true;
  }

  /** Dowozi kamerę w konkretne miejsce — samouczek pokazuje nim, o czym mówi. */
  /** Wraca do najgęstszego skupiska i oddaje kamerę automatowi. */
  doMieszkancow(): void {
    const serce = this.sim.heartOfLife();
    this.recznaKamera = false;
    if (!serce) { this.ui.say('Nie ma już do kogo wracać.', this.sim.tick); return; }
    this.cam.x = this.camTarget.x = serce.x;
    this.cam.y = this.camTarget.y = serce.y;
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(16, Math.min(this.cam.vw / (serce.w + 26), this.cam.vh / (serce.h + 18))));
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.ui.say('Wracasz do swoich.', this.sim.tick);
    this.dirty = true;
  }

  pokazMiejsce(x: number, y: number, zoom?: number): void {
    if (zoom) this.cam.zoom = Math.max(this.cam.minZoom, zoom);
    // cel ląduje po lewej stronie płyty, bo po prawej stoi karta samouczka
    const odsuniecie = this.plate.waski ? 0 : -(this.plate.w * 0.17) / this.cam.zoom;
    this.cam.x = this.camTarget.x = x + odsuniecie;
    this.cam.y = this.camTarget.y = y + (this.plate.waski ? this.plate.h * 0.12 / this.cam.zoom : 0);
    this.przejmijKamere();
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.dirty = true;
  }

  /** Gracz chwyta kamerę: automat milczy, ale tylko przez chwilę (patrz krok()). */
  przejmijKamere(): void {
    this.recznaKamera = true;
    this.recznaOd = performance.now();
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
    this.cam.minZoom = Math.max(3, this.plate.w / this.sim.world.w);
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
    return this.pauza || this.zapiski || !!this.sim.ending || this.ui.selected !== null;
  }

  /**
   * Trzymany czasownik albo otwarta karta zwalniają świat do ćwierci tempa.
   * Pełne zatrzymanie sprawiało, że gra wyglądała na martwą.
   */
  spowolnione(): boolean {
    return this.ui.verb !== null;
  }

  // ---------------------------------------------------------------------- krok

  krok(_dt: number, teraz: number): void {
    if (!this.zamrozone()) {
      let kroki = Math.max(1, Math.round(ustawienia.tempo * this.tempoMnoznik));
      if (this.spowolnione()) {
        this.reszta += kroki * 0.25;
        kroki = Math.floor(this.reszta);
        this.reszta -= kroki;
      }
      for (let i = 0; i < kroki; i++) this.sim.step();
      this.dirty = true;
      if (this.recznaKamera && performance.now() - this.recznaOd > 20000) {
        this.recznaKamera = false;                     // oddajemy kamerę światu, zamiast blokować ją na zawsze
      }
      // kiedy gracz trzyma czasownik albo maluje, kamera musi stać: inaczej tunel
      // ucieka spod kursora i drąży się w zupełnie innym miejscu
      const wRobocie = this.painting || this.ui.verb !== null || this.pointers.size > 0;
      if (wRobocie) this.recznaOd = performance.now();
      if (ustawienia.kameraZaZyciem && !this.recznaKamera && !wRobocie && this.sim.tick % 4 === 0) {
        const serce = this.sim.heartOfLife();
        if (serce) {
          this.camTarget.x += (serce.x - this.camTarget.x) * 0.05;
          this.camTarget.y += (serce.y - this.camTarget.y) * 0.05;
          this.cam.drift(this.camTarget.x, this.camTarget.y, 0.05);
          if (ustawienia.autoZoom) {
            const fit = Math.min(this.cam.vw / (serce.w + 26), this.cam.vh / (serce.h + 18));
            this.cam.zoom += (Math.max(this.cam.minZoom, Math.min(20, fit)) - this.cam.zoom) * 0.04;
          }
          this.cam.clamp(this.sim.world.w, this.sim.world.h);
        }
      }
      if (this.sim.senDzwon) { this.sim.senDzwon = false; this.app.dzwiek.toll(); }
      if (this.sim.ending) {
        this.nasluch?.({ typ: 'koniec', opis: this.sim.ending });
        if (!this.nasluch) this.app.idz('kronika', { sim: this.sim });
      }
    }

    if (this.zapisujAuto && ustawienia.autozapis && !this.sim.ending && !this.zamrozone() && teraz - this.lastSave > 60000) {
      this.lastSave = teraz;
      saveToStorage(this.sim);
    }

    // podpowiedź odświeżana rzadko, żeby nie migotała
    // Podpowiedź trzyma się co najmniej 25 sekund; zmienia się wcześniej tylko wtedy,
    // gdy pojawi się wyraźnie pilniejsza sprawa. Wcześniej skakała co kilka sekund.
    if (!this.nasluch && teraz - this.radaOd > 2500) {
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
      );
      this.app.muzyka.ustawNapiecie(Math.max(this.sim.sen, Math.max(0, this.sim.dominance - 0.55) * 2));
    }
  }

  // --------------------------------------------------------------------- obraz

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const { plate, cam, eng, sim } = this;
    if (this.dirty || teraz - this.lastInk > 150) { eng.rebuild(sim, cam, teraz); this.lastInk = teraz; this.dirty = false; }

    ctx.fillStyle = '#0b0807';
    ctx.fillRect(0, 0, w, h);

    const rate = (0.0007 + sim.sen * 0.0016) * (this.zamrozone() ? 0.12 : this.spowolnione() ? 0.45 : 1);
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    const breath = ruch ? 1 + Math.sin(teraz * rate) * 0.0035 : 1;
    const jx = ruch ? (Math.random() - 0.5) * 0.5 : 0;
    const jy = ruch ? (Math.random() - 0.5) * 0.5 : 0;

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
    this.poswiata.nalozy(ctx, eng.emis, 0, 0, cam.vw, cam.vh, 0.5);
    smugiSwiatla(ctx, sim, cam, teraz);
    drawParticles(ctx, sim, cam);
    rysujZarys(ctx, sim, cam, teraz);
    rysujStworzenia(ctx, sim, cam, teraz, this.ui.selected?.id);
    rysujEfekty(ctx, sim.efekty, cam, teraz);
    if (this.etykiety) etykietyKolonii(ctx, sim, cam, teraz, this.cel);
    if (this.cel) podswietlCel(ctx, cam, this.cel, teraz);
    ctx.restore();
    ctx.restore();

    // delikatna winieta płyty — rysunek ma brzeg, nie ekran
    const wg = ctx.createRadialGradient(plate.x + plate.w / 2, plate.y + plate.h / 2, Math.min(plate.w, plate.h) * 0.38,
      plate.x + plate.w / 2, plate.y + plate.h / 2, Math.max(plate.w, plate.h) * 0.72);
    wg.addColorStop(0, 'rgba(0,0,0,0)');
    wg.addColorStop(1, 'rgba(8,5,4,0.35)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(plate.x, plate.y, plate.w, plate.h);
    ctx.clip();
    ctx.fillStyle = wg;
    ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
    ctx.restore();

    drawSmoke(ctx, plate, sim, teraz);
    drawEyelid(ctx, plate, sim, teraz);
    drawFrame(ctx, plate, teraz);
    if (ustawienia.skalaGlebokosci && !plate.waski) rysujMinimape(ctx, sim, cam, plate, teraz);
    if (ustawienia.spisRas) drawCensus(ctx, plate, sim, h);
    drawOtchlan(ctx, plate, sim, h);
    drawCrack(ctx, plate, sim, w, h, teraz);
    if (ustawienia.kronika) drawChronicle(ctx, plate, sim, w, h);
    this.ui.draw(ctx, sim, teraz);
    this.przyciski = rozmiescPrzyciski(plate, h, {
      pauza: this.pauza, zapiski: this.zapiski, legenda: this.legenda,
      tempo: Math.max(1, Math.round(ustawienia.tempo * this.tempoMnoznik)),
    });
    const podPrzyciskiem = przyciskPod(this.przyciski, this.ui.pointer.x, this.ui.pointer.y);
    rysujPrzyciski(ctx, this.przyciski, podPrzyciskiem?.akcja ?? null, teraz);
    this.znakMenu(ctx, teraz);
    if (this.liczby) {
      ctx.save();
      ctx.font = `${Math.max(14, w / 74)}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(236,222,190,0.95)';
      const linie = [
        `wiara ${Math.round(sim.wiara)}`,
        `krew ${Math.round(sim.krew)}`,
        `otchłań ${Math.round(sim.otchlan)}`,
        `żywych ${sim.creatures.reduce((n, c) => n + (c.dead ? 0 : 1), 0)}`,
        `dominacja ${(sim.dominance * 100) | 0}%`,
        `tik ${sim.tick}`,
      ];
      linie.forEach((l, i) => ctx.fillText(l, plate.x + plate.w - 12, plate.y + 24 + i * 20));
      ctx.restore();
    }
    if (this.legenda) rysujLegende(ctx, plate, w);
    if (this.rada && !this.ui.verb && !this.legenda) {
      ctx.save();
      ctx.textAlign = 'center';
      const rozmiar = Math.max(15, Math.min(20, w / 66));
      ctx.font = `italic ${rozmiar}px "Trzewia Tekst", Georgia, serif`;
      // na wąskim ekranie zdanie nie mieści się w jednej linii i wychodziło poza płytę
      const maxW = plate.w - (plate.waski ? 16 : 40);
      const linie = lamiTekst(ctx, this.rada.tekst, maxW, 2);
      const podstawa = plate.y - plate.top * 0.28 - (linie.length - 1) * rozmiar * 1.15;
      ctx.lineWidth = 3;
      for (let i = 0; i < linie.length; i++) {
        const y = podstawa + i * rozmiar * 1.15;
        ctx.strokeStyle = 'rgba(10,7,6,0.75)';
        ctx.strokeText(linie[i], plate.x + plate.w / 2, y);
        ctx.fillStyle = 'rgba(226,206,160,0.9)';
        ctx.fillText(linie[i], plate.x + plate.w / 2, y);
      }
      ctx.restore();
    }
    if (this.painting) this.rysujKoszt(ctx, w);
    if (!sim.ending) {
      const stan = this.zamrozone() ? 'stoi' : this.spowolnione() ? 'zwalnia' : 'plynie';
      rysujTempo(ctx, plate, stan, Math.max(1, Math.round(ustawienia.tempo * this.tempoMnoznik)), teraz);
    }
    if (this.zapiski) {
      const r = rysujZapiski(ctx, plate, sim, w, h, this.przewinZapiskow);
      this.trafieniaZapiskow = r.trafienia;
      this.maxPrzewin = r.maxPrzewin;
    }
  }

  /** Trzy nacięcia w lewym górnym rogu płyty — wyjście do menu bez klawiatury. */
  private znakMenu(ctx: CanvasRenderingContext2D, teraz: number): void {
    const { x, y } = this.menuRect();
    ctx.save();
    ctx.font = `italic ${Math.max(14, this.plate.left * 0.2)}px "Trzewia Tekst", Georgia, serif`;
    ctx.fillStyle = 'rgba(206,192,166,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('P', x + 24, y + 16);
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
    const przedKrew = sim.krew, przedWiara = sim.wiara, przedOtchlan = sim.otchlan;
    let udane = false;
    if (ui.verb === 'ksztaltuj') udane = shape(sim, ui.tool, wx, wy);
    else if (ui.verb === 'zasiej') udane = seed(sim, ui.tool, wx, wy);
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
      }
    }
    if (!udane && (ui.verb === 'ksztaltuj' || ui.verb === 'zasiej' || ui.verb === 'znak')) {
      const brak = ui.hintCost(sim);
      const [cx, cy] = this.swiatPod(x, y);
      const powod = brak || ((ui.tool === 'woda' || ui.tool === 'zar') && sim.world.suchaStrefa(cx, cy)
        ? 'Nie tutaj. To jedyna sucha droga do twojego rdzenia.'
        : ui.tool === 'zawal' ? 'Tu nie ma czego zawalić — celuj w pustkę.'
        : ui.tool === 'draz' ? 'Tu nie ma czego drążyć — celuj w skałę.'
        : 'Nie da się tego zrobić w tym miejscu.');
      ui.say(powod, sim.tick);
    }
    if (udane && this.painting) {
      this.kosztPociagniecia.krew += Math.max(0, przedKrew - sim.krew);
      this.kosztPociagniecia.wiara += Math.max(0, przedWiara - sim.wiara);
      this.kosztPociagniecia.otchlan += Math.max(0, przedOtchlan - sim.otchlan);
    }
    if (udane) this.nasluch?.({ typ: 'moc', czasownik: ui.verb, narzedzie: ui.tool });
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

    if (faza === 'dol' && this.zapiski) {
      for (const t of this.trafieniaZapiskow) {
        if (e.clientX < t.x || e.clientX > t.x + t.w || e.clientY < t.y || e.clientY > t.y + t.h) continue;
        this.zapiski = false;
        this.pokazMiejsce(t.wpis.x! + 0.5, t.wpis.y! + 0.5, Math.max(this.cam.zoom, 10));
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
      const mm = miejsceZMinimapy(sim, this.plate, e.clientX, e.clientY);
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
        if (wybranaMysl && !ui.selected) this.nasluch?.({ typ: 'szept', narzedzie: ui.tool ?? '' });
        return;
      }
      if (ui.selected) { ui.selected = null; if (wpis) wpis.interfejs = true; return; }
      if (!this.naPlycie(e.clientX, e.clientY)) return;
      if ((ui.verb === 'ksztaltuj' || ui.verb === 'zasiej') && e.button !== 2) {
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
      this.nasluch?.({ typ: 'kamera' });
      this.dirty = true;
      return;
    }

    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) { this.pinch = 0; this.srodekPinch = null; }
    if (!p) return;
    if (this.painting) { this.painting = false; this.malowane.clear(); return; }
    if (p.interfejs) return;
    if (!p.moved && p.przycisk !== 2 && !sim.ending && ui.verb && ui.verb !== 'ksztaltuj' && ui.verb !== 'zasiej' && this.naPlycie(p.sx, p.sy)) this.uzyj(p.sx, p.sy);
  }

  /** Ten sam skutek, co klawisz — tylko że da się w to kliknąć palcem. */
  private przyciskWcisniety(b: Przycisk): void {
    switch (b.akcja) {
      case 'pauza': this.klawisz('pauza'); break;
      case 'wolniej': this.klawisz('wolniej'); break;
      case 'szybciej': this.klawisz('szybciej'); break;
      case 'kamera': this.doMieszkancow(); break;
      case 'zapiski': this.zapiski = !this.zapiski; this.przewinZapiskow = 0; break;
      case 'legenda': this.legenda = !this.legenda; break;
      case 'zapis': this.klawisz('zapis'); break;
    }
    this.dirty = true;
  }

  kolko(e: WheelEvent): void {
    if (this.zapiski) {
      this.przewinZapiskow = Math.max(0, Math.min(this.maxPrzewin, this.przewinZapiskow + (e.deltaY > 0 ? 3 : -3)));
      return;
    }
    const bx = this.cam.toWorldX(e.clientX - this.plate.x), by = this.cam.toWorldY(e.clientY - this.plate.y);
    this.przejmijKamere();
    this.cam.zoom *= e.deltaY < 0 ? 1.25 : 1 / 1.25;        // większy krok — mniej kręcenia
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.cam.x += bx - this.cam.toWorldX(e.clientX - this.plate.x);
    this.cam.y += by - this.cam.toWorldY(e.clientY - this.plate.y);
    this.cam.clamp(this.sim.world.w, this.sim.world.h);
    this.nasluch?.({ typ: 'kamera' });
    this.dirty = true;
  }

  klawiszPuszczony(k: string): void { if (k === 'Tab') this.liczby = false; }

  klawisz(akcja: Akcja | null, _e?: KeyboardEvent): void {
    if (_e?.key === 'Tab') { this.liczby = true; return; }
    const { ui, sim } = this;
    switch (akcja) {
      case 'menu': this.app.idz('menu'); break;
      case 'pauza': this.pauza = !this.pauza; ui.say(this.pauza ? 'Czas stoi.' : 'Czas znów płynie.', sim.tick); break;
      case 'szybciej': ustawienia.tempo = Math.min(8, ustawienia.tempo + 1); break;
      case 'wolniej': ustawienia.tempo = Math.max(1, ustawienia.tempo - 1); break;
      case 'zapis': ui.say(this.zapisujAuto && saveToStorage(sim) ? 'Zapisane.' : 'Nie tutaj.', sim.tick); break;
      case 'wczytaj': { const s = loadFromStorage(); if (s) { this.sim = s; this.doSerca(true); ui.say('Wróciłeś tam, gdzie byłeś.', s.tick); } else ui.say('Nie ma do czego wracać.', sim.tick); break; }
      case 'odNowa': if (sim.ending) this.nowaGra(); break;
      case 'legenda': this.legenda = !this.legenda; break;
      case 'zapiski': this.zapiski = !this.zapiski; this.przewinZapiskow = 0; break;
      case 'kamera': this.doMieszkancow(); break;
      case 'przyblizenie': this.cam.zoom = Math.min(this.cam.maxZoom, this.cam.zoom * 1.15); this.cam.clamp(sim.world.w, sim.world.h); this.dirty = true; break;
      case 'oddalenie': this.cam.zoom = Math.max(this.cam.minZoom, this.cam.zoom / 1.15); this.cam.clamp(sim.world.w, sim.world.h); this.dirty = true; break;
      case 'ksztaltuj': case 'zasiej': case 'szept': case 'znak': case 'skaz': this.wybierzCzasownik(akcja); break;
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
