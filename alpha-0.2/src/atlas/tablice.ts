import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { makeCreature, type Creature } from '../sim/creatures';
import { cost, type Verb } from '../powers/powers';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { BARWA, rgba } from '../render/palette';
import { kreskuj, kropkuj, type Plotno } from '../cutscene/art/common';
import { rysujPamiec } from '../cutscene/art/pamiec';
import { rysujZiarno } from '../cutscene/art/ziarno';
import { rysujSzept } from '../cutscene/art/szept';
import { rysujZnak } from '../cutscene/art/znak';
import { rysujSpis } from '../cutscene/art/spis';
import { rysujOrgany } from '../cutscene/art/organy';
import { rysujPrzyplyw } from '../cutscene/art/przyplyw';
import { glif } from '../render/tajemnica';
import { RYTUAL, PIELGRZYMKA } from '../nastawy/rytual';
import { GORA } from '../nastawy/gora';
import { STRAZNICY } from '../nastawy/straznicy';
import { MOCE } from '../nastawy/moce';
import { WYDARZENIA } from '../nastawy/wydarzenia';
import { LUD, type Rola } from '../nastawy/lud';
import { MROK } from '../nastawy/mrok';
import { DLON } from '../nastawy/dlon';
import { WIADRO } from '../nastawy/wiadro';
import { lunaOtchlani, rysujKlatkeDloni } from '../render/dlon';
import { rysujKlatkeAnielska } from '../render/aniol';
import { ANIOL, DAR } from '../nastawy/aniol';
import { znaczekKruszcu, krzyz } from '../render/kruszce';
import { rysujCzesc } from '../render/pomieszczenia';
import { POMIESZCZENIA } from '../nastawy/pomieszczenia';
import { KRUSZCE } from '../nastawy/kruszce';
import { POLECENIA } from '../nastawy/polecenia';
import { OLTARZ } from '../nastawy/oltarz';
import { oltarzNaRycinie } from '../render/oltarz';
import { ruinaNaRycinie, zabytekNaRycinie } from '../render/ruiny';
import { ZABYTKI, ZABYTEK, type TypZabytku } from '../nastawy/zabytki';
import { kropla } from '../render/kruszce';
import { ZBROJA, CZESC, type CzescZbroi } from '../nastawy/zbroja';
import { SWIAT } from '../nastawy/swiat';
import { POMNIK, DEMON } from '../nastawy/pomnik';
import { rysujPosag, rysujWstajacego, rysujKonajacego, cokol, gruz } from '../render/pomnik';
import { rysujRelikwiarz, RELIKWIARZ_PROPORCJA } from '../render/relikwiarz';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Krew: ten sam relikwiarz co pod płytą, na kamiennej płycie ołtarza, krwi w nim dwie trzecie. */
function rysujKrew({ ctx, w, h, t }: Plotno): void {
  const wys = Math.min(h * 0.82, (w * 0.7) / RELIKWIARZ_PROPORCJA);
  const cx = w / 2 + Math.min(w * 0.08, h * 0.2);
  const dol = h * 0.9;
  ctx.save();
  const g = ctx.createRadialGradient(cx, dol - wys * 0.5, 4, cx, dol - wys * 0.5, wys * 0.75);
  g.addColorStop(0, 'rgba(150,40,26,0.28)');
  g.addColorStop(1, 'rgba(150,40,26,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(24,17,13,0.95)';
  ctx.fillRect(cx - wys * 0.62, dol - wys * 0.015, wys * 1.24, wys * 0.06);
  ctx.strokeStyle = 'rgba(206,192,166,0.45)'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - wys * 0.62, dol - wys * 0.015, wys * 1.24, wys * 0.06);
  rysujRelikwiarz(ctx, cx - (wys * RELIKWIARZ_PROPORCJA) / 2, dol - wys, wys, GORA.krewMax * 0.66, GORA.krewMax, t, { pamietaj: false });
  ctx.restore();
}

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
  rasy: 'Twój lud',
  ryty: 'Trzy ryty',
  zasoby: 'Czym płacisz i czym żyją',
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

/** Atrapa świata dla figur — rysunek potrzebuje tylko barwy klanu (i roli postaci ludu). */
const atrapy = new Map<string, { sim: Sim; c: Creature }>();
function atrapa(rasa: Race, rola?: Rola, helm?: boolean): { sim: Sim; c: Creature } {
  const klucz = `${rasa}|${rola ?? ''}|${helm ? 1 : 0}`;
  let a = atrapy.get(klucz);
  if (!a) {
    const sim = { clans: [{ race: rasa, tint: 0 }] } as unknown as Sim;
    const c = makeCreature(rasa, 0, 0, 0, 900 + rasa);
    if (rola) c.rola = rola;
    if (helm) c.helm = true;
    a = { sim, c };
    atrapy.set(klucz, a);
  }
  return a;
}

function postac(rasa: Race, czyn: Czynnosc, skala = 1, rola?: Rola, helm?: boolean): (p: Plotno) => void {
  return ({ ctx, w, h, t }) => {
    sklepienie(ctx, w, h, rasa);
    const { sim, c } = atrapa(rasa, rola, helm);
    const wys = h * 0.5 * skala;
    ctx.save();
    ctx.translate(w / 2, h * 0.82);
    rysujPostac(ctx, sim, c, wys, t, czyn);
    ctx.restore();
  };
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

/** Wielki Pomnik: kamienny demon na cokole, zakuty w łańcuchy, przechodzi kolejne stany pękania. */
function pomnikRycina({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 21);
  const stan = Math.floor(t / 2200) % 4;
  const swieze = Math.max(0, 1 - (t % 2200) / 600);
  const H = h * 0.95;
  rysujPosag(ctx, w / 2, h * 0.86, H, H / POMNIK.wysokosc, stan, t, stan ? swieze : 0);
}

/** Demon z pomnika: wstaje z gruzu, otwiera oczy, rozpościera skrzydła (w kółko). */
function demonRycina({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 22);
  const H = h * 0.95, y = h * 0.86;
  cokol(ctx, w / 2, y, H, true, H / POMNIK.wysokosc);
  gruz(ctx, w / 2, y, H, 1, t, H / POMNIK.wysokosc);
  const k = Math.min(1, (t % 5200) / 4200);
  rysujWstajacego(ctx, w / 2, y, H, h * 0.62, k, t);
}

/** Ostatnie uderzenie: złote światło rozsadza demona od środka, pada na kolana i rozsypuje się w popiół. */
function uderzenieRycina({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 23);
  const k = Math.min(1, (t % 4600) / 3800);
  const x = w * 0.55, y = h * 0.86, hh = h * 0.62;
  ctx.save();
  // światło z wnętrza i rozbłysk
  ctx.globalCompositeOperation = 'lighter';
  const a = k < 0.55 ? k / 0.55 * 0.5 : Math.max(0, 1 - (k - 0.55) / 0.3);
  const g = ctx.createRadialGradient(x, y - hh * 0.5, 0, x, y - hh * 0.5, hh);
  g.addColorStop(0, `rgba(255,236,180,${0.6 * a})`); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  rysujKonajacego(ctx, hh, k, t);
  ctx.restore();
  // ostrze rycerza: jasna smuga cięcia na początku
  if (k < 0.15) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,250,230,${1 - k / 0.15})`;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - hh * 0.35, y - hh * 0.5, hh * 0.35, -1.2, 0.6); ctx.stroke();
    ctx.restore();
  }
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

/** Dłoń z otchłani: z czerwonej łuny w dole wznosi się szponiasta dłoń — sięga po kogoś na półce skalnej. */
/** Kruszce: robotnik kuje ścianę z żyłą — okruch leci łukiem do sztabki i samorodka nad nią. */
function kruszce(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 2);
  // ściana po prawej: lita skała z kępą żelaza (rdza) i grudkami złota
  const sciana = new Path2D();
  sciana.moveTo(w * 0.62, h * 0.82); sciana.lineTo(w * 0.6, h * 0.55); sciana.lineTo(w * 0.66, h * 0.3);
  sciana.lineTo(w, h * 0.22); sciana.lineTo(w, h * 0.82); sciana.closePath();
  ctx.save();
  ctx.fillStyle = 'rgba(46,34,27,0.98)';
  ctx.fill(sciana);
  kreskuj(ctx, sciana, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
  ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.7);
  ctx.lineWidth = 1.4;
  ctx.stroke(sciana);
  ctx.clip(sciana);
  const grudki: [number, number, number, 'zelazo' | 'zloto'][] = [
    [0.7, 0.62, 0.05, 'zelazo'], [0.76, 0.56, 0.045, 'zelazo'], [0.72, 0.7, 0.04, 'zelazo'], [0.8, 0.66, 0.035, 'zelazo'],
    [0.86, 0.4, 0.03, 'zloto'], [0.9, 0.47, 0.025, 'zloto'],
  ];
  for (const [x, y, r, rodzaj] of grudki) {
    const g = new Path2D();
    g.ellipse(w * x, h * y, h * r * 1.25, h * r, 0.4, 0, Math.PI * 2);
    ctx.fillStyle = rodzaj === 'zelazo' ? 'rgba(128,58,40,0.95)' : 'rgba(214,168,70,0.95)';
    ctx.fill(g);
    kropkuj(ctx, g, 40, rodzaj === 'zelazo' ? 'rgba(196,204,214,0.6)' : 'rgba(255,240,190,0.8)', x * 10);
  }
  ctx.restore();
  // robotnik z kilofem przy ścianie
  const { sim, c } = atrapa(Race.GOBLIN, 'robotnik');
  ctx.save();
  ctx.translate(w * 0.5, h * 0.82);
  rysujPostac(ctx, sim, c, h * 0.42, t, 'kopie');
  ctx.restore();
  // okruch w locie: łuk przerywaną kreską od ściany do liczników
  const x0 = w * 0.62, y0 = h * 0.58, x1 = w * 0.16, y1 = h * 0.16;
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = -t * 0.02;
  ctx.strokeStyle = 'rgba(246,216,142,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(w * 0.4, h * 0.02, x1 + h * 0.08, y1); ctx.stroke();
  ctx.restore();
  const s = (t * 0.0004) % 1;
  const ox = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * w * 0.4 + s * s * (x1 + h * 0.08);
  const oy = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * h * 0.02 + s * s * y1;
  ctx.fillStyle = 'rgba(176,184,196,1)';
  ctx.strokeStyle = 'rgba(22,18,20,0.95)';
  ctx.beginPath(); ctx.arc(ox, oy, h * 0.022, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // liczniki: sztabka i samorodek
  znaczekKruszcu(ctx, 'zelazo', x1, y1, h * 0.12, 0.4 + 0.3 * Math.sin(t * 0.004), 7);
  znaczekKruszcu(ctx, 'zloto', x1 + h * 0.15, y1, h * 0.12, 0.3 + 0.3 * Math.sin(t * 0.004 + 2), 11);
}

/** Robotnik z ludu na rycinie: stopy w (x, y), wysokość hh, czynność, zwrócony w prawo albo w lewo. */
function robotnikNaRycinie(ctx: CanvasRenderingContext2D, x: number, y: number, hh: number, t: number, cz: Czynnosc, kier = 1, rola: Rola = 'robotnik'): void {
  const { sim, c } = atrapa(Race.GOBLIN, rola);
  ctx.save(); ctx.translate(x, y); ctx.scale(kier, 1);
  rysujPostac(ctx, sim, c, hh, t, cz);
  ctx.restore();
}

/** Pomieszczenia: plan na skale — przekreślone kafle w przerywanym konturze — i robotnik, który go kuje. */
function pomieszczeniaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 3);
  const k = h * 0.13, x0 = w * 0.5, y0 = h * 0.82 - k * 3;
  const skala = new Path2D(); skala.rect(x0, y0 - k * 0.6, k * 4.6, k * 3.6);
  ctx.save();
  ctx.fillStyle = 'rgba(46,34,27,0.98)'; ctx.fill(skala);
  kreskuj(ctx, skala, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
  // pierwsza kolumna już wykuta
  ctx.fillStyle = 'rgba(70,52,38,0.95)'; ctx.fillRect(x0, y0, k, k * 3);
  ctx.strokeStyle = 'rgba(232,196,130,0.6)'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) for (let j = 0; j < 3; j++) {
    const sx = x0 + i * k, sy = y0 + j * k, m = k * 0.22;
    ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + k - m, sy + k - m); ctx.moveTo(sx + k - m, sy + m); ctx.lineTo(sx + m, sy + k - m);
  }
  ctx.stroke();
  ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 0.01;
  ctx.strokeStyle = 'rgba(232,196,130,0.95)'; ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, k * 4, k * 3);
  ctx.restore();
  robotnikNaRycinie(ctx, x0 + k * 0.5, h * 0.82, h * 0.42, t, 'kopie');
}

/** Warsztat: stół z tyglem i złocącym się krzyżem, robotnik z młotkiem. */
function warsztatRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 4);
  const y = h * 0.82, x1 = w * 0.48, x2 = w * 0.8, yb = y - h * 0.2;
  ctx.save();
  ctx.fillStyle = 'rgba(112,74,42,0.98)'; ctx.strokeStyle = 'rgba(20,12,8,0.95)'; ctx.lineWidth = 1.4;
  ctx.fillRect(x1 + 6, yb, 6, y - yb); ctx.fillRect(x2 - 12, yb, 6, y - yb);
  ctx.beginPath(); ctx.rect(x1, yb, x2 - x1, h * 0.03); ctx.fill(); ctx.stroke();
  const tx = x2 - h * 0.08, ty = yb - h * 0.09;
  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, h * 0.25);
  g.addColorStop(0, 'rgba(255,214,110,0.55)'); g.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = g; ctx.fillRect(tx - h * 0.25, ty - h * 0.25, h * 0.5, h * 0.5);
  ctx.beginPath(); ctx.moveTo(tx - h * 0.055, ty); ctx.lineTo(tx + h * 0.055, ty); ctx.lineTo(tx + h * 0.04, yb); ctx.lineTo(tx - h * 0.04, yb); ctx.closePath();
  ctx.fillStyle = 'rgba(58,48,44,0.98)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,226,130,0.95)'; ctx.beginPath(); ctx.ellipse(tx, ty, h * 0.05, h * 0.014, 0, 0, Math.PI * 2); ctx.fill();
  const kx = x1 + (x2 - x1) * 0.35, ky = yb - h * 0.1, a = h * 0.09;
  ctx.translate(kx, ky); ctx.beginPath(); krzyz(ctx, a);
  ctx.fillStyle = 'rgba(60,44,20,0.9)'; ctx.fill();
  ctx.save(); ctx.clip();
  const pp = (t * 0.0003) % 1;
  ctx.fillStyle = 'rgba(244,204,104,0.98)'; ctx.fillRect(-a, a - pp * a * 2, a * 2, pp * a * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,236,170,0.9)'; ctx.stroke();
  ctx.restore();
  robotnikNaRycinie(ctx, w * 0.32, y, h * 0.42, t, 'buduje');
}

/** Kuźnia: palenisko z ogniem, kowadło z rozżarzonym hełmem, robotnik z młotem. */
function kuzniaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 5);
  const y = h * 0.82;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,12,8,0.95)'; ctx.lineWidth = 1.4;
  const hx = w * 0.18, hw = h * 0.11, hh = h * 0.42;
  const g = ctx.createRadialGradient(hx, y - h * 0.08, 0, hx, y - h * 0.08, h * 0.5);
  g.addColorStop(0, `rgba(255,170,70,${0.5 + 0.1 * Math.sin(t * 0.013)})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(hx - h * 0.5, y - h * 0.6, h, h * 0.6);
  ctx.fillStyle = 'rgba(70,60,54,0.98)';
  ctx.beginPath(); ctx.moveTo(hx - hw, y); ctx.lineTo(hx - hw, y - hh * 0.6); ctx.quadraticCurveTo(hx, y - hh * 1.3, hx + hw, y - hh * 0.6); ctx.lineTo(hx + hw, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,60,0.9)';
  ctx.beginPath(); ctx.moveTo(hx - hw * 0.6, y); ctx.lineTo(hx - hw * 0.6, y - hh * 0.4); ctx.quadraticCurveTo(hx, y - hh * 0.8, hx + hw * 0.6, y - hh * 0.4); ctx.lineTo(hx + hw * 0.6, y); ctx.closePath(); ctx.fill();
  const ax = w * 0.66, ay = y - h * 0.18;
  ctx.fillStyle = 'rgba(112,74,42,0.98)'; ctx.beginPath(); ctx.rect(ax - h * 0.06, y - h * 0.1, h * 0.12, h * 0.1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(46,46,52,0.99)';
  ctx.beginPath(); ctx.moveTo(ax - h * 0.12, ay); ctx.lineTo(ax + h * 0.18, ay); ctx.quadraticCurveTo(ax + h * 0.14, ay + h * 0.04, ax + h * 0.06, ay + h * 0.05); ctx.lineTo(ax + h * 0.05, y - h * 0.1); ctx.lineTo(ax - h * 0.05, y - h * 0.1); ctx.lineTo(ax - h * 0.06, ay + h * 0.05); ctx.lineTo(ax - h * 0.12, ay + h * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
  rysujCzesc(ctx, 'helm', ax, ay - h * 0.04, h * 0.1, 'rgba(255,150,70,0.95)', 'rgba(60,20,8,0.9)');
  ctx.restore();
  robotnikNaRycinie(ctx, w * 0.47, y, h * 0.42, t, 'buduje');
}

/** Rycerz z ryciny „Zbroja rycerza” — własna atrapa, bo zbroja na niej się zmienia (inne ryciny jej nie dzielą). */
let rycerzZbroi: { sim: Sim; c: Creature } | null = null;
const CZESCI_ZBROI: CzescZbroi[] = ['helm', 'naramienniki', 'napiersnik', 'nakolanniki', 'tarcza'];

/**
 * Zbroja rycerza: wieszak z częściami, a rycerz w samej kolczudze zakłada je po kolei — każda błyska, gdy siądzie,
 * a z wieszaka znika. Na koniec chwilę stoi w pełnej zbroi i wszystko zaczyna się od nowa.
 */
function zbrojaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 8);
  const y = h * 0.82;
  const okres = 1500, n = Math.floor(t / okres) % (CZESCI_ZBROI.length + 3), f = (t % okres) / okres;
  const ile = Math.min(CZESCI_ZBROI.length, n);
  rycerzZbroi ??= (() => {
    const sim = { clans: [{ race: Race.GOBLIN, tint: 0 }] } as unknown as Sim;
    const c = makeCreature(Race.GOBLIN, 0, 0, 0, 907);
    c.rola = 'rycerz';
    return { sim, c };
  })();
  const { sim, c } = rycerzZbroi;
  c.zbroja = CZESCI_ZBROI.slice(0, ile);
  ctx.save();
  ctx.strokeStyle = 'rgba(20,12,8,0.95)'; ctx.lineWidth = 1.4;
  // wieszak na ścianie: to, czego rycerz jeszcze nie założył
  const px1 = w * 0.1, px2 = w * 0.44, py = y - h * 0.44;
  ctx.fillStyle = 'rgba(112,74,42,0.98)'; ctx.beginPath(); ctx.rect(px1, py, px2 - px1, h * 0.025); ctx.fill(); ctx.stroke();
  CZESCI_ZBROI.forEach((id, i) => {
    if (i < ile) return;
    rysujCzesc(ctx, id, px1 + (px2 - px1) * (0.16 + (i % 3) * 0.34), py + h * (0.09 + Math.floor(i / 3) * 0.13), h * 0.1, 'rgba(176,182,194,0.98)', 'rgba(20,12,8,0.95)');
  });
  ctx.restore();
  // rycerz twarzą do wieszaka
  const rx = w * 0.68, wys = h * 0.5;
  ctx.save(); ctx.translate(rx, y); ctx.scale(-1, 1);
  rysujPostac(ctx, sim, c, wys, t, 'stoi');
  ctx.restore();
  // błysk tam, gdzie część właśnie siadła
  if (ile > 0 && n <= CZESCI_ZBROI.length && f < 0.5) {
    const cz = CZESCI_ZBROI[ile - 1];
    const naCiele: Record<CzescZbroi, number> = { helm: 0.92, naramienniki: 0.78, napiersnik: 0.64, nakolanniki: 0.2, tarcza: 0.5 };
    const hh = wys, bx = rx - hh * (cz === 'tarcza' ? 0.12 : 0.05), by = y - hh * naCiele[cz];
    const a = 1 - f / 0.5, R = h * (0.06 + 0.16 * Math.min(1, f * 5));
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, R);
    g.addColorStop(0, `rgba(255,246,214,${0.85 * a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    ctx.save();
    ctx.strokeStyle = `rgba(255,250,230,${0.9 * a})`; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const k = (i / 8) * Math.PI * 2 + 0.3, r0 = h * (0.03 + f * 0.08), r1 = r0 + h * (i % 2 ? 0.03 : 0.06) * a;
      ctx.moveTo(bx + Math.cos(k) * r0, by + Math.sin(k) * r0); ctx.lineTo(bx + Math.cos(k) * r1, by + Math.sin(k) * r1);
    }
    ctx.stroke();
    ctx.font = `italic ${Math.round(h * 0.06)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232,196,130,${a})`;
    ctx.fillText(`${CZESC[cz].nazwa}: ${CZESC[cz].skutek}`, w * 0.5, h * 0.12);
    ctx.restore();
  }
}

/**
 * Warstwy góry — przekrój: z powierzchni szyb ze światłem i węższy szyb wiadra do sali z ołtarzem; czapa skały
 * i gruba rama nie do ruszenia; trzy warstwy (płytka z żelazem, środkowa z jaskiniami, złotem pod ich dnem i ruiną,
 * głęboka); na dnie szeroka krypta, a pod nią rdzeń. Wiadro zjeżdża szybem, rdzeń pulsuje.
 */
function warstwyRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  const atr = rgba(BARWA.atrament, 0.3);
  ctx.save();
  ctx.fillStyle = '#0d0a09'; ctx.fillRect(0, 0, w, h);
  const ram = w * 0.06, gora = h * 0.07, dno = h * 0.93;
  const X = (u: number) => ram + (w - 2 * ram) * u;
  const pas = (y0: number, y1: number, kolor: string, kat: number, odstep: number): Path2D => {
    const pp = new Path2D(); pp.rect(ram, y0, w - 2 * ram, y1 - y0);
    ctx.fillStyle = kolor; ctx.fill(pp);
    kreskuj(ctx, pp, kat, odstep, atr, 1);
    return pp;
  };
  // ziemia i czapa skały nad salą
  pas(gora, h * 0.22, 'rgba(58,50,46,0.98)', 0.2, 2.5);
  // trzy warstwy
  const W = SWIAT.warstwy;
  const y1 = h * 0.24, yP = lerp(y1, dno, W.plytkaDo), yS = lerp(y1, dno, W.srodkowaDo);
  pas(h * 0.22, yP, 'rgba(70,56,44,0.97)', 0.8, 7);
  pas(yP, yS, 'rgba(52,42,35,0.97)', 0.7, 5);
  pas(yS, dno, 'rgba(34,28,25,0.98)', 0.6, 3);
  // rama nie do ruszenia — boki i dno
  const rama = new Path2D(); rama.rect(0, gora, ram, h - gora); rama.rect(w - ram, gora, ram, h - gora); rama.rect(0, dno, w, h - dno);
  ctx.fillStyle = 'rgba(28,24,24,1)'; ctx.fill(rama); kreskuj(ctx, rama, 0.15, 2, atr, 1);
  // powierzchnia
  ctx.fillStyle = 'rgba(30,26,30,1)'; ctx.fillRect(0, 0, w, gora);
  ctx.strokeStyle = 'rgba(232,196,130,0.5)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, gora); ctx.lineTo(w, gora); ctx.stroke();
  // sala z ołtarzem i dwa szyby: szerszy ze światłem nad środkiem, węższy z wiadrem obok
  const sx = w * 0.5, salaY = h * 0.25;
  const pustka = 'rgba(92,70,50,0.98)';
  ctx.fillStyle = pustka;
  ctx.beginPath(); ctx.ellipse(sx, salaY, w * 0.16, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(sx - w * 0.012, gora, w * 0.024, salaY - gora);
  const wx = sx + w * 0.07;
  ctx.fillRect(wx - w * 0.005, gora, w * 0.01, salaY - gora);
  const sw = ctx.createLinearGradient(0, gora, 0, salaY + h * 0.04);
  sw.addColorStop(0, 'rgba(255,240,200,0.5)'); sw.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sw; ctx.beginPath(); ctx.moveTo(sx - w * 0.012, gora); ctx.lineTo(sx + w * 0.012, gora); ctx.lineTo(sx + w * 0.03, salaY + h * 0.04); ctx.lineTo(sx - w * 0.03, salaY + h * 0.04); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(232,196,130,0.9)'; ctx.fillRect(sx - 1, salaY - h * 0.03, 2, h * 0.05); ctx.fillRect(sx - 4, salaY - h * 0.018, 8, 2);
  const wy = lerp(gora + h * 0.01, salaY - h * 0.02, (t * 0.00025) % 1);
  ctx.fillStyle = 'rgba(150,110,60,0.95)'; ctx.fillRect(wx - 3, wy, 6, 5);
  ctx.strokeStyle = 'rgba(200,180,140,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(wx, gora); ctx.lineTo(wx, wy); ctx.stroke();
  // płytka: kępy żelaza
  for (let i = 0; i < 7; i++) {
    const x = X(0.08 + 0.13 * i + 0.04 * Math.sin(i * 3)), y = lerp(h * 0.3, yP - h * 0.03, (i * 0.37) % 1);
    ctx.fillStyle = 'rgba(150,80,50,0.9)'; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  // środkowa: jaskinie, złoto pod ich dnem, ruina
  for (let i = 0; i < 4; i++) {
    const x = X(0.12 + 0.24 * i), y = lerp(yP, yS, 0.35 + 0.2 * Math.sin(i * 2.1));
    ctx.fillStyle = pustka; ctx.beginPath(); ctx.ellipse(x, y, w * 0.045, h * 0.022, 0, 0, Math.PI * 2); ctx.fill();
    const blysk = 0.7 + 0.3 * Math.sin(t * 0.004 + i * 1.7);
    ctx.fillStyle = `rgba(240,200,90,${0.9 * blysk})`;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x + k * w * 0.016, y + h * 0.03, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  const rux = X(0.62), ruy = lerp(yP, yS, 0.72);
  ctx.strokeStyle = 'rgba(190,170,140,0.8)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(rux - 9, ruy + 6); ctx.lineTo(rux - 9, ruy - 2); ctx.arc(rux, ruy - 2, 9, Math.PI, 0); ctx.lineTo(rux + 9, ruy + 6); ctx.stroke();
  // krypta i rdzeń
  const ky = dno - h * 0.07;
  ctx.fillStyle = pustka; ctx.beginPath(); ctx.ellipse(sx, ky, w * 0.3, h * 0.022, 0, 0, Math.PI * 2); ctx.fill();
  const puls = 0.75 + 0.25 * Math.sin(t * 0.003);
  const ry = dno - h * 0.025;
  const g = ctx.createRadialGradient(sx, ry, 0, sx, ry, h * 0.09 * puls);
  g.addColorStop(0, 'rgba(255,90,60,0.9)'); g.addColorStop(1, 'rgba(160,20,20,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - h * 0.1, ry - h * 0.1, h * 0.2, h * 0.2);
  ctx.fillStyle = 'rgba(200,40,30,0.95)'; ctx.beginPath(); ctx.arc(sx, ry, h * 0.02, 0, Math.PI * 2); ctx.fill();
  // podpisy
  ctx.font = `italic ${Math.round(h * 0.045)}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,214,180,0.9)';
  const napis = (tekst: string, x: number, y: number) => ctx.fillText(tekst, x, y);
  napis('szyb', sx + w * 0.09, gora + h * 0.07);
  napis('sala', sx + w * 0.17, salaY + h * 0.012);
  napis('płytka — żelazo', X(0.02), lerp(h * 0.22, yP, 0.55));
  napis('środkowa — złoto, ruiny', X(0.02), lerp(yP, yS, 0.12));
  napis('głęboka', X(0.02), lerp(yS, dno, 0.35));
  napis('krypta', sx + w * 0.31, ky + h * 0.012);
  ctx.textAlign = 'center';
  napis('rdzeń', sx, dno - h * 0.11);
  ctx.save(); ctx.translate(ram * 0.62, h * 0.6); ctx.rotate(-Math.PI / 2); napis('rama', 0, 0); ctx.restore();
  ctx.restore();
}

/** Sypialnia: posłanie, śpiący pobożny, świeca i „z z z”. */
function sypialniaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 6);
  const y = h * 0.82;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,12,8,0.95)'; ctx.lineWidth = 1.4;
  const b1 = w * 0.18, b2 = w * 0.78;
  ctx.fillStyle = 'rgba(150,120,70,0.98)'; ctx.beginPath(); ctx.rect(b1, y - h * 0.05, b2 - b1, h * 0.05); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(206,190,156,0.98)'; ctx.beginPath(); ctx.ellipse(b1 + h * 0.07, y - h * 0.06, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const sx = w * 0.88;
  const g = ctx.createRadialGradient(sx, y - h * 0.2, 0, sx, y - h * 0.2, h * 0.4);
  g.addColorStop(0, 'rgba(255,214,140,0.45)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - h * 0.4, y - h * 0.6, h * 0.8, h * 0.6);
  ctx.fillStyle = 'rgba(230,220,196,0.98)'; ctx.fillRect(sx - 3, y - h * 0.12, 6, h * 0.12);
  ctx.fillStyle = 'rgba(255,230,150,0.95)'; ctx.beginPath(); ctx.ellipse(sx, y - h * 0.14, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // leżący rysuje się tułowiem w stronę, w którą patrzy (render/postacie.ts) — stopy na prawym końcu posłania
  robotnikNaRycinie(ctx, b1 + (b2 - b1) * 0.86, y - h * 0.04, h * 0.42, t, 'spi', 1, 'pobozny');
  ctx.save();
  ctx.font = `italic ${Math.round(h * 0.08)}px Georgia, serif`;
  for (let i = 0; i < 3; i++) {
    const f = (t * 0.0005 + i / 3) % 1;
    ctx.fillStyle = `rgba(226,214,186,${0.9 * Math.sin(f * Math.PI)})`;
    ctx.fillText('z', b1 + h * 0.1 + f * h * 0.15, y - h * (0.18 + f * 0.25));
  }
  ctx.restore();
}

/** Ołtarz: kamienny kopczyk, mensa z misą i świecami, krzyż w smudze światła dziennego. */
function oltarzRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 7);
  oltarzNaRycinie(ctx, w * 0.5, h * 0.82, h * 0.13, t);
}

/** Rytuał przy ołtarzu na rycinie: ołtarz z efektem rytuału i pobożny przy nim (klęczy albo unosi księgę). */
function rytualRycina(rodzaj: 'modlitwa' | 'szal' | 'ofiaraKrwi', cz: Czynnosc): (p: Plotno) => void {
  return ({ ctx, w, h, t }) => {
    sklepienie(ctx, w, h, 8);
    const z = h * 0.12, cx = w * 0.42, y = h * 0.82;
    oltarzNaRycinie(ctx, cx, y, z, t, rodzaj, 0.6 + 0.4 * ((t * 0.0002) % 1));
    robotnikNaRycinie(ctx, cx + z * 2.6, y, h * 0.4, t, cz, -1, 'pobozny');
    if (rodzaj === 'ofiaraKrwi') {
      // krople z ręki klęczącego do misy
      for (let i = 0; i < 3; i++) {
        const f = (t * 0.0011 + i / 3) % 1;
        const x0 = cx + z * 2.2, y0 = y - h * 0.2, x1 = cx + z * 0.38, y1 = y - z * 1.55;
        ctx.save(); ctx.translate(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * z * 0.8);
        ctx.fillStyle = 'rgba(196,26,18,0.95)'; ctx.beginPath(); kropla(ctx, Math.max(2, z * 0.09)); ctx.fill(); ctx.restore();
      }
    }
    if (rodzaj === 'szal') {
      // rycerz w czerwonej aurze
      const rx = w * 0.12, R = h * 0.36;
      const g = ctx.createRadialGradient(rx, y - h * 0.2, 0, rx, y - h * 0.2, R);
      g.addColorStop(0, `rgba(255,44,26,${0.4 + 0.1 * Math.sin(t * 0.008)})`); g.addColorStop(1, 'rgba(200,20,10,0)');
      ctx.fillStyle = g; ctx.fillRect(rx - R, y - h * 0.2 - R, R * 2, R * 2);
      robotnikNaRycinie(ctx, rx, y, h * 0.5, t, 'stoi', 1, 'rycerz');
    }
  };
}

/** Wskrzeszenie: krąg jasnych znaków i blada postać unosząca się nad mensą. */
function wskrzeszenieRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 9);
  const z = h * 0.12, cx = w * 0.5, y = h * 0.82;
  oltarzNaRycinie(ctx, cx, y, z, t, 'wskrzeszenie', 1);
  const f = (t * 0.00025) % 1;
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.4 * f;
  ctx.filter = `grayscale(${1 - f}) brightness(${1.6 - 0.6 * f})`;
  robotnikNaRycinie(ctx, cx, y - z * 2.2 - f * z * 0.8, h * 0.4, t, 'stoi', 1, 'robotnik');
  ctx.restore();
  robotnikNaRycinie(ctx, cx + z * 2.8, y, h * 0.4, t, 'czyta', -1, 'pobozny');
}

/** Ofiara życia: słup czerwonego światła nad mensą i ciało pobożnego przy ołtarzu. */
function ofiaraZyciaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 10);
  const z = h * 0.12, cx = w * 0.42, y = h * 0.82;
  oltarzNaRycinie(ctx, cx, y, z, t, 'ofiaraZycia', 0.85);
  ctx.save(); ctx.globalAlpha = 0.85;
  // (leżący rysuje się tułowiem od kotwicy — tu w prawo, z dala od kopczyka)
  robotnikNaRycinie(ctx, cx + z * 2.3, y, h * 0.4, t, 'spi', -1, 'pobozny');
  ctx.restore();
}

/** Ruiny: zawalona kaplica w skale, w środku unosi się zabytek. */
function ruinyRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 23);
  ruinaNaRycinie(ctx, w * 0.5, h * 0.84, h * 0.1, t, 'relikwiarz');
}

/** Zabytki: relikwiarz, miecz, kielich i księga obok siebie, każdy w swoim świetle, z nazwą pod spodem. */
function zabytkiRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 29);
  const typy: TypZabytku[] = ['relikwiarz', 'miecz', 'kielich', 'ksiega'];
  typy.forEach((typ, k) => {
    const x = w * (0.16 + 0.225 * k), y = h * 0.62;
    zabytekNaRycinie(ctx, x, y, h * 0.2, t, typ, k);
    ctx.font = `italic ${Math.round(h * 0.065)}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = rgba(BARWA.atrament, 0.85);
    ctx.fillText(ZABYTEK[typ].nazwa.split(' ')[0], x, h * 0.82);
  });
}

/** Lina: półka, na którą się nie wejdzie, hak w skale, lina do podłogi (z węzłami) i robotnik, który się po niej wspina. */
function linaRycina(p: Plotno): void {
  const { ctx, w, h, t } = p;
  sklepienie(ctx, w, h, 11);
  const k = h * 0.14, x = w * 0.52, y = h * 0.82, yt = y - k * 4;
  ctx.save();
  // półka po lewej
  const polka = new Path2D(); polka.rect(w * 0.08, yt + k, x - w * 0.08 - k * 0.1, k * 0.9);
  ctx.fillStyle = 'rgba(46,34,27,0.98)'; ctx.fill(polka);
  kreskuj(ctx, polka, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
  // hak w stropie i lina z konopi, lekko się kołysze; węzły na chwyt co kafel, zwój na podłodze
  const lx = x + k * 0.5, hy = yt - k * 0.4;
  const odch = (s: number) => Math.sin(t * 0.002) * k * 0.08 * s;
  ctx.fillStyle = 'rgba(70,70,76,0.98)'; ctx.strokeStyle = 'rgba(20,12,8,0.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(lx - k * 0.22, hy - k * 0.1, k * 0.44, k * 0.12); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round';
  for (const [bar, sz] of [['rgba(20,12,8,0.95)', 5], ['rgba(176,138,86,0.98)', 3]] as const) {
    ctx.strokeStyle = bar; ctx.lineWidth = sz;
    ctx.beginPath();
    for (let s = 0; s <= 20; s++) { const py = hy + (y - hy) * s / 20; const px = lx + odch(s / 20); if (s) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const sy = yt + k * (i + 0.5);
    const sx = lx + odch((sy - hy) / (y - hy));
    ctx.fillStyle = 'rgba(20,12,8,0.95)'; ctx.beginPath(); ctx.ellipse(sx, sy, k * 0.12, k * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(176,138,86,0.98)'; ctx.beginPath(); ctx.ellipse(sx, sy, k * 0.08, k * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(176,138,86,0.98)'; ctx.lineWidth = 2.5;
  for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(lx + k * 0.15, y - k * 0.06 - r * 2, k * (0.32 - r * 0.05), k * 0.12, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  // wspina się: w górę i z powrotem
  const f = 0.5 - 0.5 * Math.cos(t * 0.0012);
  robotnikNaRycinie(ctx, x + k * 0.5, y - f * k * 3, h * 0.27, t, 'wspina');
}

function dlonOtchlani({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#060303';
  ctx.fillRect(0, 0, w, h);
  const xw = w * 0.4;
  lunaOtchlani(ctx, xw + h * 0.1, h * 1.02, h * 0.9, 0, 1.6, t);
  // półka skalna i ten, po kogo sięga
  const xf = xw + h * 0.15, yf = h * 0.27, u = h * 0.02;
  ctx.fillStyle = '#1a0f0b';
  ctx.beginPath();
  ctx.moveTo(xf - h * 0.42, yf + u * 0.3); ctx.lineTo(xf - h * 0.2, yf - u * 0.2); ctx.lineTo(xf + h * 0.1, yf + u * 0.1); ctx.lineTo(xf + h * 0.36, yf - u * 0.3);
  ctx.lineTo(xf + h * 0.33, yf + u * 2.6); ctx.lineTo(xf + h * 0.12, yf + u * 2.1); ctx.lineTo(xf - h * 0.1, yf + u * 3.2); ctx.lineTo(xf - h * 0.4, yf + u * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,170,110,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(xf - h * 0.42, yf + u * 0.3); ctx.lineTo(xf - h * 0.2, yf - u * 0.2); ctx.lineTo(xf + h * 0.1, yf + u * 0.1); ctx.lineTo(xf + h * 0.36, yf - u * 0.3); ctx.stroke();
  ctx.fillStyle = 'rgba(28,20,16,0.96)';
  ctx.strokeStyle = 'rgba(214,190,150,0.55)';
  ctx.lineWidth = Math.max(0.8, u * 0.3);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(xf + s * u * 0.5, yf - u * 3); ctx.lineTo(xf + s * u * 0.8, yf); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(xf, yf - u * 4.6, u * 1.2, u * 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(xf, yf - u * 7.8, u * 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // dłoń pnie się z dołu, palce drgają
  const wzn = 0.02 * Math.sin(t * 0.0009);
  rysujKlatkeDloni(ctx, xw, h * (1.12 + wzn), -Math.PI / 2 + 0.04 * Math.sin(t * 0.0007), (h * 0.84) / 25.5, 0.06 + 0.06 * Math.sin(t * 0.0021), 1, 1, 1);
  // przedramię ginie w ciemności otchłani
  const ciemno = ctx.createLinearGradient(0, h, 0, h * 0.6);
  ciemno.addColorStop(0, 'rgba(6,3,3,0.92)');
  ciemno.addColorStop(1, 'rgba(6,3,3,0)');
  ctx.fillStyle = ciemno;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);
  lunaOtchlani(ctx, xw + h * 0.1, h * 1.04, h * 0.6, 0, 0.8, t);
  ctx.restore();
}

/**
 * Przecięta lina (etap 4), w kółko: spod podłogi wznosi się dłoń z otchłani obok liny wiadra, zamach — trzy smugi
 * pazurów, wiadro spada i się roztrzaskuje; potem robotnik wspina się po zwisającym końcu i go skleja.
 */
function przecietaLina({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 11);
  const y = h * 0.82, lx = w * 0.56;
  const f = (t % 9000) / 9000;
  const zlb = (a: number, b: number) => Math.max(0, Math.min(1, (f - a) / (b - a)));
  const lina = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.strokeStyle = 'rgba(20,12,8,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(176,140,92,0.98)'; ctx.lineWidth = 2.4; ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  const ciete = f > 0.38;
  const koniec = y - h * 0.3;
  // wiadro: wisi, spada, leży w kawałkach; po sklejeniu — znowu wisi
  const naprawione = f > 0.92;
  const wy = !ciete || naprawione ? y - h * 0.16 : y - h * 0.16 + h * 0.16 * Math.min(1, zlb(0.38, 0.46) ** 2);
  if (!ciete || naprawione) lina(lx, 0, lx, wy);
  else lina(lx, 0, lx, koniec);
  if (!ciete || f < 0.46 || naprawione) {
    ctx.fillStyle = 'rgba(120,82,46,1)'; ctx.strokeStyle = 'rgba(16,10,6,0.95)'; ctx.lineWidth = 1.5;
    ctx.save(); ctx.translate(lx, wy); ctx.rotate(ciete && !naprawione ? zlb(0.38, 0.46) * 0.6 : 0);
    ctx.beginPath(); ctx.moveTo(-h * 0.06, 0); ctx.lineTo(h * 0.06, 0); ctx.lineTo(h * 0.045, h * 0.13); ctx.lineTo(-h * 0.045, h * 0.13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(130,88,48,1)' : 'rgba(96,62,34,1)';
      ctx.save(); ctx.translate(lx + (i - 2.5) * h * 0.035, y - h * 0.012); ctx.rotate(1.3 + i * 0.2); ctx.fillRect(-h * 0.008, -h * 0.05, h * 0.016, h * 0.05); ctx.restore();
    }
    ctx.fillStyle = 'rgba(176,118,58,1)';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(lx + (i - 1) * h * 0.09, y - h * 0.012, h * 0.022, h * 0.014, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // dłoń z otchłani: wznosi się obok liny, zamach w poprzek, cofa się
  if (f < 0.6) {
    const wzn = f < 0.3 ? zlb(0, 0.3) : f < 0.38 ? 1 : 1 - zlb(0.42, 0.6);
    const zamach = zlb(0.3, 0.38);
    lunaOtchlani(ctx, lx + h * 0.2, h * 1.02, h * 0.7, 0, 1.2 * Math.min(1, wzn + 0.2), t);
    ctx.save(); ctx.globalAlpha = Math.min(1, wzn * 1.5);
    rysujKlatkeDloni(ctx, lx + h * 0.32 - zamach * h * 0.42, h * (1.25 - 0.55 * wzn), -Math.PI / 2 - 0.25 + zamach * 0.4, (h * 0.5) / 25.5, 0.12 + 0.15 * zamach, 1, 1, 1);
    ctx.restore();
  }
  // trzy smugi pazurów
  if (f > 0.37 && f < 0.5) {
    const a = 1 - zlb(0.37, 0.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = -1; i <= 1; i++) {
      for (const [kolor, gr] of [[`rgba(255,60,30,${0.6 * a})`, 5], [`rgba(255,236,214,${a})`, 1.6]] as const) {
        ctx.strokeStyle = kolor; ctx.lineWidth = gr;
        ctx.beginPath(); ctx.moveTo(lx + h * 0.12, koniec + i * 7 - 6); ctx.quadraticCurveTo(lx, koniec + i * 7 + 4, lx - h * 0.12, koniec + i * 7 - 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
  // robotnik: biegnie pod linę, wspina się po kikucie i skleja (supeł rośnie)
  if (f > 0.62 && f <= 0.95) {
    const wsp = zlb(0.66, 0.72);
    const cz: Czynnosc = f < 0.66 ? 'idzie' : f < 0.72 ? 'wspina' : f < 0.92 ? 'skleja' : 'wspina';
    robotnikNaRycinie(ctx, lx, y - wsp * h * 0.1, h * 0.27, t, cz);
    if (f > 0.72 && f < 0.92) {
      const n = Math.ceil(zlb(0.72, 0.9) * 4);
      ctx.save(); ctx.fillStyle = 'rgba(150,114,70,0.98)'; ctx.strokeStyle = 'rgba(20,12,8,0.9)'; ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.ellipse(lx, koniec + 4 - i * 3, 5, 2.4, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
  }
}

/** Dłoń anielska: z góry, przez skałę, słup złotego światła; w nim jasna dłoń schodzi palcami w dół nad robotnikiem. */
function dlonAnielska({ ctx, w, h, t }: Plotno): void {
  sklepienie(ctx, w, h, 13);
  const y = h * 0.82, x = w * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x - h * 0.2, 0, x + h * 0.2, 0);
  g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(0.5, 'rgba(255,232,170,0.4)'); g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g; ctx.fillRect(x - h * 0.2, 0, h * 0.4, y);
  const g2 = ctx.createRadialGradient(x, y, 0, x, y, h * 0.4);
  g2.addColorStop(0, 'rgba(255,236,180,0.5)'); g2.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g2; ctx.fillRect(x - h * 0.4, y - h * 0.4, h * 0.8, h * 0.8);
  for (let i = 0; i < 14; i++) {
    const f = ((t * 0.00005 * (0.6 + (i % 5) * 0.1)) + i * 0.137) % 1;
    ctx.fillStyle = `rgba(255,244,210,${0.8 * Math.sin(f * Math.PI)})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.3) * h * 0.12, f * y, 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // dłoń schodzi i wraca, lekko się kołysząc; pod nią stoi postawiony robotnik
  const zejscie = 0.5 - 0.5 * Math.cos(t * 0.0008);
  rysujKlatkeAnielska(ctx, x - h * 0.03, -h * 0.25 + zejscie * h * 0.22, Math.PI / 2 + 0.06 * Math.sin(t * 0.0011), (h * 0.62) / 25.5, 0.05, 1, 1);
  robotnikNaRycinie(ctx, x + h * 0.02, y, h * 0.3, t, 'stoi');
}

/** Ten, który patrzy: lita, kreskowana skała, a w niej para oczu i blade światło lampki z boku. */
function patrzacy({ ctx, w, h, t }: Plotno): void {
  ctx.save();
  ctx.fillStyle = '#0b0807';
  ctx.fillRect(0, 0, w, h);
  const blok = new Path2D();
  blok.rect(0, 0, w, h);
  kreskuj(ctx, blok, -0.7, 5, rgba(BARWA.atrament, 0.08), 1);
  const l = ctx.createRadialGradient(w * 0.18, h * 0.78, 2, w * 0.18, h * 0.78, h * 0.5);
  l.addColorStop(0, 'rgba(236,190,110,0.32)');
  l.addColorStop(1, 'rgba(236,190,110,0)');
  ctx.fillStyle = l;
  ctx.fillRect(0, 0, w, h);
  const mrug = Math.sin(t * 0.0009) > 0.93 ? 0.15 : 1;
  for (const dx of [-1, 1]) {
    const x = w * 0.62 + dx * h * 0.06, y = h * 0.4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, h * 0.06);
    g.addColorStop(0, 'rgba(255,170,110,0.95)');
    g.addColorStop(1, 'rgba(160,30,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - h * 0.06, y - h * 0.06, h * 0.12, h * 0.12);
    ctx.fillStyle = 'rgba(255,224,190,0.95)';
    ctx.beginPath(); ctx.ellipse(x, y, h * 0.018, h * 0.009 * mrug, 0, 0, Math.PI * 2); ctx.fill();
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
  // lud
  {
    id: 'rasa-0', grupa: 'rasy', nazwa: 'Pobożni', lacina: 'Gens pia',
    opis: `Twój jedyny lud — stała drużyna: ${LUD.start.robotnik} robotników, ${LUD.start.pobozny} pobożnych i ${LUD.start.rycerz} rycerz. Nikt się w nim nie rodzi i skała nie wydaje nowych — każda śmierć to strata na całą partię. Mieszkają przy siedzibie, a odcięte grupki zakładają obozy.`,
    kiedy: 'Pilnuj, żeby zawsze był ktoś, kto się modli — bez pobożnych skorupa nie pęknie. Przy ołtarzu pobożny może oddać krew (słabnie, póki nie wyśpi się w sypialni) albo życie, a poległych da się tam wskrzesić.',
    rycina: postac(Race.GOBLIN, 'modli'),
  },
  // ryty
  {
    id: 'ryt-zasiej', grupa: 'ryty', nazwa: 'Nakarm', lacina: 'Situla de caelo',
    opis: `Dotknij płyty, a z góry, tym samym szybem co zawsze, zjedzie ${WIADRO.nakarmPorcji} porcji jedzenia więcej — wiadro jest jedno: gdy stoi albo zjeżdża, dosypują do niego, a gdy go nie ma, zjeżdża od razu. Gdzie dotkniesz, nie ma znaczenia.`,
    kiedy: 'Gdy jedzenia w wiadrze nie starcza do następnego zjazdu. Do tych, którzy zeszli w głąb, jedzenie dotrze tylko wtedy, gdy pogłębisz szyb pod wiadrem albo robotnicy im je zaniosą.',
    koszt: `wiadro ${kosztSlowami('zasiej', 'grzyb')}`,
    rycina: cala(rysujZiarno),
  },
  {
    id: 'ryt-szept', grupa: 'ryty', nazwa: 'Szepnij', lacina: 'Susurrus',
    opis: '„Szepnij”, potem dotknij jednej postaci i wybierz słowo na jej karcie. „Módl się” posyła pobożnego pod twój rdzeń od razu, bez względu na wiarę ludu. „Przerwij modlitwę” zawraca spod rdzenia. Ofiary krwi i życia nie są już szeptami — odprawia się je przy ołtarzu.',
    kiedy: 'Gdy droga do rdzenia jest gotowa, szepnij „módl się” obu pobożnym — skorupa pęka szybciej, gdy modlą się razem.',
    koszt: `módl się ${kosztSlowami('szept', 'modl')}`,
    rycina: cala(rysujSzept),
  },
  {
    id: 'ryt-znak', grupa: 'ryty', nazwa: 'Cud', lacina: 'Signum manifestum',
    opis: `Jawny cud widziany w promieniu ${MOCE.znakZasieg} kafli. Każdy, kto go widzi, wierzy mocniej (+${proc(MOCE.objawienieOddanie)}) i mniej się boi, a oddanie ludu rośnie o ${proc(MOCE.objawienieNacja)}. Zostaje świecący znak w skale, przy którym pobożni się modlą. Światło Cudu przegania Tego, który patrzy (do ${MROK.cudPromien} kafli od niego) i odpycha dłoń z otchłani (do ${DLON.cudPromien} kafli).`,
    kiedy: 'Przy siedzibie, żeby lud uwierzył dość mocno i sam ruszył pod rdzeń — i zawsze tam, gdzie z ciemności patrzą oczy albo spod ziemi bije czerwona łuna.',
    koszt: kosztSlowami('znak', 'objawienie'),
    rycina: cala(rysujZnak),
  },
  // zasoby
  {
    id: 'krew', grupa: 'zasoby', nazwa: 'Krew', lacina: 'Sanguis',
    opis: `Liczba nad płytą i relikwiarz pod nią: krew stoi w szklanej ampułce, a granaty w złotej oprawie żarzą się, gdy jej przybywa; pełna ampułka pulsuje, a nadmiar przepada. Na Koszmarze zaczynasz z ${Math.max(0, LUD.krewStart - GORA.koszmarKrew)}, mieści się jej najwyżej ${GORA.krewMax}. Płaci ci ją każda śmierć — także Strażników Snu i ludzi z powierzchni — i ofiary przy ołtarzu: krwi pobożnego (+${LUD.okaleczenieKrew}) i jego życia (+${LUD.ofiaraKrew}).`,
    kiedy: 'Wydajesz ją na rytuały przy ołtarzu, na liny, na dodatkowe jedzenie rytem Nakarm i na wybory na kartach wydarzeń.',
    rycina: rysujKrew,
  },
  {
    id: 'wiara', grupa: 'zasoby', nazwa: 'Wiara', lacina: 'Fides',
    opis: `Liczba nad płytą — twój zapas, najwyżej ${GORA.wiaraMax}. Rośnie za każdym razem, gdy ktoś się do ciebie modli: przy kapliczce (pobożni stawiają je sami), przy znaku po Cudzie, w modlitwie przy ołtarzu, a najmocniej pod rdzeniem; +${STRAZNICY.nagrodaWiary} za każdą pokonaną falę Strażników. Nie myl jej z oddaniem: wiara to twoja waluta, oddanie to to, jak mocno wierzy lud.`,
    kiedy: 'Płacisz nią za szepty, Cud i wybory na kartach wydarzeń.',
    rycina: cala(rysujOrgany),
  },
  {
    id: 'wiadro', grupa: 'zasoby', nazwa: 'Wiadro z jedzeniem', lacina: 'Situla panis',
    opis: `Jedyne jedzenie ludu — grzyba ani spiżarni nie ma. Co ${Math.round(WIADRO.co / 120)} sekund z góry, na linie, zjeżdża wiadro pełne jedzenia (${WIADRO.porcjiNaGlowe} porcji na każdego z ludu) — zawsze tym samym, węższym otworem obok szybu ze światłem, do sali z siedzibą; gdy poprzednie jeszcze tam stoi, z góry do niego dosypują. Wiadro jest jedno i ma jeden punkt, w który spada: na dno kolumny pod otworem. Pod wiadrem w podłodze sali da się kuć — kto wykopie tam dziurę, sprowadzi wiadro niżej (lina sięga do dna kolumny), ale wtedy ci z sali do niego nie sięgną. Do tych, którzy zeszli w głąb, wiadro samo nie zjedzie — nigdzie poza tym szybem się nie pojawia; wracają po jedzenie drogą wiernych (na jej zakrętach wiszą liny). Przed zjazdem ze stropu sypie się pył. Każdy może z niego jeść, i to do syta, robotnicy donoszą z niego jedzenie warcie; puste odjeżdża w górę. Kto umiera z głodu (${proc(WIADRO.wspinaczkaOd)} głodu), a wiadro jeszcze jedzie, wspina się po linie, wsiada do niego i je w drodze w dół.`,
    kiedy: 'Liczba „jedzenie” nad płytą to porcje w wiadrze. Gdy nie starcza, dosyp rytem Nakarm; gdy lud pracuje głęboko, pogłęb szyb pod wiadrem.',
    rycina: postac(Race.GOBLIN, 'je'),
  },
  {
    id: 'kruszce', grupa: 'zasoby', nazwa: 'Kruszce', lacina: 'Ferrum et aurum',
    opis: `Żelazo i złoto — dwie liczby nad płytą, obok wiary, krwi i jedzenia. Nikt ich nie nosi: gdy robotnik rozbije kafel rudy, okruch sam leci do licznika i dodaje ${KRUSZCE.zelazoZaKafel} żelaza albo ${KRUSZCE.zlotoZaKafel} złota. Żelazo leży w kępach rdzawej rudy w płytkiej warstwie, tuż pod salą; złoto — w żółtych grudkach pod dnami jaskiń w warstwie środkowej, głębiej i twardsze. Wskaż zaznaczonemu robotnikowi rudę, a wykuje całą kępę — kafel po kaflu, najdalej ${POLECENIA.zylaZasieg} kafli od wskazanego. W dół schodzi stopniami, a podłogi pod złotą kreską drogi wiernych nie rusza.`,
    kiedy: 'Kop, póki jest czas: z żelaza kuźnia wykuje zbroję dla rycerza, a ze złota warsztat zrobi krzyże i różańce, które zamienią się w wiarę. Po złoto trzeba zejść głęboko — a jedzenie jest tylko w sali, więc pilnuj, żeby robotnik miał którędy wrócić (schodami, po linie albo drogą wiernych).',
    rycina: kruszce,
  },
  {
    id: 'warsztat', grupa: 'zasoby', nazwa: 'Warsztat', lacina: 'Officina',
    opis: `Robotnik, któremu wskażesz gotowy warsztat, staje przy stole: topi złoto w tyglu i kuje z niego krzyż, różaniec albo krucyfiks. Na sztukę idzie ${POMIESZCZENIA.warsztat.zlotoNaSztuke} złota i ${Math.round(POMIESZCZENIA.warsztat.tikowNaSztuke / 120)} sekund pracy. Gotowa rozbłyskuje i od razu zamienia się w ${POMIESZCZENIA.warsztat.wiaraZaSztuke} wiary — krzyż leci do licznika. Dwóch przy stole pracuje szybciej. Bez złota robotnik czeka przy stole, a nad warsztatem stoi „brak złota”.`,
    kiedy: 'Złoto leży głęboko, pod dnami jaskiń — warsztat zamienia je w wiarę na Cud i szepty.',
    rycina: warsztatRycina,
  },
  {
    id: 'kuznia', grupa: 'zasoby', nazwa: 'Kuźnia', lacina: 'Fabrica armorum',
    opis: `Robotnik przy kowadle wykuwa z żelaza kolejne części zbroi rycerza: ${POMIESZCZENIA.kuznia.czesci.map((c) => `${c.nazwa} (${c.zelazo} żelaza)`).join(', ')}. Palenisko bucha, młot dzwoni, iskry lecą w takt uderzeń, a gotowa część błyska nad kowadłem i trafia na wieszak. Bez żelaza robotnik czeka, a nad kuźnią widać, czego brakuje.`,
    kiedy: 'Kuj zbroję przed falami Strażników Snu. Gotowe części czekają na wieszaku, aż rycerz przyjdzie je założyć.',
    rycina: kuzniaRycina,
  },
  {
    id: 'zbroja', grupa: 'zasoby', nazwa: 'Zbroja rycerza', lacina: 'Armatura militis',
    opis: `Rycerz zaczyna w kolczudze, z mieczem i w płaszczu — bez hełmu, z odsłoniętą twarzą. Resztę wykuwa kuźnia, a każda część, którą nosi, coś mu daje: ${CZESCI_ZBROI.map((id) => `${CZESC[id].nazwa} — ${CZESC[id].skutek}`).join(', ')}. Gdy na wieszaku coś czeka, nie ma fali Strażników ani rozkazu, a rycerz jest syty, sam idzie do kuźni: staje pod wieszakiem, zdejmuje część, przykłada ją na miejsce i dopina — część błyska, a nad nim widać, co mu dała. Potem wraca na wartę. Każda część zajmuje mu ${String(ZBROJA.zakladanieTikow / 120).replace('.', ',')} sekundy.`,
    kiedy: 'Nie chcesz czekać? Zaznacz rycerza i wskaż kuźnię — pójdzie od razu (gdy nic nie wisi, odmówi). Co nosi, widać na karcie postaci.',
    rycina: zbrojaRycina,
  },
  // prawa góry
  {
    id: 'pamiec', grupa: 'prawa', nazwa: 'Pamięć', lacina: 'Memoria',
    opis: 'Widzisz siebie tylko tam, gdzie ktoś jest albo był. Gdzie nikt nie chodzi, rysunek blaknie i pokazuje stan sprzed pokoleń, a potem ciemność.',
    kiedy: 'Im dalej chodzą twoi mieszkańcy, tym więcej o sobie widzisz.',
    rycina: cala(rysujPamiec),
  },
  {
    id: 'sen', grupa: 'prawa', nazwa: 'Przegrana', lacina: 'Casus',
    opis: 'Przegrywasz, gdy nie żyje już żaden pobożny — tylko ich modlitwa kruszy skorupę, a nowych nikt nie wyda. Przegrywasz też, gdy do rdzenia dojdzie ktoś, kto w ciebie nie wierzy. Najczęstsza droga do porażki to głód — lud rozproszony daleko od wiadra, bez robotników, którzy noszą jedzenie.',
    kiedy: 'Trzymaj lud razem i robotników przy życiu — jedzenie jest tylko w wiadrze w sali, a warcie pod rdzeniem donoszą je robotnicy. Nie wysyłaj pod rdzeń ostatniego pobożnego.',
    rycina: cala(rysujSpis),
  },
  {
    id: 'droga', grupa: 'prawa', nazwa: 'Droga do wolności', lacina: 'Via liberationis',
    opis: `Wygrywasz, gdy rycerz pokona demona, który spał w Wielkim Pomniku na dnie góry. Po kolei: pobożni się modlą (wiara); lud uwierzy na ${proc(PIELGRZYMKA.oddanieNacji)} albo sam poślesz pobożnych szeptem „módl się” (oddanie); robotnicy na twój rozkaz wykopią drogę wiernych — złotą kreskę do krypty (droga); pobożni modlą się w krypcie i kruszą pomnik, rycerz trzyma wartę, a fale Strażników Snu trzeba pokonać (pomnik); gdy pomnik pęknie do końca, z gruzów wstaje demon — jego śmierć to twoja wolność.`,
    kiedy: 'Chroń rycerza — bez niego demona biją robotnicy w hełmach albo pobożni księgami.',
    rycina: drogaWolnosci,
  },
  {
    id: 'skorupa', grupa: 'prawa', nazwa: 'Wielki Pomnik', lacina: 'Monumentum daemonis',
    opis: `Na dnie góry, w komorze pod kryptą, na cokole z wyrytymi znakami kuca olbrzymi kamienny demon zakuty w łańcuchy — w środku śpi żywy. Kilof go nie ruszy; kruszy go tylko modlitwa: gdy w krypcie modli się co najmniej ${RYTUAL.potrzebaWiernych} pobożny z oddaniem od ${proc(RYTUAL.minOddanie)}. Pęka w trzech stanach: przy ${POMNIK.stany[0]}% biegną po nim rysy, przy ${POMNIK.stany[1]}% odpadają kawałki (róg, skrzydło, bark), przy ${POMNIK.stany[2]}% rysy żarzą się czerwono od środka. Każde pęknięcie idzie wolniej od poprzedniego, a na Koszmarze pomnik jest twardszy (${proc(RYTUAL.koszmarMnoznik)} tempa). Przy 100% rozpada się w gruz, a z gruzu wstaje demon.`,
    kiedy: `Trzymaj w krypcie pobożnych, najedzonych i wierzących. Przy ${STRAZNICY.fale.filter((f) => !f.boss).map((f) => `${f.prog}`).join(', ')}% wychodzą Strażnicy Snu — dopóki żyją, pomnik nie pęka.`,
    rycina: pomnikRycina,
  },
  {
    id: 'rdzen', grupa: 'prawa', nazwa: 'Ostatnie uderzenie', lacina: 'Ictus ultimus',
    opis: 'Gdy rycerz zada demonowi ostatnie uderzenie, czas na chwilę zwalnia, a kamera jedzie do demona. Cios odrzuca go w tył; po ciele rozchodzą się rysy złotego światła, demon pada na kolana — i rozsadza go od środka: rozbłysk, fala światła po krypcie, a z niego zostaje popiół i gasnące iskry. Jesteś wolny — to koniec gry.',
    kiedy: 'Ostatni cios zadaje rycerz (albo robotnik w hełmie, albo pobożny księgą, gdy walczących brak). W przyszłości będzie tu przerywnik filmowy.',
    rycina: uderzenieRycina,
  },
  {
    id: 'warstwy', grupa: 'prawa', nazwa: 'Warstwy góry', lacina: 'Strata montis',
    opis: 'Góra ma piętra. Z powierzchni prowadzą dwa otwory: szerszy szyb, którym na ołtarz wpada światło dnia, i węższy, którym zjeżdża wiadro z jedzeniem — oba do sali z siedzibą. Nad salą leży czapa skały nie do ruszenia, a całą górę otacza gruba rama, której nikt nie przekuje. Niżej trzy warstwy: płytka — miękka skała i kępy rdzawego żelaza; środkowa — zwykła skała, małe jaskinie ze złotem pod dnem i ruiny; głęboka — twarda skała, kuje się najwolniej. Na samym dole szeroka, niska krypta z płaską podłogą, a pod jej środkiem, w komorze, Wielki Pomnik demona — zawsze w tym samym miejscu.',
    kiedy: 'Każda warstwa w dół to dłuższa droga z powrotem do wiadra. Żelazo leży tuż pod salą, po złoto trzeba zejść do środkowej, a droga wiernych prowadzi przez wszystkie trzy aż do krypty.',
    rycina: warstwyRycina,
  },
  {
    id: 'oddanie', grupa: 'prawa', nazwa: 'Oddanie i modlitwa', lacina: 'Devotio',
    opis: `Oddanie to to, jak mocno lud w ciebie wierzy — od 0 do 100%, widać je w złożonych dłoniach pod płytą, które napełniają się złotem, i na karcie postaci. Kto wierzy, ten się modli: przy ołtarzu, przy znaku po Cudzie i w krypcie nad Wielkim Pomnikiem. Każda modlitwa daje ci wiarę i trochę podnosi oddanie. Najszybciej podniesie je Cud przy siedzibie. Przy ${proc(PIELGRZYMKA.oddanieNacji)} lud sam wyśle wartę do krypty.`,
    kiedy: 'Najprościej: Cud przy siedzibie, jedzenie dla warty — i szepnij „módl się” pobożnym (albo wybierz „poślij” na karcie warty).',
    rycina: pielgrzymka,
  },
  {
    id: 'pielgrzymka', grupa: 'prawa', nazwa: 'Warta w krypcie', lacina: 'Peregrinatio',
    opis: `Gdy oddanie ludu przekroczy ${proc(PIELGRZYMKA.oddanieNacji)}, od ${PIELGRZYMKA.minPielgrzymow} do ${PIELGRZYMKA.maxPielgrzymow} najwierniejszych, najedzonych pobożnych samo schodzi do krypty i modli się nad Wielkim Pomnikiem. Czekają przy obozie, aż robotnicy dokopią drogę (złotą kreskę), a rycerze idą z nimi na wartę. Szept „módl się” posyła pobożnego od razu, bez względu na wiarę ludu.`,
    kiedy: 'Warta głoduje pierwsza — wiadro jest tylko w sali, więc pilnuj, żeby robotnicy donosili jej jedzenie (i żeby w wiadrze było co nosić: dosyp rytem Nakarm).',
    rycina: pielgrzymka,
  },
  {
    id: 'wydarzenia', grupa: 'prawa', nazwa: 'Wydarzenia', lacina: 'Aestus',
    opis: `Co ${Math.round(WYDARZENIA.odstep / 120)}–${Math.round((WYDARZENIA.odstep + WYDARZENIA.rozrzut) / 120)} sekund coś się dzieje: ludzie schodzą z powierzchni, nadchodzi zaraza, lud głoduje albo prosi o znak, pobożni chcą zejść do krypty, głębia proponuje układ, jedzenie w wiadrze gnije, strop nad drogą wiernych pęka. Czas wtedy staje, a karta pokazuje dwa albo trzy wybory — każdy z ceną i jednym zdaniem skutku.`,
    kiedy: 'Zgniłe jedzenie lepiej oczyścić albo wylać, niż zjeść. Podparty strop oszczędza robotnikom kopania.',
    rycina: cala(rysujPrzyplyw),
  },
  {
    id: 'role', grupa: 'prawa', nazwa: 'Role ludu', lacina: 'Officia',
    opis: `Drużyna jest stała: ${LUD.start.robotnik} robotników, ${LUD.start.pobozny} pobożnych i ${LUD.start.rycerz} rycerz — nikt nie dochodzi i nikt się nie starzeje. Pobożni modlą się i kruszą Wielki Pomnik; stoją przy obozie najbliżej krypty. Robotnicy kopią tylko na twój rozkaz, a poza tym donoszą jedzenie z wiadra tym, którzy stoją na warcie. Rycerz jest jeden, ale ma miecz i ${LUD.role.rycerz.hp} razy więcej życia; poza wartą pilnuje obozu, a w czasie fali walczy ze Strażnikami. Zaczyna w samej kolczudze — resztę zbroi wykuwa mu kuźnia. Gdy rycerza zabraknie, robotnicy zakładają hełmy i walczą zamiast niego.`,
    kiedy: 'Na karcie postaci widać jej zamiar i ile jeszcze go trzyma. Rozkazy wydajesz z medalionów pod płytą.',
    rycina: postac(Race.GOBLIN, 'kopie', 1, 'robotnik'),
  },
  {
    id: 'weterani', grupa: 'prawa', nazwa: 'Weterani i aureole', lacina: 'Veterani',
    opis: `Kto przeżyje w ludzie ${Math.round(LUD.weteranPo / 7200)} minuty, staje się weteranem: póki najedzony, a lud wierny, ma +${Math.round((LUD.weteranPremia - 1) * 100)}% siły, szybkości, kopania i modlitwy. Jasna aureola znaczy wzmocnienie (weteran, hełm), czerwona — osłabienie (okaleczony, zatruty).`,
    kiedy: 'Karta postaci mówi, jaki to stan i kiedy minie. Weterana warto karmić — głodny traci premię.',
    rycina: postac(Race.GOBLIN, 'modli'),
  },
  {
    id: 'straznicy', grupa: 'prawa', nazwa: 'Strażnicy Snu', lacina: 'Custodes somni',
    opis: `Pomnik ma strażników. Przy ${STRAZNICY.fale.filter((f) => !f.boss).map((f) => `${f.prog}`).join(', ')}% skruszenia — razem z każdym stanem pękania — wychodzą ze skały wokół krypty fale, z każdą silniejsi. Przenikają skałę, nie odchodzą daleko od krypty i biją najpierw rycerzy. Dopóki fala trwa, pomnik nie pęka. Za pokonaną falę dostajesz ${STRAZNICY.nagrodaWiary} wiary. Ostatnia fala przychodzi z demonem.`,
    kiedy: 'W czasie fali pobożni i robotnicy sami odchodzą z krypty — walczą rycerze (a gdy ich brak, robotnicy w hełmach). Pasek nad płytą mówi, ilu zostało.',
    rycina: skorupa,
  },
  {
    id: 'boss', grupa: 'prawa', nazwa: DEMON.nazwa, lacina: 'Daemon lapidis',
    opis: `Gdy Wielki Pomnik pęknie do końca, rozpada się w gruz, a z gruzu wstaje demon, który w nim spał: prostuje się, otwiera płonące oczy, rozpościera skrzydła i ryczy — a z nim wychodzą ostatni Strażnicy. Przenika skałę i idzie do krypty. Rani go tylko rycerz albo robotnik w hełmie (${DEMON.hp} życia). Co jakiś czas uderza w ziemię i zasypuje kawałek drogi wiernych. Gdy w krypcie modlą się pobożni, słabnie — bez modlitwy się zrasta. Gdy walczących brak, pobożni unoszą księgi i razią go z dystansu. Gdy padnie — jesteś wolny.`,
    kiedy: 'Rycerz na demona, pobożni do modlitwy, robotnicy przy drodze. Życie demona widać na pasku nad płytą.',
    rycina: demonRycina,
  },
  {
    id: 'helmy', grupa: 'prawa', nazwa: 'Hełmy robotników', lacina: 'Fossores armati',
    opis: `Gdy zginie rycerz, robotnicy zakładają żelazne hełmy i biorą kilofy do walki: mają ${Math.round((LUD.helm.hp - 1) * 100)}% więcej życia i biją jak rycerze — trzymają wartę, bronią przed obcymi, walczą ze Strażnikami Snu i z bossem. Gdy rycerz wróci do ludu, hełmy zdejmują.`,
    kiedy: 'To ostatnia obrona, nie zastępstwo — w czasie fali robotnik w hełmie walczy zamiast kopać i nosić jedzenie.',
    rycina: postac(Race.GOBLIN, 'walczy', 1, 'robotnik', true),
  },
  {
    id: 'trupy', grupa: 'prawa', nazwa: 'Trupy', lacina: 'Corpora',
    opis: `Kto z ludu umrze, nie znika: jego ciało leży tam, gdzie padł. Tylko zabranych przez ciemność i przez dłoń z otchłani nie ma. Gdy ciał jest więcej niż ${LUD.trupyMax}, najstarsze rozsypują się w kości.`,
    kiedy: 'Trupy mówią, gdzie lud ginie — tam spuść wiadro albo poślij rycerza.',
    rycina: postac(Race.GOBLIN, 'spi'),
  },
  {
    id: 'rozkazy', grupa: 'prawa', nazwa: 'Drużyna i rozkazy', lacina: 'Imperium',
    opis: 'Pod płytą trzy medaliony: robotnicy, pobożni i rycerz, z liczbą żywych. Dotknięcie medalionu zaznacza wszystkich z tej roli, drugie wiezie do nich kamerę; dotknięcie postaci na mapie zaznacza ją (z Shiftem dokładasz). Gdy ktoś jest zaznaczony, dotknięcie mapy to rozkaz „idź tam”: idzie i trzyma tam posterunek — pobożny się modli, rycerz pilnuje — aż rozkaz odwołasz. Pobożny i rycerz idą tylko tam, dokąd prowadzi droga; inaczej odmawiają — kręcą głową, a w dymku mówią dlaczego. Robotnik przekopuje się sam, a wskazana mu skała to „kop tam” (ruda — „kop żyłę”: wykuje całą kępę). Wskazany plan pomieszczenia robotnicy kują, w gotowym warsztacie i kuźni pracują, rycerz w kuźni zakłada zbroję z wieszaka, a w sypialni każdy śpi. „Kop drogę wiernych” każe robotnikom kopać złotą kreskę. Stojący rozstawiają się, nie jeden w drugim, a idący razem dopasowują krok.',
    kiedy: 'Klawisze: A — robotnicy, S — pobożni, D — rycerz, G — kop drogę wiernych, V — odwołaj rozkaz, B — wyznacz pomieszczenie; Esc albo prawy przycisk — odznacz. Bez rozkazu robotnicy nie kopią.',
    rycina: postac(Race.GOBLIN, 'idzie', 1, 'rycerz'),
  },
  {
    id: 'pomieszczenia', grupa: 'prawa', nazwa: 'Pomieszczenia', lacina: 'Conclavia',
    opis: `„Wyznacz pomieszczenie” pod płytą (albo klawisz B) i szablon: sypialnia (${POMIESZCZENIA.szablony.sypialnia.w}×${POMIESZCZENIA.szablony.sypialnia.h}), warsztat i kuźnia (${POMIESZCZENIA.szablony.warsztat.w}×${POMIESZCZENIA.szablony.warsztat.h}), korytarz, szyb i lina (lina wisi od razu — nikt jej nie buduje). Pod kursorem widać obrys: jasny — wolno, czerwony — nie, i dlaczego. Pokój stoi na płaskiej, litej podłodze i ma wejście z boku, na poziomie podłogi albo o kafel wyżej lub niżej. Korytarz i szyb zaczynają się tam, gdzie stoi lud: korytarz ciągniesz palcem w bok (wysoki na ${POMIESZCZENIA.korytarzWys} kafle), szyb w dół — to proste schody, więc da się nim wrócić. Planu nie położysz w skale nie do ruszenia ani pod złotą kreską drogi wiernych; prawy przycisk na planie go skreśla.`,
    kiedy: 'Plan kują tylko robotnicy, których zaznaczysz i którym go wskażesz — wolni sami nic nie biorą. Kując plan, robotnik sięga też nad głowę.',
    rycina: pomieszczeniaRycina,
  },
  {
    id: 'sypialnia', grupa: 'prawa', nazwa: 'Sypialnia', lacina: 'Dormitorium',
    opis: `Każdy z ludu — robotnik, pobożny, rycerz — wskazany na gotową sypialnię kładzie się na posłaniu. Po ${Math.round(POMIESZCZENIA.sypialnia.snuTikow / 120)} sekundach snu traci osłabienia: okaleczenie i zatrucie (czerwona aureola rozpływa się), wstaje wypoczęty i wraca do swoich zajęć. Głodny najpierw idzie jeść, a potem wraca spać.`,
    kiedy: 'Poślij tam pobożnego po ofierze krwi przy ołtarzu albo kogoś zatrutego — po minucie snu wróci do pełni sił.',
    rycina: sypialniaRycina,
  },
  {
    id: 'oltarz', grupa: 'prawa', nazwa: 'Ołtarz', lacina: 'Altare',
    opis: `Kamienny ołtarz z krzyżem stoi od początku na środku sali, w smudze światła dziennego z szybu nad nim; jedzenie zjeżdża drugim, węższym otworem obok. Pod ołtarzem jest kamienny kopczyk, a podłoga sali — z kamienia, więc nikt go nie podkopie ani nie przetnie drogi do niego; w sali nic się nie zawali. Dotknij ołtarza: otworzy się okno z rytuałami i ich ceną we krwi. Rytuał odprawia pobożny, który stoi przy ołtarzu — zaznacz go i dotknij ołtarza albo w oknie „przywołaj pobożnego”. Klęczy, aż skończy; gdy odejdzie albo zginie, rytuał przepada, a krew wraca.`,
    kiedy: 'Krew to paliwo rytuałów — zbieraj ją z bitew i ofiar, a wydawaj na modlitwę, szał rycerza i wskrzeszanie poległych.',
    rycina: oltarzRycina,
  },
  {
    id: 'rytual-modlitwa', grupa: 'prawa', nazwa: 'Modlitwa przy ołtarzu', lacina: 'Oratio ad altare',
    opis: `Pobożny klęczy przy ołtarzu, od krzyża biją promienie, a złote iskry płyną od niego do krzyża. Przez ${Math.round(OLTARZ.rytualy.modlitwa.tikow / 120)} sekund wiara rośnie — razem o ${OLTARZ.rytualy.modlitwa.wiara}.`,
    kiedy: `Gdy masz krew, a brak ci wiary na szepty i Cud. Kosztuje ${OLTARZ.rytualy.modlitwa.krew} krwi.`,
    rycina: rytualRycina('modlitwa', 'modli'),
  },
  {
    id: 'rytual-szal', grupa: 'prawa', nazwa: 'Szał krwi', lacina: 'Furor sanguinis',
    opis: `Pobożny unosi księgę, krew spływa po krzyżu do misy, a wokół ołtarza zapala się krąg czerwonych znaków. Na koniec czerwona smuga leci do rycerza: przez ${Math.round(OLTARZ.rytualy.szal.trwa / 7200)} minutę żarzy się czerwoną aurą i bije ${String(OLTARZ.rytualy.szal.sila).replace('.', ',')} raza mocniej. Gdy rycerza brak, szał rozpala robotnika w hełmie.`,
    kiedy: `Przed falą Strażników albo bossem — odpraw go, gdy fala nadciąga. Kosztuje ${OLTARZ.rytualy.szal.krew} krwi.`,
    rycina: rytualRycina('szal', 'czyta'),
  },
  {
    id: 'rytual-wskrzeszenie', grupa: 'prawa', nazwa: 'Wskrzeszenie', lacina: 'Resurrectio',
    opis: `W oknie ołtarza wybierasz, kogo przywrócić — z poległych, których ciała jeszcze leżą. Ciało blednie i rozsypuje się w jasne iskry, które płyną do ołtarza; nad mensą unosi się ta sama postać, z szarej coraz barwniejsza, i po ${Math.round(OLTARZ.rytualy.wskrzeszenie.tikow / 120)} sekundach staje obok ołtarza — z tą samą rolą i twarzą, zdrowa. Zabranych przez ciemność i dłoń z otchłani wskrzesić się nie da: nie zostaje po nich ciało.`,
    kiedy: `Jedyny sposób, żeby drużyna znów była cała. Kosztuje ${OLTARZ.rytualy.wskrzeszenie.krew} krwi.`,
    rycina: wskrzeszenieRycina,
  },
  {
    id: 'rytual-ofiara-krwi', grupa: 'prawa', nazwa: 'Ofiara krwi', lacina: 'Sacrificium sanguinis',
    opis: `Pobożny przy ołtarzu upuszcza krwi: krople spadają do misy, misa się napełnia, a kropla leci do licznika — +${LUD.okaleczenieKrew} krwi. Potem jest okaleczony (−${Math.round((1 - LUD.okaleczenie) * 100)}% życia, siły i szybkości), póki nie prześpi ${Math.round(POMIESZCZENIA.sypialnia.snuTikow / 7200)} minuty w sypialni. Okaleczony drugi raz krwi nie odda.`,
    kiedy: 'Gdy brak krwi na rytuał, a pobożny może potem odpocząć.',
    rycina: rytualRycina('ofiaraKrwi', 'modli'),
  },
  {
    id: 'rytual-ofiara-zycia', grupa: 'prawa', nazwa: 'Ofiara życia', lacina: 'Sacrificium vitae',
    opis: `Pobożny oddaje życie na ołtarzu: krąg ciemnoczerwonych znaków, słup czerwonego światła — i +${LUD.ofiaraKrew} krwi. Ostatniego pobożnego ołtarz nie przyjmie: bez niego nikt nie odprawi rytuału ani nie pomodli się pod rdzeniem. Jego ciało zostaje przy ołtarzu — można go potem wskrzesić.`,
    kiedy: 'Ostateczność. Drużyna jest stała, a wskrzeszenie kosztuje więcej krwi, niż daje ofiara.',
    rycina: ofiaraZyciaRycina,
  },
  {
    id: 'lina', grupa: 'prawa', nazwa: 'Lina', lacina: 'Funis',
    opis: `„Wyznacz pomieszczenie” → „lina”: dotknij miejsca, gdzie ma wisieć hak (albo przeciągnij w górę). Jedyny warunek: lina nie trzyma się powietrza — jej górny koniec musi być uczepiony skały: stropu tuż nad nią, krawędzi półki obok albo ściany przy górze; bez tego obrys jest czerwony. Wskazana skała to strop — lina zawiśnie tuż pod nią. Wieszasz ją ty, od razu — nikt z ludu jej nie buduje: z żelaznego haka wbitego w skałę spada zwój, rozwija się aż do podłogi, a lina chwilę się kołysze. ${POMIESZCZENIA.linyDarmowe} pierwszych lin jest za darmo, każda następna kosztuje ${POMIESZCZENIA.linaKrew} krwi. Po linie każdy z ludu wchodzi i schodzi w obie strony. Na zakrętach drogi wiernych lina spada sama, gdy zakręt jest wykopany — za darmo.`,
    kiedy: 'Gdy ktoś zszedł w głąb i nie ma jak wrócić, albo gdy półka z rudą wisi za wysoko. Wieszaj przy krawędzi półki — po linie wchodzi się na nią. Darmowe liny szybko się kończą.',
    rycina: linaRycina,
  },
  {
    id: 'ruiny', grupa: 'prawa', nazwa: 'Ruiny', lacina: 'Ruinae',
    opis: `W środkowej warstwie góry leżą zawalone budowle — ${ZABYTKI.ruiny.odIlu}–${ZABYTKI.ruiny.doIlu} na górę: kaplica z łukami i filarami, stara kopalnia z odrzwiami z belek i porzuconym wózkiem albo kawałek miasta, dwa domy i ulica pod łukiem bramy. Zamurowane w skale, częściowo zawalone (gruz, zwalone belki) — trzeba się do nich przekopać. Mur z ciosów kuje się jak skała. W każdej leży zabytek; w ciemności czasem błyśnie.`,
    kiedy: 'Wyślij robotnika rozkazem „kop tam” do ruin — gdy ktoś z ludu stanie przy zabytku, odkryje go. Pamiętaj o drodze powrotnej: jedzenie jest tylko w sali.',
    rycina: ruinyRycina,
  },
  {
    id: 'zabytki', grupa: 'prawa', nazwa: 'Zabytki', lacina: 'Reliquiae',
    opis: `Kto z ludu stanie przy zabytku, odkrywa go: z ruin sypie się kurz, zabytek rozbłyskuje i unosi się w świetle, a świat staje i pyta: „Weź” czy „Zostaw”. Weź — premia i kara dla całego ludu, na zawsze (sen w sypialni kary nie zdejmie): zabytek leci do rąk odkrywcy, ten unosi go nad głowę, a fala światła zapala każdemu jasną i czerwoną aureolę. Zostaw — zabytek opada i gaśnie. Relikwiarz świętego: ${ZABYTEK.relikwiarz.premia}, ale ${ZABYTEK.relikwiarz.kara}. Miecz krzyżowca: ${ZABYTEK.miecz.premia}, ale ${ZABYTEK.miecz.kara}. Kielich: ${ZABYTEK.kielich.premia}, ale ${ZABYTEK.kielich.kara}. Księga: ${ZABYTEK.ksiega.premia}, ale ${ZABYTEK.ksiega.kara}.`,
    kiedy: 'Bierz to, czego kara najmniej ci szkodzi: relikwiarz, gdy droga już wykopana; miecz przed bossem, jeśli drużyna trzyma się razem; kielich tylko przy pełnym wiadrze.',
    rycina: zabytkiRycina,
  },
  {
    id: 'schody', grupa: 'prawa', nazwa: 'Schody', lacina: 'Gradus',
    opis: 'Lud nie ma lin ani klamer. W górę wchodzi najwyżej o jeden stopień — na wyższą półkę się nie wdrapie: musi wykuć sobie w skale schody albo wejść po linie, którą powiesisz. W dół zsuwa się szybem po ścianach albo zeskakuje z niewysokiej półki; kto spadnie z wysoka, potłucze się, a w głęboką przepaść sam nie skoczy.',
    kiedy: 'Robotnik, któremu każesz iść tam, dokąd nie ma przejścia, sam wykuwa schody; kto utknie w dołku bez wyjścia, wkopuje się do jedzenia. Droga wiernych schodzi schodami, bez zeskoków — a na zakrętach, gdzie pod górę trzeba by wejść o dwa stopnie, sama spada lina, gdy zakręt jest wykopany. Kto nią zejdzie, wróci nią do sali, do wiadra. Podłogi pod drogą nikt z ludu nie kuje.',
    rycina: postac(Race.GOBLIN, 'wspina'),
  },
  {
    id: 'pauza', grupa: 'prawa', nazwa: 'Pauza', lacina: 'Tempus suspensum',
    opis: 'Czas możesz zatrzymać. Rozkazy wydane w pauzie (Nakarm, Cud) rysują się jako szkice, rezerwują koszt i dzieją się naraz, gdy puścisz czas. Przy kryzysach gra staje sama.',
    kiedy: 'Zatrzymuj świat, gdy musisz trafić — i przy każdym kryzysie.',
    rycina: pauza,
  },
  {
    id: 'pismo', grupa: 'prawa', nazwa: 'Pismo w skale', lacina: 'Scriptura ignota',
    opis: 'W skale, do której nikt jeszcze nie zajrzał, widać znaki. Nikt z żyjących ich nie wyrył — były tu przed pierwszym z ludu. Gasną, gdy dojdzie do nich światło; w zatrzymanym czasie widać je wyraźniej.',
    kiedy: 'Nie da się ich przeczytać. Można tylko pójść tam, gdzie są, i patrzeć, jak znikają.',
    rycina: pismo,
  },
  {
    id: 'patrzacy', grupa: 'prawa', nazwa: 'Ten, który patrzy', lacina: 'Qui in tenebris spectat',
    opis: `Poza światłem lampek, obozów i rdzenia góra jest ciemna — i coś w tej ciemności jest. Po ${Math.round(MROK.pierwszyPo / 7200)} minutach zaczyna krążyć w skale wokół siedziby i wypatruje tego, kto został sam daleko od obozu (rycerzy nie rusza). Gdy go znajdzie, patrzy na niego: samotny staje jak wryty, w skale świecą oczy, a lampka przygasa. Po ${Math.round(MROK.patrzyTikow / 120)} sekundach zabiera go — krew zostaje dla ciebie. Potem na kilka minut cichnie.`,
    kiedy: 'Nie puszczaj nikogo samego daleko od obozu. Gdy zobaczysz oczy — rzuć Cud tuż przy nich albo poślij kogoś do samotnego.',
    rycina: patrzacy,
  },
  {
    id: 'dlon', grupa: 'prawa', nazwa: 'Dłoń z otchłani', lacina: 'Manus ex abysso',
    opis: `Rzadko, najwcześniej po ${Math.round(DLON.pierwszaPo / 7200)} minutach i najwyżej ${DLON.maxNaPartie} razy w partii. Otchłań to nieznane — ta część góry, której nikt nie widział albo o której zapomniano. Gdy ktoś z ludu stanie daleko od obozu, a pod nim zaczyna się otchłań, spod ziemi sączy się czerwona łuna, a on (czasem dwoje naraz) staje jak wryty. Z głębi, zawsze od dołu, wznosi się ogromna dłoń — po ${Math.round((DLON.wstaje + DLON.siega) / 120)} sekundach sięga, chwyta ich i zapada się z nimi w ciemność. Nie zostają nawet trupy — krew i tak spływa do ciebie.`,
    kiedy: 'Nie stawiaj ludu nad nieznanym daleko od obozu. Gdy otchłań pod kimś zaczerwieni się — rzuć Cud przy nim, zanim dłoń chwyci.',
    rycina: dlonOtchlani,
  },
  {
    id: 'lina-wiadra', grupa: 'prawa', nazwa: 'Przecięta lina', lacina: 'Funis praecisus',
    opis: `W Koszmarze (w Alphie zawsze) dłoń z otchłani poluje też na linę, na której zjeżdża jedzenie — najwcześniej po ${Math.round(DLON.lina.pierwszaPo / 7200)} minutach, najwyżej ${DLON.lina.maxNaPartie} razy w partii. Spod podłogi sali, tuż przy wiadrze, wznosi się obok liny, czeka z rozwartymi szponami i jednym zamachem przecina ją pazurem. Zjeżdżające wiadro spada i roztrzaskuje się — ${Math.round(WIADRO.ciecie.strata * 100)}% jedzenia przepada, reszta leży rozsypana i da się ją zjeść; stojące zostaje bez liny. Póki nikt liny nie sklei, z góry nic nie zjedzie (także Nakarm). „Napraw linę wiadra” — przycisk pod płytą albo na karcie postaci: ktoś z ludu idzie pod szyb, wspina się po zwisającym końcu, owija i wiąże oba kawałki, lina się napina, a z góry od razu zjeżdża nowe wiadro z resztkami rozsypanego jedzenia.`,
    kiedy: 'Rzuć Cud przy wiadrze, zanim pazur przetnie linę — odpędzi dłoń. Jeśli nie zdążysz, wyślij kogoś do liny od razu: każda chwila bez wiadra to głód. Skleja jeden naraz.',
    rycina: przecietaLina,
  },
  {
    id: 'dlon-anielska', grupa: 'prawa', nazwa: 'Dłoń anielska', lacina: 'Manus angelica',
    opis: `Czasem — najwcześniej po ${Math.round(ANIOL.pierwszaPo / 7200)} minutach, najwyżej ${ANIOL.maxNaPartie} razy w partii — z góry, przez skałę, sączy się słup złotego światła i schodzi w nim jasna dłoń, palcami w dół. Daje dar, który sama wybiera, za darmo: ${DAR.podkop.nazwa.toLowerCase()} — ${DAR.podkop.opis} (droga idzie schodami, więc nikt nie utknie w przepaści, a ruda trafia do liczników); ${DAR.ludzie.nazwa.toLowerCase()} — ${DAR.ludzie.opis}, póki ludu jest mniej niż ${ANIOL.dary.ludzie.maksLudu}; ${DAR.krew.nazwa.toLowerCase()} — ${DAR.krew.opis}: struga spływa z jej dłoni prosto do ampułki. Potem wraca w światło.`,
    kiedy: `Nie wywołasz jej — przychodzi sama. Dar ludzi to jedyna, poza wskrzeszeniem, droga do nowych rąk w drużynie — ale gdy ludu jest ${MROK.minLudu} albo więcej, z ciemności zaczyna patrzeć Ten, który patrzy.`,
    rycina: dlonAnielska,
  },
];

export const tablica = (id: string): Tablica | undefined => TABLICE.find((t) => t.id === id);
