/**
 * FRESKI — który wycinek malowidła stoi gdzie. Nazwy to pliki z `src/grafiki/freski/`
 * (bez rozszerzenia); źródła i licencje w `grafiki-freski/ZRODLA.md`.
 *
 * Dostępne: lew, smok, wielblad, aniol-michal, diabel-1, diabel-2, diabel-3,
 * odlamek-biskup, odlamek-swiety-1, odlamek-swiety-2, odlamek-anna, odlamek-michal,
 * portret-archaniol-gabriel, ikona-ryt-zasiej, ikona-ryt-szept, ikona-ryt-znak.
 * Medaliony: oko, smok, diabel-1/2/3, anna, aniol, swiety-2, wielblad, lew, zloto.
 */
export const FRESKI = {
  // ------------------------------------------------------------ karta wydarzenia
  /** Ilustracja po lewej stronie karty, według rodzaju wydarzenia. */
  wydarzenia: {
    najazd: 'wielblad', plemie: 'wielblad',
    powodz: 'smok', zalanie: 'smok', zawal: 'smok',
    zaraza: 'diabel-2', spisek: 'diabel-2',
    zyla: 'diabel-3', wojna: 'diabel-3', plony: 'diabel-3',
    dlug: 'diabel-1', klotnia: 'diabel-1', bunt: 'diabel-1',
    obcy: 'lew', ruda: 'lew', sen: 'lew',
    glod: 'odlamek-swiety-1', wymiera: 'odlamek-swiety-1',
    prorok: 'odlamek-swiety-2',
    znak: 'aniol-michal', warta: 'odlamek-michal',
    przysiega: 'odlamek-biskup',
  } as Record<string, string>,
  /** Gdy rodzaju nie ma na liście. */
  wydarzenieInne: 'odlamek-anna',
  /** Ilustracja zajmuje taką część szerokości karty; węższa karta (telefon) jej nie ma. */
  ilustracjaCzesc: 0.27, ilustracjaOdSzerokosci: 440,
  /** Wysokość fryzu z tancerzami nad kartą (× rozmiar pisma); poniżej tej wysokości płyty fryzu nie ma. */
  fryzWys: 2.3, fryzOdWysokosci: 330,

  // ------------------------------------------------------------- tablice atlasu
  /** Tablica atlasu → fresk zamiast ryciny. Reszta tablic zostaje przy rycinach. */
  atlas: {
    'rasa-0': 'odlamek-biskup',
    'ryt-zasiej': 'ikona-ryt-zasiej', 'ryt-szept': 'ikona-ryt-szept', 'ryt-znak': 'ikona-ryt-znak',
    krew: 'diabel-1',
    sen: 'diabel-2',
    prorok: 'odlamek-swiety-2',
    oddanie: 'odlamek-swiety-1',
    pielgrzymka: 'wielblad',
    wydarzenia: 'diabel-3',
    gniazda: 'aniol-michal',
    weterani: 'portret-archaniol-gabriel',
    straznicy: 'lew',
    boss: 'smok',
    pismo: 'odlamek-anna',
  } as Record<string, string>,

  // ---------------------------------------------------------------- osiągnięcia
  /** Medalion przy każdym osiągnięciu. */
  medaliony: {
    pierwsza: 'oko', szybko: 'smok', koszmar: 'diabel-2', pelna: 'diabel-1', pokoj: 'anna', dlug: 'diabel-3',
    przysiega: 'aniol', proroctwo: 'swiety-2', lancuchy: 'wielblad', tlum: 'lew', dzien: 'zloto',
  } as Record<string, string>,

  // ---------------------------------------------------------------- koniec gry
  /** Wygrana i przegrana (sen, upadek, zabili cię). */
  koniecWygrana: 'aniol-michal', koniecPrzegrana: 'odlamek-swiety-1',
  /** Fresk pod wyrokiem, gdy zostaje tam co najmniej taka część wysokości ekranu. */
  koniecPodSpodemOd: 0.16,
  /** Inaczej po lewej od kroniki, gdy jest tyle miejsca obok karty (px). */
  koniecOdMarginesu: 150,
  /** Wąski ekran: fresk blado za tytułem (krycie). */
  koniecZnakWodny: 0.3,
};
