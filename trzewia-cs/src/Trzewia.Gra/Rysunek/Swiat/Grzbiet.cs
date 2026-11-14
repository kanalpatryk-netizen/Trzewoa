// Port: alpha-1/src/render/grzbiet-wzor.ts i grzbiet.ts — grzbiet góry (rysunek): łagodne garby ziemi ponad płaską
// powierzchnią świata; przy wylotach szybów, pod katedrą i na placu przy koźle — równo; na drodze konwoju (na prawo
// od placu) drobne nierówności są wygładzone. Jedno źródło dla ryciny (Engraver), wozu i jego latarni (konwoj.ts).
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyWygladRycina;

namespace Trzewia.Rysunek
{
    /// <summary>Gdzie grzbiet schodzi do powierzchni (przedziały x) i skąd zaczyna się droga konwoju — raz na świat.</summary>
    public sealed class RowneGrzbietu
    {
        public List<(double a, double b)> przedzialy = new List<(double, double)>();
        public double droga;
    }

    public static class Grzbiet
    {
        /// <summary>Tani skrót liczby — stały szum grzbietu (rysunek nie sięga po los gry).</summary>
        static double los(int n)
        {
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }
        static readonly float[] GARBY = new float[256], DROBNE = new float[256];
        static Grzbiet() { for (int i = 0; i < 256; i++) { GARBY[i] = (float)los(i * 13 + 5); DROBNE[i] = (float)los(i * 29 + 11); } }

        /// <summary>Wysokość grzbietu (kafle nad powierzchnią) w kolumnie x — przy danych przedziałach równego gruntu.</summary>
        public static double wysokoscGrzbietuZ(RowneGrzbietu r, double x)
        {
            if (!SWIAT.warstwy.wlaczone) return 0;
            double f3 = x * 0.12, i3 = Math.Floor(f3), t3 = f3 - i3;
            double s5 = GARBY[(int)i3 & 255], s6 = GARBY[((int)i3 + 1) & 255];
            double f1 = x * 1.6, i1 = Math.Floor(f1), t1 = f1 - i1;
            double s1 = DROBNE[(int)i1 & 255], s2 = DROBNE[((int)i1 + 1) & 255];
            var drobne = x > r.droga ? 0.2 : 1;
            var grz = 0.4 + (s5 + (s6 - s5) * (t3 * t3 * (3 - 2 * t3))) * RYCINA_SWIATA.grzbiet + (s1 + (s2 - s1) * t1 - 0.5) * 0.8 * drobne;
            var d = double.PositiveInfinity;
            foreach (var (a, b) in r.przedzialy) { var e = x < a ? a - x : x > b ? x - b : 0; if (e < d) d = e; }
            grz *= d >= 3 ? 1 : d / 3;
            return grz < 0 ? 0 : grz;
        }

        static readonly ConditionalWeakTable<World, RowneGrzbietu> rowne = new ConditionalWeakTable<World, RowneGrzbietu>();

        /// <summary>Przedziały równego gruntu i początek drogi konwoju — raz na świat.</summary>
        public static RowneGrzbietu rowneW(World w)
        {
            if (rowne.TryGetValue(w, out var r)) return r;
            var pol = (int)SWIAT.warstwy.szyb >> 1;
            r = new RowneGrzbietu();
            r.przedzialy.Add((w.szybX - pol, w.szybX + pol + 1));
            r.przedzialy.Add((w.szybWiadraX, w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer));
            var kat = Katedra.ukladKatedry(w);
            var plac = Konwoj.placKonwoju(w);
            if (kat != null) r.przedzialy.Add((kat.x0, kat.x1));
            if (plac != null) r.przedzialy.Add((plac.Value.x0, plac.Value.x1));
            r.droga = plac != null ? plac.Value.x1 : double.PositiveInfinity;
            rowne.Add(w, r);
            return r;
        }

        /// <summary>Wysokość grzbietu (kafle nad powierzchnią) w kolumnie x.</summary>
        public static double wysokoscGrzbietu(World w, double x)
        {
            if (!SWIAT.warstwy.wlaczone) return 0;
            return wysokoscGrzbietuZ(rowneW(w), x);
        }
    }
}
