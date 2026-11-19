// Port: krag-3-beta/src/render/pomnik.ts — różnice trybu Kręgu Trzeciego (Krag.Wlaczony). Na dnie trzewi zamiast
// posągu demona stoi zapieczętowane zejście do kręgu czwartego: kamienne koło na cokole, w nim wyryty trójgłowy pies,
// runy, na krzyż dwa łańcuchy. Modlitwa kruszy pieczęć (rysy świecą czerwono od spodu); rozpad otwiera zejście (czarna
// studnia, łuna i ogień z dołu). Z góry zeskakuje Cerber, ląduje i wyje na trzy gardła; boss na mapie to Cerber
// (Rysunek/Krag/Cerber.cs), a po ostatniej ściętej głowie wali się w kałużę krwi — żadnego świętego światła.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPomnik;

namespace Trzewia.Rysunek
{
    public static partial class RysPomnik
    {
        static readonly PozaCerbera pozaPieczeci = new PozaCerbera(), pozaWstaje = new PozaCerbera(), pozaKona = new PozaCerbera();

        /// <summary>Posąg w trybie kręgu: cokół, pieczęć zejścia, odłamki po świeżym pęknięciu, gruz od stanu 2.</summary>
        static void rysujPosagKregu(IPlotno ctx, double bx, double by, double H, double z, double stan, double teraz, double swieze, bool ruch)
        {
            var drga = ruch && swieze > 0 ? Math.Sin(teraz * 0.09) * H * 0.006 * swieze : 0;
            var top = cokol(ctx, bx, by, H, false, z);
            pieczec(ctx, bx + drga, top, H, z, stan, ruch ? teraz : 0, swieze, 1);
            if (swieze > 0) odlamki(ctx, bx, top, H, 1 - swieze, stan, z);
            if (stan >= 2) gruz(ctx, bx + H * 0.24, top, H * 0.35, 1, teraz, z);
        }

        /// <summary>Rozpad pieczęci (`k` 0…1): drży, rysy płoną, łańcuchy się naprężają — potem pęka i otwiera zejście.</summary>
        static void rozpadKregu(IPlotno ctx, double bx, double by, double H, double z, double k, double teraz, bool ruch)
        {
            const double PEK = 0.45;
            var top = cokol(ctx, bx, by, H, k >= PEK, z);
            var drga = ruch ? Math.Sin(teraz * 0.11) * H * 0.012 * gladko(k / PEK) : 0;
            if (k < PEK)
            {
                pieczec(ctx, bx + drga, top, H, z, 3, teraz, gladko(k / PEK), 1 + gladko(k / PEK));
                return;
            }
            var kk = (k - PEK) / (1 - PEK);
            otworZejscia(ctx, bx, top, H, teraz, gladko(kk * 2));
            gruz(ctx, bx, by, H, gladko(kk * 1.6), teraz, z);
            var L = warstwaPieczeci(ctx, H, z, teraz);
            rozbite(ctx, bx, top - H * 0.42, H * 0.5, kk, 300, 1, () => { ctx.drawImage(L.c, 0, 0, L.cw, L.ch, bx - L.ox, top - L.oy, L.W, L.Hh); });
            lancuch(ctx, (bx - H * 0.2, top - H * 0.6), (bx - H * 0.29, top + H * 0.02), z, gladko(kk * 2));
            lancuch(ctx, (bx + H * 0.2, top - H * 0.6), (bx + H * 0.29, top + H * 0.02), z, gladko(kk * 2));
        }

        /// <summary>Po rozpadzie: rozbity cokół, otwarte zejście, kopiec gruzu; w fazie „wychodzi” z góry zeskakuje Cerber.</summary>
        static void poRozpadzieKregu(IPlotno ctx, Sim sim, Camera cam, double bx, double by, double H, double z, string faza, double teraz)
        {
            var top = cokol(ctx, bx, by, H, true, z);
            otworZejscia(ctx, bx, top, H, teraz, 1);
            gruz(ctx, bx, by, H, 1, teraz, z);
            if (faza == "wychodzi")
            {
                var s = sim.lud.pomnik!;
                rysujWstajacegoCerbera(ctx, bx, by, Duszki.DuszkiDemona.wysokoscDemona(cam.zoom), Math.Min(1, (sim.tick - s.od) / POMNIK.wyjscie), teraz);
            }
        }

        /// <summary>
        /// Pieczęć zejścia: kamienne koło stojące na cokole, w nim wyryty trójgłowy pies, dookoła runy, na krzyż dwa łańcuchy.
        /// Rysy (`stan` 0…3) świecą czerwono — spod spodu bije łuna kręgu czwartego. `napiecie` > 1 — łańcuchy pękają.
        /// </summary>
        static void pieczec(IPlotno ctx, double bx, double top, double H, double z, double stan, double teraz, double swieze, double napiecie)
        {
            double R = H * 0.4, cx = bx, cy = top - R - H * 0.02;
            var t = teraz / 1000;
            ctx.save();
            ctx.lineJoin = "round";
            // koło
            var g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
            g.addColorStop(0, "rgb(128,126,116)"); g.addColorStop(1, "rgb(58,56,50)");
            ctx.fillStyle = g; ctx.strokeStyle = "rgba(14,10,8,0.95)"; ctx.lineWidth = Math.Max(1.5, H * 0.012);
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgb(74,72,64)";
            ctx.beginPath(); ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // runy w pierścieniu
            ctx.strokeStyle = "rgba(20,14,10,0.7)"; ctx.lineWidth = Math.Max(1, H * 0.006);
            for (int i = 0; i < 24; i++)
            {
                double a = (i / 24.0) * Math.PI * 2, r1 = R * 0.83, r2 = R * 0.95;
                ctx.beginPath();
                ctx.moveTo(cx + Math.Cos(a) * r1, cy + Math.Sin(a) * r1);
                ctx.lineTo(cx + Math.Cos(a + 0.08 * (los(i) - 0.5)) * r2, cy + Math.Sin(a + 0.1) * r2);
                if (los(i * 3) < 0.5) ctx.lineTo(cx + Math.Cos(a + 0.12) * (r1 + r2) / 2, cy + Math.Sin(a + 0.12) * (r1 + r2) / 2);
                ctx.stroke();
            }
            // płaskorzeźba: trójgłowy pies (oczy żarzą się z kolejnymi rysami)
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0, Math.PI * 2); ctx.clip();
            ctx.globalAlpha = 0.85;
            ctx.translate(cx - R * 0.12, cy + R * 0.5);
            var p = pozaPieczeci.Zeruj();
            p.czas = teraz; p.kamien = 1; p.lezy = 0;
            for (int i = 0; i < 3; i++) { var gl = p.glowy[i]; gl.oczy = stan > i ? 0.4 + 0.4 * (0.5 + 0.5 * Math.Sin(t * 4 + i)) : 0; gl.paszcza = 0.3; gl.pochyl = -0.2; }
            RysCerber.rysujCerbera(ctx, R * 1.15, p);
            ctx.restore();
            // rysy — świecą czerwono od spodu
            if (stan > 0 || swieze > 0)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                var n = (int)(stan * 4 + 2);
                for (int i = 0; i < n; i++)
                {
                    var a = los(i * 13 + 5) * Math.PI * 2;
                    double x = cx + Math.Cos(a) * R * 0.1, y = cy + Math.Sin(a) * R * 0.1;
                    ctx.strokeStyle = Barwa.Rgba(255, 80 + 40 * Math.Sin(t * 3 + i), 40, 0.35 + 0.15 * stan + 0.3 * swieze);
                    ctx.lineWidth = Math.Max(1, H * (0.006 + 0.003 * stan));
                    ctx.beginPath(); ctx.moveTo(x, y);
                    for (int j = 0; j < 5; j++)
                    {
                        var d = R * (0.18 + 0.17 * j);
                        x = cx + Math.Cos(a + (los(i * 7 + j) - 0.5) * 0.5) * d; y = cy + Math.Sin(a + (los(i * 11 + j) - 0.5) * 0.5) * d;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                if (stan >= 3)
                {
                    var lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
                    lg.addColorStop(0, Barwa.Rgba(255, 80, 30, 0.18 + 0.08 * Math.Sin(t * 5))); lg.addColorStop(1, "rgba(255,40,10,0)");
                    ctx.fillStyle = lg; ctx.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
                }
                ctx.restore();
            }
            // łańcuchy na krzyż, uwiązane do cokołu
            var dr = napiecie > 1 ? Math.Sin(t * 40) * H * 0.004 * (napiecie - 1) : 0;
            lancuch(ctx, (cx - R * 0.95, cy - R * 0.55 + dr), (bx + H * 0.29, top + H * 0.02), z);
            lancuch(ctx, (cx + R * 0.95, cy - R * 0.55 - dr), (bx - H * 0.29, top + H * 0.02), z);
            ctx.restore();
        }

        sealed class WarstwaPieczeci { public IPlotno c = null!; public int cw, ch; public double W, Hh, ox, oy; }
        static IPlotno? warstwaP;
        static readonly WarstwaPieczeci wP = new WarstwaPieczeci();

        /// <summary>Pieczęć na osobnej warstwie — rozpad kroi ją na bryły.</summary>
        static WarstwaPieczeci warstwaPieczeci(IPlotno ctx, double H, double z, double teraz)
        {
            var m = ctx.getTransform(); var dpr = Math.Max(1, Math.Sqrt(m.a * m.a + m.b * m.b));
            double W = Math.Ceiling(H * 1.2), Hh = Math.Ceiling(H * 1.0), ox = W / 2, oy = H * 0.95;
            warstwaP ??= Plotno.Nowe(1, 1);
            int cw = (int)Math.Ceiling(W * dpr), ch = (int)Math.Ceiling(Hh * dpr);
            if (warstwaP.width < cw || warstwaP.height < ch) { warstwaP.width = cw; warstwaP.height = ch; }
            var g = warstwaP;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, warstwaP.width, warstwaP.height);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            pieczec(g, ox, oy, H, z, 3, teraz, 1, 1);
            g.setTransform(1, 0, 0, 1, 0, 0);
            wP.c = warstwaP; wP.cw = cw; wP.ch = ch; wP.W = W; wP.Hh = Hh; wP.ox = ox; wP.oy = oy;
            return wP;
        }

        /// <summary>Otwarte zejście do kręgu czwartego w miejscu pieczęci: czarna studnia, z dołu czerwona łuna i iskry.</summary>
        static void otworZejscia(IPlotno ctx, double bx, double top, double H, double teraz, double k)
        {
            if (k <= 0) return;
            var t = teraz / 1000;
            double R = H * 0.36, cy = top - R;
            ctx.save();
            ctx.globalAlpha = k;
            ctx.fillStyle = "rgb(6,4,4)";
            ctx.beginPath(); ctx.ellipse(bx, cy, R, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
            // dym kłębi się z zejścia
            for (int i = 0; i < 8; i++)
            {
                var f = (t * 0.12 + los(i * 5)) % 1;
                double px = bx + (los(i * 7) - 0.5) * R * 1.2 + Math.Sin(t * 0.7 + i) * R * 0.2, py = cy - f * R * 3.2;
                ctx.fillStyle = Barwa.Rgba(22, 10, 8, 0.35 * Math.Sin(f * Math.PI));
                ctx.beginPath(); ctx.arc(px, py, R * (0.3 + f * 0.6), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalCompositeOperation = "lighter";
            // łuna niższych kręgów: ze środka zejścia na całą okolicę
            var Ro = R * 4.5;
            var go = ctx.createRadialGradient(bx, cy + R * 0.4, 0, bx, cy + R * 0.4, Ro);
            go.addColorStop(0, Barwa.Rgba(230, 70, 20, 0.32 + 0.06 * Math.Sin(t * 2.3))); go.addColorStop(0.35, "rgba(150,30,10,0.14)"); go.addColorStop(1, "rgba(90,15,5,0)");
            ctx.fillStyle = go; ctx.fillRect(bx - Ro, cy - Ro, Ro * 2, Ro * 2);
            var g = ctx.createRadialGradient(bx, cy + R * 0.6, 0, bx, cy + R * 0.6, R * 1.3);
            g.addColorStop(0, Barwa.Rgba(255, 110, 40, 0.65 + 0.1 * Math.Sin(t * 3))); g.addColorStop(1, "rgba(160,30,10,0)");
            ctx.fillStyle = g; ctx.fillRect(bx - R * 1.4, cy - R * 1.2, R * 2.8, R * 2.6);
            // jęzory ognia liżą brzeg zejścia od dołu
            ctx.save();
            ctx.beginPath(); ctx.ellipse(bx, cy, R * 1.02, R * 1.07, 0, 0, Math.PI * 2); ctx.clip();
            for (int i = 0; i < 9; i++)
            {
                var fx = bx + (i / 8.0 - 0.5) * R * 1.6;
                var fala = Math.Sin(t * (5 + los(i) * 3) + i * 1.7) * 0.5 + Math.Sin(t * 11 + i) * 0.2;
                var wys = R * (0.7 + 0.5 * los(i * 3) + 0.35 * fala);
                var sz = R * (0.16 + 0.08 * los(i * 5));
                var y0 = cy + R * 1.05;
                var pg = ctx.createLinearGradient(0, y0, 0, y0 - wys);
                pg.addColorStop(0, "rgba(255,220,140,0.85)"); pg.addColorStop(0.35, "rgba(255,120,30,0.6)"); pg.addColorStop(0.75, "rgba(200,40,10,0.3)"); pg.addColorStop(1, "rgba(120,20,5,0)");
                ctx.fillStyle = pg;
                ctx.beginPath(); ctx.moveTo(fx - sz, y0);
                ctx.bezierCurveTo(fx - sz * 0.9, y0 - wys * 0.45, fx + sz * fala, y0 - wys * 0.7, fx + sz * 0.4 * fala, y0 - wys);
                ctx.bezierCurveTo(fx + sz * 0.6, y0 - wys * 0.6, fx + sz * 0.9, y0 - wys * 0.35, fx + sz, y0);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();
            for (int i = 0; i < 34; i++)
            {
                var f = (t * (0.35 + los(i * 9) * 0.3) + los(i)) % 1;
                ctx.fillStyle = Barwa.Rgba(255, (int)(170 - f * 90), 60, 0.85 * (1 - f));
                var r = 1.5 + los(i * 11) * 2;
                ctx.fillRect(bx + (los(i * 3) - 0.5) * R * 1.6 + Math.Sin(t * 2 + i) * R * 0.15, cy + R * 0.8 - f * R * 3.4, r, r);
            }
            ctx.restore();
        }

        /// <summary>
        /// Cerber zeskakuje z góry (`k` 0…1): stopy w (bx, by), `h` — wysokość Cerbera. Pieczęć pękła — skacze za potępionymi,
        /// ląduje, przysiada i wyje na trzy gardła. Także w atlasie.
        /// </summary>
        public static void rysujWstajacegoCerbera(IPlotno ctx, double bx, double by, double h, double k, double teraz)
        {
            const double SKOK = 0.4;
            var p = pozaWstaje.Zeruj();
            p.czas = teraz;
            double dy = 0;
            if (k < SKOK)
            {
                var f = k / SKOK;
                // oprawa (etap 4): skromny skok znad już otwartego zejścia — nie spadanie z nieoznaczonej wysokości nad
                // korytarzem (stary błąd: przebijał sufit i podłogę, choć pieczęć pęka tu, w piecu, nie gdzieś wyżej)
                var skokWys = Visual.VisualConfig.Aktywne(Visual.VisualConfig.Przerywniki) ? Visual.VisualConfig.Przerywnikowe.WejscieSkokWysokosc : 5;
                dy = -h * skokWys * (1 - f * f);
                p.deba = 0.25; p.krok = 0;
                foreach (var g in p.glowy) { g.pochyl = 0.4; g.paszcza = 0.6; }
            }
            else
            {
                p.przysiad = Math.Max(0, 1 - (k - SKOK) / 0.2);
                if (k > 0.62 && k < 0.94)
                {
                    var w = Math.Sin(((k - 0.62) / 0.32) * Math.PI);
                    for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = -0.85 * w + 0.05 * i; g.paszcza = w; }
                    p.deba = 0.25 * w;
                }
            }
            ctx.save();
            ctx.translate(bx - h * 0.15, by + dy);
            RysCerber.rysujCerbera(ctx, h, p);
            ctx.restore();
            // lądowanie: fala pyłu i odłamki
            if (k >= SKOK && k < SKOK + 0.2)
            {
                var f = (k - SKOK) / 0.2;
                ctx.save();
                ctx.strokeStyle = Barwa.Rgba(170, 150, 130, 0.6 * (1 - f)); ctx.lineWidth = Math.Max(2, h * 0.02);
                ctx.beginPath(); ctx.ellipse(bx, by, h * (0.4 + f * 1.4), h * (0.06 + f * 0.15), 0, 0, Math.PI * 2); ctx.stroke();
                for (int i = 0; i < 12; i++)
                {
                    var a = Math.PI + los(i + 50) * Math.PI;
                    double x = bx + Math.Cos(a) * h * 1.2 * f, y = by + Math.Sin(a) * h * 0.8 * f + f * f * h * 0.6;
                    ctx.fillStyle = Barwa.Rgba(110, 98, 86, 1 - f);
                    ctx.fillRect(x - 2, Math.Min(by, y) - 2, 4, 4);
                }
                ctx.restore();
            }
            // wycie: czerwony błysk
            if (k > 0.62 && k < 0.94)
            {
                var a = Math.Sin(((k - 0.62) / 0.32) * Math.PI);
                var r = h * 1.3;
                var g = ctx.createRadialGradient(bx + h * 0.4, by - h * 0.8, 0, bx + h * 0.4, by - h * 0.8, r);
                g.addColorStop(0, Barwa.Rgba(255, 110, 60, 0.3 * a)); g.addColorStop(1, "rgba(255,60,30,0)");
                ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(bx - r, by - h * 0.8 - r, r * 2.6, r * 2); ctx.restore();
            }
        }

        /// <summary>Cerber na mapie (boss) stopami w (0, 0), zwrot już ustawiony; po ostatnim uderzeniu kona.</summary>
        public static void rysujCerberaBossa(IPlotno ctx, Sim sim, Creature c, double h, double czas)
        {
            var s = sim.lud.pomnik;
            // oprawa (etap 2): boss oddaje punkty głów i obrys ciała (Visual.Czytelnosc) — tylko ten Cerber, nie podglądy
            Visual.Czytelnosc.ZbierajBossa = Visual.Czytelnosc.Aktywna;
            // oprawa (etap 3): błysk trafienia (biały), zapowiedź ataku (odchylenie, wyrzut z rozciągnięciem), oddech w spoczynku
            var uderzenie = Visual.Uderzenie.Aktywne;
            RysCerber.BlyskBialy = uderzenie ? Visual.Uderzenie.BlyskBossa(czas) : 0;
            if (s != null && s.faza == "kona") rysujKonajacegoCerbera(ctx, h, Math.Min(1, (sim.tick - s.od) / POMNIK.konanie), czas, c.glowyOdciete);
            else
            {
                var p = RysCerber.pozaBossa(sim, c, czas);
                double sx = 1, sy = 1;
                if (uderzenie) Visual.Uderzenie.ZapowiedzIOddech(sim, c, czas, ref p.odrzut, out sx, out sy);
                if (sx != 1 || sy != 1) { ctx.save(); ctx.scale(sx, sy); }
                RysCerber.rysujCerbera(ctx, h, p);
                if (sx != 1 || sy != 1) ctx.restore();
            }
            RysCerber.BlyskBialy = 0;
            Visual.Czytelnosc.ZbierajBossa = false;
        }

        /// <summary>
        /// Cerber kona po ostatnim uderzeniu (`k` 0…1), stopami w (0, 0). Z krwi i mięsa — nie pęka od światła: wyje, wali się
        /// na przednie łapy, pada w kałużę krwi, łby opadają, ślepia gasną, z paszcz i kikutów leje się krew.
        /// </summary>
        public static void rysujKonajacegoCerbera(IPlotno ctx, double h, double k, double czas, System.Collections.Generic.List<GlowaOdcieta>? odciete)
        {
            var p = pozaKona.Zeruj();
            p.czas = czas; p.krew = 1;
            if (odciete != null) foreach (var o in odciete) p.DodajOdcieta((int)o.nr, 6000 + k * 20000);
            var wyje = k < 0.2 ? Math.Sin((k / 0.2) * Math.PI) : 0;
            p.odrzut = k < 0.12 ? Math.Sin((k / 0.12) * Math.PI) * 0.7 : 0;
            p.kleka = gladko((k - 0.1) / 0.12) * (1 - gladko((k - 0.3) / 0.1));
            p.lezy = gladko((k - 0.28) / 0.15);
            for (int i = 0; i < 3; i++)
            {
                var g = p.glowy[i];
                g.oczy = 1 - gladko((k - 0.35 - i * 0.06) / 0.25);
                g.pochyl = -0.7 * wyje + 0.85 * gladko((k - 0.25) / 0.3) + 0.08 * Math.Sin(i * 2.1);
                g.paszcza = k < 0.2 ? 0.6 + 0.4 * wyje : 0.45 - 0.1 * i;
            }
            // kałuża krwi rośnie spod piersi i paszcz
            var kal = gladko((k - 0.22) / 0.78);
            if (kal > 0)
            {
                ctx.save();
                ctx.fillStyle = "rgba(64,3,2,0.92)";
                ctx.beginPath(); ctx.ellipse(h * 0.08, 0, h * (0.15 + 0.8 * kal), h * (0.025 + 0.06 * kal), 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(150,26,20,0.22)";
                ctx.beginPath(); ctx.ellipse(h * 0.02, -h * 0.004, h * 0.5 * kal, h * 0.012 * kal, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            // drgawki gasną
            var drga = Nastroj.wolnoRuszac() ? Math.Sin(czas * 0.09) * h * 0.006 * (1 - gladko((k - 0.3) / 0.5)) : 0;
            ctx.save(); ctx.translate(drga, 0);
            var pk = RysCerber.rysujCerbera(ctx, h, p);
            // krew leje się z paszcz strugami do kałuży
            if (k > 0.15)
            {
                ctx.strokeStyle = "rgba(96,5,3,0.8)"; ctx.lineCap = "round";
                for (int i = 0; i < 3; i++)
                {
                    if (p.Odcieta(i) >= 0) continue;
                    var (x, y) = pk.Paszcza(i);
                    ctx.lineWidth = Math.Max(1, h * 0.008);
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + h * 0.02, (y + 0) / 2, x + h * 0.01, 0); ctx.stroke();
                    ctx.fillStyle = "rgba(110,6,4,0.9)";
                    for (int j = 0; j < 3; j++) { var f = ((czas / 500) + j * 0.33 + i * 0.2) % 1; ctx.beginPath(); ctx.ellipse(x + h * 0.01, y + (0 - y) * f, h * 0.005, h * 0.01, 0, 0, Math.PI * 2); ctx.fill(); }
                }
            }
            ctx.restore();
        }

        /// <summary>Nad pomnikiem przy konaniu Cerbera: czerwona mgła krwi po ostatnim ciosie (zamiast błysku i fali światła).</summary>
        static void nadKonaniemKregu(IPlotno ctx, Sim sim, Camera cam, StanPomnika s)
        {
            var k = (sim.tick - s.od) / POMNIK.konanie;
            var h = Duszki.DuszkiDemona.wysokoscDemona(cam.zoom);
            double dx = cam.toScreenX(s.cios!.x), dy = cam.toScreenY(s.cios.y + 1) - h * 0.55;
            if (k < 0.25)
            {
                double a = 1 - k / 0.25, r = h * (0.5 + k * 2);
                var g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
                g.addColorStop(0, Barwa.Rgba(110, 4, 2, 0.35 * a)); g.addColorStop(0.6, Barwa.Rgba(90, 2, 1, 0.15 * a)); g.addColorStop(1, "rgba(80,0,0,0)");
                ctx.fillStyle = g; ctx.fillRect(dx - r, dy - r, r * 2, r * 2);
            }
        }
    }
}
