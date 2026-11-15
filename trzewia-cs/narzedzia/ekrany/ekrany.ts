// Ekrany gry narysowane ORYGINALNYM kodem TS (alpha-1/src) w Chromium — do końcowego porównania z C#
// (testy/Trzewia.Testy/PorownanieEkranow.cs). Te same ekrany, ten sam rozmiar 1366×820 (skala 1), gra na tym samym
// ziarnie i tiku. Animacje zależne od zegara (puls, oddech, bicie serca) mogą się różnić — to nie jest test piksel w piksel.
import { App } from '../../../alpha-1/src/app/app';
import { EkranMenu } from '../../../alpha-1/src/app/screens/menu';
import { EkranGry } from '../../../alpha-1/src/app/screens/game';
import { EkranUstawien } from '../../../alpha-1/src/app/screens/settings';
import { EkranKroniki } from '../../../alpha-1/src/app/screens/kronika';
import { EkranBestiariusza } from '../../../alpha-1/src/app/screens/bestiariusz';
import { EkranOsiagniec } from '../../../alpha-1/src/app/screens/osiagniecia';
import { zaladujKroje } from '../../../alpha-1/src/render/fonts';
import { ustawienia } from '../../../alpha-1/src/core/settings-store';

let app: App;
let gra: EkranGry;
const czekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function przygotuj(): Promise<{ w: number; h: number; skala: number }> {
  try { localStorage.clear(); } catch { /* bez pamięci */ }
  ustawienia.rycinaWWatku = false;
  ustawienia.samouczekZrobiony = false;
  const c = document.createElement('canvas');
  c.id = 'screen';
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh';
  document.body.style.margin = '0';
  document.body.appendChild(c);
  app = new App(c);
  await zaladujKroje();
  gra = new EkranGry(app); app.zarejestruj(gra);
  app.zarejestruj(new EkranMenu(app));
  app.zarejestruj(new EkranBestiariusza(app));
  app.zarejestruj(new EkranUstawien(app));
  app.zarejestruj(new EkranKroniki(app));
  app.zarejestruj(new EkranOsiagniec(app));
  app.przelicz();
  return { w: app.w, h: app.h, skala: app.canvas.width / app.w };
}

function zrzut(): string { return app.canvas.toDataURL('image/png'); }

/** Obrazki (freski, medaliony, tekstury) wczytują się leniwie przy pierwszym rysunku — jedna klatka i chwila czekania. */
async function rozgrzej(rysuj: () => void): Promise<void> {
  app.ctx.setTransform(app.canvas.width / app.w, 0, 0, app.canvas.height / app.h, 0, 0);
  rysuj();
  await czekaj(1200);
}

/** Ekran po wejściu: `poMs` — ile ms od wejścia (animacje wejścia skończone). */
export async function ekran(nazwa: string, poMs: number): Promise<string> {
  app.idz(nazwa);
  await czekaj(300);                     // obrazki (logo, znaki zespołu) wczytują się w tle
  const e = app.aktywnyEkran!;
  await rozgrzej(() => e.rysuj(app.ctx, app.w, app.h, performance.now()));
  const teraz = performance.now() + poMs;
  for (let i = 0; i < 3; i++) { app.ctx.setTransform(app.canvas.width / app.w, 0, 0, app.canvas.height / app.h, 0, 0); e.rysuj(app.ctx, app.w, app.h, teraz + i); }
  return zrzut();
}

/** Gra: nowa góra na ziarnie, `tik` kroków symulacji (bez bota), trzy klatki. */
export async function partia(ziarno: number, tik: number): Promise<string> {
  gra.nowaGra(ziarno);
  app.idz('gra');
  while (gra.sim.tick < tik && !gra.sim.ending) gra.sim.step();
  await rozgrzej(() => gra.rysuj(app.ctx, app.w, app.h, performance.now()));
  const teraz = performance.now();
  for (let i = 0; i < 3; i++) { app.ctx.setTransform(app.canvas.width / app.w, 0, 0, app.canvas.height / app.h, 0, 0); gra.rysuj(app.ctx, app.w, app.h, teraz + i * 40); }
  return zrzut();
}

/** Kronika partii z `partia` (koniec: sen). */
export async function kronika(poMs: number): Promise<string> {
  gra.sim.ending = 'sen';
  app.idz('kronika', { sim: gra.sim });
  const e = app.aktywnyEkran!;
  await rozgrzej(() => e.rysuj(app.ctx, app.w, app.h, performance.now()));
  const teraz = performance.now() + poMs;
  for (let i = 0; i < 3; i++) { app.ctx.setTransform(app.canvas.width / app.w, 0, 0, app.canvas.height / app.h, 0, 0); e.rysuj(app.ctx, app.w, app.h, teraz + i); }
  return zrzut();
}
