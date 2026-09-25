/**
 * Pomiar długości gry. Dwa przebiegi na każde ziarno:
 *   bez gracza  — cel: sen po 15–20 minutach,
 *   z graczem   — rozsądny automat: sieje grzyb przy głodujących, stawia Znak przy
 *                 dominującej rasie, karmi i osłania drogę pielgrzymów.
 *                 Cel: Uwolnienie po 45–70 minutach.
 * Minuta = 7200 tików (tempo ×2 przy 60 klatkach).
 *
 *   node scripts/test-balansu.mjs [ziaren] [maks. minut]
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ZIAREN = Number(process.argv[2] ?? 3);
const MAKS_MINUT = Number(process.argv[3] ?? 90);
const katalog = mkdtempSync(join(tmpdir(), 'trzewia-balans-'));
const wejscie = join(katalog, 'wejscie.ts');
const wyjscie = join(katalog, 'wyjscie.mjs');
const src = (f) => JSON.stringify(join(process.cwd(), 'src', f));

writeFileSync(wejscie, `
import { Sim } from ${src('sim/sim.ts')};
import { Race, RACE_COUNT } from ${src('sim/races.ts')};
import { T } from ${src('sim/tiles.ts')};
import { shape, seed, sign } from ${src('powers/powers.ts')};
import { Job } from ${src('sim/creatures.ts')};

const NA_MINUTE = 7200;

/** Rozsądny gracz: nie optymalny, tylko taki, który rozumie zasady. */
function ruchGracza(sim: any) {
  const w = sim.world;

  // 1. głodujący dostają grzyb pod nogi (ale nie dominująca rasa — tę się nie dokarmia)
  let najgorszy: any = null;
  for (const c of sim.creatures) {
    if (c.dead || c.race === Race.HUMAN) continue;
    if (c.hunger < 0.6) continue;
    if (c.race === sim.domRace && sim.dominance > 0.7) continue;
    if (!najgorszy || c.hunger > najgorszy.hunger) najgorszy = c;
  }
  // Dokarmiamy tylko tych, których jest mało — dosypywanie zwycięzcy to prosta droga
  // do monokultury, a masowe zawały wyludniają górę i usypiają ją z pustki.
  if (najgorszy && sim.krew > 40 && najgorszy.race !== sim.domRace) {
    seed(sim, 'grzyb', Math.round(najgorszy.x), Math.round(najgorszy.y));
  }
  if (sim.dominance > 0.85 && sim.krew > 220 && sim.tick % 1200 === 0) {
    const klan = sim.clans.filter((k: any) => !k.dead && k.race === sim.domRace && k.pop > 8)
      .sort((a: any, b: any) => b.pop - a.pop)[0];
    if (klan) shape(sim, 'zawal', klan.hx + 1, klan.hy);
  }

  // 2. droga pielgrzymów: grzyb w przedsionku, żeby warta miała co jeść
  if (sim.tick % 900 === 0 && sim.krew > 120) {
    for (let k = 0; k < 6; k++) {
      const x = w.coreX + ((k % 5) - 2) * 2;
      const y = w.coreY - 14 + (k < 3 ? 1 : 2);
      seed(sim, 'grzyb', x, y);
    }
  }

  // 3. Znak przy dominującej rasie — oddanie rośnie, a z nim rytuał
  if (sim.wiara >= 60 && sim.tick % 1200 === 0) {
    const klan = sim.clans.filter((k: any) => !k.dead && k.pop > 2)
      .sort((a: any, b: any) => b.devotion - a.devotion)[0];
    if (klan) sign(sim, 'objawienie', klan.hx, klan.hy);
  }

  // 4. przeciw monokulturze hoduje się inne rasy, nie tylko bije dominującą
  if (sim.tick % 400 === 0) {
    // Żużlowcom ruda i żar przy kuźni
    const zuzel = sim.creatures.find((c: any) => !c.dead && c.race === Race.DWARF);
    if (zuzel && sim.krew > 120) {
      seed(sim, 'ruda', Math.round(zuzel.x) + 2, Math.round(zuzel.y));
      if (sim.krew > 260) shape(sim, 'zar', Math.round(zuzel.x) + 6, Math.round(zuzel.y) + 4);
    }
    // Prządkom ktoś słaby w pobliżu i kości
    const przadka = sim.creatures.find((c: any) => !c.dead && c.race === Race.SPINNER);
    if (przadka && sim.krew > 90) seed(sim, 'kosci', Math.round(przadka.x) + 2, Math.round(przadka.y));
    // trole biorą się z głębi: szept „kop w dół" do kogoś, kto już jest nisko
    if (sim.popByRace[Race.TROLL] < 4 && sim.wiara > 60) {
      const gleboki = sim.creatures.find((c: any) => !c.dead && c.race !== Race.HUMAN
        && c.race !== Race.TROLL && w.depth(c.y) > 0.6);
      if (gleboki) { gleboki.thought = 1; gleboki.jt = 0; sim.wiara -= 5; }
    }
  }
  if (sim.dominance > 0.85 && sim.wiara > 40 && sim.tick % 900 === 0) {
    const ofiara = sim.creatures.find((c: any) => !c.dead && c.race === sim.domRace);
    if (ofiara) { ofiara.thought = 2; ofiara.jt = 0; sim.wiara -= 5; }
  }

  // 5. szyb do przedsionka: gracz kopie go sam, kafel po kaflu, gdy ma krew
  if (sim.krew > 90) {
    const najwierniejszy = sim.clans.filter((k: any) => !k.dead && k.pop > 2)
      .sort((a: any, b: any) => b.devotion - a.devotion)[0];
    const startY = najwierniejszy ? najwierniejszy.hy : 40;
    for (let y = startY; y < w.coreY - 14; y++) {
      if (!w.passable(w.coreX, y)) { shape(sim, 'draz', w.coreX, y); break; }
    }
  }
}

export function pomiar(ziaren: number, maksMinut: number) {
  const wyniki: any[] = [];
  for (let z = 0; z < ziaren; z++) {
    for (const zGraczem of [false, true]) {
      const sim: any = new Sim(z * 104729 + 17);
      const rasyNaStarcie = new Set<number>();
      for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM && sim.popByRace[r] > 0) rasyNaStarcie.add(r);
      let rasyWymarle = 0, klanyWymarle = 0;
      const znikle = new Set<number>();
      const wymarleRasy: { rasa: number; minuta: number }[] = [];
      const populacja: number[] = [];
      const maks = maksMinut * NA_MINUTE;
      let i = 0;
      for (; i < maks && !sim.ending; i++) {
        sim.step();
        if (zGraczem && i % 60 === 0) ruchGracza(sim);
        if (i % 600 === 0) {
          for (const r of rasyNaStarcie) {
            if (sim.popByRace[r] === 0 && !znikle.has(r)) {
              znikle.add(r); rasyWymarle++;
              wymarleRasy.push({ rasa: r, minuta: +(sim.tick / NA_MINUTE).toFixed(1) });
            }
          }
        }
        if (i % 1000 === 0) populacja.push(sim.creatures.reduce((n: number, c: any) => n + (c.dead ? 0 : 1), 0));
      }
      klanyWymarle = sim.clans.filter((k: any) => k.dead).length;
      wyniki.push({
        ziarno: z, gracz: zGraczem,
        koniec: sim.ending ?? 'brak (limit)',
        minut: +(sim.tick / NA_MINUTE).toFixed(1),
        pekniecia: sim.rytual.pekniecia,
        najlepszyRytual: +Math.max(0, ...sim.clans.map((k: any) => k.rytual)).toFixed(2),
        rasyWymarle, klanyWymarle, klanowRazem: sim.clans.length,
        zywi: sim.creatures.filter((c: any) => !c.dead).length,
        dominacja: +sim.dominance.toFixed(2),
        przybyszow: sim.przybyszow,
        wymarleRasy,
        populacja,
        // dlaczego się skończyło: sen z pustki czy sen z monokultury
        powod: sim.ending === 'sen'
          ? (sim.dominance > 0.8 ? 'sen/monokultura' : 'sen/pustka')
          : (sim.ending ?? 'limit'),
      });
    }
  }
  return wyniki;
}
`);

await build({ entryPoints: [wejscie], outfile: wyjscie, bundle: true, format: 'esm', platform: 'node', logLevel: 'error' });
const { pomiar } = await import(pathToFileURL(wyjscie).href);
const wyniki = pomiar(ZIAREN, MAKS_MINUT);
for (const w of wyniki) {
  console.log(`${w.gracz ? 'z graczem ' : 'bez gracza'} · ziarno ${w.ziarno} → ${w.powod} po ${w.minut} min` +
    ` · pęknięć ${w.pekniecia} (postęp ${w.najlepszyRytual}) · ras wymarłych ${w.rasyWymarle}` +
    `${w.wymarleRasy.length ? ' [' + w.wymarleRasy.map((z) => `r${z.rasa}@${z.minuta}min`).join(', ') + ']' : ''}` +
    ` · klanów wymarłych ${w.klanyWymarle}/${w.klanowRazem} · przybyszów ${w.przybyszow}` +
    ` · żywych ${w.zywi} · dominacja ${w.dominacja}`);
  const p = w.populacja;
  if (p.length) {
    const co = Math.max(1, Math.floor(p.length / 12));
    console.log(`   populacja co ${co} tys. tików: ${p.filter((_, k) => k % co === 0).join(' ')}`);
  }
}
const bez = wyniki.filter((w) => !w.gracz), z = wyniki.filter((w) => w.gracz);
const sr = (a, f) => +(a.reduce((s, x) => s + f(x), 0) / Math.max(1, a.length)).toFixed(1);
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(1); };
console.log(`\nbez gracza: średnio ${sr(bez, (w) => w.minut)} min (cel 15–20)`);
console.log(`z graczem:  mediana ${mediana(z.map((w) => w.minut))} min (cel 45–70), uwolnień ${z.filter((w) => String(w.koniec).startsWith('uwolnienie')).length}/${z.length}`);
const wczesne = wyniki.filter((w) => w.wymarleRasy.some((z) => z.minuta < 10)).length;
console.log(`rasy wymarłe przed 10. minutą: ${wczesne}/${wyniki.length} przebiegów (cel: najwyżej 1 na 6 ziaren)`);
