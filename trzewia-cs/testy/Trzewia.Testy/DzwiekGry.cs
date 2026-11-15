using System.Diagnostics;
using Trzewia.Aplikacja;
using Trzewia.Dzwieki;
using Trzewia.Rdzen;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Dźwięk gry z plików (Dzwieki/Silnik.cs, Aplikacja/Dzwiek.cs): dekodowanie co do próbki (długość jak w ffmpeg) i scena
/// jak w grze — menu, zejście do gry, praca, wiara, pauza, alarm, głosy — zmiksowana do testy/wyniki/dzwiek-gry.wav.
/// Dźwięk musi być (nie cisza), bez przesterowania, a miks bloku dużo szybszy niż czas, który gra.
/// </summary>
public class DzwiekGry
{
    readonly ITestOutputHelper wyj;
    public DzwiekGry(ITestOutputHelper wyj) { this.wyj = wyj; }

    sealed class DaneZFolderu : IDaneGry
    {
        readonly string folder;
        public DaneZFolderu(string folder) { this.folder = folder; }
        public Stream? Otworz(string sciezka)
        {
            var p = Path.Combine(folder, sciezka.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(p) ? File.OpenRead(p) : null;
        }
    }

    [Fact]
    public void Dekodowanie()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        // długości z ffmpeg (który odcina wypełnienie kodera według nagłówka LAME)
        Assert.Equal(104177, Biblioteka.Wez("gesty/klik.mp3").Result!.ramek);
        using var p = Biblioteka.Petla("muzyka/niepokoj/pomruk-petla.mp3")!;
        Assert.Equal(1440000, p.Dlugosc);
    }

    [Fact]
    public void Scena()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        SettingsStore.ustawienia.glosnosc = 0.7;
        var s = Silnik.Ten;
        s.wlaczony = true;
        // wszystkie jednorazowe dekodują się z góry — test miksuje szybciej niż czas płynie, więc nie może czekać na dekoder
        var wszystkie = Directory.GetFiles(Path.Combine(Sciezka.Testy, "..", "dane", "dzwieki"), "*.mp3", SearchOption.AllDirectories)
            .Select(f => Path.GetRelativePath(Path.Combine(Sciezka.Testy, "..", "dane", "dzwieki"), f).Replace('\\', '/'))
            .Where(f => !f.EndsWith("-petla.mp3") && !f.StartsWith("nagrania/")).ToList();
        Task.WaitAll(wszystkie.Select(Biblioteka.Wez).ToArray());

        var dzwiek = new Dzwiek(); var muzyka = new Muzyka(); var gesty = new Gesty();
        gesty.start(); dzwiek.start(); muzyka.start();
        muzyka.ustawScene("menu");
        const int BLOK = 512;
        var bufor = new float[BLOK * 2];
        var wynik = new List<float>();
        double najdluzszy = 0, razem = 0; int bloki = 0;
        var zegar = Stopwatch.StartNew();
        void graj(double sekundy, Action? coKlatke = null)
        {
            double koniec = s.czas + sekundy, nastKlatka = s.czas;
            while (s.czas < koniec)
            {
                if (s.czas >= nastKlatka) { coKlatke?.Invoke(); muzyka.krok(); nastKlatka += 1 / 60.0; }
                var t0 = zegar.Elapsed.TotalMilliseconds;
                s.Mieszaj(bufor, BLOK);
                var dt = zegar.Elapsed.TotalMilliseconds - t0;
                najdluzszy = Math.Max(najdluzszy, dt); razem += dt; bloki++;
                wynik.AddRange(bufor);
            }
        }
        graj(6);                                                  // menu: akordy, pomruk, dzwon
        gesty.klik();
        muzyka.ustawScene("gra"); muzyka.ustawNapiecie(0.3);      // zejście do gry
        graj(8, () => dzwiek.update(0.4, 0.6, 0.5, 0.6, 0.2, false));
        gesty.glosLudu("rycerz", "potwierdzenie", -0.3);
        gesty.wykonanie(3, 1);
        dzwiek.toll(); dzwiek.wiadro();
        graj(4, () => dzwiek.update(0.6, 0.8, 0.7, 0.6, 0.2, false));
        Mikser.zawies(1); gesty.pauza(true, false);               // pauza: świat zza skały, ton zawieszenia
        graj(5, () => dzwiek.update(0.6, 0.8, 0.7, 0.6, 0.2, true));
        gesty.pauza(false, false); Mikser.zawies(0);
        gesty.alarm(true);
        gesty.glosOdmowy("pobozny", 0.4);
        muzyka.ustawNapiecie(0.9);
        graj(10, () => dzwiek.update(0.9, 0.2, 0.9, 0.5, 0.9, false));

        var plik = Path.Combine(Sciezka.Testy, "wyniki", "dzwiek-gry.wav");
        Directory.CreateDirectory(Path.GetDirectoryName(plik)!);
        ZapiszWav(plik, wynik);
        float szczyt = wynik.Max(Math.Abs);
        double rms = Math.Sqrt(wynik.Average(x => (double)x * x));
        // cisza w oknach po 1 s — żadne nie może być martwe
        int okno = Mp3.SR * 2, cichych = 0;
        for (int i = 0; i + okno <= wynik.Count; i += okno) if (Math.Sqrt(wynik.Skip(i).Take(okno).Average(x => (double)x * x)) < 1e-4) cichych++;
        wyj.WriteLine($"{wynik.Count / 2 / (double)Mp3.SR:F1} s dźwięku, szczyt {20 * Math.Log10(szczyt):F1} dBFS, RMS {20 * Math.Log10(rms):F1} dBFS, cichych sekund {cichych}");
        wyj.WriteLine($"miks bloku {BLOK} ramek ({BLOK * 1000.0 / Mp3.SR:F1} ms): średnio {razem / bloki:F3} ms, najdłużej {najdluzszy:F2} ms");
        Assert.True(szczyt <= 1.0f, "przesterowanie");
        Assert.True(rms > 1e-3, "cisza");
        Assert.Equal(0, cichych);
        Assert.True(razem / bloki < BLOK * 1000.0 / Mp3.SR / 4, "miks za wolny");
        s.wlaczony = false;
    }

    static void ZapiszWav(string plik, List<float> probki)
    {
        using var f = new BinaryWriter(File.Create(plik));
        int n = probki.Count;
        f.Write("RIFF"u8); f.Write(36 + n * 2); f.Write("WAVE"u8); f.Write("fmt "u8); f.Write(16); f.Write((short)1); f.Write((short)2);
        f.Write(Mp3.SR); f.Write(Mp3.SR * 4); f.Write((short)4); f.Write((short)16); f.Write("data"u8); f.Write(n * 2);
        foreach (var x in probki) f.Write((short)Math.Clamp(Math.Round(x * 32767), -32768, 32767));
    }
}
