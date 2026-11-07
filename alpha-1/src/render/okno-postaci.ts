/**
 * Okno postaci (Alpha 1): po zaznaczeniu postaci (albo grupy) w lewym dolnym rogu płyty staje kamienna tablica —
 * imię (albo „Robotnicy”, „Oddział”) i role, portret w złotej niszy z paskami życia i sytości, zamiarem i stanami
 * (dla grupy — wszyscy w jednej niszy), a pod spodem „możliwości”: Cud, Módl się, Do ołtarza, Kop drogę wiernych,
 * praca w warsztacie i kuźni, zbroja, sen, naprawa liny. Zastępuje ryty po lewej (na komputerze).
 * Placeholder rysowany w kodzie. Zwraca pola do kliknięcia.
 */
import type { Plate } from './plate';
import type { Prostokat } from './przyciski';
import { SERIF, SERIF_TYTUL } from './ink';
import { panelKamien } from './panele';
import { pigment } from './fresk';
import { FRESK } from '../nastawy/barwy';
import { zlotaNisza, brzegNiszy } from './freski';
import { rysujPostac } from './figury';
import { creatureName } from './overlay';
import { wolnoRuszac } from './nastroj';
import { BARWA_ROLI } from './druzyna';
import { ikonaMozliwosci } from './ikony-hud';
import { rolaPostaci, NAZWA_ROLI, NAZWA_ROLI_MNOGA, maxHp, stanyPostaci, type Rola } from '../sim/lud';
import { linaPrzecieta, sklejajacy } from '../sim/lina-wiadra';
import { cost, affordable, modliSie } from '../powers/powers';
import { czoloDrogi } from '../sim/pielgrzymka';
import { trwaBudowaSchodow } from '../sim/budowa-schodow';
import { naWieszaku } from '../sim/zbroja';
import { stanBramy } from '../sim/brama';
import { pomnikRozbity } from '../sim/pomnik';
import { BRAMA, BLOGOSLAWIENSTWO } from '../nastawy/loch';
import { Job, type Creature } from '../sim/creatures';
import type { Sim } from '../sim/sim';

export type AkcjaMozliwosci = 'naprawa' | 'cud' | 'modl' | 'przerwij' | 'oltarz' | 'kociol' | 'zaInnych' | 'droga' | 'warsztat' | 'kuznia' | 'zbroja' | 'sen';
/** Jedna możliwość w oknie: kto (`ids`), czy teraz da się (`ok`, inaczej `powod`), koszt, czy pilne (miga czerwienią). */
export interface Mozliwosc { akcja: AkcjaMozliwosci; nazwa: string; opis: string; ids: number[]; ok: boolean; powod?: string; koszt?: string; pilne?: boolean; }
export interface PoleOkna extends Prostokat { akcja: AkcjaMozliwosci | 'tlo' | 'zamknij'; }

/** Odmiana nazwy roli: 1 robotnik, 2 robotników… (jedna, dopełniacz, mnoga). */
const ODMIANA_ROLI: Record<Rola, [string, string, string]> = { robotnik: ["robotnik", "robotnik\xF3w", "robotnicy"], pobozny: ["pobo\u017Cny", "pobo\u017Cnych", "pobo\u017Cni"], rycerz: ["rycerz", "rycerzy", "rycerze"] };
function liczebnik(A: number, M: Rola): string {
  const [g, B, C] = ODMIANA_ROLI[M], o = A % 10, E = A % 100;
  return `${A} ${A === 1 ? g : o >= 2 && o <= 4 && (E < 12 || E > 14) ? C : B}`;
}
/** Co zaznaczeni mogą teraz zrobić — lista do okna postaci. */
export function mozliwosciPostaci(A: Sim, M: Creature[]): Mozliwosc[] {
  const g = (Y: Rola): Creature[] => M.filter((i) => rolaPostaci(i) === Y), B = g("robotnik"), C = g("pobozny"), o = g("rycerz"), E = (Y: Creature[]): number[] => Y.map((i) => i.id), Q: Mozliwosc[] = [], I = (Y: string) => A.pomieszczenia.find((i) => i.gotowe && i.rodzaj === Y);
  if (linaPrzecieta(A) && M.length) {
    const Y = sklejajacy(A);
    Q.push({ akcja: "naprawa", nazwa: "Napraw lin\u0119 wiadra", opis: "idzie do przeci\u0119tej liny, wspina si\u0119 i j\u0105 skleja \u2014 bez niej nic nie zjedzie", ids: E(M), ok: !Y, powod: "ju\u017C kto\u015B j\u0105 skleja", pilne: !Y });
  }
  if (C.length) {
    const Y = cost("znak", "objawienie");
    Q.push({ akcja: "cud", nazwa: "Cud", opis: "\u015Bwiat\u0142o z g\xF3ry wok\xF3\u0142 pobo\u017Cnego \u2014 wszyscy dooko\u0142a widz\u0105 cud, oddanie ro\u015Bnie, a d\u0142o\u0144 z otch\u0142ani ucieka", ids: E(C.slice(0, 1)), ok: affordable(A, "znak", "objawienie"), powod: `trzeba ${Y.wiara} wiary`, koszt: `${Y.wiara} wiary` });
    const i = C.filter((h) => !modliSie(h)), w = cost("szept", "modl");
    i.length && Q.push({ akcja: "modl", nazwa: "M\xF3dl si\u0119", opis: "szept: idzie do krypty i modli si\u0119 pod pomnikiem \u2014 kruszy go", ids: E(i), ok: affordable(A, "szept", "modl"), powod: `trzeba ${w.wiara} wiary`, koszt: `${w.wiara} wiary` });
    const G = C.filter((h) => modliSie(h));
    G.length && Q.push({ akcja: "przerwij", nazwa: "Przerwij modlitw\u0119", opis: "wraca do swoich i przez minut\u0119 nie idzie si\u0119 modli\u0107", ids: E(G), ok: true }), Q.push({ akcja: "oltarz", nazwa: "Do o\u0142tarza", opis: "idzie do o\u0142tarza w sali i otwiera okno rytua\u0142\xF3w (p\u0142acisz krwi\u0105)", ids: E(C), ok: true });
    Q.push(...mozliwosciPoboznych6_11(A, C));
  }
  if (B.length) {
    const Y = czoloDrogi(A), i = A.rytual.otwarta ? "pomnik ju\u017C otwarty" : A.planDrogi ? "droga wiernych jest ju\u017C wykopana" : "droga jeszcze si\u0119 wyznacza \u2014 chwila";
    // 6.11: szyb wykopany, schody w budowie (sim/budowa-schodow.ts) — ten sam rozkaz posyła do budowy schodów
    const bud = Y < 0 && !A.rytual.otwarta && trwaBudowaSchodow(A);
    Q.push(bud ? { akcja: "droga", nazwa: "Buduj schody drogi wiernych", opis: "szyb jest wykopany — od dołu osadzają w nim kamienne stopnie: dwóch murarzy na rusztowaniu, jeden kręci kołowrotem, który opuszcza im stopnie", ids: E(B), ok: true }
      : { akcja: "droga", nazwa: "Kop drog\u0119 wiernych", opis: "kopią drogę wiernych: szyb od wnęki przy sali w dół do starej komnaty z kotłem, a z niej drugi szyb w dół, na przedproże lochu; schody stawia się w wykopanym szybie, od dołu", ids: E(B), ok: Y >= 0, powod: i }), I("warsztat") && Q.push({ akcja: "warsztat", nazwa: "Pracuj w warsztacie", opis: "ze z\u0142ota robi\u0105 krzy\u017Ce \u2014 ka\u017Cdy staje si\u0119 wiar\u0105", ids: E(B), ok: A.zloto > 0, powod: "nie ma z\u0142ota" }), I("kuznia") && Q.push({ akcja: "kuznia", nazwa: "Pracuj w ku\u017Ani", opis: "z \u017Celaza wykuwaj\u0105 cz\u0119\u015Bci zbroi rycerza", ids: E(B), ok: A.zelazo > 0, powod: "nie ma \u017Celaza" });
  }
  if (o.length && I("kuznia")) {
    const Y = naWieszaku(A).length;
    Q.push({ akcja: "zbroja", nazwa: "Za\u0142\xF3\u017C zbroj\u0119", opis: "idzie do ku\u017Ani, zdejmuje cz\u0119\u015B\u0107 z wieszaka i j\u0105 zak\u0142ada", ids: E(o), ok: Y > 0, powod: "na wieszaku nic nie wisi", koszt: Y ? `${Y} na wieszaku` : undefined });
  }
  return I("sypialnia") && Q.push({ akcja: "sen", nazwa: "Id\u017A spa\u0107", opis: "sen w sypialni zdejmuje os\u0142abienia (ok. minuty)", ids: E(M), ok: true }), Q;
}
/**
 * 6.11: „Do kotła — podnieś bramę” (zaklinanie przy kotle w starej komnacie; dwóch naraz podnosi stalową bramę lochu)
 * i „Módl się za innych” (zostaje i modli się za tych wokół — leczy ich i błogosławi).
 */
function mozliwosciPoboznych6_11(sim: Sim, pobozni: Creature[]): Mozliwosc[] {
  const out: Mozliwosc[] = [];
  const w = sim.world;
  if (w.komnata.x1 >= w.komnata.x0 && !pomnikRozbity(sim)) {
    const s1 = w.odcinkiDrogi[0];
    // komnata z kotłem dostępna, gdy pierwszy odcinek drogi wiernych jest wykuty do jej sklepienia
    let wykuty = !!s1;
    if (s1) for (let y = w.salaOltarza.y1 + 1; y < w.komnata.y0 && wykuty; y++) if (w.solid((s1.x0 + s1.x1) >> 1, y)) wykuty = false;
    const zaklina = pobozni.filter((c) => c.polecenie?.zaklinaj);
    const b = stanBramy(sim);
    const ile = Math.round(b.otwarcie * 100);
    if (!zaklina.length || zaklina.length < pobozni.length) {
      const reszta = pobozni.filter((c) => !c.polecenie?.zaklinaj);
      out.push({
        akcja: 'kociol', nazwa: 'Do kotła — podnieś bramę',
        opis: `idą do kotła w starej komnacie i rzucają zaklęcia; dwóch naraz podnosi stalową bramę lochu (40 s do pełna), a gdy przestaną — brama powoli opada${ile ? ` (teraz otwarta w ${ile}%)` : ''}`,
        ids: reszta.map((c) => c.id), ok: wykuty, powod: 'droga wiernych nie sięga jeszcze komnaty z kotłem',
        koszt: reszta.length + b.zaklina < BRAMA.potrzeba ? `potrzeba ${BRAMA.potrzeba}` : undefined,
      });
    }
  }
  const nieModla = pobozni.filter((c) => !c.polecenie?.zaInnych);
  if (nieModla.length) out.push({
    akcja: 'zaInnych', nazwa: 'Módl się za innych',
    opis: `zostaje, gdzie stoi, i modli się za tych wokół (${BLOGOSLAWIENSTWO.promien} kafli): rany się goją, rycerz bije mocniej i szybciej chodzi, robotnik szybciej kopie, pobożny mocniej się modli`,
    ids: nieModla.map((c) => c.id), ok: true,
  });
  return out;
}
/** Kopie postaci do portretu (stoją, patrzą w bok, bez ładunku) — żeby nie ruszać tych na mapie. */
const kopie = new Map<number, Creature>();
function kopiaDoOkna(A: Creature, M: number): Creature {
  let g = kopie.get(A.id);
  return g || (g = { ...A }, kopie.set(A.id, g)), Object.assign(g, A, { x: 0, y: 0, vy: 0, face: M, carry: 0, fear: 0, mad: 0, job: Job.STOI, odmowa: undefined, naLinie: undefined, naWiadrze: undefined, wspina: undefined, ksiegaT: undefined }), kopie.size > 40 && kopie.clear(), g;
}
function pasek(ctx: CanvasRenderingContext2D, M: number, g: number, B: number, C: number, o: string, E: string, Q: number): void {
  ctx.save(), ctx.font = `italic ${Q}px ${SERIF}`, ctx.textAlign = "left", ctx.textBaseline = "alphabetic", ctx.fillStyle = "rgba(214,196,160,0.85)", ctx.fillText(E, M, g);
  const I = g + Q * 0.4, Y = Math.max(5, Q * 0.45);
  ctx.fillStyle = "rgba(0,0,0,0.5)", ctx.beginPath(), ctx.roundRect(M, I, B, Y, Y / 2), ctx.fill(), ctx.fillStyle = o, ctx.beginPath(), ctx.roundRect(M, I, Math.max(Y, B * Math.max(0, Math.min(1, C))), Y, Y / 2), ctx.fill(), ctx.strokeStyle = "rgba(204,160,92,0.5)", ctx.lineWidth = 0.8, ctx.beginPath(), ctx.roundRect(M, I, B, Y, Y / 2), ctx.stroke(), ctx.restore();
}
function lamLinie(ctx: CanvasRenderingContext2D, M: string, g: number, B: number): string[] {
  const C: string[] = [];
  let o = "";
  for (const E of M.split(" ")) {
    const Q = o ? `${o} ${E}` : E;
    ctx.measureText(Q).width > g && o ? (C.push(o), o = E) : o = Q;
  }
  return o && C.push(o), C.length > B && (C.length = B, C[B - 1] = C[B - 1].replace(/\s*\S*$/, "") + "\u2026"), C;
}
/** Miejsca w niszy grupowej: x (część szerokości), rząd (0 — z przodu), skala. */
const MIEJSCA_W_NISZY = [{ x: 0, st: 0, s: 1 }, { x: -0.27, st: 1, s: 0.92 }, { x: 0.27, st: 1, s: 0.92 }, { x: -0.47, st: 2, s: 0.84 }, { x: 0.47, st: 2, s: 0.84 }, { x: -0.14, st: 2, s: 0.8 }, { x: 0.15, st: 2, s: 0.8 }], KOLEJNOSC_ROLI: Record<Rola, number> = { rycerz: 0, pobozny: 1, robotnik: 2 };
function lukNiszy(A: number, M: number, g: number, B: number): { sciezka: Path2D; luk: { cx: number; cy: number; R: number; a0: number; a1: number } } {
  const C = Math.min(B * 0.3, g * 0.16), o = ((g / 2) ** 2 + C * C) / (2 * C), E = A + g / 2, Q = M + o, I = Math.asin(g / 2 / o), Y = new Path2D();
  return Y.moveTo(A, M + B), Y.lineTo(A, M + C), Y.arc(E, Q, o, -Math.PI / 2 - I, -Math.PI / 2 + I), Y.lineTo(A + g, M + B), Y.closePath(), { sciezka: Y, luk: { cx: E, cy: Q, R: o, a0: -Math.PI / 2 - I, a1: -Math.PI / 2 + I } };
}
/** Cały oddział w jednej złotej niszy, rzędami (rycerz z przodu), z „+N”, gdy się nie mieszczą. */
function grupaWNiszy(ctx: CanvasRenderingContext2D, M: Sim, g: Creature[], B: number, C: number, o: number, E: number, Q: number): void {
  const { sciezka: I, luk: Y } = lukNiszy(B, C, o, E);
  ctx.save(), pigment(ctx, I, FRESK.zloto, 0.9, "zloto");
  const i = 0.5 + 0.5 * Math.sin(Q * 13e-4), w = ctx.createRadialGradient(B + o * (0.4 + 0.2 * i), C + E * 0.35, 1, B + o / 2, C + E * 0.5, o * 0.6);
  w.addColorStop(0, "rgba(255,236,170,0.36)"), w.addColorStop(1, "rgba(60,30,8,0.42)"), ctx.fillStyle = w, ctx.fill(I), ctx.clip(I);
  const G = C + E - 9, h = E * 0.085;
  for (let K = 2; K >= 1; K--) {
    const S = G - K * h, J = o * (K === 2 ? 0.98 : 0.8), m = B + (o - J) / 2;
    ctx.fillStyle = K === 2 ? "rgba(92,62,36,0.85)" : "rgba(110,76,44,0.9)", ctx.fillRect(m, S, J, G - S + 9), ctx.fillStyle = "rgba(255,226,170,0.28)", ctx.fillRect(m, S, J, 1.5), ctx.fillStyle = "rgba(30,14,4,0.25)", ctx.fillRect(m, S + h * 0.55, J, h * 0.45);
  }
  ctx.fillStyle = "rgba(46,24,10,0.6)", ctx.fillRect(B, G, o, 9);
  const a = ctx.createRadialGradient(B + o / 2, G - E * 0.5, 4, B + o / 2, G - E * 0.5, E * 0.75);
  a.addColorStop(0, "rgba(255,244,200,0.4)"), a.addColorStop(1, "rgba(255,240,190,0)"), ctx.fillStyle = a, ctx.fillRect(B, C, o, E);
  const k = [...g].sort((K, S) => KOLEJNOSC_ROLI[rolaPostaci(K)!] - KOLEJNOSC_ROLI[rolaPostaci(S)!] || K.id - S.id).slice(0, MIEJSCA_W_NISZY.length), D = E * 0.66, l = Math.min(o * 0.92, D * 2.1), U = k.map((K, S) => ({ c: K, m: MIEJSCA_W_NISZY[S] })).sort((K, S) => S.m.st - K.m.st || Math.abs(S.m.x) - Math.abs(K.m.x));
  for (const { c: K, m: S } of U) {
    const J = B + o / 2 + S.x * l, m = G - S.st * h;
    ctx.fillStyle = "rgba(30,14,4,0.38)", ctx.beginPath(), ctx.ellipse(J, m, D * S.s * 0.2, D * S.s * 0.045, 0, 0, Math.PI * 2), ctx.fill(), ctx.save(), ctx.translate(J, m), rysujPostac(ctx, M, kopiaDoOkna(K, S.x > 0.01 ? -1 : 1), D * S.s, Q + K.id * 131, "stoi"), ctx.restore();
  }
  ctx.restore(), ctx.save(), ctx.lineWidth = 3, ctx.strokeStyle = FRESK.czerwien, ctx.stroke(I), ctx.lineWidth = 1, ctx.strokeStyle = "rgba(227,214,182,0.7)", ctx.stroke(I), ctx.fillStyle = "rgba(236,224,196,0.9)";
  for (let K = 1; K < 14; K++) {
    const S = Y.a0 + (Y.a1 - Y.a0) * (K / 14);
    ctx.beginPath(), ctx.arc(Y.cx + Math.cos(S) * (Y.R - 6), Y.cy + Math.sin(S) * (Y.R - 6), 1.6, 0, Math.PI * 2), ctx.fill();
  }
  ctx.restore(), g.length > MIEJSCA_W_NISZY.length && (ctx.save(), ctx.font = `600 ${Math.max(13, E * 0.13)}px ${SERIF_TYTUL}`, ctx.textAlign = "right", ctx.fillStyle = "rgba(40,20,6,0.9)", ctx.fillText(`+${g.length - MIEJSCA_W_NISZY.length}`, B + o - 10, C + E - 12), ctx.restore());
}
export function rysujOknoPostaci(ctx: CanvasRenderingContext2D, M: Sim, g: Plate, B: Creature[], C: { kursor: { x: number; y: number }; czas: number }): PoleOkna[] {
  let O: string | undefined;
  if (!B.length) return [];
  const o: PoleOkna[] = [], E = B.length === 1 ? B[0] : null, Q = mozliwosciPostaci(M, B), I = Math.round(E ? Math.max(300, Math.min(360, g.w * 0.3)) : Math.max(360, Math.min(440, g.w * 0.36))), Y = 14, i = Math.max(12, Math.min(15, I * 0.042)), w = i * 3.1, G = E ? Math.min(150, g.h * 0.26) : Math.min(150, g.h * 0.27), h = 2, a = Math.max(32, i * 2.5), k = 6, D = Math.ceil(Q.length / h), l = i * 2.7, U = Math.round(Y + w + G + 10 + i * 1.6 + Math.max(1, D) * (a + k) + l + Y * 0.4), K = g.x + 12, S = Math.max(g.y + 12, g.y + g.h - U - 12), J = (N: Prostokat): boolean => C.kursor.x >= N.x && C.kursor.x <= N.x + N.w && C.kursor.y >= N.y && C.kursor.y <= N.y + N.h;
  panelKamien(ctx, K, S, I, U, 10), o.push({ akcja: "tlo", x: K, y: S, w: I, h: U }), ctx.save(), ctx.textAlign = "left", ctx.textBaseline = "alphabetic";
  const m = E ? rolaPostaci(E) : null, s = new Set(B.map((N) => rolaPostaci(N))), R = !E && s.size === 1 ? rolaPostaci(B[0]) : null, V = E ? creatureName(E) : R ? NAZWA_ROLI_MNOGA[R][0].toUpperCase() + NAZWA_ROLI_MNOGA[R].slice(1) : "Oddzia\u0142";
  if (ctx.font = `600 ${i * 1.6}px ${SERIF_TYTUL}`, ctx.fillStyle = "rgba(250,228,174,1)", ctx.shadowColor = "rgba(0,0,0,0.8)", ctx.shadowBlur = 3, ctx.fillText(V, K + Y, S + Y + i * 1.25, I - Y * 2 - 30), ctx.shadowBlur = 0, ctx.font = `${i * 0.85}px ${SERIF}`, E && m) ctx.fillStyle = `rgba(${BARWA_ROLI[m!].join(",")},0.95)`, ctx.fillText(NAZWA_ROLI[m!].toUpperCase().split("").join(" "), K + Y, S + Y + i * 2.55);
  else {
    const N = (["rycerz", "pobozny", "robotnik"] as Rola[]).map((d) => ({ r: d, n: B.filter(($) => rolaPostaci($) === d).length })).filter((d) => d.n);
    let z = K + Y;
    for (const d of N) {
      const $ = liczebnik(d.n, d.r);
      ctx.fillStyle = `rgba(${BARWA_ROLI[d.r].join(",")},0.95)`, ctx.fillText($, z, S + Y + i * 2.55), z += ctx.measureText($).width, d !== N[N.length - 1] && (ctx.fillStyle = "rgba(204,160,92,0.7)", ctx.fillText("  \xB7  ", z, S + Y + i * 2.55), z += ctx.measureText("  \xB7  ").width);
    }
  }
  const q = K + I - Y - 12, F = S + Y + 4, y = Math.hypot(C.kursor.x - q, C.kursor.y - F) < 12;
  ctx.strokeStyle = y ? "rgba(255,220,160,1)" : "rgba(204,170,120,0.7)", ctx.lineWidth = 1.6, ctx.lineCap = "round", ctx.beginPath(), ctx.moveTo(q - 5, F - 5), ctx.lineTo(q + 5, F + 5), ctx.moveTo(q + 5, F - 5), ctx.lineTo(q - 5, F + 5), ctx.stroke(), o.push({ akcja: "zamknij", x: q - 12, y: F - 12, w: 24, h: 24 }), ctx.restore();
  const Z = S + Y + w;
  if (E) {
    const N = Math.round(G * 0.72), z = G, d = K + Y, $ = zlotaNisza(ctx, d, Z, N, z, C.czas);
    ctx.save(), ctx.clip($);
    const YA = ctx.createLinearGradient(0, Z + z * 0.8, 0, Z + z);
    YA.addColorStop(0, "rgba(60,30,10,0)"), YA.addColorStop(1, "rgba(60,30,10,0.45)"), ctx.fillStyle = YA, ctx.fillRect(d, Z, N, z), ctx.fillStyle = "rgba(30,14,4,0.35)", ctx.beginPath(), ctx.ellipse(d + N / 2, Z + z - 7, N * 0.3, 4, 0, 0, Math.PI * 2), ctx.fill(), ctx.translate(d + N / 2, Z + z - 7), rysujPostac(ctx, M, kopiaDoOkna(E, 1), z * 0.66, C.czas), ctx.restore(), brzegNiszy(ctx, $, d, Z, N);
    const EA = d + N + 14, KA = K + I - Y - EA;
    pasek(ctx, EA, Z + i * 1, KA, E.hp / maxHp(M, E), "rgba(196,58,40,0.95)", "\u017Cycie", i * 0.85), pasek(ctx, EA, Z + i * 3, KA, 1 - E.hunger, "rgba(150,170,80,0.95)", E.hunger > 0.6 ? "syto\u015B\u0107 \u2014 g\u0142odny!" : "syto\u015B\u0107", i * 0.85), ctx.save(), ctx.font = `italic ${i * 0.92}px ${SERIF}`, ctx.fillStyle = "rgba(232,214,180,0.95)", ctx.textAlign = "left";
    const qA = E.zamiar ? `Teraz: ${E.zamiar}.` : "Czeka.", GA = lamLinie(ctx, qA, KA, 2);
    GA.forEach((aA, vA) => ctx.fillText(aA, EA, Z + i * 5.4 + vA * i * 1.15));
    const PA = stanyPostaci(M, E).slice(0, 2);
    ctx.font = `${i * 0.82}px ${SERIF}`, PA.forEach((aA, vA) => {
      ctx.fillStyle = aA.uspiony ? "rgba(190,180,160,0.85)" : aA.dobry ? "rgba(250,226,150,0.98)" : "rgba(236,112,96,0.98)", ctx.fillText(`\u2022 ${aA.nazwa}`, EA, Z + i * (5.6 + GA.length * 1.15) + vA * i * 1.1, KA);
    }), ctx.restore();
  } else grupaWNiszy(ctx, M, B, K + Y, Z, I - Y * 2, G, C.czas);
  const p = Z + G + 10;
  ctx.save(), ctx.font = `${i * 0.72}px ${SERIF}`, ctx.textAlign = "center";
  const c = "M O \u017B L I W O \u015A C I", t = ctx.measureText(c).width;
  ctx.strokeStyle = "rgba(204,160,92,0.4)", ctx.lineWidth = 1, ctx.beginPath(), ctx.moveTo(K + Y, p + i * 0.55), ctx.lineTo(K + I / 2 - t / 2 - 8, p + i * 0.55), ctx.moveTo(K + I / 2 + t / 2 + 8, p + i * 0.55), ctx.lineTo(K + I - Y, p + i * 0.55), ctx.stroke(), ctx.fillStyle = "rgba(224,168,96,0.85)", ctx.fillText(c, K + I / 2, p + i * 0.8), ctx.restore();
  const j = p + i * 1.6, e = (I - Y * 2 - k) / h;
  let n: Mozliwosc | null = null;
  Q.length || (ctx.save(), ctx.font = `italic ${i * 0.9}px ${SERIF}`, ctx.fillStyle = "rgba(200,184,150,0.8)", ctx.textAlign = "center", ctx.fillText("nic szczeg\xF3lnego \u2014 wska\u017C na mapie, dok\u0105d ma i\u015B\u0107", K + I / 2, j + a * 0.6), ctx.restore()), Q.forEach((N, z) => {
    const d = { x: K + Y + z % h * (e + k), y: j + Math.floor(z / h) * (a + k), w: e, h: a }, $ = J(d);
    if ($ && (n = N), ctx.save(), N.pilne) {
      const $A = wolnoRuszac() ? 0.5 + 0.5 * Math.sin(C.czas * 6e-3) : 0.7;
      ctx.shadowColor = `rgba(230,60,40,${0.5 + 0.4 * $A})`, ctx.shadowBlur = 8 + 8 * $A;
    }
    ctx.beginPath(), ctx.roundRect(d.x, d.y, d.w, d.h, 5);
    const YA = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
    if (YA.addColorStop(0, "#090706"), YA.addColorStop(1, "#17120e"), ctx.fillStyle = YA, ctx.fill(), ctx.shadowBlur = 0, $ && N.ok) {
      ctx.save(), ctx.clip();
      const $A = ctx.createRadialGradient(d.x + d.w * 0.3, d.y + d.h * 1.1, 2, d.x + d.w * 0.3, d.y + d.h, d.w * 0.7);
      $A.addColorStop(0, "rgba(255,160,70,0.3)"), $A.addColorStop(1, "rgba(255,160,70,0)"), ctx.fillStyle = $A, ctx.fillRect(d.x, d.y, d.w, d.h), ctx.restore();
    }
    ctx.strokeStyle = N.pilne ? "rgba(210,80,60,0.9)" : $ && N.ok ? "rgba(222,206,172,0.6)" : "rgba(222,206,172,0.16)", ctx.lineWidth = 1, ctx.stroke();
    const EA = d.h * 0.42, KA = d.x + 6 + EA, qA = d.y + d.h / 2;
    ikonaMozliwosci(ctx, N.akcja, KA, qA, EA * 1.9, C.czas, N.ok ? $ ? 1 : 0.75 : 0.3);
    const GA = KA + EA + 7, PA = d.x + d.w - GA - 5;
    ctx.textAlign = "left", ctx.textBaseline = "alphabetic", ctx.font = `${i * 0.95}px ${SERIF}`, ctx.fillStyle = N.ok ? "rgba(244,230,200,0.98)" : "rgba(170,156,134,0.7)", ctx.fillText(N.nazwa, GA, d.y + d.h * 0.47, PA);
    const vA = [E ? "" : (() => {
      const $A = rolaPostaci(M.creatureById(N.ids[0])!), gM = N.ids.length === B.length;
      return N.akcja === "cud" ? "przy pierwszym pobo\u017Cnym" : gM ? "wszyscy" : $A ? liczebnik(N.ids.length, $A) : "";
    })(), N.koszt].filter(Boolean).join(" \xB7 ");
    vA && (ctx.font = `italic ${i * 0.76}px ${SERIF}`, ctx.fillStyle = N.ok ? "rgba(214,180,120,0.9)" : "rgba(150,130,110,0.6)", ctx.fillText(vA, GA, d.y + d.h * 0.82, PA)), ctx.restore(), o.push({ akcja: N.akcja, ...d });
  });
  const T = j + Math.max(1, D) * (a + k) + i * 0.4;
  ctx.save(), ctx.textAlign = "left", ctx.font = `italic ${i * 0.82}px ${SERIF}`;
  const x = n as Mozliwosc | null, L = x ? x.ok ? x.opis : `teraz nie: ${(O = x.powod) != null ? O : ""}` : "dotknij mapy \u2014 id\u0105 tam (w ska\u0142\u0119: kopi\u0105) \xB7 prawy przycisk \u2014 odznacz";
  return ctx.fillStyle = x && !x.ok ? "rgba(236,128,100,0.95)" : x ? "rgba(240,222,180,0.95)" : "rgba(190,172,140,0.75)", lamLinie(ctx, L, I - Y * 2, 2).forEach((N, z) => ctx.fillText(N, K + Y, T + i * 0.9 + z * i * 1.1)), ctx.restore(), o;
}
