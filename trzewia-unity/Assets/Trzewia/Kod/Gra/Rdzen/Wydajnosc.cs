// Port: alpha-1/src/core/wydajnosc.ts
// Różnice (C#): zamiast „JS na klatkę” — czas procesora na klatkę; zamiast pracy wątku ryciny — czas karty
// graficznej na klatkę (zapytania czasu GL) i liczba sprzątań pamięci (GC), bo każde może szarpnąć klatką.
using System;
using System.Diagnostics;

namespace Trzewia.Rdzen
{

/// <summary>Części klatki, w kolejności, w jakiej licznik je wypisuje.</summary>
public enum Czesc { logika, rycina, swiat, mrok, poswiata, postacie, interfejs }

/// <summary>Wynik licznika z ostatniego okna pomiaru.</summary>
public sealed class WynikLicznika
{
    /// <summary>Klatki na sekundę, średni i najdłuższy odstęp między klatkami (ms).</summary>
    public double fps, klatkaMs, najdluzszaMs;
    /// <summary>Średni czas procesora na klatkę (logika i rysunek) i jego części; reszta to to, czego żadna część nie objęła.</summary>
    public double cpuMs;
    public readonly double[] czesci = new double[Wydajnosc.CZESCI.Length];
    public double resztaMs;
    /// <summary>Średni czas karty graficznej na klatkę (ms); -1 — karta nie umie tego zmierzyć.</summary>
    public double kartaMs = -1;
    /// <summary>Wysłanie obrazu do karty (flush Skii) i czekanie na monitor (swap) — ms na klatkę.</summary>
    public double wyslanieMs, czekanieMs;
    /// <summary>Sprzątania pamięci w oknie (pokolenie 0 i 2) i zajęta pamięć zarządzana (MB).</summary>
    public int gc0, gc2;
    public double pamiecMB;
}

/// <summary>
/// Licznik wydajności (F3 albo Ustawienia → Wydajność): ile klatek na sekundę widać, ile milisekund zabiera każda
/// część klatki i na jakiej karcie graficznej gra rysuje. Mierzy zawsze — to kilka odczytów zegara na klatkę —
/// a pokazuje tylko po włączeniu (Rysunek/LicznikWydajnosci.cs). Wynik odświeża się dwa razy na sekundę.
/// </summary>
public sealed class Wydajnosc
{
    public static readonly Czesc[] CZESCI = (Czesc[])Enum.GetValues(typeof(Czesc));

    public static string NazwaCzesci(Czesc c) => c switch
    {
        Czesc.logika => "logika gry",
        Czesc.rycina => "rycina świata",
        Czesc.swiat => "świat",
        Czesc.mrok => "mrok",
        Czesc.poswiata => "poświata",
        Czesc.postacie => "postacie, efekty",
        _ => "interfejs",
    };

    /// <summary>Jeden licznik na całą grę (w TS: export const licznik).</summary>
    public static readonly Wydajnosc licznik = new Wydajnosc();

    /// <summary>Co tyle ms licznik podaje nowy wynik (średnie z tego okna).</summary>
    const double OKNO_MS = 500;

    static readonly double MsNaTakt = 1000.0 / Stopwatch.Frequency;

    /// <summary>Czas w ms z zegara wysokiej rozdzielczości (jak performance.now()).</summary>
    public static double Teraz() => Stopwatch.GetTimestamp() * MsNaTakt;

    public WynikLicznika wynik = new WynikLicznika();

    double[] suma = new double[CZESCI.Length];
    int klatek;
    double sumaCpu, odOkna, poprzednia, najdluzsza;
    double sumaKarty; int ileKarty;
    double sumaWyslania, sumaCzekania;
    int gc0Start = GC.CollectionCount(0), gc2Start = GC.CollectionCount(2);

    /// <summary>Dolicza czas od `od` do teraz do części `c` i zwraca teraz — kolejne odcinki klatki mierzy się łańcuchem.</summary>
    public double znacz(Czesc c, double od)
    {
        var t = Teraz();
        suma[(int)c] += t - od;
        return t;
    }

    public void dodaj(Czesc c, double ms) => suma[(int)c] += ms;

    /// <summary>Wynik zapytania czasu karty graficznej (przychodzi z opóźnieniem kilku klatek).</summary>
    public void Karta(double ms) { sumaKarty += ms; ileKarty++; }

    /// <summary>Wysłanie klatki do karty (flush) i czekanie na monitor (swap) — mierzone w Okno.Pokaz.</summary>
    public void Wyslanie(double wyslanieMs, double czekanieMs) { sumaWyslania += wyslanieMs; sumaCzekania += czekanieMs; }

    /// <summary>Koniec klatki (App): czas klatki i ile ms zajął w niej procesor (logika i rysunek).</summary>
    public void klatka(double teraz, double cpuMs)
    {
        if (poprzednia != 0)
        {
            var odstep = teraz - poprzednia;
            // długa przerwa (okno zminimalizowane, ekran ładowania) nie jest klatką — zaczyna pomiar od nowa
            if (odstep > 1000) { Zeruj(teraz); return; }
            if (odstep > najdluzsza) najdluzsza = odstep;
        }
        poprzednia = teraz;
        if (odOkna == 0) odOkna = teraz;
        klatek++;
        sumaCpu += cpuMs;
        var uplynelo = teraz - odOkna;
        if (uplynelo < OKNO_MS || klatek < 2) return;
        var n = klatek;
        var w = new WynikLicznika();
        double razem = 0;
        for (int i = 0; i < CZESCI.Length; i++) { w.czesci[i] = suma[i] / n; razem += w.czesci[i]; }
        w.cpuMs = sumaCpu / n;
        w.fps = n * 1000 / uplynelo;
        w.klatkaMs = uplynelo / n;
        w.najdluzszaMs = najdluzsza;
        w.resztaMs = Math.Max(0, w.cpuMs - razem);
        // wyniki karty przychodzą z opóźnieniem kilku klatek — okno bez wyniku zostawia poprzedni
        w.kartaMs = ileKarty > 0 ? sumaKarty / ileKarty : (InfoKarty.CzasKarty ? wynik.kartaMs : -1);
        w.wyslanieMs = sumaWyslania / n;
        w.czekanieMs = sumaCzekania / n;
        int g0 = GC.CollectionCount(0), g2 = GC.CollectionCount(2);
        w.gc0 = g0 - gc0Start; w.gc2 = g2 - gc2Start;
        gc0Start = g0; gc2Start = g2;
        w.pamiecMB = GC.GetTotalMemory(false) / (1024.0 * 1024.0);
        wynik = w;
        Zeruj(teraz);
    }

    void Zeruj(double teraz)
    {
        Array.Clear(suma, 0, suma.Length);
        klatek = 0;
        sumaCpu = 0;
        najdluzsza = 0;
        sumaKarty = 0; ileKarty = 0;
        sumaWyslania = 0; sumaCzekania = 0;
        odOkna = teraz;
        poprzednia = teraz;
    }
}
}
