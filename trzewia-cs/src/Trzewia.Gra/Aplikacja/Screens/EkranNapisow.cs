// Oprawa walki, etap 7b (docs/plan-oprawy-cerber.md; użytkownik 22.11, film 4:02): miejsce na napisy końcowe. Po
// wygranej w Kręgu Trzecim (Cerber pada, scena jego śmierci) napisy płyną w górę jak w kinie — blade litery na czerni,
// jak napisy przerywników — ostatnia linijka zostaje na środku, obraz gaśnie i jest kronika. Treść: NapisyKoncowe.TEKST.
// Spacja / Esc / Enter / klik — od razu kronika. Przegrana idzie do kroniki bez napisów.
using System;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using R = Trzewia.Aplikacja.NapisyKoncowe.Rodzaj;
using JS = Trzewia.Js.Js;

namespace Trzewia.Aplikacja
{
    public sealed class EkranNapisow : Ekran
    {
        public override string nazwa => "napisy";

        /// <summary>Przewijanie: tyle wysokości ekranu na sekundę.</summary>
        const double PREDKOSC = 0.075;
        /// <summary>Ostatnia linijka stoi na środku tyle ms, potem obraz gaśnie przez tyle ms.</summary>
        const double STOI_MS = 2600, GASNIE_MS = 900;

        Sim? sim;
        double od = -1, koniecMs;
        bool poszlo;
        readonly IKontekst app;

        public EkranNapisow(IKontekst app) { this.app = app; }

        /// <summary>Czy po tej partii są napisy: wygrana w Kręgu Trzecim (ze zmianami Kręgu — bez nich Krąg jest jak w TS).</summary>
        public static bool PoPartii(Sim? sim) => sim != null && ZmianyKregu.Aktywne && (sim.ending ?? "").StartsWith("uwolnienie");

        public override void wejdz(object? dane)
        {
            sim = dane as Sim;
            od = -1; koniecMs = 0; poszlo = false;
            app.muzyka.ustawScene("koniec");
            app.muzyka.ustawNapiecie(0.2);
        }

        public override void krok(double dt, double teraz)
        {
            // zegar od pierwszej klatki ekranu (nie od zegara komputera — w nagraniu bez okna czas płynie inaczej)
            if (od < 0) od = teraz;
            if (koniecMs > 0 && teraz - od >= koniecMs) dalej();
        }

        void dalej()
        {
            if (poszlo) return;
            poszlo = true;
            app.idz("kronika", sim);
        }

        public override void dotyk(Wskaznik e, Faza faza) { if (faza == Faza.dol) dalej(); }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (akcja == Akcja.menu || akcja == Akcja.pauza || e?.key == "Enter" || e?.key == " " || e?.key == "Escape") dalej();
        }

        /// <summary>Wielkość litery i odstęp do następnej linijki (w „r” — jednostce z wysokości ekranu).</summary>
        static (double litera, double odstep) miara(R rodzaj) => rodzaj switch
        {
            R.Tytul => (3.0, 3.6),
            R.Podtytul => (1.35, 3.2),
            R.Dzial => (0.9, 1.7),
            R.Linijka => (1.25, 1.9),
            R.Ostatnia => (1.9, 0),
            _ => (0, 2.0),
        };

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            if (od < 0) od = teraz;
            var t = (teraz - od) / 1000.0;
            var r = Math.Max(13, Math.Min(34, h / 38));
            ctx.save();
            ctx.fillStyle = "rgb(5,4,4)"; ctx.fillRect(0, 0, w, h);
            // łuna od dołu — piekło jest niżej
            var lg = ctx.createRadialGradient(w / 2, h * 1.25, 0, w / 2, h * 1.25, h * 1.1);
            lg.addColorStop(0, "rgba(120,30,14,0.35)"); lg.addColorStop(1, "rgba(40,8,4,0)");
            ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);

            // układ: wysokość bloku do ostatniej linijki; ta staje na środku ekranu i tam zostaje
            double doOstatniej = 0;
            foreach (var (rodzaj, _) in NapisyKoncowe.TEKST) { if (rodzaj == R.Ostatnia) break; doOstatniej += miara(rodzaj).odstep * r; }
            var v = PREDKOSC * h;
            var start = h * 1.05;                                   // pierwsza linijka startuje tuż pod ekranem
            var drogaS = (start + doOstatniej - h / 2) / v;         // aż ostatnia stanie na środku
            koniecMs = (drogaS * 1000) + STOI_MS + GASNIE_MS;
            var y = start - v * Math.Min(t, drogaS);

            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = r * 0.5;
            foreach (var (rodzaj, tekst) in NapisyKoncowe.TEKST)
            {
                var (litera, odstep) = miara(rodzaj);
                if (tekst.Length > 0 && y > -r * 4 && y < h + r * 4)
                {
                    // brzegi ekranu: linijki wchodzą i schodzą z ciemności
                    var a = Math.Max(0, Math.Min(1, Math.Min(y / (h * 0.16), (h - y) / (h * 0.16))));
                    if (rodzaj == R.Ostatnia) a = Math.Max(a, Math.Min(1, Math.Max(0, (t - drogaS + 1.2) / 1.2)));
                    ctx.globalAlpha = a;
                    ctx.font = rodzaj switch
                    {
                        R.Tytul => $"600 {JS.S(r * litera)}px {Ink.SERIF_TYTUL}",
                        R.Dzial => $"600 {JS.S(r * litera)}px {Ink.SERIF_TYTUL}",
                        R.Podtytul or R.Ostatnia => $"italic {JS.S(r * litera)}px {Ink.SERIF}",
                        _ => $"{JS.S(r * litera)}px {Ink.SERIF}",
                    };
                    ctx.fillStyle = rodzaj switch
                    {
                        R.Tytul => "rgb(236,222,190)",
                        R.Dzial => "rgb(176,138,82)",
                        R.Podtytul => "rgb(196,170,140)",
                        _ => "rgb(224,218,200)",
                    };
                    // nagłówki działów: rozstrzelone litery, jak na kamieniu
                    var napis = rodzaj == R.Dzial ? string.Join(" ", tekst.ToCharArray()) : tekst;
                    ctx.fillText(napis, w / 2, y);
                }
                y += odstep * r;
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // koniec: obraz gaśnie, potem kronika
            var gasnie = (t * 1000 - (drogaS * 1000 + STOI_MS)) / GASNIE_MS;
            if (gasnie > 0) { ctx.fillStyle = Barwa.Rgba(0, 0, 0, Math.Min(1, gasnie)); ctx.fillRect(0, 0, w, h); }
            ctx.font = $"italic {JS.S(r * 0.7)}px {Ink.SERIF}"; ctx.fillStyle = "rgba(170,160,140,0.5)"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
            ctx.fillText("Esc — pomiń", w - r, h - r * 0.6);
            ctx.restore();
        }
    }
}
