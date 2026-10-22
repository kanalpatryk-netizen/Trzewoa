import { REMAKE } from '../nastawy/lud';
import { doNastepnego, porcjiWWiadrach } from '../sim/wiadro';
import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { cechaNacji } from '../sim/cechy';
import { BARWA, rgba } from './palette';
import { SERIF } from './ink';
import { wysokoscPostaci } from './figury';
import { przesuniecieX } from './lud/rozstep';
import { postepOdmowy } from './lud/odmowa';

export interface Cel { x: number; y: number; r: number; tekst?: string; klan?: number; }

/**
 * Podpisy narysowane w tej klatce (prostokąty na płycie). Podpis celu omija napis siedziby —
 * dawniej „żelazo” wchodziło w środek „siedziba · w wiadrze…”.
 */
const podpisy = { teraz: -1, prost: [] as { x: number; y: number; w: number; h: number }[] };

function zajmij(teraz: number, x: number, y: number, w: number, h: number): void {
  if (podpisy.teraz !== teraz) { podpisy.teraz = teraz; podpisy.prost.length = 0; }
  podpisy.prost.push({ x, y, w, h });
}

/** Ile pola prostokąta zasłania podpisy z tej klatki (0 = wolne miejsce). */
function zasloniete(teraz: number, x: number, y: number, w: number, h: number): number {
  if (podpisy.teraz !== teraz) return 0;
  let pole = 0;
  for (const p of podpisy.prost) {
    const dx = Math.min(x + w, p.x + p.w) - Math.max(x, p.x), dy = Math.min(y + h, p.y + p.h) - Math.max(y, p.y);
    if (dx > 0 && dy > 0) pole += dx * dy;
  }
  return pole;
}

/**
 * Nazwy nacji przy gniazdach. Bez nich plansza jest mrowiskiem bez imion —
 * a cała gra polega na tym, żeby wiedzieć, kto jest kim.
 * Napis wisi nad głowami grupy (nie na nich), w barwach ryciny: kość i ugier, bez barwy rasy.
 */
export function etykietyKolonii(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number, cel?: Cel | null): void {
  if (cam.zoom < 4) return;
  // od rozpadu pomnika do końca walki kadr należy do demona — napis siedziby wisiał nad bossem
  const faza = sim.lud.pomnik?.faza;
  if (faza && faza !== 'stoi') return;
  const z = cam.zoom;
  const rozmiar = Math.max(12, Math.min(17, z * 0.95));
  ctx.save();
  ctx.font = `${rozmiar}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const klan of sim.clans) {
    if (klan.dead || klan.pop <= 0) continue;
    const i = sim.world.idx(klan.hx, klan.hy);
    if (!sim.world.ever[i]) continue;                    // nieznanego gniazda nie podpisujemy
    const sx = cam.toScreenX(klan.hx + 0.5), sy = cam.toScreenY(klan.hy + 1);
    if (sx < -60 || sy < -40 || sx > cam.vw + 60 || sy > cam.vh + 40) continue;

    // grupa przy siedzibie: środek nad nią, a napis nad najwyższą głową
    let suma = 0, ilu = 0, glowy = Infinity, lewo = Infinity, prawo = -Infinity, stopy = -Infinity, odmawia = false;
    for (const c of sim.creatures) {
      if (c.dead || c.clan !== klan.id) continue;
      if (Math.abs(c.x - klan.hx) > 8 || Math.abs(c.y - klan.hy) > 3) continue;
      if (postepOdmowy(sim, c, teraz) !== null) odmawia = true;
      const px = cam.toScreenX(c.x + przesuniecieX(c)), py = cam.toScreenY(c.y + 1), hh = wysokoscPostaci(c, z);
      suma += px; ilu++;
      glowy = Math.min(glowy, py - hh); stopy = Math.max(stopy, py);
      lewo = Math.min(lewo, px - hh * 0.35); prawo = Math.max(prawo, px + hh * 0.35);
    }
    // sama grupa też jest zajętym miejscem — podpis celu nie siada ludziom na głowach
    if (ilu) zajmij(teraz, lewo, glowy, prawo - lewo, stopy - glowy);
    // celownik ma własny podpis; dwa imiona w jednym pierścieniu to jeden za dużo
    if (cel && Math.hypot(klan.hx - cel.x, klan.hy - cel.y) < cel.r + 2) continue;
    // dymek odmowy wisi w tym samym miejscu — przez tę chwilę mówi on, nie siedziba
    if (odmawia) continue;

    // Remake v1: jeden lud — podpis mówi, że to siedziba i ile jest w wiadrach
    const glowny = REMAKE ? 'siedziba' : klan.name;
    const cecha = cechaNacji(klan).nazwa;
    const reszta = REMAKE ? ` · w wiadrze ${porcjiWWiadrach(sim)} · następne za ${Math.ceil(doNastepnego(sim) / 120)} s`
      : ` · ${klan.pop}${cecha ? ` · ${cecha}` : ''}`;
    const s1 = ctx.measureText(glowny).width, s2 = ctx.measureText(reszta).width;
    const bw = s1 + s2 + 14, bh = Math.round(rozmiar * 1.45);
    // nad głowami zostaje miejsce na romby zaznaczonych (render/druzyna.ts: rysujZaznaczenie)
    const odstep = Math.max(12, z * 0.9);
    const cx = Math.max(bw / 2 + 4, Math.min(cam.vw - bw / 2 - 4, ilu ? suma / ilu : sx));
    const dol = (glowy < Infinity ? glowy : sy - 2.4 * z) - odstep;
    const bx = Math.round(cx - bw / 2), by = Math.round(dol - bh);

    ctx.fillStyle = 'rgba(16,11,8,0.74)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.fillStyle = rgba(BARWA.atramentMocny, 0.95);
    ctx.fillText(glowny, bx + 7, by + bh / 2 + 1);
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.88);
    ctx.fillText(reszta, bx + 7 + s1, by + bh / 2 + 1);
    zajmij(teraz, bx, by, bw, bh);
  }
  ctx.restore();
}

/**
 * Podświetlenie celu: pierścień, podpis i strzałka na krawędzi, gdy cel jest poza kadrem.
 * To jest jedyny element interfejsu, który wprost mówi „patrz tutaj".
 */
/**
 * Strzałka przy krawędzi płyty, gdy cel jest poza kadrem (współrzędne płyty), albo null, gdy cel widać.
 * Rysunek (podswietlCel) i dotyk (ekran gry: dotknięcie strzałki wiezie tam kamerę) liczą ją tak samo.
 */
export function strzalkaCelu(cam: Camera, cel: Cel): { x: number; y: number; kat: number } | null {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (cel.x - left) * z, sy = (cel.y - top) * z;
  if (sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh) return null;
  const cx = cam.vw / 2, cy = cam.vh / 2;
  const kat = Math.atan2(sy - cy, sx - cx);
  return { x: cx + Math.cos(kat) * (cam.vw / 2 - 52), y: cy + Math.sin(kat) * (cam.vh / 2 - 52), kat };
}

/** Od kiedy wisi ten sam cel (tekst i miejsce) — podpowiedź odświeża się co kilka sekund nowym obiektem. */
const wiekCelu = { klucz: '', od: 0 };

export function podswietlCel(ctx: CanvasRenderingContext2D, cam: Camera, cel: Cel, teraz: number): void {
  const z = cam.zoom;
  const left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
  const sx = (cel.x - left) * z, sy = (cel.y - top) * z;
  const klucz = `${cel.tekst ?? ''}|${Math.round(cel.x)}|${Math.round(cel.y)}`;
  if (klucz !== wiekCelu.klucz) { wiekCelu.klucz = klucz; wiekCelu.od = teraz; }
  // świeży cel woła, a po kilku sekundach przygasa — rytuał trwa minutami i pierścień nad kryptą wisiał jak znacznik debugowy
  const wiek = (teraz - wiekCelu.od) / 1000;
  const glos = wiek < 6 ? 1 : Math.max(0.4, 1 - (wiek - 6) * 0.2), glosPodpisu = 0.5 + 0.5 * glos;
  const puls = (0.6 + 0.4 * Math.sin(teraz * 0.004)) * glos;
  // pierścień nie większy niż kawałek kadru — dawniej dwa wielkie okręgi z nacięciami zasłaniały scenę
  const r = Math.min(Math.max(18, cel.r * z), Math.min(cam.vw, cam.vh) * 0.11);

  const wKadrze = sx > 0 && sy > 0 && sx < cam.vw && sy < cam.vh;
  ctx.save();
  if (wKadrze) {
    // jeden cienki, oddychający pierścień i delikatna poświata pod nim
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.12 * glos + 0.08 * puls);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.3 * glos + 0.25 * puls);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(sx, sy, r * (0.94 + 0.08 * puls), 0, Math.PI * 2);
    ctx.stroke();
    if (cel.tekst) {
      const rozm = Math.max(14, cam.vw / 64);
      ctx.font = `italic ${rozm}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bw = ctx.measureText(cel.tekst).width + 16, bh = Math.round(rozm + 10);
      // przy samym pierścieniu: nad nim, a gdy tam leży inny podpis — pod nim albo z boku
      const rr = r * 1.02 + 6;
      const miejsca: [number, number][] = [
        [sx, sy - rr - bh / 2], [sx, sy + rr + bh / 2], [sx + rr + bw / 2, sy], [sx - rr - bw / 2, sy],
      ];
      let [tx, ty] = miejsca[0], najmniej = Infinity;
      for (const [mx, my] of miejsca) {
        const k = zasloniete(teraz, mx - bw / 2, my - bh / 2, bw, bh);
        if (k < najmniej) { najmniej = k; tx = mx; ty = my; }
        if (k === 0) break;
      }
      ctx.fillStyle = `rgba(10,7,6,${0.8 * glosPodpisu})`;
      ctx.fillRect(Math.round(tx - bw / 2), Math.round(ty - bh / 2), bw, bh);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.95 * glosPodpisu);
      ctx.fillText(cel.tekst, tx, ty + 1);
    }
  } else {
    // strzałka przy krawędzi z podpisem — sama strzałka nie mówi, dokąd prowadzi
    const s = strzalkaCelu(cam, cel);
    if (!s) { ctx.restore(); return; }
    const { x: px, y: py, kat } = s;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(kat);
    ctx.fillStyle = rgba(BARWA.zarBlady, 0.6 + 0.35 * puls);
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(-11, -10); ctx.lineTo(-4, 0); ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (cel.tekst) {
      ctx.font = `italic ${Math.max(14, cam.vw / 74)}px ${SERIF}`;
      ctx.textAlign = 'center';
      const szer = ctx.measureText(cel.tekst).width;
      const tx = Math.max(szer / 2 + 8, Math.min(cam.vw - szer / 2 - 8, px));
      const ty = Math.max(24, Math.min(cam.vh - 12, py + (Math.sin(kat) > 0 ? -18 : 24)));
      ctx.fillStyle = 'rgba(10,7,6,0.8)';
      ctx.fillRect(tx - szer / 2 - 7, ty - 15, szer + 14, 21);
      ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
      ctx.fillText(cel.tekst, tx, ty);
    }
  }
  ctx.restore();
}
