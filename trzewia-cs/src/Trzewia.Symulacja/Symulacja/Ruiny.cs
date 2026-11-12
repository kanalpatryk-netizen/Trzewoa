// Port: alpha-1/src/sim/ruiny.ts
using System;
using System.Collections.Generic;
using System.Linq;
using Trzewia.Js;
using Trzewia.Rdzen;
using static Trzewia.Nastawy.NastawyZabytki;
using static Trzewia.Symulacja.Tiles;
using JS = Trzewia.Js.Js;

namespace Trzewia.Symulacja
{
    /// <summary>Kamienny łuk w tle ruiny: od x0 do x1 (kafle), podstawa na wysokości y; `filary` — kolumny od podstawy do posadzki.</summary>
    public sealed class LukRuiny
    {
        public double x0, x1, y;
        public bool filary;
    }

    public sealed class ZabytekRuiny
    {
        public double x, y;
        public string typ = "";
    }

    /// <summary>
    /// RUINY (Alpha, etap 3e) — zawalone budowle w środkowej warstwie góry: kaplica, stara kopalnia albo kawałek
    /// miasta. Każda to zamknięta w skale pustka (ktoś musi się do niej przekopać) z murami z ciosów, belkami i łukami;
    /// w środku, na posadzce, leży zabytek. Mury to zwykła skała (kuje się jak skała), a ich ciosy, belki, łuki i gruz
    /// rysuje render/ruiny.ts z tego opisu — wykuty kafel muru znika z rysunku. Zabytki: sim/zabytki.ts.
    /// </summary>
    public sealed class Ruina
    {
        public string rodzaj = "";
        /// <summary>Obrys (kafle, włącznie).</summary>
        public double x0, y0, x1, y1;
        /// <summary>Rząd posadzki (pierwszy lity rząd pod wnętrzem).</summary>
        public double dno;
        /// <summary>Kafle muru z ciosów (indeksy) — rysunek bloków, póki kafel lity.</summary>
        public List<double> mury = new List<double>();
        /// <summary>Kafle zawału — lity gruz po zawalonym sklepieniu.</summary>
        public List<double> gruz = new List<double>();
        /// <summary>Drewno: słupy, oczepy, zwalone belki — odcinki w kaflach [x0, y0, x1, y1] (tło, nie zagradzają drogi).</summary>
        public List<double[]> belki = new List<double[]>();
        public List<LukRuiny> luki = new List<LukRuiny>();
        /// <summary>Kopalnia: wózek na szynach (kafel, na którym stoi).</summary>
        public double[]? wozek;
        public ZabytekRuiny zabytek = new ZabytekRuiny();
    }

    public static class Ruiny
    {
        static readonly string[] TYPY = { "relikwiarz", "miecz", "kielich", "ksiega" };
        static readonly string[] RODZAJE = { "kaplica", "kopalnia", "miasto" };

        /// <summary>
        /// Stawia ruiny w środkowej warstwie (`g1`/`g2` — granice warstw w każdej kolumnie). Ma własne losowanie
        /// (`rng`), więc reszta góry z tego samego ziarna się nie zmienia. `wolno` — kafle, w których wolno budować.
        /// </summary>
        public static List<Ruina> zbudujRuiny(World w, Rng rng, Int16Array g1, Int16Array g2, Func<double, double, bool> wolno)
        {
            var R = ZABYTKI.ruiny;
            double ile = R.odIlu + rng.@int(R.doIlu - R.odIlu + 1);
            var rodzaje = JS.Sort(RODZAJE.ToList(), (_, __) => rng.next() - 0.5);
            var typy = JS.Sort(TYPY.ToList(), (_, __) => rng.next() - 0.5);
            var outR = new List<Ruina>();
            for (double k = 0; k < ile; k++)
            {
                var rodzaj = rodzaje[(int)(k % rodzaje.Count)];
                var szer = rodzaj == "kaplica" ? R.kaplica.szer + 2 : rodzaj == "kopalnia" ? R.kopalnia.dl + 2 : R.miasto.domSzer * 2 + 4 + R.miasto.ulica;
                var wys = rodzaj == "kaplica" ? R.kaplica.wys + R.kaplica.sklepienie + 2 : rodzaj == "kopalnia" ? R.kopalnia.wys + 2 : R.miasto.domWys + 5;
                for (var p = 0; p < 40; p++)
                {
                    double x0 = 8 + rng.@int(w.w - 16 - szer);
                    var x1 = x0 + szer - 1;
                    double gora = 0, dol = w.h;
                    for (var x = x0; x <= x1; x++) { gora = Math.Max(gora, g1[x]); dol = Math.Min(dol, g2[x]); }
                    double yMin = gora + R.odGranicy + wys, yMax = dol - R.odGranicy;
                    if (yMax <= yMin) continue;
                    var dno = yMin + rng.@int(yMax - yMin);
                    var y0 = dno - wys;
                    if (outR.Any(r => Math.Abs((r.x0 + r.x1) / 2 - (x0 + x1) / 2) < R.odstep)) continue;
                    var dobrze = true;
                    // (w litej skale: ruina, która wpada w jaskinię, wyglądała jak dziura, nie jak budowla)
                    for (var y = y0 - 2; y <= dno + 1 && dobrze; y++) for (var x = x0 - 1; x <= x1 + 1; x++)
                    {
                        if (!wolno(x, y) || PASSABLE[w.tile[w.idx(x, y)]] == 1) { dobrze = false; break; }
                    }
                    if (!dobrze) continue;
                    var typ = typy[(int)(k % typy.Count)];
                    var r2 = rodzaj == "kaplica" ? kaplica(w, rng, x0, dno, typ) : rodzaj == "kopalnia" ? kopalnia(w, rng, x0, dno, typ) : miasto(w, rng, x0, dno, typ);
                    outR.Add(r2);
                    break;
                }
            }
            return outR;
        }

        /// <summary>Pusty opis ruiny (obrys uzupełnia `domknij`).</summary>
        static Ruina nowa(string rodzaj, double dno, double zx, double zy, string typ) =>
            new Ruina { rodzaj = rodzaj, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, dno = dno, zabytek = new ZabytekRuiny { x = zx, y = zy, typ = typ } };

        /// <summary>Kafel pustki we wnętrzu ruiny.</summary>
        static void pusto(World w, Ruina r, double x, double y)
        {
            w.tile[w.idx(x, y)] = T.AIR;
            r.x0 = Math.Min(r.x0, x); r.x1 = Math.Max(r.x1, x); r.y0 = Math.Min(r.y0, y); r.y1 = Math.Max(r.y1, y);
        }

        /// <summary>Kafel muru z ciosów (lita skała).</summary>
        static void mur(World w, Ruina r, double x, double y)
        {
            var i = w.idx(x, y);
            w.tile[i] = T.ROCK;
            if (!r.mury.Contains(i)) r.mury.Add(i);
            r.x0 = Math.Min(r.x0, x); r.x1 = Math.Max(r.x1, x); r.y0 = Math.Min(r.y0, y); r.y1 = Math.Max(r.y1, y);
        }

        /// <summary>Kafel gruzu (lity) — w miejscu muru albo pustki.</summary>
        static void gruz(World w, Ruina r, double x, double y)
        {
            var i = w.idx(x, y);
            w.tile[i] = T.ROCK;
            r.mury = r.mury.Where(j => j != i).ToList();
            if (!r.gruz.Contains(i)) r.gruz.Add(i);
        }

        /// <summary>Wokół wnętrza (każdy lity sąsiad pustki w obrysie) — mur, poza kaflami `bezMuru`.</summary>
        static void obmuruj(World w, Ruina r, JsSet<double> wnetrze, JsSet<double> bezMuru)
        {
            foreach (var i in wnetrze)
            {
                double x = i % w.w, y = JS.ToInt32(i / w.w);
                for (double dy = -1; dy <= 1; dy++) for (double dx = -1; dx <= 1; dx++)
                {
                    var j = w.idx(x + dx, y + dy);
                    if (wnetrze.has(j) || bezMuru.has(j) || PASSABLE[w.tile[j]] == 1) continue;
                    mur(w, r, x + dx, y + dy);
                }
            }
        }

        /// <summary>
        /// Kaplica: nawa z półkolistym sklepieniem, mury z ciosów, posadzka; w tle arkada (filary i łuki); w lewej ścianie
        /// zamurowany portal pod łukiem. Kawał sklepienia runął: w murze dziura zasypana skałą, na posadzce gruz,
        /// a z wyłomu zwisa zwalona belka. Zabytek leży na kamiennym podeście przy prawej ścianie.
        /// </summary>
        static Ruina kaplica(World w, Rng rng, double x0, double dno, string typ)
        {
            var K = ZABYTKI.ruiny.kaplica;
            double xl = x0 + 1, xr = xl + K.szer - 1, cx = (xl + xr) / 2, pol = K.szer / 2 + 0.5;
            var px = xr - 1;
            var r = nowa("kaplica", dno, px, dno - 2, typ);
            var wnetrze = new JsSet<double>();
            for (var x = xl; x <= xr; x++)
            {
                var t = (x - cx) / pol;
                var v = K.sklepienie * Math.Sqrt(Math.Max(0, 1 - t * t));
                var gora = JS.Round(dno - K.wys - v);
                for (var y = gora; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
            }
            // wyłom w sklepieniu: mur w tym miejscu runął (zostaje zwykła skała), pod nim gruz
            var wx = JS.Round(xl + 2 + rng.@int(Math.Max(1, K.szer - 7)));
            var bezMuru = new JsSet<double>();
            for (var x = wx; x < wx + 3; x++) for (var y = dno - K.wys - K.sklepienie - 2; y < dno - K.wys + 1; y++) bezMuru.add(w.idx(x, y));
            obmuruj(w, r, wnetrze, bezMuru);
            for (var x = xl; x <= xr; x++) mur(w, r, x, dno);               // posadzka z płyt
            gruz(w, r, wx, dno - 1); gruz(w, r, wx + 1, dno - 1); if (rng.chance(0.6)) gruz(w, r, wx + 1, dno - 2);
            // podest pod zabytkiem
            mur(w, r, px, dno - 1);
            r.zabytek = new ZabytekRuiny { x = px, y = dno - 2, typ = typ };
            // portal w lewym murze — zamurowany (lity), pod łukiem
            r.luki.Add(new LukRuiny { x0 = xl - 1, x1 = xl, y = dno - 2.5, filary = false });
            // arkada w tle: filary co kilka kafli, łuki między nimi
            var filarY = dno - K.wys + 2.5;
            for (var x = xl + 1; x + 3 <= xr - 1; x += 3) r.luki.Add(new LukRuiny { x0 = x, x1 = x + 3, y = filarY, filary = true });
            // zwalona belka z wyłomu na gruz
            r.belki.Add(new[] { wx + 2.4, dno - K.wys - 0.5, wx + 0.2, dno - 1.4 });
            return r;
        }

        /// <summary>
        /// Stara kopalnia: długi niski chodnik w skale, co kilka kafli odrzwia z belek (dwa słupy i oczep), szyny
        /// na spągu i porzucony wózek. Środek chodnika się zawalił — gruz do połowy wysokości i złamany oczep.
        /// Zabytek leży na końcu chodnika.
        /// </summary>
        static Ruina kopalnia(World w, Rng rng, double x0, double dno, string typ)
        {
            var K = ZABYTKI.ruiny.kopalnia;
            double xl = x0 + 1, xr = xl + K.dl - 1;
            var lewy = rng.chance(0.5);
            var zx = lewy ? xl + 1 : xr - 1;
            var r = nowa("kopalnia", dno, zx, dno - 1, typ);
            for (var x = xl; x <= xr; x++) for (var y = dno - K.wys; y < dno; y++) pusto(w, r, x, y);
            // odrzwia: słupy przy ociosach i oczep pod stropem (rysunek w tle)
            var zawal = JS.Round(xl + K.dl * (0.4 + rng.next() * 0.2));
            for (var x = xl + 1; x < xr; x += K.odrzwiaCo)
            {
                if (Math.Abs(x - zawal) <= 1) continue;
                r.belki.Add(new[] { x + 0.15, dno - K.wys, x + 0.15, dno });
                r.belki.Add(new[] { x + 0.85, dno - K.wys, x + 0.85, dno });
                r.belki.Add(new[] { x - 0.2, dno - K.wys + 0.12, x + 1.2, dno - K.wys + 0.12 });
            }
            // zawał w środku: gruz do połowy wysokości, złamany oczep zwisa ukośnie
            for (var x = zawal - 1; x <= zawal + 1; x++) gruz(w, r, x, dno - 1);
            gruz(w, r, zawal, dno - 2);
            r.belki.Add(new[] { zawal - 1.6, dno - K.wys + 0.1, zawal + 0.4, dno - 1.6 });
            // szyny (rysunek po spągu) i wózek po drugiej stronie zawału niż zabytek
            r.wozek = new[] { lewy ? xr - 3 : xl + 2, dno - 1 };
            return r;
        }

        /// <summary>
        /// Kawałek miasta: dwa kamienne domy z dwuspadowymi dachami, między nimi ulica pod łukiem bramy. Jeden dom stracił
        /// połowę dachu (gruz w izbie). Zabytek leży w całym domu.
        /// </summary>
        static Ruina miasto(World w, Rng rng, double x0, double dno, string typ)
        {
            var M = ZABYTKI.ruiny.miasto;
            var lewyCaly = rng.chance(0.5);
            var domy = new[] { x0 + 1, x0 + 1 + M.domSzer + 2 + M.ulica };
            var zx = (lewyCaly ? domy[0] : domy[1]) + (lewyCaly ? 1 : M.domSzer - 2);
            var r = nowa("miasto", dno, zx, dno - 1, typ);
            var wnetrze = new JsSet<double>();
            var bezMuru = new JsSet<double>();
            for (var d = 0; d < domy.Length; d++)
            {
                var xl = domy[d];
                double xr = xl + M.domSzer - 1, cx = (xl + xr) / 2;
                for (var x = xl; x <= xr; x++)
                {
                    var dach = Math.Floor(M.domSzer / 2 - Math.Abs(x - cx) + 0.5);     // szczyt — strych pod dachem
                    for (var y = dno - M.domWys - Math.Max(0, dach); y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
                }
                var caly0 = (d == 0) == lewyCaly;
                if (!caly0)
                {
                    // pół dachu runęło: w tym miejscu nie ma muru, w izbie gruz
                    double polDomu = JS.ToInt32(M.domSzer) >> 1;
                    var odX = d == 0 ? xl + polDomu : xl - 1;
                    for (var x = odX; x <= odX + polDomu + 1; x++) for (var y = dno - M.domWys - M.domSzer; y < dno - M.domWys + 1; y++) bezMuru.add(w.idx(x, y));
                }
            }
            // ulica między domami (niższa niż domy) — pod łukiem bramy
            double ux0 = domy[0] + M.domSzer + 1, ux1 = ux0 + M.ulica - 1;
            for (var x = ux0; x <= ux1; x++) for (var y = dno - M.domWys + 1; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
            // drzwi z domów na ulicę
            foreach (var x in new[] { domy[0] + M.domSzer, ux1 + 1 }) for (var y = dno - 2; y < dno; y++) { pusto(w, r, x, y); wnetrze.add(w.idx(x, y)); }
            obmuruj(w, r, wnetrze, bezMuru);
            for (var x = domy[0] - 1; x <= domy[1] + M.domSzer; x++) mur(w, r, x, dno);     // bruk
            var zburzony = lewyCaly ? domy[1] : domy[0];
            gruz(w, r, zburzony + 1, dno - 1); gruz(w, r, zburzony + 2, dno - 1); gruz(w, r, zburzony + 2, dno - 2);
            // łuk bramy nad ulicą i łuki nad drzwiami
            // (podstawa łuku tak, żeby jego szczyt dotykał stropu przejścia)
            r.luki.Add(new LukRuiny { x0 = ux0, x1 = ux1 + 1, y = dno - M.domWys + 1 + M.ulica / 2, filary = false });
            r.luki.Add(new LukRuiny { x0 = domy[0] + M.domSzer, x1 = domy[0] + M.domSzer + 1, y = dno - 1.5, filary = false });
            r.luki.Add(new LukRuiny { x0 = ux1 + 1, x1 = ux1 + 2, y = dno - 1.5, filary = false });
            // belki stropu w całym domu i jedna zwalona w zburzonym
            var caly = lewyCaly ? domy[0] : domy[1];
            r.belki.Add(new[] { caly - 0.2, dno - M.domWys + 0.1, caly + M.domSzer + 0.2, dno - M.domWys + 0.1 });
            r.belki.Add(new[] { zburzony + M.domSzer - 0.5, dno - M.domWys - 0.6, zburzony + 0.8, dno - 1.3 });
            return r;
        }
    }
}
