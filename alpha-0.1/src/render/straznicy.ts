/**
 * Remake v1, etap 3: rysunek Strażników Snu i bossa oraz pasek fali na ekranie.
 * Strażnik to kamienna postać ze świecącymi szczelinami oczu; w skale prześwituje.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { aktywnyBoss } from '../sim/boss';
import { STRAZNICY as S } from '../nastawy/straznicy';
import { SERIF } from './ink';
import type { Camera } from './camera';
import { RACES } from '../sim/races';
import { ustawienia } from '../core/settings-store';

/** Rysuje Strażnika stopami w (0, 0); zwrot (kier) ustawia wołający przez ctx.scale. */
export function rysujStraznika(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h0: number, czas: number): void {
  const boss = !!c.boss;
  const h = h0 * (boss ? aktywnyBoss().rozmiar * 0.6 : 0.8);
  const w = sim.world;
  const wSkale = w.solid(Math.floor(c.x), Math.floor(c.y));
  const oddech = Math.sin(czas * 0.003 + c.id) * 0.5 + 0.5;
  const unos = Math.sin(czas * 0.002 + c.id * 1.3) * h * 0.03;
  const uderza = sim.tick - (c.ciosT ?? -1e9) < 24;
  ctx.save();
  ctx.globalAlpha = wSkale ? 0.8 : 1;
  ctx.translate(0, unos);
  // pył spod stóp
  ctx.fillStyle = 'rgba(150,160,180,0.18)';
  ctx.beginPath(); ctx.ellipse(0, 0, h * 0.34, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  // tułów: kanciasty głaz, pochylony do przodu
  const sk = boss ? ['#5f5b6e', '#9a96aa'] : ['#66637a', '#a19db4'];
  const grad = ctx.createLinearGradient(0, -h, 0, 0);
  grad.addColorStop(0, sk[1]); grad.addColorStop(1, sk[0]);
  ctx.fillStyle = grad;
  ctx.strokeStyle = boss ? 'rgba(190,220,255,0.98)' : 'rgba(170,205,255,0.9)';
  ctx.lineWidth = Math.max(1.5, h * 0.045);
  ctx.shadowColor = 'rgba(120,180,255,0.8)'; ctx.shadowBlur = h * 0.18;
  // nogi: dwa krótkie słupy kamienia, krok w rytmie unoszenia
  const krok = Math.sin(czas * 0.004 + c.id) * h * 0.04;
  for (const [nx, dk] of [[-h * 0.13, krok], [h * 0.1, -krok]] as const) {
    ctx.beginPath();
    ctx.moveTo(nx - h * 0.07, -h * 0.26); ctx.lineTo(nx + h * 0.07, -h * 0.26);
    ctx.lineTo(nx + h * 0.08 + dk, 0); ctx.lineTo(nx - h * 0.08 + dk, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // tułów: kanciasty głaz, pochylony do przodu
  ctx.beginPath();
  ctx.moveTo(-h * 0.25, -h * 0.22);
  ctx.lineTo(-h * 0.29, -h * 0.48);
  ctx.lineTo(-h * 0.16, -h * 0.68);
  ctx.lineTo(h * 0.14, -h * (0.7 + oddech * 0.02));
  ctx.lineTo(h * 0.27, -h * 0.5);
  ctx.lineTo(h * 0.22, -h * 0.22);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // głowa: osobny, mniejszy kamień wysunięty do przodu
  ctx.beginPath();
  ctx.moveTo(-h * 0.04, -h * 0.68);
  ctx.lineTo(-h * 0.02, -h * 0.84);
  ctx.lineTo(h * 0.14, -h * (0.9 + oddech * 0.02));
  ctx.lineTo(h * 0.26, -h * 0.8);
  ctx.lineTo(h * 0.22, -h * 0.66);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // ramię z pięścią-głazem (przy ciosie wyrzucone do przodu)
  const px = uderza ? h * 0.48 : h * 0.32, py = uderza ? -h * 0.55 : -h * 0.3;
  ctx.beginPath(); ctx.moveTo(h * 0.16, -h * 0.6); ctx.lineTo(px, py);
  ctx.lineWidth = h * 0.1; ctx.strokeStyle = sk[1]; ctx.stroke();
  ctx.fillStyle = sk[0];
  ctx.beginPath(); ctx.arc(px, py, h * 0.09, 0, Math.PI * 2); ctx.fill();
  // pęknięcia, przez które świeci sen
  const blask = 0.55 + 0.45 * oddech;
  ctx.strokeStyle = `rgba(150,200,255,${0.5 * blask})`;
  ctx.lineWidth = Math.max(0.8, h * 0.02);
  ctx.beginPath();
  ctx.moveTo(-h * 0.12, -h * 0.2); ctx.lineTo(-h * 0.02, -h * 0.38); ctx.lineTo(-h * 0.1, -h * 0.52);
  ctx.moveTo(h * 0.1, -h * 0.12); ctx.lineTo(h * 0.16, -h * 0.3);
  ctx.stroke();
  // oczy: dwie świecące szczeliny
  ctx.shadowColor = 'rgba(140,200,255,0.95)'; ctx.shadowBlur = h * 0.25;
  ctx.fillStyle = `rgba(200,230,255,${0.75 + 0.25 * blask})`;
  ctx.fillRect(h * 0.06, -h * 0.8, h * 0.08, h * 0.028);
  ctx.fillRect(h * 0.17, -h * 0.77, h * 0.06, h * 0.024);
  ctx.shadowBlur = 0;
  if (boss) {
    // korona z odłamków skały
    ctx.fillStyle = sk[1];
    ctx.beginPath();
    ctx.moveTo(-h * 0.01, -h * 0.85); ctx.lineTo(h * 0.03, -h * 1.03); ctx.lineTo(h * 0.1, -h * 0.9);
    ctx.lineTo(h * 0.17, -h * 1.07); ctx.lineTo(h * 0.24, -h * 0.82);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/** Pasek fali u góry pola gry: która fala, ilu zostało, życie bossa. */
export function rysujPasekFali(ctx: CanvasRenderingContext2D, sim: Sim, x: number, y: number, szer: number): void {
  const st = sim.lud.straznicy;
  if (!st?.trwa) return;
  const zywi = sim.creatures.filter((c) => !c.dead && c.straznik);
  const boss = zywi.find((c) => c.boss);
  const zwykli = zywi.filter((c) => !c.boss).length;
  const roz = Math.max(12, Math.min(16, szer * 0.02));
  const tekst = `FALA STRAŻNIKÓW SNU ${st.fala + 1}/${S.fale.length}` + (zwykli ? ` · zostało ${zwykli}` : '') + ' · skorupa nie pęka';
  ctx.save();
  ctx.font = `${roz}px ${SERIF}`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(tekst).width;
  const bw = Math.max(tw + 28, boss ? 320 : 0), bh = boss ? roz * 3.6 : roz * 1.9;
  const bx = x + szer / 2 - bw / 2;
  ctx.fillStyle = 'rgba(10,10,16,0.88)';
  ctx.fillRect(bx, y, bw, bh);
  ctx.strokeStyle = 'rgba(150,190,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = 'rgba(200,225,255,0.95)';
  ctx.fillText(tekst, x + szer / 2, y + roz * 1.3);
  if (boss) {
    const b = aktywnyBoss();
    const frac = Math.max(0, Math.min(1, boss.hp / (boss.hpMax ?? 1)));
    ctx.font = `italic ${roz * 0.85}px ${SERIF}`;
    ctx.fillStyle = 'rgba(240,240,255,0.95)';
    ctx.fillText(`${b.nazwa} · ${Math.ceil(boss.hp)} / ${Math.ceil(boss.hpMax ?? 0)}`, x + szer / 2, y + roz * 2.45);
    const px = bx + 14, pw = bw - 28, py = y + roz * 2.75, ph = roz * 0.5;
    ctx.fillStyle = 'rgba(60,60,80,0.9)'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(150,190,255,0.9)'; ctx.fillRect(px, py, pw * frac, ph);
  }
  ctx.restore();
}

/**
 * Strażnicy przenikają skałę — w litej skale rycina kamienia zakrywała ich prawie całych.
 * Ci, którzy są w skale, rysują się jeszcze raz na wierzchu (te same wymiary co w figury.ts).
 */
export function rysujStraznikowWSkale(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, czas: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const w = sim.world;
  for (const c of sim.creatures) {
    if (c.dead || !c.straznik || !w.solid(Math.floor(c.x), Math.floor(c.y))) continue;
    const sx = (c.x - left) * z, sy = (c.y + 1 - top) * z;
    if (sx < -60 || sy < -60 || sx > cam.vw + 60 || sy > cam.vh + 60) continue;
    const h = Math.max(16, RACES[c.race].size * z * 1.9 * ustawienia.wielkoscSylwetek);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(c.face >= 0 ? 1 : -1, 1);
    rysujStraznika(ctx, sim, c, h, czas);
    ctx.restore();
  }
}
