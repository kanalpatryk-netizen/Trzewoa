// Port: alpha-1/src/render/aniol.ts — DŁOŃ ANIELSKA (Alpha, etap 4; logika: sim/aniol.ts). Z górnego brzegu płyty,
// przez skałę, sączy się słup złotego światła z pyłem; w nim schodzi jasna dłoń palcami w dół, ze złotą poświatą.
// Gest zależy od daru:
//  - podkop: opuszki dotykają skały i suną po drodze wiernych, a każdy kafel pęka pod nimi w złotym błysku;
//  - dar ludzi: w złożonej dłoni siedzi nowy robotnik; dłoń opuszcza go na podłogę, otwiera się, rozbłysk — stoi;
//  - dar krwi: dłoń otwiera się nad ołtarzem, a z niej struga krwi płynie kroplami na ołtarz.
// Potem dłoń wraca w światło, a słup gaśnie. Rysowane po postaciach.
//
// Zmiana wobec TS (decyzja użytkownika 12.11): dłoń to model 3D rysowany na żywo (Model3D/Dlon3D.cs — wersja anielska
// tego samego modelu co dłoń z otchłani), nie klatki z arkusza dlon-anielska.webp.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek.Model3D;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyAniol;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek dłoni anielskiej (RysAniol — bo Aniol to moduł symulacji).</summary>
    public static class RysAniol
    {
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static double los(double n0)
        {
            int n = Js.Js.ToInt32(n0);
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }

        /// <summary>Czubki palców (opuszki) w otwartej dłoni — jednostki modelu (krótkie paznokcie zamiast szponów).</summary>
        static readonly (double x, double y) OPUSZKI = (21.2, -3.0);
        static readonly Barwa POSWIATA = Barwa.Rgba(255, 214, 120, 0.9);

        /// <summary>Dłoń anielska ze złotą poświatą (atlas: rycina „Dłoń anielska”).</summary>
        public static bool rysujKlatkeAnielska(IPlotno ctx, double sx, double sy, double kat, double skala, double zacisk, double lustro, double alfa) =>
            RysDlon.rysujKlatke(ctx, Dlon3D.Anielska, "zacisk", sx, sy, kat, skala, zacisk, lustro, alfa, POSWIATA);

        /// <summary>Robotnik w dłoni (dar ludzi) — atrapa do rysunku, z numerem, który dostanie (ta sama twarz, gdy stanie).</summary>
        static Creature? wDloni;

        /// <summary>Słup światła z góry do (x, y) na płycie, `a` — jasność. Pył opada w nim powoli.</summary>
        static void slup(IPlotno ctx, double x, double y, double szer, double a, double teraz, bool ruch)
        {
            if (a <= 0.01) return;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var g = ctx.createLinearGradient(x - szer, 0, x + szer, 0);
            g.addColorStop(0, "rgba(255,220,140,0)"); g.addColorStop(0.5, Barwa.Rgba(255, 232, 170, 0.32 * a)); g.addColorStop(1, "rgba(255,220,140,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(x - szer * 0.7, 0); ctx.lineTo(x + szer * 0.7, 0); ctx.lineTo(x + szer, y); ctx.lineTo(x - szer, y); ctx.closePath(); ctx.fill();
            // u dołu rozlewa się poświata
            var r = szer * 2.2;
            var g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
            g2.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.45 * a)); g2.addColorStop(1, "rgba(255,220,150,0)");
            ctx.fillStyle = g2; ctx.fillRect(x - r, y - r, r * 2, r * 2);
            for (int i = 0; i < 18; i++)
            {
                double px = x + (los(i * 7) - 0.5) * szer * 1.4, f = ruch ? ((teraz * 0.00005 * (0.6 + los(i))) + los(i * 3)) % 1 : los(i * 3);
                var py = f * y;
                ctx.fillStyle = Barwa.Rgba(255, 244, 210, 0.7 * a * Math.Sin(f * Math.PI));
                ctx.beginPath(); ctx.arc(px + Math.Sin(f * 9 + i) * szer * 0.08, py, Math.Max(0.8, szer * 0.025), 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Złoty błysk (rozbłysk z promieniami) w (x, y), `u` 0..1.</summary>
        static void blysk(IPlotno ctx, double x, double y, double z, double u)
        {
            if (u < 0 || u > 1) return;
            double a = 1 - u, R = z * (0.6 + 2 * gladko(u * 2));
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 248, 220, 0.9 * a)); g.addColorStop(0.4, Barwa.Rgba(255, 214, 120, 0.4 * a)); g.addColorStop(1, "rgba(255,200,100,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.strokeStyle = Barwa.Rgba(255, 246, 214, 0.9 * a); ctx.lineWidth = Math.Max(1, z * 0.06); ctx.lineCap = "round";
            ctx.beginPath();
            for (int i = 0; i < 8; i++)
            {
                double k = (i / 8.0) * Math.PI * 2, r0 = z * (0.3 + u), r1 = r0 + z * (i % 2 != 0 ? 0.4 : 0.8) * a;
                ctx.moveTo(x + Math.Cos(k) * r0, y + Math.Sin(k) * r0); ctx.lineTo(x + Math.Cos(k) * r1, y + Math.Sin(k) * r1);
            }
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Dłoń anielska i jej słup światła (warstwa świata, po postaciach).</summary>
        public static void rysujAniola(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var s = sim.lud.aniol;
            if (!ANIOL.wlaczona || s == null || s.faza == "brak" || s.dar == null) return;
            var z = cam.zoom;
            var ruch = !ustawienia.ograniczRuch;
            var t = sim.tick - s.od;
            var D = ANIOL;
            // gdzie: opuszki na kruszonym kaflu (podkop), dłoń z robotnikiem tuż nad podłogą, otwarta dłoń nad ołtarzem
            var cel = s.dar == "podkop" ? (x: s.x + 0.5, y: s.y + 0.3) : s.dar == "ludzie" ? (x: s.x + 0.5, y: s.y + 0.55) : (x: s.x + 0.5, y: s.y);
            // jasność słupa: rozpala się, trwa, gaśnie razem z powrotem dłoni
            var jasnosc = s.faza == "swiatlo" ? gladko(t / D.swiatlo) : s.faza == "wraca" ? 1 - gladko(t / D.wraca) : 1;
            slup(ctx, cam.toScreenX(cel.x), cam.toScreenY(cel.y + 0.6), D.swiatloSzer * z, jasnosc, teraz, ruch);
            // skała nad celem pęka: świecąca szczelina, którą schodzi dłoń, i sypiący się z niej pył i okruchy
            // (dawniej dłoń przechodziła przez litą skałę jak przez mgłę)
            szczelina(ctx, sim, cam, cel.x, cel.y, jasnosc, teraz, ruch);
            if (s.faza == "swiatlo") return;
            // palce w dół, lekko przechylone; lustro — z której strony kciuk
            double lustro = s.od % 2 != 0 ? 1 : -1;
            var pochyl = lustro * 0.14;
            double dx = Math.Sin(pochyl), dy = Math.Cos(pochyl);
            var k = RysDlon.KAFLE_NA_JEDN * D.wielkosc;
            (double x, double y) doSwiata((double x, double y) w0, double mx, double my) =>
                (w0.x + (mx * dx + my * lustro * dy) * k, w0.y + (mx * dy - my * lustro * dx) * k);
            // zacisk i punkt dłoni, który trafia w cel: opuszki (podkop), złożona dłoń (ludzie), wnętrze otwartej dłoni (krew)
            var zacisk = 0.04;
            if (s.dar == "ludzie") zacisk = s.faza == "dar" ? 0.42 - 0.38 * gladko((t - D.dar * 0.5) / (D.dar * 0.2)) : s.faza == "wraca" ? 0.04 : 0.42;
            if (s.dar == "podkop" && s.faza == "dar") zacisk = 0.04 + 0.06 * Math.Abs(Math.Sin(t * 0.08));
            var punkt = s.dar == "podkop" ? OPUSZKI : RysDlon.chwyt(zacisk);
            var p0 = doSwiata((0, 0), punkt.x, punkt.y);
            var nadgarstek = (x: cel.x - p0.x, y: cel.y - p0.y);
            const double wysoko = 16;
            (double x, double y) w; double alfa = 1;
            if (s.faza == "schodzi")
            {
                var u = gladko(t / D.schodzi);
                w = (nadgarstek.x - dx * wysoko * (1 - u), nadgarstek.y - dy * wysoko * (1 - u));
                alfa = gladko(t / 60);
            }
            else if (s.faza == "dar")
            {
                // podkop: drga przy każdym kaflu; ludzie: opuszcza robotnika o pół kafla; krew: lekko się kołysze
                var drg = s.dar == "podkop" && ruch ? Math.Sin(t * 0.5) * 0.06 : 0;
                var nizej = s.dar == "ludzie" ? 0.35 * gladko(t / (D.dar * 0.5)) : 0;
                var kolys = s.dar == "krew" && ruch ? Math.Sin(t * 0.03) * 0.08 : 0;
                w = (nadgarstek.x + drg + kolys, nadgarstek.y + nizej + Math.Abs(drg));
            }
            else
            {
                var u = gladko(t / D.wraca);
                w = (nadgarstek.x - dx * wysoko * u, nadgarstek.y - dy * wysoko * u);
                alfa = 1 - gladko((u - 0.55) / 0.45);
            }
            var kat = Math.Atan2(dy, dx);
            var skala = z * k;
            double sx = cam.toScreenX(w.x), sy = cam.toScreenY(w.y);
            // poświata wokół dłoni (przenika skałę — świeci przez nią)
            var srodek = doSwiata(w, 14, -3);
            double gx = cam.toScreenX(srodek.x), gy = cam.toScreenY(srodek.y);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var R = skala * 22;
            var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
            g.addColorStop(0, Barwa.Rgba(255, 226, 150, 0.35 * alfa)); g.addColorStop(1, "rgba(255,210,130,0)");
            ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
            ctx.restore();
            RysDlon.rysujKlatke(ctx, Dlon3D.Anielska, "zacisk", sx, sy, kat, skala, zacisk, lustro, alfa, POSWIATA);
            // robotnik w dłoni — trzymają go złożone palce (przed dłonią, żeby go było widać), aż dłoń go postawi
            if (s.dar == "ludzie" && s.nowy == null && s.faza != "wraca")
            {
                var klan = Symulacja.Lud.klanLudu(sim);
                if (klan != null && (wDloni == null || wDloni.id != sim.nextId))
                {
                    wDloni = Stworzenia.makeCreature(Race.GOBLIN, (int)klan.id, 0, 0, sim.nextId);
                    wDloni.rola = "robotnik";
                }
                if (wDloni != null)
                {
                    var ch = RysDlon.chwyt(zacisk);
                    var dl = doSwiata(w, ch.x, ch.y);
                    ctx.save();
                    ctx.globalAlpha *= alfa;
                    ctx.translate(cam.toScreenX(dl.x), cam.toScreenY(dl.y + 0.45));
                    ctx.scale(lustro, 1);
                    Figury.rysujPostac(ctx, sim, wDloni, Math.Max(16, z * 1.9 * ustawienia.wielkoscSylwetek), teraz, "stoi");
                    ctx.restore();
                }
            }
            // gest i jego skutek
            if (s.faza == "dar")
            {
                if (s.dar == "podkop")
                {
                    // pod opuszkami pęka kafel: złote światło i iskry przy każdym wykruszonym
                    var krok = (D.dar * 0.75) / Math.Max(1, s.kafle?.Count ?? 1);
                    var u = ((t - D.dar * 0.2) % krok) / krok;
                    if (t > D.dar * 0.2) blysk(ctx, cam.toScreenX(s.x + 0.5), cam.toScreenY(s.y + 0.5), z * 0.7, u);
                }
                else if (s.dar == "ludzie" && s.nowy != null)
                {
                    var c = sim.creatureById(s.nowy.Value);
                    if (c != null) blysk(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 0.2), z, (t - D.dar * 0.55) / (D.dar * 0.4));
                }
                else if (s.dar == "krew")
                {
                    // krew kapie z wnętrza dłoni strugą kropel na ołtarz — w obrębie płyty (dawniej prosta czerwona linia przez
                    // skałę i ramę płyty do relikwiarza, jak laser)
                    var ch = RysDlon.chwyt(zacisk);
                    var dl = doSwiata(w, ch.x, ch.y);
                    double ax = cam.toScreenX(dl.x), ay = cam.toScreenY(dl.y), dol = cam.toScreenY(s.y + 1.7);
                    var plynie = 1 - gladko((t - D.dar * 0.8) / (D.dar * 0.15));
                    if (plynie > 0.01 && dol > ay)
                    {
                        ctx.save();
                        ctx.strokeStyle = Barwa.Rgba(120, 10, 8, 0.55 * plynie); ctx.lineWidth = Math.Max(1, z * 0.05); ctx.lineCap = "round";
                        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + (dol - ay) * 0.35); ctx.stroke();
                        for (int i = 0; i < 7; i++)
                        {
                            var f = ruch ? (teraz * 0.0016 + i / 7.0) % 1 : i / 7.0;
                            ctx.fillStyle = Barwa.Rgba(160, 16, 12, 0.95 * plynie);
                            ctx.save(); ctx.translate(ax + Math.Sin(i * 2.1) * z * 0.04, ay + (dol - ay) * f * f); ctx.beginPath(); Figury.kropla(ctx, Math.Max(1.6, z * 0.09)); ctx.fill(); ctx.restore();
                        }
                        ctx.restore();
                    }
                }
            }
        }

        /// <summary>
        /// Szczelina w skale nad celem dłoni anielskiej (`a` — jak bardzo otwarta): w każdym litym kaflu kolumny poszarpana,
        /// ciemna rysa ze złotym światłem w środku, a wzdłuż niej opada pył i drobne okruchy.
        /// </summary>
        static void szczelina(IPlotno ctx, Sim sim, Camera cam, double x, double yCel, double a, double teraz, bool ruch)
        {
            if (a <= 0.01) return;
            var w = sim.world; var z = cam.zoom;
            double gora = Math.Max(0, Math.Floor(cam.y - cam.vh / 2 / z) - 1), dol = Math.Floor(yCel);
            var kol = Math.Floor(x);
            var pkt = new List<(double x, double y)>();
            for (var y = gora; y <= dol; y++)
            {
                if (!w.inb(kol, y) || !w.solid(kol, y)) { pkt.Add((double.NaN, double.NaN)); continue; }
                foreach (var f in new[] { 0.15, 0.6 })
                {
                    var n = Math.Sin((y + f) * 12.9898 + kol * 4.1) * 43758.5453;
                    pkt.Add((cam.toScreenX(x + ((n - Math.Floor(n)) - 0.5) * 0.5), cam.toScreenY(y + f)));
                }
            }
            var szer = Math.Max(1.5, z * 0.35 * a);
            ctx.save();
            ctx.lineCap = "round"; ctx.lineJoin = "round";
            foreach (var (kol2, lw) in new[] { ("rgba(10,6,4,0.9)", szer * 1.8), ("rgba(255,214,140,0.85)", szer * 0.7), ("rgba(255,246,220,0.9)", szer * 0.25) })
            {
                ctx.strokeStyle = kol2; ctx.lineWidth = lw;
                ctx.beginPath();
                var pen = false;
                foreach (var (px, py) in pkt)
                {
                    if (double.IsNaN(px)) { pen = false; continue; }
                    if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
                }
                ctx.stroke();
            }
            // pył i okruchy sypią się ze szczeliny
            for (int i = 0; i < 12; i++)
            {
                var f = ruch ? (teraz * 0.0006 * (0.7 + (i % 3) * 0.2) + i / 12.0) % 1 : i / 12.0;
                var py = cam.toScreenY(gora + (dol - gora) * f);
                var px = cam.toScreenX(x) + Math.Sin(i * 3.7) * z * 0.6;
                ctx.fillStyle = i % 3 != 0 ? Barwa.Rgba(150, 132, 110, 0.7 * a) : Barwa.Rgba(255, 236, 190, 0.6 * a);
                ctx.fillRect(px, py, Math.Max(1, z * 0.07), Math.Max(1, z * 0.07));
            }
            ctx.restore();
        }
    }
}
