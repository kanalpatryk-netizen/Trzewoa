// Oprawa walki z bossem (plan: docs/plan-oprawy-cerber.md). Jedno miejsce na flagi i liczby wszystkich nowych efektów
// wyglądu: światło, czytelność, „uderzenie”, przerywniki, styl. Efekty zmieniają tylko obraz — nigdy symulację, nastawy
// walki ani czasy logiki. Klawisz F9 (App.NaKlawisz) przełącza je wszystkie naraz; wyłączone — gra wygląda i działa
// 1:1 jak przed oprawą (to sprawdzają zrzuty: Trzewia --zrzuty-walki … --oprawa wyl / wl).
//
// Etap 0: same wyłączniki, bez efektów. Kolejne etapy dopisują tu swoje flagi (domyślnie włączone, chyba że plan mówi
// inaczej) i liczby do strojenia — kod efektu pyta zawsze przez Aktywne(flaga), żeby F9 gasił wszystko jednym ruchem.
using System;

namespace Trzewia.Visual
{
    public static class VisualConfig
    {
        /// <summary>Główny wyłącznik nowej oprawy (F9). Wyłączony — żaden nowy efekt nie rysuje się i nie liczy.</summary>
        public static bool Wlaczone = true;

        /// <summary>Czy dany efekt ma działać: jego flaga i główny wyłącznik naraz.</summary>
        public static bool Aktywne(bool flaga) => Wlaczone && flaga;

        // ───────────── flagi etapów (planu) — wypełniane w kolejnych etapach ─────────────

        /// <summary>Etap 1: światło i kontrast (mapa świateł, trzy plany, jasna krawędź, winieta, błyski zdarzeń).</summary>
        public static bool Swiatlo = true;
        /// <summary>Etap 2: czytelność (sylwetki przy bossie, znaki głów, pasek bossa, etykiety, przybliżenie).</summary>
        public static bool Czytelnosc = true;
        /// <summary>Etap 2, za flagą i domyślnie wyłączone (prośba z planu): księga zwinięta do paska w walce z bossem.</summary>
        public static bool ZwinietaKsiega = false;
        /// <summary>Etap 3: „uderzenie” (zatrzymanie trafień, błysk, wstrząs, cząsteczki, loty zasobów).</summary>
        public static bool Uderzenie = true;
        /// <summary>Etap 4: przerywniki (wejście i śmierć bossa).</summary>
        public static bool Przerywniki = true;
        /// <summary>Etap 5: jeden styl („rycina”) — zestaw grafik po narzędziu tools/ink-pipeline.</summary>
        public static bool Rycina = true;

        // ───────────── klawisz debug ─────────────

        /// <summary>Kiedy ostatnio przełączono F9 (ms zegara gry) — krótki napis w rogu ekranu.</summary>
        public static double PrzelaczonoO = double.NegativeInfinity;
        /// <summary>Jak długo widać napis po F9 (ms).</summary>
        public const double NapisF9Ms = 1500;

        /// <summary>F9: wszystkie nowe efekty naraz włącz/wyłącz.</summary>
        public static void Przelacz(double teraz)
        {
            Wlaczone = !Wlaczone;
            PrzelaczonoO = teraz;
        }

        /// <summary>„--oprawa wl|wyl” i podobne: „wl”, „on”, „1”, „tak” — włączona; „wyl”, „off”, „0”, „nie” — wyłączona.</summary>
        public static bool? Czytaj(string? napis)
        {
            switch ((napis ?? "").Trim().ToLowerInvariant())
            {
                case "wl": case "wł": case "on": case "1": case "tak": case "true": return true;
                case "wyl": case "wył": case "off": case "0": case "nie": case "false": return false;
                default: return null;
            }
        }
    }
}
