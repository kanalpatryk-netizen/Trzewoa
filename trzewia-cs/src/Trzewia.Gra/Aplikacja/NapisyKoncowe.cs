// Oprawa walki, etap 7b (docs/plan-oprawy-cerber.md; użytkownik 22.11, film 4:02): treść napisów końcowych po wygranej
// w Kręgu Trzecim (ekran EkranNapisow). Na razie MIEJSCE na napisy — działy i linijki do wypełnienia. Żeby zmienić
// treść, wystarczy poprawić tę listę: kolejność = kolejność na ekranie, rodzaj linijki decyduje o jej wyglądzie.
namespace Trzewia.Aplikacja
{
    public static class NapisyKoncowe
    {
        /// <summary>Rodzaj linijki: duży tytuł, podtytuł, nagłówek działu, zwykła linijka, odstęp, ostatnia (zostaje na środku).</summary>
        public enum Rodzaj { Tytul, Podtytul, Dzial, Linijka, Odstep, Ostatnia }

        public static readonly (Rodzaj rodzaj, string tekst)[] TEKST =
        {
            (Rodzaj.Tytul, "TRZEWIA"),
            (Rodzaj.Podtytul, "Krąg Trzeci"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Dzial, "POMYSŁ I PROJEKT"),
            (Rodzaj.Linijka, "[do uzupełnienia]"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Dzial, "PROGRAM"),
            (Rodzaj.Linijka, "[do uzupełnienia]"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Dzial, "GRAFIKA"),
            (Rodzaj.Linijka, "[do uzupełnienia]"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Dzial, "MUZYKA I DŹWIĘK"),
            (Rodzaj.Linijka, "[do uzupełnienia]"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Dzial, "PODZIĘKOWANIA"),
            (Rodzaj.Linijka, "[do uzupełnienia]"),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Odstep, ""),
            (Rodzaj.Ostatnia, "Koniec"),
        };
    }
}
