import { App } from './app/app';
import { EkranMenu } from './app/screens/menu';
import { EkranGry } from './app/screens/game';
import { EkranSamouczka } from './app/screens/tutorial';
import { EkranUstawien } from './app/screens/settings';
import { EkranKroniki } from './app/screens/kronika';
import { EkranBestiariusza } from './app/screens/bestiariusz';
import { ustawienia } from './core/settings-store';
import { mikser } from './core/mikser';
import { zaladujKroje } from './render/fonts';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
const app = new App(canvas);

const gra = new EkranGry(app);
app.zarejestruj(new EkranMenu(app));
app.zarejestruj(gra);
app.zarejestruj(new EkranSamouczka(app));
app.zarejestruj(new EkranUstawien(app));
app.zarejestruj(new EkranKroniki(app));
app.zarejestruj(new EkranBestiariusza(app));

zaladujKroje().then(() => app.start('menu'));

// Dev: wgląd w stan i wymuszona klatka. W wersji do wysyłki nie ma tego wcale.
if (import.meta.env.DEV) {
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
};

(window as any).shot = async (name = 'shot') => {
  app.rysujRaz();
  const url = canvas.toDataURL('image/png');
  await fetch('/__shot', { method: 'POST', headers: { 'x-shot-name': name }, body: url });
  return name;
};
}
