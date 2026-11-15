// Port: alpha-1/src/sim/lud.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyKartyLudu;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Wiadro;
using static Trzewia.Symulacja.Trupy;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Pomnik;
using static Trzewia.Symulacja.DlonDemona;
using static Trzewia.Symulacja.Dlon;
using static Trzewia.Symulacja.Aniol;
using static Trzewia.Symulacja.Zabytki;
using static Trzewia.Symulacja.Zbroja;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class CzoloDrogi { public double i, od, prob, zk; }
    public sealed class SkladLudu { public double x, y, ilosc; }
    public sealed class ObozLudu { public double x, y, ilu; }
    public sealed class Spizarnia { public double x, y, ilosc; /** tik założenia */ public double? od; }

    /// <summary>Stan ludu w symulacji (trafia do zapisu).</summary>
    public sealed class StanLudu
    {
        /// <summary>Tik ostatnich przenosin siedziby.</summary>
        public double siedzibaT;
        /// <summary>Czoło drogi, które stoi mimo kopaczy, i kafle chwilowo omijane przez plan drogi ([kafel, do kiedy]).</summary>
        public CzoloDrogi? czolo;
        public List<double[]>? omijaj;
        /// <summary>Stara spiżarnia po przenosinach.</summary>
        public SkladLudu? sklad;
        /// <summary>Odcięte grupki (liczone przy przenosinach siedziby).</summary>
        public List<ObozLudu> obozy = new List<ObozLudu>();
        /// <summary>Obozy frontowe — miejsca postoju pobożnych i rycerzy.</summary>
        public List<Spizarnia> spizarnie = new List<Spizarnia>();
        public double? obozT;
        public StanStraznikow? straznicy;
        public StanDloni? dlon;
        public StanWiader? wiadra;
        public List<Trup>? trupy;
        public StanOltarza? oltarz;
        public double? liny;
        public StanZabytkow? zabytki;
        public StanAniola? aniol;
        public StanPomnika? pomnik;
        public StanDloniDemona? dlonDemona;
        public bool? helmy;
        public double? oltarzPo;
        public StanBramy? brama;
        public StanBudowySchodow? schody;
    }

    /// <summary>Jedna spiżarnia ludu — siedziby albo obozu — z tym, co się z nią robi.</summary>
    public sealed class MiejsceJedzenia
    {
        public double x, y, ilosc;
        public bool baza;
        public Func<double, double> wez = _ => 0;
        public Action<double> odloz = _ => { };
    }

    /// <summary>Liczba ludu w każdej roli (Record&lt;Rola, number&gt;).</summary>
    public sealed class IleRol { public double pobozny, robotnik, rycerz; }

    /// <summary>Stan postaci widoczny dla gracza: aureola nad głową i wiersz na karcie.</summary>
    public sealed class StanPostaci
    {
        public string nazwa = "";
        /// <summary>co daje albo odbiera</summary>
        public string skutek = "";
        /// <summary>wzmocnienie (jasna aureola) czy osłabienie (czerwona)</summary>
        public bool dobry;
        /// <summary>tik, w którym minie (brak = na zawsze)</summary>
        public double? @do;
        /// <summary>zamiast „mija za…”</summary>
        public string? kiedy;
        /// <summary>stan nieczynny — tylko wiersz na karcie, bez aureoli</summary>
        public bool? uspiony;
        /// <summary>działa, ale bez aureoli</summary>
        public bool? bezAureoli;
    }

    /// <summary>
    /// LUD (Remake v1) — role postaci, wędrowna siedziba i przegrana „nie możesz już wygrać”. Liczby: nastawy/lud.ts.
    /// </summary>
    public static class Lud
    {
        public static readonly Dictionary<string, string> NAZWA_ROLI = new Dictionary<string, string> { ["pobozny"] = "Pobożny", ["robotnik"] = "Robotnik", ["rycerz"] = "Rycerz" };
        public static readonly Dictionary<string, string> NAZWA_ROLI_MNOGA = new Dictionary<string, string> { ["pobozny"] = "pobożni", ["robotnik"] = "robotnicy", ["rycerz"] = "rycerze" };

        /// <summary>Remake v2: jedzenie leży już tylko w wiadrach (sim/wiadro.ts).</summary>
        public static List<MiejsceJedzenia> wszystkieSpizarnie(Sim sim) => zrodlaJedzenia(sim);

        /// <summary>Obozy ludu — siedziba i obozy frontowe: miejsca postoju (bez jedzenia).</summary>
        public static List<MiejsceJedzenia> obozyLudu(Sim sim)
        {
            var @out = new List<MiejsceJedzenia>();
            var klan = klanLudu(sim);
            if (klan != null) @out.Add(new MiejsceJedzenia { x = klan.hx, y = klan.hy, baza = true, ilosc = 0 });
            foreach (var s in sim.lud.spizarnie) @out.Add(new MiejsceJedzenia { x = s.x, y = s.y, baza = false, ilosc = 0 });
            return @out;
        }

        /// <summary>Najbliższe wiadro (w linii prostej) — z jedzeniem albo dowolne stojące.</summary>
        public static MiejsceJedzenia? najblizszaSpizarnia(Sim sim, double x, double y, bool _zJedzeniem)
        {
            MiejsceJedzenia? best = null; var bd = double.PositiveInfinity;
            foreach (var s in wszystkieSpizarnie(sim))
            {
                var d = JS.Hypot(s.x - x, s.y - y);
                if (d < bd) { bd = d; best = s; }
            }
            return best;
        }

        /// <summary>Wiadra z jedzeniem od najbliższego (w linii prostej).</summary>
        public static List<MiejsceJedzenia> spizarnieWgOdleglosci(Sim sim, double x, double y, bool _zJedzeniem) =>
            JS.Sort(wszystkieSpizarnie(sim), (a, b) => JS.Hypot(a.x - x, a.y - y) - JS.Hypot(b.x - x, b.y - y));

        /// <summary>Najbliższy obóz (siedziba albo obóz frontowy) w linii prostej.</summary>
        public static MiejsceJedzenia? najblizszyOboz(Sim sim, double x, double y)
        {
            MiejsceJedzenia? best = null; var bd = double.PositiveInfinity;
            foreach (var s in obozyLudu(sim))
            {
                var d = JS.Hypot(s.x - x, s.y - y);
                if (d < bd) { bd = d; best = s; }
            }
            return best;
        }

        /// <summary>Obozy od najbliższego (w linii prostej).</summary>
        public static List<MiejsceJedzenia> obozyWgOdleglosci(Sim sim, double x, double y) =>
            JS.Sort(obozyLudu(sim), (a, b) => JS.Hypot(a.x - x, a.y - y) - JS.Hypot(b.x - x, b.y - y));

        /// <summary>Obóz frontowy: obóz najbliżej rdzenia — tam stacjonują pobożni i rycerze.</summary>
        public static MiejsceJedzenia? obozFrontowy(Sim sim)
        {
            var w = sim.world;
            MiejsceJedzenia? best = null; var bd = double.PositiveInfinity;
            foreach (var s in obozyLudu(sim))
            {
                var d = JS.Hypot(s.x - w.coreX, s.y - w.coreY);
                if (d < bd) { bd = d; best = s; }
            }
            return best;
        }

        /// <summary>Wiadro z jedzeniem stojące na tym kaflu (albo tuż obok).</summary>
        public static MiejsceJedzenia? spizarniaW(Sim sim, double x, double y) =>
            wszystkieSpizarnie(sim).FirstOrDefault(s => Math.Abs(s.x - x) <= 1 && Math.Abs(s.y - y) <= 1);

        /// <summary>Stacjonujący: pobożni i rycerze — jedzenie przynoszą im robotnicy.</summary>
        public static bool stacjonuje(Creature c)
        {
            var r = rolaPostaci(c);
            return r == "pobozny" || r == "rycerz";
        }

        public static StanLudu nowyStanLudu() => new StanLudu { siedzibaT = 0, sklad = null, obozy = new List<ObozLudu>(), spizarnie = new List<Spizarnia>() };

        /// <summary>Rola postaci ludu — albo null dla obcych nacji.</summary>
        public static string? rolaPostaci(Creature c) => c.race == Race.GOBLIN ? (c.rola ?? "pobozny") : null;

        /// <summary>Alpha: postać z ludu oberwała — znacznik dla głosu bólu; mocny cios wygrywa w jednym tiku ze słabym.</summary>
        public static void oznaczCios(Sim sim, Creature c, bool mocno)
        {
            if (rolaPostaci(c) == null) return;
            c.oberwal = new Oberwal { t = sim.tick, mocno = mocno || (c.oberwal?.t == sim.tick && c.oberwal.mocno) };
        }

        static readonly string[] KOLEJNOSC_DAROW = { "sila", "szybkosc", "kopanie", "modlitwa" };

        /// <summary>Mnożnik statystyki: rola × okaleczenie × weteran × zatrucie × hełm × szał × zabytki × zbroja.</summary>
        public static double mnoznik(Sim sim, Creature c, string co)
        {
            var r = rolaPostaci(c);
            if (r == null) return 1;
            var v = LUD.role[r][co];
            if (c.okaleczony == true && (co == "hp" || co == "sila" || co == "szybkosc")) v *= LUD.okaleczenie;
            if (co != "hp" && co != "glod" && weteranAktywny(sim, c)) v *= LUD.weteranPremia;
            if (c.zatrutyDo != null && sim.tick < c.zatrutyDo && (co == "sila" || co == "szybkosc" || co == "kopanie")) v *= KARTY_LUDU.zatrucie;
            // Remake v2: robotnik w hełmie (rycerzy brak) — mocniejszy i walczy
            if (c.helm == true && r == "robotnik" && (co == "hp" || co == "sila")) v *= LUD.helm[co];
            // etap 3d: szał krwi z ołtarza
            if (co == "sila" && c.szalDo != null && sim.tick < c.szalDo) v *= OLTARZ.rytualy.szal.sila;
            // etap 3e: wzięte zabytki — premia i kara dla całego ludu, na zawsze
            var wz = sim.lud.zabytki?.wziete;
            if (wz != null && wz.Count > 0)
            {
                var Z = ZABYTKI.skutki;
                if (wz.Contains("relikwiarz")) { if (co == "modlitwa") v *= Z.relikwiarz.modlitwa; if (co == "kopanie") v *= Z.relikwiarz.kopanie; }
                if (wz.Contains("miecz") && r == "rycerz") { if (co == "sila") v *= Z.miecz.silaRycerza; if (co == "szybkosc") v *= Z.miecz.szybkoscRycerza; }
                if (wz.Contains("kielich") && co == "glod") v *= Z.kielich.glod;
            }
            // etap 3f: zbroja z kuźni (tylko rycerz ją nosi)
            if (r == "rycerz" && c.zbroja != null && c.zbroja.Count > 0) v *= mnoznikZbroi(c, co);
            // 6.11: błogosławieństwo pobożnego, który modli się za innych
            if (c.blogDo != null && sim.tick < c.blogDo)
            {
                var dar = BLOGOSLAWIENSTWO.dary.TryGetValue(r, out var dd) ? dd[co] : null;
                if (JS.Tak(dar)) v *= dar!.Value;
                if (co == "glod") v *= BLOGOSLAWIENSTWO.glod;
            }
            // 6.11: pod kratą stalowej bramy lochu, gdy wisi nisko — czołga się, wolniej
            if (co == "szybkosc")
            {
                var b = sim.world.brama; double tx = Math.Floor(c.x), ty = Math.Floor(c.y);
                if (tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1 && (sim.lud.brama?.otwarcie ?? 0) < BRAMA.idzieOd) v *= BRAMA.czolganie;
            }
            return v;
        }

        /// <summary>Remake v2: kto walczy ze Strażnikami jak rycerz — rycerz albo robotnik w hełmie.</summary>
        public static bool walczacy(Creature c)
        {
            var r = rolaPostaci(c);
            return r == "rycerz" || (r == "robotnik" && c.helm == true);
        }

        /// <summary>Remake v2: gdy w ludzie nie ma ani jednego rycerza, robotnicy zakładają hełmy (i zdejmują, gdy rycerze wrócą).</summary>
        static void pilnujHelmow(Sim sim)
        {
            int rycerzy = 0, robotnikow = 0;
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                var r = rolaPostaci(c);
                if (r == "rycerz") rycerzy++; else if (r == "robotnik") robotnikow++;
            }
            var helmy = rycerzy == 0;
            if (helmy && robotnikow > 0) sim.stat.helmy = 1;
            foreach (var c in sim.creatures)
            {
                if (c.dead || rolaPostaci(c) != "robotnik" || (c.helm == true) == helmy) continue;
                c.helm = helmy ? true : (bool?)null;
                if (!helmy) c.hp = Math.Min(c.hp, maxHp(sim, c));
                else sim.efekt(c.x, c.y - 0.6, "mysl", "hełm");
            }
            if (helmy != (sim.lud.helmy == true))
            {
                sim.lud.helmy = helmy;
                if (helmy && robotnikow > 0) sim.log("Nie został ani jeden rycerz. Robotnicy zakładają hełmy i biorą kilofy do walki.", "krew");
                else if (!helmy && robotnikow > 0) sim.log("Rycerze znów są w ludzie — robotnicy zdejmują hełmy i wracają do kopania.", "swiat");
            }
        }

        /// <summary>Remake v2: do osiągnięć — najwięcej ludu i weteranów naraz.</summary>
        static void liczLud(Sim sim)
        {
            double lud = 0, weteranow = 0;
            foreach (var c in sim.creatures)
            {
                if (c.dead || rolaPostaci(c) == null) continue;
                lud++;
                if (weteranStaz(sim, c)) weteranow++;
            }
            if (lud > sim.stat.ludMax) sim.stat.ludMax = lud;
            if (weteranow > sim.stat.weteranowMax) sim.stat.weteranowMax = weteranow;
        }

        /// <summary>Etap 2: przesłużył już swoje w ludzie (staż weterana).</summary>
        public static bool weteranStaz(Sim sim, Creature c) => sim.tick - (c.od ?? 0) >= LUD.weteranPo;

        /// <summary>Etap 2: premia weterana działa — staż, najedzony, lud wierny.</summary>
        public static bool weteranAktywny(Sim sim, Creature c)
        {
            if (!weteranStaz(sim, c) || c.hunger >= LUD.weteranGlod) return false;
            var klan = sim.klan(c.clan);
            return klan != null && klan.devotion >= LUD.weteranWiara;
        }

        /// <summary>Wzmocnienia i osłabienia postaci: weteran, hełm, zatrucie, dłoń, okaleczenie, błogosławieństwo, zbroja, zabytki.</summary>
        public static List<StanPostaci> stanyPostaci(Sim sim, Creature c)
        {
            var @out = new List<StanPostaci>();
            var premia = $"+{JS.S(JS.Round((LUD.weteranPremia - 1) * 100))}% siły, szybkości, kopania i modlitwy";
            if (weteranAktywny(sim, c))
            {
                @out.Add(new StanPostaci { nazwa = "weteran", skutek = premia, dobry = true, kiedy = "póki najedzony, a lud wierny" });
            }
            else if (weteranStaz(sim, c) && rolaPostaci(c) != null)
            {
                var klan = sim.klan(c.clan);
                var czemu = c.hunger >= LUD.weteranGlod ? "głodny" : (klan != null && klan.devotion < LUD.weteranWiara) ? "lud stracił wiarę" : "nie wiadomo";
                @out.Add(new StanPostaci { nazwa = "weteran bez premii", skutek = $"{premia} wróci, gdy to minie", dobry = true, uspiony = true, kiedy = czemu });
            }
            if (c.helm == true && rolaPostaci(c) == "robotnik")
            {
                @out.Add(new StanPostaci { nazwa = "w hełmie — rycerzy brak", skutek = $"życie ×{JS.S(LUD.helm.hp)}, siła ×{JS.S(LUD.helm.sila)}; walczy ze Strażnikami Snu jak rycerz", dobry = true, kiedy = "póki w ludzie nie ma rycerzy" });
            }
            if (c.zatrutyDo != null && sim.tick < c.zatrutyDo)
            {
                @out.Add(new StanPostaci { nazwa = "zatruty", skutek = $"−{JS.S(JS.Round((1 - KARTY_LUDU.zatrucie) * 100))}% siły, szybkości i kopania (zatrute plony)", dobry = false, @do = c.zatrutyDo });
            }
            var d = sim.lud.dlon;
            if (d != null && (d.faza == "wstaje" || d.faza == "siega") && d.ofiary.Contains(c.id))
            {
                @out.Add(new StanPostaci { nazwa = "spod niego wznosi się dłoń z otchłani", skutek = "zaraz go zabierze w dół — odpędzi ją tylko Cud tuż przy nim", dobry = false, @do = d.od + (d.faza == "wstaje" ? DLON.wstaje + DLON.siega : DLON.siega) });
            }
            if (c.szalDo != null && sim.tick < c.szalDo)
            {
                @out.Add(new StanPostaci { nazwa = "szał krwi", skutek = $"siła ×{JS.S(OLTARZ.rytualy.szal.sila)} (rytuał przy ołtarzu)", dobry = true, @do = c.szalDo });
            }
            if (c.okaleczony == true)
            {
                @out.Add(new StanPostaci { nazwa = "okaleczony", skutek = $"−{JS.S(JS.Round((1 - LUD.okaleczenie) * 100))}% życia, siły i szybkości", dobry = false, kiedy = "póki nie wyśpi się w sypialni" });
            }
            // 6.11: błogosławieństwo z modlitwy pobożnego za innych
            if (c.blogDo != null && sim.tick < c.blogDo && rolaPostaci(c) != null)
            {
                var NAZWY = new Dictionary<string, string> { ["sila"] = "siły", ["szybkosc"] = "szybkości", ["kopanie"] = "kopania", ["modlitwa"] = "modlitwy" };
                var czesci = new List<string>();
                if (BLOGOSLAWIENSTWO.dary.TryGetValue(rolaPostaci(c)!, out var dar))
                    // (kolejność kluczy jak w literale TS — Object.entries; nastawy/loch.ts)
                    foreach (var k in KolejnoscDarow(rolaPostaci(c)!))
                    {
                        var m = dar[k];
                        if (m == null) continue;
                        czesci.Add($"+{JS.S(JS.Round((m.Value - 1) * 100))}% {(NAZWY.TryGetValue(k, out var n) ? n : k)}");
                    }
                czesci.Add($"głód o {JS.S(JS.Round((1 - BLOGOSLAWIENSTWO.glod) * 100))}% wolniej");
                var zKim = c.blogOd != null ? sim.creatureById(c.blogOd.Value) : null;
                var leczy = zKim != null && !zKim.dead && sim.tick - (c.blogT ?? -1e9) <= BLOGOSLAWIENSTWO.co * 2;
                @out.Add(new StanPostaci { nazwa = "błogosławiony", skutek = string.Join(", ", czesci) + (leczy ? "; w kręgu modlitwy rany się goją" : ""), dobry = true, @do = c.blogDo });
            }
            // etap 3f: zbroja z kuźni — tylko wiersz na karcie
            var zb = rolaPostaci(c) == "rycerz" ? opisZbroi(c) : null;
            if (!string.IsNullOrEmpty(zb)) @out.Add(new StanPostaci { nazwa = "zbroja z kuźni", skutek = zb!, dobry = true, kiedy = "póki ją nosi", bezAureoli = true });
            // etap 3e: zabytki
            if (rolaPostaci(c) != null) @out.AddRange(stanyZabytkow(sim, c));
            return @out;
        }

        /// <summary>Kolejność kluczy darów w literale BLOGOSLAWIENSTWO.dary (TS) — dla tekstu na karcie.</summary>
        static string[] KolejnoscDarow(string rola) => rola switch
        {
            "rycerz" => new[] { "sila", "szybkosc" },
            "robotnik" => new[] { "kopanie", "szybkosc" },
            "pobozny" => new[] { "modlitwa" },
            _ => KOLEJNOSC_DAROW,
        };

        /// <summary>Największe życie tej postaci (rasa × rola).</summary>
        public static double maxHp(Sim sim, Creature c) => RACES[c.race].maxHp * mnoznik(sim, c, "hp");

        /// <summary>Klan ludu — w Remake v1 jest jeden.</summary>
        public static Clan? klanLudu(Sim sim) =>
            sim.clans.FirstOrDefault(k => k.race == Race.GOBLIN && !k.dead) ?? sim.clans.FirstOrDefault(k => k.race == Race.GOBLIN);

        /// <summary>Ilu żyje w każdej roli.</summary>
        public static IleRol liczRole(Sim sim)
        {
            var n = new IleRol();
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                var r = rolaPostaci(c);
                if (r == "pobozny") n.pobozny++; else if (r == "robotnik") n.robotnik++; else if (r == "rycerz") n.rycerz++;
            }
            return n;
        }

        /// <summary>Ustawia postaci rolę i pełne życie według niej.</summary>
        public static void nadajRole(Sim sim, Creature c, string r)
        {
            c.rola = r;
            c.hp = maxHp(sim, c);
        }

        /// <summary>Wolne miejsce na podłodze przy (x, y) — tam staje nowa postać albo nowa siedziba.</summary>
        public static (double x, double y)? podloga(Sim sim, double x, double y, double promien = 6)
        {
            var w = sim.world;
            for (double r = 0; r <= promien; r++)
            {
                for (var dy = -r; dy <= r; dy++)
                {
                    for (var dx = -r; dx <= r; dx++)
                    {
                        if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != r) continue;
                        double xx = x + dx, yy = y + dy;
                        if (!w.inb(xx, yy + 1) || !w.passable(xx, yy) || w.passable(xx, yy + 1)) continue;
                        if (w.water[w.idx(xx, yy)] > 2 || w.magma[w.idx(xx, yy)] > 0) continue;
                        return (xx, yy);
                    }
                }
            }
            return null;
        }

        /// <summary>Środek największej grupy ludu (skupisko w promieniu 8 kafli) — bez pielgrzymów i warty pod rdzeniem.</summary>
        public static ObozLudu? najwiekszaGrupa(Sim sim, int klanId)
        {
            var lud = sim.creatures.Where(c => !c.dead && c.clan == klanId && c.job != Job.PIELGRZYM && c.job != Job.WARTA).ToList();
            ObozLudu? best = null;
            foreach (var c in lud)
            {
                var grupa = lud.Where(o => JS.Hypot(o.x - c.x, o.y - c.y) < 8).ToList();
                if (best == null || grupa.Count > best.ilu)
                {
                    double sx = 0, sy = 0;
                    foreach (var o in grupa) sx += o.x;
                    foreach (var o in grupa) sy += o.y;
                    best = new ObozLudu { x = sx / grupa.Count, y = sy / grupa.Count, ilu = grupa.Count };
                }
            }
            return best;
        }

        /// <summary>Siedziba idzie za ludem (Alpha: siedziba stoi w sali i się nie przenosi; liczy się tylko obozy).</summary>
        static void pilnujSiedziby(Sim sim)
        {
            var w = sim.world;
            var klan = klanLudu(sim);
            if (klan == null) return;
            bool wStrefie(double x, double y) => JS.Hypot(x - w.coreX, y - w.przedsionekY) < STRAZNICY.limitOdRdzenia + STRAZNICY.ucieczkaZapas;
            var lud = sim.creatures.Where(c => !c.dead && c.clan == klan.id && c.job != Job.PIELGRZYM && c.job != Job.WARTA && !wStrefie(c.x, c.y)).ToList();
            if (lud.Count == 0) return;
            var zostalo = budzetDrog();
            nowyTik(lud.Count + 2);
            bool blisko(double _i, double x, double y) => Math.Abs(x - klan.hx) <= 1 && Math.Abs(y - klan.hy) <= 1;
            var dojdzie = new HashSet<double>();
            foreach (var c in lud) if (szukajDrogi(sim, c, blisko, 6000) != null) dojdzie.Add(c.id);
            nowyTik(zostalo);
            var odcieci = lud.Where(c => !dojdzie.Contains(c.id)).ToList();
            // obozy: odcięte grupki (proste skupiska w promieniu 6 kafli)
            var obozy = new List<ObozLudu>();
            var wzieci = new HashSet<double>();
            foreach (var c in odcieci)
            {
                if (wzieci.Contains(c.id)) continue;
                var grupa = odcieci.Where(o => !wzieci.Contains(o.id) && JS.Hypot(o.x - c.x, o.y - c.y) < 6).ToList();
                foreach (var o in grupa) wzieci.Add(o.id);
                if (grupa.Count >= LUD.obozMin)
                {
                    double sx = 0, sy = 0;
                    foreach (var o in grupa) sx += o.x;
                    foreach (var o in grupa) sy += o.y;
                    obozy.Add(new ObozLudu { x = sx / grupa.Count, y = sy / grupa.Count, ilu = grupa.Count });
                }
            }
            sim.lud.obozy = obozy;
            // Alpha: siedziba stoi w sali pod szybem z jedzeniem i się nie przenosi
            if (LUD.siedzibaStala) return;
            var zalana = w.water[w.idx(klan.hx, klan.hy)] >= LUD.wodaUcieka;
            if (!zalana && ((double)odcieci.Count / lud.Count <= LUD.odcieciProg || sim.tick - sim.lud.siedzibaT < LUD.siedzibaPrzerwa)) return;
            var g = zalana ? najwiekszaGrupa(sim, klan.id) : null;
            ObozLudu? cel = zalana ? (g != null ? new ObozLudu { x = g.x, y = Math.Max(2, g.y - 2), ilu = g.ilu } : null)
                : JS.Sort(new List<ObozLudu>(obozy), (a, b) => b.ilu - a.ilu).FirstOrDefault();
            if (cel == null || (!zalana && cel.ilu <= dojdzie.Count)) return;
            var miejsce = miejsceNaObozu(sim, cel.x, cel.y, 20, 12);
            if (miejsce == null && !zalana) return;
            var gdzie = miejsce ?? podloga(sim, Math.Floor(cel.x), Math.Floor(cel.y), 10);
            if (gdzie == null || wStrefie(gdzie.Value.x, gdzie.Value.y)) return;
            var (gx, gy) = gdzie.Value;
            klan.hx = gx; klan.hy = gy;
            if (w.passable(gx, gy)) w.set(gx, gy, T.NEST);
            sim.lud.siedzibaT = sim.tick;
            sim.lud.obozy = sim.lud.obozy.Where(o => JS.Hypot(o.x - gx, o.y - gy) > 8).ToList();
            sim.efekt(gx + 0.5, gy + 0.5, "cud");
            sim.gdzie(gx + 0.5, gy + 0.5).log($"{klan.name} przenieśli siedzibę tam, gdzie jest ich najwięcej.", "swiat");
        }

        /// <summary>Przegrana: Alpha — gdy nie zostanie żaden pobożny, gra się kończy.</summary>
        static void sprawdzPrzegrana(Sim sim)
        {
            if (sim.ending != null) return;
            if (liczRole(sim).pobozny > 0) return;
            sim.ending = "upadek";
            sim.log("Nie został nikt, kto by się modlił. Wielki Pomnik już nie pęknie.", "koniec");
        }

        /// <summary>Miejsce na obóz albo siedzibę: płaska, szeroka półka, sucha i z dala od magmy.</summary>
        public static (double x, double y)? miejsceNaObozu(Sim sim, double gx, double gy, double rx = 16, double ry = 9, double? minSzerArg = null)
        {
            var minSzer = minSzerArg ?? LUD.obozSzerokosc;
            var w = sim.world;
            bool dobre(double x, double y)
            {
                if (!w.inb(x, y - LUD.obozWysokosc + 1) || !w.inb(x, y + 1) || w.passable(x, y + 1)) return false;
                for (var k = 0; k < LUD.obozWysokosc; k++) if (!w.passable(x, y - k)) return false;
                return w.water[w.idx(x, y)] < 3 && w.magma[w.idx(x, y)] == 0;
            }
            (double, double)? best = null; var bs = double.NegativeInfinity;
            for (var y = Math.Floor(gy) - ry; y <= Math.Floor(gy) + ry; y++)
            {
                for (var x = Math.Floor(gx) - rx; x <= Math.Floor(gx) + rx; x++)
                {
                    if (!dobre(x, y)) continue;
                    double l = 0, p = 0;
                    while (l < 8 && dobre(x - l - 1, y)) l++;
                    while (p < 8 && dobre(x + p + 1, y)) p++;
                    var szer = l + p + 1;
                    if (szer < minSzer || Math.Min(l, p) < Math.Floor(minSzer / 2)) continue;
                    if (sim.przyMagmie(x, y, 5) || JS.Hypot(x - w.coreX, y - w.coreY) < PIELGRZYMKA.przedsionekX + 2) continue;
                    var wynik = szer * 2 - JS.Hypot(x - gx, (y - gy) * 1.5) * 0.6;
                    if (wynik > bs) { bs = wynik; best = (x, y); }
                }
            }
            return best ?? (minSzer > 3 ? miejsceNaObozu(sim, gx, gy, rx, ry, 3) : null);
        }

        /// <summary>Obozy: gdzie stacjonuje dość pobożnych lub rycerzy daleko od każdego obozu, tam powstaje obóz; puste znikają.</summary>
        static void pilnujObozow(Sim sim, Clan klan)
        {
            var w = sim.world;
            var st = sim.creatures.Where(c => !c.dead && c.clan == klan.id && stacjonuje(c)).ToList();
            var wzieci = new HashSet<double>();
            foreach (var c in st)
            {
                if (wzieci.Contains(c.id)) continue;
                var grupa = st.Where(o => !wzieci.Contains(o.id) && JS.Hypot(o.x - c.x, o.y - c.y) < 8).ToList();
                foreach (var o in grupa) wzieci.Add(o.id);
                if (grupa.Count < LUD.obozMinStacjonujacych || sim.lud.spizarnie.Count >= LUD.obozyMaks) continue;
                double sx = 0, sy = 0;
                foreach (var o in grupa) sx += o.x;
                foreach (var o in grupa) sy += o.y;
                double gx = sx / grupa.Count, gy = sy / grupa.Count;
                var daleko = obozyLudu(sim).All(s => JS.Hypot(s.x - gx, s.y - gy) > LUD.obozOdleglosc);
                if (!daleko) continue;
                if (JS.Hypot(gx - w.coreX, gy - w.coreY) < LUD.strefaRdzenia)
                {
                    gx = w.coreX + (gx < w.coreX ? -1 : 1) * (PIELGRZYMKA.przedsionekX + LUD.wartaOdstep);
                    gy = w.przedsionekY;
                }
                if (sim.tick - (sim.lud.obozT ?? -1e9) < LUD.obozPrzerwa) continue;
                var m = miejsceNaObozu(sim, gx, gy, 20, 12);
                if (m == null) continue;
                var (mx, my) = m.Value;
                if (obozyLudu(sim).Any(s => JS.Hypot(s.x - mx, s.y - my) <= LUD.obozOdleglosc)) continue;
                sim.lud.spizarnie.Add(new Spizarnia { x = mx, y = my, ilosc = 0, od = sim.tick });
                sim.lud.obozT = sim.tick;
                sim.gdzie(mx + 0.5, my + 0.5).log($"{klan.name} rozbili obóz bliżej krypty.", "swiat", "oboz");
            }
            // pusty obóz bez nikogo w pobliżu znika
            var zywi = sim.creatures.Where(c => !c.dead && c.clan == klan.id).ToList();
            sim.lud.spizarnie = sim.lud.spizarnie.Where(s => sim.tick - (s.od ?? 0) < LUD.obozZycie || zywi.Any(c => JS.Hypot(c.x - s.x, c.y - s.y) < 15)).ToList();
        }

        /// <summary>Wołane z sim.step() co tik.</summary>
        public static void tikLudu(Sim sim)
        {
            if (sim.spokojnySwiat || sim.ending != null) return;
            // stary zapis: „stara spiżarnia” przepada (jedzenie jest już tylko w wiadrach)
            if (sim.lud.sklad != null) sim.lud.sklad = null;
            if (sim.lud.spizarnie == null) sim.lud.spizarnie = new List<Spizarnia>();
            if (sim.tick % 60 == 0) { pilnujHelmow(sim); liczLud(sim); }
            tikWiader(sim);
            tikTrupow(sim);
            tikStraznikow(sim);
            tikPomnika(sim);
            tikDloniDemona(sim);
            tikDloni(sim);
            tikAniola(sim);
            tikZabytkow(sim);
            if (sim.tick % LUD.siedzibaCo == 0)
            {
                pilnujSiedziby(sim);
                var klan = klanLudu(sim);
                if (klan != null) pilnujObozow(sim, klan);
            }
            if (sim.tick % LUD.przegranaCo == 0) sprawdzPrzegrana(sim);
        }
    }
}
