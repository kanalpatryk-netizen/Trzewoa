import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import type { Sim } from '../../sim/sim';
import { BARWA, rgba } from '../../render/palette';
import { SERIF, SERIF_TYTUL, tloSadzy, tytulRyty, kreska } from '../../render/ink';
import { wyrok } from '../wyrok';

/** Ekran końcowy: spisana legenda tego, czym byłeś dla tych, co w tobie mieszkali. */
export class EkranKroniki implements Ekran {
  nazwa = 'kronika';
  private sim: Sim | null = null;
  private od = 0;
  private trafienia: { x: number; y: number; w: number; h: number; id: string }[] = [];
  private wybrana = 0;
  private opcje = [
    { id: 'nowa', etykieta: 'Nowa gra' },
    { id: 'menu', etykieta: 'Wróć do menu' },
  ];

  constructor(private app: Kontekst) {}

  wejdz(dane?: unknown): void {
    this.sim = (dane as { sim?: Sim } | undefined)?.sim ?? null;
    this.od = performance.now();
    this.wybrana = 0;
    this.app.muzyka.ustawScene('koniec');
    this.app.muzyka.ustawNapiecie(0.2);
  }

  krok(): void { /* czas się skończył */ }

  private naglowek(): { tytul: string; podtytul: string } {
    const e = this.sim?.ending ?? 'sen';
    const [rodzaj, kto] = e.split(':');
    if (rodzaj === 'sen') return { tytul: 'Zasnąłeś', podtytul: 'Nikt już o tobie nie myślał.' };
    if (rodzaj === 'uwolnienie') return { tytul: 'Uwolnili cię', podtytul: `${kto} dokopali się do rdzenia i uklękli.` };
    return { tytul: 'Zabili cię', podtytul: `${kto} dokopali się do rdzenia. Nie modlili się.` };
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const wiek = teraz - this.od;
    const wejscie = Math.min(1, wiek / 1200);
    tloSadzy(ctx, w, h, teraz);

    const { tytul, podtytul } = this.naglowek();
    tytulRyty(ctx, tytul.toUpperCase(), w / 2, h * 0.13, Math.max(28, Math.min(58, w / 19)), wejscie);
    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(14, Math.min(20, w / 58))}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atrament, 0.75 * wejscie);
    ctx.fillText(podtytul, w / 2, h * 0.175);

    // --- karta: prawdziwy papier z atramentem, bo to jest dokument, nie panel
    const rozmiar = Math.max(14, Math.min(18, w / 74));
    const kw = Math.min(820, w * 0.78);
    // wyrok pod kartą: przyczyna, jak daleko zaszła droga i rada na następny raz —
    // liczony najpierw, bo od jego wysokości zależy, ile kroniki zmieści się na karcie
    const wr = this.sim ? wyrok(this.sim) : null;
    const wrW = Math.min(760, w - 32);
    ctx.font = `italic ${rozmiar}px ${SERIF}`;
    const wrLinie: { t: string; k: string }[] = wr ? [
      ...zlam(ctx, wr.przyczyna, wrW).map((t) => ({ t, k: 'p' })),
      ...zlam(ctx, wr.etap, wrW).map((t) => ({ t, k: 'e' })),
      ...zlam(ctx, wr.statystyki, wrW).map((t) => ({ t, k: 's' })),
      ...zlam(ctx, `Następnym razem: ${wr.rada.charAt(0).toLowerCase()}${wr.rada.slice(1)}`, wrW).map((t) => ({ t, k: 'r' })),
    ] : [];
    const wrH = wrLinie.length * rozmiar * 1.45;
    const dolne = h * 0.92;
    // długie wpisy łamiemy w obrębie karty — wcześniej wychodziły poza papier;
    // bierzemy tyle ostatnich, ile się zmieści
    ctx.font = `${rozmiar}px ${SERIF}`;
    const miejsceNaKarte = Math.max(rozmiar * 8, dolne - rozmiar * 2.6 - wrH - h * 0.22 - rozmiar);
    const maxLinii = Math.max(3, Math.floor((Math.min(h * 0.58, miejsceNaKarte) - 90) / (rozmiar * 1.75)));
    const linie: { text: string; kind: string }[] = [];
    for (const e of [...(this.sim?.chronicle ?? [])].reverse()) {
      const kawalki = zlam(ctx, `— ${e.text}`, kw * 0.84);
      if (linie.length + kawalki.length > maxLinii) break;
      linie.unshift(...kawalki.map((t, i) => ({ text: i ? `   ${t}` : t, kind: e.kind })));
    }
    const kh = Math.min(h * 0.58, miejsceNaKarte, 90 + linie.length * rozmiar * 1.75);
    const kx = w / 2 - kw / 2, ky = h * 0.22;

    ctx.save();
    ctx.translate(kx + kw / 2, ky + kh / 2);
    ctx.rotate(-0.006 + Math.sin(teraz * 0.0003) * 0.002);
    ctx.translate(-kw / 2, -kh / 2);

    const karta = new Path2D();
    karta.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) karta.lineTo((i / 16) * kw, Math.sin(i * 1.9) * 3);
    for (let i = 0; i <= 10; i++) karta.lineTo(kw + Math.sin(i * 2.3) * 3, (i / 10) * kh);
    for (let i = 16; i >= 0; i--) karta.lineTo((i / 16) * kw, kh + Math.sin(i * 2.7) * 3);
    for (let i = 10; i >= 0; i--) karta.lineTo(Math.sin(i * 1.7) * 3, (i / 10) * kh);
    karta.closePath();

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = rgba(BARWA.papier, 0.96 * wejscie);
    ctx.fill(karta);
    ctx.restore();
    ctx.strokeStyle = `rgba(60,48,40,${0.35 * wejscie})`;
    ctx.lineWidth = 1;
    ctx.stroke(karta);

    ctx.save();
    ctx.clip(karta);
    // plamy i włókna papieru
    for (let i = 0; i < 18; i++) {
      const px = ((i * 137.5) % 1) * kw, py = ((i * 61.8) % 1) * kh;
      const r = 12 + ((i * 29) % 40);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(150,124,92,${0.05 * wejscie})`);
      g.addColorStop(1, 'rgba(150,124,92,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }

    ctx.textAlign = 'left';
    ctx.font = `600 ${rozmiar * 1.05}px ${SERIF_TYTUL}`;
    ctx.fillStyle = `rgba(48,38,32,${0.9 * wejscie})`;
    ctx.fillText('KRONIKA', kw * 0.08, kh * 0.11);
    ctx.strokeStyle = `rgba(70,56,46,${0.35 * wejscie})`;
    ctx.lineWidth = 1;
    kreska(ctx, kw * 0.08, kh * 0.135, kw * 0.92, kh * 0.135, 0.7, 26);

    linie.forEach((e, i) => {
      const alfa = Math.min(1, Math.max(0, (wiek - 500 - i * 150) / 420));
      if (alfa <= 0) return;
      ctx.font = `${e.kind === 'koniec' ? 'italic ' : ''}${rozmiar}px ${SERIF}`;
      const kolor = e.kind === 'krew' ? '120,34,28' : e.kind === 'wiara' ? '104,74,26' : e.kind === 'otchlan' ? '70,72,88' : '46,38,32';
      ctx.fillStyle = `rgba(${kolor},${0.92 * alfa})`;
      // na niskim ekranie pierwsza linijka wchodziła na kreskę pod „KRONIKA”
      ctx.fillText(e.text, kw * 0.08, Math.max(kh * 0.2, kh * 0.135 + rozmiar * 1.3) + i * rozmiar * 1.75);
    });

    // pieczęć: odcisk zamiast podpisu
    const pieczec = Math.min(1, Math.max(0, (wiek - 1800) / 900));
    if (pieczec > 0) {
      ctx.save();
      ctx.translate(kw * 0.84, kh * 0.87);
      ctx.rotate(-0.25);
      ctx.globalAlpha = pieczec * 0.65;
      ctx.strokeStyle = 'rgba(126,28,24,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, kh * 0.09, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, kh * 0.07, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(126,28,24,0.85)';
      ctx.font = `600 ${kh * 0.05}px ${SERIF_TYTUL}`;
      ctx.textAlign = 'center';
      ctx.fillText('TRZEWIA', 0, kh * 0.018);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();

    // --- wyrok
    if (wrLinie.length) {
      const alfa = Math.min(1, Math.max(0, (wiek - 1400) / 700));
      ctx.textAlign = 'center';
      let y = ky + kh + rozmiar * 1.9;
      for (const l of wrLinie) {
        ctx.font = `${l.k === 'p' ? '' : 'italic '}${rozmiar}px ${SERIF}`;
        ctx.fillStyle = l.k === 'p' ? rgba(BARWA.atramentMocny, 0.95 * alfa)
          : l.k === 'e' ? rgba(BARWA.zarBlady, 0.9 * alfa) : rgba(BARWA.atrament, 0.85 * alfa);
        ctx.fillText(l.t, w / 2, y);
        y += rozmiar * 1.45;
      }
    }

    // --- co dalej
    this.trafienia = [];
    ctx.textAlign = 'center';
    this.opcje.forEach((o, i) => {
      const ox = w / 2 + (i === 0 ? -1 : 1) * Math.min(220, w * 0.2);
      const wybrane = i === this.wybrana;
      ctx.font = `${Math.max(16, Math.min(24, w / 48))}px ${SERIF}`;
      ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, wybrane ? 0.98 : 0.7);
      ctx.fillText(o.etykieta, ox, dolne);
      const szer = ctx.measureText(o.etykieta).width;
      if (wybrane) {
        ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5);
        ctx.lineWidth = 1.2;
        kreska(ctx, ox - szer / 2 - 6, dolne + 10, ox + szer / 2 + 6, dolne + 10, 1, 16);
      }
      this.trafienia.push({ x: ox - szer / 2 - 16, y: dolne - 26, w: szer + 32, h: 44, id: o.id });
    });
  }

  private uruchom(id: string): void {
    if (id === 'nowa') this.app.idz('gra', { tryb: 'nowa' });
    else this.app.idz('menu');
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const traf = this.trafienia.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    if (!traf) return;
    if (faza === 'ruch') { this.wybrana = this.opcje.findIndex((o) => o.id === traf.id); return; }
    if (faza === 'dol') this.uruchom(traf.id);
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { this.wybrana = 1 - this.wybrana; return; }
    if (e.key === 'Enter' || e.key === ' ') { this.uruchom(this.opcje[this.wybrana].id); return; }
    if (akcja === 'menu') this.app.idz('menu');
  }
}

/** Łamie wpis kroniki na linie mieszczące się na karcie. */
function zlam(ctx: CanvasRenderingContext2D, tekst: string, maxW: number): string[] {
  const slowa = tekst.split(' ');
  const out: string[] = [];
  let linia = '';
  for (const s of slowa) {
    const proba = linia ? `${linia} ${s}` : s;
    if (ctx.measureText(proba).width > maxW && linia) { out.push(linia); linia = s; }
    else linia = proba;
  }
  if (linia) out.push(linia);
  return out;
}
