// Port: alpha-1/src/render/rdzen.ts — rdzeń i jego skorupa jako cel gry, nie kolorowy kafel. Krypta: komora o gładkim
// obrysie z wielkich ciosów i pierścień klińców wzdłuż obrysu (sklepienie, ściany, posadzka), wyłom w sklepieniu po
// rozpadzie pomnika. Bez pomnika: rdzeń — serce z kamienia, które bije podwójnym uderzeniem, z żyłami, promieniami
// i wieńcem pisma dookoła; wieniec zapala się w procentach skruszonej skorupy. Z daleka rdzeń świeci jak latarnia.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyWygladRdzen;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek rdzenia (RysRdzen — bo Rdzen to przestrzeń nazw gospodarza).</summary>
    public static class RysRdzen
    {
        static Nastawy.Typ_RDZEN_WYGLAD RW => RDZEN_WYGLAD;
        struct Pkt { public double x, y; public Pkt(double x, double y) { this.x = x; this.y = y; } }
        static double Rnd(double v) => Math.Floor(v + 0.5);

        public static void rysujRdzen(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            var z = cam.zoom;
            double sx = cam.toScreenX(w.coreX + 0.5), sy = cam.toScreenY(w.coreY + 0.5);
            var zasieg = 22 * z;
            if (sx < -zasieg || sy < -zasieg || sx > cam.vw + zasieg || sy > cam.vh + zasieg) return;
            var r = sim.rytual;
            // tętno: podwójne uderzenie, jak serce — „bum-bum”, pauza
            var uderz = tetnoRdzenia(teraz);
            var otwarta = r.otwarta;

            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            // --- krypta: komora o wygładzonym obrysie, ciemna tylna ściana z wielkich ciosów i pierścień klińców
            double px(double x) => cam.toScreenX(x);
            double py(double y) => cam.toScreenY(y);
            bool kamien(double x, double y) => w.inb(x, y) && w.tile.d[(int)(y * w.w + x)] == T.STONE;
            var Z = RW.skorupaZasieg;
            // Kafel wnętrza komory: pusty, a nad nim, po lewej i po prawej (w zasięgu) stoi kamień skorupy.
            bool wnetrze(double x, double y)
            {
                if (!w.inb(x, y) || w.solid(x, y)) return false;
                bool trafia(int dx, int dy)
                {
                    for (int k = 1; k <= Z * 2; k++)
                    {
                        double xx = x + dx * k, yy = y + dy * k;
                        if (!w.inb(xx, yy)) return false;
                        if (kamien(xx, yy)) return true;
                    }
                    return false;
                }
                return trafia(0, -1) && trafia(-1, 0) && trafia(1, 0);
            }
            var petle = obrysKomory(wnetrze, (int)(w.coreX - Z), (int)(w.coreY - Z), (int)(w.coreX + Z), (int)(w.coreY + Z));
            if (petle.Count > 0)
            {
                var sciezka = new Path2D();
                foreach (var p in petle)
                {
                    for (int i = 0; i < p.Count; i++) { if (i > 0) sciezka.lineTo(px(p[i].x), py(p[i].y)); else sciezka.moveTo(px(p[i].x), py(p[i].y)); }
                    sciezka.closePath();
                }
                // tylna ściana: ciemny kamień w wielkich ciosach na zakładkę; przy obrysie cień sklepienia
                ctx.save();
                ctx.clip(sciezka);
                var sk = RW.scianaKomory;
                ctx.fillStyle = Barwa.Rgba(sk[0], sk[1], sk[2]);
                ctx.fillRect(px(w.coreX - Z), py(w.coreY - Z), (Z * 2 + 1) * z, (Z * 2 + 1) * z);
                ctx.strokeStyle = RW.fugaKomory;
                ctx.lineWidth = Math.Max(1, z * 0.06);
                ctx.beginPath();
                int rz = 0;
                for (var y = w.coreY + Z + 1; y > w.coreY - Z; rz++, y -= RW.rzadSciany)
                {
                    ctx.moveTo(px(w.coreX - Z), py(y)); ctx.lineTo(px(w.coreX + Z + 1), py(y));
                    var prz = (rz & 1) * RW.ciosSciany * 0.5;
                    for (var x = w.coreX - Z - RW.ciosSciany + prz; x <= w.coreX + Z + 1; x += RW.ciosSciany)
                    {
                        ctx.moveTo(px(x), py(y)); ctx.lineTo(px(x), py(y - RW.rzadSciany));
                    }
                }
                ctx.stroke();
                ctx.strokeStyle = "rgba(6,3,3,0.32)";
                ctx.lineWidth = z * 1.4;
                ctx.stroke(sciezka);
                ctx.restore();
                foreach (var p in petle) pierscienKlincow(ctx, sim, cam, p, wnetrze);
                wylom(ctx, sim, cam, petle.Aggregate((a, b) => b.Count > a.Count ? b : a));
            }

            // Alpha, etap 5: zamiast serca rdzenia — Wielki Pomnik demona (Pomnik.cs; rysuje się nad mrokiem)
            if (POMNIK.wlaczony) { ctx.restore(); return; }

            // --- latarnia: szeroka poświata, widoczna z daleka i przy małym przybliżeniu
            var Rh = Math.Max(RW.latarnia.min, z * RW.latarnia.naZoom);
            var halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Rh);
            var moc = otwarta ? RW.mocOtwarty : RW.mocZamkniety;
            halo.addColorStop(0, Barwa.Rgba(255, 120, 80, moc + 0.12 * uderz));
            halo.addColorStop(0.35, Barwa.Rgba(200, 50, 40, (moc * 0.5) + 0.06 * uderz));
            halo.addColorStop(1, "rgba(120,20,20,0)");
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = halo;
            ctx.fillRect(sx - Rh, sy - Rh, Rh * 2, Rh * 2);
            ctx.globalCompositeOperation = "source-over";

            // --- promienie: cienkie smugi od serca ku wieńcowi, pulsujące z tętnem
            ctx.globalCompositeOperation = "lighter";
            ctx.strokeStyle = Barwa.Rgba(255, 150, 100, RW.promienAlfa + RW.promienTetno * uderz);
            ctx.lineWidth = Math.Max(1, z * 0.18);
            ctx.beginPath();
            var Rs = Math.Max(RW.serce.min, z * RW.serce.naZoom);
            for (int i = 0; i < RW.promieni; i++)
            {
                var a = (i / RW.promieni) * Math.PI * 2 + teraz * 0.00004;
                double d0 = Rs * 1.1, d1 = Rs * (1.7 + 0.25 * (i % 3));
                ctx.moveTo(sx + JsM.Cos(a) * d0, sy + JsM.Sin(a) * d0);
                ctx.lineTo(sx + JsM.Cos(a) * d1, sy + JsM.Sin(a) * d1);
            }
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";

            // --- serce z kamienia: ośmiokąt ciosany, żyły i jasny środek
            var R = Rs * (1 + RW.puchniecie * uderz);
            rysujSerce(ctx, sx, sy, R, uderz, otwarta);

            // --- wieniec: zapala się płynnie, w procentach skruszonej skorupy
            var proc = Rytual.procentSkorupy(sim);
            var Rw = Math.Max(R * RW.wieniec, z * RW.wieniecNaZoom);
            var obrot = teraz * 0.00008;
            ctx.strokeStyle = RW.ogniwoZgaszone;
            ctx.lineWidth = Math.Max(1, z * 0.14);
            ctx.beginPath(); ctx.arc(sx, sy, Rw, 0, Math.PI * 2); ctx.stroke();
            if (proc > 0)
            {
                ctx.strokeStyle = $"rgba({RW.ogniwoZapalone},{Js.Js.S(0.75 + 0.25 * uderz)})";
                ctx.lineWidth = Math.Max(2, z * 0.3);
                ctx.beginPath(); ctx.arc(sx, sy, Rw, -Math.PI / 2, -Math.PI / 2 + (proc / 100) * Math.PI * 2); ctx.stroke();
            }
            // znaki na wieńcu, obracające się powoli w przeciwną stronę
            if (Rw > RW.znakiWiencaOd)
            {
                var n = RW.znakowWienca;
                for (int i = 0; i < n; i++)
                {
                    var a = -obrot * 1.6 + (i / n) * Math.PI * 2;
                    var gr = Math.Max(3, z * 0.55);
                    ctx.save();
                    ctx.translate(sx + JsM.Cos(a) * (Rw + gr * 2.2), sy + JsM.Sin(a) * (Rw + gr * 2.2));
                    ctx.rotate(a + Math.PI / 2);
                    ctx.scale(gr, gr);
                    ctx.lineWidth = 1.2 / gr;
                    ctx.strokeStyle = "rgba(230,180,120,0.5)";
                    ctx.stroke(Tajemnica.glif(700 + i, 1));
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        /// <summary>Tętno rdzenia 0..1: podwójne uderzenie „bum-bum” i pauza, wspólne dla gry i menu.</summary>
        public static double tetnoRdzenia(double teraz)
        {
            var f = (teraz % RW.tetnoMs) / RW.tetnoMs;
            return Math.Max(0, 1 - Math.Abs(f - RW.uderzenie1) * 14) + RW.sila2 * Math.Max(0, 1 - Math.Abs(f - RW.uderzenie2) * 14);
        }

        /// <summary>Serce z kamienia: ciosany ośmiokąt, żyły, kreska cienia i jasne obrzeże.</summary>
        public static void rysujSerce(IPlotno ctx, double sx, double sy, double R, double uderz, bool otwarta)
        {
            var kanty = new Path2D();
            for (int i = 0; i < 8; i++)
            {
                var a = (i / 8.0) * Math.PI * 2 + Math.PI / 8;
                var rr = R * (i % 2 != 0 ? 0.92 : 1);
                if (i == 0) kanty.moveTo(sx + JsM.Cos(a) * rr, sy + JsM.Sin(a) * rr);
                else kanty.lineTo(sx + JsM.Cos(a) * rr, sy + JsM.Sin(a) * rr);
            }
            kanty.closePath();
            var wn = ctx.createRadialGradient(sx - R * 0.25, sy - R * 0.3, R * 0.05, sx, sy, R);
            wn.addColorStop(0, otwarta ? RW.serceJasneOtwarte : RW.serceJasne);
            wn.addColorStop(0.3, otwarta ? RW.serceZarOtwarte : RW.serceZar);
            wn.addColorStop(0.75, RW.serceCiemne);
            wn.addColorStop(1, RW.serceBrzeg);
            ctx.fillStyle = wn;
            ctx.fill(kanty);
            // żyły: kilka pękniętych linii od środka, jaśniejące z uderzeniem
            ctx.save();
            ctx.clip(kanty);
            ctx.strokeStyle = Barwa.Rgba(255, 214, 160, 0.35 + 0.45 * uderz);
            ctx.lineWidth = Math.Max(1, R * 0.06);
            ctx.beginPath();
            for (int i = 0; i < 7; i++)
            {
                var a = i * 0.9 + 0.4;
                double x = sx, y = sy;
                ctx.moveTo(x, y);
                for (int k = 1; k <= 3; k++)
                {
                    x = sx + JsM.Cos(a + JsM.Sin(i * 3 + k) * 0.35) * R * k / 3;
                    y = sy + JsM.Sin(a + JsM.Sin(i * 3 + k) * 0.35) * R * k / 3;
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            // kreska ryciny na kuli — cień po prawej stronie
            ctx.strokeStyle = "rgba(20,4,4,0.35)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var d = -R; d < R; d += Math.Max(2.2, R * 0.12)) { ctx.moveTo(sx + d, sy + R); ctx.lineTo(sx + d + R, sy); }
            ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = "rgba(255,220,180,0.85)";
            ctx.lineWidth = Math.Max(1.2, R * 0.07);
            ctx.stroke(kanty);
        }

        /// <summary>
        /// Obrys komory: pętle krawędzi kafli wnętrza (zgodnie ze wskazówkami zegara na ekranie — wnętrze po prawej), bez
        /// punktów na prostych, wygładzone (równe próbki i średnia krocząca), w kaflach świata.
        /// </summary>
        static List<List<Pkt>> obrysKomory(Func<double, double, bool> wnetrze, int x0, int y0, int x1, int y1)
        {
            int W = x1 - x0 + 3, H = y1 - y0 + 3;
            var m = new byte[W * H];
            for (int y = y0; y <= y1; y++) for (int x = x0; x <= x1; x++) if (wnetrze(x, y)) m[(y - y0 + 1) * W + (x - x0 + 1)] = 1;
            bool jest(int x, int y) => m[(y - y0 + 1) * W + (x - x0 + 1)] == 1;
            int klucz(int x, int y) => (y - y0 + 1) * (W + 1) + (x - x0 + 1);
            // Map z JS: kolejność wstawiania kluczy
            var wyjscia = new Dictionary<int, List<(int x, int y)>>();
            var kolejnosc = new List<int>();
            void krawedz(int ax, int ay, int bx, int by)
            {
                var k = klucz(ax, ay);
                if (wyjscia.TryGetValue(k, out var l)) l.Add((bx, by)); else { wyjscia[k] = new List<(int, int)> { (bx, by) }; kolejnosc.Add(k); }
            }
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    if (!jest(x, y)) continue;
                    if (!jest(x, y - 1)) krawedz(x, y, x + 1, y);
                    if (!jest(x + 1, y)) krawedz(x + 1, y, x + 1, y + 1);
                    if (!jest(x, y + 1)) krawedz(x + 1, y + 1, x, y + 1);
                    if (!jest(x - 1, y)) krawedz(x, y + 1, x, y);
                }
            var petle = new List<List<Pkt>>();
            foreach (var k0 in kolejnosc)
            {
                var l0 = wyjscia[k0];
                while (l0.Count > 0)
                {
                    int sx = (k0 % (W + 1)) + x0 - 1, sy = k0 / (W + 1) + y0 - 1;
                    var petla = new List<Pkt> { new Pkt(sx, sy) };
                    var nx = l0[l0.Count - 1]; l0.RemoveAt(l0.Count - 1);
                    for (int bez = 0; bez < 4000 && (nx.x != sx || nx.y != sy); bez++)
                    {
                        petla.Add(new Pkt(nx.x, nx.y));
                        if (!wyjscia.TryGetValue(klucz(nx.x, nx.y), out var l) || l.Count == 0) break;
                        nx = l[l.Count - 1]; l.RemoveAt(l.Count - 1);
                    }
                    if (petla.Count < 4) continue;
                    // bez punktów w środku prostych
                    var proste = new List<Pkt>();
                    for (int i = 0; i < petla.Count; i++)
                    {
                        var q = petla[i];
                        var a = petla[(i + petla.Count - 1) % petla.Count]; var b = petla[(i + 1) % petla.Count];
                        if ((q.x - a.x) * (b.y - q.y) - (q.y - a.y) * (b.x - q.x) != 0) proste.Add(q);
                    }
                    // równe próbki co pół kafla i dwa razy średnia krocząca ±1,5 kafla: schodki znikają, kształt zostaje
                    var gl = new List<Pkt>();
                    for (int i = 0; i < proste.Count; i++)
                    {
                        var a = proste[i]; var b = proste[(i + 1) % proste.Count];
                        double dx = b.x - a.x, dy = b.y - a.y;
                        var d = Math.Sqrt(dx * dx + dy * dy); var ile = Math.Max(1, (int)Rnd(d / 0.5));
                        for (int q = 0; q < ile; q++) gl.Add(new Pkt(a.x + (b.x - a.x) * (q / (double)ile), a.y + (b.y - a.y) * (q / (double)ile)));
                    }
                    for (int it = 0; it < 2; it++)
                    {
                        int n = gl.Count; var o = new List<Pkt>(n);
                        for (int i = 0; i < n; i++)
                        {
                            double sx2 = 0, sy2 = 0;
                            for (int d = -3; d <= 3; d++) { var q = gl[((i + d) % n + n) % n]; sx2 += q.x; sy2 += q.y; }
                            o.Add(new Pkt(sx2 / 7, sy2 / 7));
                        }
                        gl = o;
                    }
                    petle.Add(ksztaltKrypty(gl));
                }
            }
            return petle;
        }

        /// <summary>
        /// Pierścień klińców wzdłuż obrysu komory: ciosy w kształcie klina, jaśniejsza faza od strony komory, ciemna fuga na
        /// zewnątrz. Na dole — płyty posadzki. Gdzie za obrysem jest przejście, kliniec się nie rysuje. Co któryś ma znak.
        /// </summary>
        static void pierscienKlincow(IPlotno ctx, Sim sim, Camera cam, List<Pkt> p, Func<double, double, bool> wnetrze)
        {
            var w = sim.world; var z = cam.zoom; int n = p.Count;
            // normalne na zewnątrz (lewa strona obiegu), uśrednione w punktach (w TS: Float32Array)
            var nx = new float[n]; var ny = new float[n]; var dl = new float[n + 1];
            for (int i = 0; i < n; i++)
            {
                var a = p[(i + n - 1) % n]; var b = p[i]; var c = p[(i + 1) % n];
                double ex = (b.y - a.y) + (c.y - b.y), ey = -(b.x - a.x) - (c.x - b.x);
                var d = Math.Sqrt(ex * ex + ey * ey); if (d == 0) d = 1;
                ex /= d; ey /= d;
                nx[i] = (float)ex; ny[i] = (float)ey;
                double cx = c.x - b.x, cy = c.y - b.y;
                dl[i + 1] = (float)(dl[i] + Math.Sqrt(cx * cx + cy * cy));
            }
            double caly = dl[n];
            var ile = Math.Max(8, (int)Rnd(caly / RW.klin));
            // Punkt obrysu i normalna po długości s.
            (double x, double y, double ex, double ey) wPunkcie(double s)
            {
                s = ((s % caly) + caly) % caly;
                int lo = 0, hi = n;
                while (hi - lo > 1) { int mm = (lo + hi) >> 1; if (dl[mm] <= s) lo = mm; else hi = mm; }
                int i = lo, j = (lo + 1) % n; var t = (s - dl[i]) / Math.Max(1e-6, dl[i + 1] - (double)dl[i]);
                double ex = nx[i] * (1 - t) + nx[j] * t, ey = ny[i] * (1 - t) + ny[j] * t;
                var d = Math.Sqrt(ex * ex + ey * ey); if (d == 0) d = 1;
                ex /= d; ey /= d;
                return (p[i].x + (p[j].x - p[i].x) * t, p[i].y + (p[j].y - p[i].y) * t, ex, ey);
            }
            double px(double x) => cam.toScreenX(x);
            double py(double y) => cam.toScreenY(y);
            const int kroki = 4;
            var wew = new (double x, double y)[kroki + 1]; var zew = new (double x, double y)[kroki + 1];
            for (int k = 0; k < ile; k++)
            {
                double s0 = (k / (double)ile) * caly, s1 = ((k + 1) / (double)ile) * caly;
                var (mx, my, mnx, mny) = wPunkcie((s0 + s1) / 2);
                var posadzka = mny > 0.7;
                var gleb = posadzka ? RW.posadzkaGlebia : RW.klinGlebia;
                // przejście za obrysem (wyjście z komory) — tam nie ma muru
                double tx = Math.Floor(mx + mnx * gleb * 0.5), ty = Math.Floor(my + mny * gleb * 0.5);
                if (w.inb(tx, ty) && !w.solid(tx, ty) && !wnetrze(tx, ty)) continue;
                for (int q = 0; q <= kroki; q++)
                {
                    var (x, y, ex, ey) = wPunkcie(s0 + (s1 - s0) * (q / (double)kroki));
                    wew[q] = (px(x), py(y));
                    zew[q] = (px(x + ex * gleb), py(y + ey * gleb));
                }
                int h = unchecked((Js.Js.ToInt32(k * 2654435761.0) ^ Js.Js.ToInt32(w.coreX * 97 + w.coreY)) * (int)0x85ebca6b);
                h ^= (int)((uint)h >> 13);
                var bb = RW.murRozrzut * ((((uint)h % 1000) / 1000.0) - 0.5) * 2 + (posadzka ? 0.08 : 0);
                var mur = RW.mur;
                ctx.beginPath();
                for (int i = 0; i <= kroki; i++) { if (i > 0) ctx.lineTo(wew[i].x, wew[i].y); else ctx.moveTo(wew[i].x, wew[i].y); }
                for (int q = kroki; q >= 0; q--) ctx.lineTo(zew[q].x, zew[q].y);
                ctx.closePath();
                ctx.fillStyle = Barwa.Rgba(Rnd(mur[0] * (1 + bb)), Rnd(mur[1] * (1 + bb)), Rnd(mur[2] * (1 + bb)));
                ctx.fill();
                ctx.strokeStyle = RW.fuga;
                ctx.lineWidth = Math.Max(1, z * 0.07);
                ctx.stroke();
                if (z >= RW.fazaOdZoom)
                {
                    // faza od strony komory: kamień ma grubość
                    ctx.strokeStyle = RW.faza;
                    ctx.lineWidth = Math.Max(1, z * 0.09);
                    ctx.beginPath();
                    for (int i = 0; i <= kroki; i++)
                    {
                        double ex = zew[i].x - wew[i].x, ey = zew[i].y - wew[i].y;
                        var d = Math.Sqrt(ex * ex + ey * ey); if (d == 0) d = 1;
                        var o = Math.Max(1, z * 0.1);
                        double ax = wew[i].x + (ex / d) * o, ay = wew[i].y + (ey / d) * o;
                        if (i > 0) ctx.lineTo(ax, ay); else ctx.moveTo(ax, ay);
                    }
                    ctx.stroke();
                }
                // fryz: co któryś kliniec sklepienia i ścian ma wyryty znak, obrócony wzdłuż łuku
                if (!posadzka && z >= RW.znakiOdZoom && k % RW.znakCo == 2)
                {
                    var gr = Math.Min(gleb, (s1 - s0)) * z * 0.32;
                    ctx.save();
                    ctx.translate(px(mx + mnx * gleb * 0.5), py(my + mny * gleb * 0.5));
                    ctx.rotate(JsM.Atan2(mnx, -mny));
                    ctx.scale(gr, gr);
                    ctx.lineWidth = 1.4 / gr;
                    ctx.translate(0, 1 / gr);
                    ctx.strokeStyle = "rgba(230,200,160,0.3)";
                    ctx.stroke(Tajemnica.glif(k * 31 + w.coreX, 2));
                    ctx.translate(0, -1 / gr);
                    ctx.strokeStyle = "rgba(12,8,6,0.75)";
                    ctx.stroke(Tajemnica.glif(k * 31 + w.coreX, 2));
                    ctx.restore();
                }
            }
        }

        /// <summary>
        /// Kształt krypty z gładkiego obrysu komory: sklepienie to górna połowa obrysu, pod nim pionowe ściany i płaska
        /// posadzka na wysokości dna komory. Wynik w równych próbkach co pół kafla.
        /// </summary>
        static List<Pkt> ksztaltKrypty(List<Pkt> p)
        {
            int n = p.Count, iL = 0, iR = 0;
            var dno = double.NegativeInfinity;
            for (int i = 0; i < n; i++)
            {
                if (p[i].x < p[iL].x) iL = i;
                if (p[i].x > p[iR].x) iR = i;
                dno = Math.Max(dno, p[i].y);
            }
            var zarys = new List<Pkt>();
            for (int i = iL; ; i = (i + 1) % n) { zarys.Add(p[i]); if (i == iR) break; }
            zarys.Add(new Pkt(p[iR].x, dno)); zarys.Add(new Pkt(p[iL].x, dno));
            var wynik = new List<Pkt>();
            for (int i = 0; i < zarys.Count; i++)
            {
                var a = zarys[i]; var b = zarys[(i + 1) % zarys.Count];
                double dx = b.x - a.x, dy = b.y - a.y;
                var ile = Math.Max(1, (int)Rnd(Math.Sqrt(dx * dx + dy * dy) / 0.5));
                for (int q = 0; q < ile; q++) wynik.Add(new Pkt(a.x + (b.x - a.x) * (q / (double)ile), a.y + (b.y - a.y) * (q / (double)ile)));
            }
            return wynik;
        }

        /// <summary>
        /// Wyłom w sklepieniu: demon z gruzów wychodzi w górę, do przedsionka — przez rozbite sklepienie. Wyłom otwiera się od
        /// dołu w czasie wychodzenia i zostaje do końca gry.
        /// </summary>
        static void wylom(IPlotno ctx, Sim sim, Camera cam, List<Pkt> p)
        {
            if (!POMNIK.wlaczony) return;
            var s = sim.lud.pomnik;
            if (s == null) return;
            var k = s.faza == "wychodzi" ? Math.Min(1, ((sim.tick - s.od) / POMNIK.wyjscie) * 1.6) : s.faza == "walka" || s.faza == "kona" ? 1 : 0;
            if (k <= 0) return;
            var w = sim.world; var z = cam.zoom;
            double szczyt = double.PositiveInfinity, sx = 0;
            foreach (var q in p) { szczyt = Math.Min(szczyt, q.y); sx += q.x; }
            sx /= p.Count;
            // posadzka przedsionka nad komorą: pierwszy pusty kafel w górę od szczytu sklepienia
            var gora = szczyt - 3;
            for (var y = Math.Floor(szczyt) - 1; y > szczyt - 14; y--)
            {
                if (w.inb(Math.Floor(sx), y) && !w.solid(Math.Floor(sx), y)) { gora = y + 1; break; }
            }
            double dol = szczyt + 0.9, wys = (dol - gora) * k, g = dol - wys;
            var lewy = new List<(double x, double y)>(); var prawy = new List<(double x, double y)>();
            var kroki = Math.Max(3, (int)Math.Ceiling(wys / 0.45));
            for (int i = 0; i <= kroki; i++)
            {
                double t = i / (double)kroki, y = dol - wys * t;
                var szer = 2.5 - 0.7 * t;
                double drg(int nn) => (los01(nn) - 0.5) * 0.7;
                lewy.Add((sx - szer + drg(i * 2 + 1), y));
                prawy.Add((sx + szer + drg(i * 2 + 2), y));
            }
            double px(double x) => cam.toScreenX(x);
            double py(double y) => cam.toScreenY(y);
            var P = new Path2D();
            for (int i = 0; i < lewy.Count; i++) { if (i > 0) P.lineTo(px(lewy[i].x), py(lewy[i].y)); else P.moveTo(px(lewy[i].x), py(lewy[i].y)); }
            for (int i = prawy.Count - 1; i >= 0; i--) P.lineTo(px(prawy[i].x), py(prawy[i].y));
            P.closePath();
            ctx.save();
            var gr = ctx.createLinearGradient(0, py(g), 0, py(dol));
            gr.addColorStop(0, "rgb(30,24,21)"); gr.addColorStop(1, "rgb(16,11,10)");
            ctx.fillStyle = gr;
            ctx.fill(P);
            // brzeg przełomu: jasna, poszarpana krawędź kamienia i cień pod nią
            ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(10,6,5,0.9)"; ctx.lineWidth = Math.Max(1.5, z * 0.16);
            ctx.stroke(P);
            ctx.strokeStyle = "rgba(206,190,164,0.55)"; ctx.lineWidth = Math.Max(1, z * 0.07);
            ctx.stroke(P);
            // okruchy wiszące na brzegach wyłomu
            for (int i = 0; i < 8; i++)
            {
                var strona = i % 2 != 0 ? prawy : lewy;
                var (x, y) = strona[(int)Math.Floor(los01(i * 7 + 3) * strona.Count)];
                double r = (0.12 + los01(i * 5 + 1) * 0.18) * z, cx = px(x) + (i % 2 != 0 ? r : -r) * 0.6, cy = py(y);
                ctx.beginPath();
                for (int j = 0; j < 5; j++) { var a = (j / 5.0) * Math.PI * 2 + los01(i * 11 + j); ctx.lineTo(cx + JsM.Cos(a) * r, cy + JsM.Sin(a) * r * 0.8); }
                ctx.closePath();
                ctx.fillStyle = "rgb(86,74,64)"; ctx.fill();
                ctx.strokeStyle = "rgba(12,8,6,0.85)"; ctx.lineWidth = Math.Max(1, z * 0.05); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Stały skrót liczby → 0..1 (kształt wyłomu nie migocze między klatkami).</summary>
        static double los01(int n)
        {
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }
    }
}
