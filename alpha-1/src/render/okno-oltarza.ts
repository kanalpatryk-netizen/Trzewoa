import type { Plate } from './plate';
import type { Sim } from '../sim/sim';
import { SERIF, akapit, linieAkapitu } from './ink';
import { tablica } from './fresk';
import { FRESK } from '../nastawy/barwy';
import { OLTARZ, NAZWA_RYTUALU, RYTUALY, type RodzajRytualu } from '../nastawy/oltarz';
import { czemuNie, cenaRytualu, krewZOfiary, polegli, pobozniPrzyOltarzu, rytualOltarza } from '../sim/oltarz';
import { NAZWA_ROLI, liczRole } from '../sim/lud';
import { LUD } from '../nastawy/lud';

/**
 * OKNO OŁTARZA (Alpha, etap 3d) — jasna tablica tynku jak karta wydarzenia: kto stoi przy ołtarzu, a pod spodem
 * rytuały, każdy jako duże pole z ceną we krwi po prawej i jednym zdaniem skutku. Na co cię nie stać albo czego
 * nie da się teraz odprawić, jest przygaszone, z powodem na czerwono. Wskrzeszenie — osobne pole dla każdego
 * poległego, którego ciało jeszcze leży. Czas biegnie dalej: pobożny może w tym czasie dojść do ołtarza.
 */

const PISMO = {
  naglowek: FRESK.czerwien, tytul: '#2a1810', tekst: 'rgba(58,38,24,0.92)',
  wybor: '#2a1810', wyborNie: 'rgba(80,62,48,0.72)', skutek: 'rgba(62,40,26,0.9)', skutekNie: 'rgba(80,62,48,0.62)',
  cena: '#7e2c16', daje: '#2f6a2a', powod: '#b0301c', ramka: 'rgba(142,58,34,0.8)', ramkaNie: 'rgba(110,90,70,0.4)', stopka: 'rgba(90,64,44,0.8)',
};

/** Pole okna: rytuał (dla wskrzeszenia z numerem poległego), przywołanie pobożnego, zamknięcie albo tło karty. */
export interface PoleOltarza { akcja: 'rytual' | 'przywolaj' | 'zamknij' | 'tlo'; rodzaj?: RodzajRytualu; cel?: number; ok: boolean; x: number; y: number; w: number; h: number }

interface Wiersz { akcja: 'rytual' | 'przywolaj'; rodzaj?: RodzajRytualu; cel?: number; tekst: string; cena: string; daje: boolean; skutek: string; powod: string | null }

/** Ile temu (sekundy albo minuty gry). */
function ileTemu(tikow: number): string {
  const s = Math.max(1, Math.round(tikow / 120));
  return s < 90 ? `${s} s temu` : `${Math.round(s / 60)} min temu`;
}

function wiersze(sim: Sim): Wiersz[] {
  const R = OLTARZ.rytualy;
  const out: Wiersz[] = [];
  const nikogo = !pobozniPrzyOltarzu(sim).length && !rytualOltarza(sim);
  if (nikogo && liczRole(sim).pobozny > 0) {
    out.push({ akcja: 'przywolaj', tekst: 'Przywołaj pobożnego', cena: 'za darmo', daje: false, skutek: 'Najbliższy pobożny przyjdzie do ołtarza i zostanie przy nim, modląc się.', powod: null });
  }
  const skutki: Record<RodzajRytualu, string> = {
    modlitwa: `Pobożny klęczy, od krzyża biją promienie. +${R.modlitwa.wiara} wiary przez ${Math.round(R.modlitwa.tikow / 120)} s.`,
    szal: `Krew spływa do misy, płonie krąg znaków. Rycerz przez ${Math.round(R.szal.trwa / 7200)} min bije ${String(R.szal.sila).replace('.', ',')} raza mocniej.`,
    wskrzeszenie: 'Ciało wstaje przy ołtarzu i wraca do drużyny.',
    ofiaraKrwi: `Pobożny upuszcza krwi do misy (+${LUD.okaleczenieKrew} krwi). Słabnie, póki nie wyśpi się w sypialni.`,
    ofiaraZycia: `Pobożny oddaje życie na ołtarzu (+${LUD.ofiaraKrew} krwi). Jego ciało można potem wskrzesić.`,
  };
  for (const rodzaj of RYTUALY) {
    const daje = krewZOfiary(rodzaj) > 0;
    const cena = daje ? `+${krewZOfiary(rodzaj)} krwi` : `${cenaRytualu(rodzaj)} krwi`;
    if (rodzaj === 'wskrzeszenie') {
      const lista = polegli(sim).slice(0, 3);
      if (!lista.length) { out.push({ akcja: 'rytual', rodzaj, tekst: NAZWA_RYTUALU[rodzaj], cena, daje, skutek: skutki[rodzaj], powod: czemuNie(sim, rodzaj) }); continue; }
      for (const t of lista) {
        out.push({ akcja: 'rytual', rodzaj, cel: t.id, tekst: `Wskrześ: ${NAZWA_ROLI[t.rola].toLowerCase()} (poległ ${ileTemu(sim.tick - t.od)})`, cena, daje, skutek: skutki[rodzaj], powod: czemuNie(sim, rodzaj, t.id) });
      }
      continue;
    }
    out.push({ akcja: 'rytual', rodzaj, tekst: NAZWA_RYTUALU[rodzaj], cena, daje, skutek: skutki[rodzaj], powod: czemuNie(sim, rodzaj) });
  }
  return out;
}

/** Co dzieje się przy ołtarzu — jedno zdanie pod tytułem. */
function stanOltarza(sim: Sim): string {
  const r = rytualOltarza(sim);
  if (r) return `Trwa rytuał: ${NAZWA_RYTUALU[r.rodzaj].toLowerCase()} — ${Math.round(Math.min(1, (sim.tick - r.od) / Math.max(1, r.do - r.od)) * 100)}%. Pobożny klęczy przy ołtarzu.`;
  const n = pobozniPrzyOltarzu(sim).length;
  if (n) return `Przy ołtarzu stoi ${n > 1 ? `${n} pobożnych` : 'pobożny'}. Wybierz rytuał — zapłacisz krwią (masz ${Math.floor(sim.krew)}).`;
  return 'Przy ołtarzu nie stoi żaden pobożny. Przywołaj go albo zaznacz pobożnego i dotknij ołtarza.';
}

/** Rysuje okno ołtarza; zwraca pola do dotknięcia (podświetla to pod wskaźnikiem). */
export function rysujOknoOltarza(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, teraz: number, wskaznik: { x: number; y: number }, oltarz?: { x: number; pol: number }): PoleOltarza[] {
  const lista = wiersze(sim);
  const opis = stanOltarza(sim);
  // okno staje z boku płyty, po tej stronie ołtarza, gdzie jest więcej miejsca, i nie zachodzi na niego —
  // widać, jak pobożny dochodzi i klęka (na wąskim ekranie: cała szerokość)
  const lewo = oltarz ? oltarz.x - p.x : 0, prawo = oltarz ? p.x + p.w - oltarz.x : 0;
  const miejsce = Math.max(lewo, prawo) - (oltarz?.pol ?? 0) - 22;
  const szer = p.waski ? p.w - 16 : Math.min(560, Math.max(320, oltarz ? miejsce : p.w * (p.niski ? 0.6 : 0.5)));
  const maxWys = p.h - 16;
  const zmierz = (rz: number) => {
    const wew = szer - rz * 2.2;
    ctx.save();
    ctx.font = `italic ${rz * 0.9}px ${SERIF}`;
    const lOpis = linieAkapitu(ctx, opis, wew);
    const przyc = lista.map((w) => {
      ctx.font = `${rz * 0.98}px ${SERIF}`;
      const cw = ctx.measureText(w.cena).width;
      const lEt = linieAkapitu(ctx, w.tekst, wew - rz * 1.4 - cw - rz);
      ctx.font = `italic ${rz * 0.78}px ${SERIF}`;
      const lSk = linieAkapitu(ctx, w.skutek, wew - rz * 1.4) + (w.powod ? linieAkapitu(ctx, `Teraz nie: ${w.powod}.`, wew - rz * 1.4) : 0);
      return { lEt, lSk, h: rz * 0.7 + lEt * rz * 1.18 + lSk * rz * 0.98 + rz * 0.5 };
    });
    ctx.restore();
    const h = rz * 1.4 + rz * 1.6 + rz * 1.2 + lOpis * rz * 1.15 + rz * 0.5 + przyc.reduce((s, b) => s + b.h + rz * 0.4, 0) + rz * 1.3;
    return { rz, wew, lOpis, przyc, h };
  };
  let u = zmierz(Math.max(13, Math.min(18, p.w / 32)));
  for (let rz = u.rz; rz >= 10 && u.h > maxWys; rz -= 1) u = zmierz(rz);
  const { rz, wew, przyc } = u;
  const wys = Math.min(u.h, maxWys);
  const x = p.waski || !oltarz ? p.x + (p.w - szer) / 2 : prawo > lewo ? p.x + p.w - szer - 14 : p.x + 14;
  const y = p.y + 8;
  const puls = 0.5 + 0.5 * Math.sin(teraz * 0.004);
  const pola: PoleOltarza[] = [];

  // tło karty: dotknięcie go nic nie robi (okno zamyka dopiero dotknięcie poza nim)
  pola.push({ akcja: 'tlo', ok: true, x: x - 3, y: y - 3, w: szer + 6, h: wys + 6 });
  ctx.save();
  tablica(ctx, x, y, szer, wys, true);
  ctx.strokeStyle = `rgba(224,176,104,${0.45 + 0.35 * puls})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);
  const lx = x + rz * 1.1;
  let yy = y + rz * 1.4;
  ctx.textAlign = 'left';
  ctx.font = `${rz * 0.66}px ${SERIF}`;
  ctx.fillStyle = PISMO.naglowek;
  ctx.fillText('O Ł T A R Z   ·   R Y T U A Ł Y', lx, yy, wew - rz * 3);
  // zamknij ×
  ctx.font = `${rz * 1.1}px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = PISMO.cena;
  ctx.fillText('×', lx + wew, yy + rz * 0.1);
  const zw = Math.max(rz * 1.8, 34);
  pola.push({ akcja: 'zamknij', ok: true, x: lx + wew - zw + rz * 0.4, y: yy - zw / 2 - rz * 0.3, w: zw, h: zw });
  ctx.textAlign = 'left';
  yy += rz * 1.6;
  ctx.font = `${rz * 1.25}px ${SERIF}`;
  ctx.fillStyle = PISMO.tytul;
  ctx.fillText('Ołtarz pod światłem', lx, yy, wew);
  yy += rz * 1.2;
  ctx.font = `italic ${rz * 0.9}px ${SERIF}`;
  ctx.fillStyle = PISMO.tekst;
  akapit(ctx, opis, lx, yy, wew, rz * 1.15);
  yy += u.lOpis * rz * 1.15 + rz * 0.2;

  lista.forEach((w, i) => {
    const b = przyc[i];
    const ok = !w.powod;
    const bx = lx - rz * 0.3, bw = wew + rz * 0.6, by = yy, bh = b.h;
    const pod = ok && wskaznik.x >= bx && wskaznik.x <= bx + bw && wskaznik.y >= by && wskaznik.y <= by + bh;
    ctx.fillStyle = ok ? `rgba(142,58,34,${(pod ? 0.14 : 0.05) + 0.04 * puls})` : 'rgba(40,24,14,0.04)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = ok ? PISMO.ramka : PISMO.ramkaNie;
    ctx.lineWidth = pod ? 2 : 1.2;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.font = `${rz * 0.98}px ${SERIF}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = !ok ? PISMO.powod : w.daje ? PISMO.daje : PISMO.cena;
    ctx.fillText(w.cena, bx + bw - rz * 0.6, by + rz * 1.35);
    ctx.textAlign = 'left';
    ctx.fillStyle = ok ? PISMO.wybor : PISMO.wyborNie;
    let ty = by + rz * 1.35;
    ctx.font = `${rz * 0.98}px ${SERIF}`;
    akapit(ctx, w.tekst, bx + rz * 0.6, ty, wew - rz * 1.4 - ctx.measureText(w.cena).width - rz, rz * 1.18);
    ty += (b.lEt - 1) * rz * 1.18 + rz * 1.02;
    ctx.font = `italic ${rz * 0.78}px ${SERIF}`;
    ctx.fillStyle = ok ? PISMO.skutek : PISMO.skutekNie;
    const n = akapit(ctx, w.skutek, bx + rz * 0.6, ty, wew - rz * 1.4, rz * 0.98);
    if (w.powod) {
      // czemu teraz nie — na czerwono, pod skutkiem
      ctx.fillStyle = PISMO.powod;
      akapit(ctx, `Teraz nie: ${w.powod}.`, bx + rz * 0.6, ty + n * rz * 0.98, wew - rz * 1.4, rz * 0.98);
    }
    pola.push({ akcja: w.akcja, rodzaj: w.rodzaj, cel: w.cel, ok, x: bx, y: by, w: bw, h: bh });
    yy += bh + rz * 0.4;
  });
  ctx.font = `italic ${Math.max(11, rz * 0.7)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = PISMO.stopka;
  ctx.fillText('dotknij rytuału · dotknij poza oknem, by je zamknąć', lx + wew / 2, y + wys - rz * 0.5);
  ctx.restore();
  return pola;
}
