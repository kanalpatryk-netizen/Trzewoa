import { T } from '../../sim/tiles';

/**
 * FRESK ŚWIATA — góra na płycie malowana jak góry na ikonach i freskach z krypt.
 *
 * Skała to półki („schodki”) pigmentu: najjaśniejsza przy jaskini, ciemniejsza w głębi masy,
 * z jasnym świetlikiem na krawędzi podłogi i konturem sinopią. Jaskinie są czarne jak grota
 * z ikony Bożego Narodzenia. Pamięć góry to wyblakły fresk z ubytkami tynku, a nieznane —
 * ciemna ściana z ledwie widocznym szkicem sinopii. Na wszystko kładzie się faktura tynku.
 * Dawne kreskowanie ryciny: ustawienia → „Rysunek świata: rycina”.
 *
 * Barwy [r, g, b] 0..255. Pigment skały zmienia się z głębokością: `gora` przy powierzchni,
 * `srodek` w połowie, `dno` przy rdzeniu — materiały mieszają się z nim według `wlasny`.
 * Kamień, nie piaskowiec: zielona ziemia i łupek jak góry na ikonach (i góra z „Kuszenia”),
 * ciepły ugier byłby kanionem na pustyni.
 */
export const FRESK_SWIATA = {
  // ---------------------------------------------------------------- pigment skały
  /** Zielona ziemia i łupek przy powierzchni, szara umbra w połowie, czerwień ziemi przy rdzeniu. */
  gora: [88, 94, 80] as [number, number, number],
  srodek: [76, 68, 66] as [number, number, number],
  dno: [92, 46, 40] as [number, number, number],
  /** Własna barwa materiału i to, jak mocno bierze górę nad pigmentem głębokości (0..1). */
  materialy: {
    [T.SOIL]: { barwa: [102, 84, 62], wlasny: 0.5 },      // ziemia: umbra
    [T.ROCK]: { barwa: [80, 82, 74], wlasny: 0 },
    [T.ORE]: { barwa: [146, 58, 40], wlasny: 0.7 },       // cynober z żyłkami złota
    [T.CRYSTAL]: { barwa: [58, 82, 108], wlasny: 0.8 },   // lapis
    [T.STONE]: { barwa: [44, 46, 52], wlasny: 0.8 },      // zastygła magma: ciemny bazalt
    [T.SHRINE]: { barwa: [210, 170, 96], wlasny: 0.8 },
    [T.FORGE]: { barwa: [190, 80, 36], wlasny: 0.8 },
    [T.SKY]: { barwa: [40, 52, 70], wlasny: 1 },
  } as Record<number, { barwa: [number, number, number]; wlasny: number }>,
  /** Świetlik — biel z odrobiną zieleni, którą ikonopisarz zaznacza krawędź półki. */
  swietlik: [212, 210, 190] as [number, number, number],

  // ---------------------------------------------------------------- bryła
  /**
   * Półki skalne jak na ikonie: pasy, które obiegają jaskinie i schodzą w dół stokiem.
   * Pole półek = bliskość jaskini × `odJaskini` + głębokość (kafle) × `pion` + falowanie.
   * Każda półka jest jasna u góry i ciemnieje w dół; między półkami ciemna kreska sinopii,
   * a na górnej krawędzi jasny świetlik.
   */
  polkiOdJaskini: 2.2, polkiPion: 0.24,
  /** Jak bardzo półka ciemnieje od górnej krawędzi do dolnej (0..1). */
  polkaCien: 0.38,
  /** Jasność masy: w głębi skały i tuż przy jaskini (mnożnik pigmentu). */
  jasnoscGlebi: 0.5, jasnoscKrawedzi: 0.85,
  /** Kreska między półkami i świetlik na ich górnej krawędzi: grubość (px przy przybliżeniu 10) i siła. */
  polkaKreska: 1.1, polkaKreskaSila: 0.55, polkaSwietlikSila: 0.42,
  /** Jak bardzo brzeg półki faluje — kamień, nie wykres. */
  falowanie: 0.55,
  /** Smugi pędzla wzdłuż półek (0 = brak). */
  pedzel: 0.14,
  /** Świetlik na podłodze: grubość (część kafla) i siła. */
  swietlikGrubosc: 0.16, swietlikSila: 0.65,
  /** Kontur ściany sinopią. */
  kontur: [62, 24, 16] as [number, number, number],

  // ---------------------------------------------------------------- jaskinia, woda
  /** Grota: prawie czarna, ciepła; głębiej odrobinę rdzawa. */
  grota: [17, 11, 9] as [number, number, number],
  /** Woda w lapisie i jasne fale malowane pędzlem. */
  woda: [36, 58, 74] as [number, number, number],
  fala: [104, 138, 150] as [number, number, number],

  // ---------------------------------------------------------------- pamięć i nieznane
  /** Pamięć: wyblakły pigment schodzi ku barwie tynku; ubytki odsłaniają goły tynk. */
  tynk: [96, 92, 84] as [number, number, number],
  /** Część ubytków przy całkiem zapomnianym miejscu (0..1). */
  ubytki: 0.55,
  /** Nieznane: ciemna ściana i szkic sinopii (krycie kreski 0..1). */
  nieznane: [18, 12, 10] as [number, number, number],
  szkic: [96, 38, 26] as [number, number, number],
  szkicSila: 0.34,

  /** Faktura tynku na całym świecie (mnożenie) — krycie i wielkość kafla faktury w kaflach świata. */
  tynkKrycie: 0.45, tynkKafli: 7,
};
