using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace Trzewia.Skia
{

/// <summary>
/// Napis ułożony do rysowania: znaki rozdzielone na kroje (gdy znaku nie ma w głównym — zapasowy, jak w
/// przeglądarce), złożone HarfBuzzem (podcięcia par liter i ligatury — Chrome też składa tekst HarfBuzzem)
/// i zapisane jako SKTextBlob. Ułożenia są pamiętane, więc napis, który się nie zmienia, składa się raz.
/// </summary>
public sealed class Ulozenie
{
    public SKTextBlob? Blob;
    public float Szerokosc;
}

public static class Tekst
{
    static readonly Dictionary<(int, string), Ulozenie> Pamiec = new Dictionary<(int, string), Ulozenie>();
    static readonly Dictionary<SKTypeface, SKShaper> Skladacze = new Dictionary<SKTypeface, SKShaper>();
    const int MaksPamieci = 6000;

    public static Ulozenie Uloz(Kroj k, string tekst)
    {
        var klucz = (k.Id, tekst);
        if (Pamiec.TryGetValue(klucz, out var u)) return u;
        u = UlozBezPamieci(k, tekst);
        if (Pamiec.Count >= MaksPamieci)
        {
            foreach (var stare in Pamiec.Values) stare.Blob?.Dispose();
            Pamiec.Clear();
        }
        Pamiec[klucz] = u;
        return u;
    }

    static Ulozenie UlozBezPamieci(Kroj k, string tekst)
    {
        var u = new Ulozenie();
        if (tekst.Length == 0) return u;
        // podział na odcinki jednego kroju
        var odcinki = new List<(SKTypeface kroj, int od, int dl)>();
        SKTypeface? biezacy = null; int start = 0;
        for (int i = 0; i < tekst.Length;)
        {
            int znak = char.IsSurrogatePair(tekst, i) ? char.ConvertToUtf32(tekst, i) : tekst[i];
            int dlZnaku = znak > 0xFFFF ? 2 : 1;
            var t = k.Glowny.ContainsGlyph(znak) || znak < 32 ? k.Glowny : (Kroje.DlaZnaku(k, znak) ?? k.Glowny);
            if (t != biezacy)
            {
                if (biezacy != null) odcinki.Add((biezacy, start, i - start));
                biezacy = t; start = i;
            }
            i += dlZnaku;
        }
        odcinki.Add((biezacy!, start, tekst.Length - start));

        using var budowa = new SKTextBlobBuilder();
        float x = 0;
        foreach (var (kroj, od, dl) in odcinki)
        {
            var font = k.FontDla(kroj);
            if (!Skladacze.TryGetValue(kroj, out var sk)) Skladacze[kroj] = sk = new SKShaper(kroj);
            var wynik = sk.Shape(tekst.Substring(od, dl), x, 0, font);
            var n = wynik.Codepoints.Length;
            if (n > 0)
            {
                var bufor = budowa.AllocatePositionedRun(font, n);
                var glify = bufor.Glyphs;
                var poz = bufor.Positions;
                for (int g = 0; g < n; g++) { glify[g] = (ushort)wynik.Codepoints[g]; poz[g] = wynik.Points[g]; }
            }
            x += wynik.Width;
        }
        u.Szerokosc = x;
        u.Blob = budowa.Build();
        return u;
    }
}
}
