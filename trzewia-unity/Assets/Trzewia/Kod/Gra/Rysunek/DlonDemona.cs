// Port: alpha-1/src/render/dlon-demona.ts — DŁOŃ Z OTCHŁANI POMAGA DEMONOWI (Alpha, etap 5b), rysunek do
// sim/dlon-demona.ts. Każda akcja ma własny ruch i własną animację dłoni — żadna nie jest zaciskaniem pięści:
//  - RZUT: podłoga pod rycerzem pęka, z rysy bije czerwień, wyrasta dłoń palcami w górę i obejmuje go jak naczynie,
//    unosi z zamachem w tył, a potem wyrzuca w górę — palce rozwierają się gwałtownie, odgięte do tyłu. Rycerz
//    koziołkuje ze smugami pędu, uderza o strop (pył) i spada; leży ogłuszony, nad głową krążą gwiazdki;
//  - TARCZA: z podłogi przed demonem wyrasta otwarta dłoń, wnętrzem do widza, palce rozczapierzone jak mur, i drży z
//    wysiłku; cios w demona trafia w nią — iskry, fala na wnętrzu dłoni, palce drgają;
//  - ZAWAŁ: strop pęka, sypie się pył, przebijają się szpony zagięte w hak, drą skałę szarpnięciami, płaskie uderzenie —
//    i kolumna stropu spada w dół lawiną głazów; zostaje ściana gruzu, a gdy przejdzie jej czas — kruszy się i osypuje.
// Dłoń znika w podłodze albo w stropie (co za brzegiem — tonie w ciemności), a od brzegu bije czerwona łuna otchłani.
//
// Zmiana wobec TS (decyzja użytkownika 12.11): dłoń to model 3D rysowany na żywo (Model3D/Dlon3D.cs), nie klatki
// z arkuszy dlon-rzut/tarcza/zawal.webp. `klatka` (0…1, w TS numer klatki / 9) jest chwilą animacji o tej samej nazwie.
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek.Lud;
using Trzewia.Rysunek.Model3D;
using Trzewia.Symulacja;
using static Trzewia.Nastawy.NastawyDlon;
using static Trzewia.Rdzen.SettingsStore;
using static Trzewia.Symulacja.Tiles;

namespace Trzewia.Rysunek
{
    /// <summary>Rysunek dłoni demona (RysDlonDemona — bo DlonDemona to moduł symulacji).</summary>
    public static class RysDlonDemona
    {
        static Nastawy.Typ_DLON_demon D => DLON.demon;
        static double gladko(double t) { var u = Math.Max(0, Math.Min(1, t)); return u * u * (3 - 2 * u); }

        /// <summary>Tani skrót liczby (stałe kształty pęknięć i głazów).</summary>
        static double los(double n0)
        {
            int n = Js.Js.ToInt32(n0);
            int h = unchecked((n ^ (int)0x9e3779b9) * (int)0x85ebca6b);
            h = unchecked((h ^ (int)((uint)h >> 13)) * (int)0xc2b2ae35);
            return (uint)(h ^ (int)((uint)h >> 16)) / 4294967296.0;
        }

        /// <summary>Kafle świata na jednostkę modelu — osobno dla każdej akcji (krypta jest niska).</summary>
        static double KJ(string akcja) => RysDlon.KAFLE_NA_JEDN * (D.wielkosc[akcja] ?? 1);
        /// <summary>Środek „naczynia” (gdzie siedzi obejmowany rycerz) — jednostki modelu.</summary>
        static readonly (double x, double y) NACZYNIE = (13, -3.5);

        static IPlotno? warstwa;

        /// <summary>
        /// Dłoń wychodząca z podłogi (`zDolu`) albo ze stropu: nadgarstek (ekran) w (sx, sy), palce w kierunku `kat`.
        /// Co jest za brzegiem (`brzegY` na ekranie), tonie w ciemności; od brzegu bije na dłoń czerwień.
        /// </summary>
        static void dlonZBrzegu(IPlotno ctx, string klip, double sx, double sy, double kat, double skala, double klatka,
            double lustro, double alfa, double brzegY, bool zDolu, double luna)
        {
            var zasieg = (RysDlon.ARKUSZ.szer / RysDlon.ARKUSZ.pxNaJedn) * skala;
            double x0 = Math.Floor(sx - zasieg - 20), x1 = Math.Ceiling(sx + zasieg + 20);
            double y0 = Math.Floor(sy - zasieg - 20), y1 = Math.Ceiling(sy + zasieg + 20);
            var m = ctx.getTransform();
            var sc = Math.Sqrt(m.a * m.a + m.b * m.b);
            if (!(sc > 0)) sc = 1;
            sc = Math.Min(sc, 2048 / Math.Max(1, Math.Max(x1 - x0, y1 - y0)));
            int pw = (int)Math.Ceiling((x1 - x0) * sc), ph = (int)Math.Ceiling((y1 - y0) * sc);
            var g = RysDlon.dajWarstwe(ref warstwa, pw, ph);
            // poświata słabsza niż dawniej (0,7) — zjadała kształt dłoni i szpony
            g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
            RysDlon.rysujKlatke(g, Dlon3D.Otchlan, klip, sx, sy, kat, skala, klatka, lustro, 1, Barwa.Rgba(200, 24, 12, 0.45 * luna));
            var sinKat = Math.Sin(kat);
            var brzegX = sx + (brzegY - sy) * Math.Cos(kat) / (sinKat != 0 ? sinKat : 1e-6);
            // za brzegiem dłoń tonie w ciemności…
            var pas = Math.Max(6, skala * 3);
            g.globalCompositeOperation = "destination-out";
            var ciemno = g.createLinearGradient(0, brzegY + (zDolu ? pas * 0.15 : -pas * 0.15), 0, brzegY + (zDolu ? pas : -pas));
            ciemno.addColorStop(0, "rgba(0,0,0,0)");
            ciemno.addColorStop(1, "rgba(0,0,0,1)");
            g.fillStyle = ciemno;
            if (zDolu) g.fillRect(x0, brzegY, x1 - x0, y1 - brzegY); else g.fillRect(x0, y0, x1 - x0, brzegY - y0);
            // …a od brzegu bije na nią czerwień otchłani
            g.globalCompositeOperation = "source-atop";
            var czerwien = g.createLinearGradient(0, brzegY, 0, brzegY + (zDolu ? -pas * 1.6 : pas * 1.6));
            czerwien.addColorStop(0, Barwa.Rgba(170, 22, 10, 0.32 * luna));
            czerwien.addColorStop(1, "rgba(170,22,10,0)");
            g.fillStyle = czerwien;
            g.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.save();
            ctx.globalAlpha *= alfa;
            ctx.drawImage(g, 0, 0, pw, ph, x0, y0, pw / sc, ph / sc);
            ctx.restore();
            // wyszczerbiony brzeg skały, przez który przeszło ramię (zakrywa miejsce, gdzie znika w ciemności)
            wylom(ctx, brzegX, brzegY, skala * 6, pas, zDolu, alfa);
        }

        /// <summary>Wyłom w podłodze (albo w stropie): poszarpana krawędź skały wokół ramienia i bryły przy niej.</summary>
        static void wylom(IPlotno ctx, double x, double y, double szer, double pas, bool zDolu, double alfa)
        {
            double k = zDolu ? 1 : -1;
            ctx.save();
            ctx.globalAlpha *= Math.Min(1, alfa * 1.5);
            ctx.fillStyle = "#1a120e";
            ctx.strokeStyle = "rgba(200,170,140,0.55)";
            ctx.lineWidth = Math.Max(1, pas * 0.08);
            ctx.beginPath();
            ctx.moveTo(x - szer * 0.75, y + k * pas * 0.05);
            for (int i = 0; i <= 10; i++)
            {
                var t = i / 10.0;
                var zab = (los(i + 500) - 0.5) * pas * 0.35 + (i % 2 != 0 ? -1 : 1) * pas * 0.12;
                ctx.lineTo(x - szer * 0.75 + szer * 1.5 * t, y - k * (Math.Sin(t * Math.PI) * pas * 0.22 + zab));
            }
            ctx.lineTo(x + szer * 0.75, y + k * pas * 0.35);
            ctx.lineTo(x - szer * 0.75, y + k * pas * 0.35);
            ctx.closePath();
            var ciemne = ctx.createLinearGradient(0, y - k * pas * 0.3, 0, y + k * pas * 0.35);
            ciemne.addColorStop(0, "rgba(26,18,14,0.95)"); ciemne.addColorStop(1, "rgba(26,18,14,0)");
            ctx.fillStyle = ciemne;
            ctx.fill();
            // ramię znika w ciemnej szczelinie (czerwony żar z głębi)
            var g = ctx.createLinearGradient(0, y, 0, y + k * pas);
            g.addColorStop(0, "rgba(120,16,8,0.6)"); g.addColorStop(1, "rgba(40,4,2,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x - szer * 0.45, Math.Min(y, y + k * pas), szer * 0.9, pas);
            // jasna krawędź przełomu
            ctx.beginPath();
            for (int i = 0; i <= 10; i++)
            {
                var t = i / 10.0;
                var zab = (los(i + 500) - 0.5) * pas * 0.35 + (i % 2 != 0 ? -1 : 1) * pas * 0.12;
                double px = x - szer * 0.75 + szer * 1.5 * t, py = y - k * (Math.Sin(t * Math.PI) * pas * 0.22 + zab);
                if (i == 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            // bryły odłupane przy krawędzi
            for (int i = 0; i < 5; i++)
            {
                double bx = x + (los(i + 520) - 0.5) * szer * 1.6, by = y - k * pas * (0.1 + los(i + 530) * 0.25);
                var r = pas * (0.15 + los(i + 540) * 0.15);
                ctx.fillStyle = i % 2 != 0 ? "#4a4038" : "#6a5e52";
                ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.lineTo(bx - r * 0.2, by - r); ctx.lineTo(bx + r, by - r * 0.3); ctx.lineTo(bx + r * 0.6, by + r * 0.6); ctx.closePath();
                ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Rysa w podłodze albo w stropie: promieniste pęknięcia z czerwonym żarem (`k` — jak bardzo rozwarta, 0…1).</summary>
        static void rysa(IPlotno ctx, double x, double y, double z, double k, double ziarno, bool wDol)
        {
            if (k <= 0.01) return;
            ctx.save();
            ctx.lineCap = "round";
            double kier = wDol ? 1 : -1;
            foreach (var (kolor, gr) in new (Styl, double)[] { ("rgba(10,4,3,0.95)", Math.Max(2, z * 0.16)), (Barwa.Rgba(255, 80, 40, 0.8 * k), Math.Max(1, z * 0.06)) })
            {
                ctx.strokeStyle = kolor; ctx.lineWidth = gr;
                ctx.beginPath();
                for (int i = 0; i < 7; i++)
                {
                    var a = (i / 7.0) * Math.PI + (los(ziarno + i) - 0.5) * 0.4;
                    var dl = z * (0.8 + los(ziarno + i * 3) * 1.6) * k;
                    double px = x, py = y;
                    ctx.moveTo(px, py);
                    for (int j = 1; j <= 3; j++)
                    {
                        px = x + Math.Cos(a) * dl * j / 3 + (los(ziarno + i * 7 + j) - 0.5) * z * 0.3;
                        py = y + kier * Math.Sin(a) * dl * 0.25 * j / 3;
                        ctx.lineTo(px, py);
                    }
                }
                ctx.stroke();
            }
            // żar z rysy
            ctx.globalCompositeOperation = "lighter";
            var r = z * 2.2 * k;
            var g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, Barwa.Rgba(255, 70, 30, 0.4 * k)); g.addColorStop(1, "rgba(255,40,20,0)");
            ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
        }

        /// <summary>Odłamki: wyrzucone z rysy (w górę) albo sypiące się ze stropu (w dół); `k` 0…1 od początku.</summary>
        static void odlamki(IPlotno ctx, double x, double y, double z, double k, double ziarno, bool wGore, int ile = 10)
        {
            if (k <= 0 || k >= 1) return;
            ctx.save();
            for (int i = 0; i < ile; i++)
            {
                var vx = (los(ziarno + i) - 0.5) * z * 4;
                var vy = (wGore ? -1 : 0.2) * z * (2 + los(ziarno + i * 5) * 3);
                var g = z * 9;
                var t = k * (0.8 + los(ziarno + i * 9) * 0.4);
                double px = x + vx * t, py = y + vy * t + g * t * t * 0.5;
                var r = Math.Max(1.2, z * (0.08 + los(ziarno + i * 2) * 0.12));
                ctx.fillStyle = Barwa.Rgba(90 + (i % 3) * 20, 80 + (i % 3) * 15, 70 + (i % 3) * 12, 1 - k * 0.7);
                ctx.beginPath();
                ctx.moveTo(px - r, py); ctx.lineTo(px, py - r * 0.8); ctx.lineTo(px + r, py + r * 0.2); ctx.lineTo(px + r * 0.1, py + r);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Obłok pyłu.</summary>
        static void pyl(IPlotno ctx, double x, double y, double r, double a)
        {
            if (a <= 0.01) return;
            var g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, Barwa.Rgba(150, 135, 118, 0.5 * a)); g.addColorStop(1, "rgba(150,135,118,0)");
            ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        /// <summary>Główny rysunek — po postaciach i po mroku (dłoń jest nad nimi).</summary>
        public static void rysujDlonDemona(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var s = sim.lud.dlonDemona;
            if (s == null) return;
            var z = cam.zoom;
            var ruch = !ustawienia.ograniczRuch;
            // ściana gruzu po zawale (i jej kruszenie) — także gdy dłoni już nie ma
            if (s.sciana != null) scianaGruzu(ctx, sim, cam, teraz);
            // ogłuszeni: gwiazdki nad głową; w locie — smugi pędu
            foreach (var c in sim.creatures)
            {
                if (c.dead) continue;
                if ((c.ogluszonyDo ?? -1) > sim.tick) gwiazdki(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 1), Figury.wysokoscPostaci(c, z), c.face >= 0 ? 1 : -1, teraz, ruch);
                if (c.lot != null) smugiPedu(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y + 0.4), z, c.lot.vx, c.lot.vy, sim.tick - c.lot.od);
                if (c.lot?.stropT != null && sim.tick - c.lot.stropT.Value < 40)
                {
                    var k = (sim.tick - c.lot.stropT.Value) / 40;
                    odlamki(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y - 1.4), z, k, c.id * 13, false, 8);
                    pyl(ctx, cam.toScreenX(c.x), cam.toScreenY(c.y - 1.4), z * (1 + k * 2), 1 - k);
                }
            }
            if (s.akcja == null) return;
            var t = sim.tick - s.od;
            var skala = z * KJ(s.akcja);
            if (s.akcja == "rzut") rysujRzut(ctx, sim, cam, s, t, skala, teraz, ruch);
            else if (s.akcja == "tarcza") rysujTarcze(ctx, sim, cam, s, t, skala, teraz, ruch);
            else rysujZawal(ctx, sim, cam, s, t, skala, teraz, ruch);
        }

        /// <summary>Rzut: dłoń wyrasta pod rycerzem, obejmuje go, unosi z zamachem i wyrzuca w górę.</summary>
        static void rysujRzut(IPlotno ctx, Sim sim, Camera cam, StanDloniDemona s, double t, double skala, double teraz, bool ruch)
        {
            var z = cam.zoom;
            var R = D.rzut;
            double fx = cam.toScreenX(s.x), fy = cam.toScreenY(s.y);
            var r = sim.creatureById(s.cel ?? -1);
            var lustro = -s.bok;
            // gdzie rycerz (pas) — tam środek naczynia
            var pas = r != null && r.wDloni == true
                ? (x: cam.toScreenX(r.x), y: cam.toScreenY(r.y + 1) - Figury.wysokoscPostaci(r, z) * 0.42)
                : (x: fx, y: fy - z * 1.2);
            double kat = -Math.PI / 2, klatka = 0, glebiej = 0, alfa = 1, luna = 1;
            double rysaK = 1;
            if (s.faza == "wstaje")
            {
                // wyrasta obok rycerza (od strony demona), otwarta, cała nad podłogą — nadgarstek tuż pod nią
                var k = t / R.wstaje;
                glebiej = (1 - gladko(k)) * z * 6;
                klatka = 0;
                var bx = fx - s.bok * z * 1.6;
                RysDlon.lunaOtchlani(ctx, fx, fy, z * 4, 0, gladko(k / 0.3), teraz, ruch);
                rysa(ctx, bx, fy, z, gladko(k / 0.4), 51, true);
                odlamki(ctx, bx, fy, z, k, 77, true, 12);
                dlonZBrzegu(ctx, "rzut", bx, fy + z * 0.3 + glebiej, kat + (ruch ? Math.Sin(t * 0.08) * 0.04 * (1 - k) : 0), skala, 0, lustro, 1, fy, true, gladko(k / 0.3));
                return;
                // (w TS po return zostały trzy martwe wiersze: rysaK, luna, kat — nieosiągalne, pominięte)
            }
            else if (s.faza == "chwyta")
            {
                klatka = gladko(t / R.chwyta) * 5 / 9;
            }
            else if (s.faza == "unosi")
            {
                var k = t / R.unosi;
                klatka = 5.0 / 9;
                kat += -s.bok * 0.35 * Math.Sin(Math.Min(1, k) * Math.PI * 0.5);
            }
            else if (s.faza == "rzuca")
            {
                var k = gladko(t / R.rzuca);
                klatka = (5 + 4 * k) / 9;
                kat += -s.bok * 0.35 + s.bok * 0.9 * k;
            }
            else
            {
                var k = t / R.cofa;
                klatka = 1;
                kat += s.bok * 0.55 * (1 - gladko(k / 0.4));
                glebiej = gladko(k) * z * 7;
                alfa = 1 - gladko((k - 0.65) / 0.35);
                luna = 1 - gladko(k);
                rysaK = 1 - gladko((k - 0.5) / 0.5);
            }
            // nadgarstek: tak, żeby środek naczynia wypadł na pasie rycerza (w fazie „cofa” — tam, gdzie go puściła)
            double c = Math.Cos(kat), sn = Math.Sin(kat);
            double ox = NACZYNIE.x * skala, oy = -NACZYNIE.y * skala * lustro;
            var naEkr = (x: ox * c - oy * sn, y: ox * sn + oy * c);
            // chwyta: z miejsca obok rycerza dosuwa się do niego (w dwóch trzecich fazy już obejmuje)
            var cel = s.faza == "cofa" || r == null ? (x: fx, y: fy - z * 3.4) : pas;
            if (s.faza == "chwyta")
            {
                var u = gladko(t / (R.chwyta * 0.66));
                var start = (x: fx - s.bok * z * 1.6 + naEkr.x, y: fy + z * 0.3 + naEkr.y);
                cel = (start.x + (pas.x - start.x) * u, start.y + (pas.y - start.y) * u);
            }
            double wx = cel.x - naEkr.x, wy = cel.y - naEkr.y + glebiej;
            // rysa i łuna tam, gdzie ramię przechodzi przez podłogę
            var rx = wx + (fy - wy) * Math.Cos(kat) / (sn != 0 ? sn : 1e-6);
            RysDlon.lunaOtchlani(ctx, rx, fy, z * 4, 0, luna, teraz, ruch);
            rysa(ctx, rx, fy, z, rysaK, 51, true);
            dlonZBrzegu(ctx, "rzut", wx, wy, kat, skala, klatka, lustro, alfa, fy, true, Math.Min(1, luna));
            // wyrzut: smuga powietrza nad dłonią, gdy palce się rozwierają
            if (s.faza == "rzuca")
            {
                var k = t / R.rzuca;
                ctx.save();
                ctx.strokeStyle = Barwa.Rgba(255, 220, 200, 0.5 * Math.Sin(k * Math.PI));
                ctx.lineWidth = Math.Max(1.5, z * 0.08); ctx.lineCap = "round";
                for (int i = -1; i <= 1; i++)
                {
                    ctx.beginPath(); ctx.moveTo(pas.x + i * z * 0.6, pas.y + z * 0.8); ctx.lineTo(pas.x + i * z * 0.4 + s.bok * z * 0.8, pas.y - z * 1.6); ctx.stroke();
                }
                ctx.restore();
            }
        }

        /// <summary>Tarcza: otwarta dłoń wyrasta z podłogi przed demonem, wnętrzem do widza, i drży — ciosy się od niej odbijają.</summary>
        static void rysujTarcze(IPlotno ctx, Sim sim, Camera cam, StanDloniDemona s, double t, double skala, double teraz, bool ruch)
        {
            var z = cam.zoom;
            var T = D.tarcza;
            double fx = cam.toScreenX(s.x), fy = cam.toScreenY(s.y);
            double klatka = 5.0 / 9, glebiej = 0, alfa = 1, luna = 1, rysaK = 1;
            if (s.faza == "wstaje")
            {
                var k = t / T.wstaje;
                glebiej = (1 - gladko(k / 0.8)) * z * 6.5;
                klatka = gladko(k) * 5 / 9;
                rysaK = gladko(k / 0.35);
                luna = gladko(k / 0.3);
            }
            else if (s.faza == "stoi")
            {
                // drży z wysiłku (mur ↔ napięcie); trafiona — palce drgają
                var odb1 = sim.tick - (s.odbicieT ?? -1e9);
                klatka = odb1 < 18 ? 8.0 / 9 : odb1 < 34 ? 7.0 / 9 : (ruch && Math.Sin(teraz * 0.02) > 0.3 ? 6.0 / 9 : 5.0 / 9);
            }
            else
            {
                var k = t / T.cofa;
                klatka = (1 - gladko(k)) * 5 / 9;
                glebiej = gladko(k) * z * 7;
                alfa = 1 - gladko((k - 0.6) / 0.4);
                luna = 1 - gladko(k);
                rysaK = 1 - gladko((k - 0.4) / 0.6);
            }
            RysDlon.lunaOtchlani(ctx, fx, fy, z * 3.5, 0, luna, teraz, ruch);
            rysa(ctx, fx, fy, z, rysaK, 91, true);
            if (s.faza == "wstaje") odlamki(ctx, fx, fy, z, t / T.wstaje, 97, true, 10);
            var drz = ruch && s.faza == "stoi" ? Math.Sin(teraz * 0.05) * z * 0.03 : 0;
            var kat = -Math.PI / 2 + (ruch && s.faza == "stoi" ? Math.Sin(teraz * 0.004) * 0.03 : 0);
            // tarcza: czerwona łuna otchłani za dłonią, póki stoi (dawniej różowa elipsa — jak znacznik zaznaczenia); trafiona —
            // łuna rozbłyska i sypią się iskry. Łuna leży pod dłonią: nałożona na wierzch zalewała ją czerwienią
            if (s.faza == "stoi")
            {
                var odb0 = sim.tick - (s.odbicieT ?? -1e9);
                double px = fx + s.bok * z * 0.4, py = fy - z * 1.9;
                var bl = odb0 < 40 ? 1 - odb0 / 40 : 0;
                var RR = z * (2.8 + 1.2 * bl);
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                var g = ctx.createRadialGradient(px, py, z * 0.4, px, py, RR);
                g.addColorStop(0, Barwa.Rgba(255, 70, 36, 0.14 + 0.08 * Math.Sin(teraz * 0.006) + 0.35 * bl));
                g.addColorStop(1, "rgba(200,30,16,0)");
                ctx.fillStyle = g; ctx.fillRect(px - RR, py - RR, RR * 2, RR * 2);
                ctx.restore();
            }
            // nadgarstek pod podłogą — wnętrze dłoni i palce nad nią
            dlonZBrzegu(ctx, "tarcza", fx + drz, fy + z * 0.3 + glebiej, kat, skala, klatka, s.bok, alfa, fy, true, Math.Min(1, luna));
            var odb = sim.tick - (s.odbicieT ?? -1e9);
            walczacyPrzedDlonia(ctx, sim, cam, s.x, 3, teraz);
            if (s.faza == "stoi" && odb < 40)
            {
                var k = odb / 40;
                double px = fx, py = fy - z * 1.8;
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                for (int i = 0; i < 8; i++)
                {
                    double a = los(odb + i) * Math.PI * 2, d = z * (0.3 + k * 1.6) * (0.6 + los(i + 5));
                    ctx.fillStyle = Barwa.Rgba(255, 230, 180, 1 - k);
                    ctx.fillRect(px + Math.Cos(a) * d + s.bok * z * 0.8, py + Math.Sin(a) * d, Math.Max(1.5, z * 0.1), Math.Max(1.5, z * 0.1));
                }
                ctx.restore();
            }
        }

        /// <summary>
        /// Walczący przy tarczy — rysowani raz jeszcze, przed dłonią: tarcza stoi między nimi a demonem, a rycerz bije w jej
        /// wnętrze (dawniej chował się za dłonią i wystawał mu tylko miecz).
        /// </summary>
        static void walczacyPrzedDlonia(IPlotno ctx, Sim sim, Camera cam, double x, double zasieg, double teraz)
        {
            var z = cam.zoom;
            if (z < 9) return;            // z daleka postacie są zgrupowane (figury.ts) — pojedynczej nie dorysowujemy
            foreach (var c in sim.creatures)
            {
                if (c.dead || c.straznik == true || c.lot != null || c.wDloni == true || !Symulacja.Lud.walczacy(c) || Math.Abs(c.x - x) > zasieg) continue;
                var h = Figury.wysokoscPostaci(c, z);
                ctx.save();
                ctx.translate(cam.toScreenX(c.x + Rozstep.przesuniecieX(c)), cam.toScreenY(c.y + 1));
                ctx.scale(c.face >= 0 ? 1 : -1, 1);
                Oswietlenie.ustawSwiatlo(Oswietlenie.swiatloDla(sim, c, h / z));
                Figury.rysujPostac(ctx, sim, c, h, teraz);
                Oswietlenie.ustawSwiatlo(null);
                ctx.restore();
            }
        }

        /// <summary>Zawał: szpony przebijają strop, drą skałę, płaskie uderzenie — strop zawala się w ścianę gruzu.</summary>
        static void rysujZawal(IPlotno ctx, Sim sim, Camera cam, StanDloniDemona s, double t, double skala, double teraz, bool ruch)
        {
            var z = cam.zoom;
            var Z = D.zawal;
            var strop = (s.strop ?? s.y) + 1;
            double cx = cam.toScreenX(s.x + Z.szer / 2), cy = cam.toScreenY(strop);
            var wys = ((s.dno ?? strop + 4) - strop) * z;
            double klatka = 0, wyzej = 0, alfa = 1, luna = 1, rysaK = 1, szarp = 0;
            if (s.faza == "wstaje")
            {
                var k = t / Z.wstaje;
                wyzej = (1 - gladko(k)) * z * 6;
                klatka = gladko(k) * 3 / 9;
                rysaK = gladko(k / 0.35);
                luna = gladko(k / 0.3);
            }
            else if (s.faza == "drze")
            {
                var k = t / Z.drze;
                klatka = (3 + 2 * gladko(k)) / 9;
                // szarpnięcia: szpony wbite w skałę, ciągną w dół
                szarp = ruch ? Math.Max(0, Math.Sin(t * 0.25)) * z * 0.35 : 0;
                wyzej = -z * 0.6 * k;
            }
            else if (s.faza == "wali")
            {
                var k = t / Z.wali;
                klatka = (6 + 3 * gladko(k)) / 9;
                wyzej = -z * 0.6 + z * 1.4 * gladko(k);       // płaskie uderzenie w górę, w strop
            }
            else
            {
                var k = t / Z.cofa;
                klatka = 1;
                wyzej = z * 0.8 + gladko(k) * z * 6;
                alfa = 1 - gladko((k - 0.55) / 0.45);
                luna = 1 - gladko(k);
                rysaK = 1 - gladko(k);
            }
            RysDlon.lunaOtchlani(ctx, cx, cy, z * 3, Math.PI, luna * 0.8, teraz, ruch);
            rysa(ctx, cx, cy, z, rysaK, 131, false);
            // szpony drą strop: cztery równoległe, skośne bruzdy w skale nad przejściem, żarzące się w głębi
            // (dawniej jedna pozioma czerwona kreska)
            if (s.faza == "drze" || s.faza == "wali" || (s.faza == "cofa" && rysaK > 0.05))
            {
                var ile = s.faza == "drze" ? Math.Min(1, t / 25) : 1;
                ctx.save();
                ctx.lineCap = "round";
                for (int i = 0; i < 4; i++)
                {
                    double ox = cx + (i - 1.5) * z * 0.55 * -s.bok, oy = cy - z * 0.25;
                    double ex = ox + s.bok * z * 0.8 * ile, ey = oy - z * 1.2 * ile;
                    foreach (var (kol, gr) in new (Styl, double)[] { ("rgba(206,186,160,0.35)", Math.Max(2.4, z * 0.24)), ("rgba(8,4,3,0.9)", Math.Max(1.6, z * 0.15)), (Barwa.Rgba(200, 60, 30, 0.35 * rysaK), Math.Max(0.8, z * 0.04)) })
                    {
                        ctx.strokeStyle = kol; ctx.lineWidth = gr;
                        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo((ox + ex) / 2 + s.bok * z * 0.2, (oy + ey) / 2, ex, ey); ctx.stroke();
                    }
                }
                ctx.restore();
            }
            // ze stropu sypie się: przy przebiciu i przy każdym szarpnięciu
            if (s.faza == "wstaje") odlamki(ctx, cx, cy, z, t / Z.wstaje, 141, false, 10);
            if (s.faza == "drze") { odlamki(ctx, cx, cy, z, (t % 30) / 30, 151 + Math.Floor(t / 30), false, 6); pyl(ctx, cx, cy + z * 0.5, z * 1.5, 0.5); }
            {
                // nadgarstek nad stropem, palce w dół (szpony zagięte w hak)
                var kat = Math.PI / 2 + (ruch ? Math.Sin(teraz * 0.006) * 0.03 : 0);
                dlonZBrzegu(ctx, "zawal", cx, cy - z * 0.3 - wyzej + szarp, kat, skala, klatka, -s.bok, alfa, cy, false, Math.Min(1, luna));
            }
            // płaskie uderzenie: lawina głazów spada w dół kolumny i wznosi się pył
            if (s.faza == "wali" || (s.faza == "cofa" && t < 50))
            {
                var k = s.faza == "wali" ? t / Z.wali * 0.4 : 0.4 + (t / 50) * 0.6;
                ctx.save();
                for (int i = 0; i < 16; i++)
                {
                    var gx = cx + (los(i + 300) - 0.5) * Z.szer * z * 1.1;
                    var opoz = los(i + 310) * 0.4;
                    var kk = Math.Max(0, Math.Min(1, (k - opoz) / 0.6));
                    var gy = cy + kk * kk * wys;
                    var r = z * (0.25 + los(i + 320) * 0.3);
                    ctx.fillStyle = i % 2 != 0 ? "#6e6458" : "#4e463e";
                    ctx.strokeStyle = "rgba(20,14,10,0.9)"; ctx.lineWidth = Math.Max(1, z * 0.06);
                    ctx.beginPath();
                    for (int j = 0; j < 5; j++) { var a = (j / 5.0) * Math.PI * 2 + los(i * 7 + j); ctx.lineTo(gx + Math.Cos(a) * r, gy + Math.Sin(a) * r * 0.8); }
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                }
                pyl(ctx, cx, cy + wys * 0.6, z * (2 + k * 3), 1 - k * 0.6);
                ctx.restore();
            }
        }

        /// <summary>Ściana gruzu po zawale: głazy ułożone od podłogi do stropu; gdy przejdzie jej czas — pękają i osypują się.</summary>
        static void scianaGruzu(IPlotno ctx, Sim sim, Camera cam, double teraz)
        {
            var sc = sim.lud.dlonDemona!.sciana!;
            var w = sim.world;
            var z = cam.zoom;
            var kr = sc.kruszy != null ? Math.Min(1, (sim.tick - sc.kruszy.Value) / D.zawal.kruszy) : 0;
            ctx.save();
            ctx.lineJoin = "round";
            var tony = new[] { "#7a6f62", "#5e554b", "#6c6156", "#544b42", "#857a6c" };
            foreach (var i in sc.kafle)
            {
                if (w.tile[i] != T.ROCK && kr == 0) continue;      // rozkute — puste
                double x = i % w.w, y = Math.Floor(i / w.w);
                // ciemne tło między kamieniami: ubita ściana, nie stos żetonów
                if (kr == 0) { ctx.fillStyle = "rgba(30,24,20,0.95)"; ctx.fillRect(cam.toScreenX(x) - z * 0.1, cam.toScreenY(y), z * 1.2, z); }
                for (int j = 0; j < 4; j++)
                {
                    var n = i * 4 + j;
                    // kamienie różnej wielkości i kształtu (płyty, bryły), wychodzą trochę poza kafel i zachodzą na sąsiadów
                    double gx = cam.toScreenX(x + 0.15 + los(n) * 0.7), gy0 = cam.toScreenY(y + 0.15 + los(n + 1) * 0.7);
                    var opoz = los(n + 2) * 0.5;
                    var kk = Math.Max(0, Math.Min(1, (kr - opoz) / 0.5));
                    var gy = gy0 + kk * kk * z * 3;
                    var r = z * (0.2 + los(n + 3) * 0.26) * (1 - kk * 0.4);
                    var plaski = los(n + 4) < 0.4 ? 0.55 : 0.85;
                    ctx.globalAlpha = 1 - kk;
                    ctx.fillStyle = tony[(int)Math.Floor(los(n + 5) * tony.Length)];
                    ctx.strokeStyle = "rgba(18,12,8,0.95)"; ctx.lineWidth = Math.Max(1, z * 0.06);
                    ctx.beginPath();
                    int ile = 5 + (int)Math.Floor(los(n + 6) * 3); var obr = los(n + 7) * 3;
                    for (int q = 0; q < ile; q++) { var a = obr + (q / (double)ile) * Math.PI * 2 + los(n * 5 + q) * 0.5; var rr = r * (0.7 + los(n * 11 + q) * 0.45); ctx.lineTo(gx + Math.Cos(a) * rr * 1.2, gy + Math.Sin(a) * rr * plaski); }
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                    if (kr > 0 && kk < 1)
                    {
                        ctx.strokeStyle = "rgba(10,6,4,0.9)";
                        ctx.beginPath(); ctx.moveTo(gx - r * 0.5, gy - r * 0.3); ctx.lineTo(gx + r * 0.1, gy + r * 0.2); ctx.lineTo(gx + r * 0.5, gy - r * 0.1); ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
            // żarzące się szczeliny — gruz zawalony przez otchłań
            if (kr < 1)
            {
                ctx.globalCompositeOperation = "lighter";
                var tl = 0.5 + 0.5 * Math.Sin(teraz * 0.004);
                for (int k = 0; k < 4; k++)
                {
                    double gx = cam.toScreenX(sc.x + los(k + 400) * D.zawal.szer), gy = cam.toScreenY(sc.strop + 1 + los(k + 410) * (sc.dno - sc.strop - 1));
                    var r = z * 0.7 * (0.6 + 0.4 * tl) * (1 - kr);
                    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
                    g.addColorStop(0, "rgba(255,90,40,0.45)"); g.addColorStop(1, "rgba(255,50,20,0)");
                    ctx.fillStyle = g; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
                }
            }
            ctx.restore();
            if (kr > 0 && kr < 1) pyl(ctx, cam.toScreenX(sc.x + 1), cam.toScreenY(sc.dno - 0.5), z * (1.5 + kr * 2), 1 - kr);
        }

        /// <summary>Gwiazdki krążące nad głową ogłuszonego (leży — głowa z boku).</summary>
        static void gwiazdki(IPlotno ctx, double sx, double sy, double h, double kier, double teraz, bool ruch)
        {
            double hx = sx - kier * h * 1.1, hy = sy - h * 0.55;
            ctx.save();
            ctx.fillStyle = "rgba(255,226,140,0.95)";
            ctx.shadowColor = "rgba(255,210,120,0.9)"; ctx.shadowBlur = 6;
            for (int i = 0; i < 3; i++)
            {
                var a = (ruch ? teraz * 0.006 : 0) + (i / 3.0) * Math.PI * 2;
                double x = hx + Math.Cos(a) * h * 0.35, y = hy + Math.Sin(a) * h * 0.1;
                var r = Math.Max(2.5, h * 0.07);
                ctx.beginPath();
                for (int j = 0; j < 10; j++) { var b = (j / 10.0) * Math.PI * 2 - Math.PI / 2; var rr = j % 2 != 0 ? r * 0.4 : r; ctx.lineTo(x + Math.Cos(b) * rr, y + Math.Sin(b) * rr); }
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Smugi pędu za lecącym.</summary>
        static void smugiPedu(IPlotno ctx, double x, double y, double z, double vx, double vy, double t)
        {
            var v = Math.Sqrt(vx * vx + vy * vy);
            if (v < 0.05) return;
            double dx = -vx / v, dy = -vy / v;
            ctx.save();
            ctx.strokeStyle = "rgba(230,220,200,0.45)";
            ctx.lineWidth = Math.Max(1, z * 0.06); ctx.lineCap = "round";
            for (int i = -1; i <= 1; i++)
            {
                double px = x - dy * i * z * 0.5, py = y + dx * i * z * 0.5;
                var dl = z * (1.2 + v * 4) * (0.7 + 0.3 * Math.Sin(t * 0.5 + i));
                ctx.beginPath(); ctx.moveTo(px + dx * z * 0.6, py + dy * z * 0.6); ctx.lineTo(px + dx * dl, py + dy * dl); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Prosta sylwetka rycerza na rycinie atlasu (stopy w 0, 0; `obrot` — koziołkowanie).</summary>
        static void rycerzNaRycinie(IPlotno ctx, double x, double y, double h, double obrot = 0, bool lezy = false)
        {
            ctx.save();
            ctx.translate(x, y);
            if (lezy) { ctx.rotate(-Math.PI / 2); ctx.translate(-h * 0.1, 0); }
            ctx.translate(0, -h * 0.5); ctx.rotate(obrot); ctx.translate(0, h * 0.5);
            ctx.fillStyle = "rgba(30,26,30,0.96)";
            ctx.strokeStyle = "rgba(220,210,190,0.7)"; ctx.lineWidth = Math.Max(1, h * 0.04);
            ctx.beginPath(); ctx.ellipse(0, -h * 0.42, h * 0.16, h * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, -h * 0.84, h * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(210,214,224,0.9)"; ctx.lineWidth = Math.Max(1, h * 0.05);
            ctx.beginPath(); ctx.moveTo(h * 0.12, -h * 0.45); ctx.lineTo(h * 0.42, -h * 0.85); ctx.stroke();
            ctx.restore();
        }

        /// <summary>Pas skały (podłoga albo strop) na rycinie.</summary>
        static void pasSkaly(IPlotno ctx, double w, double y, double h)
        {
            ctx.fillStyle = "#2a211b";
            ctx.fillRect(0, y, w, h);
            ctx.strokeStyle = "rgba(200,170,130,0.55)"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(0, h > 0 ? y : y + h); ctx.lineTo(w, h > 0 ? y : y + h); ctx.stroke();
        }

        /// <summary>
        /// Ryciny atlasu (etap 5b): ta sama dłoń i te same animacje co w grze, w pętli — rzut rycerzem, tarcza przed demonem,
        /// zawał stropu.
        /// </summary>
        public static void rycinaDloniDemona(IPlotno ctx, double w, double h, double t, string akcja)
        {
            ctx.save();
            ctx.fillStyle = "#0d0a09"; ctx.fillRect(0, 0, w, h);
            var z = h / 9;
            var fy = h * 0.84;
            pasSkaly(ctx, w, fy, h - fy);
            if (akcja == "rzut")
            {
                var k = (t % 4600) / 4600;
                var skala = z * KJ("rzut");
                var kx = w * 0.42;
                var ph = z * 3;
                double lustro = 1, bok = -1;
                double unies = 0, klatka = 0, kat = -Math.PI / 2, lot = -1;
                if (k < 0.18) klatka = 0;
                else if (k < 0.36) { var u = (k - 0.18) / 0.18; klatka = gladko(u) * 5 / 9; unies = 1.2 * u * u; }
                else if (k < 0.5) { var u = (k - 0.36) / 0.14; klatka = 5.0 / 9; unies = 1.2 + 0.8 * u; kat += 0.35 * Math.Sin(u * Math.PI / 2); }
                else if (k < 0.56) { var u = (k - 0.5) / 0.06; klatka = (5 + 4 * u) / 9; unies = 2 + 0.6 * u; kat += 0.35 - 0.9 * u; }
                else { klatka = 1; lot = (k - 0.56) / 0.44; kat += -0.55; unies = 2.6; }
                var pas = (x: kx, y: fy - unies * z - ph * 0.42);
                if (k < 0.18)
                {
                    var u = k / 0.18;
                    dlonZBrzegu(ctx, "rzut", kx + bok * z * 1.6, fy + z * 0.3 + (1 - gladko(u)) * z * 6, kat, skala, 0, lustro, 1, fy, true, gladko(u / 0.3));
                }
                else
                {
                    double c = Math.Cos(kat), sn = Math.Sin(kat);
                    double ox = NACZYNIE.x * skala, oy = -NACZYNIE.y * skala * lustro;
                    double cx = pas.x - (ox * c - oy * sn), cy = pas.y - (ox * sn + oy * c);
                    if (lot >= 0) cy += gladko(lot) * z * 7;
                    dlonZBrzegu(ctx, "rzut", cx, cy, kat, skala, klatka, lustro, lot >= 0 ? 1 - gladko((lot - 0.5) / 0.5) : 1, fy, true, 1);
                }
                if (lot < 0) rycerzNaRycinie(ctx, kx, fy - unies * z, ph);
                else if (lot < 0.75)
                {
                    var u = lot / 0.75;
                    double x = kx - bok * u * w * 0.38, y = fy - unies * z - Math.Sin(u * Math.PI) * z * 3.5 + u * unies * z;
                    rycerzNaRycinie(ctx, x, y, ph, u * 7);
                }
                else
                {
                    rycerzNaRycinie(ctx, kx - bok * w * 0.38, fy, ph, 0, true);
                    double hx = kx - bok * w * 0.38 + ph * 0.6, hy = fy - ph * 0.3;
                    ctx.fillStyle = "rgba(255,226,140,0.95)";
                    for (int i = 0; i < 3; i++) { var a = t * 0.006 + i * 2.1; ctx.beginPath(); ctx.arc(hx + Math.Cos(a) * ph * 0.3, hy + Math.Sin(a) * ph * 0.08, Math.Max(2, ph * 0.05), 0, Math.PI * 2); ctx.fill(); }
                }
            }
            else if (akcja == "tarcza")
            {
                var k = (t % 4400) / 4400;
                var skala = z * KJ("tarcza");
                var x = w * 0.5;
                // demon za dłonią (cień z rogami), rycerz przed nią
                ctx.fillStyle = "rgba(70,14,10,0.9)";
                ctx.beginPath(); ctx.ellipse(x - z * 2.6, fy - z * 2.6, z * 1.1, z * 2.6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(x - z * 3, fy - z * 4.8); ctx.quadraticCurveTo(x - z * 3.8, fy - z * 6, x - z * 3.2, fy - z * 6.4); ctx.lineTo(x - z * 2.8, fy - z * 4.9); ctx.fill();
                rycerzNaRycinie(ctx, x + z * 2.4, fy, z * 3);
                double klatka = 5.0 / 9, glebiej = 0, alfa = 1;
                if (k < 0.2) { var u = k / 0.2; glebiej = (1 - gladko(u / 0.8)) * z * 6.5; klatka = gladko(u) * 5 / 9; }
                else if (k > 0.85) { var u = (k - 0.85) / 0.15; klatka = (1 - gladko(u)) * 5 / 9; glebiej = gladko(u) * z * 7; alfa = 1 - gladko((u - 0.6) / 0.4); }
                var uderz = k > 0.25 && k < 0.85 && ((k - 0.25) % 0.15) < 0.03;
                if (uderz) klatka = 8.0 / 9;
                dlonZBrzegu(ctx, "tarcza", x, fy + z * 0.3 + glebiej, -Math.PI / 2, skala, klatka, -1, alfa, fy, true, 1);
                if (uderz)
                {
                    ctx.save(); ctx.globalCompositeOperation = "lighter";
                    ctx.strokeStyle = "rgba(255,140,90,0.8)"; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.ellipse(x, fy - z * 1.8, z * 1.2, z * 1.8, 0, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }
            }
            else
            {
                var k = (t % 5200) / 5200;
                var strop = h * 0.16;
                pasSkaly(ctx, w, strop, -strop);
                var skala = z * KJ("zawal");
                var x = w * 0.5;
                rycerzNaRycinie(ctx, x + z * 3.5, fy, z * 3);
                ctx.fillStyle = "rgba(70,14,10,0.9)";
                ctx.beginPath(); ctx.ellipse(x - z * 3.5, fy - z * 2.4, z * 1, z * 2.4, 0, 0, Math.PI * 2); ctx.fill();
                double klatka = 0, wyzej = 0, alfa = 1, szarp = 0;
                if (k < 0.18) { var u = k / 0.18; wyzej = (1 - gladko(u)) * z * 6; klatka = gladko(u) * 3 / 9; }
                else if (k < 0.38) { var u = (k - 0.18) / 0.2; klatka = (3 + 2 * gladko(u)) / 9; szarp = Math.Max(0, Math.Sin(u * 20)) * z * 0.35; wyzej = -z * 0.6 * u; }
                else if (k < 0.46) { var u = (k - 0.38) / 0.08; klatka = (6 + 3 * u) / 9; wyzej = -z * 0.6 + z * 1.4 * u; }
                else { var u = Math.Min(1, (k - 0.46) / 0.14); klatka = 1; wyzej = z * 0.8 + u * z * 6; alfa = 1 - u; }
                if (alfa > 0.01) dlonZBrzegu(ctx, "zawal", x, strop - z * 0.3 - wyzej + szarp, Math.PI / 2, skala, klatka, 1, alfa, strop, false, 1);
                // gruz: spada przy uderzeniu, stoi, a pod koniec się kruszy
                if (k >= 0.4)
                {
                    var opad = Math.Min(1, (k - 0.4) / 0.1);
                    var kruszy = Math.Max(0, (k - 0.88) / 0.12);
                    for (int i = 0; i < 14; i++)
                    {
                        var gx = x + (los(i + 700) - 0.5) * z * 1.6;
                        var docel = fy - z * 0.45 - (i % 7) * z * 0.85;
                        var gy = strop + (docel - strop) * opad * opad + kruszy * kruszy * z * 2;
                        var r = z * (0.4 + los(i + 710) * 0.15);
                        ctx.globalAlpha = 1 - kruszy;
                        ctx.fillStyle = i % 2 != 0 ? "#6e6458" : "#4e463e";
                        ctx.strokeStyle = "rgba(20,14,10,0.9)"; ctx.lineWidth = 1;
                        ctx.beginPath();
                        for (int j = 0; j < 6; j++) { var a = (j / 6.0) * Math.PI * 2 + los(i * 7 + j); ctx.lineTo(gx + Math.Cos(a) * r, gy + Math.Sin(a) * r * 0.85); }
                        ctx.closePath(); ctx.fill(); ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                    if (opad < 1) pyl(ctx, x, fy - z * 3, z * (2 + opad * 3), 1 - opad * 0.5);
                }
            }
            ctx.restore();
        }
    }
}
