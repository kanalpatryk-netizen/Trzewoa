// Port: alpha-1/src/powers/powers.ts i powers/rozkazy.ts
using System;
using Trzewia.Js;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using static Trzewia.Nastawy.NastawyMoce;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Pielgrzymka;
using static Trzewia.Symulacja.Dlon;
using static Trzewia.Symulacja.Wiadro;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class Narzedzie { public string id = "", label = "", hint = ""; }
    public sealed class Koszt { public double krew, wiara, otchlan; }

    /// <summary>
    /// Trzy ryty: Nakarm (dodatkowe wiadro z jedzeniem), Szepnij (jedna myśl w jedną głowę) i Cud (objawienie).
    /// Wewnętrzne nazwy zostały po dawnych rytach: „zasiej” to Nakarm, „znak” to Cud. (Czasownik: 'zasiej' | 'szept' | 'znak'.)
    /// </summary>
    public static class Moce
    {
        public static readonly Dictionary<string, Narzedzie[]> TOOLS = new Dictionary<string, Narzedzie[]>
        {
            ["zasiej"] = new[] { new Narzedzie { id = "grzyb", label = "wiadro", hint = "z góry, szybem, zjedzie dodatkowe jedzenie do wiadra — dotknij płyty" } },
            ["szept"] = new[]
            {
                new Narzedzie { id = "modl", label = "módl się", hint = "idzie do krypty i modli się przy pomniku" },
                new Narzedzie { id = "przerwij", label = "przerwij modlitwę", hint = "wraca do swoich i przez minutę nie idzie się modlić" },
            },
            ["znak"] = new[] { new Narzedzie { id = "objawienie", label = "objawienie", hint = "wszyscy dookoła widzą cud; ich oddanie rośnie" } },
        };

        /// <summary>Ile kosztuje (cennik w nastawy/moce.ts; nieznane narzędzie kosztuje tyle, co pierwsze z listy).</summary>
        public static Koszt cost(string verb, string tool)
        {
            var cennik = KOSZTY[verb];
            object? wpis = null, pierwszy = null;
            foreach (var p in cennik.GetType().GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                var w = p.GetValue(cennik);
                if (w == null) continue;
                pierwszy ??= w;
                if (p.Name == tool) wpis = w;
            }
            var e = wpis ?? pierwszy!;
            double pole(string n) => (double)e.GetType().GetField(n)!.GetValue(e)!;
            return new Koszt { krew = pole("krew"), wiara = pole("wiara"), otchlan = pole("otchlan") };
        }

        /// <summary>Czy stać cię na to — z odliczeniem tego, co już zarezerwowały rozkazy z pauzy.</summary>
        public static bool affordable(Sim sim, string verb, string tool)
        {
            var c = cost(verb, tool);
            var r = sim.rezerwa;
            return sim.krew - r.krew >= c.krew && sim.wiara - r.wiara >= c.wiara && sim.otchlan - r.otchlan >= c.otchlan;
        }

        static bool pay(Sim sim, string verb, string tool)
        {
            var c = cost(verb, tool);
            if (!affordable(sim, verb, tool)) return false;
            if (c.otchlan > 0 && !sim.spendOtchlan(c.otchlan)) return false;
            sim.krew -= c.krew; sim.wiara -= c.wiara;
            return true;
        }

        /// <summary>Zasiew (Remake v2: Nakarm spuszcza wiadro z jedzeniem).</summary>
        public static bool seed(Sim sim, string tool, double tx, double ty, bool zaplac = true)
        {
            var w = sim.world;
            if (!w.inb(tx, ty)) return false;
            if (REMAKE && tool == "grzyb") return nakarm(sim, tx, ty, zaplac) == null;
            if (zaplac && !pay(sim, "zasiej", tool)) return false;
            var r = MOCE.zasiewPromien;
            var szansa = MOCE.zasiewSzansa;
            for (var dy = -r; dy <= r; dy++)
            {
                for (var dx = -r; dx <= r; dx++)
                {
                    double x = tx + dx, y = ty + dy;
                    if (!w.inb(x, y) || dx * dx + dy * dy > r * r) continue;
                    var i = w.idx(x, y);
                    var solid = PASSABLE[w.tile[i]] != 1;
                    var twarde = w.tile[i] == T.CORE || w.tile[i] == T.STONE || w.tile[i] == T.SHRINE || w.tile[i] == T.FORGE;
                    if (tool == "ruda" && solid && !twarde && sim.rng.chance(szansa.ruda)) w.tile[i] = T.ORE;
                    if (tool == "grzyb" && !solid && sim.rng.chance(szansa.grzyb)) w.tile[i] = T.FUNGUS;
                    if (tool == "kosci" && !solid && sim.rng.chance(szansa.kosci)) w.tile[i] = T.BONES;
                    w.oznaczSlad(x, y, 1, sim.tick);
                }
            }
            sim.efekt(tx + 0.5, ty + 0.5, "zasiew");
            for (var i = 0; i < 4; i++) sim.spark(tx + 0.5, ty + 0.5, tool == "grzyb" ? "spore" : "glint");
            return true;
        }

        /// <summary>Remake v2: ryt Nakarm — z góry, na linie, zjeżdża dodatkowe jedzenie. Powód odmowy albo null.</summary>
        public static string? nakarm(Sim sim, double tx, double ty, bool zaplac = true)
        {
            if (zaplac && !affordable(sim, "zasiej", "grzyb")) return "Nie starczy krwi na wiadro.";
            var odmowa = wiadroNaZadanie(sim);
            if (odmowa != null) return odmowa;
            if (zaplac) { pay(sim, "zasiej", "grzyb"); sim.stat.nakarm++; }
            // znak nad otworem, którym zjeżdża jedzenie (nie tam, gdzie dotknięto)
            sim.efekt(sim.world.szybWiadraX + 0.5, sim.world.szybWiadraDol + 1, "zasiew");
            return null;
        }

        static int THOUGHTS(string tool) => tool switch { "modl" => Thought.PRAY_CORE, "prorok" => Thought.PROPHESY, "uciekaj" => Thought.FLEE_UP, _ => Thought.NONE };

        /// <summary>Remake v1: czy postać się modli albo idzie się modlić.</summary>
        public static bool modliSie(Creature c) =>
            c.job == Job.PRAY || c.job == Job.PIELGRZYM || c.thought == Thought.PRAY_CORE || c.wyprawa == true || c.modliPrzyObozie == true;

        /// <summary>Szept — najtańszy i najprecyzyjniejszy.</summary>
        public static bool whisper(Sim sim, string tool, Creature c)
        {
            if (c.straznik == true) return false;
            if (tool == "okalecz" || tool == "ofiaruj") return false;
            if (tool == "przerwij" && !modliSie(c)) return false;
            if (!pay(sim, "szept", tool)) return false;
            if (tool == "przerwij")
            {
                var klan = sim.klan(c.clan);
                c.thought = Thought.NONE;
                c.job = Job.WANDER; c.droga = null;
                c.jx = klan?.hx ?? Math.Floor(c.x); c.jy = klan?.hy ?? Math.Floor(c.y);
                c.jt = 0;
                c.bezModlitwyDo = sim.tick + LUD.przerwaModlitwy;
                c.wyprawa = false;
                sim.efekt(c.x, c.y, "mysl", "wraca");
                return true;
            }
            c.thought = THOUGHTS(tool);
            c.jt = 0;
            if (tool == "uciekaj") c.fear = 1;
            var napis = TOOLS["szept"].FirstOrDefault(t => t.id == tool)?.label ?? tool;
            sim.efekt(c.x, c.y, "szept", napis);
            if (tool == "modl") odswiezPlan(sim);
            sim.spark(c.x, c.y - 0.5, "pray");
            return true;
        }

        /// <summary>Znak — jawny cud. Drogi, widziany przez wszystkich w okolicy.</summary>
        public static bool sign(Sim sim, string tool, double tx, double ty)
        {
            var w = sim.world;
            if (!pay(sim, "znak", tool)) return false;
            if (w.inb(tx, ty) && PASSABLE[w.tile[w.idx(tx, ty)]] == 1) w.set(tx, ty, T.GLYPH);
            var seen = new JsSet<double>();
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                var d = JS.Hypot(c.x - tx, c.y - ty);
                if (d > MOCE.znakZasieg) continue;
                seen.add(c.clan);
                if (tool == "objawienie")
                {
                    c.devotion = Math.Min(1, c.devotion + MOCE.objawienieOddanie);
                    c.fear *= MOCE.objawienieStrach;
                }
                else
                {
                    c.fear = 1;
                    c.thought = Thought.FLEE_UP;
                    c.jt = 0;
                }
            }
            foreach (var id in seen)
            {
                var k = sim.clans[(int)id];
                k.devotion = tool == "objawienie" ? Math.Min(1, k.devotion + MOCE.objawienieNacja) : Math.Max(0, k.devotion - MOCE.panikaNacja);
            }
            sim.efekt(tx + 0.5, ty + 0.5, tool == "objawienie" ? "objawienie" : "cud");
            for (var i = 0; i < 8; i++) sim.spark(tx + 0.5, ty + 0.5, "pray");
            // światło Cudu przegania dłoń z otchłani
            odpedzDlon(sim, tx + 0.5, ty + 0.5);
            var names = string.Join(", ", seen.Select(i => sim.clans[(int)i].name).Take(3));
            sim.log(tool == "objawienie"
                ? $"Znak rozbłysł w skale. Widzieli go: {(names.Length > 0 ? names : "nikt")}."
                : $"Skała krzyknęła. {(names.Length > 0 ? names : "Nikt")} rzucili się do ucieczki.", "wiara");
            return true;
        }

        /// <summary>Zmiana krwi gatunku (stare zapisy mogą nosić skazy — wczytywanie odtwarza je tą funkcją).</summary>
        public static void applyTaintEffect(int race, string tool)
        {
            var d = RACES[race];
            switch (tool)
            {
                case "plodnosc": { var s = SKAZY.plodnosc; d.breedRate *= s.plodnosc; d.lifespan *= s.dlugoscZycia; d.metabolism *= s.metabolizm; break; }
                case "zadza": { var s = SKAZY.zadza; d.strength *= s.sila; d.eatsMeat = true; d.fearGain *= s.strach; d.faithGain *= s.wiara; break; }
                case "slepota": { var s = SKAZY.slepota; d.speed *= s.szybkosc; d.faithGain *= s.wiara; d.digPower *= s.kopanie; break; }
                case "kamien": { var s = SKAZY.kamien; d.maxHp *= s.zdrowie; d.speed *= s.szybkosc; d.digPower *= s.kopanie; d.metabolism *= s.metabolizm; break; }
            }
        }
    }

    /// <summary>Jeden zamiar wydany w pauzie: co, gdzie i ile już zarezerwowano.</summary>
    public sealed class Rozkaz
    {
        public string czasownik = "";
        public string narzedzie = "";
        public double x, y;
        /// <summary>Szept: kto ma usłyszeć.</summary>
        public double? kto;
        public Koszt koszt = new Koszt();
    }

    public sealed class Wykonanie { public Rozkaz rozkaz = null!; public bool udane; }

    /// <summary>Plan z pauzy: w zatrzymanym świecie wydajesz rozkazy, one rezerwują koszt, a dzieją się po puszczeniu czasu.</summary>
    public sealed class Rozkazy
    {
        public List<Rozkaz> lista = new List<Rozkaz>();
        Sim? sim;

        /// <summary>Nowa góra albo wczytany zapis — stary plan nie ma prawa dotknąć nowego świata.</summary>
        void pilnuj(Sim s)
        {
            if (sim == s) return;
            sim = s;
            lista = new List<Rozkaz>();
        }

        public int ile => lista.Count;

        /// <summary>Dopisuje rozkaz do planu. Powód odmowy albo null.</summary>
        public string? zaplanuj(Sim s, Rozkaz r)
        {
            pilnuj(s);
            var w = s.world;
            if (!Moce.affordable(s, r.czasownik, r.narzedzie)) return "Nie stać cię — część zasobów trzyma już plan.";
            switch (r.czasownik)
            {
                case "zasiej":
                    if (!w.inb(r.x, r.y)) return "Poza górą.";
                    if (lista.Any(o => o.czasownik == "zasiej" && o.narzedzie == r.narzedzie && JS.Hypot(o.x - r.x, o.y - r.y) < MOCE.planOdstepZasiew)) return "";
                    break;
                case "znak":
                    if (lista.Any(o => o.czasownik == "znak" && JS.Hypot(o.x - r.x, o.y - r.y) < 3)) return "Tu już stoi twój Znak.";
                    break;
                case "szept":
                    foreach (var o in lista.Where(o => o.czasownik == "szept" && o.kto == r.kto).ToList()) usun(s, o);
                    break;
            }
            var k = Moce.cost(r.czasownik, r.narzedzie);
            s.rezerwa.krew += k.krew; s.rezerwa.wiara += k.wiara; s.rezerwa.otchlan += k.otchlan;
            lista.Add(new Rozkaz { czasownik = r.czasownik, narzedzie = r.narzedzie, x = r.x, y = r.y, kto = r.kto, koszt = k });
            return null;
        }

        void usun(Sim s, Rozkaz o)
        {
            var i = lista.IndexOf(o);
            if (i < 0) return;
            lista.RemoveAt(i);
            s.rezerwa.krew = Math.Max(0, s.rezerwa.krew - o.koszt.krew);
            s.rezerwa.wiara = Math.Max(0, s.rezerwa.wiara - o.koszt.wiara);
            s.rezerwa.otchlan = Math.Max(0, s.rezerwa.otchlan - o.koszt.otchlan);
        }

        /// <summary>Skreśla ostatni rozkaz.</summary>
        public bool cofnij(Sim s)
        {
            pilnuj(s);
            if (lista.Count == 0) return false;
            usun(s, lista[lista.Count - 1]);
            return true;
        }

        public void skreslWszystkie(Sim s)
        {
            pilnuj(s);
            foreach (var o in lista.ToList()) usun(s, o);
        }

        /// <summary>Rozkaz, którego szkic leży pod tym miejscem świata (ostatni narysowany wygrywa).</summary>
        public Rozkaz? pod(Sim s, double wx, double wy)
        {
            pilnuj(s);
            for (var i = lista.Count - 1; i >= 0; i--)
            {
                var o = lista[i];
                double x = o.x, y = o.y;
                if (o.kto != null)
                {
                    var c = s.creatureById(o.kto.Value);
                    if (c != null) { x = c.x; y = c.y; }
                }
                var r = o.czasownik == "znak" ? 2.2 : o.czasownik == "zasiej" ? 2.4 : 2;
                if (JS.Hypot(wx - x, wy - y) <= r) return o;
            }
            return null;
        }

        public void skresl(Sim s, Rozkaz o) { pilnuj(s); usun(s, o); }

        /// <summary>Czas puszczony: wszystko dzieje się naraz, w kolejności wydania.</summary>
        public List<Wykonanie> wykonaj(Sim s)
        {
            pilnuj(s);
            var wyniki = new List<Wykonanie>();
            foreach (var o in lista.ToList())
            {
                usun(s, o);
                var udane = false;
                switch (o.czasownik)
                {
                    case "zasiej": udane = Moce.seed(s, o.narzedzie, o.x, o.y); break;
                    case "znak": udane = Moce.sign(s, o.narzedzie, o.x, o.y); break;
                    case "szept":
                    {
                        var c = o.kto != null ? s.creatureById(o.kto.Value) : null;
                        udane = c != null && !c.dead && Moce.whisper(s, o.narzedzie, c);
                        break;
                    }
                }
                wyniki.Add(new Wykonanie { rozkaz = o, udane = udane });
            }
            return wyniki;
        }
    }
}
