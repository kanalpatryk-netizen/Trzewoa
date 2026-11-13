// Wejście piekarni w Chromium: piecze jedną postać na jednym poziomie wielkości (klatki → arkusze PNG) i podgląd JPG.
import { POZIOMY, Scena, type Klatka } from './scena';
import { lud, type Anim, type Rola } from './lud';
import { przechwytujSwiatla } from './swiatla';
import { straznik } from './straznik';

interface Zlecenie { postac: string; wzor: number; wariant: string; mnoznik: number; anim: (s: Scena) => Anim[] }

/** Rozbiera nazwę zlecenia: robotnik-3, robotnik-3-helm, pobozny-1, rycerz-6-z2. */
function zlecenie(nazwa: string): Zlecenie {
  const [postac, wzorTxt, wariant = ''] = nazwa.split('-');
  const wzor = Number(wzorTxt);
  if (postac === 'robotnik' || postac === 'pobozny' || postac === 'rycerz') {
    const zbroja = wariant.startsWith('z') ? Number(wariant.slice(1)) : 0;
    return {
      postac, wzor, wariant, mnoznik: postac === 'rycerz' ? 1.3 : 1,
      anim: (s) => lud(s, postac as Rola, wzor, { helm: wariant === 'helm', zbroja }),
    };
  }
  // Strażnik Snu: sylwetka dwa razy wyższa niż postać ludu (rasa „trol”, size 2)
  if (postac === 'straznik') return { postac, wzor: 0, wariant: '', mnoznik: 2, anim: (s) => straznik(s) };
  throw new Error('nieznana postać: ' + nazwa);
}

let scena: Scena | null = null;
let ostatnie: { nazwa: string; anim: Anim[]; klatki: Klatka[]; h: number } | null = null;

const ODSTEP = 2;

/** Układa klatki na stronach (półki, od najwyższych); zwraca strony i miejsce każdej klatki. */
function pakuj(klatki: Klatka[], maks = 2048): { strony: HTMLCanvasElement[]; gdzie: [number, number, number][] } {
  const kolej = klatki.map((k, i) => i).filter((i) => klatki[i].p).sort((a, b) => klatki[b].h - klatki[a].h || klatki[b].w - klatki[a].w);
  const proba = (bok: number, wieleStron: boolean): { gdzie: [number, number, number][]; stron: number; wys: number } | null => {
    const gdzie: [number, number, number][] = klatki.map(() => [0, 0, 0]);
    let strona = 0, x = ODSTEP, y = ODSTEP, polka = 0;
    for (const i of kolej) {
      const k = klatki[i];
      if (k.w + 2 * ODSTEP > bok || k.h + 2 * ODSTEP > bok) return null;
      if (x + k.w + ODSTEP > bok) { x = ODSTEP; y += polka + ODSTEP; polka = 0; }
      if (y + k.h + ODSTEP > bok) {
        if (!wieleStron) return null;
        strona++; x = ODSTEP; y = ODSTEP; polka = 0;
      }
      gdzie[i] = [strona, x, y];
      x += k.w + ODSTEP; polka = Math.max(polka, k.h);
    }
    return { gdzie, stron: strona + 1, wys: y + polka + ODSTEP };
  };
  let wynik = null as ReturnType<typeof proba>, bok = 128;
  for (; bok <= maks; bok *= 2) { wynik = proba(bok, false); if (wynik) break; }
  if (!wynik) { bok = maks; wynik = proba(maks, true); }
  if (!wynik) throw new Error('klatka większa niż strona arkusza');
  const strony: HTMLCanvasElement[] = [];
  for (let s = 0; s < wynik.stron; s++) {
    const p = document.createElement('canvas');
    p.width = bok;
    // ostatnia (albo jedyna) strona tylko tak wysoka, jak trzeba — do wielokrotności 4
    p.height = s === wynik.stron - 1 ? Math.min(bok, Math.ceil(wynik.wys / 4) * 4) : bok;
    strony.push(p);
  }
  klatki.forEach((k, i) => { if (k.p) { const [s, x, y] = wynik!.gdzie[i]; strony[s].getContext('2d')!.drawImage(k.p, x, y); } });
  return { strony, gdzie: wynik.gdzie };
}

export function poziomy(): number[] { return POZIOMY; }

/** Piecze zlecenie na poziomie `nr` (indeks w POZIOMY). */
export async function piecz(nazwa: string, nr: number) {
  const z = zlecenie(nazwa);
  przechwytujSwiatla();
  // świeża scena na każde pieczenie — wynik nie zależy od tego, co pieczono wcześniej
  const s = (scena = new Scena());
  s.ostrzezenia = [];
  s.wymiary(Math.round(POZIOMY[nr] * z.mnoznik));
  const anim = z.anim(s);
  const klatki: Klatka[] = [];
  const opis: Record<string, unknown> = {};
  for (const a of anim) {
    const od = klatki.length;
    s.co = a.nazwa;
    a.piecz(s, (k) => klatki.push(k));
    if (klatki.length - od !== a.n) throw new Error(`${nazwa}/${a.nazwa}: ${klatki.length - od} klatek zamiast ${a.n}`);
    opis[a.nazwa] = { od, n: a.n, ster: a.ster, ...(a.mnoz !== undefined ? { mnoz: a.mnoz, przes: a.przes ?? 0 } : {}), ms: Math.round(a.ms), petla: a.petla, ...(a.srodki ? { srodki: true } : {}) };
  }
  const { strony, gdzie } = pakuj(klatki);
  ostatnie = { nazwa, anim, klatki, h: s.hPx };
  const r4 = (v: number): number => Math.round(v * 10000) / 10000;
  return {
    postac: z.postac, wzor: z.wzor, wariant: z.wariant,
    h: s.hPx, mnoznik: z.mnoznik,
    strony: strony.map((p) => p.toDataURL('image/png')),
    rozmiary: strony.map((p) => [p.width, p.height]),
    klatki: klatki.map((k, i) => [gdzie[i][0], gdzie[i][1], gdzie[i][2], k.w, k.h, k.ox, k.oy]),
    glowa: klatki.map((k) => (k.pkt ? k.pkt.map(r4) : null)),
    swiatla: klatki.map((k) => k.sw),
    animacje: opis,
    ostrzezenia: [...new Set(s.ostrzezenia)],
  };
}

/** Podgląd ostatnio upieczonych klatek: każda animacja w wierszu (zawijanym), na ciemnym tle — JPG. */
export function podglad(maksSzer = 2400): string {
  if (!ostatnie) throw new Error('najpierw piecz');
  const { nazwa, anim, klatki } = ostatnie;
  // komórka osobno dla każdej animacji: obejmuje jej klatki względem punktu zaczepienia
  const uklad: { a: Anim; od: number; l: number; g: number; kw: number; kh: number; naWiersz: number; y: number }[] = [];
  let y = 34, od = 0, szer = 600;
  for (const a of anim) {
    let l = 0, g = 0, pr = 0, d = 0;
    for (let j = 0; j < a.n; j++) { const k = klatki[od + j]; if (k.p) { l = Math.min(l, k.ox); g = Math.min(g, k.oy); pr = Math.max(pr, k.ox + k.w); d = Math.max(d, k.oy + k.h); } }
    const kw = pr - l + 8, kh = Math.max(40, d - g + 8), naWiersz = Math.max(1, Math.floor((maksSzer - 150) / kw));
    uklad.push({ a, od, l, g, kw, kh, naWiersz, y });
    szer = Math.max(szer, 150 + Math.min(naWiersz, a.n) * kw);
    y += Math.ceil(a.n / naWiersz) * kh; od += a.n;
  }
  const p = document.createElement('canvas');
  p.width = szer; p.height = y + 6;
  const c = p.getContext('2d')!;
  c.fillStyle = '#231c18'; c.fillRect(0, 0, p.width, p.height);
  c.fillStyle = '#e8c482'; c.font = '600 18px Georgia, serif'; c.textBaseline = 'top';
  c.fillText(`${nazwa} — ${klatki.length} klatek, ${anim.length} animacji (światła dorysowane jak w grze)`, 8, 8);
  for (const u of uklad) {
    c.fillStyle = '#d8c8a8'; c.font = '13px Georgia, serif';
    c.fillText(u.a.nazwa, 8, u.y + 6); c.fillStyle = '#8a7a64'; c.fillText(`${u.a.n} kl. · ${u.a.ster}`, 8, u.y + 24);
    for (let j = 0; j < u.a.n; j++) {
      const k = klatki[u.od + j];
      const x = 150 + (j % u.naWiersz) * u.kw, yy = u.y + Math.floor(j / u.naWiersz) * u.kh;
      const zx = x + 4 - u.l, zy = yy + 4 - u.g;          // punkt zaczepienia na podglądzie
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x, zy, u.kw - 2, 1);
      // światła pod duszkiem, addytywnie — tak je rysuje gra
      c.save(); c.globalCompositeOperation = 'lighter';
      const H = ostatnie.h;
      for (const [sx, sy, sr, cr, cg, cb, sa] of k.sw) {
        const gr = c.createRadialGradient(zx + sx * H, zy + sy * H, 0, zx + sx * H, zy + sy * H, sr * H);
        gr.addColorStop(0, `rgba(${cr},${cg},${cb},${sa})`); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        c.fillStyle = gr; c.beginPath(); c.arc(zx + sx * H, zy + sy * H, sr * H, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      if (k.p) c.drawImage(k.p, zx + k.ox, zy + k.oy);
    }
  }
  return p.toDataURL('image/jpeg', 0.88);
}
