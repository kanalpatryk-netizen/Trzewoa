// Port: alpha-1/src/sim/pielgrzymka.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Pomieszczenia;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class PlanDrogi
    {
        public int klan;
        public double tick;
        /// <summary>Kafle od przedsionka do gniazda.</summary>
        public List<double> sciezka = new List<double>();
        /// <summary>Kafle skały na tej drodze — to trzeba wydrążyć.</summary>
        public List<double> kopac = new List<double>();
        /// <summary>Alpha: droga schodami (nigdzie zeskoku wyższego niż o kafel).</summary>
        public bool? dwukierunkowa;
        /// <summary>Alpha (jedno wiadro): kafle drogi, przez które sama spada lina — na zakrętach.</summary>
        public List<double>? liny;
        /// <summary>Droga wiernych jako szyb ze schodami (25.10): wszystkie kafle szybu, od góry rzędami (środek, potem boki).</summary>
        public List<double>? szyb;
    }

    /// <summary>
    /// Droga pielgrzymów: którędy lud zejdzie pod rdzeń i wróci (patrz komentarz w pielgrzymka.ts).
    /// </summary>
    public static class Pielgrzymka
    {
        static double KOSZT_SKALY => PLAN_DROGI.kosztSkaly;
        static readonly int N = (int)(World.WORLD_W * World.WORLD_H);

        /// <summary>Co da się wydrążyć rytem: lita skała, ziemia i ruda — ale nie ołtarz, kuźnia ani skorupa.</summary>
        public static bool doKopania(double t) => PASSABLE[t] != 1 && t != T.STONE && t != T.CORE && t != T.SHRINE && t != T.FORGE;

        /// <summary>Remake v1: kafle, do których da się dojść z siedziby.</summary>
        static readonly byte[] zBazy = new byte[N];
        static void osiagalneZBazy(Sim sim, double hx, double hy)
        {
            var w = sim.world; var W = (int)w.w;
            Array.Clear(zBazy, 0, zBazy.Length);
            var kolejka = new List<int>();
            void dodaj(int j) { if (zBazy[j] == 0) { zBazy[j] = 1; kolejka.Add(j); } }
            if (!w.inb(hx, hy)) return;
            dodaj((int)w.idx(hx, hy));
            for (var g = 0; g < kolejka.Count && kolejka.Count < 8000; g++)
            {
                var i = kolejka[g];
                int x = i % W, y = i / W;
                var naPodlodze = stoi(sim, x, y);
                var wisi = !naPodlodze && uchwyt(sim, x, y);
                if (!naPodlodze && y + 1 < World.WORLD_H && wolny(sim, i + W, false) && !(wisi && przepasc(sim, x, y + 1))
                    && (!PLAN_DROGI.dwukierunkowa || stoi(sim, x, y + 1))) dodaj(i + W);
                if (!naPodlodze && !wisi) continue;
                // w górę tylko z podłogi, na stopień (Remake v2)
                if (naPodlodze && y > 0 && wolny(sim, i - W, false)) dodaj(i - W);
                foreach (var dx in new[] { -1, 1 })
                {
                    var nx = x + dx;
                    if (nx < 0 || nx >= W) continue;
                    var j = i + dx;
                    if (!wolny(sim, j, false)) continue;
                    var tamStoi = stoi(sim, nx, y);
                    if (wisi && !tamStoi) continue;
                    if (!tamStoi && (nadOgniem(sim, nx, y) || przepasc(sim, nx, y))) continue;
                    dodaj(j);
                }
            }
        }

        /// <summary>Droga wiernych jako szyb (propozycja Pawła, 25.10; od 6.11 z zakrętem) — patrz TS.</summary>
        static PlanDrogi? planSzybu(Sim sim, int klanId)
        {
            var w = sim.world;
            var s1 = JS.At(w.odcinkiDrogi, 0); var s2 = JS.At(w.odcinkiDrogi, 1);
            if (s1 == null || s2 == null) return null;
            double srodek(Prost o) => JS.ToInt32(o.x0 + o.x1) >> 1;
            var szyb = new List<double>();
            foreach (var o in w.odcinkiDrogi)
            {
                var sx = srodek(o);
                var kolumny = new List<double> { sx };
                for (var k = 0; k < o.x1 - o.x0 + 1; k++) if (o.x0 + k != sx) kolumny.Add(o.x0 + k);
                for (var y = o.y0; y <= o.y1; y++) foreach (var x in kolumny) szyb.Add(w.idx(x, y));
            }
            double sx1 = srodek(s1), sx2 = srodek(s2);
            bool wPrzedsionku(double x, double y) => Math.Abs(x - w.coreX) <= 4 && y >= w.przedsionekY && y - w.przedsionekY < PIELGRZYMKA.przedsionekY && stoi(sim, x, y);
            var dno = w.idx(sx2, s2.y1);
            var r = szukajKopiac(sim, new List<double> { dno }, (_i, x, y) => wPrzedsionku(x, y), new OpcjeKopania { koszt = (_j, x, y) => (w.wBramie(x, y) ? 0 : -1), limit = 8000, zBudzetu = false });
            var loch = r != null ? r.droga : new List<double>();
            var sciezka = new List<double>(loch); sciezka.Reverse();
            for (var y = s2.y1; y >= s2.y0; y--) sciezka.Add(w.idx(sx2, y));
            var dnoKomnaty = w.komnata.y1;
            double krok = sx1 > sx2 ? 1 : -1;
            for (var x = sx2; x != sx1; x += krok) sciezka.Add(w.idx(x, dnoKomnaty));
            var dolWneki = w.salaOltarza.y1;
            for (var y = dnoKomnaty; y >= dolWneki; y--) sciezka.Add(w.idx(sx1, y));
            for (var x = sx1 + 1; x <= s1.x1 + 1; x++) sciezka.Add(w.idx(x, dolWneki));
            return new PlanDrogi { klan = klanId, tick = sim.tick, sciezka = sciezka, kopac = szyb.Where(i => doKopania(w.tile[i])).ToList(), dwukierunkowa = true, liny = new List<double>(), szyb = szyb };
        }

        /// <summary>Przejście szybem drogi wiernych (`world.schody`) — liczone z mapy (patrz TS).</summary>
        public static void schodyDrogi(Sim sim)
        {
            var w = sim.world;
            foreach (var s in w.odcinkiDrogi)
            {
                for (var x = s.x0; x <= s.x1; x++)
                {
                    var polaczony = true;
                    for (var y = s.y0; y <= s.y1; y++)
                    {
                        var i = w.idx(x, y);
                        polaczony = polaczony && PASSABLE[w.tile[i]] == 1;
                        w.schody[i] = polaczony && y > w.salaOltarza.y1 ? 1 : 0;
                    }
                }
            }
        }

        public static PlanDrogi? planujDroge(Sim sim, int klanId, int proba = 0, bool? dwukierunkowaArg = null)
        {
            var dwukierunkowa = dwukierunkowaArg ?? PLAN_DROGI.dwukierunkowa;
            var w = sim.world; var W = (int)w.w;
            var klan = sim.klan(klanId);
            if (klan == null) return null;
            if (SWIAT.warstwy.wlaczone && w.odcinkiDrogi.Count > 0) return planSzybu(sim, klanId);
            if (proba == 0) osiagalneZBazy(sim, klan.hx, klan.hy);
            var plywa = RACES[klan.race].swims;
            var plyny = maCos(w.magma) || maCos(w.water);
            bool bezpieczna(int i)
            {
                if (!plyny) return true;
                var x = i % W;
                foreach (var j in new[] { i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1 })
                {
                    if (j < 0 || j >= N) continue;
                    if (w.magma.d[j] > 0 || w.water.d[j] > 2) return false;
                }
                return true;
            }
            var omijaj = new HashSet<double>((sim.lud.omijaj ?? new List<double[]>()).Where(o => o[1] > sim.tick).Select(o => o[0]));
            bool podWiadrem(int i) => i % W == w.szybWiadraX && i / W > w.szybWiadraDol;
            bool skala(int i) => doKopania(w.tile.d[i]) && w.magma.d[i] == 0 && bezpieczna(i) && !omijaj.Contains(i) && !podWiadrem(i);
            var starty = new List<double>();
            for (var i = 0; i < N; i++)
            {
                if (!wolny(sim, i, plywa)) continue;
                int x = i % W, y = i / W;
                var blisko = proba == 0 ? zBazy[i] == 1 && Math.Abs(x - klan.hx) <= 12 && Math.Abs(y - klan.hy) <= 8
                    : proba == 1 ? zBazy[i] == 1 : Math.Abs(x - klan.hx) <= 3 && Math.Abs(y - klan.hy) <= 3;
                if (blisko) starty.Add(i);
            }
            bool wPrzedsionku(double x, double y) => Math.Abs(x - w.coreX) <= 4
                && (dwukierunkowa ? y >= w.przedsionekY && y - w.przedsionekY < PIELGRZYMKA.przedsionekY && stoi(sim, x, y) : Math.Abs(y - w.przedsionekY) <= 2);
            var r = szukajKopiac(sim, starty, (_i, x, y) => wPrzedsionku(x, y), new OpcjeKopania
            {
                koszt = (i, _x, _y) => (skala((int)i) ? KOSZT_SKALY : -1), limit = N, plywa = plywa, zBudzetu = false, dwukierunkowa = dwukierunkowa,
            });
            if (r == null) return proba < 2 ? planujDroge(sim, klanId, proba + 1, dwukierunkowa) : dwukierunkowa ? planujDroge(sim, klanId, 0, false) : null;
            var sciezka = new List<double> { r.start }; sciezka.AddRange(r.droga); sciezka.Reverse();
            return new PlanDrogi { klan = klanId, tick = sim.tick, sciezka = sciezka, kopac = sciezka.Where(i => skala((int)i)).ToList(), dwukierunkowa = dwukierunkowa, liny = linyDrogi(sim, sciezka) };
        }

        /// <summary>Alpha (jedno wiadro): liny na zakrętach drogi wiernych (patrz TS).</summary>
        static List<double> linyDrogi(Sim sim, List<double> sciezka)
        {
            var w = sim.world; var W = w.w;
            var zostalo = budzetDrog();
            var bylo = sciezka.Select(i => w.tile[i]).ToList();
            foreach (var i in sciezka) if (PASSABLE[w.tile[i]] != 1) w.tile[i] = T.AIR;
            bool dojdzie(double a, double b)
            {
                nowyTik(1);
                var c = new Creature { x = (a % W) + 0.5, y = JS.ToInt32(a / W), race = Race.GOBLIN };
                return szukajDrogi(sim, c, (i, _x, _y) => i == b, 80) != null;
            }
            var liny = new List<double>();
            for (var k = 0; k + 1 < sciezka.Count; k++)
            {
                double a = sciezka[k], b = sciezka[k + 1];
                if (dojdzie(a, b)) continue;
                foreach (var proba in new[] { new[] { b }, new[] { a }, new[] { a, b }, new[] { b, JS.At(sciezka, k + 2) ?? b } })
                {
                    var nowe = proba.Where(i => !JS.Tak(w.lina[i])).ToList();
                    foreach (var i in nowe) w.lina[i] = 1;
                    if (dojdzie(a, b)) { liny.AddRange(nowe); break; }
                    foreach (var i in nowe) w.lina[i] = 0;
                }
            }
            // (decyzja użytkownika 18.10: lina nie trzyma się powietrza)
            foreach (var i in liny.ToList())
            {
                var x = i % W;
                double g = JS.ToInt32(i / W);
                while (g > 0 && JS.Tak(w.lina[(g - 1) * W + x])) g--;
                if (kotwicaLiny(w, x, g) != null) continue;
                var dodane = new List<double>();
                while (dodane.Count < 4 && g > 0 && PASSABLE[w.tile[(g - 1) * W + x]] == 1 && kotwicaLiny(w, x, g) == null)
                {
                    g--; w.lina[g * W + x] = 1; dodane.Add(g * W + x);
                }
                if (kotwicaLiny(w, x, g) != null) { liny.AddRange(dodane); continue; }
                foreach (var j in dodane) w.lina[j] = 0;
                // bez zaczepienia — cały odcinek odpada
                var d = g;
                while (d < w.h && JS.Tak(w.lina[d * W + x])) { var j = d * W + x; w.lina[j] = 0; var n = liny.IndexOf(j); if (n >= 0) liny.RemoveAt(n); d++; }
            }
            for (var k = 0; k < sciezka.Count; k++) w.tile[sciezka[k]] = bylo[k];
            foreach (var i in liny) w.lina[i] = 0;
            nowyTik(zostalo);
            return liny;
        }

        /// <summary>Alpha (jedno wiadro; decyzja użytkownika 18.10): gdy zakręt drogi wiernych jest już wykopany, lina spada tam sama.</summary>
        static void spuscLiny(Sim sim, PlanDrogi p)
        {
            var w = sim.world; var W = w.w;
            foreach (var i in p.liny ?? new List<double>())
            {
                if (JS.Tak(w.lina[i]) || PASSABLE[w.tile[i]] != 1 || w.magma[i] > 0) continue;
                double x = i % W, y = JS.ToInt32(i / W);
                var gora = y;
                while (gora > 0 && JS.Tak(w.lina[i - (y - gora + 1) * W])) gora--;
                if (kotwicaLiny(w, x, gora) == null) continue;
                w.lina[i] = 1;
                zdarzenie(sim, new ZdarzeniePom { rodzaj = "lina", x = x, y0 = y, y1 = y, tik = sim.tick, gracz = false });
                zapisz(sim, "praca", $"na zakręcie drogi wiernych ({JS.S(x)}, {JS.S(y)}) spadła lina — tędy wróci się pod górę", x, y);
            }
        }

        /// <summary>Alpha: czy stary plan wciąż się nadaje.</summary>
        static bool planWciazDobry(Sim sim, PlanDrogi p)
        {
            var w = sim.world;
            if (p.szyb != null) return p.szyb.All(i => PASSABLE[w.tile[i]] == 1 || doKopania(w.tile[i]));
            if (PLAN_DROGI.dwukierunkowa && p.dwukierunkowa != true && sim.tick - p.tick > PLAN_DROGI.zapasowyPonowCo) return false;
            var omijaj = new HashSet<double>((sim.lud.omijaj ?? new List<double[]>()).Where(o => o[1] > sim.tick).Select(o => o[0]));
            foreach (var i in p.sciezka)
            {
                if (omijaj.Contains(i)) return false;
                if (PASSABLE[w.tile[i]] != 1 && !doKopania(w.tile[i])) return false;
            }
            return true;
        }

        /// <summary>Remake v1: czoło drogi, które stoi, choć kopacze są do niego wysłani — plan je omija i liczy się od nowa.</summary>
        public static void pilnujCzola(Sim sim)
        {
            if (!REMAKE || sim.lud == null) return;
            var cz = czoloDrogi(sim);
            var st = sim.lud.czolo;
            if (st == null || st.i != cz) { sim.lud.czolo = new CzoloDrogi { i = cz, od = sim.tick, prob = 0, zk = 0 }; return; }
            if (cz < 0) return;
            st.prob++;
            double fx = cz % sim.world.w, fy = JS.ToInt32(cz / sim.world.w);
            if (sim.creatures.Any(c => !c.dead && c.kopieDroge == true && Math.Abs(c.x - fx) <= 3 && Math.Abs(c.y - fy) <= 3)) st.zk++;
            var w0 = sim.world; var przyOgniu = sim.przyMagmie(cz % w0.w, JS.ToInt32(cz / w0.w), 2);
            if (!przyOgniu && (sim.tick - st.od < PLAN_DROGI.czoloStoi || st.zk < st.prob * 0.5)) return;
            sim.lud.omijaj = (sim.lud.omijaj ?? new List<double[]>()).Where(o => o[1] > sim.tick).ToList();
            sim.lud.omijaj.Add(new[] { cz, sim.tick + PLAN_DROGI.czoloOmijaj });
            sim.lud.czolo = null;
            var w = sim.world;
            var stary = sim.planDrogi;
            odswiezPlan(sim);
            // objazd dużo dłuższy niż to, co zostało — zostaje stary plan
            if (!przyOgniu && stary != null && sim.planDrogi != null && sim.planDrogi.kopac.Count > stary.kopac.Count * 1.5 + 10)
            {
                sim.lud.omijaj = sim.lud.omijaj.Where(o => o[0] != cz).ToList();
                sim.planDrogi = stary;
                zapisz(sim, "praca", $"czoło drogi ({JS.S(cz % w.w)}, {JS.S(JS.ToInt32(cz / w.w))}) stoi, ale objazd byłby dużo dłuższy — plan zostaje", cz % w.w, JS.ToInt32(cz / w.w));
                return;
            }
            zapisz(sim, "praca", $"czoło drogi ({JS.S(cz % w.w)}, {JS.S(JS.ToInt32(cz / w.w))}) stoi — plan je omija", cz % w.w, JS.ToInt32(cz / w.w));
        }

        /// <summary>Alpha: kafle skały na kresce, których jeszcze nikt nie wykuł — od strony obozu do przedsionka.</summary>
        public static List<double> nieWykopane(Sim sim)
        {
            var p = sim.planDrogi;
            if (p == null || sim.rytual.otwarta) return new List<double>();
            var w = sim.world;
            if (p.szyb != null)
            {
                var out1 = p.szyb.Where(i => doKopania(w.tile[i])).ToList();
                var juz = new HashSet<double>(out1);
                for (var k = p.sciezka.Count - 1; k >= 0; k--) { var i = p.sciezka[k]; if (!juz.Contains(i) && doKopania(w.tile[i])) { out1.Add(i); juz.Add(i); } }
                return out1;
            }
            var out2 = new List<double>();
            for (var k = p.sciezka.Count - 1; k >= 0; k--) if (doKopania(w.tile[p.sciezka[k]])) out2.Add(p.sciezka[k]);
            return out2;
        }

        /// <summary>Remake v1: czoło drogi — pierwszy kafel skały na kresce od strony obozu, albo -1.</summary>
        public static double czoloDrogi(Sim sim)
        {
            var p = sim.planDrogi;
            if (p == null || sim.rytual.otwarta) return -1;
            var w = sim.world;
            var tile = w.tile.d;
            if (p.szyb != null)
            {
                foreach (var i in p.szyb) if (doKopania(tile[(int)i])) return i;
                for (var k = p.sciezka.Count - 1; k >= 0; k--) if (doKopania(tile[(int)p.sciezka[k]])) return p.sciezka[k];
                return -1;
            }
            for (var k = p.sciezka.Count - 1; k >= 0; k--) if (doKopania(w.tile[p.sciezka[k]])) return p.sciezka[k];
            return -1;
        }

        /// <summary>Nacja, która pierwsza może zejść pod rdzeń: najwierniejsza z tych, które mają kogo wysłać.</summary>
        public static Clan? najwierniejsza(Sim sim)
        {
            Clan? best = null;
            foreach (var k in sim.clans)
            {
                if (k.dead || k.pop < PLAN_DROGI.minNacja || RACES[k.race].faithGain <= 0) continue;
                if (best == null || k.devotion > best.devotion) best = k;
            }
            return best;
        }

        /// <summary>Plan dla najwierniejszej nacji — liczy go sama symulacja, w stałym rytmie.</summary>
        public static void odswiezPlan(Sim sim)
        {
            if (sim.rytual.otwarta) { sim.planDrogi = null; return; }
            if (REMAKE)
            {
                var lud = sim.clans.FirstOrDefault(k => !k.dead && k.race == Race.GOBLIN);
                var stary = sim.planDrogi;
                if (stary != null && lud != null && stary.klan == lud.id && PLAN_DROGI.stala && planWciazDobry(sim, stary)) return;
                sim.planDrogi = lud != null ? planujDroge(sim, lud.id) : null;
                return;
            }
            var wyslani = klanWyslanych(sim);
            if (wyslani != null) { sim.planDrogi = planujDroge(sim, wyslani.id); return; }
            var klan = najwierniejsza(sim);
            if (klan == null || klan.devotion < PLAN_DROGI.oddanieNacji || klan.pop < PLAN_DROGI.minNacja) { sim.planDrogi = null; return; }
            sim.planDrogi = planujDroge(sim, klan.id);
        }

        /// <summary>Nacja z największą liczbą pielgrzymów w drodze — albo null.</summary>
        static Clan? klanWyslanych(Sim sim)
        {
            var ilu = new JsMap<double, double>();
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.job != Job.PIELGRZYM) continue;
                ilu.set(c.clan, ilu.getOr(c.clan, 0) + 1);
            }
            Clan? best = null; double n = 0;
            foreach (var kv in ilu)
            {
                var klan = sim.klan(kv.Key);
                if (klan != null && !klan.dead && kv.Value > n) { best = klan; n = kv.Value; }
            }
            return best;
        }

        /// <summary>Plan do pokazania graczowi: bez przeliczania, a już wydrążone kafle odpadają z listy.</summary>
        public static PlanDrogi? aktualnyPlan(Sim sim)
        {
            var p = sim.planDrogi;
            if (p == null) return null;
            p.kopac = p.kopac.Where(i => doKopania(sim.world.tile[i])).ToList();
            return p;
        }

        /// <summary>Góra osusza drogę wiernych (Alpha: sama już nie drąży — drogę kopią robotnicy).</summary>
        public static void drazDrogeWiernym(Sim sim)
        {
            var p = sim.planDrogi;
            if (p == null || sim.rytual.otwarta) return;
            if (REMAKE)
            {
                var w = sim.world;
                spuscLiny(sim, p);
                schodyDrogi(sim);
                foreach (var i in p.sciezka)
                {
                    w.prog[i] = 1;
                    if (w.water[i] > 0 || w.magma[i] > 0) { w.water[i] = 0; w.magma[i] = 0; }
                }
                // magma tuż przy drodze zastyga w kamień
                if (sim.tick % 60 == 0)
                {
                    foreach (var i in p.sciezka)
                    {
                        double x = i % w.w, y = JS.ToInt32(i / w.w);
                        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++)
                        {
                            if (!w.inb(x + dx, y + dy)) continue;
                            var j = w.idx(x + dx, y + dy);
                            if (w.magma[j] > 0 && !p.sciezka.Contains(j)) { w.magma[j] = 0; if (w.tile[j] != T.CORE) w.tile[j] = T.STONE; }
                        }
                    }
                }
                return;
            }
            var idzie = false;
            foreach (var c in sim.creatures) if (!c.dead && c.clan == p.klan && c.job == Job.PIELGRZYM) { idzie = true; break; }
            if (!idzie) return;
            var w2 = sim.world;
            foreach (var i in p.sciezka)
            {
                w2.prog[i] = 1;
                if (w2.water[i] > 0 || w2.magma[i] > 0) { w2.water[i] = 0; w2.magma[i] = 0; }
            }
            while (p.kopac.Count > 0)
            {
                var i = p.kopac[p.kopac.Count - 1]; p.kopac.RemoveAt(p.kopac.Count - 1);
                if (!doKopania(w2.tile[i])) continue;
                var bylo = w2.tile[i];
                w2.tile[i] = T.AIR;
                zapisz(sim, "blok", $"blok ({JS.S(i % w2.w)}, {JS.S(JS.ToInt32(i / w2.w))}) zniszczony: {(bylo < NAZWY_KAFLI.Length ? NAZWY_KAFLI[(int)bylo] : JS.S(bylo))} → pustka — góra drąży drogę wiernym", i % w2.w, JS.ToInt32(i / w2.w));
                double x = i % w2.w, y = JS.ToInt32(i / w2.w);
                w2.oznaczSlad(x, y, 1, sim.tick);
                if (sim.rng.chance(0.25)) sim.spark(x + 0.5, y + 0.5, "dust");
                return;
            }
        }
    }
}
