using System;
using System.Collections.Generic;
using System.Linq;
// Port: alpha-1/src/render/straz-klatek.ts
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyEkran;

namespace Trzewia.Rysunek
{

/// <summary>
/// Strażnik klatek: liczy klatki w oknie pomiaru i mówi, czy przez całe okno
/// szły wolniej niż próg z nastaw JAKOSC. Długa przerwa (okno w tle) zeruje pomiar.
/// </summary>
public sealed class StrazKlatek
{
    double od, ostatnia;
    int klatek;

    public void zeruj() { od = 0; ostatnia = 0; klatek = 0; }

    /// <summary>Wołane raz na klatkę; true = w tym oknie było za mało klatek.</summary>
    public bool klatka(double teraz)
    {
        if (od == 0 || teraz - ostatnia > JAKOSC.przerwaMs)
        {
            od = teraz; ostatnia = teraz; klatek = 0;
            return false;
        }
        ostatnia = teraz;
        klatek++;
        var uplynelo = teraz - od;
        if (uplynelo < JAKOSC.oknoMs) return false;
        var naSekunde = klatek * 1000 / uplynelo;
        od = teraz; klatek = 0;
        return naSekunde < JAKOSC.progKlatek;
    }
}
}
