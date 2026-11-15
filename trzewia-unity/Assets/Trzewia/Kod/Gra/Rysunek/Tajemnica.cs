// Port: alpha-1/src/render/tajemnica.ts — warstwa, która robi z płyty starą, zakazaną rycinę: rytowana ciemność na
// brzegach oddychająca razem z rdzeniem, patyna odbitki, skala głębokości w piśmie, którego nikt nie zna, i znaki wyryte
// w skale, zanim ktokolwiek tam dotarł — widać je tylko tam, gdzie jeszcze nikt nie patrzył.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Prostokąt płyty (x, y, w, h) — jak Plate w TS (pełny Plate: etap 5).</summary>
    public struct ProstokatPlyty
    {
        public double x, y, w, h;
        public ProstokatPlyty(double x, double y, double w, double h) { this.x = x; this.y = y; this.w = w; this.h = h; }
    }

    public sealed class Tajemnica
    {
        // ------------------------------------------------------------------ nieznane pismo

        static readonly Dictionary<double, Path2D> glify = new Dictionary<double, Path2D>();

        /// <summary>Xorshift z ziarna (tajemnica.ts: losy).</summary>
        public static Func<double> losy(double ziarno)
        {
            uint s = Js.Js.ToUint32(ziarno * 2654435761.0);
            if (s == 0) s = 1;
            return () =>
            {
                s ^= s << 13; s ^= s >> 17; s ^= s << 5;
                return s / 4294967296.0;
            };
        }

        /// <summary>
        /// Glif na siatce 3×3 w polu [−1, 1]: pień, dwie–cztery kreski między węzłami, czasem oczko albo haczyk.
        /// `zawilosc` dokłada kresek — im głębiej, tym dziwniej.
        /// </summary>
        public static Path2D glif(double ziarno, double zawilosc = 0)
        {
            var klucz = ziarno * 8 + Math.Min(7, zawilosc);
            lock (glify) { if (glify.TryGetValue(klucz, out var gotowy)) return gotowy; }
            var r = losy(ziarno + 17);
            var p = new Path2D();
            double w(int i) => (i - 1) * 0.9;           // węzeł siatki
            if (r() < 0.7)
            {
                var x = w(new[] { 0, 1, 1, 2 }[(int)(r() * 4)]);
                p.moveTo(x, -0.95); p.lineTo(x, 0.95);
            }
            var kresek = 2 + (int)(r() * 2) + Math.Min(3, zawilosc);
            for (int k = 0; k < kresek; k++)
            {
                int a = (int)(r() * 9), b = (a + 1 + (int)(r() * 7)) % 9;
                double x1 = w(a % 3), y1 = w(a / 3), x2 = w(b % 3), y2 = w(b / 3);
                p.moveTo(x1, y1);
                if (r() < 0.3) p.quadraticCurveTo((x1 + x2) / 2 + (r() - 0.5) * 1.2, (y1 + y2) / 2 + (r() - 0.5) * 1.2, x2, y2);
                else p.lineTo(x2, y2);
            }
            if (r() < 0.35)
            {
                var a = (int)(r() * 9);
                double x = w(a % 3), y = w(a / 3);
                p.moveTo(x + 0.28, y); p.arc(x, y, 0.28, 0, Math.PI * 2);
            }
            if (r() < 0.3) { var x = w((int)(r() * 3)); p.moveTo(x - 0.15, 1.2); p.lineTo(x + 0.15, 1.2); }
            lock (glify) glify[klucz] = p;
            return p;
        }

        // ---------------------------------------------------------------- oddech rdzenia

        /// <summary>Oddech rdzenia 0..1 — ten sam rytm, którym dudni rezonans skały; bez dźwięku — z zegara.</summary>
        public static double oddechRdzenia(Sim sim, double teraz, double? zDzwieku)
        {
            var s = zDzwieku ?? JsM.Sin((teraz / 1000) * (0.5 + sim.sen * 2));
            return 0.5 + 0.5 * s;
        }

        // ------------------------------------------------------------ bufory pod płytę

        sealed class Bufor { public IPlotno c = null!; public double w, h, k; }

        static Bufor nowyBufor(double w, double h, double k) =>
            new Bufor { c = Plotno.Nowe((int)Math.Max(1, Math.Round(w * k, MidpointRounding.AwayFromZero)), (int)Math.Max(1, Math.Round(h * k, MidpointRounding.AwayFromZero))), w = w, h = h, k = k };

        static double skalaEkranu(IPlotno ctx)
        {
            var t = ctx.getTransform();
            return Math.Min(3, Math.Max(1, Math.Sqrt(t.a * t.a + t.b * t.b)));
        }

        /// <summary>Rytowana winieta: brzegi płyty gęstnieją kreską, jak cień na starym miedziorycie.</summary>
        static void rysujWiniete(Bufor b)
        {
            var g = b.c;
            double w = b.w, h = b.h, k = b.k;
            g.setTransform(k, 0, 0, k, 0, 0);
            double cx = w / 2, cy = h / 2;
            // miękki cień pod kreską
            g.save();
            g.translate(cx, cy);
            g.scale(w / 2, h / 2);
            var rg = g.createRadialGradient(0, 0, 0.55, 0, 0, 1.45);
            rg.addColorStop(0, "rgba(6,4,3,0)");
            rg.addColorStop(0.45, "rgba(6,4,3,0.1)");
            rg.addColorStop(1, "rgba(4,3,2,0.42)");
            g.fillStyle = rg;
            g.fillRect(-1, -1, 2, 2);
            g.restore();

            // siła kreski: 0 w środku, 1 w rogu — elipsa dopasowana do płyty
            double sila(double x, double y)
            {
                double dx = (x - cx) / (w / 2), dy = (y - cy) / (h / 2);
                var d = Math.Sqrt(dx * dx * 0.8 + dy * dy * 0.8 + Math.Max(dx * dx, dy * dy) * 0.35);
                return Math.Max(0, Math.Min(1, (d - 0.8) / 0.45));
            }
            const int POZIOMY = 7;
            var sciezki = new Path2D[POZIOMY];
            for (int i = 0; i < POZIOMY; i++) sciezki[i] = new Path2D();
            var r = losy(91);
            void kreskuj(double kier, double odstep, double prog)
            {
                for (double c = -h; c < w; c += odstep)
                {
                    var drg = (r() - 0.5) * 0.8;
                    double x = kier > 0 ? c : c + h, y = 0;
                    const double krok = 7;
                    while (y < h)
                    {
                        double nx = x + krok * 0.7 * kier, ny = y + krok * 0.7;
                        var s = sila((x + nx) / 2, (y + ny) / 2);
                        if (s > prog && x > -8 && x < w + 8)
                        {
                            var poz = (int)Math.Min(POZIOMY - 1, Math.Floor(((s - prog) / (1 - prog)) * POZIOMY));
                            // przerwy w kresce: rylec nie jest maszyną
                            if (r() > 0.08)
                            {
                                sciezki[poz].moveTo(x + drg, y);
                                sciezki[poz].lineTo(nx + drg, ny);
                            }
                        }
                        x = nx; y = ny;
                    }
                }
            }
            kreskuj(1, 3.2, 0.12);
            kreskuj(-1, 4.1, 0.55);
            g.lineCap = "round";
            for (int i = 0; i < POZIOMY; i++)
            {
                g.strokeStyle = Barwa.Rgba(3, 2, 2, 0.06 + (i / (double)(POZIOMY - 1)) * 0.34);
                g.lineWidth = 0.7 + i * 0.09;
                g.stroke(sciezki[i]);
            }
        }

        /// <summary>Patyna odbitki: odciśnięty brzeg płyty, plamki starego papieru, kilka rys, nierówno wytarta farba.</summary>
        static void rysujPatyne(Bufor b)
        {
            var g = b.c;
            double w = b.w, h = b.h, k = b.k;
            g.setTransform(k, 0, 0, k, 0, 0);
            var r = losy(7 + Js.Js.ToInt32(w * 31 + h));
            // nierówno wytarta farba: kilka wielkich, prawie niewidocznych plam
            for (int i = 0; i < 7; i++)
            {
                double x = r() * w, y = r() * h, rr = (0.12 + r() * 0.22) * Math.Max(w, h);
                var rg = g.createRadialGradient(x, y, 0, x, y, rr);
                var a = 0.03 + r() * 0.04;
                rg.addColorStop(0, Barwa.Rgba(10, 6, 4, a));
                rg.addColorStop(1, "rgba(10,6,4,0)");
                g.fillStyle = rg;
                g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
            }
            // plamki: ciemne rdzawe i jasne wytarcia
            var plamek = Math.Round((w * h) / 16000, MidpointRounding.AwayFromZero);
            for (int i = 0; i < plamek; i++)
            {
                double x = r() * w, y = r() * h, rr = 0.5 + r() * r() * 2.4;
                var jasna = r() < 0.35;
                g.fillStyle = jasna ? Barwa.Rgba(226, 206, 170, 0.03 + r() * 0.05) : Barwa.Rgba(24, 12, 6, 0.06 + r() * 0.1);
                g.beginPath();
                g.ellipse(x, y, rr, rr * (0.6 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2);
                g.fill();
            }
            // rysy: długie, cienkie, prawie proste
            g.lineCap = "round";
            for (int i = 0; i < 9; i++)
            {
                double x = r() * w, y = r() * h, a = r() * Math.PI, d = 30 + r() * Math.Min(w, h) * 0.3;
                g.strokeStyle = Barwa.Rgba(232, 216, 188, 0.025 + r() * 0.03);
                g.lineWidth = 0.5 + r() * 0.4;
                g.beginPath();
                g.moveTo(x, y);
                g.quadraticCurveTo(x + JsM.Cos(a) * d * 0.5 + (r() - 0.5) * 12, y + JsM.Sin(a) * d * 0.5 + (r() - 0.5) * 12,
                    x + JsM.Cos(a) * d, y + JsM.Sin(a) * d);
                g.stroke();
            }
            // odcisk płyty: jasna krawędź od góry i z lewej, ciemna od dołu i z prawej
            g.lineWidth = 1;
            g.strokeStyle = "rgba(236,220,190,0.09)";
            g.beginPath(); g.moveTo(2.5, h - 2.5); g.lineTo(2.5, 2.5); g.lineTo(w - 2.5, 2.5); g.stroke();
            g.strokeStyle = "rgba(0,0,0,0.35)";
            g.beginPath(); g.moveTo(w - 2.5, 2.5); g.lineTo(w - 2.5, h - 2.5); g.lineTo(2.5, h - 2.5); g.stroke();
        }

        Bufor? winieta, patyna;

        Bufor bufor(Bufor? stary, ProstokatPlyty p, double k, Action<Bufor> rysuj)
        {
            if (stary != null && stary.w == p.w && stary.h == p.h && stary.k == k) return stary;
            stary?.c.Dispose();
            var b = nowyBufor(p.w, p.h, k);
            rysuj(b);
            return b;
        }

        /// <summary>Winieta i patyna nad światem, pod ramą. `oddech` 0..1 zaciska i rozluźnia ciemność.</summary>
        public void brzegi(IPlotno ctx, ProstokatPlyty p, double oddech)
        {
            var k = skalaEkranu(ctx);
            winieta = bufor(winieta, p, k, rysujWiniete);
            patyna = bufor(patyna, p, k, rysujPatyne);
            ctx.save();
            ctx.globalAlpha = 0.78 + 0.22 * oddech;
            ctx.drawImage(winieta.c, p.x, p.y, p.w, p.h);
            ctx.globalAlpha = 1;
            ctx.drawImage(patyna.c, p.x, p.y, p.w, p.h);
            ctx.restore();
        }

        /// <summary>Skala głębokości przy lewym brzegu: kreski co pięć kafli, co dwadzieścia — cyfra nieznanego pisma.</summary>
        public void skala(IPlotno ctx, ProstokatPlyty p, Sim sim, Camera cam, double oddech)
        {
            var z = cam.zoom;
            double gora = cam.toWorldY(0), dol = cam.toWorldY(p.h);
            var x = p.x + 5;
            ctx.save();
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.w, p.h);
            ctx.clip();
            ctx.lineWidth = 1;
            ctx.lineCap = "round";
            double co = z >= 6 ? 5 : 10;
            var start = Math.Max(0, Math.Ceiling(gora / co) * co);
            ctx.strokeStyle = "rgba(214,196,160,0.3)";
            ctx.beginPath();
            for (var wy = start; wy <= Math.Min(sim.world.h, dol); wy += co)
            {
                var y = p.y + cam.toScreenY(wy);
                var dlugi = wy % 20 == 0;
                ctx.moveTo(x, y + 0.5); ctx.lineTo(x + (dlugi ? 9 : 4), y + 0.5);
            }
            ctx.stroke();
            const double rozm = 4.2;
            ctx.lineWidth = 1.5 / rozm;
            for (var wy = Math.Ceiling(gora / 20) * 20; wy <= Math.Min(sim.world.h, dol); wy += 20)
            {
                if (wy < 0) continue;
                var y = p.y + cam.toScreenY(wy);
                var n = wy / 20;
                var d = sim.world.depth(wy);
                ctx.save();
                ctx.translate(x + 16, y);
                ctx.scale(rozm, rozm);
                // głębia czerwienieje, a każda cyfra lekko oddycha
                var a = 0.32 + 0.12 * oddech * d;
                ctx.strokeStyle = Barwa.Rgba(Js.Js.ToInt32(214 - d * 60), Js.Js.ToInt32(196 - d * 120), Js.Js.ToInt32(160 - d * 110), a);
                ctx.stroke(glif(300 + n, Math.Floor(d * 4)));
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>
        /// Znaki w nieznanej skale: stałe miejsca na mapie, widoczne tylko tam, gdzie nikt jeszcze nie patrzył albo pamięć
        /// zgasła. Świecą ledwo, w rytmie rdzenia — a kiedy czas stoi, pismo w skale wychodzi wyraźniej. Zwraca ile ich widać.
        /// </summary>
        public int znaki(IPlotno ctx, Sim sim, Camera cam, double oddech, bool stoi = false)
        {
            var w = sim.world;
            var z = cam.zoom;
            double x0 = cam.toWorldX(0), y0 = cam.toWorldY(0);
            double x1 = cam.toWorldX(cam.vw), y1 = cam.toWorldY(cam.vh);
            const int KX = 17, KY = 15;
            var ever = w.ever.d; var lastSeen = w.lastSeen.d; int W = (int)w.w;
            bool nieznane(double x, double y)
            {
                if (!w.inb(x, y)) return true;
                // sala i szyby nad nią są zawsze na widoku
                if (Shafts.odWidoku(w, x, y) == 0) return false;
                var i = (int)(y * W + x);
                return ever[i] == 0 || sim.tick - lastSeen[i] > World.MEM_SPAN;
            }
            var rozm = Math.Max(7, Math.Min(30, z * 2.1));
            var moc = stoi ? 1.9 : 1;
            int ile = 0;
            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (var cy = Math.Floor(y0 / KY); cy <= Math.Floor(y1 / KY); cy++)
            {
                for (var cx = Math.Floor(x0 / KX); cx <= Math.Floor(x1 / KX); cx++)
                {
                    var r = losy(cx * 7919 + cy * 104729 + 3);
                    if (r() > 0.34) continue;
                    var tx = cx * KX + 3 + Math.Floor(r() * (KX - 6));
                    var ty = cy * KY + 3 + Math.Floor(r() * (KY - 6));
                    if (!w.inb(tx, ty) || ty < w.surface.d[(int)Math.Max(0, Math.Min(w.w - 1, tx))] + 8) continue;
                    var ukryty = true;
                    for (int dy = -2; dy <= 2 && ukryty; dy++) for (int dx = -2; dx <= 2; dx++) if (!nieznane(tx + dx, ty + dy)) { ukryty = false; break; }
                    if (!ukryty) continue;
                    var d = w.depth(ty);
                    double sx = cam.toScreenX(tx + 0.5), sy = cam.toScreenY(ty + 0.5);
                    ile++;
                    var faza = r() * Math.PI * 2;
                    var a = Math.Min(0.5, (0.09 + 0.09 * oddech) * (0.6 + 0.4 * JsM.Sin(faza + oddech * 2)) * moc);
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate((r() - 0.5) * 0.5);
                    ctx.scale(rozm, rozm);
                    ctx.lineWidth = 1.3 / rozm;
                    ctx.strokeStyle = Barwa.Rgba(Js.Js.ToInt32(200 + d * 30), Js.Js.ToInt32(170 - d * 90), Js.Js.ToInt32(120 - d * 80), a);
                    // co trzeci znak to pieczęć: glif w okręgu
                    if (r() < 0.33)
                    {
                        ctx.beginPath(); ctx.arc(0, 0, 1.55, 0, Math.PI * 2); ctx.stroke();
                        ctx.scale(0.8, 0.8);
                        ctx.lineWidth = 1.3 / (rozm * 0.8);
                    }
                    ctx.stroke(glif(cx * 131 + cy * 977, Math.Floor(d * 5)));
                    ctx.restore();
                }
            }
            ctx.restore();
            return ile;
        }

        /// <summary>Astrolabium podziemia: pierścienie, podziałka, obracający się wieniec glifów i oko pośrodku. Tło menu.</summary>
        public static void rysujAstrolabium(IPlotno ctx, double cx, double cy, double r, double teraz, double oddech, double alfa)
        {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.lineCap = "round";
            var a = alfa * (0.8 + 0.2 * oddech);
            Barwa kolor(double m) => Barwa.Rgba(214, 196, 160, a * m);
            ctx.lineWidth = 1;
            // pierścienie
            foreach (var (rr, m) in new[] { (1.0, 0.5), (0.94, 0.3), (0.72, 0.4), (0.66, 0.22), (0.3, 0.35) })
            {
                ctx.strokeStyle = kolor(m);
                ctx.beginPath(); ctx.arc(0, 0, r * rr, 0, Math.PI * 2); ctx.stroke();
            }
            // podziałka między zewnętrznymi pierścieniami
            ctx.strokeStyle = kolor(0.35);
            ctx.beginPath();
            for (int i = 0; i < 120; i++)
            {
                var k = (i / 120.0) * Math.PI * 2;
                var dl = i % 10 == 0 ? 0.06 : i % 5 == 0 ? 0.04 : 0.02;
                ctx.moveTo(JsM.Cos(k) * r * 0.94, JsM.Sin(k) * r * 0.94);
                ctx.lineTo(JsM.Cos(k) * r * (0.94 - dl), JsM.Sin(k) * r * (0.94 - dl));
            }
            ctx.stroke();
            // wieniec glifów: obraca się tak wolno, że widać to dopiero po chwili
            var obrot = teraz * 0.0000125;
            const int n = 18;
            for (int i = 0; i < n; i++)
            {
                var k = obrot + (i / (double)n) * Math.PI * 2;
                var gr = r * 0.035;
                ctx.save();
                ctx.translate(JsM.Cos(k) * r * 0.81, JsM.Sin(k) * r * 0.81);
                ctx.rotate(k + Math.PI / 2);
                ctx.scale(gr, gr);
                ctx.lineWidth = 1.2 / gr;
                ctx.strokeStyle = kolor(0.55);
                ctx.stroke(glif(500 + i, i % 4));
                ctx.restore();
            }
            // dwie wskazówki, jak na zegarze, który nie liczy godzin
            ctx.strokeStyle = kolor(0.45);
            ctx.beginPath();
            double w1 = -teraz * 0.000021, w2 = teraz * 0.0000071 + 2;
            ctx.moveTo(0, 0); ctx.lineTo(JsM.Cos(w1) * r * 0.64, JsM.Sin(w1) * r * 0.64);
            ctx.moveTo(0, 0); ctx.lineTo(JsM.Cos(w2) * r * 0.9, JsM.Sin(w2) * r * 0.9);
            ctx.stroke();
            // oko w środku: powieka i źrenica, która oddycha razem z rdzeniem
            ctx.strokeStyle = kolor(0.7);
            ctx.beginPath();
            double ow = r * 0.2, oh = r * 0.09;
            ctx.moveTo(-ow, 0); ctx.quadraticCurveTo(0, -oh * 2, ow, 0); ctx.quadraticCurveTo(0, oh * 2, -ow, 0);
            ctx.stroke();
            ctx.fillStyle = Barwa.Rgba(190, 60, 40, a * (0.35 + 0.4 * oddech));
            ctx.beginPath(); ctx.arc(0, 0, r * (0.035 + 0.012 * oddech), 0, Math.PI * 2); ctx.fill();
            // promienie ku czterem stronom świata, których pod ziemią nie ma
            ctx.strokeStyle = kolor(0.25);
            ctx.beginPath();
            for (int i = 0; i < 4; i++)
            {
                var k = (i / 4.0) * Math.PI * 2 + Math.PI / 4;
                ctx.moveTo(JsM.Cos(k) * r * 0.32, JsM.Sin(k) * r * 0.32);
                ctx.lineTo(JsM.Cos(k) * r * 0.64, JsM.Sin(k) * r * 0.64);
            }
            ctx.stroke();
            ctx.restore();
        }
    }
}
