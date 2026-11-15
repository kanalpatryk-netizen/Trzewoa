import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import type { Plate } from './plate';
import type { Rozkaz } from '../powers/rozkazy';
import { TOOLS } from '../powers/powers';
import { SERIF } from './ink';

/** Przycisk banera pauzy — gra sprawdza trafienie po środku i wymiarach. */
export interface PoleBanera { akcja: 'cofnij' | 'skresl' | 'pusc'; x: number; y: number; w: number; h: number }

const BARWY: Record<string, [number, number, number]> = {
  draz: [236, 226, 204], zawal: [206, 156, 96], woda: [132, 186, 226], zar: [255, 152, 64],
  ruda: [236, 204, 128], grzyb: [156, 214, 122], kosci: [224, 218, 200], trucizna: [204, 184, 244],
  objawienie: [250, 216, 136], panika: [230, 120, 100],
};

function etykieta(o: Rozkaz): string {
  return TOOLS[o.czasownik].find((t) => t.id === o.narzedzie)?.label ?? o.narzedzie;
}

/**
 * Szkice rozkazów wydanych w pauzie: przerywana kreska rylca w miejscu, w którym
 * wola stanie się ciałem. Kreska płynie powoli — plan jest żywy, ale jeszcze nie jest czynem.
 */
export function rysujRozkazy(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, lista: Rozkaz[], teraz: number): void {
  if (!lista.length) return;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (x: number) => (x - left) * z, sy = (y: number) => (y - top) * z;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineDashOffset = -teraz * 0.02;
  const rozm = Math.max(13, Math.min(18, z * 0.9));
  ctx.font = `italic ${rozm}px ${SERIF}`;
  ctx.textAlign = 'center';

  const podpis = (tekst: string, x: number, y: number, kol: [number, number, number]) => {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(tekst, x, y);
    ctx.fillStyle = `rgba(${kol[0]},${kol[1]},${kol[2]},0.95)`;
    ctx.fillText(tekst, x, y);
  };

  for (const o of lista) {
    const kol = BARWY[o.narzedzie] ?? [240, 226, 200];
    const k = `rgba(${kol[0]},${kol[1]},${kol[2]},`;
    let x = o.x + 0.5, y = o.y + 0.5;
    if (o.kto !== undefined) {
      const c = sim.creatureById(o.kto);
      if (c && !c.dead) { x = c.x; y = c.y - 0.4; }
    }
    const px = sx(x), py = sy(y);
    if (px < -80 || py < -80 || px > cam.vw + 80 || py > cam.vh + 80) continue;

    if (o.czasownik === 'zasiej') {
      const r = 2 * z;
      ctx.setLineDash([Math.max(3, z * 0.35), Math.max(3, z * 0.3)]);
      ctx.lineWidth = Math.max(1.4, z * 0.1);
      ctx.strokeStyle = `${k}0.95)`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // wnętrze szkicu: ukośne kreskowanie
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = `${k}0.35)`;
      ctx.lineWidth = 1;
      const krok = Math.max(4, z * 0.5);
      ctx.beginPath();
      for (let d = -r * 2; d < r * 2; d += krok) {
        ctx.moveTo(px + d - r, py - r); ctx.lineTo(px + d + r, py + r);
      }
      ctx.stroke();
      ctx.restore();
      podpis(etykieta(o), px, py - r - 6, kol);
    } else if (o.czasownik === 'znak') {
      // gwiazda Znaku i słaby krąg tych, którzy go zobaczą
      ctx.setLineDash([2, 7]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `${k}0.3)`;
      ctx.beginPath(); ctx.arc(px, py, 26 * z, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `${k}0.95)`;
      ctx.lineWidth = Math.max(1.5, z * 0.1);
      const u = Math.max(8, z * 0.9);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + teraz * 0.0004;
        ctx.moveTo(px + Math.cos(a) * u * 0.4, py + Math.sin(a) * u * 0.4);
        ctx.lineTo(px + Math.cos(a) * u * 1.2, py + Math.sin(a) * u * 1.2);
      }
      ctx.stroke();
      podpis(etykieta(o), px, py - u * 1.6, kol);
    } else {
      // szept celuje w jedno stworzenie — pierścień idzie za nim
      const r = Math.max(14, z * 1.4);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(226,214,250,0.95)';
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      podpis(`„${etykieta(o)}”`, px, py - r - 6, [230, 220, 250]);
    }
  }
  ctx.restore();
}

function odmianaRozkazu(n: number): string {
  if (n === 1) return 'rozkaz czeka';
  const d = n % 10, s = n % 100;
  return d >= 2 && d <= 4 && (s < 12 || s > 14) ? 'rozkazy czekają' : 'rozkazów czeka';
}

/**
 * Baner pauzy przy dolnej krawędzi płyty: czas stoi, ile rozkazów czeka i co już
 * zarezerwowano, a pod ręką „cofnij", „skreśl" i „puść czas".
 */
export function rysujBanerPauzy(
  ctx: CanvasRenderingContext2D, p: Plate, sim: Sim, ile: number, teraz: number, nadPrzyciskami: number,
): PoleBanera[] {
  const rozm = Math.max(15, Math.min(20, p.w / 58));
  const puls = 0.6 + 0.4 * Math.sin(teraz * 0.003);
  const r = sim.rezerwa;
  const koszty: string[] = [];
  if (r.krew > 0) koszty.push(`${Math.round(r.krew)} krwi`);
  if (r.wiara > 0) koszty.push(`${Math.round(r.wiara)} wiary`);
  if (r.otchlan > 0) koszty.push(`${Math.round(r.otchlan)} otchłani`);
  const tytul = 'CZAS STOI';
  const linia = ile ? `${ile} ${odmianaRozkazu(ile)}${koszty.length ? ' · zarezerwowane: ' + koszty.join(', ') : ''}`
    : 'Wydawaj rozkazy — staną się naraz, gdy puścisz czas.';

  ctx.save();
  ctx.font = `${rozm * 0.95}px ${SERIF}`;
  const przyciski: { akcja: PoleBanera['akcja']; tekst: string }[] = ile
    ? [{ akcja: 'cofnij', tekst: 'cofnij' }, { akcja: 'skresl', tekst: 'skreśl wszystko' }, { akcja: 'pusc', tekst: 'puść czas ▸' }]
    : [{ akcja: 'pusc', tekst: 'puść czas ▸' }];
  const szerP = przyciski.map((b) => ctx.measureText(b.tekst).width + rozm * 1.4);
  ctx.font = `italic ${rozm * 0.9}px ${SERIF}`;
  const szerL = ctx.measureText(linia).width;
  const szer = Math.min(p.w - 20, Math.max(szerL + rozm * 2, szerP.reduce((a, b) => a + b, 0) + rozm * 3));
  const wys = rozm * 4.6;
  const x = p.x + (p.w - szer) / 2;
  const y = p.y + p.h - wys - 12 - nadPrzyciskami;

  ctx.fillStyle = 'rgba(10,7,6,0.9)';
  ctx.fillRect(x, y, szer, wys);
  ctx.strokeStyle = `rgba(224,176,104,${0.45 + 0.35 * puls})`;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 3.5, y + 3.5, szer - 7, wys - 7);

  ctx.textAlign = 'center';
  ctx.font = `${rozm * 0.78}px ${SERIF}`;
  ctx.fillStyle = `rgba(232,186,112,${0.75 + 0.25 * puls})`;
  ctx.fillText(tytul.split('').join(' '), p.x + p.w / 2, y + rozm * 1.2);
  ctx.font = `italic ${rozm * 0.9}px ${SERIF}`;
  ctx.fillStyle = 'rgba(236,224,200,0.95)';
  let tekst = linia;
  while (ctx.measureText(tekst).width > szer - rozm && tekst.length > 10) tekst = tekst.slice(0, -2);
  ctx.fillText(tekst === linia ? linia : tekst + '…', p.x + p.w / 2, y + rozm * 2.35);

  const pola: PoleBanera[] = [];
  ctx.font = `${rozm * 0.95}px ${SERIF}`;
  const razem = szerP.reduce((a, b) => a + b, 0) + (przyciski.length - 1) * rozm * 0.6;
  let bx = p.x + (p.w - razem) / 2;
  const by = y + rozm * 3.55;
  for (let i = 0; i < przyciski.length; i++) {
    const b = przyciski[i], bw = szerP[i], bh = rozm * 1.6;
    const glowny = b.akcja === 'pusc';
    ctx.fillStyle = glowny ? `rgba(224,176,104,${0.14 + 0.1 * puls})` : 'rgba(255,255,255,0.03)';
    ctx.fillRect(bx, by - bh / 2, bw, bh);
    ctx.strokeStyle = glowny ? `rgba(224,176,104,${0.7 + 0.3 * puls})` : 'rgba(206,192,166,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by - bh / 2 + 0.5, bw - 1, bh - 1);
    ctx.fillStyle = glowny ? 'rgba(248,236,210,1)' : 'rgba(216,204,180,0.95)';
    ctx.fillText(b.tekst, bx + bw / 2, by + rozm * 0.32);
    pola.push({ akcja: b.akcja, x: bx + bw / 2, y: by, w: bw, h: bh });
    bx += bw + rozm * 0.6;
  }
  ctx.restore();
  return pola;
}
