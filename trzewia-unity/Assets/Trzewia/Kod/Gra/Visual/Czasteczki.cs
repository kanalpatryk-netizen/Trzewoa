// Oprawa walki, etap 3 (docs/plan-oprawy-cerber.md): cząsteczki „uderzenia” z jednej puli — iskry (addytywnie, po
// mapie świateł: to światło), krople krwi (spadają, na posadzce zostawiają plamy, które powoli gasną), pył (przewrócenie,
// lądowanie bossa, pęknięcie pieczęci) i popiół (konanie bossa, pęknięcie). Tylko obraz — symulacja o nich nie wie.
// Pula stałej wielkości (VisualConfig.Uderzenia.Czasteczek, ok. 500): nowa cząsteczka zajmuje wolne miejsce albo
// najstarsze. Ruch w kaflach świata i w czasie ekranu (nie tikach gry: w zatrzymaniu trafień iskry dalej lecą).
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using U = Trzewia.Visual.VisualConfig.Uderzenia;

namespace Trzewia.Visual
{
    public enum RodzajCzasteczki : byte { Iskra = 0, Krew = 1, Pyl = 2, Popiol = 3 }

    public static class Czasteczki
    {
        struct Cz
        {
            public bool jest;
            public RodzajCzasteczki r;
            /// <summary>Miejsce i prędkość (kafle, kafle/s), początek i długość życia (ms), wielkość (kafle).</summary>
            public double x, y, vx, vy, od, zyje, wielkosc;
        }

        struct Plama { public bool jest; public double x, y, r, od; }

        static Cz[] pula = new Cz[Math.Max(16, U.Czasteczek)];
        static readonly Plama[] plamy = new Plama[Math.Max(8, U.Plam)];
        static int nastepna, nastepnaPlama;
        static double zegar = double.NaN;
        static uint ziarno = 2463534242;

        /// <summary>Ile cząsteczek żyje (pomiar wydajności).</summary>
        public static int Zywych { get; private set; }
        /// <summary>Najwięcej żywych naraz od początku (pomiar).</summary>
        public static int NajwiecejZywych { get; private set; }

        /// <summary>Liczba 0…1 (xorshift — bez alokacji, bez Random).</summary>
        static double los()
        {
            ziarno ^= ziarno << 13; ziarno ^= ziarno >> 17; ziarno ^= ziarno << 5;
            return (ziarno & 0xFFFFFF) / 16777216.0;
        }
        static double z(double a, double b) => a + (b - a) * los();

        /// <summary>Wszystko precz (nowa partia, wyłączona oprawa).</summary>
        public static void Wyczysc()
        {
            for (int i = 0; i < pula.Length; i++) pula[i].jest = false;
            for (int i = 0; i < plamy.Length; i++) plamy[i].jest = false;
            Zywych = 0;
        }

        /// <summary>Jedna cząsteczka (miejsce i prędkość w kaflach, życie w ms, wielkość w kaflach).</summary>
        public static void Dodaj(RodzajCzasteczki r, double x, double y, double vx, double vy, double zyjeMs, double wielkosc)
        {
            if (double.IsNaN(zegar)) return;
            // wolne miejsce od kursora; gdy pełno — najstarsza (pierwsza napotkana od kursora)
            int n = pula.Length, gdzie = nastepna;
            for (int k = 0; k < n; k++)
            {
                var i = (nastepna + k) % n;
                if (!pula[i].jest) { gdzie = i; break; }
            }
            nastepna = (gdzie + 1) % n;
            pula[gdzie] = new Cz { jest = true, r = r, x = x, y = y, vx = vx, vy = vy, od = zegar, zyje = zyjeMs, wielkosc = wielkosc };
        }

        // ───────────── emitery ─────────────

        /// <summary>Iskry z miejsca trafienia, w stronę `kier` (−1 lewo, 1 prawo, 0 — wokoło).</summary>
        public static void Iskry(double x, double y, double kier, int ile)
        {
            for (int i = 0; i < ile; i++)
            {
                var kat = kier == 0 ? z(0, Math.PI * 2) : (kier > 0 ? 0 : Math.PI) + z(-0.9, 0.9);
                var v = z(6, 15);
                Dodaj(RodzajCzasteczki.Iskra, x, y, Math.Cos(kat) * v, Math.Sin(kat) * v - z(1, 5), z(140, 340), z(0.05, 0.1));
            }
        }

        /// <summary>Krople krwi: bryzg w stronę `kier` (0 — wokoło), siła 0…1+.</summary>
        public static void Krew(double x, double y, double kier, int ile, double sila = 1)
        {
            for (int i = 0; i < ile; i++)
            {
                var vx = (kier == 0 ? z(-1, 1) : kier * z(0.2, 1.1)) * z(2, 7) * sila;
                Dodaj(RodzajCzasteczki.Krew, x + z(-0.15, 0.15), y + z(-0.15, 0.15), vx, -z(2, 9) * sila, z(900, 1800), z(0.05, 0.13));
            }
        }

        /// <summary>Pył po posadzce (y — posadzka): kłęby rozchodzą się na boki na szerokość `szer` kafli.</summary>
        public static void Pyl(double x, double y, double szer, int ile)
        {
            for (int i = 0; i < ile; i++)
            {
                var s = z(-1, 1);
                Dodaj(RodzajCzasteczki.Pyl, x + s * szer * 0.5, y - z(0, 0.3), s * z(1.2, 3.5), -z(0.2, 1.4), z(550, 1100), z(0.25, 0.6));
            }
        }

        /// <summary>Popiół: płatki unoszą się z miejsca i dryfują.</summary>
        public static void Popiol(double x, double y, double szer, int ile)
        {
            for (int i = 0; i < ile; i++)
                Dodaj(RodzajCzasteczki.Popiol, x + z(-0.5, 0.5) * szer, y + z(-0.3, 0.3), z(-0.5, 0.5), -z(0.6, 2.0), z(1600, 3200), z(0.04, 0.09));
        }

        static void plama(double x, double y, double r)
        {
            plamy[nastepnaPlama] = new Plama { jest = true, x = x, y = y, r = r, od = zegar };
            nastepnaPlama = (nastepnaPlama + 1) % plamy.Length;
        }

        // ───────────── ruch ─────────────

        /// <summary>Co klatkę: ruch w czasie ekranu (`teraz`, ms); krople krwi na posadzce zostawiają plamy.</summary>
        public static void Krok(Sim sim, double teraz)
        {
            // zegar cofnął się (nowa partia, przewijanie w zrzutach) — to, co było, jest z innego czasu: precz
            if (!double.IsNaN(zegar) && teraz < zegar) { Wyczysc(); zegar = teraz; return; }
            if (double.IsNaN(zegar) || teraz - zegar > 1000) { zegar = teraz; return; }
            var dt = Math.Min(50, teraz - zegar) / 1000;
            zegar = teraz;
            var w = sim.world;
            int zywych = 0;
            for (int i = 0; i < pula.Length; i++)
            {
                ref var c = ref pula[i];
                if (!c.jest) continue;
                if (teraz - c.od >= c.zyje) { c.jest = false; continue; }
                switch (c.r)
                {
                    case RodzajCzasteczki.Iskra: c.vy += U.Grawitacja * 0.45 * dt; c.vx *= 1 - 2.5 * dt; break;
                    case RodzajCzasteczki.Krew: c.vy += U.Grawitacja * dt; c.vx *= 1 - 0.6 * dt; break;
                    case RodzajCzasteczki.Pyl: c.vy += -0.4 * dt; c.vx *= 1 - 3.0 * dt; c.vy *= 1 - 2.0 * dt; break;
                    case RodzajCzasteczki.Popiol: c.vx += Math.Sin((teraz + i * 97) * 0.003) * 0.8 * dt; c.vy *= 1 - 0.5 * dt; break;
                }
                var nx = c.x + c.vx * dt; var ny = c.y + c.vy * dt;
                // krew i iskry nie przechodzą przez skałę: kropla zostaje plamą na wierzchu kafla, iskra gaśnie
                if ((c.r == RodzajCzasteczki.Krew || c.r == RodzajCzasteczki.Iskra) && c.vy > 0 && w.solid(Math.Floor(nx), Math.Floor(ny)))
                {
                    if (c.r == RodzajCzasteczki.Krew) plama(nx, Math.Floor(ny), c.wielkosc * z(1.6, 3.2));
                    c.jest = false; continue;
                }
                c.x = nx; c.y = ny;
                zywych++;
            }
            Zywych = zywych;
            if (zywych > NajwiecejZywych) NajwiecejZywych = zywych;
        }

        // ───────────── rysunek ─────────────

        /// <summary>Plamy, krew, pył i popiół — w świecie, przed mapą świateł (to materia, nie światło).</summary>
        public static void RysujPod(IPlotno ctx, Camera cam, double teraz)
        {
            if (double.IsNaN(zegar)) return;
            var zm = cam.zoom;
            ctx.save();
            // plamy krwi na posadzce: płaskie elipsy, gasną po PlamaMs
            for (int i = 0; i < plamy.Length; i++)
            {
                ref var p = ref plamy[i];
                if (!p.jest) continue;
                var wiek = Math.Max(0, teraz - p.od);
                if (wiek >= U.PlamaMs) { p.jest = false; continue; }
                var a = 0.8 * (1 - Math.Max(0, (wiek - U.PlamaMs * 0.6) / (U.PlamaMs * 0.4)));
                var rr = p.r * zm * Math.Min(1, 0.4 + wiek / 250);
                ctx.fillStyle = Barwa.Rgba(70, 4, 2, a);
                ctx.beginPath(); ctx.ellipse(cam.toScreenX(p.x), cam.toScreenY(p.y), rr, Math.Max(0.8, rr * 0.28), 0, 0, Math.PI * 2); ctx.fill();
            }
            for (int i = 0; i < pula.Length; i++)
            {
                ref var c = ref pula[i];
                if (!c.jest || c.r == RodzajCzasteczki.Iskra) continue;
                var k = (teraz - c.od) / c.zyje;
                if (k < 0 || k >= 1) continue;
                double sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y);
                if (sx < -40 || sy < -40 || sx > cam.vw + 40 || sy > cam.vh + 40) continue;
                switch (c.r)
                {
                    case RodzajCzasteczki.Krew:
                        {
                            // kropla wydłużona w locie
                            var r = Math.Max(0.9, c.wielkosc * zm);
                            ctx.fillStyle = Barwa.Rgba(150, 12, 8, 0.95 * (1 - k * k));
                            ctx.beginPath(); ctx.ellipse(sx, sy, r, r * (1 + Math.Min(1.5, Math.Abs(c.vy) * 0.08)), Math.Atan2(c.vy, c.vx) - Math.PI / 2, 0, Math.PI * 2); ctx.fill();
                            break;
                        }
                    case RodzajCzasteczki.Pyl:
                        {
                            var r = c.wielkosc * zm * (0.6 + 1.2 * k);
                            ctx.fillStyle = Barwa.Rgba(150, 132, 112, 0.42 * (1 - k) * Math.Min(1, k * 8));
                            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
                            break;
                        }
                    case RodzajCzasteczki.Popiol:
                        {
                            var r = Math.Max(0.8, c.wielkosc * zm);
                            var a = 0.75 * Math.Min(1, k * 6) * (1 - k);
                            ctx.fillStyle = k < 0.3 ? Barwa.Rgba(255, 140, 60, a) : Barwa.Rgba(110, 100, 94, a);
                            ctx.fillRect(sx - r, sy - r * 0.6, r * 2, r * 1.2);
                            break;
                        }
                }
            }
            ctx.restore();
        }

        /// <summary>Iskry — addytywnie, po mapie świateł (świecą same).</summary>
        public static void RysujNad(IPlotno ctx, Camera cam, double teraz)
        {
            if (double.IsNaN(zegar)) return;
            var zm = cam.zoom;
            var jest = false;
            for (int i = 0; i < pula.Length; i++)
            {
                ref var c = ref pula[i];
                if (!c.jest || c.r != RodzajCzasteczki.Iskra) continue;
                var k = (teraz - c.od) / c.zyje;
                if (k < 0 || k >= 1) continue;
                if (!jest) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; jest = true; }
                double sx = cam.toScreenX(c.x), sy = cam.toScreenY(c.y);
                // smuga wzdłuż prędkości: krótka kreska, od żółtej bieli do czerwieni
                var dl = 0.035 * zm;
                ctx.strokeStyle = Barwa.Rgba(255, 230 - 120 * k, 150 - 120 * k, 1 - k);
                ctx.lineWidth = Math.Max(1, c.wielkosc * zm * (1 - 0.5 * k));
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - c.vx * dl, sy - c.vy * dl); ctx.stroke();
            }
            if (jest) ctx.restore();
        }
    }
}
