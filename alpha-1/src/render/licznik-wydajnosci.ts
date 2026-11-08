import { licznik, CZESCI, NAZWA_CZESCI } from '../core/wydajnosc';
import { kartaGraficzna } from '../core/karta';

/** Co pokazać o obrazie: rozmiar płótna w pikselach, gęstość ekranu, rozdzielczość obrazu i limit klatek. */
export interface OpisObrazu {
  plotnoW: number;
  plotnoH: number;
  dpr: number;
  rozdzielczosc: number;
  limit: number;
}

const MONO = '12px ui-monospace, Consolas, "DejaVu Sans Mono", monospace';
const TEKST = 'rgba(236,222,190,0.96)';
const SLABO = 'rgba(176,160,132,0.9)';
const ALARM = 'rgba(244,116,92,1)';
const DOBRZE = 'rgba(150,210,130,1)';
/** Pasek części: pełna szerokość to budżet klatki przy 60 kl/s. */
const BUDZET = 1000 / 60;

/** Licznik wydajności (F3) — w lewym górnym rogu, nad wszystkim. Rysowany w pikselach logicznych. */
export function rysujLicznik(ctx: CanvasRenderingContext2D, o: OpisObrazu): void {
  const w = licznik.wynik;
  const k = kartaGraficzna();
  const lh = 15, x = 14, y = 14, sz = 420, pad = 10;
  const linie = 4 + CZESCI.length + 1 + 4;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(8,6,5,0.84)';
  ctx.fillRect(x, y, sz, pad * 2 + linie * lh);
  ctx.strokeStyle = 'rgba(224,176,104,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, pad * 2 + linie * lh - 1);
  ctx.font = MONO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let ly = y + pad + 11;
  const pisz = (t: string, barwa = TEKST, dx = 0): void => { ctx.fillStyle = barwa; ctx.fillText(t, x + pad + dx, ly); };
  const nowa = (): void => { ly += lh; };

  pisz('WYDAJNOŚĆ  (F3 — schowaj)', 'rgba(232,196,130,1)'); nowa();
  pisz(`${w.fps.toFixed(0).padStart(3)} kl/s`, w.fps < 50 ? ALARM : DOBRZE);
  pisz(`klatka ${w.klatkaMs.toFixed(1)} ms · najdłuższa ${w.najdluzszaMs.toFixed(0)} ms`, w.najdluzszaMs > 40 ? ALARM : TEKST, 78); nowa();
  pisz(`JS na klatkę ${w.jsMs.toFixed(1)} ms`, w.jsMs > 12 ? ALARM : TEKST); nowa();
  nowa();
  const xb = x + pad + 210, bw = sz - pad * 2 - 210;
  const pasek = (ms: number): void => {
    ctx.fillStyle = 'rgba(236,222,190,0.12)';
    ctx.fillRect(xb, ly - 9, bw, 8);
    ctx.fillStyle = ms > 4 ? 'rgba(244,116,92,0.85)' : 'rgba(224,176,104,0.8)';
    ctx.fillRect(xb, ly - 9, Math.min(bw, (bw * ms) / BUDZET), 8);
  };
  for (const c of CZESCI) {
    const ms = w.czesci[c];
    pisz(`${NAZWA_CZESCI[c].padEnd(17)}${ms.toFixed(2).padStart(6)} ms`);
    pasek(ms);
    nowa();
  }
  pisz(`${'reszta'.padEnd(17)}${w.resztaMs.toFixed(2).padStart(6)} ms`, SLABO); pasek(w.resztaMs); nowa();
  pisz(licznik.rycinaWWatku
    ? `rycina w wątku: ${w.watekMs.toFixed(1)} ms × ${w.watekNaSek.toFixed(0)}/s`
    : 'rycina w głównym wątku', SLABO); nowa();
  const roz = o.rozdzielczosc < 1 ? `, obraz ${Math.round(o.rozdzielczosc * 100)}%` : '';
  pisz(`płótno ${o.plotnoW}×${o.plotnoH} px (dpr ${+o.dpr.toFixed(2)}${roz}${o.limit ? `, limit ${o.limit} kl/s` : ''})`, SLABO); nowa();
  const nazwa = k.nazwa.length > 47 ? k.nazwa.slice(0, 46) + '…' : k.nazwa;
  pisz(`karta: ${nazwa}`, k.programowa ? ALARM : SLABO); nowa();
  if (k.programowa) pisz('karta programowa — rysuje procesor (brak sterownika karty?)', ALARM);
  else if (k.plotnoSprzetowe === 'nie') {
    pisz(k.poRestarcie ? 'płótno PROGRAMOWE — uruchom grę ponownie (wymusi kartę)' : `płótno PROGRAMOWE — rysuje procesor${k.plotnoStan ? ` (${k.plotnoStan})` : ''}`, ALARM);
  } else if (k.plotnoSprzetowe === 'tak') pisz(`płótno przez kartę graficzną${k.wymuszona ? ' (wymuszona)' : ''}`, DOBRZE);
  else pisz('płótno: przeglądarka nie mówi, czy przez kartę', SLABO);
  ctx.restore();
}
