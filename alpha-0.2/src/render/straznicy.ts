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
import { rysujDemonaBossa } from './pomnik';
import { POMNIK } from '../nastawy/pomnik';

/** Rysuje Strażnika stopami w (0, 0); zwrot (kier) ustawia wołający przez ctx.scale. */
export function rysujStraznika(ctx: CanvasRenderingContext2D, sim: Sim, c: Creature, h0: number, czas: number): void {
  const boss = !!c.boss;
  const h = h0 * (boss ? aktywnyBoss().rozmiar * 0.6 : 0.8);
  // Alpha, etap 5: boss to demon z Wielkiego Pomnika (render/pomnik.ts)
  if (c.boss === 'demon') { rysujDemonaBossa(ctx, sim, c, h, czas); return; }
  const w = sim.world;
  const wSkale = w.solid(Math.floor(c.x), Math.floor(c.y));
  const oddech = Math.sin(czas * 0.003 + c.id) * 0.5 + 0.5;
  const unos = Math.sin(czas * 0.002 + c.id * 1.3) * h * 0.03;
  const uderza = sim.tick - (c.ciosT ?? -1e9) < 24;
  // kamienny posąg rysowany tuszem, na wpół przejrzysty jak senna zjawa (dawniej błękitny klocek z neonowym
  // obrysem — kostka lodu z innej gry); w skale tylko prześwituje
  ctx.save();
  ctx.globalAlpha = wSkale ? 0.5 : 0.86;
  ctx.translate(0, unos);
  ctx.lineJoin = 'round';
  // pył spod stóp
  ctx.fillStyle = 'rgba(120,108,94,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 0, h * 0.34, h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  const sk = boss ? ['#4e4842', '#9a8f80'] : ['#56504a', '#a39888'];
  const grad = ctx.createLinearGradient(-h * 0.3, -h, h * 0.3, 0);
  grad.addColorStop(0, sk[1]); grad.addColorStop(1, sk[0]);
  const tusz = 'rgba(18,12,9,0.95)';
  const bryla = new Path2D();
  const obrys = (path: Path2D): void => {
    ctx.fillStyle = grad; ctx.fill(path);
    ctx.strokeStyle = tusz; ctx.lineWidth = Math.max(1.4, h * 0.035); ctx.stroke(path);
    bryla.addPath(path);
  };
  // nogi: dwa krótkie słupy kamienia, krok w rytmie unoszenia
  const krok = Math.sin(czas * 0.004 + c.id) * h * 0.04;
  for (const [nx, dk] of [[-h * 0.13, krok], [h * 0.1, -krok]] as const) {
    const n = new Path2D();
    n.moveTo(nx - h * 0.07, -h * 0.26); n.lineTo(nx + h * 0.07, -h * 0.26);
    n.lineTo(nx + h * 0.08 + dk, 0); n.lineTo(nx - h * 0.08 + dk, 0); n.closePath();
    obrys(n);
  }
  // tułów: kanciasty głaz, pochylony do przodu
  const t = new Path2D();
  t.moveTo(-h * 0.25, -h * 0.22);
  t.lineTo(-h * 0.29, -h * 0.48);
  t.lineTo(-h * 0.16, -h * 0.68);
  t.lineTo(h * 0.14, -h * (0.7 + oddech * 0.02));
  t.lineTo(h * 0.27, -h * 0.5);
  t.lineTo(h * 0.22, -h * 0.22);
  t.closePath();
  obrys(t);
  // głowa: osobny, mniejszy kamień wysunięty do przodu
  const g = new Path2D();
  g.moveTo(-h * 0.04, -h * 0.68);
  g.lineTo(-h * 0.02, -h * 0.84);
  g.lineTo(h * 0.14, -h * (0.9 + oddech * 0.02));
  g.lineTo(h * 0.26, -h * 0.8);
  g.lineTo(h * 0.22, -h * 0.66);
  g.closePath();
  obrys(g);
  // ramię z pięścią-głazem (przy ciosie wyrzucone do przodu)
  const px = uderza ? h * 0.48 : h * 0.32, py = uderza ? -h * 0.55 : -h * 0.3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = tusz; ctx.lineWidth = h * 0.13;
  ctx.beginPath(); ctx.moveTo(h * 0.16, -h * 0.6); ctx.lineTo(px, py); ctx.stroke();
  ctx.strokeStyle = sk[1]; ctx.lineWidth = h * 0.085;
  ctx.beginPath(); ctx.moveTo(h * 0.16, -h * 0.6); ctx.lineTo(px, py); ctx.stroke();
  const piesc = new Path2D(); piesc.arc(px, py, h * 0.09, 0, Math.PI * 2);
  obrys(piesc);
  // kreska ryciny: cień po tylnej stronie kamienia
  ctx.save();
  ctx.clip(bryla);
  ctx.strokeStyle = 'rgba(14,9,6,0.4)'; ctx.lineWidth = Math.max(0.8, h * 0.012);
  ctx.beginPath();
  for (let x = -h * 0.5; x < h * 0.1; x += Math.max(2.4, h * 0.03)) { ctx.moveTo(x, -h); ctx.lineTo(x + h * 0.6, 0); }
  ctx.stroke();
  ctx.restore();
  // pęknięcia, przez które przebija sen — blade, przygaszone światło
  const blask = 0.55 + 0.45 * oddech;
  ctx.strokeStyle = tusz; ctx.lineWidth = Math.max(1, h * 0.024);
  const rysy = new Path2D();
  rysy.moveTo(-h * 0.12, -h * 0.2); rysy.lineTo(-h * 0.02, -h * 0.38); rysy.lineTo(-h * 0.1, -h * 0.52);
  rysy.moveTo(h * 0.1, -h * 0.12); rysy.lineTo(h * 0.16, -h * 0.3);
  ctx.stroke(rysy);
  ctx.strokeStyle = `rgba(226,218,194,${0.45 * blask})`; ctx.lineWidth = Math.max(0.6, h * 0.01);
  ctx.stroke(rysy);
  // oczy: dwie wąskie szczeliny bladego światła
  ctx.shadowColor = 'rgba(236,226,190,0.7)'; ctx.shadowBlur = h * 0.08;
  ctx.fillStyle = `rgba(236,228,200,${0.6 + 0.3 * blask})`;
  ctx.fillRect(h * 0.06, -h * 0.8, h * 0.08, h * 0.024);
  ctx.fillRect(h * 0.17, -h * 0.77, h * 0.06, h * 0.02);
  ctx.shadowBlur = 0;
  if (boss) {
    // korona z odłamków skały
    const k = new Path2D();
    k.moveTo(-h * 0.01, -h * 0.85); k.lineTo(h * 0.03, -h * 1.03); k.lineTo(h * 0.1, -h * 0.9);
    k.lineTo(h * 0.17, -h * 1.07); k.lineTo(h * 0.24, -h * 0.82);
    k.closePath();
    obrys(k);
  }
  ctx.restore();
}

/** Pasek fali u góry pola gry: która fala, ilu zostało, życie bossa. */
export function rysujPasekFali(ctx: CanvasRenderingContext2D, sim: Sim, x: number, y: number, szer: number): void {
  const st = sim.lud.straznicy;
  if (!st?.trwa) return;
  const zywi = sim.creatures.filter((c) => !c.dead && c.straznik);
  // demon kona po ostatnim uderzeniu: walka wygrana — dawniej panel dalej pisał „pomnik nie pęka”
  const kona = sim.lud.pomnik?.faza === 'kona';
  const boss = kona ? undefined : zywi.find((c) => c.boss);
  const zwykli = zywi.filter((c) => !c.boss).length;
  const roz = Math.max(12, Math.min(16, szer * 0.02));
  // (Alpha, etap 5: pomnik zamiast skorupy; przy demonie — co da wygraną)
  const tekst = kona ? 'DEMON Z POMNIKA KONA — JESTEŚ WOLNY'
    : `FALA STRAŻNIKÓW SNU ${st.fala + 1}/${S.fale.length}` + (zwykli ? ` · zostało ${zwykli}` : '')
    + (boss && POMNIK.wlaczony ? ' · pokonaj demona — będziesz wolny' : POMNIK.wlaczony ? ' · pomnik nie pęka' : ' · skorupa nie pęka');
  ctx.save();
  ctx.font = `${roz}px ${SERIF}`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(tekst).width;
  const bw = Math.max(tw + 28, boss ? 320 : 0), bh = boss ? roz * 3.6 : roz * 1.9;
  const bx = x + szer / 2 - bw / 2;
  // barwy ryciny (ugier i kość) zamiast błękitnego neonu
  ctx.fillStyle = 'rgba(14,10,8,0.88)';
  ctx.fillRect(bx, y, bw, bh);
  ctx.strokeStyle = 'rgba(224,168,96,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, bh - 1);
  ctx.fillStyle = 'rgba(239,227,198,0.95)';
  ctx.fillText(tekst, x + szer / 2, y + roz * 1.3);
  if (boss) {
    const b = aktywnyBoss();
    const frac = Math.max(0, Math.min(1, boss.hp / (boss.hpMax ?? 1)));
    ctx.font = `italic ${roz * 0.85}px ${SERIF}`;
    ctx.fillStyle = 'rgba(224,206,170,0.95)';
    ctx.fillText(`${b.nazwa} · ${Math.ceil(boss.hp)} / ${Math.ceil(boss.hpMax ?? 0)}`, x + szer / 2, y + roz * 2.45);
    const px = bx + 14, pw = bw - 28, py = y + roz * 2.75, ph = roz * 0.5;
    ctx.fillStyle = 'rgba(54,42,34,0.9)'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(170,52,36,0.92)'; ctx.fillRect(px, py, pw * frac, ph);
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
