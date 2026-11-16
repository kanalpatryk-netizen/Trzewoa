/**
 * Cerber jako boss (Krąg Trzeci, beta): poza z bieżącego stanu walki (sim/walka.ts — te same ruchy co dawny demon,
 * odegrane psem: ciosy to kłapnięcia jednej z trzech głów, zgniecenie — wszystkich trzech, tupnięcie i uderzenie
 * w ziemię — stanięcie dęba, tchnienie — ogień ze środkowej paszczy, bicz — smagnięcie wężowym ogonem, szarża —
 * przysiad i skok, ryk — trzy głowy wyją w górę). Okup (sim/krag.ts): głowy spuszczone, żrą.
 */
import type { Sim } from '../sim/sim';
import type { Creature } from '../sim/creatures';
import { RUCHY_BOSSA, SCIECIE_GLOW as SG } from '../nastawy/walka';
import { glowaCzeka } from '../sim/walka';
import { DEMON } from '../nastawy/pomnik';
import { cerberZre } from '../sim/krag';
import { pozaCerbera, type PozaCerbera, type GlowaCerbera } from './cerber';

const pamiec = new WeakMap<Creature, { x: number; czas: number; faza: number; krok: number }>();
const obetnij = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const gladko = (t: number): number => { const x = obetnij(t, 0, 1); return x * x * (3 - 2 * x); };
/** Dzwon: 0 przed a, 1 w środku, 0 po b. */
const dzwon = (u: number, a: number, b: number): number => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));

/**
 * Kłapnięcie głowy: łeb cofa się i otwiera paszczę (zamach), potem rzuca się naprzód ze smugą ruchu, zatrzaskuje kły
 * w chwili trafienia (hitU) — a gdy trafił, z paszczy bryzga krew; potem szarpie i wraca.
 */
function klap(g: GlowaCerbera, u: number, hitU: number, trafil = false, nisko = 0): void {
  const przed = gladko((u - (hitU - 0.4)) / 0.35);
  const po = u > hitU ? gladko((u - hitU) / 0.08) : 0;
  const cofa = dzwon(u, hitU - 0.42, hitU - 0.1);
  g.paszcza = Math.max(g.paszcza, przed * (1 - po) * 1.0);
  g.wysun = Math.max(g.wysun, przed * (1 - gladko((u - hitU - 0.15) / 0.35)) - 0.35 * cofa);
  g.pochyl += 0.25 * przed - 0.3 * cofa + nisko * przed;
  // szarpie łbem po ugryzieniu
  if (u > hitU && u < hitU + 0.2) g.pochyl += 0.12 * Math.sin((u - hitU) * 90) * (1 - (u - hitU) / 0.2);
  g.smuga = Math.max(g.smuga ?? 0, dzwon(u, hitU - 0.1, hitU + 0.02));
  // krew z paszczy, gdy kły naprawdę trafiły: postęp bryzgu 0…1 od chwili trafienia
  if (trafil && u >= hitU && u < hitU + 0.16) g.ugryz = Math.max(g.ugryz ?? 0, (u - hitU) / 0.16);
}

/** Szarpnięcie łapą w fazie ruchu: wzniesienie do chwili przed ciosem, cios dokładnie w hitU, potem powrót. */
function lapaFaza(u: number, hitU: number): number {
  if (u < hitU - 0.1) return 0.35 * gladko(u / Math.max(0.05, hitU - 0.1));
  if (u < hitU) return 0.35 + 0.15 * ((u - (hitU - 0.1)) / 0.1);
  return Math.min(0.999, 0.5 + 0.5 * gladko((u - hitU) / Math.max(0.05, 1 - hitU)));
}

export function pozaBossa(sim: Sim, c: Creature, czas: number): PozaCerbera {
  const p = pozaCerbera();
  p.czas = czas;
  let m = pamiec.get(c);
  if (!m) { m = { x: c.x, czas, faza: 0, krok: 0 }; pamiec.set(c, m); }
  const dt = Math.max(1, czas - m.czas);
  if (czas !== m.czas) {
    const v = Math.min(4, (Math.abs(c.x - m.x) / dt) * 1000);   // kafli na sekundę ekranu
    m.krok += (Math.min(1, v / 0.9) - m.krok) * Math.min(1, dt / 160);
    m.faza += (v * dt / 1000) * 2.6;
    m.x = c.x; m.czas = czas;
  }
  p.krok = m.krok; p.faza = m.faza;
  p.oddech = 0.5 + 0.5 * Math.sin(czas * 0.004 + c.id);
  const zycie = obetnij(c.hp / Math.max(1, c.hpMax ?? DEMON.hp), 0, 1);
  p.rany = (1 - zycie) * 0.95;
  p.szal = zycie < 0.25 ? 1 : 0;
  p.ogon = Math.sin(czas * 0.0013 + c.id) * 0.6;
  p.glowy.forEach((g, i) => {
    g.pochyl = 0.12 * Math.sin(czas * 0.0016 + i * 2.1) - 0.05;
    g.paszcza = 0.12 + 0.1 * Math.max(0, Math.sin(czas * 0.006 + i * 1.7));   // dyszy
  });

  // Krąg Trzeci (16.11): głowy ścięte przez rycerza — kikuty krwawią, gryzą tylko te, które zostały
  const odc = c.glowyOdciete ?? [];
  if (odc.length) {
    p.odciete = odc.map((o) => o.nr);
    p.odcieteMs = odc.map((o) => Math.max(0, (sim.tick - o.tick) * (1000 / 120)));
  }
  // pusty pasek bieżącej głowy: łeb zwisa bezwładnie, paszcza rozdziawiona, oczy gasną, z pyska cieknie krew —
  // nie gryzie, czeka na miecz (trzy paski życia, po jednym na głowę)
  const czeka = glowaCzeka(c) ? SG.kolejnosc[odc.length] : -1;
  const zywe = [0, 1, 2].filter((i) => !p.odciete?.includes(i) && i !== czeka);
  if (!zywe.length) zywe.push(...[0, 1, 2].filter((i) => !p.odciete?.includes(i)));

  const R = c.ruch;
  if (R) {
    const def = RUCHY_BOSSA[R.id as keyof typeof RUCHY_BOSSA];
    const dl = Math.max(1, R.dl || def?.dl || 100);
    const u = obetnij((sim.tick - R.od) / dl, 0, 1);
    const traf = (def?.traf ?? []).map(([t]) => t / dl);
    const hit = traf[0] ?? 0.5;
    const glowaNr = zywe[(R.od >> 3) % zywe.length];
    const trafil = (k: number): boolean => (R.zadane[k] ?? 0) > 0;
    const niska = zywe[zywe.length - 1];
    switch (R.id) {
      case 'zGory':
        // staje lekko dęba, łeb w górę — i z całej siły paszczą w dół
        klap(p.glowy[glowaNr], u, hit, trafil(0), 0.35);
        p.deba = 0.4 * dzwon(u, hit - 0.45, hit + 0.02);
        p.kleka = 0.35 * dzwon(u, hit - 0.02, hit + 0.25);
        break;
      case 'zamach':
        // szarpnięcie łapą: łapa wysoko, łukiem naprzód; głowy warczą, jedna kłapie zaraz po ciosie
        p.lapa = lapaFaza(u, hit);
        p.glowy.forEach((g) => { g.paszcza = Math.max(g.paszcza, 0.55 * dzwon(u, 0.05, 0.95)); g.pochyl -= 0.15 * dzwon(u, 0.1, hit); });
        klap(p.glowy[glowaNr], u, Math.min(0.92, hit + 0.12), false);
        break;
      case 'podciecie':
        // chwyt za nogi: przysiad, najniższa głowa nisko nad ziemią
        klap(p.glowy[niska], u, hit, trafil(0), 0.55);
        p.przysiad = 0.7 * dzwon(u, 0.1, hit + 0.15);
        break;
      case 'odepchniecie':
        // uderzenie łbem: skok naprzód, łby z zamkniętymi paszczami w pierś
        p.skok = 0.7 * dzwon(u, hit - 0.3, hit + 0.12);
        for (const i of zywe) { const g = p.glowy[i]; g.wysun = Math.max(g.wysun, 0.7 * dzwon(u, hit - 0.25, hit + 0.15)); g.pochyl += 0.35 * dzwon(u, hit - 0.25, hit + 0.1); g.smuga = Math.max(g.smuga ?? 0, dzwon(u, hit - 0.1, hit + 0.02)); }
        break;
      case 'przygniecenie': {
        // łapa na piersi: cios łapą i trzyma rycerza przy ziemi do drugiego trafienia, głowy szarpią przygniecionego
        const hit2 = traf[1] ?? 0.65;
        p.lapa = u < hit ? lapaFaza(u, hit) : u < hit2 + 0.05 ? 0.56 : 0.56 + 0.44 * gladko((u - hit2 - 0.05) / Math.max(0.05, 0.95 - hit2));
        klap(p.glowy[glowaNr], u, hit + 0.08, trafil(0), 0.5);
        klap(p.glowy[zywe[0]], u, hit2, trafil(1), 0.5);
        p.przysiad = 0.3 * dzwon(u, hit, hit2 + 0.1);
        break;
      }
      case 'podwojnyZamach':
        klap(p.glowy[niska], u, traf[0] ?? 0.37, trafil(0), 0.2); klap(p.glowy[zywe[0]], u, traf[1] ?? 0.62, trafil(1), 0.3);
        break;
      case 'zgniecenie':
        // trzy paszcze naraz: przysiad i wszystkie łby w jedno miejsce
        for (const i of zywe) klap(p.glowy[i], u, hit, trafil(0), 0.3 + 0.1 * i);
        p.przysiad = 0.5 * dzwon(u, 0, hit + 0.05);
        p.skok = 0.35 * dzwon(u, hit - 0.15, hit + 0.1);
        break;
      case 'tupniecie': case 'uderzenieWZiemie':
        // staje dęba — i całym ciężarem spada na przednie łapy (posadzka drży)
        p.deba = gladko(u / (hit * 0.85)) * (1 - gladko((u - hit + 0.04) / 0.08));
        p.kleka = 0.7 * dzwon(u, hit - 0.02, hit + 0.22);
        p.fala = u > hit ? obetnij((u - hit) / 0.3, 0, 1) : 0;
        for (const g of p.glowy) { g.paszcza = Math.max(g.paszcza, 0.8 * dzwon(u, 0.1, hit + 0.2)); g.pochyl -= 0.4 * dzwon(u, 0.05, hit); }
        break;
      case 'wybuchAureoli':
        // wycie trzech gardeł: kuli się, a potem łby w górę i fala wycia
        p.przysiad = 0.6 * dzwon(u, 0, hit + 0.02);
        p.deba = 0.3 * dzwon(u, hit - 0.05, 0.98);
        p.fala = u > hit ? obetnij((u - hit) / 0.35, 0, 1) : 0;
        p.szal = Math.max(p.szal, dzwon(u, hit - 0.1, hit + 0.3));
        for (const g of p.glowy) { g.paszcza = Math.max(g.paszcza, dzwon(u, hit - 0.1, 0.98)); g.pochyl -= 0.8 * dzwon(u, hit - 0.1, 0.98) - 0.4 * dzwon(u, 0, hit - 0.1); }
        break;
      case 'tchnienie': {
        const [od, doT] = def?.oddech ?? [84, 174];
        p.ogienGlowa = zywe.includes(1) ? 1 : zywe[0];
        const g = p.glowy[p.ogienGlowa];
        g.paszcza = Math.max(g.paszcza, gladko((u - od / dl + 0.15) / 0.15));
        g.pochyl += 0.15 - 0.35 * dzwon(u, od / dl - 0.2, od / dl);
        p.ogien = dzwon(u, od / dl - 0.02, doT / dl + 0.05) > 0 ? 1 : 0;
        p.przysiad = 0.25 * dzwon(u, od / dl - 0.2, doT / dl);
        p.glowy.forEach((q, i) => { if (i !== p.ogienGlowa) q.pochyl -= 0.25; });
        break;
      }
      case 'biczLancucha':
        p.bicz = dzwon(u, hit - 0.35, hit + 0.25);
        p.glowy.forEach((g) => { g.pochyl -= 0.2 * p.bicz; g.paszcza = Math.max(g.paszcza, 0.4 * p.bicz); });
        p.przysiad = 0.2 * p.bicz;
        break;
      case 'szarza': {
        // przysiad, łby nisko — i skok na rycerza
        const [od] = def?.przemieszcza ?? [48, 104];
        p.przysiad = gladko(u / (od / dl)) * (1 - gladko((u - od / dl) / 0.08));
        if (u > od / dl) {
          p.skok = dzwon(u, od / dl - 0.02, Math.min(0.98, od / dl + 0.42));
          for (const g of p.glowy) { g.wysun = 0.6; g.paszcza = 0.9; g.pochyl += 0.2; g.smuga = 0.5 * p.skok; }
        }
        break;
      }
      case 'ryk': case 'rozkazRzut': case 'rozkazTarcza': case 'rozkazZawal': {
        const w = R.id === 'ryk' ? dzwon(u, 0.1, 0.9) : 0.8;
        for (const g of p.glowy) { g.pochyl -= 0.75 * w; g.paszcza = Math.max(g.paszcza, w); }
        p.deba = 0.2 * w;
        break;
      }
      case 'blok':
        // zasłona łapą: przednia łapa w górze przed piersią, łby cofnięte
        p.lapa = 0.3; p.odrzut = 0.15;
        for (const g of p.glowy) { g.pochyl -= 0.2; g.paszcza = Math.max(g.paszcza, 0.5); }
        break;
      case 'zachwianie':
        if (R.wariant === 2) {
          // przypada na przednie łapy (połowa, ćwierć życia, ścięta głowa) — wstaje powoli
          p.kleka = u < 0.15 ? gladko(u / 0.15) : 1 - gladko((u - 0.62) / 0.38);
          p.glowy.forEach((g) => { g.pochyl += 0.45 * p.kleka!; g.paszcza = Math.max(g.paszcza, 0.6 * dzwon(u, 0, 0.5)); });
        } else {
          p.odrzut = dzwon(u, 0, 0.7);
          p.glowy.forEach((g, i) => { g.pochyl += 0.3 * p.odrzut * (i - 1); g.paszcza = Math.max(g.paszcza, 0.5 * p.odrzut); });
        }
        break;
    }
  }
  // okup: trzy głowy żrą rzuconą garść jedzenia
  const zre = cerberZre(sim, c);
  if (zre > 0) {
    p.glowy.forEach((g, i) => {
      g.pochyl = 0.55 + 0.08 * Math.sin(czas * 0.01 + i);
      g.paszcza = 0.15 + 0.35 * Math.abs(Math.sin(czas * 0.018 + i * 1.3));
      g.wysun = 0.15;
    });
    p.ogon = Math.sin(czas * 0.012) * 0.9;
  }
  if (czeka >= 0) {
    const g = p.glowy[czeka];
    g.pochyl = 0.95 + 0.08 * Math.sin(czas * 0.0021);
    g.paszcza = 0.55; g.wysun = 0; g.smuga = 0; g.ugryz = 0;
    g.oczy = 0.25;
  }
  return p;
}
