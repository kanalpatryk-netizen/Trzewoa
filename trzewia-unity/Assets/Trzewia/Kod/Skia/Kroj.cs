using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using SkiaSharp;
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Skia
{

/// <summary>
/// Krój pisma z napisu CSS (ctx.font = 'italic 600 16px "Trzewia Tekst", Georgia, serif'), jak w przeglądarce:
/// pierwsza rodzina z listy, która jest (kroje gry z dane/czcionki albo systemowe), sztuczna kursywa i pogrubienie,
/// gdy rodzina ich nie ma, oraz miary linii bazowych według Chrome (TextMetrics::GetFontBaseline).
/// </summary>
public sealed class Kroj
{
    static readonly Dictionary<string, Kroj> Pamiec = new Dictionary<string, Kroj>(StringComparer.Ordinal);
    static int nastepneId;

    public readonly int Id;
    public readonly string Napis;
    public readonly float Rozmiar;
    public readonly bool Kursywa;
    public readonly int Waga;
    public readonly string[] Rodziny;
    public readonly SKTypeface Glowny;
    public readonly SKFont Font;
    /// <summary>Miary w px: wznoszenie i zejście (zaokrąglone jak w Chrome) oraz „typograficzne”, znormalizowane do wysokości kroju.</summary>
    public readonly float Wznos, Zejscie, TypoWznos, TypoZejscie;

    Kroj(string napis, float rozmiar, bool kursywa, int waga, string[] rodziny)
    {
        Id = ++nastepneId;
        Napis = napis; Rozmiar = rozmiar; Kursywa = kursywa; Waga = waga; Rodziny = rodziny;
        Glowny = Kroje.Znajdz(rodziny, waga, kursywa, out var sztucznaKursywa, out var sztucznePogrubienie);
        Font = UstawFont(Glowny, rozmiar, sztucznaKursywa, sztucznePogrubienie);
        var m = Font.Metrics;
        // Chrome: FontMetrics::AscentDescentWithHacks — wznoszenie i zejście zaokrąglone do pikseli
        Wznos = MathF.Round(-m.Ascent);
        Zejscie = MathF.Round(m.Descent);
        // Chrome: SimpleFontData::NormalizedTypoAscentAndDescent — miary OS/2 przeskalowane tak, by razem dały rozmiar kroju
        float a = -m.Ascent, d = m.Descent;
        if (Kroje.Typo(Glowny, out var ta, out var td) && ta + td > 0) { a = ta * rozmiar; d = td * rozmiar; }
        if (a + d > 0)
        {
            TypoWznos = MathF.Round(a * rozmiar / (a + d) * 64) / 64;
            TypoZejscie = MathF.Round(rozmiar * 64) / 64 - TypoWznos;
        }
    }

    internal SKFont FontDla(SKTypeface t) => t == Glowny ? Font : UstawFont(t, Rozmiar, Kursywa && !t.IsItalic, Waga >= 600 && t.FontWeight < 600);

    static SKFont UstawFont(SKTypeface t, float rozmiar, bool kursywa, bool pogrubienie) => new SKFont(t, rozmiar)
    {
        Subpixel = true,
        Edging = SKFontEdging.Antialias,
        Hinting = SKFontHinting.Slight,
        // Chrome: sztuczna kursywa to pochylenie o 1/4, sztuczne pogrubienie — Skia „embolden”
        SkewX = kursywa ? -0.25f : 0,
        Embolden = pogrubienie,
    };

    /// <summary>Linia bazowa względem y z fillText (Chrome: TextMetrics::GetFontBaseline).</summary>
    public float PrzesuniecieBazowej(string textBaseline) => textBaseline switch
    {
        "top" => TypoWznos,
        "hanging" => Wznos * 0.8f,
        "middle" => (TypoWznos - TypoZejscie) / 2,
        "bottom" => -TypoZejscie,
        "ideographic" => -Zejscie,
        _ => 0,
    };

    /// <summary>Kroj z napisu CSS; null, gdy napis niezrozumiały (przeglądarka zostawia wtedy poprzedni krój).</summary>
    public static Kroj? Czytaj(string css)
    {
        if (Pamiec.TryGetValue(css, out var k)) return k;
        k = CzytajBezPamieci(css);
        if (k == null) return null;
        if (Pamiec.Count > 4096) Pamiec.Clear();
        Pamiec[css] = k;
        return k;
    }

    static Kroj? CzytajBezPamieci(string css)
    {
        var s = css.Trim();
        bool kursywa = false; int waga = 400;
        int i = 0;
        // słowa przed rozmiarem: styl, wariant, grubość, szerokość
        while (i < s.Length)
        {
            int j = s.IndexOf(' ', i);
            if (j < 0) return null;
            var slowo = s.Substring(i, j - i);
            if (slowo.Length > 0 && (char.IsDigit(slowo[0]) || slowo[0] == '.') && (slowo.Contains("px") || slowo.Contains("pt") || slowo.Contains("em")))
                break;
            switch (slowo)
            {
                case "italic": case "oblique": kursywa = true; break;
                case "bold": case "bolder": waga = 700; break;
                case "lighter": waga = 300; break;
                case "normal": case "small-caps": case "": break;
                default:
                    if (int.TryParse(slowo, out var w) && w >= 1 && w <= 1000) waga = w;
                    else return null;
                    break;
            }
            i = j + 1;
        }
        int k = s.IndexOf(' ', i);
        if (k < 0) return null;
        var rozm = s.Substring(i, k - i);
        var ukosnik = rozm.IndexOf('/');
        if (ukosnik >= 0) rozm = rozm.Substring(0, ukosnik);
        float mnoznik = 1;
        if (rozm.EndsWith("px", StringComparison.Ordinal)) rozm = rozm.Substring(0, rozm.Length - 2);
        else if (rozm.EndsWith("pt", StringComparison.Ordinal)) { rozm = rozm.Substring(0, rozm.Length - 2); mnoznik = 4f / 3; }
        else if (rozm.EndsWith("em", StringComparison.Ordinal)) { rozm = rozm.Substring(0, rozm.Length - 2); mnoznik = 10; }   // em względem domyślnych 10px płótna
        if (!float.TryParse(rozm, NumberStyles.Float, CultureInfo.InvariantCulture, out var px) || px < 0) return null;
        var reszta = s.Substring(k + 1);
        var rodziny = reszta.Split(',').Select(r => r.Trim().Trim('"', '\'')).Where(r => r.Length > 0).ToArray();
        if (rodziny.Length == 0) return null;
        return new Kroj(css, px * mnoznik, kursywa, waga, rodziny);
    }

    /// <summary>Domyślny krój płótna: '10px sans-serif'.</summary>
    public static readonly Kroj Domyslny = Czytaj("10px sans-serif")!;
}

/// <summary>
/// Kroje gry (dane/czcionki, rejestrowane w Rysunek/Fonts.cs) i systemowe. Kroje gry mają pierwszeństwo, jak
/// @font-face w przeglądarce.
/// </summary>
public static class Kroje
{
    sealed class Wlasny
    {
        public readonly string Rodzina; public readonly int Waga; public readonly bool Kursywa; public readonly SKTypeface Kroj;
        public Wlasny(string r, int w, bool k, SKTypeface t) { Rodzina = r; Waga = w; Kursywa = k; Kroj = t; }
    }
    static readonly List<Wlasny> Wlasne = new List<Wlasny>();
    static readonly Dictionary<string, SKTypeface?> Systemowe = new Dictionary<string, SKTypeface?>(StringComparer.OrdinalIgnoreCase);

    public static void Rejestruj(string rodzina, int waga, bool kursywa, SKTypeface kroj) => Wlasne.Add(new Wlasny(rodzina, waga, kursywa, kroj));

    public static bool Ma(string rodzina) => Wlasne.Any(w => string.Equals(w.Rodzina, rodzina, StringComparison.OrdinalIgnoreCase));

    /// <summary>Pierwsza rodzina z listy, która jest; najbliższy krój (kursywa, potem grubość) i czy trzeba go podrobić.</summary>
    internal static SKTypeface Znajdz(string[] rodziny, int waga, bool kursywa, out bool sztucznaKursywa, out bool sztucznePogrubienie)
    {
        foreach (var r in rodziny)
        {
            var t = Rodzina(r, waga, kursywa);
            if (t == null) continue;
            sztucznaKursywa = kursywa && !t.IsItalic && t.FontSlant != SKFontStyleSlant.Oblique;
            sztucznePogrubienie = waga >= 600 && t.FontWeight < 600;
            return t;
        }
        sztucznaKursywa = kursywa; sztucznePogrubienie = false;
        return SKTypeface.Default;
    }


    /// <summary>Krój z rodziny albo null, gdy rodziny nie ma.</summary>
    internal static SKTypeface? Rodzina(string r, int waga, bool kursywa)
    {
        Wlasny? najlepszy = null;
        foreach (var w in Wlasne)
        {
            if (!string.Equals(w.Rodzina, r, StringComparison.OrdinalIgnoreCase)) continue;
            if (najlepszy == null || Lepszy(w, najlepszy, waga, kursywa)) najlepszy = w;
        }
        if (najlepszy != null) return najlepszy.Kroj;
        return Systemowa(r, waga, kursywa);
    }

    static bool Lepszy(Wlasny a, Wlasny b, int waga, bool kursywa)
    {
        if ((a.Kursywa == kursywa) != (b.Kursywa == kursywa)) return a.Kursywa == kursywa;
        return Math.Abs(a.Waga - waga) < Math.Abs(b.Waga - waga);
    }

    static readonly bool Windows = System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows);

    static SKTypeface? Systemowa(string r, int waga, bool kursywa)
    {
        var klucz = $"{r}|{waga}|{kursywa}";
        if (Systemowe.TryGetValue(klucz, out var t)) return t;
        string nazwa = r.ToLowerInvariant() switch
        {
            // ui-* Chrome zna tylko na macOS — na Windows i Linuksie przechodzi do następnej rodziny
            "ui-monospace" => "", "ui-serif" => "", "ui-sans-serif" => "", "ui-rounded" => "",
            "serif" => Windows ? "Times New Roman" : "serif",
            "sans-serif" => Windows ? "Arial" : "sans-serif",
            "monospace" => Windows ? "Consolas" : "monospace",
            "system-ui" => Windows ? "Segoe UI" : "sans-serif",
            "cursive" => Windows ? "Comic Sans MS" : "cursive",
            "fantasy" => Windows ? "Impact" : "fantasy",
            _ => r,
        };
        bool ogolna = nazwa != r || r == "serif" || r == "sans-serif" || r == "monospace" || r == "cursive" || r == "fantasy";
        t = null;
        if (nazwa.Length > 0)
        {
            var styl = new SKFontStyle(waga, (int)SKFontStyleWidth.Normal, kursywa ? SKFontStyleSlant.Italic : SKFontStyleSlant.Upright);
            var z = SKFontManager.Default.MatchFamily(nazwa, styl);
            // fontconfig (Linux) podaje „coś” także dla rodziny, której nie ma — przeglądarka poszłaby wtedy dalej po liście
            if (z != null && (ogolna || string.Equals(z.FamilyName, nazwa, StringComparison.OrdinalIgnoreCase))) t = z;
        }
        Systemowe[klucz] = t;
        return t;
    }

    /// <summary>Krój zapasowy dla znaku, którego nie ma w głównym (jak w przeglądarce: dalej po liście, potem system).</summary>
    internal static SKTypeface? DlaZnaku(Kroj k, int znak)
    {
        foreach (var r in k.Rodziny)
        {
            var t = Rodzina(r, k.Waga, k.Kursywa);
            if (t != null && t.ContainsGlyph(znak)) return t;
        }
        var styl = new SKFontStyle(k.Waga, (int)SKFontStyleWidth.Normal, k.Kursywa ? SKFontStyleSlant.Italic : SKFontStyleSlant.Upright);
        return SKFontManager.Default.MatchCharacter(k.Glowny.FamilyName, styl, null, znak);
    }

    static readonly Dictionary<SKTypeface, (float a, float d)?> TypoPamiec = new Dictionary<SKTypeface, (float a, float d)?>();

    /// <summary>Miary OS/2 sTypoAscender / sTypoDescender w ułamkach em (null — brak tablicy OS/2).</summary>
    internal static bool Typo(SKTypeface t, out float a, out float d)
    {
        if (!TypoPamiec.TryGetValue(t, out var w))
        {
            w = null;
            try
            {
                var os2 = t.GetTableData(Znacznik("OS/2"));
                var head = t.GetTableData(Znacznik("head"));
                if (os2 != null && os2.Length >= 72 && head != null && head.Length >= 20)
                {
                    int upm = (head[18] << 8) | head[19];
                    short ta = (short)((os2[68] << 8) | os2[69]);
                    short td = (short)((os2[70] << 8) | os2[71]);
                    if (upm > 0) w = (ta / (float)upm, -td / (float)upm);
                }
            }
            catch (Exception e) { Dziennik.Pisz($"krój {t.FamilyName}: bez miar OS/2 ({e.Message})"); }
            TypoPamiec[t] = w;
        }
        a = w?.a ?? 0; d = w?.d ?? 0;
        return w != null;
    }

    static uint Znacznik(string s) => (uint)(s[0] << 24 | s[1] << 16 | s[2] << 8 | s[3]);
}
}
