import type { Plate } from './plate';
import type { Sim } from '../sim/sim';
import type { Wydarzenie } from '../sim/wydarzenia';
import { SERIF, akapit, linieAkapitu } from './ink';
import { tablica } from './fresk';
import { fryz, wpiszFresk } from './freski';
import { FRESK } from '../nastawy/barwy';
import { FRESKI } from '../nastawy/wyglad/freski';

/** Pismo na jasnym tynku: brąz, sinopia i czerwień ziemi zamiast jasnego atramentu. */
const PISMO = {
  naglowek: FRESK.czerwien, tytul: '#2a1810', tekst: 'rgba(58,38,24,0.92)',
  wybor: '#2a1810', wyborNie: 'rgba(80,62,48,0.72)', skutek: 'rgba(62,40,26,0.9)', skutekNie: 'rgba(80,62,48,0.62)',
  cena: '#7e2c16', cenaNie: '#c0301c', ramka: 'rgba(142,58,34,0.8)', ramkaNie: 'rgba(110,90,70,0.4)', stopka: 'rgba(90,64,44,0.8)',
};

export interface PoleWyboru { i: number; x: number; y: number; w: number; h: number }

/**
 * Karta wydarzenia: co się dzieje, a pod spodem wybory — każdy jako duże pole z ceną
 * po prawej i jednym zdaniem skutku. Czas stoi, póki nie wybierzesz. Na co cię nie stać,
 * jest przygaszone i ma cenę na czerwono.
 *
 * Karta to jasna tablica tynku jak fresk z Faras: u góry fryz z tancerzami (Arlanza),
 * po lewej wycinek malowidła dobrany do wydarzenia (FRESKI.wydarzenia).
 */
export function rysujWydarzenie(ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, e: Wydarzenie, teraz: number): PoleWyboru[] {
  const szer = p.waski ? p.w - 16 : Math.min(600, Math.max(340, p.w * (p.niski ? 0.66 : 0.55)));
  const maxWys = p.h - 16;
  const cena = (i: number) => {
    const w = e.wybory[i];
    const cz: string[] = [];
    if (w.krew) cz.push(`${w.krew} krwi`);
    if (w.wiara) cz.push(`${w.wiara} wiary`);
    return cz.length ? cz.join(' · ') : 'za darmo';
  };
  const stac = (i: number) => sim.krew - sim.rezerwa.krew >= e.wybory[i].krew && sim.wiara - sim.rezerwa.wiara >= e.wybory[i].wiara;

  // fresk po lewej tylko na szerokiej karcie, fryz tylko na wysokiej płycie
  let ilW = szer >= FRESKI.ilustracjaOdSzerokosci ? szer * FRESKI.ilustracjaCzesc : 0;
  const zFryzem = p.h >= FRESKI.fryzOdWysokosci;
  // układ liczony przed rysowaniem — karta musi się zmieścić na płycie, więc litery maleją
  const zmierz = (rz: number) => {
    const fh = zFryzem ? rz * FRESKI.fryzWys : 0;
    const wew = szer - ilW - rz * 2.2;
    ctx.save();
    ctx.font = `italic ${rz * 0.9}px ${SERIF}`;
    const lTekst = linieAkapitu(ctx, e.tekst, wew);
    const przyc = e.wybory.map((w, i) => {
      ctx.font = `${rz * 0.98}px ${SERIF}`;
      const cw = ctx.measureText(cena(i)).width;
      const lEt = linieAkapitu(ctx, w.tekst, wew - rz * 1.4 - cw - rz);
      ctx.font = `italic ${rz * 0.78}px ${SERIF}`;
      const lSk = linieAkapitu(ctx, w.skutek, wew - rz * 1.4);
      return { lEt, lSk, h: rz * 0.7 + lEt * rz * 1.18 + lSk * rz * 0.98 + rz * 0.55 };
    });
    ctx.restore();
    const h = fh + rz * 1.4 + rz * 1.6 + rz * 1.2 + lTekst * rz * 1.15 + rz * 0.6
      + przyc.reduce((s, b) => s + b.h + rz * 0.45, 0) + rz * 1.2;
    return { rz, fh, wew, lTekst, przyc, h };
  };
  const dopasuj = () => {
    let m = zmierz(Math.max(14, Math.min(19, p.w / 30)));
    for (let rz = m.rz; rz >= 11 && m.h > maxWys; rz -= 1) m = zmierz(rz);
    return m;
  };
  let u = dopasuj();
  // fresk zabiera tekstowi szerokość — gdy przez niego karta nie mieści się na płycie, odpada
  if (ilW && u.h > maxWys) { ilW = 0; u = dopasuj(); }
  const { rz, fh, wew, przyc } = u;
  const wys = Math.min(u.h, maxWys);
  const x = p.x + (p.w - szer) / 2;
  const y = p.y + 8;
  const puls = 0.5 + 0.5 * Math.sin(teraz * 0.004);

  ctx.save();
  tablica(ctx, x, y, szer, wys, true);
  ctx.strokeStyle = `rgba(224,176,104,${0.45 + 0.35 * puls})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);
  const brzeg = Math.max(3, Math.min(6, Math.min(szer, wys) * 0.03)) + 1;
  if (fh) fryz(ctx, x + brzeg, y + brzeg, szer - brzeg * 2, fh - brzeg);
  if (ilW) {
    const fresk = FRESKI.wydarzenia[e.rodzaj] ?? FRESKI.wydarzenieInne;
    const gora = y + fh + rz * 0.9, dol = y + wys - rz * 1.6;
    const iw = ilW - rz * 0.5, ih = Math.min(dol - gora, iw * 1.7);
    wpiszFresk(ctx, fresk, x + rz * 0.7, gora + (dol - gora - ih) / 2, iw, ih);
  }

  const lx = x + ilW + rz * 1.1;
  let yy = y + fh + rz * 1.4;
  ctx.textAlign = 'left';
  ctx.font = `${rz * 0.66}px ${SERIF}`;
  ctx.fillStyle = PISMO.naglowek;
  ctx.fillText('W Y D A R Z E N I E   ·   C Z A S   S T O I', lx, yy, wew);
  yy += rz * 1.6;
  ctx.font = `${rz * 1.25}px ${SERIF}`;
  ctx.fillStyle = PISMO.tytul;
  ctx.fillText(e.tytul, lx, yy, wew);
  yy += rz * 1.2;
  ctx.font = `italic ${rz * 0.9}px ${SERIF}`;
  ctx.fillStyle = PISMO.tekst;
  akapit(ctx, e.tekst, lx, yy, wew, rz * 1.15);
  yy += u.lTekst * rz * 1.15 + rz * 0.1;

  const pola: PoleWyboru[] = [];
  e.wybory.forEach((w, i) => {
    const b = przyc[i];
    const ok = stac(i);
    const bx = lx - rz * 0.3, bw = wew + rz * 0.6, by = yy, bh = b.h;
    ctx.fillStyle = ok ? `rgba(142,58,34,${0.05 + 0.04 * puls})` : 'rgba(40,24,14,0.04)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = ok ? PISMO.ramka : PISMO.ramkaNie;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    // cena po prawej
    ctx.font = `${rz * 0.98}px ${SERIF}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = ok ? PISMO.cena : PISMO.cenaNie;
    const c = cena(i);
    ctx.fillText(c, bx + bw - rz * 0.6, by + rz * 1.35);
    // co robisz
    ctx.textAlign = 'left';
    ctx.fillStyle = ok ? PISMO.wybor : PISMO.wyborNie;
    let ty = by + rz * 1.35;
    ctx.font = `${rz * 0.98}px ${SERIF}`;
    akapit(ctx, `${i + 1}. ${w.tekst}`, bx + rz * 0.6, ty, wew - rz * 1.4 - ctx.measureText(c).width - rz, rz * 1.18);
    ty += (b.lEt - 1) * rz * 1.18 + rz * 1.02;
    // co z tego wyniknie
    ctx.font = `italic ${rz * 0.78}px ${SERIF}`;
    ctx.fillStyle = ok ? PISMO.skutek : PISMO.skutekNie;
    akapit(ctx, w.skutek, bx + rz * 0.6, ty, wew - rz * 1.4, rz * 0.98);
    pola.push({ i, x: bx, y: by, w: bw, h: bh });
    yy += bh + rz * 0.45;
  });
  ctx.font = `italic ${Math.max(11, rz * 0.7)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = PISMO.stopka;
  ctx.fillText('dotknij wyboru — czas ruszy dalej', lx + wew / 2, y + wys - rz * 0.5);
  ctx.restore();
  return pola;
}
