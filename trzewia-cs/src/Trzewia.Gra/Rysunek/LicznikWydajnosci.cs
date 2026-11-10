using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/render/licznik-wydajnosci.ts
// Różnice (C#): „procesor na klatkę” zamiast „JS na klatkę”; zamiast wiersza o wątku ryciny — czas karty graficznej
// na klatkę; dwa nowe wiersze: wysłanie do karty i czekanie na monitor oraz pamięć i sprzątania (GC). Karta: nazwa
// i droga (ANGLE / OpenGL) wprost z kontekstu, bez pytania Electrona.
using System.Globalization;
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Rysunek
{

/// <summary>Co pokazać o obrazie: rozmiar płótna w pikselach, gęstość ekranu, rozdzielczość obrazu i limit klatek.</summary>
public readonly struct OpisObrazu
{
    public readonly int plotnoW, plotnoH;
    public readonly double dpr, rozdzielczosc, limit;
    public OpisObrazu(int plotnoW, int plotnoH, double dpr, double rozdzielczosc, double limit)
    { this.plotnoW = plotnoW; this.plotnoH = plotnoH; this.dpr = dpr; this.rozdzielczosc = rozdzielczosc; this.limit = limit; }
}

public static class LicznikWydajnosci
{
    const string MONO = "12px ui-monospace, Consolas, \"DejaVu Sans Mono\", monospace";
    const string TEKST = "rgba(236,222,190,0.96)";
    const string SLABO = "rgba(176,160,132,0.9)";
    const string ALARM = "rgba(244,116,92,1)";
    const string DOBRZE = "rgba(150,210,130,1)";
    /// <summary>Pasek części: pełna szerokość to budżet klatki przy 60 kl/s.</summary>
    const double BUDZET = 1000.0 / 60;

    static string F(double v, int miejsc) => v.ToString("F" + miejsc, CultureInfo.InvariantCulture);

    /// <summary>Licznik wydajności (F3) — w lewym górnym rogu, nad wszystkim. Rysowany w pikselach logicznych.</summary>
    public static void rysujLicznik(IPlotno ctx, OpisObrazu o)
    {
        var w = Wydajnosc.licznik.wynik;
        double lh = 15, x = 14, y = 14, sz = 420, pad = 10;
        var linie = 4 + Wydajnosc.CZESCI.Length + 1 + 6;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(8,6,5,0.84)";
        ctx.fillRect(x, y, sz, pad * 2 + linie * lh);
        ctx.strokeStyle = "rgba(224,176,104,0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, pad * 2 + linie * lh - 1);
        ctx.font = MONO;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        var ly = y + pad + 11;
        void pisz(string t, string barwa = TEKST, double dx = 0) { ctx.fillStyle = barwa; ctx.fillText(t, x + pad + dx, ly); }
        void nowa() => ly += lh;

        pisz("WYDAJNOŚĆ  (F3 — schowaj)", "rgba(232,196,130,1)"); nowa();
        pisz($"{F(w.fps, 0).PadLeft(3)} kl/s", w.fps < 50 ? ALARM : DOBRZE);
        pisz($"klatka {F(w.klatkaMs, 1)} ms · najdłuższa {F(w.najdluzszaMs, 0)} ms", w.najdluzszaMs > 40 ? ALARM : TEKST, 78); nowa();
        pisz($"procesor na klatkę {F(w.cpuMs, 1)} ms", w.cpuMs > 12 ? ALARM : TEKST); nowa();
        nowa();
        double xb = x + pad + 210, bw = sz - pad * 2 - 210;
        void pasek(double ms)
        {
            ctx.fillStyle = "rgba(236,222,190,0.12)";
            ctx.fillRect(xb, ly - 9, bw, 8);
            ctx.fillStyle = ms > 4 ? "rgba(244,116,92,0.85)" : "rgba(224,176,104,0.8)";
            ctx.fillRect(xb, ly - 9, Math.Min(bw, bw * ms / BUDZET), 8);
        }
        foreach (var c in Wydajnosc.CZESCI)
        {
            var ms = w.czesci[(int)c];
            pisz($"{Wydajnosc.NazwaCzesci(c).PadRight(17)}{F(ms, 2).PadLeft(6)} ms");
            pasek(ms);
            nowa();
        }
        pisz($"{"reszta".PadRight(17)}{F(w.resztaMs, 2).PadLeft(6)} ms", SLABO); pasek(w.resztaMs); nowa();
        pisz(w.kartaMs >= 0 ? $"karta graficzna {F(w.kartaMs, 2)} ms na klatkę" : "karta nie mierzy swojego czasu",
            w.kartaMs > 14 ? ALARM : SLABO); nowa();
        pisz($"wysłanie do karty {F(w.wyslanieMs, 1)} ms · czekanie na monitor {F(w.czekanieMs, 1)} ms", SLABO); nowa();
        pisz($"pamięć {F(w.pamiecMB, 0)} MB · sprzątania: {w.gc0} (pełne: {w.gc2})", w.gc2 > 0 ? ALARM : SLABO); nowa();
        var roz = o.rozdzielczosc < 1 ? $", obraz {Math.Round(o.rozdzielczosc * 100)}%" : "";
        var dpr = Math.Round(o.dpr, 2).ToString(CultureInfo.InvariantCulture);
        pisz($"płótno {o.plotnoW}×{o.plotnoH} px (dpr {dpr}{roz}{(o.limit > 0 ? $", limit {o.limit} kl/s" : "")})", SLABO); nowa();
        var nazwa = InfoKarty.Nazwa.Length > 47 ? InfoKarty.Nazwa.Substring(0, 46) + "…" : InfoKarty.Nazwa;
        pisz($"karta: {nazwa}", InfoKarty.Programowa ? ALARM : SLABO); nowa();
        if (InfoKarty.Programowa) pisz($"karta programowa — rysuje procesor ({InfoKarty.Droga})", ALARM);
        else pisz($"przez kartę graficzną: {InfoKarty.Droga}", DOBRZE);
        ctx.restore();
    }
}
}
