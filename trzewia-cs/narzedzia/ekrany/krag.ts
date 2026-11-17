// Ekrany TRYBU KRĘGU TRZECIEGO narysowane ORYGINALNYM kodem TS (krag-3-beta/src przez „@krag/…”) w Chromium — do
// porównania z C# (testy/Trzewia.Testy/PorownanieEkranowKregu.cs). Menu kręgu i gra: ta sama partia z botem
// („rozsadny”, symulacja kręgu w C# jest z TS bit w bit — KragTesty), kamera ustawiona na to samo miejsce, stały zegar
// ekranu (deszcz, błyskawice, łuna i oddech liczą się z niego). Wstęp (film i scena wejścia) pominięty.
// Różnic nie da się uniknąć: krag-3-beta stoi na starszej Alphie (rycina z losowym szumem, bez wątku ryciny i nowszych
// poprawek), a postacie w C# są duszkami — to porównanie do oka, nie piksel w piksel.
import { App } from '@krag/app/app';
import { EkranMenu } from '@krag/app/screens/menu';
import { EkranGry } from '@krag/app/screens/game';
import { zaladujKroje } from '@krag/render/fonts';
import { ustawienia } from '@krag/core/settings-store';
import { ruchBota, BOT_CO } from '@krag/app/bot';
import { Sim } from '@krag/sim/sim';

let app: App;
let gra: EkranGry;
const czekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function przygotuj(): Promise<{ w: number; h: number; skala: number }> {
  try { localStorage.clear(); } catch { /* bez pamięci */ }
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
  app.przelicz();
  return { w: app.w, h: app.h, skala: app.canvas.width / app.w };
}

function zrzut(): string { return app.canvas.toDataURL('image/png'); }
function transform(): void { app.ctx.setTransform(app.canvas.width / app.w, 0, 0, app.canvas.height / app.h, 0, 0); }

export async function menu(teraz: number): Promise<string> {
  app.idz('menu');
  await czekaj(300);
  const e = (app as any).aktywnyEkran;
  transform(); e.rysuj(app.ctx, app.w, app.h, teraz);
  await czekaj(1200);
  for (let i = 0; i < 3; i++) { transform(); e.rysuj(app.ctx, app.w, app.h, teraz + i); }
  return zrzut();
}

/**
 * Gra: partia `ziarno` z botem do tiku `tik`, kamera w (x, y) z przybliżeniem `zoom` (albo na bossie, gdy x = null),
 * klatki ekranu w chwili `teraz`.
 */
export async function partia(ziarno: number, tik: number, x: number | null, y: number | null, zoom: number, teraz: number): Promise<string> {
  const g = gra as any;
  gra.nowaGra(ziarno);
  g.wstep.faza = 'brak';
  const sim: any = new Sim(ziarno);
  while (sim.tick < tik && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, 'rozsadny' as never); }
  g.sim = sim;
  app.idz('gra');
  g.wstep.faza = 'brak';
  const boss = sim.creatures.find((c: any) => c.boss && !c.dead);
  const cx = x ?? boss?.x ?? sim.world.coreX, cy = y ?? (boss ? boss.y - 2 : sim.world.coreY);
  const ustaw = (): void => { g.pokazMiejsce(cx, cy, zoom); g.recznaKamera = true; };
  ustaw();
  transform(); gra.rysuj(app.ctx, app.w, app.h, teraz);
  await czekaj(1500);                    // obrazki (Cerber, żarłocy, freski) wczytują się w tle
  for (let i = 0; i < 3; i++) { ustaw(); transform(); gra.rysuj(app.ctx, app.w, app.h, teraz + i * 40); }
  return zrzut();
}
