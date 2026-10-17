// Próbni gracze z dziennikiem anomalii: node scripts/proby-graczy.mjs . <ziarno> <budowniczy|speedrun> <minut> <plik.log>
// (obok: plik.anom — utknięcia, krążenie, głód mimo jedzenia, postoje drogi; plik.dz — dziennik dewelopera)
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const [repo, ziarno, styl, minut, plik] = process.argv.slice(2);
const k = mkdtempSync(join(tmpdir(), 'pr-'));
const src = (f) => JSON.stringify(join(repo, 'src', f));
writeFileSync(join(k, 'e.ts'), `
import { Sim } from ${src('sim/sim.ts')};
import { Race } from ${src('sim/races.ts')};
import { T } from ${src('sim/tiles.ts')};
import { seed, sign, whisper } from ${src('powers/powers.ts')};
import { rozstrzygnij } from ${src('sim/wydarzenia.ts')};
import { Job } from ${src('sim/creatures.ts')};
import { gniazdaWSkale } from ${src('sim/lud.ts')};
import { czoloDrogi } from ${src('sim/pielgrzymka.ts')};
import { DZIENNIK } from ${src('sim/dziennik.ts')};
import { procentSkorupy } from ${src('sim/rytual.ts')};

const M = 7200;
const t = (sim: any) => (sim.tick / M).toFixed(2) + 'm';
const zywi = (sim: any) => sim.creatures.filter((c: any) => !c.dead && c.race === Race.GOBLIN);
function role(sim: any) { const r: any = { pobozny: 0, robotnik: 0, rycerz: 0 }; for (const c of zywi(sim)) if (!c.buntownik) r[c.rola ?? 'pobozny']++; return r; }
function jedzenie(sim: any) { const k = sim.clans.find((x: any) => !x.dead && x.race === Race.GOBLIN); return (k ? k.stock : 0) + (sim.lud.spizarnie ?? []).reduce((s: number, o: any) => s + o.ilosc, 0); }

function wspolne(sim: any, out: string[]) {
  const r = role(sim);
  // ratunek głodnych: grzyb pod nogi
  let najg: any = null;
  for (const c of zywi(sim)) if (c.hunger > 0.65 && (!najg || c.hunger > najg.hunger)) najg = c;
  if (najg && sim.krew > 60 && sim.tick % 600 === 0) seed(sim, 'grzyb', Math.round(najg.x), Math.round(najg.y));
  // rycerze z gniazd: przemyśl i kop (pokazane gniazdo — jeden; nieznane — trzech)
  const torTrwa = sim.creatures.some((c: any) => !c.dead && (c.tor || c.przemysl !== undefined));
  if (!torTrwa && r.robotnik >= 2 && r.rycerz < 6 && gniazdaWSkale(sim).length && sim.tick - (sim._przemysl ?? -1e9) > 3600) {
    const znane = gniazdaWSkale(sim).some((g: any) => g.znany);
    const ilu = znane ? 1 : 3;
    if (sim.wiara >= 6 * ilu) {
      let n = 0;
      for (const c of zywi(sim)) if (n < ilu && c.rola === 'robotnik' && c.hunger < 0.45 && whisper(sim, 'przemysl', c)) n++;
      if (n) { sim._przemysl = sim.tick; out.push(t(sim) + ' GRACZ przemyśl i kop ×' + n + (znane ? ' (gniazdo pokazane)' : '')); }
    }
  }
}

function budowniczy(sim: any, out: string[]) {
  const r = role(sim);
  const e = sim.wydarzenia.biezace;
  if (e) {
    const i = e.rodzaj === 'warta' && !sim._wymarsz ? 2 : e.rozsadny;
    if (rozstrzygnij(sim, i) !== null) rozstrzygnij(sim, e.domyslny);
    out.push(t(sim) + ' KARTA ' + e.rodzaj + ' -> ' + (e.wybory[i]?.etykieta ?? e.wybory[i]?.id ?? i));
    return;
  }
  sim.lud.rola = r.robotnik < 6 ? 'robotnik' : r.pobozny < 6 ? 'pobozny' : r.robotnik < 7 ? 'robotnik' : 'pobozny';
  wspolne(sim, out);
  // kop losowo rycerzem, gdy gniazda jeszcze śpią i nic innego ich nie szuka (raz na 90 s)
  if (gniazdaWSkale(sim).length && sim.wiara >= 20 && sim.tick - (sim._losowo ?? -1e9) > 10800 && !sim.lud.straznicy?.trwa) {
    const ryc = zywi(sim).find((c: any) => c.rola === 'rycerz' && !c.losowo && c.hunger < 0.5);
    if (ryc && whisper(sim, 'kopLosowo', ryc)) { sim._losowo = sim.tick; out.push(t(sim) + ' GRACZ kop losowo (rycerz #' + ryc.id + ')'); }
  }
  // Cud dla oddania
  if (sim.wiara >= 70 && sim.tick % 2400 === 0) {
    const k = sim.clans.find((x: any) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.9 && sign(sim, 'objawienie', k.hx, k.hy)) out.push(t(sim) + ' GRACZ Cud (oddanie ' + k.devotion.toFixed(2) + ')');
  }
  // wymarsz, gdy wszystkiego dużo
  if (!sim._wymarsz) {
    const plan = sim.planDrogi ? sim.planDrogi.kopac.length : 99;
    const gotowy = zywi(sim).length >= 12 && jedzenie(sim) >= 150 && (r.rycerz >= 3 || !gniazdaWSkale(sim).length) && sim.krew >= 40 && plan === 0;
    if (gotowy || sim.tick > 16 * M) {
      sim._wymarsz = sim.tick;
      out.push(t(sim) + ' GRACZ === WYMARSZ === ' + (gotowy ? 'gotowy' : 'limit czasu') + ': ludzi ' + zywi(sim).length + ', jedzenie ' + jedzenie(sim) + ', rycerzy ' + r.rycerz + ', krew ' + Math.round(sim.krew) + ', plan ' + plan);
    }
  }
  if (sim._wymarsz && sim.tick % 600 === 0) {
    let n = 0;
    for (const c of zywi(sim)) if (c.rola === 'pobozny' && c.job !== Job.PIELGRZYM && !c.wyprawa && c.hunger < 0.5 && sim.wiara >= 8 && whisper(sim, 'modl', c)) n++;
    if (n) out.push(t(sim) + ' GRACZ módl się ×' + n);
  }
}

function speedrun(sim: any, out: string[]) {
  const r = role(sim);
  const e = sim.wydarzenia.biezace;
  if (e) {
    let i = e.rozsadny;
    if (e.rodzaj === 'warta') i = rozstrzygnij(sim, 1) === null ? -1 : 0;
    if (i >= 0 && rozstrzygnij(sim, i) !== null) rozstrzygnij(sim, e.domyslny);
    out.push(t(sim) + ' KARTA ' + e.rodzaj + ' -> ' + (i < 0 ? 'poslJedz' : (e.wybory[i]?.id ?? i)));
    return;
  }
  sim.lud.rola = r.pobozny < 5 ? 'pobozny' : r.robotnik < 4 ? 'robotnik' : 'pobozny';
  wspolne(sim, out);
  if (sim.wiara >= 30 && sim.tick % 1200 === 0) {
    const k = sim.clans.find((x: any) => !x.dead && x.race === Race.GOBLIN);
    if (k && k.devotion < 0.95 && sign(sim, 'objawienie', k.hx, k.hy)) out.push(t(sim) + ' GRACZ Cud (oddanie ' + k.devotion.toFixed(2) + ')');
  }
  if (sim.tick % 600 === 0) {
    let n = 0;
    for (const c of zywi(sim)) if (c.rola === 'pobozny' && c.job !== Job.PIELGRZYM && !c.wyprawa && sim.wiara >= 8 && whisper(sim, 'modl', c)) n++;
    if (n) out.push(t(sim) + ' GRACZ módl się ×' + n);
  }
}

// ---------------------------------------------------------------- monitoring
const RUCHOME = new Set([Job.WANDER, Job.ZAPAS, Job.ZBIERA, Job.HAUL, Job.DOSTAWA, Job.FLEE, Job.EAT].filter((x) => x !== undefined));
export function run(z: number, styl: string, minut: number) {
  const sim: any = new Sim(z);
  const w = sim.world;
  const out: string[] = [], anom: string[] = [], dz: string[] = [];
  DZIENNIK.wlaczony = true; DZIENNIK.max = 100000;
  let dzOd = 0;
  const hist = new Map<number, { x: number; y: number; zam: string; job: number; jx: number; jy: number; t: number }[]>();
  const zgloszone = new Map<string, number>();
  const zglos = (klucz: string, tekst: string) => { const o = zgloszone.get(klucz); if (o !== undefined && sim.tick - o < 2 * M) return; zgloszone.set(klucz, sim.tick); anom.push(t(sim) + ' ' + tekst); };
  const kill0 = sim.kill.bind(sim);
  sim.kill = (c: any, why: string, tag?: string) => {
    if (c.race === Race.GOBLIN && !c.dead) {
      const jedz = jedzenie(sim);
      out.push(t(sim) + ' ZGON ' + (c.rola ?? '?') + ' #' + c.id + ' [' + tag + '] ' + why + ' | ' + (c.zamiar ?? '') + ' | głód ' + c.hunger.toFixed(2) + ' @' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ' | jedzenie w spiżarniach ' + jedz);
      if (/wycieńcz|głod/.test(why) && jedz > 20) zglos('glod' + c.id, 'GŁÓD MIMO JEDZENIA: ' + (c.rola) + ' #' + c.id + ' zmarł z głodu, a w spiżarniach ' + jedz + ' | ' + (c.zamiar ?? '') + ' @' + c.x.toFixed(0) + ',' + c.y.toFixed(0));
    }
    return kill0(c, why, tag);
  };
  const ef0 = sim.efekt.bind(sim);
  sim.efekt = (x: number, y: number, rodz: string, napis?: string) => { if (rodz === 'mysl' && napis && /zgubił|zagrodził|pusto|milczy/.test(napis)) out.push(t(sim) + ' TUNEL: ' + napis + ' @' + Math.round(x) + ',' + Math.round(y)); return ef0(x, y, rodz, napis); };
  let czolo = -1, czoloOd = 0, wyjatki = 0, kronikaOd = 0;
  const gracz = styl === 'speedrun' ? speedrun : budowniczy;
  for (let i = 0; i < minut * M && !sim.ending; i++) {
    try { sim.step(); if (i % 60 === 0) gracz(sim, out); }
    catch (err: any) { wyjatki++; if (wyjatki < 5) anom.push(t(sim) + ' WYJĄTEK: ' + (err?.stack ?? err).toString().split('\\n').slice(0, 4).join(' | ')); }
    if (i % 120 !== 0) continue;
    // kronika i dziennik
    for (; kronikaOd < sim.chronicle.length; kronikaOd++) { const e = sim.chronicle[kronikaOd]; out.push((e.tick / M).toFixed(2) + 'm KRONIKA ' + e.text); }
    for (const wp of DZIENNIK.wpisy) if (wp.nr >= dzOd) { dz.push((wp.tick / M).toFixed(2) + 'm [' + wp.kat + '] ' + wp.tekst); dzOd = wp.nr + 1; }
    if (DZIENNIK.wpisy.length > 5000) DZIENNIK.wpisy.length = 0;
    // postacie
    for (const c of zywi(sim)) {
      let h = hist.get(c.id); if (!h) { h = []; hist.set(c.id, h); }
      h.push({ x: c.x, y: c.y, zam: c.zamiar ?? '', job: c.job, jx: c.jx, jy: c.jy, t: sim.tick });
      if (h.length > 61) h.shift();
      if (h.length < 61) continue;
      const a = h[0], b = h[h.length - 1];
      let droga = 0, maxD = 0;
      for (let k = 1; k < h.length; k++) { droga += Math.hypot(h[k].x - h[k - 1].x, h[k].y - h[k - 1].y); maxD = Math.max(maxD, Math.hypot(h[k].x - a.x, h[k].y - a.y)); }
      const netto = Math.hypot(b.x - a.x, b.y - a.y);
      const tenSamZamiar = h.every((q) => q.zam === b.zam);
      const opis = (c.rola ?? '?') + ' #' + c.id + ' @' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ' job=' + Job[c.job] + ' "' + (c.zamiar ?? '') + '" głód ' + c.hunger.toFixed(2) + ' droga=' + (c.droga ? c.droga.length : '-');
      if (RUCHOME.has(c.job) && maxD < 1.5 && h.every((q) => q.job === c.job)) zglos('stoi' + c.id, 'STOI 60 s przy zadaniu ruchomym: ' + opis);
      if (droga > 50 && netto < 5 && maxD < 12 && h.every((q) => q.job === c.job)) zglos('kraz' + c.id, 'KRĄŻY (60 s: ' + droga.toFixed(0) + ' kafli, netto ' + netto.toFixed(1) + '): ' + opis);
      if (c.job === Job.DIG && h.every((q) => q.jx === c.jx && q.jy === c.jy) && w.solid(c.jx, c.jy) && !c.tor) zglos('kop' + c.id, 'KOPIE TEN SAM KAFEL 60 s (' + c.jx + ',' + c.jy + ', twardość ' + w.hardness(c.jx, c.jy).toFixed(1) + ', odległość ' + Math.hypot(c.jx + 0.5 - c.x, c.jy + 0.5 - c.y).toFixed(1) + '): ' + opis);
      if (c.job === Job.PIELGRZYM && sim.planDrogi && sim.planDrogi.kopac.length === 0 && Math.hypot(c.x - w.coreX, c.y - w.przedsionekY) > 12 && maxD < 2) zglos('pielg' + c.id, 'PIELGRZYM STOI w drodze pod rdzeń (droga gotowa): ' + opis);
      if (c.rola === 'rycerz' && sim.lud.straznicy?.trwa && /odchodzi spod rdzenia/.test(c.zamiar ?? '')) zglos('ryc' + c.id, 'RYCERZ UCIEKA w czasie fali: ' + opis);
      if (tenSamZamiar && /wraca do siedziby|wraca do swojego tunelu/.test(b.zam) && maxD < 2) zglos('wraca' + c.id, 'NIE MOŻE WRÓCIĆ: ' + opis);
    }
    // czoło drogi
    const cz = czoloDrogi(sim);
    if (cz !== czolo) { czolo = cz; czoloOd = sim.tick; }
    else if (cz >= 0 && sim.tick - czoloOd > 90 * 120 && (sim.tick - czoloOd) % (60 * 120) < 120) {
      const kop = zywi(sim).filter((c: any) => c.kopieDroge);
      zglos('czolo' + cz, 'CZOŁO DROGI STOI ' + ((sim.tick - czoloOd) / 120).toFixed(0) + ' s @' + (cz % w.w) + ',' + ((cz / w.w) | 0) + ' magma2=' + (sim.przyMagmie(cz % w.w, (cz / w.w) | 0, 2) ? 1 : 0) + ' kopaczy ' + kop.length + ' [' + kop.map((c: any) => '#' + c.id + ' @' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ' ' + Job[c.job]).join(', ') + ']');
    }
    // stan co 30 s
    if (i % (30 * 120) === 0) {
      const r = role(sim);
      const k = sim.clans.find((x: any) => !x.dead && x.race === Race.GOBLIN);
      const zam: any = {};
      for (const c of zywi(sim)) { const z = (c.zamiar ?? '-').replace(/[0-9#(].*$/, '').trim().slice(0, 30); zam[z] = (zam[z] ?? 0) + 1; }
      let liny = 0; for (let j = 0; j < w.drabina.length; j++) if (w.drabina[j]) liny++;
      out.push(t(sim) + ' STAN pob=' + r.pobozny + ' rob=' + r.robotnik + ' ryc=' + r.rycerz + ' krew=' + Math.round(sim.krew) + ' wiara=' + Math.round(sim.wiara) + ' jedz=' + jedzenie(sim) + ' oddanie=' + (k ? k.devotion.toFixed(2) : '-') + ' plan=' + (sim.planDrogi ? sim.planDrogi.kopac.length : '-') + ' pęk=' + sim.rytual.pekniecia + ' skorupa=' + procentSkorupy(sim) + '% fala=' + (sim.lud.straznicy ? sim.lud.straznicy.fala + (sim.lud.straznicy.trwa ? '!' : '') : '-') + ' gniazd=' + (sim.lud.gniazda ?? []).filter((g: any) => g.odkryte).length + '/' + (sim.lud.gniazda ?? []).length + ' liny=' + liny + ' | ' + Object.entries(zam).sort((a: any, b: any) => b[1] - a[1]).map(([a, b]) => b + '× ' + a).join('; '));
    }
  }
  out.push('KONIEC ' + (sim.ending ?? 'brak (limit czasu)') + ' @' + t(sim) + ' wyjątków ' + wyjatki + ' zgonów ' + [...sim.deaths.values()].reduce((a: number, b: number) => a + b, 0));
  return { log: out.join('\\n'), anom: anom.join('\\n'), dz: dz.join('\\n') };
}
`);
await build({ entryPoints: [join(k, 'e.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(k, 'e.mjs'), logLevel: 'error' });
const m = await import(pathToFileURL(join(k, 'e.mjs')).href);
const r = m.run(Number(ziarno), styl, Number(minut));
writeFileSync(plik, r.log);
writeFileSync(plik.replace('.log', '.anom'), r.anom);
writeFileSync(plik.replace('.log', '.dz'), r.dz);
console.log(styl, ziarno, r.log.split('\n').pop());
