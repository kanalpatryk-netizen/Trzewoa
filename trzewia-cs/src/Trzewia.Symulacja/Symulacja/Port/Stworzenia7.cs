// Port: alpha-1/src/sim/creatures.ts — część 7: doPielgrzym … doDrain
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyLud;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Races;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.CechyNacji;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Rytual;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Brama;
using static Trzewia.Symulacja.Straznicy;
using static Trzewia.Symulacja.Zabytki;
using static Trzewia.Symulacja.Zbroja;
using static Trzewia.Symulacja.Wydarzenia;
using static Trzewia.Symulacja.BudowaSchodow;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static partial class Stworzenia
    {
        /// <summary>Droga pod rdzeń (patrz TS). W samą skorupę nie ruszą — ta pęka od modlitwy (rytual.ts).</summary>
        static void doPielgrzym(Sim sim, Creature c)
        {
            var w = sim.world;
            // po drodze je, co znajdzie; dopiero gdy nie ma nic, zawraca do swoich
            if (c.hunger > (REMAKE && liczRole(sim).robotnik > 0 ? LUD.glodSam : P.glodSzukaJedzenia))
            {
                var jedzenie = REMAKE ? null : sim.findFood(c.x, c.y, P.zasiegJedzenia, RACES[c.race].swims, t => edible(c.race, t));
                if (jedzenie != null) { c.job = Job.EAT; c.jx = jedzenie.Value.x; c.jy = jedzenie.Value.y; c.jt = 90; return; }
                // Remake v2: bez dostawy wraca jeść do wiadra, a gdy żadnego nie ma — do siedziby
                if (c.hunger > P.glodWraca)
                {
                    var wd = REMAKE ? najblizszaSpizarnia(sim, c.x, c.y, true) : null;
                    c.job = Job.WANDER; c.jt = 0; c.jx = wd != null ? wd.x : sim.clans[c.clan].hx; c.jy = wd != null ? wd.y : sim.clans[c.clan].hy;
                    return;
                }
            }
            var wPrzedsionku = Math.Abs(c.x - w.coreX) < P.przedsionekX && Math.Abs(c.y - w.przedsionekY) < P.przedsionekY;
            // Remake v1: drogi jeszcze nie ma — wraca czekać przy obozie (planer)
            if (REMAKE && sim.tick % 120 == c.id % 120 && ((!wPrzedsionku && drogaNiegotowa(sim, c)) || falaZwykla(sim))) { c.wyprawa = true; c.jt = 0; return; }
            // 6.11: stalowa brama lochu zamknięta — pielgrzym, który doszedł na przedproże, czeka pod nią
            if (!wPrzedsionku && REMAKE && w.brama.x1 >= w.brama.x0 && !w.wLochu(c.x, c.y) && w.wPrzedprozu(Math.Floor(c.x), Math.Floor(c.y)) && !bramaOtwarta(sim))
            {
                c.droga = null;
                c.zamiar = "czeka pod stalową bramą lochu — podniosą ją pobożni zaklęciami przy kotle";
                c.zamiarDo = sim.tick + 120;
                return;
            }
            if (!wPrzedsionku)
            {
                var plan = sim.planDrogi;
                if (plan != null && plan.klan == c.clan && idzPlanem(sim, c, plan.sciezka)) return;
                // Remake v1: daleko od kreski — prawdziwą drogą do niej albo do przedsionka
                if (REMAKE)
                {
                    if (c.droga == null && budzetDrog() > 2)
                    {
                        var naKresce = plan != null ? new HashSet<double>(plan.sciezka) : null;
                        var d = szukajDrogi(sim, c, (i, x, y) => (naKresce != null && naKresce.Contains(i) && !w.solid(x, y))
                            || (Math.Abs(x - w.coreX) < P.przedsionekX && Math.Abs(y - w.przedsionekY) < P.przedsionekY), LUD.dostawaLimit);
                        if (d != null) { c.droga = d; c.drogaI = 0; c.drogaKopie = false; }
                        // Alpha: spadł z kreski do dołka, z którego nie wyjdzie — wykuwa stopnie z powrotem na nią
                        else if (naKresce != null && (sim.tick + c.id) % 30 == 0 && budzetDrog() > 1)
                        {
                            double jx = c.jx, jy = c.jy;
                            wkopDroga(sim, c, (x, y) => naKresce.Contains(w.idx(x, y)) && !w.solid(x, y) && stoi(sim, x, y), P.ratunekKopania);
                            c.jx = jx; c.jy = jy;
                        }
                    }
                    if (c.droga != null && c.drogaKopie == true)
                    {
                        var k = c.droga[c.droga.Count - 1];
                        idz(sim, c, k % w.w, JS.ToInt32(k / w.w), false);
                        return;
                    }
                    if (c.droga != null)
                    {
                        var n = nastepnyKafel(sim, c);
                        if (n >= 0) { krok(sim, c, n); return; }
                        c.droga = null;
                    }
                }
                // (Alpha: pobożny nie kuje — na przełaj tylko tam, gdzie da się przejść)
                walkTo(sim, c, c.jx, c.jy, !REMAKE);
                return;
            }
            // Dopiero na miejscu widać, czy skorupa już puściła
            if (sim.rytual.otwarta && !falaTrwa(sim) && (sim.clans[c.clan].devotion > RYTUAL.uwolnienieNacja || c.devotion > RYTUAL.uwolnienieWlasne)
                && sim.tick % P.sprawdzOtwarcieCo == c.id % P.sprawdzOtwarcieCo && wyslijDoRdzenia(sim, c, RYTUAL.zejsciePielgrzymaTikow)) return;
            // warta pod skorupą trwa, aż kamień puści — limit wyprawy liczy się tylko w drodze
            c.jt = Math.Max(c.jt, P.wyprawaTikow);
            // Remake v1: na swoje miejsce w szeregu — bokiem, bez kopania; jak się nie da, modli się, gdzie stoi
            if (Math.Abs(c.x - (c.jx + 0.5)) > 1.2 && (c.wspina ?? -9) < sim.tick - 30)
            {
                var przed = c.x;
                walkTo(sim, c, c.jx, Math.Floor(c.y), false);
                if (Math.Abs(c.x - przed) < 0.001) c.jx = Math.Floor(c.x);   // nie ma przejścia — zostaje tu
            }
            c.devotion = Math.Min(1, c.devotion + P.modlitwaOddanie);
            if (!REMAKE) c.hunger = Math.Max(0, c.hunger - P.modlitwaKarmi);
            sim.wiara += P.modlitwaWiara * sim.incomeMult() * (maZabytek(sim, "ksiega") ? ZABYTKI.skutki.ksiega.wiara : 1);
            if (sim.tick % P.mysliCo == 0 && sim.rng.chance(P.mysliSzansa)) sim.efekt(c.x, c.y - 0.4, "mysl");
        }

        /// <summary>Czy spod rdzenia da się wrócić do gniazda (wynik trzymany w klanie na pół minuty).</summary>
        static bool powrotSpodRdzenia(Sim sim, Creature c, Clan clan)
        {
            if (clan.powrotT != null && sim.tick - clan.powrotT < P.powrotPamiecTikow) return clan.powrotOk == true;
            if (budzetDrog() < 2) return false;
            var w = sim.world;
            // pozorny wędrowiec z przedsionka: ta sama rasa, więc ta sama fizyka wspinania i pływania
            var zPrzedsionka = c.Kopia();
            zPrzedsionka.x = w.coreX + 0.5; zPrzedsionka.y = w.przedsionekY + 0.5;
            var droga = szukajDrogi(sim, zPrzedsionka, (_i, x, y) => Math.Abs(x - clan.hx) <= 3 && Math.Abs(y - clan.hy) <= 3, P.powrotLimitDrogi);
            clan.powrotT = sim.tick;
            clan.powrotOk = droga != null;
            return clan.powrotOk == true;
        }

        /// <summary>Wysyła wiernego do rdzenia — drogą, jeśli ją widać, a jeśli nie, na przełaj z kilofem.</summary>
        public static bool wyslijDoRdzenia(Sim sim, Creature c, double jt)
        {
            var w = sim.world;
            c.job = Job.DIG; c.jx = w.coreX; c.jy = w.coreY; c.jt = jt; c.dig = 0;
            var droga = szukajDrogi(sim, c, (_i, x, y) => (sim.rytual.otwarta && wKomorze(sim, x, y)) || (Math.Abs(x - w.coreX) <= 3 && Math.Abs(y - w.coreY) <= 3
                && (w.get(x, y + 1) == T.CORE || w.get(x - 1, y) == T.CORE || w.get(x + 1, y) == T.CORE || w.get(x, y - 1) == T.CORE)), RYTUAL.zejscieLimitDrogi);
            c.droga = droga; c.drogaI = 0; c.drogaKopie = false;
            return true;
        }

        static void doPray(Sim sim, Creature c)
        {
            var w = sim.world;
            var t = w.get(c.jx, c.jy);
            if (t != T.SHRINE && t != T.FORGE && t != T.GLYPH && t != T.CORE) { c.jt = 0; return; }
            if (Math.Abs(c.jx - Math.Floor(c.x)) <= K.modlitwaBlisko && Math.Abs(c.jy - Math.Floor(c.y)) <= K.modlitwaBlisko)
            {
                sim.pray(c, t);
                c.devotion = Math.Min(1, c.devotion + K.modlitwaOddanie);
            }
            else idz(sim, c, c.jx, c.jy);
        }

        /// <summary>6.11: robotnik idzie do budowy schodów drogi wiernych (murarz albo kołowrót).</summary>
        static bool budujSchody(Sim sim, Creature c, NaDrogeF naDroge, ZamiarF zamiar, DrogaF droga, PodrozF podroz, bool zKublem)
        {
            if (rolaPostaci(c) != "robotnik") return false;
            // wolny robotnik idzie do schodów tylko wtedy, gdy przy obozie zostaje inny wolny — ten nosi jedzenie
            if (zKublem && !sim.creatures.Any(q => q != c && !q.dead && rolaPostaci(q) == "robotnik" && q.polecenie == null && q.job != Job.SCHODY)) return false;
            var zad = zadanieBudowy(sim, c, zKublem);
            if (zad == null) return false;
            var d = droga((x, y) => x == zad.x && y == zad.y, LUD.dostawaLimit);
            if (d == null) return false;
            naDroge(d, zad.x, zad.y);
            c.budowa = new BudowaPostaci { odcinek = zad.odcinek, rola = zad.rola, ktory = zad.ktory };
            var opis = zad.rola == "murarz" ? "buduje schody drogi wiernych — osadza kamienne stopnie"
                : etapOdcinka(sim, zad.odcinek) == "budowa" ? "kręci kołowrotem — opuszcza stopnie do budowy schodów"
                : "kręci kołowrotem — wyciąga kubłem urobek z szybu";
            zamiar(opis, Job.SCHODY, podroz(d) + BUDOWA_SCHODOW.zmiana);
            return true;
        }

        /// <summary>6.11: przy budowie schodów — idzie na posterunek i tam pracuje (postęp liczy tikBudowySchodow).</summary>
        static void doSchody(Sim sim, Creature c)
        {
            var b = c.budowa;
            var p = posterunek(sim, c);
            var etap = b != null ? etapOdcinka(sim, b.odcinek) : "gotowe";
            if (b == null || p == null || etap == "gotowe" || (b.rola == "murarz" && etap != "budowa"))
            {
                c.budowa = null; c.czynnosc = null; c.jt = 0;
                return;
            }
            // wolny robotnik (bez rozkazu): jedzenie ma pierwszeństwo
            if (c.polecenie == null && sim.tick % 120 == c.id % 120
                && (glodnyDoNakarmienia(sim, c) != null || !sim.creatures.Any(q => q != c && !q.dead && rolaPostaci(q) == "robotnik" && q.polecenie == null && q.job != Job.SCHODY)))
            {
                c.czynnosc = null; c.jt = 0; c.budowa = null; c.bezczynnyOd = null;
                return;
            }
            if (naPosterunkuBudowy(sim, c))
            {
                c.czynnosc = b.rola == "murarz" ? "buduje" : "kreci";
                c.droga = null; c.jx = p.x; c.jy = p.y;
                c.face = b.rola == "kolowrot" ? -1 : (c.x < sim.world.odcinkiDrogi[(int)b.odcinek].x0 + 2.5 ? 1 : -1);
                // na schodach i drabinie trzyma się (nie spada); na posadzce po prostu stoi
                if (!stoi(sim, Math.Floor(c.x), Math.Floor(c.y))) { c.vy = 0; c.wspina = sim.tick; }
                return;
            }
            c.czynnosc = null;
            if (c.jx != p.x || c.jy != p.y)
            {
                // schody urosły — posterunek murarza przesunął się w górę: droga od nowa
                c.jx = p.x; c.jy = p.y; c.droga = null;
                var d = szukajDrogi(sim, c, (_i, x, y) => x == p.x && y == p.y, LUD.dostawaLimit);
                if (d != null) { c.droga = d; c.drogaI = 0; c.drogaKopie = false; }
            }
            if (c.droga != null) { var n = nastepnyKafel(sim, c); if (n >= 0) { krok(sim, c, n); return; } c.droga = null; }
            idz(sim, c, p.x, p.y, false);
        }

        static void doBuild(Sim sim, Creature c)
        {
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 1 || Math.Abs(c.jy - Math.Floor(c.y)) > 1)
            {
                if (sim.world.get(c.jx, c.jy) != T.AIR) { c.jt = 0; return; }
                idz(sim, c, c.jx, c.jy);
                return;
            }
            if (!sim.buildStep(c)) c.jt = 0;
        }

        static void doFight(Sim sim, Creature c)
        {
            var foe = sim.creatureById(sim.target.getOr(c.id, -1));
            if (foe == null || foe.dead) { sim.target.delete(c.id); c.jt = 0; return; }
            // Remake v1: swój na swojego nie idzie
            if (REMAKE && rolaPostaci(c) != null && rolaPostaci(foe) != null) { sim.target.delete(c.id); c.jt = 0; return; }
            // etap 3: ze Strażnikiem Snu walczy się w rytmie ciosów, nie co tik
            if (foe.straznik == true)
            {
                void podejdz(double x, double y)
                {
                    if (!ludRuch(c) || JS.Hypot(x + 0.5 - c.x, y + 0.5 - c.y) <= K.walkaDrogaOd) { walkTo(sim, c, x, y); return; }
                    var w = sim.world; var plan = sim.planDrogi;
                    var wPrzedsionku = Math.Abs(c.x - w.coreX) < P.przedsionekX && Math.Abs(c.y - w.przedsionekY) < P.przedsionekY;
                    if (foe.boss != null && plan != null && plan.sciezka.Count > 0 && !wPrzedsionku)
                    {
                        if (idzPlanem(sim, c, plan.sciezka)) return;
                        // daleko od ścieżki — najpierw do jej końca w sali (krótka droga), potem nią w dół
                        var kon = plan.sciezka[plan.sciezka.Count - 1];
                        idz(sim, c, kon % w.w, JS.ToInt32(kon / w.w), false);
                        return;
                    }
                    if (foe.boss != null) { walkTo(sim, c, x, y); return; }
                    idz(sim, c, x, y, rolaPostaci(c) == "robotnik");
                }
                // ostatnia deska: pobożny razi Strażników (i bossa) księgą z dystansu
                if (foe.straznik == true && rolaPostaci(c) == "pobozny" && trybWiernych(sim))
                {
                    walczKsiega(sim, c, foe, podejdz);
                    return;
                }
                walczZeStraznikiem(sim, c, foe, podejdz);
                return;
            }
            var dist = JS.Hypot(foe.x - c.x, foe.y - c.y);
            if (dist < K.walkaZasieg)
            {
                var dmg = RACES[c.race].strength * mnoznik(sim, c, "sila") * cechaNacji(sim.clans[c.clan]).sila * (K.walkaMin + sim.rng.next() * K.walkaRozrzut) * (1 + c.mad);
                foe.hp -= dmg * ranyZbroi(foe);
                foe.fear = Math.Min(1, foe.fear + K.walkaStrach);
                sim.spark(foe.x, foe.y, "hit");
                if (foe.hp <= 0)
                {
                    // pierwsza krew: dotąd żadna z nacji nie miała do drugiej urazy — to początek wojny
                    var pierwsza = c.clan != foe.clan && !JS.Tak(sim.clans[c.clan].grudge.getOr(foe.clan, 0)) && !JS.Tak(sim.klan(foe.clan)?.grudge.getOr(c.clan, 0) ?? 0);
                    sim.kill(foe, $"z ręki {sim.clans[c.clan].name}", "walka");
                    if (RACES[c.race].eatsMeat) c.hunger = Math.Max(0, c.hunger - K.zjadaOfiare);
                    sim.feud(c.clan, foe.clan);
                    if (pierwsza) zglosWojne(sim, c.clan, foe.clan, foe.x, foe.y);
                    sim.wojnaBudzi(c.clan, foe.clan);
                }
            }
            else if (dist > K.walkaGubi) { sim.target.delete(c.id); c.jt = 0; }
            else walkTo(sim, c, foe.x, foe.y);
        }

        static void doFlee(Sim sim, Creature c)
        {
            if (REMAKE && c.droga != null) { if (idz(sim, c, c.jx, c.jy, false)) c.jt = 0; return; }
            walkTo(sim, c, c.jx, c.jy, false);
        }

        static void doBreed(Sim sim, Creature c)
        {
            var clan = sim.clans[c.clan];
            var far = JS.Hypot(clan.hx - c.x, clan.hy - c.y);
            if (far > K.rozrodDaleko) { sim.birth(c); c.hunger = Math.Min(1, c.hunger + K.rozrodGlodPoWDrodze); c.jt = 0; return; }
            if (far > K.rozrodDoGniazda) { idz(sim, c, clan.hx, clan.hy); return; }
            sim.birth(c);
            c.hunger = Math.Min(1, c.hunger + K.rozrodGlodPo);
            c.jt = 0;
        }

        static void doHaul(Sim sim, Creature c)
        {
            var clan = sim.clans[c.clan];
            if (REMAKE && rolaPostaci(c) != null)
            {
                if (Math.Abs(c.jx - Math.Floor(c.x)) <= 2 && Math.Abs(c.jy - Math.Floor(c.y)) <= 2)
                {
                    var sp = spizarniaW(sim, c.jx, c.jy) ?? najblizszaSpizarnia(sim, c.x, c.y, false);
                    if (sp != null) { sp.odloz(c.carry); c.carry = 0; }
                    c.jt = 0;
                }
                else idz(sim, c, c.jx, c.jy);
                return;
            }
            if (JS.Hypot(clan.hx - c.x, clan.hy - c.y) < K.oddajeLupOd)
            {
                clan.stock += c.carry; c.carry = 0; c.jt = 0;
            }
            else idz(sim, c, clan.hx, clan.hy);
        }

        /// <summary>Prządki nie podbijają — przejmują. Niewolnik zmienia klan, nie rasę.</summary>
        static void doSlave(Sim sim, Creature c)
        {
            var foe = sim.creatureById(sim.target.getOr(c.id, -1));
            if (foe == null || foe.dead) { c.jt = 0; return; }
            var dist = JS.Hypot(foe.x - c.x, foe.y - c.y);
            if (dist < K.jarzmoZasieg)
            {
                foe.hp -= K.jarzmoCios;
                foe.fear = 1;
                if (foe.hp < RACES[foe.race].maxHp * K.jarzmoProg) sim.enslave(foe, c.clan);
                c.jt = 0;
            }
            else walkTo(sim, c, foe.x, foe.y);
        }

        static void doSacrifice(Sim sim, Creature c)
        {
            if (Math.Abs(c.jx - Math.Floor(c.x)) > 2 || Math.Abs(c.jy - Math.Floor(c.y)) > 2) { idz(sim, c, c.jx, c.jy); return; }
            sim.sacrifice(c);
            c.jt = 0;
        }

        /// <summary>Sen w skale: nie rusza się, nie je, budzi go dopiero czyjś krok.</summary>
        static void doSleep(Sim sim, Creature c)
        {
            c.hunger = Math.Max(K.snuGlodMin, c.hunger - K.snuGlodNaTik);
            c.hp = Math.Min(RACES[c.race].maxHp, c.hp + K.snuLeczy);
            if (!sim.rozejm && (c.id + sim.tick) % K.snuCzujneCo == 0)
            {
                var prey = sim.nearestCreature(c.x, c.y, K.snuCzujneZasieg, o => o.id != c.id && o.race != Race.TROLL);
                if (prey != null) { c.job = Job.FIGHT; sim.target.set(c.id, prey.id); c.jt = K.snuAtakTikow; c.hunger = Math.Min(1, c.hunger); }
            }
        }

        /// <summary>Powrót do ognia: żużel jest dla nich jedzeniem, a kuźnia domem.</summary>
        static void doHeat(Sim sim, Creature c)
        {
            var clan = sim.clans[c.clan];
            if (c.carry > 0 && JS.Hypot(clan.hx - c.x, clan.hy - c.y) < K.cieploOddajeLup) { clan.stock += c.carry; c.carry = 0; }
            var d = JS.Hypot(c.jx + 0.5 - c.x, c.jy + 0.5 - c.y);
            if (d < K.cieploBlisko || (c.droga == null && sim.goraco(Math.Floor(c.x), Math.Floor(c.y))))
            {
                c.hunger = Math.Max(0, c.hunger - K.cieploJe);
                if (c.hunger < K.cieploSyty) c.jt = 0;
            }
            else idz(sim, c, c.jx, c.jy);
        }

        /// <summary>Prządka żywi się tym, co wzięła.</summary>
        static void doDrain(Sim sim, Creature c)
        {
            var victim = sim.creatureById(sim.target.getOr(c.id, -1));
            if (victim == null || victim.dead || victim.clan != c.clan) { c.jt = 0; return; }
            if (JS.Hypot(victim.x - c.x, victim.y - c.y) < K.wysysanieZasieg)
            {
                victim.hp -= K.wysysanieCios;
                victim.fear = 1;
                c.hunger = Math.Max(0, c.hunger - K.wysysanieKarmi);
                if (sim.rng.chance(0.04)) sim.spark(victim.x, victim.y, "hit");
                if (victim.hp <= 0) sim.kill(victim, "wyssany przez Prządki", "jarzmo");
                if (c.hunger < K.wysysanieSyta) c.jt = 0;
            }
            else walkTo(sim, c, victim.x, victim.y);
        }
    }
}
