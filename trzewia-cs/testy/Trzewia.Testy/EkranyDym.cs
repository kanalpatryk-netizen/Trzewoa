using Trzewia.Aplikacja;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using Trzewia.Symulacja;
using Xunit.Abstractions;

namespace Trzewia.Testy;

/// <summary>
/// Test dymny ekranów spoza gry: menu (strzałki i Enter), ustawienia (zakładki, suwak), atlas, osiągnięcia, kronika
/// skończonej partii i cały samouczek — wstęp pominięty, a potem rozdział po rozdziale „Rozumiem” / „pomiń” / „Dalej”.
/// Nic nie może rzucić wyjątkiem; samouczek musi dojść do karty końcowej. Zrzuty do testy/wyniki/ekran-*.png.
/// </summary>
public class EkranyDym
{
    readonly ITestOutputHelper wyj;
    public EkranyDym(ITestOutputHelper wyj) { this.wyj = wyj; }

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
        public readonly List<string> przejscia = new();
        public void idz(string nazwa, object? dane = null)
        {
            przejscia.Add(nazwa);
            if (!ekrany.TryGetValue(nazwa, out var e)) return;
            aktywny?.wyjdz();
            aktywny = e;
            e.rozmiar(w, h);
            e.wejdz(dane);
        }
        public void zarejestruj(Ekran ekran) => ekrany[ekran.nazwa] = ekran;
        public Ekran? ekran(string nazwa) => ekrany.TryGetValue(nazwa, out var e) ? e : null;
    }

    [Fact]
    public void Przejscia()
    {
        Gospodarz.Dane = new DaneZFolderu(Path.Combine(Sciezka.Testy, "..", "dane"));
        Plotno.Fabryka ??= new FabrykaSkia();
        SettingsStore.ustawienia.rycinaWWatku = false;
        Fonts.zaladujKroje();
        const int W = 1366, H = 820;
        using var p = new PlotnoSkia(W, H);
        var app = new Kontekst { ctx = p, w = W, h = H };
        app.zarejestruj(new EkranGry(app));
        var samouczek = new EkranSamouczka(app);
        app.zarejestruj(samouczek);
        app.zarejestruj(new EkranMenu(app));
        app.zarejestruj(new EkranBestiariusza(app));
        app.zarejestruj(new EkranUstawien(app));
        app.zarejestruj(new EkranKroniki(app));
        app.zarejestruj(new EkranOsiagniec(app));
        var katalog = Path.Combine(Sciezka.Testy, "wyniki");
        Directory.CreateDirectory(katalog);
        // zegar prawdziwy (ekrany liczą wejście od Wydajnosc.Teraz(), jak w grze), ale co najmniej klatka na wywołanie
        double teraz = Wydajnosc.Teraz();
        void klatka(bool rysuj = true)
        {
            teraz = Math.Max(teraz + 16.7, Wydajnosc.Teraz());
            app.aktywny!.krok(16.7, teraz);
            if (!rysuj) return;
            p.setTransform(1, 0, 0, 1, 0, 0);
            app.aktywny.rysuj(p, W, H, teraz);
        }
        void klawisz(string k) => app.aktywny!.klawisz(Keybinds.akcjaDlaKlawisza(k), new Klawisz { key = k });
        void klik(double x, double y)
        {
            app.aktywny!.dotyk(new Wskaznik { clientX = x, clientY = y, button = 0, buttons = 1 }, Faza.dol);
            app.aktywny!.dotyk(new Wskaznik { clientX = x, clientY = y, button = 0, buttons = 0 }, Faza.gora);
        }
        void zrzut(string n) => Assert.True(p.ZapiszPng(Path.Combine(katalog, $"ekran-{n}.png")));

        // menu: w dół do „Ustawienia” (ostatnia pozycja) i Enter
        app.idz("menu");
        for (int i = 0; i < 40; i++) klatka(i % 10 == 9);
        zrzut("menu");
        var wybrana = typeof(EkranMenu).GetField("wybrana", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        for (int i = 0; i < 10 && (int)wybrana.GetValue(app.aktywny)! != 6; i++) { klawisz("ArrowDown"); klatka(false); }
        klawisz("Enter");
        Assert.Equal("ustawienia", app.aktywny!.nazwa);
        // ustawienia: każda zakładka (Tab), strzałki w dół; suwak głośności tam i z powrotem
        var glosnosc = SettingsStore.ustawienia.glosnosc;
        for (int k = 0; k < 5; k++) { klatka(); klawisz("ArrowDown"); klatka(false); klawisz("Tab"); }
        klawisz("1"); klatka(); klawisz("ArrowRight"); klawisz("ArrowLeft"); klatka();
        Assert.Equal(glosnosc, SettingsStore.ustawienia.glosnosc, 6);
        zrzut("ustawienia");
        klawisz("Escape");
        Assert.Equal("menu", app.aktywny!.nazwa);

        // atlas z menu: kółko, kliknięcie, Escape (pierwszy zamyka tablicę albo atlas, potem wraca do menu)
        app.idz("bestiariusz");
        for (int i = 0; i < 6; i++) klatka();
        app.aktywny!.kolko(new Kolko { clientX = W / 2, clientY = H / 2, deltaY = 100 });
        klatka();
        zrzut("atlas");
        klik(W / 2, H / 2); klatka();
        for (int i = 0; i < 3 && app.aktywny!.nazwa == "bestiariusz"; i++) { klawisz("Escape"); klatka(); }
        Assert.Equal("menu", app.aktywny!.nazwa);

        app.idz("osiagniecia");
        for (int i = 0; i < 4; i++) klatka();
        zrzut("osiagniecia");
        klawisz("Enter");
        Assert.Equal("menu", app.aktywny!.nazwa);

        // kronika skończonej partii (bot chwilę grał)
        var sim = new Sim(7);
        while (sim.tick < 3000) { sim.step(); if (sim.tick % Bot.BOT_CO == 0) Bot.ruchBota(sim, "rozsadny"); }
        sim.ending = "sen";
        app.idz("kronika", sim);
        for (int i = 0; i < 160; i++) klatka(i % 40 == 39);
        zrzut("kronika");
        klawisz("ArrowRight"); klawisz("Enter");
        Assert.Equal("menu", app.aktywny!.nazwa);

        // samouczek: wstęp pominięty (Esc), potem rozdziały — Enter („Rozumiem” / „Dalej”) albo klik w „pomiń”
        app.idz("samouczek");
        for (int i = 0; i < 5; i++) klatka();
        zrzut("samouczek-wstep");
        klawisz("Escape");
        for (int i = 0; i < 40; i++) klatka(i % 10 == 9);
        int krokow = 0, rozdzialow = 0;
        var pomin = typeof(EkranSamouczka).GetField("polePomin", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var faza = typeof(EkranSamouczka).GetField("faza", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var idx = typeof(EkranSamouczka).GetField("idx", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var ostatni = -1;
        while ((string)faza.GetValue(samouczek)! == "lekcja" && krokow < 400)
        {
            var nr = (int)idx.GetValue(samouczek)!;
            if (nr != ostatni) { ostatni = nr; rozdzialow++; zrzut($"samouczek-{nr + 1:00}"); }
            // karta wydarzenia (rozdział „Wydarzenia”): wybór pierwszej opcji klawiszem
            if (samouczek.gra.sim.wydarzenia.biezace != null) { klawisz("1"); klatka(); }
            klawisz("Enter");
            klatka();
            if ((string)faza.GetValue(samouczek)! == "lekcja" && (int)idx.GetValue(samouczek)! == nr && pomin.GetValue(samouczek) is Obszar o)
            {
                klik(o.x + o.w / 2, o.y + o.h / 2);
                klatka();
            }
            krokow++;
        }
        wyj.WriteLine($"rozdziałów: {rozdzialow}, kroków: {krokow}, faza: {faza.GetValue(samouczek)}");
        Assert.Equal("final", (string)faza.GetValue(samouczek)!);
        klatka();
        zrzut("samouczek-koniec");
        klawisz("Escape");
        Assert.Equal("menu", app.aktywny!.nazwa);
        wyj.WriteLine($"przejścia: {string.Join(" → ", app.przejscia)}");
    }
}
