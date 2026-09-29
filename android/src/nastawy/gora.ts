/**
 * GÓRA — zasoby gracza, sen (przegrana) i reguły całego świata.
 *
 * Zasoby: Krew (ze śmierci), Wiara (z modlitw), Otchłań (z tego, czego nikt
 * nie pamięta). Sen 0..1: przy 1 góra zasypia i partia się kończy.
 */
export const GORA = {
  // --------------------------------------------------------------- start
  /** Z tyloma zasobami zaczynasz. */
  startWiara: 30,
  startKrew: 60,
  /**
   * WERSJA ANDROID: zasoby widać jako liczby, więc mają górny limit — inaczej po kilku minutach
   * gracz miał dziesiątki tysięcy Wiary i każdy wybór na karcie wydarzenia był darmowy.
   */
  wiaraMax: 200, krewMax: 250,
  /** Tryb „łaskawa góra”: tyle Krwi więcej na start. */
  laskawaKrew: 100,

  // ------------------------------------------------------------- otchłań
  /** Ile Otchłani daje jeden zapomniany kafel (wydanie jej zasklepia tyle samo). */
  otchlanNaKafel: 0.0035,
  /** Zasklepianie nieznanego: promień jednej łaty. */
  zasklepianiePromien: 8,

  // ------------------------------------------------------------- rozejm
  /** Przez tyle tików od startu nikt nikogo nie atakuje (pierwsze minuty bez rzezi). */
  rozejmTikow: 2400,

  // ----------------------------------------------------------------- sen
  /** Monokultura: sen zaczyna rosnąć, gdy jedna rasa ma więcej niż ten udział… */
  senOdDominacji: 0.62,
  /** …i rośnie najszybciej przy pełnej dominacji (zakres = 1 − próg). */
  senZakresDominacji: 0.38,
  /** Przyrost snu na tik przy pełnej monokulturze. WIĘCEJ = szybsza przegrana. */
  senOdMonokultury: 0.000009,
  /** Pustka też usypia: poniżej tylu mieszkańców… */
  senPustkaPonizej: 10,
  /** …z takim przyrostem na tik przy zupełnie pustej górze. */
  senOdPustki: 0.000022,
  /** Gdy nic nie usypia, sen cofa się o tyle na tik. */
  senCofaSie: 0.0005,
  /** Tryb „łaskawa góra”: sen przychodzi w takim ułamku tempa. */
  laskawaSen: 0.6,
  /** Progi, przy których dzwoni dzwon i kronika ostrzega. */
  senProgi: [0.25, 0.5, 0.8],
  /** Cudza wojna (nacja z twojego szeptu) cofa sen o tyle za każdą śmierć. */
  wojnaBudzi: 0.01,

  // --------------------------------------------------------------- dochód
  /** Dochód spada, gdy dominacja przekracza to… */
  dochodOdDominacji: 0.6,
  /** …liniowo do zera na przestrzeni tylu punktów dominacji… */
  dochodZakres: 0.35,
  /** …ale nigdy poniżej tego mnożnika. */
  dochodMin: 0.25,

  // --------------------------------------------------------- śmierć i krew
  /** Śmierć daje tyle Krwi × rozmiar rasy. */
  krewZaSmierc: 3,
  /** Śmierć karmi grzybnię: tyle kafli wzrostu × rozmiar rasy. */
  grzybniaZaSmierc: 1.5,

  // ------------------------------------------------------------- modlitwa
  /** Modlitwa daje Wiarę: wiaraRasy × oddanie × to × mnożnik miejsca. */
  modlitwaWiara: 0.005,
  /** Mnożnik modlitwy przy rdzeniu i przy twoim znaku. */
  modlitwaPrzyRdzeniu: 3, modlitwaPrzyZnaku: 2,
  /** Modlitwa podsyca oddanie nacji: to × wiaraRasy × (1 − oddanie) / max(`modlitwaNaGlowe`, liczebność). */
  modlitwaOddanie: 0.00004,
  modlitwaNaGlowe: 8,
  /** Szansa na iskrę modlitwy (czysto wizualne). */
  modlitwaIskra: 0.06,

  // --------------------------------------------------------------- ofiara
  /** Ofiarą jest dziecko (młodsze niż tyle tików) w tym promieniu. */
  ofiaraWiek: 900, ofiaraZasieg: 8,
  /** Bez dziecka pod ręką nacja traci tyle oddania. */
  ofiaraBrakKara: 0.02,
  /** Ofiara daje: Wiarę (× dochód), Krew, oddanie nacji. */
  ofiaraWiara: 14, ofiaraKrew: 6, ofiaraOddanie: 0.012,

  // --------------------------------------------------------------- grzybnia
  /** Grzybnia startuje z takim zapasem wzrostu. */
  grzybniaStart: 60,
  /** Co ile tików przeliczamy kafle grzybni i kości. */
  grzybniaSpisCo: 40,
  /** Prób wzrostu na tik: część grzybni, obcięta do min–max. */
  grzybniaProby: 0.06, grzybniaProbyMin: 4, grzybniaProbyMax: 140,
  /** Szansa wzrostu na mokrym / suchym kaflu powietrza. */
  grzybniaMokro: 0.35, grzybniaSucho: 0.03,
  /** Koszt wzrostu: na kościach / na pustym kaflu. */
  grzybniaKosztKosci: 0.5, grzybniaKoszt: 1,
  /** Na start i przy nakarmieniu świata: prób zasiania grzybni i szansa na suchej podłodze. */
  grzybniaStartProby: 900, grzybniaStartSucho: 0.25,
  /** Ile grzybni liczy się jako jeden „mieszkaniec” w spisie. */
  grzybniaNaGlowe: 22,

  // ------------------------------------------------------------- kronika
  /** Ta sama linijka kroniki w tym oknie tików zagęszcza poprzednią. */
  kronikaOkno: 900,
  /** Kronika pamięta tyle wpisów. */
  kronikaDlugosc: 400,

  // ------------------------------------------------------------- efekty
  /** Jak długo (tiki) trwają znaki w świecie: cud i skaza / myśl / reszta. */
  efektCud: 90, efektMysl: 140, efektInny: 40,
  /** Najwięcej naraz. */
  efektowMax: 60,
  /** Najwięcej cząsteczek naraz. */
  czasteczekMax: 900,
};

/**
 * LUDY — nacje: jak powstają, rosną, pękają i stygną.
 * Pola „zRasy” to [Ślepy Lud, Żużlowcy, Prządki, pozostali].
 */
export const LUDY = {
  /** Górny limit liczebności nacji: Ślepy Lud / Żużlowcy / Prządki / reszta. */
  limitNacji: { slepyLud: 60, zuzlowcy: 34, przadki: 20, inni: 8 },
  /** Oddanie nowej nacji: Ślepy Lud / Żużlowcy / reszta. */
  oddanieStart: { slepyLud: 0.5, zuzlowcy: 0.3, inni: 0.08 },
  /** Do takiego oddania nacja wraca sama („natura”): Ślepy Lud / Żużlowcy / reszta. */
  oddanieNatura: { slepyLud: 0.45, zuzlowcy: 0.3, inni: 0.08 },
  /** Jak szybko oddanie wraca do natury (co 90 tików, ułamek różnicy). Na telefonie wolniej niż 0.004 na komputerze. */
  stygniecie: 0.002,
  /** Urazy między nacjami wygasają o tyle co 90 tików. */
  urazyWygasaja: 0.004,
  /** Odcień nacji losowany w tym zakresie ±. */
  odcien: 0.18,

  /** Twardy sufit liczebności rasy: [Ślepy Lud, Żużlowcy, Trole, Prządki, Ludzie, Grzybnia]. */
  sufitRasy: [180, 90, 24, 64, 9999, 0],

  /** Pojemność środowiska (ile rasa wyżywi). WIĘCEJ = liczniejsza rasa. */
  pojemnosc: {
    /** Ślepy Lud: podstawa + jedzenie × to (kość liczy się podwójnie). */
    slepyLud: 14, slepyLudNaJedzenie: 0.15,
    /** Żużlowcy: podstawa + kuźnie × to. */
    zuzlowcy: 6, zuzlowcyNaKuznie: 9,
    /** Prządki: podstawa + ofiary (Ślepy Lud i Żużlowcy) × to. */
    przadki: 4, przadkiNaOfiare: 0.14,
    /** Trole: podstawa + grzybnia × to. */
    trole: 3, troleNaGrzybnie: 0.05,
  },
  /** Monokultura dusi się sama: powyżej takiego udziału w górze… */
  ciasnotaOdUdzialu: 0.58,
  /** …tłok rośnie × (1 + nadmiar × to). */
  ciasnotaSila: 1.6,

  /** Koszt budowy w rudzie: ołtarz (Ślepy Lud) / kuźnia (Żużlowcy). */
  kosztOltarza: 2, kosztKuzni: 3,
  /** Plac budowy szukany w tym promieniu. */
  budowaZasieg: 13,
  /** Kuźnia musi mieć magmę w tym promieniu. */
  kuzniaOgien: 4,
  /** Ołtarz dodaje tyle oddania nacji. */
  oltarzOddanie: 0.03,
  /** Nowa kuźnia daje tyle Wiary (× dochód). */
  kuzniaWiara: 6,
  /** Wykuwanie Żużlowca: kosztuje tyle rudy… */
  wykuciKoszt: 3,
  /** …co najmniej co tyle tików… */
  wykuciMinOdstep: 300,
  /** …a przy jednej kuźni co tyle (dzielone przez liczbę kuźni). */
  wykuciOdstep: 1500,
  /** Nie wykuwa, gdy tłok rasy przekracza to. */
  wykuciTlok: 0.95,
  /** Wykuty rodzi się w takim wieku (tiki). */
  wykuciWiek: 400,
  /** Prządki przerabiają niewolnika na swoją, z taką szansą (co 90 tików). */
  przerabianieSzansa: 0.35,
  /** Przerobiona zaczyna w takim wieku. */
  przerabianieWiek: 300,
  /** Nie przerabiają, gdy tłok Prządek przekracza to. */
  przerabianieTlok: 0.95,

  /** Jarzmo: wzięty traci taką część oddania. */
  jarzmoOddanie: 0.5,

  /** Rozłam: nacja pęka, gdy ma ponad taką część limitu… */
  rozlamOdLimitu: 0.7,
  /** …z taką szansą (co 240 tików)… */
  rozlamSzansa: 0.25,
  /** …o ile w górze żyje nie więcej niż tyle nacji. */
  rozlamMaxNacji: 24,
  /** Odchodzi ktoś dalej od gniazda niż to… */
  rozlamOdleglosc: 18,
  /** …i zabiera do tylu sąsiadów w tym promieniu. */
  rozlamZabiera: 8, rozlamZasieg: 10,
  /** Nowa nacja dostaje oddanie starej × los od–do. */
  rozlamOddanieOd: 0.5, rozlamOddanieDo: 1.2,
  /** Warta pod rdzeniem nie odchodzi przy rozłamie: pudło wokół rdzenia. */
  rozlamWarta: 20,

  /** Prorok (szept): nowa nacja ma oddanie starej + to… */
  prorokOddanie: 0.35,
  /** …inny odcień o tyle… */
  prorokOdcien: 0.25,
  /** …i zabiera do tylu wiernych w tym promieniu. */
  prorokZabiera: 6, prorokZasieg: 12,

  /** Szaleniec zmienia się w trola przy szaleństwie > to i głębokości > to. */
  trolSzalenstwo: 0.95, trolGlebokosc: 0.78,
  /** Odszczepieniec zakłada nową nację z szansą (o ile stara ma więcej niż tylu)… */
  sektaSzansa: 0.5, sektaMinNacja: 6,
  /** …z oddaniem starej × to. */
  sektaOddanie: 0.5,

  /** Uraza: napastnik dostaje tyle, ofiara tyle. */
  urazaNapastnik: 1, urazaOfiara: 2,
  /** Swoi (ta sama rasa) biją się dopiero przy urazie większej niż to. */
  urazaWojnaSwoich: 2,
  /** Trol atakuje, gdy głodny ponad to albo przestraszony ponad to. */
  trolAtakGlod: 0.45, trolAtakStrach: 0.3,
  /** Obcy bez urazy biją się z szansą to × min(1, liczebność / `bojkaPelnaOd`). */
  bojkaSzansa: 0.05, bojkaPelnaOd: 12,
};

/** Zasiedlenie nowej góry: kto, ilu i na jakiej głębokości (0..1). */
export const ZASIEDLENIE = {
  /** Pierwsza nacja Ślepego Ludu: ilu, głębokość od–do. */
  slepyLud1: { ilu: 14, od: 0.06, do: 0.22 },
  /** Druga nacja Ślepego Ludu. */
  slepyLud2: { ilu: 12, od: 0.24, do: 0.42 },
  /** Żużlowcy (szukają miejsca przy ogniu w paśmie od–doOgnia). */
  zuzlowcy: { ilu: 9, od: 0.45, do: 0.66, doOgnia: 0.72 },
  /** Trole: legowisko co najmniej tyle kafli od innych gniazd. */
  trole: { ilu: 3, od: 0.55, do: 0.8, odstep: 30 },
  /** Prządki: w tej odległości (od–do) w bok od drugiej nacji Ślepego Ludu. */
  przadki: { ilu: 5, od: 0.3, do: 0.5, bokOd: 24, bokRozrzut: 14 },
  /** Część zastanego pokolenia jest dorosła: wiek losowy do tej części życia. */
  dorosliDo: 0.45,
  /** Znana okolica gniazda na start: promień i ile dodatkowych plam wiedzy. */
  wiedzaPromien: 16, wiedzaPlam: 6, wiedzaPlamaPromien: 7,
  /** Spiżarnia na start: tyle kafli jedzenia przy każdym gnieździe. */
  spizarnia: 12,
  /** Nakarmienie świata (samouczek): jedzenia na gniazdo, zapas grzybni, maks. głód. */
  nakarmJedzenie: 26, nakarmGrzybnia: 240, nakarmGlod: 0.12,
};

/**
 * PRZYPŁYWY — co przychodzi z zewnątrz: najazdy, powodzie, zarazy, nowe plemiona.
 */
export const PRZYPLYWY = {
  /** Kolejny przypływ za tyle tików + los do `rozrzut`. */
  odstep: 2200, rozrzut: 1800,
  /** Pierwszy przypływ po tylu tikach. */
  pierwszy: 2600,
  /** Nowe plemię schodzi, gdy żyje mniej niż tylu… */
  pustkaPonizej: 14,
  /** …ale nie częściej niż co tyle tików… */
  osadnicyOdstep: 6000,
  /** …i najwyżej tyle razy na partię. */
  maxPrzybyszow: 10,
  /** Przy dominacji ponad to góra ściąga obcy lud z głębi, z taką szansą. */
  obcyOdDominacji: 0.74, obcySzansa: 0.65,
  /** Prządki przychodzą tylko, gdy ofiar (Ślepy Lud + Żużlowcy) jest co najmniej tyle. */
  przadkiOfiar: 10,
  /** Ślepy Lud i tak się rodzi: przy wyborze plemienia liczy się jako o tylu liczniejszy. */
  slepyLudPremia: 6,
  /** Nowe plemię: oddanie od + los do rozrzutu. */
  osadnicyOddanie: 0.3, osadnicyOddanieRozrzut: 0.3,
  /** Nowe plemię: ilu (Ślepy Lud / inni) + los do rozrzutu. */
  osadnicySlepyLud: 8, osadnicyInni: 6, osadnicyRozrzut: 6,
  /** Wiek przybyszów losowy do tylu tików. */
  osadnicyWiek: 1200,
  /** Żużlowcy przynoszą tyle rudy na pierwszą kuźnię. */
  zuzlowcyRuda: 6,
  /** Spiżarnia przy nowym plemieniu / obcym ludzie. */
  osadnicySpizarnia: 10, obcySpizarnia: 8,
  /** Obcy lud: oddanie od + rozrzut, ilu + rozrzut, wiek do. */
  obcyOddanie: 0.22, obcyOddanieRozrzut: 0.3, obcyIlu: 4, obcyRozrzut: 4, obcyWiek: 800,
  /** Najazd ludzi: ilu + los do rozrzutu. */
  ludzieIlu: 5, ludzieRozrzut: 7,
  /** Powódź: świeże plemiona (młodsze niż tyle tików) są oszczędzane w tym odstępie. */
  swiezeTikow: 3000, powodzOdstep: 14,
  /** Powódź: tyle prób zalania, w pasie tylu kafli pod powierzchnią. */
  powodzProby: 900, powodzGlebokosc: 12,
  /** Zaraza omija dominującą rasę z szansą (celowana) / resztę z szansą (niecelowana). */
  zarazaOmijaCel: 0.4, zarazaOmija: 0.85,
  /** Zaraza zabiera taką część zdrowia: celowanym / reszcie. */
  zarazaCel: 0.45, zaraza: 0.3,
  /** Żyła szaleństwa: głębokość od + rozrzut, ile prób. */
  zylaOd: 0.6, zylaRozrzut: 0.3, zylaProby: 120,
};
