// Port: alpha-1/src/render/efekty.ts — krótkie znaki nad światem: każde użycie czasownika zostawia ślad, który widać od
// razu (śmierć — krew i krzyżyk, kopnięcie, zawał, zasiew, myśl, cud, objawienie, szept do jednej postaci, skaza).
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyMoce;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    public static class Efekty
    {
        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        /// <summary>Okno w czasie: narasta od `a` do `b`, trzyma, gaśnie od `c` do `d`.</summary>
        static double okno(double t, double a, double b, double c, double d) => gladko((t - a) / (b - a)) * (1 - gladko((t - c) / (d - c)));
        static double los(double n)
        {
            unchecked
            {
                int x = (Js.Js.ToInt32(n) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                x = (x ^ (int)((uint)x >> 13)) * (int)0xc2b2ae35;
                return (uint)(x ^ (int)((uint)x >> 16)) / 4294967296.0;
            }
        }

        /// <summary>
        /// Krótkie znaki nad światem: każde użycie czasownika musi zostawić ślad, który widać od razu.
        /// </summary>
        public static void rysujEfekty(IPlotno ctx, System.Collections.Generic.List<Efekt> efekty, Camera cam, double czas, Sim? sim = null)
        {
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            ctx.save();
            foreach (var e in efekty)
            {
                var p = e.t / e.max;
                if (p > 1) continue;
                double sx = (e.x - left) * z, sy = (e.y - top) * z;
                // objawienie sięga daleko — nie gaśnie, gdy jego środek wyjdzie za ekran
                var zapas = e.rodzaj == "objawienie" ? z * 12 : 120;
                if (sx < -zapas || sy < -zapas || sx > cam.vw + zapas || sy > cam.vh + zapas) continue;
                var gasnie = 1 - p;

                switch (e.rodzaj)
                {
                    case "smierc":
                        {
                            // krew tryska łukiem i spada, a nad miejscem zostaje na chwilę krótki krzyżyk rytownika
                            for (int i = 0; i < 7; i++)
                            {
                                double kat = -Math.PI / 2 + (i - 3) * 0.32, v = z * (1.2 + (i % 3) * 0.35);
                                double x = sx + JsM.Cos(kat) * v * p * 1.4, y = sy + JsM.Sin(kat) * v * p * 1.4 + z * 3.2 * p * p;
                                ctx.fillStyle = Barwa.Rgba(150, 16, 10, 0.95 * gasnie);
                                ctx.save(); ctx.translate(x, y); ctx.beginPath(); Urobki.kropla(ctx, Math.Max(2, z * (0.1 + (i % 2) * 0.04))); ctx.fill(); ctx.restore();
                            }
                            var r = z * 0.22;
                            ctx.strokeStyle = Barwa.Rgba(200, 96, 76, 0.8 * gasnie);
                            ctx.lineWidth = Math.Max(1, z * 0.07);
                            ctx.beginPath();
                            ctx.moveTo(sx - r, sy - z * 1.6 - r); ctx.lineTo(sx + r, sy - z * 1.6 + r);
                            ctx.moveTo(sx + r, sy - z * 1.6 - r); ctx.lineTo(sx - r, sy - z * 1.6 + r);
                            ctx.stroke();
                            break;
                        }
                    case "kopniecie":
                        ctx.strokeStyle = Barwa.Rgba(232, 216, 186, 0.5 * gasnie);
                        ctx.lineWidth = 2 * gasnie + 0.5;
                        ctx.beginPath();
                        ctx.arc(sx, sy, z * (0.8 + p * 2.4), 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    case "zawal":
                        ctx.strokeStyle = Barwa.Rgba(206, 150, 110, 0.5 * gasnie);
                        ctx.lineWidth = 2.5 * gasnie + 0.5;
                        ctx.beginPath();
                        ctx.arc(sx, sy, z * (0.6 + p * 2.6), 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    case "zasiew":
                        ctx.strokeStyle = Barwa.Rgba(232, 196, 130, 0.55 * gasnie);
                        ctx.lineWidth = 1.8;
                        for (int i = 0; i < 6; i++)
                        {
                            var a = (i / 6.0) * Math.PI * 2 + czas * 0.0004;
                            double r1 = z * 0.5, r2 = z * (1 + p * 1.6);
                            ctx.beginPath();
                            ctx.moveTo(sx + JsM.Cos(a) * r1, sy + JsM.Sin(a) * r1);
                            ctx.lineTo(sx + JsM.Cos(a) * r2, sy + JsM.Sin(a) * r2);
                            ctx.stroke();
                        }
                        break;
                    case "mysl":
                        {
                            var uniesienie = p * z * 1.6;
                            ctx.strokeStyle = Barwa.Rgba(240, 224, 180, 0.85 * gasnie);
                            ctx.lineWidth = 1.6;
                            ctx.beginPath();
                            for (double a = 0; a < 3.2; a += 0.14)
                            {
                                var r = z * 0.16 * a;
                                var px = sx + JsM.Cos(a * 2.2) * r;
                                var py = sy - z * 0.9 - uniesienie + JsM.Sin(a * 2.2) * r * 0.7;
                                if (a == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                            }
                            ctx.stroke();
                            if (!string.IsNullOrEmpty(e.tekst))
                            {
                                ctx.font = $"italic {Js.Js.S(Math.Max(14, z * 0.75))}px \"Trzewia Tekst\", Georgia, serif";
                                ctx.textAlign = "center";
                                ctx.fillStyle = Barwa.Rgba(244, 228, 190, 0.9 * gasnie);
                                ctx.fillText(e.tekst!, sx, sy - z * 1.9 - uniesienie);
                            }
                            break;
                        }
                    case "cud":
                        {
                            var r = z * (1 + p * 9);
                            var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
                            g.addColorStop(0, Barwa.Rgba(255, 220, 150, 0.5 * gasnie));
                            g.addColorStop(1, "rgba(255,200,120,0)");
                            ctx.fillStyle = g;
                            ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
                            ctx.strokeStyle = Barwa.Rgba(252, 226, 168, 0.7 * gasnie);
                            ctx.lineWidth = 2.5 * gasnie;
                            ctx.beginPath();
                            ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
                            ctx.stroke();
                            for (int i = 0; i < 12; i++)
                            {
                                var a = (i / 12.0) * Math.PI * 2;
                                ctx.beginPath();
                                ctx.moveTo(sx + JsM.Cos(a) * r * 0.2, sy + JsM.Sin(a) * r * 0.2);
                                ctx.lineTo(sx + JsM.Cos(a) * r * 0.75, sy + JsM.Sin(a) * r * 0.75);
                                ctx.stroke();
                            }
                            break;
                        }
                    case "objawienie":
                        // Cud sprowadza pobożny: światło spada z góry tuż przy nim
                        objawienie(ctx, sim, cam, e.x, e.y, sx, sy, z, p, czas);
                        break;
                    case "szept":
                        {
                            // szept do jednej postaci: nić światła schodzi z góry na głowę, nad głową zapala się znak i gaśnie
                            var glowa = sy + z - z * 2.4;
                            double zejscie = gladko(p / 0.2), a = 1 - gladko((p - 0.7) / 0.3);
                            ctx.save();
                            ctx.globalCompositeOperation = "lighter";
                            var gora = glowa - z * 7;
                            var koniec = gora + (glowa - z * 0.6 - gora) * zejscie;
                            // nić: złota kreska z ciemnym brzegiem — na jasnej ścianie sali samo światło ginęło
                            ctx.globalCompositeOperation = "source-over";
                            var kx = sx + JsM.Sin(czas * 0.004) * z * 0.08;
                            foreach (var (w, kr, kg, kb) in new[] { (0.16, 60.0, 34.0, 12.0), (0.07, 255.0, 226.0, 150.0) })
                            {
                                var gn = ctx.createLinearGradient(0, gora, 0, koniec);
                                gn.addColorStop(0, Barwa.Rgba(kr, kg, kb, 0)); gn.addColorStop(1, Barwa.Rgba(kr, kg, kb, 0.8 * a));
                                ctx.strokeStyle = gn;
                                ctx.lineWidth = Math.Max(1, z * w);
                                ctx.beginPath(); ctx.moveTo(sx, gora); ctx.lineTo(kx, koniec); ctx.stroke();
                            }
                            ctx.globalCompositeOperation = "lighter";
                            if (zejscie > 0.95)
                            {
                                double zn = gladko((p - 0.18) / 0.12) * a, yz = glowa - z * 0.85;
                                var R = z * 1.1;
                                var gz = ctx.createRadialGradient(sx, yz, 0, sx, yz, R);
                                gz.addColorStop(0, Barwa.Rgba(255, 228, 160, 0.45 * zn)); gz.addColorStop(1, "rgba(255,220,150,0)");
                                ctx.fillStyle = gz; ctx.fillRect(sx - R, yz - R, R * 2, R * 2);
                                ctx.globalCompositeOperation = "source-over";
                                ctx.translate(sx, yz);
                                var sk = z * 0.42;
                                ctx.scale(sk, sk);
                                ctx.lineCap = "round";
                                ctx.lineWidth = Math.Max(3, z * 0.2) / sk;
                                ctx.strokeStyle = Barwa.Rgba(48, 28, 12, 0.75 * zn);
                                ctx.stroke(Tajemnica.glif(37, 2));
                                ctx.lineWidth = Math.Max(1.4, z * 0.08) / sk;
                                ctx.strokeStyle = Barwa.Rgba(255, 226, 150, 0.95 * zn);
                                ctx.stroke(Tajemnica.glif(37, 2));
                            }
                            ctx.restore();
                            if (!string.IsNullOrEmpty(e.tekst))
                            {
                                ctx.font = $"italic {Js.Js.S(Math.Max(14, z * 0.75))}px \"Trzewia Tekst\", Georgia, serif";
                                ctx.textAlign = "center";
                                ctx.fillStyle = Barwa.Rgba(244, 228, 190, 0.9 * a);
                                ctx.fillText(e.tekst!, sx, glowa - z * 1.8);
                            }
                            break;
                        }
                    case "skaza":
                        {
                            var r = z * (1 + p * 7);
                            ctx.strokeStyle = Barwa.Rgba(190, 52, 44, 0.6 * gasnie);
                            ctx.lineWidth = 3 * gasnie + 0.5;
                            ctx.beginPath();
                            ctx.arc(sx, sy, r, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.strokeStyle = Barwa.Rgba(150, 28, 24, 0.35 * gasnie);
                            ctx.beginPath();
                            ctx.arc(sx, sy, r * 0.7, 0, Math.PI * 2);
                            ctx.stroke();
                            break;
                        }
                }
            }
            ctx.restore();
        }

        /// <summary>
        /// Objawienie (Cud, Alpha 1): przyciemnienie wokół, iskry nad głową pobożnego, aureola, krąg glifów w powietrzu,
        /// słup światła spada aż do stóp, błysk i fala po posadzce, krąg glifów na ziemi, pióra, smugi od wiernych, pył.
        /// </summary>
        static void objawienie(IPlotno ctx, Sim? sim, Camera cam, double wx, double wy, double sx, double sy, double z, double p, double czas)
        {
            var ziarno = Math.Floor(wx * 131 + wy * 977 + 0.5); var ruch = Nastroj.wolnoRuszac();
            double stopy = sy + z * 0.5, glowa = stopy - z * 2.1;
            var gora = Math.Max(glowa - z * 9, Math.Min(glowa - z * 3, z * 1.2));
            ctx.save();
            // ciemność wokół na samym początku
            var mrok = okno(p, 0, 0.1, 0.22, 0.4) * 0.45;
            if (mrok > 0.01)
            {
                var R = z * 16; var g = ctx.createRadialGradient(sx, glowa, z * 1.5, sx, glowa, R);
                g.addColorStop(0, "rgba(6,4,10,0)"); g.addColorStop(0.5, Barwa.Rgba(6, 4, 10, mrok * 0.6)); g.addColorStop(1, Barwa.Rgba(6, 4, 10, mrok));
                ctx.fillStyle = g; ctx.fillRect(0, 0, cam.vw, cam.vh);
            }
            ctx.globalCompositeOperation = "lighter";
            // iskry ściągają do głowy
            var iskry = okno(p, 0, 0.04, 0.2, 0.3);
            if (iskry > 0.01)
            {
                double cxx = sx, cyy = glowa - z * 0.7;
                for (int i = 0; i < 26; i++)
                {
                    double start = los(ziarno + i) * 0.12, t = gladko((p - start) / 0.14);
                    if (t <= 0 || t >= 1) continue;
                    double kat = los(ziarno + i * 7) * Math.PI * 2 + t * 3.2, r = z * (4 + los(ziarno + i * 3) * 4) * (1 - t);
                    double x = cxx + JsM.Cos(kat) * r, y = cyy + JsM.Sin(kat) * r * 0.7;
                    ctx.fillStyle = Barwa.Rgba(255, 224, 150, 0.9 * JsM.Sin(t * Math.PI) * iskry);
                    ctx.beginPath(); ctx.arc(x, y, Math.Max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = Barwa.Rgba(255, 210, 120, 0.35 * JsM.Sin(t * Math.PI) * iskry); ctx.lineWidth = Math.Max(0.8, z * 0.04);
                    double k2 = kat - 0.35, r2 = r + z * 0.6;
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cxx + JsM.Cos(k2) * r2, cyy + JsM.Sin(k2) * r2 * 0.7); ctx.stroke();
                }
                var R = z * (0.6 + 0.4 * iskry); var g = ctx.createRadialGradient(sx, glowa + z * 0.3, 0, sx, glowa + z * 0.3, R);
                g.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.55 * iskry)); g.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = g; ctx.fillRect(sx - R, glowa + z * 0.3 - R, R * 2, R * 2);
            }
            // aureola nad głową
            var aureola = okno(p, 0.02, 0.14, 0.82, 1);
            if (aureola > 0.01)
            {
                var y = glowa - z * 0.55;
                ctx.strokeStyle = Barwa.Rgba(255, 226, 150, 0.85 * aureola); ctx.lineWidth = Math.Max(1.2, z * 0.08);
                ctx.beginPath(); ctx.ellipse(sx, y, z * 0.5 * (0.6 + 0.4 * aureola), z * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
                var g = ctx.createRadialGradient(sx, y, 0, sx, y, z * 1.1);
                g.addColorStop(0, Barwa.Rgba(255, 236, 180, 0.3 * aureola)); g.addColorStop(1, "rgba(255,236,180,0)");
                ctx.fillStyle = g; ctx.fillRect(sx - z * 1.1, y - z * 1.1, z * 2.2, z * 2.2);
            }
            // krąg glifów w powietrzu, u szczytu słupa
            var krag = okno(p, 0.09, 0.18, 0.7, 0.92);
            if (krag > 0.01)
            {
                double R = z * (2.8 + 0.8 * gladko((p - 0.09) / 0.15)), obrot = (ruch ? czas * 6e-4 : 0) + p * 1.5, blysk = okno(p, 0.15, 0.19, 0.19, 0.3);
                ctx.save(); ctx.translate(sx, gora); ctx.scale(1, 0.32);
                var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.4);
                g.addColorStop(0, Barwa.Rgba(255, 240, 200, (0.35 + 0.5 * blysk) * krag)); g.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = g; ctx.fillRect(-R * 1.4, -R * 1.4, R * 2.8, R * 2.8);
                ctx.strokeStyle = Barwa.Rgba(255, 226, 150, 0.9 * krag); ctx.lineWidth = Math.Max(1.2, z * 0.08) / 0.32 * 0.4;
                ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, Math.PI * 2); ctx.stroke();
                for (int i = 0; i < 12; i++)
                {
                    var t = obrot + (i / 12.0) * Math.PI * 2;
                    ctx.save(); ctx.translate(JsM.Cos(t) * R * 0.89, JsM.Sin(t) * R * 0.89); ctx.rotate(t + Math.PI / 2);
                    var s = z * 0.16;
                    ctx.scale(s, (s / 0.32) * 0.5); ctx.lineWidth = 1.5 / s; ctx.strokeStyle = Barwa.Rgba(255, 236, 190, 0.95 * krag);
                    ctx.stroke(Tajemnica.glif(ziarno + i, 1)); ctx.restore();
                }
                ctx.rotate(-obrot * 1.6); ctx.lineWidth = Math.Max(1, z * 0.05) / 0.32 * 0.4;
                for (int i = 0; i < 8; i++)
                {
                    var t = (i / 8.0) * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(JsM.Cos(t) * R * 0.2, JsM.Sin(t) * R * 0.2); ctx.lineTo(JsM.Cos(t) * R * 0.7, JsM.Sin(t) * R * 0.7); ctx.stroke();
                }
                ctx.restore();
            }
            // słup światła: spada z kręgu do stóp, potem gaśnie od góry
            double spada = gladko((p - 0.17) / 0.05), gasnie = gladko((p - 0.8) / 0.18);
            if (spada > 0 && gasnie < 1)
            {
                var drzenie = ruch ? 0.85 + 0.15 * JsM.Sin(czas * 0.012) : 1;
                var szer = z * (1.1 + 0.5 * okno(p, 0.2, 0.3, 0.55, 0.85)) * drzenie;
                double yGora = gora - z * 2 + (stopy - gora) * gasnie, yDol = gora + (stopy - gora) * spada, sila = 1 - gasnie * 0.4;
                var poswiata = ctx.createLinearGradient(sx - szer * 2.2, 0, sx + szer * 2.2, 0);
                poswiata.addColorStop(0, "rgba(255,214,130,0)"); poswiata.addColorStop(0.5, Barwa.Rgba(255, 220, 150, 0.3 * sila)); poswiata.addColorStop(1, "rgba(255,214,130,0)");
                ctx.fillStyle = poswiata; ctx.fillRect(sx - szer * 2.2, yGora, szer * 4.4, yDol - yGora);
                var slup = ctx.createLinearGradient(sx - szer, 0, sx + szer, 0);
                slup.addColorStop(0, "rgba(255,220,150,0)"); slup.addColorStop(0.5, Barwa.Rgba(255, 236, 190, 0.55 * sila)); slup.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = slup;
                // na postaci słup przygasa — nie zalewa jej bielą
                var nadGlowa = Math.Min(yDol, glowa - z * 0.9);
                if (nadGlowa > yGora) ctx.fillRect(sx - szer, yGora, szer * 2, nadGlowa - yGora);
                if (yDol > nadGlowa) { ctx.globalAlpha = 0.45; ctx.fillRect(sx - szer, nadGlowa, szer * 2, yDol - nadGlowa); ctx.globalAlpha = 1; }
                var rdzen = szer * 0.28; var gr = ctx.createLinearGradient(sx - rdzen, 0, sx + rdzen, 0);
                gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, Barwa.Rgba(255, 255, 250, 0.85 * sila)); gr.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = gr;
                if (nadGlowa > yGora) ctx.fillRect(sx - rdzen, yGora, rdzen * 2, nadGlowa - yGora);
                if (yDol > nadGlowa) { ctx.globalAlpha = 0.25; ctx.fillRect(sx - rdzen, nadGlowa, rdzen * 2, yDol - nadGlowa); ctx.globalAlpha = 1; }
                // smugi rylcem w słupie
                ctx.lineWidth = Math.Max(0.8, z * 0.04);
                for (int i = -5; i <= 5; i++)
                {
                    var x = sx + (i / 5.5) * szer * 0.9 + (ruch ? JsM.Sin(czas * 3e-3 + i) * z * 0.05 : 0);
                    ctx.strokeStyle = Barwa.Rgba(255, 246, 214, (0.3 - Math.Abs(i) * 0.04) * sila);
                    ctx.beginPath(); ctx.moveTo(x, yGora); ctx.lineTo(x, yDol); ctx.stroke();
                }
                // czoło spadającego słupa
                if (spada < 1)
                {
                    var g = ctx.createRadialGradient(sx, yDol, 0, sx, yDol, szer * 1.8);
                    g.addColorStop(0, "rgba(255,255,240,0.95)"); g.addColorStop(1, "rgba(255,230,160,0)");
                    ctx.fillStyle = g; ctx.fillRect(sx - szer * 1.8, yDol - szer * 1.8, szer * 3.6, szer * 3.6);
                }
                // pył wznosi się w słupie
                if (spada >= 1) for (int i = 0; i < 22; i++)
                    {
                        var t = (p * 2.2 + los(ziarno + i * 5)) % 1;
                        var x = sx + (los(ziarno + i * 11) - 0.5) * szer * 1.4 + (ruch ? JsM.Sin(i * 2.3 + czas * 2e-3) * szer * 0.15 : 0);
                        var y = stopy - t * (stopy - yGora);
                        ctx.fillStyle = Barwa.Rgba(255, 250, 226, 0.85 * sila * JsM.Sin(t * Math.PI));
                        ctx.beginPath(); ctx.arc(x, y, Math.Max(0.8, z * (0.03 + 0.04 * los(ziarno + i))), 0, Math.PI * 2); ctx.fill();
                    }
            }
            // uderzenie o posadzkę: błysk, fale, promienie i odpryski
            var uderzenie = (p - 0.21) / 0.2;
            if (uderzenie > 0 && uderzenie < 1)
            {
                var blysk = Math.Max(0, 1 - uderzenie * 3.5);
                if (blysk > 0) { ctx.fillStyle = Barwa.Rgba(255, 244, 214, 0.28 * blysk); ctx.fillRect(0, 0, cam.vw, cam.vh); }
                foreach (var (op, sila) in new[] { (0.0, 1.0), (0.12, 0.6) })
                {
                    var t = (uderzenie - op) / (1 - op);
                    if (t <= 0) continue;
                    var r = z * (1 + t * 11);
                    ctx.strokeStyle = Barwa.Rgba(255, 232, 170, 0.8 * sila * (1 - t)); ctx.lineWidth = Math.Max(1, z * 0.18 * (1 - t));
                    ctx.beginPath(); ctx.ellipse(sx, stopy, r, r * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
                }
                var promienie = gladko(uderzenie / 0.4) * (1 - gladko((uderzenie - 0.5) / 0.5));
                ctx.lineWidth = Math.Max(1, z * 0.07);
                for (int i = 0; i < 16; i++)
                {
                    double kat = Math.PI + ((i + 0.5) / 16) * Math.PI, dl = z * (3 + 5 * los(ziarno + i * 13)) * gladko(uderzenie / 0.5);
                    ctx.strokeStyle = Barwa.Rgba(255, 240, 200, 0.55 * promienie);
                    ctx.beginPath(); ctx.moveTo(sx + JsM.Cos(kat) * z * 0.8, stopy + JsM.Sin(kat) * z * 0.25); ctx.lineTo(sx + JsM.Cos(kat) * dl, stopy + JsM.Sin(kat) * dl * 0.55); ctx.stroke();
                }
                for (int i = 0; i < 24; i++)
                {
                    double kat = -Math.PI * (0.08 + 0.84 * los(ziarno + i * 17)), v = z * (4 + 6 * los(ziarno + i * 19)), t = uderzenie;
                    double x = sx + JsM.Cos(kat) * v * t, y = stopy + JsM.Sin(kat) * v * t + z * 6 * t * t;
                    ctx.fillStyle = Barwa.Rgba(255, 210 + (i * 7) % 40, 140, (1 - t) * 0.95);
                    ctx.beginPath(); ctx.arc(x, y, Math.Max(1, z * 0.08 * (1 - t * 0.5)), 0, Math.PI * 2); ctx.fill();
                }
            }
            // krąg glifów na posadzce
            var naZiemi = okno(p, 0.2, 0.3, 0.78, 0.98);
            if (naZiemi > 0.01)
            {
                double R = z * 2.6, obrot = (ruch ? -czas * 9e-4 : 0) - p * 2;
                ctx.save(); ctx.translate(sx, stopy); ctx.scale(1, 0.22);
                var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
                g.addColorStop(0, Barwa.Rgba(255, 232, 170, 0.45 * naZiemi)); g.addColorStop(1, "rgba(255,220,150,0)");
                ctx.fillStyle = g; ctx.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
                ctx.strokeStyle = Barwa.Rgba(255, 226, 150, 0.8 * naZiemi); ctx.lineWidth = Math.Max(1, z * 0.07) / 0.22 * 0.3;
                ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash(R * 0.08, R * 0.05); ctx.lineDashOffset = obrot * R;
                ctx.beginPath(); ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash();
                for (int i = 0; i < 10; i++)
                {
                    var t = obrot + (i / 10.0) * Math.PI * 2;
                    ctx.save(); ctx.translate(JsM.Cos(t) * R * 0.91, JsM.Sin(t) * R * 0.91);
                    var s = z * 0.13;
                    ctx.scale(s, (s / 0.22) * 0.35); ctx.lineWidth = 1.4 / s; ctx.strokeStyle = Barwa.Rgba(255, 236, 190, 0.9 * naZiemi);
                    ctx.stroke(Tajemnica.glif(ziarno + 40 + i, 0)); ctx.restore();
                }
                ctx.restore();
            }
            // pióra spadają z góry
            var piora = okno(p, 0.24, 0.34, 0.85, 1);
            if (piora > 0.01) for (int i = 0; i < 9; i++)
                {
                    double start = 0.24 + los(ziarno + i * 23) * 0.35, t = (p - start) / 0.5;
                    if (t <= 0 || t >= 1) continue;
                    var x = sx + (los(ziarno + i * 29) - 0.5) * z * 6 + JsM.Sin(t * 9 + i) * z * 0.6;
                    double y = glowa - z * 6 + t * (stopy - glowa + z * 6), kat = JsM.Sin(t * 9 + i) * 0.7;
                    ctx.save(); ctx.translate(x, y); ctx.rotate(kat);
                    double d = z * 0.5, a = piora * JsM.Sin(t * Math.PI);
                    ctx.fillStyle = Barwa.Rgba(255, 240, 200, 0.9 * a);
                    ctx.beginPath(); ctx.moveTo(0, -d); ctx.quadraticCurveTo(d * 0.4, -d * 0.2, 0, d); ctx.quadraticCurveTo(-d * 0.4, -d * 0.2, 0, -d); ctx.fill();
                    ctx.strokeStyle = Barwa.Rgba(255, 255, 255, 0.5 * a); ctx.lineWidth = 0.7;
                    ctx.beginPath(); ctx.moveTo(0, -d); ctx.lineTo(0, d); ctx.stroke();
                    ctx.restore();
                }
            // smugi światła od pobliskich wiernych do pobożnego
            var wierni = okno(p, 0.26, 0.36, 0.7, 0.88);
            if (sim != null && wierni > 0.01)
            {
                int ile = 0;
                foreach (var c in sim.creatures)
                {
                    double ddx = c.x - wx, ddy = c.y - wy;
                    if (c.dead || Symulacja.Lud.rolaPostaci(c) == null || ile > 10 || Math.Sqrt(ddx * ddx + ddy * ddy) > MOCE.znakZasieg || Math.Abs(c.x - wx) < 0.6) continue;
                    ile++;
                    double x = cam.toScreenX(c.x), y = cam.toScreenY(c.y + 1) - z * 2.2, kx = (x + sx) / 2, ky = Math.Min(y, glowa) - z * 2.5;
                    ctx.strokeStyle = Barwa.Rgba(255, 220, 140, 0.35 * wierni); ctx.lineWidth = Math.Max(0.8, z * 0.04);
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(kx, ky, sx, glowa - z * 1.5); ctx.stroke();
                    var t = ((p - 0.26) * 3 + c.id * 0.137) % 1;
                    var px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * kx + t * t * sx;
                    var py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * ky + t * t * (glowa - z * 1.5);
                    ctx.fillStyle = Barwa.Rgba(255, 244, 210, 0.9 * wierni);
                    ctx.beginPath(); ctx.arc(px, py, Math.Max(1, z * 0.07), 0, Math.PI * 2); ctx.fill();
                    var k = z * 0.22 * wierni;
                    ctx.strokeStyle = Barwa.Rgba(255, 236, 180, 0.9 * wierni); ctx.lineWidth = Math.Max(1, z * 0.05);
                    ctx.beginPath(); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.moveTo(x, y - k * 1.4); ctx.lineTo(x, y + k); ctx.stroke();
                }
            }
            // na koniec pył opada
            var pyl = okno(p, 0.78, 0.86, 0.9, 1);
            if (pyl > 0.01) for (int i = 0; i < 18; i++)
                {
                    double t = (p - 0.78) / 0.22, x = sx + (los(ziarno + i * 31) - 0.5) * z * 5, y = stopy - z * (3 + 3 * los(ziarno + i * 37)) * (1 - t);
                    ctx.fillStyle = Barwa.Rgba(255, 226, 160, 0.7 * pyl);
                    ctx.beginPath(); ctx.arc(x, y, Math.Max(0.8, z * 0.05), 0, Math.PI * 2); ctx.fill();
                }
            ctx.restore();
        }
    }
}
