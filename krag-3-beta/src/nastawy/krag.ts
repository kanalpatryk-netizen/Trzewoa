/**
 * KRĄG TRZECI (beta) — piekło Dantego, krąg żarłoków (Piekło, pieśń VI). Nowe mechaniki tej wersji:
 *  - OBŻARSTWO: potępieni to żarłocy — gdy jedzenia jest w bród, jedzą ponad głód; obżarty robi się ciężki i wolny,
 *    a przejedzony pada twarzą w błoto i leży (sim/krag.ts). Za mało jedzenia — głód, za dużo — grzech.
 *  - ULEWA: co jakiś czas na krąg spada wieczny, zimny i ciężki deszcz z gradem i brudnym śniegiem — zimno
 *    przyspiesza głód, błoto spowalnia każdy krok (render/krag.ts rysuje deszcz, krople i kałuże).
 *  - OKUP DLA CERBERA: boss to trójgłowy pies. Jak Wergiliusz, potępieni rzucają mu w paszczę garść jedzenia —
 *    głowy żrą i na chwilę przestają gryźć (kosztuje porcje z wiadra).
 * Tiki: 120 na sekundę.
 */
export const KRAG = {
  obzarstwo: {
    /** Gdy w wiadrach jest więcej porcji niż tyle — potępieni jedzą ponad głód. */
    obfitoscOd: 6,
    /** Ile porcji ponad głód zjada żarłok przy jednym posiłku, gdy jedzenia w bród. */
    nadmiar: 1,
    /** Obżarstwo za każdą porcję zjedzoną ponad głód (0…1, przy 1 pada w błoto). */
    zaPorcje: 0.3,
    /** Obżarstwo za porcję zjedzoną, gdy głód był już mniejszy niż `najedzonyPonizej`. */
    zaSytaPorcje: 0.06,
    najedzonyPonizej: 0.3,
    /** O tyle spada obżarstwo na tik (trawienie). */
    spadek: 0.00003,
    /** Przy pełnym obżarstwie: szybkość × (1 − spowalnia), kucie × (1 − kopanie), siła × (1 − sila). */
    spowalnia: 0.35, kopanie: 0.3, sila: 0.2,
    /** Od tylu pada w błoto; leży tyle tików, po wstaniu zostaje mu tyle obżarstwa. */
    padaOd: 1, lezy: 1200, poUpadku: 0.35,
  },
  deszcz: {
    /** Pierwsza ulewa po tylu tikach, potem co `co` (± `rozrzut`), trwa `trwa`. */
    pierwsza: 2400, co: 12000, rozrzut: 2400, trwa: 3000,
    /** W ulewie: głód × glod (zimno), szybkość × szybkosc (błoto). */
    glod: 1.15, szybkosc: 0.9,
  },
  okup: {
    /** Co tyle tików potępieni mogą rzucić Cerberowi okup — jeśli w wiadrach jest choć `porcji` porcji. */
    co: 600, porcji: 2,
    /** Tyle tików Cerber żre i nie gryzie. */
    zre: 300,
    /** Rzuca ktoś z ludu (najpierw ten, kto niesie jedzenie), kto stoi nie dalej niż tyle kafli od Cerbera. */
    zasieg: 40,
  },
};
