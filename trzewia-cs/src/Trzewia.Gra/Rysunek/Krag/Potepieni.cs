// Port: krag-3-beta/src/render/potepieni.ts — POTĘPIENI ŻARŁOCY, tłum, który zalega cały krąg (tej samej wysokości
// co nasza szóstka, każdy z własną czynnością i rytmem):
//  - leży twarzą w błocie i drga, klęczy i wyje w deszcz jak pies, żre błoto garściami, grzebie w nim palcami,
//  - błąka się powoli po kręgu, dwóch szarpie się o resztki.
// Gdzie: cały taras trzeciego kręgu (powierzchnia), a pod nim w trzewiach — w jaskiniach, ruinach, w sali i przy
// pieczęci na dnie. Czysto rysunek — nie wchodzą w drogę symulacji. Postacie przy szóstce, Cerberze i szybach są
// pomijane; przy świeżym zabójstwie Cerbera leżą szczątki (Zabijanie.rysujSzczatki).
// W TS każdy potępiony to stworzenie z makeCreature tylko po to, by mieć położenie, zwrot i numer — tu lekka klasa.
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Rysunek
{
    public static class Potepieni
    {
        static double los(double n) => Pieklo.los(n);
        static double SURFACE_Y => World.SURFACE_Y;

        enum Typ { lezy, wyje, zre, grzebie, blaka, szarpie }

        sealed class Potepiony
        {
            public Typ typ;
            /// <summary>numer (rytm pozy) i zwrot</summary>
            public double id, face;
            /// <summary>gdzie stoi (x — środek stopy), rząd podłogi (y — kafel, na którym stoi), granice błąkania, tempo</summary>
            public double x, y, xa, xb, v;
            /// <summary>na powierzchni (grunt z grzbietu) czy w trzewiach (podłoga jaskini)</summary>
            public bool gora;
        }

        sealed class Tlum { public readonly List<Potepiony> lista = new List<Potepiony>(); public double nr; }
        static readonly ConditionalWeakTable<Sim, Tlum> tlumy = new ConditionalWeakTable<Sim, Tlum>();

        static Typ typLosowy(double r, bool gora)
        {
            if (gora) return r < 0.42 ? Typ.lezy : r < 0.56 ? Typ.wyje : r < 0.7 ? Typ.zre : r < 0.8 ? Typ.grzebie : r < 0.94 ? Typ.blaka : Typ.szarpie;
            return r < 0.5 ? Typ.lezy : r < 0.62 ? Typ.wyje : r < 0.75 ? Typ.zre : r < 0.85 ? Typ.grzebie : Typ.blaka;
        }

        static Potepiony nowy(Tlum t, Typ typ, double x, double y, bool gora, double xa, double xb, double ziarno) => new Potepiony
        {
            typ = typ, id = 100000 + t.nr++, face = los(ziarno * 3) < 0.5 ? 1 : -1,
            x = x, y = y, xa = xa, xb = xb, v = (0.25 + los(ziarno * 5) * 0.35) * (los(ziarno * 7) < 0.5 ? 1 : -1), gora = gora,
        };

        /// <summary>Rozmieszcza tłum raz na górę: taras (gęsto) i dno pustek pod ziemią, które były od początku.</summary>
        static Tlum zbuduj(Sim sim)
        {
            var w = sim.world;
            var t = new Tlum();
            var k = Katedra.ukladKatedry(w); var b = Konwoj.bloczekWiadra(w); var plac = Konwoj.placKonwoju(w);
            // taras kręgu
            int i = 0;
            for (double x = 4.5; x < w.w - 11; x += 1.15 + los(i * 13) * 0.5, i++)
            {
                if (k != null && x > k.cx - 10 && x < k.cx + 8) continue;
                if (b != null && Math.Abs(x - b.Value.x) < 3.5) continue;
                if (plac != null && x > plac.Value.x0 - 1.5 && x < plac.Value.x1 + 1.5) continue;
                if (los(i * 17 + 3) < 0.12) continue;
                var typ = typLosowy(los(i * 29 + 1), true);
                var p = nowy(t, typ, x, SURFACE_Y - 1, true, x - 3, x + 3, i);
                t.lista.Add(p);
                if (typ == Typ.szarpie)
                {
                    // drugi do szarpaniny — twarzą w twarz
                    var q = nowy(t, Typ.szarpie, x + 0.9, SURFACE_Y - 1, true, x, x, i + 999);
                    p.face = 1; q.face = -1;
                    t.lista.Add(q); x += 1;
                }
            }
            // trzewia: dno pustek, które były od początku
            var sala = w.salaOltarza;
            double n = 0;
            // (Krąg, ZmianyKregu — użytkownik 22.11: „ludzie obok pomnika Cerbera oraz w jego krypcie — do usunięcia
            // natychmiast”): nikogo w lochu z kryptą, na przedprożu ani w komorze pomnika
            var pom = Pomnik.miejscePomnika(sim);
            bool przyPomniku(double x, double y) => ZmianyKregu.Aktywne
                && (w.wLochu(x, y, 2) || w.wPrzedprozu(x, y) || (Math.Abs(x - pom.x) < 16 && y > pom.y - 16 && y < pom.y + 4));
            for (var y = SURFACE_Y + 3; y < w.h - 3; y++)
            {
                double ostatni = -9;
                for (double x = 3; x < w.w - 12; x++)
                {
                    if (!w.passable(x, y) || w.passable(x, y + 1) || !w.passable(x, y - 1)) continue;
                    if (x - ostatni < 3) continue;
                    if (przyPomniku(x, y)) continue;
                    var r = los(x * 7919 + y * 104729);
                    // w sali mniej (tam mieszka szóstka) — i nie przy ołtarzu ani pod szybami
                    var wSali = sala.x1 >= 0 && x >= sala.x0 && x <= sala.x1 && y >= sala.y0 - 2 && y <= sala.y1 + 2;
                    if (wSali && (Math.Abs(x - w.oltarz.x) < 6 || Math.Abs(x - w.szybWiadraX) < 3 || r > 0.25)) continue;
                    if (!wSali && r > 0.42) continue;
                    ostatni = x;
                    var typ = typLosowy(los(x * 31 + y * 7), false);
                    // granice błąkania: dopóki jest podłoga i wolne powietrze
                    double xa = x, xb = x;
                    while (xa > 2 && w.passable(xa - 1, y) && !w.passable(xa - 1, y + 1) && x - xa < 6) xa--;
                    while (xb < w.w - 3 && w.passable(xb + 1, y) && !w.passable(xb + 1, y + 1) && xb - x < 6) xb++;
                    t.lista.Add(nowy(t, typ, x + 0.5, y, false, xa + 0.5, xb + 0.5, n++));
                }
            }
            return t;
        }

        static double ostatniCzas = 0;
        static readonly List<Creature> lud = new List<Creature>();

        /// <summary>
        /// Rysuje potępionych w kadrze — przed mrokiem (w trzewiach widać tylko tych w świetle; taras nie jest w mroku).
        /// Pomija tych, na których miejscu stanęło coś innego (wykopano im podłogę, zasypano, stoi tam nasza szóstka).
        /// </summary>
        public static void rysujPotepionych(IPlotno ctx, Sim sim, Camera cam, double czas)
        {
            if (!KragSwiat.WIDOK_tlum) return;
            if (!tlumy.TryGetValue(sim, out var t)) { t = zbuduj(sim); tlumy.Add(sim, t); }
            var z = cam.zoom; var w = sim.world;
            var h = Math.Max(16, z * 1.9 * ustawienia.wielkoscSylwetek);
            var dt = Math.Min(0.1, Math.Max(0, (czas - ostatniCzas) / 1000));
            ostatniCzas = czas;
            var ruch = Nastroj.wolnoRuszac();
            var tik = KragSwiat.WIDOK_tik ?? sim.tick;
            var cer = Krag.cerberNaPowierzchni(sim, tik);
            var zabicia = Krag.zabiciaCerbera(sim, tik);
            zabicia.RemoveAll(q => !(tik < q.@do));
            lud.Clear();
            foreach (var c in sim.creatures) if (!c.dead && c.race == Race.GOBLIN) lud.Add(c);
            double xL = cam.toWorldX(0) - 2, xP = cam.toWorldX(cam.vw) + 2, yG = cam.toWorldY(0) - 3, yD = cam.toWorldY(cam.vh) + 2;
            ctx.save();
            foreach (var p in t.lista)
            {
                // błąkający się: krok w tę i z powrotem
                if (p.typ == Typ.blaka && ruch)
                {
                    p.x += p.v * dt;
                    if (p.x < p.xa) { p.x = p.xa; p.v = Math.Abs(p.v); }
                    if (p.x > p.xb) { p.x = p.xb; p.v = -Math.Abs(p.v); }
                    p.face = p.v > 0 ? 1 : -1;
                }
                if (p.x < xL || p.x > xP || p.y < yG || p.y > yD) continue;
                var yStopy = p.gora ? KragSwiat.gruntKregu(sim, p.x) : p.y + 1;
                if (!p.gora && (!w.passable(Math.Floor(p.x), p.y) || w.passable(Math.Floor(p.x), p.y + 1))) continue;
                if (p.gora && cer.jest && Math.Abs(p.x - cer.x) < 2.6) continue;
                var zajety = false;
                foreach (var c in lud) if (Math.Abs(c.x - p.x) < 0.8 && Math.Abs(c.y - p.y) < 1.5) { zajety = true; break; }
                if (zajety) continue;
                // przy świeżym zabójstwie Cerbera — tu leżą szczątki, nie żywy (cień odrodzi się, gdy szczątki znikną)
                if (p.gora)
                {
                    var szczatki = false;
                    foreach (var q in zabicia) if (Math.Abs(q.x - p.x) < 1.9) { szczatki = true; break; }
                    if (szczatki) continue;
                }
                double sx = cam.toScreenX(p.x), sy = cam.toScreenY(yStopy);
                var tt = czas / 1000 + p.id * 0.37;
                var poza = pozaTlumu(p.typ, tt, p.id);
                var lezy = Math.Abs(poza.tulow) > 1.1;
                ctx.save();
                ctx.translate(sx, sy - h * (lezy ? 0.08 : poza.udoL > 1 ? 0.25 : 0.5));
                ctx.scale(p.face, 1);
                Ludzik.rysujLudzika(ctx, h, poza);
                ctx.restore();
                // błoto oblepia stopy (na tarasie — kałuża)
                ctx.fillStyle = p.gora ? "rgba(44,42,30,0.85)" : "rgba(40,36,28,0.6)";
                ctx.beginPath(); ctx.ellipse(sx, sy, h * (lezy ? 0.6 : 0.3), h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
            }
            // szczątki ofiar Cerbera i kałuże krwi
            foreach (var q in zabicia)
            {
                if (tik < q.od + (q.zabite - q.od) * 2.25 || q.x < xL || q.x > xP) continue;
                var a = Math.Min(1, (q.@do - tik) / 1500);
                ctx.save();
                ctx.translate(cam.toScreenX(q.x), cam.toScreenY(KragSwiat.gruntKregu(sim, q.x)));
                ctx.scale(q.zwrot, 1);
                Zabijanie.rysujSzczatki(ctx, h, q.wariant, a, czas / 1000, q.k);
                ctx.restore();
            }
            ctx.restore();
        }

        /// <summary>Ilu potępionych zalega krąg (do testów i podpisu).</summary>
        public static int liczbaPotepionych(Sim sim) => tlumy.TryGetValue(sim, out var t) ? t.lista.Count : 0;

        /// <summary>Poza żarłoka z tłumu według jego czynności.</summary>
        static PozaLudzika pozaTlumu(Typ typ, double t, double z)
        {
            switch (typ)
            {
                case Typ.lezy: return Ludzik.pozaLezy(t, z);
                case Typ.wyje: return Ludzik.pozaWyje(t, z);
                case Typ.zre: return Ludzik.pozaZre(t, z);
                case Typ.grzebie: return Ludzik.pozaCzolga(t * 0.35, 0.6, z);
                case Typ.blaka: return Ludzik.pozaIdzie(t, z);
                default: return Ludzik.pozaSzarpie(t, z);
            }
        }
    }
}
