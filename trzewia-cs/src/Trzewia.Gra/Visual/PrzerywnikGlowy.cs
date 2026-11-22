// Oprawa walki, etap 7b (docs/plan-oprawy-cerber.md; użytkownik 22.11, film 3:42): przerywnik przy każdym ścięciu głowy
// Cerbera — inny dla każdej głowy i inny zależnie od tego, która to już głowa. Kolejność ścinania jest stała (pitbull,
// wilk, doberman), więc pierwsza to zawsze pitbull, druga wilk, ostatnia doberman. Użytkownik: „cutscenka włącza się
// w momencie, w którym rycerz skacze i jest moment przed odcięciem głowy, a po wyłączeniu kończy tę animację (zaczyna ją
// tam, gdzie skończył)”.
//
// Inaczej niż przerywniki etapu 4 (Cutscena) ten ZATRZYMUJE grę: od wybicia rycerza do końca filmu symulacja stoi.
// To decyzja ekranu gry (kiedy liczyć tiki) — wynik partii jest ten sam, symulacja liczy się tak samo, tylko później.
// Film (Aplikacja/FilmGlowy.cs) pokazuje chwilę PRZED cięciem: głowa w swoim ruchu, skok rycerza w zwolnieniu, miecz
// w górze — i urywa się tuż przed ciosem. Potem gra rusza dokładnie od tiku, na którym stanęła: rycerz kończy skok,
// tnie, głowa odpada już w grze (lot z fizyką z etapu 3), a w chwili cięcia słychać uderzenie. Pominięcie (spacja / Esc
// / klik) robi to samo, tylko od razu.
using System;
using Trzewia.Rysunek.Duszki;
using Trzewia.Symulacja;

namespace Trzewia.Visual
{
    public static class PrzerywnikGlowy
    {
        /// <summary>Czy przerywnik trwa (gra stoi, ekran pokazuje film).</summary>
        public static bool Trwa { get; private set; }
        /// <summary>Głowa ścinana teraz: 0 doberman, 1 wilk, 2 pitbull.</summary>
        public static int Glowa { get; private set; }
        /// <summary>Która to już głowa: 0 pierwsza, 1 druga, 2 ostatnia.</summary>
        public static int Ktora { get; private set; }
        /// <summary>Arkusz zbroi rycerza (bez „-sciecie”) i głowy ścięte przed tą — z chwili startu, do rysunku filmu.</summary>
        public static string Zbroja { get; private set; } = "rycerz-6-z0";
        public static int[] Odciete { get; private set; } = Array.Empty<int>();

        static double od;
        static bool pominiety, okrzyk, czekaNaCiecie;
        static double rycerzId = -1, bossId = -1, ruchOd = -1;
        /// <summary>Głowy, których przerywnik już był w tej partii (bit na numer głowy).</summary>
        static int widziane;

        static bool Aktywny => VisualConfig.Aktywne(VisualConfig.Przerywniki) && ZmianyKregu.Aktywne;

        /// <summary>Długość filmu (ms): pierwszy krótko, drugi trochę dłużej, ostatni najdłużej.</summary>
        public static double DlugoscMs(int ktora) => ktora switch { 0 => 3400, 1 => 3700, _ => 4300 };
        /// <summary>Chwila wybicia rycerza w filmie (s) — tu jego okrzyk.</summary>
        public static double SkokS(int ktora) => ktora switch { 0 => 1.0, 1 => 1.25, _ => 1.55 };

        /// <summary>Nowa partia: nic z poprzedniej nie zostaje.</summary>
        public static void Nowa()
        {
            Trwa = false; pominiety = false; czekaNaCiecie = false; widziane = 0;
            rycerzId = -1; bossId = -1; ruchOd = -1;
        }

        /// <summary>
        /// Po każdym tiku gry (EkranGry.Krok): rycerz właśnie wybił się do ścięcia głowy Cerbera, a tej głowy przerywnika
        /// jeszcze nie było — przerywnik rusza (true), a ekran przestaje liczyć tiki.
        /// </summary>
        public static bool PoKroku(Sim sim, double teraz)
        {
            if (!Aktywny || Trwa) return false;
            foreach (var c in sim.creatures)
            {
                if (c.dead || Lud.rolaPostaci(c) != "rycerz") continue;
                var R = c.ruch;
                if (R == null || R.id != "sciecieGlowy" || R.traf != 0) continue;
                // wybicie: początek doskoku ruchu „Ścięcie głowy” (w tempie ruchu, jak liczy go Walka)
                var skok = Nastawy.NastawyKrag.SCIECIE_GLOWY.doskok[1] * (R.tempo ?? 1);
                if (sim.tick - R.od < skok) continue;
                var boss = sim.creatureById(R.cel);
                if (boss == null || boss.dead || boss.boss != "demon" || !Walka.mozeSciac(boss)) continue;
                var g = Walka.glowyCerbera(boss);
                if (g.biezaca is not double nr) continue;
                if ((widziane & (1 << (int)nr)) != 0) continue;
                widziane |= 1 << (int)nr;
                var odc = boss.glowyOdciete;
                var lista = new int[odc?.Count ?? 0];
                for (int i = 0; i < lista.Length; i++) lista[i] = (int)odc![i].nr;
                Pokaz((int)nr, (int)g.odcietych, DuszkiLudu.nazwaDuszka(c, "rycerz"), lista, teraz);
                rycerzId = c.id; bossId = boss.id; ruchOd = R.od;
                return true;
            }
            return false;
        }

        /// <summary>
        /// Film od razu, bez gry: głowa `glowa`, która to `ktora`, zbroja rycerza `zbroja`, ścięte już głowy `odciete`.
        /// (PoKroku i podgląd filmów: Trzewia --zrzuty-walki KATALOG --krag --podglad-przerywnikow.)
        /// </summary>
        public static void Pokaz(int glowa, int ktora, string zbroja, int[] odciete, double teraz)
        {
            Glowa = glowa; Ktora = Math.Max(0, Math.Min(2, ktora)); Zbroja = zbroja; Odciete = odciete;
            Trwa = true; od = teraz; pominiety = false; okrzyk = false; czekaNaCiecie = false;
            rycerzId = -1; bossId = -1; ruchOd = -1;
        }

        /// <summary>Czas filmu (s) od startu przerywnika.</summary>
        public static double Czas(double teraz) => Math.Max(0, (teraz - od) / 1000.0);

        /// <summary>Co klatkę (EkranGry.Krok): koniec filmu albo pominięcie — gra rusza od skoku, a ekran czeka na cięcie.</summary>
        public static void Krok(double teraz)
        {
            if (!Trwa) return;
            if (pominiety || teraz - od >= DlugoscMs(Ktora)) { Trwa = false; czekaNaCiecie = rycerzId >= 0; }
        }

        /// <summary>Spacja / Esc / klik: koniec przerywnika od razu.</summary>
        public static void Pomin() { if (Trwa) pominiety = true; }

        /// <summary>
        /// Dźwięki (każdy raz, gra je ekran gry): „okrzyk” rycerza przy wybiciu w filmie i — już w grze — „ciecie”, gdy
        /// głowa naprawdę spadła. Przy ostatniej głowie uderzenie gra konanie Cerbera, więc tu nic.
        /// </summary>
        public static string? Dzwiek(Sim sim, double teraz)
        {
            if (Trwa)
            {
                if (pominiety || okrzyk || Czas(teraz) < SkokS(Ktora)) return null;
                okrzyk = true;
                return "okrzyk";
            }
            if (!czekaNaCiecie) return null;
            var b = sim.creatureById(bossId);
            if (b?.glowyOdciete != null)
                foreach (var o in b.glowyOdciete)
                    if ((int)o.nr == Glowa) { czekaNaCiecie = false; return Ktora < 2 ? "ciecie" : null; }
            // ruch się urwał bez cięcia (rycerz zginął, chybił) — nie ma na co czekać
            var r = sim.creatureById(rycerzId);
            if (b == null || b.dead || r == null || r.dead || r.ruch?.id != "sciecieGlowy" || r.ruch.od != ruchOd) czekaNaCiecie = false;
            return null;
        }
    }
}
