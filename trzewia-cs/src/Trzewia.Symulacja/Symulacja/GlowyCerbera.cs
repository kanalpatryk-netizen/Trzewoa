// Etap 6 — mechanika Cerbera (docs/plan-oprawy-cerber.md). Krąg Trzeci, za ZmianyKregu (wyłączone — Krąg jak w TS).
// Każda głowa ma swój atak: pitbull gryzie, wilk wyje (kto stoi blisko, jest ogłuszony), doberman zieje ogniem. Ścięta
// albo zwisająca (pusty pasek) głowa nie atakuje; z każdą ściętą pozostałe atakują częściej.
//
// Po obejrzeniu filmu (22.11, decyzje użytkownika) z etapu 6 zostały tylko ataki głów — bez zapowiedzi na płycie
// (łuk, linia, pierścień — usunięte). Wybór głowy do bicia, karmienie i dłoń z otchłani zniknęły z walki: głowy ścina
// się po kolei (pitbull, wilk, doberman), nikt nie rzuca Cerberowi jedzenia i dłoń mu nie pomaga.
// Liczby (bronie głów) — do akceptacji użytkownika: sekcja „liczby”.
using System;
using System.Linq;
using Trzewia.Js;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    public static class GlowyCerbera
    {
        // ───────────────────────────── liczby (do akceptacji) ─────────────────────────────

        /// <summary>Numery głów jak w SCIECIE_GLOW: 0 — doberman, 1 — wilk, 2 — pitbull.</summary>
        public const int DOBERMAN = 0, WILK = 1, PITBULL = 2;

        /// <summary>
        /// Bronie głów (wzory użytkownika): zamach przez „czas”, rana na jego końcu. Średnia rana na sekundę jak broni
        /// Cerbera (9,5–14 co 1,7 s) — gryzienie szybsze, ogień taki sam, wycie słabsze, za to ogłusza.
        /// </summary>
        public static readonly WalkaWzor.Bron GRYZIE = new WalkaWzor.Bron { min = 9.5, max = 14, czas = 0.5, przerwa = 1.2 };
        public static readonly WalkaWzor.Bron OGIEN = new WalkaWzor.Bron { min = 9.5, max = 14, czas = 0.7, przerwa = 1.0 };
        public static readonly WalkaWzor.Bron WYJE = new WalkaWzor.Bron { min = 6, max = 9, czas = 0.8, przerwa = 1.2 };
        /// <summary>Wycie: promień (kafle) i ogłuszenie (tiki) każdego w nim.</summary>
        public const double WYCIE_PROMIEN = 4, WYCIE_OGLUSZA = 180;
        /// <summary>Ataki głów to znak rozpoznawczy każdej głowy — w losowaniu ruchów mają tyle razy większą wagę.</summary>
        public const double WAGA_ATAKU_GLOWY = 2;
        /// <summary>Z każdą ściętą głową przerwa między atakami krótsza o tyle (0,2 → 0,8 i 0,6 przerwy).</summary>
        public const double PRZYSPIESZA = 0.2;

        // ───────────────────────────── kiedy działa ─────────────────────────────

        public static bool Aktywne => ZmianyKregu.Aktywne;

        // ───────────────────────────── ataki głów ─────────────────────────────

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

        public static bool Scieta(Creature b, int nr) => b.glowyOdciete?.Any(o => (int)o.nr == nr) == true;

        /// <summary>Głowa może atakować: nie ścięta i nie zwisa z pustym paskiem.</summary>
        public static bool MozeAtakowac(Creature b, int nr)
        {
            if (Scieta(b, nr)) return false;
            var g = Walka.glowyCerbera(b);
            return !(g.biezaca == nr && Walka.glowaCzeka(b));
        }

        /// <summary>Ile głów może teraz atakować (ruchy kilku paszcz potrzebują co najmniej dwóch).</summary>
        public static int IleGotowych(Creature b)
        {
            var n = 0;
            for (var i = 0; i < 3; i++) if (MozeAtakowac(b, i)) n++;
            return n;
        }

        /// <summary>Przerwa po ataku (tiki): broni ostatniego ruchu, krótsza z każdą ściętą głową.</summary>
        public static double PrzerwaBossaT(Creature b, double przerwaT)
        {
            var sciete = b.glowyOdciete?.Count ?? 0;
            return Math.Round(przerwaT * Math.Max(0.2, 1 - PRZYSPIESZA * sciete));
        }

        /// <summary>Wycie trafiło: każdy z ludu blisko Cerbera ogłuszony.</summary>
        public static void WycieOgluszna(Sim sim, Creature b)
        {
            foreach (var o in sim.creatures)
            {
                if (o.dead || o.straznik == true || Lud.rolaPostaci(o) == null) continue;
                if (JS.Hypot(o.x - b.x, o.y - (b.y - 1)) > WYCIE_PROMIEN) continue;
                o.ogluszonyDo = Math.Max(o.ogluszonyDo ?? 0, sim.tick + WYCIE_OGLUSZA);
            }
        }
    }
}
