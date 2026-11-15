// Port: alpha-1/src/render/wiadro.ts — Remake v2: wiadro z jedzeniem na linie (logika: Symulacja/Wiadro.cs).
// Lina wychodzi ze stropu jamy (Alpha: z bloczka na koźle nad szybem); drewniane wiadro w żelaznych obręczach, z wierzchu
// bochny i korzenie. W czasie zjazdu pod wiadrem wisi luźny koniec liny aż do ziemi.
// Alpha, etap 4 — przecięta lina: błysk i włókna w miejscu cięcia, dolny kawałek spada i zwija się na dnie, górny
// dynda ze strzępami; zjeżdżające wiadro spada, koziołkując, i roztrzaskuje się; naprawiający wspina się po kikucie,
// ciągnie dolny kawałek, pod dłonią rośnie supeł; potem lina się napina — drży i uspokaja się.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWiadro;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek wiader (RysWiadra — bo Wiadro to klasa symulacji).</summary>
    public static class RysWiadra
    {
        /// <summary>Tani skrót liczby — stałe kształty strzępów i klepek (rysunek nie sięga po los gry).</summary>
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

        const string LINA = "rgba(176,140,92,0.95)";
        const string LINA_CIEN = "rgba(20,12,8,0.85)";
        /// <summary>Wiadro jest większe od kafla (postać ma prawie dwa) — wysokie na tyle, żeby ktoś się w nim zmieścił.</summary>
        const double WIELKOSC = 1.6;

        /// <summary>
        /// Gdzie na ekranie: kolumna liny, strop (Alpha: bloczek na koźle nad szybem), wiadro (górny lewy róg układu —
        /// środek brzegu), jego wielkość i przechył.
        /// </summary>
        static (double sx, double gora, double bx, double top, double Z, double kat) uklad(WiadroJedzenia wd, Camera cam, double teraz, (double x, double y)? b)
        {
            var z = cam.zoom;
            var zKozla = b != null && wd.szyb == true;
            double sx = cam.toScreenX(wd.x + 0.5), gora = cam.toScreenY(zKozla ? b!.Value.y : wd.sufit);
            var Z = Math.Max(10, z * WIELKOSC);
            // dno wiadra na dole kafla, w którym jest — stojące stoi na podłodze; pod kozłem wyżej niż pod bloczek nie wjedzie
            var top = cam.toScreenY((zKozla ? Math.Max(wd.y, wd.sufit - 1) : wd.y) + 1) - Z;
            // kołysanie w czasie jazdy (wiadro stoi — wisi prosto); etap 4: spadające koziołkuje
            var jedzie = wd.faza == "zjezdza" || wd.faza == "odjezdza";
            var kat = wd.faza == "spada" ? (wd.id % 2 != 0 ? 1 : -1) * Math.Min(1.2, wd.v * 2.4) : jedzie ? JsM.Sin(teraz * 0.0021 + wd.id * 1.7) * 0.045 : 0;
            var bx = sx + JsM.Sin(kat) * Math.Max(0, top - gora) * 0.6;
            return (sx, gora, bx, top, Z, kat);
        }

        public static void rysujWiadra(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var lista = Wiadro.wiadra(sim);
            var st = sim.lud.wiadra;
            var lp = st?.przecieta;
            var z = cam.zoom;
            var b = Konwoj.bloczekWiadra(sim.world);
            ctx.save();
            ctx.lineCap = "round";
            // etap 4: przecięta lina — kikut ze strzępami, dolny kawałek, cięcie
            if (lp != null) rysujPrzecieta(ctx, sim, cam, teraz, lp);
            foreach (var wd in lista)
            {
                // zapowiedź: wiadro jeszcze w skale nad stropem — w Alphie już wisi pod bloczkiem kozła, gotowe do zjazdu
                if (wd.faza == "zapowiedz" && !(b != null && wd.szyb == true)) continue;
                // etap 4: roztrzaskane — klepki, obręcze i rozsypane jedzenie na dnie
                if (wd.faza == "rozbite") { rozbite(ctx, sim, wd, cam); continue; }
                var (sx, gora, bx, top, Z, kat) = uklad(wd, cam, teraz, b);
                var dolJamy = cam.toScreenY(wd.cel + 1);
                var odBloczka = b != null && wd.szyb == true ? 0 : z * 0.2;
                if (sx < -60 || sx > cam.vw + 60 || dolJamy < -60 || gora > cam.vh + 60) continue;
                ctx.save();
                // nad stropem jamy jest skała — wiadro wjeżdżające w górę znika w niej
                ctx.beginPath(); ctx.rect(-100, gora, cam.vw + 200, cam.vh + 200 - gora); ctx.clip();
                // lina od stropu do kabłąka
                var kablakY = top + Z * 0.05;
                var gr = Math.Max(1, z * 0.09);
                if (wd.faza == "spada")
                {
                    ctx.save(); ctx.translate(bx, kablakY); ctx.rotate(kat);
                    lina(ctx, 0, 0, 0, -z * 1.1, gr);
                    strzepy(ctx, 0, -z * 1.1, z, -Math.PI / 2, wd.id);
                    ctx.restore();
                }
                else if (lp == null)
                {
                    // po naprawie lina się napina: drży coraz słabiej, a w miejscu sklejenia siedzi supeł
                    var napina = st?.naprawionaT is double nT ? sim.tick - nT : double.PositiveInfinity;
                    if (napina < WIADRO.naprawa.napinanie)
                    {
                        var k = napina / WIADRO.naprawa.napinanie;
                        var drgnij = JsM.Sin(napina * 0.45) * (1 - k) * (1 - k) * z * 0.55;
                        linaLuk(ctx, sx, gora - odBloczka, bx, kablakY, gr, drgnij);
                        var wy = Math.Min(kablakY - z * 0.3, cam.toScreenY(wd.cel + 1 - WIADRO.naprawa.koniecNadDnem));
                        supel(ctx, sx + (bx - sx) * 0.9 + drgnij * 0.3, wy, z, 1);
                    }
                    else lina(ctx, sx, gora - odBloczka, bx, kablakY, gr);
                }
                // luźny koniec liny pod zjeżdżającym wiadrem — aż do ziemi, lekko wygięty
                if (wd.faza == "zjezdza")
                {
                    double dno = top + Z, ziemia = dolJamy;
                    if (ziemia - dno > z * 0.4)
                    {
                        var fala = JsM.Sin(teraz * 0.003 + wd.id) * z * 0.25;
                        ctx.globalAlpha = 0.8;
                        ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.Max(1.4, z * 0.1);
                        ctx.beginPath(); ctx.moveTo(bx, dno); ctx.quadraticCurveTo(bx + fala, (dno + ziemia) / 2, bx + fala * 0.4, ziemia); ctx.stroke();
                        ctx.strokeStyle = LINA; ctx.lineWidth = Math.Max(0.8, z * 0.055);
                        ctx.stroke();
                        // zwój liny na ziemi
                        ctx.beginPath(); ctx.ellipse(bx + fala * 0.4, ziemia - z * 0.06, z * 0.22, z * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
                // ciepła poświata pełnego wiadra
                if (wd.porcje > 0)
                {
                    var r = z * 2.2;
                    var gy = top + Z * 0.4;
                    var g = ctx.createRadialGradient(bx, gy, 0, bx, gy, r);
                    g.addColorStop(0, "rgba(255,196,110,0.32)"); g.addColorStop(1, "rgba(255,170,90,0)");
                    ctx.save(); ctx.globalCompositeOperation = "lighter";
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, gy, r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
                ctx.translate(bx, top);
                ctx.rotate(kat);
                kubel(ctx, wd.porcje, wd.pelne, Z);
                ctx.restore();
            }
            // Alpha: między dostawami puste wiadro wisi pod bloczkiem kozła — konwój napełni je i spuści
            var jestWSzybie = false;
            foreach (var wd in lista) if (wd.szyb == true) { jestWSzybie = true; break; }
            if (b is { } bl && lp == null && !jestWSzybie)
            {
                double sx = cam.toScreenX(bl.x), gora = cam.toScreenY(bl.y);
                double Z = Math.Max(10, z * WIELKOSC), top = cam.toScreenY(World.SURFACE_Y - 1) - Z;
                if (sx > -60 && sx < cam.vw + 60 && top < cam.vh + 60 && gora > -60)
                {
                    var kol = JsM.Sin(teraz * 0.0011) * 0.025;
                    lina(ctx, sx, gora, sx + JsM.Sin(kol) * (top - gora), top + Z * 0.05, Math.Max(1, z * 0.09));
                    ctx.save();
                    ctx.translate(sx + JsM.Sin(kol) * (top - gora), top); ctx.rotate(kol);
                    kubel(ctx, 0, 0, Z);
                    ctx.restore();
                }
            }
            ctx.restore();
        }

        /// <summary>
        /// Kto siedzi w zjeżdżającym wiadrze, ma być w nim, a nie przed nim: po narysowaniu postaci jeszcze raz sama
        /// ścianka wiadra (bez kabłąka i jedzenia) zasłania mu nogi.
        /// </summary>
        public static void rysujPrzodWiader(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var zajete = new HashSet<double>();
            foreach (var c in sim.creatures) if (!c.dead && c.naWiadrze == true && c.naLinie is double nl) zajete.Add(nl);
            if (zajete.Count == 0) return;
            foreach (var wd in Wiadro.wiadra(sim))
            {
                if (!zajete.Contains(wd.id) || wd.faza == "zapowiedz") continue;
                var (_, _, bx, top, Z, kat) = uklad(wd, cam, teraz, Konwoj.bloczekWiadra(sim.world));
                ctx.save();
                ctx.translate(bx, top); ctx.rotate(kat);
                kubel(ctx, wd.porcje, wd.pelne, Z, true);
                ctx.restore();
            }
        }

        // ---------------------------------------------------------------- etap 4: przecięta lina

        /// <summary>Strzępy na końcu przeciętej liny: kilka rozczapierzonych włókien w kierunku `kat`.</summary>
        static void strzepy(IPlotno ctx, double x, double y, double z, double kat, double ziarno)
        {
            ctx.save();
            ctx.lineCap = "round";
            for (int i = 0; i < 6; i++)
            {
                double a = kat + (los(ziarno * 31 + i) - 0.5) * 1.6, dl = z * (0.12 + 0.2 * los(ziarno * 17 + i));
                ctx.strokeStyle = i % 2 != 0 ? LINA : "rgba(140,108,66,0.95)"; ctx.lineWidth = Math.Max(0.6, z * 0.03);
                ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + JsM.Cos(a) * dl * 0.5, y + JsM.Sin(a) * dl * 0.5 + z * 0.03, x + JsM.Cos(a) * dl, y + JsM.Sin(a) * dl); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Lina wygięta w łuk (drży, zwisa) — od (x1, y1) do (x2, y2), środek odsunięty w bok o `wygiecie`.</summary>
        static void linaLuk(IPlotno ctx, double x1, double y1, double x2, double y2, double gr, double wygiecie)
        {
            double mx = (x1 + x2) / 2 + wygiecie, my = (y1 + y2) / 2;
            ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = gr + 1.2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
            ctx.strokeStyle = LINA; ctx.lineWidth = gr;
            ctx.stroke();
        }

        /// <summary>Supeł: zwoje owinięte wokół liny (`ile` 0..1 — ile już owinął).</summary>
        static void supel(IPlotno ctx, double x, double y, double z, double ile)
        {
            var n = Math.Max(1, (int)Math.Floor(ile * 4 + 0.5));
            ctx.save();
            for (int i = 0; i < n; i++)
            {
                var yy = y - z * 0.09 * i + z * 0.13;
                ctx.fillStyle = "rgba(150,114,70,0.98)"; ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.Max(0.6, z * 0.025);
                ctx.beginPath(); ctx.ellipse(x, yy, z * 0.13, z * 0.06, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Zwój liny leżący na dnie.</summary>
        static void zwojNaDnie(IPlotno ctx, double x, double y, double z)
        {
            ctx.save();
            ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = Math.Max(1.4, z * 0.1);
            for (int pass = 0; pass < 2; pass++)
            {
                if (pass != 0) { ctx.strokeStyle = LINA; ctx.lineWidth = Math.Max(0.8, z * 0.06); }
                for (int i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + i * z * 0.05, y - z * 0.05 - i * z * 0.06, z * (0.34 - i * 0.05), z * 0.08, 0.05, 0, Math.PI * 2); ctx.stroke(); }
                ctx.beginPath(); ctx.moveTo(x + z * 0.3, y - z * 0.06); ctx.quadraticCurveTo(x + z * 0.6, y - z * 0.02, x + z * 0.75, y - z * 0.1); ctx.stroke();
            }
            strzepy(ctx, x + z * 0.75, y - z * 0.1, z, -0.3, 7);
            ctx.restore();
        }

        /// <summary>
        /// Przecięta lina: z góry zwisa kikut, dolny kawałek spadł i leży zwinięty przy wiadrze — albo zwisa z dłoni tego,
        /// kto wspina się po kikucie, aż do wiadra. Przez chwilę po cięciu: błysk i włókna.
        /// </summary>
        static void rysujPrzecieta(IPlotno ctx, Sim sim, Camera cam, double teraz, LinaPrzecieta lp)
        {
            var z = cam.zoom;
            var t = sim.tick - lp.od;
            // kikut zwisa z bloczka na koźle (Alpha) albo spod stropu
            double sx = cam.toScreenX(lp.x + 0.5), gora = cam.toScreenY(Konwoj.bloczekWiadra(sim.world)?.y ?? World.SURFACE_Y - 1);
            var dno = cam.toScreenY(lp.dno + 1);
            if (sx < -80 || sx > cam.vw + 80 || dno < -80 || gora > cam.vh + 80) return;
            var gr = Math.Max(1, z * 0.09);
            // koniec kikuta: z miejsca cięcia sprężynuje do miejsca, gdzie zawiśnie, i dynda coraz słabiej
            var u = gladko(t / 60);
            var yKonca = cam.toScreenY(lp.ciecie + (lp.koniec - lp.ciecie) * u) + JsM.Sin(t * 0.2) * Math.Exp(-t / 50) * z * 0.25;
            var dynda = JsM.Sin(t * 0.06) * Math.Exp(-t / 500) * z * 0.4 + JsM.Sin(teraz * 0.0017) * z * 0.05;
            var kto = lp.naprawia is double nid ? sim.creatureById(nid) : null;
            var wisi = kto != null && !kto.dead && kto.naprawia != null && kto.naprawia.faza != "schodzi";
            var xKonca = sx + (wisi ? 0 : dynda);
            linaLuk(ctx, sx, gora - z * 0.2, xKonca, yKonca, gr, (xKonca - sx) * 0.3);
            if (!wisi) strzepy(ctx, xKonca, yKonca, z, Math.PI / 2, lp.od);
            // wiadro na dnie (stoi albo roztrzaskane): tu leży albo dochodzi dolny kawałek
            WiadroJedzenia? wd = null;
            foreach (var w in Wiadro.wiadra(sim)) if (w.faza == "stoi" || w.faza == "rozbite" || w.faza == "spada") { wd = w; break; }
            (double x, double y)? kablak = wd != null && wd.faza == "stoi" ? (sx, dno - Math.Max(10, z * 1.6) * 0.95) : null;
            if (wisi && kto != null)
            {
                // dolny kawałek zwisa z jego dłoni do wiadra (albo do dna), a pod dłonią rośnie supeł
                var h = Figury.wysokoscPostaci(kto, z);
                double dx = cam.toScreenX(kto.x), dy = cam.toScreenY(kto.y + 1) - h * 0.85;
                var cel = kablak ?? (sx + z * 0.7, dno - z * 0.08);
                linaLuk(ctx, dx, dy, cel.x, cel.y, gr * 0.9, z * 0.45);
                if (kto.naprawia!.faza == "skleja")
                {
                    var ile = Math.Min(1, (sim.tick - kto.naprawia!.od) / WIADRO.naprawa.sklejanie);
                    supel(ctx, xKonca, yKonca, z, ile);
                }
            }
            else
            {
                // dolny kawałek: przez chwilę spada spod cięcia, potem leży zwinięty obok wiadra
                var spad = gladko(t / 40);
                if (spad < 1)
                {
                    var y0 = cam.toScreenY(lp.ciecie) + (dno - cam.toScreenY(lp.ciecie)) * spad;
                    linaLuk(ctx, sx + z * 0.2, y0, sx + z * 0.5, Math.Min(dno, y0 + z * 1.4), gr * 0.9, z * 0.3);
                }
                else zwojNaDnie(ctx, sx + z * 0.75, dno, z);
            }
            // cięcie: błysk i fruwające włókna
            if (t < 140)
            {
                double cx = sx, cy = cam.toScreenY(lp.ciecie);
                if (t < 24)
                {
                    double a = 1 - t / 24, R = z * (0.6 + t * 0.06);
                    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
                    g.addColorStop(0, Barwa.Rgba(255, 236, 200, 0.9 * a)); g.addColorStop(0.4, Barwa.Rgba(255, 120, 60, 0.5 * a)); g.addColorStop(1, "rgba(200,40,20,0)");
                    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
                }
                for (int i = 0; i < 14; i++)
                {
                    double a = los(lp.od + i * 13) * Math.PI * 2, v = z * (0.02 + 0.03 * los(lp.od + i * 7));
                    double px = cx + JsM.Cos(a) * v * t, py = cy + JsM.Sin(a) * v * t + 0.00018 * z * t * t;
                    ctx.strokeStyle = Barwa.Rgba(190, 150, 96, 0.95 * (1 - t / 140)); ctx.lineWidth = Math.Max(0.6, z * 0.025);
                    var obr = t * 0.12 + i;
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + JsM.Cos(obr) * z * 0.12, py + JsM.Sin(obr) * z * 0.12); ctx.stroke();
                }
            }
        }

        /// <summary>Roztrzaskane wiadro na dnie: rozrzucone klepki, obręcze, rozsypane bochny, pył w pierwszej chwili.</summary>
        static void rozbite(IPlotno ctx, Sim sim, WiadroJedzenia wd, Camera cam)
        {
            double z = cam.zoom, Z = Math.Max(10, z * WIELKOSC);
            double x = cam.toScreenX(wd.x + 0.5), dno = cam.toScreenY(wd.cel + 1);
            if (x < -80 || x > cam.vw + 80 || dno < -40 || dno > cam.vh + 80) return;
            var t = sim.tick - wd.od;
            var rozrzut = gladko(t / 25);
            ctx.save();
            const string obrys = "rgba(16,10,6,0.95)";
            // klepki: odlatują od środka i kładą się na dnie
            for (int i = 0; i < 7; i++)
            {
                double s = (los(wd.id * 11 + i) - 0.5) * 2, dx = s * Z * (0.25 + 0.75 * rozrzut);
                var kat = s * 1.2 * rozrzut + (1 - rozrzut) * 0.1;
                var lez = rozrzut > 0.6 ? 1 : 0;
                ctx.save();
                ctx.translate(x + dx, dno - Z * 0.07 - (1 - rozrzut) * Z * 0.4 * JsM.Sin(rozrzut * Math.PI));
                // Math.sign(s || 1): s == 0 → 1
                ctx.rotate(lez != 0 ? Math.PI / 2 * (s != 0 ? Math.Sign(s) : 1) * 0.9 + s * 0.2 : kat);
                ctx.fillStyle = i % 2 != 0 ? "rgba(130,88,48,1)" : "rgba(96,62,34,1)";
                ctx.strokeStyle = obrys; ctx.lineWidth = Math.Max(0.8, z * 0.04);
                ctx.beginPath(); ctx.rect(-Z * 0.06, -Z * 0.5, Z * 0.12, Z * 0.5); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            // obręcze leżą płasko
            ctx.strokeStyle = "rgba(58,56,56,1)"; ctx.lineWidth = Math.Max(1, z * 0.07);
            foreach (var s in new[] { -0.35, 0.45 }) { ctx.beginPath(); ctx.ellipse(x + s * Z, dno - Z * 0.05, Z * 0.32, Z * 0.07, s * 0.2, 0, Math.PI * 2); ctx.stroke(); }
            // rozsypane jedzenie: tyle bochnów, ile porcji zostało (najwyżej 8)
            var ile = Math.Min(8, wd.porcje);
            for (int i = 0; i < ile; i++)
            {
                var s = (los(wd.id * 23 + i) - 0.5) * 2;
                double px = x + s * Z * 1.1, py = dno - Z * 0.09;
                ctx.fillStyle = i % 3 == 2 ? "rgba(164,74,48,1)" : i % 2 != 0 ? "rgba(176,118,58,1)" : "rgba(196,140,72,1)";
                ctx.strokeStyle = obrys; ctx.lineWidth = Math.Max(0.6, z * 0.03);
                ctx.beginPath(); ctx.ellipse(px, py, Z * 0.14, Z * 0.09, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            // pył w chwili uderzenia
            if (t < 60)
            {
                var a = 1 - t / 60;
                for (int i = 0; i < 9; i++)
                {
                    var s = (los(wd.id * 5 + i) - 0.5) * 2;
                    ctx.fillStyle = Barwa.Rgba(196, 176, 140, 0.5 * a);
                    ctx.beginPath(); ctx.arc(x + s * Z * (0.4 + t * 0.02), dno - Z * 0.1 - t * z * 0.006 * (1 + los(i)), Z * (0.1 + t * 0.004), 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }

        static void lina(IPlotno ctx, double x1, double y1, double x2, double y2, double gr)
        {
            ctx.strokeStyle = LINA_CIEN; ctx.lineWidth = gr + 1.2;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = LINA; ctx.lineWidth = gr;
            ctx.stroke();
            // skręt liny: krótkie skośne kreski co kawałek
            double ddx = x2 - x1, ddy = y2 - y1, dl = Math.Sqrt(ddx * ddx + ddy * ddy);
            if (gr < 1.6 || dl < 4) return;
            ctx.strokeStyle = "rgba(96,70,40,0.8)"; ctx.lineWidth = Math.Max(0.5, gr * 0.3);
            ctx.beginPath();
            var krok = gr * 2.2; var n = (int)Math.Min(200, Math.Floor(dl / krok));
            for (int i = 1; i < n; i++)
            {
                double t = (double)i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
                ctx.moveTo(x - gr * 0.45, y - gr * 0.4); ctx.lineTo(x + gr * 0.45, y + gr * 0.4);
            }
            ctx.stroke();
        }

        static readonly (double fx, double fh, double fr, string barwa)[] KAWALKI = {
            (-0.5, 0.3, 0.32, "rgba(176,118,58,1)"),   // bochen
            (0.35, 0.36, 0.3, "rgba(150,96,46,1)"),
            (-0.05, 0.5, 0.34, "rgba(196,140,72,1)"),
            (0.6, 0.18, 0.2, "rgba(120,132,62,1)"),    // korzeń / zielenina
            (-0.75, 0.12, 0.2, "rgba(164,74,48,1)"),   // rzepa
        };

        /// <summary>Wiadro w układzie: (0,0) = górny środek kafla, z = piksele na kafel.</summary>
        static void kubel(IPlotno ctx, double porcje, double pelne, double z, bool przod = false)
        {
            double gw = z * 0.46, dw = z * 0.36, gy = z * 0.3, dy = z;
            const string obrys = "rgba(16,10,6,0.95)"; var lw = Math.Max(1, z * 0.07);
            // kabłąk
            if (!przod)
            {
                ctx.strokeStyle = "rgba(70,66,64,0.98)"; ctx.lineWidth = Math.Max(1, z * 0.07);
                ctx.beginPath(); ctx.moveTo(-gw * 0.95, gy + z * 0.06); ctx.quadraticCurveTo(0, -z * 0.18, gw * 0.95, gy + z * 0.06); ctx.stroke();
            }
            // jedzenie z wierzchu: im mniej porcji, tym niżej
            var pelno = przod ? 0 : pelne > 0 ? Math.Max(0, Math.Min(1, porcje / pelne)) : 0;
            if (pelno > 0)
            {
                var wys = z * (0.08 + 0.26 * pelno);
                foreach (var (fx, fh, fr, barwa) in KAWALKI)
                {
                    double x = fx * gw, y = gy - wys * (fh / 0.5) * 0.9 + z * 0.04;
                    ctx.fillStyle = barwa; ctx.strokeStyle = obrys; ctx.lineWidth = lw * 0.7;
                    ctx.beginPath(); ctx.ellipse(x, y, fr * gw * 1.1, fr * gw * 0.75, fx * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = "rgba(255,230,170,0.35)";
                    ctx.beginPath(); ctx.ellipse(x - fr * gw * 0.3, y - fr * gw * 0.25, fr * gw * 0.4, fr * gw * 0.22, 0, 0, Math.PI * 2); ctx.fill();
                }
            }
            // klepki
            ctx.beginPath();
            ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.lineTo(dw, dy); ctx.lineTo(-dw, dy); ctx.closePath();
            var g = ctx.createLinearGradient(-gw, 0, gw, 0);
            g.addColorStop(0, "rgba(92,60,34,1)"); g.addColorStop(0.45, "rgba(150,104,58,1)"); g.addColorStop(1, "rgba(70,44,26,1)");
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = obrys; ctx.lineWidth = lw; ctx.stroke();
            if (z >= 9)
            {
                ctx.strokeStyle = "rgba(40,24,12,0.7)"; ctx.lineWidth = Math.Max(0.6, z * 0.025);
                ctx.beginPath();
                foreach (var f in new[] { -0.5, 0, 0.5 }) { ctx.moveTo(f * gw, gy); ctx.lineTo(f * dw, dy); }
                ctx.stroke();
            }
            // żelazne obręcze
            ctx.strokeStyle = "rgba(58,56,56,1)"; ctx.lineWidth = Math.Max(1, z * 0.08);
            foreach (var t in new[] { 0.22, 0.78 })
            {
                double y = gy + (dy - gy) * t, s = gw + (dw - gw) * t;
                ctx.beginPath(); ctx.moveTo(-s, y); ctx.lineTo(s, y); ctx.stroke();
            }
            // brzeg
            ctx.strokeStyle = "rgba(190,150,96,0.9)"; ctx.lineWidth = Math.Max(0.8, z * 0.05);
            ctx.beginPath(); ctx.moveTo(-gw, gy); ctx.lineTo(gw, gy); ctx.stroke();
        }
    }
}
