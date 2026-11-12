// Wygenerowane z alpha-1/src/nastawy/wyglad/rycina.ts przez narzedzia/nastawy/nastawy-cs.mjs — nie zmieniać ręcznie.
// Liczby zmienia się w TS (i generuje od nowa) albo bez kompilacji: dane/nastawy/wyglad-rycina.json.
using System.Collections.Generic;

namespace Trzewia.Nastawy
{
    /// <summary>Nastawy z alpha-1/src/nastawy/wyglad/rycina.ts — pola jak eksporty w TS.</summary>
    public static partial class NastawyWygladRycina
    {
        /// <summary>
        /// RYCINA — jak wygląda góra na płycie w grze.
        ///
        /// Każdy materiał jest kreskowany jak na miedziorycie:
        /// - ton: ile atramentu w kaflu (0 = pusty papier, ok. 0,6 = prawie czarny),
        /// - kąt: kierunek w poprzek kreski w radianach (1,57 = kreska pozioma, 0 = pionowa, ±1,8 najwyżej),
        /// - odstęp: co ile pikseli kolejna kreska (więcej = rzadziej),
        /// - krzyż: jak mocno dochodzi kreska krzyżowa (0..1),
        /// - kropki: ile punktowania (0..1),
        /// - barwa: [r, g, b] światła kreski albo null (sama głębia).
        /// </summary>
        public static double TON_MAX = 0.62;

        public static Dictionary<int, Kreskowanie> MATERIALY = new Dictionary<int, Kreskowanie> { [1] = new Kreskowanie
        {
            tone = 0.07,
            ang = 1.57,
            sp = 9,
            cross = 0.95,
            stipple = 0,
            tint = new double[] { 176, 178, 172 },
        }, [2] = new Kreskowanie
        {
            tone = 0.22,
            ang = 0.8,
            sp = 5.6,
            cross = 0.4,
            stipple = 0.5,
            tint = new double[] { 222, 178, 118 },
        }, [3] = new Kreskowanie
        {
            tone = 0.22,
            ang = -0.74,
            sp = 5,
            cross = 0.17,
            stipple = 0.08,
            tint = new double[] { 210, 178, 136 },
        }, [4] = new Kreskowanie
        {
            tone = 0.27,
            ang = -0.74,
            sp = 5,
            cross = 0.2,
            stipple = 0.3,
            tint = new double[] { 196, 154, 118 },
        }, [5] = new Kreskowanie
        {
            tone = 0.44,
            ang = -0.55,
            sp = 7.4,
            cross = 0.66,
            stipple = 0.3,
            tint = new double[] { 232, 228, 236 },
        }, [6] = new Kreskowanie
        {
            tone = 0.26,
            ang = -0.72,
            sp = 3.4,
            cross = 0.06,
            stipple = 0,
            tint = new double[] { 150, 136, 120 },
        }, [7] = new Kreskowanie
        {
            tone = 0.64,
            ang = 0.2,
            sp = 4.8,
            cross = 0.5,
            stipple = 0.55,
            tint = new double[] { 150, 214, 118 },
        }, [8] = new Kreskowanie
        {
            tone = 0.5,
            ang = 0.9,
            sp = 5.4,
            cross = 0.6,
            stipple = 0.35,
            tint = new double[] { 226, 218, 196 },
        }, [9] = new Kreskowanie
        {
            tone = 0.66,
            ang = 1.57,
            sp = 3.6,
            cross = 0.44,
            stipple = 0.2,
            tint = new double[] { 230, 198, 140 },
        }, [10] = new Kreskowanie
        {
            tone = 0.7,
            ang = 1.57,
            sp = 3.6,
            cross = 0.4,
            stipple = 0.3,
            tint = new double[] { 255, 158, 70 },
        }, [11] = new Kreskowanie
        {
            tone = 0.18,
            ang = 0.79,
            sp = 3.4,
            cross = 0.3,
            stipple = 0.12,
            tint = new double[] { 222, 220, 228 },
        }, [12] = new Kreskowanie
        {
            tone = 0.6,
            ang = 0.35,
            sp = 4.2,
            cross = 0.5,
            stipple = 0.45,
            tint = new double[] { 204, 170, 120 },
        }, [13] = new Kreskowanie
        {
            tone = 0.6,
            ang = 1.1,
            sp = 3,
            cross = 0.34,
            stipple = 0.5,
            tint = new double[] { 226, 74, 74 },
        }, [14] = new Kreskowanie
        {
            tone = 0.56,
            ang = 0,
            sp = 3.4,
            cross = 0.36,
            stipple = 0.55,
            tint = new double[] { 246, 214, 130 },
        }, [15] = new Kreskowanie
        {
            tone = 0.17,
            ang = 0.8,
            sp = 6.2,
            cross = 0.3,
            stipple = 0.6,
            tint = new double[] { 232, 186, 116 },
        }, [16] = new Kreskowanie
        {
            tone = 0.27,
            ang = 1.12,
            sp = 4.4,
            cross = 0.12,
            stipple = 0.04,
            tint = new double[] { 176, 158, 138 },
        }, [17] = new Kreskowanie
        {
            tone = 0.25,
            ang = -0.74,
            sp = 5,
            cross = 0.2,
            stipple = 0.1,
            tint = new double[] { 204, 176, 130 },
        } };

        /// <summary>Kolor masy materiału pod kreską [r, g, b] — skała ciemna, żyła świeci barwą.</summary>
        public static Dictionary<int, double[]> MASA = new Dictionary<int, double[]> { [2] = new double[] { 56, 40, 26 }, [3] = new double[] { 51, 41, 31 }, [4] = new double[] { 45, 34, 26 }, [5] = new double[] { 30, 20, 44 }, [6] = new double[] { 37, 33, 30 }, [9] = new double[] { 52, 38, 22 }, [10] = new double[] { 84, 34, 12 }, [13] = new double[] { 96, 14, 20 }, [15] = new double[] { 62, 46, 29 }, [16] = new double[] { 43, 38, 34 }, [17] = new double[] { 47, 38, 28 } };

        /// <summary>
        /// ŚWIAT RYCINY — wartości całego rysunku: pustka jaśniejsza od skały, skała rytowana masa,
        /// nieznane prawie czarne ze szkicem sinopii. Barwy [r, g, b] 0..255, przed suwakiem jasności.
        /// Warstwy idą od góry: płytka (miękka), środkowa, głęboka (twarda), a 3 = kamień ramy i czapy.
        /// </summary>
        public static Typ_RYCINA_SWIATA RYCINA_SWIATA = new Typ_RYCINA_SWIATA
        {
            pustkaCien = new double[][] { new double[] { 94, 75, 54 }, new double[] { 86, 74, 61 }, new double[] { 82, 72, 62 } },
            pustkaOtwarta = new double[][]
            {
                new double[] { 132, 107, 77 },
                new double[] { 120, 102, 84 },
                new double[] { 114, 100, 86 },
            },
            ciosy = new Typ_RYCINA_SWIATA_ciosy
            {
                szer = 2.2,
                wys = 0.85,
                rozrzut = 0.1,
                fuga = 0.2,
                faza = 0.05,
            },
            posadzka = new double[] { 118, 98, 76 },
            niebo = new double[] { 46, 44, 46 },
            zorza = 26,
            grzbiet = 2.4,
            nieboKreska = new double[] { 120, 112, 104 },
            tynk = 12,
            swiatloPustki = new double[] { 82, 54, 24 },
            swiatloSkaly = new double[] { 60, 38, 18 },
            nieznaneMasa = new double[][]
            {
                new double[] { 41, 31, 22 },
                new double[] { 36, 30, 26 },
                new double[] { 35, 31, 28 },
                new double[] { 33, 30, 27 },
            },
            szkic = new double[] { 138, 96, 68 },
            szkicSila = 0.38,
            szkicSpoinyCo = 2.6,
            szkicSpoinySila = 0.22,
            granicaCiemna = new double[] { 10, 7, 6 },
            granicaJasna = new double[] { 214, 178, 128 },
            granicaSila = 0.85,
            uwarstwienie = new Dictionary<int, double[]> { [2] = new double[] { 1.1, 0.2 }, [3] = new double[] { 3.1, 0.24 }, [15] = new double[] { 2.4, 0.3 }, [16] = new double[] { 2, 0.2 } },
            katWarstw = new double[] { 0.8, -0.74, 1.12 },
            platy = new Typ_RYCINA_SWIATA_platy
            {
                oczko = 4.5,
                katy = new double[] { -0.62, -0.22, 0.22, 0.62 },
                jasnosc = 0.08,
                rysyUdzial = 0.55,
            },
            rysy = new Typ_RYCINA_SWIATA_rysy
            {
                sila = 0.6,
                odZoom = 7,
                szer = 0.04,
            },
            kontur = new double[] { 26, 18, 12 },
            swietlik = new double[] { 238, 194, 130 },
            swietlikGrubosc = 0.16,
            swietlikBaza = 0.32,
            czerwienOd = 0.9,
            czerwienKreski = new double[] { 176, 96, 66 },
            czerwienZasieg = 2.2,
        };

        /// <summary>
        /// ŚWIATŁO NA RYCINIE — tam, gdzie mrok wycina światło, rysunek też się rozgrzewa.
        /// Promień w kaflach, moc 0..1 (1 = pełne ciepło na tylnej ścianie).
        /// </summary>
        public static Typ_SWIATLO_RYCINY SWIATLO_RYCINY = new Typ_SWIATLO_RYCINY
        {
            robotnik = new Typ_SWIATLO_RYCINY_robotnik
            {
                r = 8,
                moc = 0.5,
            },
            pobozny = new Typ_SWIATLO_RYCINY_pobozny
            {
                r = 6,
                moc = 0.38,
            },
            rycerz = new Typ_SWIATLO_RYCINY_rycerz
            {
                r = 5.5,
                moc = 0.32,
            },
            siedziba = new Typ_SWIATLO_RYCINY_siedziba
            {
                r = 9,
                moc = 0.5,
            },
            oboz = new Typ_SWIATLO_RYCINY_oboz
            {
                r = 6,
                moc = 0.42,
            },
            sala = new Typ_SWIATLO_RYCINY_sala
            {
                moc = 0.3,
                brzeg = 3,
            },
            oltarz = new Typ_SWIATLO_RYCINY_oltarz
            {
                r = 16,
                moc = 0.85,
            },
            pomieszczenia = new Dictionary<string, double>
            {
                ["kuznia"] = 0.8,
                ["warsztat"] = 0.5,
                ["sypialnia"] = 0.3,
            },
            pomieszczenieZasieg = 5,
            pomieszczenieWSkale = 1.6,
        };
    }

    public sealed partial class Kreskowanie
    {
        public double tone;
        public double ang;
        public double sp;
        public double cross;
        public double stipple;
        public double[] tint;
    }

    /// <summary>
    /// ŚWIAT RYCINY — wartości całego rysunku: pustka jaśniejsza od skały, skała rytowana masa,
    /// nieznane prawie czarne ze szkicem sinopii. Barwy [r, g, b] 0..255, przed suwakiem jasności.
    /// Warstwy idą od góry: płytka (miękka), środkowa, głęboka (twarda), a 3 = kamień ramy i czapy.
    /// </summary>
    public sealed partial class Typ_RYCINA_SWIATA
    {
        /// <summary>
        /// Tylna ściana jaskini: przy skale (w cieniu) i na otwartej przestrzeni — płytko, w środku i w głębi.
        /// To ona mówi „tu jest przestrzeń”: ciepły, gładki tynk skały, jaśniejszy niż rytowana masa obok.
        /// </summary>
        public double[][] pustkaCien;
        public double[][] pustkaOtwarta;
        /// <summary>
        /// Tylna ściana jasnej sali: ciosy na zakładkę — szerokość (kafle), wysokość rzędu (rzędy na kafel), rozrzut jasności
        /// między ciosami, przyciemnienie fugi i rozjaśnienie górnej krawędzi ciosu.
        /// </summary>
        public Typ_RYCINA_SWIATA_ciosy ciosy;
        /// <summary>Posadzka jasnej sali: ciosane płyty ciepłego kamienia (barwa lica przed światłem).</summary>
        public double[] posadzka;
        /// <summary>Nad górą: zmierzch; przy horyzoncie jaśniejszy o `zorza`. Grzbiet: najwyższy garb ziemi nad płaską powierzchnią (kafle).</summary>
        public double[] niebo;
        public double zorza;
        public double grzbiet;
        public double[] nieboKreska;
        /// <summary>Plamy tynku na tylnej ścianie (± tyle jasności) i pył w powietrzu.</summary>
        public double tynk;
        /// <summary>Światło (lampki, sala, ogień) na tylnej ścianie i na skale: barwa dodawana przy pełnym świetle.</summary>
        public double[] swiatloPustki;
        public double[] swiatloSkaly;
        /// <summary>Nieznane: ciemna masa każdej warstwy (płytka, środkowa, głęboka, kamień) — nie czerń, tylko półmrok papieru.</summary>
        public double[][] nieznaneMasa;
        /// <summary>
        /// Szkic sinopii w nieznanym: granice warstw i brzeg ramy, do tego rzadkie spoiny skały.
        /// stonowana, cicha linia (dawniej jaskrawa i przerywana — czytała się jak linia z rysunku technicznego)
        /// </summary>
        public double[] szkic;
        public double szkicSila;
        /// <summary>Spoiny szkicu co tyle kafli i ich siła (0..1).</summary>
        public double szkicSpoinyCo;
        public double szkicSpoinySila;
        /// <summary>Granica warstw w poznanej skale: ciemna linia rylca i jasna tuż pod nią (siła 0..1).</summary>
        public double[] granicaCiemna;
        public double[] granicaJasna;
        public double granicaSila;
        /// <summary>
        /// Uwarstwienie skały: pozioma spoina co tyle kafli [odstęp, siła 0..1] — rzadka i słaba, tylko znak, że skała
        /// leży warstwami (gęste spoiny razem z poziomą kreską czytały się jak słoje drewna).
        /// </summary>
        public Dictionary<int, double[]> uwarstwienie;
        /// <summary>Kąt rylca w każdej warstwie (płytka, środkowa, głęboka), w poprzek kreski: 0,8 — kreska „/”, −0,74 — „\”.</summary>
        public double[] katWarstw;
        /// <summary>
        /// Płaty skały: kamień pęka na wieloboczne płaszczyzny (komórki Woronoja) — każda ma własny kierunek kreski
        /// i trochę inną jasność. Oczko — średnia wielkość płatu (kafle), kąty — odchylenia kreski od kąta warstwy,
        /// jasność — ± tyle jasności masy, rysyUdzial — jaka część krawędzi płatów pęka rysą.
        /// </summary>
        public Typ_RYCINA_SWIATA_platy platy;
        /// <summary>Rysy na styku płatów: przyciemnienie szczeliny (0..1), od jakiego przybliżenia i pół grubości (px × zoom).</summary>
        public Typ_RYCINA_SWIATA_rysy rysy;
        /// <summary>
        /// Kontur jaskini: atrament rylca; świetlik — jasny brzeg podłogi pod konturem (grubość w kaflach).
        /// ciepła, ciemna sepia zamiast prawie czerni — jaskinie z czarnym konturem wyglądały jak naklejki
        /// </summary>
        public double[] kontur;
        public double[] swietlik;
        public double swietlikGrubosc;
        /// <summary>Świetlik bez światła (podłoga w ciemności) i przy pełnym świetle lampki.</summary>
        public double swietlikBaza;
        /// <summary>Głęboka warstwa przy krypcie żarzy się czerwienią: od tej głębokości (0..1) do dna.</summary>
        public double czerwienOd;
        public double[] czerwienKreski;
        /// <summary>…i tylko przy pomniku: w bok od krypty gaśnie do zera na tylu szerokościach skorupy.</summary>
        public double czerwienZasieg;
    }

    public sealed partial class Typ_RYCINA_SWIATA_ciosy
    {
        public double szer;
        public double wys;
        public double rozrzut;
        public double fuga;
        public double faza;
    }

    public sealed partial class Typ_RYCINA_SWIATA_platy
    {
        public double oczko;
        public double[] katy;
        public double jasnosc;
        public double rysyUdzial;
    }

    public sealed partial class Typ_RYCINA_SWIATA_rysy
    {
        public double sila;
        public double odZoom;
        public double szer;
    }

    /// <summary>
    /// ŚWIATŁO NA RYCINIE — tam, gdzie mrok wycina światło, rysunek też się rozgrzewa.
    /// Promień w kaflach, moc 0..1 (1 = pełne ciepło na tylnej ścianie).
    /// </summary>
    public sealed partial class Typ_SWIATLO_RYCINY
    {
        public Typ_SWIATLO_RYCINY_robotnik robotnik;
        public Typ_SWIATLO_RYCINY_pobozny pobozny;
        public Typ_SWIATLO_RYCINY_rycerz rycerz;
        public Typ_SWIATLO_RYCINY_siedziba siedziba;
        public Typ_SWIATLO_RYCINY_oboz oboz;
        /// <summary>Jasna sala: dzień z szybu i świece — cała w świetle, z miękkim brzegiem tylu kafli.</summary>
        public Typ_SWIATLO_RYCINY_sala sala;
        /// <summary>Świece na ołtarzu i dzień z szybu: jaśniejsza plama w środku sali.</summary>
        public Typ_SWIATLO_RYCINY_oltarz oltarz;
        /// <summary>Gotowe pomieszczenia: kuźnia żarzy się mocno, warsztat jak przy świecy, sypialnia ledwo.</summary>
        public Dictionary<string, double> pomieszczenia;
        /// <summary>O tyle kafli światło pomieszczenia (okrągła plama ze środka) wychodzi poza jego obrys…</summary>
        public double pomieszczenieZasieg;
        /// <summary>…ale w litą skałę wchodzi najwyżej na tyle kafli (gaśnie po drodze) — strop nad pokojem zostaje ciemny.</summary>
        public double pomieszczenieWSkale;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_robotnik
    {
        public double r;
        public double moc;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_pobozny
    {
        public double r;
        public double moc;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_rycerz
    {
        public double r;
        public double moc;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_siedziba
    {
        public double r;
        public double moc;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_oboz
    {
        public double r;
        public double moc;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_sala
    {
        public double moc;
        public double brzeg;
    }

    public sealed partial class Typ_SWIATLO_RYCINY_oltarz
    {
        public double r;
        public double moc;
    }
}
