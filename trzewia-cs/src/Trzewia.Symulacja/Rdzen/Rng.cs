// Port: alpha-1/src/core/rng.ts
using System;
using System.Collections.Generic;
using Trzewia.Js;

namespace Trzewia.Rdzen
{
    /// <summary>Deterministyczny generator — to samo ziarno daje tę samą górę.</summary>
    public sealed class Rng
    {
        uint s;

        public Rng(double seed)
        {
            // TS: this.s = seed >>> 0 || 1
            s = Js.Js.ToUint32(seed);
            if (s == 0) s = 1;
        }

        /// <summary>Stan generatora (do zapisu gry i do skrótu stanu w testach złotych).</summary>
        public uint Stan { get => s; set => s = value; }

        public double next()
        {
            // mulberry32
            unchecked
            {
                s = s + 0x6d2b79f5;
                uint t = s;
                t = (uint)Js.Js.Imul((int)(t ^ (t >> 15)), (int)(t | 1));
                t ^= t + (uint)Js.Js.Imul((int)(t ^ (t >> 7)), (int)(t | 61));
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }

        public int @int(double n) => Js.Js.ToInt32(next() * n);
        public double range(double a, double b) => a + next() * (b - a);
        public bool chance(double p) => next() < p;
        public T pick<T>(IReadOnlyList<T> arr) => arr[Js.Js.ToInt32(next() * arr.Count)];
    }

    /// <summary>Szum wartościowy na siatce + fbm. Dość dobry na jaskinie, tani jak barszcz.</summary>
    public sealed class Noise
    {
        readonly Float32Array p;
        const int size = 256;

        public Noise(Rng rng)
        {
            p = new Float32Array(size * size);
            for (int i = 0; i < p.length; i++) p[i] = rng.next();
        }

        double at(double x, double y)
        {
            int xi = ((Js.Js.ToInt32(x) % size) + size) % size;
            int yi = ((Js.Js.ToInt32(y) % size) + size) % size;
            return p[yi * size + xi];
        }

        public double value(double x, double y)
        {
            double x0 = Math.Floor(x), y0 = Math.Floor(y);
            double fx = x - x0, fy = y - y0;
            double sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
            double a = at(x0, y0), b = at(x0 + 1, y0);
            double c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
            return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
        }

        public double fbm(double x, double y, int oct = 4, double lac = 2, double gain = 0.5)
        {
            double f = 1, amp = 1, sum = 0, norm = 0;
            for (int i = 0; i < oct; i++)
            {
                sum += value(x * f, y * f) * amp;
                norm += amp;
                f *= lac; amp *= gain;
            }
            return sum / norm;
        }
    }
}
