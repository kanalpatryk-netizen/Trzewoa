import type { Plate } from './plate';
import type { Sim } from '../sim/sim';
import { RACES } from '../sim/races';
import { SERIF } from './ink';
import { ramaKarty } from './ozdoby';

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

/**
 * Rysuje drogę jako tor z pięcioma węzłami: zrobione są złote, bieżący pulsuje, dalsze
 * czekają puste. Pod węzłami nazwy kroków, nad wszystkim tytuł na zakładce ramki.
 * Zwraca prostokąt, w który można kliknąć (otwiera tablicę).
 */
export function rysujDrogeDoWolnosci(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, teraz: number): { x: number; y: number; w: number; h: number } {
  const { kroki, biezacy } = krokiDrogi(sim);
  const rozm = p.waski ? 11 : Math.max(12, Math.min(14, p.w / 90));
  const szer = p.waski ? Math.min(p.w - 70, 330) : Math.max(300, Math.min(440, p.w * 0.38));
  const wys = rozm * 3.3;
  const x0 = p.waski ? p.x + (p.w - szer) / 2 : p.x + 12;
  // wąsko: pod progiem Znaku i klepsydrą, które zajmują górny pas płyty
  const y0 = p.waski ? p.y + 46 : p.y + 12;
  ramaKarty(ctx, x0, y0, szer, wys, 0.92, 'droga do wolności', true);

  const n = kroki.length;
  const lx0 = x0 + szer * 0.1, lx1 = x0 + szer * 0.9;
  const ly = y0 + wys * 0.4;
  const krok = (lx1 - lx0) / (n - 1);
  const puls = 0.5 + 0.5 * Math.sin(teraz * 0.004);
  ctx.save();
  // tor: cienka kreska przez całość, złota do bieżącego węzła
  ctx.strokeStyle = 'rgba(207,194,166,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke();
  ctx.setLineDash([]);
  const zrobione = kroki.filter((k) => k.zrobiony).length;
  const doX = lx0 + krok * Math.min(n - 1, Math.max(0, biezacy));
  if (zrobione > 0) {
    ctx.strokeStyle = 'rgba(236,190,110,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(doX, ly); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  kroki.forEach((k, i) => {
    const x = lx0 + i * krok;
    const r = i === biezacy && !k.zrobiony ? rozm * 0.42 : rozm * 0.32;
    ctx.beginPath(); ctx.arc(x, ly, r, 0, Math.PI * 2);
    if (k.zrobiony) {
      ctx.fillStyle = 'rgba(236,190,110,0.95)'; ctx.fill();
    } else if (i === biezacy) {
      ctx.fillStyle = 'rgba(11,8,7,1)'; ctx.fill();
      ctx.strokeStyle = `rgba(252,212,140,${0.6 + 0.4 * puls})`; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, ly, r + 3 + puls * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(252,212,140,${0.25 * (1 - puls)})`; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(11,8,7,1)'; ctx.fill();
      ctx.strokeStyle = 'rgba(207,194,166,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // ostatni krok to rdzeń — mały żar zamiast zwykłego kółka
    if (i === n - 1) {
      ctx.fillStyle = k.zrobiony ? 'rgba(255,230,180,1)' : 'rgba(200,70,48,0.8)';
      ctx.beginPath(); ctx.arc(x, ly, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    const t = k.nazwa + (k.dopisek ? ` ${k.dopisek}` : '');
    ctx.font = `${i === biezacy ? '' : 'italic '}${rozm * (i === biezacy ? 0.95 : 0.85)}px ${SERIF}`;
    ctx.fillStyle = k.zrobiony ? 'rgba(236,200,140,0.8)' : i === biezacy ? `rgba(252,222,160,${0.85 + 0.15 * puls})` : 'rgba(170,158,138,0.55)';
    ctx.fillText(t, x, ly + rozm * 1.45, krok * 1.1);
  });
  ctx.restore();
  return { x: x0, y: y0 - rozm * 0.6, w: szer, h: wys + rozm * 0.6 };
}
