// Port: alpha-1/src/atlas/tablice.ts (ryciny, część druga): warstwy góry, sypialnia, ołtarz i rytuały, ruiny, zabytki,
// lina, dłoń z otchłani, przecięta lina, dłoń anielska, pismo w skale.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Rysunek.Ryciny;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Atlas
{
    public static partial class RycinyAtlasu
    {
        /// <summary>
        /// Warstwy góry — przekrój: z powierzchni szyb ze światłem i węższy szyb wiadra do sali z ołtarzem; czapa skały
        /// i gruba rama nie do ruszenia; trzy warstwy; na dnie szeroka krypta, a pod nią rdzeń.
        /// </summary>
        public static void warstwyRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            var atr = rgba(BARWA.atrament, 0.3);
            ctx.save();
            ctx.fillStyle = "#0d0a09"; ctx.fillRect(0, 0, w, h);
            double ram = w * 0.06, gora = h * 0.07, dno = h * 0.93;
            double X(double u) => ram + (w - 2 * ram) * u;
            Path2D pas(double y0, double y1, string kolor, double kat, double odstep)
            {
                var pp = new Path2D(); pp.rect(ram, y0, w - 2 * ram, y1 - y0);
                ctx.fillStyle = kolor; ctx.fill(pp);
                kreskuj(ctx, pp, kat, odstep, atr, 1);
                return pp;
            }
            // ziemia i czapa skały nad salą
            pas(gora, h * 0.22, "rgba(58,50,46,0.98)", 0.2, 2.5);
            // trzy warstwy
            var W = SWIAT.warstwy;
            double y1 = h * 0.24, yP = lerp(y1, dno, W.plytkaDo), yS = lerp(y1, dno, W.srodkowaDo);
            pas(h * 0.22, yP, "rgba(70,56,44,0.97)", 0.8, 7);
            pas(yP, yS, "rgba(52,42,35,0.97)", 0.7, 5);
            pas(yS, dno, "rgba(34,28,25,0.98)", 0.6, 3);
            // rama nie do ruszenia — boki i dno
            var rama = new Path2D(); rama.rect(0, gora, ram, h - gora); rama.rect(w - ram, gora, ram, h - gora); rama.rect(0, dno, w, h - dno);
            ctx.fillStyle = "rgba(28,24,24,1)"; ctx.fill(rama); kreskuj(ctx, rama, 0.15, 2, atr, 1);
            // powierzchnia
            ctx.fillStyle = "rgba(30,26,30,1)"; ctx.fillRect(0, 0, w, gora);
            ctx.strokeStyle = "rgba(232,196,130,0.5)"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(0, gora); ctx.lineTo(w, gora); ctx.stroke();
            // sala z ołtarzem i dwa szyby: szerszy ze światłem nad środkiem, węższy z wiadrem obok
            double sx = w * 0.5, salaY = h * 0.25;
            const string pustka = "rgba(92,70,50,0.98)";
            ctx.fillStyle = pustka;
            ctx.beginPath(); ctx.ellipse(sx, salaY, w * 0.16, h * 0.045, 0, 0, PI * 2); ctx.fill();
            ctx.fillRect(sx - w * 0.012, gora, w * 0.024, salaY - gora);
            var wx = sx + w * 0.07;
            ctx.fillRect(wx - w * 0.005, gora, w * 0.01, salaY - gora);
            var sw = ctx.createLinearGradient(0, gora, 0, salaY + h * 0.04);
            sw.addColorStop(0, "rgba(255,240,200,0.5)"); sw.addColorStop(1, "rgba(255,240,200,0)");
            ctx.fillStyle = sw; ctx.beginPath(); ctx.moveTo(sx - w * 0.012, gora); ctx.lineTo(sx + w * 0.012, gora); ctx.lineTo(sx + w * 0.03, salaY + h * 0.04); ctx.lineTo(sx - w * 0.03, salaY + h * 0.04); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(232,196,130,0.9)"; ctx.fillRect(sx - 1, salaY - h * 0.03, 2, h * 0.05); ctx.fillRect(sx - 4, salaY - h * 0.018, 8, 2);
            var wy = lerp(gora + h * 0.01, salaY - h * 0.02, (t * 0.00025) % 1);
            ctx.fillStyle = "rgba(150,110,60,0.95)"; ctx.fillRect(wx - 3, wy, 6, 5);
            ctx.strokeStyle = "rgba(200,180,140,0.6)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(wx, gora); ctx.lineTo(wx, wy); ctx.stroke();
            // płytka: kępy żelaza
            for (int i = 0; i < 7; i++)
            {
                double x = X(0.08 + 0.13 * i + 0.04 * JsM.Sin(i * 3)), y = lerp(h * 0.3, yP - h * 0.03, (i * 0.37) % 1);
                ctx.fillStyle = "rgba(150,80,50,0.9)"; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, PI * 2); ctx.fill();
            }
            // środkowa: jaskinie, złoto pod ich dnem, ruina
            for (int i = 0; i < 4; i++)
            {
                double x = X(0.12 + 0.24 * i), y = lerp(yP, yS, 0.35 + 0.2 * JsM.Sin(i * 2.1));
                ctx.fillStyle = pustka; ctx.beginPath(); ctx.ellipse(x, y, w * 0.045, h * 0.022, 0, 0, PI * 2); ctx.fill();
                var blysk = 0.7 + 0.3 * JsM.Sin(t * 0.004 + i * 1.7);
                ctx.fillStyle = Barwa.Rgba(240, 200, 90, 0.9 * blysk);
                for (int k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x + k * w * 0.016, y + h * 0.03, 2.2, 0, PI * 2); ctx.fill(); }
            }
            double rux = X(0.62), ruy = lerp(yP, yS, 0.72);
            ctx.strokeStyle = "rgba(190,170,140,0.8)"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(rux - 9, ruy + 6); ctx.lineTo(rux - 9, ruy - 2); ctx.arc(rux, ruy - 2, 9, PI, 0); ctx.lineTo(rux + 9, ruy + 6); ctx.stroke();
            // krypta i rdzeń
            var ky = dno - h * 0.07;
            ctx.fillStyle = pustka; ctx.beginPath(); ctx.ellipse(sx, ky, w * 0.3, h * 0.022, 0, 0, PI * 2); ctx.fill();
            var puls = 0.75 + 0.25 * JsM.Sin(t * 0.003);
            var ry = dno - h * 0.025;
            var g = ctx.createRadialGradient(sx, ry, 0, sx, ry, h * 0.09 * puls);
            g.addColorStop(0, "rgba(255,90,60,0.9)"); g.addColorStop(1, "rgba(160,20,20,0)");
            ctx.fillStyle = g; ctx.fillRect(sx - h * 0.1, ry - h * 0.1, h * 0.2, h * 0.2);
            ctx.fillStyle = "rgba(200,40,30,0.95)"; ctx.beginPath(); ctx.arc(sx, ry, h * 0.02, 0, PI * 2); ctx.fill();
            // podpisy
            ctx.font = $"italic {Js.Js.S(Math.Floor(h * 0.045 + 0.5))}px Georgia, serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(232,214,180,0.9)";
            void napis(string tekst, double x, double y) => ctx.fillText(tekst, x, y);
            napis("szyb", sx + w * 0.09, gora + h * 0.07);
            napis("sala", sx + w * 0.17, salaY + h * 0.012);
            napis("płytka — żelazo", X(0.02), lerp(h * 0.22, yP, 0.55));
            napis("środkowa — złoto, ruiny", X(0.02), lerp(yP, yS, 0.12));
            napis("głęboka", X(0.02), lerp(yS, dno, 0.35));
            napis("krypta", sx + w * 0.31, ky + h * 0.012);
            ctx.textAlign = "center";
            napis("rdzeń", sx, dno - h * 0.11);
            ctx.save(); ctx.translate(ram * 0.62, h * 0.6); ctx.rotate(-PI / 2); napis("rama", 0, 0); ctx.restore();
            ctx.restore();
        }

        /// <summary>Sypialnia: posłanie, śpiący pobożny, świeca i „z z z”.</summary>
        public static void sypialniaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 6);
            var y = h * 0.82;
            ctx.save();
            ctx.strokeStyle = "rgba(20,12,8,0.95)"; ctx.lineWidth = 1.4;
            double b1 = w * 0.18, b2 = w * 0.78;
            ctx.fillStyle = "rgba(150,120,70,0.98)"; ctx.beginPath(); ctx.rect(b1, y - h * 0.05, b2 - b1, h * 0.05); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(206,190,156,0.98)"; ctx.beginPath(); ctx.ellipse(b1 + h * 0.07, y - h * 0.06, h * 0.06, h * 0.025, 0, 0, PI * 2); ctx.fill(); ctx.stroke();
            var sx = w * 0.88;
            var g = ctx.createRadialGradient(sx, y - h * 0.2, 0, sx, y - h * 0.2, h * 0.4);
            g.addColorStop(0, "rgba(255,214,140,0.45)"); g.addColorStop(1, "rgba(255,200,120,0)");
            ctx.fillStyle = g; ctx.fillRect(sx - h * 0.4, y - h * 0.6, h * 0.8, h * 0.6);
            ctx.fillStyle = "rgba(230,220,196,0.98)"; ctx.fillRect(sx - 3, y - h * 0.12, 6, h * 0.12);
            ctx.fillStyle = "rgba(255,230,150,0.95)"; ctx.beginPath(); ctx.ellipse(sx, y - h * 0.14, 3, 6, 0, 0, PI * 2); ctx.fill();
            ctx.restore();
            // leżący rysuje się tułowiem w stronę, w którą patrzy — stopy na prawym końcu posłania
            robotnikNaRycinie(ctx, b1 + (b2 - b1) * 0.86, y - h * 0.04, h * 0.42, t, "spi", 1, "pobozny");
            ctx.save();
            ctx.font = $"italic {Js.Js.S(Math.Floor(h * 0.08 + 0.5))}px Georgia, serif";
            for (int i = 0; i < 3; i++)
            {
                var f = (t * 0.0005 + i / 3.0) % 1;
                ctx.fillStyle = Barwa.Rgba(226, 214, 186, 0.9 * JsM.Sin(f * PI));
                ctx.fillText("z", b1 + h * 0.1 + f * h * 0.15, y - h * (0.18 + f * 0.25));
            }
            ctx.restore();
        }

        /// <summary>Ołtarz: kamienny kopczyk, mensa z misą i świecami, krzyż w smudze światła dziennego.</summary>
        public static void oltarzRycina(PlotnoRyciny P)
        {
            sklepienie(P.ctx, P.w, P.h, 7);
            RysOltarz.oltarzNaRycinie(P.ctx, P.w * 0.5, P.h * 0.82, P.h * 0.13, P.t);
        }

        /// <summary>Rytuał przy ołtarzu na rycinie: ołtarz z efektem rytuału i pobożny przy nim (klęczy albo unosi księgę).</summary>
        public static Action<PlotnoRyciny> rytualRycina(string rodzaj, string cz) => P =>
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 8);
            double z = h * 0.12, cx = w * 0.42, y = h * 0.82;
            RysOltarz.oltarzNaRycinie(ctx, cx, y, z, t, rodzaj, 0.6 + 0.4 * ((t * 0.0002) % 1));
            robotnikNaRycinie(ctx, cx + z * 2.6, y, h * 0.4, t, cz, -1, "pobozny");
            if (rodzaj == "ofiaraKrwi")
            {
                // krople z ręki klęczącego do misy
                for (int i = 0; i < 3; i++)
                {
                    var f = (t * 0.0011 + i / 3.0) % 1;
                    double x0 = cx + z * 2.2, y0 = y - h * 0.2, x1 = cx + z * 0.38, y1 = y - z * 1.55;
                    ctx.save(); ctx.translate(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - JsM.Sin(f * PI) * z * 0.8);
                    ctx.fillStyle = "rgba(196,26,18,0.95)"; ctx.beginPath(); Urobki.kropla(ctx, Math.Max(2, z * 0.09)); ctx.fill(); ctx.restore();
                }
            }
            if (rodzaj == "szal")
            {
                // rycerz w czerwonej aurze
                double rx = w * 0.12, R = h * 0.36;
                var g = ctx.createRadialGradient(rx, y - h * 0.2, 0, rx, y - h * 0.2, R);
                g.addColorStop(0, Barwa.Rgba(255, 44, 26, 0.4 + 0.1 * JsM.Sin(t * 0.008))); g.addColorStop(1, "rgba(200,20,10,0)");
                ctx.fillStyle = g; ctx.fillRect(rx - R, y - h * 0.2 - R, R * 2, R * 2);
                robotnikNaRycinie(ctx, rx, y, h * 0.5, t, "stoi", 1, "rycerz");
            }
        };

        /// <summary>Wskrzeszenie: krąg jasnych znaków i blada postać unosząca się nad mensą.</summary>
        public static void wskrzeszenieRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 9);
            double z = h * 0.12, cx = w * 0.5, y = h * 0.82;
            RysOltarz.oltarzNaRycinie(ctx, cx, y, z, t, "wskrzeszenie", 1);
            var f = (t * 0.00025) % 1;
            ctx.save();
            ctx.globalAlpha = 0.45 + 0.4 * f;
            ctx.filter = $"grayscale({Js.Js.S(1 - f)}) brightness({Js.Js.S(1.6 - 0.6 * f)})";
            robotnikNaRycinie(ctx, cx, y - z * 2.2 - f * z * 0.8, h * 0.4, t, "stoi", 1, "robotnik");
            ctx.restore();
            robotnikNaRycinie(ctx, cx + z * 2.8, y, h * 0.4, t, "czyta", -1, "pobozny");
        }

        /// <summary>Ofiara życia: słup czerwonego światła nad mensą i ciało pobożnego przy ołtarzu.</summary>
        public static void ofiaraZyciaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 10);
            double z = h * 0.12, cx = w * 0.42, y = h * 0.82;
            RysOltarz.oltarzNaRycinie(ctx, cx, y, z, t, "ofiaraZycia", 0.85);
            ctx.save(); ctx.globalAlpha = 0.85;
            // (leżący rysuje się tułowiem od kotwicy — tu w prawo, z dala od kopczyka)
            robotnikNaRycinie(ctx, cx + z * 2.3, y, h * 0.4, t, "spi", -1, "pobozny");
            ctx.restore();
        }

        /// <summary>Ruiny: zawalona kaplica w skale, w środku unosi się zabytek.</summary>
        public static void ruinyRycina(PlotnoRyciny P)
        {
            sklepienie(P.ctx, P.w, P.h, 23);
            RysRuiny.ruinaNaRycinie(P.ctx, P.w * 0.5, P.h * 0.84, P.h * 0.1, P.t, "relikwiarz");
        }

        /// <summary>Zabytki: relikwiarz, miecz, kielich i księga obok siebie, każdy w swoim świetle, z nazwą pod spodem.</summary>
        public static void zabytkiRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 29);
            var typy = new[] { "relikwiarz", "miecz", "kielich", "ksiega" };
            for (int k = 0; k < typy.Length; k++)
            {
                var typ = typy[k];
                double x = w * (0.16 + 0.225 * k), y = h * 0.62;
                RysRuiny.zabytekNaRycinie(ctx, x, y, h * 0.2, t, typ, k);
                ctx.font = $"italic {Js.Js.S(Math.Floor(h * 0.065 + 0.5))}px Georgia, serif";
                ctx.textAlign = "center"; ctx.fillStyle = rgba(BARWA.atrament, 0.85);
                ctx.fillText(ZABYTEK[typ].nazwa.Split(' ')[0], x, h * 0.82);
            }
        }

        /// <summary>Lina: półka, na którą się nie wejdzie, hak w skale, lina do podłogi (z węzłami) i robotnik, który się po niej wspina.</summary>
        public static void linaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 11);
            double k = h * 0.14, x = w * 0.52, y = h * 0.82, yt = y - k * 4;
            ctx.save();
            // półka po lewej
            var polka = new Path2D(); polka.rect(w * 0.08, yt + k, x - w * 0.08 - k * 0.1, k * 0.9);
            ctx.fillStyle = "rgba(46,34,27,0.98)"; ctx.fill(polka);
            kreskuj(ctx, polka, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
            // hak w stropie i lina z konopi, lekko się kołysze; węzły na chwyt co kafel, zwój na podłodze
            double lx = x + k * 0.5, hy = yt - k * 0.4;
            double odch(double s) => JsM.Sin(t * 0.002) * k * 0.08 * s;
            ctx.fillStyle = "rgba(70,70,76,0.98)"; ctx.strokeStyle = "rgba(20,12,8,0.95)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.rect(lx - k * 0.22, hy - k * 0.1, k * 0.44, k * 0.12); ctx.fill(); ctx.stroke();
            ctx.lineCap = "round";
            foreach (var (bar, sz) in new[] { ("rgba(20,12,8,0.95)", 5.0), ("rgba(176,138,86,0.98)", 3.0) })
            {
                ctx.strokeStyle = bar; ctx.lineWidth = sz;
                ctx.beginPath();
                for (int s = 0; s <= 20; s++) { var py = hy + (y - hy) * s / 20; var px = lx + odch(s / 20.0); if (s != 0) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
                ctx.stroke();
            }
            for (int i = 0; i < 4; i++)
            {
                var sy = yt + k * (i + 0.5);
                var sx = lx + odch((sy - hy) / (y - hy));
                ctx.fillStyle = "rgba(20,12,8,0.95)"; ctx.beginPath(); ctx.ellipse(sx, sy, k * 0.12, k * 0.09, 0, 0, PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(176,138,86,0.98)"; ctx.beginPath(); ctx.ellipse(sx, sy, k * 0.08, k * 0.055, 0, 0, PI * 2); ctx.fill();
            }
            ctx.strokeStyle = "rgba(176,138,86,0.98)"; ctx.lineWidth = 2.5;
            for (int r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(lx + k * 0.15, y - k * 0.06 - r * 2, k * (0.32 - r * 0.05), k * 0.12, 0, 0, PI * 2); ctx.stroke(); }
            ctx.restore();
            // wspina się: w górę i z powrotem
            var f = 0.5 - 0.5 * JsM.Cos(t * 0.0012);
            robotnikNaRycinie(ctx, x + k * 0.5, y - f * k * 3, h * 0.27, t, "wspina");
        }

        /// <summary>Dłoń z otchłani: z czerwonej łuny w dole wznosi się szponiasta dłoń — sięga po kogoś na półce skalnej.</summary>
        public static void dlonOtchlani(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#060303";
            ctx.fillRect(0, 0, w, h);
            var xw = w * 0.4;
            RysDlon.lunaOtchlani(ctx, xw + h * 0.1, h * 1.02, h * 0.9, 0, 1.6, t);
            // półka skalna i ten, po kogo sięga
            double xf = xw + h * 0.15, yf = h * 0.27, u = h * 0.02;
            ctx.fillStyle = "#1a0f0b";
            ctx.beginPath();
            ctx.moveTo(xf - h * 0.42, yf + u * 0.3); ctx.lineTo(xf - h * 0.2, yf - u * 0.2); ctx.lineTo(xf + h * 0.1, yf + u * 0.1); ctx.lineTo(xf + h * 0.36, yf - u * 0.3);
            ctx.lineTo(xf + h * 0.33, yf + u * 2.6); ctx.lineTo(xf + h * 0.12, yf + u * 2.1); ctx.lineTo(xf - h * 0.1, yf + u * 3.2); ctx.lineTo(xf - h * 0.4, yf + u * 2.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(214,170,110,0.35)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(xf - h * 0.42, yf + u * 0.3); ctx.lineTo(xf - h * 0.2, yf - u * 0.2); ctx.lineTo(xf + h * 0.1, yf + u * 0.1); ctx.lineTo(xf + h * 0.36, yf - u * 0.3); ctx.stroke();
            ctx.fillStyle = "rgba(28,20,16,0.96)";
            ctx.strokeStyle = "rgba(214,190,150,0.55)";
            ctx.lineWidth = Math.Max(0.8, u * 0.3);
            ctx.lineCap = "round";
            foreach (var s in new double[] { -1, 1 }) { ctx.beginPath(); ctx.moveTo(xf + s * u * 0.5, yf - u * 3); ctx.lineTo(xf + s * u * 0.8, yf); ctx.stroke(); }
            ctx.beginPath(); ctx.ellipse(xf, yf - u * 4.6, u * 1.2, u * 2.2, 0, 0, PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(xf, yf - u * 7.8, u * 1, 0, PI * 2); ctx.fill(); ctx.stroke();
            // dłoń pnie się z dołu, palce drgają
            var wzn = 0.02 * JsM.Sin(t * 0.0009);
            RysDlon.rysujKlatkeDloni(ctx, xw, h * (1.12 + wzn), -PI / 2 + 0.04 * JsM.Sin(t * 0.0007), (h * 0.84) / 25.5, 0.06 + 0.06 * JsM.Sin(t * 0.0021), 1, 1, 1);
            // przedramię ginie w ciemności otchłani
            var ciemno = ctx.createLinearGradient(0, h, 0, h * 0.6);
            ciemno.addColorStop(0, "rgba(6,3,3,0.92)");
            ciemno.addColorStop(1, "rgba(6,3,3,0)");
            ctx.fillStyle = ciemno;
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            RysDlon.lunaOtchlani(ctx, xw + h * 0.1, h * 1.04, h * 0.6, 0, 0.8, t);
            ctx.restore();
        }

        /// <summary>
        /// Przecięta lina (etap 4), w kółko: spod podłogi wznosi się dłoń z otchłani obok liny wiadra, zamach — trzy smugi
        /// pazurów, wiadro spada i się roztrzaskuje; potem robotnik wspina się po zwisającym końcu i go skleja.
        /// </summary>
        public static void przecietaLina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 11);
            double y = h * 0.82, lx = w * 0.56;
            var f = (t % 9000) / 9000;
            double zlb(double a, double b) => Math.Max(0, Math.Min(1, (f - a) / (b - a)));
            void lina(double x1, double y1, double x2, double y2)
            {
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                ctx.strokeStyle = "rgba(176,140,92,0.98)"; ctx.lineWidth = 2.4; ctx.stroke();
            }
            ctx.save();
            ctx.lineCap = "round";
            var ciete = f > 0.38;
            var koniec = y - h * 0.3;
            // wiadro: wisi, spada, leży w kawałkach; po sklejeniu — znowu wisi
            var naprawione = f > 0.92;
            var wy = !ciete || naprawione ? y - h * 0.16 : y - h * 0.16 + h * 0.16 * Math.Min(1, Math.Pow(zlb(0.38, 0.46), 2));
            if (!ciete || naprawione) lina(lx, 0, lx, wy);
            else lina(lx, 0, lx, koniec);
            if (!ciete || f < 0.46 || naprawione)
            {
                ctx.fillStyle = "rgba(120,82,46,1)"; ctx.strokeStyle = "rgba(16,10,6,0.95)"; ctx.lineWidth = 1.5;
                ctx.save(); ctx.translate(lx, wy); ctx.rotate(ciete && !naprawione ? zlb(0.38, 0.46) * 0.6 : 0);
                ctx.beginPath(); ctx.moveTo(-h * 0.06, 0); ctx.lineTo(h * 0.06, 0); ctx.lineTo(h * 0.045, h * 0.13); ctx.lineTo(-h * 0.045, h * 0.13); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            else
            {
                for (int i = 0; i < 6; i++)
                {
                    ctx.fillStyle = i % 2 != 0 ? "rgba(130,88,48,1)" : "rgba(96,62,34,1)";
                    ctx.save(); ctx.translate(lx + (i - 2.5) * h * 0.035, y - h * 0.012); ctx.rotate(1.3 + i * 0.2); ctx.fillRect(-h * 0.008, -h * 0.05, h * 0.016, h * 0.05); ctx.restore();
                }
                ctx.fillStyle = "rgba(176,118,58,1)";
                for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(lx + (i - 1) * h * 0.09, y - h * 0.012, h * 0.022, h * 0.014, 0, 0, PI * 2); ctx.fill(); }
            }
            // dłoń z otchłani: wznosi się obok liny, zamach w poprzek, cofa się
            if (f < 0.6)
            {
                var wzn = f < 0.3 ? zlb(0, 0.3) : f < 0.38 ? 1 : 1 - zlb(0.42, 0.6);
                var zamach = zlb(0.3, 0.38);
                RysDlon.lunaOtchlani(ctx, lx + h * 0.2, h * 1.02, h * 0.7, 0, 1.2 * Math.Min(1, wzn + 0.2), t);
                ctx.save(); ctx.globalAlpha = Math.Min(1, wzn * 1.5);
                RysDlon.rysujKlatkeDloni(ctx, lx + h * 0.32 - zamach * h * 0.42, h * (1.25 - 0.55 * wzn), -PI / 2 - 0.25 + zamach * 0.4, (h * 0.5) / 25.5, 0.12 + 0.15 * zamach, 1, 1, 1);
                ctx.restore();
            }
            // trzy smugi pazurów
            if (f > 0.37 && f < 0.5)
            {
                var a = 1 - zlb(0.37, 0.5);
                ctx.save(); ctx.globalCompositeOperation = "lighter";
                for (int i = -1; i <= 1; i++)
                {
                    foreach (var (kolor, gr) in new[] { (Barwa.Rgba(255, 60, 30, 0.6 * a), 5.0), (Barwa.Rgba(255, 236, 214, a), 1.6) })
                    {
                        ctx.strokeStyle = kolor; ctx.lineWidth = gr;
                        ctx.beginPath(); ctx.moveTo(lx + h * 0.12, koniec + i * 7 - 6); ctx.quadraticCurveTo(lx, koniec + i * 7 + 4, lx - h * 0.12, koniec + i * 7 - 2); ctx.stroke();
                    }
                }
                ctx.restore();
            }
            ctx.restore();
            // robotnik: biegnie pod linę, wspina się po kikucie i skleja (supeł rośnie)
            if (f > 0.62 && f <= 0.95)
            {
                var wsp = zlb(0.66, 0.72);
                var cz = f < 0.66 ? "idzie" : f < 0.72 ? "wspina" : f < 0.92 ? "skleja" : "wspina";
                robotnikNaRycinie(ctx, lx, y - wsp * h * 0.1, h * 0.27, t, cz);
                if (f > 0.72 && f < 0.92)
                {
                    var n = Math.Ceiling(zlb(0.72, 0.9) * 4);
                    ctx.save(); ctx.fillStyle = "rgba(150,114,70,0.98)"; ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 1;
                    for (int i = 0; i < n; i++) { ctx.beginPath(); ctx.ellipse(lx, koniec + 4 - i * 3, 5, 2.4, 0.15, 0, PI * 2); ctx.fill(); ctx.stroke(); }
                    ctx.restore();
                }
            }
        }

        /// <summary>Dłoń anielska: z góry, przez skałę, słup złotego światła; w nim jasna dłoń schodzi palcami w dół nad robotnikiem.</summary>
        public static void dlonAnielska(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 13);
            double y = h * 0.82, x = w * 0.5;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var g = ctx.createLinearGradient(x - h * 0.2, 0, x + h * 0.2, 0);
            g.addColorStop(0, "rgba(255,220,140,0)"); g.addColorStop(0.5, "rgba(255,232,170,0.4)"); g.addColorStop(1, "rgba(255,220,140,0)");
            ctx.fillStyle = g; ctx.fillRect(x - h * 0.2, 0, h * 0.4, y);
            var g2 = ctx.createRadialGradient(x, y, 0, x, y, h * 0.4);
            g2.addColorStop(0, "rgba(255,236,180,0.5)"); g2.addColorStop(1, "rgba(255,220,150,0)");
            ctx.fillStyle = g2; ctx.fillRect(x - h * 0.4, y - h * 0.4, h * 0.8, h * 0.8);
            for (int i = 0; i < 14; i++)
            {
                var f = ((t * 0.00005 * (0.6 + (i % 5) * 0.1)) + i * 0.137) % 1;
                ctx.fillStyle = Barwa.Rgba(255, 244, 210, 0.8 * JsM.Sin(f * PI));
                ctx.beginPath(); ctx.arc(x + JsM.Sin(i * 2.3) * h * 0.12, f * y, 1.3, 0, PI * 2); ctx.fill();
            }
            ctx.restore();
            // dłoń schodzi i wraca, lekko się kołysząc; pod nią stoi postawiony robotnik
            var zejscie = 0.5 - 0.5 * JsM.Cos(t * 0.0008);
            RysAniol.rysujKlatkeAnielska(ctx, x - h * 0.03, -h * 0.25 + zejscie * h * 0.22, PI / 2 + 0.06 * JsM.Sin(t * 0.0011), (h * 0.62) / 25.5, 0.05, 1, 1);
            robotnikNaRycinie(ctx, x + h * 0.02, y, h * 0.3, t, "stoi");
        }

        /// <summary>Pismo w skale: blok litej skały z żarzącymi się znakami, które gasną w smudze światła.</summary>
        public static void pismo(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            var blok = new Path2D();
            blok.rect(0, 0, w, h);
            kreskuj(ctx, blok, 0.62, 5, rgba(BARWA.atrament, 0.1), 1);
            // smuga światła z lewej: tam, gdzie pada, znaków już nie ma
            var g = ctx.createLinearGradient(0, 0, w * 0.45, 0);
            g.addColorStop(0, "rgba(224,186,120,0.22)");
            g.addColorStop(1, "rgba(224,186,120,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            var oddech = 0.5 + 0.5 * JsM.Sin(t * 0.0012);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            var znaki = new[] { (0.52, 0.3, 0.07, false), (0.68, 0.62, 0.06, false), (0.86, 0.34, 0.075, true), (0.6, 0.84, 0.05, false), (0.9, 0.78, 0.055, false), (0.36, 0.66, 0.05, false), (0.64, 0.12, 0.045, false) };
            for (int i = 0; i < znaki.Length; i++)
            {
                var (x, y, r, pieczec) = znaki[i];
                var s = h * r * 1.3;
                // bliżej światła — bledsze
                var a = Math.Max(0, Math.Min(1, (x - 0.3) / 0.5)) * (0.45 + 0.35 * JsM.Sin(oddech * 3 + i));
                ctx.save();
                ctx.translate(w * x, h * y);
                ctx.rotate((i % 3 - 1) * 0.15);
                ctx.strokeStyle = Barwa.Rgba(226, 170, 110, a);
                if (pieczec)
                {
                    ctx.lineWidth = 1.4;
                    ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, PI * 2); ctx.stroke();
                }
                ctx.scale(s, s);
                ctx.lineWidth = 1.6 / s;
                ctx.stroke(Tajemnica.glif(40 + i * 13, i % 3));
                ctx.restore();
            }
            ctx.restore();
        }
    }
}
