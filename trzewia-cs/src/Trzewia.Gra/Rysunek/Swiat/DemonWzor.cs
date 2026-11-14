// Port: alpha-1/src/render/demon-wzor.ts — DEMON WEDŁUG WZORU GRAFIKA (Alpha 1, 5.11): Wielki Pomnik z trzech warstw
// rysunku (dane/grafika/pomnik/): demon-sylwetka.png (wypełniona sylwetka), demon-kontur.png (kreska, biała — barwę
// daje gra), demon-rysy.png (same pęknięcia). Stany pomnika: rysy odsłaniają się od głowy w dół, w stanie 2 odpadają
// kawałki na brzegu sylwetki, w stanie 3 rysy żarzą się czerwono, oczy się tlą. Rysunek stopami w (0, 0), w jednostkach
// wysokości postaci H.
// W C# obrazki są zawsze wczytane (z plików, od razu), więc dawna rycina demona (render/demon.ts: rysujDemonaRycina —
// rysunek zastępczy, póki obrazki się nie wczytały) nie jest przeniesiona. Żywy demon (boss, wstawanie, konanie)
// rysuje się z duszków (Rysunek/Duszki/DuszkiDemona.cs).
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Poza demona (render/demon.ts: PozaDemona).</summary>
    public struct PozaDemona
    {
        /// <summary>Żywy (boss) czy kamienny (pomnik).</summary>
        public bool zywy;
        /// <summary>0 — stoi, 1 — przykucnięty jak posąg.</summary>
        public double kuca;
        /// <summary>0 — skrzydła złożone, 1 — rozpostarte.</summary>
        public double skrzydla;
        /// <summary>Oczy: 0 — zgaszone, 1 — płoną.</summary>
        public double oczy;
        /// <summary>Ile rys (0…1 całego kompletu) i żar w nich (0…1); `swiatlo` — złote światło zamiast czerwonego żaru.</summary>
        public double rysy, zar;
        public bool swiatlo;
        /// <summary>Odpadłe kawałki kamienia (0…1).</summary>
        public double ubytki;
        /// <summary>Zamach bliższą ręką (0…1, szczyt w połowie).</summary>
        public double cios;
        /// <summary>Głowa: dodatkowy skłon (rad, + w dół, − w tył).</summary>
        public double glowa;
        /// <summary>Oddech 0…1.</summary>
        public double oddech;
    }

    /// <summary>Punkty demona w jednostkach H (stopy w 0,0): nadgarstki, głowa, pierś.</summary>
    public struct PunktyDemona { public (double x, double y) wrF, wrB, glowa, piers; }

    public static class DemonWzor
    {
        /// <summary>Rysunek wzoru: rozmiar, stopy, wysokość w H i punkty (piksele rysunku).</summary>
        static class WZOR
        {
            public const int szer = 628, wys = 963;
            public const double stopy = 951, srodek = 314;
            /// <summary>cały rysunek (z aureolą) ma tyle wysokości postaci H</summary>
            public const double wysokosc = 1.15;
            public static readonly (double x, double y)[] oczy = { (327, 127), (370, 130) };
            public static readonly (double x, double y) dlonL = (56, 190), dlonP = (584, 190), glowa = (348, 125), piers = (330, 350), aureola = (314, 150);
            /// <summary>odpadłe kawałki kamienia (stan 2+): środek i promień — na brzegu sylwetki</summary>
            public static readonly (double x, double y, double r)[] ubytki = { (172, 18, 22), (433, 16, 20), (32, 130, 16), (575, 130, 15), (96, 900, 16), (552, 898, 14) };
        }

        static readonly Dictionary<string, IObraz> obrazy = new Dictionary<string, IObraz>();
        static IObraz obraz(string rodzaj)
        {
            if (!obrazy.TryGetValue(rodzaj, out var o)) { o = Plotno.Wczytaj("grafika/pomnik/demon-" + rodzaj + ".png"); obrazy[rodzaj] = o; }
            return o;
        }

        static IPlotno plotno() => Plotno.Nowe(WZOR.szer, WZOR.wys);

        /// <summary>Biała warstwa wzoru przemalowana na barwę (raz).</summary>
        static readonly Dictionary<string, IPlotno> barwione = new Dictionary<string, IPlotno>();
        static IPlotno barwa(string rodzaj, string kolor)
        {
            var k = rodzaj + "|" + kolor;
            if (!barwione.TryGetValue(k, out var c))
            {
                c = plotno();
                var g = c;
                g.drawImage(obraz(rodzaj), 0, 0);
                g.globalCompositeOperation = "source-in";
                g.fillStyle = kolor; g.fillRect(0, 0, c.width, c.height);
                g.globalCompositeOperation = "source-over";
                barwione[k] = c;
            }
            return c;
        }

        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }

        /// <summary>
        /// Gotowa postać (bez świecenia): sylwetka z kamieniem albo skórą, cieniowanie, kreska, rysy odsłonięte od góry
        /// do `rysy` i ubytki. Raz na stan — potem już tylko przykładana.
        /// </summary>
        static readonly Dictionary<string, IPlotno> postacie = new Dictionary<string, IPlotno>();
        static IPlotno postac(bool zywy, double rysy, bool ubytki)
        {
            var krok = Math.Floor(rysy * 4 + 0.5) / 4;
            var k = (zywy ? "true" : "false") + "|" + Js.Js.S(krok) + "|" + (ubytki ? "true" : "false");
            if (postacie.TryGetValue(k, out var gotowa)) return gotowa;
            var c = plotno(); var g = c; double W = WZOR.szer, H = WZOR.wys;
            // sylwetka: kamień (szary, jaśniejszy u góry) albo skóra żywego demona (ciemny karmin, żar od piersi)
            g.drawImage(obraz("sylwetka"), 0, 0);
            g.globalCompositeOperation = "source-in";
            var gr = g.createLinearGradient(0, 0, 0, H);
            if (zywy) { gr.addColorStop(0, "#5a2018"); gr.addColorStop(0.45, "#3e1510"); gr.addColorStop(1, "#1c0a08"); }
            else { gr.addColorStop(0, "#857c6e"); gr.addColorStop(0.5, "#6a6257"); gr.addColorStop(1, "#4a443c"); }
            g.fillStyle = gr; g.fillRect(0, 0, W, H);
            g.globalCompositeOperation = "source-atop";
            // cień po bokach i u dołu — bryła, nie płaski wycinek
            var bok = g.createLinearGradient(0, 0, W, 0);
            bok.addColorStop(0, "rgba(0,0,0,0.35)"); bok.addColorStop(0.3, "rgba(0,0,0,0)"); bok.addColorStop(0.7, "rgba(0,0,0,0)"); bok.addColorStop(1, "rgba(0,0,0,0.4)");
            g.fillStyle = bok; g.fillRect(0, 0, W, H);
            if (zywy)
            {
                var zar = g.createRadialGradient(WZOR.piers.x, WZOR.piers.y, 10, WZOR.piers.x, WZOR.piers.y, W * 0.55);
                zar.addColorStop(0, "rgba(200,70,30,0.45)"); zar.addColorStop(1, "rgba(200,70,30,0)");
                g.fillStyle = zar; g.fillRect(0, 0, W, H);
            }
            else
            {
                // ziarno kamienia
                for (int i = 0; i < 1600; i++)
                {
                    g.fillStyle = los(i * 7) > 0.5 ? "rgba(255,248,230,0.07)" : "rgba(0,0,0,0.09)";
                    g.fillRect(los(i * 3 + 1) * W, los(i * 5 + 2) * H, 1 + los(i) * 2.5, 1 + los(i + 9) * 2);
                }
            }
            g.globalCompositeOperation = "source-over";
            // kreska wzoru — dwa razy: po zmniejszeniu cienka kreska blakła i posąg wyglądał na wyblakły
            var kreska = barwa("kontur", zywy ? "rgb(14,4,2)" : "rgb(22,16,12)");
            g.drawImage(kreska, 0, 0); g.drawImage(kreska, 0.6, 0.6);
            // rysy: odsłaniają się od głowy w dół
            if (krok > 0)
            {
                g.save();
                g.beginPath(); g.rect(0, 0, W, H * Math.Min(1, krok * 1.15)); g.clip();
                // pęknięcie: ciemna szczelina pogrubiona o piksel i jasny brzeg kamienia pod nią — widać je z daleka
                var szczelina = barwa("rysy", zywy ? "rgb(10,2,0)" : "rgb(12,8,6)");
                if (!zywy) { g.globalAlpha = 0.55; g.drawImage(barwa("rysy", "rgb(214,200,176)"), 1.5, 2); g.globalAlpha = 1; }
                foreach (var (dx, dy) in new[] { (0.0, 0.0), (1.2, 0.0), (0.0, 1.2), (-1.2, 0.0) }) g.drawImage(szczelina, dx, dy);
                g.restore();
            }
            // odpadłe kawałki: wyrwy na brzegu sylwetki z jasnym przełomem świeżego kamienia
            if (ubytki)
            {
                var wyrwa = new Path2D();
                for (int i = 0; i < WZOR.ubytki.Length; i++)
                {
                    var (ux, uy, r) = WZOR.ubytki[i];
                    for (int j = 0; j < 7; j++)
                    {
                        double a = (j / 7.0) * Math.PI * 2 + los(i * 17 + j) * 0.6, rr = r * (0.6 + los(i * 23 + j) * 0.7);
                        if (j == 0) wyrwa.moveTo(ux + JsM.Cos(a) * rr, uy + JsM.Sin(a) * rr); else wyrwa.lineTo(ux + JsM.Cos(a) * rr, uy + JsM.Sin(a) * rr);
                    }
                    wyrwa.closePath();
                }
                g.globalCompositeOperation = "destination-out";
                g.fill(wyrwa);
                g.globalCompositeOperation = "source-atop";
                g.strokeStyle = "rgba(214,200,174,0.9)"; g.lineWidth = 3; g.stroke(wyrwa);
                g.globalCompositeOperation = "source-over";
            }
            postacie[k] = c;
            return c;
        }

        /// <summary>
        /// Rysuje demona według wzoru. Pozy jak w dawnej rycinie: kuca (przysiad), oddech, cios (wypad do przodu),
        /// glowa (skłon), skrzydla (ogień w aureoli).
        /// </summary>
        public static PunktyDemona rysujWedlugWzoru(IPlotno ctx, double H, PozaDemona p)
        {
            var s = (H * WZOR.wysokosc) / WZOR.wys;            // piksele ekranu na piksel rysunku
            // przysiad tylko u żywego (wstaje z gruzu, pada na kolana) — posąg według wzoru stoi
            var kuca = p.zywy ? p.kuca : 0;
            double sx = 1 + 0.06 * kuca, sy = (1 - 0.26 * kuca) * (1 + (p.zywy ? 0.014 * p.oddech : 0));
            var c = JsM.Sin(Math.PI * Math.Max(0, Math.Min(1, p.cios)));
            (double, double) doH((double x, double y) q) => (((q.x - WZOR.srodek) * s * sx) / H, ((q.y - WZOR.stopy) * s * sy) / H);
            ctx.save();
            // wypad przy ciosie i skłon głowy — cała postać pochyla się nad stopami
            ctx.translate(H * 0.08 * c, 0);
            ctx.rotate(0.09 * c + p.glowa * 0.12);
            ctx.scale(sx, sy);
            ctx.scale(s, s);
            ctx.translate(-WZOR.srodek, -WZOR.stopy);
            void swieci(Action rysuj) { ctx.save(); ctx.globalCompositeOperation = "lighter"; rysuj(); ctx.restore(); }
            // żywy: ogień w aureoli za głową (rośnie ze „skrzydłami”)
            if (p.zywy && p.skrzydla > 0.01) swieci(() =>
            {
                double ax = WZOR.aureola.x, ay = WZOR.aureola.y, R = WZOR.szer * (0.32 + 0.3 * p.skrzydla);
                var g = ctx.createRadialGradient(ax, ay, R * 0.1, ax, ay, R);
                g.addColorStop(0, Barwa.Rgba(255, 120, 40, 0.35 * p.skrzydla)); g.addColorStop(0.6, Barwa.Rgba(200, 50, 20, 0.18 * p.skrzydla)); g.addColorStop(1, "rgba(150,30,10,0)");
                ctx.fillStyle = g; ctx.fillRect(ax - R, ay - R, R * 2, R * 2);
            });
            ctx.drawImage(postac(p.zywy, p.rysy, p.ubytki > 0.5), 0, 0);
            // żar w rysach (stan 3, rozpad, konanie — złoty, gdy `swiatlo`)
            if (p.zar > 0.01 && p.rysy > 0.01) swieci(() =>
            {
                var kol = p.swiatlo ? "rgb(255,214,120)" : "rgb(255,90,40)";
                ctx.save();
                ctx.beginPath(); ctx.rect(0, 0, WZOR.szer, WZOR.wys * Math.Min(1, p.rysy * 1.15)); ctx.clip();
                ctx.shadowColor = kol; ctx.shadowBlur = 8;
                ctx.globalAlpha = Math.Min(1, p.zar);
                var r = barwa("rysy", kol);
                ctx.drawImage(r, 0, 0); ctx.drawImage(r, 0, 0);
                ctx.restore();
            });
            // konanie: złote światło przenika całą postać
            if (p.swiatlo && p.zar > 0.01) swieci(() =>
            {
                ctx.globalAlpha = Math.Min(0.7, p.zar * 0.55);
                ctx.drawImage(barwa("sylwetka", "rgb(255,200,110)"), 0, 0);
            });
            // żywy: żar w piersi
            if (p.zywy && p.zar > 0.01) swieci(() =>
            {
                double px = WZOR.piers.x, py = WZOR.piers.y, R = WZOR.szer * 0.22;
                var g = ctx.createRadialGradient(px, py, 2, px, py, R);
                g.addColorStop(0, Barwa.Rgba(255, 110, 50, 0.4 * p.zar)); g.addColorStop(1, "rgba(255,60,20,0)");
                ctx.fillStyle = g; ctx.fillRect(px - R, py - R, R * 2, R * 2);
            });
            // oczy
            if (p.oczy > 0.01) swieci(() =>
            {
                foreach (var (ox, oy) in WZOR.oczy)
                {
                    const double R = 26;
                    var g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
                    g.addColorStop(0, Barwa.Rgba(255, 236, 170, 0.95 * p.oczy)); g.addColorStop(0.25, Barwa.Rgba(255, 120, 40, 0.75 * p.oczy)); g.addColorStop(1, "rgba(255,40,10,0)");
                    ctx.fillStyle = g; ctx.fillRect(ox - R, oy - R, R * 2, R * 2);
                }
            });
            ctx.restore();
            // dłonie wzniesione: bliższa (wrF) — z prawej
            return new PunktyDemona { wrF = doH(WZOR.dlonP), wrB = doH(WZOR.dlonL), glowa = doH(WZOR.glowa), piers = doH(WZOR.piers) };
        }

        /// <summary>Wysokość całego rysunku (z aureolą) w H.</summary>
        public const double WYSOKOSC_WZORU = WZOR.wysokosc;
    }
}
