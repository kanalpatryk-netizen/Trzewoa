// Wygenerowane z alpha-1/src/nastawy/rytual.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/rytual.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/rytual.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyRytual
    {
        /// <summary>
        /// RYTUAŁ, PIELGRZYMKA I WEJŚCIE DO RDZENIA — droga do wygranej.
        ///
        /// Jak to działa: wierni schodzą pod skorupę rdzenia (pielgrzymka),
        /// modlą się tam (rytuał), a każde „pełne” odmodlenie wykuwa jedno pęknięcie
        /// w skorupie. Gdy przez pęknięcia prowadzi droga, wierni schodzą do rdzenia —
        /// i jeśli wierzą dość mocno, gra kończy się Uwolnieniem.
        ///
        /// Wartości „oddania” są w skali 0..1 (0 = nie wierzy wcale, 1 = całym sobą).
        /// Odległości w kaflach od środka rdzenia.
        /// </summary>
        public static Typ_RYTUAL RYTUAL = new Typ_RYTUAL
        {
            promien = 16,
            minOddanie = 0.35,
            potrzebaWiernych = 1,
            maxWiernychLiczonych = 3,
            normaWiernych = 2,
            tempo = 0.0007,
            coIleTikow = 5,
            podstawaOddania = 0.6,
            oporNaPekniecie = 0.18,
            koszmarMnoznik = 0.7,
            wczesnieOd = 0.35,
            wczesnieMinut = 12,
            kronikaStart = 0.08,
            kronikaPolowa = 0.55,
            nagrodaWiary = 20,
            glebokoscPekniecia = 16,
            kolumnyPekniec = new double[] { 0, -1, 1, -2, 2 },
            sprawdzDrogeCo = 60,
            drogaStartPozaPromieniem = 17,
            drogaPudloX = 24,
            drogaPudloGora = 30,
            drogaPudloDol = 24,
            osypiskoMax = 16,
            kolumnaSkorupy = 16,
            zejscieCo = 20,
            zejscieZasieg = 22,
            zejscieObcyOddanie = 0.8,
            zejscieNaRaz = 3,
            zejscieProb = 4,
            zejscieTikow = 1500,
            zejsciePielgrzymaTikow = 1200,
            zejscieLimitDrogi = 6000,
            uwolnienieNacja = 0.45,
            uwolnienieWlasne = 0.6,
            dotykZasieg = 4,
        };

        public static Typ_PIELGRZYMKA PIELGRZYMKA = new Typ_PIELGRZYMKA
        {
            maxPielgrzymow = 2,
            minPielgrzymow = 2,
            czescNacji = 0.3,
            oddanieNacji = 0.5,
            oddanieWlasne = 0.45,
            najedzony = 0.35,
            minNacja = 1,
            maxZatloczenie = 0.95,
            jedzenieWPrzedsionku = 3,
            szansa = 0.06,
            szansaBliskosc = 0.3,
            zasiegBliskosci = 90,
            szeptOddanie = 0.8,
            wyprawaTikow = 7000,
            planZasieg = 8,
            ratunekKopania = 6000,
            rozrzutCelu = 3,
            przedsionekX = 6,
            przedsionekY = 5,
            glodWDrodze = 0.2,
            glodSzukaJedzenia = 0.62,
            zasiegJedzenia = 12,
            glodWraca = 0.7,
            modlitwaOddanie = 0.0012,
            modlitwaKarmi = 0.00018,
            modlitwaWiara = 0.001,
            mysliCo = 24,
            mysliSzansa = 0.3,
            sprawdzOtwarcieCo = 30,
            wartaPudloX = 20,
            wartaPudloY = 16,
            wartaNadRdzeniem = 8,
            powrotPamiecTikow = 3600,
            powrotLimitDrogi = 12000,
            jedzeniePolSzerokosci = 12,
            jedzenieOd = 26,
            jedzenieDo = 2,
            jedzenieCo = 60,
            ochronaOddanie = 0.5,
            ochronaZasieg = 20,
            ochronaLeczy = 0.0015,
        };

        /// <summary>PLAN DROGI PIELGRZYMÓW — kreska na mapie, którą gra podpowiada, gdzie drążyć.</summary>
        public static Typ_PLAN_DROGI PLAN_DROGI = new Typ_PLAN_DROGI
        {
            kosztSkaly = 6,
            oddanieNacji = 0.5,
            minNacja = 8,
            odswiezCo = 600,
            dwukierunkowa = true,
            stala = true,
            zapasowyPonowCo = 3600,
            czoloStoi = 14400,
            czoloOmijaj = 43200,
            drazenieCo = 24,
        };
    }

    /// <summary>
    /// RYTUAŁ, PIELGRZYMKA I WEJŚCIE DO RDZENIA — droga do wygranej.
    ///
    /// Jak to działa: wierni schodzą pod skorupę rdzenia (pielgrzymka),
    /// modlą się tam (rytuał), a każde „pełne” odmodlenie wykuwa jedno pęknięcie
    /// w skorupie. Gdy przez pęknięcia prowadzi droga, wierni schodzą do rdzenia —
    /// i jeśli wierzą dość mocno, gra kończy się Uwolnieniem.
    ///
    /// Wartości „oddania” są w skali 0..1 (0 = nie wierzy wcale, 1 = całym sobą).
    /// Odległości w kaflach od środka rdzenia.
    /// </summary>
    public sealed partial class Typ_RYTUAL
    {
        /// <summary>
        /// ------------------------------------------------------------- kto się liczy
        /// Modlitwa liczy się w tym promieniu od rdzenia (kwadrat, nie koło).
        /// </summary>
        public double promien;
        /// <summary>Minimalne własne oddanie wiernego, żeby jego modlitwa się liczyła.</summary>
        public double minOddanie;
        /// <summary>Tylu wiernych naraz pod skorupą (z dowolnych nacji — kuje ta, której jest najwięcej), żeby kamień w ogóle drgnął. Alpha: pobożnych jest dwóch — wystarczy jeden.</summary>
        public double potrzebaWiernych;
        /// <summary>Więcej wiernych przyspiesza — ale najwyżej do tylu.</summary>
        public double maxWiernychLiczonych;
        /// <summary>Liczba wiernych, przy której tempo jest „normalne” (×1) — obaj pobożni.</summary>
        public double normaWiernych;
        /// <summary>
        /// ------------------------------------------------------------------- tempo
        ///
        /// Postęp jednego pęknięcia na kontrolę (kontrola co `coIleTikow`). Pęknięcie = 1.
        /// WIĘCEJ = szybsza wygrana. Przy 4 wiernych i pełnym oddaniu 5 pęknięć to
        /// ok. 10–15 minut warty.
        /// </summary>
        public double tempo;
        /// <summary>Co ile tików liczy się postęp rytuału.</summary>
        public double coIleTikow;
        /// <summary>Oddanie nacji dodaje się do tej podstawy: tempo × (podstawa + oddanie).</summary>
        public double podstawaOddania;
        /// <summary>Każde kolejne pęknięcie idzie oporniej: dzielnik 1 + pęknięcia × opór.</summary>
        public double oporNaPekniecie;
        /// <summary>v4 beta — mnożnik tempa w trybie Koszmar (skorupa twardsza).</summary>
        public double koszmarMnoznik;
        /// <summary>Na początku partii skorupa jest twardsza: tempo startuje od tego ułamka…</summary>
        public double wczesnieOd;
        /// <summary>…i dochodzi do pełnego po tylu minutach gry.</summary>
        public double wczesnieMinut;
        /// <summary>
        /// -------------------------------------------------------- kronika rytuału
        /// Przy tym postępie pierwszego pęknięcia kronika pisze, że zaczęli.
        /// </summary>
        public double kronikaStart;
        /// <summary>Przy tym — że kamień zaczyna się rysować.</summary>
        public double kronikaPolowa;
        /// <summary>
        /// -------------------------------------------------------------- pęknięcia
        /// Każde pęknięcie daje graczowi tyle Wiary.
        /// </summary>
        public double nagrodaWiary;
        /// <summary>Pęknięcie schodzi kolumną w głąb aż do tylu kafli od rdzenia.</summary>
        public double glebokoscPekniecia;
        /// <summary>Kolejność kolumn przy kruszeniu: środek, potem boki.</summary>
        public double[] kolumnyPekniec;
        /// <summary>Co ile tików sprawdzać, czy do rdzenia prowadzi już droga.</summary>
        public double sprawdzDrogeCo;
        /// <summary>Szukanie drogi zaczyna się poza tym kwadratem wokół rdzenia…</summary>
        public double drogaStartPozaPromieniem;
        /// <summary>…i obejmuje pudło: tyle w bok, w górę i w dół.</summary>
        public double drogaPudloX;
        public double drogaPudloGora;
        public double drogaPudloDol;
        /// <summary>Pod wylotem pęknięcia od dołu okruchy osypują się w schody (lud wchodzi najwyżej o stopień) — najwyżej tyle stopni.</summary>
        public double osypiskoMax;
        /// <summary>Kamień liczony w kolumnie nad rdzeniem (do kamieni milowych) — od tylu kafli.</summary>
        public double kolumnaSkorupy;
        /// <summary>
        /// -------------------------------------------------------- zejście do rdzenia
        /// Co ile tików (gdy skorupa otwarta) szukamy kolejnego wiernego do zejścia.
        /// </summary>
        public double zejscieCo;
        /// <summary>Schodzi tylko ktoś w tej odległości od rdzenia.</summary>
        public double zejscieZasieg;
        /// <summary>Obcy (spoza prowadzącej nacji) schodzi, jeśli jego oddanie przekracza to.</summary>
        public double zejscieObcyOddanie;
        /// <summary>Tylu wiernych naraz schodzi do rdzenia wyznaczoną drogą…</summary>
        public double zejscieNaRaz;
        /// <summary>…a na jedną kontrolę szukamy drogi najwyżej dla tylu nowych.</summary>
        public double zejscieProb;
        /// <summary>Budżet tików na zejście wysłanego wiernego.</summary>
        public double zejscieTikow;
        /// <summary>Budżet tików na zejście pielgrzyma, który sam zauważył otwartą skorupę.</summary>
        public double zejsciePielgrzymaTikow;
        /// <summary>Limit kroków szukania drogi do rdzenia.</summary>
        public double zejscieLimitDrogi;
        /// <summary>
        /// ------------------------------------------------------ wejście i wyrok
        /// Nacja wchodzi „jako wierni”, jeśli jej średnie oddanie przekracza to…
        /// </summary>
        public double uwolnienieNacja;
        /// <summary>…albo jeśli wchodzący sam wierzy mocniej niż to. Inaczej wejście = śmierć boga.</summary>
        public double uwolnienieWlasne;
        /// <summary>Dotknięcie rdzenia: stworzenie w tym kwadracie od środka sprawdza sąsiednie kafle.</summary>
        public double dotykZasieg;
    }

    public sealed partial class Typ_PIELGRZYMKA
    {
        /// <summary>Ilu pielgrzymów naraz wysyła jedna nacja (Alpha: obaj pobożni).</summary>
        public double maxPielgrzymow;
        /// <summary>Co najmniej tylu (o ile nacja ma ludzi).</summary>
        public double minPielgrzymow;
        /// <summary>Pielgrzymów najwyżej taka część nacji.</summary>
        public double czescNacji;
        /// <summary>Nacja musi mieć tyle oddania, żeby w ogóle wysyłać pielgrzymów (wersja na telefon: niżej niż 0.6 na komputerze).</summary>
        public double oddanieNacji;
        /// <summary>Pielgrzym sam musi mieć tyle oddania…</summary>
        public double oddanieWlasne;
        /// <summary>…i być najedzony (głód poniżej tego).</summary>
        public double najedzony;
        /// <summary>Nacja musi liczyć co najmniej tylu (Alpha: drużyna jest mała i stała).</summary>
        public double minNacja;
        /// <summary>I nie może być przeludniona (zatłoczenie rasy poniżej tego).</summary>
        public double maxZatloczenie;
        /// <summary>Schodzą bez drogi powrotnej, jeśli w przedsionku leży co najmniej tyle jedzenia.</summary>
        public double jedzenieWPrzedsionku;
        /// <summary>Szansa zejścia na decyzję: podstawa + bonus za bliskość przedsionka.</summary>
        public double szansa;
        public double szansaBliskosc;
        /// <summary>Bonus za bliskość znika w tej odległości od przedsionka.</summary>
        public double zasiegBliskosci;
        /// <summary>Szept „módl się”: wysłany ma co najmniej tyle własnego oddania (dość, by wejść do rdzenia).</summary>
        public double szeptOddanie;
        /// <summary>Pielgrzym w drodze nie porzuca wyprawy przez tyle tików.</summary>
        public double wyprawaTikow;
        /// <summary>Pielgrzym, który zszedł z planu drogi, wraca na niego, jeśli kreska jest najwyżej tyle kafli dalej.</summary>
        public double planZasieg;
        /// <summary>Alpha: pielgrzym, który spadł z kreski do dołka bez wyjścia, wykuwa stopnie z powrotem — najwyżej tyle przejrzanych kafli.</summary>
        public double ratunekKopania;
        /// <summary>Cel w przedsionku rozrzucony o ± tyle kafli w poziomie.</summary>
        public double rozrzutCelu;
        /// <summary>„W przedsionku” = w takim prostokącie od jego środka (pół szerokości, pół wysokości).</summary>
        public double przedsionekX;
        public double przedsionekY;
        /// <summary>W drodze pod rdzeń głód rośnie w takim ułamku zwykłego tempa (niesie go wiara).</summary>
        public double glodWDrodze;
        /// <summary>Pielgrzym szuka jedzenia, gdy głód przekroczy to…</summary>
        public double glodSzukaJedzenia;
        /// <summary>…w takim promieniu…</summary>
        public double zasiegJedzenia;
        /// <summary>…a gdy głód przekroczy to i nic nie ma, wraca do gniazda.</summary>
        public double glodWraca;
        /// <summary>Na miejscu: przyrost własnego oddania na tik.</summary>
        public double modlitwaOddanie;
        /// <summary>Na miejscu: wiara karmi — tyle głodu ubywa na tik.</summary>
        public double modlitwaKarmi;
        /// <summary>Na miejscu: tyle Wiary na tik dla gracza (× mnożnik dochodu).</summary>
        public double modlitwaWiara;
        /// <summary>Co ile tików pielgrzym może pokazać dymek myśli i z jaką szansą.</summary>
        public double mysliCo;
        public double mysliSzansa;
        /// <summary>Co ile tików (wg id) pielgrzym sprawdza, czy skorupa już otwarta.</summary>
        public double sprawdzOtwarcieCo;
        /// <summary>Liczenie pielgrzymów klanu: kto jest w pudle wokół punktu nad rdzeniem.</summary>
        public double wartaPudloX;
        public double wartaPudloY;
        public double wartaNadRdzeniem;
        /// <summary>Wynik sprawdzenia drogi powrotnej trzymany przez tyle tików.</summary>
        public double powrotPamiecTikow;
        /// <summary>Limit kroków szukania drogi powrotnej.</summary>
        public double powrotLimitDrogi;
        /// <summary>Jedzenie w przedsionku liczone w prostokącie: pół szerokości i zakres wysokości nad rdzeniem.</summary>
        public double jedzeniePolSzerokosci;
        public double jedzenieOd;
        public double jedzenieDo;
        /// <summary>Co ile tików liczyć jedzenie w przedsionku.</summary>
        public double jedzenieCo;
        /// <summary>Szaleństwo głębi nie ima się wiernych (oddanie powyżej tego) w pobliżu rdzenia…</summary>
        public double ochronaOddanie;
        /// <summary>…w tym kwadracie od rdzenia…</summary>
        public double ochronaZasieg;
        /// <summary>…a nawet im je leczy, o tyle na tik.</summary>
        public double ochronaLeczy;
    }

    /// <summary>PLAN DROGI PIELGRZYMÓW — kreska na mapie, którą gra podpowiada, gdzie drążyć.</summary>
    public sealed partial class Typ_PLAN_DROGI
    {
        /// <summary>Ile kosztuje przekopanie kafla skały względem przejścia korytarzem.</summary>
        public double kosztSkaly;
        /// <summary>Plan liczony dla nacji o oddaniu co najmniej tyle… (ten sam próg co pielgrzymka)</summary>
        public double oddanieNacji;
        /// <summary>…i liczącej co najmniej tylu.</summary>
        public double minNacja;
        /// <summary>Plan jest przeliczany najwyżej co tyle tików.</summary>
        public double odswiezCo;
        /// <summary>
        /// Alpha: droga wiernych schodami — nigdzie nie zeskakuje się wyżej niż o kafel (dawniej szła szybami i zeskokami).
        /// W obie strony przejdzie się tylko tam, gdzie schody nie zawracają: na zakręcie pod górę trzeba by wejść o dwa
        /// kafle, a lud wchodzi o jeden — dlatego tym, którzy zeszli w głąb, wiadro zjeżdża tam, gdzie stoją (sim/wiadro.ts).
        /// </summary>
        public bool dwukierunkowa;
        /// <summary>
        /// Alpha: raz wyznaczona droga zostaje, póki da się nią przejść i ją wykuć (przeliczana na nowo zmieniała trasę po
        /// pierwszych schodach). Zapasowa droga w dół (gdy schodami się nie dało) liczy się na nowo co `zapasowyPonowCo` tików.
        /// </summary>
        public bool stala;
        public double zapasowyPonowCo;
        /// <summary>Remake v1: czoło drogi stoi tyle tików (2 min), choć kopacze są w drodze — plan omija ten kafel przez `czoloOmijaj` (6 min).</summary>
        public double czoloStoi;
        public double czoloOmijaj;
        /// <summary>
        /// WERSJA ANDROID: gracz nie drąży — góra sama otwiera drogę wiernym, póki ktoś nią idzie:
        /// jeden kafel skały ze złotej kreski co tyle tików (od strony gniazda).
        /// </summary>
        public double drazenieCo;
    }
}
