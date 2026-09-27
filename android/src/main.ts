import { App } from './app/app';
import { EkranMenu } from './app/screens/menu';
import { EkranGry } from './app/screens/game';
import { EkranSamouczka } from './app/screens/tutorial';
import { EkranUstawien } from './app/screens/settings';
import { EkranKroniki } from './app/screens/kronika';
import { EkranBestiariusza } from './app/screens/bestiariusz';
import { EkranLadowania, type Etap } from './app/screens/ladowanie';
import { ustawienia } from './core/settings-store';
import { mikser } from './core/mikser';
import { hasSave } from './core/save';
import { zaladujKroje } from './render/fonts';
import { SCENY } from './cutscene/scenes';
import * as nastawy from './nastawy';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const app = new App(canvas);

// Ekrany powstają dopiero na ekranie ładowania — samo ich zbudowanie generuje góry.
let gra!: EkranGry;
let samouczek!: EkranSamouczka;
let menu!: EkranMenu;
let bestiariusz!: EkranBestiariusza;
let ustawieniaEkran!: EkranUstawien;

/**
 * Płótno poza ekranem w tej samej skali co prawdziwe — rysując na nim raz każdy ekran,
 * wypełniamy wszystkie pamięci podręczne (rycina płyty, przekrój góry, miniatury
 * tablic, glify), zanim gracz cokolwiek zobaczy.
 */
function naBrudno(): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const ctx = c.getContext('2d', { alpha: false })!;
  ctx.setTransform(app.ctx.getTransform());
  return ctx;
}

const etapy: Etap[] = [
  { nazwa: 'Mierzę ekran i dopasowuję skalę', zrob: () => app.przelicz() },
  { nazwa: 'Wczytuję kroje pisma', zrob: () => zaladujKroje() },
  { nazwa: 'Kształtuję górę', zrob: () => { gra = new EkranGry(app); app.zarejestruj(gra); } },
  { nazwa: 'Przygotowuję nową górę na przebudzenie', zrob: () => gra.przygotuj() },
  { nazwa: 'Układam górę samouczka', zrob: () => { samouczek = new EkranSamouczka(app); app.zarejestruj(samouczek); samouczek.przygotuj(); } },
  {
    nazwa: 'Składam menu, atlas i ustawienia',
    zrob: () => {
      menu = new EkranMenu(app); app.zarejestruj(menu);
      bestiariusz = new EkranBestiariusza(app); app.zarejestruj(bestiariusz);
      ustawieniaEkran = new EkranUstawien(app); app.zarejestruj(ustawieniaEkran);
      app.zarejestruj(new EkranKroniki(app));
    },
  },
  { nazwa: 'Ryję płytę', zrob: () => { gra.rozmiar(app.w, app.h); gra.rysuj(naBrudno(), app.w, app.h, performance.now()); } },
  { nazwa: 'Rysuję przekrój góry', zrob: () => menu.rysuj(naBrudno(), app.w, app.h, performance.now()) },
  { nazwa: 'Kreślę tablice atlasu', zrob: () => { bestiariusz.wejdz(); bestiariusz.rysuj(naBrudno(), app.w, app.h, performance.now()); } },
  {
    nazwa: 'Przygotowuję plansze wstępu',
    zrob: () => {
      const ctx = naBrudno();
      for (const s of Object.values(SCENY)) {
        ctx.save();
        s.rysunek({ ctx, w: app.w, h: app.h * 0.5, t: 4000, p: 1, takt: 99, taktP: 1 });
        ctx.restore();
      }
    },
  },
  { nazwa: 'Sprawdzam zapis i ustawienia', zrob: () => { hasSave(); ustawieniaEkran.rysuj(naBrudno(), app.w, app.h, performance.now()); } },
];

app.zarejestruj(new EkranLadowania(app, etapy, () => { podepnijDev(); app.idz('menu'); }));
app.start('ladowanie');

/** Dev: wgląd w stan i wymuszona klatka. W wersji do wysyłki nie ma tego wcale. */
function podepnijDev(): void {
  if (!import.meta.env.DEV) return;
  (window as any).__trzewia = {
    app,
    gra,
    get sim() { return gra.sim; },
    cam: gra.cam,
    ui: gra.ui,
    eng: gra.eng,
    ustawienia,
    idz: (nazwa: string, dane?: unknown) => app.idz(nazwa, dane),
    step: (n = 1) => { for (let i = 0; i < n; i++) gra.sim.step(); },
    klatka: () => app.rysujRaz(),
    mikser,
    /** Wszystkie pokrętła gry — zmiana tu działa od razu (patrz src/nastawy/README.md). */
    nastawy,
  };

  (window as any).shot = async (name = 'shot') => {
    app.rysujRaz();
    const url = canvas.toDataURL('image/png');
    await fetch('/__shot', { method: 'POST', headers: { 'x-shot-name': name }, body: url });
    return name;
  };
}
