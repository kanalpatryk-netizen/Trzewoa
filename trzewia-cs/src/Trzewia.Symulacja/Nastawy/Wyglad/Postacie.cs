// Wygenerowane z alpha-1/src/nastawy/wyglad/postacie.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-postacie.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/postacie.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladPostacie
    {
        public static Dictionary<int, Budowa> BUDOWA = new Dictionary<int, Budowa> { [0] = new Budowa
        {
            udo = 0.2,
            lydka = 0.2,
            tulow = 0.3,
            bark = 0.13,
            pas = 0.1,
            glowa = 0.15,
            ramie = 0.19,
            przedramie = 0.19,
            grubUda = 0.055,
            grubRamienia = 0.04,
        }, [1] = new Budowa
        {
            udo = 0.15,
            lydka = 0.15,
            tulow = 0.34,
            bark = 0.22,
            pas = 0.2,
            glowa = 0.15,
            ramie = 0.17,
            przedramie = 0.17,
            grubUda = 0.075,
            grubRamienia = 0.065,
        }, [2] = new Budowa
        {
            udo = 0.2,
            lydka = 0.18,
            tulow = 0.36,
            bark = 0.25,
            pas = 0.19,
            glowa = 0.12,
            ramie = 0.27,
            przedramie = 0.27,
            grubUda = 0.085,
            grubRamienia = 0.07,
        }, [4] = new Budowa
        {
            udo = 0.22,
            lydka = 0.21,
            tulow = 0.31,
            bark = 0.13,
            pas = 0.12,
            glowa = 0.12,
            ramie = 0.18,
            przedramie = 0.17,
            grubUda = 0.05,
            grubRamienia = 0.04,
        } };

        /// <summary>Najszybszy krok, jaki oko jeszcze czyta (kroków na sekundę) — przy tempie ×8 nogi zlewały się w mgłę.</summary>
        public static double MAKS_KROKOW_NA_SEKUNDE = 3.2;
    }

    /// <summary>
    /// POSTACIE — sylwetki mieszkańców na płycie.
    ///
    /// Budowa: długości kończyn i tułowia jako ułamek wzrostu postaci,
    /// grubości jako ułamek wzrostu (większe = masywniej).
    /// </summary>
    public sealed partial class Budowa
    {
        public double udo;
        public double lydka;
        public double tulow;
        public double bark;
        public double pas;
        public double glowa;
        public double ramie;
        public double przedramie;
        public double grubUda;
        public double grubRamienia;
    }
}
