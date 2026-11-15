// Port: alpha-1/src/sim/trupy.ts
using System;
using Trzewia.Js;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using static Trzewia.Nastawy.NastawyLud;

namespace Trzewia.Symulacja
{
    public sealed class Trup
    {
        /// <summary>id zmarłego — rysunek bierze z niego te same barwy i warianty stroju</summary>
        public double id;
        public double x;
        /// <summary>kafel, na którym leży (pod nim podłoga)</summary>
        public double y;
        public string rola = "pobozny";
        public double face;
        /// <summary>tik śmierci</summary>
        public double od;
        public bool? okaleczony;
        public bool? helm;
    }

    /// <summary>
    /// TRUPY (Remake v2) — kto z ludu umrze, nie znika: jego ciało leży na ziemi tam, gdzie padł
    /// (spada na najbliższą podłogę). Wyjątek: zabrani przez ciemność i przez dłoń z otchłani —
    /// ich nie ma. Najstarsze trupy, gdy jest ich za dużo, rozsypują się w kości.
    /// </summary>
    public static class Trupy
    {
        /// <summary>Śmierci, po których nie zostaje ciało.</summary>
        static readonly HashSet<string> BEZ_CIALA = new HashSet<string> { "otchlan" };

        /// <summary>Wołane z sim.kill: zostawia ciało postaci ludu. Zwraca true, gdy ciało zostało.</summary>
        public static bool zostawTrupa(Sim sim, Creature c, string tag)
        {
            if (c.race != Race.GOBLIN || c.straznik == true || BEZ_CIALA.Contains(tag)) return false;
            var w = sim.world;
            var x = Math.Max(0, Math.Min(w.w - 1, Math.Floor(c.x)));
            var y = Math.Max(0, Math.Min(w.h - 2, Math.Floor(c.y)));
            // w ścianie (przysypany) — najbliższa pustka w górę
            for (var k = 0; k < 6 && !w.passable(x, y); k++) y--;
            if (!w.passable(x, y)) return false;
            // ciało spada na najbliższą podłogę (nie dalej niż kawał w dół)
            for (var k = 0; k < 40 && y + 1 < w.h && w.passable(x, y + 1) && w.magma[w.idx(x, y + 1)] == 0; k++) y++;
            if (w.magma[w.idx(x, y)] > 0) return false;       // w ogień — nic nie zostaje
            var trupy = sim.lud.trupy ??= new List<Trup>();
            trupy.Add(new Trup
            {
                id = c.id, x = x + 0.5 + Math.Max(-0.3, Math.Min(0.3, c.x - x - 0.5)), y = y, rola = c.rola ?? "pobozny",
                face = c.face >= 0 ? 1 : -1, od = sim.tick, okaleczony = c.okaleczony, helm = c.helm,
            });
            // za dużo — najstarszy rozsypuje się w kości
            while (trupy.Count > LUD.trupyMax)
            {
                var t = trupy[0]; trupy.RemoveAt(0);
                var tx = Math.Floor(t.x);
                if (w.inb(tx, t.y) && w.get(tx, t.y) == T.AIR) w.set(tx, t.y, T.BONES);
            }
            return true;
        }

        /// <summary>Trupy, które jeszcze leżą (bez tych, pod którymi wykopano podłogę — spadają niżej).</summary>
        public static void tikTrupow(Sim sim)
        {
            var trupy = sim.lud.trupy;
            if (trupy == null || trupy.Count == 0 || sim.tick % 60 != 0) return;
            var w = sim.world;
            foreach (var t in trupy)
            {
                var x = Math.Floor(t.x);
                for (var k = 0; k < 40 && t.y + 1 < w.h && w.passable(x, t.y + 1) && w.magma[w.idx(x, t.y + 1)] == 0; k++) t.y++;
            }
            sim.lud.trupy = trupy.Where(t => w.passable(Math.Floor(t.x), t.y) && w.magma[w.idx(Math.Floor(t.x), t.y)] == 0).ToList();
        }
    }
}
