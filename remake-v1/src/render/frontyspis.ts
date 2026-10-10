import { FRESK } from '../nastawy/barwy';
import { SERIF } from './ink';
import { pseudo } from '../cutscene/art/common';
import { rysujSerce, tetnoRdzenia } from './rdzen';
import { glif } from './tajemnica';
import { migotLampy, pigment, wzor } from './fresk';
import { FRONTYSPIS as F } from '../nastawy/wyglad/frontyspis';

/**
 * Frontyspis: góra namalowana jak na ikonie — z piętrzących się półek skalnych o płaskich
 * wierzchach, podświetlonych bielą wapienną i obwiedzionych sinopią. Pokazuje grę:
 * wysoko siedziba ludu z lampką, obok spiżarnia z bladym grzybem, w skale zamurowane
 * gniazdo kamiennego rycerza, który czasem otwiera oczy, a zakosami w dół droga wiernych
 * do czarnej jaskini rdzenia — jak na ikonach Narodzenia — przy której w skale stoją
 * Strażnicy Snu. Nieruchomy obraz liczy się raz na rozmiar; co klatkę dochodzi to, co żyje.
 */

type P = { x: number; y: number };
interface Uklad {
  w: number; h: number;
  kontur: [number, number][];
  /** szczyt (najwyższy punkt konturu) — do podpisów */
  szczytY: number;
  siedziba: P & { rx: number; ry: number };
  spizarnia: P & { rx: number; ry: number };
  gniazdo: P & { rx: number; ry: number };
  straznicy: P[];
  droga: [number, number][];
  korytarz: [number, number][];
  rdzen: P & { R: number };
  magma: P & { rx: number; ry: number };
}

/** Półki skalne: wysokość rośnie z ziarnem, każda z płaskim wierzchem i skośną ścianą. */
function schodki(profil: (x: number) => number, w: number, krok: number, ziarno: number, przesuniecie: number, gora = 0, dolProfilu = 1): { pk: [number, number][]; polki: [number, number, number][] } {
  const pk: [number, number][] = [[0, profil(0) + przesuniecie]];
  const polki: [number, number, number][] = [];
  let x = -krok * pseudo(ziarno) * 0.8;
  let yPrev = profil(0) + przesuniecie;
  for (let i = 0; x < w && i < 200; i++) {
    // im wyżej, tym drobniejsze półki — szczyt zostaje szpiczasty
    const wys = Math.max(0, Math.min(1, (profil(Math.max(0, Math.min(w, x))) - gora) / Math.max(1, dolProfilu - gora)));
    const sz = krok * (0.35 + 0.65 * wys) * (0.65 + pseudo(ziarno + i * 1.7) * 0.7);
    const x1 = Math.min(w, x + sz);
    const sr = Math.min(w, Math.max(0, (x + x1) / 2));
    const y = profil(sr) + przesuniecie + (pseudo(ziarno * 3 + i) - 0.5) * krok * 0.25;
    const sciana = Math.min(sz * 0.3, Math.abs(y - yPrev) * 0.35 + 2);
    // półka wznosi się (w lewej części góry) — ściana po lewej; opada — ściana po prawej
    const xa = Math.max(0, y < yPrev ? x + sciana : x);
    const xb = Math.min(w, y < yPrev ? x1 : x1 - sciana);
    const nachyl = (pseudo(ziarno + i * 5.3) - 0.5) * krok * 0.12;
    pk.push([xa, y - nachyl]);
    pk.push([xb, y + nachyl]);
    polki.push([xa, xb, y]);
    yPrev = y;
    x = x1;
  }
  pk.push([w, profil(w) + przesuniecie]);
  return { pk, polki };
}

const sciezka = (pk: [number, number][], h: number): Path2D => {
  const p = new Path2D();
  p.moveTo(0, h + 2);
  for (const [x, y] of pk) p.lineTo(x, y);
  p.lineTo(pk[pk.length - 1][0], h + 2);
  p.closePath();
  return p;
};

const linia = (g: CanvasRenderingContext2D, pk: [number, number][]): void => {
  g.beginPath();
  pk.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
};

/** Barwy półek od szczytu ku dołowi: ugier w świetle, umbra w głębi. */
const POLKI = ['#8c6c45', '#77593a', '#644b31', '#533e29', '#443322', '#36291c'];

export class Frontyspis {
  private bufor: HTMLCanvasElement | null = null;
  private klucz = '';
  private u: Uklad | null = null;
  private zFaktura = false;

  private uklad(w: number, h: number): Uklad {
    const dol = h * 0.985;
    const kontur: [number, number][] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s1 = F.szczyt1.wysokosc * Math.exp(-(((t - F.szczyt1.x) / F.szczyt1.szerokosc) ** 2));
      const s2 = F.szczyt2.wysokosc * Math.exp(-(((t - F.szczyt2.x) / F.szczyt2.szerokosc) ** 2));
      const brzeg = Math.sin(t * Math.PI) ** 0.6;
      kontur.push([t * w, dol - (Math.max(s1, s2) * F.wysokoscGory + F.podstawaGory) * h * brzeg]);
    }
    const nisza = (k: { x: number; y: number; rx: number; ry: number }) => ({ x: k.x * w, y: k.y * h, rx: k.rx * w, ry: k.ry * h });
    const siedziba = nisza(F.siedziba), spizarnia = nisza(F.spizarnia);
    return {
      w, h, kontur,
      szczytY: Math.min(...kontur.map((p) => p[1])),
      siedziba, spizarnia,
      gniazdo: nisza(F.gniazdo),
      straznicy: F.straznicy.map((s) => ({ x: s.x * w, y: s.y * h })),
      droga: F.droga.map(([x, y]) => [x * w, y * h] as [number, number]),
      korytarz: [[spizarnia.x + spizarnia.rx * 0.8, spizarnia.y + spizarnia.ry * 0.4], [w * 0.44, h * 0.47], [siedziba.x - siedziba.rx * 0.8, siedziba.y + siedziba.ry * 0.5]],
      rdzen: { x: w * F.rdzen.x, y: h * F.rdzen.y, R: Math.min(w, h) * F.rdzen.promien },
      magma: nisza(F.magma),
    };
  }

  /** Profil góry w punkcie x (interpolacja konturu). */
  private profil(u: Uklad): (x: number) => number {
    const k = u.kontur;
    return (x: number) => {
      const t = Math.max(0, Math.min(k.length - 1.001, (x / u.w) * (k.length - 1)));
      const i = Math.floor(t), f = t - i;
      return k[i][1] * (1 - f) + k[i + 1][1] * f;
    };
  }

  private nisza(km: { x: number; y: number; rx: number; ry: number }): Path2D {
    const q = new Path2D();
    const yb = km.y + km.ry * 0.75, ym = km.y - km.ry * 0.1;
    q.moveTo(km.x - km.rx, yb);
    q.lineTo(km.x - km.rx, ym);
    q.ellipse(km.x, ym, km.rx, km.ry * 1.15, 0, Math.PI, 0);
    q.lineTo(km.x + km.rx, yb);
    q.closePath();
    return q;
  }

  /** Nieruchoma część obrazu — raz na rozmiar i skalę ekranu. */
  private zbuduj(w: number, h: number, k: number): void {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d')!;
    g.setTransform(k, 0, 0, k, 0, 0);
    const u = this.uklad(w, h);
    this.u = u;
    const profil = this.profil(u);
    const krok = Math.max(22, w / 14);
    const glowny = schodki(profil, w, krok, 3, 0, u.szczytY, h);
    const bryla = sciezka(glowny.pk, h);

    g.save();
    g.clip(bryla);
    // półki: każda następna niżej, malowana na poprzedniej
    const ile = POLKI.length, dy = (h * 0.8) / ile;
    for (let i = 0; i < ile; i++) {
      const warstwa = i === 0 ? glowny : schodki(profil, w, krok * (0.9 + pseudo(i * 4.1) * 0.35), 11 + i * 7, dy * i * (0.75 + pseudo(i) * 0.3), u.szczytY, h);
      const p = sciezka(warstwa.pk, h);
      pigment(g, p, POLKI[i], 0);
      g.save();
      g.clip(p);
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(200,160,104,0.22)';
      g.lineWidth = dy * 0.45;
      linia(g, warstwa.pk); g.stroke();
      g.restore();
      g.strokeStyle = 'rgba(232,220,190,0.38)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (const [xa, xb, y] of warstwa.polki) { g.moveTo(xa + 2, y + 1.6); g.lineTo(xb - 2, y + 1.6); }
      g.stroke();
      g.strokeStyle = 'rgba(64,22,12,0.85)';
      g.lineWidth = 1.3;
      linia(g, warstwa.pk); g.stroke();
    }
    const zmrok = g.createLinearGradient(0, u.szczytY, 0, h);
    zmrok.addColorStop(0, 'rgba(10,6,4,0.18)'); zmrok.addColorStop(0.6, 'rgba(10,6,4,0.45)'); zmrok.addColorStop(1, 'rgba(10,6,4,0.72)');
    g.fillStyle = zmrok; g.fill(bryla);
    const wz = wzor(g);
    this.zFaktura = !!wz;
    if (wz) { g.globalCompositeOperation = 'multiply'; g.fillStyle = wz; g.fill(bryla); g.globalCompositeOperation = 'source-over'; }

    // korytarz siedziba–spiżarnia i droga wiernych w dół: ciemne żyły w skale
    const zyla = (pk: [number, number][], gruba: number) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(58,20,10,0.9)'; g.lineWidth = gruba + 3; linia(g, pk); g.stroke();
      g.strokeStyle = '#100906'; g.lineWidth = gruba; linia(g, pk); g.stroke();
    };
    zyla([u.korytarz[0], u.korytarz[1], u.korytarz[2]], 5);
    zyla(u.droga, 6);
    // droga wiernych świeci od spodu bladym złotem — tędy wierni zejdą pod rdzeń
    g.setLineDash([2, 6]);
    g.strokeStyle = 'rgba(214,176,100,0.55)'; g.lineWidth = 1.4;
    linia(g, u.droga); g.stroke();
    g.setLineDash([]);
    // żar w dole zbocza
    {
      const e = u.magma;
      const q = new Path2D(); q.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
      const gr = g.createRadialGradient(e.x, e.y - e.ry * 0.3, 0, e.x, e.y, e.rx);
      gr.addColorStop(0, '#d0632e'); gr.addColorStop(1, '#5e1a0e');
      pigment(g, q, gr, 0.6);
      g.save(); g.clip(q);
      g.strokeStyle = 'rgba(255,190,110,0.5)'; g.lineWidth = 1.3;
      for (let r = 0; r < 4; r++) {
        g.beginPath();
        const yy = e.y - e.ry * 0.6 + r * e.ry * 0.45;
        for (let x = e.x - e.rx; x <= e.x + e.rx; x += 4) g.lineTo(x, yy + Math.sin(x * 0.12 + r) * e.ry * 0.12);
        g.stroke();
      }
      g.restore();
      g.strokeStyle = FRESK.sinopia; g.lineWidth = 1.6; g.stroke(q);
    }
    // nisze: siedziba i spiżarnia — łuk, ciemne wnętrze, biel na górnej krawędzi
    for (const km of [u.siedziba, u.spizarnia]) {
      const q = this.nisza(km);
      g.fillStyle = '#0e0806'; g.fill(q);
      g.strokeStyle = FRESK.sinopia; g.lineWidth = 1.6; g.stroke(q);
      g.strokeStyle = 'rgba(232,220,190,0.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(km.x, km.y - km.ry * 0.1, km.rx + 2, km.ry * 1.15 + 2, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
      g.strokeStyle = 'rgba(160,120,70,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(km.x - km.rx * 0.9, km.y + km.ry * 0.5); g.lineTo(km.x + km.rx * 0.9, km.y + km.ry * 0.5); g.stroke();
    }
    // gniazdo kamiennego rycerza: owal zamurowany ciosanymi kamieniami, w środku śpiący rycerz
    {
      const gn = u.gniazdo;
      const q = new Path2D(); q.ellipse(gn.x, gn.y, gn.rx, gn.ry, 0, 0, Math.PI * 2);
      pigment(g, q, '#57523f');
      g.save(); g.clip(q);
      g.strokeStyle = 'rgba(30,14,8,0.6)'; g.lineWidth = 1;
      for (let r = -3; r <= 3; r++) {
        const yy = gn.y + r * gn.ry * 0.3;
        g.beginPath(); g.moveTo(gn.x - gn.rx, yy); g.lineTo(gn.x + gn.rx, yy); g.stroke();
        for (let c2 = -2; c2 <= 2; c2++) {
          const xx = gn.x + (c2 + (r % 2) * 0.5) * gn.rx * 0.45;
          g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + gn.ry * 0.3); g.stroke();
        }
      }
      // sylwetka rycerza: hełm, ramiona, miecz wzdłuż ciała — jak relief na płycie nagrobnej
      g.fillStyle = 'rgba(28,24,20,0.85)';
      g.beginPath();
      g.ellipse(gn.x, gn.y - gn.ry * 0.55, gn.rx * 0.22, gn.ry * 0.17, 0, 0, Math.PI * 2);
      g.moveTo(gn.x - gn.rx * 0.42, gn.y - gn.ry * 0.3);
      g.lineTo(gn.x + gn.rx * 0.42, gn.y - gn.ry * 0.3);
      g.lineTo(gn.x + gn.rx * 0.3, gn.y + gn.ry * 0.75);
      g.lineTo(gn.x - gn.rx * 0.3, gn.y + gn.ry * 0.75);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(190,170,130,0.55)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(gn.x, gn.y - gn.ry * 0.25); g.lineTo(gn.x, gn.y + gn.ry * 0.7);
      g.moveTo(gn.x - gn.rx * 0.18, gn.y - gn.ry * 0.12); g.lineTo(gn.x + gn.rx * 0.18, gn.y - gn.ry * 0.12); g.stroke();
      g.restore();
      g.strokeStyle = FRESK.sinopia; g.lineWidth = 2; g.stroke(q);
      g.strokeStyle = 'rgba(232,220,190,0.4)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(gn.x, gn.y, gn.rx + 2.5, gn.ry + 2.5, 0, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
    }
    // Strażnicy Snu: wysokie, zakapturzone postaci wtopione w skałę po bokach jaskini
    for (const s of u.straznicy) {
      const sh = h * F.straznikWys, sw = sh * 0.32;
      const q = new Path2D();
      q.moveTo(s.x - sw * 0.5, s.y + sh * 0.5);
      q.quadraticCurveTo(s.x - sw * 0.62, s.y - sh * 0.1, s.x - sw * 0.3, s.y - sh * 0.38);
      q.quadraticCurveTo(s.x, s.y - sh * 0.62, s.x + sw * 0.3, s.y - sh * 0.38);
      q.quadraticCurveTo(s.x + sw * 0.62, s.y - sh * 0.1, s.x + sw * 0.5, s.y + sh * 0.5);
      q.closePath();
      g.fillStyle = '#120a07'; g.fill(q);
      g.strokeStyle = 'rgba(58,20,10,0.95)'; g.lineWidth = 1.6; g.stroke(q);
      // blade światło rdzenia na krawędzi kaptura od strony jaskini
      g.save(); g.clip(q);
      g.strokeStyle = 'rgba(214,120,80,0.35)'; g.lineWidth = 3;
      const kx = s.x < u.rdzen.x ? 1 : -1;
      g.beginPath(); g.moveTo(s.x + kx * sw * 0.3, s.y - sh * 0.38); g.quadraticCurveTo(s.x + kx * sw * 0.62, s.y - sh * 0.1, s.x + kx * sw * 0.5, s.y + sh * 0.5); g.stroke();
      g.restore();
      g.strokeStyle = 'rgba(200,170,120,0.25)'; g.lineWidth = 1;
      g.beginPath();
      for (const d of [-0.18, 0.05, 0.25]) { g.moveTo(s.x + d * sw, s.y - sh * 0.2); g.lineTo(s.x + d * sw * 1.3, s.y + sh * 0.48); }
      g.stroke();
    }
    // jaskinia rdzenia jak na ikonach Narodzenia: czarna, poszarpana, otwarta ku dołowi
    const { x: rx, y: ry, R } = u.rdzen;
    const jask = new Path2D();
    const sz = R * 2.9, gora = ry - R * 3.1;
    jask.moveTo(rx - sz * 1.1, h + 2);
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + (i / 18) * Math.PI;
      const rr = 1 + (pseudo(i * 2.7) - 0.5) * 0.16;
      jask.lineTo(rx + Math.cos(a) * sz * rr, Math.min(h, ry + Math.sin(a) * (ry - gora) * rr + (i === 0 || i === 18 ? R * 2 : 0)));
    }
    jask.lineTo(rx + sz * 1.1, h + 2);
    jask.closePath();
    g.fillStyle = '#0a0604'; g.fill(jask);
    g.strokeStyle = FRESK.sinopia; g.lineWidth = 2.2; g.stroke(jask);
    g.strokeStyle = 'rgba(232,220,190,0.45)'; g.lineWidth = 1.4;
    g.beginPath(); g.ellipse(rx, ry, sz + 3, ry - gora + 3, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.restore();

    // skorupa: pierścień ciosanych bloków w zieleni ziemi, z czerwonym nieznanym pismem
    const bloki = F.blokow;
    for (let i = 0; i < bloki; i++) {
      const a0 = (i / bloki) * Math.PI * 2 + 0.03, a1 = ((i + 1) / bloki) * Math.PI * 2 - 0.03;
      const blok = new Path2D();
      blok.arc(rx, ry, R * F.skorupaZewn, a0, a1);
      blok.arc(rx, ry, R * F.skorupaWewn, a1, a0, true);
      blok.closePath();
      pigment(g, blok, i % 2 ? '#6e6a52' : '#625d47');
      g.strokeStyle = FRESK.sinopia; g.lineWidth = 1; g.stroke(blok);
      const am = (a0 + a1) / 2, rm = R * F.znakiNaPromieniu;
      g.save();
      g.translate(rx + Math.cos(am) * rm, ry + Math.sin(am) * rm);
      g.rotate(am + Math.PI / 2);
      g.scale(R * 0.16, R * 0.16);
      g.lineWidth = 1.4 / (R * 0.16);
      g.strokeStyle = 'rgba(190,70,40,0.85)';
      g.stroke(glif(900 + i, 1));
      g.restore();
    }
    g.fillStyle = '#080404';
    g.beginPath(); g.arc(rx, ry, R * F.skorupaWewn, 0, Math.PI * 2); g.fill();
    // obrys góry: mocna sinopia, a pod nią blade światło na krawędzi
    g.lineJoin = 'round';
    g.save();
    g.clip(bryla);
    g.strokeStyle = 'rgba(226,196,140,0.32)';
    g.lineWidth = 5;
    linia(g, glowny.pk.slice(1, -1)); g.stroke();
    g.restore();
    g.strokeStyle = '#2e0f07';
    g.lineWidth = 2.6;
    linia(g, glowny.pk.slice(1, -1)); g.stroke();
    this.bufor = c;
  }

  /**
   * Rysuje frontyspis w prostokącie. `podpisy` dokłada odnośniki literowe
   * (na wąskim ekranie się nie mieszczą).
   */
  rysuj(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, teraz: number, alfa: number, podpisy: boolean): void {
    const t = ctx.getTransform();
    const k = Math.min(3, Math.max(1, Math.hypot(t.a, t.b)));
    const klucz = `${Math.round(w)}x${Math.round(h)}@${k}`;
    // obraz bez faktury (tynk jeszcze się wczytywał) liczy się jeszcze raz, gdy już jest
    if (klucz !== this.klucz || (!this.zFaktura && wzor(ctx))) { this.zbuduj(w, h, k); this.klucz = klucz; }
    const u = this.u!;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.drawImage(this.bufor!, 0, 0, w, h);

    const uderz = tetnoRdzenia(teraz);
    const { x: rx, y: ry, R } = u.rdzen;
    const S = u.siedziba, Z = u.spizarnia;
    ctx.globalCompositeOperation = 'lighter';
    // żar faluje
    const mg = ctx.createRadialGradient(u.magma.x, u.magma.y, 0, u.magma.x, u.magma.y, u.magma.rx * 1.6);
    mg.addColorStop(0, `rgba(255,110,50,${F.magmaAlfa + F.magmaFalowanie * Math.sin(teraz * 0.002)})`);
    mg.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(u.magma.x - u.magma.rx * 2, u.magma.y - u.magma.rx * 2, u.magma.rx * 4, u.magma.rx * 4);
    // rdzeń: czerwona poświata z jaskini na zbocza
    const halo = ctx.createRadialGradient(rx, ry, 0, rx, ry, R * F.halo);
    halo.addColorStop(0, `rgba(255,120,80,${F.haloAlfa + F.haloTetno * uderz})`);
    halo.addColorStop(0.35, `rgba(200,50,40,${0.16 + 0.06 * uderz})`);
    halo.addColorStop(1, 'rgba(120,20,20,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(rx - R * F.halo, ry - R * F.halo, R * F.halo * 2, R * F.halo * 2);
    // lampka w siedzibie
    const lx = S.x + S.rx * 0.62, ly = S.y + S.ry * 0.2;
    const ml = migotLampy(teraz);
    const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, S.rx * 1.2);
    gl.addColorStop(0, `rgba(255,170,80,${0.32 + 0.18 * ml})`); gl.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gl; ctx.fillRect(lx - S.rx * 1.3, ly - S.rx * 1.3, S.rx * 2.6, S.rx * 2.6);
    // grzyb w spiżarni świeci blado zielono
    const gg = ctx.createRadialGradient(Z.x, Z.y + Z.ry * 0.3, 0, Z.x, Z.y + Z.ry * 0.3, Z.rx * 1.1);
    gg.addColorStop(0, `rgba(160,220,150,${0.16 + 0.05 * Math.sin(teraz * 0.0013)})`); gg.addColorStop(1, 'rgba(160,220,150,0)');
    ctx.fillStyle = gg; ctx.fillRect(Z.x - Z.rx * 1.2, Z.y - Z.rx * 1.2, Z.rx * 2.4, Z.rx * 2.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,236,190,0.95)';
    ctx.beginPath(); ctx.ellipse(lx, ly - 1.5, 1.3, 2.4 + ml * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    // grzyby: blade kapelusze na podłodze spiżarni
    for (let i = 0; i < F.spizarnia.grzybow; i++) {
      const gx = Z.x - Z.rx * 0.7 + (i / Math.max(1, F.spizarnia.grzybow - 1)) * Z.rx * 1.4, gy = Z.y + Z.ry * 0.5;
      ctx.fillStyle = 'rgba(214,214,186,0.9)';
      ctx.fillRect(gx - 0.8, gy - 3.5, 1.6, 3.5);
      ctx.beginPath(); ctx.ellipse(gx, gy - 3.5, 3, 2, 0, Math.PI, 0); ctx.fill();
    }

    // lud w siedzibie i pielgrzymi schodzący drogą wiernych — drobne postaci bieli wapiennej
    ctx.fillStyle = `rgba(232,220,190,${F.sylwetki})`;
    for (let i = 0; i < F.siedziba.lud; i++) {
      const px = S.x - S.rx * 0.7 + (i / Math.max(1, F.siedziba.lud - 1)) * S.rx * 1.15 + Math.sin(teraz * 0.001 + i) * 1.2;
      const py = S.y + S.ry * 0.5;
      ctx.beginPath(); ctx.arc(px, py - 5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 1.3, py - 3.5, 2.6, 3.5);
    }
    const d = u.droga;
    const dlugosci = d.slice(1).map((p, i) => Math.hypot(p[0] - d[i][0], p[1] - d[i][1]));
    const calosc = dlugosci.reduce((a, b) => a + b, 0);
    for (let n = 0; n < F.pielgrzymow; n++) {
      let s = ((teraz * F.tempoPielgrzymow + n / F.pielgrzymow) % 1) * calosc;
      let i = 0;
      while (i < dlugosci.length - 1 && s > dlugosci[i]) { s -= dlugosci[i]; i++; }
      const f = Math.min(1, s / dlugosci[i]);
      const px = d[i][0] + (d[i + 1][0] - d[i][0]) * f, py = d[i][1] + (d[i + 1][1] - d[i][1]) * f;
      // przy jaskini pielgrzym gaśnie — wszedł w ciemność
      const zanik = Math.min(1, (calosc - ((teraz * F.tempoPielgrzymow + n / F.pielgrzymow) % 1) * calosc) / (calosc * 0.12));
      ctx.fillStyle = `rgba(232,220,190,${F.sylwetki * zanik})`;
      ctx.beginPath(); ctx.arc(px, py - 4, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 1.2, py - 2.5, 2.4, 4);
    }
    // Strażnicy Snu: oczy żarzą się powoli, każdy w swoim rytmie
    u.straznicy.forEach((s, i) => {
      const sh = h * F.straznikWys;
      const zar = 0.35 + 0.65 * Math.max(0, Math.sin(teraz * 0.0007 + i * 2.1));
      ctx.fillStyle = `rgba(220,60,36,${0.85 * zar})`;
      for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s.x + dx * sh * 0.045, s.y - sh * 0.3, 1.7, 1.0, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    // kamienny rycerz w gnieździe: co jakiś czas otwiera oczy i patrzy
    {
      const gn = u.gniazdo;
      const f = (teraz % F.rycerzOkres) / F.rycerzOkres;
      const od = 1 - F.rycerzOtwarte;
      if (f > od) {
        const o = Math.sin(((f - od) / F.rycerzOtwarte) * Math.PI);
        ctx.fillStyle = `rgba(240,200,120,${0.9 * o})`;
        for (const dx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(gn.x + dx * gn.rx * 0.09, gn.y - gn.ry * 0.56, 1.2, 0.8 * o + 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // nimb wokół skorupy: złote perełki, które wolno krążą, i serce
    ctx.fillStyle = `rgba(222,178,96,${0.45 + 0.25 * uderz})`;
    const nPer = 28;
    for (let i = 0; i < nPer; i++) {
      const a = (i / nPer) * Math.PI * 2 + teraz * 0.00006;
      ctx.beginPath(); ctx.arc(rx + Math.cos(a) * R * F.wieniec, ry + Math.sin(a) * R * F.wieniec, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    rysujSerce(ctx, rx, ry, R * (1 + 0.05 * uderz), uderz, false);

    if (podpisy) {
      const rozm = Math.max(F.podpisRozmiar.min, Math.min(F.podpisRozmiar.max, w / F.podpisRozmiar.dzielnik));
      ctx.font = `italic ${rozm}px ${SERIF}`;
      ctx.textBaseline = 'middle';
      const odnosnik = (tx: number, ty: number, lx2: number, ly2: number, litera: string, opis: string) => {
        ctx.strokeStyle = 'rgba(227,214,182,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx2, ly2); ctx.stroke();
        ctx.fillStyle = 'rgba(227,214,182,0.8)';
        ctx.beginPath(); ctx.arc(tx, ty, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = 'left';
        const lit = `${litera}. `;
        const szer = ctx.measureText(lit).width + ctx.measureText(opis).width;
        const x0 = lx2 > tx ? lx2 + 4 : lx2 - 4 - szer;
        ctx.fillStyle = FRESK.napisCzerwony;
        ctx.fillText(lit, x0, ly2);
        ctx.fillStyle = 'rgba(227,214,182,0.82)';
        ctx.fillText(opis, x0 + ctx.measureText(lit).width, ly2);
      };
      const P2 = F.podpisy, gn = u.gniazdo, st = u.straznicy;
      odnosnik(S.x + S.rx * 0.5, S.y - S.ry * 0.6, S.x + S.rx * 1.5, u.szczytY + h * 0.06, 'a', P2.a);
      odnosnik(Z.x - Z.rx * 0.5, Z.y - Z.ry * 0.5, w * 0.12, Z.y - h * 0.1, 'b', P2.b);
      odnosnik(gn.x + gn.rx, gn.y, w * 0.8, gn.y - h * 0.1, 'c', P2.c);
      odnosnik(d[2][0], d[2][1], w * 0.2, d[2][1] + h * 0.06, 'd', P2.d);
      odnosnik(st[1].x + h * F.straznikWys * 0.15, st[1].y - h * F.straznikWys * 0.2, w * 0.8, st[1].y - h * 0.04, 'e', P2.e);
      odnosnik(rx - R * 0.9, ry + R * 0.4, w * 0.2, ry + R * 1.4, 'f', P2.f);
    }
    ctx.restore();
  }
}
