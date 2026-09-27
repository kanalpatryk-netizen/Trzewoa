import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { doKopania, type PlanDrogi } from '../sim/pielgrzymka';

/**
 * Droga pielgrzymów narysowana na płycie jak szkic w atlasie: kropki tam, gdzie już
 * da się przejść, przerywana kreska tam, gdzie trzeba wydrążyć skałę. Wyraźniejsza,
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
  // skała do wydrążenia: przerywana, płynąca kreska od gniazda w stronę rdzenia
  ctx.strokeStyle = `rgba(250,196,110,${0.85 * moc})`;
  ctx.lineWidth = Math.max(1.5, z * 0.28);
  ctx.setLineDash([Math.max(3, z * 0.6), Math.max(3, z * 0.5)]);
  ctx.lineDashOffset = (teraz * 0.02) % 100;
  ctx.beginPath();
  let otwarta = false;
  for (let k = 0; k < s.length; k++) {
    const i = s[k];
    if (kop.has(i)) {
      if (!otwarta) {
        const p = k > 0 ? s[k - 1] : i;
        ctx.moveTo(px(p), py(p));
        otwarta = true;
      }
      ctx.lineTo(px(i), py(i));
    } else if (otwarta) {
      ctx.lineTo(px(i), py(i));
      otwarta = false;
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // oba końce: gniazdo i przedsionek
  const koniec = (i: number, tekst: string) => {
    const x = px(i), y = py(i);
    ctx.strokeStyle = `rgba(250,210,140,${0.7 * moc})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, z * 0.9), 0, Math.PI * 2); ctx.stroke();
    if (wyrazna && z >= 4) {
      ctx.font = `italic ${Math.max(12, Math.min(16, z * 1.2))}px "Trzewia Tekst", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,7,6,0.8)';
      ctx.strokeText(tekst, x, y - Math.max(8, z * 1.4));
      ctx.fillStyle = 'rgba(250,224,170,0.95)';
      ctx.fillText(tekst, x, y - Math.max(8, z * 1.4));
    }
  };
  koniec(s[0], 'przedsionek');
  koniec(s[s.length - 1], 'gniazdo');
  ctx.restore();
}
