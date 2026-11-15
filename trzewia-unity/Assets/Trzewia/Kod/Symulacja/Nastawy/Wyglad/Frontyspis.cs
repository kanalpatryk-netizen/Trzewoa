// Wygenerowane z alpha-1/src/nastawy/wyglad/frontyspis.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-frontyspis.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/frontyspis.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladFrontyspis
    {
        /// <summary>
        /// FRONTYSPIS — góra na ekranie menu, malowana jak na ikonie.
        ///
        /// Pokazuje to, o co chodzi w grze: lud mieszka w siedzibie wysoko w górze, żywi się
        /// grzybem ze spiżarni, w skale śpią gniazda kamiennych rycerzy, a wierni kopią drogę
        /// w dół, gdzie przy rdzeniu w skorupie czuwają Strażnicy Snu.
        ///
        /// Wszystkie położenia są ułamkami prostokąta obrazu: x 0..1 od lewej, y 0..1 od góry.
        /// Promienie „rx” liczone od szerokości, „ry” od wysokości obrazu.
        /// </summary>
        public static Typ_FRONTYSPIS FRONTYSPIS = new Typ_FRONTYSPIS
        {
            szczyt1 = new Typ_FRONTYSPIS_szczyt1
            {
                x = 0.58,
                szerokosc = 0.2,
                wysokosc = 1,
            },
            szczyt2 = new Typ_FRONTYSPIS_szczyt2
            {
                x = 0.3,
                szerokosc = 0.16,
                wysokosc = 0.72,
            },
            wysokoscGory = 0.8,
            podstawaGory = 0.12,
            siedziba = new Typ_FRONTYSPIS_siedziba
            {
                x = 0.55,
                y = 0.37,
                rx = 0.085,
                ry = 0.036,
                lud = 5,
            },
            spizarnia = new Typ_FRONTYSPIS_spizarnia
            {
                x = 0.32,
                y = 0.47,
                rx = 0.06,
                ry = 0.03,
            },
            gniazdo = new Typ_FRONTYSPIS_gniazdo
            {
                x = 0.68,
                y = 0.6,
                rx = 0.05,
                ry = 0.07,
            },
            straznicy = new Typ_FRONTYSPIS_straznicy[]
            {
                new Typ_FRONTYSPIS_straznicy
                {
                    x = 0.35,
                    y = 0.79,
                },
                new Typ_FRONTYSPIS_straznicy
                {
                    x = 0.65,
                    y = 0.79,
                },
            },
            straznikWys = 0.15,
            droga = new double[][]
            {
                new double[] { 0.57, 0.4 },
                new double[] { 0.62, 0.48 },
                new double[] { 0.5, 0.55 },
                new double[] { 0.57, 0.63 },
                new double[] { 0.47, 0.7 },
                new double[] { 0.5, 0.74 },
            },
            pielgrzymow = 3,
            tempoPielgrzymow = 0.000025,
            rdzen = new Typ_FRONTYSPIS_rdzen
            {
                x = 0.5,
                y = 0.86,
                promien = 0.05,
            },
            grota = new Typ_FRONTYSPIS_grota
            {
                x = 0.22,
                y = 0.8,
                rx = 0.08,
                ry = 0.04,
            },
            blokow = 18,
            skorupaZewn = 2.2,
            skorupaWewn = 1.55,
            znakiNaPromieniu = 1.87,
            wieniec = 2.55,
            halo = 7,
            haloAlfa = 0.45,
            haloTetno = 0.15,
            sylwetki = 0.85,
            rycerzOkres = 17000,
            rycerzOtwarte = 0.14,
            podpisRozmiar = new Typ_FRONTYSPIS_podpisRozmiar
            {
                min = 11,
                max = 15,
                dzielnik = 60,
            },
            podpisy = new Typ_FRONTYSPIS_podpisy
            {
                a = "siedziba ludu",
                b = "wiadro z jedzeniem",
                c = "gniazdo rycerza",
                d = "droga wiernych",
                e = "Strażnicy Snu",
                f = "rdzeń — tu cię uwolnią",
            },
        };
    }

    /// <summary>
    /// FRONTYSPIS — góra na ekranie menu, malowana jak na ikonie.
    ///
    /// Pokazuje to, o co chodzi w grze: lud mieszka w siedzibie wysoko w górze, żywi się
    /// grzybem ze spiżarni, w skale śpią gniazda kamiennych rycerzy, a wierni kopią drogę
    /// w dół, gdzie przy rdzeniu w skorupie czuwają Strażnicy Snu.
    ///
    /// Wszystkie położenia są ułamkami prostokąta obrazu: x 0..1 od lewej, y 0..1 od góry.
    /// Promienie „rx” liczone od szerokości, „ry” od wysokości obrazu.
    /// </summary>
    public sealed partial class Typ_FRONTYSPIS
    {
        /// <summary>
        /// ------------------------------------------------------------------ bryła
        /// Dwa szczyty: położenie (0..1), szerokość i względna wysokość.
        /// </summary>
        public Typ_FRONTYSPIS_szczyt1 szczyt1;
        public Typ_FRONTYSPIS_szczyt2 szczyt2;
        /// <summary>Jaką część wysokości obrazu zajmuje wyższy szczyt (+ podstawa).</summary>
        public double wysokoscGory;
        public double podstawaGory;
        /// <summary>
        /// ------------------------------------------------------------ elementy
        /// Siedziba ludu: nisza z lampką i mieszkańcami (ilu).
        /// </summary>
        public Typ_FRONTYSPIS_siedziba siedziba;
        /// <summary>Nisza, do której zjeżdża na linie wiadro z jedzeniem (Remake v2; dawniej spiżarnia z grzybem).</summary>
        public Typ_FRONTYSPIS_spizarnia spizarnia;
        /// <summary>Gniazdo kamiennego rycerza: zamurowana nisza w skale, w niej śpiący rycerz.</summary>
        public Typ_FRONTYSPIS_gniazdo gniazdo;
        /// <summary>Strażnicy Snu: dwie postaci zatopione w skale po bokach jaskini rdzenia.</summary>
        public Typ_FRONTYSPIS_straznicy[] straznicy;
        /// <summary>Wysokość strażnika (część wysokości obrazu).</summary>
        public double straznikWys;
        /// <summary>Droga wiernych: od siedziby zakosami w dół, do jaskini rdzenia (punkty łamanej).</summary>
        public double[][] droga;
        /// <summary>Ilu pielgrzymów schodzi drogą i jak szybko (większe = szybciej).</summary>
        public double pielgrzymow;
        public double tempoPielgrzymow;
        /// <summary>Rdzeń: położenie i promień (część krótszego boku obrazu).</summary>
        public Typ_FRONTYSPIS_rdzen rdzen;
        /// <summary>Grota z naciekami w dole zbocza (w tej górze nie ma ani ognia, ani wody).</summary>
        public Typ_FRONTYSPIS_grota grota;
        /// <summary>
        /// ------------------------------------------------------------- skorupa
        /// Ile bloków w pierścieniu skorupy.
        /// </summary>
        public double blokow;
        /// <summary>Promień zewnętrzny i wewnętrzny pierścienia (× promień rdzenia).</summary>
        public double skorupaZewn;
        public double skorupaWewn;
        /// <summary>Wyryte znaki leżą na tym promieniu (× promień rdzenia).</summary>
        public double znakiNaPromieniu;
        /// <summary>Złote perełki nimbu wokół skorupy (× promień rdzenia).</summary>
        public double wieniec;
        /// <summary>
        /// ------------------------------------------------------------ animacja
        /// Poświata rdzenia: zasięg (× promień) i krycie (podstawa + tętno).
        /// </summary>
        public double halo;
        public double haloAlfa;
        public double haloTetno;
        /// <summary>Krycie postaci (biel wapienna).</summary>
        public double sylwetki;
        /// <summary>Rycerz w gnieździe otwiera oczy co tyle ms, na taką część okresu.</summary>
        public double rycerzOkres;
        public double rycerzOtwarte;
        /// <summary>
        /// ------------------------------------------------------------- podpisy
        /// Rozmiar liter odnośników: ekran / dzielnik (min–max).
        /// </summary>
        public Typ_FRONTYSPIS_podpisRozmiar podpisRozmiar;
        /// <summary>Treść odnośników a–f.</summary>
        public Typ_FRONTYSPIS_podpisy podpisy;
    }

    public sealed partial class Typ_FRONTYSPIS_szczyt1
    {
        public double x;
        public double szerokosc;
        public double wysokosc;
    }

    public sealed partial class Typ_FRONTYSPIS_szczyt2
    {
        public double x;
        public double szerokosc;
        public double wysokosc;
    }

    public sealed partial class Typ_FRONTYSPIS_siedziba
    {
        public double x;
        public double y;
        public double rx;
        public double ry;
        public double lud;
    }

    public sealed partial class Typ_FRONTYSPIS_spizarnia
    {
        public double x;
        public double y;
        public double rx;
        public double ry;
    }

    public sealed partial class Typ_FRONTYSPIS_gniazdo
    {
        public double x;
        public double y;
        public double rx;
        public double ry;
    }

    public sealed partial class Typ_FRONTYSPIS_straznicy
    {
        public double x;
        public double y;
    }

    public sealed partial class Typ_FRONTYSPIS_rdzen
    {
        public double x;
        public double y;
        public double promien;
    }

    public sealed partial class Typ_FRONTYSPIS_grota
    {
        public double x;
        public double y;
        public double rx;
        public double ry;
    }

    public sealed partial class Typ_FRONTYSPIS_podpisRozmiar
    {
        public double min;
        public double max;
        public double dzielnik;
    }

    public sealed partial class Typ_FRONTYSPIS_podpisy
    {
        public string a;
        public string b;
        public string c;
        public string d;
        public string e;
        public string f;
    }
}
