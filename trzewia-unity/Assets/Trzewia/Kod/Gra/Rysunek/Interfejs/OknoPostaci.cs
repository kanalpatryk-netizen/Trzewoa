// Port: alpha-1/src/render/okno-postaci.ts — okno postaci (Alpha 1): po zaznaczeniu postaci (albo grupy) w lewym dolnym
// rogu płyty staje kamienna tablica — imię (albo „Robotnicy”, „Oddział”) i role, portret w złotej niszy z paskami życia
// i sytości, zamiarem i stanami (dla grupy — wszyscy w jednej niszy), a pod spodem „możliwości”: Cud, Módl się,
// Do ołtarza, Kop drogę wiernych, praca w warsztacie i kuźni, zbroja, sen, naprawa liny. Zwraca pola do kliknięcia.
// Nazwy jednoliterowe jak w źródle.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyBarwy;
using static Trzewia.Nastawy.NastawyLoch;
using SLud = Trzewia.Symulacja.Lud;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Jedna możliwość w oknie: kto (`ids`), czy teraz da się (`ok`, inaczej `powod`), koszt, czy pilne (miga czerwienią).</summary>
    public sealed class Mozliwosc
    {
        /// <summary>'naprawa' | 'cud' | 'modl' | 'przerwij' | 'oltarz' | 'kociol' | 'zaInnych' | 'droga' | 'warsztat' | 'kuznia' | 'zbroja' | 'sen'</summary>
        public string akcja = "", nazwa = "", opis = "";
        public List<double> ids = new List<double>();
        public bool ok;
        public string? powod, koszt;
        public bool pilne;
    }

    /// <summary>Pole okna do kliknięcia: akcja możliwości, 'tlo' albo 'zamknij'.</summary>
    public sealed class PoleOkna { public string akcja = ""; public double x, y, w, h; }

    public static class OknoPostaci
    {
        /// <summary>Odmiana nazwy roli: 1 robotnik, 2 robotników… (jedna, dopełniacz, mnoga).</summary>
        static readonly Dictionary<string, (string g, string B, string C)> ODMIANA_ROLI_ALFA = new Dictionary<string, (string, string, string)>
        {
            ["robotnik"] = ("robotnik", "robotników", "robotnicy"), ["pobozny"] = ("pobożny", "pobożnych", "pobożni"), ["rycerz"] = ("rycerz", "rycerzy", "rycerze"),
        };
        /// <summary>Krąg Trzeci: grabarze i mnisi zamiast robotników i pobożnych.</summary>
        static readonly Dictionary<string, (string g, string B, string C)> ODMIANA_ROLI_KREGU = new Dictionary<string, (string, string, string)>
        {
            ["robotnik"] = ("grabarz", "grabarzy", "grabarze"), ["pobozny"] = ("mnich", "mnichów", "mnisi"), ["rycerz"] = ("rycerz", "rycerzy", "rycerze"),
        };
        static Dictionary<string, (string g, string B, string C)> ODMIANA_ROLI => Krag.Wlaczony ? ODMIANA_ROLI_KREGU : ODMIANA_ROLI_ALFA;
        static string liczebnik(double A, string M)
        {
            var (g, B, C) = ODMIANA_ROLI[M]; double o = A % 10, E = A % 100;
            return $"{Js.Js.S(A)} {(A == 1 ? g : o >= 2 && o <= 4 && (E < 12 || E > 14) ? C : B)}";
        }

        /// <summary>Co zaznaczeni mogą teraz zrobić — lista do okna postaci.</summary>
        public static List<Mozliwosc> mozliwosciPostaci(Sim A, List<Creature> M)
        {
            List<Creature> g(string Y) => M.Where(i => SLud.rolaPostaci(i) == Y).ToList();
            var B = g("robotnik"); var C = g("pobozny"); var o = g("rycerz");
            List<double> E(IEnumerable<Creature> Y) => Y.Select(i => i.id).ToList();
            var Q = new List<Mozliwosc>();
            Pomieszczenie? I(string Y) => A.pomieszczenia.FirstOrDefault(i => i.gotowe && i.rodzaj == Y);
            if (LinaWiadra.linaPrzecieta(A) != null && M.Count > 0)
            {
                var Y = LinaWiadra.sklejajacy(A);
                Q.Add(new Mozliwosc { akcja = "naprawa", nazwa = "Napraw linę wiadra", opis = "idzie do przeciętej liny, wspina się i ją skleja — bez niej nic nie zjedzie", ids = E(M), ok = Y == null, powod = "już ktoś ją skleja", pilne = Y == null });
            }
            if (C.Count > 0)
            {
                var Y = Moce.cost("znak", "objawienie");
                Q.Add(new Mozliwosc { akcja = "cud", nazwa = "Cud", opis = "światło z góry wokół pobożnego — wszyscy dookoła widzą cud, oddanie rośnie, a dłoń z otchłani ucieka", ids = E(C.Take(1)), ok = Moce.affordable(A, "znak", "objawienie"), powod = $"trzeba {Js.Js.S(Y.wiara)} wiary", koszt = $"{Js.Js.S(Y.wiara)} wiary" });
                var i = C.Where(h => !Moce.modliSie(h)).ToList(); var w = Moce.cost("szept", "modl");
                if (i.Count > 0) Q.Add(new Mozliwosc { akcja = "modl", nazwa = "Módl się", opis = "szept: idzie do krypty i modli się pod pomnikiem — kruszy go", ids = E(i), ok = Moce.affordable(A, "szept", "modl"), powod = $"trzeba {Js.Js.S(w.wiara)} wiary", koszt = $"{Js.Js.S(w.wiara)} wiary" });
                var G = C.Where(h => Moce.modliSie(h)).ToList();
                if (G.Count > 0) Q.Add(new Mozliwosc { akcja = "przerwij", nazwa = "Przerwij modlitwę", opis = "wraca do swoich i przez minutę nie idzie się modlić", ids = E(G), ok = true });
                Q.Add(new Mozliwosc { akcja = "oltarz", nazwa = "Do ołtarza", opis = "idzie do ołtarza w sali i otwiera okno rytuałów (płacisz krwią)", ids = E(C), ok = true });
                Q.AddRange(mozliwosciPoboznych6_11(A, C));
            }
            if (B.Count > 0)
            {
                var Y = Pielgrzymka.czoloDrogi(A);
                var i = A.rytual.otwarta ? "pomnik już otwarty" : A.planDrogi != null ? "droga wiernych jest już wykopana" : "droga jeszcze się wyznacza — chwila";
                // 6.11: szyb wykopany, schody w budowie (sim/budowa-schodow.ts) — ten sam rozkaz posyła do budowy schodów
                var bud = Y < 0 && !A.rytual.otwarta && BudowaSchodow.trwaBudowaSchodow(A);
                Q.Add(bud ? new Mozliwosc { akcja = "droga", nazwa = "Buduj schody drogi wiernych", opis = "szyb jest wykopany — od dołu osadzają w nim kamienne stopnie: dwóch murarzy na rusztowaniu, jeden kręci kołowrotem, który opuszcza im stopnie", ids = E(B), ok = true }
                    : new Mozliwosc { akcja = "droga", nazwa = "Kop drogę wiernych", opis = "kopią drogę wiernych: szyb od wnęki przy sali w dół do starej komnaty z kotłem, a z niej drugi szyb w dół, na przedproże lochu; schody stawia się w wykopanym szybie, od dołu", ids = E(B), ok = Y >= 0, powod = i });
                if (I("warsztat") != null) Q.Add(new Mozliwosc { akcja = "warsztat", nazwa = "Pracuj w warsztacie", opis = "ze złota robią krzyże — każdy staje się wiarą", ids = E(B), ok = A.zloto > 0, powod = "nie ma złota" });
                if (I("kuznia") != null) Q.Add(new Mozliwosc { akcja = "kuznia", nazwa = "Pracuj w kuźni", opis = "z żelaza wykuwają części zbroi rycerza", ids = E(B), ok = A.zelazo > 0, powod = "nie ma żelaza" });
            }
            if (o.Count > 0 && I("kuznia") != null)
            {
                var Y = Zbroja.naWieszaku(A).Count;
                Q.Add(new Mozliwosc { akcja = "zbroja", nazwa = "Załóż zbroję", opis = "idzie do kuźni, zdejmuje część z wieszaka i ją zakłada", ids = E(o), ok = Y > 0, powod = "na wieszaku nic nie wisi", koszt = Y > 0 ? $"{Y} na wieszaku" : null });
            }
            if (I("sypialnia") != null) Q.Add(new Mozliwosc { akcja = "sen", nazwa = "Idź spać", opis = "sen w sypialni zdejmuje osłabienia (ok. minuty)", ids = E(M), ok = true });
            return Q;
        }

        /// <summary>
        /// 6.11: „Do kotła — podnieś bramę” (zaklinanie przy kotle w starej komnacie; dwóch naraz podnosi stalową bramę lochu)
        /// i „Módl się za innych” (zostaje i modli się za tych wokół — leczy ich i błogosławi).
        /// </summary>
        static List<Mozliwosc> mozliwosciPoboznych6_11(Sim sim, List<Creature> pobozni)
        {
            var @out = new List<Mozliwosc>();
            var w = sim.world;
            if (w.komnata.x1 >= w.komnata.x0 && !Pomnik.pomnikRozbity(sim))
            {
                var s1 = w.odcinkiDrogi.Count > 0 ? w.odcinkiDrogi[0] : null;
                // komnata z kotłem dostępna, gdy pierwszy odcinek drogi wiernych jest wykuty do jej sklepienia
                var wykuty = s1 != null;
                if (s1 != null) for (var y = w.salaOltarza.y1 + 1; y < w.komnata.y0 && wykuty; y++) if (w.solid((Js.Js.ToInt32(s1.x0) + Js.Js.ToInt32(s1.x1)) >> 1, y)) wykuty = false;
                var zaklina = pobozni.Where(c => c.polecenie?.zaklinaj == true).ToList();
                var b = Brama.stanBramy(sim);
                var ile = Math.Floor(b.otwarcie * 100 + 0.5);
                if (zaklina.Count == 0 || zaklina.Count < pobozni.Count)
                {
                    var reszta = pobozni.Where(c => c.polecenie?.zaklinaj != true).ToList();
                    @out.Add(new Mozliwosc
                    {
                        akcja = "kociol", nazwa = "Do kotła — podnieś bramę",
                        opis = $"idą do kotła w starej komnacie i rzucają zaklęcia; dwóch naraz podnosi stalową bramę lochu (40 s do pełna), a gdy przestaną — brama powoli opada{(ile != 0 ? $" (teraz otwarta w {Js.Js.S(ile)}%)" : "")}",
                        ids = reszta.Select(c => c.id).ToList(), ok = wykuty, powod = "droga wiernych nie sięga jeszcze komnaty z kotłem",
                        koszt = reszta.Count + b.zaklina < BRAMA.potrzeba ? $"potrzeba {Js.Js.S(BRAMA.potrzeba)}" : null,
                    });
                }
            }
            var nieModla = pobozni.Where(c => c.polecenie?.zaInnych != true).ToList();
            if (nieModla.Count > 0) @out.Add(new Mozliwosc
            {
                akcja = "zaInnych", nazwa = "Módl się za innych",
                opis = $"zostaje, gdzie stoi, i modli się za tych wokół ({Js.Js.S(BLOGOSLAWIENSTWO.promien)} kafli): rany się goją, rycerz bije mocniej i szybciej chodzi, {Krag.T("robotnik szybciej kopie, pobożny mocniej się modli", "grabarz szybciej kopie, mnich mocniej się modli")}",
                ids = nieModla.Select(c => c.id).ToList(), ok = true,
            });
            return @out;
        }

        /// <summary>Kopie postaci do portretu (stoją, patrzą w bok, bez ładunku) — żeby nie ruszać tych na mapie.</summary>
        static readonly Dictionary<double, Creature> kopie = new Dictionary<double, Creature>();
        static Creature kopiaDoOkna(Creature A, double M)
        {
            if (!kopie.TryGetValue(A.id, out var g)) { g = A.Kopia(); kopie[A.id] = g; }
            Druzyna.przepisz(g, A);
            g.x = 0; g.y = 0; g.vy = 0; g.face = M; g.carry = 0; g.fear = 0; g.mad = 0; g.job = Job.STOI;
            g.odmowa = null; g.naLinie = null; g.naWiadrze = null; g.wspina = null; g.ksiegaT = null;
            if (kopie.Count > 40) kopie.Clear();
            return g;
        }

        static void pasek(IPlotno ctx, double M, double g, double B, double C, Styl o, string E, double Q)
        {
            ctx.save(); ctx.font = $"italic {Js.Js.S(Q)}px {Ink.SERIF}"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "rgba(214,196,160,0.85)"; ctx.fillText(E, M, g);
            double I = g + Q * 0.4, Y = Math.Max(5, Q * 0.45);
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(M, I, B, Y, Y / 2); ctx.fill();
            ctx.fillStyle = o; ctx.beginPath(); ctx.roundRect(M, I, Math.Max(Y, B * Math.Max(0, Math.Min(1, C))), Y, Y / 2); ctx.fill();
            ctx.strokeStyle = "rgba(204,160,92,0.5)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.roundRect(M, I, B, Y, Y / 2); ctx.stroke(); ctx.restore();
        }

        static readonly Regex OSTATNIE_SLOWO = new Regex(@"\s*\S*$");
        static List<string> lamLinie(IPlotno ctx, string M, double g, int B)
        {
            var C = new List<string>();
            var o = "";
            foreach (var E in M.Split(' '))
            {
                var Q = o != "" ? $"{o} {E}" : E;
                if (ctx.measureText(Q).width > g && o != "") { C.Add(o); o = E; } else o = Q;
            }
            if (o != "") C.Add(o);
            if (C.Count > B) { C.RemoveRange(B, C.Count - B); C[B - 1] = OSTATNIE_SLOWO.Replace(C[B - 1], "", 1) + "…"; }
            return C;
        }

        /// <summary>Miejsca w niszy grupowej: x (część szerokości), rząd (0 — z przodu), skala.</summary>
        static readonly (double x, double st, double s)[] MIEJSCA_W_NISZY = { (0, 0, 1), (-0.27, 1, 0.92), (0.27, 1, 0.92), (-0.47, 2, 0.84), (0.47, 2, 0.84), (-0.14, 2, 0.8), (0.15, 2, 0.8) };
        static readonly Dictionary<string, int> KOLEJNOSC_ROLI = new Dictionary<string, int> { ["rycerz"] = 0, ["pobozny"] = 1, ["robotnik"] = 2 };

        static (Path2D sciezka, (double cx, double cy, double R, double a0, double a1) luk) lukNiszy(double A, double M, double g, double B)
        {
            var C = Math.Min(B * 0.3, g * 0.16); var o = (Math.Pow(g / 2, 2) + C * C) / (2 * C); double E = A + g / 2, Q = M + o, I = Math.Asin(g / 2 / o); var Y = new Path2D();
            // Math.asin: JsMath nie ma asin — wynik .NET (różnica co najwyżej w ostatnim bicie)
            Y.moveTo(A, M + B); Y.lineTo(A, M + C); Y.arc(E, Q, o, -Math.PI / 2 - I, -Math.PI / 2 + I); Y.lineTo(A + g, M + B); Y.closePath();
            return (Y, (E, Q, o, -Math.PI / 2 - I, -Math.PI / 2 + I));
        }

        /// <summary>Cały oddział w jednej złotej niszy, rzędami (rycerz z przodu), z „+N”, gdy się nie mieszczą.</summary>
        static void grupaWNiszy(IPlotno ctx, Sim M, List<Creature> g, double B, double C, double o, double E, double Q)
        {
            var (I, Y) = lukNiszy(B, C, o, E);
            ctx.save(); Fresk.pigment(ctx, I, FRESK.zloto, 0.9, "zloto");
            var i = 0.5 + 0.5 * JsM.Sin(Q * 13e-4); var w = ctx.createRadialGradient(B + o * (0.4 + 0.2 * i), C + E * 0.35, 1, B + o / 2, C + E * 0.5, o * 0.6);
            w.addColorStop(0, "rgba(255,236,170,0.36)"); w.addColorStop(1, "rgba(60,30,8,0.42)"); ctx.fillStyle = w; ctx.fill(I); ctx.clip(I);
            double G = C + E - 9, h = E * 0.085;
            for (int K = 2; K >= 1; K--)
            {
                double S = G - K * h, J = o * (K == 2 ? 0.98 : 0.8), m = B + (o - J) / 2;
                ctx.fillStyle = K == 2 ? "rgba(92,62,36,0.85)" : "rgba(110,76,44,0.9)"; ctx.fillRect(m, S, J, G - S + 9); ctx.fillStyle = "rgba(255,226,170,0.28)"; ctx.fillRect(m, S, J, 1.5); ctx.fillStyle = "rgba(30,14,4,0.25)"; ctx.fillRect(m, S + h * 0.55, J, h * 0.45);
            }
            ctx.fillStyle = "rgba(46,24,10,0.6)"; ctx.fillRect(B, G, o, 9);
            var a = ctx.createRadialGradient(B + o / 2, G - E * 0.5, 4, B + o / 2, G - E * 0.5, E * 0.75);
            a.addColorStop(0, "rgba(255,244,200,0.4)"); a.addColorStop(1, "rgba(255,240,190,0)"); ctx.fillStyle = a; ctx.fillRect(B, C, o, E);
            var k = g.OrderBy(K => KOLEJNOSC_ROLI[SLud.rolaPostaci(K)!]).ThenBy(K => K.id).Take(MIEJSCA_W_NISZY.Length).ToList();
            double D = E * 0.66, l = Math.Min(o * 0.92, D * 2.1);
            var U = k.Select((K, S) => (c: K, m: MIEJSCA_W_NISZY[S])).OrderByDescending(K => K.m.st).ThenByDescending(K => Math.Abs(K.m.x)).ToList();
            foreach (var (K, S) in U)
            {
                double J = B + o / 2 + S.x * l, m = G - S.st * h;
                ctx.fillStyle = "rgba(30,14,4,0.38)"; ctx.beginPath(); ctx.ellipse(J, m, D * S.s * 0.2, D * S.s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
                ctx.save(); ctx.translate(J, m); Figury.rysujPostac(ctx, M, kopiaDoOkna(K, S.x > 0.01 ? -1 : 1), D * S.s, Q + K.id * 131, "stoi"); ctx.restore();
            }
            ctx.restore(); ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = FRESK.czerwien; ctx.stroke(I); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(227,214,182,0.7)"; ctx.stroke(I); ctx.fillStyle = "rgba(236,224,196,0.9)";
            for (int K = 1; K < 14; K++)
            {
                var S = Y.a0 + (Y.a1 - Y.a0) * (K / 14.0);
                ctx.beginPath(); ctx.arc(Y.cx + JsM.Cos(S) * (Y.R - 6), Y.cy + JsM.Sin(S) * (Y.R - 6), 1.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            if (g.Count > MIEJSCA_W_NISZY.Length)
            {
                ctx.save(); ctx.font = $"600 {Js.Js.S(Math.Max(13, E * 0.13))}px {Ink.SERIF_TYTUL}"; ctx.textAlign = "right"; ctx.fillStyle = "rgba(40,20,6,0.9)";
                ctx.fillText($"+{g.Count - MIEJSCA_W_NISZY.Length}", B + o - 10, C + E - 12); ctx.restore();
            }
        }

        static Styl barwaRoli(string r, double a) { var b = Druzyna.BARWA_ROLI[r]; return Barwa.Rgba(b.r, b.g, b.b, a); }

        public static List<PoleOkna> rysujOknoPostaci(IPlotno ctx, Sim M, Plate g, List<Creature> B, (double x, double y) kursor, double czas)
        {
            if (B.Count == 0) return new List<PoleOkna>();
            var o = new List<PoleOkna>(); var E = B.Count == 1 ? B[0] : null; var Q = mozliwosciPostaci(M, B);
            double I = Math.Floor((E != null ? Math.Max(300, Math.Min(360, g.w * 0.3)) : Math.Max(360, Math.Min(440, g.w * 0.36))) + 0.5), Y = 14, i = Math.Max(12, Math.Min(15, I * 0.042)), w = i * 3.1;
            double G = E != null ? Math.Min(150, g.h * 0.26) : Math.Min(150, g.h * 0.27), h = 2, a = Math.Max(32, i * 2.5), k = 6, D = Math.Ceiling(Q.Count / h), l = i * 2.7;
            double U = Math.Floor(Y + w + G + 10 + i * 1.6 + Math.Max(1, D) * (a + k) + l + Y * 0.4 + 0.5), K = g.x + 12, S = Math.Max(g.y + 12, g.y + g.h - U - 12);
            bool J(Obszar N) => kursor.x >= N.x && kursor.x <= N.x + N.w && kursor.y >= N.y && kursor.y <= N.y + N.h;
            Panele.panelKamien(ctx, K, S, I, U, 10); o.Add(new PoleOkna { akcja = "tlo", x = K, y = S, w = I, h = U }); ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            var m = E != null ? SLud.rolaPostaci(E) : null; var s = new HashSet<string?>(B.Select(N => SLud.rolaPostaci(N)));
            var R = E == null && s.Count == 1 ? SLud.rolaPostaci(B[0]) : null;
            var V = E != null ? Overlay.creatureName(E) : R != null ? SLud.NAZWA_ROLI_MNOGA[R].Substring(0, 1).ToUpperInvariant() + SLud.NAZWA_ROLI_MNOGA[R].Substring(1) : "Oddział";
            ctx.font = $"600 {Js.Js.S(i * 1.6)}px {Ink.SERIF_TYTUL}"; ctx.fillStyle = "rgba(250,228,174,1)"; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 3; ctx.fillText(V, K + Y, S + Y + i * 1.25, I - Y * 2 - 30); ctx.shadowBlur = 0; ctx.font = $"{Js.Js.S(i * 0.85)}px {Ink.SERIF}";
            if (E != null && m != null) { ctx.fillStyle = barwaRoli(m, 0.95); ctx.fillText(string.Join(" ", SLud.NAZWA_ROLI[m].ToUpperInvariant().ToCharArray()), K + Y, S + Y + i * 2.55); }
            else
            {
                var N = new[] { "rycerz", "pobozny", "robotnik" }.Select(d => (r: d, n: B.Count(x => SLud.rolaPostaci(x) == d))).Where(d => d.n > 0).ToList();
                var z = K + Y;
                for (int di = 0; di < N.Count; di++)
                {
                    var d = N[di]; var t = liczebnik(d.n, d.r);
                    ctx.fillStyle = barwaRoli(d.r, 0.95); ctx.fillText(t, z, S + Y + i * 2.55); z += ctx.measureText(t).width;
                    if (di != N.Count - 1) { ctx.fillStyle = "rgba(204,160,92,0.7)"; ctx.fillText("  ·  ", z, S + Y + i * 2.55); z += ctx.measureText("  ·  ").width; }
                }
            }
            double q = K + I - Y - 12, F = S + Y + 4; var yy = Math.Sqrt(Math.Pow(kursor.x - q, 2) + Math.Pow(kursor.y - F, 2)) < 12;
            ctx.strokeStyle = yy ? "rgba(255,220,160,1)" : "rgba(204,170,120,0.7)"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(q - 5, F - 5); ctx.lineTo(q + 5, F + 5); ctx.moveTo(q + 5, F - 5); ctx.lineTo(q - 5, F + 5); ctx.stroke();
            o.Add(new PoleOkna { akcja = "zamknij", x = q - 12, y = F - 12, w = 24, h = 24 }); ctx.restore();
            var Z = S + Y + w;
            if (E != null)
            {
                double N = Math.Floor(G * 0.72 + 0.5), z = G, d = K + Y; var nisza = Freski.zlotaNisza(ctx, d, Z, N, z, czas);
                ctx.save(); ctx.clip(nisza);
                var YA = ctx.createLinearGradient(0, Z + z * 0.8, 0, Z + z);
                YA.addColorStop(0, "rgba(60,30,10,0)"); YA.addColorStop(1, "rgba(60,30,10,0.45)"); ctx.fillStyle = YA; ctx.fillRect(d, Z, N, z);
                ctx.fillStyle = "rgba(30,14,4,0.35)"; ctx.beginPath(); ctx.ellipse(d + N / 2, Z + z - 7, N * 0.3, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.translate(d + N / 2, Z + z - 7); Figury.rysujPostac(ctx, M, kopiaDoOkna(E, 1), z * 0.66, czas); ctx.restore(); Freski.brzegNiszy(ctx, nisza, d, Z, N);
                double EA = d + N + 14, KA = K + I - Y - EA;
                pasek(ctx, EA, Z + i * 1, KA, E.hp / SLud.maxHp(M, E), "rgba(196,58,40,0.95)", "życie", i * 0.85);
                pasek(ctx, EA, Z + i * 3, KA, 1 - E.hunger, "rgba(150,170,80,0.95)", E.hunger > 0.6 ? "sytość — głodny!" : "sytość", i * 0.85);
                ctx.save(); ctx.font = $"italic {Js.Js.S(i * 0.92)}px {Ink.SERIF}"; ctx.fillStyle = "rgba(232,214,180,0.95)"; ctx.textAlign = "left";
                var qA = !string.IsNullOrEmpty(E.zamiar) ? $"Teraz: {E.zamiar}." : "Czeka."; var GA = lamLinie(ctx, qA, KA, 2);
                for (int vA = 0; vA < GA.Count; vA++) ctx.fillText(GA[vA], EA, Z + i * 5.4 + vA * i * 1.15);
                var PA = SLud.stanyPostaci(M, E).Take(2).ToList();
                ctx.font = $"{Js.Js.S(i * 0.82)}px {Ink.SERIF}";
                for (int vA = 0; vA < PA.Count; vA++)
                {
                    var aA = PA[vA];
                    ctx.fillStyle = aA.uspiony == true ? "rgba(190,180,160,0.85)" : aA.dobry ? "rgba(250,226,150,0.98)" : "rgba(236,112,96,0.98)";
                    ctx.fillText($"• {aA.nazwa}", EA, Z + i * (5.6 + GA.Count * 1.15) + vA * i * 1.1, KA);
                }
                ctx.restore();
            }
            else grupaWNiszy(ctx, M, B, K + Y, Z, I - Y * 2, G, czas);
            var p = Z + G + 10;
            ctx.save(); ctx.font = $"{Js.Js.S(i * 0.72)}px {Ink.SERIF}"; ctx.textAlign = "center";
            const string c = "M O Ż L I W O Ś C I"; var tt = ctx.measureText(c).width;
            ctx.strokeStyle = "rgba(204,160,92,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(K + Y, p + i * 0.55); ctx.lineTo(K + I / 2 - tt / 2 - 8, p + i * 0.55); ctx.moveTo(K + I / 2 + tt / 2 + 8, p + i * 0.55); ctx.lineTo(K + I - Y, p + i * 0.55); ctx.stroke();
            ctx.fillStyle = "rgba(224,168,96,0.85)"; ctx.fillText(c, K + I / 2, p + i * 0.8); ctx.restore();
            double j = p + i * 1.6, e = (I - Y * 2 - k) / h;
            Mozliwosc? n = null;
            if (Q.Count == 0)
            {
                ctx.save(); ctx.font = $"italic {Js.Js.S(i * 0.9)}px {Ink.SERIF}"; ctx.fillStyle = "rgba(200,184,150,0.8)"; ctx.textAlign = "center";
                ctx.fillText("nic szczególnego — wskaż na mapie, dokąd ma iść", K + I / 2, j + a * 0.6); ctx.restore();
            }
            for (int z = 0; z < Q.Count; z++)
            {
                var N = Q[z];
                var d = new Obszar(K + Y + z % h * (e + k), j + Math.Floor(z / h) * (a + k), e, a); var dd = J(d);
                if (dd) n = N;
                ctx.save();
                if (N.pilne)
                {
                    var A2 = Nastroj.wolnoRuszac() ? 0.5 + 0.5 * JsM.Sin(czas * 6e-3) : 0.7;
                    ctx.shadowColor = Barwa.Rgba(230, 60, 40, 0.5 + 0.4 * A2); ctx.shadowBlur = 8 + 8 * A2;
                }
                ctx.beginPath(); ctx.roundRect(d.x, d.y, d.w, d.h, 5);
                var YA = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
                YA.addColorStop(0, "#090706"); YA.addColorStop(1, "#17120e"); ctx.fillStyle = YA; ctx.fill(); ctx.shadowBlur = 0;
                if (dd && N.ok)
                {
                    ctx.save(); ctx.clip();
                    var A3 = ctx.createRadialGradient(d.x + d.w * 0.3, d.y + d.h * 1.1, 2, d.x + d.w * 0.3, d.y + d.h, d.w * 0.7);
                    A3.addColorStop(0, "rgba(255,160,70,0.3)"); A3.addColorStop(1, "rgba(255,160,70,0)"); ctx.fillStyle = A3; ctx.fillRect(d.x, d.y, d.w, d.h); ctx.restore();
                }
                ctx.strokeStyle = N.pilne ? "rgba(210,80,60,0.9)" : dd && N.ok ? "rgba(222,206,172,0.6)" : "rgba(222,206,172,0.16)"; ctx.lineWidth = 1; ctx.stroke();
                double EA = d.h * 0.42, KA = d.x + 6 + EA, qA = d.y + d.h / 2;
                IkonyHud.ikonaMozliwosci(ctx, N.akcja, KA, qA, EA * 1.9, czas, N.ok ? dd ? 1 : 0.75 : 0.3);
                double GA = KA + EA + 7, PA = d.x + d.w - GA - 5;
                ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = $"{Js.Js.S(i * 0.95)}px {Ink.SERIF}"; ctx.fillStyle = N.ok ? "rgba(244,230,200,0.98)" : "rgba(170,156,134,0.7)"; ctx.fillText(N.nazwa, GA, d.y + d.h * 0.47, PA);
                string kto = "";
                if (E == null)
                {
                    var A4 = SLud.rolaPostaci(M.creatureById(N.ids[0])!); var gM = N.ids.Count == B.Count;
                    kto = N.akcja == "cud" ? "przy pierwszym pobożnym" : gM ? "wszyscy" : A4 != null ? liczebnik(N.ids.Count, A4) : "";
                }
                var vA = string.Join(" · ", new[] { kto, N.koszt }.Where(x => !string.IsNullOrEmpty(x)));
                if (vA != "")
                {
                    ctx.font = $"italic {Js.Js.S(i * 0.76)}px {Ink.SERIF}"; ctx.fillStyle = N.ok ? "rgba(214,180,120,0.9)" : "rgba(150,130,110,0.6)"; ctx.fillText(vA, GA, d.y + d.h * 0.82, PA);
                }
                ctx.restore(); o.Add(new PoleOkna { akcja = N.akcja, x = d.x, y = d.y, w = d.w, h = d.h });
            }
            var T = j + Math.Max(1, D) * (a + k) + i * 0.4;
            ctx.save(); ctx.textAlign = "left"; ctx.font = $"italic {Js.Js.S(i * 0.82)}px {Ink.SERIF}";
            var x = n; var L = x != null ? x.ok ? x.opis : $"teraz nie: {x.powod ?? ""}" : "dotknij mapy — idą tam (w skałę: kopią) · prawy przycisk — odznacz";
            ctx.fillStyle = x != null && !x.ok ? "rgba(236,128,100,0.95)" : x != null ? "rgba(240,222,180,0.95)" : "rgba(190,172,140,0.75)";
            var ll = lamLinie(ctx, L, I - Y * 2, 2);
            for (int z = 0; z < ll.Count; z++) ctx.fillText(ll[z], K + Y, T + i * 0.9 + z * i * 1.1);
            ctx.restore();
            return o;
        }
    }
}
