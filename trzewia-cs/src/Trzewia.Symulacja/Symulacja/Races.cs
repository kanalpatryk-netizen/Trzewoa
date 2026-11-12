// Port: alpha-1/src/sim/races.ts
using System;
using System.Collections.Generic;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// Rasy nie są zbalansowane — każda istnieje inaczej. Grzybnia nie ma jednostek,
    /// Ludzie przychodzą z góry i wracają, Trole nie czczą nikogo. (W TS: enum Race — tu stałe int.)
    /// </summary>
    public static class Race
    {
        public const int GOBLIN = 0, DWARF = 1, TROLL = 2, SPINNER = 3, HUMAN = 4, MYCELIUM = 5;
    }

    public sealed class RaceDef
    {
        public int id;
        public string name = "", @short = "";
        /// <summary>Dopełniacz liczby mnogiej: „ktoś z goblinów”, „przerobiły prządki na swoje”.</summary>
        public string dopelniacz = "";
        /// <summary>Dopełniacz pełnej nazwy nacji: „Krew Ślepego Ludu”, „Krew Żużlowców”.</summary>
        public string nazwaDopelniacz = "";
        /// <summary>Czy nazwa jest w liczbie mnogiej — bez tego wychodziło „Slepy Lud biora gore”.</summary>
        public bool mnoga;
        public double[] color = Array.Empty<double>();
        public double maxHp;
        public double speed;        // kafli na tik
        public double digPower;     // 0 = nie kopie
        public double strength;     // obrażenia w zwarciu
        public double breedRate;    // szansa na potomstwo przy nadmiarze jedzenia
        public double lifespan;     // tiki
        public double faithGain;    // ile Wiary daje jedna modlitwa
        public double fearGain;     // jak łatwo panikuje
        /// <summary>Jak szybko im burczy — wielkie ciała jedzą rzadziej.</summary>
        public double metabolism;
        public bool eatsMeat;
        public bool swims;
        public double size;         // piksele przy zoomie 1 i mnożnik Krwi
    }

    public static class Races
    {
        public const int RACE_COUNT = 6;

        public static readonly RaceDef[] RACES =
        {
            new RaceDef
            {
                id = Race.GOBLIN, name = "Pobożni", nazwaDopelniacz = "Pobożnych", @short = "pobożni", dopelniacz = "Pobożnych", mnoga = true, color = new double[] { 116, 158, 84 },
                // Remake v1: nikt się nie rodzi, więc lud żyje dłużej niż cała partia (dawniej 6000 tików i szybki rozród)
                maxHp = 10, speed = 0.115, digPower = 1.0, strength = 2, breedRate = 0.085, lifespan = 150000,
                faithGain = 1.0, fearGain = 1.4, metabolism = 0.8, eatsMeat = true, swims = false, size = 1,
            },
            new RaceDef
            {
                id = Race.DWARF, name = "Żużlowcy", nazwaDopelniacz = "Żużlowców", @short = "żużlowcy", dopelniacz = "żużlowców", mnoga = true, color = new double[] { 196, 132, 70 },
                maxHp = 22, speed = 0.085, digPower = 2.7, strength = 5, breedRate = 0.03, lifespan = 45000,
                faithGain = 0.45, fearGain = 0.5, metabolism = 0.3, eatsMeat = false, swims = false, size = 1.2,
            },
            new RaceDef
            {
                id = Race.TROLL, name = "Trole", nazwaDopelniacz = "Troli", @short = "trole", dopelniacz = "trolów", mnoga = true, color = new double[] { 126, 96, 150 },
                maxHp = 70, speed = 0.07, digPower = 2.6, strength = 16, breedRate = 0.012, lifespan = 60000,
                faithGain = 0.08, fearGain = 0.15, metabolism = 0.3, eatsMeat = true, swims = true, size = 2,
            },
            new RaceDef
            {
                id = Race.SPINNER, name = "Prządki", nazwaDopelniacz = "Prządek", @short = "prządki", dopelniacz = "prządek", mnoga = true, color = new double[] { 206, 196, 226 },
                maxHp = 22, speed = 0.135, digPower = 0.7, strength = 6, breedRate = 0.02, lifespan = 40000,
                faithGain = 0.3, fearGain = 0.35, metabolism = 0.42, eatsMeat = true, swims = false, size = 1.1,
            },
            new RaceDef
            {
                id = Race.HUMAN, name = "Ludzie", nazwaDopelniacz = "Ludzi", @short = "ludzie", dopelniacz = "ludzi", mnoga = true, color = new double[] { 222, 208, 176 },
                maxHp = 26, speed = 0.1, digPower = 0.9, strength = 7, breedRate = 0, lifespan = 9000,
                faithGain = 0, fearGain = 0.8, metabolism = 1.0, eatsMeat = true, swims = true, size = 1.2,
            },
            new RaceDef
            {
                id = Race.MYCELIUM, name = "Grzybnia", nazwaDopelniacz = "Grzybni", @short = "grzybnia", dopelniacz = "grzybni", mnoga = false, color = new double[] { 120, 168, 96 },
                maxHp = 1, speed = 0, digPower = 0, strength = 0, breedRate = 0, lifespan = 0,
                faithGain = 0, fearGain = 0, metabolism = 0, eatsMeat = false, swims = false, size = 0,
            },
        };

        /// <summary>Nacje nie są wpisane w grę — powstają z rozłamów. Nazwy też.</summary>
        static readonly Dictionary<int, string[]> ROOTS = new Dictionary<int, string[]>
        {
            [Race.GOBLIN] = new[] { "Mrok", "Kiełb", "Szczerb", "Popiel", "Ciurk", "Gnój", "Płacz", "Wrzask", "Ślin", "Grzmot" },
            [Race.DWARF] = new[] { "Żużel", "Kowadł", "Sadz", "Miech", "Rdzew", "Spiek", "Hutn", "Klin" },
            [Race.TROLL] = new[] { "Głaz", "Gnat", "Wyj", "Kieł", "Miaż" },
            [Race.SPINNER] = new[] { "Nić", "Przęd", "Osnow", "Węzeł", "Snuj" },
            [Race.HUMAN] = new[] { "Wierzbowi", "Ludzie Popiołu", "Żelaźni", "Latarnicy", "Wolni Kopacze" },
        };
        static readonly Dictionary<int, string[]> SUFFIX = new Dictionary<int, string[]>
        {
            [Race.GOBLIN] = new[] { "owie", "aki", "uchy", "iszcze", "ory" },
            [Race.DWARF] = new[] { "nicy", "owie", "arze", "iny" },
            [Race.TROLL] = new[] { "y", "iska", "ory" },
            [Race.SPINNER] = new[] { "arki", "ice", "nice" },
            [Race.HUMAN] = new[] { "" },
        };

        public static string clanName(double race, Func<double, double> pick)
        {
            var roots = ROOTS.TryGetValue((int)race, out var r) ? r : new[] { "Bez" };
            var sufs = SUFFIX.TryGetValue((int)race, out var s) ? s : new[] { "" };
            return roots[(int)pick(roots.Length)] + sufs[(int)pick(sufs.Length)];
        }

        /// <summary>Odmienia czasownik pod nazwe rasy.</summary>
        public static string odmien(double race, string pojedyncza, string mnoga) => RACES[(int)race].mnoga ? mnoga : pojedyncza;
    }
}
