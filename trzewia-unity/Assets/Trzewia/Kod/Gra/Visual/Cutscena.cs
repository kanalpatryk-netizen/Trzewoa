// Oprawa walki, etap 4 (docs/plan-oprawy-cerber.md): przerywniki — wejście i śmierć Cerbera. Tylko Krąg Trzeci (ten
// sam boss walczy na jedną modłę w obu trybach, ale te dwie chwile scenariusz dostał tylko tu, bo tylko tu je opisano).
//
// Zasada: NIC z tego nie dotyka symulacji. Obie sceny to kamera, pasy kinowe, chowany HUD i napisy — zawieszone nad
// grą, która idzie swoim tempem dokładnie tak jak bez oprawy (pieczęć pęka i Cerber wychodzi w tych samych tikach,
// co zawsze; „zwolnienie” czasu przy ostatnim ciosie to osobna, dawno istniejąca mechanika gry — POMNIK.zwolnienie —
// nie coś, co dokłada ten plik). Dzięki temu pominięcie (spacja / Esc / klik) niczego nie zmienia: chowa tylko pasy,
// oddaje kamerę i HUD — gra stoi dokładnie tam, gdzie by stała bez przerywnika.
//
// Jedyny wyjątek: scena śmierci wstrzymuje na chwilę przejście do kroniki (EkranGry.Krok.cs), żeby trup nie zniknął
// w tej samej klatce, w której kona — to czysto ekranowa decyzja („kiedy zmienić ekran”), nie zmiana wyniku gry.
//
// Kolejka kroków z czasem i krzywą: `Krok()` wylicza co klatkę stan sceny (kamera, otwarcie pasów, napis, karta
// tytułu) z czasu rzeczywistego od startu i z aktualnej fazy pomnika — bez własnego zegara symulacji.
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyPomnik;
using static Trzewia.Nastawy.NastawySterowanie;
using C = Trzewia.Visual.VisualConfig.Przerywnikowe;

namespace Trzewia.Visual
{
    public static class Cutscena
    {
        /// <summary>„wejscie” | „smierc” | null (nic nie gra).</summary>
        public static string? Scena { get; private set; }
        public static bool Trwa => Scena != null;

        static double od;
        static bool pominieta;
        static readonly System.Collections.Generic.HashSet<string> widziane = new System.Collections.Generic.HashSet<string>();

        // ── wejście: stan złapany w chwili startu ──
        static double wejscieZoomPrzed;

        // ── śmierć: trup i miejsce złapane w chwili startu ──
        static Creature? trup;
        static double trupH, trupKier, trupX, trupY, smiercZoomPrzed;

        /// <summary>Nowa partia / zmiana trybu: nic z poprzedniej nie zostaje (także lista „już widziana”).</summary>
        public static void Nowa()
        {
            Scena = null; pominieta = false; trup = null;
            widziane.Clear();
        }

        static bool Aktywna => VisualConfig.Aktywne(VisualConfig.Przerywniki) && Krag.Wlaczony;

        /// <summary>Krótszy przebieg, gdy tę scenę gracz już widział w tej partii (więcej walk z bossem w jednej sesji).</summary>
        static double Skrot(string scena) => widziane.Contains(scena) ? C.SkrocenieDrugiRaz : 1;

        /// <summary>Pomnik: stoi → rozpada (tylko raz, na początek walki).</summary>
        public static void RozpocznijWejscie(Sim sim, Camera cam, double teraz)
        {
            if (!Aktywna) return;
            Scena = "wejscie"; od = teraz; pominieta = false;
            wejscieZoomPrzed = cam.zoom;
        }

        /// <summary>Pomnik: kona, w chwili gdy gra się kończy (sim.ending właśnie ustawione) — `zmarly` to Cerber.</summary>
        public static void RozpocznijSmierc(Sim sim, Camera cam, double teraz, Creature zmarly)
        {
            if (!Aktywna) { trup = null; return; }
            Scena = "smierc"; od = teraz; pominieta = false;
            trup = zmarly.Kopia();
            trupH = Figury.wysokoscPostaci(zmarly, cam.zoom) * Trzewia.Symulacja.Boss.aktywnyBoss().rozmiar * 0.6;
            trupKier = zmarly.face >= 0 ? 1 : -1;
            // miejsce ostatniego uderzenia (to samo, do którego już skoczyła kamera, gdy boss konał) — pewniejsze niż
            // bieżące x, y stworzenia, które `kona` mogło zostawić nieco inaczej niż tam, gdzie faktycznie padł
            var cios = sim.lud.pomnik?.cios;
            trupX = cios?.x ?? zmarly.x; trupY = cios?.y ?? zmarly.y;
            smiercZoomPrzed = cam.zoom;
        }

        /// <summary>Spacja / Esc / klik: pasy znikają, kamera i HUD wracają od razu — gra sama w sobie się nie zmienia.</summary>
        public static void Pomin()
        {
            if (!Trwa) return;
            pominieta = true;
        }

        static double Gladko(double t) { var x = Math.Max(0, Math.Min(1, t)); return x * x * (3 - 2 * x); }
        static void Ease(Camera cam, double tx, double ty, double tz, double dtMs, double msDoCelu)
        {
            var k = 1 - Math.Exp(-Math.Max(0, dtMs) / Math.Max(1, msDoCelu / 2.3));
            cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.zoom += (tz - cam.zoom) * k;
        }

        static double ostatniTeraz = double.NaN;
        /// <summary>Chwila (zegar ekranu), od której pomnik.faza == „walka” — dla fazy wejścia (pas chowa się po niej).</summary>
        static double walkaOd = double.NaN;

        /// <summary>Co klatkę (EkranGry.Krok.cs): kamera sceny. Bez efektu, gdy scena nie trwa.</summary>
        public static void Krok(Sim sim, Camera cam, double teraz)
        {
            if (!Trwa) { ostatniTeraz = double.NaN; walkaOd = double.NaN; return; }
            var dt = double.IsNaN(ostatniTeraz) ? 16 : Math.Max(0, teraz - ostatniTeraz);
            ostatniTeraz = teraz;
            var p = sim.lud.pomnik;
            if (Scena == "wejscie")
            {
                if (p?.faza == "walka") { if (double.IsNaN(walkaOd)) walkaOd = teraz; }
                else walkaOd = double.NaN;
                if (pominieta || p == null || p.faza == "stoi") { Koniec(); return; }
                var m = Pomnik.miejscePomnika(sim);
                Ease(cam, m.x, m.y - 2, wejscieZoomPrzed * C.WejsciePrzyblizenie, dt, C.WejscieKameraMs);
                cam.clamp(sim.world.w, sim.world.h);
                if (!double.IsNaN(walkaOd) && teraz - walkaOd >= C.WejsciePoWalceMs * Skrot("wejscie")) Koniec();
            }
            else // "smierc"
            {
                if (pominieta) { Koniec(); return; }
                var t = teraz - od;
                // najpierw trup (kamera zostaje tam, gdzie już jest — to ta sama chwila, co ostatni cios), potem jazda do otworu
                if (t >= C.TrupRozsypMs * Skrot("smierc"))
                {
                    var m = Pomnik.miejscePomnika(sim);
                    Ease(cam, m.x, m.y - 1.5, smiercZoomPrzed * C.SmiercPrzyblizenie, dt, C.SmierckKameraMs);
                    cam.clamp(sim.world.w, sim.world.h);
                }
                var koniec = (C.TrupRozsypMs + C.SmierckKameraMs + C.SmiercNapisPo + C.SmiercNapisMs + C.SmiercKoniecMs) * Skrot("smierc");
                if (t >= koniec) Koniec();
            }
        }

        static void Koniec()
        {
            widziane.Add(Scena!);
            Scena = null; trup = null; ostatniTeraz = double.NaN;
        }

        /// <summary>Czy HUD (księga, przyciski, pasek bossa…) ma być teraz schowany.</summary>
        public static bool UkryjHud(double teraz) => Trwa && !pominieta;

        // ───────────── pasy kinowe i napisy (ekran, po wszystkim) ─────────────

        static double otwarcieWejscia(double teraz, Sim sim)
        {
            if (!Trwa || Scena != "wejscie") return 0;
            if (pominieta) return 0;
            var t = teraz - od;
            var wjazd = Gladko(t / C.PasMs);
            if (double.IsNaN(walkaOd)) return wjazd;
            var wyjazd = 1 - Gladko((teraz - walkaOd) / C.PasMs);
            return Math.Min(wjazd, Math.Max(0, wyjazd));
        }

        static double otwarcieSmierci(double teraz)
        {
            if (!Trwa || Scena != "smierc" || pominieta) return 0;
            var t = teraz - od;
            var sk = Skrot("smierc");
            var koniec = (C.TrupRozsypMs + C.SmierckKameraMs + C.SmiercNapisPo + C.SmiercNapisMs + C.SmiercKoniecMs) * sk;
            var wjazd = Gladko(t / C.PasMs);
            var wyjazd = 1 - Gladko((t - (koniec - C.PasMs)) / C.PasMs);
            return Math.Max(0, Math.Min(wjazd, wyjazd));
        }

        /// <summary>Wysokość jednego pasa kinowego (ekran, px) przy bieżącej wysokości płyty.</summary>
        public static double WysokoscPasa(Plate plate) => plate.h * C.PasWysokosc;

        /// <summary>Pasy kinowe, napisy i karta tytułu — na samej górze, w układzie ekranu (po HUD, nad wszystkim).</summary>
        public static void Rysuj(IPlotno ctx, Sim sim, Plate plate, double teraz)
        {
            var kWej = otwarcieWejscia(teraz, sim);
            var kSm = otwarcieSmierci(teraz);
            var k = Math.Max(kWej, kSm);
            if (k <= 0.002) return;
            var pas = WysokoscPasa(plate) * k;
            ctx.save();
            ctx.fillStyle = "rgba(6,4,4,0.9)";
            ctx.fillRect(plate.x, plate.y, plate.w, pas);
            ctx.fillRect(plate.x, plate.y + plate.h - pas, plate.w, pas);
            var cx = plate.x + plate.w / 2;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";

            if (Scena == "wejscie" && kWej > 0.05)
            {
                var r = Math.Max(13, Math.Min(22, plate.w / 62)) * k;
                var t = teraz - od;
                // podpis dolny: „Pieczęć pęka.” aż do wyjścia bossa, potem cisza (karta mówi za niego)
                var p = sim.lud.pomnik;
                string napis = p?.faza == "rozpada" ? "Pieczęć pęka." : p?.faza == "wychodzi" ? "Cerber wychodzi z pieca." : "";
                if (napis != "" && t > 150)
                {
                    ctx.font = Czytelnosc.Kroj(Ink.SERIF, r * 1.25, true);
                    ctx.fillStyle = Barwa.Rgba(222, 214, 186, 0.95 * Math.Min(1, (t - 150) / 250));
                    ctx.fillText(napis, cx, plate.y + plate.h - pas / 2);
                }
                // karta tytułu: na koniec „wychodzi”, w środku ekranu — imię bossa
                if (p?.faza == "wychodzi")
                {
                    var pozostaloMs = Math.Max(0, (POMNIK.wyjscie - (sim.tick - p.od)) / 120.0 * 1000);
                    var kKarty = pozostaloMs <= C.WejscieKartaPrzed * Skrot("wejscie")
                        ? Gladko(1 - pozostaloMs / (C.WejscieKartaPrzed * Skrot("wejscie"))) : 0;
                    if (kKarty > 0.02)
                    {
                        var dojrzaloscKarty = Math.Min(1, (C.WejscieKartaPrzed * Skrot("wejscie") - pozostaloMs) / (C.WejscieKartaMs * 0.25));
                        var gasnieKarty = pozostaloMs < 120 ? Math.Max(0, pozostaloMs / 120) : 1;
                        var a = Math.Min(dojrzaloscKarty, gasnieKarty) * k;
                        ctx.save();
                        ctx.globalAlpha *= a;
                        ctx.font = Czytelnosc.Kroj(Ink.SERIF_TYTUL, Math.Max(32, plate.w * 0.045));
                        ctx.fillStyle = "rgba(236,222,190,0.98)";
                        ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 10;
                        ctx.fillText(string.Join(" ", Boss.aktywnyBoss().nazwa.ToUpperInvariant().ToCharArray()), cx, plate.y + plate.h / 2);
                        ctx.restore();
                    }
                }
            }
            else if (Scena == "smierc" && kSm > 0.05)
            {
                var r = Math.Max(13, Math.Min(20, plate.w / 66)) * k;
                var t = teraz - od;
                var sk = Skrot("smierc");
                var napisOd = C.TrupRozsypMs * sk + C.SmierckKameraMs * sk + C.SmiercNapisPo * sk;
                if (t >= napisOd)
                {
                    var kN = Gladko(Math.Min(1, (t - napisOd) / 250)) * Math.Max(0, Math.Min(1, (C.SmiercNapisMs * sk - (t - napisOd) + 250) / 250));
                    ctx.font = Czytelnosc.Kroj(Ink.SERIF, r * 1.3, true);
                    ctx.fillStyle = Barwa.Rgba(222, 214, 186, 0.96 * kN);
                    ctx.fillText("Droga w dół stoi otworem.", cx, plate.y + plate.h - pas / 2);
                }
            }
            ctx.restore();
        }

        // ───────────── trup (świat, między mrokiem i pomnikiem — jak boss za życia) ─────────────

        /// <summary>Krycie trupa 1 → 0 w `C.TrupRozsypMs` (po `Skrot`), null — nie ma czego rysować.</summary>
        static double? AlfaTrupa(double teraz)
        {
            if (trup == null || pominieta || Scena != "smierc") return null;
            var t = teraz - od;
            var dl = C.TrupRozsypMs * Skrot("smierc");
            if (t >= dl) return null;
            return 1 - Gladko(t / dl);
        }

        /// <summary>Trup Cerbera po śmierci (sim już go nie rysuje — martwe stworzenia pomija): rozsypuje się w popiół.</summary>
        public static void RysujTrupa(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var a = AlfaTrupa(teraz);
            if (a == null || trup == null) return;
            var z = cam.zoom;
            double sx = cam.toScreenX(trupX), sy = cam.toScreenY(trupY + 1);
            if (sx < -trupH * 2 || sx > cam.vw + trupH * 2 || sy < -trupH * 2 || sy > cam.vh + trupH * 2) return;
            ctx.save();
            ctx.globalAlpha *= a.Value;
            ctx.translate(sx, sy);
            ctx.scale(trupKier, 1);
            RysPomnik.rysujKonajacegoCerbera(ctx, trupH, 1, teraz, trup.glowyOdciete);
            ctx.restore();
            // z popiołu co jakiś czas odrywa się iskra żaru — gasnącego ogniska, nie świeżego ciosu
            if (Czasteczki.Zywych < VisualConfig.Uderzenia.Czasteczek && los(Math.Floor(teraz / 90)) < 0.6)
                Czasteczki.Popiol(trupX + (los(teraz) - 0.5) * 1.4, trupY - 0.4, 0.8, 1);
        }

        static double los(double n)
        {
            var s = Math.Sin(n * 12.9898 + 78.233) * 43758.5453;
            return s - Math.Floor(s);
        }
    }
}
