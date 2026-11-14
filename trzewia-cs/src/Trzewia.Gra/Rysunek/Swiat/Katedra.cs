// Port (część): alpha-1/src/render/katedra.ts — układ katedry na powierzchni nad szybem ze światłem.
// (Rysunek katedry: dalsza część etapu 3.)
using System;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyKatedra;
using static Trzewia.Nastawy.NastawySwiat;

namespace Trzewia.Rysunek
{
    /// <summary>Gdzie stoi katedra: środek szybu ze światłem (kafle), ziemia, rozeta, otwór w posadzce i płomienie świec.</summary>
    public sealed class UkladKatedry
    {
        public double cx, g;
        /// <summary>Rząd posadzki (y kafli) — na cokole, odrobinę nad ziemią.</summary>
        public double posadzka;
        /// <summary>Zachodni i wschodni brzeg całej budowli (x kafli, z przyporą i stopniami).</summary>
        public double x0, x1;
        public (double x, double y, double r) rozeta;
        /// <summary>Otwór w posadzce — wylot szybu ze światłem (x kafli).</summary>
        public (double x0, double x1) otwor;
        public (double x, double y)[] plomienie = Array.Empty<(double, double)>();
        /// <summary>Najwyższy punkt (krzyż na iglicy wieży) — y kafli.</summary>
        public double szczyt;
    }

    public static partial class Katedra
    {
        static Nastawy.Typ_KATEDRA K => KATEDRA;

        /// <summary>Układ katedry nad szybem albo null (góra bez sali z ołtarzem albo katedra wyłączona).</summary>
        public static UkladKatedry? ukladKatedry(World w)
        {
            if (!K.wlaczona || w.salaOltarza.x1 < 0) return null;
            double cx = w.szybX + 0.5, g = World.SURFACE_Y, pol = SWIAT.warstwy.szyb / 2;
            var kd = K.kandelabry;
            return new UkladKatedry
            {
                cx = cx, g = g,
                posadzka = g - K.posadzka,
                x0 = cx + K.wieza.od - 0.7,
                x1 = cx + K.skrzyzowanie.@do + K.skrzyzowanie.sciana + K.skrzyzowanie.przypora,
                rozeta = (cx, g - K.rozeta.v, K.rozeta.r),
                otwor = (cx - pol, cx + pol),
                plomienie = new[] { (cx - kd.u, g - K.posadzka - kd.wys - 0.55), (cx + kd.u, g - K.posadzka - kd.wys - 0.55) },
                szczyt = g - (K.wieza.wys + K.wieza.iglica + 0.75),
            };
        }
    }
}
