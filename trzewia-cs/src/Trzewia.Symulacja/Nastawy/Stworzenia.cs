// Wygenerowane z alpha-1/src/nastawy/stworzenia.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/stworzenia.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/stworzenia.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyStworzenia
    {
        /// <summary>
        /// STWORZENIA — jak żyje pojedynczy mieszkaniec góry.
        ///
        /// Skale: głód, strach, oddanie i szaleństwo są w zakresie 0..1.
        /// Zdrowie (hp) i siła są w punktach — maksimum każdej rasy jest w sim/races.ts.
        /// „Na tik” = zmiana w każdym kroku symulacji (7200 tików = minuta gry).
        /// „Zasięg” i „promień” w kaflach. „Tików” = jak długo trwa zajęcie, zanim
        /// stworzenie wybierze nowe.
        ///
        /// Statystyki ras (szybkość, siła, płodność, długość życia, metabolizm…)
        /// są w tabeli RACES w src/sim/races.ts.
        /// </summary>
        public static Typ_STWORZENIA STWORZENIA = new Typ_STWORZENIA
        {
            glodNaStart = 0.2,
            oddanieNaStart = 0.25,
            magmaObrazenia = 4,
            toniePowyzej = 5,
            tonieObrazenia = 0.22,
            tonieStrach = 0.05,
            grzybniaParzy = 0.02,
            glodNaTik = 0.0003,
            glodOdSzalenstwa = 0.5,
            glodOdTloku = 3,
            glodOdTlokuMax = 2,
            glodWSamouczku = 0.35,
            cieploKuzni = 8,
            cieploMagmy = 2,
            cieploKarmi = 0.0035,
            glodZabija = 1,
            glodObrazenia = 0.12,
            najedzonyLeczy = 0.5,
            leczenieNaTik = 0.02,
            starosc = 0.5,
            wygasanieStrachu = 0.985,
            szalenstwoOdGlebokosci = 0.72,
            szalenstwoSzansa = 0.00065,
            szalenstwoPunkt = 0.7,
            odpornoscZuzlowcow = 0.4,
            szalenstwoSkok = 0.12,
            szalenstwoPrzelom = 0.6,
            szalenstwoPrzelomSzansa = 0.05,
            zdrowiejePowyzej = 0.6,
            zdrowienie = 0.0003,
            przysypanyObrazenia = 0.12,
            przysypanyStrach = 0.08,
            wygrzebywanieSila = 2.5,
            wygrzebywanieProg = 5,
            wygrzebywanieWGore = 0.35,
            trzymaSieTikow = 2,
            zsuwaSieTikow = 40,
            zsuwanie = 0.2,
            zsuwanieLudu = 0.3,
            chwytZgubionaDroga = 60,
            wodaNiesie = 4,
            grawitacja = 0.12,
            maxSpadanie = 0.9,
            kurzOdPredkosci = 0.35,
            bolesnyUpadek = 0.7,
            upadekObrazenia = 0.25,
            upadekPelny = 0.2,
            rozgladanieCo = 7,
            wzrokTroli = 8,
            wzrok = 6,
            zakleszczenieCo = 12,
            zakleszczenieRuch = 0.12,
            zakleszczenieLimit = 4,
            zakleszczenieUciekaX = 9,
            zakleszczenieUciekaY = 4,
            ogienSprawdzCo = 4,
            ogienZasieg = 2,
            ogienUciekaX = 6,
            ogienUciekaWGore = 4,
            ogienUciekaWDol = 2,
            ogienTikow = 50,
            decyzjaTikow = 18,
            decyzjaRozrzut = 24,
            lupChowaPo = 240,
            tikowNaKafel = 14,
            tikowNaKafelDoJedzenia = 16,
            tikowNaKafelKopania = 30,
            szeptKopGlebiej = 12,
            szeptKopTikow = 120,
            szeptZabijSwoich = 40,
            szeptZabijRasy = 60,
            szeptZabijTikow = 90,
            szeptUciekajWGore = 14,
            szeptUciekajWBok = 8,
            szeptUciekajTikow = 80,
            szeptPlodzTikow = 40,
            rannyUcieka = 0.3,
            rannyStrach = 0.3,
            ucieczkaTikow = 40,
            glodZuzlowcow = 0.34,
            glodInnych = 0.5,
            trolZasypiaOd = 0.85,
            trolOfiaraZasieg = 7,
            trolSpiTikow = 220,
            cieploLimitDrogi = 1800,
            cieploZasieg = 40,
            cieploTikow = 200,
            przadkaNiewolnik = 16,
            przadkaPoluje = 18,
            przadkaSilaOfiary = 7,
            przadkaTikow = 90,
            wrogZasieg = 11,
            strasznyWrog = 2.2,
            strachSzansa = 0.6,
            przadkaJarzmoSzansa = 0.75,
            jarzmoTikow = 70,
            walkaTikow = 60,
            idzieJesc = 0.45,
            bardzoGlodny = 0.8,
            jedzenieLimit = 1500,
            jedzenieLimitGlodny = 2600,
            jedzenieZasieg = 18,
            jedzenieZasiegGlodny = 30,
            jedzenieTikow = 60,
            polowanieZasieg = 18,
            kanibalizmOd = 0.9,
            glodSlepy = 0.95,
            polowanieTikow = 70,
            kesKosci = 0.9,
            kesGrzyba = 0.7,
            kesLeczy = 2,
            noszenieTikow = 120,
            noszenieLimit = 1800,
            noszenieBliskoGniazda = 2,
            oddajeLupOd = 3.5,
            kuzniaTikow = 200,
            kuzniaLimit = 1800,
            zuzlowcyKopiaDo = 8,
            zuzlowcyKopiaGlod = 0.6,
            zuzlowcyRudaLimit = 1200,
            zuzlowcyRudaTikow = 140,
            rudaZasieg = 14,
            ofiaraOddanie = 0.6,
            ofiaraMinKlan = 16,
            ofiaraSzansa = 0.012,
            ofiaraLimit = 1500,
            ofiaraTikow = 120,
            ofiaraZasieg = 20,
            rozrodTlok = 0.92,
            rozrodCzulosc = 1.6,
            rozrodGlod = 0.5,
            rozrodWiek = 400,
            rozrodTikow = 60,
            rozrodDoGniazda = 3,
            rozrodLimit = 1200,
            rozrodDaleko = 14,
            rozrodGlodPo = 0.25,
            rozrodGlodPoWDrodze = 0.3,
            modlitwaSzansa = 0.22,
            modlitwaOdOddania = 0.5,
            modlitwaLimit = 1500,
            modlitwaTikow = 110,
            modlitwaZasieg = 22,
            budowaTikow = 90,
            modlitwaBlisko = 2,
            modlitwaOddanie = 0.004,
            kopanieSzansa = 0.55,
            kopanieLimit = 900,
            kopanieTikow = 100,
            kopanieLosoweX = 6,
            kopanieTikowLosowe = 90,
            kopanieOdSzalenstwa = 0.6,
            kopanieProg = 9,
            kopanieOgienZasieg = 2,
            kopanieOgienSzalenstwo = 0.6,
            lupRudy = 1,
            lupKrysztalu = 2,
            krysztalSzalenstwo = 0.2,
            spacerKopie = 0.25,
            spacerX = 10,
            spacerY = 3,
            wodaSpowalniaOd = 3,
            wodaSpowalnia = 0.5,
            siecSpowalnia = 0.4,
            wspinanie = 0.6,
            schodzenie = 1.2,
            schodzenieNaPrzelaj = 1.4,
            wspinanieNaPrzelaj = 0.55,
            stopien = 1.2,
            obejscie = 0.8,
            naMiejscuX = 0.6,
            naMiejscuY = 1.2,
            nadOgniemPatrzy = 14,
            walkaZasieg = 1.5,
            walkaMin = 0.6,
            walkaRozrzut = 0.8,
            walkaStrach = 0.3,
            zjadaOfiare = 0.5,
            walkaGubi = 22,
            walkaDrogaOd = 10,
            jarzmoZasieg = 1.4,
            jarzmoCios = 1.5,
            jarzmoProg = 0.62,
            wysysanieZasieg = 1.5,
            wysysanieCios = 0.25,
            wysysanieKarmi = 0.006,
            wysysanieSyta = 0.15,
            snuGlodMin = 0.5,
            snuGlodNaTik = 0.0004,
            snuLeczy = 0.03,
            snuCzujneCo = 30,
            snuCzujneZasieg = 8,
            snuAtakTikow = 80,
            cieploOddajeLup = 4,
            cieploBlisko = 3.6,
            cieploJe = 0.005,
            cieploSyty = 0.12,
        };
    }

    /// <summary>
    /// STWORZENIA — jak żyje pojedynczy mieszkaniec góry.
    ///
    /// Skale: głód, strach, oddanie i szaleństwo są w zakresie 0..1.
    /// Zdrowie (hp) i siła są w punktach — maksimum każdej rasy jest w sim/races.ts.
    /// „Na tik” = zmiana w każdym kroku symulacji (7200 tików = minuta gry).
    /// „Zasięg” i „promień” w kaflach. „Tików” = jak długo trwa zajęcie, zanim
    /// stworzenie wybierze nowe.
    ///
    /// Statystyki ras (szybkość, siła, płodność, długość życia, metabolizm…)
    /// są w tabeli RACES w src/sim/races.ts.
    /// </summary>
    public sealed partial class Typ_STWORZENIA
    {
        /// <summary>
        /// ------------------------------------------------------------ narodziny
        /// Z takim głodem przychodzi na świat.
        /// </summary>
        public double glodNaStart;
        /// <summary>Z takim własnym oddaniem przychodzi na świat.</summary>
        public double oddanieNaStart;
        /// <summary>
        /// -------------------------------------------------------------- żywioły
        /// Obrażenia od magmy na tik: podstawa + poziom magmy w kaflu (0..8).
        /// </summary>
        public double magmaObrazenia;
        /// <summary>Woda głębsza niż to (0..8) topi tych, którzy nie pływają…</summary>
        public double toniePowyzej;
        /// <summary>…zabierając tyle zdrowia na tik…</summary>
        public double tonieObrazenia;
        /// <summary>…i dokładając tyle strachu na tik.</summary>
        public double tonieStrach;
        /// <summary>Grzybnia parzy każdego poza Ślepym Ludem: tyle zdrowia na tik.</summary>
        public double grzybniaParzy;
        /// <summary>
        /// ----------------------------------------------------------------- głód
        /// Przyrost głodu na tik (× metabolizm rasy). WIĘCEJ = częstsze jedzenie.
        /// </summary>
        public double glodNaTik;
        /// <summary>Szaleństwo przyspiesza głód: × (1 + szaleństwo × to).</summary>
        public double glodOdSzalenstwa;
        /// <summary>Przeludnienie bije w głód: × (1 + nadmiar² × to), ale najwyżej × `glodOdTlokuMax`.</summary>
        public double glodOdTloku;
        public double glodOdTlokuMax;
        /// <summary>W samouczku (spokojny świat) głód rośnie tylko w takim ułamku.</summary>
        public double glodWSamouczku;
        /// <summary>Żużlowcy przy ogniu: ciepło kuźni sięga tylu kafli…</summary>
        public double cieploKuzni;
        /// <summary>…a magmy tylu…</summary>
        public double cieploMagmy;
        /// <summary>…i przy cieple ubywa im tyle głodu na tik.</summary>
        public double cieploKarmi;
        /// <summary>Powyżej takiego głodu stworzenie traci zdrowie…</summary>
        public double glodZabija;
        /// <summary>
        /// …tyle na tik. WERSJA ANDROID: wolniej niż 0,6 na komputerze — głód przerzedza nację
        /// stopniowo, zamiast kłaść ją całą w kilka sekund, i zostawia czas na kartę „głodują”.
        /// </summary>
        public double glodObrazenia;
        /// <summary>Najedzony (głód poniżej tego) powoli się leczy…</summary>
        public double najedzonyLeczy;
        /// <summary>…o tyle zdrowia na tik.</summary>
        public double leczenieNaTik;
        /// <summary>Starość: po przekroczeniu długości życia traci tyle zdrowia na tik.</summary>
        public double starosc;
        /// <summary>Strach wygasa: mnożony przez to co tik (bliżej 1 = wolniej).</summary>
        public double wygasanieStrachu;
        /// <summary>
        /// ------------------------------------------------------- szaleństwo głębi
        /// Poniżej tej głębokości (0..1) głębia zaczyna mieszać w głowie.
        /// </summary>
        public double szalenstwoOdGlebokosci;
        /// <summary>Szansa na tik: to × (głębokość − 0.7) × 10 × odporność.</summary>
        public double szalenstwoSzansa;
        /// <summary>Punkt odniesienia głębokości we wzorze na szansę.</summary>
        public double szalenstwoPunkt;
        /// <summary>Odporność Żużlowców na głębię (mnożnik szansy; 1 = jak inni).</summary>
        public double odpornoscZuzlowcow;
        /// <summary>O tyle rośnie szaleństwo, gdy głębia „zagada”.</summary>
        public double szalenstwoSkok;
        /// <summary>Powyżej takiego szaleństwa…</summary>
        public double szalenstwoPrzelom;
        /// <summary>…z taką szansą stworzenie odchodzi, zakłada sektę albo zmienia się w trola.</summary>
        public double szalenstwoPrzelomSzansa;
        /// <summary>Kto wrócił wyżej niż ta głębokość, dochodzi do siebie…</summary>
        public double zdrowiejePowyzej;
        /// <summary>…o tyle szaleństwa na tik.</summary>
        public double zdrowienie;
        /// <summary>
        /// ------------------------------------------------------------ przysypanie
        /// Przysypany w skale traci tyle zdrowia na tik…
        /// </summary>
        public double przysypanyObrazenia;
        /// <summary>…i zyskuje tyle strachu.</summary>
        public double przysypanyStrach;
        /// <summary>Wygrzebując się, kopie z siłą × to…</summary>
        public double wygrzebywanieSila;
        /// <summary>…i kafel puszcza przy twardość × to.</summary>
        public double wygrzebywanieProg;
        /// <summary>Kto nie kopie, wygrzebuje się w górę o tyle na tik.</summary>
        public double wygrzebywanieWGore;
        /// <summary>
        /// ------------------------------------------------------------ grawitacja
        /// Trzyma się ściany, jeśli podciągał się w ostatnich tylu tikach.
        /// </summary>
        public double trzymaSieTikow;
        /// <summary>Zsuwa się po ścianie (zamiast spadać), jeśli wspinał się w ostatnich tylu tikach…</summary>
        public double zsuwaSieTikow;
        /// <summary>…z taką prędkością na tik.</summary>
        public double zsuwanie;
        /// <summary>
        /// Alpha: lud (bez lin i klamer) zsuwa się po każdej ścianie, przy której spada — hamuje dłońmi i stopami,
        /// więc nie leci szybciej niż to (na tik; dużo poniżej `bolesnyUpadek` — szybem schodzi cały).
        /// </summary>
        public double zsuwanieLudu;
        /// <summary>Alpha: kto zgubi drogę, wisząc w szybie, trzyma się ściany najwyżej tyle tików, szukając nowej — potem się zsuwa.</summary>
        public double chwytZgubionaDroga;
        /// <summary>Pod nogami woda głębsza niż to (0..8) trzyma jak podłoga.</summary>
        public double wodaNiesie;
        /// <summary>Przyspieszenie spadania na tik i maksymalna prędkość.</summary>
        public double grawitacja;
        public double maxSpadanie;
        /// <summary>Lądowanie szybsze niż to wzbija kurz…</summary>
        public double kurzOdPredkosci;
        /// <summary>…a szybsze niż to boli.</summary>
        public double bolesnyUpadek;
        /// <summary>Upadek zabiera do tylu (ułamek maks. zdrowia)…</summary>
        public double upadekObrazenia;
        /// <summary>…przy prędkości o tyle większej od progu bólu.</summary>
        public double upadekPelny;
        /// <summary>
        /// ---------------------------------------------------------------- zmysły
        /// Co ile tików stworzenie się rozgląda (odkrywa mapę).
        /// </summary>
        public double rozgladanieCo;
        /// <summary>Promień wzroku: trole, reszta.</summary>
        public double wzrokTroli;
        public double wzrok;
        /// <summary>
        /// ----------------------------------------------------------- zakleszczenie
        /// Co ile tików sprawdza, czy stoi w miejscu.
        /// </summary>
        public double zakleszczenieCo;
        /// <summary>Ruch mniejszy niż to (kafla) = stoi.</summary>
        public double zakleszczenieRuch;
        /// <summary>Po tylu kolejnych „stoi” zmienia zamiar na spacer…</summary>
        public double zakleszczenieLimit;
        /// <summary>…w losowe miejsce ± tyle kafli w poziomie i pionie.</summary>
        public double zakleszczenieUciekaX;
        public double zakleszczenieUciekaY;
        /// <summary>
        /// ------------------------------------------------------- ucieczka od ognia
        /// Co ile tików sprawdza, czy obok płynie magma.
        /// </summary>
        public double ogienSprawdzCo;
        /// <summary>Zasięg (kwadrat), w którym liczy, skąd grzeje.</summary>
        public double ogienZasieg;
        /// <summary>Ucieka o tyle kafli w bok…</summary>
        public double ogienUciekaX;
        /// <summary>…i w górę (gdy ogień z dołu) albo w dół (gdy z góry).</summary>
        public double ogienUciekaWGore;
        public double ogienUciekaWDol;
        /// <summary>Tyle tików trwa ucieczka od ognia.</summary>
        public double ogienTikow;
        /// <summary>
        /// ------------------------------------------------------------ decyzje
        /// Zajęcie trwa tyle tików + losowo do `decyzjaRozrzut`, zanim wybierze nowe.
        /// </summary>
        public double decyzjaTikow;
        public double decyzjaRozrzut;
        /// <summary>Niesiony łup chowa dla klanu po tylu tikach noszenia.</summary>
        public double lupChowaPo;
        /// <summary>Na każdy kafel wyznaczonej drogi zajęcie dostaje tyle tików zapasu.</summary>
        public double tikowNaKafel;
        /// <summary>Na kafel drogi do jedzenia (głodny idzie ostrożniej).</summary>
        public double tikowNaKafelDoJedzenia;
        /// <summary>Na kafel odległości „na przełaj” przy kopaniu.</summary>
        public double tikowNaKafelKopania;
        /// <summary>
        /// ------------------------------------------------------------- szepty
        /// „Kop w dół”: cel tyle kafli niżej, zajęcie na tyle tików.
        /// </summary>
        public double szeptKopGlebiej;
        public double szeptKopTikow;
        /// <summary>„Zabij swoich”: szuka swoich w tym promieniu, a potem kogokolwiek z rasy w tym.</summary>
        public double szeptZabijSwoich;
        public double szeptZabijRasy;
        public double szeptZabijTikow;
        /// <summary>„Uciekaj”: w górę o tyle, w bok ± tyle, przez tyle tików.</summary>
        public double szeptUciekajWGore;
        public double szeptUciekajWBok;
        public double szeptUciekajTikow;
        /// <summary>„Płódź”: tyle tików.</summary>
        public double szeptPlodzTikow;
        /// <summary>
        /// -------------------------------------------------------------- ucieczka
        /// Ranny (zdrowie poniżej tego ułamka) i przestraszony (strach powyżej tego) ucieka.
        /// </summary>
        public double rannyUcieka;
        public double rannyStrach;
        /// <summary>Ucieczka trwa tyle tików.</summary>
        public double ucieczkaTikow;
        /// <summary>
        /// ----------------------------------------------------------- głód ras
        /// Od takiego głodu szuka jedzenia po swojemu: Żużlowcy / reszta.
        /// </summary>
        public double glodZuzlowcow;
        public double glodInnych;
        /// <summary>Trol od takiego głodu zasypia w skale, jeśli w tym promieniu nie ma ofiary…</summary>
        public double trolZasypiaOd;
        public double trolOfiaraZasieg;
        /// <summary>…na tyle tików.</summary>
        public double trolSpiTikow;
        /// <summary>Żużlowiec szuka ciepła: limit kroków drogi, zasięg na przełaj, tiki.</summary>
        public double cieploLimitDrogi;
        public double cieploZasieg;
        public double cieploTikow;
        /// <summary>Prządka: wziętego w jarzmo szuka w tym promieniu…</summary>
        public double przadkaNiewolnik;
        /// <summary>…a nowej ofiary (słabszej niż `przadkaSilaOfiary`) w tym.</summary>
        public double przadkaPoluje;
        public double przadkaSilaOfiary;
        /// <summary>Tiki na wysysanie i na polowanie.</summary>
        public double przadkaTikow;
        /// <summary>
        /// --------------------------------------------------------------- wrogowie
        /// Wroga wypatruje w tym promieniu.
        /// </summary>
        public double wrogZasieg;
        /// <summary>Wróg jest „straszny”, gdy jest silniejszy o tyle razy…</summary>
        public double strasznyWrog;
        /// <summary>…wtedy ucieka z szansą to × podatność rasy na strach.</summary>
        public double strachSzansa;
        /// <summary>Prządka bierze w jarzmo zamiast walczyć, z taką szansą.</summary>
        public double przadkaJarzmoSzansa;
        /// <summary>Tiki: branie w jarzmo, walka.</summary>
        public double jarzmoTikow;
        public double walkaTikow;
        /// <summary>
        /// ---------------------------------------------------------------- jedzenie
        /// Od takiego głodu idzie jeść.
        /// </summary>
        public double idzieJesc;
        /// <summary>Bardzo głodny (powyżej tego) szuka dalej.</summary>
        public double bardzoGlodny;
        /// <summary>Limit kroków drogi do jedzenia: zwykle / bardzo głodny.</summary>
        public double jedzenieLimit;
        public double jedzenieLimitGlodny;
        /// <summary>Zasięg szukania na przełaj: zwykle / bardzo głodny.</summary>
        public double jedzenieZasieg;
        public double jedzenieZasiegGlodny;
        /// <summary>Podstawa tików na jedzenie.</summary>
        public double jedzenieTikow;
        /// <summary>Mięsożercy polują na obcych w tym promieniu…</summary>
        public double polowanieZasieg;
        /// <summary>…na swoją rasę od takiego głodu, na kogokolwiek od takiego.</summary>
        public double kanibalizmOd;
        public double glodSlepy;
        public double polowanieTikow;
        /// <summary>Kęs zaspokaja tyle głodu: kość / grzyb.</summary>
        public double kesKosci;
        public double kesGrzyba;
        /// <summary>Kęs leczy tyle zdrowia.</summary>
        public double kesLeczy;
        /// <summary>
        /// ---------------------------------------------------------------- noszenie
        /// Odnoszenie łupu do gniazda: tiki, limit drogi, „na miejscu” w tylu kaflach.
        /// </summary>
        public double noszenieTikow;
        public double noszenieLimit;
        public double noszenieBliskoGniazda;
        /// <summary>Oddaje łup, gdy jest bliżej gniazda niż to.</summary>
        public double oddajeLupOd;
        /// <summary>
        /// ------------------------------------------------------------- budowanie
        /// Odbudowa kuźni: tiki, limit drogi.
        /// </summary>
        public double kuzniaTikow;
        public double kuzniaLimit;
        /// <summary>Żużlowcy kopią rudę, gdy klan ma mniej niż tyle w zapasie i nie są głodni powyżej tego.</summary>
        public double zuzlowcyKopiaDo;
        public double zuzlowcyKopiaGlod;
        /// <summary>Kopanie rudy przez Żużlowców: limit drogi, tiki, zasięg na przełaj.</summary>
        public double zuzlowcyRudaLimit;
        public double zuzlowcyRudaTikow;
        public double rudaZasieg;
        /// <summary>
        /// ------------------------------------------------------------------ ofiara
        /// Ślepy Lud składa ofiarę z dzieci, gdy oddanie klanu &gt; to…
        /// </summary>
        public double ofiaraOddanie;
        /// <summary>…klan liczy więcej niż tylu…</summary>
        public double ofiaraMinKlan;
        /// <summary>…z taką szansą na decyzję.</summary>
        public double ofiaraSzansa;
        /// <summary>Droga do ołtarza: limit, tiki; zasięg na przełaj.</summary>
        public double ofiaraLimit;
        public double ofiaraTikow;
        public double ofiaraZasieg;
        /// <summary>
        /// ------------------------------------------------------------------ rozród
        /// Rodzi się, gdy zatłoczenie rasy poniżej tego (im ciaśniej, tym rzadziej)…
        /// </summary>
        public double rozrodTlok;
        /// <summary>…a miejsce liczy się jako (próg − tłok) × to, obcięte do 0..1.</summary>
        public double rozrodCzulosc;
        /// <summary>Tylko najedzeni (głód poniżej tego) i dorośli (wiek powyżej tylu tików).</summary>
        public double rozrodGlod;
        public double rozrodWiek;
        /// <summary>Tiki, dystans do gniazda i limit drogi.</summary>
        public double rozrodTikow;
        public double rozrodDoGniazda;
        public double rozrodLimit;
        /// <summary>Rodzi mimo wszystko, gdy jest dalej od gniazda niż to.</summary>
        public double rozrodDaleko;
        /// <summary>Poród kosztuje tyle głodu: w gnieździe / w drodze.</summary>
        public double rozrodGlodPo;
        public double rozrodGlodPoWDrodze;
        /// <summary>
        /// --------------------------------------------------------------- modlitwa
        /// Szansa na modlitwę: podstawa + oddanie klanu × to.
        /// </summary>
        public double modlitwaSzansa;
        public double modlitwaOdOddania;
        /// <summary>Droga do świętości: limit, tiki; zasięg na przełaj.</summary>
        public double modlitwaLimit;
        public double modlitwaTikow;
        public double modlitwaZasieg;
        /// <summary>Bez świętości w zasięgu buduje ją przez tyle tików.</summary>
        public double budowaTikow;
        /// <summary>Modli się, stojąc w tylu kaflach od świętości…</summary>
        public double modlitwaBlisko;
        /// <summary>…i zyskuje tyle własnego oddania na tik.</summary>
        public double modlitwaOddanie;
        /// <summary>
        /// ---------------------------------------------------------------- kopanie
        /// Szansa, że kopacz pójdzie kopać zamiast się snuć.
        /// </summary>
        public double kopanieSzansa;
        /// <summary>Kopanie rudy: limit drogi, tiki.</summary>
        public double kopanieLimit;
        public double kopanieTikow;
        /// <summary>Kopanie „byle gdzie”: ± tyle w poziomie, od −3 do +5 w pionie, tyle tików.</summary>
        public double kopanieLosoweX;
        public double kopanieTikowLosowe;
        /// <summary>Postęp kucia na tik: siła kopania × (1 + szaleństwo × to).</summary>
        public double kopanieOdSzalenstwa;
        /// <summary>Kafel puszcza przy twardości × to.</summary>
        public double kopanieProg;
        /// <summary>Nie kopie przy magmie (w tym promieniu), chyba że szaleństwo &gt; to.</summary>
        public double kopanieOgienZasieg;
        public double kopanieOgienSzalenstwo;
        /// <summary>Łup z kafla: ruda / kryształ; kryształ dokłada tyle szaleństwa.</summary>
        public double lupRudy;
        public double lupKrysztalu;
        public double krysztalSzalenstwo;
        /// <summary>Spacerujący przebija się przez skałę z taką szansą.</summary>
        public double spacerKopie;
        /// <summary>Spacer: ± tyle kafli w poziomie i pionie.</summary>
        public double spacerX;
        public double spacerY;
        /// <summary>
        /// ------------------------------------------------------------------- ruch
        /// Woda głębsza niż to spowalnia do `wodaSpowalnia`.
        /// </summary>
        public double wodaSpowalniaOd;
        public double wodaSpowalnia;
        /// <summary>Sieć Prządek spowalnia obcych do tego ułamka.</summary>
        public double siecSpowalnia;
        /// <summary>Mnożniki prędkości: wspinanie drogą, schodzenie drogą.</summary>
        public double wspinanie;
        public double schodzenie;
        /// <summary>Na przełaj: schodzenie, wspinanie po ścianie, wejście na stopień, obejście.</summary>
        public double schodzenieNaPrzelaj;
        public double wspinanieNaPrzelaj;
        public double stopien;
        public double obejscie;
        /// <summary>Cel osiągnięty: bliżej niż tyle w poziomie i w pionie.</summary>
        public double naMiejscuX;
        public double naMiejscuY;
        /// <summary>Nie staje nad ogniem: patrzy w dół na tyle kafli.</summary>
        public double nadOgniemPatrzy;
        /// <summary>
        /// ------------------------------------------------------------------ walka
        /// Zasięg ciosu.
        /// </summary>
        public double walkaZasieg;
        /// <summary>Cios = siła × (to + los × `walkaRozrzut`) × (1 + szaleństwo).</summary>
        public double walkaMin;
        public double walkaRozrzut;
        /// <summary>Trafiony dostaje tyle strachu.</summary>
        public double walkaStrach;
        /// <summary>Mięsożerca po zabiciu zjada: tyle głodu mniej.</summary>
        public double zjadaOfiare;
        /// <summary>Traci wroga z oczu dalej niż to.</summary>
        public double walkaGubi;
        /// <summary>Alpha 1: do wroga dalszego niż tyle kafli lud idzie drogą (schody, liny), bliżej — wprost na niego.</summary>
        public double walkaDrogaOd;
        /// <summary>
        /// ----------------------------------------------------------------- jarzmo
        /// Zasięg, obrażenia i próg zdrowia (ułamek), poniżej którego ofiara idzie w jarzmo.
        /// </summary>
        public double jarzmoZasieg;
        public double jarzmoCios;
        public double jarzmoProg;
        /// <summary>Wysysanie niewolnika: zasięg, obrażenia na tik, ile głodu ubywa, kiedy syta.</summary>
        public double wysysanieZasieg;
        public double wysysanieCios;
        public double wysysanieKarmi;
        public double wysysanieSyta;
        /// <summary>
        /// ------------------------------------------------------------- sen trola
        /// Śpiący trol: głód nie spada poniżej tego, ubywa go tyle na tik…
        /// </summary>
        public double snuGlodMin;
        public double snuGlodNaTik;
        /// <summary>…leczy się o tyle na tik…</summary>
        public double snuLeczy;
        /// <summary>…i co tyle tików sprawdza, czy ktoś przechodzi w tym promieniu.</summary>
        public double snuCzujneCo;
        public double snuCzujneZasieg;
        public double snuAtakTikow;
        /// <summary>
        /// ----------------------------------------------------------------- ciepło
        /// Żużlowiec w cieple: oddaje łup bliżej gniazda niż to, grzeje się bliżej celu niż to…
        /// </summary>
        public double cieploOddajeLup;
        public double cieploBlisko;
        /// <summary>…i ubywa mu tyle głodu na tik, aż spadnie poniżej `cieploSyty`.</summary>
        public double cieploJe;
        public double cieploSyty;
    }
}
