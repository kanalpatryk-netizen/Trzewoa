// Port: alpha-1/src/render/wydarzenie.ts — karta wydarzenia: co się dzieje, a pod spodem wybory — każdy jako duże pole
// z ceną po prawej i jednym zdaniem skutku. Czas stoi, póki nie wybierzesz. Na co cię nie stać, jest przygaszone
// i ma cenę na czerwono. Karta to jasna tablica tynku jak fresk z Faras: u góry fryz z tancerzami (Arlanza),
// po lewej wycinek malowidła dobrany do wydarzenia (FRESKI.wydarzenia).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyWygladFreski;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Pole karty: wybór `i` albo (pokaz) link „pokaż miejsce” — kamera jedzie tam tylko na prośbę gracza.</summary>
    public sealed class PoleWyboru { public int i; public double x, y, w, h; public bool pokaz; }

    public static class RysWydarzenie
    {
        /// <summary>Pismo na jasnym tynku: brąz, sinopia i czerwień ziemi zamiast jasnego atramentu.</summary>
        static class PISMO
        {
            public static Styl naglowek => FRESK.czerwien;
            public const string tytul = "#2a1810", tekst = "rgba(58,38,24,0.92)",
                wybor = "#2a1810", wyborNie = "rgba(80,62,48,0.72)", skutek = "rgba(62,40,26,0.9)", skutekNie = "rgba(80,62,48,0.62)",
                cena = "#7e2c16", cenaNie = "#c0301c", ramka = "rgba(142,58,34,0.8)", ramkaNie = "rgba(110,90,70,0.4)", stopka = "rgba(90,64,44,0.8)";
        }

        sealed class Przycisk { public int lEt, lSk; public double h; }
        sealed class Uklad { public double rz, fh, wew, h; public int lTekst; public List<Przycisk> przyc = null!; }

        public static List<PoleWyboru> rysujWydarzenie(IPlotno ctx, Plate p, Sim sim, Wydarzenie e, double teraz)
        {
            var szer = p.waski ? p.w - 16 : Math.Min(600, Math.Max(340, p.w * (p.niski ? 0.66 : 0.55)));
            var maxWys = p.h - 16;
            string cena(int i)
            {
                var w = e.wybory[i];
                var cz = new List<string>();
                if (w.krew != 0) cz.Add($"{Js.Js.S(w.krew)} krwi");
                if (w.wiara != 0) cz.Add($"{Js.Js.S(w.wiara)} wiary");
                return cz.Count > 0 ? string.Join(" · ", cz) : "za darmo";
            }
            bool stac(int i) => sim.krew - sim.rezerwa.krew >= e.wybory[i].krew && sim.wiara - sim.rezerwa.wiara >= e.wybory[i].wiara;

            // fresk po lewej tylko na szerokiej karcie, fryz tylko na wysokiej płycie
            var ilW = szer >= FRESKI.ilustracjaOdSzerokosci ? szer * FRESKI.ilustracjaCzesc : 0;
            var zFryzem = p.h >= FRESKI.fryzOdWysokosci;
            // układ liczony przed rysowaniem — karta musi się zmieścić na płycie, więc litery maleją
            Uklad zmierz(double rz)
            {
                var fh = zFryzem ? rz * FRESKI.fryzWys : 0;
                var wew = szer - ilW - rz * 2.2;
                ctx.save();
                ctx.font = $"italic {Js.Js.S(rz * 0.9)}px {Ink.SERIF}";
                var lTekst = Ink.linieAkapitu(ctx, e.tekst, wew);
                var przyc = e.wybory.Select((w, i) =>
                {
                    ctx.font = $"{Js.Js.S(rz * 0.98)}px {Ink.SERIF}";
                    var cw = ctx.measureText(cena(i)).width;
                    var lEt = Ink.linieAkapitu(ctx, w.tekst, wew - rz * 1.4 - cw - rz);
                    ctx.font = $"italic {Js.Js.S(rz * 0.78)}px {Ink.SERIF}";
                    var lSk = Ink.linieAkapitu(ctx, w.skutek, wew - rz * 1.4);
                    return new Przycisk { lEt = lEt, lSk = lSk, h = rz * 0.7 + lEt * rz * 1.18 + lSk * rz * 0.98 + rz * 0.55 };
                }).ToList();
                ctx.restore();
                var h = fh + rz * 1.4 + rz * 1.6 + rz * 1.2 + lTekst * rz * 1.15 + rz * 0.6
                    + przyc.Aggregate(0.0, (s, b) => s + b.h + rz * 0.45) + rz * 1.2;
                return new Uklad { rz = rz, fh = fh, wew = wew, lTekst = lTekst, przyc = przyc, h = h };
            }
            Uklad dopasuj()
            {
                var m = zmierz(Math.Max(14, Math.Min(19, p.w / 30)));
                for (var rz0 = m.rz; rz0 >= 11 && m.h > maxWys; rz0 -= 1) m = zmierz(rz0);
                return m;
            }
            var u = dopasuj();
            // fresk zabiera tekstowi szerokość — gdy przez niego karta nie mieści się na płycie, odpada
            if (ilW != 0 && u.h > maxWys) { ilW = 0; u = dopasuj(); }
            double rz = u.rz, fh0 = u.fh, wew0 = u.wew; var przyc0 = u.przyc;
            var wys = Math.Min(u.h, maxWys);
            var x = p.x + (p.w - szer) / 2;
            var y = p.y + 8;
            var puls = 0.5 + 0.5 * JsM.Sin(teraz * 0.004);

            ctx.save();
            Fresk.tablica(ctx, x, y, szer, wys, true);
            ctx.strokeStyle = Barwa.Rgba(224, 176, 104, 0.45 + 0.35 * puls);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);
            var brzeg = Math.Max(3, Math.Min(6, Math.Min(szer, wys) * 0.03)) + 1;
            if (fh0 != 0) Freski.fryz(ctx, x + brzeg, y + brzeg, szer - brzeg * 2, fh0 - brzeg);
            if (ilW != 0)
            {
                var fresk = FRESKI.wydarzenia.TryGetValue(e.rodzaj, out var fr) ? fr : FRESKI.wydarzenieInne;
                double gora = y + fh0 + rz * 0.9, dol = y + wys - rz * 1.6;
                double iw = ilW - rz * 0.5, ih = Math.Min(dol - gora, iw * 1.7);
                Freski.wpiszFresk(ctx, fresk, x + rz * 0.7, gora + (dol - gora - ih) / 2, iw, ih);
            }

            var lx = x + ilW + rz * 1.1;
            var yy = y + fh0 + rz * 1.4;
            var pola = new List<PoleWyboru>();
            ctx.textAlign = "left";
            ctx.font = $"{Js.Js.S(rz * 0.66)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.naglowek;
            // „pokaż miejsce ›” po prawej od nagłówka (gdy wydarzenie ma miejsce) — na wąskiej karcie nagłówek krótszy
            var naglowek = "W Y D A R Z E N I E   ·   C Z A S   S T O I";
            const string link = "pokaż miejsce ›";
            ctx.font = $"italic {Js.Js.S(rz * 0.82)}px {Ink.SERIF}";
            var lw = e.cel != null ? ctx.measureText(link).width : 0;
            ctx.font = $"{Js.Js.S(rz * 0.66)}px {Ink.SERIF}";
            if (e.cel != null && ctx.measureText(naglowek).width + lw + rz > wew0) naglowek = "W Y D A R Z E N I E";
            var zLinkiem = e.cel != null && ctx.measureText(naglowek).width + lw + rz <= wew0;
            ctx.fillText(naglowek, lx, yy, wew0);
            if (zLinkiem)
            {
                ctx.font = $"italic {Js.Js.S(rz * 0.82)}px {Ink.SERIF}";
                ctx.textAlign = "right";
                ctx.fillStyle = PISMO.cena;
                ctx.fillText(link, lx + wew0, yy);
                var lh = Math.Max(rz * 1.6, 30);
                pola.Add(new PoleWyboru { i = -1, pokaz = true, x = lx + wew0 - lw - 8, y = yy - rz * 0.55 - lh / 2, w = lw + 16, h = lh });
                ctx.textAlign = "left";
            }
            yy += rz * 1.6;
            ctx.font = $"{Js.Js.S(rz * 1.25)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.tytul;
            ctx.fillText(e.tytul, lx, yy, wew0);
            yy += rz * 1.2;
            ctx.font = $"italic {Js.Js.S(rz * 0.9)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.tekst;
            Ink.akapit(ctx, e.tekst, lx, yy, wew0, rz * 1.15);
            yy += u.lTekst * rz * 1.15 + rz * 0.1;

            for (int i = 0; i < e.wybory.Count; i++)
            {
                var w = e.wybory[i];
                var b = przyc0[i];
                var ok = stac(i);
                double bx = lx - rz * 0.3, bw = wew0 + rz * 0.6, by = yy, bh = b.h;
                ctx.fillStyle = ok ? Barwa.Rgba(142, 58, 34, 0.05 + 0.04 * puls) : "rgba(40,24,14,0.04)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = ok ? PISMO.ramka : PISMO.ramkaNie;
                ctx.lineWidth = 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                // cena po prawej
                ctx.font = $"{Js.Js.S(rz * 0.98)}px {Ink.SERIF}";
                ctx.textAlign = "right";
                ctx.fillStyle = ok ? PISMO.cena : PISMO.cenaNie;
                var c = cena(i);
                ctx.fillText(c, bx + bw - rz * 0.6, by + rz * 1.35);
                // co robisz
                ctx.textAlign = "left";
                ctx.fillStyle = ok ? PISMO.wybor : PISMO.wyborNie;
                var ty = by + rz * 1.35;
                ctx.font = $"{Js.Js.S(rz * 0.98)}px {Ink.SERIF}";
                Ink.akapit(ctx, $"{i + 1}. {w.tekst}", bx + rz * 0.6, ty, wew0 - rz * 1.4 - ctx.measureText(c).width - rz, rz * 1.18);
                ty += (b.lEt - 1) * rz * 1.18 + rz * 1.02;
                // co z tego wyniknie
                ctx.font = $"italic {Js.Js.S(rz * 0.78)}px {Ink.SERIF}";
                ctx.fillStyle = ok ? PISMO.skutek : PISMO.skutekNie;
                Ink.akapit(ctx, w.skutek, bx + rz * 0.6, ty, wew0 - rz * 1.4, rz * 0.98);
                pola.Add(new PoleWyboru { i = i, x = bx, y = by, w = bw, h = bh });
                yy += bh + rz * 0.45;
            }
            ctx.font = $"italic {Js.Js.S(Math.Max(11, rz * 0.7))}px {Ink.SERIF}";
            ctx.textAlign = "center";
            ctx.fillStyle = PISMO.stopka;
            ctx.fillText("dotknij wyboru — czas ruszy dalej", lx + wew0 / 2, y + wys - rz * 0.5);
            ctx.restore();
            return pola;
        }
    }
}
