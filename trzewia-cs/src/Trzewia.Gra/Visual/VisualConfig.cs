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

        // ───────────── etap 1: światło i kontrast (Visual/SwiatloOprawy.cs, Visual/LightEvents.cs) ─────────────

        /// <summary>
        /// Liczby światła. Trzy plany: tło (rycina — skała, ściany, korytarze) przez `FiltrTla`; plan akcji rozjaśnia mapa
        /// świateł; interfejs poza płytą świata zostaje nietknięty. Barwy jako {r, g, b} 0–255, promienie w kaflach świata.
        /// </summary>
        public static class Swiatla
        {
            /// <summary>Tło (rycina) przyciemnione, odbarwione i lekko kontrastowsze — ten filtr idzie na jej rysunek.</summary>
            public static string FiltrTla = "brightness(0.86) saturate(0.68) contrast(1.1)";

            /// <summary>Mapa świateł w tej części rozdzielczości płyty (0,5 — połowa).</summary>
            public static double Skala = 0.5;
            /// <summary>Otoczenie: tyle zostaje z jasności tam, gdzie nie sięga żadne światło (mapa mnożona na scenę).</summary>
            public static double Otoczenie = 0.74;
            /// <summary>Barwa otoczenia (lekko chłodna, żeby ogień był cieplejszy od reszty).</summary>
            public static double[] BarwaOtoczenia = { 0.96, 0.95, 1.0 };
            /// <summary>Jak mocno światło podnosi mapę do bieli (1 — pełne światło w środku źródła).</summary>
            public static double MocMapy = 0.95;
            /// <summary>Promień źródła na mapie względem jego promienia w mroku.</summary>
            public static double PromienMapy = 1.15;
            /// <summary>Scena „przed mnożeniem” rozjaśniona wszędzie o tyle (rozjaśnienie: jasność / (1 − to)).</summary>
            public static double Rozjasnienie = 0.1;
            /// <summary>Rozjaśnienie w świetle (najwyżej): w środku źródła jasność / (1 − to). Rozjaśnia plan akcji.</summary>
            public static double MocBlasku = 0.42;
            /// <summary>Promień rozjaśnienia względem promienia źródła.</summary>
            public static double PromienBlasku = 1.05;
            /// <summary>Poświata ognia, pieca i aury („screen”) — moc i promień względem źródła.</summary>
            public static double MocPoswiaty = 0.2, PromienPoswiaty = 0.55;
            /// <summary>Nad powierzchnią (niebo, katedra) mapa nie przyciemnia — przejście na tylu kaflach.</summary>
            public static double PrzejsciePowierzchni = 3;

            /// <summary>Migotanie ognia: ±tyle mocy, gładki szum z trzech sinusów o tych częstotliwościach (Hz).</summary>
            public static double Migotanie = 0.065;
            public static double[] MigotanieHz = { 6.3, 8.1, 9.7 };

            /// <summary>Barwy źródeł: lampa ludu, ogień (pochodnie, kosze, kocioł, kuźnia), piec (komora bossa), aura mnichów.</summary>
            public static double[] BarwaLampy = { 255, 222, 176 }, BarwaOgnia = { 255, 148, 66 }, BarwaPieca = { 255, 68, 36 }, BarwaAury = { 255, 216, 140 };
            /// <summary>Promienie (kafle): ogień — mnożnik promienia z mroku; piec; aura modlącego się; boss (żar ciała).</summary>
            public static double PromienOgnia = 1.25, PromienPieca = 7.5, PromienAury = 3.4, PromienBossa = 8;
            /// <summary>Moc pieca w fazach bossa: stoi (+ za każdy stan pękania), rozpada, wychodzi, walka, kona.</summary>
            public static double PiecStoi = 0.28, PiecNaStan = 0.12, PiecRozpada = 1.0, PiecWychodzi = 0.85, PiecWalka = 0.6, PiecKona = 0.3;
            /// <summary>Moc aury modlącego się mnicha i żaru bossa.</summary>
            public static double MocAury = 0.8, MocBossa = 0.85;

            /// <summary>Jasna krawędź postaci od światła (Duszek.Krawedz): krycie = Alfa0 + Alfa1 × siła światła.</summary>
            public static double KrawedzAlfa0 = 0.34, KrawedzAlfa1 = 0.56;
            /// <summary>Zasięg ognia, pieca i aury dla krawędzi (× promień źródła) i ich moc.</summary>
            public static double KrawedzZasieg = 1.3, KrawedzMoc = 1.25;

            /// <summary>Winieta: tyle jasności zostaje w rogach płyty; od tego ułamka promienia zaczyna ciemnieć.</summary>
            public static double Winieta = 0.6, WinietaOd = 0.5;

            /// <summary>Błysk pęknięcia pieczęci (pomnika): czerwony z pieca — barwa, moc, czas (ms), promień (kafle).</summary>
            public static double[] BarwaPekniecia = { 255, 54, 24 };
            public static double MocPekniecia = 0.5, MsPekniecia = 190, PromienPekniecia = 30;
            /// <summary>Ten sam błysk słabiej na całą płytę (× MocPekniecia).</summary>
            public static double PekniecieNaPlyte = 0.25;
            /// <summary>Każdy kolejny stan pękania przed rozpadem: mniejszy czerwony błysk.</summary>
            public static double MocRysy = 0.32, MsRysy = 150, PromienRysy = 16;
            /// <summary>Ścięcie głowy / ostatni cios: krótki biały błysk na całą płytę.</summary>
            public static double MocCiosu = 0.3, MsCiosu = 130;
            /// <summary>Śmierć bossa: wszystko poza bossem przygasa do (1 − to); otwór wokół bossa (kafle); narastanie (ms).</summary>
            public static double Przygaszenie = 0.5, PromienOtworu = 7, MsPrzygaszenia = 350;
            /// <summary>„Mniej błysków” (ustawienia → Obraz): moc każdego błysku × to.</summary>
            public static double MniejBlyskow = 0.3;
        }

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
