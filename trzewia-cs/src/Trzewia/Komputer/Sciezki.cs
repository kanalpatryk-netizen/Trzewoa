using System.Reflection;
using Trzewia.Rdzen;

namespace Trzewia.Komputer;

/// <summary>
/// Gdzie Trzewia.exe trzyma rzeczy. Dane gry (grafika, dźwięki, filmy, kroje, nastawy) leżą w folderze `dane/` obok
/// programu — w wersji jednoplikowej są w środku programu. Rzeczy gracza (zapis, ustawienia, klawisze, osiągnięcia,
/// atlas, dziennik) idą do `Dokumenty\My Games\Trzewia\` (na Linuksie `~/.local/share/Trzewia`), jak w grach ze Steama — nie do folderu gry, który bywa
/// tylko do odczytu (Program Files) i który podmienia się przy aktualizacji.
/// </summary>
public sealed class Sciezki : IPlikiGracza, IDaneGry
{
    /// <summary>Folder z Trzewia.exe.</summary>
    public static readonly string Gra = AppContext.BaseDirectory;

    /// <summary>Folder `dane/` obok programu.</summary>
    public static readonly string Dane = Path.Combine(Gra, "dane");

    /// <summary>
    /// `Dokumenty\My Games\Trzewia` (Windows sam przekierowuje Dokumenty do OneDrive, jeśli tak ustawiono).
    /// Zmienna środowiskowa TRZEWIA_GRACZ podmienia folder — dla testów, żeby nie ruszały prawdziwych zapisów.
    /// </summary>
    public static readonly string Gracz = UstalGracza();

    public string Folder => Gracz;

    static string UstalGracza()
    {
        var wlasny = Environment.GetEnvironmentVariable("TRZEWIA_GRACZ");
        if (!string.IsNullOrEmpty(wlasny)) return wlasny;
        // Linux (10.11, użytkownik gra na Linux Mint): .NET podaje jako „Dokumenty” katalog domowy, więc pliki gracza
        // idą tam, gdzie trzymają je gry na Linuksie: $XDG_DATA_HOME/Trzewia, zwykle ~/.local/share/Trzewia
        if (OperatingSystem.IsLinux())
        {
            var xdg = Environment.GetEnvironmentVariable("XDG_DATA_HOME");
            if (string.IsNullOrEmpty(xdg)) xdg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".local", "share");
            return Path.Combine(xdg, "Trzewia");
        }
        var dokumenty = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        if (string.IsNullOrEmpty(dokumenty)) dokumenty = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        return Path.Combine(dokumenty, "My Games", "Trzewia");
    }

    public string? Czytaj(string nazwa)
    {
        try
        {
            var p = Path.Combine(Gracz, nazwa);
            return File.Exists(p) ? File.ReadAllText(p) : null;
        }
        catch (Exception e) { Dziennik.Pisz($"nie czytam {nazwa}: {e.Message}"); return null; }
    }

    /// <summary>
    /// Zapis atomowy: najpierw do pliku tymczasowego, potem podmiana. Gdy prąd zgaśnie albo OneDrive akurat
    /// synchronizuje, zostaje stary plik albo nowy — nigdy przerwany w połowie.
    /// </summary>
    public bool Zapisz(string nazwa, string tresc)
    {
        try
        {
            Directory.CreateDirectory(Gracz);
            var p = Path.Combine(Gracz, nazwa);
            var tmp = p + ".tmp";
            using (var f = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
            using (var w = new StreamWriter(f, new System.Text.UTF8Encoding(false)))
            {
                w.Write(tresc);
                w.Flush();
                f.Flush(true);
            }
            File.Move(tmp, p, overwrite: true);
            return true;
        }
        catch (Exception e) { Dziennik.Pisz($"nie zapisuję {nazwa}: {e.Message}"); return false; }
    }

    static readonly Assembly Program = typeof(Sciezki).Assembly;

    /// <summary>Plik z dane/, a gdy go nie ma (wersja jednoplikowa) — zasób wbudowany w program.</summary>
    public Stream? Otworz(string sciezka)
    {
        var p = Path.Combine(Dane, sciezka);
        if (File.Exists(p)) return File.OpenRead(p);
        return Program.GetManifestResourceStream("dane/" + sciezka);
    }
}

/// <summary>Przełączniki Trzewia.exe z wiersza poleceń (gracz żadnego nie potrzebuje; są dla twórców i do testów).</summary>
public static class Uruchomienie
{
    /// <summary>"angle" | "opengl" | null — według ustawień.</summary>
    public static string? Droga;
    public static bool Okno, Pomiar, Licznik;
    /// <summary>Rozmiar okna w pikselach ekranu; 0 — okno zmaksymalizowane, jak w wersji Electron.</summary>
    public static int RozmiarW, RozmiarH;
    /// <summary>Zamknij grę po tylu sekundach (0 — bez końca).</summary>
    public static double PoSekundach;
    public static string? Zrzut, EkranStartowy;
    /// <summary>Zapisz wszystkie nastawy do dane/nastawy/*.json i zakończ.</summary>
    public static bool WypiszNastawy;

    public const string Pomoc = """
        Trzewia.exe [przełączniki]
          --dev            tryb deweloperski (w TS: npm run dev): okienko dewelopera, przyspieszanie czasu, dziennik na konsoli
          --konsola        wpisy dziennika także na konsolę
          --angle          karta przez ANGLE (Direct3D 11) — domyślnie na Windows
          --opengl         karta przez zwykły OpenGL
          --okno           start w oknie, nawet gdy w ustawieniach jest pełny ekran
          --rozmiar WxH    rozmiar okna w pikselach (np. 1920x1080)
          --licznik        licznik wydajności (F3) od startu
          --po N           zamknij po N sekundach (pomiary, testy)
          --zrzut plik.png przed zamknięciem zapisz obraz ostatniej klatki
          --pomiar         przed zamknięciem wypisz wynik licznika F3
          --ekran nazwa    ekran na start (etap 1: „proba”)
          --wypisz-nastawy zapisz wszystkie liczby gry do dane/nastawy/*.json (punkt wyjścia do zmian) i zakończ
        """;

    public static void Ustaw(string[] args)
    {
        for (int i = 0; i < args.Length; i++)
        {
            string a = args[i], nast = i + 1 < args.Length ? args[i + 1] : "";
            switch (a)
            {
                case "--dev": Tryb.Dev = true; break;
                case "--konsola": Tryb.NaKonsole = true; break;
                case "--opengl": Droga = "opengl"; break;
                case "--angle": Droga = "angle"; break;
                case "--okno": Okno = true; break;
                case "--pomiar": Pomiar = true; break;
                case "--licznik": Licznik = true; break;
                case "--ekran": EkranStartowy = nast; i++; break;
                case "--po": PoSekundach = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--zrzut": Zrzut = nast; i++; break;
                case "--rozmiar":
                    var cz = nast.Split('x', 'X', '×');
                    if (cz.Length == 2) { RozmiarW = int.Parse(cz[0]); RozmiarH = int.Parse(cz[1]); }
                    i++; break;
                case "--wypisz-nastawy": WypiszNastawy = true; break;
                case "--pomoc": case "-h": case "--help": Console.WriteLine(Pomoc); Environment.Exit(0); break;
            }
        }
    }
}
