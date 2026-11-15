// Wygenerowane z alpha-1/src/nastawy/wydarzenia.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wydarzenia.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wydarzenia.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWydarzenia
    {
        /// <summary>
        /// WYDARZENIA — karty z wyborem, główny sposób grania w wersji na telefon.
        ///
        /// Co jakiś czas gra staje i pokazuje wydarzenie (zaraza, powódź, prorok, głód…)
        /// z dwoma–trzema wyborami opisanymi wprost. Tu są odstępy między kartami i ceny wyborów.
        /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
        /// </summary>
        public static Typ_WYDARZENIA WYDARZENIA = new Typ_WYDARZENIA
        {
            pierwsze = 3600,
            odstep = 4200,
            rozrzut = 2400,
            pilnyGlod = 0.7,
            pilnaPo = 5400,
            bezGraczaPo = 600,
            powodzZatkaj = 15,
            powodzKieruj = 10,
            zarazaUzdrow = 20,
            zarazaUzdrowOddanie = 0.05,
            zylaZasklep = 15,
            glodGrzyb = 12,
            glodJedzenia = 16,
            glodUlga = 0.35,
            glodZmarlych = 2,
            glodZmarlychUlga = 0.3,
            prorokWysluchaj = 15,
            prorokUciszOddanie = 0.05,
            rudaOltarz = 4,
            rudaKuznia = 6,
            znakObjaw = 20,
            znakOddanie = 0.2,
            znakMilczenie = 0.05,
            wartaPosl = 15,
            wartaGrzyb = 15,
            wartaIlu = 3,
            klotniaPodsyc = 10,
            klotniaPogodzOddanie = 0.03,
            ratunek = 15,
            ratunekJedzenia = 14,
            plemieNakarm = 10,
            plemieJedzenia = 12,
            wojnaRozdziel = 15,
            wojnaPokoj = 14400,
            glodUdzial = 0.4,
            glodMinNacja = 4,
            prorokMinNacja = 14,
            znakOd = 0.2,
            znakDo = 0.5,
            wartaOddanie = 0.4,
            wartaMinNacja = 6,
            obcyOdDominacji = 0.74,
            obcyPo = 21600,
            wojnaCisza = 43200,
            wojnaPo = 16200,
            wojnaChronPonizej = 10,
            wymieraPonizej = 3,
            wymieraSzczyt = 7,
            dlugKrew = 80,
            dlugPo = 21600,
            dlugSen = 0.12,
            koszmarDlug = 1.5,
            dlugOd = 14400,
            dlugMaxSen = 0.4,
            przysiegaWiara = 25,
            przysiegaPo = 14400,
            przysiegaOddanie = 0.12,
            przysiegaPokoj = 86400,
            przysiegaUraza = 3,
            lancuchPo = 18000,
            zemstaPo = 7200,
            lancuchOdstep = 1800,
            heretykNawroc = 20,
            heretykNawrocOddanie = 0.12,
            heretykOfiar = 2,
            heretykStrachOddanie = 0.04,
            heretykZwatpienie = 0.1,
            proroctwoWiara = 25,
            proroctwoOddanie = 0.08,
            proroctwoSkorupa = 0.15,
            proroctwoZwatpienie = 0.1,
            wdzieczniKrew = 30,
            wdzieczniWiara = 20,
            wdzieczniOddanie = 0.12,
            ozdrowiencyWiara = 15,
            ozdrowiencyOddanie = 0.05,
            ozdrowiencyUlga = 0.2,
            ozdrowiencyNawrot = 0.35,
            zemstaKrew = 15,
            zemstaJedzenia = 12,
            drozeje = 0.5,
        };
    }

    /// <summary>
    /// WYDARZENIA — karty z wyborem, główny sposób grania w wersji na telefon.
    ///
    /// Co jakiś czas gra staje i pokazuje wydarzenie (zaraza, powódź, prorok, głód…)
    /// z dwoma–trzema wyborami opisanymi wprost. Tu są odstępy między kartami i ceny wyborów.
    /// Tiki przeliczaj przez TIKOW_NA_MINUTE (7200 tików = minuta gry).
    /// </summary>
    public sealed partial class Typ_WYDARZENIA
    {
        /// <summary>
        /// ----------------------------------------------------------------- rytm
        /// Pierwsza karta po tylu tikach od początku partii.
        /// </summary>
        public double pierwsze;
        /// <summary>Kolejna karta po tylu tikach + los do `rozrzut`.</summary>
        public double odstep;
        public double rozrzut;
        /// <summary>Karta pilna (głód całej nacji) przychodzi poza kolejką, gdy głoduje taka część — ale nie częściej niż co `pilnaPo` tików.</summary>
        public double pilnyGlod;
        public double pilnaPo;
        /// <summary>Świat bez gracza (testy, automat): po tylu tikach wydarzenie rozstrzyga się samo, domyślnym wyborem.</summary>
        public double bezGraczaPo;
        /// <summary>
        /// ----------------------------------------------------------------- ceny
        /// Powódź: zatkanie szczeliny / skierowanie wody na najsilniejszych.
        /// </summary>
        public double powodzZatkaj;
        public double powodzKieruj;
        /// <summary>Zaraza: uzdrowienie (Wiara) i ile oddania dostaje wtedy każda nacja.</summary>
        public double zarazaUzdrow;
        public double zarazaUzdrowOddanie;
        /// <summary>Żyła szaleństwa: zasklepienie.</summary>
        public double zylaZasklep;
        /// <summary>Głód: grzyb (Krew), ile kafli jedzenia i o ile spada głód.</summary>
        public double glodGrzyb;
        public double glodJedzenia;
        public double glodUlga;
        /// <summary>Głód: „niech jedzą zmarłych” — tylu najsłabszych ginie, reszcie ubywa tyle głodu.</summary>
        public double glodZmarlych;
        public double glodZmarlychUlga;
        /// <summary>Prorok: wysłuchanie (Wiara); uciszenie daje nacji tyle oddania.</summary>
        public double prorokWysluchaj;
        public double prorokUciszOddanie;
        /// <summary>Ruda: tyle rudy dostaje nacja.</summary>
        public double rudaOltarz;
        public double rudaKuznia;
        /// <summary>Prośba o znak: objawienie (Wiara), ile oddania daje; milczenie tyle zabiera.</summary>
        public double znakObjaw;
        public double znakOddanie;
        public double znakMilczenie;
        /// <summary>Warta pod rdzeniem: posłanie trzech (Wiara) i grzyb przy przedsionku (Krew).</summary>
        public double wartaPosl;
        public double wartaGrzyb;
        public double wartaIlu;
        /// <summary>Kłótnia: podsycenie (Wiara); pogodzenie daje obu tyle oddania.</summary>
        public double klotniaPodsyc;
        public double klotniaPogodzOddanie;
        /// <summary>Ratunek ginącej krwi (Krew) i ile jedzenia dostaje.</summary>
        public double ratunek;
        public double ratunekJedzenia;
        /// <summary>Nowe plemię: nakarmienie (Krew).</summary>
        public double plemieNakarm;
        public double plemieJedzenia;
        /// <summary>Pierwsza krew (dwie nacje zaczynają wojnę): rozdzielenie (Krew — tej, której nie przeleją) i na ile tików rozejm.</summary>
        public double wojnaRozdziel;
        public double wojnaPokoj;
        /// <summary>
        /// -------------------------------------------------------------- warunki
        /// Głód: karta, gdy głoduje taka część nacji liczącej co najmniej `glodMinNacja`.
        /// </summary>
        public double glodUdzial;
        public double glodMinNacja;
        /// <summary>Prorok: nacja liczy co najmniej tylu.</summary>
        public double prorokMinNacja;
        /// <summary>Prośba o znak: oddanie najwierniejszej nacji w tym przedziale.</summary>
        public double znakOd;
        public double znakDo;
        /// <summary>Warta: nacja ma co najmniej tyle oddania i tylu ludzi.</summary>
        public double wartaOddanie;
        public double wartaMinNacja;
        /// <summary>Obcy lud: tylko przy takiej dominacji jednej krwi i nie wcześniej niż po tylu tikach.</summary>
        public double obcyOdDominacji;
        public double obcyPo;
        /// <summary>Pierwsza krew: ta sama para nie wraca z kartą przez tyle tików; karty wojen nie częściej niż co `wojnaPo`.</summary>
        public double wojnaCisza;
        public double wojnaPo;
        /// <summary>Pierwsza krew: rozsądnie rozdzielić, gdy słabsza krew liczy tylu albo mniej.</summary>
        public double wojnaChronPonizej;
        /// <summary>Wymieranie: rasa ma tylu albo mniej, a miała co najmniej `wymieraSzczyt`.</summary>
        public double wymieraPonizej;
        public double wymieraSzczyt;
        /// <summary>
        /// ------------------------------------------------- v4 beta: skutki odroczone
        /// Układ z głębią: tyle Krwi teraz…
        /// </summary>
        public double dlugKrew;
        /// <summary>…a po tylu tikach głębia się upomina: sen rośnie o tyle (Koszmar: × `koszmarDlug`).</summary>
        public double dlugPo;
        public double dlugSen;
        public double koszmarDlug;
        /// <summary>Układ z głębią nie wcześniej niż po tylu tikach i nie gdy sen już jest wysoko.</summary>
        public double dlugOd;
        public double dlugMaxSen;
        /// <summary>Przysięga dwóch nacji: cena błogosławieństwa (Wiara) i po ilu tikach przysięga się spełnia.</summary>
        public double przysiegaWiara;
        public double przysiegaPo;
        /// <summary>Spełniona przysięga: tyle oddania obu nacjom i pokój na tyle tików.</summary>
        public double przysiegaOddanie;
        public double przysiegaPokoj;
        /// <summary>Zlekceważona przysięga: tyle urazy między nimi.</summary>
        public double przysiegaUraza;
        /// <summary>
        /// ------------------------------------------------- v4.1 beta: łańcuchy kart
        /// Karta z łańcucha wraca po tylu tikach od wyboru, który ją zaczął (wojna szybciej)…
        /// </summary>
        public double lancuchPo;
        public double zemstaPo;
        /// <summary>…i nie wcześniej niż tyle tików po poprzedniej karcie.</summary>
        public double lancuchOdstep;
        /// <summary>Heretyk (po uciszonym proroku): nawrócenie (Wiara) i jego oddanie; zmiażdżenie — tylu ginie, reszta uwierzy o tyle; „niech mówi” zabiera tyle oddania.</summary>
        public double heretykNawroc;
        public double heretykNawrocOddanie;
        public double heretykOfiar;
        public double heretykStrachOddanie;
        public double heretykZwatpienie;
        /// <summary>Proroctwo (po wysłuchanym proroku): spełnienie (Wiara), oddanie każdej nacji, postęp kucia skorupy; milczenie zabiera tyle oddania.</summary>
        public double proroctwoWiara;
        public double proroctwoOddanie;
        public double proroctwoSkorupa;
        public double proroctwoZwatpienie;
        /// <summary>Wdzięczni (po nakarmionym głodzie): ofiara (krew, wiara) albo oddanie.</summary>
        public double wdzieczniKrew;
        public double wdzieczniWiara;
        public double wdzieczniOddanie;
        /// <summary>Ozdrowieńcy (po zarazie): błogosławieństwo (Wiara), oddanie każdej nacji, ulga w głodzie; przy milczeniu zaraza wraca z taką szansą.</summary>
        public double ozdrowiencyWiara;
        public double ozdrowiencyOddanie;
        public double ozdrowiencyUlga;
        public double ozdrowiencyNawrot;
        /// <summary>Zemsta (po „niech walczą”): siła dla słabszych (Krew) i ile dostają jedzenia.</summary>
        public double zemstaKrew;
        public double zemstaJedzenia;
        /// <summary>
        /// ----------------------------------------------- v4.2 beta: drożejące wybory
        /// Płatny wybór drożeje o tyle (× cena wyjściowa) za każde wcześniejsze kupno tego samego wyboru w tej partii.
        /// </summary>
        public double drozeje;
    }
}
