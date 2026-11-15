// Wygenerowane z alpha-1/src/nastawy/zbroja.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/zbroja.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/zbroja.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyZbroja
    {
        public static Typ_ZBROJA ZBROJA = new Typ_ZBROJA
        {
            premie = new Typ_ZBROJA_premie
            {
                helm = new Typ_ZBROJA_premie_wpis
                {
                    hp = 1.15,
                },
                napiersnik = new Typ_ZBROJA_premie_wpis
                {
                    hp = 1.25,
                },
                naramienniki = new Typ_ZBROJA_premie_wpis
                {
                    sila = 1.15,
                },
                nakolanniki = new Typ_ZBROJA_premie_wpis
                {
                    szybkosc = 1.1,
                },
                tarcza = new Typ_ZBROJA_premie_wpis
                {
                    rany = 0.8,
                },
            },
            zakladanieTikow = 150,
            glodDo = 0.35,
            ponowPo = 7200,
            szukanieDrogi = 9000,
        };

        /// <summary>Nazwy części (mianownik, biernik — „zakłada hełm”, „tarczę”) i co dają (karta postaci, atlas).</summary>
        public static Typ_CZESC CZESC = new Typ_CZESC
        {
            helm = new Typ_CZESC_wpis
            {
                nazwa = "hełm",
                biernik = "hełm",
                skutek = "życie +15%",
            },
            naramienniki = new Typ_CZESC_wpis
            {
                nazwa = "naramienniki",
                biernik = "naramienniki",
                skutek = "siła +15%",
            },
            napiersnik = new Typ_CZESC_wpis
            {
                nazwa = "napierśnik",
                biernik = "napierśnik",
                skutek = "życie +25%",
            },
            nakolanniki = new Typ_CZESC_wpis
            {
                nazwa = "nakolanniki",
                biernik = "nakolanniki",
                skutek = "szybkość +10%",
            },
            tarcza = new Typ_CZESC_wpis
            {
                nazwa = "tarcza",
                biernik = "tarczę",
                skutek = "rany −20%",
            },
        };

        /// <summary>
        /// Alpha, etap 3f — zbroja rycerza (sim/zbroja.ts, rysunek: render/lud/rycerz.ts, render/lud/helm.ts).
        ///
        /// Rycerz zaczyna w kolczudze, z mieczem i w płaszczu — życie i siła jak dotąd. Kuźnia (sim/pomieszczenia.ts) wykuwa
        /// z żelaza kolejne części i odkłada je na wieszak; rycerz sam po nie idzie, gdy nie ma fali Strażników ani rozkazu
        /// (albo gdy go tam poślesz), zakłada jedną po drugiej i wraca. Każda noszona część dokłada swoją premię.
        /// Decyzje użytkownika 18.10: zestaw startowy — kolczuga, miecz, płaszcz; rycerz idzie sam, gdy nie ma fali.
        /// Tiki: 120 = sekunda, 7200 = minuta.
        /// </summary>
        public static readonly string[] CzescZbroi = { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };
    }

    public sealed partial class Typ_ZBROJA
    {
        /// <summary>Mnożniki rycerza za każdą noszoną część (życie, siła, szybkość; tarcza — ile zostaje z rany).</summary>
        public Typ_ZBROJA_premie premie;
        /// <summary>Tyle tików zakłada jedną część (część leci z wieszaka, błysk).</summary>
        public double zakladanieTikow;
        /// <summary>Sam idzie po części tylko, gdy jest najedzony (głód poniżej tego).</summary>
        public double glodDo;
        /// <summary>Kuźni, do której nie doszedł, sam nie próbuje przez tyle tików (1 min).</summary>
        public double ponowPo;
        /// <summary>Szukanie drogi do kuźni — limit kroków.</summary>
        public double szukanieDrogi;
    }

    public sealed partial class Typ_ZBROJA_premie_wpis
    {
        public double? hp;
        public double? sila;
        public double? szybkosc;
        public double? rany;
    }

    public sealed partial class Typ_ZBROJA_premie
    {
        public Typ_ZBROJA_premie_wpis helm;
        public Typ_ZBROJA_premie_wpis napiersnik;
        public Typ_ZBROJA_premie_wpis naramienniki;
        public Typ_ZBROJA_premie_wpis nakolanniki;
        public Typ_ZBROJA_premie_wpis tarcza;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "helm", "napiersnik", "naramienniki", "nakolanniki", "tarcza" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_ZBROJA_premie_wpis this[string klucz] => klucz switch
        {
            "helm" => helm,
            "napiersnik" => napiersnik,
            "naramienniki" => naramienniki,
            "nakolanniki" => nakolanniki,
            "tarcza" => tarcza,
            _ => default!,
        };
    }

    public sealed partial class Typ_CZESC_wpis
    {
        public string nazwa;
        public string biernik;
        // w TS: `życie ${proc(P.helm.hp!)}`
        public string skutek;
    }

    /// <summary>Nazwy części (mianownik, biernik — „zakłada hełm”, „tarczę”) i co dają (karta postaci, atlas).</summary>
    public sealed partial class Typ_CZESC
    {
        public Typ_CZESC_wpis helm;
        public Typ_CZESC_wpis naramienniki;
        public Typ_CZESC_wpis napiersnik;
        public Typ_CZESC_wpis nakolanniki;
        public Typ_CZESC_wpis tarcza;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_CZESC_wpis this[string klucz] => klucz switch
        {
            "helm" => helm,
            "naramienniki" => naramienniki,
            "napiersnik" => napiersnik,
            "nakolanniki" => nakolanniki,
            "tarcza" => tarcza,
            _ => default!,
        };
    }
}
