// Oprawa walki, etap 7b (docs/plan-oprawy-cerber.md; użytkownik 22.11, film 3:42): przerywniki ścięcia głów Cerbera —
// trzy krótkie filmy w stylu filmu wstępu (te same narzędzia: kadr 2:1, ziarno, winieta, napisy kursywą, Cerber z wypieku
// modeli, rycerz z arkusza „Ścięcia głowy” gry). Każdy pokazuje chwilę PRZED cięciem i urywa się na mieczu w górze —
// samo cięcie i spadająca głowa są już w grze, która rusza od skoku rycerza (Visual/PrzerywnikGlowy.cs). Inny dla każdej
// głowy i zależnie od tego, która to już głowa:
//  - pierwsza — PITBULL: cofa łeb i rzuca się do gryzienia; rycerz wybija się nad paszczę, kły kłapią w próżni;
//  - druga — WILK: zadziera łeb i wyje (fale wycia z paszczy); rycerz wybija się wysoko, nad wyjący łeb;
//  - ostatnia — DOBERMAN: nabiera tchu i zieje ogniem; rycerz skacze przez płomień — najdłużej, najmocniej.
// Film to nie rozgrywka: alokacje w klatce są tu dopuszczalne.
using System;
using Trzewia.Plotna;
using Trzewia.Rysunek;
using Trzewia.Rysunek.Duszki;
using P = Trzewia.Visual.PrzerywnikGlowy;

namespace Trzewia.Aplikacja
{
    public static partial class FilmKregu
    {
        static readonly PozaCerbera pozaGlowy = new PozaCerbera();
        static readonly (double x, double y)[] paszczeFilmu = new (double, double)[3], karkiFilmu = new (double, double)[3];

        /// <summary>
        /// Gdzie w świecie filmu (Cerber w x = 0, zwrócony w prawo, wzrost człowieka = 1) rycerz zawisa na szczycie skoku
        /// (stopy) nad głową 0 doberman, 1 wilk, 2 pitbull: przed pyskiem, tuż nad nim — nie zasłania psu łba, a miecz
        /// w górze ma nad karkiem.
        /// </summary>
        static readonly (double x, double y)[] SZCZYT = { (2.35, -2.3), (2.0, -1.85), (2.5, -1.85) };
        /// <summary>Gdzie stoi rycerz przed skokiem (x świata filmu): przy pitbullu tuż przed paszczą, przy dobermanie dalej — w ogniu.</summary>
        static readonly double[] STOI = { 3.9, 3.5, 3.1 };
        /// <summary>Wzrost rycerza w filmie (ludzie).</summary>
        const double WZROST_RYCERZA = 1.15;
        /// <summary>Arkusz „Ścięcie głowy”: o ile stopy są nad ziemią w każdej klatce (ułamki wzrostu) — skok jest już w rysunku klatki.</summary>
        static readonly double[] UNIESIENIE = { 0, 0, 0, 0, 0, 0.09, 0.42, 0.61, 0.56, 0.37, 0, 0, 0, 0, 0, 0 };
        /// <summary>Czubek miecza w klatce 9 (miecz w górze, tuż przed ciosem): od stóp, twarzą w prawo, w ułamkach wzrostu.</summary>
        const double CZUBEK_X = -0.25, CZUBEK_Y = -1.72;

        /// <summary>Klatka przerywnika ścięcia głowy (Visual.PrzerywnikGlowy) na całym ekranie.</summary>
        public static void rysujPrzerywnikGlowy(IPlotno ctx, double w, double h, double teraz)
        {
            var t = P.Czas(teraz);
            var dl = P.DlugoscMs(P.Ktora) / 1000.0;
            ctx.save();
            ctx.fillStyle = "rgb(4,4,5)"; ctx.fillRect(0, 0, w, h);
            var H = Math.Min(h * 0.86, w / 2.0);
            var R = new Prost(0, (h - H) / 2, w, H);
            var r = Math.Max(14, Math.Min(26, w / 60));
            ctx.save();
            ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
            scenaGlowy(ctx, R, t, dl, teraz, r);
            kino(ctx, R, teraz);
            ctx.restore();
            // wejście z gry: rozjaśnienie z czerni; koniec: cięcie do czerni tuż przed ciosem — cios jest już w grze
            var ciemno = Math.Max(t < 0.25 ? 1 - t / 0.25 : 0, t > dl - 0.2 ? (t - (dl - 0.2)) / 0.2 : 0);
            if (ciemno > 0) { ctx.fillStyle = Barwa.Rgba(0, 0, 0, Math.Min(1, ciemno)); ctx.fillRect(0, 0, w, h); }
            ctx.font = $"italic {Js.Js.S(r * 0.7)}px {KROJ}"; ctx.fillStyle = "rgba(170,160,140,0.55)"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
            ctx.fillText("Esc — pomiń", w - r, h - r * 0.6);
            ctx.restore();
        }

        /// <summary>Jedna scena: tło krypty, Cerber z głową w jej ruchu, skok rycerza w zwolnieniu aż po miecz w górze, napisy.</summary>
        static void scenaGlowy(IPlotno ctx, Prost R, double t, double dl, double czas, double r)
        {
            int nr = P.Glowa, ktora = P.Ktora;
            double ts = P.SkokS(ktora), tk = dl - 0.55;
            var (ax, ay) = SZCZYT[nr];
            // ── kamera: każda głowa ma swój kadr na początek; potem najazd za rycerzem — on i łeb pod nim w kadrze
            double kx = ax - 0.45, ky = ay - 0.6;
            var kl = nr switch
            {
                // pitbull: plan średni — pies i rycerz naprzeciw siebie
                2 => new[] { new[] { 0.0, 1.95, -1.35, R.h / 5.4 }, new[] { ts, 2.1, -1.45, R.h / 4.8 }, new[] { tk, kx, ky, R.h / 3.1 }, new[] { dl, kx, ky - 0.05, R.h / 2.95 } },
                // wilk: zbliżenie na wyjący łeb, odjazd, gdy rycerz się wybija, i najazd za nim w górę
                1 => new[] { new[] { 0.0, 1.9, -2.75, R.h / 3.4 }, new[] { ts - 0.1, 2.2, -1.6, R.h / 5.0 }, new[] { tk, kx, ky, R.h / 3.1 }, new[] { dl, kx, ky - 0.05, R.h / 2.95 } },
                // doberman: szeroko — płomień przez pół kadru, potem najazd
                _ => new[] { new[] { 0.0, 2.2, -1.65, R.h / 5.8 }, new[] { ts, 2.4, -1.75, R.h / 5.3 }, new[] { tk, kx, ky, R.h / 3.1 }, new[] { dl, kx, ky - 0.05, R.h / 2.95 } },
            };
            var k = kamera(t, kl);
            // wstrząs: kłapnięcie pitbulla (krótko, mocno), wycie wilka (długo, lekko), ogień dobermana
            var wstrzas = nr == 2 ? 2.2 * dzwon(t, 0.95, 1.4) : nr == 1 ? 0.8 * dzwon(t, 0.3, ts + 0.9) : 1.4 * dzwon(t, 0.7, ts + 1.0);
            var v = new Widok(R, k, wstrzas, czas);
            tloKrypty(ctx, v, czas);

            // ── Cerber: już ścięte głowy to kikuty; ścinana głowa w swoim ruchu, po wybiciu rycerza łeb wodzi za nim
            var p = pozaGlowy.Zeruj();
            p.czas = czas; p.krew = 0.55 + 0.15 * ktora; p.oddech = 0.5 + 0.5 * Math.Sin(czas * 0.004); p.szal = 0.2 + 0.2 * ktora;
            for (int i = 0; i < 3; i++) p.glowy[i].Spokoj(1);
            foreach (var o in P.Odciete) p.DodajOdcieta(o, 20000 + o * 1000);
            var g = p.glowy[nr];
            var patrzy = zakres(t, ts + 0.15, tk);
            double ogien = 0, wyje = 0;
            if (nr == 2)
            {
                // PITBULL: przysiada i cofa łeb z otwartą paszczą, rzuca się naprzód — kły kłapią, gdy rycerz jest już nad nimi
                var cofa = dzwon(t, 0.2, 0.95);
                var rzut = zakres(t, 0.82, 1.02);
                var klap = zakres(t, 1.02, 1.14);
                g.wysun = Math.Max(0, rzut * (1 - 0.5 * zakres(t, 1.3, 2.3)) - 0.35 * cofa);
                g.paszcza = Math.Min(1, 0.12 + 0.88 * Math.Max(cofa, rzut) * (1 - 0.9 * klap) + 0.45 * zakres(t, 1.5, 2.4));
                g.pochyl = 0.15 * rzut - 0.25 * cofa - 0.55 * patrzy;
                g.smuga = 0.9 * dzwon(t, 0.8, 1.12);
                p.przysiad = 0.35 * cofa; p.skok = 0.5 * dzwon(t, 0.8, 1.6);
            }
            else if (nr == 1)
            {
                // WILK: zadziera łeb, staje lekko dęba i wyje — do końca, nie widzi rycerza nad sobą
                var unosi = zakres(t, 0.1, 0.65);
                g.pochyl = -0.85 * unosi + 0.06 * Math.Sin(t * 40) * unosi;
                g.paszcza = 0.12 + 0.88 * unosi;
                p.deba = 0.25 * unosi;
                wyje = unosi;
            }
            else
            {
                // DOBERMAN: nabiera tchu (łeb w tył i w górę), zieje ogniem w rycerza; gdy ten przeleci przez płomień — wodzi za nim łbem
                var wdech = dzwon(t, 0.15, 0.75);
                ogien = zakres(t, 0.65, 0.85) * (1 - zakres(t, ts + 0.75, ts + 1.15));
                g.pochyl = -0.3 * wdech + 0.28 * ogien - 0.5 * patrzy * (1 - ogien);
                g.paszcza = Math.Min(1, 0.12 + 0.4 * wdech + 0.88 * ogien);
                g.wysun = 0.45 * ogien;
                p.przysiad = 0.25 * wdech;
            }
            // pozostałe żywe głowy: warczą i też wodzą za rycerzem
            for (int i = 0; i < 3; i++)
                if (i != nr) { p.glowy[i].paszcza = 0.35 + 0.2 * Math.Sin(czas * 0.006 + i); p.glowy[i].pochyl = -0.3 * patrzy; }
            cerberGlowy(ctx, v, p, paszczeFilmu, karkiFilmu);
            var m = paszczeFilmu[nr]; var K = karkiFilmu[nr];
            var s = v.k.s;

            // ── to, co robi głowa: kłapnięcie w próżni, fale wycia
            if (nr == 2) klapniecie(ctx, m.x, m.y, s, t - 1.1);
            if (wyje > 0) wycie(ctx, m.x, m.y, Math.Atan2(m.y - K.y, m.x - K.x), s, t, wyje);

            // ── rycerz: stoi i bierze zamach, wybija się, leci łukiem nad kark — w zwolnieniu; zastyga z mieczem w górze
            var hK = s * WZROST_RYCERZA;
            double sx = v.X(STOI[nr]), sy = v.Y(0);
            var f = Math.Max(0, Math.Min(1, (t - ts) / (tk - ts)));
            double px = mix(sx, v.X(ax), gl(f)), py = mix(sy, v.Y(ay), 1 - (1 - f) * (1 - f));
            // po szczycie: wisi nad karkiem (zwolnienie) i ledwie unosi się dalej
            if (t > tk) py -= hK * 0.06 * gl((t - tk) / 0.55);
            int kk = t < ts ? (int)Math.Round(4 * zakres(t, 0.1, ts - 0.08))
                            : 5 + Math.Min(4, (int)Math.Floor(Math.Pow(f, 0.6) * 5));
            pyl(ctx, sx, sy, s, t - ts + 0.04);
            rycerzWSkoku(ctx, P.Zbroja, px, py + UNIESIENIE[kk] * hK, hK, kk);
            // ogień przelewa się po rycerzu (rysowany po nim)
            if (ogien > 0)
            {
                var cel = (x: v.X(STOI[nr]), y: v.Y(-0.65));
                var kat = Math.Atan2(cel.y - m.y, cel.x - m.x);
                var zasieg = Math.Sqrt((cel.x - m.x) * (cel.x - m.x) + (cel.y - m.y) * (cel.y - m.y)) * 1.25 * zakres(t, 0.62, 0.95);
                plomien(ctx, m.x, m.y, kat, zasieg, s, ogien, czas);
            }
            // błysk na czubku miecza: miecz w górze, zaraz spadnie
            if (kk == 9)
            {
                var y9 = py + UNIESIENIE[9] * hK;
                blyskMiecza(ctx, px - CZUBEK_X * hK, y9 + CZUBEK_Y * hK, s, dzwon(t, tk - 0.2, dl + 0.1));
            }

            // ── napisy: która to głowa, potem jedno zdanie o tej głowie
            var napisGl = ktora == 0 ? "Pierwsza głowa." : ktora == 1 ? "Druga głowa." : "Ostatnia głowa.";
            var dopisek = nr == 2 ? "Pitbull kłapie w próżnię." : nr == 1 ? "Wilk wyje po raz ostatni." : "Przez ogień — do gardła.";
            napis(ctx, R, napisGl, t - 0.3, false, r * (ktora >= 2 ? 1.6 : 1.45), ts + 0.35 - t);
            napis(ctx, R, dopisek, t - (ts + 0.5), false, r * 1.2, dl - 0.3 - t);
        }

        /// <summary>Cerber w świecie filmu (stopy w x = 0, zwrócony w prawo, wysokość 3,2 człowieka): paszcze i karki w pikselach ekranu.</summary>
        static void cerberGlowy(IPlotno ctx, Widok v, PozaCerbera p, (double x, double y)[] paszcze, (double x, double y)[] karki)
        {
            double x0 = v.X(0), y0 = v.Y(0);
            ctx.save();
            ctx.translate(x0, y0);
            var pk = RysCerber.rysujCerbera(ctx, v.k.s * 3.2, p);
            ctx.restore();
            for (int i = 0; i < 3; i++)
            {
                var q = pk.Paszcza(i); paszcze[i] = (x0 + q.x, y0 + q.y);
                var c = pk.Kark(i); karki[i] = (x0 + c.x, y0 + c.y);
            }
        }

        /// <summary>Rycerz w skoku: klatka `klatka` arkusza „Ścięcie głowy” zbroi `zbroja`, stopy w (x, y), wzrost `h`, twarzą w lewo (ku Cerberowi).</summary>
        static void rycerzWSkoku(IPlotno ctx, string zbroja, double x, double y, double h, int klatka)
        {
            var d = Duszek.Daj(zbroja + "-sciecie");
            var a = d?.Animacja("sciecieGlowy");
            if (d == null || a == null) return;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(-1, 1);
            // klatki lotu mają pod stopami kurz z ziemi (w grze skok jest w rysunku klatki) — w filmie rycerz leci wyżej, kurz precz
            if (klatka >= 6) { ctx.beginPath(); ctx.rect(-h * 1.6, -h * 2.3, h * 3.2, h * 2.0); ctx.clip(); }
            d.Rysuj(ctx, a.Klatka(klatka / 15.0), h, true, null);
            ctx.restore();
        }

        /// <summary>Kurz spod stóp przy wybiciu (`dt` — s od wybicia).</summary>
        static void pyl(IPlotno ctx, double x, double y, double s, double dt)
        {
            if (dt < 0 || dt > 0.9) return;
            var a = 1 - dt / 0.9;
            ctx.save();
            for (int i = 0; i < 9; i++)
            {
                var strona = i % 2 == 0 ? -1 : 1;
                var d = s * (0.1 + 0.7 * dt * (0.6 + los(i * 5)));
                var rr = s * (0.07 + 0.2 * dt) * (0.7 + 0.6 * los(i * 9));
                ctx.fillStyle = Barwa.Rgba(74, 54, 46, 0.42 * a);
                ctx.beginPath(); ctx.ellipse(x + strona * d, y - rr * 0.45 - s * 0.05 * los(i), rr * 1.5, rr * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        /// <summary>Kłapnięcie w próżni: krótki biały trzask zębów przy paszczy (`dt` — s od zatrzaśnięcia).</summary>
        static void klapniecie(IPlotno ctx, double x, double y, double s, double dt)
        {
            if (dt < 0 || dt > 0.35) return;
            var a = 1 - dt / 0.35;
            ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
            ctx.strokeStyle = Barwa.Rgba(255, 240, 220, 0.85 * a); ctx.lineWidth = Math.Max(1.5, s * 0.03);
            for (int i = 0; i < 7; i++)
            {
                var kat = -Math.PI * 0.5 + (i - 3) * 0.42;
                double r0 = s * (0.2 + 0.3 * dt), r1 = r0 + s * 0.24 * a;
                ctx.beginPath(); ctx.moveTo(x + Math.Cos(kat) * r0, y + Math.Sin(kat) * r0); ctx.lineTo(x + Math.Cos(kat) * r1, y + Math.Sin(kat) * r1); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Wycie: łuki fali rozchodzące się z paszczy pod kątem `kat` (kierunek łba), `moc` 0…1.</summary>
        static void wycie(IPlotno ctx, double x, double y, double kat, double s, double t, double moc)
        {
            ctx.save();
            ctx.lineCap = "round";
            for (int i = 0; i < 4; i++)
            {
                var u = (t * 0.9 + i * 0.25) % 1;
                var rr = s * (0.25 + 2.0 * u);
                ctx.strokeStyle = Barwa.Rgba(232, 216, 192, moc * (1 - u) * 0.5);
                ctx.lineWidth = Math.Max(1, s * 0.04 * (1 - u * 0.6));
                ctx.beginPath(); ctx.arc(x, y, rr, kat - 0.5, kat + 0.5); ctx.stroke();
            }
            ctx.restore();
        }

        /// <summary>Ogień z paszczy: płomienie płyną od (x, y) pod kątem `kat` na `zasieg` px — jasny rdzeń, czerwone brzegi, łuna.</summary>
        static void plomien(IPlotno ctx, double x, double y, double kat, double zasieg, double s, double moc, double czas)
        {
            if (moc <= 0.01 || zasieg <= 1) return;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            var lg = ctx.createRadialGradient(x, y, 0, x, y, zasieg);
            lg.addColorStop(0, Barwa.Rgba(255, 150, 60, 0.3 * moc)); lg.addColorStop(1, "rgba(120,30,10,0)");
            ctx.fillStyle = lg; ctx.fillRect(x - zasieg, y - zasieg, zasieg * 2, zasieg * 2);
            double c = Math.Cos(kat), sn = Math.Sin(kat), tt = czas / 1000;
            // żar w paszczy: jasne źródło płomienia
            var zr = s * 0.32;
            var gz = ctx.createRadialGradient(x, y, 0, x, y, zr);
            gz.addColorStop(0, Barwa.Rgba(255, 240, 190, 0.7 * moc)); gz.addColorStop(1, "rgba(255,140,40,0)");
            ctx.fillStyle = gz; ctx.fillRect(x - zr, y - zr, zr * 2, zr * 2);
            for (int i = 0; i < 56; i++)
            {
                var u = (tt * 1.7 + los(i * 13)) % 1;
                var d = u * zasieg;
                var rr = s * (0.07 + 0.42 * u) * (0.7 + 0.5 * los(i * 3));
                var bok = (los(i * 7) - 0.5) * 2 * u * zasieg * 0.2 + Math.Sin(tt * 11 + i) * rr * 0.3;
                double bx = x + c * d - sn * bok, by = y + sn * d + c * bok - u * u * s * 0.35;
                var a = moc * (1 - u) * 0.8;
                var gr = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
                gr.addColorStop(0, Barwa.Rgba(255, 236 - 140 * u, 160 - 150 * u, a));
                gr.addColorStop(0.5, Barwa.Rgba(255, 120 - 70 * u, 30, a * 0.6));
                gr.addColorStop(1, "rgba(160,20,5,0)");
                ctx.fillStyle = gr; ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
            }
            ctx.restore();
        }

        /// <summary>Błysk na czubku miecza: gwiazdka światła, `a` 0…1.</summary>
        static void blyskMiecza(IPlotno ctx, double x, double y, double s, double a)
        {
            if (a <= 0.01) return;
            ctx.save(); ctx.globalCompositeOperation = "lighter";
            var R = s * 0.22 * a;
            var g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, Barwa.Rgba(255, 250, 235, 0.9 * a)); g.addColorStop(1, "rgba(255,200,150,0)");
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
            ctx.strokeStyle = Barwa.Rgba(255, 250, 240, 0.95 * a); ctx.lineCap = "round"; ctx.lineWidth = Math.Max(1, s * 0.018);
            var L = s * 0.36 * a;
            ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L * 0.65); ctx.lineTo(x, y + L * 0.65); ctx.stroke();
            ctx.restore();
        }

        /// <summary>Tło krypty pod kręgiem: ciemny mur z ciosów, sklepienie w mroku, kosze ognia po bokach, posadzka we krwi.</summary>
        static void tloKrypty(IPlotno ctx, Widok v, double czas)
        {
            var R = v.R;
            var yG = v.Y(0);
            var g = ctx.createLinearGradient(0, R.y, 0, yG);
            g.addColorStop(0, "rgb(6,4,5)"); g.addColorStop(0.6, "rgb(26,16,14)"); g.addColorStop(1, "rgb(54,28,20)");
            ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, yG - R.y);
            // ciosy muru (przesuwają się z kamerą)
            ctx.save();
            ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = Math.Max(1, v.k.s * 0.02);
            var rzad = 0.55; var cios = 1.1;
            for (double wy = 0; wy > -12; wy -= rzad)
            {
                var y = v.Y(wy);
                if (y < R.y - 4) break;
                ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke();
                var przes = (Math.Abs(wy / rzad) % 2) * cios * 0.5;
                for (double wx = Math.Floor((v.k.x - R.w / v.k.s) / cios) * cios + przes; wx < v.k.x + R.w / v.k.s; wx += cios)
                {
                    var x = v.X(wx);
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, v.Y(wy - rzad)); ctx.stroke();
                }
            }
            ctx.restore();
            // kosze ognia: łuna z boków, migocze
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            foreach (var (wx, ziarno) in new[] { (-4.5, 1.0), (6.5, 2.0) })
            {
                var mig = 0.85 + 0.15 * Math.Sin(czas * 0.011 + ziarno * 3) + 0.08 * Math.Sin(czas * 0.031 + ziarno);
                double fx = v.X(wx), fy = v.Y(-2.2);
                var lg = ctx.createRadialGradient(fx, fy, 0, fx, fy, v.k.s * 4.5);
                lg.addColorStop(0, Barwa.Rgba(255, 150, 60, 0.45 * mig)); lg.addColorStop(0.4, Barwa.Rgba(160, 50, 20, 0.22 * mig)); lg.addColorStop(1, "rgba(60,14,6,0)");
                ctx.fillStyle = lg; ctx.fillRect(fx - v.k.s * 4.5, fy - v.k.s * 4.5, v.k.s * 9, v.k.s * 9);
            }
            ctx.restore();
            // posadzka: płyty i krew
            var gg = ctx.createLinearGradient(0, yG, 0, R.y + R.h);
            gg.addColorStop(0, "rgb(44,28,22)"); gg.addColorStop(1, "rgb(16,10,8)");
            ctx.fillStyle = gg; ctx.fillRect(R.x, yG, R.w, R.y + R.h - yG);
            ctx.fillStyle = "rgba(110,10,8,0.55)";
            for (int i = 0; i < 9; i++)
            {
                var x = v.X(-6 + los(i * 7 + 3) * 14);
                ctx.beginPath(); ctx.ellipse(x, v.Y(0.08 + los(i * 5) * 0.5), v.k.s * (0.4 + los(i) * 0.9), v.k.s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = Math.Max(1, v.k.s * 0.025);
            ctx.beginPath(); ctx.moveTo(R.x, yG); ctx.lineTo(R.x + R.w, yG); ctx.stroke();
        }
    }
}
