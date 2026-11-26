// Port: alpha-1/src/atlas/tablice.ts (część z rycinami) — ryciny tablic atlasu. Postacie ludu z tych samych arkuszy
// klatek co w grze (atrapa świata: jedna góra z ziarnem 1 zamiast obiektu { clans } z TS — rysunek z arkuszy pyta świat
// o kafle i tik), demon z arkusza „demon” (w TS kukła z demon-boss.ts).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Rysunek.Duszki;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyWalka;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyZbroja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Rysunek.Ryciny;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Atlas
{
    public static partial class RycinyAtlasu
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        const double PI = Math.PI;
        static double lerp(double a, double b, double t) => a + (b - a) * t;

        /// <summary>Rysunek w pełni wykonany — przerywniki rysują się w takt narracji, tablica od razu cała.</summary>
        public static Action<PlotnoRyciny> cala(Action<PlotnoRyciny> f) => p => { var q = p.Kopia(); q.p = 1; q.takt = 99; q.taktP = 1; f(q); };

        /// <summary>Tło rycin postaci: sklepienie jaskini kreskowane jak w atlasie.</summary>
        static void sklepienie(IPlotno ctx, double w, double h, double ziarno)
        {
            var luk = new Path2D();
            luk.moveTo(0, 0); luk.lineTo(w, 0); luk.lineTo(w, h);
            for (int i = 12; i >= 0; i--)
            {
                var x = (i / 12.0) * w;
                var y = h * (0.86 + 0.05 * JsM.Sin(i * 1.7 + ziarno));
                luk.lineTo(x, y);
            }
            luk.closePath();
            var pustka = new Path2D();
            pustka.ellipse(w / 2, h * 0.62, w * 0.46, h * 0.52, 0, 0, PI * 2);
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            var skala = new Path2D();
            skala.addPath(luk);
            ctx.fillStyle = "rgba(40,30,24,0.9)";
            ctx.fill(skala);
            kreskuj(ctx, skala, 0.7 + ziarno * 0.1, 5, rgba(BARWA.atrament, 0.2), 1);
            // pustka jaskini — ciepły półmrok, w którym stoi postać
            var g = ctx.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, w * 0.5);
            g.addColorStop(0, "rgba(70,52,38,0.95)");
            g.addColorStop(1, "rgba(14,10,9,0.95)");
            ctx.fillStyle = g;
            ctx.fill(pustka);
            // podłoga
            var podloga = new Path2D();
            podloga.rect(0, h * 0.82, w, h * 0.18);
            ctx.fillStyle = "rgba(22,16,13,0.97)";
            ctx.fill(podloga);
            kreskuj(ctx, podloga, 0.35, 4, rgba(BARWA.atrament, 0.32), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.6);
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(0, h * 0.82); ctx.lineTo(w, h * 0.82); ctx.stroke();
            ctx.restore();
        }

        static Sim? swiatAtrap;
        /// <summary>Świat dla atrap — jedna góra na wszystkie ryciny (rysunek z arkuszy pyta o kafle i tik).</summary>
        static Sim SwiatAtrap => swiatAtrap ??= new Sim(1);

        /// <summary>Atrapa postaci dla figur — rysunek potrzebuje rasy, roli i hełmu.</summary>
        static readonly Dictionary<string, Creature> atrapy = new Dictionary<string, Creature>();
        static (Sim sim, Creature c) atrapa(int rasa, string? rola = null, bool helm = false)
        {
            var klucz = $"{rasa}|{rola ?? ""}|{(helm ? 1 : 0)}";
            if (!atrapy.TryGetValue(klucz, out var c))
            {
                c = Stworzenia.makeCreature(rasa, 0, 0, 0, 900 + rasa);
                if (rola != null) c.rola = rola;
                if (helm) c.helm = true;
                atrapy[klucz] = c;
            }
            return (SwiatAtrap, c);
        }

        public static Action<PlotnoRyciny> postac(int rasa, string czyn, double skala = 1, string? rola = null, bool helm = false) => P =>
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, rasa);
            var (sim, c) = atrapa(rasa, rola, helm);
            var wys = h * 0.5 * skala;
            ctx.save();
            ctx.translate(w / 2, h * 0.82);
            Figury.rysujPostac(ctx, sim, c, wys, t, czyn);
            ctx.restore();
        };

        public static void pielgrzymka(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            // skała z wąskim szybem w dół i rdzeniem na dnie
            var skala = new Path2D();
            skala.rect(0, 0, w, h);
            var szyb = new Path2D();
            double sx = w * 0.5, sz = w * 0.05;
            szyb.rect(sx - sz, 0, sz * 2, h * 0.72);
            szyb.moveTo(sx + w * 0.2, h * 0.8);
            szyb.ellipse(sx, h * 0.8, w * 0.2, h * 0.14, 0, 0, PI * 2);
            ctx.fillStyle = "rgba(36,27,22,0.95)";
            ctx.fill(skala);
            kreskuj(ctx, skala, 0.62, 5, rgba(BARWA.atrament, 0.22), 1);
            ctx.fillStyle = "rgba(20,14,12,1)";
            ctx.fill(szyb);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.55);
            ctx.lineWidth = 1.3;
            ctx.stroke(szyb);
            var puls = 0.5 + 0.5 * JsM.Sin(t * 0.003);
            var g = ctx.createRadialGradient(sx, h * 0.84, 2, sx, h * 0.84, h * 0.12);
            g.addColorStop(0, Barwa.Rgba(255, 120 + 60 * puls, 100, 1));
            g.addColorStop(1, "rgba(120,20,26,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(sx, h * 0.84, h * 0.12, 0, PI * 2); ctx.fill();
            // pielgrzymi schodzący po ścianach szybu
            var (sim, c) = atrapa(Race.GOBLIN);
            for (int i = 0; i < 3; i++)
            {
                var y = h * (0.18 + i * 0.2 + 0.03 * JsM.Sin(t * 0.001 + i));
                ctx.save();
                ctx.translate(sx + (i % 2 != 0 ? sz * 0.5 : -sz * 0.5), y);
                Figury.rysujPostac(ctx, sim, c, h * 0.13, t + i * 400, "wspina");
                ctx.restore();
            }
            ctx.restore();
        }

        public static void pauza(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            // szkice rozkazów wokół klepsydry — przerywane, płynące
            ctx.setLineDash(6, 6);
            ctx.lineDashOffset = -t * 0.02;
            ctx.lineWidth = 1.5;
            var kr = new[] { (0.2, 0.3, 0.1, "rgba(236,226,204,0.8)"), (0.8, 0.28, 0.08, "rgba(156,214,122,0.8)"), (0.22, 0.75, 0.09, "rgba(206,156,96,0.8)"), (0.78, 0.72, 0.1, "rgba(250,216,136,0.8)") };
            foreach (var (x, y, r, k) in kr)
            {
                ctx.strokeStyle = k;
                ctx.beginPath(); ctx.arc(w * x, h * y, h * r * 1.6, 0, PI * 2); ctx.stroke();
            }
            ctx.setLineDash();
            // klepsydra
            double s = h * 0.34, cx = w / 2, cy = h * 0.52;
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.9);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.42, cy - s * 0.5); ctx.lineTo(cx + s * 0.42, cy - s * 0.5);
            ctx.lineTo(cx - s * 0.42, cy + s * 0.5); ctx.lineTo(cx + s * 0.42, cy + s * 0.5);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.52, cy - s * 0.56); ctx.lineTo(cx + s * 0.52, cy - s * 0.56);
            ctx.moveTo(cx - s * 0.52, cy + s * 0.56); ctx.lineTo(cx + s * 0.52, cy + s * 0.56);
            ctx.stroke();
            // piasek zatrzymany w pół ruchu
            var piasek = new Path2D();
            piasek.moveTo(cx - s * 0.3, cy - s * 0.38); piasek.lineTo(cx + s * 0.3, cy - s * 0.38); piasek.lineTo(cx, cy - s * 0.04);
            piasek.closePath();
            kropkuj(ctx, piasek, 500, "rgba(240,220,180,0.8)", 3);
            ctx.fillStyle = "rgba(240,220,180,0.8)";
            ctx.fillRect(cx - 1, cy - s * 0.04, 2, s * 0.3);
            ctx.restore();
        }

        /// <summary>Droga do wolności: gniazdo u góry, złota kreska w dół, cztery stacje i rdzeń w skorupie.</summary>
        public static void drogaWolnosci(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            var skala = new Path2D();
            skala.rect(0, 0, w, h);
            kreskuj(ctx, skala, 0.7, 5, rgba(BARWA.atrament, 0.1), 1);
            // gniazdo: jaskinia u góry z lewej
            ctx.fillStyle = "#0d0a09";
            ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.2, w * 0.13, h * 0.09, 0, 0, PI * 2); ctx.fill();
            ctx.strokeStyle = rgba(BARWA.atrament, 0.5);
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.8);
            for (int i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w * (0.13 + i * 0.035), h * 0.24, 1.8, 0, PI * 2); ctx.fill(); }
            // rdzeń w skorupie na dole
            double rx = w * 0.72, ry = h * 0.8;
            var g = ctx.createRadialGradient(rx, ry, 1, rx, ry, h * 0.14);
            g.addColorStop(0, "rgba(230,90,60,0.9)");
            g.addColorStop(1, "rgba(230,90,60,0)");
            ctx.fillStyle = g;
            ctx.fillRect(rx - h * 0.14, ry - h * 0.14, h * 0.28, h * 0.28);
            ctx.strokeStyle = rgba(BARWA.atrament, 0.7);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(rx, ry, h * 0.08, PI * 1.1, PI * 1.9); ctx.stroke();
            // droga: złota, przerywana, płynąca w dół
            var punkty = new[] { (0.24, 0.27), (0.36, 0.34), (0.33, 0.47), (0.5, 0.52), (0.56, 0.62), (0.7, 0.63), (0.72, 0.72) };
            ctx.setLineDash(6, 5);
            ctx.lineDashOffset = -t * 0.02;
            ctx.strokeStyle = "rgba(250,196,110,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (int i = 0; i < punkty.Length; i++) { if (i > 0) ctx.lineTo(w * punkty[i].Item1, h * punkty[i].Item2); else ctx.moveTo(w * punkty[i].Item1, h * punkty[i].Item2); }
            ctx.stroke();
            ctx.setLineDash();
            // cztery stacje: wiara, oddanie, droga, skorupa
            foreach (var k in new[] { 1, 2, 4, 6 })
            {
                var (x, y) = punkty[k];
                ctx.fillStyle = "#0d0a09";
                ctx.beginPath(); ctx.arc(w * x, h * y, 5, 0, PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(250,206,130,0.95)";
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Wielki Pomnik: kamienny demon na cokole, zakuty w łańcuchy, przechodzi kolejne stany pękania.</summary>
        public static void pomnikRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 21);
            var stan = Math.Floor(t / 2200) % 4;
            var swieze = Math.Max(0, 1 - (t % 2200) / 600);
            var H = h * 0.95;
            RysPomnik.rysujPosag(ctx, w / 2, h * 0.86, H, H / POMNIK.wysokosc, stan, t, stan != 0 ? swieze : 0);
        }

        /// <summary>Demon z pomnika: przebija się z gruzu, kamień ożywa i ryk (w kółko). Duszki jak w grze.</summary>
        public static void demonRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 22);
            double H = h * 0.95, y = h * 0.86;
            RysPomnik.cokol(ctx, w / 2, y, H, true, H / POMNIK.wysokosc);
            RysPomnik.gruz(ctx, w / 2, y, H, 1, t, H / POMNIK.wysokosc);
            var k = Math.Min(1, (t % 5200) / 4200);
            // Krąg Trzeci: pieczęć pękła — z góry zeskakuje Cerber, ląduje w pyle i wyje (render/pomnik.ts kręgu)
            if (Krag.Wlaczony) { RysPomnik.rysujWstajacegoCerbera(ctx, w / 2, y, h * 0.62, k, t); return; }
            ctx.save(); ctx.translate(w / 2, y);
            DuszkiDemona.rysujWstajacego(ctx, h * 0.62, k);
            ctx.restore();
        }

        /// <summary>Ostatnie uderzenie: złote światło rozsadza demona od środka, pada na kolana i rozsypuje się w popiół.</summary>
        public static void uderzenieRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 23);
            var k = Math.Min(1, (t % 4600) / 3800);
            double x = w * 0.55, y = h * 0.86, hh = h * 0.62;
            ctx.save();
            // światło z wnętrza i rozbłysk
            ctx.globalCompositeOperation = "lighter";
            var a = k < 0.55 ? k / 0.55 * 0.5 : Math.Max(0, 1 - (k - 0.55) / 0.3);
            var g = ctx.createRadialGradient(x, y - hh * 0.5, 0, x, y - hh * 0.5, hh);
            g.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.6 * a)); g.addColorStop(1, "rgba(255,200,120,0)");
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            ctx.restore();
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(-1, 1);
            if (Krag.Wlaczony) RysPomnik.rysujKonajacegoCerbera(ctx, hh, k, t, null);
            else DuszkiDemona.rysujKonajacego(ctx, hh, k);
            ctx.restore();
            // ostrze rycerza: jasna smuga cięcia na początku
            if (k < 0.15)
            {
                ctx.save();
                ctx.strokeStyle = Barwa.Rgba(255, 250, 230, 1 - k / 0.15);
                ctx.lineWidth = 3; ctx.lineCap = "round";
                ctx.beginPath(); ctx.arc(x - hh * 0.35, y - hh * 0.5, hh * 0.35, -1.2, 0.6); ctx.stroke();
                ctx.restore();
            }
        }

        /// <summary>Skorupa: rdzeń w komorze, kamienny pierścień, rysa w stronę trzech klęczących.</summary>
        public static void skorupa(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            ctx.save();
            ctx.fillStyle = "#0d0a09";
            ctx.fillRect(0, 0, w, h);
            double cx = w / 2, cy = h * 0.55, R = h * 0.36;
            // kamień skorupy: gruby pierścień kreskowany
            var pier = new Path2D();
            pier.arc(cx, cy, R, 0, PI * 2);
            pier.arc(cx, cy, R * 0.55, 0, PI * 2, true);
            ctx.fillStyle = "rgba(58,48,40,0.95)";
            ctx.fill(pier, "evenodd");
            kreskuj(ctx, pier, 0.8, 4, rgba(BARWA.atrament, 0.28), 1);
            // rdzeń w komorze
            var g = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.45);
            g.addColorStop(0, "rgba(236,96,64,0.95)");
            g.addColorStop(1, "rgba(236,96,64,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, PI * 2); ctx.fill();
            // rysa: pęknięcia od góry w stronę rdzenia, kolejne kafle wypadają
            var post = 0.5 + 0.5 * JsM.Sin(t * 0.0008);
            ctx.strokeStyle = "rgba(250,206,130,0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            var dl = R * 0.45 * post;
            ctx.moveTo(cx, cy - R); ctx.lineTo(cx - 3, cy - R + dl * 0.4); ctx.lineTo(cx + 2, cy - R + dl * 0.75); ctx.lineTo(cx, cy - R + dl);
            ctx.stroke();
            // trzej wierni nad skorupą
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.9);
            foreach (var dx in new[] { -0.13, 0, 0.13 })
            {
                double x = cx + w * dx, y = cy - R - h * 0.06;
                ctx.beginPath(); ctx.arc(x, y - 5, 3, 0, PI * 2); ctx.fill();
                ctx.fillRect(x - 2.5, y - 2, 5, 7);
            }
            ctx.restore();
        }

        /// <summary>Kruszce: robotnik kuje ścianę z żyłą — okruch leci łukiem do sztabki i samorodka nad nią.</summary>
        public static void kruszce(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 2);
            // ściana po prawej: lita skała z kępą żelaza (rdza) i grudkami złota
            var sciana = new Path2D();
            sciana.moveTo(w * 0.62, h * 0.82); sciana.lineTo(w * 0.6, h * 0.55); sciana.lineTo(w * 0.66, h * 0.3);
            sciana.lineTo(w, h * 0.22); sciana.lineTo(w, h * 0.82); sciana.closePath();
            ctx.save();
            ctx.fillStyle = "rgba(46,34,27,0.98)";
            ctx.fill(sciana);
            kreskuj(ctx, sciana, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.7);
            ctx.lineWidth = 1.4;
            ctx.stroke(sciana);
            ctx.clip(sciana);
            var grudki = new[] { (0.7, 0.62, 0.05, "zelazo"), (0.76, 0.56, 0.045, "zelazo"), (0.72, 0.7, 0.04, "zelazo"), (0.8, 0.66, 0.035, "zelazo"), (0.86, 0.4, 0.03, "zloto"), (0.9, 0.47, 0.025, "zloto") };
            foreach (var (x, y, r, rodzaj) in grudki)
            {
                var gr = new Path2D();
                gr.ellipse(w * x, h * y, h * r * 1.25, h * r, 0.4, 0, PI * 2);
                ctx.fillStyle = rodzaj == "zelazo" ? "rgba(128,58,40,0.95)" : "rgba(214,168,70,0.95)";
                ctx.fill(gr);
                kropkuj(ctx, gr, 40, rodzaj == "zelazo" ? "rgba(196,204,214,0.6)" : "rgba(255,240,190,0.8)", x * 10);
            }
            ctx.restore();
            // robotnik z kilofem przy ścianie
            var (sim, c) = atrapa(Race.GOBLIN, "robotnik");
            ctx.save();
            ctx.translate(w * 0.5, h * 0.82);
            Figury.rysujPostac(ctx, sim, c, h * 0.42, t, "kopie");
            ctx.restore();
            // okruch w locie: łuk przerywaną kreską od ściany do liczników
            double x0 = w * 0.62, y0 = h * 0.58, x1 = w * 0.16, y1 = h * 0.16;
            ctx.save();
            ctx.setLineDash(3, 5);
            ctx.lineDashOffset = -t * 0.02;
            ctx.strokeStyle = "rgba(246,216,142,0.6)";
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(w * 0.4, h * 0.02, x1 + h * 0.08, y1); ctx.stroke();
            ctx.restore();
            var s = (t * 0.0004) % 1;
            var ox = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * w * 0.4 + s * s * (x1 + h * 0.08);
            var oy = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * h * 0.02 + s * s * y1;
            ctx.fillStyle = "rgba(176,184,196,1)";
            ctx.strokeStyle = "rgba(22,18,20,0.95)";
            ctx.beginPath(); ctx.arc(ox, oy, h * 0.022, 0, PI * 2); ctx.fill(); ctx.stroke();
            // liczniki: sztabka i samorodek
            Urobki.znaczekKruszcu(ctx, "zelazo", x1, y1, h * 0.12, 0.4 + 0.3 * JsM.Sin(t * 0.004), 7);
            Urobki.znaczekKruszcu(ctx, "zloto", x1 + h * 0.15, y1, h * 0.12, 0.3 + 0.3 * JsM.Sin(t * 0.004 + 2), 11);
        }

        /// <summary>Robotnik z ludu na rycinie: stopy w (x, y), wysokość hh, czynność, zwrócony w prawo albo w lewo.</summary>
        static void robotnikNaRycinie(IPlotno ctx, double x, double y, double hh, double t, string cz, double kier = 1, string rola = "robotnik")
        {
            var (sim, c) = atrapa(Race.GOBLIN, rola);
            ctx.save(); ctx.translate(x, y); ctx.scale(kier, 1);
            Figury.rysujPostac(ctx, sim, c, hh, t, cz);
            ctx.restore();
        }

        /// <summary>Pomieszczenia: plan na skale — przekreślone kafle w przerywanym konturze — i robotnik, który go kuje.</summary>
        public static void pomieszczeniaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 3);
            double k = h * 0.13, x0 = w * 0.5, y0 = h * 0.82 - k * 3;
            var skala = new Path2D(); skala.rect(x0, y0 - k * 0.6, k * 4.6, k * 3.6);
            ctx.save();
            ctx.fillStyle = "rgba(46,34,27,0.98)"; ctx.fill(skala);
            kreskuj(ctx, skala, 0.9, 4, rgba(BARWA.atrament, 0.28), 1);
            // pierwsza kolumna już wykuta
            ctx.fillStyle = "rgba(70,52,38,0.95)"; ctx.fillRect(x0, y0, k, k * 3);
            ctx.strokeStyle = "rgba(232,196,130,0.6)"; ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (int i = 1; i < 4; i++) for (int j = 0; j < 3; j++)
                {
                    double sx = x0 + i * k, sy = y0 + j * k, m = k * 0.22;
                    ctx.moveTo(sx + m, sy + m); ctx.lineTo(sx + k - m, sy + k - m); ctx.moveTo(sx + k - m, sy + m); ctx.lineTo(sx + m, sy + k - m);
                }
            ctx.stroke();
            ctx.setLineDash(6, 4); ctx.lineDashOffset = -t * 0.01;
            ctx.strokeStyle = "rgba(232,196,130,0.95)"; ctx.lineWidth = 2;
            ctx.strokeRect(x0, y0, k * 4, k * 3);
            ctx.restore();
            robotnikNaRycinie(ctx, x0 + k * 0.5, h * 0.82, h * 0.42, t, "kopie");
        }

        /// <summary>Warsztat: stół z tyglem i złocącym się krzyżem, robotnik z młotkiem.</summary>
        public static void warsztatRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 4);
            double y = h * 0.82, x1 = w * 0.48, x2 = w * 0.8, yb = y - h * 0.2;
            ctx.save();
            ctx.fillStyle = "rgba(112,74,42,0.98)"; ctx.strokeStyle = "rgba(20,12,8,0.95)"; ctx.lineWidth = 1.4;
            ctx.fillRect(x1 + 6, yb, 6, y - yb); ctx.fillRect(x2 - 12, yb, 6, y - yb);
            ctx.beginPath(); ctx.rect(x1, yb, x2 - x1, h * 0.03); ctx.fill(); ctx.stroke();
            double tx = x2 - h * 0.08, ty = yb - h * 0.09;
            var g = ctx.createRadialGradient(tx, ty, 0, tx, ty, h * 0.25);
            g.addColorStop(0, "rgba(255,214,110,0.55)"); g.addColorStop(1, "rgba(255,190,80,0)");
            ctx.fillStyle = g; ctx.fillRect(tx - h * 0.25, ty - h * 0.25, h * 0.5, h * 0.5);
            ctx.beginPath(); ctx.moveTo(tx - h * 0.055, ty); ctx.lineTo(tx + h * 0.055, ty); ctx.lineTo(tx + h * 0.04, yb); ctx.lineTo(tx - h * 0.04, yb); ctx.closePath();
            ctx.fillStyle = "rgba(58,48,44,0.98)"; ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(255,226,130,0.95)"; ctx.beginPath(); ctx.ellipse(tx, ty, h * 0.05, h * 0.014, 0, 0, PI * 2); ctx.fill();
            double kx = x1 + (x2 - x1) * 0.35, ky = yb - h * 0.1, a = h * 0.09;
            ctx.translate(kx, ky); ctx.beginPath(); Urobki.krzyz(ctx, a);
            ctx.fillStyle = "rgba(60,44,20,0.9)"; ctx.fill();
            ctx.save(); ctx.clip();
            var pp = (t * 0.0003) % 1;
            ctx.fillStyle = "rgba(244,204,104,0.98)"; ctx.fillRect(-a, a - pp * a * 2, a * 2, pp * a * 2);
            ctx.restore();
            ctx.strokeStyle = "rgba(255,236,170,0.9)"; ctx.stroke();
            ctx.restore();
            robotnikNaRycinie(ctx, w * 0.32, y, h * 0.42, t, "buduje");
        }

        /// <summary>Kuźnia: palenisko z ogniem, kowadło z rozżarzonym hełmem, robotnik z młotem.</summary>
        public static void kuzniaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 5);
            var y = h * 0.82;
            ctx.save();
            ctx.strokeStyle = "rgba(20,12,8,0.95)"; ctx.lineWidth = 1.4;
            double hx = w * 0.18, hw = h * 0.11, hh = h * 0.42;
            var g = ctx.createRadialGradient(hx, y - h * 0.08, 0, hx, y - h * 0.08, h * 0.5);
            g.addColorStop(0, Barwa.Rgba(255, 170, 70, 0.5 + 0.1 * JsM.Sin(t * 0.013))); g.addColorStop(1, "rgba(255,120,40,0)");
            ctx.fillStyle = g; ctx.fillRect(hx - h * 0.5, y - h * 0.6, h, h * 0.6);
            ctx.fillStyle = "rgba(70,60,54,0.98)";
            ctx.beginPath(); ctx.moveTo(hx - hw, y); ctx.lineTo(hx - hw, y - hh * 0.6); ctx.quadraticCurveTo(hx, y - hh * 1.3, hx + hw, y - hh * 0.6); ctx.lineTo(hx + hw, y); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(255,150,60,0.9)";
            ctx.beginPath(); ctx.moveTo(hx - hw * 0.6, y); ctx.lineTo(hx - hw * 0.6, y - hh * 0.4); ctx.quadraticCurveTo(hx, y - hh * 0.8, hx + hw * 0.6, y - hh * 0.4); ctx.lineTo(hx + hw * 0.6, y); ctx.closePath(); ctx.fill();
            double ax = w * 0.66, ay = y - h * 0.18;
            ctx.fillStyle = "rgba(112,74,42,0.98)"; ctx.beginPath(); ctx.rect(ax - h * 0.06, y - h * 0.1, h * 0.12, h * 0.1); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(46,46,52,0.99)";
            ctx.beginPath(); ctx.moveTo(ax - h * 0.12, ay); ctx.lineTo(ax + h * 0.18, ay); ctx.quadraticCurveTo(ax + h * 0.14, ay + h * 0.04, ax + h * 0.06, ay + h * 0.05); ctx.lineTo(ax + h * 0.05, y - h * 0.1); ctx.lineTo(ax - h * 0.05, y - h * 0.1); ctx.lineTo(ax - h * 0.06, ay + h * 0.05); ctx.lineTo(ax - h * 0.12, ay + h * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
            Pokoje.rysujCzesc(ctx, "helm", ax, ay - h * 0.04, h * 0.1, "rgba(255,150,70,0.95)", "rgba(60,20,8,0.9)");
            ctx.restore();
            robotnikNaRycinie(ctx, w * 0.47, y, h * 0.42, t, "buduje");
        }

        /// <summary>Rycerz z ryciny „Walka rycerza” — w pełnej zbroi, ruchy jeden po drugim.</summary>
        static Creature? rycerzWalki;
        static readonly string[] POKAZ_RYCERZA = { "ciecieZGory", "pchniecie", "seriaTrzech", "piruet", "ciosZWyskoku", "mlynek", "egzekucja", "uderzenieTarcza", "szarzaZTarcza", "kolano", "kontraNapiersnika", "blokTarcza", "parowanie", "powalony" };
        static readonly Dictionary<string, string> NAZWY_CZESCI = new Dictionary<string, string> { ["helm"] = "hełm", ["napiersnik"] = "napierśnik", ["naramienniki"] = "naramienniki", ["nakolanniki"] = "nakolanniki", ["tarcza"] = "tarcza" };
        static string wymagania(bool? weteran, string[]? zbroja) =>
            string.Join(" + ", new[] { weteran == true ? "weteran" : "" }.Concat((zbroja ?? Array.Empty<string>()).Select(z => NAZWY_CZESCI.TryGetValue(z, out var n) ? n : z)).Where(x => x != ""));

        /// <summary>Walka rycerza: ruch za ruchem (podpis i wymaganie u góry).</summary>
        public static void walkaRycerzaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 9);
            if (rycerzWalki == null)
            {
                rycerzWalki = Stworzenia.makeCreature(Race.GOBLIN, 0, 0, 0, 908);
                rycerzWalki.rola = "rycerz";
                rycerzWalki.zbroja = new List<string> { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };
            }
            var sim = SwiatAtrap; var c = rycerzWalki;
            var tik = Math.Floor(t * 0.12);
            // ruchy po kolei, każdy w swojej długości i z chwilą gardy po nim
            double dl(string id) => RUCHY_RYCERZA[id].dl + 40;
            var suma = POKAZ_RYCERZA.Sum(dl);
            double k = tik % suma; int i = 0;
            while (k >= dl(POKAZ_RYCERZA[i])) { k -= dl(POKAZ_RYCERZA[i]); i++; }
            var idr = POKAZ_RYCERZA[i]; var def = RUCHY_RYCERZA[idr];
            sim.tick = tik;
            c.ruch = k < def.dl ? new RuchTrwa { id = idr, od = tik - k, dl = def.dl, cel = -1, traf = 0, zadane = (def.traf ?? Array.Empty<double[]>()).Select(_ => 30.0).ToList(), kier = 1, sila = 0.3 } : null;
            var y = h * 0.84;
            ctx.save(); ctx.translate(w * 0.42, y); Figury.rysujPostac(ctx, sim, c, h * 0.5, t, "walczy"); ctx.restore();
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 4;
            ctx.fillStyle = "rgba(240,228,204,0.95)"; ctx.font = $"{Js.Js.S(Math.Floor(h * 0.06 + 0.5))}px Georgia, serif"; ctx.textAlign = "center";
            ctx.fillText(def.nazwa, w / 2, h * 0.12);
            var wym = wymagania(def.weteran, def.zbroja);
            if (wym != "") { ctx.fillStyle = "rgba(236,166,110,0.95)"; ctx.font = $"italic {Js.Js.S(Math.Floor(h * 0.045 + 0.5))}px Georgia, serif"; ctx.fillText(wym, w / 2, h * 0.19); }
            ctx.restore();
        }

        static readonly string[] POKAZ_DEMONA = { "zGory", "zamach", "podwojnyZamach", "zgniecenie", "przygniecenie", "tupniecie", "tchnienie", "wybuchAureoli", "biczLancucha", "szarza", "uderzenieWZiemie", "ryk", "blok", "zachwianie" };

        /// <summary>
        /// 6.11 — Kocioł i stalowa brama: dwóch zakapturzonych rzuca zaklęcia nad kotłem, krata bramy podnosi się, póki
        /// zaklinają, i powoli opada, gdy przestaną; z boku progi „przejdzie” i „przeczołga się”.
        /// </summary>
        public static void bramaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 31);
            const double okres = 4000 + 11000 + 2000;
            var f = t % okres;
            var otw = f < 4000 ? f / 4000 : f < 15000 ? Math.Max(0, 1 - (f - 4000) / 11000) : 0;
            var zaklina = f < 4000;
            var y = h * 0.84;
            // kocioł
            double kx = w * 0.3, kr = h * 0.13;
            var zg = ctx.createRadialGradient(kx, y - kr * 0.3, 0, kx, y - kr * 0.3, kr * 2.4);
            zg.addColorStop(0, Barwa.Rgba(110, 220, 196, zaklina ? 0.4 : 0.18)); zg.addColorStop(1, "rgba(40,120,110,0)");
            ctx.fillStyle = zg; ctx.fillRect(kx - kr * 3, y - kr * 4, kr * 6, kr * 5);
            ctx.fillStyle = "rgb(30,31,35)";
            ctx.beginPath(); ctx.moveTo(kx - kr, y - kr * 1.1); ctx.quadraticCurveTo(kx - kr * 1.1, y - kr * 0.1, kx, y - kr * 0.05); ctx.quadraticCurveTo(kx + kr * 1.1, y - kr * 0.1, kx + kr, y - kr * 1.1); ctx.closePath(); ctx.fill();
            ctx.fillStyle = Barwa.Rgba(120, 224, 200, zaklina ? 0.85 : 0.5); ctx.beginPath(); ctx.ellipse(kx, y - kr * 1.1, kr * 0.92, kr * 0.13, 0, 0, PI * 2); ctx.fill();
            ctx.strokeStyle = "rgb(30,31,35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(kx - kr * 1.1, y); ctx.lineTo(kx - kr * 0.7, y - kr * 0.6); ctx.moveTo(kx + kr * 1.1, y); ctx.lineTo(kx + kr * 0.7, y - kr * 0.6); ctx.stroke();
            // dwóch zaklinających: zakapturzone sylwetki z uniesionymi dłońmi
            foreach (var s in new double[] { -1, 1 })
            {
                double px = kx + s * kr * 2.1, ph = h * 0.3;
                ctx.fillStyle = "rgb(208,198,176)";
                ctx.beginPath(); ctx.moveTo(px - ph * 0.16, y); ctx.lineTo(px - ph * 0.1, y - ph * 0.72); ctx.quadraticCurveTo(px, y - ph * 1.02, px + ph * 0.1, y - ph * 0.72); ctx.lineTo(px + ph * 0.16, y); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 1.4; ctx.stroke();
                double hx = px - s * ph * 0.2, hy = y - ph * (zaklina ? 0.78 : 0.55);
                ctx.strokeStyle = "rgb(208,198,176)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - s * ph * 0.05, y - ph * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
                if (zaklina)
                {
                    ctx.strokeStyle = "rgba(150,236,214,0.75)"; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + kx) / 2, hy - kr * 1.2 + JsM.Sin(t * 0.006 + s) * kr * 0.3, kx, y - kr * 1.1); ctx.stroke();
                }
            }
            krataRyciny(ctx, w, h, y, otw, zaklina, (150, 236, 214));
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 4;
            ctx.fillStyle = "rgba(240,228,204,0.95)"; ctx.font = $"{Js.Js.S(Math.Floor(h * 0.055 + 0.5))}px Georgia, serif"; ctx.textAlign = "center";
            ctx.fillText(zaklina ? "zaklinają — krata się unosi" : otw > 0 ? "cisza — krata powoli opada" : "brama zamknięta", w / 2, h * 0.1);
            ctx.restore();
        }

        /// <summary>
        /// Stalowa brama na rycinie (6.11; wydzielona w etapie 8 — tę samą rysuje rycina kotła i dźwigni): ościeże, nadproże
        /// z pięcioma runami (zapalają się kolejno, ile otwarta; `zywa` — w barwie `barwa`), krata uniesiona o `otw` i progi
        /// „przejdzie” / „przeczołga się”.
        /// </summary>
        static void krataRyciny(IPlotno ctx, double w, double h, double y, double otw, bool zywa, (int r, int g, int b) barwa)
        {
            // brama: ościeże, nadproże z runami, krata uniesiona o otwarcie
            double bx = w * 0.72, bw = w * 0.13, bh = h * 0.42, by = y - bh;
            ctx.fillStyle = "rgb(84,74,64)"; ctx.fillRect(bx - bw * 0.35, by - h * 0.14, bw * 1.7, bh + h * 0.14);
            ctx.fillStyle = "rgb(40,33,28)"; ctx.fillRect(bx, by, bw, bh);
            ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
            var gora = by - otw * bh;
            for (int k = 0; k < 6; k++) { var xx = bx + bw * ((k + 0.5) / 6); ctx.fillStyle = "rgb(120,132,146)"; ctx.fillRect(xx - 1.6, gora - bh, 3.2, bh * 2 - 4); ctx.beginPath(); ctx.moveTo(xx - 2.6, gora + bh - 6); ctx.lineTo(xx + 2.6, gora + bh - 6); ctx.lineTo(xx, gora + bh); ctx.closePath(); ctx.fill(); }
            for (int k = 0; k < 4; k++) { ctx.fillStyle = "rgb(70,78,88)"; ctx.fillRect(bx, gora + bh * ((k + 0.5) / 4) - 1.5, bw, 3); }
            ctx.restore();
            for (int n = 0; n < 5; n++)
            {
                var a = Math.Max(0, Math.Min(1, otw * 5 - n));
                ctx.fillStyle = a > 0 ? (zywa ? Barwa.Rgba(barwa.r, barwa.g, barwa.b, 0.4 + 0.6 * a) : Barwa.Rgba(236, 210, 160, 0.3 + 0.5 * a)) : (Styl)"rgba(0,0,0,0.5)";
                ctx.beginPath(); ctx.arc(bx + bw * ((n + 0.5) / 5), by - h * 0.07, 2.6, 0, PI * 2); ctx.fill();
            }
            // progi przejścia: wyprostowany i na czworakach
            ctx.font = $"{Js.Js.S(Math.Floor(h * 0.045 + 0.5))}px Georgia, serif"; ctx.textAlign = "right";
            foreach (var (prog, napis) in new[] { (BRAMA.idzieOd, "przejdzie"), (BRAMA.czolgaOd, "przeczołga się") })
            {
                var yy = y - prog * bh;
                ctx.strokeStyle = "rgba(240,228,204,0.5)"; ctx.setLineDash(3, 3); ctx.beginPath(); ctx.moveTo(bx - bw * 0.35 - 4, yy); ctx.lineTo(bx - bw * 0.35 - 14, yy); ctx.stroke(); ctx.setLineDash();
                ctx.fillStyle = otw >= prog ? "rgba(240,228,204,0.95)" : "rgba(240,228,204,0.4)"; ctx.fillText(napis, bx - bw * 0.35 - 17, yy + 4);
            }
        }

        /// <summary>
        /// Etap 8 (Krąg ze zmianami) — Dźwignia i stalowa brama: dwóch z siłą 4 ciągnie liny od szczytu dużej dźwigni,
        /// ramię idzie w dół, krata podnosi się; puszczona dźwignia wraca, krata powoli opada.
        /// </summary>
        public static void dzwigniaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 31);
            const double okres = 4000 + 11000 + 2000;
            var f = t % okres;
            var otw = f < 4000 ? f / 4000 : f < 15000 ? Math.Max(0, 1 - (f - 4000) / 11000) : 0;
            var ciagna = f < 4000;
            // ramię: 0 — w górze (spoczywa), 1 — ściągnięte; w dół w 0,7 s, puszczone wraca w 0,5 s
            var u = ciagna ? Math.Min(1, f / 700) : Math.Max(0, 1 - (f - 4000) / 500);
            var y = h * 0.84;
            // skrzynia z kamienia i żelaza, w niej oś dźwigni; łańcuch w posadzkę
            double dx0 = w * 0.1, sw = w * 0.1, sh = h * 0.12;
            ctx.fillStyle = "rgb(70,62,54)"; ctx.fillRect(dx0 - sw / 2, y - sh, sw, sh);
            ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 1.4; ctx.strokeRect(dx0 - sw / 2, y - sh, sw, sh);
            ctx.fillStyle = "rgb(96,104,112)"; ctx.fillRect(dx0 - sw / 2, y - sh * 0.62, sw, sh * 0.12);
            double ox = dx0, oy = y - sh;
            var kat = -0.3 + u * 0.95;                      // od pionu: w lewo spoczywa, w prawo — ściągnięta
            double L = h * 0.5, tx = ox + Math.Sin(kat) * L, ty = oy - Math.Cos(kat) * L;
            ctx.strokeStyle = "rgb(92,64,40)"; ctx.lineWidth = Math.Max(5, w * 0.022); ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.strokeStyle = "rgb(110,118,128)"; ctx.lineWidth = 2;
            foreach (var k in new[] { 0.3, 0.62 }) { double bx2 = ox + Math.Sin(kat) * L * k, by2 = oy - Math.Cos(kat) * L * k; ctx.beginPath(); ctx.moveTo(bx2 - Math.Cos(kat) * 5, by2 - Math.Sin(kat) * 5); ctx.lineTo(bx2 + Math.Cos(kat) * 5, by2 + Math.Sin(kat) * 5); ctx.stroke(); }
            ctx.fillStyle = "rgb(60,64,70)"; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, PI * 2); ctx.fill();
            ctx.strokeStyle = "rgb(120,128,138)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, PI * 2); ctx.stroke();
            // dwóch ciągnących: odchyleni w tył, liny od szczytu ramienia do rąk
            var szarp = ciagna ? 0.5 + 0.5 * JsM.Sin(t * 0.012) : 0;
            foreach (var (px, sila) in new[] { (w * 0.23, 4.0), (w * 0.35, 4.0) })
            {
                double ph = h * 0.3, odch = ciagna ? 0.22 + 0.08 * szarp : 0.04;
                double kx = px + Math.Sin(odch) * ph * 0.7, ky = y - Math.Cos(odch) * ph * 0.7;
                ctx.fillStyle = "rgb(208,198,176)";
                ctx.beginPath(); ctx.moveTo(px - ph * 0.15, y); ctx.lineTo(kx - ph * 0.1, ky); ctx.quadraticCurveTo(kx, ky - ph * 0.3, kx + ph * 0.1, ky); ctx.lineTo(px + ph * 0.15, y); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 1.4; ctx.stroke();
                double hx = kx - ph * 0.22, hy = ky + ph * 0.12;
                ctx.strokeStyle = "rgb(208,198,176)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx - ph * 0.02, ky + ph * 0.08); ctx.lineTo(hx, hy); ctx.stroke();
                ctx.strokeStyle = "rgba(150,120,80,0.95)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
                ctx.fillStyle = "rgba(244,214,150,0.95)"; ctx.font = $"{Js.Js.S(Math.Floor(h * 0.045 + 0.5))}px Georgia, serif"; ctx.textAlign = "center";
                ctx.fillText($"siła {Js.Js.S(sila)}", px, y + h * 0.07);
            }
            krataRyciny(ctx, w, h, y, otw, ciagna, (255, 196, 120));
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 4;
            ctx.fillStyle = "rgba(240,228,204,0.95)"; ctx.font = $"{Js.Js.S(Math.Floor(h * 0.055 + 0.5))}px Georgia, serif"; ctx.textAlign = "center";
            ctx.fillText(ciagna ? "ciągną dwaj z siłą 4 — krata się unosi" : otw > 0 ? "puścili — krata powoli opada" : "brama zamknięta", w / 2, h * 0.1);
            ctx.restore();
        }

        /// <summary>6.11 — Modlitwa za innych: modlący się w środku kręgu, wokół trzej z ludu, nici światła i złote drobiny.</summary>
        public static void modlitwaZaInnychRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 37);
            double y = h * 0.84, cx = w / 2, R = w * 0.4;
            var puls = 0.5 + 0.5 * JsM.Sin(t * 0.002);
            ctx.save(); ctx.translate(cx, y); ctx.scale(1, 0.2);
            var g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R);
            g.addColorStop(0, Barwa.Rgba(255, 226, 150, 0.25 + 0.08 * puls)); g.addColorStop(1, "rgba(255,214,130,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, PI * 2); ctx.fill();
            ctx.restore();
            void postacK(double x, double ph, string kolor)
            {
                ctx.fillStyle = kolor; ctx.beginPath(); ctx.moveTo(x - ph * 0.15, y); ctx.lineTo(x - ph * 0.1, y - ph * 0.72); ctx.quadraticCurveTo(x, y - ph * 1.02, x + ph * 0.1, y - ph * 0.72); ctx.lineTo(x + ph * 0.15, y); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = 1.4; ctx.stroke();
            }
            var sg = ctx.createLinearGradient(0, y - h * 0.6, 0, y);
            sg.addColorStop(0, "rgba(255,230,170,0)"); sg.addColorStop(0.5, Barwa.Rgba(255, 230, 170, 0.2 + 0.08 * puls)); sg.addColorStop(1, "rgba(255,230,170,0.04)");
            ctx.fillStyle = sg; ctx.fillRect(cx - w * 0.05, y - h * 0.6, w * 0.1, h * 0.6);
            postacK(cx, h * 0.34, "rgb(214,204,182)");
            foreach (var (dx, kolor) in new[] { (-0.3, "rgb(70,74,84)"), (0.22, "rgb(150,110,70)"), (0.34, "rgb(120,96,70)") })
            {
                var x = cx + w * dx;
                ctx.strokeStyle = "rgba(255,236,180,0.5)"; ctx.lineWidth = 1.3;
                ctx.beginPath(); ctx.moveTo(cx, y - h * 0.3); ctx.quadraticCurveTo((cx + x) / 2, y - h * 0.5, x, y - h * 0.24); ctx.stroke();
                postacK(x, h * 0.28, kolor);
                for (int n = 0; n < 3; n++)
                {
                    var f = (t * 0.0007 + n / 3.0 + dx) % 1;
                    ctx.fillStyle = Barwa.Rgba(255, 230, 160, 0.7 * (1 - f));
                    ctx.beginPath(); ctx.arc(x + JsM.Sin(f * 9 + n) * 6, y - h * 0.1 - f * h * 0.25, 1.8, 0, PI * 2); ctx.fill();
                }
            }
        }

        /// <summary>Walka demona: ruch za ruchem (klatki z arkusza „demon”).</summary>
        public static void walkaDemonaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 24);
            var tik = Math.Floor(t * 0.12);
            double dl(string id) => (RUCHY_BOSSA[id].dl != 0 ? RUCHY_BOSSA[id].dl : 120) + 30;
            var suma = POKAZ_DEMONA.Sum(dl);
            double k = tik % suma; int i = 0;
            while (k >= dl(POKAZ_DEMONA[i])) { k -= dl(POKAZ_DEMONA[i]); i++; }
            var id0 = POKAZ_DEMONA[i]; var def = RUCHY_BOSSA[id0];
            var dlR = def.dl != 0 ? def.dl : 120;
            ctx.save(); ctx.translate(w * 0.5, h * 0.9);
            // Krąg Trzeci: ruchy odgrywa Cerber (szkielet z Rysunek/Krag/Cerber.cs), pyskami w prawo jak demon
            if (Krag.Wlaczony) { ctx.translate(-h * 0.1, 0); RysCerber.podgladWalki(ctx, h * 0.55, id0, Math.Min(k, dlR - 1), dlR, t); }
            else DuszkiDemona.podgladWalki(ctx, h * 0.6, id0, Math.Min(k, dlR - 1), dlR, 1);
            ctx.restore();
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 4;
            ctx.fillStyle = "rgba(240,228,204,0.95)"; ctx.font = $"{Js.Js.S(Math.Floor(h * 0.06 + 0.5))}px Georgia, serif"; ctx.textAlign = "center";
            ctx.fillText(def.nazwa, w / 2, h * 0.1);
            ctx.restore();
        }

        /// <summary>Rycerz z ryciny „Zbroja rycerza” — własna atrapa, bo zbroja na niej się zmienia.</summary>
        static Creature? rycerzZbroi;
        static readonly string[] CZESCI_ZBROI = { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };

        /// <summary>
        /// Zbroja rycerza: wieszak z częściami, a rycerz w samej kolczudze zakłada je po kolei — każda błyska, gdy siądzie,
        /// a z wieszaka znika. Na koniec chwilę stoi w pełnej zbroi i wszystko zaczyna się od nowa.
        /// </summary>
        public static void zbrojaRycina(PlotnoRyciny P)
        {
            var ctx = P.ctx; double w = P.w, h = P.h, t = P.t;
            sklepienie(ctx, w, h, 8);
            var y = h * 0.82;
            const double okres = 1500; var n = Math.Floor(t / okres) % (CZESCI_ZBROI.Length + 3); var f = (t % okres) / okres;
            var ile = (int)Math.Min(CZESCI_ZBROI.Length, n);
            if (rycerzZbroi == null) { rycerzZbroi = Stworzenia.makeCreature(Race.GOBLIN, 0, 0, 0, 907); rycerzZbroi.rola = "rycerz"; }
            var sim = SwiatAtrap; var c = rycerzZbroi;
            c.zbroja = CZESCI_ZBROI.Take(ile).ToList();
            ctx.save();
            ctx.strokeStyle = "rgba(20,12,8,0.95)"; ctx.lineWidth = 1.4;
            // wieszak na ścianie: to, czego rycerz jeszcze nie założył
            double px1 = w * 0.1, px2 = w * 0.44, py = y - h * 0.44;
            ctx.fillStyle = "rgba(112,74,42,0.98)"; ctx.beginPath(); ctx.rect(px1, py, px2 - px1, h * 0.025); ctx.fill(); ctx.stroke();
            for (int i = 0; i < CZESCI_ZBROI.Length; i++)
            {
                if (i < ile) continue;
                Pokoje.rysujCzesc(ctx, CZESCI_ZBROI[i], px1 + (px2 - px1) * (0.16 + (i % 3) * 0.34), py + h * (0.09 + Math.Floor(i / 3.0) * 0.13), h * 0.1, "rgba(176,182,194,0.98)", "rgba(20,12,8,0.95)");
            }
            ctx.restore();
            // rycerz twarzą do wieszaka
            double rx = w * 0.68, wys = h * 0.5;
            ctx.save(); ctx.translate(rx, y); ctx.scale(-1, 1);
            Figury.rysujPostac(ctx, sim, c, wys, t, "stoi");
            ctx.restore();
            // błysk tam, gdzie część właśnie siadła
            if (ile > 0 && n <= CZESCI_ZBROI.Length && f < 0.5)
            {
                var cz = CZESCI_ZBROI[ile - 1];
                var naCiele = new Dictionary<string, double> { ["helm"] = 0.92, ["naramienniki"] = 0.78, ["napiersnik"] = 0.64, ["nakolanniki"] = 0.2, ["tarcza"] = 0.5 };
                double hh = wys, bx = rx - hh * (cz == "tarcza" ? 0.12 : 0.05), by = y - hh * naCiele[cz];
                double a = 1 - f / 0.5, R = h * (0.06 + 0.16 * Math.Min(1, f * 5));
                var g = ctx.createRadialGradient(bx, by, 0, bx, by, R);
                g.addColorStop(0, Barwa.Rgba(255, 246, 214, 0.85 * a)); g.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = g; ctx.fillRect(bx - R, by - R, R * 2, R * 2);
                ctx.save();
                ctx.strokeStyle = Barwa.Rgba(255, 250, 230, 0.9 * a); ctx.lineWidth = 1.5; ctx.lineCap = "round";
                ctx.beginPath();
                for (int i = 0; i < 8; i++)
                {
                    double k = (i / 8.0) * PI * 2 + 0.3, r0 = h * (0.03 + f * 0.08), r1 = r0 + h * (i % 2 != 0 ? 0.03 : 0.06) * a;
                    ctx.moveTo(bx + JsM.Cos(k) * r0, by + JsM.Sin(k) * r0); ctx.lineTo(bx + JsM.Cos(k) * r1, by + JsM.Sin(k) * r1);
                }
                ctx.stroke();
                ctx.font = $"italic {Js.Js.S(Math.Floor(h * 0.06 + 0.5))}px Georgia, serif";
                ctx.textAlign = "center";
                ctx.fillStyle = Barwa.Rgba(232, 196, 130, a);
                ctx.fillText($"{CZESC[cz].nazwa}: {CZESC[cz].skutek}", w * 0.5, h * 0.12);
                ctx.restore();
            }
        }
    }
}
