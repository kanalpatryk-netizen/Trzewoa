// Port: alpha-1/src/sim/creatures.ts (typy: Job, Thought, Creature, makeCreature) i sim.ts (Clan, Particle, PK, ChronicleEntry)
using System;
using Trzewia.Nastawy;
using System.Collections.Generic;
using Trzewia.Js;
using static Trzewia.Nastawy.NastawyStworzenia;

namespace Trzewia.Symulacja
{
    /// <summary>Zajęcie stworzenia (enum Job w TS — numery idą do zapisu, kolejność bez zmian).</summary>
    public static class Job
    {
        public const int WANDER = 0, DIG = 1, EAT = 2, PRAY = 3, BUILD = 4, FIGHT = 5, FLEE = 6, BREED = 7, HAUL = 8, SLAVE = 9, DESCEND = 10;
        /// <summary>Puste miejsce po najeździe z powierzchni (wycięty) — zostaje, żeby numery zajęć w zapisach się nie przesunęły.</summary>
        public const int RAID = 11;
        public const int SACRIFICE = 12;
        /// <summary>Trol nie umiera z głodu — zasypia w skale i czeka, aż coś przejdzie obok.</summary>
        public const int SLEEP = 13;
        /// <summary>Żużlowiec wraca do ognia; Prządka wysysa wziętego w jarzmo.</summary>
        public const int HEAT = 14, DRAIN = 15;
        /// <summary>Wierni idą pod skorupę rdzenia i modlą się tam, aż kamień ustąpi.</summary>
        public const int PIELGRZYM = 16;
        /// <summary>Remake v1: robotnik zbiera grzyb (albo zapasy ze starej spiżarni) do siedziby.</summary>
        public const int ZBIERA = 17;
        /// <summary>Remake v1: głodny idzie zjeść ze spiżarni w siedzibie.</summary>
        public const int ZAPAS = 18;
        /// <summary>Remake v1: robotnik niesie jedzenie głodnemu pobożnemu albo rycerzowi tam, gdzie ten stoi.</summary>
        public const int DOSTAWA = 19;
        /// <summary>Remake v1: rycerz trzyma wartę z boku przedsionka, gdy pobożni modlą się pod rdzeniem.</summary>
        public const int WARTA = 20;
        /// <summary>Remake v1: stoi w wyznaczonym miejscu przy obozie — pobożny się tam modli, rycerz pilnuje, robotnik odpoczywa.</summary>
        public const int STOI = 21;
        /// <summary>Remake v2: skrajnie głodny biegnie pod linę zjeżdżającego wiadra (potem wspina się po niej — sim/wiadro.ts).</summary>
        public const int LINA = 22;
        /// <summary>6.11: robotnik buduje schody drogi wiernych (sim/budowa-schodow.ts).</summary>
        public const int SCHODY = 23;
    }

    /// <summary>Myśl, którą wkładasz stworzeniu do głowy. Znika, gdy zostanie wykonana.</summary>
    public static class Thought
    {
        public const int NONE = 0, DIG_DOWN = 1, KILL_KIN = 2, PROPHESY = 3, FLEE_UP = 4, BREED = 5;
        /// <summary>Szept „módl się”: idzie pod skorupę rdzenia i modli się tam jak pielgrzym.</summary>
        public const int PRAY_CORE = 6;
    }

    public sealed class PoGruzie { public double x, y, @do; }
    public sealed class BudowaPostaci { public double odcinek; public string rola = "murarz"; public double? ktory; }
    public sealed class Oberwal { public double t; public bool mocno; }
    public sealed class Naprawa { public string faza = "wspina"; public double od, x, dno; }
    public sealed class Lot { public double vx, vy, od; public double? stropT; }
    public sealed class Drgniecie { public double t, sila, kier; }

    /// <summary>Ruch walki w toku (sim/walka.ts) — cios, obrona albo reakcja; rysunek odgrywa go od tego samego tiku.</summary>
    public sealed class RuchTrwa
    {
        public string id = "";
        /// <summary>od którego tiku i ile trwa</summary>
        public double od, dl;
        /// <summary>na kogo (id stworzenia, −1 — nikt)</summary>
        public double cel;
        /// <summary>ile trafień już padło i ile każde zadało (ujemne — zablokowane, 0 — chybione)</summary>
        public double traf;
        public List<double> zadane = new List<double>();
        /// <summary>reakcja: skąd przyszedł cios (−1/1) i jak mocny (ułamek życia); wariant (zachwianie: 2 — klęka)</summary>
        public double? kier, sila, wariant;
        /// <summary>przemieszczenie: skąd (szarża) i dokąd</summary>
        public double? x0, y0, cx, cy;
    }

    /// <summary>
    /// Stworzenie (interface Creature w TS). Pola nazywają się jak w TS — zapis gry jest ten sam. Pola opcjonalne
    /// (`?:` w TS) są tu nullowalne: null = undefined (brak w zapisie).
    /// </summary>
    public sealed class Creature
    {
        public double id;
        public int race;
        public int clan;
        public double x, y;
        public double vy;
        public double hp;
        public double hunger;
        public double fear;
        public double devotion;
        public double age;
        public int job;
        public double jx, jy, jt;
        public double dig;
        /// <summary>niesiona ruda</summary>
        public double carry;
        /// <summary>Jak długo to nosi — po czasie i tak chowa łup dla klanu.</summary>
        public double carryT;
        /// <summary>-1 / 1</summary>
        public double face;
        public double anim;
        public int thought;
        /// <summary>Ile tików stoi w miejscu — bez tego zalany korytarz zatrzymuje kolonię na zawsze.</summary>
        public double stall;
        public double lx, ly;
        public bool prophet;
        /// <summary>Wzięty w jarzmo — Prządki nie rodzą, tylko przerabiają cudze dzieci na swoje.</summary>
        public bool slave;
        /// <summary>szaleństwo z głębokości</summary>
        public double mad;
        public bool dead;
        /// <summary>Tik, w którym ostatnio podciągał się w górę — przy ścianie wtedy nie spada.</summary>
        public double? wspina;
        /// <summary>Wyznaczona droga do celu zajęcia (indeksy kafli) i miejsce na niej. Nie trafia do zapisu.</summary>
        [BezZapisu] public List<double>? droga;
        public double? drogaI;
        /// <summary>Remake v2: droga wiedzie przez skałę — lite kafle na niej kuje po kolei (szukajKopiac w droga.ts).</summary>
        public bool? drogaKopie;
        /// <summary>Remake v2: kierunek schodów, które kuje na przełaj pod górę (−1 / 1).</summary>
        public double? schody;
        /// <summary>Kiedy (tik) i który kafel ostatnio kuł — dla rysunku.</summary>
        public double? kujeT, kujeX, kujeY;
        /// <summary>Remake v1: rola w ludzie (pobozny, robotnik, rycerz); brak = pobożny.</summary>
        public string? rola;
        public bool? okaleczony;
        public double? bezSpizarniDo;
        public double? bezModlitwyDo;
        public double? dostawaDla;
        public PoGruzie? poGruzie;
        public BudowaPostaci? budowa;
        public double? bezczynnyOd;
        public XY? doObozu;
        public string? zamiar;
        public double? zamiarDo;
        public bool? kopieDroge;
        /// <summary>'magma' | 'woda' | 'glod' | 'starosc' | 'przysypany' | 'upadek' | 'grzybnia'</summary>
        public string? rana;
        public bool? modliPrzyObozie;
        public double? blogDo, blogOd, blogT;
        public bool? wyprawa;
        public double? odOgnia;
        public double? zatrutyDo;
        public double? zamarlyDo;
        public bool? straznik;
        public string? boss;
        public double? ciosT;
        public double? ksiegaT;
        public double? hpMax;
        public double? zasypT;
        public XY? posterunek;
        public double? od;
        public double? szalDo;
        public Polecenie? polecenie;
        /// <summary>'buduje' | 'spi' | 'modli' | 'czyta' | 'zaklada' | 'skleja' | 'kreci'</summary>
        public string? czynnosc;
        public double? snu;
        public Odmowa? odmowa;
        public Oberwal? oberwal;
        public double? chwytOd;
        public double? poprzX;
        public bool? helm;
        public List<string>? zbroja;
        public double? doKuzni;
        public double? zakladanie;
        public double? zbrojaBezDo;
        public Naprawa? naprawia;
        public bool? wDloni;
        public Lot? lot;
        public double? ogluszonyDo;
        public double? przystanDo;
        public RuchTrwa? ruch;
        public Drgniecie? drgniecie;
        public string? kombo;
        public double? ogluszonyAtakDo;
        public double? pali;
        public string? ruchPoprz;
        public bool? rykPo;
        public double? rykT;
        public double? rozkazOd;
        public double? chwiejT;
        public double? linaDo;
        public double? naLinie;
        public bool? naWiadrze;

        /// <summary>{ ...c } z JS — płytka kopia (np. pozorny wędrowiec z przedsionka w powrotSpodRdzenia).</summary>
        public Creature Kopia() => (Creature)MemberwiseClone();
    }

    /// <summary>Pole, które nie idzie do zapisu gry (ani do skrótu stanu).</summary>
    [AttributeUsage(AttributeTargets.Field)]
    public sealed class BezZapisuAttribute : Attribute { }

    public sealed class Clan
    {
        public int id;
        public int race;
        public string name = "";
        /// <summary>gniazdo</summary>
        public double hx, hy;
        public double pop;
        public double cap;
        /// <summary>ile cię czci</summary>
        public double devotion;
        /// <summary>zniesiona ruda</summary>
        public double stock;
        public JsMap<double, double> grudge = new JsMap<double, double>();
        public double founded;
        public bool dead;
        /// <summary>Kuźnie klanu — Żużlowcy wychodzą z ognia, nie z gniazda.</summary>
        public List<double> forges = new List<double>();
        public double? kuto;
        public bool? zSzeptu;
        public bool? powrotOk;
        public double? powrotT;
        /// <summary>odcień, żeby odróżnić nacje tej samej rasy</summary>
        public double tint;
        /// <summary>Postęp kruszenia skorupy rdzenia — należy do nacji, nie do konkretnych wiernych.</summary>
        public double rytual;
        /// <summary>Ile pęknięć ta nacja już wykuła modlitwą.</summary>
        public double pekniecia;
        /// <summary>v4.1 beta: cecha nacji (id z nastawy/cechy.ts); brak = bez cechy.</summary>
        public string? cecha;
    }

    public sealed class Particle { public double x, y, vx, vy, life, max; public int kind; }

    public static class PK { public const int EMBER = 0, SPORE = 1, BLOOD = 2, PRAY = 3, DUST = 4, GLINT = 5; }

    public sealed class ChronicleEntry
    {
        public double tick;
        public string text = "";
        /// <summary>'krew' | 'wiara' | 'otchlan' | 'swiat' | 'koniec'</summary>
        public string kind = "swiat";
        public string? key;
        public double? n;
        /// <summary>Miejsce zdarzenia — po kliknięciu w zapiskach kamera tam skacze.</summary>
        public double? x, y;
    }

    /// <summary>Krótki znak nad światem (render/efekty.ts: Efekt).</summary>
    public sealed class Efekt
    {
        public double x, y;
        /// <summary>'kopniecie' | 'zasiew' | 'mysl' | 'cud' | 'skaza' | 'zawal' | 'smierc' | 'objawienie' | 'szept'</summary>
        public string rodzaj = "";
        public double t, max;
        public string? tekst;
    }

    public static partial class Stworzenia
    {
        /// <summary>Numer nadaje symulacja: licznik wspólny dla wszystkich gór sprawiał, że ta sama góra w drugiej partii żyła inaczej.</summary>
        public static Creature makeCreature(int race, int clan, double x, double y, double id)
        {
            var d = Races.RACES[race];
            var K = STWORZENIA;
            return new Creature
            {
                id = id, race = race, clan = clan, x = x, y = y, vy = 0,
                hp = d.maxHp, hunger = K.glodNaStart, fear = 0, devotion = K.oddanieNaStart, age = 0,
                job = Job.WANDER, jx = x, jy = y, jt = 0, dig = 0, carry = 0, carryT = 0,
                face = 1, anim = 0, thought = Thought.NONE, stall = 0, lx = x, ly = y, prophet = false, slave = false, mad = 0, dead = false,
            };
        }
    }
}
