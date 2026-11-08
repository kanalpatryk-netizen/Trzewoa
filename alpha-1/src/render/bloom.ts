/**
 * Poświata źródeł światła. Rycina sama z siebie nie świeci — ogień i biolumina
 * dostają miękki rozlew, żeby ciemność wokół nich naprawdę wyglądała na gorącą.
 */
export class Poswiata {
  private buf = document.createElement('canvas');
  private ctx = this.buf.getContext('2d')!;
  private w = 1; private h = 1;
  /** Wersja źródła, z której policzono rozmyty bufor (-1 — trzeba liczyć). */
  private wersja = -1;
  dostepna = true;

  constructor(private podzial = 4) {
    this.dostepna = typeof this.ctx.filter === 'string';
  }

  resize(w: number, h: number): void {
    this.w = Math.max(1, Math.round(w / this.podzial));
    this.h = Math.max(1, Math.round(h / this.podzial));
    this.buf.width = this.w;
    this.buf.height = this.h;
    this.wersja = -1;
  }

  /**
   * Rysuje rozmyty, rozjaśniony obraz źródła na wierzchu — tylko jasne miejsca zostają. `wersja` — numer obrazu
   * źródła (rycina liczy nowy kilka razy na sekundę): rozmycie, najdroższe w poświacie, liczy się tylko dla nowego;
   * dawniej szło dwa razy w każdej klatce (pod mrokiem i nad nim) z tego samego obrazu.
   */
  nalozy(cel: CanvasRenderingContext2D, zrodlo: CanvasImageSource, x: number, y: number, w: number, h: number, moc = 0.55, wersja?: number): void {
    if (!this.dostepna || moc <= 0) return;
    if (wersja === undefined || wersja !== this.wersja) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.ctx.filter = 'blur(2px) brightness(1.65) contrast(1.5)';
      this.ctx.drawImage(zrodlo, 0, 0, this.w, this.h);
      this.ctx.filter = 'none';
      this.wersja = wersja ?? -1;
    }
    cel.save();
    cel.globalCompositeOperation = 'lighter';
    cel.globalAlpha = moc;
    cel.imageSmoothingEnabled = true;
    cel.drawImage(this.buf, x, y, w, h);
    cel.restore();
  }
}
