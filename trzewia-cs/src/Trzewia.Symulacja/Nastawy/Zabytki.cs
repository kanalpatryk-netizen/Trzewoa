// Wygenerowane z alpha-1/src/nastawy/zabytki.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/zabytki.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/zabytki.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyZabytki
    {
        public static Typ_ZABYTKI ZABYTKI = new Typ_ZABYTKI
        {
            ruiny = new Typ_ZABYTKI_ruiny
            {
                odIlu = 1,
                doIlu = 2,
                odGranicy = 5,
                odstep = 46,
                kaplica = new Typ_ZABYTKI_ruiny_kaplica
                {
                    szer = 13,
                    wys = 6,
                    sklepienie = 3,
                },
                kopalnia = new Typ_ZABYTKI_ruiny_kopalnia
                {
                    dl = 22,
                    wys = 3,
                    odrzwiaCo = 4,
                },
                miasto = new Typ_ZABYTKI_ruiny_miasto
                {
                    domSzer = 6,
                    domWys = 4,
                    ulica = 4,
                },
            },
            odkrycieZasieg = 2.6,
            sprawdzajCo = 30,
            kartaPo = 150,
            aureolePo = 190,
            skutki = new Typ_ZABYTKI_skutki
            {
                relikwiarz = new Typ_ZABYTKI_skutki_relikwiarz
                {
                    modlitwa = 1.35,
                    kopanie = 0.75,
                },
                miecz = new Typ_ZABYTKI_skutki_miecz
                {
                    silaRycerza = 1.45,
                    szybkoscRycerza = 0.8,
                },
                kielich = new Typ_ZABYTKI_skutki_kielich
                {
                    leczenie = 1.8,
                    glod = 1.22,
                },
                ksiega = new Typ_ZABYTKI_skutki_ksiega
                {
                    wiara = 1.3,
                    szalenstwo = 2.5,
                    zdrowienie = 0.5,
                },
            },
        };

        /// <summary>Nazwy zabytków (mianownik) i to, co pokazuje karta, karta postaci i atlas.</summary>
        public static Typ_ZABYTEK ZABYTEK = new Typ_ZABYTEK
        {
            relikwiarz = new Typ_ZABYTEK_wpis
            {
                nazwa = "Relikwiarz świętego",
                biernik = "relikwiarz świętego",
                premia = "modlitwa o 35% mocniejsza",
                kara = "kucie o 25% wolniejsze",
                opis = "Srebrna skrzyneczka z kośćmi świętego. Kto ją niesie w sercu, modli się żarliwiej — i nie chce ranić skały.",
            },
            miecz = new Typ_ZABYTEK_wpis
            {
                nazwa = "Miecz krzyżowca",
                biernik = "miecz krzyżowca",
                premia = "rycerz bije o 45% mocniej",
                kara = "rycerz chodzi o 20% wolniej",
                opis = "Wyszczerbiony miecz, wciąż ostry. Rycerz poczuje go w ręku — i w nogach, bo jest ciężki jak grzech.",
            },
            kielich = new Typ_ZABYTEK_wpis
            {
                nazwa = "Kielich",
                biernik = "kielich",
                premia = "rany goją się o 80% szybciej",
                kara = "głód rośnie o 22% szybciej",
                opis = "Poczerniały kielich z ciemnym osadem na dnie. Rany po nim się zasklepiają — a brzuch woła częściej.",
            },
            ksiega = new Typ_ZABYTEK_wpis
            {
                nazwa = "Księga",
                biernik = "księgę",
                premia = "modlitwa daje o 30% więcej wiary",
                kara = "szaleństwo głębi przychodzi 2,5 raza częściej i mija dwa razy wolniej",
                opis = "Księga w zbutwiałej skórze, pisana nieznaną ręką. Modlitwy z niej niosą dalej — a litery śnią się po nocach.",
            },
        };

        /// <summary>Nazwy ruin (mianownik i miejscownik — „odkrył w zawalonej kaplicy”).</summary>
        public static Typ_RUINA RUINA = new Typ_RUINA
        {
            kaplica = new Typ_RUINA_wpis
            {
                nazwa = "zawalona kaplica",
                miejscownik = "zawalonej kaplicy",
            },
            kopalnia = new Typ_RUINA_wpis
            {
                nazwa = "stara kopalnia",
                miejscownik = "starej kopalni",
            },
            miasto = new Typ_RUINA_wpis
            {
                nazwa = "ruiny miasta",
                miejscownik = "ruinach miasta",
            },
        };

        /// <summary>
        /// Alpha, etap 3e — ruiny z zabytkami (sim/ruiny.ts, sim/zabytki.ts, rysunek: render/ruiny.ts).
        ///
        /// W środkowej warstwie góry leżą zawalone budowle: kaplica, stara kopalnia albo kawałek miasta. W każdej zabytek.
        /// Gdy ktoś z ludu do niego dotrze, świat staje i pokazuje kartę: „Weź” — premia i kara dla całego ludu naraz,
        /// na zawsze (sen w sypialni kary nie zdejmuje — decyzja użytkownika 18.10), albo „Zostaw” — zabytek gaśnie.
        /// Tiki: 120 = sekunda, 7200 = minuta.
        /// </summary>
        public static readonly string[] TypZabytku = { "relikwiarz", "miecz", "kielich", "ksiega" };

        /// <summary>Typ RodzajRuiny z TS — dozwolone napisy.</summary>
        public static readonly string[] RodzajRuiny = { "kaplica", "kopalnia", "miasto" };
    }

    public sealed partial class Typ_ZABYTKI
    {
        /// <summary>---------------------------------------------------------------- ruiny w generatorze</summary>
        public Typ_ZABYTKI_ruiny ruiny;
        /// <summary>
        /// ---------------------------------------------------------------- odkrycie i karta
        /// Kto z ludu stanie tak blisko zabytku (kafle), ten go odkrywa.
        /// </summary>
        public double odkrycieZasieg;
        /// <summary>Co tyle tików sprawdzamy, czy ktoś doszedł (i czy karta może się już pokazać).</summary>
        public double sprawdzajCo;
        /// <summary>Unoszenie po odkryciu, zanim pokaże się karta (tiki) — widać kurz, światło i zabytek w górze.</summary>
        public double kartaPo;
        /// <summary>Po wzięciu: tyle tików zabytek leci do rąk i jest unoszony, zanim fala światła zapali ludowi aureole.</summary>
        public double aureolePo;
        /// <summary>---------------------------------------------------------------- skutki (dla całego ludu, na zawsze)</summary>
        public Typ_ZABYTKI_skutki skutki;
    }

    public sealed partial class Typ_ZABYTKI_ruiny
    {
        /// <summary>Ile ruin na górze: najmniej, najwięcej.</summary>
        public double odIlu;
        public double doIlu;
        /// <summary>Ruiny leżą w środkowej warstwie, co najmniej tyle kafli pod jej górną granicą i nad dolną.</summary>
        public double odGranicy;
        /// <summary>Dwie ruiny nie bliżej niż tyle kafli w poziomie (środek do środka).</summary>
        public double odstep;
        /// <summary>Kaplica: szerokość wnętrza i wysokość ścian (kafle), łuk sklepienia nad nimi.</summary>
        public Typ_ZABYTKI_ruiny_kaplica kaplica;
        /// <summary>Kopalnia: długość chodnika, wysokość, co ile kafli odrzwia z belek.</summary>
        public Typ_ZABYTKI_ruiny_kopalnia kopalnia;
        /// <summary>Kawałek miasta: dwa domy (szerokość wnętrza, wysokość ścian) i ulica między nimi z łukiem bramy.</summary>
        public Typ_ZABYTKI_ruiny_miasto miasto;
    }

    public sealed partial class Typ_ZABYTKI_ruiny_kaplica
    {
        public double szer;
        public double wys;
        public double sklepienie;
    }

    public sealed partial class Typ_ZABYTKI_ruiny_kopalnia
    {
        public double dl;
        public double wys;
        public double odrzwiaCo;
    }

    public sealed partial class Typ_ZABYTKI_ruiny_miasto
    {
        public double domSzer;
        public double domWys;
        public double ulica;
    }

    public sealed partial class Typ_ZABYTKI_skutki
    {
        /// <summary>Relikwiarz świętego: modlitwa mocniejsza, kucie wolniejsze.</summary>
        public Typ_ZABYTKI_skutki_relikwiarz relikwiarz;
        /// <summary>Miecz krzyżowca: rycerz bije mocniej, ale ciężar go spowalnia.</summary>
        public Typ_ZABYTKI_skutki_miecz miecz;
        /// <summary>Kielich: rany goją się szybciej, głód rośnie szybciej.</summary>
        public Typ_ZABYTKI_skutki_kielich kielich;
        /// <summary>Księga: modlitwa daje więcej wiary, a głębia szybciej miesza w głowach (i wolniej puszcza).</summary>
        public Typ_ZABYTKI_skutki_ksiega ksiega;
    }

    public sealed partial class Typ_ZABYTKI_skutki_relikwiarz
    {
        public double modlitwa;
        public double kopanie;
    }

    public sealed partial class Typ_ZABYTKI_skutki_miecz
    {
        public double silaRycerza;
        public double szybkoscRycerza;
    }

    public sealed partial class Typ_ZABYTKI_skutki_kielich
    {
        public double leczenie;
        public double glod;
    }

    public sealed partial class Typ_ZABYTKI_skutki_ksiega
    {
        public double wiara;
        public double szalenstwo;
        public double zdrowienie;
    }

    public sealed partial class Typ_ZABYTEK_wpis
    {
        public string nazwa;
        public string biernik;
        // w TS: `modlitwa ${proc(S.relikwiarz.modlitwa, 'mocniejsza', 'słabsza')}`
        public string premia;
        // w TS: `kucie ${proc(S.relikwiarz.kopanie, 'szybsze', 'wolniejsze')}`
        public string kara;
        public string opis;
    }

    /// <summary>Nazwy zabytków (mianownik) i to, co pokazuje karta, karta postaci i atlas.</summary>
    public sealed partial class Typ_ZABYTEK
    {
        public Typ_ZABYTEK_wpis relikwiarz;
        public Typ_ZABYTEK_wpis miecz;
        public Typ_ZABYTEK_wpis kielich;
        public Typ_ZABYTEK_wpis ksiega;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "relikwiarz", "miecz", "kielich", "ksiega" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_ZABYTEK_wpis this[string klucz] => klucz switch
        {
            "relikwiarz" => relikwiarz,
            "miecz" => miecz,
            "kielich" => kielich,
            "ksiega" => ksiega,
            _ => default!,
        };
    }

    public sealed partial class Typ_RUINA_wpis
    {
        public string nazwa;
        public string miejscownik;
    }

    /// <summary>Nazwy ruin (mianownik i miejscownik — „odkrył w zawalonej kaplicy”).</summary>
    public sealed partial class Typ_RUINA
    {
        public Typ_RUINA_wpis kaplica;
        public Typ_RUINA_wpis kopalnia;
        public Typ_RUINA_wpis miasto;

        /// <summary>Klucze w kolejności z TS (Object.keys).</summary>
        public static readonly string[] klucze = { "kaplica", "kopalnia", "miasto" };

        /// <summary>Wpis po kluczu (jak REKORD[klucz] w TS); brak — domyślny.</summary>
        public Typ_RUINA_wpis this[string klucz] => klucz switch
        {
            "kaplica" => kaplica,
            "kopalnia" => kopalnia,
            "miasto" => miasto,
            _ => default!,
        };
    }
}
