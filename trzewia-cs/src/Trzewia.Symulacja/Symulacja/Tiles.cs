// Port: alpha-1/src/sim/tiles.ts
using Trzewia.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Kafle. Świat to przekrój pionowy góry — zero na górze, rdzeń na dole. (W TS: enum T — tu stałe int.)</summary>
    public static class T
    {
        public const int AIR = 0;      // pustka, korytarz
        public const int SKY = 1;      // nad powierzchnią
        public const int SOIL = 2;     // sypka ziemia — osuwa się, gdy podkopiesz
        public const int ROCK = 3;     // lita skała
        public const int ORE = 4;      // ruda
        public const int CRYSTAL = 5;  // kryształ otchłani
        public const int STONE = 6;    // magma zastygła w wodzie — twarda na zawsze
        public const int FUNGUS = 7;   // grzybnia — żywa, przechodnia, głodna
        public const int BONES = 8;    // zwłoki i kości — pokarm i pamięć
        public const int SHRINE = 9;   // ołtarz Ślepego Ludu
        public const int FORGE = 10;   // kuźnia Żużlowców
        public const int WEB = 11;     // sieć Prządek
        public const int NEST = 12;    // lęgowisko
        public const int CORE = 13;    // twój rdzeń
        public const int GLYPH = 14;   // ślad po Znaku — świeci, przyciąga
        // Alpha, etap 3: warstwy góry i kruszec (T.ORE to w Alphie żelazo)
        public const int MIEKKA = 15;  // miękka skała płytkiej warstwy — kuje się szybko i nie osypuje
        public const int TWARDA = 16;  // twarda skała głębi — kuje się długo
        public const int ZLOTO = 17;   // złoto w środkowej warstwie — zwykle pod dnem jaskini
    }

    public static class Tiles
    {
        public const int TILE_COUNT = 18;

        /// <summary>Czy da się przez to przejść.</summary>
        public static readonly Uint8Array PASSABLE = Przechodnie();

        /// <summary>Ile pracy kosztuje wygryzienie kafla. 0 = nie do ruszenia. (Float32Array — 3.2 to tu 3.2000000476837…, jak w TS.)</summary>
        public static readonly Float32Array HARDNESS = Twardosc();

        static Uint8Array Przechodnie()
        {
            var p = new Uint8Array(TILE_COUNT);
            p[T.AIR] = 1; p[T.SKY] = 1; p[T.FUNGUS] = 1;
            p[T.BONES] = 1; p[T.WEB] = 1; p[T.GLYPH] = 1; p[T.NEST] = 1;
            return p;
        }

        static Float32Array Twardosc()
        {
            var h = new Float32Array(TILE_COUNT);
            h[T.SOIL] = 1; h[T.ROCK] = 3.2; h[T.ORE] = 2.4;
            h[T.MIEKKA] = 1.8; h[T.TWARDA] = 5.4; h[T.ZLOTO] = 3;
            h[T.CRYSTAL] = 5;
            // zastygła magma i skorupa rdzenia są nie do rozkucia — to jedyne takie kafle
            h[T.STONE] = 0;
            // ołtarz i kuźnia są nie do rozkopania: wygryzione przez przechodniów znikały,
            // a razem z kuźnią znikała cała podstawa istnienia Żużlowców
            h[T.SHRINE] = 0; h[T.FORGE] = 0;
            // rdzen to nie kafel do rozkucia w minute
            h[T.CORE] = 110;
            return h;
        }

        /// <summary>Kolory — dobierane też przez głębokość, to jest baza.</summary>
        public static readonly int[][] COLOR =
        {
            new[] { 10, 8, 12 },     // AIR
            new[] { 26, 30, 46 },    // SKY
            new[] { 74, 54, 38 },    // SOIL
            new[] { 52, 48, 54 },    // ROCK
            new[] { 120, 96, 44 },   // ORE
            new[] { 92, 70, 150 },   // CRYSTAL
            new[] { 38, 36, 42 },    // STONE
            new[] { 86, 120, 74 },   // FUNGUS
            new[] { 156, 148, 130 }, // BONES
            new[] { 150, 128, 96 },  // SHRINE
            new[] { 170, 90, 50 },   // FORGE
            new[] { 130, 130, 145 }, // WEB
            new[] { 110, 80, 60 },   // NEST
            new[] { 190, 50, 70 },   // CORE
            new[] { 220, 200, 120 }, // GLYPH
            new[] { 70, 60, 52 },    // MIEKKA
            new[] { 34, 32, 40 },    // TWARDA
            new[] { 200, 160, 60 },  // ZLOTO
        };
    }
}
