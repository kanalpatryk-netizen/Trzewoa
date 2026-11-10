// Port: alpha-1/src/core/keybinds.ts
// Klawisze nazywają się jak KeyboardEvent.key w przeglądarce (' ', 'Escape', 'ArrowUp', '+', 'q'…) — tłumaczy je
// Okno/Klawisze.cs — więc plik klawiszy (Dokumenty\My Games\Trzewia\klawisze.json) ma ten sam format co w TS.
using System;
using System.Collections.Generic;

namespace Trzewia.Rdzen
{

/// <summary>Wszystkie akcje gry z przypisanymi klawiszami. Alpha 0.2: bez zmiany klawiszy w ustawieniach (zostało „Przywróć domyślne”).</summary>
public enum Akcja
{
    pauza, szybciej, wolniej, zapis, wczytaj, menu,
    zasiej, szept, znak,
    narzedzie1, narzedzie2, narzedzie3, narzedzie4,
    kamera, przyblizenie, oddalenie, odNowa, legenda, zapiski,
    robotnicy, pobozni, rycerz, kopDroge, odwolaj, planuj,
}

public sealed class OpisAkcji
{
    public readonly Akcja akcja; public readonly string nazwa, opis;
    public OpisAkcji(Akcja akcja, string nazwa, string opis) { this.akcja = akcja; this.nazwa = nazwa; this.opis = opis; }
}

public static class Keybinds
{
    public static readonly OpisAkcji[] AKCJE =
    {
        new(Akcja.menu, "Menu", "wraca do menu — działa też P oraz esc"),
        new(Akcja.pauza, "Pauza i plan", "czas staje; rozkazy wydane w pauzie dzieją się naraz po jej zdjęciu"),
        new(Akcja.szybciej, "Szybciej", "tylko w trybie deweloperskim: przyspiesza czas (do ×20)"),
        new(Akcja.wolniej, "Wolniej", "tylko w trybie deweloperskim: zwalnia czas (do ×¼)"),
        new(Akcja.zasiej, "Nakarm", "wiadro z jedzeniem tam, gdzie wskażesz"),
        new(Akcja.szept, "Szepnij", "módl się albo prorokuj — jednej głowie"),
        new(Akcja.znak, "Cud", "objawienie — oddanie nacji rośnie"),
        new(Akcja.robotnicy, "Robotnicy", "zaznacza robotników (drugi raz: kamera do nich); dotknięcie mapy — idź tam, w skałę — kop"),
        new(Akcja.pobozni, "Pobożni", "zaznacza pobożnych (drugi raz: kamera do nich)"),
        new(Akcja.rycerz, "Rycerz", "zaznacza rycerza (drugi raz: kamera do niego)"),
        new(Akcja.kopDroge, "Kop drogę wiernych", "zaznaczeni robotnicy kopią szyb drogi wiernych do krypty"),
        new(Akcja.odwolaj, "Odwołaj rozkaz", "zaznaczeni wracają do swoich zajęć"),
        new(Akcja.planuj, "Wyznacz pomieszczenie", "plan pod kursorem: sypialnia, warsztat, kuźnia, korytarz, szyb (drugi raz — następny szablon)"),
        new(Akcja.narzedzie1, "Narzędzie I", "pierwsze narzędzie wybranego czasownika"),
        new(Akcja.narzedzie2, "Narzędzie II", "drugie narzędzie"),
        new(Akcja.narzedzie3, "Narzędzie III", "trzecie narzędzie"),
        new(Akcja.narzedzie4, "Narzędzie IV", "czwarte narzędzie"),
        new(Akcja.kamera, "Wróć do mieszkańców", "kamera skacze do największego skupiska i znów idzie za życiem"),
        new(Akcja.przyblizenie, "Przybliż", "to samo, co kółko w górę"),
        new(Akcja.oddalenie, "Oddal", "to samo, co kółko w dół"),
        new(Akcja.zapis, "Zapisz", "stan góry do pamięci przeglądarki"),
        new(Akcja.wczytaj, "Wczytaj", "wraca do ostatniego zapisu"),
        new(Akcja.odNowa, "Od nowa", "nowa góra — dopiero po zakończeniu"),
        new(Akcja.legenda, "Klucz do ryciny", "pokazuje, co znaczy każdy znak na płycie"),
        new(Akcja.zapiski, "Zapiski", "cała kronika; kliknięcie we wpis przenosi tam wzrok"),
    };

    /// <summary>
    /// Domyślne klawisze w kolejności z TS (obiekt DOMYSLNE) — w tej kolejności akcjaDlaKlawisza szuka przypisania,
    /// jak Object.keys(klawisze) w przeglądarce.
    /// </summary>
    static readonly (Akcja akcja, string klawisz)[] DOMYSLNE =
    {
        (Akcja.menu, "Escape"), (Akcja.pauza, " "), (Akcja.szybciej, "+"), (Akcja.wolniej, "-"),
        (Akcja.zasiej, "1"), (Akcja.szept, "2"), (Akcja.znak, "3"),
        (Akcja.narzedzie1, "q"), (Akcja.narzedzie2, "w"), (Akcja.narzedzie3, "e"), (Akcja.narzedzie4, "r"),
        (Akcja.kamera, "c"), (Akcja.przyblizenie, "]"), (Akcja.oddalenie, "["),
        (Akcja.zapis, "z"), (Akcja.wczytaj, "x"), (Akcja.odNowa, "n"), (Akcja.legenda, "l"), (Akcja.zapiski, "k"),
        (Akcja.robotnicy, "a"), (Akcja.pobozni, "s"), (Akcja.rycerz, "d"), (Akcja.kopDroge, "g"), (Akcja.odwolaj, "v"), (Akcja.planuj, "b"),
    };

    const string PLIK = "klawisze.json";

    /// <summary>Przypisania: akcja → klawisz (pusty — bez klawisza).</summary>
    public static readonly Dictionary<Akcja, string> klawisze = Wczytaj();

    static Dictionary<Akcja, string> Domyslne()
    {
        var d = new Dictionary<Akcja, string>();
        foreach (var (a, k) in DOMYSLNE) d[a] = k;
        return d;
    }

    static Dictionary<Akcja, string> Wczytaj()
    {
        var k = Domyslne();
        try
        {
            var raw = Gospodarz.Pliki.Czytaj(PLIK);
            if (raw == null) return k;
            if (!(Json.Czytaj(raw) is Dictionary<string, object?> z)) return k;
            foreach (var para in z)
                if (Enum.TryParse<Akcja>(para.Key, out var a) && Enum.IsDefined(typeof(Akcja), a)) k[a] = para.Value as string ?? "";
        }
        catch (Exception e) { Dziennik.Pisz($"klawisze nieczytelne, biorę domyślne: {e.Message}"); }
        return k;
    }

    static void Zapisz()
    {
        var z = new Dictionary<string, object?>();
        foreach (var (a, _) in DOMYSLNE) z[a.ToString()] = klawisze[a];
        Gospodarz.Pliki.Zapisz(PLIK, Json.Pisz(z));
    }

    public static void przypisz(Akcja akcja, string klawisz)
    {
        foreach (var (a, _) in DOMYSLNE)
            if (klawisze[a] == klawisz && a != akcja) klawisze[a] = "";   // klawisz należy do jednej akcji
        klawisze[akcja] = klawisz;
        Zapisz();
    }

    public static void przywrocDomyslne()
    {
        foreach (var (a, k) in DOMYSLNE) klawisze[a] = k;
        Zapisz();
    }

    /// <summary>Nazwa klawisza do wyświetlenia na ryciny sposób.</summary>
    public static string nazwaKlawisza(string k)
    {
        if (string.IsNullOrEmpty(k)) return "—";
        if (k == " ") return "spacja";
        if (k == "Escape") return "esc";
        if (k == "ArrowUp") return "↑";
        if (k == "ArrowDown") return "↓";
        if (k == "ArrowLeft") return "←";
        if (k == "ArrowRight") return "→";
        return k.Length == 1 ? k.ToUpperInvariant() : k;
    }

    /// <summary>Klawisze, które działają zawsze, o ile gracz nie przypisał ich do czegoś innego.</summary>
    static readonly Dictionary<string, Akcja> ZAPASOWE = new Dictionary<string, Akcja> { ["Escape"] = Akcja.menu, ["p"] = Akcja.menu };

    public static Akcja? akcjaDlaKlawisza(string k)
    {
        var low = k.Length == 1 ? k.ToLowerInvariant() : k;
        foreach (var (a, _) in DOMYSLNE)
        {
            var bind = klawisze[a];
            if (string.IsNullOrEmpty(bind)) continue;
            if (bind == low || bind == k) return a;
        }
        if (ZAPASOWE.TryGetValue(low, out var zapas) || ZAPASOWE.TryGetValue(k, out zapas)) return zapas;
        return null;
    }
}
}
