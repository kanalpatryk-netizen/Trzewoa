// Wygenerowane z alpha-1/src/nastawy/wyglad/ozdoby.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-ozdoby.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/ozdoby.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladOzdoby
    {
        /// <summary>
        /// OZDOBY — rama ryciny, kartusz z tytułem, przerywniki i nagłówki działów.
        /// Wspólne dla menu, atlasu i ustawień.
        ///
        /// Rozmiary „min / max / część” = rozmiar to `część × szerokość ekranu`,
        /// ale nie mniej niż `min` i nie więcej niż `max` pikseli.
        /// „Alfa” = krycie 0..1 (0 = niewidoczne, 1 = pełne).
        /// Mnożniki „× rozmiar” liczone są od wielkości czcionki danego elementu.
        /// </summary>
        public static Typ_RAMA RAMA = new Typ_RAMA
        {
            margines = new Typ_RAMA_margines
            {
                min = 12,
                max = 34,
                czesc = 0.024,
            },
            pas = new Typ_RAMA_pas
            {
                min = 8,
                max = 14,
                czesc = 0.01,
            },
            krok = new Typ_RAMA_krok
            {
                min = 14,
                max = 24,
                dzielnik = 60,
            },
            dlugaCo = 5,
            krotka = 0.45,
            alfaZewnetrzna = 0.5,
            alfaWewnetrzna = 0.32,
            alfaPodzialki = 0.26,
            alfaRogow = 0.6,
            alfaTlaRogu = 0.95,
            rozeta = 0.22,
            zwojRogu = 0.55,
            napis = new Typ_RAMA_napis
            {
                min = 10,
                max = 13,
                dzielnik = 110,
            },
            napisRozstrzelenie = 0.35,
            alfaNapisu = 0.7,
            alfaTlaNapisu = 0.97,
        };

        public static Typ_KARTUSZ KARTUSZ = new Typ_KARTUSZ
        {
            waga = 600,
            rozstrzelenie = 0.16,
            poszerzenie = 1.6,
            wysokosc = 1.25,
            grubosc = 1.1,
            alfaWstegi = 0.55,
            alfaCienia = 0.8,
            cienX = 0.02,
            cienY = 0.035,
            nadtytul = new Typ_KARTUSZ_nadtytul
            {
                min = 10,
                czesc = 0.16,
                rozstrzelenie = 0.4,
                alfa = 0.7,
            },
            podtytul = new Typ_KARTUSZ_podtytul
            {
                min = 13,
                czesc = 0.2,
                odstep = 1.7,
                alfa = 0.8,
            },
        };

        public static Typ_PRZERYWNIK PRZERYWNIK = new Typ_PRZERYWNIK
        {
            alfaKreski = 0.45,
            alfaRombu = 0.7,
            romb = 4,
            przerwa = 18,
            zwojOdstep = 12,
            zwojPromien = 4,
        };

        public static Typ_NAGLOWEK_DZIALU NAGLOWEK_DZIALU = new Typ_NAGLOWEK_DZIALU
        {
            kolko = 0.62,
            alfaKolka = 0.65,
            alfaTekstu = 0.9,
            alfaKreski = 0.3,
            alfaDopisku = 0.8,
            wciecie = 2.8,
            rozstrzelenie = 0.22,
        };

        /// <summary>Karty w grze (stworzenie, podpis rytu, samouczek) i etykiety działów marginesu.</summary>
        public static Typ_KARTA KARTA = new Typ_KARTA
        {
            tlo = 0.95,
            linia = 0.55,
            liniaWew = 0.22,
            rogi = 0.6,
            wciecie = 5,
            tytulRozmiar = 11,
            tytulAlfa = 0.85,
            etykietaRozmiar = 10,
            etykietaAlfa = 0.7,
        };
    }

    /// <summary>
    /// OZDOBY — rama ryciny, kartusz z tytułem, przerywniki i nagłówki działów.
    /// Wspólne dla menu, atlasu i ustawień.
    ///
    /// Rozmiary „min / max / część” = rozmiar to `część × szerokość ekranu`,
    /// ale nie mniej niż `min` i nie więcej niż `max` pikseli.
    /// „Alfa” = krycie 0..1 (0 = niewidoczne, 1 = pełne).
    /// Mnożniki „× rozmiar” liczone są od wielkości czcionki danego elementu.
    /// </summary>
    public sealed partial class Typ_RAMA
    {
        /// <summary>Odstęp ramy od krawędzi ekranu.</summary>
        public Typ_RAMA_margines margines;
        /// <summary>Szerokość pasa podziałki między linią zewnętrzną a wewnętrzną.</summary>
        public Typ_RAMA_pas pas;
        /// <summary>Odstęp kresek podziałki: ekran / dzielnik, obcięty do min–max.</summary>
        public Typ_RAMA_krok krok;
        /// <summary>Co która kreska jest długa. Krótka ma taką część szerokości pasa.</summary>
        public double dlugaCo;
        public double krotka;
        /// <summary>Krycie: linia zewnętrzna, wewnętrzna, podziałka, rogi.</summary>
        public double alfaZewnetrzna;
        public double alfaWewnetrzna;
        public double alfaPodzialki;
        public double alfaRogow;
        /// <summary>Tło kwadratu w rogu.</summary>
        public double alfaTlaRogu;
        /// <summary>Rozeta w rogu (× szerokość pasa) i zwoje wychodzące na boki.</summary>
        public double rozeta;
        public double zwojRogu;
        /// <summary>Napisy na marginesie: rozmiar = ekran / dzielnik (min–max).</summary>
        public Typ_RAMA_napis napis;
        /// <summary>Rozstrzelenie liter napisu (× rozmiar) i krycie napisu i jego tła.</summary>
        public double napisRozstrzelenie;
        public double alfaNapisu;
        public double alfaTlaNapisu;
    }

    public sealed partial class Typ_RAMA_margines
    {
        public double min;
        public double max;
        public double czesc;
    }

    public sealed partial class Typ_RAMA_pas
    {
        public double min;
        public double max;
        public double czesc;
    }

    public sealed partial class Typ_RAMA_krok
    {
        public double min;
        public double max;
        public double dzielnik;
    }

    public sealed partial class Typ_RAMA_napis
    {
        public double min;
        public double max;
        public double dzielnik;
    }

    public sealed partial class Typ_KARTUSZ
    {
        /// <summary>Grubość czcionki tytułu (400 = zwykła, 700 = gruba).</summary>
        public double waga;
        /// <summary>Rozstrzelenie liter tytułu (× rozmiar).</summary>
        public double rozstrzelenie;
        /// <summary>Wstęga jest szersza od napisu o tyle (× rozmiar)…</summary>
        public double poszerzenie;
        /// <summary>…i ma taką wysokość (× rozmiar).</summary>
        public double wysokosc;
        /// <summary>Kreska wstęgi: grubość i krycie.</summary>
        public double grubosc;
        public double alfaWstegi;
        /// <summary>Cień pod literami (krycie) i jego przesunięcie (× rozmiar).</summary>
        public double alfaCienia;
        public double cienX;
        public double cienY;
        /// <summary>Nadtytuł nad wstęgą: rozmiar (× rozmiar tytułu, nie mniej niż min), rozstrzelenie, krycie.</summary>
        public Typ_KARTUSZ_nadtytul nadtytul;
        /// <summary>Podtytuł pod wstęgą (kursywa).</summary>
        public Typ_KARTUSZ_podtytul podtytul;
    }

    public sealed partial class Typ_KARTUSZ_nadtytul
    {
        public double min;
        public double czesc;
        public double rozstrzelenie;
        public double alfa;
    }

    public sealed partial class Typ_KARTUSZ_podtytul
    {
        public double min;
        public double czesc;
        public double odstep;
        public double alfa;
    }

    public sealed partial class Typ_PRZERYWNIK
    {
        /// <summary>Krycie kreski i rombu.</summary>
        public double alfaKreski;
        public double alfaRombu;
        /// <summary>Pół-szerokość rombu w pikselach.</summary>
        public double romb;
        /// <summary>Przerwa na romb i zwoje (piksele od środka).</summary>
        public double przerwa;
        /// <summary>Zwoje po bokach rombu: odległość od środka i promień.</summary>
        public double zwojOdstep;
        public double zwojPromien;
    }

    public sealed partial class Typ_NAGLOWEK_DZIALU
    {
        /// <summary>Promień kółka z glifem (× rozmiar).</summary>
        public double kolko;
        /// <summary>Krycie kółka, tekstu, kreski i dopisku z prawej.</summary>
        public double alfaKolka;
        public double alfaTekstu;
        public double alfaKreski;
        public double alfaDopisku;
        /// <summary>Tekst zaczyna się tyle promieni kółka od lewej.</summary>
        public double wciecie;
        /// <summary>Rozstrzelenie liter (× rozmiar).</summary>
        public double rozstrzelenie;
    }

    /// <summary>Karty w grze (stworzenie, podpis rytu, samouczek) i etykiety działów marginesu.</summary>
    public sealed partial class Typ_KARTA
    {
        /// <summary>Krycie tła karty.</summary>
        public double tlo;
        /// <summary>Krycie linii zewnętrznej, wewnętrznej i rogów.</summary>
        public double linia;
        public double liniaWew;
        public double rogi;
        /// <summary>Odstęp linii wewnętrznej (i wielkość kwadratów w rogach), px.</summary>
        public double wciecie;
        /// <summary>Tytuł na zakładce: rozmiar liter i krycie.</summary>
        public double tytulRozmiar;
        public double tytulAlfa;
        /// <summary>Etykiety działów na marginesie („spis ras”, „otchłań”…): rozmiar i krycie.</summary>
        public double etykietaRozmiar;
        public double etykietaAlfa;
    }
}
