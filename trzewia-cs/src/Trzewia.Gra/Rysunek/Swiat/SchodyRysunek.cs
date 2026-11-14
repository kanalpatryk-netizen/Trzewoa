// Port: alpha-1/src/render/schody.ts — SCHODY DROGI WIERNYCH (6.11): w każdym odcinku szybu schody kręcone wykute
// w skale — kamienne stopnie wokół słupa, w lekkim ujęciu z góry (SCHODY.ukos), malarsko: od stopni z tyłu, przez słup,
// do stopni z przodu. Kamień ma barwę warstwy, w której wykuto szyb; na ścianie szybu lina na żelaznych pierścieniach.
// Rysuje się tylko to, co już zbudowano (Symulacja/BudowaSchodow.cs); świeżo ciosana skała jest przez chwilę jaśniejsza
// i sypią się z niej okruchy. Postać na schodach: cień na stopnicy (stopniePodStopami) i to, co bliżej widza, na niej
// (zaslonNaSchodach). Rysunek przed mrokiem.
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.BudowaSchodow;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static partial class Schody
    {
        const double TAU = Math.PI * 2;
        const string TUSZ = "rgba(38,26,18,0.78)";

        /// <summary>Tani skrót liczby — stałe kształty (rysunek nie sięga po los gry).</summary>
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        static double WYS() => wysokoscStopnia();
        static double Rnd(double v) => Math.Floor(v + 0.5);

        /// <summary>Barwa ciosanego kamienia: płytka warstwa (miękka, ciepła), środkowa, głęboka (twarda, chłodna) — płynnie.</summary>
        static readonly double[][] KAMIEN = { new double[] { 150, 134, 112 }, new double[] { 138, 128, 116 }, new double[] { 118, 113, 108 } };
        static double[] kamien(Sim sim, double y)
        {
            var W = SWIAT.warstwy; var h = sim.world.h;
            double g1 = World.SURFACE_Y + W.plytkaDo * (h - World.SURFACE_Y), g2 = World.SURFACE_Y + W.srodkowaDo * (h - World.SURFACE_Y);
            double t1 = Math.Max(0, Math.Min(1, (y - g1 + 4) / 8)), t2 = Math.Max(0, Math.Min(1, (y - g2 + 4) / 8));
            var a = KAMIEN[0]; var b = KAMIEN[1]; var c = KAMIEN[2];
            double[] m(double[] p, double[] q, double t) => new[] { p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t };
            return m(m(a, b, t1), c, t2);
        }
        static Styl barwa(double[] k, double m, double a = 1) =>
            Barwa.Rgba(Math.Min(255, Rnd(k[0] * m)), Math.Min(255, Rnd(k[1] * m)), Math.Min(255, Rnd(k[2] * m)), a);

        /// <summary>Rzut punktu spirali na ekran: kąt, promień od środka szybu, wysokość (kafle). Dalej w głąb — odrobinę wyżej.</summary>
        static (double x, double y) rzut(Camera cam, Spirala sp, double th, double r, double y) =>
            (cam.toScreenX(sp.c + r * JsM.Sin(th)), cam.toScreenY(y - SCHODY.ukos * r * JsM.Cos(th)));

        static void wielokat(IPlotno ctx, IList<(double x, double y)> p)
        {
            ctx.beginPath();
            ctx.moveTo(p[0].x, p[0].y);
            for (int i = 1; i < p.Count; i++) ctx.lineTo(p[i].x, p[i].y);
            ctx.closePath();
        }

        /// <summary>Jasność pionowej ściany kamienia o zwrocie (nx w prawo, nz w głąb) z cieniem głębi.</summary>
        static double jasnoscSciany(double nx, double nz, double glebia)
        {
            var swiatlo = Math.Max(0, -0.55 * nx - 0.83 * nz);
            return (0.52 + 0.36 * swiatlo) * (1 - 0.22 * Math.Max(0, glebia));
        }

        /// <summary>Ściany jednego stopnia i jego głębia (cosinus środka: 1 — tył szybu, −1 — przód).</summary>
        struct Stopien { public double k, y, a, b, glebia; }

        /// <summary>
        /// Jeden stopień: kamienna płyta między kątami a–b i promieniami słupa i ściany. Bez konturów — kamień modeluje
        /// światło: stopnica jasna, boki w półcieniu, pod nosem stopnia cień.
        /// </summary>
        static void rysujStopien(IPlotno ctx, Camera cam, Spirala sp, Stopien st, double[] k0, double z, bool szczegoly)
        {
            double h = WYS(), T = SCHODY.grubosc * h;
            double a = st.a, b = st.b, y = st.y, k = st.k;
            double r0 = sp.rn - 0.03, r1 = sp.R;
            var ton = 0.97 + 0.06 * los(k * 7919 + Rnd(sp.c * 31));
            // bok od strony niższego stopnia (z prawej połowy widać go od przodu): od stopnicy do stopnicy niższego
            if (JsM.Sin(b) > 0.01)
            {
                var p = new[] { rzut(cam, sp, b, r0, y), rzut(cam, sp, b, r1, y), rzut(cam, sp, b, r1, y + h), rzut(cam, sp, b, r0, y + h) };
                ctx.fillStyle = barwa(k0, jasnoscSciany(JsM.Cos(b), -JsM.Sin(b), st.glebia) * ton); wielokat(ctx, p); ctx.fill();
            }
            // bok od strony wyższego stopnia (z lewej): ta część, której nie przykrywa wyższy stopień
            if (JsM.Sin(a) < -0.01)
            {
                var p = new[] { rzut(cam, sp, a, r0, y + T - h), rzut(cam, sp, a, r1, y + T - h), rzut(cam, sp, a, r1, y + T), rzut(cam, sp, a, r0, y + T) };
                ctx.fillStyle = barwa(k0, jasnoscSciany(-JsM.Cos(a), JsM.Sin(a), st.glebia) * ton * 0.92); wielokat(ctx, p); ctx.fill();
            }
            // krawędź płyty przy ściętej przedniej ścianie szybu (przednia połowa)
            var luk = new List<double>();
            for (int i = 0; i <= 4; i++) { var t = a + (b - a) * (i / 4.0); if (JsM.Cos(t) < 0.02) luk.Add(t); }
            if (luk.Count >= 2)
            {
                var gora = new List<(double x, double y)>(); foreach (var t in luk) gora.Add(rzut(cam, sp, t, r1, y));
                var dol = new List<(double x, double y)>(); foreach (var t in luk) dol.Add(rzut(cam, sp, t, r1, y + T));
                dol.Reverse();
                var mid = luk[luk.Count >> 1];
                var obie = new List<(double x, double y)>(gora); obie.AddRange(dol);
                ctx.fillStyle = barwa(k0, jasnoscSciany(JsM.Sin(mid), JsM.Cos(mid), st.glebia) * ton); wielokat(ctx, obie); ctx.fill();
                // cień pod płytą — płyta niżej jest w jej cieniu
                if (szczegoly)
                {
                    ctx.strokeStyle = "rgba(30,20,14,0.35)"; ctx.lineWidth = Math.Max(0.8, z * 0.045);
                    ctx.beginPath(); ctx.moveTo(dol[0].x, dol[0].y); foreach (var q in dol) ctx.lineTo(q.x, q.y); ctx.stroke();
                }
            }
            // stopnica
            var tr = new List<(double x, double y)>();
            for (int i = 0; i <= 4; i++) tr.Add(rzut(cam, sp, a + (b - a) * (i / 4.0), r1, y));
            tr.Add(rzut(cam, sp, b, r0, y)); tr.Add(rzut(cam, sp, a, r0, y));
            ctx.fillStyle = barwa(k0, (1.06 - 0.16 * Math.Max(0, st.glebia)) * ton); wielokat(ctx, tr); ctx.fill();
            if (!szczegoly) return;
            // nos stopnia: jasna krawędź, pod nią ciemna linia cienia na podstopnicy
            var n0 = rzut(cam, sp, b, r0, y); var n1 = rzut(cam, sp, b, r1, y);
            ctx.strokeStyle = barwa(k0, 1.32 * ton, 0.75); ctx.lineWidth = Math.Max(0.8, z * 0.04);
            ctx.beginPath(); ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y); ctx.stroke();
            ctx.strokeStyle = "rgba(32,22,16,0.4)"; ctx.lineWidth = Math.Max(0.8, z * 0.035);
            ctx.beginPath(); ctx.moveTo(n0.x, n0.y + z * 0.05); ctx.lineTo(n1.x, n1.y + z * 0.05); ctx.stroke();
            // wytarty środek stopnicy — tam, gdzie chodzą (lekko jaśniejszy, wklęsły)
            var w0 = rzut(cam, sp, a + (b - a) * 0.2, SCHODY.linia, y); var w1 = rzut(cam, sp, a + (b - a) * 0.8, SCHODY.linia, y);
            ctx.strokeStyle = barwa(k0, 1.2 * ton, 0.45); ctx.lineWidth = Math.Max(1, z * 0.08);
            ctx.beginPath(); ctx.moveTo(w0.x, w0.y + z * 0.02); ctx.lineTo(w1.x, w1.y + z * 0.02); ctx.stroke();
        }

        /// <summary>Kamienny słup spirali: gładki walec z bębnów (spoina co bęben), od góry odcinka do posadzki.</summary>
        static void rysujSlup(IPlotno ctx, Camera cam, Spirala sp, double y0, double y1, Func<double, double[]> kolor, double z, bool szczegoly)
        {
            double xl = cam.toScreenX(sp.c - sp.rn), xr = cam.toScreenX(sp.c + sp.rn);
            double sy0 = cam.toScreenY(y0), sy1 = cam.toScreenY(y1);
            var k = kolor((y0 + y1) / 2);
            var g = ctx.createLinearGradient(xl, 0, xr, 0);
            g.addColorStop(0, barwa(k, 0.86)); g.addColorStop(0.28, barwa(k, 1.04)); g.addColorStop(0.62, barwa(k, 0.8)); g.addColorStop(1, barwa(k, 0.5));
            ctx.fillStyle = g; ctx.fillRect(xl, sy0, xr - xl, sy1 - sy0);
            if (!szczegoly) return;
            // spoiny bębnów: przedni łuk elipsy co bęben (bębny równe — ciosane na miarę)
            ctx.strokeStyle = "rgba(40,28,20,0.32)"; ctx.lineWidth = Math.Max(0.7, z * 0.03);
            var krok = SCHODY.obrot / 4;
            for (var y = sp.ys + krok; y < y1; y += krok)
            {
                if (y < y0 - 0.5) continue;
                ctx.beginPath();
                for (int i = 0; i <= 8; i++) { var q = rzut(cam, sp, Math.PI / 2 + Math.PI * (i / 8.0), sp.rn, y); if (i > 0) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
                ctx.stroke();
            }
        }

        /// <summary>Ściana klatki schodowej za spiralą: okrągła, z ciosów na zakładkę; boki w cieniu.</summary>
        static void rysujSciane(IPlotno ctx, Camera cam, Spirala sp, double y0, double y1, Func<double, double[]> kolor, double z, bool szczegoly, Func<double, bool> pomin)
        {
            double xl = cam.toScreenX(sp.c - sp.R - 0.05), xr = cam.toScreenX(sp.c + sp.R + 0.05);
            var k = kolor((y0 + y1) / 2);
            var g = ctx.createLinearGradient(xl, 0, xr, 0);
            g.addColorStop(0, barwa(k, 0.3)); g.addColorStop(0.2, barwa(k, 0.48)); g.addColorStop(0.5, barwa(k, 0.58)); g.addColorStop(0.8, barwa(k, 0.46)); g.addColorStop(1, barwa(k, 0.28));
            ctx.fillStyle = g;
            for (var y = y0; y <= y1; y++) if (!pomin(y)) ctx.fillRect(xl, cam.toScreenY(y), xr - xl, z + 0.5);
            if (!szczegoly) return;
            const double rzad = 0.62; const int n = 9;
            ctx.strokeStyle = "rgba(24,16,12,0.34)"; ctx.lineWidth = Math.Max(0.7, z * 0.03);
            for (var yr = sp.ys + rzad * Math.Floor((y0 - sp.ys) / rzad); yr <= y1 + 1; yr += rzad)
            {
                if (pomin(Math.Floor(yr))) continue;
                ctx.beginPath();
                for (int i = 0; i <= 12; i++) { var q = rzut(cam, sp, -Math.PI / 2 + Math.PI * (i / 12.0), sp.R, yr); if (i > 0) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
                ctx.stroke();
                // spoiny pionowe na zakładkę
                var zak = Rnd((yr - sp.ys) / rzad) % 2 != 0 ? 0.5 : 0;
                ctx.beginPath();
                for (int j = 0; j < n; j++)
                {
                    var f = -Math.PI / 2 + Math.PI * ((j + zak + 0.5) / n);
                    var q0 = rzut(cam, sp, f, sp.R, yr); var q1 = rzut(cam, sp, f, sp.R, yr + rzad);
                    ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
                }
                ctx.stroke();
            }
        }

        /// <summary>Lina na żelaznych pierścieniach w tylnej ścianie (nad stopniami, tylko w tylnej połowie).</summary>
        static void rysujLine(IPlotno ctx, Camera cam, Spirala sp, double kMin, double kMax, double z)
        {
            double D = TAU / SCHODY.stopni, h = WYS();
            var co = SCHODY.pierscienCo;
            (double x, double y)? poprzP = null; var poprzTyl = false;
            for (var k = Math.Floor(kMin / co) * co; k <= kMax + co; k += co)
            {
                double th = sp.th0 + k * D, y = sp.ys + k * h - SCHODY.lina;
                var tyl = JsM.Cos(th) > -0.05;
                var p = rzut(cam, sp, th, sp.R - 0.04, y);
                if (poprzP is { } pp && poprzTyl && tyl)
                {
                    var m = rzut(cam, sp, th - D * co / 2, sp.R - 0.04, y - h * co / 2 + 0.14);
                    ctx.strokeStyle = "rgba(30,18,10,0.5)"; ctx.lineWidth = Math.Max(1.6, z * 0.09);
                    ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.quadraticCurveTo(m.x, m.y, p.x, p.y); ctx.stroke();
                    ctx.strokeStyle = "rgba(158,124,80,0.9)"; ctx.lineWidth = Math.Max(0.9, z * 0.05); ctx.stroke();
                }
                if (tyl)
                {
                    ctx.strokeStyle = "rgba(30,28,30,0.95)"; ctx.lineWidth = Math.Max(1, z * 0.045);
                    ctx.beginPath(); ctx.arc(p.x, p.y, Math.Max(1.2, z * 0.07), 0, TAU); ctx.stroke();
                }
                poprzP = p; poprzTyl = tyl;
            }
        }

        /// <summary>Kiedy kafel schodów pojawił się na ekranie (świeżo wykuty) — stan rysunku, nie gry.</summary>
        static readonly Dictionary<int, double> pojawienie = new Dictionary<int, double>();
        static bool pierwszaKlatka = true;

        /// <summary>Narysowany kawałek odcinka (ściana, lina, stopnie, słup) przy danym przybliżeniu.</summary>
        sealed class RysunekKawalka { public double z; public uint podpis; public IPlotno plotno = null!; public double ox, oy; public int szer, wys; }
        static readonly ConditionalWeakTable<World, Dictionary<string, RysunekKawalka>> rysunki = new ConditionalWeakTable<World, Dictionary<string, RysunekKawalka>>();
        /// <summary>Rzędy w jednym kawałku płótna.</summary>
        const int KAWALEK = 12;
        /// <summary>Podpis rzędów odcinka (które kafle wykute) — z każdej klatki.</summary>
        static readonly List<List<uint>> podpisyRzedow = new List<List<uint>>();

        /// <summary>Schody we wszystkich odcinkach szybu drogi wiernych (przed mrokiem). Rysuje kawałek w kadrze.</summary>
        public static void rysujSchodyDrogi(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            // kiedy który kafel został wykuty — w całym szybie, nie tylko w kadrze; przy okazji podpis odcinka
            for (int n = 0; n < w.odcinkiDrogi.Count; n++)
            {
                var o = w.odcinkiDrogi[n];
                while (podpisyRzedow.Count <= n) podpisyRzedow.Add(new List<uint>());
                var rzedy = podpisyRzedow[n];
                for (var y = o.y0; y <= o.y1; y++)
                {
                    int h = unchecked((int)0x811c9dc5);
                    for (var x = o.x0; x <= o.x1; x++)
                    {
                        var i = (int)w.idx(x, y);
                        if (w.schody[i] == 0) { if (pojawienie.Count > 0) pojawienie.Remove(i); continue; }
                        h = unchecked((h ^ i) * 16777619);
                        if (!pojawienie.ContainsKey(i)) pojawienie[i] = pierwszaKlatka ? -1e9 : teraz;
                    }
                    var ri = (int)(y - o.y0);
                    while (rzedy.Count <= ri) rzedy.Add(0);
                    rzedy[ri] = (uint)h;
                }
            }
            pierwszaKlatka = false;
            for (int n = 0; n < w.odcinkiDrogi.Count; n++) rysujOdcinek(ctx, sim, cam, teraz, w.odcinkiDrogi[n], n);
        }

        /// <summary>
        /// Kamera płótna odcinka: lewy górny róg w (ox, oy), przybliżenie z (w TS: obiekt z własnym toScreenX/Y —
        /// tu zwykła kamera ze środkiem tak dobranym, żeby rzut wyszedł ten sam).
        /// </summary>
        static Camera kameraPlotna(double ox, double oy, double z, double szer, double wys) =>
            new Camera(szer, wys) { zoom = z, minZoom = z, maxZoom = z, x = ox + szer / 2 / z, y = oy + wys / 2 / z };

        /// <summary>
        /// Cały kawałek odcinka (to, co stoi) na płótnie — przycięty do wykutych kafli; tylko to, co już zbudowano
        /// (od stopnia `kTop` w dół).
        /// </summary>
        static RysunekKawalka? narysujOdcinek(Sim sim, Prost o, double z, uint podpis, double kTop, double yA, double yB)
        {
            var w = sim.world;
            var sp = spirala(sim, o);
            double ox = o.x0 - 0.5, oy = yA;
            int szer = (int)Math.Ceiling((o.x1 - o.x0 + 2) * z), wys = (int)Math.Ceiling((yB - yA) * z);
            if (szer <= 0 || wys <= 0 || wys > 16000) return null;
            var plotno = Plotno.Nowe(szer, wys);
            var ctx = plotno;
            var cam = kameraPlotna(ox, oy, z, szer, wys);
            var okno = new Path2D();
            int ile = 0;
            for (var y = Math.Max(sp.ys, Math.Floor(yA)); y <= Math.Min(o.y1, Math.Ceiling(yB)); y++)
            {
                var x = o.x0;
                while (x <= o.x1)
                {
                    if (w.schody[w.idx(x, y)] == 0) { x++; continue; }
                    var x2 = x;
                    while (x2 + 1 <= o.x1 && w.schody[w.idx(x2 + 1, y)] != 0) x2++;
                    okno.rect(cam.toScreenX(x), cam.toScreenY(y), (x2 - x + 1) * z + 0.5, z + 0.5);
                    ile += (int)(x2 - x + 1);
                    x = x2 + 1;
                }
            }
            var rys = new RysunekKawalka { z = z, podpis = podpis, plotno = plotno, ox = ox, oy = oy, szer = szer, wys = wys };
            var N = liczbaStopni(sp);
            if (ile == 0 || kTop >= N) return rys;
            var szczegoly = z >= 9;
            double[] kol(double yy) => kamien(sim, yy);
            double h = WYS(), D = TAU / SCHODY.stopni;
            var yTop = sp.ys + kTop * h;
            ctx.save();
            ctx.clip(okno);
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            // ściana klatki schodowej (w komnacie i na przedprożu tło jest ich, nie szybu) — rząd ciosów nad najwyższy stopień
            bool pomin(double yy) => w.wKomnacie(o.x0, yy) || w.wPrzedprozu(o.x0 + 1, yy);
            var yMuru = kTop > 0 ? Math.Max(sp.ys, yTop - 0.62) : sp.ys;
            ctx.save();
            var tM = cam.toScreenY(yMuru);
            ctx.beginPath(); ctx.rect(0, tM, szer, wys - tM); ctx.clip();
            rysujSciane(ctx, cam, sp, Math.Max(Math.Floor(yMuru), Math.Floor(yA) - 1), Math.Min(o.y1, Math.Ceiling(yB)), kol, z, szczegoly, pomin);
            if (kTop > 0) rysujWienczenieMuru(ctx, cam, sp, yMuru, kol, z);
            ctx.restore();
            // stopnie (i pierścienie liny) w zasięgu kawałka
            double kA = Math.Max(kTop, Math.Floor((yA - 1.6 - sp.ys) / h)), kB = Math.Min(N - 1, Math.Ceiling((yB + 1.2 - sp.ys) / h));
            if (szczegoly) rysujLine(ctx, cam, sp, kA, kB, z);
            var stopnie = new List<Stopien>();
            for (var k = kA; k <= kB; k++)
            {
                var y = sp.ys + k * h;
                double a = sp.th0 + k * D, b = a + D;
                stopnie.Add(new Stopien { k = k, y = y, a = a, b = b, glebia = JsM.Cos((a + b) / 2) });
            }
            Js.Js.Sort(stopnie, (p, q) => q.glebia - p.glebia);
            // słup: od bębna najwyższego stopnia do posadzki (barwa jak całego — nie skacze, gdy schody rosną)
            void slupem()
            {
                ctx.save();
                var tS = cam.toScreenY(yTop);
                ctx.beginPath(); ctx.rect(0, tS, szer, wys - tS); ctx.clip();
                rysujSlup(ctx, cam, sp, sp.ys, sp.ye, kol, z, szczegoly);
                ctx.restore();
                if (kTop > 0) rysujWierzchSlupa(ctx, cam, sp, yTop, kol, z);
            }
            var slup = false;
            foreach (var st in stopnie)
            {
                if (!slup && st.glebia < 0) { slupem(); slup = true; }
                rysujStopien(ctx, cam, sp, st, kol(st.y), z, szczegoly);
            }
            if (!slup) slupem();
            rysujCokol(ctx, cam, sp, kol, z, kTop == 0);
            ctx.restore();
            return rys;
        }

        /// <summary>Wierzch muru w budowie: ostatni rząd ciosów nierówny — część kamieni już leży, części jeszcze brak.</summary>
        static void rysujWienczenieMuru(IPlotno ctx, Camera cam, Spirala sp, double y, Func<double, double[]> kol, double z)
        {
            var k = kol(y);
            for (int j = 0; j < 9; j++)
            {
                if (los(j * 31 + Rnd(y * 7)) < 0.45) continue;
                double f0 = -Math.PI / 2 + Math.PI * (j / 9.0), f1 = f0 + Math.PI / 9;
                var a = rzut(cam, sp, f0, sp.R, y - 0.3); var b = rzut(cam, sp, f1, sp.R, y - 0.3); var c = rzut(cam, sp, f1, sp.R, y); var d = rzut(cam, sp, f0, sp.R, y);
                ctx.fillStyle = barwa(k, 0.5 + 0.12 * los(j * 7 + 3)); wielokat(ctx, new[] { a, b, c, d }); ctx.fill();
                ctx.strokeStyle = "rgba(24,16,12,0.4)"; ctx.lineWidth = Math.Max(0.6, z * 0.025); ctx.stroke();
            }
        }

        /// <summary>Wierzch słupa w budowie: górny bęben widać z wierzchu (płaska elipsa).</summary>
        static void rysujWierzchSlupa(IPlotno ctx, Camera cam, Spirala sp, double y, Func<double, double[]> kol, double z)
        {
            var k = kol(y);
            double cx = cam.toScreenX(sp.c), cy = cam.toScreenY(y);
            ctx.fillStyle = barwa(k, 1.12);
            ctx.beginPath(); ctx.ellipse(cx, cy, sp.rn * z, Math.Max(1, sp.rn * SCHODY.ukos * z), 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(30,20,14,0.35)"; ctx.lineWidth = Math.Max(0.6, z * 0.025); ctx.stroke();
        }

        /// <summary>Cokół słupa na posadzce i (gdy schody stoją całe) głowica u góry odcinka.</summary>
        static void rysujCokol(IPlotno ctx, Camera cam, Spirala sp, Func<double, double[]> kol, double z, bool zGlowica = true)
        {
            void baza(double yy, double wys2, double szer2)
            {
                var k = kol(yy);
                double x0 = cam.toScreenX(sp.c - sp.rn - szer2), x1 = cam.toScreenX(sp.c + sp.rn + szer2);
                ctx.fillStyle = barwa(k, 0.96); ctx.fillRect(x0, cam.toScreenY(yy), x1 - x0, wys2 * z);
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, z * 0.04); ctx.strokeRect(x0, cam.toScreenY(yy), x1 - x0, wys2 * z);
            }
            baza(sp.ye - 0.35, 0.35, 0.16);
            if (zGlowica) baza(sp.ys, 0.22, 0.1);
        }

        /// <summary>Przybliżenie płótna odcinka — co ~19% (kamera, która płynnie zmienia przybliżenie, nie rysuje odcinka co klatkę).</summary>
        static double zoomPlotna(double z) => Math.Pow(2, Rnd(Math.Log(z) / Math.Log(2) * 4) / 4);   // (netstandard2.1 nie ma Math.Log2)

        static void rysujOdcinek(IPlotno ctx, Sim sim, Camera cam, double teraz, Prost o, int n)
        {
            var w = sim.world; var z = cam.zoom;
            double gora = Math.Floor(cam.toWorldY(0)) - 2, dol = Math.Ceiling(cam.toWorldY(cam.vh)) + 2;
            double lewa = cam.toWorldX(0), prawa = cam.toWorldX(cam.vw);
            if (o.x1 + 1 < lewa || o.x0 > prawa) return;
            var sp = spirala(sim, o);
            double y0 = Math.Max(sp.ys, gora), y1 = Math.Min(o.y1, dol);
            if (y0 > y1) return;
            // to, co stoi — z płócien kawałków odcinka
            if (!rysunki.TryGetValue(w, out var mapa)) { mapa = new Dictionary<string, RysunekKawalka>(); rysunki.Add(w, mapa); }
            var zp = zoomPlotna(z);
            double oy = sp.ys - 1.5, koniec = o.y1 + 2;
            double kTop = szczytSchodow(sim, n), N = liczbaStopni(sp), h = WYS();
            var rzedy = n < podpisyRzedow.Count ? podpisyRzedow[n] : new List<uint>();
            for (var j = Math.Max(0, Math.Floor((y0 - 1 - oy) / KAWALEK)); oy + j * KAWALEK < Math.Min(koniec, y1 + 2); j++)
            {
                double yA = oy + j * KAWALEK, yB = Math.Min(koniec, yA + KAWALEK);
                // podpis kawałka: wykute kafle jego rzędów (z zakładką) i ile z jego stopni już stoi
                int pod = unchecked((int)0x9e3779b9);
                for (var y = Math.Floor(yA) - 2; y <= Math.Ceiling(yB) + 2; y++)
                {
                    var ri = y - o.y0;
                    uint rz = ri >= 0 && ri < rzedy.Count ? rzedy[(int)ri] : 0;   // `rzedy[y - o.y0] ?? 0`
                    pod = unchecked((pod ^ (int)rz) * 16777619);
                }
                double kA = Math.Floor((yA - 1.6 - sp.ys) / h), kB = Math.Ceiling((yB + 1.2 - sp.ys) / h);
                var podpis = unchecked((uint)((pod ^ Js.Js.ToInt32(Math.Max(kA, Math.Min(Math.Min(kB + 1, kTop), N)))) * unchecked((int)2654435761)));
                var klucz = n + ":" + Js.Js.S(j);
                mapa.TryGetValue(klucz, out var rys);
                if (rys == null || rys.z != zp || rys.podpis != podpis)
                {
                    var nowy = narysujOdcinek(sim, o, zp, podpis, kTop, yA, yB);
                    if (nowy != null) { rys?.plotno.Dispose(); mapa[klucz] = nowy; rys = nowy; }
                }
                if (rys == null) continue;
                var k = z / rys.z;
                double sy0 = Math.Max(0, Math.Floor((y0 - 1 - rys.oy) * rys.z)), sy1 = Math.Min(rys.wys, Math.Ceiling((y1 + 2 - rys.oy) * rys.z));
                if (sy1 > sy0) ctx.drawImage(rys.plotno, 0, sy0, rys.szer, sy1 - sy0, cam.toScreenX(rys.ox), cam.toScreenY(rys.oy) + sy0 * k, rys.szer * k, (sy1 - sy0) * k);
            }
            // świeżo wykute kafle w kadrze: jaśniejszy, świeżo ciosany kamień, okruchy i pył
            var nowe = new List<(double x, double y, double t)>();
            for (var y = y0; y <= y1; y++) for (var x = o.x0; x <= o.x1; x++)
                {
                    var i = (int)w.idx(x, y);
                    if (w.schody[i] == 0) continue;
                    var t = pojawienie.TryGetValue(i, out var tt) ? tt : -1e9;
                    if (teraz - t < SCHODY.swiezyMs) nowe.Add((x, y, t));
                }
            if (nowe.Count == 0) return;
            foreach (var q in nowe)
            {
                var f = (teraz - q.t) / SCHODY.swiezyMs;
                if (f < 0 || f >= 1) continue;
                ctx.fillStyle = Barwa.Rgba(255, 238, 206, 0.2 * (1 - f) * (1 - f));
                ctx.fillRect(cam.toScreenX(q.x), cam.toScreenY(q.y), z + 0.5, z + 0.5);
            }
            if (!Nastroj.wolnoRuszac()) return;
            foreach (var q in nowe)
            {
                var t = (teraz - q.t) / 1000;
                if (t < 0 || t * 1000 >= SCHODY.okruchyMs) continue;
                var f = (t * 1000) / SCHODY.okruchyMs;
                var k = kamien(sim, q.y);
                var ziarno = q.x * 7919 + q.y * 104729;
                // pył: miękki obłok, rośnie i rzednie
                double px = cam.toScreenX(q.x + 0.5), py = cam.toScreenY(q.y + 0.55);
                var R = z * (0.45 + 1.1 * f);
                var g = ctx.createRadialGradient(px, py, 0, px, py, R);
                g.addColorStop(0, Barwa.Rgba(196, 176, 146, 0.42 * (1 - f))); g.addColorStop(1, "rgba(196,176,146,0)");
                ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2);
                // okruchy: kilka kanciastych kawałków skały leci w dół, obraca się i gaśnie
                for (int m = 0; m < 6; m++)
                {
                    double r1 = los(ziarno + m * 13), r2 = los(ziarno + m * 29), r3 = los(ziarno + m * 41);
                    var x = q.x + 0.15 + 0.7 * r1 + (r3 - 0.5) * 1.4 * t;
                    var y = q.y + 0.2 + 0.5 * r2 + 0.5 * 7 * t * t;
                    var s2 = z * (0.07 + 0.09 * r3);
                    double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
                    var kat = r1 * 6 + t * (3 + r2 * 5);
                    ctx.save();
                    ctx.translate(sx, sy); ctx.rotate(kat);
                    ctx.globalAlpha = 1 - f;
                    ctx.fillStyle = barwa(k, 0.62 + r2 * 0.3);
                    ctx.beginPath(); ctx.moveTo(-s2, -s2 * 0.6); ctx.lineTo(s2 * 0.8, -s2); ctx.lineTo(s2, s2 * 0.5); ctx.lineTo(-s2 * 0.5, s2); ctx.closePath(); ctx.fill();
                    ctx.restore();
                }
            }
        }

        /// <summary>
        /// 6.11, budowa schodów: ciosany stopień k odcinka `o` w drodze na swoje miejsce — ten sam kamień co osadzony
        /// (z bębnem słupa pod wewnętrznym końcem), przesunięty o `dx`, `dy` (kafle).
        /// </summary>
        public static void rysujKamienStopnia(IPlotno ctx, Sim sim, Camera cam, Prost o, double k, double dx, double dy)
        {
            var sp0 = spirala(sim, o);
            var sp = new Spirala { c = sp0.c + dx, R = sp0.R, rn = sp0.rn, ys = sp0.ys, ye = sp0.ye, th0 = sp0.th0 };
            double h = WYS(), D = TAU / SCHODY.stopni, z = cam.zoom;
            var y = sp0.ys + k * h + dy;
            double a = sp.th0 + k * D, b = a + D;
            var kol = kamien(sim, sp0.ys + k * h);
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            // bęben słupa (część stopnia — jak w prawdziwych schodach kręconych, każdy stopień niesie kawałek słupa)
            double xl = cam.toScreenX(sp.c - sp.rn), xr = cam.toScreenX(sp.c + sp.rn);
            var g = ctx.createLinearGradient(xl, 0, xr, 0);
            g.addColorStop(0, barwa(kol, 0.86)); g.addColorStop(0.28, barwa(kol, 1.04)); g.addColorStop(0.62, barwa(kol, 0.8)); g.addColorStop(1, barwa(kol, 0.5));
            ctx.fillStyle = g; ctx.fillRect(xl, cam.toScreenY(y), xr - xl, h * z);
            rysujStopien(ctx, cam, sp, new Stopien { k = k, y = y, a = a, b = b, glebia = JsM.Cos((a + b) / 2) }, kol, z, z >= 9);
            rysujWierzchSlupa(ctx, cam, sp, y, _ => kol, z);
            ctx.restore();
        }

        /// <summary>Punkt zaczepienia liny na kamieniu stopnia k (środek ciężaru płyty).</summary>
        public static (double x, double y) zaczepStopnia(Sim sim, Prost o, double k)
        {
            var sp = spirala(sim, o);
            var D = TAU / SCHODY.stopni;
            double th = sp.th0 + (k + 0.5) * D, r = (sp.rn + sp.R) / 2;
            return (sp.c + r * JsM.Sin(th), sp.ys + k * WYS() - SCHODY.ukos * r * JsM.Cos(th));
        }

        /// <summary>
        /// Stopnice pod stopami postaci na schodach — na nich leży jej cień: stopień pod nią i następny niższy (słabiej).
        /// Wielokąt stopnicy na ekranie, środek cienia i siła. `fx` — gdzie postać stoi na rysunku (kafle).
        /// </summary>
        public static List<(List<(double x, double y)> tr, double cx, double cy, double sila)> stopniePodStopami(Sim sim, Camera cam, Creature c, double fx)
        {
            var wynik = new List<(List<(double x, double y)> tr, double cx, double cy, double sila)>();
            var ns = naSchodach(sim, c);
            if (ns == null || ns.tryb != "schody") return wynik;
            var sp = ns.sp;
            double h = WYS(), D = TAU / SCHODY.stopni;
            var glebia = SCHODY.linia * JsM.Cos(ns.kat);
            var k0 = Math.Floor(ns.stopien);
            foreach (var (k, sila) in new[] { (k0, 1.0), (k0 + 1, 0.5) })
            {
                var y = sp.ys + k * h;
                if (k < ns.kTop || y >= sp.ye - 0.02) continue;
                double a = sp.th0 + k * D, b = a + D;
                var tr = new List<(double x, double y)>();
                for (int i = 0; i <= 4; i++) tr.Add(rzut(cam, sp, a + (b - a) * (i / 4.0), sp.R, y));
                tr.Add(rzut(cam, sp, b, sp.rn - 0.03, y)); tr.Add(rzut(cam, sp, a, sp.rn - 0.03, y));
                wynik.Add((tr, cam.toScreenX(fx), cam.toScreenY(y - SCHODY.ukos * glebia), sila));
            }
            return wynik;
        }

        static IPlotno? buforZaslony;

        /// <summary>
        /// Po narysowaniu postaci na schodach: to, co na spirali leży bliżej widza niż ona, rysuje się na niej — słup, gdy
        /// jest za nim, i stopnie bliżej widza (bez stopnia pod stopami i sąsiednich), przycięte do obrysu postaci
        /// i do wykutych kafli, przyciemnione warstwą mroku tej klatki. `fx, fy` — stopy na rysunku (kafle), `hPx` —
        /// wysokość sylwetki w pikselach.
        /// </summary>
        public static void zaslonNaSchodach(IPlotno ctx, Sim sim, Camera cam, Creature c, double fx, double fy, double hPx, double teraz)
        {
            var ns = naSchodach(sim, c);
            if (ns == null || ns.tryb != "schody") return;
            var w = sim.world; var sp = ns.sp; var o = ns.odcinek; var kTop = ns.kTop;
            double z = cam.zoom, zp = zoomPlotna(z);
            var hw = hPx / z;
            // obrys postaci (z bronią i kijem) — w siatce pikseli płótna odcinka
            double ox = o.x0 - 0.5, oy = sp.ys - 1.5;
            double X0 = ox + Math.Floor((fx - 0.95 * hw - ox) * zp) / zp, Y0 = oy + Math.Floor((fy - 1.5 * hw - oy) * zp) / zp;
            double X1 = fx + 0.95 * hw, Y1 = fy + 0.2 * hw;
            int bw = (int)Math.Ceiling((X1 - X0) * zp), bh = (int)Math.Ceiling((Y1 - Y0) * zp);
            if (bw <= 0 || bh <= 0 || bw > 4096 || bh > 4096) return;
            // co zasłania: stopnie bliżej widza niż postać (bez tych pod stopami) i słup, gdy postać jest za nim
            var glebia = JsM.Cos(ns.kat);
            double h = WYS(), D = TAU / SCHODY.stopni;
            var k0 = Math.Floor(ns.stopien);
            double kOd = Math.Max(kTop, Math.Floor((Y0 - 1.2 - sp.ys) / h)), kDo = Math.Ceiling((Y1 + 0.7 - sp.ys) / h);
            var stopnie = new List<Stopien>();
            for (var k = kOd; k <= kDo; k++)
            {
                var y = sp.ys + k * h;
                if (y >= sp.ye - 0.02) break;
                if (k == k0 - 1 || k == k0 || k == k0 + 1) continue;
                double a = sp.th0 + k * D, b = a + D, gl = JsM.Cos((a + b) / 2);
                if (gl < glebia - 0.02) stopnie.Add(new Stopien { k = k, y = y, a = a, b = b, glebia = gl });
            }
            var slup = glebia > 0;
            if (stopnie.Count == 0 && !slup) return;
            Js.Js.Sort(stopnie, (p, q) => q.glebia - p.glebia);
            // bufor: rysunek w przybliżeniu płótna odcinka, potem — jak płótno — skalowany do ekranu
            var buf = buforZaslony ??= Plotno.Nowe(bw, bh);
            if (buf.width < bw || buf.height < bh) { var nw = Math.Max(buf.width, bw); var nh = Math.Max(buf.height, bh); buf.width = nw; buf.height = nh; }
            var g = buf;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
            g.clearRect(0, 0, bw, bh);
            var camB = kameraPlotna(X0, Y0, zp, bw, bh);
            g.save();
            var okno = new Path2D();
            for (var y = Math.Floor(Y0); y <= Math.Floor(Y1); y++) for (var x = o.x0; x <= o.x1; x++)
                    if (w.inb(x, y) && w.schody[w.idx(x, y)] != 0) okno.rect(camB.toScreenX(x), camB.toScreenY(y), zp + 0.5, zp + 0.5);
            g.clip(okno);
            g.lineJoin = "round"; g.lineCap = "round";
            var szczegoly = zp >= 9;
            double[] kol(double yy) => kamien(sim, yy);
            // słup (jak na płótnie odcinka: od bębna najwyższego osadzonego stopnia w dół)
            var yTop = sp.ys + kTop * h;
            void slupem()
            {
                var tS = camB.toScreenY(yTop);
                g.save(); g.beginPath(); g.rect(0, tS, bw, bh - tS); g.clip();
                rysujSlup(g, camB, sp, sp.ys, sp.ye, kol, zp, szczegoly);
                g.restore();
                if (kTop > 0) rysujWierzchSlupa(g, camB, sp, yTop, kol, zp);
                rysujCokol(g, camB, sp, kol, zp, kTop == 0);
            }
            var slupJest = !slup;
            foreach (var st in stopnie)
            {
                if (!slupJest && st.glebia < 0) { slupem(); slupJest = true; }
                rysujStopien(g, camB, sp, st, kol(st.y), zp, szczegoly);
            }
            if (!slupJest) slupem();
            g.restore();
            // mrok tej klatki — tylko na tym, co narysowano
            double sx = cam.toScreenX(X0), sy = cam.toScreenY(Y0), sw = bw * (z / zp), sh = bh * (z / zp);
            var mr = RysMrok.warstwaMroku(teraz);
            if (mr is { } m)
            {
                g.globalCompositeOperation = "source-atop";
                g.drawImage(m.plotno, sx * m.k, sy * m.k, sw * m.k, sh * m.k, 0, 0, bw, bh);
                g.globalCompositeOperation = "source-over";
            }
            // tylko obrys postaci (bufor bywa większy niż ten obrys)
            ctx.save();
            ctx.beginPath(); ctx.rect(cam.toScreenX(fx - 0.95 * hw), cam.toScreenY(fy - 1.5 * hw), 1.9 * hw * z, 1.7 * hw * z); ctx.clip();
            ctx.drawImage(buf, 0, 0, bw, bh, sx, sy, sw, sh);
            ctx.restore();
        }
    }
}
