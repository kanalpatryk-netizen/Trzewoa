// Port: alpha-1/src/sim/pomieszczenia.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyPomieszczenia;
using static Trzewia.Symulacja.Tiles;
using static Trzewia.Symulacja.Droga;
using static Trzewia.Symulacja.Dziennik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public sealed class Pomieszczenie
    {
        public double id;
        /// <summary>'sypialnia' | 'warsztat' | 'kuznia' | 'korytarz' | 'szyb' | 'lina'</summary>
        public string rodzaj = "sypialnia";
        /// <summary>Prostokąt opisujący (lewy górny róg i wymiary).</summary>
        public double x, y, w, h;
        /// <summary>Kafle wnętrza (indeksy) — to trzeba wykuć.</summary>
        public List<double> kafle = new List<double>();
        /// <summary>Szyb: w którą stronę schodzi (−1 w lewo, 1 w prawo).</summary>
        public double? kier;
        public double od;
        /// <summary>Ile kafli było do wykucia przy położeniu planu.</summary>
        public double? doKucia;
        public bool gotowe;
        public double? gotoweOd;
        /// <summary>Warsztat i kuźnia: postęp bieżącej sztuki 0..1 i czy surowiec na nią już poszedł.</summary>
        public double? postep;
        public bool? zaplacone;
        /// <summary>Warsztat i kuźnia: czego brakuje do pracy (podpis na mapie).</summary>
        public string? brak;
    }

    /// <summary>Zdarzenie dla rysunku (nie idzie do zapisu): 'gotowe' | 'krzyz' | 'czesc' | 'wypoczety' | 'zbroja' | 'lina'.</summary>
    public sealed class ZdarzeniePom
    {
        public string rodzaj = "";
        public double tik;
        public double? pom;
        public double? x, y, ile, kto, y0, y1;
        public string? czesc;
        public bool? gracz;
    }

    /// <summary>Wynik sprawdzenia planu: kafle do wykucia albo powód, dla którego tu nie wolno.</summary>
    public sealed class ProbaPlanu
    {
        public bool ok;
        public string? powod;
        public string rodzaj = "";
        public double x, y, w, h;
        public List<double> kafle = new List<double>();
        public double? kier;
        public ProbaPlanu Kopia() => (ProbaPlanu)MemberwiseClone();
    }

    public sealed class KotwicaLiny { public double x, y; public string rodzaj = ""; public double strona; }

    /// <summary>
    /// POMIESZCZENIA (Alpha, etap 3c) — plany do wykucia i to, co dzieje się w gotowych (patrz pomieszczenia.ts).
    /// </summary>
    public static class Pomieszczenia
    {
        static Typ_POMIESZCZENIA P => POMIESZCZENIA;

        public static bool czyPokoj(string r) => r == "sypialnia" || r == "warsztat" || r == "kuznia";

        public static (double w, double h) szablon(string r) => r switch
        {
            "sypialnia" => (P.szablony.sypialnia.w, P.szablony.sypialnia.h),
            "warsztat" => (P.szablony.warsztat.w, P.szablony.warsztat.h),
            "kuznia" => (P.szablony.kuznia.w, P.szablony.kuznia.h),
            _ => (double.NaN, double.NaN),
        };

        /// <summary>Pomieszczenie (albo plan) pod kaflem (x, y) — albo null.</summary>
        public static Pomieszczenie? pomieszczenieW(Sim sim, double x, double y)
        {
            var i = sim.world.idx(x, y);
            foreach (var p in sim.pomieszczenia)
            {
                if (czyPokoj(p.rodzaj) ? x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h : p.kafle.Contains(i)) return p;
            }
            return null;
        }

        public static Pomieszczenie? pomieszczenieId(Sim sim, double? id) =>
            id == null ? null : sim.pomieszczenia.FirstOrDefault(p => p.id == id);

        /// <summary>Plan pod kursorem (patrz TS).</summary>
        public static ProbaPlanu probaPlanu(Sim sim, string rodzaj, double x, double y, double? x2a = null, double? y2a = null)
        {
            double x2 = x2a ?? x, y2 = y2a ?? y;
            var w = sim.world;
            ProbaPlanu zle(ProbaPlanu pp, string powod) { var k = pp.Kopia(); k.ok = false; k.powod = powod; return k; }
            ProbaPlanu p;
            if (czyPokoj(rodzaj))
            {
                var s = szablon(rodzaj);
                double x0 = x - Math.Floor((s.w - 1) / 2), y0 = y - s.h + 1;
                var kafle = new List<double>();
                for (var yy = y0; yy < y0 + s.h; yy++) for (var xx = x0; xx < x0 + s.w; xx++) if (w.inb(xx, yy)) kafle.Add(w.idx(xx, yy));
                p = new ProbaPlanu { ok = true, rodzaj = rodzaj, x = x0, y = y0, w = s.w, h = s.h, kafle = kafle };
                if (kafle.Count < s.w * s.h) return zle(p, "za blisko brzegu góry");
            }
            else if (rodzaj == "lina")
            {
                var yt = Math.Min(y, y2);
                for (var k = 0; k < 3 && w.inb(x, yt) && !w.passable(x, yt); k++) yt++;
                if (!w.inb(x, yt) || !w.passable(x, yt)) return zle(new ProbaPlanu { ok = false, rodzaj = rodzaj, x = x, y = yt, w = 1, h = 1, kafle = new List<double>() }, "lina nie przejdzie przez skałę");
                var ys = yt;
                while (w.inb(x, ys + 1) && w.passable(x, ys + 1)) ys++;
                var kafle = new List<double>();
                for (var yy = yt; yy < ys; yy++) kafle.Add(w.idx(x, yy));
                var kot = kotwicaLiny(w, x, yt);
                p = new ProbaPlanu { ok = true, rodzaj = rodzaj, x = x, y = yt, w = 1, h = ys - yt + 1, kafle = kafle, kier = kot != null && JS.Tak(kot.strona) ? kot.strona : (double?)null };
                if (kot == null) return zle(p, "lina nie ma się czego uczepić — u góry musi być skała");
                if (kafle.Count == 0) return zle(p, "tu stoi się na podłodze — lina nie ma gdzie zwisać");
                if (kafle.All(i => w.lina[i] == 1)) return zle(p, "tu już wisi lina");
                var cena = cenaLiny(sim);
                if (cena > 0 && sim.krew - sim.rezerwa.krew < cena) return zle(p, $"nie starczy krwi — lina kosztuje {JS.S(cena)}");
                return p;
            }
            else
            {
                if (!w.passable(x, y) || !stoi(sim, x, y))
                {
                    return zle(new ProbaPlanu { ok = false, rodzaj = rodzaj, x = x, y = y, w = 1, h = 1, kafle = new List<double>() }, rodzaj == "korytarz" ? "korytarz zaczyna się tam, gdzie lud stoi" : "szyb zaczyna się tam, gdzie lud stoi");
                }
                double k = x2 >= x ? 1 : -1;
                var kafle = new List<double>();
                if (rodzaj == "korytarz")
                {
                    var n = Math.Max(1, Math.Min(P.korytarzMaks, Math.Abs(x2 - x)));
                    for (double i = 1; i <= n; i++) for (double dy = 0; dy < P.korytarzWys; dy++) if (w.inb(x + i * k, y - dy)) kafle.Add(w.idx(x + i * k, y - dy));
                    var xa = k > 0 ? x + 1 : x - n;
                    p = new ProbaPlanu { ok = true, rodzaj = rodzaj, x = xa, y = y - P.korytarzWys + 1, w = n, h = P.korytarzWys, kafle = kafle, kier = k };
                    for (double i = 1; i <= n; i++) if (!w.solid(x + i * k, y + 1)) return zle(p, "podłoga musi być płaska i lita");
                }
                else
                {
                    var n = Math.Max(1, Math.Min(P.szybMaks, y2 - y));
                    for (double i = 1; i <= n; i++) foreach (var dy in new double[] { 0, -1 }) if (w.inb(x + i * k, y + i + dy)) kafle.Add(w.idx(x + i * k, y + i + dy));
                    var xa = k > 0 ? x + 1 : x - n;
                    p = new ProbaPlanu { ok = true, rodzaj = rodzaj, x = xa, y = y, w = n, h = n + 1, kafle = kafle, kier = k };
                    for (double i = 1; i <= n; i++) if (!w.solid(x + i * k, y + i + 1)) return zle(p, "pod schodami musi być lita skała");
                }
            }
            foreach (var i in p.kafle)
            {
                double xx = i % w.w, yy = JS.ToInt32(i / w.w);
                if (w.solid(xx, yy) && w.hardness(xx, yy) <= 0) return zle(p, "tej skały nie da się ruszyć");
            }
            // nic w szybie drogi wiernych ani pod jej linią
            if (p.kafle.Any(i => w.wSzybie(i % w.w, JS.ToInt32(i / w.w)))) return zle(p, "na drodze wiernych");
            var sciezka = sim.planDrogi != null ? new HashSet<double>(sim.planDrogi.sciezka) : null;
            if (sciezka != null && p.kafle.Any(i => sciezka.Contains(i - w.w))) return zle(p, "pod drogą wiernych");
            var zajete = new HashSet<double>();
            foreach (var q in sim.pomieszczenia) foreach (var i in q.kafle) zajete.Add(i);
            if (p.kafle.Any(i => zajete.Contains(i))) return zle(p, "tu już jest plan");
            if (sim.pomieszczenia.Count >= P.maks) return zle(p, $"najwyżej {JS.S(P.maks)} planów naraz");
            return p;
        }

        /// <summary>Gdzie lina jest uczepiona skały (krawędź półki obok, strop, ściana) — null: wisiałaby w powietrzu.</summary>
        public static KotwicaLiny? kotwicaLiny(World w, double x, double yGora)
        {
            foreach (var s in new double[] { 1, -1 }) if (w.solid(x + s, yGora + 1) && w.passable(x + s, yGora)) return new KotwicaLiny { x = x + (s > 0 ? 1 : 0), y = yGora + 1, rodzaj = "krawedz", strona = s };
            if (w.solid(x, yGora - 1)) return new KotwicaLiny { x = x + 0.5, y = yGora, rodzaj = "strop", strona = 0 };
            foreach (var s in new double[] { 1, -1 }) if (w.solid(x + s, yGora)) return new KotwicaLiny { x = x + (s > 0 ? 1 : 0), y = yGora + 0.2, rodzaj = "sciana", strona = s };
            return null;
        }

        /// <summary>Ile krwi kosztuje teraz lina: pierwsze `linyDarmowe` za darmo, każda następna `linaKrew`.</summary>
        public static double cenaLiny(Sim sim) => (sim.lud.liny ?? 0) < P.linyDarmowe ? 0 : P.linaKrew;

        /// <summary>Ile darmowych lin jeszcze zostało.</summary>
        public static double darmoweLiny(Sim sim) => Math.Max(0, P.linyDarmowe - (sim.lud.liny ?? 0));

        /// <summary>Wiesza linę z próby (gracz puścił przeciąganie). Zwraca powód odmowy albo null.</summary>
        public static string? powiesLine(Sim sim, ProbaPlanu p)
        {
            if (p.rodzaj != "lina") return "to nie lina";
            if (!p.ok) return p.powod ?? "tu nie wolno";
            var k = cenaLiny(sim);
            if (k > 0 && sim.krew - sim.rezerwa.krew < k) return $"nie starczy krwi — lina kosztuje {JS.S(k)}";
            sim.krew -= k;
            var w = sim.world;
            foreach (var i in p.kafle) w.lina[i] = 1;
            sim.lud.liny = (sim.lud.liny ?? 0) + 1;
            double y0 = p.y, y1 = p.y + p.h - 2;
            zdarzenie(sim, new ZdarzeniePom { rodzaj = "lina", x = p.x, y0 = y0, y1 = y1, tik = sim.tick, gracz = true });
            sim.gdzie(p.x + 0.5, y0 + 0.5).log(k > 0 ? $"Powiesiłeś linę za {JS.S(k)} krwi — można nią wejść i zejść." : $"Powiesiłeś linę (darmowych zostało: {JS.S(darmoweLiny(sim))}).", "swiat", "lina");
            zapisz(sim, "praca", $"gracz powiesił linę ({JS.S(p.x)}, {JS.S(y0)}–{JS.S(y1)}){(k > 0 ? $" za {JS.S(k)} krwi" : " za darmo")}", p.x, y0);
            return null;
        }

        /// <summary>Kładzie plan z udanej próby.</summary>
        public static Pomieszczenie polozPlan(Sim sim, ProbaPlanu p)
        {
            var pom = new Pomieszczenie { id = sim.nrPomieszczenia++, rodzaj = p.rodzaj, x = p.x, y = p.y, w = p.w, h = p.h, kafle = new List<double>(p.kafle), kier = p.kier, od = sim.tick, gotowe = false };
            pom.doKucia = zostaloKafli(sim, pom);
            sim.pomieszczenia.Add(pom);
            if (JS.Tak(pom.doKucia)) sim.gdzie(p.x + p.w / 2, p.y + p.h / 2).log($"Wyznaczyłeś {BIERNIK_POMIESZCZENIA[p.rodzaj]} — zaznacz robotników i wskaż im plan.", "swiat");
            pom.postep = 0;
            return pom;
        }

        /// <summary>Skreśla plan (jeszcze niewykuty).</summary>
        public static void skreslPlan(Sim sim, Pomieszczenie pom)
        {
            sim.pomieszczenia = sim.pomieszczenia.Where(p => p != pom).ToList();
            foreach (var c in sim.creatures) if (c.polecenie?.pom == pom.id) c.polecenie = null;
        }

        /// <summary>Ile kafli planu jeszcze stoi.</summary>
        public static double zostaloKafli(Sim sim, Pomieszczenie pom)
        {
            double n = 0;
            foreach (var i in pom.kafle) if (sim.world.solid(i % sim.world.w, JS.ToInt32(i / sim.world.w))) n++;
            return n;
        }

        /// <summary>Kafle planu do wykucia w kolejności: odsłonięte (obok pustka), najbliżej robotnika.</summary>
        public static List<(double x, double y)> kafleDoKucia(Sim sim, Creature c, Pomieszczenie pom, int ile = 6)
        {
            var w = sim.world;
            double cx = Math.Floor(c.x), cy = Math.Floor(c.y);
            var @out = new List<(double k, double x, double y)>();
            var wiadro = blokWiadra(sim);
            foreach (var odsloniete in new[] { true, false })
            {
                foreach (var i in pom.kafle)
                {
                    double x = i % w.w, y = JS.ToInt32(i / w.w);
                    if (!w.solid(x, y) || w.hardness(x, y) <= 0 || i == wiadro) continue;
                    if (odsloniete && !(w.passable(x - 1, y) || w.passable(x + 1, y) || w.passable(x, y - 1) || w.passable(x, y + 1))) continue;
                    @out.Add((Math.Abs(x - cx) + Math.Abs(y - cy) * 1.1, x, y));
                }
                if (@out.Count > 0) break;
            }
            JS.Sort(@out, (a, b) => a.k - b.k);
            return @out.Take(ile).Select(t => (t.x, t.y)).ToList();
        }

        /// <summary>Czy stojąc na (sx, sy), robotnik sięga kilofem kafla planu (tx, ty) — także kafel nad głową.</summary>
        public static bool siegaPlanu(double sx, double sy, double tx, double ty) =>
            Math.Abs(tx - sx) <= 1 && ty - sy >= -P.zasiegWGore && ty - sy <= 1;

        /// <summary>Dolny rząd wnętrza — tu się stoi.</summary>
        public static double podlogaPom(Pomieszczenie pom) => pom.y + pom.h - 1;

        static readonly (double, double)[] MIEJSCA_SYPIALNI = { (3, 1), (1, -1), (4, 1), (0, -1) };
        static readonly (double, double)[] MIEJSCA_PRACY = { (1, 1), (0, 1), (3, -1) };

        /// <summary>Miejsce w gotowym pomieszczeniu i w którą stronę patrzy (patrz TS). `n` — który z kolei.</summary>
        public static (double x, double y, double kier) miejsceWPom(Pomieszczenie pom, double n)
        {
            var y = podlogaPom(pom);
            var miejsca = pom.rodzaj == "sypialnia" ? MIEJSCA_SYPIALNI : MIEJSCA_PRACY;
            var (dx, k) = miejsca[(int)(n % miejsca.Length)];
            return (pom.x + Math.Min(pom.w - 1, dx), y, k);
        }

        /// <summary>Który z kolei jest `c` wśród tych, którzy mają rozkaz do tego pomieszczenia.</summary>
        public static double ktoryWPom(Sim sim, Pomieszczenie pom, Creature c)
        {
            double n = 0;
            foreach (var o in sim.creatures)
            {
                if (o == c) return n;
                if (!o.dead && o.polecenie?.pom == pom.id && (o.polecenie.typ == "praca" || o.polecenie.typ == "sen")) n++;
            }
            return n;
        }

        /// <summary>Następna część zbroi do wykucia (albo null — zbroja gotowa).</summary>
        public static Typ_POMIESZCZENIA_kuznia_czesci? nastepnaCzesc(Sim sim) => P.kuznia.czesci.FirstOrDefault(c => !sim.zbroja.Contains(c.id));

        public static void zdarzenie(Sim sim, ZdarzeniePom z)
        {
            var l = sim.zdarzeniaPom;
            while (l.Count > 0 && (l.Count >= 32 || sim.tick - l[0].tik > 900)) l.RemoveAt(0);
            l.Add(z);
        }

        /// <summary>Co tik: plany, które już wykuto, praca w warsztatach i kuźniach, sen w sypialniach.</summary>
        public static void tikPomieszczen(Sim sim)
        {
            if (sim.pomieszczenia.Count == 0) return;
            if (sim.tick % 30 == 0)
            {
                foreach (var pom in sim.pomieszczenia.ToList())
                {
                    if (pom.gotowe || zostaloKafli(sim, pom) > 0) continue;
                    pom.gotowe = true; pom.gotoweOd = sim.tick;
                    // pokój nad pustką: brakującą podłogę lud układa z gruzu
                    if (czyPokoj(pom.rodzaj))
                    {
                        var w = sim.world; var yp = pom.y + pom.h;
                        var zajete = new HashSet<double>(sim.creatures.Where(c => !c.dead).Select(c => w.idx(Math.Floor(c.x), Math.Floor(c.y))));
                        for (var xx = pom.x; xx < pom.x + pom.w; xx++)
                        {
                            if (!w.inb(xx, yp) || !w.passable(xx, yp) || zajete.Contains(w.idx(xx, yp))) continue;
                            w.set(xx, yp, T.ROCK);
                            sim.spark(xx + 0.5, yp + 0.3, "dust");
                        }
                    }
                    zdarzenie(sim, new ZdarzeniePom { rodzaj = "gotowe", pom = pom.id, tik = sim.tick });
                    sim.gdzie(pom.x + pom.w / 2, pom.y + pom.h / 2).log(pom.doKucia == 0 ? $"Urządziłeś {BIERNIK_POMIESZCZENIA[pom.rodzaj]}." : $"Robotnicy wykuli {BIERNIK_POMIESZCZENIA[pom.rodzaj]}.", "swiat");
                    foreach (var c in sim.creatures)
                    {
                        if (c.polecenie?.pom != pom.id || c.polecenie.typ != "kop") continue;
                        c.polecenie = null; c.czynnosc = null; c.jt = 0;
                        sim.efekt(c.x, c.y, "mysl", "wykute");
                    }
                    if (!czyPokoj(pom.rodzaj)) sim.pomieszczenia = sim.pomieszczenia.Where(p => p != pom).ToList();
                }
            }
            foreach (var pom in sim.pomieszczenia)
            {
                if (!pom.gotowe || (pom.rodzaj != "warsztat" && pom.rodzaj != "kuznia")) continue;
                var ilu = sim.creatures.Count(c => !c.dead && c.polecenie?.typ == "praca" && c.polecenie.pom == pom.id && c.czynnosc == "buduje");
                if (ilu == 0) continue;
                var (sx, sy, _) = miejsceWPom(pom, 0);
                if (pom.rodzaj == "warsztat")
                {
                    var W = P.warsztat;
                    if (pom.zaplacone != true)
                    {
                        if (sim.zloto < W.zlotoNaSztuke) { pom.brak = "brak złota"; continue; }
                        sim.zloto -= W.zlotoNaSztuke; pom.zaplacone = true; pom.postep = 0; pom.brak = null;
                    }
                    pom.postep = (pom.postep ?? 0) + (1 + 0.5 * (ilu - 1)) / W.tikowNaSztuke;
                    if (pom.postep >= 1)
                    {
                        pom.postep = 0; pom.zaplacone = false;
                        sim.wiara += W.wiaraZaSztuke;
                        sim.stat.dewocjonalia = sim.stat.dewocjonalia + 1;
                        zdarzenie(sim, new ZdarzeniePom { rodzaj = "krzyz", x = sx + 1.5, y = sy + 0.2, ile = W.wiaraZaSztuke, tik = sim.tick });
                        sim.gdzie(sx + 1, sy).log($"Warsztat: krzyż ze złota — +{JS.S(W.wiaraZaSztuke)} wiary.", "wiara", "warsztat",
                            n => $"Warsztat: {JS.S(n)} {(n < 5 ? "krzyże" : "krzyży")} ze złota — +{JS.S(n * W.wiaraZaSztuke)} wiary.");
                    }
                }
                else
                {
                    var cz = nastepnaCzesc(sim);
                    if (cz == null) { pom.brak = "zbroja gotowa"; continue; }
                    if (pom.zaplacone != true)
                    {
                        if (sim.zelazo < cz.zelazo) { pom.brak = $"brak żelaza ({cz.nazwa}: {JS.S(cz.zelazo)})"; continue; }
                        sim.zelazo -= cz.zelazo; pom.zaplacone = true; pom.postep = 0; pom.brak = null;
                    }
                    pom.postep = (pom.postep ?? 0) + (1 + 0.5 * (ilu - 1)) / cz.tikow;
                    if (pom.postep >= 1)
                    {
                        pom.postep = 0; pom.zaplacone = false;
                        sim.zbroja.Add(cz.id);
                        zdarzenie(sim, new ZdarzeniePom { rodzaj = "czesc", x = sx + 1.5, y = sy - 0.3, czesc = cz.id, tik = sim.tick });
                        sim.gdzie(sx + 1, sy).log($"Kuźnia wykuła {cz.nazwa} dla rycerza.", "swiat");
                    }
                }
            }
            // sen: kto śpi w sypialni dość długo, traci osłabienia i wstaje
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.czynnosc != "spi" || c.polecenie?.typ != "sen") continue;
                c.snu = (c.snu ?? 0) + 1;
                if (c.snu < P.sypialnia.snuTikow) continue;
                var mial = c.okaleczony == true || (c.zatrutyDo != null && sim.tick < c.zatrutyDo);
                c.okaleczony = false; c.zatrutyDo = null; c.snu = 0;
                c.polecenie = null; c.czynnosc = null; c.jt = 0;
                sim.efekt(c.x, c.y, "mysl", mial ? "wypoczęty — osłabienie minęło" : "wypoczęty");
                if (mial)
                {
                    zdarzenie(sim, new ZdarzeniePom { rodzaj = "wypoczety", kto = c.id, tik = sim.tick });
                    sim.gdzie(c.x, c.y).log($"{kto(sim, c)} wstaje z posłania wypoczęty — osłabienie minęło.", "swiat");
                }
            }
        }
    }
}
