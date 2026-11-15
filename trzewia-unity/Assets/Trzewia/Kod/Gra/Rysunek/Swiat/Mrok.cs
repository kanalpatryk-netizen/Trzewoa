// Port: alpha-1/src/render/mrok.ts — ciemność w górze: świat jest widoczny tylko w świetle lampek robotników, aureol
// pobożnych, siedziby, obozów, rdzenia i Cudu. Reszta tonie w mroku (pamięć zostaje, tylko przygaszona). Liczona
// w mniejszej rozdzielczości (MROK.skala) na osobnym płótnie: czerń, z której plamy światła wycinają („destination-out”).
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyMrok;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek mroku (RysMrok — bo Mrok to nastawy).</summary>
    public static class RysMrok
    {
        static IPlotno? warstwa;
        static IPlotno? plamka;
        /// <summary>Kiedy (czas klatki) mrok narysowano ostatnio — warstwę z innej klatki pomija się (schody).</summary>
        static double narysowanyT = double.NaN;

        /// <summary>
        /// Warstwa mroku tej klatki (płótno w skali `k` ekranu) — to, co po mroku rysuje się z powrotem na świat (słup
        /// i stopnie schodów kręconych przed postacią), ciemnieje nią tak samo. Null — w tej klatce mroku nie ma.
        /// </summary>
        public static (IPlotno plotno, double k)? warstwaMroku(double teraz) =>
            warstwa != null && narysowanyT == teraz ? (warstwa, MROK.skala) : ((IPlotno, double)?)null;

        /// <summary>Miękka plama światła: biała w środku, wygasa ku brzegom. Rysowana „destination-out” wycina ciemność.</summary>
        static IPlotno plamaSwiatla()
        {
            if (plamka != null) return plamka;
            var c = Plotno.Nowe(128, 128);
            var gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, "rgba(255,255,255,1)");
            gr.addColorStop(0.45, "rgba(255,255,255,0.85)");
            gr.addColorStop(0.75, "rgba(255,255,255,0.35)");
            gr.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = gr;
            c.fillRect(0, 0, 128, 128);
            return plamka = c;
        }

        public static void rysujMrok(IPlotno ctx, Sim sim, Camera cam, double teraz, bool pauza)
        {
            if (!MROK.wlaczony) return;
            // tryb deweloperski: „bez ciemności” — mrok działa, tylko go nie widać
            if (Symulacja.Dziennik.DEV.bezMroku && ustawienia.trybDeweloperski) return;
            var k = MROK.skala;
            int W = (int)Math.Max(1, Math.Ceiling(cam.vw * k)), H = (int)Math.Max(1, Math.Ceiling(cam.vh * k));
            warstwa ??= Plotno.Nowe(W, H);
            if (warstwa.width != W || warstwa.height != H) { warstwa.width = W; warstwa.height = H; }
            var g = warstwa;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = "source-over";
            g.globalAlpha = 1;
            g.clearRect(0, 0, W, H);
            // suwak jasności rozjaśnia też mrok
            var ciemnosc = (pauza ? MROK.ciemnoscPauza : MROK.ciemnosc) / Math.Max(1, ustawienia.jasnosc);
            g.fillStyle = Barwa.Rgba(6, 3, 2, ciemnosc);
            g.fillRect(0, 0, W, H);
            // 6.11: loch, przedproże i komnata z kotłem — mrok gęstszy (granatowo-brązowy, nie czarny), światło tylko z ognia
            if (MROK.gesty > 0)
            {
                g.fillStyle = Barwa.Rgba(10, 7, 6, MROK.gesty / Math.Max(1, ustawienia.jasnosc * 0.8));
                var rozmycie = Math.Max(1.5, cam.zoom * k * 1.1);
                g.filter = $"blur({Js.Js.ToFixed(rozmycie, 1)}px)";
                g.beginPath();
                foreach (var r in RysLoch.gestyMrok(sim))
                {
                    double x0 = cam.toScreenX(r.x0) * k, y0 = cam.toScreenY(r.y0) * k, x1 = cam.toScreenX(r.x1 + 1) * k, y1 = cam.toScreenY(r.y1 + 1) * k;
                    if (x1 < -rozmycie || y1 < -rozmycie || x0 > W + rozmycie || y0 > H + rozmycie) continue;
                    g.rect(x0, y0, x1 - x0, y1 - y0);
                }
                g.fill();
                g.filter = "none";
            }
            g.globalCompositeOperation = "destination-out";
            var spr = plamaSwiatla();
            var z = cam.zoom * k;
            var S = MROK.swiatlo;
            void swiec(double x, double y, double r, double sila = 1)
            {
                var R = r * z;
                double sx = cam.toScreenX(x) * k, sy = cam.toScreenY(y) * k;
                if (sx + R < 0 || sy + R < 0 || sx - R > W || sy - R > H) return;
                g.globalAlpha = Math.Max(0, Math.Min(1, sila));
                g.drawImage(spr, sx - R, sy - R, R * 2, R * 2);
            }

            var w = sim.world;
            var klan = Symulacja.Lud.klanLudu(sim);
            if (klan != null) swiec(klan.hx + 0.5, klan.hy + 0.5, S.siedziba * (0.96 + 0.06 * Fresk.migotLampy(teraz)));
            foreach (var o in sim.lud.obozy) swiec(o.x + 0.5, o.y + 0.5, S.oboz);
            foreach (var s in sim.lud.spizarnie) swiec(s.x + 0.5, s.y + 0.5, S.oboz * 0.8);
            // wiadro z jedzeniem świeci ciepło (pełne mocniej) — widać je w ciemności
            foreach (var wd in Wiadro.wiadra(sim)) if (wd.faza != "zapowiedz") swiec(wd.x + 0.5, wd.y + 0.3, S.oboz * (wd.porcje > 0 ? 0.75 : 0.4));
            swiec(w.coreX + 0.5, w.coreY + 0.5, S.rdzen);
            // Alpha, etap 3d: świece na ołtarzu i smuga światła dziennego z szybu nad nim
            if (w.salaOltarza.x1 >= 0)
            {
                var o = w.oltarz;
                swiec(o.x + 0.5, o.y - 0.6, (Oltarz.rytualOltarza(sim) != null ? S.rytual : S.oltarz) * (0.96 + 0.06 * Fresk.migotLampy(teraz + 3331)));
                // światło wpada z góry: z rozety katedry albo, bez katedry, z wylotu szybu
                var kat = Katedra.ukladKatedry(w);
                if (kat != null)
                {
                    swiec(kat.rozeta.x, kat.rozeta.y, S.rozeta, 0.95);
                    for (var y = kat.rozeta.y + 1.2; y < kat.posadzka; y += 1.4) swiec(kat.cx, y, S.smugaGora * 1.15, 0.8);
                    foreach (var p in kat.plomienie) swiec(p.x, p.y, S.swieca * (0.95 + 0.07 * Fresk.migotLampy(teraz + p.x * 311)), 0.9);
                }
                for (var y = kat != null ? kat.posadzka : World.SURFACE_Y + 0.5; y < w.szybDol; y += 1.6) swiec(w.szybX + 0.5, y, S.smugaGora, 0.75);
                // …a z jego wylotu smuga rozchodzi się na ołtarz
                var dy = o.y - w.szybDol;
                for (double kk = 0; kk <= dy; kk += 1.6)
                {
                    var f = kk / Math.Max(1, dy);
                    swiec(w.szybX + 0.5 + (o.x - w.szybX) * f, w.szybDol + kk, S.smugaGora + (S.smugaDol - S.smugaGora) * f, 0.75);
                }
                // węższym szybem, którym zjeżdża wiadro, dnia wpada mniej
                var wx = w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer / 2;
                for (var y = World.SURFACE_Y + 0.5; y <= w.szybWiadraDol; y += 1.4) swiec(wx, y, S.szybWiadra, 0.4);
            }
            // latarnia konwoju z jedzeniem — świeci, gdy wóz jedzie albo stoi przy koźle
            var lat = Konwoj.latarniaKonwoju(sim, x => World.SURFACE_Y - Grzbiet.wysokoscGrzbietu(w, x));
            if (lat != null) swiec(lat.Value.x, lat.Value.y, S.latarnia * (0.95 + 0.07 * Fresk.migotLampy(teraz + 4127)));
            foreach (var e in sim.efekty) if (e.rodzaj == "cud") swiec(e.x, e.y, S.cud * (1 - e.t / e.max * 0.5));
            // 6.11: kocioł, pochodnie przy bramie, kosze ognia w lochu, runy bramy
            RysLoch.swiatlaLochu(sim, swiec, teraz);
            // jasna sala: cała w świetle, nie tylko krąg wokół ołtarza — to tu lud odpoczywa i tu wraca
            var so = w.salaOltarza;
            if (so.x1 >= 0)
            {
                var cy = (so.y0 + so.y1) / 2 + 1;
                for (var x = so.x0 + 3; x <= so.x1 - 2; x += S.salaKrok) swiec(x + 0.5, cy, S.sala);
            }
            // gotowe pomieszczenia: kuźnia jaśnieje ogniem, warsztat świecą, sypialnia ledwo (korytarz i szyb — nic)
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe || !S.pomieszczenia.TryGetValue(p.rodzaj, out var zp) || zp == 0) continue;
                var r = Math.Max(p.w, p.h) / 2 + zp;
                var migotP = p.rodzaj == "kuznia" && !ustawienia.ograniczRuch ? 0.94 + 0.08 * Fresk.migotLampy(teraz + p.id * 613) : 1;
                swiec(p.x + p.w / 2, p.y + p.h / 2, r * migotP, p.rodzaj == "sypialnia" ? 0.75 : 1);
            }

            foreach (var c in sim.creatures)
            {
                if (c.dead || c.straznik == true) continue;
                var r = Symulacja.Lud.rolaPostaci(c);
                if (r == null) continue;
                var pr = r == "robotnik" ? S.robotnik : r == "rycerz" ? S.rycerz
                    : (c.job == Job.PRAY || c.job == Job.PIELGRZYM || c.modliPrzyObozie == true) ? S.pobozny_modli : S.pobozny;
                var migot = 0.92 + 0.1 * Fresk.migotLampy(teraz + c.id * 977);
                swiec(c.x + 0.5, c.y + 0.5, pr * migot);
            }
            g.globalAlpha = 1;
            g.globalCompositeOperation = "source-over";
            ctx.drawImage(warstwa, 0, 0, cam.vw, cam.vh);
            narysowanyT = teraz;
            // żar kuźni na ścianach: ciepła, pomarańczowa poświata nad mrokiem (drga razem z ogniem)
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe || p.rodzaj != "kuznia") continue;
                var R = MROK.zarKuzniPromien * cam.zoom;
                double sx = cam.toScreenX(p.x + p.w / 2), sy = cam.toScreenY(p.y + p.h * 0.7);
                if (sx + R < 0 || sy + R < 0 || sx - R > cam.vw || sy - R > cam.vh) continue;
                var a = MROK.zarKuzni * (ustawienia.ograniczRuch ? 1 : 0.9 + 0.12 * Fresk.migotLampy(teraz + p.id * 613));
                var gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
                gr.addColorStop(0, Barwa.Rgba(255, 128, 48, a));
                gr.addColorStop(0.5, Barwa.Rgba(220, 90, 30, a * 0.4));
                gr.addColorStop(1, "rgba(160,50,20,0)");
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = gr;
                ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
                ctx.restore();
            }
        }
    }
}
