// Wzorce ryciny świata do testu C# (testy/Trzewia.Testy/RycinaTesty.cs): odbitka liczona ORYGINALNYM render/engrave.ts
// (Engraver.rebuild — tryb bez wątku, jedna pełna odbitka, bez zgrubnej: płyta ≤ 250 000 pikseli). Partia z botem do
// tiku, kamera, czas i tryb (rycina / fresk) — z opisu sceny.
import { Sim } from '../../../alpha-1/src/sim/sim';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { Engraver } from '../../../alpha-1/src/render/engrave';
import { zrodlaSwiatla } from '../../../alpha-1/src/render/rycina-zrodla';
import { rowneW } from '../../../alpha-1/src/render/grzbiet';

const b64 = (b: Uint8Array | Uint8ClampedArray): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  return btoa(s);
};

let sim: any = null, simZiarno = -1;
export function odbitka(ziarno: number, tik: number, kam: { x: number; y: number; zoom: number; vw: number; vh: number }, czas: number, fresk: boolean) {
  if (!sim || simZiarno !== ziarno || sim.tick > tik) { sim = new Sim(ziarno); simZiarno = ziarno; }
  while (sim.tick < tik && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, 'rozsadny' as never); }
  const e: any = new Engraver();
  e.resize(kam.vw, kam.vh, 1);
  e.fresk = fresk;
  e.zrodla = zrodlaSwiatla(sim);
  e.rowne = rowneW(sim.world);
  e.rebuild(sim, kam, czas);
  if (e.niedokonczona) throw new Error('odbitka zgrubna — płyta za duża');
  // obraz ryciny: PNG z płótna (alfa 255, bez strat); źródła światła: surowe bajty (alfa prosta — PNG z płótna by ją zmienił)
  const p = document.createElement('canvas');
  p.width = e.aw; p.height = e.ah;
  p.getContext('2d')!.putImageData(e.img, 0, 0);
  return { tik: sim.tick, aw: e.aw, ah: e.ah, dx: e.dx, dy: e.dy, png: p.toDataURL('image/png'), emis: b64(e.edata) };
}
