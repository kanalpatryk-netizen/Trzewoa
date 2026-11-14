// Port: alpha-1/src/app/screens/osiagniecia.ts — OSIĄGNIĘCIA (Remake v2): spis celów dodatkowych.
// Każde ma medalion z fresku (FRESKI.medaliony): zdobyte w kolorze, niezdobyte wyblakłe i przygaszone, ale ich opis
// widać — to podpowiedź, jak grać inaczej.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladFreski;
using JS = Trzewia.Js.Js;

namespace Trzewia.Aplikacja
{
    public sealed class EkranOsiagniec : Ekran
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);

        public override string nazwa => "osiagniecia";
        double od;
        int wybrana;
        sealed class Trafienie { public double x, y, w, h; public string id = ""; }
        List<Trafienie> trafienia = new List<Trafienie>();
        readonly (string id, string etykieta)[] opcje = { ("menu", "Wróć do menu") };
        readonly IKontekst app;

        public EkranOsiagniec(IKontekst app) { this.app = app; }

        public override void wejdz(object? dane)
        {
            od = Wydajnosc.Teraz();
            wybrana = 0;
        }

        public override void krok(double dt, double teraz) { /* spis stoi */ }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            var wejscie = Math.Min(1, (teraz - od) / 600);
            Ink.tloSadzy(ctx, w, h, teraz);
            var maja = Osiagniecia.zdobyte();
            var OS = Osiagniecia.OSIAGNIECIA;
            Ink.tytulRyty(ctx, "OSIĄGNIĘCIA", w / 2, h * 0.11, Math.Max(26, Math.Min(52, w / 20)), wejscie);
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.font = $"italic {S(Math.Max(13, Math.Min(18, w / 64)))}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atrament, 0.8 * wejscie);
            ctx.fillText($"zdobyte {OS.Count(o => maja.Contains(o.id))} z {OS.Length}", w / 2, h * 0.11 + Math.Max(22, Math.Min(36, w / 34)));

            // spis: dwie kolumny na szerokim ekranie, jedna na wąskim; pismo maleje, aż się zmieści
            var kolumn = w >= 560 ? 2 : 1;
            var wierszy = (int)Math.Ceiling(OS.Length / (double)kolumn);
            var gora = h * 0.11 + Math.Max(48, Math.Min(72, w / 18));
            var dol = h * 0.84;
            var szerKol = Math.Min(460, (w - 48) / kolumn - 16);
            var rozmiar = Math.Max(11, Math.Min(19, w / 60));
            while (rozmiar > 9 && wierszy * rozmiar * 2.6 > dol - gora) rozmiar -= 0.5;
            var wiersz = (dol - gora) / wierszy;
            // bardzo niskie okno: same nazwy — opis i tak przeczytasz w większym
            var zOpisem = wiersz >= rozmiar * 2.2;
            var lewy0 = w / 2 - (kolumn * szerKol + (kolumn - 1) * 32) / 2;
            ctx.textAlign = "left";
            for (int i = 0; i < OS.Length; i++)
            {
                var o = OS[i];
                var kol = kolumn == 2 ? (i < wierszy ? 0 : 1) : 0;
                var nr = kolumn == 2 ? (i < wierszy ? i : i - wierszy) : i;
                double x = lewy0 + kol * (szerKol + 32), y = gora + nr * wiersz + rozmiar;
                var ma = maja.Contains(o.id);
                var alfa = wejscie * (ma ? 1 : 0.7);
                // medalion z fresku: zdobyty w kolorze, niezdobyty wyblakły
                var r = Math.Min(rozmiar * 1.15, wiersz * 0.42);
                Freski.medalion(ctx, FRESKI.medaliony.TryGetValue(o.id, out var md) ? md : "zloto", x + r, y - rozmiar * 0.35 + (zOpisem ? rozmiar * 0.5 : 0), r, ma, wejscie);
                var tx = x + r * 2 + rozmiar * 0.6;
                ctx.font = $"{S(rozmiar)}px {Ink.SERIF}";
                ctx.fillStyle = rgba(ma ? BARWA.atramentMocny : BARWA.atrament, alfa);
                ctx.fillText(o.nazwa, tx, y, szerKol - (tx - x));
                if (zOpisem)
                {
                    ctx.font = $"italic {S(rozmiar * 0.8)}px {Ink.SERIF}";
                    ctx.fillStyle = rgba(ma ? BARWA.zarBlady : BARWA.atramentCichy, 0.9 * alfa);
                    ctx.fillText(o.opis, tx, y + rozmiar * 1.15, szerKol - (tx - x));
                }
            }

            // co dalej
            trafienia = new List<Trafienie>();
            ctx.textAlign = "center";
            var dolne = h * 0.93;
            for (int i = 0; i < opcje.Length; i++)
            {
                var op = opcje[i];
                var ox = w / 2;
                var wybrane = i == wybrana;
                ctx.font = $"{S(Math.Max(16, Math.Min(24, w / 48)))}px {Ink.SERIF}";
                ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, wybrane ? 0.98 : 0.7);
                ctx.fillText(op.etykieta, ox, dolne);
                var szer = ctx.measureText(op.etykieta).width;
                if (wybrane)
                {
                    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5);
                    ctx.lineWidth = 1.2;
                    Ink.kreska(ctx, ox - szer / 2 - 6, dolne + 10, ox + szer / 2 + 6, dolne + 10, 1, 16);
                }
                trafienia.Add(new Trafienie { x = ox - szer / 2 - 16, y = dolne - 26, w = szer + 32, h = 44, id = op.id });
            }
        }

        void uruchom(string _id) => app.idz("menu");

        public override void dotyk(Wskaznik e, Faza faza)
        {
            var traf = trafienia.FirstOrDefault(t => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
            if (traf == null) return;
            if (faza == Faza.ruch) { wybrana = Array.FindIndex(opcje, o => o.id == traf.id); return; }
            if (faza == Faza.dol) uruchom(traf.id);
        }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (e.key == "Enter" || e.key == " ") { uruchom(opcje[wybrana].id); return; }
            if (akcja == Akcja.menu) app.idz("menu");
        }
    }
}
