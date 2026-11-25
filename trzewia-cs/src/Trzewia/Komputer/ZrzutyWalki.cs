// Oprawa walki z bossem, etap 0 (docs/plan-oprawy-cerber.md): zrzuty walki z bossem bez okna, do porównań przed/po.
// Bossem jest demon z Wielkiego Pomnika (Alpha 1), a z --krag — Cerber (tryb Kręgu Trzeciego). Fazy te same:
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
    // (oprawa, etap 4: scena śmierci po „kona” trwa ok. 5,2 s — trzeba tyle jeszcze nagrywać po końcu gry, żeby ją złapać)
    const double PO_KONCU_S = 7;
    /// <summary>Seria klatka po klatce po zmianie fazy i końcu gry (ms).</summary>
    const double SERIA_MS = 300;
    /// <summary>Trafienie bossa: klatki tyle klatek po nim (0–150 ms) i najmniejszy odstęp między takimi seriami (ms).</summary>
    static readonly int[] PO_TRAFIENIU = { 0, 2, 4, 6, 9 };
    const double ODSTEP_TRAFIEN_MS = 4000;
    /// <summary>Pas akcji: od tylu kafli nad stopami bossa do tylu pod nimi (cała szerokość pola gry).</summary>
    const double PAS_GORA = 5, PAS_DOL = 1.5;
    /// <summary>„Akcja”: ten sam pas, ale tylko tyle kafli w lewo i w prawo od bossa — korytarz walki bez pustki za nim.</summary>
    const double AKCJA_BOK = 16;
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
        public double[] akcja { get; set; } = Array.Empty<double>();
        public double zoom { get; set; }
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
        if (Uruchomienie.ZwinietaKsiega) VisualConfig.ZwinietaKsiega = true;
        if (Uruchomienie.Czytelnosc is bool czyt) Trzewia.Visual.VisualConfig.Czytelnosc = czyt;
        if (Uruchomienie.Uderzenie is bool ud) Trzewia.Visual.VisualConfig.Uderzenie = ud;
        if (Uruchomienie.Przerywniki is bool prz) Trzewia.Visual.VisualConfig.Przerywniki = prz;
        if (Uruchomienie.Rycina is bool ryc) Trzewia.Visual.VisualConfig.Rycina = ryc;
        // Krąg Trzeci: boss to Cerber (nastawy, symulacja i rysunek trybu kręgu)
        if (Uruchomienie.Krag) Symulacja.Krag.Ustaw(true);
        // okno zapisu (s od początku zapisu): --od, --najdluzej — do szybkich prób strojenia
        double odS = Math.Max(0, Uruchomienie.OdS), najdluzejS = Uruchomienie.NajdluzejS > 0 ? Uruchomienie.NajdluzejS : NAJDLUZEJ_S;

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

        if (Uruchomienie.PodgladPrzerywnikow) return PodgladPrzerywnikow(katalog, W, H, Uruchomienie.CoIleS > 0 ? Uruchomienie.CoIleS : 0.1);
        if (Uruchomienie.PodgladWstepu) return PodgladWstepu(katalog, W, H, ziarno, Uruchomienie.CoIleS > 0 ? Uruchomienie.CoIleS : 0.5,
                                                            odS, Uruchomienie.NajdluzejS > 0 ? Uruchomienie.NajdluzejS : FilmKregu.DLUGOSC_FILMU);
        Console.WriteLine($"zrzuty walki{(Uruchomienie.Krag ? " (Krąg Trzeci)" : "")}: ziarno {ziarno.ToString(CultureInfo.InvariantCulture)}, {W}×{H}, oprawa {(VisualConfig.Wlaczone ? "włączona" : "wyłączona")}, katalog {katalog}");
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
        var start = Math.Max(0, tikPekniecia - (Uruchomienie.PrzedS ?? PRZED_S) * 120);
        Przewin(g, t => t >= start, start + 1);
        var sim = g.sim;

        var klatki = new List<Klatka>();
        double teraz = 1000, czas0 = 0, nastRegularna = 0, seriaDo = -1, ostatnieTrafienie = -1e9, koniecOd = -1;
        int trafienieF = -1000;
        double msRysunku = 0, msZapisu = 0;
        SwiatloOprawy.Mierz = true;
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

            bool zapisz = (czas >= nastRegularna || (!Uruchomienie.Film && (czas <= seriaDo || zd != null || Array.IndexOf(PO_TRAFIENIU, f - trafienieF) >= 0)))
                          && czas >= odS * 1000;
            if (czas >= nastRegularna) nastRegularna += coIle * 1000;
            if (zapisz)
            {
                sw.Restart();
                p.setTransform(1, 0, 0, 1, 0, 0);
                g.rysuj(p, W, H, teraz);
                msRysunku += sw.Elapsed.TotalMilliseconds;
                sw.Restart();
                // (--film: JPEG — tysiące klatek do wideo; inaczej PNG do pomiarów co do piksela)
                var nazwa = Uruchomienie.Film ? $"klatka-{f:D5}.jpg" : $"klatka-{f:D5}.png";
                if (!(Uruchomienie.Film ? p.ZapiszJpg(Path.Combine(katalog, nazwa)) : p.ZapiszPngSzybko(Path.Combine(katalog, nazwa)))) { Console.Error.WriteLine($"nie zapisałem {nazwa}"); return 1; }
                msZapisu += sw.Elapsed.TotalMilliseconds;
                klatki.Add(Opis(g, nazwa, f, czas / 1000, zd, boss));
                if (zd != null) Console.WriteLine($"  {czas / 1000,7:F2} s  tik {sim.tick,7}  {zd}");
            }
            if (koniecOd >= 0 && czas - koniecOd >= PO_KONCU_S * 1000) break;
            if (czas - czas0 >= (odS + najdluzejS) * 1000) { Console.WriteLine("  (koniec czasu zapisu)"); break; }
        }

        var json = JsonSerializer.Serialize(new
        {
            ziarno, szerokosc = W, wysokosc = H, oprawa = VisualConfig.Wlaczone, krag = Uruchomienie.Krag, tikPekniecia,
            pas = new { opis = $"cała szerokość pola gry, od {PAS_GORA} kafli nad stopami bossa (albo pomnika) do {PAS_DOL} kafla pod nimi" },
            akcja = new { opis = $"ten sam pas, tylko {AKCJA_BOK} kafli w lewo i w prawo od bossa (albo pomnika)" },
            klatki,
        }, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(Path.Combine(katalog, "klatki.json"), json);
        Console.WriteLine($"zapisano {klatki.Count} klatek w {zegar.Elapsed.TotalSeconds:F1} s → {Path.Combine(katalog, "klatki.json")}");
        if (klatki.Count > 0)
            Console.WriteLine($"  na klatkę: rysunek programowy {msRysunku / klatki.Count:F0} ms, zapis PNG {msZapisu / klatki.Count:F0} ms " +
                              "(rysunek procesorem, nie kartą — to nie jest czas klatki w grze; ten mierzy F3 / --pomiar)");
        if (SwiatloOprawy.KlatekPomiaru > 0)
        {
            Console.WriteLine($"  warstwa światła (etap 1), średnio na klatkę z {SwiatloOprawy.KlatekPomiaru}:");
            for (int i = 0; i < SwiatloOprawy.CZESCI.Length; i++)
                Console.WriteLine($"    {SwiatloOprawy.CZESCI[i],-13} {SwiatloOprawy.CzasyMs[i] / SwiatloOprawy.KlatekPomiaru,7:F1} ms");
        }
        return 0;
    }

    /// <summary>
    /// Oprawa, etap 7b: same trzy przerywniki ścięcia głów (w kolejności ścinania: pitbull, wilk, doberman), klatka co
    /// `coIle` s filmu — przerywnik-1-0000.jpg … Bez gry: film rysuje się z tego, co zapamiętał przy starcie.
    /// </summary>
    static int PodgladPrzerywnikow(string katalog, int W, int H, double coIle)
    {
        using var p = new PlotnoSkia(W, H);
        NowaPartia(p, W, H);
        var kolejnosc = NastawyKrag.SCIECIE_GLOW.kolejnosc;
        int zapisane = 0;
        for (int k = 0; k < kolejnosc.Length; k++)
        {
            var odciete = new int[k];
            for (int i = 0; i < k; i++) odciete[i] = (int)kolejnosc[i];
            double teraz = 1000;
            PrzerywnikGlowy.Pokaz((int)kolejnosc[k], k, "rycerz-6-z0", odciete, teraz);
            var dlMs = PrzerywnikGlowy.DlugoscMs(k);
            for (double t = 0; t <= dlMs + 1e-6; t += coIle * 1000)
            {
                p.setTransform(1, 0, 0, 1, 0, 0);
                FilmKregu.rysujPrzerywnikGlowy(p, W, H, teraz + t);
                var nazwa = $"przerywnik-{k + 1}-{(int)Math.Round(t):D4}.jpg";
                if (!p.ZapiszJpg(Path.Combine(katalog, nazwa))) { Console.Error.WriteLine($"nie zapisałem {nazwa}"); return 1; }
                zapisane++;
            }
        }
        PrzerywnikGlowy.Nowa();
        Console.WriteLine($"podgląd przerywników: {zapisane} klatek w {katalog}");
        return 0;
    }

    /// <summary>
    /// Oprawa, etap 7c: wstęp Kręgu bez rozgrywania partii — klatki filmu (wstep-film-CZAS.jpg, czas filmu w ms, od `odS`
    /// najwyżej `ileS` s) i sceny wejścia w silniku gry (wstep-wejscie-CZAS.jpg, czas sceny w ms), co `coIle` s.
    /// </summary>
    static int PodgladWstepu(string katalog, int W, int H, double ziarno, double coIle, double odS, double ileS)
    {
        if (!Symulacja.Krag.Wlaczony) { Console.Error.WriteLine("--podglad-wstepu: tylko z --krag"); return 2; }
        using var p = new PlotnoSkia(W, H);
        int zapisane = 0;
        bool zapisz(string nazwa)
        {
            if (!p.ZapiszJpg(Path.Combine(katalog, nazwa))) { Console.Error.WriteLine($"nie zapisałem {nazwa}"); return false; }
            zapisane++; return true;
        }
        // film: sam rysunek, czas podany wprost
        var simFilmu = new Sim(ziarno);
        var doS = Math.Min(FilmKregu.DLUGOSC_FILMU, odS + ileS);
        // czas rysunku klatki filmu (bez zapisu): średni i najgorszy — koszt ludzi rysowanych na żywo (etap 7d)
        double suma = 0, najgorszy = 0, najgorszyT = 0; int ile = 0;
        for (double t = odS; t < doS + 1e-9; t += coIle)
        {
            p.setTransform(1, 0, 0, 1, 0, 0);
            var z = System.Diagnostics.Stopwatch.StartNew();
            FilmKregu.rysujFilm(p, simFilmu, W, H, t, 1000 + t * 1000);
            var ms = z.Elapsed.TotalMilliseconds;
            if (t > odS) { suma += ms; ile++; if (ms > najgorszy) { najgorszy = ms; najgorszyT = t; } }
            if (!zapisz($"wstep-film-{(int)Math.Round(t * 1000):D5}.jpg")) return 1;
        }
        if (ile > 0) Console.WriteLine($"film: rysunek klatki średnio {suma / ile:F1} ms, najdłużej {najgorszy:F1} ms (t = {najgorszyT:F1} s)");
        // scena wejścia: zwykła nowa gra (bez bota), film pominięty jak klawiszem Esc
        Obserwowany.BOT.wlaczony = false;
        Races.resetRaces();
        var app = new Kontekst { ctx = p, w = W, h = H };
        var gra = new EkranGry(app);
        app.zarejestruj(gra);
        gra.nowaGra(ziarno);
        gra.rozmiar(W, H);
        gra.wstep.pomin();
        double teraz = 1000, od = -1, nast = 0;
        for (int f = 0; f < 60 * 120 && gra.wstep.trwa(); f++)
        {
            teraz += DT;
            gra.krok(DT, teraz);
            if (od < 0) od = teraz;
            var czas = teraz - od;
            if (czas < nast - 1e-6) continue;
            nast += coIle * 1000;
            p.setTransform(1, 0, 0, 1, 0, 0);
            gra.rysuj(p, W, H, teraz);
            if (!zapisz($"wstep-wejscie-{(int)Math.Round(czas):D5}.jpg")) return 1;
        }
        Console.WriteLine($"podgląd wstępu: {zapisane} klatek w {katalog}");
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
        double ax0 = Math.Max(pl.x, pl.x + cam.toScreenX(bx - AKCJA_BOK)), ax1 = Math.Min(pl.x + pl.w, pl.x + cam.toScreenX(bx + AKCJA_BOK));
        return new Klatka
        {
            plik = plik, klatka = f, czasS = Math.Round(czasS, 4), tick = sim.tick, faza = faza(sim), zdarzenie = zd,
            plyta = new[] { pl.x, pl.y, pl.w, pl.h },
            pas = new[] { pl.x, sy0, pl.w, Math.Max(0, sy1 - sy0) },
            akcja = new[] { ax0, sy0, Math.Max(0, ax1 - ax0), Math.Max(0, sy1 - sy0) },
            zoom = Math.Round(cam.zoom, 3),
            boss = new[] { Math.Round(pl.x + cam.toScreenX(bx), 1), Math.Round(pl.y + cam.toScreenY(by), 1) },
            bossHp = boss?.hp, oprawa = VisualConfig.Wlaczone,
        };
    }
}
