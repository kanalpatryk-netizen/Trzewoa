using System;
using System.Collections.Generic;

namespace Trzewia.Plotna
{
    /// <summary>
    /// fillStyle / strokeStyle: barwa, gradient albo wzór — jak w Canvas 2D. Z napisu, z <see cref="Barwa"/>
    /// i z gradientu przypisuje się wprost: <c>ctx.fillStyle = "#e0b068";</c>, <c>ctx.fillStyle = gradient;</c>.
    /// </summary>
    public readonly struct Styl
    {
        public readonly Barwa Barwa;
        public readonly CanvasGradient? Gradient;
        public readonly CanvasPattern? Wzor;
        /// <summary>Napis niezrozumiały — przypisanie nic nie zmienia (jak w przeglądarce).</summary>
        public readonly bool Pusty;

        Styl(Barwa b, CanvasGradient? g, CanvasPattern? w, bool pusty) { Barwa = b; Gradient = g; Wzor = w; Pusty = pusty; }

        public static implicit operator Styl(Barwa b) => new Styl(b, null, null, false);
        public static implicit operator Styl(CanvasGradient g) => new Styl(default, g, null, false);
        public static implicit operator Styl(CanvasPattern w) => new Styl(default, null, w, false);
        public static implicit operator Styl(string s) => global::Trzewia.Plotna.Barwa.Czytaj(s, out var b) ? new Styl(b, null, null, false) : new Styl(default, null, null, true);

        public static readonly Styl Czarny = global::Trzewia.Plotna.Barwa.Czarna;
    }

    /// <summary>
    /// Gradient liniowy albo kołowy (createLinearGradient / createRadialGradient). Współrzędne w przestrzeni rysunku
    /// w chwili wypełniania — jak w Canvas 2D. Warstwa rysunku (np. Skia) trzyma w <see cref="Uchwyt"/> swój gotowy
    /// odpowiednik i robi go od nowa, gdy zmieni się <see cref="Wersja"/>.
    /// </summary>
    public sealed class CanvasGradient
    {
        public readonly bool Kolowy;
        public readonly double x0, y0, r0, x1, y1, r1;
        readonly List<(double t, Barwa b)> przystanki = new List<(double, Barwa)>(4);
        public IReadOnlyList<(double t, Barwa b)> Przystanki => przystanki;
        public int Wersja { get; private set; }
        public object? Uchwyt;
        public int UchwytWersja = -1;

        public CanvasGradient(bool kolowy, double x0, double y0, double r0, double x1, double y1, double r1)
        {
            Kolowy = kolowy;
            this.x0 = x0; this.y0 = y0; this.r0 = r0; this.x1 = x1; this.y1 = y1; this.r1 = r1;
        }

        /// <summary>addColorStop: przesunięcie 0–1 (poza zakresem przeglądarka rzuca wyjątek — tu obcinamy) i barwa.</summary>
        public void addColorStop(double t, Styl barwa)
        {
            if (barwa.Pusty || barwa.Gradient != null || barwa.Wzor != null) return;
            var tt = Math.Clamp(t, 0, 1);
            // przystanki w kolejności przesunięć; równe — w kolejności dodania (jak w przeglądarce)
            int i = przystanki.Count;
            while (i > 0 && przystanki[i - 1].t > tt) i--;
            przystanki.Insert(i, (tt, barwa.Barwa));
            Wersja++;
        }
    }

    /// <summary>Wzór z obrazka albo płótna (createPattern); „repeat”, „repeat-x”, „repeat-y”, „no-repeat”.</summary>
    public sealed class CanvasPattern
    {
        public readonly IZrodloObrazu Zrodlo;
        public readonly string Powtorzenie;
        public object? Uchwyt;
        public CanvasPattern(IZrodloObrazu zrodlo, string powtorzenie) { Zrodlo = zrodlo; Powtorzenie = powtorzenie; }
    }
}
