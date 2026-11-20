// Port: krag-3-beta/src/render/cerber.ts (typy pozy), cerber-rig.ts (szkielet), cerber-sprite.ts (składanie z obrazków)
// i cerber-boss.ts (poza z ruchu walki) — CERBER, boss Kręgu Trzeciego (tryb obok Alphy 1, Krag.Wlaczony).
//
// Model 3D Cerbera wypieczono raz do obrazków (dane/grafika/krag/cerber/*.webp, położenia w dane.json — w TS
// render/cerber-wypiek.ts), a gra składa go z części jak lalkę wycinankę według szkieletu (rigCerbera): ogon, trzy szyje
// (rozciągane między nasadą na piersi a głową), tułów z łapami (klatka chodu, dęba, przysiadu, skoku…), trzy głowy
// w 4 kątach × 5 rozwarciach paszczy × 2 stopniach zakrwawienia. Do tego poświata szału, żarzące się rany, żar oczu,
// fontanny krwi z kikutów, bryzg z paszczy, fala po posadzce i ogień z paszczy.
// W C# obrazki są wczytane od razu, więc dawny rysunek 2D z cerber.ts (rysunek zastępczy w TS) nie jest przeniesiony.
// Bez alokacji na klatkę: poza i szkielet to obiekty wielokrotnego użytku, nazwy klatek liczone raz.
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using Trzewia.Plotna;
using Trzewia.Rdzen;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyWalka;
using static Trzewia.Nastawy.NastawyPomnik;
using JS = Trzewia.Js.Js;

namespace Trzewia.Rysunek
{
    /// <summary>Głowa Cerbera w pozie (render/cerber.ts: GlowaCerbera).</summary>
    public sealed class GlowaCerbera
    {
        /// <summary>pochylenie głowy (radiany, + w dół), otwarcie paszczy 0…1, wysunięcie do przodu 0…1 (kłapnięcie)</summary>
        public double pochyl, paszcza, wysun;
        /// <summary>oczy 0…1 (żar)</summary>
        public double oczy;
        /// <summary>walka: smuga szybkiego ruchu łba 0…1 i ugryzienie, które trafiło (krew z paszczy) 0…1</summary>
        public double smuga, ugryz;

        /// <summary>glowaSpokoj(oczy)</summary>
        public void Spokoj(double oczy = 1) { pochyl = 0; paszcza = 0.08; wysun = 0; this.oczy = oczy; smuga = 0; ugryz = 0; }
    }

    /// <summary>Poza Cerbera (render/cerber.ts: PozaCerbera). Pola opcjonalne w TS mają tu wartość „brak” = 0 (ogienGlowa — 1).</summary>
    public sealed class PozaCerbera
    {
        /// <summary>0 — żywy, 1 — kamień (płaskorzeźba na pieczęci)</summary>
        public double kamien;
        /// <summary>0 — stoi, 1 — leży jak sfinks</summary>
        public double lezy;
        /// <summary>chód: faza (radiany) i wielkość kroku 0…1</summary>
        public double faza, krok;
        /// <summary>staje dęba 0…1, przysiad 0…1, odrzut do tyłu 0…1</summary>
        public double deba, przysiad, odrzut;
        public readonly GlowaCerbera[] glowy = { new GlowaCerbera(), new GlowaCerbera(), new GlowaCerbera() };
        /// <summary>ogon: wychylenie (−1…1) i smagnięcie 0…1</summary>
        public double ogon, bicz;
        /// <summary>rany 0…1 (żarzące się pęknięcia), złote światło konania 0…1, szał 0…1</summary>
        public double rany, swiatlo, szal;
        public double oddech;
        /// <summary>ogień z paszczy 0…1 i która głowa zieje (domyślnie środkowa)</summary>
        public double ogien;
        public int ogienGlowa = 1;
        /// <summary>głowy ścięte przez rycerza (0 doberman, 1 wilk, 2 pitbull) i ile ms temu (fontanna krwi)</summary>
        public int ileOdcietych;
        public readonly int[] odciete = new int[3];
        public readonly double[] odcieteMs = new double[3];
        /// <summary>walka: szarpnięcie bliższą przednią łapą 0…1, skok naprzód 0…1, przypadnięcie na przednie łapy 0…1</summary>
        public double lapa, skok, kleka;
        /// <summary>fala uderzenia albo wycia rozchodząca się od psa 0…1</summary>
        public double fala;
        /// <summary>krew na pyskach, piersi i przednich łapach 0…1</summary>
        public double krew;
        public double czas;

        /// <summary>Numer na liście ściętych albo −1.</summary>
        public int Odcieta(int nr)
        {
            for (int j = 0; j < ileOdcietych; j++) if (odciete[j] == nr) return j;
            return -1;
        }

        public void DodajOdcieta(int nr, double ms)
        {
            if (ileOdcietych >= 3) return;
            odciete[ileOdcietych] = nr; odcieteMs[ileOdcietych] = ms; ileOdcietych++;
        }

        /// <summary>pozaCerbera(): stoi spokojnie, żywy, krew 0,6.</summary>
        public PozaCerbera Zeruj()
        {
            kamien = 0; lezy = 0; faza = 0; krok = 0; deba = 0; przysiad = 0; odrzut = 0;
            foreach (var g in glowy) g.Spokoj();
            ogon = 0; bicz = 0; rany = 0; swiatlo = 0; szal = 0; oddech = 0.5; ogien = 0; ogienGlowa = 1;
            ileOdcietych = 0; lapa = 0; skok = 0; kleka = 0; fala = 0; krew = 0.6; czas = 0;
            return this;
        }

        public static PozaCerbera Nowa() => new PozaCerbera().Zeruj();
    }

    /// <summary>Punkty Cerbera w pikselach układu, w którym go narysowano: obroża na karku, paszcze trzech głów, brzuch.</summary>
    public struct PunktyCerbera
    {
        public (double x, double y) obroza, paszcza0, paszcza1, paszcza2, brzuch;
        public (double x, double y) Paszcza(int i) => i == 0 ? paszcza0 : i == 1 ? paszcza1 : paszcza2;
    }

    /// <summary>
    /// Szkielet Cerbera (render/cerber-rig.ts): gdzie w danej pozie są nasady szyj, kotwice i kąty głów, końce szyj,
    /// nasada ogona, paszcze i oczy. Jednostka = wysokość Cerbera; stopy w (0, 0), pyski w +x, y w dół, z w głąb.
    /// </summary>
    public sealed class RigCerbera
    {
        public struct V3 { public double x, y, z; public V3(double x, double y, double z) { this.x = x; this.y = y; this.z = z; } }

        /// <summary>Wymiary głów: długość (jednostki), x czubka nosa i oko (w długościach głowy).</summary>
        static readonly (double L, double dl, V3 oko)[] GLOWY_RIG =
        {
            (0.29, 1.0, new V3(0.53, -0.085, 0.115)),    // doberman
            (0.3, 1.03, new V3(0.53, -0.085, 0.115)),    // wilk
            (0.28, 0.85, new V3(0.47, -0.11, 0.165)),    // pitbull
        };
        static readonly V3[] KOTWICE = { new V3(0.3, -1.0, 0.13), new V3(0.5, -0.83, 0.0), new V3(0.58, -0.62, -0.13) };
        static readonly V3[] NASADY = { new V3(0.1, -0.6, 0.06), new V3(0.17, -0.55, 0.0), new V3(0.21, -0.47, -0.07) };
        /// <summary>Kąt głowy w spoczynku (przy pochyl = 0): doberman zadarty, wilk prosto, pitbull lekko w dół.</summary>
        public static readonly double[] KAT_BAZOWY = { -0.3, -0.02, 0.12 };

        public double deba, dx, dy, SX = 0.92;
        double pivX, pivY;
        public readonly V3[] nasady = new V3[3], kotwice = new V3[3], konce = new V3[3], paszcze = new V3[3], oczy = new V3[3];
        public readonly double[] katy = new double[3];
        public V3 ogonBaza, obroza, brzuch;

        static (double x, double y) obr(double x, double y, double kat) { double c = Math.Cos(kat), s = Math.Sin(kat); return (x * c - y * s, x * s + y * c); }

        public V3 T(double x, double y, double z)
        {
            double qx = x * SX + dx - pivX, qy = y + dy - pivY;
            var (rx, ry) = obr(qx, qy, -deba);
            return new V3(pivX + rx, pivY + ry, z);
        }

        /// <summary>Punkt w układzie głowy `i` (x od potylicy do nosa, y w dół, z w bok; w długościach głowy).</summary>
        static V3 punktGlowy(int i, V3 kot, double kat, double x, double y, double z)
        {
            var L = GLOWY_RIG[i].L;
            var (rx, ry) = obr((x - 0.3) * L, y * L, kat);
            return new V3(kot.x + rx, kot.y + ry, kot.z + z * L);
        }

        /// <summary>Jak mocno łapa uderza w danej fazie szarpnięcia (0 — wznosi albo wraca, 1 — cios).</summary>
        public static double uderzenieLapy(double lapa) => Math.Sin(Math.PI * Math.Min(1, Math.Max(0, (lapa - 0.25) / 0.5)));

        /// <summary>rigCerbera(p) — poza tułowia podana wprost (w sprite: z klatki ciała), głowy z `glowy`.</summary>
        public RigCerbera Licz(double lez, double kleka, double skok, double lapa0, double przysiad, double faza, double krok, double oddech, double odrzut, double deba0, GlowaCerbera[] glowy)
        {
            var lapa = uderzenieLapy(lapa0);
            dy = 0.27 * lez + 0.09 * przysiad + 0.05 * kleka - 0.07 * skok - 0.01 * Math.Sin(faza * 2) * krok + 0.005 * (oddech - 0.5);
            dx = -0.1 * odrzut + 0.06 * skok;
            // pochylenie tułowia wokół bioder: dęba w górę; cios łapą, przypadnięcie i skok przodem w dół
            deba = deba0 * 0.5 - 0.1 * lapa - 0.26 * kleka - 0.05 * skok;
            pivX = -0.3 + dx; pivY = -0.47 + dy;
            for (int i = 0; i < 3; i++)
            {
                var g = glowy[i]; var kz = KOTWICE[i];
                var kot = T(kz.x + 0.24 * g.wysun, kz.y + 0.07 * g.wysun + (lez > 0.5 ? 0.15 : 0), kz.z);
                var kat = KAT_BAZOWY[i] + g.pochyl - deba * 0.3;
                nasady[i] = T(NASADY[i].x, NASADY[i].y, NASADY[i].z);
                kotwice[i] = kot; katy[i] = kat;
                konce[i] = punktGlowy(i, kot, kat, 0.12, 0.06, 0);
                paszcze[i] = punktGlowy(i, kot, kat, GLOWY_RIG[i].dl * 0.75, 0.13 + 0.15 * g.paszcza, 0);
                var ok = GLOWY_RIG[i].oko;
                oczy[i] = punktGlowy(i, kot, kat, ok.x, ok.y, -ok.z);
            }
            ogonBaza = T(-0.36, -0.52, 0); obroza = T(0.25, -0.58, 0); brzuch = T(0, -0.32, 0);
            return this;
        }
    }

    /// <summary>Cerber z obrazków (cerber-sprite.ts) i ścięta głowa na posadzce.</summary>
    public static class RysCerber
    {
        /// <summary>Kąt kamery wypieku (render/cerber3d.ts: YAW_CERBERA).</summary>
        const double YAW = 0.5;
        static readonly double[] KATY = { -0.6, 0, 0.6, 1.2 };
        static readonly double[] PASZCZE = { 0, 0.25, 0.5, 0.75, 1 };
        /// <summary>Wysokość modelu do czubka uszu górnej głowy (jednostki) — rysunek 2D miał `h` do czubka najwyższej głowy.</summary>
        const double WYS_MODELU = 1.12;

        // ------------------------------------------------------------- obrazki części (dane/grafika/krag/cerber)

        /// <summary>Część wypieku: obrazek, punkt zaczepienia (x0, y0 w jednostkach modelu), skala S (piksele na jednostkę).</summary>
        sealed class Czesc
        {
            public double x0, y0, S, w, h;
            public IObraz? img;
            public readonly List<IZrodloObrazu> mip = new List<IZrodloObrazu>();
            public readonly List<(int w, int h)> wym = new List<(int, int)>();
        }

        static Dictionary<string, Czesc>? czesciOryginal, czesciRycina;

        /// <summary>
        /// Wczytuje dane.json i obrazki części (raz na zestaw). Oba zestawy (oryginał i etap 5 „rycina”) trzymane
        /// osobno — F9/VisualConfig.Rycina przełącza między nimi bez przeładowania: dane.json (wymiary, punkty
        /// zaczepienia) są wspólne, zmienia się tylko folder i rozszerzenie obrazków.
        /// </summary>
        static Dictionary<string, Czesc> Czesci()
        {
            var rycina = Visual.VisualConfig.Aktywne(Visual.VisualConfig.Rycina);
            ref var cache = ref (rycina ? ref czesciRycina : ref czesciOryginal);
            if (cache != null) return cache;
            var wynik = new Dictionary<string, Czesc>();
            var bajty = Rdzen.Zasoby.Czytaj("grafika/krag/cerber/dane.json");
            if (bajty != null && Json.Czytaj(Encoding.UTF8.GetString(bajty)) is Dictionary<string, object?> o)
            {
                var folder = rycina ? "grafika/krag/cerber-rycina/" : "grafika/krag/cerber/";
                // (oba zestawy to WebP bezstratny — etap 5; dawniej tu stało „.png” dla ryciny i Cerber znikał przy F9 włączonym)
                const string rozszerzenie = ".webp";
                foreach (var kv in o)
                {
                    if (!(kv.Value is Dictionary<string, object?> d)) continue;
                    double L(string k) => d.TryGetValue(k, out var v) && v is double x ? x : 0;
                    var c = new Czesc { x0 = L("x0"), y0 = L("y0"), S = L("S"), w = L("w"), h = L("h") };
                    if (c.S <= 0) continue;
                    c.img = Plotno.Wczytaj(folder + kv.Key + rozszerzenie);
                    if (!c.img.complete) continue;
                    c.mip.Add(c.img); c.wym.Add((c.img.width, c.img.height));
                    wynik[kv.Key] = c;
                }
            }
            cache = wynik;
            return wynik;
        }

        /// <summary>Czy obrazki Cerbera są w danych gry.</summary>
        public static bool Gotowy() => Czesci().Count > 0;

        static Czesc? Daj(string nazwa) => Czesci().TryGetValue(nazwa, out var c) ? c : null;

        /// <summary>Obrazek w rozdzielczości dobranej do skali `f` (piksele ekranu na piksel obrazka): pomniejszenia liczone raz.</summary>
        static IZrodloObrazu poziom(Czesc o, double f)
        {
            int n = 0;
            while (f * (1 << n) < 0.55 && n < 5) n++;
            while (o.mip.Count <= n)
            {
                var (w0, h0) = o.wym[o.wym.Count - 1];
                int w = Math.Max(1, (int)Math.Round(w0 / 2.0, MidpointRounding.AwayFromZero)), h = Math.Max(1, (int)Math.Round(h0 / 2.0, MidpointRounding.AwayFromZero));
                var c = Plotno.Nowe(w, h);
                c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
                c.drawImage(o.mip[o.mip.Count - 1], 0, 0, w, h);
                o.mip.Add(c); o.wym.Add((w, h));
            }
            return o.mip[Math.Min(n, o.mip.Count - 1)];
        }

        /// <summary>Rysuje część z punktem zaczepienia w (0, 0) bieżącego układu; `h` — pikseli na jednostkę modelu.</summary>
        static void czesc(IPlotno ctx, Czesc? k, double h)
        {
            if (k == null) return;
            var obraz = poziom(k, h / k.S);
            ctx.drawImage(obraz, k.x0 * h, k.y0 * h, (k.w / k.S) * h, (k.h / k.S) * h);
            // oprawa (etap 3): błysk trafienia — ta sama część jeszcze raz, biała, z kryciem błysku
            if (BlyskBialy > 0.01 && (!(obraz is IObraz io) || io.complete))
            {
                var a = ctx.globalAlpha;
                ctx.globalAlpha = a * BlyskBialy;
                ctx.drawImage(biala(obraz), k.x0 * h, k.y0 * h, (k.w / k.S) * h, (k.h / k.S) * h);
                ctx.globalAlpha = a;
            }
        }

        /// <summary>Oprawa (etap 3): krycie białego błysku trafienia na czas rysunku bossa (0 — bez błysku).</summary>
        public static double BlyskBialy;
        static readonly Dictionary<IZrodloObrazu, IPlotno> biale = new Dictionary<IZrodloObrazu, IPlotno>();

        /// <summary>Biała sylwetka obrazka części (liczona raz na obrazek i poziom).</summary>
        static IZrodloObrazu biala(IZrodloObrazu obraz)
        {
            if (biale.TryGetValue(obraz, out var b)) return b;
            b = Plotno.Nowe(Math.Max(1, obraz.width), Math.Max(1, obraz.height));
            b.drawImage(obraz, 0, 0);
            b.globalCompositeOperation = "source-in";
            b.fillStyle = "rgb(255,250,242)";
            b.fillRect(0, 0, b.width, b.height);
            b.globalCompositeOperation = "source-over";
            biale[obraz] = b;
            return b;
        }

        // nazwy klatek — raz, żeby w klatce nie składać napisów
        static readonly string[,,,] NAZWY_GLOW = new string[3, 4, 5, 2];
        static readonly string[,] NAZWY_GLOW_KAMIEN = new string[3, 4];
        static readonly string[] NAZWY_SZYJ = new string[3], NAZWY_SZYJ_KAMIEN = new string[3], NAZWY_KIKUTOW = new string[3], NAZWY_ODCIETYCH = new string[3];
        static readonly string[] NAZWY_KROKU = new string[12], NAZWY_LAPY = new string[5];
        static RysCerber()
        {
            for (int i = 0; i < 3; i++)
            {
                for (int a = 0; a < 4; a++)
                {
                    NAZWY_GLOW_KAMIEN[i, a] = $"glowa-{i}-a{a}-kamien";
                    for (int p = 0; p < 5; p++) for (int k = 0; k < 2; k++) NAZWY_GLOW[i, a, p, k] = $"glowa-{i}-a{a}-p{p}-k{k}";
                }
                NAZWY_SZYJ[i] = $"szyja-{i}"; NAZWY_SZYJ_KAMIEN[i] = $"szyja-{i}-kamien"; NAZWY_KIKUTOW[i] = $"szyja-{i}-kikut"; NAZWY_ODCIETYCH[i] = $"glowa-{i}-odcieta";
            }
            for (int k = 0; k < 12; k++) NAZWY_KROKU[k] = $"cialo-krok-{k}";
            for (int n = 0; n < 5; n++) NAZWY_LAPY[n] = $"cialo-lapa-{n + 1}";
        }

        // ------------------------------------------------------------- pomocnicze

        static (double x, double y) rz(RigCerbera.V3 p, double h) => ((p.x * Math.Cos(YAW) + p.z * Math.Sin(YAW)) * h, p.y * h);

        static int najblizszy(double[] lista, double v)
        {
            int n = 0;
            for (int i = 1; i < lista.Length; i++) if (Math.Abs(lista[i] - v) < Math.Abs(lista[n] - v)) n = i;
            return n;
        }

        /// <summary>Tani skrót liczby (stałe kształty, rysunek nie sięga po los gry).</summary>
        internal static double los(double n0)
        {
            unchecked
            {
                int x = (JS.ToInt32(n0) ^ (int)0x9e3779b9) * (int)0x85ebca6b;
                x = (x ^ (int)((uint)x >> 13)) * (int)0xc2b2ae35;
                return (uint)(x ^ (int)((uint)x >> 16)) / 4294967296.0;
            }
        }

        /// <summary>Math.round z JS (połówki w górę).</summary>
        static double jsRound(double v) => Math.Floor(v + 0.5);

        static double gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }

        /// <summary>
        /// Tętnicza fontanna z kikuta szyi: łuki kropel wzdłuż osi szyi w rytm serca, coraz słabsze przez ok. 9 s po ścięciu;
        /// potem krew już tylko cieknie po kikucie. `kat` — kierunek szyi na ekranie, `ms` — od ścięcia.
        /// </summary>
        static void tryska(IPlotno ctx, double x, double y, double kat, double h, double ms)
        {
            var swiezo = Math.Max(0, 1 - ms / 9000);
            var t = ms / 1000;
            ctx.save();
            if (swiezo > 0)
            {
                var serce = 0.35 + 0.65 * Math.Pow(Math.Max(0, Math.Sin(t * Math.PI * 2 * 1.3)), 2);
                // strumień: gęsty łuk tuż przy kikucie
                ctx.strokeStyle = Barwa.Rgba(110, 4, 2, 0.85 * swiezo * serce);
                ctx.lineWidth = Math.Max(1.5, h * 0.022 * swiezo * serce); ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(x, y);
                var v0 = h * 0.5 * (0.5 + 0.5 * swiezo) * serce;
                for (int i = 1; i <= 8; i++)
                {
                    var f = i / 8.0 * 0.45;
                    ctx.lineTo(x + Math.Cos(kat) * v0 * f, y + Math.Sin(kat) * v0 * f + h * 1.4 * f * f);
                }
                ctx.stroke();
                // krople: rozlatują się z łuku i spadają
                const int n = 30;
                for (int i = 0; i < n; i++)
                {
                    var f = ((t * 1.25) + (double)i / n) % 1;
                    double r1 = los(i * 13 + 5), r2 = los(i * 7 + 11);
                    var v = h * (0.35 + 0.45 * r1) * (0.4 + 0.6 * swiezo) * (0.6 + 0.4 * serce);
                    var a = kat + (r2 - 0.5) * 0.6;
                    double px = x + Math.Cos(a) * v * f, py = y + Math.Sin(a) * v * f + h * 1.5 * f * f;
                    var r = Math.Max(0.8, h * (0.005 + 0.007 * r1) * (1 - 0.5 * f));
                    ctx.fillStyle = Barwa.Rgba(96 + 40 * r2, 4, 3, (0.9 - 0.6 * f) * swiezo);
                    ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r, a + f, 0, Math.PI * 2); ctx.fill();
                }
            }
            // cieknie: krople zsuwają się po kikucie i kapią
            ctx.fillStyle = "rgba(90,4,3,0.85)";
            for (int i = 0; i < 4; i++)
            {
                var f = ((t * 0.6) + i * 0.27) % 1;
                ctx.beginPath(); ctx.ellipse(x + (i - 1.5) * h * 0.012, y + h * 0.02 + f * h * 0.5, h * 0.006, h * 0.012 * (1 + f), 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Bryzg krwi z paszczy w chwili ugryzienia: krople na boki i w dół, czerwona mgiełka; `f` — postęp 0…1.</summary>
        static void bryzgPaszczy(IPlotno ctx, double x, double y, double h, double f, double ziarno)
        {
            ctx.save();
            var mg = ctx.createRadialGradient(x, y, 0, x, y, h * 0.16);
            mg.addColorStop(0, Barwa.Rgba(120, 6, 4, 0.45 * (1 - f))); mg.addColorStop(1, "rgba(90,0,0,0)");
            ctx.fillStyle = mg; ctx.fillRect(x - h * 0.16, y - h * 0.16, h * 0.32, h * 0.32);
            for (int i = 0; i < 22; i++)
            {
                double r1 = los(ziarno * 31 + i * 7), r2 = los(ziarno * 13 + i * 11);
                var a = -Math.PI * 0.15 + (r1 - 0.5) * Math.PI * 1.5;
                var v = h * (0.12 + 0.3 * r2);
                double px = x + Math.Cos(a) * v * f, py = y + Math.Sin(a) * v * f + h * 0.5 * f * f;
                var r = Math.Max(0.8, h * (0.004 + 0.007 * r1) * (1 - 0.5 * f));
                ctx.fillStyle = Barwa.Rgba(100 + 50 * r2, 5, 3, 0.95 - 0.6 * f);
                ctx.beginPath(); ctx.ellipse(px, py, r * 1.5, r, a, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Fala po posadzce od łap psa (tupnięcie, uderzenie w ziemię, wycie): spłaszczony krąg pyłu i lecące odłamki.</summary>
        static void fala(IPlotno ctx, double x, double h, double f)
        {
            ctx.save();
            var R = h * (0.25 + 1.5 * f);
            ctx.strokeStyle = Barwa.Rgba(170, 150, 128, 0.55 * (1 - f)); ctx.lineWidth = Math.Max(1.5, h * 0.02 * (1 - f));
            ctx.beginPath(); ctx.ellipse(x, 0, R, R * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = Barwa.Rgba(200, 80, 40, 0.35 * (1 - f)); ctx.lineWidth = Math.Max(1, h * 0.01 * (1 - f));
            ctx.beginPath(); ctx.ellipse(x, 0, R * 0.7, R * 0.085, 0, 0, Math.PI * 2); ctx.stroke();
            for (int i = 0; i < 16; i++)
            {
                double s = i % 2 != 0 ? 1 : -1, r1 = los(i * 5 + 3), r2 = los(i * 9 + 1);
                double px = x + s * R * (0.5 + 0.5 * r1), py = -h * (0.05 + 0.25 * r2) * Math.Sin(Math.PI * Math.Min(1, f * 1.3));
                ctx.fillStyle = Barwa.Rgba(90 + 40 * r2, 80 + 30 * r2, 70 + 20 * r2, 0.8 * (1 - f));
                ctx.fillRect(px - h * 0.006, py - h * 0.006, h * (0.008 + 0.01 * r1), h * (0.008 + 0.01 * r1));
            }
            ctx.restore();
        }

        /// <summary>
        /// Ścięta głowa Cerbera leżąca na posadzce: `ctx` w punkcie na posadzce, zwrot już ustawiony, `hRys` — wysokość
        /// Cerbera jak w rysujCerbera, `ms` — od ścięcia (kałuża rośnie, krew sączy się z karku).
        /// </summary>
        public static void rysujScietaGlowe(IPlotno ctx, int nr, double hRys, double ms, bool kaluza = true)
        {
            if (!Gotowy() || nr < 0 || nr > 2) return;
            var h = hRys / WYS_MODELU;
            var k = Math.Min(1, ms / 3000);
            ctx.save();
            // (oprawa, etap 3: w locie bez kałuży — ta rośnie dopiero na posadzce)
            if (kaluza)
            {
                ctx.fillStyle = "rgba(70,3,2,0.9)";
                ctx.beginPath(); ctx.ellipse(-h * 0.08, 0, h * (0.06 + 0.2 * k), h * (0.012 + 0.025 * k), 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(150,30,24,0.25)";
                ctx.beginPath(); ctx.ellipse(-h * 0.12, -h * 0.004, h * 0.08 * k, h * 0.008 * k, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.translate(0, -h * 0.085);
            ctx.rotate(0.42);
            czesc(ctx, Daj(NAZWY_ODCIETYCH[nr]), h);
            ctx.restore();
        }

        // poza tułowia, w jakiej wypieczono klatkę ciała (szkielet liczy się z niej, by części pasowały)
        struct PozaCiala { public double lezy, deba, przysiad, odrzut, krok, faza, oddech, lapa, skok, kleka; }

        /// <summary>Klatka ciała dla pozy i poza tułowia, w jakiej ją wypieczono.</summary>
        static string klatkaCiala(PozaCerbera p, out PozaCiala z)
        {
            z = new PozaCiala { oddech = 0.5 };
            if (p.kamien > 0.5) { if (p.lezy > 0.5) { z.lezy = 1; return "cialo-kamien-lezy"; } return "cialo-kamien"; }
            if (p.lezy > 0.5) { z.lezy = 1; return "cialo-lezy"; }
            if (p.kleka > 0.45) { z.kleka = 1; return "cialo-kleka"; }
            var L = p.lapa;
            if (L > 0.06 && L < 0.96) { var n = najblizszy(FAZY_LAPY, L); z.lapa = FAZY_LAPY[n]; return NAZWY_LAPY[n]; }
            if (p.skok > 0.25) { var n = p.skok > 0.75 ? 2 : 1; z.skok = n * 0.5; return n == 2 ? "cialo-skok-2" : "cialo-skok-1"; }
            if (p.deba > 0.12) { var d = (int)Math.Max(1, Math.Min(4, jsRound(p.deba * 4))); z.deba = d * 0.25; return DEBA[d - 1]; }
            if (p.przysiad > 0.25) { var d = p.przysiad > 0.75 ? 2 : 1; z.przysiad = d * 0.5; return d == 2 ? "cialo-przysiad-2" : "cialo-przysiad-1"; }
            if (p.odrzut > 0.5) { z.odrzut = 1; return "cialo-odrzut"; }
            if (p.krok > 0.3)
            {
                var k = (int)(((jsRound(p.faza / (Math.PI / 6)) % 12) + 12) % 12);
                z.krok = 1; z.faza = (k * Math.PI) / 6;
                return NAZWY_KROKU[k];
            }
            return "cialo-stoi";
        }
        static readonly double[] FAZY_LAPY = { 0.18, 0.35, 0.48, 0.62, 0.82 };
        static readonly string[] DEBA = { "cialo-deba-1", "cialo-deba-2", "cialo-deba-3", "cialo-deba-4" };

        static RigCerbera? rigSpoczynku;
        static RigCerbera spoczynek()
        {
            if (rigSpoczynku == null)
            {
                var g = new[] { new GlowaCerbera(), new GlowaCerbera(), new GlowaCerbera() };
                foreach (var x in g) { x.pochyl = 0; x.paszcza = 0.15; x.wysun = 0; x.oczy = 1; }
                rigSpoczynku = new RigCerbera().Licz(0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, g);
            }
            return rigSpoczynku;
        }

        static readonly RigCerbera rigBiezacy = new RigCerbera();
        static readonly double[] czGx = new double[3], czGy = new double[3];
        static readonly bool[] czJest = new bool[3];

        /// <summary>Oprawa (etap 2): ślepia głów (indeks = numer głowy), czy głowa na karku, obrys ciała — do Visual.Czytelnosc.</summary>
        static void zapiszDlaCzytelnosci(IPlotno ctx, double hRys, double h, RigCerbera rig, PozaCerbera p, bool kam)
        {
            double x0 = 0, x1 = 0, y0 = 0;
            void dodaj((double x, double y) q) { x0 = Math.Min(x0, q.x); x1 = Math.Max(x1, q.x); y0 = Math.Min(y0, q.y); }
            for (int i = 0; i < 3; i++)
            {
                // punkt głowy: ślepia (kotwica łba leży przy karku — znak wskazywałby szyję)
                var q = rz(rig.oczy[i], h);
                czGx[i] = q.x; czGy[i] = q.y; czJest[i] = kam || p.Odcieta(i) < 0;
                dodaj(q); dodaj(rz(rig.kotwice[i], h));
            }
            dodaj(rz(rig.ogonBaza, h)); dodaj(rz(rig.obroza, h)); dodaj(rz(rig.brzuch, h));
            var m = hRys * 0.1;
            Visual.Czytelnosc.ZapiszCerbera(ctx, hRys, czGx, czGy, czJest, x0 - m, y0 - m, x1 + m, 0);
        }
        static readonly (double x, double y, double kat, double ms)[] kikuty = new (double, double, double, double)[3];
        static readonly double[,] SMUGA = { { 0.07, 0.32 }, { 0.14, 0.16 }, { 0.21, 0.08 } };

        /// <summary>
        /// Rysuje Cerbera z obrazków: stopy w (0, 0) bieżącego układu, `hRys` — wysokość do czubka najwyższej głowy.
        /// Zwraca punkty (obroża, trzy paszcze, brzuch) w pikselach.
        /// </summary>
        public static PunktyCerbera rysujCerbera(IPlotno ctx, double hRys, PozaCerbera p)
        {
            var h = hRys / WYS_MODELU;
            var t = p.czas / 1000;
            var kam = p.kamien > 0.5;
            var cialo = klatkaCiala(p, out var pc);
            var rig = rigBiezacy.Licz(pc.lezy, pc.kleka, pc.skok, pc.lapa, pc.przysiad, pc.faza, pc.krok, pc.oddech, pc.odrzut, pc.deba, p.glowy);
            // oprawa (etap 2): boss oddaje punkty głów i obrys ciała — znaki I/II/III i sylwetki postaci przy nim
            if (Visual.Czytelnosc.ZbierajBossa) zapiszDlaCzytelnosci(ctx, hRys, h, rig, p, kam);
            var r0 = spoczynek();
            ctx.save();
            // poświata szału (za nim)
            if (p.szal > 0.01 && !kam)
            {
                var R = hRys * 1.1;
                var g = ctx.createRadialGradient(0, -hRys * 0.5, hRys * 0.1, 0, -hRys * 0.5, R);
                g.addColorStop(0, Barwa.Rgba(255, 40, 10, 0.18 * p.szal * (0.7 + 0.3 * Math.Sin(t * 7)))); g.addColorStop(1, "rgba(150,10,5,0)");
                ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(-R, -hRys * 0.5 - R, R * 2, R * 2); ctx.restore();
            }
            // cień pod nim
            if (!kam)
            {
                ctx.fillStyle = "rgba(3,2,2,0.5)";
                ctx.beginPath(); ctx.ellipse(-h * 0.06, 0, h * 0.5, h * 0.04, 0, 0, Math.PI * 2); ctx.fill();
            }
            // ogon (za tułowiem), obrócony z tułowiem
            {
                var nazwa = kam ? "ogon-kamien" : p.bicz > 0.25 ? (p.bicz > 0.75 ? "ogon-bicz-2" : "ogon-bicz-1") : p.ogon < -0.35 ? "ogon-l" : p.ogon > 0.35 ? "ogon-p" : "ogon-0";
                var (x, y) = rz(rig.ogonBaza, h);
                ctx.save(); ctx.translate(x, y); ctx.rotate(-rig.deba); czesc(ctx, Daj(nazwa), h); ctx.restore();
            }
            // szyje (za tułowiem: pierś zakrywa ich nasady): obraz z pozy spoczynku przeniesiony na odcinek nasada → koniec;
            // ścięta głowa — zostaje kikut szyi (ucięty w połowie), z którego bije krew
            int ileKikutow = 0;
            for (int i = 0; i < 3; i++)
            {
                var (ax, ay) = rz(rig.nasady[i], h); var (bx, by) = rz(rig.konce[i], h);
                var (a0x, a0y) = rz(r0.nasady[i], h); var (b0x, b0y) = rz(r0.konce[i], h);
                double k = Math.Atan2(by - ay, bx - ax), k0 = Math.Atan2(b0y - a0y, b0x - a0x);
                var j = kam ? -1 : p.Odcieta(i);
                if (j >= 0)
                {
                    ctx.save(); ctx.translate(ax, ay); ctx.rotate(k - k0); czesc(ctx, Daj(NAZWY_KIKUTOW[i]), h); ctx.restore();
                    double kx = (b0x - a0x) * 0.5, ky = (b0y - a0y) * 0.5, c = Math.Cos(k - k0), sn = Math.Sin(k - k0);
                    kikuty[ileKikutow++] = (ax + kx * c - ky * sn, ay + kx * sn + ky * c, k, p.odcieteMs[j]);
                    continue;
                }
                var s = JS.Hypot(bx - ax, by - ay) / Math.Max(1e-6, JS.Hypot(b0x - a0x, b0y - a0y));
                ctx.save(); ctx.translate(ax, ay); ctx.rotate(k); ctx.scale(s, 1); ctx.rotate(-k0);
                czesc(ctx, Daj(kam ? NAZWY_SZYJ_KAMIEN[i] : NAZWY_SZYJ[i]), h);
                ctx.restore();
            }
            // tułów z łapami
            czesc(ctx, Daj(cialo), h);
            // żarzące się rany / złote światło konania na tułowiu
            if (p.rany > 0.02 || p.swiatlo > 0.02)
            {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                var zl = p.swiatlo;
                var n = (int)jsRound(3 + 9 * Math.Max(p.rany, zl));
                ctx.lineCap = "round"; ctx.lineJoin = "round";
                for (int i = 0; i < n; i++)
                {
                    var (sx, sy) = rz(rig.T(-0.42 + los(i * 3 + 1) * 0.7, -0.6 + los(i * 3 + 2) * 0.26, -0.12), h);
                    ctx.strokeStyle = zl > 0.05 ? Barwa.Rgba(255, 200 + 40 * zl, 120 + 80 * zl, 0.4 + 0.6 * zl) : Barwa.Rgba(255, 60 + 40 * Math.Sin(t * 4 + i), 20, 0.3 + 0.45 * p.rany);
                    ctx.lineWidth = Math.Max(0.8, h * 0.006 * (1 + zl));
                    ctx.beginPath(); ctx.moveTo(sx, sy);
                    double x = sx, y = sy;
                    for (int j = 0; j < 4; j++) { x += (los(i * 17 + j) - 0.5) * h * 0.09; y += (los(i * 29 + j) - 0.3) * h * 0.05; ctx.lineTo(x, y); }
                    ctx.stroke();
                }
                if (zl > 0.02)
                {
                    var (bx, by) = rz(rig.brzuch, h);
                    var g = ctx.createRadialGradient(bx, by - h * 0.1, 0, bx, by - h * 0.1, h * 0.7);
                    g.addColorStop(0, Barwa.Rgba(255, 220, 150, 0.35 * zl)); g.addColorStop(1, "rgba(255,180,90,0)");
                    ctx.fillStyle = g; ctx.fillRect(bx - h * 0.7, by - h * 0.8, h * 1.4, h * 1.4);
                }
                ctx.restore();
            }
            // głowy: dalsza (doberman, wysoko), środkowa (wilk), bliższa (pitbull, nisko)
            var krewG = p.krew >= 0.75 ? 1 : 0;
            for (int i = 0; i < 3; i++)
            {
                var g = p.glowy[i];
                if (!kam && p.Odcieta(i) >= 0) continue;
                // głowa: najbliższy wypieczony kąt, reszta obrotem
                {
                    var kat = rig.katy[i];
                    var a = najblizszy(KATY, kat);
                    var nazwa = kam ? NAZWY_GLOW_KAMIEN[i, a] : NAZWY_GLOW[i, a, najblizszy(PASZCZE, g.paszcza), krewG];
                    var cz = Daj(nazwa);
                    var (x, y) = rz(rig.kotwice[i], h);
                    // smuga: szybki rzut łbem naprzód — ten sam łeb dwa razy za sobą, coraz słabiej
                    var sm = kam ? 0 : g.smuga;
                    if (sm > 0.05)
                    {
                        var (kx, ky) = rz(rig.konce[i], h);
                        double dx = x - kx, dy = y - ky, l = JS.Hypot(dx, dy); if (l == 0) l = 1;
                        for (int s = 0; s < 3; s++)
                        {
                            double d = SMUGA[s, 0], al = SMUGA[s, 1];
                            ctx.save(); ctx.globalAlpha = ctx.globalAlpha * al * sm;
                            ctx.translate(x - (dx / l) * h * d * sm, y - (dy / l) * h * d * sm); ctx.rotate(kat - KATY[a]); czesc(ctx, cz, h);
                            ctx.restore();
                        }
                    }
                    ctx.save(); ctx.translate(x, y); ctx.rotate(kat - KATY[a]); czesc(ctx, cz, h); ctx.restore();
                }
                // żar oczu
                if (g.oczy > 0.02)
                {
                    var (x, y) = rz(rig.oczy[i], h);
                    var R = h * 0.024 * (0.7 + 0.5 * g.oczy);
                    var gg = ctx.createRadialGradient(x, y, 0, x, y, R);
                    gg.addColorStop(0, p.swiatlo > 0.3 ? Barwa.Rgba(255, 220, 140, 0.4 * g.oczy) : Barwa.Rgba(255, 70, 20, (kam ? 0.6 : 0.35) * g.oczy)); gg.addColorStop(1, "rgba(160,0,0,0)");
                    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gg; ctx.fillRect(x - R, y - R, R * 2, R * 2); ctx.restore();
                }
            }
            // krew z kikutów: fontanna w rytm serca (słabnie), potem cieknie
            for (int i = 0; i < ileKikutow; i++) tryska(ctx, kikuty[i].x, kikuty[i].y, kikuty[i].kat, h, kikuty[i].ms);
            var pk = new PunktyCerbera { obroza = rz(rig.obroza, h), paszcza0 = rz(rig.paszcze[0], h), paszcza1 = rz(rig.paszcze[1], h), paszcza2 = rz(rig.paszcze[2], h), brzuch = rz(rig.brzuch, h) };
            // kły trafiły: krew bryzga z paszczy
            for (int i = 0; i < 3; i++)
            {
                var f = p.glowy[i].ugryz;
                if (f > 0 && f < 1 && p.Odcieta(i) < 0) { var (px, py) = pk.Paszcza(i); bryzgPaszczy(ctx, px, py, h, f, i * 17 + Math.Floor(p.czas / 2000)); }
            }
            // fala uderzenia / wycia po posadzce: krąg pyłu i odłamków
            if (p.fala > 0 && p.fala < 1 && !kam) fala(ctx, pk.brzuch.x, h, p.fala);
            // ogień z paszczy
            if (p.ogien > 0.02)
            {
                var (fx, fy) = pk.Paszcza(p.ogienGlowa);
                ctx.save(); ctx.globalCompositeOperation = "lighter";
                for (int i = 0; i < 16; i++)
                {
                    var u = (t * 2.2 + i / 16.0) % 1;
                    double x = fx + u * hRys * 1.3, y = fy + u * hRys * 0.25 + Math.Sin(i * 7 + t * 9) * u * hRys * 0.12;
                    var r = hRys * (0.04 + u * 0.16) * p.ogien;
                    if (r <= 0) continue;
                    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
                    g.addColorStop(0, Barwa.Rgba(255, 210 - u * 120, 90 - u * 80, 0.55 * (1 - u) * p.ogien)); g.addColorStop(1, "rgba(200,40,10,0)");
                    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                ctx.restore();
            }
            ctx.restore();
            return pk;
        }

        // ------------------------------------------------------------- Cerber jako boss (cerber-boss.ts)

        sealed class Pamiec { public double x, czas, faza, krok; }
        static readonly ConditionalWeakTable<Creature, Pamiec> pamiec = new ConditionalWeakTable<Creature, Pamiec>();
        static readonly PozaCerbera pozaB = new PozaCerbera();
        static readonly int[] zywe = new int[3];

        static double obetnij(double v, double a, double b) => Math.Max(a, Math.Min(b, v));
        /// <summary>Dzwon: 0 przed a, 1 w środku, 0 po b.</summary>
        static double dzwon(double u, double a, double b) => u <= a || u >= b ? 0 : Math.Sin(((u - a) / (b - a)) * Math.PI);

        /// <summary>
        /// Kłapnięcie głowy: łeb cofa się i otwiera paszczę (zamach), potem rzuca się naprzód ze smugą ruchu, zatrzaskuje kły
        /// w chwili trafienia (hitU) — a gdy trafił, z paszczy bryzga krew; potem szarpie i wraca.
        /// </summary>
        static void klap(GlowaCerbera g, double u, double hitU, bool trafil = false, double nisko = 0)
        {
            var przed = gladko((u - (hitU - 0.4)) / 0.35);
            var po = u > hitU ? gladko((u - hitU) / 0.08) : 0;
            var cofa = dzwon(u, hitU - 0.42, hitU - 0.1);
            g.paszcza = Math.Max(g.paszcza, przed * (1 - po) * 1.0);
            g.wysun = Math.Max(g.wysun, przed * (1 - gladko((u - hitU - 0.15) / 0.35)) - 0.35 * cofa);
            g.pochyl += 0.25 * przed - 0.3 * cofa + nisko * przed;
            // szarpie łbem po ugryzieniu
            if (u > hitU && u < hitU + 0.2) g.pochyl += 0.12 * Math.Sin((u - hitU) * 90) * (1 - (u - hitU) / 0.2);
            g.smuga = Math.Max(g.smuga, dzwon(u, hitU - 0.1, hitU + 0.02));
            // krew z paszczy, gdy kły naprawdę trafiły: postęp bryzgu 0…1 od chwili trafienia
            if (trafil && u >= hitU && u < hitU + 0.16) g.ugryz = Math.Max(g.ugryz, (u - hitU) / 0.16);
        }

        /// <summary>Szarpnięcie łapą w fazie ruchu: wzniesienie do chwili przed ciosem, cios dokładnie w hitU, potem powrót.</summary>
        static double lapaFaza(double u, double hitU)
        {
            if (u < hitU - 0.1) return 0.35 * gladko(u / Math.Max(0.05, hitU - 0.1));
            if (u < hitU) return 0.35 + 0.15 * ((u - (hitU - 0.1)) / 0.1);
            return Math.Min(0.999, 0.5 + 0.5 * gladko((u - hitU) / Math.Max(0.05, 1 - hitU)));
        }

        static bool zawiera(int[] lista, int n, int v) { for (int i = 0; i < n; i++) if (lista[i] == v) return true; return false; }

        /// <summary>
        /// Poza Cerbera-bossa z bieżącego stanu walki (Symulacja/Walka.cs — te same ruchy co dawny demon, odegrane psem).
        /// Zwraca wspólny obiekt — ważny do następnego wywołania.
        /// </summary>
        public static PozaCerbera pozaBossa(Sim sim, Creature c, double czas)
        {
            var p = pozaB.Zeruj();
            p.czas = czas;
            if (!pamiec.TryGetValue(c, out var m)) { m = new Pamiec { x = c.x, czas = czas }; pamiec.Add(c, m); }
            var dt = Math.Max(1, czas - m.czas);
            if (czas != m.czas)
            {
                var v = Math.Min(4, (Math.Abs(c.x - m.x) / dt) * 1000);   // kafli na sekundę ekranu
                m.krok += (Math.Min(1, v / 0.9) - m.krok) * Math.Min(1, dt / 160);
                m.faza += (v * dt / 1000) * 2.6;
                m.x = c.x; m.czas = czas;
            }
            p.krok = m.krok; p.faza = m.faza;
            p.oddech = 0.5 + 0.5 * Math.Sin(czas * 0.004 + c.id);
            var zycie = obetnij(c.hp / Math.Max(1, c.hpMax ?? DEMON.hp), 0, 1);
            p.rany = (1 - zycie) * 0.95;
            p.szal = zycie < 0.25 ? 1 : 0;
            p.ogon = Math.Sin(czas * 0.0013 + c.id) * 0.6;
            for (int i = 0; i < 3; i++)
            {
                var g = p.glowy[i];
                g.pochyl = 0.12 * Math.Sin(czas * 0.0016 + i * 2.1) - 0.05;
                g.paszcza = 0.12 + 0.1 * Math.Max(0, Math.Sin(czas * 0.006 + i * 1.7));   // dyszy
            }

            // głowy ścięte przez rycerza — kikuty krwawią, gryzą tylko te, które zostały
            var odc = c.glowyOdciete;
            if (odc != null) foreach (var o in odc) p.DodajOdcieta((int)o.nr, Math.Max(0, (sim.tick - o.tick) * (1000.0 / 120)));
            // pusty pasek bieżącej głowy: łeb zwisa bezwładnie, paszcza rozdziawiona, oczy gasną — nie gryzie, czeka na miecz
            // (etap 6: bieżąca głowa to ta wskazana przez gracza — nie musi być następna w kolejności)
            var czeka = Walka.glowaCzeka(c) && Walka.glowyCerbera(c).biezaca is double bz ? (int)bz : -1;
            // etap 6 (GlowyCerbera): nakarmiona głowa śpi — nie gryzie, nie bierze udziału w ruchach
            int nz = 0;
            for (int i = 0; i < 3; i++) if (p.Odcieta(i) < 0 && i != czeka && !GlowyCerbera.Spi(sim, c, i)) zywe[nz++] = i;
            if (nz == 0) for (int i = 0; i < 3; i++) if (p.Odcieta(i) < 0) zywe[nz++] = i;

            var R = c.ruch;
            if (R != null && nz > 0)
            {
                var def = RUCHY_BOSSA[R.id];
                var dl = Math.Max(1, R.dl != 0 ? R.dl : def?.dl is double d0 && d0 != 0 ? d0 : 100);
                var u = obetnij((sim.tick - R.od) / dl, 0, 1);
                // (walka według wzorów: ruch w swoim tempie — pozy liczone w czasie oryginału, więc trafienie, ogień
                // i rozbieg szarży wypadają dokładnie tam, gdzie w symulacji)
                if (R.tempo != null && R.dl0 is double dl0 && dl0 > 0) { u = WalkaWzor.PostepRuchu(R, sim.tick - R.od); dl = dl0; }
                // (etap 6: atak głowy gra ta głowa, której to atak — pitbull gryzie, wilk wyje, doberman zieje ogniem)
                var glowaRuchu = R.glowa is double rg && p.Odcieta((int)rg) < 0 ? (int)rg : (int?)null;
                ruchNaPoze(p, R.id, u, def, dl, glowaRuchu ?? zywe[(JS.ToInt32(R.od) >> 3) % nz], nz, R.zadane, R.wariant, glowaRuchu);
            }
            // okup: trzy głowy żrą rzuconą garść jedzenia (etap 6: żre tylko nakarmiona głowa)
            if (Krag.cerberZre(sim, c) > 0)
            {
                var tylko = GlowyCerbera.Aktywne && sim.lud.krag?.okupGlowa is double og ? (int)og : -1;
                for (int i = 0; i < 3; i++)
                {
                    if (tylko >= 0 && i != tylko) continue;
                    var g = p.glowy[i];
                    g.pochyl = 0.55 + 0.08 * Math.Sin(czas * 0.01 + i);
                    g.paszcza = 0.15 + 0.35 * Math.Abs(Math.Sin(czas * 0.018 + i * 1.3));
                    g.wysun = 0.15;
                }
                p.ogon = Math.Sin(czas * 0.012) * 0.9;
            }
            // etap 6: śpiąca głowa (po karmieniu, gdy już zjadła) — łeb nisko, paszcza zamknięta, oczy prawie zgasłe
            if (GlowyCerbera.Aktywne && Krag.cerberZre(sim, c) <= 0)
                for (int i = 0; i < 3; i++)
                {
                    if (p.Odcieta(i) >= 0 || !GlowyCerbera.Spi(sim, c, i)) continue;
                    var g = p.glowy[i];
                    g.pochyl = 0.7 + 0.04 * Math.Sin(czas * 0.0025 + i);
                    g.paszcza = 0.03; g.wysun = 0; g.smuga = 0; g.ugryz = 0;
                    g.oczy = 0.08;
                }
            if (czeka >= 0)
            {
                var g = p.glowy[czeka];
                g.pochyl = 0.95 + 0.08 * Math.Sin(czas * 0.0021);
                g.paszcza = 0.55; g.wysun = 0; g.smuga = 0; g.ugryz = 0;
                g.oczy = 0.25;
            }
            return p;
        }

        static readonly System.Collections.Generic.List<double> trafionePodglad = new System.Collections.Generic.List<double> { 1, 1 };

        /// <summary>
        /// Podgląd ruchu walki Cerbera na tablicy atlasu (jak DuszkiDemona.podgladWalki dla demona): stopami w (0, 0),
        /// klatka `t` z `dl` tików ruchu `id`, wszystkie głowy całe, kły trafiają. False — nie ma takiego ruchu.
        /// </summary>
        public static bool podgladWalki(IPlotno ctx, double h, string id, double t, double dl, double czas, double wariant = 1)
        {
            var def = RUCHY_BOSSA[id];
            if (def == null) return false;
            var p = pozaB.Zeruj();
            p.czas = czas;
            p.oddech = 0.5 + 0.5 * Math.Sin(czas * 0.004);
            for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl = 0.12 * Math.Sin(czas * 0.0016 + i * 2.1) - 0.05; g.paszcza = 0.12 + 0.1 * Math.Max(0, Math.Sin(czas * 0.006 + i * 1.7)); }
            zywe[0] = 0; zywe[1] = 1; zywe[2] = 2;
            var d = Math.Max(1, dl > 0 ? dl : def.dl != 0 ? def.dl : 100);
            ruchNaPoze(p, id, obetnij(t / d, 0, 1), def, d, 1, 3, trafionePodglad, wariant);
            rysujCerbera(ctx, h, p);
            return true;
        }

        /// <summary>Poza z ruchu walki `id` w chwili `u` (0…1): kłapnięcia, łapa, dęba, skok, wycie, ogień, bicz, szarża.</summary>
        static void ruchNaPoze(PozaCerbera p, string id, double u, Nastawy.RuchBossa? def, double dl, int glowaNr, int nz, System.Collections.Generic.List<double> zadane, double? wariant, int? glowaRuchu = null)
        {
            {
                double traf(int k) => def?.traf != null && k < def.traf.Length ? def.traf[k][0] / dl : double.NaN;
                var hit = double.IsNaN(traf(0)) ? 0.5 : traf(0);
                bool trafil(int k) => k < zadane.Count && zadane[k] > 0;
                var niska = zywe[nz - 1];
                switch (id)
                {
                    case "zGory":
                        // staje lekko dęba, łeb w górę — i z całej siły paszczą w dół
                        klap(p.glowy[glowaNr], u, hit, trafil(0), 0.35);
                        p.deba = 0.4 * dzwon(u, hit - 0.45, hit + 0.02);
                        p.kleka = 0.35 * dzwon(u, hit - 0.02, hit + 0.25);
                        break;
                    case "zamach":
                        // szarpnięcie łapą: łapa wysoko, łukiem naprzód; głowy warczą, jedna kłapie zaraz po ciosie
                        p.lapa = lapaFaza(u, hit);
                        foreach (var g in p.glowy) { g.paszcza = Math.Max(g.paszcza, 0.55 * dzwon(u, 0.05, 0.95)); g.pochyl -= 0.15 * dzwon(u, 0.1, hit); }
                        klap(p.glowy[glowaNr], u, Math.Min(0.92, hit + 0.12), false);
                        break;
                    case "podciecie":
                        // chwyt za nogi: przysiad, najniższa głowa nisko nad ziemią
                        klap(p.glowy[niska], u, hit, trafil(0), 0.55);
                        p.przysiad = 0.7 * dzwon(u, 0.1, hit + 0.15);
                        break;
                    case "odepchniecie":
                        // uderzenie łbem: skok naprzód, łby z zamkniętymi paszczami w pierś
                        p.skok = 0.7 * dzwon(u, hit - 0.3, hit + 0.12);
                        for (int k = 0; k < nz; k++)
                        {
                            var g = p.glowy[zywe[k]];
                            g.wysun = Math.Max(g.wysun, 0.7 * dzwon(u, hit - 0.25, hit + 0.15)); g.pochyl += 0.35 * dzwon(u, hit - 0.25, hit + 0.1); g.smuga = Math.Max(g.smuga, dzwon(u, hit - 0.1, hit + 0.02));
                        }
                        break;
                    case "przygniecenie":
                        {
                            // łapa na piersi: cios łapą i trzyma rycerza przy ziemi do drugiego trafienia, głowy szarpią przygniecionego
                            var hit2 = double.IsNaN(traf(1)) ? 0.65 : traf(1);
                            p.lapa = u < hit ? lapaFaza(u, hit) : u < hit2 + 0.05 ? 0.56 : 0.56 + 0.44 * gladko((u - hit2 - 0.05) / Math.Max(0.05, 0.95 - hit2));
                            klap(p.glowy[glowaNr], u, hit + 0.08, trafil(0), 0.5);
                            klap(p.glowy[zywe[0]], u, hit2, trafil(1), 0.5);
                            p.przysiad = 0.3 * dzwon(u, hit, hit2 + 0.1);
                            break;
                        }
                    case "podwojnyZamach":
                        klap(p.glowy[niska], u, double.IsNaN(traf(0)) ? 0.37 : traf(0), trafil(0), 0.2);
                        klap(p.glowy[zywe[0]], u, double.IsNaN(traf(1)) ? 0.62 : traf(1), trafil(1), 0.3);
                        break;
                    case "zgniecenie":
                        // trzy paszcze naraz: przysiad i wszystkie łby w jedno miejsce
                        for (int k = 0; k < nz; k++) klap(p.glowy[zywe[k]], u, hit, trafil(0), 0.3 + 0.1 * zywe[k]);
                        p.przysiad = 0.5 * dzwon(u, 0, hit + 0.05);
                        p.skok = 0.35 * dzwon(u, hit - 0.15, hit + 0.1);
                        break;
                    case "tupniecie":
                    case "uderzenieWZiemie":
                        // staje dęba — i całym ciężarem spada na przednie łapy (posadzka drży)
                        p.deba = gladko(u / (hit * 0.85)) * (1 - gladko((u - hit + 0.04) / 0.08));
                        p.kleka = 0.7 * dzwon(u, hit - 0.02, hit + 0.22);
                        p.fala = u > hit ? obetnij((u - hit) / 0.3, 0, 1) : 0;
                        foreach (var g in p.glowy) { g.paszcza = Math.Max(g.paszcza, 0.8 * dzwon(u, 0.1, hit + 0.2)); g.pochyl -= 0.4 * dzwon(u, 0.05, hit); }
                        break;
                    case "wybuchAureoli":
                        // wycie trzech gardeł: kuli się, a potem łby w górę i fala wycia
                        p.przysiad = 0.6 * dzwon(u, 0, hit + 0.02);
                        p.deba = 0.3 * dzwon(u, hit - 0.05, 0.98);
                        p.fala = u > hit ? obetnij((u - hit) / 0.35, 0, 1) : 0;
                        p.szal = Math.Max(p.szal, dzwon(u, hit - 0.1, hit + 0.3));
                        // (etap 6: wyje wilk — pozostałe łby tylko warczą)
                        for (int k = 0; k < 3; k++)
                        {
                            var g = p.glowy[k];
                            var f = glowaRuchu == null || glowaRuchu == k ? 1 : 0.3;
                            g.paszcza = Math.Max(g.paszcza, f * dzwon(u, hit - 0.1, 0.98)); g.pochyl -= f * (0.8 * dzwon(u, hit - 0.1, 0.98) - 0.4 * dzwon(u, 0, hit - 0.1));
                        }
                        break;
                    case "tchnienie":
                        {
                            double od = def?.oddech != null && def.oddech.Length > 1 ? def.oddech[0] : 84, doT = def?.oddech != null && def.oddech.Length > 1 ? def.oddech[1] : 174;
                            p.ogienGlowa = glowaRuchu ?? (zawiera(zywe, nz, 1) ? 1 : zywe[0]);
                            var g = p.glowy[p.ogienGlowa];
                            g.paszcza = Math.Max(g.paszcza, gladko((u - od / dl + 0.15) / 0.15));
                            g.pochyl += 0.15 - 0.35 * dzwon(u, od / dl - 0.2, od / dl);
                            p.ogien = dzwon(u, od / dl - 0.02, doT / dl + 0.05) > 0 ? 1 : 0;
                            p.przysiad = 0.25 * dzwon(u, od / dl - 0.2, doT / dl);
                            for (int i = 0; i < 3; i++) if (i != p.ogienGlowa) p.glowy[i].pochyl -= 0.25;
                            break;
                        }
                    case "biczLancucha":
                        p.bicz = dzwon(u, hit - 0.35, hit + 0.25);
                        foreach (var g in p.glowy) { g.pochyl -= 0.2 * p.bicz; g.paszcza = Math.Max(g.paszcza, 0.4 * p.bicz); }
                        p.przysiad = 0.2 * p.bicz;
                        break;
                    case "szarza":
                        {
                            // przysiad, łby nisko — i skok na rycerza
                            var od = def?.przemieszcza != null && def.przemieszcza.Length > 0 ? def.przemieszcza[0] : 48;
                            p.przysiad = gladko(u / (od / dl)) * (1 - gladko((u - od / dl) / 0.08));
                            if (u > od / dl)
                            {
                                p.skok = dzwon(u, od / dl - 0.02, Math.Min(0.98, od / dl + 0.42));
                                foreach (var g in p.glowy) { g.wysun = 0.6; g.paszcza = 0.9; g.pochyl += 0.2; g.smuga = 0.5 * p.skok; }
                            }
                            break;
                        }
                    case "ryk":
                    case "rozkazRzut":
                    case "rozkazTarcza":
                    case "rozkazZawal":
                        {
                            var w = id == "ryk" ? dzwon(u, 0.1, 0.9) : 0.8;
                            foreach (var g in p.glowy) { g.pochyl -= 0.75 * w; g.paszcza = Math.Max(g.paszcza, w); }
                            p.deba = 0.2 * w;
                            break;
                        }
                    case "blok":
                        // zasłona łapą: przednia łapa w górze przed piersią, łby cofnięte
                        p.lapa = 0.3; p.odrzut = 0.15;
                        foreach (var g in p.glowy) { g.pochyl -= 0.2; g.paszcza = Math.Max(g.paszcza, 0.5); }
                        break;
                    case "zachwianie":
                        if (wariant == 2)
                        {
                            // przypada na przednie łapy (połowa, ćwierć życia, ścięta głowa) — wstaje powoli
                            p.kleka = u < 0.15 ? gladko(u / 0.15) : 1 - gladko((u - 0.62) / 0.38);
                            foreach (var g in p.glowy) { g.pochyl += 0.45 * p.kleka; g.paszcza = Math.Max(g.paszcza, 0.6 * dzwon(u, 0, 0.5)); }
                        }
                        else
                        {
                            p.odrzut = dzwon(u, 0, 0.7);
                            for (int i = 0; i < 3; i++) { var g = p.glowy[i]; g.pochyl += 0.3 * p.odrzut * (i - 1); g.paszcza = Math.Max(g.paszcza, 0.5 * p.odrzut); }
                        }
                        break;
                }
            }
        }
    }
}
