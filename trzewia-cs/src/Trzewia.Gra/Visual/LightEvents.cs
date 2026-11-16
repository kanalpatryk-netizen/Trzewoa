// Oprawa walki, etap 1: światło reaguje na zdarzenia. LightEvents.Flash(barwa, siła, ms) — krótki błysk na całej płycie
// albo wokół miejsca w świecie. Rysuje go warstwa światła (Visual/SwiatloOprawy.cs) w trybie „screen”; siła maleje
// z kwadratem czasu. Bez alokacji: stała pula błysków, nowy zajmuje wolne miejsce albo najstarsze. Tylko obraz — nic
// w symulacji. „Mniej błysków” (ustawienia) przycina siłę przy rysowaniu, nie tutaj.
using System;

namespace Trzewia.Visual
{
    /// <summary>Jeden błysk światła.</summary>
    public struct Blysk
    {
        public bool jest;
        /// <summary>Barwa 0–255 i ta sama jako napis dla płótna (liczony raz, przy błysku).</summary>
        public double r, g, b;
        public string? styl;
        /// <summary>Siła 0..1, początek (ms zegara klatki), czas trwania (ms).</summary>
        public double sila, od, ms;
        /// <summary>Miejsce w świecie (kafle) i promień (kafle); promień ≤ 0 — cała płyta.</summary>
        public double x, y, promien;
    }

    public static class LightEvents
    {
        public const int MAKS = 8;
        static readonly Blysk[] pula = new Blysk[MAKS];

        /// <summary>Zegar klatki (ms) — ustawia go warstwa światła na początku klatki; błysk startuje z tą chwilą.</summary>
        public static double Zegar;

        /// <summary>Błyski (także wygasłe — patrz `jest`). Tylko do odczytu przez warstwę światła.</summary>
        public static Blysk[] Pula => pula;

        /// <summary>Błysk na całą płytę: barwa {r, g, b} 0–255, siła 0..1, czas w ms.</summary>
        public static void Flash(double[] barwa, double sila, double ms) => Flash(barwa, sila, ms, double.NaN, double.NaN, 0);

        /// <summary>Błysk wokół miejsca w świecie (x, y w kaflach) o promieniu w kaflach.</summary>
        public static void Flash(double[] barwa, double sila, double ms, double x, double y, double promien)
        {
            if (sila <= 0 || ms <= 0) return;
            int gdzie = 0;
            for (int i = 0; i < MAKS; i++)
            {
                if (!pula[i].jest || Zegar - pula[i].od >= pula[i].ms) { gdzie = i; break; }
                if (pula[i].od < pula[gdzie].od) gdzie = i;
            }
            pula[gdzie] = new Blysk
            {
                jest = true, r = barwa[0], g = barwa[1], b = barwa[2],
                styl = "rgb(" + (int)barwa[0] + "," + (int)barwa[1] + "," + (int)barwa[2] + ")",
                sila = Math.Min(1, sila), od = Zegar, ms = ms,
                x = x, y = y, promien = double.IsNaN(x) ? 0 : promien,
            };
        }

        /// <summary>Wszystkie błyski precz (nowa partia, wyłączona oprawa).</summary>
        public static void Wyczysc()
        {
            for (int i = 0; i < MAKS; i++) pula[i].jest = false;
        }
    }
}
