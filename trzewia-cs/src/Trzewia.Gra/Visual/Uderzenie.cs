// Oprawa walki, etap 3 (docs/plan-oprawy-cerber.md): „uderzenie” — żeby każde trafienie i ścięcie było czuć bez dźwięku.
//
//  - Zdarzenia walki z różnicy stanu symulacji po każdym tiku (PoKroku): trafienie bossa (mocny cios — duża rana albo
//    zachwianie), ścięcie głowy, ostatni cios (konanie), lądowanie bossa (tupnięcie, cios z góry, szarża), przewrócenie
//    rycerza, rysy i pęknięcie pieczęci, śmierć postaci (krew), śmierć Cienia (pył).
//  - Zatrzymanie trafień: symulacja stoi przez kilkadziesiąt ms (mocny cios 60, ścięcie 140, ostatni cios 200), rysunek,
//    kamera, interfejs i cząsteczki idą dalej — ekran gry pyta Zatrzymane(teraz) i wtedy nie robi tików (czas gry nie
//    nadrabia tego potem: zatrzymanie to chwila wyjęta z gry, jak pauza).
//  - Wstrząs kamery „trauma” 0–1: siła = trauma², przesunięcie i obrót z gładkiego szumu, zanik ok. 1,5/s; całość ×
//    suwak „Siła wstrząsu” z ustawień (i nic przy „Ogranicz ruch”).
//  - Błysk trafienia: boss biały przez ok. 70 ms (RysCerber rysuje każdą część drugi raz, białą, z tym kryciem).
//  - Lot ściętej głowy (LotGlowy): w górę, grawitacja, obrót, jedno odbicie, kałuża rośnie w 400 ms — i ląduje tam,
//    gdzie symulacja kładzie głowę.
//  - Przewrócenie: odbicie po upadku i pył; wstawanie szybciej (ostatnie 220 ms ogłuszenia); gdy cel walki znika
//    (boss kona, świat stanął) — postać wraca do spoczynku po 0,3 s.
// Tylko obraz: symulacja o niczym tu nie wie (zatrzymanie trafień nie zmienia żadnej liczby gry — tylko kiedy rusza
// następny tik). Wszystko za flagą VisualConfig.Uderzenie i F9.
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWalka;
using U = Trzewia.Visual.VisualConfig.Uderzenia;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Visual
{
    public static class Uderzenie
    {
        /// <summary>Etap 3 włączony (flaga i F9).</summary>
        public static bool Aktywne => VisualConfig.Aktywne(VisualConfig.Uderzenie);

        // ───────────── zatrzymanie trafień ─────────────

        static double stopDo = double.NegativeInfinity;

        /// <summary>Czy symulacja ma teraz stać (zatrzymanie trafienia).</summary>
        public static bool Zatrzymane(double teraz)
        {
            // zegar cofnął się (nowa partia, przewijanie) — stare zatrzymanie nie należy do tego czasu
            if (stopDo - teraz > 2000) stopDo = double.NegativeInfinity;
            return Aktywne && teraz < stopDo;
        }

        static double nowyStop;
        static void zatrzymaj(double ms) { if (ms > nowyStop) nowyStop = ms; }

        // ───────────── wstrząs ─────────────

        static double trauma, traumaT = double.NaN;

        /// <summary>Dokłada wstrząsu (0–1).</summary>
        public static void Trauma(double t) { if (Aktywne) trauma = Math.Min(1, trauma + t); }

        /// <summary>Zanik traumy (ok. 1,5/s) — co klatkę gry (Klatka) i przy odczycie, zegarem ekranu.</summary>
        static void zanik(double teraz)
        {
            if (!double.IsNaN(traumaT) && teraz < traumaT) trauma = 0;
            if (!double.IsNaN(traumaT) && teraz > traumaT) trauma = Math.Max(0, trauma - U.WstrzasZanik * Math.Min(0.25, (teraz - traumaT) / 1000));
            traumaT = teraz;
        }

        /// <summary>Bieżąca trauma (pomiar, test).</summary>
        public static double Traumy => trauma;

        /// <summary>
        /// Przesunięcie (px płyty) i obrót (radiany) wstrząsu w tej chwili; fałsz — bez wstrząsu. Siła = trauma² × suwak.
        /// </summary>
        public static bool Wstrzas(double teraz, out double dx, out double dy, out double kat)
        {
            dx = dy = kat = 0;
            if (!Aktywne) { trauma = 0; return false; }
            zanik(teraz);
            var u = Rdzen.SettingsStore.ustawienia;
            var s = trauma * trauma * Math.Max(0, Math.Min(1, u.silaWstrzasu)) * (u.ograniczRuch ? 0 : 1);
            if (s < 1e-4) return false;
            // gładki szum: trzy sinusy o niewspółmiernych częstotliwościach na każdą oś
            var t = teraz / 1000 * U.WstrzasHz * Math.PI * 2;
            double n1 = 0.55 * Math.Sin(t * 1.0 + 0.3) + 0.3 * Math.Sin(t * 1.73 + 1.9) + 0.15 * Math.Sin(t * 2.61 + 4.1);
            double n2 = 0.55 * Math.Sin(t * 0.93 + 2.2) + 0.3 * Math.Sin(t * 1.57 + 0.4) + 0.15 * Math.Sin(t * 2.89 + 3.3);
            double n3 = 0.6 * Math.Sin(t * 0.71 + 5.1) + 0.4 * Math.Sin(t * 1.41 + 0.8);
            var px = U.WstrzasPx * Czytelnosc.SkalaUi;
            dx = px * s * n1; dy = px * s * n2; kat = U.WstrzasStopnie * Math.PI / 180 * s * n3;
            return true;
        }

        // ───────────── błysk bossa ─────────────

        static double blyskOd = double.NegativeInfinity;

        /// <summary>Krycie białego błysku bossa w tej chwili (0 — bez).</summary>
        public static double BlyskBossa(double teraz) =>
            Aktywne && teraz >= blyskOd ? U.BlyskAlfa * Math.Max(0, 1 - (teraz - blyskOd) / U.BlyskMs) * (Rdzen.SettingsStore.ustawienia.mniejBlyskow ? VisualConfig.Swiatla.MniejBlyskow : 1) : 0;

        // ───────────── zdarzenia ─────────────

        sealed class Stan
        {
            public double bossId = double.NaN, bossHp, bossChwiej = double.NaN, glow, stan, tik = -1;
            public string faza = "";
            public string? bossRuch; public double bossRuchOd;
            /// <summary>Ostatnio widziany ruch postaci ludu (id postaci → id ruchu i tik początku) i jej życie.</summary>
            public readonly Dictionary<double, (string? id, double od, double hp)> lud = new Dictionary<double, (string? id, double od, double hp)>();
            /// <summary>Przewróceni (id → tik upadku), czekający na pył i odbicie.</summary>
            public readonly Dictionary<double, double> przewroceni = new Dictionary<double, double>();
        }

        static readonly ConditionalWeakTable<Sim, Stan> stany = new ConditionalWeakTable<Sim, Stan>();
        static readonly ConditionalWeakTable<Efekt, object> widziane = new ConditionalWeakTable<Efekt, object>();
        static readonly object JEST = new object();
        static readonly double[] BIALY = { 255, 255, 255 };
        static readonly List<double> doUsuniecia = new List<double>();

        /// <summary>Ruchy bossa, które kończą się uderzeniem ciała o posadzkę (lądowanie).</summary>
        static bool ladowanie(string id) => id == "tupniecie" || id == "uderzenieWZiemie" || id == "zGory" || id == "szarza";

        static Creature? bossZ(Sim sim)
        {
            foreach (var c in sim.creatures) if (!c.dead && c.boss != null) return c;
            return null;
        }

        /// <summary>
        /// Po każdym tiku symulacji (ekran gry): zdarzenia walki → cząsteczki, wstrząs, błysk. Zwraca ms zatrzymania
        /// trafienia, które ma się zacząć teraz (0 — żadnego); wołający przestaje wtedy robić tiki w tej klatce.
        /// </summary>
        public static double PoKroku(Sim sim, double teraz)
        {
            if (!Aktywne) return 0;
            nowyStop = 0;
            var st = stany.GetValue(sim, _ => new Stan());
            var pierwszy = st.tik < 0 || sim.tick < st.tik;
            var boss = bossZ(sim);
            var p = sim.lud.pomnik;
            var faza = p?.faza ?? "stoi";
            var stan = p?.stan ?? 0;
            if (!pierwszy)
            {
                // ── boss ──
                if (boss != null && boss.id == st.bossId)
                {
                    var max = Math.Max(1, boss.hpMax ?? 1);
                    var rycerz = najblizszyRycerz(sim, boss);
                    var kier = rycerz != null ? Math.Sign(rycerz.x - boss.x) : (boss.face >= 0 ? 1 : -1);
                    if (kier == 0) kier = 1;
                    double hx = boss.x + kier * 0.9, hy = boss.y - 1.3;
                    var rana = (st.bossHp - boss.hp) / max;
                    var chwieje = (boss.chwiejT ?? double.NaN) != st.bossChwiej && boss.chwiejT != null;
                    if (rana > 1e-6)
                    {
                        blyskOd = teraz;
                        Czasteczki.Iskry(hx, hy, kier, 6 + (int)Math.Min(10, rana * 100));
                        Czasteczki.Krew(hx, hy, kier, 3 + (int)Math.Min(8, rana * 60), 0.8);
                        if (rana >= U.MocnyOd || chwieje) { zatrzymaj(U.StopMocny); Trauma(U.TraumaMocny); }
                    }
                    else if (chwieje) { zatrzymaj(U.StopMocny); Trauma(U.TraumaMocny); }
                    // ścięcie głowy
                    var glow = boss.glowyOdciete?.Count ?? 0;
                    if (glow > st.glow && boss.glowyOdciete != null)
                    {
                        var o = boss.glowyOdciete[boss.glowyOdciete.Count - 1];
                        zatrzymaj(U.StopSciecie); Trauma(U.TraumaSciecie);
                        blyskOd = teraz;
                        LightEvents.Flash(BIALY, VisualConfig.Swiatla.MocCiosu, VisualConfig.Swiatla.MsCiosu);
                        Czasteczki.Krew(o.x0, o.y0, 0, 26, 1.2);
                        Czasteczki.Iskry(o.x0, o.y0, 0, 14);
                    }
                    // lądowanie: trafienie ruchu, który kończy się ciałem o posadzkę
                    var R = boss.ruch;
                    if (R != null && ladowanie(R.id))
                    {
                        var def = RUCHY_BOSSA[R.id];
                        var tt = R.trafT is double wt ? R.od + wt : def?.traf != null && def.traf.Length > 0 ? R.od + def.traf[0][0] : double.NaN;
                        if (!double.IsNaN(tt) && st.tik < tt && sim.tick >= tt)
                        {
                            Trauma(U.TraumaLadowanie);
                            var yp = posadzka(sim, boss.x, boss.y);
                            Czasteczki.Pyl(boss.x, yp, 4, 18);
                        }
                    }
                }
                // ── pieczęć ──
                if (faza != st.faza)
                {
                    var m = Pomnik.miejscePomnika(sim);
                    if (faza == "rozpada")
                    {
                        Trauma(U.TraumaPekniecie);
                        Czasteczki.Pyl(m.x, m.y + 0.5, 5, 30);
                        Czasteczki.Popiol(m.x, m.y - 1, 3, 30);
                    }
                    else if (faza == "kona")
                    {
                        zatrzymaj(U.StopOstatni); Trauma(U.TraumaSmierc);
                        blyskOd = teraz;
                        var b = boss ?? ostatniBoss(sim);
                        if (b != null) { Czasteczki.Krew(b.x, b.y - 1.5, 0, 30, 1.3); Czasteczki.Iskry(b.x, b.y - 1.5, 0, 18); }
                    }
                }
                else if (faza == "stoi" && stan > st.stan)
                {
                    var m = Pomnik.miejscePomnika(sim);
                    Trauma(U.TraumaRysa);
                    Czasteczki.Pyl(m.x, m.y + 0.5, 3, 10);
                }
                // ── lud: przewrócenie, rany ──
                foreach (var c in sim.creatures)
                {
                    if (c.dead || SLud.rolaPostaci(c) == null) continue;
                    st.lud.TryGetValue(c.id, out var by);
                    var rid = c.ruch?.id; var rod = c.ruch?.od ?? -1;
                    if (rid == "powalony" && (by.id != "powalony" || by.od != rod))
                    {
                        Trauma(U.TraumaPrzewrocenie);
                        st.przewroceni[c.id] = rod;
                    }
                    if (by.hp > 0 && c.hp < by.hp - 1e-6)
                        Czasteczki.Krew(c.x, c.y - 0.6, boss != null ? Math.Sign(c.x - boss.x) : 0, 4, 0.7);
                }
                // ── nowe śmierci: krew (lud, żarłocy), pył i popiół (Cienie) ──
                foreach (var e in sim.efekty)
                {
                    if (e.t > 2 || (e.rodzaj != "smierc" && e.rodzaj != "zawal")) continue;
                    if (widziane.TryGetValue(e, out _)) continue;
                    widziane.Add(e, JEST);
                    if (e.rodzaj == "smierc") Czasteczki.Krew(e.x, e.y - 0.4, 0, 10, 0.9);
                    else { Czasteczki.Pyl(e.x, e.y + 0.5, 1.5, 8); Czasteczki.Popiol(e.x, e.y - 0.5, 1, 10); }
                }
            }
            else
            {
                // pierwszy tik tej partii (albo wczytany zapis): tylko zapamiętać
                foreach (var e in sim.efekty) if (!widziane.TryGetValue(e, out _)) widziane.Add(e, JEST);
            }
            // zapamiętać stan
            st.tik = sim.tick;
            st.faza = faza; st.stan = stan;
            if (boss != null) { st.bossId = boss.id; st.bossHp = boss.hp; st.bossChwiej = boss.chwiejT ?? double.NaN; st.glow = boss.glowyOdciete?.Count ?? 0; }
            else if (faza != "kona") { st.bossId = double.NaN; st.glow = 0; }
            foreach (var c in sim.creatures)
            {
                if (c.dead || SLud.rolaPostaci(c) == null) continue;
                st.lud[c.id] = (c.ruch?.id, c.ruch?.od ?? -1, c.hp);
            }
            if (nowyStop > 0) stopDo = Math.Max(stopDo, teraz + nowyStop);
            return nowyStop;
        }

        static Creature? najblizszyRycerz(Sim sim, Creature boss)
        {
            Creature? naj = null; double d = 12 * 12;
            foreach (var c in sim.creatures)
            {
                if (c.dead || SLud.rolaPostaci(c) == null) continue;
                double dx = c.x - boss.x, dy = c.y - boss.y, dd = dx * dx + dy * dy;
                if (dd < d) { d = dd; naj = c; }
            }
            return naj;
        }

        static Creature? ostatniBoss(Sim sim)
        {
            foreach (var c in sim.creatures) if (c.boss != null) return c;
            return null;
        }

        /// <summary>Wierzch posadzki pod (x, y): pierwszy kafel skały w dół (kafle).</summary>
        static double posadzka(Sim sim, double x, double y)
        {
            var w = sim.world;
            var yp = Math.Floor(y);
            for (int i = 0; i < 10 && yp < w.h - 1 && w.passable(Math.Floor(x), yp + 1); i++) yp++;
            return yp + 1;
        }

        // ───────────── co klatkę ─────────────

        static double popiolT = double.NegativeInfinity, krewGlowT = double.NegativeInfinity;

        /// <summary>
        /// Co klatkę (ekran gry, przed rysunkiem): cząsteczki w czasie ekranu, pył przewróconych w chwili upadku, krew
        /// za lecącą głową, popiół nad konającym bossem.
        /// </summary>
        public static void Klatka(Sim sim, double teraz)
        {
            if (!Aktywne) { Czasteczki.Wyczysc(); return; }
            // wstrząs gaśnie z czasem gry na ekranie, także w klatkach, których nikt nie rysuje
            zanik(teraz);
            Czasteczki.Krok(sim, teraz);
            if (!stany.TryGetValue(sim, out var st)) return;
            // przewrócony dopadł posadzki (koniec „pada”, 22 tiki): pył spod ciała
            doUsuniecia.Clear();
            foreach (var kv in st.przewroceni)
            {
                if (sim.tick < kv.Value + 22) continue;
                var c = sim.creatureById(kv.Key);
                if (c != null && !c.dead) Czasteczki.Pyl(c.x, posadzka(sim, c.x, c.y), 2.2, 10);
                doUsuniecia.Add(kv.Key);
            }
            foreach (var k in doUsuniecia) st.przewroceni.Remove(k);
            var boss = bossZ(sim) ?? ostatniBoss(sim);
            var tF = ZegarGry.tikZUlamkiem(sim, teraz);
            // krew za lecącą głową (co ok. 30 ms)
            if (boss?.glowyOdciete != null && teraz - krewGlowT > 30)
            {
                krewGlowT = teraz;
                foreach (var o in boss.glowyOdciete)
                {
                    if (!LotGlowy(o, tF, out var x, out var y, out _, out var poLad) || poLad > 0) continue;
                    Czasteczki.Krew(x, y, 0, 1, 0.3);
                }
            }
            // konanie: popiół i iskry unoszą się z ciała
            if (sim.lud.pomnik?.faza == "kona" && boss != null && teraz - popiolT > 90)
            {
                popiolT = teraz;
                Czasteczki.Popiol(boss.x, boss.y - 1.2, 2.5, 2);
            }
        }

        // ───────────── lot ściętej głowy ─────────────

        static double losGlowy(double nr) { var s = Math.Sin(nr * 12.9898 + 4.1) * 43758.5453; return s - Math.Floor(s); }

        /// <summary>
        /// Gdzie jest ścięta głowa (kafle świata, środek tam, gdzie dotąd rysowano ją na posadzce) w chwili `tF` (tik
        /// z ułamkiem): w górę i łukiem, z obrotem, jedno odbicie — i ląduje dokładnie tam, gdzie kładzie ją symulacja
        /// (o.x, o.y + 1). `poLadowaniu` — ms od pierwszego dotknięcia posadzki (ujemne w locie). Fałsz — przed cięciem.
        /// </summary>
        public static bool LotGlowy(GlowaOdcieta o, double tF, out double x, out double y, out double kat, out double poLadowaniu)
        {
            var t = (tF - o.tick) / 120;
            x = o.x; y = o.y + 1; kat = 0; poLadowaniu = 0;
            if (t < 0) return false;
            var K = U.PxNaKafel;
            double vUp = U.GlowaWGore / K, g = U.GlowaGrawitacja / K;
            double y0 = o.y0, yF = o.y + 1, dy = yF - y0;
            var t1 = (vUp + Math.Sqrt(Math.Max(0, vUp * vUp + 2 * g * dy))) / g;
            var vUderz = -vUp + g * t1;
            var vOdb = U.GlowaOdbicie * vUderz;
            var t2 = 2 * vOdb / g;
            var vx = (o.x - o.x0) / (t1 + 0.5 * t2);
            if (t < t1) { x = o.x0 + vx * t; y = y0 - vUp * t + g * t * t / 2; }
            else if (t < t1 + t2) { var tb = t - t1; x = o.x0 + vx * t1 + 0.5 * vx * tb; y = yF - vOdb * tb + g * tb * tb / 2; }
            poLadowaniu = (t - t1) * 1000;
            // obrót 6–10 rad/s, tak dobrany, by głowa legła w tej samej pozie co dotąd (całe obroty, łagodne wyhamowanie)
            var T = t1 + t2;
            var w = U.GlowaObrotOd + (U.GlowaObrotDo - U.GlowaObrotOd) * losGlowy(o.nr);
            var obrotow = Math.Max(1, Math.Round(w * T / (Math.PI * 2)));
            if (t < T) { var k = t / T; kat = obrotow * Math.PI * 2 * (1 - (1 - k) * (1 - k)); }
            return true;
        }

        // ───────────── zapowiedź ataku i oddech bossa ─────────────

        static double dzwon(double u, double a, double b)
        {
            if (b <= a || u <= a || u >= b) return 0;
            var k = (u - a) / (b - a);
            return Math.Sin(k * Math.PI);
        }

        /// <summary>Ruchy bossa, które nie są atakiem (bez zapowiedzi): zasłona, zachwianie, ryk i rozkazy dłoni.</summary>
        static bool bezZapowiedzi(string id) => id == "blok" || id == "zachwianie" || id == "ryk" || id.StartsWith("rozkaz", StringComparison.Ordinal);

        /// <summary>
        /// Zapowiedź ataku (tylko obraz): ruch bossa ma osobny początek i trafienie (RuchBossa.traf) — przed trafieniem
        /// boss odchyla się do tyłu (`odrzut` pozy), w trafieniu wyrzut do przodu z rozciągnięciem (`sx`). W spoczynku
        /// (bez ruchu) — oddech: skala w pionie ±1,5%, 0,5 Hz (`sy`). Skala wokół stóp (0, 0) rysunku bossa.
        /// </summary>
        public static void ZapowiedzIOddech(Sim sim, Creature boss, double czas, ref double odrzut, out double sx, out double sy)
        {
            sx = 1; sy = 1;
            var R = boss.ruch;
            if (R == null)
            {
                if (!Rdzen.SettingsStore.ustawienia.ograniczRuch) sy = 1 + U.Oddech * Math.Sin(czas / 1000 * U.OddechHz * Math.PI * 2);
                return;
            }
            if (bezZapowiedzi(R.id)) return;
            var def = RUCHY_BOSSA[R.id];
            if (def?.traf == null || def.traf.Length == 0) return;
            var dl = Math.Max(1, R.dl != 0 ? R.dl : def.dl != 0 ? def.dl : 100);
            var u = (ZegarGry.tikZUlamkiem(sim, czas) - R.od) / dl;
            var hit = def.traf[0][0] / dl;
            // (walka według wzorów: ruch w swoim tempie — postęp i trafienie liczone w czasie oryginału)
            if (R.tempo != null && R.dl0 is double dl0 && dl0 > 0)
            {
                u = WalkaWzor.PostepRuchu(R, ZegarGry.tikZUlamkiem(sim, czas) - R.od);
                hit = def.traf[0][0] / dl0;
            }
            if (hit <= 0.08) return;
            odrzut += U.Odchylenie * dzwon(u, 0.02, hit - 0.01);
            sx = 1 + U.Rozciagniecie * dzwon(u, hit - 0.04, hit + 0.08);
        }

        // ───────────── przewrócenie i spoczynek ─────────────

        /// <summary>Odbicie przewróconego tuż po upadku (px płyty w górę; 0 — bez): „pada” trwa 22 tiki, odbicie 12.</summary>
        public static double OdbiciePrzewroconego(Sim sim, Creature c, double czas)
        {
            if (!Aktywne || c.ruch?.id != "powalony") return 0;
            var tt = ZegarGry.tikZUlamkiem(sim, czas) - c.ruch.od - 22;
            if (tt < 0 || tt >= 12) return 0;
            return U.OdbiciePx * Czytelnosc.SkalaUi * Math.Sin(Math.PI * tt / 12);
        }

        /// <summary>Ile tików ostatniej części ogłuszenia rycerz wstaje (z oprawą 220 ms; bez — 64 tiki, jak dotąd).</summary>
        public static double TikiWstawania => Aktywne ? Math.Max(8, U.WstawanieMs / 1000 * 120) : 64;

        static double celZniknalOd = double.NaN;
        static Sim? celZniknalSim;

        /// <summary>
        /// Cel walki zniknął (boss kona albo świat stanął) od co najmniej 0,3 s — postać ma wrócić do spoczynku zamiast
        /// trzymać gardę albo zamach. Czas ekranu (świat może stać).
        /// </summary>
        public static bool DoSpoczynku(Sim sim, double teraz)
        {
            if (!Aktywne) return false;
            var znikl = sim.ending != null || sim.lud.pomnik?.faza == "kona";
            if (!znikl || !ReferenceEquals(sim, celZniknalSim)) { celZniknalSim = znikl ? sim : null; celZniknalOd = znikl ? teraz : double.NaN; return false; }
            if (teraz < celZniknalOd) celZniknalOd = teraz;
            return teraz - celZniknalOd >= U.SpoczynekMs;
        }

        /// <summary>Nowa partia albo wyłączona oprawa: bez zaległych zatrzymań i wstrząsów.</summary>
        public static void Wyczysc()
        {
            stopDo = double.NegativeInfinity; trauma = 0; blyskOd = double.NegativeInfinity;
            Czasteczki.Wyczysc();
        }
    }
}
