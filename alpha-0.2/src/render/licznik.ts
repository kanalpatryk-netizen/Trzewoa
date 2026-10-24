import { oknoProgramu, type InfoProgramu } from '../core/program';

/**
 * Licznik klatek (F3 albo Ustawienia → Obraz): ile klatek na sekundę, ile z każdej klatki zajmuje sama gra
 * (świat i rysunek — kod gry w przeglądarce) i ile reszta: Chromium, sterownik karty, a w Protonie także Wine
 * i DXVK. Gdy gra zajmuje mało, a klatka trwa długo, klatki gubi coś poza grą.
 */
const N = 2048;
/** Średnie z ostatniej sekundy, najdłuższe z ostatnich pięciu. */
const SREDNIA_MS = 1000, NAJDLUZSZA_MS = 5000;

export class LicznikKlatek {
  private t = new Float64Array(N);
  private odstep = new Float32Array(N);
  private swiat = new Float32Array(N);
  private rysunek = new Float32Array(N);
  private ile = 0;
  private gdzie = 0;
  /** Czym rysuje przeglądarka (WebGL zdradza nazwę karty i drogę ANGLE) i co wie okno programu. */
  private karta: string | null | undefined;
  private program: InfoProgramu | null = null;
  private pytano = false;

  /** Jedna klatka: odstęp od poprzedniej i czas kodu gry — krok świata i rysunek. */
  klatka(teraz: number, odstep: number, swiat: number, rysunek: number): void {
    const i = this.gdzie;
    this.t[i] = teraz; this.odstep[i] = odstep; this.swiat[i] = swiat; this.rysunek[i] = rysunek;
    this.gdzie = (i + 1) % N;
    if (this.ile < N) this.ile++;
  }

  rysuj(ctx: CanvasRenderingContext2D, w: number, teraz: number): void {
    if (!this.pytano) {
      this.pytano = true;
      this.karta = kartaWebGL();
      oknoProgramu()?.info?.().then((i) => { this.program = i; }).catch(() => { /* bez informacji okna */ });
    }
    let n = 0, sOdstep = 0, sSwiat = 0, sRys = 0, maxOdstep = 0, maxGra = 0;
    for (let k = 0; k < this.ile; k++) {
      const i = (this.gdzie - 1 - k + N) % N;
      const wiek = teraz - this.t[i];
      if (wiek > NAJDLUZSZA_MS) break;
      const gra = this.swiat[i] + this.rysunek[i];
      if (this.odstep[i] > maxOdstep) maxOdstep = this.odstep[i];
      if (gra > maxGra) maxGra = gra;
      if (wiek <= SREDNIA_MS) { n++; sOdstep += this.odstep[i]; sSwiat += this.swiat[i]; sRys += this.rysunek[i]; }
    }
    if (!n) return;
    const klatka = sOdstep / n, swiat = sSwiat / n, rys = sRys / n, gra = swiat + rys;
    const fps = 1000 / klatka;
    const hz = this.program?.hz ?? 0;
    const wine = !!this.program?.wine;
    const ms = (v: number) => v.toFixed(1).replace('.', ',');
    const linie = [
      `${Math.round(fps)} kl./s${hz ? ` (monitor ${hz} Hz)` : ''} · klatka ${ms(klatka)} ms · najdłuższa ${ms(maxOdstep)} ms`,
      `gra ${ms(gra)} ms (świat ${ms(swiat)} + rysunek ${ms(rys)}) · najdłuższa ${ms(maxGra)} ms`,
      hz && fps >= hz * 0.95
        ? 'gra nadąża za monitorem'
        : `reszta klatki ${ms(Math.max(0, klatka - gra))} ms — poza kodem gry (Chromium, sterownik${wine ? ', Wine i DXVK' : ''}${hz ? '' : ' albo czekanie na monitor'})`,
      `${this.karta ?? 'WebGL niedostępny — rysuje procesor?'}${this.program && !this.program.plotnoNaKarcie ? ' · płótno: procesor!' : ''}${wine ? ' · Wine/Proton' : ''}`,
    ];
    ctx.save();
    ctx.font = '12px ui-monospace, Consolas, "DejaVu Sans Mono", monospace';
    ctx.textBaseline = 'top';
    let szer = 0;
    for (const l of linie) szer = Math.max(szer, ctx.measureText(l).width);
    const x = w - szer - 18, y = 8;
    ctx.fillStyle = 'rgba(8,6,5,0.78)';
    ctx.fillRect(x - 8, y - 6, szer + 16, linie.length * 16 + 10);
    linie.forEach((l, i) => {
      // pierwszy wiersz — czerwony, gdy klatek wyraźnie mniej niż odświeżanie monitora (albo niż 50 bez tej wiedzy)
      ctx.fillStyle = i === 0 && fps < (hz ? hz * 0.9 : 50) ? '#ff8c6a' : '#e8dcc0';
      ctx.fillText(l, x, y + i * 16);
    });
    ctx.restore();
  }
}

/** Nazwa karty i droga rysunku z WebGL, np. „NVIDIA GeForce RTX 3060 · Direct3D 11”. */
function kartaWebGL(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const surowe = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const programowo = /SwiftShader|llvmpipe|softpipe|Software/i.exec(surowe);
    if (programowo) return `rysuje procesor (${programowo[0]}) — bez karty graficznej!`;
    return opisKarty(surowe);
  } catch {
    return null;
  }
}

/**
 * Z opisu ANGLE: karta i droga rysunku. Przykłady: „ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11
 * vs_5_0 ps_5_0, D3D11)” (Windows), „ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3060/PCIe/SSE2, OpenGL 4.5.0 …)”
 * (Linux), „ANGLE (NVIDIA, Vulkan 1.3.277 (NVIDIA GeForce RTX 3060 (0x00002504)), NVIDIA-560.35.3)”.
 */
export function opisKarty(surowe: string): string {
  const droga = /D3D11|Direct3D ?11/i.test(surowe) ? 'Direct3D 11' : /D3D9|Direct3D ?9/i.test(surowe) ? 'Direct3D 9'
    : /Vulkan/i.test(surowe) ? 'Vulkan' : /OpenGL/i.test(surowe) ? 'OpenGL' : /Metal/i.test(surowe) ? 'Metal' : '';
  const angle = /^ANGLE \((?:[^,]*), (.*), [^,]*\)$/.exec(surowe);
  let karta = angle ? angle[1] : surowe;
  const vulkan = /Vulkan [\d.]+ \((.*)\)$/.exec(karta);
  if (vulkan) karta = vulkan[1];
  karta = karta.replace(/ \(0x[0-9a-f]+\)/gi, '').replace(/ Direct3D.*$/i, '').replace(/\/PCIe.*$/i, '').trim();
  return droga ? `${karta} · ${droga}` : karta;
}
