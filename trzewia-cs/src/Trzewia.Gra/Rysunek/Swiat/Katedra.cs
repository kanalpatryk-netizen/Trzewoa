// Port: alpha-1/src/render/katedra.ts — KATEDRA (Alpha 0.2): na powierzchni, nad szybem ze światłem, stoi katedra
// w przekroju, jak cała góra pod nią: na zachodzie wieża z iglicą, dalej nawa (arkady, tryforium, okna górne, żebra
// sklepienia, dach), na wschodzie skrzyżowanie z wielkim łukiem, ślepymi arkadami, trzema ostrołukami i rozetą.
// Kamień rysuje się przed mrokiem (raz na przybliżenie, do odbitki), szkło i płomienie — nad mrokiem.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using JsM = Trzewia.Js.JsMath;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyKatedra;
using static Trzewia.Nastawy.NastawySwiat;

namespace Trzewia.Rysunek
{
    /// <summary>Gdzie stoi katedra: środek szybu ze światłem (kafle), ziemia, rozeta, otwór w posadzce i płomienie świec.</summary>
    public sealed class UkladKatedry
    {
        public double cx, g;
        /// <summary>Rząd posadzki (y kafli) — na cokole, odrobinę nad ziemią.</summary>
        public double posadzka;
        /// <summary>Zachodni i wschodni brzeg całej budowli (x kafli, z przyporą i stopniami).</summary>
        public double x0, x1;
        public (double x, double y, double r) rozeta;
        /// <summary>Otwór w posadzce — wylot szybu ze światłem (x kafli).</summary>
        public (double x0, double x1) otwor;
        public (double x, double y)[] plomienie = Array.Empty<(double, double)>();
        /// <summary>Najwyższy punkt (krzyż na iglicy wieży) — y kafli.</summary>
        public double szczyt;
    }

    public static partial class Katedra
    {
        static Nastawy.Typ_KATEDRA K => KATEDRA;

        /// <summary>Układ katedry nad szybem albo null (góra bez sali z ołtarzem albo katedra wyłączona).</summary>
        public static UkladKatedry? ukladKatedry(World w)
        {
            if (!K.wlaczona || w.salaOltarza.x1 < 0) return null;
            double cx = w.szybX + 0.5, g = World.SURFACE_Y, pol = SWIAT.warstwy.szyb / 2;
            var kd = K.kandelabry;
            return new UkladKatedry
            {
                cx = cx, g = g,
                posadzka = g - K.posadzka,
                x0 = cx + K.wieza.od - 0.7,
                x1 = cx + K.skrzyzowanie.@do + K.skrzyzowanie.sciana + K.skrzyzowanie.przypora,
                rozeta = (cx, g - K.rozeta.v, K.rozeta.r),
                otwor = (cx - pol, cx + pol),
                plomienie = new[] { (cx - kd.u, g - K.posadzka - kd.wys - 0.55), (cx + kd.u, g - K.posadzka - kd.wys - 0.55) },
                szczyt = g - (K.wieza.wys + K.wieza.iglica + 0.75),
            };
        }

        const string TUSZ = "rgba(20,12,8,0.95)";

        /// <summary>Punkty ostrołuku (u, v): od nasady po lewej, przez wierzchołek, do nasady po prawej.</summary>
        static List<(double u, double v)> ostroluk(double u0, double u1, double vS, double h, int n = 9)
        {
            double s = u1 - u0, R = (s * s / 4 + h * h) / s;
            var fm = Math.Acos( // (rysunek: acos z .NET — różnica rzędu ulp nie ma znaczenia)
                Math.Max(-1, Math.Min(1, (R - s / 2) / R)));
            var p = new List<(double, double)>();
            for (int i = 0; i <= n; i++) { var f = (fm * i) / n; p.Add((u0 + R - R * JsM.Cos(f), vS + R * JsM.Sin(f))); }
            for (int i = n - 1; i >= 0; i--) { var f = (fm * i) / n; p.Add((u1 - R + R * JsM.Cos(f), vS + R * JsM.Sin(f))); }
            return p;
        }

        /// <summary>Wzory kreskowania (ukośne linie co `odstep` pikseli), przypięte do świata, żeby nie pływały z kamerą.</summary>
        static readonly Dictionary<string, CanvasPattern> wzory = new Dictionary<string, CanvasPattern>();
        static Styl kreskowanie(IPlotno ctx, string kolor, double odstep, double ox, double oy)
        {
            var klucz = kolor + "|" + Js.Js.S(odstep);
            if (!wzory.TryGetValue(klucz, out var p))
            {
                var c = Plotno.Nowe((int)odstep, (int)odstep);
                var g = c;
                g.strokeStyle = kolor; g.lineWidth = 1;
                g.beginPath(); g.moveTo(-1, odstep + 1); g.lineTo(odstep + 1, -1); g.moveTo(-1, 1); g.lineTo(1, -1);
                g.moveTo(odstep - 1, odstep + 1); g.lineTo(odstep + 1, odstep - 1); g.stroke();
                var np = ctx.createPattern(c, "repeat");
                if (np == null) return kolor;
                wzory[klucz] = p = np;
            }
            p.setTransform(new DOMMatrix(1, 0, 0, 1, ox % odstep, oy % odstep));
            return p;
        }

        /// <summary>Pióro: rysunek w układzie katedry (u, v) — na ekran przelicza kamera.</summary>
        sealed class Pioro
        {
            public readonly IPlotno ctx; public readonly Func<double, double> X, Y; public readonly double z;
            public Pioro(IPlotno ctx, Func<double, double> X, Func<double, double> Y, double z) { this.ctx = ctx; this.X = X; this.Y = Y; this.z = z; }
            /// <summary>Ścieżka wielokąta z punktów (u, v).</summary>
            public void wielokat(IList<(double u, double v)> p)
            {
                ctx.beginPath();
                for (int i = 0; i < p.Count; i++) { if (i > 0) ctx.lineTo(X(p[i].u), Y(p[i].v)); else ctx.moveTo(X(p[i].u), Y(p[i].v)); }
                ctx.closePath();
            }
            public void prost(double u0, double v0, double u1, double v1)
            {
                ctx.beginPath();
                ctx.rect(X(u0), Y(v1), (u1 - u0) * z, (v1 - v0) * z);
            }
            /// <summary>Okno ostrołukowe: od parapetu `vD` do nasady łuku `vS`, wierzchołek `h` nad nasadą.</summary>
            public void okno(double u0, double u1, double vD, double vS, double h)
            {
                var p = new List<(double u, double v)> { (u0, vD) };
                p.AddRange(ostroluk(u0, u1, vS, h));
                p.Add((u1, vD));
                wielokat(p);
            }
            public void linia(IList<(double u, double v)> p, string kolor, double grub)
            {
                ctx.strokeStyle = kolor; ctx.lineWidth = grub;
                ctx.beginPath();
                for (int i = 0; i < p.Count; i++) { if (i > 0) ctx.lineTo(X(p[i].u), Y(p[i].v)); else ctx.moveTo(X(p[i].u), Y(p[i].v)); }
                ctx.stroke();
            }
            /// <summary>Bieżąca ścieżka: wypełnij, przykryj kreskowaniem i obwiedź tuszem.</summary>
            public void maluj(Styl fill, Styl? kreski = null, bool obwodka = true)
            {
                ctx.fillStyle = fill; ctx.fill();
                if (kreski is { } k) { ctx.fillStyle = k; ctx.fill(); }
                if (obwodka) { ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.7, z * 0.05); ctx.stroke(); }
            }
            /// <summary>Pionowy gradient między wysokościami v0 (dół) i v1 (góra).</summary>
            public CanvasGradient pion(double v0, double v1, string dol, string gora)
            {
                var g = ctx.createLinearGradient(0, Y(v0), 0, Y(v1));
                g.addColorStop(0, dol); g.addColorStop(1, gora);
                return g;
            }
        }

        /// <summary>Czy katedra jest w kadrze (z zapasem).</summary>
        static bool widac(Camera cam, UkladKatedry k)
        {
            var z = cam.zoom;
            return cam.toScreenX(k.x1) > -z * 2 && cam.toScreenX(k.x0) < cam.vw + z * 2 && cam.toScreenY(k.szczyt) < cam.vh + z && cam.toScreenY(k.g + 1) > -z;
        }

        /// <summary>Gotowy rysunek kamienia: płótno w skali ekranu, dla jakiego przybliżenia i świata (kamień się nie rusza).</summary>
        sealed class OdbitkaKamienia { public IPlotno c = null!; public double z, skala; public World swiat = null!; }
        static OdbitkaKamienia? odbitka;

        /// <summary>
        /// Kamień katedry — przed mrokiem. Stoi w miejscu, więc rysuje się raz na przybliżenie do osobnego płótna, a w
        /// każdej klatce tylko się je przykleja.
        /// </summary>
        public static void rysujKatedre(IPlotno ctx, Sim sim, Camera cam)
        {
            var k = ukladKatedry(sim.world);
            if (k == null || !widac(cam, k)) return;
            var z = cam.zoom;
            double x0 = k.x0 - 1, x1 = k.x1 + 1, y0 = k.szczyt - 1, y1 = k.g + 0.6;
            // płótno w skali ekranu, ale najwyżej ok. 4 mln pikseli (wielki ekran z bliska: ostrzej nie trzeba)
            var t = ctx.getTransform();
            var hyp = Math.Sqrt(t.a * t.a + t.b * t.b); if (hyp == 0) hyp = 1;
            var skala = Math.Min(hyp, Math.Sqrt(4e6 / ((x1 - x0) * (y1 - y0) * z * z)));
            if (odbitka == null || odbitka.z != z || odbitka.skala != skala || odbitka.swiat != sim.world)
            {
                int cw = (int)Math.Ceiling((x1 - x0) * z * skala), ch = (int)Math.Ceiling((y1 - y0) * z * skala);
                IPlotno c;
                if (odbitka != null) { c = odbitka.c; c.width = cw; c.height = ch; } else c = Plotno.Nowe(cw, ch);
                var g = c;
                g.setTransform(skala, 0, 0, skala, 0, 0);
                g.clearRect(0, 0, c.width, c.height);
                kamien(g, k, u => (k.cx + u - x0) * z, v => (k.g - v - y0) * z, z);
                odbitka = new OdbitkaKamienia { c = c, z = z, skala = skala, swiat = sim.world };
            }
            ctx.drawImage(odbitka.c, cam.toScreenX(x0), cam.toScreenY(y0), (x1 - x0) * z, (y1 - y0) * z);
        }

        static List<(double u, double v)> L(params (double u, double v)[] p) => new List<(double, double)>(p);

        /// <summary>Rysunek kamienia katedry: `X`, `Y` — piksele dla (u, v) układu katedry.</summary>
        static void kamien(IPlotno ctx, UkladKatedry k, Func<double, double> X, Func<double, double> Y, double z)
        {
            var p = new Pioro(ctx, X, Y, z);
            var odstep = Math.Max(3, Math.Floor(z * 0.24 + 0.5));
            var kreskiCiete = kreskowanie(ctx, "rgba(26,16,10,0.55)", odstep, p.X(0), p.Y(0));
            var kreskiCien = kreskowanie(ctx, "rgba(22,14,10,0.42)", odstep + 1, p.X(0), p.Y(0));
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            double cienka = Math.Max(0.6, z * 0.035), gruba = Math.Max(0.8, z * 0.055);
            var N = K.nawa; var S = K.skrzyzowanie; var W = K.wieza; var D = K.dach; var pos = K.posadzka;
            var wsch = S.@do + S.sciana;
            // Nasada żeber sklepienia: tu kończą się filary nawy.
            var zebro = N.sklepienie - 1.7;

            // ---------------------------------------------------------------- tylna ściana nawy i skrzyżowania
            p.prost(N.od, pos, S.@do, N.sklepienie + 0.05);
            p.maluj(p.pion(pos, N.sklepienie, "rgba(108,95,80,1)", "rgba(62,55,50,1)"), null, false);
            // spoiny ciosów na tylnej ścianie (otwory, filary i okna przykryją je niżej)
            ctx.strokeStyle = "rgba(30,20,14,0.2)"; ctx.lineWidth = cienka;
            ctx.beginPath();
            {
                int n = 0;
                for (var v = pos + 0.55; v < N.sklepienie; v += 0.55, n++)
                {
                    ctx.moveTo(p.X(N.od), p.Y(v)); ctx.lineTo(p.X(S.@do), p.Y(v));
                    for (var u = N.od + (n % 2 != 0 ? 0.62 : 0.1); u < S.@do; u += 1.24) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v - 0.55)); }
                }
            }
            ctx.stroke();
            // pod sklepieniem ciemnieje — kreska gęstnieje ku górze
            p.prost(N.od, N.okna[0] - 0.5, S.@do, N.sklepienie);
            p.maluj(p.pion(N.okna[0] - 0.5, N.sklepienie, "rgba(20,14,10,0)", "rgba(20,14,10,0.35)"), null, false);
            // nawa: arkady do nawy bocznej (w głębi ciemno, małe okno), tryforium, okna górne, żebra
            for (var u = N.od; u < N.@do - 0.01; u += N.przeslo)
            {
                double a = u + N.filar / 2, b = u + N.przeslo - N.filar / 2, m = u + N.przeslo / 2;
                double vA = N.arkada[0], vW = N.arkada[1];
                p.okno(a, b, pos, vA, vW - vA);
                p.maluj(p.pion(pos, vW, "rgba(46,39,34,1)", "rgba(28,23,20,1)"), kreskiCien);
                // okno nawy bocznej w głębi i cień jej sklepienia
                p.okno(m - 0.38, m + 0.38, 1.3, 3.1, 0.7);
                p.maluj("rgba(40,44,56,1)");
                p.linia(L((m, 1.3), (m, 3.5)), "rgba(20,12,8,0.7)", cienka);
                // archiwolta: druga linia nad łukiem
                p.linia(ostroluk(a - 0.12, b + 0.12, vA, vW - vA + 0.16), "rgba(30,20,14,0.8)", cienka);
                // tryforium: trzy małe łuki w pasie pod oknami
                double t0 = N.tryforium[0], t1 = N.tryforium[1];
                p.prost(a, t0 - 0.08, b, t0); p.maluj("rgba(70,60,52,1)", null, false);
                for (int i = -1; i <= 1; i++)
                {
                    p.okno(m + i * 1.0 - 0.3, m + i * 1.0 + 0.3, t0 + 0.05, t0 + 0.42, t1 - t0 - 0.47);
                    p.maluj("rgba(30,25,22,1)");
                }
                // okno górne: dwa ostrołuki pod jednym łukiem, w głowicy oculus (szkło — nad mrokiem)
                double o0 = N.okna[0], o1 = N.okna[1];
                p.okno(m - 1.0, m + 1.0, o0, o1 - 1.0, 1.0);
                p.maluj("rgba(38,42,54,1)");
                p.linia(L((m, o0), (m, o1 - 0.75)), TUSZ, gruba);
                // żebro przyścienne nad oknem i żebra przekątne ku zwornikowi
                p.linia(ostroluk(a, b, zebro, 1.65), "rgba(34,24,18,0.85)", gruba);
                p.linia(L((a, zebro), (a + 0.6, N.sklepienie - 0.25), (m, N.sklepienie)), "rgba(34,24,18,0.6)", cienka);
                p.linia(L((b, zebro), (b - 0.6, N.sklepienie - 0.25), (m, N.sklepienie)), "rgba(34,24,18,0.6)", cienka);
            }
            // filary nawy: wiązki służek od bazy do sklepienia, głowice pod arkadą i pod żebrami
            for (var u = N.od; u <= N.@do + 0.01; u += N.przeslo)
            {
                var sk = u == N.@do ? 1 : u == N.od ? 0.6 : 1;
                var f = (N.filar / 2) * (u == N.@do ? 1.45 : 1) * sk;
                var g = ctx.createLinearGradient(p.X(u - f), 0, p.X(u + f), 0);
                g.addColorStop(0, "rgba(122,108,92,1)"); g.addColorStop(0.55, "rgba(96,85,73,1)"); g.addColorStop(1, "rgba(66,58,51,1)");
                p.prost(u - f, pos, u + f, zebro); p.maluj(g);
                p.linia(L((u - f * 0.35, pos + 0.4), (u - f * 0.35, zebro)), "rgba(30,20,14,0.5)", cienka);
                p.linia(L((u + f * 0.35, pos + 0.4), (u + f * 0.35, zebro)), "rgba(30,20,14,0.5)", cienka);
                p.prost(u - f - 0.12, pos, u + f + 0.12, pos + 0.38); p.maluj("rgba(104,92,80,1)");
                p.prost(u - f - 0.16, N.arkada[0] - 0.2, u + f + 0.16, N.arkada[0] + 0.08); p.maluj("rgba(118,104,88,1)");
                p.prost(u - f - 0.08, zebro - 0.16, u + f + 0.08, zebro); p.maluj("rgba(106,94,82,1)");
            }

            // skrzyżowanie: wielki łuk na tylnej ścianie (w nim ściana transeptu — głębiej, ciemniej)
            double lS = S.luk[0], lW = S.luk[1];
            double lA = S.od + 0.55, lB = -lA;
            p.okno(lA, lB, pos, lS, lW - lS);
            p.maluj(p.pion(pos, lW, "rgba(98,86,72,1)", "rgba(56,50,46,1)"));
            foreach (var d in new[] { 0.16, 0.32 }) p.linia(ostroluk(lA - d, lB + d, lS, lW - lS + d * 1.3), "rgba(30,20,14,0.75)", cienka);
            // ślepe arkady u dołu ściany transeptu
            const int sa = 5; var saW = (lB - lA - 0.5) / sa;
            for (int i = 0; i < sa; i++)
            {
                var a = lA + 0.25 + i * saW;
                p.okno(a + 0.08, a + saW - 0.08, pos + 0.15, pos + 1.2, 0.6);
                p.maluj("rgba(74,64,56,1)", kreskiCien);
            }
            // trzy ostrołuki nad nimi (szkło — nad mrokiem)
            foreach (var du in new double[] { -2, 0, 2 }) { p.okno(du - 0.45, du + 0.45, 2.6, 4.8, 0.95); p.maluj("rgba(38,42,54,1)"); }
            // obramienie rozety: kamienny pierścień z wałkiem (szkło i maswerk — nad mrokiem)
            var R = K.rozeta;
            ctx.beginPath(); ctx.arc(p.X(0), p.Y(R.v), R.r * z, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(92,82,72,1)"; ctx.fill(); ctx.strokeStyle = TUSZ; ctx.lineWidth = gruba; ctx.stroke();
            ctx.beginPath(); ctx.arc(p.X(0), p.Y(R.v), (R.r - 0.25) * z, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(38,42,54,1)"; ctx.fill(); ctx.stroke();
            // żebra sklepienia skrzyżowania
            p.linia(L((S.od + 0.5, lW - 0.2), (-1.6, N.sklepienie - 0.2), (0, N.sklepienie)), "rgba(34,24,18,0.6)", cienka);
            p.linia(L((S.@do, lW - 0.2), (1.6, N.sklepienie - 0.2), (0, N.sklepienie)), "rgba(34,24,18,0.6)", cienka);

            // ---------------------------------------------------------------- przekrój: posadzka, sklepienie, wschodnia ściana
            var pol = (k.otwor.x1 - k.otwor.x0) / 2;
            foreach (var (a, b) in new[] { (N.od, -pol), (pol, wsch) }) { p.prost(a, 0, b, pos); p.maluj("rgba(84,72,60,1)", kreskiCiete); }
            // sklepienie przecięte w kluczu: cienki pas, w każdym przęśle lekko wybrzuszony
            var sklep = new List<(double u, double v)>();
            for (var u = N.od; u <= S.@do + 0.01; u += 0.5)
            {
                var f = ((u - N.od) % N.przeslo) / N.przeslo;
                sklep.Add((u, N.sklepienie + 0.05 * JsM.Sin(f * Math.PI)));
            }
            sklep.Add((S.@do, D.okap)); sklep.Add((N.od, D.okap));
            p.wielokat(sklep);
            p.maluj("rgba(84,72,60,1)", kreskiCiete);
            // wschodnia ściana i przypora za nią (przypora z uskokami, na niej sterczyna)
            p.prost(S.@do, 0, wsch, D.okap); p.maluj("rgba(84,72,60,1)", kreskiCiete);
            var pr = S.przypora;
            p.wielokat(L((wsch, 0), (wsch + pr, 0), (wsch + pr, 3.4), (wsch + pr * 0.7, 3.9), (wsch + pr * 0.7, 7.2), (wsch + pr * 0.45, 7.7), (wsch + pr * 0.45, 9.4), (wsch, 9.4)));
            p.maluj(p.pion(0, 9.4, "rgba(86,78,70,1)", "rgba(70,64,60,1)"));
            sterczyna(p, wsch + pr * 0.22, 9.4, 0.5, 2.4);

            // ---------------------------------------------------------------- dach: ołów w pasach, okap z konsolkami, grzebień
            p.prost(N.od, D.okap, wsch, D.kalenica);
            p.maluj(p.pion(D.okap, D.kalenica, "rgba(58,58,64,1)", "rgba(78,78,86,1)"));
            {
                int n = 0;
                for (var v = D.okap + 0.3; v < D.kalenica - 0.1; v += 0.3, n++)
                {
                    p.linia(L((N.od, v), (wsch, v)), "rgba(26,24,30,0.55)", cienka);
                    // zakładki blach: krótkie pionowe styki, co rząd przesunięte
                    ctx.strokeStyle = "rgba(26,24,30,0.4)"; ctx.lineWidth = cienka;
                    ctx.beginPath();
                    for (var u = N.od + (n % 2 != 0 ? 0.45 : 0.05); u < wsch; u += 0.9) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v + 0.3)); }
                    ctx.stroke();
                }
            }
            p.linia(L((N.od, D.kalenica - 0.06), (wsch, D.kalenica - 0.06)), "rgba(170,166,176,0.35)", gruba);
            p.prost(N.od, D.okap - 0.12, wsch + 0.1, D.okap + 0.05); p.maluj("rgba(96,86,76,1)");
            ctx.fillStyle = "rgba(70,62,56,1)";
            for (var u = N.od + 0.25; u < wsch; u += 0.55) { p.prost(u, D.okap - 0.3, u + 0.2, D.okap - 0.12); ctx.fill(); }
            // grzebień na kalenicy: drobne lilijki
            ctx.fillStyle = "rgba(66,64,72,1)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = cienka;
            for (var u = N.od + 0.6; u < wsch - 0.3; u += 0.8)
            {
                if (Math.Abs(u) < 0.9) continue;
                p.wielokat(L((u - 0.1, D.kalenica), (u - 0.13, D.kalenica + 0.18), (u, D.kalenica + 0.36), (u + 0.13, D.kalenica + 0.18), (u + 0.1, D.kalenica)));
                ctx.fill(); ctx.stroke();
            }
            krzyz(p, wsch - 0.05, D.kalenica, 0.55);
            // sygnaturka nad skrzyżowaniem: ośmioboczna latarnia z prześwitami, iglica z żabkami, krzyż
            var SG = K.sygnaturka; double l0 = D.kalenica, l1 = l0 + SG.latarnia;
            p.prost(-0.55, l0, 0.55, l1); p.maluj(p.pion(l0, l1, "rgba(70,68,74,1)", "rgba(86,84,92,1)"));
            foreach (var du in new[] { -0.24, 0.24 }) { p.okno(du - 0.12, du + 0.12, l0 + 0.25, l1 - 0.45, 0.25); p.maluj("rgba(24,22,26,1)"); }
            iglica(p, 0, l1, 0.62, SG.iglica, "rgba(74,72,80,1)", "rgba(52,50,58,1)");
            krzyz(p, 0, l1 + SG.iglica, 0.6);

            // ---------------------------------------------------------------- wieża zachodnia (z zewnątrz)
            double wa = W.od, wb = W.@do, mw = (wa + wb) / 2;
            p.prost(wa, 0, wb, W.wys);
            p.maluj(p.pion(0, W.wys, "rgba(84,76,68,1)", "rgba(104,96,88,1)"));
            // spoiny ciosów: rzędy co 0,5 kafla, styki na zakładkę
            ctx.strokeStyle = "rgba(30,20,14,0.28)"; ctx.lineWidth = cienka;
            ctx.beginPath();
            {
                int n = 0;
                for (var v = 0.5; v < W.wys; v += 0.5, n++)
                {
                    ctx.moveTo(p.X(wa), p.Y(v)); ctx.lineTo(p.X(wb), p.Y(v));
                    for (var u = wa + (n % 2 != 0 ? 0.55 : 0.15); u < wb; u += 1.1) { ctx.moveTo(p.X(u), p.Y(v)); ctx.lineTo(p.X(u), p.Y(v + 0.5)); }
                }
            }
            ctx.stroke();
            // przypory narożne z uskokami
            foreach (var (px0, px1, cien) in new[] { (wa, wa + 0.8, true), (wb - 0.8, wb, false) })
            {
                double wew = cien ? px1 : px0, zew = cien ? px0 : px1, s = cien ? 1 : -1;
                double u1 = W.wys * 0.32, u2 = W.wys * 0.64;
                p.wielokat(L((zew, 0), (wew, 0), (wew, u1), (wew - s * 0.2, u1 + 0.3), (wew - s * 0.2, u2), (wew - s * 0.35, u2 + 0.3), (wew - s * 0.35, W.wys), (zew, W.wys)));
                if (cien) p.maluj("rgba(70,63,57,1)", kreskiCien); else p.maluj("rgba(112,102,92,1)");
            }
            // gzymsy między kondygnacjami
            foreach (var f in new[] { 0.33, 0.66, 0.9 }) { var v = W.wys * f; p.prost(wa, v - 0.16, wb, v); p.maluj("rgba(118,108,96,1)"); p.linia(L((wa, v - 0.19), (wb, v - 0.19)), "rgba(20,12,8,0.6)", cienka); }
            // portal: archiwolty w uskokach, w głębi drzwi z okuciami
            for (int i = 0; i < 3; i++)
            {
                var d = 0.5 - i * 0.22;
                p.okno(mw - 1.0 - d, mw + 1.0 + d, pos, 2.5, 1.25 + d * 0.9);
                p.maluj(i == 0 ? "rgba(78,70,62,1)" : i == 1 ? "rgba(66,59,53,1)" : "rgba(54,48,44,1)");
            }
            p.okno(mw - 0.95, mw + 0.95, pos, 2.4, 1.15); p.maluj("rgba(56,38,24,1)");
            p.linia(L((mw, pos), (mw, 3.5)), "rgba(20,12,8,0.8)", gruba);
            foreach (var v in new[] { 1.0, 2.0 }) p.linia(L((mw - 0.9, v), (mw + 0.9, v)), "rgba(30,28,30,0.85)", gruba);
            // okno środkowej kondygnacji i dzwonnica z żaluzjami
            double okW = W.wys * 0.39, okS = W.wys * 0.55, dzW = W.wys * 0.69, dzS = W.wys * 0.82;
            p.okno(mw - 0.6, mw + 0.6, okW, okS, 1.1); p.maluj("rgba(38,42,54,1)");
            p.linia(L((mw, okW), (mw, okS + 0.6)), TUSZ, gruba);
            foreach (var du in new[] { -1.05, 1.05 })
            {
                p.okno(mw + du - 0.55, mw + du + 0.55, dzW, dzS, 0.85); p.maluj("rgba(26,22,22,1)");
                for (var v = dzW + 0.25; v < dzS + 0.1; v += 0.28) p.linia(L((mw + du - 0.5, v), (mw + du + 0.5, v + 0.14)), "rgba(96,80,62,0.75)", cienka);
            }
            ctx.beginPath(); ctx.arc(p.X(mw), p.Y(W.wys * 0.955), 0.42 * z, 0, Math.PI * 2); p.maluj("rgba(40,36,36,1)");
            // attyka z czworolistnymi prześwitami i sterczyny na narożach
            p.prost(wa - 0.1, W.wys, wb + 0.1, W.wys + 0.55); p.maluj("rgba(104,96,86,1)");
            for (var u = wa + 0.75; u < wb - 0.5; u += 0.75) { ctx.beginPath(); ctx.arc(p.X(u), p.Y(W.wys + 0.27), 0.15 * z, 0, Math.PI * 2); p.maluj("rgba(30,26,26,1)"); }
            // iglica: ośmioboczna — w kadrze trzy połacie, krawędzie z żabkami, lukarny, opaski
            iglica(p, mw, W.wys + 0.45, (wb - wa) * 0.3, W.iglica, "rgba(80,78,86,1)", "rgba(56,54,62,1)");
            foreach (var du in new double[] { -1, 1 }) { p.okno(mw + du * 0.42 - 0.15, mw + du * 0.42 + 0.15, W.wys + 1.0, W.wys + 1.32, 0.3); p.maluj("rgba(24,22,26,1)"); }
            krzyz(p, mw, W.wys + 0.45 + W.iglica, 0.75);
            foreach (var u in new[] { wa + 0.4, wb - 0.4 }) sterczyna(p, u, W.wys + 0.55, 0.55, 2.3);
            // stopnie przed portalem
            p.prost(wa - 0.7, 0, wa, 0.2); p.maluj("rgba(96,86,76,1)");
            p.prost(wa - 0.35, 0.2, wa, pos); p.maluj("rgba(104,94,82,1)");

            // ---------------------------------------------------------------- otwór w posadzce: balustrada i kandelabry
            var B = K.balustrada;
            p.prost(-pol - B.bok, pos, pol + B.bok, pos + B.wys - 0.14);
            p.maluj(p.pion(pos, pos + B.wys, "rgba(98,88,76,1)", "rgba(118,106,92,1)"));
            for (int i = 0; i < 6; i++)
            {
                var u = -pol - B.bok + 0.42 + i * ((2 * (pol + B.bok) - 0.84) / 5);
                p.okno(u - 0.14, u + 0.14, pos + 0.18, pos + B.wys - 0.48, 0.18); p.maluj("rgba(36,30,26,1)");
            }
            p.prost(-pol - B.bok - 0.06, pos + B.wys - 0.14, pol + B.bok + 0.06, pos + B.wys); p.maluj("rgba(126,114,98,1)");
            foreach (var (u0, u1) in new[] { (-pol - B.bok, -pol), (pol, pol + B.bok) }) { p.prost(u0, pos, u1, pos + B.wys); p.maluj("rgba(84,72,60,1)", kreskiCiete); }
            var KD = K.kandelabry;
            foreach (var s in new double[] { -1, 1 })
            {
                double u = s * KD.u, top = pos + KD.wys;
                p.wielokat(L((u - 0.35, pos), (u, pos + 0.32), (u + 0.35, pos))); p.maluj("rgba(44,40,40,1)");
                p.linia(L((u, pos + 0.3), (u, top)), "rgba(36,32,34,1)", Math.Max(1, z * 0.08));
                foreach (var v in new[] { pos + 0.9, pos + 1.6 }) { ctx.beginPath(); ctx.ellipse(p.X(u), p.Y(v), 0.11 * z, 0.07 * z, 0, 0, Math.PI * 2); p.maluj("rgba(52,48,48,1)"); }
                p.prost(u - 0.24, top, u + 0.24, top + 0.08); p.maluj("rgba(60,54,52,1)");
                p.prost(u - 0.07, top + 0.08, u + 0.07, top + 0.45); p.maluj("rgba(214,204,182,1)");
            }
            ctx.restore();
        }

        /// <summary>Iglica: wysoki trójkąt z trzema połaciami (środkowa jaśniejsza), żabki na krawędziach, opaski.</summary>
        static void iglica(Pioro p, double u, double v0, double pol, double wys, string jasna, string ciemna)
        {
            var ctx = p.ctx; var z = p.z;
            var top = (u, v0 + wys);
            p.wielokat(L((u - pol, v0), (u + pol, v0), top)); p.maluj(ciemna);
            p.wielokat(L((u - pol * 0.42, v0), (u + pol * 0.42, v0), top)); p.maluj(jasna, null, false);
            p.linia(L((u - pol * 0.42, v0), top, (u + pol * 0.42, v0)), "rgba(20,12,8,0.6)", Math.Max(0.6, z * 0.03));
            foreach (var f in new[] { 0.3, 0.6 })
            {
                double v = v0 + wys * f, s = pol * (1 - f);
                p.linia(L((u - s, v), (u + s, v)), "rgba(150,146,156,0.45)", Math.Max(0.6, z * 0.04));
            }
            // żabki: drobne haczyki na obu krawędziach
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.6, z * 0.035);
            ctx.beginPath();
            for (var f = 0.12; f < 0.92; f += 0.13)
            {
                double v = v0 + wys * f, s = pol * (1 - f);
                foreach (var kk in new double[] { -1, 1 })
                {
                    ctx.moveTo(p.X(u + kk * s), p.Y(v));
                    ctx.quadraticCurveTo(p.X(u + kk * (s + 0.2)), p.Y(v + 0.05), p.X(u + kk * (s + 0.12)), p.Y(v + 0.22));
                }
            }
            ctx.stroke();
        }

        /// <summary>Sterczyna: smukły słupek z daszkiem i kwiatonem.</summary>
        static void sterczyna(Pioro p, double u, double v0, double sz, double wys)
        {
            var h1 = wys * 0.45;
            p.prost(u - sz / 2, v0, u + sz / 2, v0 + h1); p.maluj("rgba(96,88,80,1)");
            p.wielokat(L((u - sz / 2 - 0.05, v0 + h1), (u + sz / 2 + 0.05, v0 + h1), (u, v0 + wys))); p.maluj("rgba(76,72,72,1)");
            var ctx = p.ctx; var z = p.z;
            ctx.beginPath(); ctx.arc(p.X(u), p.Y(v0 + wys + 0.08), Math.Max(1, 0.09 * z), 0, Math.PI * 2); p.maluj("rgba(88,82,78,1)");
        }

        /// <summary>Żelazny krzyż na szczycie.</summary>
        static void krzyz(Pioro p, double u, double v0, double wys)
        {
            var g = Math.Max(1, p.z * 0.07);
            p.linia(L((u, v0), (u, v0 + wys)), "rgba(36,32,32,1)", g);
            p.linia(L((u - wys * 0.28, v0 + wys * 0.68), (u + wys * 0.28, v0 + wys * 0.68)), "rgba(36,32,32,1)", g);
        }

        /// <summary>Szkło witraży w rozecie: sektor pierścienia (r0–r1, kąty a0–a1).</summary>
        static void sektor(IPlotno ctx, double x, double y, double r0, double r1, double a0, double a1)
        {
            ctx.beginPath();
            ctx.arc(x, y, r1, a0, a1);
            ctx.arc(x, y, r0, a1, a0, true);
            ctx.closePath();
        }

        /// <summary>Barwy witraży rozety — głębokie, jak szkło z ołowiem pod światło.</summary>
        static class WITRAZ
        {
            public static readonly double[] zloto = { 222, 164, 66 }, rubin = { 168, 32, 42 }, blekit = { 42, 76, 170 }, zielen = { 40, 118, 76 }, fiolet = { 102, 54, 140 };
        }

        /// <summary>
        /// Nad mrokiem: rozeta (witraże świecą, maswerk na nich ciemny, wokół ciepła łuna), szkło okien górnych, nawy
        /// bocznej i transeptu (przygaszony zmierzch) i płomienie świec na kandelabrach.
        /// </summary>
        public static void rysujKatedreNad(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var k = ukladKatedry(sim.world);
            if (k == null || !widac(cam, k)) return;
            var z = cam.zoom;
            var p = new Pioro(ctx, u => cam.toScreenX(k.cx + u), v => cam.toScreenY(k.g - v), z);
            var ruch = Nastroj.wolnoRuszac();
            var N = K.nawa; var R = K.rozeta;
            ctx.save();
            ctx.lineJoin = "round";
            // zmierzch w oknach: ledwie jaśniejszy od kamienia, chłodny
            ctx.fillStyle = "rgba(84,96,134,0.28)";
            for (var u = N.od; u < N.@do - 0.01; u += N.przeslo)
            {
                double m = u + N.przeslo / 2, o0 = N.okna[0], o1 = N.okna[1];
                foreach (var s in new double[] { -1, 1 }) { p.okno(m + s * 0.5 - 0.38, m + s * 0.5 + 0.38, o0 + 0.12, o1 - 1.05, 0.62); ctx.fill(); }
                ctx.beginPath(); ctx.arc(p.X(m), p.Y(o1 - 0.42), 0.22 * z, 0, Math.PI * 2); ctx.fill();
                p.okno(m - 0.3, m + 0.3, 1.45, 3.05, 0.55); ctx.fill();
            }
            p.okno(K.wieza.od + 2.45, K.wieza.@do - 2.45, K.wieza.wys * 0.39 + 0.1, K.wieza.wys * 0.55, 0.95); ctx.fill();
            // trzy ostrołuki transeptu: jaśniej niż nawa — za nimi to samo niebo, co za rozetą
            ctx.fillStyle = "rgba(150,140,170,0.5)";
            foreach (var du in new double[] { -2, 0, 2 }) { p.okno(du - 0.36, du + 0.36, 2.7, 4.8, 0.85); ctx.fill(); }

            // rozeta: środek — złote oculus, wewnętrzny pierścień — osiem płatków, zewnętrzny — szesnaście pól z kołami
            double x = p.X(0), y = p.Y(R.v), r = (R.r - 0.25) * z;
            var migot = ruch ? 0.97 + 0.03 * Fresk.migotLampy(teraz * 0.3 + 917) : 1;
            double r1 = r * 0.24, r2 = r * 0.56;
            Styl barwa(double[] c, double jas) => Barwa.Rgba(Math.Floor(c[0] * jas + 0.5), Math.Floor(c[1] * jas + 0.5), Math.Floor(c[2] * jas + 0.5), 0.98);
            var zew = new[] { WITRAZ.blekit, WITRAZ.rubin, WITRAZ.blekit, WITRAZ.zielen, WITRAZ.blekit, WITRAZ.rubin, WITRAZ.blekit, WITRAZ.fiolet };
            for (int i = 0; i < 16; i++)
            {
                double a0 = (i / 16.0) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 16.0) * Math.PI * 2 - Math.PI / 2;
                sektor(ctx, x, y, r2, r, a0, a1);
                ctx.fillStyle = barwa(zew[i % 8], migot); ctx.fill();
            }
            for (int i = 0; i < 16; i++)
            {
                double a = ((i + 0.5) / 16) * Math.PI * 2 - Math.PI / 2, rr = (r2 + r) / 2 + r * 0.04;
                ctx.beginPath(); ctx.arc(x + JsM.Cos(a) * rr, y + JsM.Sin(a) * rr, r * 0.115, 0, Math.PI * 2);
                ctx.fillStyle = barwa(i % 2 != 0 ? WITRAZ.zloto : WITRAZ.rubin, migot); ctx.fill();
            }
            for (int i = 0; i < 8; i++)
            {
                double a0 = (i / 8.0) * Math.PI * 2 - Math.PI / 2 + Math.PI / 16, a1 = ((i + 1) / 8.0) * Math.PI * 2 - Math.PI / 2 + Math.PI / 16;
                sektor(ctx, x, y, r1, r2, a0, a1);
                ctx.fillStyle = barwa(i % 2 != 0 ? WITRAZ.zloto : WITRAZ.rubin, 0.95 * migot); ctx.fill();
            }
            ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2); ctx.fillStyle = barwa(WITRAZ.zloto, 1.12 * migot); ctx.fill();
            // ołów: drobne kreski w polach szkła
            ctx.strokeStyle = "rgba(20,14,12,0.6)"; ctx.lineWidth = Math.Max(0.5, z * 0.025);
            ctx.beginPath();
            for (int i = 0; i < 32; i++)
            {
                var a = (i / 32.0) * Math.PI * 2 - Math.PI / 2 + Math.PI / 32;
                ctx.moveTo(x + JsM.Cos(a) * r2, y + JsM.Sin(a) * r2); ctx.lineTo(x + JsM.Cos(a) * (r2 + (r - r2) * 0.42), y + JsM.Sin(a) * (r2 + (r - r2) * 0.42));
            }
            ctx.moveTo(x + (r1 + r2) / 2, y); ctx.arc(x, y, (r1 + r2) / 2, 0, Math.PI * 2);
            ctx.stroke();
            // światło za szkłem: jaśniej ku środkowi
            var swiatlo = ctx.createRadialGradient(x, y, 0, x, y, r);
            swiatlo.addColorStop(0, "rgba(255,236,190,0.32)"); swiatlo.addColorStop(0.55, "rgba(255,220,160,0.1)"); swiatlo.addColorStop(1, "rgba(255,214,150,0)");
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = swiatlo; ctx.fill();
            ctx.restore();
            // maswerk: kamienne pierścienie i szprychy — ciemny brzeg, jaśniejsze lico
            void pret(double szer, Action sciezka)
            {
                ctx.strokeStyle = "rgba(24,18,14,0.97)"; ctx.lineWidth = Math.Max(1.2, z * szer); ctx.beginPath(); sciezka(); ctx.stroke();
                ctx.strokeStyle = "rgba(92,80,68,0.95)"; ctx.lineWidth = Math.Max(0.5, z * szer * 0.42); ctx.beginPath(); sciezka(); ctx.stroke();
            }
            pret(0.1, () => ctx.arc(x, y, r1, 0, Math.PI * 2));
            pret(0.1, () => ctx.arc(x, y, r2, 0, Math.PI * 2));
            pret(0.08, () =>
            {
                for (int i = 0; i < 16; i++)
                {
                    double a = (i / 16.0) * Math.PI * 2 - Math.PI / 2, od = i % 2 != 0 ? r2 : r1;
                    ctx.moveTo(x + JsM.Cos(a) * od, y + JsM.Sin(a) * od); ctx.lineTo(x + JsM.Cos(a) * r, y + JsM.Sin(a) * r);
                }
            });
            pret(0.05, () =>
            {
                for (int i = 0; i < 16; i++)
                {
                    double a = ((i + 0.5) / 16) * Math.PI * 2 - Math.PI / 2, rr = (r2 + r) / 2 + r * 0.04;
                    ctx.moveTo(x + JsM.Cos(a) * rr + r * 0.115, y + JsM.Sin(a) * rr); ctx.arc(x + JsM.Cos(a) * rr, y + JsM.Sin(a) * rr, r * 0.115, 0, Math.PI * 2);
                }
            });
            pret(0.12, () => ctx.arc(x, y, r, 0, Math.PI * 2));
            // łuna wokół rozety — ciepła, w mroku katedry
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            var R2 = R.r * z * 2.1;
            var luna = ctx.createRadialGradient(x, y, r * 0.8, x, y, R2);
            luna.addColorStop(0, Barwa.Rgba(255, 214, 150, 0.2 * migot)); luna.addColorStop(1, "rgba(255,200,130,0)");
            ctx.fillStyle = luna; ctx.fillRect(x - R2, y - R2, R2 * 2, R2 * 2);
            ctx.restore();

            // płomienie świec
            foreach (var f in k.plomienie) plomien(ctx, cam.toScreenX(f.x), cam.toScreenY(f.y), z, teraz + f.x * 311, ruch);
            ctx.restore();
        }

        /// <summary>Płomień świecy z poświatą.</summary>
        static void plomien(IPlotno ctx, double x, double y, double z, double teraz, bool ruch)
        {
            var drg = ruch ? Fresk.migotLampy(teraz) : 0.5;
            double h = z * (0.3 + 0.06 * drg), s = z * 0.09;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var R = z * 1.1;
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 190, 110, 0.3 + 0.1 * drg)); g.addColorStop(1, "rgba(255,160,80,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.restore();
            ctx.fillStyle = "rgba(255,214,140,0.95)";
            ctx.beginPath();
            ctx.moveTo(x, y - h);
            ctx.quadraticCurveTo(x + s * 1.2, y - h * 0.25, x, y + h * 0.25);
            ctx.quadraticCurveTo(x - s * 1.2, y - h * 0.25, x, y - h);
            ctx.fill();
            ctx.fillStyle = "rgba(255,250,230,0.95)";
            ctx.beginPath(); ctx.ellipse(x, y + h * 0.02, s * 0.4, h * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
}
