// Port: alpha-1/src/sim/brama.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class StanBramy
    {
        /// <summary>0 — zamknięta, 1 — podniesiona do końca.</summary>
        public double otwarcie;
        /// <summary>Ilu pobożnych rzuca teraz zaklęcia przy kotle (rysunek, podpowiedzi).</summary>
        public double zaklina;
        /// <summary>Czy przejście jest wolne (kafle przejścia to pustka) — od `BRAMA.czolgaOd`.</summary>
        public bool wolne;
        /// <summary>Najwyższe otwarcie w tym podniesieniu — do kroniki.</summary>
        public double? szczyt;
        /// <summary>Porcje w koszu przy kracie (od środka lochu).</summary>
        public double? kosz;
    }

    /// <summary>
    /// Stalowa brama lochu (6.11, decyzja użytkownika) — krata podnosi się, gdy przy kotle zaklina dość pobożnych (patrz brama.ts).
    /// </summary>
    public static class Brama
    {
        public static StanBramy stanBramy(Sim sim)
        {
            if (sim.lud.brama == null) sim.lud.brama = new StanBramy { otwarcie = 0, zaklina = 0, wolne = false };
            return sim.lud.brama;
        }

        /// <summary>Czy postać stoi przy kotle (tam rzuca się zaklęcia).</summary>
        public static bool przyKotle(Sim sim, Creature c)
        {
            var k = sim.world.kociol;
            return Math.Abs(c.x - (k.x + 0.5)) <= BRAMA.przyKotle && Math.Abs(Math.Floor(c.y) - k.y) <= 1;
        }

        /// <summary>Pobożni, którzy właśnie rzucają zaklęcia nad kotłem.</summary>
        public static List<Creature> zaklinajacy(Sim sim)
        {
            var @out = new List<Creature>();
            foreach (var c in sim.creatures)
            {
                if (c.dead || rolaPostaci(c) != "pobozny") continue;
                var p = c.polecenie;
                if (p?.zaklinaj != true || p.na != true || !przyKotle(sim, c)) continue;
                @out.Add(c);
            }
            return @out;
        }

        /// <summary>Czy przejście bramy jest teraz otwarte na tyle, by się przeczołgać (albo wyżej).</summary>
        public static bool bramaOtwarta(Sim sim) => stanBramy(sim).otwarcie >= BRAMA.czolgaOd;

        /// <summary>Czy postać czołga się pod kratą.</summary>
        public static bool czolgaSie(Sim sim, Creature c)
        {
            var w = sim.world; var b = w.brama;
            if (b.x1 < b.x0) return false;
            double tx = Math.Floor(c.x), ty = Math.Floor(c.y);
            if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) return false;
            return stanBramy(sim).otwarcie < BRAMA.idzieOd;
        }

        /// <summary>Kafle przejścia: pustka, gdy brama wolna, a gdy opadła — stal nie do ruszenia (leżących wypycha na bok).</summary>
        static void ustawPrzejscie(Sim sim, bool wolne)
        {
            var w = sim.world; var b = w.brama;
            if (!wolne)
            {
                foreach (var c in sim.creatures)
                {
                    if (c.dead) continue;
                    double tx = Math.Floor(c.x), ty = Math.Floor(c.y);
                    if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) continue;
                    var doLochu = c.jx > b.x1 || (c.droga != null && c.droga.Count > 0 ? (c.droga[c.droga.Count - 1] % w.w) > b.x1 : false);
                    c.x = doLochu ? b.x1 + 1.5 : b.x0 - 0.5;
                    c.y = b.y1;
                    c.droga = null;
                    sim.efekt(c.x, c.y, "mysl", doLochu ? "zdążył!" : "nie zdążył");
                }
            }
            for (var y = b.y0; y <= b.y1; y++) for (var x = b.x0; x <= b.x1; x++) w.set(x, y, wolne ? T.AIR : T.STONE);
        }

        /// <summary>Tik bramy: zaklinanie przy kotle podnosi kratę, bez niego krata opada.</summary>
        public static void tikBramy(Sim sim)
        {
            var w = sim.world;
            if (w.brama.x1 < w.brama.x0) return;
            var b = stanBramy(sim);
            var ilu = zaklinajacy(sim).Count;
            var przed = b.otwarcie;
            b.zaklina = ilu;
            if (ilu >= BRAMA.potrzeba) b.otwarcie = Math.Min(1, b.otwarcie + 1 / BRAMA.otwieranie);
            else b.otwarcie = Math.Max(0, b.otwarcie - 1 / BRAMA.opadanie);
            double x = w.brama.x0, y = w.brama.y1;
            if (b.otwarcie > przed)
            {
                if (przed == 0) sim.gdzie(w.kociol.x, w.kociol.y).log("Nad kotłem w starej komnacie pobożni rzucają zaklęcia. W dole, w murze lochu, drgnęła stalowa brama.", "wiara", "brama-drgnela");
                b.szczyt = Math.Max(b.szczyt ?? 0, b.otwarcie);
                if (przed < BRAMA.idzieOd && b.otwarcie >= BRAMA.idzieOd) sim.gdzie(x, y).log("Brama lochu podniesiona — można przejść wyprostowanym.", "wiara", "brama-idzie");
                if (przed < 1 && b.otwarcie >= 1) sim.gdzie(x, y).log("Brama lochu podniesiona do końca. Gdy zaklęcia ucichną, zacznie powoli opadać.", "wiara", "brama-pelna");
            }
            var wolne = b.otwarcie >= BRAMA.czolgaOd;
            if (wolne != b.wolne)
            {
                ustawPrzejscie(sim, wolne);
                b.wolne = wolne;
                if (wolne) sim.gdzie(x, y).log("Krata bramy uniosła się nad posadzkę — pod nią da się przeczołgać.", "wiara", "brama-czolga");
                else { sim.gdzie(x, y).log("Stalowa brama opadła. Loch znów jest zamknięty.", "otchlan", "brama-zamknieta"); b.szczyt = 0; }
            }
        }

        /// <summary>Kafel pod kratą od strony przedproża (tu staje robotnik, który podaje jedzenie przez pręty).</summary>
        public static XY podKrata(Sim sim)
        {
            var b = sim.world.brama;
            return new XY(b.x0 - 1, b.y1);
        }

        /// <summary>Kafel kosza przy kracie od strony lochu.</summary>
        public static XY miejsceKosza(Sim sim)
        {
            var b = sim.world.brama;
            return new XY(b.x1 + 1, b.y1);
        }

        /// <summary>Czy postać jest za zamkniętą kratą — w lochu, a brama opadła.</summary>
        public static bool zaKrata(Sim sim, Creature c)
        {
            var w = sim.world;
            return w.brama.x1 >= w.brama.x0 && !stanBramy(sim).wolne && w.wLochu(c.x, c.y);
        }

        /// <summary>Robotnik podaje przez kratę wszystko, co niesie — porcje lądują w koszu od strony lochu.</summary>
        public static void podajPrzezKrate(Sim sim, Creature c)
        {
            var b = stanBramy(sim);
            b.kosz = (b.kosz ?? 0) + c.carry;
            c.carry = 0;
            var k = miejsceKosza(sim);
            sim.spark(k.x + 0.5, k.y + 0.5, "spore");
            sim.efekt(c.x, c.y - 0.6, "mysl", "podaje jedzenie przez kratę");
        }
    }
}
