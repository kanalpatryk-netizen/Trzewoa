// Port: alpha-1/src/sim/cechy.ts
using System;
using Trzewia.Js;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyCechy;

namespace Trzewia.Symulacja
{
    /// <summary>Cechy nacji (v4.1 beta) — odczyt mnożników i losowanie przy narodzinach nacji. Liczby: Nastawy/Cechy.cs.</summary>
    public static class CechyNacji
    {
        static Dictionary<string, Cecha>? poId;
        static Dictionary<string, Cecha> PO_ID
        {
            get
            {
                if (poId != null) return poId;
                poId = new Dictionary<string, Cecha>();
                foreach (var c in CECHY) poId[c.id] = c;   // jak new Map(CECHY.map(...)) — ostatnia wygrywa
                return poId;
            }
        }

        /// <summary>Cecha nacji — albo „bez cechy” (ludzie, stare zapisy, nieznana nazwa).</summary>
        public static Cecha cechaNacji(Clan? k) =>
            k?.cecha != null && k.cecha.Length > 0 && PO_ID.TryGetValue(k.cecha, out var c) ? c : BEZ_CECHY;

        /// <summary>Losuje cechę dla nowej nacji tej rasy (`los(n)` daje liczbę 0..n-1) albo nic.</summary>
        public static string? losujCeche(double rasa, Func<double, double> los)
        {
            if (!CECHY_RASY.TryGetValue((int)rasa, out var pula) || pula == null || pula.Length == 0) return null;
            return pula[(int)los(pula.Length)];
        }
    }
}
