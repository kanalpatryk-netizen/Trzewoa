// Wygenerowane z alpha-1/src/nastawy/wyglad/atlas.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-atlas.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/atlas.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladAtlas
    {
        /// <summary>
        /// ATLAS — okno z tablicami (w grze i w menu), siatka miniatur i pojedyncza tablica.
        /// Treść samych tablic (nazwy, opisy, ryciny) jest w src/atlas/tablice.ts.
        /// </summary>
        public static Typ_ATLAS ATLAS = new Typ_ATLAS
        {
            tytul = "ATLAS",
            zamknij = "zamknij ×",
            doAtlasu = "cały atlas ›",
            wstecz = "‹ atlas",
            nowaTablica = "N O W A   T A B L I C A   W   A T L A S I E",
            postep = "odkryte {ile} z {z} tablic — resztę znajdziesz w górze",
            podpowiedz = "przeciągnij, żeby przewijać",
            ramaGora = "Atlas trzewi · tablice ludu, rytów i praw góry",
            ramaGoraWaski = "Atlas",
            ramaDol = "odkryte {ile} z {z} · przeciągnij, żeby przewijać",
            ramaDolWaski = "odkryte {ile} z {z}",
            waskiPonizej = 700,
            drogaPoTikach = 2400,
            tloAlfa = 0.88,
            rozmiar = new Typ_ATLAS_rozmiar
            {
                min = 14,
                max = 18,
            },
            maxTablica = 470,
            maxSiatka = 900,
            tytulRozmiar = new Typ_ATLAS_tytulRozmiar
            {
                min = 24,
                max = 44,
            },
            kropkaOdstep = 14,
            kropkaAlfa = 0.9,
            kropkaNieznanaAlfa = 0.3,
            przewinStrzalka = 80,
            przewinKolko = 0.7,
            kolumny = new Typ_ATLAS_kolumny
            {
                min = 2,
                max = 6,
                szerokosc = 118,
            },
            odstep = 12,
            proporcje = 1.22,
            grupy = new string[] { "rasy", "ryty", "zasoby", "prawa" },
        };

        /// <summary>Miniatura tablicy w siatce atlasu.</summary>
        public static Typ_MINIATURA MINIATURA = new Typ_MINIATURA
        {
            uniesienie = 3,
            cien = 14,
            cienY = 4,
            cienAlfa = 0.7,
            ramaWskazana = 1.3,
            ramaZwykla = 0.8,
            woskJasny = "170,50,40",
            woskCiemny = "80,16,14",
            puls = 0.15,
            pieczec = 0.22,
            naroznikAlfa = 0.85,
            naroznikGrubosc = 1.5,
        };

        /// <summary>Pełna tablica (po kliknięciu miniatury).</summary>
        public static Typ_TABLICA TABLICA = new Typ_TABLICA
        {
            rozmiar = new Typ_TABLICA_rozmiar
            {
                min = 14,
                max = 19,
            },
            rycinaMin = 120,
            rycinaMax = 0.62,
            tytul = 1.35,
            rozstrzelenie = 0.14,
            interlinia = 1.3,
            interliniaKiedy = 1.25,
        };
    }

    /// <summary>
    /// ATLAS — okno z tablicami (w grze i w menu), siatka miniatur i pojedyncza tablica.
    /// Treść samych tablic (nazwy, opisy, ryciny) jest w src/atlas/tablice.ts.
    /// </summary>
    public sealed partial class Typ_ATLAS
    {
        /// <summary>------------------------------------------------------------------ napisy</summary>
        public string tytul;
        public string zamknij;
        public string doAtlasu;
        public string wstecz;
        public string nowaTablica;
        /// <summary>Pod kropkami postępu; {ile} i {z} podmieniane na liczby.</summary>
        public string postep;
        public string podpowiedz;
        /// <summary>Napisy na ramie ekranu atlasu w menu (szeroki / wąski ekran).</summary>
        public string ramaGora;
        public string ramaGoraWaski;
        public string ramaDol;
        public string ramaDolWaski;
        public double waskiPonizej;
        /// <summary>Tablica „Droga do wolności” otwiera się sama po tylu tikach nowej gry (przy domyślnym tempie 2× i 60 klatkach: 2400 ≈ 20 s).</summary>
        public double drogaPoTikach;
        /// <summary>
        /// ----------------------------------------------------------------- układ
        /// Przyciemnienie świata pod oknem w grze.
        /// </summary>
        public double tloAlfa;
        /// <summary>Rozmiar liter okna: ekran / 60 (min–max).</summary>
        public Typ_ATLAS_rozmiar rozmiar;
        /// <summary>Najszersza pojedyncza tablica i najszersza siatka (px).</summary>
        public double maxTablica;
        public double maxSiatka;
        /// <summary>Tytuł „ATLAS”: ekran / 24 (min–max).</summary>
        public Typ_ATLAS_tytulRozmiar tytulRozmiar;
        /// <summary>Kropki postępu: odstęp (px) i krycie odkrytej / nieodkrytej.</summary>
        public double kropkaOdstep;
        public double kropkaAlfa;
        public double kropkaNieznanaAlfa;
        /// <summary>Przewijanie klawiszami strzałek (px) i kółkiem (mnożnik).</summary>
        public double przewinStrzalka;
        public double przewinKolko;
        /// <summary>
        /// --------------------------------------------------------------- siatka
        /// Kolumn: szerokość / 118, obcięte do min–max.
        /// </summary>
        public Typ_ATLAS_kolumny kolumny;
        /// <summary>Odstęp między miniaturami (px) i ich proporcje (wysokość / szerokość).</summary>
        public double odstep;
        public double proporcje;
        /// <summary>Kolejność grup w siatce.</summary>
        public string[] grupy;
    }

    public sealed partial class Typ_ATLAS_rozmiar
    {
        public double min;
        public double max;
    }

    public sealed partial class Typ_ATLAS_tytulRozmiar
    {
        public double min;
        public double max;
    }

    public sealed partial class Typ_ATLAS_kolumny
    {
        public double min;
        public double max;
        public double szerokosc;
    }

    /// <summary>Miniatura tablicy w siatce atlasu.</summary>
    public sealed partial class Typ_MINIATURA
    {
        /// <summary>Wskazana miniatura unosi się o tyle px i rzuca taki cień.</summary>
        public double uniesienie;
        public double cien;
        public double cienY;
        public double cienAlfa;
        /// <summary>Krycie ramy: wskazana / zwykła.</summary>
        public double ramaWskazana;
        public double ramaZwykla;
        /// <summary>Wosk pieczęci na nieodkrytej tablicy: jasny i ciemny kolor (r,g,b) i pulsowanie.</summary>
        public string woskJasny;
        public string woskCiemny;
        public double puls;
        /// <summary>Pieczęć zajmuje taką część krótszego boku ryciny.</summary>
        public double pieczec;
        /// <summary>Złote narożniki wskazanej miniatury: krycie i grubość.</summary>
        public double naroznikAlfa;
        public double naroznikGrubosc;
    }

    /// <summary>Pełna tablica (po kliknięciu miniatury).</summary>
    public sealed partial class Typ_TABLICA
    {
        /// <summary>Rozmiar liter: szerokość / 24 (min–max).</summary>
        public Typ_TABLICA_rozmiar rozmiar;
        /// <summary>Rycina ma co najmniej tyle px wysokości i najwyżej taką część szerokości.</summary>
        public double rycinaMin;
        public double rycinaMax;
        /// <summary>Tytuł tablicy (× rozmiar) i rozstrzelenie liter.</summary>
        public double tytul;
        public double rozstrzelenie;
        /// <summary>Interlinia opisu i akapitu „kiedy”.</summary>
        public double interlinia;
        public double interliniaKiedy;
    }

    public sealed partial class Typ_TABLICA_rozmiar
    {
        public double min;
        public double max;
    }
}
