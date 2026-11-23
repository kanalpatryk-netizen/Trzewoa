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
    /// <summary>Oprawa walki (Komputer/ZrzutyWalki.cs): katalog na zrzuty walki z bossem bez okna; null — zwykła gra.</summary>
    public static string? ZrzutyWalki;
    /// <summary>Ziarno partii zrzutów (domyślnie 3) i odstęp zwykłych zrzutów w sekundach gry (domyślnie 0,5).</summary>
    public static double? Ziarno;
    public static double CoIleS;
    /// <summary>Okno zapisu zrzutów walki: od tylu sekund od początku zapisu, najdłużej tyle sekund (0 — do końca).</summary>
    public static double OdS, NajdluzejS;
    /// <summary>Nowa oprawa walki (Visual/VisualConfig.cs) na starcie: true/false; null — domyślnie (włączona). W grze: F9.</summary>
    public static bool? Oprawa;
    /// <summary>Oprawa, etap 2: księga zwinięta w walce z bossem (VisualConfig.ZwinietaKsiega) — domyślnie wyłączona.</summary>
    public static bool ZwinietaKsiega;
    /// <summary>Oprawa, etap 2: sama czytelność (VisualConfig.Czytelnosc) włączona albo wyłączona — do pomiaru jej kosztu.</summary>
    public static bool? Czytelnosc;
    /// <summary>Oprawa, etap 3: samo „uderzenie” (VisualConfig.Uderzenie) włączone albo wyłączone — do pomiaru jego kosztu.</summary>
    public static bool? Uderzenie;
    /// <summary>Oprawa, etap 4: same przerywniki (VisualConfig.Przerywniki) włączone albo wyłączone — do pomiaru kosztu.</summary>
    public static bool? Przerywniki;
    /// <summary>Oprawa, etap 5: sam styl „rycina” (VisualConfig.Rycina) włączony albo wyłączony — do pomiaru kosztu.</summary>
    public static bool? Rycina;
    /// <summary>Walka w Kręgu: true — według wzorów użytkownika (WalkaWzor), false — stara, jak w TS; null — domyślnie.</summary>
    public static bool? WalkaWzory;
    /// <summary>Zmiany Kręgu po porcie (ZmianyKregu: bez Cieni, naprawy, etap 6) włączone albo wyłączone (Krąg jak w TS).</summary>
    public static bool? ZmianyKregu;
    /// <summary>Zrzuty walki: ile sekund przed pęknięciem pieczęci zacząć (domyślnie 3).</summary>
    public static double? PrzedS;
    /// <summary>Zrzuty walki jako film: tylko klatki co --co-ile (bez serii przy zdarzeniach) — równy odstęp do wideo.</summary>
    public static bool Film;
    /// <summary>Tryb Kręgu Trzeciego (Cerber) zamiast Alphy 1 — na razie tylko dla zrzutów walki (--krag).</summary>
    public static bool Krag;
    /// <summary>Oprawa, etap 7b: zamiast walki same trzy przerywniki ścięcia głów, klatka co --co-ile (domyślnie 0,1 s).</summary>
    public static bool PodgladPrzerywnikow;
    /// <summary>Oprawa, etap 7c: zamiast walki wstęp Kręgu — film (okno --od/--najdluzej) i scena wejścia, klatka co --co-ile.</summary>
    public static bool PodgladWstepu;
    /// <summary>Film całej partii (menu, zmiana trybu, wstęp, budowa w przyspieszeniu, walka, kronika) — katalog na klatki.</summary>
    public static string? FilmPelnejGry;

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
          --ekran nazwa    bez filmu intro, po ładowaniu od razu ten ekran: gra (nowa partia), samouczek, ustawienia,
                           osiagniecia, bestiariusz (atlas), menu; „proba” — ekran próbny bez ładowania
          --wypisz-nastawy zapisz wszystkie liczby gry do dane/nastawy/*.json (punkt wyjścia do zmian) i zakończ
          --oprawa wl|wyl  nowa oprawa walki z bossem na starcie włączona albo wyłączona (w grze przełącza F9)
          --zwinieta-ksiega  w walce z bossem księga zwinięta do paska (próba z planu oprawy, domyślnie wyłączona)
          --czytelnosc wl|wyl  sama czytelność walki (etap 2 oprawy) włączona albo wyłączona
          --uderzenie wl|wyl   samo „uderzenie” (etap 3 oprawy: zatrzymanie trafień, wstrząs, cząsteczki) włączone albo wyłączone
          --przerywniki wl|wyl same przerywniki (etap 4 oprawy: wejście/śmierć bossa) włączone albo wyłączone
          --rycina wl|wyl    sam styl „rycina” (etap 5 oprawy: zestaw grafik z tools/ink-pipeline) włączony albo wyłączony
          --walka stara|wzory
                           walka w Kręgu: stara (jak w wersji TS) albo według wzorów (domyślnie: wzory)
          --krag-zmiany wl|wyl
                           zmiany Kręgu po porcie (bez Cieni Żarłoków, naprawy błędów, ataki głów, karmienie, dłoń,
                           wybór głowy) włączone albo wyłączone — wyłączone: Krąg jak w wersji TS (domyślnie: wl)
          --przed S          zrzuty walki: zacznij S sekund przed pęknięciem pieczęci (domyślnie 3)
          --film             zrzuty walki: tylko klatki co --co-ile, bez serii przy zdarzeniach, JPEG (do złożenia filmu)
          --zrzuty-walki KATALOG
                           bez okna: bot gra partię do walki z bossem i zapisuje klatki PNG i klatki.json (porównania
                           oprawy przed/po; rozmiar z --rozmiar, domyślnie 1920x1080); z nim:
          --ziarno N       ziarno partii (domyślnie 3)
          --krag           tryb Kręgu Trzeciego (Cerber) zamiast Alphy 1
          --co-ile S       zwykłe zrzuty co S sekund gry (domyślnie 0.5); przy zdarzeniach — seria klatka po klatce
          --od S, --najdluzej S
                           zapisuj dopiero od S sekund zapisu / kończ po S sekundach (szybkie próby strojenia)
          --podglad-przerywnikow
                           zamiast walki same trzy przerywniki ścięcia głów Cerbera (pitbull, wilk, doberman), klatka
                           co --co-ile s filmu (domyślnie 0.1), JPEG — do szybkiego obejrzenia bez rozgrywania partii
          --podglad-wstepu zamiast walki wstęp Kręgu: film (od --od s, najwyżej --najdluzej s) i scena wejścia
                           (szóstka idzie do szybu), klatka co --co-ile s (domyślnie 0.5), JPEG
          --film-pelny KATALOG
                           bez okna: cała partia Kręgu Trzeciego od menu — zmiana trybu, „Nowa gra”, wstęp (film i
                           scena wejścia), budowa w przyspieszeniu aż do pęknięcia pieczęci, walka z Cerberem w
                           zwykłym tempie (obie cutscenki), kronika; klatki JPEG + klatki.json (--ziarno, --rozmiar)
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
                case "--zrzuty-walki": ZrzutyWalki = nast; i++; break;
                case "--krag": Krag = true; break;
                case "--ziarno": Ziarno = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--co-ile": CoIleS = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--od": OdS = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--najdluzej": NajdluzejS = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--oprawa":
                    Oprawa = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (Oprawa == null) Console.Error.WriteLine($"--oprawa: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--zwinieta-ksiega": ZwinietaKsiega = true; break;
                case "--przed": PrzedS = double.Parse(nast, System.Globalization.CultureInfo.InvariantCulture); i++; break;
                case "--film": Film = true; break;
                case "--podglad-przerywnikow": PodgladPrzerywnikow = true; break;
                case "--podglad-wstepu": PodgladWstepu = true; break;
                case "--uderzenie":
                    Uderzenie = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (Uderzenie == null) Console.Error.WriteLine($"--uderzenie: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--film-pelny": FilmPelnejGry = nast; i++; break;
                case "--przerywniki":
                    Przerywniki = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (Przerywniki == null) Console.Error.WriteLine($"--przerywniki: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--rycina":
                    Rycina = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (Rycina == null) Console.Error.WriteLine($"--rycina: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--walka":
                    WalkaWzory = nast switch { "stara" => false, "wzory" => true, "wzor" => true, _ => null };
                    if (WalkaWzory == null) Console.Error.WriteLine($"--walka: nie rozumiem „{nast}” (stara albo wzory)");
                    i++; break;
                case "--krag-zmiany":
                    ZmianyKregu = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (ZmianyKregu == null) Console.Error.WriteLine($"--krag-zmiany: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--czytelnosc":
                    Czytelnosc = Trzewia.Visual.VisualConfig.Czytaj(nast);
                    if (Czytelnosc == null) Console.Error.WriteLine($"--czytelnosc: nie rozumiem „{nast}” (wl albo wyl)");
                    i++; break;
                case "--pomoc": case "-h": case "--help": Console.WriteLine(Pomoc); Environment.Exit(0); break;
            }
        }
    }
}
