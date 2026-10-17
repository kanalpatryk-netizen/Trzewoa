import type { Sim } from '../sim/sim';
import { Race } from '../sim/races';
import { makeCreature, type Creature } from '../sim/creatures';
import { cost, type Verb } from '../powers/powers';
import { rysujPostac, type Czynnosc } from '../render/figury';
import { BARWA, rgba } from '../render/palette';
import { kreskuj, kropkuj, type Plotno } from '../cutscene/art/common';
import { rysujGore } from '../cutscene/art/gora';
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
    kiedy: 'Pilnuj, żeby zawsze był ktoś, kto się modli — bez pobożnych skorupa nie pęknie. Pobożny może się okaleczyć (krew, ale słabnie na zawsze), a każdego możesz złożyć w ofierze.',
    rycina: postac(Race.GOBLIN, 'modli'),
  },
  // ryty
  {
    id: 'ryt-zasiej', grupa: 'ryty', nazwa: 'Nakarm', lacina: 'Situla de caelo',
    opis: `Dotknij miejsca, a z góry, na linie, zjedzie tam dodatkowe wiadro z ${WIADRO.nakarmPorcji} porcjami jedzenia — na dno pustki pod palcem, w miejsce, które ktoś już widział. Naraz zjeżdża tylko jedno takie wiadro.`,
    kiedy: 'Spuszczaj je tam, gdzie głodują, a zwykłe wiadra nie sięgają — najczęściej warcie przy przedsionku rdzenia i grupkom odciętym od siedziby.',
    koszt: `wiadro ${kosztSlowami('zasiej', 'grzyb')}`,
    rycina: cala(rysujZiarno),
  },
  {
    id: 'ryt-szept', grupa: 'ryty', nazwa: 'Szepnij', lacina: 'Susurrus',
    opis: '„Szepnij”, potem dotknij jednej postaci i wybierz słowo na jej karcie. „Módl się” posyła pobożnego pod twój rdzeń od razu, bez względu na wiarę ludu. „Okalecz się” — pobożny upuszcza krwi: dostajesz krew, a on słabnie na zawsze. „Ofiaruj” — oddaje ci życie za dużo krwi. „Przerwij modlitwę” zawraca spod rdzenia.',
    kiedy: 'Gdy droga do rdzenia jest gotowa, szepnij „módl się” obu pobożnym — skorupa pęka szybciej, gdy modlą się razem.',
    koszt: `módl się ${kosztSlowami('szept', 'modl')}, okalecz się ${kosztSlowami('szept', 'okalecz')}, ofiaruj ${kosztSlowami('szept', 'ofiaruj')}`,
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
    opis: `Liczba nad płytą i czerwona rysa pod nią — na Koszmarze zaczynasz z ${Math.max(0, LUD.krewStart - GORA.koszmarKrew)}, mieści się jej najwyżej ${GORA.krewMax}. Płaci ci ją każda śmierć — także Strażników Snu i ludzi z powierzchni — ofiara (+${LUD.ofiaraKrew}) i samookaleczenie pobożnego (+${LUD.okaleczenieKrew}).`,
    kiedy: 'Wydajesz ją na wiadra rytem Nakarm i na wybory na kartach wydarzeń.',
    rycina: cala(rysujOrgany),
  },
  {
    id: 'wiara', grupa: 'zasoby', nazwa: 'Wiara', lacina: 'Fides',
    opis: `Liczba nad płytą — twój zapas, najwyżej ${GORA.wiaraMax}. Rośnie za każdym razem, gdy ktoś się do ciebie modli: przy ołtarzu (pobożni stawiają je sami), przy znaku po Cudzie, a najmocniej pod rdzeniem; +${STRAZNICY.nagrodaWiary} za każdą pokonaną falę Strażników. Nie myl jej z oddaniem: wiara to twoja waluta, oddanie to to, jak mocno wierzy lud.`,
    kiedy: 'Płacisz nią za szepty, Cud i wybory na kartach wydarzeń.',
    rycina: cala(rysujOrgany),
  },
  {
    id: 'wiadro', grupa: 'zasoby', nazwa: 'Wiadro z jedzeniem', lacina: 'Situla panis',
    opis: `Jedyne jedzenie ludu — grzyba ani spiżarni nie ma. Co ${Math.round(WIADRO.co / 120)} sekund z góry, na linie, zjeżdża wiadro pełne jedzenia (${WIADRO.porcjiNaGlowe} porcji na każdego z ludu), najwyżej ${WIADRO.maks} pełnych naraz — do pierwszego odkrytego, pustego miejsca, do którego lud dojdzie, przy tych, którzy najbardziej głodują. Przed zjazdem ze stropu sypie się pył. Każdy może z niego jeść, robotnicy donoszą z niego jedzenie warcie; puste odjeżdża w górę. Kto umiera z głodu (${proc(WIADRO.wspinaczkaOd)} głodu), a wiadro jeszcze jedzie, wspina się po linie, wsiada do niego i je w drodze w dół.`,
    kiedy: 'Liczba „jedzenie” nad płytą to porcje we wszystkich wiadrach. Gdy nie nadążają, spuść dodatkowe rytem Nakarm.',
    rycina: postac(Race.GOBLIN, 'je'),
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
    opis: 'Przegrywasz, gdy nie żyje już żaden pobożny — tylko ich modlitwa kruszy skorupę, a nowych nikt nie wyda. Przegrywasz też, gdy do rdzenia dojdzie ktoś, kto w ciebie nie wierzy. Najczęstsza droga do porażki to głód — lud rozproszony daleko od wiader, bez robotników, którzy noszą jedzenie.',
    kiedy: 'Trzymaj lud razem i robotników przy życiu, spuszczaj wiadra tam, gdzie głodują. Nie wysyłaj pod rdzeń ostatniego pobożnego.',
    rycina: cala(rysujSpis),
  },
  {
    id: 'droga', grupa: 'prawa', nazwa: 'Droga do wolności', lacina: 'Via liberationis',
    opis: `Wygrywasz, gdy pobożni przebiją skorupę rdzenia i uklękną przy nim. Po kolei: pobożni się modlą (wiara); lud uwierzy na ${proc(PIELGRZYMKA.oddanieNacji)} albo sam poślesz pobożnych szeptem „módl się” (oddanie); robotnicy na twój rozkaz wykopią drogę wiernych — złotą kreskę pod rdzeń (droga); pobożni modlą się pod rdzeniem, rycerz trzyma wartę, a fale Strażników Snu trzeba pokonać (skorupa); potem wierni sami wchodzą do środka.`,
    kiedy: 'Kroki widać na wstędze drogi. Chroń rycerza — bez niego ostatnią falę biją robotnicy w hełmach albo pobożni księgami.',
    rycina: drogaWolnosci,
  },
  {
    id: 'skorupa', grupa: 'prawa', nazwa: 'Skorupa rdzenia', lacina: 'Testa cordis',
    opis: `Kamień wokół rdzenia — nie da się go rozkuć. Pęka tylko pod modlitwą: gdy przy rdzeniu stoi naraz co najmniej ${RYTUAL.potrzebaWiernych} wiernych, każdy z oddaniem od ${proc(RYTUAL.minOddanie)}. Każde pęknięcie wyjmuje jeden kafel od strony przedsionka; zwykle trzeba ich około pięciu, każde idzie wolniej od poprzedniego, a na Koszmarze skorupa jest twardsza (${proc(RYTUAL.koszmarMnoznik)} tempa).`,
    kiedy: `Trzymaj pod rdzeniem pobożnych, najedzonych i wierzących. Przy ${STRAZNICY.fale.map((f) => `${f.prog}`).join(', ')}% wychodzą Strażnicy Snu — dopóki żyją, skorupa nie pęka.`,
    rycina: skorupa,
  },
  {
    id: 'rdzen', grupa: 'prawa', nazwa: 'Rdzeń', lacina: 'Cor montis',
    opis: `Gdy przez skorupę prowadzi przejście, wierni sami schodzą do środka — nie musisz ich prowadzić. Kto dotknie rdzenia, kończy grę: wierzący (lud ponad ${proc(RYTUAL.uwolnienieNacja)} oddania albo on sam ponad ${proc(RYTUAL.uwolnienieWlasne)}) cię uwalnia, bezbożny zabija. Dopóki trwa fala Strażników, rdzenia nie dotknie nikt.`,
    kiedy: 'Wierni muszą zdążyć pierwsi: karm wartę i nie wpuszczaj pod rdzeń ludzi z powierzchni.',
    rycina: cala(rysujGore),
  },
  {
    id: 'oddanie', grupa: 'prawa', nazwa: 'Oddanie i modlitwa', lacina: 'Devotio',
    opis: `Oddanie to to, jak mocno lud w ciebie wierzy — od 0 do 100%, widać je w złożonych dłoniach pod płytą, które napełniają się złotem, i na karcie postaci. Kto wierzy, ten się modli: przy ołtarzu, przy znaku po Cudzie i pod rdzeniem. Każda modlitwa daje ci wiarę i trochę podnosi oddanie. Najszybciej podniesie je Cud przy siedzibie. Przy ${proc(PIELGRZYMKA.oddanieNacji)} lud sam wyśle wartę pod rdzeń.`,
    kiedy: 'Najprościej: Cud przy siedzibie, wiadra dla warty — i szepnij „módl się” pobożnym (albo wybierz „poślij” na karcie warty).',
    rycina: pielgrzymka,
  },
  {
    id: 'pielgrzymka', grupa: 'prawa', nazwa: 'Warta pod rdzeniem', lacina: 'Peregrinatio',
    opis: `Gdy oddanie ludu przekroczy ${proc(PIELGRZYMKA.oddanieNacji)}, od ${PIELGRZYMKA.minPielgrzymow} do ${PIELGRZYMKA.maxPielgrzymow} najwierniejszych, najedzonych pobożnych samo schodzi pod rdzeń i modli się pod skorupą. Czekają przy obozie, aż robotnicy dokopią drogę (złotą kreskę), a rycerze idą z nimi na wartę. Szept „módl się” posyła pobożnego od razu, bez względu na wiarę ludu.`,
    kiedy: 'Warta głoduje pierwsza — gdy wiadra do niej nie sięgają, spuść jej wiadro rytem Nakarm.',
    rycina: pielgrzymka,
  },
  {
    id: 'wydarzenia', grupa: 'prawa', nazwa: 'Wydarzenia', lacina: 'Aestus',
    opis: `Co ${Math.round(WYDARZENIA.odstep / 120)}–${Math.round((WYDARZENIA.odstep + WYDARZENIA.rozrzut) / 120)} sekund coś się dzieje: ludzie schodzą z powierzchni, nadchodzi zaraza, lud głoduje albo prosi o znak, pobożni chcą zejść pod rdzeń, głębia proponuje układ, jedzenie w wiadrze gnije, strop nad drogą wiernych pęka. Czas wtedy staje, a karta pokazuje dwa albo trzy wybory — każdy z ceną i jednym zdaniem skutku.`,
    kiedy: 'Zgniłe jedzenie lepiej oczyścić albo wylać, niż zjeść. Podparty strop oszczędza robotnikom kopania.',
    rycina: cala(rysujPrzyplyw),
  },
  {
    id: 'role', grupa: 'prawa', nazwa: 'Role ludu', lacina: 'Officia',
    opis: `Drużyna jest stała: ${LUD.start.robotnik} robotników, ${LUD.start.pobozny} pobożnych i ${LUD.start.rycerz} rycerz — nikt nie dochodzi i nikt się nie starzeje. Pobożni modlą się i kruszą skorupę; stoją przy obozie najbliżej rdzenia. Robotnicy kopią tylko na twój rozkaz, a poza tym donoszą jedzenie z wiader tym, którzy stoją na warcie. Rycerz jest jeden, ale ma miecz i ${LUD.role.rycerz.hp} razy więcej życia; poza wartą pilnuje obozu, a w czasie fali walczy ze Strażnikami. Gdy rycerza zabraknie, robotnicy zakładają hełmy i walczą zamiast niego.`,
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
    opis: `Skorupa ma strażników. Przy ${STRAZNICY.fale.filter((f) => !f.boss).map((f) => `${f.prog}`).join(', ')}% skruszenia wychodzą spod niej fale — z każdą silniejsi. Przenikają skałę, nie odchodzą daleko od rdzenia i biją najpierw rycerzy. Dopóki fala trwa, skorupa nie pęka i nikt nie wejdzie do rdzenia. Za pokonaną falę dostajesz ${STRAZNICY.nagrodaWiary} wiary.`,
    kiedy: 'W czasie fali pobożni i robotnicy sami odchodzą spod rdzenia — walczą rycerze (a gdy ich brak, robotnicy w hełmach). Pasek nad płytą mówi, ilu zostało.',
    rycina: skorupa,
  },
  {
    id: 'boss', grupa: 'prawa', nazwa: 'Śniący Kamień', lacina: 'Lapis somnians',
    opis: `Ostatnia fala, przy ${STRAZNICY.fale.find((f) => f.boss)?.prog ?? 90}% skorupy. Wielki strażnik wychodzi ze ściany przedsionka. Rani go tylko rycerz albo robotnik w hełmie. Co jakiś czas uderza w ziemię i zasypuje kawałek drogi wiernych. Gdy pod rdzeniem modlą się pobożni, słabnie — bez modlitwy się zrasta. Gdy walczących brak, pobożni unoszą księgi i razią go z dystansu.`,
    kiedy: 'Rycerz pod rdzeń, pobożni do modlitwy, robotnicy przy drodze. Życie bossa widać na pasku nad płytą.',
    rycina: skorupa,
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
    opis: 'Pod płytą trzy medaliony: robotnicy, pobożni i rycerz, z liczbą żywych. Dotknięcie medalionu zaznacza wszystkich z tej roli, drugie wiezie do nich kamerę; dotknięcie postaci na mapie zaznacza ją (z Shiftem dokładasz). Gdy ktoś jest zaznaczony, dotknięcie mapy to rozkaz „idź tam”: idzie i trzyma tam posterunek — pobożny się modli, rycerz pilnuje — aż rozkaz odwołasz. Pobożny i rycerz idą tylko tam, dokąd prowadzi droga; inaczej odmawiają — kręcą głową, a w dymku mówią dlaczego. Robotnik przekopuje się sam, a wskazana mu skała to „kop tam”. „Kop drogę wiernych” każe robotnikom kopać złotą kreskę. Stojący rozstawiają się, nie jeden w drugim, a idący razem dopasowują krok.',
    kiedy: 'Klawisze: A — robotnicy, S — pobożni, D — rycerz, G — kop drogę wiernych, V — odwołaj rozkaz; Esc albo prawy przycisk — odznacz. Bez rozkazu robotnicy nie kopią.',
    rycina: postac(Race.GOBLIN, 'idzie', 1, 'rycerz'),
  },
  {
    id: 'schody', grupa: 'prawa', nazwa: 'Schody', lacina: 'Gradus',
    opis: 'Lud nie ma lin ani klamer. W górę wchodzi najwyżej o jeden stopień — na wyższą półkę się nie wdrapie, musi wykuć sobie w skale schody. W dół zsuwa się szybem po ścianach albo zeskakuje z niewysokiej półki; kto spadnie z wysoka, potłucze się, a w głęboką przepaść sam nie skoczy. Lina wisi tylko przy wiadrze z jedzeniem.',
    kiedy: 'Robotnik, któremu każesz iść tam, dokąd nie ma przejścia, sam wykuwa schody; kto utknie w dołku bez wyjścia, wkopuje się do jedzenia. Droga wiernych, gdzie się da, schodzi schodami — można nią wrócić.',
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
];

export const tablica = (id: string): Tablica | undefined => TABLICE.find((t) => t.id === id);
