// Port: alpha-1/src/render/plate.ts — płyta (prostokąt świata) i to, co na niej i wokół niej: rama fresku z okiem,
// dym wiary pod sklepieniem płyty, powieka snu, złożone dłonie oddania. Tylko układ komputera — bez układów telefonu
// (waski, niski; decyzja użytkownika 9.11: „bez wersji na telefon”), więc i bez wstęgi spisu ras i relikwiarza krwi
// pod płytą, które w Alphie 1 rysował tylko telefon (na komputerze są w księdze).
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyEkran;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyWygladNastroj;
using static Trzewia.Rdzen.SettingsStore;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Płyta na ekranie (render/plate.ts: Plate) — prostokąt świata i marginesy. `waski`/`niski` zawsze false.</summary>
    public sealed class Plate
    {
        public double x, y, w, h, left, bottom, right, top;
        public bool waski, niski;
    }

    /// <summary>Prostokąt na ekranie (render/plate.ts: Obszar; render/przyciski.ts: Prostokat).</summary>
    public struct Obszar
    {
        public double x, y, w, h;
        public Obszar(double x, double y, double w, double h) { this.x = x; this.y = y; this.w = w; this.h = h; }
    }

    public static class Plyta
    {
        const string INK = "rgba(206,192,166,";
        static Styl ink(double a) => Barwa.Rgba(206, 192, 166, a);

        /// <summary>Płyta i marginesy (komputer): rama płyty z lewej i u góry, kolumna z prawej, pas na księgę u dołu.</summary>
        public static Plate computePlate(double vw, double vh)
        {
            var left = EKRAN.ramaPlyty;
            var right = Math.Max(58, Math.Min(104, vw * 0.075));
            var top = EKRAN.ramaPlyty;
            var bottom = Math.Max(EKRAN.dolMin, Math.Min(EKRAN.dolMax, vh * EKRAN.dolCzesc));
            // oprawa (etap 2, za flagą): księga zwinięta w walce z bossem — niski pas, wyższa płyta
            if (Przyciski.KsiegaZwinieta) bottom = Przyciski.DOL_ZWINIETEJ;
            return new Plate { x = left, y = top, w = Math.Max(80, vw - left - right), h = Math.Max(80, vh - top - bottom), left = left, right = right, top = top, bottom = bottom, waski = false, niski = false };
        }

        /// <summary>Złożone dłonie oddania w księdze (prawa karta).</summary>
        public static Obszar obszarOddania(Plate p, double vh)
        {
            var o = Przyciski.ukladKsiegi(Przyciski.ukladDolu(p, vh)).zasoby["oddanie"];
            return new Obszar(o.x - o.s / 2, o.y - o.s / 2, o.s + 6 + o.szer, o.s);
        }

        /// <summary>Pasmo dymu Wiary pod górną krawędzią płyty.</summary>
        public static Obszar obszarWiary(Plate p) => new Obszar(p.x, p.y, p.w, Math.Max(30, p.h * 0.13));

        /// <summary>Spis ludu — na komputerze lewa karta księgi.</summary>
        public static Obszar obszarSpisu(Plate p, double vh)
        {
            var l = Przyciski.ukladKsiegi(Przyciski.ukladDolu(p, vh)).lewa;
            return new Obszar(l.x, l.y, l.w, l.h);
        }

        /// <summary>
        /// Rama płyty malowana jak obramowanie fresku. W lewym pasie ramy namalowane oko: powieka przybrudzoną bielą,
        /// źrenica czerwona — oddycha z rdzeniem, mruga nieregularnie i wodzi źrenicą za kursorem.
        /// </summary>
        public static void drawFrame(IPlotno ctx, Plate p, double time, double oddech = 0.5, (double x, double y)? kursor = null)
        {
            const double pas = 9;
            var gr = pas * 1.66;
            Fresk.ramaFresku(ctx, p.x - gr, p.y - gr, p.w + gr * 2, p.h + gr * 2, pas, time, 3);
            double ex = p.x - gr + pas / 2, ey = p.y + p.h / 2;
            ctx.save();
            // migdał oka na czerwonym pasie; mruga nieregularnie (czasem dwa razy pod rząd)
            var cyklMrugu = Math.Floor(time / 5200);
            var losMrugu = JsM.Sin(cyklMrugu * 91.7) * 4375.85 % 1;
            var wCyklu = time % 5200;
            var mrug = wCyklu < 150 || (losMrugu > 0.6 && wCyklu > 330 && wCyklu < 450) ? 0.15 : 1;
            double hw = pas * 0.62, hh = pas * 1.7;
            // źrenica podąża za kursorem — powoli, jakby oko dopiero się budziło
            var doX = kursor is { } k1 && Nastroj.wolnoRuszac() ? Math.Max(-1, Math.Min(1, (k1.x - ex) / 420)) : 0;
            var doY = kursor is { } k2 && Nastroj.wolnoRuszac() ? Math.Max(-1, Math.Min(1, (k2.y - ey) / 320)) : 0;
            var ox = Nastroj.plynnie("oko-x", doX, 420) * hw * NASTROJ.okoPodaza;
            var oy = Nastroj.plynnie("oko-y", doY, 420) * hh * NASTROJ.okoPodaza;
            var oko = new Path2D();
            oko.moveTo(ex, ey - hh); oko.quadraticCurveTo(ex + hw * 1.6, ey, ex, ey + hh); oko.quadraticCurveTo(ex - hw * 1.6, ey, ex, ey - hh);
            ctx.fillStyle = "#b9aa8c";
            ctx.save(); ctx.translate(ex, ey); ctx.scale(mrug, 1); ctx.translate(-ex, -ey); ctx.fill(oko); ctx.restore();
            ctx.strokeStyle = "#1e0904"; ctx.lineWidth = 1.2; ctx.stroke(oko);
            if (mrug > 0.5)
            {
                ctx.save();
                ctx.clip(oko);
                var z = FRESK.zar;
                ctx.shadowColor = Barwa.Rgba(z[0], z[1], z[2], 0.5 + 0.3 * oddech);
                ctx.shadowBlur = pas * 0.8;
                ctx.fillStyle = Barwa.Rgba(140, 26, 16, 0.75 + 0.25 * oddech);
                ctx.beginPath(); ctx.ellipse(ex + ox, ey + oy, hw * 0.55, hh * (0.3 + 0.12 * oddech), 0, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = "#0c0403";
                ctx.beginPath(); ctx.ellipse(ex + ox * 1.15, ey + oy * 1.15, hw * 0.2, hh * (0.12 + 0.08 * oddech), 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Złożone do modlitwy dłonie w kwadracie 100×100 (prawa dłoń, lewa to jej lustro).</summary>
        static readonly (char k, double[] v)[] DLON =
        {
            ('M', new[] { 50.4, 2 }),
            ('C', new[] { 54.0, 2, 56, 5, 56.5, 10 }),       // środkowy palec
            ('C', new[] { 59.5, 11.5, 61, 15, 61, 20 }),   // serdeczny
            ('C', new[] { 64.0, 22, 65.5, 26, 65.5, 31 }),   // mały
            ('C', new[] { 66.5, 41, 69.5, 52, 73.5, 61 }), // krawędź dłoni
            ('L', new[] { 81.0, 67 }),                       // mankiet
            ('L', new[] { 88.0, 100 }),                      // rękaw
            ('L', new[] { 66.0, 100 }),
            ('L', new[] { 64.0, 82 }),
            ('L', new[] { 59.0, 77 }),                       // nadgarstek od środka
            ('C', new[] { 55.5, 68, 52, 56, 51.4, 44 }),   // wnętrze dłoni pod kciukiem
            ('C', new[] { 51.0, 30, 50.5, 14, 50.4, 2 }),
        };
        static (Path2D obrys, Path2D rysy)? dlonie;

        static (Path2D obrys, Path2D rysy) zlozoneDlonie()
        {
            if (dlonie is { } d) return d;
            var obrys = new Path2D(); var rysy = new Path2D();
            foreach (var k in new double[] { 1, -1 })
            {
                double X(double v) => 50 + k * (v - 50);
                foreach (var (kind, v) in DLON)
                {
                    if (kind == 'M') obrys.moveTo(X(v[0]), v[1]);
                    else if (kind == 'L') obrys.lineTo(X(v[0]), v[1]);
                    else obrys.bezierCurveTo(X(v[0]), v[1], X(v[2]), v[3], X(v[4]), v[5]);
                }
                obrys.closePath();
                // palce, kciuk i brzegi mankietu
                rysy.moveTo(X(56.5), 10); rysy.bezierCurveTo(X(57), 20, X(59), 34, X(62), 44);
                rysy.moveTo(X(61), 20); rysy.bezierCurveTo(X(61.5), 28, X(63), 36, X(65), 42);
                rysy.moveTo(X(51.6), 46); rysy.bezierCurveTo(X(55), 44, X(57.5), 52, X(58.5), 60);
                rysy.moveTo(X(73.5), 61); rysy.lineTo(X(64), 82);
                rysy.moveTo(X(81), 67); rysy.lineTo(X(66), 86);
            }
            dlonie = (obrys, rysy);
            return dlonie.Value;
        }

        /// <summary>
        /// Oddanie najwierniejszej nacji: złożone dłonie napełniają się złotem od rękawów po czubki palców, kreska
        /// w poprzek to próg pielgrzymki. Alpha 1: z `miejsce` — same dłonie (liczbę i dopisek pisze księga).
        /// </summary>
        public static void drawOddanie(IPlotno ctx, Plate p, Sim sim, double vh, (double x, double y, double h)? miejsce = null)
        {
            var klan = Pielgrzymka.najwierniejsza(sim);
            var oddanie = klan != null ? klan.devotion : 0;
            var prog = PIELGRZYMKA.oddanieNacji;
            var dosc = oddanie > prog;
            double x, y, bok;
            if (miejsce is { } m) { x = m.x; y = m.y; bok = m.h; }
            else { var o = obszarOddania(p, vh); x = o.x; y = o.y; bok = o.h; }
            var (obrys, rysy) = zlozoneDlonie();
            var s = bok / 100;
            var poziom = 100 * (1 - Math.Max(0, Math.Min(1, oddanie)));
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(s, s);
            // wierni idą pod rdzeń: za dłońmi tli się blask
            if (dosc)
            {
                var tetno = 0.5 + 0.5 * JsM.Sin(Rdzen.Wydajnosc.Teraz() * 0.0021);
                var g = ctx.createRadialGradient(50, 34, 4, 50, 34, 66);
                g.addColorStop(0, Barwa.Rgba(240, 200, 120, 0.22 + 0.12 * tetno));
                g.addColorStop(1, "rgba(240,200,120,0)");
                ctx.fillStyle = g;
                ctx.fillRect(-20, -20, 140, 140);
            }
            ctx.fillStyle = "rgba(14,9,6,0.96)";
            ctx.fill(obrys);
            var zalane = new Path2D();
            zalane.rect(0, poziom, 100, 100 - poziom);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.save();
            ctx.clip(obrys);
            Fresk.pigment(ctx, zalane, dosc ? FRESK.zloto : FRESK.ugier, 0.85, "zloto");
            // pod lustrem złota rysy malowane sinopią, nad nim — blady szkic na ciemnym
            ctx.lineWidth = 1 / s;
            if (bok >= 26)
            {
                ctx.save(); ctx.clip(zalane);
                ctx.strokeStyle = "rgba(92,31,18,0.8)"; ctx.stroke(rysy);
                ctx.restore();
                ctx.strokeStyle = ink(0.22);
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 100, poziom); ctx.clip(); ctx.stroke(rysy); ctx.restore();
            }
            ctx.strokeStyle = "rgba(255,236,186,0.95)";
            ctx.lineWidth = 1.2 / s;
            ctx.beginPath(); ctx.moveTo(0, poziom); ctx.lineTo(100, poziom); ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = dosc ? "rgba(246,216,142,0.95)" : ink(0.8);
            ctx.lineWidth = 1.1 / s;
            ctx.stroke(obrys);
            // kreska progu pielgrzymki: w poprzek dłoni, żeby było widać, ile brakuje
            var progY = 100 * (1 - prog);
            ctx.strokeStyle = dosc ? "rgba(246,216,142,0.95)" : "rgba(246,216,142,0.6)";
            ctx.lineWidth = 1 / s;
            ctx.setLineDash(2 / s, 2 / s);
            ctx.beginPath(); ctx.moveTo(-5 / s, progY); ctx.lineTo(100, progY); ctx.stroke();
            ctx.setLineDash();
            ctx.restore();
            if (miejsce != null) return;
            ctx.save();
            var ile = $"{Js.Js.S(Math.Floor(oddanie * 100))}%";
            var dopisek = klan == null ? "nikt nie wierzy" : dosc ? "idą do krypty" : $"pielgrzymka od {Js.Js.S(Math.Floor(prog * 100 + 0.5))}%";
            ctx.font = $"italic {Js.Js.S(Math.Max(13, bok * 0.3))}px {Ink.SERIF}";
            ctx.fillStyle = ink(0.9);
            ctx.textAlign = "left";
            ctx.fillText($"oddanie {ile}", x + bok + 6, y + bok * 0.55);
            ctx.fillStyle = dosc ? "rgba(246,216,142,0.95)" : ink(0.7);
            ctx.fillText(dopisek, x + bok + 6, y + bok * 0.95);
            ctx.restore();
        }

        /// <summary>Wiara: dym ofiarny gęstniejący pod sklepieniem płyty.</summary>
        public static void drawSmoke(IPlotno ctx, Plate p, Sim sim, double time)
        {
            var faith = Math.Min(1, sim.wiara / 120);
            if (faith < 0.01) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(p.x, p.y, p.w, p.h);
            ctx.clip();
            var band = p.h * (0.07 + faith * 0.1);
            var g = ctx.createLinearGradient(0, p.y, 0, p.y + band);
            g.addColorStop(0, Barwa.Rgba(232, 216, 186, 0.06 + faith * 0.14));
            g.addColorStop(1, "rgba(232,216,186,0)");
            ctx.fillStyle = g;
            ctx.fillRect(p.x, p.y, p.w, band);
            for (int i = 0; i < 6; i++)
            {
                var t = time * (ustawienia.ograniczRuch ? 0.00005 : 0.00018) + i * 2.1;
                var x = p.x + ((JsM.Sin(t * 1.3 + i) * 0.5 + 0.5) * p.w);
                var y = p.y + band * (0.25 + 0.45 * JsM.Sin(t * 2.3 + i));
                var r = band * (0.45 + 0.4 * JsM.Sin(t + i));
                var rg = ctx.createRadialGradient(x, y, 0, x, y, Math.Max(4, r));
                rg.addColorStop(0, Barwa.Rgba(236, 222, 192, 0.05 * faith));
                rg.addColorStop(1, "rgba(236,222,192,0)");
                ctx.fillStyle = rg;
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
            ctx.restore();
        }

        /// <summary>Sen: powieka schodząca z góry i z dołu płyty. Przegraną widać, zanim nadejdzie.</summary>
        public static void drawEyelid(IPlotno ctx, Plate p, Sim sim, double teraz = 0)
        {
            if (sim.sen < 0.02) return;
            var d = p.h * 0.42 * sim.sen;
            // powieka jest sina, nie czarna — czarne pasy nie różniły się od zwykłego mroku
            Styl barwa(double a) => Barwa.Rgba(26, 22, 44, a);
            var g1 = ctx.createLinearGradient(0, p.y, 0, p.y + d);
            g1.addColorStop(0, barwa(0.97)); g1.addColorStop(0.7, barwa(0.5)); g1.addColorStop(1, barwa(0));
            ctx.fillStyle = g1;
            ctx.fillRect(p.x, p.y, p.w, d);
            var g2 = ctx.createLinearGradient(0, p.y + p.h, 0, p.y + p.h - d);
            g2.addColorStop(0, barwa(0.97)); g2.addColorStop(0.7, barwa(0.5)); g2.addColorStop(1, barwa(0));
            ctx.fillStyle = g2;
            ctx.fillRect(p.x, p.y + p.h - d, p.w, d);
            // rzęsy: kreski wzdłuż krawędzi powieki, żeby to był kształt oka, a nie winieta
            ctx.save();
            ctx.strokeStyle = Barwa.Rgba(150, 146, 180, 0.25 + sim.sen * 0.4);
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var x = p.x; x < p.x + p.w; x += 9)
            {
                var f = JsM.Sin(x * 0.07) * 2;
                ctx.moveTo(x, p.y + d + f); ctx.lineTo(x + 3, p.y + d - 5 + f);
                ctx.moveTo(x, p.y + p.h - d - f); ctx.lineTo(x + 3, p.y + p.h - d + 5 - f);
            }
            ctx.stroke();
            if (sim.sen > 0.25)
            {
                var puls = 0.55 + 0.45 * JsM.Sin(teraz * 0.0018);
                // dwa różne powody snu mają dwa różne zdania
                int zywych = 0;
                foreach (var c in sim.creatures) if (!(c.dead || c.race == Race.HUMAN)) zywych++;
                var zPustki = zywych < 14 && sim.dominance < 0.8;
                var podpis = sim.sen <= 0.7 ? "powieka opada" : zPustki ? "zasypiasz — nie ma już komu o tobie pamiętać" : "zasypiasz — jedna krew zjada resztę";
                var rozmiar = Math.Max(15, Math.Min(22, p.w * 0.022));
                ctx.textAlign = "center";
                ctx.font = $"italic {Js.Js.S(rozmiar)}px {Ink.SERIF}";
                var szer = ctx.measureText(podpis).width;
                double cx = p.x + p.w / 2, cy = p.y + d + Math.Max(22, p.h * 0.04);
                ctx.fillStyle = "rgba(14,12,26,0.86)";
                ctx.fillRect(cx - szer / 2 - 12, cy - rozmiar, szer + 24, rozmiar * 1.7);
                ctx.strokeStyle = Barwa.Rgba(150, 146, 190, 0.35 + puls * 0.3);
                ctx.lineWidth = 1;
                ctx.strokeRect(cx - szer / 2 - 12, cy - rozmiar, szer + 24, rozmiar * 1.7);
                ctx.fillStyle = Barwa.Rgba(214, 210, 240, 0.75 + puls * 0.25);
                ctx.fillText(podpis, cx, cy + rozmiar * 0.2);
            }
            ctx.restore();
        }
    }
}
