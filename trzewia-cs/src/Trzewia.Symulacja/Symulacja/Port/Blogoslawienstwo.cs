// Port: alpha-1/src/sim/blogoslawienstwo.ts
using System;
using Trzewia.Js;
using Trzewia.Nastawy;
using System.Linq;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Symulacja.Lud;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// Modlitwa za innych (6.11, decyzja użytkownika). Pobożny, który się modli — na rozkaz „Módl się za innych”, przy
    /// obozie, przy ołtarzu albo w krypcie pod pomnikiem — błogosławi swoich w promieniu: rany się goją, a każdy dostaje
    /// dar swojej roli na chwilę po wyjściu z kręgu. Siebie nie błogosławi. Liczby — BLOGOSLAWIENSTWO.
    /// </summary>
    public static class Blogoslawienstwo
    {
        /// <summary>Czy ten pobożny modli się teraz za innych (jego krąg błogosławi).</summary>
        public static bool modliSieZaInnych(Sim sim, Creature c)
        {
            if (c.dead || rolaPostaci(c) != "pobozny") return false;
            var p = c.polecenie;
            if (p?.zaklinaj == true) return false;
            if (p?.zaInnych == true) return p.na != null;
            var w = sim.world;
            if (c.job == Job.PIELGRZYM) return Math.Abs(c.x - w.coreX) < PIELGRZYMKA.przedsionekX && Math.Abs(c.y - w.przedsionekY) < PIELGRZYMKA.przedsionekY;
            return c.modliPrzyObozie == true || c.job == Job.PRAY;
        }

        /// <summary>Tik błogosławieństwa: co `B.co` tików każdy z ludu w kręgu modlącego się pobożnego leczy się i dostaje dar.</summary>
        public static void tikBlogoslawienstwa(Sim sim)
        {
            var B = BLOGOSLAWIENSTWO;
            if (sim.tick % B.co != 0) return;
            var zrodla = sim.creatures.Where(c => modliSieZaInnych(sim, c)).ToList();
            if (zrodla.Count == 0) return;
            foreach (var o in sim.creatures)
            {
                if (o.dead || rolaPostaci(o) == null) continue;
                Creature? best = null; var bd = double.PositiveInfinity;
                foreach (var s in zrodla)
                {
                    if (s == o) continue;
                    var d = JS.Hypot(s.x - o.x, s.y - o.y);
                    if (d <= B.promien && d < bd) { bd = d; best = s; }
                }
                if (best == null) continue;
                var max = maxHp(sim, o);
                if (o.hp < max) o.hp = Math.Min(max, o.hp + B.leczenie * B.co / 120);
                if (o.blogDo == null || sim.tick >= o.blogDo) sim.efekt(o.x, o.y - 0.8, "mysl", "błogosławiony");
                o.blogDo = sim.tick + B.trwa;
                o.blogOd = best.id;
                o.blogT = sim.tick;
            }
        }
    }
}
