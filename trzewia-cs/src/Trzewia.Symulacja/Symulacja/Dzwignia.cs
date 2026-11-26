// Etap 8 (prośba użytkownika z 26.11): „usuń kocioł, zamiast tego postaw tam dużą jedną dźwignię (może ją obsługiwać
// jedna lub 2 dowolne jednostki), ale poziom siły musi wynosić co najmniej 4”. Dźwignia stoi w starej komnacie, na
// miejscu dawnego kotła (world.kociol). Ciągnie ją jedna albo dwie postacie dowolnej roli (MIEJSCA — po jednej stronie,
// jedna za drugą, na linach od szczytu ramienia). Brama lochu podnosi się, póki ciągnący mają razem co najmniej POTRZEBA
// siły (Sila.Poziom) — w tym samym tempie co dawniej przy zaklęciach (BRAMA.otwieranie); puszczona dźwignia wraca,
// a krata powoli opada (BRAMA.opadanie). Za słabi szarpią liny, dźwignia ani drgnie.
//
// Działa przy zmianach kręgu (ZmianyKregu.Aktywne). Bez nich — i w Alphie 1 — jest kocioł i zaklęcia dwóch pobożnych
// (Brama.cs, jak w TS).
using System;
using System.Collections.Generic;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static class Dzwignia
    {
        /// <summary>Tyle siły muszą mieć razem ciągnący, żeby dźwignia poszła w dół.</summary>
        public const double POTRZEBA = 4;
        /// <summary>Gdzie stają ciągnący — kafle w bok od dźwigni (pierwszy bliżej, drugi za nim); tyle też ich mieści się naraz.</summary>
        public static readonly double[] MIEJSCA = { 2, 3 };
        /// <summary>Przy dźwigni: tyle kafli od niej w bok (i rząd w górę albo w dół) — tam się ciągnie.</summary>
        public const double PRZY = 4.5;
        /// <summary>Dźwignia w dół (pełny ruch) w tyle tików, puszczona wraca w tyle.</summary>
        public const double W_DOL_TIKOW = 90, W_GORE_TIKOW = 60;
        /// <summary>Za słabi: dźwignia drga, ale nie schodzi niżej niż na tyle (0…1).</summary>
        public const double ZA_SLABI = 0.12;
        /// <summary>Za słabi: myśl nad głową co tyle tików.</summary>
        const double MYSL_CO = 360;

        /// <summary>Dźwignia zamiast kotła (Krąg Trzeci ze zmianami).</summary>
        public static bool Aktywna => ZmianyKregu.Aktywne;

        /// <summary>Czy postać stoi przy dźwigni (tam się ciągnie).</summary>
        public static bool przyDzwigni(Sim sim, Creature c)
        {
            var k = sim.world.kociol;
            return Math.Abs(c.x - (k.x + 0.5)) <= PRZY && Math.Abs(Math.Floor(c.y) - k.y) <= 1;
        }

        /// <summary>Kto ma rozkaz „do dźwigni” (idzie albo już ciągnie).</summary>
        public static List<Creature> doDzwigni(Sim sim)
        {
            var @out = new List<Creature>();
            foreach (var c in sim.creatures) if (!c.dead && c.polecenie?.dzwignia == true && Lud.rolaPostaci(c) != null) @out.Add(c);
            return @out;
        }

        /// <summary>Ci, którzy właśnie ciągną (doszli i stoją przy dźwigni).</summary>
        public static List<Creature> ciagnacy(Sim sim)
        {
            var @out = new List<Creature>();
            foreach (var c in doDzwigni(sim)) if (c.polecenie!.na == true && przyDzwigni(sim, c)) @out.Add(c);
            return @out;
        }

        /// <summary>Siła razem — tych, którzy ciągną.</summary>
        public static double silaCiagnacych(Sim sim)
        {
            double s = 0;
            foreach (var c in ciagnacy(sim)) s += Sila.Poziom(c);
            return s;
        }

        /// <summary>Siła razem dla podanych postaci (podgląd rozkazu: „razem siła 3 z 4”).</summary>
        public static double silaRazem(IEnumerable<Creature> kto)
        {
            double s = 0;
            foreach (var c in kto) s += Sila.Poziom(c);
            return s;
        }

        /// <summary>
        /// Tik dźwigni (z Brama.tikBramy): kto ciągnie, z jaką siłą i gdzie jest ramię. Zwraca true, gdy ciągną dość mocno —
        /// wtedy brama się podnosi.
        /// </summary>
        public static bool tik(Sim sim, StanBramy b)
        {
            var kto = ciagnacy(sim);
            double sila = 0;
            foreach (var c in kto) sila += Sila.Poziom(c);
            var dosc = kto.Count > 0 && sila >= POTRZEBA;
            b.ciagnie = kto.Count;
            b.silaDzwigni = sila;
            var cel = dosc ? 1 : kto.Count > 0 ? ZA_SLABI : 0;
            var u = b.dzwignia ?? 0;
            b.dzwignia = u < cel ? Math.Min(cel, u + 1 / W_DOL_TIKOW) : Math.Max(cel, u - 1 / W_GORE_TIKOW);
            if (kto.Count > 0 && !dosc && (sim.tick % MYSL_CO) == 0)
            {
                var k = sim.world.kociol;
                foreach (var c in kto) sim.efekt(c.x, c.y - 0.6, "mysl", $"za ciężka… siła {JS.S(sila)} z {JS.S(POTRZEBA)}");
                sim.gdzie(k.x, k.y).log($"Dźwignia w starej komnacie ani drgnie — ciągnący mają razem siłę {JS.S(sila)}, a trzeba {JS.S(POTRZEBA)}.", "swiat", "dzwignia-za-slabi");
            }
            return dosc;
        }
    }
}
