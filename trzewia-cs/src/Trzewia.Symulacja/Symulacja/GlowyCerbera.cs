// Etap 6 — mechanika Cerbera (docs/plan-oprawy-cerber.md; użytkownik 20.11: „Kontynuuj ze wszystkim innym”). Krąg Trzeci,
// za ZmianyKregu (wyłączone — Krąg jak w TS):
//   1. Każda głowa ma swój atak z zapowiedzią: pitbull gryzie (czerwony łuk 0,5 s przed ugryzieniem), wilk wyje (pierścień
//      0,8 s — kto w nim stoi, jest ogłuszony), doberman zieje ogniem (linia 0,7 s). Ścięta, śpiąca albo zwisająca (pusty
//      pasek) głowa nie atakuje; z każdą ściętą pozostałe atakują częściej.
//   2. Karmienie jako decyzja gracza: „garść w paszczę” (pasek Cerbera, przycisk „Nakarm”) usypia jedną głowę na kilka
//      sekund; koszt w jedzeniu na przycisku. Samo z siebie (dawny okup co 5 s) już się nie dzieje.
//   3. Dłoń jako cud: przycisk „Dłoń” (koszt w wierze) — dłoń z otchłani wyrasta pod Cerberem i trzyma go przez kilka
//      sekund: nie chodzi, nie gryzie, nie zrasta się. Sama już Cerberowi nie pomaga (rzut, tarcza, zawał — wyłączone).
//   4. Gracz wskazuje, którą głowę bić (klik w jej pasek): rany idą w pasek wskazanej głowy i to ją rycerz zetnie. Każda
//      głowa ma własne życie (glowyHp); życie Cerbera to ich suma, więc reszta gry liczy się jak dotąd.
// Liczby (bronie głów, koszty, czasy) — do akceptacji użytkownika: w tym pliku, sekcja „liczby”.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Nastawy;
using static Trzewia.Nastawy.NastawyKrag;
using static Trzewia.Nastawy.NastawyDlon;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static class GlowyCerbera
    {
        // ───────────────────────────── liczby (do akceptacji) ─────────────────────────────

        /// <summary>Numery głów jak w SCIECIE_GLOW: 0 — doberman, 1 — wilk, 2 — pitbull.</summary>
        public const int DOBERMAN = 0, WILK = 1, PITBULL = 2;
        public static readonly string[] NAZWA = { "doberman", "wilk", "pitbull" };
        public static readonly string[] DOPELNIACZ = { "dobermana", "wilka", "pitbulla" };

        /// <summary>
        /// Bronie głów (wzory użytkownika): „czas” = czas zapowiedzi — łuk, linia, pierścień rosną przez cały zamach, a rana
        /// wchodzi na jego końcu. Średnia rana na sekundę jak broni Cerbera (9,5–14 co 1,7 s) — gryzienie szybsze, ogień
        /// taki sam, wycie słabsze, za to ogłusza.
        /// </summary>
        public static readonly WalkaWzor.Bron GRYZIE = new WalkaWzor.Bron { min = 9.5, max = 14, czas = 0.5, przerwa = 1.2 };
        public static readonly WalkaWzor.Bron OGIEN = new WalkaWzor.Bron { min = 9.5, max = 14, czas = 0.7, przerwa = 1.0 };
        public static readonly WalkaWzor.Bron WYJE = new WalkaWzor.Bron { min = 6, max = 9, czas = 0.8, przerwa = 1.2 };
        /// <summary>Zapowiedź (s) przed raną — także w starej walce (bez wzorów), gdzie ruch trwa jak w danych.</summary>
        public const double ZAPOWIEDZ_GRYZIE = 0.5, ZAPOWIEDZ_OGIEN = 0.7, ZAPOWIEDZ_WYJE = 0.8;
        /// <summary>Wycie: promień pierścienia (kafle) i ogłuszenie (tiki) każdego w nim.</summary>
        public const double WYCIE_PROMIEN = 4, WYCIE_OGLUSZA = 180;
        /// <summary>Ataki głów to znak rozpoznawczy każdej głowy — w losowaniu ruchów mają tyle razy większą wagę.</summary>
        public const double WAGA_ATAKU_GLOWY = 2;
        /// <summary>Z każdą ściętą głową przerwa między atakami krótsza o tyle (0,2 → 0,8 i 0,6 przerwy).</summary>
        public const double PRZYSPIESZA = 0.2;

        /// <summary>Karmienie: tyle porcji jedzenia za garść w paszczę; głowa śpi tyle tików (6 s).</summary>
        public const double KARMIENIE_PORCJI = 2, KARMIENIE_SEN = 720;
        /// <summary>Dłoń: tyle wiary; trzyma Cerbera tyle tików (5 s).</summary>
        public const double DLON_WIARY = 40, DLON_TRZYMA = 600;

        // ───────────────────────────── kiedy działa ─────────────────────────────

        public static bool Aktywne => ZmianyKregu.Aktywne;

        static Creature? cerber(Sim sim) => sim.creatures.FirstOrDefault(c => !c.dead && c.boss == "demon");

        /// <summary>Trwa walka (Cerber wyszedł i żyje, nie kona).</summary>
        public static bool Walka(Sim sim) => Aktywne && sim.lud.pomnik?.faza == "walka" && cerber(sim) != null;

        // ───────────────────────────── 1. ataki głów ─────────────────────────────

        /// <summary>Która głowa wykonuje ruch Cerbera (null — ciało: łapa, ogon, skok…).</summary>
        public static int? GlowaRuchu(string? id) => !Aktywne ? null : id switch
        {
            "zGory" or "podciecie" => PITBULL,
            "wybuchAureoli" => WILK,
            "tchnienie" => DOBERMAN,
            _ => null,
        };

        /// <summary>Broń ruchu Cerbera (wzory): broń głowy albo zwykła broń Cerbera.</summary>
        public static WalkaWzor.Bron BronRuchu(string? id) => GlowaRuchu(id) switch
        {
            PITBULL => GRYZIE,
            WILK => WYJE,
            DOBERMAN => OGIEN,
            _ => WalkaWzor.CERBER,
        };

        /// <summary>Zapowiedź ruchu głowy w sekundach (0 — bez zapowiedzi).</summary>
        public static double Zapowiedz(string? id) => GlowaRuchu(id) switch
        {
            PITBULL => ZAPOWIEDZ_GRYZIE,
            WILK => ZAPOWIEDZ_WYJE,
            DOBERMAN => ZAPOWIEDZ_OGIEN,
            _ => 0,
        };

        public static bool Scieta(Creature b, int nr) => b.glowyOdciete?.Any(o => (int)o.nr == nr) == true;
        public static bool Spi(Sim sim, Creature b, int nr) => b.glowySpiaDo != null && b.glowySpiaDo[nr] > sim.tick;

        /// <summary>Głowa może atakować: nie ścięta, nie śpi, nie zwisa z pustym paskiem.</summary>
        public static bool MozeAtakowac(Sim sim, Creature b, int nr)
        {
            if (Scieta(b, nr) || Spi(sim, b, nr)) return false;
            var g = global::Trzewia.Symulacja.Walka.glowyCerbera(b);
            return !(g.biezaca == nr && global::Trzewia.Symulacja.Walka.glowaCzeka(b));
        }

        /// <summary>Ile głów może teraz atakować (ruchy kilku paszcz potrzebują co najmniej dwóch).</summary>
        public static int IleGotowych(Sim sim, Creature b)
        {
            var n = 0;
            for (var i = 0; i < 3; i++) if (MozeAtakowac(sim, b, i)) n++;
            return n;
        }

        /// <summary>Przerwa po ataku (tiki): broni ostatniego ruchu, krótsza z każdą ściętą głową.</summary>
        public static double PrzerwaBossaT(Creature b, double przerwaT)
        {
            var sciete = b.glowyOdciete?.Count ?? 0;
            return Math.Round(przerwaT * Math.Max(0.2, 1 - PRZYSPIESZA * sciete));
        }

        /// <summary>Wycie trafiło: każdy w pierścieniu ogłuszony.</summary>
        public static void WycieOgluszna(Sim sim, Creature b)
        {
            foreach (var o in sim.creatures)
            {
                if (o.dead || o.straznik == true || Lud.rolaPostaci(o) == null) continue;
                if (JS.Hypot(o.x - b.x, o.y - (b.y - 1)) > WYCIE_PROMIEN) continue;
                o.ogluszonyDo = Math.Max(o.ogluszonyDo ?? 0, sim.tick + WYCIE_OGLUSZA);
            }
        }

        // ───────────────────────────── 4. wskazana głowa — życie każdej głowy ─────────────────────────────

        static double czesc(Creature b) => Math.Max(1, b.hpMax ?? NastawyPomnik.DEMON.hp) / SCIECIE_GLOW.najwiecej;

        static double[] hpGlow(Creature b)
        {
            if (b.glowyHp == null) { var c = czesc(b); b.glowyHp = new[] { c, c, c }; }
            return b.glowyHp;
        }

        /// <summary>Bieżąca (wskazana) głowa: wskazana, jeśli żyje — inaczej pierwsza nieścięta w kolejności ścinania.</summary>
        public static int? Biezaca(Creature b)
        {
            if (b.glowaCel is double w && !Scieta(b, (int)w)) return (int)w;
            foreach (var i in SCIECIE_GLOW.kolejnosc) if (!Scieta(b, (int)i)) return (int)i;
            return null;
        }

        /// <summary>Paski głów z życiem każdej głowy osobno (Walka.glowyCerbera w etapie 6).</summary>
        public static global::Trzewia.Symulacja.Walka.StanGlow Paski(Creature b)
        {
            var max = Math.Max(1, b.hpMax ?? NastawyPomnik.DEMON.hp);
            double odcietych = b.glowyOdciete?.Count ?? 0;
            var bie = Biezaca(b);
            var cz = czesc(b);
            if (bie == null) return new global::Trzewia.Symulacja.Walka.StanGlow { biezaca = null, odcietych = odcietych, dno = 0, gora = 0, pasek = 0, max = max };
            var hp = hpGlow(b);
            double dno = 0;
            for (var i = 0; i < 3; i++) if (i != bie && !Scieta(b, i)) dno += hp[i];
            var pasek = Math.Max(0, Math.Min(1, (b.hp - dno) / cz));
            return new global::Trzewia.Symulacja.Walka.StanGlow { biezaca = bie, odcietych = odcietych, dno = dno, gora = dno + cz, pasek = pasek, max = max };
        }

        /// <summary>Pasek głowy `nr` (0…1): ścięta — 0, wskazana — z życia Cerbera, inne — z ich własnego życia.</summary>
        public static double Pasek(Creature b, int nr)
        {
            if (Scieta(b, nr)) return 0;
            var p = Paski(b);
            if (p.biezaca == nr) return p.pasek;
            return Math.Max(0, Math.Min(1, hpGlow(b)[nr] / czesc(b)));
        }

        /// <summary>Głowa ścięta: jej życie znika (wołane z Walka.ucinaGlowe), wskazanie przechodzi na następną.</summary>
        public static void PoScieciu(Creature b, int nr)
        {
            hpGlow(b)[nr] = 0;
            if (b.glowaCel == nr) b.glowaCel = null;
        }

        /// <summary>
        /// Gracz wskazuje głowę do bicia. Życie dotychczasowej głowy zostaje w jej pasku (glowyHp), nowa bierze swoje —
        /// życie Cerbera (suma) się nie zmienia. Zwraca powód odmowy albo null.
        /// </summary>
        public static string? Wskaz(Sim sim, int nr)
        {
            var b = cerber(sim);
            if (!Aktywne || b == null || nr < 0 || nr > 2) return "nie ma Cerbera";
            if (Scieta(b, nr)) return $"głowa {DOPELNIACZ[nr]} już ścięta";
            var p = Paski(b);
            if (p.biezaca == nr) { b.glowaCel = nr; return null; }
            if (p.biezaca is double stara) hpGlow(b)[(int)stara] = Math.Max(0, Math.Min(czesc(b), b.hp - p.dno));
            b.glowaCel = nr;
            sim.log($"Rycerz bierze na cel głowę {DOPELNIACZ[nr]}.", "krew", "glowa-cel");
            return null;
        }

        // ───────────────────────────── 2. karmienie ─────────────────────────────

        /// <summary>Kto rzuci garść: najpierw ten, kto niesie jedzenie, potem najbliższy z ludu w zasięgu okupu.</summary>
        static Creature? ktoRzuci(Sim sim, Creature b, bool zWiadra)
        {
            Creature? kto = null; double best = double.PositiveInfinity;
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.race != Race.GOBLIN || c.straznik == true || (c.ogluszonyDo ?? 0) > sim.tick || c.wDloni == true || c.lot != null) continue;
                if (Lud.rolaPostaci(c) == null) continue;
                var d = JS.Hypot(c.x - b.x, c.y - b.y);
                if (d > KRAG.okup.zasieg) continue;
                var niesie = c.carry >= KARMIENIE_PORCJI;
                if (!niesie && !zWiadra) continue;
                var ocena = d - (niesie ? 100 : 0);
                if (ocena < best) { best = ocena; kto = c; }
            }
            return kto;
        }

        /// <summary>Czy da się teraz nakarmić (i czemu nie) — do przycisku.</summary>
        public static string? CzemuNieKarmic(Sim sim, int? nr = null)
        {
            if (!Walka(sim)) return "nie teraz";
            var b = cerber(sim)!;
            var g = nr ?? NajgrozniejszaGotowa(sim, b);
            if (g == null) return "żadna głowa nie gryzie";
            if (Scieta(b, g.Value)) return "ta głowa już ścięta";
            if (Spi(sim, b, g.Value)) return "ta głowa już śpi";
            var zWiadra = Wiadro.porcjiWWiadrach(sim) >= KARMIENIE_PORCJI;
            if (ktoRzuci(sim, b, zWiadra) == null) return zWiadra ? "nikt nie stoi dość blisko Cerbera" : $"trzeba {JS.S(KARMIENIE_PORCJI)} porcji jedzenia";
            return null;
        }

        /// <summary>Głowa, którą warto uśpić: najgroźniejsza z gotowych (wilk — ogłusza, doberman — ogień, pitbull).</summary>
        public static int? NajgrozniejszaGotowa(Sim sim, Creature b)
        {
            foreach (var i in new[] { WILK, DOBERMAN, PITBULL }) if (MozeAtakowac(sim, b, i)) return i;
            return null;
        }

        /// <summary>
        /// Garść jedzenia w paszczę głowy `nr` (null — najgroźniejszej, która nie śpi): głowa żre i zasypia na
        /// KARMIENIE_SEN tików. Kosztuje KARMIENIE_PORCJI porcji (z rąk kuriera albo z wiadra). Zwraca powód odmowy albo null.
        /// </summary>
        public static string? Nakarm(Sim sim, int? nr = null)
        {
            var czemu = CzemuNieKarmic(sim, nr);
            if (czemu != null) return czemu;
            var b = cerber(sim)!;
            var g = nr ?? NajgrozniejszaGotowa(sim, b)!.Value;
            var zWiadra = Wiadro.porcjiWWiadrach(sim) >= KARMIENIE_PORCJI;
            var kto = ktoRzuci(sim, b, zWiadra)!;
            if (kto.carry >= KARMIENIE_PORCJI) kto.carry -= KARMIENIE_PORCJI;
            else Wiadro.zabierzPorcje(sim, KARMIENIE_PORCJI);
            var k = Krag.stanKregu(sim);
            k.okupT = sim.tick; k.okupX = kto.x; k.okupY = kto.y - 1; k.okupKto = kto.id; k.okupow++;
            k.okupGlowa = g;
            b.glowySpiaDo ??= new double[3];
            b.glowySpiaDo[g] = sim.tick + KARMIENIE_SEN;
            // ruch tej głowy w toku przepada (zamyka paszczę na jedzeniu)
            if (b.ruch?.glowa == g) b.ruch = null;
            kto.face = b.x > kto.x ? 1 : -1;
            sim.efekt(kto.x, kto.y - 1.2, "mysl", $"garść w paszczę {DOPELNIACZ[g]}!");
            sim.gdzie(b.x, b.y).log($"Garść jedzenia w paszczę {DOPELNIACZ[g]} — głowa żre, a potem zasypia na chwilę. Pozostałe gryzą dalej.", "swiat", "karmienie");
            return null;
        }

        // ───────────────────────────── 3. dłoń jako cud ─────────────────────────────

        /// <summary>Czy da się teraz rzucić dłoń (i czemu nie) — do przycisku.</summary>
        public static string? CzemuNieDlon(Sim sim)
        {
            if (!Walka(sim)) return "nie teraz";
            if (sim.wiara < DLON_WIARY) return $"trzeba {JS.S(DLON_WIARY)} wiary";
            var st = DlonDemona.stanDloniDemona(sim);
            if (!string.IsNullOrEmpty(st.akcja)) return "dłoń już trzyma";
            if (sim.tick < st.nastT) return "dłoń jeszcze nie wróciła";
            return null;
        }

        /// <summary>Dłoń z otchłani wyrasta pod Cerberem i trzyma go DLON_TRZYMA tików. Zwraca powód odmowy albo null.</summary>
        public static string? Dlon(Sim sim)
        {
            var czemu = CzemuNieDlon(sim);
            if (czemu != null) return czemu;
            var b = cerber(sim)!;
            sim.wiara -= DLON_WIARY;
            DlonDemona.trzymajCerbera(sim, b);
            return null;
        }

        /// <summary>Dłoń trzyma Cerbera (od chwili, gdy palce się zamkną, do puszczenia).</summary>
        public static bool Trzymany(Sim sim)
        {
            if (!Aktywne) return false;
            var s = sim.lud.dlonDemona;
            if (s == null || s.akcja != "trzyma") return false;
            return s.faza == "trzyma" || (s.faza == "wstaje" && sim.tick - s.od > DLON.demon.tarcza.wstaje * 0.6);
        }
    }
}
