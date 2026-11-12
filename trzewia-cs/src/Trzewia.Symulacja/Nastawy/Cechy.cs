// Wygenerowane z alpha-1/src/nastawy/cechy.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/cechy.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/cechy.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyCechy
    {
        /// <summary>Nacja bez cechy (stare zapisy).</summary>
        public static Cecha BEZ_CECHY = new Cecha
        {
            id = "",
            nazwa = "",
            opis = "",
            wiara = 1,
            rozrod = 1,
            glod = 1,
            sila = 1,
            kopanie = 1,
            zycie = 1,
            strach = 1,
        };

        public static Cecha[] CECHY = new Cecha[]
        {
            new Cecha
            {
                id = "pobozni",
                nazwa = "pobożni",
                opis = "modlitwa daje im o 40% więcej wiary i oddania, ale słabo walczą",
                wiara = 1.4,
                rozrod = 1,
                glod = 1,
                sila = 0.8,
                kopanie = 1,
                zycie = 1,
                strach = 1,
            },
            new Cecha
            {
                id = "plodni",
                nazwa = "płodni",
                opis = "przybywa ich o połowę szybciej, ale szybciej głodnieją",
                wiara = 1,
                rozrod = 1.5,
                glod = 1.25,
                sila = 1,
                kopanie = 1,
                zycie = 1,
                strach = 1,
            },
            new Cecha
            {
                id = "wojowniczy",
                nazwa = "wojowniczy",
                opis = "biją o 35% mocniej i rzadko uciekają, ale mniej się modlą",
                wiara = 0.75,
                rozrod = 1,
                glod = 1,
                sila = 1.35,
                kopanie = 1,
                zycie = 1,
                strach = 0.6,
            },
            new Cecha
            {
                id = "kopacze",
                nazwa = "kopacze",
                opis = "kopią o 40% szybciej, ale ciężka praca szybciej ich głodzi",
                wiara = 1,
                rozrod = 1,
                glod = 1.15,
                sila = 1,
                kopanie = 1.4,
                zycie = 1,
                strach = 1,
            },
            new Cecha
            {
                id = "dlugowieczni",
                nazwa = "długowieczni",
                opis = "żyją o 60% dłużej, ale kopią wolniej",
                wiara = 1,
                rozrod = 1,
                glod = 1,
                sila = 1,
                kopanie = 0.85,
                zycie = 1.6,
                strach = 1,
            },
            new Cecha
            {
                id = "skromni",
                nazwa = "skromni",
                opis = "jedzą o 30% mniej, ale są słabsi w walce",
                wiara = 1,
                rozrod = 1,
                glod = 0.7,
                sila = 0.85,
                kopanie = 1,
                zycie = 1,
                strach = 1,
            },
        };

        /// <summary>
        /// Jakie cechy może wylosować dana rasa (numery jak w enum Race: 0 Ślepy Lud, 1 Żużlowcy,
        /// 2 trole, 3 Prządki). Trole się nie modlą, a same się nie rozmnażają — pobożność
        /// i płodność nic by im nie dały.
        /// </summary>
        public static Dictionary<int, string[]> CECHY_RASY = new Dictionary<int, string[]> { [0] = new string[] { "pobozni", "plodni", "wojowniczy", "kopacze", "dlugowieczni", "skromni" }, [1] = new string[] { "pobozni", "plodni", "wojowniczy", "kopacze", "dlugowieczni", "skromni" }, [2] = new string[] { "wojowniczy", "kopacze", "dlugowieczni", "skromni" }, [3] = new string[] { "pobozni", "plodni", "wojowniczy", "kopacze", "dlugowieczni", "skromni" } };
    }

    /// <summary>Nacja bez cechy (stare zapisy).</summary>
    public sealed partial class Cecha
    {
        public string id;
        /// <summary>Przymiotnik w liczbie mnogiej — na podpisie nacji: „Grzmotowie · 11 · pobożni”.</summary>
        public string nazwa;
        /// <summary>Zaleta i wada jednym zdaniem — karta postaci, inspektor, atlas.</summary>
        public string opis;
        public double wiara;
        public double rozrod;
        public double glod;
        public double sila;
        public double kopanie;
        public double zycie;
        public double strach;
    }
}
