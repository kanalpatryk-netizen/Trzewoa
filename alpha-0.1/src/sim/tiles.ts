/** Kafle. Świat to przekrój pionowy góry — zero na górze, rdzeń na dole. */
export enum T {
  AIR = 0,      // pustka, korytarz
  SKY = 1,      // nad powierzchnią
  SOIL = 2,     // sypka ziemia — osuwa się, gdy podkopiesz
  ROCK = 3,     // lita skała
  ORE = 4,      // ruda
  CRYSTAL = 5,  // kryształ otchłani
  STONE = 6,    // magma zastygła w wodzie — twarda na zawsze
  FUNGUS = 7,   // grzybnia — żywa, przechodnia, głodna
  BONES = 8,    // zwłoki i kości — pokarm i pamięć
  SHRINE = 9,   // ołtarz Ślepego Ludu
  FORGE = 10,   // kuźnia Żużlowców
  WEB = 11,     // sieć Prządek
  NEST = 12,    // lęgowisko
  CORE = 13,    // twój rdzeń
  GLYPH = 14,   // ślad po Znaku — świeci, przyciąga
}

export const TILE_COUNT = 15;

/** Czy da się przez to przejść. */
export const PASSABLE = new Uint8Array(TILE_COUNT);
PASSABLE[T.AIR] = 1; PASSABLE[T.SKY] = 1; PASSABLE[T.FUNGUS] = 1;
PASSABLE[T.BONES] = 1; PASSABLE[T.WEB] = 1; PASSABLE[T.GLYPH] = 1; PASSABLE[T.NEST] = 1;

/** Ile pracy kosztuje wygryzienie kafla. 0 = nie do ruszenia. */
export const HARDNESS = new Float32Array(TILE_COUNT);
HARDNESS[T.SOIL] = 1; HARDNESS[T.ROCK] = 3.2; HARDNESS[T.ORE] = 2.4;
HARDNESS[T.CRYSTAL] = 5;
// zastygła magma i skorupa rdzenia są nie do rozkucia — to jedyne takie kafle
HARDNESS[T.STONE] = 0;
// ołtarz i kuźnia są nie do rozkopania: wygryzione przez przechodniów znikały,
// a razem z kuźnią znikała cała podstawa istnienia Żużlowców
HARDNESS[T.SHRINE] = 0; HARDNESS[T.FORGE] = 0;
// rdzen to nie kafel do rozkucia w minute
HARDNESS[T.CORE] = 110;

/** Kolory — dobierane też przez głębokość, to jest baza. */
export const COLOR: readonly [number, number, number][] = [
  [10, 8, 12],     // AIR
  [26, 30, 46],    // SKY
  [74, 54, 38],    // SOIL
  [52, 48, 54],    // ROCK
  [120, 96, 44],   // ORE
  [92, 70, 150],   // CRYSTAL
  [38, 36, 42],    // STONE
  [86, 120, 74],   // FUNGUS
  [156, 148, 130], // BONES
  [150, 128, 96],  // SHRINE
  [170, 90, 50],   // FORGE
  [130, 130, 145], // WEB
  [110, 80, 60],   // NEST
  [190, 50, 70],   // CORE
  [220, 200, 120], // GLYPH
];
