// Wzorzec zapisu gry (core/save.ts) do testu C#: testy/Trzewia.Testy/ZapisTesty.cs. Partia z botem do tiku, zapis,
// wczytanie i dalsza gra wczytanej partii. Skróty: FNV-1a 64 po kanonicznym zapisie (stan.ts: kanon) — zapisu
// (JSON.parse, czyli same dane: klucze posortowane, bez null), stanu po wczytaniu i stanu po `dalej` tikach.
// Każda para [ziarno, tik] idzie w świeżej stronie (OSOBNO=1 w chromium.mjs).
import { Sim } from '../../../alpha-1/src/sim/sim';
import { serialize, restore } from '../../../alpha-1/src/core/save';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { kanon } from './stan';
import { fnv64 } from './zlote';

export function zapisyBota(pary: [number, number][], styl: string, dalej: number, zTekstem = false) {
  return pary.map(([ziarno, tik]) => {
    const sim = new Sim(ziarno);
    while (sim.tick < tik && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, styl as never); }
    const tekst = serialize(sim);
    const r = restore(tekst)!;
    const poWczytaniu = fnv64(kanon(r));
    for (let i = 0; i < dalej && !r.ending; i++) { r.step(); if (r.tick % BOT_CO === 0) ruchBota(r, styl as never); }
    return {
      ziarno, tik: sim.tick, zapis: fnv64(kanon(JSON.parse(tekst))), poWczytaniu, poKrokach: fnv64(kanon(r)), tikPo: r.tick,
      ...(zTekstem ? { tekst } : {}),
    };
  });
}
