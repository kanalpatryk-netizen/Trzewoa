// Zmiany Kręgu Trzeciego po porcie z TS — prośby użytkownika z 20.11 (docs/plan-oprawy-cerber.md, etap 6b):
//   - bez Cieni Żarłoków: jedynym przeciwnikiem jest Cerber (fale Strażników z kamienia nie wychodzą),
//   - naprawy błędów Kręgu (krata lochu w walce z Cerberem…),
//   - (dalsze zmiany etapu 6 — dopisywane tutaj).
// Walka według wzorów ma osobny przełącznik (WalkaWzor.Wlaczony, w grze: --walka stara|wzory), ale i ona gaśnie razem
// z głównym wyłącznikiem.
//
// Główny wyłącznik Wlaczone (domyślnie tak): wyłączony — Krąg liczy się bit w bit jak w TS (krag-3-beta); tak liczą
// testy zgodności z TS. Działa tylko w Kręgu Trzecim; Alpha 1 bez zmian.
namespace Trzewia.Symulacja
{
    public static class ZmianyKregu
    {
        /// <summary>Zmiany Kręgu po porcie włączone. Wyłączone — Krąg jak w TS.</summary>
        public static bool Wlaczone = true;

        /// <summary>Tryb kręgu i zmiany włączone.</summary>
        public static bool Aktywne => Wlaczone && Krag.Wlaczony;

        /// <summary>Bez Cieni Żarłoków: fale bez bossa przepadają, fala z bossem — sam Cerber.</summary>
        public static bool BezCieni => Aktywne;

        /// <summary>Trwa walka z Cerberem: pieczęć się rozpada, Cerber wychodzi albo walczy (nie: kona).</summary>
        public static bool WalkaZCerberem(Sim sim) { var f = sim.lud.pomnik?.faza; return f == "rozpada" || f == "wychodzi" || f == "walka"; }

        /// <summary>
        /// Naprawa błędu „rycerz nie dojdzie do Cerbera” (20.11): w walce z Cerberem krata lochu jest wyrwana — brama stoi
        /// otworem (Brama.tikBramy).
        /// </summary>
        public static bool KrataWyrwana(Sim sim) => Aktywne && WalkaZCerberem(sim);

        /// <summary>
        /// Naprawa błędu „rycerz nie ścina pustej głowy” (22.11): pasek głowy zbity do dna — głowa zwisa i czeka na miecz,
        /// a Cerber się nie zrasta. Dawniej w pół sekundy odrastał z 1 do 5 punktów, rycerz przestawał celować w ścięcie
        /// (Walka.glowaCzeka) i bił zwykłymi ciosami, aż głodny odchodził jeść, a Cerber zrastał się do pełnego paska.
        /// </summary>
        public static bool GlowaCzekaNaMiecz(Creature b) => Aktywne && Walka.glowaCzeka(b);

        /// <summary>
        /// Naprawa błędu „rycerz kręci się pod Cerberem” (22.11): w symulacji Cerber wisiał 3 kafle nad rycerzem (na rysunku
        /// stoi na posadzce tuż przy nim) i smagał go łańcuchem raz za razem, a rycerz nie sięgał go mieczem. Po ataku
        /// z dystansu Cerber najpierw podchodzi do celu; następny atak z daleka — dopiero gdy bliżej podejść nie może.
        /// </summary>
        public static bool NajpierwPodejdz(Sim sim, Creature b, Creature cel, double d)
        {
            if (!Aktywne || b.ruchPoprz == null || d <= Nastawy.NastawyPomnik.DEMON.zasieg) return false;
            if (Nastawy.NastawyWalka.RUCHY_BOSSA[b.ruchPoprz]?.rodzaj != "dystans") return false;
            return Straznicy.zblizySie(sim, b, cel.x, cel.y - 0.5, Nastawy.NastawyPomnik.DEMON.szybkosc, Nastawy.NastawyStraznicy.STRAZNICY.limitOdRdzenia);
        }

        /// <summary>
        /// Krok zmian kręgu (z Krag.tikKregu). Naprawa błędu „gra bez końca” (20.11): Cerber zasypuje kawałek drogi wiernych,
        /// a odkopać go mogą tylko grabarze — gdy zginęli, mnisi nie mieli jak zejść do Cerbera. Teraz, gdy grabarzy już nie
        /// ma, zasypany gruz osypuje się sam (a Cerber nie zasypuje drogi dalej — Boss.zasypDroge).
        /// </summary>
        public static void tik(Sim sim, StanKregu k)
        {
            if (!Aktywne || sim.tick % 60 != 0 || k.zasypane == null || k.zasypane.Count == 0) return;
            var w = sim.world;
            k.zasypane.RemoveAll(i => w.tile[i] != T.ROCK);
            if (k.zasypane.Count == 0) return;
            foreach (var c in sim.creatures) if (!c.dead && Lud.rolaPostaci(c) == "robotnik") return;
            foreach (var i in k.zasypane)
            {
                w.tile[i] = T.AIR;
                sim.spark(i % w.w + 0.5, System.Math.Floor(i / w.w) + 0.5, "dust");
            }
            var i0 = k.zasypane[0];
            k.zasypane.Clear();
            sim.gdzie(i0 % w.w, System.Math.Floor(i0 / w.w)).log("Nie ma już grabarzy — gruz, którym Cerber zasypał drogę wiernych, osypuje się sam. Droga znów wolna.", "swiat", "zasyp-osypuje");
        }

        /// <summary>
        /// Naprawa błędu „gra bez końca” (20.11): gdy walczących brak, mnisi razą Cerbera księgą — a on zrastał się szybciej
        /// (3,6 życia na sekundę), niż dwóch mnichów go raniło, więc walka nie kończyła się nigdy. Księga to też modlitwa:
        /// póki choć jeden mnich trafił go nią w ostatnich 2,5 s, Cerber się nie zrasta.
        /// </summary>
        public static bool KsiegaWstrzymujeZrastanie(Sim sim)
        {
            if (!Aktywne || !Straznicy.trybWiernych(sim)) return false;
            foreach (var c in sim.creatures)
                if (!c.dead && c.ksiegaT is double t && sim.tick - t < 300 && Lud.rolaPostaci(c) == "pobozny") return true;
            return false;
        }
    }
}
