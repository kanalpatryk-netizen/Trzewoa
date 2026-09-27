import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { makeCreature, type Creature } from '../sim/creatures';
import { cost, type Verb } from '../powers/powers';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { BARWA, rgba } from '../render/palette';
import { kreskuj, kropkuj, pseudo, type Plotno } from '../cutscene/art/common';
import { rysujGore } from '../cutscene/art/gora';
import { rysujPamiec } from '../cutscene/art/pamiec';
import { rysujZyly } from '../cutscene/art/zyly';
import { rysujZiarno } from '../cutscene/art/ziarno';
import { rysujSzept } from '../cutscene/art/szept';
import { rysujZnak } from '../cutscene/art/znak';
import { rysujSpis } from '../cutscene/art/spis';
import { rysujOrgany } from '../cutscene/art/organy';
import { rysujPrzyplyw } from '../cutscene/art/przyplyw';
import { glif } from '../render/tajemnica';
import { RYTUAL, PIELGRZYMKA } from '../nastawy/rytual';
import { LUDY } from '../nastawy/gora';

/** Próg w procentach — teksty tablic biorą liczby z nastaw, żeby nie kłamały po strojeniu. */
const proc = (x: number): string => `${Math.round(x * 100)}%`;

export type Grupa = 'rasy' | 'ryty' | 'zasoby' | 'prawa';

/**
 * Tablica z atlasu: u góry rycina, pod nią nazwa, łaciński podpis, kilka zdań
 * o tym, czym to jest, i jedno — kiedy tego użyć. Nie karta do gry, tylko plansza
 * z księgi, którą gracz zapełnia, poznając górę.
 */
export interface Tablica {
  id: string;
  grupa: Grupa;
  nazwa: string;
  lacina: string;
  opis: string;
  kiedy: string;
  /** Koszt w słowach — tylko ryty. */
  koszt?: string;
  rycina: (p: Plotno) => void;
}

export const NAZWY_GRUP: Record<Grupa, string> = {
  rasy: 'Ci, którzy w tobie mieszkają',
  ryty: 'Cztery ryty',
  zasoby: 'Czym płacisz',
  prawa: 'Prawa góry',
};

function kosztSlowami(v: Verb, narzedzie: string): string {
  const c = cost(v, narzedzie);
  const cz: string[] = [];
  if (c.krew) cz.push(`${c.krew} krwi`);
  if (c.wiara) cz.push(`${c.wiara} wiary`);
  return cz.length ? cz.join(', ') : 'nic';
}

// ---------------------------------------------------------------- ryciny

/** Rysunek w pełni wykonany — przerywniki rysują się w takt narracji, tablica od razu cała. */
const cala = (f: (p: Plotno) => void) => (p: Plotno) => f({ ...p, p: 1, takt: 99, taktP: 1 });

/** Tło rycin postaci: sklepienie jaskini kreskowane jak w atlasie. */
function sklepienie(ctx: CanvasRenderingContext2D, w: number, h: number, ziarno: number): void {
  const luk = new Path2D();
  luk.moveTo(0, 0); luk.lineTo(w, 0); luk.lineTo(w, h);
  for (let i = 12; i >= 0; i--) {
    const x = (i / 12) * w;
    const y = h * (0.86 + 0.05 * Math.sin(i * 1.7 + ziarno));
    luk.lineTo(x, y);
  }
  luk.closePath();
  const pustka = new Path2D();
  pustka.ellipse(w / 2, h * 0.62, w * 0.46, h * 0.52, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  const skala = new Path2D();
  skala.addPath(luk);
  ctx.fillStyle = 'rgba(40,30,24,0.9)';
  ctx.fill(skala);
  kreskuj(ctx, skala, 0.7 + ziarno * 0.1, 5, rgba(BARWA.atrament, 0.2), 1);
  // pustka jaskini — ciepły półmrok, w którym stoi postać
  const g = ctx.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.5);
  g.addColorStop(0, 'rgba(70,52,38,0.95)');
  g.addColorStop(1, 'rgba(14,10,9,0.95)');
  ctx.fillStyle = g;
  ctx.fill(pustka);
  // podłoga
  const podloga = new Path2D();
  podloga.rect(0, h * 0.82, w, h * 0.18);
  ctx.fillStyle = 'rgba(22,16,13,0.97)';
  ctx.fill(podloga);
  kreskuj(ctx, podloga, 0.35, 4, rgba(BARWA.atrament, 0.32), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.lineTo(w, h * 0.82); ctx.stroke();
  ctx.restore();
}

/** Atrapa świata dla figur — rysunek potrzebuje tylko barwy klanu. */
const atrapy = new Map<number, { sim: Sim; c: Creature }>();
function atrapa(rasa: Race): { sim: Sim; c: Creature } {
  let a = atrapy.get(rasa);
  if (!a) {
    const sim = { clans: [{ race: rasa, tint: 0 }] } as unknown as Sim;
    a = { sim, c: makeCreature(rasa, 0, 0, 0, 900 + rasa) };
    atrapy.set(rasa, a);
  }
  return a;
}

function postac(rasa: Race, czyn: Czynnosc, skala = 1): (p: Plotno) => void {
  return ({ ctx, w, h, t }) => {
    sklepienie(ctx, w, h, rasa);
    const { sim, c } = atrapa(rasa);
    const wys = h * 0.5 * skala;
    ctx.save();
    ctx.translate(w / 2, h * 0.82);
    rysujPostac(ctx, sim, c, wys, t, czyn);
    ctx.restore();
  };
}

function grzybnia({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 7);
  ctx.save();
  // kępy zarodni wyrastające ze zwłok: blade kości, na nich świecąca narośl
  for (let k = 0; k < 7; k++) {
    const x = w * (0.15 + 0.7 * pseudo(k * 3.1)), y = h * 0.82;
    const r = h * (0.08 + 0.1 * pseudo(k * 1.9));
    const kepa = new Path2D();
    kepa.ellipse(x, y, r * 1.3, r, 0, Math.PI, 0);
    const blask = 0.5 + 0.5 * Math.sin(t * 0.002 + k);
    ctx.fillStyle = `rgba(${40 + 30 * blask},${70 + 60 * blask},${34 + 20 * blask},0.85)`;
    ctx.fill(kepa);
    kropkuj(ctx, kepa, 260, `rgba(170,230,130,${0.5 + 0.4 * blask})`, k);
  }
  ctx.strokeStyle = 'rgba(220,210,190,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.8); ctx.lineTo(w * 0.58, h * 0.74);
  ctx.moveTo(w * 0.45, h * 0.74); ctx.lineTo(w * 0.56, h * 0.81);
  ctx.stroke();
  ctx.restore();
}

function prorok({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 3);
  const { sim, c } = atrapa(Race.GOBLIN);
  ctx.save();
  // promienie za głową proroka
  ctx.strokeStyle = 'rgba(246,214,140,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + t * 0.0002;
    ctx.moveTo(w / 2 + Math.cos(a) * h * 0.12, h * 0.46 + Math.sin(a) * h * 0.12);
    ctx.lineTo(w / 2 + Math.cos(a) * h * 0.3, h * 0.46 + Math.sin(a) * h * 0.3);
  }
  ctx.stroke();
  ctx.translate(w / 2, h * 0.82);
  rysujPostac(ctx, sim, c, h * 0.5, t, 'modli');
  ctx.restore();
  // wierni w półmroku po bokach — mniejsi, dalej
  for (const [dx, s] of [[-0.38, 0.48], [0.38, 0.48], [-0.25, 0.6], [0.25, 0.6]] as [number, number][]) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.translate(w / 2 + dx * w, h * 0.82);
    ctx.scale(dx < 0 ? 1 : -1, 1);
    rysujPostac(ctx, sim, c, h * 0.5 * s, t + dx * 1000, 'modli');
    ctx.restore();
  }
}

function pielgrzymka({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  // skała z wąskim szybem w dół i rdzeniem na dnie
  const skala = new Path2D();
  skala.rect(0, 0, w, h);
  const szyb = new Path2D();
  const sx = w * 0.5, sz = w * 0.05;
  szyb.rect(sx - sz, 0, sz * 2, h * 0.72);
  szyb.moveTo(sx + w * 0.2, h * 0.8);
  szyb.ellipse(sx, h * 0.8, w * 0.2, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(36,27,22,0.95)';
  ctx.fill(skala);
  kreskuj(ctx, skala, 0.62, 5, rgba(BARWA.atrament, 0.22), 1);
  ctx.fillStyle = 'rgba(20,14,12,1)';
  ctx.fill(szyb);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.55);
  ctx.lineWidth = 1.3;
  ctx.stroke(szyb);
  const puls = 0.5 + 0.5 * Math.sin(t * 0.003);
  const g = ctx.createRadialGradient(sx, h * 0.84, 2, sx, h * 0.84, h * 0.12);
  g.addColorStop(0, `rgba(255,${120 + 60 * puls},100,1)`);
  g.addColorStop(1, 'rgba(120,20,26,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, h * 0.84, h * 0.12, 0, Math.PI * 2); ctx.fill();
  // pielgrzymi schodzący po ścianach szybu
  const { sim, c } = atrapa(Race.GOBLIN);
  for (let i = 0; i < 3; i++) {
    const y = h * (0.18 + i * 0.2 + 0.03 * Math.sin(t * 0.001 + i));
    ctx.save();
    ctx.translate(sx + (i % 2 ? sz * 0.5 : -sz * 0.5), y);
    rysujPostac(ctx, sim, c, h * 0.13, t + i * 400, 'wspina');
    ctx.restore();
  }
  ctx.restore();
}

function pauza({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  // szkice rozkazów wokół klepsydry — przerywane, płynące
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -t * 0.02;
  ctx.lineWidth = 1.5;
  const kr: [number, number, number, string][] = [
    [0.2, 0.3, 0.1, 'rgba(236,226,204,0.8)'], [0.8, 0.28, 0.08, 'rgba(156,214,122,0.8)'],
    [0.22, 0.75, 0.09, 'rgba(206,156,96,0.8)'], [0.78, 0.72, 0.1, 'rgba(250,216,136,0.8)'],
  ];
  for (const [x, y, r, k] of kr) {
    ctx.strokeStyle = k;
    ctx.beginPath(); ctx.arc(w * x, h * y, h * r * 1.6, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.setLineDash([]);
  // klepsydra
  const s = h * 0.34, cx = w / 2, cy = h * 0.52;
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, cy - s * 0.5); ctx.lineTo(cx + s * 0.42, cy - s * 0.5);
  ctx.lineTo(cx - s * 0.42, cy + s * 0.5); ctx.lineTo(cx + s * 0.42, cy + s * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.52, cy - s * 0.56); ctx.lineTo(cx + s * 0.52, cy - s * 0.56);
  ctx.moveTo(cx - s * 0.52, cy + s * 0.56); ctx.lineTo(cx + s * 0.52, cy + s * 0.56);
  ctx.stroke();
  // piasek zatrzymany w pół ruchu
  const piasek = new Path2D();
  piasek.moveTo(cx - s * 0.3, cy - s * 0.38); piasek.lineTo(cx + s * 0.3, cy - s * 0.38); piasek.lineTo(cx, cy - s * 0.04);
  piasek.closePath();
  kropkuj(ctx, piasek, 500, 'rgba(240,220,180,0.8)', 3);
  ctx.fillStyle = 'rgba(240,220,180,0.8)';
  ctx.fillRect(cx - 1, cy - s * 0.04, 2, s * 0.3);
  ctx.restore();
}

/** Droga do wolności: gniazdo u góry, złota kreska w dół, cztery stacje i rdzeń w skorupie. */
function drogaWolnosci({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  const skala = new Path2D();
  skala.rect(0, 0, w, h);
  kreskuj(ctx, skala, 0.7, 5, rgba(BARWA.atrament, 0.1), 1);
  // gniazdo: jaskinia u góry z lewej
  ctx.fillStyle = '#0d0a09';
  ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.2, w * 0.13, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.8);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * (0.13 + i * 0.035), h * 0.24, 1.8, 0, Math.PI * 2); ctx.fill(); }
  // rdzeń w skorupie na dole
  const rx = w * 0.72, ry = h * 0.8;
  const g = ctx.createRadialGradient(rx, ry, 1, rx, ry, h * 0.14);
  g.addColorStop(0, 'rgba(230,90,60,0.9)');
  g.addColorStop(1, 'rgba(230,90,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(rx - h * 0.14, ry - h * 0.14, h * 0.28, h * 0.28);
  ctx.strokeStyle = rgba(BARWA.atrament, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(rx, ry, h * 0.08, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  // droga: złota, przerywana, płynąca w dół
  const punkty: [number, number][] = [[0.24, 0.27], [0.36, 0.34], [0.33, 0.47], [0.5, 0.52], [0.56, 0.62], [0.7, 0.63], [0.72, 0.72]];
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t * 0.02;
  ctx.strokeStyle = 'rgba(250,196,110,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  punkty.forEach(([x, y], i) => (i ? ctx.lineTo(w * x, h * y) : ctx.moveTo(w * x, h * y)));
  ctx.stroke();
  ctx.setLineDash([]);
  // cztery stacje: wiara, oddanie, droga, skorupa
  for (const k of [1, 2, 4, 6]) {
    const [x, y] = punkty[k];
    ctx.fillStyle = '#0d0a09';
    ctx.beginPath(); ctx.arc(w * x, h * y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(250,206,130,0.95)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

/** Skorupa: rdzeń w komorze, kamienny pierścień, rysa w stronę trzech klęczących. */
function skorupa({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.55, R = h * 0.36;
  // kamień skorupy: gruby pierścień kreskowany
  const pier = new Path2D();
  pier.arc(cx, cy, R, 0, Math.PI * 2);
  pier.arc(cx, cy, R * 0.55, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(58,48,40,0.95)';
  ctx.fill(pier, 'evenodd');
  kreskuj(ctx, pier, 0.8, 4, rgba(BARWA.atrament, 0.28), 1);
  // rdzeń w komorze
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.45);
  g.addColorStop(0, 'rgba(236,96,64,0.95)');
  g.addColorStop(1, 'rgba(236,96,64,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, Math.PI * 2); ctx.fill();
  // rysa: pęknięcia od góry w stronę rdzenia, kolejne kafle wypadają
  const post = 0.5 + 0.5 * Math.sin(t * 0.0008);
  ctx.strokeStyle = 'rgba(250,206,130,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const dl = R * 0.45 * post;
  ctx.moveTo(cx, cy - R); ctx.lineTo(cx - 3, cy - R + dl * 0.4); ctx.lineTo(cx + 2, cy - R + dl * 0.75); ctx.lineTo(cx, cy - R + dl);
  ctx.stroke();
  // trzej wierni nad skorupą
  ctx.fillStyle = rgba(BARWA.atramentMocny, 0.9);
  for (const dx of [-0.13, 0, 0.13]) {
    const x = cx + w * dx, y = cy - R - h * 0.06;
    ctx.beginPath(); ctx.arc(x, y - 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 2.5, y - 2, 5, 7);
  }
  ctx.restore();
}

/** Pismo w skale: blok litej skały z żarzącymi się znakami, które gasną w smudze światła. */
function pismo({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0d0a09';
  ctx.fillRect(0, 0, w, h);
  const blok = new Path2D();
  blok.rect(0, 0, w, h);
  kreskuj(ctx, blok, 0.62, 5, rgba(BARWA.atrament, 0.1), 1);
  // smuga światła z lewej: tam, gdzie pada, znaków już nie ma
  const g = ctx.createLinearGradient(0, 0, w * 0.45, 0);
  g.addColorStop(0, 'rgba(224,186,120,0.22)');
  g.addColorStop(1, 'rgba(224,186,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const oddech = 0.5 + 0.5 * Math.sin(t * 0.0012);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const znaki: [number, number, number, boolean][] = [
    [0.52, 0.3, 0.07, false], [0.68, 0.62, 0.06, false], [0.86, 0.34, 0.075, true], [0.6, 0.84, 0.05, false],
    [0.9, 0.78, 0.055, false], [0.36, 0.66, 0.05, false], [0.64, 0.12, 0.045, false],
  ];
  znaki.forEach(([x, y, r, pieczec], i) => {
    const s = h * r * 1.3;
    // bliżej światła — bledsze
    const a = Math.max(0, Math.min(1, (x - 0.3) / 0.5)) * (0.45 + 0.35 * Math.sin(oddech * 3 + i));
    ctx.save();
    ctx.translate(w * x, h * y);
    ctx.rotate((i % 3 - 1) * 0.15);
    ctx.strokeStyle = `rgba(226,170,110,${a})`;
    if (pieczec) {
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.scale(s, s);
    ctx.lineWidth = 1.6 / s;
    ctx.stroke(glif(40 + i * 13, i % 3));
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- tablice

export const TABLICE: Tablica[] = [
  // rasy
  {
    id: 'rasa-0', grupa: 'rasy', nazwa: 'Ślepy Lud', lacina: 'Gens caeca',
    opis: 'Jedyni, którzy rodzą dzieci. Modlą się najgorliwiej i sami składają ci w ofierze własne potomstwo. Ile ich jest, zależy wprost od grzyba i padliny w zasięgu.',
    kiedy: 'Karm ich grzybem, gdy głodują. To oni najłatwiej w ciebie uwierzą — z nich zrób wartę pod rdzeniem.',
    rycina: postac(Race.GOBLIN, 'modli'),
  },
  {
    id: 'rasa-1', grupa: 'rasy', nazwa: 'Żużlowcy', lacina: 'Fabri scoriae',
    opis: 'Nie rodzą się — wykuwa się ich w kuźni z trzech bryłek rudy. Żyją z ciepła ognia i giną, gdy kuźnia wygaśnie. Obłęd głębi ima się ich słabiej niż innych.',
    kiedy: 'Zasiej rudę przy ich kuźni. Gdy nie mają ciepła, otwórz żar obok — nigdy pod nogami.',
    rycina: postac(Race.DWARF, 'kopie'),
  },
  {
    id: 'rasa-2', grupa: 'rasy', nazwa: 'Trole', lacina: 'Qui nimis fodit',
    opis: 'Trolem nikt się nie rodzi — zostaje nim ten, kto kopał za głęboko i wrócił inny. Silny, powolny, nie czci nikogo. Głodny poluje, a gdy nie ma na kogo, zasypia w skale.',
    kiedy: 'Trzymaj ludzi z dala od najgłębszych korytarzy — tam rodzą się trole.',
    rycina: postac(Race.TROLL, 'stoi', 0.95),
  },
  {
    id: 'rasa-3', grupa: 'rasy', nazwa: 'Prządki', lacina: 'Textrices servorum',
    opis: 'Nie podbijają — przejmują. Biorą słabszych w jarzmo, przerabiają cudze dzieci na swoje, a głodne wysysają tych, których wzięły. Rosną wyłącznie cudzym kosztem.',
    kiedy: 'Potrzebują sąsiadów słabszych od siebie. Kości przy gnieździe przetrzymają głód.',
    rycina: postac(Race.SPINNER, 'stoi', 0.8),
  },
  {
    id: 'rasa-4', grupa: 'rasy', nazwa: 'Ludzie', lacina: 'Advenae superni',
    opis: 'Nie mieszkają w tobie. Schodzą z powierzchni po rudę i sławę, zabierają, co znajdą, i wracają na górę. Nie liczą się do wstęgi warstw.',
    kiedy: 'Zawał odetnie im drogę, a każda ich śmierć to twoja krew.',
    rycina: postac(Race.HUMAN, 'idzie'),
  },
  {
    id: 'rasa-5', grupa: 'rasy', nazwa: 'Grzybnia', lacina: 'Caro in fungum',
    opis: 'Nie ma jednostek i nie czci cię wcale. Rośnie ze zwłok — każda śmierć to paliwo na kilka kafli. Obcym parzy stopy, Ślepemu Ludowi daje jeść.',
    kiedy: 'Wyrasta sama po każdej rzezi. Gdzie jej za dużo, wytnie ją zawał albo woda.',
    rycina: grzybnia,
  },
  // ryty
  {
    id: 'ryt-ksztaltuj', grupa: 'ryty', nazwa: 'Kształtuj', lacina: 'Formatio saxi',
    opis: 'Ruszasz samą skałę: drążysz przejście, zawalasz strop, wpuszczasz wodę albo otwierasz żar. Magma wpuszczona do wody zastyga w kamień na zawsze.',
    kiedy: 'Drąż drogę do rudy albo do sąsiada. Zawalaj, gdy ktoś bierze górę.',
    koszt: `drążenie ${kosztSlowami('ksztaltuj', 'draz')}, żar ${kosztSlowami('ksztaltuj', 'zar')}`,
    rycina: cala(rysujZyly),
  },
  {
    id: 'ryt-zasiej', grupa: 'ryty', nazwa: 'Zasiej', lacina: 'Semen causae',
    opis: 'Nie rozkazujesz, dokąd iść — kładziesz w skale powód. Grzyb to jedzenie, ruda to materiał na ołtarze i kuźnie, kości są padliną, która też karmi.',
    kiedy: 'Siej przy tych, których jest najmniej. Dosypywanie zwycięzcy przybliża sen.',
    koszt: `grzyb ${kosztSlowami('zasiej', 'grzyb')}, ruda ${kosztSlowami('zasiej', 'ruda')}`,
    rycina: cala(rysujZiarno),
  },
  {
    id: 'ryt-szept', grupa: 'ryty', nazwa: 'Szepcz', lacina: 'Susurrus',
    opis: 'Dotykasz jednej głowy. „Módl się” posyła go pod twój rdzeń: idzie tam jako wierny i modli się pod skorupą. „Prorokuj” odrywa go z garstką wiernych w nową nację. „Uciekaj” wypędza go w górę, z dala od zagrożenia.',
    kiedy: 'Trzech wysłanych „módl się” z jednej nacji wystarczy, żeby skorupa zaczęła pękać. Prorok rozbija nację, która zjada resztę.',
    koszt: `módl się ${kosztSlowami('szept', 'modl')}, prorok ${kosztSlowami('szept', 'prorok')}`,
    rycina: cala(rysujSzept),
  },
  {
    id: 'ryt-znak', grupa: 'ryty', nazwa: 'Znak', lacina: 'Signum manifestum',
    opis: 'Jawny cud widziany w promieniu dwudziestu sześciu kafli. Objawienie podnosi oddanie i gasi strach, panika rozgania. Zostaje glif — modlitwa przy nim liczy się podwójnie.',
    kiedy: 'Stawiaj przy gnieździe nacji, którą chcesz doprowadzić do rdzenia. Jedno, dwa objawienia i sama wyśle wartę.',
    koszt: kosztSlowami('znak', 'objawienie'),
    rycina: cala(rysujZnak),
  },
  // zasoby
  {
    id: 'krew', grupa: 'zasoby', nazwa: 'Krew', lacina: 'Sanguis',
    opis: 'Czerwona rysa pod płytą. Płaci ci ją każda śmierć w twoich trzewiach — cudza wojna jest twoim dochodem.',
    kiedy: 'Wydajesz ją na kształtowanie skały i zasiew.',
    rycina: cala(rysujOrgany),
  },
  {
    id: 'wiara', grupa: 'zasoby', nazwa: 'Wiara', lacina: 'Fides',
    opis: 'Dym ofiarny pod sklepieniem płyty — twój zapas. Rośnie za każdym razem, gdy ktoś się do ciebie modli: przy ołtarzu, kuźni, twoim Znaku, a najmocniej pod rdzeniem. Nie myl jej z oddaniem: Wiara to twoja waluta, oddanie to to, jak mocno wierzy nacja.',
    kiedy: 'Płacisz nią za szept i Znak. Nacięcie „Znak" u góry płyty mówi, kiedy cię stać. Więcej w tablicy Oddanie i modlitwa.',
    rycina: cala(rysujOrgany),
  },
  // prawa góry
  {
    id: 'pamiec', grupa: 'prawa', nazwa: 'Pamięć', lacina: 'Memoria',
    opis: 'Widzisz siebie tylko tam, gdzie ktoś jest albo był. Gdzie nikt nie chodzi, rysunek blaknie i pokazuje stan sprzed pokoleń, a potem ciemność.',
    kiedy: 'Drąż drogi, żeby chodzili dalej — wtedy więcej o sobie zobaczysz.',
    rycina: cala(rysujPamiec),
  },
  {
    id: 'sen', grupa: 'prawa', nazwa: 'Sen', lacina: 'Somnus',
    opis: 'Jedyna przegrana. Przychodzi z monokultury albo z pustki: powieka schodzi z góry i z dołu płyty. Budzi cię tylko wojna, którą sam rozpętałeś.',
    kiedy: 'Gdy wstęga warstw zaczyna mieć jeden kolor — rozbijaj ją prorokiem albo zawałem.',
    rycina: cala(rysujSpis),
  },
  {
    id: 'prorok', grupa: 'prawa', nazwa: 'Prorok', lacina: 'Propheta',
    opis: 'Szept „prorokuj" odrywa od nacji jednego z garstką wiernych. Nowa nacja od razu ma urazę do dawnej — a wojny z twojego szeptu cofają sen.',
    kiedy: 'Najlepiej w największej nacji zwycięskiej krwi.',
    rycina: prorok,
  },
  {
    id: 'droga', grupa: 'prawa', nazwa: 'Droga do wolności', lacina: 'Via liberationis',
    opis: `Wygrywasz, gdy wierni przebiją skorupę rdzenia i uklękną przy nim. Po kolei: ktoś musi się modlić (wiara); jedna nacja musi uwierzyć na ${proc(PIELGRZYMKA.oddanieNacji)} — Znak przy jej gnieździe (oddanie) — albo sam poślesz trzech jej ludzi szeptem „módl się”; przy przedsionku pod rdzeniem musi rosnąć grzyb, żeby warta przeżyła na dole (droga); warta modli się przy rdzeniu, aż skorupa pęknie (skorupa); potem wierni sami wchodzą do środka.`,
    kiedy: 'Kroki widać w lewym górnym rogu płyty. Po drodze nie daj górze zasnąć: nikt nie może wymrzeć ani zjeść reszty.',
    rycina: drogaWolnosci,
  },
  {
    id: 'skorupa', grupa: 'prawa', nazwa: 'Skorupa rdzenia', lacina: 'Testa cordis',
    opis: `Kamień wokół rdzenia — nie wydrążysz go ani nie zawalisz. Pęka tylko pod modlitwą: gdy przy rdzeniu (do 16 kafli) stoi naraz co najmniej trzech wiernych jednej nacji, każdy z oddaniem od ${proc(RYTUAL.minOddanie)}. Postęp zostaje przy nacji. Każde pęknięcie wyjmuje jeden kafel od strony, z której się modlą — góra, dół albo bok; zwykle trzeba ich około pięciu, każde idzie wolniej od poprzedniego.`,
    kiedy: 'Trzymaj trzech i więcej razem, najedzonych i wierzących. Postęp widać na plakietce: „skorupa 2/5". Prorok dzieli wartę — nie teraz.',
    rycina: skorupa,
  },
  {
    id: 'rdzen', grupa: 'prawa', nazwa: 'Rdzeń', lacina: 'Cor montis',
    opis: `Gdy przez skorupę prowadzi przejście, wierni sami schodzą do środka — nie musisz ich prowadzić. Kto dotknie rdzenia albo wejdzie do pustej komory wokół niego, kończy grę: wierzący (nacja ponad ${proc(RYTUAL.uwolnienieNacja)} albo on sam ponad ${proc(RYTUAL.uwolnienieWlasne)}) cię uwalnia, bezbożny zabija.`,
    kiedy: 'Pilnuj przejścia: nie zalewaj go i nie zawalaj, a bezbożnych trzymaj od niego z dala.',
    rycina: cala(rysujGore),
  },
  {
    id: 'oddanie', grupa: 'prawa', nazwa: 'Oddanie i modlitwa', lacina: 'Devotio',
    opis: `Każda nacja ma oddanie: od 0 do 100%, jak mocno w ciebie wierzy — widać je na karcie mieszkańca i na wstędze drogi. Ślepy Lud zaczyna od ${proc(LUDY.oddanieStart.slepyLud)}, inni prawie od zera. Kto wierzy, ten się modli: przy ołtarzu (stawiają go z rudy, którą zasiejesz), przy twoim Znaku i pod rdzeniem. Każda modlitwa daje ci Wiarę i trochę podnosi oddanie. Najszybciej podniesie je Znak „objawienie” przy gnieździe. Przy ${proc(PIELGRZYMKA.oddanieNacji)} nacja sama wyśle wartę pod rdzeń.`,
    kiedy: 'Najprościej: zasiej rudę przy Ślepym Ludzie (ołtarz), postaw objawienie przy ich gnieździe, zasiej grzyb przy przedsionku — i szepnij „módl się” trzem z nich.',
    rycina: pielgrzymka,
  },
  {
    id: 'pielgrzymka', grupa: 'prawa', nazwa: 'Pielgrzymka', lacina: 'Peregrinatio',
    opis: `Gdy oddanie nacji przekroczy ${proc(PIELGRZYMKA.oddanieNacji)}, najwyżej pięciu najwierniejszych samo schodzi pod rdzeń i modli się pod skorupą — o ile przy przedsionku jest co jeść albo spod rdzenia da się wrócić do gniazda. Nie chcesz czekać? Szepnij „módl się” — wysłany idzie od razu, bez względu na wiarę swojej nacji.`,
    kiedy: 'Zasiej grzyb przy przedsionku — gdzie nie ma przejścia, wierni przekopią się sami. Jeśli chcesz, żeby wracali do gniazda, wydrąż im korytarz wzdłuż złotej kreski.',
    rycina: pielgrzymka,
  },
  {
    id: 'przyplyw', grupa: 'prawa', nazwa: 'Przypływ', lacina: 'Aestus',
    opis: 'Co jakiś czas coś wchodzi z zewnątrz: woda, zaraza, żyła szaleństwa albo ludzie. Gdy góra pustoszeje, nowe plemię schodzi samo.',
    kiedy: 'Przypływu nie zatrzymasz. Zdecyduj, kto po nim zostanie.',
    rycina: cala(rysujPrzyplyw),
  },
  {
    id: 'pauza', grupa: 'prawa', nazwa: 'Pauza', lacina: 'Tempus suspensum',
    opis: 'Czas możesz zatrzymać. Rozkazy wydane w pauzie rysują się jako szkice, rezerwują koszt i dzieją się naraz, gdy puścisz czas.',
    kiedy: 'Zatrzymuj świat, gdy musisz trafić — i przy każdym kryzysie.',
    rycina: pauza,
  },
  {
    id: 'pismo', grupa: 'prawa', nazwa: 'Pismo w skale', lacina: 'Scriptura ignota',
    opis: 'W skale, do której nikt jeszcze nie zajrzał, widać znaki. Nikt z żyjących ich nie wyrył — były tu przed pierwszym goblinem. Gasną, gdy dojdzie do nich światło; w zatrzymanym czasie widać je wyraźniej.',
    kiedy: 'Nie da się ich przeczytać. Można tylko pójść tam, gdzie są, i patrzeć, jak znikają.',
    rycina: pismo,
  },
];

export const tablica = (id: string): Tablica | undefined => TABLICE.find((t) => t.id === id);
