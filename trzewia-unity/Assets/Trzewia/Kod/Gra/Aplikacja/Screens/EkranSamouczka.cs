// Port: alpha-1/src/app/screens/tutorial.ts — samouczek: krótkie rozdziały, każdy z listą czynności do odhaczenia.
// Palec zawsze wskazuje dokładnie to, w co trzeba kliknąć — ryt, słowo, przycisk albo miejsce na płycie — a lista
// pokazuje, co już zrobione i co dalej. Samouczek zawsze toczy się w tej samej górze — lekcje wskazują jej miejsca.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Atlas;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawySterowanie;
using static Trzewia.Rdzen.SettingsStore;
using static Trzewia.Symulacja.Tiles;
using JS = Trzewia.Js.Js;
using JsMath = Trzewia.Js.JsMath;

namespace Trzewia.Aplikacja
{
    public sealed class EkranSamouczka : Ekran
    {
        static Styl rgba(string hex, double a) => Paleta.rgba(hex, a);
        static string S(double x) => JS.S(x);
        static bool wPolu(Obszar? p, double x, double y) => p is { } q && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h;
        static readonly HashSet<string> AKCJE_KLAWISZY = new HashSet<string>(Enum.GetNames(typeof(Akcja)));

        /// <summary>Samouczek zawsze toczy się w tej samej górze — lekcje wskazują jej konkretne miejsca.</summary>
        const double ZIARNO_SAMOUCZKA = 20260921;

        public override string nazwa => "samouczek";
        public readonly EkranGry gra;
        readonly Cutscenka film = new Cutscenka();
        /// <summary>'scena' | 'lekcja' | 'final'</summary>
        string faza = "scena";
        int idx;
        bool[] zaliczoneEtapy = Array.Empty<bool>();
        bool zrobiony;
        /// <summary>Karta zwinięta do jednego paska — na telefonie odsłania płytę.</summary>
        bool zwinieta;
        int ostatniEtap = -1;
        double blysk;
        double odEtapu;
        /// <summary>Kamera z początku etapu — po niej poznajemy, że gracz się rozejrzał.</summary>
        public (double x, double y, double zoom) kamStart = (0, 0, 1);
        /// <summary>Stworzenie wskazane w rozdziale — śledzimy je, zamiast szukać co klatkę nowego.</summary>
        double wskazaneId = -1;
        /// <summary>Miejsca na płycie liczone raz na etap — pierścień nie może skakać za tłumem.</summary>
        readonly Dictionary<int, Wskazanie?> celeEtapow = new Dictionary<int, Wskazanie?>();
        /// <summary>Wysokość ekranu — organy w ramie liczą się od dołu.</summary>
        public double vh = 720;
        /// <summary>W trakcie przygotowania rozdziału gra też coś zgłasza — to nie są ruchy gracza.</summary>
        bool ustawianie;

        Obszar? poleDalej, poleWstecz, polePomin, poleKarta, poleGraj, poleMenu, poleZwin;
        readonly IKontekst app;

        // ------------------------------------------------------------ wskazywanie

        public Wskazanie? ryt(string v)
        {
            var m = gra.ui.miejsce("verb", v);
            return m is { } q ? Wskazanie.Punkt(q.x, q.y, Math.Max(q.hw, q.hh) * 1.15) : null;
        }

        public Wskazanie? slowo(string rodzaj, string id)
        {
            var m = gra.ui.miejsce(rodzaj, id);
            return m is { } q ? Wskazanie.Punkt(q.x, q.y + q.hh * 0.2, Math.Max(q.hw, q.hh) * 1.2) : null;
        }

        public Wskazanie? przycisk(string a)
        {
            var b = gra.miejscePrzycisku(a);
            return b != null ? Wskazanie.Punkt(b.x, b.y, b.r * 1.35) : null;
        }

        public (double x, double y)? gniazdoGoblinow()
        {
            // środek żywych goblinów, nie punkt gniazda: gniazdo zostaje na mapie nawet wtedy,
            // gdy mieszka tam już kto inny
            var g = gra;
            var klan = g.sim.clans.Where(k => !k.dead && k.race == Race.GOBLIN && k.pop > 0)
                .OrderByDescending(k => k.pop).FirstOrDefault();
            if (klan == null) return null;
            double sx = 0, sy = 0; var n = 0;
            foreach (var c in g.sim.creatures)
            {
                if (c.dead || c.clan != klan.id) continue;
                sx += c.x; sy += c.y; n++;
            }
            return n > 0 ? (sx / n, sy / n) : (klan.hx, klan.hy);
        }

        /// <summary>Puste miejsce z podłogą przy gnieździe — tam ma trafić grzyb.</summary>
        public Cel? miejsceNaGrzyb()
        {
            var dom = gniazdoGoblinow();
            if (dom == null) return null;
            var w = gra.sim.world;
            for (var r = 2; r < 16; r++)
                for (var k = 0; k < 26; k++)
                {
                    var a = (k / 26.0) * Math.PI * 2;
                    double x = Math.Floor(dom.Value.x + JsMath.Cos(a) * r + 0.5), y = Math.Floor(dom.Value.y + JsMath.Sin(a) * r + 0.5);
                    if (!w.inb(x, y)) continue;
                    if (w.tile[(int)w.idx(x, y)] == T.AIR && !w.passable(x, y + 1) && w.water[(int)w.idx(x, y)] == 0)
                        return new Cel { x = x + 0.5, y = y + 0.5, r = 3, tekst = "dotknij tutaj" };
                }
            return new Cel { x = dom.Value.x, y = dom.Value.y, r = 3, tekst = "dotknij tutaj" };
        }

        /// <summary>Lita skała tuż obok gniazda — tam ma powstać korytarz.</summary>
        public Cel? miejsceNaKorytarz()
        {
            var dom = gniazdoGoblinow();
            if (dom == null) return null;
            var w = gra.sim.world;
            for (var r = 3; r < 18; r++)
                for (var k = 0; k < 26; k++)
                {
                    var a = (k / 26.0) * Math.PI * 2;
                    double x = Math.Floor(dom.Value.x + JsMath.Cos(a) * r + 0.5), y = Math.Floor(dom.Value.y + JsMath.Sin(a) * r + 0.5);
                    if (!w.inb(x, y)) continue;
                    if (PASSABLE[w.tile[(int)w.idx(x, y)]] != 1) return new Cel { x = x + 0.5, y = y + 0.5, r = 3, tekst = "przeciągnij po skale" };
                }
            return null;
        }

        /// <summary>Jedna postać ludu do szeptu (najchętniej o danej roli) — ta sama przez cały rozdział.</summary>
        public Cel? wskazanyGoblin(string tekst, string? rola = null)
        {
            var sim = gra.sim;
            var c = sim.creatures.FirstOrDefault(o => o.id == wskazaneId && !o.dead);
            if (c == null)
            {
                var dom = gniazdoGoblinow();
                bool ludu(Creature o) => o.race == Race.GOBLIN && o.straznik != true;
                bool pasuje(Creature o) => ludu(o) && (rola == null || o.rola == rola);
                c = (dom != null ? sim.nearestCreature(dom.Value.x, dom.Value.y, 30, pasuje) ?? sim.nearestCreature(dom.Value.x, dom.Value.y, 30, ludu) : null)
                    ?? sim.creatures.FirstOrDefault(o => !o.dead && ludu(o));
                wskazaneId = c != null ? c.id : -1;
            }
            return c != null ? new Cel { x = c.x, y = c.y - 0.4, r = 2, tekst = tekst } : null;
        }

        /// <summary>Remake v2: wiadro z jedzeniem najbliżej ludu (stojące albo zjeżdżające).</summary>
        public Cel? najblizszeWiadro()
        {
            var dom = gniazdoGoblinow();
            var lista = Wiadro.wiadra(gra.sim).Where(wd => wd.faza != "odjezdza" && wd.porcje > 0).ToList();
            if (dom == null || lista.Count == 0) return null;
            var d = dom.Value;
            var wd0 = lista.OrderBy(a => Math.Sqrt(Math.Pow(a.x - d.x, 2) + Math.Pow(a.cel - d.y, 2))).First();
            return new Cel { x = wd0.x + 0.5, y = Math.Max(wd0.y, wd0.sufit) + 0.5, r = 3, tekst = "wiadro z jedzeniem" };
        }

        public Cel rdzen()
        {
            var w = gra.sim.world;
            return new Cel { x = w.coreX + 0.5, y = w.coreY + 0.5, r = 6, tekst = "twój rdzeń" };
        }

        // ------------------------------------------------------------- rozdziały

        List<Rozdzial> rozdzialy => Rozdzialy.ROZDZIALY;

        public EkranSamouczka(IKontekst app)
        {
            this.app = app;
            gra = new EkranGry(app);
            gra.zapisujAuto = false;
            gra.nasluch = z => aktualizuj(z);
        }

        /// <summary>Góra samouczka generowana z wyprzedzeniem (ekran ładowania).</summary>
        public void przygotuj() => gra.przygotuj(ZIARNO_SAMOUCZKA);

        public override void wejdz(object? dane)
        {
            gra.nowaGra(ZIARNO_SAMOUCZKA, zWstepem: false);
            gra.sim.spokojnySwiat = true;      // stały świat: żadnych zaraz ani klęsk w trakcie nauki
            gra.sim.nakarmSwiat();             // i wiadro z jedzeniem od razu, żeby nauka nie była patrzeniem na głód
            gra.wejdz("samouczek");
            app.muzyka.ustawScene("samouczek");
            idx = 0;
            faza = "scena";
            // wstęp: kim jesteś i czym działasz (cel i przegraną tłumaczą ostatnie rozdziały) — potem rozdziały z palcem
            film.odtworzListe(new[] { Sceny.SCENY["kimJestes"], Sceny.SCENY["narzedzia"] }, () => zacznijRozdzial(0));
        }

        public override void rozmiar(double w, double h) { vh = h; gra.rozmiar(w, h); }

        /// <summary>Alpha 1: rozdziały przefiltrowane do urządzenia (etapy `tylko: 'komputer' | 'telefon'`), raz na rozdział.</summary>
        readonly Dictionary<string, Rozdzial> przefiltrowane = new Dictionary<string, Rozdzial>();
        Rozdzial rozdzial
        {
            get
            {
                var r = rozdzialy[idx];
                var urzadzenie = gra.plate.waski || gra.plate.niski ? "telefon" : "komputer";
                if (!r.etapy.Any(e => e.tylko != null)) return r;
                var klucz = $"{idx}:{urzadzenie}";
                if (!przefiltrowane.TryGetValue(klucz, out var f))
                {
                    f = r.Kopia(r.etapy.Where(e => e.tylko == null || e.tylko == urzadzenie).ToList());
                    przefiltrowane[klucz] = f;
                }
                return f;
            }
        }

        void zacznijRozdzial(int i)
        {
            faza = "lekcja";
            idx = i;
            zwinieta = false;                   // nowy rozdział zawsze pokazuje się w całości
            var r = rozdzial;
            var g = gra;
            zrobiony = false;
            zaliczoneEtapy = new bool[r.etapy.Count];
            ostatniEtap = -1;
            wskazaneId = -1;
            celeEtapow.Clear();
            g.zapiski = false;
            g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
            g.cel = null;
            g.dozwolone = new HashSet<string>(r.czasowniki ?? new string[0]);
            ustawianie = true;
            r.przygotuj?.Invoke(g, this);
            g.pauza = false;
            g.wstrzymane = r.stopCzasu;                  // rozdział z celowaniem dostaje nieruchomy świat
            // miejsce na płycie, o które chodzi w rozdziale, ma być w kadrze od pierwszej chwili
            for (var j = 0; j < r.etapy.Count; j++)
            {
                if (r.etapy[j].wejdz != null) continue;
                var wsk = wskazanie(j);
                if (wsk?.typ == "swiat") { g.pokazMiejsce(wsk.cel!.x, wsk.cel.y, 15, true); break; }
            }
            ustawianie = false;
            aktualizuj(null);
        }

        /// <summary>Wskazanie etapu; miejsca na płycie zapamiętane, elementy interfejsu liczone na bieżąco.</summary>
        Wskazanie? wskazanie(int i)
        {
            var r = rozdzial;
            if (i < 0 || i >= r.etapy.Count) return null;
            var e = r.etapy[i];
            if (e.wskaz == null) return null;
            if (celeEtapow.TryGetValue(i, out var zapamietane) && zapamietane != null) return zapamietane;
            var w = e.wskaz(this);
            if (w?.typ == "swiat") celeEtapow[i] = w;
            return w;
        }

        /// <summary>Numer bieżącego etapu albo -1, gdy wszystkie zaliczone.</summary>
        int biezacyEtap => Array.FindIndex(zaliczoneEtapy, z => !z);

        /// <summary>
        /// Serce samouczka: cofa etapy wyboru, które gracz odwołał, zalicza bieżący, gdy
        /// jest spełniony, a zdarzenie pasujące do dalszego etapu zalicza wszystko po drodze —
        /// kto zrobi coś szybciej, niż kazano, nie musi tego powtarzać.
        /// </summary>
        void aktualizuj(ZdarzenieGry? z)
        {
            if (faza != "lekcja" || zrobiony || ustawianie) return;
            var r = rozdzial; var g = gra; var zal = zaliczoneEtapy;
            for (var i = 0; i < r.etapy.Count; i++)
            {
                var e = r.etapy[i];
                if (zal[i] && e.cofa && e.gotowe != null && !e.gotowe(g, null, this))
                {
                    for (var j = i; j < zal.Length; j++) zal[j] = false;
                    break;
                }
            }
            var zd = z;
            for (var n = 0; n < r.etapy.Count; n++)
            {
                var cur = biezacyEtap;
                if (cur < 0) break;
                if (cur != ostatniEtap)
                {
                    ostatniEtap = cur;
                    odEtapu = Wydajnosc.Teraz();
                    kamStart = (g.cam.x, g.cam.y, g.cam.zoom);
                    r.etapy[cur].wejdz?.Invoke(g, this);
                }
                var e = r.etapy[cur];
                if (!e.rozumiem && e.gotowe != null && e.gotowe(g, zd, this)) { zal[cur] = true; zd = null; continue; }
                if (zd != null)
                {
                    for (var j = cur + 1; j < r.etapy.Count; j++)
                    {
                        var d = r.etapy[j];
                        // tylko etapy zdarzeń: stan w rodzaju „zapiski zamknięte" jest prawdziwy od początku
                        if (d.rozumiem || d.cofa || d.gotowe == null || d.gotowe(g, null, this) || !d.gotowe(g, zd, this)) continue;
                        for (var k = cur; k <= j; k++) zal[k] = true;
                        zd = null;
                        break;
                    }
                    if (zd == null) continue;
                }
                break;
            }
            if (biezacyEtap < 0) zalicz();
        }

        void zalicz()
        {
            if (zrobiony) return;
            zrobiony = true;
            zwinieta = false;                   // „Dalej” musi być widać
            gra.wstrzymane = false;             // skutek ma być widoczny od razu
            gra.cel = null;
            blysk = 1;
            // zaliczony krok brzmi jak wykonany plan: trzy stuki w górę i dzwon
            if (ustawienia.efekty) app.gesty.wykonanie(3, 0);
            else app.dzwiek.toll();
        }

        void rozumiem()
        {
            var cur = biezacyEtap;
            if (cur < 0 || !rozdzial.etapy[cur].rozumiem) return;
            zaliczoneEtapy[cur] = true;
            aktualizuj(null);
        }

        void dalej()
        {
            if (idx >= rozdzialy.Count - 1) { koniecNauki(); return; }
            zacznijRozdzial(idx + 1);
        }

        void wstecz()
        {
            if (idx > 0) zacznijRozdzial(idx - 1);
        }

        void koniecNauki()
        {
            ustaw(ref ustawienia.samouczekZrobiony, true);
            // co pokazał samouczek, to trafia do atlasu — bez wyskakujących tablic
            foreach (var id in new[] { "rasa-0", "ryt-zasiej", "ryt-szept", "ryt-znak", "krew", "wiara", "wiadro", "role", "rozkazy",
                "oddanie", "pielgrzymka", "wydarzenia", "schody", "helmy", "trupy", "dlon",
                "straznicy", "boss", "droga", "skorupa", "rdzen", "sen", "pauza", "brama" }) Odkrycia.odkrycia.odkryj(id, false);
            faza = "final";
            var g = gra;
            g.dozwolone = new HashSet<string>();
            g.ui.verb = null; g.ui.tool = null; g.ui.selected = null;
            g.cel = null; g.pauza = false; g.zapiski = false;
            app.dzwiek.toll();
        }

        void graj()
        {
            gra.dozwolone = null;
            app.idz("gra", "nowa");   // pierwsza prawdziwa góra (Remake v2: zawsze Koszmar)
        }

        void doMenu()
        {
            gra.dozwolone = null;
            app.idz("menu", faza == "final" ? new EkranMenu.Dane { komunikat = "Samouczek skończony. Pierwsze tablice czekają w atlasie." } : null);
        }

        // ------------------------------------------------------------- czas i obraz

        public override void krok(double dt, double teraz)
        {
            if (faza == "scena") { film.krok(dt); return; }
            blysk = Math.Max(0, blysk - dt * 0.0016);
            gra.krok(dt, teraz);
            if (faza != "lekcja") return;
            aktualizuj(null);
            // cel na płycie idzie za bieżącym etapem; kamera nie ucieka od niego sama
            var cur = biezacyEtap;
            var wsk = !zrobiony && cur >= 0 ? wskazanie(cur) : null;
            gra.cel = wsk?.typ == "swiat" ? wsk.cel : null;
            if (wsk?.typ == "swiat") gra.przejmijKamere();
        }

        public override void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            if (faza == "scena") { film.rysuj(ctx, w, h, teraz); return; }
            vh = h;
            gra.rysuj(ctx, w, h, teraz);
            if (faza == "final") { rysujFinal(ctx, w, h, teraz); return; }
            // karta wydarzenia ma pierwszeństwo: karta samouczka chowa się, póki gracz nie wybierze
            if (gra.sim.wydarzenia.biezace != null)
            {
                poleDalej = poleWstecz = polePomin = poleKarta = poleGraj = poleMenu = poleZwin = null;
                return;
            }
            var cur = biezacyEtap;
            var etap = !zrobiony && cur >= 0 ? rozdzial.etapy[cur] : null;
            var wsk = etap != null ? wskazanie(cur) : null;
            var cel = naEkranie(wsk);
            if (cel != null && wsk?.typ != "swiat") przyciemnij(ctx, w, h, cel.Value, teraz);
            if (etap?.gest != null) rysujGest(ctx, etap.gest, teraz);
            var karta = rysujKarte(ctx, w, teraz, cel);
            if (cel != null) strzalka(ctx, karta, cel.Value, teraz);
        }

        /// <summary>Wskazanie jako prostokąt na ekranie (środek i promień dla pierścieni).</summary>
        (Obszar p, bool okrag)? naEkranie(Wskazanie? wsk)
        {
            if (wsk == null) return null;
            if (wsk.typ == "punkt") return (new Obszar { x = wsk.x - wsk.r, y = wsk.y - wsk.r, w = wsk.r * 2, h = wsk.r * 2 }, true);
            if (wsk.typ == "obszar") return (new Obszar { x = wsk.o.x - 8, y = wsk.o.y - 8, w = wsk.o.w + 16, h = wsk.o.h + 16 }, false);
            var cam = gra.cam; var plate = gra.plate;
            var z = cam.zoom;
            var sx = plate.x + (wsk.cel!.x - (cam.x - cam.vw / 2 / z)) * z;
            var sy = plate.y + (wsk.cel.y - (cam.y - cam.vh / 2 / z)) * z;
            if (sx < plate.x || sy < plate.y || sx > plate.x + plate.w || sy > plate.y + plate.h) return null;
            var r = Math.Max(22, wsk.cel.r * z) * 1.35;
            return (new Obszar { x = sx - r, y = sy - r, w = r * 2, h = r * 2 }, true);
        }

        /// <summary>Reszta ekranu przygasa — jasne zostaje tylko to, w co trzeba kliknąć.</summary>
        void przyciemnij(IPlotno ctx, double w, double h, (Obszar p, bool okrag) cc, double teraz)
        {
            var c = cc.p;
            var puls = 0.5 + 0.5 * JsMath.Sin(teraz * 0.005);
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            double cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            if (cc.okrag)
            {
                var r = c.w / 2 + 4;
                ctx.moveTo(cx + r, cy);
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
            }
            else ctx.rect(c.x, c.y, c.w, c.h);
            ctx.fillStyle = "rgba(6,4,3,0.5)";
            ctx.fill("evenodd");
            ctx.strokeStyle = rgba(BARWA.zarBlady, 0.55 + 0.4 * puls);
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (cc.okrag) ctx.arc(cx, cy, c.w / 2 + 2 + puls * 3, 0, Math.PI * 2);
            else ctx.rect(c.x - puls * 3, c.y - puls * 3, c.w + puls * 6, c.h + puls * 6);
            ctx.stroke();
            ctx.restore();
        }

        /// <summary>Linia od karty do celu, z grotem — „tu kliknij" bez słów.</summary>
        void strzalka(IPlotno ctx, Obszar karta, (Obszar p, bool okrag) cc, double teraz)
        {
            var c = cc.p;
            double tx = c.x + c.w / 2, ty = c.y + c.h / 2;
            var sx = Math.Max(karta.x, Math.Min(karta.x + karta.w, tx));
            var sy = Math.Max(karta.y, Math.Min(karta.y + karta.h, ty));
            double dx = tx - sx, dy = ty - sy;
            var d = Math.Sqrt(dx * dx + dy * dy);
            var r = cc.okrag ? c.w / 2 + 8 : Math.Min(c.w, c.h) / 2 + 8;
            if (d < r + 30) return;
            double ex = tx - dx / d * r, ey = ty - dy / d * r;
            // lekki łuk: linia rylca, nie wskaźnik z programu biurowego
            double mx = (sx + ex) / 2 - dy / d * Math.Min(40, d * 0.12), my = (sy + ey) / 2 + dx / d * Math.Min(40, d * 0.12);
            ctx.save();
            ctx.strokeStyle = rgba(BARWA.zarBlady, 0.8);
            ctx.lineWidth = 1.6;
            ctx.setLineDash(7, 6);
            ctx.lineDashOffset = -teraz * 0.03;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();
            ctx.setLineDash();
            var kat = JsMath.Atan2(ey - my, ex - mx);
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - JsMath.Cos(kat - 0.45) * 13, ey - JsMath.Sin(kat - 0.45) * 13);
            ctx.lineTo(ex - JsMath.Cos(kat + 0.45) * 13, ey - JsMath.Sin(kat + 0.45) * 13);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        /// <summary>Pokaz gestu na środku płyty: palec, który przeciąga, albo kółko myszy.</summary>
        void rysujGest(IPlotno ctx, string gest, double teraz)
        {
            var p = gra.plate;
            double cx = p.x + p.w / 2, cy = p.y + p.h * 0.78;
            var t = (teraz - odEtapu) * 0.0014;
            ctx.save();
            ctx.strokeStyle = rgba(BARWA.atramentMocny, 0.85);
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.85);
            ctx.lineWidth = 1.6;
            ctx.font = $"italic {S(Math.Max(14, p.w / 70))}px {Ink.SERIF}";
            ctx.textAlign = "center";
            if (gest == "przeciagnij")
            {
                var f = (t % 2) / 2;
                var x = cx - 70 + JsMath.Sin(f * Math.PI) * 140;
                ctx.globalAlpha = 0.35;
                ctx.beginPath(); ctx.moveTo(cx - 70, cy); ctx.lineTo(x, cy); ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.beginPath(); ctx.arc(x, cy, 9, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x, cy, 15 + 3 * JsMath.Sin(t * 6), 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,7,6,0.8)";
                ctx.strokeText("przeciągnij", cx, cy + 40);
                ctx.fillText("przeciągnij", cx, cy + 40);
            }
            else
            {
                // mysz z kółkiem i rosnący pierścień obok
                double mx = cx - 40, my = cy;
                ctx.beginPath();
                ctx.moveTo(mx - 14, my - 6);
                ctx.arcTo(mx - 14, my - 24, mx, my - 24, 13);
                ctx.arcTo(mx + 14, my - 24, mx + 14, my - 6, 13);
                ctx.lineTo(mx + 14, my + 12);
                ctx.arcTo(mx + 14, my + 26, mx, my + 26, 13);
                ctx.arcTo(mx - 14, my + 26, mx - 14, my + 12, 13);
                ctx.closePath();
                ctx.stroke();
                var k = JsMath.Sin(t * 3);
                ctx.beginPath(); ctx.moveTo(mx, my - 17 + k * 3); ctx.lineTo(mx, my - 9 + k * 3); ctx.stroke();
                var r = 12 + 8 * (0.5 + 0.5 * k);
                ctx.beginPath(); ctx.arc(cx + 40, my, r, 0, Math.PI * 2); ctx.stroke();
                ctx.fillText(k > 0 ? "−" : "+", cx + 40, my + 6);
                ctx.lineWidth = 3; ctx.strokeStyle = "rgba(10,7,6,0.8)";
                var napis = STEROWANIE.pokazKlawisze ? "kółko myszy · dwa palce" : "dwa palce";
                ctx.strokeText(napis, cx, cy + 52);
                ctx.fillText(napis, cx, cy + 52);
            }
            ctx.restore();
        }

        string opisKlawisza(Func<EkranSamouczka, string>? t)
        {
            if (t == null) return "";
            var k = t(this);
            // na telefonie nie ma klawiatury — skrót klawiszowy znika, zostaje tylko opis gestu
            if (AKCJE_KLAWISZY.Contains(k)) return STEROWANIE.pokazKlawisze ? $"klawisz {Keybinds.nazwaKlawisza(Keybinds.klawisze[Enum.Parse<Akcja>(k)])}" : "";
            return k;
        }

        sealed class Uklad { public double rozm; public bool zwarta; public int lWstep; public int[] lEtapy = null!; public int lKoniec; public List<int> widoczne = null!; public double wys; }

        /// <summary>
        /// Karta rozdziału: numer i tytuł, po co to, lista czynności z odhaczaniem, a po
        /// zaliczeniu — co się stało i „Dalej". Siada w rogu płyty, który nie zasłania celu.
        /// </summary>
        Obszar rysujKarte(IPlotno ctx, double w, double teraz, (Obszar p, bool okrag)? celO)
        {
            if (zwinieta) return rysujPasek(ctx, w, teraz);
            var r = rozdzial;
            var p = gra.plate;
            // na telefonie w poziomie karta jest szersza — w wąskiej kolumnie tekst szedł w tyle
            // linijek, że karta wychodziła poza ekran razem z „Rozumiem” i „pomiń”
            var szer = p.waski ? p.w - 16 : p.niski ? Math.Min(560, Math.Max(320, p.w * 0.56)) : Math.Min(440, Math.Max(300, p.w * 0.4));
            var wew = szer - 40;
            var cur = biezacyEtap;
            double m = p.waski ? 8 : p.niski ? 6 : 14;
            var maxWys = p.waski ? p.h - 38 - m : p.h - 2 * m;
            var koniec = r.koniec(this);
            var glowny = zrobiony ? (idx == rozdzialy.Count - 1 ? "Zakończ →" : "Dalej →")
                : cur >= 0 && r.etapy[cur].rozumiem ? "Rozumiem →" : "";

            // Wysokość liczona przed rysowaniem. Karta MUSI zmieścić się na płycie: najpierw
            // mniejsze litery, a gdy to nie wystarcza — tryb zwarty, w którym widać tylko bieżącą
            // czynność (albo, po zaliczeniu, samo podsumowanie). Przyciski zawsze zostają na karcie.
            Uklad zmierz(double rz, bool zwarta)
            {
                ctx.save();
                ctx.font = $"italic {S(rz * 0.86)}px {Ink.SERIF}";
                var lWstep = zwarta ? 0 : Ink.linieAkapitu(ctx, r.wstep, wew);
                ctx.font = $"{S(rz * 0.95)}px {Ink.SERIF}";
                var lEtapy = r.etapy.Select(e => Ink.linieAkapitu(ctx, e.tekst(this), wew - rz * 1.4)).ToArray();
                ctx.font = $"{S(rz)}px {Ink.SERIF}";
                var lKoniec = zrobiony ? Ink.linieAkapitu(ctx, koniec, wew) : 0;
                ctx.restore();
                var widoczne = zwarta ? (zrobiony ? new List<int>() : new List<int> { Math.Max(0, cur) }) : Enumerable.Range(0, r.etapy.Count).ToList();
                var hh = 20 + rz * 3.65 + lWstep * rz * 1.15 - (zwarta ? rz * 0.35 : 0);
                foreach (var i in widoczne)
                {
                    hh += lEtapy[i] * rz * 1.28;
                    if (i == cur && opisKlawisza(r.etapy[i].klawisz) != "") hh += rz * 1.0;
                }
                if (zrobiony) hh += rz * 0.6 + lKoniec * rz * 1.3;
                hh += glowny != "" ? rz * 3.1 : rz * 2.5;
                return new Uklad { rozm = rz, zwarta = zwarta, lWstep = lWstep, lEtapy = lEtapy, lKoniec = lKoniec, widoczne = widoczne, wys = hh };
            }
            var bazowy = Math.Max(p.niski ? 13 : 15, Math.Min(20, w / 62));
            var uklad = zmierz(bazowy, false);
            foreach (var zw in new[] { false, true })
            {
                var dosc = false;
                for (var rz = bazowy; rz >= 11; rz -= 1)
                {
                    uklad = zmierz(rz, zw);
                    if (uklad.wys <= maxWys) { dosc = true; break; }
                }
                if (dosc) break;
            }
            var rozm = uklad.rozm; var lWstepU = uklad.lWstep; var lEtapyU = uklad.lEtapy; var widoczneU = uklad.widoczne; var zwartaU = uklad.zwarta;
            var wys = Math.Min(uklad.wys, Math.Max(maxWys, rozm * 6));
            var lhE = rozm * 1.28;

            // róg, który nie zasłania celu
            var rogi = p.waski
                // wąsko: pod progiem Znaku i klepsydrą tempa w górnym pasie płyty
                ? new (double x, double y)[] { (p.x + m, p.y + 38), (p.x + m, p.y + p.h - wys - m) }
                : new (double x, double y)[] { (p.x + p.w - szer - m, p.y + m), (p.x + p.w - szer - m, p.y + p.h - wys - m), (p.x + m, p.y + m), (p.x + m, p.y + p.h - wys - m) };
            var (x, y) = rogi[0];
            if (celO is { } co)
            {
                var cel = co.p;
                // róg, który najmniej zasłania cel (zwykle wcale)
                double zakrycie(double rx, double ry) =>
                    Math.Max(0, Math.Min(rx + szer, cel.x + cel.w + 20) - Math.Max(rx, cel.x - 20))
                    * Math.Max(0, Math.Min(ry + wys, cel.y + cel.h + 20) - Math.Max(ry, cel.y - 20));
                var najmniej = double.PositiveInfinity;
                foreach (var (rx, ry) in rogi)
                {
                    var z = zakrycie(rx, ry);
                    if (z < najmniej) { najmniej = z; x = rx; y = ry; }
                    if (z == 0) break;
                }
                // Karta w poziomie zajmuje ponad pół płyty — cel na środku leżał pod nią w każdym rogu
                // i nie dało się w niego trafić. Wtedy płyta odsuwa się tak, żeby cel stanął obok karty.
                var g = gra;
                if (najmniej > 0 && g.cel != null)
                {
                    var p2 = g.plate;
                    var wolnyX = x > p2.x + p2.w / 2 - szer / 2 ? (p2.x + x) / 2 : (x + szer + p2.x + p2.w) / 2;
                    var dx = (cel.x + cel.w / 2 - wolnyX) / g.cam.zoom;
                    g.cam.x += dx; g.camTarget.x += dx;
                    g.cam.clamp(g.sim.world.w, g.sim.world.h);
                }
            }
            var karta = new Obszar { x = x, y = y, w = szer, h = wys };
            poleKarta = karta;
            Ozdoby.ramaKarty(ctx, x, y, szer, wys, 1, tytulKarty(szer), true);
            if (blysk > 0)
            {
                ctx.strokeStyle = rgba(BARWA.zarBlady, blysk * 0.9);
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 4, y - 4, szer + 8, wys + 8);
            }

            // nagłówek: numer rozdziału i kropki postępu
            var lx = x + 20;
            var yy = y + 20 + rozm * 0.7;
            ctx.textAlign = "left";
            // numer rozdziału stoi na zakładce ramy; tu zostają kropki postępu
            int n = rozdzialy.Count; double kr = Math.Max(3, rozm * 0.2), krok = kr * 3.2;
            for (var i = 0; i < n; i++)
            {
                double kx = x + szer - 20 - (n - 1 - i) * krok, ky = yy - rozm * 0.25;
                ctx.beginPath();
                ctx.arc(kx, ky, kr, 0, Math.PI * 2);
                if (i < idx || (i == idx && zrobiony)) { ctx.fillStyle = rgba(BARWA.zarBlady, 0.9); ctx.fill(); }
                else { ctx.strokeStyle = rgba(i == idx ? BARWA.atramentMocny : BARWA.atramentCichy, i == idx ? 0.9 : 0.5); ctx.lineWidth = 1; ctx.stroke(); }
            }
            yy += rozm * 1.55;
            ctx.font = $"{S(rozm * 1.3)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.98);
            ctx.fillText(r.tytul, lx, yy);
            yy += rozm * 1.05;
            if (!zwartaU)
            {
                ctx.font = $"italic {S(rozm * 0.86)}px {Ink.SERIF}";
                ctx.fillStyle = rgba(BARWA.atrament, 0.78);
                Ink.akapit(ctx, r.wstep, lx, yy, wew, rozm * 1.15);
                yy += lWstepU * rozm * 1.15 + rozm * 0.35;
            }

            // lista czynności (w trybie zwartym tylko bieżąca)
            foreach (var i in widoczneU)
            {
                var e = r.etapy[i];
                var zrob = zaliczoneEtapy[i];
                var biezacy = i == cur;
                var ex = lx + rozm * 1.4;
                yy += rozm * 0.45;
                ctx.font = $"{S(rozm * 0.95)}px {Ink.SERIF}";
                // znacznik: ✓ zrobione, wskazówka dla bieżącego, kropka dla przyszłych
                ctx.textAlign = "center";
                if (zrob)
                {
                    ctx.strokeStyle = rgba(BARWA.zarBlady, 0.9);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(lx + rozm * 0.1, yy - rozm * 0.32);
                    ctx.lineTo(lx + rozm * 0.38, yy - rozm * 0.08);
                    ctx.lineTo(lx + rozm * 0.85, yy - rozm * 0.7);
                    ctx.stroke();
                }
                else if (biezacy)
                {
                    var drg = JsMath.Sin(teraz * 0.008) * 2;
                    ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
                    ctx.beginPath();
                    ctx.moveTo(lx + rozm * 0.2 + drg, yy - rozm * 0.62);
                    ctx.lineTo(lx + rozm * 0.75 + drg, yy - rozm * 0.33);
                    ctx.lineTo(lx + rozm * 0.2 + drg, yy - rozm * 0.04);
                    ctx.closePath();
                    ctx.fill();
                }
                else
                {
                    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.6);
                    ctx.beginPath(); ctx.arc(lx + rozm * 0.45, yy - rozm * 0.33, 2.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.textAlign = "left";
                ctx.fillStyle = zrob ? rgba(BARWA.atramentCichy, 0.8) : biezacy ? rgba(BARWA.atramentMocny, 1) : rgba(BARWA.atramentCichy, 0.6);
                Ink.akapit(ctx, e.tekst(this), ex, yy, wew - rozm * 1.4, lhE);
                yy += (lEtapyU[i] - 1) * lhE;
                if (biezacy && opisKlawisza(e.klawisz) != "")
                {
                    yy += rozm * 1.0;
                    ctx.font = $"italic {S(rozm * 0.78)}px {Ink.SERIF}";
                    ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
                    ctx.fillText(opisKlawisza(e.klawisz), ex, yy);
                }
                yy += rozm * 0.83;
            }

            if (zrobiony)
            {
                yy += rozm * 0.6;
                ctx.font = $"{S(rozm)}px {Ink.SERIF}";
                ctx.fillStyle = rgba(BARWA.zarBlady, 0.97);
                Ink.akapit(ctx, koniec, lx, yy, wew, rozm * 1.3);
            }

            // przyciski: główny po prawej, „wstecz" i „pomiń" cicho po lewej
            var by = y + wys - rozm * 1.45;
            poleDalej = null; poleWstecz = null; polePomin = null;
            if (glowny != "")
            {
                ctx.font = $"{S(rozm * 1.05)}px {Ink.SERIF}";
                double bw = ctx.measureText(glowny).width + rozm * 1.6, bh = rozm * 1.9;
                double bx = x + szer - 18 - bw, byy = by - bh * 0.68;
                var puls = 0.5 + 0.5 * JsMath.Sin(teraz * 0.005);
                ctx.fillStyle = rgba(BARWA.zarBlady, 0.16 + 0.1 * puls);
                ctx.fillRect(bx, byy, bw, bh);
                ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7 + 0.3 * puls);
                ctx.lineWidth = 1.4;
                ctx.strokeRect(bx + 0.5, byy + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
                ctx.textAlign = "center";
                ctx.fillText(glowny, bx + bw / 2, by);
                poleDalej = new Obszar { x = bx, y = byy, w = bw, h = bh };
            }
            ctx.font = $"italic {S(Math.Max(13, rozm * 0.78))}px {Ink.SERIF}";
            ctx.textAlign = "left";
            var sx = lx;
            if (idx > 0)
            {
                var t = "← wstecz";
                var tw = ctx.measureText(t).width;
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.9);
                ctx.fillText(t, sx, by);
                poleWstecz = new Obszar { x = sx - 6, y = by - rozm, w = tw + 12, h = rozm * 1.6 };
                sx += tw + rozm * 1.2;
            }
            if (!zrobiony)
            {
                var t = "pomiń";
                var tw = ctx.measureText(t).width;
                ctx.fillStyle = rgba(BARWA.atramentCichy, 0.75);
                ctx.fillText(t, sx, by);
                polePomin = new Obszar { x = sx - 6, y = by - rozm, w = tw + 12, h = rozm * 1.6 };
            }
            ctx.font = $"italic {S(Math.Max(12, rozm * 0.66))}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.55);
            ctx.fillText(STEROWANIE.pokazKlawisze ? "esc — wyjście z samouczka" : "≡ w rogu — wyjście z samouczka", lx, y + wys - rozm * 0.45);
            // zwiń — karta chowa się do paska, gdy zasłania płytę (póki krok nie jest zaliczony)
            poleZwin = null;
            if (!zrobiony)
            {
                // zakładka na górnej krawędzi, po prawej — nie wchodzi na przyciski na dole karty
                ctx.font = $"italic {S(Math.Max(12, rozm * 0.72))}px {Ink.SERIF}";
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                var t = "zwiń ▴";
                var tw = ctx.measureText(t).width;
                double zx = x + szer - 14, zy = y;
                ctx.fillStyle = rgba(BARWA.sadza, 1);
                ctx.fillRect(zx - tw - 8, zy - rozm * 0.55, tw + 14, rozm * 1.1);
                ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
                ctx.fillText(t, zx, zy + 1);
                ctx.textBaseline = "alphabetic";
                poleZwin = new Obszar { x = zx - tw - 10, y = zy - rozm * 0.8, w = tw + 18, h = rozm * 1.6 };
            }
            // (TS: restore bez pary — przy pustym stosie nic nie robi; zostawione dosłownie)
            ctx.restore();
            return karta;
        }

        /// <summary>Napis na zakładce karty — na wąskiej karcie krótszy, żeby zmieścił się obok „zwiń”.</summary>
        string tytulKarty(double szer)
        {
            var r = $"rozdział {idx + 1} z {rozdzialy.Count}";
            return szer < 460 ? r : $"samouczek · {r}";
        }

        /// <summary>Zwinięta karta: jeden pasek z bieżącą czynnością; dotknięcie rozwija.</summary>
        Obszar rysujPasek(IPlotno ctx, double w, double teraz)
        {
            var p = gra.plate;
            var rozm = Math.Max(13, Math.Min(17, w / 70));
            var szer = p.waski ? p.w - 16 : Math.Min(440, Math.Max(300, p.w * 0.4));
            var wys = rozm * 2.6;
            var x = p.waski ? p.x + 8 : p.x + p.w - szer - 14;
            var y = p.waski ? p.y + 38 : p.y + 14;
            Ozdoby.ramaKarty(ctx, x, y, szer, wys, 1, tytulKarty(szer), true);
            var cur = biezacyEtap;
            var tekst = cur >= 0 ? rozdzial.etapy[cur].tekst(this) : rozdzial.tytul;
            ctx.save();
            ctx.textBaseline = "middle";
            ctx.font = $"italic {S(rozm * 0.8)}px {Ink.SERIF}";
            ctx.textAlign = "right";
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.85);
            var roz = "rozwiń ▾";
            var rw = ctx.measureText(roz).width;
            ctx.fillText(roz, x + szer - 14, y + wys / 2 + 1);
            ctx.textAlign = "left";
            ctx.font = $"{S(rozm)}px {Ink.SERIF}";
            var t = tekst;
            var maxW = szer - 44 - rw;
            while (ctx.measureText(t).width > maxW && t.Length > 8) t = t.Substring(0, t.Length - 2);
            if (t != tekst) t += "…";
            var drg = JsMath.Sin(teraz * 0.008) * 2;
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.95);
            ctx.beginPath();
            ctx.moveTo(x + 14 + drg, y + wys / 2 - rozm * 0.3); ctx.lineTo(x + 14 + rozm * 0.5 + drg, y + wys / 2); ctx.lineTo(x + 14 + drg, y + wys / 2 + rozm * 0.3);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = rgba(BARWA.atramentMocny, 0.97);
            ctx.fillText(t, x + 20 + rozm * 0.6, y + wys / 2 + 1);
            ctx.restore();
            var pasek = new Obszar { x = x, y = y, w = szer, h = wys };
            poleKarta = pasek;
            poleDalej = null; poleWstecz = null; polePomin = null; poleZwin = null;
            return pasek;
        }

        /// <summary>Ostatnia karta: co dalej — prawdziwa gra albo menu.</summary>
        void rysujFinal(IPlotno ctx, double w, double h, double teraz)
        {
            var rozm = Math.Max(16, Math.Min(22, w / 56));
            var szer = Math.Min(560, w - 32);
            var tekst = "Umiesz już wszystko, czego trzeba na początek. Nad płytą zawsze stoi jedno zdanie: co teraz najpilniejsze — dotknij go, a kamera pojedzie na miejsce. Rozległe jaskinie, schody kute w skale i to, co patrzy z ciemności — resztę odkryjesz sam. W atlasie (przycisk z księgą) czekają już pierwsze tablice — kolejne odkryjesz, grając.";
            ctx.save();
            ctx.fillStyle = "rgba(6,4,3,0.55)";
            ctx.fillRect(0, 0, w, h);
            ctx.font = $"{S(rozm)}px {Ink.SERIF}";
            var linie = Ink.linieAkapitu(ctx, tekst, szer - 56);
            var wys = rozm * 3.4 + linie * rozm * 1.35 + rozm * 4.6;
            double x = (w - szer) / 2, y = Math.Max(16, (h - wys) / 2);
            Ink.panel(ctx, x, y, szer, wys, 0.97);
            ctx.textAlign = "center";
            ctx.font = $"{S(rozm * 1.5)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
            ctx.fillText("Samouczek skończony", w / 2, y + rozm * 2.2);
            ctx.font = $"{S(rozm)}px {Ink.SERIF}";
            ctx.fillStyle = rgba(BARWA.atrament, 0.9);
            Ink.akapit(ctx, tekst, w / 2, y + rozm * 3.8, szer - 56, rozm * 1.35, "center");

            var by = y + wys - rozm * 1.6;
            var puls = 0.5 + 0.5 * JsMath.Sin(teraz * 0.005);
            ctx.font = $"{S(rozm * 1.05)}px {Ink.SERIF}";
            string t1 = "Zagraj naprawdę →", t2 = "wróć do menu";
            double w1 = ctx.measureText(t1).width + rozm * 1.8, bh = rozm * 2;
            var x1 = w / 2 + rozm * 0.5;
            ctx.fillStyle = rgba(BARWA.zarBlady, 0.16 + 0.1 * puls);
            ctx.fillRect(x1, by - bh * 0.68, w1, bh);
            ctx.strokeStyle = rgba(BARWA.zarBlady, 0.7 + 0.3 * puls);
            ctx.lineWidth = 1.4;
            ctx.strokeRect(x1 + 0.5, by - bh * 0.68 + 0.5, w1 - 1, bh - 1);
            ctx.fillStyle = rgba(BARWA.atramentMocny, 1);
            ctx.fillText(t1, x1 + w1 / 2, by);
            poleGraj = new Obszar { x = x1, y = by - bh * 0.68, w = w1, h = bh };
            ctx.font = $"italic {S(rozm * 0.95)}px {Ink.SERIF}";
            var w2 = ctx.measureText(t2).width;
            var x2 = w / 2 - rozm * 1.2 - w2;
            ctx.fillStyle = rgba(BARWA.atramentCichy, 0.95);
            ctx.textAlign = "left";
            ctx.fillText(t2, x2, by);
            poleMenu = new Obszar { x = x2 - 8, y = by - rozm, w = w2 + 16, h = rozm * 1.7 };
            ctx.restore();
        }

        // ---------------------------------------------------------------- wejście

        public override void dotyk(Wskaznik e, Faza f)
        {
            if (faza == "scena")
            {
                if (f == Faza.dol) { if (film.trafiaPomin(e.clientX, e.clientY)) film.pomin(); else film.dalej(); }
                return;
            }
            double x = e.clientX, y = e.clientY;
            if (faza == "final")
            {
                if (f != Faza.dol) return;
                if (wPolu(poleGraj, x, y)) graj();
                else if (wPolu(poleMenu, x, y)) doMenu();
                return;
            }
            if (f == Faza.dol)
            {
                if (zwinieta && wPolu(poleKarta, x, y)) { zwinieta = false; app.gesty.klik(); return; }
                if (wPolu(poleZwin, x, y)) { zwinieta = true; app.gesty.klik(); return; }
                if (wPolu(poleDalej, x, y)) { if (zrobiony) dalej(); else rozumiem(); return; }
                if (wPolu(poleWstecz, x, y)) { wstecz(); return; }
                if (wPolu(polePomin, x, y)) { dalej(); return; }
                // karta leży na płycie, ale nie jest skałą — z wybranym rytem klik w nią nie może
                // drążyć ani siać; bez rytu przeciągnięcie zaczęte na karcie przesuwa widok jak zwykle
                if (wPolu(poleKarta, x, y) && gra.ui.verb != null) return;
            }
            gra.dotyk(e, f);
        }

        public override void kolko(Kolko e)
        {
            if (faza == "scena") return;
            gra.kolko(e);
        }

        public override void klawisz(Akcja? akcja, Klawisz e)
        {
            if (akcja == Akcja.menu)
            {
                if (faza == "scena") { film.pomin(); return; }
                doMenu();
                return;
            }
            if (faza == "scena") { if (e.key == " " || e.key == "Enter") film.dalej(); return; }
            if (faza == "final") { if (e.key == "Enter") graj(); return; }
            if (e.key == "Enter")
            {
                if (zrobiony) dalej(); else rozumiem();
                return;
            }
            gra.klawisz(akcja, e);
        }
        // (TS: samouczek nie przekazuje puszczenia klawisza do gry — Tab z liczbami zostaje włączony; dosłownie)
    }
}
