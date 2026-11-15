// Wygenerowane z alpha-1/src/nastawy/dzwiek.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/dzwiek.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/dzwiek.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyDzwiek
    {
        /// <summary>
        /// DŹWIĘK — muzyka, mikser i dźwięki gestów. Wszystko syntezowane w locie.
        ///
        /// Głośności to mnożniki (1 = jak teraz, 0.5 = o połowę ciszej, 0 = wyciszone).
        /// Czasy w sekundach, częstotliwości w hercach.
        /// </summary>
        public static Typ_MUZYKA MUZYKA = new Typ_MUZYKA
        {
            glosnosc = 0.85,
            akordy = 0.4,
            skala = new double[] { 0, 1, 3, 5, 7, 8, 10 },
            podstawa = 146.83,
            akordGra = 13,
            akordInne = 11,
            skrotNapiecia = 4,
            filtrOd = 260,
            filtrSzczyt = 520,
            filtrNapiecie = 520,
            filtrDo = 240,
            akordGlos = 0.07,
            akordRozrzut = 0.03,
            bas = 0.12,
            odstrojenie = 12,
            rozstaw = 0.55,
            dzwonMenu = 9,
            dzwonGra = 6,
            dzwonRozrzut = 7,
            dzwonNapiecie = 3,
            dzwonMinPrzerwa = 2.5,
            dzwonGlos = 0.12,
            dzwonGlosRozrzut = 0.06,
            dzwonPoglos = 0.55,
            dzwonMetal = 2.76,
            dzwonModulacja = 1.4,
            narastanie = 3,
            progresja = new Typ_MUZYKA_progresja
            {
                menu = new Typ_MUZYKA_progresja_menu[]
                {
                    new Typ_MUZYKA_progresja_menu
                    {
                        stopnie = new double[] { 0, 2, 4 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_menu
                    {
                        stopnie = new double[] { 0, 3, 5 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_menu
                    {
                        stopnie = new double[] { -2, 1, 3 },
                        bas = -14,
                    },
                    new Typ_MUZYKA_progresja_menu
                    {
                        stopnie = new double[] { 0, 2, 5 },
                        bas = -12,
                    },
                },
                samouczek = new Typ_MUZYKA_progresja_samouczek[]
                {
                    new Typ_MUZYKA_progresja_samouczek
                    {
                        stopnie = new double[] { 0, 2, 4 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_samouczek
                    {
                        stopnie = new double[] { 1, 3, 5 },
                        bas = -11,
                    },
                    new Typ_MUZYKA_progresja_samouczek
                    {
                        stopnie = new double[] { 0, 2, 4 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_samouczek
                    {
                        stopnie = new double[] { -1, 2, 4 },
                        bas = -13,
                    },
                },
                gra = new Typ_MUZYKA_progresja_gra[]
                {
                    new Typ_MUZYKA_progresja_gra
                    {
                        stopnie = new double[] { 0, 2, 4 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_gra
                    {
                        stopnie = new double[] { -2, 0, 3 },
                        bas = -14,
                    },
                    new Typ_MUZYKA_progresja_gra
                    {
                        stopnie = new double[] { 1, 3, 5 },
                        bas = -11,
                    },
                    new Typ_MUZYKA_progresja_gra
                    {
                        stopnie = new double[] { 0, 2, 6 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_gra
                    {
                        stopnie = new double[] { -3, -1, 2 },
                        bas = -15,
                    },
                },
                koniec = new Typ_MUZYKA_progresja_koniec[]
                {
                    new Typ_MUZYKA_progresja_koniec
                    {
                        stopnie = new double[] { 0, 3, 5 },
                        bas = -12,
                    },
                    new Typ_MUZYKA_progresja_koniec
                    {
                        stopnie = new double[] { -2, 1, 3 },
                        bas = -14,
                    },
                },
            },
        };

        /// <summary>
        /// NIEPOKÓJ — warstwy pod muzyką, które nie dają się uspokoić: dudniący pomruk góry,
        /// oddech dobiegający z głębi, odległe trzaski skały i chór bez słów, który czasem
        /// przechodzi korytarzem. Wszystko gęstnieje z napięciem (sen i przewaga jednej krwi).
        /// </summary>
        public static Typ_NIEPOKOJ NIEPOKOJ = new Typ_NIEPOKOJ
        {
            pomrukHz = 73.42,
            pomrukDudnienie = 0.45,
            pomrukMenu = 0.05,
            pomrukGra = 0.045,
            pomrukNapiecie = 0.06,
            piskHz = 2349.3,
            piskGlos = 0.0035,
            piskOd = 0.45,
            oddechCo = 11,
            oddechRozrzut = 9,
            oddechGlos = 0.05,
            oddechWdech = 2.2,
            oddechWydech = 3.4,
            trzaskCo = 7,
            trzaskRozrzut = 14,
            trzaskGlos = 0.09,
            chorCo = 38,
            chorRozrzut = 30,
            chorGlos = 0.022,
            chorDlugosc = 9,
            szeptGlos = 0.05,
            zabranieGlos = 0.16,
            otchlanGlos = 0.22,
            formanty = new double[][]
            {
                new double[] { 730, 1090 },
                new double[] { 570, 840 },
                new double[] { 300, 870 },
                new double[] { 440, 1020 },
            },
        };

        /// <summary>Rezonans świata: niski ton kamienia, praca i modlitwa.</summary>
        public static Typ_REZONANS REZONANS = new Typ_REZONANS
        {
            glosnosc = 0.55,
        };

        public static Typ_MIKSER MIKSER = new Typ_MIKSER
        {
            wzmocnienie = 1.6,
            ogranicznikProg = -10,
            ogranicznikKolano = 8,
            ogranicznikStosunek = 6,
            ogranicznikAtak = 0.005,
            ogranicznikZwolnienie = 0.25,
            poglos = 3.4,
            pauzaFiltr = 420,
            pauzaCiszej = 0.35,
            przyciszenie = 0.35,
        };

        /// <summary>Dźwięki gestów gracza: głośność każdego z osobna i minimalny odstęp powtórzeń (ms).</summary>
        public static Typ_GESTY GESTY = new Typ_GESTY
        {
            glosnosc = new Typ_GESTY_glosnosc
            {
                klik = 1,
                szkic = 1,
                skresl = 1,
                odmowa = 1,
                pauza = 1,
                tonPauzy = 1,
                wykonanie = 1,
                alarmKryzys = 1,
                alarmWydarzenie = 1,
                kartka = 1,
                tablica = 1,
            },
            odstepMs = new Typ_GESTY_odstepMs
            {
                klik = 60,
                szkic = 85,
                skresl = 90,
                odmowa = 280,
                kartka = 150,
            },
            kaskada = new double[] { 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99 },
        };

        /// <summary>
        /// GŁOS RYCERZA (Alpha) — nagrania z gra222/dzwieki/odmowy/rycerz/: rycerz mówi je na głos, gdy odmawia pójścia
        /// tam, gdzie mu kazano, a nie da się dojść („nie dojdę tam — nie ma drogi”, „tam nie ma na czym stanąć”…).
        /// Za każdym razem losuje jedno nagranie według szansy jego grupy. Szansa to procent na jedno nagranie;
        /// razem ma wyjść 100 (tu: 4 × 17 + 3 × 8 + 3 × 2,5 + 1 × 0,5). Żeby zamienić rzadkość, przenieś numer
        /// pliku do innej grupy (i popraw szanse, jeśli liczba plików w grupie się zmieni).
        /// Nagranie spoza listy (nowy plik w folderze) gra jak pospolite.
        /// </summary>
        public static NastawyGlosu GLOS_RYCERZA = new NastawyGlosu
        {
            odmowy = new string[] { "nie dojdę", "tam " },
            glosnosc = 0.7,
            poglos = 0.16,
            opoznienie = 0.12,
            odstepMs = 500,
            wyrownajDo = -20,
            mowaOd = -30,
            ciszaPonizej = -45,
            pustePonizej = -50,
            rzadkosc = new NastawyGlosu_rzadkosc
            {
                pospolite = new NastawyGlosu_rzadkosc_pospolite
                {
                    szansa = 17,
                    pliki = new string[] { "02", "04", "06", "08" },
                },
                rzadsze = new NastawyGlosu_rzadkosc_rzadsze
                {
                    szansa = 8,
                    pliki = new string[] { "10", "12", "14" },
                },
                bardzoRzadkie = new NastawyGlosu_rzadkosc_bardzoRzadkie
                {
                    szansa = 2.5,
                    pliki = new string[] { "15", "17", "19" },
                },
                ekstremalnieRzadkie = new NastawyGlosu_rzadkosc_ekstremalnieRzadkie
                {
                    szansa = 0.5,
                    pliki = new string[] { "20" },
                },
            },
        };

        /// <summary>
        /// GŁOS POBOŻNEGO (Alpha) — nagrania z gra222/dzwieki/odmowy/pobozny/: pobożny mówi je na głos tak samo jak rycerz,
        /// gdy odmawia pójścia tam, gdzie się nie da dojść. Te same zasady co GLOS_RYCERZA wyżej: szansa to procent na jedno
        /// nagranie, razem 100 (tu: 11 × 9,09 — wszystkie tak samo częste). Rzadsze nagranie: przenieś jego numer
        /// (…_part-NN.mp3) do nowej grupy z mniejszą szansą i popraw resztę. Naraz mówi jeden — pobożny nie wchodzi w słowo rycerzowi.
        /// </summary>
        public static NastawyGlosu GLOS_POBOZNEGO = new NastawyGlosu
        {
            odmowy = new string[] { "nie dojdę", "tam " },
            glosnosc = 0.7,
            poglos = 0.16,
            opoznienie = 0.12,
            odstepMs = 500,
            wyrownajDo = -20,
            mowaOd = -30,
            ciszaPonizej = -45,
            pustePonizej = -50,
            rzadkosc = new NastawyGlosu_rzadkosc
            {
                pospolite = new NastawyGlosu_rzadkosc_pospolite
                {
                    szansa = 9.09,
                    pliki = new string[] { "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11" },
                },
            },
        };

        /// <summary>
        /// GŁOSY LUDU (Alpha) — kwestie z gra222/dzwieki/jednostki/. Każdy folder to jedna kwestia, a wielka litera na końcu
        /// nazwy mówi, czyja (R — rycerz, P — pobożny; folder bez litery mówi każdy z ludu, a folder z literą ma pierwszeństwo):
        /// - potwierdzenie — postać przyjęła rozkaz („Ruszamy!”, „No to w drogę!”),
        /// - atak — rusza do walki ze Strażnikami Snu albo z demonem („Do boju!”),
        /// - bol — oberwała („Argh!”, „Ała!”),
        /// - glod — jest głodna.
        /// Nowy plik .mp3 w folderze trafia do gry sam i dzieli szanse z resztą po równo, a ta sama kwestia nie pada dwa razy
        /// z rzędu. Plik, którego nazwa zaczyna się od „rzadkie”, gra w tych samych chwilach co reszta folderu, ale ze stałą
        /// szansą (`rzadkie`). Naraz mówi jeden: kwestia o większej wadze ucina tę, która jeszcze trwa, mniejsza i równa
        /// przepadają. Kiedy która kwestia pada — app/screens/game.ts (glosyLudu). Przerwy w sekundach, głód w skali 0..1.
        /// </summary>
        public static Typ_GLOSY_LUDU GLOSY_LUDU = new Typ_GLOSY_LUDU
        {
            koncowki = new Dictionary<string, string>
            {
                ["R"] = "rycerz",
                ["P"] = "pobozny",
            },
            pomin = new string[] { "atakP" },
            wysokosc = new Typ_GLOSY_LUDU_wysokosc
            {
                pobozny = -150,
                robotnik = 0,
                rycerz = 0,
            },
            rzadkie = new Typ_GLOSY_LUDU_rzadkie
            {
                nazwa = "rzadkie",
                szansa = 0.5,
            },
            waga = new Typ_GLOSY_LUDU_waga
            {
                bol = 4,
                atak = 3,
                potwierdzenie = 2,
                odmowa = 2,
                glod = 1,
            },
            glosnosc = 0.7,
            poglos = 0.16,
            potwierdzenie = new Typ_GLOSY_LUDU_potwierdzenie
            {
                opoznienie = 0.06,
                odstep = 1.5,
            },
            atak = new Typ_GLOSY_LUDU_atak
            {
                przerwa = 15,
                walkaTrwa = 3,
                nastepnySzansa = 0.3333333333333333,
            },
            bol = new Typ_GLOSY_LUDU_bol
            {
                mocnyCo = 1,
                slabyCo = 3,
                slabySzansa = 0.5,
            },
            glod = new Typ_GLOSY_LUDU_glod
            {
                od = 0.6,
                przymiera = 0.85,
                syty = 0.35,
                co = 25,
                coPrzymiera = 10,
            },
            wyrownajDo = -20,
            mowaOd = -30,
            ciszaPonizej = -45,
            pustePonizej = -50,
            przerwaKonczy = 1,
            przerwaPonizej = -35,
        };

        /// <summary>Kwestie ludu — foldery w gra222/dzwieki/jednostki/ (bez litery roli).</summary>
        public static readonly string[] KwestiaLudu = { "potwierdzenie", "atak", "bol", "glod" };
    }

    /// <summary>
    /// DŹWIĘK — muzyka, mikser i dźwięki gestów. Wszystko syntezowane w locie.
    ///
    /// Głośności to mnożniki (1 = jak teraz, 0.5 = o połowę ciszej, 0 = wyciszone).
    /// Czasy w sekundach, częstotliwości w hercach.
    /// </summary>
    public sealed partial class Typ_MUZYKA
    {
        /// <summary>Udział muzyki we wspólnej głośności.</summary>
        public double glosnosc;
        /// <summary>Poziom akordów tła względem dzwonów.</summary>
        public double akordy;
        /// <summary>Skala w półtonach od podstawy (tu: frygijska — stara i niepokojąca).</summary>
        public double[] skala;
        /// <summary>Podstawa skali: D3.</summary>
        public double podstawa;
        /// <summary>Długość jednego akordu: w grze (skraca się z napięciem o `skrotNapiecia`) i gdzie indziej.</summary>
        public double akordGra;
        public double akordInne;
        public double skrotNapiecia;
        /// <summary>Filtr akordu: od ilu Hz się otwiera, do ilu dochodzi (+ tyle przy pełnym napięciu).</summary>
        public double filtrOd;
        public double filtrSzczyt;
        public double filtrNapiecie;
        public double filtrDo;
        /// <summary>Głośność głosu akordu (+ losowo do `akordRozrzut`) i basu.</summary>
        public double akordGlos;
        public double akordRozrzut;
        public double bas;
        /// <summary>Odstrojenie głosów akordu (centy, ±połowa).</summary>
        public double odstrojenie;
        /// <summary>Rozstaw głosów w panoramie (−1 lewo … 1 prawo).</summary>
        public double rozstaw;
        /// <summary>Dzwon: przerwa w menu / w grze + losowo do `dzwonRozrzut` − napięcie × `dzwonNapiecie`.</summary>
        public double dzwonMenu;
        public double dzwonGra;
        public double dzwonRozrzut;
        public double dzwonNapiecie;
        public double dzwonMinPrzerwa;
        /// <summary>Głośność dzwonu (+ losowo do rozrzutu) i ile idzie w pogłos.</summary>
        public double dzwonGlos;
        public double dzwonGlosRozrzut;
        public double dzwonPoglos;
        /// <summary>Metaliczność dzwonu: stosunek modulatora i głębokość modulacji.</summary>
        public double dzwonMetal;
        public double dzwonModulacja;
        /// <summary>Narastanie muzyki po starcie (s).</summary>
        public double narastanie;
        /// <summary>Progresje akordów: stopnie skali i bas dla każdej sceny (kolejno, w kółko).</summary>
        public Typ_MUZYKA_progresja progresja;
    }

    public sealed partial class Typ_MUZYKA_progresja
    {
        public Typ_MUZYKA_progresja_menu[] menu;
        public Typ_MUZYKA_progresja_samouczek[] samouczek;
        public Typ_MUZYKA_progresja_gra[] gra;
        public Typ_MUZYKA_progresja_koniec[] koniec;
    }

    public sealed partial class Typ_MUZYKA_progresja_menu
    {
        public double[] stopnie;
        public double bas;
    }

    public sealed partial class Typ_MUZYKA_progresja_samouczek
    {
        public double[] stopnie;
        public double bas;
    }

    public sealed partial class Typ_MUZYKA_progresja_gra
    {
        public double[] stopnie;
        public double bas;
    }

    public sealed partial class Typ_MUZYKA_progresja_koniec
    {
        public double[] stopnie;
        public double bas;
    }

    /// <summary>
    /// NIEPOKÓJ — warstwy pod muzyką, które nie dają się uspokoić: dudniący pomruk góry,
    /// oddech dobiegający z głębi, odległe trzaski skały i chór bez słów, który czasem
    /// przechodzi korytarzem. Wszystko gęstnieje z napięciem (sen i przewaga jednej krwi).
    /// </summary>
    public sealed partial class Typ_NIEPOKOJ
    {
        /// <summary>Pomruk: dwa niskie tony rozstrojone o tyle Hz (dudnienie) i ich głośność w menu / w grze (+ napięcie).</summary>
        public double pomrukHz;
        public double pomrukDudnienie;
        public double pomrukMenu;
        public double pomrukGra;
        public double pomrukNapiecie;
        /// <summary>Dzwonienie w uszach przy dużym napięciu: wysoka sekunda mała, ledwo słyszalna.</summary>
        public double piskHz;
        public double piskGlos;
        public double piskOd;
        /// <summary>Oddech góry: szum w paśmie, co tyle s (+ losowo), głośność, długość wdechu i wydechu.</summary>
        public double oddechCo;
        public double oddechRozrzut;
        public double oddechGlos;
        public double oddechWdech;
        public double oddechWydech;
        /// <summary>Trzaski skały: co tyle s (+ losowo), głośność; z napięciem częściej.</summary>
        public double trzaskCo;
        public double trzaskRozrzut;
        public double trzaskGlos;
        /// <summary>Chór bez słów: co tyle s (+ losowo), głośność, długość frazy; formanty samogłosek.</summary>
        public double chorCo;
        public double chorRozrzut;
        public double chorGlos;
        public double chorDlugosc;
        /// <summary>Szept z ciemności (głośność sylab) i głuche uderzenie, gdy dłoń z otchłani kogoś zabiera.</summary>
        public double szeptGlos;
        public double zabranieGlos;
        /// <summary>Pomruk otchłani, gdy z głębi zaczyna się wznosić dłoń (Koszmar: dłoń z otchłani).</summary>
        public double otchlanGlos;
        public double[][] formanty;
    }

    /// <summary>Rezonans świata: niski ton kamienia, praca i modlitwa.</summary>
    public sealed partial class Typ_REZONANS
    {
        /// <summary>Udział rezonansu we wspólnej głośności.</summary>
        public double glosnosc;
    }

    public sealed partial class Typ_MIKSER
    {
        /// <summary>Wzmocnienie całej gry przed ogranicznikiem.</summary>
        public double wzmocnienie;
        /// <summary>Ogranicznik: próg (dB), kolano, stosunek, atak i zwolnienie (s).</summary>
        public double ogranicznikProg;
        public double ogranicznikKolano;
        public double ogranicznikStosunek;
        public double ogranicznikAtak;
        public double ogranicznikZwolnienie;
        /// <summary>Pogłos jaskini: długość ogona (s).</summary>
        public double poglos;
        /// <summary>Pauza: świat słychać jak zza skały — filtr schodzi do tylu Hz…</summary>
        public double pauzaFiltr;
        /// <summary>…a głośność świata spada o tyle.</summary>
        public double pauzaCiszej;
        /// <summary>Ostrzeżenie przycisza resztę do tego poziomu.</summary>
        public double przyciszenie;
    }

    /// <summary>Dźwięki gestów gracza: głośność każdego z osobna i minimalny odstęp powtórzeń (ms).</summary>
    public sealed partial class Typ_GESTY
    {
        public Typ_GESTY_glosnosc glosnosc;
        public Typ_GESTY_odstepMs odstepMs;
        /// <summary>Kaskada wykonanego planu (Hz) — po jednym tonie na rozkaz.</summary>
        public double[] kaskada;
    }

    public sealed partial class Typ_GESTY_glosnosc
    {
        public double klik;
        public double szkic;
        public double skresl;
        public double odmowa;
        public double pauza;
        public double tonPauzy;
        public double wykonanie;
        public double alarmKryzys;
        public double alarmWydarzenie;
        public double kartka;
        public double tablica;
    }

    public sealed partial class Typ_GESTY_odstepMs
    {
        public double klik;
        public double szkic;
        public double skresl;
        public double odmowa;
        public double kartka;
    }

    /// <summary>
    /// GŁOS RYCERZA (Alpha) — nagrania z gra222/dzwieki/odmowy/rycerz/: rycerz mówi je na głos, gdy odmawia pójścia
    /// tam, gdzie mu kazano, a nie da się dojść („nie dojdę tam — nie ma drogi”, „tam nie ma na czym stanąć”…).
    /// Za każdym razem losuje jedno nagranie według szansy jego grupy. Szansa to procent na jedno nagranie;
    /// razem ma wyjść 100 (tu: 4 × 17 + 3 × 8 + 3 × 2,5 + 1 × 0,5). Żeby zamienić rzadkość, przenieś numer
    /// pliku do innej grupy (i popraw szanse, jeśli liczba plików w grupie się zmieni).
    /// Nagranie spoza listy (nowy plik w folderze) gra jak pospolite.
    /// </summary>
    public sealed partial class NastawyGlosu
    {
        /// <summary>Które odmowy rycerz mówi na głos: te, których powód zaczyna się tak (wszystkie „nie dojdę…” i „tam …”).</summary>
        public string[] odmowy;
        /// <summary>Głośność głosu (mnożnik; razem z suwakiem głośności i przełącznikiem efektów).</summary>
        public double glosnosc;
        /// <summary>Ile głosu idzie w pogłos jaskini.</summary>
        public double poglos;
        /// <summary>Głos wchodzi tyle sekund po głuchym stuku odmowy (żeby się nie zlały).</summary>
        public double opoznienie;
        /// <summary>Najmniej tyle ms między dwiema odmowami na głos; póki ktoś mówi coś nie mniej ważnego (GLOSY_LUDU.waga), odmowa nie zaczyna.</summary>
        public double odstepMs;
        /// <summary>Nagrania wyrównuje się do jednej głośności: średnia z głośnych fragmentów (dBFS), szczyt najwyżej −1 dBFS.</summary>
        public double wyrownajDo;
        /// <summary>
        /// Początek nagrania (szum, stuk, oddech) jest odcinany aż do pierwszego fragmentu nie cichszego niż tyle dB pod
        /// najgłośniejszym — rycerz odpowiada od razu. Więcej (np. −40) zostawia cichsze początki słów, mniej (−20) tnie śmielej.
        /// </summary>
        public double mowaOd;
        /// <summary>Cisza na końcu nagrania (poniżej tylu dBFS) jest odcinana.</summary>
        public double ciszaPonizej;
        /// <summary>Nagranie, którego najgłośniejsze miejsce jest cichsze niż tyle dBFS, uchodzi za puste i nie gra wcale.</summary>
        public double pustePonizej;
        /// <summary>Grupy rzadkości: szansa jednego nagrania (%) i numery plików (dziweki_part-NN.mp3).</summary>
        public NastawyGlosu_rzadkosc rzadkosc;
    }

    public sealed partial class NastawyGlosu_rzadkosc
    {
        public NastawyGlosu_rzadkosc_pospolite pospolite;
        public NastawyGlosu_rzadkosc_rzadsze rzadsze;
        public NastawyGlosu_rzadkosc_bardzoRzadkie bardzoRzadkie;
        public NastawyGlosu_rzadkosc_ekstremalnieRzadkie ekstremalnieRzadkie;
    }

    public sealed partial class NastawyGlosu_rzadkosc_pospolite
    {
        public double szansa;
        public string[] pliki;
    }

    public sealed partial class NastawyGlosu_rzadkosc_rzadsze
    {
        public double szansa;
        public string[] pliki;
    }

    public sealed partial class NastawyGlosu_rzadkosc_bardzoRzadkie
    {
        public double szansa;
        public string[] pliki;
    }

    public sealed partial class NastawyGlosu_rzadkosc_ekstremalnieRzadkie
    {
        public double szansa;
        public string[] pliki;
    }

    /// <summary>
    /// GŁOSY LUDU (Alpha) — kwestie z gra222/dzwieki/jednostki/. Każdy folder to jedna kwestia, a wielka litera na końcu
    /// nazwy mówi, czyja (R — rycerz, P — pobożny; folder bez litery mówi każdy z ludu, a folder z literą ma pierwszeństwo):
    /// - potwierdzenie — postać przyjęła rozkaz („Ruszamy!”, „No to w drogę!”),
    /// - atak — rusza do walki ze Strażnikami Snu albo z demonem („Do boju!”),
    /// - bol — oberwała („Argh!”, „Ała!”),
    /// - glod — jest głodna.
    /// Nowy plik .mp3 w folderze trafia do gry sam i dzieli szanse z resztą po równo, a ta sama kwestia nie pada dwa razy
    /// z rzędu. Plik, którego nazwa zaczyna się od „rzadkie”, gra w tych samych chwilach co reszta folderu, ale ze stałą
    /// szansą (`rzadkie`). Naraz mówi jeden: kwestia o większej wadze ucina tę, która jeszcze trwa, mniejsza i równa
    /// przepadają. Kiedy która kwestia pada — app/screens/game.ts (glosyLudu). Przerwy w sekundach, głód w skali 0..1.
    /// </summary>
    public sealed partial class Typ_GLOSY_LUDU
    {
        /// <summary>Czyje nagrania: wielka litera na końcu nazwy folderu → rola (nowa rola — nowa litera).</summary>
        public Dictionary<string, string> koncowki;
        /// <summary>Foldery, których gra (jeszcze) nie używa: pobożny nie ma jeszcze ataku — atakP czeka na mechanikę walki pobożnego.</summary>
        public string[] pomin;
        /// <summary>
        /// Wysokość głosu roli w centach (100 = półton; mniej = niżej) — także w odmowach z gra222/dzwieki/odmowy/. Głos
        /// schodzi niżej przez wolniejsze odtwarzanie, więc kwestia trwa odrobinę dłużej (−150 — o ok. 9%).
        /// </summary>
        public Typ_GLOSY_LUDU_wysokosc wysokosc;
        /// <summary>Plik o nazwie zaczynającej się od `nazwa` gra z szansą `szansa` (%) za każdym razem, gdy pada kwestia z jego folderu.</summary>
        public Typ_GLOSY_LUDU_rzadkie rzadkie;
        /// <summary>Waga kwestii: ważniejsza (więcej) ucina mniej ważną; odmowa to głos z gra222/dzwieki/odmowy/ (GLOS_RYCERZA…).</summary>
        public Typ_GLOSY_LUDU_waga waga;
        /// <summary>Głośność głosu (mnożnik; razem z suwakiem głośności i przełącznikiem efektów) i ile idzie w pogłos jaskini.</summary>
        public double glosnosc;
        public double poglos;
        /// <summary>
        /// Potwierdzenie wchodzi tyle sekund po kliknięciu; nowy rozkaz ucina poprzednie potwierdzenie, ale najwyżej co `odstep` s
        /// (wspólnie dla wszystkich — na rozkaz dla grupy odpowiada jeden głos).
        /// </summary>
        public Typ_GLOSY_LUDU_potwierdzenie potwierdzenie;
        /// <summary>
        /// Atak: okrzyk, gdy postać rusza do walki — najwyżej co `przerwa` s; nowy przeciwnik w tej samej walce (walczyła
        /// najwyżej `walkaTrwa` s temu) — tylko z szansą `nastepnySzansa`. Na demona krzyczy zawsze, gdy pierwszy raz na niego rusza.
        /// </summary>
        public Typ_GLOSY_LUDU_atak atak;
        /// <summary>
        /// Ból: mocny cios (demon, rzut dłonią z otchłani — strop i ziemia, bolesny upadek, cios, od którego ginie) — zawsze,
        /// najwyżej co `mocnyCo` s; słaby (Strażnik Snu) — najwyżej co `slabyCo` s i z szansą `slabySzansa`. Głód nie boli
        /// (od tego jest głód).
        /// </summary>
        public Typ_GLOSY_LUDU_bol bol;
        /// <summary>
        /// Głód: pierwszy raz, gdy dojdzie do `od` (tyle, że rycerz i pobożni sami idą jeść — LUD.glodSam), potem co `co` s;
        /// od `przymiera` (biegnie do liny wiadra, zaraz zacznie tracić życie) co `coPrzymiera` s. Cichnie, gdy zje (głód
        /// poniżej `syty`). W walce nie marudzi, chyba że przymiera; gdy czas stoi (pauza, otwarta karta) — wcale.
        /// </summary>
        public Typ_GLOSY_LUDU_glod glod;
        /// <summary>Nagrania wyrównuje się i przycina jak odmowy (opis przy GLOS_RYCERZA)…</summary>
        public double wyrownajDo;
        public double mowaOd;
        public double ciszaPonizej;
        public double pustePonizej;
        /// <summary>
        /// …a do tego mowa kończy się najpóźniej na pierwszej ciszy dłuższej niż `przerwaKonczy` s (cichszej niż `przerwaPonizej`
        /// dB pod najgłośniejszym miejscem nagrania): stuk albo urwany kawałek następnej kwestii na końcu pliku odpada, zamiast
        /// trzymać postać przy słowie przez sekundę ciszy. Krótsze przerwy w środku kwestii zostają (w bolR/rzadkie.mp3 jest 0,6 s).
        /// </summary>
        public double przerwaKonczy;
        public double przerwaPonizej;
    }

    public sealed partial class Typ_GLOSY_LUDU_wysokosc
    {
        public double? pobozny;
        public double? robotnik;
        public double? rycerz;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "pobozny", "robotnik", "rycerz" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — null.</summary>
        public double? this[string klucz] => klucz switch
        {
            "pobozny" => pobozny,
            "robotnik" => robotnik,
            "rycerz" => rycerz,
            _ => default!,
        };
    }

    public sealed partial class Typ_GLOSY_LUDU_rzadkie
    {
        public string nazwa;
        public double szansa;
    }

    public sealed partial class Typ_GLOSY_LUDU_waga
    {
        public double bol;
        public double atak;
        public double potwierdzenie;
        public double odmowa;
        public double glod;
    }

    public sealed partial class Typ_GLOSY_LUDU_potwierdzenie
    {
        public double opoznienie;
        public double odstep;
    }

    public sealed partial class Typ_GLOSY_LUDU_atak
    {
        public double przerwa;
        public double walkaTrwa;
        // w TS: 1 / 3
        public double nastepnySzansa;
    }

    public sealed partial class Typ_GLOSY_LUDU_bol
    {
        public double mocnyCo;
        public double slabyCo;
        public double slabySzansa;
    }

    public sealed partial class Typ_GLOSY_LUDU_glod
    {
        public double od;
        public double przymiera;
        public double syty;
        public double co;
        public double coPrzymiera;
    }
}
