// Port: alpha-1/src/render/zegar-gry.ts
using System;
using Trzewia.Symulacja;

namespace Trzewia.Rysunek
{
    /// <summary>
    /// Tik gry z ułamkiem — do płynnych animacji zgranych z symulacją (120 tików na sekundę, a ekran rysuje 60–144 klatek):
    /// między tikami ułamek rośnie z zegarem ekranu, w tempie ostatnio widzianych tików. Gdy gra stoi, ułamek staje na 1.
    /// </summary>
    public static class ZegarGry
    {
        static Sim? simOst;
        static double tikOst, czasOst, msNaTik = 1000.0 / 120;

        public static double tikZUlamkiem(Sim sim, double czas)
        {
            if (!ReferenceEquals(sim, simOst)) { simOst = sim; tikOst = sim.tick; czasOst = czas; }
            if (sim.tick != tikOst)
            {
                var d = sim.tick - tikOst;
                if (d > 0 && d < 60 && czas > czasOst) msNaTik = Math.Max(1, Math.Min(120, msNaTik * 0.75 + ((czas - czasOst) / d) * 0.25));
                tikOst = sim.tick; czasOst = czas;
            }
            return sim.tick + Math.Max(0, Math.Min(1, (czas - czasOst) / msNaTik));
        }
    }
}
