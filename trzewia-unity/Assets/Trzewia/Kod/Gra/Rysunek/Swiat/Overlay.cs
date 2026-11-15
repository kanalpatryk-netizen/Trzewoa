// Port: alpha-1/src/render/overlay.ts — cząstki świata (krew, modlitwa, żar, zarodniki, błyski, kurz) i imiona stworzeń.
using System;
using Trzewia.Plotna;
using Trzewia.Symulacja;

namespace Trzewia.Rysunek
{
    public static class Overlay
    {
        /// <summary>Śmierć to plama, która wsiąka w skałę. Widzisz, jak się karmisz swoimi.</summary>
        public static void drawParticles(IPlotno ctx, Sim sim, Camera cam)
        {
            var z = cam.zoom;
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            foreach (var p in sim.particles)
            {
                double sx = (p.x - left) * z, sy = (p.y - top) * z;
                if (sx < -8 || sy < -8 || sx > cam.vw + 8 || sy > cam.vh + 8) continue;
                var k = 1 - p.life / p.max;
                Barwa col;
                var r = Math.Max(0.8, z * 0.09);
                switch (p.kind)
                {
                    case PK.BLOOD: col = Barwa.Rgba(140, 30, 26, 0.75 * k); r *= 1.5; break;
                    case PK.PRAY: col = Barwa.Rgba(226, 214, 190, 0.35 * k); r *= 2.2; break;
                    case PK.EMBER: col = Barwa.Rgba(255, Js.Js.ToInt32(140 + 80 * k), 60, 0.85 * k); break;
                    case PK.SPORE: col = Barwa.Rgba(140, 190, 110, 0.5 * k); break;
                    case PK.GLINT: col = Barwa.Rgba(240, 238, 248, 0.9 * k); break;
                    default: col = Barwa.Rgba(214, 200, 172, 0.30 * k); r *= 0.7; break;   // kurz
                }
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }
        }

        /// <summary>Celownik imienia: „Szepnąłeś Żwirowi”, nie „Szepnąłeś Żwir”.</summary>
        public static string creatureNameCelownik(Creature c)
        {
            var n = creatureName(c);
            if (n.EndsWith("ica")) return n.Substring(0, n.Length - 1) + "y";        // Sadzica → Sadzicy
            if (n.EndsWith("ra")) return n.Substring(0, n.Length - 2) + "rze";       // Iskra → Iskrze
            if (n.EndsWith("a")) return n.Substring(0, n.Length - 1) + "ie";         // Węglawa → Węglawie
            if (n.EndsWith("ek")) return n.Substring(0, n.Length - 2) + "kowi";      // Krzemek → Krzemkowi
            return n + "owi";                                                        // Żwir → Żwirowi
        }

        static readonly string[] A = { "Krzem", "Ług", "Mirg", "Osad", "Pęk", "Sadz", "Trzop", "Węgl", "Zgrzyt", "Iskra", "Murk", "Chrzest", "Łom", "Żwir" };
        static readonly string[] B = { "", "ek", "ica", "ur", "ot", "yn", "awa" };

        public static string creatureName(Creature c) =>
            A[(int)(c.id % A.Length)] + B[(int)((c.id * 5 + Js.Js.ToInt32(c.id / B.Length)) % B.Length)];
    }
}
