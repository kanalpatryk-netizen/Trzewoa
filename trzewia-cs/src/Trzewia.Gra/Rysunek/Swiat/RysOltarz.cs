// Port: alpha-1/src/render/oltarz.ts — OŁTARZ (Alpha, etap 3d): ołtarz na środku sali i animacje rytuałów. Kamienny
// kopczyk, mensa z misą i dwiema świecami, drewniany krzyż; modlitwa — promienie od krzyża i złote iskry od klęczącego;
// szał krwi — krew spływa po krzyżu do misy, czerwona aura rycerza i smuga z misy do niego; wskrzeszenie — ciało blednie
// w iskry, nad mensą unosi się ta sama postać i odzyskuje barwę; ofiara krwi — krople z ręki do misy; ofiara życia —
// dusza ulatuje; przerwany rytuał — szary dym. Animacja zegarem ekranu, postęp rytuału — tikami gry.
// Wskrzeszany rysuje się duszkiem (klatka „stoi”) zamiast rysunku ludu z TS (render/postacie.ts: rysujLud).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyLud;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek ołtarza (RysOltarz — bo Oltarz to klasa symulacji).</summary>
    public sealed class RysOltarz
    {
        static double los(double n)
        {
            unchecked
            {
                int h = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                h = (h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35;
                return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
            }
        }
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static double Rnd(double v) => Math.Floor(v + 0.5);

        const string TUSZ = "rgba(20,12,8,0.95)";
        /// <summary>Barwa kręgu znaków dla rytuału (r, g, b).</summary>
        static readonly Dictionary<string, double[]> KRAG = new Dictionary<string, double[]>
        {
            ["modlitwa"] = new double[] { 255, 226, 150 }, ["szal"] = new double[] { 255, 64, 44 }, ["wskrzeszenie"] = new double[] { 255, 244, 210 },
            ["ofiaraKrwi"] = new double[] { 236, 70, 52 }, ["ofiaraZycia"] = new double[] { 190, 24, 20 },
        };
        /// <summary>Rytuały z kręgiem znaków: tylko wskrzeszenie (rytuały krwi mają własne motywy).</summary>
        static readonly string[] Z_KREGIEM = { "wskrzeszenie" };

        /// <summary>Układ ołtarza na ekranie (piksele kamery) — wspólny dla kamienia, świateł i trafienia kursorem.</summary>
        sealed class Uklad
        {
            public double z, cx, yp;
            public (double rx, double h) kopiec;
            public (double x1, double x2, double y1, double y2) blok;
            public (double x1, double x2, double y, double h) plyta;
            public (double x, double gora, double dol, double belka, double ramie, double szer) krzyz;
            public double[] swiece = null!;
            public double swiecaH;
            public (double x, double y, double rx, double h) misa;
            public (double x, double y, double rx, double ry) krag;
        }
        static Uklad uklad(Sim sim, Camera cam)
        {
            var o = sim.world.oltarz;
            return ukladZ(cam.toScreenX(o.x + 0.5), cam.toScreenY(o.y + 1), cam.zoom);
        }

        /// <summary>Układ ołtarza stojącego środkiem w `cx` na podłodze `yp`, w skali `z` pikseli na kafel.</summary>
        static Uklad ukladZ(double cx, double yp, double z)
        {
            var kopiec = z * 0.55;
            double blokDol = yp - kopiec + z * 0.08, blokGora = yp - kopiec - z * 0.8;
            return new Uklad
            {
                z = z, cx = cx, yp = yp,
                kopiec = (z * 1.9, kopiec),
                blok = (cx - z * 0.9, cx + z * 0.9, blokGora, blokDol),
                plyta = (cx - z * 1.1, cx + z * 1.1, blokGora - z * 0.18, z * 0.18),
                krzyz = (cx, blokGora - z * 2.75, blokGora - z * 0.18, blokGora - z * 2.1, z * 0.72, z * 0.24),
                swiece = new[] { cx - z * 0.88, cx + z * 0.88 },
                swiecaH = z * 0.42,
                misa = (cx + z * 0.38, blokGora - z * 0.18, z * 0.3, z * 0.16),
                krag = (cx, blokGora - z * 0.55, z * 3.0, z * 1.05),
            };
        }

        /// <summary>Czy punkt ekranu (piksele kamery) trafia w ołtarz — kopczyk, mensa albo krzyż.</summary>
        public static bool oltarzPod(Sim sim, Camera cam, double sx, double sy)
        {
            if (sim.world.salaOltarza.x1 < 0) return false;
            var u = uklad(sim, cam);
            var tol = Math.Max(6, u.z * 0.3);
            return sx >= u.cx - u.kopiec.rx - tol && sx <= u.cx + u.kopiec.rx + tol && sy >= u.krzyz.gora - tol && sy <= u.yp + tol;
        }

        sealed class Postep { public string rodzaj = ""; public double p, kto; public double? cel; }
        /// <summary>Trwający rytuał: rodzaj i postęp 0..1 (tikami gry).</summary>
        static Postep? postep(Sim sim)
        {
            var r = Oltarz.rytualOltarza(sim);
            if (r == null) return null;
            return new Postep { rodzaj = r.rodzaj, p = Math.Max(0, Math.Min(1, (sim.tick - r.od) / Math.Max(1, r.@do - r.od))), kto = r.kto, cel = r.cel };
        }

        sealed class Anim { public ZdarzenieOltarza z = null!; public double od; }
        readonly ConditionalWeakTable<ZdarzenieOltarza, object> widziane = new ConditionalWeakTable<ZdarzenieOltarza, object>();
        List<Anim> animacje = new List<Anim>();
        /// <summary>Krew w misie (0..1) — rośnie przy szale i ofierze krwi, potem powoli wsiąka.</summary>
        double misa = 0, misaT = 0;
        /// <summary>Świeże zdarzenie (dźwięk na ekranie gry).</summary>
        public Action<ZdarzenieOltarza>? onZdarzenie;
        static readonly object JEST = new object();

        /// <summary>Bierze świeże zdarzenia z symulacji: krew zapłacona spływa z licznika do misy, krew z ofiary leci do licznika.</summary>
        public void zbierz(Sim sim, double teraz, Urobki urobki)
        {
            var o = sim.world.oltarz;
            foreach (var z in sim.zdarzeniaOltarza)
            {
                if (widziane.TryGetValue(z, out _)) continue;
                widziane.Add(z, JEST);
                animacje.Add(new Anim { z = z, od = teraz });
                onZdarzenie?.Invoke(z);
                if (z.faza == "start")
                {
                    var r = Oltarz.rytualOltarza(sim);
                    if (r != null && r.krew > 0) urobki.oddaj("krew", r.krew, o.x, o.y - 1, teraz);
                }
                else if (z.faza == "koniec" && (z.rodzaj == "ofiaraKrwi" || z.rodzaj == "ofiaraZycia"))
                {
                    urobki.dodaj("krew", z.rodzaj == "ofiaraKrwi" ? LUD.okaleczenieKrew : LUD.ofiaraKrew, o.x, o.y - 1, teraz);
                }
            }
            if (animacje.Count > 0) animacje = animacje.Where(a => teraz - a.od < 2600).ToList();
            // krew w misie: napełnia się z postępem rytuału krwi, potem wsiąka przez kilka sekund
            var pr = postep(sim);
            var dt = Math.Min(0.1, Math.Max(0, (teraz - misaT) / 1000));
            misaT = teraz;
            if (pr != null && (pr.rodzaj == "szal" || pr.rodzaj == "ofiaraKrwi")) misa = Math.Max(misa, gladko(pr.p * 1.4));
            else misa = Math.Max(0, misa - dt * 0.12);
        }

        /// <summary>Kamień i drewno — przed mrokiem (świece i smuga dnia świecą przez mrok).</summary>
        public void rysuj(IPlotno ctx, Sim sim, Camera cam)
        {
            if (sim.world.salaOltarza.x1 < 0) return;           // góra bez sali z ołtarzem (poza Alphą)
            var u = uklad(sim, cam);
            var z = u.z;
            if (u.cx < -z * 6 || u.cx > cam.vw + z * 6 || u.yp < -z * 2 || u.krzyz.gora > cam.vh + z * 2) return;
            rysujKamien(ctx, u);
        }

        /// <summary>
        /// Nad mrokiem: smuga światła dziennego z pyłem, płomienie świec, krew w misie, rytuał w toku i jego koniec.
        /// `podKursorem` — podpis nad ołtarzem (co się stanie po dotknięciu).
        /// </summary>
        public void rysujNad(IPlotno ctx, Sim sim, Camera cam, double teraz, string? podKursorem)
        {
            if (sim.world.salaOltarza.x1 < 0) return;
            var u = uklad(sim, cam);
            var z = u.z;
            var ruch = Nastroj.wolnoRuszac();
            var widac = !(u.cx < -z * 8 || u.cx > cam.vw + z * 8 || u.yp < -z * 3 || u.krzyz.gora > cam.vh + z * 6);
            var pr = postep(sim);
            ctx.save();
            // światło na ołtarz pada z rozety katedry (Promien.cs); bez katedry — smuga dnia z wylotu szybu
            var w = sim.world;
            double gx = cam.toScreenX(w.szybX + 0.5), gora = cam.toScreenY(World.SURFACE_Y);
            if (Katedra.ukladKatedry(w) == null && Math.Max(gx, u.cx) + z * 3 > 0 && Math.Min(gx, u.cx) - z * 3 < cam.vw && u.yp > 0 && gora < cam.vh)
                smugaDnia(ctx, gx, gora, cam.toScreenY(w.szybDol), u, teraz, ruch);
            if (widac)
            {
                // płomienie świec — przy rytuale wyższe i jaśniejsze
                plomienie(ctx, u, teraz, pr != null ? 1.25 : 1, ruch);
                krewWMisie(ctx, u, misa);
            }
            // rytuał w toku
            if (pr != null)
            {
                var c = sim.creatureById(pr.kto);
                var a = gladko(pr.p * 5);
                if (widac)
                {
                    if (pr.rodzaj == "modlitwa") promienie(ctx, u, teraz, a, ruch, c, cam);
                    if (Z_KREGIEM.Contains(pr.rodzaj)) kragZnakow(ctx, u, teraz, pr.rodzaj, Math.Min(1, pr.p * 1.25), a, ruch);
                    if (pr.rodzaj == "szal") krewPoKrzyzu(ctx, u, teraz, pr.p, ruch);
                    if (pr.rodzaj == "ofiaraKrwi" && c != null) kroplezReki(ctx, u, cam, c, teraz, ruch);
                    if (pr.rodzaj == "ofiaraZycia" && c != null) dusza(ctx, cam, c.x, c.y, u.z, teraz, pr.p, 0, ruch);
                }
                // szał: rycerz, którego rytuał rozpala, płonie czerwoną aurą (gdziekolwiek stoi)
                if (pr.rodzaj == "szal")
                {
                    var ryc = sim.creatureById(pr.cel ?? -1);
                    if (ryc != null && !ryc.dead) aura(ctx, cam, ryc, u.z, teraz, gladko(pr.p * 1.6), ruch);
                }
                if (pr.rodzaj == "wskrzeszenie") wskrzeszanie(ctx, sim, cam, u, teraz, pr.p, pr.cel, ruch);
            }
            rysujZdarzenia(ctx, sim, cam, u, teraz);
            if (podKursorem != null && podKursorem != "" && widac)
            {
                var puls = 0.5 + 0.5 * JsM.Sin(teraz * 0.005);
                ctx.strokeStyle = Barwa.Rgba(232, 196, 130, 0.35 + 0.35 * puls);
                ctx.lineWidth = 1.5;
                ctx.setLineDash(4, 4);
                ctx.beginPath(); ctx.ellipse(u.cx, (u.krzyz.gora + u.yp) / 2, u.kopiec.rx + z * 0.4, (u.yp - u.krzyz.gora) / 2 + z * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash();
                podpis(ctx, podKursorem, u.cx, u.krzyz.gora - z * 0.5, z, "rgba(240,214,160,0.98)");
            }
            ctx.restore();
        }

        static IPlotno? plotnoWsk;

        /// <summary>Wskrzeszenie: ciało blednie w iskry, które płyną do ołtarza; nad mensą unosi się postać i odzyskuje barwę.</summary>
        void wskrzeszanie(IPlotno ctx, Sim sim, Camera cam, Uklad u, double teraz, double p, double? cel, bool ruch)
        {
            var z = u.z;
            var t = (sim.lud.trupy ?? new List<Trup>()).FirstOrDefault(q => q.id == cel);
            if (t == null) return;
            // iskry z ciała do ołtarza
            double tx = cam.toScreenX(t.x), ty = cam.toScreenY(t.y + 1) - z * 0.4;
            double ax = u.cx, ay = u.plyta.y - z * 0.5;
            var strumien = JsM.Sin(Math.Min(1, p / 0.7) * Math.PI);
            if (strumien > 0.01)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                var R = z * 1.6;
                var g = ctx.createRadialGradient(tx, ty, 0, tx, ty, R);
                g.addColorStop(0, Barwa.Rgba(255, 244, 210, 0.4 * strumien)); g.addColorStop(1, "rgba(255,240,200,0)");
                ctx.fillStyle = g; ctx.fillRect(tx - R, ty - R, R * 2, R * 2);
                double ddx = ax - tx, ddy = ay - ty, d = Math.Sqrt(ddx * ddx + ddy * ddy);
                for (int i = 0; i < 16; i++)
                {
                    var f = ruch ? (teraz * 0.00045 + i / 16.0) % 1 : i / 16.0;
                    var x = tx + (ax - tx) * f + JsM.Sin(f * 9 + i) * z * 0.25;
                    var y = ty + (ay - ty) * f - JsM.Sin(f * Math.PI) * Math.Min(z * 3, d * 0.25);
                    ctx.fillStyle = Barwa.Rgba(255, 246, 220, 0.9 * strumien * JsM.Sin(f * Math.PI));
                    ctx.beginPath(); ctx.arc(x, y, Math.Max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
            // nad mensą: ta sama postać — leży, unosi się, staje do pionu i odzyskuje barwę
            var pojaw = gladko((p - 0.35) / 0.3);
            if (pojaw <= 0) return;
            var barwa = gladko((p - 0.55) / 0.4);
            var pion = gladko((p - 0.5) / 0.42);
            var h = Math.Max(16, z * 1.9 * (t.rola == "rycerz" ? 1.3 : 1));
            var unies = z * 0.9 * gladko((p - 0.35) / 0.5);
            // biodra: nad płytą ołtarza — leżąc tuż nad nią, stojąc tak, że stopy unoszą się nad mensą
            double sx = u.cx, sy = u.plyta.y - z * 0.3 - unies - h * 0.5 * pion;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            {
                var R = z * 2.4;
                var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
                g.addColorStop(0, Barwa.Rgba(255, 244, 210, 0.5 * pojaw)); g.addColorStop(1, "rgba(255,240,200,0)");
                ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
            }
            ctx.restore();
            var W = (int)Math.Ceiling(h * 2.4);
            if (plotnoWsk == null) plotnoWsk = Plotno.Nowe(W, W);
            if (plotnoWsk.width < W || plotnoWsk.height < W) { var nw = Math.Max(plotnoWsk.width, W); var nh = Math.Max(plotnoWsk.height, W); plotnoWsk.width = nw; plotnoWsk.height = nh; }
            var g2 = plotnoWsk;
            g2.setTransform(1, 0, 0, 1, 0, 0);
            g2.clearRect(0, 0, W, W);
            // obrót wokół bioder: z leżenia (głową od światła) do pionu
            g2.setTransform(1, 0, 0, 1, W / 2.0, W / 2.0);
            g2.rotate((1 - pion) * (Math.PI / 2) * -t.face);
            g2.translate(0, h * 0.5);
            g2.scale(t.face, 1);
            // duszek poległego w klatce „stoi” (w TS: rysujLud z atrapą zmarłego)
            var d2 = Duszki.Duszek.Daj(Duszki.DuszkiLudu.nazwaDuszka(t.rola, t.id, t.helm == true, 0));
            if (d2?.Animacja("stoi") is { } stoi) d2.Rysuj(g2, stoi.Klatka(0), h, false);
            // jeszcze blady jak duch — barwa wraca z postępem
            g2.setTransform(1, 0, 0, 1, 0, 0);
            g2.globalCompositeOperation = "source-atop";
            g2.fillStyle = Barwa.Rgba(232, 236, 240, 0.88 * (1 - barwa));
            g2.fillRect(0, 0, W, W);
            g2.globalCompositeOperation = "source-over";
            ctx.save();
            ctx.globalAlpha = pojaw * (0.6 + 0.4 * barwa);
            ctx.drawImage(plotnoWsk, 0, 0, W, W, sx - W / 2.0, sy - W / 2.0, W, W);
            ctx.restore();
        }

        /// <summary>Koniec rytuału (błysk, smuga do rycerza, iskry) i przerwany rytuał (szary dym).</summary>
        void rysujZdarzenia(IPlotno ctx, Sim sim, Camera cam, Uklad u, double teraz)
        {
            var z = u.z;
            foreach (var an in animacje)
            {
                var e = an.z;
                var t = (teraz - an.od) / 1000;
                if (e.faza == "start") continue;
                ctx.save();
                if (e.faza == "przerwany")
                {
                    if (t > 1.6) { ctx.restore(); continue; }
                    var p = t / 1.6;
                    for (int i = 0; i < 14; i++)
                    {
                        var kat = (i / 14.0) * Math.PI * 2;
                        double x = u.krag.x + JsM.Cos(kat) * u.krag.rx * (0.7 + p * 0.3), y = u.krag.y + JsM.Sin(kat) * u.krag.ry - p * z * 1.2;
                        ctx.fillStyle = Barwa.Rgba(150, 140, 130, 0.35 * (1 - p));
                        ctx.beginPath(); ctx.arc(x, y, z * (0.3 + p * 0.5), 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                    continue;
                }
                // koniec: znaki i promienie gasną, a skutek rytuału błyska
                var kr = KRAG[e.rodzaj]; double r = kr[0], g = kr[1], b = kr[2];
                var zgas = Math.Max(0, 1 - t / 1.2);
                if (zgas > 0 && Z_KREGIEM.Contains(e.rodzaj)) kragZnakow(ctx, u, teraz, e.rodzaj, 1, zgas, Nastroj.wolnoRuszac());
                if (zgas > 0 && e.rodzaj == "modlitwa") promienie(ctx, u, teraz, zgas, Nastroj.wolnoRuszac(), null, cam);
                if (t < 1.2)
                {
                    // rozbłysk nad mensą
                    var k = JsM.Sin(Math.Min(1, t / 1.2) * Math.PI);
                    var R = z * (1.5 + 3 * Math.Min(1, t * 1.5));
                    ctx.globalCompositeOperation = "lighter";
                    var gr = ctx.createRadialGradient(u.cx, u.plyta.y - z * 0.6, 0, u.cx, u.plyta.y - z * 0.6, R);
                    gr.addColorStop(0, Barwa.Rgba(r, g, b, 0.55 * k)); gr.addColorStop(1, Barwa.Rgba(r, g, b, 0));
                    ctx.fillStyle = gr; ctx.fillRect(u.cx - R, u.plyta.y - z * 0.6 - R, R * 2, R * 2);
                    ctx.globalCompositeOperation = "source-over";
                }
                if (e.rodzaj == "szal")
                {
                    // czerwona smuga z misy do rycerza, potem aura wokół niego
                    var ryc = sim.creatureById(e.cel ?? -1);
                    if (ryc != null && !ryc.dead && t < 1.8)
                    {
                        var hh = Figury.wysokoscPostaci(ryc, z);
                        double rx = cam.toScreenX(ryc.x), ry = cam.toScreenY(ryc.y + 1) - hh * 0.5;
                        double mx = u.misa.x, my = u.misa.y - u.misa.h;
                        double ddx = rx - mx, ddy = ry - my;
                        double kx = (mx + rx) / 2, ky = Math.Min(my, ry) - Math.Max(z * 2, Math.Sqrt(ddx * ddx + ddy * ddy) * 0.3);
                        var s = gladko(t / 0.7);
                        ctx.lineCap = "round";
                        var GR = new[] { 0.5, 0.2, 0.06 };
                        for (int j = 0; j < 3; j++)
                        {
                            ctx.strokeStyle = j == 0 ? "rgba(255,70,40,0.25)" : j == 1 ? "rgba(255,60,40,0.6)" : "rgba(255,200,170,0.9)";
                            ctx.lineWidth = Math.Max(1, z * GR[j]) * (1 - Math.Max(0, (t - 0.7) / 1.1));
                            ctx.beginPath();
                            for (int q = 0; q <= 24; q++)
                            {
                                var f = Math.Max(0, s - 0.45) + (s - Math.Max(0, s - 0.45)) * (q / 24.0);
                                var x = (1 - f) * (1 - f) * mx + 2 * (1 - f) * f * kx + f * f * rx;
                                var y = (1 - f) * (1 - f) * my + 2 * (1 - f) * f * ky + f * f * ry;
                                if (q == 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                            }
                            ctx.stroke();
                        }
                        // aura rozbłyska, gdy smuga dobiegnie
                        if (t > 0.6) aura(ctx, cam, ryc, z, teraz, 1 + 0.8 * Math.Max(0, 1 - (t - 0.6) / 0.6), Nastroj.wolnoRuszac());
                    }
                }
                else if (e.rodzaj == "ofiaraZycia" && e.cx != null && e.cy != null && t < 2.4)
                {
                    // dusza ulatuje w górę i gaśnie
                    dusza(ctx, cam, e.cx.Value, e.cy.Value, z, teraz, 1, t / 2.4, Nastroj.wolnoRuszac());
                }
                else if (e.rodzaj == "wskrzeszenie" && e.cx != null && e.cy != null && t < 2)
                {
                    // błysk przy wstającym i iskry, które wznoszą się nad nim
                    double x = cam.toScreenX(e.cx.Value), y = cam.toScreenY(e.cy.Value + 1) - z * 1;
                    var k = Math.Max(0, 1 - t / 2);
                    ctx.globalCompositeOperation = "lighter";
                    var R = z * (2 + t * 2);
                    var gr = ctx.createRadialGradient(x, y, 0, x, y, R);
                    gr.addColorStop(0, Barwa.Rgba(255, 248, 224, 0.6 * k)); gr.addColorStop(1, "rgba(255,240,200,0)");
                    ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, R * 2, R * 2);
                    for (int i = 0; i < 12; i++)
                    {
                        double px = x + (los(i * 17) - 0.5) * z * 1.6, py = y + z * 0.8 - t * z * (1.2 + los(i) * 1.6);
                        ctx.fillStyle = Barwa.Rgba(255, 246, 214, 0.9 * k);
                        ctx.beginPath(); ctx.arc(px, py, Math.Max(1, z * 0.06), 0, Math.PI * 2); ctx.fill();
                    }
                }
                ctx.restore();
            }
        }

        /// <summary>Kopczyk, mensa z misą i świecami, drewniany krzyż — bez płomieni (te świecą nad mrokiem).</summary>
        static void rysujKamien(IPlotno ctx, Uklad u)
        {
            var z = u.z;
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.strokeStyle = TUSZ;
            // kopczyk: usypany z kamieni, łagodny łuk na podłodze sali
            var (rx, h) = u.kopiec;
            var kg = ctx.createLinearGradient(0, u.yp - h, 0, u.yp);
            kg.addColorStop(0, "rgba(118,104,90,0.99)"); kg.addColorStop(1, "rgba(62,52,44,0.99)");
            ctx.fillStyle = kg;
            ctx.beginPath();
            ctx.moveTo(u.cx - rx, u.yp);
            ctx.bezierCurveTo(u.cx - rx * 0.7, u.yp - h * 0.9, u.cx - rx * 0.35, u.yp - h * 1.05, u.cx, u.yp - h * 1.05);
            ctx.bezierCurveTo(u.cx + rx * 0.35, u.yp - h * 1.05, u.cx + rx * 0.7, u.yp - h * 0.9, u.cx + rx, u.yp);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // kamienie w kopczyku: kanciaste, różnej wielkości, w dwóch warstwach — dolne większe, górne mniejsze
            foreach (var (warstwa, ile, wys, wielk) in new[] { (0, 7, 0.28, 0.24), (1, 5, 0.66, 0.17) })
            {
                for (int i = 0; i < ile; i++)
                {
                    var id = warstwa * 31 + i;
                    var fx = ((i + 0.5) / ile * 2 - 1) * (warstwa != 0 ? 0.62 : 0.9);
                    var kx = u.cx + fx * rx * 0.9 + (los(id * 7) - 0.5) * z * 0.12;
                    var ky = u.yp - h * wys * (1 - fx * fx * 0.6) - z * 0.04;
                    var kr = z * wielk * (0.75 + 0.5 * los(id * 9));
                    var n = 5 + (int)Math.Floor(los(id * 13) * 2); var a0 = los(id * 3) * Math.PI;
                    ctx.beginPath();
                    for (int j = 0; j < n; j++)
                    {
                        double a = a0 + ((double)j / n) * Math.PI * 2, rr = kr * (0.75 + 0.35 * los(id * 17 + j));
                        ctx.lineTo(kx + JsM.Cos(a) * rr * 1.25, ky + JsM.Sin(a) * rr * 0.8);
                    }
                    ctx.closePath();
                    var t = 0.75 + 0.3 * los(id) - warstwa * 0.05;
                    ctx.fillStyle = Barwa.Rgba(Rnd(118 * t), Rnd(106 * t), Rnd(92 * t), 0.99);
                    ctx.fill(); ctx.stroke();
                }
            }
            // mensa: kamienny blok, na nim gruba płyta; na czole wyryty krzyżyk
            var b = u.blok; var pl = u.plyta;
            var bg = ctx.createLinearGradient(b.x1, 0, b.x2, 0);
            bg.addColorStop(0, "rgba(112,100,88,0.99)"); bg.addColorStop(0.5, "rgba(150,136,116,0.99)"); bg.addColorStop(1, "rgba(96,84,74,0.99)");
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.rect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(168,154,132,0.99)";
            ctx.beginPath(); ctx.rect(pl.x1, pl.y, pl.x2 - pl.x1, pl.h); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(52,40,30,0.8)";
            ctx.lineWidth = Math.Max(1, z * 0.07);
            var ry = (b.y1 + b.y2) / 2;
            ctx.beginPath();
            ctx.moveTo(u.cx, ry - z * 0.26); ctx.lineTo(u.cx, ry + z * 0.26);
            ctx.moveTo(u.cx - z * 0.16, ry - z * 0.08); ctx.lineTo(u.cx + z * 0.16, ry - z * 0.08);
            ctx.stroke();
            // spękania kamienia
            ctx.strokeStyle = "rgba(40,30,22,0.55)"; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.x1 + z * 0.15, b.y1 + z * 0.1); ctx.lineTo(b.x1 + z * 0.3, b.y1 + z * 0.4); ctx.lineTo(b.x1 + z * 0.22, b.y2 - z * 0.1);
            ctx.moveTo(b.x2 - z * 0.2, b.y1 + z * 0.15); ctx.lineTo(b.x2 - z * 0.34, b.y1 + z * 0.5);
            ctx.stroke();
            // krzyż z ciemnego drewna, wbity za mensą; od strony światła jaśniejsza krawędź
            var k = u.krzyz;
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.06);
            ctx.fillStyle = "rgba(84,56,34,0.99)";
            ctx.beginPath();
            ctx.rect(k.x - k.szer / 2, k.gora, k.szer, k.dol - k.gora);
            ctx.rect(k.x - k.ramie, k.belka - k.szer / 2, k.ramie * 2, k.szer);
            ctx.fill();
            ctx.beginPath(); ctx.rect(k.x - k.szer / 2, k.gora, k.szer, k.dol - k.gora); ctx.stroke();
            ctx.beginPath(); ctx.rect(k.x - k.ramie, k.belka - k.szer / 2, k.ramie * 2, k.szer); ctx.stroke();
            ctx.fillStyle = "rgba(84,56,34,0.99)";
            ctx.fillRect(k.x - k.szer / 2 + 1, k.belka - k.szer / 2 + 1, k.szer - 2, k.szer - 2);
            ctx.strokeStyle = "rgba(214,170,110,0.55)"; ctx.lineWidth = Math.Max(1, z * 0.04);
            ctx.beginPath();
            ctx.moveTo(k.x + k.szer / 2 - 1, k.gora + 1); ctx.lineTo(k.x + k.szer / 2 - 1, k.belka - k.szer / 2);
            ctx.moveTo(k.x - k.ramie + 1, k.belka - k.szer / 2 + 1); ctx.lineTo(k.x + k.ramie - 1, k.belka - k.szer / 2 + 1);
            ctx.stroke();
            // misa z kamienia na płycie
            var m = u.misa;
            ctx.strokeStyle = TUSZ; ctx.lineWidth = Math.Max(1, z * 0.05);
            ctx.fillStyle = "rgba(96,86,76,0.99)";
            ctx.beginPath(); ctx.moveTo(m.x - m.rx, m.y - m.h); ctx.quadraticCurveTo(m.x, m.y + m.h * 0.6, m.x + m.rx, m.y - m.h); ctx.closePath(); ctx.fill(); ctx.stroke();
            // świece (płomień — nad mrokiem)
            foreach (var sx in u.swiece)
            {
                ctx.fillStyle = "rgba(232,222,196,0.99)";
                ctx.beginPath(); ctx.rect(sx - z * 0.06, pl.y - u.swiecaH, z * 0.12, u.swiecaH); ctx.fill(); ctx.stroke();
                ctx.fillStyle = "rgba(200,180,140,0.9)";
                ctx.beginPath(); ctx.ellipse(sx, pl.y - u.swiecaH + z * 0.02, z * 0.07, z * 0.03, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Płomienie świec na mensie i ich poświata (`moc` &gt; 1 — przy rytuale wyższe i jaśniejsze).</summary>
        static void plomienie(IPlotno ctx, Uklad u, double teraz, double moc, bool ruch)
        {
            var z = u.z;
            for (int i = 0; i < u.swiece.Length; i++)
            {
                var sx = u.swiece[i];
                var mg = ruch ? 0.85 + 0.3 * Fresk.migotLampy(teraz + i * 1777) : 1;
                var fy = u.plyta.y - u.swiecaH - z * 0.14;
                // płomyk z ciepłą, wąską poświatą
                var R = z * 0.9 * moc * mg;
                var g = ctx.createRadialGradient(sx, fy, 0, sx, fy, R);
                g.addColorStop(0, Barwa.Rgba(255, 200, 120, 0.32 * mg)); g.addColorStop(1, "rgba(255,180,100,0)");
                ctx.fillStyle = g; ctx.fillRect(sx - R, fy - R, R * 2, R * 2);
                ctx.fillStyle = Barwa.Rgba(255, 232, 160, 0.95 * mg);
                ctx.beginPath(); ctx.ellipse(sx + (ruch ? JsM.Sin(teraz * 0.009 + i) * z * 0.015 : 0), fy, z * 0.055 * moc, z * 0.13 * moc * mg, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = Barwa.Rgba(255, 240, 200, 0.85 * mg);
                ctx.beginPath(); ctx.ellipse(sx, fy + z * 0.04, z * 0.022, z * 0.045, 0, 0, Math.PI * 2); ctx.fill();
            }
        }

        /// <summary>Krew w misie (`ile` 0..1).</summary>
        static void krewWMisie(IPlotno ctx, Uklad u, double ile)
        {
            if (ile <= 0.01) return;
            var z = u.z; var m = u.misa;
            var lvl = m.h * (0.25 + 0.75 * ile);
            ctx.fillStyle = "rgba(150,16,12,0.95)";
            ctx.beginPath(); ctx.ellipse(m.x, m.y - m.h + (m.h - lvl) * 0.2, m.rx * (0.55 + 0.4 * ile), Math.Max(1, z * 0.05), 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = Barwa.Rgba(255, 120, 90, 0.5 * ile);
            ctx.beginPath(); ctx.ellipse(m.x - m.rx * 0.2, m.y - m.h, m.rx * 0.18, Math.Max(0.6, z * 0.02), 0, 0, Math.PI * 2); ctx.fill();
        }

        /// <summary>
        /// Smuga światła dziennego na ołtarz, w niej wirujący pył: wpada z nieba wylotem szybu (`gora`), idzie szybem,
        /// a od jego dna (`gy`, strop sali) rozchodzi się na ołtarz.
        /// </summary>
        static void smugaDnia(IPlotno ctx, double gx, double gora, double gy, Uklad u, double teraz, bool ruch)
        {
            var z = u.z;
            var dy = u.yp - gy;
            if (dy < z * 2) return;
            var cala = u.yp - gora;
            var s = (gy - gora) / cala;             // ta część smugi biegnie szybem
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            // w szybie pełny dzień, w sali gaśnie ku posadzce
            var g = ctx.createLinearGradient(0, gora, 0, u.yp);
            g.addColorStop(0, "rgba(244,232,200,0.2)");
            g.addColorStop(s, "rgba(240,226,190,0.16)");
            g.addColorStop(s + (1 - s) * 0.7, "rgba(236,214,170,0.09)");
            g.addColorStop(1, "rgba(236,214,170,0.03)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(gx - z * 1.5, gora); ctx.lineTo(gx + z * 1.5, gora); ctx.lineTo(gx + z * 1.5, gy);
            ctx.lineTo(u.cx + z * 2.8, u.yp); ctx.lineTo(u.cx - z * 2.8, u.yp);
            ctx.lineTo(gx - z * 1.5, gy);
            ctx.closePath(); ctx.fill();
            // jaśniejszy środek smugi
            var g2 = ctx.createLinearGradient(0, gora, 0, u.yp);
            g2.addColorStop(0, "rgba(255,244,214,0.14)"); g2.addColorStop(s, "rgba(255,244,214,0.12)"); g2.addColorStop(1, "rgba(255,244,214,0.02)");
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.moveTo(gx - z * 0.6, gora); ctx.lineTo(gx + z * 0.6, gora); ctx.lineTo(gx + z * 0.6, gy);
            ctx.lineTo(u.cx + z * 1.2, u.yp); ctx.lineTo(u.cx - z * 1.2, u.yp);
            ctx.lineTo(gx - z * 0.6, gy);
            ctx.closePath(); ctx.fill();
            // pył w świetle: drobinki krążą powoli w dół i na boki — w szybie i w sali
            int ile = (int)Math.Min(60, Rnd(22 * cala / dy)); var pik = s > 0 ? 1.6 : 1;
            for (int i = 0; i < ile; i++)
            {
                var f = ruch ? (teraz * 0.00004 * (dy / cala) * (0.6 + los(i * 3)) + los(i)) % 1 : los(i);
                var yy = gora + f * cala;
                var fs = yy < gy ? 0 : (yy - gy) / dy;
                var szer = z * 1.5 + (z * 2.8 - z * 1.5) * fs;
                var xx = gx + (u.cx - gx) * fs + (los(i * 7) * 2 - 1) * szer * 0.8 + (ruch ? JsM.Sin(teraz * 0.0007 + i) * z * 0.3 : 0);
                var al = 0.5 * Math.Min(1, pik * JsM.Sin(f * Math.PI)) * (ruch ? 0.6 + 0.4 * JsM.Sin(teraz * 0.003 + i * 2) : 0.8);
                ctx.fillStyle = Barwa.Rgba(255, 246, 220, al);
                ctx.beginPath(); ctx.arc(xx, yy, Math.Max(0.7, z * 0.04), 0, Math.PI * 2); ctx.fill();
            }
            // plama światła na krzyżu i mensie
            var R = z * 2.6;
            var gp = ctx.createRadialGradient(u.cx, u.krzyz.belka, 0, u.cx, u.krzyz.belka, R);
            gp.addColorStop(0, "rgba(255,236,190,0.16)"); gp.addColorStop(1, "rgba(255,236,190,0)");
            ctx.fillStyle = gp; ctx.fillRect(u.cx - R, u.krzyz.belka - R, R * 2, R * 2);
            ctx.restore();
        }

        /// <summary>Modlitwa: promienie od krzyża, złote iskry od klęczącego do krzyża.</summary>
        static void promienie(IPlotno ctx, Uklad u, double teraz, double a, bool ruch, Creature? c, Camera? cam)
        {
            var z = u.z;
            double kx = u.krzyz.x, ky = u.krzyz.belka;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            // glorie rytownika: miękka łuna i gęste, cienkie kreski promieni różnej długości
            var R = z * 2.6;
            var h = ctx.createRadialGradient(kx, ky, 0, kx, ky, R);
            h.addColorStop(0, Barwa.Rgba(255, 232, 170, 0.3 * a)); h.addColorStop(1, "rgba(255,220,140,0)");
            ctx.fillStyle = h; ctx.fillRect(kx - R, ky - R, R * 2, R * 2);
            ctx.lineCap = "round";
            var obrot = ruch ? teraz * 0.00012 : 0;
            for (int i = 0; i < 30; i++)
            {
                var kat = (i / 30.0) * Math.PI * 2 + obrot;
                var dl = z * (1.3 + 1.2 * los(i * 13) + (ruch ? 0.3 * JsM.Sin(teraz * 0.0021 + i * 1.7) : 0));
                double x1 = kx + JsM.Cos(kat) * z * 0.55, y1 = ky + JsM.Sin(kat) * z * 0.55;
                double x2 = kx + JsM.Cos(kat) * dl, y2 = ky + JsM.Sin(kat) * dl;
                var g = ctx.createLinearGradient(x1, y1, x2, y2);
                g.addColorStop(0, Barwa.Rgba(255, 232, 180, 0.42 * a)); g.addColorStop(1, "rgba(255,220,140,0)");
                ctx.strokeStyle = g;
                ctx.lineWidth = Math.Max(0.8, z * 0.035);
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            }
            // iskry modlitwy: od dłoni klęczącego łukiem do krzyża
            if (c != null && cam != null && !c.dead)
            {
                var hh = Figury.wysokoscPostaci(c, z);
                double px = cam.toScreenX(c.x), py = cam.toScreenY(c.y + 1) - hh * 0.55;
                for (int i = 0; i < 9; i++)
                {
                    var f = ruch ? (teraz * 0.0005 + i / 9.0) % 1 : i / 9.0;
                    double x = px + (kx - px) * f, y = py + (ky - py) * f - JsM.Sin(f * Math.PI) * z * 1.1;
                    ctx.fillStyle = Barwa.Rgba(255, 232, 160, 0.85 * JsM.Sin(f * Math.PI) * a);
                    ctx.beginPath(); ctx.arc(x, y, Math.Max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        /// <summary>Krąg znaków wokół ołtarza: zapalają się po kolei z postępem `p` (glify z Tajemnica.cs).</summary>
        static void kragZnakow(IPlotno ctx, Uklad u, double teraz, string rodzaj, double p, double a, bool ruch)
        {
            var z = u.z;
            var kr = KRAG[rodzaj]; double r = kr[0], g = kr[1], b = kr[2];
            const int N = 12;
            var k = u.krag;
            ctx.save();
            // ślad kręgu na posadzce
            ctx.strokeStyle = Barwa.Rgba(r, g, b, 0.35 * a);
            ctx.lineWidth = Math.Max(1, z * 0.05);
            ctx.beginPath(); ctx.ellipse(k.x, u.yp - z * 0.05, k.rx, z * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
            var obrot = ruch ? teraz * 0.00012 : 0;
            for (int i = 0; i < N; i++)
            {
                var zap = gladko(p * N - i);                 // i-ty znak zapala się, gdy przyjdzie jego kolej
                if (zap <= 0) continue;
                var kat = ((double)i / N) * Math.PI * 2 + obrot;
                double x = k.x + JsM.Cos(kat) * k.rx, y = k.y + JsM.Sin(kat) * k.ry;
                var przod = JsM.Sin(kat) > 0 ? 1 : 0.6;       // znaki z przodu kręgu jaśniejsze
                var puls = ruch ? 0.8 + 0.2 * JsM.Sin(teraz * 0.006 + i) : 1;
                var al = zap * a * przod * puls;
                var R = z * 0.6;
                var gl = ctx.createRadialGradient(x, y, 0, x, y, R);
                gl.addColorStop(0, Barwa.Rgba(r, g, b, 0.4 * al)); gl.addColorStop(1, Barwa.Rgba(r, g, b, 0));
                ctx.fillStyle = gl; ctx.fillRect(x - R, y - R, R * 2, R * 2);
                ctx.save();
                ctx.translate(x, y);
                var s = z * 0.22;
                ctx.scale(s, s);
                ctx.lineWidth = Math.Max(1.2, z * 0.07) / s;
                ctx.lineCap = "round";
                ctx.strokeStyle = Barwa.Rgba(Math.Min(255, r + 30), Math.Min(255, g + 40), Math.Min(255, b + 40), 0.95 * al);
                ctx.stroke(Tajemnica.glif(i * 7 + (rodzaj == "wskrzeszenie" ? 3 : 11), 2));
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Szał krwi: krew spływa po krzyżu do misy.</summary>
        static void krewPoKrzyzu(IPlotno ctx, Uklad u, double teraz, double p, bool ruch)
        {
            var z = u.z;
            var k = u.krzyz;
            var dol = k.gora + (k.dol - k.gora) * gladko(p * 2.2);
            ctx.save();
            ctx.strokeStyle = "rgba(176,20,14,0.95)";
            ctx.lineWidth = Math.Max(1.2, z * 0.07);
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(k.x - z * 0.03, k.gora + z * 0.1); ctx.lineTo(k.x - z * 0.03, dol); ctx.stroke();
            // na ramionach krzyża — dwie strużki
            var ram = gladko(p * 3 - 0.4);
            if (ram > 0)
            {
                foreach (var s in new double[] { -1, 1 })
                {
                    ctx.beginPath(); ctx.moveTo(k.x + s * k.ramie * 0.8, k.belka); ctx.lineTo(k.x + s * k.ramie * 0.8, k.belka + z * 0.35 * ram); ctx.stroke();
                }
            }
            // z podstawy krzyża krople kapią do misy
            if (p > 0.4)
            {
                var m = u.misa;
                for (int i = 0; i < 3; i++)
                {
                    var f = ruch ? (teraz * 0.0016 + i / 3.0) % 1 : i / 3.0;
                    double x = k.x + (m.x - k.x) * f, y = k.dol + (m.y - m.h - k.dol) * f - JsM.Sin(f * Math.PI) * z * 0.25;
                    ctx.fillStyle = "rgba(190,24,16,0.95)";
                    ctx.save(); ctx.translate(x, y); ctx.beginPath(); Urobki.kropla(ctx, Math.Max(1.5, z * 0.08)); ctx.fill(); ctx.restore();
                }
            }
            ctx.restore();
        }

        /// <summary>Ofiara krwi: krople z ręki klęczącego łukiem do misy.</summary>
        static void kroplezReki(IPlotno ctx, Uklad u, Camera cam, Creature c, double teraz, bool ruch)
        {
            var z = u.z;
            var hh = Figury.wysokoscPostaci(c, z);
            double px = cam.toScreenX(c.x) + (u.cx > cam.toScreenX(c.x) ? 1 : -1) * hh * 0.18, py = cam.toScreenY(c.y + 1) - hh * 0.5;
            var m = u.misa;
            ctx.save();
            // struga: cienka, ciemna nić krwi z ręki łukiem do misy, a po niej krople
            ctx.strokeStyle = "rgba(150,16,12,0.85)";
            ctx.lineWidth = Math.Max(1.2, z * 0.05);
            ctx.lineCap = "round";
            ctx.beginPath();
            for (int q = 0; q <= 16; q++)
            {
                var f = q / 16.0;
                double x = px + (m.x - px) * f, y = py + (m.y - m.h - py) * f - JsM.Sin(f * Math.PI) * z * 0.8;
                if (q == 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            for (int i = 0; i < 6; i++)
            {
                var f = ruch ? (teraz * 0.0011 + i / 6.0) % 1 : i / 6.0;
                double x = px + (m.x - px) * f, y = py + (m.y - m.h - py) * f - JsM.Sin(f * Math.PI) * z * 0.8;
                ctx.fillStyle = "rgba(196,26,18,0.95)";
                ctx.save(); ctx.translate(x, y); ctx.beginPath(); Urobki.kropla(ctx, Math.Max(1.8, z * 0.12)); ctx.fill(); ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>
        /// Ofiara życia: dusza — blady płomyk — wysuwa się z piersi ofiarującego w (cx, cy) (`p` 0…1) i, gdy ofiara się
        /// dopełni, ulatuje w górę (`lot` 0…1) i gaśnie.
        /// </summary>
        static void dusza(IPlotno ctx, Camera cam, double cx, double cy, double z, double teraz, double p, double lot, bool ruch)
        {
            var hh = Math.Max(16, z * 1.9 * 1.15);
            double px = cam.toScreenX(cx), piers = cam.toScreenY(cy + 1) - hh * 0.62;
            double wysun = gladko(p * 1.3), gas = 1 - gladko((lot - 0.5) / 0.5);
            var y = piers - z * 0.9 * wysun - z * 6 * gladko(lot);
            var x = px + (ruch ? JsM.Sin(teraz * 0.003) * z * 0.12 : 0);
            var a = Math.Min(1, 0.25 + 0.75 * wysun) * gas;
            if (a <= 0.01) return;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var R = z * 1.1;
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(236, 238, 244, 0.4 * a)); g.addColorStop(1, "rgba(220,226,240,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            // płomyk: łza z ogonem w dół, ku ciału — blady, z cienkim konturem
            ctx.globalCompositeOperation = "source-over";
            double r = z * 0.26, ogon = z * (0.6 + 0.5 * wysun);
            ctx.beginPath();
            ctx.moveTo(x, y - r * 1.4);
            ctx.bezierCurveTo(x + r * 1.2, y - r * 0.6, x + r, y + r * 0.8, x + (ruch ? JsM.Sin(teraz * 0.004 + 1) * r * 0.5 : 0), y + ogon);
            ctx.bezierCurveTo(x - r, y + r * 0.8, x - r * 1.2, y - r * 0.6, x, y - r * 1.4);
            ctx.fillStyle = Barwa.Rgba(238, 240, 246, 0.78 * a);
            ctx.fill();
            ctx.strokeStyle = Barwa.Rgba(70, 74, 90, 0.55 * a);
            ctx.lineWidth = Math.Max(1, z * 0.04);
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Szał: czerwona aura wokół rycerza (`moc` 0…1, ponad 1 — rozbłysk) i iskry żaru, które z niej ulatują.</summary>
        static void aura(IPlotno ctx, Camera cam, Creature c, double z, double teraz, double moc, bool ruch)
        {
            if (moc <= 0.01) return;
            var hh = Figury.wysokoscPostaci(c, z);
            double x = cam.toScreenX(c.x), y = cam.toScreenY(c.y + 1) - hh * 0.5;
            var puls = ruch ? 0.85 + 0.15 * JsM.Sin(teraz * 0.009) : 1;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var R = hh * (0.7 + 0.25 * Math.Min(1, moc));
            var g = ctx.createRadialGradient(x, y, hh * 0.1, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 70, 40, 0.32 * moc * puls)); g.addColorStop(1, "rgba(200,30,20,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            for (int i = 0; i < 7; i++)
            {
                var f = ruch ? (teraz * 0.0009 + i / 7.0) % 1 : i / 7.0;
                double ix = x + (los(i * 11) - 0.5) * hh * 0.6, iy = y + hh * 0.3 - f * hh * 1.1;
                ctx.fillStyle = Barwa.Rgba(255, 120, 70, 0.8 * Math.Min(1, moc) * JsM.Sin(f * Math.PI));
                ctx.beginPath(); ctx.arc(ix, iy, Math.Max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Rycina atlasu: ten sam ołtarz ze smugą dnia z góry, płomieniami świec i — gdy podasz — chwilą rytuału.</summary>
        public static void oltarzNaRycinie(IPlotno ctx, double cx, double yp, double z, double t, string? rodzaj = null, double p = 0.75)
        {
            var u = ukladZ(cx, yp, z);
            smugaDnia(ctx, cx, yp - z * 8, yp - z * 8, u, t, true);
            rysujKamien(ctx, u);
            plomienie(ctx, u, t, rodzaj != null ? 1.25 : 1, true);
            if (rodzaj == null) return;
            if (rodzaj == "modlitwa") promienie(ctx, u, t, 1, true, null, null);
            if (Z_KREGIEM.Contains(rodzaj)) kragZnakow(ctx, u, t, rodzaj, p, 1, true);
            if (rodzaj == "szal") { krewPoKrzyzu(ctx, u, t, p, true); krewWMisie(ctx, u, p); }
            if (rodzaj == "ofiaraKrwi") krewWMisie(ctx, u, p);
        }

        static void podpis(IPlotno ctx, string tekst, double x, double y, double z, string barwa)
        {
            ctx.font = $"italic {Js.Js.S(Math.Max(12, Math.Min(16, z * 0.7)))}px {Fonts.KROJ}";
            ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
            ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,7,6,0.85)";
            ctx.strokeText(tekst, x, y);
            ctx.fillStyle = barwa;
            ctx.fillText(tekst, x, y);
        }
    }
}
