// Wygenerowane z alpha-1/src/nastawy/sterowanie.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/sterowanie.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/sterowanie.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawySterowanie
    {
        /// <summary>
        /// STEROWANIE I KAMERA — jak gracz porusza się po górze.
        ///
        /// Przybliżenie („zoom”) = ile pikseli ma jeden kafel. Klawisze przypisuje się
        /// w grze (Alpha 0.2: tylko „Przywróć domyślne” w ustawieniach); domyślny układ jest w src/core/keybinds.ts,
        /// domyślne ustawienia (głośność, tempo…) w src/core/settings-store.ts.
        /// </summary>
        public static Typ_KAMERA KAMERA = new Typ_KAMERA
        {
            start = 14,
            min = 2.5,
            max = 26,
            minNaDuzymEkranie = 3,
            niebo = 9,
            krokKolka = 1.25,
            krokKlawisza = 1.15,
            powrotMaxZoom = 16,
            zapasX = 26,
            zapasY = 18,
            podazanie = 0.05,
            dopasowanie = 0.04,
            autoMaxZoom = 20,
            grupaX = 10,
            grupaY = 6,
            wagaCzynnosci = 0.6,
            przewagaBiezacej = 1,
            pokazZoom = 10,
        };

        /// <summary>
        /// CZAS GRY — jeden, zwykły: tyle tików świata na sekundę, niezależnie od odświeżania ekranu
        /// (dawniej liczony w klatkach — na ekranie 120 Hz świat biegł dwa razy szybciej).
        /// Przyspieszanie i zwalnianie jest tylko w trybie deweloperskim.
        /// </summary>
        public static Typ_TEMPO TEMPO = new Typ_TEMPO
        {
            tikowNaSekunde = 120,
            mnozniki = new double[] { 0.25, 0.5, 1, 2, 3, 5, 10, 20 },
            maxNaKlatke = 60,
            budzetKlatkiMs = 8,
        };

        /// <summary>STEROWANIE PALCEM — tylko wersja Android (na telefonie nie ma klawiatury ani myszy).</summary>
        public static Typ_STEROWANIE STEROWANIE = new Typ_STEROWANIE
        {
            pokazKlawisze = false,
            przytrzymanieMs = 520,
            progPrzewijania = 10,
            opisRytuMs = 2600,
        };
    }

    /// <summary>
    /// STEROWANIE I KAMERA — jak gracz porusza się po górze.
    ///
    /// Przybliżenie („zoom”) = ile pikseli ma jeden kafel. Klawisze przypisuje się
    /// w grze (Alpha 0.2: tylko „Przywróć domyślne” w ustawieniach); domyślny układ jest w src/core/keybinds.ts,
    /// domyślne ustawienia (głośność, tempo…) w src/core/settings-store.ts.
    /// </summary>
    public sealed partial class Typ_KAMERA
    {
        /// <summary>Przybliżenie na starcie nowej gry.</summary>
        public double start;
        /// <summary>Najmniejsze i największe przybliżenie (najmniejsze rośnie tak, by góra wypełniała ekran).</summary>
        public double min;
        public double max;
        /// <summary>Najmniejsze przybliżenie nie spada poniżej tego, nawet na wielkim ekranie.</summary>
        public double minNaDuzymEkranie;
        /// <summary>Ponad górny brzeg świata kamera sięga tyle kafli nieba — iglica katedry na powierzchni sięga 7 kafli ponad niego.</summary>
        public double niebo;
        /// <summary>Krok przybliżania kółkiem myszy i klawiszami +/−.</summary>
        public double krokKolka;
        public double krokKlawisza;
        /// <summary>„Wróć do swoich”: największe przybliżenie i zapas wokół skupiska (kafle).</summary>
        public double powrotMaxZoom;
        public double zapasX;
        public double zapasY;
        /// <summary>Kamera za życiem: jak szybko podąża (0..1 na krok) i jak mocno dopasowuje przybliżenie.</summary>
        public double podazanie;
        public double dopasowanie;
        /// <summary>Automatyczne przybliżenie nie przekracza tego.</summary>
        public double autoMaxZoom;
        /// <summary>
        /// Za kim idzie kamera: grupa to postacie bliżej siebie niż grupaX × grupaY kafli (łańcuchem). Waga grupy to
        /// liczba postaci plus wagaCzynnosci za każdą, która coś robi (rozkaz, kopanie, modlitwa, walka);
        /// grupa, za którą kamera już idzie, ma przewagę przewagaBiezacej.
        /// </summary>
        public double grupaX;
        public double grupaY;
        public double wagaCzynnosci;
        public double przewagaBiezacej;
        /// <summary>Przybliżenie przy pokazywaniu miejsca (rada, wpis kroniki, alarm) — co najmniej tyle.</summary>
        public double pokazZoom;
    }

    /// <summary>
    /// CZAS GRY — jeden, zwykły: tyle tików świata na sekundę, niezależnie od odświeżania ekranu
    /// (dawniej liczony w klatkach — na ekranie 120 Hz świat biegł dwa razy szybciej).
    /// Przyspieszanie i zwalnianie jest tylko w trybie deweloperskim.
    /// </summary>
    public sealed partial class Typ_TEMPO
    {
        /// <summary>Tików świata na sekundę zwykłego czasu (TIKOW_NA_MINUTE / 60).</summary>
        public double tikowNaSekunde;
        /// <summary>Mnożniki czasu w trybie deweloperskim (przyciski ‹ ›, klawisze + −, okienko dewelopera).</summary>
        public double[] mnozniki;
        /// <summary>Najwięcej tików w jednej klatce — wolny komputer zwalnia świat zamiast się dusić.</summary>
        public double maxNaKlatke;
        /// <summary>
        /// Najwięcej milisekund symulacji w jednej klatce (co najmniej jeden tik i tak się liczy). Gdy świat nie nadąża,
        /// zwalnia, a obraz dalej płynie — bez tego zaległe tiki przechodziły na następną klatkę, która przez to była
        /// jeszcze wolniejsza, i gra stawała. Zwykle tik to ułamek milisekundy, więc budżetu nie widać. Przy przyspieszonym
        /// czasie budżet rośnie razem z mnożnikiem.
        /// </summary>
        public double budzetKlatkiMs;
    }

    /// <summary>STEROWANIE PALCEM — tylko wersja Android (na telefonie nie ma klawiatury ani myszy).</summary>
    public sealed partial class Typ_STEROWANIE
    {
        /// <summary>Podpowiedzi klawiszy: cyfry przy rytach, „esc”, „P”, klawisze w samouczku i w ustawieniach.</summary>
        public bool pokazKlawisze;
        /// <summary>Przytrzymanie palca na rycie (ms) otwiera jego tablicę w atlasie — zamiast prawego przycisku.</summary>
        public double przytrzymanieMs;
        /// <summary>Palec, który przesunął się dalej niż tyle px, przewija listę zamiast w nią stukać.</summary>
        public double progPrzewijania;
        /// <summary>Po wybraniu rytu jego opis (co robi, ile kosztuje) wisi przy nim tyle ms — nie ma „najechania”.</summary>
        public double opisRytuMs;
    }
}
