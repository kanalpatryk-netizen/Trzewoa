import type { Plate } from '../render/plate';
import { obszarKrwi, obszarOtchlani, obszarSpisu } from '../render/plate';
import type { Przycisk } from '../render/przyciski';
import { obszarMinimapy } from '../render/minimapa';
import { miejsceKlepsydry } from '../render/tempo';
import type { Ui } from '../ui/ui';
import { ustawienia } from '../core/settings-store';

/** Nazwany prostokąt interfejsu gry. */
export interface ObszarHud { nazwa: string; x: number; y: number; w: number; h: number; }

type Prost = { x: number; y: number; w: number; h: number };

/**
 * Wszystkie stałe elementy interfejsu gry jako prostokąty — narzędzie
 * deweloperskie do automatycznego testu, czy coś na coś nie nachodzi
 * (window.__trzewia.app.aktywnyEkran.obszaryHud()). Nie wpływa na grę.
 */
export function zbierzObszaryHud(d: {
  plate: Plate; vh: number; ui: Ui; przyciski: Przycisk[];
  droga: Prost | null; rada: Prost | null; menu: Prost;
}): ObszarHud[] {
  const { plate: p, vh } = d;
  const out: ObszarHud[] = [];
  const dodaj = (nazwa: string, o: Prost | null | undefined): void => {
    if (o && o.w > 0 && o.h > 0) out.push({ nazwa, x: o.x, y: o.y, w: o.w, h: o.h });
  };
  const kolo = (x: number, y: number, r: number): Prost => ({ x: x - r, y: y - r, w: r * 2, h: r * 2 });

  dodaj('menu', d.menu);
  // klepsydra tak, jak ją widać: znak i podpis „×2” po lewej (pole dotyku jest większe)
  const k = miejsceKlepsydry(p);
  dodaj('klepsydra', { x: k.x - k.s * 1.9, y: k.y - k.s * 0.6, w: k.s * 2.5, h: k.s * 1.2 });
  for (const id of ['ksztaltuj', 'zasiej', 'szept', 'znak', 'skaz']) {
    const m = d.ui.miejsce('verb', id);
    if (m) dodaj(`ryt:${id}`, { x: m.x - m.hw, y: m.y - m.hh, w: m.hw * 2, h: m.hh * 2 });
  }
  for (const b of d.przyciski) dodaj(`przycisk:${b.akcja}`, kolo(b.x, b.y, b.r));
  dodaj('otchlan', obszarOtchlani(p, vh));
  if (ustawienia.spisRas) dodaj('spis', obszarSpisu(p, vh));
  dodaj('krew', obszarKrwi(p, vh));
  if (ustawienia.skalaGlebokosci && !p.waski && !p.niski) dodaj('minimapa', obszarMinimapy(p));
  dodaj('droga', d.droga);
  dodaj('rada', d.rada);
  return out;
}
