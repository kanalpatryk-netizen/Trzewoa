// Dźwięk gry z plików MP3 (dane/dzwieki/, decyzja użytkownika 15.11: „nie chcę już, żeby dźwięk był ładowany skryptami”).
// Te same klasy i metody co w TS — core/audio.ts (Resonance → Dzwiek), core/music.ts (Muzyka), core/gesty.ts (Gesty),
// core/mikser.ts (Mikser) — i ta sama logika: kiedy co gra, co ile, z jaką szansą, kto komu przerywa, co przycisza świat.
// Zamiast składać dźwięk w locie, każda metoda gra plik (nagrany kodem TS — narzedzia/dzwieki/nagraj.mjs), a to, co
// w TS było parametrem dźwięku (głębokość, głód, wiara, napięcie), wybiera plik i głośność: między stopniami
// nagranych pętli gra przenika. Spis plików i zasady — dane/dzwieki/SPIS.md.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Trzewia.Dzwieki;
using Trzewia.Nastawy;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyDzwiek;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Aplikacja
{
    /// <summary>Spis plików dźwięku (dane/dzwieki/spis.json): warianty dźwięków i długości mowy w głosach.</summary>
    static class SpisDzwiekow
    {
        static Dictionary<string, Dictionary<string, object?>>? pliki;
        static readonly Dictionary<string, string[]> warianty = new Dictionary<string, string[]>();
        static readonly Random los = new Random();

        static Dictionary<string, Dictionary<string, object?>> Pliki()
        {
            if (pliki != null) return pliki;
            pliki = new Dictionary<string, Dictionary<string, object?>>();
            try
            {
                var b = Zasoby.Czytaj("dzwieki/spis.json");
                if (b != null && Json.Czytaj(System.Text.Encoding.UTF8.GetString(b)) is List<object?> lista)
                    foreach (var x in lista)
                        if (x is Dictionary<string, object?> d && d.TryGetValue("plik", out var p) && p is string s) pliki[s] = d;
            }
            catch (Exception e) { Dziennik.Pisz($"spis dźwięków: {e.Message}"); }
            return pliki;
        }

        /// <summary>Wszystkie warianty dźwięku: „gesty/szkic” → gesty/szkic-1.mp3 … (albo sam gesty/szkic.mp3).</summary>
        public static string[] Warianty(string nazwa)
        {
            if (warianty.TryGetValue(nazwa, out var w)) return w;
            var re = new Regex("^" + Regex.Escape(nazwa) + @"(-\d+)?\.mp3$");
            w = Pliki().Keys.Where(k => re.IsMatch(k)).OrderBy(k => k, StringComparer.Ordinal).ToArray();
            if (w.Length == 0) w = new[] { nazwa + ".mp3" };      // bez spisu — nazwa wprost
            warianty[nazwa] = w;
            return w;
        }

        /// <summary>Jeden z wariantów, losowo (w TS każde odtworzenie było trochę inne).</summary>
        public static string Losowy(string nazwa) { var w = Warianty(nazwa); return w[los.Next(w.Length)]; }

        /// <summary>Pliki w folderze (np. „glosy/rycerz/”), których nazwa zaczyna się od `poczatek`.</summary>
        public static string[] Zaczynajace(string poczatek) => Pliki().Keys.Where(k => k.StartsWith(poczatek, StringComparison.Ordinal)).OrderBy(k => k, StringComparer.Ordinal).ToArray();

        /// <summary>Ile trwa sama mowa w gotowym głosie (s) — do kiedy postać mówi.</summary>
        public static double Mowa(string plik)
        {
            if (Pliki().TryGetValue(plik, out var d) && d.TryGetValue("mowaSekundy", out var m) && m is double x) return x;
            return 1.5;
        }

        public static IEnumerable<string> Wszystkie => Pliki().Keys;
    }

    /// <summary>
    /// Pętle jednej warstwy (dudnienie, modlitwa, akordy): każdy plik ma swój cel głośności; plik bez celu cichnie
    /// i się zwalnia. Przenikanie między stopniami nagrań to po prostu dwa pliki naraz z głośnościami cos/sin.
    /// </summary>
    sealed class Warstwa
    {
        readonly Szyna szyna;
        readonly Dictionary<string, Petla> petle = new Dictionary<string, Petla>();
        readonly Dictionary<string, double> cele = new Dictionary<string, double>();
        public Warstwa(Szyna szyna) { this.szyna = szyna; }

        /// <summary>Głośności plików (reszta warstwy — do zera) ze stałą `tau`; nowa pętla wchodzi od `kiedy`.</summary>
        public void Ustaw(IReadOnlyDictionary<string, double> glosnosci, double tau, double kiedy = 0)
        {
            var s = Silnik.Ten;
            foreach (var kv in glosnosci)
            {
                if (kv.Value <= 1e-4) continue;
                if (petle.TryGetValue(kv.Key, out var p))
                {
                    if (cele.TryGetValue(kv.Key, out var c) && Math.Abs(c - kv.Value) < 1e-3) continue;
                    s.Zmien(() => p.glosnosc.Ustaw(kv.Value, tau));
                }
                else
                {
                    var nowa = s.Petla(kv.Key, szyna, kv.Value, tau, kiedy);
                    if (nowa == null) continue;
                    petle[kv.Key] = nowa;
                }
                cele[kv.Key] = kv.Value;
            }
            foreach (var plik in petle.Keys.ToList())
            {
                if (glosnosci.TryGetValue(plik, out var g) && g > 1e-4) continue;
                var p = petle[plik];
                s.Zmien(() => p.Wycisz(tau));
                petle.Remove(plik); cele.Remove(plik);
            }
        }

        public void Wycisz(double tau, double od = 0)
        {
            var s = Silnik.Ten;
            foreach (var p in petle.Values) { var pp = p; s.Zmien(() => pp.Wycisz(tau, od)); }
            petle.Clear(); cele.Clear();
        }

        /// <summary>Najgłośniejsza pętla warstwy (np. do oddechu skały) i jej plik.</summary>
        public (string plik, Petla petla)? Glowna()
        {
            if (cele.Count == 0) return null;
            var plik = cele.OrderByDescending(kv => kv.Value).First().Key;
            return petle.TryGetValue(plik, out var p) ? (plik, p) : ((string, Petla)?)null;
        }
    }

    /// <summary>Głośności dwóch sąsiednich stopni przy położeniu `x` między nimi (0..1) — równa moc.</summary>
    static class Przenikanie
    {
        public static (double a, double b) RownaMoc(double x) { x = Math.Max(0, Math.Min(1, x)); return (Math.Cos(x * Math.PI / 2), Math.Sin(x * Math.PI / 2)); }
        public static string Proc(double x) => ((int)Math.Round(x * 100)).ToString("000");
    }

    /// <summary>
    /// core/audio.ts: Resonance — nie ma muzyki, jest rezonans: niski dźwięk kamienia, który zmienia wysokość z głębokością,
    /// praca słyszana jako rytm i szum modlitwy.
    /// </summary>
    public sealed class Dzwiek
    {
        static readonly Random los = new Random();
        static readonly double[] GLEBIE = { 0, 0.25, 0.5, 0.75, 1 }, GLODY = { 0, 0.5, 1 }, WIARY = { 0.25, 0.5, 0.75, 1 };
        public bool started;
        readonly Warstwa dudnienie = new Warstwa(Szyna.Rezonans), szum = new Warstwa(Szyna.Rezonans), modlitwa = new Warstwa(Szyna.Rezonans);
        double nextWork;
        double glebiaSm = -1, ostatniUpdate;
        double glod = -1;

        public void start()
        {
            if (started) return;
            started = true;
            var s = Silnik.Ten;
            // narasta przez ok. 4 s, jak exponentialRamp w TS
            s.Zmien(() => { s.rezonans.Natychmiast(0.0001); s.rezonans.Ustaw(Math.Max(0.0002, ustawienia.glosnosc), 1.0); });
        }

        /// <summary>Głośność od razu, nie dopiero w następnej klatce gry (w menu i ustawieniach update nie jest wołane).</summary>
        public void odswiezGlosnosc()
        {
            if (!started) return;
            var s = Silnik.Ten;
            var docelowa = ustawienia.rezonans ? ustawienia.glosnosc : 0.0001;
            s.Zmien(() => s.rezonans.Ustaw(Math.Max(0.0001, docelowa), 0.25));
        }

        /// <summary>
        /// depth 0..1 — na co patrzysz; work 0..1 — ilu kuje; faith 0..1; life 0..1; hungerRate — oddech skały.
        /// `stoi` — czas zatrzymany: kilofy milkną, zostaje sam kamień.
        /// </summary>
        public void update(double depth, double work, double faith, double life, double hungerRate, bool stoi)
        {
            if (!started) return;
            var s = Silnik.Ten;
            var t = s.czas;
            var docelowa = ustawienia.rezonans ? ustawienia.glosnosc : 0.0001;
            s.Zmien(() => s.rezonans.Ustaw(Math.Max(0.0001, docelowa), 0.6));
            // dudnienie: wysokość idzie za głębokością ze stałą 1,2 s (jak drone.frequency w TS)
            var dt = Math.Max(0, t - ostatniUpdate); ostatniUpdate = t;
            glebiaSm = glebiaSm < 0 ? depth : glebiaSm + (depth - glebiaSm) * (1 - Math.Exp(-dt / 1.2));
            // oddech skały: nagrany przy głodzie 0, 50 i 100% — najbliższy, z zapasem, żeby nie skakał
            if (glod < 0 || Math.Abs(hungerRate - glod) > 0.3) glod = GLODY.OrderBy(g => Math.Abs(g - hungerRate)).First();
            var d = Math.Max(0, Math.Min(1, glebiaSm)) * 4;
            int i0 = Math.Min(3, (int)Math.Floor(d));
            var (a, b) = Przenikanie.RownaMoc(d - i0);
            dudnienie.Ustaw(new Dictionary<string, double>
            {
                [$"swiat/dudnienie/glebokosc-{Przenikanie.Proc(GLEBIE[i0])}-glod-{Przenikanie.Proc(glod)}-petla.mp3"] = a,
                [$"swiat/dudnienie/glebokosc-{Przenikanie.Proc(GLEBIE[i0 + 1])}-glod-{Przenikanie.Proc(glod)}-petla.mp3"] = b,
            }, 1.0);
            // szum korytarzy: nagrany przy życiu 100% (0,15) — w grze 0,03 + życie × 0,12, w pauzie × 0,4
            szum.Ustaw(new Dictionary<string, double> { ["swiat/szum-korytarzy-petla.mp3"] = (0.03 + life * 0.12) / 0.15 * (stoi ? 0.4 : 1) }, 1.5);
            // modlitwa: rośnie z wiarą (pasmo i głośność) — między nagranymi stopniami 25–100%, w pauzie × 0,3
            var m = new Dictionary<string, double>();
            var f = Math.Max(0, Math.Min(1, faith)) * (stoi ? 0.3 : 1);
            if (faith <= WIARY[0]) m[$"swiat/modlitwa/wiara-{Przenikanie.Proc(WIARY[0])}-petla.mp3"] = f / WIARY[0];
            else
            {
                var x = (Math.Min(1, faith) - 0.25) / 0.25;
                int j = Math.Min(2, (int)Math.Floor(x));
                var (ma, mb) = Przenikanie.RownaMoc(x - j);
                var skala = stoi ? 0.3 : 1;
                m[$"swiat/modlitwa/wiara-{Przenikanie.Proc(WIARY[j])}-petla.mp3"] = ma * skala;
                m[$"swiat/modlitwa/wiara-{Przenikanie.Proc(WIARY[j + 1])}-petla.mp3"] = mb * skala;
            }
            modlitwa.Ustaw(m, 2);

            // rytm pracy: tym gęstszy, im więcej kilofów
            if (work > 0.01 && !stoi)
            {
                var interval = 0.9 - Math.Min(0.75, work * 0.8);
                if (nextWork < t) nextWork = t + 0.05;
                while (nextWork < t + 0.6)
                {
                    var hz = 160 + los.NextDouble() * 90 - depth * 60;
                    var plik = $"swiat/kucie/stuk-{(int)(Math.Max(100, Math.Min(250, Math.Round(hz / 10) * 10)))}hz.mp3";
                    s.Zagraj(plik, Szyna.Rezonans, nextWork, (0.05 + work * 0.06) / 0.11, (los.NextDouble() - 0.5) * 1.2);
                    nextWork += interval * (0.7 + los.NextDouble() * 0.6);
                }
            }
        }

        /// <summary>
        /// Oddech skały w tej chwili (-1..1) — ten sam, który słychać w dudnieniu (nagranym od 12. sekundy, z oddechem
        /// sin(t × (0,5 + głód × 2))): obraz oddycha razem z dźwiękiem. Bez dźwięku — null.
        /// </summary>
        public double? oddech(double glodTeraz)
        {
            if (!started || !ustawienia.rezonans) return null;
            var g = dudnienie.Glowna();
            if (g == null) return Math.Sin(Silnik.Ten.czas * (0.5 + glodTeraz * 2));
            return Math.Sin((12 + g.Value.petla.Pozycja) * (0.5 + glod * 2));
        }

        bool gra => started && ustawienia.rezonans;
        void zagraj(string nazwa) { if (gra) Silnik.Ten.Zagraj(SpisDzwiekow.Losowy(nazwa), Szyna.Rezonans); }

        /// <summary>Wiadro z jedzeniem wyłania się ze stropu — skrzyp kołowrotu i stuk drewna.</summary>
        public void wiadro() => zagraj("swiat/wiadro");
        /// <summary>Okruch rudy wpada do licznika — cichy brzęk (złoto jaśniej i dwa razy).</summary>
        public void kruszec(bool zloto) => zagraj(zloto ? "swiat/kruszec-zloto" : "swiat/kruszec-zelazo");
        /// <summary>Rytuał przy ołtarzu: start, koniec albo przerwany; rytuały krwi niżej i ciemniej.</summary>
        public void rytual(string faza, bool krwawy) => zagraj($"swiat/rytual/{faza}-{(krwawy ? "krwi" : "zwykly")}");
        /// <summary>Kropla krwi wpada do misy albo do licznika.</summary>
        public void kropla() => zagraj("swiat/kropla");
        /// <summary>Góra zawala się nad ludem — długi, niski łoskot kamienia.</summary>
        public void zawal() => zagraj("swiat/zawal");
        /// <summary>Cud słychać jako uderzenie w skałę, nie jako fanfarę.</summary>
        public void toll() => zagraj("swiat/cud");
    }

    /// <summary>core/music.ts: Muzyka — powolny akord kamienia, dzwony i niepokój (pomruk, pisk, oddech, trzaski, chór).</summary>
    public sealed class Muzyka
    {
        static readonly Random los = new Random();
        static Typ_MUZYKA M => MUZYKA;
        static Typ_NIEPOKOJ N => NIEPOKOJ;
        static readonly double[] NAPIECIA_GRY = { 0, 0.25, 0.5, 0.75, 1 }, NAPIECIA_SAMOUCZKA = { 0, 0.5, 1 };

        bool zaczeta;
        public bool gra;
        string scena = "menu";
        double napiecie;
        double nastepnyDzwon, nastepnyOddech, nastepnyTrzask, nastepnyChor, ostatnieZaplanowanie = -1;
        readonly Warstwa akordy = new Warstwa(Szyna.Muzyka), pomruk = new Warstwa(Szyna.Muzyka), pisk = new Warstwa(Szyna.Muzyka);
        string akordyPlik = "";
        double akordyNapiecie;

        public void start()
        {
            if (zaczeta) { wznow(); return; }
            zaczeta = true;
            gra = true;
            var s = Silnik.Ten;
            s.Zmien(() => { s.muzyka.Natychmiast(0.0001); s.muzyka.Ustaw(Math.Max(0.0002, ustawienia.glosnosc), M.narastanie / 3); });
            var t = s.czas;
            nastepnyDzwon = 0;
            zagrajAkordy(t + 0.2);
            nastepnyOddech = t + 4;
            nastepnyTrzask = t + 3;
            nastepnyChor = t + 14;
            ustawNiepokoj();
        }

        void wznow()
        {
            gra = true;
            var s = Silnik.Ten;
            s.Zmien(() => s.muzyka.Ustaw(Math.Max(0.0001, ustawienia.glosnosc), 1.5));
        }

        public void stop()
        {
            if (!zaczeta) return;
            gra = false;
            var s = Silnik.Ten;
            s.Zmien(() => s.muzyka.Ustaw(0.0001, 0.8));
        }

        public void glosnosc(double v)
        {
            if (!zaczeta || !gra) return;
            var s = Silnik.Ten;
            s.Zmien(() => s.muzyka.Ustaw(Math.Max(0.0001, v), 0.4));
        }

        /// <summary>Plik akordów sceny przy napięciu (gra — 5 stopni, samouczek — 3, menu i koniec — po jednym).</summary>
        (string plik, double napiecie) plikAkordow()
        {
            double n = scena == "gra" ? NAPIECIA_GRY.OrderBy(x => Math.Abs(x - napiecie)).First()
                : scena == "samouczek" ? NAPIECIA_SAMOUCZKA.OrderBy(x => Math.Abs(x - napiecie)).First()
                : scena == "koniec" ? 0.2 : 0;
            return ($"muzyka/akordy/{scena}-napiecie-{Przenikanie.Proc(n)}-petla.mp3", n);
        }

        /// <summary>Akordy bieżącej sceny od chwili `kiedy` (poprzednie gasną).</summary>
        void zagrajAkordy(double kiedy, double tauWejscia = 0.05)
        {
            var (plik, n) = plikAkordow();
            akordyPlik = plik; akordyNapiecie = n;
            akordy.Ustaw(new Dictionary<string, double> { [plik] = 1 }, tauWejscia, kiedy);
        }

        /// <summary>Scena zmienia progresję i gęstość; napięcie (0..1) dokłada dysonans i tempo.</summary>
        public void ustawScene(string s)
        {
            if (scena == s) return;
            var zejscie = scena == "menu" && (s == "gra" || s == "samouczek");
            scena = s;
            if (!zaczeta || !gra) return;
            var t = Silnik.Ten.czas;
            // poprzedni akord gaśnie szybciej, zanim wejdzie nowy — przejście bez zbitki dwóch harmonii
            akordy.Wycisz(0.5);
            zagrajAkordy(t + 1.4, 1.6);
            // zejście w górę: jedno niskie uderzenie, które długo odbija się w korytarzach
            if (zejscie) Silnik.Ten.Zagraj("muzyka/dzwony/zejscie-do-gory.mp3", Szyna.Muzyka, t + 0.1);
            else if (s == "koniec") Silnik.Ten.Zagraj("muzyka/dzwony/koniec.mp3", Szyna.Muzyka, t + 0.1);
            ustawNiepokoj();
        }

        public void ustawNapiecie(double n)
        {
            var nowe = Math.Max(0, Math.Min(1, n));
            var zmiana = Math.Abs(nowe - napiecie) > 0.04;
            napiecie = nowe;
            if (zmiana) ustawNiepokoj();
            // inny stopień napięcia (krótsze akordy, jaśniejszy filtr) — nowy plik przenika ze starym przez kilka sekund
            if (zaczeta && gra && (scena == "gra" || scena == "samouczek"))
            {
                var (plik, nn) = plikAkordow();
                if (plik != akordyPlik && Math.Abs(napiecie - akordyNapiecie) > 0.17)
                {
                    akordyPlik = plik; akordyNapiecie = nn;
                    akordy.Ustaw(new Dictionary<string, double> { [plik] = 1 }, 1.2);
                }
            }
        }

        /// <summary>Głośność stałych warstw z napięcia i sceny.</summary>
        void ustawNiepokoj()
        {
            if (!zaczeta) return;
            var p = scena == "gra" ? N.pomrukGra + napiecie * N.pomrukNapiecie : scena == "koniec" ? N.pomrukGra * 1.4 : N.pomrukMenu;
            pomruk.Ustaw(new Dictionary<string, double> { ["muzyka/niepokoj/pomruk-petla.mp3"] = p / 0.105 }, 2.5);
            var pi = scena == "gra" && napiecie > N.piskOd ? (napiecie - N.piskOd) / (1 - N.piskOd) : 0;
            pisk.Ustaw(new Dictionary<string, double> { ["muzyka/niepokoj/pisk-petla.mp3"] = pi }, 4);
        }

        /// <summary>W TS — setInterval co 250 ms; tu z klatki gry (App).</summary>
        public void krok()
        {
            if (!zaczeta || !gra) return;
            var teraz = Silnik.Ten.czas;
            if (teraz - ostatnieZaplanowanie < 0.25) return;
            ostatnieZaplanowanie = teraz;
            planuj(teraz);
        }

        double[][] progresja() => scena switch
        {
            "menu" => M.progresja.menu.Select(a => a.stopnie).ToArray(),
            "samouczek" => M.progresja.samouczek.Select(a => a.stopnie).ToArray(),
            "koniec" => M.progresja.koniec.Select(a => a.stopnie).ToArray(),
            _ => M.progresja.gra.Select(a => a.stopnie).ToArray(),
        };

        /// <summary>Akord, który teraz gra — z miejsca w pętli akordów (pętla zaczyna się pierwszym akordem progresji).</summary>
        double[] biezacyAkord()
        {
            var lista = progresja();
            var g = akordy.Glowna();
            if (g == null) return lista[0];
            var dl = scena == "gra" ? M.akordGra - akordyNapiecie * M.skrotNapiecia : M.akordInne;
            return lista[(int)Math.Floor(g.Value.petla.Pozycja / dl) % lista.Length];
        }

        void planuj(double teraz)
        {
            planujNiepokoj(teraz);
            if (teraz > nastepnyDzwon)
            {
                var przerwa = (scena == "menu" ? M.dzwonMenu : M.dzwonGra) + los.NextDouble() * M.dzwonRozrzut - napiecie * M.dzwonNapiecie;
                nastepnyDzwon = teraz + Math.Max(M.dzwonMinPrzerwa, przerwa);
                if (scena != "koniec" || los.NextDouble() < 0.5)
                {
                    var akord = biezacyAkord();
                    var stopien = akord[los.Next(akord.Length)] + 7;
                    // nagrany przy głośności 0,12 — w TS 0,12 + do 0,06 losowo; panorama losowa
                    Silnik.Ten.Zagraj($"muzyka/dzwony/stopien-{(int)stopien}.mp3", Szyna.Muzyka, teraz + 0.05,
                        (M.dzwonGlos + los.NextDouble() * M.dzwonGlosRozrzut) / M.dzwonGlos, (los.NextDouble() - 0.5) * 1.1);
                }
            }
        }

        /// <summary>Oddech, trzaski i chór — rzadkie zdarzenia, gęstsze z napięciem.</summary>
        void planujNiepokoj(double teraz)
        {
            var gesciej = 1 - napiecie * 0.55;
            var s = Silnik.Ten;
            if (teraz > nastepnyOddech)
            {
                s.Zagraj(SpisDzwiekow.Losowy("muzyka/niepokoj/oddech"), Szyna.Muzyka, teraz + 0.05, (0.7 + napiecie * 0.8) / 0.7);
                nastepnyOddech = teraz + (N.oddechCo + los.NextDouble() * N.oddechRozrzut) * gesciej;
            }
            if (teraz > nastepnyTrzask)
            {
                var ile = 1 + los.Next(3);
                double kiedy = teraz + 0.05;
                for (int i = 0; i < ile; i++) { s.Zagraj(SpisDzwiekow.Losowy("muzyka/niepokoj/trzask"), Szyna.Muzyka, kiedy); kiedy += 0.08 + los.NextDouble() * 0.25; }
                nastepnyTrzask = teraz + (N.trzaskCo + los.NextDouble() * N.trzaskRozrzut) * gesciej;
            }
            if (teraz > nastepnyChor && scena != "samouczek")
            {
                s.Zagraj(SpisDzwiekow.Losowy("muzyka/niepokoj/chor"), Szyna.Muzyka, teraz + 0.1, (0.8 + napiecie * 0.9) / 0.8);
                nastepnyChor = teraz + (N.chorCo + los.NextDouble() * N.chorRozrzut) * gesciej;
            }
        }

        /// <summary>Szept z ciemności z jednej strony (przy dłoni z otchłani).</summary>
        public void szept(int strona = 0)
        {
            if (!zaczeta) return;
            if (strona == 0) strona = los.NextDouble() < 0.5 ? -1 : 1;
            Silnik.Ten.Zagraj(SpisDzwiekow.Losowy(strona < 0 ? "muzyka/niepokoj/szept-z-lewej" : "muzyka/niepokoj/szept-z-prawej"), Szyna.Muzyka);
        }

        /// <summary>Otchłań otwiera oczy: narastający pomruk i szept (w pliku).</summary>
        public void otchlan() { if (zaczeta) Silnik.Ten.Zagraj(SpisDzwiekow.Losowy("muzyka/niepokoj/otchlan"), Szyna.Muzyka); }

        /// <summary>Ktoś poszedł w ciemność: głuche uderzenie w głębi i szept z obu stron naraz (w pliku).</summary>
        public void zabranie() { if (zaczeta) Silnik.Ten.Zagraj(SpisDzwiekow.Losowy("muzyka/niepokoj/zabranie"), Szyna.Muzyka); }
    }

    /// <summary>
    /// core/gesty.ts: dźwięki gestów — każdy zamiar gracza zostawia ślad w uchu — i głosy postaci (odmowy, kwestie ludu).
    /// </summary>
    public sealed class Gesty
    {
        static readonly Random los = new Random();
        bool zaczete;
        readonly Dictionary<string, double> ostatnie = new Dictionary<string, double>();
        Petla? ton;
        /// <summary>Kto teraz mówi: do kiedy, jak ważna jest kwestia i czym ją uciszyć — naraz mówi jeden.</summary>
        (double doKiedy, double waga, string kwestia, Jednorazowy glos)? mowa;
        string? ostatniGlos;

        public void start()
        {
            if (zaczete) return;
            zaczete = true;
            odswiezGlosnosc();
            // gesty i głosy — wczytane z góry, żeby pierwszy klik nie czekał na dekoder
            Biblioteka.Przygotuj(SpisDzwiekow.Wszystkie.Where(p => p.StartsWith("gesty/") || p.StartsWith("glosy/")));
        }

        public void odswiezGlosnosc()
        {
            if (!zaczete) return;
            var v = ustawienia.efekty ? ustawienia.glosnosc : 0;
            var s = Silnik.Ten;
            s.Zmien(() => s.gesty.Ustaw(v, 0.1));
            if (!ustawienia.efekty) tonPauzy(false);
        }

        bool gotowe => zaczete && ustawienia.efekty && ustawienia.glosnosc > 0;

        /// <summary>Ten sam gest nie może terkotać — malowanie planu to dziesiątki kafli na sekundę.</summary>
        bool wolno(string klucz, double ms)
        {
            var teraz = Wydajnosc.Teraz();
            if (ostatnie.TryGetValue(klucz, out var o) && teraz - o < ms) return false;
            ostatnie[klucz] = teraz;
            return true;
        }

        void zagraj(string nazwa, double opoznienie = 0) => Silnik.Ten.Zagraj(SpisDzwiekow.Losowy(nazwa), Szyna.Gesty, Silnik.Ten.czas + opoznienie);

        static Typ_GESTY_odstepMs ODS => GESTY.odstepMs;

        /// <summary>Wybór rytu, narzędzia, przycisku — cichy stuk palca w drewno.</summary>
        public void klik() { if (gotowe && wolno("klik", ODS.klik)) zagraj("gesty/klik"); }
        /// <summary>Rozkaz naszkicowany w pauzie: rylec rysuje kreskę.</summary>
        public void szkic() { if (gotowe && wolno("szkic", ODS.szkic)) zagraj("gesty/szkic"); }
        /// <summary>Szkic skreślony: dwa szybkie pociągnięcia w poprzek.</summary>
        public void skresl(bool wszystko = false) { if (gotowe && wolno("skresl", ODS.skresl)) zagraj(wszystko ? "gesty/skreslenie-wszystkiego" : "gesty/skreslenie"); }
        /// <summary>Nie wyszło: głuchy stuk, jak pięść w skałę, która nie ustąpiła.</summary>
        public void odmowa() { if (gotowe && wolno("odmowa", ODS.odmowa)) zagraj("gesty/odmowa"); }

        // ------------------------------------------------------------------ głosy

        static readonly Dictionary<string, string> GRUPY_RZADKOSCI = new Dictionary<string, string>
        { ["pospolita"] = "pospolite", ["rzadsza"] = "rzadsze", ["bardzo-rzadka"] = "bardzoRzadkie", ["ekstremalnie-rzadka"] = "ekstremalnieRzadkie" };

        static double szansaOdmowy(NastawyGlosu G, string plik)
        {
            var m = Regex.Match(plik, @"odmowa-(.+)-\d+\.mp3$");
            var r = G.rzadkosc;
            if (m.Success && GRUPY_RZADKOSCI.TryGetValue(m.Groups[1].Value, out var g))
            {
                var szansa = g switch
                {
                    "rzadsze" => r.rzadsze?.szansa,
                    "bardzoRzadkie" => r.bardzoRzadkie?.szansa,
                    "ekstremalnieRzadkie" => r.ekstremalnieRzadkie?.szansa,
                    _ => r.pospolite?.szansa,
                };
                if (szansa != null) return szansa.Value;
            }
            return r.pospolite?.szansa ?? 1;
        }

        /// <summary>
        /// Rycerz albo pobożny odmawia na głos: jedno z jego nagrań według szans rzadkości, tuż po głuchym stuku odmowy.
        /// Zwraca, czy powiedział — false, gdy dźwięk wyłączony albo ktoś mówi coś nie mniej ważnego.
        /// </summary>
        public bool glosOdmowy(string kto, double pan)
        {
            var G = kto == "rycerz" ? GLOS_RYCERZA : GLOS_POBOZNEGO;
            var waga = GLOSY_LUDU.waga.odmowa;
            if (!gotowe || !wolnoMowic("odmowa", waga) || !wolno($"glos:{kto}", G.odstepMs)) return false;
            var pliki = SpisDzwiekow.Zaczynajace($"glosy/{kto}/odmowa-");
            if (pliki.Length == 0) return false;
            var r = los.NextDouble() * pliki.Sum(p => szansaOdmowy(G, p));
            var wybrany = pliki[pliki.Length - 1];
            foreach (var p in pliki) if ((r -= szansaOdmowy(G, p)) < 0) { wybrany = p; break; }
            powiedz(wybrany, "odmowa", waga, G.opoznienie, pan);
            return true;
        }

        static readonly string[] KWESTIE = { "potwierdzenie", "atak", "bol", "glod" };

        /// <summary>Zwykłe nagrania kwestii roli (bez „rzadkie”) i rzadkie, jeśli jest.</summary>
        static (string[] zwykle, string? rzadkie) kwestia(string rola, string k)
        {
            var wszystkie = SpisDzwiekow.Zaczynajace($"glosy/{rola}/{k}-");
            var rzadkie = wszystkie.FirstOrDefault(p => p.EndsWith($"{k}-{GLOSY_LUDU.rzadkie.nazwa}.mp3"));
            return (wszystkie.Where(p => p != rzadkie).ToArray(), rzadkie);
        }

        /// <summary>Czy ta rola ma jakąkolwiek kwestię (ekran gry śledzi tylko te postacie).</summary>
        public bool maGlos(string rola) => KWESTIE.Any(k => kwestia(rola, k).zwykle.Length > 0);

        static double waga(string k) => k switch
        {
            "bol" => GLOSY_LUDU.waga.bol, "atak" => GLOSY_LUDU.waga.atak, "potwierdzenie" => GLOSY_LUDU.waga.potwierdzenie, _ => GLOSY_LUDU.waga.glod,
        };

        /// <summary>
        /// Postać z ludu mówi kwestię: potwierdza rozkaz, krzyczy do walki, jęczy z bólu albo marudzi z głodu.
        /// Ważniejsza kwestia ucina tę, która trwa; z `ucinaj` każda kwestia ucina taką samą (jęk przy śmierci).
        /// </summary>
        public bool glosLudu(string rola, string rodzaj, double pan, bool ucinaj = false)
        {
            var L = GLOSY_LUDU;
            var w = waga(rodzaj);
            var potw = rodzaj == "potwierdzenie";
            var (zwykle, rzadkie) = kwestia(rola, rodzaj);
            if (!gotowe || zwykle.Length == 0 || !wolnoMowic(rodzaj, w, potw || ucinaj)) return false;
            if (potw && !wolno("ludu:potwierdzenie", L.potwierdzenie.odstep * 1000)) return false;
            string? wybrany = null;
            // stała szansa („rzadkie” — 0,5%) liczy się przy każdym losowaniu, a reszta po równo i nie to samo co ostatnio
            if (rzadkie != null && los.NextDouble() * 100 < L.rzadkie.szansa) wybrany = rzadkie;
            if (wybrany == null)
            {
                var bez = zwykle.Length > 1 ? zwykle.Where(p => p != ostatniGlos).ToArray() : zwykle;
                wybrany = bez[los.Next(bez.Length)];
            }
            ostatniGlos = wybrany;
            powiedz(wybrany, rodzaj, w, potw ? L.potwierdzenie.opoznienie : 0, pan);
            return true;
        }

        bool wolnoMowic(string kwestia, double waga, bool ucinaSiebie = false)
        {
            var m = mowa;
            return m == null || Silnik.Ten.czas >= m.Value.doKiedy || waga > m.Value.waga || (ucinaSiebie && m.Value.kwestia == kwestia);
        }

        /// <summary>Nagranie mowy wchodzi po `opoznienie` s; to, co jeszcze trwało, gaśnie w kilka setnych sekundy.</summary>
        void powiedz(string plik, string kwestia, double waga, double opoznienie, double pan)
        {
            var s = Silnik.Ten;
            var teraz = s.czas;
            if (mowa is { } m && teraz < m.doKiedy)
            {
                var stary = m.glos;
                s.Zmien(() => { stary.glosnosc.Ustaw(0, 0.015, teraz); stary.Zatrzymaj(teraz + 0.08); });
            }
            var t = teraz + opoznienie;
            var g = s.Zagraj(plik, Szyna.Gesty, t, 1, pan);
            mowa = (t + SpisDzwiekow.Mowa(plik), waga, kwestia, g);
        }

        // ------------------------------------------------------------------ pauza

        /// <summary>Czas staje: kamień osiada, zostaje cichy ton zawieszenia. Czas rusza: oddech w górę pasma.</summary>
        public void pauza(bool stoi, bool zAlarmem)
        {
            if (!gotowe) { tonPauzy(false); return; }
            if (stoi)
            {
                if (!zAlarmem) zagraj("gesty/czas-staje");
                tonPauzy(true);
            }
            else
            {
                zagraj("gesty/czas-rusza");
                tonPauzy(false);
            }
        }

        /// <summary>Ton zawieszenia: kwinta D–A wysoko, ledwo słyszalna, falująca — znika, gdy czas rusza.</summary>
        public void tonPauzy(bool on)
        {
            var s = Silnik.Ten;
            if (!on)
            {
                if (ton == null) return;
                var t = ton; ton = null;
                s.Zmien(() => t.Wycisz(0.15));
                return;
            }
            if (ton != null || !gotowe) return;
            ton = s.Petla("gesty/ton-pauzy-petla.mp3", Szyna.Gesty, GESTY.glosnosc.tonPauzy, 1.4, s.czas + 0.4);
        }

        // ------------------------------------------------------------------ zdarzenia

        /// <summary>Plan staje się ciałem: kaskada stuków w górę, po jednym na każdy rozkaz (plik na każdą liczbę).</summary>
        public void wykonanie(int udane, int nieudane)
        {
            if (!gotowe) return;
            int u = Math.Min(8, udane), n = Math.Min(3, nieudane);
            if (u <= 0 && n <= 0) return;
            zagraj($"gesty/wykonanie/udane-{Math.Max(0, u)}-nieudane-{Math.Max(0, n)}");
        }

        /// <summary>Góra woła o uwagę: kryzys — dwa dzwony o pół tonu; wydarzenie — czysta kwinta. Świat na chwilę przycicha.</summary>
        public void alarm(bool kryzys)
        {
            if (!gotowe) return;
            if (kryzys) { Mikser.przycisz(2.6); zagraj("gesty/alarm-kryzys"); }
            else { Mikser.przycisz(1.6, 0.55); zagraj("gesty/alarm-wydarzenie"); }
        }

        public void pekniecie() { if (gotowe) zagraj("zdarzenia/pekniecie-pomnika"); }
        public void rozpadPomnika() { if (!gotowe) return; Mikser.przycisz(3, 0.5); zagraj("zdarzenia/rozpad-pomnika"); }
        public void ostatnieUderzenie() { if (!gotowe) return; Mikser.przycisz(5, 0.3); zagraj("zdarzenia/ostatnie-uderzenie"); }
        public void dlonWyrasta(bool zawal) { if (gotowe) zagraj(zawal ? "zdarzenia/dlon-wyrasta-ze-stropu" : "zdarzenia/dlon-wyrasta-z-podlogi"); }
        public void rzutDloni() { if (gotowe) zagraj("zdarzenia/rzut-dloni"); }
        public void upadek() { if (gotowe && wolno("upadek", 300)) zagraj("zdarzenia/upadek"); }
        public void odbicieOdDloni() { if (gotowe && wolno("odbicie", 200)) zagraj("zdarzenia/odbicie-od-dloni"); }
        public void zawalStropu() { if (!gotowe) return; Mikser.przycisz(2, 0.6); zagraj("zdarzenia/zawal-stropu"); }
        /// <summary>Karta atlasu: szelest papieru.</summary>
        public void kartka() { if (gotowe && wolno("kartka", ODS.kartka)) zagraj("gesty/kartka"); }
        /// <summary>Nowa tablica: kartka i dwa jasne dzwonki — odkrycie, nie alarm.</summary>
        public void tablica() { if (gotowe) zagraj("gesty/nowa-tablica"); }
    }

    /// <summary>core/mikser.ts: jedna przestrzeń dźwięku dla całej gry (Dzwieki/Silnik.cs).</summary>
    public static class Mikser
    {
        /// <summary>0 — świat płynie; 1 — pauza: góra słychać jak przez skałę; pomiędzy — otwarta karta albo atlas.</summary>
        public static void zawies(double ile) => Silnik.Ten.Zawies(ile);
        /// <summary>Ostrzeżenie przygasza całą resztę na chwilę.</summary>
        public static void przycisz(double sekundy, double doPoziomu = -1) => Silnik.Ten.Przycisz(sekundy, doPoziomu < 0 ? MIKSER.przyciszenie : doPoziomu);
        public static void usnij() => Silnik.Ten.Wstrzymaj(true);
        public static void wznow() => Silnik.Ten.Wstrzymaj(false);
    }
}
