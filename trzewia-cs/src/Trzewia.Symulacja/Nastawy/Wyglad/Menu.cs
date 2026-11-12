// Wygenerowane z alpha-1/src/nastawy/wyglad/menu.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-menu.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/menu.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladMenu
    {
        /// <summary>
        /// MENU GŁÓWNE — napisy, układ i animacja ekranu tytułowego.
        ///
        /// Układ według szkicu grafika (5.11): czarne tło, pośrodku u góry rysowane logo „Trzewia”
        /// (`obrazy/menu/logo-trzewia.png`), pod nim spis wejść z ozdobnikami po obu stronach,
        /// w lewym dolnym rogu znaki zespołu (`obrazy/menu/zespol-*.png`), a po prawej puste miejsce
        /// na przyszłą grafikę (trójka postaci — dorysuje grafik).
        ///
        /// Położenia „× w” / „× h” to ułamki szerokości / wysokości ekranu.
        /// Inny obrazek = podmieniony plik o tej samej nazwie (proporcje liczą się same).
        /// </summary>
        public static Typ_MENU MENU = new Typ_MENU
        {
            wersja = "Alpha 1",
            pozycje = new Typ_MENU_pozycje
            {
                wroc = new Typ_MENU_pozycje_wroc
                {
                    etykieta = "Graj dalej",
                },
                nowa = new Typ_MENU_pozycje_nowa
                {
                    etykieta = "Nowa gra",
                },
                wczytaj = new Typ_MENU_pozycje_wczytaj
                {
                    etykieta = "Wczytaj grę",
                },
                samouczek = new Typ_MENU_pozycje_samouczek
                {
                    etykieta = "Samouczek",
                },
                bestiariusz = new Typ_MENU_pozycje_bestiariusz
                {
                    etykieta = "Atlas",
                },
                osiagniecia = new Typ_MENU_pozycje_osiagniecia
                {
                    etykieta = "Osiągnięcia",
                },
                ustawienia = new Typ_MENU_pozycje_ustawienia
                {
                    etykieta = "Ustawienia",
                },
            },
            tlo = "#000000",
            logoBarwa = "#d9d4cb",
            napis = "#a9a49c",
            napisWybrany = "#ffffff",
            ozdobnik = "#78736c",
            ozdobnikWybrany = "#f2ede4",
            poswiata = "255,236,210",
            poswiataRozmycie = 0.7,
            alfaNieaktywnej = 0.3,
            serce = new Typ_MENU_serce
            {
                obrysSzer = 1153,
                obrys = new double[][]
                {
                    new double[] { 514, 361 },
                    new double[] { 530, 355 },
                    new double[] { 570, 342 },
                    new double[] { 616, 348 },
                    new double[] { 618, 376 },
                    new double[] { 641, 388 },
                    new double[] { 645, 418 },
                    new double[] { 642, 436 },
                    new double[] { 661, 459 },
                    new double[] { 669, 495 },
                    new double[] { 664, 531 },
                    new double[] { 651, 554 },
                    new double[] { 625, 561 },
                    new double[] { 590, 558 },
                    new double[] { 561, 552 },
                    new double[] { 559, 558 },
                    new double[] { 533, 558 },
                    new double[] { 528, 524 },
                    new double[] { 520, 497 },
                    new double[] { 513, 473 },
                    new double[] { 509, 456 },
                    new double[] { 512, 448 },
                    new double[] { 513, 428 },
                    new double[] { 522, 422 },
                    new double[] { 523, 400 },
                    new double[] { 518, 379 },
                },
                rozszerz = 4,
                miekkosc = 2,
                okresMs = 1000,
                uderzenia = new Typ_MENU_serce_uderzenia[]
                {
                    new Typ_MENU_serce_uderzenia
                    {
                        od = 0,
                        sila = 0.03,
                    },
                    new Typ_MENU_serce_uderzenia
                    {
                        od = 0.26,
                        sila = 0.017,
                    },
                },
                narastanieMs = 70,
                opadanieMs = 240,
            },
            logoGora = 0.03,
            logoWysokosc = 0.42,
            logoMaxSzer = 0.5,
            spisRozmiar = 0.043,
            spisRozmiarMin = 14,
            spisRozmiarMax = 42,
            spisOdstep = 1.62,
            spisPodLogo = 0.85,
            ozdobnikSzer = 1.05,
            ozdobnikOdstep = 0.22,
            margines = 0.045,
            marginesMin = 14,
            zespol = new Typ_MENU_zespol[]
            {
                new Typ_MENU_zespol
                {
                    plik = "dollum",
                    nazwa = "Dollum",
                    wysokosc = 0.15,
                    link = "",
                },
                new Typ_MENU_zespol
                {
                    plik = "pillow-bleach",
                    nazwa = "Pillow Bleach",
                    wysokosc = 0.11,
                    link = "",
                },
                new Typ_MENU_zespol
                {
                    plik = "podpis-brych",
                    nazwa = "Brych",
                    wysokosc = 0.065,
                    link = "",
                },
            },
            zespolOdstep = 0.025,
            zespolAlfa = 0.85,
            zespolAlfaNajechany = 1,
            zespolPoswiata = "255,236,210",
            zespolRozmycie = 0.09,
            zespolRozmycieMin = 6,
            zespolPodswietlenieMs = 160,
            wejscieMs = 1100,
            pozycjaOpoznienie = 70,
            pozycjaCzas = 380,
            spisOd = 350,
            zespolOd = 700,
            komunikatMs = 8000,
        };
    }

    /// <summary>
    /// MENU GŁÓWNE — napisy, układ i animacja ekranu tytułowego.
    ///
    /// Układ według szkicu grafika (5.11): czarne tło, pośrodku u góry rysowane logo „Trzewia”
    /// (`obrazy/menu/logo-trzewia.png`), pod nim spis wejść z ozdobnikami po obu stronach,
    /// w lewym dolnym rogu znaki zespołu (`obrazy/menu/zespol-*.png`), a po prawej puste miejsce
    /// na przyszłą grafikę (trójka postaci — dorysuje grafik).
    ///
    /// Położenia „× w” / „× h” to ułamki szerokości / wysokości ekranu.
    /// Inny obrazek = podmieniony plik o tej samej nazwie (proporcje liczą się same).
    /// </summary>
    public sealed partial class Typ_MENU
    {
        /// <summary>
        /// ------------------------------------------------------------------ napisy
        /// Wersja gry — małym drukiem w prawym dolnym rogu.
        /// </summary>
        public string wersja;
        /// <summary>Pozycje spisu. Kolejność = kolejność na ekranie.</summary>
        public Typ_MENU_pozycje pozycje;
        /// <summary>
        /// ------------------------------------------------------------------ barwy
        /// Tło — czyste czarne.
        /// </summary>
        public string tlo;
        /// <summary>Logo (obrazek jest biały — tu dostaje barwę).</summary>
        public string logoBarwa;
        /// <summary>Napisy spisu: zwykły i wybrany.</summary>
        public string napis;
        public string napisWybrany;
        /// <summary>Ozdobniki przy napisach: zwykły i przy wybranym.</summary>
        public string ozdobnik;
        public string ozdobnikWybrany;
        /// <summary>Poświata wybranej pozycji (rgb) i jej rozmycie (× rozmiar liter).</summary>
        public string poswiata;
        public double poswiataRozmycie;
        /// <summary>Krycie pozycji nieaktywnej (np. „Graj dalej” bez trwającej gry).</summary>
        public double alfaNieaktywnej;
        /// <summary>
        /// ----------------------------------------------------------------- układ
        ///
        /// Bijące serce w logo. Serce jest w logo połączone kreskami z ornamentami, więc wycina się je
        /// obrysem: wielokąt w pikselach pliku logo (szerokości `obrysSzer` — przy innej rozdzielczości tego
        /// samego rysunku skaluje się sam; przy nowym rysunku trzeba obrys poprawić). `rozszerz` i `miekkosc`
        /// (px logo): o ile obrys jest szerszy i jak miękka jest jego krawędź.
        /// Rytm jak u żywego serca: mocne „lub” i słabsze „dub” zaraz po nim, potem przerwa. `sila` — o ile
        /// serce rośnie (0,03 = 3%), `od` — kiedy w okresie (0..1), narastanie i opadanie w ms.
        /// Przy „Ogranicz ruch” serce nie bije.
        /// </summary>
        public Typ_MENU_serce serce;
        /// <summary>Logo: górna krawędź (× h), wysokość (× h), najwyżej taka część szerokości.</summary>
        public double logoGora;
        public double logoWysokosc;
        public double logoMaxSzer;
        /// <summary>Spis: rozmiar liter (× h, obcięty do min–max), odstęp wierszy (× rozmiar), odstęp od logo (× rozmiar).</summary>
        public double spisRozmiar;
        public double spisRozmiarMin;
        public double spisRozmiarMax;
        public double spisOdstep;
        public double spisPodLogo;
        /// <summary>Ozdobnik: szerokość (× rozmiar liter) i odstęp od napisu (× rozmiar liter).</summary>
        public double ozdobnikSzer;
        public double ozdobnikOdstep;
        /// <summary>Margines od krawędzi ekranu (× h, najmniej px).</summary>
        public double margines;
        public double marginesMin;
        /// <summary>
        /// Znaki zespołu w lewym dolnym rogu, od lewej: plik (`obrazy/menu/zespol-&lt;plik&gt;.png`) i wysokość (× h).
        /// Każdy znak to przycisk: `link` pusty = kliknięcie nic nie robi; wpisany adres otworzy się w nowej karcie.
        /// Rząd zmniejsza się sam, gdy nie mieści się obok spisu.
        /// </summary>
        public Typ_MENU_zespol[] zespol;
        /// <summary>Odstęp między znakami zespołu (× h) i ich krycie: zwykłe i pod myszą.</summary>
        public double zespolOdstep;
        public double zespolAlfa;
        public double zespolAlfaNajechany;
        /// <summary>
        /// Podświetlenie znaku pod myszą: poświata idzie wzdłuż kresek (liter, konturów), nie całego prostokąta
        /// obrazka — obrazki mają przezroczyste tło. Barwa (rgb), rozmycie (× wysokość znaku, najmniej px)
        /// i czas rozjaśniania (ms).
        /// </summary>
        public string zespolPoswiata;
        public double zespolRozmycie;
        public double zespolRozmycieMin;
        public double zespolPodswietlenieMs;
        /// <summary>
        /// Prawa strona (szkic: „tu tę trójkę dam”) zostaje pusta — będzie tam grafika.
        /// --------------------------------------------------------------- animacja
        /// Wejście na ekran (ms): logo rozjaśnia się przez tyle.
        /// </summary>
        public double wejscieMs;
        /// <summary>Kolejne pozycje spisu wchodzą z takim opóźnieniem (ms) i trwają tyle.</summary>
        public double pozycjaOpoznienie;
        public double pozycjaCzas;
        public double spisOd;
        /// <summary>Znaki zespołu pojawiają się po tylu ms.</summary>
        public double zespolOd;
        /// <summary>Komunikat (np. po końcu gry) wisi tyle ms.</summary>
        public double komunikatMs;
    }

    public sealed partial class Typ_MENU_pozycje
    {
        public Typ_MENU_pozycje_wroc wroc;
        public Typ_MENU_pozycje_nowa nowa;
        public Typ_MENU_pozycje_wczytaj wczytaj;
        public Typ_MENU_pozycje_samouczek samouczek;
        public Typ_MENU_pozycje_bestiariusz bestiariusz;
        public Typ_MENU_pozycje_osiagniecia osiagniecia;
        public Typ_MENU_pozycje_ustawienia ustawienia;
    }

    public sealed partial class Typ_MENU_pozycje_wroc
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_nowa
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_wczytaj
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_samouczek
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_bestiariusz
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_osiagniecia
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_pozycje_ustawienia
    {
        public string etykieta;
    }

    public sealed partial class Typ_MENU_serce
    {
        public double obrysSzer;
        public double[][] obrys;
        public double rozszerz;
        public double miekkosc;
        public double okresMs;
        public Typ_MENU_serce_uderzenia[] uderzenia;
        public double narastanieMs;
        public double opadanieMs;
    }

    public sealed partial class Typ_MENU_serce_uderzenia
    {
        public double od;
        public double sila;
    }

    public sealed partial class Typ_MENU_zespol
    {
        public string plik;
        public string nazwa;
        public double wysokosc;
        public string link;
    }
}
