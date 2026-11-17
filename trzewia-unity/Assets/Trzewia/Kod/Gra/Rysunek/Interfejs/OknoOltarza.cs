// Port: alpha-1/src/render/okno-oltarza.ts — OKNO OŁTARZA (Alpha, etap 3d): jasna tablica tynku jak karta wydarzenia:
// kto stoi przy ołtarzu, a pod spodem rytuały, każdy jako duże pole z ceną we krwi po prawej i jednym zdaniem skutku.
// Na co cię nie stać albo czego nie da się teraz odprawić, jest przygaszone, z powodem na czerwono. Wskrzeszenie —
// osobne pole dla każdego poległego, którego ciało jeszcze leży. Czas biegnie dalej.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyLud;
using SLud = Trzewia.Symulacja.Lud;
using SOltarz = Trzewia.Symulacja.Oltarz;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Pole okna: rytuał (dla wskrzeszenia z numerem poległego), przywołanie pobożnego, zamknięcie albo tło karty.</summary>
    public sealed class PoleOltarza { public string akcja = ""; public string? rodzaj; public double? cel; public bool ok; public double x, y, w, h; }

    public static class OknoOltarza
    {
        static class PISMO
        {
            public static Styl naglowek => FRESK.czerwien;
            public const string tytul = "#2a1810", tekst = "rgba(58,38,24,0.92)",
                wybor = "#2a1810", wyborNie = "rgba(80,62,48,0.72)", skutek = "rgba(62,40,26,0.9)", skutekNie = "rgba(80,62,48,0.62)",
                cena = "#7e2c16", daje = "#2f6a2a", powod = "#b0301c", ramka = "rgba(142,58,34,0.8)", ramkaNie = "rgba(110,90,70,0.4)", stopka = "rgba(90,64,44,0.8)";
        }

        sealed class Wiersz { public string akcja = ""; public string? rodzaj; public double? cel; public string tekst = "", cena = "", skutek = ""; public bool daje; public string? powod; }

        static string R0(double v) => Js.Js.S(Math.Floor(v + 0.5));

        /// <summary>Ile temu (sekundy albo minuty gry).</summary>
        static string ileTemu(double tikow)
        {
            var s = Math.Max(1, Math.Floor(tikow / 120 + 0.5));
            return s < 90 ? $"{Js.Js.S(s)} s temu" : $"{R0(s / 60)} min temu";
        }

        static List<Wiersz> wiersze(Sim sim)
        {
            var R = OLTARZ.rytualy;
            var @out = new List<Wiersz>();
            var nikogo = SOltarz.pobozniPrzyOltarzu(sim).Count == 0 && SOltarz.rytualOltarza(sim) == null;
            if (nikogo && SLud.liczRole(sim).pobozny > 0)
                @out.Add(new Wiersz { akcja = "przywolaj", tekst = Krag.T("Przywołaj pobożnego", "Przywołaj mnicha"), cena = "za darmo", daje = false, skutek = Krag.T("Najbliższy pobożny przyjdzie do ołtarza i zostanie przy nim, modląc się.", "Najbliższy mnich przyjdzie do ołtarza i zostanie przy nim, modląc się."), powod = null });
            var skutki = new Dictionary<string, string>
            {
                ["modlitwa"] = $"{Krag.T("Pobożny", "Mnich")} klęczy, od krzyża biją promienie. +{Js.Js.S(R.modlitwa.wiara)} wiary przez {R0(R.modlitwa.tikow / 120)} s.",
                ["szal"] = $"Krew spływa do misy, płonie krąg znaków. Rycerz przez {R0(R.szal.trwa / 7200)} min bije {ReplaceFirst(Js.Js.S(R.szal.sila), ".", ",")} raza mocniej.",
                ["wskrzeszenie"] = "Ciało wstaje przy ołtarzu i wraca do drużyny.",
                ["ofiaraKrwi"] = $"{Krag.T("Pobożny", "Mnich")} upuszcza krwi do misy (+{Js.Js.S(LUD.okaleczenieKrew)} krwi). Słabnie, póki nie wyśpi się w sypialni.",
                ["ofiaraZycia"] = $"{Krag.T("Pobożny", "Mnich")} oddaje życie na ołtarzu (+{Js.Js.S(LUD.ofiaraKrew)} krwi). Jego ciało można potem wskrzesić.",
            };
            foreach (var rodzaj in RYTUALY)
            {
                var daje = SOltarz.krewZOfiary(rodzaj) > 0;
                var cena = daje ? $"+{Js.Js.S(SOltarz.krewZOfiary(rodzaj))} krwi" : $"{Js.Js.S(SOltarz.cenaRytualu(rodzaj))} krwi";
                if (rodzaj == "wskrzeszenie")
                {
                    var lista = SOltarz.polegli(sim).Take(3).ToList();
                    if (lista.Count == 0) { @out.Add(new Wiersz { akcja = "rytual", rodzaj = rodzaj, tekst = NAZWA_RYTUALU[rodzaj], cena = cena, daje = daje, skutek = skutki[rodzaj], powod = SOltarz.czemuNie(sim, rodzaj) }); continue; }
                    foreach (var t in lista)
                        @out.Add(new Wiersz { akcja = "rytual", rodzaj = rodzaj, cel = t.id, tekst = $"Wskrześ: {SLud.NAZWA_ROLI[t.rola].ToLowerInvariant()} (poległ {ileTemu(sim.tick - t.od)})", cena = cena, daje = daje, skutek = skutki[rodzaj], powod = SOltarz.czemuNie(sim, rodzaj, t.id) });
                    continue;
                }
                @out.Add(new Wiersz { akcja = "rytual", rodzaj = rodzaj, tekst = NAZWA_RYTUALU[rodzaj], cena = cena, daje = daje, skutek = skutki[rodzaj], powod = SOltarz.czemuNie(sim, rodzaj) });
            }
            return @out;
        }

        static string ReplaceFirst(string s, string a, string b) { var i = s.IndexOf(a, StringComparison.Ordinal); return i < 0 ? s : s.Substring(0, i) + b + s.Substring(i + a.Length); }

        /// <summary>Co dzieje się przy ołtarzu — jedno zdanie pod tytułem.</summary>
        static string stanOltarza(Sim sim)
        {
            var r = SOltarz.rytualOltarza(sim);
            if (r != null) return $"Trwa rytuał: {NAZWA_RYTUALU[r.rodzaj].ToLowerInvariant()} — {R0(Math.Min(1, (sim.tick - r.od) / Math.Max(1, r.@do - r.od)) * 100)}%. {Krag.T("Pobożny", "Mnich")} klęczy przy ołtarzu.";
            var n = SOltarz.pobozniPrzyOltarzu(sim).Count;
            if (n > 0) return $"Przy ołtarzu stoi {(n > 1 ? $"{n} pobożnych" : Krag.T("pobożny", "mnich"))}. Wybierz rytuał — zapłacisz krwią (masz {Js.Js.S(Math.Floor(sim.krew))}).";
            return Krag.T("Przy ołtarzu nie stoi żaden pobożny. Przywołaj go albo zaznacz pobożnego i dotknij ołtarza.", "Przy ołtarzu nie stoi żaden mnich. Przywołaj go albo zaznacz mnicha i dotknij ołtarza.");
        }

        sealed class Przycisk { public int lEt, lSk; public double h; }
        sealed class Uklad { public double rz, wew, h; public int lOpis; public List<Przycisk> przyc = null!; }

        /// <summary>Rysuje okno ołtarza; zwraca pola do dotknięcia (podświetla to pod wskaźnikiem).</summary>
        public static List<PoleOltarza> rysujOknoOltarza(IPlotno ctx, Plate p, Sim sim, double teraz, (double x, double y) wskaznik, (double x, double pol)? oltarz = null)
        {
            var lista = wiersze(sim);
            var opis = stanOltarza(sim);
            // okno staje z boku płyty, po tej stronie ołtarza, gdzie jest więcej miejsca, i nie zachodzi na niego —
            // widać, jak pobożny dochodzi i klęka
            double lewo = oltarz != null ? oltarz.Value.x - p.x : 0, prawo = oltarz != null ? p.x + p.w - oltarz.Value.x : 0;
            var miejsce = Math.Max(lewo, prawo) - (oltarz?.pol ?? 0) - 22;
            var szer = p.waski ? p.w - 16 : Math.Min(560, Math.Max(320, oltarz != null ? miejsce : p.w * (p.niski ? 0.6 : 0.5)));
            var maxWys = p.h - 16;
            Uklad zmierz(double rz0)
            {
                var wew0 = szer - rz0 * 2.2;
                ctx.save();
                ctx.font = $"italic {Js.Js.S(rz0 * 0.9)}px {Ink.SERIF}";
                var lOpis = Ink.linieAkapitu(ctx, opis, wew0);
                var przyc0 = lista.Select(w =>
                {
                    ctx.font = $"{Js.Js.S(rz0 * 0.98)}px {Ink.SERIF}";
                    var cw = ctx.measureText(w.cena).width;
                    var lEt = Ink.linieAkapitu(ctx, w.tekst, wew0 - rz0 * 1.4 - cw - rz0);
                    ctx.font = $"italic {Js.Js.S(rz0 * 0.78)}px {Ink.SERIF}";
                    var lSk = Ink.linieAkapitu(ctx, w.skutek, wew0 - rz0 * 1.4) + (w.powod != null ? Ink.linieAkapitu(ctx, $"Teraz nie: {w.powod}.", wew0 - rz0 * 1.4) : 0);
                    return new Przycisk { lEt = lEt, lSk = lSk, h = rz0 * 0.7 + lEt * rz0 * 1.18 + lSk * rz0 * 0.98 + rz0 * 0.5 };
                }).ToList();
                ctx.restore();
                var h = rz0 * 1.4 + rz0 * 1.6 + rz0 * 1.2 + lOpis * rz0 * 1.15 + rz0 * 0.5 + przyc0.Aggregate(0.0, (s, b) => s + b.h + rz0 * 0.4) + rz0 * 1.3;
                return new Uklad { rz = rz0, wew = wew0, lOpis = lOpis, przyc = przyc0, h = h };
            }
            var u = zmierz(Math.Max(13, Math.Min(18, p.w / 32)));
            for (var rz1 = u.rz; rz1 >= 10 && u.h > maxWys; rz1 -= 1) u = zmierz(rz1);
            double rz = u.rz, wew = u.wew; var przyc = u.przyc;
            var wys = Math.Min(u.h, maxWys);
            var x = p.waski || oltarz == null ? p.x + (p.w - szer) / 2 : prawo > lewo ? p.x + p.w - szer - 14 : p.x + 14;
            var y = p.y + 8;
            var puls = 0.5 + 0.5 * JsM.Sin(teraz * 0.004);
            var pola = new List<PoleOltarza>();

            // tło karty: dotknięcie go nic nie robi (okno zamyka dopiero dotknięcie poza nim)
            pola.Add(new PoleOltarza { akcja = "tlo", ok = true, x = x - 3, y = y - 3, w = szer + 6, h = wys + 6 });
            ctx.save();
            Fresk.tablica(ctx, x, y, szer, wys, true);
            ctx.strokeStyle = Barwa.Rgba(224, 176, 104, 0.45 + 0.35 * puls);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - 3, y - 3, szer + 6, wys + 6);
            var lx = x + rz * 1.1;
            var yy = y + rz * 1.4;
            ctx.textAlign = "left";
            ctx.font = $"{Js.Js.S(rz * 0.66)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.naglowek;
            ctx.fillText("O Ł T A R Z   ·   R Y T U A Ł Y", lx, yy, wew - rz * 3);
            // zamknij ×
            ctx.font = $"{Js.Js.S(rz * 1.1)}px {Ink.SERIF}";
            ctx.textAlign = "right";
            ctx.fillStyle = PISMO.cena;
            ctx.fillText("×", lx + wew, yy + rz * 0.1);
            var zw = Math.Max(rz * 1.8, 34);
            pola.Add(new PoleOltarza { akcja = "zamknij", ok = true, x = lx + wew - zw + rz * 0.4, y = yy - zw / 2 - rz * 0.3, w = zw, h = zw });
            ctx.textAlign = "left";
            yy += rz * 1.6;
            ctx.font = $"{Js.Js.S(rz * 1.25)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.tytul;
            ctx.fillText("Ołtarz pod światłem", lx, yy, wew);
            yy += rz * 1.2;
            ctx.font = $"italic {Js.Js.S(rz * 0.9)}px {Ink.SERIF}";
            ctx.fillStyle = PISMO.tekst;
            Ink.akapit(ctx, opis, lx, yy, wew, rz * 1.15);
            yy += u.lOpis * rz * 1.15 + rz * 0.2;

            for (int i = 0; i < lista.Count; i++)
            {
                var w = lista[i];
                var b = przyc[i];
                var ok = w.powod == null;
                double bx = lx - rz * 0.3, bw = wew + rz * 0.6, by = yy, bh = b.h;
                var pod = ok && wskaznik.x >= bx && wskaznik.x <= bx + bw && wskaznik.y >= by && wskaznik.y <= by + bh;
                ctx.fillStyle = ok ? Barwa.Rgba(142, 58, 34, (pod ? 0.14 : 0.05) + 0.04 * puls) : "rgba(40,24,14,0.04)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = ok ? PISMO.ramka : PISMO.ramkaNie;
                ctx.lineWidth = pod ? 2 : 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.font = $"{Js.Js.S(rz * 0.98)}px {Ink.SERIF}";
                ctx.textAlign = "right";
                ctx.fillStyle = !ok ? PISMO.powod : w.daje ? PISMO.daje : PISMO.cena;
                ctx.fillText(w.cena, bx + bw - rz * 0.6, by + rz * 1.35);
                ctx.textAlign = "left";
                ctx.fillStyle = ok ? PISMO.wybor : PISMO.wyborNie;
                var ty = by + rz * 1.35;
                ctx.font = $"{Js.Js.S(rz * 0.98)}px {Ink.SERIF}";
                Ink.akapit(ctx, w.tekst, bx + rz * 0.6, ty, wew - rz * 1.4 - ctx.measureText(w.cena).width - rz, rz * 1.18);
                ty += (b.lEt - 1) * rz * 1.18 + rz * 1.02;
                ctx.font = $"italic {Js.Js.S(rz * 0.78)}px {Ink.SERIF}";
                ctx.fillStyle = ok ? PISMO.skutek : PISMO.skutekNie;
                var n = Ink.akapit(ctx, w.skutek, bx + rz * 0.6, ty, wew - rz * 1.4, rz * 0.98);
                if (w.powod != null)
                {
                    // czemu teraz nie — na czerwono, pod skutkiem
                    ctx.fillStyle = PISMO.powod;
                    Ink.akapit(ctx, $"Teraz nie: {w.powod}.", bx + rz * 0.6, ty + n * rz * 0.98, wew - rz * 1.4, rz * 0.98);
                }
                pola.Add(new PoleOltarza { akcja = w.akcja, rodzaj = w.rodzaj, cel = w.cel, ok = ok, x = bx, y = by, w = bw, h = bh });
                yy += bh + rz * 0.4;
            }
            ctx.font = $"italic {Js.Js.S(Math.Max(11, rz * 0.7))}px {Ink.SERIF}";
            ctx.textAlign = "center";
            ctx.fillStyle = PISMO.stopka;
            ctx.fillText("dotknij rytuału · dotknij poza oknem, by je zamknąć", lx + wew / 2, y + wys - rz * 0.5);
            ctx.restore();
            return pola;
        }
    }
}
