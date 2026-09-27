import type { Plate } from './plate';
import type { Sim } from '../sim/sim';
import { RACES, Race } from '../sim/races';
import { PIELGRZYMKA, RYTUAL } from '../nastawy/rytual';
import { Job } from '../sim/creatures';
import { cost } from '../powers/powers';
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
  const prog = PIELGRZYMKA.oddanieNacji;
  const wiara = sim.wiara >= cost('znak', 'objawienie').wiara || sim.prayers > 0;
  // posłani szeptem „módl się” też są wiarą, która schodzi pod rdzeń
  let poslani = 0;
  for (const c of sim.creatures) if (!c.dead && c.job === Job.PIELGRZYM) poslani++;
  const wierza = oddanie > prog || r.pekniecia > 0 || poslani >= RYTUAL.potrzebaWiernych;
  let powrot = false;
  for (const k of sim.clans) if (!k.dead && k.devotion > prog && k.powrotOk) powrot = true;
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

/** Co zrobić teraz, żeby przejść do następnego kroku — i gdzie (dla kamery). */
export interface Teraz { tekst: string; cel?: { x: number; y: number; r: number; tekst: string } }

export function terazDrogi(sim: Sim): Teraz {
  const { kroki, biezacy } = krokiDrogi(sim);
  const w = sim.world;
  const przedsionek = { x: w.coreX, y: w.przedsionekY, r: 7, tekst: 'przedsionek' };
  let najw: Sim['clans'][number] | null = null;
  for (const k of sim.clans) {
    if (k.dead || k.pop < PIELGRZYMKA.minNacja || RACES[k.race].faithGain <= 0) continue;
    if (!najw || k.devotion > najw.devotion) najw = k;
  }
  const gniazdo = (k: Sim['clans'][number]) => ({ x: k.hx, y: k.hy, r: 5, tekst: k.name });
  switch (kroki[biezacy]?.nazwa) {
    case 'wiara': {
      const lud = sim.clans.filter((k) => !k.dead && k.race === Race.GOBLIN && k.pop > 0).sort((a, b) => b.pop - a.pop)[0];
      return { tekst: 'Zasiej rudę przy Ślepym Ludzie — postawią ołtarz i zaczną się modlić.', cel: lud ? gniazdo(lud) : undefined };
    }
    case 'oddanie':
      return najw
        ? { tekst: `Postaw Znak (objawienie) przy gnieździe: ${najw.name} — ${Math.round(najw.devotion * 100)}% z ${Math.round(PIELGRZYMKA.oddanieNacji * 100)}% oddania. Albo szepnij „módl się” trzem z nich.`, cel: gniazdo(najw) }
        : { tekst: 'Żadna nacja nie jest dość liczna, by w ciebie uwierzyć. Nakarm którąś.' };
    case 'droga':
      return sim.jedzeniePrzedsionka < PIELGRZYMKA.jedzenieWPrzedsionku
        ? { tekst: 'Zasiej grzyb przy przedsionku nad rdzeniem — z nim warta przeżyje na dole.', cel: przedsionek }
        : { tekst: `${najw ? najw.name : 'Wierni'} ruszą pod rdzeń. Możesz wydrążyć im prostszą drogę.`, cel: przedsionek };
    case 'skorupa':
      return { tekst: `Wierni kują skorupę (${sim.rytual.pekniecia} pęknięć). Pilnuj grzybu przy przedsionku.`, cel: przedsionek };
    default:
      return { tekst: 'Skorupa otwarta — wierni schodzą do rdzenia.', cel: { x: w.coreX, y: w.coreY, r: 5, tekst: 'rdzeń' } };
  }
}

/**
 * Rysuje drogę jako tor z pięcioma węzłami: zrobione są złote, bieżący pulsuje, dalsze
 * czekają puste. Pod węzłami nazwy kroków, nad wszystkim tytuł na zakładce ramki.
 * Zwraca prostokąt, w który można kliknąć (otwiera tablicę).
 */
export interface ObszarDrogi { x: number; y: number; w: number; h: number; linia: { x: number; y: number; w: number; h: number }; teraz: Teraz }

export function rysujDrogeDoWolnosci(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, teraz: number): ObszarDrogi {
  const { kroki, biezacy } = krokiDrogi(sim);
  const telefon = p.waski || p.niski;
  // na telefonie większe litery — 11 px było nie do przeczytania
  const rozm = telefon ? 13 : Math.max(12, Math.min(14, p.w / 90));
  const szer = p.waski ? p.w - 16 : p.niski ? Math.min(460, p.w * 0.55) : Math.max(300, Math.min(440, p.w * 0.38));
  // „teraz:” łamane do szerokości ramy — na telefonie zwykle w dwóch linijkach
  const co = terazDrogi(sim);
  ctx.save();
  ctx.font = `italic ${rozm * 0.9}px ${SERIF}`;
  const linieTeraz = lamLinie(ctx, `teraz: ${co.tekst}`, szer - 20).slice(0, 3);
  ctx.restore();
  // podpisy węzłów („oddanie 45%”) stykały się z pierwszą linijką „teraz:” — na telefonie tor jest wyższy
  const wysToru = rozm * (telefon ? 3.8 : 3.3);
  // „pokaż ›” dostaje własny wiersz: przy dłuższej radzie wchodziło na jej koniec
  const wys = wysToru + linieTeraz.length * rozm * 1.15 + rozm * (co.cel ? 1.2 : 0.5);
  const x0 = p.waski ? p.x + 8 : p.x + 12;
  // TELEFON: na dole płyty — u góry, pod powierzchnią, mieszkają ludy i wstęga je zasłaniała
  const y0 = telefon ? p.y + p.h - wys - 10 : p.y + 12;
  ramaKarty(ctx, x0, y0, szer, wys, 0.92, 'droga do wolności', true);

  const n = kroki.length;
  const lx0 = x0 + szer * 0.1, lx1 = x0 + szer * 0.9;
  const ly = y0 + wysToru * 0.4;
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
  // co teraz — konkretna czynność; dotknięcie tej linii wiezie kamerę na miejsce
  const yl = y0 + wysToru + rozm * 0.2;
  ctx.strokeStyle = 'rgba(207,194,166,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0 + 10, yl - rozm * 0.75); ctx.lineTo(x0 + szer - 10, yl - rozm * 0.75); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `italic ${rozm * 0.9}px ${SERIF}`;
  linieTeraz.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? 'rgba(244,226,190,0.95)' : 'rgba(232,214,180,0.9)';
    ctx.fillText(l, x0 + 10, yl + i * rozm * 1.15);
  });
  if (co.cel) {
    ctx.fillStyle = `rgba(252,212,140,${0.55 + 0.35 * puls})`;
    ctx.textAlign = 'right';
    ctx.font = `${rozm * 0.8}px ${SERIF}`;
    ctx.fillText('pokaż ›', x0 + szer - 10, y0 + wys - rozm * 0.45);
  }
  ctx.restore();
  return {
    x: x0, y: y0 - rozm * 0.6, w: szer, h: wysToru + rozm * 0.6,
    linia: { x: x0, y: y0 + wysToru - rozm * 0.4, w: szer, h: wys - wysToru + rozm * 0.4 },
    teraz: co,
  };
}

/** Tekst łamany na linijki o zadanej szerokości. */
function lamLinie(ctx: CanvasRenderingContext2D, tekst: string, maxW: number): string[] {
  const wynik: string[] = [];
  let linia = '';
  for (const s of tekst.split(' ')) {
    const test = linia ? `${linia} ${s}` : s;
    if (ctx.measureText(test).width > maxW && linia) { wynik.push(linia); linia = s; } else linia = test;
  }
  if (linia) wynik.push(linia);
  return wynik;
}
