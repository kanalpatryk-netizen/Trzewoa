// Wygenerowane z alpha-1/src/nastawy/lud.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/lud.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/lud.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyLud
    {
        /// <summary>Remake v1: wyłącza stare mechanizmy (rozród, samoistne ofiary, przybysze). Typ boolean — żeby kompilator nie uznał kodu za martwy.</summary>
        // w TS: true
        public static bool REMAKE = true;

        public static Typ_LUD LUD = new Typ_LUD
        {
            start = new Typ_LUD_start
            {
                pobozny = 2,
                robotnik = 3,
                rycerz = 1,
            },
            jedzenieStart = 60,
            krewStart = 120,
            limit = 14,
            starzejeSie = false,
            siedzibaStala = true,
            role = new Typ_LUD_role
            {
                pobozny = new MnoznikiRoli
                {
                    hp = 1,
                    sila = 1,
                    szybkosc = 1,
                    kopanie = 0.5,
                    modlitwa = 1,
                    glod = 0.3,
                },
                robotnik = new MnoznikiRoli
                {
                    hp = 1.3,
                    sila = 1.2,
                    szybkosc = 1.05,
                    kopanie = 1.4,
                    modlitwa = 0.15,
                    glod = 0.35,
                },
                rycerz = new MnoznikiRoli
                {
                    hp = 12,
                    sila = 11,
                    szybkosc = 0.75,
                    kopanie = 0.3,
                    modlitwa = 0.1,
                    glod = 0.35,
                },
            },
            okaleczenieKrew = 25,
            okaleczenie = 0.75,
            ofiaraKrew = 40,
            zapasDo = 150,
            plon = 2,
            posilek = 0.45,
            doSpizarni = 9000,
            wkopDoSpizarni = 8000,
            spizarniaPrzerwa = 1200,
            siedzibaCo = 600,
            odcieciProg = 0.5,
            siedzibaPrzerwa = 18000,
            obozMin = 2,
            przenoszenie = 3,
            spadekMaks = 4,
            strefaRdzenia = 20,
            wartaOdstep = 2,
            przerwaModlitwy = 7200,
            obozOdleglosc = 20,
            obozyMaks = 5,
            obozMinStacjonujacych = 3,
            obozSzerokosc = 5,
            obozWysokosc = 3,
            obozPrzerwa = 7200,
            obozZycie = 14400,
            glodDostawy = 0.35,
            glodDostawyDaleko = 0.2,
            glodSam = 0.6,
            pustoPonizej = 15,
            zjadaNiesione = 0.85,
            kurierNajadaOd = 0.2,
            spizarniaObok = 10,
            glodPilny = 0.55,
            obozMinZapas = 24,
            zapasPartia = 12,
            zapasNosicieli = 3,
            dostawaLimit = 9000,
            wodaUcieka = 4,
            daleko = 45,
            grzybPrzyObozie = 10,
            zamiarTikow = 1200,
            weteranPo = 28800,
            weteranGlod = 0.45,
            weteranWiara = 0.2,
            weteranPremia = 1.3,
            uprawaCo = 600,
            uprawaDo = 8,
            uprawaPromien = 7,
            uprawaZasieg = 14,
            uprawaWPionie = 6,
            przegranaCo = 240,
            helm = new Typ_LUD_helm
            {
                hp = 1.8,
                sila = 3.2,
            },
            trupyMax = 40,
            oltarzCo = 21600,
        };

        /// <summary>
        /// LUD (Remake v1, Alpha) — jeden lud w górze i jego trzy role.
        ///
        /// Pobożni modlą się i schodzą pod rdzeń, robotnicy kopią i noszą jedzenie z wiader,
        /// rycerz walczy. Alpha: stała drużyna — nikt się nie rodzi, skała nie wydaje nowych,
        /// a kamiennych rycerzy w skale nie ma.
        /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry, 120 = sekunda).
        /// </summary>
        public static readonly string[] Rola = { "pobozny", "robotnik", "rycerz" };
    }

    public sealed partial class Typ_LUD
    {
        /// <summary>Kto stoi przy siedzibie na początku partii — cała drużyna na całą partię.</summary>
        public Typ_LUD_start start;
        /// <summary>Jedzenie w spiżarni siedziby na start.</summary>
        public double jedzenieStart;
        /// <summary>Krew na start — zapas, z którego płacisz za ryty i wybory na kartach.</summary>
        public double krewStart;
        /// <summary>Najwięcej żywych postaci ludu naraz (więcej niż na start da tylko dar z góry).</summary>
        public double limit;
        /// <summary>
        /// Alpha: drużyna stała, więc się nie starzeje — ginie tylko z głodu, od ran i w ofierze (dawniej wszyscy
        /// umierali ze starości w 15.–17. minucie, a nowych nikt nie przysyłał). `true` przywraca starość.
        /// </summary>
        public bool starzejeSie;
        /// <summary>Alpha: siedziba stoi w sali pod szybem z jedzeniem i nie przenosi się za ludem.</summary>
        public bool siedzibaStala;
        /// <summary>Mnożniki statystyk rasy dla każdej roli (1 = bez zmian).</summary>
        public Typ_LUD_role role;
        /// <summary>Samookaleczenie pobożnego: tyle krwi, a on na zawsze ma życie, siłę i szybkość × `okaleczenie`.</summary>
        public double okaleczenieKrew;
        public double okaleczenie;
        /// <summary>Ofiara z własnego: tyle krwi (ponad zwykłą krew za śmierć).</summary>
        public double ofiaraKrew;
        /// <summary>Jedzenie: robotnicy znoszą do siedziby, dopóki w spiżarni jest mniej niż `zapasDo`.</summary>
        public double zapasDo;
        /// <summary>Jeden zebrany grzyb daje tyle jedzenia w spiżarni; jedno jedzenie ze spiżarni gasi tyle głodu.</summary>
        public double plon;
        public double posilek;
        /// <summary>Szukając drogi do spiżarni, przeszukuje się najwyżej tyle kafli (to nie długość drogi, tylko zasięg szukania).</summary>
        public double doSpizarni;
        /// <summary>
        /// Odcięty w kieszeni wkopuje się do spiżarni drogą z kopaniem przeglądającą najwyżej tyle kafli. Udaje się to tylko
        /// tuż przy wiadrze (w 30 partiach bota: 11 udanych, najwięcej 64 przejrzane kafle); nieudane szukanie przeglądało
        /// dawniej prawie całą górę (limit rozkazu, 40 000 kafli) i wracało co pół sekundy głodnego spaceru — zgrzyt klatki.
        /// </summary>
        public double wkopDoSpizarni;
        /// <summary>Kto nie zdołał dojść do spiżarni, przez tyle tików szuka grzyba sam (10 s).</summary>
        public double spizarniaPrzerwa;
        /// <summary>Siedziba: co tyle tików sprawdzamy, kto może do niej wrócić.</summary>
        public double siedzibaCo;
        /// <summary>Przenosiny, gdy więcej niż ta część ludu nie może wrócić — i nie częściej niż co tyle tików (2,5 min).</summary>
        public double odcieciProg;
        public double siedzibaPrzerwa;
        /// <summary>Odcięta grupka co najmniej tylu zakłada obóz (znacznik na mapie).</summary>
        public double obozMin;
        /// <summary>Ile jedzenia ze starej spiżarni robotnik bierze na raz.</summary>
        public double przenoszenie;
        /// <summary>
        /// Nie kopie kafla, pod którym ziała pustka głębsza niż tyle — tak wpadali do jaskiń bez dna; i sam nie
        /// zeskakuje z wyższej półki (Remake v2: bez lin i klamer — w górę wchodzi najwyżej o stopień, wyżej kuje schody).
        /// </summary>
        public double spadekMaks;
        /// <summary>Strefa wokół rdzenia, do której robotnicy nie wchodzą — tam modlą się pobożni.</summary>
        public double strefaRdzenia;
        /// <summary>Rycerze na warcie stoją tyle kafli za krawędzią przedsionka, po obu jego stronach.</summary>
        public double wartaOdstep;
        /// <summary>Po szepcie „przerwij” pobożny przez tyle tików nie wraca do modlitwy (1 min).</summary>
        public double przerwaModlitwy;
        /// <summary>Obóz ze spiżarnią: tylu stacjonujących (pobożni, rycerze) dalej niż `obozOdleglosc` od każdej spiżarni.</summary>
        public double obozOdleglosc;
        public double obozyMaks;
        public double obozMinStacjonujacych;
        /// <summary>Obóz staje na płaskiej półce co najmniej tak szerokiej (kafle); nowy najwyżej co minutę; pusty obóz żyje co najmniej 2 min.</summary>
        public double obozSzerokosc;
        public double obozWysokosc;
        public double obozPrzerwa;
        public double obozZycie;
        /// <summary>Robotnik donosi jedzenie pobożnemu albo rycerzowi, gdy ten jest głodniejszy niż to.</summary>
        public double glodDostawy;
        /// <summary>…a stojącym daleko od jedzenia (dalej niż `daleko`) już przy takim głodzie.</summary>
        public double glodDostawyDaleko;
        /// <summary>Pobożni i rycerze sami idą jeść dopiero tak głodni — albo gdy nie ma żadnego robotnika.</summary>
        public double glodSam;
        /// <summary>Gdy we wszystkich spiżarniach razem jest mniej jedzenia niż tyle, robotnik idzie po grzyb także poza strefę pracy.</summary>
        public double pustoPonizej;
        /// <summary>Przy takim głodzie niosący jedzenie zjada własny ładunek, zamiast paść z nim w rękach.</summary>
        public double zjadaNiesione;
        /// <summary>
        /// Alpha (jedno wiadro): robotnik biorący z wiadra jedzenie dla kogoś najpierw sam się najada, jeśli jest choć
        /// tak głodny — droga pod rdzeń i z powrotem to kilkaset kafli, a wracał po swoje o pustym brzuchu.
        /// </summary>
        public double kurierNajadaOd;
        /// <summary>Stacjonujący ze spiżarnią z jedzeniem w tej odległości (kafle) je sam, gdy tylko zgłodnieje.</summary>
        public double spizarniaObok;
        /// <summary>Tak głodny stacjonujący bez dostawy odrywa kopacza drogi od pracy.</summary>
        public double glodPilny;
        /// <summary>Obóz frontowy z mniej niż tyle jedzenia robotnicy zaopatrują z najbogatszej spiżarni, po tyle naraz.</summary>
        public double obozMinZapas;
        public double zapasPartia;
        /// <summary>Najwyżej tylu robotników naraz niesie zapas do obozu frontowego.</summary>
        public double zapasNosicieli;
        /// <summary>Zasięg szukania drogi przy donoszeniu (kafle przeszukane, nie długość drogi).</summary>
        public double dostawaLimit;
        /// <summary>Lud ucieka w górę, gdy woda pod nogami sięga tyle (0–8).</summary>
        public double wodaUcieka;
        /// <summary>Dalej niż tyle kafli od spiżarni z jedzeniem robotnik rusza jeść wcześniej, a kopacz drogi dostaje dostawę.</summary>
        public double daleko;
        /// <summary>Grzyb w tej odległości od obozu (kafle) robotnicy zbierają do jego spiżarni.</summary>
        public double grzybPrzyObozie;
        /// <summary>Zamiar postaci trwa tyle tików (10 s), chyba że cel osiągnie wcześniej albo przerwie go coś pilnego.</summary>
        public double zamiarTikow;
        /// <summary>
        /// Weteran: po `weteranPo` tikach w ludzie (4 min), dopóki najedzony (głód poniżej `weteranGlod`)
        /// i wierny (oddanie co najmniej `weteranWiara`) — siła, szybkość, kopanie i modlitwa × `weteranPremia`.
        /// </summary>
        public double weteranPo;
        public double weteranGlod;
        public double weteranWiara;
        public double weteranPremia;
        /// <summary>
        /// Uprawa: przy każdej spiżarni, przy której w promieniu `uprawaZasieg` jest robotnik, co `uprawaCo` tików
        /// odrasta jeden grzyb (na podłodze, najwyżej `uprawaPromien` kafli od spiżarni), dopóki rośnie ich tam mniej niż `uprawaDo`.
        /// </summary>
        public double uprawaCo;
        public double uprawaDo;
        public double uprawaPromien;
        public double uprawaZasieg;
        /// <summary>Uprawa: gdy przy spiżarni nie ma podłogi, sadzi do `uprawaZasieg` kafli w bok i tyle w pionie (i tam liczy grzyb).</summary>
        public double uprawaWPionie;
        /// <summary>Co tyle tików sprawdzamy, czy da się jeszcze wygrać.</summary>
        public double przegranaCo;
        /// <summary>
        /// ---------------------------------------------------------------- Remake v2
        ///
        /// Gdy w ludzie nie zostanie ani jeden rycerz, robotnicy zakładają hełmy i biorą kilofy do walki:
        /// życie i siła × tyle, walczą ze Strażnikami Snu i bossem jak rycerze (zdejmują hełmy, gdy rycerze wrócą).
        /// </summary>
        public Typ_LUD_helm helm;
        /// <summary>Trupy ludu zostają na ziemi — najwyżej tyle naraz (najstarsze rozsypują się w kości).</summary>
        public double trupyMax;
        /// <summary>Pobożni stawiają ołtarz najwyżej raz na tyle tików (3 min) — bez spiżarni nie płacą jedzeniem.</summary>
        public double oltarzCo;
    }

    public sealed partial class Typ_LUD_start
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

    public sealed partial class MnoznikiRoli
    {
        public double hp;
        public double sila;
        public double szybkosc;
        public double kopanie;
        public double modlitwa;
        public double glod;
    }

    public sealed partial class Typ_LUD_role
    {
        public MnoznikiRoli pobozny;
        public MnoznikiRoli robotnik;
        /// <summary>Alpha: rycerz jest jeden — dużo silniejszy (dawniej życie ×4, siła ×5, szybkość ×0,6)</summary>
        public MnoznikiRoli rycerz;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "pobozny", "robotnik", "rycerz" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public MnoznikiRoli this[string klucz] => klucz switch
        {
            "pobozny" => pobozny,
            "robotnik" => robotnik,
            "rycerz" => rycerz,
            _ => default!,
        };
    }

    public sealed partial class Typ_LUD_helm
    {
        public double hp;
        public double sila;
    }
}
