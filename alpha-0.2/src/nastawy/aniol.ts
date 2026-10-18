/**
 * Alpha, etap 4 — DŁOŃ ANIELSKA (sim/aniol.ts, rysunek: render/aniol.ts, model: scripts/dlon/ — ten sam co dłoni
 * z otchłani, w jasnej wersji). Losowe wydarzenie w każdej grze (decyzja użytkownika 17.10), a dar jest za darmo
 * i wybiera go sama (decyzja 18.10): podkop (wykuwa kawałek drogi wiernych — decyzja 18.10), dar ludzi (nowy
 * robotnik) albo dar krwi (struga do relikwiarza). Z góry, przez skałę, sączy się złote światło, dłoń schodzi
 * w nim palcami w dół, daje dar i wraca w światło.
 * Tiki: 120 = sekunda, 7200 = minuta.
 */
export type DarAniola = 'podkop' | 'ludzie' | 'krew';

export const ANIOL = {
  /** Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy). */
  wlaczona: true as boolean,
  /** Najwcześniej po tylu tikach partii (4 min), potem co `losujCo` los z szansą `szansa` (średnio raz na ok. 4 min). */
  pierwszaPo: 28800, losujCo: 3600, szansa: 0.12,
  /** Po każdym darze cisza na tyle tików (5 min); najwyżej tyle darów w partii. */
  przerwa: 36000, maxNaPartie: 4,

  // ---------------------------------------------------------------- przebieg (tiki)
  /** Światło z góry, dłoń schodzi, daje dar, wraca w światło. */
  swiatlo: 150, schodzi: 330, dar: 420, wraca: 300,

  // ---------------------------------------------------------------- dary
  dary: {
    /** Podkop: kruszy tyle następnych kafli drogi wiernych (od czoła w dół; droga idzie schodami — nikt nie utknie). */
    podkop: { kafli: 14, waga: 1, najmniej: 3 },
    /** Dar ludzi: stawia przy ołtarzu nowego robotnika — póki ludu jest mniej niż `maksLudu`. */
    ludzie: { maksLudu: 9, waga: 1 },
    /** Dar krwi: tyle krwi spływa strugą do relikwiarza — gdy krwi jest mniej niż `niePonad` największej ilości. */
    krew: { ile: 45, waga: 1, niePonad: 0.8 },
  } as Record<DarAniola, { waga: number } & Record<string, number>>,

  // ---------------------------------------------------------------- wygląd (kafle)
  /** Wielkość dłoni (mnożnik jak DLON.wielkosc) i szerokość słupa światła. */
  wielkosc: 1.6, swiatloSzer: 2.6,
};

/** Co dał (kronika, atlas). */
export const DAR: Record<DarAniola, { nazwa: string; opis: string }> = {
  podkop: { nazwa: 'Podkop', opis: `kruszy palcami ${ANIOL.dary.podkop.kafli} kolejnych kafli drogi wiernych` },
  ludzie: { nazwa: 'Dar ludzi', opis: 'stawia przy ołtarzu nowego robotnika' },
  krew: { nazwa: 'Dar krwi', opis: `wlewa do relikwiarza ${ANIOL.dary.krew.ile} krwi` },
};
