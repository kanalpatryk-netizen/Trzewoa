// Wygenerowane z alpha-1/src/nastawy/wiadro.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wiadro.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wiadro.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWiadro
    {
        /// <summary>
        /// WIADRO Z JEDZENIEM (Remake v2) — jedyne jedzenie ludu (grzyba i spiżarni już nie ma).
        /// Co `co` tików z góry, na linie, zjeżdża wiadro pełne jedzenia — w Alphie jedno, zawsze szybem obok szybu ze
        /// światłem, na dno kolumny pod otworem (kto ją pogłębi kopaniem, sprowadzi wiadro niżej).
        /// Kto skrajnie głoduje, wspina się po linie i wsiada do wiadra, zanim zjedzie, i je od razu.
        /// Kod: src/sim/wiadro.ts, rysunek: src/render/wiadro.ts.
        ///
        /// Tiki przeliczaj przez 120 na sekundę (7200 = minuta gry).
        /// </summary>
        public static Typ_WIADRO WIADRO = new Typ_WIADRO
        {
            co = 4800,
            pierwsze = 4800,
            porcjiNaGlowe = 1.6,
            porcjiMin = 6,
            porcjiMax = 28,
            zapowiedz = 150,
            zjazd = 0.010833333333333334,
            zjazdMaks = 1500,
            odjazd = 240,
            najadaDo = 0.12,
            wspinaczkaOd = 0.85,
            wspinaczka = 0.02,
            jedzenieCo = 40,
            szybMaks = 40,
            nakarmPorcji = 8,
            ciecie = new Typ_WIADRO_ciecie
            {
                strata = 0.5,
                grawitacja = 0.012,
                spadaMaks = 0.55,
            },
            naprawa = new Typ_WIADRO_naprawa
            {
                koniecNadDnem = 2.2,
                wspinaczka = 1.2,
                wspinaczkaV = 0.013333333333333334,
                sklejanie = 420,
                napinanie = 150,
                zjazdV = 0.025,
            },
        };

        /// <summary>
        /// KONWÓJ Z JEDZENIEM (Alpha 0.2, użytkownik 23.10: „przyjeżdża jakiś konwój z końmi z przyczepą na te konie i zarzuca
        /// nam te jedzenie po linie”) — tylko rysunek (src/render/konwoj.ts), symulacja wiadra się nie zmienia. Nad szybem wiadra
        /// stoi drewniany kozioł z bloczkiem. Przed każdą dostawą (sim.lud.wiadra.nastepne) z prawej przyjeżdża wóz z parą koni,
        /// zawraca przy koźle, pomocnik zeskakuje z wozu i spuszcza wiadro na linie (albo, gdy wiadro jeszcze stoi na dnie,
        /// zsyła po linie worek), potem wskakuje z powrotem i wóz odjeżdża. Tiki: 120 = sekunda.
        /// </summary>
        public static Typ_KONWOJ KONWOJ = new Typ_KONWOJ
        {
            wlaczony = true,
            koziol = new Typ_KONWOJ_koziol
            {
                rozstaw = 1.25,
                wys = 3.9,
            },
            start = 198,
            postoj = 2.1,
            zawracanie = 120,
            zeskok = 54,
            worek = new Typ_KONWOJ_worek
            {
                od = 150,
                trwa = 420,
            },
        };
    }

    /// <summary>
    /// WIADRO Z JEDZENIEM (Remake v2) — jedyne jedzenie ludu (grzyba i spiżarni już nie ma).
    /// Co `co` tików z góry, na linie, zjeżdża wiadro pełne jedzenia — w Alphie jedno, zawsze szybem obok szybu ze
    /// światłem, na dno kolumny pod otworem (kto ją pogłębi kopaniem, sprowadzi wiadro niżej).
    /// Kto skrajnie głoduje, wspina się po linie i wsiada do wiadra, zanim zjedzie, i je od razu.
    /// Kod: src/sim/wiadro.ts, rysunek: src/render/wiadro.ts.
    ///
    /// Tiki przeliczaj przez 120 na sekundę (7200 = minuta gry).
    /// </summary>
    public sealed partial class Typ_WIADRO
    {
        /// <summary>Co ile tików zjeżdża wiadro (40 s); na start lud dostaje jedno od razu, następne po 40 s.</summary>
        public double co;
        public double pierwsze;
        /// <summary>Ile porcji (porcja = jeden posiłek): tyle na każdą żywą postać ludu, w tych granicach.</summary>
        public double porcjiNaGlowe;
        public double porcjiMin;
        public double porcjiMax;
        /// <summary>Zapowiedź (ze stropu sypie się pył) w tikach.</summary>
        public double zapowiedz;
        /// <summary>Zjazd: kafle na tik; dłuższa lina jedzie szybciej — zjazd trwa najwyżej `zjazdMaks` tików.</summary>
        // w TS: 1.3 / 120
        public double zjazd;
        public double zjazdMaks;
        /// <summary>Opróżnione wiadro jedzie w górę przez tyle tików i znika.</summary>
        public double odjazd;
        /// <summary>Alpha, etap 3: kto doszedł do wiadra, je porcję za porcją, aż głód spadnie do tylu (droga w dół bywa w jedną stronę).</summary>
        public double najadaDo;
        /// <summary>Skrajnie głodny (głód ≥ tyle) wspina się po linie do zjeżdżającego wiadra; prędkość wspinaczki (kafle na tik).</summary>
        public double wspinaczkaOd;
        // w TS: 2.4 / 120
        public double wspinaczka;
        /// <summary>Kto siedzi w wiadrze, je porcję co tyle tików (aż przestanie być głodny).</summary>
        public double jedzenieCo;
        /// <summary>
        /// Alpha (decyzja użytkownika): wiadro jest jedno — zjeżdża tylko szybem z powierzchni, na dno kolumny pod otworem
        /// (kto ją pogłębi, sprowadzi wiadro niżej), nie do głodnych; dalej niosą je robotnicy. Gdy poprzednie jeszcze stoi,
        /// z góry dosypują do niego — najwyżej `szybMaks` porcji.
        /// </summary>
        public double szybMaks;
        /// <summary>Ryt „Nakarm”: dodatkowe jedzenie tym samym szybem, do tego samego wiadra — tyle porcji.</summary>
        public double nakarmPorcji;
        /// <summary>
        /// Alpha, etap 4: lina przecięta przez dłoń z otchłani (sim/lina-wiadra.ts). Zjeżdżające wiadro spada (przyspiesza
        /// o `grawitacja` kafla na tik, najwyżej `spadaMaks`) i roztrzaskuje się — przepada taka część jedzenia.
        /// </summary>
        public Typ_WIADRO_ciecie ciecie;
        /// <summary>
        /// Naprawa: górny kawałek zwisa po cięciu tyle kafli nad dnem (sięga go stojący); naprawiający wspina się po nim
        /// o `wspinaczka` kafla, skleja przez `sklejanie` tików (owija, wiąże), a lina napina się przez `napinanie` tików.
        /// </summary>
        public Typ_WIADRO_naprawa naprawa;
    }

    public sealed partial class Typ_WIADRO_ciecie
    {
        public double strata;
        public double grawitacja;
        public double spadaMaks;
    }

    public sealed partial class Typ_WIADRO_naprawa
    {
        public double koniecNadDnem;
        public double wspinaczka;
        // w TS: 1.6 / 120
        public double wspinaczkaV;
        public double sklejanie;
        public double napinanie;
        // w TS: 3 / 120
        public double zjazdV;
    }

    /// <summary>
    /// KONWÓJ Z JEDZENIEM (Alpha 0.2, użytkownik 23.10: „przyjeżdża jakiś konwój z końmi z przyczepą na te konie i zarzuca
    /// nam te jedzenie po linie”) — tylko rysunek (src/render/konwoj.ts), symulacja wiadra się nie zmienia. Nad szybem wiadra
    /// stoi drewniany kozioł z bloczkiem. Przed każdą dostawą (sim.lud.wiadra.nastepne) z prawej przyjeżdża wóz z parą koni,
    /// zawraca przy koźle, pomocnik zeskakuje z wozu i spuszcza wiadro na linie (albo, gdy wiadro jeszcze stoi na dnie,
    /// zsyła po linie worek), potem wskakuje z powrotem i wóz odjeżdża. Tiki: 120 = sekunda.
    /// </summary>
    public sealed partial class Typ_KONWOJ
    {
        /// <summary>Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy).</summary>
        public bool wlaczony;
        /// <summary>Kozioł: nogi tyle kafli w każdą stronę od liny, bloczek tyle nad ziemią.</summary>
        public Typ_KONWOJ_koziol koziol;
        /// <summary>Wóz przyjeżdża zza prawego brzegu góry (x kafli) i staje tyłem tyle kafli od liny.</summary>
        public double start;
        public double postoj;
        /// <summary>Zawracanie przy koźle i zeskok pomocnika z wozu (tiki).</summary>
        public double zawracanie;
        public double zeskok;
        /// <summary>Worek zsyłany po linie do wiadra, które jeszcze stoi na dnie: od którego tiku postoju i jak długo jedzie.</summary>
        public Typ_KONWOJ_worek worek;
    }

    public sealed partial class Typ_KONWOJ_koziol
    {
        public double rozstaw;
        public double wys;
    }

    public sealed partial class Typ_KONWOJ_worek
    {
        public double od;
        public double trwa;
    }
}
