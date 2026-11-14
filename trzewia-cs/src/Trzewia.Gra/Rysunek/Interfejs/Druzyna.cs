// Port: alpha-1/src/render/druzyna.ts — to, co gracz widzi przy sterowaniu ludem na komputerze: złoty pierścień pod
// stopami zaznaczonych, znaczniki celów rozkazów (proporczyk „idź tam”, kilof „kop tam”, strzałki nad czołem drogi
// wiernych), fala w miejscu wydania rozkazu (odmowa — czerwony krzyżyk) i ramka ciągnięta myszą.
// Pominięte (tylko telefon, decyzja 9.11): rysujDruzyne — pasek medalionów i pigułek rozkazów pod płytą, listwa szablonów
// pod nim (na komputerze Alpha 1 to robią księga i „Budowa”, render/ksiega.ts i render/budowa.ts).
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Trzewia.Plotna;
using Trzewia.Symulacja;
using Rozstep = Trzewia.Rysunek.Lud.Rozstep;
using SLud = Trzewia.Symulacja.Lud;
using static Trzewia.Nastawy.NastawyPolecenia;
using JsM = Trzewia.Js.JsMath;

namespace Trzewia.Rysunek
{
    /// <summary>Pole do dotknięcia na pasku drużyny (game.ts trzyma listę, na komputerze zawsze pustą).</summary>
    public sealed class PoleDruzyny
    {
        /// <summary>'rola' | 'droga' | 'odwolaj' | 'odznacz' | 'pomieszczenia' | 'szablon' | 'koniecSzablonu' | 'naprawa'</summary>
        public string akcja = "";
        public string? rola, szablon;
        public double x, y, w, h;
    }

    /// <summary>Fala w miejscu wydania rozkazu (zegar ekranu): złota — przyjęli, czerwona — odmówili.</summary>
    public sealed class FalaRozkazu { public double x, y, t; public bool ok; }

    /// <summary>Co zrobi puszczona ramka — liczone na bieżąco przy ciągnięciu.</summary>
    public sealed class PodgladRamki
    {
        /// <summary>'kop' — oznaczy skałę (kafle `kop`); 'lud' — zaznaczy postacie; 'nic' — nic do zrobienia.</summary>
        public string tryb = "nic";
        /// <summary>Kafle do wykucia (indeksy świata, wierszami).</summary>
        public IReadOnlyList<double> kop = Array.Empty<double>();
        /// <summary>Ile postaci zaznaczy.</summary>
        public int lud;
    }

    /// <summary>Ramka ciągnięta myszą: rogi w świecie i chwila rozpoczęcia (zegar ekranu).</summary>
    public sealed class Ramka { public double x0, y0, x1, y1, od; }

    public static class Druzyna
    {
        /// <summary>Kolejność medalionów pod płytą.</summary>
        public static readonly string[] ROLE_DRUZYNY = { "robotnik", "pobozny", "rycerz" };

        /// <summary>Barwy ról: biel wapienna pobożnych, ugier robotników, błękit rycerzy.</summary>
        public static readonly Dictionary<string, (double r, double g, double b)> BARWA_ROLI = new Dictionary<string, (double, double, double)>
        {
            ["pobozny"] = (246, 228, 176), ["robotnik"] = (214, 166, 104), ["rycerz"] = (168, 190, 226),
        };

        /// <summary>Ile trwa czerwony krzyżyk odmowy (ms).</summary>
        const double KRZYZYK_MS = 900;

        static Styl rgba((double r, double g, double b) k, double a) => Barwa.Rgba(k.r, k.g, k.b, a);

        /// <summary>Żywi z ludu w tej roli.</summary>
        public static List<Creature> ludRoli(Sim sim, string rola) => sim.creatures.Where(c => !c.dead && SLud.rolaPostaci(c) == rola).ToList();

        // Miniatury w medalionach rysujemy z zastępcy postaci — własna pamięć ruchu i pozy, żeby rysunek
        // w medalionie nie mieszał się z animacją tej samej postaci na mapie.
        static readonly Dictionary<string, Creature> zastepcy = new Dictionary<string, Creature>();
        static readonly FieldInfo[] POLA_POSTACI = typeof(Creature).GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);

        public static Creature zastepca(string rola, Creature wzor)
        {
            if (!zastepcy.TryGetValue(rola, out var z)) { z = wzor.Kopia(); zastepcy[rola] = z; }
            // Object.assign(z, wzor, …): wszystkie pola wzoru na zastępcę (płytko), zastępca zostaje tym samym obiektem
            foreach (var f in POLA_POSTACI) f.SetValue(z, f.GetValue(wzor));
            z.x = 0; z.y = 0; z.vy = 0; z.face = 1; z.carry = 0; z.fear = 0; z.mad = 0; z.job = Job.STOI;
            z.odmowa = null; z.naLinie = null; z.naWiadrze = null; z.wspina = null; z.ksiegaT = null;
            return z;
        }

        /// <summary>Złoty pierścień pod stopami zaznaczonych (rysowany przed postaciami — leży na ziemi).</summary>
        public static void rysujZaznaczenie(IPlotno ctx, Sim sim, Camera cam, double czas, IReadOnlyCollection<double> zaznaczeni)
        {
            if (zaznaczeni.Count == 0) return;
            // pierścień leży pod postacią tam, gdzie ją widać (rozstęp tłumu przesuwa rysunek, nie symulację)
            Rozstep.rozstawTlum(sim, cam, czas, Figury.wysokoscPostaci);
            ctx.save();
            foreach (var c in sim.creatures)
            {
                if (c.dead || !zaznaczeni.Contains(c.id)) continue;
                double sx = cam.toScreenX(c.x + Rozstep.przesuniecieX(c)), sy = cam.toScreenY(c.y + 1);
                if (sx < -40 || sy < -40 || sx > cam.vw + 40 || sy > cam.vh + 80) continue;
                var h = Figury.wysokoscPostaci(c, cam.zoom);
                var puls = Nastroj.wolnoRuszac() ? 0.5 + 0.5 * JsM.Sin(czas * 0.005 + c.id) : 1;
                double rx = Math.Max(9, h * 0.42), ry = Math.Max(3, h * 0.12);
                ctx.shadowColor = "rgba(246,206,120,0.9)"; ctx.shadowBlur = 6 + 6 * puls;
                ctx.strokeStyle = Barwa.Rgba(246, 216, 142, 0.7 + 0.3 * puls);
                ctx.lineWidth = Math.Max(1.6, h * 0.05);
                ctx.setLineDash(Math.Max(4, rx * 0.5), Math.Max(3, rx * 0.22));
                ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -czas * 0.02 : 0;
                ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash();
                // znak roli nad głową: drobny romb w barwie roli
                var rola = SLud.rolaPostaci(c);
                if (rola != null)
                {
                    double ty = sy - h * 1.2, t = Math.Max(3.5, h * 0.085);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = rgba(BARWA_ROLI[rola], 0.95);
                    ctx.beginPath(); ctx.moveTo(sx, ty - t); ctx.lineTo(sx + t * 0.8, ty); ctx.lineTo(sx, ty + t); ctx.lineTo(sx - t * 0.8, ty); ctx.closePath(); ctx.fill();
                }
            }
            ctx.restore();
        }

        /// <summary>Proporczyk na kiju — cel „idź tam”, wbity w podłogę.</summary>
        static void proporczyk(IPlotno ctx, double x, double y, double z, Styl barwa, double a, double czas, bool stoi)
        {
            double wys = Math.Max(14, z * 1.15), dl = Math.Max(8, z * 0.6);
            var fal = Nastroj.wolnoRuszac() ? JsM.Sin(czas * 0.006 + x) : 0;
            ctx.globalAlpha = a;
            ctx.strokeStyle = "rgba(40,24,14,0.95)"; ctx.lineWidth = Math.Max(2, z * 0.09);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - wys); ctx.stroke();
            ctx.fillStyle = barwa;
            ctx.beginPath();
            ctx.moveTo(x, y - wys);
            ctx.quadraticCurveTo(x + dl * 0.5, y - wys + dl * 0.15 * fal, x + dl, y - wys + dl * 0.32);
            ctx.quadraticCurveTo(x + dl * 0.5, y - wys + dl * 0.5 + dl * 0.15 * fal, x, y - wys + dl * 0.62);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(20,10,6,0.8)"; ctx.lineWidth = 1; ctx.stroke();
            // doszedł i trzyma posterunek — kółko u stopy kija
            if (stoi)
            {
                ctx.strokeStyle = barwa; ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.ellipse(x, y, Math.Max(6, z * 0.45), Math.Max(2, z * 0.13), 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        /// <summary>Kilof nad kaflem — cel „kop tam”.</summary>
        static void kilof(IPlotno ctx, double x, double y, double z, double a, double czas)
        {
            var s = Math.Max(10, z);
            ctx.globalAlpha = a;
            ctx.strokeStyle = "rgba(232,170,96,0.95)"; ctx.lineWidth = 1.4;
            ctx.setLineDash(3, 3); ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -czas * 0.01 : 0;
            ctx.strokeRect(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2);
            ctx.setLineDash();
            ctx.lineWidth = Math.Max(1.8, s * 0.1); ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(x - s * 0.28, y + s * 0.3); ctx.lineTo(x + s * 0.2, y - s * 0.22); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.22, s * 0.3, Math.PI * 0.65, Math.PI * 1.85); ctx.stroke();
            ctx.globalAlpha = 1;
        }

        /// <summary>Strzałki w dół nad czołem drogi wiernych — tam kopią na rozkaz.</summary>
        static void strzalki(IPlotno ctx, double x, double y, double z, double a, double czas)
        {
            var s = Math.Max(6, z * 0.35);
            var ruch = Nastroj.wolnoRuszac() ? (czas * 0.002) % 1 : 0;
            ctx.strokeStyle = "rgba(246,216,142,0.95)"; ctx.lineWidth = Math.Max(1.6, z * 0.08); ctx.lineCap = "round";
            for (int k = 0; k < 2; k++)
            {
                var dy = (k + ruch) * s * 0.9;
                ctx.globalAlpha = a * (1 - (k + ruch) / 2.2);
                ctx.beginPath(); ctx.moveTo(x - s, y - s * 2.6 + dy); ctx.lineTo(x, y - s * 1.8 + dy); ctx.lineTo(x + s, y - s * 2.6 + dy); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        /// <summary>
        /// Rozkazy na mapie (po postaciach): linie od zaznaczonych do ich celów, znaczniki celów (świeże rozkazy
        /// innych gasną po `POLECENIA.znacznikTikow`) i fala w miejscu ostatniego rozkazu (odmowa — czerwony krzyżyk).
        /// </summary>
        public static void rysujPoleceniaNaMapie(IPlotno ctx, Sim sim, Camera cam, double czas, IReadOnlyCollection<double> zaznaczeni, FalaRozkazu? fala)
        {
            var z = cam.zoom;
            var w = sim.world;
            ctx.save();
            var czolo = false;
            // ramka „do wykopania” (25.10): każdy oznaczony kafel skały dostaje znak kredą — wbity krótkim podskokiem
            // (Map w JS trzyma kolejność wstawienia — tu lista kluczy obok słownika)
            var oznaczone = new Dictionary<double, double>();
            var kolejnosc = new List<double>();
            foreach (var c in sim.creatures)
            {
                var p = c.polecenie;
                if (c.dead || p?.obszar == null) continue;
                foreach (var i in p.obszar)
                {
                    if (!oznaczone.TryGetValue(i, out var od)) { oznaczone[i] = p.od; kolejnosc.Add(i); }
                    else if (od > p.od) oznaczone[i] = p.od;
                }
            }
            if (oznaczone.Count > 0)
            {
                // ramka nie ma limitu (6.11) — tylko kafle w widoku, a te już wbite jednym pociągnięciem (tysiące krzyżyków naraz)
                double vx0 = Math.Floor(cam.toWorldX(0)) - 1, vx1 = Math.Ceiling(cam.toWorldX(cam.vw)) + 1;
                double vy0 = Math.Floor(cam.toWorldY(0)) - 1, vy1 = Math.Ceiling(cam.toWorldY(cam.vh)) + 1;
                void krzyz(double sx, double sy, double s) { ctx.moveTo(sx - s, sy - s); ctx.lineTo(sx + s, sy + s); ctx.moveTo(sx + s, sy - s); ctx.lineTo(sx - s, sy + s); }
                var s1 = z * 0.26;
                ctx.lineCap = "round";
                var wbite = new Path2D();
                var ileWbitych = 0;
                foreach (var i in kolejnosc)
                {
                    var od = oznaczone[i];
                    double x = i % w.w, y = Js.Js.ToInt32(i / w.w);
                    if (x < vx0 || x > vx1 || y < vy0 || y > vy1 || !w.solid(x, y)) continue;
                    var t = Math.Min(1, Math.Max(0, (sim.tick - od) / 18 - ((x + y) % 5) * 0.08));
                    if (t <= 0) continue;
                    double sx = cam.toScreenX(x + 0.5), sy = cam.toScreenY(y + 0.5);
                    if (t >= 1) { wbite.moveTo(sx - s1, sy - s1); wbite.lineTo(sx + s1, sy + s1); wbite.moveTo(sx + s1, sy - s1); wbite.lineTo(sx - s1, sy + s1); ileWbitych++; continue; }
                    var s = z * 0.26 * (t < 0.7 ? t / 0.7 * 1.25 : 1.25 - (t - 0.7) / 0.3 * 0.25);
                    ctx.strokeStyle = "rgba(14,9,7,0.7)"; ctx.lineWidth = Math.Max(2.2, z * 0.12);
                    ctx.beginPath(); krzyz(sx, sy, s); ctx.stroke();
                    ctx.strokeStyle = "rgba(240,222,180,0.85)"; ctx.lineWidth = Math.Max(1.2, z * 0.06); ctx.stroke();
                }
                if (ileWbitych > 0)
                {
                    // przy małym przybliżeniu krzyżyk byłby większy od kafla — cieńsza kreda
                    ctx.strokeStyle = "rgba(14,9,7,0.7)"; ctx.lineWidth = Math.Min(Math.Max(2.2, z * 0.12), z * 0.5); ctx.stroke(wbite);
                    ctx.strokeStyle = "rgba(240,222,180,0.85)"; ctx.lineWidth = Math.Min(Math.Max(1.2, z * 0.06), z * 0.25); ctx.stroke(wbite);
                }
            }
            foreach (var c in sim.creatures)
            {
                var rola = SLud.rolaPostaci(c);
                if (c.dead || rola == null) continue;
                var p = c.polecenie;
                if (p == null) continue;
                var wybrany = zaznaczeni.Contains(c.id);
                var swiezy = 1 - (sim.tick - p.od) / POLECENIA.znacznikTikow;
                var a = wybrany ? 1 : p.na == true ? 0 : Math.Max(0, swiezy);
                if (a <= 0.02) continue;
                var barwa = rgba(BARWA_ROLI[rola], 0.95);
                var tx = p.typ == "droga" ? -1 : cam.toScreenX(p.x + 0.5);
                if (wybrany && p.typ != "droga")
                {
                    // przerywana nić od postaci do celu
                    ctx.strokeStyle = "rgba(246,216,142,0.42)"; ctx.lineWidth = 1.2;
                    ctx.setLineDash(4, 5); ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -czas * 0.015 : 0;
                    ctx.beginPath(); ctx.moveTo(cam.toScreenX(c.x + Rozstep.przesuniecieX(c)), cam.toScreenY(c.y + 0.4));
                    ctx.lineTo(tx, cam.toScreenY(p.y + (p.typ == "kop" ? 0.5 : 0.9))); ctx.stroke();
                    ctx.setLineDash();
                }
                if (p.typ == "idz") proporczyk(ctx, tx, cam.toScreenY(p.y + 1), z, barwa, a, czas, p.na == true);
                else if (p.typ == "kop") { if (w.solid(p.x, p.y)) kilof(ctx, tx, cam.toScreenY(p.y + 0.5), z, a, czas); }
                else czolo = true;
            }
            // czoło drogi wiernych, gdy ktoś kopie ją na rozkaz
            if (czolo)
            {
                var cz = Pielgrzymka.czoloDrogi(sim);
                if (cz >= 0) strzalki(ctx, cam.toScreenX((cz % w.w) + 0.5), cam.toScreenY(Js.Js.ToInt32(cz / w.w)), z, 1, czas);
            }
            // fala w miejscu wydania rozkazu; odmowa — czerwony krzyżyk w tym miejscu (pod kursorem), bez słów
            if (fala != null)
            {
                var t = (Rdzen.Wydajnosc.Teraz() - fala.t) / (fala.ok ? 650 : KRZYZYK_MS);
                if (t >= 0 && t < 1)
                {
                    double fx = cam.toScreenX(fala.x), fy = cam.toScreenY(fala.y);
                    if (fala.ok)
                    {
                        ctx.strokeStyle = Barwa.Rgba(246, 216, 142, 0.9 * (1 - t));
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.ellipse(fx, fy, 6 + t * z * 1.6, (6 + t * z * 1.6) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
                    }
                    else
                    {
                        // wskakuje (lekko większy), chwilę stoi, gaśnie
                        var r = Math.Max(9, Math.Min(16, z * 0.6)) * (t < 0.12 ? 0.7 + t * 4 : 1.18 - Math.Min(0.18, (t - 0.12) * 0.6));
                        var a = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
                        ctx.lineCap = "round";
                        ctx.strokeStyle = Barwa.Rgba(10, 7, 6, 0.7 * a); ctx.lineWidth = Math.Max(4, r * 0.42);
                        ctx.beginPath(); ctx.moveTo(fx - r, fy - r); ctx.lineTo(fx + r, fy + r); ctx.moveTo(fx + r, fy - r); ctx.lineTo(fx - r, fy + r); ctx.stroke();
                        ctx.strokeStyle = Barwa.Rgba(226, 70, 52, 0.98 * a); ctx.lineWidth = Math.Max(2.4, r * 0.24);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /// <summary>Rogi ramki w świecie → pełne kafle, które przecina (włącznie), przycięte do świata.</summary>
        public static (double x0, double y0, double x1, double y1) kafleRamki(double rx0, double ry0, double rx1, double ry1, double sw, double sh)
        {
            double x0 = Math.Max(0, Math.Floor(Math.Min(rx0, rx1))), x1 = Math.Min(sw - 1, Math.Floor(Math.Max(rx0, rx1)));
            double y0 = Math.Max(0, Math.Floor(Math.Min(ry0, ry1))), y1 = Math.Min(sh - 1, Math.Floor(Math.Max(ry0, ry1)));
            return (x0, y0, Math.Max(x0, x1), Math.Max(y0, y1));
        }

        /// <summary>
        /// Ramka ciągnięta myszą po mapie (zaznaczanie prostokątem, 25.10): złota przerywana linia, która „płynie”,
        /// jasne rogi i lekkie wypełnienie. Od 6.11 trzyma się siatki kafli, a gdy zaznaczeni robotnicy mają co kuć,
        /// każdy kafel do wykucia jest podświetlony, z liczbą przy rogu.
        /// </summary>
        public static void rysujRamke(IPlotno ctx, Camera cam, Ramka r, double czas, double sw, double sh, PodgladRamki? podglad = null)
        {
            var k = kafleRamki(r.x0, r.y0, r.x1, r.y1, sw, sh);
            var z = cam.zoom;
            double x = cam.toScreenX(k.x0), y = cam.toScreenY(k.y0);
            double w = (k.x1 - k.x0 + 1) * z, h = (k.y1 - k.y0 + 1) * z;
            var t = Math.Min(1, (czas - r.od) / 160);
            var kop = podglad?.tryb == "kop";
            ctx.save();
            ctx.fillStyle = Barwa.Rgba(246, 216, 142, (kop ? 0.04 : 0.08) * t); ctx.fillRect(x, y, w, h);
            // siatka bloków w ramce — widać, ile kafli i które
            if (z >= 6)
            {
                ctx.strokeStyle = Barwa.Rgba(246, 216, 142, 0.18 * t); ctx.lineWidth = 1;
                ctx.beginPath();
                for (var gx = k.x0 + 1; gx <= k.x1; gx++) { var sx = Math.Floor(cam.toScreenX(gx) + 0.5) + 0.5; ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); }
                for (var gy = k.y0 + 1; gy <= k.y1; gy++) { var sy = Math.Floor(cam.toScreenY(gy) + 0.5) + 0.5; ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); }
                ctx.stroke();
            }
            // kafle do wykucia: ciepłe wypełnienie (wierszami, ciągi sąsiednich kafli jednym prostokątem) i obrys każdego bloku
            if (kop && podglad!.kop.Count > 0)
            {
                var pulsa = Nastroj.wolnoRuszac() ? 0.5 + 0.5 * JsM.Sin(czas * 0.006) : 0.5;
                Path2D runy = new Path2D(), bloki = new Path2D();
                var list = podglad.kop;
                for (int a = 0; a < list.Count;)
                {
                    var b = a;
                    while (b + 1 < list.Count && list[b + 1] == list[b] + 1 && (list[b + 1] % sw) != 0) b++;
                    double tx = list[a] % sw, ty = Js.Js.ToInt32(list[a] / sw);
                    runy.rect(cam.toScreenX(tx), cam.toScreenY(ty), (b - a + 1) * z, z);
                    a = b + 1;
                }
                if (z >= 9) foreach (var i in list) bloki.rect(cam.toScreenX(i % sw) + 1.5, cam.toScreenY(Js.Js.ToInt32(i / sw)) + 1.5, z - 3, z - 3);
                ctx.fillStyle = Barwa.Rgba(232, 150, 70, (0.2 + 0.08 * pulsa) * t); ctx.fill(runy);
                if (z >= 9) { ctx.strokeStyle = Barwa.Rgba(255, 214, 150, 0.55 * t); ctx.lineWidth = 1; ctx.stroke(bloki); }
            }
            ctx.setLineDash(6, 5); ctx.lineDashOffset = Nastroj.wolnoRuszac() ? -czas * 0.02 : 0;
            ctx.strokeStyle = "rgba(14,9,7,0.75)"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
            ctx.strokeStyle = Barwa.Rgba(246, 216, 142, 0.95 * t); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
            ctx.setLineDash();
            // rogi
            var rg = Math.Min(12, Math.Min(w / 3, h / 3));
            ctx.strokeStyle = "rgba(255,236,190,0.95)"; ctx.lineWidth = 2.2;
            ctx.beginPath();
            foreach (var (cx, cy, dx, dy) in new[] { (x, y, 1.0, 1.0), (x + w, y, -1.0, 1.0), (x, y + h, 1.0, -1.0), (x + w, y + h, -1.0, -1.0) })
            {
                ctx.moveTo(cx + dx * rg, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * rg);
            }
            ctx.stroke();
            // podpis przy rogu pod kursorem: wymiary ramki w blokach i co z niej będzie
            double szer = k.x1 - k.x0 + 1, wys = k.y1 - k.y0 + 1;
            var napis = $"{Js.Js.S(szer)}×{Js.Js.S(wys)}" + (kop ? $" · do wykucia: {podglad!.kop.Count}"
                : podglad?.tryb == "lud" ? $" · zaznaczy: {podglad.lud}" : "");
            ctx.font = $"13px {Ink.SERIF}";
            double tw = ctx.measureText(napis).width + 12, th = 20;
            bool prawo = r.x1 >= r.x0, dol = r.y1 >= r.y0;
            // po prawej/pod spodem odsunięty o kursor (rękawica zasłoniłaby napis)
            double px = prawo ? x + w + 24 : x - tw - 8, py = dol ? y + h + 10 : y - th - 8;
            px = Math.Max(4, Math.Min(cam.vw - tw - 4, px)); py = Math.Max(4, Math.Min(cam.vh - th - 4, py));
            ctx.globalAlpha = t;
            ctx.fillStyle = "rgba(14,9,7,0.82)"; ctx.fillRect(px, py, tw, th);
            ctx.strokeStyle = "rgba(246,216,142,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, tw - 1, th - 1);
            ctx.fillStyle = "rgba(255,236,190,0.97)"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
            ctx.fillText(napis, px + 6, py + th / 2 + 0.5);
            ctx.restore();
        }
    }
}
