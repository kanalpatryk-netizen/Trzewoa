// Wygenerowane z alpha-1/src/nastawy/mrok.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/mrok.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/mrok.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyMrok
    {
        /// <summary>
        /// MROK (Remake v1) — ciemność w górze.
        ///
        /// Światło niosą lampki robotników, aureole pobożnych, siedziba, obozy, rdzeń i Cud.
        /// Poza nim góra jest ciemna. (Alpha 0.2: Tego, który patrzy z ciemności, już nie ma.)
        /// </summary>
        public static Typ_MROK MROK = new Typ_MROK
        {
            wlaczony = true,
            ciemnosc = 0.58,
            ciemnoscPauza = 0.38,
            gesty = 0.62,
            swiatlo = new Typ_MROK_swiatlo
            {
                robotnik = 7.6,
                pobozny = 5.6,
                pobozny_modli = 6.6,
                rycerz = 5.4,
                siedziba = 10,
                oboz = 7,
                rdzen = 7,
                cud = 11,
                oltarz = 5.5,
                rytual = 8,
                smugaGora = 2.2,
                smugaDol = 4.2,
                szybWiadra = 1.4,
                rozeta = 5.2,
                swieca = 2.6,
                latarnia = 6.5,
                sala = 7.5,
                salaKrok = 3,
                pomieszczenia = new Dictionary<string, double>
                {
                    ["kuznia"] = 5.5,
                    ["warsztat"] = 3.6,
                    ["sypialnia"] = 2.6,
                },
            },
            zarKuzni = 0.2,
            zarKuzniPromien = 9,
            skala = 0.5,
        };
    }

    /// <summary>
    /// MROK (Remake v1) — ciemność w górze.
    ///
    /// Światło niosą lampki robotników, aureole pobożnych, siedziba, obozy, rdzeń i Cud.
    /// Poza nim góra jest ciemna. (Alpha 0.2: Tego, który patrzy z ciemności, już nie ma.)
    /// </summary>
    public sealed partial class Typ_MROK
    {
        /// <summary>Wyłącznik ciemności na rysunku. Typ boolean — żeby kompilator nie uznał kodu za martwy.</summary>
        public bool wlaczony;
        /// <summary>
        /// ---------------------------------------------------------------- ciemność na rysunku
        ///
        /// Krycie ciemności poza światłem (0 = brak, 1 = czarno); w pauzie jaśniej — planujesz.
        /// Dzielone przez suwak jasności z ustawień (domyślnie 1,25 → 0,46 i 0,3). Mniej niż dawniej (0,72):
        /// rycina ma teraz szkic w nieznanym i jasne jaskinie — ciemność ma je przygasić, nie zgasić.
        /// </summary>
        public double ciemnosc;
        public double ciemnoscPauza;
        /// <summary>
        /// 6.11: loch za stalową bramą, przedproże i stara komnata z kotłem — mrok gęstszy (dokłada się do zwykłego krycia),
        /// „skrajnie mroczny, ale przyjazny dla oka”: światło z ognia wycina w nim miękkie, ciepłe plamy.
        /// </summary>
        public double gesty;
        /// <summary>Promienie światła (kafle).</summary>
        public Typ_MROK_swiatlo swiatlo;
        /// <summary>Kuźnia rzuca na ściany pomarańczowy żar (krycie 0..1, promień w kaflach).</summary>
        public double zarKuzni;
        public double zarKuzniPromien;
        /// <summary>Ciemność liczona w mniejszej rozdzielczości (×) — szybciej, a krawędzie światła i tak są miękkie.</summary>
        public double skala;
    }

    public sealed partial class Typ_MROK_swiatlo
    {
        public double robotnik;
        public double pobozny;
        public double pobozny_modli;
        public double rycerz;
        public double siedziba;
        public double oboz;
        public double rdzen;
        public double cud;
        /// <summary>
        /// Alpha, etap 3d: świece na ołtarzu (przy rytuale jaśniej) i smuga dnia z szybu nad nim — u góry (w całym szybie,
        /// od nieba do stropu sali) i u dołu, przy ołtarzu. Węższym szybem, którym zjeżdża wiadro, dnia wpada mniej.
        /// </summary>
        public double oltarz;
        public double rytual;
        public double smugaGora;
        public double smugaDol;
        public double szybWiadra;
        /// <summary>Katedra na powierzchni (nastawy/katedra.ts): łuna wokół rozety i płomienie świec przy otworze w posadzce.</summary>
        public double rozeta;
        public double swieca;
        /// <summary>Latarnia na wozie konwoju z jedzeniem (nastawy/wiadro.ts: KONWOJ).</summary>
        public double latarnia;
        /// <summary>
        /// Jasna sala cała w świetle (dzień z szybu i świece): plamy o tym promieniu co tyle kafli wzdłuż sali.
        /// Gotowe pomieszczenia świecą poza swój obrys o tyle kafli: kuźnia ogniem, warsztat świecą, sypialnia ledwo.
        /// </summary>
        public double sala;
        public double salaKrok;
        public Dictionary<string, double> pomieszczenia;
    }
}
