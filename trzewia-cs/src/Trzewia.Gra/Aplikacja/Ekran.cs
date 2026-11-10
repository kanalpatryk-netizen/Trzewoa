using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/app/screen.ts i context.ts
using Trzewia.Plotna;
using Trzewia.Rdzen;

namespace Trzewia.Aplikacja
{

/// <summary>
/// Każdy ekran gry — menu, samouczek, ustawienia, rozgrywka, kronika — mówi tym językiem. W TS to interfejs
/// z metodami opcjonalnymi; tu klasa bazowa z pustymi metodami (bez metod domyślnych w interfejsie, których
/// starsze Unity nie lubi).
/// </summary>
public abstract class Ekran
{
    public abstract string nazwa { get; }
    public virtual void wejdz(object? dane) { }
    public virtual void wyjdz() { }
    public abstract void krok(double dt, double teraz);
    public abstract void rysuj(IPlotno ctx, double w, double h, double teraz);
    public virtual void dotyk(Wskaznik e, Faza faza) { }
    public virtual void klawisz(Akcja? akcja, Klawisz e) { }
    public virtual void klawiszPuszczony(string k) { }
    public virtual void kolko(Kolko e) { }
    public virtual void rozmiar(double w, double h) { }
}

/// <summary>Wspólny kontekst: to, co każdy ekran może zawołać.</summary>
public interface IKontekst
{
    IPlotno ctx { get; }
    double w { get; }
    double h { get; }
    void idz(string nazwa, object? dane = null);
    void zarejestruj(Ekran ekran);
    Ekran? ekran(string nazwa);
}

/// <summary>
/// Okno, w którym gra się wyświetla — od gospodarza (Trzewia.exe: OknoGry na SDL3; w silniku: ekran albo widok
/// z teksturą). Rozmiar w pikselach ekranu i skala ekranu (Windows 125% → 1,25, jak devicePixelRatio).
/// </summary>
public interface IOknoGry
{
    int PikseleW { get; }
    int PikseleH { get; }
    double Dpr { get; }
    /// <summary>Okno dostało nową powierzchnię (zmiana rozmiaru) — App przelicza układ i zeruje znacznik.</summary>
    bool NowaPowierzchnia { get; set; }
    /// <summary>Kieruje płótno gry wprost do okna (wprost = true) albo na własną powierzchnię pw × ph (mniejszą niż okno).</summary>
    void Podepnij(IPlotno ctx, int pw, int ph, bool wprost);
    /// <summary>Płótno na własnej powierzchni — rozciągnięte gładko na całe okno (koniec klatki).</summary>
    void Rozciagnij(IPlotno ctx);
}
}
