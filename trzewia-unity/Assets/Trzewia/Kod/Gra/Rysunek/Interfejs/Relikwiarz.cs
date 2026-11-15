// Port: alpha-1/src/render/relikwiarz.ts — KREW: relikwiarz z ampułką. Gotycka oprawa ze złota (wimperga z żabkami,
// rozetą i kwiatonem, dwie przypory z niszami i fialami, ostrołuk z maswerkiem, cokół z kaboszonem, trzon z węzłem,
// stopa z perełkami), a w niej szklana ampułka na aksamicie, w której stoi krew. Granaty żarzą się tym mocniej, im
// więcej krwi; przy dopływie rozbłyskują, przy ubytku gasną; pełna ampułka pulsuje. Rysunek w układzie 72×100.
// W Alphie 1 na komputerze relikwiarz jest tylko na tablicy atlasu „Krew” (pod płytą był na telefonie).
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Relikwiarz
    {
        /// <summary>Szerokość relikwiarza względem jego wysokości.</summary>
        public const double RELIKWIARZ_PROPORCJA = 0.72;

        sealed class Bryly
        {
            public Path2D stopa = null!, stopaRant = null!, trzon = null!, wezel = null!, cokolListwa = null!, cokolSkos = null!, cokolSzyja = null!;
            public List<Path2D> przypory = new List<Path2D>(), gzymsy = new List<Path2D>(), fialeTrzon = new List<Path2D>(), iglice = new List<Path2D>();
            public Path2D nisze = null!, szczyciki = null!, wimperga = null!, wimpergaPole = null!, wneka = null!, archiwolta = null!, kolumienki = null!;
            public Path2D szklo = null!, zakretka = null!, oprawka = null!, klamry = null!;
            /// <summary>Cała złota oprawa — do przyciemniania i blasku.</summary>
            public Path2D oprawa = null!;
        }
        static Bryly? bryly;
        const double PI = Math.PI;
        static double R(double v) => Math.Floor(v + 0.5);
        static double F3(double v) => Math.Round(v, 3, MidpointRounding.AwayFromZero);
        static (double, double) lerp((double, double) a, (double, double) b, double t) => (a.Item1 + (b.Item1 - a.Item1) * t, a.Item2 + (b.Item2 - a.Item2) * t);

        static Bryly zbuduj()
        {
            var b = new Bryly();
            var stopa = new Path2D();
            stopa.moveTo(31, 88);
            stopa.bezierCurveTo(31, 91.2, 23, 92.6, 10, 94.4);
            stopa.lineTo(8.6, 97.6);
            stopa.quadraticCurveTo(36, 100.6, 63.4, 97.6);
            stopa.lineTo(62, 94.4);
            stopa.bezierCurveTo(49, 92.6, 41, 91.2, 41, 88);
            stopa.closePath();
            var stopaRant = new Path2D();
            stopaRant.moveTo(10, 94.4);
            stopaRant.lineTo(8.6, 97.6);
            stopaRant.quadraticCurveTo(36, 100.6, 63.4, 97.6);
            stopaRant.lineTo(62, 94.4);
            stopaRant.quadraticCurveTo(36, 97.4, 10, 94.4);
            stopaRant.closePath();

            var trzon = new Path2D();
            trzon.moveTo(33.4, 75.8); trzon.lineTo(38.6, 75.8);
            trzon.quadraticCurveTo(37.6, 82, 39.4, 88.4); trzon.lineTo(32.6, 88.4);
            trzon.quadraticCurveTo(34.4, 82, 33.4, 75.8); trzon.closePath();
            var wezel = new Path2D();
            wezel.ellipse(36, 82.2, 8.6, 3.9, 0, 0, PI * 2);

            var cokolListwa = new Path2D(); cokolListwa.rect(14, 67.6, 44, 3.6);
            var cokolSkos = new Path2D();
            cokolSkos.moveTo(16, 71.2); cokolSkos.lineTo(56, 71.2); cokolSkos.lineTo(52.8, 74.8); cokolSkos.lineTo(19.2, 74.8); cokolSkos.closePath();
            var cokolSzyja = new Path2D(); cokolSzyja.rect(30.5, 74.8, 11, 1.4);

            Path2D nisze = new Path2D(), szczyciki = new Path2D();
            foreach (double x0 in new double[] { 9, 55 })
            {
                var p = new Path2D();
                p.moveTo(x0, 67.6); p.lineTo(x0, 52); p.lineTo(x0 + 1.2, 50.4); p.lineTo(x0 + 1.2, 32.4);
                p.lineTo(x0 + 6.8, 32.4); p.lineTo(x0 + 6.8, 50.4); p.lineTo(x0 + 8, 52); p.lineTo(x0 + 8, 67.6); p.closePath();
                b.przypory.Add(p);
                var g = new Path2D(); g.rect(x0 + 0.6, 30.8, 6.8, 1.8); b.gzymsy.Add(g);
                // nisze w przyporze: dolna szersza, górna smukła, obie ostrołukowe
                nisze.moveTo(x0 + 2.2, 65); nisze.lineTo(x0 + 2.2, 57.4);
                nisze.quadraticCurveTo(x0 + 2.2, 54.8, x0 + 4, 54); nisze.quadraticCurveTo(x0 + 5.8, 54.8, x0 + 5.8, 57.4);
                nisze.lineTo(x0 + 5.8, 65); nisze.closePath();
                nisze.moveTo(x0 + 2.8, 48); nisze.lineTo(x0 + 2.8, 38.6);
                nisze.quadraticCurveTo(x0 + 2.8, 36.8, x0 + 4, 36.2); nisze.quadraticCurveTo(x0 + 5.2, 36.8, x0 + 5.2, 38.6);
                nisze.lineTo(x0 + 5.2, 48); nisze.closePath();
                // fiala: trzon z daszkiem i iglica
                var ft = new Path2D(); ft.rect(x0 + 1.6, 24.4, 4.8, 6.4); b.fialeTrzon.Add(ft);
                szczyciki.moveTo(x0 + 1.6, 26.8); szczyciki.lineTo(x0 + 4, 23.4); szczyciki.lineTo(x0 + 6.4, 26.8); szczyciki.closePath();
                var ig = new Path2D(); ig.moveTo(x0 + 1.3, 24.8); ig.lineTo(x0 + 4, 11.4); ig.lineTo(x0 + 6.7, 24.8); ig.closePath();
                b.iglice.Add(ig);
            }

            var wimperga = new Path2D();
            wimperga.moveTo(15.4, 32.4); wimperga.lineTo(36, 6); wimperga.lineTo(56.6, 32.4); wimperga.closePath();
            var wimpergaPole = new Path2D();
            wimpergaPole.moveTo(19.6, 31); wimpergaPole.lineTo(36, 10); wimpergaPole.lineTo(52.4, 31); wimpergaPole.closePath();

            var wneka = new Path2D();
            wneka.moveTo(17.2, 67.6); wneka.lineTo(17.2, 37.4);
            wneka.bezierCurveTo(17.2, 28.6, 27, 23.4, 36, 21.4);
            wneka.bezierCurveTo(45, 23.4, 54.8, 28.6, 54.8, 37.4);
            wneka.lineTo(54.8, 67.6); wneka.closePath();
            var archiwolta = new Path2D();
            archiwolta.moveTo(17.2, 37.4);
            archiwolta.bezierCurveTo(17.2, 28.6, 27, 23.4, 36, 21.4);
            archiwolta.bezierCurveTo(45, 23.4, 54.8, 28.6, 54.8, 37.4);
            archiwolta.lineTo(52.4, 37.4);
            archiwolta.bezierCurveTo(52.4, 30, 43.6, 25.6, 36, 24);
            archiwolta.bezierCurveTo(28.4, 25.6, 19.6, 30, 19.6, 37.4);
            archiwolta.closePath();
            var kolumienki = new Path2D();
            kolumienki.rect(17.2, 37.4, 2.4, 30.2); kolumienki.rect(52.4, 37.4, 2.4, 30.2);
            kolumienki.rect(16.8, 36.2, 3.2, 1.6); kolumienki.rect(52, 36.2, 3.2, 1.6);

            var szklo = new Path2D();
            szklo.moveTo(32.8, 34.6); szklo.lineTo(32.8, 36.4);
            szklo.bezierCurveTo(32.8, 38.6, 25.6, 39.2, 25.6, 43.2);
            szklo.lineTo(25.6, 60.6);
            szklo.bezierCurveTo(25.6, 65.4, 30, 66.4, 36, 66.4);
            szklo.bezierCurveTo(42, 66.4, 46.4, 65.4, 46.4, 60.6);
            szklo.lineTo(46.4, 43.2);
            szklo.bezierCurveTo(46.4, 39.2, 39.2, 38.6, 39.2, 36.4);
            szklo.lineTo(39.2, 34.6); szklo.closePath();
            var zakretka = new Path2D();
            zakretka.rect(31.8, 31, 8.4, 4.2);
            zakretka.moveTo(31.8, 31); zakretka.lineTo(32.6, 29.2); zakretka.lineTo(34, 31); zakretka.lineTo(36, 28.4);
            zakretka.lineTo(38, 31); zakretka.lineTo(39.4, 29.2); zakretka.lineTo(40.2, 31); zakretka.closePath();
            // oprawka pod szkłem: korona z ząbkami obejmuje dno ampułki
            var oprawka = new Path2D();
            oprawka.moveTo(24.6, 61.8); oprawka.lineTo(26.8, 67.6); oprawka.lineTo(45.2, 67.6); oprawka.lineTo(47.4, 61.8);
            oprawka.lineTo(45.2, 63.4); oprawka.lineTo(42.6, 61.4); oprawka.lineTo(39.4, 63.6); oprawka.lineTo(36, 61.2);
            oprawka.lineTo(32.6, 63.6); oprawka.lineTo(29.4, 61.4); oprawka.lineTo(26.8, 63.4); oprawka.closePath();
            var klamry = new Path2D();
            klamry.rect(19.6, 47.6, 5.6, 1.4); klamry.rect(46.8, 47.6, 5.6, 1.4);
            klamry.moveTo(26.5, 48.3); klamry.arc(25.6, 48.3, 0.9, 0, PI * 2);
            klamry.moveTo(47.3, 48.3); klamry.arc(46.4, 48.3, 0.9, 0, PI * 2);

            var oprawa = new Path2D();
            var lista = new List<Path2D> { stopa, trzon, wezel, cokolListwa, cokolSkos, cokolSzyja };
            lista.AddRange(b.przypory); lista.AddRange(b.gzymsy); lista.AddRange(b.fialeTrzon); lista.AddRange(b.iglice);
            lista.AddRange(new[] { wimperga, archiwolta, kolumienki, zakretka, oprawka, klamry });
            foreach (var p in lista) oprawa.addPath(p);
            b.stopa = stopa; b.stopaRant = stopaRant; b.trzon = trzon; b.wezel = wezel; b.cokolListwa = cokolListwa; b.cokolSkos = cokolSkos; b.cokolSzyja = cokolSzyja;
            b.nisze = nisze; b.szczyciki = szczyciki; b.wimperga = wimperga; b.wimpergaPole = wimpergaPole; b.wneka = wneka; b.archiwolta = archiwolta;
            b.kolumienki = kolumienki; b.szklo = szklo; b.zakretka = zakretka; b.oprawka = oprawka; b.klamry = klamry; b.oprawa = oprawa;
            return b;
        }

        // pamięć zmian (żar przy dopływie)
        static double pKrew = -1, pT = -1e9, pZnak = 0, pSzczyt = 0, pSzczytT = 0;

        /// <summary>Złoto: poziomy gradient z blaskiem z lewej (światło lampki pada z lewej, z góry).</summary>
        static CanvasGradient zloto(IPlotno ctx, double x0, double x1, double jas)
        {
            var g = ctx.createLinearGradient(x0, 0, x1, 0);
            Styl c(double k) { var m = k * jas; return Barwa.Rgba(Math.Min(255, R(184 * m)), Math.Min(255, R(142 * m)), Math.Min(255, R(74 * m)), 1); }
            g.addColorStop(0, c(0.5));
            g.addColorStop(0.2, c(1.18));
            g.addColorStop(0.45, c(0.92));
            g.addColorStop(0.75, c(0.6));
            g.addColorStop(1, c(0.38));
            return g;
        }

        /// <summary>Granat w złotej oprawce; `zar` 0..1 — jak mocno świeci od środka.</summary>
        static void granat(IPlotno ctx, double cx, double cy, double rx, double ry, double zar, bool szczegol)
        {
            if (zar > 0.05)
            {
                var h = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.Max(rx, ry) * 4);
                h.addColorStop(0, Barwa.Rgba(255, 70, 48, F3(0.45 * zar)));
                h.addColorStop(1, "rgba(255,70,48,0)");
                ctx.fillStyle = h;
                ctx.fillRect(cx - rx * 4, cy - ry * 4, rx * 8, ry * 8);
            }
            if (szczegol)
            {
                ctx.beginPath(); ctx.ellipse(cx, cy, rx + 0.6, ry + 0.6, 0, 0, PI * 2);
                ctx.fillStyle = "rgb(214,176,98)"; ctx.fill();
                ctx.strokeStyle = "rgba(40,22,8,0.85)"; ctx.lineWidth = 0.35; ctx.stroke();
            }
            var g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, 0.05, cx, cy, Math.Max(rx, ry) * 1.05);
            var z = Math.Min(1, zar);
            g.addColorStop(0, Barwa.Rgba(255, R(110 + 70 * z), R(96 + 60 * z), 1));
            g.addColorStop(0.35, Barwa.Rgba(R(170 + 60 * z), R(22 + 26 * z), R(30 + 16 * z), 1));
            g.addColorStop(1, Barwa.Rgba(R(70 + 40 * z), 4, 10, 1));
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, PI * 2);
            ctx.fillStyle = g; ctx.fill();
            if (szczegol)
            {
                ctx.fillStyle = "rgba(255,248,240,0.85)";
                ctx.beginPath(); ctx.ellipse(cx - rx * 0.38, cy - ry * 0.42, rx * 0.26, ry * 0.2, -0.5, 0, PI * 2); ctx.fill();
            }
        }

        /// <summary>Połowa szerokości wnętrza ampułki na wysokości y (barki się zwężają ku szyjce).</summary>
        static double polSzerokosci(double y)
        {
            if (y >= 43.2) return 10.6;
            var t = Math.Max(0, Math.Min(1, (y - 36.4) / 6.8));
            return 3 + 7.6 * (1 - (1 - t) * (1 - t));
        }

        /// <summary>Poziom krwi w układzie rysunku: dno oprawki (pusto) → barki ampułki (pełno).</summary>
        const double DNO = 63, PELNO = 40.2;

        /// <summary>Pozycje granatów (dla błysku światła, który co parę sekund przeskakuje po kamieniach).</summary>
        static readonly (double, double)[] BLYSKI = { (36, 17), (36, 73), (42.2, 82.3), (29.8, 82.3), (36, 82.3) };

        /// <summary>
        /// Relikwiarz w prostokącie o lewym górnym rogu (x, y) i wysokości h. `krew` / `max` — ile krwi i ile się mieści;
        /// `czas` — zegar w ms. `spokoj` — bez ruchu; `pamietaj` — rysunek śledzi zmiany krwi (rycina w atlasie nie śledzi).
        /// </summary>
        public static void rysujRelikwiarz(IPlotno ctx, double x, double y, double h, double krew, double max, double czas, bool spokoj = false, bool pamietaj = true)
        {
            var b = bryly ??= zbuduj();
            var s = h / 100;
            double px(double n) => n / s;                     // grubość kreski w pikselach ekranu
            var poziom = Math.Max(0, Math.Min(1, krew / Math.Max(1, max)));
            var pelna = krew >= max - 0.5;
            // żar przy dopływie, przygaśnięcie przy wydatku; najwyższy poziom zostaje na szkle i powoli schnie
            double blysk = 0, zgas = 0, szczyt = poziom;
            if (pamietaj)
            {
                if (pKrew >= 0 && Math.Abs(krew - pKrew) >= 0.5) { pT = czas; pZnak = Math.Sign(krew - pKrew); }
                pKrew = krew;
                var odZmiany = Math.Max(0, 1 - (czas - pT) / 1100);
                blysk = pZnak > 0 ? odZmiany : 0;
                zgas = pZnak < 0 ? odZmiany : 0;
                var dt = Math.Max(0, Math.Min(1000, czas - pSzczytT));
                pSzczytT = czas;
                pSzczyt = Math.Max(poziom, pSzczyt - dt * 0.000012);
                szczyt = pSzczyt;
            }
            var tetno = spokoj ? 0.5 : 0.5 + 0.5 * JsM.Sin(czas * 0.0032);
            var zar = Math.Min(1.4, 0.18 + 0.55 * poziom + 0.8 * blysk + (pelna ? 0.35 * tetno : 0) - 0.4 * zgas);
            // poziomy szczegółów: z daleka sama bryła
            bool sredni = h >= 34, drobny = h >= 64;
            // złoto jaśnieje z krwią — pusty relikwiarz stoi w cieniu
            var migot = spokoj ? 1 : 1 + 0.025 * JsM.Sin(czas * 0.011) * JsM.Sin(czas * 0.0037);
            var jas = (0.7 + 0.3 * poziom + 0.12 * blysk - 0.1 * zgas) * migot;
            var t = spokoj ? 0 : czas;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(s, s);
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            // blask za relikwiarzem
            if (pelna || blysk > 0.02)
            {
                var a = (pelna ? 0.2 + 0.16 * tetno : 0) + 0.28 * blysk;
                var g = ctx.createRadialGradient(36, 50, 4, 36, 50, 62);
                g.addColorStop(0, Barwa.Rgba(200, 40, 30, F3(a)));
                g.addColorStop(1, "rgba(200,40,30,0)");
                ctx.fillStyle = g;
                ctx.fillRect(-26, -12, 124, 124);
            }

            const string kontur = "rgba(34,18,6,0.92)";
            void zlocenie(Path2D p, double x0, double x1, double k = 1) => Fresk.pigment(ctx, p, zloto(ctx, x0, x1, jas * k), drobny ? 0.5 : 0, "zloto");

            // wimperga (pod wnęką)
            zlocenie(b.wimperga, 15, 57, 1.05);
            zlocenie(b.wimpergaPole, 19, 53, 0.78);
            ctx.strokeStyle = kontur; ctx.lineWidth = px(0.7);
            ctx.stroke(b.wimperga);
            if (sredni) ctx.stroke(b.wimpergaPole);

            // wnęka: aksamit, na nim refleks krwi
            ctx.fillStyle = "rgb(30,9,9)";
            ctx.fill(b.wneka);
            ctx.save();
            ctx.clip(b.wneka);
            var rg = ctx.createRadialGradient(36, 54, 2, 36, 54, 24);
            rg.addColorStop(0, Barwa.Rgba(150, 26, 22, F3(0.16 + 0.34 * poziom + 0.2 * blysk)));
            rg.addColorStop(1, "rgba(150,26,22,0)");
            ctx.fillStyle = rg;
            ctx.fillRect(17, 21, 38, 47);
            if (drobny)
            {
                // wzór aksamitu: romby z kropkami złota
                ctx.strokeStyle = "rgba(120,40,30,0.35)"; ctx.lineWidth = px(0.5);
                ctx.beginPath();
                for (double k = -40; k < 60; k += 4.4) { ctx.moveTo(17 + k, 68); ctx.lineTo(17 + k + 47, 21); ctx.moveTo(17 + k, 21); ctx.lineTo(17 + k + 47, 68); }
                ctx.stroke();
                ctx.fillStyle = "rgba(214,170,90,0.35)";
                for (double yy = 27; yy < 68; yy += 4.4) for (var xx = 19.2 + ((yy / 4.4) % 2) * 2.2; xx < 54; xx += 4.4)
                    {
                        ctx.beginPath(); ctx.arc(xx, yy, 0.32, 0, PI * 2); ctx.fill();
                    }
            }
            ctx.restore();

            // ampułka z krwią
            ctx.save();
            ctx.clip(b.szklo);
            ctx.fillStyle = "rgba(18,9,9,0.9)";
            ctx.fillRect(24, 33, 24, 35);
            var pow = DNO - (DNO - PELNO) * poziom;
            if (poziom > 0.001)
            {
                double fala(double xx) => spokoj ? 0 : JsM.Sin(xx * 0.9 + t * 0.004) * 0.18 + JsM.Sin(xx * 0.37 - t * 0.0026) * 0.14;
                var kg = ctx.createLinearGradient(0, pow, 0, 66.4);
                kg.addColorStop(0, Barwa.Rgba(R(176 + 40 * blysk), R(30 + 20 * blysk), 26, 1));
                kg.addColorStop(0.4, "rgb(116,18,18)");
                kg.addColorStop(1, "rgb(38,4,6)");
                ctx.fillStyle = kg;
                ctx.beginPath();
                ctx.moveTo(24, 68);
                for (double xx = 24; xx <= 48; xx += 1) ctx.lineTo(xx, pow + fala(xx));
                ctx.lineTo(48, 68); ctx.closePath(); ctx.fill();
                // kreski ryciny w krwi
                if (sredni)
                {
                    ctx.strokeStyle = "rgba(16,2,3,0.32)"; ctx.lineWidth = px(0.6);
                    ctx.beginPath();
                    for (var yy = pow + 2.2; yy < 66.4; yy += drobny ? 1.9 : 2.8) { ctx.moveTo(24, yy); ctx.lineTo(48, yy); }
                    ctx.stroke();
                }
                // lustro krwi: elipsa widziana lekko z góry
                var pw = polSzerokosci(pow);
                ctx.beginPath(); ctx.ellipse(36, pow, pw, sredni ? 1.1 : 0.8, 0, 0, PI * 2);
                ctx.fillStyle = Barwa.Rgba(R(196 + 40 * blysk), R(58 + 30 * blysk), 46, 0.95); ctx.fill();
                ctx.strokeStyle = "rgba(255,160,128,0.8)"; ctx.lineWidth = px(0.8);
                ctx.beginPath(); ctx.ellipse(36, pow, pw, sredni ? 1.1 : 0.8, 0, 0.1, PI - 0.1); ctx.stroke();
                // bąbelki: wolno zawsze, gęsto po dopływie
                if (sredni && poziom > 0.06 && !spokoj)
                {
                    var ile = 3 + R(5 * blysk);
                    for (int i = 0; i < ile; i++)
                    {
                        var f = (t * (0.00028 + (i % 3) * 0.00009) + i * 0.317) % 1;
                        var by = 64.5 - f * (64.5 - pow - 0.8);
                        var bx = 28.4 + ((i * 5.3) % 15.6) + JsM.Sin(f * 9 + i) * 0.7;
                        var r = 0.32 + 0.22 * (i % 2);
                        ctx.strokeStyle = Barwa.Rgba(255, 170, 140, F3(0.55 * (1 - f) * (0.4 + blysk))); ctx.lineWidth = px(0.5);
                        ctx.beginPath(); ctx.arc(bx, by, r, 0, PI * 2); ctx.stroke();
                    }
                }
            }
            // ślad dawnego poziomu: zaschnięta obwódka i zacieki spływające ku krwi
            if (drobny && szczyt - poziom > 0.04)
            {
                var ys = DNO - (DNO - PELNO) * szczyt;
                var sw = polSzerokosci(ys);
                var a = Math.Min(0.62, 0.18 + (szczyt - poziom) * 2.2);
                ctx.strokeStyle = Barwa.Rgba(168, 38, 30, F3(a)); ctx.lineWidth = px(0.7);
                ctx.beginPath(); ctx.ellipse(36, ys, sw, 0.9, 0, 0.15, PI - 0.15); ctx.stroke();
                ctx.lineWidth = px(0.55);
                for (int i = 0; i < 5; i++)
                {
                    var zx = 27.6 + i * 4.1 + (i % 2) * 0.8;
                    var dl = (pow - ys) * (0.25 + ((i * 37) % 5) * 0.13);
                    ctx.strokeStyle = Barwa.Rgba(156, 30, 24, F3(a * 0.85));
                    ctx.beginPath(); ctx.moveTo(zx, ys + 0.6); ctx.lineTo(zx + 0.15, ys + 0.6 + dl); ctx.stroke();
                    ctx.fillStyle = Barwa.Rgba(170, 34, 26, F3(a * 0.95));
                    ctx.beginPath(); ctx.arc(zx + 0.15, ys + 0.6 + dl, 0.38, 0, PI * 2); ctx.fill();
                }
            }
            // walec szkła: brzegi ciemniejsze
            var cyl = ctx.createLinearGradient(25.6, 0, 46.4, 0);
            cyl.addColorStop(0, "rgba(0,0,0,0.55)"); cyl.addColorStop(0.28, "rgba(0,0,0,0)");
            cyl.addColorStop(0.7, "rgba(0,0,0,0)"); cyl.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = cyl; ctx.fillRect(24, 33, 24, 35);
            // odblaski szkła
            if (sredni)
            {
                ctx.strokeStyle = "rgba(255,246,232,0.55)"; ctx.lineWidth = px(1.3);
                ctx.beginPath(); ctx.moveTo(28.3, 43.4); ctx.lineTo(28.3, 60.4); ctx.stroke();
                ctx.lineWidth = px(0.6); ctx.strokeStyle = "rgba(255,246,232,0.3)";
                ctx.beginPath(); ctx.moveTo(30, 44.6); ctx.lineTo(30, 52); ctx.stroke();
                ctx.strokeStyle = "rgba(255,246,232,0.38)";
                ctx.beginPath(); ctx.moveTo(44.2, 44.4); ctx.lineTo(44.2, 50.6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(29.4, 41.4); ctx.quadraticCurveTo(31.2, 39.2, 33.6, 38.4); ctx.stroke();
            }
            ctx.restore();
            ctx.strokeStyle = "rgba(236,226,206,0.78)"; ctx.lineWidth = px(0.9);
            ctx.stroke(b.szklo);

            // oprawa ampułki
            foreach (var (p, x0, x1) in new[] { (b.oprawka, 24.0, 48.0), (b.zakretka, 31.0, 41.0), (b.klamry, 19.0, 53.0) })
            {
                zlocenie(p, x0, x1);
                ctx.strokeStyle = kontur; ctx.lineWidth = px(0.6); ctx.stroke(p);
            }

            // ostrołuk z maswerkiem i kolumienki
            zlocenie(b.archiwolta, 17, 55, 1.1);
            zlocenie(b.kolumienki, 16, 56);
            ctx.strokeStyle = kontur; ctx.lineWidth = px(0.6);
            ctx.stroke(b.archiwolta); ctx.stroke(b.kolumienki);
            if (drobny)
            {
                // trójliść pod łukiem
                ctx.strokeStyle = Barwa.Rgba(222, 186, 110, F3(0.85 * jas)); ctx.lineWidth = px(0.9);
                ctx.beginPath();
                ctx.arc(28.6, 29.8, 3, PI * 0.1, PI * 0.9);
                ctx.moveTo(39, 27.4); ctx.arc(36, 27.4, 3, 0, PI);
                ctx.moveTo(46.4, 29.8); ctx.arc(43.4, 29.8, 3, PI * 0.1, PI * 0.9);
                ctx.stroke();
                // żłobki kolumienek
                ctx.strokeStyle = "rgba(60,36,12,0.55)"; ctx.lineWidth = px(0.45);
                ctx.beginPath(); ctx.moveTo(18.4, 38.4); ctx.lineTo(18.4, 67); ctx.moveTo(53.6, 38.4); ctx.lineTo(53.6, 67); ctx.stroke();
            }

            // przypory, nisze, fiale
            for (int i = 0; i < b.przypory.Count; i++)
            {
                var p = b.przypory[i];
                double x0 = i == 0 ? 9 : 55;
                zlocenie(p, x0, x0 + 8);
                zlocenie(b.gzymsy[i], x0, x0 + 8, 1.1);
                zlocenie(b.fialeTrzon[i], x0 + 1.5, x0 + 6.5);
                zlocenie(b.iglice[i], x0 + 1.3, x0 + 6.7, 1.05);
                ctx.strokeStyle = kontur; ctx.lineWidth = px(0.6);
                ctx.stroke(p); ctx.stroke(b.gzymsy[i]); ctx.stroke(b.fialeTrzon[i]); ctx.stroke(b.iglice[i]);
            }
            if (sredni)
            {
                ctx.fillStyle = "rgb(28,12,8)"; ctx.fill(b.nisze);
                zlocenie(b.szczyciki, 9, 63, 1.05);
                ctx.strokeStyle = kontur; ctx.lineWidth = px(0.5); ctx.stroke(b.szczyciki);
            }
            if (drobny)
            {
                // w niszach blade figurki świętych — dwie kreski i główka
                ctx.fillStyle = Barwa.Rgba(214, 190, 140, F3(0.55 * jas));
                foreach (double x0 in new double[] { 9, 55 })
                {
                    ctx.beginPath(); ctx.arc(x0 + 4, 57.4, 0.7, 0, PI * 2); ctx.fill();
                    ctx.fillRect(x0 + 3.4, 58.2, 1.2, 5.4);
                    ctx.beginPath(); ctx.arc(x0 + 4, 40.4, 0.55, 0, PI * 2); ctx.fill();
                    ctx.fillRect(x0 + 3.55, 41.1, 0.9, 5.6);
                }
                // żabki na iglicach i kwiatony
                foreach (double x0 in new double[] { 9, 55 })
                {
                    var lewa = ((x0 + 1.3, 24.8), (x0 + 4, 11.4)); var prawa = ((x0 + 6.7, 24.8), (x0 + 4, 11.4));
                    foreach (var (kraw, zn) in new[] { (lewa, -1.0), (prawa, 1.0) })
                    {
                        foreach (var u in new[] { 0.3, 0.55, 0.8 })
                        {
                            var (qx, qy) = lerp(kraw.Item1, kraw.Item2, u);
                            zabka(ctx, qx + zn * 0.55, qy + 0.1, 0.62, zn, jas, px);
                        }
                    }
                    kwiaton(ctx, x0 + 4, 11.2, 0.8, jas, px, false);
                }
            }

            // wimperga: żabki, rozeta, kwiaton z krzyżem
            if (drobny)
            {
                (double, double) L = (15.4, 32.4), A = (36, 6), Rr = (56.6, 32.4);
                foreach (var u in new[] { 0.2, 0.38, 0.56, 0.74 })
                {
                    var (lx, ly) = lerp(L, A, u); zabka(ctx, lx - 0.85, ly - 0.55, 0.95, -1, jas, px);
                    var (rx, ry) = lerp(Rr, A, u); zabka(ctx, rx + 0.85, ry - 0.55, 0.95, 1, jas, px);
                }
                // rozeta: pierścień i sześć płatków maswerku
                ctx.beginPath(); ctx.arc(36, 17, 3.5, 0, PI * 2);
                ctx.fillStyle = "rgb(26,10,8)"; ctx.fill();
                ctx.strokeStyle = Barwa.Rgba(226, 190, 112, F3(0.95 * jas)); ctx.lineWidth = px(0.9); ctx.stroke();
                ctx.lineWidth = px(0.55);
                ctx.beginPath();
                for (int k = 0; k < 6; k++)
                {
                    var a = (k / 6.0) * PI * 2;
                    ctx.moveTo(36 + JsM.Cos(a) * 1.7, 17 + JsM.Sin(a) * 1.7);
                    ctx.lineTo(36 + JsM.Cos(a) * 3.4, 17 + JsM.Sin(a) * 3.4);
                }
                ctx.stroke();
            }
            granat(ctx, 36, 17, drobny ? 1.5 : 2.2, drobny ? 1.5 : 2.2, zar, sredni);
            if (sredni) kwiaton(ctx, 36, 5.6, 1.1, jas, px, true);
            else
            {
                ctx.strokeStyle = Barwa.Rgba(226, 190, 112, F3(jas)); ctx.lineWidth = px(1);
                ctx.beginPath(); ctx.moveTo(36, 6); ctx.lineTo(36, 1); ctx.moveTo(34.4, 2.6); ctx.lineTo(37.6, 2.6); ctx.stroke();
            }

            // cokół, trzon, węzeł, stopa
            zlocenie(b.cokolListwa, 14, 58, 1.08);
            zlocenie(b.cokolSkos, 16, 56, 0.85);
            zlocenie(b.cokolSzyja, 30, 42, 0.8);
            zlocenie(b.trzon, 32, 40, 0.95);
            zlocenie(b.wezel, 27, 45, 1.05);
            zlocenie(b.stopa, 8, 64, 0.95);
            zlocenie(b.stopaRant, 8, 64, 1.08);
            ctx.strokeStyle = kontur; ctx.lineWidth = px(0.6);
            foreach (var p in new[] { b.cokolListwa, b.cokolSkos, b.cokolSzyja, b.trzon, b.wezel, b.stopa, b.stopaRant }) ctx.stroke(p);
            if (drobny)
            {
                // fryz arkadek na listwie cokołu
                ctx.strokeStyle = "rgba(70,42,14,0.7)"; ctx.lineWidth = px(0.45);
                ctx.beginPath();
                for (var xx = 15.6; xx < 56.5; xx += 2.6) { ctx.moveTo(xx, 70.6); ctx.lineTo(xx, 69.2); ctx.arc(xx + 1.3, 69.2, 1.3, PI, 0); ctx.lineTo(xx + 2.6, 70.6); }
                ctx.stroke();
                // perełki na rancie stopy
                ctx.fillStyle = Barwa.Rgba(246, 226, 176, F3(0.9 * jas));
                for (var xx = 11.5; xx <= 60.6; xx += 2.45)
                {
                    var u = (xx - 36) / 26.4;
                    ctx.beginPath(); ctx.arc(xx, 96.5 + 1.6 * (1 - u * u), 0.42, 0, PI * 2); ctx.fill();
                }
                // płaty stopy (sześcioliść widziany z przodu)
                ctx.strokeStyle = "rgba(70,42,14,0.6)"; ctx.lineWidth = px(0.5);
                ctx.beginPath();
                foreach (var k in new[] { -1, 0, 1 }) { var cx = 36 + k * 13; ctx.moveTo(cx - 6, 94.6); ctx.quadraticCurveTo(cx, 91.6 + Math.Abs(k) * 0.6, cx + 6, 94.6); }
                ctx.stroke();
                // pierścienie trzonu
                ctx.beginPath(); ctx.ellipse(36, 78.2, 2.7, 0.6, 0, 0, PI); ctx.ellipse(36, 86.4, 3.1, 0.6, 0, 0, PI); ctx.stroke();
            }
            // granaty: kaboszon na cokole, trzy na węźle, dwa na stopie
            if (sredni)
            {
                granat(ctx, 36, 73, 2.3, 1.25, zar * 0.9, drobny);
                foreach (var (gx, gr) in new[] { (29.8, 1.05), (36.0, 1.35), (42.2, 1.05) }) granat(ctx, gx, 82.3, gr, gr * 0.95, zar * 0.8, drobny);
                if (drobny) foreach (var gx in new double[] { 22, 50 }) granat(ctx, gx, 93.4, 1.1, 0.75, zar * 0.7, true);
            }

            // błysk światła przeskakuje po granatach co kilka sekund
            if (drobny && !spokoj)
            {
                const double okres = 3700;
                var f = (czas % okres) / okres;
                if (f < 0.12)
                {
                    var (gx, gy) = BLYSKI[(int)(Math.Floor(czas / okres) % BLYSKI.Length)];
                    var r = 2.4 * JsM.Sin((f / 0.12) * PI);
                    ctx.strokeStyle = "rgba(255,250,240,0.9)"; ctx.lineWidth = px(0.6);
                    ctx.beginPath();
                    ctx.moveTo(gx - 0.5 - r, gy - 0.5); ctx.lineTo(gx - 0.5 + r, gy - 0.5);
                    ctx.moveTo(gx - 0.5, gy - 0.5 - r); ctx.lineTo(gx - 0.5, gy - 0.5 + r);
                    ctx.stroke();
                }
            }

            // światło i cień rycinowe
            if (sredni)
            {
                // blask na lewych krawędziach
                ctx.strokeStyle = Barwa.Rgba(255, 236, 186, F3(0.5 * jas)); ctx.lineWidth = px(0.7);
                ctx.beginPath();
                ctx.moveTo(9.5, 53); ctx.lineTo(9.5, 67);
                ctx.moveTo(55.5, 53); ctx.lineTo(55.5, 67);
                ctx.moveTo(16.4, 31.6); ctx.lineTo(35.6, 7);
                ctx.moveTo(14.6, 68.2); ctx.lineTo(57.4, 68.2);
                ctx.moveTo(30, 89.4); ctx.bezierCurveTo(29.6, 91.6, 22, 92.8, 11, 94.6);
                ctx.stroke();
            }
            if (drobny)
            {
                // kreskowanie cieni: prawe boki przypór, węzła i stopy
                ctx.save();
                var cien = new Path2D();
                cien.rect(14.2, 33, 3, 35); cien.rect(60.2, 33, 3, 35);
                cien.rect(39.5, 78, 6, 8); cien.rect(46, 88.6, 18, 9.8);
                ctx.clip(b.oprawa);
                ctx.clip(cien);
                ctx.strokeStyle = "rgba(36,18,4,0.42)"; ctx.lineWidth = px(0.45);
                ctx.beginPath();
                for (double k = -110; k < 110; k += 1.25) { ctx.moveTo(k, 100); ctx.lineTo(k + 100, 0); }
                ctx.stroke();
                ctx.restore();
            }
            // przy wydatku oprawa na chwilę przygasa
            if (zgas > 0.02)
            {
                ctx.fillStyle = Barwa.Rgba(8, 4, 2, F3(0.35 * zgas));
                ctx.fill(b.oprawa);
            }
            ctx.restore();
        }

        /// <summary>Żabka gotycka: zwinięty liść na krawędzi (zn — w którą stronę się zwija).</summary>
        static void zabka(IPlotno ctx, double x, double y, double r, double zn, double jas, Func<double, double> px)
        {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, PI * 2);
            ctx.fillStyle = Barwa.Rgba(R(200 * jas), R(160 * jas), R(86 * jas), 1);
            ctx.fill();
            ctx.strokeStyle = "rgba(40,22,8,0.85)"; ctx.lineWidth = px(0.4);
            ctx.stroke();
            ctx.beginPath(); ctx.arc(x + zn * r * 0.25, y + r * 0.1, r * 0.45, PI * 0.2, PI * 1.5); ctx.stroke();
        }

        /// <summary>Kwiaton: trzy liście na szczycie, na wimperdze jeszcze krzyżyk.</summary>
        static void kwiaton(IPlotno ctx, double x, double y, double r, double jas, Func<double, double> px, bool krzyz)
        {
            ctx.fillStyle = Barwa.Rgba(R(214 * jas), R(174 * jas), R(96 * jas), 1);
            ctx.strokeStyle = "rgba(40,22,8,0.85)"; ctx.lineWidth = px(0.4);
            foreach (var (dx, dy) in new[] { (-r * 1.15, -r * 0.4), (r * 1.15, -r * 0.4), (0.0, -r * 1.3) })
            {
                ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, PI * 2); ctx.fill(); ctx.stroke();
            }
            if (!krzyz) return;
            ctx.fillRect(x - 0.55, y - r * 2.2 - 3.6, 1.1, 3.8);
            ctx.fillRect(x - 1.7, y - r * 2.2 - 2.7, 3.4, 1.0);
            ctx.strokeRect(x - 0.55, y - r * 2.2 - 3.6, 1.1, 3.8);
        }
    }
}
