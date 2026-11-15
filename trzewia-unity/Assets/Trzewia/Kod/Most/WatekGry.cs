// Gra we własnym wątku — to, co w Trzewia.exe robi Program.cs z OknoGry, tylko bez okna: kontekst karty (Karta),
// powierzchnia Skii w rozmiarze okna silnika, App z ekranami, a po każdej klatce obraz odczytany z karty do pamięci,
// skąd silnik (Unity) bierze go do tekstury. Wejście przychodzi kolejką z wątku silnika, klatki — na jego prośbę
// (raz na klatkę silnika, więc gra chodzi w rytmie monitora; limit klatek z ustawień działa jak w Trzewia.exe).
// Ten plik nie zna Unity — tak samo nada się dla Godota.
using System;
using System.Collections.Concurrent;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using SkiaSharp;
using Trzewia.Aplikacja;
using Trzewia.Aplikacja.Screens;
using Trzewia.Nastawy;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Skia;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Most
{
    /// <summary>Obraz jednej klatki: piksele RGBA (alfa przemnożona), wiersze od góry.</summary>
    public sealed class KlatkaObrazu
    {
        public byte[] Piksele = new byte[0];
        public int W, H;
        public long Nr;
    }

    public sealed class WatekGry : IDisposable
    {
        /// <summary>Ekran po ładowaniu (jak --ekran w Trzewia.exe): "", "menu", "gra", "samouczek", "ustawienia"…</summary>
        public string EkranStartowy = "";
        /// <summary>Licznik wydajności (F3) od startu.</summary>
        public bool Licznik;
        /// <summary>Wołane w wątku gry, gdy gra padła (opis błędu).</summary>
        public Action<string>? NaBlad;

        public string? Blad { get; private set; }
        /// <summary>Gra rysuje na karcie (false — procesorem, wolno).</summary>
        public bool NaKarcie { get; private set; }

        readonly ConcurrentQueue<Action<App>> wejscie = new ConcurrentQueue<Action<App>>();
        readonly AutoResetEvent prosba = new AutoResetEvent(false);
        readonly object zamekRozmiaru = new object(), zamekKlatek = new object();
        int celW = 1, celH = 1;
        double celDpr = 1;
        KlatkaObrazu pisana = new KlatkaObrazu(), gotowa = new KlatkaObrazu(), czytana = new KlatkaObrazu();
        bool nowa;
        long nr;
        Thread? watek;
        volatile bool dziala;

        Karta? karta;
        Okno? okno;
        PlotnoSkia? plotno;
        App? app;

        /// <summary>
        /// Wspólne przygotowanie gry (raz, przed <see cref="Uruchom"/>): pliki gracza i dane, dziennik, nastawy z
        /// dane/nastawy/*.json. To samo co początek Program.Main w Trzewia.exe.
        /// </summary>
        public static void Przygotuj(IPlikiGracza pliki, IDaneGry dane, string opisGospodarza)
        {
            // liczby z kropką (jak toFixed w JS) — polski Windows pisałby „12,5” w liczniku i w zapisie
            CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
            CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
            Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;
            Gospodarz.Pliki = pliki;
            Gospodarz.Dane = dane;
            Dziennik.Otworz(pliki.Folder,
                $"Trzewia — {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
                $"system: {RuntimeInformation.OSDescription}, {RuntimeInformation.FrameworkDescription}, " +
                $"procesor: {Environment.ProcessorCount} wątków, gospodarz: {opisGospodarza}");
            foreach (var o in NastawyJson.WczytajWszystkie(p => { using var s = dane.Otworz(p); return s == null ? null : new StreamReader(s).ReadToEnd(); }))
                Dziennik.Pisz("nastawy: " + o);
        }

        /// <summary>Rusza wątek gry z oknem w pikselach <paramref name="w"/>×<paramref name="h"/> i gęstością ekranu <paramref name="dpr"/>.</summary>
        public void Uruchom(int w, int h, double dpr)
        {
            Rozmiar(w, h, dpr);
            dziala = true;
            // duży stos: rycina i układ ekranów schodzą głęboko (tak jak wątek główny programu)
            watek = new Thread(Petla, 16 * 1024 * 1024) { IsBackground = true, Name = "gra" };
            watek.Start();
        }

        /// <summary>Rozmiar okna silnika w pikselach i gęstość ekranu (Windows 125% → 1,25) — gra przejmie przy następnej klatce.</summary>
        public void Rozmiar(int w, int h, double dpr)
        {
            lock (zamekRozmiaru) { celW = Math.Max(1, w); celH = Math.Max(1, h); celDpr = dpr > 0 ? dpr : 1; }
        }

        /// <summary>Zdarzenie wejścia dla gry (wykonane w wątku gry przed następną klatką).</summary>
        public void Wejscie(Action<App> zdarzenie) { if (dziala) wejscie.Enqueue(zdarzenie); }

        /// <summary>Prośba o następną klatkę (raz na klatkę silnika).</summary>
        public void Popros() => prosba.Set();

        /// <summary>Najnowsza gotowa klatka (null — od ostatniego razu nie było nowej). Ważna do następnego wywołania.</summary>
        public KlatkaObrazu? Odbierz()
        {
            lock (zamekKlatek)
            {
                if (!nowa) return null;
                var t = czytana; czytana = gotowa; gotowa = t;
                nowa = false;
                return czytana;
            }
        }

        void Petla()
        {
            Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
            Thread.CurrentThread.CurrentUICulture = CultureInfo.InvariantCulture;
            try
            {
                Wstan();
                while (dziala)
                {
                    prosba.WaitOne(100);
                    if (!dziala) break;
                    Krok();
                }
            }
            catch (Exception e)
            {
                Blad = e.Message;
                Dziennik.Pisz("BŁĄD: " + e);
                dziala = false;
                try { NaBlad?.Invoke(e.ToString()); } catch { }
            }
            finally { Sprzatnij(); }
        }

        void Wstan()
        {
            // karta: ANGLE / EGL; bez niej — procesor (dużo wolniej, ale gra działa)
            karta = Karta.Otworz(out var blad);
            if (karta == null) Dziennik.Pisz("karta graficzna nie wstała (" + blad + ") — gra rysuje procesorem");
            NaKarcie = karta != null;
            FabrykaSkia.Kontekst = karta?.Kontekst;
            if (karta == null) { InfoKarty.Nazwa = "procesor"; InfoKarty.Droga = "procesor"; InfoKarty.Programowa = true; }
            Plotno.Fabryka = new FabrykaSkia();
            Fonts.zaladujKroje();
            if (Licznik) ustawienia.licznikWydajnosci = true;
            int w, h; double d;
            lock (zamekRozmiaru) { w = celW; h = celH; d = celDpr; }
            okno = new Okno { Dpr = d };
            if (!okno.NowyCel(w, h)) throw new InvalidOperationException("Skia: nie ma powierzchni okna " + w + "×" + h);
            plotno = new PlotnoSkia(okno.Canvas, okno.PikseleW, okno.PikseleH);
            app = new App(okno, plotno);
            app.zarejestruj(new EkranProby());
            if (EkranStartowy == "proba") app.start("proba");
            else
            {
                Start.Zbuduj(app, string.IsNullOrEmpty(EkranStartowy) ? null : EkranStartowy);
                app.start("ladowanie");
            }
            Dziennik.Pisz($"gra w wątku: okno {w}×{h}, gęstość {d:0.##}, {(NaKarcie ? karta!.Droga : "procesor")}");
        }

        void Krok()
        {
            var a = app!;
            var o = okno!;
            while (wejscie.TryDequeue(out var z)) z(a);
            int w, h; double d;
            lock (zamekRozmiaru) { w = celW; h = celH; d = celDpr; }
            if (w != o.PikseleW || h != o.PikseleH) { if (!o.NowyCel(w, h)) return; }
            if (d != o.Dpr) { o.Dpr = d; o.NowaPowierzchnia = true; }
            var teraz = Wydajnosc.Teraz();
            if (!a.Pora(teraz)) return;
            a.Klatka(teraz);
            // obraz z karty do pamięci (Skia wysyła rysunek do karty i czeka na wynik)
            var t0 = Wydajnosc.Teraz();
            var k = pisana;
            if (k.W != w || k.H != h || k.Piksele.Length != w * h * 4) { k.Piksele = new byte[w * h * 4]; k.W = w; k.H = h; }
            var info = new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Premul);
            var uchwyt = GCHandle.Alloc(k.Piksele, GCHandleType.Pinned);
            bool odczytane;
            try { odczytane = o.Powierzchnia!.ReadPixels(info, uchwyt.AddrOfPinnedObject(), w * 4, 0, 0); }
            finally { uchwyt.Free(); }
            Wydajnosc.licznik.Wyslanie(Wydajnosc.Teraz() - t0, 0);
            if (!odczytane) { Dziennik.Pisz("nie odczytałem obrazu klatki"); return; }
            k.Nr = ++nr;
            lock (zamekKlatek) { pisana = gotowa; gotowa = k; nowa = true; }
        }

        /// <summary>Po przerwie (okno zminimalizowane, pauza edytora) — czas gry nie skacze.</summary>
        public void Wznow() => Wejscie(a => a.Wznow(Wydajnosc.Teraz()));

        void Sprzatnij()
        {
            try
            {
                plotno?.Dispose(); plotno = null;
                okno?.Dispose(); okno = null;
                FabrykaSkia.Kontekst = null;
                karta?.Dispose(); karta = null;
            }
            catch (Exception e) { Dziennik.Pisz("sprzątanie karty: " + e.Message); }
        }

        public void Dispose()
        {
            dziala = false;
            prosba.Set();
            if (watek != null && !watek.Join(3000)) Dziennik.Pisz("wątek gry nie skończył w 3 s");
            watek = null;
        }

        /// <summary>
        /// „Okno” gry: powierzchnia Skii w rozmiarze okna silnika (na karcie albo w pamięci) — to samo, co w Trzewia.exe
        /// daje OknoGry na ramce okna SDL.
        /// </summary>
        sealed class Okno : IOknoGry, IDisposable
        {
            SKSurface? powierzchnia;
            readonly SKPaint rozciagniecie = new SKPaint();
            public int PikseleW { get; private set; } = 1;
            public int PikseleH { get; private set; } = 1;
            public double Dpr { get; set; } = 1;
            public bool NowaPowierzchnia { get; set; }
            public SKSurface? Powierzchnia => powierzchnia;
            public SKCanvas Canvas => powierzchnia!.Canvas;

            public bool NowyCel(int w, int h)
            {
                var info = new SKImageInfo(w, h, SKColorType.Rgba8888, SKAlphaType.Premul);
                var k = FabrykaSkia.Kontekst;
                var nowa = (k != null ? SKSurface.Create(k, false, info, 0, GRSurfaceOrigin.TopLeft) : null) ?? SKSurface.Create(info);
                if (nowa == null) return false;
                powierzchnia?.Dispose();
                powierzchnia = nowa;
                PikseleW = w; PikseleH = h;
                NowaPowierzchnia = true;
                return true;
            }

            public void Podepnij(IPlotno ctx, int pw, int ph, bool wprost)
            {
                var p = (PlotnoSkia)ctx;
                if (wprost) p.UstawCel(Canvas, pw, ph);
                else p.UstawRozmiar(pw, ph);
            }

            public void Rozciagnij(IPlotno ctx)
            {
                var img = ((PlotnoSkia)ctx).Migawka();
                if (img == null) return;
                var cel = Canvas;
                cel.ResetMatrix();
                cel.DrawImage(img, SKRect.Create(0, 0, img.Width, img.Height), SKRect.Create(0, 0, PikseleW, PikseleH),
                    new SKSamplingOptions(SKFilterMode.Linear), rozciagniecie);
            }

            public void Dispose()
            {
                powierzchnia?.Dispose(); powierzchnia = null;
                rozciagniecie.Dispose();
            }
        }
    }
}
