// Port: alpha-1/src/render/ksiega.ts — księga pod płytą (Alpha 1): otwarta księga w czerwonej oprawie z mosiężnymi
// narożnikami i zakładką; lewa karta „Twój lud” (trzy medaliony ról — miniatura postaci, liczba, złoty łuk zaznaczonych),
// prawa „Zasoby” (wiara, krew, jedzenie, żelazo, złoto, oddanie) pisane odręcznym pismem; przy jedzeniu czerwona pieczęć
// „+” — Nakarm. Wszystko rysowane w kodzie (placeholder do podmiany przez grafika). Zwraca pola do kliknięcia.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyKruszce;
using static Trzewia.Nastawy.NastawyWygladNastroj;
using SLud = Trzewia.Symulacja.Lud;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Pole księgi do kliknięcia: 'rola' (medalion) albo 'nakarm' (pieczęć).</summary>
    public sealed class PoleKsiegi { public string akcja = ""; public string? rola; public double x, y, w, h; }

    public static class Ksiega
    {
        /// <summary>Atrament (sepia) i barwy liczb zasobów.</summary>
        public static readonly (double r, double g, double b) ATRAMENT = (44, 28, 16);
        static readonly Dictionary<string, (double r, double g, double b)> BARWA_ZASOBU = new Dictionary<string, (double, double, double)>
        {
            ["wiara"] = (128, 84, 12), ["krew"] = (138, 22, 14), ["jedzenie"] = (58, 82, 26), ["zelazo"] = (52, 62, 76), ["zloto"] = (150, 104, 14), ["oddanie"] = (110, 74, 18),
        };
        static readonly (double r, double g, double b) CZERWIEN = (150, 26, 16);
        public static Styl rgbA((double r, double g, double b) k, double a) => Barwa.Rgba(k.r, k.g, k.b, a);

        /// <summary>Powtarzalny „los” 0..1 z liczby.</summary>
        public static double los(double n)
        {
            unchecked
            {
                int x = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                x = (x ^ (int)((uint)x >> 13)) * (int)0xc2b2ae35;
                return (uint)(x ^ (int)((uint)x >> 16)) / 4294967296.0;
            }
        }
        static int hashTekstu(string t)
        {
            int h = 7;
            unchecked { for (int i = 0; i < t.Length; i++) h = h * 31 + t[i]; }
            return h;
        }

        /// <summary>
        /// Napis odręcznym pismem: lekko przechylony (każdy napis po swojemu, ale zawsze tak samo), z rozlanym
        /// atramentem i cieniem. Zwraca szerokość napisu.
        /// </summary>
        public static double pismo(IPlotno ctx, string tekst, double x, double y, double rozmiar, (double r, double g, double b)? barwa = null,
            string? align = null, double? maxW = null, double? alfa = null, Styl? blask = null, double? blaskR = null)
        {
            var b = barwa ?? ATRAMENT;
            ctx.save();
            ctx.font = $"{Js.Js.S(rozmiar)}px {Ink.SERIF_PISMO}";
            ctx.textAlign = align ?? "left";
            ctx.textBaseline = "alphabetic";
            var t = tekst;
            if (maxW is { } mw && mw != 0) while (ctx.measureText(t).width > mw && t.Length > 3) t = t.Substring(0, t.Length - 1);
            double szer = ctx.measureText(t).width, a = alfa ?? 1, przechyl = (los(hashTekstu(t)) - 0.5) * 0.018;
            ctx.translate(x, y);
            ctx.rotate(przechyl);
            if (blask != null)
            {
                ctx.shadowColor = blask.Value; ctx.shadowBlur = blaskR ?? 8;
                ctx.fillStyle = rgbA(b, 0.9 * a); ctx.fillText(t, 0, 0);
            }
            ctx.shadowColor = rgbA(b, 0.35 * a); ctx.shadowBlur = Math.Max(0.6, rozmiar * 0.05);
            ctx.fillStyle = rgbA(b, 0.88 * a); ctx.fillText(t, 0, 0);
            ctx.shadowBlur = 0;
            ctx.fillStyle = rgbA(b, 0.22 * a); ctx.fillText(t, rozmiar * 0.025, rozmiar * 0.02);
            ctx.restore();
            return szer;
        }

        /// <summary>Nagłówek karty: czerwony inicjał, reszta atramentem, pod spodem dwie kreski z rombem i kropkami.</summary>
        public static void naglowekKarty(IPlotno ctx, string tekst, double x, double y, double rozmiar, double szerKarty)
        {
            ctx.save();
            var reszta = tekst.Substring(1);
            var inicjal = tekst.Substring(0, 1);
            ctx.font = $"{Js.Js.S(rozmiar * 1.35)}px {Ink.SERIF_PISMO}";
            var wInicjalu = ctx.measureText(inicjal).width;
            ctx.font = $"{Js.Js.S(rozmiar)}px {Ink.SERIF_PISMO}";
            double wReszty = ctx.measureText(reszta).width, x0 = x - (wInicjalu + wReszty) / 2;
            pismo(ctx, inicjal, x0, y, rozmiar * 1.35, CZERWIEN);
            pismo(ctx, reszta, x0 + wInicjalu, y, rozmiar);
            double ly = y + rozmiar * 0.42, d = Math.Min(szerKarty * 0.26, (wInicjalu + wReszty) * 0.75);
            ctx.strokeStyle = "rgba(150,30,18,0.7)"; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - d, ly); ctx.quadraticCurveTo(x - d * 0.5, ly - 2.5, x - 5, ly);
            ctx.moveTo(x + 5, ly); ctx.quadraticCurveTo(x + d * 0.5, ly - 2.5, x + d, ly);
            ctx.stroke();
            ctx.fillStyle = "rgba(150,30,18,0.8)";
            ctx.beginPath(); ctx.moveTo(x, ly - 3); ctx.lineTo(x + 3, ly); ctx.lineTo(x, ly + 3); ctx.lineTo(x - 3, ly); ctx.closePath(); ctx.fill();
            foreach (var s in new double[] { -1, 1 }) { ctx.beginPath(); ctx.arc(x + s * (d + 2.5), ly, 1.3, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }

        static void zaokraglony(IPlotno ctx, double x, double y, double w, double h, double r)
        {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        static readonly Dictionary<string, IPlotno> okladki = new Dictionary<string, IPlotno>();
        static double round(double v) => Math.Floor(v + 0.5);

        /// <summary>
        /// Okładka z kartami (w × h — same karty, `oprawa` — grubość okładki wokół), rysowana raz na rozmiar
        /// i trzymana w pamięci: skóra z ziarnem, złocona linia, stos kartek, papier z włóknami i plamami,
        /// cień przy grzbiecie, mosiężne narożniki i czerwona zakładka zwisająca spod księgi.
        /// </summary>
        static IPlotno okladka(double w, double h, double oprawa)
        {
            var klucz = $"{Js.Js.S(round(w))}x{Js.Js.S(round(h))}x{Js.Js.S(oprawa)}";
            if (okladki.TryGetValue(klucz, out var gotowa)) return gotowa;
            if (okladki.Count > 6) { foreach (var p in okladki.Values) p.Dispose(); okladki.Clear(); }
            double sk = 2, W = w + oprawa * 2, H = h + oprawa * 2;
            var c = Plotno.Nowe((int)Math.Ceiling(W * sk), (int)Math.Ceiling((H + 12) * sk));
            var g = c.getContext("2d");
            g.scale(sk, sk);
            // skóra
            zaokraglony(g, 0, 0, W, H, 9);
            var skora = g.createLinearGradient(0, 0, 0, H);
            skora.addColorStop(0, "#5c2619"); skora.addColorStop(0.5, "#47190f"); skora.addColorStop(1, "#2c0e08");
            g.fillStyle = skora; g.fill();
            g.save(); g.clip();
            for (int i = 0; i < (W * H) / 40; i++)
            {
                double x = los(i * 3 + 1) * W, y = los(i * 5 + 2) * H;
                g.fillStyle = los(i * 7) > 0.5 ? "rgba(255,200,160,0.05)" : "rgba(0,0,0,0.12)";
                g.fillRect(x, y, 1 + los(i) * 1.5, 1);
            }
            var blask = g.createRadialGradient(W * 0.3, H * 0.2, 4, W * 0.3, H * 0.2, W * 0.6);
            blask.addColorStop(0, "rgba(255,190,140,0.10)"); blask.addColorStop(1, "rgba(255,190,140,0)");
            g.fillStyle = blask; g.fillRect(0, 0, W, H);
            g.restore();
            zaokraglony(g, 3.5, 3.5, W - 7, H - 7, 7); g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 1.2; g.stroke();
            zaokraglony(g, 5, 5, W - 10, H - 10, 6); g.strokeStyle = "rgba(214,170,96,0.45)"; g.lineWidth = 0.9; g.stroke();
            zaokraglony(g, 0.5, 0.5, W - 1, H - 1, 9); g.strokeStyle = "rgba(16,4,2,0.9)"; g.lineWidth = 1; g.stroke();
            // cień grzbietu na okładce
            var gx = W / 2; var cg = g.createLinearGradient(gx - 10, 0, gx + 10, 0);
            cg.addColorStop(0, "rgba(0,0,0,0)"); cg.addColorStop(0.5, "rgba(0,0,0,0.45)"); cg.addColorStop(1, "rgba(0,0,0,0)");
            g.fillStyle = cg; g.fillRect(gx - 10, 0, 20, H);
            // stos kartek pod wierzchnią kartą
            for (int i = 4; i >= 1; i--)
            {
                var d = i * 1.3;
                g.fillStyle = i % 2 != 0 ? "#bda77c" : "#a68f64";
                g.beginPath(); g.moveTo(oprawa - d, oprawa + 3); g.lineTo(gx - 2, oprawa + 4); g.lineTo(gx - 2, oprawa + h + d);
                g.quadraticCurveTo(oprawa + w * 0.25, oprawa + h + d + 2, oprawa - d, oprawa + h + d - 1); g.closePath(); g.fill();
                g.beginPath(); g.moveTo(W - oprawa + d, oprawa + 3); g.lineTo(gx + 2, oprawa + 4); g.lineTo(gx + 2, oprawa + h + d);
                g.quadraticCurveTo(W - oprawa - w * 0.25, oprawa + h + d + 2, W - oprawa + d, oprawa + h + d - 1); g.closePath(); g.fill();
            }
            // dwie karty
            var pol = w / 2;
            foreach (var strona in new double[] { -1, 1 })
            {
                var xb = strona < 0 ? oprawa : oprawa + w; var karta = new Path2D();
                karta.moveTo(xb, oprawa + 1); karta.quadraticCurveTo((xb + gx) / 2, oprawa - 4, gx, oprawa + 3);
                karta.lineTo(gx, oprawa + h - 1); karta.quadraticCurveTo((xb + gx) / 2, oprawa + h + 3, xb, oprawa + h); karta.closePath();
                var papier = g.createLinearGradient(xb, 0, gx, 0);
                papier.addColorStop(0, "#cdb489"); papier.addColorStop(0.12, "#e3d1aa"); papier.addColorStop(0.6, "#e9dbb8");
                papier.addColorStop(0.9, "#d6c196"); papier.addColorStop(1, "#a88d60");
                g.fillStyle = papier; g.fill(karta);
                g.save(); g.clip(karta);
                var x0 = Math.Min(xb, gx);
                g.lineWidth = 0.6;
                for (int i = 0; i < (pol * h) / 120; i++)            // włókna papieru
                {
                    double n = i * 13 + (strona < 0 ? 0 : 7777), x = x0 + los(n) * pol, y = oprawa + los(n + 1) * h;
                    double kat = los(n + 2) * Math.PI, dl = 3 + los(n + 3) * 9;
                    g.strokeStyle = los(n + 4) > 0.5 ? "rgba(120,88,48,0.06)" : "rgba(255,250,232,0.10)";
                    g.beginPath(); g.moveTo(x, y); g.lineTo(x + JsM.Cos(kat) * dl, y + JsM.Sin(kat) * dl * 0.3); g.stroke();
                }
                for (int i = 0; i < 16; i++)                         // plamy (dwie duże)
                {
                    double n = i * 29 + (strona < 0 ? 31 : 5555), x = x0 + los(n) * pol, y = oprawa + los(n + 1) * h;
                    var r = 2 + los(n + 2) * (i < 2 ? 26 : 8); var pl = g.createRadialGradient(x, y, 0, x, y, r);
                    pl.addColorStop(0, Barwa.Rgba(140, 92, 40, i < 2 ? 0.07 : 0.12)); pl.addColorStop(1, "rgba(140,92,40,0)");
                    g.fillStyle = pl; g.fillRect(x - r, y - r, r * 2, r * 2);
                }
                var winieta = g.createRadialGradient(x0 + pol / 2, oprawa + h / 2, Math.Min(pol, h) * 0.35, x0 + pol / 2, oprawa + h / 2, Math.Max(pol, h) * 0.75);
                winieta.addColorStop(0, "rgba(110,76,36,0)"); winieta.addColorStop(1, "rgba(110,76,36,0.22)");
                g.fillStyle = winieta; g.fillRect(x0, oprawa - 6, pol, h + 12);
                var przyGrzbiecie = g.createLinearGradient(gx, 0, gx - strona * 34, 0);
                przyGrzbiecie.addColorStop(0, "rgba(70,44,18,0.5)"); przyGrzbiecie.addColorStop(0.35, "rgba(70,44,18,0.18)"); przyGrzbiecie.addColorStop(1, "rgba(70,44,18,0)");
                g.fillStyle = przyGrzbiecie; g.fillRect(Math.Min(gx, gx - strona * 34), oprawa - 6, 34, h + 12);
                // margines karty — blada czerwona linia
                g.strokeStyle = "rgba(150,40,20,0.10)"; g.lineWidth = 0.7;
                var xm = strona < 0 ? oprawa + Math.Max(16, w * 0.04) - 5 : oprawa + w - Math.Max(16, w * 0.04) + 5;
                g.beginPath(); g.moveTo(xm, oprawa + 6); g.lineTo(xm, oprawa + h - 6); g.stroke();
                g.restore();
                g.strokeStyle = "rgba(96,66,36,0.55)"; g.lineWidth = 0.8; g.stroke(karta);
            }
            g.strokeStyle = "rgba(60,36,16,0.6)"; g.lineWidth = 1;
            g.beginPath(); g.moveTo(gx, oprawa + 3); g.lineTo(gx, oprawa + h - 1); g.stroke();
            // mosiężne narożniki z nitem
            foreach (var (x, y, sx, sy) in new[] { (0.0, 0.0, 1.0, 1.0), (W, 0.0, -1.0, 1.0), (0.0, H, 1.0, -1.0), (W, H, -1.0, -1.0) })
            {
                var d = Math.Min(22, oprawa * 1.8);
                g.save(); g.translate(x, y); g.scale(sx, sy);
                g.beginPath(); g.moveTo(1, 1); g.lineTo(d, 1); g.quadraticCurveTo(d * 0.45, d * 0.45, 1, d); g.closePath();
                var mosiadz = g.createLinearGradient(0, 0, d, d);
                mosiadz.addColorStop(0, "#e2c27a"); mosiadz.addColorStop(0.5, "#a07a36"); mosiadz.addColorStop(1, "#5e4218");
                g.fillStyle = mosiadz; g.fill(); g.strokeStyle = "rgba(30,16,4,0.85)"; g.lineWidth = 0.9; g.stroke();
                g.fillStyle = "#f2dc9e"; g.beginPath(); g.arc(d * 0.3, d * 0.3, 1.6, 0, Math.PI * 2); g.fill();
                g.fillStyle = "rgba(30,16,4,0.7)"; g.beginPath(); g.arc(d * 0.3 + 0.5, d * 0.3 + 0.6, 0.8, 0, Math.PI * 2); g.fill();
                g.restore();
            }
            // zakładka — czerwona wstążka spod grzbietu, z wyciętym końcem
            double zx = gx + 4, zw = 6; var wst = g.createLinearGradient(zx, 0, zx + zw, 0);
            wst.addColorStop(0, "#5e0c08"); wst.addColorStop(0.5, "#9a1c14"); wst.addColorStop(1, "#5e0c08");
            g.fillStyle = wst;
            g.beginPath(); g.moveTo(zx, oprawa - 3); g.lineTo(zx + zw, oprawa - 3);
            g.quadraticCurveTo(zx + zw + 3, oprawa + h * 0.6, zx + zw + 5, H + 10); g.lineTo(zx + zw / 2 + 5, H + 6); g.lineTo(zx + 5, H + 10);
            g.quadraticCurveTo(zx + 3, oprawa + h * 0.6, zx, oprawa - 3); g.closePath(); g.fill();
            g.strokeStyle = "rgba(30,2,0,0.6)"; g.lineWidth = 0.6; g.stroke();
            okladki[klucz] = c;
            return c;
        }

        /// <summary>
        /// Ikony zasobów w księdze: wiara — złoty krzyż, krew — ampułka napełniona do poziomu krwi (pulsuje czerwienią,
        /// gdy za mało na rytuał, żarzy się, gdy pełna), jedzenie — bochen.
        /// </summary>
        public static void ikonaZasobu(IPlotno ctx, string rodzaj, double x, double y, double s, double teraz, (double poziom, bool malo, bool pelna)? krew = null)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            const string tusz = "rgba(14,9,7,0.9)";
            if (rodzaj == "wiara")
            {
                ctx.shadowColor = "rgba(255,214,120,0.6)"; ctx.shadowBlur = s * 0.3;
                ctx.fillStyle = "rgba(232,196,110,1)";
                ctx.fillRect(-s * 0.09, -s * 0.45, s * 0.18, s * 0.9);
                ctx.fillRect(-s * 0.3, -s * 0.24, s * 0.6, s * 0.17);
                ctx.shadowBlur = 0;
                ctx.strokeStyle = tusz; ctx.lineWidth = 1;
                ctx.strokeRect(-s * 0.09, -s * 0.45, s * 0.18, s * 0.9); ctx.strokeRect(-s * 0.3, -s * 0.24, s * 0.6, s * 0.17);
            }
            else if (rodzaj == "krew" && krew is { } k)
            {
                // ampułka: szyjka z korkiem i pękaty brzuch
                void brzuch() { ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.3); ctx.lineTo(-s * 0.1, -s * 0.16); ctx.quadraticCurveTo(-s * 0.36, -s * 0.05, -s * 0.3, s * 0.22); ctx.quadraticCurveTo(-s * 0.2, s * 0.46, 0, s * 0.46); ctx.quadraticCurveTo(s * 0.2, s * 0.46, s * 0.3, s * 0.22); ctx.quadraticCurveTo(s * 0.36, -s * 0.05, s * 0.1, -s * 0.16); ctx.lineTo(s * 0.1, -s * 0.3); ctx.closePath(); }
                var puls = 0.5 + 0.5 * JsM.Sin(teraz * 0.006);
                if (k.pelna || k.malo) { ctx.shadowColor = k.pelna ? Barwa.Rgba(255, 110, 80, 0.5 + 0.4 * puls) : Barwa.Rgba(230, 40, 30, 0.3 + 0.5 * puls); ctx.shadowBlur = s * 0.45; }
                brzuch(); ctx.fillStyle = "rgba(60,44,40,0.85)"; ctx.fill();
                ctx.shadowBlur = 0;
                ctx.save(); brzuch(); ctx.clip();
                var top = s * 0.46 - (s * 0.76) * k.poziom;
                var g = ctx.createLinearGradient(0, top, 0, s * 0.46);
                g.addColorStop(0, "rgba(206,40,30,1)"); g.addColorStop(1, "rgba(110,10,8,1)");
                ctx.fillStyle = g; ctx.fillRect(-s * 0.4, top, s * 0.8, s);
                ctx.restore();
                brzuch(); ctx.strokeStyle = "rgba(214,176,108,0.95)"; ctx.lineWidth = Math.Max(1, s * 0.07); ctx.stroke();
                ctx.fillStyle = "rgba(120,80,44,1)"; ctx.fillRect(-s * 0.12, -s * 0.44, s * 0.24, s * 0.15);
                // połysk szkła
                ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.Max(1, s * 0.05);
                ctx.beginPath(); ctx.moveTo(-s * 0.18, s * 0.02); ctx.quadraticCurveTo(-s * 0.2, s * 0.22, -s * 0.1, s * 0.33); ctx.stroke();
            }
            else
            {
                // bochen: kopuła z nacięciami
                ctx.beginPath(); ctx.moveTo(-s * 0.42, s * 0.22); ctx.quadraticCurveTo(-s * 0.42, -s * 0.3, 0, -s * 0.3); ctx.quadraticCurveTo(s * 0.42, -s * 0.3, s * 0.42, s * 0.22); ctx.closePath();
                var g = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.22);
                g.addColorStop(0, "rgba(206,150,82,1)"); g.addColorStop(1, "rgba(132,82,40,1)");
                ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = tusz; ctx.lineWidth = 1; ctx.stroke();
                ctx.strokeStyle = "rgba(250,220,160,0.8)"; ctx.lineWidth = Math.Max(1, s * 0.06);
                foreach (var dx in new[] { -0.16, 0, 0.16 }) { ctx.beginPath(); ctx.moveTo(s * (dx - 0.06), -s * 0.12); ctx.lineTo(s * (dx + 0.06), -s * 0.02); ctx.stroke(); }
            }
            ctx.restore();
        }

        /// <summary>Dymek nad księgą: karteczka z poszarpanymi brzegami i kilkoma linijkami pisma.</summary>
        public static void dymek(IPlotno ctx, double x, double yDol, IList<(string t, (double r, double g, double b)? barwa)> linie, double rozmiar)
        {
            ctx.save();
            ctx.font = $"{Js.Js.S(rozmiar)}px {Ink.SERIF_PISMO}";
            double w = linie.Max(l => ctx.measureText(l.t).width) + rozmiar * 1.4, h = linie.Count * rozmiar * 1.3 + rozmiar * 0.7;
            var t = ctx.getTransform();
            var szerEkranu = ctx.width / (t.a != 0 ? t.a : 1);
            double x0 = Math.Max(6, Math.Min(szerEkranu - w - 6, x - w / 2)), y0 = yDol - h;
            ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
            ctx.fillStyle = "#e4d3ac";
            ctx.beginPath();
            ctx.moveTo(x0, y0 + 2); ctx.lineTo(x0 + w * 0.4, y0); ctx.lineTo(x0 + w, y0 + 3);
            ctx.lineTo(x0 + w - 1, y0 + h); ctx.lineTo(x0 + w * 0.6, y0 + h - 2); ctx.lineTo(x0 + 1, y0 + h);
            ctx.closePath(); ctx.fill();
            ctx.shadowColor = "transparent"; ctx.strokeStyle = "rgba(96,66,36,0.6)"; ctx.lineWidth = 0.8; ctx.stroke();
            for (int i = 0; i < linie.Count; i++) pismo(ctx, linie[i].t, x0 + rozmiar * 0.7, y0 + rozmiar * 1.15 + i * rozmiar * 1.3, rozmiar, linie[i].barwa ?? ATRAMENT);
            ctx.restore();
        }

        static readonly Dictionary<string, string> NAPIS_ZASOBU = new Dictionary<string, string>
        {
            ["wiara"] = "wiara", ["krew"] = "krew", ["jedzenie"] = "jedzenie", ["zelazo"] = "żelazo", ["zloto"] = "złoto", ["oddanie"] = "oddanie",
        };
        /// <summary>Ostatnio pokazana liczba każdego zasobu — żeby przy zmianie liczba na chwilę rozjarzyła się (więcej złotem, mniej czerwienią).</summary>
        sealed class Ostatnia { public double n, t; public bool wiecej; }
        static readonly Dictionary<string, Ostatnia> ostatnie = new Dictionary<string, Ostatnia>();

        // ------------------------------------------------------------------ pamięć podręczna (8.11: wydajność)

        /// <summary>Prostokąt logiczny w pikselach urządzenia przy transformacji `t` (tylko skala i przesunięcie), z zapasem.</summary>
        static (double X, double Y, double W, double H) wPikselach(DOMMatrix t, double x, double y, double w, double h, double zapas)
        {
            double X = Math.Floor(x * t.a + t.e) - zapas, Y = Math.Floor(y * t.d + t.f) - zapas;
            double X1 = Math.Ceiling((x + w) * t.a + t.e) + zapas, Y1 = Math.Ceiling((y + h) * t.d + t.f) + zapas;
            return (X, Y, Math.Max(1, X1 - X), Math.Max(1, Y1 - Y));
        }

        /// <summary>Odbitka w pikselach urządzenia: płótno i jego lewy górny róg na ekranie.</summary>
        sealed class Odbitka { public IPlotno c = null!; public string klucz = ""; public double X, Y; }
        static Odbitka? okladkaCien;

        /// <summary>
        /// Okładka z cieniem pod księgą. Cień (rozmycie 18 px) liczył się w każdej klatce na całej księdze — teraz raz na
        /// układ: okładka z cieniem leży w pamięci w pikselach ekranu, a klatka tylko ją kopiuje.
        /// </summary>
        static Odbitka? okladkaZCieniem(IPlotno ctx, Obszar k, double oprawa)
        {
            double x = k.x - oprawa, y = k.y - oprawa, w = k.w + oprawa * 2, h = k.h + oprawa * 2 + 12;
            var t = ctx.getTransform();
            if (t.b != 0 || t.c != 0)
            {
                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
                ctx.drawImage(okladka(k.w, k.h, oprawa), x, y, w, h);
                ctx.restore();
                return null;
            }
            var r = wPikselach(t, x, y, w, h, 48);
            var klucz = $"{Js.Js.S(x)},{Js.Js.S(y)},{Js.Js.S(w)},{Js.Js.S(h)},{Js.Js.S(t.a)},{Js.Js.S(t.d)},{Js.Js.S(t.e)},{Js.Js.S(t.f)}";
            if (okladkaCien == null || okladkaCien.klucz != klucz)
            {
                var c = okladkaCien?.c ?? Plotno.Nowe((int)r.W, (int)r.H);
                c.width = (int)r.W; c.height = (int)r.H;
                var g = c.getContext("2d");
                g.setTransform(t.a, 0, 0, t.d, t.e - r.X, t.f - r.Y);
                g.shadowColor = "rgba(0,0,0,0.65)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
                g.drawImage(okladka(k.w, k.h, oprawa), x, y, w, h);
                okladkaCien = new Odbitka { c = c, klucz = klucz, X = r.X, Y = r.Y };
            }
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(okladkaCien.c, okladkaCien.X, okladkaCien.Y);
            ctx.restore();
            return okladkaCien;
        }

        /// <summary>Tło owalu medalionu (pergamin, jaśniejszy pod kursorem); owal zostaje bieżącą ścieżką (pod clip).</summary>
        static void tloMedalionu(IPlotno ctx, (string rola, double x, double y, double rx, double ry) m, bool pod)
        {
            ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
            var tlo = ctx.createRadialGradient(m.x, m.y - m.ry * 0.2, m.rx * 0.2, m.x, m.y, m.ry);
            tlo.addColorStop(0, pod ? "rgba(255,246,214,0.85)" : "rgba(250,240,210,0.6)"); tlo.addColorStop(1, "rgba(176,136,82,0.35)");
            ctx.fillStyle = tlo; ctx.fill();
        }

        /// <summary>Wnętrze owalu (przycięte do bieżącej ścieżki): kreska podłogi i miniatura postaci tej roli.</summary>
        static void wnetrzeMedalionu(IPlotno ctx, Sim sim, (string rola, double x, double y, double rx, double ry) m, string rola, Creature wzor, double czas)
        {
            ctx.save(); ctx.clip();
            ctx.strokeStyle = rgbA(ATRAMENT, 0.35); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(m.x - m.rx * 0.7, m.y + m.ry * 0.7); ctx.lineTo(m.x + m.rx * 0.7, m.y + m.ry * 0.7); ctx.stroke();
            ctx.translate(m.x, m.y + m.ry * 0.72);
            Figury.rysujPostac(ctx, sim, Druzyna.zastepca(rola, wzor), m.ry * 1.45, czas, "stoi");
            ctx.restore();
        }

        /// <summary>Czyści pamięć księgi (testy obrazu: następna klatka liczy wszystko od nowa).</summary>
        public static void wyczyscPamiecKsiegi() { okladkaCien = null; }

        /// <summary>Rysuje księgę i zwraca pola do kliknięcia (medaliony ról, pieczęć Nakarm).</summary>
        public static List<PoleKsiegi> rysujKsiege(IPlotno ctx, Sim sim, Plate p, double vh, IReadOnlyCollection<double> zaznaczeni, (double x, double y) kursor, double czas, Urobki urobki)
        {
            var ud = Przyciski.ukladDolu(p, vh); var k = ud.ksiega; var oprawa = ud.oprawa; var u = Przyciski.ukladKsiegi(ud);
            var pola = new List<PoleKsiegi>();
            okladkaZCieniem(ctx, k, oprawa);

            // ---- lewa karta: Twój lud
            naglowekKarty(ctx, Krag.T("Twój lud", "Twoi potępieni"), u.lewa.x + u.lewa.w / 2, u.lewa.y + u.naglowek * 0.95, u.naglowek, u.lewa.w);
            foreach (var m in u.medaliony)
            {
                var rola = m.rola; var lud = Druzyna.ludRoli(sim, rola); var ile = lud.Count; var zazn = lud.Count(c => zaznaczeni.Contains(c.id));
                var pod = Math.Pow((kursor.x - m.x) / (m.rx + 4), 2) + Math.Pow((kursor.y - m.y) / (m.ry + 4), 2) <= 1;
                ctx.save();
                // miniatura postaci tej roli (zaznaczona, jeśli jest) na kresce podłogi
                // (8.11: miniatury rysują się w każdej klatce — odbitka medalionu kopiowała kawałek okładki między płótnami,
                // a takie kopiowanie bywa droższe niż sama postać, na karcie graficznej nawet bardzo)
                var wzor = lud.FirstOrDefault(c => zaznaczeni.Contains(c.id)) ?? lud.FirstOrDefault();
                tloMedalionu(ctx, m, pod);
                if (wzor != null) wnetrzeMedalionu(ctx, sim, m, rola, wzor, czas);
                else
                {
                    // nikogo z tej roli — przekreślony medalion
                    ctx.strokeStyle = rgbA(ATRAMENT, 0.6); ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(m.x - m.rx * 0.5, m.y - m.ry * 0.5); ctx.lineTo(m.x + m.rx * 0.5, m.y + m.ry * 0.5);
                    ctx.moveTo(m.x + m.rx * 0.5, m.y - m.ry * 0.5); ctx.lineTo(m.x - m.rx * 0.5, m.y + m.ry * 0.5);
                    ctx.stroke();
                }
                ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
                ctx.strokeStyle = rgbA(ATRAMENT, pod ? 0.95 : 0.8); ctx.lineWidth = pod ? 2 : 1.5; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(m.x, m.y, m.rx + 3.5, m.ry + 3.5, 0, 0, Math.PI * 2);
                ctx.strokeStyle = rgbA(ATRAMENT, 0.35); ctx.lineWidth = 0.8; ctx.stroke();
                if (zazn > 0)
                {
                    // złoty łuk: jaka część roli jest zaznaczona (cały owal — wszyscy)
                    var t = Nastroj.wolnoRuszac() ? 0.5 + 0.5 * JsM.Sin(czas * 5e-3) : 1;
                    ctx.save();
                    ctx.shadowColor = Barwa.Rgba(255, 200, 90, 0.55 + 0.35 * t); ctx.shadowBlur = 8 + 6 * t;
                    var zl = ctx.createLinearGradient(m.x - m.rx, m.y - m.ry, m.x + m.rx, m.y + m.ry);
                    zl.addColorStop(0, "#f6dc8c"); zl.addColorStop(0.5, "#b8862e"); zl.addColorStop(1, "#f0d27a");
                    ctx.strokeStyle = zl; ctx.lineWidth = 3; ctx.lineCap = "round";
                    ctx.beginPath();
                    if (zazn == ile) ctx.ellipse(m.x, m.y, m.rx + 1.5, m.ry + 1.5, 0, 0, Math.PI * 2);
                    else ctx.ellipse(m.x, m.y, m.rx + 1.5, m.ry + 1.5, 0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * zazn) / ile);
                    ctx.stroke();
                    ctx.restore();
                }
                // liczba w kółku i nazwa roli pod medalionem
                double lx = m.x + m.rx * 0.82, ly = m.y - m.ry * 0.78, lr = Math.Max(8, u.naglowek * 0.55);
                ctx.fillStyle = "#e8d8b2"; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(150,30,18,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
                pismo(ctx, ile.ToString(), lx, ly + lr * 0.45, lr * 1.25, ile > 0 ? CZERWIEN : (120, 100, 80), align: "center");
                pismo(ctx, SLud.NAZWA_ROLI_MNOGA[rola], m.x, m.y + m.ry + u.naglowek * 1.05, u.naglowek * 0.85, zazn > 0 ? (120, 80, 10) : ATRAMENT, align: "center", alfa: ile > 0 ? 1 : 0.5);
                ctx.restore();
                pola.Add(new PoleKsiegi { akcja = "rola", rola = rola, x = m.x - m.rx - 6, y = m.y - m.ry - 6, w = m.rx * 2 + 12, h = m.ry * 2 + 12 + u.naglowek });
            }

            // ---- prawa karta: Zasoby
            naglowekKarty(ctx, "Zasoby", u.prawa.x + u.prawa.w / 2, u.prawa.y + u.naglowek * 0.95, u.naglowek, u.prawa.w);
            var R = OLTARZ.rytualy;
            double krewMax = GORA.krewMax, naRytual = new[] { R.modlitwa.krew, R.szal.krew, R.wskrzeszenie.krew, R.ofiaraKrwi.krew, R.ofiaraZycia.krew }.Where(x => x > 0).Min();
            var liczby = new Dictionary<string, double>
            {
                ["wiara"] = Math.Max(0, Math.Floor(sim.wiara - urobki.wLocie("wiara"))),
                ["krew"] = Math.Max(0, Math.Floor(sim.krew - urobki.wLocie("krew"))),
                ["jedzenie"] = Wiadro.porcjiWWiadrach(sim),
                ["zelazo"] = Math.Max(0, sim.zelazo - urobki.wLocie("zelazo")),
                ["zloto"] = Math.Max(0, sim.zloto - urobki.wLocie("zloto")),
            };
            Obszar? obszarKrwi = null;
            foreach (var z in new[] { "wiara", "krew", "jedzenie", "zelazo", "zloto" })
            {
                var m = u.zasoby[z]; var lot = z == "jedzenie" ? null : z; var blysk = lot != null ? urobki.blysk(lot, czas) : 0;
                if (z == "zelazo" || z == "zloto")
                {
                    Urobki.znaczekKruszcu(ctx, z, m.x, m.y - m.pismo * 0.3, m.s, blysk, urobki.dolot(z));
                    urobki.cele[z] = (m.x, m.y - m.pismo * 0.3);
                }
                else
                {
                    ikonaZasobu(ctx, z, m.x, m.y - m.pismo * 0.3, m.s, czas, z == "krew"
                        ? (Math.Min(1, Math.Max(0, sim.krew) / krewMax), sim.krew < naRytual, sim.krew >= krewMax - 0.5) : null);
                }
                var x = m.x + m.s * 0.72;
                var n = liczby[z];
                // nazwa przed liczbą, jeśli się zmieści
                ctx.font = $"{Js.Js.S(m.pismo * 0.66)}px {Ink.SERIF_PISMO}";
                var wNazwy = ctx.measureText(NAPIS_ZASOBU[z]).width;
                ctx.font = $"{Js.Js.S(m.pismo)}px {Ink.SERIF_PISMO}";
                if (wNazwy + m.pismo * 0.3 + ctx.measureText(Js.Js.S(n)).width <= m.szer + m.s * 0.7)
                    x += pismo(ctx, NAPIS_ZASOBU[z], x, m.y, m.pismo * 0.66, ATRAMENT, alfa: 0.85) + m.pismo * 0.3;
                ostatnie.TryGetValue(z, out var byla);
                if (byla == null || byla.n != n) ostatnie[z] = new Ostatnia { n = n, t = byla != null ? czas : -1e9, wiecej = byla == null || n > byla.n };
                var st = ostatnie[z];
                var zar = Nastroj.wolnoRuszac() ? Math.Max(0, 1 - (czas - st.t) / NASTROJ.liczbaZar) : 0;
                Styl? blaskLiczby = blysk > 0 ? (z == "krew" ? Barwa.Rgba(255, 70, 50, blysk) : Barwa.Rgba(255, 214, 110, blysk))
                    : zar > 0 ? (st.wiecej ? Barwa.Rgba(240, 190, 90, 0.9 * zar) : Barwa.Rgba(214, 50, 32, 0.9 * zar)) : null;
                var podbicie = blysk > 0 ? 1 + (OKRUCH.podbicie - 1) * blysk * blysk : 1;
                // okruchy wiary i krwi lecą do liczby
                if (lot == "wiara" || lot == "krew") urobki.cele[lot] = (x + m.pismo * 0.5, m.y - m.pismo * 0.35);
                var wLiczby = pismo(ctx, Js.Js.S(n), x, m.y, m.pismo * podbicie, BARWA_ZASOBU[z], blask: blaskLiczby, blaskR: 10);
                if (z == "krew") obszarKrwi = new Obszar(m.x - m.s / 2, m.y - m.pismo * 1.1, x + wLiczby - (m.x - m.s / 2), m.pismo * 1.5);
            }
            {
                // oddanie: dłonie i procent najwierniejszego ludu
                var m = u.zasoby["oddanie"];
                Plyta.drawOddanie(ctx, p, sim, vh, (m.x - m.s / 2, m.y - m.s * 0.62, m.s));
                var klan = Pielgrzymka.najwierniejsza(sim); var oddanie = klan != null ? klan.devotion : 0; var dosc = oddanie > PIELGRZYMKA.oddanieNacji;
                var x = m.x + m.s * 0.72;
                var ile = $"{Js.Js.S(Math.Floor(oddanie * 100))}%";
                ctx.font = $"{Js.Js.S(m.pismo * 0.66)}px {Ink.SERIF_PISMO}";
                var wNazwy = ctx.measureText("oddanie").width;
                ctx.font = $"{Js.Js.S(m.pismo)}px {Ink.SERIF_PISMO}";
                if (wNazwy + m.pismo * 0.3 + ctx.measureText(ile).width <= m.szer + m.s * 0.7)
                    x += pismo(ctx, "oddanie", x, m.y - m.pismo * 0.15, m.pismo * 0.66, ATRAMENT, alfa: 0.85) + m.pismo * 0.3;
                pismo(ctx, ile, x, m.y - m.pismo * 0.15, m.pismo, BARWA_ZASOBU["oddanie"], blask: dosc ? (Styl?)"rgba(255,200,90,0.8)" : null);
                var dopisek = klan != null ? (dosc ? "idą do krypty" : $"pielgrzymka od {Js.Js.S(Math.Floor(PIELGRZYMKA.oddanieNacji * 100 + 0.5))}%") : "nikt nie wierzy";
                pismo(ctx, dopisek, m.x + m.s * 0.72, m.y + m.pismo * 0.62, m.pismo * 0.54, dosc ? (120, 80, 10) : ATRAMENT, alfa: 0.7, maxW: m.szer + m.s * 0.4);
            }
            {
                // pieczęć „+” przy jedzeniu — Nakarm
                var n = u.nakarm; var stac = Moce.affordable(sim, "zasiej", "grzyb"); var pod = Math.Sqrt(Math.Pow(kursor.x - n.x, 2) + Math.Pow(kursor.y - n.y, 2)) <= n.r + 4;
                ctx.save();
                ctx.translate(n.x, n.y);
                ctx.shadowColor = "rgba(40,10,4,0.5)"; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
                ctx.beginPath();
                for (int i = 0; i <= 14; i++)
                {
                    double kat = (i / 14.0) * Math.PI * 2, r = n.r * (pod ? 1.12 : 1) * (0.92 + 0.08 * los(i * 17));
                    if (i == 0) ctx.moveTo(JsM.Cos(kat) * r, JsM.Sin(kat) * r); else ctx.lineTo(JsM.Cos(kat) * r, JsM.Sin(kat) * r);
                }
                ctx.closePath();
                var lak = ctx.createRadialGradient(-n.r * 0.3, -n.r * 0.3, 1, 0, 0, n.r * 1.2);
                lak.addColorStop(0, stac ? "#d2402c" : "#9c7a6a"); lak.addColorStop(1, stac ? "#6e0e08" : "#5a463c");
                ctx.fillStyle = lak; ctx.fill();
                ctx.shadowColor = "transparent";
                ctx.strokeStyle = stac ? "rgba(255,200,170,0.5)" : "rgba(220,200,190,0.35)"; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.arc(0, 0, n.r * 0.68, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = stac ? "#fbe2c8" : "rgba(230,214,200,0.7)"; ctx.lineWidth = Math.Max(1.8, n.r * 0.2); ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(-n.r * 0.4, 0); ctx.lineTo(n.r * 0.4, 0); ctx.moveTo(0, -n.r * 0.4); ctx.lineTo(0, n.r * 0.4); ctx.stroke();
                ctx.restore();
                pola.Add(new PoleKsiegi { akcja = "nakarm", x = n.x - n.r - 5, y = n.y - n.r - 5, w = n.r * 2 + 10, h = n.r * 2 + 10 });
                if (pod)
                {
                    var c = Moce.cost("zasiej", "grzyb");
                    dymek(ctx, n.x, k.y - oprawa - 6, new List<(string, (double, double, double)?)>
                    {
                        ("Nakarm — dosyp jedzenia do wiadra", null),
                        (stac ? $"kosztuje {Js.Js.S(c.krew)} krwi" : $"nie stać cię — trzeba {Js.Js.S(c.krew)} krwi", stac ? ATRAMENT : CZERWIEN),
                    }, Math.Max(13, u.naglowek * 0.8));
                }
            }
            // dymek nad krwią
            if (obszarKrwi is { } ok && kursor.x >= ok.x && kursor.x <= ok.x + ok.w && kursor.y >= ok.y && kursor.y <= ok.y + ok.h)
            {
                double krew = Math.Floor(Math.Max(0, sim.krew)); bool pelna = sim.krew >= krewMax - 0.5, malo = sim.krew < naRytual;
                dymek(ctx, ok.x + ok.w / 2, k.y - oprawa - 6, new List<(string, (double, double, double)?)>
                {
                    ($"krew: {Js.Js.S(krew)} z {Js.Js.S(krewMax)}", null),
                    (pelna ? "pełna — nadmiar przepada" : malo ? $"za mało na rytuał ({Js.Js.S(naRytual)})" : "płynie z każdej śmierci", pelna || malo ? CZERWIEN : ATRAMENT),
                }, Math.Max(13, u.naglowek * 0.8));
            }
            return pola;
        }
    }
}
