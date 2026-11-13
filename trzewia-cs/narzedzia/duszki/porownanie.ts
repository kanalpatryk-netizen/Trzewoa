// Wzorzec do testu duszków w C# (testy/Trzewia.Testy/DuszkiTesty.cs): ta sama scena narysowana ORYGINALNYM rysunkiem
// postaci z gry TS (render/figury.ts: rysujStworzenia — postacie rysowane kodem, klatka po klatce). Test C# rysuje tę
// samą scenę duszkami i porównuje obrazy. Partia z botem do tiku `tik`; przez ostatnie `klatek` klatek (60/s, po dwa
// tiki gry) rysunek idzie co klatkę — pamięć ruchu postaci (faza kroku, zegar czynności) narasta jak w grze.
import { Sim } from '../../../alpha-1/src/sim/sim';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { rysujStworzenia } from '../../../alpha-1/src/render/figury';
import { Camera } from '../../../alpha-1/src/render/camera';

export const TLO = '#2b2420';

export function scena(ziarno: number, tik: number, klatek: number, kam: { x: number; y: number; zoom: number; vw: number; vh: number }, skala: number) {
  const sim: any = new Sim(ziarno);
  const krok = (): void => { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, 'rozsadny' as never); };
  while (sim.tick < tik - klatek * 2 && !sim.ending) krok();
  const cam = new Camera(kam.vw, kam.vh);
  cam.x = kam.x; cam.y = kam.y; cam.zoom = kam.zoom;
  const p = document.createElement('canvas');
  p.width = Math.round(kam.vw * skala); p.height = Math.round(kam.vh * skala);
  const g = p.getContext('2d')!;
  let czas = 1000;
  for (let i = 0; i < klatek; i++) {
    krok(); krok();
    czas += 1000 / 60;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = TLO; g.fillRect(0, 0, p.width, p.height);
    g.setTransform(skala, 0, 0, skala, 0, 0);
    rysujStworzenia(g, sim, cam, czas);
  }
  return {
    tik: sim.tick, url: p.toDataURL('image/png'),
    postacie: sim.creatures.filter((c: any) => !c.dead).map((c: any) => ({ id: c.id, rola: c.rola ?? (c.boss ? 'boss' : c.straznik ? 'straznik' : '?'), x: +c.x.toFixed(3), y: +c.y.toFixed(3), job: c.job })),
  };
}
