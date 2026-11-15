// Port: alpha-1/src/render/figury.ts — stan ruchu postaci na rysunku (ruch), czynność widoczna na ekranie (czynnosc),
// rysunek wszystkich stworzeń (rysujStworzenia): kolejność, cień pod stopami, aura szału, aureola modlitwy, znaki
// stanów, pierścień zaznaczenia.
//
// Różnica wobec TS (decyzja użytkownika 12.11, PLAN.md punkt 9): samej sylwetki gra nie rysuje kodem — wkleja duszka
// (Duszki/DuszkiLudu.cs, Straznicy.cs). Dlatego nie ma tu: faktur ras, szkieletu i póz starych figur (inne rasy w Alphie
// nie występują), strojów ról na starych figurach, szkiców tłumu (postacZeSzkicu — duszek jest tani), własnych grafik
// z src/grafiki/pliki. Zasłanianie postaci przez słup schodów
// kręconych i cień na stopnicach (render/schody.ts) przyjdą z rysunkiem schodów — etap 3.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using Trzewia.Plotna;
using Trzewia.Rysunek.Duszki;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyLoch;
using static Trzewia.Nastawy.NastawyWygladPostacie;
using static Trzewia.Rdzen.SettingsStore;
using static Trzewia.Rysunek.Lud.Rozstep;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek
{
    /// <summary>Pamięć animacji — tylko po stronie rysunku, symulacja o niej nie wie.</summary>
    public sealed class RuchFigury
    {
        public double x, y;
        /// <summary>Faza kroku 0..1 — rośnie z drogą, nie z czasem: stojący nie przebiera nogami.</summary>
        public double faza;
        /// <summary>Faza wspinaczki — rośnie z drogą w pionie.</summary>
        public double fazaPion;
        /// <summary>Wygładzona prędkość w kaflach na sekundę.</summary>
        public double v;
        public double t;
        /// <summary>Zegar czynności (zamach, pokłon) — własny, żeby tłum nie ruszał się w takt.</summary>
        public double zegar;
        /// <summary>Ostatnie uderzenie kilofa — odpryski rysujemy tylko w chwili trafienia.</summary>
        public double uderzenie;
    }

    public static class Figury
    {
        // WeakMap<Creature, Ruch> z TS
        static readonly ConditionalWeakTable<Creature, RuchFigury> pamiec = new ConditionalWeakTable<Creature, RuchFigury>();

        public static RuchFigury ruch(Creature c, double czas)
        {
            if (!pamiec.TryGetValue(c, out var r))
            {
                r = new RuchFigury { x = c.x + przesuniecieX(c), y = c.y, faza = (c.id * 0.37) % 1, fazaPion = (c.id * 0.61) % 1, v = 0, t = czas, zegar = (c.id * 0.29) % 1, uderzenie = -1e9 };
                pamiec.Add(c, r);
                return r;
            }
            var dt = Math.Max(1, Math.Min(250, czas - r.t)) / 1000;
            // (6.11: krok liczy się z miejsca na rysunku — na schodach kręconych postać idzie po spirali w bok)
            var xr = c.x + przesuniecieX(c);
            double dx = xr - r.x, dy = c.y - r.y;
            var droga = JS.Hypot(dx, dy);
            if (droga > 4) { r.x = xr; r.y = c.y; r.t = czas; return r; }          // skok (wczytanie, teleport)
            var krok = krokPostaci(c);
            var przyrost = Math.Min(Math.Abs(dx) / krok, MAKS_KROKOW_NA_SEKUNDE * dt);
            r.faza = (r.faza + przyrost) % 1;
            r.fazaPion = (r.fazaPion + Math.Min(Math.Abs(dy) / 0.9, 2.4 * dt)) % 1;
            r.v += (droga / dt - r.v) * Math.Min(1, dt * 8);
            r.zegar = (r.zegar + dt) % 1000;
            r.x = xr; r.y = c.y; r.t = czas;
            // 6.11: na schodach kręconych krok idzie ze stopniami — jedna stopa na jeden stopień (pełny cykl to dwa stopnie).
            var sch = chodNaSchodach(c);
            if (sch != null) { var f = (sch.Value.kier < 0 ? -1 : 1) * sch.Value.stopien / 2 + 0.25; r.faza = ((f % 1) + 1) % 1; }
            // 6.11: na drabinie ręce i nogi idą ze szczeblami — pełny cykl na dwa szczeble
            else if (naDrabinie(c)) { var f = (c.y + 1) / (2 * BUDOWA_SCHODOW.szczebel); r.fazaPion = ((f % 1) + 1) % 1; }
            return r;
        }

        /// <summary>
        /// Alpha, etap 3c: faza zamachu młotkiem tej postaci (0..1; uderzenie ok. 0,52 — jak w render/lud/ruch.ts: budowa),
        /// żeby iskry z kowadła i błysk na stole szły w takt jej rąk (render/pomieszczenia.ts).
        /// </summary>
        public static double fazaMlota(Creature c)
        {
            if (!pamiec.TryGetValue(c, out var r)) return 0;
            var z = r.zegar * 1.6 + c.id * 0.13;
            return z - Math.Floor(z);
        }

        /// <summary>Długość pełnego kroku w kaflach — duzi stawiają kroki rzadziej.</summary>
        static double krokRasy(int r) => r == Race.TROLL ? 1.6 : r == Race.DWARF ? 0.8 : r == Race.SPINNER ? 0.7 : 1.0;

        /// <summary>
        /// Nowe postacie ludu stawiają krok jak człowiek — pełny cykl to ok. 0,8 wzrostu — więc stopa
        /// stojąca na ziemi nie ślizga się. (Ustawienie „nowe postacie: wyłączone” nie ma tu znaczenia — duszki są
        /// upieczone z nowych postaci.)
        /// </summary>
        static double krokPostaci(Creature c)
        {
            if (c.race != Race.GOBLIN) return krokRasy(c.race);
            return 0.8 * 1.9 * Races.RACES[c.race].size * ustawienia.wielkoscSylwetek * (c.rola == "rycerz" ? 1.3 : 1);
        }

        /// <summary>Kuje kafel w tej chwili (ostatnie uderzenie najwyżej 0,2 s temu).</summary>
        static bool kujeTeraz(Sim sim, Creature c) => c.kujeT != null && sim.tick - c.kujeT >= 0 && sim.tick - c.kujeT < 24;

        /// <summary>Zwrot przy kopaniu: twarzą do kutego kafla, gdy leży z boku (w symulacji c.face zostaje bez zmian).</summary>
        static double zwrotKucia(Sim sim, Creature c, double kier)
        {
            if (!kujeTeraz(sim, c) || c.kujeX == null) return kier;
            var d = c.kujeX.Value + 0.5 - c.x;
            return Math.Abs(d) > 0.3 ? JS.Sign(d) : kier;
        }

        /// <summary>
        /// Co widać: czynność wynika z zajęcia, ale i z tego, czy stworzenie w ogóle się rusza.
        /// 'stoi' | 'idzie' | 'biegnie' | 'wspina' | 'spada' | 'kopie' | 'modli' | 'je' | 'walczy' | 'spi' | 'buduje' | 'wysysa'
        /// | 'czyta' | 'odmawia' | 'zaklada' | 'skleja' | 'kreci'
        /// </summary>
        public static string czynnosc(Creature c, RuchFigury r, Sim sim, double czas)
        {
            // Remake v2: w zjeżdżającym wiadrze je, na linie pod nim się wspina
            if (c.naWiadrze == true) return "je";
            if (c.naLinie != null) return "wspina";
            // Alpha, etap 5b: w dłoni z otchłani i w locie po rzucie — wymachuje rękami; po upadku leży ogłuszony
            if (c.wDloni == true || c.lot != null) return "spada";
            // Alpha 1 (6.11): rycerz w ruchu walki (cios, obrona, powalony — sim/walka.ts) — rysunek walki, nie sen ani chód
            if (c.ruch != null && c.rola == "rycerz" && sim.tick - c.ruch.od < c.ruch.dl) return "walczy";
            if ((c.ogluszonyDo ?? -1) > sim.tick) return "spi";
            if (c.vy > 0.3) return "spada";
            // Alpha: odmówił rozkazu — stojąc, kręci głową i rozkłada ręce (render/lud/odmowa.ts)
            if (r.v < 0.6 && Lud.Odmowy.postepOdmowy(sim, c, czas) != null) return "odmawia";
            // 6.11, budowa schodów: na drabinie w surowym szybie — wspina się (stoi przy pracy: kręci, osadza — niżej)
            if (naDrabinie(c) && string.IsNullOrEmpty(c.czynnosc)) return "wspina";
            double lx = Math.Floor(c.x), ly = Math.Floor(c.y);
            var w = sim.world;
            // droga wiernych: po schodach szyb się idzie, nie wspina
            var naSchodach = w.inb(lx, ly) && w.schody[w.idx(lx, ly)] == 1;
            var wspina = (sim.tick - (c.wspina ?? -99)) < 4 && !w.solid(Math.Floor(c.x), Math.Floor(c.y) + 1);
            if (wspina && !naSchodach) return "wspina";
            // Alpha: na linie (nie na podłodze pod nią) — wisi na rękach i wspina się, ręka za ręką
            if (w.inb(lx, ly) && w.lina[w.idx(lx, ly)] == 1 && !w.solid(lx, ly + 1)) return "wspina";
            bool przy(double x, double y, double d) => Math.Abs(x + 0.5 - c.x) <= d && Math.Abs(y + 0.5 - c.y) <= d + 0.6;
            var stoi = r.v < 0.6;
            // Alpha, etap 3c: przy stole albo kowadle — z młotkiem; w sypialni — leży na posłaniu
            if (!string.IsNullOrEmpty(c.czynnosc) && stoi) return c.czynnosc!;
            // kuje kafel (cel zajęcia albo skałę na drodze do niego — „kop tam”, „kop drogę”, przejście przez skałę)
            if (kujeTeraz(sim, c)) return "kopie";
            switch (c.job)
            {
                case Job.SLEEP: return "spi";
                case Job.DIG:
                case Job.DESCEND:
                    if (przy(c.jx, c.jy, 1.6)) return "kopie";
                    break;
                case Job.PRAY:
                case Job.SACRIFICE:
                    if (przy(c.jx, c.jy, 2.6) && stoi) return "modli";
                    break;
                case Job.PIELGRZYM: if (stoi) return "modli"; break;
                case Job.EAT: if (stoi && przy(c.jx, c.jy, 1.6)) return "je"; break;
                case Job.BUILD: if (przy(c.jx, c.jy, 1.6)) return "buduje"; break;
                case Job.DRAIN: return stoi ? "wysysa" : "idzie";
                case Job.FIGHT:
                case Job.SLAVE:
                    {
                        // ostatnia deska: pobożny unosi księgę przeciw bossowi
                        if (c.ksiegaT != null && sim.tick - c.ksiegaT < 400 && r.v < 0.6) return "czyta";
                        var cel = sim.creatureById(sim.target.TryGet(c.id, out var idCelu) ? idCelu : -1);
                        if (cel != null && !cel.dead && JS.Hypot(cel.x - c.x, cel.y - c.y) < 1.8) return "walczy";
                        return r.v > 0.6 ? "biegnie" : "stoi";
                    }
                case Job.FLEE: return r.v > 0.3 ? "biegnie" : "stoi";
                case Job.HEAT: if (stoi) return "stoi"; break;
            }
            if (r.v > 0.6) return c.fear > 0.55 ? "biegnie" : "idzie";
            return "stoi";
        }

        // ------------------------------------------------------------------- rysunek

        /// <summary>Jedna postać w miejscu (0,0) = środek stopy, twarzą w prawo. Zwraca czynność, którą pokazała.</summary>
        public static string rysujPostac(IPlotno ctx, Sim sim, Creature c, double h, double czas, string? cz = null)
        {
            // etap 3: Strażnik Snu (i boss) ma własny rysunek
            if (c.straznik == true) { RysStraznicy.rysujStraznika(ctx, sim, c, h, czas); return "stoi"; }
            var r = ruch(c, czas);
            var czyn = cz ?? czynnosc(c, r, sim, czas);
            var rola = Symulacja.Lud.rolaPostaci(c);
            if (rola != null) { DuszkiLudu.rysujLud(ctx, sim, c, rola, h, czas, czyn, r.faza, r.fazaPion, r.zegar); return czyn; }
            // inne rasy w Alphie nie występują — stare figury z figury.ts nie mają duszków
            DuszkiLudu.Zastepczo(ctx, c, h);
            return czyn;
        }

        static IPlotno? plamaCienia;

        /// <summary>
        /// Miękki cień pod stopami: plama z gradientu (raz narysowana), spłaszczona w elipsę. (6.11, uwaga użytkownika
        /// „dodaj cienie do postaci”: ciemniejsza i szersza — dawna ginęła na jasnej posadzce sali, a postać wisiała nad nią.)
        /// </summary>
        static void cienKontaktowy(IPlotno ctx, double sx, double sy, double h)
        {
            if (plamaCienia == null)
            {
                plamaCienia = Plotno.Nowe(64, 64);
                var g = plamaCienia;
                var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
                gr.addColorStop(0, "rgba(6,4,4,0.86)"); gr.addColorStop(0.35, "rgba(6,4,4,0.64)");
                gr.addColorStop(0.7, "rgba(6,4,4,0.26)"); gr.addColorStop(1, "rgba(6,4,4,0)");
                g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
            }
            double rx = h * 0.46, ry = Math.Max(2.6, h * 0.1);
            ctx.drawImage(plamaCienia, sx - rx, sy - ry * 0.8, rx * 2, ry * 2);
        }

        static IPlotno? plotnoTla;

        /// <summary>
        /// Postać stojąca z tyłu (rozstęp w wąskim szybie): rysowana na boku i przyciemniona tuszem przez całą
        /// sylwetkę naraz — `ciemniej` to krycie ciemnej warstwy (0..1).
        /// </summary>
        static string postacWTle(IPlotno ctx, Sim sim, Creature c, double h, double czas, double kier, double sx, double sy, double ciemniej, double szer = 1)
        {
            var t = ctx.getTransform();
            var skala = Math.Max(1, Math.Min(4, JS.Hypot(t.a, t.b)));
            double w = h * 2.4, wys = h * 2.1, stopy = h * 1.6;
            int pw = (int)Math.Ceiling(w * skala), ph = (int)Math.Ceiling(wys * skala);
            var p = plotnoTla ??= Plotno.Nowe(pw, ph);
            if (p.width < pw || p.height < ph) { p.width = Math.Max(p.width, pw); p.height = Math.Max(p.height, ph); }
            var g = p;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, pw, ph);
            g.setTransform(skala, 0, 0, skala, (w / 2) * skala, stopy * skala);
            // (6.11: z tyłu spirali schodów kręconych też się obraca — przy ścianach szybu sylwetka zwęża się)
            g.scale(kier * szer, 1);
            var cz = rysujPostac(g, sim, c, h, czas);
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = "source-atop";
            g.fillStyle = Barwa.Rgba(16, 10, 8, Math.Round(ciemniej * 1000) / 1000);
            g.fillRect(0, 0, pw, ph);
            g.globalCompositeOperation = "source-over";
            ctx.drawImage(p, 0, 0, pw, ph, sx - w / 2, sy - stopy, w, wys);
            return cz;
        }

        /// <summary>Wysokość sylwetki na ekranie (px) — ta sama, którą rysuje rysujStworzenia (pierścienie i dymki do niej się mierzą).</summary>
        public static double wysokoscPostaci(Creature c, double zoom) =>
            Math.Max(16, Races.RACES[c.race].size * zoom * 1.9 * ustawienia.wielkoscSylwetek) * (c.rola == "rycerz" ? 1.3 : 1);

        sealed class DoRysowania { public Creature c = null!; public int n; }

        public static void rysujStworzenia(IPlotno ctx, Sim sim, Camera cam, double czas, double? wybrany = null)
        {
            var z = cam.zoom;
            // stojący prawie w jednym miejscu rozchodzą się na rysunku obok siebie (render/lud/rozstep.ts)
            rozstawTlum(sim, cam, czas, wysokoscPostaci);
            double left = cam.x - cam.vw / 2 / z, top = cam.y - cam.vh / 2 / z;
            double right = left + cam.vw / z, bottom = top + cam.vh / z;

            // z daleka tłum zlewa się w plamę — grupujemy i podpisujemy liczbą
            var grupowanie = z < 9;
            var zajete = new Dictionary<string, DoRysowania>();
            var doRysowania = new List<DoRysowania>();
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                if (c.x < left - 3 || c.x > right + 3 || c.y < top - 3 || c.y > bottom + 3) { pamiec.Remove(c); continue; }
                if (!grupowanie) { doRysowania.Add(new DoRysowania { c = c, n = 1 }); continue; }
                var klucz = JS.S(JS.Round(c.x / 2.2)) + "," + JS.S(JS.Round(c.y / 2.2)) + "," + c.race + (c.boss != null ? "B" : "");
                if (zajete.TryGetValue(klucz, out var jest)) { jest.n++; continue; }
                var wpis = new DoRysowania { c = c, n = 1 };
                zajete[klucz] = wpis;
                doRysowania.Add(wpis);
            }
            // dalsze (wyżej na ekranie) pierwsze — niższe zachodzą na nie, jak na rycinie z głębią; stojący z tyłu (rozstęp) też;
            // z tyłu schodów kręconych — przed wszystkimi (słup i stopnie, które je zasłaniają, nie mogą przykryć tych z przodu)
            double kolejnosc(Creature c) => c.y - wTle(c) * 0.3 - (zTyluSchodow(c) ? 1e4 : 0);
            JS.Sort(doRysowania, (a, b) => kolejnosc(a.c) - kolejnosc(b.c));

            foreach (var wpis in doRysowania)
            {
                var c = wpis.c; var n = wpis.n;
                // minimalny rozmiar w pikselach: sylwetka musi być widoczna przy każdym zoomie
                var h = wysokoscPostaci(c, z);
                var dx = n > 1 ? 0 : przesuniecieX(c);
                var sx = (c.x + dx - left) * z;
                // (6.11: na schodach kręconych dalsza strona spirali leży wyżej — render/schody.ts)
                var sy = (c.y + 1 + (n > 1 ? 0 : przesuniecieY(c)) - top) * z;
                var zw = n > 1 ? 0 : zwrotNaRysunku(c);
                var kier = zw != 0 ? zw : (c.face >= 0 ? 1 : -1);
                var tlo = n > 1 ? 0 : wTle(c);

                // cień kontaktowy — tylko na ziemi: miękka plama, najciemniejsza tuż pod stopami
                var naZiemi = c.vy <= 0.3 && sim.world.solid(Math.Floor(c.x + dx), Math.Floor(c.y) + 1);
                if (naZiemi) cienKontaktowy(ctx, sx, sy, h);
                // 6.11: na schodach kręconych — cień na stopnicy pod stopami (i słabiej na następnej niższej), przycięty do niej
                var naSchodach = n == 1 && chodNaSchodach(c) != null;
                if (naSchodach)
                {
                    foreach (var st in Schody.stopniePodStopami(sim, cam, c, c.x + dx))
                    {
                        ctx.save();
                        ctx.beginPath(); ctx.moveTo(st.tr[0].x, st.tr[0].y);
                        for (int i = 1; i < st.tr.Count; i++) ctx.lineTo(st.tr[i].x, st.tr[i].y);
                        ctx.closePath(); ctx.clip();
                        // (stopnica w lekkim ujęciu z góry to wąski pas — cień ciemniejszy i szerszy niż na posadzce, inaczej ginął)
                        ctx.globalAlpha = st.sila;
                        cienKontaktowy(ctx, st.cx, st.cy, h * 1.05);
                        ctx.globalAlpha = st.sila * 0.45;
                        cienKontaktowy(ctx, st.cx, st.cy, h * 0.75);
                        ctx.restore();
                    }
                }

                // Alpha, etap 3d: szał krwi z ołtarza — czerwona aura wokół postaci, pulsuje
                if ((c.szalDo ?? -1) > sim.tick)
                {
                    var puls = 0.75 + 0.25 * Math.Sin(czas * 0.008 + c.id);
                    var R = h * 0.95;
                    var ga = ctx.createRadialGradient(sx, sy - h * 0.5, 0, sx, sy - h * 0.5, R);
                    ga.addColorStop(0, Barwa.Rgba(255, 44, 26, 0.42 * puls)); ga.addColorStop(0.6, Barwa.Rgba(220, 24, 14, 0.18 * puls)); ga.addColorStop(1, "rgba(200,20,10,0)");
                    ctx.fillStyle = ga; ctx.fillRect(sx - R, sy - h * 0.5 - R, R * 2, R * 2);
                }

                string cz;
                // cudze światło z otoczenia kładzie ciepłą krawędź po swojej stronie sylwetki (render/lud/oswietlenie.ts)
                Lud.Oswietlenie.ustawSwiatlo(Symulacja.Lud.rolaPostaci(c) != null ? Lud.Oswietlenie.swiatloDla(sim, c, h / z) : null);
                if (tlo > 0.02 && c.lot == null) cz = postacWTle(ctx, sim, c, h, czas, kier, sx, sy, 0.42 * tlo, szerokoscNaRysunku(c));
                else
                {
                    ctx.save();
                    ctx.translate(sx, sy);
                    // etap 5b: ciśnięty przez dłoń z otchłani koziołkuje w locie (wokół środka ciała)
                    if (c.lot != null) { ctx.translate(0, -h * 0.5); ctx.rotate((sim.tick - c.lot.od) * 0.16 * (JS.Sign(c.lot.vx) != 0 ? JS.Sign(c.lot.vx) : 1)); ctx.translate(0, h * 0.5); }
                    // (niski korytarz: lud kuca — osobne klatki duszka)
                    // (6.11: na schodach kręconych obraca się z nimi — przy ścianach szybu idzie w głąb, sylwetka się zwęża)
                    ctx.scale(zwrotKucia(sim, c, kier) * szerokoscNaRysunku(c), 1);
                    cz = rysujPostac(ctx, sim, c, h, czas);
                    ctx.restore();
                }
                Lud.Oswietlenie.ustawSwiatlo(null);
                // 6.11: na schodach kręconych to, co leży bliżej widza (słup, gdy jest za nim, stopnie po drugiej stronie),
                // rysuje się na postaci — znika za słupem
                if (naSchodach) Schody.zaslonNaSchodach(ctx, sim, cam, c, c.x + dx, c.y + 1 + przesuniecieY(c), h, czas);

                // Aureola znaczy świętość: tylko nad pobożnym, który się modli. Wzmocnienia i osłabienia to małe znaki ryciny
                // przy głowie (szewron weterana, płomień szału, kropla krwi okaleczonego, kropla trucizny).
                // Zabytki działają na cały lud naraz — ich premie i kary są tylko na karcie.
                var rola = Symulacja.Lud.rolaPostaci(c);
                if (rola != null)
                {
                    var gl = DuszkiLudu.glowaPostaci(c);
                    var lezy = c.czynnosc == "spi";
                    var ax = gl != null ? sx + kier * gl.Value.x * h : lezy ? sx - kier * h * 1.3 : sx + kier * h * 0.05;
                    var ay = gl != null ? sy + (gl.Value.y - gl.Value.r * 2.1) * h : lezy ? sy - h * 0.45 : sy - h * 1.08;
                    double rx = Math.Max(6, h * 0.22), ry = Math.Max(2, h * 0.066);
                    if (cz == "modli" && rola == "pobozny")
                    {
                        var puls = ustawienia.ograniczRuch ? 0.85 : 0.7 + 0.3 * Math.Sin(czas * 0.004 + c.id);
                        ctx.save();
                        ctx.lineWidth = Math.Max(1.2, h * 0.035);
                        ctx.shadowColor = "rgba(255,226,150,0.8)"; ctx.shadowBlur = Math.Max(4, h * 0.16);
                        ctx.strokeStyle = Barwa.Rgba(255, 236, 180, 0.8 * puls);
                        ctx.beginPath(); ctx.ellipse(ax, ay, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
                        ctx.restore();
                    }
                    var znaki = new List<string>();
                    foreach (var st in Symulacja.Lud.stanyPostaci(sim, c))
                    {
                        if (st.uspiony == true || st.bezAureoli == true || (st.kiedy ?? "").StartsWith("zabytek", StringComparison.Ordinal)) continue;
                        var zn = znakStanu(st);
                        if (zn != null && !znaki.Contains(zn)) znaki.Add(zn);
                    }
                    if (znaki.Count > 0)
                    {
                        var S = Math.Max(4, h * 0.11);
                        for (int i = 0; i < znaki.Count; i++) rysujZnakStanu(ctx, znaki[i], ax + rx * 0.9 + S * (1.2 + i * 1.7), ay + S * 0.4, S);
                    }
                }
                // ilu ich tu stoi
                if (n > 1)
                {
                    ctx.font = JS.S(Math.Max(13, h * 0.45)) + "px \"Trzewia Tekst\", Georgia, serif";
                    ctx.textAlign = "left";
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = "rgba(8,6,5,0.85)";
                    ctx.strokeText("×" + n, sx + h * 0.42, sy - h * 0.55);
                    ctx.fillStyle = "rgba(238,226,198,0.95)";
                    ctx.fillText("×" + n, sx + h * 0.42, sy - h * 0.55);
                }
                // zaznaczony do szeptu
                if (wybrany == c.id)
                {
                    ctx.strokeStyle = "rgba(246,216,142,0.9)";
                    ctx.lineWidth = Math.Max(1.2, h * 0.06);
                    ctx.beginPath();
                    ctx.arc(sx, sy - h * 0.5, h * 0.75, 0, Math.PI * 2);
                    ctx.stroke();
                }
                // prorok: łuk światła nad głową
                if (c.prophet)
                {
                    ctx.strokeStyle = Barwa.Rgba(246, 216, 142, 0.65 + 0.25 * Math.Sin(czas * 0.004 + c.id));
                    ctx.lineWidth = Math.Max(1, h * 0.06);
                    ctx.beginPath();
                    ctx.arc(sx, sy - h * 1.08, h * 0.24, Math.PI * 1.1, Math.PI * 1.9);
                    ctx.stroke();
                }
                // sen: powolne kłęby oddechu
                if (cz == "spi" && !ustawienia.ograniczRuch)
                {
                    var t = (czas * 0.0006 + c.id * 0.3) % 1;
                    ctx.fillStyle = Barwa.Rgba(214, 206, 190, 0.35 * (1 - t));
                    ctx.beginPath();
                    ctx.arc(sx + kier * h * (0.3 + t * 0.2), sy - h * (0.5 + t * 0.4), h * (0.04 + t * 0.06), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        /// <summary>
        /// Znak stanu przy głowie (null — stan widać na samej postaci albo w świecie: hełm, spojrzenie z ciemności, dłoń).
        /// 'szewron' | 'plomien' | 'krew' | 'trucizna' | 'gora' | 'dol'
        /// </summary>
        static string? znakStanu(StanPostaci st)
        {
            var n = st.nazwa;
            if (n == "weteran") return "szewron";
            if (n == "szał krwi") return "plomien";
            if (n == "okaleczony") return "krew";
            if (n == "zatruty") return "trucizna";
            if (n.StartsWith("w hełmie", StringComparison.Ordinal) || n.StartsWith("patrzy", StringComparison.Ordinal) || n.StartsWith("spod niego", StringComparison.Ordinal)) return null;
            return st.dobry ? "gora" : "dol";
        }

        /// <summary>Obrys kropli (render/kruszce.ts: kropla) — wysokość ok. 2a, ostry koniec w górze, okrągły spód; do ścieżki bieżącej.</summary>
        internal static void kropla(IPlotno ctx, double a)
        {
            ctx.moveTo(0, -a);
            ctx.quadraticCurveTo(a * 0.62, -a * 0.12, a * 0.55, a * 0.38);
            ctx.arc(0, a * 0.38, a * 0.55, 0, Math.PI);
            ctx.quadraticCurveTo(-a * 0.62, -a * 0.12, 0, -a);
            ctx.closePath();
        }

        /// <summary>Mały znak ryciny (środek w x, y; wysokość ok. 2S): kontur tuszem i barwa.</summary>
        static void rysujZnakStanu(IPlotno ctx, string zn, double x, double y, double S)
        {
            ctx.save();
            ctx.translate(x, y);
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.beginPath();
            if (zn == "szewron")
            {
                foreach (var dy in new[] { -S * 0.45, S * 0.35 })
                {
                    ctx.moveTo(-S * 0.7, dy + S * 0.35); ctx.lineTo(0, dy - S * 0.3); ctx.lineTo(S * 0.7, dy + S * 0.35);
                }
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = S * 0.55; ctx.stroke();
                ctx.strokeStyle = "rgba(236,196,110,0.98)"; ctx.lineWidth = S * 0.28; ctx.stroke();
            }
            else if (zn == "gora" || zn == "dol")
            {
                var k = zn == "gora" ? -1 : 1;
                ctx.moveTo(0, k * S * 0.8); ctx.lineTo(S * 0.7, -k * S * 0.5); ctx.lineTo(-S * 0.7, -k * S * 0.5); ctx.closePath();
                ctx.fillStyle = zn == "gora" ? "rgba(236,196,110,0.98)" : "rgba(170,44,32,0.98)"; ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = Math.Max(1, S * 0.18); ctx.stroke();
            }
            else if (zn == "plomien")
            {
                ctx.moveTo(0, -S);
                ctx.bezierCurveTo(S * 0.9, -S * 0.2, S * 0.7, S * 0.8, 0, S * 0.8);
                ctx.bezierCurveTo(-S * 0.7, S * 0.8, -S * 0.9, -S * 0.1, -S * 0.15, -S * 0.35);
                ctx.quadraticCurveTo(-S * 0.1, -S * 0.7, 0, -S);
                ctx.closePath();
                ctx.fillStyle = "rgba(232,92,40,0.98)"; ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = Math.Max(1, S * 0.18); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(0, S * 0.35, S * 0.28, S * 0.36, 0, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,214,130,0.95)"; ctx.fill();
            }
            else
            {
                kropla(ctx, S);
                ctx.fillStyle = zn == "krew" ? "rgba(160,20,14,0.98)" : "rgba(112,138,58,0.98)"; ctx.fill();
                ctx.strokeStyle = "rgba(20,12,8,0.9)"; ctx.lineWidth = Math.Max(1, S * 0.18); ctx.stroke();
            }
            ctx.restore();
        }
    }
}
