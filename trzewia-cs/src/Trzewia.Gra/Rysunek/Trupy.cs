// Port: alpha-1/src/render/trupy.ts — trupy ludu. Sylwetka: klatka „spi” duszka zmarłego zamiast rysunku kodem.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek.Duszki;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek
{
    /// <summary>
    /// Remake v2: trupy ludu (logika: sim/trupy.ts). Ta sama postać, co za życia — te same barwy
    /// i strój (z numeru zmarłego) — ale leży, z zamkniętymi oczami, wyblakła i przygaszona,
    /// z ciemną plamą pod sobą. Każdy trup rysuje się raz do małego płótna i jest tylko wklejany.
    /// (Klasa nazywa się RysTrupy, bo Trupy to moduł symulacji.)
    /// </summary>
    public static class RysTrupy
    {
        sealed class Szkic { public IPlotno p = null!; public string klucz = ""; }
        static readonly Dictionary<double, Szkic> szkice = new Dictionary<double, Szkic>();

        public static void rysujTrupy(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var trupy = sim.lud.trupy;
            if (trupy == null || trupy.Count == 0)
            {
                if (szkice.Count > 0) { foreach (var s in szkice.Values) s.p.Dispose(); szkice.Clear(); }
                return;
            }
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double right = left + cam.vw / z, bottom = top + cam.vh / z;
            var t0 = ctx.getTransform();
            var skala = Math.Max(1, Math.Min(3, JS.Hypot(t0.a, t0.b)));
            var zywe = new HashSet<double>();
            // Alpha, etap 3d: wskrzeszany blednie w miejscu, gdzie leży — jego iskry płyną do ołtarza (render/oltarz.ts)
            var r = Oltarz.rytualOltarza(sim);
            double? wskrzeszany = r != null && r.rodzaj == "wskrzeszenie" ? r.cel : null;
            var blednie = r != null && wskrzeszany != null ? Math.Min(1, Math.Max(0, (sim.tick - r.od) / Math.Max(1, r.@do - r.od) / 0.6)) : 0;
            foreach (var t in trupy)
            {
                zywe.Add(t.id);
                if (t.x < left - 3 || t.x > right + 3 || t.y < top - 3 || t.y > bottom + 3) continue;
                var h = Math.Max(16, Races.RACES[Race.GOBLIN].size * z * 1.9 * ustawienia.wielkoscSylwetek) * (t.rola == "rycerz" ? 1.3 : 1);
                double sx = cam.toScreenX(t.x), sy = cam.toScreenY(t.y + 1);
                // kałuża krwi pod ciałem: ciemna, nieregularna, z jaśniejszym połyskiem (dawniej szara plama)
                // szersza niż ciało — widać ją spod stóp tych, którzy stoją obok
                var glowa = -t.face;
                ctx.fillStyle = "rgba(92,10,7,0.8)";
                ctx.beginPath();
                ctx.ellipse(sx + glowa * h * 0.2, sy - 1, h * 0.78, h * 0.085, 0, 0, Math.PI * 2);
                ctx.ellipse(sx + glowa * h * 0.75, sy - 1, h * 0.32, h * 0.065, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "rgba(176,60,44,0.45)";
                ctx.beginPath(); ctx.ellipse(sx + glowa * h * 0.55, sy - 1.5, h * 0.18, h * 0.022, 0, 0, Math.PI * 2); ctx.fill();
                double w = h * 1.5, wys = h * 0.8, oy = wys * 0.62;
                var klucz = JS.S(JS.Round(h)) + "|" + JS.S(skala);
                if (!szkice.TryGetValue(t.id, out var sz) || sz.klucz != klucz)
                {
                    int pw = (int)Math.Ceiling(w * skala), ph = (int)Math.Ceiling(wys * skala);
                    var p = sz?.p ?? Plotno.Nowe(pw, ph);
                    p.width = pw; p.height = ph;
                    var g = p;
                    g.setTransform(skala, 0, 0, skala, (w / 2) * skala, oy * skala);
                    g.scale(t.face, 1);
                    // leżąca poza („śpi”) układa się w lewo od stóp — przesunięcie kładzie ciało na środku
                    g.translate(h * 0.95, h * 0.04);
                    // duszek zmarłego: ten sam wzór co za życia (numer, hełm robotnika); zbroi z kuźni trup nie nosi
                    var d = Duszek.Daj(DuszkiLudu.nazwaDuszka(t.rola, t.id, t.helm == true, 0));
                    if (d?.Animacja("spi") is { } spi) d.Rysuj(g, spi.Klatka(0), h, false);
                    // śmierć: przygaszone, ziemiste barwy — ciało, nie duch (dawniej szara mgiełka czytała się jak zjawa)
                    g.setTransform(1, 0, 0, 1, 0, 0);
                    g.globalCompositeOperation = "source-atop";
                    g.fillStyle = "rgba(34,26,22,0.32)";
                    g.fillRect(0, 0, p.width, p.height);
                    g.globalCompositeOperation = "source-over";
                    sz = new Szkic { p = p, klucz = klucz };
                    szkice[t.id] = sz;
                }
                if (t.id == wskrzeszany) ctx.globalAlpha = 1 - blednie;
                ctx.drawImage(sz.p, sx - w / 2, sy - oy, w, wys);
                ctx.globalAlpha = 1;
            }
            List<double>? zbedne = null;
            foreach (var id in szkice.Keys) if (!zywe.Contains(id)) (zbedne ??= new List<double>()).Add(id);
            if (zbedne != null) foreach (var id in zbedne) { szkice[id].p.Dispose(); szkice.Remove(id); }
        }
    }
}
