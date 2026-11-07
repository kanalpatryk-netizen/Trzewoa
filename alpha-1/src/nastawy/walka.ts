/**
 * Alpha 1 (6.11) — RUCHY WALKI rycerza i demona (sim/walka.ts, rysunek: render/lud/walka-rycerza.ts i render/demon-boss.ts).
 * Polecenie użytkownika: „każdy atak, każdy ruch w walce ma być konkretną animacją (rycerz ma mieć łącznie 25
 * zaawansowanych animacji walk), a boss 20; animacje mają być długie i dobrze oddawać zadane obrażenia; niech niektóre
 * ataki będą możliwe tylko, gdy rycerz jest weteranem, a niektóre tylko, gdy ma konkretne części zbroi”.
 *
 * Potem (6.11): „usuń animację skoku dla bossa” — skok z uderzeniem usunięty, demon ma 19 ruchów.
 *
 * Każdy ruch to coś, co dzieje się w symulacji: ma długość, chwile trafień i mnożniki siły — rysunek tylko go odgrywa,
 * więc cios trafia dokładnie wtedy, gdy na ekranie spada ostrze. Mnożniki dobrane tak, żeby rycerz zadawał średnio tyle,
 * co dawniej (cios co 60 tików): suma mnożników ≈ (długość + przerwa) / 60; ataki weterana × 1,2, ze zbroją × 1,1
 * i z ogłuszeniem. Demon: ≈ (długość + przerwa) / 160 × siła (dawniej cios co 160 tików).
 * Tiki: 120 = sekunda.
 */
import type { CzescZbroi } from './zbroja';

export type IdRuchuRycerza =
  // podstawowe (6)
  | 'ciecieZGory' | 'pchniecie' | 'ciecieBoczne' | 'ciecieOdwrotne' | 'seriaTrzech' | 'ciecieOdDolu'
  // tylko weteran (5)
  | 'piruet' | 'ciosZWyskoku' | 'mlynek' | 'finta' | 'egzekucja'
  // tylko w części zbroi (6)
  | 'uderzenieTarcza' | 'szarzaZTarcza' | 'taranBarkiem' | 'kolano' | 'uderzenieHelmem' | 'kontraNapiersnika'
  // obrona i reakcje (6)
  | 'blokTarcza' | 'parowanie' | 'unik' | 'trafionyLekko' | 'trafionyMocno' | 'powalony'
  // postawa i podejście (2)
  | 'garda' | 'podejscie';

export interface RuchRycerza {
  nazwa: string;
  opis: string;
  rodzaj: 'atak' | 'obrona' | 'reakcja' | 'postawa';
  /** długość (tiki) */
  dl: number;
  /** trafienia: [tik od początku ruchu, mnożnik siły] */
  traf?: [number, number][];
  /** dodatkowy zasięg ciosu (kafle) i z jakiej odległości można zacząć (szarża, wyskok) */
  zasieg?: number; zDaleka?: number;
  /** wymaga: weterana i/lub tych części zbroi (wszystkich) */
  weteran?: boolean; zbroja?: CzescZbroi[];
  /** waga w losowaniu ataku (0 — sam się nie wybiera: kontra) */
  waga?: number;
  /** po trafieniu: ogłuszenie celu (tiki, opóźnia jego cios) i odrzut (kafle — tylko Strażnicy, demon za ciężki) */
  ogluszenie?: number; odrzut?: number;
  /** doskok w stronę celu: [kafle, od tiku, do tiku] */
  doskok?: [number, number, number];
  /** demon nie zasłoni się przed nim przedramieniem */
  nieDoZablokowania?: boolean;
  /** tylko na wroga, któremu zostało mniej życia niż ten ułamek */
  wrogPonizej?: number;
  /** demon się chwieje (zachwianie) po takim trafieniu */
  chwieje?: boolean;
}

export const RUCHY_RYCERZA: Record<IdRuchuRycerza, RuchRycerza> = {
  ciecieZGory: {
    nazwa: 'Cięcie z góry', rodzaj: 'atak', dl: 102, traf: [[56, 2.0]], waga: 1,
    opis: 'Miecz unosi się za głowę, krok w przód i cięcie z całej siły w dół.',
  },
  pchniecie: {
    nazwa: 'Pchnięcie', rodzaj: 'atak', dl: 78, traf: [[40, 1.6]], zasieg: 0.35, waga: 1,
    opis: 'Ostrze cofnięte do biodra, wypad i pchnięcie sztychem — sięga dalej niż cięcie.',
  },
  ciecieBoczne: {
    nazwa: 'Cięcie z boku', rodzaj: 'atak', dl: 90, traf: [[48, 1.8]], waga: 1,
    opis: 'Zamach zza pleców i płaskie cięcie na wysokości barku, ze skrętem bioder.',
  },
  ciecieOdwrotne: {
    nazwa: 'Cięcie odwrotne', rodzaj: 'atak', dl: 90, traf: [[46, 1.8]], waga: 0.8,
    opis: 'Miecz założony na drugie ramię i cięcie z odwrotnej strony — często zaraz po cięciu z boku.',
  },
  seriaTrzech: {
    nazwa: 'Seria trzech cięć', rodzaj: 'atak', dl: 168, traf: [[46, 1.0], [86, 1.0], [128, 1.1]], waga: 0.8,
    opis: 'Z góry, z boku i pchnięcie — trzy ciosy jeden za drugim, krok za krokiem w przód.',
  },
  ciecieOdDolu: {
    nazwa: 'Cięcie od dołu', rodzaj: 'atak', dl: 96, traf: [[54, 1.9]], waga: 0.9,
    opis: 'Przysiad z ostrzem przy ziemi i cięcie w górę, wstając na palce.',
  },
  piruet: {
    nazwa: 'Cięcie z obrotu', rodzaj: 'atak', dl: 132, traf: [[78, 3.0]], weteran: true, waga: 0.9, chwieje: true,
    opis: 'Weteran: pełny obrót z płaszczem w powietrzu i cięcie z rozpędu.',
  },
  ciosZWyskoku: {
    nazwa: 'Cios z wyskoku', rodzaj: 'atak', dl: 150, traf: [[96, 3.4]], weteran: true, waga: 0.8, doskok: [0.9, 40, 92],
    zDaleka: 2.6, ogluszenie: 40, chwieje: true,
    opis: 'Weteran: przysiad, skok z mieczem nad głową i cios przy lądowaniu — z dwóch kafli.',
  },
  mlynek: {
    nazwa: 'Młynek', rodzaj: 'atak', dl: 180, traf: [[42, 0.95], [74, 0.95], [106, 0.95], [138, 0.95]], weteran: true, waga: 0.8,
    opis: 'Weteran: ostrze wiruje przed nim kołem — cztery cięcia, jedno za drugim.',
  },
  finta: {
    nazwa: 'Finta i pchnięcie', rodzaj: 'atak', dl: 120, traf: [[86, 2.8]], weteran: true, waga: 0.8, zasieg: 0.35,
    nieDoZablokowania: true, chwieje: true,
    opis: 'Weteran: udaje cięcie z góry, a gdy wróg się zasłoni — nagłe pchnięcie dołem. Demon nie zdąży zasłonić się ręką.',
  },
  egzekucja: {
    nazwa: 'Cios dobijający', rodzaj: 'atak', dl: 168, traf: [[114, 4.6]], weteran: true, waga: 3, wrogPonizej: 0.35, chwieje: true,
    opis: 'Weteran, na osłabionego wroga: miecz oburącz za głową, długi zamach i cios, po którym klęka.',
  },
  uderzenieTarcza: {
    nazwa: 'Uderzenie tarczą', rodzaj: 'atak', dl: 84, traf: [[42, 1.4]], zbroja: ['tarcza'], waga: 0.9, ogluszenie: 60, odrzut: 0.5,
    opis: 'Z tarczą: krok i pchnięcie tarczą w twarz wroga — ogłusza go i opóźnia jego cios.',
  },
  szarzaZTarcza: {
    nazwa: 'Szarża z tarczą', rodzaj: 'atak', dl: 132, traf: [[84, 2.6]], zbroja: ['tarcza', 'nakolanniki'], waga: 0.7,
    doskok: [1.7, 20, 80], zDaleka: 3.8, ogluszenie: 50, odrzut: 1.0,
    opis: 'Z tarczą i w nakolannikach: rozbieg z tarczą przed sobą i zderzenie — zaczyna z prawie czterech kafli.',
  },
  taranBarkiem: {
    nazwa: 'Taran barkiem', rodzaj: 'atak', dl: 108, traf: [[62, 2.2]], zbroja: ['naramienniki'], waga: 0.8, doskok: [0.6, 30, 60], odrzut: 0.8,
    opis: 'W naramiennikach: głowa w dół, bark naprzód i całym ciałem w wroga.',
  },
  kolano: {
    nazwa: 'Cios kolanem', rodzaj: 'atak', dl: 72, traf: [[38, 1.4]], zbroja: ['nakolanniki'], waga: 0.8, ogluszenie: 25,
    opis: 'W nakolannikach: chwyta wroga wolną ręką i wbija mu kolano — szybki, krótki cios.',
  },
  uderzenieHelmem: {
    nazwa: 'Uderzenie hełmem', rodzaj: 'atak', dl: 80, traf: [[44, 1.5]], zbroja: ['helm'], waga: 0.7, ogluszenie: 45,
    opis: 'W hełmie: odchyla się i bije czołem hełmu — wróg się zatacza.',
  },
  kontraNapiersnika: {
    nazwa: 'Kontra na napierśniku', rodzaj: 'atak', dl: 110, traf: [[70, 2.4]], zbroja: ['napiersnik'], waga: 0,
    opis: 'W napierśniku: przyjmuje cios na blachę (rana o połowę mniejsza), nie cofa się i od razu tnie.',
  },
  blokTarcza: {
    nazwa: 'Blok tarczą', rodzaj: 'obrona', dl: 46, zbroja: ['tarcza'],
    opis: 'Z tarczą: zasłania się w porę — cios zostawia ułamek rany, sypią się iskry.',
  },
  parowanie: {
    nazwa: 'Parowanie', rodzaj: 'obrona', dl: 48, weteran: true,
    opis: 'Weteran: odbija cios ostrzem (bez rany) i od razu jest gotów do kontry.',
  },
  unik: {
    nazwa: 'Unik', rodzaj: 'obrona', dl: 54, zbroja: ['nakolanniki'],
    opis: 'W nakolannikach: odskok w tył przed ciosem — bez rany.',
  },
  trafionyLekko: {
    nazwa: 'Lekkie trafienie', rodzaj: 'reakcja', dl: 30,
    opis: 'Mała rana: wzdryga się i walczy dalej (cios, który zaczął, idzie do końca).',
  },
  trafionyMocno: {
    nazwa: 'Mocne trafienie', rodzaj: 'reakcja', dl: 66,
    opis: 'Duża rana: cios przerywa mu atak, zatacza się w tył i łapie równowagę.',
  },
  powalony: {
    nazwa: 'Powalony', rodzaj: 'reakcja', dl: 148,
    opis: 'Najcięższe ciosy demona zwalają go z nóg: pada na plecy, leży i wstaje, podpierając się mieczem.',
  },
  garda: {
    nazwa: 'Garda', rodzaj: 'postawa', dl: 0,
    opis: 'Między ciosami: na ugiętych nogach, tarcza przed sobą, miecz w górze — oczy na wroga.',
  },
  podejscie: {
    nazwa: 'Podejście w gardzie', rodzaj: 'postawa', dl: 0,
    opis: 'Do wroga: krótkie, ostrożne kroki, nie opuszczając gardy.',
  },
};

/** Obrona i reakcje rycerza. */
export const OBRONA_RYCERZA = {
  /** przerwa w gardzie między ciosami (tiki); mnożnik siły ruchów (nadrabia czas obron i reakcji) */
  przerwa: 18, mnoznik: 1.12,
  /** blok tarczą: szansa (weteran — więcej) i ile zostaje z rany */
  blok: { szansa: 0.38, weteran: 0.12, rany: 0.3 },
  /** parowanie (weteran): szansa — rany nie ma, następny cios od razu */
  parowanie: { szansa: 0.22 },
  /** unik (nakolanniki): szansa, odskok (kafle) */
  unik: { szansa: 0.18, krok: 0.55 },
  /** kontra (napierśnik): szansa, ile zostaje z rany */
  kontra: { szansa: 0.3, rany: 0.55 },
  /** reakcja na ranę (ułamek największego życia): mocne trafienie od, powalenie od (albo cios „powalający” od) */
  mocneOd: 0.12, powalenieOd: 0.3, powalajacyOd: 0.05,
  /** powalony: tyle tików leży (ogłuszony), odrzut (kafle) */
  lezy: 84, odrzutPowalenia: 0.7,
  /** mocne trafienie: tyle tików stoi i łapie równowagę, odrzut */
  zatacza: 40, odrzutMocny: 0.3,
  /** kombinacje: po tym ruchu tamten waży tyle razy więcej */
  kombo: {
    ciecieBoczne: 'ciecieOdwrotne', kolano: 'ciecieZGory', uderzenieTarcza: 'pchniecie', uderzenieHelmem: 'ciecieOdDolu',
    parowanie: 'pchniecie',
  } as Partial<Record<IdRuchuRycerza, IdRuchuRycerza>>,
  komboWaga: 3.5,
};

export type IdRuchuBossa =
  // ataki w zwarciu (7)
  | 'zGory' | 'zamach' | 'podciecie' | 'podwojnyZamach' | 'zgniecenie' | 'przygniecenie' | 'odepchniecie'
  // na obszar (3)
  | 'tupniecie' | 'tchnienie' | 'wybuchAureoli'
  // z dystansu (2) — skok z uderzeniem usunięty na polecenie użytkownika (6.11)
  | 'biczLancucha' | 'szarza'
  // zdolności (5)
  | 'uderzenieWZiemie' | 'ryk' | 'rozkazRzut' | 'rozkazTarcza' | 'rozkazZawal'
  // obrona i reakcja (2)
  | 'blok' | 'zachwianie';

export interface RuchBossa {
  nazwa: string;
  opis: string;
  rodzaj: 'atak' | 'obszar' | 'dystans' | 'zdolnosc' | 'obrona' | 'reakcja';
  /** długość (tiki); 0 — zależy od chwili (rozkaz trwa, póki dłoń wstaje; blok — do ciosu rycerza) */
  dl: number;
  /** trafienia: [tik, mnożnik siły demona] */
  traf?: [number, number][];
  /** zasięg (kafle) i najmniejsza odległość celu (ataki z dystansu) */
  zasieg?: number; od?: number;
  /** obszar: promień wokół demona (kafle); powala bliżej niż `powalaDo` */
  promien?: number; powalaDo?: number;
  /** zamach przed sobą — trafia wszystkich w łuku, nie tylko cel */
  luk?: boolean;
  /** szansa, że powali rycerza (gdy go nie obroni), odrzut (kafle), ogłuszenie (tiki) */
  powala?: number; odrzut?: number; ogluszenie?: number;
  /** przygniata dłonią: rycerz leży pod nią tyle tików */
  przygniata?: number;
  /** tchnienie: [od tiku, do tiku, co ile tików], mnożnik siły na jeden podmuch */
  oddech?: [number, number, number]; podmuch?: number;
  /** przemieszczenie: [od tiku, do tiku, najwyżej kafli] (szarża — do zderzenia) */
  przemieszcza?: [number, number, number];
  /** waga w losowaniu; dostępny dopiero, gdy demonowi zostało mniej życia niż ten ułamek */
  waga?: number; zycieDo?: number;
}

export const RUCHY_BOSSA: Record<IdRuchuBossa, RuchBossa> = {
  zGory: {
    nazwa: 'Cios z góry', rodzaj: 'atak', dl: 150, traf: [[70, 1.35]], zasieg: 2.4, powala: 0.5, waga: 1,
    opis: 'Ręka nad głowę, odchylenie i cios pięścią w dół — powala rycerza, jeśli się nie obroni.',
  },
  zamach: {
    nazwa: 'Zamach pazurami', rodzaj: 'atak', dl: 130, traf: [[64, 1.1]], zasieg: 2.7, luk: true, waga: 1,
    opis: 'Ręka przez pierś i łukiem przed siebie — pazury ciągną smugę ognia i trafiają każdego w zasięgu.',
  },
  podciecie: {
    nazwa: 'Podcięcie od dołu', rodzaj: 'atak', dl: 140, traf: [[70, 1.2]], zasieg: 2.3, powala: 0.45, odrzut: 0.8, waga: 0.9,
    opis: 'Przysiad, ręka przy ziemi i cios w górę — wyrzuca rycerza z nóg.',
  },
  podwojnyZamach: {
    nazwa: 'Podwójny zamach', rodzaj: 'atak', dl: 190, traf: [[70, 0.75], [118, 0.75]], zasieg: 2.6, waga: 0.8,
    opis: 'Najpierw jedna ręka, zaraz druga — dwa zamachy pazurami z obrotem tułowia.',
  },
  zgniecenie: {
    nazwa: 'Zgniecenie oburącz', rodzaj: 'atak', dl: 170, traf: [[92, 1.5]], zasieg: 2.3, ogluszenie: 60, waga: 0.7,
    opis: 'Obie ręce rozłożone szeroko i klaśnięcie na rycerzu — fala uderzeniowa, rycerz ogłuszony.',
  },
  przygniecenie: {
    nazwa: 'Przygniecenie dłonią', rodzaj: 'atak', dl: 230, traf: [[80, 1.0], [150, 0.45]], zasieg: 2.4, przygniata: 110, waga: 0.35,
    opis: 'Otwarta dłoń spada na rycerza i przygniata go do ziemi — dociska jeszcze raz, potem puszcza.',
  },
  odepchniecie: {
    nazwa: 'Odepchnięcie', rodzaj: 'atak', dl: 100, traf: [[50, 0.8]], zasieg: 1.7, odrzut: 1.6, waga: 0.6,
    opis: 'Gdy rycerz podejdzie za blisko: grzbietem dłoni na odlew — odrzuca go daleko.',
  },
  tupniecie: {
    nazwa: 'Tupnięcie', rodzaj: 'obszar', dl: 140, traf: [[76, 0.75]], promien: 3.2, ogluszenie: 40, waga: 0.8,
    opis: 'Kolano w górę i stopa w posadzkę — fala ziemi rani i chwieje każdego wokół.',
  },
  tchnienie: {
    nazwa: 'Ogniste tchnienie', rodzaj: 'obszar', dl: 220, oddech: [84, 174, 10], podmuch: 0.13, zasieg: 5.2, zycieDo: 0.65, waga: 0.9,
    opis: 'Gdy słabnie: wciąga powietrze, odchyla głowę i zieje ogniem przed siebie — pali każdego w płomieniach.',
  },
  wybuchAureoli: {
    nazwa: 'Wybuch aureoli', rodzaj: 'obszar', dl: 200, traf: [[118, 0.95]], promien: 4.6, powalaDo: 2.6, odrzut: 1.2, zycieDo: 0.5, waga: 0.7,
    opis: 'Od połowy życia: skulony zbiera ogień w aureoli — i rozrzuca ręce, a krąg ognia zwala z nóg tych blisko.',
  },
  biczLancucha: {
    nazwa: 'Bicz z łańcucha', rodzaj: 'dystans', dl: 160, traf: [[86, 1.0]], zasieg: 5.6, od: 2.2, waga: 1.1,
    opis: 'Zerwany łańcuch z kajdanów jak bicz — sięga rycerza z pięciu kafli.',
  },
  szarza: {
    nazwa: 'Szarża', rodzaj: 'dystans', dl: 170, przemieszcza: [48, 104, 5], traf: [[0, 1.3]], zasieg: 7, od: 3, powala: 0.8, odrzut: 1.6, waga: 0.8,
    opis: 'Pochyla głowę i rusza na rycerza z kilku kafli — przy zderzeniu go powala i odrzuca.',
  },
  uderzenieWZiemie: {
    nazwa: 'Uderzenie w ziemię', rodzaj: 'zdolnosc', dl: 220, traf: [[110, 0]], promien: 3, ogluszenie: 30,
    opis: 'Co jakiś czas: ręce w górę z rykiem i obie pięści w ziemię — zasypuje kawałek drogi wiernych.',
  },
  ryk: {
    nazwa: 'Ryk', rodzaj: 'zdolnosc', dl: 130,
    opis: 'Po zabiciu kogoś, po klęknięciu i w ciszy: głowa w tył, szczęka otwarta, ręce szeroko.',
  },
  rozkazRzut: {
    nazwa: 'Rozkaz: rzut', rodzaj: 'zdolnosc', dl: 0,
    opis: 'Wskazuje rycerza, zaciska dłoń, unosi i ciska — dłoń z otchłani robi to samo.',
  },
  rozkazTarcza: {
    nazwa: 'Rozkaz: tarcza', rodzaj: 'zdolnosc', dl: 0,
    opis: 'Krzyżuje ręce — dłoń z otchłani wyrasta przed nim jak mur; za nią się śmieje.',
  },
  rozkazZawal: {
    nazwa: 'Rozkaz: zawał', rodzaj: 'zdolnosc', dl: 0,
    opis: 'Ręce do stropu, drze go pazurami i ściąga w dół — szpony dłoni rwą skałę.',
  },
  blok: {
    nazwa: 'Blok przedramieniem', rodzaj: 'obrona', dl: 0,
    opis: 'Gdy rycerz bierze zamach, czasem zasłania się przedramieniem — cios zostawia połowę rany (fintę przepuszcza).',
  },
  zachwianie: {
    nazwa: 'Zachwianie', rodzaj: 'reakcja', dl: 96,
    opis: 'Po ciężkim ciosie zatacza się i nie bije; przy połowie i ćwierci życia pada na kolano, a potem ryczy.',
  },
};

/** Demon: przerwy, reakcje i progi. */
export const WALKA_BOSSA = {
  /** przerwa między ruchami (tiki) */
  przerwa: 50,
  /** blok przedramieniem: szansa, gdy rycerz zaczyna cios (poniżej 30% życia — większa), ile zostaje z rany */
  blok: { szansa: 0.22, ranny: 0.35, rany: 0.45 },
  /** zachwianie: od takiej rany (ułamek życia demona) albo po ciosie, który chwieje (od `chwiejeCiosOd`); potem przez
   * `odporny` tików się nie chwieje; klęknięcie przy progach życia */
  chwiejeOd: 0.12, chwiejeCiosOd: 0.05, odporny: 360, kleka: [0.5, 0.25], dlKleku: 176,
  /** ryk w ciszy: co tyle tików, gdy nikogo nie widzi */
  rykCisza: 1800,
};
