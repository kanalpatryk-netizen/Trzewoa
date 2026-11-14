// Port (część): alpha-1/src/render/konwoj.ts — kozioł nad szybem wiadra i plac konwoju.
// (Rysunek konwoju: dalsza część etapu 3.)
using System;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Nastawy.NastawyWiadro;

namespace Trzewia.Rysunek
{
    public static partial class Konwoj
    {
        /// <summary>Długość konwoju (kafle): od tyłu wozu do pysków koni.</summary>
        const double DL = 7.6;

        /// <summary>Bloczek kozła nad szybem wiadra (x, y kafli) albo null.</summary>
        public static (double x, double y)? bloczekWiadra(World w)
        {
            if (!KONWOJ.wlaczony || !SWIAT.warstwy.wlaczone || w.salaOltarza.x1 < 0) return null;
            return (w.szybWiadraX + SWIAT.warstwy.szybWiadra.szer / 2, World.SURFACE_Y - KONWOJ.koziol.wys);
        }

        /// <summary>Równy plac przy koźle, na którym staje wóz (x kafli) — tu grzbiet schodzi do powierzchni.</summary>
        public static (double x0, double x1)? placKonwoju(World w)
        {
            var b = bloczekWiadra(w);
            return b != null ? (b.Value.x - KONWOJ.koziol.rozstaw - 0.5, b.Value.x + KONWOJ.postoj + DL + 1) : ((double, double)?)null;
        }
    }
}
