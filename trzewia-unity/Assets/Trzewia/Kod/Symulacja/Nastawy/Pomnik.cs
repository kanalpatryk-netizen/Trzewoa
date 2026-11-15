// Wygenerowane z alpha-1/src/nastawy/pomnik.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/pomnik.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/pomnik.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyPomnik
    {
        /// <summary>
        /// Alpha, etap 5 — WIELKI POMNIK DEMONA zamiast rdzenia (sim/pomnik.ts, rysunek: render/pomnik.ts).
        /// Decyzje użytkownika (18.10): pomnik przedstawia demona — olbrzymi posąg zakuty w kamień, w którym śpi boss;
        /// modlitwa pobożnych kruszy go w 3 widocznych stanach; gdy pęknie do końca, z gruzów wychodzi demon (boss),
        /// a gra kończy się wygraną, gdy rycerz go pokona — ze stosowną animacją przy ostatnim uderzeniu.
        /// Tiki: 120 = sekunda, 7200 = minuta.
        /// </summary>
        public static Typ_POMNIK POMNIK = new Typ_POMNIK
        {
            wlaczony = true,
            pekniec = 5,
            stany = new double[] { 20, 45, 70 },
            rozpad = 300,
            wyjscie = 420,
            konanie = 420,
            zwolnienie = 150,
            zwolnienieTempo = 0.25,
            wysokosc = 8,
            szerokosc = 13,
        };

        /// <summary>Kto śpi w pomniku — boss ostatniej fali (sim/boss.ts: demon). Liczby walki jak Śniącego Kamienia.</summary>
        public static Typ_DEMON DEMON = new Typ_DEMON
        {
            nazwa = "Demon z pomnika",
            hp = 500,
            sila = 10,
            ciosCo = 160,
            zasieg = 2.2,
            szybkosc = 0.014,
            rozmiar = 3.2,
        };
    }

    /// <summary>
    /// Alpha, etap 5 — WIELKI POMNIK DEMONA zamiast rdzenia (sim/pomnik.ts, rysunek: render/pomnik.ts).
    /// Decyzje użytkownika (18.10): pomnik przedstawia demona — olbrzymi posąg zakuty w kamień, w którym śpi boss;
    /// modlitwa pobożnych kruszy go w 3 widocznych stanach; gdy pęknie do końca, z gruzów wychodzi demon (boss),
    /// a gra kończy się wygraną, gdy rycerz go pokona — ze stosowną animacją przy ostatnim uderzeniu.
    /// Tiki: 120 = sekunda, 7200 = minuta.
    /// </summary>
    public sealed partial class Typ_POMNIK
    {
        /// <summary>Wyłącznik (typ boolean — żeby kompilator nie uznał starego kodu skorupy za martwy).</summary>
        public bool wlaczony;
        /// <summary>Tyle pełnych odmodleń (rytuał — nastawy/rytual.ts) kruszy pomnik do końca; jedno to 20%.</summary>
        public double pekniec;
        /// <summary>Widoczne stany pękania: od tylu procent stan 1 (rysy), 2 (odpadają kawałki) i 3 (światło z wnętrza).</summary>
        public double[] stany;
        /// <summary>
        /// ---------------------------------------------------------------- przebieg (tiki)
        /// Pomnik rozpada się w gruz, a potem z gruzów wstaje demon — dopiero wtedy rusza walka.
        /// </summary>
        public double rozpad;
        public double wyjscie;
        /// <summary>Ostatnie uderzenie: demon kona tyle tików (ekran zwalnia czas na pierwsze `zwolnienie` z nich, do `zwolnienieTempo`).</summary>
        public double konanie;
        public double zwolnienie;
        public double zwolnienieTempo;
        /// <summary>
        /// ---------------------------------------------------------------- wygląd (kafle)
        ///
        /// Wysokość posągu (od dna komory w górę) i szerokość u podstawy. Przykucnięty posąg ma tyle, ile stojący demon,
        /// który z niego wstaje (dawniej 12 — demon wstawał o połowę mniejszy od kamienia, z którego wyszedł).
        /// </summary>
        public double wysokosc;
        public double szerokosc;
    }

    /// <summary>Kto śpi w pomniku — boss ostatniej fali (sim/boss.ts: demon). Liczby walki jak Śniącego Kamienia.</summary>
    public sealed partial class Typ_DEMON
    {
        public string nazwa;
        public double hp;
        /// <summary>cios i jego rytm (tiki), zasięg ciosu (kafle)</summary>
        public double sila;
        public double ciosCo;
        public double zasieg;
        /// <summary>prędkość (kafle na tik)</summary>
        public double szybkosc;
        /// <summary>wielkość na mapie (× zwykła postać) — wyższy od Śniącego Kamienia: to on spał w pomniku</summary>
        public double rozmiar;
    }
}
