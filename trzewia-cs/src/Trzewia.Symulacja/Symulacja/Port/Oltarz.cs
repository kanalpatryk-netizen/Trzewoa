// Port: alpha-1/src/sim/oltarz.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyOltarz;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyGora;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Stworzenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Trwający rytuał przy ołtarzu (rodzaj: 'modlitwa' | 'szal' | 'wskrzeszenie' | 'ofiaraKrwi' | 'ofiaraZycia').</summary>
    public sealed class RytualOltarza
    {
        public string rodzaj = "modlitwa";
        /// <summary>pobożny, który odprawia</summary>
        public double kto;
        public double od;
        public double @do;
        /// <summary>zapłacona krew — wraca, gdy rytuał przerwany</summary>
        public double krew;
        /// <summary>wskrzeszenie: numer poległego (jego ciała); szał: numer rycerza</summary>
        public double? cel;
        /// <summary>modlitwa: ile wiary już spłynęło</summary>
        public double? wiaraDana;
        /// <summary>od kiedy odprawiający stoi z dala od ołtarza</summary>
        public double? poza;
    }

    public sealed class StanOltarza
    {
        public RytualOltarza? rytual;
        /// <summary>ile rytuałów odprawiono (kronika, atlas)</summary>
        public double? odprawionych;
    }

    /// <summary>Zdarzenie dla rysunku (nie idzie do zapisu): rytuał ruszył, skończył się albo go przerwano.</summary>
    public sealed class ZdarzenieOltarza
    {
        public string rodzaj = "";
        /// <summary>'start' | 'koniec' | 'przerwany'</summary>
        public string faza = "";
        public double kto;
        public double? cel;
        public double? cx, cy;
        public double tik;
    }

    /// <summary>
    /// OŁTARZ (Alpha, etap 3d) — rytuały przy kamiennym ołtarzu na środku sali (patrz oltarz.ts). Liczby: nastawy/oltarz.ts.
    /// </summary>
    public static class Oltarz
    {
        static Typ_OLTARZ O => OLTARZ;

        static (double krew, double tikow) rytualDef(string r) => r switch
        {
            "modlitwa" => (O.rytualy.modlitwa.krew, O.rytualy.modlitwa.tikow),
            "szal" => (O.rytualy.szal.krew, O.rytualy.szal.tikow),
            "wskrzeszenie" => (O.rytualy.wskrzeszenie.krew, O.rytualy.wskrzeszenie.tikow),
            "ofiaraKrwi" => (O.rytualy.ofiaraKrwi.krew, O.rytualy.ofiaraKrwi.tikow),
            _ => (O.rytualy.ofiaraZycia.krew, O.rytualy.ofiaraZycia.tikow),
        };

        /// <summary>Kafel ołtarza (stoi na nim; pod nim kamienny kopczyk).</summary>
        public static XY kafelOltarza(Sim sim) => sim.world.oltarz;

        /// <summary>Czy postać stoi przy ołtarzu.</summary>
        public static bool przyOltarzu(Sim sim, Creature c)
        {
            var o = sim.world.oltarz;
            return !c.dead && Math.Abs(c.x - (o.x + 0.5)) <= O.przyX && Math.Abs(Math.Floor(c.y) - o.y) <= O.przyY;
        }

        /// <summary>Pobożni przy ołtarzu (najbliżsi pierwsi).</summary>
        public static List<Creature> pobozniPrzyOltarzu(Sim sim)
        {
            var o = sim.world.oltarz;
            return JS.Sort(sim.creatures.Where(c => !c.dead && rolaPostaci(c) == "pobozny" && przyOltarzu(sim, c) && stoi(sim, Math.Floor(c.x), Math.Floor(c.y))).ToList(),
                (a, b) => Math.Abs(a.x - o.x - 0.5) - Math.Abs(b.x - o.x - 0.5));
        }

        /// <summary>Kto odprawi rytuał: pobożny przy ołtarzu (do ofiary krwi — nieokaleczony).</summary>
        static Creature? odprawiajacy(Sim sim, string rodzaj, double? wolany = null)
        {
            var lista = pobozniPrzyOltarzu(sim).Where(c => rodzaj != "ofiaraKrwi" || c.okaleczony != true).ToList();
            return lista.FirstOrDefault(c => c.id == wolany) ?? lista.FirstOrDefault();
        }

        /// <summary>Trwający rytuał (albo null).</summary>
        public static RytualOltarza? rytualOltarza(Sim sim) => sim.lud.oltarz?.rytual;

        /// <summary>Czy ta postać właśnie odprawia rytuał.</summary>
        public static RytualOltarza? odprawia(Sim sim, Creature c)
        {
            var r = rytualOltarza(sim);
            return r != null && r.kto == c.id ? r : null;
        }

        /// <summary>Polegli, których ciała jeszcze leżą — najświeżsi pierwsi.</summary>
        public static List<Trup> polegli(Sim sim) => JS.Sort(new List<Trup>(sim.lud.trupy ?? new List<Trup>()), (a, b) => b.od - a.od);

        /// <summary>Kogo rozpali szał krwi: rycerz, a gdy rycerza brak — robotnik w hełmie.</summary>
        static Creature? celSzalu(Sim sim)
        {
            var lud = sim.creatures.Where(c => !c.dead && walczacy(c)).ToList();
            return lud.FirstOrDefault(c => rolaPostaci(c) == "rycerz") ?? lud.FirstOrDefault();
        }

        /// <summary>Cena rytuału we krwi.</summary>
        public static double cenaRytualu(string rodzaj) => rytualDef(rodzaj).krew;

        /// <summary>Ile krwi da ofiara (0 — rytuał nic nie daje we krwi).</summary>
        public static double krewZOfiary(string rodzaj) => rodzaj == "ofiaraKrwi" ? LUD.okaleczenieKrew : rodzaj == "ofiaraZycia" ? LUD.ofiaraKrew : 0;

        /// <summary>Czy da się teraz odprawić rytuał — null albo powód, czemu nie.</summary>
        public static string? czemuNie(Sim sim, string rodzaj, double? cel = null)
        {
            if (sim.ending != null) return "gra skończona";
            if (rytualOltarza(sim) != null) return "trwa już inny rytuał";
            if (pobozniPrzyOltarzu(sim).Count == 0) return "przy ołtarzu nie stoi żaden pobożny";
            var cena = cenaRytualu(rodzaj);
            if (sim.krew - sim.rezerwa.krew < cena) return $"za mało krwi (trzeba {JS.S(cena)})";
            switch (rodzaj)
            {
                case "szal": if (celSzalu(sim) == null) return "nie ma rycerza, którego by rozpalił"; break;
                case "wskrzeszenie":
                    if (polegli(sim).Count == 0) return "nikt nie poległ — albo ciała już nie ma";
                    if (cel != null && !polegli(sim).Any(t => t.id == cel)) return "tego ciała już nie ma";
                    break;
                case "ofiaraKrwi": if (odprawiajacy(sim, rodzaj) == null) return "pobożny przy ołtarzu jest już okaleczony"; break;
                case "ofiaraZycia": if (liczRole(sim).pobozny <= 1) return "to ostatni pobożny — bez niego nikt nie odprawi rytuału"; break;
            }
            if ((rodzaj == "ofiaraKrwi" || rodzaj == "ofiaraZycia") && sim.krew >= GORA.krewMax) return "krwi masz pełno";
            return null;
        }

        static void zdarzenie(Sim sim, ZdarzenieOltarza z)
        {
            var l = sim.zdarzeniaOltarza;
            while (l.Count > 0 && (l.Count >= 16 || sim.tick - l[0].tik > 3600)) l.RemoveAt(0);
            l.Add(z);
        }

        /// <summary>Odprawia rytuał: płaci krew i stawia pobożnego przy ołtarzu. Powód odmowy albo null.</summary>
        public static string? odprawRytual(Sim sim, string rodzaj, double? cel = null, double? wolany = null)
        {
            var powod = czemuNie(sim, rodzaj, cel);
            if (powod != null) return powod;
            var c = odprawiajacy(sim, rodzaj, wolany)!;
            var R = rytualDef(rodzaj);
            double? celId = null, cx = null, cy = null;
            if (rodzaj == "wskrzeszenie")
            {
                var t = polegli(sim).FirstOrDefault(p => p.id == cel) ?? polegli(sim)[0];
                celId = t.id; cx = t.x; cy = t.y;
            }
            else if (rodzaj == "szal")
            {
                var r = celSzalu(sim)!;
                celId = r.id; cx = r.x; cy = r.y;
            }
            sim.krew -= R.krew;
            var st = sim.lud.oltarz ??= new StanOltarza();
            st.rytual = new RytualOltarza { rodzaj = rodzaj, kto = c.id, od = sim.tick, @do = sim.tick + R.tikow, krew = R.krew, cel = celId, wiaraDana = 0 };
            c.droga = null; c.jt = 0; c.zamiarDo = sim.tick;
            zdarzenie(sim, new ZdarzenieOltarza { rodzaj = rodzaj, faza = "start", kto = c.id, cel = celId, cx = cx, cy = cy, tik = sim.tick });
            zapisz(sim, "rytual", $"{kto(sim, c)}: rytuał przy ołtarzu — {NAZWA_RYTUALU[rodzaj]}", c.x, c.y);
            return null;
        }

        /// <summary>Przerywa trwający rytuał — krew wraca.</summary>
        static void przerwij(Sim sim, RytualOltarza r, string czemu)
        {
            sim.krew += r.krew;
            sim.lud.oltarz!.rytual = null;
            zdarzenie(sim, new ZdarzenieOltarza { rodzaj = r.rodzaj, faza = "przerwany", kto = r.kto, cel = r.cel, tik = sim.tick });
            var o = sim.world.oltarz;
            sim.gdzie(o.x + 0.5, o.y).log($"{NAZWA_RYTUALU[r.rodzaj]} przy ołtarzu przerwana — {czemu}. Krew wróciła.", "wiara");
        }

        /// <summary>Co tik: trwający rytuał — wiara z modlitwy, a na koniec jego skutek.</summary>
        public static void tikOltarza(Sim sim)
        {
            var r = rytualOltarza(sim);
            if (r == null) return;
            var c = sim.creatureById(r.kto);
            if (c == null || c.dead) { przerwij(sim, r, "odprawiający nie żyje"); return; }
            if (!przyOltarzu(sim, c))
            {
                r.poza ??= sim.tick;
                if (sim.tick - r.poza > O.odejscieTikow) { przerwij(sim, r, "odprawiający odszedł"); return; }
            }
            else r.poza = null;
            if (r.rodzaj == "wskrzeszenie" && !polegli(sim).Any(t => t.id == r.cel)) { przerwij(sim, r, "ciała już nie ma"); return; }
            if (r.rodzaj == "modlitwa")
            {
                var R = O.rytualy.modlitwa;
                var ma = R.wiara * Math.Min(1, (sim.tick - r.od) / R.tikow);
                var d = ma - (r.wiaraDana ?? 0);
                if (d >= 1 || (sim.tick >= r.@do && d > 0)) { sim.wiara += d; r.wiaraDana = ma; }
            }
            if (sim.tick < r.@do) return;
            zakoncz(sim, r, c);
        }

        /// <summary>Rytuał dobiegł końca — jego skutek.</summary>
        static void zakoncz(Sim sim, RytualOltarza r, Creature c)
        {
            var st = sim.lud.oltarz!;
            st.rytual = null;
            st.odprawionych = (st.odprawionych ?? 0) + 1;
            sim.stat.rytualow++;
            var o = sim.world.oltarz;
            var tu = sim.gdzie(o.x + 0.5, o.y);
            double? cx = null, cy = null;
            switch (r.rodzaj)
            {
                case "modlitwa":
                    tu.log($"Pobożny odmówił modlitwę przy ołtarzu: +{JS.S(O.rytualy.modlitwa.wiara)} wiary.", "wiara");
                    break;
                case "szal":
                {
                    var rycerz = sim.creatureById(r.cel ?? -1);
                    var cel = rycerz != null && !rycerz.dead ? rycerz : celSzalu(sim);
                    if (cel != null)
                    {
                        cel.szalDo = sim.tick + O.rytualy.szal.trwa;
                        cx = cel.x; cy = cel.y;
                        r.cel = cel.id;
                        tu.log($"Szał krwi: {(rolaPostaci(cel) == "rycerz" ? "rycerz" : "robotnik w hełmie")} przez minutę bije mocniej.", "krew");
                    }
                    else
                    {
                        sim.krew += r.krew;
                        tu.log("Szał krwi nie miał kogo rozpalić — krew wróciła.", "krew");
                    }
                    break;
                }
                case "wskrzeszenie":
                {
                    var nowy = wskrzes(sim, r.cel ?? -1);
                    if (nowy != null) { cx = nowy.x; cy = nowy.y; tu.log($"{NAZWA_ROLI[rolaPostaci(nowy)!]} wstał z martwych przy ołtarzu.", "wiara"); }
                    else { sim.krew += r.krew; tu.log("Wskrzeszenie się nie udało — krew wróciła.", "wiara"); }
                    break;
                }
                case "ofiaraKrwi":
                    c.okaleczony = true;
                    c.hp = Math.Min(c.hp, maxHp(sim, c));
                    sim.krew += LUD.okaleczenieKrew;
                    sim.efekt(c.x, c.y, "mysl", $"+{JS.S(LUD.okaleczenieKrew)} krwi");
                    tu.log($"Pobożny upuścił krwi do misy: +{JS.S(LUD.okaleczenieKrew)} krwi. Słabnie, póki nie wyśpi się w sypialni.", "krew");
                    break;
                case "ofiaraZycia":
                    sim.krew += LUD.ofiaraKrew;
                    sim.efekt(c.x, c.y, "mysl", $"+{JS.S(LUD.ofiaraKrew)} krwi");
                    tu.log($"Pobożny oddał życie na ołtarzu: +{JS.S(LUD.ofiaraKrew)} krwi.", "krew");
                    sim.kill(c, "w ofierze na ołtarzu", "ofiara");
                    break;
            }
            zdarzenie(sim, new ZdarzenieOltarza { rodzaj = r.rodzaj, faza = "koniec", kto = r.kto, cel = r.cel, cx = cx, cy = cy, tik = sim.tick });
        }

        /// <summary>Poległy wstaje przy ołtarzu: ten sam numer (ta sama twarz), ta sama rola; ciało znika z ziemi.</summary>
        static Creature? wskrzes(Sim sim, double id)
        {
            var trupy = sim.lud.trupy ?? new List<Trup>();
            var t = trupy.FirstOrDefault(p => p.id == id);
            var klan = klanLudu(sim);
            if (t == null || klan == null || sim.creatureById(id) != null) return null;
            var o = sim.world.oltarz;
            var x = o.x + 1;
            foreach (var dx in new double[] { 1, -1, 2, -2 }) if (stoi(sim, o.x + dx, o.y)) { x = o.x + dx; break; }
            var c = makeCreature(Race.GOBLIN, klan.id, x + 0.5, o.y, t.id);
            sim.creatures.Add(c);
            sim.byId.set(c.id, c);
            klan.pop++;
            klan.dead = false;
            nadajRole(sim, c, t.rola);
            c.helm = t.helm;
            c.face = x < o.x ? 1 : -1;
            c.hunger = 0.2;
            c.devotion = Math.Max(c.devotion, 0.8);
            c.od = sim.tick;          // staż weterana liczy się od nowa
            sim.lud.trupy = trupy.Where(p => p != t).ToList();
            sim.stat.wskrzeszen++;
            zapisz(sim, "narodziny", $"{kto(sim, c)} wstaje z martwych przy ołtarzu", c.x, c.y);
            return c;
        }
    }
}
