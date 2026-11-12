// Port: alpha-1/src/sim/zabytki.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Dziennik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Stan zabytków w symulacji (sim.lud.zabytki — trafia do zapisu). Klucz: numer ruiny w world.ruiny.</summary>
    public sealed class StanZabytkow
    {
        /// <summary>Stan zabytku z ruiny: 'odkryty' | 'wziety' | 'zostawiony' (brak — leży nieodkryty).</summary>
        public SortedDictionary<int, string> stan = new SortedDictionary<int, string>();
        /// <summary>Tik ostatniej zmiany stanu.</summary>
        public SortedDictionary<int, double> od = new SortedDictionary<int, double>();
        /// <summary>Kto z ludu go odkrył (id).</summary>
        public SortedDictionary<int, double> kto = new SortedDictionary<int, double>();
        /// <summary>Wzięte zabytki — ich premie i kary działają na cały lud, na zawsze.</summary>
        public List<string> wziete = new List<string>();
    }

    /// <summary>
    /// ZABYTKI (Alpha, etap 3e) — w każdej ruinie leży zabytek; odkryty pokazuje kartę „Weź / Zostaw” (patrz zabytki.ts).
    /// </summary>
    public static class Zabytki
    {
        public static StanZabytkow stanZabytkow(Sim sim) => sim.lud.zabytki ??= new StanZabytkow();

        /// <summary>Czy lud wziął ten zabytek (jego premia i kara działają).</summary>
        public static bool maZabytek(Sim sim, string typ) => sim.lud.zabytki?.wziete.Contains(typ) == true;

        /// <summary>Wołane z tikLudu: kto doszedł do zabytku — odkrywa go; po chwili unoszenia — karta wyboru.</summary>
        public static void tikZabytkow(Sim sim)
        {
            var ruiny = sim.world.ruiny;
            if (ruiny.Count == 0 || sim.tick % ZABYTKI.sprawdzajCo != 0) return;
            var st = stanZabytkow(sim);
            for (var n = 0; n < ruiny.Count; n++)
            {
                var r = ruiny[n];
                if (st.stan.TryGetValue(n, out var s0) && !string.IsNullOrEmpty(s0)) continue;
                var z = r.zabytek;
                var ktos = sim.creatures.FirstOrDefault(c => !c.dead && rolaPostaci(c) != null && JS.Hypot(c.x - (z.x + 0.5), c.y - (z.y + 0.5)) <= ZABYTKI.odkrycieZasieg);
                if (ktos == null) continue;
                st.stan[n] = "odkryty"; st.od[n] = sim.tick; st.kto[n] = ktos.id;
                var zab = ZABYTEK[z.typ];
                sim.gdzie(z.x + 0.5, z.y + 0.5).log($"{nazwa(ktos)} odkrył w {RUINA[r.rodzaj].miejscownik} zabytek: {zab.biernik}.", "swiat", $"zabytek-odkryty-{n}");
                zapisz(sim, "swiat", $"zabytek odkryty: {zab.nazwa} ({RUINA[r.rodzaj].nazwa}, {JS.S(z.x)}, {JS.S(z.y)}) — odkrył #{JS.S(ktos.id)}", z.x, z.y);
            }
            // karta: gdy zabytek już się uniósł, a żadna inna karta nie wisi
            var wyd = sim.wydarzenia;
            if (wyd.biezace != null) return;
            foreach (var kv in st.stan.ToList())
            {
                var n = kv.Key;
                if (kv.Value != "odkryty" || sim.tick - (st.od.TryGetValue(n, out var o) ? o : 0) < ZABYTKI.kartaPo || n >= ruiny.Count) continue;
                wyd.biezace = kartaZabytku(sim, n);
                wyd.ile++;
                zapisz(sim, "karta", $"nowa karta: {wyd.biezace.tytul}");
                return;
            }
        }

        /// <summary>Co wybiera automat: na razie zostawia każdy zabytek.</summary>
        static readonly Dictionary<string, bool> BRAC = new Dictionary<string, bool> { ["relikwiarz"] = false, ["miecz"] = false, ["kielich"] = false, ["ksiega"] = false };

        static Wydarzenie kartaZabytku(Sim sim, int n)
        {
            var r = sim.world.ruiny[n];
            var z = ZABYTEK[r.zabytek.typ];
            var c = sim.creatureById(stanZabytkow(sim).kto.TryGetValue(n, out var k) ? k : -1);
            return new Wydarzenie
            {
                rodzaj = "zabytek", tytul = z.nazwa,
                tekst = $"{(c != null ? nazwa(c) : "Ktoś z ludu")} odkrył w {RUINA[r.rodzaj].miejscownik} {z.biernik}. {z.opis}",
                wybory = new List<Wybor>
                {
                    new Wybor { id = "wez", tekst = "Weź", skutek = $"Cały lud, na zawsze: {z.premia} — ale {z.kara}. Sen w sypialni kary nie zdejmie.", krew = 0, wiara = 0 },
                    new Wybor { id = "zostaw", tekst = "Zostaw", skutek = "Zabytek opadnie i zgaśnie — zostanie w ruinach.", krew = 0, wiara = 0 },
                },
                domyslny = 1, rozsadny = BRAC.TryGetValue(r.zabytek.typ, out var b) && b ? 0 : 1,
                cel = new CelKarty { x = r.zabytek.x + 0.5, y = r.zabytek.y + 0.5, tekst = z.nazwa.ToLowerInvariant() },
                od = sim.tick, x = n,
            };
        }

        /// <summary>Wybór z karty zabytku (sim/wydarzenia.ts: wykonaj).</summary>
        public static void rozstrzygnijZabytek(Sim sim, double nd, bool wez)
        {
            var r = JS.At(sim.world.ruiny, nd);
            if (r == null) return;
            var n = (int)nd;
            var st = stanZabytkow(sim);
            if (!st.stan.TryGetValue(n, out var s) || s != "odkryty") return;
            st.stan[n] = wez ? "wziety" : "zostawiony";
            st.od[n] = sim.tick;
            var zab = ZABYTEK[r.zabytek.typ];
            if (wez)
            {
                if (!st.wziete.Contains(r.zabytek.typ)) st.wziete.Add(r.zabytek.typ);
                sim.gdzie(r.zabytek.x + 0.5, r.zabytek.y + 0.5).log($"Lud wziął {zab.biernik}: {zab.premia} — ale {zab.kara}. Na zawsze.", "wiara", $"zabytek-{n}");
            }
            else
            {
                sim.gdzie(r.zabytek.x + 0.5, r.zabytek.y + 0.5).log($"{zab.nazwa} zostaje w {RUINA[r.rodzaj].miejscownik} — gaśnie.", "swiat", $"zabytek-{n}");
            }
            zapisz(sim, "swiat", $"zabytek {(wez ? "wzięty" : "zostawiony")}: {zab.nazwa}", r.zabytek.x, r.zabytek.y);
        }

        /// <summary>Premie i kary wziętych zabytków jako wiersze na karcie postaci.</summary>
        public static List<StanPostaci> stanyZabytkow(Sim sim, Creature c)
        {
            var wz = sim.lud.zabytki?.wziete;
            if (wz == null || wz.Count == 0) return new List<StanPostaci>();
            var rola = rolaPostaci(c);
            var @out = new List<StanPostaci>();
            var st = sim.lud.zabytki!;
            foreach (var typ in wz)
            {
                var n = sim.world.ruiny.FindIndex(r => r.zabytek.typ == typ);
                if (n >= 0 && st.stan.TryGetValue(n, out var s) && s == "wziety" && sim.tick - (st.od.TryGetValue(n, out var o) ? o : 0) < ZABYTKI.aureolePo) continue;
                var z = ZABYTEK[typ];
                // miecz działa tylko na rycerza — i premia, i kara
                if (typ == "miecz" && rola != "rycerz") continue;
                @out.Add(new StanPostaci { nazwa = z.nazwa.ToLowerInvariant(), skutek = z.premia, dobry = true, kiedy = "zabytek — na zawsze" });
                @out.Add(new StanPostaci { nazwa = $"{z.nazwa.ToLowerInvariant()} — cena", skutek = z.kara, dobry = false, kiedy = "zabytek — na zawsze, sen tego nie zdejmie" });
            }
            return @out;
        }

        static string nazwa(Creature c)
        {
            var r = rolaPostaci(c);
            return r != null ? NAZWA_ROLI[r] : "Ktoś";
        }
    }
}
