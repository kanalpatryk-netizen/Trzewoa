// Port: alpha-1/src/app/screens/bestiariusz.ts — atlas z menu: te same tablice, co w grze — tylko te, które już
// odkryłeś. Zastąpił bestiariusz, który był jedną długą kartą tekstu.
using System;
using Trzewia.Atlas;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyWygladAtlas;
using static Trzewia.Nastawy.NastawyWygladOzdoby;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    public sealed class EkranBestiariusza : Ekran
    {
        public override string nazwa => "bestiariusz";
        readonly OknoAtlasu okno = new OknoAtlasu();
        (double x, double y)? start;
        double ostatniY;
        bool przeciaga;
        string strona = "";
        readonly Tajemnica tajemnica = new Tajemnica();
        readonly IKontekst app;

        public EkranBestiariusza(IKontekst app) { this.app = app; }

        public override void wejdz(object? dane) { okno.otworzAtlas(); strona = okno.strona; app.gesty.kartka(); }

        public override void krok(double dt, double teraz)
        {
            // zamknięte okno atlasu to powrót do menu
            if (!okno.otwarte) { app.idz("menu"); return; }
            if (okno.strona != strona) { strona = okno.strona; app.gesty.kartka(); }
        }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            Ink.tloSadzy(ctx, w, h, teraz);
            tajemnica.brzegi(ctx, new ProstokatPlyty(0, 0, w, h), 0.5 + 0.5 * JsMath.Sin(teraz * 0.0006));
            okno.margines = Math.Max(RAMA.margines.min, Math.Min(RAMA.margines.max, w * RAMA.margines.czesc)) + 18;
            okno.rysuj(ctx, w, h, teraz, false);
            var waski = w < ATLAS.waskiPonizej;
            Ozdoby.ramaRyciny(ctx, w, h, 1, waski ? ATLAS.ramaGoraWaski : ATLAS.ramaGora, OknoAtlasu.zLiczbami(waski ? ATLAS.ramaDolWaski : ATLAS.ramaDol, Odkrycia.odkrycia.ile, Tablice.TABLICE.Length));
        }

        public override void kolko(Kolko e) => okno.kolko(e.deltaY * ATLAS.przewinKolko);

        public override void dotyk(Wskaznik e, Faza faza)
        {
            if (faza == Faza.dol) { start = (e.clientX, e.clientY); ostatniY = e.clientY; przeciaga = false; return; }
            if (faza == Faza.ruch)
            {
                okno.ruch(e.clientX, e.clientY);
                if (start == null) return;
                if (Math.Sqrt(Math.Pow(e.clientX - start.Value.x, 2) + Math.Pow(e.clientY - start.Value.y, 2)) > 8) przeciaga = true;
                if (przeciaga) { okno.kolko(-(e.clientY - ostatniY)); ostatniY = e.clientY; }
                return;
            }
            // puszczenie bez przeciągania to kliknięcie
            if (start != null && !przeciaga) okno.dotyk(e.clientX, e.clientY);
            start = null;
        }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (akcja == Akcja.menu && e.key != "Escape") { app.idz("menu"); return; }
            okno.klawisz(e.key);
        }
    }
}
