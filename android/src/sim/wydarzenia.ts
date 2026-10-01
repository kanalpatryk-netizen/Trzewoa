import type { Sim, Clan } from './sim';
import { Race, RACES } from './races';
import { T, PASSABLE } from './tiles';
import { Job, Thought } from './creatures';
import { odswiezPlan, najwierniejsza } from './pielgrzymka';
import { WYDARZENIA as W } from '../nastawy/wydarzenia';
import { PRZYPLYWY as PP } from '../nastawy/gora';

/**
 * KARTY WYDARZEŃ — główny sposób grania w wersji na telefon.
 *
 * Co jakiś czas świat staje i pokazuje wydarzenie: najazd, zarazę, powódź, proroka, głód…
 * Każde ma dwa–trzy wybory opisane wprost: co zrobisz, ile to kosztuje i co z tego wyniknie.
 * Dawne przypływy (sim.tides) przychodzą teraz właśnie tak — zanim uderzą, możesz zdecydować.
 *
 * Symulacja nie czeka na gracza: bez niego (testy, automat) karta po chwili rozstrzyga się
 * sama, domyślnym wyborem. Ekran gry zatrzymuje czas, póki karta wisi.
 */

export interface Wybor {
  id: string;
  /** Co robisz — krótko, na przycisk. */
  tekst: string;
  /** Co z tego wyniknie — jedno zdanie pod przyciskiem. */
  skutek: string;
  krew: number;
  wiara: number;
}

export interface Wydarzenie {
  rodzaj: string;
  tytul: string;
  tekst: string;
  wybory: Wybor[];
  /** Wybór, gdy nikt nie wybierze (świat bez gracza). */
  domyslny: number;
  /** Co wybrałby rozsądny gracz — dla automatu testowego. */
  rozsadny: number;
  /** Gdzie to się dzieje — kamera jedzie tam przy pokazaniu karty. */
  cel?: { x: number; y: number; tekst: string };
  od: number;
  /** Dane skutku: nacje, miejsce. */
  klan?: number;
  klan2?: number;
  x?: number;
  rasa?: number;
}

/** Stan wydarzeń w symulacji (nie trafia do zapisu — po wczytaniu karty liczą się od nowa). */
export interface StanWydarzen {
  biezace: Wydarzenie | null;
  nastepne: number;
  ostatnie: string;
  /** Czy gra ma gracza — wtedy karta czeka na wybór, a nie rozstrzyga się sama. */
  gracz: boolean;
  /** Najwyższa liczebność każdej rasy (do karty „wymierają”). */
  szczyt: number[];
  /** Ile kart już było — pierwsze są łagodniejsze. */
  ile: number;
  /** Tik, w którym rozstrzygnięto ostatnią kartę. */
  koniec: number;
  /** Pierwsza krew między dwiema nacjami — czeka na swoją kartę. */
  wojna: { a: number; b: number; x: number; y: number } | null;
  /** Kiedy była ostatnia karta wojny. */
  ostatniaWojna: number;
  /** Para nacji → do którego tiku nie pytać o nią znowu. */
  ciszaWojen: Map<number, number>;
  /** Para nacji → do którego tiku trwa rozejm („rozdziel ich”). */
  pokoj: Map<number, number>;
}

export function nowyStanWydarzen(): StanWydarzen {
  return {
    biezace: null, nastepne: W.pierwsze, ostatnie: '', gracz: false, szczyt: [0, 0, 0, 0, 0, 0], ile: 0, koniec: -1e9,
    wojna: null, ostatniaWojna: -1e9, ciszaWojen: new Map(), pokoj: new Map(),
  };
}

/** Klucz pary nacji (bez kolejności). */
export const paraNacji = (a: number, b: number): number => (a < b ? a * 65536 + b : b * 65536 + a);

// ---------------------------------------------------------------- pomocnicze

/** Nazwa nacji z jej krwią — „Mrokowie (Ślepy Lud)”; same nazwy nacji nic graczowi nie mówiły. */
export function nazwaNacji(k: Clan): string {
  return `${k.name} (${RACES[k.race].name})`;
}

const zywe = (sim: Sim) => sim.clans.filter((k) => !k.dead && k.pop > 0 && k.race !== Race.HUMAN);
const najwieksza = (sim: Sim, rasa?: number) =>
  zywe(sim).filter((k) => rasa === undefined || k.race === rasa).sort((a, b) => b.pop - a.pop)[0] ?? null;
const gniazdo = (k: Clan) => ({ x: k.hx + 0.5, y: k.hy + 0.5, tekst: k.name });
const wybor = (id: string, tekst: string, skutek: string, krew = 0, wiara = 0): Wybor => ({ id, tekst, skutek, krew, wiara });

function stac(sim: Sim, w: Wybor): boolean {
  return sim.krew - sim.rezerwa.krew >= w.krew && sim.wiara - sim.rezerwa.wiara >= w.wiara;
}

/** Nacja, która bierze górę (najliczniejsza z dominującej krwi), gdy dominacja jest wyraźna. */
function dominujaca(sim: Sim, prog = 0.5): Clan | null {
  if (sim.dominance < prog || sim.domRace < 0) return null;
  return najwieksza(sim, sim.domRace);
}

function ilePielgrzymow(sim: Sim, klan: number): number {
  let n = 0;
  for (const c of sim.creatures) if (!c.dead && c.clan === klan && c.job === Job.PIELGRZYM) n++;
  return n;
}

function ileOltarzy(sim: Sim): number {
  let n = 0;
  for (const t of sim.world.tile) if (t === T.SHRINE) n++;
  return n;
}

// ---------------------------------------------------------------- karty

type Budowniczy = () => Wydarzenie | null;

function kandydaci(sim: Sim, st: StanWydarzen): { waga: number; zbuduj: Budowniczy; rodzaj: string }[] {
  const w = sim.world;
  const out: { waga: number; zbuduj: Budowniczy; rodzaj: string }[] = [];
  const dom = dominujaca(sim);
  // w najliczniejszych warto uderzyć tylko wtedy, gdy to nie oni niosą twoją wiarę pod rdzeń
  const wiodaca = najwierniejsza(sim);
  const naDom = !!dom && sim.dominance > 0.6 && (!wiodaca || wiodaca.race !== dom.race);
  const surowe = st.ile >= 2;                     // dwie pierwsze karty bez klęsk żywiołowych

  // --- najazd z powierzchni
  if (surowe && !sim.rozejm) out.push({ rodzaj: 'najazd', waga: 3, zbuduj: () => {
    const x = 8 + sim.rng.int(w.w - 16);
    const ilu = PP.ludzieIlu + sim.rng.int(PP.ludzieRozrzut);
    const wybory = [
      wybor('zawal', 'Zawal im wejście', 'Nie zejdą. Nikt nie zginie — ale nie popłynie też krew.', W.najazdZawal),
      wybor('wpusc', 'Wpuść ich', 'Zejdą po rudę i będą walczyć z tymi, na których trafią. Każda śmierć to twoja krew.'),
    ];
    if (dom) wybory.push(wybor('prowadz', `Poprowadź ich na ${dom.name}`, `Uderzą w najliczniejszych — ${RACES[dom.race].name} straci ludzi, a reszta odetchnie.`, 0, W.najazdProwadz));
    const rozsadny = naDom && dom ? 2 : sim.krew >= 60 ? 0 : 1;
    return { rodzaj: 'najazd', tytul: 'Ludzie schodzą z powierzchni', tekst: `${ilu} ludzi idzie w dół po rudę i sławę. Po drodze zabijają.`, wybory, domyslny: 1, rozsadny, cel: { x: x + 0.5, y: 6, tekst: 'tu schodzą' }, od: sim.tick, x };
  } });

  // --- powódź
  if (surowe) out.push({ rodzaj: 'powodz', waga: 2.5, zbuduj: () => {
    const x = 6 + sim.rng.int(w.w - 12);
    const wybory = [
      wybor('zatkaj', 'Zatkaj szczelinę', 'Woda zostanie w skale.', W.powodzZatkaj),
      wybor('plyn', 'Niech płynie', 'Zaleje górne korytarze. Kto nie pływa, może utonąć.'),
    ];
    if (dom) wybory.push(wybor('kieruj', `Skieruj ją na ${dom.name}`, `Zaleje najliczniejszych — ${RACES[dom.race].name}.`, 0, W.powodzKieruj));
    const rozsadny = naDom && dom ? 2 : sim.krew >= 45 ? 0 : 1;
    return { rodzaj: 'powodz', tytul: 'Woda znalazła szczelinę', tekst: 'Nad górnymi korytarzami pęka żyła wodna.', wybory, domyslny: 1, rozsadny, cel: { x: x + 0.5, y: 8, tekst: 'szczelina' }, od: sim.tick, x };
  } });

  // --- zaraza
  if (surowe) out.push({ rodzaj: 'zaraza', waga: 3, zbuduj: () => {
    const cel = dom ?? najwieksza(sim);
    const wybory = [
      wybor('uzdrow', 'Uzdrów ich', `Nikt nie zachoruje, a każda nacja uwierzy mocniej (+${Math.round(W.zarazaUzdrowOddanie * 100)}% oddania).`, 0, W.zarazaUzdrow),
      wybor('niech', 'Niech przejdzie', `Zachorują najciężej najliczniejsi${cel ? ` — ${RACES[cel.race].name}` : ''}. Część umrze.`),
    ];
    // zaraza najmocniej bije w ciasnotę — gdy ktoś się przeludnił, lepiej ją przepuścić
    const ciasno = sim.domRace >= 0 && sim.crowding[sim.domRace] > 0.9;
    const rozsadny = naDom || ciasno || sim.dominance > 0.6 ? 1 : sim.wiara >= 30 ? 0 : 1;
    return { rodzaj: 'zaraza', tytul: 'Nadchodzi zaraza', tekst: 'Coś gnije w powietrzu twoich korytarzy.', wybory, domyslny: 1, rozsadny, cel: cel ? gniazdo(cel) : undefined, od: sim.tick };
  } });

  // --- żyła szaleństwa
  if (surowe) out.push({ rodzaj: 'zyla', waga: 1.5, zbuduj: () => {
    const wybory = [
      wybor('zasklep', 'Zasklep ją', 'Głębia zostanie spokojna.', W.zylaZasklep),
      wybor('zostaw', 'Zostaw', 'Kto będzie tam kopał, oszaleje — i może wrócić jako trol.'),
    ];
    return { rodzaj: 'zyla', tytul: 'Żyła szaleństwa w głębi', tekst: 'Głęboko w skale otwiera się coś, od czego pęka głowa.', wybory, domyslny: 1, rozsadny: sim.krew >= 45 ? 0 : 1, od: sim.tick };
  } });

  // --- obcy lud (gdy jedna krew zjada resztę)
  // (nie na początku: Ślepy Lud zawsze zaczyna jako większość — to jeszcze nie monokultura)
  if (sim.tick > W.obcyPo && sim.dominance > W.obcyOdDominacji && sim.przybyszow < PP.maxPrzybyszow) out.push({ rodzaj: 'obcy', waga: 3, zbuduj: () => ({
    rodzaj: 'obcy', tytul: 'Ktoś puka od spodu', tekst: `${RACES[sim.domRace]?.name ?? 'Jedna krew'} zajmuje prawie całą górę. W głębi czeka garstka innych.`,
    wybory: [
      wybor('wypusc', 'Wypuść ich', 'Nowa krew stanie przeciw najliczniejszym — sen się oddali.'),
      wybor('zamknij', 'Zamknij szczeliny', 'Góra zostanie taka, jaka jest.'),
    ], domyslny: 0, rozsadny: 0, od: sim.tick,
  }) });

  // --- głód
  const glodna = najglodniejsza(sim);
  if (glodna) out.push({ rodzaj: 'glod', waga: 1 + glodna.udzial * 3, zbuduj: () => {
    const wybory = [
      wybor('karm', 'Wyhoduj im jedzenie', 'Przy gnieździe wyrośnie jedzenie dla wszystkich. Najedzą się.', W.glodGrzyb),
      wybor('zmarli', 'Niech zjedzą najsłabszych', `${W.glodZmarlych} najsłabszych zginie, reszta się naje. Śmierć to twoja krew.`),
      wybor('nic', 'Nic nie rób', 'Część umrze z głodu.'),
    ];
    const zaDuzo = glodna.race === sim.domRace && sim.dominance > 0.65;
    return { rodzaj: 'glod', tytul: `${glodna.name} głodują`, tekst: `${nazwaNacji(glodna)}: ${Math.round(glodna.udzial * 100)}% nie ma co jeść. Jeśli nic się nie zmieni, zaczną umierać — wszyscy naraz.`, wybory, domyslny: 2, rozsadny: zaDuzo ? 2 : stac(sim, wybory[0]) ? 0 : 1, cel: gniazdo(glodna), od: sim.tick, klan: glodna.id };
  } });

  // --- prorok
  const duza = (dom && dom.pop >= W.prorokMinNacja ? dom : null) ?? zywe(sim).filter((k) => k.pop >= W.prorokMinNacja && RACES[k.race].faithGain > 0).sort((a, b) => b.pop - a.pop)[0];
  if (duza) out.push({ rodzaj: 'prorok', waga: naDom ? 5 : 2, zbuduj: () => {
    const wybory = [
      wybor('wysluchaj', 'Wysłuchaj go', 'Odejdzie z częścią wiernych i założy nową nację. Będzie wojna — a sen się cofnie.', 0, W.prorokWysluchaj),
      wybor('ucisz', 'Ucisz go', `Nacja zostanie w całości i uwierzy mocniej (+${Math.round(W.prorokUciszOddanie * 100)}%).`),
    ];
    const rozsadny = duza.race === sim.domRace && sim.dominance > 0.6 ? 0 : 1;
    return { rodzaj: 'prorok', tytul: `${duza.name}: wstaje prorok`, tekst: `${nazwaNacji(duza)} jest ich już ${duza.pop}. Jeden z nich słyszy cię wyraźniej niż inni.`, wybory, domyslny: 1, rozsadny, cel: gniazdo(duza), od: sim.tick, klan: duza.id };
  } });

  // --- ruda
  const gob = najwieksza(sim, Race.GOBLIN), zuz = najwieksza(sim, Race.DWARF);
  if (gob || zuz) out.push({ rodzaj: 'ruda', waga: 1.5, zbuduj: () => {
    const wybory: Wybor[] = [];
    if (gob) wybory.push(wybor('oltarz', `Daj ją: ${gob.name}`, 'Postawią z niej ołtarz i zaczną się przy nim modlić — przybędzie ci wiary.'));
    if (zuz) wybory.push(wybor('kuznia', `Daj ją: ${zuz.name}`, 'Żużlowcy wykują z niej nowych kowali.'));
    wybory.push(wybor('zostaw', 'Zostaw w skale', 'Nic się nie zmieni.'));
    const rozsadny = gob && ileOltarzy(sim) < 2 ? 0 : zuz && zuz.pop < 6 ? wybory.findIndex((x) => x.id === 'kuznia') : 0;
    const k = gob ?? zuz!;
    return { rodzaj: 'ruda', tytul: 'Odsłoniła się żyła rudy', tekst: 'Obsunęła się ściana, a pod nią błyszczy ruda. Komu ją dasz?', wybory, domyslny: wybory.length - 1, rozsadny, cel: gniazdo(k), od: sim.tick, klan: gob?.id, klan2: zuz?.id };
  } });

  // --- prośba o znak
  const wierna = najwierniejsza(sim);
  if (wierna && wierna.devotion >= W.znakOd && wierna.devotion < W.znakDo && ilePielgrzymow(sim, wierna.id) === 0) out.push({ rodzaj: 'znak', waga: 2, zbuduj: () => {
    const wybory = [
      wybor('objaw', 'Objaw się', `Oddanie nacji wzrośnie o ${Math.round(W.znakOddanie * 100)}% — bliżej zejścia pod twój rdzeń.`, 0, W.znakObjaw),
      wybor('milcz', 'Milcz', `Zwątpią (−${Math.round(W.znakMilczenie * 100)}% oddania).`),
    ];
    return { rodzaj: 'znak', tytul: `${wierna.name} proszą o znak`, tekst: `${nazwaNacji(wierna)} wierzą w ciebie na ${Math.round(wierna.devotion * 100)}%. Chcą zobaczyć, że jesteś.`, wybory, domyslny: 1, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: gniazdo(wierna), od: sim.tick, klan: wierna.id };
  } });

  // --- warta pod rdzeniem
  if (wierna && !sim.rytual.otwarta && wierna.devotion >= W.wartaOddanie && wierna.pop >= W.wartaMinNacja && ilePielgrzymow(sim, wierna.id) < W.wartaIlu) out.push({ rodzaj: 'warta', waga: 4, zbuduj: () => {
    const wybory = [
      wybor('posl', `Poślij ${W.wartaIlu} pod rdzeń`, 'Zejdą pod skorupę i będą się modlić, aż kamień pęknie. To droga do wolności.', 0, W.wartaPosl),
      wybor('poslJedz', `Poślij ${W.wartaIlu} i daj im jeść`, 'Jak wyżej — a przy przedsionku wyrośnie jedzenie, żeby warta nie zgłodniała.', W.wartaGrzyb, W.wartaPosl),
      wybor('czekaj', 'Jeszcze nie', 'Zostaną w domu.'),
    ];
    const rozsadny = sim.jedzeniePrzedsionka < 3 && stac(sim, wybory[1]) ? 1 : stac(sim, wybory[0]) ? 0 : 2;
    return { rodzaj: 'warta', tytul: `${wierna.name} chcą zejść pod twój rdzeń`, tekst: `${nazwaNacji(wierna)} wierzą na ${Math.round(wierna.devotion * 100)}%. Kilku z nich gotowych jest modlić się pod skorupą.`, wybory, domyslny: 2, rozsadny, cel: gniazdo(wierna), od: sim.tick, klan: wierna.id };
  } });

  // --- kłótnia dwóch nacji
  const nacje = zywe(sim).filter((k) => k.pop >= 3);
  let para: [Clan, Clan] | null = null;
  for (let i = 0; i < nacje.length && !para; i++) {
    for (let j = i + 1; j < nacje.length; j++) {
      if (Math.hypot(nacje[i].hx - nacje[j].hx, nacje[i].hy - nacje[j].hy) < 45) { para = [nacje[i], nacje[j]]; break; }
    }
  }
  if (para) out.push({ rodzaj: 'klotnia', waga: naDom || sim.sen > 0.1 ? 3.5 : 1.5, zbuduj: () => {
    const [a, b] = para!;
    const wybory = [
      wybor('podsyc', 'Podsyć kłótnię', 'Wybuchnie wojna. Popłynie krew, a sen się cofnie.', 0, W.klotniaPodsyc),
      wybor('pogodz', 'Pogódź ich', `Obie nacje uwierzą mocniej (+${Math.round(W.klotniaPogodzOddanie * 100)}%).`),
    ];
    const rozsadny = naDom || sim.sen > 0.1 ? (stac(sim, wybory[0]) ? 0 : 1) : 1;
    return { rodzaj: 'klotnia', tytul: `Kłótnia: ${a.name} i ${b.name}`, tekst: `${nazwaNacji(a)} i ${nazwaNacji(b)} spierają się o korytarz między gniazdami.`, wybory, domyslny: 1, rozsadny, cel: gniazdo(a), od: sim.tick, klan: a.id, klan2: b.id };
  } });

  // --- krew, która wymiera
  for (const r of [Race.GOBLIN, Race.DWARF, Race.SPINNER]) {
    const ilu = sim.popByRace[r];
    if (sim.tick > 3000 && ilu > 0 && ilu <= W.wymieraPonizej && st.szczyt[r] >= W.wymieraSzczyt) {
      out.push({ rodzaj: 'wymiera', waga: 6, zbuduj: () => {
        st.szczyt[r] = ilu;                           // następna taka karta dopiero, gdy znów urosną i spadną
        const k = najwieksza(sim, r);
        const wybory = [
          wybor('ratuj', 'Ratuj ich', 'Dostaną jedzenie i siły. Każda krew w górze oddala sen.', W.ratunek),
          wybor('pozwol', 'Pozwól im zniknąć', 'Jedna krew mniej. Łatwiej o monokulturę — i o sen.'),
        ];
        return { rodzaj: 'wymiera', tytul: `${RACES[r].name} wymierają`, tekst: `Zostało ${ilu === 1 ? 'jedno' : ilu === 2 ? 'dwoje' : 'troje'}. Bez nich jedna krew zje resztę.`, wybory, domyslny: 1, rozsadny: stac(sim, wybory[0]) ? 0 : 1, cel: k ? gniazdo(k) : undefined, od: sim.tick, rasa: r };
      } });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------- rytm

/** Wywoływane co tik z sim.step(). */
export function tikWydarzen(sim: Sim): void {
  const st = sim.wydarzenia;
  if (sim.spokojnySwiat || sim.ending) return;
  if (sim.tick % 90 === 0) for (let r = 0; r < st.szczyt.length; r++) st.szczyt[r] = Math.max(st.szczyt[r], sim.popByRace[r]);
  if (st.biezace) {
    if (!st.gracz && sim.tick - st.biezace.od > W.bezGraczaPo) rozstrzygnij(sim, st.biezace.domyslny);
    return;
  }
  if (sim.tick % 900 === 0) for (const [k, t] of st.pokoj) if (t <= sim.tick) st.pokoj.delete(k);
  // Pierwsza krew nie czeka na kolejkę: wojna rozstrzyga się w minutę, a potem nie ma już kogo ratować.
  if (st.wojna && sim.tick - st.ostatniaWojna >= W.wojnaPo) {
    const wj = st.wojna;
    st.wojna = null;
    if (kartaWojny(sim, wj)) return;
  }
  // Karty pilne: głód całej nacji i ginąca krew nie czekają na swoją kolej — inaczej karta
  // przychodziła, gdy po nacji zostały już tylko kości.
  if (sim.tick < st.nastepne) {
    if (sim.tick % 120 !== 0 || sim.tick - st.koniec < W.pilnaPo) return;
    const g = najglodniejsza(sim);
    // pilna tylko dla nacji, która nie jest najliczniejszą krwią — przeludniona zawsze trochę głoduje
    if (g && g.udzial >= W.pilnyGlod && g.race !== sim.domRace) { wylosuj(sim, 'glod'); return; }
    return;
  }
  wylosuj(sim);
}

/** Nacja, w której głoduje największa część (co najmniej `glodUdzial`) — z tą częścią. */
function najglodniejsza(sim: Sim): (Clan & { udzial: number }) | null {
  let best: Clan | null = null, udz = 0;
  for (const k of zywe(sim)) {
    if (k.race === Race.DWARF || k.pop < W.glodMinNacja) continue;
    let g = 0, n = 0;
    for (const c of sim.creatures) if (!c.dead && c.clan === k.id) { n++; if (c.hunger > 0.6) g++; }
    if (n > 0 && g / n >= W.glodUdzial && g / n > udz) { udz = g / n; best = k; }
  }
  return best ? Object.assign(Object.create(Object.getPrototypeOf(best)), best, { udzial: udz }) : null;
}

/** Losuje następną kartę (z wagami, bez powtórki tej samej pod rząd). */
export function wylosuj(sim: Sim, wymus?: string): Wydarzenie | null {
  const st = sim.wydarzenia;
  let pula = kandydaci(sim, st).filter((k) => (wymus ? k.rodzaj === wymus : k.rodzaj !== st.ostatnie));
  if (!pula.length && !wymus) pula = kandydaci(sim, st);
  if (!pula.length) { st.nastepne = sim.tick + 900; return null; }
  const suma = pula.reduce((s, k) => s + k.waga, 0);
  let los = sim.rng.next() * suma;
  let wybrany = pula[pula.length - 1];
  for (const k of pula) { los -= k.waga; if (los <= 0) { wybrany = k; break; } }
  const w = wybrany.zbuduj();
  if (!w) { st.nastepne = sim.tick + 900; return null; }
  st.biezace = w;
  st.ile++;
  st.ostatnie = w.rodzaj;
  return w;
}

/**
 * Wykonuje wybór. Zwraca powód odmowy (np. „Brakuje krwi.”) albo null, gdy się udało.
 */
export function rozstrzygnij(sim: Sim, i: number): string | null {
  const st = sim.wydarzenia;
  const e = st.biezace;
  if (!e) return 'Nie ma wydarzenia.';
  const w = e.wybory[i];
  if (!w) return 'Nie ma takiego wyboru.';
  if (!stac(sim, w)) {
    const brak: string[] = [];
    if (sim.krew - sim.rezerwa.krew < w.krew) brak.push('krwi');
    if (sim.wiara - sim.rezerwa.wiara < w.wiara) brak.push('wiary');
    return `Brakuje ${brak.join(' i ')}.`;
  }
  sim.krew -= w.krew; sim.wiara -= w.wiara;
  wykonaj(sim, e, w.id);
  if (e.cel) sim.gdzie(e.cel.x, e.cel.y);
  sim.log(`${e.tytul}. Wybrałeś: ${w.tekst.toLowerCase()}.`, 'swiat');
  st.biezace = null;
  st.koniec = sim.tick;
  // karta wojny przychodzi poza kolejką — nie przesuwa zwykłych kart (inaczej wojny je wypierały)
  if (e.rodzaj !== 'wojna') st.nastepne = sim.tick + W.odstep + sim.rng.int(W.rozrzut);
  return null;
}

/**
 * Pierwsza śmierć w walce między nacjami, które dotąd nie miały do siebie urazy (creatures.ts).
 * Najazdy ludzi mają własną kartę; wojny, które gracz sam rozpętał, mają ciszę.
 */
export function zglosWojne(sim: Sim, a: number, b: number, x: number, y: number): void {
  const st = sim.wydarzenia;
  if (sim.spokojnySwiat || sim.ending || st.wojna || a === b) return;
  const A = sim.clans[a], B = sim.clans[b];
  if (!A || !B || A.race === Race.HUMAN || B.race === Race.HUMAN) return;
  if ((st.ciszaWojen.get(paraNacji(a, b)) ?? -1) > sim.tick) return;
  st.wojna = { a, b, x, y };
}

function kartaWojny(sim: Sim, wj: { a: number; b: number; x: number; y: number }): boolean {
  const st = sim.wydarzenia;
  const A = sim.clans[wj.a], B = sim.clans[wj.b];
  if (!A || !B || A.dead || B.dead || A.pop <= 0 || B.pop <= 0) return false;
  // uraza zdążyła wygasnąć — nie ma już wojny, o którą pytać
  if (!(A.grudge.get(B.id) ?? 0) && !(B.grudge.get(A.id) ?? 0)) return false;
  st.ciszaWojen.set(paraNacji(A.id, B.id), sim.tick + W.wojnaCisza);
  const minut = Math.round(W.wojnaPokoj / 7200);
  const wybory = [
    wybor('rozdziel', 'Rozdziel ich', `Zapomną urazę i przez ${minut} min nie tkną się nawzajem.`, W.wojnaRozdziel),
    wybor('niech', 'Niech walczą', 'Każda śmierć to twoja krew. Ale gdy słabsi wyginą, jedna krew zje resztę — a to sen.'),
  ];
  const slabsi = sim.popByRace[A.race] <= sim.popByRace[B.race] ? A : B;
  const silniejsi = slabsi === A ? B : A;
  const wiodaca = najwierniejsza(sim);
  const chron = sim.popByRace[slabsi.race] <= W.wojnaChronPonizej
    || (!!wiodaca && (wiodaca.id === A.id || wiodaca.id === B.id))
    || (silniejsi.race === sim.domRace && sim.dominance > 0.5);
  // karta tylko wtedy, gdy wojna czymś grozi — inaczej przychodziła co dwie minuty
  // i zawsze z tą samą odpowiedzią; bójki silnych z silnymi toczą się bez pytania
  if (!chron) return false;
  st.ostatniaWojna = sim.tick;
  st.biezace = {
    rodzaj: 'wojna', tytul: `Pierwsza krew: ${A.name} i ${B.name}`,
    tekst: `Padł pierwszy trup. Po jednej stronie ${nazwaNacji(A)}, po drugiej ${nazwaNacji(B)}. Będą się mścić, aż uraza wygaśnie albo jedni wyginą.`,
    wybory, domyslny: 1, rozsadny: stac(sim, wybory[0]) ? 0 : 1,
    cel: { x: wj.x, y: wj.y, tekst: 'pierwsza krew' }, od: sim.tick, klan: A.id, klan2: B.id,
  };
  st.ile++;
  return true;
}

/** Karta wymuszona z zewnątrz — nowe plemię zeszło w pustą górę. */
export function kartaPlemienia(sim: Sim, k: Clan): void {
  const st = sim.wydarzenia;
  if (st.biezace || sim.spokojnySwiat) return;
  st.biezace = {
    rodzaj: 'plemie', tytul: `${k.name} zeszli w górę`, tekst: `${nazwaNacji(k)} — pustka ich przyciągnęła. Nie wiedzą, co tu zastaną.`,
    wybory: [
      wybor('karm', 'Nakarm ich na powitanie', 'Przy gnieździe wyrośnie jedzenie — przeżyją pierwsze dni.', W.plemieNakarm),
      wybor('nic', 'Niech radzą sobie sami', 'Może przeżyją, może nie.'),
    ], domyslny: 1, rozsadny: sim.krew >= W.plemieNakarm ? 0 : 1, cel: gniazdo(k), od: sim.tick, klan: k.id,
  };
}

// ---------------------------------------------------------------- skutki

function wykonaj(sim: Sim, e: Wydarzenie, id: string): void {
  const klan = e.klan !== undefined ? sim.clans[e.klan] : null;
  const klan2 = e.klan2 !== undefined ? sim.clans[e.klan2] : null;
  switch (`${e.rodzaj}:${id}`) {
    case 'najazd:wpusc': sim.humanRaid(e.x); break;
    case 'najazd:prowadz': { const d = dominujaca(sim, 0); sim.humanRaid(d ? d.hx : e.x); break; }
    case 'powodz:plyn': sim.flood(e.x); break;
    case 'powodz:kieruj': { const d = dominujaca(sim, 0); sim.flood(d ? d.hx : e.x); break; }
    case 'zaraza:niech': sim.plague(); break;
    case 'zaraza:uzdrow':
      for (const k of zywe(sim)) k.devotion = Math.min(1, k.devotion + W.zarazaUzdrowOddanie);
      break;
    case 'zyla:zostaw': sim.madVein(); break;
    case 'obcy:wypusc': sim.obcyLud(); break;
    case 'glod:karm':
      if (klan) {
        sim.zapasy(klan, Math.max(W.glodJedzenia, Math.round(klan.pop * 1.2)));
        for (const c of sim.creatures) if (!c.dead && c.clan === klan.id) c.hunger = Math.max(0, c.hunger - W.glodUlga);
        sim.efekt(klan.hx + 0.5, klan.hy + 0.5, 'zasiew');
      }
      break;
    case 'glod:zmarli':
      if (klan) {
        const czlonkowie = sim.creatures.filter((c) => !c.dead && c.clan === klan.id).sort((a, b) => a.hp - b.hp);
        for (const c of czlonkowie.slice(0, W.glodZmarlych)) sim.kill(c, 'zjedzony przez swoich', 'głód');
        for (const c of czlonkowie.slice(W.glodZmarlych)) c.hunger = Math.max(0, c.hunger - W.glodZmarlychUlga);
      }
      break;
    case 'prorok:wysluchaj':
      if (klan) {
        const glos = sim.creatures.find((c) => !c.dead && c.clan === klan.id && !c.prophet);
        if (glos) sim.makeProphet(glos);
      }
      break;
    case 'prorok:ucisz':
      if (klan) klan.devotion = Math.min(1, klan.devotion + W.prorokUciszOddanie);
      break;
    case 'ruda:oltarz': if (klan) klan.stock += W.rudaOltarz; break;
    case 'ruda:kuznia': if (klan2) klan2.stock += W.rudaKuznia; break;
    case 'znak:objaw':
      if (klan) {
        klan.devotion = Math.min(1, klan.devotion + W.znakOddanie);
        postawGlif(sim, klan);
        sim.efekt(klan.hx + 0.5, klan.hy + 0.5, 'cud');
      }
      break;
    case 'znak:milcz': if (klan) klan.devotion = Math.max(0, klan.devotion - W.znakMilczenie); break;
    case 'warta:poslJedz':
      jedzeniePrzyPrzedsionku(sim);
      poslijWarte(sim, klan);
      break;
    case 'warta:posl': poslijWarte(sim, klan); break;
    case 'klotnia:podsyc':
      if (klan && klan2) {
        sim.feud(klan.id, klan2.id); sim.feud(klan2.id, klan.id);
        klan.zSzeptu = true;                        // to twoja wojna — jej śmierci cofają sen
      }
      break;
    case 'klotnia:pogodz':
      if (klan && klan2) {
        klan.grudge.delete(klan2.id); klan2.grudge.delete(klan.id);
        klan.devotion = Math.min(1, klan.devotion + W.klotniaPogodzOddanie);
        klan2.devotion = Math.min(1, klan2.devotion + W.klotniaPogodzOddanie);
      }
      break;
    case 'wymiera:ratuj':
      for (const k of zywe(sim)) {
        if (k.race !== e.rasa) continue;
        sim.zapasy(k, W.ratunekJedzenia);
        if (k.race === Race.DWARF) k.stock += W.rudaKuznia;
      }
      for (const c of sim.creatures) {
        if (c.dead || c.race !== e.rasa) continue;
        c.hunger = 0; c.hp = RACES[c.race].maxHp;
      }
      break;
    case 'plemie:karm': if (klan) sim.zapasy(klan, W.plemieJedzenia); break;
    case 'wojna:rozdziel':
      if (klan && klan2) {
        klan.grudge.delete(klan2.id); klan2.grudge.delete(klan.id);
        sim.wydarzenia.pokoj.set(paraNacji(klan.id, klan2.id), sim.tick + W.wojnaPokoj);
        // kto właśnie gonił wroga z drugiej nacji, opuszcza ręce
        for (const c of sim.creatures) {
          if (c.dead || (c.clan !== klan.id && c.clan !== klan2.id)) continue;
          const t = sim.creatureById(sim.target.get(c.id) ?? -1);
          if (t && t.clan !== c.clan && (t.clan === klan.id || t.clan === klan2.id)) { sim.target.delete(c.id); c.jt = 0; }
        }
        if (e.cel) sim.efekt(e.cel.x, e.cel.y, 'cud');
      }
      break;
  }
}

/** Świecący glif przy gnieździe — modlitwa przy nim liczy się podwójnie. */
function postawGlif(sim: Sim, k: Clan): void {
  const w = sim.world;
  for (let r = 0; r <= 3; r++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = k.hx + dx, y = k.hy;
      if (w.inb(x, y) && w.get(x, y) === T.AIR) { w.set(x, y, T.GLYPH); return; }
    }
  }
}

/** Jedzenie na podłodze przy przedsionku nad rdzeniem — tym żyje warta. */
function jedzeniePrzyPrzedsionku(sim: Sim): void {
  const w = sim.world;
  let poszlo = 0;
  for (let k = 0; k < 400 && poszlo < 10; k++) {
    const x = w.coreX + sim.rng.int(21) - 10;
    const y = w.przedsionekY + sim.rng.int(9) - 6;
    if (!w.inb(x, y) || w.get(x, y) !== T.AIR || PASSABLE[w.get(x, y + 1)] === 1) continue;
    w.set(x, y, T.FUNGUS);
    poszlo++;
  }
  sim.efekt(w.coreX + 0.5, w.przedsionekY + 0.5, 'zasiew');
}

/** Wysyła najedzonych wiernych pod rdzeń — ten sam skutek co szept „módl się”. */
function poslijWarte(sim: Sim, k: Clan | null): void {
  if (!k) return;
  let posl = ilePielgrzymow(sim, k.id);
  const chetni = sim.creatures.filter((c) => !c.dead && c.clan === k.id && c.job !== Job.PIELGRZYM && !c.slave)
    .sort((a, b) => a.hunger - b.hunger);
  for (const c of chetni) {
    if (posl >= W.wartaIlu) break;
    c.thought = Thought.PRAY_CORE; c.jt = 0;
    sim.efekt(c.x, c.y, 'mysl', 'módl się');
    posl++;
  }
  odswiezPlan(sim);
}
