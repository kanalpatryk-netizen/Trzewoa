// Wygenerowane z alpha-1/src/nastawy/dlon.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/dlon.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/dlon.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyDlon
    {
        /// <summary>
        /// DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar) — rzadkie wydarzenie: pod kimś z ludu porusza się
        /// otchłań, z głębi w dole wznosi się ogromna dłoń, chwyta jedną albo dwie postacie i cofa się
        /// z nimi w dół, w ciemność. Cud rzucony przy nich, zanim dłoń chwyci, odpycha ją.
        /// Kod: src/sim/dlon.ts, rysunek: src/render/dlon.ts.
        ///
        /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
        /// </summary>
        public static Typ_DLON DLON = new Typ_DLON
        {
            wlaczona = true,
            pierwszaPo = 43200,
            losujCo = 3600,
            szansa = 0.035,
            przerwa = 57600,
            maxNaPartie = 2,
            minLudu = 8,
            odObozu = 10,
            otchlanPromien = 10,
            otchlanMin = 30,
            glebia = 16,
            pochylenie = 0.45,
            odKrawedzi = 22,
            drugiDo = 3.5,
            drugiSzansa = 0.6,
            wstaje = 420,
            siega = 240,
            chwyta = 80,
            cofa = 260,
            gasnie = 220,
            cudPromien = 12,
            wielkosc = 2.05,
            lunaPromien = 6,
            lina = new Typ_DLON_lina
            {
                pierwszaPo = 36000,
                losujCo = 3600,
                szansa = 0.08,
                przerwa = 43200,
                maxNaPartie = 3,
                bok = 1.6,
            },
            demon = new Typ_DLON_demon
            {
                wlaczona = true,
                pierwszaPo = 300,
                przerwa = 720,
                wielkosc = new Typ_DLON_demon_wielkosc
                {
                    rzut = 1.6,
                    tarcza = 1.5,
                    zawal = 1.6,
                },
                wagi = new Typ_DLON_demon_wagi
                {
                    rzut = 2,
                    tarcza = 1,
                    zawal = 1.5,
                },
                rzut = new Typ_DLON_demon_rzut
                {
                    wstaje = 70,
                    chwyta = 55,
                    unosi = 50,
                    rzuca = 24,
                    cofa = 90,
                    wysokosc = 13,
                    wBok = 0.12,
                    grawitacja = 0.012,
                    rana = 0.1,
                    ogluszenie = 300,
                    zasieg = 4.5,
                },
                tarcza = new Typ_DLON_demon_tarcza
                {
                    wstaje = 80,
                    stoi = 600,
                    cofa = 80,
                    przedDemonem = 2.2,
                    zasieg = 10,
                    odrzut = 0.35,
                },
                zawal = new Typ_DLON_demon_zawal
                {
                    wstaje = 70,
                    drze = 80,
                    wali = 30,
                    cofa = 70,
                    trwa = 1800,
                    kruszy = 150,
                    szer = 2,
                    minOdstep = 5,
                    maxOdstep = 16,
                    maxWys = 10,
                    zrastanie = 3,
                    maxRoznicaWys = 4,
                },
            },
        };
    }

    /// <summary>
    /// DŁOŃ Z OTCHŁANI (Remake v1, tylko Koszmar) — rzadkie wydarzenie: pod kimś z ludu porusza się
    /// otchłań, z głębi w dole wznosi się ogromna dłoń, chwyta jedną albo dwie postacie i cofa się
    /// z nimi w dół, w ciemność. Cud rzucony przy nich, zanim dłoń chwyci, odpycha ją.
    /// Kod: src/sim/dlon.ts, rysunek: src/render/dlon.ts.
    ///
    /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
    /// </summary>
    public sealed partial class Typ_DLON
    {
        /// <summary>Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy).</summary>
        public bool wlaczona;
        /// <summary>Najwcześniej po tylu tikach partii (6 min)…</summary>
        public double pierwszaPo;
        /// <summary>…potem co tyle tików los (co 30 s)…</summary>
        public double losujCo;
        /// <summary>…z taką szansą — rzadko: średnio raz na ~14 minut, gdy jest kogo zabrać (w co trzeciej, czwartej partii).</summary>
        public double szansa;
        /// <summary>Po wydarzeniu (także odpędzonym) cisza na tyle tików (8 min).</summary>
        public double przerwa;
        /// <summary>Najwięcej razy w jednej partii.</summary>
        public double maxNaPartie;
        /// <summary>Nie przychodzi, gdy ludu jest mniej niż tylu — nie dobija ostatnich.</summary>
        public double minLudu;
        /// <summary>
        /// ---------------------------------------------------------------- kogo
        /// Ofiara stoi co najmniej tyle kafli od siedziby i obozów (tam jest światło)…
        /// </summary>
        public double odObozu;
        /// <summary>…a pod nią zaczyna się otchłań (nieznane): tyle kafli w dół do obejrzenia (w pasie ±6 kafli)…</summary>
        public double otchlanPromien;
        /// <summary>…i co najmniej tyle nieznanych kafli w tym pasie.</summary>
        public double otchlanMin;
        /// <summary>Z jakiej głębi pod ofiarą wznosi się dłoń (kafle) i jak bardzo może się pochylić w bok (część pionu).</summary>
        public double glebia;
        public double pochylenie;
        /// <summary>Ofiara stoi co najmniej tyle kafli od lewej i prawej krawędzi świata (żeby kamera mogła pokazać całość).</summary>
        public double odKrawedzi;
        /// <summary>Drugi zabrany: ktoś z ludu najdalej tyle kafli od pierwszego — z taką szansą.</summary>
        public double drugiDo;
        public double drugiSzansa;
        /// <summary>
        /// ---------------------------------------------------------------- przebieg (tiki)
        /// Dłoń wznosi się z głębi (ofiary stoją jak wryte), sięga, zaciska się, cofa w dół, łuna gaśnie.
        /// </summary>
        public double wstaje;
        public double siega;
        public double chwyta;
        public double cofa;
        public double gasnie;
        /// <summary>Cud bliżej niż tyle kafli od ofiary albo brzegu otchłani pod nią, zanim dłoń chwyci, odpycha ją.</summary>
        public double cudPromien;
        /// <summary>
        /// ---------------------------------------------------------------- wygląd (kafle)
        /// Wielkość dłoni (mnożnik; 1 = dłoń od nadgarstka po szpony ok. 5,4 kafla, a postać ma ok. 2,5).
        /// </summary>
        public double wielkosc;
        /// <summary>Czerwona łuna otchłani pod ofiarą: promień (kafle).</summary>
        public double lunaPromien;
        /// <summary>
        /// ---------------------------------------------------------------- Alpha, etap 4: lina wiadra
        ///
        /// Dłoń wznosi się spod podłogi sali przy wiadrze i przecina pazurem linę, na której zjeżdża jedzenie
        /// (sim/lina-wiadra.ts). Tylko w Koszmarze (decyzja użytkownika 18.10; w Alphie Koszmar jest zawsze). Nie patrzy na to,
        /// ilu jest ludu (`minLudu` dotyczy tylko chwytania). Najwcześniej po `pierwszaPo` tikach (5 min), potem co `losujCo`
        /// los z szansą `szansa` (średnio raz na ok. 6 min, gdy wiadro jest w szybie), po każdym razie cisza `przerwa`
        /// (6 min), najwyżej `maxNaPartie` razy. `bok` — o ile kafli w bok od liny przebija się przez podłogę.
        /// </summary>
        public Typ_DLON_lina lina;
        /// <summary>
        /// ---------------------------------------------------------------- Alpha, etap 5b: dłoń pomaga demonowi
        ///
        /// W walce z demonem z Wielkiego Pomnika (sim/dlon-demona.ts) dłoń z otchłani mu pomaga — każdą akcją inaczej
        /// (decyzja użytkownika 18.10: „chwyta rycerza i daje go kilkanaście metrów do góry, zasłania bossa, może zawalić szyb”;
        /// „każda akcja tej ręki ma mieć inną animację”). Pierwsza akcja po `pierwszaPo` tikach walki, potem co `przerwa`.
        /// `wielkosc` — osobno dla każdej akcji (krypta jest niska). `wagi` — jak często która akcja, gdy ma sens.
        /// </summary>
        public Typ_DLON_demon demon;
    }

    public sealed partial class Typ_DLON_lina
    {
        public double pierwszaPo;
        public double losujCo;
        public double szansa;
        public double przerwa;
        public double maxNaPartie;
        public double bok;
    }

    public sealed partial class Typ_DLON_demon
    {
        public bool wlaczona;
        public double pierwszaPo;
        public double przerwa;
        public Typ_DLON_demon_wielkosc wielkosc;
        public Typ_DLON_demon_wagi wagi;
        /// <summary>
        /// Rzut: spod podłogi pod rycerzem wyrasta dłoń, obejmuje go palcami (nie pięścią), unosi i ciska w górę i w bok, z dala
        /// od demona — na wysokość do `wysokosc` kafli (strop krypty go zatrzyma) i `wBok` kafla na tik w bok. Spadając rani
        /// (`rana` × życie) i ogłusza na `ogluszenie` tików. Tylko gdy rycerz stoi najwyżej `zasieg` kafli od demona.
        /// </summary>
        public Typ_DLON_demon_rzut rzut;
        /// <summary>
        /// Tarcza: między rycerzem a demonem wyrasta z podłogi otwarta dłoń, wnętrzem do rycerza, palce rozczapierzone jak mur.
        /// Póki stoi (`stoi` tików), demona nic nie rani — ciosy odbijają się od dłoni i odrzucają rycerza. Stoi `przedDemonem`
        /// kafla przed demonem; tylko gdy rycerz jest najwyżej `zasieg` kafli od niego.
        /// </summary>
        public Typ_DLON_demon_tarcza tarcza;
        /// <summary>
        /// Zawał: między rycerzem a demonem (co najmniej `minOdstep` kafli od siebie) dłoń przebija się przez strop, szpony drą
        /// skałę, płaskie uderzenie — i strop się zawala: ściana gruzu na `szer` kafli, od podłogi do stropu (najwyżej `maxWys`).
        /// Gruz trzyma `trwa` tików (robotnicy mogą go rozkuć wcześniej), potem się kruszy (`kruszy` tików). Póki stoi, demon
        /// jest odcięty: nie przechodzi na drugą stronę i zrasta się szybciej (× `zrastanie`).
        ///
        /// Alpha 1 (5.11): `maxRoznicaWys` — zawał tylko, gdy rycerz stoi przy demonie, najwyżej tyle kafli wyżej albo niżej.
        /// Wcześniej liczył się tylko odstęp w poziomie, a ściana stawała na wysokości rycerza: przy drodze wiernych jako
        /// pionowym szybie rycerz w sali był „obok” demona i gruz zamurowywał salę — rycerz nie mógł zejść, walka stała.
        /// </summary>
        public Typ_DLON_demon_zawal zawal;
    }

    public sealed partial class Typ_DLON_demon_wielkosc
    {
        public double? rzut;
        public double? tarcza;
        public double? zawal;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "rzut", "tarcza", "zawal" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — null.</summary>
        public double? this[string klucz] => klucz switch
        {
            "rzut" => rzut,
            "tarcza" => tarcza,
            "zawal" => zawal,
            _ => default!,
        };
    }

    public sealed partial class Typ_DLON_demon_wagi
    {
        public double? rzut;
        public double? tarcza;
        public double? zawal;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "rzut", "tarcza", "zawal" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — null.</summary>
        public double? this[string klucz] => klucz switch
        {
            "rzut" => rzut,
            "tarcza" => tarcza,
            "zawal" => zawal,
            _ => default!,
        };
    }

    public sealed partial class Typ_DLON_demon_rzut
    {
        public double wstaje;
        public double chwyta;
        public double unosi;
        public double rzuca;
        public double cofa;
        public double wysokosc;
        public double wBok;
        public double grawitacja;
        public double rana;
        public double ogluszenie;
        public double zasieg;
    }

    public sealed partial class Typ_DLON_demon_tarcza
    {
        public double wstaje;
        public double stoi;
        public double cofa;
        public double przedDemonem;
        public double zasieg;
        public double odrzut;
    }

    public sealed partial class Typ_DLON_demon_zawal
    {
        public double wstaje;
        public double drze;
        public double wali;
        public double cofa;
        public double trwa;
        public double kruszy;
        public double szer;
        public double minOdstep;
        public double maxOdstep;
        public double maxWys;
        public double zrastanie;
        public double maxRoznicaWys;
    }
}
