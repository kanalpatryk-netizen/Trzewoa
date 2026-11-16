// Oprawa walki z bossem, etap 0 (docs/plan-oprawy-cerber.md): zrzuty walki z bossem bez okna, do porównań przed/po.
// W C# bossem jest demon z Wielkiego Pomnika (Alpha 1) — Cerber jest tylko w krag-3-beta (TS). Fazy te same:
// stoi → rozpada (pieczęć/pomnik pęka) → wychodzi → walka → kona → koniec.
//
//   Trzewia --zrzuty-walki KATALOG [--ziarno 3] [--rozmiar 1920x1080] [--oprawa wl|wyl] [--co-ile 0.5]
//
// Gra prowadzi bot (styl „rozsadny”), zawsze tak samo dla tego samego ziarna: symulacja jest deterministyczna, czas
// klatek jest stały (1/60 s), budżet klatki nie ucina tików, rycina liczy się w wątku gry, ustawienia są domyślne
// (nic nie czyta się z plików gracza ani do nich nie zapisuje). Rysunek programowy (procesor), jak w testach.
//
// Dwa przejścia tej samej partii: pierwsze bez rysunku szuka chwili, w której pomnik pęka; drugie dochodzi do niej
// bez rysunku i od 3 s przed nią zapisuje klatki: co `--co-ile` s gry, a przy każdym zdarzeniu (zmiana fazy, trafienie
// bossa, koniec gry) seria klatka po klatce przez 0,3 s. Obok PNG plik klatki.json: czas, tik, faza, zdarzenie,
// prostokąt pola gry i pasa akcji (pas, w którym stoją boss i walczący) — dla narzedzia/oprawa/jasnosc.py.
using System.Globalization;
using System.Text.Json;
using Trzewia.Aplikacja;
using Trzewia.Nastawy;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Trzewia.Visual;

namespace Trzewia.Komputer;

static class ZrzutyWalki
{
    /// <summary>Czas jednej klatki zrzutów (ms) — stały, żeby każde uruchomienie dało te same obrazy.</summary>
    const double DT = 1000.0 / 60;
    /// <summary>Od ilu sekund przed pęknięciem pomnika zapisywać.</summary>
    const double PRZED_S = 3;
    /// <summary>Po końcu gry jeszcze tyle sekund (zamrożony obraz — tak jak w nagraniu z obserwatorium).</summary>
    const double PO_KONCU_S = 3;
    /// <summary>Seria klatka po klatce po zmianie fazy i końcu gry (ms).</summary>
    const double SERIA_MS = 300;
    /// <summary>Trafienie bossa: klatki tyle klatek po nim (0–150 ms) i najmniejszy odstęp między takimi seriami (ms).</summary>
    static readonly int[] PO_TRAFIENIU = { 0, 2, 4, 6, 9 };
    const double ODSTEP_TRAFIEN_MS = 4000;
    /// <summary>Pas akcji: od tylu kafli nad stopami bossa do tylu pod nimi (cała szerokość pola gry).</summary>
    const double PAS_GORA = 5, PAS_DOL = 1.5;
    /// <summary>Najdłużej (s gry) od początku zapisu i najdłużej (tików) szukania pęknięcia.</summary>
    const double NAJDLUZEJ_S = 300, SZUKAJ_TIKOW = 120 * 60 * 40;

    sealed class Kontekst : IKontekst
    {
        public IPlotno ctx { get; init; } = null!;
        public double w { get; init; }
        public double h { get; init; }
        public Dzwiek dzwiek { get; } = new Dzwiek();
        public Muzyka muzyka { get; } = new Muzyka();
        public Gesty gesty { get; } = new Gesty();
        readonly Dictionary<string, Ekran> ekrany = new();
        public void idz(string nazwa, object? dane = null) { }
        public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
        public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    }

    sealed class Klatka
    {
        public string plik { get; set; } = "";
        public int klatka { get; set; }
        public double czasS { get; set; }
        public double tick { get; set; }
        public string faza { get; set; } = "";
        public string? zdarzenie { get; set; }
        public double[] plyta { get; set; } = Array.Empty<double>();
        public double[] pas { get; set; } = Array.Empty<double>();
        public double[]? boss { get; set; }
        public double? bossHp { get; set; }
        public bool oprawa { get; set; }
    }

    public static int Uruchom()
    {
        var katalog = Uruchomienie.ZrzutyWalki!;
        Directory.CreateDirectory(katalog);
        int W = Uruchomienie.RozmiarW > 0 ? Uruchomienie.RozmiarW : 1920, H = Uruchomienie.RozmiarH > 0 ? Uruchomienie.RozmiarH : 1080;
        double ziarno = Uruchomienie.Ziarno ?? 3, coIle = Uruchomienie.CoIleS > 0 ? Uruchomienie.CoIleS : 0.5;
        if (Uruchomienie.Oprawa is bool op) VisualConfig.Wlaczone = op;

        // ustawienia: domyślne (Gospodarz.Pliki zostaje w pamięci), gra obserwowana, rycina w wątku gry, stała jakość
        var u = SettingsStore.ustawienia;
        u.rycinaWWatku = false;
        u.jakosc = "ostra";
        Obserwowany.BOT.wlaczony = true;
        Obserwowany.BOT.styl = "rozsadny";
        Obserwowany.BOT.ziarno = ziarno;
        Obserwowany.BOT.autoRestart = false;
        Obserwowany.przygotujObserwowana();
        // budżet klatki chroni płynność na wolnym komputerze, ale zależy od zegara — tu nie może uciąć ani jednego tiku
        NastawySterowanie.TEMPO.budzetKlatkiMs = 1e9;
        Plotno.Fabryka = new FabrykaSkia();
        Fonts.zaladujKroje();

        Console.WriteLine($"zrzuty walki: ziarno {ziarno.ToString(CultureInfo.InvariantCulture)}, {W}×{H}, oprawa {(VisualConfig.Wlaczone ? "włączona" : "wyłączona")}, katalog {katalog}");
        var zegar = System.Diagnostics.Stopwatch.StartNew();

        // przejście 1: kiedy pomnik pęka (bez rysunku)
        double tikPekniecia;
        using (var p1 = new PlotnoSkia(64, 64))
        {
            var (gra, _) = NowaPartia(p1, W, H);
            tikPekniecia = Przewin(gra, t => faza(gra.sim) != "stoi" || gra.sim.ending != null, SZUKAJ_TIKOW);
            if (faza(gra.sim) == "stoi")
            {
                Console.Error.WriteLine(gra.sim.ending != null
                    ? $"Partia skończyła się przed walką z bossem ({gra.sim.ending}, tik {gra.sim.tick}). Spróbuj innego ziarna."
                    : $"Pomnik nie pękł w {SZUKAJ_TIKOW / 120 / 60:F0} min gry. Spróbuj innego ziarna.");
                return 2;
            }
        }
        Console.WriteLine($"  przejście 1: pomnik pęka w tiku {tikPekniecia} ({tikPekniecia / 120 / 60:F1} min gry) — {zegar.Elapsed.TotalSeconds:F1} s");

        // przejście 2: do 3 s przed pęknięciem bez rysunku, potem zapis
        using var p = new PlotnoSkia(W, H);
        var (g, _) = NowaPartia(p, W, H);
        var start = Math.Max(0, tikPekniecia - PRZED_S * 120);
        Przewin(g, t => t >= start, start + 1);
        var sim = g.sim;

        var klatki = new List<Klatka>();
        double teraz = 1000, czas0 = 0, nastRegularna = 0, seriaDo = -1, ostatnieTrafienie = -1e9, koniecOd = -1;
        int trafienieF = -1000;
        double msRysunku = 0, msZapisu = 0;
        var sw = new System.Diagnostics.Stopwatch();
        string ostatniaFaza = faza(sim);
        double? ostatnieHp = null;
        Obserwowany.BOT.tempo = 1;
        for (int f = 0; ; f++)
        {
            teraz += DT;
            g.krok(DT, teraz);
            var czas = f * DT;
            if (f == 0) czas0 = czas;
            // zdarzenia tej klatki
            string? zd = null;
            var fz = faza(sim);
            if (fz != ostatniaFaza) { zd = "faza:" + fz; ostatniaFaza = fz; }
            var boss = sim.creatures.FirstOrDefault(c => c.boss != null && !c.dead);
            var hp = boss?.hp;
            if (hp != null && ostatnieHp != null && hp < ostatnieHp - 1e-9 && czas - ostatnieTrafienie >= ODSTEP_TRAFIEN_MS)
            {
                zd ??= "trafienie";
                ostatnieTrafienie = czas;
                trafienieF = f;
            }
            ostatnieHp = hp;
            if (sim.ending != null && koniecOd < 0) { koniecOd = czas; zd = "koniec:" + sim.ending; }
            if (zd != null && zd != "trafienie") seriaDo = czas + SERIA_MS;

            bool zapisz = czas >= nastRegularna || czas <= seriaDo || zd != null || Array.IndexOf(PO_TRAFIENIU, f - trafienieF) >= 0;
            if (czas >= nastRegularna) nastRegularna += coIle * 1000;
            if (zapisz)
            {
                sw.Restart();
                p.setTransform(1, 0, 0, 1, 0, 0);
                g.rysuj(p, W, H, teraz);
                msRysunku += sw.Elapsed.TotalMilliseconds;
                sw.Restart();
                var nazwa = $"klatka-{f:D5}.png";
                if (!p.ZapiszPngSzybko(Path.Combine(katalog, nazwa))) { Console.Error.WriteLine($"nie zapisałem {nazwa}"); return 1; }
                msZapisu += sw.Elapsed.TotalMilliseconds;
                klatki.Add(Opis(g, nazwa, f, czas / 1000, zd, boss));
                if (zd != null) Console.WriteLine($"  {czas / 1000,7:F2} s  tik {sim.tick,7}  {zd}");
            }
            if (koniecOd >= 0 && czas - koniecOd >= PO_KONCU_S * 1000) break;
            if (czas - czas0 >= NAJDLUZEJ_S * 1000) { Console.WriteLine("  (koniec czasu zapisu — walka trwa dalej)"); break; }
        }

        var json = JsonSerializer.Serialize(new
        {
            ziarno, szerokosc = W, wysokosc = H, oprawa = VisualConfig.Wlaczone, tikPekniecia,
            pas = new { opis = $"cała szerokość pola gry, od {PAS_GORA} kafli nad stopami bossa (albo pomnika) do {PAS_DOL} kafla pod nimi" },
            klatki,
        }, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(katalog, "klatki.json"), json);
        Console.WriteLine($"zapisano {klatki.Count} klatek w {zegar.Elapsed.TotalSeconds:F1} s → {Path.Combine(katalog, "klatki.json")}");
        if (klatki.Count > 0)
            Console.WriteLine($"  na klatkę: rysunek programowy {msRysunku / klatki.Count:F0} ms, zapis PNG {msZapisu / klatki.Count:F0} ms " +
                              "(rysunek procesorem, nie kartą — to nie jest czas klatki w grze; ten mierzy F3 / --pomiar)");
        return 0;
    }

    static string faza(Sim sim) => sim.lud.pomnik?.faza ?? "stoi";

    static (EkranGry gra, Kontekst app) NowaPartia(IPlotno p, int W, int H)
    {
        Races.resetRaces();
        var app = new Kontekst { ctx = p, w = W, h = H };
        var gra = new EkranGry(app);
        app.zarejestruj(gra);
        gra.wejdz("bot");
        return (gra, app);
    }

    /// <summary>Gra bez rysunku (szybko: tempo ×10, klatki po 50 ms), aż `dosc(tik)` albo `najwyzej` tików. Zwraca tik.</summary>
    static double Przewin(EkranGry gra, Func<double, bool> dosc, double najwyzej)
    {
        Obserwowany.BOT.tempo = 10;
        double teraz = 1000;
        while (!dosc(gra.sim.tick) && gra.sim.tick < najwyzej && gra.sim.ending == null)
        {
            teraz += 50;
            gra.krok(50, teraz);
        }
        return gra.sim.tick;
    }

    static Klatka Opis(EkranGry g, string plik, int f, double czasS, string? zd, Creature? boss)
    {
        var sim = g.sim; var cam = g.cam; var pl = g.plate;
        double bx, by;
        if (boss != null) { bx = boss.x; by = boss.y; }
        else { var m = Pomnik.miejscePomnika(sim); bx = m.x; by = m.y; }
        double sy0 = pl.y + cam.toScreenY(by - PAS_GORA), sy1 = pl.y + cam.toScreenY(by + PAS_DOL);
        sy0 = Math.Max(pl.y, sy0); sy1 = Math.Min(pl.y + pl.h, sy1);
        return new Klatka
        {
            plik = plik, klatka = f, czasS = Math.Round(czasS, 4), tick = sim.tick, faza = faza(sim), zdarzenie = zd,
            plyta = new[] { pl.x, pl.y, pl.w, pl.h },
            pas = new[] { pl.x, sy0, pl.w, Math.Max(0, sy1 - sy0) },
            boss = new[] { Math.Round(pl.x + cam.toScreenX(bx), 1), Math.Round(pl.y + cam.toScreenY(by), 1) },
            bossHp = boss?.hp, oprawa = VisualConfig.Wlaczone,
        };
    }
}
