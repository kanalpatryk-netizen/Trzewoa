// Wzorzec podpowiedzi (sim/podpowiedzi.ts) do testu C#: testy/Trzewia.Testy/PodpowiedziTesty.cs. Partia z botem,
// co `co` tików kanoniczny zapis podpowiedzi (stan.ts: kanon) — tekst, cel i waga.
import { Sim } from '../../../alpha-1/src/sim/sim';
import { podpowiedz } from '../../../alpha-1/src/sim/podpowiedzi';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { kanon } from './stan';

export function podpowiedziBota(ziarna: number[], styl: string, co: number, doTiku: number): string[][] {
  return ziarna.map((z) => {
    const sim = new Sim(z);
    const out: string[] = [kanon(podpowiedz(sim))];
    for (let t = co; t <= doTiku; t += co) {
      while (sim.tick < t && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, styl as never); }
      out.push(kanon(podpowiedz(sim)));
    }
    return out;
  });
}
