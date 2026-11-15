// Port: alpha-1/src/cutscene/art/common.ts — wspólne narzędzia rycin przerywników i tablic atlasu.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using static Trzewia.Nastawy.NastawyBarwy;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Płótno ryciny: kontekst, wymiary, czas (ms), postęp sceny 0..1, numer linijki narracji i postęp w niej.</summary>
    public sealed class PlotnoRyciny
    {
        public IPlotno ctx = null!;
        public double w, h;
        /// <summary>czas w ms — do drgania, migotania i oddechu</summary>
        public double t;
        /// <summary>postęp całej sceny 0..1, liczony z tego, ile narracji już padło</summary>
        public double p;
        /// <summary>numer linijki narracji, która właśnie leci</summary>
        public double takt;
        /// <summary>postęp w obrębie tej linijki 0..1</summary>
        public double taktP;
        public PlotnoRyciny Kopia() => (PlotnoRyciny)MemberwiseClone();
    }

    public static class Ryciny
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);

        /// <summary>Wypełnienie kształtu kreskowaniem pod zadanym kątem — podstawa każdej ryciny.</summary>
        public static void kreskuj(IPlotno ctx, Path2D ksztalt, double kat, double odstep, Styl kolor, double grubosc = 1)
        {
            ctx.save();
            ctx.clip(ksztalt);
            ctx.strokeStyle = kolor;
            ctx.lineWidth = grubosc;
            const double d = 4000;
            ctx.translate(0, 0);
            ctx.beginPath();
            double kos = JsM.Cos(kat), sin = JsM.Sin(kat);
            for (var i = -d; i < d; i += odstep)
            {
                ctx.moveTo(-sin * d + kos * i, kos * d + sin * i);
                ctx.lineTo(sin * d + kos * i, -kos * d + sin * i);
            }
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Kropkowanie — do faktur miękkich: grzybni, dymu, zwłok.</summary>
        public static void kropkuj(IPlotno ctx, Path2D ksztalt, double gestosc, Styl kolor, double ziarno = 1)
        {
            ctx.save();
            ctx.clip(ksztalt);
            ctx.fillStyle = kolor;
            var n = Math.Floor(gestosc + 0.5);
            for (var i = 0; i < n; i++)
            {
                var x = pseudo(i * 2.3 + ziarno) * 4000 - 500;
                var y = pseudo(i * 5.7 + ziarno * 3) * 3000 - 400;
                var r = 0.5 + pseudo(i * 1.1 + ziarno) * 1.1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Powtarzalny „szum” bez losowości — rysunek ma być ten sam przy każdym otwarciu.</summary>
        public static double pseudo(double n)
        {
            var s = JsM.Sin(n * 127.1 + 311.7) * 43758.5453;
            return s - Math.Floor(s);
        }

        /// <summary>Kontur rysowany na oczach: pokazuje tylko pierwsze `ulamek` punktów.</summary>
        public static void obrysPostep(IPlotno ctx, List<(double x, double y)> punkty, Styl kolor, double grubosc, double ulamek)
        {
            var ile = (int)Math.Max(2, Math.Floor(punkty.Count * Math.Max(0, Math.Min(1, ulamek)) + 0.5));
            obrys(ctx, punkty.GetRange(0, Math.Min(ile, punkty.Count)), kolor, grubosc, false);
        }

        /// <summary>Kontur drżącą kreską po zadanych punktach.</summary>
        public static void obrys(IPlotno ctx, List<(double x, double y)> punkty, Styl kolor, double grubosc = 1.4, bool zamknij = false)
        {
            ctx.save();
            ctx.strokeStyle = kolor;
            ctx.lineWidth = grubosc;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.beginPath();
            for (int i = 0; i < punkty.Count; i++)
            {
                var (x, y) = punkty[i];
                var dx = (pseudo(i * 3.1) - 0.5) * 1.6;
                var dy = (pseudo(i * 7.3) - 0.5) * 1.6;
                if (i == 0) ctx.moveTo(x + dx, y + dy);
                else ctx.lineTo(x + dx, y + dy);
            }
            if (zamknij) ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Mała sylwetka mieszkańca — ta sama kreska, co w grze. typ: 'goblin' | 'kowal' | 'trol' | 'przadka'.</summary>
        public static void sylwetka(IPlotno ctx, double x, double y, double h, string typ = "goblin", double alfa = 1)
        {
            var P = new Path2D();
            if (typ == "goblin")
            {
                P.moveTo(x - h * 0.22, y);
                P.quadraticCurveTo(x - h * 0.3, y - h * 0.7, x, y - h * 0.74);
                P.quadraticCurveTo(x + h * 0.26, y - h * 0.76, x + h * 0.22, y);
                P.closePath();
                P.moveTo(x + h * 0.1, y - h * 0.98);
                P.arc(x + h * 0.08, y - h * 0.88, h * 0.13, 0, Math.PI * 2);
            }
            else if (typ == "kowal")
            {
                P.rect(x - h * 0.3, y - h * 0.55, h * 0.6, h * 0.55);
                P.moveTo(x - h * 0.34, y - h * 0.86);
                P.lineTo(x + h * 0.34, y - h * 0.86);
                P.lineTo(x + h * 0.22, y - h * 0.99);
                P.lineTo(x - h * 0.22, y - h * 0.99);
                P.closePath();
            }
            else if (typ == "trol")
            {
                P.moveTo(x - h * 0.4, y);
                P.quadraticCurveTo(x - h * 0.5, y - h * 0.6, x, y - h);
                P.quadraticCurveTo(x + h * 0.5, y - h * 0.6, x + h * 0.4, y);
                P.closePath();
            }
            else
            {
                P.ellipse(x, y - h * 0.4, h * 0.26, h * 0.2, 0, 0, Math.PI * 2);
                for (int i = 0; i < 4; i++)
                {
                    var a = -0.4 - i * 0.42;
                    P.moveTo(x, y - h * 0.42);
                    P.lineTo(x + JsM.Cos(a) * h * 0.62, y - h * 0.42 + JsM.Sin(-a) * h * 0.5);
                    P.moveTo(x, y - h * 0.42);
                    P.lineTo(x - JsM.Cos(a) * h * 0.62, y - h * 0.42 + JsM.Sin(-a) * h * 0.5);
                }
            }
            ctx.save();
            ctx.globalAlpha *= alfa;          // mnożymy, żeby nie kasować przenikania całej sceny
            ctx.fillStyle = rgba("#100b0a", 0.92);
            ctx.fill(P);
            kreskuj(ctx, P, 0.7, 3, rgba(BARWA.atrament, 0.85), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
            ctx.lineWidth = 1.1;
            ctx.stroke(P);
            ctx.restore();
        }

        /// <summary>Poświata źródła światła — jedyny kolor, jaki wolno wpuścić.</summary>
        public static void blask(IPlotno ctx, double x, double y, double r, string kolor, double moc = 0.5)
        {
            var g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, rgba(kolor, moc));
            g.addColorStop(1, rgba(kolor, 0));
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
        }
    }
}
