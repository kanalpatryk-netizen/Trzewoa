import type { Sim, ChronicleEntry } from '../sim/sim';
import type { Plate } from './plate';
import { SERIF, panel, naciecie } from './ink';

export interface TrafienieZapisku { x: number; y: number; w: number; h: number; wpis: ChronicleEntry; }

/** Ile tików trwa jeden „obrót" — jednostka czasu, którą kronika liczy zamiast zegara. */
const OBROT = 600;

export function czasWpisu(tick: number): string {
  const o = Math.floor(tick / OBROT);
  return o < 1 ? 'na początku' : `obrót ${o}`;
}

const BARWY: Record<ChronicleEntry['kind'], [number, number, number]> = {
  krew: [222, 120, 100],
  wiara: [238, 220, 176],
  otchlan: [226, 228, 238],
  koniec: [248, 230, 200],
  swiat: [214, 202, 180],
};

/**
 * Pełna kronika: wszystko, co góra zapamiętała, od najnowszego. Wpisy z miejscem
 * można kliknąć — wzrok idzie tam, gdzie się to stało.
 */
export function rysujZapiski(
  ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, vw: number, vh: number, przewin: number,
): { trafienia: TrafienieZapisku[]; maxPrzewin: number; zamknij: { x: number; y: number; w: number; h: number } } {
  const szer = Math.min(760, vw * 0.82);
  const wys = Math.min(vh * 0.8, 620);
  const x = p.x + (p.w - szer) / 2;
  const y = p.y + (p.h - wys) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(8,6,5,0.72)';
  ctx.fillRect(0, 0, vw, vh);
  panel(ctx, x, y, szer, wys, 0.97);

  const tytul = Math.max(20, Math.min(30, szer / 22));
  ctx.textAlign = 'left';
  ctx.font = `600 ${tytul}px ${SERIF}`;
  ctx.fillStyle = 'rgba(244,230,202,0.96)';
  ctx.fillText('ZAPISKI', x + 26, y + 20 + tytul);
  naciecie(ctx, x + szer / 2, y + 32 + tytul, szer - 52, 0.5);

  ctx.font = `italic ${Math.max(14, szer / 52)}px ${SERIF}`;
  ctx.fillStyle = 'rgba(206,192,166,0.7)';
  ctx.textAlign = 'right';
  ctx.fillText('kliknij wpis, by tam spojrzeć', x + szer - 26, y + 20 + tytul);

  const rozmiar = Math.max(14, Math.min(18, szer / 44));
  const lh = rozmiar * 1.62;
  const gora = y + 48 + tytul;
  const dol = y + wys - 26;
  const widocznych = Math.floor((dol - gora) / lh);
  const wpisy = [...sim.chronicle].reverse();
  const maxPrzewin = Math.max(0, wpisy.length - widocznych);
  const od = Math.max(0, Math.min(maxPrzewin, Math.round(przewin)));

  const trafienia: TrafienieZapisku[] = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 12, gora - lh * 0.8, szer - 24, dol - gora + lh * 0.6);
  ctx.clip();

  for (let i = 0; i < widocznych; i++) {
    const e = wpisy[od + i];
    if (!e) break;
    const ly = gora + i * lh + rozmiar;
    const col = BARWY[e.kind];
    const maMiejsce = e.x !== undefined;

    ctx.textAlign = 'left';
    ctx.font = `italic ${rozmiar * 0.82}px ${SERIF}`;
    ctx.fillStyle = 'rgba(182,170,150,0.72)';
    const stempel = czasWpisu(e.tick);
    ctx.fillText(stempel, x + 26, ly);
    const wciecie = Math.max(96, ctx.measureText('obrót 000').width + 18);

    ctx.font = `${rozmiar}px ${SERIF}`;
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${maMiejsce ? 0.96 : 0.8})`;
    let tekst = e.text;
    const maxW = szer - wciecie - 52;
    while (ctx.measureText(tekst).width > maxW && tekst.length > 12) tekst = tekst.slice(0, -2);
    if (tekst !== e.text) tekst += '…';
    ctx.fillText(tekst, x + 26 + wciecie, ly);

    if (maMiejsce) {
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 26 + wciecie, ly + rozmiar * 0.28);
      ctx.lineTo(x + 26 + wciecie + ctx.measureText(tekst).width, ly + rozmiar * 0.28);
      ctx.stroke();
      trafienia.push({ x: x + 20, y: ly - rozmiar, w: szer - 40, h: lh, wpis: e });
    }
  }
  ctx.restore();

  if (maxPrzewin > 0) {                       // rysa na marginesie zamiast paska
    const h = (dol - gora) * (widocznych / wpisy.length);
    const t = od / maxPrzewin;
    ctx.strokeStyle = 'rgba(206,192,166,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + szer - 14, gora + (dol - gora - h) * t);
    ctx.lineTo(x + szer - 14, gora + (dol - gora - h) * t + h);
    ctx.stroke();
  }

  const zk = Math.max(16, rozmiar);
  const zamknij = { x: x + szer - 34, y: y + wys - 34, w: 28, h: 28 };
  ctx.textAlign = 'center';
  ctx.font = `italic ${zk}px ${SERIF}`;
  ctx.fillStyle = 'rgba(214,200,172,0.8)';
  ctx.fillText('zamknij', x + szer / 2, y + wys - 10);
  ctx.restore();
  return { trafienia, maxPrzewin, zamknij };
}
