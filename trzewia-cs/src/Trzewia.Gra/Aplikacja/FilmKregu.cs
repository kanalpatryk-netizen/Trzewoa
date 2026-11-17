// Port: krag-3-beta/src/app/film-kregu.ts — FILM NA POCZĄTEK GRY (Krąg Trzeci). Polecenia użytkownika TS (15.11):
// „cutscenka na początku to nie ma być pokaz slajdów… tylko spójny filmik… coś w stylu komiksu”, a potem: „usuń
// napisy grrr, gulp itp. — to nie jest komiks, tylko dość brutalna opowieść; potrzebujemy więcej brutalności”.
//
// Jeden ciągły film (75 s) jak przerywnik w grze: kamera jedzie, najeżdża i trzęsie się przy uderzeniach, cięcia
// między ujęciami, kinowe napisy (narrator kursywą, kwestie z myślnikiem), ziarno, gradacja i winieta. Cerber
// i potępieni to obrazki z wypieku modeli 3D (Rysunek/Krag). Przebieg:
//  1. zjazd z burzowego nieba na krąg żarłoków w deszczu;           2. dwóch żarłoków bije się o ochłap;
//  3. ziemia drży, za wzgórzem wyrastają trzy łby;                   4. Cerber wpada w tłum — szarpie, rozrywa, pożera;
//  5. dwóch wędrowców, Cerber ryczy na nich z zakrwawioną paszczą;  6. przewodnik rzuca mu ziemię w gardła (3 ujęcia);
//  7. pies żre, a oni przechodzą i schodzą w dół;                   8. oko w błocie — ktoś to widział;
//  9. grabarz, mnich, rycerz wstają z błota (3 ujęcia);             10. szóstka razem: „zejdziemy i my”;
// 11. kamera schodzi pod ziemię: trzewia i pieczęć na dnie;         12. Cerber podnosi zakrwawiony pysk i węszy. Tytuł.
// Esc — pomija film (Aplikacja/WstepKregu.cs). Film to nie rozgrywka: alokacje w klatce są tu dopuszczalne.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;

namespace Trzewia.Aplikacja
{
    public static class FilmKregu
    {
        public const double DLUGOSC_FILMU = 75;
        const string KROJ = "\"Trzewia Tekst\", Georgia, serif";
        const string TUSZ = "rgba(14,10,8,0.96)";

        struct Prost { public double x, y, w, h; public Prost(double x, double y, double w, double h) { this.x = x; this.y = y; this.w = w; this.h = h; } }
        struct Kam { public double x, y, s; public Kam(double x, double y, double s) { this.x = x; this.y = y; this.s = s; } }

        static double los(double n) => Pieklo.los(n);
        static double gl(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static double mix(double a, double b, double t) => a + (b - a) * t;
        static double zakres(double t, double a, double b) => gl((t - a) / (b - a));
        static double dzwon(double t, double a, double b) => t <= a || t >= b ? 0 : Math.Sin(((t - a) / (b - a)) * Math.PI);
        static int ji(double v) => (int)v;

        /// <summary>Kamera między klatkami kluczowymi [czas, x, y, s] — wygładzona.</summary>
        static Kam kamera(double t, double[][] kl)
        {
            if (t <= kl[0][0]) return new Kam(kl[0][1], kl[0][2], kl[0][3]);
            for (int i = 1; i < kl.Length; i++)
            {
                if (t <= kl[i][0])
                {
                    var u = gl((t - kl[i - 1][0]) / (kl[i][0] - kl[i - 1][0]));
                    return new Kam(mix(kl[i - 1][1], kl[i][1], u), mix(kl[i - 1][2], kl[i][2], u), mix(kl[i - 1][3], kl[i][3], u));
                }
            }
            var o = kl[kl.Length - 1];
            return new Kam(o[1], o[2], o[3]);
        }

        // ---------------------------------------------------------------- świat filmu (wzrost człowieka = 1, grunt y = 0)

        sealed class Widok
        {
            public Prost R; public Kam k; public double wstrzas, czas;
            public Widok(Prost R, Kam k, double wstrzas = 0, double czas = 0) { this.R = R; this.k = k; this.wstrzas = wstrzas; this.czas = czas; }
            public double X(double wx) => R.x + R.w / 2 + (wx - k.x) * k.s + dx();
            public double Y(double wy) => R.y + R.h / 2 + (wy - k.y) * k.s + dy();
            double dx() => wstrzas != 0 ? Math.Sin(czas * 0.09) * wstrzas * k.s * 0.06 : 0;
            double dy() => wstrzas != 0 ? Math.Cos(czas * 0.11) * wstrzas * k.s * 0.05 : 0;
        }

        static readonly (double wy, (double r, double g, double b) kg, (double r, double g, double b) kd)[] RZEDY_TLA =
        {
            (-7.5, (20, 18, 22), (80, 28, 19)), (-5, (25, 21, 25), (104, 36, 21)), (-2.6, (30, 26, 28), (134, 46, 25)),
        };

        /// <summary>
        /// Niebo i ląd filmu: burzowy strop podświetlony od spodu łuną niższych kręgów, tarasy leja jak urwiska (z tłumami
        /// potępionych i wichrem kręgu II), błyski z piorunem, cuchnące błoto z kałużami, w których odbija się łuna.
        /// </summary>
        static void tlo(IPlotno ctx, Widok v, double blyskSceny = 0)
        {
            var R = v.R;
            var yG = v.Y(0);
            var L = Pieklo.luna(v.czas);
            var t = v.czas / 1000;
            // samoistne błyski burzy (co kilka sekund) i błysk zadany przez scenę
            var b = Math.Max(blyskSceny != 0 ? blyskSceny * 1.6 : 0, Pieklo.blyskawica(v.czas, 0.5).a);
            var g = ctx.createLinearGradient(0, v.Y(-16), 0, yG);
            g.addColorStop(0, "rgb(3,2,4)"); g.addColorStop(0.5, "rgb(12,7,9)");
            g.addColorStop(0.82, Barwa.Rgba(ji(46 * L), ji(16 * L), ji(12 * L))); g.addColorStop(1, Barwa.Rgba(ji(118 * L), ji(36 * L), ji(16 * L)));
            ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
            // tarasy wyższych kręgów — urwiska wygięte ku brzegom (wnętrze leja), od dołu rozgrzane łuną
            for (int r = 0; r < RZEDY_TLA.Length; r++)
            {
                var (wy, kg, kd) = RZEDY_TLA[r];
                double krawedz(double sx)
                {
                    var u = (sx - (R.x + R.w / 2)) / R.w;
                    var k = (sx - v.X(0)) / v.k.s;
                    return v.Y(wy) - u * u * v.k.s * 6 - ((Pieklo.szum1(k * 0.9, r * 7 + 1) - 0.5) * 0.5 + (Pieklo.szum1(k * 3.1, r * 7 + 3) - 0.5) * 0.16) * v.k.s;
                }
                ctx.beginPath();
                for (int i = 0; i <= 60; i++) { var sx = R.x + (R.w * i) / 60; var y = krawedz(sx); if (i == 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y); }
                ctx.lineTo(R.x + R.w, yG); ctx.lineTo(R.x, yG); ctx.closePath();
                var yS = v.Y(wy);
                var sg = ctx.createLinearGradient(0, yS, 0, yG);
                sg.addColorStop(0, Barwa.Rgba(kg.r, kg.g, kg.b)); sg.addColorStop(0.55, Barwa.Rgba(ji(kg.r * 1.15), kg.g, kg.b));
                sg.addColorStop(1, Barwa.Rgba(ji(kd.r * L), ji(kd.g * L), ji(kd.b * L)));
                ctx.fillStyle = sg; ctx.fill();
                ctx.strokeStyle = Barwa.Rgba(150, 140, 150, 0.28 + 0.5 * b); ctx.lineWidth = 1.5; ctx.stroke();
                // potępieni na półce: sylwetki pod światło łuny, w nieregularnych gromadach
                for (int i = 0; i < 46; i++)
                {
                    if (los(i * 13 + r * 5) < 0.35) continue;
                    var sx = R.x + los(i * 7 + r * 31) * R.w;
                    var y = krawedz(sx);
                    var s = v.k.s * (0.09 + 0.03 * r) * (0.7 + 0.6 * los(i * 3 + r));
                    ctx.fillStyle = Barwa.Rgba(16 + 10 * r, 9 + 4 * r, 9 + 3 * r, 0.85);
                    var typ = los(i * 17 + r);
                    if (r == 2 || typ < 0.4) { ctx.beginPath(); ctx.ellipse(sx, y - s * 0.12, s * 0.55, s * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
                    else
                    {
                        var pochyl = (los(i * 23 + r) - 0.5) * 0.6 + (typ > 0.8 ? 0.7 : 0);
                        ctx.save(); ctx.translate(sx, y); ctx.rotate(pochyl);
                        ctx.fillRect(-s * 0.13, -s * 1.15, s * 0.26, s * 1.15);
                        ctx.beginPath(); ctx.arc(0, -s * 1.32, s * 0.16, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                    }
                }
                if (r == 1)
                {
                    for (int i = 0; i < 60; i++)
                    {
                        var sx = R.x + ((los(i) * R.w * 1.4 + t * v.k.s * (1.2 + los(i * 3))) % (R.w * 1.4)) - R.w * 0.2;
                        var y = krawedz(sx) - v.k.s * (1.1 + 1.2 * los(i * 5)) + Math.Sin(t * 1.4 + i) * v.k.s * 0.25;
                        double a = t * (2 + los(i * 9) * 3) + i, s = v.k.s * 0.18;
                        ctx.strokeStyle = "rgba(40,20,18,0.7)"; ctx.lineWidth = Math.Max(1, s * 0.22);
                        ctx.beginPath(); ctx.moveTo(sx - Math.Cos(a) * s, y - Math.Sin(a) * s); ctx.lineTo(sx + Math.Cos(a) * s, y + Math.Sin(a) * s); ctx.stroke();
                    }
                }
            }
            // łuna dna rozlewa się nad horyzontem
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var RR = R.w * 0.7;
            var lg = ctx.createRadialGradient(R.x + R.w / 2, yG + v.k.s, 0, R.x + R.w / 2, yG + v.k.s, RR);
            lg.addColorStop(0, Barwa.Rgba(ji(150 * L), ji(44 * L), 14, 0.3)); lg.addColorStop(1, "rgba(60,14,6,0)");
            ctx.fillStyle = lg; ctx.fillRect(R.x, yG - RR, R.w, RR + v.k.s);
            if (b > 0.01) { ctx.fillStyle = Barwa.Rgba(80, 90, 120, 0.45 * b); ctx.fillRect(R.x, R.y, R.w, yG - R.y); }
            ctx.restore();
            // burzowy strop: kłęby z krwawym spodem, płyną
            var Hs = Math.Max(40, yG - R.y);
            Pieklo.pasChmur(ctx, R.x + R.w, R.y - Hs * 0.22, R.y + Hs * 0.42, t * 9 + v.k.x * v.k.s * 0.3, 1.2, 1);
            Pieklo.pasChmur(ctx, R.x + R.w, R.y + Hs * 0.12, R.y + Hs * 0.55, t * 17 + v.k.x * v.k.s * 0.5 + 300, 0.8, 0.45);
            if (b > 0.01)
            {
                ctx.save(); ctx.globalCompositeOperation = "lighter";
                Pieklo.pasChmur(ctx, R.x + R.w, R.y - Hs * 0.22, R.y + Hs * 0.42, t * 9 + v.k.x * v.k.s * 0.3, 1.2, 0.6 * b);
                ctx.restore();
                if (b > 0.35) Pieklo.piorun(ctx, R.x + R.w * (0.25 + 0.5 * los(Math.Floor(t * 2))), R.y + Hs * 0.3, v.Y(-2.6), Math.Min(1, b), Math.Floor(t * 2), Math.Max(1.5, v.k.s * 0.03));
            }
            Pieklo.iskry(ctx, R.x, R.x + R.w, yG - v.k.s * 4, yG, (int)Math.Floor(R.w / 40 + 0.5), t, 5);
            // grunt — cuchnące błoto, w kałużach łuna
            var gg = ctx.createLinearGradient(0, yG, 0, R.y + R.h);
            gg.addColorStop(0, "rgb(46,34,26)"); gg.addColorStop(1, "rgb(24,18,14)");
            ctx.fillStyle = gg; ctx.fillRect(R.x, yG, R.w, R.y + R.h - yG);
            for (int i = 0; i < 26; i++)
            {
                double x = v.X(-40 + los(i * 7) * 80), y = v.Y(0.15 + los(i * 3) * 2.5);
                var kg2 = ctx.createLinearGradient(0, y - v.k.s * 0.06, 0, y + v.k.s * 0.06);
                kg2.addColorStop(0, Barwa.Rgba(ji(150 * L + 150 * b), ji(48 * L + 160 * b), ji(26 + 180 * b), 0.55)); kg2.addColorStop(1, "rgba(14,9,8,0.7)");
                ctx.fillStyle = kg2;
                ctx.beginPath(); ctx.ellipse(x, y, v.k.s * (0.6 + los(i) * 1.4), v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
            }
            if (blyskSceny != 0) { ctx.fillStyle = Barwa.Rgba(220, 226, 240, blyskSceny * 0.3); ctx.fillRect(R.x, R.y, R.w, R.h); }
        }

        static void deszcz(IPlotno ctx, Prost R, double czas, double moc = 1)
        {
            ctx.save();
            var g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
            g.addColorStop(0, Barwa.Rgba(150, 160, 178, 0.24 * moc + 0.08)); g.addColorStop(1, Barwa.Rgba(210, 120, 100, 0.3 * moc + 0.1));
            ctx.strokeStyle = g; ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (int i = 0; i < 300 * moc; i++)
            {
                var x = R.x + ((los(i) * R.w * 1.3 + czas * 0.12) % (R.w * 1.3)) - R.w * 0.15;
                var y = R.y + ((los(i * 7) * R.h + czas * 1.1 * (0.8 + los(i * 3) * 0.5)) % R.h);
                ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 22);
            }
            ctx.stroke();
            // grad i brudny śnieg (pieśń VI)
            ctx.fillStyle = "rgba(226,230,234,0.7)";
            for (int i = 0; i < 40 * moc; i++)
            {
                double x = R.x + ((los(i * 11 + 1) * R.w + czas * 0.05) % R.w), y = R.y + ((los(i * 13) * R.h + czas * 1.4 * (0.8 + los(i) * 0.4)) % R.h);
                ctx.fillRect(x, y, 2.4, 3);
            }
            ctx.fillStyle = "rgba(150,140,124,0.55)";
            for (int i = 0; i < 30 * moc; i++)
            {
                double x = R.x + ((los(i * 17 + 5) * R.w + Math.Sin(czas / 800 + i) * 24 + czas * 0.02) % R.w), y = R.y + ((los(i * 19) * R.h + czas * 0.11) % R.h);
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Żarłok w świecie filmu: biodro na wysokości zależnej od pozy, `zwrot`.</summary>
        static void zarlok(IPlotno ctx, Widok v, double wx, PozaLudzika p, double zwrot = 1, double skala = 1, double? wyBiodra = null)
        {
            var lezy = Math.Abs(p.tulow) > 1.1;
            var hb = wyBiodra ?? (lezy ? 0.08 : p.udoL > 1 ? 0.25 : 0.5);
            // cień i muł pod ciałem — ciało leży w błocie, nie wisi nad nim
            if (hb < 0.35)
            {
                double sx = v.X(wx) + zwrot * (lezy ? 0.18 : 0.05) * v.k.s * skala, sy = v.Y(0.02);
                var rc = v.k.s * skala * (lezy ? 0.65 : 0.35);
                var gc = ctx.createRadialGradient(sx, sy, 0, sx, sy, rc);
                gc.addColorStop(0, "rgba(8,6,4,0.75)"); gc.addColorStop(1, "rgba(8,6,4,0)");
                ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.18); ctx.translate(-sx, -sy);
                ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(sx, sy, rc, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.save();
            ctx.translate(v.X(wx), v.Y(-hb * skala));
            ctx.scale(zwrot, 1);
            Ludzik.rysujLudzika(ctx, v.k.s * skala, p);
            ctx.restore();
            // leżący tkwi w błocie: grzbiet mułu przed ciałem zakrywa dół (brzuch, uda, łydki)
            if (lezy || hb < 0.3) blotoPrzed(ctx, v, wx - zwrot * 0.6 * skala, wx + zwrot * 0.62 * skala, skala, wx * 7.3);
        }

        /// <summary>Grzbiet mułu od x0 do x1 (jednostki świata) tuż przy gruncie: nierówny brzeg, mokre odblaski.</summary>
        static void blotoPrzed(IPlotno ctx, Widok v, double x0, double x1, double skala, double ziarno)
        {
            double a = Math.Min(x0, x1) - 0.1 * skala, b = Math.Max(x0, x1) + 0.1 * skala;
            double yT = v.Y(-0.015 * skala), yD = v.Y(0.3 * skala);
            ctx.save();
            var g = ctx.createLinearGradient(0, yT, 0, yD);
            g.addColorStop(0, "rgb(50,46,34)"); g.addColorStop(1, "rgb(38,35,26)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(v.X(a), yD);
            const int n = 18;
            for (int i = 0; i <= n; i++)
            {
                double u = (double)i / n, x = v.X(a + (b - a) * u);
                var brzeg = Math.Sin(u * Math.PI) * 0.035 * skala + (los(ziarno * 13 + i) - 0.5) * 0.03 * skala;
                ctx.lineTo(x, v.Y(-brzeg));
            }
            ctx.lineTo(v.X(b), yD); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(140,150,150,0.16)";
            for (int i = 0; i < 4; i++)
            {
                var x = v.X(a + (b - a) * (0.15 + los(ziarno + i * 3) * 0.7));
                ctx.beginPath(); ctx.ellipse(x, v.Y(0.04 * skala), v.k.s * skala * (0.05 + 0.08 * los(ziarno + i)), v.k.s * skala * 0.008, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Tłum leżących, wyjących, żrących — z pominięciem przedziału [bezOd, bezDo].</summary>
        static void tlum(IPlotno ctx, Widok v, double t, double bezOd = 1e9, double bezDo = -1e9, double? ucieczkaOd = null, double odX = 0)
        {
            for (int warstwa = 2; warstwa >= 0; warstwa--)
            {
                var sk = warstwa == 2 ? 0.62 : warstwa == 1 ? 0.8 : 1;
                ctx.save();
                ctx.globalAlpha = warstwa == 2 ? 0.6 : warstwa == 1 ? 0.82 : 1;
                for (int i = 0; i < 46; i++)
                {
                    if (i % 3 != warstwa) continue;
                    var x = -34 + i * 1.5 + los(i * 11) * 0.8;
                    if (x > bezOd && x < bezDo) continue;
                    var r = los(i * 29);
                    PozaLudzika p;
                    if (ucieczkaOd is double uo && t > uo && Math.Abs(x - odX) < 9 && warstwa == 0)
                    {
                        var kier = x < odX ? -1 : 1;
                        x += kier * (t - uo) * 0.9;
                        p = Ludzik.pozaCzolga(t, 1.6, i);
                        zarlokNaWarstwie(ctx, v, x, p, kier, sk, warstwa);
                        continue;
                    }
                    p = r < 0.45 ? Ludzik.pozaLezy(t, i) : r < 0.62 ? Ludzik.pozaWyje(t, i) : r < 0.8 ? Ludzik.pozaZre(t, i) : Ludzik.pozaCzolga(t * 0.25, 0.5, i);
                    zarlokNaWarstwie(ctx, v, x, p, los(i * 3) < 0.5 ? 1 : -1, sk, warstwa);
                }
                ctx.restore();
            }
        }

        static void zarlokNaWarstwie(IPlotno ctx, Widok v, double x, PozaLudzika p, double zwrot, double sk, int warstwa)
        {
            ctx.save();
            ctx.translate(0, -warstwa * v.k.s * 0.35);
            zarlok(ctx, v, x, p, zwrot, sk);
            ctx.restore();
        }

        /// <summary>Cerber w świecie filmu: stopy w (wx, wy), wysokość 3,2 człowieka. Zwraca paszcze w pikselach ekranu.</summary>
        static (double x, double y)[] cerber(IPlotno ctx, Widok v, double wx, PozaCerbera p, double zwrot, double wy = 0)
        {
            var H = v.k.s * 3.2;
            ctx.save();
            ctx.translate(v.X(wx), v.Y(wy));
            ctx.scale(zwrot, 1);
            var pk = RysCerber.rysujCerbera(ctx, H, p);
            ctx.restore();
            var m = new (double x, double y)[3];
            for (int i = 0; i < 3; i++) { var q = pk.Paszcza(i); m[i] = (v.X(wx) + q.x * zwrot, v.Y(wy) + q.y); }
            return m;
        }

        /// <summary>Ofiara w paszczy: rysowana w punkcie paszczy (piksele), obrót, poza.</summary>
        static void wPaszczy(IPlotno ctx, Widok v, (double x, double y) m, PozaLudzika p, double kat, double skala = 1)
        {
            ctx.save();
            ctx.translate(m.x, m.y); ctx.rotate(kat);
            ctx.translate(-v.k.s * 0.17 * skala, v.k.s * 0.02);
            Ludzik.rysujLudzika(ctx, v.k.s * skala, p);
            ctx.restore();
        }

        /// <summary>Krople krwi kapiące z paszczy.</summary>
        static void kapie(IPlotno ctx, (double x, double y) m, double s, double czas, double moc = 1)
        {
            ctx.save(); ctx.fillStyle = "rgb(120,12,8)";
            for (int i = 0; i < 4 * moc; i++)
            {
                var f = ((czas / 700) + i * 0.27) % 1;
                ctx.beginPath(); ctx.ellipse(m.x + (i - 1.5) * s * 0.05, m.y + f * s * 1.2, s * 0.018, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        static PozaLudzika z(PozaLudzika p, double? krew = null, bool trzewia = false, string? polowa = null, bool bezGlowy = false, bool bezRekiP = false, bool bezNogiL = false)
        {
            if (krew is double k) p.krew = k;
            if (trzewia) p.trzewia = true;
            if (polowa != null) p.polowa = polowa;
            if (bezGlowy) p.bezGlowy = true;
            if (bezRekiP) p.bezRekiP = true;
            if (bezNogiL) p.bezNogiL = true;
            return p;
        }

        // ---------------------------------------------------------------- wędrowcy

        static IPlotno? sylwA, sylwB;

        /// <summary>Wędrowiec jak w kinie: ciemna sylwetka w deszczu z chłodnym konturem światła (szata ledwie barwna).</summary>
        static void wedrowiec(IPlotno ctx, double h, bool zywy, double krok, double reka, double schyla = 0)
        {
            int W = Math.Max(8, (int)Math.Ceiling(h * 1.4)), Hh = Math.Max(8, (int)Math.Ceiling(h * 1.3));
            if (sylwA == null || sylwA.width < W || sylwA.height < Hh)
            {
                int nw = Math.Max(W, sylwA?.width ?? 0), nh = Math.Max(Hh, sylwA?.height ?? 0);
                sylwA?.Dispose(); sylwB?.Dispose();
                sylwA = Plotno.Nowe(nw, nh); sylwB = Plotno.Nowe(nw, nh);
            }
            var A = sylwA; var B = sylwB!;
            A.clearRect(0, 0, W, Hh);
            A.save(); A.translate(W / 2.0, Hh - h * 0.04); wedrowiecRys(A, h, zywy, krok, reka, schyla); A.restore();
            double ox = -W / 2.0, oy = -(Hh - h * 0.04);
            // kontur światła (zza pleców, z góry)
            B.clearRect(0, 0, W, Hh); B.globalCompositeOperation = "source-over"; B.drawImage(A, 0, 0, W, Hh, 0, 0, W, Hh);
            B.globalCompositeOperation = "source-in"; B.fillStyle = "rgba(176,190,200,0.38)"; B.fillRect(0, 0, W, Hh); B.globalCompositeOperation = "source-over";
            var o = Math.Max(1, Math.Min(3, h * 0.004));
            ctx.drawImage(B, 0, 0, W, Hh, ox - o, oy - o, W, Hh);
            // sylwetka: ciemna, z odrobiną barwy szaty
            B.clearRect(0, 0, W, Hh); B.drawImage(A, 0, 0, W, Hh, 0, 0, W, Hh);
            B.globalCompositeOperation = "source-atop"; B.fillStyle = zywy ? "rgba(30,7,6,0.86)" : "rgba(15,16,16,0.86)"; B.fillRect(0, 0, W, Hh); B.globalCompositeOperation = "source-over";
            ctx.drawImage(B, 0, 0, W, Hh, ox, oy, W, Hh);
        }

        static void wedrowiecRys(IPlotno ctx, double h, bool zywy, double krok, double reka, double schyla)
        {
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.strokeStyle = "rgba(6,4,4,0.4)"; ctx.lineWidth = Math.Max(0.6, h * 0.008);
            var szata = ctx.createLinearGradient(-h * 0.2, -h * 0.7, h * 0.2, 0);
            szata.addColorStop(0, zywy ? "rgb(120,30,26)" : "rgb(92,98,92)"); szata.addColorStop(0.55, zywy ? "rgb(84,18,16)" : "rgb(60,64,60)"); szata.addColorStop(1, zywy ? "rgb(40,8,8)" : "rgb(30,32,30)");
            const string sk = "rgb(176,150,124)";
            var n = Math.Sin(krok) * h * 0.07;
            ctx.fillStyle = "rgb(40,30,24)";
            ctx.beginPath(); ctx.ellipse(-h * 0.06 + n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(h * 0.06 - n, -h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
            // schylanie: tułów obraca się wokół bioder
            ctx.translate(0, -h * 0.42); ctx.rotate(schyla * 1.1); ctx.translate(0, h * 0.42);
            ctx.fillStyle = szata;
            ctx.beginPath();
            ctx.moveTo(-h * 0.18, -h * 0.03); ctx.lineTo(-h * 0.12, -h * 0.62); ctx.quadraticCurveTo(0, -h * 0.72, h * 0.12, -h * 0.62);
            ctx.lineTo(h * 0.2, -h * 0.03); ctx.closePath(); ctx.fill(); ctx.stroke();
            // fałdy
            ctx.strokeStyle = "rgba(14,10,8,0.4)";
            for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-h * 0.06 + i * h * 0.06, -h * 0.55); ctx.lineTo(-h * 0.1 + i * h * 0.08, -h * 0.05); ctx.stroke(); }
            ctx.strokeStyle = szata; ctx.lineWidth = h * 0.07;
            double rx = h * (0.12 + 0.2 * reka + 0.1 * schyla), ry = -h * (0.42 + 0.38 * reka - 0.3 * schyla);
            ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, h * 0.018);
            ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.58); ctx.lineTo(rx, ry); ctx.stroke();
            ctx.fillStyle = sk; ctx.beginPath(); ctx.arc(rx, ry, h * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = sk;
            ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.8, h * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            if (zywy)
            {
                ctx.fillStyle = szata;
                ctx.beginPath(); ctx.arc(0, -h * 0.82, h * 0.1, Math.PI * 0.95, Math.PI * 2.1); ctx.lineTo(-h * 0.1, -h * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            else
            {
                ctx.strokeStyle = "rgb(110,140,70)"; ctx.lineWidth = Math.Max(1, h * 0.022);
                ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.83, h * 0.09, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
                ctx.fillStyle = "rgb(200,196,186)";
                ctx.beginPath(); ctx.moveTo(-h * 0.02, -h * 0.76); ctx.lineTo(h * 0.09, -h * 0.76); ctx.lineTo(h * 0.04, -h * 0.68); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        // ---------------------------------------------------------------- kino: napisy, ziarno, winieta

        static List<string> zawin(IPlotno ctx, string tekst, double max)
        {
            var @out = new List<string>(); var l = "";
            foreach (var s in tekst.Split(' '))
            {
                var p = l != "" ? l + " " + s : s;
                if (ctx.measureText(p).width > max && l != "") { @out.Add(l); l = s; } else l = p;
            }
            if (l != "") @out.Add(l);
            return @out;
        }

        /// <summary>Napis kinowy: blada kursywa z miękkim cieniem, wyśrodkowana u dołu kadru (albo u góry, `gora`).</summary>
        static void napis(IPlotno ctx, Prost R, string tekst, double a, bool gora, double r, double koniec = 9)
        {
            if (a <= 0 || koniec <= 0) return;
            var al = Math.Min(1, a * 1.2) * Math.Min(1, koniec * 2);
            ctx.save();
            ctx.font = $"italic {Js.Js.S(r * 1.05)}px {KROJ}";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            var linie = zawin(ctx, tekst, R.w * 0.62);
            var lh = r * 1.45;
            var y0 = gora ? R.y + R.h * 0.1 : R.y + R.h * 0.9 - (linie.Count - 1) * lh;
            ctx.globalAlpha = al;
            ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.08;
            ctx.fillStyle = "rgb(224,218,200)";
            for (int i = 0; i < linie.Count; i++) ctx.fillText(linie[i], R.x + R.w / 2, y0 + i * lh);
            ctx.restore();
        }

        /// <summary>Kwestia mówiona: „— tekst”, cieplejsza barwa, u dołu kadru.</summary>
        static void kwestia(IPlotno ctx, Prost R, string tekst, double a, double r, double koniec = 9)
        {
            if (a <= 0 || koniec <= 0) return;
            ctx.save();
            ctx.font = $"{Js.Js.S(r * 1.1)}px {KROJ}";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.globalAlpha = Math.Min(1, a * 1.5) * Math.Min(1, koniec * 2);
            ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.08;
            ctx.fillStyle = "rgb(236,214,170)";
            ctx.fillText("— " + tekst, R.x + R.w / 2, R.y + R.h * 0.9);
            ctx.restore();
        }

        static IObraz? ziarnoFilmu;

        /// <summary>Obraz filmowy: ziarno (drga z klatki na klatkę), gradacja, winieta.</summary>
        static void kino(IPlotno ctx, Prost R, double czas)
        {
            if (ziarnoFilmu == null)
            {
                // szum o kryciu 11/255 (alfa wymnożona: składowe ×11/255)
                var d = new byte[192 * 192 * 4];
                for (int i = 0; i < d.Length; i += 4)
                {
                    var v = (int)(los(i * 0.37) * 255);
                    var p = (byte)Math.Round(v * 11 / 255.0, MidpointRounding.AwayFromZero);
                    d[i] = d[i + 1] = d[i + 2] = p; d[i + 3] = 11;
                }
                ziarnoFilmu = Plotno.Fabryka.ObrazZPikseli(192, 192, d);
            }
            ctx.save();
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = "rgba(200,160,146,1)"; ctx.globalAlpha = 0.16; ctx.fillRect(R.x, R.y, R.w, R.h);
            ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 1;
            var gk = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
            gk.addColorStop(0, "rgba(60,16,14,0.25)"); gk.addColorStop(1, "rgba(130,30,12,0.35)");
            ctx.fillStyle = gk; ctx.fillRect(R.x, R.y, R.w, R.h);
            ctx.restore();
            ctx.save();
            var ox = (int)(los(Math.Floor(czas / 42)) * 192); var oy = (int)(los(Math.Floor(czas / 42) + 7) * 192);
            var pat = ctx.createPattern(ziarnoFilmu, "repeat");
            if (pat != null) { ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(R.x + ox, R.y + oy, R.w, R.h); ctx.translate(ox, oy); }
            var vg = ctx.createRadialGradient(R.x + R.w / 2, R.y + R.h / 2, R.h * 0.35, R.x + R.w / 2, R.y + R.h / 2, R.w * 0.62);
            vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = vg; ctx.fillRect(R.x, R.y, R.w, R.h);
            ctx.restore();
        }

        /// <summary>Ujęcia jedno po drugim w obrębie sceny: które trwa i jego czas.</summary>
        static (int nr, double t) ciecia(double t, double[] od)
        {
            int i = 0;
            while (i + 1 < od.Length && t >= od[i + 1]) i++;
            return (i, t - od[i]);
        }

        // ---------------------------------------------------------------- postacie gry (szóstka) w filmie

        static readonly Dictionary<string, Creature> atrapy = new Dictionary<string, Creature>();

        static void postacGry(IPlotno ctx, Sim sim, string rola, string klucz, double x, double y, double h, double czas, string cz, double zwrot = 1, double wstaje = 1)
        {
            if (!atrapy.TryGetValue(klucz, out var c))
            {
                c = Stworzenia.makeCreature(Race.GOBLIN, -1, 0, 0, 300000 + atrapy.Count); c.rola = rola; atrapy[klucz] = c;
            }
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(zwrot, 1);
            // wstawanie: obrót wokół stóp z leżenia do pionu
            if (wstaje < 1) ctx.rotate(-(1 - gl(wstaje)) * Math.PI * 0.45);
            Figury.rysujPostac(ctx, sim, c, h * (rola == "rycerz" ? 1.15 : 1), czas, wstaje < 0.25 ? "spi" : cz);
            ctx.restore();
        }

        static void lopata(IPlotno ctx, double x, double y, double s, double kat)
        {
            ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
            ctx.strokeStyle = "rgb(100,72,44)"; ctx.lineWidth = s * 0.05; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, 0); ctx.stroke();
            ctx.fillStyle = "rgb(110,108,100)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-s * 0.1, 0); ctx.lineTo(s * 0.1, 0); ctx.lineTo(s * 0.07, s * 0.25); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 0.07, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        static void miecz(IPlotno ctx, double x, double y, double s, double kat)
        {
            ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
            ctx.fillStyle = "rgb(150,140,124)"; ctx.strokeStyle = TUSZ; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-s * 0.03, 0); ctx.lineTo(s * 0.03, 0); ctx.lineTo(s * 0.02, -s * 0.85); ctx.lineTo(0, -s * 0.92); ctx.lineTo(-s * 0.02, -s * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgb(110,80,40)"; ctx.fillRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.04); ctx.strokeRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.04);
            ctx.fillStyle = "rgb(70,50,30)"; ctx.fillRect(-s * 0.025, 0, s * 0.05, s * 0.16);
            // rdza i błoto
            ctx.fillStyle = "rgba(120,60,30,0.6)"; ctx.fillRect(-s * 0.015, -s * 0.5, s * 0.03, s * 0.2);
            ctx.restore();
        }

        // ---------------------------------------------------------------- ujęcia

        delegate void Ujecie(IPlotno ctx, Prost R, double t, double czas, Sim sim, double r);
        sealed class Pozycja { public double od, @do; public Ujecie rysuj = null!; }

        static readonly PozaCerbera pc = new PozaCerbera();

        static readonly Pozycja[] UJECIA =
        {
            // 1. Zjazd z nieba na krąg
            new Pozycja { od = 0, @do = 7, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, 0, -11, R.h / 9 }, new[] { 5.5, 0, -1.6, R.h / 7 }, new[] { 7, 1, -1.4, R.h / 6.5 } });
                var v = new Widok(R, k, 0, czas);
                var blysk = t > 2.2 && t < 2.45 ? 0.4 : 0;
                tlo(ctx, v, blysk);
                tlum(ctx, v, t);
                deszcz(ctx, R, czas, 1.2);
                napis(ctx, R, "Piekło. Krąg trzeci — krąg żarłoków.", t - 1.2, true, r);
                napis(ctx, R, "Pada tu wieczny deszcz, zimny i ciężki. Nie ustaje nigdy.", t - 3.8, false, r);
            } },
            // 2. Bójka o ochłap
            new Pozycja { od = 7, @do = 13, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, -6, -0.7, R.h / 3.2 }, new[] { 6, -6.3, -0.6, R.h / 2.7 } });
                var v = new Widok(R, k, 0, czas);
                tlo(ctx, v); tlum(ctx, v, t + 7, -9, -3);
                // ochłap (kość z mięsem) — szarpany między dwoma
                var ciag = Math.Sin(t * 5) * 0.12;
                double bx = v.X(-6.1 + ciag), by = v.Y(-0.42);
                zarlok(ctx, v, -6.75, Ludzik.pozaSzarpie(t, 0), 1, 1, 0.3);
                zarlok(ctx, v, -5.45, z(Ludzik.pozaSzarpie(t + 0.5, 2), krew: t > 3 ? 0.4 : 0), -1, 1, 0.3);
                ctx.save(); ctx.translate(bx, by); ctx.rotate(0.3 + ciag);
                ctx.strokeStyle = "rgb(222,212,186)"; ctx.lineWidth = v.k.s * 0.05; ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(-v.k.s * 0.18, 0); ctx.lineTo(v.k.s * 0.18, 0); ctx.stroke();
                ctx.fillStyle = "rgb(130,40,34)"; ctx.beginPath(); ctx.ellipse(0, 0, v.k.s * 0.1, v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                if (t > 3) Ludzik.bryzgKrwi(ctx, v.X(-5.4), v.Y(-0.75), v.k.s, (t - 3) / 0.8, -0.5, 0.5, 3);
                deszcz(ctx, R, czas, 1);
                napis(ctx, R, "Leżą tu ci, którzy za życia służyli brzuchowi. Nawet tutaj biją się o ochłap.", t - 0.6, true, r);
            } },
            // 3. Ziemia drży; za wzgórzem trzy łby
            new Pozycja { od = 13, @do = 17, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, 6, -1.6, R.h / 9 }, new[] { 4, 7, -1.8, R.h / 8 } });
                var v = new Widok(R, k, t > 0.5 ? 1.2 : 0, czas);
                tlo(ctx, v);
                // trzy łby nad wzgórzem
                var wy = mix(1.2, -0.6, zakres(t, 0.6, 2.6));
                var p = pc.Zeruj(); p.czas = czas;
                foreach (var g in p.glowy) { g.pochyl = -0.2; g.paszcza = 0.3 + 0.6 * dzwon(t, 2.2, 3.9); }
                cerber(ctx, v, 13, p, -1, wy + 2.4);
                // wzgórze przed nim
                ctx.fillStyle = "rgb(46,44,34)";
                ctx.beginPath(); ctx.moveTo(v.X(5), v.Y(0)); ctx.quadraticCurveTo(v.X(12), v.Y(-1.6), v.X(20), v.Y(0)); ctx.closePath(); ctx.fill();
                // żarłocy unoszą głowy
                tlum(ctx, v, t + 13);
                deszcz(ctx, R, czas, 1.2);
            } },
            // 4. Cerber wpada w tłum: patroszy, rozrywa na pół, miażdży i połyka, odrywa rękę
            new Pozycja { od = 17, @do = 27, rysuj = ujecieRzezi },
            // 5. Dwóch wędrowców; Cerber ryczy na nich
            new Pozycja { od = 27, @do = 32, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, -3, -1.7, R.h / 6.5 }, new[] { 5, -2.4, -1.6, R.h / 6 } });
                var wstrzas = dzwon(t, 1.3, 3.0) * 0.8;
                var v = new Widok(R, k, wstrzas, czas);
                tlo(ctx, v);
                tlum(ctx, v, t + 27, -9, 3);
                Ludzik.kaluzaKrwi(ctx, v.X(0.5), v.Y(0.05), v.k.s * 1.1, 1, 3);
                zarlok(ctx, v, 0.4, z(Ludzik.pozaTrup(2), polowa: "gora"), 1, 1, 0.08);
                var p = pc.Zeruj(); p.czas = czas;
                var ryk = dzwon(t, 1.2, 3.2);
                for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = -0.1 - 0.5 * ryk + 0.05 * i; g.paszcza = 0.4 + 0.6 * ryk; g.wysun = 0.2 + 0.3 * ryk; }
                p.deba = 0.15 * ryk;
                var m = cerber(ctx, v, 2.5, p, -1);
                foreach (var q in m) kapie(ctx, q, v.k.s, czas, 1);
                // wędrowcy po lewej
                var h = v.k.s * 1.05;
                ctx.save(); ctx.translate(v.X(-7.6), v.Y(0)); wedrowiec(ctx, h, true, 0, 0); ctx.restore();
                ctx.save(); ctx.translate(v.X(-6.7), v.Y(0)); wedrowiec(ctx, h * 1.04, false, 0, 0.1); ctx.restore();
                deszcz(ctx, R, czas, 1);
                kwestia(ctx, R, "Mistrzu…!", (t - 2.6) * 2, r);
                napis(ctx, R, "Wtedy przyszło ich dwóch. Jeden z nich rzucał cień — był żywy.", t - 0.2, true, r);
            } },
            // 6. Przewodnik nabiera ziemi i rzuca w gardła — trzy ujęcia po sobie
            new Pozycja { od = 32, @do = 38.5, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var (nr, lt) = ciecia(t, new double[] { 0, 1.9, 3.5 });
                if (nr == 0)
                {
                    // schyla się do błota (półzbliżenie, kamera lekko najeżdża)
                    var v = new Widok(R, new Kam(-6.6, -0.75, (R.h / 2.6) * (1 + lt * 0.04)), 0, czas);
                    tlo(ctx, v);
                    tlum(ctx, v, t + 32, -9.5, -4.5);
                    ctx.save(); ctx.translate(v.X(-6.9), v.Y(0)); wedrowiec(ctx, v.k.s * 1.05, false, 0, 0, gl(lt / 1.2) * 0.8); ctx.restore();
                    ctx.fillStyle = "rgb(34,30,22)"; ctx.beginPath(); ctx.ellipse(v.X(-6.3), v.Y(0.02), v.k.s * 0.32, v.k.s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
                    deszcz(ctx, R, czas, 0.9);
                }
                else if (nr == 1)
                {
                    // z dołu: przewodnik prostuje się z pełnymi garściami błota, ciecze mu po rękach
                    var v = new Widok(R, new Kam(-6.75, -0.95, (R.h / 1.9) * (1 + lt * 0.05)), 0, czas);
                    tlo(ctx, v);
                    var h = v.k.s * 1.05;
                    var reka = 0.35 + 0.45 * zakres(lt, 0.2, 1.1);
                    ctx.save(); ctx.translate(v.X(-6.9), v.Y(0)); wedrowiec(ctx, h, false, 0, reka, 0.25 * (1 - zakres(lt, 0, 0.8))); ctx.restore();
                    double rx = v.X(-6.9) + h * (0.12 + 0.2 * reka), ry = v.Y(0) - h * (0.42 + 0.38 * reka);
                    ctx.fillStyle = "rgb(40,32,22)"; ctx.beginPath(); ctx.ellipse(rx, ry - h * 0.02, h * 0.06, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
                    for (int i = 0; i < 5; i++) { var f = ((czas / 520) + i * 0.21) % 1; ctx.beginPath(); ctx.ellipse(rx + (i - 2) * h * 0.012, ry + f * h * 0.5, h * 0.006, h * 0.016, 0, 0, Math.PI * 2); ctx.fill(); }
                    deszcz(ctx, R, czas, 0.9);
                }
                else
                {
                    // rzut w trzy rozwarte gardła — od dołu, pies nad kamerą
                    var v = new Widok(R, new Kam(1.4, -1.9, R.h / 4.0), dzwon(lt, 0.6, 1.6) * 0.7, czas);
                    tlo(ctx, v);
                    var p = pc.Zeruj(); p.czas = czas; p.krew = 1;
                    for (int i = 0; i < 3; i++) { var g2 = p.glowy[i]; g2.pochyl = -0.25 + 0.08 * i; g2.paszcza = 1; g2.wysun = 0.3; }
                    var m = cerber(ctx, v, 2.6, p, -1);
                    foreach (var q in m) kapie(ctx, q, v.k.s, czas, 1.5);
                    var f = zakres(lt, 0.3, 1.3);
                    for (int i = 0; i < 16; i++)
                    {
                        var ff = Math.Max(0, Math.Min(1, f * 1.3 - (i % 4) * 0.08));
                        if (ff <= 0 || ff >= 1) continue;
                        var cel = m[i % 3];
                        double x = mix(R.x - R.w * 0.05, cel.x, ff), y = mix(R.y + R.h * 0.95, cel.y, ff) - Math.Sin(ff * Math.PI) * R.h * 0.2;
                        ctx.fillStyle = "rgb(48,38,26)"; ctx.beginPath(); ctx.arc(x + (los(i) - 0.5) * 24, y, R.h * (0.012 + 0.01 * los(i * 3)), 0, Math.PI * 2); ctx.fill();
                    }
                    deszcz(ctx, R, czas, 0.9);
                }
                napis(ctx, R, "Przewodnik schylił się, nabrał pełne garście ziemi i cisnął je w łapczywe gardła.", t - 0.5, false, r);
            } },
            // 7. Pies żre; oni przechodzą i schodzą w dół
            new Pozycja { od = 38.5, @do = 44.5, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, 1, -1.8, R.h / 8 }, new[] { 6, 4, -1.6, R.h / 8.5 } });
                var v = new Widok(R, k, 0, czas);
                tlo(ctx, v);
                tlum(ctx, v, t + 38, -2, 13);
                // krawędź tarasu: przepaść do niższego kręgu
                ctx.fillStyle = "rgb(8,6,6)";
                ctx.beginPath(); ctx.moveTo(v.X(11), v.Y(0)); ctx.lineTo(v.X(12.2), v.Y(3)); ctx.lineTo(v.X(30), v.Y(3)); ctx.lineTo(v.X(30), v.Y(-0.01)); ctx.closePath(); ctx.fill();
                var lg = ctx.createRadialGradient(v.X(16), v.Y(4), 0, v.X(16), v.Y(4), v.k.s * 8);
                lg.addColorStop(0, "rgba(200,60,30,0.5)"); lg.addColorStop(1, "rgba(200,60,30,0)");
                ctx.fillStyle = lg; ctx.fillRect(v.X(10), v.Y(-6), v.k.s * 20, v.k.s * 12);
                var p = pc.Zeruj(); p.czas = czas;
                for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.6 + 0.1 * Math.Sin(czas / 90 + i); g.paszcza = 0.2 + 0.4 * Math.Abs(Math.Sin(czas / 80 + i * 1.3)); g.wysun = 0.15; }
                p.ogon = Math.Sin(czas / 200) * 0.8;
                cerber(ctx, v, 2.5, p, -1);
                // idą: wzdłuż i w dół krawędzi
                var h = v.k.s * 1.05;
                double xw = mix(-4, 13.5, zakres(t, 0.3, 5.6)), zejscie = Math.Max(0, xw - 11.2) * 0.9;
                ctx.save(); ctx.translate(v.X(xw - 0.9), v.Y(Math.Max(0, xw - 0.9 - 11.2) * 0.9)); wedrowiec(ctx, h, true, czas / 120, 0); ctx.restore();
                ctx.save(); ctx.translate(v.X(xw), v.Y(zejscie)); wedrowiec(ctx, h * 1.04, false, czas / 120 + 1, 0); ctx.restore();
                deszcz(ctx, R, czas, 1);
                napis(ctx, R, "Pies zamilkł nad tą strawą jak głodny nad kością.", t - 0.3, true, r);
                napis(ctx, R, "A oni przeszli — i zeszli niżej. Bo z piekła wychodzi się tylko przez jego dno.", t - 2.4, false, r);
            } },
            // 8. Ktoś to widział: jeden żarłok powoli unosi głowę i patrzy tam, gdzie zeszli wędrowcy
            new Pozycja { od = 44.5, @do = 47.5, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var v = new Widok(R, new Kam(0.3 + t * 0.06, -0.5, (R.h / 2.3) * (1 + t * 0.07)), 0, czas);
                tlo(ctx, v);
                for (int j = 0; j < 6; j++)
                {
                    if (j == 3) continue;
                    zarlok(ctx, v, -3.3 + j * 1.35 + los(j * 7) * 0.4, Ludzik.pozaLezy(t + j * 0.7, j + 11), j % 2 != 0 ? 1 : -1, 0.95);
                }
                // ten jeden: z leżenia unosi tułów na łokciach, głowa w górę i w prawo
                var u = zakres(t, 0.4, 2.2);
                var p = Ludzik.pozaLezy(0, 3);
                p.tulow = Math.PI / 2 - 0.42 * u; p.glowa = mix(-0.1, -0.85, u);
                p.ramieL = mix(Math.PI / 2 + 0.3, 0.35, u); p.lokiecL = mix(0.3, 1.25, u); p.ramieP = mix(Math.PI / 2, 0.2, u); p.lokiecP = mix(0.4, 1.35, u);
                p.udoL = -Math.PI / 2 + 0.12; p.kolanoL = -0.1; p.udoP = -Math.PI / 2 + 0.2; p.kolanoP = -0.25; p.usta = 0.2; p.krew = 0.15;
                zarlok(ctx, v, 0.75, p, 1, 1.05, 0.06 + 0.07 * u);
                deszcz(ctx, R, czas, 0.8);
                napis(ctx, R, "Ktoś to widział.", t - 1.2, false, r * 1.2);
            } },
            // 9. Wstają z błota: grabarz, mnich, rycerz — trzy ujęcia po sobie
            new Pozycja { od = 47.5, @do = 57.5, rysuj = (ctx, R, t, czas, sim, r) =>
            {
                string[] opisy =
                {
                    "Grabarz. Za życia kopał groby za miskę strawy. Kopie i teraz.",
                    "Mnich. Modlił się z pełnymi ustami — ale słowa modlitwy pamięta.",
                    "Rycerz. Przejadł cały majątek. Miecza nie oddał.",
                };
                string[] role = { "robotnik", "pobozny", "rycerz" };
                var (i, lt) = ciecia(t, new double[] { 0, 3.3, 6.6 });
                var v = new Widok(R, new Kam(0.1 + lt * 0.05, -0.85, (R.h / 2.7) * (1 + lt * 0.025)), 0, czas);
                tlo(ctx, v);
                for (int j = 0; j < 4; j++) zarlok(ctx, v, -2.4 + j * 1.6 + (j > 1 ? 0.9 : 0), Ludzik.pozaLezy(t + j, j + i), j % 2 != 0 ? 1 : -1, 0.85);
                var wst = zakres(lt, 0.5, 2.0);
                if (i == 0)
                {
                    // łopata tkwi w błocie; grabarz chwyta ją i wyciąga
                    var wyc = zakres(lt, 1.6, 2.6);
                    lopata(ctx, v.X(0.45), v.Y(-0.3 - wyc * 0.4), v.k.s, 0.25 - wyc * 0.2);
                }
                if (i == 2)
                {
                    var wyc = zakres(lt, 1.8, 2.8);
                    miecz(ctx, v.X(0.5), v.Y(0.15 - wyc * 0.9), v.k.s, 0.15 - wyc * 0.3);
                }
                postacGry(ctx, sim, role[i], "film" + i, v.X(-0.1), v.Y(0), v.k.s * 1.0, czas + i * 300, i == 1 && lt > 2.2 ? "modli" : "stoi", 1, wst);
                deszcz(ctx, R, czas, 0.8);
                if (i == 1) kwestia(ctx, R, "Pater noster, qui es in caelis…", (lt - 2.2) * 2, r, 3.3 - lt);
                napis(ctx, R, opisy[i], (lt - 0.7) * 2, true, r, 3.3 - lt);
            } },
            // 10. Szóstka razem
            new Pozycja { od = 57.5, @do = 62.5, rysuj = (ctx, R, t, czas, sim, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, 0, -1, R.h / 3.6 }, new[] { 5, 0.8, -1, R.h / 3.3 } });
                var v = new Widok(R, k, 0, czas);
                tlo(ctx, v);
                tlum(ctx, v, t + 57, -5, 6);
                // dziura w ziemi, w którą pada światło
                double hx = v.X(4.2), hy = v.Y(0.12);
                var pr = ctx.createLinearGradient(hx, R.y, hx, hy);
                pr.addColorStop(0, "rgba(255,236,190,0)"); pr.addColorStop(1, "rgba(255,236,190,0.35)");
                ctx.fillStyle = pr;
                ctx.beginPath(); ctx.moveTo(hx - v.k.s * 0.3, R.y); ctx.lineTo(hx + v.k.s * 0.3, R.y); ctx.lineTo(hx + v.k.s * 0.7, hy); ctx.lineTo(hx - v.k.s * 0.7, hy); ctx.closePath(); ctx.fill();
                ctx.fillStyle = "rgb(6,4,4)"; ctx.beginPath(); ctx.ellipse(hx, hy, v.k.s * 0.75, v.k.s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
                string[] role = { "robotnik", "robotnik", "robotnik", "pobozny", "pobozny", "rycerz" };
                for (int i = 0; i < role.Length; i++)
                    postacGry(ctx, sim, role[i], "film" + (i == 0 ? "0" : i == 3 ? "1" : i == 5 ? "2" : "s" + i), v.X(-3.2 + i * 0.95), v.Y(0), v.k.s, czas + i * 211, "stoi", 1);
                deszcz(ctx, R, czas, 1);
                kwestia(ctx, R, "Oni zeszli w dół. Zejdziemy i my.", (t - 0.6) * 2, r, 2.5 - t);
                kwestia(ctx, R, "Przez trzewia tej ziemi…", (t - 2.7) * 2, r);
            } },
            // 11. Pod ziemię: przekrój trzewi kręgu — warstwy mułu, kości, wciągane ciała, żyły ziemi; pieczęć na dnie
            new Pozycja { od = 62.5, @do = 69, rysuj = ujeciePodZiemia },
            // 12. Cerber węszy; tytuł
            new Pozycja { od = 69, @do = DLUGOSC_FILMU, rysuj = (ctx, R, t, czas, _, r) =>
            {
                var k = kamera(t, new[] { new[] { 0, 3.6, -2.0, R.h / 5.6 }, new[] { 3.5, 4.0, -2.2, R.h / 5.0 } });
                var v = new Widok(R, k, 0, czas);
                tlo(ctx, v);
                Ludzik.kaluzaKrwi(ctx, v.X(0.8), v.Y(0.05), v.k.s * 1.4, 1, 5);
                zarlok(ctx, v, 0.8, z(Ludzik.pozaTrup(1), bezGlowy: true, bezRekiP: true), 1, 1, 0.08);
                var p = pc.Zeruj(); p.czas = czas;
                var unosi = zakres(t, 0.4, 1.6);
                for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = mix(0.7, -0.35, unosi) + 0.05 * i; g.paszcza = 0.25 + 0.1 * Math.Sin(czas / 150 + i); g.oczy = 1 + dzwon(t, 2, 3.5) * 0.8; }
                var m = cerber(ctx, v, 2.6, p, 1);
                foreach (var q in m) kapie(ctx, q, v.k.s, czas, 1.5);
                // błysk ślepi
                ctx.save(); ctx.globalCompositeOperation = "lighter";
                foreach (var q in m)
                {
                    var gg = ctx.createRadialGradient(q.x, q.y - v.k.s * 0.2, 0, q.x, q.y - v.k.s * 0.2, v.k.s * 0.8);
                    gg.addColorStop(0, Barwa.Rgba(255, 40, 20, 0.4 * dzwon(t, 2, 3.5))); gg.addColorStop(1, "rgba(255,40,20,0)");
                    ctx.fillStyle = gg; ctx.fillRect(q.x - v.k.s, q.y - v.k.s * 1.2, v.k.s * 2, v.k.s * 2);
                }
                ctx.restore();
                deszcz(ctx, R, czas, 1);
                napis(ctx, R, "Cerber podniósł łby znad trupa. Zapamiętał ich zapach.", t - 1.6, false, r);
                // tytuł
                var a = zakres(t, 4.2, 5.0);
                if (a > 0)
                {
                    ctx.fillStyle = Barwa.Rgba(0, 0, 0, a); ctx.fillRect(R.x, R.y, R.w, R.h);
                    ctx.globalAlpha = a;
                    ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.font = $"{Js.Js.S(r * 4.2)}px {KROJ}"; ctx.fillStyle = "rgb(200,40,30)";
                    ctx.fillText("TRZEWIA", R.x + R.w / 2, R.y + R.h * 0.44);
                    ctx.font = $"italic {Js.Js.S(r * 1.6)}px {KROJ}"; ctx.fillStyle = "rgb(220,210,180)";
                    ctx.fillText("Krąg Trzeci", R.x + R.w / 2, R.y + R.h * 0.6);
                    ctx.globalAlpha = 1;
                }
            } },
        };

        static readonly double[] UDERZENIA = { 0.9, 1.6, 4.6, 6.9, 7.6 };

        /// <summary>Ujęcie 4: Cerber wpada w tłum — patroszy, rozrywa na pół, miażdży i połyka, odrywa rękę.</summary>
        static void ujecieRzezi(IPlotno ctx, Prost R, double t, double czas, Sim _, double r)
        {
            // pozycja Cerbera: wbiega z prawej i staje nad ofiarami
            var cx = mix(14, 3.2, zakres(t, 0, 1.5)) - zakres(t, 3.2, 3.8) * 0.8 - zakres(t, 6.2, 6.8) * 0.9;
            var k0 = kamera(t, new[] { new[] { 0, 8, -1.6, R.h / 6.5 }, new[] { 1.5, 2.2, -1.5, R.h / 5.2 }, new[] { 3.2, 1.6, -1.6, R.h / 5.4 }, new[] { 6, 1.3, -1.5, R.h / 5 }, new[] { 10, 1, -1.6, R.h / 5.4 } });
            // najazd kamery na rozrywanie (ofiara 2)
            var zbl = dzwon(t, 3.9, 5.9);
            var k = new Kam(mix(k0.x, 1.1, zbl * 0.7), mix(k0.y, -2.1, zbl * 0.6), k0.s * (1 + 0.45 * zbl));
            double wstrzas = 0;
            foreach (var u0 in UDERZENIA) wstrzas = Math.Max(wstrzas, dzwon(t, u0 - 0.05, u0 + 0.4) * 1.6);
            var v = new Widok(R, new Kam(k.x, k.y, k.s * (1 + 0.06 * wstrzas)), wstrzas, czas);
            tlo(ctx, v);
            tlum(ctx, v, t + 17, -1, 6, 0.4, cx);
            // kałuże krwi rosną
            Ludzik.kaluzaKrwi(ctx, v.X(-2.4), v.Y(0.05), v.k.s * 1.1, zakres(t, 3.1, 4.2), 1);
            Ludzik.kaluzaKrwi(ctx, v.X(1.0), v.Y(0.08), v.k.s * 1.6, zakres(t, 4.7, 6.0), 2);
            Ludzik.kaluzaKrwi(ctx, v.X(0.5), v.Y(0.05), v.k.s * 1.2, zakres(t, 6.9, 7.8), 3);
            Ludzik.kaluzaKrwi(ctx, v.X(cx - 2.2), v.Y(0.06), v.k.s * 0.9, zakres(t, 7.6, 8.6), 4);
            var p = pc.Zeruj(); p.czas = czas; p.krew = t > 2 ? 1 : 0.6;
            p.krok = t < 1.5 ? 1 : 0; p.faza = czas / 90; p.szal = 0.6;
            for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.1 * Math.Sin(czas / 300 + i); g.paszcza = 0.5; }
            // K1 (0.8–3.2): środkowa głowa chwyta, trzęsie — brzuch pęka, trzewia lecą — potem ciska trupem
            var k1 = t > 0.8 && t < 3.2;
            if (k1) { var g = p.glowy[1]; g.wysun = 0.4; g.pochyl = 0.5 + Math.Sin(czas / 40) * 0.35 * zakres(t, 1, 1.3); g.paszcza = 0.35; }
            // K2 (3.6–6.0): lewa i prawa głowa rozrywają na pół (wolniej — kamera najeżdża)
            var k2 = t > 3.6 && t < 6.0;
            var roz = zakres(t, 4.1, 5.0);
            if (k2)
            {
                p.glowy[0].pochyl = 0.3 - roz * 0.9; p.glowy[0].paszcza = 0.3; p.glowy[0].wysun = 0.2;
                p.glowy[2].pochyl = 0.5 + roz * 0.5; p.glowy[2].paszcza = 0.3; p.glowy[2].wysun = 0.5;
                p.deba = 0.15 * roz;
            }
            // K3 (6.2–9.5): łapa miażdży pełzającego (głowa odpada), środkowa głowa podnosi resztę i połyka
            if (t > 6.2)
            {
                p.deba = dzwon(t, 6.2, 7.0) * 0.6;
                var g = p.glowy[1];
                g.pochyl = t < 7.4 ? 0.7 : mix(0.7, -0.7, zakres(t, 7.4, 8.2));
                g.paszcza = t < 7.4 ? 0.8 : t < 8.4 ? 0.35 : 0.2 + 0.6 * dzwon(t, 8.4, 9.2);
                g.wysun = t < 7.4 ? 0.5 : 0.2;
            }
            // K4 (7.0–9.8): bliższa głowa (pitbull) odrywa rękę klęczącemu
            if (t > 7.0)
            {
                var g = p.glowy[2];
                g.wysun = t < 7.6 ? zakres(t, 7.0, 7.5) * 0.7 : mix(0.7, 0.3, zakres(t, 7.6, 8.4));
                g.pochyl = t < 7.6 ? 0.9 : 0.9 - zakres(t, 7.6, 8.4) * 0.8 + Math.Sin(czas / 45) * 0.25 * zakres(t, 8.4, 8.7);
                g.paszcza = t < 7.55 ? 1 : 0.3;
            }
            var m = cerber(ctx, v, cx, p, -1);
            // ofiara 1
            if (t < 0.8) zarlok(ctx, v, 1.0, Ludzik.pozaWyje(t, 1), 1, 1);
            else if (k1)
            {
                var pek = t > 1.7;
                wPaszczy(ctx, v, m[1], z(Ludzik.pozaWPaszczy(t, t < 2.5 ? 1 : 0.4), krew: pek ? 1 : 0.6, trzewia: pek), Math.PI / 2 + Math.Sin(czas / 40) * 0.4);
                Ludzik.bryzgKrwi(ctx, m[1].x, m[1].y, v.k.s * 0.9, ((t - 1.0) % 0.6) / 0.6, -1.2 + Math.Sin(t * 9), 1.4, Math.Floor(t / 0.6));
                if (pek) Ludzik.bryzgKrwi(ctx, m[1].x, m[1].y + v.k.s * 0.2, v.k.s * 1.0, (t - 1.7) / 0.9, Math.PI * 0.6, 2.0, 31);
                if (t > 1.2) kapie(ctx, m[1], v.k.s, czas, 2);
            }
            else
            {
                // ciśnięty — leci w lewo, pada wypatroszony, trzewia wloką się za nim
                var f = zakres(t, 3.2, 3.9);
                double x = mix(cx - 2.6, -2.4, f), y = -2.2 * dzwon(f, 0, 1) - 0.08;
                if (f >= 1) { ctx.save(); ctx.translate(v.X(-1.75), v.Y(0)); Ludzik.rysujTrzewia(ctx, v.k.s * 1.1, 0.1); ctx.restore(); }
                ctx.save(); ctx.translate(v.X(x), v.Y(y)); ctx.rotate(f * 4);
                Ludzik.rysujLudzika(ctx, v.k.s, z(Ludzik.pozaTrup(1), trzewia: true)); ctx.restore();
            }
            // ofiara 2 — rozrywana na pół
            (double x, double y) sr = ((m[0].x + m[2].x) / 2, (m[0].y + m[2].y) / 2);
            if (t < 3.6) zarlok(ctx, v, 1.6, Ludzik.pozaLezy(t, 2), -1, 1);
            else if (k2)
            {
                if (roz < 0.5) wPaszczy(ctx, v, sr, z(Ludzik.pozaWPaszczy(t, 1), krew: 0.4 + roz), Math.PI / 2);
                else
                {
                    wPaszczy(ctx, v, m[0], z(Ludzik.pozaWPaszczy(t, 0.6), polowa: "gora"), Math.PI / 2 + 0.6);
                    wPaszczy(ctx, v, m[2], z(Ludzik.pozaWPaszczy(t, 0.6), polowa: "dol"), Math.PI / 2 - 0.4);
                    kapie(ctx, m[0], v.k.s, czas, 3); kapie(ctx, m[2], v.k.s, czas, 3);
                    // trzewia wypadają z rozdartego tułowia i spadają w błoto
                    var sp = zakres(t, 4.6, 5.3);
                    ctx.save(); ctx.translate(sr.x, mix(sr.y + v.k.s * 0.2, v.Y(0), sp)); Ludzik.rysujTrzewia(ctx, v.k.s * 1.2, sp * 1.5 - 0.6); ctx.restore();
                }
                // fontanna krwi i czerwona mgła w chwili rozdarcia
                Ludzik.bryzgKrwi(ctx, sr.x, sr.y, v.k.s * 1.2, (t - 4.55) / 1.1, -Math.PI / 2, 2.4, 7);
                Ludzik.bryzgKrwi(ctx, sr.x, sr.y, v.k.s * 1.0, (t - 4.6) / 1.0, Math.PI * 0.85, 1.8, 19);
                Ludzik.bryzgKrwi(ctx, sr.x, sr.y, v.k.s * 1.0, (t - 4.62) / 1.0, Math.PI * 0.15, 1.8, 23);
                var mg = dzwon(t, 4.5, 5.8);
                if (mg > 0)
                {
                    var gm = ctx.createRadialGradient(sr.x, sr.y, 0, sr.x, sr.y, v.k.s * 1.6);
                    gm.addColorStop(0, Barwa.Rgba(120, 6, 4, 0.5 * mg)); gm.addColorStop(1, "rgba(90,0,0,0)");
                    ctx.fillStyle = gm; ctx.fillRect(sr.x - v.k.s * 1.6, sr.y - v.k.s * 1.6, v.k.s * 3.2, v.k.s * 3.2);
                }
            }
            else
            {
                zarlok(ctx, v, 0.4, z(Ludzik.pozaTrup(2), polowa: "gora"), 1, 1, 0.08);
                zarlok(ctx, v, 1.6, z(Ludzik.pozaTrup(3), polowa: "dol"), -1, 1, 0.1);
                ctx.save(); ctx.translate(v.X(1.0), v.Y(0)); Ludzik.rysujTrzewia(ctx, v.k.s * 1.2, 0.3); ctx.restore();
            }
            // ofiara 3 — pełznie, zmiażdżona łapą (głowa odskakuje), podniesiona i połknięta
            if (t < 6.9) zarlok(ctx, v, mix(-0.4, 0.4, zakres(t, 4, 6.9)), Ludzik.pozaCzolga(t, 1.6, 4), 1, 1);
            else if (t < 7.4)
            {
                zarlok(ctx, v, 0.5, z(Ludzik.pozaTrup(0), krew: 1, bezGlowy: true, trzewia: true), 1, 1, 0.06);
                Ludzik.bryzgKrwi(ctx, v.X(0.5), v.Y(-0.1), v.k.s * 1.0, (t - 6.9) / 0.6, -Math.PI / 2, 2.2, 9);
            }
            else if (t < 8.6)
            {
                var lyk = zakres(t, 8.0, 8.6);
                wPaszczy(ctx, v, m[1], z(Ludzik.pozaWPaszczy(t, 0.3), krew: 1, bezGlowy: true, trzewia: true), Math.PI / 2 - 0.9, 1 - lyk * 0.7);
            }
            if (t > 6.9)
            {
                var f = zakres(t, 6.9, 7.6);
                ctx.save(); ctx.translate(v.X(mix(0.9, 2.6, f)), v.Y(-0.06 - Math.Sin(f * Math.PI) * 1.4)); Ludzik.rysujOderwanaGlowe(ctx, v.k.s, f * 8 + 1.5); ctx.restore();
            }
            if (t > 7.4) kapie(ctx, m[1], v.k.s, czas, 2);
            // ofiara 4 — klęczy przed nim i wyje; pitbull odrywa mu rękę
            var x4 = cx - 2.15;
            if (t > 4.5)
            {
                if (t < 7.6) zarlok(ctx, v, x4, Ludzik.pozaWyje(t, 6), -1, 1);
                else
                {
                    var pad = zakres(t, 7.8, 8.6);
                    zarlok(ctx, v, x4 - pad * 0.3, z(pad < 0.5 ? Ludzik.pozaWyje(t, 6) : Ludzik.pozaTrup(4), krew: 1, bezRekiP: true), -1, 1, pad < 0.5 ? (double?)null : 0.08);
                    ctx.save(); ctx.translate(m[2].x, m[2].y); ctx.rotate(-0.4 + Math.Sin(czas / 45) * 0.3 * zakres(t, 8.4, 8.7)); Ludzik.rysujOderwanaReke(ctx, v.k.s, 1.2, 0.6); ctx.restore();
                    Ludzik.bryzgKrwi(ctx, v.X(x4 - 0.05), v.Y(-0.62), v.k.s * 0.9, (t - 7.6) / 0.9, -Math.PI * 0.8, 1.8, 41);
                    kapie(ctx, m[2], v.k.s, czas, 2);
                }
            }
            deszcz(ctx, R, czas, 1);
            napis(ctx, R, "Cerber. Trzy gardła, czerwone ślepia, tłusta czarna broda i brzuch szeroki.", t - 0.3, true, r, 4.0 - t);
            napis(ctx, R, "Szarpie potępionych, obdziera ze skóry, ćwiartuje. Nikt mu się nie wymknie.", t - 6.3, false, r);
        }

        /// <summary>Ujęcie 11: przekrój trzewi kręgu — warstwy mułu, kości, wciągane ciała, żyły ziemi; pieczęć na dnie.</summary>
        static void ujeciePodZiemia(IPlotno ctx, Prost R, double t, double czas, Sim _, double r)
        {
            var zjazd = zakres(t, 0.2, 4.5);
            var yG = R.y + R.h * mix(0.55, -0.6, zjazd);
            ctx.fillStyle = "rgb(18,20,22)"; ctx.fillRect(R.x, R.y, R.w, R.h);
            var g = ctx.createLinearGradient(0, yG, 0, yG + R.h * 1.6);
            g.addColorStop(0, "rgb(46,38,28)"); g.addColorStop(0.5, "rgb(36,24,18)"); g.addColorStop(1, "rgb(40,14,10)");
            ctx.fillStyle = g; ctx.fillRect(R.x, yG, R.w, R.h * 2);
            // warstwy: nierówne pasy mułu i gliny
            for (int i = 0; i < 12; i++)
            {
                var y = yG + R.h * (0.06 + i * 0.13);
                ctx.fillStyle = i % 2 != 0 ? "rgba(20,14,10,0.45)" : "rgba(70,56,40,0.22)";
                ctx.beginPath(); ctx.moveTo(R.x, y);
                for (double x = 0; x <= R.w; x += R.w / 24) ctx.lineTo(R.x + x, y + Math.Sin(x / (R.w * 0.11) + i * 2.3) * R.h * 0.018 + (los(i * 31 + x) - 0.5) * R.h * 0.01);
                ctx.lineTo(R.x + R.w, y + R.h * 0.07); ctx.lineTo(R.x, y + R.h * 0.07); ctx.closePath(); ctx.fill();
            }
            // kamienie i kości w glinie
            for (int i = 0; i < 26; i++)
            {
                double x = R.x + los(i * 7 + 1) * R.w, y = yG + R.h * (0.1 + los(i * 13) * 1.35), rr = R.h * (0.01 + 0.025 * los(i * 3));
                if (i % 3 == 0)
                {
                    ctx.save(); ctx.translate(x, y); ctx.rotate(los(i) * 3);
                    ctx.strokeStyle = "rgba(176,164,140,0.75)"; ctx.lineWidth = rr * 0.5; ctx.lineCap = "round";
                    ctx.beginPath(); ctx.moveTo(-rr * 2, 0); ctx.lineTo(rr * 2, 0); ctx.stroke();
                    ctx.fillStyle = "rgba(176,164,140,0.75)";
                    for (int e = -2; e <= 2; e += 4) { ctx.beginPath(); ctx.arc(rr * e, -rr * 0.25, rr * 0.4, 0, Math.PI * 2); ctx.arc(rr * e, rr * 0.25, rr * 0.4, 0, Math.PI * 2); ctx.fill(); }
                    ctx.restore();
                }
                else
                {
                    var gk = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.1, x, y, rr);
                    gk.addColorStop(0, "rgb(84,76,64)"); gk.addColorStop(1, "rgb(32,28,22)");
                    ctx.fillStyle = gk; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.3, rr, los(i) * 3, 0, Math.PI * 2); ctx.fill();
                }
            }
            // żyły ziemi — tętnią (trzewia kręgu trawią)
            var odd = Math.Sin(czas / 600);
            for (int i = 0; i < 5; i++)
            {
                double x0 = R.x + R.w * (0.1 + i * 0.2), y0 = yG + R.h * 0.15;
                ctx.strokeStyle = Barwa.Rgba(110 + 30 * odd, 22, 18, 0.55); ctx.lineWidth = R.h * (0.012 + 0.004 * odd) * (1 + (i % 2) * 0.5);
                ctx.beginPath(); ctx.moveTo(x0, y0);
                ctx.bezierCurveTo(x0 + R.w * 0.08, y0 + R.h * 0.4, x0 - R.w * 0.1, y0 + R.h * 0.8, R.x + R.w * 0.5 + (i - 2) * R.w * 0.04, yG + R.h * 1.3);
                ctx.stroke();
            }
            // ciała wciągane przez ziemię: całe, rozerwane, bez głów
            for (int i = 0; i < 9; i++)
            {
                double x = R.x + R.w * (0.08 + los(i * 7) * 0.84), y = yG + R.h * (0.2 + los(i * 3) * 1.0) - zjazd * R.h * 0.04 * (i % 3);
                ctx.save(); ctx.translate(x, y); ctx.rotate(los(i) * 6);
                ctx.globalAlpha = 0.85;
                var pl = z(Ludzik.pozaTrup(i), krew: 0.8);
                switch (i)
                {
                    case 1: pl.polowa = "gora"; break;
                    case 2: pl.bezGlowy = true; break;
                    case 3: case 8: pl.trzewia = true; break;
                    case 4: pl.polowa = "dol"; break;
                    case 6: pl.bezRekiP = true; pl.bezNogiL = true; break;
                }
                Ludzik.rysujLudzika(ctx, R.h * 0.16, pl);
                ctx.restore();
            }
            // szóstka wchodzi w otwór na górze
            ctx.fillStyle = "rgb(6,4,4)"; ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.55, yG, R.w * 0.03, R.h * 0.015, 0, 0, Math.PI * 2); ctx.fill();
            for (int i = 0; i < 6; i++) ctx.fillRect(R.x + R.w * (0.45 + i * 0.012), yG - R.h * 0.04, R.w * 0.006, R.h * 0.04);
            // pieczęć na dnie: kamienne koło z płaskorzeźbą trójgłowego psa, skute łańcuchami, łuna spod spodu
            double py = yG + R.h * 1.35, px = R.x + R.w * 0.5, pr2 = R.h * 0.16;
            var pg = ctx.createRadialGradient(px, py, 0, px, py, pr2 * 2.8);
            pg.addColorStop(0, Barwa.Rgba(230, 60, 30, 0.45 + 0.2 * odd)); pg.addColorStop(1, "rgba(230,60,30,0)");
            ctx.fillStyle = pg; ctx.fillRect(px - pr2 * 3, py - pr2 * 3, pr2 * 6, pr2 * 6);
            var gp = ctx.createRadialGradient(px - pr2 * 0.3, py - pr2 * 0.4, pr2 * 0.1, px, py, pr2);
            gp.addColorStop(0, "rgb(118,112,102)"); gp.addColorStop(1, "rgb(58,54,50)");
            ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(px, py, pr2, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr2 * 0.88, 0, Math.PI * 2); ctx.clip();
            ctx.translate(px - pr2 * 0.1, py + pr2 * 0.55);
            var p = pc.Zeruj(); p.czas = 0; p.kamien = 1; foreach (var gg in p.glowy) { gg.oczy = 0.6; gg.paszcza = 0.3; gg.pochyl = -0.2; }
            RysCerber.rysujCerbera(ctx, pr2 * 1.3, p);
            ctx.restore();
            ctx.strokeStyle = "rgb(44,40,36)"; ctx.lineWidth = pr2 * 0.07;
            ctx.beginPath(); ctx.moveTo(px - pr2 * 1.5, py - pr2); ctx.lineTo(px + pr2 * 1.5, py + pr2); ctx.moveTo(px + pr2 * 1.5, py - pr2); ctx.lineTo(px - pr2 * 1.5, py + pr2); ctx.stroke();
            napis(ctx, R, "Ziemia pod nimi drgnęła.", t - 0.4, true, r, 2.0 - t);
            napis(ctx, R, "Ty jesteś trzewiami tego kręgu — ziemią, która trawi żarłoków. Czujesz każdy ich krok.", t - 2.0, true, r);
            napis(ctx, R, "Na samym dnie czeka zapieczętowane zejście do kręgu czwartego.", t - 4.0, false, r);
        }

        /// <summary>Klatka filmu w czasie `t` (s) na całym ekranie.</summary>
        public static void rysujFilm(IPlotno ctx, Sim sim, double w, double h, double t, double czas)
        {
            ctx.save();
            ctx.fillStyle = "rgb(4,4,5)"; ctx.fillRect(0, 0, w, h);
            // pasy kinowe 2:1 — film, nie gra
            var H = Math.Min(h * 0.86, w / 2.0);
            var R = new Prost(0, (h - H) / 2, w, H);
            var r = Math.Max(14, Math.Min(26, w / 60));
            Pozycja u = UJECIA[UJECIA.Length - 1];
            foreach (var q in UJECIA) if (t >= q.od && t < q.@do) { u = q; break; }
            var lt = t - u.od;
            ctx.save();
            ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
            u.rysuj(ctx, R, lt, czas, sim, r);
            // obraz filmowy: ziarno, gradacja, winieta
            kino(ctx, R, czas);
            ctx.restore();
            // cięcia: krótkie zaciemnienie na styku ujęć
            var doKonca = u.@do - t;
            var ciemno = Math.Max(lt < 0.25 ? 1 - lt / 0.25 : 0, doKonca < 0.18 ? 1 - doKonca / 0.18 : 0);
            if (ciemno > 0 && u.od > 0) { ctx.fillStyle = Barwa.Rgba(0, 0, 0, ciemno * 0.9); ctx.fillRect(R.x, R.y, R.w, R.h); }
            if (t < 1) { ctx.fillStyle = Barwa.Rgba(0, 0, 0, 1 - t); ctx.fillRect(0, 0, w, h); }
            ctx.font = $"italic {Js.Js.S(r * 0.7)}px {KROJ}"; ctx.fillStyle = "rgba(170,160,140,0.55)"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
            ctx.fillText("Esc — pomiń film", w - r, h - r * 0.6);
            ctx.restore();
        }
    }
}
