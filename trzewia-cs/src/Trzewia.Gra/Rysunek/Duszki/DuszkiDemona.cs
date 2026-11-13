// Demon (boss z Wielkiego Pomnika) — duszki zamiast kukły z alpha-1/src/render/demon-boss.ts. Pamięć rysunku bossa
// (wygładzona prędkość, faza kroku i oddechu, postawa do walki, chwila trafienia) jest przeniesiona z demon-boss.ts
// (pamiecBossa, aktualizuj); z niej i ze stanu gry wynika, którą animację i klatkę pokazać — w tej kolejności, w jakiej
// klatkaBossa nakładała ruchy: ruch walki z symulacji > rozkaz dla dłoni > trafienie > bicie w pierś za ścianą gruzu >
// modlitwa wiernych > lot > chód > postawa do walki > spoczynek. Klatki: narzedzia/duszki/demon.ts.
// Czego klatki nie mają (świadome uproszczenia): pęknięć i garbienia się rannego demona, drżenia w szale, płynnego
// mieszania stanów (kukła mieszała je wagami), ręki sięgającej dokładnie do celu na innej wysokości.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBoss;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Nastawy.NastawyPomnik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek.Duszki
{
    public static class DuszkiDemona
    {
        /// <summary>Odległości celu (kafle), dla których upieczono bicz z łańcucha — nazwy animacji „biczLancucha-28” itd.</summary>
        static readonly double[] ODLEGLOSCI_BICZA = { 2.8, 4.0, 5.2 };

        /// <summary>Pamięć rysunku bossa (render/demon-boss.ts: Pamiec) — to, co potrzebne do wyboru klatki.</summary>
        sealed class Pamiec
        {
            public Sim sim = null!;
            public double czas, tik, tikCzas, msNaTik = 1000.0 / 120;
            public double hp, x, y, vx, vy;
            public double krok, idzie, leci, walka, modl, szal, oddech;
            public double trafiony = -1e9, silaTrafienia;
            public double tF;
        }
        static readonly Dictionary<double, Pamiec> pamiec = new Dictionary<double, Pamiec>();
        static readonly Random los = new Random(20261113);

        static Pamiec pamiecBossa(Sim sim, Creature c, double czas)
        {
            if (!pamiec.TryGetValue(c.id, out var p) || !ReferenceEquals(p.sim, sim))
            {
                if (pamiec.Count > 32) pamiec.Clear();
                p = new Pamiec { sim = sim, czas = czas, tik = sim.tick, tikCzas = czas, hp = c.hp, x = c.x, y = c.y, oddech = los.NextDouble(), tF = sim.tick };
                pamiec[c.id] = p;
            }
            return p;
        }

        static double obetnij(double v, double a, double b) => v < a ? a : v > b ? b : v;
        static double mix(double a, double b, double t) => a + (b - a) * t;

        /// <summary>Krok pamięci (raz na klatkę): czas, ruch, zdarzenia gry. Zwraca tik z ułamkiem.</summary>
        static double aktualizuj(Pamiec p, Sim sim, Creature c, double czas)
        {
            var dt = obetnij((czas - p.czas) / 1000, 0, 0.1);
            p.czas = czas;
            var dtik = sim.tick - p.tik;
            if (dtik != 0)
            {
                if (dtik > 0 && dtik < 60)
                {
                    p.msNaTik = obetnij(mix(p.msNaTik, (czas - p.tikCzas) / dtik, 0.25), 1, 120);
                    double dx = c.x - p.x, dy = c.y - p.y;
                    if (JS.Hypot(dx, dy) < 3)
                    {
                        p.vx = mix(p.vx, dx / dtik, 0.35); p.vy = mix(p.vy, dy / dtik, 0.35);
                        p.krok += Math.Abs(dx) / 3.0;
                    }
                }
                p.tik = sim.tick; p.tikCzas = czas; p.x = c.x; p.y = c.y;
            }
            else if (czas - p.tikCzas > 300) { p.vx *= 0.9; p.vy *= 0.9; }
            var tF = sim.tick + obetnij((czas - p.tikCzas) / p.msNaTik, 0, 1);
            double zbliz(double v0, double cel0, double tau) => v0 + (cel0 - v0) * (1 - Math.Exp(-dt / tau));
            var v = JS.Hypot(p.vx, p.vy);
            var wSkale = sim.world.solid(Math.Floor(c.x), Math.Floor(c.y));
            p.idzie = zbliz(p.idzie, v > 0.003 && Math.Abs(p.vx) >= Math.Abs(p.vy) * 0.8 ? 1 : 0, 0.18);
            p.leci = zbliz(p.leci, (v > 0.003 && Math.Abs(p.vy) > Math.Abs(p.vx) * 0.8) || wSkale ? 1 : 0, 0.3);
            var hpMax = c.hpMax ?? DEMON.hp;
            var modli = sim.rytual.wierni >= SNIACY_KAMIEN.modlitwaWiernych;
            p.modl = zbliz(p.modl, modli ? 1 : 0, 0.5);
            p.szal = zbliz(p.szal, c.hp / hpMax < 0.25 ? 1 : 0, 0.6);
            // oddech: szybszy u rannego i w szale (faza całkowana — zmiana tempa nie szarpie)
            p.oddech += dt * (0.3 + 0.28 * (1 - c.hp / hpMax) + 0.35 * p.szal);
            var cel = sim.creatureById(sim.target.TryGet(c.id, out var idCelu) ? idCelu : -1);
            p.walka = zbliz(p.walka, cel != null && !cel.dead && JS.Hypot(cel.x - c.x, cel.y - c.y) < 6 ? 1 : 0, 0.35);
            // trafienie: spadek życia (zrastanie dodaje po trochu w każdym tiku)
            if (c.hp < p.hp - 0.5) { p.trafiony = tF; p.silaTrafienia = obetnij((p.hp - c.hp) / 14, 0.35, 1); }
            p.hp = c.hp;
            p.tF = tF;
            return tF;
        }

        /// <summary>Długość fazy rozkazu dla dłoni (render/demon-boss.ts: dlugoscFazy — DLON.demon[akcja][faza], brak: 60).</summary>
        static double dlugoscFazy(string akcja, string faza)
        {
            var D = DLON.demon;
            double? v = akcja switch
            {
                "rzut" => faza switch { "wstaje" => D.rzut.wstaje, "chwyta" => D.rzut.chwyta, "unosi" => D.rzut.unosi, "rzuca" => D.rzut.rzuca, "cofa" => D.rzut.cofa, _ => (double?)null },
                "tarcza" => faza switch { "wstaje" => D.tarcza.wstaje, "stoi" => D.tarcza.stoi, "cofa" => D.tarcza.cofa, _ => (double?)null },
                "zawal" => faza switch { "wstaje" => D.zawal.wstaje, "drze" => D.zawal.drze, "wali" => D.zawal.wali, "cofa" => D.zawal.cofa, _ => (double?)null },
                _ => null,
            };
            return Math.Max(1, v ?? 60);
        }

        /// <summary>Klatka arkusza demona dla tej chwili.</summary>
        static int klatka(Duszek d, Pamiec p, Sim sim, Creature c, double tF, double czas)
        {
            AnimacjaDuszka? A(string n) => d.Animacja(n);
            int Petla(string n, double u) => (A(n) ?? A("spoczynek"))?.Klatka(u) ?? 0;

            // ruch walki z symulacji (cios, obszar, dystans, uderzenie w ziemię, blok, zachwianie)
            var R = c.ruch != null && sim.tick - c.ruch.od < c.ruch.dl ? c.ruch : null;
            if (R != null && !R.id.StartsWith("rozkaz", StringComparison.Ordinal))
            {
                var tau = tF - R.od;
                if (R.id == "blok")
                {
                    // wejście (14 tików), trzymanie, zejście (ostatnie 16 tików) — długość bloku zależy od ciosu rycerza
                    if (tau < 14 && A("blok-wejscie") is { } we) return we.Klatka(tau / 14);
                    if (tau < R.dl - 16 && A("blok-trzyma") is { } tr) return tr.Klatka(0);
                    if (A("blok-zejscie") is { } ze) return ze.Klatka((tau - (R.dl - 16)) / 16);
                }
                else if (R.id == "zachwianie")
                {
                    if (A(R.wariant == 2 ? "zachwianie-klek" : "zachwianie") is { } za) return za.Klatka(tau / R.dl);
                }
                else if (R.id == "biczLancucha")
                {
                    // bicz upieczono dla kilku odległości celu — najbliższa
                    var cel = sim.creatureById(R.cel);
                    var odl = cel != null ? Math.Abs(cel.x - c.x) : 4;
                    double naj = ODLEGLOSCI_BICZA[0];
                    foreach (var o in ODLEGLOSCI_BICZA) if (Math.Abs(o - odl) < Math.Abs(naj - odl)) naj = o;
                    if (A("biczLancucha-" + (int)Math.Round(naj * 10)) is { } bi) return bi.Klatka(tau / R.dl);
                }
                else if (A(R.id) is { } ruch) return ruch.Klatka(tau / R.dl);
            }
            // rozkaz dla dłoni z otchłani: gest wg akcji i fazy
            var st = sim.lud.dlonDemona;
            if (st?.akcja != null)
            {
                var u = obetnij((sim.tick - st.od) / dlugoscFazy(st.akcja, st.faza), 0, 1);
                if (A("rozkaz-" + st.akcja + "-" + st.faza) is { } ro) return ro.petla ? ro.KlatkaZegara(czas, 0) : ro.Klatka(u);
            }
            // oberwanie: wstrząs, odrzucona głowa, biały błysk (60 tików)
            var th = tF - p.trafiony;
            if (th >= 0 && th < 60 && A("trafiony") is { } traf) return traf.Klatka(th / 60);
            // za ścianą gruzu: wali się w pierś
            if (DlonDemona.scianaGruzu(sim) != null && A("piers") is { } piers) return piers.KlatkaZegara(czas, 0);
            if (p.modl > 0.5) return Petla("modlitwa", p.oddech);
            if (p.leci > 0.5 && A("lot") is { } lot) return lot.KlatkaZegara(czas, 0);
            if (p.idzie * (1 - p.leci) > 0.5) return Petla("chod", p.krok);
            return Petla(p.walka > 0.5 ? "walka" : "spoczynek", p.oddech);
        }

        /// <summary>
        /// Żywy demon na mapie — wołane z RysStraznicy.rysujStraznika, stopami w (0, 0), zwrot już ustawiony.
        /// Po ostatnim uderzeniu kona: złote światło rozsadza go od środka, pada na kolana i rozsypuje się w popiół.
        /// `h` — wysokość demona w jednostkach rysunku (sylwetka Strażnika × rozmiar × 0,6).
        /// </summary>
        public static void rysujDemonaBossa(IPlotno ctx, Sim sim, Creature c, double h, double czas)
        {
            var d = Duszek.Daj("demon");
            if (d == null || d.klatek == 0) { DuszkiLudu.Zastepczo(ctx, c, h); return; }
            // arkusz liczy wielkość jak rysunek Strażnika: h0 = h / (rozmiar · 0,6)
            var h0 = h / (Boss.aktywnyBoss().rozmiar * 0.6);
            var s = sim.lud.pomnik;
            if (s != null && s.faza == "kona")
            {
                if (d.Animacja("kona") is { } kona) d.Rysuj(ctx, kona.Klatka(Math.Min(1, (sim.tick - s.od) / POMNIK.konanie)), h0);
                return;
            }
            var p = pamiecBossa(sim, c, czas);
            var tF = czas != p.czas ? aktualizuj(p, sim, c, czas) : p.tik + obetnij((czas - p.tikCzas) / p.msNaTik, 0, 1);
            var k = klatka(d, p, sim, c, tF, czas);
            // w litej skale demon przenika ją — półprzejrzysty. Kukła rysowała z kryciem 0,62 każdą część osobno, więc tam,
            // gdzie części na siebie zachodzą, wychodziło gęściej; cała klatka naraz dostaje krycie pośrednie
            var wSkale = sim.world.solid(Math.Floor(c.x), Math.Floor(c.y));
            var alfa = ctx.globalAlpha;
            if (wSkale) ctx.globalAlpha = alfa * 0.75;
            d.Rysuj(ctx, k, h0);
            ctx.globalAlpha = alfa;
        }

        /// <summary>
        /// Demon wstaje z gruzu (`k` 0…1) stopami w (0, 0): spod gruzu bije czerwony żar, przebijają się ręce, kamień pęka
        /// i ożywa, aureola bucha ogniem — i ryk. Woła rysunek pomnika w fazie „wychodzi” (render/pomnik.ts: wstajacyDemon).
        /// </summary>
        public static void rysujWstajacego(IPlotno ctx, double h, double k)
        {
            var d = Duszek.Daj("demon");
            if (d?.Animacja("wstaje") is { } a) d.Rysuj(ctx, a.Klatka(k), h / (Boss.aktywnyBoss().rozmiar * 0.6));
        }

        /// <summary>Wysokość żywego demona — ta sama co bossa na mapie (render/pomnik.ts: wysokoscDemona).</summary>
        public static double wysokoscDemona(double z) =>
            Math.Max(16, Races.RACES[Race.TROLL].size * z * 1.9 * Rdzen.SettingsStore.ustawienia.wielkoscSylwetek) * Boss.aktywnyBoss().rozmiar * 0.6;
    }
}
