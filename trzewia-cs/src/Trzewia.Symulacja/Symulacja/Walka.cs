// Port: alpha-1/src/sim/walka.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyWalka;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawyBoss;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.DlonDemona;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Cios przyjmowany przez rycerza.</summary>
    public sealed class OpcjeCiosu
    {
        /// <summary>skąd przyszedł (−1/1 — po której stronie rycerza stoi bijący)</summary>
        public double kier;
        /// <summary>cios powala (gdy się nie obroni); odrzut (kafle); przygniata (tiki)</summary>
        public bool? powala;
        public double? odrzut, przygniata;
        /// <summary>tego nie da się zablokować ani sparować (ogień)</summary>
        public bool? ogien;
    }

    /// <summary>
    /// RUCHY WALKI (Alpha 1, 6.11) — rycerz i demon walczą ruchami, nie pojedynczymi ciosami co ileś tików (patrz walka.ts).
    /// </summary>
    public static class Walka
    {
        static Typ_RUCHY_RYCERZA RR => RUCHY_RYCERZA;
        static Typ_OBRONA_RYCERZA OB => OBRONA_RYCERZA;
        static Typ_RUCHY_BOSSA RB => RUCHY_BOSSA;
        static Typ_WALKA_BOSSA WB => WALKA_BOSSA;

        static string? losujWage(Sim sim, List<(string id, double w)> lista)
        {
            double suma = 0;
            foreach (var (_, w) in lista) suma += w;
            if (suma <= 0) return null;
            var r = sim.rng.next() * suma;
            foreach (var (id, w) in lista) { r -= w; if (r <= 0) return id; }
            return lista[lista.Count - 1].id;
        }

        /// <summary>Przesuwa postać ludu w poziomie (doskok, odrzut) — nie w skałę i nie nad przepaść.</summary>
        static void przesun(Sim sim, Creature c, double dx)
        {
            var w = sim.world;
            var kroki = Math.Max(1, Math.Ceiling(Math.Abs(dx) / 0.25));
            for (var i = 0; i < kroki; i++)
            {
                var nx = c.x + dx / kroki;
                double x = Math.Floor(nx), y = Math.Floor(c.y);
                if (nx < 1 || nx > w.w - 2 || !w.passable(x, y) || w.passable(x, y + 1) && !JS.Tak(w.schody[w.idx(x, y + 1)]) && !w.solid(x, y + 1)) return;
                c.x = nx;
            }
        }

        // ======================================================================== rycerz

        static bool czyRycerz(Creature c) => rolaPostaci(c) == "rycerz";

        /// <summary>Czy rycerz spełnia wymagania ruchu (weteran, części zbroi).</summary>
        public static bool spelniaWymagania(Sim sim, Creature c, RuchRycerza def)
        {
            if (def.weteran == true && !weteranAktywny(sim, c)) return false;
            if (def.zbroja != null && !def.zbroja.All(z => nosi(c, z))) return false;
            return true;
        }

        /// <summary>Ataki, które rycerz ma teraz w zanadrzu (karta postaci, atlas).</summary>
        public static List<string> atakiRycerza(Sim sim, Creature c) =>
            Typ_RUCHY_RYCERZA.klucze.Where(id => RR[id].rodzaj == "atak" && (RR[id].waga ?? 0) > 0 && spelniaWymagania(sim, c, RR[id])).ToList();

        /// <summary>Zasięg zwykłego ciosu rycerza na tego wroga.</summary>
        static double zasiegRycerza(Creature s) => STRAZNICY.rycerzZasieg + (s.boss != null ? 0.8 : 0);

        static string? wybierzAtak(Sim sim, Creature c, Creature s, double d)
        {
            var zasieg = zasiegRycerza(s);
            var zycieWroga = s.hp / Math.Max(1, s.hpMax ?? s.hp);
            var lista = new List<(string, double)>();
            foreach (var id in atakiRycerza(sim, c))
            {
                var def = RR[id];
                if (def.wrogPonizej != null && zycieWroga >= def.wrogPonizej) continue;
                var blisko = d <= zasieg + (def.zasieg ?? 0);
                var zDaleka = JS.Tak(def.zDaleka) && d <= zasieg + def.zDaleka!.Value && Math.Abs(s.y - c.y) < 1.2;
                if (!blisko && !zDaleka) continue;
                var waga = def.waga ?? 1;
                if (c.kombo == id) waga *= OB.komboWaga;
                if (!blisko && zDaleka) waga *= 3;
                lista.Add((id, waga));
            }
            return losujWage(sim, lista);
        }

        static RuchTrwa zacznijRuch(Sim sim, Creature c, string id, double dl, Creature? cel, Action<RuchTrwa>? extra = null)
        {
            var r = new RuchTrwa { id = id, od = sim.tick, dl = dl, cel = cel?.id ?? -1, traf = 0, zadane = new List<double>(), x0 = c.x, y0 = c.y };
            extra?.Invoke(r);
            c.ruch = r;
            return r;
        }

        /// <summary>Siła jednego ciosu rycerza (bez mnożnika ruchu).</summary>
        static double silaRycerza(Sim sim, Creature c) => RACES[c.race].strength * mnoznik(sim, c, "sila") * OB.mnoznik * (0.85 + sim.rng.next() * 0.3);

        /// <summary>Cios rycerza w Strażnika (albo demona). Zwraca zadaną ranę (ujemną — zablokował ją demon).</summary>
        static double zadajCios(Sim sim, Creature c, Creature s, double mn, RuchRycerza def)
        {
            var rana = silaRycerza(sim, c) * mn;
            var blok = s.boss != null && s.ruch?.id == "blok" && def.nieDoZablokowania != true;
            if (blok)
            {
                rana *= WB.blok.rany;
                for (var k = 0; k < 3; k++) sim.spark(s.x + sim.rng.range(-0.5, 0.5), s.y - 2.5 + sim.rng.range(-0.6, 0.6), "hit");
            }
            var hp0 = s.hp;
            ranStraznika(sim, s, c, rana, def.chwieje == true);
            var zadane = Math.Max(0, hp0 - s.hp);
            if (!s.dead && zadane > 0)
            {
                if (JS.Tak(def.ogluszenie)) s.ogluszonyAtakDo = Math.Max(s.ogluszonyAtakDo ?? 0, sim.tick + def.ogluszenie!.Value);
                if (JS.Tak(def.odrzut) && s.boss == null)
                {
                    var sg = JS.Sign(s.x - c.x);
                    var kier = JS.Tak(sg) ? sg : c.face;
                    s.x = Math.Max(1, Math.Min(sim.world.w - 2, s.x + kier * def.odrzut!.Value));
                }
            }
            return blok ? -zadane : zadane;
        }

        /// <summary>Rycerz walczy ze Strażnikiem albo demonem: podchodzi, a w zasięgu — zaczyna ruch.</summary>
        public static void walkaRycerza(Sim sim, Creature c, Creature s, Action<double, double> podejdz)
        {
            var d = JS.Hypot(s.x - c.x, s.y - c.y);
            var zasieg = zasiegRycerza(s);
            var gotow = sim.tick - (c.ciosT ?? -1e9) >= OB.przerwa;
            double zDaleka = 0;
            if (gotow && d > zasieg) foreach (var id0 in atakiRycerza(sim, c)) zDaleka = Math.Max(zDaleka, RR[id0].zDaleka ?? 0);
            if (d > zasieg && !(zDaleka > 0 && d <= zasieg + zDaleka && Math.Abs(s.y - c.y) < 1.2)) { podejdz(Math.Floor(s.x), Math.Floor(s.y)); return; }
            c.face = s.x > c.x ? 1 : -1;
            if (!gotow) return;
            var id = wybierzAtak(sim, c, s, d);
            if (id == null) { podejdz(Math.Floor(s.x), Math.Floor(s.y)); return; }
            zacznijRuch(sim, c, id, RR[id].dl, s);
            c.kombo = OB.kombo[id];
            if (s.boss != null) bossWidziZamach(sim, s, c, RR[id]);
        }

        /// <summary>Krok rycerza w trakcie ruchu: doskok, trafienia o czasie. True, póki ruch trwa.</summary>
        public static bool krokRuchuRycerza(Sim sim, Creature c)
        {
            var R = c.ruch;
            if (R == null) return false;
            var def = RR[R.id];
            var t = sim.tick - R.od;
            if (def == null || !czyRycerz(c) || c.wDloni == true || c.lot != null) { c.ruch = null; return false; }
            if (t >= R.dl)
            {
                c.ruch = null;
                if (def.rodzaj == "atak") c.ciosT = sim.tick;
                return false;
            }
            c.vy = 0; c.droga = null;
            if (def.rodzaj != "atak") return true;
            var s = sim.creatureById(R.cel);
            var zyje = s != null && !s.dead;
            if (def.doskok != null && zyje)
            {
                double kafle = def.doskok[0], t0 = def.doskok[1], t1 = def.doskok[2];
                if (t >= t0 && t < t1)
                {
                    var odl = Math.Abs(s!.x - c.x); var sg = JS.Sign(s.x - c.x); var kier = JS.Tak(sg) ? sg : c.face;
                    var stop = s.boss != null ? zasiegRycerza(s) - 0.5 : 0.85;
                    if (odl > stop) przesun(sim, c, kier * Math.Min(kafle / (t1 - t0), odl - stop));
                }
            }
            while (def.traf != null && R.traf < def.traf.Length && t >= def.traf[(int)R.traf][0])
            {
                var mn = def.traf[(int)R.traf][1];
                R.traf++;
                double zad = 0;
                if (zyje && !s!.dead && JS.Hypot(s.x - c.x, s.y - c.y) <= zasiegRycerza(s) + (def.zasieg ?? 0) + 0.6) zad = zadajCios(sim, c, s, mn, def);
                R.zadane.Add(zad);
            }
            return true;
        }

        /// <summary>Rycerz przyjmuje cios: obrona albo reakcja. Zwraca ranę, która naprawdę zostaje.</summary>
        public static double przyjmijCios(Sim sim, Creature c, double rana, OpcjeCiosu o)
        {
            if (!czyRycerz(c) || rana <= 0) return rana;
            var R = c.ruch; var def = R != null ? RR[R.id] : null;
            var wet = weteranAktywny(sim, c);
            var lezy = R?.id == "powalony" && sim.tick - R.od < R.dl;
            var ostatnieTraf = def?.traf != null && def.traf.Length > 0 ? def.traf[def.traf.Length - 1][0] : 0;
            var wAtaku = def != null && def.rodzaj == "atak" && R != null && sim.tick - R.od < ostatnieTraf;
            var zajety = lezy || wAtaku || (R != null && R.id != "garda" && sim.tick - R.od < R.dl && def?.rodzaj != "atak");
            if (!zajety && !JS.Tak(o.przygniata) && o.ogien != true)
            {
                if (nosi(c, "tarcza") && sim.rng.chance(OB.blok.szansa + (wet ? OB.blok.weteran : 0)))
                {
                    zacznijRuch(sim, c, "blokTarcza", RR.blokTarcza.dl, null, r => { r.kier = o.kier; r.sila = rana / maxHp(sim, c); });
                    for (var k = 0; k < 3; k++) sim.spark(c.x + o.kier * 0.3, c.y - 0.8 + sim.rng.range(-0.3, 0.3), "hit");
                    return rana * OB.blok.rany;
                }
                if (wet && sim.rng.chance(OB.parowanie.szansa))
                {
                    zacznijRuch(sim, c, "parowanie", RR.parowanie.dl, null, r => { r.kier = o.kier; });
                    c.ciosT = sim.tick + RR.parowanie.dl - OB.przerwa;   // kontra zaraz po parowaniu
                    c.kombo = OB.kombo.parowanie;
                    for (var k = 0; k < 4; k++) sim.spark(c.x + o.kier * 0.45, c.y - 1.0 + sim.rng.range(-0.3, 0.3), "glint");
                    return 0;
                }
                if (nosi(c, "nakolanniki") && sim.rng.chance(OB.unik.szansa))
                {
                    zacznijRuch(sim, c, "unik", RR.unik.dl, null, r => { r.kier = o.kier; });
                    przesun(sim, c, -o.kier * OB.unik.krok);
                    sim.spark(c.x, c.y, "dust");
                    return 0;
                }
            }
            var rr = rana;
            var frac = rr / maxHp(sim, c);
            if (!lezy && !JS.Tak(o.przygniata) && o.powala != true && nosi(c, "napiersnik") && (!wAtaku || frac >= OB.mocneOd) && sim.rng.chance(OB.kontra.szansa))
            {
                rr *= OB.kontra.rany;
                var bijacy = najblizszyWrog(sim, c);
                var silaK = rr / maxHp(sim, c);
                zacznijRuch(sim, c, "kontraNapiersnika", RR.kontraNapiersnika.dl, bijacy, r => { r.kier = o.kier; r.sila = silaK; });
                if (bijacy?.boss != null) bossWidziZamach(sim, bijacy, c, RR.kontraNapiersnika);
                return rr;
            }
            var fr = rr / maxHp(sim, c);
            if (JS.Tak(o.przygniata))
            {
                zacznijRuch(sim, c, "powalony", o.przygniata!.Value + 64, null, r => { r.kier = o.kier; r.sila = fr; r.wariant = 1; });
                c.ogluszonyDo = sim.tick + o.przygniata.Value;
            }
            else if (lezy)
            {
                // leżący dostaje dalej — bez nowej reakcji
            }
            else if (fr >= OB.powalenieOd || (o.powala == true && fr >= OB.powalajacyOd))
            {
                zacznijRuch(sim, c, "powalony", RR.powalony.dl, null, r => { r.kier = o.kier; r.sila = fr; });
                c.ogluszonyDo = sim.tick + OB.lezy;
                przesun(sim, c, -o.kier * (o.odrzut ?? OB.odrzutPowalenia));
            }
            else if (fr >= OB.mocneOd)
            {
                zacznijRuch(sim, c, "trafionyMocno", RR.trafionyMocno.dl, null, r => { r.kier = o.kier; r.sila = fr; });
                c.przystanDo = sim.tick + OB.zatacza;
                przesun(sim, c, -o.kier * Math.Max(OB.odrzutMocny, (o.odrzut ?? 0) * 0.5));
            }
            else
            {
                c.drgniecie = new Drgniecie { t = sim.tick, sila = fr, kier = o.kier };
                if (JS.Tak(o.odrzut)) przesun(sim, c, -o.kier * o.odrzut!.Value * 0.4);
            }
            return rr;
        }

        static Creature? najblizszyWrog(Sim sim, Creature c)
        {
            Creature? best = null; double bd = 4;
            foreach (var o in sim.creatures)
            {
                if (o.dead || o.straznik != true) continue;
                var d = JS.Hypot(o.x - c.x, o.y - c.y);
                if (d < bd) { bd = d; best = o; }
            }
            return best;
        }

        // ======================================================================== demon

        static double zycieBossa(Creature c) => c.hp / Math.Max(1, c.hpMax ?? DEMON.hp);

        static RuchTrwa zacznijRuchBossa(Sim sim, Creature c, string id, Creature? cel, double? dl = null, Action<RuchTrwa>? extra = null)
        {
            if (cel != null) c.face = cel.x > c.x ? 1 : -1;
            return zacznijRuch(sim, c, id, dl ?? RB[id].dl, cel, extra);
        }

        /// <summary>Rycerz bierze zamach — demon (wolny) czasem zasłania się przedramieniem aż do trafienia.</summary>
        public static void bossWidziZamach(Sim sim, Creature b, Creature r, RuchRycerza def)
        {
            if (b.dead || def.nieDoZablokowania == true || def.traf == null || def.traf.Length == 0) return;
            if (b.ruch != null && sim.tick - b.ruch.od < b.ruch.dl) return;
            if (!sim.rng.chance(zycieBossa(b) < 0.3 ? WB.blok.ranny : WB.blok.szansa)) return;
            zacznijRuchBossa(sim, b, "blok", r, def.traf[0][0] + 24);
        }

        /// <summary>Demon przyjął ranę: przy połowie i ćwierci życia pada na kolano, po ciężkim ciosie się chwieje.</summary>
        public static void bossPrzyjmuje(Sim sim, Creature b, double hp0, double rana, bool chwieje)
        {
            if (b.dead || b.boss != "demon") return;
            var max = Math.Max(1, b.hpMax ?? DEMON.hp);
            var R = b.ruch;
            foreach (var prog in WB.kleka)
            {
                if (hp0 / max >= prog && b.hp / max < prog)
                {
                    b.chwiejT = sim.tick;
                    zacznijRuchBossa(sim, b, "zachwianie", null, WB.dlKleku, r => { r.wariant = 2; });
                    return;
                }
            }
            if (!(rana / max >= WB.chwiejeOd || (chwieje && rana / max >= WB.chwiejeCiosOd))) return;
            if (R != null && R.id == "zachwianie" && sim.tick - R.od < R.dl) return;
            if (sim.tick - (b.chwiejT ?? -1e9) < WB.odporny) return;
            var def = R != null ? RB[R.id] : null;
            var przedCiosem = R == null || sim.tick - R.od >= R.dl || R.id == "blok" || R.id == "ryk" || (def?.traf != null && R.traf == 0 && def.rodzaj != "zdolnosc");
            if (przedCiosem) { b.chwiejT = sim.tick; zacznijRuchBossa(sim, b, "zachwianie", null, RB.zachwianie.dl, r => { r.wariant = 1; }); }
        }

        /// <summary>Cios demona w kogoś z ludu (zwarcie, obszar, ogień).</summary>
        static void ciosBossa(Sim sim, Creature b, Creature cel, double mn, RuchBossa def, double? powalaO = null, bool ogien = false)
        {
            if (cel.dead) return;
            if (sim.lud.straznicy != null) sim.lud.straznicy.cios = sim.tick;
            var sg = JS.Sign(cel.x - b.x);
            var kier = JS.Tak(sg) ? sg : b.face;
            var rana = DEMON.sila * mn * (0.85 + sim.rng.next() * 0.3) * ranyZbroi(cel);
            var powala = sim.rng.chance(powalaO ?? def.powala ?? 0);
            rana = przyjmijCios(sim, cel, rana, new OpcjeCiosu { kier = -kier, powala = powala, odrzut = def.odrzut, przygniata = def.przygniata, ogien = ogien ? true : (bool?)null });
            if (!czyRycerz(cel) && JS.Tak(def.odrzut) && rana > 0) przesun(sim, cel, kier * def.odrzut!.Value * 0.6);
            if (rana <= 0) return;
            cel.hp -= rana;
            oznaczCios(sim, cel, true);
            if (ogien) cel.pali = sim.tick + 70;
            sim.spark(cel.x, cel.y - 0.5, "hit");
            if (JS.Tak(def.ogluszenie)) cel.przystanDo = Math.Max(cel.przystanDo ?? 0, sim.tick + def.ogluszenie!.Value);
            if (cel.hp <= 0)
            {
                sim.kill(cel, $"zmiażdżony przez: {DEMON.nazwa}", "straznik");
                b.rykPo = true;
                return;
            }
            if (!walczacy(cel)) ranStraznika(sim, b, cel, RACES[cel.race].strength * mnoznik(sim, cel, "sila") * STRAZNICY.oddajeCios);
        }

        /// <summary>Lud w promieniu wokół demona.</summary>
        static List<Creature> wokol(Sim sim, Creature b, double r, double dy = 3) =>
            sim.creatures.Where(o => !o.dead && rolaPostaci(o) != null && Math.Abs(o.x - b.x) <= r && Math.Abs(o.y - b.y) <= dy && JS.Hypot(o.x - b.x, (o.y - b.y) * 0.8) <= r).ToList();

        static void trafienieBossa(Sim sim, Creature b, RuchTrwa R, RuchBossa def, double mn, Action<Sim, Creature> zasyp)
        {
            var cel = sim.creatureById(R.cel);
            if (R.id == "uderzenieWZiemie")
            {
                zasyp(sim, b);
                foreach (var o in wokol(sim, b, def.promien ?? 3)) o.przystanDo = Math.Max(o.przystanDo ?? 0, sim.tick + (def.ogluszenie ?? 30));
                return;
            }
            if (JS.Tak(def.promien))
            {
                foreach (var o in wokol(sim, b, def.promien!.Value))
                {
                    var d = JS.Hypot(o.x - b.x, o.y - b.y);
                    ciosBossa(sim, b, o, mn * (1 - 0.45 * Math.Min(1, d / def.promien.Value)), def, JS.Tak(def.powalaDo) && d <= def.powalaDo!.Value ? 0.7 : 0);
                }
                R.zadane.Add(1);
                return;
            }
            if (def.luk == true)
            {
                foreach (var o in wokol(sim, b, def.zasieg ?? 2.7, 2.2))
                {
                    var przed = JS.Sign(o.x - b.x) == b.face || Math.Abs(o.x - b.x) < 0.8;
                    if (przed) ciosBossa(sim, b, o, mn, def);
                }
                R.zadane.Add(1);
                return;
            }
            if (cel != null && !cel.dead && JS.Hypot(cel.x - b.x, cel.y - b.y) <= (def.zasieg ?? DEMON.zasieg) + 0.6)
            {
                ciosBossa(sim, b, cel, mn, def);
                R.zadane.Add(1);
            }
            else R.zadane.Add(0);
        }

        static void krokRuchuBossa(Sim sim, Creature b, RuchTrwa R, double t, Action<Sim, Creature> zasyp)
        {
            var def = RB[R.id];
            if (def == null) { b.ruch = null; return; }
            var cel = sim.creatureById(R.cel);
            if (def.przemieszcza != null)
            {
                double t0 = def.przemieszcza[0], t1 = def.przemieszcza[1], maks = def.przemieszcza[2];
                if (t >= t0 && t < t1)
                {
                    if (R.id == "szarza" && R.traf == 0 && cel != null && !cel.dead)
                    {
                        var sg = JS.Sign(cel.x - b.x);
                        var kier = JS.Tak(sg) ? sg : b.face;
                        b.x = Math.Max(1, Math.Min(sim.world.w - 2, b.x + kier * (maks / (t1 - t0))));
                        b.y += Math.Max(-0.05, Math.Min(0.05, cel.y - b.y));
                        if (JS.Hypot(cel.x - b.x, cel.y - b.y) <= 1.9) { R.traf = 1; ciosBossa(sim, b, cel, def.traf![0][1], def); R.zadane.Add(1); }
                    }
                }
            }
            while (def.traf != null && R.traf < def.traf.Length && def.traf[(int)R.traf][0] > 0 && t >= def.traf[(int)R.traf][0])
            {
                var mn = def.traf[(int)R.traf][1];
                R.traf++;
                trafienieBossa(sim, b, R, def, mn, zasyp);
            }
            if (def.oddech != null)
            {
                double a = def.oddech[0], z = def.oddech[1], co = def.oddech[2];
                if (t >= a && t < z && (t - a) % co == 0)
                {
                    // stożek ognia przed sobą: tym szerszy, im dalej
                    foreach (var o in wokol(sim, b, def.zasieg ?? 5, 3))
                    {
                        double dx = (o.x - b.x) * b.face, dy = Math.Abs(o.y - (b.y - 0.3));
                        if (dx > 0.2 && dx <= (def.zasieg ?? 5) && dy <= 1.2 + dx * 0.3) ciosBossa(sim, b, o, def.podmuch ?? 0.1, def, null, true);
                    }
                }
            }
        }

        /// <summary>Rozkaz dla dłoni z otchłani — który ruch demona do której akcji.</summary>
        static string? ROZKAZ(string? akcja) => akcja switch { "rzut" => "rozkazRzut", "tarcza" => "rozkazTarcza", "zawal" => "rozkazZawal", _ => null };

        static double wstajeDloni(string akcja) => akcja switch
        {
            "rzut" => DLON.demon.rzut.wstaje,
            "tarcza" => DLON.demon.tarcza.wstaje,
            "zawal" => DLON.demon.zawal.wstaje,
            _ => 60,
        };

        static string? wybierzAtakBossa(Sim sim, Creature b, Creature cel, double d)
        {
            var zycie = zycieBossa(b);
            var tlum = wokol(sim, b, 3.2).Count;
            var lista = new List<(string, double)>();
            foreach (var id in Typ_RUCHY_BOSSA.klucze)
            {
                var def = RB[id];
                if (def.rodzaj != "atak" && def.rodzaj != "obszar" && def.rodzaj != "dystans") continue;
                if (def.zycieDo != null && zycie >= def.zycieDo) continue;
                if (def.od != null && d < def.od) continue;
                var zasieg = def.zasieg ?? def.promien ?? DEMON.zasieg;
                if (d > zasieg) continue;
                if (Math.Abs(cel.y - b.y) > 2.5 && id != "biczLancucha") continue;
                var w = def.waga ?? 1;
                if (id == "odepchniecie" && d > 1.4) continue;
                if (id == "przygniecenie" && (!czyRycerz(cel) || (cel.ogluszonyDo ?? -1) > sim.tick)) continue;
                if ((id == "tupniecie" || id == "wybuchAureoli" || id == "zamach") && tlum >= 2) w *= 2;
                if (zycie < 0.25 && def.rodzaj != "atak") w *= 1.6;
                if (b.ruchPoprz == id) w *= 0.35;
                lista.Add((id, w));
            }
            return losujWage(sim, lista);
        }

        /// <summary>Krok demona z pomnika: zrastanie bez modlitwy, ruch w toku, rozkaz dla dłoni, uderzenie w ziemię, cel i atak.</summary>
        public static void tikDemona(Sim sim, Creature c, Action<Sim, Creature> zasyp)
        {
            var hpMax = c.hpMax ?? DEMON.hp;
            if (sim.rytual.wierni < SNIACY_KAMIEN.modlitwaWiernych) c.hp = Math.Min(hpMax, c.hp + SNIACY_KAMIEN.zrastanie);
            var R = c.ruch;
            if (R != null)
            {
                var t = sim.tick - R.od;
                if (t < R.dl) { krokRuchuBossa(sim, c, R, t, zasyp); return; }
                c.ruch = null;
                c.ruchPoprz = R.id;
                if (R.id != "blok") c.ciosT = sim.tick;
                // po klęknięciu i po zabiciu kogoś — ryk
                if ((R.id == "zachwianie" && R.wariant == 2) || c.rykPo == true)
                {
                    c.rykPo = false; c.rykT = sim.tick;
                    zacznijRuchBossa(sim, c, "ryk", null);
                    return;
                }
            }
            // dłoń z otchłani wstaje — demon wydaje jej rozkaz gestem
            var st = sim.lud.dlonDemona;
            if (!string.IsNullOrEmpty(st?.akcja) && st!.faza == "wstaje" && c.rozkazOd != st.od && ROZKAZ(st.akcja) != null)
            {
                c.rozkazOd = st.od;
                zacznijRuchBossa(sim, c, ROZKAZ(st.akcja)!, null, wstajeDloni(st.akcja!) + 50);
                return;
            }
            if (demonCzeka(sim)) return;
            if (sim.tick - (c.zasypT ?? 0) >= SNIACY_KAMIEN.zasypCo)
            {
                c.zasypT = sim.tick;
                zacznijRuchBossa(sim, c, "uderzenieWZiemie", null);
                return;
            }
            var cel = sim.creatureById(sim.target.getOr(c.id, -1));
            if (cel == null || cel.dead || sim.tick % 90 == 0)
            {
                cel = celStraznika(sim, c, STRAZNICY.limitOdRdzenia);
                if (cel != null) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
            }
            var w = sim.world;
            if (cel == null)
            {
                if (sim.tick - (c.rykT ?? 0) > WB.rykCisza && sim.tick - (c.ciosT ?? -1e9) > WB.przerwa) { c.rykT = sim.tick; zacznijRuchBossa(sim, c, "ryk", null); return; }
                ruchStraznika(sim, c, w.coreX + 0.5, w.przedsionekY - 2, DEMON.szybkosc, STRAZNICY.limitOdRdzenia);
                return;
            }
            if (cel.wDloni == true || cel.lot != null) { c.face = cel.x > c.x ? 1 : -1; return; }
            var d = JS.Hypot(cel.x - c.x, cel.y - c.y);
            var gotow = sim.tick - (c.ciosT ?? -1e9) >= WB.przerwa && (c.ogluszonyAtakDo ?? -1) <= sim.tick;
            if (gotow)
            {
                var id = wybierzAtakBossa(sim, c, cel, d);
                if (id != null)
                {
                    zacznijRuchBossa(sim, c, id, cel);
                    return;
                }
            }
            if (d > DEMON.zasieg) ruchStraznika(sim, c, cel.x, cel.y - 0.5, DEMON.szybkosc, STRAZNICY.limitOdRdzenia);
            else c.face = cel.x > c.x ? 1 : -1;
        }

        /// <summary>Nazwa ruchu (dziennik, karta).</summary>
        public static string nazwaRuchu(string id) => RR[id]?.nazwa ?? RB[id]?.nazwa ?? id;
    }
}
