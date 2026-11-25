// Oprawa, etap 7d: podgląd nowej postaci ludzkiej (Rysunek/Ludzie) bez gry — tablice PNG do obejrzenia i porównania
// ze starymi arkuszami: wszystkie stroje w kilku wielkościach (nowa obok starej) i wybrane pozy.
using System;
using System.Collections.Generic;
using System.IO;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Rysunek.Duszki;
using Trzewia.Rysunek.Ludzie;
using Trzewia.Skia;

static class PodgladLudzi
{
    /// <summary>Stroje w podglądzie: nazwa arkusza starej postaci (do porównania) i strój nowej.</summary>
    internal static readonly (string arkusz, Stroj stroj)[] STROJE =
    {
        ("robotnik-3", new Stroj { rola = "robotnik", wzor = 3 }),
        ("robotnik-4", new Stroj { rola = "robotnik", wzor = 4 }),
        ("robotnik-5", new Stroj { rola = "robotnik", wzor = 5 }),
        ("robotnik-7", new Stroj { rola = "robotnik", wzor = 7 }),
        ("robotnik-8", new Stroj { rola = "robotnik", wzor = 8 }),
        ("robotnik-3-helm", new Stroj { rola = "robotnik", wzor = 3, helm = true }),
        ("pobozny-1", new Stroj { rola = "pobozny", wzor = 1 }),
        ("pobozny-2", new Stroj { rola = "pobozny", wzor = 2 }),
        ("rycerz-6-z0", new Stroj { rola = "rycerz", wzor = 6, zbroja = 0 }),
        ("rycerz-6-z1", new Stroj { rola = "rycerz", wzor = 6, zbroja = 1 }),
        ("rycerz-6-z2", new Stroj { rola = "rycerz", wzor = 6, zbroja = 2 }),
        ("rycerz-6-z3", new Stroj { rola = "rycerz", wzor = 6, zbroja = 3 }),
        ("rycerz-6-z4", new Stroj { rola = "rycerz", wzor = 6, zbroja = 4 }),
        ("rycerz-6-z5", new Stroj { rola = "rycerz", wzor = 6, zbroja = 5 }),
        ("", new Stroj { rola = "zarlok" }),
        ("", new Stroj { rola = "dante" }),
        ("", new Stroj { rola = "wergiliusz" }),
    };

    static Rekwizyty RekwizytyStroju(Stroj s) => s.rola switch
    {
        "robotnik" => new Rekwizyty { wP = Narzedzie.Kilof, katP = Math.PI - 0.3 },
        "pobozny" => new Rekwizyty { wL = Narzedzie.Ksiega, katL = 1.2, otwarta = 0, wP = Narzedzie.Brak },
        "rycerz" => new Rekwizyty { wP = Narzedzie.Miecz, katP = 0.0 },
        "wergiliusz" => new Rekwizyty { wP = Narzedzie.Brak },
        _ => default,
    };

    public static int Uruchom(string katalog)
    {
        Directory.CreateDirectory(katalog);
        Plotno.Fabryka = new FabrykaSkia();
        Fonts.zaladujKroje();
        // „stare” w podglądzie to stare arkusze: Duszek.Daj bez nowych ludzi (nowa postać rysuje się wprost)
        var ludzie = Trzewia.Visual.VisualConfig.Ludzie;
        Trzewia.Visual.VisualConfig.Ludzie = false;
        Stroje(Path.Combine(katalog, "ludzie-stroje.png"));
        // stare arkusze (rysunek TS bez ryciny) — wzór ruchu każdej animacji
        var rycina = Trzewia.Visual.VisualConfig.Rycina;
        Trzewia.Visual.VisualConfig.Rycina = false;
        foreach (var a in new[] { "robotnik-3", "pobozny-1", "rycerz-6-z5", "rycerz-6-z0-sciecie" })
            Arkusz(Path.Combine(katalog, "stare-" + a + ".png"), Duszek.Daj(a), 80);
        Trzewia.Visual.VisualConfig.Rycina = rycina;
        Trzewia.Visual.VisualConfig.Ludzie = ludzie;
        // nowe animacje: te same nazwy i liczby klatek co w starych arkuszach
        foreach (var (arkusz, stroj) in new[] { ("robotnik-3", STROJE[0].stroj), ("pobozny-1", STROJE[6].stroj), ("rycerz-6-z5", STROJE[13].stroj), ("rycerz-6-z0-sciecie", STROJE[8].stroj) })
            Animacje(Path.Combine(katalog, "nowe-" + arkusz + ".png"), Duszek.Daj(arkusz), stroj, 80);
        // koszt rysunku na żywo (żarłoki w filmie i zabijaniu, Dante, Wergiliusz): średni czas jednej postaci
        {
            using var p = new PlotnoSkia(400, 300);
            var zarlok = new Stroj { rola = "zarlok" };
            foreach (var h in new[] { 40.0, 80.0, 160.0 })
            {
                var z = System.Diagnostics.Stopwatch.StartNew();
                const int N = 300;
                for (int i = 0; i < N; i++)
                {
                    var k = Trzewia.Rysunek.Ludzie.Animacje.Klatka(zarlok, "idzie", i / (double)N);
                    p.setTransform(1, 0, 0, 1, 200, 250);
                    Postac.Rysuj(p, h, k.p, k.r, zarlok);
                }
                Console.WriteLine($"żarłok na żywo, wzrost {h} px: {z.Elapsed.TotalMilliseconds / N:F3} ms na postać");
            }
        }
        Console.WriteLine($"podgląd ludzi: {katalog}");
        return 0;
    }

    /// <summary>Faza albo postęp, w którym gra pokazuje klatkę `i` animacji (pętle i przebiegi „w środkach” — środek przedziału).</summary>
    internal static double UKlatki(AnimacjaDuszka a, int i) =>
        a.petla || a.srodki ? (i + 0.5) / a.n : a.n <= 1 ? 0 : (double)i / (a.n - 1);

    /// <summary>Nowe animacje (Rysunek/Ludzie/Animacje.cs) w układzie starego arkusza `wzor`: wiersz na animację.</summary>
    static void Animacje(string plik, Duszek? wzor, Stroj s, double h)
    {
        if (wzor == null) return;
        var anim = new List<AnimacjaDuszka>(wzor.animacje.Values);
        anim.Sort((a, b) => a.od.CompareTo(b.od));
        var hh = h * (s.rola == "rycerz" ? 1.3 : 1);
        int maxN = 0; foreach (var a in anim) maxN = Math.Max(maxN, a.n);
        double kol = hh * 0.95, wiersz = hh * 1.45;
        int W = (int)(150 + maxN * kol), H = (int)(anim.Count * wiersz + 20);
        using var p = new PlotnoSkia(W, H);
        Tlo(p, W, H);
        for (int i = 0; i < anim.Count; i++)
        {
            var a = anim[i];
            double y = 10 + (i + 1) * wiersz - hh * 0.25;
            p.font = $"12px {Fonts.KROJ}"; p.fillStyle = Barwa.Rgba(220, 200, 170, 0.9); p.textAlign = "left"; p.textBaseline = "alphabetic";
            p.fillText($"{a.nazwa} ({a.n}, {a.ster})", 6, y - hh * 0.4);
            for (int k = 0; k < a.n; k++)
            {
                var kl = Trzewia.Rysunek.Ludzie.Animacje.Klatka(s, a.nazwa, UKlatki(a, k));
                p.save(); p.translate(Math.Round(150 + k * kol + kol / 2), Math.Round(y));
                // ziemia
                p.fillStyle = Barwa.Rgba(70, 56, 44); p.fillRect(-kol / 2 + 2, 0, kol - 4, 2);
                Postac.Rysuj(p, hh, kl.p, kl.r, s);
                p.restore();
            }
        }
        p.ZapiszPng(plik);
    }

    /// <summary>Każda animacja arkusza w osobnym wierszu, klatka po klatce (wysokość postaci h, rycerz ×1,3).</summary>
    static void Arkusz(string plik, Duszek? d, double h)
    {
        if (d == null) return;
        var anim = new List<AnimacjaDuszka>(d.animacje.Values);
        anim.Sort((a, b) => a.od.CompareTo(b.od));
        var hh = h * d.mnoznik;
        int maxN = 0; foreach (var a in anim) maxN = Math.Max(maxN, a.n);
        double kol = hh * 0.95, wiersz = hh * 1.45;
        int W = (int)(150 + maxN * kol), H = (int)(anim.Count * wiersz + 20);
        using var p = new PlotnoSkia(W, H);
        Tlo(p, W, H);
        for (int i = 0; i < anim.Count; i++)
        {
            var a = anim[i];
            double y = 10 + (i + 1) * wiersz - hh * 0.25;
            p.font = $"12px {Fonts.KROJ}"; p.fillStyle = Barwa.Rgba(220, 200, 170, 0.9); p.textAlign = "left"; p.textBaseline = "alphabetic";
            p.fillText($"{a.nazwa} ({a.n}, {a.ster})", 6, y - hh * 0.4);
            for (int k = 0; k < a.n; k++)
            {
                p.save(); p.translate(150 + k * kol + kol / 2, y);
                d.Rysuj(p, a.od + k, hh, true);
                p.restore();
            }
        }
        p.ZapiszPng(plik);
    }

    static void Tlo(IPlotno p, int W, int H)
    {
        var g = p.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, Barwa.Rgba(46, 36, 30)); g.addColorStop(1, Barwa.Rgba(30, 22, 18));
        p.fillStyle = g; p.fillRect(0, 0, W, H);
    }

    static void Napis(IPlotno p, string t, double x, double y, double rozmiar = 13)
    {
        p.font = $"{rozmiar}px {Fonts.KROJ}";
        p.fillStyle = Barwa.Rgba(220, 200, 170, 0.9);
        p.textAlign = "center"; p.textBaseline = "alphabetic";
        p.fillText(t, x, y);
    }

    /// <summary>Stara postać: klatka „stoi” arkusza w wysokości h (jak w grze).</summary>
    static void Stara(IPlotno p, string arkusz, double x, double y, double h)
    {
        if (arkusz == "") return;
        var d = Duszek.Daj(arkusz);
        var a = d?.Animacja("stoi");
        if (d == null || a == null) return;
        p.save(); p.translate(x, y);
        d.Rysuj(p, a.od, h * d.mnoznik, false);
        p.restore();
    }

    static void Nowa(IPlotno p, Stroj s, double x, double y, double h, in Poza poza, in Rekwizyty r)
    {
        p.save(); p.translate(Math.Round(x), Math.Round(y));
        Postac.Rysuj(p, h * (s.rola == "rycerz" ? 1.3 : 1), poza, r, s);
        p.restore();
    }

    static void Stroje(string plik)
    {
        int kol = STROJE.Length, szer = 120;
        int W = kol * szer + 40, H = 980;
        using var p = new PlotnoSkia(W, H);
        Tlo(p, W, H);
        // jasny pas — postać w świetle pochodni
        p.fillStyle = Barwa.Rgba(110, 88, 64); p.fillRect(0, 560, W, 150);
        var poza = Poza.Stoi();
        for (int i = 0; i < kol; i++)
        {
            var (arkusz, s) = STROJE[i];
            double x = 40 + i * szer + szer / 2.0;
            var r = RekwizytyStroju(s);
            Napis(p, arkusz != "" ? arkusz : s.rola, x, 22, 12);
            // duża: nowa (wzrost 104 jak największy poziom rycerza / 1,3) i stara obok niżej
            Nowa(p, s, x, 190, 104, poza, r);
            Stara(p, arkusz, x, 340, 104);
            // średnie i małe: nowa | stara
            double[] wys = { 56, 40, 28, 21 };
            double yy = 420;
            foreach (var h in wys)
            {
                Nowa(p, s, x - 22, yy, h, poza, r);
                Stara(p, arkusz, x + 22, yy, h);
                yy += h * 1.3 + 14;
            }
            // w świetle
            Nowa(p, s, x - 22, 690, 56, poza, r);
            Stara(p, arkusz, x + 22, 690, 56);
            Nowa(p, s, x, 930, 160, poza, r);
        }
        Napis(p, "nowa", 20, 120, 11); Napis(p, "stara", 20, 280, 11);
        p.ZapiszPng(plik);
    }
}
