using System;
using SkiaSharp;
using Trzewia.Plotna;

namespace Trzewia.Skia
{
    /// <summary>
    /// Ścieżka Canvas 2D na SKPath. Logika przeglądarki (kąty, „lineTo bez punktu”, promienie) jest w
    /// BudowniczySciezki; tu tylko proste polecenia — tak samo jak Chrome składa je na SkPath (canvas_path.cc,
    /// platform/graphics/path.cc).
    /// </summary>
    sealed class SciezkaSkia : BudowniczySciezki, IDisposable
    {
        public readonly SKPath Sciezka = new SKPath();
        public override bool Pusta => Sciezka.IsEmpty;
        public void Czysc() => Wyczysc();

        protected override void pMoveTo(float x, float y) => Sciezka.MoveTo(x, y);
        protected override void pLineTo(float x, float y) => Sciezka.LineTo(x, y);
        protected override void pQuadTo(float cx, float cy, float x, float y) => Sciezka.QuadTo(cx, cy, x, y);
        protected override void pCubicTo(float a, float b, float c, float d, float x, float y) => Sciezka.CubicTo(a, b, c, d, x, y);
        protected override void pClose() => Sciezka.Close();
        protected override void pArcTo(float x1, float y1, float x2, float y2, float r) => Sciezka.ArcTo(x1, y1, x2, y2, r);
        protected override void pWyczysc() => Sciezka.Rewind();

        protected override void pLuk(float cx, float cy, float rx, float ry, float obrot, float start, float koniec)
        {
            if (obrot == 0) { DodajElipse(cx, cy, rx, ry, start, koniec); return; }
            // obrót: ścieżka do układu elipsy, elipsa, z powrotem (Chrome: Path::AddEllipse z przekształceniem)
            var m = SKMatrix.CreateRotation(obrot).PostConcat(SKMatrix.CreateTranslation(cx, cy));
            if (!m.TryInvert(out var odwr)) return;
            Sciezka.Transform(odwr);
            DodajElipse(0, 0, rx, ry, start, koniec);
            Sciezka.Transform(m);
        }

        void DodajElipse(float x, float y, float rx, float ry, float start, float koniec)
        {
            var owal = new SKRect(x - rx, y - ry, x + rx, y + ry);
            float startSt = start * 180f / MathF.PI;
            float lukSt = (koniec - start) * 180f / MathF.PI;
            // SkPath::arcTo nie umie łuku 360° — Chrome składa go z dwóch półłuków
            if (MathF.Abs(MathF.Abs(lukSt) - 360f) <= 1f / 4096)
            {
                float pol = lukSt > 0 ? 180f : -180f;
                Sciezka.ArcTo(owal, startSt, pol, false);
                Sciezka.ArcTo(owal, startSt + pol, pol, false);
            }
            else Sciezka.ArcTo(owal, startSt, lukSt, false);
        }

        protected override void pRoundRect(float x, float y, float w, float h, float lg, float pg, float pd, float ld)
        {
            using var rr = new SKRoundRect();
            rr.SetRectRadii(SKRect.Create(x, y, w, h), new[] { new SKPoint(lg, lg), new SKPoint(pg, pg), new SKPoint(pd, pd), new SKPoint(ld, ld) });
            Sciezka.AddRoundRect(rr, SKPathDirection.Clockwise);
        }

        protected override void pAddPath(Path2D p, DOMMatrix? m)
        {
            var sk = Sk(p);
            if (m is DOMMatrix mm) { var x = Macierz.Sk(mm); Sciezka.AddPath(sk, in x); }
            else Sciezka.AddPath(sk);
        }

        /// <summary>Path2D jako SKPath — zamieniana raz i trzymana w p.Uchwyt, dopóki ścieżka się nie zmieni.</summary>
        public static SKPath Sk(Path2D p)
        {
            if (p.Uchwyt is SciezkaSkia gotowa && p.UchwytWersja == p.Wersja) return gotowa.Sciezka;
            var s = p.Uchwyt as SciezkaSkia ?? new SciezkaSkia();
            s.Sciezka.Rewind();
            s.Odtworz(p);
            p.Uchwyt = s;
            p.UchwytWersja = p.Wersja;
            return s.Sciezka;
        }

        void Odtworz(Path2D p)
        {
            var l = p.Liczby;
            int i = 0, d = 0;
            foreach (var op in p.Polecenia)
            {
                switch (op)
                {
                    case Path2D.Polecenie.Move: pMoveTo(l[i], l[i + 1]); i += 2; break;
                    case Path2D.Polecenie.Line: pLineTo(l[i], l[i + 1]); i += 2; break;
                    case Path2D.Polecenie.Quad: pQuadTo(l[i], l[i + 1], l[i + 2], l[i + 3]); i += 4; break;
                    case Path2D.Polecenie.Cubic: pCubicTo(l[i], l[i + 1], l[i + 2], l[i + 3], l[i + 4], l[i + 5]); i += 6; break;
                    case Path2D.Polecenie.Close: pClose(); break;
                    case Path2D.Polecenie.Luk: pLuk(l[i], l[i + 1], l[i + 2], l[i + 3], l[i + 4], l[i + 5], l[i + 6]); i += 7; break;
                    case Path2D.Polecenie.ArcTo: pArcTo(l[i], l[i + 1], l[i + 2], l[i + 3], l[i + 4]); i += 5; break;
                    case Path2D.Polecenie.RoundRect: pRoundRect(l[i], l[i + 1], l[i + 2], l[i + 3], l[i + 4], l[i + 5], l[i + 6], l[i + 7]); i += 8; break;
                    case Path2D.Polecenie.Dodaj: { var (sc, m) = p.Dolaczone[d++]; pAddPath(sc, m); break; }
                }
            }
        }

        public void Dispose() => Sciezka.Dispose();
    }

    static class Macierz
    {
        public static SKMatrix Sk(DOMMatrix m) => new SKMatrix((float)m.a, (float)m.c, (float)m.e, (float)m.b, (float)m.d, (float)m.f, 0, 0, 1);
        public static DOMMatrix Z(SKMatrix m) => new DOMMatrix(m.ScaleX, m.SkewY, m.SkewX, m.ScaleY, m.TransX, m.TransY);
        public static SKColorF Sk(Barwa b) => new SKColorF(b.r, b.g, b.b, b.a);
    }

    /// <summary>Obrazek z pliku jako SKImage (rasteryzowany od razu — dekodowanie w klatce szarpnęłoby nią).</summary>
    public sealed class ObrazSkia : IObraz, IDisposable
    {
        public SKImage? Image { get; private set; }
        public int width => Image?.Width ?? 0;
        public int height => Image?.Height ?? 0;
        public bool complete => Image != null;
        public ObrazSkia(SKImage? image) { Image = image; }
        public void Dispose() { Image?.Dispose(); Image = null; }
    }
}
