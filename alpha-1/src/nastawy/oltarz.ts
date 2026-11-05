/**
 * OŁTARZ (Alpha, etap 3d) — kamienny ołtarz z krzyżem na kopczyku, na środku sali pod szybem ze światłem dziennym
 * (szkic Pawła). Stoi od początku gry; podkopać go nie można (kamienny kopczyk pod nim, kamienna podłoga sali).
 * Dotknięcie ołtarza otwiera okno rytuałów. Rytuał odprawia pobożny, który stoi przy ołtarzu; paliwem jest krew
 * (decyzja użytkownika), a obie ofiary ją dają — „okalecz się” i „ofiaruj” są już tylko tutaj, nie w szeptach.
 * Symulacja: src/sim/oltarz.ts; rysunek: src/render/oltarz.ts.
 * Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
 */
export const OLTARZ = {
  /** Pobożny stoi „przy ołtarzu”, gdy jest najwyżej tyle kafli w bok i tyle w pionie od kafla ołtarza. */
  przyX: 3, przyY: 1,
  /** Odprawiający może odejść od ołtarza najwyżej na tyle tików (rozsuwa się z innymi) — dłużej: rytuał przerwany. */
  odejscieTikow: 240,
  rytualy: {
    /** Modlitwa: pobożny klęczy, od krzyża biją promienie, a wiara rośnie przez cały rytuał (razem `wiara`). */
    modlitwa: { krew: 15, tikow: 1800, wiara: 30 },
    /** Szał krwi: krew spływa do misy, zapala się krąg znaków; rycerz przez `trwa` tików bije z siłą × `sila`. */
    szal: { krew: 30, tikow: 900, trwa: 7200, sila: 1.6 },
    /** Wskrzeszenie: wybrany z poległych (jego ciało musi jeszcze leżeć) wstaje przy ołtarzu. */
    wskrzeszenie: { krew: 100, tikow: 1800 },
    /** Ofiara krwi: pobożny upuszcza krwi do misy (krew: LUD.okaleczenieKrew) i jest okaleczony, póki się nie wyśpi. */
    ofiaraKrwi: { krew: 0, tikow: 720 },
    /** Ofiara życia: pobożny oddaje życie na ołtarzu (krew: LUD.ofiaraKrew). Ostatniego pobożnego ołtarz nie przyjmie. */
    ofiaraZycia: { krew: 0, tikow: 900 },
  },
};

export type RodzajRytualu = 'modlitwa' | 'szal' | 'wskrzeszenie' | 'ofiaraKrwi' | 'ofiaraZycia';

/** Kolejność w oknie ołtarza. */
export const RYTUALY: RodzajRytualu[] = ['modlitwa', 'szal', 'wskrzeszenie', 'ofiaraKrwi', 'ofiaraZycia'];

export const NAZWA_RYTUALU: Record<RodzajRytualu, string> = {
  modlitwa: 'Modlitwa', szal: 'Szał krwi', wskrzeszenie: 'Wskrzeszenie', ofiaraKrwi: 'Ofiara krwi', ofiaraZycia: 'Ofiara życia',
};
