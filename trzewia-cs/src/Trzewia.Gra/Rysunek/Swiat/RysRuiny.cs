// Port: alpha-1/src/render/ruiny.ts — RUINY I ZABYTKI (Alpha, etap 3e): rysunek zawalonych budowli (Symulacja/Ruiny.cs)
// i animacje zabytków (Symulacja/Zabytki.cs). Mury z ciosów, gruz, kamienne łuki i filary w tle, drewniane belki,
// w kopalni szyny i porzucony wózek; zabytek leży na posadzce, z rzadka błyska w mroku. Odkrycie: kurz, rozbłysk,
// światło i wzlot; wzięcie: lot do rąk odkrywcy, nad głowę, fala światła i iskry do ludu; zostawienie: opada, gaśnie,
// szary dym. Kamień i drewno — przed mrokiem, światło zabytku — nad mrokiem. Animacje tikami gry, błyski — zegarem.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyZabytki;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek ruin (RysRuiny — bo Ruiny to klasa symulacji).</summary>
    public sealed class RysRuiny
    {
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static double Rnd(double v) => Math.Floor(v + 0.5);
        const string TUSZ = "rgba(20,12,8,0.95)";
        /// <summary>Czas animacji (tiki gry): wzlot po odkryciu, lot do rąk i fala światła po wzięciu, gaśnięcie po zostawieniu.</summary>
        static double WZLOT => ZABYTKI.kartaPo;
        const double DO_RAK = 90, NAD_GLOWA = 70, FALA = 110, GASNIE = 140;

        /// <summary>Czy obrys ruiny jest w kadrze.</summary>
        static bool widac(Camera cam, Ruina r)
        {
            var z = cam.zoom;
            double x1 = cam.toScreenX(r.x0 - 2), y1 = cam.toScreenY(r.y0 - 2), x2 = cam.toScreenX(r.x1 + 3), y2 = cam.toScreenY(r.dno + 2);
            return x2 > -z && y2 > -z && x1 < cam.vw + z && y1 < cam.vh + z;
        }

        static string? stanZ(StanZabytkow? st, int n) => st != null && st.stan.TryGetValue(n, out var s) ? s : null;
        static double odZ(StanZabytkow? st, int n) => st != null && st.od.TryGetValue(n, out var o) ? o : 0;

        /// <summary>Kamień, drewno i zabytek na posadzce — przed mrokiem.</summary>
        public void rysuj(IPlotno ctx, Sim sim, Camera cam)
        {
            var w = sim.world;
            var z = cam.zoom;
            var st = sim.lud.zabytki;
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            for (int n = 0; n < w.ruiny.Count; n++)
            {
                var r = w.ruiny[n];
                if (!widac(cam, r)) continue;
                // łuki i filary w tle, potem belki, mury, gruz, a na wierzchu wózek
                foreach (var l in r.luki) luk(ctx, cam, l.x0, l.x1, l.y, l.filary, r.dno, z);
                foreach (var b in r.belki) belka(ctx, cam, b, z);
                foreach (var i in r.mury)
                {
                    double mx = i % w.w, my = Math.Floor(i / w.w);
                    // korona: nad kaflem muru już nie ma muru — tam bloki są wykruszone
                    if (w.solid(mx, my)) ciosy(ctx, cam, mx, my, z, i, !w.solid(mx, my - 1));
                }
                foreach (var i in r.gruz) if (w.solid(i % w.w, Math.Floor(i / w.w))) gruz(ctx, cam, i % w.w, Math.Floor(i / w.w), z, i);
                if (r.wozek != null) wozek(ctx, cam, r, z);
                // zabytek na posadzce: nieodkryty — przyćmiony; zostawiony — szary, zgaszony (gaśnie w rysujNad)
                var stan = stanZ(st, n);
                double zx = cam.toScreenX(r.zabytek.x + 0.5), zy = cam.toScreenY(r.zabytek.y + 1);
                if (stan == null) rysujZabytek(ctx, r.zabytek.typ, zx, zy - z * 0.18, z * 0.75, 0.8, 0);
                else if (stan == "zostawiony" && sim.tick - odZ(st, n) >= GASNIE) rysujZabytek(ctx, r.zabytek.typ, zx, zy - z * 0.18, z * 0.75, 0.75, 1);
            }
            ctx.restore();
        }

        /// <summary>Światło zabytków, kurz, wzlot, lot do rąk, fala do ludu i gaśnięcie — nad mrokiem.</summary>
        public void rysujNad(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var w = sim.world;
            var st = sim.lud.zabytki;
            var z = cam.zoom;
            var ruch = Nastroj.wolnoRuszac();
            ctx.save();
            for (int n = 0; n < w.ruiny.Count; n++)
            {
                var r = w.ruiny[n];
                if (!widac(cam, r)) continue;
                var stan = stanZ(st, n);
                double zx = cam.toScreenX(r.zabytek.x + 0.5), dol = cam.toScreenY(r.zabytek.y + 1) - z * 0.18;
                if (stan == null)
                {
                    // nieodkryty: co kilka sekund krótki błysk w ciemności — żeby było widać, że coś tam leży
                    var f = ((teraz / 1000 + n * 1.7) % 4.2) / 4.2;
                    if (ruch && f < 0.12) blask(ctx, zx, dol - z * 0.2, z * 0.9, 0.5 * JsM.Sin((f / 0.12) * Math.PI), 0.25);
                    continue;
                }
                var dt = sim.tick - odZ(st, n);
                var bob = ruch ? JsM.Sin(teraz * 0.003 + n) * z * 0.08 : 0;
                if (stan == "odkryty")
                {
                    var p = gladko(dt / WZLOT);
                    var y = dol - p * z * 0.95 + (p >= 1 ? bob : 0);
                    kurz(ctx, cam, r, z, dt);
                    swiatlo(ctx, zx, y, z, p, teraz, ruch);
                    rysujZabytek(ctx, r.zabytek.typ, zx, y, z * 0.75 * (1 + 0.15 * p), 1, 0);
                }
                else if (stan == "wziety")
                {
                    wziecie(ctx, sim, cam, r, n, zx, dol - z * 0.95, z, dt, teraz);
                }
                else if (stan == "zostawiony" && dt < GASNIE)
                {
                    // opada na posadzkę, światło gaśnie, a z gasnącego zabytku idzie szary dym
                    var p = gladko(dt / GASNIE);
                    var y = dol - (1 - p) * z * 0.95;
                    swiatlo(ctx, zx, y, z, 1 - p, teraz, ruch);
                    rysujZabytek(ctx, r.zabytek.typ, zx, y, z * 0.75 * (1.15 - 0.15 * p), 1, p);
                    for (int k = 0; k < 7; k++)
                    {
                        var q = (p + k / 7.0) % 1;
                        ctx.fillStyle = Barwa.Rgba(120, 116, 110, 0.35 * JsM.Sin(q * Math.PI) * (1 - p * 0.6));
                        ctx.beginPath(); ctx.arc(zx + (los(k * 5 + n) - 0.5) * z * 0.8 + JsM.Sin(q * 6 + k) * z * 0.15, y - q * z * 1.8, z * (0.12 + q * 0.3), 0, Math.PI * 2); ctx.fill();
                    }
                }
            }
            ctx.restore();
        }

        /// <summary>Wzięcie: lot do rąk odkrywcy, zabytek nad jego głową z błyskiem, potem fala światła i iskry do ludu.</summary>
        static void wziecie(IPlotno ctx, Sim sim, Camera cam, Ruina r, int n, double zx, double zy, double z, double dt, double teraz)
        {
            if (dt > DO_RAK + NAD_GLOWA + FALA) return;
            var zab = sim.lud.zabytki;
            var kto = sim.creatureById(zab != null && zab.kto.TryGetValue(n, out var k0) ? k0 : -1);
            var kx = kto != null && !kto.dead ? cam.toScreenX(kto.x) : zx;
            var h = kto != null ? Figury.wysokoscPostaci(kto, z) : z * 2;
            var ky = kto != null && !kto.dead ? cam.toScreenY(kto.y + 1) - h * 1.15 : zy;
            if (dt < DO_RAK)
            {
                // leci łukiem do rąk
                var p = gladko(dt / DO_RAK);
                double x = zx + (kx - zx) * p, y = zy + (ky - zy) * p - JsM.Sin(p * Math.PI) * z * 1.2;
                swiatlo(ctx, x, y, z, 1, teraz, Nastroj.wolnoRuszac());
                rysujZabytek(ctx, r.zabytek.typ, x, y, z * 0.85, 1, 0);
                return;
            }
            var t2 = dt - DO_RAK;
            if (t2 < NAD_GLOWA)
            {
                // podnosi go nad głowę — błysk
                var p = t2 / NAD_GLOWA;
                blask(ctx, kx, ky, z * (1.5 + 2.5 * p), 0.8 * JsM.Sin(p * Math.PI), 1);
                rysujZabytek(ctx, r.zabytek.typ, kx, ky - p * z * 0.3, z * 0.85, 1, 0);
                return;
            }
            // fala światła od niego i iskry do każdego z ludu (aureole zapalają się same — Figury)
            {
                var p = (t2 - NAD_GLOWA) / FALA;
                ctx.strokeStyle = Barwa.Rgba(255, 236, 170, 0.7 * (1 - p));
                ctx.lineWidth = Math.Max(2, z * 0.15 * (1 - p));
                ctx.beginPath(); ctx.ellipse(kx, ky + h * 0.6, z * (1 + 14 * p), z * (0.5 + 5 * p), 0, 0, Math.PI * 2); ctx.stroke();
                rysujZabytek(ctx, r.zabytek.typ, kx, ky - z * 0.3 - p * z * 0.8, z * 0.85 * (1 - p), 1 - p, 0);
                foreach (var c in sim.creatures)
                {
                    if (c.dead || string.IsNullOrEmpty(c.rola) || c.straznik == true) continue;
                    double tx = cam.toScreenX(c.x), ty = cam.toScreenY(c.y + 1) - Figury.wysokoscPostaci(c, z) * 1.1;
                    var q = gladko(p * 1.3);
                    if (q >= 1) continue;
                    double x = kx + (tx - kx) * q, y = ky + (ty - ky) * q - JsM.Sin(q * Math.PI) * z * 1.5;
                    blask(ctx, x, y, z * 0.5, 0.9 * (1 - q * 0.5), 1);
                }
            }
        }

        /// <summary>Kurz sypiący się ze sklepienia ruiny przez pierwsze chwile po odkryciu.</summary>
        static void kurz(IPlotno ctx, Camera cam, Ruina r, double z, double dt)
        {
            if (dt > WZLOT * 1.6) return;
            var p = dt / (WZLOT * 1.6);
            for (int k = 0; k < 26; k++)
            {
                var fx = r.x0 + 1 + los(k * 13) * (r.x1 - r.x0 - 1);
                var start = los(k * 7) * 0.5;
                var q = (p - start) / 0.5;
                if (q <= 0 || q >= 1) continue;
                var x = cam.toScreenX(fx) + JsM.Sin(q * 4 + k) * z * 0.1;
                var y = cam.toScreenY(r.y0 + 0.5) + q * (cam.toScreenY(r.dno) - cam.toScreenY(r.y0 + 0.5));
                ctx.fillStyle = Barwa.Rgba(196, 176, 140, 0.6 * (1 - q));
                ctx.beginPath(); ctx.arc(x, y, Math.Max(0.8, z * (0.04 + 0.05 * los(k))), 0, Math.PI * 2); ctx.fill();
            }
            // obłok przy posadzce
            var yd = cam.toScreenY(r.dno);
            for (int k = 0; k < 8; k++)
            {
                var x = cam.toScreenX(r.x0 + 1 + los(k * 3 + 1) * (r.x1 - r.x0 - 1));
                ctx.fillStyle = Barwa.Rgba(190, 170, 136, 0.25 * JsM.Sin(p * Math.PI));
                ctx.beginPath(); ctx.arc(x, yd - z * 0.3, z * (0.3 + 0.5 * p), 0, Math.PI * 2); ctx.fill();
            }
        }

        /// <summary>Światło z wnętrza ruiny wokół zabytku: poświata, promienie i pierścień (`p` — siła 0..1).</summary>
        static void swiatlo(IPlotno ctx, double x, double y, double z, double p, double teraz, bool ruch)
        {
            if (p <= 0.01) return;
            var R = z * (1.2 + 2.2 * p);
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 240, 190, 0.65 * p)); g.addColorStop(0.4, Barwa.Rgba(255, 214, 140, 0.28 * p)); g.addColorStop(1, "rgba(255,200,120,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            // promienie
            var obrot = ruch ? teraz * 0.0004 : 0;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (int k = 0; k < 8; k++)
            {
                var a = obrot + (k / 8.0) * Math.PI * 2;
                var dl = z * (1.1 + 1.6 * p) * (0.7 + 0.3 * los(k));
                var pr = ctx.createLinearGradient(x, y, x + JsM.Cos(a) * dl, y + JsM.Sin(a) * dl);
                pr.addColorStop(0, Barwa.Rgba(255, 230, 160, 0.35 * p)); pr.addColorStop(1, "rgba(255,230,160,0)");
                ctx.strokeStyle = pr; ctx.lineWidth = Math.Max(1, z * 0.12);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + JsM.Cos(a) * dl, y + JsM.Sin(a) * dl); ctx.stroke();
            }
            ctx.restore();
            // pierścień pod zabytkiem
            ctx.strokeStyle = Barwa.Rgba(255, 226, 150, 0.6 * p);
            ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.beginPath(); ctx.ellipse(x, y + z * 0.55, z * 0.7 * p, z * 0.18 * p, 0, 0, Math.PI * 2); ctx.stroke();
        }

        /// <summary>Krótki błysk (gwiazdka z poświatą).</summary>
        static void blask(IPlotno ctx, double x, double y, double R, double a, double rdzen)
        {
            if (a <= 0.01) return;
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 246, 210, a)); g.addColorStop(1, "rgba(255,230,160,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.strokeStyle = Barwa.Rgba(255, 250, 230, a * rdzen); ctx.lineWidth = Math.Max(1, R * 0.06);
            ctx.beginPath(); ctx.moveTo(x - R * 0.5, y); ctx.lineTo(x + R * 0.5, y); ctx.moveTo(x, y - R * 0.5); ctx.lineTo(x, y + R * 0.5); ctx.stroke();
        }

        /// <summary>Mur z ciosów w kaflu (x, y): dwa rzędy bloków w wiązaniu, fugi tuszem; korona muru wykruszona.</summary>
        static void ciosy(IPlotno ctx, Camera cam, double x, double y, double z, double i, bool korona)
        {
            double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
            double drg(double n) => (los(n) - 0.5) * z * 0.1;
            for (int rz = 0; rz < 2; rz++)
            {
                var przes = (y * 2 + rz) % 2 != 0 ? 0.5 : 0;
                for (int k = -1; k < 2; k++)
                {
                    double bx0 = Math.Max(0, (k + przes) * 0.5 + 0.0), bx1 = Math.Min(1, (k + przes) * 0.5 + 0.5);
                    if (bx1 <= bx0) continue;
                    var id = i * 7 + rz * 3 + k;
                    // korona muru wykruszona: górny rząd ma luki
                    if (korona && rz == 0 && los(id * 13) < 0.4) continue;
                    var v = los(id);
                    double xa = sx + bx0 * z, xb = sx + bx1 * z, ya = sy + rz * z * 0.5, yb = ya + z * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(xa + drg(id * 3), ya + drg(id * 5)); ctx.lineTo(xb + drg(id * 7), ya + drg(id * 11));
                    ctx.lineTo(xb + drg(id * 13), yb + drg(id * 17) * 0.5); ctx.lineTo(xa + drg(id * 19), yb + drg(id * 23) * 0.5);
                    ctx.closePath();
                    ctx.fillStyle = Barwa.Rgba(96 + Rnd(36 * v), 86 + Rnd(30 * v), 74 + Rnd(24 * v), 0.97);
                    ctx.fill();
                    ctx.strokeStyle = "rgba(30,22,16,0.85)"; ctx.lineWidth = Math.Max(0.6, z * 0.05);
                    ctx.stroke();
                }
            }
            // tu i ówdzie pęknięcie
            if (los(i) < 0.3)
            {
                ctx.strokeStyle = "rgba(30,22,16,0.7)"; ctx.lineWidth = Math.Max(0.6, z * 0.04);
                ctx.beginPath(); ctx.moveTo(sx + z * 0.2, sy + z * 0.1); ctx.lineTo(sx + z * 0.4, sy + z * 0.45); ctx.lineTo(sx + z * 0.32, sy + z * 0.85); ctx.stroke();
            }
        }

        /// <summary>Gruz po zawalonym sklepieniu: kupka kanciastych kamieni różnej wielkości.</summary>
        static void gruz(IPlotno ctx, Camera cam, double x, double y, double z, double i)
        {
            double sx = cam.toScreenX(x), sy = cam.toScreenY(y);
            ctx.fillStyle = "rgba(52,44,38,0.97)"; ctx.fillRect(sx, sy, z, z);
            for (int k = 0; k < 6; k++)
            {
                double px = sx + z * (0.12 + 0.76 * los(i * 5 + k)), py = sy + z * (0.2 + 0.7 * los(i * 9 + k));
                var r = z * (0.12 + 0.13 * los(i + k * 3));
                var v = los(i * 3 + k);
                ctx.fillStyle = Barwa.Rgba(104 + Rnd(34 * v), 94 + Rnd(28 * v), 80 + Rnd(22 * v), 0.98);
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.6, z * 0.04);
                const int n = 5; var a0 = los(k + i) * 3;
                ctx.beginPath();
                for (int j = 0; j < n; j++)
                {
                    double a = a0 + ((double)j / n) * Math.PI * 2, rr = r * (0.7 + 0.45 * los(i * 17 + k * 5 + j));
                    ctx.lineTo(px + JsM.Cos(a) * rr * 1.2, py + JsM.Sin(a) * rr * 0.85);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
        }

        /// <summary>Kamienny łuk w tle (od x0 do x1, podstawa na y): pełne klińce z cieniem pod łukiem; z filarami do posadzki.</summary>
        static void luk(IPlotno ctx, Camera cam, double lx0, double lx1, double ly, bool filary, double dno, double z)
        {
            double cx = cam.toScreenX((lx0 + lx1) / 2), cy = cam.toScreenY(ly);
            double R = ((lx1 - lx0) / 2) * z, gr = z * 0.62;
            ctx.save();
            ctx.globalAlpha = 0.92;
            if (filary)
            {
                foreach (var fx in new[] { lx0, lx1 })
                {
                    var x = cam.toScreenX(fx);
                    var fs = gr * 0.9;
                    ctx.fillStyle = "rgba(96,86,74,0.95)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, z * 0.05);
                    ctx.beginPath(); ctx.rect(x - fs / 2, cy, fs, cam.toScreenY(dno) - cy); ctx.fill(); ctx.stroke();
                    // bębny filara i cień po jednej stronie
                    ctx.fillStyle = "rgba(20,14,10,0.25)"; ctx.fillRect(x + fs * 0.15, cy, fs * 0.35, cam.toScreenY(dno) - cy);
                    ctx.beginPath();
                    for (var yy = cy + z * 0.8; yy < cam.toScreenY(dno) - z * 0.2; yy += z * 0.8) { ctx.moveTo(x - fs / 2, yy); ctx.lineTo(x + fs / 2, yy); }
                    ctx.stroke();
                    // głowica i baza
                    ctx.fillStyle = "rgba(106,96,82,0.95)";
                    ctx.beginPath(); ctx.rect(x - fs * 0.85, cy - z * 0.12, fs * 1.7, z * 0.2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.rect(x - fs * 0.85, cam.toScreenY(dno) - z * 0.2, fs * 1.7, z * 0.2); ctx.fill(); ctx.stroke();
                }
            }
            // cień pod łukiem: wnętrze łuku ciemniejsze (głębia)
            ctx.fillStyle = "rgba(14,10,8,0.28)";
            ctx.beginPath(); ctx.arc(cx, cy, Math.Max(1, R - gr / 2), Math.PI, 0); ctx.closePath(); ctx.fill();
            // klińce łuku — jeden albo dwa przy kluczu mogły wypaść
            var n = Math.Max(5, (int)Rnd(R / (z * 0.42)));
            var wypadl = los(Rnd(lx0) * 31) < 0.5 ? n / 2 + (los(Rnd(lx0) * 7) < 0.5 ? 0 : 1) : -1;
            for (int k = 0; k < n; k++)
            {
                if (k == wypadl) continue;
                double a0 = Math.PI + ((double)k / n) * Math.PI, a1 = Math.PI + ((k + 1.0) / n) * Math.PI;
                var v = los(k * 11 + Rnd(lx0));
                ctx.fillStyle = Barwa.Rgba(108 + Rnd(30 * v), 96 + Rnd(26 * v), 82 + Rnd(20 * v), 0.97);
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.6, z * 0.05);
                ctx.beginPath();
                ctx.arc(cx, cy, R + gr / 2, a0, a1);
                ctx.arc(cx, cy, Math.Max(1, R - gr / 2), a1, a0, true);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // jasna faza od strony światła (górna krawędź klińca)
                ctx.strokeStyle = "rgba(220,198,160,0.3)"; ctx.lineWidth = Math.Max(0.6, z * 0.04);
                ctx.beginPath(); ctx.arc(cx, cy, R + gr / 2 - z * 0.05, a0 + 0.02, a1 - 0.02); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Belka z ciemnego drewna (odcinek w kaflach): gruba, ze słojami, na jednym końcu złamana w drzazgi.</summary>
        static void belka(IPlotno ctx, Camera cam, double[] b, double z)
        {
            double x0 = cam.toScreenX(b[0]), y0 = cam.toScreenY(b[1]), x1 = cam.toScreenX(b[2]), y1 = cam.toScreenY(b[3]);
            double dx = x1 - x0, dy = y1 - y0, d = Math.Sqrt(dx * dx + dy * dy); if (d == 0) d = 1;
            double nx = -dy / d, ny = dx / d;
            var g = Math.Max(3, z * 0.42);
            // pień belki jako czworokąt z drzazgami na końcu (x1)
            ctx.beginPath();
            ctx.moveTo(x0 + nx * g / 2, y0 + ny * g / 2);
            ctx.lineTo(x1 + nx * g / 2 - dx / d * g * 0.3, y1 + ny * g / 2 - dy / d * g * 0.3);
            for (int k = 0; k <= 4; k++)
            {
                double t = 0.5 - k / 4.0, wys = (k % 2 != 0 ? 0.2 : 0.75) * g;
                ctx.lineTo(x1 + nx * g * t + dx / d * wys - dx / d * g * 0.3, y1 + ny * g * t + dy / d * wys - dy / d * g * 0.3);
            }
            ctx.lineTo(x0 - nx * g / 2, y0 - ny * g / 2);
            ctx.closePath();
            ctx.fillStyle = "rgba(90,60,36,0.98)"; ctx.fill();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.8, z * 0.05); ctx.stroke();
            // słoje wzdłuż i jaśniejsza krawędź
            ctx.strokeStyle = "rgba(52,34,20,0.6)"; ctx.lineWidth = Math.Max(0.5, z * 0.03);
            ctx.beginPath();
            foreach (var t in new[] { -0.22, 0.05, 0.28 }) { ctx.moveTo(x0 + nx * g * t, y0 + ny * g * t); ctx.lineTo(x1 + nx * g * t - dx / d * g * 0.4, y1 + ny * g * t - dy / d * g * 0.4); }
            ctx.stroke();
            ctx.strokeStyle = "rgba(150,110,70,0.45)"; ctx.lineWidth = Math.Max(0.6, z * 0.04);
            ctx.beginPath(); ctx.moveTo(x0 + nx * g * 0.42, y0 + ny * g * 0.42); ctx.lineTo(x1 + nx * g * 0.42 - dx / d * g * 0.4, y1 + ny * g * 0.42 - dy / d * g * 0.4); ctx.stroke();
        }

        /// <summary>Kopalnia: szyny po spągu na całej długości chodnika i porzucony wózek na kołach.</summary>
        static void wozek(IPlotno ctx, Camera cam, Ruina r, double z)
        {
            var yd = cam.toScreenY(r.dno) - z * 0.06;
            ctx.strokeStyle = "rgba(70,64,60,0.95)"; ctx.lineWidth = Math.Max(1, z * 0.07);
            ctx.beginPath(); ctx.moveTo(cam.toScreenX(r.x0), yd); ctx.lineTo(cam.toScreenX(r.x1 + 1), yd); ctx.stroke();
            // podkłady
            ctx.strokeStyle = "rgba(90,60,36,0.9)"; ctx.lineWidth = Math.Max(1, z * 0.1);
            for (var x = r.x0; x <= r.x1; x++) { ctx.beginPath(); ctx.moveTo(cam.toScreenX(x + 0.2), yd + z * 0.04); ctx.lineTo(cam.toScreenX(x + 0.7), yd + z * 0.04); ctx.stroke(); }
            if (r.wozek == null) return;
            double wx = cam.toScreenX(r.wozek[0] + 0.5), wy = yd - z * 0.18;
            ctx.fillStyle = "rgba(92,66,44,0.98)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.beginPath();
            ctx.moveTo(wx - z * 0.75, wy - z * 0.75); ctx.lineTo(wx + z * 0.75, wy - z * 0.75); ctx.lineTo(wx + z * 0.6, wy); ctx.lineTo(wx - z * 0.6, wy); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(60,60,66,0.9)"; ctx.lineWidth = Math.Max(1, z * 0.07);
            ctx.beginPath(); ctx.moveTo(wx - z * 0.7, wy - z * 0.45); ctx.lineTo(wx + z * 0.7, wy - z * 0.45); ctx.stroke();
            ctx.fillStyle = "rgba(50,50,54,0.98)";
            foreach (var dx in new[] { -0.38, 0.38 }) { ctx.beginPath(); ctx.arc(wx + dx * z, wy + z * 0.02, z * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = TUSZ; ctx.stroke(); }
        }

        /// <summary>
        /// Zabytek na ekranie: środek dołu w (x, y), rozmiar `s`, `alfa`; `szary` 0..1 — zgaszony. Relikwiarz, miecz,
        /// kielich, księga.
        /// </summary>
        public static void rysujZabytek(IPlotno ctx, string typ, double x, double y, double s, double alfa, double szary)
        {
            Styl mieszaj(double r, double g, double b, double a = 0.98)
            {
                var sz = (r + g + b) / 3 * 0.75;
                return Barwa.Rgba(Rnd(r + (sz - r) * szary), Rnd(g + (sz - g) * szary), Rnd(b + (sz - b) * szary), a);
            }
            ctx.save();
            ctx.globalAlpha = Math.Max(0, Math.Min(1, alfa));
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, s * 0.06);
            if (typ == "relikwiarz")
            {
                double w = s * 0.9, h = s * 0.5;
                ctx.fillStyle = mieszaj(176, 178, 186);
                ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.fill(); ctx.stroke();
                ctx.fillStyle = mieszaj(196, 198, 206);
                ctx.beginPath(); ctx.moveTo(x - w * 0.56, y - h); ctx.lineTo(x, y - h - s * 0.32); ctx.lineTo(x + w * 0.56, y - h); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = mieszaj(226, 186, 92); ctx.lineWidth = Math.Max(1, s * 0.07);
                ctx.beginPath(); ctx.moveTo(x, y - h - s * 0.32); ctx.lineTo(x, y - h - s * 0.6); ctx.moveTo(x - s * 0.1, y - h - s * 0.5); ctx.lineTo(x + s * 0.1, y - h - s * 0.5); ctx.stroke();
                ctx.fillStyle = mieszaj(170, 40, 50);
                foreach (var dx in new[] { -0.25, 0, 0.25 }) { ctx.beginPath(); ctx.arc(x + dx * w, y - h * 0.5, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
            }
            else if (typ == "miecz")
            {
                // leży ukośnie: ostrze w prawo, rękojeść w lewo
                ctx.save(); ctx.translate(x, y - s * 0.15); ctx.rotate(-0.25);
                ctx.fillStyle = mieszaj(200, 204, 214);
                ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.05); ctx.lineTo(s * 0.75, -s * 0.03); ctx.lineTo(s * 0.85, 0); ctx.lineTo(s * 0.75, s * 0.03); ctx.lineTo(-s * 0.25, s * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = mieszaj(170, 132, 64);
                ctx.beginPath(); ctx.rect(-s * 0.3, -s * 0.2, s * 0.08, s * 0.4); ctx.fill(); ctx.stroke();
                ctx.fillStyle = mieszaj(90, 58, 36);
                ctx.beginPath(); ctx.rect(-s * 0.55, -s * 0.04, s * 0.25, s * 0.08); ctx.fill(); ctx.stroke();
                ctx.fillStyle = mieszaj(196, 160, 80);
                ctx.beginPath(); ctx.arc(-s * 0.6, 0, s * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            else if (typ == "kielich")
            {
                ctx.fillStyle = mieszaj(214, 172, 80);
                ctx.beginPath(); ctx.ellipse(x, y - s * 0.03, s * 0.28, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.rect(x - s * 0.05, y - s * 0.4, s * 0.1, s * 0.36); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - s * 0.32, y - s * 0.78); ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.38, x, y - s * 0.38); ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.38, x + s * 0.32, y - s * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = mieszaj(70, 20, 24);
                ctx.beginPath(); ctx.ellipse(x, y - s * 0.78, s * 0.3, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
            }
            else
            {
                double w = s * 0.75, h = s * 0.32;
                ctx.fillStyle = mieszaj(232, 220, 190);
                ctx.beginPath(); ctx.rect(x - w / 2 + s * 0.03, y - h, w - s * 0.06, h); ctx.fill();
                ctx.fillStyle = mieszaj(96, 44, 30);
                ctx.beginPath(); ctx.rect(x - w / 2, y - h - s * 0.06, w, s * 0.1); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.rect(x - w / 2, y - s * 0.06, w, s * 0.08); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = mieszaj(214, 172, 80); ctx.lineWidth = Math.Max(1, s * 0.05);
                ctx.beginPath(); ctx.moveTo(x, y - h - s * 0.05); ctx.lineTo(x, y - h + s * 0.1); ctx.moveTo(x - s * 0.08, y - h - s * 0.01); ctx.lineTo(x + s * 0.08, y - h - s * 0.01); ctx.stroke();
                ctx.fillStyle = mieszaj(196, 160, 80);
                ctx.beginPath(); ctx.rect(x + w / 2 - s * 0.04, y - h * 0.65, s * 0.08, s * 0.12); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Kamera rycin atlasu: (x, y) kafli → (cx + x·z, yp + y·z).</summary>
        static Camera kameraRyciny(double cx, double yp, double z) => new Camera(0, 0) { zoom = z, minZoom = z, maxZoom = z, x = -cx / z, y = -yp / z };

        /// <summary>
        /// Rycina atlasu: zawalona kaplica — mury z ciosów, łuk z filarami, zwalona belka i gruz, a w środku zabytek,
        /// który unosi się w świetle (cx — środek, yp — posadzka, z — pikseli na kafel, t — zegar).
        /// </summary>
        public static void ruinaNaRycinie(IPlotno ctx, double cx, double yp, double z, double t, string typ)
        {
            var cam = kameraRyciny(cx, yp, z);
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            luk(ctx, cam, -3, 0, -3.5, true, 0, z);
            luk(ctx, cam, 0, 3, -3.5, true, 0, z);
            belka(ctx, cam, new[] { 3.6, -5.2, 1.6, -0.4 }, z);
            for (int x = -5; x <= 4; x++) ciosy(ctx, cam, x, 0, z, x + 40, false);
            for (int y = -5; y < 0; y++) { ciosy(ctx, cam, -5, y, z, y * 7 + 3, false); if (y < -2) ciosy(ctx, cam, 4, y, z, y * 5 + 9, y == -5); }
            for (int x = -5; x <= 0; x++) ciosy(ctx, cam, x, -6, z, x * 3 + 77, true);
            gruz(ctx, cam, 2, -1, z, 5); gruz(ctx, cam, 3, -1, z, 9); gruz(ctx, cam, 3, -2, z, 13);
            var bob = JsM.Sin(t * 0.003) * z * 0.08;
            swiatlo(ctx, cx + z * 0.5, yp - z * 1.4 + bob, z, 1, t, true);
            rysujZabytek(ctx, typ, cx + z * 0.5, yp - z * 1.1 + bob, z * 0.9, 1, 0);
            ctx.restore();
        }

        /// <summary>Rycina atlasu: zabytek w świetle (do tablicy „Zabytki” — cztery obok siebie).</summary>
        public static void zabytekNaRycinie(IPlotno ctx, double x, double y, double z, double t, string typ, double faza)
        {
            var bob = JsM.Sin(t * 0.003 + faza) * z * 0.08;
            swiatlo(ctx, x, y - z * 0.3 + bob, z * 0.8, 0.8, t + faza * 500, true);
            rysujZabytek(ctx, typ, x, y + bob, z, 1, 0);
        }
    }
}
