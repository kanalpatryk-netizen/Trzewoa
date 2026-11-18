// Oprawa walki, etap 2 (docs/plan-oprawy-cerber.md): pasek bossa w Kręgu Trzecim (Cerber). Zamiast całego zdania —
//  - duży tytuł (imię bossa), obok mały wskaźnik fali („fala 4/4 · 2 cienie”);
//  - cel jedną linijką („Zetnij Cerberowi trzy głowy — zejdziecie niżej”) przez 5 s od początku walki, potem gaśnie,
//    a rząd się zwija;
//  - trzy paski głów w kolejności ścinania, każdy ze znakiem I / II / III — tym samym, który stoi nad głową na modelu
//    (Visual/Czytelnosc.cs); bieżąca głowa jaśnieje, pusta czeka na miecz i pulsuje czerwienią; pasek ściętej głowy
//    pęka (biały błysk, rysa) i gaśnie, jego połówki rozchodzą się wzdłuż rysy;
//  - pod paskiem mały dymek na pergaminie z instrukcją (najwyżej 2 linijki) — znika po 6 s albo po kliknięciu.
// Czasy z tików gry (5 s celu i 6 s dymku stoją w pauzie — gracz przeczyta je, gdy zamknie kartę). Bez alokacji w klatce:
// napisy stałe albo liczone raz na zmianę liczby.
using System;
using System.Collections.Generic;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Symulacja;
using C = Trzewia.Visual.VisualConfig.Czytelne;
using SG = Trzewia.Nastawy.NastawyKrag;

namespace Trzewia.Visual
{
    public static class PasekBossa
    {
        static readonly string[] NAZWY_GLOW = { "Doberman", "Wilk", "Pitbull" };
        static readonly string[] ZETNIJ = { "Doberman — zetnij!", "Wilk — zetnij!", "Pitbull — zetnij!" };
        const string CEL = "Zetnij Cerberowi trzy głowy — zejdziecie niżej";
        const string KONA = "Cerber kona — droga w dół stoi otworem";
        static readonly string[] DYMEK =
        {
            "Bijcie głowę ze znakiem I — gdy jej pasek opadnie, rycerz zetnie ją mieczem.",
            "Potem II i III. Mnisi na modlitwie osłabiają Cerbera.",
        };
        const double TIKI_NA_S = 120;

        // stan walki: od kiedy (tik) trwa — cel i dymek liczą czas od niego
        static double bossId = double.NaN, tikStartu, ziarno = double.NaN;
        static bool dymekZamkniety;
        /// <summary>Gdzie ostatnio stał dymek (do kliknięcia) — szerokość 0, gdy go nie ma.</summary>
        public static double DymekX, DymekY, DymekW, DymekH;
        /// <summary>Gdzie ostatnio stał panel paska (ekran) — szerokość 0, gdy go nie ma. Etykiety go omijają.</summary>
        public static double PanelX, PanelY, PanelW, PanelH;

        static string tytul = "", tytulZ = "";
        static string fala = "";
        static double falaN = -1, falaZ = -1, falaC = -1;

        /// <summary>Kliknięcie gdziekolwiek w grze zamyka dymek (ekran gry woła to przy każdym wciśnięciu).</summary>
        public static void ZamknijDymek() { if (DymekW > 0) dymekZamkniety = true; }

        static string cienie(double n) => n == 1 ? "1 cień" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? $"{Js.Js.S(n)} cienie" : $"{Js.Js.S(n)} cieni";

        /// <summary>
        /// Rysuje pasek Cerbera nad polem gry (zamiast dawnego zdania). `x`, `szer` — pas, w którego środku stoi;
        /// `y` — góra. Fałsz — nie ma czego rysować (wołający rysuje po staremu).
        /// </summary>
        public static bool Rysuj(IPlotno ctx, Sim sim, double x, double y, double szer, double nrFali, double ileFal, double zwykli, bool kona)
        {
            Creature? boss = null;
            foreach (var c in sim.creatures) if (c.boss == "demon" && (!c.dead || kona)) { boss = c; break; }
            if (boss == null) { DymekW = 0; PanelW = 0; return false; }
            // nowa walka (inny boss albo inna partia): cel i dymek od nowa
            if (boss.id != bossId || sim.seed != ziarno || sim.tick < tikStartu)
            {
                bossId = boss.id; ziarno = sim.seed; tikStartu = sim.tick; dymekZamkniety = false;
            }
            var s = (sim.tick - tikStartu) / TIKI_NA_S * 1000;   // ms walki (czas gry)
            var teraz = Rdzen.Wydajnosc.Teraz();
            var roz = Math.Max(13, Math.Min(18, szer * 0.021));
            var bw = Math.Min(szer, roz * 34);
            var bx = x + szer / 2 - bw / 2;
            var pad = roz * 0.9;

            // napisy liczone raz na zmianę
            var nazwa = Boss.aktywnyBoss().nazwa;
            if (nazwa != tytulZ) { tytulZ = nazwa; tytul = string.Join(" ", nazwa.ToUpperInvariant().ToCharArray()); }
            if (nrFali != falaN || ileFal != falaZ || zwykli != falaC)
            {
                falaN = nrFali; falaZ = ileFal; falaC = zwykli;
                fala = $"fala {Js.Js.S(nrFali)}/{Js.Js.S(ileFal)}" + (zwykli > 0 ? " · " + cienie(zwykli) : "");
            }

            // cel: 5 s, gaśnie przez ostatnie 0,6 s, rząd się zwija; przy konaniu — na stałe zdanie o drodze w dół
            var celW = kona ? 1 : Math.Max(0, Math.Min(1, (C.CelMs - s) / C.CelGasnieMs));
            var celWidac = celW > 0.01;
            double hTytul = roz * 2.2, hCel = roz * 1.5 * (kona ? 1 : Math.Min(1, celW * 1.6)), hPaski = roz * 2.7;
            var bh = pad * 0.5 + hTytul + hCel + hPaski + pad * 0.4;

            PanelX = bx; PanelY = y; PanelW = bw; PanelH = bh;
            ctx.save();
            // panel: ciemna skóra okładki księgi, podwójna złota linia
            ctx.fillStyle = Barwa.Rgba(16, 11, 8, 0.9);
            ctx.fillRect(bx, y, bw, bh);
            ctx.strokeStyle = Barwa.Rgba(214, 166, 96, 0.55); ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, y + 0.5, bw - 1, bh - 1);
            ctx.strokeStyle = Barwa.Rgba(214, 166, 96, 0.22);
            ctx.strokeRect(bx + 3.5, y + 3.5, bw - 7, bh - 7);

            // tytuł
            var yy = y + pad * 0.5 + hTytul * 0.55;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.font = Czytelnosc.Kroj(Ink.SERIF_TYTUL, roz * 1.75);
            ctx.fillStyle = Barwa.Rgba(242, 230, 200, 1);
            ctx.fillText(tytul, x + szer / 2, yy);
            // wskaźnik fali — mały, z prawej
            ctx.font = Czytelnosc.Kroj(Ink.SERIF, roz * 0.74, true);
            ctx.textAlign = "right";
            ctx.fillStyle = Barwa.Rgba(196, 178, 146, 0.85);
            ctx.fillText(fala, bx + bw - pad * 0.7, y + pad * 0.5 + roz * 0.75);
            yy = y + pad * 0.5 + hTytul;

            // cel jedną linijką
            if (celWidac || kona)
            {
                ctx.textAlign = "center";
                ctx.font = Czytelnosc.Kroj(Ink.SERIF, roz * 0.95, true);
                ctx.fillStyle = kona ? Barwa.Rgba(232, 196, 140, 0.95) : Barwa.Rgba(240, 214, 160, 0.95 * celW);
                ctx.fillText(kona ? KONA : CEL, x + szer / 2, yy + hCel * 0.45);
            }
            yy += hCel;

            // trzy paski głów
            var g = Walka.glowyCerbera(boss);
            var czeka = !kona && Walka.glowaCzeka(boss);
            var kol = SG.SCIECIE_GLOW.kolejnosc;
            double odstep = roz * 0.8, kw = (bw - pad * 2 - odstep * 2) / 3;
            for (int k = 0; k < kol.Length && k < 3; k++)
            {
                var nr = (int)kol[k];
                var sciete = kona || k < g.odcietych;
                var biezaca = !kona && k == g.odcietych;
                var u = -1.0;
                if (sciete)
                {
                    u = 1;
                    if (boss.glowyOdciete != null)
                        foreach (var o in boss.glowyOdciete)
                            if ((int)o.nr == nr) { u = Math.Max(0, Math.Min(1, (sim.tick - o.tick) / TIKI_NA_S * 1000 / C.PekniecieMs)); break; }
                }
                var puls = biezaca ? Czytelnosc.Puls(teraz, czeka) : 0;
                komorka(ctx, bx + pad + k * (kw + odstep), yy, kw, roz, k, nr, biezaca, biezaca && czeka, sciete, u, biezaca ? Walka.pasekGlowy(boss, nr) : sciete ? 0 : 1, puls);
            }
            ctx.restore();

            // dymek z instrukcją pod paskiem
            var dymekA = kona || dymekZamkniety ? 0 : Math.Max(0, Math.Min(1, Math.Min(s / 200, (C.DymekMs - s) / 400)));
            if (dymekA > 0.01) dymek(ctx, bx, y + bh + roz * 0.75, bw, roz, dymekA);
            else DymekW = 0;
            return true;
        }

        /// <summary>Rysa przez pasek (ułamki szerokości i wysokości), z góry na dół.</summary>
        static readonly double[] RYSA_X = { 0.46, 0.52, 0.47, 0.55, 0.5, 0.57 }, RYSA_Y = { -0.1, 0.22, 0.42, 0.62, 0.82, 1.1 };

        /// <summary>Jeden pasek głowy: znak, imię nad paskiem, sam pasek (albo jego pęknięte połówki).</summary>
        static void komorka(IPlotno ctx, double x, double y, double w, double roz, int k, int nr, bool biezaca, bool czeka, bool sciete, double u, double f, double puls)
        {
            var r = roz * 0.68;
            double zx = x + r, zy = y + roz * 1.45;
            double px = x + r * 2 + roz * 0.45, pw = w - (px - x), ph = roz * 0.62, py = y + roz * 1.62;
            // imię nad paskiem
            ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
            ctx.font = Czytelnosc.Kroj(Ink.SERIF, roz * 0.84, !biezaca);
            ctx.fillStyle = sciete ? Barwa.Rgba(150, 110, 96, 0.75) : czeka ? Barwa.Rgba(255, 120 + 90 * puls, 90 + 40 * puls, 1)
                : biezaca ? Barwa.Rgba(246, 230, 196, 1) : Barwa.Rgba(200, 186, 158, 0.8);
            var podpis = czeka ? ZETNIJ[nr] : NAZWY_GLOW[nr];
            ctx.fillText(podpis, px, py - roz * 0.3);
            if (sciete)
            {
                var tw = ctx.measureText(podpis).width;
                ctx.strokeStyle = Barwa.Rgba(160, 40, 28, 0.85); ctx.lineWidth = Math.Max(1, roz * 0.08);
                ctx.beginPath(); ctx.moveTo(px - 1, py - roz * 0.58); ctx.lineTo(px + tw + 1, py - roz * 0.58); ctx.stroke();
            }

            if (!sciete)
            {
                ctx.fillStyle = Barwa.Rgba(40, 28, 22, 0.95); ctx.fillRect(px, py, pw, ph);
                if (f > 0)
                {
                    ctx.fillStyle = biezaca ? Barwa.Rgba(200, 56, 38, 1) : Barwa.Rgba(140, 40, 30, 0.9);
                    ctx.fillRect(px, py, pw * f, ph);
                    ctx.fillStyle = biezaca ? Barwa.Rgba(255, 150, 110, 0.45) : Barwa.Rgba(220, 110, 90, 0.25);
                    ctx.fillRect(px, py, pw * f, Math.Max(1, ph * 0.22));
                    ctx.fillStyle = Barwa.Rgba(60, 8, 4, 0.45);
                    ctx.fillRect(px, py + ph * 0.7, pw * f, ph * 0.3);
                }
                ctx.lineWidth = biezaca ? 1.6 : 1;
                ctx.strokeStyle = czeka ? Barwa.Rgba(255, 90 + 80 * puls, 60 + 40 * puls, 0.6 + 0.4 * puls)
                    : biezaca ? Barwa.Rgba(232, 186, 110, 0.9) : Barwa.Rgba(150, 120, 90, 0.5);
                ctx.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1);
            }
            else peknietyPasek(ctx, px, py, pw, ph, roz, u);

            Czytelnosc.ZnakGlowy(ctx, zx, zy, r, k, sciete ? 3 : czeka ? 2 : biezaca ? 1 : 0, puls);
        }

        /// <summary>
        /// Pasek ściętej głowy: `u` 0…1 — przez pierwszą ćwierć biały błysk i rysa rośnie z góry na dół; potem połówki
        /// rozchodzą się wzdłuż rysy i gasną do `PoPeknieciuAlfa`.
        /// </summary>
        static void peknietyPasek(IPlotno ctx, double px, double py, double pw, double ph, double roz, double u)
        {
            double u1 = Math.Min(1, u / 0.25), u2 = Math.Max(0, (u - 0.25) / 0.75);
            var a = 1 - (1 - C.PoPeknieciuAlfa) * u2;
            var rozejscie = u2 * roz * 0.22;
            for (int strona = 0; strona < 2; strona++)
            {
                ctx.save();
                // połówka: od krawędzi paska do rysy
                ctx.beginPath();
                var brzeg = strona == 0 ? px - 2 : px + pw + 2;
                ctx.moveTo(brzeg, py + RYSA_Y[0] * ph);
                for (int i = 0; i < RYSA_X.Length; i++) ctx.lineTo(px + RYSA_X[i] * pw, py + RYSA_Y[i] * ph);
                ctx.lineTo(brzeg, py + RYSA_Y[RYSA_Y.Length - 1] * ph);
                ctx.closePath();
                var dx = (strona == 0 ? -1 : 1) * rozejscie;
                var dy = (strona == 0 ? 1 : -1) * rozejscie * 0.3;
                ctx.translate(dx, dy);
                ctx.clip();
                ctx.globalAlpha = a;
                ctx.fillStyle = Barwa.Rgba(74, 16, 10, 1); ctx.fillRect(px, py, pw, ph);
                ctx.fillStyle = Barwa.Rgba(40, 8, 6, 0.6); ctx.fillRect(px, py + ph * 0.6, pw, ph * 0.4);
                if (u1 < 1)
                {
                    ctx.fillStyle = Barwa.Rgba(255, 236, 210, 0.85 * (1 - u1));
                    ctx.fillRect(px, py, pw, ph);
                }
                ctx.lineWidth = 1;
                ctx.strokeStyle = Barwa.Rgba(150, 70, 50, 0.7);
                ctx.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1);
                ctx.restore();
            }
            // rysa: jasna w błysku, potem ciemna szczelina
            var ile = 1 + (int)Math.Floor(u1 * (RYSA_X.Length - 1) + 1e-9);
            ctx.save();
            ctx.lineJoin = "round"; ctx.lineCap = "round";
            ctx.strokeStyle = u1 < 1 ? Barwa.Rgba(255, 240, 210, 1) : Barwa.Rgba(10, 4, 2, 0.9 * a);
            ctx.lineWidth = Math.Max(1.2, roz * 0.1) + (u1 < 1 ? 0 : rozejscie);
            ctx.beginPath();
            ctx.moveTo(px + RYSA_X[0] * pw, py + RYSA_Y[0] * ph);
            for (int i = 1; i < Math.Min(ile, RYSA_X.Length); i++) ctx.lineTo(px + RYSA_X[i] * pw, py + RYSA_Y[i] * ph);
            ctx.stroke();
            ctx.restore();
        }

        static readonly double[] szerLinii = new double[2];

        /// <summary>Mały dymek na pergaminie pod paskiem, z dzióbkiem ku paskowi; pismo księgi, najwyżej 2 linijki.</summary>
        static void dymek(IPlotno ctx, double bx, double y, double bw, double roz, double a)
        {
            ctx.save();
            var px = roz * 0.92;
            ctx.font = Czytelnosc.Kroj(Ink.SERIF_PISMO, px);
            double naj = 0;
            for (int i = 0; i < DYMEK.Length; i++) { szerLinii[i] = ctx.measureText(DYMEK[i]).width; naj = Math.Max(naj, szerLinii[i]); }
            var max = bw - roz * 1.6;
            if (naj > max) { px *= max / naj; naj = max; ctx.font = Czytelnosc.Kroj(Ink.SERIF_PISMO, px); }
            double pad = roz * 0.7, dw = naj + pad * 2, dh = px * 1.3 * DYMEK.Length + pad * 1.1;
            var dx = bx + bw - dw;
            DymekX = dx; DymekY = y; DymekW = dw; DymekH = dh;
            ctx.globalAlpha = a;
            // cień, pergamin, dzióbek ku paskowi (nad prawą częścią — tam stoją paski)
            ctx.fillStyle = Barwa.Rgba(0, 0, 0, 0.35);
            Czytelnosc.zaokraglony(ctx, dx + 2, y + 3, dw, dh, roz * 0.4); ctx.fill();
            ctx.fillStyle = Czytelnosc.Pergamin(0.97);
            Czytelnosc.zaokraglony(ctx, dx, y, dw, dh, roz * 0.4); ctx.fill();
            var dzx = dx + dw * 0.7;
            ctx.beginPath(); ctx.moveTo(dzx - roz * 0.5, y + 0.5); ctx.lineTo(dzx, y - roz * 0.6); ctx.lineTo(dzx + roz * 0.5, y + 0.5); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = Barwa.Rgba(120, 86, 50, 0.8); ctx.lineWidth = 1;
            Czytelnosc.zaokraglony(ctx, dx + 0.5, y + 0.5, dw - 1, dh - 1, roz * 0.4); ctx.stroke();
            ctx.fillStyle = Czytelnosc.Atrament(0.95);
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            for (int i = 0; i < DYMEK.Length; i++) ctx.fillText(DYMEK[i], dx + pad, y + pad * 0.55 + px * 1.3 * (i + 0.5));
            ctx.restore();
        }
    }
}
