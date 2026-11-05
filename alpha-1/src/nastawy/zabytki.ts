/**
 * Alpha, etap 3e — ruiny z zabytkami (sim/ruiny.ts, sim/zabytki.ts, rysunek: render/ruiny.ts).
 *
 * W środkowej warstwie góry leżą zawalone budowle: kaplica, stara kopalnia albo kawałek miasta. W każdej zabytek.
 * Gdy ktoś z ludu do niego dotrze, świat staje i pokazuje kartę: „Weź” — premia i kara dla całego ludu naraz,
 * na zawsze (sen w sypialni kary nie zdejmuje — decyzja użytkownika 18.10), albo „Zostaw” — zabytek gaśnie.
 * Tiki: 120 = sekunda, 7200 = minuta.
 */
export type TypZabytku = 'relikwiarz' | 'miecz' | 'kielich' | 'ksiega';
export type RodzajRuiny = 'kaplica' | 'kopalnia' | 'miasto';

export const ZABYTKI = {
  // ---------------------------------------------------------------- ruiny w generatorze
  ruiny: {
    /** Ile ruin na górze: najmniej, najwięcej. */
    odIlu: 1, doIlu: 2,
    /** Ruiny leżą w środkowej warstwie, co najmniej tyle kafli pod jej górną granicą i nad dolną. */
    odGranicy: 5,
    /** Dwie ruiny nie bliżej niż tyle kafli w poziomie (środek do środka). */
    odstep: 46,
    /** Kaplica: szerokość wnętrza i wysokość ścian (kafle), łuk sklepienia nad nimi. */
    kaplica: { szer: 13, wys: 6, sklepienie: 3 },
    /** Kopalnia: długość chodnika, wysokość, co ile kafli odrzwia z belek. */
    kopalnia: { dl: 22, wys: 3, odrzwiaCo: 4 },
    /** Kawałek miasta: dwa domy (szerokość wnętrza, wysokość ścian) i ulica między nimi z łukiem bramy. */
    miasto: { domSzer: 6, domWys: 4, ulica: 4 },
  },

  // ---------------------------------------------------------------- odkrycie i karta
  /** Kto z ludu stanie tak blisko zabytku (kafle), ten go odkrywa. */
  odkrycieZasieg: 2.6,
  /** Co tyle tików sprawdzamy, czy ktoś doszedł (i czy karta może się już pokazać). */
  sprawdzajCo: 30,
  /** Unoszenie po odkryciu, zanim pokaże się karta (tiki) — widać kurz, światło i zabytek w górze. */
  kartaPo: 150,
  /** Po wzięciu: tyle tików zabytek leci do rąk i jest unoszony, zanim fala światła zapali ludowi aureole. */
  aureolePo: 190,

  // ---------------------------------------------------------------- skutki (dla całego ludu, na zawsze)
  skutki: {
    /** Relikwiarz świętego: modlitwa mocniejsza, kucie wolniejsze. */
    relikwiarz: { modlitwa: 1.35, kopanie: 0.75 },
    /** Miecz krzyżowca: rycerz bije mocniej, ale ciężar go spowalnia. */
    miecz: { silaRycerza: 1.45, szybkoscRycerza: 0.8 },
    /** Kielich: rany goją się szybciej, głód rośnie szybciej. */
    kielich: { leczenie: 1.8, glod: 1.22 },
    /** Księga: modlitwa daje więcej wiary, a głębia szybciej miesza w głowach (i wolniej puszcza). */
    ksiega: { wiara: 1.3, szalenstwo: 2.5, zdrowienie: 0.5 },
  },
};

/** „o 35% więcej” z mnożnika 1.35 (albo „o 25% mniej” z 0.75). */
const proc = (m: number, wiecej: string, mniej: string): string => `o ${Math.round(Math.abs(m - 1) * 100)}% ${m >= 1 ? wiecej : mniej}`;
const S = ZABYTKI.skutki;

/** Nazwy zabytków (mianownik) i to, co pokazuje karta, karta postaci i atlas. */
export const ZABYTEK: Record<TypZabytku, { nazwa: string; biernik: string; premia: string; kara: string; opis: string }> = {
  relikwiarz: {
    nazwa: 'Relikwiarz świętego', biernik: 'relikwiarz świętego',
    premia: `modlitwa ${proc(S.relikwiarz.modlitwa, 'mocniejsza', 'słabsza')}`,
    kara: `kucie ${proc(S.relikwiarz.kopanie, 'szybsze', 'wolniejsze')}`,
    opis: 'Srebrna skrzyneczka z kośćmi świętego. Kto ją niesie w sercu, modli się żarliwiej — i nie chce ranić skały.',
  },
  miecz: {
    nazwa: 'Miecz krzyżowca', biernik: 'miecz krzyżowca',
    premia: `rycerz bije ${proc(S.miecz.silaRycerza, 'mocniej', 'słabiej')}`,
    kara: `rycerz chodzi ${proc(S.miecz.szybkoscRycerza, 'szybciej', 'wolniej')}`,
    opis: 'Wyszczerbiony miecz, wciąż ostry. Rycerz poczuje go w ręku — i w nogach, bo jest ciężki jak grzech.',
  },
  kielich: {
    nazwa: 'Kielich', biernik: 'kielich',
    premia: `rany goją się ${proc(S.kielich.leczenie, 'szybciej', 'wolniej')}`,
    kara: `głód rośnie ${proc(S.kielich.glod, 'szybciej', 'wolniej')}`,
    opis: 'Poczerniały kielich z ciemnym osadem na dnie. Rany po nim się zasklepiają — a brzuch woła częściej.',
  },
  ksiega: {
    nazwa: 'Księga', biernik: 'księgę',
    premia: `modlitwa daje ${proc(S.ksiega.wiara, 'więcej', 'mniej')} wiary`,
    kara: `szaleństwo głębi przychodzi ${String(S.ksiega.szalenstwo).replace('.', ',')} raza częściej i mija dwa razy wolniej`,
    opis: 'Księga w zbutwiałej skórze, pisana nieznaną ręką. Modlitwy z niej niosą dalej — a litery śnią się po nocach.',
  },
};

/** Nazwy ruin (mianownik i miejscownik — „odkrył w zawalonej kaplicy”). */
export const RUINA: Record<RodzajRuiny, { nazwa: string; miejscownik: string }> = {
  kaplica: { nazwa: 'zawalona kaplica', miejscownik: 'zawalonej kaplicy' },
  kopalnia: { nazwa: 'stara kopalnia', miejscownik: 'starej kopalni' },
  miasto: { nazwa: 'ruiny miasta', miejscownik: 'ruinach miasta' },
};
