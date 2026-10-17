/**
 * Znak oddania: dłonie złożone do modlitwy, pochylone jak na rycinie — palce w lewo ku górze,
 * kciuk przyłożony z prawej, przy nadgarstku marszczony mankiet koszuli i rękaw, który wychodzi
 * poza kadr. Wokół promienie z kresek i kropek. Wszystko w kwadracie 100×100.
 *
 * Kształt opisany jest w układzie dłoni (u w prawo, v w dół, początek na środku nadgarstka,
 * czubek palca na v ≈ −65) i dopiero potem obrócony, przesunięty i powiększony — tak łatwiej
 * poprawiać palce bez przeliczania całego skosu.
 */
import { pigment } from './fresk';
import { FRESK } from '../nastawy/barwy';

type Krok = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];

/** Ułożenie dłoni w kwadracie: obrót (palce w lewo), skala i miejsce środka nadgarstka. */
const KAT = (-27 * Math.PI) / 180;
const SKALA = 1.3;
const NADGARSTEK = { x: 67, y: 85 };
/**
 * Promienie: środek, promień początku i końca, ile ich na pełnym kole, a w jakim zakresie kątów
 * (od prawej, w dół dodatnio) ich nie ma — tam leży rękaw.
 */
const PROMIENIE = { x: 50, y: 45, od: 33, do: 54, ile: 22, bezOd: 0.12, bezDo: 1.5 };

const cos = Math.cos(KAT), sin = Math.sin(KAT);
function X(u: number, v: number): number { return NADGARSTEK.x + SKALA * (u * cos - v * sin); }
function Y(u: number, v: number): number { return NADGARSTEK.y + SKALA * (u * sin + v * cos); }

function sciezka(kroki: Krok[], p = new Path2D()): Path2D {
  for (const k of kroki) {
    if (k[0] === 'M') p.moveTo(X(k[1], k[2]), Y(k[1], k[2]));
    else if (k[0] === 'L') p.lineTo(X(k[1], k[2]), Y(k[1], k[2]));
    else if (k[0] === 'C') p.bezierCurveTo(X(k[1], k[2]), Y(k[1], k[2]), X(k[3], k[4]), Y(k[3], k[4]), X(k[5], k[6]), Y(k[5], k[6]));
    else p.closePath();
  }
  return p;
}

/** Bliższa dłoń: trzy palce schodkami, krawędź dłoni, kciuk przyłożony z prawej, nadgarstek (schowany pod mankietem). */
const BLIZSZA: Krok[] = [
  ['M', -8.2, -57.6],
  ['C', -7.6, -62, -5.6, -65.2, -3, -65.2],        // czubek środkowego palca
  ['C', -0.8, -65.2, 0.4, -63.4, 0.5, -60.2],
  ['C', 1.4, -61.8, 4.4, -62, 5.3, -58.8],         // serdeczny
  ['C', 5.6, -57.6, 5.4, -56.4, 5.2, -55.4],
  ['C', 7, -56.2, 9.6, -54.6, 9.9, -51],           // mały
  ['C', 10.6, -45, 11.8, -39, 12.6, -34.6],        // krawędź dłoni
  ['C', 13, -38.6, 14.2, -42.8, 16.4, -43.2],      // kciuk
  ['C', 19, -43.6, 20.4, -40, 20.3, -35.6],
  ['C', 20.2, -26, 19.2, -16, 16.2, -8.5],         // kłąb kciuka ku nadgarstkowi
  ['C', 15, -5.4, 14.4, -2.6, 14, 3],
  ['L', -10.4, 3],
  ['C', -10.8, -7, -11.4, -15, -11.8, -22],        // spód dłoni
  ['C', -12, -34, -10.8, -47, -8.2, -57.6],        // palec wskazujący przy dalszej dłoni
  ['Z'],
];

/** Dalsza dłoń: z lewej wystają tylko opuszki jej palców, schodkami. */
const DALSZA: Krok[] = [
  ['M', -10.8, -21],
  ['C', -13, -21.8, -14.6, -24.6, -14.6, -27.8],   // mały
  ['C', -14.6, -30.6, -13.4, -32.2, -11.6, -32.4],
  ['C', -13.8, -33.8, -15.4, -37, -15.3, -40.4],   // serdeczny
  ['C', -15.2, -43.6, -13.8, -45.2, -11.9, -45.2],
  ['C', -13.8, -47, -14.6, -50.6, -13.9, -54],     // środkowy — sięga prawie czubka bliższej
  ['C', -13.2, -57.6, -11, -60, -8.6, -59.8],
  ['L', -6, -57],
  ['L', -8, -21],
  ['Z'],
];

/** Mankiet koszuli: marszczona falbanka wokół nadgarstka. */
const MANKIET: Krok[] = [
  ['M', -13.8, -0.8],
  ['L', -10.6, -3.8], ['L', -7.2, -0.6], ['L', -3.4, -3.6], ['L', 0.2, -0.4], ['L', 4.2, -3.6],
  ['L', 7.6, -0.4], ['L', 11.6, -3.8], ['L', 14.8, -0.8], ['L', 18.6, -3.8],
  ['C', 19.8, -0.4, 20.4, 3.4, 19.8, 7],
  ['C', 11, 10.6, -3, 11, -14.6, 7.8],
  ['C', -15.2, 5, -15, 2, -13.8, -0.8],
  ['Z'],
];

/** Rękaw: rozszerza się i wychodzi poza dół kadru. */
const REKAW: Krok[] = [
  ['M', -15.6, 5],
  ['C', -18, 14, -19.4, 26, -20, 40],
  ['L', 30, 40],
  ['C', 27, 26, 24.6, 14, 22.4, 3.4],
  ['C', 21, 6.6, 18.4, 4.6, 16.6, 8.4],
  ['C', 9, 11.6, -4, 12, -12, 9],
  ['C', -13.6, 7.4, -14.4, 5.4, -15.6, 5],
  ['Z'],
];

/** Rysy dłoni: palce, kciuk, paznokcie, stawy, linia pod palcami. */
const RYSY: Krok[] = [
  // palce bliższej dłoni
  ['M', 0.5, -60.2], ['C', 1, -52, 2, -42, 3.4, -32.6],
  ['M', 5.2, -55.4], ['C', 5.8, -48, 6.8, -40, 8.2, -33.2],
  ['M', -4.6, -59.4], ['C', -5.4, -50, -5.6, -40, -4.8, -30.6],
  // kciuk od dłoni i jego paznokieć
  ['M', 12.6, -34.6], ['C', 13.9, -27, 14.5, -19, 14.1, -10],
  ['M', 15.2, -40.4], ['C', 16.4, -41.8, 18.4, -41.8, 19.3, -39.8],
  // paznokcie
  ['M', -5.8, -61.8], ['C', -4.6, -63.4, -2.2, -63.6, -0.8, -62.2],
  ['M', 2, -59.2], ['C', 2.8, -60.4, 4.2, -60.2, 4.8, -58.8],
  ['M', 7, -53.4], ['C', 7.8, -54.2, 9.2, -53.8, 9.6, -52.4],
  // opuszki dalszej dłoni
  ['M', -13.6, -28.8], ['C', -13.2, -30.6, -12.4, -31.4, -11.6, -31.6],
  ['M', -14.2, -41.2], ['C', -13.8, -43.2, -12.9, -44.2, -11.9, -44.4],
  ['M', -12.8, -54.6], ['C', -12.2, -56.8, -10.8, -58.2, -9.2, -58.6],
  // stawy
  ['M', -3.8, -46.4], ['L', -1.4, -46.8], ['M', 2.4, -45], ['L', 4.4, -45.6], ['M', 7.2, -42.4], ['L', 9, -43],
  ['M', -3.6, -38.4], ['L', -1.2, -38.6], ['M', 2.8, -37.6], ['L', 4.8, -38], ['M', 7.6, -36.2], ['L', 9.4, -36.6],
  // linia dłoni pod palcami
  ['M', -9, -24], ['C', -5, -22.6, 2, -23.6, 8.4, -27],
];

/** Fałdy mankietu (z dolin falbanki) i rękawa. */
const FALDY: Krok[] = [
  ['M', -7.2, -0.6], ['L', -6.8, 8.8], ['M', 0.2, -0.4], ['L', 0.6, 9.8], ['M', 7.6, -0.4], ['L', 8.4, 9.6],
  ['M', 14.8, -0.8], ['L', 15.8, 8],
  ['M', -9, 13], ['C', -11, 20, -12, 28, -12.4, 36],
  ['M', 14, 13], ['C', 17, 20, 19, 28, 20.4, 36],
];

/** Cień: spód dłoni i kłąb kciuka (rycina kładzie tam gęstą kreskę). */
const CIEN: Krok[] = [
  ['M', -10.4, 3],
  ['C', -10.8, -7, -11.4, -15, -11.8, -22],
  ['C', -9.6, -16, -8.2, -8, -7.4, 3],
  ['Z'],
  ['M', 20.3, -35.6],
  ['C', 20.2, -26, 19.2, -16, 16.2, -8.5],
  ['C', 17.6, -16, 18.4, -25, 18.2, -33.4],
  ['Z'],
];

interface DloniePrzyModlitwie {
  /** Obie dłonie razem — w nich wzbiera złoto oddania. */
  dlonie: Path2D;
  /** Osobne bryły do konturów (żeby było widać, gdzie kończy się jedna dłoń, a zaczyna druga). */
  bryly: Path2D[];
  rysy: Path2D;
  cien: Path2D;
  rekaw: Path2D;
  mankiet: Path2D;
  faldy: Path2D;
  /** Pionowy zakres widocznych dłoni — złoto liczy się od mankietu po czubek palca. */
  gora: number;
  dol: number;
}

let gotowe: DloniePrzyModlitwie | null = null;

function dloniePrzyModlitwie(): DloniePrzyModlitwie {
  if (gotowe) return gotowe;
  const bryly = [sciezka(DALSZA), sciezka(BLIZSZA)];
  const dlonie = new Path2D();
  for (const b of bryly) dlonie.addPath(b);
  return (gotowe = {
    dlonie,
    bryly,
    rysy: sciezka(RYSY),
    cien: sciezka(CIEN),
    rekaw: sciezka(REKAW),
    mankiet: sciezka(MANKIET),
    faldy: sciezka(FALDY),
    gora: Y(-3, -65.2),
    // najniższy widoczny skrawek dłoni nad falbanką (z lewej, bo dłonie są pochylone)
    dol: Y(-10.6, -3.8),
  });
}

/**
 * Promienie wokół dłoni: kreska, przerwa, krótka kreska i kropka, na przemian dłuższe i krótsze
 * (`drobne` — z bliska; z daleka same kreski).
 */
function rysujPromienie(ctx: CanvasRenderingContext2D, kolor: string, grubosc: number, drobne: boolean): void {
  const P = PROMIENIE;
  ctx.save();
  ctx.strokeStyle = kolor;
  ctx.fillStyle = kolor;
  ctx.lineCap = 'round';
  for (let i = 0; i < P.ile; i++) {
    const a = (i / P.ile) * Math.PI * 2 - Math.PI / 2;
    const k = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (k > P.bezOd && k < P.bezDo) continue;
    const dlugi = i % 2 === 0;
    const r0 = P.od + (dlugi ? 0 : 4);
    const r1 = dlugi ? P.do : P.do - 5;
    const dx = Math.cos(a), dy = Math.sin(a);
    const kreska = (r1 - r0) * (drobne ? 0.56 : 1);
    ctx.lineWidth = grubosc * (dlugi ? 1.3 : 1);
    ctx.beginPath();
    ctx.moveTo(P.x + dx * r0, P.y + dy * r0);
    ctx.lineTo(P.x + dx * (r0 + kreska), P.y + dy * (r0 + kreska));
    ctx.stroke();
    if (!drobne) continue;
    const r2 = r0 + kreska + (r1 - r0) * 0.12;
    const r3 = r2 + (r1 - r0) * 0.15;
    ctx.lineWidth = grubosc;
    ctx.beginPath();
    ctx.moveTo(P.x + dx * r2, P.y + dy * r2);
    ctx.lineTo(P.x + dx * r3, P.y + dy * r3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(P.x + dx * r1, P.y + dy * r1, grubosc * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Znak oddania w kwadracie (x, y, bok): dłonie napełniają się złotem od mankietu po czubki
 * palców, kreska w poprzek to próg pielgrzymki, a promienie jaśnieją z oddaniem — gdy nacja
 * idzie pod rdzeń, złocą się i pulsują. `tusz` — początek barwy kreski, np. 'rgba(206,192,166,'.
 */
export function rysujZnakOddania(
  ctx: CanvasRenderingContext2D, x: number, y: number, bok: number, oddanie: number, prog: number, tusz: string, czas: number,
): void {
  const d = dloniePrzyModlitwie();
  const dosc = oddanie > prog;
  const s = bok / 100;
  const o = Math.max(0, Math.min(1, oddanie));
  const doY = (u: number) => d.dol - (d.dol - d.gora) * u;
  const poziom = doY(o);
  const tetno = 0.5 + 0.5 * Math.sin(czas * 0.0021);
  const zBliska = bok >= 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // nic nie wychodzi pod kwadrat (rękaw jest ucięty kadrem); promienie mogą trochę wyjść w bok i w górę
  ctx.beginPath(); ctx.rect(-10, -10, 120, 110); ctx.clip();
  // wierni idą pod rdzeń: za dłońmi tli się blask
  if (dosc) {
    const g = ctx.createRadialGradient(PROMIENIE.x, PROMIENIE.y, 4, PROMIENIE.x, PROMIENIE.y, 60);
    g.addColorStop(0, `rgba(240,200,120,${0.24 + 0.12 * tetno})`);
    g.addColorStop(1, 'rgba(240,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, 120, 110);
  }
  // promienie: blade przy małym oddaniu, złote, gdy wierni idą
  const promien = dosc ? `rgba(246,216,142,${(0.6 + 0.35 * tetno).toFixed(3)})` : `${tusz}${(0.22 + 0.45 * o).toFixed(3)})`;
  rysujPromienie(ctx, promien, (zBliska ? 1.2 : 1) / s, zBliska);
  // dłonie: ciemne, od dołu wzbiera złoto
  ctx.fillStyle = 'rgba(14,9,6,0.96)';
  ctx.fill(d.dlonie);
  const zalane = new Path2D();
  zalane.rect(-10, poziom, 120, 110);
  ctx.save();
  ctx.clip(d.dlonie);
  pigment(ctx, zalane, dosc ? FRESK.zloto : FRESK.ugier, 0.85, 'zloto');
  ctx.fillStyle = 'rgba(30,12,6,0.4)';
  ctx.fill(d.cien);
  // pod lustrem złota rysy malowane sinopią, nad nim — blady szkic na ciemnym
  ctx.lineWidth = (zBliska ? 0.9 : 0.7) / s;
  ctx.save(); ctx.clip(zalane);
  ctx.strokeStyle = 'rgba(70,22,12,0.85)'; ctx.stroke(d.rysy);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, 120, poziom + 10); ctx.clip();
  ctx.strokeStyle = `${tusz}0.32)`; ctx.stroke(d.rysy);
  ctx.restore();
  // lustro złota
  ctx.strokeStyle = 'rgba(255,236,186,0.95)';
  ctx.lineWidth = 1.2 / s;
  ctx.beginPath(); ctx.moveTo(-10, poziom); ctx.lineTo(110, poziom); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = dosc ? 'rgba(246,216,142,0.95)' : `${tusz}0.85)`;
  ctx.lineWidth = 1.1 / s;
  for (const b of d.bryly) ctx.stroke(b);
  // rękaw i mankiet: ciemne sukno i płótno, tylko kreską — złoto jest w dłoniach
  ctx.fillStyle = 'rgba(24,17,12,0.97)';
  ctx.fill(d.rekaw);
  ctx.fillStyle = 'rgba(44,34,25,0.97)';
  ctx.fill(d.mankiet);
  ctx.strokeStyle = `${tusz}0.5)`;
  ctx.lineWidth = (zBliska ? 0.8 : 0.6) / s;
  ctx.stroke(d.faldy);
  ctx.strokeStyle = `${tusz}0.8)`;
  ctx.lineWidth = 1 / s;
  ctx.stroke(d.rekaw);
  ctx.stroke(d.mankiet);
  // kreska progu pielgrzymki: w poprzek dłoni, żeby było widać, ile brakuje
  const progY = doY(prog);
  ctx.strokeStyle = dosc ? 'rgba(246,216,142,0.95)' : 'rgba(246,216,142,0.65)';
  ctx.lineWidth = 1 / s;
  ctx.setLineDash([2 / s, 2 / s]);
  ctx.beginPath(); ctx.moveTo(12, progY); ctx.lineTo(80, progY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
