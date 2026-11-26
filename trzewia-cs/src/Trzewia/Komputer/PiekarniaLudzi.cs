// Oprawa, etap 7d: PIEKARNIA ARKUSZY nowych ludzi (Rysunek/Ludzie). Dla każdego starego arkusza ludu z dane/grafika/duszki
// (robotnik-*, pobozny-*, rycerz-6-z*, rycerz-6-z*-sciecie) piecze arkusz o tej samej nazwie do katalogu (w repozytorium:
// dane/grafika/duszki-ludzie): te same animacje (nazwy, klatki, sterowniki — przepisane bez zmian), te same poziomy
// wielkości, klatki narysowane nową postacią w pozach z Animacje.cs. Światła klatek (latarnia grabarza, świeca i aureola
// mnicha, blask księgi, krzyż kostura) — siła i barwa ze starego arkusza, miejsce z nowej postaci (tam, gdzie teraz
// jest latarnia czy księga). Głowa w każdej klatce — z nowej postaci. Strony: WebP 90 (alfa bez strat).
//   Trzewia --wypiecz-ludzi trzewia-cs/dane/grafika/duszki-ludzie [--tylko nazwa]
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek.Ludzie;
using Trzewia.Skia;

static class PiekarniaLudzi
{
    /// <summary>Arkusze ludu do upieczenia (te same nazwy, które wybiera DuszkiLudu.nazwaDuszka).</summary>
    static IEnumerable<string> Arkusze()
    {
        foreach (var w in new[] { 3, 4, 5, 7, 8 }) { yield return "robotnik-" + w; yield return "robotnik-" + w + "-helm"; }
        yield return "pobozny-1"; yield return "pobozny-2";
        for (int z = 0; z <= 5; z++) { yield return "rycerz-6-z" + z; yield return "rycerz-6-z" + z + "-sciecie"; }
    }

    /// <summary>Strój nowej postaci dla nazwy arkusza.</summary>
    internal static Stroj StrojArkusza(string nazwa)
    {
        var cz = nazwa.Split('-');
        switch (cz[0])
        {
            case "robotnik": return new Stroj { rola = "robotnik", wzor = int.Parse(cz[1], CultureInfo.InvariantCulture), helm = nazwa.EndsWith("-helm", StringComparison.Ordinal) };
            case "pobozny": return new Stroj { rola = "pobozny", wzor = int.Parse(cz[1], CultureInfo.InvariantCulture) };
            default: return new Stroj { rola = "rycerz", wzor = 6, zbroja = int.Parse(cz[2].Substring(1), CultureInfo.InvariantCulture) };
        }
    }

    sealed class Anim { public string nazwa = ""; public int od, n; public bool petla, srodki; }

    /// <summary>
    /// Etap 8: animacje, których stare arkusze nie mają — dopisane na końcu, od nowej strony (stare strony wychodzą bajt
    /// w bajt te same). „ciagnie” — ciągnie linę dźwigni (pętla na zegarze ekranu, 1,1 s na szarpnięcie); światła klatek
    /// (latarnia grabarza u pasa) — barwa i siła jak w pierwszej klatce animacji `swiatlaJak`, miejsce z nowej postaci.
    /// </summary>
    static readonly (string nazwa, int n, double ms, double przes, string swiatlaJak)[] DODATKOWE =
    {
        ("ciagnie", 8, 1100, 0.37, "stoi"),
    };

    /// <summary>Faza albo postęp, w którym gra pokazuje klatkę `i` (pętle i przebiegi „w środkach” — środek przedziału).</summary>
    static double UKlatki(Anim a, int i) => a.petla || a.srodki ? (i + 0.5) / a.n : a.n <= 1 ? 0 : (double)i / (a.n - 1);

    public static int Uruchom(string katalog, string? tylko)
    {
        Directory.CreateDirectory(katalog);
        Plotno.Fabryka = new FabrykaSkia();
        var zegar = System.Diagnostics.Stopwatch.StartNew();
        long bajty = 0;
        foreach (var nazwa in Arkusze())
        {
            if (tylko != null && nazwa != tylko) continue;
            var b = Piecz(katalog, nazwa);
            if (b < 0) { Console.Error.WriteLine($"{nazwa}: brak starego arkusza w dane/grafika/duszki"); return 1; }
            bajty += b;
            Console.WriteLine($"{nazwa}: {b / 1024} KiB ({zegar.Elapsed.TotalSeconds:F0} s)");
        }
        Console.WriteLine($"piekarnia ludzi: {bajty / 1024 / 1024.0:F1} MiB w {katalog}, {zegar.Elapsed.TotalSeconds:F0} s");
        return 0;
    }

    /// <summary>Piecze jeden arkusz; zwraca liczbę bajtów stron (−1 — nie ma wzoru).</summary>
    static long Piecz(string katalog, string nazwa)
    {
        var dane = Zasoby.Czytaj("grafika/duszki/" + nazwa + ".json");
        if (dane == null) return -1;
        if (!(Json.Czytaj(Encoding.UTF8.GetString(dane)) is Dictionary<string, object?> wzor)) return -1;
        var stroj = StrojArkusza(nazwa);
        // animacje w kolejności klatek arkusza
        var anim = new List<Anim>();
        var animacje = (Dictionary<string, object?>)wzor["animacje"]!;
        foreach (var kv in animacje)
        {
            var a = (Dictionary<string, object?>)kv.Value!;
            anim.Add(new Anim
            {
                nazwa = kv.Key, od = (int)(double)a["od"]!, n = (int)(double)a["n"]!,
                petla = a.TryGetValue("petla", out var pe) && pe is true, srodki = a.TryGetValue("srodki", out var sr) && sr is true,
            });
        }
        anim.Sort((x, y) => x.od.CompareTo(y.od));
        int klatek = 0; foreach (var a in anim) klatek = Math.Max(klatek, a.od + a.n);
        // etap 8: nowe animacje na końcu (arkusz ścięcia ma tylko ścięcie — bez nich)
        var noweAnimacje = new Dictionary<string, object?>(animacje);
        var stareKlatki = klatek;
        var swiatlaNowych = new Dictionary<int, int>();
        if (!nazwa.EndsWith("-sciecie", StringComparison.Ordinal))
            foreach (var (n, ile, ms, przes, jak) in DODATKOWE)
            {
                if (animacje.ContainsKey(n)) continue;
                anim.Add(new Anim { nazwa = n, od = klatek, n = ile, petla = true });
                noweAnimacje[n] = new Dictionary<string, object?> { ["od"] = (double)klatek, ["n"] = (double)ile, ["ster"] = "czas", ["mnoz"] = 1 / ms, ["przes"] = przes, ["ms"] = ms, ["petla"] = true };
                var wzorSw = animacje.TryGetValue(jak, out var aj) && aj is Dictionary<string, object?> dj ? (int)(double)dj["od"]! : -1;
                for (int i = 0; i < ile; i++) swiatlaNowych[klatek + i] = wzorSw;
                klatek += ile;
            }
        // klatki: poza i rekwizyty
        var kl = new KlatkaPostaci[klatek];
        foreach (var a in anim)
            for (int i = 0; i < a.n; i++) kl[a.od + i] = Animacje.Klatka(stroj, a.nazwa, UKlatki(a, i));

        var poziomyWzoru = (List<object?>)wzor["poziomy"]!;
        var poziomy = new List<object?>();
        List<object?>? glowy = null;
        long bajty = 0;
        for (int pz = 0; pz < poziomyWzoru.Count; pz++)
        {
            var pw = (Dictionary<string, object?>)poziomyWzoru[pz]!;
            var h = (double)pw["h"]!;
            var swiatlaWzoru = pw.TryGetValue("swiatla", out var sw) ? sw as List<object?> : null;
            var (poziom, glowyPoziomu, b) = PieczPoziom(katalog, nazwa, h, stroj, kl, swiatlaWzoru, stareKlatki, swiatlaNowych);
            poziomy.Add(poziom);
            bajty += b;
            // głowa (ułamki wzrostu) — z największego poziomu
            if (pz == poziomyWzoru.Count - 1) glowy = glowyPoziomu;
        }
        var wynik = new Dictionary<string, object?>
        {
            ["wersja"] = 1.0, ["postac"] = wzor["postac"], ["wzor"] = wzor["wzor"], ["wariant"] = wzor["wariant"],
            ["mnoznik"] = wzor["mnoznik"], ["nowi"] = true, ["poziomy"] = poziomy, ["animacje"] = noweAnimacje, ["glowa"] = glowy,
        };
        File.WriteAllText(Path.Combine(katalog, nazwa + ".json"), Json.Pisz(wynik));
        return bajty;
    }

    const int STRONA = 2048, ODSTEP = 2;

    /// <summary>Jeden poziom wielkości: klatki do stron (półki), światła i głowy.</summary>
    static (Dictionary<string, object?> poziom, List<object?> glowy, long bajty) PieczPoziom(string katalog, string nazwa, double h, Stroj s,
        KlatkaPostaci[] kl, List<object?>? swiatlaWzoru, int nowaStronaOd, Dictionary<int, int> swiatlaNowych)
    {
        // brudnopis: stopy w (ox, oy) — miejsce na miecz nad głową w skoku i ciało leżącego
        int W = (int)Math.Ceiling(h * 3.6), H = (int)Math.Ceiling(h * 3.1);
        int ox = W / 2, oy = (int)Math.Round(h * 2.3);
        using var brudnopis = new PlotnoSkia(W, H);
        var ramki = new (int x0, int y0, int x1, int y1)[kl.Length];
        var punkty = new PunktyPostaci[kl.Length];
        for (int i = 0; i < kl.Length; i++)
        {
            brudnopis.setTransform(1, 0, 0, 1, 0, 0);
            brudnopis.clearRect(0, 0, W, H);
            brudnopis.translate(ox, oy);
            punkty[i] = Postac.Rysuj(brudnopis, h, kl[i].p, kl[i].r, s);
            ramki[i] = brudnopis.Zawartosc() ?? (ox, oy, ox + 1, oy + 1);
            var r = ramki[i];
            if (r.x0 <= 0 || r.y0 <= 0 || r.x1 >= W || r.y1 >= H) Console.Error.WriteLine($"  {nazwa} h{h} klatka {i}: postać dotyka brzegu brudnopisu");
        }
        // półki: klatki po kolei, wiersz za wierszem, strona za stroną
        var miejsca = new (int strona, int x, int y)[kl.Length];
        var rozmiary = new List<(int w, int h)>();
        int sx = 0, sy = 0, wiersz = 0, strona = 0, szer = 0;
        for (int i = 0; i < kl.Length; i++)
        {
            int w = ramki[i].x1 - ramki[i].x0, hh = ramki[i].y1 - ramki[i].y0;
            // (etap 8: nowe animacje od nowej strony — stara strona kończy się dokładnie tak, jak kończyła się bez nich,
            // więc stare strony wychodzą bajt w bajt te same)
            if (i == nowaStronaOd && i > 0)
            {
                rozmiary.Add((szer, sy + wiersz));
                strona++; sx = 0; sy = 0; wiersz = 0; szer = 0;
            }
            if (sx + w > STRONA) { sx = 0; sy += wiersz + ODSTEP; wiersz = 0; }
            if (sy + hh > STRONA)
            {
                rozmiary.Add((szer, sy));
                strona++; sx = 0; sy = 0; wiersz = 0; szer = 0;
            }
            miejsca[i] = (strona, sx, sy);
            sx += w + ODSTEP; wiersz = Math.Max(wiersz, hh); szer = Math.Max(szer, sx);
        }
        rozmiary.Add((szer, sy + wiersz));
        // strony: każda klatka narysowana jeszcze raz wprost na swoje miejsce (całe przesunięcie — te same piksele)
        var strony = new List<object?>();
        long bajty = 0;
        for (int st = 0; st < rozmiary.Count; st++)
        {
            var (sw, sh) = rozmiary[st];
            using var p = new PlotnoSkia(Math.Max(1, sw), Math.Max(1, sh));
            for (int i = 0; i < kl.Length; i++)
            {
                if (miejsca[i].strona != st) continue;
                var r = ramki[i];
                p.setTransform(1, 0, 0, 1, 0, 0);
                p.save();
                p.beginPath(); p.rect(miejsca[i].x, miejsca[i].y, r.x1 - r.x0, r.y1 - r.y0); p.clip();
                p.translate(miejsca[i].x - r.x0 + ox, miejsca[i].y - r.y0 + oy);
                Postac.Rysuj(p, h, kl[i].p, kl[i].r, s);
                p.restore();
            }
            var plik = $"{nazwa}-h{(int)Math.Round(h)}-{st}.webp";
            p.ZapiszWebp(Path.Combine(katalog, plik), 90);
            bajty += new FileInfo(Path.Combine(katalog, plik)).Length;
            strony.Add(plik);
        }
        var klatki = new List<object?>();
        var swiatla = new List<object?>();
        var glowy = new List<object?>();
        for (int i = 0; i < kl.Length; i++)
        {
            var r = ramki[i];
            klatki.Add(new List<object?> { (double)miejsca[i].strona, (double)miejsca[i].x, (double)miejsca[i].y, (double)(r.x1 - r.x0), (double)(r.y1 - r.y0), (double)(r.x0 - ox), (double)(r.y0 - oy) });
            var q = punkty[i];
            glowy.Add(new List<object?> { Z(q.glowa.x / h), Z(q.glowa.y / h), Z(q.rGlowy / h * 1.2) });
            var zKlatki = swiatlaNowych.TryGetValue(i, out var jak) ? jak : i;
            swiatla.Add(Swiatla(swiatlaWzoru != null && zKlatki >= 0 && zKlatki < swiatlaWzoru.Count ? swiatlaWzoru[zKlatki] as List<object?> : null, q, h));
        }
        var poziom = new Dictionary<string, object?> { ["h"] = h, ["strony"] = strony, ["klatki"] = klatki, ["swiatla"] = swiatla };
        return (poziom, glowy, bajty);
    }

    static double Z(double x) => Math.Round(x, 4);

    /// <summary>Światła klatki: barwa i siła ze starego arkusza, miejsce z nowej postaci (po barwie wiadomo, co świeci).</summary>
    static List<object?> Swiatla(List<object?>? stare, in PunktyPostaci q, double h)
    {
        var w = new List<object?>();
        if (stare == null) return w;
        foreach (var o in stare)
        {
            if (!(o is List<object?> l) || l.Count < 7) continue;
            double x = (double)l[0]!, y = (double)l[1]!, rr = (double)l[2]!, R = (double)l[3]!, G = (double)l[4]!, B = (double)l[5]!, sila = (double)l[6]!;
            (double x, double y)? gdzie = (R, G, B) switch
            {
                (255, 166, 80) => q.lampa,            // latarnia grabarza
                (255, 196, 120) => q.glowa,           // aureola modlącego się
                (255, 160, 70) => q.swieca,           // świeca przed modlącym się
                (255, 214, 150) => q.ksiega,          // blask księgi
                (255, 220, 160) => q.czubek,          // krzyż kostura przy pchnięciu
                _ => null,
            };
            if (gdzie is { } g && (g.x != 0 || g.y != 0)) { x = Z(g.x / h); y = Z(g.y / h); }
            w.Add(new List<object?> { x, y, rr, R, G, B, sila });
        }
        return w;
    }
}
