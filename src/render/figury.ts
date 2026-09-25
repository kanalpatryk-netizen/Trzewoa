import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { Race, RACES } from '../sim/races';
import type { Clan } from '../sim/sim';
import type { Camera } from './camera';
import { ustawienia } from '../core/settings-store';

/**
 * Mieszkańcy rysowani jak postacie, nie jak plamy: ciemne ciało z jasnym obrysem,
 * animowany chód, zamach kilofa, pokłon przy ołtarzu i sen w skale.
 * Każda rasa ma inną sylwetkę i inny rytm ruchu — po tym się je poznaje.
 */

const CIALO = 'rgba(17,11,10,0.94)';

interface Stan {
  faza: number;      // 0..1 — miejsce w cyklu chodu
  idzie: boolean;
  kopie: boolean;
  modli: boolean;
  spi: boolean;
  boi: boolean;
  niesie: boolean;
}

function stan(c: Creature, czas: number): Stan {
  const idzie = c.job === 0 || c.job === 2 || c.job === 3 || c.job === 5 || c.job === 6 || c.job === 7 || c.job === 8 || c.job === 9 || c.job === 11 || c.job === 14 || c.job === 15;
  return {
    faza: ((czas * (ustawienia.ograniczRuch ? 0.0025 : 0.006) + c.id * 0.37) % 1),
    idzie,
    kopie: c.job === 1 || c.job === 10,
    modli: c.job === 3 || c.job === 12 || c.job === 16,
    spi: c.job === 13,
    boi: c.fear > 0.55,
    niesie: c.carry > 0,
  };
}

function obrys(ctx: CanvasRenderingContext2D, jasnosc: number, grubosc: number): void {
  // kolor ustawia rysujStworzenia przed wywołaniem; tu tylko dopasowujemy krycie
  const biezacy = ctx.strokeStyle as string;
  ctx.strokeStyle = biezacy.startsWith('rgba') ? biezacy.replace(/[\d.]+\)$/, `${jasnosc})`) : `rgba(238,228,206,${jasnosc})`;
  ctx.lineWidth = grubosc;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Noga jako dwa odcinki — kolano daje wrażenie kroku, a nie ślizgu. */
function noga(ctx: CanvasRenderingContext2D, x: number, y: number, dl: number, kat: number, zgiecie: number): void {
  const kx = x + Math.sin(kat) * dl * 0.55;
  const ky = y + Math.cos(kat) * dl * 0.55;
  const sx = kx + Math.sin(kat + zgiecie) * dl * 0.45;
  const sy = ky + Math.cos(kat + zgiecie) * dl * 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(sx, sy);
  ctx.stroke();
}

function ramie(ctx: CanvasRenderingContext2D, x: number, y: number, dl: number, kat: number, zgiecie: number): void {
  noga(ctx, x, y, dl, kat, zgiecie);
}

function goblin(ctx: CanvasRenderingContext2D, h: number, s: Stan): void {
  const krok = s.idzie ? Math.sin(s.faza * Math.PI * 2) : 0;
  const bob = s.idzie ? Math.abs(Math.cos(s.faza * Math.PI * 2)) * h * 0.04 : 0;
  const zamach = s.kopie ? Math.sin(s.faza * Math.PI * 4) : 0;
  const ty = -h * 0.42 - bob;

  obrys(ctx, 0.92, Math.max(1.1, h * 0.075));
  // nogi
  noga(ctx, -h * 0.08, -h * 0.34, h * 0.36, 0.25 + krok * 0.5, -0.35);
  noga(ctx, h * 0.08, -h * 0.34, h * 0.36, 0.25 - krok * 0.5, -0.35);

  // tułów: zgarbiony grzbiet
  ctx.beginPath();
  ctx.moveTo(-h * 0.16, -h * 0.34);
  ctx.quadraticCurveTo(-h * 0.3, ty, -h * 0.02, -h * 0.72);
  ctx.quadraticCurveTo(h * 0.22, -h * 0.66, h * 0.14, -h * 0.34);
  ctx.closePath();
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();

  // głowa z uchem
  ctx.beginPath();
  ctx.arc(h * 0.06, -h * 0.82, h * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(h * 0.16, -h * 0.86);
  ctx.lineTo(h * 0.3, -h * 0.96 + krok * h * 0.02);
  ctx.stroke();

  // ręce: przy kopaniu zamach kilofem
  if (s.kopie) {
    ramie(ctx, h * 0.05, -h * 0.62, h * 0.3, 1.1 + zamach * 0.7, 0.4);
    ctx.beginPath();
    ctx.moveTo(h * 0.05 + Math.sin(1.1 + zamach * 0.7) * h * 0.3, -h * 0.62 + Math.cos(1.1 + zamach * 0.7) * h * 0.3);
    ctx.lineTo(h * 0.42, -h * 0.5 - zamach * h * 0.25);
    ctx.stroke();
  } else if (s.modli) {
    ramie(ctx, -h * 0.04, -h * 0.62, h * 0.28, -0.7, -0.5);
    ramie(ctx, h * 0.12, -h * 0.62, h * 0.28, -0.5, -0.5);
  } else if (s.boi) {
    ramie(ctx, -h * 0.04, -h * 0.62, h * 0.3, -1.2, -0.3);
    ramie(ctx, h * 0.12, -h * 0.62, h * 0.3, -1.6, -0.3);
  } else {
    ramie(ctx, -h * 0.02, -h * 0.6, h * 0.3, 0.9 - krok * 0.5, 0.3);
    ramie(ctx, h * 0.12, -h * 0.6, h * 0.3, 0.9 + krok * 0.5, 0.3);
  }
}

function zuzlowiec(ctx: CanvasRenderingContext2D, h: number, s: Stan): void {
  // ruch mechaniczny: pozycje skaczą co ćwierć cyklu
  const krok = s.idzie ? (Math.round(Math.sin(s.faza * Math.PI * 2) * 2) / 2) : 0;
  const zamach = s.kopie ? Math.round(Math.sin(s.faza * Math.PI * 4)) : 0;
  obrys(ctx, 0.92, Math.max(1.2, h * 0.08));

  noga(ctx, -h * 0.12, -h * 0.3, h * 0.3, 0.2 + krok * 0.35, -0.2);
  noga(ctx, h * 0.12, -h * 0.3, h * 0.3, 0.2 - krok * 0.35, -0.2);

  ctx.beginPath();
  ctx.rect(-h * 0.26, -h * 0.66, h * 0.52, h * 0.36);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();

  // hełm szerszy niż głowa
  ctx.beginPath();
  ctx.moveTo(-h * 0.3, -h * 0.66);
  ctx.lineTo(-h * 0.2, -h * 0.9);
  ctx.lineTo(h * 0.2, -h * 0.9);
  ctx.lineTo(h * 0.3, -h * 0.66);
  ctx.closePath();
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();
  // broda
  ctx.beginPath();
  ctx.moveTo(-h * 0.14, -h * 0.66);
  ctx.lineTo(0, -h * 0.5);
  ctx.lineTo(h * 0.14, -h * 0.66);
  ctx.stroke();

  if (s.kopie) {
    ramie(ctx, h * 0.2, -h * 0.6, h * 0.26, 1.2 + zamach * 0.6, 0.3);
    ctx.beginPath();
    ctx.moveTo(h * 0.36, -h * 0.5);
    ctx.lineTo(h * 0.52, -h * 0.34 - zamach * h * 0.2);
    ctx.stroke();
  } else {
    ramie(ctx, -h * 0.24, -h * 0.6, h * 0.24, 0.8 + krok * 0.3, 0.2);
    ramie(ctx, h * 0.24, -h * 0.6, h * 0.24, 0.8 - krok * 0.3, 0.2);
  }
}

function trol(ctx: CanvasRenderingContext2D, h: number, s: Stan): void {
  const oddech = Math.sin(s.faza * Math.PI * 2) * (s.spi ? 0.06 : 0.02);
  const krok = s.idzie ? Math.sin(s.faza * Math.PI * 2) : 0;
  obrys(ctx, 0.9, Math.max(1.3, h * 0.07));

  if (s.spi) {
    // zwinięty w skale — widać tylko grzbiet
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.26, h * 0.5, h * 0.28 * (1 + oddech), 0, Math.PI, 0);
    ctx.fillStyle = CIALO;
    ctx.fill();
    ctx.stroke();
    return;
  }

  noga(ctx, -h * 0.16, -h * 0.3, h * 0.32, 0.2 + krok * 0.3, -0.2);
  noga(ctx, h * 0.16, -h * 0.3, h * 0.32, 0.2 - krok * 0.3, -0.2);

  ctx.beginPath();
  ctx.moveTo(-h * 0.32, -h * 0.3);
  ctx.quadraticCurveTo(-h * 0.42, -h * 0.75 * (1 + oddech), 0, -h * 0.86);
  ctx.quadraticCurveTo(h * 0.42, -h * 0.75, h * 0.32, -h * 0.3);
  ctx.closePath();
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();

  // długie ramiona do ziemi
  ramie(ctx, -h * 0.28, -h * 0.68, h * 0.42, 0.35 + krok * 0.25, 0.25);
  ramie(ctx, h * 0.28, -h * 0.68, h * 0.42, 0.35 - krok * 0.25, 0.25);

  ctx.beginPath();
  ctx.arc(0, -h * 0.88, h * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();
}

function przadka(ctx: CanvasRenderingContext2D, h: number, s: Stan): void {
  // skokowy ruch: odnóża przestawiają się naraz co pół sekundy
  const skok = Math.floor(s.faza * 4) % 2 === 0 ? 1 : -1;
  obrys(ctx, 0.92, Math.max(1, h * 0.06));
  for (let i = 0; i < 4; i++) {
    const rozstaw = 0.26 + i * 0.13;
    const uniesienie = (i % 2 === 0 ? skok : -skok) * 0.12;
    for (const kier of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.4);
      ctx.lineTo(kier * h * rozstaw * 0.8, -h * (0.58 + uniesienie));
      ctx.lineTo(kier * h * rozstaw, -h * 0.02);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.42, h * 0.26, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(h * 0.2, -h * 0.5, h * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();
}

function czlowiek(ctx: CanvasRenderingContext2D, h: number, s: Stan): void {
  const krok = s.idzie ? Math.sin(s.faza * Math.PI * 2) : 0;
  obrys(ctx, 0.95, Math.max(1.1, h * 0.07));
  noga(ctx, -h * 0.07, -h * 0.34, h * 0.36, 0.2 + krok * 0.45, -0.3);
  noga(ctx, h * 0.07, -h * 0.34, h * 0.36, 0.2 - krok * 0.45, -0.3);

  // płaszcz
  ctx.beginPath();
  ctx.moveTo(-h * 0.18, -h * 0.3);
  ctx.lineTo(-h * 0.12, -h * 0.72);
  ctx.lineTo(h * 0.12, -h * 0.72);
  ctx.lineTo(h * 0.18, -h * 0.3);
  ctx.closePath();
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -h * 0.84, h * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = CIALO;
  ctx.fill();
  ctx.stroke();

  // ręka z pochodnią
  ramie(ctx, h * 0.14, -h * 0.66, h * 0.3, 1.25, -0.4);
}

/** Barwa klanu na obrysie — inaczej dwie nacje tej samej rasy są nie do odróżnienia. */
function barwaKlanu(klan: Clan | undefined): string {
  if (!klan) return 'rgba(238,228,206,0.92)';
  const c = RACES[klan.race].color;
  const t = klan.tint;
  const mieszaj = (v: number) => Math.max(40, Math.min(255, v + t * 160));
  return `rgba(${mieszaj(c[0]) | 0},${mieszaj(c[1]) | 0},${mieszaj(c[2]) | 0},0.95)`;
}

export function rysujStworzenia(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number, wybrany?: number): void {
  const w = sim.world;
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const right = left + cam.vw / z, bottom = top + cam.vh / z;

  // z daleka tłum zlewa się w plamę — grupujemy i podpisujemy liczbą
  const grupowanie = z < 9;
  const zajete = new Map<string, { c: Creature; n: number }>();
  const doRysowania: { c: Creature; n: number }[] = [];
  for (const c of sim.creatures) {
    if (c.dead) continue;
    if (c.x < left - 3 || c.x > right + 3 || c.y < top - 3 || c.y > bottom + 3) continue;
    if (!grupowanie) { doRysowania.push({ c, n: 1 }); continue; }
    const klucz = `${Math.round(c.x / 2.2)},${Math.round(c.y / 2.2)},${c.race}`;
    const jest = zajete.get(klucz);
    if (jest) { jest.n++; continue; }
    const wpis = { c, n: 1 };
    zajete.set(klucz, wpis);
    doRysowania.push(wpis);
  }

  for (const { c, n } of doRysowania) {
    const d = RACES[c.race];
    const s = stan(c, czas);
    // minimalny rozmiar w pikselach: sylwetka musi być widoczna przy każdym zoomie
    const h = Math.max(14, d.size * z * 1.9 * ustawienia.wielkoscSylwetek);
    const sx = (c.x - left) * z;
    const sy = (c.y + 1 - top) * z;
    const f = c.face >= 0 ? 1 : -1;

    // cień kontaktowy
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,4,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, h * 0.3, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(f, 1);
    if (s.boi) ctx.rotate(-0.12 * f);
    ctx.strokeStyle = barwaKlanu(sim.clans[c.clan]);
    switch (c.race) {
      case Race.GOBLIN: goblin(ctx, h, s); break;
      case Race.DWARF: zuzlowiec(ctx, h, s); break;
      case Race.TROLL: trol(ctx, h, s); break;
      case Race.SPINNER: przadka(ctx, h, s); break;
      default: czlowiek(ctx, h, s); break;
    }
    ctx.restore();

    // ogień w dłoni człowieka
    if (c.race === Race.HUMAN) {
      const migot = 0.7 + Math.sin(czas * 0.01 + c.id) * 0.3;
      ctx.fillStyle = `rgba(255,${(150 * migot) | 0},60,${0.55 + migot * 0.35})`;
      ctx.beginPath();
      ctx.arc(sx + f * h * 0.32, sy - h * 0.82, h * 0.13 * (0.85 + migot * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    // niesiona ruda
    if (s.niesie) {
      ctx.fillStyle = 'rgba(242,212,142,0.95)';
      ctx.beginPath();
      ctx.arc(sx + f * h * 0.3, sy - h * 0.45, Math.max(1.5, h * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    // ilu ich tu stoi
    if (n > 1) {
      ctx.font = `${Math.max(13, h * 0.45)}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(238,226,198,0.9)';
      ctx.fillText(`×${n}`, sx + h * 0.42, sy - h * 0.55);
    }
    // zaznaczony do szeptu
    if (wybrany === c.id) {
      ctx.strokeStyle = 'rgba(246,216,142,0.9)';
      ctx.lineWidth = Math.max(1.2, h * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy - h * 0.5, h * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    // prorok
    if (c.prophet) {
      ctx.strokeStyle = 'rgba(246,216,142,0.85)';
      ctx.lineWidth = Math.max(1, h * 0.06);
      ctx.beginPath();
      ctx.arc(sx, sy - h * 1.06, h * 0.24, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // odpryski spod kilofa
    if (s.kopie && z > 6) {
      for (let k = 0; k < 3; k++) {
        const faza = ((czas * 0.004 + k * 0.33 + c.id * 0.11) % 1);
        ctx.fillStyle = `rgba(232,218,190,${0.55 * (1 - faza)})`;
        ctx.beginPath();
        ctx.arc(sx + f * z * (0.4 + faza * 0.6), sy - h * 0.5 - Math.sin(faza * Math.PI) * h * 0.45, Math.max(0.8, z * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    void w;
  }
}
