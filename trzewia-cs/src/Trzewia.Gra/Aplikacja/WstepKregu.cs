// Port: krag-3-beta/src/app/wstep-kregu.ts — WSTĘP KRĘGU TRZECIEGO (polecenie użytkownika TS, 15.11: „na początku gry
// zrób parę cutscenek, które dużo nam mówią, a po cutscence włącz chwilowy gameplay, w którym gracz nie może nic ruszyć,
// w którym postacie dostają się do miejsca początku gry, i dopiero gdy się tam dostaną, gracz przejmuje kontrolę”).
//  1. FILM (Aplikacja/FilmKregu.cs) — ok. 75 s na cały ekran; Esc pomija.
//  2. WEJŚCIE — scena w silniku gry bez sterowania: symulacja stoi, a szóstka wstaje z błota na tarasie kręgu, idzie
//     między leżącymi żarłokami do szybu kosza i po kolei schodzi po linie w trzewia, do sali, na swoje miejsca. Gdy
//     wszyscy dojdą — „Teraz ty.” — i gracz przejmuje kontrolę.
// Tylko w trybie Kręgu Trzeciego, w zwykłej nowej grze (nie w samouczku, nie w grze obserwowanej).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;

namespace Trzewia.Aplikacja
{
    public sealed class WstepKregu
    {
        const string KROJ = "\"Trzewia Tekst\", Georgia, serif";

        sealed class Aktor
        {
            public Creature c = null!;
            public double x0, y0, f0, start, kolejka, wstaje, doLiny, zejscie, naDole, koniec;
            /// <summary>Z której strony liny idą: 1 — z prawej (w lewo), −1 — z lewej (w prawo).</summary>
            public double strona = 1;
        }

        const double V_IDZIE = 2.2, V_LINA = 4.2, V_SALA = 2.4;

        /// <summary>„brak” | „plansze” (film) | „wejscie” (scena w silniku).</summary>
        public string faza = "brak";
        double wejscieOd;
        List<Aktor> aktorzy = new List<Aktor>();
        double linaX, tikStart, koniecWejscia, filmOd = -1;

        public bool trwa() => faza != "brak";
        public bool plansze() => faza == "plansze";

        /// <summary>Nowa partia: najpierw film, potem scena wejścia.</summary>
        public void zacznij() { faza = "plansze"; filmOd = -1; }

        /// <summary>Przerwanie (np. nowa partia bez wstępu, wczytanie zapisu): gra od razu, bez sceny.</summary>
        public void przerwij()
        {
            if (faza == "wejscie" && wejscieOd >= 0) foreach (var a in aktorzy) ustawNaMiejscu(a);
            faza = "brak"; KragSwiat.WIDOK_tik = null;
        }

        /// <summary>Esc: pomija film (scena wejścia zostaje — gracz i tak nie ma jeszcze władzy).</summary>
        public void pomin()
        {
            if (faza == "plansze") { faza = "wejscie"; wejscieOd = -1; }
        }

        /// <summary>Film na cały ekran; po ostatniej klatce — scena wejścia.</summary>
        public void rysujPlansze(IPlotno ctx, Sim sim, double w, double h, double teraz)
        {
            if (filmOd < 0) filmOd = teraz;
            var t = (teraz - filmOd) / 1000;
            if (t >= FilmKregu.DLUGOSC_FILMU) { pomin(); ctx.fillStyle = "rgb(0,0,0)"; ctx.fillRect(0, 0, w, h); return; }
            FilmKregu.rysujFilm(ctx, sim, w, h, t, teraz);
        }

        static void ustawNaMiejscu(Aktor a) { a.c.x = a.x0; a.c.y = a.y0; a.c.face = a.f0; a.c.naLinie = null; a.c.ogluszonyDo = null; }

        /// <summary>
        /// Wejście: ustawia szóstkę i kamerę według czasu sceny (symulacja stoi). Zwraca true, gdy scena się skończyła —
        /// wtedy postacie są dokładnie tam, gdzie zaczyna się gra.
        /// </summary>
        public bool krok(Sim sim, Camera cam, double teraz)
        {
            if (faza != "wejscie") return false;
            if (wejscieOd < 0) przygotuj(sim, teraz);
            var t = (teraz - wejscieOd) / 1000;
            KragSwiat.WIDOK_tik = tikStart + Math.Floor(t * 120);
            Aktor? naLinie = null;
            var wszyscy = true;
            foreach (var a in aktorzy)
            {
                var c = a.c;
                c.naLinie = null; c.ogluszonyDo = null;
                if (t < a.wstaje)
                {
                    c.ogluszonyDo = sim.tick + 1;   // leży w błocie
                    c.x = a.start; c.y = KragSwiat.gruntKregu(sim, a.start) - 1;
                }
                else if (t < a.doLiny)
                {
                    // (oprawa, etap 7c: idą ku linie od tej strony, po której nie ma szybu ze światłem — nad jego otworem
                    // dawniej przechodzili jak po ziemi)
                    var droga = t - a.wstaje - 0.5 > 0 ? (t - a.wstaje - 0.5) * V_IDZIE : 0;
                    var x = a.strona > 0 ? Math.Max(a.kolejka, a.start - droga) : Math.Min(a.kolejka, a.start + droga);
                    c.x = x; c.y = KragSwiat.gruntKregu(sim, x) - 1; c.face = -a.strona;
                }
                else if (t < a.zejscie)
                {
                    c.x = a.kolejka; c.y = KragSwiat.gruntKregu(sim, a.kolejka) - 1; c.face = -a.strona;
                }
                else if (t < a.naDole)
                {
                    var yg = KragSwiat.gruntKregu(sim, linaX) - 1;
                    c.x = linaX; c.y = yg + (t - a.zejscie) * V_LINA; c.naLinie = -1;
                    naLinie = a;
                }
                else if (t < a.koniec)
                {
                    double d = a.x0 - linaX, s = Math.Min(1, (t - a.naDole) * V_SALA / Math.Max(0.01, Math.Abs(d)));
                    c.x = linaX + d * s; c.y = a.y0; c.face = d >= 0 ? 1 : -1;
                }
                else { c.x = a.x0; c.y = a.y0; c.face = a.f0; }
                if (t < a.koniec) wszyscy = false;
            }
            // kamera: na tarasie za grupą, potem za tym, kto schodzi, na końcu sala
            var naTarasie = aktorzy.Where(a => t < a.zejscie).ToList();
            (double x, double y) ognisko;
            if (naLinie != null) ognisko = (naLinie.c.x, naLinie.c.y);
            else if (naTarasie.Count > 0) ognisko = (naTarasie.Sum(a => a.c.x) / naTarasie.Count, World.SURFACE_Y - 4);
            else ognisko = (aktorzy.Sum(a => a.c.x) / Math.Max(1, aktorzy.Count), aktorzy.Count > 0 ? aktorzy[0].y0 : cam.y);
            var zoom = naTarasie.Count > 0 && naLinie == null ? 12 : 14;
            var k = t < 0.05 ? 1 : 0.05;
            cam.x += (ognisko.x - cam.x) * k; cam.y += (ognisko.y - cam.y) * k; cam.zoom += (zoom - cam.zoom) * k;
            cam.clamp(sim.world.w, sim.world.h);
            if (wszyscy)
            {
                if (koniecWejscia == 0) koniecWejscia = teraz;
                if (teraz - koniecWejscia > 2600)
                {
                    faza = "brak"; KragSwiat.WIDOK_tik = null;
                    foreach (var a in aktorzy) ustawNaMiejscu(a);
                    return true;
                }
            }
            return false;
        }

        void przygotuj(Sim sim, double teraz)
        {
            wejscieOd = teraz; koniecWejscia = 0;
            tikStart = sim.tick;
            var w = sim.world;
            var wd = Wiadro.wiadra(sim).FirstOrDefault(q => q.szyb == true);
            linaX = wd != null ? wd.x + 0.5 : w.szybWiadraX + 0.5;
            // kolejność: grabarze, mnisi, rycerz na końcu (osłania)
            double waga(Creature c) => c.rola == "robotnik" ? 0 : c.rola == "pobozny" ? 1 : 2;
            var lud = sim.creatures.Where(c => !c.dead && c.race == Race.GOBLIN).OrderBy(waga).ThenBy(c => c.id).ToList();
            double zejscieOst = 0;
            // (oprawa, etap 7c: wstają i stają w kolejce po tej stronie liny, po której NIE ma szybu ze światłem do sali —
            // w ziemi nad nim jest dziura; dawniej szli zawsze od lewej i przechodzili nad nią, jakby lewitowali)
            var strona = w.szybX + 0.5 < linaX ? 1.0 : -1.0;
            aktorzy = lud.Select((c, i) =>
            {
                var start = Math.Max(6, Math.Min(w.w - 6, linaX + strona * (20 + i * 1.4)));
                var kolejka = linaX + strona * (1.4 + i * 0.9);
                var wstaje = 1.2 + i * 0.45;
                var doLiny = wstaje + 0.5 + Math.Abs(start - kolejka) / V_IDZIE;
                var zejscie = Math.Max(doLiny + 0.3, zejscieOst + 1.5);
                zejscieOst = zejscie;
                var glebokosc = c.y - (KragSwiat.gruntKregu(sim, linaX) - 1);
                var naDole = zejscie + Math.Max(0.5, glebokosc / V_LINA);
                var koniec = naDole + Math.Abs(c.x - linaX) / V_SALA + 0.1;
                return new Aktor { c = c, x0 = c.x, y0 = c.y, f0 = c.face, start = start, kolejka = kolejka, wstaje = wstaje, doLiny = doLiny, zejscie = zejscie, naDole = naDole, koniec = koniec, strona = strona };
            }).ToList();
        }

        /// <summary>Napisy sceny wejścia (pasy kinowe u góry i u dołu płyty).</summary>
        public void rysujNapisy(IPlotno ctx, double px, double py, double pw, double ph, double teraz)
        {
            if (faza != "wejscie" || wejscieOd < 0) return;
            var t = (teraz - wejscieOd) / 1000;
            var pas = ph * 0.09;
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(px, py, pw, pas);
            ctx.fillRect(px, py + ph - pas, pw, pas);
            var ost = aktorzy.Count > 0 ? aktorzy.Max(a => a.koniec) : 0;
            var zejscie0 = aktorzy.Count > 0 ? aktorzy[0].zejscie : 99;
            var napis = koniecWejscia != 0 ? "Teraz ty."
                : t < 3.5 ? "Szóstka wstaje z błota trzeciego kręgu."
                : t < zejscie0 - 0.5 ? "Idą między tymi, którzy nigdy nie wstaną… do szybu, którym inni spuszczają im kosz resztek."
                : t < ost - 1 ? "Jeden po drugim schodzą po linie w trzewia kręgu."
                : "Na dole, w sali pod kręgiem, zaczyna się ich droga w dół.";
            var r = Math.Max(14, Math.Min(24, pw / 60));
            ctx.font = $"italic {Js.Js.S(koniecWejscia != 0 ? r * 1.4 : r)}px {KROJ}";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(222,214,186,0.95)";
            ctx.fillText(napis, px + pw / 2, py + ph - pas / 2);
            ctx.font = $"{Js.Js.S(r * 0.65)}px {KROJ}"; ctx.fillStyle = "rgba(170,160,140,0.8)";
            ctx.fillText("scena — sterowanie przejmiesz, gdy szóstka dojdzie na miejsce", px + pw / 2, py + pas / 2);
            ctx.restore();
        }
    }
}
