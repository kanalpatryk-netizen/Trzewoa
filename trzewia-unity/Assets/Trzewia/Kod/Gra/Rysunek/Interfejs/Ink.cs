// Port: alpha-1/src/render/ink.ts, render/palette.ts, grafiki/grafiki.ts, render/stany.ts — narzędzia rysunku
// interfejsu: kroje, kreskowanie, drżąca kreska, ryte tytuły, nacięcia, panele z tynku, akapity; paleta; własne grafiki;
// trzy stany postaci na karcie.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Ink
    {
        public const string SERIF = Fonts.KROJ;
        public const string SERIF_TYTUL = Fonts.KROJ_TYTUL;
        /// <summary>Alpha 1: pismo odręczne księgi pod płytą.</summary>
        public const string SERIF_PISMO = Fonts.KROJ_PISMO;

        /// <summary>Liczba w napisie (font, rgba) — jak w JS.</summary>
        public static string S(double v) => Js.Js.S(v);

        /// <summary>Kreskowanie jako wzór — te same ukośne linie, co w skale.</summary>
        static readonly Dictionary<string, CanvasPattern> wzory = new Dictionary<string, CanvasPattern>();
        public static Styl wzorKreski(IPlotno ctx, string kolor, double odstep = 5, double grubosc = 1)
        {
            var klucz = kolor + "|" + S(odstep) + "|" + S(grubosc);
            if (wzory.TryGetValue(klucz, out var gotowy)) return gotowy;
            var c = Plotno.Nowe((int)odstep, (int)odstep);
            var g = c;
            g.strokeStyle = kolor;
            g.lineWidth = grubosc;
            g.beginPath();
            g.moveTo(-1, odstep); g.lineTo(odstep, -1);
            g.moveTo(1, odstep + 1); g.lineTo(odstep + 1, 1);
            g.stroke();
            var p = ctx.createPattern(c, "repeat");
            if (p != null) { wzory[klucz] = p; return p; }
            return kolor;
        }

        /// <summary>Linia rysowana drżącą ręką — nic w tej grze nie jest idealnie proste.</summary>
        public static void kreska(IPlotno ctx, double x1, double y1, double x2, double y2, double amp = 1.2, double krok = 14)
        {
            double dx = x2 - x1, dy = y2 - y1;
            var dl = Math.Sqrt(dx * dx + dy * dy);
            var n = Math.Max(2, (int)Math.Floor(dl / krok + 0.5));
            ctx.beginPath();
            for (int i = 0; i <= n; i++)
            {
                var t = (double)i / n;
                double nx = -dy / dl, ny = dx / dl;
                var drgnienie = (JsM.Sin(t * 9.1 + x1 * 0.05) + JsM.Sin(t * 21.7 + y1 * 0.07)) * 0.5 * amp;
                double px = x1 + dx * t + nx * drgnienie, py = y1 + dy * t + ny * drgnienie;
                if (i == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        /// <summary>Tło ekranów poza grą: ściana krypty — ciemny tynk w świetle lampki, ciemność w kątach oddycha.</summary>
        public static void tloSadzy(IPlotno ctx, double w, double h, double t) =>
            Fresk.scianaKrypty(ctx, w, h, t, 0.5 + 0.5 * JsM.Sin(t * 0.0006));

        /// <summary>Ryty tytuł: rowek cienia, potem światło na krawędzi liter.</summary>
        public static void tytulRyty(IPlotno ctx, string tekst, double x, double y, double rozmiar, double alfa = 1)
        {
            ctx.save();
            ctx.textAlign = "center";
            ctx.font = $"600 {S(rozmiar)}px {SERIF_TYTUL}";
            ctx.fillStyle = Paleta.rgba("#000000", 0.8 * alfa);
            ctx.fillText(tekst, x + rozmiar * 0.02, y + rozmiar * 0.035);
            ctx.fillStyle = Paleta.rgba(BARWA.atramentMocny, alfa);
            ctx.fillText(tekst, x, y);
            ctx.restore();
        }

        /// <summary>Podkreślenie w stylu nacięcia rylcem.</summary>
        public static void naciecie(IPlotno ctx, double x, double y, double szer, double alfa = 0.6)
        {
            ctx.save();
            ctx.strokeStyle = Paleta.rgba(BARWA.atrament, alfa);
            ctx.lineWidth = 1;
            kreska(ctx, x - szer / 2, y, x + szer / 2, y, 0.8, 18);
            ctx.restore();
        }

        /// <summary>Panel: tablica ciemnego tynku z malowanym brzegiem — karta wsunięta w ścianę krypty.</summary>
        public static void panel(IPlotno ctx, double x, double y, double w, double h, double alfa = 0.94) =>
            Fresk.tablica(ctx, x, y, w, h, false, Math.Min(1, alfa + 0.06));

        /// <summary>Tekst łamany na akapit o zadanej szerokości. Zwraca liczbę linii.</summary>
        public static int akapit(IPlotno ctx, string tekst, double x, double y, double maxW, double lh, string wyrownanie = "left")
        {
            var slowa = tekst.Split(' ');
            var linia = "";
            var yy = y;
            int n = 0;
            ctx.textAlign = wyrownanie;
            foreach (var s in slowa)
            {
                var test = linia != "" ? linia + " " + s : s;
                if (ctx.measureText(test).width > maxW && linia != "")
                {
                    ctx.fillText(linia, x, yy);
                    linia = s; yy += lh; n++;
                }
                else linia = test;
            }
            if (linia != "") { ctx.fillText(linia, x, yy); n++; }
            return n;
        }

        /// <summary>Ile linii zajmie akapit — do policzenia wysokości przed rysowaniem.</summary>
        public static int linieAkapitu(IPlotno ctx, string tekst, double maxW)
        {
            var slowa = tekst.Split(' ');
            var linia = "";
            int n = 0;
            foreach (var s in slowa)
            {
                var test = linia != "" ? linia + " " + s : s;
                if (ctx.measureText(test).width > maxW && linia != "") { linia = s; n++; }
                else linia = test;
            }
            return linia != "" ? n + 1 : n;
        }
    }

    /// <summary>Paleta (render/palette.ts): barwy są w nastawach, tu tylko narzędzia.</summary>
    public static class Paleta
    {
        public static Styl rgba(string hex, double a)
        {
            var n = Convert.ToInt32(hex.Substring(1), 16);
            return Barwa.Rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
        }

        /// <summary>Barwa atramentu zmienia się z głębokością: kość na górze, czerwień na dnie.</summary>
        public static Styl atramentGlebi(double d, double a = 1)
        {
            var A = ATRAMENT_GLEBI;
            var k = 1 - d * A.przyciemnienie;
            int c(int i) => Js.Js.ToInt32((A.gora[i] - d * A.spadek[i]) * k);
            return Barwa.Rgba(c(0), c(1), c(2), a);
        }
    }

    /// <summary>
    /// Własne grafiki (grafiki/grafiki.ts): w TS obrazki z `src/grafiki/pliki/` podmieniały rysunki gry. Folder jest
    /// pusty, więc tu zawsze „brak obrazka” — wołający rysuje swoją rycinę (jak w TS).
    /// </summary>
    public static class Grafiki
    {
        public static bool maGrafike(string klucz) => false;
        public static string? pierwszaGrafika(params string[] klucze) => null;
        public static bool rysujGrafike(IPlotno ctx, string klucz, double x, double y, double wys) => false;
    }

    public static class Stany
    {
        /// <summary>
        /// Trzy stany, które decydują o wszystkim: głód, oddanie, szaleństwo — wypełniające się znaki (kropla, płomień,
        /// spirala), jak karta z bestiariusza, a nie tabelka z liczbami.
        /// </summary>
        public static void rysujStany(IPlotno ctx, Creature c, double x, double y, double s, double? odstepN = null)
        {
            var odstep = odstepN ?? s * 2.1;
            var pola = new (string etykieta, double v, double[] barwa, string ksztalt)[]
            {
                ("głód", Math.Min(1, c.hunger), new double[] { 214, 120, 96 }, "kropla"),
                ("wiara", Math.Min(1, c.devotion), new double[] { 238, 214, 160 }, "plomien"),
                ("obłęd", Math.Min(1, c.mad), new double[] { 190, 170, 220 }, "spirala"),
            };
            for (int i = 0; i < pola.Length; i++)
            {
                var p = pola[i];
                var cx = x + i * odstep;
                ctx.save();
                ctx.translate(cx, y);
                void sciezka()
                {
                    ctx.beginPath();
                    if (p.ksztalt == "kropla")
                    {
                        ctx.moveTo(0, -s * 0.62);
                        ctx.bezierCurveTo(s * 0.52, 0, s * 0.42, s * 0.6, 0, s * 0.6);
                        ctx.bezierCurveTo(-s * 0.42, s * 0.6, -s * 0.52, 0, 0, -s * 0.62);
                    }
                    else if (p.ksztalt == "plomien")
                    {
                        ctx.moveTo(0, s * 0.6);
                        ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 0.2, -s * 0.2, 0, -s * 0.66);
                        ctx.bezierCurveTo(s * 0.26, -s * 0.16, s * 0.5, s * 0.2, 0, s * 0.6);
                    }
                    else
                    {
                        for (double a = 0; a < 7.4; a += 0.16)
                        {
                            var r = s * 0.09 * a;
                            double px = JsM.Cos(a) * r, py = JsM.Sin(a) * r;
                            if (a == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        }
                    }
                }
                if (p.ksztalt != "spirala")
                {
                    // znak napełnia się od dołu
                    ctx.save();
                    sciezka(); ctx.clip();
                    ctx.fillStyle = Barwa.Rgba(p.barwa[0], p.barwa[1], p.barwa[2], 0.55);
                    ctx.fillRect(-s, s * 0.6 - s * 1.25 * p.v, s * 2, s * 1.4);
                    ctx.restore();
                }
                else
                {
                    ctx.strokeStyle = Barwa.Rgba(p.barwa[0], p.barwa[1], p.barwa[2], 0.2 + p.v * 0.75);
                    ctx.lineWidth = 0.9 + p.v * 1.4;
                    sciezka(); ctx.stroke();
                }
                ctx.strokeStyle = Barwa.Rgba(226, 212, 186, p.ksztalt == "spirala" ? 0.3 : 0.75);
                ctx.lineWidth = 1.1;
                if (p.ksztalt != "spirala") { sciezka(); ctx.stroke(); }
                ctx.textAlign = "center";
                ctx.font = $"italic {Ink.S(Math.Max(12, s * 0.62))}px {Ink.SERIF}";
                ctx.fillStyle = "rgba(200,188,166,0.78)";
                ctx.fillText(p.etykieta, 0, s * 1.5);
                ctx.restore();
            }
        }
    }
}
