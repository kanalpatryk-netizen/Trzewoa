// Płyta świata liczona ORYGINALNYM kodem TS (alpha-1/src) — do porównania z grą C# (testy/Trzewia.Testy/PorownaniePlyty.cs).
// Warstwy w kolejności z app/screens/game.ts (render(): od eng.rysuj do rysujAniola), bez warstw sterowania (zaznaczenie,
// rozkazy, polecenia, ramka, podgląd planu, znaczniki ludu, cel) — tak jak Rysunek/Swiat/PlytaSwiata.cs.
import { Sim } from '../../../alpha-1/src/sim/sim';
import { ruchBota, BOT_CO } from '../../../alpha-1/src/app/bot';
import { Camera } from '../../../alpha-1/src/render/camera';
import { Rycina } from '../../../alpha-1/src/render/rycina';
import { ustawienia } from '../../../alpha-1/src/core/settings-store';
import { Tajemnica } from '../../../alpha-1/src/render/tajemnica';
import { tynkSwiata } from '../../../alpha-1/src/render/fresk';
import { rysujRdzen } from '../../../alpha-1/src/render/rdzen';
import { rysujZyly } from '../../../alpha-1/src/render/zyly';
import { rysujKucie } from '../../../alpha-1/src/render/kucie';
import { Pokoje } from '../../../alpha-1/src/render/pomieszczenia';
import { Oltarz } from '../../../alpha-1/src/render/oltarz';
import { Ruiny } from '../../../alpha-1/src/render/ruiny';
import { rysujLoch, rysujLochNad } from '../../../alpha-1/src/render/loch';
import { rysujSchodyDrogi } from '../../../alpha-1/src/render/schody';
import { rysujBudoweSchodow } from '../../../alpha-1/src/render/budowa-schodow';
import { rysujKatedre, rysujKatedreNad } from '../../../alpha-1/src/render/katedra';
import { smugiSwiatla } from '../../../alpha-1/src/render/shafts';
import { drawParticles } from '../../../alpha-1/src/render/overlay';
import { rysujTrupy } from '../../../alpha-1/src/render/trupy';
import { rysujKonwoj, rysujKonwojNad } from '../../../alpha-1/src/render/konwoj';
import { wysokoscGrzbietu } from '../../../alpha-1/src/render/grzbiet';
import { SURFACE_Y } from '../../../alpha-1/src/sim/world';
import { rysujWiadra, rysujPrzodWiader } from '../../../alpha-1/src/render/wiadro';
import { rysujMrok } from '../../../alpha-1/src/render/mrok';
import { MROK } from '../../../alpha-1/src/nastawy/mrok';
import { rysujPromien } from '../../../alpha-1/src/render/promien';
import { POMNIK } from '../../../alpha-1/src/nastawy/pomnik';
import { rysujPomnik, rysujNadPomnikiem } from '../../../alpha-1/src/render/pomnik';
import { Urobki } from '../../../alpha-1/src/render/kruszce';
import { aktualnyPlan } from '../../../alpha-1/src/sim/pielgrzymka';
import { rysujPlanDrogi, rysujDrogePielgrzymow } from '../../../alpha-1/src/render/pielgrzymka';
import { rysujZarys } from '../../../alpha-1/src/render/zarys';
import { rysujStworzenia } from '../../../alpha-1/src/render/figury';
import { rysujEfekty } from '../../../alpha-1/src/render/efekty';
import { rysujStraznikowWSkale } from '../../../alpha-1/src/render/straznicy';
import { rysujDlon } from '../../../alpha-1/src/render/dlon';
import { rysujDlonDemona } from '../../../alpha-1/src/render/dlon-demona';
import { rysujAniola } from '../../../alpha-1/src/render/aniol';

let sim: any = null, simZiarno = -1;

/** Płyta vw×vh dla partii z botem do `tik`, kamery (x, y, zoom) i chwili `teraz`; `klatek` — ile razy narysować (stan rysunku). */
export function plyta(ziarno: number, tik: number, kam: { x: number; y: number; zoom: number }, vw: number, vh: number, teraz: number, klatek: number) {
  ustawienia.rycinaWWatku = false;
  if (!sim || simZiarno !== ziarno || sim.tick > tik) { sim = new Sim(ziarno); simZiarno = ziarno; }
  while (sim.tick < tik && !sim.ending) { sim.step(); if (sim.tick % BOT_CO === 0) ruchBota(sim, 'rozsadny' as never); }
  const cam = new Camera(vw, vh);
  cam.x = kam.x; cam.y = kam.y; cam.zoom = kam.zoom;
  const p = document.createElement('canvas');
  p.width = vw; p.height = vh;
  const ctx = p.getContext('2d')!;
  const eng = new Rycina(), taj = new Tajemnica(), pokoje = new Pokoje(), oltarz = new Oltarz(), ruiny = new Ruiny(), urobki = new Urobki();
  eng.resize(vw, vh);
  eng.fresk = ustawienia.swiat !== 'rycina';
  const pauza = false, oddech = 0.5;
  for (let k = 0; k < klatek; k++) {
    eng.klatka(sim, cam, teraz, true);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    eng.rysuj(ctx, cam, ustawienia.jasnosc);
    if (eng.fresk) tynkSwiata(ctx, cam);
    eng.poswiata(ctx, cam, true);
    taj.znaki(ctx, sim, cam, oddech, pauza);
    rysujRdzen(ctx, sim, cam, teraz);
    rysujZyly(ctx, sim, cam, teraz);
    rysujKucie(ctx, sim, cam, teraz);
    pokoje.rysujWnetrza(ctx, sim, cam, teraz);
    oltarz.rysuj(ctx, sim, cam);
    ruiny.rysuj(ctx, sim, cam);
    rysujLoch(ctx, sim, cam, teraz);
    rysujSchodyDrogi(ctx, sim, cam, teraz);
    rysujBudoweSchodow(ctx, sim, cam, teraz);
    rysujKatedre(ctx, sim, cam);
    smugiSwiatla(ctx, sim, cam, teraz);
    drawParticles(ctx, sim, cam);
    rysujTrupy(ctx, sim, cam, teraz);
    const grunt = (x: number) => SURFACE_Y - wysokoscGrzbietu(sim.world, x);
    rysujKonwoj(ctx, sim, cam, teraz, grunt);
    rysujWiadra(ctx, sim, cam, teraz);
    rysujMrok(ctx, sim, cam, teraz, pauza);
    if (MROK.wlaczony) eng.poswiata(ctx, cam, false);
    rysujKatedreNad(ctx, sim, cam, teraz);
    rysujPromien(ctx, sim, cam, teraz);
    rysujKonwojNad(ctx, sim, cam, teraz, grunt);
    if (POMNIK.wlaczony) rysujPomnik(ctx, sim, cam, teraz);
    urobki.zbierz(sim, teraz);
    urobki.rysujNaMapie(ctx, cam, teraz);
    pokoje.zbierz(sim, teraz, urobki);
    pokoje.rysujNad(ctx, sim, cam, teraz, null);
    oltarz.zbierz(sim, teraz, urobki);
    oltarz.rysujNad(ctx, sim, cam, teraz, null);
    ruiny.rysujNad(ctx, sim, cam, teraz);
    rysujLochNad(ctx, sim, cam, teraz);
    const plan = aktualnyPlan(sim);
    if (plan?.szyb && !sim.rytual.otwarta) rysujPlanDrogi(ctx, sim, cam, plan, teraz);
    else if (plan && plan.kopac.length && !sim.rytual.otwarta && sim.tick - plan.tick < 3000) rysujDrogePielgrzymow(ctx, sim, cam, plan, teraz, false);
    rysujZarys(ctx, sim, cam, teraz);
    rysujStworzenia(ctx, sim, cam, teraz, undefined);
    pokoje.rysujPrzod(ctx, sim, cam, teraz);
    rysujPrzodWiader(ctx, sim, cam, teraz);
    rysujEfekty(ctx, sim.efekty, cam, teraz, sim);
    rysujStraznikowWSkale(ctx, sim, cam, teraz);
    rysujNadPomnikiem(ctx, sim, cam, teraz);
    rysujDlon(ctx, sim, cam, teraz);
    rysujDlonDemona(ctx, sim, cam, teraz);
    rysujAniola(ctx, sim, cam, teraz);
    ctx.restore();
  }
  return { tik: sim.tick, png: p.toDataURL('image/png') };
}
