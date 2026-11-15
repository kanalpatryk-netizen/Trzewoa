import type { Sim } from '../sim/sim';
import type { Camera } from './camera';
import { SURFACE_Y, type World } from '../sim/world';
import { SWIAT } from '../nastawy/swiat';
import { KATEDRA as K } from '../nastawy/katedra';
import { migotLampy } from './fresk';
import { wolnoRuszac } from './nastroj';

/**
 * KATEDRA (Alpha 0.2) — na powierzchni, nad szybem ze światłem, stoi katedra w przekroju, jak cała góra pod nią:
 * na zachodzie wieża z iglicą (z zewnątrz: przypory, portal, okno, dzwonnica, attyka z sterczynami), dalej nawa
 * (arkady do ciemnej nawy bocznej, tryforium, okna górne, żebra sklepienia, nad nimi dach), na wschodzie skrzyżowanie:
 * wielki łuk na tylnej ścianie, w nim ślepe arkady, trzy ostrołuki i rozeta — „górna szyba”, z której pada światło.
 * W posadzce skrzyżowania otwór szybu w balustradzie, po bokach dwa kandelabry; na kalenicy sygnaturka.
 * Kamień rysuje się przed mrokiem (ciemność go przygasza), szkło i płomienie — nad mrokiem; promień: render/promien.ts.
 * Nastawy: KATEDRA w src/nastawy/katedra.ts.
 */

const TUSZ = 'rgba(20,12,8,0.95)';

/** Gdzie stoi katedra: środek szybu ze światłem (kafle), ziemia, rozeta, otwór w posadzce i płomienie świec. */
export interface UkladKatedry {
  cx: number;
  g: number;
  /** Rząd posadzki (y kafli) — na cokole, odrobinę nad ziemią. */
  posadzka: number;
  /** Zachodni i wschodni brzeg całej budowli (x kafli, z przyporą i stopniami). */
  x0: number; x1: number;
  rozeta: { x: number; y: number; r: number };
  /** Otwór w posadzce — wylot szybu ze światłem (x kafli). */
  otwor: { x0: number; x1: number };
  plomienie: { x: number; y: number }[];
  /** Najwyższy punkt (krzyż na iglicy wieży) — y kafli. */
  szczyt: number;
}

/** Układ katedry nad szybem albo null (góra bez sali z ołtarzem albo katedra wyłączona). */
export function ukladKatedry(w: World): UkladKatedry | null {
  if (!K.wlaczona || w.salaOltarza.x1 < 0) return null;
  const cx = w.szybX + 0.5, g = SURFACE_Y, pol = SWIAT.warstwy.szyb / 2;
  const kd = K.kandelabry;
  return {
    cx, g,
    posadzka: g - K.posadzka,
    x0: cx + K.wieza.od - 0.7,
    x1: cx + K.skrzyzowanie.do + K.skrzyzowanie.sciana + K.skrzyzowanie.przypora,
    rozeta: { x: cx, y: g - K.rozeta.v, r: K.rozeta.r },
    otwor: { x0: cx - pol, x1: cx + pol },
    plomienie: [-1, 1].map((s) => ({ x: cx + s * kd.u, y: g - K.posadzka - kd.wys - 0.55 })),
    szczyt: g - (K.wieza.wys + K.wieza.iglica + 0.75),
  };
}

type Pt = [number, number];

/** Punkty ostrołuku (u, v): od nasady po lewej, przez wierzchołek, do nasady po prawej. */
function ostroluk(u0: number, u1: number, vS: number, h: number, n = 9): Pt[] {
  const s = u1 - u0, R = (s * s / 4 + h * h) / s;
  const fm = Math.acos(Math.max(-1, Math.min(1, (R - s / 2) / R)));
  const p: Pt[] = [];
  for (let i = 0; i <= n; i++) { const f = (fm * i) / n; p.push([u0 + R - R * Math.cos(f), vS + R * Math.sin(f)]); }
  for (let i = n - 1; i >= 0; i--) { const f = (fm * i) / n; p.push([u1 - R + R * Math.cos(f), vS + R * Math.sin(f)]); }
  return p;
}

/** Wzory kreskowania (ukośne linie co `odstep` pikseli), przypięte do świata, żeby nie pływały z kamerą. */
const wzory = new Map<string, CanvasPattern>();
function kreskowanie(ctx: CanvasRenderingContext2D, kolor: string, odstep: number, ox: number, oy: number): CanvasPattern | string {
  const klucz = `${kolor}|${odstep}`;
  let p = wzory.get(klucz);
  if (!p) {
    const c = document.createElement('canvas');
    c.width = c.height = odstep;
    const g = c.getContext('2d')!;
    g.strokeStyle = kolor; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-1, odstep + 1); g.lineTo(odstep + 1, -1); g.moveTo(-1, 1); g.lineTo(1, -1);
    g.moveTo(odstep - 1, odstep + 1); g.lineTo(odstep + 1, odstep - 1); g.stroke();
    const np = ctx.createPattern(c, 'repeat');
    if (!np) return kolor;
    wzory.set(klucz, (p = np));
  }
  if (typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([1, 0, 0, 1, ox % odstep, oy % odstep]));
  return p;
}

/** Pióro: rysunek w układzie katedry (u, v) — na ekran przelicza kamera. */
class Pioro {
  constructor(readonly ctx: CanvasRenderingContext2D, readonly X: (u: number) => number, readonly Y: (v: number) => number, readonly z: number) {}
  /** Ścieżka wielokąta z punktów (u, v). */
  wielokat(p: Pt[]): void {
    const { ctx } = this;
    ctx.beginPath();
    p.forEach(([u, v], i) => (i ? ctx.lineTo(this.X(u), this.Y(v)) : ctx.moveTo(this.X(u), this.Y(v))));
    ctx.closePath();
  }
  prost(u0: number, v0: number, u1: number, v1: number): void {
    this.ctx.beginPath();
    this.ctx.rect(this.X(u0), this.Y(v1), (u1 - u0) * this.z, (v1 - v0) * this.z);
  }
  /** Okno ostrołukowe: od parapetu `vD` do nasady łuku `vS`, wierzchołek `h` nad nasadą. */
  okno(u0: number, u1: number, vD: number, vS: number, h: number): void {
    this.wielokat([[u0, vD], ...ostroluk(u0, u1, vS, h), [u1, vD]]);
  }
  linia(p: Pt[], kolor: string, grub: number): void {
    const { ctx } = this;
    ctx.strokeStyle = kolor; ctx.lineWidth = grub;
    ctx.beginPath();
    p.forEach(([u, v], i) => (i ? ctx.lineTo(this.X(u), this.Y(v)) : ctx.moveTo(this.X(u), this.Y(v))));
    ctx.stroke();
  }
  /** Bieżąca ścieżka: wypełnij, przykryj kreskowaniem i obwiedź tuszem. */
  maluj(fill: string | CanvasGradient, kreski?: CanvasPattern | string, obwodka = true): void {
    const { ctx } = this;
    ctx.fillStyle = fill; ctx.fill();
    if (kreski) { ctx.fillStyle = kreski; ctx.fill(); }
    if (obwodka) { ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.7, this.z * 0.05); ctx.stroke(); }
  }
  /** Pionowy gradient między wysokościami v0 (dół) i v1 (góra). */
  pion(v0: number, v1: number, dol: string, gora: string): CanvasGradient {
    const g = this.ctx.createLinearGradient(0, this.Y(v0), 0, this.Y(v1));
    g.addColorStop(0, dol); g.addColorStop(1, gora);
    return g;
  }
}

/** Czy katedra jest w kadrze (z zapasem). */
function widac(cam: Camera, k: UkladKatedry): boolean {
  const z = cam.zoom;
  return cam.toScreenX(k.x1) > -z * 2 && cam.toScreenX(k.x0) < cam.vw + z * 2 && cam.toScreenY(k.szczyt) < cam.vh + z && cam.toScreenY(k.g + 1) > -z;
}

/** Gotowy rysunek kamienia: płótno w skali ekranu, dla jakiego przybliżenia i świata (kamień się nie rusza). */
let odbitka: { c: HTMLCanvasElement; z: number; skala: number; swiat: World } | null = null;

/**
 * Kamień katedry — przed mrokiem. Stoi w miejscu, więc rysuje się raz na przybliżenie do osobnego płótna, a w każdej
 * klatce tylko się je przykleja (z kreską i cieniowaniem kosztował kilka milisekund na klatkę).
 */
export function rysujKatedre(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera): void {
  const k = ukladKatedry(sim.world);
  if (!k || !widac(cam, k) || typeof document === 'undefined') return;
  const z = cam.zoom;
  const x0 = k.x0 - 1, x1 = k.x1 + 1, y0 = k.szczyt - 1, y1 = k.g + 0.6;
  // płótno w skali ekranu, ale najwyżej ok. 4 mln pikseli (wielki ekran z bliska: ostrzej nie trzeba)
  const t = ctx.getTransform();
  const skala = Math.min(Math.hypot(t.a, t.b) || 1, Math.sqrt(4e6 / ((x1 - x0) * (y1 - y0) * z * z)));
  if (!odbitka || odbitka.z !== z || odbitka.skala !== skala || odbitka.swiat !== sim.world) {
    const c = odbitka?.c ?? document.createElement('canvas');
    c.width = Math.ceil((x1 - x0) * z * skala); c.height = Math.ceil((y1 - y0) * z * skala);
    const g = c.getContext('2d')!;
    g.setTransform(skala, 0, 0, skala, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    kamien(g, k, (u) => (k.cx + u - x0) * z, (v) => (k.g - v - y0) * z, z);
    odbitka = { c, z, skala, swiat: sim.world };
  }
  ctx.drawImage(odbitka.c, cam.toScreenX(x0), cam.toScreenY(y0), (x1 - x0) * z, (y1 - y0) * z);
}

/** Rysunek kamienia katedry: `X`, `Y` — piksele dla (u, v) układu katedry. */
function kamien(ctx: CanvasRenderingContext2D, k: UkladKatedry, X: (u: number) => number, Y: (v: number) => number, z: number): void {
  const p = new Pioro(ctx, X, Y, z);
  const odstep = Math.max(3, Math.round(z * 0.24));
  const kreskiCiete = kreskowanie(ctx, 'rgba(26,16,10,0.55)', odstep, p.X(0), p.Y(0));
  const kreskiCien = kreskowanie(ctx, 'rgba(22,14,10,0.42)', odstep + 1, p.X(0), p.Y(0));
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const cienka = Math.max(0.6, z * 0.035), gruba = Math.max(0.8, z * 0.055);
  const N = K.nawa, S = K.skrzyzowanie, W = K.wieza, D = K.dach, pos = K.posadzka;
  const wsch = S.do + S.sciana;
  /** Nasada żeber sklepienia: tu kończą się filary nawy. */
  const zebro = N.sklepienie - 1.7;

  // ---------------------------------------------------------------- tylna ściana nawy i skrzyżowania
  p.prost(N.od, pos, S.do, N.sklepienie + 0.05);
  p.maluj(p.pion(pos, N.sklepienie, 'rgba(108,95,80,1)', 'rgba(62,55,50,1)'), undefined, false);
  // spoiny ciosów na tylnej ścianie (otwory, filary i okna przykryją je niżej)
  ctx.strokeStyle = 'rgba(30,20,14,0.2)'; ctx.lineWidth = cienka;
  ctx.beginPath();
  for (let v = pos + 0.55, n = 0; v < N.sklepienie; v += 0.55, n++) {
    ctx.moveTo(p.X(N.od), p.Y(v)); ctx.lineTo(p.X(S.do), p.Y(v));
    for (let u = N.od + (n % 2 ? 0.62 : 0.1); u < S.do; u += 1.24) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v - 0.55)); }
  }
  ctx.stroke();
  // pod sklepieniem ciemnieje — kreska gęstnieje ku górze
  p.prost(N.od, N.okna[0] - 0.5, S.do, N.sklepienie);
  p.maluj(p.pion(N.okna[0] - 0.5, N.sklepienie, 'rgba(20,14,10,0)', 'rgba(20,14,10,0.35)'), undefined, false);
  // nawa: arkady do nawy bocznej (w głębi ciemno, małe okno), tryforium, okna górne, żebra
  for (let u = N.od; u < N.do - 0.01; u += N.przeslo) {
    const a = u + N.filar / 2, b = u + N.przeslo - N.filar / 2, m = u + N.przeslo / 2;
    const [vA, vW] = N.arkada;
    p.okno(a, b, pos, vA, vW - vA);
    p.maluj(p.pion(pos, vW, 'rgba(46,39,34,1)', 'rgba(28,23,20,1)'), kreskiCien);
    // okno nawy bocznej w głębi i cień jej sklepienia
    p.okno(m - 0.38, m + 0.38, 1.3, 3.1, 0.7);
    p.maluj('rgba(40,44,56,1)');
    p.linia([[m, 1.3], [m, 3.5]], 'rgba(20,12,8,0.7)', cienka);
    // archiwolta: druga linia nad łukiem
    p.linia(ostroluk(a - 0.12, b + 0.12, vA, vW - vA + 0.16), 'rgba(30,20,14,0.8)', cienka);
    // tryforium: trzy małe łuki w pasie pod oknami
    const [t0, t1] = N.tryforium;
    p.prost(a, t0 - 0.08, b, t0); p.maluj('rgba(70,60,52,1)', undefined, false);
    for (let i = -1; i <= 1; i++) {
      p.okno(m + i * 1.0 - 0.3, m + i * 1.0 + 0.3, t0 + 0.05, t0 + 0.42, t1 - t0 - 0.47);
      p.maluj('rgba(30,25,22,1)');
    }
    // okno górne: dwa ostrołuki pod jednym łukiem, w głowicy oculus (szkło — nad mrokiem)
    const [o0, o1] = N.okna;
    p.okno(m - 1.0, m + 1.0, o0, o1 - 1.0, 1.0);
    p.maluj('rgba(38,42,54,1)');
    p.linia([[m, o0], [m, o1 - 0.75]], TUSZ, gruba);
    // żebro przyścienne nad oknem i żebra przekątne ku zwornikowi
    p.linia(ostroluk(a, b, zebro, 1.65), 'rgba(34,24,18,0.85)', gruba);
    p.linia([[a, zebro], [a + 0.6, N.sklepienie - 0.25], [m, N.sklepienie]], 'rgba(34,24,18,0.6)', cienka);
    p.linia([[b, zebro], [b - 0.6, N.sklepienie - 0.25], [m, N.sklepienie]], 'rgba(34,24,18,0.6)', cienka);
  }
  // filary nawy: wiązki służek od bazy do sklepienia, głowice pod arkadą i pod żebrami
  for (let u = N.od; u <= N.do + 0.01; u += N.przeslo) {
    const sk = u === N.do ? 1 : u === N.od ? 0.6 : 1;
    const f = (N.filar / 2) * (u === N.do ? 1.45 : 1) * sk;
    const g = ctx.createLinearGradient(p.X(u - f), 0, p.X(u + f), 0);
    g.addColorStop(0, 'rgba(122,108,92,1)'); g.addColorStop(0.55, 'rgba(96,85,73,1)'); g.addColorStop(1, 'rgba(66,58,51,1)');
    p.prost(u - f, pos, u + f, zebro); p.maluj(g);
    p.linia([[u - f * 0.35, pos + 0.4], [u - f * 0.35, zebro]], 'rgba(30,20,14,0.5)', cienka);
    p.linia([[u + f * 0.35, pos + 0.4], [u + f * 0.35, zebro]], 'rgba(30,20,14,0.5)', cienka);
    p.prost(u - f - 0.12, pos, u + f + 0.12, pos + 0.38); p.maluj('rgba(104,92,80,1)');
    p.prost(u - f - 0.16, N.arkada[0] - 0.2, u + f + 0.16, N.arkada[0] + 0.08); p.maluj('rgba(118,104,88,1)');
    p.prost(u - f - 0.08, zebro - 0.16, u + f + 0.08, zebro); p.maluj('rgba(106,94,82,1)');
  }

  // skrzyżowanie: wielki łuk na tylnej ścianie (w nim ściana transeptu — głębiej, ciemniej)
  const [lS, lW] = S.luk;
  const lA = S.od + 0.55, lB = -lA;
  p.okno(lA, lB, pos, lS, lW - lS);
  p.maluj(p.pion(pos, lW, 'rgba(98,86,72,1)', 'rgba(56,50,46,1)'));
  for (const d of [0.16, 0.32]) p.linia(ostroluk(lA - d, lB + d, lS, lW - lS + d * 1.3), 'rgba(30,20,14,0.75)', cienka);
  // ślepe arkady u dołu ściany transeptu
  const sa = 5, saW = (lB - lA - 0.5) / sa;
  for (let i = 0; i < sa; i++) {
    const a = lA + 0.25 + i * saW;
    p.okno(a + 0.08, a + saW - 0.08, pos + 0.15, pos + 1.2, 0.6);
    p.maluj('rgba(74,64,56,1)', kreskiCien);
  }
  // trzy ostrołuki nad nimi (szkło — nad mrokiem)
  for (const du of [-2, 0, 2]) { p.okno(du - 0.45, du + 0.45, 2.6, 4.8, 0.95); p.maluj('rgba(38,42,54,1)'); }
  // obramienie rozety: kamienny pierścień z wałkiem (szkło i maswerk — nad mrokiem)
  const R = K.rozeta;
  ctx.beginPath(); ctx.arc(p.X(0), p.Y(R.v), R.r * z, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(92,82,72,1)'; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = gruba; ctx.stroke();
  ctx.beginPath(); ctx.arc(p.X(0), p.Y(R.v), (R.r - 0.25) * z, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(38,42,54,1)'; ctx.fill(); ctx.stroke();
  // żebra sklepienia skrzyżowania
  p.linia([[S.od + 0.5, lW - 0.2], [-1.6, N.sklepienie - 0.2], [0, N.sklepienie]], 'rgba(34,24,18,0.6)', cienka);
  p.linia([[S.do, lW - 0.2], [1.6, N.sklepienie - 0.2], [0, N.sklepienie]], 'rgba(34,24,18,0.6)', cienka);

  // ---------------------------------------------------------------- przekrój: posadzka, sklepienie, wschodnia ściana
  const pol = (k.otwor.x1 - k.otwor.x0) / 2;
  for (const [a, b] of [[N.od, -pol], [pol, wsch]] as Pt[]) { p.prost(a, 0, b, pos); p.maluj('rgba(84,72,60,1)', kreskiCiete); }
  // sklepienie przecięte w kluczu: cienki pas, w każdym przęśle lekko wybrzuszony
  const sklep: Pt[] = [];
  for (let u = N.od; u <= S.do + 0.01; u += 0.5) {
    const f = ((u - N.od) % N.przeslo) / N.przeslo;
    sklep.push([u, N.sklepienie + 0.05 * Math.sin(f * Math.PI)]);
  }
  p.wielokat([...sklep, [S.do, D.okap], [N.od, D.okap]]);
  p.maluj('rgba(84,72,60,1)', kreskiCiete);
  // wschodnia ściana i przypora za nią (przypora z uskokami, na niej sterczyna)
  p.prost(S.do, 0, wsch, D.okap); p.maluj('rgba(84,72,60,1)', kreskiCiete);
  const pr = S.przypora;
  p.wielokat([[wsch, 0], [wsch + pr, 0], [wsch + pr, 3.4], [wsch + pr * 0.7, 3.9], [wsch + pr * 0.7, 7.2], [wsch + pr * 0.45, 7.7], [wsch + pr * 0.45, 9.4], [wsch, 9.4]]);
  p.maluj(p.pion(0, 9.4, 'rgba(86,78,70,1)', 'rgba(70,64,60,1)'));
  sterczyna(p, wsch + pr * 0.22, 9.4, 0.5, 2.4);

  // ---------------------------------------------------------------- dach: ołów w pasach, okap z konsolkami, grzebień
  p.prost(N.od, D.okap, wsch, D.kalenica);
  p.maluj(p.pion(D.okap, D.kalenica, 'rgba(58,58,64,1)', 'rgba(78,78,86,1)'));
  for (let v = D.okap + 0.3, n = 0; v < D.kalenica - 0.1; v += 0.3, n++) {
    p.linia([[N.od, v], [wsch, v]], 'rgba(26,24,30,0.55)', cienka);
    // zakładki blach: krótkie pionowe styki, co rząd przesunięte
    ctx.strokeStyle = 'rgba(26,24,30,0.4)'; ctx.lineWidth = cienka;
    ctx.beginPath();
    for (let u = N.od + (n % 2 ? 0.45 : 0.05); u < wsch; u += 0.9) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v + 0.3)); }
    ctx.stroke();
  }
  p.linia([[N.od, D.kalenica - 0.06], [wsch, D.kalenica - 0.06]], 'rgba(170,166,176,0.35)', gruba);
  p.prost(N.od, D.okap - 0.12, wsch + 0.1, D.okap + 0.05); p.maluj('rgba(96,86,76,1)');
  ctx.fillStyle = 'rgba(70,62,56,1)';
  for (let u = N.od + 0.25; u < wsch; u += 0.55) { p.prost(u, D.okap - 0.3, u + 0.2, D.okap - 0.12); ctx.fill(); }
  // grzebień na kalenicy: drobne lilijki
  ctx.fillStyle = 'rgba(66,64,72,1)'; ctx.strokeStyle = TUSZ; ctx.lineWidth = cienka;
  for (let u = N.od + 0.6; u < wsch - 0.3; u += 0.8) {
    if (Math.abs(u) < 0.9) continue;
    p.wielokat([[u - 0.1, D.kalenica], [u - 0.13, D.kalenica + 0.18], [u, D.kalenica + 0.36], [u + 0.13, D.kalenica + 0.18], [u + 0.1, D.kalenica]]);
    ctx.fill(); ctx.stroke();
  }
  krzyz(p, wsch - 0.05, D.kalenica, 0.55);
  // sygnaturka nad skrzyżowaniem: ośmioboczna latarnia z prześwitami, iglica z żabkami, krzyż
  const SG = K.sygnaturka, l0 = D.kalenica, l1 = l0 + SG.latarnia;
  p.prost(-0.55, l0, 0.55, l1); p.maluj(p.pion(l0, l1, 'rgba(70,68,74,1)', 'rgba(86,84,92,1)'));
  for (const du of [-0.24, 0.24]) { p.okno(du - 0.12, du + 0.12, l0 + 0.25, l1 - 0.45, 0.25); p.maluj('rgba(24,22,26,1)'); }
  iglica(p, 0, l1, 0.62, SG.iglica, 'rgba(74,72,80,1)', 'rgba(52,50,58,1)');
  krzyz(p, 0, l1 + SG.iglica, 0.6);

  // ---------------------------------------------------------------- wieża zachodnia (z zewnątrz)
  const a = W.od, b = W.do, mw = (a + b) / 2;
  p.prost(a, 0, b, W.wys);
  p.maluj(p.pion(0, W.wys, 'rgba(84,76,68,1)', 'rgba(104,96,88,1)'));
  // spoiny ciosów: rzędy co 0,5 kafla, styki na zakładkę
  ctx.strokeStyle = 'rgba(30,20,14,0.28)'; ctx.lineWidth = cienka;
  ctx.beginPath();
  for (let v = 0.5, n = 0; v < W.wys; v += 0.5, n++) {
    ctx.moveTo(p.X(a), p.Y(v)); ctx.lineTo(p.X(b), p.Y(v));
    for (let u = a + (n % 2 ? 0.55 : 0.15); u < b; u += 1.1) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v + 0.5)); }
  }
  ctx.stroke();
  // przypory narożne z uskokami
  for (const [x0, x1, cien] of [[a, a + 0.8, true], [b - 0.8, b, false]] as [number, number, boolean][]) {
    const wew = cien ? x1 : x0, zew = cien ? x0 : x1, s = cien ? 1 : -1;
    const u1 = W.wys * 0.32, u2 = W.wys * 0.64;
    p.wielokat([[zew, 0], [wew, 0], [wew, u1], [wew - s * 0.2, u1 + 0.3], [wew - s * 0.2, u2], [wew - s * 0.35, u2 + 0.3], [wew - s * 0.35, W.wys], [zew, W.wys]]);
    p.maluj(cien ? 'rgba(70,63,57,1)' : 'rgba(112,102,92,1)', cien ? kreskiCien : undefined);
  }
  // gzymsy między kondygnacjami
  for (const f of [0.33, 0.66, 0.9]) { const v = W.wys * f; p.prost(a, v - 0.16, b, v); p.maluj('rgba(118,108,96,1)'); p.linia([[a, v - 0.19], [b, v - 0.19]], 'rgba(20,12,8,0.6)', cienka); }
  // portal: archiwolty w uskokach, w głębi drzwi z okuciami
  for (let i = 0; i < 3; i++) {
    const d = 0.5 - i * 0.22;
    p.okno(mw - 1.0 - d, mw + 1.0 + d, pos, 2.5, 1.25 + d * 0.9);
    p.maluj(i === 0 ? 'rgba(78,70,62,1)' : i === 1 ? 'rgba(66,59,53,1)' : 'rgba(54,48,44,1)');
  }
  p.okno(mw - 0.95, mw + 0.95, pos, 2.4, 1.15); p.maluj('rgba(56,38,24,1)');
  p.linia([[mw, pos], [mw, 3.5]], 'rgba(20,12,8,0.8)', gruba);
  for (const v of [1.0, 2.0]) p.linia([[mw - 0.9, v], [mw + 0.9, v]], 'rgba(30,28,30,0.85)', gruba);
  // okno środkowej kondygnacji i dzwonnica z żaluzjami
  const okW = W.wys * 0.39, okS = W.wys * 0.55, dzW = W.wys * 0.69, dzS = W.wys * 0.82;
  p.okno(mw - 0.6, mw + 0.6, okW, okS, 1.1); p.maluj('rgba(38,42,54,1)');
  p.linia([[mw, okW], [mw, okS + 0.6]], TUSZ, gruba);
  for (const du of [-1.05, 1.05]) {
    p.okno(mw + du - 0.55, mw + du + 0.55, dzW, dzS, 0.85); p.maluj('rgba(26,22,22,1)');
    for (let v = dzW + 0.25; v < dzS + 0.1; v += 0.28) p.linia([[mw + du - 0.5, v], [mw + du + 0.5, v + 0.14]], 'rgba(96,80,62,0.75)', cienka);
  }
  ctx.beginPath(); ctx.arc(p.X(mw), p.Y(W.wys * 0.955), 0.42 * z, 0, Math.PI * 2); p.maluj('rgba(40,36,36,1)');
  // attyka z czworolistnymi prześwitami i sterczyny na narożach
  p.prost(a - 0.1, W.wys, b + 0.1, W.wys + 0.55); p.maluj('rgba(104,96,86,1)');
  for (let u = a + 0.75; u < b - 0.5; u += 0.75) { ctx.beginPath(); ctx.arc(p.X(u), p.Y(W.wys + 0.27), 0.15 * z, 0, Math.PI * 2); p.maluj('rgba(30,26,26,1)'); }
  // iglica: ośmioboczna — w kadrze trzy połacie, krawędzie z żabkami, lukarny, opaski
  iglica(p, mw, W.wys + 0.45, (b - a) * 0.3, W.iglica, 'rgba(80,78,86,1)', 'rgba(56,54,62,1)');
  for (const du of [-1, 1]) { p.okno(mw + du * 0.42 - 0.15, mw + du * 0.42 + 0.15, W.wys + 1.0, W.wys + 1.32, 0.3); p.maluj('rgba(24,22,26,1)'); }
  krzyz(p, mw, W.wys + 0.45 + W.iglica, 0.75);
  for (const u of [a + 0.4, b - 0.4]) sterczyna(p, u, W.wys + 0.55, 0.55, 2.3);
  // stopnie przed portalem
  p.prost(a - 0.7, 0, a, 0.2); p.maluj('rgba(96,86,76,1)');
  p.prost(a - 0.35, 0.2, a, pos); p.maluj('rgba(104,94,82,1)');

  // ---------------------------------------------------------------- otwór w posadzce: balustrada i kandelabry
  const B = K.balustrada;
  p.prost(-pol - B.bok, pos, pol + B.bok, pos + B.wys - 0.14);
  p.maluj(p.pion(pos, pos + B.wys, 'rgba(98,88,76,1)', 'rgba(118,106,92,1)'));
  for (let i = 0; i < 6; i++) {
    const u = -pol - B.bok + 0.42 + i * ((2 * (pol + B.bok) - 0.84) / 5);
    p.okno(u - 0.14, u + 0.14, pos + 0.18, pos + B.wys - 0.48, 0.18); p.maluj('rgba(36,30,26,1)');
  }
  p.prost(-pol - B.bok - 0.06, pos + B.wys - 0.14, pol + B.bok + 0.06, pos + B.wys); p.maluj('rgba(126,114,98,1)');
  for (const [u0, u1] of [[-pol - B.bok, -pol], [pol, pol + B.bok]] as Pt[]) { p.prost(u0, pos, u1, pos + B.wys); p.maluj('rgba(84,72,60,1)', kreskiCiete); }
  const KD = K.kandelabry;
  for (const s of [-1, 1]) {
    const u = s * KD.u, top = pos + KD.wys;
    p.wielokat([[u - 0.35, pos], [u, pos + 0.32], [u + 0.35, pos]]); p.maluj('rgba(44,40,40,1)');
    p.linia([[u, pos + 0.3], [u, top]], 'rgba(36,32,34,1)', Math.max(1, z * 0.08));
    for (const v of [pos + 0.9, pos + 1.6]) { ctx.beginPath(); ctx.ellipse(p.X(u), p.Y(v), 0.11 * z, 0.07 * z, 0, 0, Math.PI * 2); p.maluj('rgba(52,48,48,1)'); }
    p.prost(u - 0.24, top, u + 0.24, top + 0.08); p.maluj('rgba(60,54,52,1)');
    p.prost(u - 0.07, top + 0.08, u + 0.07, top + 0.45); p.maluj('rgba(214,204,182,1)');
  }
  ctx.restore();
}

/** Iglica: wysoki trójkąt z trzema połaciami (środkowa jaśniejsza), żabki na krawędziach, opaski. */
function iglica(p: Pioro, u: number, v0: number, pol: number, wys: number, jasna: string, ciemna: string): void {
  const { ctx, z } = p;
  const top: Pt = [u, v0 + wys];
  p.wielokat([[u - pol, v0], [u + pol, v0], top]); p.maluj(ciemna);
  p.wielokat([[u - pol * 0.42, v0], [u + pol * 0.42, v0], top]); p.maluj(jasna, undefined, false);
  p.linia([[u - pol * 0.42, v0], top, [u + pol * 0.42, v0]], 'rgba(20,12,8,0.6)', Math.max(0.6, z * 0.03));
  for (const f of [0.3, 0.6]) {
    const v = v0 + wys * f, s = pol * (1 - f);
    p.linia([[u - s, v], [u + s, v]], 'rgba(150,146,156,0.45)', Math.max(0.6, z * 0.04));
  }
  // żabki: drobne haczyki na obu krawędziach
  ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.max(0.6, z * 0.035);
  ctx.beginPath();
  for (let f = 0.12; f < 0.92; f += 0.13) {
    const v = v0 + wys * f, s = pol * (1 - f);
    for (const k of [-1, 1]) {
      ctx.moveTo(p.X(u + k * s), p.Y(v));
      ctx.quadraticCurveTo(p.X(u + k * (s + 0.2)), p.Y(v + 0.05), p.X(u + k * (s + 0.12)), p.Y(v + 0.22));
    }
  }
  ctx.stroke();
}

/** Sterczyna: smukły słupek z daszkiem i kwiatonem. */
function sterczyna(p: Pioro, u: number, v0: number, sz: number, wys: number): void {
  const h1 = wys * 0.45;
  p.prost(u - sz / 2, v0, u + sz / 2, v0 + h1); p.maluj('rgba(96,88,80,1)');
  p.wielokat([[u - sz / 2 - 0.05, v0 + h1], [u + sz / 2 + 0.05, v0 + h1], [u, v0 + wys]]); p.maluj('rgba(76,72,72,1)');
  const { ctx, z } = p;
  ctx.beginPath(); ctx.arc(p.X(u), p.Y(v0 + wys + 0.08), Math.max(1, 0.09 * z), 0, Math.PI * 2); p.maluj('rgba(88,82,78,1)');
}

/** Żelazny krzyż na szczycie. */
function krzyz(p: Pioro, u: number, v0: number, wys: number): void {
  const g = Math.max(1, p.z * 0.07);
  p.linia([[u, v0], [u, v0 + wys]], 'rgba(36,32,32,1)', g);
  p.linia([[u - wys * 0.28, v0 + wys * 0.68], [u + wys * 0.28, v0 + wys * 0.68]], 'rgba(36,32,32,1)', g);
}

/** Szkło witraży w rozecie: sektor pierścienia (r0–r1, kąty a0–a1) w barwie. */
function sektor(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, a0: number, a1: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r1, a0, a1);
  ctx.arc(x, y, r0, a1, a0, true);
  ctx.closePath();
}

/** Barwy witraży rozety — głębokie, jak szkło z ołowiem pod światło, nie jak malowanka. */
const WITRAZ = {
  zloto: [222, 164, 66], rubin: [168, 32, 42], blekit: [42, 76, 170], zielen: [40, 118, 76], fiolet: [102, 54, 140],
};

/**
 * Nad mrokiem: rozeta (witraże świecą, maswerk na nich ciemny, wokół ciepła łuna), szkło okien górnych, nawy bocznej
 * i transeptu (przygaszony zmierzch) i płomienie świec na kandelabrach.
 */
export function rysujKatedreNad(ctx: CanvasRenderingContext2D, sim: Sim, cam: Camera, teraz: number): void {
  const k = ukladKatedry(sim.world);
  if (!k || !widac(cam, k)) return;
  const z = cam.zoom;
  const p = new Pioro(ctx, (u) => cam.toScreenX(k.cx + u), (v) => cam.toScreenY(k.g - v), z);
  const ruch = wolnoRuszac();
  const N = K.nawa, R = K.rozeta;
  ctx.save();
  ctx.lineJoin = 'round';
  // zmierzch w oknach: ledwie jaśniejszy od kamienia, chłodny
  ctx.fillStyle = 'rgba(84,96,134,0.28)';
  for (let u = N.od; u < N.do - 0.01; u += N.przeslo) {
    const m = u + N.przeslo / 2, [o0, o1] = N.okna;
    for (const s of [-1, 1]) { p.okno(m + s * 0.5 - 0.38, m + s * 0.5 + 0.38, o0 + 0.12, o1 - 1.05, 0.62); ctx.fill(); }
    ctx.beginPath(); ctx.arc(p.X(m), p.Y(o1 - 0.42), 0.22 * z, 0, Math.PI * 2); ctx.fill();
    p.okno(m - 0.3, m + 0.3, 1.45, 3.05, 0.55); ctx.fill();
  }
  p.okno(K.wieza.od + 2.45, K.wieza.do - 2.45, K.wieza.wys * 0.39 + 0.1, K.wieza.wys * 0.55, 0.95); ctx.fill();
  // trzy ostrołuki transeptu: jaśniej niż nawa — za nimi to samo niebo, co za rozetą
  ctx.fillStyle = 'rgba(150,140,170,0.5)';
  for (const du of [-2, 0, 2]) { p.okno(du - 0.36, du + 0.36, 2.7, 4.8, 0.85); ctx.fill(); }

  // rozeta: środek — złote oculus, wewnętrzny pierścień — osiem płatków, zewnętrzny — szesnaście pól z kołami
  const x = p.X(0), y = p.Y(R.v), r = (R.r - 0.25) * z;
  const migot = ruch ? 0.97 + 0.03 * migotLampy(teraz * 0.3 + 917) : 1;
  const r1 = r * 0.24, r2 = r * 0.56;
  const barwa = (c: number[], jas: number) => `rgba(${Math.round(c[0] * jas)},${Math.round(c[1] * jas)},${Math.round(c[2] * jas)},0.98)`;
  const zew = [WITRAZ.blekit, WITRAZ.rubin, WITRAZ.blekit, WITRAZ.zielen, WITRAZ.blekit, WITRAZ.rubin, WITRAZ.blekit, WITRAZ.fiolet];
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 16) * Math.PI * 2 - Math.PI / 2;
    sektor(ctx, x, y, r2, r, a0, a1);
    ctx.fillStyle = barwa(zew[i % 8], migot); ctx.fill();
  }
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2 - Math.PI / 2, rr = (r2 + r) / 2 + r * 0.04;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.115, 0, Math.PI * 2);
    ctx.fillStyle = barwa(i % 2 ? WITRAZ.zloto : WITRAZ.rubin, migot); ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 16, a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 16;
    sektor(ctx, x, y, r1, r2, a0, a1);
    ctx.fillStyle = barwa(i % 2 ? WITRAZ.zloto : WITRAZ.rubin, 0.95 * migot); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2); ctx.fillStyle = barwa(WITRAZ.zloto, 1.12 * migot); ctx.fill();
  // ołów: drobne kreski w polach szkła
  ctx.strokeStyle = 'rgba(20,14,12,0.6)'; ctx.lineWidth = Math.max(0.5, z * 0.025);
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 - Math.PI / 2 + Math.PI / 32;
    ctx.moveTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.lineTo(x + Math.cos(a) * (r2 + (r - r2) * 0.42), y + Math.sin(a) * (r2 + (r - r2) * 0.42));
  }
  ctx.moveTo(x + (r1 + r2) / 2, y); ctx.arc(x, y, (r1 + r2) / 2, 0, Math.PI * 2);
  ctx.stroke();
  // światło za szkłem: jaśniej ku środkowi
  const swiatlo = ctx.createRadialGradient(x, y, 0, x, y, r);
  swiatlo.addColorStop(0, 'rgba(255,236,190,0.32)'); swiatlo.addColorStop(0.55, 'rgba(255,220,160,0.1)'); swiatlo.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = swiatlo; ctx.fill();
  ctx.restore();
  // maswerk: kamienne pierścienie i szprychy — ciemny brzeg, jaśniejsze lico
  const pret = (szer: number, sciezka: () => void): void => {
    ctx.strokeStyle = 'rgba(24,18,14,0.97)'; ctx.lineWidth = Math.max(1.2, z * szer); ctx.beginPath(); sciezka(); ctx.stroke();
    ctx.strokeStyle = 'rgba(92,80,68,0.95)'; ctx.lineWidth = Math.max(0.5, z * szer * 0.42); ctx.beginPath(); sciezka(); ctx.stroke();
  };
  pret(0.1, () => ctx.arc(x, y, r1, 0, Math.PI * 2));
  pret(0.1, () => ctx.arc(x, y, r2, 0, Math.PI * 2));
  pret(0.08, () => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2, od = i % 2 ? r2 : r1;
      ctx.moveTo(x + Math.cos(a) * od, y + Math.sin(a) * od); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  });
  pret(0.05, () => {
    for (let i = 0; i < 16; i++) {
      const a = ((i + 0.5) / 16) * Math.PI * 2 - Math.PI / 2, rr = (r2 + r) / 2 + r * 0.04;
      ctx.moveTo(x + Math.cos(a) * rr + r * 0.115, y + Math.sin(a) * rr); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.115, 0, Math.PI * 2);
    }
  });
  pret(0.12, () => ctx.arc(x, y, r, 0, Math.PI * 2));
  // łuna wokół rozety — ciepła, w mroku katedry
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R2 = R.r * z * 2.1;
  const luna = ctx.createRadialGradient(x, y, r * 0.8, x, y, R2);
  luna.addColorStop(0, `rgba(255,214,150,${0.2 * migot})`); luna.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = luna; ctx.fillRect(x - R2, y - R2, R2 * 2, R2 * 2);
  ctx.restore();

  // płomienie świec
  for (const f of k.plomienie) plomien(ctx, cam.toScreenX(f.x), cam.toScreenY(f.y), z, teraz + f.x * 311, ruch);
  ctx.restore();
}

/** Płomień świecy z poświatą. */
function plomien(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, teraz: number, ruch: boolean): void {
  const drg = ruch ? migotLampy(teraz) : 0.5;
  const h = z * (0.3 + 0.06 * drg), s = z * 0.09;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const R = z * 1.1;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,190,110,${0.3 + 0.1 * drg})`); g.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,214,140,0.95)';
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + s * 1.2, y - h * 0.25, x, y + h * 0.25);
  ctx.quadraticCurveTo(x - s * 1.2, y - h * 0.25, x, y - h);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,230,0.95)';
  ctx.beginPath(); ctx.ellipse(x, y + h * 0.02, s * 0.4, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
}
