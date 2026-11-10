using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/render/fonts.ts
// Kroje te same co w TS (EB Garamond, Cormorant Garamond, Almendra, przycięte do znaków gry), wypisane z base64
// WOFF2 do dane/czcionki/*.ttf narzędziem narzedzia/kroje.py.
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek
{

public static class Fonts
{
    public const string KROJ = "\"Trzewia Tekst\", \"EB Garamond\", \"Palatino Linotype\", Palatino, Georgia, serif";
    public const string KROJ_TYTUL = "\"Trzewia Tytul\", \"Cormorant Garamond\", \"Iowan Old Style\", Georgia, serif";
    public const string KROJ_PISMO = "\"Trzewia Pismo\", \"Trzewia Tekst\", Georgia, serif";

    static bool zaladowane;

    /// <summary>Jak @font-face w TS: rodzina, grubość i krój każdego pliku.</summary>
    public static void zaladujKroje()
    {
        if (zaladowane) return;
        zaladowane = true;
        Dodaj("czcionki/trzewia-tekst.ttf", "Trzewia Tekst", 400, false);
        Dodaj("czcionki/trzewia-tekst-kursywa.ttf", "Trzewia Tekst", 400, true);
        Dodaj("czcionki/trzewia-tytul.ttf", "Trzewia Tytul", 600, false);
        Dodaj("czcionki/trzewia-pismo.ttf", "Trzewia Pismo", 400, false);
    }

    static void Dodaj(string plik, string rodzina, int waga, bool kursywa)
    {
        var dane = Zasoby.Czytaj(plik);
        if (dane == null) { Dziennik.Pisz($"brak kroju {plik} — napisy pójdą krojem zapasowym"); return; }
        Plotno.Fabryka.RejestrujKroj(rodzina, waga, kursywa, dane);
    }
}
}
