// Port: alpha-1/src/main.ts (start gry) — na razie etap 1: okno, pętla, wejście, licznik F3 i ekran próbny.
using System.Runtime;
using SkiaSharp;
using Trzewia.Aplikacja;
using Trzewia.Aplikacja.Screens;
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
        Uruchomienie.Ustaw(args);
        var sciezki = new Sciezki();
        Rdzen.Gospodarz.Pliki = sciezki;
        Rdzen.Gospodarz.Dane = sciezki;
        Dziennik.Otworz(Sciezki.Gracz,
            $"Trzewia {typeof(Program).Assembly.GetName().Version} — {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
            $"system: {System.Runtime.InteropServices.RuntimeInformation.OSDescription}, .NET {Environment.Version}, " +
            $"procesor: {Environment.ProcessorCount} wątków, argumenty: {string.Join(' ', args)}");
        // sprzątanie pamięci bez długich przerw w trakcie gry (licznik F3 pokazuje, ile ich było)
        GCSettings.LatencyMode = GCLatencyMode.SustainedLowLatency;
        Plotno.Fabryka = new FabrykaSkia();
        try
        {
            using var okno = OknoGry.Otworz();
            Fonts.zaladujKroje();
            if (Uruchomienie.Licznik) ustawienia.licznikWydajnosci = true;
            using var ctx = new PlotnoSkia(okno.Canvas, okno.PikseleW, okno.PikseleH);
            var app = new App(okno, ctx);
            app.zarejestruj(new EkranProby());
            app.start(Uruchomienie.EkranStartowy ?? "proba");
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
            if (okno.Uspione) { okno.Czekaj(50); uspione = true; continue; }
            var teraz = Wydajnosc.Teraz();
            if (uspione) { app.Wznow(teraz); uspione = false; }
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
