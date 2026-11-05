import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { rgba } from '../../render/palette';
import { SERIF } from '../../render/ink';
import { hasSave } from '../../core/save';
import { ustawienia } from '../../core/settings-store';
import { MENU as M } from '../../nastawy/wyglad/menu';
import { ozdobnik, wygladz } from '../../render/ozdobnik';
import logoUrl from '../../../obrazy/menu/logo-trzewia.png?url';
import dollumUrl from '../../../obrazy/menu/zespol-dollum.png?url';
import znakUrl from '../../../obrazy/menu/zespol-znak.png?url';
import podpisUrl from '../../../obrazy/menu/zespol-podpis.png?url';

const ZESPOL_URL: Record<string, string> = { dollum: dollumUrl, znak: znakUrl, podpis: podpisUrl };

/** Obrazek wczytywany w tle; do czasu wczytania `gotowy` jest fałszywe i nic się nie rysuje. */
interface Obraz { img: HTMLImageElement; gotowy: boolean; }
function obraz(url: string, poWczytaniu?: (o: HTMLImageElement) => void): Obraz {
  const o: Obraz = { img: new Image(), gotowy: false };
  o.img.onload = () => { o.gotowy = true; poWczytaniu?.(o.img); };
  o.img.src = url;
  return o;
}

/** Biały obrazek przemalowany na barwę (raz, do płótna poza ekranem). */
function zabarw(img: HTMLImageElement, barwa: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = barwa; g.fillRect(0, 0, c.width, c.height);
  return c;
}

interface Pozycja { id: string; etykieta: string; aktywna: () => boolean; }
interface Prostokat { x: number; y: number; w: number; h: number; }

/**
 * Menu główne według szkicu grafika: czarne tło, logo „Trzewia” pośrodku u góry, pod nim spis
 * wejść z ozdobnikami po obu stronach, znaki zespołu w lewym dolnym rogu. Prawa strona zostaje
 * pusta — będzie tam grafika (trójka postaci), którą dorysuje grafik.
 */
export class EkranMenu implements Ekran {
  nazwa = 'menu';
  private wybrana = 0;
  private komunikat = '';
  private komunikatOd = 0;
  private trafienia: (Prostokat & { i: number })[] = [];
  private wejscieOd = 0;
  private logoBarwne: HTMLCanvasElement | null = null;
  private logo = obraz(logoUrl, (img) => { this.logoBarwne = zabarw(img, M.logoBarwa); });
  private zespol = M.zespol.map((z) => ({ ...z, obraz: obraz(ZESPOL_URL[z.plik]) }));

  private pozycje: Pozycja[] = [
    { id: 'wroc', ...M.pozycje.wroc, aktywna: () => this.trwaGra() },
    { id: 'nowa', ...M.pozycje.nowa, aktywna: () => true },
    { id: 'wczytaj', ...M.pozycje.wczytaj, aktywna: () => hasSave() },
    { id: 'samouczek', ...M.pozycje.samouczek, aktywna: () => true },
    { id: 'bestiariusz', ...M.pozycje.bestiariusz, aktywna: () => true },
    { id: 'osiagniecia', ...M.pozycje.osiagniecia, aktywna: () => true },
    { id: 'ustawienia', ...M.pozycje.ustawienia, aktywna: () => true },
  ];

  constructor(private app: Kontekst) {}

  private trwaGra(): boolean {
    const gra = this.app.ekran('gra') as { sim?: { tick: number; ending: string | null } } | undefined;
    return !!gra?.sim && gra.sim.tick > 0 && !gra.sim.ending;
  }

  wejdz(dane?: unknown): void {
    this.wejscieOd = performance.now();
    this.app.muzyka.ustawScene('menu');
    this.app.muzyka.ustawNapiecie(0);
    const k = (dane as { komunikat?: string } | undefined)?.komunikat;
    if (k) { this.komunikat = k; this.komunikatOd = performance.now(); }
    // po identyfikatorach, nie po numerach — spis bywa zmieniany
    const ind = (id: string) => this.pozycje.findIndex((p) => p.id === id);
    this.wybrana = this.trwaGra() ? ind('wroc') : ind(ustawienia.samouczekZrobiony ? 'nowa' : 'samouczek');
    if (!this.pozycje[this.wybrana].aktywna()) this.wybrana = ind('nowa');
  }

  krok(): void { /* menu żyje własnym zegarem */ }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    const odWejscia = teraz - this.wejscieOd;
    const ruch = ustawienia.oddech && !ustawienia.ograniczRuch;
    ctx.save();
    ctx.fillStyle = M.tlo;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const waski = h > w * M.pionowyOd || (w < M.waskiPonizej && h >= w);
    const m = Math.max(M.marginesMin, h * M.margines);

    // ---- logo: pośrodku u góry
    const proporcja = this.logo.gotowy ? this.logo.img.naturalWidth / this.logo.img.naturalHeight : 1.62;
    let lh = h * (waski ? M.logoWysokosc * 0.7 : M.logoWysokosc);
    let lw = lh * proporcja;
    const maxLw = w * (waski ? 0.86 : M.logoMaxSzer);
    if (lw > maxLw) { lw = maxLw; lh = lw / proporcja; }
    const ly = waski ? Math.max(m, h * 0.06) : h * M.logoGora;
    if (this.logoBarwne) {
      ctx.globalAlpha = wygladz(odWejscia / M.wejscieMs);
      ctx.drawImage(this.logoBarwne, w / 2 - lw / 2, ly, lw, lh);
      ctx.globalAlpha = 1;
    }

    // ---- spis: pod logo, pośrodku; na niskim ekranie gęstnieje, potem pismo maleje
    const n = this.pozycje.length;
    let r = Math.max(M.spisRozmiarMin, Math.min(M.spisRozmiarMax, h * M.spisRozmiar * (waski ? 1.05 : 1), waski ? w / 13 : Infinity));
    let odstep = r * M.spisOdstep;
    const podLogo = ly + lh;
    const zapasDol = waski ? h * 0.12 : 0;   // telefon: pod spisem rząd znaków zespołu
    const start = () => podLogo + r * M.spisPodLogo + r * 0.55;
    for (let k = 0; k < 16 && start() + (n - 1) * odstep + r * 0.5 > h - m - zapasDol; k++) {
      if (odstep > r * 1.35) odstep = Math.max(r * 1.35, (h - m - zapasDol - r * 0.5 - start()) / (n - 1));
      else { r *= 0.94; odstep = r * 1.35; }
    }
    const y0 = start();
    ctx.font = `${r}px ${SERIF}`;
    const najszersza = Math.max(...this.pozycje.map((p) => ctx.measureText(p.etykieta).width));
    const oz = r * M.ozdobnikSzer, ozOd = r * M.ozdobnikOdstep;
    const szerWiersza = najszersza + 2 * (oz + ozOd) + r;
    this.trafienia = [];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < n; i++) {
      const p = this.pozycje[i];
      const dostepna = p.aktywna();
      const wybrane = i === this.wybrana && dostepna;
      const y = y0 + i * odstep;
      const wejscieP = wygladz((odWejscia - M.spisOd - i * M.pozycjaOpoznienie) / M.pozycjaCzas);
      const alfa = (dostepna ? 1 : M.alfaNieaktywnej) * wejscieP;
      ctx.font = `${r}px ${SERIF}`;
      const szer = ctx.measureText(p.etykieta).width;
      ctx.save();
      if (wybrane) {
        const puls = ruch ? 0.8 + 0.2 * Math.sin(teraz * 0.003) : 1;
        ctx.shadowColor = `rgba(${M.poswiata},${0.85 * puls * alfa})`;
        ctx.shadowBlur = r * M.poswiataRozmycie;
      }
      ctx.fillStyle = rgba(wybrane ? M.napisWybrany : M.napis, alfa);
      ctx.fillText(p.etykieta, w / 2, y);
      // ozdobniki na wysokości środka małych liter; przy wybranej przysuwają się do napisu
      const yo = y - r * 0.3;
      const przysun = wybrane ? -r * 0.06 : 0;
      const barwaOz = wybrane ? M.ozdobnikWybrany : M.ozdobnik;
      ozdobnik(ctx, w / 2 - szer / 2 - ozOd - przysun, yo, oz, -1, barwaOz, alfa);
      ozdobnik(ctx, w / 2 + szer / 2 + ozOd + przysun, yo, oz, 1, barwaOz, alfa);
      ctx.restore();
      this.trafienia.push({ x: w / 2 - szerWiersza / 2, y: y - odstep * 0.5 - r * 0.3, w: szerWiersza, h: odstep, i });
    }
    const dolSpisu = y0 + (n - 1) * odstep + r * 0.5;

    // ---- znaki zespołu: lewy dolny róg (telefon: pośrodku pod spisem)
    const wejscieZ = wygladz((odWejscia - M.zespolOd) / M.wejscieMs);
    const gotowe = this.zespol.filter((z) => z.obraz.gotowy);
    if (gotowe.length && wejscieZ > 0) {
      const wymiary = gotowe.map((z) => {
        const zh = h * z.wysokosc;
        return { z, zh, zw: zh * z.obraz.img.naturalWidth / z.obraz.img.naturalHeight };
      });
      const odst = h * M.zespolOdstep;
      const calosc = wymiary.reduce((s, d) => s + d.zw, 0) + odst * (wymiary.length - 1);
      const najwyzszy = Math.max(...wymiary.map((d) => d.zh));
      let k: number;
      let x: number;
      if (waski) {
        k = Math.min(1, (w - 2 * m) / calosc, (h - m - dolSpisu - r * 0.6) / najwyzszy);
        x = w / 2 - (calosc * k) / 2;
      } else {
        // rząd kończy się przed spisem (i przed ozdobnikami) z zapasem
        k = Math.min(1, (w / 2 - szerWiersza / 2 - r * 1.2 - m) / calosc);
        x = m;
      }
      if (k * najwyzszy >= 20) {
        const srodekY = h - m - (najwyzszy * k) / 2;
        ctx.globalAlpha = M.zespolAlfa * wejscieZ;
        for (const d of wymiary) {
          const zw = d.zw * k, zh = d.zh * k;
          ctx.drawImage(d.z.obraz.img, x, srodekY - zh / 2, zw, zh);
          x += zw + odst * k;
        }
        ctx.globalAlpha = 1;
      }
    }
    // Prawa strona (szkic: „tu tę trójkę dam”) zostaje pusta — na przyszłą grafikę.

    this.stopka(ctx, w, h, teraz, m, wygladz(odWejscia / M.wejscieMs));
    ctx.restore();
  }

  private stopka(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, m: number, alfa: number): void {
    ctx.save();
    ctx.shadowBlur = 0;
    if (this.komunikat && teraz - this.komunikatOd < M.komunikatMs) {
      ctx.textAlign = 'center';
      ctx.font = `italic ${Math.max(14, Math.min(22, h / 42))}px ${SERIF}`;
      ctx.fillStyle = rgba(M.napisWybrany, 0.85 * Math.min(1, (M.komunikatMs - (teraz - this.komunikatOd)) / 900));
      ctx.fillText(this.komunikat, w / 2, h - Math.max(10, m * 0.35));
    }
    // wersja gry — małym drukiem w prawym dolnym rogu
    ctx.font = `italic ${Math.max(11, Math.min(15, h / 70))}px ${SERIF}`;
    ctx.fillStyle = rgba(M.napis, 0.4 * alfa);
    ctx.textAlign = 'right';
    ctx.fillText(M.wersja, w - Math.max(10, m * 0.5), h - Math.max(10, m * 0.5));
    ctx.restore();
  }

  private uruchom(i: number): void {
    const p = this.pozycje[i];
    if (!p || !p.aktywna()) return;
    this.app.gesty.klik();
    if (p.id === 'wroc') this.app.idz('gra');
    // jedna trudność — Koszmar; nowa gra zaczyna się od razu
    else if (p.id === 'nowa') this.app.idz('gra', { tryb: 'nowa' });
    else if (p.id === 'osiagniecia') this.app.idz('osiagniecia');
    else if (p.id === 'wczytaj') this.app.idz('gra', { tryb: 'wczytaj' });
    else if (p.id === 'samouczek') this.app.idz('samouczek');
    else if (p.id === 'bestiariusz') this.app.idz('bestiariusz');
    else if (p.id === 'ustawienia') this.app.idz('ustawienia');
  }

  dotyk(e: PointerEvent, faza: 'dol' | 'ruch' | 'gora'): void {
    const traf = this.trafienia.find((t) => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
    // nieaktywna pozycja (np. „Graj dalej” bez gry) nie zabiera wyróżnienia
    if (!traf || !this.pozycje[traf.i].aktywna()) return;
    if (faza === 'ruch') { this.wybrana = traf.i; return; }
    if (faza === 'dol') { this.wybrana = traf.i; this.uruchom(traf.i); }
  }

  klawisz(akcja: Akcja | null, e: KeyboardEvent): void {
    const dalej = (kier: number) => {
      let i = this.wybrana;
      for (let k = 0; k < this.pozycje.length; k++) {
        i = (i + kier + this.pozycje.length) % this.pozycje.length;
        if (this.pozycje[i].aktywna()) break;
      }
      this.wybrana = i;
    };
    if (e.key === 'ArrowDown') { dalej(1); return; }
    if (e.key === 'ArrowUp') { dalej(-1); return; }
    if (e.key === 'Enter' || e.key === ' ') { this.uruchom(this.wybrana); return; }
    if (akcja === 'menu' && this.trwaGra()) this.uruchom(0);
  }
}
