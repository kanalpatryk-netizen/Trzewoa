/**
 * REŻYSER TRAILERA — wstrzykiwany do działającej gry (Vite dev, `?bot`) przez nagraj.mjs.
 *
 * Gra zostaje nietknięta: reżyser bierze jej obiekty z `window.__trzewia` (tylko w trybie dev) i te same
 * moduły co gra (Vite podaje jeden egzemplarz modułu pod jednym adresem), a potem:
 *  - przewija partię bota bez rysowania (`przewin`) — dokładnie jak pętla gry w oknie obserwatorium,
 *  - rysuje KADR: sam świat gry na całym ekranie, bez księgi, ramy i przycisków (`klatka`),
 *  - prowadzi kamerę po zadanej ścieżce (x, y, przybliżenie), zamiast automatu „za życiem”.
 * Czas płynie wirtualnie (zegar Playwrighta), więc każda klatka jest liczona w pełnej jakości i w równym kroku.
 */
import { BOT_CO, kartaBota, ruchBota, type StylBota } from '../src/app/bot';
import { ustawienia } from '../src/core/settings-store';
import { rysujKucie } from '../src/render/kucie';
import { rysujZyly } from '../src/render/zyly';
import { rysujTrupy } from '../src/render/trupy';
import { drawParticles } from '../src/render/overlay';
import { rysujStworzenia } from '../src/render/figury';
import { rysujEfekty } from '../src/render/efekty';
import { rysujZaznaczenie } from '../src/render/druzyna';
import { POMNIK } from '../src/nastawy/pomnik';
import { rysujNadPomnikiem, rysujPomnik } from '../src/render/pomnik';
import { rysujDlonDemona } from '../src/render/dlon-demona';
import { rysujStraznikowWSkale } from '../src/render/straznicy';
import { oddechRdzenia } from '../src/render/tajemnica';
import { tynkSwiata } from '../src/render/fresk';
import { rysujSchodyDrogi } from '../src/render/schody';
import { rysujBudoweSchodow } from '../src/render/budowa-schodow';
import { rysujRdzen } from '../src/render/rdzen';
import { smugiSwiatla } from '../src/render/shafts';
import { rysujKatedre, rysujKatedreNad } from '../src/render/katedra';
import { rysujPromien } from '../src/render/promien';
import { rysujKonwoj, rysujKonwojNad } from '../src/render/konwoj';
import { wysokoscGrzbietu } from '../src/render/grzbiet';
import { SURFACE_Y } from '../src/sim/world';
import { drawSmoke, drawEyelid } from '../src/render/plate';
import { rysujMrok } from '../src/render/mrok';
import { rysujDlon } from '../src/render/dlon';
import { rysujAniola } from '../src/render/aniol';
import { rysujLoch, rysujLochNad } from '../src/render/loch';
import { rysujWiadra, rysujPrzodWiader } from '../src/render/wiadro';
import { MROK } from '../src/nastawy/mrok';
import { rysujZarys } from '../src/render/zarys';
import { stanPomnika, miejscePomnika } from '../src/sim/pomnik';
import { procentSkorupy } from '../src/sim/rytual';
import { nieWykopane } from '../src/sim/pielgrzymka';
import { Race } from '../src/sim/races';
import { ekran } from '../src/core/settings-store';
import { BOT } from '../src/app/obserwowany';
import { LUD } from '../src/nastawy/lud';
import { sign, whisper, nakarm } from '../src/powers/powers';
import { drogaGrupie } from '../src/sim/polecenia';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dowolny = any;

const T = (): Dowolny => (window as Dowolny).__trzewia;
const gra = (): Dowolny => T().gra;

export interface Kamera { x: number; y: number; zoom: number }

/** Stan reżysera: kamera wymuszona z zewnątrz i drobne ustawienia kadru. */
const R = {
  kamera: null as Kamera | null,
  /** Ciemne brzegi ryciny (rytowana ciemność gry) — jak winieta. */
  brzegi: true,
  /** Mgła wiary i powieka snu z płyty. */
  dym: true,
  styl: 'rozsadny' as StylBota,
  /** Bez znaczków stanu (błogosławiony, weteran) przy głowach postaci. */
  bezZnakow: true,
  /** Ile tików na klatkę ma liczyć symulacja (1 = zwykły czas). */
  tempo: 1,
  /** Odliczanie klatek, wirtualny czas ekranu (ms). */
  teraz: 0,
};

/** Pierwsze ustawienie: ostra rycina, ręczna kamera, płyta na cały ekran, nasza pętla zamiast pętli gry. */
export function przygotuj(o: { maxZoom?: number; wielkosc?: number } = {}): Dowolny {
  const t = T();
  ustawienia.jakosc = 'ostra';
  ustawienia.oddech = true;
  ustawienia.ograniczRuch = false;
  ustawienia.kameraZaZyciem = false;
  ustawienia.autoZoom = false;
  ustawienia.trybDeweloperski = false;
  ustawienia.skalaGlebokosci = false;
  if (o.wielkosc) { ustawienia.wielkoscUI = o.wielkosc; t.app.przelicz(); }
  // bot gra, ale po końcu partii nie zaczyna nowej (nagrywamy też zakończenie)
  BOT.autoRestart = false;
  BOT.tempo = 1;
  const g = gra();
  g.recznaKamera = true;
  ustawPlyte();
  if (o.maxZoom) g.cam.maxZoom = o.maxZoom;
  // pętla gry stoi — klatki liczy reżyser
  (window as Dowolny).requestAnimationFrame = () => 0;
  return { w: t.app.w, h: t.app.h, skala: ekran.skala, canvas: [t.app.canvas.width, t.app.canvas.height] };
}

/** Płyta = cały ekran (bez ramy i księgi): kamera, rycina i poświata dostają pełny kadr. */
export function ustawPlyte(): void {
  const t = T(), g = gra();
  const w = t.app.w, h = t.app.h;
  g.plate = { x: 0, y: 0, w, h, left: 0, right: 0, top: 0, bottom: 0, waski: false, niski: false };
  g.cam.vw = w; g.cam.vh = h;
  g.eng.resize(w, h);
  g.poswiata.resize(w, h);
  g.dirty = true;
  // gra po zmianie rozmiaru okna przeliczyłaby płytę po swojemu — tu okno się nie zmienia
  g.rozmiar = () => { /* płyta reżysera */ };
}

/** Nowa partia z danym ziarnem (bot gra od pierwszego tiku). */
export function nowaPartia(ziarno: number, styl: StylBota = 'rozsadny'): void {
  const g = gra();
  R.styl = styl;
  g.nowaGra(ziarno);
  ustawPlyte();
}

/** Przewija partię o `tikow` tików bez rysowania — bot decyduje jak w oknie obserwatorium. */
export function przewin(tikow: number): number {
  const sim = gra().sim;
  for (let i = 0; i < tikow && !sim.ending; i++) krokSymulacji(sim);
  return sim.tick;
}

function krokSymulacji(sim: Dowolny): void {
  sim.step();
  if (!sim.ending) {
    if (sim.wydarzenia.biezace) kartaBota(sim, R.styl);
    if (sim.tick % BOT_CO === 0) ruchBota(sim, R.styl);
  }
}

/** Przewija aż warunek (kod JS z `sim` i `R`) będzie prawdą albo minie limit tików. */
export function przewinDo(warunek: string, limit = 200000, co = 30): { tick: number; ok: boolean } {
  const sim = gra().sim;
  // eslint-disable-next-line no-new-func
  const f = new Function('sim', 'pom', 'stan', `return (${warunek});`) as (s: Dowolny, p: Dowolny, st: Dowolny) => boolean;
  const start = sim.tick;
  while (sim.tick - start < limit && !sim.ending) {
    for (let i = 0; i < co && !sim.ending; i++) krokSymulacji(sim);
    if (f(sim, stanPomnika(sim), stanGry())) return { tick: sim.tick, ok: true };
  }
  return { tick: sim.tick, ok: f(sim, stanPomnika(sim), stanGry()) };
}

/** Kompaktowy stan partii do osi zdarzeń i wyboru ujęć. */
export function stanGry(): Dowolny {
  const sim = gra().sim;
  const lud: Dowolny[] = [];
  for (const c of sim.creatures) {
    if (c.dead) continue;
    if (c.race === Race.GOBLIN || c.boss || c.straznik !== undefined || c.clan === sim.lud.straznicy?.klan) {
      lud.push({
        id: c.id, r: c.rola ?? (c.boss ? 'boss' : 'inny'), x: +c.x.toFixed(1), y: +c.y.toFixed(1), job: c.job,
        hp: Math.round(c.hp), zam: c.zamiar ?? '', pol: c.polecenie?.typ ?? '', ruch: c.ruch?.nazwa ?? c.ruch?.rodzaj ?? '',
        dl: c.wDloni ? 1 : 0, lot: c.lot ? 1 : 0,
      });
    }
  }
  const p = sim.lud.pomnik ?? null;
  const plan = sim.planDrogi, wszystkie = plan?.szyb?.length ?? 0;
  return {
    tick: sim.tick, ending: sim.ending ?? null,
    wiara: Math.round(sim.wiara), krew: Math.round(sim.krew),
    pomnik: p ? { faza: p.faza, stan: p.stan } : null,
    skorupa: procentSkorupy(sim), pekniecia: sim.rytual?.pekniecia,
    droga: wszystkie ? Math.round(100 * (1 - Math.min(wszystkie, nieWykopane(sim).length) / wszystkie)) : 0,
    brama: sim.lud.brama ? { ...sim.lud.brama } : null,
    fala: sim.lud.straznicy ? { fala: sim.lud.straznicy.fala, trwa: sim.lud.straznicy.trwa } : null,
    dlon: sim.lud.dlon ? { faza: sim.lud.dlon.faza } : null,
    dlonDemona: sim.lud.dlonDemona ? { faza: sim.lud.dlonDemona.faza ?? sim.lud.dlonDemona.rodzaj ?? '?' } : null,
    aniol: sim.lud.aniol ? { faza: sim.lud.aniol.faza } : null,
    budowa: sim.lud.budowaSchodow ? JSON.stringify(sim.lud.budowaSchodow).slice(0, 200) : null,
    lud,
  };
}

/** Miejsca w świecie (kafle) — do ustawiania kamery. */
export function miejsca(): Dowolny {
  const sim = gra().sim, w = sim.world;
  const pick = (o: Dowolny) => { try { const j = JSON.stringify(o); return j === undefined ? String(typeof o) : JSON.parse(j); } catch { return null; } };
  return {
    swiat: { w: w.w, h: w.h, surface: SURFACE_Y, coreX: w.coreX, coreY: w.coreY },
    oltarz: pick(w.oltarz), komnata: pick(w.komnata), kociol: pick(w.kociol), przedproze: pick(w.przedproze),
    brama: pick(w.brama), loch: pick(w.loch), szybDrogi: pick(w.szybDrogi), odcinki: pick(w.odcinkiDrogi),
    pomnik: miejscePomnika(sim), sala: pick(w.sala), katedra: pick(w.katedra), wiadro: pick(sim.lud.wiadra?.szyb ?? null),
  };
}

/** Nowe wpisy kroniki od numeru `od`. */
export function kronika(od = 0): Dowolny[] {
  const sim = gra().sim;
  return sim.chronicle.filter((e: Dowolny) => e.tick >= od).map((e: Dowolny) => ({ tick: e.tick, text: e.text, kind: e.kind, x: e.x, y: e.y }));
}

/** Kamera na zadanym miejscu (bez wygładzania — wygładza ścieżka po stronie nagrywania). */
export function kamera(k: Kamera): void {
  R.kamera = k;
  const g = gra();
  g.cam.zoom = k.zoom;
  g.cam.x = k.x; g.cam.y = k.y;
  g.camTarget.x = k.x; g.camTarget.y = k.y;
}

/** Oznacza wszystko, co zaszło w świecie przed nagraniem, jako widziane (bez wybuchu lotów okruchów w 1. klatce). */
export function zapomnij(): void {
  const g = gra(), sim = g.sim;
  g.urobki.zbierz(sim, -1e9);
  g.pokoje.zbierz(sim, -1e9, g.urobki);
  g.oltarz.zbierz(sim, -1e9, g.urobki);
  g.urobki.loty = [];
}

/**
 * Jedna klatka: krok gry o `dt` ms (symulacja, bot, kamera reżysera) i kadr.
 * `teraz` to czas ekranu (performance.now() pod zegarem Playwrighta).
 */
export function klatka(dt: number, tempo = 1): void {
  const t = T(), g = gra();
  R.teraz = performance.now();
  const k = R.kamera;
  if (k) kamera(k);
  // szybszy (albo wolniejszy) czas: mnożnik tempa obserwatorium — gra liczy tyle tików więcej na klatkę
  BOT.tempo = tempo;
  g.krok(dt, R.teraz);
  if (k) {
    g.cam.zoom = k.zoom; g.cam.x = k.x; g.cam.y = k.y;
    g.cam.clamp(g.sim.world.w, g.sim.world.h);
  }
  kadr(t.app.ctx, t.app.w, t.app.h, R.teraz);
}

/** Klatka bez kroku czasu (podgląd kamery). */
export function tylkoKadr(): void {
  const t = T(), g = gra();
  const k = R.kamera;
  if (k) { g.cam.zoom = k.zoom; g.cam.x = k.x; g.cam.y = k.y; g.cam.clamp(g.sim.world.w, g.sim.world.h); }
  kadr(t.app.ctx, t.app.w, t.app.h, performance.now());
}

/**
 * KADR — świat gry na całym ekranie: ta sama kolejność warstw co `EkranGry.rysuj` (src/app/screens/game.ts),
 * bez ramy płyty, księgi, okna postaci, przycisków, podpowiedzi i znaczników celu.
 */
export function kadr(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
  const g = gra();
  const { cam, eng, sim } = g;
  const plate = g.plate;
  const kameraRuszona = cam.x !== g.rysKam[0] || cam.y !== g.rysKam[1] || cam.zoom !== g.rysKam[2];
  if (kameraRuszona || eng.niedokonczona || g.dirty || teraz - g.lastInk > 30) {
    eng.fresk = ustawienia.swiat !== 'rycina';
    eng.rebuild(sim, cam, teraz);
    // zegar stoi w czasie klatki, więc dopracowanie po zmianie przybliżenia kończy się od razu — na wszelki wypadek pętla
    for (let i = 0; i < 6 && eng.niedokonczona; i++) eng.rebuild(sim, cam, teraz);
    g.lastInk = teraz; g.dirty = false;
    g.rysKam[0] = cam.x; g.rysKam[1] = cam.y; g.rysKam[2] = cam.zoom;
  }
  const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
  const oddech = ruch ? oddechRdzenia(sim, teraz, null) : 0.5;

  ctx.save();
  ctx.fillStyle = '#0b0807';
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.rect(plate.x, plate.y, plate.w, plate.h);
  ctx.clip();
  ctx.translate(plate.x, plate.y);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  const bw = eng.buf.width * eng.scale, bh = eng.buf.height * eng.scale;
  ctx.drawImage(eng.buf, eng.dx, eng.dy, bw, bh);
  if (ustawienia.jasnosc > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, ustawienia.jasnosc - 1);
    ctx.drawImage(eng.buf, eng.dx, eng.dy, bw, bh);
    ctx.restore();
  }
  if (eng.fresk) tynkSwiata(ctx, cam);
  g.poswiata.nalozy(ctx, eng.emis, eng.dx, eng.dy, bw, bh, 0.5);
  g.znakowWidac = g.tajemnica.znaki(ctx, sim, cam, oddech, false);
  rysujRdzen(ctx, sim, cam, teraz);
  rysujZyly(ctx, sim, cam, teraz);
  rysujKucie(ctx, sim, cam, teraz);
  g.pokoje.rysujWnetrza(ctx, sim, cam, teraz);
  g.oltarz.rysuj(ctx, sim, cam);
  g.ruiny.rysuj(ctx, sim, cam);
  rysujLoch(ctx, sim, cam, teraz);
  rysujSchodyDrogi(ctx, sim, cam, teraz);
  rysujBudoweSchodow(ctx, sim, cam, teraz);
  rysujKatedre(ctx, sim, cam);
  smugiSwiatla(ctx, sim, cam, teraz);
  drawParticles(ctx, sim, cam);
  rysujTrupy(ctx, sim, cam, teraz);
  const grunt = (x: number) => SURFACE_Y - wysokoscGrzbietu(sim.world, x);
  rysujKonwoj(ctx, sim, cam, teraz, grunt);
  rysujWiadra(ctx, sim, cam, teraz);
  rysujMrok(ctx, sim, cam, teraz, false);
  if (MROK.wlaczony) g.poswiata.nalozy(ctx, eng.emis, 0, 0, cam.vw, cam.vh, 0.3);
  rysujKatedreNad(ctx, sim, cam, teraz);
  rysujPromien(ctx, sim, cam, teraz);
  rysujKonwojNad(ctx, sim, cam, teraz, grunt);
  if (POMNIK.wlaczony) rysujPomnik(ctx, sim, cam, teraz);
  g.urobki.zbierz(sim, teraz);
  g.urobki.rysujNaMapie(ctx, cam, teraz);
  g.pokoje.zbierz(sim, teraz, g.urobki);
  g.pokoje.rysujNad(ctx, sim, cam, teraz, null);
  g.oltarz.zbierz(sim, teraz, g.urobki);
  g.oltarz.rysujNad(ctx, sim, cam, teraz, null);
  g.ruiny.rysujNad(ctx, sim, cam, teraz);
  rysujLochNad(ctx, sim, cam, teraz);
  rysujZarys(ctx, sim, cam, teraz);
  rysujZaznaczenie(ctx, sim, cam, teraz, new Set());
  // kadr kinowy bez znaczków stanu przy głowach (błogosławiony, weteran) — to wskazówki dla gracza, nie obraz
  const blog: [Dowolny, number][] = [];
  for (const c of sim.creatures) if (c.blogDo !== undefined) { blog.push([c, c.blogDo]); c.blogDo = undefined; }
  const wiaraWeterana = LUD.weteranWiara;
  if (R.bezZnakow) (LUD as Dowolny).weteranWiara = 99;
  else for (const [c, v] of blog) c.blogDo = v;
  try { rysujStworzenia(ctx, sim, cam, teraz, undefined); }
  finally {
    (LUD as Dowolny).weteranWiara = wiaraWeterana;
    for (const [c, v] of blog) c.blogDo = v;
  }
  g.pokoje.rysujPrzod(ctx, sim, cam, teraz);
  rysujPrzodWiader(ctx, sim, cam, teraz);
  rysujEfekty(ctx, sim.efekty, cam, teraz, sim);
  rysujStraznikowWSkale(ctx, sim, cam, teraz);
  rysujNadPomnikiem(ctx, sim, cam, teraz);
  rysujDlon(ctx, sim, cam, teraz);
  rysujDlonDemona(ctx, sim, cam, teraz);
  rysujAniola(ctx, sim, cam, teraz);
  ctx.restore();
  ctx.restore();
  if (R.brzegi) g.tajemnica.brzegi(ctx, plate, oddech);
  if (R.dym) {
    drawSmoke(ctx, plate, sim, teraz);
    drawEyelid(ctx, plate, sim, teraz);
  }
}

/** Ustawienia kadru z zewnątrz. */
export function ustaw(o: Partial<typeof R>): void { Object.assign(R, o); }

/** Płótno gry jako JPEG (base64 bez nagłówka). */
export function zrzut(jakosc = 0.94): string {
  const c = T().app.canvas as HTMLCanvasElement;
  return c.toDataURL('image/jpeg', jakosc).split(',')[1];
}

// ---------------------------------------------------------------- śledzenie i akcje gracza

/**
 * Prostokąt (kafle) wokół tego, co ma być w kadrze:
 *  - 'walka' — demon, rycerze przy nim, ci w dłoni i w locie (jak automat kamery gry, ale bez reszty ludu),
 *  - 'boss', 'rycerz', 'robotnik', 'pobozny' — wszyscy żywi tej roli (rycerz: najbliższy demona),
 *  - liczba — postać o tym id.
 */
export function cel(kto: string | number): { x: number; y: number; w: number; h: number; n: number } | null {
  const sim = gra().sim;
  const zywi = sim.creatures.filter((c: Dowolny) => !c.dead);
  let grupa: Dowolny[] = [];
  const boss = zywi.find((c: Dowolny) => c.boss);
  if (typeof kto === 'number') grupa = zywi.filter((c: Dowolny) => c.id === kto);
  else if (kto === 'walka') {
    if (boss) {
      grupa = [boss, ...zywi.filter((c: Dowolny) => c.race === Race.GOBLIN && (c.wDloni || c.lot
        || (c.rola === 'rycerz' && Math.abs(c.x - boss.x) < 16 && Math.abs(c.y - boss.y) < 10)))];
    }
  } else if (kto === 'boss') grupa = boss ? [boss] : [];
  else grupa = zywi.filter((c: Dowolny) => c.race === Race.GOBLIN && (c.rola ?? 'pobozny') === kto);
  if (!grupa.length) return null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of grupa) {
    const wys = c.boss ? 7 : 1.6;
    x0 = Math.min(x0, c.x - (c.boss ? 2.5 : 0.6)); x1 = Math.max(x1, c.x + (c.boss ? 2.5 : 0.6));
    y0 = Math.min(y0, c.y - wys); y1 = Math.max(y1, c.y + 0.4);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, n: grupa.length };
}

/** Postacie danej roli (id, x, y) — do wyboru, przy kim zrobić Cud. */
export function lud(rola?: string): Dowolny[] {
  const sim = gra().sim;
  return sim.creatures.filter((c: Dowolny) => !c.dead && c.race === Race.GOBLIN && (!rola || (c.rola ?? 'pobozny') === rola))
    .map((c: Dowolny) => ({ id: c.id, rola: c.rola, x: c.x, y: c.y, job: c.job, zam: c.zamiar ?? '' }));
}

/** Cud (objawienie) przy postaci — jak „Cud” w oknie pobożnego. Gdy brak wiary, dosypuje jej (ujęcie ma pokazać Cud). */
export function cud(id: number): boolean {
  const sim = gra().sim;
  const c = sim.creatures.find((q: Dowolny) => q.id === id && !q.dead);
  if (!c) return false;
  if (sim.wiara < 40) sim.wiara = 40;
  const ok = sign(sim, 'objawienie', Math.floor(c.x), Math.floor(c.y));
  if (ok) T().app.dzwiek.toll?.();
  return ok;
}

/** Szept „módl się” do pobożnego. */
export function szept(id: number): boolean {
  const sim = gra().sim;
  const c = sim.creatures.find((q: Dowolny) => q.id === id && !q.dead);
  if (!c) return false;
  if (sim.wiara < 20) sim.wiara = 20;
  return !!whisper(sim, 'modl', c);
}

/** Nakarm — wiadro zjeżdża szybem. */
export function karm(): string | null {
  const sim = gra().sim, w = sim.world;
  if (sim.krew < 20) sim.krew = 20;
  return nakarm(sim, w.szybWiadraX, w.szybWiadraDol) ?? null;
}

/** Dowolny kod z dostępem do sim, gry i reżysera (akcje w ujęciach). */
export function wykonaj(kod: string): unknown {
  // eslint-disable-next-line no-new-func
  return new Function('sim', 'gra', 'R', kod)(gra().sim, gra(), (window as Dowolny).R);
}

/** Rozkaz „Kop drogę wiernych / Buduj schody” dla robotników (wszystkich albo podanych). Zwraca, ilu przyjęło. */
export function budujSchody(ids?: number[]): number {
  const sim = gra().sim;
  const rob = ids ?? sim.creatures.filter((c: Dowolny) => !c.dead && c.race === Race.GOBLIN && c.rola === 'robotnik').map((c: Dowolny) => c.id);
  return drogaGrupie(sim, rob).przyjeli;
}

/**
 * Klatka z rozmyciem ruchu: `kamery.length` podklatek (kamera w ułamkach czasu klatki, świat idzie po ms/n),
 * uśrednionych na jednym płótnie — szybki przelot kamery nie skacze, tylko się rozmywa jak w kamerze filmowej.
 */
let akumulator: HTMLCanvasElement | null = null;
export function klatkaRozmyta(kamery: Kamera[], ms: number, tempo = 1): void {
  const t = T();
  const c = t.app.canvas as HTMLCanvasElement;
  if (!akumulator || akumulator.width !== c.width || akumulator.height !== c.height) {
    akumulator = document.createElement('canvas');
    akumulator.width = c.width; akumulator.height = c.height;
  }
  const a = akumulator.getContext('2d')!;
  kamery.forEach((k, i) => {
    kamera(k);
    klatka(ms / kamery.length, tempo);
    a.globalAlpha = 1 / (i + 1);
    a.drawImage(c, 0, 0);
  });
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(akumulator, 0, 0);
  ctx.restore();
}
