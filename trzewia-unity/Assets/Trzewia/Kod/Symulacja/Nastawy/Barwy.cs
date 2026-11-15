// Wygenerowane z alpha-1/src/nastawy/barwy.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/barwy.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/barwy.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyBarwy
    {
        /// <summary>
        /// BARWY — paleta całej gry. Ciemność jest ciepła, kolor pojawia się wyłącznie jako światło.
        /// Wszystko, co rysuje interfejs, bierze barwy stąd — żeby nic nie świeciło kolorem,
        /// którego nie ma w świecie. Zapis: '#rrggbb'.
        /// </summary>
        public static Typ_BARWA BARWA = new Typ_BARWA
        {
            sadza = "#0b0807",
            sadzaJasna = "#141010",
            papier = "#ddd6c4",
            papierCien = "#c9c2ae",
            atrament = "#cfc2a6",
            atramentMocny = "#efe3c6",
            atramentCichy = "#a39a8b",
            krew = "#8a1a16",
            krewJasna = "#c2503c",
            zar = "#ff8c32",
            zarBlady = "#e0a860",
            biolumina = "#7ab060",
            otchlan = "#e8e6ee",
        };

        /// <summary>Barwa atramentu na płycie zmienia się z głębokością: kość na górze, czerwień na dnie.</summary>
        public static Typ_ATRAMENT_GLEBI ATRAMENT_GLEBI = new Typ_ATRAMENT_GLEBI
        {
            gora = new double[] { 226, 214, 196 },
            spadek = new double[] { 96, 176, 178 },
            przyciemnienie = 0.2,
        };

        /// <summary>
        /// Pigmenty fresku — interfejs malowany jak ściana krypty oglądana przy lampce:
        /// ciemny tynk, ramy z czerwieni ziemi i ugru, kontury sinopią, biel wapienna na krawędziach.
        /// Faktura tynku pochodzi ze zdjęcia fresku z Faras (src/grafiki/tekstury).
        /// </summary>
        public static Typ_FRESK FRESK = new Typ_FRESK
        {
            sciana = "#3a2b23",
            mrok = "5,3,2",
            mrokAlfa = 0.9,
            czerwien = "#5a2116",
            ugier = "#76582f",
            biel = "#b5a688",
            sinopia = "#2a0d07",
            tablicaCiemna = "#2b1f19",
            tablicaJasna = "#d6c8aa",
            krazek = "#6c5e4d",
            krazekWlaczony = "#a3864e",
            tekst = "#d4c6a6",
            tekstCichy = "#8b7b63",
            napisCzerwony = "#c0533a",
            zloto = "#c49a50",
            lapis = "#3d5463",
            zielen = "#68774e",
            cynober = "#9c3b24",
            tonRyciny = "#ecc495",
            zar = new double[] { 214, 110, 70 },
        };
    }

    /// <summary>
    /// BARWY — paleta całej gry. Ciemność jest ciepła, kolor pojawia się wyłącznie jako światło.
    /// Wszystko, co rysuje interfejs, bierze barwy stąd — żeby nic nie świeciło kolorem,
    /// którego nie ma w świecie. Zapis: '#rrggbb'.
    /// </summary>
    public sealed partial class Typ_BARWA
    {
        /// <summary>Tło: prawie czarna sadza i jej jaśniejsza odmiana.</summary>
        public string sadza;
        public string sadzaJasna;
        /// <summary>Papier tablic atlasu i jego cień.</summary>
        public string papier;
        public string papierCien;
        /// <summary>Atrament: zwykły tekst, wyróżniony tekst, szeptany tekst.</summary>
        public string atrament;
        public string atramentMocny;
        public string atramentCichy;
        /// <summary>Krew (zasób i zagrożenie).</summary>
        public string krew;
        public string krewJasna;
        /// <summary>Żar: akcent, zaznaczenie, złoto rytów.</summary>
        public string zar;
        public string zarBlady;
        /// <summary>Biolumina: grzybnia i życie.</summary>
        public string biolumina;
        /// <summary>Otchłań: blady, zimny zasób.</summary>
        public string otchlan;
    }

    /// <summary>Barwa atramentu na płycie zmienia się z głębokością: kość na górze, czerwień na dnie.</summary>
    public sealed partial class Typ_ATRAMENT_GLEBI
    {
        /// <summary>Kolor na powierzchni (r, g, b).</summary>
        public double[] gora;
        /// <summary>O ile każdy kanał spada do dna.</summary>
        public double[] spadek;
        /// <summary>Dodatkowe przyciemnienie na dnie (0..1).</summary>
        public double przyciemnienie;
    }

    /// <summary>
    /// Pigmenty fresku — interfejs malowany jak ściana krypty oglądana przy lampce:
    /// ciemny tynk, ramy z czerwieni ziemi i ugru, kontury sinopią, biel wapienna na krawędziach.
    /// Faktura tynku pochodzi ze zdjęcia fresku z Faras (src/grafiki/tekstury).
    /// </summary>
    public sealed partial class Typ_FRESK
    {
        /// <summary>Ściana: barwa przed nałożeniem faktury (faktura przyciemnia ją o ok. 1/3). Prawie czarny, wilgotny tynk.</summary>
        public string sciana;
        /// <summary>Ciemność w kątach ściany (winieta) i jej krycie.</summary>
        public string mrok;
        public double mrokAlfa;
        /// <summary>Pasy ramy: zaschnięta krew, przygasłe złoto, przybrudzona biel; kontur prawie czarną sinopią.</summary>
        public string czerwien;
        public string ugier;
        public string biel;
        public string sinopia;
        /// <summary>Tablice: ciemny tynk (tekst jasny) i jasny tynk (tekst sinopią).</summary>
        public string tablicaCiemna;
        public string tablicaJasna;
        /// <summary>Krążki przycisków i rytów: kamień w cieniu; wybrany — stare złoto.</summary>
        public string krazek;
        public string krazekWlaczony;
        /// <summary>Tekst: biel wapienna, przygaszona biel, czerwień napisów, złoto.</summary>
        public string tekst;
        public string tekstCichy;
        public string napisCzerwony;
        public string zloto;
        /// <summary>Pigmenty wstęgi ludu i drobnych znaków.</summary>
        public string lapis;
        public string zielen;
        public string cynober;
        /// <summary>Ton, którym mnoży się rycina świata — biel kreski przechodzi w ugier.</summary>
        public string tonRyciny;
        /// <summary>Żar nieznanego pisma (ramy, ściana) — [r, g, b].</summary>
        public double[] zar;
    }
}
