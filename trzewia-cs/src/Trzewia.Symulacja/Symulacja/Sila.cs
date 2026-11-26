// Etap 8 (prośba użytkownika z 26.11): poziom siły ludu w Kręgu Trzecim — „domyślnie rycerz ma 2, pobożny 0 i robotnik
// jeden, poziom siły wzrasta przez chodzenie, kopanie i walkę”. Siła rośnie w punktach: każdy kafel przebyty na nogach,
// każdy wykuty kafel i każdy cios zadany w walce dokłada swoje. Każdy następny poziom kosztuje więcej pracy
// (KosztPoziomu: z 0 na 1 — 150 punktów, z 1 na 2 — 300, z 2 na 3 — 450…); górnej granicy nie ma. Siła służy dźwigni
// w starej komnacie (Symulacja/Dzwignia.cs): ta podnosi bramę lochu, gdy ciągnący mają razem co najmniej Dzwignia.POTRZEBA.
//
// Działa tylko przy zmianach kręgu (ZmianyKregu.Aktywne). Bez nich — i w Alphie 1 — nic się nie liczy, a pola siły
// zostają puste (null), więc zapis i skrót stanu są bit w bit jak w TS.
using System;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static class Sila
    {
        /// <summary>Koszt poziomu: z poziomu L na L+1 trzeba PUNKTY_POZIOMU · (L + 1) punktów.</summary>
        public const double PUNKTY_POZIOMU = 150;
        /// <summary>Punkty za kafel przebyty na nogach (po posadzce i po schodach).</summary>
        public const double ZA_KAFEL_CHODU = 0.5;
        /// <summary>Punkty za kafel wykuty do końca.</summary>
        public const double ZA_KAFEL_KUCIA = 2;
        /// <summary>Punkty za cios zadany w walce (także odbity tarczą — wysiłek ten sam).</summary>
        public const double ZA_CIOS = 10;
        /// <summary>Chód liczy się co tyle tików (z różnicy położeń — drobne drgania w miejscu się znoszą).</summary>
        public const int CO_CHOD = 30;
        /// <summary>Przesunięcie dłuższe niż tyle kafli od ostatniego liczenia to nie chód (przeniesienie, wypchnięcie spod kraty).</summary>
        const double MAKS_PRZESUNIECIE = 3;

        /// <summary>Siła liczy się w tej partii (Krąg Trzeci ze zmianami).</summary>
        public static bool Aktywna => ZmianyKregu.Aktywne;

        /// <summary>Poziom siły na start (według roli): rycerz 2, robotnik 1, pobożny 0.</summary>
        public static double NaStart(string? rola) => rola == "rycerz" ? 2 : rola == "robotnik" ? 1 : 0;

        /// <summary>Poziom siły postaci ludu — dopóki nie urósł, tyle, ile daje rola.</summary>
        public static double Poziom(Creature c) => c.poziomSily ?? NaStart(Lud.rolaPostaci(c));

        /// <summary>Ile punktów trzeba, by z poziomu `poziom` wejść na następny.</summary>
        public static double KosztPoziomu(double poziom) => PUNKTY_POZIOMU * (Math.Max(0, poziom) + 1);

        /// <summary>Ile z drogi do następnego poziomu już za nią (0…1).</summary>
        public static double Postep(Creature c) => Math.Max(0, Math.Min(1, (c.punktySily ?? 0) / KosztPoziomu(Poziom(c))));

        /// <summary>Dokłada punkty siły; nowy poziom — myśl nad głową i wpis w kronice.</summary>
        public static void Dodaj(Sim sim, Creature c, double punkty)
        {
            if (!Aktywna || c.dead || punkty <= 0 || Lud.rolaPostaci(c) == null) return;
            var przed = Poziom(c);
            var poziom = przed;
            var p = (c.punktySily ?? 0) + punkty;
            while (p >= KosztPoziomu(poziom)) { p -= KosztPoziomu(poziom); poziom++; }
            c.punktySily = p;
            c.poziomSily = poziom;
            if (poziom == przed) return;
            sim.efekt(c.x, c.y - 0.6, "mysl", $"siła {JS.S(poziom)}!");
            sim.gdzie(c.x, c.y).log($"{Nazwa(c)} nabiera siły — teraz ma {JS.S(poziom)}.", "swiat", "sila");
        }

        /// <summary>Nazwa w kronice: „Grabarz #12 nabiera siły…”.</summary>
        static string Nazwa(Creature c)
        {
            var rola = Lud.rolaPostaci(c) switch { "robotnik" => Krag.T("Robotnik", "Grabarz"), "rycerz" => "Rycerz", _ => Krag.T("Pobożny", "Mnich") };
            return $"{rola} #{JS.S(c.id)}";
        }

        /// <summary>
        /// Chód — co CO_CHOD tików: ile kafli postać przeszła od poprzedniego liczenia. Liczy się krok po posadzce i po
        /// schodach drogi wiernych; nie liczy się lot (rzut, dłoń z otchłani), jazda w wiadrze, wspinaczka po linie ani
        /// spadanie.
        /// </summary>
        public static void Chod(Sim sim)
        {
            if (!Aktywna || sim.tick % CO_CHOD != 0) return;
            var w = sim.world;
            foreach (var c in sim.creatures)
            {
                if (c.dead || Lud.rolaPostaci(c) == null) continue;
                if (c.sladX is double px && c.sladY is double py && NaNogach(c))
                {
                    double dx = Math.Abs(c.x - px), dy = Math.Abs(c.y - py);
                    double fx = Math.Floor(c.x), fy = Math.Floor(c.y);
                    var naSchodach = w.inb(fx, fy) && w.schody[w.idx(fx, fy)] == 1;
                    var droga = dx + (naSchodach ? dy : 0);
                    if (droga > 0 && dx + dy <= MAKS_PRZESUNIECIE) Dodaj(sim, c, droga * ZA_KAFEL_CHODU);
                }
                c.sladX = c.x; c.sladY = c.y;
            }
        }

        /// <summary>Stoi albo idzie na własnych nogach (nie leci, nie jedzie, nie wisi, nie spada).</summary>
        static bool NaNogach(Creature c) =>
            c.lot == null && c.wDloni != true && c.naWiadrze != true && c.naLinie == null && c.vy <= 0.3;

        /// <summary>Wykuty kafel (Stworzenia.digTile).</summary>
        public static void Kucie(Sim sim, Creature c) => Dodaj(sim, c, ZA_KAFEL_KUCIA);

        /// <summary>Cios zadany w walce (Straznicy.ranStraznika, Stworzenia.doFight).</summary>
        public static void Cios(Sim sim, Creature c) => Dodaj(sim, c, ZA_CIOS);
    }
}
