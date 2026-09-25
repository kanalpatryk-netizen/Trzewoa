import type { Plate } from './plate';
import type { Alarm } from '../app/alarmy';
import { SERIF, panel, akapit, linieAkapitu } from './ink';
import { BARWA, rgba } from './palette';

export interface PoleAlarmu { akcja: 'planuj' | 'pusc' | 'wycisz'; x: number; y: number; w: number; h: number }

/**
 * Karta sytuacji przy auto-pauzie: co się stało, dlaczego to ważne i co możesz
 * z tym zrobić. Gra stoi, dopóki nie zdecydujesz — „planuj" zamyka kartę i zostawia
 * pauzę, „puść czas" rusza świat od razu.
 */
export function rysujAlarm(ctx: CanvasRenderingContext2D, p: Plate, a: Alarm, teraz: number): PoleAlarmu[] {
  const rozm = Math.max(15, Math.min(21, p.w / 54));
  const szer = p.waski ? p.w - 16 : Math.min(520, p.w * 0.6);
  const wew = szer - 44;
  ctx.save();
  ctx.font = `italic ${rozm * 0.92}px ${SERIF}`;
  const lTekst = linieAkapitu(ctx, a.tekst, wew);
  ctx.font = `${rozm}px ${SERIF}`;
  const lRada = linieAkapitu(ctx, a.rada, wew - rozm * 1.2);
  const wys = rozm * (1.2 + 1.9 + 0.4) + lTekst * rozm * 1.22 + rozm * 1.5 + lRada * rozm * 1.3 + rozm * 3.4;
  const x = p.x + (p.w - szer) / 2;
  const y = p.y + (p.waski ? 10 : Math.max(12, p.h * 0.06));
  const puls = 0.5 + 0.5 * Math.sin(teraz * 0.004);

  panel(ctx, x, y, szer, wys, 0.96);
  ctx.strokeStyle = a.kryzys ? `rgba(214,96,76,${0.5 + 0.4 * puls})` : `rgba(224,176,104,${0.4 + 0.3 * puls})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);

  const lx = x + 22;
  let yy = y + rozm * 1.25;
  ctx.textAlign = 'left';
  ctx.font = `${rozm * 0.7}px ${SERIF}`;
  ctx.fillStyle = a.kryzys ? 'rgba(226,120,100,0.95)' : rgba(BARWA.zarBlady, 0.9);
  ctx.fillText((a.kryzys ? 'KRYZYS · CZAS STANĄŁ' : 'WYDARZENIE · CZAS STANĄŁ').split('').join(' '), lx, yy);
  yy += rozm * 1.6;
  ctx.font = `${rozm * 1.3}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
  ctx.fillText(a.tytul, lx, yy);
  yy += rozm * 1.15;
  ctx.font = `italic ${rozm * 0.92}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atrament, 0.85);
  akapit(ctx, a.tekst, lx, yy, wew, rozm * 1.22);
  yy += lTekst * rozm * 1.22 + rozm * 0.55;

  // co możesz zrobić — wyróżnione, bo po to jest ta karta
  ctx.font = `${rozm * 0.7}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
  ctx.fillText('C O   M O Ż E S Z', lx, yy);
  yy += rozm * 1.25;
  ctx.fillStyle = rgba(BARWA.zarBlady, 0.9);
  ctx.beginPath();
  ctx.moveTo(lx + 2, yy - rozm * 0.62); ctx.lineTo(lx + rozm * 0.62, yy - rozm * 0.34); ctx.lineTo(lx + 2, yy - rozm * 0.06);
  ctx.closePath(); ctx.fill();
  ctx.font = `${rozm}px ${SERIF}`;
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.97);
  akapit(ctx, a.rada, lx + rozm * 1.2, yy, wew - rozm * 1.2, rozm * 1.3);

  // przyciski
  const by = y + wys - rozm * 1.3;
  const pola: PoleAlarmu[] = [];
  const przycisk = (akcja: PoleAlarmu['akcja'], tekst: string, px: number, glowny: boolean): number => {
    ctx.font = `${rozm * 0.98}px ${SERIF}`;
    const bw = ctx.measureText(tekst).width + rozm * 1.5, bh = rozm * 1.8;
    const bx = px - bw;
    ctx.fillStyle = glowny ? `rgba(224,176,104,${0.16 + 0.1 * puls})` : 'rgba(255,255,255,0.03)';
    ctx.fillRect(bx, by - bh * 0.68, bw, bh);
    ctx.strokeStyle = glowny ? `rgba(224,176,104,${0.7 + 0.3 * puls})` : 'rgba(206,192,166,0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx + 0.5, by - bh * 0.68 + 0.5, bw - 1, bh - 1);
    ctx.fillStyle = glowny ? 'rgba(250,238,212,1)' : 'rgba(220,208,184,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText(tekst, bx + bw / 2, by);
    pola.push({ akcja, x: bx + bw / 2, y: by - bh * 0.18, w: bw, h: bh });
    return bx - rozm * 0.6;
  };
  let px = x + szer - 18;
  px = przycisk('planuj', 'Planuj →', px, true);
  przycisk('pusc', 'puść czas', px, false);
  ctx.font = `italic ${Math.max(12, rozm * 0.7)}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
  const t = 'nie zatrzymuj przy tym';
  const tw = ctx.measureText(t).width;
  if (lx + tw < px - rozm * 3) {
    ctx.fillText(t, lx, by);
    pola.push({ akcja: 'wycisz', x: lx + tw / 2, y: by - rozm * 0.3, w: tw + 12, h: rozm * 1.6 });
  }
  ctx.restore();
  return pola;
}
