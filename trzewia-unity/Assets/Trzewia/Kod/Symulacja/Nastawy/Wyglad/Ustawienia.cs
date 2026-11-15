// Wygenerowane z alpha-1/src/nastawy/wyglad/ustawienia.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-ustawienia.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/ustawienia.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladUstawienia
    {
        /// <summary>
        /// EKRAN USTAWIEŃ — napisy, barwy i układ.
        ///
        /// W stylu menu głównego: czarne tło, jasne napisy, ozdobniki przy wybranym wierszu.
        /// Kategorie to ikonki w kolumnie po lewej; po najechaniu
        /// wysuwa się z nich nazwa kategorii. W każdej kategorii najwyżej 5 ustawień.
        /// Same pozycje (co da się ustawić) są w src/app/screens/settings.ts.
        /// „r” to rozmiar liter wiersza; większość wymiarów to jego wielokrotności (× r).
        /// </summary>
        public static Typ_EKRAN_USTAWIEN EKRAN_USTAWIEN = new Typ_EKRAN_USTAWIEN
        {
            tytul = "Ustawienia",
            wstecz = "‹ menu",
            nie = "nie",
            tak = "tak",
            gotowe = "gotowe",
            tlo = "#000000",
            tytulBarwa = "#d9d4cb",
            napis = "#a9a49c",
            napisWybrany = "#ffffff",
            wartosc = "#e8e3da",
            wartoscCicha = "#5f5b55",
            ozdobnik = "#78736c",
            ozdobnikWybrany = "#f2ede4",
            ikona = "#6f6a64",
            ikonaNajechana = "#d6d1c8",
            ikonaWybrana = "#ffffff",
            poswiata = "255,236,210",
            rozmiar = 0.034,
            rozmiarMin = 15,
            rozmiarMax = 30,
            odstep = 2.15,
            tytulRozmiar = 0.062,
            tytulMin = 26,
            tytulMax = 58,
            tytulY = 0.13,
            szerokosc = 21,
            szerokoscMaxCzesc = 0.62,
            gora = 0.3,
            ikonaRozmiar = 1.9,
            ikonaOdstep = 1.75,
            ikonaOdListy = 3.2,
            suwakDl = 6.5,
            suwakLiczba = 3.2,
            ozdobnikSzer = 1.05,
            ozdobnikOdstep = 0.25,
            wysuwMs = 180,
            nazwaPoKlawiszuMs = 1200,
            blyskMs = 500,
            gotoweMs = 1400,
            wejscieMs = 450,
        };
    }

    /// <summary>
    /// EKRAN USTAWIEŃ — napisy, barwy i układ.
    ///
    /// W stylu menu głównego: czarne tło, jasne napisy, ozdobniki przy wybranym wierszu.
    /// Kategorie to ikonki w kolumnie po lewej; po najechaniu
    /// wysuwa się z nich nazwa kategorii. W każdej kategorii najwyżej 5 ustawień.
    /// Same pozycje (co da się ustawić) są w src/app/screens/settings.ts.
    /// „r” to rozmiar liter wiersza; większość wymiarów to jego wielokrotności (× r).
    /// </summary>
    public sealed partial class Typ_EKRAN_USTAWIEN
    {
        /// <summary>------------------------------------------------------------------ napisy</summary>
        public string tytul;
        /// <summary>Przycisk powrotu w lewym górnym rogu.</summary>
        public string wstecz;
        /// <summary>Słowa przełącznika.</summary>
        public string nie;
        public string tak;
        /// <summary>Napis po wykonaniu akcji (np. „Przywróć domyślne”).</summary>
        public string gotowe;
        /// <summary>------------------------------------------------------------------ barwy</summary>
        public string tlo;
        public string tytulBarwa;
        public string napis;
        public string napisWybrany;
        /// <summary>Wartość ustawienia (tak / 70% / kryzysy) i wartość nieaktywna (drugie słowo przełącznika).</summary>
        public string wartosc;
        public string wartoscCicha;
        public string ozdobnik;
        public string ozdobnikWybrany;
        /// <summary>Ikonki kategorii: zwykła, najechana, wybrana.</summary>
        public string ikona;
        public string ikonaNajechana;
        public string ikonaWybrana;
        /// <summary>Poświata wybranego wiersza (rgb).</summary>
        public string poswiata;
        /// <summary>
        /// ----------------------------------------------------------------- układ
        /// Rozmiar liter wiersza (× h, obcięty do min–max) i odstęp wierszy (× r).
        /// </summary>
        public double rozmiar;
        public double rozmiarMin;
        public double rozmiarMax;
        public double odstep;
        /// <summary>Tytuł: rozmiar (× h, min–max) i położenie (× h).</summary>
        public double tytulRozmiar;
        public double tytulMin;
        public double tytulMax;
        public double tytulY;
        /// <summary>Lista: szerokość (× r, najwyżej część ekranu) i górna krawędź (× h).</summary>
        public double szerokosc;
        public double szerokoscMaxCzesc;
        public double gora;
        /// <summary>Ikonki: rozmiar (× r), odstęp (× rozmiar ikonki), odległość kolumny od listy (× r).</summary>
        public double ikonaRozmiar;
        public double ikonaOdstep;
        public double ikonaOdListy;
        /// <summary>Suwak: długość linijki i miejsce na liczbę (× r).</summary>
        public double suwakDl;
        public double suwakLiczba;
        /// <summary>Ozdobnik: szerokość i odstęp od napisu (× r).</summary>
        public double ozdobnikSzer;
        public double ozdobnikOdstep;
        /// <summary>
        /// --------------------------------------------------------------- animacja
        /// Wysuwanie nazwy kategorii (ms) i jak długo wisi po zmianie kategorii klawiszem (ms).
        /// </summary>
        public double wysuwMs;
        public double nazwaPoKlawiszuMs;
        /// <summary>Rozbłysk po zmianie wartości i napis „gotowe” po akcji (ms).</summary>
        public double blyskMs;
        public double gotoweMs;
        /// <summary>Wejście na ekran (ms).</summary>
        public double wejscieMs;
    }
}
