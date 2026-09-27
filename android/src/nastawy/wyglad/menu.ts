/**
 * MENU GŁÓWNE — napisy, układ i animacja ekranu tytułowego.
 *
 * Dwa układy: szeroki (komputer: spis po lewej, przekrój góry po prawej) i wąski
 * (telefon: wszystko pośrodku, przekrój przygaszony u dołu). Granica: `waskiPonizej`.
 * Położenia „× w” / „× h” to ułamki szerokości / wysokości ekranu.
 */
export const MENU = {
  // ------------------------------------------------------------------ napisy
  tytul: 'TRZEWIA',
  podtytul: 'Nie grasz bogiem, który rządzi podziemiem. Grasz podziemiem.',
  /** Na telefonie: nadtytuł nad wstęgą i krótszy podtytuł. */
  nadtytulWaski: 'anatomia góry',
  podtytulWaski: 'Grasz podziemiem.',
  /** Napisy na ramie: górny i dolny (szeroki / wąski ekran). */
  ramaGora: 'Trzewia · anatomia góry, która śni', ramaGoraWaski: 'Trzewia',
  ramaDol: 'Tab. I — przekrój góry z rdzeniem', ramaDolWaski: 'Tab. I',
  /** Zachęta dla nowych graczy pod opisem pozycji. */
  zachetaSamouczek: 'Pierwszy raz? Zacznij od samouczka.',
  /** Podpowiedź sterowania w lewym dolnym rogu (tylko szeroki ekran). */
  podpowiedz: '',   // Android: nic — na komputerze „strzałki i enter · albo po prostu dotknij”
  /** Pozycje spisu: etykieta i opis pod spisem. Kolejność = kolejność na ekranie. */
  pozycje: {
    wroc: { etykieta: 'Wróć do góry', opis: 'trwająca rozgrywka czeka tam, gdzie ją zostawiłeś' },
    nowa: { etykieta: 'Obudź się', opis: 'nowa góra, nowi mieszkańcy, nowa legenda' },
    wczytaj: { etykieta: 'Wróć tam, gdzie byłeś', opis: 'ostatni zapis stanu góry' },
    samouczek: { etykieta: 'Naucz się być górą', opis: 'cztery plansze wstępu i dziesięć krótkich lekcji — palec pokazuje, gdzie dotknąć' },
    bestiariusz: { etykieta: 'Atlas', opis: 'tablice ras i praw góry — odkrywasz je, grając' },
    ustawienia: { etykieta: 'Ustawienia', opis: 'dźwięk, obraz i świat' },
  },

  // ----------------------------------------------------------------- układ
  /** Poniżej tej szerokości (px) menu przechodzi w układ telefonu. */
  waskiPonizej: 700,
  /** …albo gdy ekran jest wyższy niż szeroki o tyle razy (tablet w pionie). */
  pionowyOd: 1.15,
  /** Szeroki: przekrój góry zaczyna się na tej części szerokości i wysokości… */
  przekrojX: 0.4, przekrojY: 0.27,
  /** …i ma takie krycie. */
  przekrojAlfa: 0.95,
  /** Szeroki: rozmiar tytułu = min(ekran/11, wysokość/6), obcięty do min–max. */
  tytulRozmiar: { min: 46, max: 104 },
  /** Szeroki: tytuł stoi na tej części wysokości (+ 0,4 rozmiaru). */
  tytulY: 0.16,
  /** Szeroki: spis zaczyna się tyle od lewej ramy (× szerokość). */
  spisOdLewej: 0.05,
  /** Szeroki: rozmiar liter spisu (min–max). */
  spisRozmiar: { min: 17, max: 26 },
  /** Odstęp pozycji spisu (× rozmiar liter): szeroki / wąski. */
  spisOdstep: 1.95, spisOdstepWaski: 2.05,
  /** Szeroki: spis zaczyna się między tymi częściami wysokości. */
  spisOd: 0.36, spisDo: 0.42,
  /** Krycie pozycji nieaktywnej (np. „Wróć do góry” bez trwającej gry). */
  alfaNieaktywnej: 0.32,
  /** Opis: szerokość akapitu (× szerokość), rozmiar (min–max), interlinia. */
  opisSzerokosc: 0.3, opisRozmiar: { min: 14, max: 18 }, opisInterlinia: 1.4,

  /** Wąski: przekrój zaczyna się na tej części wysokości i ma takie krycie. */
  przekrojWaskiY: 0.58, przekrojWaskiAlfa: 0.55,
  /** Wąski: tytuł na tej części wysokości, rozmiar (min–max). */
  tytulWaskiY: 0.15, tytulWaskiRozmiar: { min: 28, max: 56 },
  /** Wąski: spis zaczyna się na tej części wysokości. */
  spisWaskiY: 0.33,

  // --------------------------------------------------------------- animacja
  /** Wejście na ekran (ms): rama, tytuł i spis rozjaśniają się przez tyle. */
  wejscieMs: 900,
  /** Kolejne pozycje spisu wchodzą z takim opóźnieniem (ms) i trwają tyle. */
  pozycjaOpoznienie: 70, pozycjaCzas: 320,
  /** Pyłki kurzu w powietrzu: ile i jak jasne (podstawa + migotanie). */
  pylkow: 44, pylekAlfa: 0.05, pylekMigotanie: 0.07,
  /** Komunikat (np. po końcu gry) wisi tyle ms. */
  komunikatMs: 8000,
};
