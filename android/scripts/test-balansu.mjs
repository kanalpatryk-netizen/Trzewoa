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
import { seed, sign, whisper } from ${src('powers/powers.ts')};
import { rozstrzygnij } from ${src('sim/wydarzenia.ts')};
import { Job } from ${src('sim/creatures.ts')};
import { aktualnyPlan } from ${src('sim/pielgrzymka.ts')};

const NA_MINUTE = 7200;

/**
 * Rozsądny gracz wersji na telefon: odpowiada na karty wydarzeń tak, jak radzi zdrowy rozsądek
 * (pole `rozsadny` karty), karmi głodnych grzybem, stawia Cud przy najwierniejszych
 * i szepcze „módl się”, gdy przy przedsionku jest co jeść. Nie drąży i nie zawala — tego
 * w tej wersji nie ma.
 */
function ruchGracza(sim: any) {
  const w = sim.world;
  sim.wydarzenia.gracz = true;

  // 0. karta wydarzenia: rozsądny wybór, a gdy go nie stać — domyślny
  const e = sim.wydarzenia.biezace;
  if (e) {
    if (rozstrzygnij(sim, e.rozsadny) !== null) rozstrzygnij(sim, e.domyslny);
    return;
  }

  // 1. głodujący dostają grzyb pod nogi (ale nie dominująca rasa — tę się nie dokarmia)
  let najgorszy: any = null;
  for (const c of sim.creatures) {
    if (c.dead || c.race === Race.HUMAN || c.race === Race.DWARF) continue;
    if (c.hunger < 0.6) continue;
    if (c.race === sim.domRace && sim.dominance > 0.7) continue;
    if (!najgorszy || c.hunger > najgorszy.hunger) najgorszy = c;
  }
  if (najgorszy && sim.krew > 40 && najgorszy.race !== sim.domRace) {
    seed(sim, 'grzyb', Math.round(najgorszy.x), Math.round(najgorszy.y));
  }

  // 2. droga pielgrzymów: grzyb w przedsionku, żeby warta miała co jeść
  if (sim.tick % 900 === 0 && sim.krew > 60 && sim.jedzeniePrzedsionka < 3) {
    for (let k = 0; k < 4; k++) seed(sim, 'grzyb', w.coreX + (k - 2) * 3, w.przedsionekY);
  }

  // 3. Cud przy najwierniejszych — oddanie rośnie, a z nim rytuał
  if (sim.wiara >= 60 && sim.tick % 1200 === 0) {
    const klan = sim.clans.filter((k: any) => !k.dead && k.pop > 2)
      .sort((a: any, b: any) => b.devotion - a.devotion)[0];
    if (klan && klan.devotion < 0.7) sign(sim, 'objawienie', klan.hx, klan.hy);
  }

  // 4. monokulturę rozbija się prorokiem
  if (sim.dominance > 0.72 && sim.wiara > 40 && sim.tick % 1800 === 0) {
    const klan = sim.clans.filter((k: any) => !k.dead && k.race === sim.domRace && k.pop > 14)
      .sort((a: any, b: any) => b.pop - a.pop)[0];
    const glos = klan && sim.creatures.find((c: any) => !c.dead && c.clan === klan.id && !c.prophet);
    if (glos) whisper(sim, 'prorok', glos);
  }

  // 5. szept „módl się”: gdy przy przedsionku rośnie grzyb, trzech wiernych idzie pod rdzeń
  if (sim.tick % 600 === 0 && !sim.rytual.otwarta && sim.jedzeniePrzedsionka >= 3 && sim.wiara >= 8) {
    const klan = sim.clans.filter((k: any) => !k.dead && k.pop >= 6 && k.race !== Race.TROLL && k.race !== Race.HUMAN && k.race !== Race.MYCELIUM)
      .sort((a: any, b: any) => b.devotion - a.devotion)[0];
    if (klan) {
      let idzie = 0;
      for (const c of sim.creatures) if (!c.dead && c.clan === klan.id && c.job === Job.PIELGRZYM) idzie++;
      for (const c of sim.creatures) {
        if (idzie >= 3 || sim.wiara < 8) break;
        if (c.dead || c.clan !== klan.id || c.job === Job.PIELGRZYM || c.hunger > 0.35) continue;
        if (whisper(sim, 'modl', c)) idzie++;
      }
    }
  }
}

export function pomiar(ziaren: number, maksMinut: number) {
  const wyniki: any[] = [];
  for (let z = 0; z < ziaren; z++) {
    for (const zGraczem of [false, true]) {
      const sim: any = new Sim(z * 104729 + 17);
      // spis ras powstaje dopiero w pierwszym kroku — liczony przed nim był pusty
      // i test nigdy nie widział żadnej wymarłej rasy
      const rasyNaStarcie = new Set<number>();
      let rasyWymarle = 0, klanyWymarle = 0;
      const znikle = new Set<number>();
      const wymarleRasy: { rasa: number; minuta: number }[] = [];
      const populacja: number[] = [];
      const maks = maksMinut * NA_MINUTE;
      let i = 0;
      for (; i < maks && !sim.ending; i++) {
        sim.step();
        if (i === 0) for (let r = 0; r < RACE_COUNT; r++) if (r !== Race.MYCELIUM && sim.popByRace[r] > 0) rasyNaStarcie.add(r);
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
      const zywi = sim.creatures.filter((c: any) => !c.dead).length;
      wyniki.push({
        ziarno: z, gracz: zGraczem,
        koniec: sim.ending ?? 'brak (limit)',
        minut: +(sim.tick / NA_MINUTE).toFixed(1),
        pekniecia: sim.rytual.pekniecia,
        najlepszyRytual: +Math.max(0, ...sim.clans.map((k: any) => k.rytual)).toFixed(2),
        rasyWymarle, klanyWymarle, klanowRazem: sim.clans.length,
        zywi,
        dominacja: +sim.dominance.toFixed(2),
        przybyszow: sim.przybyszow,
        wymarleRasy,
        populacja,
        // dlaczego się skończyło: sen z pustki czy sen z monokultury
        // (garstka ocalałych z jednej krwi to pustka, choć dominacja wychodzi 1)
        powod: sim.ending === 'sen'
          ? (zywi >= 10 && sim.dominance > 0.8 ? 'sen/monokultura' : 'sen/pustka')
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
