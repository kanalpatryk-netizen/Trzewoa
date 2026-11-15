// Port: alpha-1/src/render/pomnik.ts — WIELKI POMNIK DEMONA (Alpha, etap 5), rysunek do Symulacja/Pomnik.cs. Na dnie
// komory pod kryptą, na cokole z wyrytymi znakami, stoi kamienny demon zakuty w łańcuchy. Modlitwa go kruszy:
// stan 1 — rysy (przy pęknięciu błysk, drgnięcie, pył), stan 2 — odpadłe kawałki i odłamki u stóp, stan 3 — rysy
// żarzą się, oczy się tlą. Rozpad: drży, łańcuchy pękają, kamień rozlatuje się na bryły w obłoku pyłu, zostaje kopiec
// gruzu. Wyjście: z gruzu wstaje żywy demon (duszki — DuszkiDemona.rysujWstajacego, w TS kukła z demon-boss.ts).
// Animacje idą tikami gry (od tiku zmiany fazy), drgania i żar — zegarem ekranu.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPomnik;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek pomnika (RysPomnik — bo Pomnik to klasa symulacji).</summary>
    public static class RysPomnik
    {
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }

        /// <summary>Tani skrót liczby — stałe kształty odłamków (rysunek nie sięga po los gry).</summary>
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        /// <summary>Wysokość posągu (H stojącej postaci) w pikselach.</summary>
        static double wysokoscPosagu(double z) => z * POMNIK.wysokosc;

        static PunktyDemona rysujDemona(IPlotno ctx, double H, PozaDemona p) => DemonWzor.rysujWedlugWzoru(ctx, H, p);

        /// <summary>
        /// Rysuje coś pocięte na kawałki, które się rozpadają (`k` 0…1): nieregularne bryły (siatka z rozedrganymi
        /// węzłami). `opad` > 0 — bryły spadają i toczą się w bok (kamień), &lt; 0 — unoszą się (popiół).
        /// </summary>
        static void rozbite(IPlotno ctx, double cx, double cy, double R, double k, int ziarno, double opad, Action rysuj)
        {
            const int nx = 5, ny = 6;
            double x0 = cx - R * 1.15, y0 = cy - R * 1.35, sw = (R * 2.3) / nx, sh = (R * 2.7) / ny;
            (double x, double y) wezel(int i, int j)
            {
                var brzeg = i == 0 || j == 0 || i == nx || j == ny;
                var jx = brzeg ? 0 : (los(ziarno + i * 31 + j * 7) - 0.5) * sw * 0.7;
                var jy = brzeg ? 0 : (los(ziarno + i * 13 + j * 29 + 5) - 0.5) * sh * 0.7;
                return (x0 + i * sw + jx, y0 + j * sh + jy);
            }
            for (int j = 0; j < ny; j++)
            {
                for (int i = 0; i < nx; i++)
                {
                    var id = ziarno + j * nx + i;
                    var a = wezel(i, j); var b = wezel(i + 1, j); var c = wezel(i + 1, j + 1); var d = wezel(i, j + 1);
                    double mx = (a.x + b.x + c.x + d.x) / 4, my = (a.y + b.y + c.y + d.y) / 4;
                    // górne bryły ruszają pierwsze; każda z własnym opóźnieniem
                    var opoz = (1 - (double)j / ny) * 0.25 + los(id * 3) * 0.15;
                    var t = Math.Max(0, Math.Min(1, (k - opoz) / (1 - opoz)));
                    var bok = (mx - cx) / R;
                    var dx = (bok * 0.5 + (los(id * 7) - 0.5) * 0.6) * R * t;
                    var dy = opad > 0 ? (cy + R * 1.35 - my) * gladko(t * 1.2) * opad : opad * R * 1.8 * t * t;
                    var obrot = (los(id * 5) - 0.5) * 1.8 * t;
                    ctx.save();
                    ctx.globalAlpha *= 1 - gladko((t - 0.7) / 0.3);
                    ctx.translate(mx + dx, my + dy);
                    ctx.rotate(obrot);
                    ctx.translate(-mx, -my);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
                    ctx.closePath();
                    ctx.clip();
                    rysuj();
                    ctx.restore();
                }
            }
        }

        sealed class WarstwaPosagu { public IPlotno c = null!; public int cw, ch; public double W, Hh, ox, oy; public PunktyDemona pkt; }
        static IPlotno? warstwa;

        /// <summary>
        /// Posąg na osobnej warstwie (stopy w (ox, oy) warstwy) — z niej przykłada się bryły rozpadu. W TS warstwa
        /// wycinała też ubytki dawnej ryciny; przy wzorze grafika (zawsze w C#) to wycięcie ma krycie 0 i nic nie robi,
        /// więc go tu nie ma.
        /// </summary>
        static WarstwaPosagu warstwaPosagu(IPlotno ctx, double H, PozaDemona poza)
        {
            var m = ctx.getTransform(); var dpr = Math.Max(1, Math.Sqrt(m.a * m.a + m.b * m.b));
            // (wzór grafika z aureolą jest wyższy od dawnej ryciny — warstwa z zapasem w górę)
            double W = Math.Ceiling(H * 1.5), Hh = Math.Ceiling(H * 1.55), ox = W / 2, oy = H * 1.35;
            warstwa ??= Plotno.Nowe(1, 1);
            int cw = (int)Math.Ceiling(W * dpr), ch = (int)Math.Ceiling(Hh * dpr);
            if (warstwa.width < cw || warstwa.height < ch) { warstwa.width = cw; warstwa.height = ch; }
            var g = warstwa;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, cw, ch);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.translate(ox, oy);
            var pkt = rysujDemona(g, H, poza);
            g.setTransform(1, 0, 0, 1, 0, 0);
            return new WarstwaPosagu { c = warstwa, cw = cw, ch = ch, W = W, Hh = Hh, ox = ox, oy = oy, pkt = pkt };
        }

        /// <summary>Posąg (stopy w x, top) — przy wzorze grafika zawsze wprost (ubytki ma sam wzór).</summary>
        static PunktyDemona posagZUbytkami(IPlotno ctx, double x, double top, double H, PozaDemona poza)
        {
            ctx.save(); ctx.translate(x, top);
            var p = rysujDemona(ctx, H, poza);
            ctx.restore();
            return p;
        }

        /// <summary>Cokół: ciosany blok z wyrytymi znakami (rozbity — tylko dolna połowa, w szczerbach).</summary>
        public static double cokol(IPlotno ctx, double x, double y, double H, bool rozbity, double z)
        {
            double w = H * 0.62, h = H * 0.075;
            ctx.save();
            var g = ctx.createLinearGradient(0, y - h, 0, y);
            g.addColorStop(0, "#6e6458"); g.addColorStop(1, "#2e2822");
            ctx.fillStyle = g;
            ctx.strokeStyle = "rgba(20,14,10,0.95)"; ctx.lineWidth = Math.Max(1.2, z * 0.1);
            ctx.beginPath();
            if (rozbity)
            {
                ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h * 0.6);
                for (int i = 0; i <= 8; i++) ctx.lineTo(x - w / 2 + (w * i) / 8, y - h * (0.35 + los(i + 40) * 0.5));
                ctx.lineTo(x + w / 2, y);
            }
            else
            {
                ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h); ctx.lineTo(x - w * 0.46, y - h * 1.18);
                ctx.lineTo(x + w * 0.46, y - h * 1.18); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2, y);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // fugi i znaki
            ctx.strokeStyle = "rgba(20,14,10,0.6)"; ctx.lineWidth = Math.Max(0.8, z * 0.06);
            ctx.beginPath();
            for (int i = 1; i < 4; i++) { ctx.moveTo(x - w / 2 + (w * i) / 4, y); ctx.lineTo(x - w / 2 + (w * i) / 4, y - h * (rozbity ? 0.35 : 1)); }
            ctx.stroke();
            if (!rozbity && z >= 6)
            {
                for (int i = 0; i < 4; i++)
                {
                    var gr = h * 0.28;
                    ctx.save();
                    ctx.translate(x - w / 2 + (w * (i + 0.5)) / 4, y - h * 0.5);
                    ctx.scale(gr, gr);
                    ctx.lineWidth = 1.2 / gr;
                    ctx.strokeStyle = "rgba(200,120,90,0.55)";
                    ctx.stroke(Tajemnica.glif(900 + i, 2));
                    ctx.restore();
                }
            }
            ctx.restore();
            return rozbity ? y - h * 0.4 : y - h * 1.18;
        }

        /// <summary>Łańcuch z ogniw od a do b (zwisający łukiem); `pek` — rozerwany w połowie, końce opadają.</summary>
        static void lancuch(IPlotno ctx, (double x, double y) a, (double x, double y) b, double z, double pek = 0)
        {
            var ogniwo = Math.Max(2.5, z * 0.32);
            double ddx = b.x - a.x, ddy = b.y - a.y, dl = Math.Sqrt(ddx * ddx + ddy * ddy);
            var n = Math.Max(3, (int)Math.Floor(dl / (ogniwo * 1.5)));
            ctx.save();
            ctx.strokeStyle = "rgba(70,64,60,0.95)"; ctx.lineWidth = Math.Max(1, ogniwo * 0.35);
            for (int i = 0; i <= n; i++)
            {
                var t = (double)i / n;
                if (pek > 0 && Math.Abs(t - 0.5) < 0.08) continue;
                double x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + JsM.Sin(t * Math.PI) * dl * 0.12;
                // rozerwany: obie połowy opadają ku swoim kotwicom
                if (pek > 0) { var kot = t < 0.5 ? a : b; var u = t < 0.5 ? t / 0.5 : (1 - t) / 0.5; x = x + (kot.x - x) * pek * (1 - u) * 0.2; y = y + pek * dl * 0.5 * u * u; }
                ctx.beginPath();
                ctx.ellipse(x, y, ogniwo * 0.55, ogniwo * 0.32, i % 2 != 0 ? Math.PI / 2 : 0.2, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Kopiec gruzu u stóp pomnika (`k` 0…1 — rośnie przy rozpadzie); z kawałkami: róg, kawał skrzydła, łapa.</summary>
        public static void gruz(IPlotno ctx, double x, double y, double H, double k, double czas, double z)
        {
            if (k <= 0) return;
            // kopiec do połowy komory
            double w = H * 1.3, h = H * 0.48 * k;
            ctx.save();
            var g = ctx.createLinearGradient(0, y - h, 0, y);
            g.addColorStop(0, "#6a6054"); g.addColorStop(1, "#2a241f");
            ctx.fillStyle = g;
            ctx.strokeStyle = "rgba(20,14,10,0.95)"; ctx.lineWidth = Math.Max(1, z * 0.08);
            ctx.beginPath();
            ctx.moveTo(x - w / 2, y);
            for (int i = 0; i <= 14; i++)
            {
                var t = i / 14.0;
                var bump = JsM.Sin(t * Math.PI) * (0.75 + los(i + 60) * 0.35);
                ctx.lineTo(x - w / 2 + w * t, y - h * bump);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // bryły na kopcu
            for (int i = 0; i < 16; i++)
            {
                double bx = x + (los(i + 70) - 0.5) * w * 0.8, r = H * (0.03 + los(i + 80) * 0.05) * k;
                var by = y - h * JsM.Sin((bx - x + w / 2) / w * Math.PI) * 0.85;
                ctx.beginPath();
                for (int j = 0; j < 5; j++) { var a = (j / 5.0) * Math.PI * 2 + los(i * 9 + j); var rr = r * (0.7 + los(i * 11 + j) * 0.5); ctx.lineTo(bx + JsM.Cos(a) * rr, by + JsM.Sin(a) * rr); }
                ctx.closePath();
                ctx.fillStyle = i % 3 != 0 ? "#5a5046" : "#7d7264"; ctx.fill(); ctx.stroke();
            }
            // utrącony róg na wierzchu
            if (k > 0.6)
            {
                ctx.save();
                ctx.translate(x + w * 0.22, y - h * 0.75);
                ctx.rotate(-0.5);
                ctx.fillStyle = "#7a6e60";
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-H * 0.05, -H * 0.06, -H * 0.01, -H * 0.11); ctx.quadraticCurveTo(-H * 0.02, -H * 0.05, H * 0.025, 0); ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            // żar w szczelinach gruzu
            var tl = 0.5 + 0.5 * JsM.Sin(czas * 0.004);
            ctx.globalCompositeOperation = "lighter";
            for (int i = 0; i < 6; i++)
            {
                double bx = x + (los(i + 90) - 0.5) * w * 0.6, by = y - h * (0.2 + los(i + 95) * 0.4);
                var r = H * 0.03 * (0.6 + 0.4 * tl);
                var gg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
                gg.addColorStop(0, Barwa.Rgba(255, 110, 50, 0.45 * k)); gg.addColorStop(1, "rgba(255,60,20,0)");
                ctx.fillStyle = gg; ctx.fillRect(bx - r, by - r, r * 2, r * 2);
            }
            ctx.restore();
        }

        /// <summary>Poza kamiennego posągu w danym stanie pękania.</summary>
        static PozaDemona pozaPosagu(double stan, double teraz, double zar = 0)
        {
            var tetno = RysRdzen.tetnoRdzenia(teraz);
            var RYSY = new[] { 0, 0.5, 0.8, 1 };
            return new PozaDemona
            {
                zywy = false, kuca = 1, skrzydla = 0.12, glowa = 0, cios = 0, oddech = 0,
                rysy = RYSY[(int)Math.Min(3, stan)],
                ubytki = stan >= 2 ? 1 : 0,
                zar = Math.Max(zar, stan >= 3 ? 0.45 + 0.35 * tetno : 0),
                oczy = Math.Max(zar, stan >= 3 ? 0.35 + 0.4 * tetno : stan >= 2 ? 0.08 : 0),
            };
        }

        /// <summary>Pomnik na dnie komory — nad mrokiem (game.ts: po rysujKonwojNad).</summary>
        public static void rysujPomnik(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var z = cam.zoom;
            var m = Pomnik.miejscePomnika(sim);
            double bx = cam.toScreenX(m.x), by = cam.toScreenY(m.y + 1);
            var H = wysokoscPosagu(z);
            if (bx < -H || bx > cam.vw + H || by < -H * 0.2 || by - H > cam.vh) return;
            var s = sim.lud.pomnik;
            var faza = s?.faza ?? "stoi";
            var stan = s?.stan ?? Pomnik.stanPekania(Rytual.procentSkorupy(sim));
            var ruch = Nastroj.wolnoRuszac();
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";

            // latarnia: czerwona poświata z piersi demona — widać z daleka, rośnie z pękaniem
            var tetno = RysRdzen.tetnoRdzenia(teraz);
            if (faza == "stoi" || faza == "rozpada")
            {
                var moc = 0.1 + stan * 0.07 + (faza == "rozpada" ? 0.2 : 0);
                var Rh = Math.Max(80, H * 0.9);
                var hy = by - H * 0.45;
                var halo = ctx.createRadialGradient(bx, hy, 0, bx, hy, Rh);
                halo.addColorStop(0, Barwa.Rgba(255, 90, 50, moc + 0.08 * tetno));
                halo.addColorStop(0.4, Barwa.Rgba(180, 40, 30, moc * 0.45));
                halo.addColorStop(1, "rgba(100,15,15,0)");
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = halo; ctx.fillRect(bx - Rh, hy - Rh, Rh * 2, Rh * 2);
                ctx.globalCompositeOperation = "source-over";
            }

            if (faza == "stoi")
            {
                // pęknięcie przed chwilą: błysk, drgnięcie, pył i odłamki spadają u stóp
                var tp = sim.tick - (s?.stanT ?? -1e9);
                rysujPosag(ctx, bx, by, H, z, stan, teraz, tp >= 0 && tp < 200 ? 1 - tp / 200 : 0, ruch);
            }
            else if (faza == "rozpada")
            {
                var k = Math.Min(1, (sim.tick - (s?.od ?? 0)) / POMNIK.rozpad);
                const double PEK = 0.45;
                var top = cokol(ctx, bx, by, H, k >= PEK, z);
                var drga = ruch ? JsM.Sin(teraz * 0.11) * H * 0.012 * gladko(k / PEK) : 0;
                if (k < PEK)
                {
                    var pkt = posagZUbytkami(ctx, bx + drga, top, H, pozaPosagu(3, teraz, gladko(k / PEK)));
                    foreach (var (w, strona) in new[] { (pkt.wrF, 1), (pkt.wrB, -1) })
                        lancuch(ctx, (bx + drga + w.x * H, top + w.y * H), (bx + strona * H * 0.29, top + H * 0.02), z);
                }
                else
                {
                    var kk = (k - PEK) / (1 - PEK);
                    gruz(ctx, bx, by, H, gladko(kk * 1.6), teraz, z);
                    // posąg raz na warstwę, a bryły tylko ją przykładają (30 brył × cały rysunek demona to za dużo na klatkę)
                    var L = warstwaPosagu(ctx, H, pozaPosagu(3, teraz, 1 - kk));
                    rozbite(ctx, bx, top - H * 0.35, H * 0.5, kk, 300, 1, () => { ctx.drawImage(L.c, 0, 0, L.cw, L.ch, bx - L.ox, top - L.oy, L.W, L.Hh); });
                    // zerwane łańcuchy opadają
                    lancuch(ctx, (bx + H * 0.15, top - H * 0.3), (bx + H * 0.29, top + H * 0.02), z, gladko(kk * 2));
                    lancuch(ctx, (bx + H * 0.08, top - H * 0.3), (bx - H * 0.29, top + H * 0.02), z, gladko(kk * 2));
                }
            }
            else
            {
                // gruz po pomniku zostaje do końca gry; z niego wstaje demon (dalej rysuje go mapa jako bossa)
                cokol(ctx, bx, by, H, true, z);
                gruz(ctx, bx, by, H, 1, teraz, z);
                if (faza == "wychodzi") wstajacyDemon(ctx, sim, cam, bx, by);
            }

            ctx.restore();
        }

        /// <summary>
        /// Posąg na cokole, zakuty w łańcuchy, w danym stanie pękania (`swieze` 0…1 — pęknięcie przed chwilą: drgnięcie,
        /// pył i odłamki). Stopy cokołu w (bx, by).
        /// </summary>
        public static void rysujPosag(IPlotno ctx, double bx, double by, double H, double z, double stan, double teraz, double swieze = 0, bool ruch = true)
        {
            var drga = ruch && swieze > 0 ? JsM.Sin(teraz * 0.09) * H * 0.006 * swieze : 0;
            var top = cokol(ctx, bx, by, H, false, z);
            var pkt = posagZUbytkami(ctx, bx + drga, top, H, pozaPosagu(stan, teraz, swieze * 0.7));
            // kajdany: od nadgarstków do pierścieni w cokole
            foreach (var (w, strona) in new[] { (pkt.wrF, 1), (pkt.wrB, -1) })
                lancuch(ctx, (bx + drga + w.x * H, top + w.y * H), (bx + strona * H * 0.29, top + H * 0.02), z);
            if (swieze > 0) odlamki(ctx, bx, top, H, 1 - swieze, stan, z);
            if (stan >= 2) gruz(ctx, bx + H * 0.24, top, H * 0.35, 1, teraz, z);
        }

        /// <summary>Odłamki i pył po świeżym pęknięciu (`k` 0…1 od pęknięcia).</summary>
        static void odlamki(IPlotno ctx, double bx, double top, double H, double k, double stan, double z)
        {
            ctx.save();
            for (int i = 0; i < 10; i++)
            {
                var sx = bx + (los(i + stan * 31) - 0.4) * H * 0.4;
                var sy = top - H * (0.25 + los(i + stan * 17) * 0.35);
                var vx = (los(i + 7 + stan) - 0.5) * H * 0.1;
                var y = Math.Min(top, sy + k * k * H * 0.9);
                var x = sx + vx * k;
                var r = Math.Max(1.5, H * (0.006 + los(i + 3) * 0.01));
                ctx.fillStyle = Barwa.Rgba(120, 108, 94, 1 - k * 0.6);
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
            // obłok pyłu
            var rr = H * (0.15 + k * 0.4);
            var g = ctx.createRadialGradient(bx, top - H * 0.3, 0, bx, top - H * 0.3, rr);
            g.addColorStop(0, Barwa.Rgba(170, 150, 130, 0.28 * (1 - k))); g.addColorStop(1, "rgba(170,150,130,0)");
            ctx.fillStyle = g; ctx.fillRect(bx - rr, top - H * 0.3 - rr, rr * 2, rr * 2);
            ctx.restore();
        }

        /// <summary>Faza „wychodzi”: z gruzu wstaje żywy demon (duszki zamiast kukły z demon-boss.ts).</summary>
        static void wstajacyDemon(IPlotno ctx, Sim sim, Camera cam, double bx, double by)
        {
            var s = sim.lud.pomnik!;
            ctx.save();
            ctx.translate(bx, by);
            Duszki.DuszkiDemona.rysujWstajacego(ctx, Duszki.DuszkiDemona.wysokoscDemona(cam.zoom), Math.Min(1, (sim.tick - s.od) / POMNIK.wyjscie));
            ctx.restore();
        }

        /// <summary>
        /// Nad mrokiem i nad postaciami: błysk pęknięcia pomnika, błysk rozpadu z obłokiem pyłu, a przy konaniu demona —
        /// błysk uderzenia, fala światła rozchodząca się po krypcie i popiół z iskrami.
        /// </summary>
        public static void rysujNadPomnikiem(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var s = sim.lud.pomnik;
            if (s == null) return;
            var z = cam.zoom;
            var m = Pomnik.miejscePomnika(sim);
            double bx = cam.toScreenX(m.x), by = cam.toScreenY(m.y + 1);
            var H = wysokoscPosagu(z);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            if (s.faza == "stoi")
            {
                var tp = sim.tick - s.stanT;
                if (tp >= 0 && tp < 60)
                {
                    var a = 1 - tp / 60;
                    var r = H * 0.6;
                    var g = ctx.createRadialGradient(bx, by - H * 0.4, 0, bx, by - H * 0.4, r);
                    g.addColorStop(0, Barwa.Rgba(255, 170, 110, 0.5 * a)); g.addColorStop(1, "rgba(255,90,40,0)");
                    ctx.fillStyle = g; ctx.fillRect(bx - r, by - H * 0.4 - r, r * 2, r * 2);
                }
            }
            else if (s.faza == "rozpada")
            {
                var k = (sim.tick - s.od) / POMNIK.rozpad;
                // błysk w chwili rozpadu i czerwone światło z wnętrza przed nim
                var a = k < 0.45 ? gladko(k / 0.45) * 0.35 : Math.Max(0, 1 - (k - 0.45) / 0.25);
                var r = H * (0.6 + (k > 0.45 ? (k - 0.45) * 2 : 0));
                var g = ctx.createRadialGradient(bx, by - H * 0.35, 0, bx, by - H * 0.35, r);
                g.addColorStop(0, Barwa.Rgba(255, 200, 150, 0.7 * a)); g.addColorStop(0.5, Barwa.Rgba(255, 80, 40, 0.3 * a)); g.addColorStop(1, "rgba(255,40,20,0)");
                ctx.fillStyle = g; ctx.fillRect(bx - r, by - H * 0.35 - r, r * 2, r * 2);
                ctx.globalCompositeOperation = "source-over";
                // obłok pyłu po rozpadzie
                if (k > 0.45)
                {
                    var kk = (k - 0.45) / 0.55;
                    var rr = H * (0.3 + kk * 0.6);
                    var gg = ctx.createRadialGradient(bx, by - H * 0.2, 0, bx, by - H * 0.2, rr);
                    gg.addColorStop(0, Barwa.Rgba(150, 135, 118, 0.45 * (1 - kk))); gg.addColorStop(1, "rgba(150,135,118,0)");
                    ctx.fillStyle = gg; ctx.fillRect(bx - rr, by - H * 0.2 - rr, rr * 2, rr * 2);
                }
            }
            else if (s.faza == "kona" && s.cios != null)
            {
                var k = (sim.tick - s.od) / POMNIK.konanie;
                var h = Duszki.DuszkiDemona.wysokoscDemona(z);
                double dx = cam.toScreenX(s.cios.x), dy = cam.toScreenY(s.cios.y + 1) - h * 0.55;
                // błysk uderzenia
                if (k < 0.12)
                {
                    double a = 1 - k / 0.12, r = h * 0.9;
                    var g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
                    g.addColorStop(0, Barwa.Rgba(255, 250, 230, 0.9 * a)); g.addColorStop(1, "rgba(255,220,150,0)");
                    ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
                }
                // światło z wnętrza rośnie, potem rozbłysk i fala po krypcie
                const double PEK = 0.55;
                var swiat = k < PEK ? gladko(k / PEK) * 0.5 : Math.Max(0, 1 - (k - PEK) / 0.3);
                if (swiat > 0)
                {
                    var r = h * (0.8 + swiat);
                    var g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
                    g.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.6 * swiat)); g.addColorStop(1, "rgba(255,200,120,0)");
                    ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
                }
                if (k > PEK)
                {
                    var kk = (k - PEK) / (1 - PEK);
                    // światło zalewa kryptę: rosnąca, miękka łuna i snopy promieni rytych kreską
                    double R = h * (1.2 + kk * 7), moc = 1 - kk * 0.65;
                    var g2 = ctx.createRadialGradient(dx, dy, 0, dx, dy, R);
                    g2.addColorStop(0, Barwa.Rgba(255, 236, 190, 0.45 * moc));
                    g2.addColorStop(0.5, Barwa.Rgba(255, 222, 160, 0.2 * moc));
                    g2.addColorStop(1, "rgba(255,210,140,0)");
                    ctx.fillStyle = g2; ctx.fillRect(dx - R, dy - R, R * 2, R * 2);
                    ctx.save();
                    ctx.globalCompositeOperation = "lighter";
                    ctx.lineCap = "round";
                    ctx.strokeStyle = Barwa.Rgba(255, 236, 196, 0.3 * (1 - kk));
                    ctx.lineWidth = Math.Max(1, h * 0.012);
                    ctx.beginPath();
                    for (int i = 0; i < 40; i++)
                    {
                        var kat = (i / 40.0) * Math.PI * 2 + los(i + 300) * 0.08;
                        double r0 = h * 0.35, r1 = R * (0.45 + 0.4 * los(i + 310));
                        ctx.moveTo(dx + JsM.Cos(kat) * r0, dy + JsM.Sin(kat) * r0);
                        ctx.lineTo(dx + JsM.Cos(kat) * r1, dy + JsM.Sin(kat) * r1);
                    }
                    ctx.stroke();
                    ctx.restore();
                    // popiół i iskry wznoszą się i gasną
                    for (int i = 0; i < 26; i++)
                    {
                        var t = Math.Min(1, kk * (0.7 + los(i + 200) * 0.6));
                        var x = dx + (los(i + 210) - 0.5) * h * 0.8 + (los(i + 220) - 0.5) * h * 0.6 * t;
                        var y = dy + (los(i + 230) - 0.3) * h * 0.6 - t * h * (0.6 + los(i + 240));
                        var r = Math.Max(1, h * 0.012 * (1 - t * 0.5));
                        ctx.fillStyle = i % 3 != 0 ? Barwa.Rgba(255, 190, 110, 0.8 * (1 - t)) : Barwa.Rgba(180, 170, 160, 0.6 * (1 - t));
                        ctx.fillRect(x - r, y - r, r * 2, r * 2);
                    }
                }
                // cały ekran rozjaśnia się w chwili rozbłysku
                if (k > PEK - 0.02 && k < PEK + 0.12)
                {
                    var a = JsM.Sin(((k - (PEK - 0.02)) / 0.14) * Math.PI) * 0.35;
                    ctx.fillStyle = Barwa.Rgba(255, 240, 210, a);
                    ctx.fillRect(0, 0, cam.vw, cam.vh);
                }
            }
            ctx.restore();
        }
    }
}
