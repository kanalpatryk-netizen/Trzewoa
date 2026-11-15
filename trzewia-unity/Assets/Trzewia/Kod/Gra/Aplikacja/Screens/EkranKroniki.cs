// Port: alpha-1/src/app/screens/kronika.ts — ekran końcowy: spisana legenda tego, czym byłeś dla tych, co w tobie mieszkali.
// Dane wejścia: Sim skończonej partii (w TS `{ sim }`).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladFreski;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    public sealed class EkranKroniki : Ekran
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);

        public override string nazwa => "kronika";
        Sim? sim;
        double od;
        sealed class Trafienie { public double x, y, w, h; public string id = ""; }
        List<Trafienie> trafienia = new List<Trafienie>();
        int wybrana;
        readonly (string id, string etykieta)[] opcje = { ("nowa", "Nowa gra"), ("menu", "Wróć do menu") };
        /// <summary>v4.1 beta: osiągnięcia z tej partii.</summary>
        Podsumowanie? podsumowanie;
        readonly IKontekst app;

        public EkranKroniki(IKontekst app) { this.app = app; }

        public override void wejdz(object? dane)
        {
            sim = dane as Sim;
            od = Wydajnosc.Teraz();
            wybrana = 0;
            podsumowanie = sim != null ? Osiagniecia.podsumujPartie(sim) : null;
            app.muzyka.ustawScene("koniec");
            app.muzyka.ustawNapiecie(0.2);
        }

        public override void krok(double dt, double teraz) { /* czas się skończył */ }

        (string tytul, string podtytul) naglowek()
        {
            var e = sim?.ending ?? "sen";
            var cz = e.Split(':');
            var rodzaj = cz[0]; var kto = cz.Length > 1 ? cz[1] : "undefined";
            if (rodzaj == "sen") return ("Zasnąłeś", "Nikt już o tobie nie myślał.");
            if (rodzaj == "uwolnienie") return ("Uwolnili cię", $"{kto} skruszyli Wielki Pomnik, a demon, który w nim spał, padł.");
            if (rodzaj == "upadek") return ("Upadek", "Nie został nikt, kto mógłby cię uwolnić.");
            return ("Zabili cię", $"{kto} dokopali się do rdzenia. Nie modlili się.");
        }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            var wiek = teraz - od;
            var wejscie = Math.Min(1, wiek / 1200);
            Ink.tloSadzy(ctx, w, h, teraz);

            // --- karta: prawdziwy papier z atramentem, bo to jest dokument, nie panel
            // niskie okno: drobniejsze pismo — wyrok i osiągnięcia muszą się zmieścić nad przyciskami
            var rozmiar = Math.Max(10, Math.Min(Math.Min(18, w / 74), h / 34));
            var kw = Math.Min(820, w * 0.78);
            // wyrok pod kartą: przyczyna, jak daleko zaszła droga i rada na następny raz —
            // liczony najpierw, bo od jego wysokości zależy, ile kroniki zmieści się na karcie
            var wr = sim != null ? Wyrok.wyrok(sim) : null;
            var wrW = Math.Min(760, w - 32);
            ctx.font = $"italic {S(rozmiar)}px {Ink.SERIF}";
            var wrLinie = new List<(string t, string k)>();
            if (wr != null)
            {
                wrLinie.AddRange(zlam(ctx, wr.przyczyna, wrW).Select(t => (t, "p")));
                wrLinie.AddRange(zlam(ctx, wr.etap, wrW).Select(t => (t, "e")));
                wrLinie.AddRange(zlam(ctx, wr.statystyki, wrW).Select(t => (t, "s")));
                wrLinie.AddRange(zlam(ctx, linijkaOsiagniec(), wrW).Select(t => (t, "e")));
                var rada = wr.rada.Length > 0 ? wr.rada.Substring(0, 1).ToLowerInvariant() + wr.rada.Substring(1) : "";
                wrLinie.AddRange(zlam(ctx, $"Następnym razem: {rada}", wrW).Select(t => (t, "r")));
            }
            var wrH = wrLinie.Count * rozmiar * 1.45;
            var dolne = h * 0.92;
            // długie wpisy łamiemy w obrębie karty — wcześniej wychodziły poza papier;
            // bierzemy tyle ostatnich, ile się zmieści
            ctx.font = $"{S(rozmiar)}px {Ink.SERIF}";
            var miejsceNaKarte = Math.Max(rozmiar * 8, dolne - rozmiar * 2.6 - wrH - h * 0.22 - rozmiar);
            var maxLinii = Math.Max(3, Math.Floor((Math.Min(h * 0.58, miejsceNaKarte) - 90) / (rozmiar * 1.75)));
            var linie = new List<(string text, string kind)>();
            if (sim != null)
                for (int j = sim.chronicle.Count - 1; j >= 0; j--)
                {
                    var e = sim.chronicle[j];
                    var kawalki = zlam(ctx, $"— {e.text}", kw * 0.84);
                    if (linie.Count + kawalki.Count > maxLinii) break;
                    linie.InsertRange(0, kawalki.Select((t, i) => (i != 0 ? $"   {t}" : t, e.kind)));
                }
            var kh = Math.Min(Math.Min(h * 0.58, miejsceNaKarte), 90 + linie.Count * rozmiar * 1.75);
            double kx = w / 2 - kw / 2, ky = h * 0.22;
            // fresk końca: archanioł z kulą przy wygranej, smutny święty przy przegranej. Pod wyrokiem,
            // gdy kronika jest krótka; obok karty, gdy jest tam miejsce; inaczej blado za tytułem
            var wygrana = (sim?.ending ?? "sen").StartsWith("uwolnienie");
            var fresk = wygrana ? FRESKI.koniecWygrana : FRESKI.koniecPrzegrana;
            var freskAlfa = Math.Min(1, Math.Max(0, (wiek - 600) / 1600));
            var podWyrokiem = ky + kh + rozmiar * 1.9 + wrH + rozmiar * 0.6;
            var podSpodem = dolne - rozmiar * 2.4 - podWyrokiem;
            var bokKroniki = (w - kw) / 2;
            if (podSpodem >= h * FRESKI.koniecPodSpodemOd)
            {
                var fh = Math.Min(podSpodem, h * 0.36);
                Freski.wpiszFresk(ctx, fresk, w / 2 - fh, podWyrokiem + (podSpodem - fh) / 2, fh * 2, fh, false, freskAlfa);
            }
            else if (bokKroniki >= FRESKI.koniecOdMarginesu)
            {
                double fw = bokKroniki - 32, fh = Math.Min(h * 0.5, fw * 1.6);
                var fy = Math.Max(h * 0.2, Math.Min(dolne - rozmiar * 3 - fh, ky + kh / 2 - fh / 2));
                Freski.wpiszFresk(ctx, fresk, 16, fy, fw, fh, false, freskAlfa);
            }
            else Freski.wpiszFresk(ctx, fresk, w * 0.2, h * 0.02, w * 0.6, h * 0.2, false, FRESKI.koniecZnakWodny * freskAlfa);

            var (tytul, podtytul) = naglowek();
            Ink.tytulRyty(ctx, tytul.ToUpperInvariant(), w / 2, h * 0.13, Math.Max(28, Math.Min(58, w / 19)), wejscie);
            ctx.textAlign = "center";
            ctx.font = $"italic {S(Math.Max(14, Math.Min(20, w / 58)))}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atrament, 0.75 * wejscie);
            ctx.fillText(podtytul, w / 2, h * 0.175);

            ctx.save();
            ctx.translate(kx + kw / 2, ky + kh / 2);
            ctx.rotate(-0.006 + JsMath.Sin(teraz * 0.0003) * 0.002);
            ctx.translate(-kw / 2, -kh / 2);

            var karta = new Path2D();
            karta.moveTo(0, 0);
            for (var i = 0; i <= 16; i++) karta.lineTo((i / 16.0) * kw, JsMath.Sin(i * 1.9) * 3);
            for (var i = 0; i <= 10; i++) karta.lineTo(kw + JsMath.Sin(i * 2.3) * 3, (i / 10.0) * kh);
            for (var i = 16; i >= 0; i--) karta.lineTo((i / 16.0) * kw, kh + JsMath.Sin(i * 2.7) * 3);
            for (var i = 10; i >= 0; i--) karta.lineTo(JsMath.Sin(i * 1.7) * 3, (i / 10.0) * kh);
            karta.closePath();

            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 8;
            ctx.fillStyle = rgba(BARWA.papier, 0.96 * wejscie);
            ctx.fill(karta);
            ctx.restore();
            ctx.strokeStyle = $"rgba(60,48,40,{S(0.35 * wejscie)})";
            ctx.lineWidth = 1;
            ctx.stroke(karta);

            ctx.save();
            ctx.clip(karta);
            // plamy i włókna papieru
            for (var i = 0; i < 18; i++)
            {
                double px = ((i * 137.5) % 1) * kw, py = ((i * 61.8) % 1) * kh;
                double r = 12 + ((i * 29) % 40);
                var g = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0, $"rgba(150,124,92,{S(0.05 * wejscie)})");
                g.addColorStop(1, "rgba(150,124,92,0)");
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            }

            ctx.textAlign = "left";
            ctx.font = $"600 {S(rozmiar * 1.05)}px {Ink.SERIF_TYTUL}";
            ctx.fillStyle = $"rgba(48,38,32,{S(0.9 * wejscie)})";
            ctx.fillText("KRONIKA", kw * 0.08, kh * 0.11);
            ctx.strokeStyle = $"rgba(70,56,46,{S(0.35 * wejscie)})";
            ctx.lineWidth = 1;
            Ink.kreska(ctx, kw * 0.08, kh * 0.135, kw * 0.92, kh * 0.135, 0.7, 26);

            for (int i = 0; i < linie.Count; i++)
            {
                var e = linie[i];
                var alfa = Math.Min(1, Math.Max(0, (wiek - 500 - i * 150) / 420));
                if (alfa <= 0) continue;
                ctx.font = $"{(e.kind == "koniec" ? "italic " : "")}{S(rozmiar)}px {Ink.SERIF}";
                var kolor = e.kind == "krew" ? "120,34,28" : e.kind == "wiara" ? "104,74,26" : e.kind == "otchlan" ? "70,72,88" : "46,38,32";
                ctx.fillStyle = $"rgba({kolor},{S(0.92 * alfa)})";
                // na niskim ekranie pierwsza linijka wchodziła na kreskę pod „KRONIKA”
                ctx.fillText(e.text, kw * 0.08, Math.Max(kh * 0.2, kh * 0.135 + rozmiar * 1.3) + i * rozmiar * 1.75);
            }

            // pieczęć: odcisk zamiast podpisu
            var pieczec = Math.Min(1, Math.Max(0, (wiek - 1800) / 900));
            if (pieczec > 0)
            {
                ctx.save();
                ctx.translate(kw * 0.84, kh * 0.87);
                ctx.rotate(-0.25);
                ctx.globalAlpha = pieczec * 0.65;
                ctx.strokeStyle = "rgba(126,28,24,0.9)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, kh * 0.09, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, kh * 0.07, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = "rgba(126,28,24,0.85)";
                ctx.font = $"600 {S(kh * 0.05)}px {Ink.SERIF_TYTUL}";
                ctx.textAlign = "center";
                ctx.fillText("TRZEWIA", 0, kh * 0.018);
                ctx.restore();
            }
            ctx.restore();
            ctx.restore();

            // --- wyrok
            if (wrLinie.Count > 0)
            {
                var alfa = Math.Min(1, Math.Max(0, (wiek - 1400) / 700));
                ctx.textAlign = "center";
                var y = ky + kh + rozmiar * 1.9;
                foreach (var l in wrLinie)
                {
                    ctx.font = $"{(l.k == "p" ? "" : "italic ")}{S(rozmiar)}px {Ink.SERIF}";
                    ctx.fillStyle = l.k == "p" ? rgba(BARWA.atramentMocny, 0.95 * alfa)
                        : l.k == "e" ? rgba(BARWA.zarBlady, 0.9 * alfa) : rgba(BARWA.atrament, 0.85 * alfa);
                    ctx.fillText(l.t, w / 2, y);
                    y += rozmiar * 1.45;
                }
            }

            // --- co dalej
            trafienia = new List<Trafienie>();
            ctx.textAlign = "center";
            for (int i = 0; i < opcje.Length; i++)
            {
                var o = opcje[i];
                var ox = w / 2 + (i == 0 ? -1 : 1) * Math.Min(220, w * 0.2);
                var wybrane = i == wybrana;
                ctx.font = $"{S(Math.Max(16, Math.Min(24, w / 48)))}px {Ink.SERIF}";
                ctx.fillStyle = rgba(wybrane ? BARWA.atramentMocny : BARWA.atrament, wybrane ? 0.98 : 0.7);
                ctx.fillText(o.etykieta, ox, dolne);
                var szer = ctx.measureText(o.etykieta).width;
                if (wybrane)
                {
                    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.5);
                    ctx.lineWidth = 1.2;
                    Ink.kreska(ctx, ox - szer / 2 - 6, dolne + 10, ox + szer / 2 + 6, dolne + 10, 1, 16);
                }
                trafienia.Add(new Trafienie { x = ox - szer / 2 - 16, y = dolne - 26, w = szer + 32, h = 44, id = o.id });
            }
        }

        /// <summary>„Nowe osiągnięcia: Przebudzenie, Jak kamień w studnię (3 z 11)”; pusto, gdy nic nowego.</summary>
        string linijkaOsiagniec()
        {
            var nowe = podsumowanie?.nowe ?? new List<Osiagniecie>();
            if (nowe.Count == 0) return "";
            return $"{(nowe.Count == 1 ? "Nowe osiągnięcie" : "Nowe osiągnięcia")}: {string.Join(", ", nowe.Select(o => o.nazwa))} ({Osiagniecia.zdobyte().Count} z {Osiagniecia.OSIAGNIECIA.Length})";
        }

        void uruchom(string id)
        {
            if (id == "nowa") app.idz("gra", "nowa");
            else app.idz("menu");
        }

        public override void dotyk(Wskaznik e, Faza faza)
        {
            var traf = trafienia.FirstOrDefault(t => e.clientX >= t.x && e.clientX <= t.x + t.w && e.clientY >= t.y && e.clientY <= t.y + t.h);
            if (traf == null) return;
            if (faza == Faza.ruch) { wybrana = Array.FindIndex(opcje, o => o.id == traf.id); return; }
            if (faza == Faza.dol) uruchom(traf.id);
        }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (e.key == "ArrowLeft" || e.key == "ArrowRight") { wybrana = 1 - wybrana; return; }
            if (e.key == "Enter" || e.key == " ") { uruchom(opcje[wybrana].id); return; }
            if (akcja == Akcja.menu) app.idz("menu");
        }

        /// <summary>Łamie wpis kroniki na linie mieszczące się na karcie.</summary>
        static List<string> zlam(IPlotno ctx, string tekst, double maxW)
        {
            var slowa = tekst.Split(' ');
            var wyn = new List<string>();
            var linia = "";
            foreach (var s in slowa)
            {
                var proba = linia != "" ? $"{linia} {s}" : s;
                if (ctx.measureText(proba).width > maxW && linia != "") { wyn.Add(linia); linia = s; }
                else linia = proba;
            }
            if (linia != "") wyn.Add(linia);
            return wyn;
        }
    }
}
