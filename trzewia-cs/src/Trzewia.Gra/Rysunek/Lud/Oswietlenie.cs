// Port: alpha-1/src/render/lud/oswietlenie.ts
using System;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyMrok;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek.Lud
{
    /// <summary>
    /// Światło otoczenia na postaci ludu: skąd pada najbliższe cudze światło — świece i dzień nad ołtarzem,
    /// lampa siedziby, ogień kuźni, świeca warsztatu, obóz, lampka sąsiada. Od tej strony sylwetka dostaje
    /// ciepłą krawędź, więc postać stoi w tym samym świetle co skała wokół.
    /// Własna lampka się nie liczy — świeci z miejsca postaci, z każdej strony po równo.
    /// </summary>
    public sealed class SwiatloOtoczenia
    {
        /// <summary>kierunek do światła na ekranie (jednostkowy, y w dół)</summary>
        public double x, y;
        /// <summary>0..1</summary>
        public double sila;
        public double[] barwa = { 255, 204, 136 };
    }

    public static class Oswietlenie
    {
        static readonly double[] SWIECA = { 255, 204, 136 }, OGIEN = { 255, 150, 72 }, DZIEN = { 255, 234, 190 };

        static SwiatloOtoczenia? biezace;

        /// <summary>Światło postaci rysowanej właśnie na mapie; null — portret w interfejsie (bez światła otoczenia).</summary>
        public static void ustawSwiatlo(SwiatloOtoczenia? s) { biezace = s; }
        public static SwiatloOtoczenia? swiatloOtoczenia() => biezace;

        /// <summary>
        /// Suma świateł w zasięgu, ważona spadkiem (1 − d/R)²: kierunek i barwa. `wys` — wysokość sylwetki w kaflach
        /// (światło liczymy do piersi, nie do stóp). Bez światła w pobliżu — null.
        /// </summary>
        public static SwiatloOtoczenia? swiatloDla(Sim sim, Creature c, double wys)
        {
            var S = MROK.swiatlo; var w = sim.world;
            double cx = c.x, cy = c.y + 1 - wys * 0.55;
            double vx = 0, vy = 0, r = 0, g = 0, b = 0, waga = 0;
            void dodaj(double x, double y, double R, double[] barwa, double moc = 1)
            {
                double dx = x - cx, dy = y - cy, d = JS.Hypot(dx, dy);
                if (d >= R || d < 0.35) return;
                var f = (1 - d / R) * (1 - d / R) * moc;
                vx += (dx / d) * f; vy += (dy / d) * f;
                r += barwa[0] * f; g += barwa[1] * f; b += barwa[2] * f; waga += f;
            }
            // lampa siedziby wisi nad gniazdem, nie leży na podłodze
            foreach (var k in sim.clans) if (!k.dead && k.pop > 0) dodaj(k.hx + 0.5, k.hy - 2, S.siedziba * 0.8, SWIECA, 0.8);
            if (w.salaOltarza.x1 >= 0) dodaj(w.oltarz.x + 0.5, w.oltarz.y - 0.6, S.oltarz * 1.6, DZIEN, 1.1);
            foreach (var p in sim.pomieszczenia)
            {
                if (!p.gotowe || !S.pomieszczenia.TryGetValue(p.rodzaj, out var z) || !JS.Tak(z)) continue;
                var ogien = p.rodzaj == "kuznia";
                dodaj(p.x + p.w / 2, p.y + p.h * 0.6, Math.Max(p.w, p.h) / 2 + z, ogien ? OGIEN : SWIECA, ogien ? 1.2 : p.rodzaj == "sypialnia" ? 0.4 : 0.8);
            }
            foreach (var o in sim.lud.obozy) dodaj(o.x + 0.5, o.y + 0.5, S.oboz, SWIECA, 0.8);
            // lampka sąsiada (robotnicy noszą oliwne lampki) — słabsza, za to blisko
            foreach (var o in sim.creatures)
            {
                if (ReferenceEquals(o, c) || o.dead || Symulacja.Lud.rolaPostaci(o) != "robotnik") continue;
                if (Math.Abs(o.x - cx) > 4 || Math.Abs(o.y - c.y) > 4) continue;
                dodaj(o.x, o.y + 1 - wys * 0.5, 3.6, SWIECA, 0.55);
            }
            var dl = JS.Hypot(vx, vy);
            if (waga < 0.04 || dl < 0.03) return null;
            var sila = Math.Min(1, dl * 1.5);
            // światło spod nóg wyglądałoby jak żarząca się podłoga — co najwyżej z boku, raczej z góry
            vx /= dl; vy /= dl;
            if (vy > -0.3) { vy = -0.3; dl = JS.Hypot(vx, vy); vx /= dl; vy /= dl; }
            return new SwiatloOtoczenia { x = vx, y = vy, sila = sila, barwa = new[] { r / waga, g / waga, b / waga } };
        }
    }
}
