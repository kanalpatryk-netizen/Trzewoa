// Port: krag-3-beta/src/render/zabijanie.ts — CERBER ZABIJA (Krąg Trzeci): przy każdym postoju na kręgu
// (Symulacja/Krag.cs: zabiciaCerbera) Cerber zabija jednego żarłoka jednym z pięciu sposobów:
//  0 — chwyta środkową paszczą, trzęsie nim i ciska trupem;   1 — dwie głowy chwytają i rozrywają go na pół;
//  2 — podnosi i połyka w całości (zostaje ręka i krew);      3 — staje dęba, miażdży łapą i żre we trzy łby;
//  4 — podrzuca w górę i łapie w paszczę, miażdżąc (głowa odpada).
// Po zabójstwie zostają szczątki i kałuża krwi (rysujSzczatki), aż cień się odrodzi.
// (W C# żarłok jest zawsze z obrazków, więc zastępcze rysunki ręki i głowy z TS — gdy obrazków brak — odpadają.)
using System;
using Trzewia.Plotna;

namespace Trzewia.Rysunek
{
    public static class Zabijanie
    {
        static double gl(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static double mix(double a, double b, double t) => a + (b - a) * t;
        static double zakres(double u, double a, double b) => gl((u - a) / (b - a));
        static double dzwon(double u, double a, double b) => u <= a || u >= b ? 0 : Math.Sin(((u - a) / (b - a)) * Math.PI);

        static void naZiemi(IPlotno ctx, double x, double hV, PozaLudzika p, double zwrot = 1, double skY = 1)
        {
            var lezy = Math.Abs(p.tulow) > 1.1;
            ctx.save();
            ctx.translate(x, -hV * (lezy ? 0.08 : 0.3));
            ctx.scale(zwrot, skY);
            Ludzik.rysujLudzika(ctx, hV, p);
            ctx.restore();
        }

        static void wPaszczy(IPlotno ctx, (double x, double y) m, double hV, PozaLudzika p, double kat, double skala = 1)
        {
            ctx.save();
            ctx.translate(m.x, m.y); ctx.rotate(kat);
            ctx.translate(-hV * 0.17 * skala, hV * 0.02);
            Ludzik.rysujLudzika(ctx, hV * skala, p);
            ctx.restore();
        }

        static void kapie(IPlotno ctx, (double x, double y) m, double h, double czas, double moc = 1)
        {
            ctx.save(); ctx.fillStyle = "rgb(120,12,8)";
            for (int i = 0; i < 4 * moc; i++)
            {
                var f = ((czas / 600) + i * 0.27) % 1;
                ctx.beginPath(); ctx.ellipse(m.x + (i - 1.5) * h * 0.04, m.y + f * h * 0.9, h * 0.016, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        static void kawalki(IPlotno ctx, double x, double y, double hV, double czas, double moc = 1)
        {
            ctx.save();
            for (int i = 0; i < 6 * moc; i++)
            {
                var f = ((czas / 900) + i * 0.17) % 1;
                var a = -Math.PI / 2 + (((i * 37) % 10) / 10.0 - 0.5) * 1.6;
                double px = x + Math.Cos(a) * hV * 0.8 * f, py = y + Math.Sin(a) * hV * 0.8 * f + f * f * hV * 1.0;
                ctx.fillStyle = i % 2 != 0 ? "rgb(150,40,36)" : "rgb(110,10,8)";
                ctx.beginPath(); ctx.ellipse(px, py, hV * 0.04, hV * 0.025, f * 6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>
        /// Tętnica: pulsujący strumień krwi z rany (łuk z grawitacją, krople na końcu). `x`, `y` — rana, `kat` — kierunek,
        /// `moc` — zasięg (wzrost ofiary × moc), `czas` — ms (puls ok. 1,4 na sekundę).
        /// </summary>
        static void tetnica(IPlotno ctx, double x, double y, double kat, double hV, double czas, double moc = 1)
        {
            var puls = 0.55 + 0.45 * Math.Max(0, Math.Sin(czas / 110));
            var v = hV * 1.1 * moc * puls;
            ctx.save();
            for (int i = 0; i < 26; i++)
            {
                var f = i / 26.0;
                double px = x + Math.Cos(kat) * v * f, py = y + Math.Sin(kat) * v * f + f * f * hV * 0.9 * moc;
                if (py > 0)
                {
                    // strumień bije w błoto: rozbryzg
                    ctx.fillStyle = "rgba(120,8,6,0.85)";
                    ctx.beginPath(); ctx.ellipse(px, -hV * 0.01, hV * 0.1 * moc, hV * 0.02, 0, 0, Math.PI * 2); ctx.fill();
                    break;
                }
                var r = Math.Max(1, hV * (0.032 - f * 0.018) * moc);
                ctx.fillStyle = i % 3 != 0 ? "rgba(128,8,6,0.9)" : "rgba(170,20,14,0.85)";
                ctx.beginPath(); ctx.ellipse(px, py, r * 1.4, r, kat + f * 0.9, 0, Math.PI * 2); ctx.fill();
            }
            // krople odrywają się z końca strumienia
            for (int i = 0; i < 7; i++)
            {
                var f = ((czas / 380) + i * 0.143) % 1;
                var px = x + Math.Cos(kat) * v * (1 + f * 0.4) + (((i * 37) % 10) / 10.0 - 0.5) * hV * 0.2;
                var py = y + Math.Sin(kat) * v + hV * 0.9 * moc + f * f * hV * 0.8;
                if (py > 0) continue;
                ctx.fillStyle = "rgb(118,8,6)";
                ctx.beginPath(); ctx.ellipse(px, py, Math.Max(1, hV * 0.016), Math.Max(1.5, hV * 0.03), 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Krwawa mgiełka przy rozerwaniu: czerwony obłok rośnie i rzednie (`k` 0…1).</summary>
        static void mgielka(IPlotno ctx, double x, double y, double hV, double k)
        {
            if (k <= 0 || k >= 1) return;
            var R = hV * (0.3 + k * 0.9);
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(150, 12, 8, 0.55 * (1 - k))); g.addColorStop(0.6, Barwa.Rgba(110, 8, 6, 0.25 * (1 - k))); g.addColorStop(1, "rgba(90,6,4,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        }

        /// <summary>Strzępy: kawałki mięsa, skóry z tłuszczem i jelit lecą łukami, zostawiając krwawe smugi (`k` 0…1).</summary>
        static void strzepy(IPlotno ctx, double x, double y, double hV, double k, double ziarno, double moc = 1)
        {
            if (k <= 0 || k >= 1) return;
            ctx.save();
            var n = (int)Math.Floor(9 * moc + 0.5);
            for (int i = 0; i < n; i++)
            {
                double r1 = ((ziarno * 31 + i * 17) % 100) / 100, r2 = ((ziarno * 13 + i * 29) % 100) / 100;
                var a = -Math.PI / 2 + (r1 - 0.5) * 2.6;
                var v = hV * (0.6 + r2 * 1.1) * moc;
                var r = hV * (0.025 + r2 * 0.035);
                // tor do chwili upadku na grunt (y = 0), potem leży
                double kk = k, py = y + Math.Sin(a) * v * kk + kk * kk * hV * 1.6;
                if (py > -r * 0.4)
                {
                    double A = hV * 1.6, B = Math.Sin(a) * v, C = y + r * 0.4;
                    var kz = (-B + Math.Sqrt(Math.Max(0, B * B - 4 * A * C))) / (2 * A);
                    kk = Math.Max(0, Math.Min(k, kz)); py = -r * 0.4;
                }
                var px = x + Math.Cos(a) * v * kk;
                // smuga za kawałkiem
                ctx.strokeStyle = "rgba(110,8,6,0.5)"; ctx.lineWidth = Math.Max(1, r * 0.6);
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.Cos(a) * v * 0.12, py - Math.Sin(a) * v * 0.12 - k * hV * 0.3); ctx.stroke();
                ctx.save(); ctx.translate(px, py); ctx.rotate(kk * 9 + i);
                if (i % 4 == 0)
                {
                    // strzęp jelita: gruba, mokra pętla z ciemnym obrysem
                    for (int w = 0; w < 2; w++)
                    {
                        ctx.strokeStyle = w == 0 ? "rgb(70,14,12)" : "rgb(150,80,76)"; ctx.lineWidth = Math.Max(1.4, w == 0 ? r * 1.15 : r * 0.8); ctx.lineCap = "round";
                        ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.bezierCurveTo(-r * 0.8, -r * 1.6, r * 0.6, r * 1.4, r * 1.5, -r * 0.3); ctx.stroke();
                    }
                }
                else
                {
                    ctx.fillStyle = i % 3 != 0 ? "rgb(112,16,12)" : "rgb(150,40,30)";
                    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.4, -r * 1.1, r * 0.8, -r * 0.5); ctx.quadraticCurveTo(r * 1.2, r * 0.6, 0, r * 0.8); ctx.closePath(); ctx.fill();
                    if (i % 3 == 0) { ctx.fillStyle = "rgb(176,140,80)"; ctx.fillRect(-r * 0.5, -r * 0.4, r * 0.7, r * 0.25); }
                    ctx.fillStyle = "rgba(255,190,170,0.35)"; ctx.fillRect(-r * 0.3, -r * 0.6, r * 0.35, r * 0.15);
                }
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Jelita rozciągnięte między połówkami rozrywanego ciała: zwisający, kołyszący się sznur.</summary>
        static void sznurJelit(IPlotno ctx, (double x, double y) a, (double x, double y) b, double hV, double czas, double k)
        {
            if (k <= 0) return;
            var zwis = hV * (0.25 + 0.2 * Math.Sin(czas / 260)) * k;
            ctx.save();
            ctx.lineCap = "round";
            for (int w = 0; w < 2; w++)
            {
                ctx.strokeStyle = w == 0 ? "rgb(84,20,18)" : "rgb(156,90,86)"; ctx.lineWidth = Math.Max(1.4, w == 0 ? hV * 0.05 : hV * 0.034);
                ctx.beginPath(); ctx.moveTo(a.x, a.y);
                ctx.bezierCurveTo(a.x + (b.x - a.x) * 0.3, a.y + zwis, a.x + (b.x - a.x) * 0.7, b.y + zwis * 1.1, b.x, b.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Rozbryzg krwi na ziemi wokół miejsca rzezi: promieniste smugi i krople (`k` 0…1 — rośnie).</summary>
        static void rozbryzgNaZiemi(IPlotno ctx, double x, double y, double hV, double k, double ziarno)
        {
            if (k <= 0) return;
            ctx.save();
            ctx.fillStyle = "rgba(100,6,4,0.85)";
            for (int i = 0; i < 14; i++)
            {
                double r1 = ((ziarno * 7 + i * 13) % 100) / 100, r2 = ((ziarno * 11 + i * 23) % 100) / 100;
                var s = (r1 < 0.5 ? -1 : 1) * (0.5 + r2) * hV * 1.3 * k;
                var dl = hV * (0.08 + r2 * 0.2) * k;
                ctx.beginPath(); ctx.ellipse(x + s, y + hV * 0.015, dl, Math.Max(1, hV * 0.012), 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        static PozaLudzika trzewia(PozaLudzika p) { p.trzewia = true; return p; }
        static PozaLudzika polowa(PozaLudzika p, string pol) { p.polowa = pol; return p; }
        static PozaLudzika krew(PozaLudzika p, double k) { p.krew = k; return p; }

        static readonly PozaCerbera pozaZab = new PozaCerbera();

        /// <summary>
        /// Cerber zabija: `ctx` w stopach Cerbera, zwrot już ustawiony (pyski w +x). `hC` — wysokość Cerbera, `hV` — wzrost
        /// ofiary, `vx` — gdzie leży ofiara (piksele przed nim), `u` 0…1 — postęp zabijania, `czas` — ms ekranu.
        /// Zwraca pozę, w której rysowano Cerbera (wspólny obiekt).
        /// </summary>
        public static PozaCerbera scenaZabijania(IPlotno ctx, double hC, double hV, double vx, double wariant, double u, double czas)
        {
            var t = czas / 1000;
            var p = pozaZab.Zeruj();
            p.czas = czas; p.oddech = 0.5 + 0.5 * Math.Sin(t * 5); p.szal = 0.4;
            p.ogon = Math.Sin(t * 2.2) * 0.9;
            for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.45 + 0.05 * i; g.paszcza = 0.6; g.wysun = 0.2; }
            var potrzas = Math.Sin(czas / 45);
            // pozy głów przed rysunkiem
            if (wariant == 0)
            {
                var g = p.glowy[1];
                if (u < 0.12) { var k = u / 0.12; g.pochyl = mix(0.3, 0.8, k); g.paszcza = 0.9; g.wysun = mix(0, 0.6, k); }
                else if (u < 0.7) { g.pochyl = 0.35 + potrzas * 0.45; g.paszcza = 0.3; g.wysun = 0.35; }
                else { g.pochyl = mix(0.35, -0.7, zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.3 : 0.9; g.wysun = 0.1; }
            }
            else if (wariant == 1)
            {
                var roz = zakres(u, 0.18, 0.42);
                p.glowy[0].pochyl = u < 0.15 ? mix(0.3, 0.8, u / 0.15) : mix(0.6, -0.4, roz) + (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[0].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[0].wysun = 0.4;
                p.glowy[2].pochyl = u < 0.15 ? mix(0.3, 0.9, u / 0.15) : mix(0.8, 1.3, roz) - (u > 0.42 ? potrzas * 0.3 : 0); p.glowy[2].paszcza = u < 0.15 ? 0.9 : 0.3; p.glowy[2].wysun = mix(0.5, 0.7, roz);
                p.glowy[1].pochyl = -0.3; p.glowy[1].paszcza = 0.8 * dzwon(u, 0.4, 0.7) + 0.2;
                p.deba = 0.12 * roz;
            }
            else if (wariant == 2)
            {
                var g = p.glowy[1];
                if (u < 0.15) { g.pochyl = mix(0.3, 0.85, u / 0.15); g.paszcza = 0.9; g.wysun = 0.6; }
                else if (u < 0.45) { g.pochyl = mix(0.85, -0.8, zakres(u, 0.15, 0.45)); g.paszcza = 0.35; g.wysun = 0.3; }
                else { g.pochyl = -0.8 + 0.1 * Math.Sin(t * 8); g.paszcza = u < 0.75 ? 0.5 + 0.4 * Math.Abs(Math.Sin(t * 9)) : 0.15; g.wysun = 0.1; }
                p.deba = 0.2 * dzwon(u, 0.3, 0.8);
            }
            else if (wariant == 3)
            {
                p.deba = u < 0.22 ? zakres(u, 0, 0.18) * 0.75 : mix(0.75, 0, zakres(u, 0.22, 0.27));
                if (u > 0.3) for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.85 + 0.1 * Math.Sin(t * 9 + i * 2); g.paszcza = 0.3 + 0.6 * Math.Abs(Math.Sin(t * 7 + i * 1.7)); g.wysun = 0.55 + 0.15 * Math.Sin(t * 5 + i); }
            }
            else
            {
                var g = p.glowy[1];
                if (u < 0.12) { g.pochyl = mix(0.3, 0.8, u / 0.12); g.paszcza = 0.9; g.wysun = 0.6; }
                else if (u < 0.42) { g.pochyl = -0.65; g.paszcza = 1; g.wysun = 0.2; }
                else { g.pochyl = -0.4 + potrzas * 0.35 * (1 - zakres(u, 0.7, 0.8)); g.paszcza = u < 0.8 ? 0.25 : 0.7; g.wysun = 0.25; }
            }
            // kałuża krwi rośnie od chwili rany
            var rana = wariant == 3 ? 0.25 : wariant == 4 ? 0.42 : wariant == 1 ? 0.42 : 0.15;
            Ludzik.kaluzaKrwi(ctx, vx, hV * 0.02, hV * (wariant == 3 || wariant == 1 ? 1.45 : 1.1), zakres(u, rana, rana + 0.3), wariant);
            rozbryzgNaZiemi(ctx, vx, hV * 0.02, hV, zakres(u, rana, rana + 0.15), wariant + 3);
            // ofiara na ziemi pod łapą (wariant 3) — przed Cerberem
            if (wariant == 3)
            {
                if (u < 0.25) naZiemi(ctx, vx, hV, Ludzik.pozaCzolga(t, 1.6, 3), 1);
                else
                {
                    naZiemi(ctx, vx, hV, krew(Ludzik.pozaTrup(3), 1), 1, mix(1, 0.6, zakres(u, 0.25, 0.3)));
                    if (u > 0.3) kawalki(ctx, vx, -hV * 0.15, hV, czas, 2.5);
                    mgielka(ctx, vx, -hV * 0.15, hV, zakres(u, 0.24, 0.42));
                    strzepy(ctx, vx, -hV * 0.1, hV, zakres(u, 0.25, 0.5), 5, 1.4);
                }
            }
            var pk = RysCerber.rysujCerbera(ctx, hC, p);
            (double x, double y) m0 = pk.paszcza0, m1 = pk.paszcza1, m2 = pk.paszcza2;
            var t2 = t * 1.0;
            if (wariant == 0)
            {
                if (u < 0.12) naZiemi(ctx, vx, hV, Ludzik.pozaCzolga(t, 1.8, 1), -1);
                else if (u < 0.7)
                {
                    var pl = Ludzik.pozaWPaszczy(t2, 1); if (u > 0.4) pl.trzewia = true;
                    wPaszczy(ctx, m1, hV, pl, Math.PI / 2 + potrzas * 0.5);
                    Ludzik.bryzgKrwi(ctx, m1.x, m1.y, hV, ((u - 0.12) * 12) % 1, -1.2 + potrzas, 2, Math.Floor(u * 12), 0);
                    kapie(ctx, m1, hV, czas, 2.5);
                    if (u > 0.3) tetnica(ctx, m1.x - hV * 0.1, m1.y + hV * 0.15, -2.2 + potrzas * 0.6, hV, czas, 0.9);
                    mgielka(ctx, m1.x, m1.y, hV, zakres(u, 0.14, 0.34));
                    strzepy(ctx, m1.x, m1.y, hV, zakres(u, 0.38, 0.62), 9, 1);
                }
                else if (u < 0.85)
                {
                    var f = zakres(u, 0.7, 0.85);
                    ctx.save(); ctx.translate(mix(m1.x, vx + hV * 0.5, f), mix(m1.y, -hV * 0.1, f) - Math.Sin(f * Math.PI) * hC * 0.5); ctx.rotate(f * 5);
                    Ludzik.rysujLudzika(ctx, hV, trzewia(Ludzik.pozaTrup(1))); ctx.restore();
                }
            }
            else if (wariant == 1)
            {
                (double x, double y) sr = ((m0.x + m2.x) / 2, (m0.y + m2.y) / 2);
                if (u < 0.15) naZiemi(ctx, vx, hV, Ludzik.pozaCzolga(t, 2, 2), -1);
                else if (u < 0.42)
                {
                    wPaszczy(ctx, sr, hV, krew(Ludzik.pozaWPaszczy(t2, 1), 0.6), Math.PI / 2 + potrzas * 0.15);
                    kapie(ctx, sr, hV, czas, 1);
                }
                else if (u < 0.8)
                {
                    wPaszczy(ctx, m0, hV, polowa(Ludzik.pozaWPaszczy(t2, 0.5), "gora"), Math.PI / 2 + 0.7 + potrzas * 0.3);
                    wPaszczy(ctx, m2, hV, polowa(Ludzik.pozaWPaszczy(t2, 0.5), "dol"), Math.PI / 2 - 0.5 - potrzas * 0.3);
                    Ludzik.bryzgKrwi(ctx, sr.x, sr.y, hV * 1.5, zakres(u, 0.42, 0.62), -Math.PI / 2, 3.4, 11, 0);
                    kapie(ctx, m0, hV, czas, 3); kapie(ctx, m2, hV, czas, 3);
                    sznurJelit(ctx, (m0.x + hV * 0.2, m0.y + hV * 0.2), (m2.x - hV * 0.15, m2.y + hV * 0.15), hV, czas, 1 - zakres(u, 0.62, 0.72));
                    mgielka(ctx, sr.x, sr.y, hV * 1.4, zakres(u, 0.42, 0.62));
                    strzepy(ctx, sr.x, sr.y, hV, zakres(u, 0.42, 0.7), 1, 1.6);
                    tetnica(ctx, m0.x + hV * 0.25, m0.y + hV * 0.2, 0.6, hV, czas, 0.8);
                    tetnica(ctx, m2.x - hV * 0.2, m2.y + hV * 0.15, Math.PI - 0.7, hV, czas + 300, 0.7);
                }
                else
                {
                    var f = zakres(u, 0.8, 0.9);
                    naZiemi(ctx, mix(m0.x, vx - hV * 0.5, f), hV, polowa(Ludzik.pozaTrup(2), "gora"), 1);
                    naZiemi(ctx, mix(m2.x, vx + hV * 0.6, f), hV, polowa(Ludzik.pozaTrup(4), "dol"), -1);
                }
            }
            else if (wariant == 2)
            {
                if (u < 0.15) naZiemi(ctx, vx, hV, Ludzik.pozaCzolga(t, 2, 5), -1);
                else if (u < 0.75)
                {
                    var lyk = zakres(u, 0.45, 0.75);
                    var pl = krew(Ludzik.pozaWPaszczy(t2, 1 - lyk * 0.7), 0.9); if (u > 0.55) pl.bezRekiL = true;
                    wPaszczy(ctx, m1, hV, pl, Math.PI / 2 - 1.1 * zakres(u, 0.15, 0.45), 1 - lyk * 0.85);
                    kapie(ctx, m1, hV, czas, 2);
                    if (u > 0.55 && u < 0.75) { Ludzik.bryzgKrwi(ctx, m1.x, m1.y, hV, (u - 0.55) / 0.2, 0.3, 1.8, 21, 0); tetnica(ctx, m1.x, m1.y + hV * 0.05, 1.2, hV, czas, 0.6); }
                    strzepy(ctx, m1.x, m1.y, hV, zakres(u, 0.5, 0.75), 21, 0.8);
                }
                else kapie(ctx, m1, hV, czas, 1);
            }
            else if (wariant == 3)
            {
                kapie(ctx, m0, hV, czas, 1); kapie(ctx, m1, hV, czas, 1); kapie(ctx, m2, hV, czas, 1);
                if (u > 0.22 && u < 0.4) Ludzik.bryzgKrwi(ctx, vx, -hV * 0.1, hV * 1.4, (u - 0.22) / 0.18, -Math.PI / 2, 2.6, 13, 0);
            }
            else
            {
                if (u < 0.12) naZiemi(ctx, vx, hV, Ludzik.pozaCzolga(t, 1.8, 7), -1);
                else if (u < 0.42)
                {
                    // w górę i z powrotem w paszczę
                    var f = zakres(u, 0.12, 0.42);
                    var wys = Math.Sin(f * Math.PI) * hC * 1.1;
                    ctx.save(); ctx.translate(mix(m1.x, m1.x + hV * 0.2, f), m1.y - wys); ctx.rotate(f * 9);
                    var pl = Ludzik.pozaWPaszczy(t2, 1); pl.usta = 1;
                    Ludzik.rysujLudzika(ctx, hV, pl); ctx.restore();
                }
                else if (u < 0.8)
                {
                    var pl = krew(Ludzik.pozaWPaszczy(t2, 0.3), 1); if (u > 0.55) pl.bezGlowy = true;
                    wPaszczy(ctx, m1, hV, pl, Math.PI / 2 + potrzas * 0.4);
                    if (u > 0.55)
                    {
                        // odgryziona głowa leci na ziemię
                        var f = zakres(u, 0.55, 0.7);
                        ctx.save(); ctx.translate(mix(m1.x, vx + hV * 0.9, f), mix(m1.y, -hV * 0.08, f) - Math.Sin(f * Math.PI) * hV * 0.6); Ludzik.rysujOderwanaGlowe(ctx, hV, f * 7); ctx.restore();
                    }
                    Ludzik.bryzgKrwi(ctx, m1.x, m1.y, hV * 1.3, zakres(u, 0.42, 0.62), -1.0, 3, 17, 0);
                    kapie(ctx, m1, hV, czas, 3);
                    if (u > 0.55) tetnica(ctx, m1.x + hV * 0.15, m1.y - hV * 0.1, -0.9, hV, czas, 1.1);
                    mgielka(ctx, m1.x, m1.y, hV, zakres(u, 0.55, 0.72));
                    strzepy(ctx, m1.x, m1.y, hV, zakres(u, 0.55, 0.8), 17, 1);
                }
                else
                {
                    var pl = Ludzik.pozaTrup(5); pl.bezGlowy = true;
                    naZiemi(ctx, vx, hV, pl, 1);
                }
            }
            return p;
        }

        /// <summary>Szczątki po zabójstwie (wariant) — `ctx` w punkcie na gruncie, `a` — krycie (zanikanie), `t` — sekundy.</summary>
        public static void rysujSzczatki(IPlotno ctx, double hV, double wariant, double a, double t, double ziarno)
        {
            if (a <= 0) return;
            ctx.save();
            ctx.globalAlpha = ctx.globalAlpha * a;
            Ludzik.kaluzaKrwi(ctx, 0, hV * 0.02, hV * (wariant == 3 || wariant == 1 ? 1.15 : 0.85), 1, ziarno);
            if (wariant == 0)
            {
                naZiemi(ctx, hV * 0.5, hV, trzewia(Ludzik.pozaTrup(1)), 1);
                ctx.save(); ctx.translate(hV * 0.95, -hV * 0.02); Ludzik.rysujTrzewia(ctx, hV, 0.1); ctx.restore();
            }
            else if (wariant == 1)
            {
                naZiemi(ctx, -hV * 0.5, hV, polowa(Ludzik.pozaTrup(2), "gora"), 1);
                naZiemi(ctx, hV * 0.6, hV, polowa(Ludzik.pozaTrup(4), "dol"), -1);
                ctx.save(); ctx.translate(hV * 0.05, -hV * 0.02); Ludzik.rysujTrzewia(ctx, hV * 1.2, -0.05); ctx.restore();
            }
            else if (wariant == 2)
            {
                // została tylko ręka
                ctx.save(); ctx.translate(hV * 0.2, -hV * 0.06);
                Ludzik.rysujOderwanaReke(ctx, hV, -1.45, 0.9);
                ctx.restore();
            }
            else if (wariant == 3)
            {
                var pl = krew(Ludzik.pozaTrup(3), 1); pl.trzewia = true; pl.bezRekiP = true;
                naZiemi(ctx, 0, hV, pl, 1, 0.6);
                ctx.save(); ctx.translate(hV * -0.75, -hV * 0.01); Ludzik.rysujTrzewia(ctx, hV * 0.9, 0.2); ctx.restore();
                ctx.save(); ctx.translate(hV * 0.7, -hV * 0.01); Ludzik.rysujTrzewia(ctx, hV * 0.9, -0.15); ctx.restore();
                ctx.fillStyle = "rgb(110,10,8)";
                for (int i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-hV * 0.8 + i * hV * 0.3, -hV * 0.02, hV * 0.05, hV * 0.025, i, 0, Math.PI * 2); ctx.fill(); }
            }
            else
            {
                var pl = Ludzik.pozaTrup(5); pl.bezGlowy = true;
                naZiemi(ctx, 0, hV, pl, 1);
                // odgryziona głowa obok
                ctx.save(); ctx.translate(hV * 0.9, -hV * 0.06);
                Ludzik.rysujOderwanaGlowe(ctx, hV, 1.9);
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Krótki opis sposobu (do kroniki i testów).</summary>
        public static readonly string[] SPOSOBY_ZABIJANIA = { "szarpie i ciska trupem", "rozrywa na pół", "połyka w całości", "miażdży łapą i żre", "podrzuca i chwyta w paszczę" };
    }
}
