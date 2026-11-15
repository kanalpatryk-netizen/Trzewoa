// Port: alpha-1/src/render/budowa-schodow.ts — BUDOWA SCHODÓW DROGI WIERNYCH, rysunek (6.11; symulacja —
// Symulacja/BudowaSchodow.cs). W odcinku szybu, który się jeszcze kopie albo w którym stawia się schody: drabina o tylną
// ścianę surowego szybu, rusztowanie z pomostem nad najwyższym stopniem, kołowrót nad wylotem (słup, wysięgnik z blokiem,
// wał z korbą, lina z kubłem urobku albo z paletą ciosanych stopni), hałda urobku i stos stopni. Rysunek po schodach,
// przed mrokiem.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.BudowaSchodow;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek budowy schodów (RysBudowaSchodow — bo BudowaSchodow to klasa symulacji).</summary>
    public static class RysBudowaSchodow
    {
        const double TAU = Math.PI * 2;
        const string TUSZ = "rgba(30,20,14,0.9)";
        static readonly double[] DREWNO = { 118, 82, 50 };
        static readonly double[] LINA = { 168, 134, 88 };
        const string ZELAZO = "rgba(46,42,44,0.95)";

        static double Rnd(double v) => Math.Floor(v + 0.5);
        static Styl barwa(double[] k, double m, double a = 1) =>
            Barwa.Rgba(Math.Min(255, Rnd(k[0] * m)), Math.Min(255, Rnd(k[1] * m)), Math.Min(255, Rnd(k[2] * m)), a);

        /// <summary>Rzut punktu w szybie (jak schody): kąt, promień od środka, wysokość — dalej w głąb, odrobinę wyżej.</summary>
        static (double x, double y) rzut(Camera cam, Spirala sp, double th, double r, double y) =>
            (cam.toScreenX(sp.c + r * JsM.Sin(th)), cam.toScreenY(y - SCHODY.ukos * r * JsM.Cos(th)));

        /// <summary>Belka: ciemny obrys pod spodem, drewno na wierzchu i jaśniejsza krawędź od światła.</summary>
        static void belka(IPlotno ctx, (double x, double y) a, (double x, double y) b, double grubosc, double z, double jasnosc = 1)
        {
            var g = Math.Max(1.2, grubosc * z);
            ctx.strokeStyle = TUSZ; ctx.lineWidth = g + Math.Max(1, z * 0.05);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.strokeStyle = barwa(DREWNO, jasnosc); ctx.lineWidth = g;
            ctx.stroke();
            if (z >= 9)
            {
                ctx.strokeStyle = barwa(DREWNO, jasnosc * 1.32, 0.55); ctx.lineWidth = Math.Max(0.6, g * 0.3);
                ctx.beginPath(); ctx.moveTo(a.x - g * 0.18, a.y - g * 0.18); ctx.lineTo(b.x - g * 0.18, b.y - g * 0.18); ctx.stroke();
            }
        }

        /// <summary>Wiązanie liną na złączu belek: kilka zwojów.</summary>
        static void wiazanie(IPlotno ctx, (double x, double y) p, double z)
        {
            if (z < 7) return;
            ctx.strokeStyle = barwa(LINA, 0.78); ctx.lineWidth = Math.Max(0.8, z * 0.035);
            for (int i = -1; i <= 1; i++)
            {
                ctx.beginPath(); ctx.moveTo(p.x - z * 0.09, p.y + i * z * 0.05 - z * 0.03); ctx.lineTo(p.x + z * 0.09, p.y + i * z * 0.05 + z * 0.03); ctx.stroke();
            }
        }

        /// <summary>Lina: ciemny obrys i konopna barwa.</summary>
        static void lina(IPlotno ctx, IList<(double x, double y)> pts, double z)
        {
            if (pts.Count < 2) return;
            ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
            for (int i = 1; i < pts.Count; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = "rgba(30,18,10,0.7)"; ctx.lineWidth = Math.Max(1.6, z * 0.07); ctx.stroke();
            ctx.strokeStyle = barwa(LINA, 1); ctx.lineWidth = Math.Max(0.9, z * 0.038); ctx.stroke();
        }

        /// <summary>Czy wylot odcinka jest wykuty (kołowrót stoi nad otworem, drabina wystaje nad posadzkę).</summary>
        static bool wylotOtwarty(Sim sim, Prost o, Spirala sp)
        {
            var w = sim.world; var y = Math.Floor(sp.ys);
            for (var x = o.x0; x <= o.x1; x++) if (!w.passable(x, y)) return false;
            return true;
        }

        /// <summary>Kołowrót nad wylotem odcinka: słup z prawej, wysięgnik do bloku nad środkiem szybu, wał z korbą na słupie.</summary>
        struct Kolowrot { public double slup, podloga, gora, blokX, blokY, walX, walY; }
        static Kolowrot kolowrot(Sim sim, Prost o, Spirala sp)
        {
            var w = sim.world;
            var podloga = sp.ys;
            double wolne = 0;
            for (var y = Math.Floor(podloga) - 1; y >= 0 && wolne < 6 && w.passable(Math.Floor(sp.c), y) && w.passable(o.x1 + 1, y); y--) wolne++;
            var hK = Math.Max(1.4, Math.Min(3, wolne - 0.35));
            var slup = o.x1 + 1.35;
            return new Kolowrot { slup = slup, podloga = podloga, gora = podloga - hK, blokX = sp.c, blokY = podloga - hK + 0.24, walX = slup + 0.38, walY = podloga - 0.9 };
        }

        /// <summary>Przycina rysunek do wnętrza szybu (wykute kafle odcinka w kadrze) i do przestrzeni nad wylotem.</summary>
        static void przytnijDoSzybu(IPlotno ctx, Sim sim, Camera cam, Prost o, Spirala sp, double gora, double dol)
        {
            var w = sim.world; var z = cam.zoom;
            var p = new Path2D();
            double y0 = Math.Max(Math.Floor(sp.ys) - 2, Math.Floor(gora)), y1 = Math.Min(o.y1, Math.Ceiling(dol));
            for (var y = y0; y <= y1; y++)
            {
                var x = o.x0;
                while (x <= o.x1)
                {
                    if (!w.passable(x, y)) { x++; continue; }
                    var x2 = x;
                    while (x2 + 1 <= o.x1 && w.passable(x2 + 1, y)) x2++;
                    p.rect(cam.toScreenX(x), cam.toScreenY(y), (x2 - x + 1) * z + 0.5, z + 0.5);
                    x = x2 + 1;
                }
            }
            ctx.clip(p);
        }

        /// <summary>Drabina o tylną ścianę: dwie żerdzie, szczeble, odcinki po ~6 kafli wiązane liną.</summary>
        static void rysujDrabine(IPlotno ctx, Camera cam, Spirala sp, double y0, double y1, double z, double gora, double dol)
        {
            if (y1 - y0 < 0.3) return;
            var d = pozycjaDrabiny(sp);
            var off = -SCHODY.ukos * d.glebia;
            double ya = Math.Max(y0, gora - 1), yb = Math.Min(y1, dol + 1);
            if (yb <= ya) return;
            const double pol = 0.3;
            double X(double dx) => cam.toScreenX(d.x + dx);
            double Y(double y) => cam.toScreenY(y + off);
            // szczeble (za żerdziami)
            var krok = BUDOWA_SCHODOW.szczebel;
            var pierwszy = y0 + 0.22 + Math.Ceiling((ya - y0 - 0.22) / krok) * krok;
            for (var y = pierwszy; y <= yb - 0.08; y += krok) belka(ctx, (X(-pol), Y(y)), (X(pol), Y(y)), 0.06, z, 0.92);
            // żerdzie w odcinkach (co ~6 kafli złącze: nadstawka zachodzi na poprzednią i jest związana)
            const double odc = 6;
            for (var s0 = y0; s0 < y1; s0 += odc)
            {
                var s1 = Math.Min(y1, s0 + odc + 0.35);
                if (s1 < ya || s0 > yb) continue;
                var przes = (Rnd((s0 - y0) / odc) % 2) * 0.035;
                foreach (var bok in new double[] { -1, 1 })
                {
                    var x = X(bok * (pol + przes));
                    belka(ctx, (x, Y(Math.Max(s0, ya))), (x, Y(Math.Min(s1, yb))), 0.085, z, 1);
                    if (s0 > y0 && s0 >= ya && s0 <= yb) { wiazanie(ctx, (x, Y(s0 + 0.12)), z); wiazanie(ctx, (x, Y(s0 + 0.3)), z); }
                }
            }
        }

        /// <summary>
        /// Rusztowanie nad najwyższym stopniem: stojaki przy ścianie, rygle, z tyłu pomost z desek i zastrzały na krzyż.
        /// `przod` — część przed drabiną (inaczej za nią). `yP` — najniższy pomost.
        /// </summary>
        static void rysujRusztowanie(IPlotno ctx, Camera cam, Spirala sp, double yTop, double yP, double z, bool przod)
        {
            var r = sp.R - 0.2;
            var yGora = yP - BUDOWA_SCHODOW.rusztowanie;
            var yStopa = Math.Min(yTop + 0.25, yP + 2.4);
            double[] tyl = { -0.95, 0.95 }, prz = { -2.3, 2.3 };
            var poziomy = new List<double>();
            for (var y = yP; y >= yGora + 0.4; y -= BUDOWA_SCHODOW.pomost) poziomy.Add(y);
            if (!przod)
            {
                // stojaki z tyłu
                foreach (var f in tyl) belka(ctx, rzut(cam, sp, f, r, yStopa), rzut(cam, sp, f, r, yGora), 0.13, z, 0.82);
                for (int i = 0; i < poziomy.Count; i++)
                {
                    var y = poziomy[i];
                    // zastrzały na krzyż między tylnymi stojakami (pod pomostem)
                    var yn = i + 1 < poziomy.Count ? poziomy[i + 1] : yGora;
                    belka(ctx, rzut(cam, sp, tyl[0], r, y), rzut(cam, sp, tyl[1], r, yn + 0.15), 0.06, z, 0.7);
                    belka(ctx, rzut(cam, sp, tyl[1], r, y), rzut(cam, sp, tyl[0], r, yn + 0.15), 0.06, z, 0.7);
                    // pomost z desek między ścianą a tylnymi stojakami — widać z wierzchu i krawędź desek
                    var a = rzut(cam, sp, tyl[0], r, y); var b = rzut(cam, sp, tyl[1], r, y);
                    var aw = rzut(cam, sp, -0.6, sp.R - 0.05, y); var bw = rzut(cam, sp, 0.6, sp.R - 0.05, y);
                    ctx.fillStyle = barwa(DREWNO, 1.1);
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(aw.x, aw.y); ctx.lineTo(bw.x, bw.y); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill();
                    if (z >= 9)
                    {
                        ctx.strokeStyle = "rgba(40,26,16,0.45)"; ctx.lineWidth = Math.Max(0.6, z * 0.025);
                        for (int t = 1; t < 6; t++)
                        {
                            var u = t / 6.0;
                            double p0x = a.x + (b.x - a.x) * u, p0y = a.y + (b.y - a.y) * u, p1x = aw.x + (bw.x - aw.x) * u, p1y = aw.y + (bw.y - aw.y) * u;
                            ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); ctx.stroke();
                        }
                    }
                    ctx.fillStyle = barwa(DREWNO, 0.72);
                    ctx.fillRect(Math.Min(a.x, b.x), a.y, Math.Abs(b.x - a.x), Math.Max(1.5, z * 0.11));
                    belka(ctx, a, b, 0.09, z, 0.9);
                    wiazanie(ctx, a, z); wiazanie(ctx, b, z);
                }
                return;
            }
            // z przodu: rygle po bokach (od tylnego do przedniego stojaka) i z przodu, potem przednie stojaki
            foreach (var y in poziomy)
            {
                belka(ctx, rzut(cam, sp, tyl[0], r, y), rzut(cam, sp, prz[0], r, y), 0.08, z, 0.95);
                belka(ctx, rzut(cam, sp, tyl[1], r, y), rzut(cam, sp, prz[1], r, y), 0.08, z, 0.95);
                belka(ctx, rzut(cam, sp, prz[0], r, y), rzut(cam, sp, prz[1], r, y), 0.08, z, 1.02);
            }
            foreach (var f in prz) belka(ctx, rzut(cam, sp, f, r, yStopa), rzut(cam, sp, f, r, yGora), 0.13, z, 1.05);
            foreach (var y in poziomy) foreach (var f in prz) wiazanie(ctx, rzut(cam, sp, f, r, y), z);
        }

        /// <summary>Wał kołowrotu (z boku: koło z nawiniętą liną) z korbą — kąt korby `kat`.</summary>
        static void rysujKolowrot(IPlotno ctx, Camera cam, Kolowrot k, double kat, double z)
        {
            double X(double x) => cam.toScreenX(x);
            double Y(double y) => cam.toScreenY(y);
            // słup na posadzce, wysięgnik nad szyb, zastrzał pod wysięgnikiem, podpora z boku
            belka(ctx, (X(k.slup), Y(k.podloga)), (X(k.slup), Y(k.gora)), 0.17, z, 0.95);
            belka(ctx, (X(k.slup + 0.35), Y(k.gora + 0.08)), (X(k.blokX - 0.25), Y(k.gora + 0.08)), 0.15, z, 1);
            belka(ctx, (X(k.slup), Y(k.gora + 0.85)), (X(k.slup - 0.75), Y(k.gora + 0.1)), 0.08, z, 0.85);
            belka(ctx, (X(k.slup + 0.75), Y(k.podloga)), (X(k.slup), Y(k.podloga - 1.05)), 0.08, z, 0.8);
            wiazanie(ctx, (X(k.slup), Y(k.gora + 0.1)), z);
            // blok na końcu wysięgnika
            double bx = X(k.blokX), by = Y(k.blokY);
            ctx.fillStyle = barwa(DREWNO, 0.8); ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.04);
            ctx.beginPath(); ctx.arc(bx, by, Math.Max(2, z * 0.16), 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(bx, by, Math.Max(1, z * 0.05), 0, TAU); ctx.fill();
            // wał z nawiniętą liną
            double wx = X(k.walX), wy = Y(k.walY), R = Math.Max(3, z * 0.26);
            ctx.fillStyle = barwa(DREWNO, 0.72); ctx.beginPath(); ctx.arc(wx, wy, R, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = barwa(LINA, 0.9); ctx.lineWidth = Math.Max(0.8, z * 0.035);
            for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(wx, wy, R * (0.55 + 0.15 * i), kat * 0.5 + i, kat * 0.5 + i + 4.4); ctx.stroke(); }
            // ramię korby i rączka (od strony tego, kto kręci — z prawej)
            var rk = R * 1.45;
            double hx = wx + JsM.Cos(kat) * rk * 0.35 + R * 0.5, hy = wy + JsM.Sin(kat) * rk;
            belka(ctx, (wx, wy), (hx, hy), 0.06, z, 0.95);
            ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(wx, wy, Math.Max(1.2, z * 0.06), 0, TAU); ctx.fill();
            belka(ctx, (hx, hy), (hx + Math.Max(2, z * 0.22), hy), 0.07, z, 1.1);
        }

        /// <summary>Kubeł z urobkiem (z boku): klepki, obręcze, kabłąk do haka; pełny — z kamieniami na wierzchu.</summary>
        static void rysujKubel(IPlotno ctx, double x, double y, double z, bool pelny, double przechyl)
        {
            double w = z * 0.52, h = z * 0.5;
            ctx.save();
            ctx.translate(x, y); ctx.rotate(przechyl);
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.04);
            ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.42, h); ctx.lineTo(-w * 0.42, h); ctx.closePath();
            ctx.fillStyle = barwa(DREWNO, 0.95); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = ZELAZO; ctx.lineWidth = Math.Max(0.8, z * 0.045);
            foreach (var t in new[] { 0.22, 0.78 }) { ctx.beginPath(); ctx.moveTo(-w * (0.5 - 0.08 * t), h * t); ctx.lineTo(w * (0.5 - 0.08 * t), h * t); ctx.stroke(); }
            if (pelny)
            {
                ctx.fillStyle = "rgba(92,84,76,1)";
                for (int i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-w * 0.32 + i * w * 0.21, -h * 0.04, Math.Max(1, z * (0.07 + 0.03 * (i % 2))), 0, TAU); ctx.fill(); }
            }
            // kabłąk
            ctx.strokeStyle = ZELAZO; ctx.lineWidth = Math.Max(0.8, z * 0.035);
            ctx.beginPath(); ctx.arc(0, 0, w * 0.5, Math.PI, 0); ctx.stroke();
            ctx.restore();
        }

        /// <summary>Hałda urobku przy kołowrocie (wielkość 0..1) i — przy budowie — stos ciosanych stopni (ile zostało).</summary>
        static void rysujHalde(IPlotno ctx, Camera cam, Kolowrot k, double wielkosc, double stopni, double z)
        {
            double X(double x) => cam.toScreenX(x);
            double Y(double y) => cam.toScreenY(y);
            double x0 = k.slup + 2.6, R = 0.5 + 1.1 * wielkosc, H = 0.25 + 0.75 * wielkosc;
            if (wielkosc > 0.02)
            {
                ctx.fillStyle = "rgba(78,70,62,1)"; ctx.strokeStyle = "rgba(24,18,14,0.7)"; ctx.lineWidth = Math.Max(0.8, z * 0.035);
                ctx.beginPath(); ctx.moveTo(X(x0 + 0.6 - R), Y(k.podloga));
                ctx.quadraticCurveTo(X(x0 + 0.6), Y(k.podloga - H * 2), X(x0 + 0.6 + R), Y(k.podloga));
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // grudy kamienia na zboczach
                ctx.fillStyle = "rgba(112,104,94,1)";
                for (int i = 0; i < 7; i++)
                {
                    double t = (i + 0.5) / 7, gx = x0 + 0.6 - R + 2 * R * t, gy = k.podloga - H * 2 * 4 * t * (1 - t) * 0.5 - 0.06;
                    ctx.beginPath(); ctx.arc(X(gx), Y(gy), Math.Max(1, z * (0.06 + 0.04 * ((i * 7) % 3) / 2.0)), 0, TAU); ctx.fill();
                }
            }
            // stos ciosanych stopni obok hałdy (przy budowie)
            var ile = Math.Min(5, Math.Ceiling(stopni / 30));
            for (int i = 0; i < ile; i++)
            {
                double bx = x0 + 0.6 + R + 0.25 + (i % 2) * 0.12, by = k.podloga - 0.24 * (i + 1);
                ctx.fillStyle = "rgba(150,138,118,1)"; ctx.strokeStyle = "rgba(30,22,16,0.7)"; ctx.lineWidth = Math.Max(0.8, z * 0.03);
                ctx.fillRect(X(bx), Y(by), 0.95 * z, 0.22 * z); ctx.strokeRect(X(bx), Y(by), 0.95 * z, 0.22 * z);
            }
        }

        static double gladko(double t) { var u = Math.Max(0, Math.Min(1, t)); return u * u * (3 - 2 * u); }

        /// <summary>Budowa schodów we wszystkich odcinkach szybu drogi wiernych (przed mrokiem, po schodach).</summary>
        public static void rysujBudoweSchodow(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            if (w.odcinkiDrogi.Count == 0) return;
            var st = stanSchodow(sim);
            double gora = cam.toWorldY(0) - 4, dol = cam.toWorldY(cam.vh) + 4;
            double lewa = cam.toWorldX(0) - 6, prawa = cam.toWorldX(cam.vw) + 6;
            var z = cam.zoom;
            for (int n = 0; n < w.odcinkiDrogi.Count; n++)
            {
                var o = w.odcinkiDrogi[n];
                var b = n < st.odcinki.Count ? st.odcinki[n] : null;
                if (b == null || b.etap == "gotowe") continue;
                if (o.x1 + 7 < lewa || o.x0 - 2 > prawa || o.y1 + 1 < gora || o.y0 - 5 > dol) continue;
                var sp = spirala(sim, o);
                if (!wylotOtwarty(sim, o, sp)) continue;
                var budowa = b.etap == "budowa" && b.stopni > 0;
                var yTop = wysokoscSzczytu(sim, n);
                var yDol = dolDrabiny(sim, n);
                ctx.save();
                ctx.lineCap = "round"; ctx.lineJoin = "round";
                // w szybie: rusztowanie (tył), drabina, rusztowanie (przód)
                ctx.save();
                przytnijDoSzybu(ctx, sim, cam, o, sp, gora, dol);
                var yP = budowa ? pomostNadSchodami(sim, n) : 0;
                if (budowa) rysujRusztowanie(ctx, cam, sp, yTop, yP, z, false);
                rysujDrabine(ctx, cam, sp, sp.ys - 1.6, yDol, z, gora, dol);
                if (budowa) rysujRusztowanie(ctx, cam, sp, yTop, yP, z, true);
                ctx.restore();
                // nad wylotem: hałda, ładunek na linie, kołowrót
                var k = kolowrot(sim, o, sp);
                var zaglebienie = Math.Max(0, Math.Min(1, (yDol - sp.ys) / Math.Max(1, sp.ye - sp.ys)));
                rysujHalde(ctx, cam, k, b.etap == "budowa" ? 1 : zaglebienie, b.etap == "budowa" ? Math.Max(0, szczytSchodow(sim, n)) : 0, z);
                rysujLadunek(ctx, sim, cam, o, n, sp, k, b, yDol, z);
                var kat = b.kreci == true ? teraz * 0.0042 : 0.6;
                rysujKolowrot(ctx, cam, k, kat, z);
                ctx.restore();
            }
        }

        /// <summary>Paleta (deska na płozach) z ciosanymi stopniami — `ile` kamieni; `zawieszona` — z linkami do haka.</summary>
        static (double x, double y) rysujPalete(IPlotno ctx, double x, double y, double z, double ile, bool zawieszona)
        {
            double w = z * 1.15, d = Math.Max(2, z * 0.12);
            // kamienie (płyty stopni widziane z boku), od dołu
            for (int i = 0; i < ile; i++)
            {
                double by = y - d - (i + 1) * z * 0.21, bx = x - z * 0.48 + (i % 2) * z * 0.06;
                ctx.fillStyle = Barwa.Rgba(146 - i * 4, 134 - i * 4, 114 - i * 4, 1); ctx.fillRect(bx, by, z * 0.92, z * 0.2);
                ctx.fillStyle = "rgba(232,220,196,0.35)"; ctx.fillRect(bx, by, z * 0.92, Math.Max(1, z * 0.04));
                ctx.strokeStyle = "rgba(30,22,16,0.7)"; ctx.lineWidth = Math.Max(0.7, z * 0.03); ctx.strokeRect(bx, by, z * 0.92, z * 0.2);
            }
            // deska
            ctx.fillStyle = barwa(DREWNO, 0.95); ctx.fillRect(x - w / 2, y - d, w, d);
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, z * 0.035); ctx.strokeRect(x - w / 2, y - d, w, d);
            var hak = (x, y - d - Math.Max(1, ile) * z * 0.21 - z * 0.55);
            if (zawieszona)
            {
                lina(ctx, new[] { (x - w / 2 + z * 0.06, y - d), hak, (x + w / 2 - z * 0.06, y - d) }, z);
                ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(hak.Item1, hak.Item2, Math.Max(1.2, z * 0.06), 0, TAU); ctx.fill();
            }
            return hak;
        }

        /// <summary>Ile ciosanych stopni zjeżdża naraz na jednej palecie.</summary>
        const double NA_PALECIE = 4;

        /// <summary>
        /// Lina z bloku w dół i to, co na niej wisi: przy kopaniu kubeł urobku, przy budowie paleta z ciosanymi stopniami
        /// i kamień w rękach murarzy, który siada na swoim miejscu.
        /// </summary>
        static void rysujLadunek(IPlotno ctx, Sim sim, Camera cam, Prost o, int n, Spirala sp, Kolowrot k, BudowaOdcinka b, double yDol, double z)
        {
            double X(double x) => cam.toScreenX(x);
            double Y(double y) => cam.toScreenY(y);
            var blok = (X(k.blokX), Y(k.blokY));
            // od wału do bloku
            lina(ctx, new[] { (X(k.walX - 0.2), Y(k.walY - 0.2)), (blok.Item1 + z * 0.12, blok.Item2 - z * 0.1) }, z);
            if (b.etap == "kopanie")
            {
                var f = b.kubel;
                double yG = k.blokY + 0.55, yD = yDol - 0.52;
                double y = yG, przechyl = 0; var pelny = false;
                if (f < 0.42) y = yG + (yD - yG) * gladko(f / 0.42);
                else if (f < 0.5) { y = yD; pelny = f > 0.46; }
                else if (f < 0.92) { y = yD + (yG - yD) * gladko((f - 0.5) / 0.42); pelny = true; }
                else { y = yG; przechyl = JsM.Sin(((f - 0.92) / 0.08) * Math.PI) * 0.9; pelny = f < 0.96; }
                lina(ctx, new[] { blok, (X(k.blokX), Y(y - 0.32)) }, z);
                rysujKubel(ctx, X(k.blokX), Y(y - 0.3), z, pelny, przechyl);
                return;
            }
            // budowa: kołowrót opuszcza paletę z NA_PALECIE ciosanymi stopniami i stawia ją na pomoście rusztowania;
            // murarze biorą z niej kamienie po kolei, a pusty hak wraca w górę po następną
            var kN = szczytSchodow(sim, n) - 1;
            if (kN < 0) return;
            var p = b.postep;
            var g = ((b.stopni % NA_PALECIE) + p) / NA_PALECIE;
            var yP = pomostNadSchodami(sim, n);
            double palX = sp.c + 0.85, palY = yP - SCHODY.ukos * 1.6;
            // na pomoście: paleta z kamieniami, których jeszcze nie wzięto
            var zostalo = NA_PALECIE - (b.stopni % NA_PALECIE) - (p > 0.05 ? 1 : 0);
            if (zostalo > 0 || p > 0.05) rysujPalete(ctx, X(palX), Y(palY), z, Math.Max(0, zostalo), false);
            // kamień w rękach murarzy: z palety na swoje miejsce, potem siada na zaprawie
            var zacz = Schody.zaczepStopnia(sim, o, kN);
            var t = gladko(p / 0.6);
            double dx = (palX - zacz.x) * (1 - t), dy = (palY - 0.35 - zacz.y) * (1 - t) - 0.18 * JsM.Sin(Math.Min(1, p / 0.6) * Math.PI);
            Schody.rysujKamienStopnia(ctx, sim, cam, o, kN, dx, dy);
            // lina i hak: w górę pusty, chwila u góry (ładują), w dół z pełną paletą
            double yGb = k.blokY + 0.5, yDb = palY - 0.05;
            if (g < 0.25)
            {
                var yh = yDb - 0.9 + (yGb - (yDb - 0.9)) * gladko(g / 0.25);
                lina(ctx, new[] { blok, (X(k.blokX), Y(yh)) }, z);
                ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(X(k.blokX), Y(yh), Math.Max(1.2, z * 0.06), 0, TAU); ctx.fill();
            }
            else if (g < 0.5)
            {
                lina(ctx, new[] { blok, (X(k.blokX), Y(yGb)) }, z);
                ctx.fillStyle = ZELAZO; ctx.beginPath(); ctx.arc(X(k.blokX), Y(yGb), Math.Max(1.2, z * 0.06), 0, TAU); ctx.fill();
            }
            else
            {
                // pełna paleta zjeżdża (pod blokiem, potem w bok nad pomost — linę odciąga murarz)
                var u = gladko((g - 0.5) / 0.5);
                double py = yGb + 1.1 + (yDb - 0.15 - (yGb + 1.1)) * u, px = k.blokX + (palX - k.blokX) * gladko((u - 0.75) / 0.25);
                var hak = rysujPalete(ctx, X(px), Y(py), z, NA_PALECIE, true);
                lina(ctx, new[] { blok, hak }, z);
            }
        }
    }
}
