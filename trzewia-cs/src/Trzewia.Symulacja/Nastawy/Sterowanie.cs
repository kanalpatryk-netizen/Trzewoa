using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/nastawy/sterowanie.ts
namespace Trzewia.Nastawy
{

/// <summary>
/// STEROWANIE I KAMERA — jak gracz porusza się po górze.
///
/// Przybliżenie („zoom”) = ile pikseli ma jeden kafel. Domyślny układ klawiszy jest w Rdzen/Keybinds.cs,
/// domyślne ustawienia (głośność, tempo…) w Rdzen/SettingsStore.cs.
/// </summary>
public static class KAMERA
{
    /// <summary>Przybliżenie na starcie nowej gry.</summary>
    public static double start = 14;
    /// <summary>Najmniejsze i największe przybliżenie (najmniejsze rośnie tak, by góra wypełniała ekran).</summary>
    public static double min = 2.5, max = 26;
    /// <summary>Najmniejsze przybliżenie nie spada poniżej tego, nawet na wielkim ekranie.</summary>
    public static double minNaDuzymEkranie = 3;
    /// <summary>Ponad górny brzeg świata kamera sięga tyle kafli nieba — iglica katedry na powierzchni sięga 7 kafli ponad niego.</summary>
    public static double niebo = 9;
    /// <summary>Krok przybliżania kółkiem myszy i klawiszami +/−.</summary>
    public static double krokKolka = 1.25, krokKlawisza = 1.15;
    /// <summary>„Wróć do swoich”: największe przybliżenie i zapas wokół skupiska (kafle).</summary>
    public static double powrotMaxZoom = 16, zapasX = 26, zapasY = 18;
    /// <summary>Kamera za życiem: jak szybko podąża (0..1 na krok) i jak mocno dopasowuje przybliżenie.</summary>
    public static double podazanie = 0.05, dopasowanie = 0.04;
    /// <summary>Automatyczne przybliżenie nie przekracza tego.</summary>
    public static double autoMaxZoom = 20;
    /// <summary>
    /// Za kim idzie kamera: grupa to postacie bliżej siebie niż grupaX × grupaY kafli (łańcuchem). Waga grupy to
    /// liczba postaci plus wagaCzynnosci za każdą, która coś robi (rozkaz, kopanie, modlitwa, walka);
    /// grupa, za którą kamera już idzie, ma przewagę przewagaBiezacej.
    /// </summary>
    public static double grupaX = 10, grupaY = 6, wagaCzynnosci = 0.6, przewagaBiezacej = 1;
    /// <summary>Przybliżenie przy pokazywaniu miejsca (rada, wpis kroniki, alarm) — co najmniej tyle.</summary>
    public static double pokazZoom = 10;
}

/// <summary>
/// CZAS GRY — jeden, zwykły: tyle tików świata na sekundę, niezależnie od odświeżania ekranu
/// (dawniej liczony w klatkach — na ekranie 120 Hz świat biegł dwa razy szybciej).
/// Przyspieszanie i zwalnianie jest tylko w trybie deweloperskim.
/// </summary>
public static class TEMPO
{
    /// <summary>Tików świata na sekundę zwykłego czasu (TIKOW_NA_MINUTE / 60).</summary>
    public static double tikowNaSekunde = 120;
    /// <summary>Mnożniki czasu w trybie deweloperskim (przyciski ‹ ›, klawisze + −, okienko dewelopera).</summary>
    public static double[] mnozniki = { 0.25, 0.5, 1, 2, 3, 5, 10, 20 };
    /// <summary>Najwięcej tików w jednej klatce — wolny komputer zwalnia świat zamiast się dusić.</summary>
    public static double maxNaKlatke = 60;
    /// <summary>
    /// Najwięcej milisekund symulacji w jednej klatce (co najmniej jeden tik i tak się liczy). Gdy świat nie nadąża,
    /// zwalnia, a obraz dalej płynie — bez tego zaległe tiki przechodziły na następną klatkę, która przez to była
    /// jeszcze wolniejsza, i gra stawała. Zwykle tik to ułamek milisekundy, więc budżetu nie widać. Przy przyspieszonym
    /// czasie budżet rośnie razem z mnożnikiem.
    /// </summary>
    public static double budzetKlatkiMs = 8;
}

/// <summary>
/// STEROWANIE — w TS „sterowanie palcem” wersji Android. Na komputerze te liczby nie grają roli, ale kod gry
/// je czyta (podpowiedzi klawiszy, przytrzymanie na rycie), więc zostają z tymi samymi wartościami.
/// </summary>
public static class STEROWANIE
{
    /// <summary>Podpowiedzi klawiszy: cyfry przy rytach, „esc”, „P”, klawisze w samouczku i w ustawieniach.</summary>
    public static bool pokazKlawisze = false;
    /// <summary>Przytrzymanie palca na rycie (ms) otwiera jego tablicę w atlasie — zamiast prawego przycisku.</summary>
    public static double przytrzymanieMs = 520;
    /// <summary>Palec, który przesunął się dalej niż tyle px, przewija listę zamiast w nią stukać.</summary>
    public static double progPrzewijania = 10;
    /// <summary>Po wybraniu rytu jego opis (co robi, ile kosztuje) wisi przy nim tyle ms — nie ma „najechania”.</summary>
    public static double opisRytuMs = 2600;
}
}
