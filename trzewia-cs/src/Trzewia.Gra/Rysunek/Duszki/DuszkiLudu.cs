// Duszki ludu (robotnik, pobożny, rycerz) — zastępują rysunek kodem z alpha-1/src/render/postacie.ts: rysujLud.
// Wybór animacji i klatki to te same reguły, którymi render/lud/ruch.ts (animuj) i render/lud/walka-rycerza.ts
// (stanWalki) wybierały pozę; klatki upiekła piekarnia (narzedzia/duszki/lud.ts) z rysunku gry TS.
// Czego duszki nie mają (świadome uproszczenia — PLAN.md 9.5): płynnego mieszania póz przy zmianie czynności, lądowania
// po upadku, wzdrygnięcia przy trafieniu, mrugania, drżenia ze strachu i szaleństwa, chwiania zatrutego, żarzenia się
// w szale krwi (jest czerwona aura) i iskier przy trafieniach w walce.
using System;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Nastawy;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWalka;
using static Trzewia.Nastawy.NastawyZbroja;

namespace Trzewia.Rysunek.Duszki
{
    public static class DuszkiLudu
    {
        /// <summary>Kolejność, w której kuźnia kuje zbroję (nastawy/pomieszczenia.ts: kuznia.czesci) — stan zbroi k to pierwszych k części.</summary>
        static readonly string[] CZESCI_ZBROI = { "helm", "naramienniki", "napiersnik", "nakolanniki", "tarcza" };

        /// <summary>Gdzie wypadła głowa w ostatnim rysunku: środek i promień jako części wysokości postaci, od środka stóp (twarzą w prawo).</summary>
        static readonly ConditionalWeakTable<Creature, float[]> glowy = new ConditionalWeakTable<Creature, float[]>();

        /// <summary>Głowa postaci z ostatniego rysunku (np. aureola nad nią — także klęczącego i leżącego); brak — nie rysowano.</summary>
        public static (double x, double y, double r)? glowaPostaci(Creature c) =>
            glowy.TryGetValue(c, out var g) ? (g[0], g[1], g[2]) : ((double, double, double)?)null;

        // ── kucanie (render/postacie.ts: przykucniecie) ────────────────────────────────────────────────────────
        sealed class Kuc { public double k, t; }
        static readonly ConditionalWeakTable<Creature, Kuc> kucanie = new ConditionalWeakTable<Creature, Kuc>();
        /// <summary>Tyle ms trwa przejście do przysiadu i z powrotem (stała wygładzania).</summary>
        const double KUCANIE_MS = 170;

        /// <summary>
        /// Jak mocno postać kuca: stoi na ziemi, a nad głową lita skała już w następnym kaflu. Wartość dochodzi do celu
        /// płynnie; duszek przechodzi w przysiad, gdy minie połowę.
        /// </summary>
        static double przykucniecie(Sim sim, Creature c, double czas)
        {
            var w = sim.world;
            double x = Math.Floor(c.x), y = Math.Floor(c.y);
            var naZiemi = c.vy <= 0.3 && c.lot == null && w.solid(x, y + 1);
            double cel = naZiemi && w.solid(x, y - 1) ? 1 : 0;
            if (!kucanie.TryGetValue(c, out var s)) { s = new Kuc { k = cel, t = czas }; kucanie.Add(c, s); return s.k; }
            var dt = Math.Max(0, Math.Min(250, czas - s.t));
            s.t = czas;
            s.k += (cel - s.k) * Math.Min(1, dt / KUCANIE_MS);
            if (Math.Abs(cel - s.k) < 0.002) s.k = cel;
            return s.k;
        }

        // ── walka rycerza (render/lud/walka-rycerza.ts: stanWalki) ─────────────────────────────────────────────
        public sealed class StanWalki { public string id = ""; public double u, t, dl; }

        /// <summary>Który ruch walki rycerza pokazać teraz (null — nie walczy).</summary>
        public static StanWalki? stanWalki(Sim sim, Creature c, string cz, double czas)
        {
            var tF = ZegarGry.tikZUlamkiem(sim, czas);
            var R = c.ruch;
            if (R != null && Typ_RUCHY_RYCERZA.klucze.Contains(R.id) && tF - R.od < R.dl + 0.5 && tF >= R.od)
            {
                var t = Math.Max(0, tF - R.od);
                return new StanWalki { id = R.id, u = Math.Max(0, Math.Min(1, t / R.dl)), t = t, dl = R.dl };
            }
            // lekkie trafienie
            var d = c.drgniecie;
            var dlLekko = RUCHY_RYCERZA.trafionyLekko.dl;
            if (d != null && tF - d.t < dlLekko) return new StanWalki { id = "trafionyLekko", u = (tF - d.t) / dlLekko, t = tF - d.t, dl = dlLekko };
            if (c.job != Job.FIGHT) return null;
            var cel = sim.creatureById(sim.target.TryGet(c.id, out var idCelu) ? idCelu : -1);
            if (cel == null || cel.dead || cel.straznik != true) return null;
            var dist = Trzewia.Js.Js.Hypot(cel.x - c.x, cel.y - c.y);
            if (dist > 9) return null;
            if (cz == "idzie" || cz == "biegnie") return dist < 7 ? new StanWalki { id = "podejscie" } : null;
            if (cz == "walczy" || cz == "stoi") return new StanWalki { id = "garda" };
            return null;
        }

        // ── który arkusz ───────────────────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Arkusz postaci. Wygląd w TS wynika z numeru postaci (render/lud/stroj.ts) — upieczone są numery drużyny
        /// (pobożni 1, 2; robotnicy 3, 4, 5; rycerz 6) i dwa wzory robotnika dla przybyszów od anioła (7, 8). Inne numery
        /// dostają wzór najbliższy z upieczonych (świadome uproszczenie).
        /// </summary>
        public static string nazwaDuszka(Creature c, string rola)
        {
            // kuźnia kuje części w stałej kolejności, więc rycerz ma zawsze pierwszych k części
            int k = 0;
            if (rola == "rycerz") while (k < CZESCI_ZBROI.Length && Zbroja.nosi(c, CZESCI_ZBROI[k])) k++;
            return nazwaDuszka(rola, c.id, c.helm == true, k);
        }

        /// <summary>Arkusz dla roli, numeru postaci, hełmu robotnika i stanu zbroi rycerza (ile części z kuźni nosi).</summary>
        public static string nazwaDuszka(string rola, double numer, bool helm, int zbroja)
        {
            int id = (int)numer;
            switch (rola)
            {
                case "robotnik":
                    {
                        int wz = id == 3 || id == 4 || id == 5 ? id : (id % 2 != 0 ? 7 : 8);
                        return helm ? "robotnik-" + wz + "-helm" : "robotnik-" + wz;
                    }
                case "pobozny":
                    return "pobozny-" + (id == 1 || id == 2 ? id : (id % 2 != 0 ? 1 : 2));
                default:
                    return "rycerz-6-z" + zbroja;
            }
        }

        // ── która klatka ───────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Klatka arkusza dla postaci w tej chwili — reguły z render/lud/ruch.ts: animuj.</summary>
        public static int klatka(Duszek d, Sim sim, Creature c, string rola, double czas, string cz, double faza, double fazaPion, double zegar)
        {
            double id = c.id;
            bool niesie = rola == "robotnik" && c.carry > 0;
            // animacja o tej nazwie; robotnik z workiem bierze wariant „-niesie”, gdy taki jest
            AnimacjaDuszka? A(string n) => (niesie ? d.Animacja(n + "-niesie") : null) ?? d.Animacja(n);
            int Spoczynek() => (A("stoi") ?? d.animacje.Values.First()).KlatkaZegara(czas, id);

            // Alpha 1 (6.11): rycerz w walce — ruchy z symulacji zamiast zwykłej czynności
            if (rola == "rycerz")
            {
                var st = stanWalki(sim, c, cz, czas);
                if (st != null)
                {
                    if (st.id == "powalony")
                    {
                        // upadek (22 tiki), leży (do końca ogłuszenia), wstaje (ostatnie 64 tiki)
                        var lezyDo = st.dl - 64;
                        if (st.t < 22 && d.Animacja("powalony-pada") is { } pada) return pada.Klatka(st.t / 22);
                        if (st.t < lezyDo && d.Animacja("powalony-lezy") is { } lezy) return lezy.KlatkaZegara(czas, id);
                        if (d.Animacja("powalony-wstaje") is { } wstaje) return wstaje.Klatka((st.t - lezyDo) / 64);
                    }
                    else if (st.id == "garda" || st.id == "podejscie")
                    {
                        if (d.Animacja(st.id) is { } g) return g.KlatkaZegara(czas, id);
                    }
                    else if (d.Animacja(st.id) is { } ruch) return ruch.Klatka(st.u);
                    // ruchu nie ma w tym arkuszu (część zbroi, której ten stan nie nosi) — garda
                    if (d.Animacja("garda") is { } garda) return garda.KlatkaZegara(czas, id);
                }
            }
            bool wisi = cz == "wspina" || cz == "spada" || cz == "skleja";
            // niski korytarz: kuca (nie dotyczy wspinaczki, zwisu i leżenia) — pamięć przysiadu idzie co klatkę
            var kuc = cz == "spi" ? 0 : przykucniecie(sim, c, czas) * (wisi ? 0 : 1);
            // 6.11: pod nisko zawieszoną kratą bramy lochu — czołga się na czworakach
            if (Brama.czolgaSie(sim, c) && A("czolga") is { } czolga) return czolga.Klatka(faza);
            if (kuc > 0.5)
            {
                if (cz == "stoi" && A("kuca-stoi") is { } ks) return ks.KlatkaZegara(czas, id);
                if (cz == "idzie" && A("kuca-idzie") is { } ki) return ki.Klatka(faza);
            }
            switch (cz)
            {
                case "stoi":
                    {
                        // drobny gest co ~9 s (robotnik z workiem trzyma rzemień — bez gestu)
                        var f = frac(czas * 0.00011 + id * 0.43);
                        if (f > 0.9 && !niesie && d.Animacja("stoi-gest") is { } gest) return gest.Klatka((f - 0.9) / 0.1);
                        return Spoczynek();
                    }
                case "idzie":
                    {
                        var sch = Lud.Rozstep.chodNaSchodach(c);
                        if (sch != null && sch.Value.kier != 0 && A(sch.Value.kier < 0 ? "schody-gora" : "schody-dol") is { } schody) return schody.Klatka(faza);
                        return A("idzie")?.Klatka(faza) ?? Spoczynek();
                    }
                case "biegnie": return A("biegnie")?.Klatka(faza) ?? Spoczynek();
                case "wspina": return A("wspina")?.Klatka(fazaPion) ?? Spoczynek();
                case "spada": return A("spada")?.KlatkaZegara(czas, id) ?? Spoczynek();
                case "kopie": return A("kopie")?.KlatkaZegara(zegar, id) ?? Spoczynek();
                case "buduje": return A("buduje")?.KlatkaZegara(zegar, id) ?? Spoczynek();
                case "walczy":
                    {
                        if (rola == "rycerz")
                        {
                            // bez ruchu walki z symulacji: na przemian cięcie i pchnięcie (z = zegar · 1,25 + id · 0,31)
                            var z = zegar * 1.25 + id * 0.31;
                            var a = d.Animacja(Math.Floor(z) % 2 == 0 ? "walczy-ciecie" : "walczy-pchniecie");
                            return a?.Klatka(z) ?? Spoczynek();
                        }
                        return A("walczy")?.KlatkaZegara(zegar, id) ?? Spoczynek();
                    }
                case "modli":
                    {
                        // wzniesienie rąk (orant) w cyklu 6,25 s: pobożny 0,68…0,98, robotnik 0,80…0,96; rycerz klęczy z mieczem
                        var cykl = frac(czas * 0.00016 + id * 0.37);
                        double od = rola == "pobozny" ? 0.68 : 0.8, dl = rola == "pobozny" ? 0.30 : 0.16;
                        if (rola != "rycerz" && cykl >= od && cykl < od + dl && d.Animacja("modli-wznosi") is { } wznosi) return wznosi.Klatka((cykl - od) / dl);
                        return A("modli")?.KlatkaZegara(czas, id) ?? Spoczynek();
                    }
                case "je": return A("je")?.KlatkaZegara(czas, id) ?? Spoczynek();
                case "spi": return A("spi")?.Klatka(0) ?? Spoczynek();
                case "czyta":
                    {
                        // błysk po uniesieniu księgi gaśnie przez 60 tików, potem czyta
                        var blysk = c.ksiegaT != null ? Math.Max(0, Math.Min(1, 1 - (sim.tick - c.ksiegaT.Value) / 60)) : 0;
                        if (blysk > 0 && d.Animacja("czyta") is { } unosi) return unosi.Klatka(1 - blysk);
                        return A("czyta-trwa")?.KlatkaZegara(czas, id) ?? Spoczynek();
                    }
                case "odmawia": return A("odmawia")?.Klatka(Lud.Odmowy.postepOdmowy(sim, c, czas) ?? 0) ?? Spoczynek();
                case "zaklada": return A("zaklada")?.Klatka(Math.Max(0, Math.Min(1, (c.zakladanie ?? 0) / ZBROJA.zakladanieTikow))) ?? Spoczynek();
                case "skleja": return A("skleja")?.KlatkaZegara(czas, id) ?? Spoczynek();
                case "kreci": return A("kreci")?.KlatkaZegara(czas, id) ?? Spoczynek();
                default: return Spoczynek();
            }
        }

        static double frac(double x) => x - Math.Floor(x);

        /// <summary>
        /// Postać ludu stopami w (0, 0), twarzą w prawo; `h` — wysokość postaci w jednostkach rysunku (jak w rysujLud z TS).
        /// </summary>
        public static void rysujLud(IPlotno ctx, Sim sim, Creature c, string rola, double h, double czas, string cz, double faza, double fazaPion, double zegar)
        {
            var d = Duszek.Daj(nazwaDuszka(c, rola));
            if (d == null || d.klatek == 0) { Zastepczo(ctx, c, h); return; }
            int k = klatka(d, sim, c, rola, czas, cz, faza, fazaPion, zegar);
            if (k < d.glowa.Length && d.glowa[k] is { } gl && gl.Length >= 3) { glowy.Remove(c); glowy.Add(c, gl); }
            // cudze światło z otoczenia kładzie ciepłą krawędź po swojej stronie sylwetki (render/lud/oswietlenie.ts)
            d.Rysuj(ctx, k, h, true, Lud.Oswietlenie.swiatloOtoczenia());
        }

        /// <summary>Gdy arkusza nie ma w dane/grafika/duszki: kropka w barwie rasy — widać, że postać jest, i że brakuje pliku.</summary>
        public static void Zastepczo(IPlotno ctx, Creature c, double h)
        {
            var k = Races.RACES[c.race].color;
            ctx.fillStyle = Barwa.Rgba(k[0], k[1], k[2], 1);
            ctx.beginPath();
            ctx.arc(0, -h * 0.5, Math.Max(1.5, h * 0.25), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
