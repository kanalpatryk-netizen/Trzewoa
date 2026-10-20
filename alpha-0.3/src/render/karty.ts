/**
 * KARTY POSTACI (Alpha 0.3, wizja Patryka) — pas kart zamiast medalionów ról. Jedna karta = jedna osoba:
 * portret (ta sama rycina co na mapie), imię i rola, paski życia, głodu i wiary, perk ze znakiem, stan bieżący
 * (kopie, modli się, walczy, w dłoni, ogłuszony, ranny, w szale, poległy) i złota rama zaznaczenia.
 * Dotknięcie zaznacza (kolejne dokładają), dotknięcie zaznaczonej wiezie kamerę; najechanie myszą albo
 * przytrzymanie palcem pokazuje szczegóły (perk, wada, kim była, fragment historii).
 * Poległa karta zostaje do końca partii: zgaszona, przekreślona, z przyczyną śmierci.
 * Działający perk: rozbłysk karty i znak nad postacią na mapie (rysujSladyNaMapie).
 */
import type { Sim } from '../sim/sim';
import { Job, makeCreature, type Creature } from '../sim/creatures';
import { Race } from '../sim/races';
import type { Camera } from './camera';
import type { Obszar } from './plate';
import { SERIF } from './ink';
import { rysujPostac, wysokoscPostaci } from './figury';
import { maxHp, rolaPostaci, type Rola } from '../sim/lud';
import { imieOsoby, rolaOsoby, type Osoba } from '../sim/druzyna';
import { perk, type ZnakPerku } from '../nastawy/perki';
import { HISTORIA, type Wyzwalacz } from '../nastawy/druzyna';
import { PAS } from '../nastawy/ekran';
import { FRESK } from '../nastawy/barwy';
import { arkan } from '../nastawy/tarot';
import { miejscaKart, tablica, skroc, dopasuj, lam, type UkladPasa, type Wiersz } from './pas';
import { wolnoRuszac } from './nastroj';
import { BARWA_ROLI } from './druzyna';

export interface PoleKarty { akcja: 'postac' | 'plusKart'; id?: number; x: number; y: number; w: number; h: number }

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

// Portret rysujemy z zastępcy postaci — własna pamięć ruchu, żeby karta nie mieszała się z animacją na mapie.
const zastepcy = new Map<number, Creature>();
function zastepca(wzor: Creature): Creature {
  let z = zastepcy.get(wzor.id);
  if (!z) { z = { ...wzor }; zastepcy.set(wzor.id, z); }
  Object.assign(z, wzor, {
    x: 0, y: 0, vy: 0, face: 1, carry: 0, fear: 0, mad: 0, job: Job.STOI,
    odmowa: undefined, naLinie: undefined, naWiadrze: undefined, wspina: undefined, ksiegaT: undefined,
    wDloni: undefined, lot: undefined,
  });
  return z;
}

function zastepcaPoleglego(o: Osoba): Creature {
  const z = makeCreature(Race.GOBLIN, 0, 0, 0, o.id);
  z.rola = o.rola; z.job = Job.STOI;
  zastepcy.set(o.id, z);
  return z;
}

/** Stan bieżący postaci jednym słowem (i czy to zły znak). */
export function stanPostaci(sim: Sim, c: Creature | undefined, o: Osoba): { tekst: string; zly: boolean } {
  if (o.polegl || !c || c.dead) return { tekst: o.plec === 'k' ? 'poległa' : 'poległ', zly: true };
  if (c.wDloni || c.lot) return { tekst: 'w dłoni z otchłani', zly: true };
  if (c.ogluszonyDo !== undefined && sim.tick < c.ogluszonyDo) return { tekst: 'ogłuszony', zly: true };
  if (c.szalDo !== undefined && sim.tick < c.szalDo) return { tekst: 'w szale krwi', zly: false };
  if (c.hp < maxHp(sim, c) * 0.4) return { tekst: o.plec === 'k' ? 'ranna' : 'ranny', zly: true };
  if (c.hunger > 0.75) return { tekst: o.plec === 'k' ? 'głodna' : 'głodny', zly: true };
  if (c.job === Job.FIGHT) return { tekst: 'walczy', zly: false };
  if (c.czynnosc === 'spi') return { tekst: 'śpi', zly: false };
  if (c.czynnosc === 'zaklada') return { tekst: 'zakłada zbroję', zly: false };
  if (c.czynnosc === 'skleja' || c.naprawia) return { tekst: 'skleja linę', zly: false };
  if (c.czynnosc === 'buduje') return { tekst: 'pracuje', zly: false };
  if (c.job === Job.DIG) return { tekst: 'kopie', zly: false };
  if (c.job === Job.PRAY || c.job === Job.PIELGRZYM || c.czynnosc === 'modli') return { tekst: 'modli się', zly: false };
  if (c.job === Job.WARTA) return { tekst: 'na warcie', zly: false };
  if (c.job === Job.DOSTAWA || c.job === Job.ZBIERA) return { tekst: 'niesie jedzenie', zly: false };
  if (c.job === Job.EAT || c.job === Job.ZAPAS || c.job === Job.LINA) return { tekst: 'idzie jeść', zly: false };
  if (c.polecenie) return { tekst: 'na rozkaz', zly: false };
  if (c.droga && c.droga.length > 2) return { tekst: 'idzie', zly: false };
  return { tekst: 'czeka', zly: false };
}

/** Kiedy odsłoni się fragment historii — podpowiedź w szczegółach (bez zdradzania treści). */
const KIEDY: Record<Wyzwalacz, string> = {
  gleboko: 'gdy zejdzie do głębokiej warstwy', krypta: 'gdy dotrze do krypty nad pomnikiem', zloto: 'gdy wykuje złoto',
  zelazo: 'gdy wykuje żelazo', demon: 'gdy zobaczy demona', oltarz: 'gdy odprawi rytuał przy ołtarzu', fala: 'gdy pokona Strażnika Snu',
  aniol: 'gdy przyjdzie z darem dłoni', smierc: 'gdy zginie', weteran: 'gdy zostanie weteranem', ruiny: 'gdy odkryje zabytek w ruinach',
  sypialnia: 'gdy wyśpi się w sypialni', wskrzeszony: 'gdy wstanie z martwych przy ołtarzu',
};

// ---------------------------------------------------------------- znaki perków

/** Mały znak perku (kreska rycinowa) w kwadracie o boku `s`, środek (x, y). */
export function znakPerku(ctx: CanvasRenderingContext2D, znak: ZnakPerku, x: number, y: number, s: number, barwa: string): void {
  const u = s / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = barwa; ctx.fillStyle = barwa;
  ctx.lineWidth = Math.max(1.3, s * 0.11); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (znak) {
    case 'kilof': ctx.moveTo(-u * 0.6, u * 0.7); ctx.lineTo(u * 0.4, -u * 0.3); ctx.moveTo(-u * 0.1, -u * 0.8); ctx.quadraticCurveTo(u * 0.6, -u * 0.8, u * 0.9, -u * 0.1); break;
    case 'okruch': ctx.moveTo(0, -u * 0.8); ctx.lineTo(u * 0.7, -u * 0.1); ctx.lineTo(u * 0.3, u * 0.7); ctx.lineTo(-u * 0.5, u * 0.5); ctx.lineTo(-u * 0.7, -u * 0.2); ctx.closePath(); break;
    case 'chleb': ctx.ellipse(0, u * 0.1, u * 0.8, u * 0.5, 0, Math.PI, 0); ctx.lineTo(u * 0.8, u * 0.5); ctx.lineTo(-u * 0.8, u * 0.5); ctx.closePath(); break;
    case 'serce': ctx.moveTo(0, u * 0.8); ctx.bezierCurveTo(-u * 1.1, 0, -u * 0.5, -u * 0.9, 0, -u * 0.3); ctx.bezierCurveTo(u * 0.5, -u * 0.9, u * 1.1, 0, 0, u * 0.8); break;
    case 'plomien': ctx.moveTo(0, -u * 0.9); ctx.quadraticCurveTo(u * 0.8, 0, u * 0.3, u * 0.8); ctx.lineTo(-u * 0.3, u * 0.8); ctx.quadraticCurveTo(-u * 0.8, 0, 0, -u * 0.9); break;
    case 'post': ctx.arc(0, 0, u * 0.7, 0, Math.PI * 2); ctx.moveTo(-u * 0.5, -u * 0.5); ctx.lineTo(u * 0.5, u * 0.5); break;
    case 'oko': ctx.moveTo(-u * 0.9, 0); ctx.quadraticCurveTo(0, -u * 0.9, u * 0.9, 0); ctx.quadraticCurveTo(0, u * 0.9, -u * 0.9, 0); ctx.moveTo(u * 0.25, 0); ctx.arc(0, 0, u * 0.25, 0, Math.PI * 2); break;
    case 'dlonie': ctx.moveTo(0, -u * 0.9); ctx.lineTo(-u * 0.5, u * 0.4); ctx.lineTo(-u * 0.2, u * 0.8); ctx.moveTo(0, -u * 0.9); ctx.lineTo(u * 0.5, u * 0.4); ctx.lineTo(u * 0.2, u * 0.8); break;
    case 'tarcza': ctx.moveTo(-u * 0.7, -u * 0.7); ctx.lineTo(u * 0.7, -u * 0.7); ctx.lineTo(u * 0.6, u * 0.2); ctx.quadraticCurveTo(0, u * 0.9, 0, u * 0.9); ctx.quadraticCurveTo(0, u * 0.9, -u * 0.6, u * 0.2); ctx.closePath(); break;
    case 'miecz': ctx.moveTo(0, -u * 0.95); ctx.lineTo(0, u * 0.6); ctx.moveTo(-u * 0.45, u * 0.35); ctx.lineTo(u * 0.45, u * 0.35); ctx.moveTo(0, u * 0.6); ctx.lineTo(0, u * 0.9); break;
    case 'zbroja': ctx.moveTo(-u * 0.7, -u * 0.6); ctx.lineTo(u * 0.7, -u * 0.6); ctx.lineTo(u * 0.5, u * 0.8); ctx.lineTo(-u * 0.5, u * 0.8); ctx.closePath(); ctx.moveTo(0, -u * 0.6); ctx.lineTo(0, u * 0.8); break;
    case 'stopa': ctx.ellipse(0, u * 0.25, u * 0.35, u * 0.55, 0, 0, Math.PI * 2); for (let i = 0; i < 4; i++) { ctx.moveTo(-u * 0.35 + i * u * 0.24 + u * 0.08, -u * 0.55); ctx.arc(-u * 0.35 + i * u * 0.24, -u * 0.55, u * 0.08, 0, Math.PI * 2); } break;
    case 'wada': ctx.moveTo(-u * 0.6, -u * 0.6); ctx.lineTo(u * 0.6, u * 0.6); ctx.moveTo(u * 0.6, -u * 0.6); ctx.lineTo(-u * 0.6, u * 0.6); break;
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- błyski kart

/** Jak mocno karta teraz błyska (0…1) od śladów drużyny i jaką barwą. */
function blysk(sim: Sim, id: number): { k: number; barwa: string; co?: string } {
  let best = { k: 0, barwa: '246,216,142', co: undefined as string | undefined };
  for (const s of sim.sladyDruzyny) {
    if (s.id !== id) continue;
    const ms = ((sim.tick - s.tik) / 120) * 1000;
    const k = 1 - ms / PAS.blyskMs;
    if (k <= best.k) continue;
    best = { k, barwa: s.rodzaj === 'smierc' ? '226,80,60' : s.rodzaj === 'fragment' ? '200,210,255' : '246,216,142', co: s.co };
  }
  return best;
}

// ---------------------------------------------------------------- pas kart

/**
 * Pas kart postaci. `przesun` — od której osoby zaczyna się pas, gdy kart jest więcej niż miejsc.
 * Zwraca pola dotyku (karty i „+N”) i miejsca kart po id (dymek szczegółów, samouczek).
 */
export function rysujKartyPostaci(
  ctx: CanvasRenderingContext2D, sim: Sim, u: UkladPasa, zaznaczeni: ReadonlySet<number>,
  kursor: { x: number; y: number }, czas: number, przesun: number,
): { pola: PoleKarty[]; miejsca: Map<number, Obszar> } {
  const osoby = sim.lud.druzyna?.osoby ?? [];
  const pola: PoleKarty[] = [];
  const miejsca = new Map<number, Obszar>();
  const n = osoby.length;
  const miejsc = n <= PAS.kartWPasie ? PAS.kartWPasie : PAS.kartMaks;
  const wiersze = u.wiersze === 2 && miejsc > 6 ? 2 : u.wiersze;
  const sloty = miejscaKart(u.karty, miejsc, wiersze, u.telefon ? 6 : 8);
  const nadmiar = n > miejsc;
  const widac = nadmiar ? miejsc - 1 : miejsc;
  const start = nadmiar ? Math.max(0, Math.min(przesun, n - widac)) : 0;
  for (let i = 0; i < miejsc; i++) {
    const s = sloty[i];
    if (nadmiar && i === miejsc - 1) {
      // „+N” — kolejne osoby; dotknięcie przewija pas
      const reszta = n - widac;
      const podK = kursor.x >= s.x && kursor.x <= s.x + s.w && kursor.y >= s.y && kursor.y <= s.y + s.h;
      tablica(ctx, s.x, s.y, s.w, s.h, podK ? 'pod' : 'zwykla', czas);
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = FRESK.tekst;
      ctx.font = `${u.telefon ? 18 : 22}px ${SERIF}`;
      ctx.fillText(start + widac < n ? `+${n - start - widac}` : '↺', s.x + s.w / 2, s.y + s.h / 2 - 7);
      ctx.font = `italic 12px ${SERIF}`;
      ctx.fillText(start + widac < n ? 'dalej' : 'od początku', s.x + s.w / 2, s.y + s.h / 2 + 13);
      ctx.restore();
      void reszta;
      pola.push({ akcja: 'plusKart', x: s.x, y: s.y, w: s.w, h: s.h });
      continue;
    }
    const o = osoby[start + i];
    if (!o) {
      // puste miejsce: wolne ręce, których jeszcze nie ma
      ctx.save();
      ctx.strokeStyle = 'rgba(214,178,112,0.18)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 3.5, s.y + 3.5, s.w - 7, s.h - 7);
      ctx.restore();
      continue;
    }
    const c = sim.creatureById(o.id);
    karta(ctx, sim, s, o, c && !c.dead ? c : undefined, zaznaczeni.has(o.id), kursor, czas, u.telefon);
    miejsca.set(o.id, s);
    pola.push({ akcja: 'postac', id: o.id, x: s.x, y: s.y, w: s.w, h: s.h });
  }
  return { pola, miejsca };
}

function pasek(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number, barwa: string): void {
  ctx.fillStyle = 'rgba(8,5,4,0.85)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = barwa;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
  ctx.strokeStyle = 'rgba(214,178,112,0.35)'; ctx.lineWidth = 0.8;
  ctx.strokeRect(x + 0.4, y + 0.4, w - 0.8, h - 0.8);
}

function karta(
  ctx: CanvasRenderingContext2D, sim: Sim, s: Obszar, o: Osoba, c: Creature | undefined,
  zazn: boolean, kursor: { x: number; y: number }, czas: number, telefon: boolean,
): void {
  const zywy = !!c && !o.polegl;
  const podK = kursor.x >= s.x && kursor.x <= s.x + s.w && kursor.y >= s.y && kursor.y <= s.y + s.h;
  tablica(ctx, s.x, s.y, s.w, s.h, !zywy ? 'uspiona' : zazn ? 'wlaczona' : podK ? 'pod' : 'zwykla', czas);
  const rola: Rola = (c && rolaPostaci(c)) || o.rola;
  const bR = BARWA_ROLI[rola];
  ctx.save();
  // układ od dołu (komputer): perk, trzy paski, rola i stan, imię — a portret dostaje to, co zostaje u góry
  const krokP = 11;
  const perkY = s.y + s.h - 8;
  const paskiY = perkY - 13 - 3 * krokP;
  const rolaY = paskiY - 5;
  const imieY = rolaY - 15;
  // telefon: portret oddaje miejsce imieniu (przy ośmiu kartach w pasie), ale nie mniej niż 22 px
  ctx.font = `14px ${SERIF}`;
  const pW = telefon ? Math.max(22, Math.min(s.h - 10, s.w * 0.32, s.w - 16 - ctx.measureText(o.imie).width))
    : Math.max(24, Math.min(s.w - 14, imieY - 17 - (s.y + 5)));
  const px = s.x + (telefon ? 5 : (s.w - pW) / 2), py = s.y + 5, pH = telefon ? s.h - 10 : pW;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px, py + pH); ctx.lineTo(px, py + pW * 0.45);
  ctx.arc(px + pW / 2, py + pW * 0.45, pW / 2, Math.PI, 0);
  ctx.lineTo(px + pW, py + pH); ctx.closePath();
  const g = ctx.createLinearGradient(0, py, 0, py + pH);
  g.addColorStop(0, zywy ? 'rgba(70,52,34,0.9)' : 'rgba(30,26,24,0.9)');
  g.addColorStop(1, 'rgba(12,8,6,0.95)');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = zywy ? rgba(bR, 0.55) : 'rgba(120,110,100,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.clip();
  // poległy znika z listy postaci — portret zostaje z ostatniego zastępcy (albo z samej osoby: ten sam numer, ta sama twarz)
  const wzor = c ?? sim.creatureById(o.id);
  const z = wzor ? zastepca(wzor) : zastepcy.get(o.id) ?? zastepcaPoleglego(o);
  ctx.globalAlpha = zywy ? 1 : 0.35;
  ctx.translate(px + pW / 2, py + pH * 0.96);
  rysujPostac(ctx, sim, z, pH * 0.82, czas, 'stoi');
  ctx.restore();
  if (!zywy) {
    // krzyż przez portret
    ctx.strokeStyle = 'rgba(206,80,62,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px + 4, py + 6); ctx.lineTo(px + pW - 4, py + pH - 4); ctx.moveTo(px + pW - 4, py + 6); ctx.lineTo(px + 4, py + pH - 4); ctx.stroke();
  }
  const p = o.perk ? perk(o.perk) : undefined;
  const st = stanPostaci(sim, c, o);
  const bl = blysk(sim, o.id);
  const barwaPerku = zywy ? (bl.k > 0 && bl.co === p?.id ? '#fff2c6' : 'rgba(232,200,120,0.95)') : 'rgba(180,170,150,0.5)';
  ctx.textBaseline = 'alphabetic';
  if (!telefon) {
    const cx = s.x + s.w / 2, tw = s.w - 14;
    ctx.textAlign = 'center';
    ctx.font = `16px ${SERIF}`;
    ctx.fillStyle = zywy ? (zazn ? '#f6e4b8' : '#ead9b4') : 'rgba(200,186,160,0.6)';
    ctx.fillText(dopasuj(ctx, [imieOsoby(o), o.imie], tw), cx, imieY);
    // rola (w barwie roli) · stan (czerwony, gdy zły znak)
    ctx.font = `italic 12px ${SERIF}`;
    const r = rolaOsoby({ rola, plec: o.plec });
    const stT = skroc(ctx, st.tekst, Math.max(20, tw - ctx.measureText(r + ' · ').width));
    const szer = ctx.measureText(`${r} · ${stT}`).width;
    ctx.textAlign = 'left';
    let x = cx - szer / 2;
    ctx.fillStyle = zywy ? rgba(bR, 0.9) : 'rgba(180,170,150,0.55)';
    ctx.fillText(r + ' · ', x, rolaY); x += ctx.measureText(r + ' · ').width;
    ctx.fillStyle = st.zly ? 'rgba(232,120,96,0.95)' : 'rgba(214,198,166,0.85)';
    ctx.fillText(stT, x, rolaY);
    if (zywy && c) {
      // paski: życie, głód, wiara (z podpisami, gdy karta dość szeroka)
      const etyk = s.w >= 104;
      const lw = etyk ? 31 : 0, bx = s.x + 9, bw = s.w - 18;
      const wiersz = (i: number, v: number, barwa: string, nazwa: string) => {
        const yy = paskiY + i * krokP;
        if (etyk) { ctx.font = `12px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(200,186,160,0.75)'; ctx.fillText(nazwa, bx, yy + 9); }
        pasek(ctx, bx + lw, yy + 3, bw - lw, 4, v, barwa);
      };
      wiersz(0, c.hp / Math.max(1, maxHp(sim, c)), 'rgba(196,64,48,0.95)', 'życie');
      wiersz(1, c.hunger, c.hunger > 0.7 ? 'rgba(232,140,60,0.95)' : 'rgba(176,136,70,0.9)', 'głód');
      wiersz(2, c.devotion, 'rgba(232,200,120,0.95)', 'wiara');
    } else if (o.polegl) {
      // poległa: przyczyna w miejscu pasków
      ctx.font = `italic 12px ${SERIF}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226,128,104,0.85)';
      lam(ctx, o.polegl.przyczyna, tw, 3).forEach((l, i) => ctx.fillText(l, cx, paskiY + 9 + i * 13));
    }
    if (p) {
      ctx.font = `12px ${SERIF}`; ctx.textAlign = 'left';
      const zs = 13;
      const nazwa = skroc(ctx, p.nazwa, s.w - 20 - zs - 4);
      const sz = zs + 4 + ctx.measureText(nazwa).width;
      const x0 = cx - sz / 2;
      znakPerku(ctx, p.znak, x0 + zs / 2, perkY - 4, zs, barwaPerku);
      ctx.fillStyle = barwaPerku;
      ctx.fillText(nazwa, x0 + zs + 4, perkY);
    }
  } else {
    // telefon: imię i stan obok portretu, paski u dołu, znak perku w rogu portretu
    const tx = px + pW + 6, tw = s.x + s.w - 5 - tx;
    ctx.textAlign = 'left';
    ctx.font = `14px ${SERIF}`;
    ctx.fillStyle = zywy ? (zazn ? '#f6e4b8' : '#ead9b4') : 'rgba(200,186,160,0.6)';
    ctx.fillText(dopasuj(ctx, [o.imie], tw), tx, s.y + 18);
    ctx.font = `italic 12px ${SERIF}`;
    ctx.fillStyle = st.zly ? 'rgba(232,120,96,0.95)' : 'rgba(214,198,166,0.8)';
    ctx.fillText(skroc(ctx, st.tekst, tw), tx, s.y + 33);
    if (zywy && c) {
      const bh = 3, by = s.y + s.h - 6 - bh * 3 - 4;
      pasek(ctx, tx, by, tw, bh, c.hp / Math.max(1, maxHp(sim, c)), 'rgba(196,64,48,0.95)');
      pasek(ctx, tx, by + bh + 2, tw, bh, c.hunger, c.hunger > 0.7 ? 'rgba(232,140,60,0.95)' : 'rgba(176,136,70,0.9)');
      pasek(ctx, tx, by + 2 * (bh + 2), tw, bh, c.devotion, 'rgba(232,200,120,0.95)');
    }
    if (p) {
      const zs = 12;
      ctx.fillStyle = 'rgba(12,8,6,0.85)';
      ctx.beginPath(); ctx.arc(px + pW - zs * 0.55, py + zs * 0.6, zs * 0.62, 0, Math.PI * 2); ctx.fill();
      znakPerku(ctx, p.znak, px + pW - zs * 0.55, py + zs * 0.6, zs * 0.8, barwaPerku);
    }
  }
  // rozbłysk: perk zadziałał, fragment historii, śmierć, wskrzeszenie
  const b = blysk(sim, o.id);
  if (b.k > 0) {
    const a = wolnoRuszac() ? b.k : Math.min(1, b.k * 1.5);
    ctx.shadowColor = `rgba(${b.barwa},${a})`; ctx.shadowBlur = 16 * a;
    ctx.strokeStyle = `rgba(${b.barwa},${0.9 * a})`; ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
    ctx.shadowBlur = 0;
  }
  // zaznaczenie: gruba złota rama
  if (zazn && zywy) {
    ctx.strokeStyle = 'rgba(246,216,142,0.95)'; ctx.lineWidth = 2.4;
    ctx.strokeRect(s.x - 2.5, s.y - 2.5, s.w + 5, s.h + 5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- szczegóły

export function wierszeSzczegolow(sim: Sim, o: Osoba): Wiersz[] {
  const c = sim.creatureById(o.id);
  const zywy = !!c && !c.dead && !o.polegl;
  const w: Wiersz[] = [];
  const st = stanPostaci(sim, zywy ? c : undefined, o);
  w.push({ tekst: imieOsoby(o), rozm: 17, barwa: '#f6e4b8' });
  w.push({ tekst: `${rolaOsoby(o)} · ${st.tekst}`, rozm: 13, barwa: 'rgba(214,198,166,0.85)', kursywa: true });
  const p = o.perk ? perk(o.perk) : undefined;
  if (p) w.push({ tekst: `${p.nazwa} — ${p.opis}${o.razy ? ` (zadziałało: ${o.razy}×)` : ''}`, rozm: 14, barwa: 'rgba(240,206,128,0.98)', odstep: 6 });
  const wd = o.wada ? perk(o.wada) : undefined;
  if (wd) w.push({ tekst: `Wada: ${wd.nazwa} — ${wd.opis}`, rozm: 14, barwa: 'rgba(232,128,104,0.95)', odstep: 2 });
  if (p?.hak === 'twardy' && o.zuzyty) w.push({ tekst: '„Nie do zdarcia” już raz ocalił — drugi raz nie ocali.', rozm: 13, barwa: 'rgba(214,198,166,0.8)', kursywa: true });
  if (o.kim) w.push({ tekst: o.kim, rozm: 14, barwa: 'rgba(214,198,166,0.92)', kursywa: true, odstep: 6 });
  if (o.fragment) {
    const f = HISTORIA.find((h) => h.id === o.fragment);
    const znany = sim.lud.druzyna?.odsloniete.includes(o.fragment);
    if (f && znany) w.push({ tekst: `${f.tytul}: ${f.tekst}`, rozm: 13, barwa: 'rgba(206,214,250,0.95)', odstep: 6 });
    else if (f) w.push({ tekst: `Pamięta coś o tej górze — odsłoni się, ${KIEDY[f.wyzwalacz]}.`, rozm: 13, barwa: 'rgba(170,176,210,0.85)', kursywa: true, odstep: 6 });
  }
  if (o.polegl) {
    w.push({ tekst: `${o.plec === 'k' ? 'Poległa' : 'Poległ'}: ${o.polegl.przyczyna}.`, rozm: 14, barwa: 'rgba(232,120,96,0.95)', odstep: 6 });
    const cialo = sim.lud.trupy?.some((t) => t.id === o.id);
    w.push({ tekst: cialo ? 'Ciało leży w górze — wskrzeszenie przy ołtarzu przywróci tę samą osobę.' : 'Ciała już nie ma — nie da się ' + (o.plec === 'k' ? 'jej' : 'go') + ' wskrzesić.', rozm: 13, barwa: 'rgba(214,198,166,0.8)', kursywa: true });
  } else if (zywy && c) {
    w.push({ tekst: `życie ${Math.round(c.hp)}/${Math.round(maxHp(sim, c))} · głód ${Math.round(c.hunger * 100)}% · wiara ${Math.round(c.devotion * 100)}%`, rozm: 13, barwa: 'rgba(200,186,160,0.85)', odstep: 4 });
  }
  if (zywy) w.push({ tekst: 'dotknij — zaznacz; drugi raz — pokaż na mapie', rozm: 12, barwa: 'rgba(170,156,130,0.8)', kursywa: true, odstep: 4 });
  return w;
}

// ---------------------------------------------------------------- znak nad postacią na mapie

/** Znak nad głową postaci, której perk albo karta tarota właśnie zadziałały (rośnie i gaśnie). */
export function rysujSladyNaMapie(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  if (!sim.sladyDruzyny.length) return;
  ctx.save();
  for (const s of sim.sladyDruzyny) {
    const t = (sim.tick - s.tik) / 240;
    if (t < 0 || t > 1 || (s.rodzaj !== 'perk' && s.rodzaj !== 'fragment' && s.rodzaj !== 'ocalal' && s.rodzaj !== 'wstal')) continue;
    const c = sim.creatureById(s.id);
    if (!c || c.dead) continue;
    const h = wysokoscPostaci(c, cam.zoom);
    const sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y + 1) - h * 1.25 - t * h * 0.35;
    if (sx < -30 || sy < -30 || sx > cam.vw + 30 || sy > cam.vh + 30) continue;
    const a = Math.sin(Math.min(1, t * 1.2) * Math.PI);
    const z = Math.max(10, h * 0.32);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(16,10,7,0.8)';
    ctx.beginPath(); ctx.arc(sx, sy, z * 0.72, 0, Math.PI * 2); ctx.fill();
    const barwa = s.rodzaj === 'fragment' ? 'rgba(206,214,255,1)' : 'rgba(246,216,142,1)';
    ctx.strokeStyle = barwa; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, z * 0.72, 0, Math.PI * 2); ctx.stroke();
    if (s.co?.startsWith('tarot:')) {
      // karta tarota: mały prostokąt z numerem
      const a2 = arkan(s.co.slice(6));
      ctx.strokeRect(sx - z * 0.3, sy - z * 0.45, z * 0.6, z * 0.9);
      ctx.font = `${Math.max(8, z * 0.38)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = barwa;
      ctx.fillText(a2?.nr ?? '?', sx, sy + 0.5);
    } else if (s.rodzaj === 'fragment') {
      // zwój
      ctx.beginPath(); ctx.moveTo(sx - z * 0.35, sy - z * 0.3); ctx.lineTo(sx + z * 0.35, sy - z * 0.3); ctx.moveTo(sx - z * 0.35, sy); ctx.lineTo(sx + z * 0.3, sy); ctx.moveTo(sx - z * 0.35, sy + z * 0.3); ctx.lineTo(sx + z * 0.2, sy + z * 0.3); ctx.stroke();
    } else {
      const p = perk(s.co ?? '');
      if (p) znakPerku(ctx, p.znak, sx, sy, z * 0.9, barwa);
      else if (s.rodzaj === 'wstal') { ctx.beginPath(); ctx.moveTo(sx, sy - z * 0.4); ctx.lineTo(sx, sy + z * 0.4); ctx.moveTo(sx - z * 0.25, sy - z * 0.12); ctx.lineTo(sx + z * 0.25, sy - z * 0.12); ctx.stroke(); }
    }
  }
  ctx.restore();
}
