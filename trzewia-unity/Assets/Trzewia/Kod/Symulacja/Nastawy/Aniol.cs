// Wygenerowane z alpha-1/src/nastawy/aniol.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/aniol.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/aniol.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyAniol
    {
        public static Typ_ANIOL ANIOL = new Typ_ANIOL
        {
            wlaczona = true,
            pierwszaPo = 28800,
            losujCo = 3600,
            szansa = 0.12,
            przerwa = 36000,
            maxNaPartie = 4,
            swiatlo = 150,
            schodzi = 330,
            dar = 420,
            wraca = 300,
            dary = new Typ_ANIOL_dary
            {
                podkop = new Typ_ANIOL_dary_wpis
                {
                    kafli = 14,
                    waga = 1,
                    najmniej = 3,
                },
                ludzie = new Typ_ANIOL_dary_wpis
                {
                    waga = 1,
                    maksLudu = 9,
                },
                krew = new Typ_ANIOL_dary_wpis
                {
                    waga = 1,
                    ile = 45,
                    niePonad = 0.8,
                },
            },
            wielkosc = 1.3,
            swiatloSzer = 2.6,
        };

        /// <summary>Co dał (kronika, atlas).</summary>
        public static Typ_DAR DAR = new Typ_DAR
        {
            podkop = new Typ_DAR_wpis
            {
                nazwa = "Podkop",
                opis = "kruszy palcami 14 kolejnych kafli drogi wiernych",
            },
            ludzie = new Typ_DAR_wpis
            {
                nazwa = "Dar ludzi",
                opis = "stawia przy ołtarzu nowego robotnika",
            },
            krew = new Typ_DAR_wpis
            {
                nazwa = "Dar krwi",
                opis = "wlewa do relikwiarza 45 krwi",
            },
        };

        /// <summary>
        /// Alpha, etap 4 — DŁOŃ ANIELSKA (sim/aniol.ts, rysunek: render/aniol.ts, model: scripts/dlon/ — ten sam co dłoni
        /// z otchłani, w jasnej wersji). Losowe wydarzenie w każdej grze (decyzja użytkownika 17.10), a dar jest za darmo
        /// i wybiera go sama (decyzja 18.10): podkop (wykuwa kawałek drogi wiernych — decyzja 18.10), dar ludzi (nowy
        /// robotnik) albo dar krwi (struga do relikwiarza). Z góry, przez skałę, sączy się złote światło, dłoń schodzi
        /// w nim palcami w dół, daje dar i wraca w światło.
        /// Tiki: 120 = sekunda, 7200 = minuta.
        /// </summary>
        public static readonly string[] DarAniola = { "podkop", "ludzie", "krew" };
    }

    public sealed partial class Typ_ANIOL
    {
        /// <summary>Wyłącznik (typ boolean — żeby kompilator nie uznał kodu za martwy).</summary>
        public bool wlaczona;
        /// <summary>Najwcześniej po tylu tikach partii (4 min), potem co `losujCo` los z szansą `szansa` (średnio raz na ok. 4 min).</summary>
        public double pierwszaPo;
        public double losujCo;
        public double szansa;
        /// <summary>Po każdym darze cisza na tyle tików (5 min); najwyżej tyle darów w partii.</summary>
        public double przerwa;
        public double maxNaPartie;
        /// <summary>
        /// ---------------------------------------------------------------- przebieg (tiki)
        /// Światło z góry, dłoń schodzi, daje dar, wraca w światło.
        /// </summary>
        public double swiatlo;
        public double schodzi;
        public double dar;
        public double wraca;
        /// <summary>---------------------------------------------------------------- dary</summary>
        public Typ_ANIOL_dary dary;
        /// <summary>
        /// ---------------------------------------------------------------- wygląd (kafle)
        /// Wielkość dłoni (mnożnik jak DLON.wielkosc) i szerokość słupa światła.
        /// </summary>
        public double wielkosc;
        public double swiatloSzer;
    }

    public sealed partial class Typ_ANIOL_dary_wpis
    {
        public double? kafli;
        public double waga;
        public double? najmniej;
        public double? maksLudu;
        public double? ile;
        public double? niePonad;
    }

    public sealed partial class Typ_ANIOL_dary
    {
        /// <summary>Podkop: kruszy tyle następnych kafli drogi wiernych (od czoła w dół; droga idzie schodami — nikt nie utknie).</summary>
        public Typ_ANIOL_dary_wpis podkop;
        /// <summary>Dar ludzi: stawia przy ołtarzu nowego robotnika — póki ludu jest mniej niż `maksLudu`.</summary>
        public Typ_ANIOL_dary_wpis ludzie;
        /// <summary>Dar krwi: tyle krwi spływa strugą do relikwiarza — gdy krwi jest mniej niż `niePonad` największej ilości.</summary>
        public Typ_ANIOL_dary_wpis krew;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "podkop", "ludzie", "krew" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_ANIOL_dary_wpis this[string klucz] => klucz switch
        {
            "podkop" => podkop,
            "ludzie" => ludzie,
            "krew" => krew,
            _ => default!,
        };
    }

    public sealed partial class Typ_DAR_wpis
    {
        public string nazwa;
        // w TS: `kruszy palcami ${ANIOL.dary.podkop.kafli} kolejnych kafli drogi wiernych`
        public string opis;
    }

    /// <summary>Co dał (kronika, atlas).</summary>
    public sealed partial class Typ_DAR
    {
        public Typ_DAR_wpis podkop;
        public Typ_DAR_wpis ludzie;
        public Typ_DAR_wpis krew;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "podkop", "ludzie", "krew" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_DAR_wpis this[string klucz] => klucz switch
        {
            "podkop" => podkop,
            "ludzie" => ludzie,
            "krew" => krew,
            _ => default!,
        };
    }
}
