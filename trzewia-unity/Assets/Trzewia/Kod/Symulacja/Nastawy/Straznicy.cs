// Wygenerowane z alpha-1/src/nastawy/straznicy.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/straznicy.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/straznicy.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyStraznicy
    {
        public static Typ_STRAZNICY STRAZNICY = new Typ_STRAZNICY
        {
            fale = new Typ_STRAZNICY_fale[]
            {
                new Typ_STRAZNICY_fale
                {
                    prog = 20,
                    straznikow = 2,
                },
                new Typ_STRAZNICY_fale
                {
                    prog = 45,
                    straznikow = 3,
                },
                new Typ_STRAZNICY_fale
                {
                    prog = 70,
                    straznikow = 4,
                },
                new Typ_STRAZNICY_fale
                {
                    prog = 100,
                    straznikow = 2,
                    boss = true,
                },
            },
            hp = 36,
            sila = 2,
            wzrostNaFale = 0.2,
            ciosCo = 120,
            zasieg = 1.4,
            szybkosc = 0.028,
            limitOdRdzenia = 30,
            pojawOd = 7,
            pojawDo = 15,
            pojawOdLudu = 8,
            rycerzWidzi = 40,
            rycerzCiosCo = 60,
            rycerzZasieg = 1.6,
            rycerzPierwszy = 12,
            oddajeCios = 0.6,
            ucieczkaZapas = 6,
            zasypiaPo = 21600,
            rycerzyNaBossa = 1,
            rycerzBroniSieOd = 4,
            rycerzGlodnyWalczyOd = 2.5,
            glodnyNieUciekaOd = 12,
            nagrodaWiary = 15,
        };
    }

    public sealed partial class Typ_STRAZNICY
    {
        public Typ_STRAZNICY_fale[] fale;
        /// <summary>Życie i siła ciosu Strażnika w pierwszej fali; każda następna fala × (1 + `wzrostNaFale`).</summary>
        public double hp;
        public double sila;
        public double wzrostNaFale;
        /// <summary>Co tyle tików Strażnik zadaje cios (gdy stoi przy celu) i z jakiej odległości (kafle).</summary>
        public double ciosCo;
        public double zasieg;
        /// <summary>Prędkość (kafle na tik). Strażnicy przenikają skałę — idą prosto do celu.</summary>
        public double szybkosc;
        /// <summary>Nie odchodzą od rdzenia dalej niż tyle kafli (nie wchodzą wysoko).</summary>
        public double limitOdRdzenia;
        /// <summary>Wychodzą ze skały w tej odległości od przedsionka (kafle).</summary>
        public double pojawOd;
        public double pojawDo;
        /// <summary>Alpha: Strażnik nie wyłania się bliżej niż tyle kafli od kogoś z ludu, kto nie walczy (losuje miejsce do skutku).</summary>
        public double pojawOdLudu;
        /// <summary>Rycerz w tej odległości od Strażnika rusza do walki; uderza co `rycerzCiosCo` tików z `rycerzZasieg` kafli.</summary>
        public double rycerzWidzi;
        public double rycerzCiosCo;
        public double rycerzZasieg;
        /// <summary>Strażnicy biorą na cel rycerza, choćby stał o tyle kafli dalej niż ktoś inny.</summary>
        public double rycerzPierwszy;
        /// <summary>Kto nie jest rycerzem, oddaje zaatakowany słabszy cios (× siła roli × to).</summary>
        public double oddajeCios;
        /// <summary>
        /// Podczas zwykłej fali wszyscy poza rycerzami odchodzą od rdzenia (dalej niż limit + `ucieczkaZapas`)
        /// — modlitwa i tak nic nie kruszy. Przy fali z bossem pobożni zostają: ich modlitwa go osłabia.
        /// </summary>
        public double ucieczkaZapas;
        /// <summary>
        /// Zwykła fala, która przez tyle tików (3 min) nikogo nie uderzy (lud uciekł, rycerzy brak), wraca do snu —
        /// ale skorupa się zrasta: postęp trwającego pęknięcia przepada, nagrody nie ma. Fala z bossem nie zasypia.
        /// </summary>
        public double zasypiaPo;
        /// <summary>
        /// Na bossa walczący ruszają, gdy jest ich co najmniej tylu — mniej czeka z dala od rdzenia.
        /// Alpha: rycerz jest jeden i dużo silniejszy, więc idzie sam (1). Boss już nie zasypia w ścianie
        /// i nie zdradza gniazd (gniazd nie ma); bez walczących pobożni razią go księgami.
        /// </summary>
        public double rycerzyNaBossa;
        /// <summary>Czekający rycerz broni się, gdy Strażnik (albo boss) podejdzie bliżej niż tyle kafli.</summary>
        public double rycerzBroniSieOd;
        /// <summary>Głodny rycerz (powyżej `LUD.glodSam`) idzie jeść — walczy tylko ze Strażnikiem bliżej niż tyle kafli.</summary>
        public double rycerzGlodnyWalczyOd;
        /// <summary>Głodny z ludu nie ucieka przed falą (idzie jeść), dopóki żaden Strażnik nie jest bliżej niż tyle kafli.</summary>
        public double glodnyNieUciekaOd;
        /// <summary>Wiara za pokonaną falę.</summary>
        public double nagrodaWiary;
    }

    public sealed partial class Typ_STRAZNICY_fale
    {
        public double prog;
        public double straznikow;
        public bool? boss;
    }

    /// <summary>
    /// STRAŻNICY SNU (Remake v1, etap 3) — fale przeciwników spod skorupy rdzenia.
    ///
    /// Fala wychodzi ze skały, gdy skorupa jest skruszona w `prog` procentach. Dopóki trwa,
    /// skorupa nie pęka (modlitwa nie kruszy kamienia). Fala kończy się, gdy padnie ostatni
    /// Strażnik — wtedy pękanie rusza dalej, a góra płaci wiarą. Ostatnia fala przychodzi z bossem
    /// (jego nastawy i zachowanie: src/nastawy/boss.ts i src/sim/boss.ts).
    /// Tiki: 120 = sekunda, 7200 = minuta gry.
    /// </summary>
    public sealed partial class Fala
    {
        /// <summary>przy tylu procentach skorupy wychodzi</summary>
        public double prog;
        /// <summary>ilu zwykłych Strażników</summary>
        public double straznikow;
        /// <summary>czy z bossem</summary>
        public bool? boss;
    }
}
