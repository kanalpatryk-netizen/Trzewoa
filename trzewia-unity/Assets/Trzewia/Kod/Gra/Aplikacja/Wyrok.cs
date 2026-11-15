// Port: alpha-1/src/app/wyrok.ts (wyrok po partii), core/save.ts (zapis gracza — miejsce na dysku daje gospodarz:
// w Trzewia.exe Dokumenty\My Games\Trzewia; samo serialize/restore jest w Trzewia.Symulacja/Symulacja/Zapis.cs),
// core/osiagniecia.ts (osiągnięcia) i app/obszary-hud.ts (prostokąty interfejsu do testu nachodzenia).
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Rdzen;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyCzas;
using static Trzewia.Nastawy.NastawyCele;
using static Trzewia.Rdzen.SettingsStore;

namespace Trzewia.Aplikacja
{
    /// <summary>
    /// Wyrok po partii: dlaczego to się tak skończyło i jedna rada na następny raz.
    /// </summary>
    public sealed class WyrokPartii
    {
        public string przyczyna = "", rada = "";
        /// <summary>Jak daleko zaszła droga do Uwolnienia — to, co warto pamiętać z tej partii.</summary>
        public string etap = "";
        /// <summary>v4 beta: liczby z całej partii (jedna linijka).</summary>
        public string statystyki = "";
    }

    public static class Wyrok
    {
        /// <summary>v4 beta: czas, szczyt ludności, narodziny, zgony, wykopane bloki, karty.</summary>
        public static string statystyki(Sim sim)
        {
            double zgonow = 0;
            foreach (var kv in sim.deaths) zgonow += kv.Value;
            var sek = Math.Floor(sim.tick / (TIKOW_NA_MINUTE / 60));
            return $"{Js.Js.S(Math.Floor(sek / 60))}:{Js.Js.S(sek % 60).PadLeft(2, '0')} min · najwięcej dusz {Js.Js.S(sim.stat.szczyt)} · narodzin {Js.Js.S(sim.stat.urodzen)} · zgonów {Js.Js.S(zgonow)}"
                + $" · bloków wykopanych {Js.Js.S(sim.dug)} · kart {Js.Js.S(sim.stat.kart)}";
        }

        public static WyrokPartii wyrok(Sim sim)
        {
            var e = sim.ending ?? "sen";
            var rodzaj = e.Split(':')[0];
            var minut = Math.Max(1, Math.Floor(sim.tick / TIKOW_NA_MINUTE + 0.5));
            double zywych = 0;
            for (int r = 0; r < Races.RACE_COUNT; r++) if (r != Race.MYCELIUM && r != Race.HUMAN) zywych += sim.popByRace[r];
            var oddanie = sim.clans.Aggregate(0.0, (m, k) => Math.Max(m, k.devotion));
            var pek = sim.rytual.pekniecia;

            var etap = rodzaj == "uwolnienie" ? $"Droga przebyta w {Js.Js.S(minut)} min."
                : sim.lud.pomnik != null && sim.lud.pomnik.faza != "stoi" ? "Najdalej: Wielki Pomnik legł w gruzach, a demon wstał — zabrakło tylko ostatniego uderzenia."
                : pek > 0 ? $"Najdalej: Wielki Pomnik pękł do {Js.Js.S(Rytual.procentSkorupy(sim))}%. Brakowało niewiele."
                : oddanie > 0.6 ? "Najdalej: ktoś uwierzył dość mocno, ale nie zszedł do krypty — zabrakło drogi."
                : "Najdalej: nikt nie uwierzył w ciebie dość mocno, by zejść do krypty.";

            if (rodzaj == "uwolnienie")
                return new WyrokPartii
                {
                    przyczyna = "Pobożni skruszyli modlitwą Wielki Pomnik, a rycerz pokonał demona, który w nim spał.",
                    rada = "Spróbuj szybciej — i tak, żeby jak najmniej ludu zostało na ziemi jako trupy. Osiągnięcia podpowiadają, co jeszcze da się zrobić.",
                    etap = etap, statystyki = statystyki(sim),
                };
            if (rodzaj == "upadek")
                return new WyrokPartii
                {
                    przyczyna = "Zabrakło pobożnych — nikt już nie skruszy Wielkiego Pomnika.",
                    rada = "Drużyna jest stała: pilnuj obu pobożnych jak oka w głowie — karm ich, trzymaj z dala od ciemności i nie zostawiaj samych w krypcie w czasie fali.",
                    etap = etap, statystyki = statystyki(sim),
                };
            if (rodzaj == "smierc")
                return new WyrokPartii
                {
                    przyczyna = "Do rdzenia doszli ci, którzy się nie modlili.",
                    rada = "Pilnuj, kto stoi pod skorupą: posyłaj tam swoich wiernych szeptem „módl się” i rób Cud przy ich gnieździe.",
                    etap = etap, statystyki = statystyki(sim),
                };
            // sen: z pustki albo z monokultury
            if (zywych < 14 && sim.dominance < 0.8)
                return new WyrokPartii
                {
                    przyczyna = "Góra opustoszała — nie został prawie nikt, kto by o tobie myślał.",
                    rada = "Karm tych, których jest mało, a na kartach „wymierają” wybieraj ratunek. Pusta góra zasypia w kilka minut.",
                    etap = etap, statystyki = statystyki(sim),
                };
            var nazwa = sim.domRace >= 0 && sim.domRace < Races.RACES.Length ? Races.RACES[(int)sim.domRace].name : "Jedna krew";
            return new WyrokPartii
            {
                przyczyna = $"{nazwa} {Races.odmien(sim.domRace, "zjadł", "zjedli")} resztę. Z jedną krwią w trzewiach nie ma komu się bać.",
                rada = "Gdy wstęga pod płytą robi się jednego koloru, wysłuchaj ich proroka albo skieruj na nich powódź — i dokarmiaj pozostałe rasy, zanim wymrą.",
                etap = etap, statystyki = statystyki(sim),
            };
        }
    }

    /// <summary>core/save.ts: zapis partii w plikach gracza (w przeglądarce był localStorage pod „trzewia-alpha-1:zapis”).</summary>
    public static class Zapisy
    {
        const string PLIK = "zapis.json";

        public static bool saveToStorage(Sim sim)
        {
            try { return Gospodarz.Pliki.Zapisz(PLIK, Zapis.serialize(sim)); } catch { return false; }
        }

        public static Sim? loadFromStorage()
        {
            try
            {
                var raw = Gospodarz.Pliki.Czytaj(PLIK);
                return raw != null ? Zapis.restore(raw) : null;
            }
            catch { return null; }
        }

        public static bool hasSave()
        {
            try { return !string.IsNullOrEmpty(Gospodarz.Pliki.Czytaj(PLIK)); } catch { return false; }
        }
    }

    public sealed class Osiagniecie
    {
        public string id = "", nazwa = "";
        /// <summary>Co trzeba zrobić — jedno zdanie.</summary>
        public string opis = "";
        /// <summary>Czy ta partia je zdobywa (wołane raz, na końcu).</summary>
        public Func<Sim, bool, bool> sprawdz = null!;
    }

    /// <summary>Podsumowanie skończonej partii: nowe osiągnięcia.</summary>
    public sealed class Podsumowanie { public List<Osiagniecie> nowe = new List<Osiagniecie>(); }

    /// <summary>
    /// OSIĄGNIĘCIA (Alpha 0.2) — cele dodatkowe, sprawdzane raz, na końcu partii. Zdobyte zostają w plikach gracza
    /// (w przeglądarce: localStorage „trzewia-alpha-1:osiagniecia”), między partiami. Progi są w nastawach (CELE).
    /// </summary>
    public static class Osiagniecia
    {
        const string PLIK = "osiagniecia.json";

        public static readonly Osiagniecie[] OSIAGNIECIA =
        {
            new Osiagniecie { id = "pierwsza", nazwa = "Przebudzenie", opis = "Wygraj pierwszą partię.", sprawdz = (_s, w) => w },
            new Osiagniecie { id = "szybko", nazwa = "Jak kamień w studnię", opis = $"Wygraj w mniej niż {Js.Js.S(CELE.szybkoMinut)} minut czasu gry.", sprawdz = (s, w) => w && s.tick < CELE.szybkoMinut * TIKOW_NA_MINUTE },
            new Osiagniecie { id = "syci", nazwa = "Pełne wiadra", opis = "Wygraj tak, żeby nikt z ludu nie umarł z głodu.", sprawdz = (s, w) => w && s.stat.zGlodu == 0 },
            new Osiagniecie { id = "ocaleni", nazwa = "Mało grobów", opis = $"Wygraj, tracąc najwyżej {Js.Js.S(CELE.zgonowMaks)} z ludu.", sprawdz = (s, w) => w && s.stat.ludZgonow <= CELE.zgonowMaks },
            new Osiagniecie { id = "skromny", nazwa = "Bez jałmużny", opis = "Wygraj, ani razu nie spuszczając wiadra rytem Nakarm.", sprawdz = (s, w) => w && s.stat.nakarm == 0 },
            new Osiagniecie { id = "wspinaczka", nazwa = "Ostatkiem sił", opis = "Niech umierający z głodu wespnie się po linie do zjeżdżającego wiadra.", sprawdz = (s, _w) => s.stat.wspinaczek > 0 },
            new Osiagniecie { id = "druzyna", nazwa = "Cała drużyna", opis = "Wygraj, nie tracąc nikogo z ludu.", sprawdz = (s, w) => w && s.stat.ludZgonow == 0 },
            new Osiagniecie { id = "helmy", nazwa = "Kilofy zamiast mieczy", opis = "Wygraj partię, w której robotnicy musieli założyć hełmy.", sprawdz = (s, w) => w && s.stat.helmy > 0 },
            new Osiagniecie { id = "weterani", nazwa = "Stara gwardia", opis = $"Miej naraz {Js.Js.S(CELE.weteranow)} weteranów.", sprawdz = (s, _w) => s.stat.weteranowMax >= CELE.weteranow },
            new Osiagniecie { id = "ludna", nazwa = "Ludna góra", opis = $"Miej naraz {Js.Js.S(CELE.lud)} postaci ludu.", sprawdz = (s, _w) => s.stat.ludMax >= CELE.lud },
            new Osiagniecie { id = "dlon", nazwa = "Wyrwani z dłoni", opis = "Odepchnij Cudem dłoń z otchłani, zanim kogoś chwyci.", sprawdz = (s, _w) => s.stat.odepchnieta > 0 },
            new Osiagniecie { id = "dlug", nazwa = "Dłużnik", opis = "Weź krew od głębi i mimo to wygraj.", sprawdz = (s, w) => w && s.stat.dlug > 0 },
        };

        static List<string> wczytaj()
        {
            try
            {
                var raw = Gospodarz.Pliki.Czytaj(PLIK);
                var wynik = new List<string>();
                if (raw != null && Json.Czytaj(raw) is List<object?> l) foreach (var x in l) if (x is string s && !wynik.Contains(s)) wynik.Add(s);
                return wynik;
            }
            catch { return new List<string>(); }
        }

        /// <summary>Zdobyte osiągnięcia (id) — tylko te, które są na obecnej liście (stare z dawnych wersji nie liczą się).</summary>
        public static HashSet<string> zdobyte()
        {
            var juz = wczytaj();
            return new HashSet<string>(OSIAGNIECIA.Where(o => juz.Contains(o.id)).Select(o => o.id));
        }

        /// <summary>
        /// Podsumowanie skończonej partii: zapisuje nowe osiągnięcia. Liczy się raz na partię — wczytany po końcu zapis
        /// nie liczy ich drugi raz.
        /// </summary>
        public static Podsumowanie podsumujPartie(Sim sim)
        {
            if (sim.ending == null) return new Podsumowanie();
            var wygrana = sim.ending.StartsWith("uwolnienie");
            if (sim.stat.podsumowana != 0) return sim.podsumowanie as Podsumowanie ?? new Podsumowanie();
            sim.stat.podsumowana = 1;
            var @out = new Podsumowanie();
            var juz = wczytaj();
            foreach (var o in OSIAGNIECIA)
            {
                if (juz.Contains(o.id)) continue;
                if (o.sprawdz(sim, wygrana)) { juz.Add(o.id); @out.nowe.Add(o); }
            }
            try { Gospodarz.Pliki.Zapisz(PLIK, Json.Pisz(juz.Cast<object?>().ToList())); } catch { /* bez plików gracza */ }
            sim.podsumowanie = @out;
            return @out;
        }
    }

    /// <summary>Nazwany prostokąt interfejsu gry.</summary>
    public sealed class ObszarHud { public string nazwa = ""; public double x, y, w, h; }

    public static class ObszaryHud
    {
        /// <summary>
        /// Wszystkie stałe elementy interfejsu gry jako prostokąty — narzędzie deweloperskie do automatycznego testu,
        /// czy coś na coś nie nachodzi. Nie wpływa na grę. (Tylko układ komputera.)
        /// </summary>
        public static List<ObszarHud> zbierzObszaryHud(Plate p, double vh, Ui ui, List<Przycisk> przyciski, Obszar? droga, Obszar? rada, Obszar menu, Obszar? okno = null)
        {
            var @out = new List<ObszarHud>();
            void dodaj(string nazwa, Obszar? o)
            {
                if (o is { } q && q.w > 0 && q.h > 0) @out.Add(new ObszarHud { nazwa = nazwa, x = q.x, y = q.y, w = q.w, h = q.h });
            }
            Obszar kolo(double x, double y, double r) => new Obszar(x - r, y - r, r * 2, r * 2);

            // Alpha 1 (komputer): bez przycisku menu i klepsydry (Esc, spacja) — pod płytą księga, Budowa i odwołaj
            var u = Przyciski.ukladDolu(p, vh);
            dodaj("księga", new Obszar(u.ksiega.x - u.oprawa, u.ksiega.y - u.oprawa, u.ksiega.w + u.oprawa * 2, u.ksiega.h + u.oprawa * 2));
            dodaj("budowa", u.buduj);
            dodaj("odwołaj", u.odwolaj);
            dodaj("okno postaci", okno);
            foreach (var id in new[] { "zasiej", "szept", "znak" })
            {
                var m = ui.miejsce("verb", id);
                if (m is { } mm) dodaj($"ryt:{id}", new Obszar(mm.x - mm.hw, mm.y - mm.hh, mm.hw * 2, mm.hh * 2));
            }
            foreach (var b in przyciski) dodaj($"przycisk:{b.akcja}", kolo(b.x, b.y, b.r));
            if (ustawienia.skalaGlebokosci && !p.waski && !p.niski) dodaj("minimapa", Minimapa.obszarMinimapy(p));
            dodaj("droga", droga);
            dodaj("rada", rada);
            return @out;
        }
    }
}
