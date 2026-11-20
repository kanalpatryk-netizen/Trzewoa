// Walka w Kręgu Trzecim według wzorów użytkownika (docs/walka/wzory.md). Liczby: wariant nr 3 z
// docs/walka/konsultacja.md (tools/walka/balans.py), zatwierdzony przez użytkownika 20.11.
//   L = min + (max − min)·(a − 1), a ∈ [1, 2]  — losowane na początku ataku
//   O = L · 100 / (100 + p)                    — w chwili trafienia, na końcu „czasu” ataku; potem hp −= O
// Każdy atak: zamach przez „czas” → jedno trafienie → „przerwa” → następny atak. Ruchy rycerza i Cerbera grają się
// równo szybciej albo wolniej (tempo), tak żeby trafienie w ich animacji wypadło dokładnie po „czasie”; powrót do gardy
// mieści się w przerwie. Blok = chwilowy pancerz, parowanie i unik = pudło (decyzja użytkownika 20.11).
//
// Za flagą Wlaczony (domyślnie tak — decyzja użytkownika); wyłączona — walka jak dotąd, bit w bit jak w TS (tak liczą
// testy zgodności z TS). Działa tylko w Kręgu Trzecim; Alpha 1 bez zmian.
using System;
using static Trzewia.Symulacja.Lud;
using static Trzewia.Symulacja.Zbroja;

namespace Trzewia.Symulacja
{
    public static class WalkaWzor
    {
        /// <summary>Nowa walka włączona (w Kręgu Trzecim). Wyłączona — walka jak w TS.</summary>
        public static bool Wlaczony = true;

        public static bool Aktywny => Wlaczony && Krag.Wlaczony;

        /// <summary>Tików symulacji na sekundę.</summary>
        public const double TIK = 120;

        /// <summary>Broń: pułapy ataku i rytm (sekundy). Tiki — przeliczone, całe.</summary>
        public sealed class Bron
        {
            public double min, max, czas, przerwa;
            public double CzasT => Math.Round(czas * TIK);
            public double PrzerwaT => Math.Round(przerwa * TIK);
        }

        // ── wariant nr 3 (docs/walka/konsultacja.md) ──
        public static readonly Bron RYCERZ = new Bron { min = 45, max = 67, czas = 0.5, przerwa = 0.6 };
        public static readonly Bron CERBER = new Bron { min = 9.5, max = 14, czas = 0.7, przerwa = 1.0 };
        public static readonly Bron CIEN = new Bron { min = 2, max = 3.5, czas = 0.3, przerwa = 0.7 };
        /// <summary>Grabarz i każdy z ludu, który nie jest rycerzem, w zwarciu.</summary>
        public static readonly Bron LUD = new Bron { min = 2.5, max = 3.5, czas = 0.25, przerwa = 0.25 };
        /// <summary>Mnich z księgą (z dystansu).</summary>
        public static readonly Bron KSIEGA = new Bron { min = 2, max = 3, czas = 0.5, przerwa = 0.75 };

        /// <summary>Pancerz Cienia Żarłoka.</summary>
        public const double P_CIEN = 20;
        /// <summary>Tarcza: dziś rany × 0,8 — w tym wzorze to dokładnie p = 25.</summary>
        public const double P_TARCZA = 25;

        // Liczby wyżej są dobrane do dzisiejszych postaci w Kręgu; to, co je dziś wzmacnia albo osłabia (zbroja, rola,
        // błogosławieństwa, fala Cieni, ścięte głowy Cerbera), dalej mnoży min i max — względem tych punktów odniesienia:
        /// <summary>Mnożnik siły świeżego rycerza (rola) — punkt odniesienia RYCERZ.</summary>
        public const double SILA_RYCERZA = 11;
        /// <summary>Mnożnik siły grabarza (robotnika) — punkt odniesienia LUD.</summary>
        public const double SILA_LUDU = 1.2;
        /// <summary>Średni wzrost Cieni przez fale (1 → 1,6) — punkt odniesienia CIEN.</summary>
        public const double WZROST_CIENIA = 1.3;

        // ── wzory ──

        /// <summary>a — losowa liczba z przedziału [1, 2).</summary>
        public static double LosujA(Sim sim) => 1 + sim.rng.next();

        /// <summary>L = min + (max − min)·(a − 1).</summary>
        public static double L(double min, double max, double a) => min + (max - min) * (a - 1);

        /// <summary>O = L · 100 / (100 + p).</summary>
        public static double O(double l, double p) => l * 100 / (100 + p);

        /// <summary>L tej broni (z mnożnikiem postaci), a losowane teraz.</summary>
        public static double Atak(Sim sim, Bron b, double skala) => L(b.min * skala, b.max * skala, LosujA(sim));

        /// <summary>Pancerz celu: Cień 20, z tarczą 25, reszta (w tym Cerber) 0.</summary>
        public static double Pancerz(Creature c)
        {
            if (c.straznik == true && c.boss == null) return P_CIEN;
            return nosi(c, "tarcza") ? P_TARCZA : 0;
        }

        /// <summary>
        /// Blok jako chwilowy pancerz: dziś blok zostawia z rany ułamek `rany` (np. 0,45) — tyle samo daje pancerz
        /// p' = (100 + p) / rany − 100 na czas jednego ciosu (z p = 0 i rany 0,45: p' ≈ 122).
        /// </summary>
        public static double PancerzBloku(double p, double rany) => (100 + p) / rany - 100;

        /// <summary>Rana O przy pancerzu p, przeliczona na chwilowy pancerz bloku (ten sam cios, nowe p).</summary>
        public static double ZBlokiem(double o, double p, double rany) => o * (100 + p) / (100 + PancerzBloku(p, rany));

        // ── rytm ruchów rycerza i Cerbera ──

        /// <summary>
        /// Ruch grany w rytmie wzoru: tempo k = czas / (tik trafienia w danych ruchu) — cała animacja równo szybciej
        /// albo wolniej, więc trafienie wypada dokładnie po „czasie”. Długość: cały ruch w tym tempie, najwyżej czas +
        /// przerwa (jeśli powrót do gardy dłuższy niż przerwa — ucięty). Trafienie raz, w tiku trafT.
        /// </summary>
        public static void UstawRytm(RuchTrwa r, Bron b, double dlRuchu, double tikTrafienia)
        {
            var h = Math.Max(1, tikTrafienia);
            var k = b.CzasT / h;
            r.tempo = k;
            r.dl0 = dlRuchu;
            r.trafT = b.CzasT;
            r.dl = Math.Min(Math.Round(dlRuchu * k), b.CzasT + b.PrzerwaT);
            if (r.dl < b.CzasT) r.dl = b.CzasT;
        }

        /// <summary>
        /// Postęp animacji ruchu (0…1) w chwili t od jego początku: w rytmie wzoru — czas „oryginału” (t / tempo) przez
        /// oryginalną długość, więc poza uderzenia wypada dokładnie w trafieniu, nawet gdy koniec ruchu jest ucięty.
        /// </summary>
        public static double PostepRuchu(RuchTrwa r, double t)
        {
            if (r.tempo is double k && k > 0 && r.dl0 is double dl0 && dl0 > 0) return Math.Max(0, Math.Min(1, t / k / dl0));
            return Math.Max(0, Math.Min(1, t / Math.Max(1, r.dl)));
        }

        /// <summary>Tik z danych ruchu (np. trafienie, początek ognia) przeliczony na czas tego ruchu.</summary>
        public static double TikRuchu(RuchTrwa r, double tikDanych) => tikDanych * (r.tempo ?? 1);

        // ── zamach (Cień, lud, księga, zwykła bójka): czas → trafienie → przerwa ──

        /// <summary>
        /// Krok zamachu: zwraca true w tiku trafienia (zamach doszedł do końca „czasu”). Zaczyna zamach, gdy cel w
        /// zasięgu i minęła przerwa od poprzedniego ciosu (c.ciosT). Zamach przerwany (cel uciekł, zmiana zajęcia) —
        /// przepada; po nim liczy się od nowa.
        /// </summary>
        public static bool Zamach(Sim sim, Creature c, Bron b, bool wZasiegu, ref double? ostatni)
        {
            if (c.atakOd is double od)
            {
                var t = sim.tick - od;
                if (t > b.CzasT + 30) { c.atakOd = null; return false; }      // zamach z dawna — przepadł
                if (t < b.CzasT) return false;
                c.atakOd = null;
                ostatni = sim.tick;
                return wZasiegu;
            }
            if (wZasiegu && sim.tick - (ostatni ?? -1e9) >= b.PrzerwaT) c.atakOd = sim.tick;
            return false;
        }
    }
}
