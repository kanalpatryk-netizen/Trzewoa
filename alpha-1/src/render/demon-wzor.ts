/**
 * DEMON WEDŁUG WZORU GRAFIKA (Alpha 1, 5.11) — Wielki Pomnik i boss, który z niego wstaje. Wzór: posąg demona
 * z rękami uniesionymi, z płomienną aureolą za głową, naszyjnikiem z czaszek i twarzą na przepasce; drugi rysunek
 * tego samego posągu z pęknięciami. Z rysunków (`obrazy/pomnik/`) są trzy warstwy:
 *  - `demon-sylwetka.png` — wypełniona sylwetka (kamień albo skóra żywego demona),
 *  - `demon-kontur.png`   — kreska wzoru (biała, barwę daje gra),
 *  - `demon-rysy.png`     — same pęknięcia (różnica między rysunkiem pękniętym a całym).
 * Stany pomnika: rysy odsłaniają się od głowy w dół (stan 1 — twarz i bark, stan 2 — do pasa, z odpadłymi kawałkami
 * na brzegu sylwetki), w stanie 3 żarzą się czerwono, oczy się tlą. Żywy demon: ta sama postać w ciemnej, rozżarzonej
 * skórze, z płonącymi oczami i ogniem w aureoli; oddycha, przykuca, zamachuje się (cios), przy konaniu świeci złotem.
 * Rysunek stopami w (0, 0), w jednostkach wysokości postaci `H` (jak dawna rycina w render/demon.ts — te same pozy).
 * Inny wzór = podmienione pliki o tych samych nazwach (punkty niżej, w WZOR, w pikselach rysunku).
 */
import type { PozaDemona, PunktyDemona } from './demon';
import sylwetkaUrl from '../../obrazy/pomnik/demon-sylwetka.png?url';
import konturUrl from '../../obrazy/pomnik/demon-kontur.png?url';
import rysyUrl from '../../obrazy/pomnik/demon-rysy.png?url';

type P = [number, number];

/** Rysunek wzoru: rozmiar, stopy, wysokość w H i punkty (piksele rysunku). */
const WZOR = {
  szer: 628, wys: 963,
  /** stopy na cokole: linia (y) i środek (x) */
  stopy: 951, srodek: 314,
  /** cały rysunek (z aureolą) ma tyle wysokości postaci H */
  wysokosc: 1.15,
  oczy: [[327, 127], [370, 130]] as P[],
  dlonL: [56, 190] as P, dlonP: [584, 190] as P,
  glowa: [348, 125] as P, piers: [330, 350] as P,
  /** środek aureoli (ogień za głową żywego demona) */
  aureola: [314, 150] as P,
  /** odpadłe kawałki kamienia (stan 2+): środek i promień — na brzegu sylwetki */
  ubytki: [[172, 18, 22], [433, 16, 20], [32, 130, 16], [575, 130, 15], [96, 900, 16], [552, 898, 14]] as [number, number, number][],
};

interface Obraz { img: HTMLImageElement; gotowy: boolean; }
const obrazy: Record<'sylwetka' | 'kontur' | 'rysy', Obraz> | null = typeof Image === 'undefined' ? null : {
  sylwetka: wczytaj(sylwetkaUrl), kontur: wczytaj(konturUrl), rysy: wczytaj(rysyUrl),
};
function wczytaj(url: string): Obraz {
  const o: Obraz = { img: new Image(), gotowy: false };
  o.img.onload = () => { o.gotowy = true; };
  o.img.src = url;
  return o;
}

const plotno = (): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = WZOR.szer; c.height = WZOR.wys;
  return c;
};
/** Biała warstwa wzoru przemalowana na barwę (raz). */
const barwione = new Map<string, HTMLCanvasElement>();
function barwa(rodzaj: 'kontur' | 'rysy' | 'sylwetka', kolor: string): HTMLCanvasElement {
  const k = `${rodzaj}|${kolor}`;
  let c = barwione.get(k);
  if (!c) {
    c = plotno();
    const g = c.getContext('2d')!;
    g.drawImage(obrazy![rodzaj].img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = kolor; g.fillRect(0, 0, c.width, c.height);
    barwione.set(k, c);
  }
  return c;
}

function los(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Gotowa postać (bez świecenia): sylwetka z kamieniem albo skórą, cieniowanie, kreska, rysy odsłonięte od góry
 * do `rysy` i ubytki. Raz na stan — potem już tylko przykładana.
 */
const postacie = new Map<string, HTMLCanvasElement>();
function postac(zywy: boolean, rysy: number, ubytki: boolean): HTMLCanvasElement {
  const krok = Math.round(rysy * 4) / 4;
  const k = `${zywy}|${krok}|${ubytki}`;
  const gotowa = postacie.get(k);
  if (gotowa) return gotowa;
  const c = plotno(), g = c.getContext('2d')!, { szer: W, wys: H } = WZOR;
  // sylwetka: kamień (szary, jaśniejszy u góry) albo skóra żywego demona (ciemny karmin, żar od piersi)
  g.drawImage(obrazy!.sylwetka.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (zywy) { gr.addColorStop(0, '#5a2018'); gr.addColorStop(0.45, '#3e1510'); gr.addColorStop(1, '#1c0a08'); }
  else { gr.addColorStop(0, '#857c6e'); gr.addColorStop(0.5, '#6a6257'); gr.addColorStop(1, '#4a443c'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-atop';
  // cień po bokach i u dołu — bryła, nie płaski wycinek
  const bok = g.createLinearGradient(0, 0, W, 0);
  bok.addColorStop(0, 'rgba(0,0,0,0.35)'); bok.addColorStop(0.3, 'rgba(0,0,0,0)'); bok.addColorStop(0.7, 'rgba(0,0,0,0)'); bok.addColorStop(1, 'rgba(0,0,0,0.4)');
  g.fillStyle = bok; g.fillRect(0, 0, W, H);
  if (zywy) {
    const zar = g.createRadialGradient(WZOR.piers[0], WZOR.piers[1], 10, WZOR.piers[0], WZOR.piers[1], W * 0.55);
    zar.addColorStop(0, 'rgba(200,70,30,0.45)'); zar.addColorStop(1, 'rgba(200,70,30,0)');
    g.fillStyle = zar; g.fillRect(0, 0, W, H);
  } else {
    // ziarno kamienia
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = los(i * 7) > 0.5 ? 'rgba(255,248,230,0.07)' : 'rgba(0,0,0,0.09)';
      g.fillRect(los(i * 3 + 1) * W, los(i * 5 + 2) * H, 1 + los(i) * 2.5, 1 + los(i + 9) * 2);
    }
  }
  g.globalCompositeOperation = 'source-over';
  // kreska wzoru — dwa razy: po zmniejszeniu cienka kreska blakła i posąg wyglądał na wyblakły
  const kreska = barwa('kontur', zywy ? 'rgb(14,4,2)' : 'rgb(22,16,12)');
  g.drawImage(kreska, 0, 0); g.drawImage(kreska, 0.6, 0.6);
  // rysy: odsłaniają się od głowy w dół
  if (krok > 0) {
    g.save();
    g.beginPath(); g.rect(0, 0, W, H * Math.min(1, krok * 1.15)); g.clip();
    // pęknięcie: ciemna szczelina pogrubiona o piksel i jasny brzeg kamienia pod nią — widać je z daleka
    const szczelina = barwa('rysy', zywy ? 'rgb(10,2,0)' : 'rgb(12,8,6)');
    if (!zywy) { g.globalAlpha = 0.55; g.drawImage(barwa('rysy', 'rgb(214,200,176)'), 1.5, 2); g.globalAlpha = 1; }
    for (const [dx, dy] of [[0, 0], [1.2, 0], [0, 1.2], [-1.2, 0]]) g.drawImage(szczelina, dx, dy);
    g.restore();
  }
  // odpadłe kawałki: wyrwy na brzegu sylwetki z jasnym przełomem świeżego kamienia
  if (ubytki) {
    const wyrwa = new Path2D();
    WZOR.ubytki.forEach(([ux, uy, r], i) => {
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * Math.PI * 2 + los(i * 17 + j) * 0.6, rr = r * (0.6 + los(i * 23 + j) * 0.7);
        if (j === 0) wyrwa.moveTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr); else wyrwa.lineTo(ux + Math.cos(a) * rr, uy + Math.sin(a) * rr);
      }
      wyrwa.closePath();
    });
    g.globalCompositeOperation = 'destination-out';
    g.fill(wyrwa);
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(214,200,174,0.9)'; g.lineWidth = 3; g.stroke(wyrwa);
    g.globalCompositeOperation = 'source-over';
  }
  postacie.set(k, c);
  return c;
}

/**
 * Rysuje demona według wzoru; zwraca null, póki obrazki się nie wczytały (wtedy rysuje dawna rycina).
 * Pozy jak w dawnej rycinie: kuca (przysiad), oddech, cios (wypad do przodu), glowa (skłon), skrzydla (ogień w aureoli).
 */
/** Obrazki wzoru wczytane — od tej chwili posąg i boss są według wzoru. */
export function wzorGotowy(): boolean {
  return !!obrazy && obrazy.sylwetka.gotowy && obrazy.kontur.gotowy && obrazy.rysy.gotowy;
}

export function rysujWedlugWzoru(ctx: CanvasRenderingContext2D, H: number, p: PozaDemona): PunktyDemona | null {
  if (!wzorGotowy()) return null;
  const s = (H * WZOR.wysokosc) / WZOR.wys;            // piksele ekranu na piksel rysunku
  // przysiad tylko u żywego (wstaje z gruzu, pada na kolana) — posąg według wzoru stoi
  const kuca = p.zywy ? p.kuca : 0;
  const sx = 1 + 0.06 * kuca, sy = (1 - 0.26 * kuca) * (1 + (p.zywy ? 0.014 * p.oddech : 0));
  const c = Math.sin(Math.PI * Math.max(0, Math.min(1, p.cios)));
  const doH = ([x, y]: P): P => [((x - WZOR.srodek) * s * sx) / H, ((y - WZOR.stopy) * s * sy) / H];
  ctx.save();
  // wypad przy ciosie i skłon głowy — cała postać pochyla się nad stopami
  ctx.translate(H * 0.08 * c, 0);
  ctx.rotate(0.09 * c + p.glowa * 0.12);
  ctx.scale(sx, sy);
  ctx.scale(s, s);
  ctx.translate(-WZOR.srodek, -WZOR.stopy);
  const swieci = (rysuj: () => void): void => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; rysuj(); ctx.restore(); };
  // żywy: ogień w aureoli za głową (rośnie ze „skrzydłami”)
  if (p.zywy && p.skrzydla > 0.01) swieci(() => {
    const [ax, ay] = WZOR.aureola, R = WZOR.szer * (0.32 + 0.3 * p.skrzydla);
    const g = ctx.createRadialGradient(ax, ay, R * 0.1, ax, ay, R);
    g.addColorStop(0, `rgba(255,120,40,${0.35 * p.skrzydla})`); g.addColorStop(0.6, `rgba(200,50,20,${0.18 * p.skrzydla})`); g.addColorStop(1, 'rgba(150,30,10,0)');
    ctx.fillStyle = g; ctx.fillRect(ax - R, ay - R, R * 2, R * 2);
  });
  ctx.drawImage(postac(p.zywy, p.rysy, p.ubytki > 0.5), 0, 0);
  // żar w rysach (stan 3, rozpad, konanie — złoty, gdy `swiatlo`)
  if (p.zar > 0.01 && p.rysy > 0.01) swieci(() => {
    const kol = p.swiatlo ? 'rgb(255,214,120)' : 'rgb(255,90,40)';
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, WZOR.szer, WZOR.wys * Math.min(1, p.rysy * 1.15)); ctx.clip();
    ctx.shadowColor = kol; ctx.shadowBlur = 8;
    ctx.globalAlpha = Math.min(1, p.zar);
    const r = barwa('rysy', kol);
    ctx.drawImage(r, 0, 0); ctx.drawImage(r, 0, 0);
    ctx.restore();
  });
  // konanie: złote światło przenika całą postać
  if (p.swiatlo && p.zar > 0.01) swieci(() => {
    ctx.globalAlpha = Math.min(0.7, p.zar * 0.55);
    ctx.drawImage(barwa('sylwetka', 'rgb(255,200,110)'), 0, 0);
  });
  // żywy: żar w piersi
  if (p.zywy && p.zar > 0.01) swieci(() => {
    const [px, py] = WZOR.piers, R = WZOR.szer * 0.22;
    const g = ctx.createRadialGradient(px, py, 2, px, py, R);
    g.addColorStop(0, `rgba(255,110,50,${0.4 * p.zar})`); g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2);
  });
  // oczy
  if (p.oczy > 0.01) swieci(() => {
    for (const [ox, oy] of WZOR.oczy) {
      const R = 26;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
      g.addColorStop(0, `rgba(255,236,170,${0.95 * p.oczy})`); g.addColorStop(0.25, `rgba(255,120,40,${0.75 * p.oczy})`); g.addColorStop(1, 'rgba(255,40,10,0)');
      ctx.fillStyle = g; ctx.fillRect(ox - R, oy - R, R * 2, R * 2);
    }
  });
  ctx.restore();
  // dłonie wzniesione: bliższa (wrF) — z prawej
  return { wrF: doH(WZOR.dlonP), wrB: doH(WZOR.dlonL), glowa: doH(WZOR.glowa), piers: doH(WZOR.piers) };
}

/** Wysokość całego rysunku (z aureolą) w H — dla sceny, która dopasowuje komorę i odłamki. */
export const WYSOKOSC_WZORU = WZOR.wysokosc;
