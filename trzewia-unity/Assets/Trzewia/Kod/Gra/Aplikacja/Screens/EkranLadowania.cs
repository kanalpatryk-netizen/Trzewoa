// Port: alpha-1/src/app/screens/ladowanie.ts — ekran ładowania.
// W TS etap biegnie w mikrozadaniu Promise zaraz po narysowaniu klatki; tu biegnie na początku następnego kroku —
// kolejność ta sama: klatka pokazuje nazwę etapu, potem etap się wykonuje, potem następna klatka bierze kolejny.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyEkran;
using static Trzewia.Rdzen.SettingsStore;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    /// <summary>Jeden krok ładowania: napis dla gracza i robota.</summary>
    public sealed class Etap { public string nazwa = ""; public Action zrob = () => { }; }

    /// <summary>
    /// Ekran ładowania. Najpierw mierzy ekran i ustawia skalę (to robi App przy starcie),
    /// potem po jednym etapie na klatkę: kroje pisma, świat, ekrany, ryciny, tablice.
    /// Obraz: przekrój góry, przez który złota kreska drąży szyb w dół — gdy dojdzie
    /// do rdzenia, rdzeń zaczyna bić i gra przechodzi do menu. Na nic nie czeka: zwykle
    /// w ogóle go nie widać, bo przez całe ładowanie leci nad nim film intro.
    /// </summary>
    public sealed class EkranLadowania : Ekran
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);

        public override string nazwa => "ladowanie";
        int zrobione;
        string biezacy = "";
        bool pracuje;
        Etap? oczekujacy;
        double start;
        double koniecOd;
        string blad = "";
        readonly IKontekst app;
        readonly List<Etap> etapy;
        readonly Action potem;
        readonly Func<bool>? zaslona;

        /// <summary>
        /// `zaslona` — póki zwraca true, coś zasłania ekran (film intro): ładowanie idzie pod spodem i gra
        /// nie przechodzi dalej. Gdy zasłona zniknie, a wszystko gotowe — od razu menu.
        /// </summary>
        public EkranLadowania(IKontekst app, List<Etap> etapy, Action potem, Func<bool>? zaslona = null)
        {
            this.app = app; this.etapy = etapy; this.potem = potem; this.zaslona = zaslona;
        }

        public override void wejdz(object? dane) { start = Wydajnosc.Teraz(); }

        /// <summary>Ułamek postępu 0..1.</summary>
        double postep => etapy.Count > 0 ? (double)zrobione / etapy.Count : 1;

        public override void krok(double dt, double teraz)
        {
            if (blad != "") return;
            // etap zaplanowany w poprzedniej klatce (w TS: mikrozadanie po jej narysowaniu)
            if (oczekujacy != null)
            {
                var e0 = oczekujacy; oczekujacy = null;
                try { e0.zrob(); zrobione++; pracuje = false; }
                catch (Exception err) { blad = $"{e0.nazwa}: {err.Message}"; Dziennik.Pisz($"ładowanie — {blad}\n{err}"); return; }
                // w TS następny etap rusza dopiero w kolejnej klatce
                return;
            }
            if (zrobione >= etapy.Count)
            {
                // gotowe: po intro prosto do menu; bez intro nie znikamy szybciej niż minimalny czas
                // i dajemy chwilę na wygaszenie
                if (zaslona != null) { if (!zaslona()) potem(); return; }
                if (koniecOd == 0) koniecOd = Math.Max(teraz, start + LADOWANIE.minCzasMs);
                if (teraz >= koniecOd + LADOWANIE.wygaszenieMs) potem();
                return;
            }
            if (pracuje) return;
            // jeden etap na klatkę: ekran zdąży się narysować, a pasek naprawdę idzie
            var e = etapy[zrobione];
            biezacy = e.nazwa;
            pracuje = true;
            oczekujacy = e;
        }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            Ink.tloSadzy(ctx, w, h, teraz);
            var wyg = koniecOd != 0 ? Math.Max(0, Math.Min(1, (teraz - koniecOd) / LADOWANIE.wygaszenieMs)) : 0;
            var alfa = 1 - wyg;
            var k = Math.Min(w, h);

            // tytuł — dopasowany do szerokości ekranu
            var rt0 = Math.Max(26, Math.Min(96, Math.Min(w / 10, h / 7)));
            var rt = Ozdoby.dopasujKartusz(ctx, LADOWANIE.tytul, rt0, w * 0.86);
            Ozdoby.kartusz(ctx, w / 2, h * 0.17 + rt * 0.4, LADOWANIE.tytul, rt, alfa);

            // przekrój góry: kontur, szyb i rdzeń na dnie
            double cx = w / 2, gy = h * 0.34, dy = h * 0.8;
            var szer = Math.Min(w * 0.7, k * 0.9);
            var R = Math.Max(10, k * 0.035);
            var ry = dy - R * 1.6;
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.strokeStyle = rgba(BARWA.atrament, 0.55);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (var i = 0; i <= 40; i++)
            {
                var t = i / 40.0;
                var x = cx - szer / 2 + t * szer;
                var s = Math.Max(Math.Exp(-Math.Pow((t - 0.56) / 0.2, 2)), 0.72 * Math.Exp(-Math.Pow((t - 0.3) / 0.16, 2)));
                var y = dy - (s * 0.85 + 0.1) * (dy - gy) * Math.Pow(JsMath.Sin(t * Math.PI), 0.6);
                if (i == 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            // warstwy skały
            ctx.strokeStyle = rgba(BARWA.atrament, 0.14);
            for (var l = 1; l <= 4; l++)
            {
                var y = gy + (dy - gy) * (0.2 + l * 0.16);
                ctx.beginPath(); ctx.moveTo(cx - szer * 0.42, y); ctx.bezierCurveTo(cx - szer * 0.1, y - 6, cx + szer * 0.1, y + 6, cx + szer * 0.42, y); ctx.stroke();
            }
            // szyb: przerywana droga od szczytu do rdzenia, złota do miejsca, gdzie jest postęp
            var punkty = new (double x, double y)[]
            {
                (cx + szer * 0.06, gy + (dy - gy) * 0.12), (cx - szer * 0.08, gy + (dy - gy) * 0.35),
                (cx + szer * 0.07, gy + (dy - gy) * 0.55), (cx - szer * 0.03, gy + (dy - gy) * 0.72), (cx, ry - R * 1.3),
            };
            var plynny = Math.Min(postep + (pracuje ? 0.5 / Math.Max(1, etapy.Count) : 0), 1);
            var ile = plynny * (punkty.Length - 1);
            ctx.setLineDash(3, 5);
            ctx.strokeStyle = rgba(BARWA.atramentCichy, 0.35);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); for (int i = 0; i < punkty.Length; i++) { if (i != 0) ctx.lineTo(punkty[i].x, punkty[i].y); else ctx.moveTo(punkty[i].x, punkty[i].y); } ctx.stroke();
            ctx.setLineDash();
            ctx.strokeStyle = rgba(BARWA.zarBlady, 0.95);
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(punkty[0].x, punkty[0].y);
            double gx = punkty[0].x, gyy = punkty[0].y;
            for (var i = 1; i < punkty.Length; i++)
            {
                var f = Math.Max(0, Math.Min(1, ile - (i - 1)));
                if (f <= 0) break;
                gx = punkty[i - 1].x + (punkty[i].x - punkty[i - 1].x) * f;
                gyy = punkty[i - 1].y + (punkty[i].y - punkty[i - 1].y) * f;
                ctx.lineTo(gx, gyy);
            }
            ctx.stroke();
            // grot kilofa na czole szybu
            ctx.fillStyle = rgba(BARWA.zar, 0.6 + 0.4 * JsMath.Sin(teraz * 0.01));
            ctx.beginPath(); ctx.arc(gx, gyy, 3, 0, Math.PI * 2); ctx.fill();
            // skorupa i rdzeń: bije dopiero, gdy wszystko gotowe
            ctx.strokeStyle = rgba(BARWA.atrament, 0.4);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, ry, R * 1.7, 0, Math.PI * 2); ctx.stroke();
            var gotowe = zrobione >= etapy.Count;
            var uderz = gotowe ? RysRdzen.tetnoRdzenia(teraz) : 0.15;
            var halo = ctx.createRadialGradient(cx, ry, 0, cx, ry, R * 5);
            halo.addColorStop(0, $"rgba(255,120,80,{S((gotowe ? 0.45 : 0.18) + 0.15 * uderz)})");
            halo.addColorStop(1, "rgba(120,20,20,0)");
            ctx.fillStyle = halo;
            ctx.fillRect(cx - R * 5, ry - R * 5, R * 10, R * 10);
            RysRdzen.rysujSerce(ctx, cx, ry, R * (1 + 0.05 * uderz), uderz, gotowe);
            ctx.restore();

            // napis etapu i procent — pod rdzeniem, zawsze w obrębie ramy
            var rozm = Math.Max(12, Math.Min(20, k / 34));
            ctx.save();
            ctx.globalAlpha = alfa;
            ctx.textAlign = "center";
            ctx.font = $"italic {S(rozm)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(blad != "" ? BARWA.krewJasna : BARWA.atrament, 0.9);
            var napis = blad != "" ? blad : (gotowe ? LADOWANIE.gotowe : $"{biezacy}…");
            var ny = Math.Min(h - rozm * 3.6, dy + rozm * 1.8);
            ctx.fillText(napis, w / 2, ny, w * 0.86);
            ctx.font = $"{S(rozm * 0.8)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.8);
            var skala = JS.ToFixed(ekran.skala, 2).Replace(".", ",");
            // innerWidth × innerHeight: rozmiar okna w pikselach CSS = piksele logiczne × skala
            ctx.fillText($"{S(Math.Floor(postep * 100 + 0.5))}% · ekran {S(Math.Floor(w * ekran.skala + 0.5))}×{S(Math.Floor(h * ekran.skala + 0.5))} · skala {skala}", w / 2, ny + rozm * 1.5, w * 0.86);
            ctx.restore();

            Ozdoby.ramaRyciny(ctx, w, h, alfa, w < 700 ? "Trzewia" : "Trzewia · góra się budzi", w < 700 ? "" : "Tab. 0 — zanim otworzysz oczy");
        }
    }
}
