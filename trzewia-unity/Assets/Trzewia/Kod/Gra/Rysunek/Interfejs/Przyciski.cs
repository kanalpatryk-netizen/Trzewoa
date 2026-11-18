// Port: alpha-1/src/render/przyciski.ts — nacięcia przy dolnej krawędzi płyty (pauza, zapiski, atlas, klucz, kamera,
// zapis; tempo w trybie deweloperskim) i układ dołu ekranu na komputerze (Alpha 1): księga pod płytą, atlas z jej lewej
// strony, „Budowa” i „odwołaj” z prawej, rząd okrągłych przycisków przy prawej krawędzi. Bez układów telefonu.
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Plotna;
using static Trzewia.Nastawy.NastawyBarwy;

namespace Trzewia.Rysunek
{
    /// <summary>'pauza' | 'wolniej' | 'szybciej' | 'zapiski' | 'atlas' | 'legenda' | 'kamera' | 'zapis'</summary>
    public sealed class Przycisk
    {
        public string akcja = "";
        public double x, y, r;
        public string etykieta = "";
        public bool wlaczony;
        /// <summary>Na wąskim ekranie pasek leży na dolnej krawędzi płyty (telefon — tu zawsze false).</summary>
        public bool naPlycie;
        /// <summary>Alpha 1: przycisk stoi osobno (atlas przy księdze), nie w rzędzie.</summary>
        public bool osobno;
    }

    /// <summary>Dół ekranu na komputerze (Alpha 1): księga pod płytą i wszystko wokół niej.</summary>
    public sealed class UkladDolu
    {
        public Obszar ksiega;
        /// <summary>Grubość okładki wokół kart.</summary>
        public double oprawa;
        /// <summary>Okrągły przycisk atlasu z lewej strony księgi.</summary>
        public (double x, double y, double r) atlas;
        /// <summary>Płyta „Budowa” i pod nią „odwołaj rozkaz”, z prawej strony księgi.</summary>
        public Obszar buduj, odwolaj;
        /// <summary>Rząd okrągłych przycisków przy prawej krawędzi.</summary>
        public (double x, double y, double r, double odstep) przyciski;
    }

    /// <summary>Miejsce na zasób w księdze: ikona (środek x, linia pisma y), rozmiar ikony, pismo i szerokość wiersza.</summary>
    public struct MiejsceZasobu { public double x, y, s, pismo, szer; }

    /// <summary>Rozkład kart księgi: lewa — „Twój lud” (trzy medaliony), prawa — „Zasoby” i pieczęć „+” przy jedzeniu.</summary>
    public sealed class UkladKsiegi
    {
        public Obszar lewa, prawa;
        public double naglowek;
        public (string rola, double x, double y, double rx, double ry)[] medaliony = null!;
        /// <summary>'wiara' | 'krew' | 'jedzenie' | 'zelazo' | 'zloto' | 'oddanie'</summary>
        public Dictionary<string, MiejsceZasobu> zasoby = null!;
        public (double x, double y, double r) nakarm;
    }

    public static class Przyciski
    {
        /// <summary>Mnożnik czasu do podpisu: ¼, ½, 2, 10…</summary>
        public static string mnoznikNapis(double m) => m == 0.25 ? "¼" : m == 0.5 ? "½" : Js.Js.S(m);

        /// <summary>Dolna krawędź rzędu przycisków pod płytą na komputerze.</summary>
        public static double dolPrzyciskow(Plate p, double vh)
        {
            var r = Math.Max(22, Math.Min(26, p.w * 0.02));
            return Math.Min(vh - r * 1.6, p.y + p.h + r * 1.8) + r;
        }

        /// <summary>Lewa krawędź rzędu przycisków na szerokim ekranie.</summary>
        public static double lewaKrawedzPrzyciskow(Plate p)
        {
            var r = Math.Max(22, Math.Min(26, p.w * 0.02));
            return p.x + p.w - r * 2.3 * 7 - r * 1.2 - r;
        }

        public static List<Przycisk> rozmiescPrzyciski(Plate p, double vh, bool pauza, bool zapiski, bool legenda, double tempo, bool dev = false, double noweTablice = 0)
        {
            var wszystkie = new List<Przycisk> { new Przycisk { akcja = "pauza", etykieta = pauza ? "wznów" : "pauza", wlaczony = pauza } };
            // tempo czasu tylko w trybie deweloperskim — w grze czas jest jeden
            if (dev)
            {
                wszystkie.Add(new Przycisk { akcja = "wolniej", etykieta = $"wolniej (×{mnoznikNapis(tempo)})" });
                wszystkie.Add(new Przycisk { akcja = "szybciej", etykieta = $"szybciej (×{mnoznikNapis(tempo)})" });
            }
            wszystkie.Add(new Przycisk { akcja = "kamera", etykieta = "wróć do swoich" });
            wszystkie.Add(new Przycisk { akcja = "zapiski", etykieta = "zapiski", wlaczony = zapiski });
            wszystkie.Add(new Przycisk { akcja = "atlas", etykieta = noweTablice > 0 ? $"atlas — nowe tablice: {Js.Js.S(noweTablice)}" : "atlas", wlaczony = noweTablice > 0 });
            wszystkie.Add(new Przycisk { akcja = "legenda", etykieta = "klucz", wlaczony = legenda });
            wszystkie.Add(new Przycisk { akcja = "zapis", etykieta = "zapisz" });
            // Alpha 1 (komputer): pod płytą księga; atlas to osobny okrągły przycisk z lewej strony księgi,
            // pauza (spacja) i klucz zostają pod klawiszami, reszta przycisków w rzędzie z prawej
            var wRzedzie = wszystkie.Where(b => b.akcja != "pauza" && b.akcja != "legenda" && b.akcja != "atlas").ToList();
            var atlas = wszystkie.First(b => b.akcja == "atlas");
            var u = ukladDolu(p, vh, wRzedzie.Count); var rz = u.przyciski;
            var wynik = new List<Przycisk>();
            for (int i = 0; i < wRzedzie.Count; i++) { var b = wRzedzie[i]; b.x = rz.x + i * rz.odstep; b.y = rz.y; b.r = rz.r; wynik.Add(b); }
            atlas.x = u.atlas.x; atlas.y = u.atlas.y; atlas.r = u.atlas.r; atlas.osobno = true;
            wynik.Add(atlas);
            return wynik;
        }

        /// <summary>
        /// Pas pod płytą: rząd przycisków przy prawej krawędzi, przed nim „Budowa” i „odwołaj”, księga pośrodku
        /// (szeroka najwyżej na 680 px i nie wchodzi na sąsiadów), atlas z jej lewej strony.
        /// </summary>
        /// <summary>
        /// Oprawa (etap 2, flaga VisualConfig.ZwinietaKsiega, domyślnie wyłączona): w walce z bossem księga zwinięta do
        /// wąskiego paska z najważniejszymi zasobami — pas pod płytą niski, płyta wyższa. Ustawia ekran gry (i woła rozmiar).
        /// </summary>
        public static bool KsiegaZwinieta;
        /// <summary>Wysokość pasa pod płytą przy zwiniętej księdze (px).</summary>
        public const double DOL_ZWINIETEJ = 104;

        public static UkladDolu ukladDolu(Plate p, double vh, int ilePrzyciskow = 3)
        {
            var zw = KsiegaZwinieta;
            double prawa = p.x + p.w + p.right, dolPlyty = p.y + p.h, oprawa = 12;
            double gora = dolPlyty + 14 + oprawa, wys = Math.Max(zw ? 44 : 90, vh - 10 - oprawa - gora);
            double r = zw ? Math.Max(16, Math.Min(21, wys * 0.36)) : Math.Max(19, Math.Min(25, wys * 0.13)), odstep = r * 2.35, margR = Math.Max(8, r * 0.4);
            double szerRzedu = (ilePrzyciskow - 1) * odstep + r * 2 + margR * 2, xRzedu = prawa - 14 - szerRzedu, srodek = gora + wys / 2;
            double rAtlasu = r * 1.2, zajmujeAtlas = rAtlasu * 2 + 18 + oprawa;
            // zwinięta: „Budowa” i „odwołaj” obok siebie (nie jedno pod drugim) — szersze miejsce na oba
            double szerBudowy = Math.Max(118, Math.Min(168, prawa * 0.12)) * (zw ? 1.7 : 1), zajmujeBudowa = oprawa + 18 + szerBudowy;
            double lewo = 14, prawoKsiegi = xRzedu - 16;
            var szer = Math.Min(Math.Min(zw ? 620 : wys * 3.2, prawa * 0.46), 680);
            szer = Math.Max(200, Math.Min(szer, prawoKsiegi - lewo - zajmujeAtlas - zajmujeBudowa));
            var x = Math.Max(lewo + zajmujeAtlas, Math.Min(prawa / 2 - szer / 2, prawoKsiegi - zajmujeBudowa - szer));
            var xBudowy = x + szer + oprawa + 18;
            double hBudowy = Math.Min(wys * 0.56, 92), hOdwolaj = Math.Max(30, Math.Min(40, wys * 0.21)), przerwa = 10;
            var yBudowy = srodek - (hBudowy + przerwa + hOdwolaj) / 2;
            if (zw)
            {
                var hz = Math.Min(wys - 4, 44);
                return new UkladDolu
                {
                    ksiega = new Obszar(x, gora, szer, wys), oprawa = oprawa,
                    atlas = (x - oprawa - 16 - rAtlasu, srodek, rAtlasu),
                    buduj = new Obszar(xBudowy, srodek - hz / 2, szerBudowy * 0.55, hz),
                    odwolaj = new Obszar(xBudowy + szerBudowy * 0.58, srodek - hz / 2, szerBudowy * 0.42, hz),
                    przyciski = (xRzedu + margR + r, srodek, r, odstep),
                };
            }
            return new UkladDolu
            {
                ksiega = new Obszar(x, gora, szer, wys), oprawa = oprawa,
                atlas = (x - oprawa - 16 - rAtlasu, srodek, rAtlasu),
                buduj = new Obszar(xBudowy, yBudowy, szerBudowy, hBudowy),
                odwolaj = new Obszar(xBudowy, yBudowy + hBudowy + przerwa, szerBudowy, hOdwolaj),
                przyciski = (xRzedu + margR + r, srodek, r, odstep),
            };
        }

        public static UkladKsiegi ukladKsiegi(UkladDolu u)
        {
            var k = u.ksiega; var pol = k.w / 2;
            double grzbiet = Math.Max(14, k.w * 0.03), brzeg = Math.Max(16, k.w * 0.04), gora = Math.Max(10, k.h * 0.07), dol = Math.Max(8, k.h * 0.06);
            var lewa = new Obszar(k.x + brzeg, k.y + gora, pol - brzeg - grzbiet, k.h - gora - dol);
            var prawa = new Obszar(k.x + pol + grzbiet, k.y + gora, pol - brzeg - grzbiet, k.h - gora - dol);
            var naglowek = Math.Max(13, Math.Min(22, k.h * 0.12));
            // lewa karta: trzy medaliony w rzędzie pod nagłówkiem
            double yMed = lewa.y + naglowek * 1.25 + (lewa.h - naglowek * 1.25 - naglowek * 1.1) / 2, kolumna = lewa.w / 3;
            double ry = Math.Max(16, Math.Min((lewa.h - naglowek * 2.6) / 2, kolumna * 0.5)), rx = Math.Min(kolumna * 0.36, ry * 0.8);
            var role = new[] { "robotnik", "pobozny", "rycerz" };
            var medaliony = role.Select((rola, i) => (rola, lewa.x + kolumna * (i + 0.5), yMed, rx, ry)).ToArray();
            // prawa karta: wiara, krew, jedzenie po lewej (większe), żelazo, złoto, oddanie po prawej
            double y0 = prawa.y + naglowek * 1.25, wiersz = (prawa.h - naglowek * 1.25) / 3;
            double pismoDuze = Math.Max(13, Math.Min(26, wiersz * 0.62)), pismoMale = Math.Max(12, Math.Min(21, wiersz * 0.5));
            double ikonaDuza = pismoDuze * 1.25, ikonaMala = pismoMale * 1.25, szerL = prawa.w * 0.54, szerP = prawa.w - szerL;
            double yW(int i) => y0 + wiersz * (i + 0.5);
            double xL = prawa.x + ikonaDuza * 0.55, xP = prawa.x + szerL + ikonaMala * 0.6;
            MiejsceZasobu duzy(int i) => new MiejsceZasobu { x = xL, y = yW(i), s = ikonaDuza, pismo = pismoDuze, szer = szerL - ikonaDuza * 1.3 };
            MiejsceZasobu maly(int i, double s) => new MiejsceZasobu { x = xP, y = yW(i), s = s, pismo = pismoMale, szer = szerP - ikonaMala * 1.5 };
            var zasoby = new Dictionary<string, MiejsceZasobu>
            {
                ["wiara"] = duzy(0), ["krew"] = duzy(1), ["jedzenie"] = duzy(2),
                ["zelazo"] = maly(0, ikonaMala), ["zloto"] = maly(1, ikonaMala), ["oddanie"] = maly(2, ikonaMala * 1.1),
            };
            var rPieczeci = Math.Max(7, Math.Min(10, ikonaDuza * 0.3));
            var nakarm = (xL + ikonaDuza * 0.22, yW(2) - pismoDuze * 0.3 + ikonaDuza * 0.36, rPieczeci);
            return new UkladKsiegi { lewa = lewa, prawa = prawa, naglowek = naglowek, medaliony = medaliony, zasoby = zasoby, nakarm = nakarm };
        }

        public static void rysujPrzyciski(IPlotno ctx, List<Przycisk> lista, string? podKursorem, double teraz)
        {
            ctx.save();
            foreach (var b in lista)
            {
                ctx.save();
                ctx.translate(b.x, b.y);
                // krążek tynku z wycinkiem fresku albo znakiem malowanym sinopią
                var stan = b.wlaczony ? "wlaczony" : podKursorem == b.akcja ? "pod" : "zwykly";
                if (!Fresk.krazekZIkona(ctx, "przycisk-" + b.akcja, 0, 0, b.r, stan))
                {
                    Fresk.krazek(ctx, 0, 0, b.r, stan, "przycisk-" + b.akcja);
                    ctx.strokeStyle = FRESK.sinopia;
                    ctx.lineWidth = Math.Max(2, b.r * 0.1);
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    znak(ctx, b.akcja, b.r * 0.52);
                }
                ctx.restore();
            }
            var opis = lista.FirstOrDefault(b => b.akcja == podKursorem);
            if (opis != null)
            {
                ctx.textAlign = "center";
                var rozm = Math.Max(14, opis.r * 0.95);
                ctx.font = $"italic {Js.Js.S(rozm)}px {Ink.SERIF}";
                // podpis przycisku przy samym brzegu ekranu wychodził poza ekran
                var t = ctx.getTransform();
                var szerEkranu = ctx.width / (t.a != 0 ? t.a : 1);
                var pol = ctx.measureText(opis.etykieta).width / 2 + 6;
                var lx = Math.Max(pol, Math.Min(szerEkranu - pol, opis.x));
                var ly = Math.Max(rozm + 2, opis.y - opis.r * 1.7);
                ctx.lineWidth = 3;
                ctx.strokeStyle = "rgba(10,7,6,0.85)";
                ctx.strokeText(opis.etykieta, lx, ly);
                ctx.fillStyle = "rgba(240,226,198,0.97)";
                ctx.fillText(opis.etykieta, lx, ly);
            }
            ctx.restore();
        }

        static void znak(IPlotno ctx, string akcja, double u)
        {
            ctx.beginPath();
            switch (akcja)
            {
                case "pauza":
                    ctx.moveTo(-u * 0.45, -u); ctx.lineTo(-u * 0.45, u);
                    ctx.moveTo(u * 0.45, -u); ctx.lineTo(u * 0.45, u);
                    break;
                case "wolniej":
                    ctx.moveTo(u * 0.8, -u); ctx.lineTo(-u * 0.5, 0); ctx.lineTo(u * 0.8, u);
                    break;
                case "szybciej":
                    ctx.moveTo(-u * 0.8, -u); ctx.lineTo(u * 0.5, 0); ctx.lineTo(-u * 0.8, u);
                    break;
                case "kamera":                       // oko z okiem w środku: wróć do żywych
                    ctx.moveTo(-u, 0);
                    ctx.quadraticCurveTo(0, -u * 1.1, u, 0);
                    ctx.quadraticCurveTo(0, u * 1.1, -u, 0);
                    ctx.moveTo(u * 0.32, 0);
                    ctx.arc(0, 0, u * 0.32, 0, Math.PI * 2);
                    break;
                case "zapiski":                        // karty
                    ctx.moveTo(-u * 0.8, -u); ctx.lineTo(u * 0.8, -u);
                    ctx.moveTo(-u * 0.8, -u * 0.2); ctx.lineTo(u * 0.5, -u * 0.2);
                    ctx.moveTo(-u * 0.8, u * 0.6); ctx.lineTo(u * 0.8, u * 0.6);
                    break;
                case "atlas":                          // otwarta księga: dwie karty i grzbiet
                    ctx.moveTo(0, -u * 0.7); ctx.lineTo(0, u * 0.9);
                    ctx.moveTo(0, -u * 0.7); ctx.quadraticCurveTo(-u * 0.5, -u, -u, -u * 0.75); ctx.lineTo(-u, u * 0.7);
                    ctx.quadraticCurveTo(-u * 0.5, u * 0.5, 0, u * 0.9);
                    ctx.moveTo(0, -u * 0.7); ctx.quadraticCurveTo(u * 0.5, -u, u, -u * 0.75); ctx.lineTo(u, u * 0.7);
                    ctx.quadraticCurveTo(u * 0.5, u * 0.5, 0, u * 0.9);
                    break;
                case "legenda":                        // klucz
                    ctx.arc(-u * 0.35, 0, u * 0.42, 0, Math.PI * 2);
                    ctx.moveTo(u * 0.05, 0); ctx.lineTo(u, 0);
                    ctx.moveTo(u * 0.7, 0); ctx.lineTo(u * 0.7, u * 0.4);
                    break;
                case "zapis":                          // zwój ze sznurkiem: „odłóż tę górę na potem”
                    ctx.moveTo(-u * 0.85, -u * 0.8); ctx.lineTo(u * 0.85, -u * 0.8);
                    ctx.moveTo(-u * 0.85, u * 0.8); ctx.lineTo(u * 0.85, u * 0.8);
                    ctx.moveTo(-u * 0.85, -u * 0.8); ctx.lineTo(-u * 0.85, u * 0.8);
                    ctx.moveTo(u * 0.85, -u * 0.8); ctx.lineTo(u * 0.85, u * 0.8);
                    ctx.moveTo(-u * 0.35, -u * 0.8); ctx.lineTo(-u * 0.35, u * 0.15);
                    ctx.moveTo(u * 0.35, -u * 0.8); ctx.lineTo(u * 0.35, u * 0.15);
                    ctx.moveTo(-u * 0.35, u * 0.15); ctx.lineTo(u * 0.35, u * 0.15);
                    break;
            }
            ctx.stroke();
        }

        public static Przycisk? przyciskPod(List<Przycisk> lista, double x, double y)
        {
            foreach (var b in lista)
            {
                double dx = b.x - x, dy = b.y - y;
                if (Math.Sqrt(dx * dx + dy * dy) <= Math.Max(22, b.r)) return b;
            }
            return null;
        }
    }
}
