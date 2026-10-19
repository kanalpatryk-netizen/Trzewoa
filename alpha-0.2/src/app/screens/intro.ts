import type { Ekran } from '../screen';
import type { Kontekst } from '../context';
import type { Akcja } from '../../core/keybinds';
import { BARWA, rgba } from '../../render/palette';
import { SERIF } from '../../render/ink';
import { INTRO as I } from '../../nastawy/ekran';
import filmUrl from '../../../filmy/intro.mp4?url';

/** Jedna taśma na całą stronę — wczytuje ją ekran ładowania, puszcza ekran intro. */
let tasma: HTMLVideoElement | null = null;

function film(): HTMLVideoElement {
  if (tasma) return tasma;
  const v = document.createElement('video');
  v.src = filmUrl;
  v.preload = 'auto';
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  // klatki idą na płótno; sam element stoi w dokumencie niewidoczny, żeby przeglądarka go nie usypiała
  v.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  tasma = v;
  return v;
}

/** Etap ładowania: film wczytany na tyle, żeby ruszył bez zacięcia (albo minął czas — doczyta się w trakcie). */
export function wczytajIntro(): Promise<void> {
  const v = film();
  if (v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA || v.error) return Promise.resolve();
  return new Promise((gotowe) => {
    const koniec = () => { clearTimeout(zegar); v.removeEventListener('canplaythrough', koniec); v.removeEventListener('error', koniec); gotowe(); };
    const zegar = setTimeout(koniec, I.czekajNaFilmMs);
    v.addEventListener('canplaythrough', koniec);
    v.addEventListener('error', koniec);
  });
}

/**
 * Intro: film z `filmy/intro.mp4` po ekranie ładowania, przed menu. Klatki rysujemy na płótnie
 * (w proporcjach filmu, reszta czarna), a na dole przez cały film stoi mały znaczek
 * „spacja – pomiń”. Spacja albo Esc (na telefonie „wstecz”) pomija; po końcu filmu — menu.
 */
export class EkranIntro implements Ekran {
  nazwa = 'intro';
  private start = 0;
  private koniecOd = 0;
  private ruszyl = false;

  constructor(private app: Kontekst) {}

  wejdz(): void {
    this.start = performance.now();
    this.koniecOd = 0;
    this.ruszyl = false;
    const v = film();
    if (v.error) { this.zakoncz(); return; }
    v.onended = () => this.zakoncz();
    v.onerror = () => this.zakoncz();
    v.currentTime = 0;
    v.muted = false;
    // bez gestu gracza przeglądarka nie puści filmu z dźwiękiem — wtedy leci bez dźwięku
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => this.zakoncz());
    });
  }

  wyjdz(): void {
    const v = tasma;
    if (!v) return;
    v.onended = v.onerror = null;
    v.pause();
  }

  krok(_dt: number, teraz: number): void {
    const v = tasma;
    if (v && v.currentTime > 0) this.ruszyl = true;
    if (!this.koniecOd && !this.ruszyl && teraz - this.start > I.bezpiecznikMs) this.zakoncz();
    if (this.koniecOd && teraz - this.koniecOd >= I.wygaszenieMs) this.app.idz('menu');
  }

  private zakoncz(): void {
    if (this.koniecOd) return;
    this.koniecOd = performance.now();
    tasma?.pause();
  }

  klawisz(_akcja: Akcja | null, e: KeyboardEvent): void {
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Escape') {
      e.preventDefault();
      this.zakoncz();
    }
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const wyg = this.koniecOd ? Math.min(1, (teraz - this.koniecOd) / I.wygaszenieMs) : 0;
    const alfa = 1 - wyg;
    const v = tasma;
    if (v && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth) {
      const s = Math.min(w / v.videoWidth, h / v.videoHeight);
      const fw = v.videoWidth * s, fh = v.videoHeight * s;
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.drawImage(v, (w - fw) / 2, (h - fh) / 2, fw, fh);
      ctx.restore();
    }
    this.rysujZnaczek(ctx, w, h, teraz, alfa);
  }

  /** Mały znaczek na dole: klawisz „spacja” w ramce i „– pomiń” obok. */
  private rysujZnaczek(ctx: CanvasRenderingContext2D, w: number, h: number, teraz: number, alfa: number): void {
    const a = alfa * Math.max(0, Math.min(1, (teraz - this.start - I.znaczekOdMs) / I.znaczekRozjasnienieMs));
    if (a <= 0) return;
    const r = Math.max(10, Math.min(14, Math.min(w, h) / 50));
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    ctx.textBaseline = 'middle';
    ctx.font = `${r}px ${SERIF}`;
    const kw = ctx.measureText(I.klawisz).width + r * 1.2;
    const reszta = ` – ${I.pomin}`;
    ctx.font = `italic ${r}px ${SERIF}`;
    const pw = ctx.measureText(reszta).width;
    const kh = r * 1.6;
    const x = (w - kw - pw) / 2;
    const y = h - r * 2.6;
    // ciemne tło pod napisem, żeby był czytelny na jasnej klatce
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect?.(x - r * 0.6, y - kh / 2 - r * 0.3, kw + pw + r * 1.2, kh + r * 0.6, r * 0.5); ctx.fill();
    ctx.strokeStyle = rgba(BARWA.atrament, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect?.(x, y - kh / 2, kw, kh, r * 0.3); ctx.stroke();
    ctx.fillStyle = rgba(BARWA.atrament, 1);
    ctx.textAlign = 'center';
    ctx.font = `${r}px ${SERIF}`;
    ctx.fillText(I.klawisz, x + kw / 2, y + 0.5);
    ctx.textAlign = 'left';
    ctx.font = `italic ${r}px ${SERIF}`;
    ctx.fillStyle = rgba(BARWA.atramentCichy, 1);
    ctx.fillText(reszta, x + kw, y + 0.5);
    ctx.restore();
  }
}
