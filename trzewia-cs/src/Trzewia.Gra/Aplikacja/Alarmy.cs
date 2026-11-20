// Port: alpha-1/src/app/alarmy.ts — strażnik pauzy: pilnuje chwil, w których trzeba decydować (zaczyna się sen, pęka
// skorupa, wstaje dłoń, przychodzi fala Strażników) i wtedy zatrzymuje świat, zamiast pozwolić, by przeleciało obok.
using System;
using System.Collections.Generic;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyRytual;
using static Trzewia.Nastawy.NastawyStraznicy;
using static Trzewia.Nastawy.NastawyDlon;

namespace Trzewia.Aplikacja
{
    /// <summary>Sytuacja, przy której gra sama zatrzymuje czas i mówi, co możesz zrobić.</summary>
    public sealed class Alarm
    {
        public string rodzaj = "";
        /// <summary>Kryzys zatrzymuje czas na poziomie „kryzysy”; zwykłe wydarzenie tylko na „wszystko”.</summary>
        public bool kryzys;
        public string tytul = "", tekst = "", rada = "";
        public (double x, double y, string tekst)? cel;
        /// <summary>Tablica atlasu, która opisuje tę sytuację.</summary>
        public string? tablica;
    }

    public sealed class Straznik
    {
        /// <summary>Ile fal Strażników już się zaczęło.</summary>
        static double falRozpoczetych(Sim sim)
        {
            var st = sim.lud.straznicy;
            return st != null ? st.fala + (st.trwa ? 1 : 0) : 0;
        }

        Sim? sim;
        double senProg, pekniec, fal;
        bool otwarta;
        readonly Dictionary<string, double> ostatnio = new Dictionary<string, double>();
        double ostatniAlarm = -1e9;
        /// <summary>Od kiedy wznosi się dłoń z otchłani, o której już powiedzieliśmy.</summary>
        double dlonOd = -1;
        /// <summary>Rodzaje, przy których gracz poprosił, żeby go więcej nie zatrzymywać.</summary>
        public readonly HashSet<string> wyciszone = new HashSet<string>();
        /// <summary>Ostatni sprawdzony odcinek 30 tików (sprawdzamy raz na odcinek).</summary>
        double odcinek = -1;

        void od(Sim s)
        {
            if (sim == s) return;
            sim = s;
            ostatnio.Clear();
            senProg = s.sen;
            pekniec = s.rytual.pekniecia;
            otwarta = s.rytual.otwarta;
            fal = falRozpoczetych(s);
            ostatniAlarm = s.tick;
            odcinek = Math.Floor(s.tick / 30.0);
        }

        /// <summary>poziom: 'wyłączona' | 'kryzysy' | 'wszystko'.</summary>
        public Alarm? sprawdz(Sim s, string poziom)
        {
            od(s);
            if (poziom == "wyłączona" || s.ending != null) return null;
            // raz na każde 30 tików świata — klatka robi kilka tików naraz, więc nie „gdy tik dzieli się przez 30”
            var odc = Math.Floor(s.tick / 30.0);
            if (odc == odcinek) return null;
            odcinek = odc;
            var alarm = wykryj(s);
            if (alarm == null) return null;
            var r = alarm.rodzaj;
            alarm.tablica = r.StartsWith("wymiera-") ? $"rasa-{r.Substring(8)}"
                : r == "dominacja" || r.StartsWith("sen") ? "sen"
                : r == "otwarta" ? "rdzen"
                : r.StartsWith("pekniecie") ? "skorupa"
                : r == $"fala-{STRAZNICY.fale.Length}" ? "boss"
                : r.StartsWith("fala-") ? "straznicy"
                : r == "dlon" ? "dlon" : null;
            if (!alarm.kryzys && poziom != "wszystko") return null;
            if (wyciszone.Contains(r)) return null;
            // nie częściej niż co kilkanaście sekund świata, a ten sam rodzaj rzadziej —
            // oprócz dłoni: jej czas biegnie, więc ostrzeżenie przychodzi od razu
            if (r != "dlon" && s.tick - ostatniAlarm < 1500) return null;
            if (s.tick - (ostatnio.TryGetValue(r, out var t) ? t : -1e9) < 5400) return null;
            ostatniAlarm = s.tick;
            ostatnio[r] = s.tick;
            return alarm;
        }

        Alarm? wykryj(Sim s)
        {
            // Koszmar: pod kimś z ludu porusza się otchłań — z głębi wznosi się dłoń
            var d = s.lud.dlon;
            // (dopiero gdy łuna już świeci i dłoń majaczy w dole — karta zatrzymuje czas, a z nią obraz)
            if (d != null && d.faza == "wstaje" && s.tick - d.od >= 90 && d.od != dlonOd)
            {
                dlonOd = d.od;
                var ile = d.ofiary.Count;
                var zostalo = Math.Max(1, Math.Floor((DLON.wstaje + DLON.siega - (s.tick - d.od)) / 120 + 0.5));
                return new Alarm
                {
                    rodzaj = "dlon", kryzys = true,
                    tytul = "Coś wznosi się z otchłani",
                    tekst = $"Pod stopami {(ile > 1 ? "dwojga z ludu" : "kogoś z ludu")} zaczerwieniła się otchłań i z głębi wznosi się ogromna dłoń. {(ile > 1 ? "Stoją" : "Stoi")} jak {(ile > 1 ? "wryci" : "wryty")}. Za {Js.Js.S(zostalo)} sekund sięgnie w górę i zabierze {(ile > 1 ? "ich" : "go")} w dół — bez śladu.",
                    rada = "Rzuć Cud przy nich, zanim dłoń chwyci — światło zepchnie ją z powrotem w otchłań.",
                    cel = (d.cx, d.cy, "tu sięgnie dłoń"),
                };
            }

            // WERSJA ANDROID: wymieranie, dominacja i przypływy przychodzą jako karty wydarzeń
            // z wyborem (sim/wydarzenia.ts) — tu zostają tylko sen i kamienie milowe rytuału.
            // sen
            foreach (var prog in new[] { 0.2, 0.55 })
            {
                if (senProg < prog && s.sen >= prog)
                {
                    senProg = s.sen;
                    return new Alarm
                    {
                        rodzaj = $"sen-{Js.Js.S(prog)}", kryzys = true,
                        tytul = prog < 0.5 ? "Zasypiasz" : "Powieka opada",
                        tekst = prog < 0.5 ? "Na górze robi się cicho. Jedna krew albo pustka — i sen przychodzi sam."
                            : "Jeszcze chwila i zaśniesz na zawsze. Obudzi cię tylko wojna, którą sam rozpętasz.",
                        rada = "Szepnij „prorokuj” w największej nacji — ich wojna cofa sen. Nakarm tych, których jest najmniej.",
                    };
                }
            }
            senProg = Math.Min(senProg, s.sen);
            // etap 3: fala Strażników Snu
            var f = falRozpoczetych(s);
            // Krąg bez Cieni Żarłoków (ZmianyKregu): fale bez bossa przepadają po cichu — alarm tylko o Cerberze
            if (f > fal && ZmianyKregu.BezCieni && !(f - 1 < STRAZNICY.fale.Length && STRAZNICY.fale[(int)f - 1].boss == true)) fal = f;
            if (f > fal)
            {
                fal = f;
                pekniec = s.rytual.pekniecia;     // pęknięcie, które wywołało falę, nie zatrzymuje gry drugi raz
                var w = s.world;
                var def = f - 1 < STRAZNICY.fale.Length ? STRAZNICY.fale[(int)f - 1] : null;
                var boss = def?.boss == true;
                return new Alarm
                {
                    rodzaj = $"fala-{Js.Js.S(f)}", kryzys = true,
                    tytul = boss ? $"Ostatnia fala — {Boss.aktywnyBoss().nazwa}" : Krag.T($"Strażnicy Snu — fala {Js.Js.S(f)} z {STRAZNICY.fale.Length}", $"Cienie Żarłoków — fala {Js.Js.S(f)} z {STRAZNICY.fale.Length}"),
                    tekst = boss ? Krag.T($"Z gruzów Wielkiego Pomnika wstał demon. {Boss.aktywnyBoss().opis}", $"Z gruzów pieczęci zejścia wstał Cerber. {Boss.aktywnyBoss().opis}")
                        : $"Ze skały wokół krypty wychodzą Strażnicy ({(def != null ? Js.Js.S(def.straznikow) : "?")}). Dopóki żyją, pomnik nie pęka. Pobożni i {Krag.T("robotnicy", "grabarze")} odchodzą z krypty — walczy rycerz.",
                    rada = boss ? Krag.T("Rycerz na demona, obaj pobożni do modlitwy w krypcie — wtedy demon słabnie. Robotnicy muszą odkopywać zasypaną drogę.", "Rycerz na Cerbera, obaj mnisi do modlitwy w krypcie — wtedy Cerber słabnie. Grabarze muszą odkopywać zasypaną drogę.")
                        : Krag.T("Rycerz walczy sam; gdy zginie, robotnicy założą hełmy. Pilnuj, żeby był najedzony.", "Rycerz walczy sam; gdy zginie, grabarze założą hełmy. Pilnuj, żeby był najedzony."),
                    cel = (w.coreX + 0.5, w.przedsionekY + 0.5, "przedsionek"),
                };
            }
            // skorupa rdzenia
            if (s.rytual.otwarta && !otwarta)
            {
                otwarta = true;
                var w = s.world;
                return new Alarm
                {
                    rodzaj = "otwarta", kryzys = true,
                    tytul = "Droga do rdzenia stoi otworem",
                    tekst = "Ktoś zaraz dojdzie do ciebie. Jeśli wierzy — uklęknie i cię uwolni. Jeśli nie — zabije.",
                    rada = "Nic nie musisz — wierni zejdą sami. Karm wartę i nie pozwól, by obcy zdążyli pierwsi.",
                    cel = (w.coreX + 0.5, w.coreY + 0.5, "rdzeń"),
                };
            }
            if (s.rytual.pekniecia > pekniec)
            {
                pekniec = s.rytual.pekniecia;
                var w = s.world;
                var r = s.rytual;
                // tylko pierwsze pęknięcie zatrzymuje grę — dalej postęp rośnie w procentach, bez etapów
                if (r.pekniecia != 1) return null;
                return new Alarm
                {
                    rodzaj = "pekniecie-pierwsze", kryzys = true,
                    tytul = Krag.T($"Wielki Pomnik zaczął pękać — {Js.Js.S(Rytual.procentSkorupy(s))}%", $"Pieczęć zejścia zaczęła pękać — {Js.Js.S(Rytual.procentSkorupy(s))}%"),
                    tekst = Krag.T($"Modlitwa pobożnych kruszy kamiennego demona, którego nie ruszy żaden kilof. Góra oddaje ci za to {Js.Js.S(RYTUAL.nagrodaWiary)} wiary. Gdy pomnik pęknie do końca, demon w nim się obudzi.", $"Modlitwa mnichów kruszy pieczęć, której nie ruszy żaden kilof. Góra oddaje ci za to {Js.Js.S(RYTUAL.nagrodaWiary)} wiary. Gdy pieczęć pęknie do końca, Cerber pod nią się obudzi."),
                    rada = Krag.T("Pilnuj, żeby robotnicy donosili jedzenie warcie w krypcie, a rycerz był najedzony — przy każdym pęknięciu wychodzą Strażnicy.", "Pilnuj, żeby grabarze donosili jedzenie warcie w krypcie, a rycerz był najedzony — przy każdym pęknięciu wychodzą Strażnicy."),
                    cel = (w.coreX + 0.5, w.przedsionekY + 0.5, "przedsionek"),
                };
            }
            return null;
        }
    }
}
