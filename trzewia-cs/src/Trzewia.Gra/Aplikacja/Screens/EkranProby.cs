using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Nastawy.NastawyEkran;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Aplikacja.Screens
{

/// <summary>
/// Ekran próbny etapu 1 (nie ma go w TS — zniknie, gdy przyjdą prawdziwe ekrany): płyta z siatką kafli świata
/// 192 × 240, kamera jak w grze (kółko przybliża pod kursorem, prawy albo środkowy przycisk przesuwa), czas gry
/// w tikach jak w game.ts (120 tików/s, TEMPO), kroje pisma gry z polskimi znakami, ostatni klawisz i jego akcja.
/// Służy do sprawdzenia okna, pętli, wejścia i licznika F3 na komputerze użytkownika.
/// </summary>
public sealed class EkranProby : Ekran
{
    public override string nazwa => "proba";
    const int SWIAT_W = 192, SWIAT_H = 240;

    readonly Camera cam = new Camera(800, 600) { zoom = KAMERA.start, x = 96, y = 30 };
    double plX, plY, plW, plH;
    double reszta;
    long tik;
    string ostatniKlawisz = "—", ostatniaAkcja = "—";
    double myszX, myszY;
    (double x, double y, double cx, double cy)? ciagniecie;
    int klikniecia;

    public override void rozmiar(double w, double h)
    {
        plX = EKRAN.ramaPlyty; plY = EKRAN.ramaPlyty;
        plW = w - 2 * EKRAN.ramaPlyty;
        plH = h - EKRAN.ramaPlyty - Math.Clamp(h * EKRAN.dolCzesc, EKRAN.dolMin, EKRAN.dolMax);
        cam.vw = plW; cam.vh = plH;
        cam.minZoom = Math.Max(KAMERA.minNaDuzymEkranie, plW / SWIAT_W);
        if (cam.zoom < cam.minZoom) cam.zoom = cam.minZoom;
        cam.clamp(SWIAT_W, SWIAT_H);
    }

    public override void krok(double dt, double teraz)
    {
        // zwykły czas: tyle tików na sekundę, niezależnie od tego, ile klatek pokazuje ekran (jak w game.ts)
        var naSekunde = TEMPO.tikowNaSekunde;
        reszta += dt / 1000 * naSekunde;
        var cale = Math.Floor(reszta);
        reszta -= cale;
        var kroki = Math.Min(Math.Max(TEMPO.maxNaKlatke, Math.Ceiling(naSekunde / 20)), cale);
        var t0 = Wydajnosc.Teraz();
        for (int i = 0; i < kroki; i++) tik++;
        Wydajnosc.licznik.dodaj(Czesc.logika, Wydajnosc.Teraz() - t0);
    }

    static double Los(int x, int y) { uint h = (uint)(x * 374761393 + y * 668265263); h = (h ^ (h >> 13)) * 1274126177; return (h & 0xFFFF) / 65535.0; }

    public override void rysuj(IPlotno ctx, double w, double h, double teraz)
    {
        var L = Wydajnosc.licznik;
        var t = Wydajnosc.Teraz();
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        // płyta: kafle świata (bloki 4×4 o barwie warstwy) i siatka
        ctx.save();
        ctx.beginPath();
        ctx.rect(plX, plY, plW, plH);
        ctx.clip();
        ctx.translate(plX, plY);
        ctx.fillStyle = "#14100d";
        ctx.fillRect(0, 0, plW, plH);
        int x0 = Math.Max(0, (int)Math.Floor(cam.toWorldX(0))), x1 = Math.Min(SWIAT_W, (int)Math.Ceiling(cam.toWorldX(plW)));
        int y0 = Math.Max(0, (int)Math.Floor(cam.toWorldY(0))), y1 = Math.Min(SWIAT_H, (int)Math.Ceiling(cam.toWorldY(plH)));
        for (int by = y0 / 4 * 4; by < y1; by += 4)
            for (int bx = x0 / 4 * 4; bx < x1; bx += 4)
            {
                var g = by / (double)SWIAT_H;
                var l = Los(bx, by) * 0.35 + 0.65;
                ctx.fillStyle = Barwa.Rgba((70 - g * 30) * l, (52 - g * 30) * l, (40 - g * 22) * l, 1);
                ctx.fillRect(cam.toScreenX(bx), cam.toScreenY(by), 4 * cam.zoom + 0.5, 4 * cam.zoom + 0.5);
            }
        if (cam.zoom >= 6)
        {
            ctx.strokeStyle = "rgba(236,222,190,0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (int x = x0; x <= x1; x++) { ctx.moveTo(cam.toScreenX(x), cam.toScreenY(y0)); ctx.lineTo(cam.toScreenX(x), cam.toScreenY(y1)); }
            for (int y = y0; y <= y1; y++) { ctx.moveTo(cam.toScreenX(x0), cam.toScreenY(y)); ctx.lineTo(cam.toScreenX(x1), cam.toScreenY(y)); }
            ctx.stroke();
        }
        // „postać”, która idzie w takt tików — płynność ruchu przy 120 tikach/s
        var px = 60 + (tik % 1440) / 1440.0 * 72;
        var gr = ctx.createRadialGradient(cam.toScreenX(px), cam.toScreenY(37), 0, cam.toScreenX(px), cam.toScreenY(37), cam.zoom * 4);
        gr.addColorStop(0, "rgba(255,214,110,0.55)");
        gr.addColorStop(1, "rgba(255,214,110,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = gr;
        ctx.fillRect(cam.toScreenX(px) - cam.zoom * 4, cam.toScreenY(37) - cam.zoom * 4, cam.zoom * 8, cam.zoom * 8);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#e0b068";
        ctx.beginPath();
        ctx.arc(cam.toScreenX(px), cam.toScreenY(37), cam.zoom * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(224,176,104,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(plX, plY, plW, plH);
        t = L.znacz(Czesc.swiat, t);

        // dół: kroje gry i stan wejścia
        var dy = plY + plH + 34;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#e8c482";
        ctx.font = $"600 30px {Fonts.KROJ_TYTUL}";
        ctx.fillText("Trzewia — C#, etap 1: okno, pętla, wejście", plX, dy);
        ctx.fillStyle = "rgba(236,222,190,0.92)";
        ctx.font = $"18px {Fonts.KROJ}";
        ctx.fillText("Trzewia Tekst: Zażółć gęślą jaźń — ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż", plX, dy + 30);
        ctx.font = $"italic 18px {Fonts.KROJ}";
        ctx.fillText("Trzewia Tekst, kursywa: Zażółć gęślą jaźń — ĄĆĘŁŃÓŚŹŻ", plX, dy + 54);
        ctx.font = $"20px {Fonts.KROJ_PISMO}";
        ctx.fillText("Trzewia Pismo: Zażółć gęślą jaźń — ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż", plX, dy + 80);
        ctx.font = $"15px {Fonts.KROJ}";
        ctx.fillStyle = "rgba(176,160,132,0.95)";
        var sek = Math.Floor(tik / TEMPO.tikowNaSekunde);
        ctx.fillText($"czas gry {sek / 60:00}:{sek % 60:00} ({tik} tików) · kamera {cam.x:F1}, {cam.y:F1}, przybliżenie {cam.zoom:F2} · " +
                     $"mysz {myszX:F0}, {myszY:F0} · kliknięcia {klikniecia} · klawisz „{ostatniKlawisz}” → {ostatniaAkcja}", plX, dy + 106);
        ctx.fillText("F3 — licznik wydajności · F11 — pełny ekran · kółko — przybliż · prawy albo środkowy przycisk — przesuń · " +
                     "C — kamera na środek · ] [ — przybliż, oddal", plX, dy + 126);
        ctx.textAlign = "right";
        ctx.fillText($"skala {ekran.skala:F3} · ekran logiczny {w:F0}×{h:F0}", w - EKRAN.ramaPlyty, dy + 30);
        L.znacz(Czesc.interfejs, t);
    }

    public override void dotyk(Wskaznik e, Faza faza)
    {
        myszX = e.clientX; myszY = e.clientY;
        if (faza == Faza.dol)
        {
            klikniecia++;
            if (e.button is 1 or 2) ciagniecie = (e.clientX, e.clientY, cam.x, cam.y);
        }
        else if (faza == Faza.ruch && ciagniecie is { } c)
        {
            cam.x = c.cx - (e.clientX - c.x) / cam.zoom;
            cam.y = c.cy - (e.clientY - c.y) / cam.zoom;
            cam.clamp(SWIAT_W, SWIAT_H);
        }
        else if (faza == Faza.gora) ciagniecie = null;
    }

    /// <summary>Kółko jak w game.ts: krok KAMERA.krokKolka, punkt pod kursorem zostaje na miejscu.</summary>
    public override void kolko(Kolko e)
    {
        var bx = cam.toWorldX(e.clientX - plX); var by = cam.toWorldY(e.clientY - plY);
        cam.zoom *= e.deltaY < 0 ? KAMERA.krokKolka : 1 / KAMERA.krokKolka;
        cam.clamp(SWIAT_W, SWIAT_H);
        cam.x += bx - cam.toWorldX(e.clientX - plX);
        cam.y += by - cam.toWorldY(e.clientY - plY);
        cam.clamp(SWIAT_W, SWIAT_H);
    }

    public override void klawisz(Akcja? akcja, Klawisz e)
    {
        ostatniKlawisz = e.key == " " ? "spacja" : e.key;
        ostatniaAkcja = akcja?.ToString() ?? "—";
        switch (akcja)
        {
            case Akcja.przyblizenie: cam.zoom = Math.Min(cam.maxZoom, cam.zoom * KAMERA.krokKlawisza); cam.clamp(SWIAT_W, SWIAT_H); break;
            case Akcja.oddalenie: cam.zoom = Math.Max(cam.minZoom, cam.zoom / KAMERA.krokKlawisza); cam.clamp(SWIAT_W, SWIAT_H); break;
            case Akcja.kamera: cam.x = 96; cam.y = 30; cam.zoom = KAMERA.start; cam.clamp(SWIAT_W, SWIAT_H); break;
        }
    }
}
}
