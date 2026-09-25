import type { Plate } from './plate';
import type { Sim } from '../sim/sim';
import { RACES } from '../sim/races';
import { SERIF } from './ink';

/**
 * Droga do wolności: pięć kroków do Uwolnienia w jednej linii na brzegu płyty.
 * Podpowiedź mówi, co zrobić teraz; ta linia mówi, dokąd to wszystko prowadzi.
 */
export interface KrokDrogi { nazwa: string; zrobiony: boolean; dopisek?: string }

export function krokiDrogi(sim: Sim): { kroki: KrokDrogi[]; biezacy: number } {
  let oddanie = 0;
  for (const k of sim.clans) {
    if (k.dead || k.pop < 8 || RACES[k.race].faithGain <= 0) continue;
    oddanie = Math.max(oddanie, k.devotion);
  }
  const r = sim.rytual;
  const wiara = sim.wiara >= 45 || sim.prayers > 0;
  const wierza = oddanie > 0.6 || r.pekniecia > 0;
  let powrot = false;
  for (const k of sim.clans) if (!k.dead && k.devotion > 0.6 && k.powrotOk) powrot = true;
  const droga = r.pekniecia > 0 || r.wierni >= 3 || (wierza && (sim.jedzeniePrzedsionka >= 3 || powrot));
  const potrzeba = Math.max(r.pekniecia + (r.otwarta ? 0 : 1), r.skorupa);
  const kroki: KrokDrogi[] = [
    { nazwa: 'wiara', zrobiony: wiara },
    { nazwa: 'oddanie', zrobiony: wierza, dopisek: !wierza && oddanie > 0 ? `${Math.round(oddanie * 100)}%` : undefined },
    { nazwa: 'droga', zrobiony: droga },
    { nazwa: 'skorupa', zrobiony: r.otwarta, dopisek: r.pekniecia > 0 && !r.otwarta ? `${r.pekniecia}/${potrzeba}` : undefined },
    { nazwa: 'wolność', zrobiony: !!sim.ending && sim.ending.startsWith('uwolnienie') },
  ];
  const biezacy = kroki.findIndex((k) => !k.zrobiony);
  return { kroki, biezacy: biezacy < 0 ? kroki.length - 1 : biezacy };
}

/** Rysuje linię kroków; zwraca prostokąt, w który można kliknąć (otwiera tablicę). */
export function rysujDrogeDoWolnosci(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, teraz: number): { x: number; y: number; w: number; h: number } {
  const { kroki, biezacy } = krokiDrogi(sim);
  const rozm = p.waski ? 12 : Math.max(13, Math.min(15, p.w / 84));
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const etykieta = p.waski ? '' : 'DROGA DO WOLNOŚCI';
  ctx.font = `${rozm * 0.78}px ${SERIF}`;
  const ew = etykieta ? ctx.measureText(etykieta).width + rozm * 0.9 : 0;
  ctx.font = `${rozm}px ${SERIF}`;
  const strzalka = '  ›  ';
  const sw = ctx.measureText(strzalka).width;
  const teksty = kroki.map((k) => k.nazwa + (k.dopisek ? ` ${k.dopisek}` : ''));
  const szer = ew + teksty.reduce((s, t) => s + ctx.measureText(t).width, 0) + sw * (teksty.length - 1);
  const pad = rozm * 0.7;
  const x0 = p.waski ? p.x + (p.w - szer) / 2 : p.x + 12;
  const y = p.waski ? p.y + 54 : p.y + 10 + rozm;
  // plakietka: ciemna, z cienką złotą ramką — musi być widać ją na każdym tle
  ctx.fillStyle = 'rgba(10,7,6,0.78)';
  ctx.fillRect(x0 - pad, y - rozm * 1.05, szer + pad * 2, rozm * 2.1);
  ctx.strokeStyle = 'rgba(214,176,112,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - pad + 0.5, y - rozm * 1.05 + 0.5, szer + pad * 2 - 1, rozm * 2.1 - 1);
  let x = x0;
  if (etykieta) {
    ctx.font = `${rozm * 0.78}px ${SERIF}`;
    ctx.fillStyle = 'rgba(206,192,166,0.7)';
    ctx.fillText(etykieta, x, y + 0.5);
    x += ew;
    ctx.font = `${rozm}px ${SERIF}`;
  }
  const puls = 0.6 + 0.4 * Math.sin(teraz * 0.004);
  kroki.forEach((k, i) => {
    const t = teksty[i];
    const tw = ctx.measureText(t).width;
    if (k.zrobiony) {                              // zrobione — spokojne, przekreślone rylcem
      ctx.fillStyle = 'rgba(190,178,156,0.62)';
      ctx.fillText(t, x, y);
      ctx.strokeStyle = 'rgba(190,178,156,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 1, y + 1); ctx.lineTo(x + tw + 1, y - 1); ctx.stroke();
    } else if (i === biezacy) {                    // bieżący — żarzy się i ma podkreślenie
      ctx.fillStyle = `rgba(252,212,140,${0.8 + 0.2 * puls})`;
      ctx.fillText(t, x, y);
      ctx.strokeStyle = `rgba(252,212,140,${0.35 + 0.35 * puls})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y + rozm * 0.72); ctx.lineTo(x + tw, y + rozm * 0.72); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(170,158,138,0.5)';
      ctx.fillText(t, x, y);
    }
    x += tw;
    if (i < kroki.length - 1) {
      ctx.fillStyle = 'rgba(214,176,112,0.55)';
      ctx.fillText(strzalka, x, y);
      x += sw;
    }
  });
  ctx.restore();
  return { x: x0 - pad, y: y - rozm * 1.05, w: szer + pad * 2, h: rozm * 2.1 };
}
