// Wygenerowane z alpha-1/src/nastawy/swiat.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/swiat.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/swiat.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawySwiat
    {
        /// <summary>
        /// ŚWIAT — wymiary góry i przepis na jej wygenerowanie.
        ///
        /// Jednostka: kafel. Głębokość „0..1” to ułamek drogi od powierzchni do dna
        /// (0 = pod trawą, 1 = samo dno). Zmiana wymiarów psuje stare zapisy gry.
        /// </summary>
        public static Typ_SWIAT SWIAT = new Typ_SWIAT
        {
            szerokosc = 192,
            wysokosc = 240,
            powierzchnia = 14,
            pamiecTikow = 9000,
            falowaniePowierzchni = 4,
            gruboscZiemi = 6,
            ziemiaDoGlebokosci = 0.22,
            szansaNaZiemie = 0.4,
            jaskinie = new Typ_SWIAT_jaskinie
            {
                prog = 0.6,
                falowanie = 0.1,
                ubytekWGlebi = 0.04,
                progDrugi = 0.4,
            },
            komory = new Typ_SWIAT_komory
            {
                ile = 10,
                szerokoscOd = 5,
                szerokoscDo = 13,
                wysokoscOd = 4,
                wysokoscDo = 9,
            },
            wejscia = new Typ_SWIAT_wejscia
            {
                ile = 5,
                doGlebokosci = 0.4,
                szansaUrwania = 0.06,
            },
            rudy = new Typ_SWIAT_rudy
            {
                prog = 0.7,
                latwiejWGlebi = 0.1,
                szansa = 0.3,
                szansaWGlebi = 0.5,
                krysztalyOd = 0.62,
                krysztalyProg = 0.74,
                krysztalySzansa = 0.45,
            },
            plyny = false,
            sale = new Typ_SWIAT_sale
            {
                ile = 13,
                odPowierzchni = 12,
                doGlebokosci = 0.76,
                szerokoscOd = 10,
                szerokoscDo = 22,
                wysokoscOd = 5,
                wysokoscDo = 10,
                poszarpanie = 0.55,
                podloga = 0.55,
                filarCo = 11,
                naciekiNaKafel = 0.35,
            },
            galerie = new Typ_SWIAT_galerie
            {
                promienOd = 1.3,
                promienDo = 2.6,
                krety = 1.6,
                drugaSzansa = 0.45,
                najdluzsza = 70,
            },
            kominy = new Typ_SWIAT_kominy
            {
                ile = 7,
                promien = 1.4,
                dlugoscOd = 10,
                dlugoscDo = 26,
            },
            groty = new Typ_SWIAT_groty
            {
                ile = 8,
                od = 0.74,
                pas = 0.16,
                szerokoscOd = 6,
                szerokoscDo = 14,
                wysokoscOd = 2.5,
                wysokoscDo = 5,
            },
            warstwy = new Typ_SWIAT_warstwy
            {
                wlaczone = true,
                rama = 4,
                plytkaDo = 0.34,
                srodkowaDo = 0.68,
                falowanie = 4,
                ziemia = 2,
                szyb = 3,
                sala = new Typ_SWIAT_warstwy_sala
                {
                    rx = 17,
                    ry = 5,
                    dnoPod = 24,
                },
                szybWiadra = new Typ_SWIAT_warstwy_szybWiadra
                {
                    dx = 7,
                    szer = 1,
                },
                oltarz = new Typ_SWIAT_warstwy_oltarz
                {
                    kopczykSzer = 5,
                    kopczykGleb = 8,
                    podlogaRzedow = 2,
                    wyjscie = 3,
                },
                zelazo = new Typ_SWIAT_warstwy_zelazo
                {
                    plytka = 26,
                    srodkowa = 9,
                    promienOd = 1.1,
                    promienDo = 2.4,
                },
                jaskinie = new Typ_SWIAT_warstwy_jaskinie
                {
                    ile = 15,
                    rxOd = 4,
                    rxDo = 9,
                    ryOd = 1.8,
                    ryDo = 3.4,
                    zlotoSzansa = 0.75,
                    zlotoOd = 3,
                    zlotoDo = 7,
                },
                kieszenie = new Typ_SWIAT_warstwy_kieszenie
                {
                    plytka = 9,
                    gleboka = 7,
                    rxOd = 2.5,
                    rxDo = 5.5,
                    ryOd = 1.2,
                    ryDo = 2.4,
                },
                drogaWiernych = new Typ_SWIAT_warstwy_drogaWiernych
                {
                    szer = 5,
                    wneka = 2,
                    kucieSzybciej = 2.5,
                },
                kucie = 8,
            },
            osypywanieNaStart = 160,
            splywaniePrzedZasiedleniem = 900,
        };

        /// <summary>
        /// RDZEŃ I SKORUPA — cel gry, zapisany w geometrii góry.
        /// Wszystkie odległości liczone w kaflach od środka rdzenia.
        /// </summary>
        public static Typ_RDZEN RDZEN = new Typ_RDZEN
        {
            nadDnem = 14,
            skorupaX = 14,
            skorupaY = 11,
            komoraX = 8.5,
            komoraY = 4.5,
            promien = 2.6,
            przedsionekNad = 14,
            przedsionekX = 6,
            przedsionekY = 4,
            suchaStrefa = 12,
            progSuchejStrefy = 1.5,
        };
    }

    /// <summary>
    /// ŚWIAT — wymiary góry i przepis na jej wygenerowanie.
    ///
    /// Jednostka: kafel. Głębokość „0..1” to ułamek drogi od powierzchni do dna
    /// (0 = pod trawą, 1 = samo dno). Zmiana wymiarów psuje stare zapisy gry.
    /// </summary>
    public sealed partial class Typ_SWIAT
    {
        /// <summary>Szerokość góry w kaflach (Alpha: odrobinę szersza niż w Remake v2 — tam 176).</summary>
        public double szerokosc;
        /// <summary>Wysokość góry w kaflach.</summary>
        public double wysokosc;
        /// <summary>Na której linii (od góry) zaczyna się ziemia. Nad nią jest niebo.</summary>
        public double powierzchnia;
        /// <summary>Po tylu tikach bez niczyjego spojrzenia rysunek kafla blaknie w pusty papier.</summary>
        public double pamiecTikow;
        /// <summary>Linia powierzchni faluje: tyle kafli w górę i w dół od średniej.</summary>
        public double falowaniePowierzchni;
        /// <summary>Pod powierzchnią leży tyle kafli miękkiej ziemi, zanim zacznie się skała.</summary>
        public double gruboscZiemi;
        /// <summary>Do tej głębokości (0..1) skała bywa przemieszana z ziemią…</summary>
        public double ziemiaDoGlebokosci;
        /// <summary>…z taką szansą na kafel.</summary>
        public double szansaNaZiemie;
        public Typ_SWIAT_jaskinie jaskinie;
        public Typ_SWIAT_komory komory;
        public Typ_SWIAT_wejscia wejscia;
        public Typ_SWIAT_rudy rudy;
        /// <summary>
        /// Remake v1: w górze nie ma wody ani lawy. Zamiast nich rozległe jaskinie:
        /// sale, galerie między nimi, kominy i groty w głębi.
        /// </summary>
        public bool plyny;
        public Typ_SWIAT_sale sale;
        public Typ_SWIAT_galerie galerie;
        public Typ_SWIAT_kominy kominy;
        public Typ_SWIAT_groty groty;
        /// <summary>
        /// Alpha, etap 3 — góra według szkicu: z powierzchni jeden szyb, którym zjeżdża jedzenie, do jasnej sali
        /// z siedzibą na środku u góry; dookoła gruba skała nie do ruszenia; niżej trzy warstwy — płytka (miękka
        /// skała, żyły żelaza), środkowa (zwykła skała, małe jaskinie ze złotem pod dnem), głęboka (twarda skała,
        /// mrok); rdzeń zawsze w tym samym miejscu: na środku u dołu, pod szeroką kryptą. Zamiast wielkich sal
        /// i galerii — małe kieszenie: drogę w dół trzeba wykuć. `wlaczone: false` przywraca dawną górę z Remake v2.
        /// </summary>
        public Typ_SWIAT_warstwy warstwy;
        /// <summary>Ile tików osypywania ziemi przed pierwszą klatką.</summary>
        public double osypywanieNaStart;
        /// <summary>Dodatkowe spływanie płynów w nowej grze, zanim zasiedlimy gniazda (bez płynów nic nie robi).</summary>
        public double splywaniePrzedZasiedleniem;
    }

    public sealed partial class Typ_SWIAT_jaskinie
    {
        /// <summary>Próg szumu: wyżej = mniej jaskiń. Remake v1: drobnych dziur mniej — kształt góry robią sale i galerie.</summary>
        public double prog;
        /// <summary>Jak mocno próg faluje z głębokością (warstwy gęstsze i rzadsze).</summary>
        public double falowanie;
        /// <summary>Ile progu ubywa na dnie — głęboko jaskiń jest więcej.</summary>
        public double ubytekWGlebi;
        /// <summary>Drugi szum, który tnie jaskinie na osobne kieszenie.</summary>
        public double progDrugi;
    }

    public sealed partial class Typ_SWIAT_komory
    {
        /// <summary>Ile wielkich pustek, w których siadają gniazda.</summary>
        public double ile;
        /// <summary>Promień poziomy komory: od–do.</summary>
        public double szerokoscOd;
        public double szerokoscDo;
        /// <summary>Promień pionowy komory: od–do.</summary>
        public double wysokoscOd;
        public double wysokoscDo;
    }

    public sealed partial class Typ_SWIAT_wejscia
    {
        /// <summary>Ile korytarzy prowadzi z powierzchni w głąb.</summary>
        public double ile;
        /// <summary>Korytarz schodzi najwyżej do tej głębokości (ułamek wysokości góry).</summary>
        public double doGlebokosci;
        /// <summary>Szansa, że korytarz urwie się na danym kroku.</summary>
        public double szansaUrwania;
    }

    public sealed partial class Typ_SWIAT_rudy
    {
        /// <summary>Próg szumu rudy na powierzchni; niżej próg spada o `latwiejWGlebi`.</summary>
        public double prog;
        public double latwiejWGlebi;
        /// <summary>Szansa na rudę w żyle: bazowa + przyrost z głębokością.</summary>
        public double szansa;
        public double szansaWGlebi;
        /// <summary>Kryształy szaleństwa zaczynają się poniżej tej głębokości…</summary>
        public double krysztalyOd;
        /// <summary>…przy tym progu szumu…</summary>
        public double krysztalyProg;
        /// <summary>…z szansą rosnącą z głębokością (głębokość × ta liczba).</summary>
        public double krysztalySzansa;
    }

    public sealed partial class Typ_SWIAT_sale
    {
        /// <summary>Ile wielkich sal od pierwszej warstwy skały w głąb.</summary>
        public double ile;
        /// <summary>Pierwsza sala tyle kafli pod powierzchnią; ostatnia na tej części wysokości góry.</summary>
        public double odPowierzchni;
        public double doGlebokosci;
        /// <summary>Promień poziomy i pionowy sali: od–do.</summary>
        public double szerokoscOd;
        public double szerokoscDo;
        public double wysokoscOd;
        public double wysokoscDo;
        /// <summary>Jak bardzo brzeg sali jest poszarpany (0 = gładka elipsa).</summary>
        public double poszarpanie;
        /// <summary>Dno sali: część promienia pionowego pod środkiem (płaska podłoga).</summary>
        public double podloga;
        /// <summary>Filar mniej więcej co tyle kafli szerokości sali.</summary>
        public double filarCo;
        /// <summary>Nacieki (stalaktyty i stalagmity) na kafel szerokości.</summary>
        public double naciekiNaKafel;
    }

    public sealed partial class Typ_SWIAT_galerie
    {
        /// <summary>Promień korytarza od–do (kafle).</summary>
        public double promienOd;
        public double promienDo;
        /// <summary>Jak bardzo korytarz się wije (radiany odchylenia).</summary>
        public double krety;
        /// <summary>Szansa, że sala łączy się jeszcze z drugą najbliższą.</summary>
        public double drugaSzansa;
        /// <summary>Dłuższych połączeń nie kopie (kafle).</summary>
        public double najdluzsza;
    }

    public sealed partial class Typ_SWIAT_kominy
    {
        /// <summary>Ile pionowych szybów z sal w dół; ich promień i długość od–do.</summary>
        public double ile;
        public double promien;
        public double dlugoscOd;
        public double dlugoscDo;
    }

    public sealed partial class Typ_SWIAT_groty
    {
        /// <summary>Niskie, szerokie groty w głębi (tam, gdzie dawniej było jezioro magmy).</summary>
        public double ile;
        public double od;
        public double pas;
        public double szerokoscOd;
        public double szerokoscDo;
        public double wysokoscOd;
        public double wysokoscDo;
    }

    public sealed partial class Typ_SWIAT_warstwy
    {
        public bool wlaczone;
        /// <summary>Gruba rama nie do ruszenia po bokach i na dnie (kafle).</summary>
        public double rama;
        /// <summary>Granice warstw (głębokość 0..1) i jak bardzo falują (kafle).</summary>
        public double plytkaDo;
        public double srodkowaDo;
        public double falowanie;
        /// <summary>Pod samą powierzchnią tyle rzędów ziemi (osypuje się), a pod nią czapa skały nie do ruszenia aż do sali.</summary>
        public double ziemia;
        /// <summary>Szyb z jedzeniem: szerokość (kafle); sala startowa pod nim: promienie i głębokość jej dna pod powierzchnią.</summary>
        public double szyb;
        public Typ_SWIAT_warstwy_sala sala;
        /// <summary>
        /// Alpha, etap 3d (szkic Pawła): przez szyb nad środkiem sali wpada światło dzienne na ołtarz; jedzenie zjeżdża
        /// drugim, węższym otworem — tyle kafli na prawo, tej szerokości.
        /// </summary>
        public Typ_SWIAT_warstwy_szybWiadra szybWiadra;
        /// <summary>
        /// Ołtarz na środku sali, pod szybem ze światłem. Pod nim kamienny kopczyk nie do ruszenia (szerokość, głębokość),
        /// a podłoga sali jest z kamienia na tyle rzędów — nikt nie podkopie ołtarza ani nie przetnie dołem drogi do niego.
        /// Na końcach sali `wyjscie` kafli podłogi zostaje do kucia — tamtędy schodzi się w głąb.
        /// </summary>
        public Typ_SWIAT_warstwy_oltarz oltarz;
        /// <summary>Żyły żelaza (kępy rudy): ile w płytkiej i środkowej warstwie, promień od–do.</summary>
        public Typ_SWIAT_warstwy_zelazo zelazo;
        /// <summary>Małe jaskinie środkowej warstwy: ile, promienie od–do; pod dnem — złoto z taką szansą, tyle kafli szerokie.</summary>
        public Typ_SWIAT_warstwy_jaskinie jaskinie;
        /// <summary>Kieszenie w płytkiej i głębokiej warstwie (mniejsze, bez złota).</summary>
        public Typ_SWIAT_warstwy_kieszenie kieszenie;
        /// <summary>
        /// (krypta nad rdzeniem — od 6.11 loch za stalową bramą: nastawy/loch.ts, LOCH.loch)
        ///
        /// Droga wiernych (propozycja Pawła, 25.10): nie wąski korytarz, tylko szyb jak pomieszczenie — tylu kafli szeroki,
        /// od lewej krawędzi sali w dół (6.11: z zakrętem przez komnatę z kotłem — nastawy/loch.ts, LOCH.zakret). U jego szczytu, przy podłodze sali, od początku jest pusta
        /// wnęka (tyle rzędów) — tam zaczyna się kopać. Wykutym szybem chodzi się w górę i w dół po drabinie, a schody
        /// stawia się w nim od dołu, gdy odcinek jest wykopany (6.11: sim/budowa-schodow.ts); kafle szybu kuje się
        /// `kucieSzybciej` razy szybciej niż zwykłą skałę — szyb jest szerszy
        /// od dawnej drogi (ok. 335 kafli; szyb 5 × 178 ≈ 890), a zejście ma trwać tyle co przedtem.
        /// </summary>
        public Typ_SWIAT_warstwy_drogaWiernych drogaWiernych;
        /// <summary>
        /// Tempo kucia: lud kuje skałę tyle razy wolniej niż w dawnej górze — zejście przez trzy warstwy to droga,
        /// nie minuta (w Remake v2 robotnik wybijał kafel skały w 0,2 s). Planer drogi liczy koszty po staremu.
        /// </summary>
        public double kucie;
    }

    public sealed partial class Typ_SWIAT_warstwy_sala
    {
        public double rx;
        public double ry;
        public double dnoPod;
    }

    public sealed partial class Typ_SWIAT_warstwy_szybWiadra
    {
        public double dx;
        public double szer;
    }

    public sealed partial class Typ_SWIAT_warstwy_oltarz
    {
        public double kopczykSzer;
        public double kopczykGleb;
        public double podlogaRzedow;
        public double wyjscie;
    }

    public sealed partial class Typ_SWIAT_warstwy_zelazo
    {
        public double plytka;
        public double srodkowa;
        public double promienOd;
        public double promienDo;
    }

    public sealed partial class Typ_SWIAT_warstwy_jaskinie
    {
        public double ile;
        public double rxOd;
        public double rxDo;
        public double ryOd;
        public double ryDo;
        public double zlotoSzansa;
        public double zlotoOd;
        public double zlotoDo;
    }

    public sealed partial class Typ_SWIAT_warstwy_kieszenie
    {
        public double plytka;
        public double gleboka;
        public double rxOd;
        public double rxDo;
        public double ryOd;
        public double ryDo;
    }

    public sealed partial class Typ_SWIAT_warstwy_drogaWiernych
    {
        public double szer;
        public double wneka;
        public double kucieSzybciej;
    }

    /// <summary>
    /// RDZEŃ I SKORUPA — cel gry, zapisany w geometrii góry.
    /// Wszystkie odległości liczone w kaflach od środka rdzenia.
    /// </summary>
    public sealed partial class Typ_RDZEN
    {
        /// <summary>Rdzeń leży tyle kafli nad dnem góry.</summary>
        public double nadDnem;
        /// <summary>Skorupa z nieprzekopywalnego kamienia: promienie elipsy (poziomy, pionowy).</summary>
        public double skorupaX;
        public double skorupaY;
        /// <summary>Komora wokół rdzenia wewnątrz skorupy. Kto przez otwartą skorupę stanie w komorze, dotarł do rdzenia.</summary>
        public double komoraX;
        public double komoraY;
        /// <summary>Promień samego rdzenia.</summary>
        public double promien;
        /// <summary>Przedsionek — jaskinia nad skorupą, w której modli się warta. Tyle kafli nad rdzeniem:</summary>
        public double przedsionekNad;
        /// <summary>Rozmiar przedsionka (promienie elipsy).</summary>
        public double przedsionekX;
        public double przedsionekY;
        /// <summary>Sucha strefa wokół przedsionka: promień bez wody, magmy i kryształów.</summary>
        public double suchaStrefa;
        /// <summary>Grubość obrzeża suchej strefy, przez które nie przepływają płyny.</summary>
        public double progSuchejStrefy;
    }
}
