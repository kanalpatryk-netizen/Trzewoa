/**
 * STWORZENIA — jak żyje pojedynczy mieszkaniec góry.
 *
 * Skale: głód, strach, oddanie i szaleństwo są w zakresie 0..1.
 * Zdrowie (hp) i siła są w punktach — maksimum każdej rasy jest w sim/races.ts.
 * „Na tik” = zmiana w każdym kroku symulacji (7200 tików = minuta gry).
 * „Zasięg” i „promień” w kaflach. „Tików” = jak długo trwa zajęcie, zanim
 * stworzenie wybierze nowe.
 *
 * Statystyki ras (szybkość, siła, płodność, długość życia, metabolizm…)
 * są w tabeli RACES w src/sim/races.ts.
 */
export const STWORZENIA = {
  // ------------------------------------------------------------ narodziny
  /** Z takim głodem przychodzi na świat. */
  glodNaStart: 0.2,
  /** Z takim własnym oddaniem przychodzi na świat. */
  oddanieNaStart: 0.25,

  // -------------------------------------------------------------- żywioły
  /** Obrażenia od magmy na tik: podstawa + poziom magmy w kaflu (0..8). */
  magmaObrazenia: 4,
  /** Woda głębsza niż to (0..8) topi tych, którzy nie pływają… */
  toniePowyzej: 5,
  /** …zabierając tyle zdrowia na tik… */
  tonieObrazenia: 0.22,
  /** …i dokładając tyle strachu na tik. */
  tonieStrach: 0.05,
  /** Grzybnia parzy każdego poza Ślepym Ludem: tyle zdrowia na tik. */
  grzybniaParzy: 0.02,

  // ----------------------------------------------------------------- głód
  /** Przyrost głodu na tik (× metabolizm rasy). WIĘCEJ = częstsze jedzenie. */
  glodNaTik: 0.0003,
  /** Szaleństwo przyspiesza głód: × (1 + szaleństwo × to). */
  glodOdSzalenstwa: 0.5,
  /** Przeludnienie bije w głód: × (1 + nadmiar² × to). */
  glodOdTloku: 3,
  /** W samouczku (spokojny świat) głód rośnie tylko w takim ułamku. */
  glodWSamouczku: 0.35,
  /** Żużlowcy przy ogniu: ciepło kuźni sięga tylu kafli… */
  cieploKuzni: 8,
  /** …a magmy tylu… */
  cieploMagmy: 2,
  /** …i przy cieple ubywa im tyle głodu na tik. */
  cieploKarmi: 0.0035,
  /** Powyżej takiego głodu stworzenie traci zdrowie… */
  glodZabija: 1,
  /** …tyle na tik. */
  glodObrazenia: 0.6,
  /** Najedzony (głód poniżej tego) powoli się leczy… */
  najedzonyLeczy: 0.5,
  /** …o tyle zdrowia na tik. */
  leczenieNaTik: 0.02,
  /** Starość: po przekroczeniu długości życia traci tyle zdrowia na tik. */
  starosc: 0.5,
  /** Strach wygasa: mnożony przez to co tik (bliżej 1 = wolniej). */
  wygasanieStrachu: 0.985,

  // ------------------------------------------------------- szaleństwo głębi
  /** Poniżej tej głębokości (0..1) głębia zaczyna mieszać w głowie. */
  szalenstwoOdGlebokosci: 0.72,
  /** Szansa na tik: to × (głębokość − 0.7) × 10 × odporność. */
  szalenstwoSzansa: 0.00065,
  /** Punkt odniesienia głębokości we wzorze na szansę. */
  szalenstwoPunkt: 0.7,
  /** Odporność Żużlowców na głębię (mnożnik szansy; 1 = jak inni). */
  odpornoscZuzlowcow: 0.4,
  /** O tyle rośnie szaleństwo, gdy głębia „zagada”. */
  szalenstwoSkok: 0.12,
  /** Powyżej takiego szaleństwa… */
  szalenstwoPrzelom: 0.6,
  /** …z taką szansą stworzenie odchodzi, zakłada sektę albo zmienia się w trola. */
  szalenstwoPrzelomSzansa: 0.05,
  /** Kto wrócił wyżej niż ta głębokość, dochodzi do siebie… */
  zdrowiejePowyzej: 0.6,
  /** …o tyle szaleństwa na tik. */
  zdrowienie: 0.0003,

  // ------------------------------------------------------------ przysypanie
  /** Przysypany w skale traci tyle zdrowia na tik… */
  przysypanyObrazenia: 0.12,
  /** …i zyskuje tyle strachu. */
  przysypanyStrach: 0.08,
  /** Wygrzebując się, kopie z siłą × to… */
  wygrzebywanieSila: 2.5,
  /** …i kafel puszcza przy twardość × to. */
  wygrzebywanieProg: 5,
  /** Kto nie kopie, wygrzebuje się w górę o tyle na tik. */
  wygrzebywanieWGore: 0.35,

  // ------------------------------------------------------------ grawitacja
  /** Trzyma się ściany, jeśli podciągał się w ostatnich tylu tikach. */
  trzymaSieTikow: 2,
  /** Zsuwa się po ścianie (zamiast spadać), jeśli wspinał się w ostatnich tylu tikach… */
  zsuwaSieTikow: 40,
  /** …z taką prędkością na tik. */
  zsuwanie: 0.2,
  /** Pod nogami woda głębsza niż to (0..8) trzyma jak podłoga. */
  wodaNiesie: 4,
  /** Przyspieszenie spadania na tik i maksymalna prędkość. */
  grawitacja: 0.12, maxSpadanie: 0.9,
  /** Lądowanie szybsze niż to wzbija kurz… */
  kurzOdPredkosci: 0.35,
  /** …a szybsze niż to boli. */
  bolesnyUpadek: 0.7,
  /** Upadek zabiera do tylu (ułamek maks. zdrowia)… */
  upadekObrazenia: 0.25,
  /** …przy prędkości o tyle większej od progu bólu. */
  upadekPelny: 0.2,

  // ---------------------------------------------------------------- zmysły
  /** Co ile tików stworzenie się rozgląda (odkrywa mapę). */
  rozgladanieCo: 7,
  /** Promień wzroku: ludzie, trole, reszta. */
  wzrokLudzi: 8, wzrokTroli: 8, wzrok: 6,

  // ----------------------------------------------------------- zakleszczenie
  /** Co ile tików sprawdza, czy stoi w miejscu. */
  zakleszczenieCo: 12,
  /** Ruch mniejszy niż to (kafla) = stoi. */
  zakleszczenieRuch: 0.12,
  /** Po tylu kolejnych „stoi” zmienia zamiar na spacer… */
  zakleszczenieLimit: 4,
  /** …w losowe miejsce ± tyle kafli w poziomie i pionie. */
  zakleszczenieUciekaX: 9, zakleszczenieUciekaY: 4,

  // ------------------------------------------------------- ucieczka od ognia
  /** Co ile tików sprawdza, czy obok płynie magma. */
  ogienSprawdzCo: 4,
  /** Zasięg (kwadrat), w którym liczy, skąd grzeje. */
  ogienZasieg: 2,
  /** Ucieka o tyle kafli w bok… */
  ogienUciekaX: 6,
  /** …i w górę (gdy ogień z dołu) albo w dół (gdy z góry). */
  ogienUciekaWGore: 4, ogienUciekaWDol: 2,
  /** Tyle tików trwa ucieczka od ognia. */
  ogienTikow: 50,

  // ------------------------------------------------------------ decyzje
  /** Zajęcie trwa tyle tików + losowo do `decyzjaRozrzut`, zanim wybierze nowe. */
  decyzjaTikow: 18, decyzjaRozrzut: 24,
  /** Niesiony łup chowa dla klanu po tylu tikach noszenia. */
  lupChowaPo: 240,
  /** Na każdy kafel wyznaczonej drogi zajęcie dostaje tyle tików zapasu. */
  tikowNaKafel: 14,
  /** Na kafel drogi do jedzenia (głodny idzie ostrożniej). */
  tikowNaKafelDoJedzenia: 16,
  /** Na kafel odległości „na przełaj” przy kopaniu. */
  tikowNaKafelKopania: 30,

  // ------------------------------------------------------------- szepty
  /** „Kop w dół”: cel tyle kafli niżej, zajęcie na tyle tików. */
  szeptKopGlebiej: 12, szeptKopTikow: 120,
  /** „Zabij swoich”: szuka swoich w tym promieniu, a potem kogokolwiek z rasy w tym. */
  szeptZabijSwoich: 40, szeptZabijRasy: 60, szeptZabijTikow: 90,
  /** „Uciekaj”: w górę o tyle, w bok ± tyle, przez tyle tików. */
  szeptUciekajWGore: 14, szeptUciekajWBok: 8, szeptUciekajTikow: 80,
  /** „Płódź”: tyle tików. */
  szeptPlodzTikow: 40,

  // -------------------------------------------------------------- ucieczka
  /** Ranny (zdrowie poniżej tego ułamka) i przestraszony (strach powyżej tego) ucieka. */
  rannyUcieka: 0.3, rannyStrach: 0.3,
  /** Ucieczka trwa tyle tików. */
  ucieczkaTikow: 40,

  // ----------------------------------------------------------- głód ras
  /** Od takiego głodu szuka jedzenia po swojemu: Żużlowcy / reszta. */
  glodZuzlowcow: 0.34, glodInnych: 0.5,
  /** Trol od takiego głodu zasypia w skale, jeśli w tym promieniu nie ma ofiary… */
  trolZasypiaOd: 0.85, trolOfiaraZasieg: 7,
  /** …na tyle tików. */
  trolSpiTikow: 220,
  /** Żużlowiec szuka ciepła: limit kroków drogi, zasięg na przełaj, tiki. */
  cieploLimitDrogi: 1800, cieploZasieg: 40, cieploTikow: 200,
  /** Prządka: wziętego w jarzmo szuka w tym promieniu… */
  przadkaNiewolnik: 16,
  /** …a nowej ofiary (słabszej niż `przadkaSilaOfiary`) w tym. */
  przadkaPoluje: 18, przadkaSilaOfiary: 7,
  /** Tiki na wysysanie i na polowanie. */
  przadkaTikow: 90,

  // --------------------------------------------------------------- wrogowie
  /** Wroga wypatruje w tym promieniu: ludzie / reszta. */
  wrogZasiegLudzi: 16, wrogZasieg: 11,
  /** Wróg jest „straszny”, gdy jest silniejszy o tyle razy… */
  strasznyWrog: 2.2,
  /** …wtedy ucieka z szansą to × podatność rasy na strach. */
  strachSzansa: 0.6,
  /** Prządka bierze w jarzmo zamiast walczyć, z taką szansą. */
  przadkaJarzmoSzansa: 0.75,
  /** Tiki: branie w jarzmo, walka, najazd ludzi. */
  jarzmoTikow: 70, walkaTikow: 60, najazdTikow: 90,

  // ---------------------------------------------------------------- jedzenie
  /** Od takiego głodu idzie jeść. */
  idzieJesc: 0.45,
  /** Bardzo głodny (powyżej tego) szuka dalej. */
  bardzoGlodny: 0.8,
  /** Limit kroków drogi do jedzenia: zwykle / bardzo głodny. */
  jedzenieLimit: 1500, jedzenieLimitGlodny: 2600,
  /** Zasięg szukania na przełaj: zwykle / bardzo głodny. */
  jedzenieZasieg: 18, jedzenieZasiegGlodny: 30,
  /** Podstawa tików na jedzenie. */
  jedzenieTikow: 60,
  /** Mięsożercy polują na obcych w tym promieniu… */
  polowanieZasieg: 18,
  /** …na swoją rasę od takiego głodu, na kogokolwiek od takiego. */
  kanibalizmOd: 0.9, glodSlepy: 0.95,
  polowanieTikow: 70,
  /** Kęs zaspokaja tyle głodu: kość / grzyb. */
  kesKosci: 0.9, kesGrzyba: 0.7,
  /** Kęs leczy tyle zdrowia. */
  kesLeczy: 2,

  // ---------------------------------------------------------------- noszenie
  /** Odnoszenie łupu do gniazda: tiki, limit drogi, „na miejscu” w tylu kaflach. */
  noszenieTikow: 120, noszenieLimit: 1800, noszenieBliskoGniazda: 2,
  /** Oddaje łup, gdy jest bliżej gniazda niż to. */
  oddajeLupOd: 3.5,

  // ------------------------------------------------------------- budowanie
  /** Odbudowa kuźni: tiki, limit drogi. */
  kuzniaTikow: 200, kuzniaLimit: 1800,
  /** Żużlowcy kopią rudę, gdy klan ma mniej niż tyle w zapasie i nie są głodni powyżej tego. */
  zuzlowcyKopiaDo: 8, zuzlowcyKopiaGlod: 0.6,
  /** Kopanie rudy przez Żużlowców: limit drogi, tiki, zasięg na przełaj. */
  zuzlowcyRudaLimit: 1200, zuzlowcyRudaTikow: 140, rudaZasieg: 14,

  // ------------------------------------------------------------------ ofiara
  /** Ślepy Lud składa ofiarę z dzieci, gdy oddanie klanu > to… */
  ofiaraOddanie: 0.6,
  /** …klan liczy więcej niż tylu… */
  ofiaraMinKlan: 16,
  /** …z taką szansą na decyzję. */
  ofiaraSzansa: 0.012,
  /** Droga do ołtarza: limit, tiki; zasięg na przełaj. */
  ofiaraLimit: 1500, ofiaraTikow: 120, ofiaraZasieg: 20,

  // ------------------------------------------------------------------ rozród
  /** Rodzi się, gdy zatłoczenie rasy poniżej tego (im ciaśniej, tym rzadziej)… */
  rozrodTlok: 0.92,
  /** …a miejsce liczy się jako (próg − tłok) × to, obcięte do 0..1. */
  rozrodCzulosc: 1.6,
  /** Tylko najedzeni (głód poniżej tego) i dorośli (wiek powyżej tylu tików). */
  rozrodGlod: 0.5, rozrodWiek: 400,
  /** Tiki, dystans do gniazda i limit drogi. */
  rozrodTikow: 60, rozrodDoGniazda: 3, rozrodLimit: 1200,
  /** Rodzi mimo wszystko, gdy jest dalej od gniazda niż to. */
  rozrodDaleko: 14,
  /** Poród kosztuje tyle głodu: w gnieździe / w drodze. */
  rozrodGlodPo: 0.25, rozrodGlodPoWDrodze: 0.3,

  // --------------------------------------------------------------- modlitwa
  /** Szansa na modlitwę: podstawa + oddanie klanu × to. */
  modlitwaSzansa: 0.22, modlitwaOdOddania: 0.5,
  /** Droga do świętości: limit, tiki; zasięg na przełaj. */
  modlitwaLimit: 1500, modlitwaTikow: 110, modlitwaZasieg: 22,
  /** Bez świętości w zasięgu buduje ją przez tyle tików. */
  budowaTikow: 90,
  /** Modli się, stojąc w tylu kaflach od świętości… */
  modlitwaBlisko: 2,
  /** …i zyskuje tyle własnego oddania na tik. */
  modlitwaOddanie: 0.004,

  // ---------------------------------------------------------------- kopanie
  /** Szansa, że kopacz pójdzie kopać zamiast się snuć. */
  kopanieSzansa: 0.55,
  /** Kopanie rudy: limit drogi, tiki. */
  kopanieLimit: 900, kopanieTikow: 100,
  /** Kopanie „byle gdzie”: ± tyle w poziomie, od −3 do +5 w pionie, tyle tików. */
  kopanieLosoweX: 6, kopanieTikowLosowe: 90,
  /** Postęp kucia na tik: siła kopania × (1 + szaleństwo × to). */
  kopanieOdSzalenstwa: 0.6,
  /** Kafel puszcza przy twardości × to. */
  kopanieProg: 9,
  /** Nie kopie przy magmie (w tym promieniu), chyba że szaleństwo > to. */
  kopanieOgienZasieg: 2, kopanieOgienSzalenstwo: 0.6,
  /** Łup z kafla: ruda / kryształ; kryształ dokłada tyle szaleństwa. */
  lupRudy: 1, lupKrysztalu: 2, krysztalSzalenstwo: 0.2,
  /** Spacerujący przebija się przez skałę z taką szansą. */
  spacerKopie: 0.25,
  /** Spacer: ± tyle kafli w poziomie i pionie. */
  spacerX: 10, spacerY: 3,

  // ------------------------------------------------------------------- ruch
  /** Woda głębsza niż to spowalnia do `wodaSpowalnia`. */
  wodaSpowalniaOd: 3, wodaSpowalnia: 0.5,
  /** Sieć Prządek spowalnia obcych do tego ułamka. */
  siecSpowalnia: 0.4,
  /** Mnożniki prędkości: wspinanie drogą, schodzenie drogą. */
  wspinanie: 0.6, schodzenie: 1.2,
  /** Na przełaj: schodzenie, wspinanie po ścianie, wejście na stopień, obejście. */
  schodzenieNaPrzelaj: 1.4, wspinanieNaPrzelaj: 0.55, stopien: 1.2, obejscie: 0.8,
  /** Cel osiągnięty: bliżej niż tyle w poziomie i w pionie. */
  naMiejscuX: 0.6, naMiejscuY: 1.2,
  /** Nie staje nad ogniem: patrzy w dół na tyle kafli. */
  nadOgniemPatrzy: 14,

  // ------------------------------------------------------------------ walka
  /** Zasięg ciosu. */
  walkaZasieg: 1.5,
  /** Cios = siła × (to + los × `walkaRozrzut`) × (1 + szaleństwo). */
  walkaMin: 0.6, walkaRozrzut: 0.8,
  /** Trafiony dostaje tyle strachu. */
  walkaStrach: 0.3,
  /** Mięsożerca po zabiciu zjada: tyle głodu mniej. */
  zjadaOfiare: 0.5,
  /** Traci wroga z oczu dalej niż to. */
  walkaGubi: 22,

  // ----------------------------------------------------------------- jarzmo
  /** Zasięg, obrażenia i próg zdrowia (ułamek), poniżej którego ofiara idzie w jarzmo. */
  jarzmoZasieg: 1.4, jarzmoCios: 1.5, jarzmoProg: 0.62,
  /** Wysysanie niewolnika: zasięg, obrażenia na tik, ile głodu ubywa, kiedy syta. */
  wysysanieZasieg: 1.5, wysysanieCios: 0.25, wysysanieKarmi: 0.006, wysysanieSyta: 0.15,

  // ------------------------------------------------------------- sen trola
  /** Śpiący trol: głód nie spada poniżej tego, ubywa go tyle na tik… */
  snuGlodMin: 0.5, snuGlodNaTik: 0.0004,
  /** …leczy się o tyle na tik… */
  snuLeczy: 0.03,
  /** …i co tyle tików sprawdza, czy ktoś przechodzi w tym promieniu. */
  snuCzujneCo: 30, snuCzujneZasieg: 8, snuAtakTikow: 80,

  // ----------------------------------------------------------------- ciepło
  /** Żużlowiec w cieple: oddaje łup bliżej gniazda niż to, grzeje się bliżej celu niż to… */
  cieploOddajeLup: 4, cieploBlisko: 3.6,
  /** …i ubywa mu tyle głodu na tik, aż spadnie poniżej `cieploSyty`. */
  cieploJe: 0.005, cieploSyty: 0.12,

  // ------------------------------------------------------------------ ludzie
  /** Człowiek wraca na powierzchnię z tyloma rudy albo ranny poniżej tego ułamka zdrowia. */
  ludzieNiosa: 4, ludzieRanni: 0.35,
  /** Wychodzi, gdy jest wyżej niż ta linia. */
  ludzieWychodza: 12,
  /** Szuka rudy w tym promieniu; bez niej idzie ± tyle w bok i do tylu w dół. */
  ludzieRuda: 18, ludzieSzukajX: 14, ludzieSzukajY: 10,
};
