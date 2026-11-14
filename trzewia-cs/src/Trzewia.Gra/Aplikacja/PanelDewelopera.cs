// Port: alpha-1/src/app/devpanel.ts — OKIENKO DEWELOPERA.
// W TS to okienko z HTML (div, przyciski, pola wyboru, pole szukania, lista rozwijana) nad płótnem. W C# nie ma DOM-u,
// więc jest rysowane na płótnie — ta sama treść, ten sam układ (flex z zawijaniem), te same kolory, napisy, podpowiedzi
// (title → dymek po chwili nad przyciskiem) i te same skutki. Różnice wymuszone brakiem przeglądarki:
//   • „zapisz .txt” zapisuje plik do folderu gracza (Dokumenty\My Games\Trzewia) zamiast pobierania z przeglądarki,
//   • położenie i zwinięcie pamięta plik panel-dewelopera.json w tym samym folderze (w TS: localStorage),
//   • paski przewijania są tylko do oka — przewija kółko (całe okienko i osobno lista logów),
//   • klawisze bierze tylko pole tekstowe z kursorem (w DOM-ie także przycisk, w który kliknięto — tego nie ma),
//   • tekstu nie da się zaznaczać myszą (user-select:text).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Symulacja.Dziennik;
using static Trzewia.Nastawy.NastawyCzas;
using static Trzewia.Nastawy.NastawySterowanie;
using Gospodarz = Trzewia.Rdzen.Gospodarz;
using JS = Trzewia.Js.Js;
using SLud = Trzewia.Symulacja.Lud;

namespace Trzewia.Aplikacja
{
    public sealed class PanelDewelopera
    {
        sealed class Kategoria { public string kat = "", nazwa = "", kolor = ""; }

        static readonly Kategoria[] KATEGORIE =
        {
            new Kategoria { kat = "praca", nazwa = "zajęcia", kolor = "#b9c4a8" },
            new Kategoria { kat = "blok", nazwa = "bloki", kolor = "#d8b27a" },
            new Kategoria { kat = "zgon", nazwa = "zgony", kolor = "#e07a6e" },
            new Kategoria { kat = "narodziny", nazwa = "narodziny", kolor = "#9fd39a" },
            new Kategoria { kat = "karta", nazwa = "karty", kolor = "#c9a6e8" },
            new Kategoria { kat = "rytual", nazwa = "rytuał", kolor = "#f2d36b" },
            new Kategoria { kat = "swiat", nazwa = "kronika", kolor = "#9fc3e0" },
        };

        const string PAMIEC = "panel-dewelopera.json";
        const string FONT = "11px ui-monospace,Consolas,monospace";
        const string FONT_B = "bold 11px ui-monospace,Consolas,monospace";
        /// <summary>11px × line-height 1.35.</summary>
        const double LH = 14.85;
        const double SZEROKOSC = 390;

        /// <summary>Tiki gry → „mm:ss” czasu gry.</summary>
        static string czas(double tick)
        {
            var s = Math.Max(0, Math.Floor(tick / (TIKOW_NA_MINUTE / 60)));
            return $"{JS.S(Math.Floor(s / 60)).PadLeft(2, '0')}:{JS.S(s % 60).PadLeft(2, '0')}";
        }

        static double round(double v) => Math.Floor(v + 0.5);

        readonly Func<Sim> sim;
        readonly Action<double, double> pokazMiejsce;
        readonly Action<double> nowaGra;

        readonly HashSet<string> filtry = new HashSet<string>(KATEGORIE.Select(k => k.kat));
        double doczytane = -1;
        bool widoczny, zwiniety;
        double ostatnieOdswiezenie;
        Sim? ostatniSim;
        string szukaj = "";
        string stanSwiata = "", inspektor = "", ziarnoNapis = "", wynik = "";
        string ziarnoPole = "";
        double klatki, klatkiOd, fps;
        (double tick, double t) tikiOd = (0, 0);
        double tikowNaSek;

        /// <summary>Wpisy na liście logów (po filtrach i szukaniu), jak dzieci diva listy.</summary>
        sealed class Linia { public WpisDziennika w = null!; public string tekst = "", kolor = ""; public double? nr; public bool gdzie; }
        readonly List<Linia> lista = new List<Linia>();

        // okno: położenie (null — w rogu: right 12, top 96), przewijanie, przeciąganie, fokus, lista rozwijana
        double? left, top;
        double przewin, przewinListy;
        bool listaNaDole = true;
        (double x, double y, double l, double t, int id)? ciagnie;
        string? fokus;
        bool rozwinieta;
        double przewinRozwinietej;
        readonly HashSet<int> moje = new HashSet<int>();
        (double x, double y) kursor = (-1, -1);
        Pole? najechane; double najechaneOd;

        sealed class Pole
        {
            public double x, y, w, h;
            public Action? akcja;
            public string? opis;
            public bool w_(double px, double py) => px >= x && px <= x + w && py >= y && py <= y + h;
        }
        readonly List<Pole> pola = new List<Pole>();
        (double x, double y, double w, double h) ramka, cialo, obszarListy;
        double wysokoscTresci, wysokoscListy;
        readonly List<(Pole p, string tekst)> opcje = new List<(Pole, string)>();

        public PanelDewelopera(Func<Sim> sim, Action<double, double> pokazMiejsce, Action<double> nowaGra)
        {
            this.sim = sim; this.pokazMiejsce = pokazMiejsce; this.nowaGra = nowaGra;
            wczytajPolozenie();
        }

        // ---------------------------------------------------------------- narzędzia

        void pokazWynik(string t) => wynik = t;

        /// <summary>Nowy członek ludu przy siedzibie — bez krwi i bez czekania na skałę.</summary>
        void przywolaj(string rola)
        {
            var s = sim();
            var klan = SLud.klanLudu(s);
            if (klan == null) { pokazWynik("Nie ma ludu."); return; }
            var m = SLud.podloga(s, klan.hx, klan.hy) ?? (klan.hx, klan.hy);
            var c = s.spawn(Race.GOBLIN, klan.id, m.x, m.y);
            if (c == null) { pokazWynik("Nie da się tu nikogo postawić."); return; }
            SLud.nadajRole(s, c, rola);
            c.age = 0;
            c.devotion = Math.Max(c.devotion, klan.devotion);
            c.od = s.tick;
            s.efekt(c.x, c.y, "zasiew");
            zapisz(s, "narodziny", $"narzędzie: {SLud.NAZWA_ROLI[rola].ToLowerInvariant()} #{JS.S(c.id)} przy siedzibie", c.x, c.y);
            pokazWynik($"{SLud.NAZWA_ROLI[rola]} #{JS.S(c.id)} przy siedzibie.");
        }

        void odkryj()
        {
            var s = sim();
            var w = s.world;
            var nowych = w.observe(JS.ToInt32(w.w) >> 1, JS.ToInt32(w.h) >> 1, Math.Max(w.w, w.h), s.tick);
            w.countUnknown(s.tick);
            pokazWynik($"Odkryto {JS.S(nowych)} kafli.");
        }

        void wymusKarte(string wartosc)
        {
            var s = sim();
            if (wartosc != "" && s.wydarzenia.biezace == null && s.ending == null)
            {
                var lan = wartosc.StartsWith("lancuch:") ? wartosc.Substring(8) : null;
                var ok = lan != null ? Wydarzenia.wymusLancuch(s, lan) : Wydarzenia.wylosuj(s, wartosc) != null;
                pokazWynik(ok ? "Karta na stole." : $"Karta „{lan ?? wartosc}” nie pasuje teraz do świata.");
                if (!ok) zapisz(s, "karta", $"karta „{lan ?? wartosc}” nie pasuje teraz do świata");
            }
            else if (wartosc != "") pokazWynik("Najpierw rozstrzygnij kartę, która leży.");
        }

        /// <summary>Pole type=number: wartość to liczba zmiennoprzecinkowa w zapisie HTML, inaczej pusta.</summary>
        static readonly Regex LICZBA = new Regex(@"^-?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$");
        void graj()
        {
            if (!LICZBA.IsMatch(ziarnoPole)) return;
            var z = Math.Floor(double.Parse(ziarnoPole, System.Globalization.CultureInfo.InvariantCulture));
            if (double.IsFinite(z)) nowaGra(z);
        }

        // ---------------------------------------------------------------- pokazywanie

        void pokazStan(Sim s)
        {
            var r = SLud.liczRole(s);
            var wierni = Pielgrzymka.najwierniejsza(s);
            var t = DEV.mnoznik == 1 ? "czas zwykły" : $"czas ×{Przyciski.mnoznikNapis(DEV.mnoznik)}";
            var linie = new[]
            {
                $"{czas(s.tick)} · tik {JS.S(s.tick)} · {(DEV.pauza ? "pauza dewelopera" : t)} · {JS.S(tikowNaSek)} tik/s · {JS.S(fps)} kl/s · krok {JS.ToFixed(DEV.msKroku, 2)} ms",
                $"lud {JS.S(r.pobozny + r.robotnik + r.rycerz)}: pobożni {JS.S(r.pobozny)} · robotnicy {JS.S(r.robotnik)} · rycerze {JS.S(r.rycerz)} · jedzenie {JS.S(Wiadro.porcjiWWiadrach(s))} porcji · wiadro za {JS.S(Math.Ceiling(Wiadro.doNastepnego(s) / 120))} s",
                $"wiara {JS.S(Math.Floor(s.wiara))} · krew {JS.S(Math.Floor(s.krew))} · żelazo {JS.S(s.zelazo)} · złoto {JS.S(s.zloto)} · oddanie {JS.S(round((wierni?.devotion ?? 0) * 100))}% · sen {JS.S(round(s.sen * 100))}% · pęknięć {JS.S(s.rytual.pekniecia)}{(s.rytual.otwarta ? " · rdzeń otwarty" : "")}",
                Dlon.opisDloni(s),
            };
            stanSwiata = string.Join("\n", linie);
        }

        /// <summary>Inspektor: śledzona postać i kafel pod kursorem.</summary>
        void pokazInspektor(Sim s)
        {
            var linie = new List<string>();
            if (DEV.sledzony >= 0)
            {
                var c = s.creatures.FirstOrDefault(q => q.id == DEV.sledzony);
                if (c == null || c.dead) linie.Add($"#{JS.S(DEV.sledzony)} — nie żyje");
                else
                {
                    string p(double v) => $"{JS.S(round(v * 100))}%";
                    linie.Add($"{kto(s, c)}{(c.straznik == true ? " · Strażnik Snu" : "")}");
                    linie.Add($"życie {JS.S(round(c.hp))} · głód {p(c.hunger)} · wiara {p(c.devotion)} · szał {p(c.mad)} · strach {p(c.fear)}");
                    if (!string.IsNullOrEmpty(c.zamiar)) linie.Add($"zamiar: {c.zamiar}{(c.zamiarDo != null && c.zamiarDo > s.tick ? $" (jeszcze {JS.S(Math.Ceiling((c.zamiarDo.Value - s.tick) / 120))} s)" : "")}");
                    var praca = c.job >= 0 && c.job < OPIS_PRACY.Length ? OPIS_PRACY[c.job] : "zajęcie " + JS.S(c.job);
                    linie.Add($"{praca} → ({JS.S(c.jx)}, {JS.S(c.jy)}) · jest ({JS.S(Math.Floor(c.x))}, {JS.S(Math.Floor(c.y))}){(c.droga != null ? $" · droga {JS.S(c.droga.Count - (c.drogaI ?? 0))} kafli" : "")} · stoi {JS.S(c.stall)} tików");
                    var stany = SLud.stanyPostaci(s, c).Select(q => q.nazwa).ToList();
                    if (stany.Count > 0) linie.Add($"stany: {string.Join(", ", stany)}");
                }
            }
            else linie.Add("Shift+klik na postać w świecie albo klik we wpis z #numerem.");
            var k = DEV.kursor;
            if (k != null)
            {
                var w = s.world;
                if (w.inb(k.x, k.y))
                {
                    var i = (int)w.idx(k.x, k.y); var t = (int)w.tile[i];
                    var tu = 0;
                    foreach (var c in s.creatures) if (!c.dead && Math.Floor(c.x) == k.x && Math.Floor(c.y) == k.y) tu++;
                    linie.Add($"kafel ({JS.S(k.x)}, {JS.S(k.y)}): {(t < NAZWY_KAFLI.Length ? NAZWY_KAFLI[t] : JS.S(t))} · twardość {JS.ToFixed(Tiles.HARDNESS[t], 1)}{(Tiles.PASSABLE[t] != 0 ? " · przejście" : "")}{(w.ever[i] != 0 ? "" : " · nieznany")}{(tu != 0 ? $" · postaci {tu}" : "")}");
                }
            }
            inspektor = string.Join("\n", linie);
        }

        /// <summary>Logi do pliku tekstowego (wszystkie zebrane, bez filtrów) ze stanem świata na górze.</summary>
        void eksport()
        {
            var s = sim();
            var linie = DZIENNIK.wpisy.Select(w => $"[{czas(w.tick)}] [{w.kat}] {w.tekst}{(w.x != null ? $" ({JS.S(w.x.Value)}, {JS.S(w.y ?? double.NaN)})" : "")}");
            var tekst = $"Trzewia Alpha 0.2 — dziennik dewelopera\nziarno {JS.S(s.seed)}, tik {JS.S(s.tick)}\n\n{stanSwiata}\n\n{string.Join("\n", linie)}\n";
            var nazwa = $"trzewia-dziennik-{JS.S(s.seed)}-{JS.S(s.tick)}.txt";
            var ok = Gospodarz.Pliki.Zapisz(nazwa, tekst);
            pokazWynik(ok ? $"Zapisane: {(Gospodarz.Pliki.Folder != "" ? System.IO.Path.Combine(Gospodarz.Pliki.Folder, nazwa) : nazwa)}" : "Nie udało się zapisać pliku.");
        }

        // ---------------------------------------------------------------- okno

        void zwin(bool z) { zwiniety = z; zapamietaj(); }

        sealed class Polozenie { public bool zwiniety { get; set; } public double? left { get; set; } public double? top { get; set; } }

        void zapamietaj()
        {
            try { Gospodarz.Pliki.Zapisz(PAMIEC, System.Text.Json.JsonSerializer.Serialize(new Polozenie { zwiniety = zwiniety, left = left, top = top })); }
            catch { /* bez pamięci okienko po prostu startuje w rogu */ }
        }

        void wczytajPolozenie()
        {
            try
            {
                var t = Gospodarz.Pliki.Czytaj(PAMIEC);
                if (t == null) return;
                var p = System.Text.Json.JsonSerializer.Deserialize<Polozenie>(t);
                if (p == null) return;
                if (p.left != null && p.top != null) { left = p.left; top = p.top; }      // przycięte do okna przy rysowaniu
                if (p.zwiniety) zwiniety = true;
            }
            catch { /* jak wyżej */ }
        }

        /// <summary>Włącza/wyłącza okienko (i zbieranie logów). Wyłączenie wraca do zwykłego czasu.</summary>
        public void ustaw(bool widoczny)
        {
            DZIENNIK.wlaczony = widoczny;
            if (!widoczny) { DEV.mnoznik = 1; DEV.bezMroku = false; }
            if (widoczny == this.widoczny) return;
            this.widoczny = widoczny;
            if (!widoczny) { fokus = null; rozwinieta = false; moje.Clear(); ciagnie = null; }
            if (widoczny) przebuduj();
        }

        /// <summary>Odświeża stan i dopisuje nowe wpisy (co ~250 ms).</summary>
        public void odswiez(double teraz)
        {
            if (!widoczny) return;
            klatki++;
            if (teraz - ostatnieOdswiezenie < 250) return;
            ostatnieOdswiezenie = teraz;
            var s = sim();
            if (teraz - klatkiOd >= 1000)
            {
                fps = round(klatki * 1000 / (teraz - klatkiOd));
                klatki = 0; klatkiOd = teraz;
                tikowNaSek = tikiOd.t != 0 ? round((s.tick - tikiOd.tick) * 1000 / (teraz - tikiOd.t)) : 0;
                tikiOd = (s.tick, teraz);
            }
            if (zwiniety) return;
            pokazStan(s);
            pokazInspektor(s);
            ziarnoNapis = $"świat {JS.S(s.seed)}";
            if (s != ostatniSim)
            {
                // nowa góra — stare wpisy dotyczą innego świata
                ostatniSim = s;
                DEV.sledzony = -1;
                DZIENNIK.wpisy.Clear();
                lista.Clear();
                doczytane = DZIENNIK.nastepny - 1;
                return;
            }
            foreach (var w in DZIENNIK.wpisy) if (w.nr > doczytane) dopisz(w);
            doczytane = DZIENNIK.nastepny - 1;
            while (lista.Count > DZIENNIK.max) lista.RemoveAt(0);
        }

        void przebuduj()
        {
            lista.Clear();
            foreach (var w in DZIENNIK.wpisy) dopisz(w);
            doczytane = DZIENNIK.nastepny - 1;
            listaNaDole = true;
        }

        static readonly Regex NUMER = new Regex(@"#(\d+)");
        void dopisz(WpisDziennika w)
        {
            if (!filtry.Contains(w.kat)) return;
            var gdzie = w.x != null && w.y != null ? $" ({JS.S(w.x.Value)}, {JS.S(w.y.Value)})" : "";
            var tekst = $"[{czas(w.tick)}] {w.tekst}{gdzie}";
            if (szukaj != "" && !tekst.ToLowerInvariant().Contains(szukaj)) return;
            var k = KATEGORIE.First(q => q.kat == w.kat);
            var nr = NUMER.Match(w.tekst);
            lista.Add(new Linia { w = w, tekst = tekst, kolor = k.kolor, nr = nr.Success ? double.Parse(nr.Groups[1].Value) : (double?)null, gdzie = gdzie != "" });
        }

        // ---------------------------------------------------------------- wejście

        bool nadOknem(double x, double y) => x >= ramka.x && x <= ramka.x + ramka.w && y >= ramka.y && y <= ramka.y + ramka.h;

        /// <summary>Dotknięcie nad okienkiem — zwraca true, gdy je wzięło (gra go nie widzi, jak pod divem w TS).</summary>
        public bool dotyk(Wskaznik e, Faza faza)
        {
            if (!widoczny) return false;
            kursor = (e.clientX, e.clientY);
            if (faza == Faza.dol)
            {
                // lista rozwijana leży nad wszystkim: wybór albo zamknięcie
                if (rozwinieta)
                {
                    rozwinieta = false;
                    var o = opcje.FirstOrDefault(q => q.p.w_(e.clientX, e.clientY));
                    if (o.p != null) { o.p.akcja?.Invoke(); moje.Add(e.pointerId); return true; }
                    if (nadOknem(e.clientX, e.clientY)) { moje.Add(e.pointerId); return true; }
                }
                if (!nadOknem(e.clientX, e.clientY)) { fokus = null; return false; }
                moje.Add(e.pointerId);
                if (e.button != 0) return true;
                var p = Enumerable.Reverse(pola).FirstOrDefault(q => q.w_(e.clientX, e.clientY));
                fokus = null;
                if (p?.akcja != null) { p.akcja(); return true; }
                // pasek: za niego się przeciąga
                if (e.clientY <= ramka.y + WYS_PASKA) ciagnie = (e.clientX, e.clientY, ramka.x, ramka.y, e.pointerId);
                return true;
            }
            if (!moje.Contains(e.pointerId))
            {
                // ruch nad okienkiem bez wciśniętego w nim przycisku — gra go nie widzi (kursor jest nad divem)
                return faza == Faza.ruch && e.buttons == 0 && nadOknem(e.clientX, e.clientY);
            }
            if (faza == Faza.ruch)
            {
                if (ciagnie is { } c && c.id == e.pointerId)
                {
                    left = Math.Max(0, Math.Min(oknoW - 60, c.l + e.clientX - c.x));
                    top = Math.Max(0, Math.Min(oknoH - 24, c.t + e.clientY - c.y));
                }
                return true;
            }
            moje.Remove(e.pointerId);
            if (ciagnie is { } k && k.id == e.pointerId) { zapamietaj(); ciagnie = null; }
            return true;
        }

        public bool kolko(Kolko e)
        {
            if (!widoczny) return false;
            if (rozwinieta)
            {
                przewinRozwinietej = Math.Max(0, przewinRozwinietej + (e.deltaY > 0 ? 3 : -3) * LH);
                return true;
            }
            if (!nadOknem(e.clientX, e.clientY)) return false;
            var d = e.deltaY > 0 ? 3 * LH : -3 * LH;
            if (!zwiniety && e.clientX >= obszarListy.x && e.clientX <= obszarListy.x + obszarListy.w && e.clientY >= obszarListy.y && e.clientY <= obszarListy.y + obszarListy.h
                && wysokoscListy > obszarListy.h - 8)
            {
                var max = wysokoscListy - (obszarListy.h - 8);
                var nowe = Math.Max(0, Math.Min(max, przewinListy + d));
                // na końcu listy przewija dalej całe okienko (jak przeglądarka)
                if (nowe != przewinListy) { przewinListy = nowe; listaNaDole = przewinListy >= max - 4; return true; }
            }
            przewin = Math.Max(0, Math.Min(Math.Max(0, wysokoscTresci - cialo.h), przewin + d));
            return true;
        }

        /// <summary>Klawisz — bierze go tylko pole tekstowe z kursorem.</summary>
        public bool klawisz(Klawisz? e)
        {
            if (!widoczny || fokus == null || e == null) return false;
            var k = e.key;
            if (fokus == "szukaj")
            {
                if (k == "Escape") { if (szukaj != "" || szukajPole != "") { szukajPole = ""; zmienSzukaj(); } else fokus = null; return true; }
                if (k == "Backspace") { if (szukajPole.Length > 0) { szukajPole = szukajPole.Substring(0, szukajPole.Length - 1); zmienSzukaj(); } return true; }
                if (k.Length >= 1 && !e.ctrlKey && !e.altKey && (k.Length == 1 || char.IsSurrogatePair(k, 0))) { szukajPole += k; zmienSzukaj(); return true; }
                if (k == "Tab") { fokus = null; return true; }
                return true;
            }
            if (fokus == "ziarno")
            {
                if (k == "Escape" || k == "Tab") { fokus = null; return true; }
                if (k == "Backspace") { if (ziarnoPole.Length > 0) ziarnoPole = ziarnoPole.Substring(0, ziarnoPole.Length - 1); return true; }
                if (k.Length == 1 && "0123456789.-+eE".Contains(k)) ziarnoPole += k;
                return true;
            }
            return false;
        }

        string szukajPole = "";
        void zmienSzukaj() { szukaj = szukajPole.Trim().ToLowerInvariant(); przebuduj(); }

        // ---------------------------------------------------------------- rysunek

        const double WYS_PASKA = 4 + (LH + 4) + 4;
        double oknoW, oknoH;
        const double WYS_PRZYCISKU = LH + 4;

        sealed class Element
        {
            public double w, h;
            public bool calyWiersz, rosnie;
            public double marginL;
            public Action<IPlotno, double, double, double>? rysuj;      // (ctx, x, y, w)
            public Action? akcja;
            public string? opis;
        }

        Element przycisk(IPlotno ctx, string napis, Action akcja, string? opis = null, bool aktywny = false, bool zloty = false)
        {
            ctx.font = FONT;
            var tw = ctx.measureText(napis).width;
            return new Element
            {
                w = tw + 14, h = WYS_PRZYCISKU, akcja = akcja, opis = opis,
                rysuj = (c, x, y, w) =>
                {
                    Panele.zaokraglony(c, x + 0.5, y + 0.5, w - 1, WYS_PRZYCISKU - 1, 3);
                    c.fillStyle = aktywny ? "#6b4a22" : "#3a2f22"; c.fill();
                    c.strokeStyle = "#6b5a40"; c.lineWidth = 1; c.stroke();
                    c.font = FONT; c.fillStyle = zloty ? "#f2d36b" : "#e8dcc4"; c.textAlign = "center"; c.textBaseline = "middle";
                    c.fillText(napis, x + w / 2, y + WYS_PRZYCISKU / 2 + 0.5);
                },
            };
        }

        static Element napis(IPlotno ctx, string t, string kolor, bool gruby = false, double marginL = 0)
        {
            ctx.font = gruby ? FONT_B : FONT;
            return new Element
            {
                w = ctx.measureText(t).width, h = LH, marginL = marginL,
                rysuj = (c, x, y, w) => { c.font = gruby ? FONT_B : FONT; c.fillStyle = kolor; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(t, x, y + LH / 2 + 0.5); },
            };
        }

        /// <summary>Pole wyboru z napisem (13 px jak w Chrome, margines 3 px).</summary>
        static Element pole(IPlotno ctx, string t, Func<bool> stan, Action<bool> zmien, string kolor = "#e8dcc4", string? opis = null)
        {
            ctx.font = FONT;
            return new Element
            {
                w = 16 + ctx.measureText(t).width, h = LH, opis = opis,
                akcja = () => zmien(!stan()),
                rysuj = (c, x, y, w) =>
                {
                    var on = stan();
                    double by = y + LH / 2 - 6.5 + 1;
                    Panele.zaokraglony(c, x + 0.5, by + 0.5, 12, 12, 2);
                    c.fillStyle = on ? "#0075ff" : "#ffffff"; c.fill();
                    c.strokeStyle = on ? "#0075ff" : "#767676"; c.lineWidth = 1; c.stroke();
                    if (on)
                    {
                        c.beginPath(); c.moveTo(x + 3.2, by + 6.8); c.lineTo(x + 5.6, by + 9.2); c.lineTo(x + 10, by + 4);
                        c.strokeStyle = "#ffffff"; c.lineWidth = 1.8; c.stroke();
                    }
                    c.font = FONT; c.fillStyle = kolor; c.textAlign = "left"; c.textBaseline = "middle";
                    c.fillText(t, x + 16, y + LH / 2 + 0.5);
                },
            };
        }

        Element poleTekstu(string id, Func<string> wartosc, string? zastepczy, double szer, bool rosnie = false)
        {
            return new Element
            {
                w = szer, h = LH + 4, rosnie = rosnie,
                akcja = () => fokus = id,
                rysuj = (c, x, y, w) =>
                {
                    c.fillStyle = "#2a2219"; c.fillRect(x, y, w, LH + 4);
                    c.strokeStyle = fokus == id ? "#f2d36b" : "#6b5a40"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, LH + 3);
                    c.save(); c.beginPath(); c.rect(x + 1, y, w - 2, LH + 4); c.clip();
                    c.font = FONT; c.textAlign = "left"; c.textBaseline = "middle";
                    var v = wartosc();
                    var tx = x + 5;
                    var tw = c.measureText(v).width;
                    if (tx + tw > x + w - 6) tx = x + w - 6 - tw;     // długi tekst: widać koniec
                    if (v == "" && zastepczy != null) { c.fillStyle = "#7d7362"; c.fillText(zastepczy, x + 5, y + (LH + 4) / 2 + 0.5); }
                    else { c.fillStyle = "#e8dcc4"; c.fillText(v, tx, y + (LH + 4) / 2 + 0.5); }
                    if (fokus == id && (Rdzen.Wydajnosc.Teraz() / 530) % 2 < 1)
                    {
                        var kx = v == "" ? x + 5 : tx + tw + 0.5;
                        c.fillStyle = "#e8dcc4"; c.fillRect(Math.Floor(kx), y + 3, 1, LH - 2);
                    }
                    c.restore();
                },
            };
        }

        Element lista_rozwijana()
        {
            return new Element
            {
                w = 100, h = LH + 4, rosnie = true,
                akcja = () => { rozwinieta = !rozwinieta; przewinRozwinietej = 0; },
                rysuj = (c, x, y, w) =>
                {
                    c.fillStyle = "#2a2219"; c.fillRect(x, y, w, LH + 4);
                    c.strokeStyle = "#6b5a40"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, LH + 3);
                    c.font = FONT; c.fillStyle = "#e8dcc4"; c.textAlign = "left"; c.textBaseline = "middle";
                    c.fillText("wymuś kartę…", x + 5, y + (LH + 4) / 2 + 0.5);
                    // strzałka listy
                    double ax = x + w - 10, ay = y + (LH + 4) / 2;
                    c.beginPath(); c.moveTo(ax - 3.5, ay - 1.5); c.lineTo(ax, ay + 2); c.lineTo(ax + 3.5, ay - 1.5);
                    c.strokeStyle = "#e8dcc4"; c.lineWidth = 1.3; c.stroke();
                    miejsceListy = (x, y, w, LH + 4);
                },
            };
        }
        (double x, double y, double w, double h) miejsceListy;

        /// <summary>
        /// Flex z zawijaniem (gap `gx`×`gy`, align-items:center): układa elementy od (x0, y) w szerokości `szer`,
        /// rysuje je (gdy widać) i zapisuje pola do klikania. Zwraca wysokość.
        /// </summary>
        double flex(IPlotno ctx, List<Element> el, double x0, double y, double szer, double gx, double gy, bool rysuj)
        {
            var wiersze = new List<List<Element>>();
            var biezacy = new List<Element>(); double zajete = 0;
            foreach (var e in el)
            {
                var ew = e.calyWiersz ? szer : e.w + e.marginL;
                if (biezacy.Count > 0 && (zajete + gx + ew > szer + 0.01 || e.calyWiersz)) { wiersze.Add(biezacy); biezacy = new List<Element>(); zajete = 0; }
                zajete += (biezacy.Count > 0 ? gx : 0) + ew;
                biezacy.Add(e);
                if (e.calyWiersz) { wiersze.Add(biezacy); biezacy = new List<Element>(); zajete = 0; }
            }
            if (biezacy.Count > 0) wiersze.Add(biezacy);
            var yy = y;
            for (int r = 0; r < wiersze.Count; r++)
            {
                var wr = wiersze[r];
                var wh = wr.Max(e => e.h);
                var suma = wr.Sum(e => e.calyWiersz ? szer : e.w + e.marginL) + gx * (wr.Count - 1);
                var rosnace = wr.Count(e => e.rosnie);
                var x = x0;
                foreach (var e in wr)
                {
                    var ew = e.calyWiersz ? szer : e.w + (e.rosnie && rosnace > 0 ? Math.Max(0, szer - suma) / rosnace : 0);
                    x += e.marginL;
                    var ey = yy + (wh - e.h) / 2;
                    if (rysuj)
                    {
                        e.rysuj?.Invoke(ctx, x, ey, ew);
                        if ((e.akcja != null || e.opis != null) && ey + e.h > cialo.y && ey < cialo.y + cialo.h)
                            pola.Add(new Pole { x = x, y = Math.Max(ey, cialo.y), w = ew, h = Math.Min(ey + e.h, cialo.y + cialo.h) - Math.Max(ey, cialo.y), akcja = e.akcja, opis = e.opis });
                    }
                    x += ew + gx;
                }
                yy += wh + (r < wiersze.Count - 1 ? gy : 0);
            }
            return yy - y;
        }

        /// <summary>Tekst z zawijaniem po słowach (white-space:pre-wrap); `wcięcie` — kolejne wiersze (text-indent ujemny).</summary>
        static List<string> zawin(IPlotno ctx, string tekst, double szer, double wciecie = 0)
        {
            var wynik = new List<string>();
            foreach (var akapit in tekst.Split('\n'))
            {
                var slowa = akapit.Split(' ');
                var linia = "";
                foreach (var s in slowa)
                {
                    var proba = linia == "" ? s : linia + " " + s;
                    var max = wynik.Count == 0 || linia == "" && wynik.Count == 0 ? szer : szer - wciecie;
                    if (linia != "" && ctx.measureText(proba).width > max) { wynik.Add(linia); linia = s; }
                    else linia = proba;
                }
                wynik.Add(linia);
            }
            return wynik;
        }

        public void rysuj(IPlotno ctx, double w, double h, double teraz)
        {
            if (!widoczny) return;
            oknoW = w; oknoH = h;
            pola.Clear(); opcje.Clear();
            var szer = Math.Min(SZEROKOSC, w - 24);
            double x0 = left != null ? Math.Max(0, Math.Min(w - 60, left.Value)) : w - 12 - szer;
            double y0 = top != null ? Math.Max(0, Math.Min(h - 24, top.Value)) : 96;
            var maxH = h - 110;

            // wysokość treści: pierwszy przebieg bez rysowania
            var wTresci = zwiniety ? 0 : uloz(ctx, x0, y0 + WYS_PASKA, szer, false);
            wysokoscTresci = wTresci;
            var calosc = Math.Min(Math.Max(WYS_PASKA, maxH), WYS_PASKA + wTresci + 2);
            ramka = (x0, y0, szer, calosc);
            cialo = (x0 + 1, y0 + WYS_PASKA, szer - 2, calosc - WYS_PASKA - 1);
            przewin = Math.Max(0, Math.Min(Math.Max(0, wTresci - cialo.h), przewin));

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            var skala = ctx.getTransform();
            ctx.restore();
            ctx.save();
            // tło i cień
            ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
            Panele.zaokraglony(ctx, x0, y0, szer, calosc, 6);
            ctx.fillStyle = "rgba(16,13,10,0.93)"; ctx.fill();
            ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            ctx.strokeStyle = "#6b5a40"; ctx.lineWidth = 1;
            Panele.zaokraglony(ctx, x0 + 0.5, y0 + 0.5, szer - 1, calosc - 1, 6); ctx.stroke();

            if (!zwiniety && wTresci > 0)
            {
                ctx.save();
                ctx.beginPath(); ctx.rect(cialo.x, cialo.y, cialo.w, cialo.h); ctx.clip();
                uloz(ctx, x0, y0 + WYS_PASKA - przewin, szer, true);
                ctx.restore();
                if (wTresci > cialo.h) pasekPrzewijania(ctx, x0 + szer - 6, cialo.y + 2, cialo.h - 4, przewin, wTresci, cialo.h);
            }

            // pasek: tytuł, eksport, czyszczenie, zwijanie — za niego się przeciąga (zostaje na górze przy przewijaniu)
            Panele.zaokraglony(ctx, x0 + 1, y0 + 1, szer - 2, WYS_PASKA - 1, 5);
            ctx.save(); ctx.clip();
            ctx.fillStyle = "#2a2219"; ctx.fillRect(x0 + 1, y0 + 1, szer - 2, WYS_PASKA - 1);
            ctx.restore();
            var cialoPrzed = cialo;
            cialo = (x0, y0, szer, WYS_PASKA);              // pola paska klikalne niezależnie od przewinięcia
            var pasek = new List<Element>
            {
                przycisk(ctx, "zapisz .txt", eksport, "logi i stan świata do pliku"),
                przycisk(ctx, "wyczyść", () => { DZIENNIK.wpisy.Clear(); lista.Clear(); }, "wyczyść logi"),
                przycisk(ctx, zwiniety ? "+" : "–", () => zwin(!zwiniety), "zwiń / rozwiń"),
            };
            ctx.font = FONT_B; ctx.fillStyle = "#f2d36b"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText("Tryb deweloperski", x0 + 8, y0 + WYS_PASKA / 2 + 0.5);
            var szerPrz = pasek.Sum(e => e.w) + 6 * (pasek.Count - 1);
            flex(ctx, pasek, x0 + szer - 8 - szerPrz, y0 + 4, szerPrz, 6, 0, true);
            cialo = cialoPrzed;

            // lista rozwijana (wymuś kartę) — nad wszystkim
            if (rozwinieta) rysujRozwinieta(ctx, w, h);

            // dymek z opisem (title) po chwili nad elementem
            var nad = !rozwinieta ? Enumerable.Reverse(pola).FirstOrDefault(p => p.w_(kursor.x, kursor.y)) : null;
            if (nad?.opis != najechane?.opis || nad == null) { najechane = nad; najechaneOd = teraz; }
            if (najechane?.opis != null && teraz - najechaneOd > 600 && ciagnie == null && moje.Count == 0)
            {
                ctx.font = FONT;
                var tw = ctx.measureText(najechane.opis).width;
                double dx = Math.Min(w - tw - 12, kursor.x + 10), dy = Math.Min(h - LH - 8, kursor.y + 20);
                ctx.fillStyle = "#f6f2e8"; ctx.fillRect(dx, dy, tw + 10, LH + 6);
                ctx.strokeStyle = "#767676"; ctx.lineWidth = 1; ctx.strokeRect(dx + 0.5, dy + 0.5, tw + 9, LH + 5);
                ctx.fillStyle = "#222"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
                ctx.fillText(najechane.opis, dx + 5, dy + (LH + 6) / 2 + 0.5);
            }
            ctx.restore();
        }

        static void pasekPrzewijania(IPlotno ctx, double x, double y, double h, double przewin, double calosc, double widac)
        {
            var dl = Math.Max(16, h * widac / calosc);
            var py = y + (h - dl) * (przewin / Math.Max(1, calosc - widac));
            ctx.fillStyle = "rgba(232,220,196,0.22)";
            Panele.zaokraglony(ctx, x, py, 4, dl, 2); ctx.fill();
        }

        /// <summary>Treść okienka (pod paskiem): sekcje i wiersze w kolejności z TS. Zwraca wysokość.</summary>
        double uloz(IPlotno ctx, double x0, double y0, double szer, bool rysuj)
        {
            var y = y0;
            var wew = szer - 2 - 16;                   // ramka 1 px z obu stron, padding 8 px
            double xl = x0 + 1 + 8;
            var s = sim();

            // ---------------------------------------------------------------- stan świata
            ctx.font = FONT;
            var linieStanu = zawin(ctx, stanSwiata, wew);
            if (rysuj)
            {
                ctx.fillStyle = "#d9cfb8"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
                for (int i = 0; i < linieStanu.Count; i++) ctx.fillText(linieStanu[i], xl, y + 5 + i * LH + LH / 2 + 0.5);
            }
            y += 5 + linieStanu.Count * LH + 5;

            // ---------------------------------------------------------------- czas
            var czasEl = new List<Element> { naglowek(ctx, "Czas") };
            czasEl.Add(przycisk(ctx, DEV.pauza ? "▶ wznów" : "⏸ pauza", () => { DEV.pauza = !DEV.pauza; }, "świat stoi; idzie tylko o tyle tików, ile dodasz", DEV.pauza));
            foreach (var n in new[] { 1, 10, 100 }) czasEl.Add(przycisk(ctx, $"+{n}", () => { DEV.pauza = true; DEV.krokow += n; }, $"{n} {(n == 1 ? "tik" : "tików")} naprzód"));
            czasEl.Add(napis(ctx, "tempo", "#9a8f7a", false, 6));
            foreach (var m in TEMPO.mnozniki)
            {
                var mm = m;
                czasEl.Add(przycisk(ctx, $"×{Przyciski.mnoznikNapis(m)}", () => { DEV.mnoznik = mm; }, m == 1 ? "zwykły czas (taki jak w grze)" : $"czas ×{Przyciski.mnoznikNapis(m)} — tylko w trybie deweloperskim", m == DEV.mnoznik, m == DEV.mnoznik));
            }
            y = sekcja(ctx, czasEl, xl, y, wew, szer, x0, rysuj);

            // ---------------------------------------------------------------- logi
            if (rysuj) kreska(ctx, x0, y, szer);
            var yl = y + 5;
            var nag = naglowek(ctx, "Logi");
            if (rysuj) nag.rysuj!(ctx, xl, yl, wew);
            yl += LH + 4;
            var filtr = new List<Element>();
            foreach (var k in KATEGORIE)
            {
                var kk = k;
                filtr.Add(pole(ctx, k.nazwa, () => filtry.Contains(kk.kat), v => { if (v) filtry.Add(kk.kat); else filtry.Remove(kk.kat); przebuduj(); }, k.kolor));
            }
            yl += flex(ctx, filtr, xl, yl, wew, 8, 2, rysuj) + 4;
            yl += 3;
            var szukajEl = poleTekstu("szukaj", () => szukajPole, "szukaj w logach (np. #59, rycerz, dłoń)…", wew);
            yl += flex(ctx, new List<Element> { szukajEl }, xl, yl, wew, 0, 0, rysuj) + 4;
            // lista: 140 px treści + padding 4 px 0
            var listaH = 148.0;
            ctx.font = FONT;
            var szerListy = wew - 8;
            var wiersze = new List<(Linia l, string t, bool pierwszy)>();
            foreach (var l in lista)
            {
                var zl = zawin(ctx, l.tekst, szerListy, 12);
                for (int i = 0; i < zl.Count; i++) wiersze.Add((l, zl[i], i == 0));
            }
            wysokoscListy = wiersze.Count * LH;
            var maxListy = Math.Max(0, wysokoscListy - (listaH - 8));
            if (listaNaDole) przewinListy = maxListy;
            przewinListy = Math.Max(0, Math.Min(maxListy, przewinListy));
            if (rysuj)
            {
                obszarListy = (xl, yl, wew, listaH);
                var gora = Math.Max(yl, cialo.y); var dol = Math.Min(yl + listaH, cialo.y + cialo.h);
                if (dol > gora)
                {
                    ctx.save(); ctx.beginPath(); ctx.rect(xl, gora, wew, dol - gora); ctx.clip();
                    ctx.textAlign = "left"; ctx.textBaseline = "middle";
                    var od = (int)Math.Floor(przewinListy / LH);
                    for (int i = Math.Max(0, od); i < wiersze.Count; i++)
                    {
                        var ly = yl + 4 + i * LH - przewinListy;
                        if (ly > yl + listaH) break;
                        var (l, t, pierwszy) = wiersze[i];
                        var lx = xl + (pierwszy ? 0 : 12);
                        ctx.fillStyle = l.kolor;
                        ctx.fillText(t, lx, ly + LH / 2 + 0.5);
                        if ((l.gdzie || l.nr != null) && ly + LH > gora && ly < dol)
                        {
                            var ll = l;
                            pola.Add(new Pole
                            {
                                x = xl, y = Math.Max(ly, gora), w = szerListy, h = Math.Min(ly + LH, dol) - Math.Max(ly, gora),
                                akcja = () =>
                                {
                                    // klik: kamera na miejsce, a postać z #numerem trafia do inspektora
                                    if (ll.nr != null) DEV.sledzony = ll.nr.Value;
                                    if (ll.gdzie) pokazMiejsce(ll.w.x!.Value, ll.w.y!.Value);
                                },
                            });
                        }
                    }
                    ctx.restore();
                    if (wysokoscListy > listaH - 8) pasekPrzewijania(ctx, xl + wew - 5, yl + 2, listaH - 4, przewinListy, wysokoscListy, listaH - 8);
                }
            }
            yl += listaH;
            y = yl + 5;

            // ---------------------------------------------------------------- inspektor
            if (rysuj) kreska(ctx, x0, y, szer);
            var yi = y + 5;
            nag = naglowek(ctx, "Inspektor");
            if (rysuj) nag.rysuj!(ctx, xl, yi, wew);
            yi += LH + 4;
            var inspGora = new List<Element>
            {
                pole(ctx, "kamera za nim", () => DEV.sledz, v => DEV.sledz = v),
                przycisk(ctx, "puść", () => DEV.sledzony = -1, "przestań śledzić"),
            };
            yi += flex(ctx, inspGora, xl, yi, wew, 6, 0, rysuj) + 4;
            ctx.font = FONT;
            var linieInsp = zawin(ctx, inspektor, wew);
            if (rysuj)
            {
                ctx.fillStyle = "#cfe3ef"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
                for (int i = 0; i < linieInsp.Count; i++) ctx.fillText(linieInsp[i], xl, yi + i * LH + LH / 2 + 0.5);
            }
            yi += Math.Max(linieInsp.Count * LH, 4.1 * 11);
            y = yi + 5;

            // ---------------------------------------------------------------- narzędzia
            var nar = new List<Element>
            {
                naglowek(ctx, "Narzędzia"),
                przycisk(ctx, "+100 wiary", () => sim().wiara += 100),
                przycisk(ctx, "+100 krwi", () => sim().krew += 100),
                // Alpha: kruszce do prób kuźni i warsztatu (żelazo to szara sztabka na liczniku)
                przycisk(ctx, "+10 żelaza", () => sim().zelazo += 10, "na zbroję w kuźni"),
                przycisk(ctx, "+10 złota", () => sim().zloto += 10, "na krzyże w warsztacie"),
                przycisk(ctx, "+ wiadro", () => Wiadro.wiadroTeraz(sim()), "pełne wiadro zjeżdża od razu, przy najgłodniejszych"),
                przycisk(ctx, "sen → 0", () => sim().sen = 0, "powieka podnosi się"),
                przycisk(ctx, "pęknij pomnik", () => Rytual.wymusPekniecie(sim()), "etap 5: +20% — jedno pełne odmodlenie"),
                przycisk(ctx, "rozbij pomnik", () => pokazWynik(Pomnik.devRozbijPomnik(sim())), "etap 5: pomnik w gruz, z gruzów wstaje demon"),
            };
            y = sekcja(ctx, nar, xl, y, wew, szer, x0, rysuj);

            var lud = new List<Element>();
            foreach (var r in new[] { "robotnik", "pobozny", "rycerz" }) { var rr = r; lud.Add(przycisk(ctx, $"+ {SLud.NAZWA_ROLI[r].ToLowerInvariant()}", () => przywolaj(rr), "przy siedzibie, bez krwi")); }
            lud.Add(przycisk(ctx, "odkryj mapę", odkryj, "cała góra trafia do pamięci"));
            y = wiersz(ctx, lud, xl, y, wew, rysuj);
            y = wiersz(ctx, new List<Element>
            {
                napis(ctx, "Dłoń z otchłani:", "#9a8f7a"),
                przycisk(ctx, "wywołaj", () => pokazWynik(Dlon.devDlon(sim())), "od razu, także poza Koszmarem — przy kimś na brzegu nieznanego"),
                przycisk(ctx, "po linę", () => pokazWynik(Dlon.devLina(sim())), "etap 4: dłoń wznosi się spod podłogi sali i przecina linę wiadra"),
                przycisk(ctx, "anielska", () => pokazWynik(Aniol.devAniol(sim())), "etap 4: dłoń anielska schodzi od razu z losowym darem"),
            }, xl, y, wew, rysuj);
            // etap 5b: dłoń pomaga demonowi (najpierw „rozbij pomnik” — dopiero w walce z demonem)
            y = wiersz(ctx, new List<Element>
            {
                napis(ctx, "Dłoń przy demonie:", "#9a8f7a"),
                przycisk(ctx, "rzut", () => pokazWynik(DlonDemona.devDlonDemona(sim(), "rzut")), "etap 5b: obejmuje rycerza i ciska nim w górę"),
                przycisk(ctx, "tarcza", () => pokazWynik(DlonDemona.devDlonDemona(sim(), "tarcza")), "etap 5b: otwarta dłoń przed demonem — ciosy się odbijają"),
                przycisk(ctx, "zawał", () => pokazWynik(DlonDemona.devDlonDemona(sim(), "zawal")), "etap 5b: szpony drą strop — ściana gruzu odcina demona"),
            }, xl, y, wew, rysuj);
            y = wiersz(ctx, new List<Element>
            {
                pole(ctx, "bez ciemności", () => DEV.bezMroku, v => DEV.bezMroku = v),
                pole(ctx, "drogi wszystkich", () => DEV.pokazDrogi, v => DEV.pokazDrogi = v),
            }, xl, y, wew, rysuj);
            y = wiersz(ctx, new List<Element> { lista_rozwijana() }, xl, y, wew, rysuj);
            // ziarno świata: ten sam świat jeszcze raz albo dowolny po numerze
            y = wiersz(ctx, new List<Element>
            {
                napis(ctx, ziarnoNapis, "#e8dcc4"),
                przycisk(ctx, "ten sam świat", () => nowaGra(sim().seed)),
                poleTekstu("ziarno", () => ziarnoPole, "ziarno", 90),
                przycisk(ctx, "graj", graj),
            }, xl, y, wew, rysuj);
            // wynik i skróty
            ctx.font = FONT;
            var linieWyniku = wynik == "" ? new List<string>() : zawin(ctx, wynik, wew);
            if (rysuj)
            {
                ctx.fillStyle = "#f2d36b"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
                for (int i = 0; i < linieWyniku.Count; i++) ctx.fillText(linieWyniku[i], xl, y + i * LH + LH / 2 + 0.5);
            }
            y += Math.Max(LH, linieWyniku.Count * LH) + 6;
            var skroty = zawin(ctx, "Shift+klik postać — do inspektora · + / − tempo · klik we wpis — kamera tam", wew);
            if (rysuj)
            {
                ctx.fillStyle = "#7d7362"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
                for (int i = 0; i < skroty.Count; i++) ctx.fillText(skroty[i], xl, y + i * LH + LH / 2 + 0.5);
            }
            y += skroty.Count * LH + 6;
            return y - y0;
        }

        static Element naglowek(IPlotno ctx, string t)
        {
            var e = napis(ctx, t, "#f2d36b", true);
            e.calyWiersz = true;
            return e;
        }

        static void kreska(IPlotno ctx, double x0, double y, double szer)
        {
            ctx.fillStyle = "#3d3326"; ctx.fillRect(x0 + 1, y, szer - 2, 1);
        }

        /// <summary>Sekcja: kreska u góry, padding 5 px 8 px, flex z zawijaniem (gap 4).</summary>
        double sekcja(IPlotno ctx, List<Element> el, double xl, double y, double wew, double szer, double x0, bool rysuj)
        {
            if (rysuj) kreska(ctx, x0, y, szer);
            return y + 1 + 5 + flex(ctx, el, xl, y + 1 + 5, wew, 4, 4, rysuj) + 5;
        }

        /// <summary>Wiersz: padding 0 8px 5px, flex z zawijaniem (gap 4).</summary>
        double wiersz(IPlotno ctx, List<Element> el, double xl, double y, double wew, bool rysuj) =>
            y + flex(ctx, el, xl, y, wew, 4, 4, rysuj) + 5;

        void rysujRozwinieta(IPlotno ctx, double w, double h)
        {
            var pozycje = new List<(string tekst, string? wartosc, bool grupa)> { ("wymuś kartę…", "", false) };
            foreach (var (id, nazwa) in Wydarzenia.KARTY_W_GRZE) pozycje.Add(($"{nazwa} ({id})", id, false));
            pozycje.Add(("z łańcucha", null, true));
            foreach (var k in Wydarzenia.KARTY_LANCUCHA) pozycje.Add(("    " + k, $"lancuch:{k}", false));
            var (lx, ly, lw, lh) = miejsceListy;
            var wysPoz = LH + 2;
            var calosc = pozycje.Count * wysPoz + 2;
            var ponizej = h - (ly + lh) - 4;
            var powyzej = ly - 4;
            var wys = Math.Min(calosc, Math.Max(ponizej, powyzej));
            var gora = ponizej >= Math.Min(calosc, 200) || ponizej >= powyzej ? ly + lh : ly - wys;
            przewinRozwinietej = Math.Max(0, Math.Min(calosc - wys, przewinRozwinietej));
            ctx.save();
            ctx.fillStyle = "#2a2219"; ctx.fillRect(lx, gora, lw, wys);
            ctx.strokeStyle = "#6b5a40"; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, gora + 0.5, lw - 1, wys - 1);
            ctx.beginPath(); ctx.rect(lx + 1, gora + 1, lw - 2, wys - 2); ctx.clip();
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            for (int i = 0; i < pozycje.Count; i++)
            {
                var py = gora + 1 + i * wysPoz - przewinRozwinietej;
                if (py + wysPoz < gora || py > gora + wys) continue;
                var (t, v, grupa) = pozycje[i];
                var p = new Pole { x = lx, y = Math.Max(py, gora), w = lw, h = Math.Min(py + wysPoz, gora + wys) - Math.Max(py, gora) };
                var nad = !grupa && p.w_(kursor.x, kursor.y);
                if (nad) { ctx.fillStyle = "#6b4a22"; ctx.fillRect(lx + 1, py, lw - 2, wysPoz); }
                ctx.font = grupa ? FONT_B : FONT;
                ctx.fillStyle = "#e8dcc4";
                ctx.fillText(t, lx + 5, py + wysPoz / 2 + 0.5);
                if (!grupa && v != null) { var vv = v; p.akcja = () => wymusKarte(vv); opcje.Add((p, t)); }
                else opcje.Add((p, t));
            }
            ctx.restore();
        }
    }
}
