// Wygenerowane z alpha-1/src/nastawy/pomieszczenia.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/pomieszczenia.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/pomieszczenia.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyPomieszczenia
    {
        /// <summary>
        /// POMIESZCZENIA (Alpha, etap 3c) — szablony do wykucia i rzemiosło. Gracz kładzie na skale plan (sypialnia,
        /// warsztat, kuźnia, korytarz, szyb), a kują go tylko zaznaczeni robotnicy, którym ten plan wskażesz — wolni
        /// robotnicy sami nic nie biorą (decyzja użytkownika). Gotowy warsztat zamienia złoto w dewocjonalia, które od razu
        /// stają się wiarą; kuźnia z żelaza wykuwa kolejne części zbroi rycerza; sypialnia zdejmuje osłabienia.
        /// Symulacja: src/sim/pomieszczenia.ts; rysunek: src/render/pomieszczenia.ts.
        /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
        /// </summary>
        public static Typ_POMIESZCZENIA POMIESZCZENIA = new Typ_POMIESZCZENIA
        {
            szablony = new Typ_POMIESZCZENIA_szablony
            {
                sypialnia = new Typ_POMIESZCZENIA_szablony_sypialnia
                {
                    w = 5,
                    h = 3,
                },
                warsztat = new Typ_POMIESZCZENIA_szablony_warsztat
                {
                    w = 4,
                    h = 3,
                },
                kuznia = new Typ_POMIESZCZENIA_szablony_kuznia
                {
                    w = 4,
                    h = 3,
                },
            },
            korytarzWys = 2,
            korytarzMaks = 30,
            szybMaks = 24,
            linyDarmowe = 5,
            linaKrew = 10,
            maks = 12,
            zasiegWGore = 2,
            warsztat = new Typ_POMIESZCZENIA_warsztat
            {
                zlotoNaSztuke = 1,
                wiaraZaSztuke = 12,
                tikowNaSztuke = 1200,
            },
            kuznia = new Typ_POMIESZCZENIA_kuznia
            {
                czesci = new Typ_POMIESZCZENIA_kuznia_czesci[]
                {
                    new Typ_POMIESZCZENIA_kuznia_czesci
                    {
                        id = "helm",
                        nazwa = "hełm",
                        zelazo = 3,
                        tikow = 1500,
                    },
                    new Typ_POMIESZCZENIA_kuznia_czesci
                    {
                        id = "naramienniki",
                        nazwa = "naramienniki",
                        zelazo = 3,
                        tikow = 1500,
                    },
                    new Typ_POMIESZCZENIA_kuznia_czesci
                    {
                        id = "napiersnik",
                        nazwa = "napierśnik",
                        zelazo = 6,
                        tikow = 2400,
                    },
                    new Typ_POMIESZCZENIA_kuznia_czesci
                    {
                        id = "nakolanniki",
                        nazwa = "nakolanniki",
                        zelazo = 3,
                        tikow = 1500,
                    },
                    new Typ_POMIESZCZENIA_kuznia_czesci
                    {
                        id = "tarcza",
                        nazwa = "tarcza",
                        zelazo = 5,
                        tikow = 2100,
                    },
                },
            },
            sypialnia = new Typ_POMIESZCZENIA_sypialnia
            {
                snuTikow = 7200,
            },
        };

        /// <summary>Nazwy w mianowniku — przyciski, podpisy, kronika.</summary>
        public static Typ_NAZWA_POMIESZCZENIA NAZWA_POMIESZCZENIA = new Typ_NAZWA_POMIESZCZENIA
        {
            sypialnia = "sypialnia",
            warsztat = "warsztat",
            kuznia = "kuźnia",
            korytarz = "korytarz",
            szyb = "szyb",
            lina = "lina",
        };

        /// <summary>W bierniku — kronika („wykuli kuźnię”).</summary>
        public static Typ_BIERNIK_POMIESZCZENIA BIERNIK_POMIESZCZENIA = new Typ_BIERNIK_POMIESZCZENIA
        {
            sypialnia = "sypialnię",
            warsztat = "warsztat",
            kuznia = "kuźnię",
            korytarz = "korytarz",
            szyb = "szyb",
            lina = "linę",
        };

        /// <summary>Kolejność szablonów na przyciskach i pod klawiszem B.</summary>
        public static string[] SZABLONY = new string[] { "sypialnia", "warsztat", "kuznia", "korytarz", "szyb", "lina" };

        /// <summary>Typ RodzajPomieszczenia z TS — dozwolone napisy.</summary>
        public static readonly string[] RodzajPomieszczenia = { "sypialnia", "warsztat", "kuznia", "korytarz", "szyb", "lina" };
    }

    /// <summary>
    /// POMIESZCZENIA (Alpha, etap 3c) — szablony do wykucia i rzemiosło. Gracz kładzie na skale plan (sypialnia,
    /// warsztat, kuźnia, korytarz, szyb), a kują go tylko zaznaczeni robotnicy, którym ten plan wskażesz — wolni
    /// robotnicy sami nic nie biorą (decyzja użytkownika). Gotowy warsztat zamienia złoto w dewocjonalia, które od razu
    /// stają się wiarą; kuźnia z żelaza wykuwa kolejne części zbroi rycerza; sypialnia zdejmuje osłabienia.
    /// Symulacja: src/sim/pomieszczenia.ts; rysunek: src/render/pomieszczenia.ts.
    /// Odległości w kaflach, czas w tikach (120 = sekunda, 7200 = minuta gry).
    /// </summary>
    public sealed partial class Typ_POMIESZCZENIA
    {
        /// <summary>Szablony: szerokość i wysokość wnętrza do wykucia (podłoga to rząd pod spodem — musi być lita i płaska).</summary>
        public Typ_POMIESZCZENIA_szablony szablony;
        /// <summary>Korytarz: pas poziomy tej wysokości (lud stoi w tunelu na 2 kafle), najwyżej tyle kafli długości.</summary>
        public double korytarzWys;
        public double korytarzMaks;
        /// <summary>Szyb: proste schody w dół (stopień o kafel — da się nimi wrócić), najwyżej tyle stopni.</summary>
        public double szybMaks;
        /// <summary>
        /// Alpha: lina (zamiast drabiny z 3d — decyzje użytkownika 18.10). Wiesza ją gracz, od razu — nikt jej nie buduje.
        /// Jedyny warunek: górny koniec uczepiony skały (strop, krawędź półki albo ściana); z haka lina spada do podłogi.
        /// Pierwsze `linyDarmowe` są za darmo, każda następna kosztuje `linaKrew`.
        /// </summary>
        public double linyDarmowe;
        public double linaKrew;
        /// <summary>Najwięcej planów i pomieszczeń naraz.</summary>
        public double maks;
        /// <summary>Kując plan, robotnik sięga kilofem kafel wyżej niż zwykle — nad głowę (wnętrze ma 3 kafle wysokości).</summary>
        public double zasiegWGore;
        public Typ_POMIESZCZENIA_warsztat warsztat;
        public Typ_POMIESZCZENIA_kuznia kuznia;
        public Typ_POMIESZCZENIA_sypialnia sypialnia;
    }

    public sealed partial class Typ_POMIESZCZENIA_szablony
    {
        public Typ_POMIESZCZENIA_szablony_sypialnia sypialnia;
        public Typ_POMIESZCZENIA_szablony_warsztat warsztat;
        public Typ_POMIESZCZENIA_szablony_kuznia kuznia;
    }

    public sealed partial class Typ_POMIESZCZENIA_szablony_sypialnia
    {
        public double w;
        public double h;
    }

    public sealed partial class Typ_POMIESZCZENIA_szablony_warsztat
    {
        public double w;
        public double h;
    }

    public sealed partial class Typ_POMIESZCZENIA_szablony_kuznia
    {
        public double w;
        public double h;
    }

    public sealed partial class Typ_POMIESZCZENIA_warsztat
    {
        /// <summary>Ile złota idzie na jedną sztukę (krzyż, różaniec, krucyfiks)…</summary>
        public double zlotoNaSztuke;
        /// <summary>…ile wiary daje gotowa sztuka (zamienia się w wiarę od razu — bez ekwipunku)…</summary>
        public double wiaraZaSztuke;
        /// <summary>…i ile tików trwa jej wykonanie.</summary>
        public double tikowNaSztuke;
    }

    public sealed partial class Typ_POMIESZCZENIA_kuznia
    {
        /// <summary>Kolejne części zbroi rycerza: ile żelaza i ile tików. Co dają i jak rycerz je zakłada — nastawy/zbroja.ts.</summary>
        public Typ_POMIESZCZENIA_kuznia_czesci[] czesci;
    }

    public sealed partial class Typ_POMIESZCZENIA_kuznia_czesci
    {
        public string id;
        public string nazwa;
        public double zelazo;
        public double tikow;
    }

    public sealed partial class Typ_POMIESZCZENIA_sypialnia
    {
        /// <summary>
        /// Tyle tików snu zdejmuje osłabienia (okaleczenie, zatrucie); potem śpiący wstaje sam. Etap 3d (decyzja
        /// użytkownika): ok. 60 s — ofiara krwi przy ołtarzu nie może być darmową pętlą krwi.
        /// </summary>
        public double snuTikow;
    }

    /// <summary>Nazwy w mianowniku — przyciski, podpisy, kronika.</summary>
    public sealed partial class Typ_NAZWA_POMIESZCZENIA
    {
        public string sypialnia;
        public string warsztat;
        public string kuznia;
        public string korytarz;
        public string szyb;
        public string lina;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "sypialnia", "warsztat", "kuznia", "korytarz", "szyb", "lina" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public string this[string klucz] => klucz switch
        {
            "sypialnia" => sypialnia,
            "warsztat" => warsztat,
            "kuznia" => kuznia,
            "korytarz" => korytarz,
            "szyb" => szyb,
            "lina" => lina,
            _ => default!,
        };
    }

    /// <summary>W bierniku — kronika („wykuli kuźnię”).</summary>
    public sealed partial class Typ_BIERNIK_POMIESZCZENIA
    {
        public string sypialnia;
        public string warsztat;
        public string kuznia;
        public string korytarz;
        public string szyb;
        public string lina;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "sypialnia", "warsztat", "kuznia", "korytarz", "szyb", "lina" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public string this[string klucz] => klucz switch
        {
            "sypialnia" => sypialnia,
            "warsztat" => warsztat,
            "kuznia" => kuznia,
            "korytarz" => korytarz,
            "szyb" => szyb,
            "lina" => lina,
            _ => default!,
        };
    }
}
