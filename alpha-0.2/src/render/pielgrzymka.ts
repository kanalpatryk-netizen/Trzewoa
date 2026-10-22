import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { doKopania, type PlanDrogi } from '../sim/pielgrzymka';

/**
 * Droga pielgrzymów narysowana na płycie jak szkic w atlasie: kropki tam, gdzie już
 * da się przejść, znaki wyryte w skale tam, gdzie trzeba ją wydrążyć. Wyraźniejsza,
 * kiedy gracz trzyma Kształtowanie — wtedy to jest instrukcja, nie ozdoba.
 */
export function rysujDrogePielgrzymow(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, plan: PlanDrogi, teraz: number, wyrazna: boolean): void {
  const w = sim.world;
  const s = plan.sciezka;
  if (s.length < 2) return;
  // skała, którą ktoś już wydrążył, nie jest już do kopania — kreska gaśnie za kilofem
  const kop = new Set(plan.kopac.filter((i) => doKopania(w.tile[i])));
  if (!kop.size) return;
  const z = cam.zoom;
  const px = (i: number) => cam.toScreenX((i % w.w) + 0.5);
  const py = (i: number) => cam.toScreenY(((i / w.w) | 0) + 0.5);
  const moc = wyrazna ? 1 : 0.55;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // przejście, które już jest: rzadkie kropki
  ctx.fillStyle = `rgba(236,214,160,${0.5 * moc})`;
  const krok = Math.max(1, Math.round(6 / Math.max(1, z)));
  for (let k = 0; k < s.length; k += krok) {
    if (kop.has(s[k])) continue;
    ctx.beginPath();
    ctx.arc(px(s[k]), py(s[k]), Math.max(1, z * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  // skała do wydrążenia: delikatne znaki wyryte w skale co kafel — szewrony w stronę przedsionka, nacięcie z jasną
  // wargą (dawniej przerywana, płynąca żółta kreska — jak trasa w edytorze map)
  const ile = s.length, sz = Math.max(2.5, z * 0.26);
  for (let k = 0; k < ile; k++) {
    const i = s[k];
    if (!kop.has(i)) continue;
    const a = s[Math.max(0, k - 2)], b = s[Math.min(ile - 1, k + 2)];
    let dx = px(a) - px(b), dy = py(a) - py(b);
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const x = px(i), y = py(i), nx = -dy, ny = dx;
    const szewron = (ox: number, oy: number): void => {
      ctx.beginPath();
      ctx.moveTo(x + ox - dx * sz * 0.5 + nx * sz * 0.6, y + oy - dy * sz * 0.5 + ny * sz * 0.6);
      ctx.lineTo(x + ox + dx * sz * 0.4, y + oy + dy * sz * 0.4);
      ctx.lineTo(x + ox - dx * sz * 0.5 - nx * sz * 0.6, y + oy - dy * sz * 0.5 - ny * sz * 0.6);
      ctx.stroke();
    };
    ctx.lineWidth = Math.max(1, z * 0.07);
    ctx.strokeStyle = `rgba(22,14,10,${0.7 * moc})`;
    szewron(0, 0);
    ctx.lineWidth = Math.max(0.8, z * 0.04);
    ctx.strokeStyle = `rgba(232,200,142,${0.6 * moc})`;
    szewron(0, Math.max(0.8, z * 0.06));
  }
  // oba końce: gniazdo i przedsionek
  const koniec = (i: number) => {
    const x = px(i), y = py(i);
    ctx.strokeStyle = `rgba(250,210,140,${0.7 * moc})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, z * 0.9), 0, Math.PI * 2); ctx.stroke();
  };
  koniec(s[0]);
  koniec(s[s.length - 1]);
  ctx.restore();
}
