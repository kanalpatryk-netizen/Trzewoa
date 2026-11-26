// Oprawa walki, etap 1 (docs/plan-oprawy-cerber.md): światło i kontrast. Tylko obraz — symulacja o niczym nie wie.
//
// Trzy plany:
//  - tło (rycina: skała, ściany, korytarze) — PlytaSwiata rysuje je z filtrem VisualConfig.Swiatla.FiltrTla (ciemniej,
//    mniej koloru, trochę więcej kontrastu);
//  - plan akcji — ta warstwa: na koniec świata (po postaciach, efektach i dłoniach) mapa świateł w połowie rozdzielczości:
//      1. „mapa” — otoczenie (szarość < 1), w którą światła wpisują się addytywnie; mnożona na scenę („multiply”):
//         tam, gdzie nie sięga żadne światło, jest ciemniej niż dotąd;
//      2. „blask” — stałe lekkie rozjaśnienie i rozjaśnienie w świetle (barwa źródła × MocBlasku, „lighten”, więc nakładające
//         się światła nie przepalają), nakładane jako „color-dodge”: jasność / (1 − blask) — oświetlone miejsca są jaśniejsze
//         niż dotąd, a czerń zostaje czernią;
//      3. poświata ognia, pieca i aury („screen”), błyski zdarzeń (LightEvents), przygaszenie przy konaniu bossa, winieta;
//  - interfejs (księga, przyciski, napisy poza płytą) — poza płytą, światło go nie dotyka.
//
// Źródła światła zbiera Zbierz() na początku klatki (przed postaciami) — tę samą listę czyta krawędź postaci
// (Rysunek/Lud/Oswietlenie.cs), żeby sylwetki łapały ogień pochodni i pieca. Bez alokacji w klatce: płótna, plamki
// i napisy barw liczą się raz (albo gdy zmieni się nastawa), lista źródeł to stała tablica.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyMrok;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Rdzen.SettingsStore;
using C = Trzewia.Visual.VisualConfig.Swiatla;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Visual
{
    public enum RodzajSwiatla : byte { Lampa = 0, Ogien = 1, Piec = 2, Aura = 3 }

    /// <summary>Źródło światła w świecie: środek (kafle), promień (kafle), siła 0..1, rodzaj (barwa i poświata).</summary>
    public struct ZrodloSwiatla
    {
        public double x, y, r, sila;
        public RodzajSwiatla rodzaj;
    }

    public sealed class SwiatloOprawy
    {
        // ───────────── pomiar (tylko na życzenie: zrzuty bez okna) ─────────────

        /// <summary>Mierzyć czas części warstwy (Stopwatch, bez alokacji)? Włącza go tryb zrzutów.</summary>
        public static bool Mierz;
        /// <summary>Nazwy części i suma ich czasu (ms) od początku pomiaru; liczba klatek.</summary>
        public static readonly string[] CZESCI = { "źródła", "mapa+winieta", "blask", "nałożenie", "poświata", "przygaszenie", "błyski", "reszta", "tło (rycina)" };
        public static readonly double[] CzasyMs = new double[9];
        public static int KlatekPomiaru;
        static long t0;
        /// <summary>Początek mierzonego odcinka (PlytaSwiata mierzy tak też rysunek tła).</summary>
        public static void start() { if (Mierz) t0 = System.Diagnostics.Stopwatch.GetTimestamp(); }
        /// <summary>Koniec odcinka części `i` (indeks w CZESCI).</summary>
        public static void znacz(int i)
        {
            if (!Mierz) return;
            var t = System.Diagnostics.Stopwatch.GetTimestamp();
            CzasyMs[i] += (t - t0) * 1000.0 / System.Diagnostics.Stopwatch.Frequency;
            t0 = t;
        }

        // ───────────── źródła tej klatki (wspólne z krawędzią postaci) ─────────────

        static ZrodloSwiatla[] zrodla = new ZrodloSwiatla[128];
        static int ile;
        /// <summary>Czy lista źródeł jest z tej klatki (zebrana przed postaciami, ważna do końca warstwy światła).</summary>
        public static bool Zebrane { get; private set; }
        public static int Ile => Zebrane ? ile : 0;
        public static ref readonly ZrodloSwiatla Zrodlo(int i) => ref zrodla[i];

        static readonly double[] BIALY = { 255, 255, 255 };

        // ───────────── płótna i plamki (raz) ─────────────

        IPlotno? mapa, blask, przyg;
        static IPlotno? winieta, pasNieba;
        static double winietaDla = double.NaN, winietaOdDla = double.NaN;
        static readonly IPlotno?[] plamki = new IPlotno?[5];
        static readonly IPlotno?[] plamkiBlasku = new IPlotno?[4];
        static double blaskDla = double.NaN;
        static readonly Dictionary<int, IPlotno> plamkiBarw = new Dictionary<int, IPlotno>();
        string stylOtoczenia = "", stylRozjasnienia = "";
        double otoczenieDla = double.NaN, rozjasnienieDla = double.NaN;

        // ───────────── pamięć do zdarzeń ─────────────

        Sim? simPop;
        bool znany;
        string fazaPop = "stoi";
        double stanPop, ostatnioT = double.NegativeInfinity;
        double konaOd = double.NaN, koniecOd = double.NaN;

        // ───────────── ogień lochu (miejsca zmieniają się rzadko) ─────────────

        World? swiatLochu;
        double lochTik = double.NegativeInfinity;
        List<(double x, double y)> pochodnie = new List<(double x, double y)>(), kosze = new List<(double x, double y)>(),
            swiece = new List<(double x, double y)>();

        // ───────────────────────────────────── źródła ─────────────────────────────────────

        static void dodaj(double x, double y, double r, double sila, RodzajSwiatla rodzaj)
        {
            if (r <= 0 || sila <= 0) return;
            if (ile == zrodla.Length) Array.Resize(ref zrodla, zrodla.Length * 2);
            ref var z = ref zrodla[ile++];
            z.x = x; z.y = y; z.r = r; z.sila = sila; z.rodzaj = rodzaj;
        }

        /// <summary>Gładkie migotanie ognia 1 ± Migotanie (trzy sinusy 6–10 Hz); „ogranicz ruch” — bez migotania.</summary>
        static double migot(double teraz, double faza)
        {
            if (ustawienia.ograniczRuch) return 1;
            var s = teraz / 1000; var H = C.MigotanieHz;
            const double DWA_PI = Math.PI * 2;
            var n = 0.5 * Math.Sin(DWA_PI * H[0] * s + faza) + 0.3 * Math.Sin(DWA_PI * H[1] * s + faza * 1.7 + 1.1)
                  + 0.2 * Math.Sin(DWA_PI * H[2] * s + faza * 2.3 + 2.3);
            return 1 + C.Migotanie * n;
        }

        void odswiezLoch(Sim sim)
        {
            if (ReferenceEquals(swiatLochu, sim.world) && sim.tick - lochTik < 600 && sim.tick >= lochTik) return;
            swiatLochu = sim.world; lochTik = sim.tick;
            pochodnie = RysLoch.pochodnie(sim); kosze = RysLoch.koszeOgnia(sim); swiece = RysLoch.swieceKomnaty(sim);
        }

        /// <summary>Źródła światła tej klatki — przed postaciami (krawędź sylwetek z nich korzysta).</summary>
        public void Zbierz(Sim sim, Camera cam, double teraz)
        {
            start();
            ile = 0; Zebrane = true;
            var w = sim.world; var S = MROK.swiatlo;
            var klan = SLud.klanLudu(sim);
            if (klan != null) dodaj(klan.hx + 0.5, klan.hy + 0.5, S.siedziba, 1, RodzajSwiatla.Lampa);
            foreach (var o in sim.lud.obozy) dodaj(o.x + 0.5, o.y + 0.5, S.oboz, 1, RodzajSwiatla.Lampa);
            dodaj(w.coreX + 0.5, w.coreY + 0.5, S.rdzen, 1, RodzajSwiatla.Lampa);
            if (w.salaOltarza.x1 >= 0)
            {
                dodaj(w.oltarz.x + 0.5, w.oltarz.y - 0.6, S.oltarz, 1, RodzajSwiatla.Lampa);
                var so = w.salaOltarza; var cy = (so.y0 + so.y1) / 2 + 1;
                for (var x = so.x0 + 3; x <= so.x1 - 2; x += S.salaKrok) dodaj(x + 0.5, cy, S.sala, 0.8, RodzajSwiatla.Lampa);
            }
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe || !S.pomieszczenia.TryGetValue(p.rodzaj, out var zp) || zp == 0) continue;
                var r = Math.Max(p.w, p.h) / 2 + zp;
                if (p.rodzaj == "kuznia") dodaj(p.x + p.w / 2, p.y + p.h / 2, r * C.PromienOgnia, migot(teraz, p.id * 0.613), RodzajSwiatla.Ogien);
                else dodaj(p.x + p.w / 2, p.y + p.h / 2, r, p.rodzaj == "sypialnia" ? 0.55 : 0.85, RodzajSwiatla.Lampa);
            }
            foreach (var e in sim.efekty) if (e.rodzaj == "cud") dodaj(e.x, e.y, S.cud * (1 - e.t / e.max * 0.5), 1, RodzajSwiatla.Lampa);

            // ogień lochu: kocioł, świece komnaty, pochodnie przedproża, kosze ognia — jak w mroku, tylko widziane kafle
            if (w.loch.x1 >= w.loch.x0)
            {
                odswiezLoch(sim);
                var k = w.kociol;
                // (etap 8, Krąg ze zmianami: zamiast kotła — latarnia przy dźwigni)
                if (Dzwignia.Aktywna) { var (lx, ly) = RysLoch.LatarniaDzwigni(sim); if (RysLoch.widziany(sim, k.x, k.y)) dodaj(lx, ly, 6.5 * C.PromienOgnia, 0.9 * migot(teraz, 1.1), RodzajSwiatla.Ogien); }
                else if (RysLoch.widziany(sim, k.x, k.y)) dodaj(k.x + 0.5, k.y - 0.6, 7 * C.PromienOgnia, 0.95 * migot(teraz, 1.1), RodzajSwiatla.Ogien);
                foreach (var (px, py) in swiece) if (RysLoch.widziany(sim, Math.Floor(px), Math.Floor(py))) dodaj(px, py, 4.2 * C.PromienOgnia, 0.8 * migot(teraz, px * 0.7), RodzajSwiatla.Ogien);
                foreach (var (px, py) in pochodnie) if (RysLoch.widziany(sim, Math.Floor(px), Math.Floor(py))) dodaj(px, py, 5.6 * C.PromienOgnia, 0.95 * migot(teraz, px * 3.1), RodzajSwiatla.Ogien);
                foreach (var (px, py) in kosze) if (RysLoch.widziany(sim, px, py)) dodaj(px + 0.5, py - 0.6, 8 * C.PromienOgnia, 0.95 * migot(teraz, px * 1.7), RodzajSwiatla.Ogien);
            }

            // lud: lampki, aura modlących się pobożnych (mnichów); boss — żar ciała
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                if (c.boss != null) { dodaj(c.x + 0.5, c.y - 0.6, C.PromienBossa, C.MocBossa * migot(teraz, c.id * 0.37), RodzajSwiatla.Ogien); continue; }
                if (c.straznik == true) continue;
                var rola = SLud.rolaPostaci(c);
                if (rola == null) continue;
                var modli = rola == "pobozny" && (c.job == Job.PRAY || c.job == Job.PIELGRZYM || c.modliPrzyObozie == true);
                if (modli) dodaj(c.x + 0.5, c.y + 0.2, C.PromienAury, C.MocAury * (0.94 + 0.06 * Math.Sin(teraz * 0.004 + c.id)), RodzajSwiatla.Aura);
                else dodaj(c.x + 0.5, c.y + 0.5, rola == "robotnik" ? S.robotnik : rola == "rycerz" ? S.rycerz : S.pobozny, 1, RodzajSwiatla.Lampa);
            }

            // piec: komora pomnika (bossa) — żarzy się tym mocniej, im bliżej wyjścia bossa
            if (POMNIK.wlaczony)
            {
                var p = sim.lud.pomnik;
                var faza = p?.faza ?? "stoi";
                double moc = faza switch
                {
                    "stoi" => C.PiecStoi + C.PiecNaStan * (p?.stan ?? 0),
                    "rozpada" => C.PiecRozpada * (0.85 + 0.15 * Math.Sin(teraz * 0.012)),
                    "wychodzi" => C.PiecWychodzi,
                    "walka" => C.PiecWalka,
                    _ => C.PiecKona,
                };
                var m = Pomnik.miejscePomnika(sim);
                dodaj(m.x, m.y - 1.5, C.PromienPieca, Math.Min(1, moc) * migot(teraz, 4.2), RodzajSwiatla.Piec);
            }
            znacz(0);
        }

        // ───────────────────────────────────── zdarzenia ─────────────────────────────────────

        /// <summary>Zmiany pomnika (bossa) między klatkami → błyski i przygaszenie. Pierwsza klatka tylko zapamiętuje.</summary>
        void wykryj(Sim sim, double teraz)
        {
            var p = sim.lud.pomnik;
            var faza = p?.faza ?? "stoi";
            var stan = p?.stan ?? 0;
            // nowa partia albo przerwa (oprawa wyłączona, inny ekran) — nic nie błyska za to, co działo się bez nas
            if (!ReferenceEquals(sim, simPop) || teraz - ostatnioT > 500 || teraz < ostatnioT)
            {
                simPop = sim; znany = false;
                konaOd = koniecOd = double.NaN;
            }
            ostatnioT = teraz;
            if (!znany)
            {
                znany = true;
                if (faza == "kona") konaOd = teraz - C.MsPrzygaszenia;
                if (faza == "kona" && sim.ending != null) koniecOd = teraz - 10000;
            }
            else if (POMNIK.wlaczony)
            {
                var m = Pomnik.miejscePomnika(sim);
                if (faza != fazaPop)
                {
                    if (faza == "rozpada")
                    {
                        // pieczęć (pomnik) pęka: czerwony błysk z pieca i słabszy na całą płytę
                        LightEvents.Flash(C.BarwaPekniecia, C.MocPekniecia, C.MsPekniecia, m.x, m.y - 1.5, C.PromienPekniecia);
                        LightEvents.Flash(C.BarwaPekniecia, C.MocPekniecia * C.PekniecieNaPlyte, C.MsPekniecia);
                    }
                    else if (faza == "kona")
                    {
                        // ostatni cios (w krąg trzecim: ścięcie głowy) — krótki biały błysk; potem przygaszenie poza bossem
                        LightEvents.Flash(BIALY, C.MocCiosu, C.MsCiosu);
                        konaOd = teraz;
                    }
                    else if (faza == "stoi") konaOd = koniecOd = double.NaN;
                }
                else if (faza == "stoi" && stan > stanPop)
                    LightEvents.Flash(C.BarwaPekniecia, C.MocRysy, C.MsRysy, m.x, m.y - 1.5, C.PromienRysy);
            }
            if (sim.ending != null && !double.IsNaN(konaOd) && double.IsNaN(koniecOd)) koniecOd = teraz;
            fazaPop = faza; stanPop = stan;
        }

        // ───────────────────────────────────── rysunek ─────────────────────────────────────

        static IPlotno przygotuj(ref IPlotno? c, int W, int H)
        {
            c ??= Plotno.Nowe(W, H);
            if (c.width != W || c.height != H) { c.width = W; c.height = H; }
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.globalCompositeOperation = "source-over";
            c.globalAlpha = 1;
            return c;
        }

        static double[] barwaRodzaju(RodzajSwiatla r) => r switch
        {
            RodzajSwiatla.Ogien => C.BarwaOgnia,
            RodzajSwiatla.Piec => C.BarwaPieca,
            RodzajSwiatla.Aura => C.BarwaAury,
            _ => C.BarwaLampy,
        };

        /// <summary>Miękka plama 128×128 w barwie (× mnożnik): pełna w środku, wygasa ku brzegom (jak plama mroku).</summary>
        static IPlotno zrobPlamke(double[] barwa, double mn)
        {
            var c = Plotno.Nowe(128, 128);
            double r = Math.Min(255, barwa[0] * mn), g = Math.Min(255, barwa[1] * mn), b = Math.Min(255, barwa[2] * mn);
            var gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, Barwa.Rgba(r, g, b, 1));
            gr.addColorStop(0.45, Barwa.Rgba(r, g, b, 0.85));
            gr.addColorStop(0.75, Barwa.Rgba(r, g, b, 0.35));
            gr.addColorStop(1, Barwa.Rgba(r, g, b, 0));
            c.fillStyle = gr;
            c.fillRect(0, 0, 128, 128);
            return c;
        }

        static IPlotno plamka(RodzajSwiatla r) => plamki[(int)r] ??= zrobPlamke(barwaRodzaju(r), 1);
        static IPlotno plamkaBiala() => plamki[4] ??= zrobPlamke(BIALY, 1);

        /// <summary>Plamka do „blasku”: barwa × MocBlasku (z „lighten” — nakładające się światła nie przekroczą tej mocy).</summary>
        static IPlotno plamkaBlasku(RodzajSwiatla r)
        {
            if (blaskDla != C.MocBlasku) { for (int i = 0; i < plamkiBlasku.Length; i++) plamkiBlasku[i] = null; blaskDla = C.MocBlasku; }
            return plamkiBlasku[(int)r] ??= zrobPlamke(barwaRodzaju(r), C.MocBlasku);
        }

        static IPlotno plamkaBarwy(double r, double g, double b)
        {
            var klucz = ((int)r << 16) | ((int)g << 8) | (int)b;
            if (!plamkiBarw.TryGetValue(klucz, out var c)) plamkiBarw[klucz] = c = zrobPlamke(new[] { r, g, b }, 1);
            return c;
        }

        /// <summary>Winieta 256×256: biel do `WinietaOd` promienia, potem ciemnieje do `Winieta` w rogach (mnożona).</summary>
        static IPlotno dajWiniete()
        {
            if (winieta != null && winietaDla == C.Winieta && winietaOdDla == C.WinietaOd) return winieta;
            winieta ??= Plotno.Nowe(256, 256);
            winietaDla = C.Winieta; winietaOdDla = C.WinietaOd;
            var c = winieta;
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, 256, 256);
            var v = (int)Math.Round(255 * Math.Max(0, Math.Min(1, C.Winieta)));
            var gr = c.createRadialGradient(128, 128, 0, 128, 128, 181);
            gr.addColorStop(0, "rgb(255,255,255)");
            gr.addColorStop(Math.Max(0, Math.Min(0.99, C.WinietaOd)), "rgb(255,255,255)");
            gr.addColorStop(1, $"rgb({v},{v},{v})");
            c.fillStyle = gr;
            c.fillRect(0, 0, 256, 256);
            return c;
        }

        /// <summary>Pionowe przejście 4×64: biel u góry, przezroczystość u dołu (granica powierzchni na mapie).</summary>
        static IPlotno dajPasNieba()
        {
            if (pasNieba != null) return pasNieba;
            var c = Plotno.Nowe(4, 64);
            var gr = c.createLinearGradient(0, 0, 0, 64);
            gr.addColorStop(0, "rgba(255,255,255,1)");
            gr.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = gr;
            c.fillRect(0, 0, 4, 64);
            return pasNieba = c;
        }

        static string szarosc(double v) { var i = (int)Math.Round(255 * Math.Max(0, Math.Min(1, v))); return $"rgb({i},{i},{i})"; }

        /// <summary>
        /// Warstwa światła na już narysowany świat (płyta: (0, 0) — róg płyty, cam.vw × cam.vh). Wołana z PlytaSwiata po
        /// ostatniej warstwie świata, przed przygaszeniem pauzy i planem rozkazów.
        /// </summary>
        public void Naloz(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            start();
            LightEvents.Zegar = teraz;
            wykryj(sim, teraz);
            double vw = cam.vw, vh = cam.vh, k = C.Skala, z = cam.zoom * k;
            int W = (int)Math.Max(1, Math.Ceiling(vw * k)), H = (int)Math.Max(1, Math.Ceiling(vh * k));

            // 1. mapa: otoczenie + światła addytywnie (niebo i powierzchnia bez przyciemnienia)
            if (otoczenieDla != C.Otoczenie)
            {
                otoczenieDla = C.Otoczenie;
                var o = C.Otoczenie; var bo = C.BarwaOtoczenia;
                stylOtoczenia = $"rgb({(int)Math.Round(255 * Math.Min(1, o * bo[0]))},{(int)Math.Round(255 * Math.Min(1, o * bo[1]))},{(int)Math.Round(255 * Math.Min(1, o * bo[2]))})";
            }
            var g = przygotuj(ref mapa, W, H);
            g.fillStyle = stylOtoczenia;
            g.fillRect(0, 0, W, H);
            var syP = cam.toScreenY(World.SURFACE_Y) * k;
            if (syP > 0)
            {
                var pp = C.PrzejsciePowierzchni * z;
                g.fillStyle = "rgb(255,255,255)";
                if (syP - pp > 0) g.fillRect(0, 0, W, syP - pp);
                g.drawImage(dajPasNieba(), 0, syP - pp, W, pp);
            }
            g.globalCompositeOperation = "lighter";
            for (int i = 0; i < ile; i++)
            {
                ref readonly var s = ref zrodla[i];
                var R = s.r * C.PromienMapy * z;
                double sx = cam.toScreenX(s.x) * k, sy = cam.toScreenY(s.y) * k;
                if (sx + R < 0 || sy + R < 0 || sx - R > W || sy - R > H) continue;
                g.globalAlpha = Math.Min(1, s.sila * C.MocMapy);
                g.drawImage(plamka(s.rodzaj), sx - R, sy - R, R * 2, R * 2);
            }

            // winieta w tej samej mapie (pół rozdzielczości) — bez osobnego przejścia przez całą płytę
            g.globalCompositeOperation = "multiply";
            g.globalAlpha = 1;
            g.drawImage(dajWiniete(), 0, 0, W, H);
            znacz(1);
            // 2. blask: stałe rozjaśnienie + światła (barwa × MocBlasku), nakładające się — najjaśniejsze, nie suma
            if (rozjasnienieDla != C.Rozjasnienie) { rozjasnienieDla = C.Rozjasnienie; stylRozjasnienia = szarosc(C.Rozjasnienie); }
            var b = przygotuj(ref blask, W, H);
            b.fillStyle = stylRozjasnienia;
            b.fillRect(0, 0, W, H);
            b.globalCompositeOperation = "lighten";
            for (int i = 0; i < ile; i++)
            {
                ref readonly var s = ref zrodla[i];
                var R = s.r * C.PromienBlasku * z;
                double sx = cam.toScreenX(s.x) * k, sy = cam.toScreenY(s.y) * k;
                if (sx + R < 0 || sy + R < 0 || sx - R > W || sy - R > H) continue;
                b.globalAlpha = Math.Min(1, s.sila);
                b.drawImage(plamkaBlasku(s.rodzaj), sx - R, sy - R, R * 2, R * 2);
            }

            znacz(2);
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "multiply";
            ctx.drawImage(g, 0, 0, vw, vh);
            ctx.globalCompositeOperation = "color-dodge";
            ctx.drawImage(b, 0, 0, vw, vh);
            znacz(3);

            // 3. poświata ognia, pieca i aury
            ctx.globalCompositeOperation = "screen";
            for (int i = 0; i < ile; i++)
            {
                ref readonly var s = ref zrodla[i];
                if (s.rodzaj == RodzajSwiatla.Lampa) continue;
                var R = s.r * C.PromienPoswiaty * cam.zoom;
                double sx = cam.toScreenX(s.x), sy = cam.toScreenY(s.y);
                if (sx + R < 0 || sy + R < 0 || sx - R > vw || sy - R > vh) continue;
                ctx.globalAlpha = Math.Min(1, s.sila * C.MocPoswiaty);
                ctx.drawImage(plamka(s.rodzaj), sx - R, sy - R, R * 2, R * 2);
            }

            znacz(4);
            // 4. śmierć bossa: wszystko poza bossem przygasa (narasta, a po końcu gry powoli wraca)
            var a = 0.0;
            if (!double.IsNaN(konaOd))
            {
                a = Math.Max(0, Math.Min(1, (teraz - konaOd) / C.MsPrzygaszenia));
                if (!double.IsNaN(koniecOd)) a *= Math.Max(0, Math.Min(1, 1 - (teraz - koniecOd) / 900));
            }
            if (a > 0.01)
            {
                double bx = double.NaN, by = double.NaN;
                foreach (var c in sim.creatures) if (!c.dead && c.boss != null) { bx = c.x + 0.5; by = c.y - 0.6; break; }
                var cios = sim.lud.pomnik?.cios;
                if (double.IsNaN(bx) && cios != null) { bx = cios.x + 0.5; by = cios.y - 0.6; }
                var pg = przygotuj(ref przyg, W, H);
                pg.fillStyle = "rgb(255,255,255)";
                pg.fillRect(0, 0, W, H);
                pg.globalAlpha = Math.Min(1, C.Przygaszenie * a);
                pg.fillStyle = "rgb(0,0,0)";
                pg.fillRect(0, 0, W, H);
                if (!double.IsNaN(bx))
                {
                    var R = C.PromienOtworu * z;
                    pg.globalCompositeOperation = "lighter";
                    pg.globalAlpha = 1;
                    pg.drawImage(plamkaBiala(), cam.toScreenX(bx) * k - R, cam.toScreenY(by) * k - R, R * 2, R * 2);
                }
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = "multiply";
                ctx.drawImage(pg, 0, 0, vw, vh);
            }

            znacz(5);
            // 5. błyski zdarzeń
            var mn = ustawienia.mniejBlyskow ? C.MniejBlyskow : 1;
            ctx.globalCompositeOperation = "screen";
            var pula = LightEvents.Pula;
            for (int i = 0; i < pula.Length; i++)
            {
                ref var bl = ref pula[i];
                if (!bl.jest) continue;
                var t = (teraz - bl.od) / bl.ms;
                if (t >= 1) { bl.jest = false; continue; }
                if (t < 0) continue;
                var moc = Math.Min(1, bl.sila * (1 - t) * (1 - t) * mn);
                if (moc <= 0.004) continue;
                if (bl.promien <= 0)
                {
                    ctx.globalAlpha = moc;
                    ctx.fillStyle = bl.styl ?? "rgb(255,255,255)";
                    ctx.fillRect(0, 0, vw, vh);
                }
                else
                {
                    var R = bl.promien * cam.zoom;
                    double sx = cam.toScreenX(bl.x), sy = cam.toScreenY(bl.y);
                    if (sx + R < 0 || sy + R < 0 || sx - R > vw || sy - R > vh) continue;
                    ctx.globalAlpha = moc;
                    ctx.drawImage(plamkaBarwy(bl.r, bl.g, bl.b), sx - R, sy - R, R * 2, R * 2);
                }
            }

            znacz(6);
            ctx.restore();
            znacz(7);
            if (Mierz) KlatekPomiaru++;
            Zebrane = false;
        }

        /// <summary>Oprawa wyłączona w tej klatce — lista źródeł nieważna (krawędź postaci wraca do dawnych świateł).</summary>
        public static void Uniewaznij() => Zebrane = false;
    }
}
