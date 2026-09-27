import type { Plate } from './plate';
import { SERIF } from './ink';
import { TELEFON } from '../nastawy/ekran';

export type AkcjaPrzycisku = 'pauza' | 'wolniej' | 'szybciej' | 'zapiski' | 'atlas' | 'legenda' | 'kamera' | 'zapis';

export interface Przycisk {
  akcja: AkcjaPrzycisku;
  x: number; y: number; r: number;
  etykieta: string;
  wlaczony?: boolean;
  /** Na wąskim ekranie pasek leży na dolnej krawędzi płyty i potrzebuje podkładu. */
  naPlycie?: boolean;
}

/**
 * Nacięcia przy dolnej krawędzi płyty. Wszystko, co dotąd dało się zrobić tylko
 * z klawiatury — pauza, tempo, zapiski, klucz, powrót kamery, zapis — ma tu swój znak,
 * bo na dotyku klawiatury nie ma wcale.
 */
/** Lewa krawędź rzędu przycisków na szerokim ekranie — obok niego układa się Otchłań. */
export function lewaKrawedzPrzyciskow(p: Plate): number {
  const r = Math.max(22, Math.min(26, p.w * 0.02));
  return p.x + p.w - r * 2.3 * 7 - r * 1.2 - r;
}

export function rozmiescPrzyciski(p: Plate, vh: number, stan: { pauza: boolean; zapiski: boolean; legenda: boolean; tempo: number; noweTablice?: number }): Przycisk[] {
  const wszystkie: { akcja: AkcjaPrzycisku; etykieta: string; wlaczony?: boolean }[] = [
    { akcja: 'pauza', etykieta: stan.pauza ? 'wznów' : 'pauza', wlaczony: stan.pauza },
    { akcja: 'wolniej', etykieta: 'wolniej' },
    { akcja: 'szybciej', etykieta: `szybciej (×${stan.tempo})` },
    { akcja: 'kamera', etykieta: 'wróć do swoich' },
    { akcja: 'zapiski', etykieta: 'zapiski', wlaczony: stan.zapiski },
    { akcja: 'atlas', etykieta: stan.noweTablice ? `atlas — nowe tablice: ${stan.noweTablice}` : 'atlas', wlaczony: !!stan.noweTablice },
    { akcja: 'legenda', etykieta: 'klucz', wlaczony: stan.legenda },
    { akcja: 'zapis', etykieta: 'zapisz' },
  ];
  // telefon: klucz i ręczny zapis zostają pod klawiszami — zapis i tak dzieje się sam,
  // a osiem znaków na wąskiej płycie nachodziło na siebie
  const lista = p.waski || p.niski ? wszystkie.filter((b) => b.akcja !== 'legenda' && b.akcja !== 'zapis') : wszystkie;
  const n = lista.length;
  // TELEFON pionowo: rząd pod płytą (przyciski nie zasłaniają już świata);
  // poziomo: kolumna w prawym marginesie
  if (p.waski) {
    const r = Math.min(TELEFON.pion.przyciskR, (p.w + p.left - 16) / n * 0.42);
    const odstep = (p.w + p.left - 16) / n;
    const x0 = 8 + odstep / 2;
    const y = p.y + p.h + 12 + r;
    return lista.map((z, i) => ({ ...z, x: x0 + i * odstep, y, r }));
  }
  if (p.niski) {
    const odstep = (p.h + 12) / n;
    const r = Math.min(TELEFON.poziom.przyciskR, odstep * 0.42);
    const x = p.x + p.w + p.right / 2 + 2;
    const y0 = p.y - 6 + odstep / 2;
    return lista.map((z, i) => ({ ...z, x, y: y0 + i * odstep, r }));
  }
  // na wąskim ekranie pasek idzie na sam dół, bo margines pod płytą zajmuje spis warstw;
  // 44 px to minimalne pole dotyku — ale znaki nie mogą na siebie wchodzić
  const odstepW = (p.w - 12) / n;
  const r = Math.max(22, Math.min(26, p.w * 0.02));
  const odstep = r * 2.3;
  const y = Math.min(vh - r * 1.6, p.y + p.h + r * 1.8);
  const x0 = p.x + p.w - odstep * (n - 1) - r * 1.2;
  void odstepW;
  return lista.map((z, i) => ({ ...z, x: x0 + i * odstep, y, r }));
}

export function rysujPrzyciski(ctx: CanvasRenderingContext2D, lista: Przycisk[], podKursorem: AkcjaPrzycisku | null, teraz: number): void {
  ctx.save();
  if (lista.length && lista[0].naPlycie) {       // podkład, żeby znaki nie ginęły w rycinie
    const r = lista[0].r;
    const x0 = lista[0].x - r * 1.6, x1 = lista[lista.length - 1].x + r * 1.6;
    const g = ctx.createLinearGradient(0, lista[0].y - r * 2.2, 0, lista[0].y + r * 2.2);
    g.addColorStop(0, 'rgba(10,7,6,0)');
    g.addColorStop(0.45, 'rgba(10,7,6,0.82)');
    g.addColorStop(1, 'rgba(10,7,6,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, lista[0].y - r * 2.2, x1 - x0, r * 4.4);
  }
  for (const b of lista) {
    const aktywny = b.wlaczony || podKursorem === b.akcja;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = `rgba(216,200,172,${aktywny ? 0.95 : 0.5})`;
    ctx.lineWidth = aktywny ? 1.6 : 1.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.stroke();
    if (b.wlaczony) {
      ctx.fillStyle = 'rgba(206,176,120,0.18)';
      ctx.fill();
    }
    znak(ctx, b.akcja, b.r * 0.52, teraz);
    ctx.restore();
  }

  const opis = lista.find((b) => b.akcja === podKursorem);
  if (opis) {
    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.max(14, opis.r * 0.95)}px ${SERIF}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,7,6,0.85)';
    ctx.strokeText(opis.etykieta, opis.x, opis.y - opis.r * 1.7);
    ctx.fillStyle = 'rgba(240,226,198,0.97)';
    ctx.fillText(opis.etykieta, opis.x, opis.y - opis.r * 1.7);
  }
  ctx.restore();
}

function znak(ctx: CanvasRenderingContext2D, akcja: AkcjaPrzycisku, u: number, teraz: number): void {
  ctx.beginPath();
  switch (akcja) {
    case 'pauza':
      ctx.moveTo(-u * 0.45, -u); ctx.lineTo(-u * 0.45, u);
      ctx.moveTo(u * 0.45, -u); ctx.lineTo(u * 0.45, u);
      break;
    case 'wolniej':
      ctx.moveTo(u * 0.8, -u); ctx.lineTo(-u * 0.5, 0); ctx.lineTo(u * 0.8, u);
      break;
    case 'szybciej':
      ctx.moveTo(-u * 0.8, -u); ctx.lineTo(u * 0.5, 0); ctx.lineTo(-u * 0.8, u);
      break;
    case 'kamera': {                       // oko z okiem w środku: wróć do żywych
      ctx.moveTo(-u, 0);
      ctx.quadraticCurveTo(0, -u * 1.1, u, 0);
      ctx.quadraticCurveTo(0, u * 1.1, -u, 0);
      ctx.moveTo(u * 0.32, 0);
      ctx.arc(0, 0, u * 0.32, 0, Math.PI * 2);
      break;
    }
    case 'zapiski':                        // karty
      ctx.moveTo(-u * 0.8, -u); ctx.lineTo(u * 0.8, -u);
      ctx.moveTo(-u * 0.8, -u * 0.2); ctx.lineTo(u * 0.5, -u * 0.2);
      ctx.moveTo(-u * 0.8, u * 0.6); ctx.lineTo(u * 0.8, u * 0.6);
      break;
    case 'atlas':                          // otwarta księga: dwie karty i grzbiet
      ctx.moveTo(0, -u * 0.7); ctx.lineTo(0, u * 0.9);
      ctx.moveTo(0, -u * 0.7); ctx.quadraticCurveTo(-u * 0.5, -u, -u, -u * 0.75); ctx.lineTo(-u, u * 0.7);
      ctx.quadraticCurveTo(-u * 0.5, u * 0.5, 0, u * 0.9);
      ctx.moveTo(0, -u * 0.7); ctx.quadraticCurveTo(u * 0.5, -u, u, -u * 0.75); ctx.lineTo(u, u * 0.7);
      ctx.quadraticCurveTo(u * 0.5, u * 0.5, 0, u * 0.9);
      break;
    case 'legenda':                        // klucz
      ctx.arc(-u * 0.35, 0, u * 0.42, 0, Math.PI * 2);
      ctx.moveTo(u * 0.05, 0); ctx.lineTo(u, 0);
      ctx.moveTo(u * 0.7, 0); ctx.lineTo(u * 0.7, u * 0.4);
      break;
    case 'zapis': {                        // zwój ze sznurkiem: „odłóż tę górę na potem"
      ctx.moveTo(-u * 0.85, -u * 0.8); ctx.lineTo(u * 0.85, -u * 0.8);
      ctx.moveTo(-u * 0.85, u * 0.8); ctx.lineTo(u * 0.85, u * 0.8);
      ctx.moveTo(-u * 0.85, -u * 0.8); ctx.lineTo(-u * 0.85, u * 0.8);
      ctx.moveTo(u * 0.85, -u * 0.8); ctx.lineTo(u * 0.85, u * 0.8);
      ctx.moveTo(-u * 0.35, -u * 0.8); ctx.lineTo(-u * 0.35, u * 0.15);
      ctx.moveTo(u * 0.35, -u * 0.8); ctx.lineTo(u * 0.35, u * 0.15);
      ctx.moveTo(-u * 0.35, u * 0.15); ctx.lineTo(u * 0.35, u * 0.15);
      break;
    }
  }
  ctx.stroke();
  void teraz;
}

export function przyciskPod(lista: Przycisk[], x: number, y: number): Przycisk | null {
  for (const b of lista) {
    if (Math.hypot(b.x - x, b.y - y) <= Math.max(22, b.r)) return b;
  }
  return null;
}
