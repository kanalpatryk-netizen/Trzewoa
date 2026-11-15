// Port: alpha-1/src/sim/straznicy.ts
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Boss;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.Pomnik;
using static Trzewia.Symulacja.DlonDemona;
using static Trzewia.Symulacja.Walka;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class StanStraznikow
    {
        /// <summary>numer następnej (albo trwającej) fali w STRAZNICY.fale</summary>
        public double fala;
        public bool trwa;
        /// <summary>klan Strażników (−1 = jeszcze nie ma)</summary>
        public double klan;
        /// <summary>tik początku trwającej fali</summary>
        public double od;
        /// <summary>tik ostatniego ciosu Strażnika</summary>
        public double? cios;
        /// <summary>fala z bossem, a pod rdzeniem nie ma rycerzy (liczone co pół sekundy)</summary>
        public bool? bezRycerzy;
    }

    /// <summary>
    /// Strażnicy Snu (Remake v1, etap 3): fale spod skorupy rdzenia — przenikają skałę, idą do najbliższego z ludu i biją.
    /// </summary>
    public static class Straznicy
    {
        static Typ_STRAZNICY S => STRAZNICY;

        static Typ_STRAZNICY_fale? fala(double n) => JS.At(S.fale, n);

        /// <summary>Ostatnia deska: trwa fala z bossem, a w ludzie nie ma ani jednego walczącego.</summary>
        public static bool trybWiernych(Sim sim)
        {
            var st = sim.lud.straznicy;
            if (st?.trwa != true || fala(st.fala)?.boss != true) return false;
            return !sim.creatures.Any(c => !c.dead && walczacy(c));
        }

        /// <summary>Ilu walczących jest w ludzie: rycerze i — gdy rycerzy brak — robotnicy w hełmach.</summary>
        public static double iluRycerzy(Sim sim)
        {
            double n = 0;
            foreach (var c in sim.creatures) if (!c.dead && walczacy(c)) n++;
            return n;
        }

        /// <summary>Trwa fala z bossem, a walczących jest mniej niż `rycerzyNaBossa` (ale ktoś jest).</summary>
        public static bool rycerzeCzekaja(Sim sim)
        {
            var st = sim.lud.straznicy;
            if (st?.trwa != true || fala(st.fala)?.boss != true) return false;
            var n = iluRycerzy(sim);
            return n > 0 && n < S.rycerzyNaBossa;
        }

        public static StanStraznikow nowyStanStraznikow() => new StanStraznikow { fala = 0, trwa = false, klan = -1, od = 0 };

        static StanStraznikow stan(Sim sim) => sim.lud.straznicy ??= nowyStanStraznikow();

        /// <summary>Czy trwa fala — wtedy skorupa nie pęka.</summary>
        public static bool falaTrwa(Sim sim) => sim.lud.straznicy?.trwa == true;

        /// <summary>Czy wszyscy poza rycerzami mają odejść spod rdzenia.</summary>
        public static bool falaZwykla(Sim sim)
        {
            var st = sim.lud.straznicy;
            if (st?.trwa != true) return false;
            if (fala(st.fala)?.boss != true) return true;
            if (sim.tick % 60 != 0 && st.bezRycerzy != null) return st.bezRycerzy.Value;
            st.bezRycerzy = !sim.creatures.Any(c => !c.dead && walczacy(c) && wStrefieStraznikow(sim, c.x, c.y, S.ucieczkaZapas));
            return st.bezRycerzy.Value;
        }

        /// <summary>Czy (x, y) leży w strefie, w której grasują Strażnicy (z zapasem na ucieczkę).</summary>
        public static bool wStrefieStraznikow(Sim sim, double x, double y, double zapas = 0)
        {
            var w = sim.world;
            return JS.Hypot(x - w.coreX, y - w.przedsionekY) <= S.limitOdRdzenia + zapas;
        }

        /// <summary>Żywi Strażnicy (z bossem).</summary>
        public static List<Creature> zywiStraznicy(Sim sim) => sim.creatures.Where(c => !c.dead && c.straznik == true).ToList();

        /// <summary>Klan Strażników — zakładany przy pierwszej fali, bez wiary.</summary>
        static int klanStraznikow(Sim sim)
        {
            var st = stan(sim);
            if (st.klan >= 0 && sim.klan(st.klan) != null) return (int)st.klan;
            var w = sim.world;
            var k = sim.newClan(Race.TROLL, w.coreX, w.przedsionekY);
            k.name = "Strażnicy Snu";
            k.cecha = null;
            k.devotion = 0;
            st.klan = k.id;
            return k.id;
        }

        /// <summary>Miejsce w skale wokół przedsionka, skąd Strażnik wychodzi.</summary>
        public static (double x, double y) miejscePojawienia(Sim sim)
        {
            var w = sim.world;
            var bezbronni = sim.creatures.Where(o => !o.dead && rolaPostaci(o) != null && !walczacy(o)).ToList();
            (double, double) best = (w.coreX, w.przedsionekY); double bd = -1;
            for (var k = 0; k < 12; k++)
            {
                var r = S.pojawOd + sim.rng.@int(Math.Max(1, S.pojawDo - S.pojawOd + 1));
                var a = sim.rng.range(-Math.PI, 0);   // z boków i z góry — nie spod rdzenia
                var x = Math.Max(2, Math.Min(w.w - 3, JS.Round(w.coreX + JS.Cos(a) * r)));
                var y = Math.Max(2, Math.Min(w.coreY - 2, JS.Round(w.przedsionekY + JS.Sin(a) * r * 0.7)));
                var d = double.PositiveInfinity;
                foreach (var o in bezbronni) d = Math.Min(d, JS.Hypot(o.x - x, o.y - y));
                if (d >= S.pojawOdLudu) return (x, y);
                if (d > bd) { bd = d; best = (x, y); }
            }
            return best;
        }

        /// <summary>Wywołuje Strażnika (albo bossa — `boss` ustawia sim/boss.ts) w (x, y).</summary>
        public static Creature? nowyStraznik(Sim sim, double x, double y, double hp)
        {
            var klan = klanStraznikow(sim);
            // spawn wycina w skale kafel — Strażnik ma przenikać skałę, nie drążyć w niej dziur
            var w = sim.world;
            var t = w.inb(x, y) ? w.tile[w.idx(x, y)] : -1;
            var c = sim.spawn(Race.TROLL, klan, x, y);
            if (t >= 0) w.tile[w.idx(x, y)] = t;
            if (c == null) return null;
            c.straznik = true;
            c.devotion = 0;
            c.hp = hp; c.hpMax = hp;
            c.hunger = 0;
            c.zamiar = "strzeże snu góry — idzie na najbliższego z ludu, najpierw na rycerzy";
            return c;
        }

        /// <summary>Wołane z tikLudu: początek i koniec fal, rycerze ruszają do walki.</summary>
        public static void tikStraznikow(Sim sim)
        {
            var st = stan(sim);
            if (sim.tick % 60 == 0)
            {
                var zywi = zywiStraznicy(sim);
                if (st.trwa && zywi.Count == 0)
                {
                    st.trwa = false;
                    st.fala++;
                    sim.wiara += S.nagrodaWiary;
                    // po wygranej fali rycerze odpoczywają — wracają do pełni sił
                    foreach (var c in sim.creatures) if (!c.dead && walczacy(c)) c.hp = Math.Max(c.hp, maxHp(sim, c));
                    var w = sim.world;
                    sim.gdzie(w.coreX, w.przedsionekY).log(
                        st.fala >= S.fale.Length ? "Ostatni Strażnik Snu rozsypał się w pył. Nikt już nie strzeże twojego snu."
                            : $"Fala Strażników Snu pokonana. {(POMNIK.wlaczony ? "Pomnik" : "Skorupa")} znów pęka pod modlitwą (+{JS.S(S.nagrodaWiary)} wiary).", "wiara", $"fala-koniec-{JS.S(st.fala)}");
                    zapisz(sim, "rytual", $"fala {JS.S(st.fala)} pokonana", w.coreX, w.przedsionekY);
                }
                // zwykła fala bez walki zasypia — skorupa się zrasta
                if (st.trwa && fala(st.fala)?.boss != true && sim.tick - Math.Max(st.od, st.cios ?? 0) > S.zasypiaPo)
                {
                    foreach (var c in zywiStraznicy(sim)) { c.dead = true; sim.clans[c.clan].pop--; sim.efekt(c.x, c.y, "cud"); }
                    st.trwa = false;
                    st.fala++;
                    foreach (var k in sim.clans) if (!k.dead && k.rytual > 0) k.rytual = 0;
                    var w = sim.world;
                    sim.gdzie(w.coreX, w.przedsionekY).log($"Strażnicy Snu nie mieli z kim walczyć i wrócili do skały. {(POMNIK.wlaczony ? "Pomnik zrósł się" : "Skorupa zrosła się")} tam, gdzie pękał{(POMNIK.wlaczony ? "" : "a")}.", "otchlan", $"fala-sen-{JS.S(st.fala)}");
                }
                var def = fala(st.fala);
                // (Alpha, etap 5: falę z demonem zaczyna pomnik)
                if (!st.trwa && def != null && !(def.boss == true && POMNIK.wlaczony) && !sim.rytual.otwarta && procentSkorupy(sim) >= def.prog) zacznijFale(sim, st);
            }
            if (st.trwa && sim.tick % 30 == 0) rycerzeDoWalki(sim);
            if (st.trwa && sim.tick % 30 == 15 && trybWiernych(sim)) wierniDoWalki(sim);
        }

        /// <summary>Ostatnia deska: pobożni w zasięgu ruszają z księgą na najbliższego Strażnika.</summary>
        static void wierniDoWalki(Sim sim)
        {
            var wrogowie = zywiStraznicy(sim);
            if (wrogowie.Count == 0) return;
            var nazwa = aktywnyBoss().nazwa;
            foreach (var c in sim.creatures)
            {
                if (c.dead || rolaPostaci(c) != "pobozny") continue;
                Creature? best = null; var bd = aktywnyBoss().ksiega.widzi;
                foreach (var s in wrogowie) { var d = JS.Hypot(s.x - c.x, s.y - c.y); if (d < bd) { bd = d; best = s; } }
                if (best == null) continue;
                if (c.job == Job.FIGHT && sim.target.getOr(c.id, double.NaN) == best.id) continue;
                sim.target.set(c.id, best.id);
                c.job = Job.FIGHT; c.jt = 600; c.droga = null;
                c.zamiar = best.boss != null ? $"unosi księgę przeciw: {nazwa}" : "unosi księgę przeciw Strażnikowi Snu";
                c.zamiarDo = sim.tick + 600;
                c.wyprawa = false;
            }
        }

        /// <summary>Pobożny z księgą: razi bossa z dystansu, a gdy ten podejdzie zbyt blisko — cofa się.</summary>
        public static void walczKsiega(Sim sim, Creature c, Creature s, Action<double, double> idzDo)
        {
            var K = aktywnyBoss().ksiega;
            var d = JS.Hypot(s.x - c.x, s.y - c.y);
            c.face = s.x > c.x ? 1 : -1;
            Creature? zagr = null; var zd = K.cofa;
            foreach (var o in zywiStraznicy(sim)) { var od = JS.Hypot(o.x - c.x, o.y - c.y); if (od < zd) { zd = od; zagr = o; } }
            if (zagr != null) { var r = c.x - zagr.x; idzDo(Math.Floor(c.x + JS.Sign(JS.Tak(r) ? r : 1) * 5), Math.Floor(c.y)); return; }
            if (d > K.zasieg) { idzDo(Math.Floor(s.x), Math.Floor(s.y)); return; }
            if (sim.tick - (c.ksiegaT ?? -1e9) < K.co) return;
            c.ksiegaT = sim.tick;
            // promień z księgi do bossa
            for (var k = 1; k <= 5; k++) sim.spark(c.x + (s.x - c.x) * k / 6, c.y - 0.6 + (s.y - c.y) * k / 6, "pray");
            ranStraznika(sim, s, c, K.rana * mnoznik(sim, c, "modlitwa"));
        }

        /// <summary>Alpha, etap 5: z gruzów pomnika wstał demon — zaczyna się ostatnia fala (z nim).</summary>
        public static void zacznijFaleBossa(Sim sim)
        {
            var st = stan(sim);
            if (st.trwa) return;
            st.fala = Math.Max(st.fala, Array.FindIndex(S.fale, f => f.boss == true));
            zacznijFale(sim, st);
        }

        static void zacznijFale(Sim sim, StanStraznikow st)
        {
            var def = S.fale[(int)st.fala];
            var wzrost = 1 + S.wzrostNaFale * st.fala;
            for (var i = 0; i < def.straznikow; i++)
            {
                var (x, y) = miejscePojawienia(sim);
                var c = nowyStraznik(sim, x, y, S.hp * wzrost);
                if (c != null) sim.efekt(c.x, c.y, "cud");
            }
            if (def.boss == true) aktywnyBoss().pojaw(sim);
            st.trwa = true;
            st.od = sim.tick;
            // pod rdzeniem wszyscy przerywają zamiar
            foreach (var c in sim.creatures) if (!c.dead && rolaPostaci(c) != null && wStrefieStraznikow(sim, c.x, c.y, S.ucieczkaZapas)) c.jt = 0;
            sim.lud.straznicy!.od = sim.tick;
            var w = sim.world;
            sim.gdzie(w.coreX, w.przedsionekY).log(
                def.boss == true && POMNIK.wlaczony ? $"Z gruzów Wielkiego Pomnika wstaje {aktywnyBoss().nazwa} — a z nim Strażnicy Snu ({JS.S(def.straznikow)}). Rani go tylko rycerz; gdy padnie, jesteś wolny."
                    : def.boss == true ? $"Ostatnia fala: ze ściany przedsionka wynurza się {aktywnyBoss().nazwa}. Skorupa nie pęknie, dopóki stoi."
                    : $"Strażnicy Snu wychodzą ze skały ({JS.S(def.straznikow)}). Dopóki żyją, {(POMNIK.wlaczony ? "pomnik" : "skorupa")} nie pęka.", "krew", $"fala-{JS.S(st.fala)}");
            zapisz(sim, "rytual", $"fala {JS.S(st.fala + 1)}: {JS.S(def.straznikow)} Strażników{(def.boss == true ? " + boss" : "")}", w.coreX, w.przedsionekY);
        }

        /// <summary>Rycerze w zasięgu ruszają na najbliższego Strażnika.</summary>
        static void rycerzeDoWalki(Sim sim)
        {
            var wrogowie = zywiStraznicy(sim);
            if (wrogowie.Count == 0) return;
            // za mało rycerzy na bossa — przerywają walkę i odchodzą spod rdzenia
            if (rycerzeCzekaja(sim))
            {
                foreach (var c in sim.creatures)
                {
                    if (c.dead || !walczacy(c)) continue;
                    Creature? blisko = null; var bd = S.rycerzBroniSieOd;
                    foreach (var s in wrogowie) { var d = JS.Hypot(s.x - c.x, s.y - c.y); if (d < bd) { bd = d; blisko = s; } }
                    if (blisko != null)
                    {
                        if (c.job != Job.FIGHT || sim.target.getOr(c.id, double.NaN) != blisko.id)
                        {
                            sim.target.set(c.id, blisko.id);
                            c.job = Job.FIGHT; c.jt = 240; c.droga = null;
                            c.zamiar = blisko.boss != null ? $"broni się przed: {aktywnyBoss().nazwa}" : "broni się przed Strażnikiem Snu";
                            c.zamiarDo = sim.tick + 240;
                        }
                        continue;
                    }
                    if (c.job != Job.FIGHT) continue;
                    var cel = sim.creatureById(sim.target.getOr(c.id, -1));
                    if (cel != null && cel.straznik == true) { sim.target.delete(c.id); c.jt = 0; c.zamiarDo = sim.tick; }
                }
                return;
            }
            // Alpha 1 (6.11): przy demonie Strażników bierze się tylko z bliska
            var jestBoss = wrogowie.Any(s => s.boss != null);
            foreach (var c in sim.creatures)
            {
                if (c.dead || !walczacy(c)) continue;
                var obecny = sim.creatureById(sim.target.getOr(c.id, -1));
                var glodny = c.hunger > LUD.glodSam;
                var dObecny = obecny != null ? JS.Hypot(obecny.x - c.x, obecny.y - c.y) : double.PositiveInfinity;
                var dalekiStraznik = jestBoss && !glodny && obecny != null && obecny.boss == null && dObecny > S.rycerzBroniSieOd;
                if (c.job == Job.FIGHT && obecny != null && !obecny.dead && obecny.straznik == true && !dalekiStraznik && !(glodny && dObecny > S.rycerzGlodnyWalczyOd)) continue;
                var widzi = glodny ? S.rycerzGlodnyWalczyOd : S.rycerzWidzi;
                Creature? best = null; var bd = double.PositiveInfinity;
                foreach (var s in wrogowie)
                {
                    var d = JS.Hypot(s.x - c.x, s.y - c.y);
                    if (d >= (s.boss != null && !glodny ? double.PositiveInfinity : widzi)) continue;
                    var kara = jestBoss && !glodny && s.boss == null && d > S.rycerzBroniSieOd ? 1e6 : 0;
                    if (d + kara < bd) { bd = d + kara; best = s; }
                }
                if (best == null)
                {
                    if (glodny && c.job == Job.FIGHT && obecny?.straznik == true) { sim.target.delete(c.id); c.jt = 0; c.zamiarDo = sim.tick; }
                    continue;
                }
                sim.target.set(c.id, best.id);
                c.job = Job.FIGHT; c.jt = 600; c.droga = null;
                c.zamiar = best.boss != null ? $"walczy z: {aktywnyBoss().nazwa}" : "walczy ze Strażnikiem Snu";
                c.zamiarDo = sim.tick + 600;
                c.wyprawa = false;
            }
        }

        /// <summary>Rana zadana Strażnikowi (boss może ją zmienić — np. przyjmuje tylko od rycerzy).</summary>
        public static void ranStraznika(Sim sim, Creature s, Creature od, double dmg, bool chwieje = false)
        {
            if (s.dead) return;
            if (s.boss != null && demonKona(sim)) return;
            if (s.boss != null && tarczaChroni(sim)) { odbijOdTarczy(sim, od); return; }
            var d = s.boss != null ? aktywnyBoss().przyjmij(sim, s, od, dmg) : dmg;
            if (d <= 0) return;
            var hp0 = s.hp;
            s.hp -= d;
            sim.spark(s.x, s.y - 0.5, "hit");
            if (s.boss != null && s.hp > 0) bossPrzyjmuje(sim, s, hp0, d, chwieje);
            if (s.hp <= 0 && s.boss != null && ostatnieUderzenie(sim, s, od)) return;
            if (s.hp <= 0)
            {
                sim.kill(s, $"z ręki ludu ({rolaPostaci(od) ?? "ktoś"})", "walka");
                sim.efekt(s.x, s.y, "cud");
            }
        }

        /// <summary>Rycerz walczy ze Strażnikiem: podchodzi i uderza w swoim rytmie (wołane z doFight).</summary>
        public static void walczZeStraznikiem(Sim sim, Creature c, Creature s, Action<double, double> podejdz)
        {
            if (rolaPostaci(c) == "rycerz") { walkaRycerza(sim, c, s, podejdz); return; }
            var zasieg = S.rycerzZasieg + (s.boss != null ? 0.8 : 0);
            if (JS.Hypot(s.x - c.x, s.y - c.y) > zasieg) { podejdz(Math.Floor(s.x), Math.Floor(s.y)); return; }
            c.face = s.x > c.x ? 1 : -1;
            if (sim.tick - (c.ciosT ?? -1e9) < S.rycerzCiosCo) return;
            c.ciosT = sim.tick;
            var dmg = RACES[c.race].strength * mnoznik(sim, c, "sila") * (0.8 + sim.rng.next() * 0.4);
            ranStraznika(sim, s, c, dmg);
        }

        /// <summary>Ruch Strażnika: przenika skałę, prosto do celu, nie dalej niż `limit` od rdzenia.</summary>
        public static void ruchStraznika(Sim sim, Creature c, double tx, double ty, double v, double limit)
        {
            var w = sim.world;
            double dx = tx - c.x, dy = ty - c.y, d = JS.Hypot(dx, dy);
            if (!JS.Tak(d)) d = 1;
            double nx = c.x + (dx / d) * Math.Min(v, d), ny = c.y + (dy / d) * Math.Min(v, d);
            var od = JS.Hypot(nx - (w.coreX + 0.5), ny - w.przedsionekY);
            if (od > limit) { var k = limit / od; nx = w.coreX + 0.5 + (nx - w.coreX - 0.5) * k; ny = w.przedsionekY + (ny - w.przedsionekY) * k; }
            if (Math.Abs(dx) > 0.05) c.face = dx > 0 ? 1 : -1;
            c.x = Math.Max(1, Math.Min(w.w - 2, nx));
            // (Alpha, etap 5: demon wstaje z gruzów pomnika na dnie komory — on jeden może zejść poniżej rdzenia)
            c.y = Math.Max(1, Math.Min(c.boss != null ? miejscePomnika(sim).y : w.coreY - 1, ny));
            c.vy = 0;
        }

        /// <summary>Najbliższy z ludu w zasięgu rdzenia (cel Strażnika).</summary>
        public static Creature? celStraznika(Sim sim, Creature c, double limit)
        {
            var w = sim.world;
            Creature? best = null; var bd = double.PositiveInfinity;
            foreach (var o in sim.creatures)
            {
                if (o.dead || rolaPostaci(o) == null) continue;
                if (JS.Hypot(o.x - w.coreX, o.y - w.przedsionekY) > limit) continue;
                if (!walczacy(o) && o.job == Job.WANDER && o.zamiar?.StartsWith("odchodzi z krypty", StringComparison.Ordinal) == true) continue;
                var d = JS.Hypot(o.x - c.x, o.y - c.y) - (walczacy(o) ? S.rycerzPierwszy : 0);
                if (d < bd) { bd = d; best = o; }
            }
            return best;
        }

        /// <summary>Cios Strażnika w kogoś z ludu; kto nie jest rycerzem, oddaje słabszy.</summary>
        public static void ciosStraznika(Sim sim, Creature c, Creature cel, double sila)
        {
            if (sim.lud.straznicy != null) sim.lud.straznicy.cios = sim.tick;
            var kier = JS.Sign(c.x - cel.x);
            var rana = przyjmijCios(sim, cel, sila * (0.85 + sim.rng.next() * 0.3) * ranyZbroi(cel), new OpcjeCiosu { kier = JS.Tak(kier) ? kier : 1 });
            if (rana <= 0) return;
            cel.hp -= rana;
            oznaczCios(sim, cel, c.boss != null);
            sim.spark(cel.x, cel.y - 0.5, "hit");
            if (cel.hp <= 0) { sim.kill(cel, c.boss != null ? $"zmiażdżony przez: {aktywnyBoss().nazwa}" : "z ręki Strażnika Snu", "straznik"); return; }
            if (!walczacy(cel)) ranStraznika(sim, c, cel, RACES[cel.race].strength * mnoznik(sim, cel, "sila") * S.oddajeCios);
        }

        /// <summary>Krok Strażnika (zamiast zwykłego życia stworzenia).</summary>
        public static void krokStraznika(Sim sim, Creature c)
        {
            if (c.boss != null) { aktywnyBoss().tik(sim, c); return; }
            if (demonKona(sim)) return;
            var w = sim.world;
            var st = stan(sim);
            var wzrost = 1 + S.wzrostNaFale * Math.Min(st.fala, S.fale.Length - 1);
            // cel co pół sekundy
            var cel = sim.creatureById(sim.target.getOr(c.id, -1));
            if (cel == null || cel.dead || sim.tick % 60 == c.id % 60)
            {
                cel = celStraznika(sim, c, S.limitOdRdzenia);
                if (cel != null) sim.target.set(c.id, cel.id); else sim.target.delete(c.id);
            }
            if (cel == null) { ruchStraznika(sim, c, w.coreX + 0.5 + JS.Sin(sim.tick * 0.01 + c.id) * 6, w.przedsionekY - 3, S.szybkosc * 0.5, S.limitOdRdzenia); return; }
            if (JS.Hypot(cel.x - c.x, cel.y - c.y) > S.zasieg) { ruchStraznika(sim, c, cel.x, cel.y - 0.3, S.szybkosc, S.limitOdRdzenia); return; }
            c.face = cel.x > c.x ? 1 : -1;
            if (sim.tick - (c.ciosT ?? -1e9) < S.ciosCo || (c.ogluszonyAtakDo ?? -1) > sim.tick) return;
            c.ciosT = sim.tick;
            ciosStraznika(sim, c, cel, S.sila * wzrost);
        }
    }
}
