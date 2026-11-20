// Film całej partii Kręgu Trzeciego (--film-pelny KATALOG), do pokazania oprawy w jednym nagraniu: menu i zmiana
// trybu na Krąg Trzeci, „Nowa gra”, wstęp (film + scena wejścia — WstepKregu/FilmKregu), budowa aż do pęknięcia
// pieczęci (w dużym przyspieszeniu — to najdłuższa, najmniej ciekawa część), walka z Cerberem w zwykłym tempie
// (obie cutscenki etapu 4: wejście i śmierć bossa), kronika skończonej partii. Bot „rozsadny” gra sam; menu
// prowadzą prawdziwe klawisze (strzałki, Enter), jak w grze. Klatki JPEG + klatki.json (czas, etykieta fazy) —
// do złożenia filmu (ffmpeg), jak --zrzuty-walki --film.
// Dźwięk (20.11, prośba użytkownika: „gameplay z dźwiękiem”): ten sam mikser co w grze (Dzwieki.Silnik, muzyka, rezonans
// świata, gesty), ale bez urządzenia — na każdą zapisaną klatkę filmu dokładnie 1/30 s dźwięku do dzwiek.wav (48 kHz,
// stereo), więc obraz i dźwięk zgadzają się co do klatki także w przyspieszonej budowie (tam muzyka gra w swoim tempie).
using System.Reflection;
using System.Text.Json;
using Trzewia.Aplikacja;
using Trzewia.Dzwieki;
using Trzewia.Nastawy;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;

namespace Trzewia.Komputer;

static class FilmPelnejGry
{
    const double DT = 1000.0 / 60;
    /// <summary>Ile sekund gry (realnie) pokazać w zwykłym tempie tuż przed pęknięciem pieczęci.</summary>
    const double DOBIEG_S = 6;
    /// <summary>Ile sekund wyjściowego filmu ma zająć budowa (reszta — w przyspieszeniu dobranym do tego czasu).</summary>
    const double BUDOWA_WYJSCIE_S = 95;
    /// <summary>Bufor po cutscence śmierci, zanim ruszy kronika (s gry).</summary>
    const double BUFOR_PO_KONCU_S = 1.5;
    /// <summary>Ile sekund (wyjściowych) pokazać ekran kroniki.</summary>
    const double KRONIKA_S = 7;
    /// <summary>Bezpiecznik: najdłużej tyle tików (budowa + walka), żeby zła partia nie liczyła się w nieskończoność.</summary>
    const double BEZPIECZNIK_TIKOW = 120 * 60 * 60; // godzina gry

    sealed class PlikiWPamieci : IPlikiGracza
    {
        public string? Czytaj(string nazwa) => null;
        public bool Zapisz(string nazwa, string tresc) => true;
        public string Folder => "";
    }

    sealed class Kontekst : IKontekst
    {
        public IPlotno ctx { get; init; } = null!;
        public double w { get; init; }
        public double h { get; init; }
        public Dzwiek dzwiek { get; } = new Dzwiek();
        public Muzyka muzyka { get; } = new Muzyka();
        public Gesty gesty { get; } = new Gesty();
        readonly Dictionary<string, Ekran> ekrany = new();
        public Ekran? aktywny;
        public void idz(string nazwa, object? dane = null)
        {
            if (!ekrany.TryGetValue(nazwa, out var e)) return;
            aktywny?.wyjdz();
            aktywny = e;
            e.rozmiar(w, h);
            e.wejdz(dane);
        }
        public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
        public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    }

    static string faza(Sim sim) => sim.lud.pomnik?.faza ?? "stoi";

    /// <summary>Partia od tiku 0 bez rysunku (surowy Sim, bot „rozsadny”): tik, w którym pieczęć pęka.</summary>
    static double ZmierzTikPekniecia(double ziarno)
    {
        var sim = new Sim(ziarno);
        while (faza(sim) == "stoi" && sim.tick < BEZPIECZNIK_TIKOW && sim.ending == null)
        {
            sim.step();
            if (sim.tick % Bot.BOT_CO == 0) { Bot.ruchBota(sim, "rozsadny"); if (sim.wydarzenia.biezace != null) Bot.kartaBota(sim, "rozsadny"); }
        }
        return sim.tick;
    }

    public static int Uruchom()
    {
        var katalog = Uruchomienie.FilmPelnejGry!;
        Directory.CreateDirectory(katalog);
        int W = Uruchomienie.RozmiarW > 0 ? Uruchomienie.RozmiarW : 1280, H = Uruchomienie.RozmiarH > 0 ? Uruchomienie.RozmiarH : 720;
        double ziarno = Uruchomienie.Ziarno ?? 3;
        var zegar = System.Diagnostics.Stopwatch.StartNew();

        // ustawienia domyślne, nic na dysku (jak --zrzuty-walki)
        var u = SettingsStore.ustawienia;
        u.rycinaWWatku = false;
        u.jakosc = "ostra";
        Gospodarz.Pliki = new PlikiWPamieci();
        NastawySterowanie.TEMPO.budzetKlatkiMs = 1e9;
        Plotno.Fabryka = new FabrykaSkia();
        Fonts.zaladujKroje();

        // pomiar: ile gry (tików) do pęknięcia pieczęci — na surowej symulacji, bez rysunku (Krąg Trzeci na chwilę)
        Krag.Ustaw(true);
        var tikPekniecia = ZmierzTikPekniecia(ziarno);
        Krag.Ustaw(false);   // menu ma wystartować z Alphy 1 — gracz na ekranie przełącza na Krąg Trzeci
        Console.WriteLine($"film pełnej gry: ziarno {ziarno}, {W}×{H}, katalog {katalog}");
        Console.WriteLine($"  pomiar: pieczęć pęka w tiku {tikPekniecia} ({tikPekniecia / 120 / 60:F1} min gry) — {zegar.Elapsed.TotalSeconds:F1} s");

        using var p = new PlotnoSkia(W, H);
        var app = new Kontekst { ctx = p, w = W, h = H };
        var gra = new EkranGry(app);
        app.zarejestruj(gra);
        app.zarejestruj(new EkranMenu(app));
        app.zarejestruj(new EkranKroniki(app));

        int f = 0;
        // zegar sceny startuje od zegara komputera: menu liczy wejście od Wydajnosc.Teraz() (rozjaśnia się od niego) —
        // przy zegarze od 1000 ms różnica wychodziła ujemna i menu zostawało czarne przez cały film
        double teraz = Wydajnosc.Teraz();
        var klatki = new List<object>();
        // dźwięk: mikser gry bez urządzenia — budzi się jak w App.obudzDzwiek (gesty, rezonans świata, muzyka)
        using var wav = new ZapisWav(Path.Combine(katalog, "dzwiek.wav"));
        const int RAMEK_NA_KLATKE = Mp3.SR / 30;
        var buforDzwieku = new float[RAMEK_NA_KLATKE * 2];
        Silnik.Ten.wlaczony = true;
        app.gesty.start();
        if (u.rezonans) app.dzwiek.start();
        if (u.muzyka) app.muzyka.start();
        Mikser.wznow();
        // muzyka planuje akordy i dzwony co klatkę ekranu (App.Klatka)
        void Krok(double dt) { teraz += dt; app.muzyka.krok(); app.aktywny!.krok(dt, teraz); }
        void Zapisz(string etykieta)
        {
            p.setTransform(1, 0, 0, 1, 0, 0);
            app.aktywny!.rysuj(p, W, H, teraz);
            var nazwa = $"klatka-{f:D6}.jpg";
            if (!p.ZapiszJpg(Path.Combine(katalog, nazwa))) { Console.Error.WriteLine($"nie zapisałem {nazwa}"); return; }
            klatki.Add(new { plik = nazwa, klatka = f, czasS = Math.Round(teraz / 1000.0, 3), etykieta });
            f++;
            Silnik.Ten.Mieszaj(buforDzwieku, RAMEK_NA_KLATKE);
            wav.Dopisz(buforDzwieku);
        }
        void Klawisz(string k) => app.aktywny!.klawisz(Rdzen.Keybinds.akcjaDlaKlawisza(k), new Klawisz { key = k });

        // ---- 1) menu: parę klatek, potem zmiana trybu na Krąg Trzeci, potem „Nowa gra”
        app.idz("menu");
        for (int i = 0; i < 150; i++) { Krok(DT); if (i % 2 == 0) Zapisz("menu"); }
        NawigujMenu("tryb", Klawisz, () => { Krok(DT); Zapisz("menu"); }, app);
        Klawisz("Enter"); Krok(DT); Zapisz("menu-tryb");
        for (int i = 0; i < 120; i++) { Krok(DT); if (i % 2 == 0) Zapisz("menu-tryb"); }
        NawigujMenu("nowa", Klawisz, () => { Krok(DT); Zapisz("menu"); }, app);
        Klawisz("Enter"); Krok(DT);
        // menu woła app.idz("gra","nowa") z losowym ziarnem — od razu zastępujemy tym samym ziarnem co pomiar
        gra.nowaGra(ziarno);
        Console.WriteLine($"  menu: {f} klatek — {zegar.Elapsed.TotalSeconds:F1} s");

        // ---- 2) wstęp: film (FilmKregu, ~75 s) i scena wejścia (WstepKregu) — zwykłe tempo, bez przyspieszenia
        {
            double nastTeraz = 0;
            while (gra.wstep.trwa())
            {
                Krok(DT);
                if (teraz >= nastTeraz) { Zapisz(gra.wstep.plansze() ? "wstep-film" : "wstep-wejscie"); nastTeraz = teraz + 1000.0 / 30; }
            }
        }
        Console.WriteLine($"  wstęp skończony: {f} klatek — {zegar.Elapsed.TotalSeconds:F1} s");

        // ---- 3) budowa (bot) w przyspieszeniu aż do pęknięcia pieczęci, ostatnie DOBIEG_S s w zwykłym tempie,
        //         potem walka z Cerberem (obie cutscenki etapu 4) w zwykłym tempie aż do końca partii
        Obserwowany.BOT.wlaczony = true;
        Obserwowany.BOT.styl = "rozsadny";
        Obserwowany.BOT.autoRestart = false;
        Obserwowany.przygotujObserwowana();
        double budowaS = Math.Max(0, tikPekniecia / 120.0 - DOBIEG_S);
        double gspfBudowy = budowaS > 0 ? budowaS / (BUDOWA_WYJSCIE_S * 30) : 1.0 / 30;
        double tikDobiegu = Math.Max(0, tikPekniecia - DOBIEG_S * 120);
        Obserwowany.BOT.tempo = 14;
        {
            // budowa: tempo (bot) w przyspieszeniu, krok co S s GRY (sim.tick) — czas mierzy się na tiku, bo o to chodzi
            // w przyspieszeniu. Po pęknięciu pieczęci (albo w dobiegu do niego) tempo=1 i krok co 1/30 s SCENY (teraz) —
            // po końcu partii symulacja przestaje tykać (tik zamarły), więc dalej liczy się już tylko zegar sceny, tak
            // jak w --zrzuty-walki (tam też `czas`, nie tik, mierzy okno po końcu).
            double nastS = 0, nastTeraz = 0;
            bool wZwyklym = false, bylaWalka = false;
            double koniecOd = -1, endingOd = -1;
            bool cutscenaWidziana = false;
            var puls = System.Diagnostics.Stopwatch.StartNew();
            while (true)
            {
                if (Environment.GetEnvironmentVariable("DBG_PELNY") != null && puls.ElapsedMilliseconds > 2000)
                {
                    puls.Restart();
                    Console.WriteLine($"    [puls] tik {gra.sim.tick} teraz {teraz:F0} faza {faza(gra.sim)} ending {gra.sim.ending} cutscena {Visual.Cutscena.Scena}/{Visual.Cutscena.Trwa} f {f}");
                }
                Krok(DT);
                var sim = gra.sim;
                bool wWalce = faza(sim) != "stoi";
                if (wWalce && !bylaWalka) { bylaWalka = true; Console.WriteLine($"  pieczęć pęka (tik {sim.tick}): {f} klatek — {zegar.Elapsed.TotalSeconds:F1} s"); }
                bool chceZwykle = wWalce || sim.tick >= tikDobiegu;
                if (chceZwykle && !wZwyklym) { wZwyklym = true; Obserwowany.BOT.tempo = 1; nastTeraz = teraz; }
                if (!wZwyklym)
                {
                    double gs = sim.tick / 120.0;
                    if (gs >= nastS) { Zapisz("budowa"); nastS += gspfBudowy; }
                }
                else if (teraz >= nastTeraz) { Zapisz(wWalce ? "walka" : "budowa"); nastTeraz += 1000.0 / 30; }
                if (sim.ending != null)
                {
                    if (endingOd < 0) endingOd = teraz;
                    if (Visual.Cutscena.Trwa) cutscenaWidziana = true;
                    // cutscenka śmierci się pokazała i skończyła — albo (bezpiecznik) nie pokazała się wcale po 8 s
                    bool gotowe = (cutscenaWidziana && !Visual.Cutscena.Trwa) || teraz - endingOd > 8000;
                    if (gotowe)
                    {
                        if (koniecOd < 0) koniecOd = teraz;
                        else if (teraz - koniecOd >= BUFOR_PO_KONCU_S * 1000) break;
                    }
                }
                if (sim.tick >= BEZPIECZNIK_TIKOW) { Console.Error.WriteLine("  bezpiecznik: partia trwa za długo, przerywam"); break; }
            }
        }
        Console.WriteLine($"  koniec partii: {f} klatek — {zegar.Elapsed.TotalSeconds:F1} s");

        // ---- 4) kronika skończonej partii
        {
            var sim = gra.sim;
            app.idz("kronika", sim);
            double nastTeraz = teraz;
            double doS = teraz + KRONIKA_S * 1000;
            while (teraz < doS) { Krok(DT); if (teraz >= nastTeraz) { Zapisz("kronika"); nastTeraz = teraz + 1000.0 / 30; } }
        }
        Console.WriteLine($"  kronika: {f} klatek — {zegar.Elapsed.TotalSeconds:F1} s");

        Silnik.Ten.wlaczony = false;
        File.WriteAllText(Path.Combine(katalog, "klatki.json"),
            JsonSerializer.Serialize(new { ziarno, szerokosc = W, wysokosc = H, tikPekniecia, klatki }, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine($"zapisano {f} klatek w {zegar.Elapsed.TotalSeconds:F1} s → {Path.Combine(katalog, "klatki.json")}");
        return 0;
    }

    /// <summary>Dźwięk filmu: WAV 16 bit, stereo, Mp3.SR — pisany po kawałku, nagłówek domykany przy zamknięciu.</summary>
    sealed class ZapisWav : IDisposable
    {
        readonly BinaryWriter f;
        long ramek;
        public ZapisWav(string plik)
        {
            f = new BinaryWriter(File.Create(plik));
            f.Write("RIFF"u8); f.Write(0); f.Write("WAVE"u8); f.Write("fmt "u8); f.Write(16); f.Write((short)1); f.Write((short)2);
            f.Write(Mp3.SR); f.Write(Mp3.SR * 4); f.Write((short)4); f.Write((short)16); f.Write("data"u8); f.Write(0);
        }
        public void Dopisz(float[] probki)
        {
            foreach (var x in probki) f.Write((short)Math.Clamp(Math.Round(x * 32767), -32768, 32767));
            ramek += probki.Length / 2;
        }
        public void Dispose()
        {
            var dane = ramek * 4;
            f.Seek(4, SeekOrigin.Begin); f.Write((int)(36 + dane));
            f.Seek(40, SeekOrigin.Begin); f.Write((int)dane);
            f.Dispose();
        }
    }

    /// <summary>Strzałka w dół, aż wybrana pozycja menu ma `id == docelowy` (pomija nieaktywne — jak w grze), Enter nie wciska.</summary>
    static void NawigujMenu(string docelowy, Action<string> klawisz, Action poKroku, Kontekst app)
    {
        var menu = app.ekran("menu")!;
        var poleWybrana = typeof(EkranMenu).GetField("wybrana", BindingFlags.NonPublic | BindingFlags.Instance)!;
        var polePozycje = typeof(EkranMenu).GetField("pozycje", BindingFlags.NonPublic | BindingFlags.Instance)!;
        var lista = (System.Collections.IList)polePozycje.GetValue(menu)!;
        string? Id(int i) => (string?)lista[i]!.GetType().GetField("id")!.GetValue(lista[i]);
        for (int i = 0; i < lista.Count + 2; i++)
        {
            var wyb = (int)poleWybrana.GetValue(menu)!;
            if (Id(wyb) == docelowy) return;
            klawisz("ArrowDown");
            poKroku();
        }
        throw new InvalidOperationException($"nie znalazłem pozycji menu „{docelowy}”");
    }
}
