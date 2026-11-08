/**
 * Na czym gra rysuje: nazwa karty graficznej (z WebGL) i — w programie na Windows (Electron) — czy płótno idzie
 * przez kartę, czy przez procesor (app.getGPUFeatureStatus przez electron/preload.js). Bez karty płótno rysuje
 * procesor i gra traci kilka razy więcej czasu na klatkę — licznik wydajności (F3) mówi to wprost.
 */

export interface Karta {
  /** Nazwa karty, jak ją podaje sterownik (np. „ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 …, D3D11)”). */
  nazwa: string;
  /** Karta programowa (SwiftShader, llvmpipe, Microsoft Basic Render) — rysuje procesor. */
  programowa: boolean;
  /**
   * Płótno 2D przez kartę (Electron): 'tak', 'nie' (Chromium wyłączył kartę — np. sterownik na czarnej liście)
   * albo null, gdy nie wiadomo (zwykła przeglądarka).
   */
  plotnoSprzetowe: 'tak' | 'nie' | null;
  /** Surowy stan z Electrona (np. 'enabled', 'unavailable_software') — do podpisu w liczniku. */
  plotnoStan: string | null;
  /** Electron dostał przełączniki wymuszające kartę (electron/main.js). */
  wymuszona: boolean | null;
  /** Electron zapisał wymuszenie na następne uruchomienie (prawdziwa karta, a płótno rysuje procesor). */
  poRestarcie: boolean | null;
}

interface MostElectrona {
  karta: () => Promise<{ status: Record<string, string>; wymuszona?: boolean; wymusPrzyNastepnym?: boolean }>;
}

let karta: Karta | null = null;
let pytanie = false;

function nazwaZWebGL(): string {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'brak WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nazwa = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return nazwa;
  } catch {
    return 'nieznana';
  }
}

/** Karta graficzna — liczona raz, przy pierwszym pokazaniu licznika (tworzy na chwilę kontekst WebGL). */
export function kartaGraficzna(): Karta {
  if (!karta) {
    const nazwa = nazwaZWebGL();
    karta = {
      nazwa,
      programowa: /swiftshader|llvmpipe|software|basic render|brak webgl/i.test(nazwa),
      plotnoSprzetowe: null, plotnoStan: null, wymuszona: null, poRestarcie: null,
    };
  }
  if (!pytanie) {
    pytanie = true;
    const most = (window as unknown as { trzewiaElektron?: MostElectrona }).trzewiaElektron;
    most?.karta().then((o) => {
      const s = o.status['2d_canvas'] ?? '';
      if (!karta) return;
      karta.plotnoStan = s || null;
      karta.plotnoSprzetowe = s ? (s.startsWith('enabled') ? 'tak' : 'nie') : null;
      karta.wymuszona = o.wymuszona ?? null;
      karta.poRestarcie = o.wymusPrzyNastepnym ?? null;
    }).catch(() => { /* stary program bez mostu — zostaje sama nazwa */ });
  }
  return karta;
}
