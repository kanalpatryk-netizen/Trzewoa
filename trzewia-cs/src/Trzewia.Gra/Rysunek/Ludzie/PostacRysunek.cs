// Oprawa, etap 7d: RYSUNEK nowej postaci ludzkiej (Postac.cs). Części ciała mają kształt mięśni (udo, łydka, biceps,
// przedramię), światło z góry z przodu i cień z tyłu, kreskowanie w cieniu jak na rycinie (od wzrostu 46 px), cienki
// kontur tuszem w barwie sepii — bez ciemnej obwódki wokół całej sylwetki (7a). Kończyna to jedna grupa kształtów
// z jednym wspólnym konturem (najpierw kontur wszystkich kształtów grupy, potem ich wypełnienie — stawy bez szwów).
// Kolejność: płaszcz, dalsza ręka (z tarczą), dalsza noga, bliższa noga, dół stroju, tułów, głowa, bliższa ręka
// z narzędziem. Rany żarłoka (Ludzik): brak ręki, nogi, głowy, połowa ciała, wypruty brzuch.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;

namespace Trzewia.Rysunek.Ludzie
{
    public static partial class Postac
    {
        // ── barwy ────────────────────────────────────────────────────────────────────────────────────────────
        internal struct K
        {
            public double r, g, b;
            public K(double r, double g, double b) { this.r = r; this.g = g; this.b = b; }
            public Barwa Styl(double m = 1, double a = 1) => Barwa.Rgba(Math.Min(255, r * m), Math.Min(255, g * m), Math.Min(255, b * m), a);
            public K Razy(double m) => new K(Math.Min(255, r * m), Math.Min(255, g * m), Math.Min(255, b * m));
            public K Do(K o, double t) => new K(r + (o.r - r) * t, g + (o.g - g) * t, b + (o.b - b) * t);
        }

        internal sealed class Barwy
        {
            public K skora = new K(186, 146, 116), wlosy = new K(58, 40, 30), odziez = new K(140, 100, 64), odziez2 = new K(112, 80, 52);
            public K kaptur = new K(112, 80, 52), nogi = new K(74, 60, 46), buty = new K(56, 42, 32), pas = new K(64, 46, 30);
            public K stal = new K(170, 170, 166), kolczuga = new K(118, 118, 116), plaszcz = new K(64, 56, 52), krzyz = new K(146, 30, 24);
            public K drewno = new K(112, 80, 48), zelazo = new K(104, 104, 102), lina = new K(170, 146, 100), stula = new K(138, 34, 28);
            public K wieniec = new K(88, 108, 58);
            /// <summary>długość brody 0…1.6 (0 — gładko ogolony)</summary>
            public double broda;
        }

        static readonly Dictionary<string, Barwy> barwy = new Dictionary<string, Barwy>();

        internal static Barwy BarwyStroju(Stroj s)
        {
            var klucz = s.rola + s.wzor;
            lock (barwy)
            {
                if (barwy.TryGetValue(klucz, out var b)) return b;
                b = new Barwy();
                switch (s.rola)
                {
                    case "robotnik":
                        // tuniki w barwach ziemi (barwa postaci jak w starych arkuszach: 3 rdzawa, 4 oliwkowa, 5 łupkowa, 7 brązowa, 8 czerwona)
                        b.odziez = s.wzor switch
                        {
                            3 => new K(150, 94, 52), 4 => new K(104, 102, 66), 5 => new K(90, 96, 100), 7 => new K(116, 84, 56), _ => new K(126, 62, 46),
                        };
                        b.odziez2 = b.odziez.Razy(0.8);
                        b.kaptur = s.wzor switch { 3 => new K(96, 78, 58), 4 => new K(120, 92, 60), 5 => new K(78, 66, 54), 7 => new K(90, 96, 72), _ => new K(98, 84, 64) };
                        b.wlosy = s.wzor == 5 ? new K(128, 120, 110) : s.wzor == 8 ? new K(96, 54, 30) : s.wzor == 4 ? new K(70, 50, 34) : new K(52, 38, 28);
                        b.broda = s.wzor switch { 3 => 0.8, 4 => 0.3, 5 => 1.2, 7 => 0.0, _ => 0.6 };
                        b.skora = s.wzor == 5 ? new K(178, 140, 114) : s.wzor == 7 ? new K(170, 128, 98) : new K(186, 146, 116);
                        break;
                    case "pobozny":
                        b.odziez = s.wzor == 2 ? new K(116, 100, 80) : new K(200, 190, 168);
                        b.odziez2 = b.odziez.Razy(0.86);
                        b.kaptur = b.odziez2;
                        b.lina = s.wzor == 2 ? new K(190, 178, 150) : new K(160, 134, 92);
                        b.wlosy = s.wzor == 2 ? new K(66, 52, 42) : new K(140, 130, 120);
                        b.broda = s.wzor == 2 ? 1.0 : 0;
                        b.skora = new K(184, 148, 120);
                        break;
                    case "rycerz":
                        b.odziez = new K(206, 198, 182); b.odziez2 = new K(172, 164, 150); b.wlosy = new K(72, 52, 38); b.broda = 0.2;
                        break;
                    case "zarlok":
                        b.skora = new K(176, 140, 116); b.wlosy = new K(46, 36, 30); b.odziez = b.skora; b.odziez2 = b.skora.Razy(0.9);
                        b.broda = 0.4;
                        break;
                    case "dante":
                        b.odziez = new K(138, 34, 30); b.odziez2 = new K(110, 26, 24); b.kaptur = b.odziez; b.skora = new K(190, 154, 126);
                        b.broda = 0; b.buty = new K(50, 34, 28);
                        break;
                    case "wergiliusz":
                        b.odziez = new K(190, 186, 172); b.odziez2 = new K(156, 152, 140); b.wlosy = new K(152, 146, 138); b.skora = new K(172, 140, 116);
                        b.broda = 1.4; b.buty = new K(110, 80, 52);
                        break;
                }
                barwy[klucz] = b;
                return b;
            }
        }

        // ── pędzel jednej postaci ───────────────────────────────────────────────────────────────────────────────
        sealed class Pedzel
        {
            public IPlotno ctx = null!;
            public double h, lw;
            /// <summary>0 — mała (bez szczegółów), 1 — średnia (twarz, pas, fałdy), 2 — duża (kreskowanie, kółka kolczugi)</summary>
            public int detal;
            public CanvasPattern? kreski, kolka;
        }

        static CanvasPattern? wzorKresek, wzorKolek;
        static bool kafleGotowe;

        /// <summary>Kreskowanie: wzór ukośnych kresek (6 px) i wzór kółek kolczugi (4 px) — raz na całą grę.</summary>
        static void Kafle(IPlotno ctx)
        {
            if (kafleGotowe) return;
            kafleGotowe = true;
            var k = Plotno.Nowe(6, 6);
            k.strokeStyle = "rgba(28,18,12,1)"; k.lineWidth = 0.8;
            k.beginPath(); k.moveTo(-1, 7); k.lineTo(7, -1); k.moveTo(-1, 1); k.lineTo(1, -1); k.moveTo(5, 7); k.lineTo(7, 5); k.stroke();
            wzorKresek = ctx.createPattern(k, "repeat");
            var o = Plotno.Nowe(4, 4);
            o.strokeStyle = "rgba(20,20,22,1)"; o.lineWidth = 0.7;
            o.beginPath(); o.arc(2, 2, 1.25, Math.PI * 0.05, Math.PI * 1.05); o.stroke();
            wzorKolek = ctx.createPattern(o, "repeat");
        }

        /// <summary>Kierunek KU światłu: z góry, z przodu (postać patrzy w prawo).</summary>
        const double LX = 0.5, LY = -0.866;
        /// <summary>Tusz konturu — nieprzezroczysty, bo kontur grupy to nakładające się kreski pod wypełnieniem.</summary>
        static readonly Barwa TUSZ = Barwa.Rgba(38, 26, 19, 1);

        static (double x, double y) Ku((double x, double y) a, (double x, double y) b, double t) => (a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        static (double x, double y) Plus((double x, double y) a, double dx, double dy) => (a.x + dx, a.y + dy);

        // ── kształty i grupy ────────────────────────────────────────────────────────────────────────────────────
        sealed class Ks
        {
            public readonly List<(double x, double y)> pkt = new List<(double x, double y)>(28);
            public bool gladko;
            public K kol;
            /// <summary>gradient od strony światła (g0) do strony cienia (g1)</summary>
            public (double x, double y) g0, g1;
            public bool kolczuga, kreski = true;
            public double sila = 1;
        }

        static void Sciezka(IPlotno ctx, Ks k)
        {
            var p = k.pkt;
            ctx.beginPath();
            if (!k.gladko || p.Count < 4)
            {
                ctx.moveTo(p[0].x, p[0].y);
                for (int i = 1; i < p.Count; i++) ctx.lineTo(p[i].x, p[i].y);
            }
            else
            {
                var n = p.Count;
                var m0 = Ku(p[n - 1], p[0], 0.5);
                ctx.moveTo(m0.x, m0.y);
                for (int i = 0; i < n; i++) { var m = Ku(p[i], p[(i + 1) % n], 0.5); ctx.quadraticCurveTo(p[i].x, p[i].y, m.x, m.y); }
            }
            ctx.closePath();
        }

        /// <summary>Gradient światła dla kształtu bez osi: wzdłuż kierunku światła przez prostokąt otaczający.</summary>
        static void SwiatloPola(Ks k)
        {
            double x0 = double.MaxValue, y0 = double.MaxValue, x1 = double.MinValue, y1 = double.MinValue;
            foreach (var q in k.pkt) { x0 = Math.Min(x0, q.x); y0 = Math.Min(y0, q.y); x1 = Math.Max(x1, q.x); y1 = Math.Max(y1, q.y); }
            double cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.Max(x1 - x0, y1 - y0) / 2 + 0.5;
            k.g0 = (cx + LX * r, cy + LY * r); k.g1 = (cx - LX * r, cy - LY * r);
        }

        static void Wypelnij(Pedzel P, Ks k)
        {
            var ctx = P.ctx;
            Sciezka(ctx, k);
            var g = ctx.createLinearGradient(k.g0.x, k.g0.y, k.g1.x, k.g1.y);
            g.addColorStop(0, k.kol.Styl(1 + 0.16 * k.sila)); g.addColorStop(0.45, k.kol.Styl()); g.addColorStop(1, k.kol.Styl(1 - 0.36 * k.sila));
            ctx.fillStyle = g; ctx.fill();
            if (P.detal < 2 || !(k.kolczuga && P.kolka != null || k.kreski && P.kreski != null)) return;
            double x0 = double.MaxValue, y0 = double.MaxValue, x1 = double.MinValue, y1 = double.MinValue;
            foreach (var q in k.pkt) { x0 = Math.Min(x0, q.x); y0 = Math.Min(y0, q.y); x1 = Math.Max(x1, q.x); y1 = Math.Max(y1, q.y); }
            ctx.save();
            ctx.clip();
            if (k.kolczuga && P.kolka != null)
            {
                ctx.globalAlpha = 0.5; ctx.fillStyle = P.kolka; ctx.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
            }
            if (k.kreski && P.kreski != null)
            {
                // kreskowanie tylko w cieniu: za linią w 3/5 drogi od światła do cienia
                double dx = k.g1.x - k.g0.x, dy = k.g1.y - k.g0.y, L = Math.Sqrt(dx * dx + dy * dy);
                if (L > 1e-6)
                {
                    dx /= L; dy /= L;
                    double ex = -dy, ey = dx, R = (x1 - x0 + y1 - y0) + 4;
                    var m = Ku(k.g0, k.g1, 0.58);
                    ctx.beginPath();
                    ctx.moveTo(m.x + ex * R, m.y + ey * R); ctx.lineTo(m.x - ex * R, m.y - ey * R);
                    ctx.lineTo(m.x - ex * R + dx * R, m.y - ey * R + dy * R); ctx.lineTo(m.x + ex * R + dx * R, m.y + ey * R + dy * R);
                    ctx.closePath(); ctx.clip();
                    // jasne tkaniny słabiej (inaczej wyglądają na pasiaste)
                    var jasnosc = (k.kol.r + k.kol.g + k.kol.b) / 3 / 255;
                    ctx.globalAlpha = 0.34 - 0.16 * jasnosc;
                    ctx.fillStyle = P.kreski; ctx.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
                }
            }
            ctx.restore();
        }

        /// <summary>Grupa kształtów z jednym konturem: kontur każdego kształtu pod wypełnieniem wszystkich.</summary>
        static void Grupa(Pedzel P, List<Ks> ks, double kontur = 1)
        {
            if (ks.Count == 0) return;
            var ctx = P.ctx;
            if (kontur > 0)
            {
                ctx.strokeStyle = TUSZ; ctx.lineWidth = P.lw * 2 * kontur;
                foreach (var k in ks) { Sciezka(ctx, k); ctx.stroke(); }
            }
            foreach (var k in ks) Wypelnij(P, k);
        }

        static void Jeden(Pedzel P, Ks k, double kontur = 1) { var l = new List<Ks>(1) { k }; Grupa(P, l, kontur); }

        // ── profile kończyn: (t, przód, tył) — t wzdłuż kości 0…1, szerokość po stronie przedniej i tylnej (ułamki wzrostu) ──
        static readonly double[] P_UDO = { 0, 0.046, 0.046, 0.3, 0.05, 0.042, 0.72, 0.04, 0.034, 1, 0.032, 0.03 };
        static readonly double[] P_PODUDZIE = { 0, 0.03, 0.031, 0.24, 0.026, 0.04, 0.6, 0.021, 0.027, 1, 0.017, 0.017 };
        static readonly double[] P_RAMIE = { 0, 0.032, 0.033, 0.42, 0.035, 0.03, 1, 0.025, 0.025 };
        static readonly double[] P_PRZEDRAMIE = { 0, 0.026, 0.028, 0.3, 0.027, 0.026, 1, 0.017, 0.018 };
        /// <summary>szeroki rękaw habitu i togi: rozszerza się ku nadgarstkowi</summary>
        static readonly double[] P_REKAW = { 0, 0.03, 0.032, 0.5, 0.036, 0.04, 1, 0.044, 0.05 };
        static readonly double[] P_SZYJA = { 0, 0.03, 0.032, 1, 0.024, 0.026 };

        /// <summary>
        /// Kształt kończyny od A do B według profilu, z zaokrąglonymi końcami. „Przód” kości to strona, w którą zgina się
        /// staw (dla kości w dół — +x). `gr` — mnożnik grubości (żarłok tłusty).
        /// </summary>
        static Ks Konczyna(Pedzel P, (double x, double y) A, (double x, double y) B, double[] prof, double gr, K kol, bool kolczuga = false)
        {
            var k = new Ks { kol = kol, kolczuga = kolczuga };
            double dx = B.x - A.x, dy = B.y - A.y, L = Math.Sqrt(dx * dx + dy * dy);
            if (L < 1e-6) { dx = 0; dy = 1; L = 1e-6; } else { dx /= L; dy /= L; }
            // przód: kierunek kości obrócony o −90° (kość w dół → przód w +x)
            double fx = dy, fy = -dx;
            var h = P.h * gr;
            int n = prof.Length / 3;
            for (int i = 0; i < n; i++)
            {
                double t = prof[i * 3], w = prof[i * 3 + 1] * h;
                k.pkt.Add((A.x + dx * L * t + fx * w, A.y + dy * L * t + fy * w));
            }
            // koniec B: półkole od przodu do tyłu
            {
                double wp = prof[(n - 1) * 3 + 1] * h, wt = prof[(n - 1) * 3 + 2] * h, r = (wp + wt) / 2, s = (wp - wt) / 2;
                double cx = B.x + fx * s, cy = B.y + fy * s;
                for (int j = 1; j < 6; j++)
                {
                    var th = Math.PI * j / 6;
                    k.pkt.Add((cx + r * (fx * Math.Cos(th) + dx * Math.Sin(th)), cy + r * (fy * Math.Cos(th) + dy * Math.Sin(th))));
                }
            }
            for (int i = n - 1; i >= 0; i--)
            {
                double t = prof[i * 3], w = prof[i * 3 + 2] * h;
                k.pkt.Add((A.x + dx * L * t - fx * w, A.y + dy * L * t - fy * w));
            }
            {
                double wp = prof[1] * h, wt = prof[2] * h, r = (wp + wt) / 2, s = (wp - wt) / 2;
                double cx = A.x + fx * s, cy = A.y + fy * s;
                for (int j = 1; j < 6; j++)
                {
                    var th = Math.PI + Math.PI * j / 6;
                    k.pkt.Add((cx + r * (fx * Math.Cos(th) + dx * Math.Sin(th)), cy + r * (fy * Math.Cos(th) + dy * Math.Sin(th))));
                }
            }
            // światło w poprzek kości (walec): od strony bliższej światłu
            double nx = fx, ny = fy;
            if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
            var sr = Ku(A, B, 0.5);
            var wmax = 0.05 * h;
            k.g0 = (sr.x + nx * wmax, sr.y + ny * wmax); k.g1 = (sr.x - nx * wmax, sr.y - ny * wmax);
            return k;
        }

        static Ks Wielokat(IList<(double x, double y)> pkt, K kol, bool gladko = true, bool kolczuga = false)
        {
            var k = new Ks { kol = kol, gladko = gladko, kolczuga = kolczuga };
            k.pkt.AddRange(pkt);
            SwiatloPola(k);
            return k;
        }

        static Ks Elipsa((double x, double y) c, double rx, double ry, double obrot, K kol, int n = 14)
        {
            var k = new Ks { kol = kol };
            double cs = Math.Cos(obrot), sn = Math.Sin(obrot);
            for (int i = 0; i < n; i++)
            {
                var a = Math.PI * 2 * i / n;
                double x = Math.Cos(a) * rx, y = Math.Sin(a) * ry;
                k.pkt.Add((c.x + x * cs - y * sn, c.y + x * sn + y * cs));
            }
            SwiatloPola(k);
            return k;
        }

        static void Kreska(Pedzel P, (double x, double y) a, (double x, double y) b, Barwa kol, double grubosc)
        {
            var ctx = P.ctx;
            ctx.strokeStyle = kol; ctx.lineWidth = grubosc;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // ── tułów w układzie własnym: u wzdłuż (0 — biodra, 1 — kark), v w poprzek (+ — przód), w ułamkach wzrostu ──
        static (double x, double y) WTulowiu(in PunktyPostaci q, double h, double u, double v)
        {
            double ax = q.kark.x - q.biodro.x, ay = q.kark.y - q.biodro.y;
            var L = Math.Sqrt(ax * ax + ay * ay); if (L < 1e-6) L = 1e-6;
            double ux = ax / L, uy = ay / L;
            double px = -uy, py = ux;
            return (q.biodro.x + ax * u + px * v * h, q.biodro.y + ay * u + py * v * h);
        }

        static readonly (double u, double v)[] T_PLECY = { (-0.07, -0.064), (0.08, -0.068), (0.32, -0.06), (0.62, -0.064), (0.84, -0.058), (0.98, -0.034) };
        static readonly (double u, double v)[] T_PRZOD = { (0.99, 0.028), (0.86, 0.066), (0.68, 0.072), (0.46, 0.062), (0.24, 0.064), (0.04, 0.066), (-0.08, 0.058) };

        /// <summary>
        /// Rysuje postać: stopy w (0, 0), wzrost `h` (piksele), twarzą w prawo. Zwraca punkty ciała. `rany` — żarłok (Ludzik):
        /// bez kończyn, bez głowy, połowa ciała, wypruty brzuch.
        /// </summary>
        public static PunktyPostaci Rysuj(IPlotno ctx, double h, in Poza p, in Rekwizyty r, Stroj s, in Rany rany = default)
        {
            var P = NowyPedzel(ctx, h, s);
            var q = Punkty(p, h);
            var b = BarwyStroju(s);
            ctx.save();
            // piruet: w lustrze (twarzą w lewo) — punkty zwracane też odbite
            var lustro = p.odwrot >= 0.5;
            if (lustro) ctx.scale(-1, 1);
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            bool gora = rany.polowa != "dol", dol = rany.polowa != "gora";
            var tarcza = r.tarcza ?? s.Tarcza;
            // na ziemi: latarnia (grabarz przy pracy), świeca (modlitwa)
            if (r.lampa == 2) q.lampa = Latarnia(P, (r.lampaX * h, 0), true);
            if (r.swieca) q.swieca = Swieca(P, (r.swiecaX * h, 0));
            if (s.rola == "rycerz" && gora) Plaszcz(P, q, p, b);
            if (gora && r.worek) Worek(P, q, p, b);
            if (gora) { if (rany.bezRekiL) Kikut(P, q.barkL, q.lokiecL, 0.06, b, 0.8); else Reka(P, q, p, s, b, false, r); }
            if (gora && tarcza) Tarcza(P, q, p, b);
            if (dol && r.pochwa) Pochwa(P, q, b);
            if (dol) { if (rany.bezNogiL) Kikut(P, q.biodro, q.kolanoL, 0.085, b, 0.8); else Noga(P, q, p, s, b, false); }
            if (dol) { if (rany.bezNogiP) Kikut(P, q.biodro, q.kolanoP, 0.085, b, 1); else Noga(P, q, p, s, b, true); }
            if (dol) DolStroju(P, q, p, s, b);
            if (gora) Tulow(P, q, p, s, b, rany);
            else Rozdarcie(P, q, b, true);
            if (rany.polowa == "gora") Rozdarcie(P, q, b, false);
            if (gora && !rany.bezGlowy) Glowa(P, q, p, s, b);
            else if (gora) Kikut(P, q.kark, q.glowa, 0.055, b, 1);
            // latarnia w dalszej dłoni: wisi pod dłonią, przed postacią; albo u pasa (wspina się, wisi, spada)
            if (gora && r.lampa == 1 && !rany.bezRekiL) q.lampa = Latarnia(P, q.dlonL, false);
            if (gora && r.lampa == 3) q.lampa = Latarnia(P, WTulowiu(q, h, 0.1, 0.075), false);
            if (gora && !rany.bezRekiP)
            {
                var katP = KatPrzedramienia(p, true) + p.dlonP + r.katP;
                (double x, double y) czubek = q.dlonP;
                if (r.wP != Narzedzie.Brak && r.wP != Narzedzie.Ksiega) czubek = NarzedzieW(P, q.dlonP, katP, r.wP, b);
                Reka(P, q, p, s, b, true, r);
                if (r.wP == Narzedzie.Ksiega) q.ksiega = Ksiega(P, q.dlonP, katP, r.otwarta, r.blask);
                if (r.wP == Narzedzie.Grzyb) Grzyb(P, q.dlonP, katP);
                q.czubek = czubek;
            }
            else if (gora) Kikut(P, q.barkP, q.lokiecP, 0.06, b, 1);
            if (gora && !rany.bezRekiL && r.wL == Narzedzie.Ksiega) q.ksiega = Ksiega(P, q.dlonL, KatPrzedramienia(p, false) + p.dlonL + r.katL, r.otwarta, r.blask);
            ctx.restore();
            if (lustro) q = Odbij(q);
            return q;
        }

        /// <summary>Punkty postaci w lustrze (x → −x).</summary>
        static PunktyPostaci Odbij(PunktyPostaci q)
        {
            static (double x, double y) o((double x, double y) a) => (-a.x, a.y);
            q.biodro = o(q.biodro); q.kark = o(q.kark); q.glowa = o(q.glowa); q.barkL = o(q.barkL); q.barkP = o(q.barkP);
            q.lokiecL = o(q.lokiecL); q.lokiecP = o(q.lokiecP); q.dlonL = o(q.dlonL); q.dlonP = o(q.dlonP);
            q.kolanoL = o(q.kolanoL); q.kolanoP = o(q.kolanoP); q.kostkaL = o(q.kostkaL); q.kostkaP = o(q.kostkaP);
            q.pietaL = o(q.pietaL); q.pietaP = o(q.pietaP); q.palceL = o(q.palceL); q.palceP = o(q.palceP);
            q.czubek = o(q.czubek); q.lampa = o(q.lampa); q.swieca = o(q.swieca); q.ksiega = o(q.ksiega);
            return q;
        }

        static double KatPrzedramienia(in Poza p, bool blizsza) => blizsza ? p.ramieP + p.lokiecP : p.ramieL + p.lokiecL;

        // ── ręka ────────────────────────────────────────────────────────────────────────────────────────────────
        static void Reka(Pedzel P, in PunktyPostaci q, in Poza p, Stroj s, Barwy b, bool blizsza, in Rekwizyty r)
        {
            var h = P.h;
            var bark = blizsza ? q.barkP : q.barkL; var lok = blizsza ? q.lokiecP : q.lokiecL; var dl = blizsza ? q.dlonP : q.dlonL;
            var c = blizsza ? 1.0 : 0.78;
            bool szata = s.rola == "pobozny" || s.rola == "dante" || s.rola == "wergiliusz";
            bool kolcz = s.rola == "rycerz";
            var gr = s.rola == "zarlok" ? 1.25 : 1.0;
            K rekaw = kolcz ? b.kolczuga : s.rola == "zarlok" ? b.skora : b.odziez;
            K przedr = kolcz ? b.kolczuga : szata ? b.odziez : b.skora;
            var grupa = new List<Ks>(4);
            var katDl = KatPrzedramienia(p, blizsza) + (blizsza ? p.dlonP : p.dlonL);
            // dłoń (rycerz w rękawicy kolczej); trzyma narzędzie — pięść
            var chwyt = blizsza ? r.wP != Narzedzie.Brak : r.wL != Narzedzie.Brak;
            grupa.Add(Dlon(P, dl, katDl, (kolcz ? b.kolczuga.Razy(0.92) : b.skora).Razy(c), chwyt));
            if (szata) grupa.Add(Konczyna(P, lok, Ku(lok, dl, 0.86), P_REKAW, 1, przedr.Razy(c)));
            else grupa.Add(Konczyna(P, lok, dl, P_PRZEDRAMIE, gr, przedr.Razy(c), kolcz));
            grupa.Add(Konczyna(P, bark, lok, P_RAMIE, gr, rekaw.Razy(c), kolcz));
            Grupa(P, grupa);
            // robotnik: brzeg rękawa tuniki tuż za łokciem
            if (s.rola == "robotnik" && P.detal >= 1)
            {
                var a = Ku(lok, dl, 0.12);
                double dx = dl.x - lok.x, dy = dl.y - lok.y, L = Math.Sqrt(dx * dx + dy * dy) + 1e-6;
                Kreska(P, (a.x + dy / L * 0.03 * h, a.y - dx / L * 0.03 * h), (a.x - dy / L * 0.03 * h, a.y + dx / L * 0.03 * h), TUSZ, P.lw);
            }
            if (s.Naramienniki)
            {
                // naramiennik: wypukła blacha na barku
                var a = Ku(bark, lok, -0.18); var e = Ku(bark, lok, 0.42);
                Jeden(P, Konczyna(P, a, e, new[] { 0, 0.04, 0.042, 0.5, 0.046, 0.044, 1, 0.034, 0.036 }, 1, b.stal.Razy(c)));
            }
            if (s.Napiersnik && P.detal >= 1)
            {
                // karwasz na przedramieniu
                Jeden(P, Konczyna(P, Ku(lok, dl, 0.25), Ku(lok, dl, 0.85), new[] { 0, 0.026, 0.028, 1, 0.02, 0.021 }, 1, b.stal.Razy(c * 0.95)));
            }
        }

        /// <summary>Dłoń: wnętrze i kciuk; pięść, gdy trzyma narzędzie. `kat` — kierunek przedramienia z nadgarstkiem.</summary>
        static Ks Dlon(Pedzel P, (double x, double y) dl, double kat, K kol, bool piesc)
        {
            var h = P.h;
            double sx = Math.Sin(kat), sy = Math.Cos(kat);     // wzdłuż dłoni
            double fx = sy, fy = -sx;                          // przód dłoni (kciuk)
            var k = new Ks { kol = kol, gladko = true };
            double dlug = (piesc ? 0.038 : 0.055) * h, szer = (piesc ? 0.026 : 0.022) * h;
            void d(double t, double w) => k.pkt.Add((dl.x + sx * t * dlug + fx * w * szer, dl.y + sy * t * dlug + fy * w * szer));
            // nadgarstek → wnętrze → palce → kciuk
            d(-0.1, -0.85); d(0.35, -1.05); d(0.8, -0.95); d(1.05, -0.4); d(1.0, 0.3); d(0.7, 0.85);
            d(0.55, 1.35); d(0.3, 1.25); d(0.15, 0.9); d(-0.1, 0.8);
            SwiatloPola(k);
            return k;
        }

        // ── noga ────────────────────────────────────────────────────────────────────────────────────────────────
        static void Noga(Pedzel P, in PunktyPostaci q, in Poza p, Stroj s, Barwy b, bool blizsza)
        {
            var h = P.h;
            var kol = blizsza ? q.kolanoP : q.kolanoL; var kos = blizsza ? q.kostkaP : q.kostkaL;
            var pie = blizsza ? q.pietaP : q.pietaL; var pal = blizsza ? q.palceP : q.palceL;
            var c = blizsza ? 1.0 : 0.76;
            var biodro = (q.biodro.x + (blizsza ? 0.012 : -0.012) * h, q.biodro.y - 0.01 * h);
            K udo, pod, but;
            bool kolcz = false, bosa = false;
            switch (s.rola)
            {
                case "rycerz": udo = b.kolczuga; pod = b.kolczuga; but = b.buty; kolcz = true; break;
                case "zarlok": udo = b.skora; pod = b.skora; but = b.skora; bosa = true; break;
                case "wergiliusz": udo = b.skora; pod = b.skora; but = b.buty; bosa = true; break;
                case "dante": udo = new K(96, 30, 26); pod = udo; but = b.buty; break;
                default: udo = b.nogi; pod = b.nogi; but = b.buty; break;
            }
            var gr = s.rola == "zarlok" ? 1.22 : 1.0;
            var grupa = new List<Ks>(3)
            {
                Stopa(P, kos, pie, pal, but.Razy(c), bosa),
                Konczyna(P, kol, kos, P_PODUDZIE, gr, pod.Razy(c), kolcz),
                Konczyna(P, biodro, kol, P_UDO, gr, udo.Razy(c), kolcz),
            };
            Grupa(P, grupa);
            if (s.rola == "robotnik" && P.detal >= 1)
            {
                // owijacze na łydkach
                double dx = kos.x - kol.x, dy = kos.y - kol.y, L = Math.Sqrt(dx * dx + dy * dy) + 1e-6;
                for (int i = 0; i < 3; i++)
                {
                    var a = Ku(kol, kos, 0.36 + i * 0.2);
                    var w = (0.03 - i * 0.004) * h;
                    Kreska(P, (a.x + dy / L * w, a.y - dx / L * w - 0.008 * h), (a.x - dy / L * w, a.y + dx / L * w + 0.008 * h), Barwa.Rgba(34, 24, 18, 0.5), P.lw * 0.9);
                }
            }
            if (s.rola == "zarlok" && P.detal >= 1)
            {
                // błoto do pół łydki (żarłocy leżą i brodzą w błocie)
                var ctx = P.ctx;
                double dx = kos.x - kol.x, dy = kos.y - kol.y, L = Math.Sqrt(dx * dx + dy * dy) + 1e-6;
                var w = 0.04 * h;
                var a0 = Ku(kol, kos, 0.35);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(a0.x + dy / L * w, a0.y - dx / L * w); ctx.lineTo(kos.x + dy / L * w, kos.y - dx / L * w);
                ctx.lineTo(pal.x + 0.01 * h, pal.y + 0.004 * h); ctx.lineTo(pie.x - 0.01 * h, pie.y + 0.004 * h);
                ctx.lineTo(kos.x - dy / L * w, kos.y + dx / L * w); ctx.lineTo(a0.x - dy / L * w, a0.y + dx / L * w); ctx.closePath();
                var g = ctx.createLinearGradient(a0.x, a0.y, kos.x, kos.y);
                g.addColorStop(0, Barwa.Rgba(70, 54, 38, 0)); g.addColorStop(0.5, Barwa.Rgba(70, 54, 38, 0.5 * c + 0.3 * p.bloto)); g.addColorStop(1, Barwa.Rgba(58, 44, 30, 0.85));
                ctx.fillStyle = g; ctx.fill();
                ctx.restore();
            }
            if (s.rola == "wergiliusz" && P.detal >= 1)
            {
                // rzemienie sandałów na kostce
                var a = Ku(kol, kos, 0.82);
                Kreska(P, (a.x - 0.02 * h, a.y), (a.x + 0.02 * h, a.y - 0.008 * h), Barwa.Rgba(90, 60, 36, 0.9), P.lw * 1.2);
            }
            if (s.Nakolanniki)
            {
                // nakolannik: kopułka na przodzie kolana
                double dx = kos.x - kol.x, dy = kos.y - kol.y, L = Math.Sqrt(dx * dx + dy * dy) + 1e-6;
                var c0 = (kol.x + dy / L * 0.022 * h, kol.y - dx / L * 0.022 * h);
                Jeden(P, Elipsa(c0, 0.03 * h, 0.036 * h, Math.Atan2(dy, dx), b.stal.Razy(c), 12));
            }
        }

        /// <summary>Stopa (but albo bosa): od pięty do palców, z podbiciem do kostki.</summary>
        static Ks Stopa(Pedzel P, (double x, double y) kos, (double x, double y) pie, (double x, double y) pal, K kol, bool bosa)
        {
            var h = P.h;
            double dx = pal.x - pie.x, dy = pal.y - pie.y, L = Math.Sqrt(dx * dx + dy * dy) + 1e-6;
            double ux = dx / L, uy = dy / L, nx = uy, ny = -ux;     // n — w górę od podeszwy
            var gr = (bosa ? 0.03 : 0.036) * h;
            var k = new Ks { kol = kol, gladko = true };
            k.pkt.Add(Plus(pie, -ux * 0.006 * h + nx * 0.004 * h, -uy * 0.006 * h + ny * 0.004 * h));
            k.pkt.Add(Plus(pie, ux * L * 0.25, uy * L * 0.25));
            k.pkt.Add(Plus(pal, -ux * L * 0.08, -uy * L * 0.08));
            k.pkt.Add(Plus(pal, ux * 0.006 * h + nx * gr * 0.35, uy * 0.006 * h + ny * gr * 0.35));
            k.pkt.Add(Plus(pal, -ux * L * 0.22 + nx * gr * 0.85, -uy * L * 0.22 + ny * gr * 0.85));
            k.pkt.Add(Plus(kos, ux * 0.022 * h, uy * 0.022 * h));
            k.pkt.Add(Plus(kos, -ux * 0.012 * h - nx * 0.01 * h, -uy * 0.012 * h - ny * 0.01 * h));
            k.pkt.Add(Plus(kos, -ux * 0.026 * h - nx * 0.003 * h, -uy * 0.026 * h - ny * 0.003 * h));
            k.pkt.Add(Plus(pie, -ux * 0.012 * h + nx * gr * 0.45, -uy * 0.012 * h + ny * gr * 0.45));
            SwiatloPola(k);
            return k;
        }

        static void Kikut(Pedzel P, (double x, double y) a, (double x, double y) b0, double w, Barwy b, double c)
        {
            var h = P.h;
            var k = Ku(a, b0, 0.4);
            Jeden(P, Konczyna(P, a, k, new[] { 0, w * 0.5, w * 0.5, 1, w * 0.45, w * 0.45 }, 1, b.skora.Razy(0.92 * c)));
            var ctx = P.ctx;
            ctx.beginPath(); ctx.ellipse(k.x, k.y, w * 0.46 * h, w * 0.3 * h, Math.Atan2(k.y - a.y, k.x - a.x) + Math.PI / 2, 0, Math.PI * 2);
            ctx.fillStyle = Barwa.Rgba(132, 18, 14, 1); ctx.fill();
            ctx.fillStyle = Barwa.Rgba(214, 196, 176, 0.9); ctx.beginPath(); ctx.arc(k.x, k.y, w * 0.12 * h, 0, Math.PI * 2); ctx.fill();
        }

        // ── tułów i strój ───────────────────────────────────────────────────────────────────────────────────
        static void Tulow(Pedzel P, in PunktyPostaci q, in Poza p, Stroj s, Barwy b, in Rany rany)
        {
            var h = P.h;
            double brzuch = s.rola == "zarlok" ? 0.55 + 0.45 * p.brzuch : 0;
            double szata = s.rola == "pobozny" || s.rola == "wergiliusz" || s.rola == "dante" ? 1.08 : 1;
            double piers = s.rola == "rycerz" ? 1.08 : 1;
            var pkt = new List<(double x, double y)>(16);
            foreach (var (u, v) in T_PLECY) pkt.Add(WTulowiu(q, h, u, v * szata * (1 + brzuch * 0.25)));
            foreach (var (u, v0) in T_PRZOD)
            {
                var v = v0 * szata * (u > 0.55 ? piers : 1) * (1 + brzuch * 0.2);
                if (brzuch > 0 && u > 0.02 && u < 0.64) v += 0.08 * brzuch * Math.Sin((u - 0.02) / 0.62 * Math.PI);
                pkt.Add(WTulowiu(q, h, u, v));
            }
            var grupa = new List<Ks>(3);
            K kol = s.rola == "zarlok" ? b.skora : s.rola == "rycerz" ? b.kolczuga : b.odziez;
            grupa.Add(Wielokat(pkt, kol, true, s.rola == "rycerz"));
            // szyja w tej samej grupie (płynnie przechodzi w tułów)
            var szyjaKol = s.rola == "rycerz" ? b.kolczuga : b.skora;
            grupa.Add(Konczyna(P, WTulowiu(q, h, 0.93, 0.012), Ku(q.kark, q.glowa, 0.62), P_SZYJA, s.rola == "zarlok" ? 1.35 : 1, szyjaKol, s.rola == "rycerz"));
            Grupa(P, grupa);
            if (s.rola == "rycerz")
            {
                // wapenrok na kolczudze: od barków do pasa, biały z czerwonym krzyżem
                var wap = new List<(double x, double y)>(12);
                foreach (var (u, v) in T_PLECY) if (u <= 0.9) wap.Add(WTulowiu(q, h, u, v * 0.97));
                foreach (var (u, v) in T_PRZOD) if (u <= 0.9) wap.Add(WTulowiu(q, h, u, v * 0.97 * (u > 0.55 ? piers : 1)));
                Jeden(P, Wielokat(wap, b.odziez));
                if (s.Napiersnik)
                {
                    var nap = new[] { WTulowiu(q, h, 0.4, -0.04), WTulowiu(q, h, 0.86, -0.045), WTulowiu(q, h, 0.86, 0.068), WTulowiu(q, h, 0.66, 0.082), WTulowiu(q, h, 0.42, 0.068) };
                    Jeden(P, Wielokat(nap, b.stal));
                }
                if (P.detal >= 1)
                {
                    // krzyż na piersi (z profilu: pół krzyża od przodu)
                    var kk = b.krzyz.Styl();
                    var gr = Math.Max(1, 0.024 * h);
                    if (!s.Napiersnik)
                    {
                        Kreska(P, WTulowiu(q, h, 0.82, 0.04), WTulowiu(q, h, 0.36, 0.04), kk, gr);
                        Kreska(P, WTulowiu(q, h, 0.68, -0.02), WTulowiu(q, h, 0.68, 0.072), kk, gr);
                    }
                    else Kreska(P, WTulowiu(q, h, 0.36, 0.04), WTulowiu(q, h, 0.2, 0.04), kk, gr);
                }
                // czepiec kolczy spływa z głowy na barki (pod hełmem też)
                var kapt = new[] { WTulowiu(q, h, 1.12, -0.05), WTulowiu(q, h, 0.86, -0.07), WTulowiu(q, h, 0.8, 0.0), WTulowiu(q, h, 0.86, 0.06), WTulowiu(q, h, 1.08, 0.045) };
                Jeden(P, Wielokat(kapt, b.kolczuga, true, true));
            }
            // pas: rzemień, u mnicha sznur
            if (s.rola != "zarlok" && P.detal >= 1)
            {
                var pasK = s.rola == "pobozny" ? b.lina : s.rola == "dante" ? new K(70, 40, 26) : b.pas;
                var gr = (s.rola == "pobozny" ? 0.016 : 0.024) * h;
                Kreska(P, WTulowiu(q, h, 0.12, -0.066 * szata), WTulowiu(q, h, 0.12, 0.068 * szata), TUSZ, gr + P.lw * 2);
                Kreska(P, WTulowiu(q, h, 0.12, -0.066 * szata), WTulowiu(q, h, 0.12, 0.068 * szata), pasK.Styl(), gr);
                if (s.rola == "pobozny")
                {
                    var a = WTulowiu(q, h, 0.12, 0.05); var c = (a.x + 0.014 * h, a.y + 0.2 * h);
                    Kreska(P, a, c, TUSZ, 0.011 * h + P.lw * 2);
                    Kreska(P, a, c, b.lina.Styl(0.95), 0.011 * h);
                    if (P.detal >= 2) for (int i = 1; i <= 3; i++) { var k = Ku(a, c, i * 0.28); P.ctx.fillStyle = b.lina.Styl(0.78); P.ctx.beginPath(); P.ctx.arc(k.x, k.y, 0.011 * h, 0, Math.PI * 2); P.ctx.fill(); }
                }
                if (s.rola == "robotnik")
                {
                    // sakiewka u pasa
                    var a = WTulowiu(q, h, 0.06, -0.05);
                    Jeden(P, Elipsa((a.x, a.y + 0.02 * h), 0.022 * h, 0.03 * h, 0.2, b.pas.Razy(1.2), 10));
                }
            }
            if (s.rola == "pobozny" && s.wzor != 2 && P.detal >= 1)
            {
                // czerwona stuła przez ramię
                Kreska(P, WTulowiu(q, h, 0.97, 0.03), WTulowiu(q, h, 0.22, 0.062), TUSZ, 0.026 * h);
                Kreska(P, WTulowiu(q, h, 0.97, 0.03), WTulowiu(q, h, 0.22, 0.062), b.stula.Styl(), 0.02 * h);
            }
            if (s.rola == "wergiliusz" && P.detal >= 1)
            {
                // fałd togi zarzuconej przez ramię
                var tog = new[] { WTulowiu(q, h, 1.0, -0.05), WTulowiu(q, h, 0.98, 0.02), WTulowiu(q, h, 0.55, 0.08), WTulowiu(q, h, 0.2, 0.075), WTulowiu(q, h, 0.36, 0.0), WTulowiu(q, h, 0.8, -0.07) };
                Jeden(P, Wielokat(tog, b.odziez2));
            }
            // kaptur zsunięty na plecy (mnich) i kołnierz kaptura (grabarz bez hełmu, Dante)
            if (s.rola == "pobozny")
            {
                var kp = new[] { WTulowiu(q, h, 1.04, -0.02), WTulowiu(q, h, 1.02, -0.07), WTulowiu(q, h, 0.82, -0.09), WTulowiu(q, h, 0.7, -0.06), WTulowiu(q, h, 0.8, -0.01), WTulowiu(q, h, 0.92, 0.03) };
                Jeden(P, Wielokat(kp, b.kaptur));
            }
            else if (s.rola == "robotnik" && !s.helm || s.rola == "dante")
            {
                var kp = new[] { WTulowiu(q, h, 1.06, -0.04), WTulowiu(q, h, 0.92, -0.075), WTulowiu(q, h, 0.78, -0.07), WTulowiu(q, h, 0.74, 0.0), WTulowiu(q, h, 0.8, 0.07), WTulowiu(q, h, 0.96, 0.055), WTulowiu(q, h, 1.04, 0.03) };
                Jeden(P, Wielokat(kp, b.kaptur));
            }
            if (s.rola == "zarlok") Brud(P, pkt, p);
            if (rany.trzewia)
            {
                var c = WTulowiu(q, h, 0.32, 0.07);
                P.ctx.fillStyle = Barwa.Rgba(124, 16, 12, 1); P.ctx.beginPath(); P.ctx.ellipse(c.x, c.y, 0.05 * h, 0.075 * h, 0, 0, Math.PI * 2); P.ctx.fill();
                Trzewia(P.ctx, c.x + 0.03 * h, c.y + 0.02 * h, h * 0.55, 0.3);
            }
        }

        /// <summary>
        /// Strój od pasa w dół: tunika do pół uda (grabarz), habit i toga do kostek, wapenrok do kolan (rycerz). Kształt to
        /// obrys wypukły pasa i nóg do rąbka — materiał spada prosto z bioder i przez wysunięte kolano, nie wydyma się.
        /// </summary>
        static void DolStroju(Pedzel P, in PunktyPostaci q, in Poza p, Stroj s, Barwy b)
        {
            var h = P.h;
            double dlug = s.rola switch { "robotnik" => 0.62, "rycerz" => 0.92, "pobozny" => 1.8, "dante" => 1.82, "wergiliusz" => 1.7, _ => 0 };
            if (dlug <= 0) { if (s.rola == "zarlok") Przepaska(P, q); return; }
            double szata = s.rola == "pobozny" || s.rola == "wergiliusz" || s.rola == "dante" ? 1.08 : 1;
            var pas0 = WTulowiu(q, h, 0.16, -0.066 * szata); var pas1 = WTulowiu(q, h, 0.16, 0.068 * szata);
            var biodro = q.biodro;
            var szer = (s.rola == "robotnik" ? 0.05 : s.rola == "rycerz" ? 0.05 : 0.058) * h;
            var pkt = new List<(double x, double y)>(16) { pas0, pas1, WTulowiu(q, h, -0.04, -0.07 * szata), WTulowiu(q, h, -0.02, 0.07 * szata) };
            // długa szata: rąbek nad ziemią, nie niżej niż tuż nad stopą
            var minY = dlug > 1.2 ? -0.03 * h : double.MaxValue;
            void noga((double x, double y) kol, (double x, double y) kos)
            {
                (double x, double y) rabek;
                if (dlug <= 1) rabek = Ku(biodro, kol, dlug);
                else
                {
                    pkt.Add((kol.x + szer * 0.9, kol.y)); pkt.Add((kol.x - szer * 0.9, kol.y));
                    rabek = Ku(kol, kos, Math.Min(1.05, dlug - 1));
                }
                var y = Math.Min(rabek.y, minY);
                pkt.Add((rabek.x + szer, y)); pkt.Add((rabek.x - szer, y));
            }
            noga(q.kolanoL, q.kostkaL);
            noga(q.kolanoP, q.kostkaP);
            var obrys = Obrys(pkt);
            Jeden(P, Wielokat(obrys, b.odziez));
            if (P.detal >= 1 && obrys.Count >= 4)
            {
                // fałdy od pasa do rąbka (do najniższych punktów obrysu)
                var dol = new List<(double x, double y)>(obrys);
                dol.Sort((a, c) => c.y.CompareTo(a.y));
                var r0 = dol[0]; var r1 = dol[1];
                if (r0.x > r1.x) (r0, r1) = (r1, r0);
                for (int i = 0; i < 3; i++)
                {
                    var a = Ku(pas0, pas1, 0.25 + i * 0.25);
                    var c = Ku(r0, r1, 0.2 + i * 0.3);
                    Kreska(P, Ku(a, c, 0.3), Ku(a, c, 0.95), Barwa.Rgba(30, 20, 14, 0.3), P.lw * 0.9);
                }
                if (s.rola == "rycerz") Kreska(P, Ku(Ku(pas0, pas1, 0.55), Ku(r0, r1, 0.5), 0.3), Ku(r0, r1, 0.5), Barwa.Rgba(30, 20, 14, 0.5), P.lw);
            }
        }

        /// <summary>Obrys wypukły punktów (łańcuch monotoniczny), w kolejności obiegu.</summary>
        static List<(double x, double y)> Obrys(List<(double x, double y)> pkt)
        {
            var p = new List<(double x, double y)>(pkt);
            p.Sort((a, b) => a.x != b.x ? a.x.CompareTo(b.x) : a.y.CompareTo(b.y));
            if (p.Count < 3) return p;
            static double krzyz((double x, double y) o, (double x, double y) a, (double x, double y) b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
            var w = new List<(double x, double y)>(p.Count * 2);
            foreach (var q in p) { while (w.Count >= 2 && krzyz(w[w.Count - 2], w[w.Count - 1], q) <= 0) w.RemoveAt(w.Count - 1); w.Add(q); }
            var dolna = w.Count + 1;
            for (int i = p.Count - 2; i >= 0; i--) { var q = p[i]; while (w.Count >= dolna && krzyz(w[w.Count - 2], w[w.Count - 1], q) <= 0) w.RemoveAt(w.Count - 1); w.Add(q); }
            w.RemoveAt(w.Count - 1);
            return w;
        }

        static void Przepaska(Pedzel P, in PunktyPostaci q)
        {
            var h = P.h;
            var pkt = new[] { WTulowiu(q, h, 0.18, -0.07), WTulowiu(q, h, 0.18, 0.072), WTulowiu(q, h, -0.1, 0.07), WTulowiu(q, h, -0.16, 0.0), WTulowiu(q, h, -0.12, -0.066) };
            Jeden(P, Wielokat(pkt, new K(92, 76, 58)), 0.9);
        }

        static void Brud(Pedzel P, List<(double x, double y)> tul, in Poza p)
        {
            if (P.detal < 1) return;
            var ctx = P.ctx; var h = P.h;
            double x0 = double.MaxValue, y0 = double.MaxValue, x1 = double.MinValue, y1 = double.MinValue;
            foreach (var q in tul) { x0 = Math.Min(x0, q.x); y0 = Math.Min(y0, q.y); x1 = Math.Max(x1, q.x); y1 = Math.Max(y1, q.y); }
            ctx.save();
            ctx.beginPath(); ctx.moveTo(tul[0].x, tul[0].y); for (int i = 1; i < tul.Count; i++) ctx.lineTo(tul[i].x, tul[i].y); ctx.closePath(); ctx.clip();
            // błoto od dołu (żarłocy leżą w błocie) i zacieki krwi — stały rozkład, nie migocze
            var gb = ctx.createLinearGradient(0, y1, 0, y0);
            gb.addColorStop(0, Barwa.Rgba(70, 54, 38, 0.55 + 0.35 * p.bloto)); gb.addColorStop(0.5, Barwa.Rgba(70, 54, 38, 0.18 + 0.3 * p.bloto)); gb.addColorStop(1, Barwa.Rgba(70, 54, 38, 0));
            ctx.fillStyle = gb; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            for (int i = 0; i < 5; i++)
            {
                double fx = (i * 0.37 + 0.13) % 1, fy = (i * 0.61 + 0.27) % 1;
                ctx.fillStyle = i < p.krew * 5 ? Barwa.Rgba(120, 16, 12, 0.8) : Barwa.Rgba(60, 46, 32, 0.4);
                ctx.beginPath(); ctx.ellipse(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy, 0.018 * h, 0.03 * h, i * 0.7, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        static void Plaszcz(Pedzel P, in PunktyPostaci q, in Poza p, Barwy b)
        {
            var h = P.h;
            var a = WTulowiu(q, h, 0.98, 0.0); var bk = WTulowiu(q, h, 0.92, -0.07);
            var dolX = Math.Min(q.kostkaL.x, q.kostkaP.x);
            var dno = Math.Max(q.kolanoL.y, q.kolanoP.y) + 0.14 * h;
            var wiatr = p.plaszcz * 0.2 * h;
            var pkt = new List<(double x, double y)>
            {
                a, bk,
                (bk.x - 0.045 * h - wiatr * 0.5, (bk.y * 2 + dno) / 3),
                (dolX - 0.08 * h - wiatr, dno - Math.Abs(wiatr) * 0.5),
                (dolX - 0.01 * h - wiatr * 0.7, dno + 0.02 * h),
                (dolX + 0.06 * h - wiatr * 0.4, dno - 0.01 * h),
                (q.biodro.x - 0.02 * h, q.biodro.y),
            };
            Jeden(P, Wielokat(pkt, b.plaszcz));
        }

        static void Rozdarcie(Pedzel P, in PunktyPostaci q, Barwy b, bool dolnaPolowa)
        {
            var h = P.h; var ctx = P.ctx;
            var c = dolnaPolowa ? WTulowiu(q, h, 0.22, 0) : WTulowiu(q, h, 0.4, 0);
            if (dolnaPolowa)
            {
                var pkt = new[] { WTulowiu(q, h, 0.28, -0.07), WTulowiu(q, h, 0.28, 0.07), WTulowiu(q, h, -0.05, 0.065), WTulowiu(q, h, -0.08, -0.062) };
                Jeden(P, Wielokat(pkt, b.skora));
            }
            ctx.fillStyle = Barwa.Rgba(126, 16, 12, 1);
            ctx.beginPath();
            for (int i = 0; i <= 8; i++)
            {
                var v = -0.075 + 0.15 * i / 8.0;
                var u = (dolnaPolowa ? 0.28 : 0.4) + ((i % 2 == 0) ? 0.03 : -0.03);
                var k = WTulowiu(q, h, u, v);
                if (i == 0) ctx.moveTo(k.x, k.y); else ctx.lineTo(k.x, k.y);
            }
            var k2 = WTulowiu(q, h, dolnaPolowa ? 0.24 : 0.44, 0);
            ctx.lineTo(k2.x, k2.y); ctx.closePath(); ctx.fill();
            Trzewia(ctx, c.x, c.y, h * 0.45, dolnaPolowa ? -0.6 : 0.6);
        }

        // ── głowa z profilu ──────────────────────────────────────────────────────────────────────────────────
        static void Glowa(Pedzel P, in PunktyPostaci q, in Poza p, Stroj s, Barwy b)
        {
            var ctx = P.ctx;
            var R = q.rGlowy;
            var C = q.glowa;
            // pochylenie głowy: kierunek od karku do środka głowy (0 — pion)
            var kat = Math.Atan2(C.x - q.kark.x, -(C.y - q.kark.y));
            ctx.save();
            ctx.translate(C.x, C.y); ctx.rotate(kat);
            var u = p.usta;
            var tl = s.rola == "zarlok" ? 1.1 : 1.0;
            // twarz i czaszka (patrzy w prawo)
            var k = new Ks { kol = b.skora };
            void d(double x, double y) => k.pkt.Add((x * R, y * R));
            d(-0.97, 0.12); d(-0.9, -0.5); d(-0.45, -0.95); d(0.15, -1.0); d(0.62, -0.72); d(0.86, -0.34);
            d(0.9, -0.14); d(0.86, -0.04); d(1.12, 0.26); d(0.9, 0.34); d(0.94, 0.44);
            d(0.84 - 0.08 * u, 0.53 + 0.16 * u); d(0.92, 0.64 + 0.24 * u); d(0.84 * tl, (0.88 + 0.22 * u) * tl);
            d(0.5, (1.0 + 0.16 * u) * tl); d(0.05, 0.92 * tl); d(-0.45, 0.78); d(-0.82, 0.55);
            k.g0 = (R * 0.7, -R * 0.9); k.g1 = (-R * 0.7, R * 0.9);
            k.kreski = false;
            Jeden(P, k);
            if (P.detal >= 1)
            {
                // ucho, oko, brew, usta
                ctx.lineWidth = P.lw * 0.9;
                ctx.beginPath(); ctx.ellipse(-R * 0.12, R * 0.12, R * 0.13, R * 0.2, 0.15, 0, Math.PI * 2);
                ctx.fillStyle = b.skora.Styl(0.86); ctx.fill(); ctx.strokeStyle = TUSZ; ctx.stroke();
                ctx.fillStyle = "rgba(20,14,10,0.95)";
                ctx.beginPath(); ctx.ellipse(R * 0.56, -R * 0.08, Math.Max(0.45, R * 0.085), Math.Max(0.45, R * 0.065), 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(30,20,14,0.8)"; ctx.lineWidth = Math.Max(0.6, R * 0.09);
                ctx.beginPath(); ctx.moveTo(R * 0.36, -R * 0.24); ctx.quadraticCurveTo(R * 0.6, -R * 0.32, R * 0.84, -R * 0.2); ctx.stroke();
                if (u > 0.25)
                {
                    ctx.fillStyle = "rgba(54,12,10,0.95)";
                    ctx.beginPath(); ctx.ellipse(R * 0.84, R * (0.52 + 0.1 * u), R * 0.07, R * (0.05 + 0.13 * u), 0, 0, Math.PI * 2); ctx.fill();
                }
                else { ctx.lineWidth = P.lw * 0.8; ctx.beginPath(); ctx.moveTo(R * 0.92, R * 0.53); ctx.lineTo(R * 0.72, R * 0.56); ctx.stroke(); }
            }
            NakrycieGlowy(P, R, s, b);
            ctx.restore();
        }

        static Ks KsztaltGlowy(double R, K kol, params double[] xy)
        {
            var k = new Ks { kol = kol, gladko = true };
            for (int i = 0; i + 1 < xy.Length; i += 2) k.pkt.Add((xy[i] * R, xy[i + 1] * R));
            k.g0 = (R * 0.7, -R * 1.1); k.g1 = (-R * 0.8, R * 0.9);
            return k;
        }

        static void NakrycieGlowy(Pedzel P, double R, Stroj s, Barwy b)
        {
            var ctx = P.ctx;
            switch (s.rola)
            {
                case "robotnik":
                    if (b.broda > 0) Broda(P, R, b.wlosy, b.broda);
                    if (s.helm)
                    {
                        // żelazny kapelusz z rondem (kapalin) na kapturze
                        Jeden(P, KsztaltGlowy(R, b.kaptur, -1.02, 0.1, -1.0, -0.55, -0.5, -0.98, 0.3, -0.98, 0.76, -0.55, 0.7, 0.2, 0.45, 0.95, -0.4, 1.05));
                        var kap = KsztaltGlowy(R, b.zelazo, -1.45, -0.28, -0.95, -0.42, -0.85, -0.95, -0.2, -1.32, 0.55, -1.0, 0.78, -0.45, 1.42, -0.38, 1.38, -0.22, -1.45, -0.14);
                        kap.kreski = false; kap.gladko = false;
                        Jeden(P, kap);
                    }
                    else
                    {
                        // kaptur (gugel): czaszka i kark, wycięcie na twarz, ogon (liripipe) na plecy
                        Jeden(P, KsztaltGlowy(R, b.kaptur, -1.1, 0.25, -1.08, -0.6, -0.55, -1.12, 0.25, -1.14, 0.82, -0.72, 0.74, -0.42, 0.52, -0.3, 0.42, 0.25, 0.6, 0.92, 0.3, 1.12, -0.6, 1.1, -1.12, 0.85));
                        Jeden(P, KsztaltGlowy(R, b.kaptur.Razy(0.9), -0.6, -1.05, -0.98, -0.9, -1.55, -0.2, -1.62, 0.5, -1.4, 0.55, -1.25, -0.25, -0.85, -0.6));
                    }
                    break;
                case "pobozny":
                    {
                        // tonsura: wieniec włosów wokół łysego czubka
                        var w = KsztaltGlowy(R, b.wlosy, -0.98, 0.12, -0.92, -0.52, -0.6, -0.78, -0.1, -0.84, 0.55, -0.62, 0.72, -0.48, 0.5, -0.46, -0.1, -0.56, -0.55, -0.42, -0.72, 0.1);
                        w.kreski = false;
                        Jeden(P, w, 0.7);
                        if (b.broda > 0) Broda(P, R, b.wlosy, b.broda);
                    }
                    break;
                case "rycerz":
                    {
                        if (b.broda > 0 && !s.Helm) Broda(P, R, b.wlosy, b.broda);
                        // czepiec kolczy: czaszka, kark i podbródek, twarz odkryta
                        var cz = KsztaltGlowy(R, b.kolczuga, -1.12, 0.6, -1.12, -0.55, -0.6, -1.1, 0.2, -1.12, 0.78, -0.72, 0.64, -0.5, 0.42, -0.36, 0.38, 0.3, 0.62, 0.86, 0.5, 1.12, -0.5, 1.15);
                        cz.kolczuga = true; cz.kreski = false;
                        Jeden(P, cz);
                        if (s.Helm)
                        {
                            // hełm garnczkowy: płaski wierzch, szczelina na oczy, otwory oddechowe, krzyż
                            var helm = KsztaltGlowy(R, b.stal, -1.1, 1.08, -1.14, -0.85, -0.98, -1.2, -0.2, -1.24, 0.92, -1.18, 1.18, -0.95, 1.22, -0.3, 1.3, 0.28, 1.18, 1.1);
                            helm.gladko = false; helm.kreski = false; helm.sila = 1.4;
                            Jeden(P, helm);
                            ctx.fillStyle = "rgba(12,9,7,0.95)";
                            ctx.fillRect(R * 0.08, -R * 0.3, R * 1.2, Math.Max(1, R * 0.17));
                            if (P.detal >= 1)
                            {
                                for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(R * (0.9 - i * 0.18), R * 0.5, Math.Max(0.4, R * 0.05), 0, Math.PI * 2); ctx.fill(); }
                                ctx.fillStyle = b.krzyz.Styl();
                                ctx.fillRect(R * 1.0, -R * 0.12, R * 0.15, R * 1.0);
                                ctx.fillRect(R * 0.72, R * 0.2, R * 0.52, R * 0.15);
                                ctx.strokeStyle = "rgba(40,40,40,0.5)"; ctx.lineWidth = P.lw * 0.8;
                                ctx.beginPath(); ctx.moveTo(-R * 1.1, -R * 0.82); ctx.lineTo(R * 1.18, -R * 0.82); ctx.stroke();
                            }
                        }
                    }
                    break;
                case "zarlok":
                    {
                        var w = KsztaltGlowy(R, b.wlosy, -0.98, 0.3, -0.98, -0.5, -0.55, -0.92, 0.1, -0.98, 0.5, -0.86, 0.12, -0.7, -0.4, -0.55, -0.62, 0.0, -0.7, 0.45);
                        w.kreski = false;
                        Jeden(P, w, 0.6);
                        if (b.broda > 0) Broda(P, R, b.wlosy, b.broda * 0.7);
                    }
                    break;
                case "dante":
                    {
                        // czerwony kaptur (cappuccio) z nausznikami i wieniec laurowy
                        Jeden(P, KsztaltGlowy(R, b.odziez, -1.15, 0.9, -1.2, -0.55, -0.7, -1.18, 0.2, -1.18, 0.82, -0.7, 0.62, -0.46, 0.42, -0.32, 0.3, 0.42, 0.52, 0.98, 0.1, 1.2, -0.7, 1.22));
                        var ns = KsztaltGlowy(R, new K(214, 206, 190), 0.3, -0.25, 0.46, -0.3, 0.4, 0.4, 0.55, 0.95, 0.32, 0.98, 0.16, 0.3);
                        ns.kreski = false;
                        Jeden(P, ns, 0.7);
                        Wieniec(P, R, b.wieniec);
                    }
                    break;
                case "wergiliusz":
                    {
                        // siwe kędziory i broda, wieniec laurowy
                        var w = KsztaltGlowy(R, b.wlosy, -1.08, 0.5, -1.12, -0.4, -0.75, -0.98, 0.0, -1.1, 0.6, -0.88, 0.78, -0.55, 0.5, -0.52, 0.0, -0.45, -0.3, 0.1, -0.55, 0.72);
                        w.kreski = false;
                        Jeden(P, w, 0.8);
                        Broda(P, R, b.wlosy, b.broda);
                        Wieniec(P, R, b.wieniec);
                    }
                    break;
            }
        }

        static void Broda(Pedzel P, double R, K kol, double ile)
        {
            // od ucha wzdłuż żuchwy do brody; długość `ile`
            var br = KsztaltGlowy(R, kol, -0.12, 0.3, 0.2, 0.55, 0.62, 0.6, 0.86, 0.62, 0.92, 0.75 + 0.3 * ile, 0.7, 0.98 + 0.42 * ile, 0.3, 1.0 + 0.3 * ile, -0.05, 0.86, -0.2, 0.55);
            br.kreski = false;
            Jeden(P, br, 0.7);
        }

        static void Wieniec(Pedzel P, double R, K kol)
        {
            if (P.detal < 1) return;
            var ctx = P.ctx;
            for (int i = 0; i < 10; i++)
            {
                var a = Math.PI * (1.02 + i * 0.105);
                double x = Math.Cos(a) * R * 1.02, y = Math.Sin(a) * R * 0.86 - R * 0.12;
                ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + (i % 2 == 0 ? 0.55 : -0.55));
                ctx.beginPath(); ctx.ellipse(0, 0, R * 0.21, R * 0.085, 0, 0, Math.PI * 2);
                ctx.fillStyle = kol.Styl(i % 2 == 0 ? 1.1 : 0.82); ctx.fill();
                ctx.strokeStyle = TUSZ; ctx.lineWidth = P.lw * 0.6; ctx.stroke();
                ctx.restore();
            }
        }

        // ── rekwizyty ────────────────────────────────────────────────────────────────────────────────────────
        /// <summary>Narzędzie w dłoni: `kat` — kierunek trzonka (jak kość: 0 — w dół). Zwraca czubek (ostrze, sztych).</summary>
        static (double x, double y) NarzedzieW(Pedzel P, (double x, double y) dl, double kat, Narzedzie n, Barwy b)
        {
            var h = P.h;
            var chwyt = od(dl, kat, 0.03 * h);
            (double x, double y) wzdluz(double d) => od(chwyt, kat, d * h);
            var pr = kat + Math.PI / 2;      // w poprzek trzonka (dla kości w dół: naprzód)
            switch (n)
            {
                case Narzedzie.Kilof:
                    {
                        var a = wzdluz(-0.1); var k = wzdluz(0.36);
                        var trzon = Konczyna(P, a, k, new[] { 0, 0.011, 0.011, 1, 0.012, 0.012 }, 1, b.drewno);
                        // głowica w poprzek trzonka: szpic naprzód, płaskie ostrze z tyłu, lekko wygięta
                        // szpic po stronie zamachu: trzonek w górę — szpic naprzód, trzonek naprzód — szpic w dół
                        var ps = kat - Math.PI / 2;
                        var szpic = od(od(k, ps, 0.17 * h), kat, -0.03 * h); var tyl = od(od(k, ps, -0.12 * h), kat, -0.02 * h);
                        var glw = new Ks { kol = b.zelazo, gladko = false };
                        glw.pkt.Add(tyl); glw.pkt.Add(od(od(k, ps, -0.06 * h), kat, 0.016 * h)); glw.pkt.Add(od(k, kat, 0.022 * h));
                        glw.pkt.Add(od(od(k, ps, 0.08 * h), kat, 0.01 * h)); glw.pkt.Add(szpic); glw.pkt.Add(od(od(k, ps, 0.08 * h), kat, -0.016 * h));
                        glw.pkt.Add(od(k, kat, -0.02 * h)); glw.pkt.Add(od(od(k, ps, -0.08 * h), kat, -0.026 * h)); glw.pkt.Add(od(tyl, kat, -0.02 * h));
                        SwiatloPola(glw); glw.sila = 1.3; glw.kreski = false;
                        Grupa(P, new List<Ks> { trzon, glw });
                        return szpic;
                    }
                case Narzedzie.Lopata:
                    {
                        var a = wzdluz(-0.08); var k = wzdluz(0.4);
                        var trzon = Konczyna(P, a, k, new[] { 0, 0.01, 0.01, 1, 0.011, 0.011 }, 1, b.drewno);
                        var c = wzdluz(0.55);
                        var piora = Konczyna(P, k, c, new[] { 0, 0.03, 0.03, 0.5, 0.042, 0.042, 1, 0.036, 0.036 }, 1, b.zelazo);
                        piora.kreski = false; piora.sila = 1.2;
                        Grupa(P, new List<Ks> { trzon, piora });
                        return c;
                    }
                case Narzedzie.Mlot:
                    {
                        var a = wzdluz(-0.04); var k = wzdluz(0.24);
                        var trzon = Konczyna(P, a, k, new[] { 0, 0.01, 0.01, 1, 0.011, 0.011 }, 1, b.drewno);
                        var obuch = Konczyna(P, od(k, pr, -0.045 * h), od(k, pr, 0.05 * h), new[] { 0, 0.024, 0.024, 1, 0.026, 0.026 }, 1, b.zelazo);
                        obuch.kreski = false;
                        Grupa(P, new List<Ks> { trzon, obuch });
                        return od(k, pr, 0.05 * h);
                    }
                case Narzedzie.Miecz:
                    {
                        var glow = wzdluz(-0.075); var jelec = wzdluz(0.035); var sztych = wzdluz(0.6);
                        var rekojesc = Konczyna(P, glow, jelec, new[] { 0, 0.011, 0.011, 1, 0.01, 0.01 }, 1, new K(74, 52, 32));
                        var gl = Elipsa(glow, 0.017 * h, 0.017 * h, 0, b.stal.Razy(0.85), 8);
                        var jl = Konczyna(P, od(jelec, pr, -0.062 * h), od(jelec, pr, 0.062 * h), new[] { 0, 0.008, 0.008, 1, 0.008, 0.008 }, 1, b.stal.Razy(0.82));
                        Grupa(P, new List<Ks> { rekojesc, gl, jl });
                        // ostrze: zbiega się ku sztychowi, z granią (jasna i ciemna połowa)
                        var nasada = wzdluz(0.045);
                        double bx = Math.Cos(kat) * 0.017 * h, by = -Math.Sin(kat) * 0.017 * h;
                        var ostrze = new Ks { kol = b.stal, gladko = false, kreski = false, sila = 1.5 };
                        ostrze.pkt.Add((nasada.x + bx, nasada.y + by));
                        ostrze.pkt.Add(Ku((nasada.x + bx, nasada.y + by), sztych, 0.82));
                        ostrze.pkt.Add(sztych);
                        ostrze.pkt.Add(Ku((nasada.x - bx, nasada.y - by), sztych, 0.82));
                        ostrze.pkt.Add((nasada.x - bx, nasada.y - by));
                        ostrze.g0 = (nasada.x + bx, nasada.y + by); ostrze.g1 = (nasada.x - bx, nasada.y - by);
                        if (ostrze.g0.x * LX + ostrze.g0.y * LY < ostrze.g1.x * LX + ostrze.g1.y * LY) (ostrze.g0, ostrze.g1) = (ostrze.g1, ostrze.g0);
                        Jeden(P, ostrze, 0.8);
                        if (P.detal >= 1) Kreska(P, nasada, Ku(nasada, sztych, 0.9), Barwa.Rgba(255, 255, 250, 0.35), Math.Max(0.5, 0.005 * h));
                        return sztych;
                    }
                case Narzedzie.Kostur:
                    {
                        // kostur pielgrzyma: przez dłoń, od ziemi do ponad głowę
                        var a = wzdluz(-0.5); var k = wzdluz(0.6);
                        var drzewce = Konczyna(P, a, k, new[] { 0, 0.011, 0.011, 1, 0.012, 0.012 }, 1, b.drewno.Razy(1.05));
                        // krzyż na szczycie (mosiądz)
                        var c = wzdluz(0.53);
                        var mos = new K(176, 140, 66);
                        var belka = Konczyna(P, od(c, pr, -0.045 * h), od(c, pr, 0.045 * h), new[] { 0, 0.01, 0.01, 1, 0.01, 0.01 }, 1, mos);
                        var pion = Konczyna(P, od(k, kat, -0.12 * h), od(k, kat, 0.035 * h), new[] { 0, 0.01, 0.01, 1, 0.01, 0.01 }, 1, mos);
                        belka.kreski = false; pion.kreski = false; belka.sila = 1.4; pion.sila = 1.4;
                        Grupa(P, new List<Ks> { drzewce, belka, pion });
                        return od(k, kat, 0.035 * h);
                    }
                case Narzedzie.Kielich:
                    {
                        var c = wzdluz(0.02);
                        Jeden(P, KsztaltKielicha(c, h));
                        return c;
                    }
            }
            return dl;
        }

        static Ks KsztaltKielicha((double x, double y) c, double h)
        {
            var k = new Ks { kol = new K(176, 140, 66), gladko = false, kreski = false, sila = 1.4 };
            k.pkt.Add((c.x - 0.03 * h, c.y - 0.06 * h)); k.pkt.Add((c.x + 0.03 * h, c.y - 0.06 * h)); k.pkt.Add((c.x + 0.008 * h, c.y - 0.025 * h));
            k.pkt.Add((c.x + 0.006 * h, c.y)); k.pkt.Add((c.x + 0.02 * h, c.y + 0.012 * h)); k.pkt.Add((c.x - 0.02 * h, c.y + 0.012 * h));
            k.pkt.Add((c.x - 0.006 * h, c.y)); k.pkt.Add((c.x - 0.008 * h, c.y - 0.025 * h));
            SwiatloPola(k);
            return k;
        }

        static (double x, double y) Ksiega(Pedzel P, (double x, double y) dl, double kat, double otwarta, double blask)
        {
            var ctx = P.ctx; var h = P.h;
            var c = od(dl, kat, 0.035 * h);
            if (blask > 0.01)
            {
                ctx.save(); ctx.globalCompositeOperation = "lighter";
                var r = 0.24 * h * (0.6 + 0.4 * blask);
                var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
                g.addColorStop(0, Barwa.Rgba(255, 224, 150, 0.55 * blask)); g.addColorStop(1, Barwa.Rgba(255, 190, 90, 0));
                ctx.fillStyle = g; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
                ctx.restore();
            }
            ctx.save();
            ctx.translate(c.x, c.y); ctx.rotate(-kat + Math.PI / 2);
            double w = 0.1 * h * (1 + otwarta * 0.95), hh = 0.075 * h;
            ctx.lineWidth = P.lw;
            ctx.fillStyle = new K(86, 36, 24).Styl(); ctx.strokeStyle = TUSZ;
            ctx.beginPath(); ctx.rect(-w / 2, -hh / 2, w, hh); ctx.fill(); ctx.stroke();
            if (otwarta > 0.2)
            {
                ctx.fillStyle = new K(224, 212, 182).Styl(1 + 0.2 * blask);
                ctx.fillRect(-w / 2 + 0.006 * h, -hh / 2 + 0.006 * h, w - 0.012 * h, hh - 0.012 * h);
                ctx.strokeStyle = "rgba(60,40,30,0.6)"; ctx.beginPath(); ctx.moveTo(0, -hh / 2); ctx.lineTo(0, hh / 2); ctx.stroke();
                if (P.detal >= 1)
                {
                    ctx.strokeStyle = "rgba(60,40,30,0.35)"; ctx.lineWidth = P.lw * 0.6;
                    for (int i = 0; i < 3; i++) { var y = -hh * 0.25 + i * hh * 0.22; ctx.beginPath(); ctx.moveTo(-w * 0.42, y); ctx.lineTo(-w * 0.08, y); ctx.moveTo(w * 0.08, y); ctx.lineTo(w * 0.42, y); ctx.stroke(); }
                }
            }
            else if (P.detal >= 1)
            {
                // okładka z krzyżem
                ctx.fillStyle = new K(176, 140, 66).Styl();
                ctx.fillRect(-w * 0.06, -hh * 0.32, w * 0.12, hh * 0.64); ctx.fillRect(-w * 0.24, -hh * 0.1, w * 0.48, hh * 0.12);
            }
            ctx.restore();
            return c;
        }

        /// <summary>Latarnia: żelazna klatka z płomieniem; `gora` — punkt zaczepienia (dłoń) albo środek podstawy na ziemi. Zwraca środek światła.</summary>
        static (double x, double y) Latarnia(Pedzel P, (double x, double y) gora, bool naZiemi)
        {
            var ctx = P.ctx; var h = P.h;
            double w = 0.045 * h, wy = 0.07 * h;
            // na ziemi stoi podstawą na (x, 0); w dłoni wisi na kabłąku pod dłonią
            double x = gora.x, y0 = naZiemi ? gora.y - wy : gora.y + 0.025 * h;
            if (!naZiemi)
            {
                ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.6, P.lw);
                ctx.beginPath(); ctx.moveTo(x, gora.y); ctx.lineTo(x, y0); ctx.stroke();
            }
            var c = (x, y0 + wy * 0.55);
            // poświata płomienia w szybkach
            var g = ctx.createRadialGradient(c.Item1, c.Item2, 0, c.Item1, c.Item2, w * 0.75);
            g.addColorStop(0, Barwa.Rgba(255, 236, 170)); g.addColorStop(0.5, Barwa.Rgba(255, 170, 70)); g.addColorStop(1, Barwa.Rgba(150, 70, 20));
            ctx.fillStyle = g;
            ctx.fillRect(x - w * 0.42, y0 + wy * 0.2, w * 0.84, wy * 0.7);
            // klatka: daszek, pręty, podstawa
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.6, P.lw * 1.1);
            ctx.strokeRect(x - w * 0.42, y0 + wy * 0.2, w * 0.84, wy * 0.7);
            ctx.fillStyle = Barwa.Rgba(70, 64, 58);
            ctx.beginPath(); ctx.moveTo(x - w * 0.55, y0 + wy * 0.22); ctx.lineTo(x, y0); ctx.lineTo(x + w * 0.55, y0 + wy * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillRect(x - w * 0.5, y0 + wy * 0.88, w, wy * 0.12);
            if (P.detal >= 1) { ctx.beginPath(); ctx.moveTo(x, y0 + wy * 0.2); ctx.lineTo(x, y0 + wy * 0.9); ctx.stroke(); }
            return c;
        }

        /// <summary>Świeca na ziemi z płomieniem; zwraca płomień.</summary>
        static (double x, double y) Swieca(Pedzel P, (double x, double y) dol)
        {
            var ctx = P.ctx; var h = P.h;
            double w = 0.018 * h, wy = 0.06 * h;
            ctx.fillStyle = Barwa.Rgba(222, 208, 176); ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(0.5, P.lw * 0.8);
            ctx.beginPath(); ctx.rect(dol.x - w / 2, dol.y - wy, w, wy); ctx.fill(); ctx.stroke();
            var pl = (dol.x, dol.y - wy - 0.018 * h);
            var g = ctx.createRadialGradient(pl.Item1, pl.Item2, 0, pl.Item1, pl.Item2, 0.02 * h);
            g.addColorStop(0, Barwa.Rgba(255, 246, 200)); g.addColorStop(0.6, Barwa.Rgba(255, 170, 60)); g.addColorStop(1, Barwa.Rgba(255, 120, 30, 0));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(pl.Item1, pl.Item2, 0.008 * h, 0.018 * h, 0, 0, Math.PI * 2); ctx.fill();
            return pl;
        }

        /// <summary>Miecz w pochwie u lewego biodra (dalsza strona), skośnie w tył.</summary>
        static void Pochwa(Pedzel P, in PunktyPostaci q, Barwy b)
        {
            var h = P.h;
            var a = WTulowiu(q, h, 0.1, -0.02);
            var kat = -0.55;   // w dół i w tył
            var koniec = od(a, kat, 0.5 * h);
            var rek = od(a, kat + Math.PI, 0.1 * h);
            Jeden(P, Konczyna(P, a, koniec, new[] { 0, 0.016, 0.016, 1, 0.011, 0.011 }, 1, new K(62, 42, 30)));
            Jeden(P, Konczyna(P, rek, a, new[] { 0, 0.01, 0.01, 1, 0.01, 0.01 }, 1, new K(74, 52, 32)));
            var pr = kat + Math.PI / 2;
            Jeden(P, Konczyna(P, od(a, pr, -0.05 * h), od(a, pr, 0.05 * h), new[] { 0, 0.008, 0.008, 1, 0.008, 0.008 }, 1, b.stal.Razy(0.8)));
        }

        /// <summary>Grzyb w dłoni (jedzenie żarłoków i ludu).</summary>
        static void Grzyb(Pedzel P, (double x, double y) dl, double kat)
        {
            var h = P.h;
            var c = od(dl, kat, 0.035 * h);
            var noz = Konczyna(P, c, od(c, kat + Math.PI, -0.03 * h), new[] { 0, 0.008, 0.008, 1, 0.009, 0.009 }, 1, new K(214, 200, 170));
            var kap = Elipsa(od(c, kat, 0.035 * h), 0.03 * h, 0.018 * h, -kat + Math.PI / 2, new K(150, 96, 60), 10);
            Grupa(P, new List<Ks> { noz, kap });
        }

        static void Tarcza(Pedzel P, in PunktyPostaci q, in Poza p, Barwy b)
        {
            var ctx = P.ctx; var h = P.h;
            // tarcza na dalszym przedramieniu: górna krawędź prosta, boki zbiegają się w szpic u dołu
            var c = Ku(q.lokiecL, q.dlonL, 0.5);
            var kat = KatPrzedramienia(p, false);
            ctx.save();
            // tarcza obraca się z całą postacią (leżący) i trochę z przedramieniem
            ctx.translate(c.x + 0.035 * h * Math.Cos(p.obrot), c.y + 0.035 * h * Math.Sin(p.obrot)); ctx.rotate(p.obrot - (kat - 0.1) * 0.35);
            double w = 0.11 * h, hh = 0.3 * h;
            var t = new Ks { kol = b.odziez, gladko = false, sila = 1.1 };
            t.pkt.Add((-w, -hh * 0.42)); t.pkt.Add((w, -hh * 0.42));
            for (int i = 1; i <= 5; i++) { var a = i / 6.0; t.pkt.Add((w * (1 - a * a * 0.9), -hh * 0.42 + hh * a)); }
            t.pkt.Add((0, hh * 0.58));
            for (int i = 5; i >= 1; i--) { var a = i / 6.0; t.pkt.Add((-w * (1 - a * a * 0.9), -hh * 0.42 + hh * a)); }
            t.g0 = (w, -hh * 0.5); t.g1 = (-w, hh * 0.4);
            Jeden(P, t, 1.2);
            if (P.detal >= 1)
            {
                ctx.fillStyle = b.krzyz.Styl();
                ctx.fillRect(-w * 0.15, -hh * 0.36, w * 0.3, hh * 0.84);
                ctx.fillRect(-w * 0.8, -hh * 0.17, w * 1.6, hh * 0.13);
            }
            ctx.restore();
        }

        static void Worek(Pedzel P, in PunktyPostaci q, in Poza p, Barwy b)
        {
            var h = P.h;
            var c = WTulowiu(q, h, 0.7, -0.13);
            var pkt = new[]
            {
                (c.x - 0.05 * h, c.y - 0.11 * h), (c.x + 0.045 * h, c.y - 0.12 * h), (c.x + 0.075 * h, c.y + 0.03 * h),
                (c.x + 0.0, c.y + 0.12 * h), (c.x - 0.09 * h, c.y + 0.06 * h), (c.x - 0.085 * h, c.y - 0.04 * h),
            };
            Jeden(P, Wielokat(pkt, new K(146, 124, 88)));
            Kreska(P, WTulowiu(q, h, 0.96, 0.05), WTulowiu(q, h, 0.4, -0.1), TUSZ, 0.012 * h + P.lw * 2);
            Kreska(P, WTulowiu(q, h, 0.96, 0.05), WTulowiu(q, h, 0.4, -0.1), Barwa.Rgba(74, 52, 32, 1), 0.012 * h);
        }

        static Pedzel NowyPedzel(IPlotno ctx, double h, Stroj s)
        {
            Kafle(ctx);
            // kreska rośnie z postacią, ale w zbliżeniach filmu nie grubieje jak w komiksie
            var P = new Pedzel { ctx = ctx, h = h, lw = Math.Max(0.5, Math.Min(h * 0.0105, 1.2 + h * 0.0025)), detal = h >= 46 ? 2 : h >= 28 ? 1 : 0 };
            if (P.detal >= 2) { P.kreski = wzorKresek; if (s.rola == "rycerz") P.kolka = wzorKolek; }
            return P;
        }

        /// <summary>Oderwana głowa (szczątki żarłoka): kikut szyi w (0, 0), głowa nad nim, całość obrócona o `kat` (płótno).</summary>
        public static void OderwanaGlowa(IPlotno ctx, double h, double kat, Stroj s, double usta = 0.6)
        {
            var P = NowyPedzel(ctx, h, s);
            var b = BarwyStroju(s);
            ctx.save();
            ctx.rotate(kat);
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            var q = new PunktyPostaci { kark = (0, 0), glowa = (0, -(SZYJA + R_GLOWY * 0.95) * h), rGlowy = R_GLOWY * h };
            Jeden(P, Konczyna(P, (0, 0), Ku(q.kark, q.glowa, 0.62), P_SZYJA, 1.3, b.skora));
            Glowa(P, q, new Poza { usta = usta }, s, b);
            // poszarpany kikut szyi
            ctx.beginPath(); ctx.ellipse(0, 0, 0.034 * h, 0.014 * h, 0, 0, Math.PI * 2);
            ctx.fillStyle = Barwa.Rgba(126, 16, 12, 1); ctx.fill();
            ctx.fillStyle = Barwa.Rgba(214, 196, 176, 0.9); ctx.beginPath(); ctx.arc(0.004 * h, 0, 0.007 * h, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        /// <summary>Oderwana ręka (szczątki żarłoka): poszarpany bark w (0, 0), ramię pod kątem `kat` (kość: 0 — w dół), zgięcie łokcia.</summary>
        public static void OderwanaReka(IPlotno ctx, double h, double kat, double zgiecie, Stroj s)
        {
            var P = NowyPedzel(ctx, h, s);
            var b = BarwyStroju(s);
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            (double x, double y) bark = (0, 0);
            var lok = od(bark, kat, RAMIE * h); var dl = od(lok, kat + zgiecie, PRZEDRAMIE * h);
            var gr = s.rola == "zarlok" ? 1.25 : 1.0;
            Grupa(P, new List<Ks>
            {
                Dlon(P, dl, kat + zgiecie, b.skora, false),
                Konczyna(P, lok, dl, P_PRZEDRAMIE, gr, b.skora),
                Konczyna(P, bark, lok, P_RAMIE, gr, b.skora),
            });
            ctx.beginPath(); ctx.ellipse(0, 0, 0.034 * h, 0.022 * h, kat, 0, Math.PI * 2);
            ctx.fillStyle = Barwa.Rgba(126, 16, 12, 1); ctx.fill();
            ctx.fillStyle = Barwa.Rgba(214, 196, 176, 0.9); ctx.beginPath(); ctx.arc(0, 0, 0.008 * h, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        /// <summary>Kupa trzewi (żarłok, Ludzik.rysujTrzewia): środek w (x, y), `kat` — obrót.</summary>
        public static void Trzewia(IPlotno ctx, double x, double y, double h, double kat)
        {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(kat);
            for (int i = 0; i < 7; i++)
            {
                double a = i * 0.9, r = h * (0.035 + 0.012 * (i % 3));
                double px = Math.Cos(a) * h * 0.05 * (1 + i * 0.12), py = Math.Sin(a) * h * 0.025;
                ctx.beginPath(); ctx.ellipse(px, py, r * 1.3, r, a, 0, Math.PI * 2);
                ctx.fillStyle = Barwa.Rgba(164 - i * 6, 66 - i * 4, 70 - i * 4, 1); ctx.fill();
                ctx.strokeStyle = "rgba(70,14,14,0.8)"; ctx.lineWidth = Math.Max(0.5, h * 0.006); ctx.stroke();
            }
            ctx.restore();
        }
    }

    /// <summary>Rany żarłoka (Ludzik): brak kończyn, głowy, połowa ciała, wypruty brzuch.</summary>
    public struct Rany
    {
        public bool bezRekiL, bezRekiP, bezNogiL, bezNogiP, bezGlowy, trzewia;
        /// <summary>"gora" — tylko od pasa w górę, "dol" — tylko miednica i nogi, null — całe ciało</summary>
        public string? polowa;
    }
}
