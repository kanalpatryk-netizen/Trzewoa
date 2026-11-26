// Etap 8 (prośba użytkownika z 26.11): „usuń kocioł, zamiast tego postaw tam dużą jedną dźwignię (może ją obsługiwać
// jedna lub 2 dowolne jednostki), ale poziom siły musi wynosić co najmniej 4”, a po raporcie: „każdy z nich osobno musi
// mieć 4 — jeśli tylko jeden będzie miał, to jeden może używać dźwigni, ale będzie jej używał znacząco wolniej”.
//
// Dźwignia stoi w starej komnacie, na miejscu dawnego kotła (world.kociol). Ciągnie ją ten, kto sam ma siłę co najmniej
// POTRZEBA (Sila.Poziom) — dowolnej roli; słabszego rozkaz nie wyśle (Polecenia.wydajDoDzwigni). Mieszczą się dwaj
// (MIEJSCA — po jednej stronie, jeden za drugim, na linach od szczytu ramienia). Dwaj — brama rośnie w tempie jak dawniej
// przy zaklęciach (BRAMA.otwieranie, 40 s do pełna); jeden sam — razy SAM (100 s do pełna). Puszczona dźwignia wraca,
// a krata powoli opada (BRAMA.opadanie).
//
// Działa przy zmianach kręgu (ZmianyKregu.Aktywne). Bez nich — i w Alphie 1 — jest kocioł i zaklęcia dwóch pobożnych
// (Brama.cs, jak w TS).
using System;
using System.Collections.Generic;

namespace Trzewia.Symulacja
{
    public static class Dzwignia
    {
        /// <summary>Tyle siły musi mieć każdy, kto ciągnie dźwignię.</summary>
        public const double POTRZEBA = 4;
        /// <summary>Jeden ciągnie sam: brama rośnie razy tyle (2,5 raza wolniej niż dwaj — 100 s do pełna zamiast 40).</summary>
        public const double SAM = 0.4;
        /// <summary>Gdzie stają ciągnący — kafle w bok od dźwigni (pierwszy bliżej, drugi za nim); tyle też ich mieści się naraz.</summary>
        public static readonly double[] MIEJSCA = { 2, 3 };
        /// <summary>Przy dźwigni: tyle kafli od niej w bok (i rząd w górę albo w dół) — tam się ciągnie.</summary>
        public const double PRZY = 4.5;
        /// <summary>Dźwignia w dół (pełny ruch) w tyle tików, gdy ciągną dwaj (jeden — wolniej, razy SAM); puszczona wraca w tyle.</summary>
        public const double W_DOL_TIKOW = 90, W_GORE_TIKOW = 60;

        /// <summary>Dźwignia zamiast kotła (Krąg Trzeci ze zmianami).</summary>
        public static bool Aktywna => ZmianyKregu.Aktywne;

        /// <summary>Czy postać ma dość siły, żeby ciągnąć dźwignię.</summary>
        public static bool dosycSilny(Creature c) => Sila.Poziom(c) >= POTRZEBA;

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

        /// <summary>Ci, którzy właśnie ciągną: doszli, stoją przy dźwigni i mają dość siły.</summary>
        public static List<Creature> ciagnacy(Sim sim)
        {
            var @out = new List<Creature>();
            foreach (var c in doDzwigni(sim)) if (c.polecenie!.na == true && przyDzwigni(sim, c) && dosycSilny(c)) @out.Add(c);
            return @out;
        }

        /// <summary>Tempo bramy (1 — jak dawniej przy zaklęciach) przy tylu ciągnących: dwaj — 1, jeden — SAM, nikt — 0.</summary>
        public static double tempo(int ciagnacych) => ciagnacych >= 2 ? 1 : ciagnacych == 1 ? SAM : 0;

        /// <summary>
        /// Tik dźwigni (z Brama.tikBramy): ilu ciągnie i gdzie jest ramię. Zwraca tempo, w jakim rośnie brama (0 — nikt
        /// nie ciągnie: krata opada).
        /// </summary>
        public static double tik(Sim sim, StanBramy b)
        {
            var ilu = ciagnacy(sim).Count;
            var t = tempo(ilu);
            b.ciagnie = ilu;
            var u = b.dzwignia ?? 0;
            b.dzwignia = t > 0 ? Math.Min(1, u + t / W_DOL_TIKOW) : Math.Max(0, u - 1 / W_GORE_TIKOW);
            return t;
        }
    }
}
