// Port: alpha-1/src/sim/kruszce.ts
using System;
using Trzewia.Js;
using Trzewia.Nastawy;
using JS = Trzewia.Js.Js;
using System.Collections.Generic;
using static Trzewia.Nastawy.NastawyKruszce;

namespace Trzewia.Symulacja
{
    /// <summary>Świeżo wykuty kruszec — rysunek tylko to czyta; nie trafia do zapisu.</summary>
    public sealed class Urobek
    {
        public double x, y;
        public string rodzaj = "";
        public double ile, tik;
    }

    /// <summary>
    /// KRUSZCE (Alpha, etap 3b) — żelazo i złoto bez ekwipunku: kafel rudy wykuty przez lud od razu podbija
    /// licznik (sim.zelazo, sim.zloto), kronika to odnotowuje („+3 żelaza”), a na krótką listę sim.urobek
    /// trafia znak dla rysunku — skąd ma wylecieć okruch do licznika (render/kruszce.ts).
    /// </summary>
    public static class Kruszce
    {
        /// <summary>Jaki kruszec kryje kafel (albo null, gdy to zwykła skała).</summary>
        public static string? kruszecKafla(double t) => t == T.ORE ? "zelazo" : t == T.ZLOTO ? "zloto" : null;

        /// <summary>Lud wykuł kafel (x, y), który był typu `t` — jeśli to ruda, licznik rośnie od razu.</summary>
        public static void wykutyKafel(Sim sim, double t, double x, double y)
        {
            var rodzaj = kruszecKafla(t);
            if (rodzaj == null) return;
            var K = KRUSZCE;
            var ile = rodzaj == "zelazo" ? K.zelazoZaKafel : K.zlotoZaKafel;
            if (rodzaj == "zelazo") sim.zelazo += ile; else sim.zloto += ile;
            var u = sim.urobek;
            while (u.Count > 0 && (u.Count >= K.urobekMaks || sim.tick - u[0].tik > K.urobekTikow)) u.RemoveAt(0);
            u.Add(new Urobek { x = x, y = y, rodzaj = rodzaj, ile = ile, tik = sim.tick });
            // kronika sumuje urobek z krótkiego okna w jeden wpis
            var nazwa = rodzaj == "zelazo" ? "żelaza" : "złota";
            sim.gdzie(x + 0.5, y + 0.5).log($"Robotnicy wykuli kruszec: +{JS.S(ile)} {nazwa}.", "swiat",
                "urobek-" + rodzaj, n => $"Robotnicy wykuli kruszec: +{JS.S(n * ile)} {nazwa}.");
        }
    }
}
