// Port: alpha-1/src/main.ts (start gry) — na razie etap 1: okno, pętla, wejście, licznik F3 i ekran próbny.
using System.Reflection;
using System.Runtime;
using SkiaSharp;
using Trzewia.Aplikacja;
using Trzewia.Aplikacja.Screens;
using Trzewia.Nastawy;
using Trzewia.Okno;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Komputer;

/// <summary>
/// Trzewia.exe — gospodarz gry na komputerze: ustawia grze pliki (Sciezki), warstwę rysunku (Skia na karcie),
/// otwiera okno (SDL3) i kręci pętlą klatek. Cała gra jest w bibliotekach Trzewia.Symulacja, Trzewia.Gra
/// i Trzewia.Skia — przy przenosinach do Unity albo Godota ten plik zastępuje skrypt silnika.
/// </summary>
static class Program
{
    [STAThread]
    static int Main(string[] args)
    {
        // najpierw: czy wszystkie pliki gry są z jednej paczki (nowa rozpakowana na starą zostawia stare biblioteki
        // i gra pada dopiero w środku — „Could not load type…”, zgłoszenie użytkownika 15.11)
        if (!JednaPaczka(out var pliki))
        {
            var tresc = "Pliki gry są z różnych wersji Trzewi — nowa paczka została chyba rozpakowana na folder ze starą.\n\n" +
                        "Usuń cały folder gry i rozpakuj paczkę jeszcze raz do pustego folderu. Zapis i ustawienia leżą gdzie " +
                        "indziej (Dokumenty\\My Games\\Trzewia, na Linuksie ~/.local/share/Trzewia) — nic nie przepadnie.\n\n" + pliki;
            Console.Error.WriteLine(tresc);
            try { OknoGry.Komunikat("Trzewia — pliki z różnych wersji", tresc); } catch { /* bez okna — zostaje konsola */ }
            return 1;
        }
        Uruchomienie.Ustaw(args);
        if (Uruchomienie.Oprawa is bool oprawa) Trzewia.Visual.VisualConfig.Wlaczone = oprawa;
        if (Uruchomienie.ZwinietaKsiega) Trzewia.Visual.VisualConfig.ZwinietaKsiega = true;
        if (Uruchomienie.Czytelnosc is bool czyt) Trzewia.Visual.VisualConfig.Czytelnosc = czyt;
        if (Uruchomienie.Uderzenie is bool ud) Trzewia.Visual.VisualConfig.Uderzenie = ud;
        if (Uruchomienie.Przerywniki is bool prz) Trzewia.Visual.VisualConfig.Przerywniki = prz;
        var sciezki = new Sciezki();
        // zrzuty walki bez okna: dane gry z folderu, ale ustawienia domyślne i nic w plikach gracza (Gospodarz.Pliki w pamięci)
        if (Uruchomienie.ZrzutyWalki != null)
        {
            Rdzen.Gospodarz.Dane = sciezki;
            return ZrzutyWalki.Uruchom();
        }
        if (Uruchomienie.FilmPelnejGry != null)
        {
            Rdzen.Gospodarz.Dane = sciezki;
            return FilmPelnejGry.Uruchom();
        }
        Rdzen.Gospodarz.Pliki = sciezki;
        Rdzen.Gospodarz.Dane = sciezki;
        Dziennik.Otworz(Sciezki.Gracz,
            $"Trzewia {typeof(Program).Assembly.GetName().Version} — {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
            $"system: {System.Runtime.InteropServices.RuntimeInformation.OSDescription}, .NET {Environment.Version}, " +
            $"procesor: {Environment.ProcessorCount} wątków, argumenty: {string.Join(' ', args)}");
        if (Uruchomienie.WypiszNastawy) return WypiszNastawy();
        // liczby gry z dane/nastawy/*.json (jeśli są) — zastępują te z kodu (decyzja użytkownika 9.11)
        foreach (var o in NastawyJson.WczytajWszystkie(p => { using var s = sciezki.Otworz(p); return s == null ? null : new StreamReader(s).ReadToEnd(); }))
            Dziennik.Pisz("nastawy: " + o);
        // sprzątanie pamięci bez długich przerw w trakcie gry (licznik F3 pokazuje, ile ich było)
        GCSettings.LatencyMode = GCLatencyMode.SustainedLowLatency;
        Plotno.Fabryka = new FabrykaSkia();
        try
        {
            using var okno = OknoGry.Otworz();
            Fonts.zaladujKroje();
            if (Uruchomienie.Licznik) ustawienia.licznikWydajnosci = true;
            using var ctx = new PlotnoSkia(okno.Canvas, okno.PikseleW, okno.PikseleH);
            using var dzwiek = WyjscieDzwieku.Otworz();
            var app = new App(okno, ctx);
            Rdzen.Gospodarz.UstawPelnyEkran = v => { if (okno.PelnyEkran != v) okno.PrzelaczPelnyEkran(); };
            Rdzen.Gospodarz.OtworzAdres = adres =>
            {
                try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(adres) { UseShellExecute = true }); }
                catch (Exception e) { Dziennik.Pisz($"nie otworzę adresu {adres}: {e.Message}"); }
            };
            app.zarejestruj(new EkranProby());
            // ekran próbny (--ekran proba) bez ładowania; inaczej ładowanie, potem menu (albo ekran z --ekran)
            if (Uruchomienie.EkranStartowy == "proba") app.start("proba");
            else
            {
                Start.Zbuduj(app, Uruchomienie.EkranStartowy);
                app.start("ladowanie");
            }
            Petla(okno, app);
            return 0;
        }
        catch (Exception e)
        {
            Dziennik.Pisz("BŁĄD: " + e);
            try
            {
                OknoGry.Komunikat("Trzewia — błąd",
                    $"Gra napotkała błąd i musi się zamknąć.\n\n{e.Message}\n\nSzczegóły są w pliku:\n{Path.Combine(Sciezki.Gracz, "dziennik.txt")}");
            }
            catch { /* bez okna komunikatu — zostaje dziennik */ }
            return 1;
        }
        finally { Dziennik.Zamknij(); }
    }

    /// <summary>
    /// Znacznik budowy (Directory.Build.props, ZnacznikBudowy) programu i bibliotek gry — w jednej paczce wszędzie ten sam.
    /// Biblioteki ładowane po nazwie, bez sięgania do ich typów (stara biblioteka mogłaby nie mieć tych, których szukamy).
    /// </summary>
    static bool JednaPaczka(out string opis)
    {
        static string Znacznik(Assembly a) => a.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "bez znacznika";
        var moj = Znacznik(typeof(Program).Assembly);
        var sb = new System.Text.StringBuilder($"Trzewia.dll: {moj}\n");
        bool zgodne = true;
        foreach (var n in new[] { "Trzewia.Symulacja", "Trzewia.Gra", "Trzewia.Skia" })
        {
            string z;
            try { z = Znacznik(Assembly.Load(new AssemblyName(n))); }
            catch (Exception e) { z = "nie wczytuje się (" + e.Message + ")"; }
            if (z != moj) zgodne = false;
            sb.Append($"{n}.dll: {z}\n");
        }
        opis = sb.ToString();
        return zgodne;
    }

    /// <summary>--wypisz-nastawy: wszystkie liczby gry do dane/nastawy/*.json (istniejące pliki zostają nietknięte).</summary>
    static int WypiszNastawy()
    {
        var folder = Path.Combine(Sciezki.Dane, "nastawy");
        Directory.CreateDirectory(folder);
        int zapisane = 0;
        foreach (var p in Rejestr.Pliki)
        {
            var plik = Path.Combine(folder, p.Key + ".json");
            if (File.Exists(plik)) { Console.WriteLine($"pomijam (już jest): {plik}"); continue; }
            File.WriteAllText(plik, NastawyJson.Wypisz(p.Value));
            zapisane++;
        }
        Console.WriteLine($"Zapisano {zapisane} plików nastaw w {folder}. Zmień liczby i uruchom grę — zmiany działają od razu.");
        return 0;
    }

    /// <summary>
    /// Pętla klatek (w TS: requestAnimationFrame). Klatka co odświeżenie monitora — SwapWindow czeka na monitor
    /// (vsync); przy limicie klatek gra czeka, aż przyjdzie pora. Zminimalizowane okno nie rysuje i nie zjada procesora.
    /// </summary>
    static void Petla(OknoGry okno, App app)
    {
        var start = Wydajnosc.Teraz();
        bool uspione = false;
        while (!okno.Zamkniete)
        {
            okno.Zdarzenia(app);
            if (okno.Zamkniete) break;
            if (okno.Uspione) { if (!uspione) Mikser.usnij(); okno.Czekaj(50); uspione = true; continue; }
            var teraz = Wydajnosc.Teraz();
            if (uspione) { app.Wznow(teraz); uspione = false; Mikser.wznow(); }
            if (!app.Pora(teraz))
            {
                var ms = app.DoNastepnej(teraz);
                if (ms > 0) Thread.Sleep(TimeSpan.FromMilliseconds(Math.Min(ms, 5)));
                continue;
            }
            bool ostatnia = Uruchomienie.PoSekundach > 0 && teraz - start >= Uruchomienie.PoSekundach * 1000;
            Grafika.PoczatekKlatki();
            app.Klatka(teraz);
            if (ostatnia && Uruchomienie.Zrzut != null) Zrzut(okno, Uruchomienie.Zrzut);
            okno.Pokaz();
            if (ostatnia) break;
        }
        if (Uruchomienie.Pomiar)
        {
            var w = Wydajnosc.licznik.wynik;
            Console.WriteLine($"kl/s {w.fps:F1} · klatka {w.klatkaMs:F2} ms · najdłuższa {w.najdluzszaMs:F1} ms · procesor {w.cpuMs:F2} ms · " +
                              $"karta {(w.kartaMs >= 0 ? w.kartaMs.ToString("F2") + " ms" : "—")} · wysłanie {w.wyslanieMs:F2} ms · " +
                              $"czekanie {w.czekanieMs:F2} ms · GC {w.gc0}/{w.gc2} · {InfoKarty.Nazwa} ({InfoKarty.Droga})");
            for (int i = 0; i < Wydajnosc.CZESCI.Length; i++)
                Console.WriteLine($"  {Wydajnosc.NazwaCzesci(Wydajnosc.CZESCI[i]),-17} {w.czesci[i]:F3} ms");
        }
    }

    /// <summary>Obraz ostatniej klatki do PNG (przed wysłaniem na ekran — potem bufor okna jest nieokreślony).</summary>
    static void Zrzut(OknoGry okno, string plik)
    {
        Grafika.Kontekst!.Flush();
        using var bmp = new SKBitmap(new SKImageInfo(okno.PikseleW, okno.PikseleH, SKColorType.Rgba8888, SKAlphaType.Premul));
        if (!okno.Powierzchnia.ReadPixels(bmp.Info, bmp.GetPixels(), bmp.RowBytes, 0, 0)) { Dziennik.Pisz("zrzut: nie odczytałem pikseli"); return; }
        using var img = SKImage.FromBitmap(bmp);
        using var d = img.Encode(SKEncodedImageFormat.Png, 100);
        File.WriteAllBytes(plik, d.ToArray());
        Dziennik.Pisz($"zrzut: {plik}");
    }
}
