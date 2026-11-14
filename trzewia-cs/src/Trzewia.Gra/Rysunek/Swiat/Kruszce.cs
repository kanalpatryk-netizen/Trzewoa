// Port: alpha-1/src/render/kruszce.ts — KRUSZCE (Alpha, etap 3b): żelazo i złoto nad płytą i ich animacja. Z rozbitego
// kafla rudy wyskakuje okruch i leci łukiem do licznika; w miejscu kafla przy złocie złoty błysk, przy żelazie iskry;
// licznik podbija liczbę dopiero, gdy okruch doleci. Tą samą drogą krzyż z warsztatu „leci” do licznika wiary (unosi
// się i gaśnie), kropla krwi z misy ołtarza — do licznika krwi, a krew zapłacona za rytuał — z licznika do misy.
// Animacja idzie zegarem ekranu, nie tikami gry. Liczby: OKRUCH (Nastawy/Kruszce.cs).
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyKruszce;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Płyta na ekranie (render/plate.ts: Plate) — prostokąt świata i marginesy.</summary>
    public sealed class Plate
    {
        public double x, y, w, h, left, bottom, right, top;
        public bool waski, niski;
    }

    /// <summary>Okruchy w locie i błyski liczników — jedna para na ekran gry (render/kruszce.ts: Urobki).</summary>
    public sealed class Urobki
    {
        /// <summary>Barwy: sztabka i okruch żelaza, samorodek i okruch złota, złoty krzyż do wiary, kropla krwi.</summary>
        sealed class BarwaLotu { public string jasna = "", ciemna = "", obrys = ""; public double[] blask = null!; }
        static readonly Dictionary<string, BarwaLotu> BARWA = new Dictionary<string, BarwaLotu>
        {
            ["zelazo"] = new BarwaLotu { jasna = "rgba(176,184,196,1)", ciemna = "rgba(118,62,44,1)", obrys = "rgba(22,18,20,0.95)", blask = new double[] { 255, 196, 120 } },
            ["zloto"] = new BarwaLotu { jasna = "rgba(255,222,128,1)", ciemna = "rgba(196,140,46,1)", obrys = "rgba(48,30,6,0.95)", blask = new double[] { 255, 220, 120 } },
            ["wiara"] = new BarwaLotu { jasna = "rgba(255,244,200,1)", ciemna = "rgba(212,160,60,1)", obrys = "rgba(48,30,6,0.95)", blask = new double[] { 255, 236, 170 } },
            ["krew"] = new BarwaLotu { jasna = "rgba(240,104,80,1)", ciemna = "rgba(118,14,10,1)", obrys = "rgba(40,6,4,0.95)", blask = new double[] { 255, 96, 70 } },
        };

        /// <summary>Tani skrót liczby — stały kształt okrucha i kierunki iskier.</summary>
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        /// <summary>`wstecz` — z licznika na mapę (krew zapłacona za rytuał spływa do misy).</summary>
        sealed class Lot { public string rodzaj = ""; public double ile, x, y, od, ziarno; public bool wstecz; }

        readonly ConditionalWeakTable<Urobek, object> widziane = new ConditionalWeakTable<Urobek, object>();
        List<Lot> loty = new List<Lot>();
        readonly Dictionary<string, double> doleciale = new Dictionary<string, double> { ["zelazo"] = -1e9, ["zloto"] = -1e9, ["wiara"] = -1e9, ["krew"] = -1e9 };
        /// <summary>Gdzie na ekranie stoją znaczki liczników (ustawia je rysowanie liczników nad płytą).</summary>
        public readonly Dictionary<string, (double x, double y)> cele = new Dictionary<string, (double x, double y)>();
        /// <summary>Okruch doleciał — ekran gry daje cichy brzęk.</summary>
        public Action<string>? onDolot;

        static readonly object JEST = new object();

        /// <summary>Bierze świeży urobek z symulacji — każdy kafel rudy to jeden okruch.</summary>
        public void zbierz(Sim sim, double teraz)
        {
            foreach (var u in sim.urobek)
            {
                if (widziane.TryGetValue(u, out _)) continue;
                widziane.Add(u, JEST);
                // „mniej ruchu”: bez lotu — licznik rośnie od razu
                if (Nastroj.wolnoRuszac()) loty.Add(new Lot { rodzaj = u.rodzaj, ile = u.ile, x = u.x, y = u.y, od = teraz, ziarno = u.x * 7919 + u.y * 104729 + u.tik });
            }
        }

        /// <summary>Etap 3c: coś innego niż ruda leci do licznika (krzyż z warsztatu do wiary) — z kafla (x, y).</summary>
        public void dodaj(string rodzaj, double ile, double x, double y, double teraz)
        {
            if (Nastroj.wolnoRuszac()) loty.Add(new Lot { rodzaj = rodzaj, ile = ile, x = x, y = y, od = teraz, ziarno = Math.Floor(x * 7919 + y * 104729 + teraz + 0.5) });
        }

        /// <summary>Etap 3d: z licznika na mapę — krew zapłacona za rytuał spływa do misy ołtarza na kaflu (x, y).</summary>
        public void oddaj(string rodzaj, double ile, double x, double y, double teraz)
        {
            if (Nastroj.wolnoRuszac()) loty.Add(new Lot { rodzaj = rodzaj, ile = ile, x = x, y = y, od = teraz, ziarno = Math.Floor(x * 7919 + y * 104729 + teraz + 0.5), wstecz = true });
        }

        /// <summary>Ile kruszcu jest jeszcze w powietrzu — licznik pokazuje stan symulacji bez tego.</summary>
        public double wLocie(string rodzaj)
        {
            double n = 0;
            foreach (var l in loty) if (l.rodzaj == rodzaj && !l.wstecz) n += l.ile;
            return n;
        }

        /// <summary>Błysk licznika po doleceniu okrucha: 1 tuż po, 0 po OKRUCH.blyskMs.</summary>
        public double blysk(string rodzaj, double teraz) => Math.Max(0, 1 - (teraz - doleciale[rodzaj]) / OKRUCH.blyskMs);

        /// <summary>Chwila ostatniego dolotu — ziarno kierunków iskier, stałe przez cały błysk.</summary>
        public double dolot(string rodzaj) => doleciale[rodzaj];

        /// <summary>W świecie (pod kamerą): rozbłysk w miejscu rozbitego kafla — złoty przy złocie, iskry przy żelazie.</summary>
        public void rysujNaMapie(IPlotno ctx, Camera cam, double teraz)
        {
            var z = cam.zoom;
            ctx.save();
            foreach (var l in loty)
            {
                var p = (teraz - l.od) / OKRUCH.rozbloskMs;
                if (p < 0 || p > 1 || l.rodzaj == "wiara" || l.rodzaj == "krew") continue;
                double sx = cam.toScreenX(l.x + 0.5), sy = cam.toScreenY(l.y + 0.5);
                if (sx < -z * 3 || sy < -z * 3 || sx > cam.vw + z * 3 || sy > cam.vh + z * 3) continue;
                var g = 1 - p;
                var bl = BARWA[l.rodzaj].blask; double r = bl[0], gg = bl[1], b = bl[2];
                if (l.rodzaj == "zloto")
                {
                    // złoty błysk: poświata i czteroramienna gwiazda, która rośnie i gaśnie
                    var R = z * (0.8 + p * 1.6);
                    var rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
                    rg.addColorStop(0, Barwa.Rgba(r, gg, b, 0.75 * g));
                    rg.addColorStop(1, Barwa.Rgba(r, gg, b, 0));
                    ctx.fillStyle = rg;
                    ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
                    ctx.strokeStyle = Barwa.Rgba(255, 244, 200, 0.95 * g);
                    ctx.lineWidth = Math.Max(1, z * 0.08);
                    var ram = z * (0.5 + p * 1.3);
                    ctx.beginPath();
                    ctx.moveTo(sx - ram, sy); ctx.lineTo(sx + ram, sy);
                    ctx.moveTo(sx, sy - ram); ctx.lineTo(sx, sy + ram);
                    ctx.stroke();
                }
                else
                {
                    // iskry spod kilofa: żar w miejscu uderzenia i kreski rozlatujące się łukiem w dół
                    var R = z * (0.6 + p * 0.8);
                    var rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
                    rg.addColorStop(0, Barwa.Rgba(r, gg, b, 0.55 * g));
                    rg.addColorStop(1, Barwa.Rgba(r, gg, b, 0));
                    ctx.fillStyle = rg;
                    ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
                    ctx.lineCap = "round";
                    ctx.lineWidth = Math.Max(1.5, z * 0.1);
                    for (int k = 0; k < 10; k++)
                    {
                        var a = -Math.PI * (0.05 + 0.9 * los(l.ziarno + k * 31));
                        var v = z * (1 + 2 * los(l.ziarno * 3 + k));
                        double px = sx + JsM.Cos(a) * v * p, py = sy + JsM.Sin(a) * v * p + z * 1.8 * p * p;
                        var ogon = 0.4 * z;
                        ctx.strokeStyle = Barwa.Rgba(255, Math.Floor(200 - 90 * p + 0.5), Math.Floor(120 - 80 * p + 0.5), g);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px - JsM.Cos(a) * ogon, py - JsM.Sin(a) * ogon + ogon * p);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /// <summary>Na ekranie (nad płytą i ramą): okruchy lecące łukiem od kafla do licznika.</summary>
        public void rysujLoty(IPlotno ctx, Plate plate, Camera cam, double teraz)
        {
            if (loty.Count == 0) return;
            var z = cam.zoom;
            var zostaja = new List<Lot>();
            ctx.save();
            foreach (var l in loty)
            {
                var t = (teraz - l.od) / OKRUCH.lotMs;
                if (t >= 1)
                {
                    if (!l.wstecz) { doleciale[l.rodzaj] = teraz; onDolot?.Invoke(l.rodzaj); }
                    continue;
                }
                zostaja.Add(l);
                // start: rozbity kafel (poza kadrem — z brzegu płyty, od strony kafla)
                var mx = Math.Max(plate.x, Math.Min(plate.x + plate.w, plate.x + cam.toScreenX(l.x + 0.5)));
                var my = Math.Max(plate.y, Math.Min(plate.y + plate.h, plate.y + cam.toScreenY(l.y + 0.5)));
                (double x, double y) licznik = cele.TryGetValue(l.rodzaj, out var c) ? c : (plate.x + 20, plate.y - 10);
                // (wstecz: z licznika do kafla — ten sam łuk, w drugą stronę)
                double x0 = l.wstecz ? licznik.x : mx, y0 = l.wstecz ? licznik.y : my;
                (double x, double y) cel = l.wstecz ? (mx, my) : licznik;
                double dx = cel.x - x0, dy = cel.y - y0;
                var d = Math.Sqrt(dx * dx + dy * dy);
                // łuk: najpierw w górę i lekko w bok, potem opada na licznik
                double kx = x0 + dx * 0.35, ky = Math.Max(cel.y - 30, Math.Min(y0, cel.y) - d * OKRUCH.luk);
                // najpierw podskok z kafla (wolno), potem przyspiesza ku licznikowi
                var e = t * t * (3 - 2 * t);
                // krzyż z warsztatu nie leci przez skałę do licznika: unosi się nad warsztatem i gaśnie w świetle
                var unosi = l.rodzaj == "wiara" && !l.wstecz;
                (double, double) pkt(double s) => unosi ? (mx, my - z * 0.6 - s * z * 2.2) : (
                    (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * kx + s * s * cel.x,
                    (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * ky + s * s * cel.y);
                ctx.globalAlpha = unosi ? Math.Min(1, t * 6) * (1 - Math.Max(0, (t - 0.55) / 0.45)) : 1;
                var (px, py) = pkt(e);
                var rozm = Math.Max(6, Math.Min(12, z * 0.55)) * (1 - 0.3 * e);
                var b = BARWA[l.rodzaj];
                double r = b.blask[0], g = b.blask[1], bb = b.blask[2];
                // smuga za okruchem i poświata wokół — na ciemnej skale i ramie musi go być widać
                for (int k = 1; k <= (unosi ? 0 : 7); k++)
                {
                    var s = Math.Max(0, e - k * 0.03);
                    var (qx, qy) = pkt(s);
                    ctx.fillStyle = Barwa.Rgba(r, g, bb, 0.4 * (1 - k / 8.0));
                    ctx.beginPath(); ctx.arc(qx, qy, rozm * (0.6 - k * 0.06), 0, Math.PI * 2); ctx.fill();
                }
                var halo = ctx.createRadialGradient(px, py, 0, px, py, rozm * 2.6);
                halo.addColorStop(0, Barwa.Rgba(r, g, bb, 0.5));
                halo.addColorStop(1, Barwa.Rgba(r, g, bb, 0));
                ctx.fillStyle = halo;
                ctx.fillRect(px - rozm * 2.6, py - rozm * 2.6, rozm * 5.2, rozm * 5.2);
                ctx.save();
                ctx.translate(px, py);
                ctx.beginPath();
                if (l.rodzaj == "wiara")
                {
                    // złoty krzyż z warsztatu: kołysze się w locie, nie koziołkuje
                    ctx.rotate(JsM.Sin(t * 7) * 0.25);
                    krzyz(ctx, rozm * 1.15);
                }
                else if (l.rodzaj == "krew")
                {
                    // kropla krwi: ostrym końcem w stronę, z której przyleciała
                    var (qx, qy) = pkt(Math.Max(0, e - 0.05));
                    ctx.rotate(JsM.Atan2(py - qy, px - qx) - Math.PI / 2);
                    kropla(ctx, rozm * 1.1);
                }
                else
                {
                    // okruch: nieregularny wielokąt, obraca się w locie
                    ctx.rotate(l.ziarno + t * 9);
                    const int n = 6;
                    for (int k = 0; k < n; k++)
                    {
                        var a = ((double)k / n) * Math.PI * 2;
                        var rr = rozm * (0.7 + 0.45 * los(l.ziarno + k * 17));
                        if (k == 0) ctx.moveTo(JsM.Cos(a) * rr, JsM.Sin(a) * rr); else ctx.lineTo(JsM.Cos(a) * rr, JsM.Sin(a) * rr);
                    }
                    ctx.closePath();
                }
                var gr = ctx.createLinearGradient(-rozm, -rozm, rozm, rozm);
                gr.addColorStop(0, b.jasna);
                gr.addColorStop(1, b.ciemna);
                ctx.fillStyle = gr;
                ctx.fill();
                ctx.strokeStyle = b.obrys;
                ctx.lineWidth = 1;
                ctx.stroke();
                // błysk na krawędzi okrucha
                ctx.fillStyle = "rgba(255,248,226,0.9)";
                ctx.beginPath(); ctx.arc(-rozm * 0.3, -rozm * 0.3, Math.Max(0.8, rozm * 0.18), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            loty = zostaja;
        }

        /// <summary>Obrys kropli (wysokość ok. 2`a`, ostry koniec w górze, okrągły spód) — do ścieżki bieżącej.</summary>
        public static void kropla(IPlotno ctx, double a)
        {
            ctx.moveTo(0, -a);
            ctx.quadraticCurveTo(a * 0.62, -a * 0.12, a * 0.55, a * 0.38);
            ctx.arc(0, a * 0.38, a * 0.55, 0, Math.PI);
            ctx.quadraticCurveTo(-a * 0.62, -a * 0.12, 0, -a);
            ctx.closePath();
        }

        /// <summary>Obrys krzyża (ramię `a` od środka w górę i w dół, poprzeczka nad środkiem) — do ścieżki bieżącej.</summary>
        public static void krzyz(IPlotno ctx, double a)
        {
            double s = a * 0.26, r = -a * 0.32, b = a * 0.62;
            var pkt = new (double x, double y)[] {
                (-s / 2, -a), (s / 2, -a), (s / 2, r - s / 2), (b, r - s / 2), (b, r + s / 2), (s / 2, r + s / 2),
                (s / 2, a), (-s / 2, a), (-s / 2, r + s / 2), (-b, r + s / 2), (-b, r - s / 2), (-s / 2, r - s / 2),
            };
            for (int i = 0; i < pkt.Length; i++) { if (i > 0) ctx.lineTo(pkt[i].x, pkt[i].y); else ctx.moveTo(pkt[i].x, pkt[i].y); }
            ctx.closePath();
        }

        /// <summary>
        /// Znaczek licznika w kwadracie `s` (środek w x, y): sztabka żelaza albo samorodek złota. `k` 0..1 — błysk po
        /// doleceniu okrucha: złoto rozbłyskuje, z żelaza sypią się iskry (kierunki z `ziarna`).
        /// </summary>
        public static void znaczekKruszcu(IPlotno ctx, string rodzaj, double x, double y, double s, double k, double ziarno)
        {
            var b = BARWA[rodzaj];
            double r = b.blask[0], g = b.blask[1], bb = b.blask[2];
            ctx.save();
            if (k > 0)
            {
                var R = s * (1.1 + 1.3 * k);
                var rg = ctx.createRadialGradient(x, y, 0, x, y, R);
                rg.addColorStop(0, Barwa.Rgba(r, g, bb, (rodzaj == "zloto" ? 0.8 : 0.6) * k));
                rg.addColorStop(1, Barwa.Rgba(r, g, bb, 0));
                ctx.fillStyle = rg;
                ctx.fillRect(x - R, y - R, R * 2, R * 2);
            }
            ctx.translate(x, y);
            ctx.beginPath();
            if (rodzaj == "zelazo")
            {
                // sztabka: ścięty klin widziany z ukosa — górna ściana jaśniejsza
                double w = s * 0.5, h = s * 0.22, sc = s * 0.14;
                ctx.moveTo(-w, h); ctx.lineTo(w, h); ctx.lineTo(w - sc, -h); ctx.lineTo(-w + sc, -h); ctx.closePath();
                var gr = ctx.createLinearGradient(0, -h, 0, h);
                gr.addColorStop(0, "rgba(206,214,224,1)");
                gr.addColorStop(1, "rgba(96,104,118,1)");
                ctx.fillStyle = gr;
                ctx.fill();
                ctx.strokeStyle = b.obrys; ctx.lineWidth = 1; ctx.stroke();
                ctx.strokeStyle = "rgba(240,244,250,0.7)";
                ctx.beginPath(); ctx.moveTo(-w + sc + 1, -h + 1.5); ctx.lineTo(w - sc - 1, -h + 1.5); ctx.stroke();
            }
            else
            {
                // samorodek: grudka o nierównym brzegu
                const int n = 9;
                for (int i = 0; i < n; i++)
                {
                    var a = ((double)i / n) * Math.PI * 2;
                    var rr = s * 0.4 * (0.78 + 0.3 * los(i * 13 + 5));
                    if (i == 0) ctx.moveTo(JsM.Cos(a) * rr, JsM.Sin(a) * rr * 0.86); else ctx.lineTo(JsM.Cos(a) * rr, JsM.Sin(a) * rr * 0.86);
                }
                ctx.closePath();
                var gr = ctx.createRadialGradient(-s * 0.12, -s * 0.12, 1, 0, 0, s * 0.45);
                gr.addColorStop(0, "rgba(255,240,180,1)");
                gr.addColorStop(0.5, b.jasna);
                gr.addColorStop(1, b.ciemna);
                ctx.fillStyle = gr;
                ctx.fill();
                ctx.strokeStyle = b.obrys; ctx.lineWidth = 1; ctx.stroke();
            }
            ctx.restore();
            if (k <= 0) return;
            ctx.save();
            ctx.lineCap = "round";
            if (rodzaj == "zloto")
            {
                // złoty błysk: gwiazdka na grzbiecie samorodka
                var ram = s * (0.35 + 0.75 * k);
                double sx = x + s * 0.18, sy = y - s * 0.2;
                ctx.strokeStyle = Barwa.Rgba(255, 248, 214, k);
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(sx - ram, sy); ctx.lineTo(sx + ram, sy);
                ctx.moveTo(sx, sy - ram); ctx.lineTo(sx, sy + ram);
                ctx.stroke();
            }
            else
            {
                // iskra: kilka kresek rozlatuje się od sztabki
                var p = 1 - k;
                ctx.lineWidth = 1.6;
                for (int i = 0; i < 9; i++)
                {
                    var a = -Math.PI * (0.02 + 0.96 * los(i * 7 + Math.Floor(ziarno)));
                    var v = s * (0.5 + (1 + 0.8 * los(i * 3 + 1)) * p);
                    double px = x + JsM.Cos(a) * v, py = y + JsM.Sin(a) * v + s * 0.6 * p * p;
                    ctx.strokeStyle = Barwa.Rgba(255, Math.Floor(220 - 80 * p + 0.5), Math.Floor(150 - 100 * p + 0.5), k);
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - JsM.Cos(a) * s * 0.32, py - JsM.Sin(a) * s * 0.32); ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
}
