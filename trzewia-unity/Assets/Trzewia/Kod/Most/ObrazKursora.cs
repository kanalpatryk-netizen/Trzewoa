// Rękawica-kursor (core/kursor.ts) z obrazka gry — to samo co Okno/Kursor.cs w Trzewia.exe, tylko wynik idzie do
// kursora silnika: obrazek przycięty do nieprzezroczystych pikseli (alfa > 16), zmniejszany po połowie, aż ostatni krok
// trafi w rozmiar (dłuższy bok = KURSOR.rozmiar px CSS × gęstość ekranu), czubek palca w punkcie myszy.
using System;
using SkiaSharp;
using Trzewia.Rdzen;

namespace Trzewia.Most
{
    public sealed class ObrazKursora
    {
        /// <summary>Piksele RGBA, alfa prosta (nieprzemnożona), wiersze od góry.</summary>
        public byte[] Piksele = new byte[0];
        public int W, H;
        /// <summary>Czubek palca (punkt myszy) od lewego górnego rogu.</summary>
        public int CzubekX, CzubekY;

        /// <summary>null — brak obrazka (zostaje zwykła strzałka).</summary>
        public static ObrazKursora? Zrob(string plik, double czubekX, double czubekY, double rozmiar, double dpr)
        {
            try
            {
                var dane = Zasoby.Czytaj(plik);
                if (dane == null) return null;
                using var o = SKBitmap.Decode(dane);
                if (o == null) return null;
                int W = o.Width, H = o.Height;
                int x0 = W, y0 = H, x1 = -1, y1 = -1;
                for (int y = 0; y < H; y++)
                    for (int x = 0; x < W; x++)
                        if (o.GetPixel(x, y).Alpha > 16)
                        {
                            if (x < x0) x0 = x;
                            if (x > x1) x1 = x;
                            if (y < y0) y0 = y;
                            if (y > y1) y1 = y;
                        }
                if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
                int w = x1 - x0 + 1, h = y1 - y0 + 1;
                var s = rozmiar / Math.Max(w, h);
                int cw = Math.Max(1, (int)Math.Floor(w * s * dpr + 0.5)), ch = Math.Max(1, (int)Math.Floor(h * s * dpr + 0.5));
                using var gotowy = Pomniejsz(o, new SKRectI(x0, y0, x1 + 1, y1 + 1), cw, ch);
                int hx = (int)Math.Floor((czubekX - x0) * s * dpr + 0.5), hy = (int)Math.Floor((czubekY - y0) * s * dpr + 0.5);
                var wynik = new ObrazKursora
                {
                    W = cw, H = ch,
                    CzubekX = Math.Max(0, Math.Min(cw - 1, hx)), CzubekY = Math.Max(0, Math.Min(ch - 1, hy)),
                    Piksele = new byte[cw * ch * 4],
                };
                System.Runtime.InteropServices.Marshal.Copy(gotowy.GetPixels(), wynik.Piksele, 0, wynik.Piksele.Length);
                return wynik;
            }
            catch (Exception e) { Dziennik.Pisz($"kursor {plik}: {e.Message}"); return null; }
        }

        static SKBitmap Pomniejsz(SKBitmap zrodlo, SKRectI wycinek, int W, int H)
        {
            var info = new SKImageInfo(wycinek.Width, wycinek.Height, SKColorType.Rgba8888, SKAlphaType.Premul);
            var c = new SKBitmap(info);
            using (var g = new SKCanvas(c))
            using (var img0 = SKImage.FromBitmap(zrodlo))
                g.DrawImage(img0, new SKRect(wycinek.Left, wycinek.Top, wycinek.Right, wycinek.Bottom), new SKRect(0, 0, wycinek.Width, wycinek.Height),
                    new SKSamplingOptions(SKFilterMode.Nearest));
            var probki = new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear);
            while (c.Width / 2 >= W && c.Height / 2 >= H)
            {
                var m = new SKBitmap(new SKImageInfo((int)Math.Floor(c.Width / 2.0 + 0.5), (int)Math.Floor(c.Height / 2.0 + 0.5), SKColorType.Rgba8888, SKAlphaType.Premul));
                using (var img = SKImage.FromBitmap(c))
                using (var g = new SKCanvas(m)) g.DrawImage(img, new SKRect(0, 0, m.Width, m.Height), probki);
                c.Dispose();
                c = m;
            }
            var k = new SKBitmap(new SKImageInfo(W, H, SKColorType.Rgba8888, SKAlphaType.Premul));
            using (var img = SKImage.FromBitmap(c))
            using (var g = new SKCanvas(k)) g.DrawImage(img, new SKRect(0, 0, W, H), probki);
            c.Dispose();
            var wynik = new SKBitmap(new SKImageInfo(W, H, SKColorType.Rgba8888, SKAlphaType.Unpremul));
            using (var px = k.PeekPixels()) px.ReadPixels(wynik.Info, wynik.GetPixels(), wynik.RowBytes);
            k.Dispose();
            return wynik;
        }
    }
}
