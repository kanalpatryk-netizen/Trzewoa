/**
 * PAS TAROTA (Alpha 0.3, wizja Pawła) — medaliony ról (zaznaczanie jak dawniej), talia i miejsca na karty.
 * Dotknięcie talii ciągnie kartę za wiarę (sim/tarot.ts): karta zjeżdża z talii na wolne miejsce i odwraca się
 * (prosto — złoto, odwrócona — czerwień i odwrócona rycina), a pod nią świeca wypala czas działania.
 * Najechanie albo przytrzymanie karty — szczegóły. Rysunek nie losuje: rycinę karty daje stały skrót z jej numeru.
 */
import type { Sim } from '../sim/sim';
import { Job, type Creature } from '../sim/creatures';
import type { Obszar } from './plate';
import { SERIF } from './ink';
import { rysujPostac } from './figury';
import { krazek } from './fresk';
import { FRESK } from '../nastawy/barwy';
import { NAZWA_ROLI_MNOGA, type Rola } from '../sim/lud';
import { TAROT, arkan, slub, ARKANA } from '../nastawy/tarot';
import { cenaKarty, czemuNieKarta, stronaKarty, type KartaNaStole } from '../sim/tarot';
import { miejscaKart, tablica, dopasuj, lam, skroc, type UkladPasa, type Wiersz } from './pas';
import { ROLE_DRUZYNY, BARWA_ROLI, ludRoli } from './druzyna';
import { wolnoRuszac } from './nastroj';

export interface PoleTarota { akcja: 'rola' | 'talia' | 'tarot'; rola?: Rola; miejsce?: number; x: number; y: number; w: number; h: number }

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

const zastepcy = new Map<Rola, Creature>();
function zastepca(rola: Rola, wzor: Creature): Creature {
  let z = zastepcy.get(rola);
  if (!z) { z = { ...wzor }; zastepcy.set(rola, z); }
  Object.assign(z, wzor, { x: 0, y: 0, vy: 0, face: 1, carry: 0, fear: 0, mad: 0, job: Job.STOI, odmowa: undefined, naLinie: undefined, naWiadrze: undefined, wspina: undefined, ksiegaT: undefined, wDloni: undefined, lot: undefined });
  return z;
}

/** Kiedy (zegar ekranu) karta pierwszy raz pojawiła się na stole — z tego animacja zjazdu i odwracania. */
const pojawilaSie = new Map<string, number>();

/** Medaliony ról: dotknięcie zaznacza wszystkich z roli (drugie — kamera do nich). */
function medaliony(ctx: CanvasRenderingContext2D, sim: Sim, o: Obszar, zaznaczeni: ReadonlySet<number>, kursor: { x: number; y: number }, czas: number, telefon: boolean): PoleTarota[] {
  const pola: PoleTarota[] = [];
  const podpisy = !telefon || o.h >= 50;
  const r = Math.max(16, Math.min(26, Math.min(o.w / 6 - 4, (podpisy ? o.h - 18 : o.h) / 2 - 3)));
  const krok = o.w / 3;
  ROLE_DRUZYNY.forEach((rola, n) => {
    const cx = o.x + krok * (n + 0.5), cy = o.y + (podpisy ? r + 3 : o.h / 2);
    const lud = ludRoli(sim, rola);
    const zazn = lud.filter((c) => zaznaczeni.has(c.id)).length;
    const pod = Math.hypot(kursor.x - cx, kursor.y - cy) <= r + 4;
    krazek(ctx, cx, cy, r, lud.length === 0 ? 'uspiony' : zazn === lud.length ? 'wlaczony' : pod ? 'pod' : 'zwykly', `druzyna-${rola}`);
    const wzor = lud.find((c) => zaznaczeni.has(c.id)) ?? lud[0];
    if (wzor) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy + r * 0.8);
      rysujPostac(ctx, sim, zastepca(rola, wzor), r * 1.5, czas, 'stoi');
      ctx.restore();
    }
    if (zazn > 0 && zazn < lud.length) {
      ctx.strokeStyle = 'rgba(246,216,142,0.95)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r + 3.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * zazn) / lud.length); ctx.stroke();
    }
    const lx = cx + r * 0.74, ly = cy + r * 0.68, lr = Math.max(8, r * 0.38);
    ctx.fillStyle = 'rgba(16,10,7,0.94)';
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = zazn > 0 ? 'rgba(246,216,142,0.95)' : FRESK.sinopia; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = lud.length ? rgba(BARWA_ROLI[rola], 0.98) : 'rgba(226,120,100,0.9)';
    ctx.font = `bold ${Math.max(12, Math.round(lr * 1.15))}px ${SERIF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(lud.length), lx, ly + 0.5);
    if (podpisy) {
      ctx.font = `italic 12px ${SERIF}`; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = rgba(BARWA_ROLI[rola], lud.length ? (zazn ? 0.98 : 0.8) : 0.4);
      ctx.fillText(NAZWA_ROLI_MNOGA[rola], cx, cy + r + 15);
    }
    // cel dotyku co najmniej 44 px
    const pw = Math.max(44, r * 2 + 8), ph = Math.max(44, r * 2 + 8);
    pola.push({ akcja: 'rola', rola, x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph });
  });
  // ślub pod medalionami (komputer) — przypomnienie, co trzyma drużynę przez całą partię
  const s = slub(sim.lud.druzyna?.slub);
  if (s && !telefon && o.h > r * 2 + 50) {
    ctx.font = `italic 12px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(232,200,120,0.85)';
    ctx.fillText(skroc(ctx, s.nazwa, o.w), o.x + o.w / 2, o.y + o.h - 6);
  }
  return pola;
}

/** Rycina karty: prosta geometria ze skrótu numeru (bez losowania w rysunku). */
function rycina(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, barwa: string): void {
  const n = Math.max(0, ARKANA.findIndex((a) => a.id === id));
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.strokeStyle = barwa; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  const r = Math.min(w, h) * 0.42;
  ctx.beginPath();
  // słońce / koło / gwiazda / wieża — co trzecia inna, z liczbą promieni od numeru
  const typ = n % 4;
  if (typ === 0) { ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); for (let i = 0; i < 6 + (n % 5); i++) { const a = (i / (6 + (n % 5))) * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } }
  else if (typ === 1) { ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); for (let i = 0; i < 4 + (n % 4); i++) { const a = (i / (4 + (n % 4))) * Math.PI; ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.lineTo(-Math.cos(a) * r * 0.85, -Math.sin(a) * r * 0.85); } }
  else if (typ === 2) { const k = 5 + (n % 3); for (let i = 0; i <= k * 2; i++) { const a = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.42 : r; if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
  else { ctx.moveTo(-r * 0.4, r); ctx.lineTo(-r * 0.4, -r * 0.5); ctx.lineTo(0, -r); ctx.lineTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, r); ctx.moveTo(-r * 0.15, -r * 0.2); ctx.lineTo(r * 0.15, -r * 0.2); ctx.lineTo(r * 0.15, r * 0.15); ctx.lineTo(-r * 0.15, r * 0.15); ctx.closePath(); }
  ctx.stroke();
  ctx.restore();
}

/** Grzbiet karty (talia i karta w trakcie odwracania). */
function grzbiet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  tablica(ctx, x, y, w, h, 'zwykla');
  ctx.save();
  ctx.strokeStyle = 'rgba(196,154,80,0.55)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 7.5, y + 7.5, w - 15, h - 15);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 12); ctx.lineTo(x + w - 12, y + h / 2); ctx.lineTo(x + w / 2, y + h - 12); ctx.lineTo(x + 12, y + h / 2); ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function twarz(ctx: CanvasRenderingContext2D, sim: Sim, k: KartaNaStole, s: Obszar, telefon: boolean, pod: boolean, czas: number): void {
  const a = arkan(k.arkan);
  const st = stronaKarty(k);
  if (!a || !st) return;
  tablica(ctx, s.x, s.y, s.w, s.h, pod ? 'pod' : 'wlaczona', czas);
  ctx.save();
  const barwa = k.odwrocona ? 'rgba(232,112,90,0.95)' : 'rgba(240,206,128,0.98)';
  // świeca czasu: u dołu karty pasek, który się wypala
  const zostalo = Math.max(0, Math.min(1, (k.do - sim.tick) / TAROT.trwa));
  const by = s.y + s.h - 9;
  ctx.fillStyle = 'rgba(8,5,4,0.85)'; ctx.fillRect(s.x + 7, by, s.w - 14, 3);
  ctx.fillStyle = k.odwrocona ? 'rgba(206,80,62,0.9)' : 'rgba(232,190,110,0.9)';
  ctx.fillRect(s.x + 7, by, (s.w - 14) * zostalo, 3);
  if (wolnoRuszac()) {
    const fx = s.x + 7 + (s.w - 14) * zostalo, fy = by - 2;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6);
    g.addColorStop(0, 'rgba(255,220,150,0.9)'); g.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - 6, fy - 6, 12, 12);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = barwa;
  ctx.font = `12px ${SERIF}`;
  if (!telefon && s.w > s.h * 1.2) {
    // pozioma karta (komputer): rycina z lewej, z prawej numer, nazwa i skutek
    const rw = Math.min(s.h - 22, s.w * 0.3);
    ctx.save();
    const rcx = s.x + 8 + rw / 2, rcy = s.y + (s.h - 6) / 2;
    if (k.odwrocona) { ctx.translate(rcx, rcy); ctx.rotate(Math.PI); ctx.translate(-rcx, -rcy); }
    rycina(ctx, a.id, s.x + 8, s.y + 8, rw, s.h - 22, barwa);
    ctx.restore();
    const tx = s.x + 14 + rw, tw = s.x + s.w - 8 - tx;
    ctx.textAlign = 'left';
    ctx.font = `14px ${SERIF}`;
    ctx.fillStyle = '#f0dfb8';
    ctx.fillText(skroc(ctx, `${a.nr} · ${a.nazwa}`, tw), tx, s.y + 20);
    ctx.font = `italic 12px ${SERIF}`;
    ctx.fillStyle = k.odwrocona ? 'rgba(232,140,118,0.95)' : 'rgba(214,198,166,0.9)';
    const maks = Math.max(1, Math.floor((by - 4 - (s.y + 36)) / 13) + 1);
    let y = s.y + 35;
    for (const l of lam(ctx, (k.odwrocona ? 'odwrócona: ' : '') + st.opis, tw, maks)) { if (y > by - 3) break; ctx.fillText(l, tx, y); y += 13; }
    ctx.restore();
    return;
  }
  ctx.fillText(a.nr, s.x + s.w / 2, s.y + 17);
  if (!telefon) {
    // rycina (odwrócona — do góry nogami), nazwa, skutek
    const rh = Math.min(s.h * 0.32, s.w * 0.7);
    ctx.save();
    if (k.odwrocona) { ctx.translate(s.x + s.w / 2, s.y + 22 + rh / 2); ctx.rotate(Math.PI); ctx.translate(-(s.x + s.w / 2), -(s.y + 22 + rh / 2)); }
    rycina(ctx, a.id, s.x + 8, s.y + 22, s.w - 16, rh, barwa);
    ctx.restore();
    ctx.font = `14px ${SERIF}`;
    ctx.fillStyle = '#f0dfb8';
    const nazwy = lam(ctx, a.nazwa, s.w - 12, 2);
    let y = s.y + 22 + rh + 16;
    for (const l of nazwy) { ctx.fillText(l, s.x + s.w / 2, y); y += 15; }
    ctx.font = `italic 12px ${SERIF}`;
    ctx.fillStyle = k.odwrocona ? 'rgba(232,140,118,0.95)' : 'rgba(214,198,166,0.9)';
    const maks = Math.max(1, Math.floor((by - 6 - y) / 14) + 1);
    for (const l of lam(ctx, (k.odwrocona ? 'odwrócona: ' : '') + st.opis, s.w - 12, maks)) { if (y > by - 4) break; ctx.fillText(l, s.x + s.w / 2, y); y += 14; }
  } else {
    ctx.font = `12px ${SERIF}`;
    ctx.fillStyle = '#f0dfb8';
    const nazwy = lam(ctx, a.nazwa, s.w - 8, 2);
    let y = s.y + 31;
    for (const l of nazwy) { ctx.fillText(l, s.x + s.w / 2, y); y += 13; }
    if (k.odwrocona && y < by - 2) { ctx.fillStyle = 'rgba(232,140,118,0.95)'; ctx.font = `italic 12px ${SERIF}`; ctx.fillText(dopasuj(ctx, ['odwrócona', 'odwr.'], s.w - 8), s.x + s.w / 2, Math.min(y, by - 3)); }
  }
  ctx.restore();
}

/** Pas Pawła: medaliony, talia, karty. Zwraca pola dotyku i miejsca kart (po numerze miejsca). */
export function rysujPasTarota(
  ctx: CanvasRenderingContext2D, sim: Sim, u: UkladPasa, zaznaczeni: ReadonlySet<number>,
  kursor: { x: number; y: number }, czas: number,
): { pola: PoleTarota[]; miejsca: Map<number, Obszar> } {
  const pola: PoleTarota[] = [];
  const miejsca = new Map<number, Obszar>();
  if (u.medaliony) pola.push(...medaliony(ctx, sim, u.medaliony, zaznaczeni, kursor, czas, u.telefon));
  const sloty = miejscaKart(u.karty, TAROT.miejsc, u.wiersze === 2 ? 2 : 1, u.telefon ? 6 : 7);
  // talia
  if (u.talia) {
    const t = u.talia;
    const powod = czemuNieKarta(sim);
    const kw = Math.min(t.w - 6, (t.h - (u.telefon ? 4 : 30)) * 0.62);
    const kh = u.telefon ? t.h - 4 : Math.min(t.h - 30, kw / 0.62);
    const kx = t.x + (u.telefon ? 2 : (t.w - kw) / 2), ky = t.y + 2;
    for (let i = 3; i >= 1; i--) grzbiet(ctx, kx + i * 1.5, ky + i * 1.5, kw, kh);
    grzbiet(ctx, kx, ky, kw, kh);
    const pod = kursor.x >= t.x && kursor.x <= t.x + t.w && kursor.y >= t.y && kursor.y <= t.y + t.h;
    if (!powod) {
      // można ciągnąć: talia żarzy się złotem
      const puls = wolnoRuszac() ? 0.5 + 0.5 * Math.sin(czas * 0.004) : 0.7;
      ctx.save();
      ctx.shadowColor = `rgba(246,206,120,${0.5 + 0.4 * puls})`; ctx.shadowBlur = pod ? 18 : 8 + 6 * puls;
      ctx.strokeStyle = `rgba(246,216,142,${0.6 + 0.35 * puls})`; ctx.lineWidth = pod ? 2.2 : 1.5;
      ctx.strokeRect(kx - 1, ky - 1, kw + 2, kh + 2);
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = u.telefon ? 'left' : 'center'; ctx.textBaseline = 'alphabetic';
    const tx = u.telefon ? kx + kw + 6 : t.x + t.w / 2, tw = u.telefon ? t.x + t.w - tx : t.w + 16;
    ctx.font = `${u.telefon ? 14 : 13}px ${SERIF}`;
    ctx.fillStyle = powod ? 'rgba(214,198,166,0.6)' : '#f0dfb8';
    if (u.telefon) {
      ctx.fillText(dopasuj(ctx, ['talia tarota', 'talia'], tw), tx, t.y + t.h * 0.42);
      ctx.font = `italic 12px ${SERIF}`;
      ctx.fillStyle = powod ? 'rgba(226,140,118,0.9)' : 'rgba(232,200,120,0.95)';
      ctx.fillText(dopasuj(ctx, powod ? [powod, powod.split(' (')[0], 'nie teraz'] : [`ciągnij — ${cenaKarty(sim)} wiary`, `${cenaKarty(sim)} wiary`], tw), tx, t.y + t.h * 0.42 + 16);
    } else {
      ctx.fillText(powod ? 'talia' : 'ciągnij', tx, ky + kh + 15);
      ctx.font = `italic 12px ${SERIF}`;
      ctx.fillStyle = powod ? 'rgba(226,140,118,0.9)' : 'rgba(232,200,120,0.95)';
      ctx.fillText(dopasuj(ctx, powod ? [powod.split(' (')[0].replace('za mało wiary', `${cenaKarty(sim)} wiary`), 'nie teraz'] : [`${cenaKarty(sim)} wiary`], tw), tx, ky + kh + 29);
    }
    ctx.restore();
    pola.push({ akcja: 'talia', x: t.x, y: t.y, w: t.w, h: t.h });
  }
  const stol = sim.lud.druzyna?.tarot?.stol ?? [];
  const teraz = performance.now();
  for (let i = 0; i < sloty.length; i++) {
    const s = sloty[i];
    const k = stol.find((q) => q.miejsce === i);
    if (!k) {
      ctx.save();
      ctx.strokeStyle = 'rgba(214,178,112,0.2)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 3.5, s.y + 3.5, s.w - 7, s.h - 7);
      ctx.restore();
      continue;
    }
    const klucz = `${k.arkan}@${k.od}`;
    if (!pojawilaSie.has(klucz)) pojawilaSie.set(klucz, sim.tick - k.od < 240 ? teraz : teraz - 1e6);
    const t = wolnoRuszac() ? Math.min(1, (teraz - pojawilaSie.get(klucz)!) / TAROT.odwracanieMs) : 1;
    const pod = kursor.x >= s.x && kursor.x <= s.x + s.w && kursor.y >= s.y && kursor.y <= s.y + s.h;
    if (t < 1 && u.talia) {
      // zjazd z talii (pierwsza połowa) i odwracanie (druga): skala w poziomie przez zero
      const jazda = Math.min(1, t * 2), e = 1 - Math.pow(1 - jazda, 3);
      const x = u.talia.x + (s.x - u.talia.x) * e, y = u.talia.y + (s.y - u.talia.y) * e;
      ctx.save();
      ctx.translate(x + s.w / 2, y + s.h / 2);
      ctx.scale(t < 0.75 ? Math.max(0.02, t < 0.5 ? 1 : 1 - (t - 0.5) * 4) : Math.max(0.02, (t - 0.75) * 4), 1);
      ctx.translate(-s.w / 2, -s.h / 2);
      if (t < 0.75) grzbiet(ctx, 0, 0, s.w, s.h);
      else twarz(ctx, sim, k, { x: 0, y: 0, w: s.w, h: s.h }, u.telefon, false, czas);
      ctx.restore();
    } else {
      twarz(ctx, sim, k, s, u.telefon, pod, czas);
      // rozbłysk po odwróceniu
      const po = (teraz - pojawilaSie.get(klucz)! - TAROT.odwracanieMs) / 900;
      if (po >= 0 && po < 1) {
        ctx.save();
        const b = k.odwrocona ? '226,80,60' : '246,216,142';
        ctx.shadowColor = `rgba(${b},${1 - po})`; ctx.shadowBlur = 20 * (1 - po);
        ctx.strokeStyle = `rgba(${b},${0.9 * (1 - po)})`; ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
        ctx.restore();
      }
    }
    miejsca.set(i, s);
    pola.push({ akcja: 'tarot', miejsce: i, x: s.x, y: s.y, w: s.w, h: s.h });
  }
  return { pola, miejsca };
}

/** Szczegóły karty tarota (dymek nad nią). */
export function wierszeTarota(sim: Sim, miejsce: number): Wiersz[] {
  const k = sim.lud.druzyna?.tarot?.stol.find((q) => q.miejsce === miejsce);
  const a = k ? arkan(k.arkan) : undefined;
  if (!k || !a) return [];
  const w: Wiersz[] = [];
  w.push({ tekst: `${a.nr} — ${a.nazwa}${k.odwrocona ? ', odwrócona' : ''}`, rozm: 17, barwa: k.odwrocona ? 'rgba(236,140,118,1)' : '#f6e4b8' });
  const st = k.odwrocona ? a.odwrocona : a.prosto;
  w.push({ tekst: st.opis[0].toUpperCase() + st.opis.slice(1) + '.', rozm: 14, barwa: 'rgba(240,206,128,0.98)', odstep: 4 });
  const s = Math.max(0, Math.ceil((k.do - sim.tick) / 120));
  w.push({ tekst: `gaśnie za ${s} s, potem wraca do talii`, rozm: 13, barwa: 'rgba(214,198,166,0.85)', kursywa: true, odstep: 4 });
  const druga = k.odwrocona ? a.prosto : a.odwrocona;
  w.push({ tekst: `Gdyby wypadła ${k.odwrocona ? 'prosto' : 'odwrócona'}: ${druga.opis}.`, rozm: 13, barwa: 'rgba(170,156,130,0.85)', kursywa: true, odstep: 2 });
  return w;
}

/** Szczegóły talii: cena, szansa na odwróconą, ile kart leży. */
export function wierszeTalii(sim: Sim): Wiersz[] {
  const powod = czemuNieKarta(sim);
  const ile = sim.lud.druzyna?.tarot?.stol.length ?? 0;
  return [
    { tekst: 'Talia tarota', rozm: 17, barwa: '#f6e4b8' },
    { tekst: `Karta kosztuje ${cenaKarty(sim)} wiary (każda następna drożej). Prosto daje całej kompanii buff, odwrócona — nerf; odwrócona wypada co ${Math.round(1 / TAROT.odwroconaSzansa)}. karta.`, rozm: 14, barwa: 'rgba(214,198,166,0.95)', odstep: 4 },
    { tekst: `Na stole ${ile} z ${TAROT.miejsc}; karta działa ${Math.round(TAROT.trwa / 120)} s.`, rozm: 13, barwa: 'rgba(200,186,160,0.85)', kursywa: true, odstep: 4 },
    ...(powod ? [{ tekst: powod, rozm: 13, barwa: 'rgba(232,128,104,0.95)', kursywa: true, odstep: 2 }] : []),
  ];
}
