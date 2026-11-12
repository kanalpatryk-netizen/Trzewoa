// Port: alpha-1/src/sim/karty-ludu.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyKartyLudu;
using static Trzewia.Nastawy.NastawySwiat;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Straznicy;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>
    /// Talia kart ludu (Remake v1, etap 4) — zgniłe jedzenie w wiadrze, woda w obozie, zawał nad drogą wiernych.
    /// </summary>
    public static class KartyLudu
    {
        static Typ_KARTY_LUDU K => KARTY_LUDU;

        static Wybor wybor(string id, string tekst, string skutek, double krew = 0, double wiara = 0) => new Wybor { id = id, tekst = tekst, skutek = skutek, krew = krew, wiara = wiara };
        static bool stac(Sim sim, Wybor w) => sim.krew - sim.rezerwa.krew >= w.krew && sim.wiara - sim.rezerwa.wiara >= w.wiara;

        /// <summary>Karty ludu, które mogą teraz przyjść (dokładane do puli kart z wydarzenia.ts).</summary>
        public static List<KandydatKarty> kandydaciLudu(Sim sim, StanWydarzen st)
        {
            var @out = new List<KandydatKarty>();
            var w = sim.world;
            var lud = klanLudu(sim);
            if (lud == null) return @out;
            var surowe = st.ile >= 2;

            // --- zgniłe jedzenie w wiadrze
            var sp = JS.Sort(wszystkieSpizarnie(sim).Where(s => s.ilosc >= 4).ToList(), (a, b) => b.ilosc - a.ilosc).FirstOrDefault();
            if (surowe && sp != null) @out.Add(new KandydatKarty { rodzaj = "plony", waga = 2, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("spal", "Oczyść je wiarą", "Zgnilizna zniknie — nikt się nie struje.", 0, K.plonySpal),
                    wybor("wyrzuc", "Wylejcie połowę", "Połowa porcji z wiadra pójdzie w przepaść — reszta jest czysta."),
                    wybor("jedz", "Niech jedzą", $"Kilku z ludu się struje: przez minutę będą słabsi (−{JS.S(JS.Round((1 - K.zatrucie) * 100))}%). Ktoś może nie przeżyć."),
                };
                return new Wydarzenie { rodzaj = "plony", tytul = "Zgniłe jedzenie w wiadrze", tekst = "Jedzenie w wiadrze zzieleniało od spodu. Kto je zje, ten się struje.", wybory = wybory, domyslny = 2, rozsadny = stac(sim, wybory[0]) ? 0 : 1, cel = new CelKarty { x = sp.x + 0.5, y = sp.y + 0.5, tekst = "wiadro" }, od = sim.tick, x = sp.x, klan = sp.y };
            } });

            // --- woda w obozie
            var oboz = sim.lud.spizarnie.Count > 0 ? sim.lud.spizarnie[0] : null;
            XY? gdzie = oboz != null ? new XY(oboz.x, oboz.y) : new XY(lud.hx, lud.hy);
            // Remake v1: w górze nie ma wody — karta „woda nad obozem” nie przychodzi
            if (surowe && gdzie != null && SWIAT.plyny) @out.Add(new KandydatKarty { rodzaj = "zalanie", waga = 1.8, zbuduj = () =>
            {
                var wybory = new List<Wybor>
                {
                    wybor("zatkaj", "Zatkaj ją krwią", "Krew zastygnie w szczelinie. Woda zostanie w skale.", K.zalanieZatkaj),
                    wybor("odwroc", "Odwróć wodę", "Woda spłynie gdzie indziej — w pustą skałę z dala od ludu.", 0, K.zalanieOdwroc),
                    wybor("plyn", "Niech płynie", "Zaleje obóz: kto nie ucieknie, może utonąć, a zapasy trzeba będzie przenieść."),
                };
                return new Wydarzenie { rodzaj = "zalanie", tytul = "Woda nad obozem", tekst = "Nad obozem kapie coraz mocniej. Za chwilę strop puści i woda wleje się do środka.", wybory = wybory, domyslny = 2, rozsadny = stac(sim, wybory[1]) ? 1 : stac(sim, wybory[0]) ? 0 : 2, cel = new CelKarty { x = gdzie.x + 0.5, y = gdzie.y + 0.5, tekst = "obóz" }, od = sim.tick, x = gdzie.x, klan = gdzie.y };
            } });

            // --- zawał nad drogą wiernych
            var plan = sim.planDrogi;
            if (surowe && plan != null && !sim.rytual.otwarta && plan.sciezka.Count > 20 && !falaTrwa(sim)) @out.Add(new KandydatKarty { rodzaj = "zawal", waga = 1.5, zbuduj = () =>
            {
                var i = plan.sciezka[(int)Math.Floor(plan.sciezka.Count * (0.3 + sim.rng.next() * 0.4))];
                double x = i % w.w, y = JS.ToInt32(i / w.w);
                var wybory = new List<Wybor>
                {
                    wybor("podeprzyj", "Podeprzyj strop", "Droga wiernych zostanie cała.", 0, K.zawalPodeprzyj),
                    wybor("niech", "Niech się wali", $"Kawałek drogi ({JS.S(K.zawalKafli)} kafli) znów będzie skałą — robotnicy muszą go odkopać, pobożni poczekają."),
                };
                return new Wydarzenie { rodzaj = "zawal", tytul = "Strop nad drogą wiernych pęka", tekst = "Skała nad wykopaną drogą do krypty trzeszczy i sypie się piaskiem.", wybory = wybory, domyslny = 1, rozsadny = stac(sim, wybory[0]) ? 0 : 1, cel = new CelKarty { x = x + 0.5, y = y + 0.5, tekst = "tu się sypie" }, od = sim.tick, x = i };
            } });

            return @out;
        }

        /// <summary>Skutek wyboru na karcie ludu. Zwraca false, gdy to nie jest karta ludu.</summary>
        public static bool wykonajLudu(Sim sim, Wydarzenie e, string id)
        {
            var w = sim.world;
            switch ($"{e.rodzaj}:{id}")
            {
                case "plony:spal":
                    sim.efekt((e.x ?? 0) + 0.5, (e.klan ?? 0) + 0.5, "cud");
                    return true;
                case "plony:wyrzuc":
                {
                    var s = wszystkieSpizarnie(sim).FirstOrDefault(o => o.x == e.x && o.y == e.klan);
                    if (s != null) s.wez(Math.Floor(s.ilosc * K.plonyZapasy));
                    return true;
                }
                case "plony:jedz":
                {
                    var lud = sim.creatures.Where(c => !c.dead && rolaPostaci(c) != null).ToList();
                    for (var k = 0; k < K.plonyZatrutych && lud.Count > 0; k++)
                    {
                        var idx = sim.rng.@int(lud.Count);
                        var c = lud[idx]; lud.RemoveAt(idx);
                        c.zatrutyDo = sim.tick + K.zatrucieTikow;
                        if (k == 0 && sim.rng.chance(0.35)) sim.kill(c, "otruty zgniłym jedzeniem", "trucizna");
                    }
                    return true;
                }
                case "zalanie:zatkaj": return true;
                case "zalanie:odwroc":
                {
                    var punkty = wszystkieSpizarnie(sim).Select(o => o.x).ToList();
                    double best = -1, bd = -1;
                    for (var k = 0; k < 24; k++)
                    {
                        double x = 6 + sim.rng.@int(w.w - 12);
                        var d = punkty.Count > 0 ? punkty.Select(p => Math.Abs(p - x)).Min() : 999;
                        if (d > bd) { bd = d; best = x; }
                    }
                    sim.flood(best >= 0 ? best : (double?)null);
                    return true;
                }
                case "zalanie:plyn":
                {
                    double x0 = e.x ?? 0, y0 = e.klan ?? 0;
                    for (var y = y0 - 7; y <= y0 - 2; y++) for (var x = x0 - 4; x <= x0 + 4; x++)
                    {
                        if (w.inb(x, y) && PASSABLE[w.tile[w.idx(x, y)]] == 1) w.water[w.idx(x, y)] = K.zalanieWoda;
                    }
                    sim.log("Strop puścił — woda wlała się do obozu.", "swiat");
                    return true;
                }
                case "zawal:podeprzyj": return true;
                case "zawal:niech":
                {
                    var plan = sim.planDrogi;
                    if (plan == null) return true;
                    var start = plan.sciezka.IndexOf(e.x ?? -1);
                    var zajete = new HashSet<double>(sim.creatures.Where(c => !c.dead).Select(c => w.idx(Math.Floor(c.x), Math.Floor(c.y))));
                    for (var k = 0; k < K.zawalKafli && start >= 0 && start + k < plan.sciezka.Count; k++)
                    {
                        var i = plan.sciezka[start + k];
                        double sy = JS.ToInt32(i / w.w);
                        var o = w.odcinekDrogi(i % w.w, sy);
                        var rzad = new List<double>();
                        if (o != null) for (var n = 0; n < o.x1 - o.x0 + 1; n++) rzad.Add(w.idx(o.x0 + n, sy)); else rzad.Add(i);
                        foreach (var j in rzad) if (!zajete.Contains(j) && w.tile[j] != T.CORE && !w.wSali(j % w.w, sy) && !w.wBramie(j % w.w, sy)) w.set(j % w.w, sy, T.ROCK);
                    }
                    return true;
                }
            }
            return false;
        }

        /// <summary>Karty z łańcuchów ludu — Alpha: żadnych.</summary>
        public static Wydarzenie? zbudujLancuchLudu(Sim _sim, string _karta) => null;

        /// <summary>Karty ludu w kolejności — dla okienka dewelopera.</summary>
        public static string[] KARTY_LUDU_RODZAJE => SWIAT.plyny ? new[] { "plony", "zalanie", "zawal" } : new[] { "plony", "zawal" };
    }
}
