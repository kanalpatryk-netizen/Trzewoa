// Port: alpha-1/src/render/lud/odmowa.ts
using System.Runtime.CompilerServices;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPolecenia;

namespace Trzewia.Rysunek.Lud
{
    /// <summary>
    /// Alpha, etap 2: odmowa rozkazu na ekranie — postać kręci głową, macha dłonią „nie” i rozkłada ręce
    /// (bez dymka z powodem — w miejscu rozkazu miga czerwony krzyżyk, render/druzyna.ts). Liczona zegarem ekranu, nie tikami:
    /// rozkaz wydany w pauzie też dostaje odpowiedź od razu.
    /// </summary>
    public static class Odmowy
    {
        /// <summary>Ile trwa odmowa na ekranie (ms).</summary>
        public const double ODMOWA_MS = 2600;

        // WeakMap<Odmowa, number> z TS
        static readonly ConditionalWeakTable<Odmowa, StrongBox<double>> poczatek = new ConditionalWeakTable<Odmowa, StrongBox<double>>();

        /// <summary>Postęp odmowy 0…1 albo null, gdy postać teraz nie odmawia.</summary>
        public static double? postepOdmowy(Sim sim, Creature c, double czas)
        {
            var o = c.odmowa;
            if (o == null) return null;
            // stara odmowa (sprzed wczytania gry albo zza kadru) nie wraca po minucie
            if (sim.tick - o.od > POLECENIA.odmowaTikow) return null;
            if (!poczatek.TryGetValue(o, out var t0)) { t0 = new StrongBox<double>(czas); poczatek.Add(o, t0); }
            var k = (czas - t0.Value) / ODMOWA_MS;
            return k >= 0 && k < 1 ? k : (double?)null;
        }
    }
}
