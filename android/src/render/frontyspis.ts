import { BARWA, rgba } from './palette';
import { SERIF } from './ink';
import { kreskuj, pseudo } from '../cutscene/art/common';
import { rysujSerce, tetnoRdzenia } from './rdzen';
import { glif } from './tajemnica';
import { FRONTYSPIS as F } from '../nastawy/wyglad/frontyspis';

/**
 * Frontyspis: anatomiczny przekrój góry jak z dawnego atlasu — bryła kreskowana
 * coraz gęściej ku dołowi, warstwy skał, komory z gniazdami, korytarze, żyły rudy,
 * kieszeń magmy i jezioro, a na samym dnie rdzeń w ciosanej skorupie. Części są
 * podpisane literami z odnośnikami. Nieruchoma rycina liczy się raz na rozmiar;
 * co klatkę dochodzi tylko to, co żyje: tętno rdzenia, drobni wędrowcy, kurz.
 */

interface Uklad {
  w: number; h: number;
  /** kontur bryły — punkty od lewego dołu przez szczyt do prawego dołu */
  kontur: [number, number][];
  komory: { x: number; y: number; rx: number; ry: number; lud: number }[];
  korytarze: [number, number][][];
  rdzen: { x: number; y: number; R: number };
  magma: { x: number; y: number; rx: number; ry: number };
  woda: { x: number; y: number; rx: number; ry: number };
}

export class Frontyspis {
  private bufor: HTMLCanvasElement | null = null;
  private klucz = '';
  private u: Uklad | null = null;

  private uklad(w: number, h: number): Uklad {
    const dol = h * 0.985;
    const kontur: [number, number][] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = t * w;
      // dwa szczyty, niższy po lewej — góra, nie trójkąt
      const s1 = F.szczyt1.wysokosc * Math.exp(-(((t - F.szczyt1.x) / F.szczyt1.szerokosc) ** 2));
      const s2 = F.szczyt2.wysokosc * Math.exp(-(((t - F.szczyt2.x) / F.szczyt2.szerokosc) ** 2));
      const brzeg = Math.sin(t * Math.PI) ** 0.6;
      const y = dol - (Math.max(s1, s2) * F.wysokoscGory + F.podstawaGory) * h * brzeg - pseudo(i * 2.3) * h * F.poszarpanie * brzeg;
      kontur.push([x, y]);
    }
    const komory = F.komory.map((k) => ({ x: k.x * w, y: k.y * h, rx: k.rx * w, ry: k.ry * h, lud: k.lud }));
    const rdzen = { x: w * F.rdzen.x, y: h * F.rdzen.y, R: Math.min(w, h) * F.rdzen.promien };
    const korytarze: [number, number][][] = [
      [[komory[0].x, komory[0].y], [w * 0.42, h * 0.4], [komory[1].x, komory[1].y]],
      [[komory[1].x, komory[1].y], [w * 0.63, h * 0.44], [komory[2].x, komory[2].y]],
      [[komory[0].x, komory[0].y], [w * 0.24, h * 0.52], [komory[3].x, komory[3].y]],
      [[komory[2].x, komory[2].y], [w * 0.55, h * 0.58], [komory[4].x, komory[4].y]],
      [[komory[4].x, komory[4].y], [w * 0.49, h * 0.7], [rdzen.x, rdzen.y - rdzen.R * 2.6]],
    ];
    return {
      w, h, kontur, komory, korytarze, rdzen,
      magma: { x: w * F.magma.x, y: h * F.magma.y, rx: w * F.magma.rx, ry: h * F.magma.ry },
      woda: { x: w * F.woda.x, y: h * F.woda.y, rx: w * F.woda.rx, ry: h * F.woda.ry },
    };
  }

  /** Nieruchoma część ryciny — raz na rozmiar i skalę ekranu. */
  private zbuduj(w: number, h: number, k: number): void {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext('2d')!;
    g.setTransform(k, 0, 0, k, 0, 0);
    const u = this.uklad(w, h);
    this.u = u;
    const bryla = new Path2D();
    bryla.moveTo(0, h);
    for (const [x, y] of u.kontur) bryla.lineTo(x, y);
    bryla.lineTo(w, h);
    bryla.closePath();
    g.fillStyle = F.kolorBryly;
    g.fill(bryla);
    // kreska gęstnieje ku dołowi: kilka pasów, każdy z inną gęstością i kątem
    for (const [y0, y1, odst, kat, a] of F.kreskowanie) {
      const pas = new Path2D();
      pas.rect(0, h * y0, w, h * (y1 - y0));
      g.save();
      g.clip(bryla);
      kreskuj(g, pas, kat, odst, rgba(BARWA.atrament, a), 0.8);
      g.restore();
    }
    g.save();
    g.clip(bryla);
    kreskuj(g, bryla, F.kreskaKrzyzowa.kat, F.kreskaKrzyzowa.odstep, rgba(BARWA.atrament, F.kreskaKrzyzowa.alfa), 0.8);
    // warstwy skał: faliste linie przez całą bryłę
    g.strokeStyle = rgba(BARWA.atrament, F.warstwy.alfa);
    g.lineWidth = 1;
    for (let l = 0; l < F.warstwy.ile; l++) {
      g.beginPath();
      const yb = h * (F.warstwy.od + l * F.warstwy.co);
      for (let x = 0; x <= w; x += 8) {
        const y = yb + Math.sin(x * 0.01 + l * 1.7) * h * 0.012 + Math.sin(x * 0.031 + l) * h * 0.005;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    // żyły rudy: krótkie złote kreski
    g.strokeStyle = F.zylyRudy.kolor;
    for (let i = 0; i < F.zylyRudy.ile; i++) {
      const x = pseudo(i * 3.1) * w, y = h * (0.35 + pseudo(i * 7.7) * 0.55);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5 + pseudo(i) * 6, y - 2 + pseudo(i * 2) * 4); g.stroke();
    }
    // magma i woda
    const kiesz = (e: Uklad['magma'], kolor: string, kreska: string, kat: number) => {
      const p = new Path2D();
      p.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI * 2);
      g.fillStyle = kolor; g.fill(p);
      kreskuj(g, p, kat, 3, kreska, 1);
      g.strokeStyle = kreska; g.stroke(p);
    };
    kiesz(u.magma, F.magma.wnetrze, F.magma.kreska, 0.1);
    kiesz(u.woda, F.woda.wnetrze, F.woda.kreska, 0);
    // korytarze: podwójna kreska z ciemnym wnętrzem
    for (const k of u.korytarze) {
      const p = new Path2D();
      p.moveTo(k[0][0], k[0][1]);
      p.quadraticCurveTo(k[1][0], k[1][1], k[2][0], k[2][1]);
      g.strokeStyle = F.korytarzObrzeze; g.lineWidth = F.korytarzObrzezeGrubosc; g.stroke(p);
      g.strokeStyle = F.korytarzWnetrze; g.lineWidth = F.korytarzWnetrzeGrubosc; g.stroke(p);
    }
    // komory z gniazdami
    for (const k of u.komory) {
      const p = new Path2D();
      p.ellipse(k.x, k.y, k.rx, k.ry, 0, 0, Math.PI * 2);
      g.fillStyle = F.komoraWnetrze; g.fill(p);
      g.strokeStyle = F.komoraObrys; g.lineWidth = 1.2; g.stroke(p);
      // podłoga komory
      g.strokeStyle = F.komoraPodloga; g.lineWidth = 1;
      g.beginPath(); g.moveTo(k.x - k.rx * 0.85, k.y + k.ry * 0.5); g.lineTo(k.x + k.rx * 0.85, k.y + k.ry * 0.5); g.stroke();
    }
    // skorupa: pierścień ciosanych bloków z wyrytymi znakami
    const { x: rx, y: ry, R } = u.rdzen;
    const bloki = F.blokow;
    for (let i = 0; i < bloki; i++) {
      const a0 = (i / bloki) * Math.PI * 2 + 0.03, a1 = ((i + 1) / bloki) * Math.PI * 2 - 0.03;
      const blok = new Path2D();
      blok.arc(rx, ry, R * F.skorupaZewn, a0, a1);
      blok.arc(rx, ry, R * F.skorupaWewn, a1, a0, true);
      blok.closePath();
      g.fillStyle = F.blokKolor; g.fill(blok);
      kreskuj(g, blok, 0.9, 3, rgba(BARWA.atrament, 0.25), 0.8);
      g.strokeStyle = F.blokObrys; g.lineWidth = 1; g.stroke(blok);
      const am = (a0 + a1) / 2, rm = R * F.znakiNaPromieniu;
      g.save();
      g.translate(rx + Math.cos(am) * rm, ry + Math.sin(am) * rm);
      g.rotate(am + Math.PI / 2);
      g.scale(R * 0.16, R * 0.16);
      g.lineWidth = 1 / (R * 0.16);
      g.strokeStyle = F.blokZnak;
      g.stroke(glif(900 + i, 1));
      g.restore();
    }
    // komora rdzenia
    g.fillStyle = F.komoraRdzenia;
    g.beginPath(); g.arc(rx, ry, R * F.skorupaWewn, 0, Math.PI * 2); g.fill();
    g.restore();
    // kontur bryły — mocna kreska
    g.strokeStyle = rgba(BARWA.atramentMocny, F.konturAlfa);
    g.lineWidth = F.konturGrubosc;
    g.beginPath();
    u.kontur.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
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
    if (klucz !== this.klucz) { this.zbuduj(w, h, k); this.klucz = klucz; }
    const u = this.u!;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    ctx.drawImage(this.bufor!, 0, 0, w, h);

    // co żyje: magma faluje, wędrowcy chodzą korytarzami, rdzeń bije
    const uderz = tetnoRdzenia(teraz);
    ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(u.magma.x, u.magma.y, 0, u.magma.x, u.magma.y, u.magma.rx * 1.6);
    mg.addColorStop(0, `rgba(255,110,50,${F.magmaAlfa + F.magmaFalowanie * Math.sin(teraz * 0.002)})`);
    mg.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(u.magma.x - u.magma.rx * 2, u.magma.y - u.magma.rx * 2, u.magma.rx * 4, u.magma.rx * 4);
    const { x: rx, y: ry, R } = u.rdzen;
    const halo = ctx.createRadialGradient(rx, ry, 0, rx, ry, R * F.halo);
    halo.addColorStop(0, `rgba(255,120,80,${F.haloAlfa + F.haloTetno * uderz})`);
    halo.addColorStop(0.35, `rgba(200,50,40,${0.18 + 0.06 * uderz})`);
    halo.addColorStop(1, 'rgba(120,20,20,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(rx - R * F.halo, ry - R * F.halo, R * F.halo * 2, R * F.halo * 2);
    ctx.globalCompositeOperation = 'source-over';

    // wędrowcy: drobne sylwetki sunące korytarzami tam i z powrotem
    ctx.fillStyle = rgba(BARWA.atramentMocny, F.sylwetki);
    u.korytarze.forEach((kor, i) => {
      const f = (Math.sin(teraz * F.tempoWedrowcow * (1 + i * 0.3) + i * 2) + 1) / 2;
      const a = 1 - f;
      const px = a * a * kor[0][0] + 2 * a * f * kor[1][0] + f * f * kor[2][0];
      const py = a * a * kor[0][1] + 2 * a * f * kor[1][1] + f * f * kor[2][1];
      ctx.beginPath(); ctx.arc(px, py - 4, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 1.3, py - 2.5, 2.6, 4);
    });
    // mieszkańcy w komorach
    for (const kom of u.komory) {
      for (let i = 0; i < kom.lud; i++) {
        const px = kom.x - kom.rx * 0.6 + (i / Math.max(1, kom.lud - 1)) * kom.rx * 1.2 + Math.sin(teraz * 0.001 + i) * 1.2;
        const py = kom.y + kom.ry * 0.5;
        ctx.beginPath(); ctx.arc(px, py - 5, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(px - 1.3, py - 3.5, 2.6, 3.5);
      }
    }

    // wieniec wokół skorupy i serce
    ctx.strokeStyle = `rgba(250,206,140,${0.35 + 0.2 * uderz})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.lineDashOffset = -teraz * 0.01;
    ctx.beginPath(); ctx.arc(rx, ry, R * F.wieniec, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    rysujSerce(ctx, rx, ry, R * (1 + 0.05 * uderz), uderz, false);

    if (podpisy) {
      const rozm = Math.max(F.podpisRozmiar.min, Math.min(F.podpisRozmiar.max, w / F.podpisRozmiar.dzielnik));
      ctx.font = `italic ${rozm}px ${SERIF}`;
      ctx.textBaseline = 'middle';
      const odnosnik = (tx: number, ty: number, lx: number, ly: number, litera: string, opis: string) => {
        ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = rgba(BARWA.atrament, 0.85);
        ctx.beginPath(); ctx.arc(tx, ty, 1.6, 0, Math.PI * 2); ctx.fill();
        // „a. gniazdo" czytane zawsze od litery — po lewej stronie cały napis kończy się przy kresce
        ctx.textAlign = 'left';
        const lit = `${litera}. `;
        const szer = ctx.measureText(lit).width + ctx.measureText(opis).width;
        const x0 = lx > tx ? lx + 4 : lx - 4 - szer;
        ctx.fillStyle = rgba(BARWA.zarBlady, 0.9);
        ctx.fillText(lit, x0, ly);
        ctx.fillStyle = rgba(BARWA.atrament, 0.72);
        ctx.fillText(opis, x0 + ctx.measureText(lit).width, ly);
      };
      const k0 = u.komory[1], k2 = u.komory[2];
      const P = F.podpisy;
      odnosnik(k0.x + k0.rx * 0.6, k0.y - k0.ry * 0.4, k0.x + k0.rx * 1.4, u.kontur[20][1] + h * 0.06, 'a', P.a);
      odnosnik(k2.x + k2.rx, k2.y, w * 0.84, k2.y - h * 0.06, 'b', P.b);
      odnosnik(u.woda.x + u.woda.rx, u.woda.y, w * 0.87, u.woda.y + h * 0.05, 'c', P.c);
      odnosnik(u.magma.x - u.magma.rx * 0.8, u.magma.y, w * 0.06, u.magma.y - h * 0.08, 'd', P.d);
      odnosnik(rx + R * F.skorupaZewn, ry - R * 0.6, w * 0.78, ry - R * 1.2, 'e', P.e);
      odnosnik(rx - R * 0.9, ry + R * 0.4, w * 0.2, ry + R * 1.4, 'f', P.f);
    }
    ctx.restore();
  }
}
