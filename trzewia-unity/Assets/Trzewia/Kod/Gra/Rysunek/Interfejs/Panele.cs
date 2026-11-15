// Port: alpha-1/src/render/panele.ts — tła pod zasobami, mocami, medalionami postaci, kroniką i przyciskami
// (placeholdery w kodzie do podmiany przez grafika): kamień w złotej obwódce, płótno obszyte ściegiem, przegródki.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Panele
    {
        static Styl ZLOTO(double a) => Barwa.Rgba(204, 160, 92, a);

        /// <summary>Ścieżka prostokąta z zaokrąglonymi rogami.</summary>
        public static void zaokraglony(IPlotno ctx, double x, double y, double w, double h, double r)
        {
            var rr = Math.Max(0, Math.Min(r, Math.Min(w / 2, h / 2)));
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        }

        /// <summary>Tani skrót liczby — stałe ziarno faktury (rysunek nie sięga po los gry).</summary>
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        static double round(double v) => Math.Floor(v + 0.5);

        /// <summary>Kamienna tablica w złotej obwódce — tło zasobów, mocy, dłoni oddania i panelu przycisków.</summary>
        public static void panelKamien(IPlotno ctx, double x, double y, double w, double h, double r = 7)
        {
            ctx.save();
            // cień pod tablicą
            ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
            zaokraglony(ctx, x, y, w, h, r);
            var g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, "rgba(46,37,31,0.94)"); g.addColorStop(1, "rgba(22,17,14,0.94)");
            ctx.fillStyle = g; ctx.fill();
            ctx.shadowColor = "transparent";
            // ziarno kamienia: kilka jaśniejszych i ciemniejszych plamek
            ctx.save(); ctx.clip();
            for (int i = 0; i < Math.Min(60, (w * h) / 220); i++)
            {
                double px = x + los(i * 3 + round(x)) * w, py = y + los(i * 7 + round(y)) * h;
                ctx.fillStyle = los(i) > 0.5 ? "rgba(120,104,86,0.08)" : "rgba(0,0,0,0.12)";
                ctx.beginPath(); ctx.arc(px, py, 1 + los(i * 11) * 3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            // fazowanie: jasna krawędź u góry
            ctx.strokeStyle = "rgba(255,236,200,0.08)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5); ctx.stroke();
            // podwójna obwódka: złota na zewnątrz, ciemna wewnątrz
            zaokraglony(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
            ctx.strokeStyle = ZLOTO(0.7); ctx.lineWidth = 1.4; ctx.stroke();
            zaokraglony(ctx, x + 3.5, y + 3.5, w - 7, h - 7, Math.Max(2, r - 3));
            ctx.strokeStyle = "rgba(96,70,40,0.75)"; ctx.lineWidth = 1; ctx.stroke();
            // nity w rogach
            if (w > 40 && h > 24)
            {
                foreach (var (nx, ny) in new[] { (x + 6, y + 6), (x + w - 6, y + 6), (x + 6, y + h - 6), (x + w - 6, y + h - 6) })
                {
                    ctx.fillStyle = ZLOTO(0.85); ctx.beginPath(); ctx.arc(nx, ny, 1.6, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        /// <summary>Płótno obszyte ściegiem — tło medalionów postaci.</summary>
        public static void panelPlotno(IPlotno ctx, double x, double y, double w, double h)
        {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
            zaokraglony(ctx, x, y, w, h, 4);
            var g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, "rgba(112,92,66,0.96)"); g.addColorStop(1, "rgba(86,70,50,0.96)");
            ctx.fillStyle = g; ctx.fill();
            ctx.shadowColor = "transparent";
            ctx.save(); ctx.clip();
            // splot: osnowa i wątek co 3 px, nierówne jak w samodziale
            ctx.lineWidth = 1;
            for (var yy = y + 1; yy < y + h; yy += 3) { ctx.strokeStyle = Barwa.Rgba(40, 28, 16, 0.14 + 0.1 * los(round(yy))); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
            for (var xx = x + 1; xx < x + w; xx += 3) { ctx.strokeStyle = Barwa.Rgba(214, 190, 150, 0.05 + 0.06 * los(round(xx) * 5)); ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
            // przetarcia i przybrudzenia ku brzegom
            var v = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.Min(w, h) * 0.2, x + w / 2, y + h / 2, Math.Max(w, h) * 0.7);
            v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(20,12,6,0.45)");
            ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
            ctx.restore();
            // obszycie: ścieg przerywaną nicią i brzeg tkaniny
            zaokraglony(ctx, x + 4, y + 4, w - 8, h - 8, 3);
            ctx.setLineDash(4, 3); ctx.strokeStyle = "rgba(222,196,146,0.55)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash();
            zaokraglony(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
            ctx.strokeStyle = "rgba(40,26,14,0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        }

        /// <summary>Przegródki panelu przycisków: osobna wnęka na każdy przycisk (środek, promień).</summary>
        public static void przegrodki(IPlotno ctx, IEnumerable<(double x, double y, double r)> wneki)
        {
            ctx.save();
            foreach (var b in wneki)
            {
                var s = b.r * 1.08;
                zaokraglony(ctx, b.x - s, b.y - s, s * 2, s * 2, 5);
                var g = ctx.createLinearGradient(0, b.y - s, 0, b.y + s);
                g.addColorStop(0, "rgba(8,6,5,0.55)"); g.addColorStop(1, "rgba(40,32,26,0.35)");
                ctx.fillStyle = g; ctx.fill();
                ctx.strokeStyle = ZLOTO(0.45); ctx.lineWidth = 1; ctx.stroke();
            }
            ctx.restore();
        }
    }
}
