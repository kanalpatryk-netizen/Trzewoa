// Port: alpha-1/src/sim/dziennik.ts
using System;
using Trzewia.Js;
using Trzewia.Nastawy;
using JS = Trzewia.Js.Js;
using System.Collections.Generic;
using static Trzewia.Symulacja.Races;

namespace Trzewia.Symulacja
{
    public sealed class WpisDziennika
    {
        public double nr, tick;
        public string kat = "", tekst = "";
        public double? x, y;
    }

    public sealed class StanDziennika
    {
        public bool wlaczony = false;
        public List<WpisDziennika> wpisy = new List<WpisDziennika>();
        /// <summary>Numer następnego wpisu — okienko pamięta, do którego doczytało.</summary>
        public double nastepny = 0;
        public double max = 600;
    }

    /// <summary>Narzędzia dewelopera, które sięgają do pętli gry.</summary>
    public sealed class StanDev
    {
        /// <summary>Mnożnik czasu (1 = zwykły czas). Działa tylko w trybie deweloperskim — w grze czas jest jeden.</summary>
        public double mnoznik = 1;
        /// <summary>Pauza dewelopera: świat stoi, idzie tylko o `krokow` tików na żądanie.</summary>
        public bool pauza = false;
        public double krokow = 0;
        /// <summary>Śledzona postać (id, -1 = nikt) i czy kamera za nią jedzie.</summary>
        public double sledzony = -1;
        public bool sledz = false;
        /// <summary>Kafel pod kursorem (świat) albo null.</summary>
        public XY? kursor = null;
        /// <summary>Średni czas jednego kroku symulacji w ms.</summary>
        public double msKroku = 0;
        /// <summary>Rysunek bez ciemności (mrok działa dalej — tylko go nie widać).</summary>
        public bool bezMroku = false;
        /// <summary>Na płycie: drogi wszystkich postaci, nie tylko śledzonej.</summary>
        public bool pokazDrogi = false;
    }

    /// <summary>
    /// DZIENNIK DEWELOPERA (v4 beta) — proste logi tego, co się teraz dzieje w świecie:
    /// kto czym się zajął, który blok zniknął i gdzie, kto umarł, kto się urodził, jakie karty.
    /// Zbiera tylko wtedy, gdy włączony jest tryb deweloperski — w zwykłej grze nic nie kosztuje.
    /// </summary>
    public static class Dziennik
    {
        public static readonly StanDziennika DZIENNIK = new StanDziennika();
        public static readonly StanDev DEV = new StanDev();

        public static void zapisz(Sim sim, string kat, string tekst, double? x = null, double? y = null)
        {
            if (!DZIENNIK.wlaczony) return;
            DZIENNIK.wpisy.Add(new WpisDziennika { nr = DZIENNIK.nastepny++, tick = sim.tick, kat = kat, tekst = tekst, x = x == null ? (double?)null : Math.Floor(x.Value), y = y == null ? (double?)null : Math.Floor(y.Value) });
            if (DZIENNIK.wpisy.Count > DZIENNIK.max) DZIENNIK.wpisy.RemoveRange(0, DZIENNIK.wpisy.Count - (int)DZIENNIK.max);
        }

        /// <summary>„Ślepy Lud #12 (Grzmotowie)”.</summary>
        public static string kto(Sim sim, Creature c)
        {
            string? rola = c.race == 0 ? (c.rola ?? "pobozny") switch { "pobozny" => "Pobożny", "robotnik" => "Robotnik", "rycerz" => "Rycerz", _ => null } : null;
            var klan = c.clan >= 0 && c.clan < sim.clans.Count ? sim.clans[(int)c.clan].name : "?";
            return $"{rola ?? RACES[(int)c.race].name} #{JS.S(c.id)} ({klan})";
        }

        /// <summary>Co robi, kiedy dostaje dane zajęcie (kolejność jak w enum Job).</summary>
        public static readonly string[] OPIS_PRACY =
        {
            "wędruje", "kopie", "idzie jeść", "modli się", "buduje", "walczy", "ucieka", "idzie płodzić",
            "niesie łup", "bierze w jarzmo", "schodzi w głąb", "najeżdża", "składa ofiarę", "śpi w skale",
            "grzeje się przy ogniu", "wysysa jeńca", "idzie do krypty jako pielgrzym",
            "zbiera jedzenie do spiżarni", "idzie jeść do spiżarni", "niesie jedzenie głodnemu", "trzyma wartę w krypcie", "stoi przy obozie",
        };

        public static readonly string[] NAZWY_KAFLI =
        {
            "pustka", "niebo", "ziemia", "skała", "ruda", "kryształ", "kamień", "grzybnia", "kości",
            "kapliczka", "kuźnia", "sieć", "lęgowisko", "rdzeń", "glif", "miękka skała", "twarda skała", "złoto",
        };
    }
}
