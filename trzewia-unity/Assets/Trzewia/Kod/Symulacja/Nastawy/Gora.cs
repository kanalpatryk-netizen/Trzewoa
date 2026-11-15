// Wygenerowane z alpha-1/src/nastawy/gora.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/gora.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/gora.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyGora
    {
        /// <summary>
        /// GÓRA — zasoby gracza, sen (przegrana) i reguły całego świata.
        ///
        /// Zasoby: Krew (ze śmierci), Wiara (z modlitw), Otchłań (z tego, czego nikt
        /// nie pamięta). Sen 0..1: przy 1 góra zasypia i partia się kończy.
        /// </summary>
        public static Typ_GORA GORA = new Typ_GORA
        {
            startWiara = 30,
            startKrew = 60,
            wiaraMax = 200,
            krewMax = 150,
            otchlanNaKafel = 0.0035,
            zasklepianiePromien = 8,
            rozejmTikow = 2400,
            senOdDominacji = 0.62,
            senZakresDominacji = 0.38,
            senOdMonokultury = 0.000009,
            senPustkaPonizej = 10,
            senOdPustki = 0.000022,
            senCofaSie = 0.0005,
            koszmarKrew = 40,
            senProgi = new double[] { 0.25, 0.5, 0.8 },
            wojnaBudzi = 0.01,
            dochodOdDominacji = 0.6,
            dochodZakres = 0.35,
            dochodMin = 0.25,
            krewZaSmierc = 3,
            grzybniaZaSmierc = 1.5,
            modlitwaWiara = 0.005,
            modlitwaPrzyRdzeniu = 3,
            modlitwaPrzyZnaku = 2,
            modlitwaOddanie = 0.00004,
            modlitwaNaGlowe = 8,
            modlitwaIskra = 0.06,
            ofiaraWiek = 900,
            ofiaraZasieg = 8,
            ofiaraBrakKara = 0.02,
            ofiaraWiara = 14,
            ofiaraKrew = 6,
            ofiaraOddanie = 0.012,
            grzybniaStart = 60,
            grzybniaSpisCo = 40,
            grzybniaProby = 0.06,
            grzybniaProbyMin = 4,
            grzybniaProbyMax = 140,
            grzybniaMokro = 0.35,
            grzybniaSucho = 0.03,
            grzybniaKosztKosci = 0.5,
            grzybniaKoszt = 1,
            grzybniaStartProby = 900,
            grzybniaStartSucho = 0.25,
            grzybniaNaGlowe = 22,
            kronikaOkno = 900,
            kronikaDlugosc = 400,
            efektCud = 90,
            efektMysl = 140,
            efektInny = 40,
            efektObjawienie = 540,
            efektSzept = 300,
            efektSmierc = 130,
            efektowMax = 60,
            czasteczekMax = 900,
        };

        /// <summary>
        /// LUDY — nacje: jak powstają, rosną, pękają i stygną.
        /// Pola „zRasy” to [Ślepy Lud, Żużlowcy, Prządki, pozostali].
        /// </summary>
        public static Typ_LUDY LUDY = new Typ_LUDY
        {
            limitNacji = new Typ_LUDY_limitNacji
            {
                slepyLud = 60,
                zuzlowcy = 34,
                przadki = 20,
                inni = 8,
            },
            oddanieStart = new Typ_LUDY_oddanieStart
            {
                slepyLud = 0.5,
                zuzlowcy = 0.3,
                inni = 0.08,
            },
            oddanieNatura = new Typ_LUDY_oddanieNatura
            {
                slepyLud = 0.45,
                zuzlowcy = 0.3,
                inni = 0.08,
            },
            stygniecie = 0.002,
            urazyWygasaja = 0.004,
            odcien = 0.18,
            sufitRasy = new double[] { 180, 90, 24, 64, 9999, 0 },
            pojemnosc = new Typ_LUDY_pojemnosc
            {
                slepyLud = 14,
                slepyLudNaJedzenie = 0.15,
                zuzlowcy = 6,
                zuzlowcyNaKuznie = 9,
                przadki = 4,
                przadkiNaOfiare = 0.14,
                trole = 3,
                troleNaGrzybnie = 0.05,
            },
            ciasnotaOdUdzialu = 0.58,
            ciasnotaSila = 1.6,
            kosztOltarza = 2,
            kosztKuzni = 3,
            budowaZasieg = 13,
            kuzniaOgien = 4,
            oltarzOddanie = 0.03,
            kuzniaWiara = 6,
            wykuciKoszt = 3,
            wykuciMinOdstep = 300,
            wykuciOdstep = 1500,
            wykuciTlok = 0.95,
            wykuciWiek = 400,
            przerabianieSzansa = 0.35,
            przerabianieWiek = 300,
            przerabianieTlok = 0.95,
            jarzmoOddanie = 0.5,
            rozlamOdLimitu = 0.7,
            rozlamSzansa = 0.25,
            rozlamMaxNacji = 24,
            rozlamOdleglosc = 18,
            rozlamZabiera = 8,
            rozlamZasieg = 10,
            rozlamOddanieOd = 0.5,
            rozlamOddanieDo = 1.2,
            rozlamWarta = 20,
            prorokOddanie = 0.35,
            prorokOdcien = 0.25,
            prorokZabiera = 6,
            prorokZasieg = 12,
            trolSzalenstwo = 0.95,
            trolGlebokosc = 0.78,
            sektaSzansa = 0.5,
            sektaMinNacja = 6,
            sektaOddanie = 0.5,
            urazaNapastnik = 1,
            urazaOfiara = 2,
            urazaWojnaSwoich = 2,
            trolAtakGlod = 0.45,
            trolAtakStrach = 0.3,
            bojkaSzansa = 0.05,
            bojkaPelnaOd = 12,
        };

        /// <summary>Zasiedlenie nowej góry: kto, ilu i na jakiej głębokości (0..1).</summary>
        public static Typ_ZASIEDLENIE ZASIEDLENIE = new Typ_ZASIEDLENIE
        {
            slepyLud1 = new Typ_ZASIEDLENIE_slepyLud1
            {
                ilu = 14,
                od = 0.06,
                @do = 0.22,
            },
            slepyLud2 = new Typ_ZASIEDLENIE_slepyLud2
            {
                ilu = 12,
                od = 0.24,
                @do = 0.42,
            },
            zuzlowcy = new Typ_ZASIEDLENIE_zuzlowcy
            {
                ilu = 9,
                od = 0.45,
                @do = 0.66,
                doOgnia = 0.72,
            },
            trole = new Typ_ZASIEDLENIE_trole
            {
                ilu = 3,
                od = 0.55,
                @do = 0.8,
                odstep = 30,
            },
            przadki = new Typ_ZASIEDLENIE_przadki
            {
                ilu = 5,
                od = 0.3,
                @do = 0.5,
                bokOd = 24,
                bokRozrzut = 14,
            },
            dorosliDo = 0.3,
            wiedzaPromien = 16,
            wiedzaPlam = 6,
            wiedzaPlamaPromien = 7,
            spizarnia = 28,
            nakarmJedzenie = 26,
            nakarmGrzybnia = 240,
            nakarmGlod = 0.12,
        };

        /// <summary>PRZYPŁYWY — co przychodzi z zewnątrz: powodzie, zarazy, nowe plemiona.</summary>
        public static Typ_PRZYPLYWY PRZYPLYWY = new Typ_PRZYPLYWY
        {
            odstep = 2200,
            rozrzut = 1800,
            pierwszy = 2600,
            pustkaPonizej = 14,
            osadnicyOdstep = 6000,
            maxPrzybyszow = 10,
            obcyOdDominacji = 0.74,
            obcySzansa = 0.65,
            przadkiOfiar = 10,
            slepyLudPremia = 6,
            osadnicyOddanie = 0.3,
            osadnicyOddanieRozrzut = 0.3,
            osadnicySlepyLud = 8,
            osadnicyInni = 6,
            osadnicyRozrzut = 6,
            osadnicyWiek = 1200,
            zuzlowcyRuda = 6,
            osadnicySpizarnia = 10,
            obcySpizarnia = 8,
            obcyOddanie = 0.22,
            obcyOddanieRozrzut = 0.3,
            obcyIlu = 4,
            obcyRozrzut = 4,
            obcyWiek = 800,
            swiezeTikow = 3000,
            powodzOdstep = 14,
            powodzProby = 900,
            powodzGlebokosc = 12,
            zarazaOmijaCel = 0.4,
            zarazaOmija = 0.85,
            zarazaCel = 0.45,
            zaraza = 0.3,
            zylaOd = 0.6,
            zylaRozrzut = 0.3,
            zylaProby = 120,
        };
    }

    /// <summary>
    /// GÓRA — zasoby gracza, sen (przegrana) i reguły całego świata.
    ///
    /// Zasoby: Krew (ze śmierci), Wiara (z modlitw), Otchłań (z tego, czego nikt
    /// nie pamięta). Sen 0..1: przy 1 góra zasypia i partia się kończy.
    /// </summary>
    public sealed partial class Typ_GORA
    {
        /// <summary>
        /// --------------------------------------------------------------- start
        /// Z tyloma zasobami zaczynasz.
        /// </summary>
        public double startWiara;
        public double startKrew;
        /// <summary>
        /// WERSJA ANDROID: zasoby widać jako liczby, więc mają górny limit — inaczej po kilku minutach
        /// gracz miał dziesiątki tysięcy Wiary i każdy wybór na karcie wydarzenia był darmowy.
        /// </summary>
        public double wiaraMax;
        public double krewMax;
        /// <summary>
        /// ------------------------------------------------------------- otchłań
        /// Ile Otchłani daje jeden zapomniany kafel (wydanie jej zasklepia tyle samo).
        /// </summary>
        public double otchlanNaKafel;
        /// <summary>Zasklepianie nieznanego: promień jednej łaty.</summary>
        public double zasklepianiePromien;
        /// <summary>
        /// ------------------------------------------------------------- rozejm
        /// Przez tyle tików od startu nikt nikogo nie atakuje (pierwsze minuty bez rzezi).
        /// </summary>
        public double rozejmTikow;
        /// <summary>
        /// ----------------------------------------------------------------- sen
        /// Monokultura: sen zaczyna rosnąć, gdy jedna rasa ma więcej niż ten udział…
        /// </summary>
        public double senOdDominacji;
        /// <summary>…i rośnie najszybciej przy pełnej dominacji (zakres = 1 − próg).</summary>
        public double senZakresDominacji;
        /// <summary>Przyrost snu na tik przy pełnej monokulturze. WIĘCEJ = szybsza przegrana.</summary>
        public double senOdMonokultury;
        /// <summary>Pustka też usypia: poniżej tylu mieszkańców…</summary>
        public double senPustkaPonizej;
        /// <summary>…z takim przyrostem na tik przy zupełnie pustej górze.</summary>
        public double senOdPustki;
        /// <summary>Gdy nic nie usypia, sen cofa się o tyle na tik.</summary>
        public double senCofaSie;
        /// <summary>Koszmar (Remake v2 — jedyny poziom): tyle mniej Krwi na start (od LUD.krewStart).</summary>
        public double koszmarKrew;
        /// <summary>Progi, przy których dzwoni dzwon i kronika ostrzega.</summary>
        public double[] senProgi;
        /// <summary>Cudza wojna (nacja z twojego szeptu) cofa sen o tyle za każdą śmierć.</summary>
        public double wojnaBudzi;
        /// <summary>
        /// --------------------------------------------------------------- dochód
        /// Dochód spada, gdy dominacja przekracza to…
        /// </summary>
        public double dochodOdDominacji;
        /// <summary>…liniowo do zera na przestrzeni tylu punktów dominacji…</summary>
        public double dochodZakres;
        /// <summary>…ale nigdy poniżej tego mnożnika.</summary>
        public double dochodMin;
        /// <summary>
        /// --------------------------------------------------------- śmierć i krew
        /// Śmierć daje tyle Krwi × rozmiar rasy.
        /// </summary>
        public double krewZaSmierc;
        /// <summary>Śmierć karmi grzybnię: tyle kafli wzrostu × rozmiar rasy.</summary>
        public double grzybniaZaSmierc;
        /// <summary>
        /// ------------------------------------------------------------- modlitwa
        /// Modlitwa daje Wiarę: wiaraRasy × oddanie × to × mnożnik miejsca.
        /// </summary>
        public double modlitwaWiara;
        /// <summary>Mnożnik modlitwy przy rdzeniu i przy twoim znaku.</summary>
        public double modlitwaPrzyRdzeniu;
        public double modlitwaPrzyZnaku;
        /// <summary>Modlitwa podsyca oddanie nacji: to × wiaraRasy × (1 − oddanie) / max(`modlitwaNaGlowe`, liczebność).</summary>
        public double modlitwaOddanie;
        public double modlitwaNaGlowe;
        /// <summary>Szansa na iskrę modlitwy (czysto wizualne).</summary>
        public double modlitwaIskra;
        /// <summary>
        /// --------------------------------------------------------------- ofiara
        /// Ofiarą jest dziecko (młodsze niż tyle tików) w tym promieniu.
        /// </summary>
        public double ofiaraWiek;
        public double ofiaraZasieg;
        /// <summary>Bez dziecka pod ręką nacja traci tyle oddania.</summary>
        public double ofiaraBrakKara;
        /// <summary>Ofiara daje: Wiarę (× dochód), Krew, oddanie nacji.</summary>
        public double ofiaraWiara;
        public double ofiaraKrew;
        public double ofiaraOddanie;
        /// <summary>
        /// --------------------------------------------------------------- grzybnia
        /// Grzybnia startuje z takim zapasem wzrostu.
        /// </summary>
        public double grzybniaStart;
        /// <summary>Co ile tików przeliczamy kafle grzybni i kości.</summary>
        public double grzybniaSpisCo;
        /// <summary>Prób wzrostu na tik: część grzybni, obcięta do min–max.</summary>
        public double grzybniaProby;
        public double grzybniaProbyMin;
        public double grzybniaProbyMax;
        /// <summary>Szansa wzrostu na mokrym / suchym kaflu powietrza.</summary>
        public double grzybniaMokro;
        public double grzybniaSucho;
        /// <summary>Koszt wzrostu: na kościach / na pustym kaflu.</summary>
        public double grzybniaKosztKosci;
        public double grzybniaKoszt;
        /// <summary>Na start i przy nakarmieniu świata: prób zasiania grzybni i szansa na suchej podłodze.</summary>
        public double grzybniaStartProby;
        public double grzybniaStartSucho;
        /// <summary>Ile grzybni liczy się jako jeden „mieszkaniec” w spisie.</summary>
        public double grzybniaNaGlowe;
        /// <summary>
        /// ------------------------------------------------------------- kronika
        /// Ta sama linijka kroniki w tym oknie tików zagęszcza poprzednią.
        /// </summary>
        public double kronikaOkno;
        /// <summary>Kronika pamięta tyle wpisów.</summary>
        public double kronikaDlugosc;
        /// <summary>
        /// ------------------------------------------------------------- efekty
        /// Jak długo (tiki) trwają znaki w świecie: cud i skaza / myśl / reszta.
        /// </summary>
        public double efektCud;
        public double efektMysl;
        public double efektInny;
        /// <summary>Cud gracza (słup światła z góry) i szept (nić światła i znak nad głową) trwają dłużej — to twoje ręce.</summary>
        public double efektObjawienie;
        public double efektSzept;
        /// <summary>Śmierć: krew tryska i opada, nad miejscem krótki krzyżyk.</summary>
        public double efektSmierc;
        /// <summary>Najwięcej naraz.</summary>
        public double efektowMax;
        /// <summary>Najwięcej cząsteczek naraz.</summary>
        public double czasteczekMax;
    }

    /// <summary>
    /// LUDY — nacje: jak powstają, rosną, pękają i stygną.
    /// Pola „zRasy” to [Ślepy Lud, Żużlowcy, Prządki, pozostali].
    /// </summary>
    public sealed partial class Typ_LUDY
    {
        /// <summary>Górny limit liczebności nacji: Ślepy Lud / Żużlowcy / Prządki / reszta.</summary>
        public Typ_LUDY_limitNacji limitNacji;
        /// <summary>Oddanie nowej nacji: Ślepy Lud / Żużlowcy / reszta.</summary>
        public Typ_LUDY_oddanieStart oddanieStart;
        /// <summary>Do takiego oddania nacja wraca sama („natura”): Ślepy Lud / Żużlowcy / reszta.</summary>
        public Typ_LUDY_oddanieNatura oddanieNatura;
        /// <summary>Jak szybko oddanie wraca do natury (co 90 tików, ułamek różnicy). Na telefonie wolniej niż 0.004 na komputerze.</summary>
        public double stygniecie;
        /// <summary>Urazy między nacjami wygasają o tyle co 90 tików.</summary>
        public double urazyWygasaja;
        /// <summary>Odcień nacji losowany w tym zakresie ±.</summary>
        public double odcien;
        /// <summary>Twardy sufit liczebności rasy: [Ślepy Lud, Żużlowcy, Trole, Prządki, Ludzie, Grzybnia].</summary>
        public double[] sufitRasy;
        /// <summary>Pojemność środowiska (ile rasa wyżywi). WIĘCEJ = liczniejsza rasa.</summary>
        public Typ_LUDY_pojemnosc pojemnosc;
        /// <summary>Monokultura dusi się sama: powyżej takiego udziału w górze…</summary>
        public double ciasnotaOdUdzialu;
        /// <summary>…tłok rośnie × (1 + nadmiar × to).</summary>
        public double ciasnotaSila;
        /// <summary>Koszt budowy w rudzie: ołtarz (Ślepy Lud) / kuźnia (Żużlowcy).</summary>
        public double kosztOltarza;
        public double kosztKuzni;
        /// <summary>Plac budowy szukany w tym promieniu.</summary>
        public double budowaZasieg;
        /// <summary>Kuźnia musi mieć magmę w tym promieniu.</summary>
        public double kuzniaOgien;
        /// <summary>Ołtarz dodaje tyle oddania nacji.</summary>
        public double oltarzOddanie;
        /// <summary>Nowa kuźnia daje tyle Wiary (× dochód).</summary>
        public double kuzniaWiara;
        /// <summary>Wykuwanie Żużlowca: kosztuje tyle rudy…</summary>
        public double wykuciKoszt;
        /// <summary>…co najmniej co tyle tików…</summary>
        public double wykuciMinOdstep;
        /// <summary>…a przy jednej kuźni co tyle (dzielone przez liczbę kuźni).</summary>
        public double wykuciOdstep;
        /// <summary>Nie wykuwa, gdy tłok rasy przekracza to.</summary>
        public double wykuciTlok;
        /// <summary>Wykuty rodzi się w takim wieku (tiki).</summary>
        public double wykuciWiek;
        /// <summary>Prządki przerabiają niewolnika na swoją, z taką szansą (co 90 tików).</summary>
        public double przerabianieSzansa;
        /// <summary>Przerobiona zaczyna w takim wieku.</summary>
        public double przerabianieWiek;
        /// <summary>Nie przerabiają, gdy tłok Prządek przekracza to.</summary>
        public double przerabianieTlok;
        /// <summary>Jarzmo: wzięty traci taką część oddania.</summary>
        public double jarzmoOddanie;
        /// <summary>Rozłam: nacja pęka, gdy ma ponad taką część limitu…</summary>
        public double rozlamOdLimitu;
        /// <summary>…z taką szansą (co 240 tików)…</summary>
        public double rozlamSzansa;
        /// <summary>…o ile w górze żyje nie więcej niż tyle nacji.</summary>
        public double rozlamMaxNacji;
        /// <summary>Odchodzi ktoś dalej od gniazda niż to…</summary>
        public double rozlamOdleglosc;
        /// <summary>…i zabiera do tylu sąsiadów w tym promieniu.</summary>
        public double rozlamZabiera;
        public double rozlamZasieg;
        /// <summary>Nowa nacja dostaje oddanie starej × los od–do.</summary>
        public double rozlamOddanieOd;
        public double rozlamOddanieDo;
        /// <summary>Warta pod rdzeniem nie odchodzi przy rozłamie: pudło wokół rdzenia.</summary>
        public double rozlamWarta;
        /// <summary>Prorok (szept): nowa nacja ma oddanie starej + to…</summary>
        public double prorokOddanie;
        /// <summary>…inny odcień o tyle…</summary>
        public double prorokOdcien;
        /// <summary>…i zabiera do tylu wiernych w tym promieniu.</summary>
        public double prorokZabiera;
        public double prorokZasieg;
        /// <summary>Szaleniec zmienia się w trola przy szaleństwie &gt; to i głębokości &gt; to.</summary>
        public double trolSzalenstwo;
        public double trolGlebokosc;
        /// <summary>Odszczepieniec zakłada nową nację z szansą (o ile stara ma więcej niż tylu)…</summary>
        public double sektaSzansa;
        public double sektaMinNacja;
        /// <summary>…z oddaniem starej × to.</summary>
        public double sektaOddanie;
        /// <summary>Uraza: napastnik dostaje tyle, ofiara tyle.</summary>
        public double urazaNapastnik;
        public double urazaOfiara;
        /// <summary>Swoi (ta sama rasa) biją się dopiero przy urazie większej niż to.</summary>
        public double urazaWojnaSwoich;
        /// <summary>Trol atakuje, gdy głodny ponad to albo przestraszony ponad to.</summary>
        public double trolAtakGlod;
        public double trolAtakStrach;
        /// <summary>Obcy bez urazy biją się z szansą to × min(1, liczebność / `bojkaPelnaOd`).</summary>
        public double bojkaSzansa;
        public double bojkaPelnaOd;
    }

    public sealed partial class Typ_LUDY_limitNacji
    {
        public double slepyLud;
        public double zuzlowcy;
        public double przadki;
        public double inni;
    }

    public sealed partial class Typ_LUDY_oddanieStart
    {
        public double slepyLud;
        public double zuzlowcy;
        public double inni;
    }

    public sealed partial class Typ_LUDY_oddanieNatura
    {
        public double slepyLud;
        public double zuzlowcy;
        public double inni;
    }

    public sealed partial class Typ_LUDY_pojemnosc
    {
        /// <summary>Ślepy Lud: podstawa + jedzenie × to (kość liczy się podwójnie).</summary>
        public double slepyLud;
        public double slepyLudNaJedzenie;
        /// <summary>Żużlowcy: podstawa + kuźnie × to.</summary>
        public double zuzlowcy;
        public double zuzlowcyNaKuznie;
        /// <summary>Prządki: podstawa + ofiary (Ślepy Lud i Żużlowcy) × to.</summary>
        public double przadki;
        public double przadkiNaOfiare;
        /// <summary>Trole: podstawa + grzybnia × to.</summary>
        public double trole;
        public double troleNaGrzybnie;
    }

    /// <summary>Zasiedlenie nowej góry: kto, ilu i na jakiej głębokości (0..1).</summary>
    public sealed partial class Typ_ZASIEDLENIE
    {
        /// <summary>Pierwsza nacja Ślepego Ludu: ilu, głębokość od–do.</summary>
        public Typ_ZASIEDLENIE_slepyLud1 slepyLud1;
        /// <summary>Druga nacja Ślepego Ludu.</summary>
        public Typ_ZASIEDLENIE_slepyLud2 slepyLud2;
        /// <summary>Żużlowcy (szukają miejsca przy ogniu w paśmie od–doOgnia).</summary>
        public Typ_ZASIEDLENIE_zuzlowcy zuzlowcy;
        /// <summary>Trole: legowisko co najmniej tyle kafli od innych gniazd.</summary>
        public Typ_ZASIEDLENIE_trole trole;
        /// <summary>Prządki: w tej odległości (od–do) w bok od drugiej nacji Ślepego Ludu.</summary>
        public Typ_ZASIEDLENIE_przadki przadki;
        /// <summary>Część zastanego pokolenia jest dorosła: wiek losowy do tej części życia.</summary>
        public double dorosliDo;
        /// <summary>Znana okolica gniazda na start: promień i ile dodatkowych plam wiedzy.</summary>
        public double wiedzaPromien;
        public double wiedzaPlam;
        public double wiedzaPlamaPromien;
        /// <summary>Spiżarnia na start: tyle kafli jedzenia przy każdym gnieździe.</summary>
        public double spizarnia;
        /// <summary>Nakarmienie świata (samouczek): jedzenia na gniazdo, zapas grzybni, maks. głód.</summary>
        public double nakarmJedzenie;
        public double nakarmGrzybnia;
        public double nakarmGlod;
    }

    public sealed partial class Typ_ZASIEDLENIE_slepyLud1
    {
        public double ilu;
        public double od;
        public double @do;
    }

    public sealed partial class Typ_ZASIEDLENIE_slepyLud2
    {
        public double ilu;
        public double od;
        public double @do;
    }

    public sealed partial class Typ_ZASIEDLENIE_zuzlowcy
    {
        public double ilu;
        public double od;
        public double @do;
        public double doOgnia;
    }

    public sealed partial class Typ_ZASIEDLENIE_trole
    {
        public double ilu;
        public double od;
        public double @do;
        public double odstep;
    }

    public sealed partial class Typ_ZASIEDLENIE_przadki
    {
        public double ilu;
        public double od;
        public double @do;
        public double bokOd;
        public double bokRozrzut;
    }

    /// <summary>PRZYPŁYWY — co przychodzi z zewnątrz: powodzie, zarazy, nowe plemiona.</summary>
    public sealed partial class Typ_PRZYPLYWY
    {
        /// <summary>Kolejny przypływ za tyle tików + los do `rozrzut`.</summary>
        public double odstep;
        public double rozrzut;
        /// <summary>Pierwszy przypływ po tylu tikach.</summary>
        public double pierwszy;
        /// <summary>Nowe plemię schodzi, gdy żyje mniej niż tylu…</summary>
        public double pustkaPonizej;
        /// <summary>…ale nie częściej niż co tyle tików…</summary>
        public double osadnicyOdstep;
        /// <summary>…i najwyżej tyle razy na partię.</summary>
        public double maxPrzybyszow;
        /// <summary>Przy dominacji ponad to góra ściąga obcy lud z głębi, z taką szansą.</summary>
        public double obcyOdDominacji;
        public double obcySzansa;
        /// <summary>Prządki przychodzą tylko, gdy ofiar (Ślepy Lud + Żużlowcy) jest co najmniej tyle.</summary>
        public double przadkiOfiar;
        /// <summary>Ślepy Lud i tak się rodzi: przy wyborze plemienia liczy się jako o tylu liczniejszy.</summary>
        public double slepyLudPremia;
        /// <summary>Nowe plemię: oddanie od + los do rozrzutu.</summary>
        public double osadnicyOddanie;
        public double osadnicyOddanieRozrzut;
        /// <summary>Nowe plemię: ilu (Ślepy Lud / inni) + los do rozrzutu.</summary>
        public double osadnicySlepyLud;
        public double osadnicyInni;
        public double osadnicyRozrzut;
        /// <summary>Wiek przybyszów losowy do tylu tików.</summary>
        public double osadnicyWiek;
        /// <summary>Żużlowcy przynoszą tyle rudy na pierwszą kuźnię.</summary>
        public double zuzlowcyRuda;
        /// <summary>Spiżarnia przy nowym plemieniu / obcym ludzie.</summary>
        public double osadnicySpizarnia;
        public double obcySpizarnia;
        /// <summary>Obcy lud: oddanie od + rozrzut, ilu + rozrzut, wiek do.</summary>
        public double obcyOddanie;
        public double obcyOddanieRozrzut;
        public double obcyIlu;
        public double obcyRozrzut;
        public double obcyWiek;
        /// <summary>Powódź: świeże plemiona (młodsze niż tyle tików) są oszczędzane w tym odstępie.</summary>
        public double swiezeTikow;
        public double powodzOdstep;
        /// <summary>Powódź: tyle prób zalania, w pasie tylu kafli pod powierzchnią.</summary>
        public double powodzProby;
        public double powodzGlebokosc;
        /// <summary>Zaraza omija dominującą rasę z szansą (celowana) / resztę z szansą (niecelowana).</summary>
        public double zarazaOmijaCel;
        public double zarazaOmija;
        /// <summary>Zaraza zabiera taką część zdrowia: celowanym / reszcie.</summary>
        public double zarazaCel;
        public double zaraza;
        /// <summary>Żyła szaleństwa: głębokość od + rozrzut, ile prób.</summary>
        public double zylaOd;
        public double zylaRozrzut;
        public double zylaProby;
    }
}
