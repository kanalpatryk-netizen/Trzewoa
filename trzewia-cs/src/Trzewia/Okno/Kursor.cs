// Port: alpha-1/src/core/kursor.ts — kursor gry: stalowa rękawica (nastawy KURSOR).
// Różnica (PLAN.md, część 5, punkt 6): w TS rękawica to obrazek strony przesuwany za myszą; tu — kursor systemowy z tych
// samych obrazków (SDL), więc rusza się bez opóźnienia klatki. Obrazek przycięty do nieprzezroczystych pikseli
// (alfa > 16), zmniejszony po połowie, aż ostatni krok trafi w rozmiar (dłuższy bok = KURSOR.rozmiar px CSS, czyli
// × gęstość ekranu w pikselach), czubek palca w punkcie myszy. Zwykle kursor1.png, póki przycisk myszy jest wciśnięty —
// kursor2.png (najkrócej KURSOR.klikMinMs). Brak obrazka — zostaje zwykła strzałka.
using SDL;
using SkiaSharp;
using Trzewia.Rdzen;
using static SDL.SDL3;
using static Trzewia.Nastawy.NastawyEkran;

namespace Trzewia.Okno;

public sealed unsafe class Kursor : IDisposable
{
    SDL_Cursor* zwykly, klik;
    double gestosc = -1;
    bool wcisniety;
    double wcisnietyOd, puscO = -1;

    /// <summary>Rękawice dla tej gęstości ekranu (tworzone od nowa, gdy okno przejdzie na ekran o innej skali).</summary>
    public void Ustaw(double dpr)
    {
        if (dpr == gestosc) return;
        gestosc = dpr;
        Zwolnij();
        zwykly = Rekawica("grafika/kursor1.png", KURSOR.czubek.x, KURSOR.czubek.y, dpr);
        klik = Rekawica("grafika/kursor2.png", KURSOR.czubekKlik.x, KURSOR.czubekKlik.y, dpr);
        Pokaz(wcisniety);
    }

    void Pokaz(bool k)
    {
        puscO = -1;
        wcisniety = k;
        var c = k ? klik : zwykly;
        if (c != null) SDL_SetCursor(c);
    }

    /// <summary>Przycisk myszy w dół: palec wciska.</summary>
    public void Wcisnij() { Pokaz(true); wcisnietyOd = Wydajnosc.Teraz(); }

    /// <summary>Puszczenie: rękawica wraca, ale nie szybciej niż po KURSOR.klikMinMs od wciśnięcia.</summary>
    public void Pusc()
    {
        if (!wcisniety) return;
        puscO = Math.Max(Wydajnosc.Teraz(), wcisnietyOd + KURSOR.klikMinMs);
    }

    /// <summary>Ruch myszy: puszczona poza oknem — też puszczenie.</summary>
    public void Ruch(int przyciski) { if (wcisniety && przyciski == 0 && puscO < 0) Pusc(); }

    /// <summary>Okno straciło fokus — od razu zwykła rękawica (w TS: blur).</summary>
    public void Rozmycie() => Pokaz(false);

    /// <summary>Co klatkę: odłożone puszczenie (w TS: setTimeout).</summary>
    public void Krok() { if (puscO >= 0 && Wydajnosc.Teraz() >= puscO) Pokaz(false); }

    static SDL_Cursor* Rekawica(string plik, double czubekX, double czubekY, double dpr)
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
            var s = KURSOR.rozmiar / Math.Max(w, h);
            // rozmiar w pikselach ekranu: CSS px × gęstość (w TS obrazek w gęstości ekranu, wyświetlany w CSS px)
            int cw = Math.Max(1, (int)Math.Floor(w * s * dpr + 0.5)), ch = Math.Max(1, (int)Math.Floor(h * s * dpr + 0.5));
            using var gotowy = Pomniejsz(o, new SKRectI(x0, y0, x1 + 1, y1 + 1), cw, ch);
            int hx = (int)Math.Floor((czubekX - x0) * s * dpr + 0.5), hy = (int)Math.Floor((czubekY - y0) * s * dpr + 0.5);
            hx = Math.Clamp(hx, 0, cw - 1); hy = Math.Clamp(hy, 0, ch - 1);
            var sf = SDL_CreateSurfaceFrom(cw, ch, SDL_PixelFormat.SDL_PIXELFORMAT_ABGR8888, gotowy.GetPixels(), gotowy.RowBytes);
            if (sf == null) return null;
            var c = SDL_CreateColorCursor(sf, hx, hy);
            SDL_DestroySurface(sf);
            if (c == null) Dziennik.Pisz($"kursor: SDL_CreateColorCursor nie wyszedł ({SDL_GetError()})");
            return c;
        }
        catch (Exception e) { Dziennik.Pisz($"kursor {plik}: {e.Message}"); return null; }
    }

    /// <summary>
    /// Wycinek obrazka w rozmiarze W×H. Duży obrazek zmniejszany od razu do kilkudziesięciu pikseli gubi kontury, więc
    /// schodzimy po połowie, a dopiero ostatni krok trafia w rozmiar (wygładzanie „high”).
    /// </summary>
    static SKBitmap Pomniejsz(SKBitmap zrodlo, SKRectI wycinek, int W, int H)
    {
        var info = new SKImageInfo(wycinek.Width, wycinek.Height, SKColorType.Rgba8888, SKAlphaType.Premul);
        var c = new SKBitmap(info);
        using (var g = new SKCanvas(c)) g.DrawBitmap(zrodlo, wycinek, new SKRect(0, 0, wycinek.Width, wycinek.Height));
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
        // SDL chce alfy prostej (nie przemnożonej)
        var wynik = new SKBitmap(new SKImageInfo(W, H, SKColorType.Rgba8888, SKAlphaType.Unpremul));
        using (var px = k.PeekPixels()) px.ReadPixels(wynik.Info, wynik.GetPixels(), wynik.RowBytes);
        k.Dispose();
        return wynik;
    }

    void Zwolnij()
    {
        if (zwykly != null) { SDL_DestroyCursor(zwykly); zwykly = null; }
        if (klik != null) { SDL_DestroyCursor(klik); klik = null; }
    }

    public void Dispose() => Zwolnij();
}
